import WebSocket from "ws";
import dotenv from "dotenv";

import { FOREX, GOLD_SILVER, CRYPTO, STOCKS } from "../utility/trading/symbols.js";
import { splitIntoChunks } from "../utility/trading/splitter.js";

import { getOrCreateAsset } from "../services/asset.service.js";
import { upsertPrice } from "../services/price.service.js";
// import { runRiskEngineForAsset } from "../services/risk/risk.service.js";

import { emitMarketUpdate, emitPortfolioUpdate } from "./market.socket.js";
import { getAll } from "../core/db-helper.js";

import { updatePortfolioPrice } from "../services/portfolio.service.js";
import { calculatePnl } from "../utility/trading/pnl.engine.js";

dotenv.config();

let ENGINE_RUNNING = false;
let ENGINE_INTERVAL = null;
let IS_FLUSHING = false;
const ACTIVE_SOCKETS = [];
const ASSET_ID_CACHE = new Map();

/* ===============================
   ENV
================================ */
const FINNHUB_KEYS = process.env.FINNHUB_KEYS?.split(",") || [];
const DEBUG = process.env.DEBUG_MARKET === "true";
const TRADINGVIEW_TOKEN =
    process.env.TRADINGVIEW_TOKEN || "unauthorized_user_token";
const DEADLOCK_RETRY_LIMIT = 2;
const log = (...a) => DEBUG && console.log(...a);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* ===============================
   HELPERS
================================ */
function canonicalFrom(symbol) {
    return symbol
        .replace(/^BINANCE:/i, "")
        .replace(/^FX_IDC:/i, "")
        .replace(/^FX:/i, "")
        .toUpperCase();
}

function isDeadlockError(error) {
    return (
        error?.code === "ER_LOCK_DEADLOCK" ||
        error?.errno === 1213 ||
        /Deadlock found/i.test(error?.message || "")
    );
}

/* ===============================
   SOCKET SYMBOL FORMATTER
================================ */
function socketSymbol(symbol, market) {
    if (market === "forex") return `FOREX:${symbol}`;
    if (market === "crypto") return `BINANCE:${symbol}`;
    if (market === "metal") return `METAL:${symbol}`;
    return symbol; // stocks
}

/* ===============================
   SYMBOL TYPE MAPS
================================ */
const SYMBOL_TYPE = {};
CRYPTO.forEach((s) => (SYMBOL_TYPE[canonicalFrom(s)] = "crypto"));
STOCKS.forEach((s) => (SYMBOL_TYPE[canonicalFrom(s)] = "stock"));

const FOREX_SET = new Set(FOREX.map((s) => canonicalFrom(s)));
const METAL_SET = new Set(["XAUUSD", "XAGUSD"]);

/* ===============================
   BUFFERS
================================ */
const latestTickBySymbol = {};
const lastSavedAt = {};

/* ===============================
   SAVE INTERVAL
================================ */
const SAVE_INTERVAL = {
    forex: 1000,
    metal: 1000,
    crypto: 1000,
    stock: 1500,
};

/* ===============================
   PORTFOLIO PNL HELPER
================================ */
async function getPortfolioSocketUpdates(assetId, price) {
    const rows = await getAll(
        `SELECT
            p.id AS portfolio_id,
            p.user_id,
            p.asset_id,
            p.quantity,
            p.average_price,
            p.side,
            a.symbol
        FROM portfolios p
        JOIN assets a ON a.id = p.asset_id
        WHERE p.asset_id = ?`,
        [assetId]
    );

    return rows.flatMap((row) => {
        const entryPrice = Number(row.average_price);
        const quantity = Number(row.quantity);
        const side =
            row.side === "buy"
                ? "long"
                : row.side === "sell"
                    ? "short"
                    : row.side;

        if (!isFinite(entryPrice) || !isFinite(quantity) || !side) {
            return [];
        }

        const pnl = calculatePnl({
            entryPrice,
            exitPrice: price,
            quantity,
            side,
        });

        const unrealizedPnl = Number(pnl.toFixed(5));

        return [{
            userId: row.user_id,
            payload: {
                portfolio_id: row.portfolio_id,
                asset_id: row.asset_id,
                symbol: row.symbol,
                side,
                entry_price: entryPrice,
                current_price: price,
                price,
                quantity,
                pnl: unrealizedPnl,
                unrealized_pnl: unrealizedPnl,
            },
        }];
    });
}

