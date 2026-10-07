import express from "express";
import { authenticateAdmin } from "../../../core/middleware/adminAuth-middleware.js";
import {
    getPendingDepositsApi,
    depositActionAdminApi,
    getDepositHistoryApi,
    addBalance
} from "./controller.js";

const router = express.Router();

/* ===============================
   ADMIN → DEPOSITS
================================ */
router.get("/pending", authenticateAdmin, getPendingDepositsApi);
router.patch("/deposits-control/:id", authenticateAdmin, depositActionAdminApi);
router.get("/history", authenticateAdmin, getDepositHistoryApi);

/* ===============================
   ADMIN → ADD BALANCE MANUALLY
================================ */
router.post("/add-balance", authenticateAdmin, addBalance);

export default router;
