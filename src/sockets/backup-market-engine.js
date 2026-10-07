import WebSocket from "ws";
import dotenv from "dotenv";

import { FOREX, GOLD_SILVER, CRYPTO, STOCKS } from "../utility/trading/symbols.js";
import { splitIntoChunks } from "../utility/trading/splitter.js";

import { getOrCreateAsset } from "../services/asset.service.js";
import { upsertPrice } from "../services/price.service.js";
import { runRiskEngineForAsset } from "../services/risk/risk.service.js";

import { emitMarketUpdate, emitPortfolioUpdate } from "./market.socket.js";
import { getAll } from "../core/db-helper.js";

dotenv.config();

/* ===============================
   ENV
================================ */
const FINNHUB_KEYS = process.env.FINNHUB_KEYS?.split(",") || [];
const DEBUG = process.env.DEBUG_MARKET === "true";
const TRADINGVIEW_TOKEN =
    process.env.TRADINGVIEW_TOKEN || "unauthorized_user_token";
const log = (...a) => DEBUG && console.log(...a);

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
async function calculatePortfolioPnl(userId, assetId, price) {
    const rows = await getAll(
        `SELECT quantity, average_price, side
     FROM portfolios
     WHERE user_id=? AND asset_id=?`,
        [userId, assetId]
    );

    let pnl = 0;

    for (const r of rows) {
        const entry = Number(r.average_price);
        const qty = Number(r.quantity);
        if (!isFinite(entry) || !isFinite(qty)) continue;

        const isLong = r.side === "buy" || r.side === "long";
        pnl += isLong ? (price - entry) * qty : (entry - price) * qty;
    }

    return Number(pnl.toFixed(5));
}

/* ===============================
   PRICE FLUSHER
================================ */
setInterval(async () => {
    const now = Date.now();

    for (const symbol in latestTickBySymbol) {
        const tick = latestTickBySymbol[symbol];
        const price = Number(tick.p);

        if (!isFinite(price)) continue;

        let market;
        if (METAL_SET.has(symbol)) market = "metal";
        else if (FOREX_SET.has(symbol)) market = "forex";
        else if (SYMBOL_TYPE[symbol]) market = SYMBOL_TYPE[symbol];
        else market = "crypto";

        if (now - (lastSavedAt[symbol] || 0) < SAVE_INTERVAL[market]) continue;

        try {
            /* ===============================
               DB ASSET (metal stays metal)
            ================================ */
            const assetId = await getOrCreateAsset(symbol, market);
            await upsertPrice(assetId, price);

            /* ===============================
               SOCKET PRICE UPDATE
            ================================ */
            const socketSym = socketSymbol(symbol, market);
            emitMarketUpdate(socketSym, {
                asset_id: assetId,
                symbol: socketSym,
                price,
                time: now,
            });

            /* ===============================
               PORTFOLIO SOCKET UPDATE
            ================================ */
            const users = await getAll(
                `SELECT DISTINCT user_id FROM portfolios WHERE asset_id=?`,
                [assetId]
            );

            for (const u of users) {
                const pnl = await calculatePortfolioPnl(u.user_id, assetId, price);
                emitPortfolioUpdate(u.user_id, {
                    asset_id: assetId,
                    symbol,
                    price,
                    pnl,
                });
            }

            /* ===============================
               RISK ENGINE
               (metals handled separately)
            ================================ */
            if (market !== "metal") {
                await runRiskEngineForAsset(assetId);
            }

            lastSavedAt[symbol] = now;
            log(`[${market}] ${symbol} ${price}`);
        } catch (e) {
            console.error("❌ Market Engine Error:", e?.message ?? e);
        }
    }
}, 500);

/* ===============================
   FINNHUB SOCKET (CRYPTO + STOCK)
================================ */
const FINNHUB_GROUPS = splitIntoChunks([...CRYPTO, ...STOCKS], 40);

function startFinnhubSocket(apiKey, symbols, index) {
    const ws = new WebSocket(`wss://ws.finnhub.io?token=${apiKey}`);

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
            latestTickBySymbol[canonical] ??= { p: null, sources: {} };
            latestTickBySymbol[canonical].p = Number(tick.p);
        });
    });

    ws.on("close", () => {
        setTimeout(() => startFinnhubSocket(apiKey, symbols, index), 3000);
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
    const ws = new WebSocket(
        "wss://data.tradingview.com/socket.io/websocket",
        {
            headers: {
                "User-Agent": "Mozilla/5.0",
                Origin: "https://www.tradingview.com",
            },
        }
    );

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
            const rawSymbol = payload.n;
            const v = payload.v || {};

            let price;
            if (v.lp !== undefined) price = v.lp;
            else if (v.bid && v.ask) price = (v.bid + v.ask) / 2;
            if (price === undefined) return;

            const canonical = canonicalFrom(rawSymbol);
            latestTickBySymbol[canonical] ??= { p: null, sources: {} };
            latestTickBySymbol[canonical].p = Number(price);
        });
    });

    ws.on("close", () => {
        setTimeout(() => startTradingViewSocket(symbols, index), 3000);
    });
}

/* ===============================
   BOOTSTRAP
================================ */
export const startMarketEngine = () => {
    console.log("🚀 Market Engine Started");

    FINNHUB_GROUPS.forEach((symbols, i) => {
        if (FINNHUB_KEYS[i]) startFinnhubSocket(FINNHUB_KEYS[i], symbols, i);
    });

    const tvSymbols = Array.from(new Set([...FOREX, ...GOLD_SILVER]));
    splitIntoChunks(tvSymbols, TRADINGVIEW_CHUNK_SIZE).forEach((symbols, i) =>
        startTradingViewSocket(symbols, i)
    );
};
