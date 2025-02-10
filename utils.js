const fs = require('fs');

const matchScraper = async ({ url, page }) => {
    const data = JSON.parse(fs.readFileSync('mensVB.json'));
    data.welcome = 'Welcome to the match scraper!';
    data.url = url;

    await page.goto('https://www.ncaa.com' + url);
    await page.pause();

    const title = await page.title();

    fs.writeFileSync('mensVB.json', JSON.stringify(data, null, 2), 'utf-8');

    await page.close();

    return title;
}

module.exports = { matchScraper };
