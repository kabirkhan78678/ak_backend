import express from "express";
import { authenticateAdmin } from "../../../core/middleware/adminAuth-middleware.js";
import { localUploaderFields } from "../../../utility/upload/multerUpload.js";
import {
    uploadQrApi,
    listQrApi,
    activateQrApi,
    deleteQrApi,
    activeQrApi
} from "./controller.js";

const router = express.Router();

/* ========= ADMIN ROUTES ========= */
router.post(
    "/payment-qr",
    authenticateAdmin,
    localUploaderFields("uploads/qr", [
        { name: "image", maxCount: 1 }
    ]),
    uploadQrApi
);

router.get("/payment-qr", authenticateAdmin, listQrApi);
router.patch("/payment-qr/:id", authenticateAdmin, activateQrApi);
router.delete("/payment-qr/:id", authenticateAdmin, deleteQrApi);

/* ========= USER ROUTE ========= */
router.get("/payment-qr/active", activeQrApi);

export default router;
