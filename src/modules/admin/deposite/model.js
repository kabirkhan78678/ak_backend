import { getAll, getOne, execute } from "../../../core/db-helper.js";

/* ===============================
   DEPOSITS
================================ */
export const getPendingDeposits = () => {
  return getAll(`
    SELECT
      d.id AS deposit_id,
      d.user_id,
      u.username,
      u.email,
      d.amount,
      d.txid,
      d.utr,
      d.upi_address,
      d.image,
      d.created_at
    FROM deposits d
    JOIN users u ON u.id = d.user_id
    WHERE d.status = 'pending'
    ORDER BY d.id DESC
  `);
};

export const getDepositHistory = () => {
  return getAll(`
    SELECT
      d.id AS deposit_id,
      d.user_id,                 -- ✅ ADDED
      u.username,
      u.email,
      d.amount,
      d.status,
      dc.admin_id,
      dc.confirmed_at
    FROM deposits d
    JOIN users u ON u.id = d.user_id
    JOIN deposit_confirmations dc ON dc.deposit_id = d.id
    ORDER BY dc.confirmed_at DESC
  `);
};

export const getDepositById = (depositId) => {
  return getOne(`SELECT * FROM deposits WHERE id = ?`, [depositId]);
};

export const updateDepositStatus = (depositId, status) => {
  return execute(
    `UPDATE deposits SET status = ? WHERE id = ?`,
    [status, depositId]
  );
};

export const insertDepositConfirmation = (depositId, adminId, status) => {
  return execute(`
    INSERT INTO deposit_confirmations
    (deposit_id, admin_id, status, confirmed_at)
    VALUES (?, ?, ?, NOW())
  `, [depositId, adminId, status]);
};

/* ===============================
   WALLET
================================ */
export const getWalletByUserId = (userId) => {
  return getOne(`SELECT * FROM wallets WHERE user_id = ?`, [userId]);
};

export const creditWallet = (userId, amount) => {
  return execute(`
    UPDATE wallets
    SET
      balance = balance + ?,
      updated_at = NOW()
    WHERE user_id = ?
  `, [amount, userId]);
};
