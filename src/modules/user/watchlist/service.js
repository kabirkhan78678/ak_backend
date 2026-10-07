import {
    getOrCreateWatchlist,
    addAssetToWatchlist,
    removeAssetFromWatchlist,
    getWatchlistAssets,
    getAllAssets
} from "./model.js";

/* ADD ASSET */
export const addAssetService = async (uid, assetId) => {
    if (!assetId) throw new Error("asset_id required");

    const wl = await getOrCreateWatchlist(uid);
    await addAssetToWatchlist(wl.id, assetId);

    return { asset_id: assetId };
};

/* REMOVE ASSET */
export const removeAssetService = async (uid, assetId) => {
    if (!assetId) throw new Error("asset_id required");

    const wl = await getOrCreateWatchlist(uid);
    await removeAssetFromWatchlist(wl.id, assetId);
};

/* GET USER WATCHLIST */
export const getWatchlistService = async (uid) => {
    const wl = await getOrCreateWatchlist(uid);
    return await getWatchlistAssets(wl.id);
};

/* GET ALL ASSETS */
export const getAllAssetsService = async () => {
    return await getAllAssets();
};
