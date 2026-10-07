import express from "express";
import { authenticateAdmin } from "../../../core/middleware/adminAuth-middleware.js";
import {
    getAllKycAdminApi,
    kycActionAdminApi
} from "./controller.js";

const router = express.Router();

/* ADMIN KYC ROUTES */
router.get("/get-all-kyc", authenticateAdmin, getAllKycAdminApi);
router.patch("/control-kyc/:id", authenticateAdmin, kycActionAdminApi);

export default router;
