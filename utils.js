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
    const data = JSON.parse(fs.readFileSync('./data/mensVB.json'));
    if (!data.games) data.games = {};
    if (!data.teams) data.teams = {};
    if (!data.games[url]) {
        data.games[url] = { sets: { away: {}, home: {} }, teams: [] };

        await page.goto('https://www.ncaa.com' + url, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1000);

        const teams = await page.locator('[class*="team-selector-team"]').all();
        let away = true;
        let awayTeam = {};

        const awayScoresRow = await page.locator('tr[class*="linescore-team-away"]').first();
        const homeScoresRow = await page.locator('tr[class*="linescore-team-home"]').first();
        const awayScores = await awayScoresRow.locator('td').all();
        const homeScores = await homeScoresRow.locator('td').all();
        const scores = { away: [], home: [] };
        for (let score of awayScores.slice(1)) {
            scores.away.push(+(await score.textContent()).trim());
        }
        for (let score of homeScores.slice(1)) {
            scores.home.push(+(await score.textContent()).trim());
        }


        for (let teamStats of teams) {
            await teamStats.click({ waitUntil: 'load' });
            await page.waitForTimeout(500);

            let ts;
            const teamName = (await teamStats.textContent()).trim();
            if (!data.teams[teamName]) {
                data.teams[teamName] = { players: {}, teamStats: statObjectCreator(), }
                ts = data.teams[teamName].teamStats;
                ts.matches = [];
                ts.matchWins = 0;
                ts.matchLosses = 0;
                ts.matchWinPercentage = 0;
                ts.matchesPlayed = 0;
            };
            ts = data.teams[teamName].teamStats;

            const team = { name: teamName, players: {}, matchStats: statObjectCreator() };

            const table = await page.locator('[class*="boxscore-table_player"] tbody');
            const playerRows = await table.locator('tr').all();

            for (let row of playerRows) {
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
                team.matchStats.assists += +stats[7];
                team.matchStats.aces += +stats[8];
                team.matchStats.serveErrors += +stats[9];
                team.matchStats.receiveError += +stats[10];
                team.matchStats.digs += +stats[11];
                team.matchStats.blockSolo += +stats[12];
                team.matchStats.blockAssist += +stats[13];
                team.matchStats.blockError += +stats[14];
                team.matchStats.ballHandlingError += +stats[15];
                team.matchStats.earnedPoints += +stats[16];
                data.teams[teamName].teamStats.assists += +stats[7];
                data.teams[teamName].teamStats.aces += +stats[8];
                data.teams[teamName].teamStats.serveErrors += +stats[9];
                data.teams[teamName].teamStats.receiveError += +stats[10];
                data.teams[teamName].teamStats.digs += +stats[11];
                data.teams[teamName].teamStats.blockSolo += +stats[12];
                data.teams[teamName].teamStats.blockAssist += +stats[13];
                data.teams[teamName].teamStats.blockError += +stats[14];
                data.teams[teamName].teamStats.ballHandlingError += +stats[15];
                data.teams[teamName].teamStats.earnedPoints += +stats[16];
            }

            const setRows = (await page.locator('[class*="boxscore-table_set"] tbody tr').all());
            for (let row of setRows) {
                let set = await row.locator('td').all();
                set = await Promise.all(set.map(async stat => (+((await stat.textContent()).trim()))));

                if (away) data.games[url].sets.away[+set[0]] = set.slice(1);
                else data.games[url].sets.home[+set[0]] = set.slice(1);

                team.matchStats.setsPlayed++;
                team.matchStats.kills += +(set[1]);
                team.matchStats.errors += +(set[2]);
                team.matchStats.totalAttacks += +(set[3]);
                data.teams[teamName].teamStats.setsPlayed++;
                data.teams[teamName].teamStats.kills += +(set[1]);
                data.teams[teamName].teamStats.errors += +(set[2]);
                data.teams[teamName].teamStats.totalAttacks += +(set[3]);
            }

            team.matchStats.killsPerSet = Math.round(((team.matchStats.kills / team.matchStats.setsPlayed) * 100) / 100)
            team.matchStats.hittingPercentage = Math.round(((team.matchStats.kills - team.matchStats.errors) / team.matchStats.totalAttacks) * 1000) / 1000;
            team.matchStats.assistsPerSet = Math.round(((team.matchStats.assists / team.matchStats.setsPlayed) * 100) / 100);
            team.matchStats.acesPerSet = Math.round(((team.matchStats.aces / team.matchStats.setsPlayed) * 100) / 100)
            team.matchStats.digsPerSet = Math.round(((team.matchStats.digs / team.matchStats.setsPlayed) * 100) / 100)
            team.matchStats.blocksPerSet = Math.round((((team.matchStats.blockSolo + team.matchStats.blockAssist) - team.matchStats.blockError / team.matchStats.setsPlayed) * 100) / 100);
            team.matchStats.earnedPointsPerSet = Math.round(((team.matchStats.earnedPoints / team.matchStats.setsPlayed) * 100) / 100);
            team.matchStats.errorsPerSet = Math.round(((team.matchStats.errors + team.matchStats.blockError + team.matchStats.ballHandlingError / team.matchStats.setsPlayed) * 100) / 100);
            data.teams[teamName].teamStats.killsPerSet = Math.round(((data.teams[teamName].teamStats.kills / data.teams[teamName].teamStats.setsPlayed) * 100) / 100);
            data.teams[teamName].teamStats.hittingPercentage = Math.round(((data.teams[teamName].teamStats.kills - data.teams[teamName].teamStats.errors) / data.teams[teamName].teamStats.totalAttacks) * 1000) / 1000;
            data.teams[teamName].teamStats.assistsPerSet = Math.round(((data.teams[teamName].teamStats.assists / data.teams[teamName].teamStats.setsPlayed) * 100) / 100);
            data.teams[teamName].teamStats.acesPerSet = Math.round(((data.teams[teamName].teamStats.aces / data.teams[teamName].teamStats.setsPlayed) * 100) / 100);
            data.teams[teamName].teamStats.digsPerSet = Math.round(((data.teams[teamName].teamStats.digs / data.teams[teamName].teamStats.setsPlayed) * 100) / 100);
            data.teams[teamName].teamStats.blocksPerSet = Math.round((((data.teams[teamName].teamStats.blockSolo + data.teams[teamName].teamStats.blockAssist) - data.teams[teamName].teamStats.blockError / data.teams[teamName].teamStats.setsPlayed) * 100) / 100);
            data.teams[teamName].teamStats.earnedPointsPerSet = Math.round(((data.teams[teamName].teamStats.earnedPoints / data.teams[teamName].teamStats.setsPlayed) * 100) / 100);
            data.teams[teamName].teamStats.errorsPerSet = Math.round(((data.teams[teamName].teamStats.errors + data.teams[teamName].teamStats.blockError + data.teams[teamName].teamStats.ballHandlingError / data.teams[teamName].teamStats.setsPlayed) * 100) / 100);
            data.teams[teamName].teamStats.matchesPlayed++;

            if (away) {
                team.matchStats.setWins = scores.away[scores.away.length - 1];
                team.matchStats.setLosses = scores.home[scores.home.length - 1];
                team.matchStats.setWinPercentage = team.matchStats.setWins / team.matchStats.setsPlayed;
                data.teams[teamName].teamStats.setWins += scores.away[scores.away.length - 1];
                data.teams[teamName].teamStats.setLosses += +(scores.home[scores.home.length - 1]);
                data.teams[teamName].teamStats.setWinPercentage = data.teams[teamName].teamStats.setWins / data.teams[teamName].teamStats.setsPlayed;
                if ((scores.away[scores.away.length - 1]) === 3) data.teams[teamName].teamStats.matchWins++;
                else data.teams[teamName].teamStats.matchLosses++;
                awayTeam = team;
                away = false;
            } else {
                team.matchStats.setWins = scores.home[scores.home.length - 1];
                team.matchStats.setLosses = scores.away[scores.away.length - 1];
                team.matchStats.setWinPercentage = team.matchStats.setWins / team.matchStats.setsPlayed;
                data.teams[teamName].teamStats.setWins += (scores.home[scores.home.length - 1]);
                data.teams[teamName].teamStats.setLosses += (scores.away[scores.away.length - 1]);
                data.teams[teamName].teamStats.setWinPercentage = data.teams[teamName].teamStats.setWins / data.teams[teamName].teamStats.setsPlayed;
                if ((scores.home[scores.home.length - 1]) === 3) data.teams[teamName].teamStats.matchWins++;
                else data.teams[teamName].teamStats.matchLosses++;
                data.teams[teamName].teamStats.matchWinPercentage = data.teams[teamName].teamStats.matchWins / data.teams[teamName].teamStats.matchesPlayed;
            }
            data.games[url].teams.push(team);
            data.teams[teamName].teamStats.matches.push(url);
            data.teams[teamName].teamStats.matchWinPercentage = data.teams[teamName].teamStats.matchWins / data.teams[teamName].teamStats.matchesPlayed
        }
        fs.writeFileSync('./data/mensVB.json', JSON.stringify(data, null, 2), 'utf-8');
        await page.pause();
    }

    return await page.close();
}

const dateChecker = (month, day, year) => {
    if (typeof month === 'string') month = new Date(Date.parse(month + " 1, 2012")).getMonth() + 1;
    const date = new Date(year, month - 1, day);
    return date < (new Date()).setHours(0, 0, 0, 0);
}

const statObjectCreator = (stats) => {
    return {
        setsPlayed: 0,
        setWins: 0,
        setLosses: 0,
        setWinPercentage: 0,
        kills: 0,
        killsPerSet: 0,
        errors: 0,
        totalAttacks: 0,
        hittingPercentage: 0,
        assists: 0,
        assistsPerSet: 0,
        aces: 0,
        serveErrors: 0,
        acesPerSet: 0,
        receiveError: 0,
        digs: 0,
        digsPerSet: 0,
        blockSolo: 0,
        blockAssist: 0,
        blockError: 0,
        blocksPerSet: 0,
        earnedPoints: 0,
        earnedPointsPerSet: 0,
        opponentKills: 0,
        opponentErrors: 0,
        opponentTotalAttacks: 0,
        opponentHittingPercentage: 0,
        opponentAces: 0,
        ballHandlingError: 0,
        errorsPerSet: 0,
    }
}



module.exports = { dayNavigator, matchScraper, dateChecker };
