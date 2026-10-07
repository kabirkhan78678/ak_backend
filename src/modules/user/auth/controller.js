import * as Service from "./service.js";

export const userSignup = async (req, res) => {
  try {
    res.status(201).json({ success: true, data: await Service.userSignup(req.body) });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const userLogin = async (req, res) => {
  try {
    res.json({ success: true, data: await Service.userLogin(req.body) });
  } catch (e) {
    res.status(401).json({ success: false, message: e.message });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    res.json({ success: true, ...(await Service.forgotPassword(req.body)) });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    res.json({ success: true, ...(await Service.resetPassword(req.body)) });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const data = await Service.changePassword(
      req.user.id,     // 👈 logged-in user id
      req.body
    );

    res.json({
      success: true,
      ...data
    });
  } catch (e) {
    res.status(400).json({
      success: false,
      message: e.message
    });
  }
};

export const getProfile = async (req, res) => {
  try {
    const data = await Service.getProfile(req.user.id);
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const data = await Service.updateProfile(
      req.user.id,
      req.body,
      req.files
    );

    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const confirmText = (req.body.confirmation || req.body.confirm || "").trim();
    if (confirmText !== "DELETE") {
      return res.status(400).json({
        success: false,
        message: "Please write 'DELETE' to confirm account deletion"
      });
    }
    const result = await Service.removeUser(req.user.id);
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

