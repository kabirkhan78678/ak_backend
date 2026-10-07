import {
    getAllKycRequests,
    getKycById,
    updateKycStatus
} from "./model.js";

/* =========================
   FETCH ALL KYC
========================= */
export const fetchAllKycAdmin = async () => {
    return await getAllKycRequests();
};

/* =========================
   APPROVE / REJECT KYC
========================= */
export const processKycAdmin = async (kycId, action) => {
    if (!["approved", "rejected"].includes(action)) {
        throw new Error("Invalid KYC action");
    }

    const kyc = await getKycById(kycId);
    if (!kyc) throw new Error("KYC record not found");

    if (kyc.is_verified === 1 || kyc.is_rejected === 1) {
        throw new Error("KYC already processed");
    }

    const isVerified = action === "approved" ? 1 : 0;
    const isRejected = action === "rejected" ? 1 : 0;

    await updateKycStatus(kycId, isVerified, isRejected);

    return true;
};
