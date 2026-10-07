import { Server } from "socket.io";
import { getAll } from "../core/db-helper.js";
import { calculatePnl } from "../utility/trading/pnl.engine.js";

let io;

function canonicalSymbol(symbol = "") {
    return String(symbol)
        .replace(/^BINANCE:/i, "")
        .replace(/^FOREX:/i, "")
        .replace(/^METAL:/i, "")
        .replace(/^FX_IDC:/i, "")
        .replace(/^FX:/i, "")
        .toUpperCase();
}

function socketSymbol(symbol, type) {
    if (type === "forex") return `FOREX:${symbol}`;
    if (type === "crypto") return `BINANCE:${symbol}`;
    if (type === "metal" || type === "gold" || type === "silver") {
        return `METAL:${symbol}`;
    }
    return symbol;
}

async function getWatchlistSnapshots(symbols) {
    const canonical = [...new Set(symbols.map(canonicalSymbol).filter(Boolean))];
    if (!canonical.length) return [];

    const placeholders = canonical.map(() => "?").join(",");
    const rows = await getAll(
        `
        SELECT
            a.id AS asset_id,
            a.symbol,
            a.type,
            ap.price,
            ap.last_updated
        FROM assets a
        LEFT JOIN asset_prices ap ON ap.asset_id = a.id
        WHERE UPPER(a.symbol) IN (${placeholders})
        `,
        canonical
    );

    return rows
        .filter((row) => row.price !== null && row.price !== undefined)
        .map((row) => ({
            asset_id: row.asset_id,
            symbol: socketSymbol(row.symbol, row.type),
            price: Number(row.price),
            time: row.last_updated
                ? new Date(row.last_updated).getTime()
                : Date.now(),
        }));
}

async function getPortfolioSnapshots(userId) {
    const rows = await getAll(
        `
        SELECT
            p.id AS portfolio_id,
            p.user_id,
            p.asset_id,
            p.quantity,
            p.average_price,
            p.current_price,
            p.side,
            a.symbol
        FROM portfolios p
        JOIN assets a ON a.id = p.asset_id
        WHERE p.user_id = ?
        `,
        [userId]
    );

    return rows
        .filter((row) => row.current_price !== null && row.current_price !== undefined)
        .map((row) => {
            const currentPrice = Number(row.current_price);
            const pnl = calculatePnl({
                entryPrice: row.average_price,
                exitPrice: currentPrice,
                quantity: row.quantity,
                side: row.side,
            });
            const unrealizedPnl = Number(pnl.toFixed(5));

            return {
                portfolio_id: row.portfolio_id,
                asset_id: row.asset_id,
                symbol: row.symbol,
                side: row.side,
                entry_price: Number(row.average_price),
                current_price: currentPrice,
                price: currentPrice,
                quantity: Number(row.quantity),
                pnl: unrealizedPnl,
                unrealized_pnl: unrealizedPnl,
            };
        });
}

export function initSocket(server) {
    io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    io.on("connection", (socket) => {
        console.log("🟢 Market socket connected:", socket.id);

        /* ===============================
   WATCHLIST ROOM JOIN (BULLETPROOF)
=============================== */
        socket.on("join_watchlist", async (payload) => {
            let symbols = payload;

            // ✅ CASE 1: single symbol string ("AAPL")
            if (typeof symbols === "string") {
                symbols = [symbols];
            }

            // ✅ CASE 2: object { symbols: [...] }
            if (!Array.isArray(symbols) && Array.isArray(payload?.symbols)) {
                symbols = payload.symbols;
            }

            // ❌ invalid payload
            if (!Array.isArray(symbols)) {
                console.error(
                    "❌ join_watchlist expects ARRAY, received:",
                    payload
                );
                return;
            }

            symbols.forEach((symbol) => {
                if (!symbol) return;
                socket.join(`watch_${symbol}`);
            });

            try {
                const snapshots = await getWatchlistSnapshots(symbols);
                snapshots.forEach((snapshot) => {
                    socket.emit("price_update", snapshot);
                });
            } catch (error) {
                console.error("❌ join_watchlist snapshot error:", error?.message ?? error);
            }

            console.log("📡 Joined watchlist rooms:", symbols.length);
        });

        /* ===============================
           PORTFOLIO ROOM JOIN
        =============================== */
        socket.on("join_portfolio", async (userId) => {
            if (!userId) {
                console.error("❌ join_portfolio missing userId");
                return;
            }

            const room = `portfolio_${userId}`;
            socket.join(room);

            try {
                const snapshots = await getPortfolioSnapshots(userId);
                snapshots.forEach((snapshot) => {
                    socket.emit("portfolio_update", snapshot);
                });
            } catch (error) {
                console.error("❌ join_portfolio snapshot error:", error?.message ?? error);
            }

            console.log(`📊 Joined portfolio room: ${room}`);
        });

        socket.on("disconnect", () => {
            console.log("🔴 Market socket disconnected:", socket.id);
        });
    });
}

/* ===============================
   MARKET PRICE BROADCAST
================================ */
export function emitMarketUpdate(symbol, payload) {
    if (!io || !symbol) return;

    const room = `watch_${symbol}`;

    // console.log("📤 EMIT PRICE UPDATE:", room, payload);

    io.to(room).emit("price_update", payload);
}

/* ===============================
   PORTFOLIO UPDATE BROADCAST
================================ */
export function emitPortfolioUpdate(userId, payload) {
    if (!io || !userId) return;

    const room = `portfolio_${userId}`;
    io.to(room).emit("portfolio_update", payload);
}
