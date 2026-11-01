const should = require('should');
const { deriveDateKeys, fitOffsetsInAppDay } = require('../lib/dateKeys.js');

/*
    The bug these guard against: the session boundary tests used to read the day,
    week and month off `new Date()`, i.e. the runner's clock, while the aggregator
    writes into the app's timezone. The two agree most of the day, so the suite only
    failed in the window where they fall on different calendar dates - between 21:00
    and 24:00 UTC for the app default (Europe/Istanbul, UTC+3) on UTC runners.

    Rather than wait for that window, these pin instants where the two provably
    disagree, in both directions.
*/
describe('date keys follow the app timezone, not the runner clock', function() {
    it('uses the next day for an app east of UTC late in the UTC day', function() {
        //22:40 UTC is 01:40 the next day in Istanbul - the instant CI actually failed on
        const ts = Date.parse('2026-08-11T22:40:00Z');
        new Date(ts).getUTCDate().should.equal(11);
        deriveDateKeys(ts, 'Europe/Istanbul').day.should.equal('12');
    });

    it('uses the previous day for an app west of UTC early in the UTC day', function() {
        const ts = Date.parse('2026-08-13T04:54:00Z');
        new Date(ts).getUTCDate().should.equal(13);
        deriveDateKeys(ts, 'Pacific/Midway').day.should.equal('12');
    });

    it('agrees with UTC when the app is on UTC', function() {
        const ts = Date.parse('2026-08-11T22:40:00Z');
        deriveDateKeys(ts, 'UTC').day.should.equal('11');
    });

    it('rolls the month over with the app timezone', function() {
        //23:30 UTC on the last of the month is already the 1st in Kiritimati
        const ts = Date.parse('2026-08-31T23:30:00Z');
        deriveDateKeys(ts, 'UTC').monthKey.should.equal('8');
        deriveDateKeys(ts, 'Pacific/Kiritimati').monthKey.should.equal('9');
    });

    it('derives the week the way common.initTimeObj does', function() {
        const ts = Date.parse('2026-08-11T12:00:00Z');
        const m = require('moment-timezone').tz(ts, 'UTC');
        deriveDateKeys(ts, 'UTC').weekKey.should.equal('w' + Math.ceil(m.dayOfYear() / 7));
    });

    it('refuses to guess when no timezone is given', function() {
        let message = null;
        try {
            deriveDateKeys(Date.now(), null);
        }
        catch (e) {
            message = e.message;
        }
        String(message).should.match(/app timezone/);
    });
});

/*
    Backdating by hours and asserting on "today" is a different failure from reading
    the runner clock: moving the app to the runner's timezone only moves the window
    to the hours after UTC midnight. fitOffsetsInAppDay closes it; these pin it at
    the instants CI fails on.
*/
describe('backdated offsets stay inside the app day', function() {
    const moment = require('moment-timezone');
    const HOURS = [3 * 3600, 2 * 3600, 3600];

    function dayOf(ts, timezone) {
        return moment.tz(ts, timezone).format('YYYY-MM-DD');
    }

    it('leaves the offsets alone when the app day is old enough', function() {
        const now = Date.parse('2026-09-30T12:00:00Z');
        fitOffsetsInAppDay(now, 'Europe/Istanbul', HOURS, 420).should.eql({offsets: HOURS, waitMs: 0});
    });

    it('fits them at 22:30 UTC for an Istanbul app (01:30 the next day there)', function() {
        const now = Date.parse('2026-09-30T22:30:00Z');
        //the unfitted 3h offset is the failure: it lands on the previous app day
        dayOf(now - HOURS[0] * 1000, 'Europe/Istanbul').should.not.equal(dayOf(now, 'Europe/Istanbul'));
        const fit = fitOffsetsInAppDay(now, 'Europe/Istanbul', HOURS, 420);
        fit.waitMs.should.equal(0);
        fit.offsets.forEach(function(o) {
            dayOf(now - o * 1000, 'Europe/Istanbul').should.equal(dayOf(now, 'Europe/Istanbul'));
            o.should.be.aboveOrEqual(420);
        });
        //same order as asked for, oldest first
        fit.offsets[0].should.be.above(fit.offsets[1]);
        fit.offsets[1].should.be.above(fit.offsets[2]);
    });

    it('fits them at 00:30 UTC for a UTC+0 app, where moving the timezone alone would fail', function() {
        const now = Date.parse('2026-10-01T00:30:00Z');
        const fit = fitOffsetsInAppDay(now, 'Africa/Abidjan', HOURS, 420);
        fit.offsets.forEach(function(o) {
            dayOf(now - o * 1000, 'Africa/Abidjan').should.equal('2026-10-01');
        });
    });

    it('asks to wait when the app day is too young to hold them at all', function() {
        const now = Date.parse('2026-10-01T00:05:00Z');
        const fit = fitOffsetsInAppDay(now, 'Africa/Abidjan', HOURS, 420);
        should(fit.offsets).be.null();
        fit.waitMs.should.be.above(0);
        const later = fitOffsetsInAppDay(now + fit.waitMs, 'Africa/Abidjan', HOURS, 420);
        later.offsets.should.have.length(3);
        later.offsets.forEach(function(o) {
            dayOf(now + fit.waitMs - o * 1000, 'Africa/Abidjan').should.equal('2026-10-01');
        });
    });
});
