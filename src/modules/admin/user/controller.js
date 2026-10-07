import { fetchAllUsersAdmin, fetchSingleUserAdmin, updateUserLeverageAdmin, fetchAllAssetSpreadsAdmin, updateAssetSpreadAdmin, deleteUserService } from "./service.js";


/**
 * ADMIN → GET ALL USERS
 */
export const getAllUsersAdminApi = async (req, res) => {
    try {
        const data = await fetchAllUsersAdmin();

        return res.status(200).json({
            success: true,
            message: "All users fetched successfully",
            ...data
        });

    } catch (error) {
        console.error("🔥 Admin Users Error:", error.message);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * GET SINGLE USER (ADMIN)
 */
export const getSingleUserAdminApi = async (req, res) => {
    try {
        const userId = req.params.id;

        const user = await fetchSingleUserAdmin(userId);

        return res.status(200).json({
            success: true,
            data: user
        });

    } catch (error) {
        console.error("🔥 Get Single User Error:", error.message);
        return res.status(404).json({
            success: false,
            message: error.message
        });
    }
};


/* ================================
   GET ALL ASSETS SPREAD
================================ */
export const getAllAssetSpreadsAdminApi = async (req, res) => {
    try {
        const data = await fetchAllAssetSpreadsAdmin();
        res.json({
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

/* ================================
   UPDATE ASSET SPREAD
================================ */
export const updateAssetSpreadAdminApi = async (req, res) => {
    try {
        await updateAssetSpreadAdmin(req.params.id, req.body);
        res.json({
            success: true,
            message: "Asset updated successfully"
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const updateUserLeverageAdminApi = async (req, res) => {
    try {
        const data = await updateUserLeverageAdmin(
            req.params.id,
            req.body.leverage
        );

        return res.status(200).json({
            success: true,
            message: "User leverage updated successfully",
            data
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

export const deleteUserByAdmin = async (req, res) => {
    try {
        const adminId = req.admin.id; // from adminAuth
        const userId = req.params.userId;

        await deleteUserService(adminId, userId);

        return res.json({
            success: true,
            message: "User deleted successfully"
        });

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};