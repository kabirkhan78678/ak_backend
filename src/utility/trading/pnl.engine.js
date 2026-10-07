import Decimal from "decimal.js";

export const calculatePnl = ({ entryPrice, exitPrice, quantity, side }) => {

    if (
        entryPrice === undefined ||
        exitPrice === undefined ||
        quantity === undefined ||
        !side
    ) {
        throw new Error("Invalid PnL input");
    }

    const entry = new Decimal(entryPrice);
    const exit = new Decimal(exitPrice);
    const qty = new Decimal(quantity);

    const diff =
        side === "long"
            ? exit.minus(entry)
            : entry.minus(exit);

    return diff.mul(qty);
};
