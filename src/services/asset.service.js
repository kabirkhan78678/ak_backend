// src/services/asset.service.js
import db from "../config/db.js";

export async function getOrCreateAsset(symbol, type) {
    const result = await db.query(
        `
    INSERT INTO assets (symbol, name, type, created_at)
    VALUES (?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE
      id = LAST_INSERT_ID(id)
    `,
        [
            symbol,
            symbol.replace(":", " "),
            type
        ]
    );

    return result.insertId;
}
