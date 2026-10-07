import { saveAssetPrice } from "../config/asset.service.js";

const URL = "https://onetradefx.com:8000/admin/trading_view/";
const GOLD = "Gold Spot / U.S. Dollar";
const SILVER = "Silver / U.S. Dollar";

export async function scrapeGoldSilver(browser) {
    const page = await browser.newPage();

    try {
        await page.goto(URL, {
            waitUntil: "domcontentloaded",
            timeout: 60000,
        });

        await page.waitForSelector("body", { timeout: 60000 });

        const data = await page.evaluate((gold, silver) => {
            const find = (title) => {
                const h2 = [...document.querySelectorAll("h2")]
                    .find(h => h.title === title);

                if (!h2) return null;

                const box = h2.closest(".tv-widget-chart__head-container");
                return {
                    price: box?.querySelector(".symbol-last")?.innerText,
                    change: box?.querySelector("#delta-pt")?.innerText,
                };
            };

            return {
                XAUUSD: find(gold),
                XAGUSD: find(silver),
            };
        }, GOLD, SILVER);

        for (const [symbol, rec] of Object.entries(data)) {
            if (!rec?.price) continue;

            await saveAssetPrice(
                symbol,
                parseFloat(rec.price.replace(/,/g, "")),
                rec.change
            );
        }

        console.log("🥇 Gold/Silver updated");
    } catch (err) {
        console.error("GoldSilver scrape error:", err.message);
        throw err;
    } finally {
        await page.close();
    }
}