async function emitPortfolioUpdatesForAsset(assetId, price) {
    const updates = await getPortfolioSocketUpdates(assetId, price);

    for (const update of updates) {
        emitPortfolioUpdate(update.userId, update.payload);
    }
}

async function getCachedAssetId(symbol, market) {
    const cacheKey = `${market}:${symbol}`;

    if (!ASSET_ID_CACHE.has(cacheKey)) {
        ASSET_ID_CACHE.set(cacheKey, getOrCreateAsset(symbol, market));
    }

    try {
        return await ASSET_ID_CACHE.get(cacheKey);
    } catch (error) {
        ASSET_ID_CACHE.delete(cacheKey);
        throw error;
    }
}

async function processSymbolTick(symbol, price, now) {
    let market;
    if (METAL_SET.has(symbol)) market = "metal";
    else if (FOREX_SET.has(symbol)) market = "forex";
    else if (SYMBOL_TYPE[symbol]) market = SYMBOL_TYPE[symbol];
    else market = "crypto";

    if (now - (lastSavedAt[symbol] || 0) < SAVE_INTERVAL[market]) return;

    for (let attempt = 0; attempt <= DEADLOCK_RETRY_LIMIT; attempt++) {
        try {
            const assetId = await getCachedAssetId(symbol, market);
            const portfolioUpdatesPromise = getPortfolioSocketUpdates(assetId, price);
            const persistPromise = Promise.all([
                upsertPrice(assetId, price),
                updatePortfolioPrice(assetId, price),
            ]);

            const socketSym = socketSymbol(symbol, market);
            emitMarketUpdate(socketSym, {
                asset_id: assetId,
                symbol: socketSym,
                price,
                time: now,
            });

            const updates = await portfolioUpdatesPromise;
            for (const update of updates) {
                emitPortfolioUpdate(update.userId, update.payload);
            }

            await persistPromise;

            // Auto-exit disabled for now.
            // if (market !== "metal") {
            //     void runRiskEngineForAsset(assetId).catch((error) => {
            //         console.error("❌ Risk Engine Error:", error?.message ?? error);
            //     });
            // }

            lastSavedAt[symbol] = now;
            log(`[${market}] ${symbol} ${price}`);
            return;
        } catch (e) {
            if (!isDeadlockError(e) || attempt === DEADLOCK_RETRY_LIMIT) {
                throw e;
            }

            await sleep(50 * (attempt + 1));
        }
    }
}

async function flushLatestTicks() {
    if (!ENGINE_RUNNING || IS_FLUSHING) return;

    IS_FLUSHING = true;

    try {
        const now = Date.now();

        for (const symbol in latestTickBySymbol) {
            const tick = latestTickBySymbol[symbol];
            const price = Number(tick.p);

            if (!isFinite(price)) continue;

            try {
                await processSymbolTick(symbol, price, now);
            } catch (e) {
                console.error("❌ Market Engine Error:", e?.message ?? e);
            }
        }
    } finally {
        IS_FLUSHING = false;
    }
}

function startPriceFlusher() {
    if (ENGINE_INTERVAL) return;

    ENGINE_INTERVAL = setInterval(() => {
        void flushLatestTicks();
    }, 500);
}

/* ===============================
   FINNHUB SOCKET (CRYPTO + STOCK)
================================ */
const FINNHUB_GROUPS = splitIntoChunks([...CRYPTO, ...STOCKS], 40);

function startFinnhubSocket(apiKey, symbols, index) {
    if (!ENGINE_RUNNING) return;

    const ws = new WebSocket(`wss://ws.finnhub.io?token=${apiKey}`);
    ACTIVE_SOCKETS.push(ws);

    ws.on("open", () => {
        console.log(`✅ Finnhub Socket ${index + 1} connected`);
        symbols.forEach((s) =>
            ws.send(JSON.stringify({ type: "subscribe", symbol: s }))
        );
    });

    ws.on("message", (raw) => {
        let msg;
        try {
            msg = JSON.parse(raw.toString());
        } catch {
            return;
        }
        if (msg.type !== "trade") return;

        msg.data.forEach((tick) => {
            const canonical = canonicalFrom(tick.s);
            latestTickBySymbol[canonical] ??= { p: null };
            latestTickBySymbol[canonical].p = Number(tick.p);
        });
    });

    // ✅ PREVENT CRASH (429, network, etc.)
    ws.on("error", (err) => {
        console.error("❌ Finnhub WS Error:", err.message);
    });

    // ✅ DO NOT RECONNECT IF ENGINE STOPPED
    ws.on("close", () => {
        if (!ENGINE_RUNNING) return;
        setTimeout(() => startFinnhubSocket(apiKey, symbols, index), 10000);
    });
}

