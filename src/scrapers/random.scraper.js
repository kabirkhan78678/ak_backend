import { saveAssetPrice } from "../config/asset.service.js";

let last = 5.0;

export async function randomNYMEX() {
    const delta = (Math.random() - 0.5) * 0.25;
    const price = +(last + delta).toFixed(3);
    const change = `${((delta / last) * 100).toFixed(2)}%`;

    last = price;

    await saveAssetPrice("NYMEX-NG1!", price, change);
    console.log("🔥 NYMEX updated");
}
