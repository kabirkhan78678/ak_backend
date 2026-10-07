import {
    fetchAllKycAdmin,
    processKycAdmin
} from "./service.js";

/* =========================
   ADMIN → GET ALL KYC
========================= */
export const getAllKycAdminApi = async (req, res) => {
    try {
        const data = await fetchAllKycAdmin();

        res.status(200).json({
            success: true,
            total: data.length,
            data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/* =========================
   ADMIN → APPROVE / REJECT KYC
========================= */
export const kycActionAdminApi = async (req, res) => {
    try {
        const kycId = req.params.id;
        const { action } = req.body; // approved | rejected

        await processKycAdmin(kycId, action);

        res.json({
            success: true,
            message: `KYC ${action} successfully`
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};
