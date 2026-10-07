// src/services/price.service.js
import db from "../config/db.js";

export async function upsertPrice(assetId, price) {
    await db.query(
        `
    INSERT INTO asset_prices (asset_id, price, last_updated)
    VALUES (?, ?, NOW())
    ON DUPLICATE KEY UPDATE
      price = VALUES(price),
      last_updated = NOW()
    `,
        [assetId, price]
    );
}
