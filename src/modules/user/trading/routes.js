import express from "express";
import { authenticateUser } from "../../../core/middleware/auth-middleware.js";
import { placeTrade, closeTrade, getTrades } from "./controller.js";

const router = express.Router();

router.post("/trade", authenticateUser, placeTrade);
router.post("/trade/close/:id", authenticateUser, closeTrade);
router.get("/trades", authenticateUser, getTrades);

export default router;