/* ===============================
   TRADINGVIEW SOCKET (FOREX + METAL)
================================ */
const TRADINGVIEW_CHUNK_SIZE = 60;

function sendTradingView(ws, msg) {
    ws.send(`~m~${msg.length}~m~${msg}`);
}

function startTradingViewSocket(symbols, index) {
    if (!ENGINE_RUNNING) return;

    const ws = new WebSocket(
        "wss://data.tradingview.com/socket.io/websocket",
        {
            headers: {
                "User-Agent": "Mozilla/5.0",
                Origin: "https://www.tradingview.com",
            },
        }
    );

    ACTIVE_SOCKETS.push(ws);

    ws.on("open", () => {
        sendTradingView(
            ws,
            JSON.stringify({ m: "set_auth_token", p: [TRADINGVIEW_TOKEN] })
        );
        sendTradingView(ws, JSON.stringify({ m: "quote_create_session", p: ["qs"] }));
        symbols.forEach((s) =>
            sendTradingView(ws, JSON.stringify({ m: "quote_add_symbols", p: ["qs", s] }))
        );
    });

    ws.on("message", (data) => {
        const msg = data.toString();
        if (!msg.startsWith("~m~")) return;

        msg.split("~m~").forEach((part) => {
            if (!part || part[0] !== "{") return;
            let json;
            try {
                json = JSON.parse(part);
            } catch {
                return;
            }
            if (json.m !== "qsd") return;

            const payload = json.p[1];
            const v = payload.v || {};

            let price;
            if (v.lp !== undefined) price = v.lp;
            else if (v.bid && v.ask) price = (v.bid + v.ask) / 2;
            if (price === undefined) return;

            const canonical = canonicalFrom(payload.n);
            latestTickBySymbol[canonical] ??= { p: null };
            latestTickBySymbol[canonical].p = Number(price);
        });
    });

    // ✅ PREVENT CRASH
    ws.on("error", (err) => {
        console.error("❌ TradingView WS Error:", err.message);
    });

    // ✅ STOP MEANS STOP
    ws.on("close", () => {
        if (!ENGINE_RUNNING) return;
        setTimeout(() => startTradingViewSocket(symbols, index), 10000);
    });
}

/* ===============================
   BOOTSTRAP
================================ */
export const startMarketEngine = () => {
    if (ENGINE_RUNNING) {
        console.log("⚠️ Market Engine already running");
        return;
    }

    ENGINE_RUNNING = true;
    console.log("🚀 Market Engine Started");

    startPriceFlusher(); // ✅ THIS WAS MISSING

    FINNHUB_GROUPS.forEach((symbols, i) => {
        if (FINNHUB_KEYS[i]) startFinnhubSocket(FINNHUB_KEYS[i], symbols, i);
    });

    const tvSymbols = Array.from(new Set([...FOREX, ...GOLD_SILVER]));
    splitIntoChunks(tvSymbols, TRADINGVIEW_CHUNK_SIZE).forEach((symbols, i) =>
        startTradingViewSocket(symbols, i)
    );
};

export const stopMarketEngine = () => {
    console.log("🛑 Stopping Market Engine...");

    ENGINE_RUNNING = false;

    if (ENGINE_INTERVAL) {
        clearInterval(ENGINE_INTERVAL);
        ENGINE_INTERVAL = null;
    }

    for (const ws of ACTIVE_SOCKETS) {
        try {
            ws.close();
        } catch { }
    }

    ACTIVE_SOCKETS.length = 0;
    ASSET_ID_CACHE.clear();

    console.log("✅ Market Engine Fully Stopped");
};
