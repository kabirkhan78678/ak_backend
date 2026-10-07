export async function scrapeTradingView(browser, url) {
    const page = await browser.newPage();

    try {
        await page.setViewport({ width: 1366, height: 768 });
        await page.setDefaultNavigationTimeout(120000);

        await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 60000,
        });

        await page.waitForSelector("body", { timeout: 60000 });

        const data = await page.evaluate(() => ({
            title: document.title,
            time: new Date().toISOString(),
        }));

        console.log("📊 TradingView scraped:", data.title);

        return data;
    } catch (err) {
        console.error("TradingView scrape error:", err.message);
        throw err;
    } finally {
        await page.close(); // 🔥 mandatory
    }
}
