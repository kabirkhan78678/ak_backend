import { placeTradeService, closeTradeService, getTradesService } from "./service.js";

export const placeTrade = async (req, res) => {
    try {
        const data = await placeTradeService(req.user.id, req.body);
        res.json({ success: true, data });
    } catch (e) {
        res.status(400).json({ success: false, message: e.message });
    }
};


// controller.js
export const closeTrade = async (req, res) => {
    try {
        const data = await closeTradeService(
            req.user.id,
            req.params.id // portfolio_id
        );
        res.json({ success: true, data });
    } catch (e) {
        res.status(400).json({ success: false, message: e.message });
    }
};

export const getTrades = async (req, res) => {
    try {
        const data = await getTradesService(req.user.id, req.query);
        res.json({ success: true, data });
    } catch (e) {
        res.status(400).json({ success: false, message: e.message });
    }
};