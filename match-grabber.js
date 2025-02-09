const assert = require('node:assert');
const { chromium, devices } = require('playwright');

(async () => {
    // Setup
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({ ...devices['Desktop Chrome'] });
    const page = await context.newPage();

    // The actual interesting bit
    await context.route('**.jpg', route => route.abort());
    await page.goto('https://www.ncaa.com/scoreboard/volleyball-men/d1/2025/01/01');

    await page.pause();

    assert(await page.title() === 'NCAA College Scores, Schedule | NCAA.com'); // 👎 not a Web First assertion

    // Teardown
    await context.close();
    await browser.close();
})();
