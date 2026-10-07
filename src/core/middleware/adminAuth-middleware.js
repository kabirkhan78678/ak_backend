import jwt from "jsonwebtoken";
import { getOne } from "../db-helper.js";

/* =====================================================
   ADMIN AUTH MIDDLEWARE (FIXED)
===================================================== */
export const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];

    if (!authHeader) {
      return res.status(401).json({
        status: false,
        message: "No token provided"
      });
    }

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res.status(401).json({
        status: false,
        message: "Invalid token format"
      });
    }

    const token = parts[1];

    // 🔐 verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({
        status: false,
        message: "Invalid or expired token"
      });
    }

    const adminId = decoded.admin_id;

    // ✅ CORRECT SQL USAGE
    const admin = await getOne(
      "SELECT * FROM admins WHERE id = ? LIMIT 1",
      [adminId]
    );

    if (!admin) {
      return res.status(401).json({
        status: false,
        message: "Admin not found"
      });
    }

    if (admin.status !== "active") {
      return res.status(403).json({
        status: false,
        message: "Admin account inactive"
      });
    }

    req.admin = admin;
    next();

  } catch (error) {
    console.error("🔥 Admin Auth Error:", error.message);
    return res.status(500).json({
      status: false,
      message: "Internal server error"
    });
  }
};
