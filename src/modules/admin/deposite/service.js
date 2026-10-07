import {
  getDepositById,
  updateDepositStatus,
  insertDepositConfirmation,
  getPendingDeposits,
  getDepositHistory,
  getWalletByUserId,
  creditWallet
} from "./model.js";

import { execute } from "../../../core/db-helper.js";
import { syncWalletSnapshot } from "../../../services/wallet.service.js";

/* ===============================
   DEPOSIT APPROVAL / REJECTION
================================ */
export const processDepositAdmin = async (depositId, status, adminId) => {
  if (!["approved", "rejected"].includes(status)) {
    throw new Error("Invalid deposit status");
  }

  const deposit = await getDepositById(depositId);
  if (!deposit) throw new Error("Deposit not found");

  if (deposit.status !== "pending") {
    throw new Error("Deposit already processed");
  }

  // 1️⃣ Update deposit status ONLY
  await updateDepositStatus(depositId, status);

  // 2️⃣ Insert confirmation
  await insertDepositConfirmation(depositId, adminId, status);

  // 3️⃣ Log wallet transaction (NO CREDIT)
  await execute(`
    INSERT INTO wallet_transactions
    (user_id, type, amount, reference_id, reference_type, status, created_at)
    VALUES (?, 'deposit', ?, ?, 'deposit', ?, NOW())
  `, [
    deposit.user_id,
    deposit.amount,
    depositId,
    status === "approved" ? "success" : "failed"
  ]);

  return true;
};


/* ===============================
   ADMIN MANUAL ADD BALANCE
================================ */
export const adminAddBalance = async ({ user_id, amount, admin_id }) => {
  const wallet = await getWalletByUserId(user_id);
  if (!wallet) throw new Error("Wallet not found");

  // 1️⃣ Credit wallet
  await creditWallet(user_id, amount);
  await syncWalletSnapshot(user_id);

  // 2️⃣ wallet_transactions entry
  await execute(`
    INSERT INTO wallet_transactions
    (user_id, type, amount, reference_id, reference_type, status, created_at)
    VALUES (?, 'admin_credit', ?, ?, 'admin', 'success', NOW())
  `, [user_id, amount, admin_id]);

  return await getWalletByUserId(user_id);
};

/* ===============================
   FETCHERS
================================ */
export const fetchPendingDeposits = async () => {
  return getPendingDeposits();
};

export const fetchDepositHistory = async () => {
  return getDepositHistory();
};
