import * as WithdrawService from "./service.js";

/* ⏳ GET PENDING WITHDRAW REQUESTS */
export const getPendingWithdrawRequests = async (req, res) => {
    try {
        const data = await WithdrawService.getPendingWithdrawRequests();
        res.json({ success: true, data });
    } catch (e) {
        res.status(400).json({ success: false, message: e.message });
    }
};

/* 📜 GET WITHDRAW HISTORY */
export const getWithdrawHistory = async (req, res) => {
    try {
        const data = await WithdrawService.getWithdrawHistory();
        res.json({ success: true, data });
    } catch (e) {
        res.status(400).json({ success: false, message: e.message });
    }
};

/* ✅ APPROVE WITHDRAW */
export const approveWithdraw = async (req, res) => {
    try {
        if (!req.admin) throw new Error("Admin authentication failed");

        const withdrawId = req.params.id;

        const data = await WithdrawService.approveWithdraw(
            withdrawId,
            req.admin.id
        );

        res.json({ success: true, ...data });
    } catch (e) {
        res.status(400).json({ success: false, message: e.message });
    }
};

/* ❌ REJECT WITHDRAW */
export const rejectWithdraw = async (req, res) => {
    try {
        if (!req.admin) throw new Error("Admin authentication failed");

        const withdrawId = req.params.id;
        const { remark } = req.body || {};

        const data = await WithdrawService.rejectWithdraw(
            withdrawId,
            req.admin.id,
            remark
        );

        res.json({ success: true, ...data });
    } catch (e) {
        res.status(400).json({ success: false, message: e.message });
    }
};


/* 🏦 GET USER BANK ACCOUNTS */
export const getUserBankAccounts = async (req, res) => {
    try {
        if (!req.admin) throw new Error("Admin authentication failed");

        const userId = Number(req.params.userId);
        if (!Number.isInteger(userId) || userId <= 0) {
            throw new Error("Invalid user ID");
        }

        const data = await WithdrawService.getBankAccountsByUserId(userId);

        res.json({
            success: true,
            data
        });
    } catch (e) {
        res.status(400).json({
            success: false,
            message: e.message
        });
    }
};