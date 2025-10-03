const moment = require('moment');
const should = require('should');

const StatsJob = require('../api/jobs/stats.js');

const allData = {};

for (let count = 0; count < 12; count += 1) {
    const utcM = moment.utc();
    utcM.subtract(count, 'month');

    allData[utcM.format('YYYY:M')] = 1000;
}

describe('Stats job', () => {
    it('Generates data summary', () => {
        const { all, avg, month3 } = StatsJob.generateDataSummary(allData);
        console.log('All Data:', allData);
        console.log('Data Summary:');
        console.log(`- All: ${all}`);
        console.log(`- Avg: ${avg}`);
        console.log(`- Month 3: ${month3}`);

        should(all).equal(12000);
        should(avg).equal(1000);

        const expectedMonth3 = [];
        for (let count = 0; count < 3; count += 1) {
            const utcM = moment.utc();
            utcM.subtract(count, 'month');

            expectedMonth3.push(`${utcM.format('YYYY:M')} - 1000`);
        }

        should(month3).eql(expectedMonth3);
    });

    it('Generates data monthly', () => {
        const monthlyData = StatsJob.generateDataMonthly(allData);
        console.log('All Data:', allData);
        console.log(monthlyData);

        should(monthlyData['DPAvg6months']).equal(1000);
        should(monthlyData['DPAvg12months']).equal(1000);

        const expectedDP = [];
        for (let count = 0; count < 12; count += 1) {
            const utcM = moment.utc();
            utcM.subtract(count, 'month');

            const idx = count < 9 ? `0${count + 1}` : `${count + 1}`;

            expectedDP.push(`${idx}. ${utcM.format('MMM YYYY')}: ${(1000).toLocaleString()}`);
        }

        should(monthlyData.DP).eql(expectedDP);
    });
});
