import {
    getAllPortfolios,
    updatePortfolioPrice,
    getAllTrades,
    updateTradeByAdmin
} from "./model.js";
import { syncWalletSnapshot } from "../../../services/wallet.service.js";
import { emitPortfolioUpdate } from "../../../sockets/market.socket.js";
import { calculatePnl } from "../../../utility/trading/pnl.engine.js";

/* ================================
   ADMIN → ALL PORTFOLIOS
================================ */
export const fetchAllPortfoliosAdmin = async () => {
    return await getAllPortfolios();
};

/* ================================
   ADMIN → UPDATE PORTFOLIO PRICE
================================ */
export const updatePortfolioAdmin = async (portfolioId, price) => {
    const normalizedPrice = Number(price);

    if (!Number.isFinite(normalizedPrice) || normalizedPrice <= 0) {
        throw new Error("Invalid price");
    }

    const portfolio = await updatePortfolioPrice(portfolioId, normalizedPrice);
    await syncWalletSnapshot(portfolio.user_id);

    const pnl = calculatePnl({
        entryPrice: portfolio.average_price,
        exitPrice: normalizedPrice,
        quantity: portfolio.quantity,
        side: portfolio.side
    });

    emitPortfolioUpdate(portfolio.user_id, {
        portfolio_id: portfolio.id,
        asset_id: portfolio.asset_id,
        symbol: portfolio.symbol,
        side: portfolio.side,
        entry_price: Number(portfolio.average_price),
        current_price: normalizedPrice,
        price: normalizedPrice,
        quantity: Number(portfolio.quantity),
        pnl: Number(pnl.toFixed(5)),
        unrealized_pnl: Number(pnl.toFixed(5))
    });

    return portfolio;
};

/* ================================
   ADMIN → ALL TRADES
================================ */
export const fetchAllTradesAdmin = async () => {
    return await getAllTrades();
};

/* ================================
   ADMIN → EDIT FULL TRADE
================================ */
export const editTradeAdminService = async (tradeId, payload) => {

    /* ✅ Allowed fields */
    const allowedFields = [
        "trade_type",
        "order_type",
        "position_side",
        "volume",
        "quantity",
        "entry_price",
        "executed_price",
        "spread",
        "stop_loss",
        "take_profit",
        "commission",
        "swap_charge",
        "notional",
        "pip_difference",
        "pip_pnl_usd",
        "is_executed",
        "executed_at",
        "open_time",
        "close_time"
    ];

    const fields = [];
    const values = [];

    for (const key of allowedFields) {
        if (payload[key] !== undefined) {
            fields.push(`${key} = ?`);
            values.push(payload[key]);
        }
    }

    if (!fields.length) {
        throw new Error("No valid fields to update");
    }

    await updateTradeByAdmin(tradeId, fields, values);

    return true;
};
