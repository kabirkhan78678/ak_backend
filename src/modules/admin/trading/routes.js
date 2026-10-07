import express from "express";
import { authenticateAdmin } from "../../../core/middleware/adminAuth-middleware.js";
import {
    getAllPortfolioAdminApi,
    updatePortfolioAdminApi,
    getAllTradesAdminApi,
    editTradeAdminApi
} from "./controller.js";

const router = express.Router();

/* PORTFOLIO */
router.get("/portfolio", authenticateAdmin, getAllPortfolioAdminApi);
router.patch("/portfolio/:id", authenticateAdmin, updatePortfolioAdminApi);

/* TRADES */
router.get("/trades", authenticateAdmin, getAllTradesAdminApi);
router.patch("/trades/:id", authenticateAdmin, editTradeAdminApi);

export default router;
