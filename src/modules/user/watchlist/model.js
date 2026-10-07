import { getOne, getAll, execute } from "../../../core/db-helper.js";

/* GET OR CREATE WATCHLIST */
export const getOrCreateWatchlist = async (uid) => {
    let wl = await getOne(
        `SELECT * FROM watchlists WHERE user_id=?`,
        [uid]
    );

    if (!wl) {
        const res = await execute(
            `INSERT INTO watchlists (user_id, name) VALUES (?, ?)`,
            [uid, "My Watchlist"]
        );

        wl = {
            id: res.insertId,
            user_id: uid
        };
    }

    return wl;
};

/* ADD ASSET */
export const addAssetToWatchlist = (watchlistId, assetId) =>
    execute(
        `INSERT IGNORE INTO watchlist_items (watchlist_id, asset_id)
         VALUES (?, ?)`,
        [watchlistId, assetId]
    );

/* REMOVE ASSET */
export const removeAssetFromWatchlist = (watchlistId, assetId) =>
    execute(
        `DELETE FROM watchlist_items WHERE watchlist_id=? AND asset_id=?`,
        [watchlistId, assetId]
    );

/* GET WATCHLIST ASSETS */
export const getWatchlistAssets = (watchlistId) =>
    getAll(
        `
        SELECT 
            a.id,
            a.symbol,
            a.name,
            a.type,
            ap.price,
            ap.change_pct,
            ap.last_updated
        FROM watchlist_items wi
        JOIN assets a ON a.id = wi.asset_id
        LEFT JOIN asset_prices ap ON ap.asset_id = a.id
        WHERE wi.watchlist_id=?
        ORDER BY wi.created_at DESC
        `,
        [watchlistId]
    );

/* GET ALL ASSETS (FOR ADD TO WATCHLIST SCREEN) */
export const getAllAssets = () =>
    getAll(
        `
        SELECT 
            a.id,
            a.symbol,
            a.name,
            a.type,
            ap.price,
            ap.change_pct
        FROM assets a
        LEFT JOIN asset_prices ap ON ap.asset_id = a.id
        ORDER BY a.symbol ASC
        `
    );
