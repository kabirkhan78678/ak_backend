import Decimal from "decimal.js";
import { execute } from "../../../core/db-helper.js";
import { calcPipDiff } from "../../../utility/trading/calculations.utils.js";
import { syncWalletSnapshot } from "../../../services/wallet.service.js";
import {
    getPortfolioById,
    closeTrade,
    deletePortfolio,
    getWallet,
    lockWallet,
    fetchGroupedPortfolio
} from "./model.js";

import { calculatePnl } from "../../../utility/trading/pnl.engine.js";



/* =====================
   CLOSE PORTFOLIO TRADE
===================== */
export const closePortfolioTradeService = async (uid, portfolioId) => {
    await execute("START TRANSACTION");

    try {
        await lockWallet(uid);

        const pos = await getPortfolioById(portfolioId, uid);
        if (!pos) throw new Error("Position not found");

        const wallet = await getWallet(uid);
        if (!wallet) throw new Error("Wallet not found");

        if (!pos.current_price || Number(pos.current_price) <= 0) {
            throw new Error("Live price unavailable");
        }

        const exitPrice = new Decimal(pos.current_price);
        let pipDiff = new Decimal(0);

        if (pos.asset_type !== "metal") {
            pipDiff = calcPipDiff(
                new Decimal(pos.average_price),
                exitPrice,
                pos.side === "long" ? "buy" : "sell",
                pos.asset_type
            );
        }

        const pnlUsd = calculatePnl({
            entryPrice: pos.average_price,
            exitPrice: exitPrice,
            quantity: pos.quantity,
            side: pos.side
        });

        await closeTrade(
            pos.trade_id,
            pnlUsd.toNumber(),
            pipDiff.toNumber(),
            exitPrice.toNumber()
        );

        await deletePortfolio(pos.trade_id);

        const nextBalance = new Decimal(wallet.balance || 0).plus(pnlUsd);
        await syncWalletSnapshot(uid, nextBalance);

        await execute("COMMIT");

        return {
            trade_id: pos.trade_id,
            exit_price: exitPrice.toFixed(5),
            pnl: pnlUsd.toFixed(2)
        };

    } catch (e) {
        await execute("ROLLBACK");
        throw e;
    }
};

/* =====================
   GROUPED PORTFOLIO
===================== */
export const getPortfolioService = async (uid) => {
    const rows = await fetchGroupedPortfolio(uid);

    const grouped = {
        crypto: [],
        forex: [],
        stock: [],
        metal: []
    };

    for (const r of rows) {
        let type = r.type;
        if (type === "gold" || type === "silver") {
            type = "metal";
        }

        const currentPrice = r.current_price ?? r.average_price;

        const pnl = calculatePnl({
            entryPrice: r.average_price,
            exitPrice: currentPrice,
            quantity: r.quantity,
            side: r.side
        });

        grouped[type].push({
            portfolio_id: r.portfolio_id,
            symbol: r.symbol,
            side: r.side,
            entry_price: r.average_price,
            current_price: currentPrice,
            quantity: r.quantity,
            unrealized_pnl: pnl.toFixed(2),
            open_time: r.open_time
        });
    }

    return grouped;
};
