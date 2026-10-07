import express from "express";
import * as WalletController from "./controller.js";
import { authenticateUser } from "../../../core/middleware/auth-middleware.js";
import { localUploaderFields } from "../../../utility/upload/multerUpload.js";


const router = express.Router();

router.post(
    "/deposit",
    authenticateUser,
    localUploaderFields("uploads/deposits", [
        { name: "screenshot", maxCount: 1 }
    ]),
    WalletController.createDeposit
);
router.post("/request-withdraw", authenticateUser, WalletController.requestWithdraw);
router.get("/transactions", authenticateUser, WalletController.transactionHistory);

router.post(
    "/kyc",
    authenticateUser,
    localUploaderFields("uploads/kyc", [
        { name: "photo", maxCount: 1 },
        { name: "document_proof", maxCount: 1 },
        { name: "address_proof", maxCount: 1 },
        { name: "profile_image", maxCount: 1 }
    ]),
    WalletController.submitKyc
);

router.get(
    "/kyc-status",
    authenticateUser,
    WalletController.getKycStatus
);

router.get("/wallet-summary", authenticateUser, WalletController.getWalletSummary);

/**
 * GET /api/payment/qr
 * Public API
 */
router.get("/qr", authenticateUser, WalletController.getPaymentQr);

export default router;
