import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  getAdminByEmail, getAppSettingsModel,
  updateSimulatorModeModel,
} from "./model.js";

export const loginAdmin = async ({ email, password }) => {
  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  const admin = await getAdminByEmail(email);
  if (!admin) throw new Error("Invalid email or password");

  if (admin.status !== "active") {
    throw new Error("Admin account inactive");
  }

  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch) throw new Error("Invalid email or password");

  const token = jwt.sign(
    { admin_id: admin.id, role: "admin" },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  // 🔒 REMOVE PASSWORD BEFORE RETURN
  delete admin.password;

  return { token, admin };
};


/**
 * Get config (frontend ke liye)
 */
export const getAppConfigService = async () => {
  const settings = await getAppSettingsModel();

  if (!settings) {
    throw new Error("App settings not found");
  }

  return {
    simulator_mode: settings.simulator_mode,
  };
};

/**
 * Toggle simulator mode (admin ke liye)
 */
export const toggleSimulatorModeService = async (mode) => {
  if (typeof mode !== "boolean") {
    throw new Error("Invalid mode value");
  }

  await updateSimulatorModeModel(mode);

  return {
    message: `Mode switched to ${mode ? "SIMULATOR" : "REAL"}`,
  };
};