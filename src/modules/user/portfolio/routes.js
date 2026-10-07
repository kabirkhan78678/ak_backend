import express from "express";
import { authenticateUser } from "../../../core/middleware/auth-middleware.js";
import {
    getPortfolio,
    closePortfolioTrade
} from "./controller.js";

const router = express.Router();

router.get("/get-portfolio", authenticateUser, getPortfolio);
router.post(
    "/close/:portfolioId",
    authenticateUser,
    closePortfolioTrade
);

export default router;
