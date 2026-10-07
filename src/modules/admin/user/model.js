import { getAll, getOne, execute } from "../../../core/db-helper.js";


/**
 * Admin → Get all users with full details
 */
export const getAllUsersFullDetails = () => {
  return getAll(`
    SELECT 
      u.id,
      u.username,
      u.email,
      u.phone,
      u.first_name,
      u.last_name,
      u.country,
      u.account_type,
      u.leverage,
      u.plain_password,
      u.is_active,
      u.is_admin,
      u.is_trading_allowed,
      u.last_login,
      u.last_activity,
      u.created_at,

      -- KYC (1:1)
      k.id AS kyc_id,
      k.address_proof,
      k.document_proof,
      k.photo,
      k.profile_image,
      k.is_verified AS kyc_verified,
      k.is_rejected AS kyc_rejected,
      k.verified_at AS kyc_verified_at,

      -- TOTAL DEPOSIT (subquery)
      (
        SELECT IFNULL(SUM(d.amount),0)
        FROM deposits d
        WHERE d.user_id = u.id
          AND d.status = 'approved'
      ) AS total_deposit,

      -- TOTAL WITHDRAWN (subquery)
      (
        SELECT IFNULL(SUM(w.amount),0)
        FROM withdrawal_requests w
        WHERE w.user_id = u.id
          AND w.status = 'approved'
      ) AS total_withdrawn

    FROM users u
    LEFT JOIN user_kyc k ON k.user_id = u.id
    ORDER BY u.id DESC
  `);
};


/**
 * Get single user full details (admin)
 */
export const getUserFullDetailById = (userId) => {
  return getOne(`
    SELECT 
      u.id,
      u.username,
      u.email,
      u.phone,
      u.first_name,
      u.last_name,
      u.country,
      u.account_type,
      u.leverage,
      u.is_active,
      u.is_admin,
      u.is_trading_allowed,
      u.last_login,
      u.last_activity,
      u.created_at,
      u.updated_at,

      -- KYC
      k.id AS kyc_id,
      k.address_proof,
      k.document_proof,
      k.photo,
      k.profile_image,
      k.is_verified AS kyc_verified,
      k.is_rejected AS kyc_rejected,
      k.verified_at AS kyc_verified_at,

      -- TOTAL DEPOSIT
      (
        SELECT IFNULL(SUM(d.amount),0)
        FROM deposits d
        WHERE d.user_id = u.id AND d.status = 'approved'
      ) AS total_deposit,

      -- TOTAL WITHDRAWN
      (
        SELECT IFNULL(SUM(w.amount),0)
        FROM withdrawal_requests w
        WHERE w.user_id = u.id AND w.status = 'approved'
      ) AS total_withdrawn

    FROM users u
    LEFT JOIN user_kyc k ON k.user_id = u.id
    WHERE u.id = ?
    LIMIT 1
  `, [userId]);
};

export const updateUserLeverageById = (userId, leverage) => {
  return execute(
    `
      UPDATE users
      SET leverage = ?
      WHERE id = ?
    `,
    [leverage, userId]
  );
};


/* ================================
   GET ALL ASSET SPREAD (ADMIN)
   ONLY REQUIRED FIELDS
================================ */
export const getAllAssetSpreads = () => {
  return getAll(`
    SELECT
      id AS asset_id,
      symbol,
      name,
      type,
      spread
    FROM assets
    ORDER BY symbol ASC
  `);
};

/* ================================
   UPDATE ASSET SPREAD (ADMIN)
================================ */
export const updateAssetSpread = (assetId, fields, values) => {
  return execute(
    `UPDATE assets SET ${fields.join(", ")} WHERE id = ?`,
    [...values, assetId]
  );
};
