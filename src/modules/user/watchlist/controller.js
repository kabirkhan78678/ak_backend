import {
    addAssetService,
    removeAssetService,
    getWatchlistService,
    getAllAssetsService
} from "./service.js";

export const addAsset = async (req, res) => {
    try {
        const data = await addAssetService(req.user.id, req.body.asset_id);
        res.json({ success: true, data });
    } catch (e) {
        res.status(400).json({ success: false, message: e.message });
    }
};

export const removeAsset = async (req, res) => {
    try {
        await removeAssetService(req.user.id, req.body.asset_id);
        res.json({ success: true, message: "Asset removed" });
    } catch (e) {
        res.status(400).json({ success: false, message: e.message });
    }
};

export const getWatchlist = async (req, res) => {
    try {
        const data = await getWatchlistService(req.user.id);
        res.json({ success: true, data });
    } catch (e) {
        res.status(400).json({ success: false, message: e.message });
    }
};

export const getAllAssets = async (req, res) => {
    try {
        const data = await getAllAssetsService();
        res.json({ success: true, data });
    } catch (e) {
        res.status(400).json({ success: false, message: e.message });
    }
};
