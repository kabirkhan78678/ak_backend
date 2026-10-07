import {
    getPortfolioService,
    closePortfolioTradeService
} from "./service.js";

export const getPortfolio = async (req, res) => {
    try {
        const data = await getPortfolioService(req.user.id);
        res.json({ success: true, data });
    } catch (e) {
        res.status(400).json({ success: false, message: e.message });
    }
};

export const closePortfolioTrade = async (req, res) => {
    try {
        const data = await closePortfolioTradeService(
            req.user.id,
            req.params.portfolioId
        );
        res.json({ success: true, data });
    } catch (e) {
        res.status(400).json({ success: false, message: e.message });
    }
};
