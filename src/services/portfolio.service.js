import { execute } from "../core/db-helper.js";

export const updatePortfolioPrice = async (assetId, price) => {
    await execute(
        `UPDATE portfolios 
         SET current_price = ?
         WHERE asset_id = ?`,
        [price, assetId]
    );
};