import express from "express";
import { authenticateAdmin } from "../../../core/middleware/adminAuth-middleware.js";
import * as WithdrawController from "./controller.js";

const router = express.Router();

/* ⏳ PENDING */
router.get(
    "/pending",
    authenticateAdmin,
    WithdrawController.getPendingWithdrawRequests
);

/* 📜 HISTORY */
router.get(
    "/history",
    authenticateAdmin,
    WithdrawController.getWithdrawHistory
);

/* ✅ APPROVE */
router.post(
    "/:id/approve",
    authenticateAdmin,
    WithdrawController.approveWithdraw
);

/* ❌ REJECT */
router.post(
    "/:id/reject",
    authenticateAdmin,
    WithdrawController.rejectWithdraw
);

/* 🏦 USER BANK ACCOUNTS */
router.get(
    "/user/:userId",
    authenticateAdmin,
    WithdrawController.getUserBankAccounts
);

export default router;
