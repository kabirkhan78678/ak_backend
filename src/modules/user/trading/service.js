import { execute } from "../../../core/db-helper.js";
import { D } from "../../../utility/trading/decimal.utils.js";
import { parseLeverage } from "../../../utility/trading/leverage.utils.js";
import { checkTradeBlock } from "../../../services/tradeRisk.service.js";
import { syncWalletSnapshot } from "../../../services/wallet.service.js";
import { checkMarketSession } from "./model.js";
import { getOne } from "../../../core/db-helper.js";

import {
    lockWallet,
    getAsset,
    getMarketPrice,
    getWallet,
    insertTrade,
    insertPortfolio,
    getPortfolioById,
    closeTrade,
    deletePortfolio,
    fetchTrades,
    fetchSummary
} from "./model.js";

import {
    calcQuantity,
    calcPipDiff
} from "../../../utility/trading/calculations.utils.js";

import { calculatePnl } from "../../../utility/trading/pnl.engine.js";
import { emitPortfolioUpdate } from "../../../sockets/market.socket.js";

import Decimal from "decimal.js";

import {
    CONTRACT_SIZES,
    DEFAULT_COMMISSION
} from "../../../utility/trading/trading.utils.js";


export const placeTradeService = async (uid, payload) => {
    await execute("START TRANSACTION");
    try {
        const hasVolume = payload.volume !== undefined && payload.volume !== null;
        const hasTradeAmount =
            payload.trade_amount !== undefined &&
            payload.trade_amount !== null;
        const hasAmount = payload.amount !== undefined && payload.amount !== null;
        const hasNotional =
            payload.notional !== undefined && payload.notional !== null;

        if (
            !payload.asset_id ||
            !payload.side ||
            (!hasVolume && !hasTradeAmount && !hasAmount && !hasNotional)
        )
            throw new Error("Invalid payload");

        const side = payload.side.toLowerCase();
        if (!["buy", "sell"].includes(side))
            throw new Error("Invalid trade side");

        /* ===== LOCK WALLET ===== */
        await lockWallet(uid);

        /* 🔐 HARD BLOCK CHECK */
        const walletSnapshot = await checkTradeBlock(uid);

        const asset = await getAsset(payload.asset_id);
        const priceRow = await getMarketPrice(payload.asset_id);
        const wallet = await getWallet(uid);

        if (!asset || !priceRow?.price)
            throw new Error("Market unavailable");

        /* MARKET CHECK */
        await validateMarketOpen(payload.asset_id);

        /* ===== ENGINE TYPE ===== */
        let engineType = asset.type.toLowerCase();
        if (engineType === "metal") {
            if (asset.symbol === "XAUUSD") engineType = "gold";
            else if (asset.symbol === "XAGUSD") engineType = "silver";
            else throw new Error("Unsupported metal");
        }

        if (!CONTRACT_SIZES[engineType])
            throw new Error("Unsupported asset");

        /* ===== SPREAD ===== */
        const price = new Decimal(priceRow.price);
        const spread = new Decimal(asset.spread || 0);
        const entryPrice =
            side === "buy"
                ? price.plus(spread)
                : price.minus(spread);

        let volume;
        let quantity;
        let notional;

        if (hasTradeAmount || hasAmount || hasNotional) {
            notional = new Decimal(
                payload.trade_amount ?? payload.amount ?? payload.notional
            );

            if (notional.lte(0)) {
                throw new Error("Trade amount must be greater than 0");
            }

            quantity = notional.div(entryPrice);
            volume = quantity.div(CONTRACT_SIZES[engineType]);
        } else {
            volume = new Decimal(payload.volume);

            if (volume.lte(0)) {
                throw new Error("Volume must be greater than 0");
            }

            quantity = new Decimal(calcQuantity(volume, engineType));
            notional = entryPrice.mul(quantity);
        }

        if (quantity.lte(0)) {
            throw new Error("Invalid trade quantity");
        }

        /* ===== MARGIN ===== */
        const leverage = parseLeverage(wallet.leverage);
        const usedMargin = notional.div(leverage);

        /* ===== COMMISSION ===== */
        const commission = new Decimal(wallet.commission || 0).mul(quantity);
        const totalRequired = usedMargin.plus(commission);

        const availableMargin = new Decimal(walletSnapshot.freeMargin ?? 0);

        if (availableMargin.lt(totalRequired))
            throw new Error("Insufficient free margin");

        const positionSide = side === "buy" ? "long" : "short";

        const trade = await insertTrade([
            uid,
            asset.id,
            "market",
            side,
            positionSide,
            volume.toNumber(),
            quantity.toNumber(),
            entryPrice.toNumber(),
            entryPrice.toNumber(),
            spread.toNumber(),
            payload.stop_loss || null,
            payload.take_profit || null,
            commission.toNumber(),
            0,
            notional.toNumber()
        ]);

        const portfolio = await insertPortfolio([
            uid,
            asset.id,
            quantity.toNumber(),
            entryPrice.toNumber(),
            positionSide,
            trade.insertId
        ]);

        await syncWalletSnapshot(uid, wallet.balance);

        const initialPnl = calculatePnl({
            entryPrice: entryPrice,
            exitPrice: price,
            quantity,
            side: positionSide
        });

        await execute("COMMIT");

        emitPortfolioUpdate(uid, {
            portfolio_id: portfolio.insertId,
            asset_id: asset.id,
            symbol: asset.symbol,
            side: positionSide,
            entry_price: entryPrice.toNumber(),
            current_price: price.toNumber(),
            price: price.toNumber(),
            quantity: quantity.toNumber(),
            pnl: Number(initialPnl.toFixed(5)),
            unrealized_pnl: Number(initialPnl.toFixed(5))
        });

        return {
            success: true,
            trade_id: trade.insertId,
            entry_price: entryPrice.toNumber(),
            volume: volume.toNumber(),
            quantity: quantity.toNumber(),
            notional: notional.toNumber(),
            used_margin: usedMargin.toNumber(),
            commission: commission.toNumber()
        };

    } catch (e) {
        await execute("ROLLBACK");
        throw e;
    }
};


