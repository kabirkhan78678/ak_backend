import Decimal from "decimal.js";
import { CONTRACT_SIZES, PIP_SIZES } from "./trading.utils.js";

/* ===== QUANTITY ===== */
export const calcQuantity = (lot, type) =>
    new Decimal(lot).mul(CONTRACT_SIZES[type]);

/* ===== MARGIN ===== */
export const calcUsedMargin = (price, qty, leverage) =>
    new Decimal(price).mul(qty).div(leverage);

/* ===== PIP DIFF (FOREX ONLY) ===== */
export const calcPipDiff = (entry, current, side, type) => {
    const diff =
        side === "buy"
            ? new Decimal(current).minus(entry)
            : new Decimal(entry).minus(current);

    return diff.div(PIP_SIZES[type]);
};
