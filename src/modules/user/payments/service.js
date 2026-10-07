import { getOne, getAll, execute } from "../../../core/db-helper.js";
import { fetchDeposits, fetchWithdrawals, getWallet, getActivePaymentQr, getUserKycStatus, getUserBankAccount, insertBankAccount, updateBankAccount } from "./model.js";
import Decimal from "decimal.js";
import { syncWalletSnapshot } from "../../../services/wallet.service.js";

/**
 * 💰 CREATE DEPOSIT
 */
export const createDeposit = async (userId, data, screenshot) => {

  const { amount, txid, utr, upi_address } = data;

  if (!amount || !utr)
    throw new Error("Amount & UTR required");

  await execute(
    `INSERT INTO deposits 
     (user_id, amount, txid, utr, upi_address, image, status)
     VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
    [
      userId,
      amount,
      txid || null,
      utr,
      upi_address || null,
      screenshot
    ]
  );

  return {
    message: "Deposit request submitted, waiting for confirmation"
  };
};


/**
 * 🏦 WITHDRAW REQUEST (NO BALANCE DEDUCTION HERE)
 */
export const requestWithdraw = async (userId, data) => {

  const {
    amount,
    upi_id,
    bank_account_number,
    ifsc_code,
    bank_name,
    bank_branch,
    account_holder_name
  } = data;

  if (!amount) throw new Error("Amount required");

  const amt = new Decimal(amount);
  if (amt.lte(0)) throw new Error("Invalid amount");

  /* 🔐 KYC CHECK */
  const kyc = await getOne(
    `SELECT is_verified FROM user_kyc WHERE user_id=?`,
    [userId]
  );
  if (!kyc || !kyc.is_verified)
    throw new Error("KYC not verified");

  /* 💳 METHOD CHECK */
  const hasBank =
    bank_account_number && ifsc_code && bank_name;

  const hasUpi =
    upi_id && upi_id.includes("@");

  if (!hasBank && !hasUpi)
    throw new Error("Provide bank or UPI");

  if (hasBank && hasUpi)
    throw new Error("Only one method allowed");

  /* 💰 BALANCE CHECK */
  const wallet = await getOne(
    `SELECT balance FROM wallets WHERE user_id=?`,
    [userId]
  );

  if (new Decimal(wallet.balance).lt(amt))
    throw new Error("Insufficient wallet balance");

  /* ===============================
     🏦 / 📱 INSERT OR REPLACE
  ================================ */

  const existing = await getUserBankAccount(userId);

  if (!existing) {
    // 🔹 First time insert
    await insertBankAccount([
      userId,
      account_holder_name || null,
      hasBank ? bank_account_number : null,
      hasBank ? ifsc_code : null,
      hasBank ? bank_name : null,
      hasBank ? bank_branch || null : null,
      hasUpi ? upi_id : null
    ]);
  } else {
    // 🔁 Replace existing row
    await updateBankAccount([
      account_holder_name || null,
      hasBank ? bank_account_number : null,
      hasBank ? ifsc_code : null,
      hasBank ? bank_name : null,
      hasBank ? bank_branch || null : null,
      hasUpi ? upi_id : null,
      userId
    ]);
  }

  /* ===============================
     📤 CREATE WITHDRAW REQUEST
  ================================ */
  await execute(
    `
    INSERT INTO withdrawal_requests
    (user_id, amount, status)
    VALUES (?, ?, 'pending')
    `,
    [userId, amt.toNumber()]
  );

  return {
    message: "Withdrawal request submitted",
    amount: amt.toNumber(),
    status: "pending"
  };
};


/**
 * 📜 TRANSACTION HISTORY (FILTERABLE, NO PAGINATION)
 */
export const transactionHistory = async (userId, query) => {
  const {
    type,          // deposit | withdraw
    period,        // today | week | month | year
    from, to,      // custom date range
    min_amount,
    max_amount
  } = query;

  let transactions = [];

  /* ================= DEPOSITS ================= */
  if (!type || type === "deposit") {
    const deposits = await fetchDeposits(
      `
      SELECT 
        id,
        amount,
        utr,
        status,
        created_at,
        'deposit' AS type
      FROM deposits
      WHERE user_id = ?
      `,
      [userId]
    );

    transactions.push(...deposits);
  }

  /* ================= WITHDRAW (PENDING) ================= */
  if (!type || type === "withdraw") {
    const pendingWithdraws = await fetchWithdrawals(
      `
      SELECT 
        id,
        amount,
        status,
        created_at,
        'withdraw' AS type
      FROM withdrawal_requests
      WHERE user_id = ?
        AND status = 'pending'
      `,
      [userId]
    );

    transactions.push(...pendingWithdraws);
  }

  /* ================= WITHDRAW (APPROVED + REJECTED) ================= */
  if (!type || type === "withdraw") {
    const completedWithdraws = await fetchWithdrawals(
      `
      SELECT 
        id,
        amount,
        status,
        created_at,
        'withdraw' AS type
      FROM withdrawal_history
      WHERE user_id = ?
        AND status IN ('approved', 'rejected')
      `,
      [userId]
    );

    transactions.push(...completedWithdraws);
  }

  /* ================= SORT (LATEST FIRST) ================= */
  transactions.sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  /* ================= SUMMARY ================= */

  const approvedWithdraw = await getOne(
    `
    SELECT IFNULL(SUM(amount),0) AS total
    FROM withdrawal_history
    WHERE user_id = ?
      AND status = 'approved'
    `,
    [userId]
  );

  const summary = {
    total_transactions: transactions.length,

    total_deposit: transactions
      .filter(t => t.type === "deposit" && t.status === "success")
      .reduce((s, t) => s + Number(t.amount), 0),

    total_withdraw: Number(approvedWithdraw.total)
  };

  return {
    summary,
    transactions
  };
};


/* ===============================
   WALLET SUMMARY SERVICE
================================ */
export const getWalletSummaryService = async (userId) => {

  const wallet = await getWallet(userId);
  if (!wallet) throw new Error("Wallet not found");

  const walletSnapshot = await syncWalletSnapshot(userId, wallet.balance);
  const balance = walletSnapshot.balance;
  const usedMargin = walletSnapshot.usedMargin;
  const unrealizedPnl = walletSnapshot.unrealizedPnl;

  /* ===== EQUITY ===== */
  const equity = walletSnapshot.equity;

  /* ===== FREE MARGIN ===== */
  const freeMargin = walletSnapshot.freeMargin;

  /* ===== MARGIN LEVEL ===== */
  const marginLevel =
    usedMargin.gt(0)
      ? equity.div(usedMargin).mul(100).toFixed(2)
      : "0.00";

  return {
    user_id: userId,
    balance: balance.toFixed(2),
    equity: equity.toFixed(2),
    margin: usedMargin.toFixed(2),
    free_margin: freeMargin.toFixed(2),
    used_margin: usedMargin.toFixed(2),
    unrealized_pnl: unrealizedPnl.toFixed(2),
    margin_level_percent: marginLevel,
    currency: wallet.currency
  };
};


export const getPaymentQrService = async () => {
  const qr = await getActivePaymentQr();

  if (!qr) {
    throw new Error("Payment method not available");
  }

  const baseUrl =
    process.env.FILE_BASE_URL || `${process.env.APP_URL}`;

  return {
    qr_image: qr.image
      ? `${baseUrl}/${qr.image}`
      : null,
    upi_address: qr.upi_address
  };
};


/**
 * 🔐 GET KYC STATUS (USER SIDE)
 */
export const getKycStatusService = async (userId) => {
  const kyc = await getUserKycStatus(userId);

  if (!kyc) {
    return {
      status: "not_submitted",
      is_verified: false,
      is_rejected: false,
      submitted: false,
      message: "KYC not submitted"
    };
  }

  if (kyc.status === "rejected") {
    return {
      status: "rejected",
      is_verified: false,
      is_rejected: true,
      submitted: true,
      submitted_at: kyc.submitted_at,
      resubmitted_at: kyc.resubmitted_at,
      rejection_reason: kyc.rejection_reason,
      message: kyc.rejection_reason || "KYC rejected"
    };
  }

  if (kyc.status === "verified") {
    return {
      status: "verified",
      is_verified: true,
      is_rejected: false,
      submitted: true,
      verified_at: kyc.verified_at,
      message: "KYC verified successfully"
    };
  }

  return {
    status: "pending",
    is_verified: false,
    is_rejected: false,
    submitted: true,
    submitted_at: kyc.submitted_at,
    message: "KYC under review"
  };
};

/**
 * 🪪 SUBMIT KYC (USER SIDE)
 */
export const submitKyc = async (userId, files) => {

  const photo = files.photo?.[0]?.path || null;
  const documentProof = files.document_proof?.[0]?.path || null;
  const addressProof = files.address_proof?.[0]?.path || null;
  const profileImage = files.profile_image?.[0]?.path || null;

  if (!photo) {
    throw new Error("Profile photo is required");
  }

  // 🔍 Always get latest row
  const existing = await getOne(
    `SELECT * FROM user_kyc WHERE user_id=? ORDER BY id DESC LIMIT 1`,
    [userId]
  );

  // ✅ VERIFIED → BLOCK
  if (existing && existing.is_verified) {
    throw new Error("KYC already verified");
  }

  // ⏳ PENDING → BLOCK
  if (existing && !existing.is_verified && !existing.is_rejected) {
    throw new Error("KYC already submitted and under review");
  }

  // 🔁 REJECTED → UPDATE SAME ROW ✅
  if (existing && existing.is_rejected) {
    await execute(
      `
      UPDATE user_kyc
      SET 
        photo=?,
        document_proof=?,
        address_proof=?,
        profile_image=?,
        is_verified=0,
        is_rejected=0,
        submitted=1,
        resubmitted_at=NOW(),
        rejection_reason=NULL
      WHERE id=?
      `,
      [
        photo,
        documentProof,
        addressProof,
        profileImage,
        existing.id   // 🔥 SAME ROW UPDATE
      ]
    );

    return {
      message: "KYC resubmitted successfully",
      status: "pending"
    };
  }

  // 🆕 FIRST TIME → INSERT
  await execute(
    `
    INSERT INTO user_kyc
    (
      user_id,
      photo,
      document_proof,
      address_proof,
      profile_image,
      is_verified,
      is_rejected,
      submitted,
      submitted_at
    )
    VALUES (?,?,?,?,?,0,0,1,NOW())
    `,
    [
      userId,
      photo,
      documentProof,
      addressProof,
      profileImage
    ]
  );

  return {
    message: "KYC submitted successfully",
    status: "pending"
  };
};