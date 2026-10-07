import { getAll, getOne, execute } from "../../../core/db-helper.js";
import Decimal from "decimal.js";
import { syncWalletSnapshot } from "../../../services/wallet.service.js";

/* =====================================
   ⏳ PENDING WITHDRAW REQUESTS
===================================== */
export const getPendingWithdrawRequests = async () => {
    return await getAll(`
    SELECT
      wr.id,
      wr.user_id,
      u.email,
      wr.amount,
      wr.created_at
    FROM withdrawal_requests wr
    JOIN users u ON u.id = wr.user_id
    WHERE wr.status = 'pending'
    ORDER BY wr.created_at DESC
  `);
};

/* =====================================
   📜 WITHDRAW HISTORY
===================================== */
export const getWithdrawHistory = async () => {
    return await getAll(`
    SELECT
      wh.id,
      wh.withdrawal_request_id,
      wh.user_id,
      u.email,
      wh.amount,
      wh.status,
      wh.remark,
      wh.admin_id,
      wh.created_at
    FROM withdrawal_history wh
    JOIN users u ON u.id = wh.user_id
    ORDER BY wh.created_at DESC
  `);
};

/* =====================================
   ✅ APPROVE WITHDRAW (FINAL FIXED)
===================================== */
export const approveWithdraw = async (withdrawId, adminId) => {
    const id = Number(withdrawId);
    if (!Number.isInteger(id) || id <= 0) {
        throw new Error("Invalid withdrawal ID");
    }

    const req = await getOne(
        `SELECT * FROM withdrawal_requests WHERE id=? AND status='pending'`,
        [id]
    );
    if (!req) throw new Error("Pending withdrawal not found");

    const wallet = await getOne(
        `SELECT balance, used_margin FROM wallets WHERE user_id=?`,
        [req.user_id]
    );
    if (!wallet) throw new Error("Wallet not found");

    const amount = new Decimal(req.amount);
    if (new Decimal(wallet.balance).lt(amount)) {
        throw new Error("Insufficient wallet balance");
    }

    await execute("START TRANSACTION");

    try {
        /* 1️⃣ Deduct wallet balance */
        await execute(
            `UPDATE wallets 
       SET balance = balance - ?
       WHERE user_id = ?`,
            [amount.toNumber(), req.user_id]
        );

        /* 2️⃣ Sync wallet snapshot */
        await syncWalletSnapshot(req.user_id);

        /* 3️⃣ Insert admin history (AUDIT LOG) */
        const history = await execute(
            `
      INSERT INTO withdrawal_history
      (withdrawal_request_id, user_id, amount, status, admin_id)
      VALUES (?, ?, ?, 'approved', ?)
      `,
            [req.id, req.user_id, amount.toNumber(), adminId]
        );

        /* 4️⃣ UPDATE request status (🔥 MAIN FIX) */
        await execute(
            `
      UPDATE withdrawal_requests
      SET status='approved', updated_at=NOW()
      WHERE id=?
      `,
            [id]
        );

        await execute("COMMIT");

        return {
            message: "Withdrawal approved successfully",
            withdrawal_request_id: req.id,
            withdrawal_history_id: history.insertId
        };

    } catch (e) {
        await execute("ROLLBACK");
        throw e;
    }
};

/* =====================================
   ❌ REJECT WITHDRAW
===================================== */
export const rejectWithdraw = async (withdrawId, adminId, remark = null) => {
    const id = Number(withdrawId);
    if (!Number.isInteger(id) || id <= 0) {
        throw new Error("Invalid withdrawal ID");
    }

    const req = await getOne(
        `SELECT * FROM withdrawal_requests WHERE id=? AND status='pending'`,
        [id]
    );
    if (!req) throw new Error("Pending withdrawal not found");

    await execute("START TRANSACTION");

    try {
        /* 1️⃣ Insert rejection history */
        const history = await execute(
            `
      INSERT INTO withdrawal_history
      (withdrawal_request_id, user_id, amount, status, admin_id, remark)
      VALUES (?, ?, ?, 'rejected', ?, ?)
      `,
            [req.id, req.user_id, req.amount, adminId, remark]
        );

        /* 2️⃣ UPDATE request status */
        await execute(
            `
      UPDATE withdrawal_requests
      SET status='rejected', updated_at=NOW()
      WHERE id=?
      `,
            [id]
        );

        await execute("COMMIT");

        return {
            message: "Withdrawal rejected successfully",
            withdrawal_request_id: req.id,
            withdrawal_history_id: history.insertId
        };

    } catch (e) {
        await execute("ROLLBACK");
        throw e;
    }
};


/* =====================================
   🏦 GET BANK ACCOUNTS BY USER ID
===================================== */
export const getBankAccountsByUserId = async (userId) => {
    return await getAll(
        `
        SELECT
            id,
            user_id,
            account_holder_name,
            bank_account_number,
            ifsc_code,
            bank_name,
            bank_branch,
            upi_id,
            is_default,
            created_at
        FROM bank_accounts
        WHERE user_id = ?
        ORDER BY is_default DESC, created_at DESC
        `,
        [userId]
    );
};
