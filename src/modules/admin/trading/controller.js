import {
    fetchAllPortfoliosAdmin,
    updatePortfolioAdmin,
    fetchAllTradesAdmin,
    editTradeAdminService
} from "./service.js";

/* ================================
   GET ALL PORTFOLIO
================================ */
export const getAllPortfolioAdminApi = async (req, res) => {
    try {
        const data = await fetchAllPortfoliosAdmin();
        res.json({ success: true, total: data.length, data });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

/* ================================
   UPDATE PORTFOLIO PRICE
================================ */
export const updatePortfolioAdminApi = async (req, res) => {
    try {
        await updatePortfolioAdmin(req.params.id, req.body.price);
        res.json({ success: true, message: "Portfolio updated" });
    } catch (e) {
        res.status(400).json({ success: false, message: e.message });
    }
};

/* ================================
   GET ALL TRADES
================================ */
export const getAllTradesAdminApi = async (req, res) => {
    try {
        const data = await fetchAllTradesAdmin();
        res.json({ success: true, total: data.length, data });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

/* ================================
   UPDATE TRADE VALUES
================================ */
export const editTradeAdminApi = async (req, res) => {
    try {
        await editTradeAdminService(req.params.id, req.body);

        res.json({
            success: true,
            message: "Trade updated successfully"
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};
