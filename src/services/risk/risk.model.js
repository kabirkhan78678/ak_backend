import { getOne, getAll, execute } from "../../core/db-helper.js";

/* 🔒 LOCK WALLET */
export const lockWallet = (userId) =>
  getOne(
    `SELECT id FROM wallets WHERE user_id=? FOR UPDATE`,
    [userId]
  );

/* 💰 WALLET */
export const getWallet = (userId) =>
  getOne(
    `SELECT balance, used_margin FROM wallets WHERE user_id=?`,
    [userId]
  );

/* 📊 OPEN POSITIONS (WITH LIVE PRICE) */
export const getOpenPositionsWithPnl = (userId) =>
  getAll(`
    SELECT
      p.id AS portfolio_id,
      p.trade_id,
      p.quantity,
      p.average_price,
      p.side,
      a.type,
      COALESCE(p.current_price, ap.price, p.average_price) AS current_price,
      (
        CASE
          WHEN p.side='long'
            THEN (COALESCE(p.current_price, ap.price, p.average_price) - p.average_price) * p.quantity
          ELSE (p.average_price - COALESCE(p.current_price, ap.price, p.average_price)) * p.quantity
        END
      ) AS unrealized_pnl
    FROM portfolios p
    JOIN assets a ON a.id = p.asset_id
    LEFT JOIN asset_prices ap ON ap.asset_id = a.id
    WHERE p.user_id=?
  `, [userId]);

/* ❌ CLOSE TRADE */
export const closeTrade = (tradeId, pnl, pipDiff) =>
  execute(
    `UPDATE trades
     SET pip_pnl_usd=?, pip_difference=?, close_time=NOW()
     WHERE id=?`,
    [pnl, pipDiff, tradeId]
  );

/* 🗑️ DELETE PORTFOLIO */
export const deletePortfolio = (tradeId) =>
  execute(`DELETE FROM portfolios WHERE trade_id=?`, [tradeId]);

/* 👥 USERS HOLDING AN ASSET */
export const getUsersByAsset = (assetId) =>
  getAll(
    `
    SELECT DISTINCT user_id
    FROM portfolios
    WHERE asset_id=?
  `,
    [assetId]
  );
