// Gold & Silver
export const GOLD_SILVER = [
    "FX_IDC:XAUUSD",
    "FX_IDC:XAGUSD",
];


// FOREX
export const FOREX = [
    "FX:EURUSD",
    "FX:GBPUSD",
    "FX:USDJPY",
    "FX:AUDUSD",
    "FX:USDCAD",
    "FX:USDCHF",
    "FX:NZDUSD",
    "FX:EURGBP",
];




// CRYPTO
export const CRYPTO = [
    "BINANCE:BTCUSDT",
    "BINANCE:ETHUSDT",
    "BINANCE:BNBUSDT",
    "BINANCE:XRPUSDT",
    "BINANCE:ADAUSDT",
    "BINANCE:SOLUSDT",
    "BINANCE:DOGEUSDT",
    "BINANCE:MATICUSDT",
    "BINANCE:DOTUSDT",
    "BINANCE:LTCUSDT"
];

// STOCKS
export const STOCKS = [
    "AAPL",
    "MSFT",
    "GOOGL",
    "AMZN",
    "META",
    "TSLA",
    "NVDA",
    "NFLX",
    "AMD",
    "INTC",
    "IBM",
    "ORCL",
    "ADBE",
    "CRM",
    "PYPL",
    "UBER",
    "SHOP",
    "BABA",
    "TCS",
    "INFY"
];

// ALL SYMBOLS
export const ALL_SYMBOLS = [
    ...FOREX,
    ...CRYPTO,
    ...STOCKS,
    ...GOLD_SILVER
];
