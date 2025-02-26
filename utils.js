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
        let awayName;

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
            await page.waitForTimeout(1000);

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
            const ms = team.matchStats;

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
                ms.assists += +stats[7];
                ms.aces += +stats[8];
                ms.serveErrors += +stats[9];
                ms.receiveError += +stats[10];
                ms.digs += +stats[11];
                ms.blockSolo += +stats[12];
                ms.blockAssist += +stats[13];
                ms.blockError += +stats[14];
                ms.ballHandlingError += +stats[15];
                ms.earnedPoints += +stats[16];
                ts.assists += +stats[7];
                ts.aces += +stats[8];
                ts.serveErrors += +stats[9];
                ts.receiveError += +stats[10];
                ts.digs += +stats[11];
                ts.blockSolo += +stats[12];
                ts.blockAssist += +stats[13];
                ts.blockError += +stats[14];
                ts.ballHandlingError += +stats[15];
                ts.earnedPoints += +stats[16];
            }

            const setRows = (await page.locator('[class*="boxscore-table_set"] tbody tr').all());
            for (let row of setRows) {
                let set = await row.locator('td').all();
                set = await Promise.all(set.map(async stat => (+((await stat.textContent()).trim()))));

                if (away) data.games[url].sets.away[+set[0]] = set.slice(1);
                else data.games[url].sets.home[+set[0]] = set.slice(1);

                ms.setsPlayed++;
                ms.kills += +(set[1]);
                ms.errors += +(set[2]);
                ms.totalAttacks += +(set[3]);
                ts.setsPlayed++;
                ts.kills += +(set[1]);
                ts.errors += +(set[2]);
                ts.totalAttacks += +(set[3]);
            }

            ms.killsPerSet = Math.round((ms.kills / ms.setsPlayed) * 100) / 100;
            ms.hittingPercentage = Math.round(((ms.kills - ms.errors) / ms.totalAttacks) * 1000) / 1000;
            ms.assistsPerSet = Math.round((ms.assists / ms.setsPlayed) * 100) / 100;
            ms.acesPerSet = Math.round((ms.aces / ms.setsPlayed) * 100) / 100;
            ms.digsPerSet = Math.round((ms.digs / ms.setsPlayed) * 100) / 100;
            ms.blocksPerSet = Math.round(((ms.blockSolo + (ms.blockAssist / 2)) / ms.setsPlayed) * 100) / 100;
            ms.earnedPointsPerSet = Math.round((ms.earnedPoints / ms.setsPlayed) * 100) / 100;
            ms.errorsPerSet = Math.round((ms.errors + ms.blockError + ms.ballHandlingError / ms.setsPlayed) * 100) / 100;
            ts.killsPerSet = Math.round((ts.kills / ts.setsPlayed) * 1000) / 1000;
            ts.hittingPercentage = Math.round(((ts.kills - ts.errors) / ts.totalAttacks) * 1000) / 1000;
            ts.assistsPerSet = Math.round((ts.assists / ts.setsPlayed) * 1000) / 100;
            ts.acesPerSet = Math.round((ts.aces / ts.setsPlayed) * 100) / 100;
            ts.digsPerSet = Math.round((ts.digs / ts.setsPlayed) * 100) / 100;
            ts.blocksPerSet = Math.round(((ts.blockSolo + (ts.blockAssist / 2)) / ts.setsPlayed) * 100) / 100;
            ts.earnedPointsPerSet = Math.round((ts.earnedPoints / ts.setsPlayed) * 100) / 100;
            ts.errorsPerSet = Math.round((ts.errors + ts.blockError + ts.ballHandlingError / ts.setsPlayed) * 100) / 100;
            ts.matchesPlayed++;

            if (away) {
                ms.setWins = scores.away[scores.away.length - 1];
                ms.setLosses = scores.home[scores.home.length - 1];
                ms.setWinPercentage = ms.setWins / ms.setsPlayed;
                ts.setWins += scores.away[scores.away.length - 1];
                ts.setLosses += +(scores.home[scores.home.length - 1]);
                ts.setWinPercentage = ts.setWins / ts.setsPlayed;
                if ((scores.away[scores.away.length - 1]) === 3) ts.matchWins++;
                else ts.matchLosses++;
                awayTeam = team;
                awayName = teamName;
                away = false;
            } else {
                ms.setWins = scores.home[scores.home.length - 1];
                ms.setLosses = scores.away[scores.away.length - 1];
                ms.setWinPercentage = ms.setWins / ms.setsPlayed;
                ts.setWins += (scores.home[scores.home.length - 1]);
                ts.setLosses += (scores.away[scores.away.length - 1]);
                ts.setWinPercentage = ts.setWins / ts.setsPlayed;
                if ((scores.home[scores.home.length - 1]) === 3) ts.matchWins++;
                else ts.matchLosses++;
                ts.matchWinPercentage = ts.matchWins / ts.matchesPlayed;

                const awayMs = awayTeam.matchStats;
                ms.opponentKills = awayMs.kills;
                ms.opponentErrors = awayMs.errors;
                ms.opponentTotalAttacks = awayMs.totalAttacks;
                ms.opponentHittingPercentage = awayMs.hittingPercentage;
                ms.opponentAces = awayMs.aces;
                ts.opponentKills += awayMs.kills;
                ts.opponentErrors += awayMs.errors;
                ts.opponentTotalAttacks += awayMs.totalAttacks;
                ts.opponentAces += awayMs.aces;
                ts.opponentHittingPercentage = Math.round(((ts.kills - ts.errors) / ts.totalAttacks) * 1000) / 1000;
                awayMs.opponentKills = ms.kills;
                awayMs.opponentErrors = ms.errors;
                awayMs.opponentTotalAttacks = ms.totalAttacks;
                awayMs.opponentHittingPercentage = ms.hittingPercentage;
                awayMs.opponentAces = ms.aces;
                const awayTs = data.teams[awayName].teamStats;
                awayTs.opponentKills += ms.kills;
                awayTs.opponentErrors += ms.errors;
                awayTs.opponentTotalAttacks += ms.totalAttacks;
                awayTs.opponentAces += ms.aces;
                awayTs.opponentHittingPercentage = Math.round(((awayTs.kills - awayTs.errors) / awayTs.totalAttacks) * 1000) / 1000;
            }
            data.games[url].teams.push(team);
            ts.matches.push(url);
            ts.matchWinPercentage = ts.matchWins / ts.matchesPlayed
        }
        fs.writeFileSync('./data/mensVB.json', JSON.stringify(data, null, 2), 'utf-8');
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
