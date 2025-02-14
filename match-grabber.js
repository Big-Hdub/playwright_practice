const { chromium, devices } = require('playwright');
const { dayNavigator, dateChecker } = require('./utils');

(async () => {

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({ serviceWorkers: 'block', ...devices['Desktop Chrome'] });
    await context.route('**\/*.{jpg,png,gif,svg,css}', route => route.abort());

    const page = await context.newPage();

    await page.goto('https://www.ncaa.com/scoreboard/volleyball-men/d1/2025/01/01', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    let [month, year] = (await page.locator('[id*="DateNav-header"]').locator('[class="current"]').textContent()).trim().split(' ');
    let day = 1;

    while (dateChecker(month, day, year)) {
        const check = !(await dayNavigator({ page, context, month, year }));
        if (check) break;
        else {
            await page.locator('[class*="datepicker-trigger"]').click({ waitForTimeout: 200 })
            await page.locator('[class*="datepicker-next"]').click({ waitForTimeout: 200 })
            await page.locator('[data-handler="selectDay"]').first().click({ waitForTimeout: 200 })
        }
        [month, year] = (await page.locator('[id*="DateNav-header"]').locator('[class="current"]').textContent()).trim().split(' ');
        day = +(await page.locator('[class*="selected"]').locator('[class*="dayNumber"]').textContent());
    }


    await context.close();
    await browser.close();
    return;
})();
