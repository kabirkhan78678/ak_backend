import { getOne, getAll, execute } from "../../../core/db-helper.js";

/* =====================================================
   WALLET LOCK
===================================================== */
export const lockWallet = (uid) =>
  getOne(`SELECT id FROM wallets WHERE user_id = ? FOR UPDATE`, [uid]);

/* =====================================================
   ASSET
===================================================== */
export const getAsset = (id) =>
  getOne(`SELECT * FROM assets WHERE id = ?`, [id]);

/* =====================================================
   MARKET PRICE (✅ ALWAYS LATEST)
===================================================== */
export const getMarketPrice = (assetId) =>
  getOne(`
    SELECT price
    FROM asset_prices
    WHERE asset_id = ?
    ORDER BY id DESC
    LIMIT 1
  `, [assetId]);

/* =====================================================
   WALLET
===================================================== */
export const getWallet = (uid) =>
  getOne(`
    SELECT w.*, u.leverage
    FROM wallets w
    JOIN users u ON u.id = w.user_id
    WHERE w.user_id = ?
  `, [uid]);

/* =====================================================
   TRADE INSERT
===================================================== */
export const insertTrade = (params) =>
  execute(`
    INSERT INTO trades
    (user_id, asset_id, trade_type, order_type, position_side,
     volume, quantity, entry_price, executed_price, spread,
     stop_loss, take_profit, commission, swap_charge, notional,
     is_executed, open_time)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,NOW())
  `, params);

/* =====================================================
   PORTFOLIO
===================================================== */
export const insertPortfolio = (params) =>
  execute(`
    INSERT INTO portfolios
    (user_id, asset_id, quantity, average_price, side, trade_id)
    VALUES (?,?,?,?,?,?)
  `, params);

export const getPortfolioById = (id, uid) =>
  getOne(`
    SELECT 
        p.*,
        a.type AS asset_type,
        a.symbol              -- ✅ THIS WAS MISSING
    FROM portfolios p
    JOIN assets a ON a.id = p.asset_id
    WHERE p.id = ? AND p.user_id = ?
  `, [id, uid]);

export const deletePortfolio = (tradeId) =>
  execute(`DELETE FROM portfolios WHERE trade_id = ?`, [tradeId]);

/* =====================================================
   TRADE CLOSE
===================================================== */
export const closeTrade = (tradeId, pnl, pipDiff, exitPrice) =>
  execute(`
    UPDATE trades
    SET 
      pip_pnl_usd = ?,
      pip_difference = ?,
      executed_price = ?,   -- ✅ EXIT PRICE
      close_time = NOW()
    WHERE id = ?
  `, [pnl, pipDiff, exitPrice, tradeId]);

/* =====================================================
   WALLET UPDATE (OPEN)
===================================================== */
export const updateWalletAfterTrade = (uid, margin) =>
  execute(`
    UPDATE wallets
    SET 
      used_margin = used_margin + ?,
      free_margin = free_margin - ?
    WHERE user_id = ?
  `, [margin, margin, uid]);

/* =====================================================
   WALLET UPDATE (CLOSE)
===================================================== */
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
   FETCH HELPERS
===================================================== */
export const fetchTrades = (sql, params) => getAll(sql, params);
export const fetchSummary = (sql, params) => getOne(sql, params);


export const checkMarketSession = (assetType, day, time) => {
  return getOne(
    `SELECT id FROM market_sessions
     WHERE asset_type = ?
     AND day_of_week = ?
     AND open_time <= ?
     AND close_time >= ?
     AND is_active = TRUE`,
    [assetType, day, time, time]
  );
};