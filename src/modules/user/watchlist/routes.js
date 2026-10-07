import express from "express";
import { authenticateUser } from "../../../core/middleware/auth-middleware.js";
import * as WatchlistController from "./controller.js";

const router = express.Router();

/* SIMPLE WATCHLIST */
router.get("/", authenticateUser, WatchlistController.getWatchlist);
router.post("/add", authenticateUser, WatchlistController.addAsset);
router.delete("/remove", authenticateUser, WatchlistController.removeAsset);

/* ALL ASSETS */
router.get("/assets/all", authenticateUser, WatchlistController.getAllAssets);

export default router;
