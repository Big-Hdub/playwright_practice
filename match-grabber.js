const assert = require('node:assert');
const { chromium, devices } = require('playwright');

(async () => {
    // Setup
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({ serviceWorkers: 'block', ...devices['Desktop Chrome'] });
    await context.route('**\/*.{jpg,png,gif,svg,woff,woff2,ttf,eot,otf,css}', route => route.abort());
    await context.route('https://sdataprod.ncaa.com/**', route => route.abort());

    const page = await context.newPage();

    await page.goto('https://www.ncaa.com/scoreboard/volleyball-men/d1/2025/01/01');

    await page.pause();

    assert(await page.title() === 'NCAA College Scores, Schedule | NCAA.com');

    // Teardown
    await context.close();
    await browser.close();
})();
