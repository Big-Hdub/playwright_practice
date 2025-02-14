const fs = require('fs');

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
                team.players[+stats[0]] = [stats[1], ...stats.slice(2).map(Number)];
                if (stats[0] === 'Total') continue;
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
        }
        console.log(data);

        fs.writeFileSync('mensVB.json', JSON.stringify(data, null, 2), 'utf-8');
    }

    return await page.close();
}

module.exports = { matchScraper };
