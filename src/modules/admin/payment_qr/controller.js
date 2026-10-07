import {
    uploadQrService,
    activateQrService,
    listQrService,
    deleteQrService,
    getActiveQrService
} from "./service.js";

/* =========================
   ADMIN → UPLOAD QR
========================= */
export const uploadQrApi = async (req, res) => {
    try {
        if (!req.files || !req.files.image || !req.body.upi_address) {
            throw new Error("QR image & UPI required");
        }

        const imageFile = req.files.image[0];

        await uploadQrService(
            imageFile.filePath,
            req.body.upi_address.trim()
        );

        res.json({
            success: true,
            message: "QR uploaded successfully"
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/* =========================
   ADMIN → LIST QR
========================= */
export const listQrApi = async (req, res) => {
    const data = await listQrService();
    res.json({ success: true, data });
};

/* =========================
   ADMIN → ACTIVATE QR
========================= */
export const activateQrApi = async (req, res) => {
    try {
        await activateQrService(req.params.id);
        res.json({
            success: true,
            message: "QR activated successfully"
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

/* =========================
   ADMIN → DELETE QR
========================= */
export const deleteQrApi = async (req, res) => {
    await deleteQrService(req.params.id);
    res.json({ success: true });
};

/* =========================
   USER → GET ACTIVE QR
========================= */
export const activeQrApi = async (req, res) => {
    const qr = await getActiveQrService();
    res.json({ success: true, data: qr });
};
