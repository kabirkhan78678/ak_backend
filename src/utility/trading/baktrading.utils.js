import Decimal from "decimal.js";

export const DEFAULT_COMMISSION = new Decimal("0.25");

export const CONTRACT_SIZES = {
    forex: new Decimal("100000"),
    gold: new Decimal("100"),
    crypto: new Decimal("1"),
    silver: new Decimal("5000"),
    stock: new Decimal("1"),
};

export const ASSET_TYPE_MAP = {
    AUDUSD: "forex", EURUSD: "forex", GBPUSD: "forex", USDJPY: "forex",
    BTCUSD: "crypto", ETHUSD: "crypto",
    XAUUSD: "metal", XAGUSD: "metal",
    AAPL: "stock", MSFT: "stock", NVDA: "stock", TSLA: "stock",
};

export const PIP_SIZES = {
    forex: new Decimal("0.0001"),
    gold: new Decimal("0.01"),
    silver: new Decimal("0.001"),
    crypto: new Decimal("0.01"),
    stock: new Decimal("0.01"),
};

export const PIP_VALUE_FACTORS = {
    forex: CONTRACT_SIZES.forex,
    gold: CONTRACT_SIZES.gold,
    silver: CONTRACT_SIZES.silver,
    crypto: CONTRACT_SIZES.crypto,
    stock: CONTRACT_SIZES.stock,
};
