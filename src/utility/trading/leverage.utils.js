// import Decimal from "decimal.js";

// export const parseLeverage = (leverage) => {
//     if (!leverage) {
//         throw new Error("Leverage missing");
//     }

//     // If format is "1:100"
//     if (typeof leverage === "string" && leverage.includes(":")) {
//         const parts = leverage.split(":");
//         if (!parts[1]) throw new Error("Invalid leverage format");
//         return new Decimal(parts[1]);
//     }

//     // If already numeric or numeric string
//     return new Decimal(leverage);
// };

import Decimal from "decimal.js";

export const parseLeverage = (leverage) => {
    if (!leverage) {
        throw new Error("Leverage missing");
    }

    // "1:1000" -> 1000
    if (typeof leverage === "string" && leverage.includes(":")) {
        const parts = leverage.split(":");
        if (!parts[1]) throw new Error("Invalid leverage format");
        return new Decimal(parts[1]);
    }

    return new Decimal(leverage);
};

