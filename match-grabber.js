const assert = require('node:assert');
const { chromium, devices } = require('playwright');
const { matchScraper } = require('./utils');

(async () => {
    // Setup
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({ serviceWorkers: 'block', ...devices['Desktop Chrome'] });
    await context.route('**\/*.{jpg,png,gif,svg,woff,woff2,ttf,eot,otf,css}', route => route.abort());
    // await context.route('https://sdataprod.ncaa.com/**', route => route.abort());

    const page = await context.newPage();

    await page.goto('https://www.ncaa.com/scoreboard/volleyball-men/d1/2025/01/01', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    let dateNav = await page.locator(`[class*='hasGames']`).all();

    for (let i = 0; i < dateNav.length; i++) {
        await dateNav[i].click();
        await page.waitForTimeout(500);
        // await page.pause();
    }
    // let dateNavLinks = await Promise.all(dateNav.map(async (date) => await date.getAttribute('href')));

    // for (let [i, url] of dateNavLinks.entries()) {

    // }

    // await Promise.all(
    //     dateNav.forEach(async nav => {
    //         console.log(nav);
    //         await nav.click();
    //         await page.waitForTimeout(500);
    //         await page.pause();
    //     })
    // )



    // const noGames = await page.locator(`[id='scoreboardGames']:has-text('No games')`).isVisible();


    // // await page.pause();
    // await matchScraper({ url: '/game/6382727', page: await context.newPage() });


    // Teardown
    await context.close();
    await browser.close();
    return;
})();
