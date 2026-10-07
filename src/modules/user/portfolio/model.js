import { getOne, getAll, execute } from "../../../core/db-helper.js";

/* =====================================================
   PORTFOLIO BY ID  (USE PORTFOLIO PRICE)
===================================================== */
export const getPortfolioById = (id, uid) =>
  getOne(`
    SELECT 
        p.*,
        a.type AS asset_type,
        p.current_price
    FROM portfolios p
    JOIN assets a ON a.id = p.asset_id
    WHERE p.id = ? AND p.user_id = ?
  `, [id, uid]);

/* =====================================================
   CLOSE TRADE
===================================================== */
export const closeTrade = (tradeId, pnl, pipDiff, exitPrice) =>
  execute(`
    UPDATE trades
    SET 
      pip_pnl_usd = ?,
      pip_difference = ?,
      executed_price = ?,   -- EXIT PRICE
      close_time = NOW()
    WHERE id = ?
  `, [pnl, pipDiff, exitPrice, tradeId]);

export const deletePortfolio = (tradeId) =>
  execute(`DELETE FROM portfolios WHERE trade_id = ?`, [tradeId]);

/* =====================================================
   WALLET
===================================================== */
export const getWallet = (uid) =>
  getOne(`SELECT * FROM wallets WHERE user_id = ?`, [uid]);

export const lockWallet = (uid) =>
  getOne(`SELECT id FROM wallets WHERE user_id = ? FOR UPDATE`, [uid]);

export const updateWalletAfterClose = (uid, pnl, margin) =>
  execute(`
    UPDATE wallets
    SET 
      balance = balance + ?,
      used_margin = used_margin - ?,
      free_margin = free_margin + ?
    WHERE user_id = ?
  `, [pnl, margin, margin, uid]);

/* =====================================================
   GROUPED PORTFOLIO (USE PORTFOLIO PRICE)
===================================================== */
export const fetchGroupedPortfolio = (uid) =>
  getAll(`
    SELECT
      a.type,
      p.id AS portfolio_id,
      a.symbol,
      p.side,
      p.quantity,
      p.average_price,
      p.current_price,
      t.open_time
    FROM portfolios p
    JOIN assets a ON a.id = p.asset_id
    JOIN trades t ON t.id = p.trade_id
    WHERE p.user_id = ?
  `, [uid]);