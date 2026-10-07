import {
    loginAdmin, getAppConfigService,
    toggleSimulatorModeService,
} from "./service.js";

/* ===== ADMIN LOGIN API ===== */
export const adminLoginApi = async (req, res) => {
    try {
        const { token, admin } = await loginAdmin(req.body);

        res.status(200).json({
            success: true,
            message: "Admin login successful",
            token,
            admin
        });

    } catch (err) {
        res.status(401).json({
            success: false,
            message: err.message
        });
    }
};

/**
 * GET /app-config
 */
export const getAppConfigController = async (req, res) => {
    try {
        const data = await getAppConfigService();

        return res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * POST /admin/toggle-mode
 */
export const toggleModeController = async (req, res) => {
    try {
        const { simulator_mode } = req.body;

        const data = await toggleSimulatorModeService(simulator_mode);

        return res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
