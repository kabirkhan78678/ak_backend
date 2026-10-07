import Decimal from "decimal.js";

export const D = (value, name = "value") => {
    if (value === undefined || value === null || value === "") {
        throw new Error(`${name} is missing`);
    }
    return new Decimal(value);
};
