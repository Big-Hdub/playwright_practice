const assert = require('node:assert');
const { chromium, devices } = require('playwright');
const { matchScraper } = require('./utils');

(async () => {
    // Setup
    const browser = await chromium.launch();
    const context = await browser.newContext({ serviceWorkers: 'block', ...devices['Desktop Chrome'] });
    await context.route('**\/*.{jpg,png,gif,svg,css}', route => route.abort());

    const page = await context.newPage();

    await page.goto('https://www.ncaa.com/scoreboard/volleyball-men/d1/2025/01/01', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    let dateNav = await page.locator(`[class*='hasGames']`).all();

    for (let date of dateNav) {
        await date.click({ waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1000);

        const games = await page.locator(`[id*='game-']>[class='gamePod-link']`).all();
        for (let game of games) {
            await matchScraper({ url: await game.getAttribute('href'), page: await context.newPage() });
        }
    }


    // Teardown
    await context.close();
    await browser.close();
    return;
})();
