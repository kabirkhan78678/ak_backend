import puppeteer from "puppeteer";
import { scrapeTradingView } from "./tradingview.scraper.js";
import { scrapeGoldSilver } from "./onetradefx.scraper.js";
import { randomNYMEX } from "./random.scraper.js";

const MARKETS = [
    "https://www.tradingview.com/markets/stocks-usa/#hotlist-stocks-widget",
    "https://www.tradingview.com/markets/cryptocurrencies/#trend-symbols",
    "https://www.tradingview.com/markets/currencies/#rates",
    "https://www.tradingview.com/markets/futures/",
];

let browser = null;
let isRunning = false;
let isTickRunning = false;

async function launchBrowser() {
    if (browser) return browser;

    browser = await puppeteer.launch({
        headless: "new",
        protocolTimeout: 120000,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
        ],
    });

    console.log("🟢 Browser Launched");
    return browser;
}

export async function startMarketScraper() {
    if (isRunning) return;
    isRunning = true;

    console.log("🚀 Market Scraper Started");

    setInterval(async () => {
        if (isTickRunning) return;
        isTickRunning = true;

        try {
            const browserInstance = await launchBrowser();

            for (const url of MARKETS) {
                await scrapeTradingView(browserInstance, url);
            }

            await scrapeGoldSilver(browserInstance);
            await randomNYMEX();

        } catch (err) {
            console.error("❌ SCRAPER ERROR:", err.message);

            try {
                if (browser) await browser.close();
            } catch (_) { }

            browser = null;
        } finally {
            isTickRunning = false;
        }
    }, 15000); // every 15 sec
}
