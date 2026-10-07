import * as Service from "./service.js";
import { getWalletSummaryService, getPaymentQrService, getKycStatusService } from "./service.js";

export const createDeposit = async (req, res) => {
  try {

    const screenshot = req.files?.screenshot?.[0]?.path || null;

    const data = await Service.createDeposit(
      req.user.id,
      req.body,
      screenshot
    );

    res.json({ success: true, ...data });

  } catch (e) {
    res.status(400).json({
      success: false,
      message: e.message
    });
  }
};

export const requestWithdraw = async (req, res) => {
  try {
    const data = await Service.requestWithdraw(req.user.id, req.body);
    res.json({ success: true, ...data });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const transactionHistory = async (req, res) => {
  try {
    const data = await Service.transactionHistory(req.user.id, req.query);
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const submitKyc = async (req, res) => {
  try {
    const files = req.files;
    const data = await Service.submitKyc(req.user.id, files);
    res.json({ success: true, ...data });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};


export const getWalletSummary = async (req, res) => {
  try {
    const data = await getWalletSummaryService(req.user.id);
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({
      success: false,
      message: e.message
    });
  }
};


export const getPaymentQr = async (req, res) => {
  try {
    const data = await getPaymentQrService();
    res.json({ success: true, data });
  } catch (e) {
    res.status(404).json({
      success: false,
      message: e.message
    });
  }
};

export const getKycStatus = async (req, res) => {
  try {
    const data = await getKycStatusService(req.user.id);
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({
      success: false,
      message: e.message
    });
  }
};