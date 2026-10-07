import {
    fetchAllWalletsAdmin,
    editWalletAdminService
} from "./service.js";

/* ================================
   GET ALL USER WALLETS
================================ */
export const getAllWalletsAdminApi = async (req, res) => {
    try {
        const data = await fetchAllWalletsAdmin();
        res.json({ success: true, total: data.length, data });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

/* ================================
   EDIT WALLET
================================ */
export const editWalletAdminApi = async (req, res) => {
    try {
        await editWalletAdminService(req.params.id, req.body);
        res.json({
            success: true,
            message: "Wallet updated successfully"
        });
    } catch (e) {
        res.status(400).json({ success: false, message: e.message });
    }
};
