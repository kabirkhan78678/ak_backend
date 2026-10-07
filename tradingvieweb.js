import WebSocket from "ws";
import Table from "cli-table3";

// ===============================
// SYMBOLS
// ===============================
const symbols = [
    "FX_IDC:XAUUSD",
    "FX_IDC:XAGUSD",
    "FX:EURUSD",
    "FX:GBPUSD",
    "FX:USDJPY",
    "FX:AUDUSD",
    "FX:USDCAD",
    "FX:USDCHF",
    "FX:NZDUSD",
    "FX:EURGBP",
    "FX:EURJPY",
    "FX:GBPJPY",
];

// ===============================
// DATA STORE
// ===============================
const marketData = {};

// ===============================
// HELPERS
// ===============================
function clearConsole() {
    process.stdout.write("\x1Bc");
}

function send(ws, msg) {
    ws.send(`~m~${msg.length}~m~${msg}`);
}

function drawTable() {
    clearConsole();

    const table = new Table({
        head: ["SYMBOL", "BID", "ASK", "LAST"],
    });

    for (const s in marketData) {
        table.push([
            s.replace("FX:", "").replace("FX_IDC:", ""),
            marketData[s].bid ?? "-",
            marketData[s].ask ?? "-",
            marketData[s].lp ?? "-",
        ]);
    }

    console.log(table.toString());
}

// ===============================
// WEBSOCKET WITH HEADERS (CRITICAL)
// ===============================
const ws = new WebSocket(
    "wss://data.tradingview.com/socket.io/websocket",
    {
        headers: {
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
            Origin: "https://www.tradingview.com",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "en-US,en;q=0.9",
        },
    }
);

// ===============================
// ON OPEN
// ===============================
ws.on("open", () => {
    console.log("✅ Connected to TradingView");

    send(
        ws,
        JSON.stringify({
            m: "set_auth_token",
            p: ["unauthorized_user_token"],
        })
    );

    send(
        ws,
        JSON.stringify({
            m: "quote_create_session",
            p: ["qs_1"],
        })
    );

    symbols.forEach((s) => {
        send(
            ws,
            JSON.stringify({
                m: "quote_add_symbols",
                p: ["qs_1", s],
            })
        );
    });
});

// ===============================
// ON MESSAGE
// ===============================
ws.on("message", (data) => {
    const msg = data.toString();
    if (!msg.startsWith("~m~")) return;

    const parts = msg.split("~m~");

    for (const part of parts) {
        if (!part || part[0] !== "{") continue;

        let json;
        try {
            json = JSON.parse(part);
        } catch {
            continue;
        }

        if (json.m !== "qsd") continue;

        const payload = json.p[1];
        const symbol = payload.n;
        const values = payload.v || {};

        marketData[symbol] ??= {};

        ["bid", "ask", "lp"].forEach((k) => {
            if (values[k] !== undefined) {
                marketData[symbol][k] = values[k];
            }
        });

        drawTable();
    }
});

// ===============================
// ERROR / CLOSE
// ===============================
ws.on("error", (err) => {
    console.error("❌ WS Error:", err.message);
});

ws.on("close", () => {
    console.log("🔌 Connection closed");
});
