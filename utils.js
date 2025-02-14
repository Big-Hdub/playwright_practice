const fs = require('fs');

const dayNavigator = async ({ page, context }) => {
    let dateNav = await page.locator(`[class*='hasGames']`).all();

    for (let date of dateNav) {
        await date.click({ waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1000);

        const [month, year] = (await page.locator('[id*="DateNav-header"]').locator('[class="current"]').textContent()).trim().split(' ');
        const day = +(await page.locator('[class*="selected"]').locator('[class*="dayNumber"]').textContent());
        const check = !(dateChecker(month, day, year));
        if (check) return;

        const games = await page.locator(`[id*='game-']>[class='gamePod-link']`).all();
        for (let game of games) {
            await matchScraper({ url: await game.getAttribute('href'), page: await context.newPage() });
        }
    }
}

const matchScraper = async ({ url, page }) => {
    const data = JSON.parse(fs.readFileSync('mensVB.json'));
    if (!data.games) data.games = {};
    if (!data.teams) data.teams = {};
    if (!data.games[url]) {
        data.games[url] = { sets: [], teams: [] };

        await page.goto('https://www.ncaa.com' + url, { waitUntil: 'load' });
        await page.waitForTimeout(500);

        const teams = await page.locator('[class*="team-selector-team"]').all();
        for (let teamStats of teams) {
            await teamStats.click({ waitUntil: 'load' });
            await page.waitForTimeout(500);
            const teamName = (await teamStats.textContent()).trim();
            if (!data.teams[teamName]) data.teams[teamName] = { players: {} };

            const team = { name: teamName, players: {} };
            const table = await page.locator('[class*="boxscore-table_player"] tbody');
            const rows = await table.locator('tr').all();

            for (let row of rows) {
                const stats = [];
                const player = await row.locator('td').all();
                for (let stat of player) {
                    stats.push((await stat.textContent()).trim());
                }
                if (stats[0] === 'Total') break;
                team.players[+stats[0]] = [stats[1], ...stats.slice(2).map(Number)];
                if (!data.teams[teamName].players[stats[0]]) data.teams[teamName].players[stats[0]] = team.players[stats[0]];
                else {
                    for (let i = 2; i < stats.length; i++) {
                        data.teams[teamName].players[stats[0]][i - 1] += +stats[i];
                    }
                    const pStats = data.teams[teamName].players[stats[0]];
                    pStats[5] = (pStats[2] - pStats[3]) / pStats[4];
                }
            }
            data.games[url].teams.push(team);
            console.log(team);
        }

        fs.writeFileSync('mensVB.json', JSON.stringify(data, null, 2), 'utf-8');
    }

    return await page.close();
}

const dateChecker = (month, day, year) => {
    if (typeof month === 'string') month = new Date(Date.parse(month + " 1, 2012")).getMonth() + 1;
    const date = new Date(year, month - 1, day);
    return date < (new Date()).setHours(0, 0, 0, 0);
}

module.exports = { dayNavigator, matchScraper, dateChecker };
