import db from "./db.js";   // ✅ CORRECT
import { emitMarketUpdate } from "../sockets/market.socket.js";

export async function saveAssetPrice(symbol, price, changePct) {
    const rows = await db.query(
        "SELECT id FROM assets WHERE symbol = ? LIMIT 1",
        [symbol]
    );

    const asset = rows[0];
    if (!asset) return;

    await db.query(
        `
    INSERT INTO asset_prices (asset_id, price, change_pct, last_updated)
    VALUES (?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE
      price = VALUES(price),
      change_pct = VALUES(change_pct),
      last_updated = NOW()
    `,
        [asset.id, price, changePct]
    );

    // 🔥 SOCKET EMIT
    emitMarketUpdate({
        symbol,
        price,
        change_pct: changePct,
        last_updated: new Date().toISOString(),
    });
}
