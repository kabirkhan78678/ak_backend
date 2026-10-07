import {
    insertQr,
    getAllQr,
    deactivateAllQr,
    activateQrById,
    deleteQr,
    getActiveQr
} from "./model.js";

/* =========================
   UPLOAD QR
========================= */
export const uploadQrService = async (imagePath, upi) => {
    if (!imagePath || !upi) {
        throw new Error("QR image & UPI required");
    }

    await insertQr(imagePath, upi);
};

/* =========================
   ACTIVATE QR (ONLY ONE)
========================= */
export const activateQrService = async (qrId) => {
    await deactivateAllQr();
    await activateQrById(qrId);
    return true;
};

/* =========================
   LIST QR (ADMIN)
========================= */
export const listQrService = async () => {
    return await getAllQr();
};

/* =========================
   DELETE QR
========================= */
export const deleteQrService = async (id) => {
    await deleteQr(id);
};

/* =========================
   GET ACTIVE QR (USER)
========================= */
export const getActiveQrService = async () => {
    return await getActiveQr();
};
