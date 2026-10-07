import express from "express";
import { authenticateAdmin } from "../../../core/middleware/adminAuth-middleware.js";
import {
    getAllWalletsAdminApi,
    editWalletAdminApi
} from "./controller.js";

const router = express.Router();

router.get("/get-wallets", authenticateAdmin, getAllWalletsAdminApi);
router.patch("/wallets/:id", authenticateAdmin, editWalletAdminApi);

export default router;
