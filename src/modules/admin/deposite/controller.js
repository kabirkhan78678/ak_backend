import {
    processDepositAdmin,
    fetchPendingDeposits,
    fetchDepositHistory,
    adminAddBalance
} from "./service.js";

/* ===============================
   APPROVE / REJECT DEPOSIT
================================ */
export const depositActionAdminApi = async (req, res) => {
    try {
        const { status } = req.body;
        const depositId = req.params.id;
        const adminId = req.admin.id;

        await processDepositAdmin(depositId, status, adminId);

        res.json({
            success: true,
            message: `Deposit ${status} successfully`
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/* ===============================
   ADMIN → ADD BALANCE MANUALLY
================================ */
export const addBalance = async (req, res) => {
    try {
        const { user_id, amount } = req.body;

        if (!user_id || !amount || Number(amount) <= 0) {
            return res.status(400).json({
                success: false,
                message: "user_id and valid amount are required"
            });
        }

        const wallet = await adminAddBalance({
            user_id,
            amount: Number(amount),
            admin_id: req.admin.id
        });

        res.status(200).json({
            success: true,
            message: "Balance added successfully",
            data: wallet
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/* ===============================
   ADMIN → PENDING DEPOSITS
================================ */
export const getPendingDepositsApi = async (req, res) => {
    try {
        const deposits = await fetchPendingDeposits();

        res.json({
            success: true,
            total: deposits.length,
            data: deposits
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/* ===============================
   ADMIN → DEPOSIT HISTORY
================================ */
export const getDepositHistoryApi = async (req, res) => {
    try {
        const history = await fetchDepositHistory();

        res.json({
            success: true,
            total: history.length,
            data: history
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
