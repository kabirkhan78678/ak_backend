import { getAll, execute } from "../../../core/db-helper.js";

/* ================================
   GET ALL USER WALLETS
================================ */
export const getAllWallets = () => {
    return getAll(`
    SELECT
      w.id AS wallet_id,
      w.user_id,
      u.email,
      w.balance,
      w.free_margin,
      w.used_margin,
      w.currency,
      w.updated_at
    FROM wallets w
    JOIN users u ON u.id = w.user_id
    ORDER BY w.updated_at DESC
  `);
};

/* ================================
   UPDATE WALLET (ADMIN)
================================ */
export const updateWalletByAdmin = (walletId, fields, values) => {
    return execute(
        `UPDATE wallets SET ${fields.join(", ")} WHERE id = ?`,
        [...values, walletId]
    );
};
