import { getAll, getOne, execute } from "../../../core/db-helper.js";

/* ================================
   ALL USERS PORTFOLIO
================================ */
export const getAllPortfolios = () => {
  return getAll(`
    SELECT
      p.id AS portfolio_id,
      p.user_id,
      u.email,
      a.symbol,
      a.name,
      p.quantity,
      p.average_price,
      p.side,
      a.spread,
      a.contract_size,
      COALESCE(p.current_price, ap.price, p.average_price) AS current_price,
      p.created_at
    FROM portfolios p
    JOIN users u ON u.id = p.user_id
    JOIN assets a ON a.id = p.asset_id
    LEFT JOIN asset_prices ap ON ap.asset_id = a.id
    ORDER BY p.created_at DESC
  `);
};

/* ================================
  UPDATE PORTFOLIO PRICE
================================ */
export const updatePortfolioPrice = async (portfolioId, price) => {
  const portfolio = await getOne(
    `SELECT
        p.id,
        p.user_id,
        p.asset_id,
        p.quantity,
        p.average_price,
        p.side,
        a.symbol
     FROM portfolios p
     JOIN assets a ON a.id = p.asset_id
     WHERE p.id = ?`,
    [portfolioId]
  );

  if (!portfolio) {
    throw new Error("Portfolio not found");
  }

  await execute(`
        UPDATE portfolios
        SET current_price = ?, updated_at = NOW()
        WHERE id = ?
    `, [price, portfolio.id]);

  return {
    ...portfolio,
    current_price: Number(price)
  };
};

/* ================================
   ALL TRADES HISTORY
================================ */
export const getAllTrades = () => {
  return getAll(`
    SELECT
      t.id,
      t.user_id,
      u.email,
      a.symbol,
      t.order_type,
      t.position_side,
      t.volume,
      t.entry_price,
      t.executed_price,
      t.spread,
      t.commission,
      t.swap_charge,
      t.pip_pnl_usd,
      t.open_time,
      t.close_time
    FROM trades t
    JOIN users u ON u.id = t.user_id
    JOIN assets a ON a.id = t.asset_id
    ORDER BY t.created_at DESC
  `);
};

/* ================================
   UPDATE TRADE VALUES
================================ */
/**
 * Dynamic trade update
 */
export const updateTradeByAdmin = (tradeId, fields, values) => {
  return execute(
    `UPDATE trades SET ${fields.join(", ")} WHERE id = ?`,
    [...values, tradeId]
  );
};
