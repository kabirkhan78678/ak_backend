import Decimal from "decimal.js";
import { getAllUsersFullDetails, getUserFullDetailById, getAllAssetSpreads, updateAssetSpread, updateUserLeverageById } from "./model.js";
import { getOne, execute } from "../../../core/db-helper.js";

const ALLOWED_LEVERAGES = new Set([
  "1:100",
  "1:200",
  "1:300",
  "1:400",
  "1:500",
  "1:600",
  "1:1000"
]);


export const fetchAllUsersAdmin = async () => {
  const users = await getAllUsersFullDetails();

  return {
    total_users: users.length,
    users
  };
};



export const fetchSingleUserAdmin = async (userId) => {
  const user = await getUserFullDetailById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

const normalizeLeverage = (leverage) => {
  if (leverage === undefined || leverage === null || leverage === "") {
    throw new Error("Leverage is required");
  }

  const rawValue = String(leverage).trim();
  let leverageValue = rawValue;

  if (rawValue.includes(":")) {
    const parts = rawValue.split(":").map(part => part.trim());
    if (parts.length !== 2 || parts[0] !== "1") {
      throw new Error("Leverage format must be like 1:100");
    }

    leverageValue = parts[1];
  }

  if (!leverageValue) {
    throw new Error("Invalid leverage format");
  }

  let parsed;
  try {
    parsed = new Decimal(leverageValue);
  } catch {
    throw new Error("Invalid leverage value");
  }

  if (!parsed.isFinite() || parsed.lte(0)) {
    throw new Error("Leverage must be greater than 0");
  }

  const normalizedLeverage = `1:${parsed.toString()}`;

  if (!ALLOWED_LEVERAGES.has(normalizedLeverage)) {
    throw new Error(
      `Invalid leverage. Allowed values: ${Array.from(ALLOWED_LEVERAGES).join(", ")}`
    );
  }

  return normalizedLeverage;
};

export const updateUserLeverageAdmin = async (userId, leverage) => {
  const user = await getOne(
    `SELECT id, leverage FROM users WHERE id = ?`,
    [userId]
  );

  if (!user) {
    throw new Error("User not found");
  }

  const normalizedLeverage = normalizeLeverage(leverage);

  await updateUserLeverageById(userId, normalizedLeverage);

  return {
    user_id: Number(userId),
    previous_leverage: user.leverage,
    leverage: normalizedLeverage
  };
};

/* ================================
   FETCH ALL ASSETS (SPREAD)
================================ */
export const fetchAllAssetSpreadsAdmin = async () => {
  return await getAllAssetSpreads();
};

/* ================================
   EDIT ASSET SPREAD
================================ */
export const updateAssetSpreadAdmin = async (assetId, payload) => {

  const allowedFields = [
    "spread",
    "swap_long",
    "swap_short",
    "commission"
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
    throw new Error("No valid asset fields to update");
  }

  await updateAssetSpread(assetId, fields, values);

  return true;
};

/**
 * 🗑 DELETE USER (ADMIN)
 */
export const deleteUserService = async (adminId, userId) => {

  // 🔐 Admin check
  const admin = await getOne(
    `SELECT id FROM admins WHERE id=?`,
    [adminId]
  );
  if (!admin) throw new Error("Unauthorized admin");

  // 👤 User exists?
  const user = await getOne(
    `SELECT id FROM users WHERE id=?`,
    [userId]
  );
  if (!user) throw new Error("User not found");

  /* ===============================
     🔥 DELETE FK DEPENDENCIES FIRST
  ================================ */

  // 🚨 VERY IMPORTANT (admin_id & deposit_id both)
  await execute(
    `DELETE FROM deposit_confirmations 
     WHERE admin_id = ? OR deposit_id IN (
        SELECT id FROM deposits WHERE user_id = ?
     )`,
    [userId, userId]
  );

  // deposits
  await execute(`DELETE FROM deposits WHERE user_id=?`, [userId]);

  // withdrawals
  await execute(`DELETE FROM withdrawal_requests WHERE user_id=?`, [userId]);
  await execute(`DELETE FROM withdrawal_history WHERE user_id=?`, [userId]);

  // trading
  await execute(`DELETE FROM trades WHERE user_id=?`, [userId]);
  await execute(`DELETE FROM portfolios WHERE user_id=?`, [userId]);
  await execute(`DELETE FROM watchlists WHERE user_id=?`, [userId]);

  // wallet & kyc
  await execute(`DELETE FROM wallets WHERE user_id=?`, [userId]);
  await execute(`DELETE FROM bank_accounts WHERE user_id=?`, [userId]);
  await execute(`DELETE FROM user_kyc WHERE user_id=?`, [userId]);

  /* ===============================
     🗑 DELETE USER
  ================================ */
  await execute(`DELETE FROM users WHERE id=?`, [userId]);

  return true;
};
