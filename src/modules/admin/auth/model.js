import { getOne, getAll, execute } from "../../../core/db-helper.js";

export const getAdminByEmail = (email) => {
    return getOne(
        "SELECT * FROM admins WHERE email = ? LIMIT 1",
        [email]
    );
};

/**
 * Get current app settings
 */
export const getAppSettingsModel = async () => {
    const sql = `SELECT id, simulator_mode FROM app_settings LIMIT 1`;
    return await getOne(sql);
};

/**
 * Update simulator mode
 */
export const updateSimulatorModeModel = async (mode) => {
    const sql = `UPDATE app_settings SET simulator_mode = ? WHERE id = 1`;
    return await execute(sql, [mode]);
};