import Decimal from "decimal.js";

import { execute, getAll, getOne } from "../core/db-helper.js";
import { parseLeverage } from "../utility/trading/leverage.utils.js";

function calculateReservedMargin(row) {
    const leverage = parseLeverage(row.leverage);
    const notional =
        row.notional !== undefined && row.notional !== null
            ? new Decimal(row.notional)
            : new Decimal(row.average_price || 0).mul(
                new Decimal(row.quantity || 0)
            );

    return notional.div(leverage);
}

export async function getWalletExposureSnapshot(userId) {
    const rows = await getAll(
        `SELECT
            p.quantity,
            p.average_price,
            p.current_price,
            p.side,
            t.notional,
            ap.price AS market_price,
            u.leverage
        FROM portfolios p
        JOIN trades t ON t.id = p.trade_id
        JOIN users u ON u.id = p.user_id
        LEFT JOIN asset_prices ap ON ap.asset_id = p.asset_id
        WHERE p.user_id = ?`,
        [userId]
    );

    return rows.reduce(
        (snapshot, row) => {
            const livePrice = new Decimal(
                row.current_price ?? row.market_price ?? row.average_price ?? 0
            );
            const quantity = new Decimal(row.quantity || 0);
            const entryPrice = new Decimal(row.average_price || 0);
            const isLong = row.side === "buy" || row.side === "long";
            const pnl = isLong
                ? livePrice.minus(entryPrice).mul(quantity)
                : entryPrice.minus(livePrice).mul(quantity);

            return {
                usedMargin: snapshot.usedMargin.plus(
                    calculateReservedMargin(row)
                ),
                unrealizedPnl: snapshot.unrealizedPnl.plus(pnl),
            };
        },
        {
            usedMargin: new Decimal(0),
            unrealizedPnl: new Decimal(0),
        }
    );
}

export async function syncWalletSnapshot(userId, balanceInput) {
    let balance = balanceInput;

    if (balance === undefined) {
        const wallet = await getOne(
            `SELECT balance FROM wallets WHERE user_id = ?`,
            [userId]
        );
        balance = wallet?.balance || 0;
    }

    const balanceDecimal = new Decimal(balance || 0);
    const { usedMargin, unrealizedPnl } = await getWalletExposureSnapshot(userId);
    // Match standard trading terminals: equity tracks floating PnL,
    // while free margin is the spendable remainder after reserved margin.
    const equity = balanceDecimal.plus(unrealizedPnl);
    const freeMargin = equity.minus(usedMargin);

    await execute(
        `UPDATE wallets
         SET balance = ?,
             used_margin = ?,
             free_margin = ?,
             updated_at = NOW()
         WHERE user_id = ?`,
        [
            balanceDecimal.toNumber(),
            usedMargin.toNumber(),
            freeMargin.toNumber(),
            userId,
        ]
    );

    return {
        balance: balanceDecimal,
        usedMargin,
        margin: usedMargin,
        freeMargin,
        unrealizedPnl,
        equity,
    };
}
