import { execute, getOne, getAll } from "../../../core/db-helper.js";

// Save reset token
export const saveResetToken = async (email, token, expiry) => {
    return execute(
        `UPDATE users SET reset_token=?, reset_token_expiry=? WHERE email=?`,
        [token, expiry, email]
    );
};

// Get user by reset token
export const getUserByResetToken = async (token) => {
    return getOne(
        `SELECT id FROM users 
     WHERE reset_token=? AND reset_token_expiry > NOW()`,
        [token]
    );
};

// 🔍 Get user password by ID
export const getUserPasswordById = async (id) => {
    return getOne(
        `SELECT password FROM users WHERE id=?`,
        [id]
    );
};

export const fetchDeposits = (sql, params) =>
    getAll(sql, params);

export const fetchWithdrawals = (sql, params) =>
    getAll(sql, params);

/* ───────── WALLET BASIC ───────── */
export const getWallet = (userId) =>
    getOne(`
        SELECT 
            balance,
            used_margin,
            currency
        FROM wallets
        WHERE user_id = ?
    `, [userId]);

/* ───────── UNREALIZED PNL ───────── */
export const getUnrealizedPnl = (userId) =>
    getOne(`
        SELECT 
            IFNULL(SUM(
                CASE 
                    WHEN t.position_side='long'
                        THEN (COALESCE(p.current_price, ap.price, p.average_price) - p.average_price) * p.quantity
                    ELSE (p.average_price - COALESCE(p.current_price, ap.price, p.average_price)) * p.quantity
                END
            ),0) AS unrealized_pnl
        FROM portfolios p
        JOIN assets a ON a.id = p.asset_id
        LEFT JOIN asset_prices ap ON ap.asset_id = a.id
        JOIN trades t ON t.id = p.trade_id
        WHERE p.user_id = ?
    `, [userId]);

/* ───────── ACTIVE QR / UPI ───────── */
export const getActivePaymentQr = () =>
    getOne(`
    SELECT image, upi_address
    FROM payment_qr_codes
    WHERE is_active = 1
    ORDER BY id DESC
    LIMIT 1
  `);

/* ===============================
   BANK / UPI CHECK (NEW)
================================ */

/* 🔍 Get user's bank/upi row */
export const getUserBankAccount = (userId) =>
    getOne(
        `SELECT id FROM bank_accounts WHERE user_id=?`,
        [userId]
    );

/* 🆕 Insert first time */
export const insertBankAccount = (data) =>
    execute(
        `
    INSERT INTO bank_accounts
    (user_id, account_holder_name, bank_account_number, ifsc_code,
     bank_name, bank_branch, upi_id, is_default)
    VALUES (?,?,?,?,?,?,?,1)
    `,
        data
    );

/* 🔁 Update existing row */
export const updateBankAccount = (data) =>
    execute(
        `
    UPDATE bank_accounts
    SET
      account_holder_name=?,
      bank_account_number=?,
      ifsc_code=?,
      bank_name=?,
      bank_branch=?,
      upi_id=?
    WHERE user_id=?
    `,
        data
    );

// 🔍 Same UPI already saved?
export const getUserUpiByDetails = (userId, upi_id) =>
    getOne(
        `
    SELECT id 
    FROM bank_accounts
    WHERE user_id=? AND upi_id=?
    `,
        [userId, upi_id]
    );



// 🔍 Get KYC status (with computed status)
export const getUserKycStatus = (userId) =>
    getOne(
        `
    SELECT 
      id,
      is_verified,
      is_rejected,
      verified_at,
      created_at,
      submitted,
      submitted_at,
      resubmitted_at,
      rejection_reason,
      photo,
      document_proof,
      address_proof,
      profile_image,
      CASE
        WHEN is_verified = 1 THEN 'verified'
        WHEN is_rejected = 1 THEN 'rejected'
        WHEN submitted = 1 THEN 'pending'
        ELSE 'not_submitted'
      END AS status
    FROM user_kyc
    WHERE user_id = ?
    ORDER BY id DESC
    LIMIT 1
    `,
        [userId]
    );
