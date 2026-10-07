import { getAllWallets, updateWalletByAdmin } from "./model.js";

/* ================================
   FETCH ALL WALLETS
================================ */
export const fetchAllWalletsAdmin = async () => {
  return await getAllWallets();
};

/* ================================
   EDIT WALLET
================================ */
export const editWalletAdminService = async (walletId, payload) => {

  const allowedFields = [
    "balance",
    "free_margin",
    "used_margin",
    "currency"
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
    throw new Error("No valid wallet fields to update");
  }

  await updateWalletByAdmin(walletId, fields, values);

  return true;
};
