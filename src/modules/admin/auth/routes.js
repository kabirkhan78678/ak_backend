import express from "express";
import {
    adminLoginApi, getAppConfigController,
    toggleModeController,
} from "./controller.js";

import {
    startEngine,
    stopEngine,
    engineStatus
} from "../../../sockets/market-engine.controller.js";

const router = express.Router();

/* ADMIN API */
router.post("/login", adminLoginApi);

/* ▶ START MARKET ENGINE */
router.post("/market-engine/start", (req, res) => {
    const result = startEngine();
    res.json({ success: true, data: result });
});

/* ⏹ STOP MARKET ENGINE */
router.post("/market-engine/stop", (req, res) => {
    const result = stopEngine();
    res.json({ success: true, data: result });
});

/* 📊 ENGINE STATUS */
router.get("/market-engine/status", (req, res) => {
    res.json({ success: true, data: engineStatus() });
});

router.get("/app-config", getAppConfigController);
router.post("/toggle-mode", toggleModeController);

export default router;