/* ================= CLOSE TRADE ================= */
export const closeTradeService = async (uid, portfolioId) => {
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

        const entry = new Decimal(pos.average_price);
        const qty = new Decimal(pos.quantity);

        let pnlUsd;
        if (pos.side === "long") {
            pnlUsd = exitPrice.minus(entry).mul(qty);
        } else {
            pnlUsd = entry.minus(exitPrice).mul(qty);
        }

        await closeTrade(
            pos.trade_id,
            pnlUsd.toNumber(),
            0,
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





/* ================= GET TRADES + ANALYTICS (NO PAGINATION) ================= */
export const getTradesService = async (uid, query) => {

    const {
        side,       // buy | sell
        result,     // profit | loss
        period,     // today | week | month | year
        from, to,   // custom range
        sort = "recent" // recent | pnl_desc | pnl_asc
    } = query;

    const where = [`t.user_id = ?`, `t.close_time IS NOT NULL`];
    const params = [uid];

    /* ===== SIDE FILTER ===== */
    if (side) {
        where.push(`t.position_side = ?`);
        params.push(side === "buy" ? "long" : "short");
    }

    /* ===== RESULT FILTER ===== */
    if (result === "profit") where.push(`t.pip_pnl_usd > 0`);
    if (result === "loss") where.push(`t.pip_pnl_usd < 0`);

    /* ===== DATE FILTERS ===== */
    if (period === "today")
        where.push(`DATE(t.close_time) = CURDATE()`);

    if (period === "week")
        where.push(`YEARWEEK(t.close_time,1) = YEARWEEK(CURDATE(),1)`);

    if (period === "month")
        where.push(`MONTH(t.close_time)=MONTH(CURDATE()) AND YEAR(t.close_time)=YEAR(CURDATE())`);

    if (period === "year")
        where.push(`YEAR(t.close_time)=YEAR(CURDATE())`);

    if (from && to) {
        where.push(`t.close_time BETWEEN ? AND ?`);
        params.push(from, to);
    }

    /* ===== SORTING ===== */
    let orderBy = `t.close_time DESC`;
    if (sort === "pnl_desc") orderBy = `t.pip_pnl_usd DESC`;
    if (sort === "pnl_asc") orderBy = `t.pip_pnl_usd ASC`;

    /* ================= TRADE LIST ================= */
    const trades = await fetchTrades(`
        SELECT
            t.id,
            a.symbol,
            t.position_side,
            t.entry_price,
            t.executed_price AS exit_price,
            t.pip_pnl_usd AS pnl,
            IF(t.pip_pnl_usd > 0,'profit','loss') AS result,
            t.open_time,
            t.close_time
        FROM trades t
        JOIN assets a ON a.id = t.asset_id
        WHERE ${where.join(" AND ")}
        ORDER BY ${orderBy}
    `, params);

    /* ================= SUMMARY ================= */
    const summary = await fetchSummary(`
        SELECT
            COUNT(*) AS total_trades,
            SUM(pip_pnl_usd > 0) AS winning_trades,
            SUM(pip_pnl_usd < 0) AS losing_trades,
            SUM(CASE WHEN pip_pnl_usd > 0 THEN pip_pnl_usd ELSE 0 END) AS total_profit,
            ABS(SUM(CASE WHEN pip_pnl_usd < 0 THEN pip_pnl_usd ELSE 0 END)) AS total_loss,
            SUM(pip_pnl_usd) AS net_pnl
        FROM trades t
        WHERE ${where.join(" AND ")}
    `, params);

    /* ===== WIN RATE ===== */
    const winRate =
        summary.total_trades > 0
            ? ((summary.winning_trades / summary.total_trades) * 100).toFixed(2)
            : "0.00";

    return {
        summary: {
            ...summary,
            win_rate_percent: winRate
        },
        trades
    };
};


export const validateMarketOpen = async (assetId) => {

    const asset = await getOne(
        `SELECT type FROM assets WHERE id = ?`,
        [assetId]
    );

    if (!asset) {
        throw new Error("Asset not found");
    }

    const now = new Date();

    const day = now.toLocaleString("en-US", { weekday: "short" }).toLowerCase();
    const time = now.toTimeString().slice(0, 5);

    const session = await checkMarketSession(asset.type, day, time);

    if (!session) {
        throw new Error("Market is closed");
    }
};
