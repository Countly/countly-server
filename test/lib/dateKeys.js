var moment = require('moment-timezone');

/**
 * Date keys for the buckets the API writes aggregated data into.
 *
 * These are derived from the *app's* timezone (common.initTimeObj gets app.timezone),
 * not from the clock of whatever machine happens to be running the tests. A test that
 * reads them off `new Date()` therefore asserts on the wrong bucket whenever the runner
 * and the app are on different calendar dates, which on UTC CI runners is every
 * evening for any app east of UTC.
 *
 * @param {number} timestampMs - instant to derive from, in milliseconds
 * @param {string} timezone - the app's timezone
 * @returns {object} year, month, day, monthKey and weekKey as the API writes them
 */
function deriveDateKeys(timestampMs, timezone) {
    if (!timezone) {
        throw new Error('deriveDateKeys needs the app timezone; the local clock is not the same thing');
    }
    var m = moment.tz(timestampMs, timezone);
    return {
        year: m.year(),
        month: m.month() + 1,
        day: m.date() + '',
        monthKey: (m.month() + 1) + '',
        //matches common.initTimeObj: weekly = ceil(day-of-year / 7)
        weekKey: 'w' + Math.ceil(m.dayOfYear() / 7)
    };
}

/**
 * Read an app's timezone from its document, for deriveDateKeys.
 *
 * Reads the DB rather than an endpoint and throws instead of falling back: the
 * timezone is the whole point of the assertions that use it, so a lookup that
 * quietly defaulted would reinstate the bug it exists to prevent.
 *
 * @param {object} db - the test DB connection (testUtils.db)
 * @param {string} appId - the app's _id
 * @returns {Promise<string>} the app's timezone
 */
async function resolveAppTimezone(db, appId) {
    var app = await db.collection('apps').findOne({_id: db.ObjectID(appId + '')}, {projection: {timezone: 1}});
    if (!app || !app.timezone) {
        throw new Error('Could not resolve the timezone of app ' + appId);
    }
    return app.timezone;
}

/**
 * Fit backdated "seconds ago" offsets inside the app's current day.
 *
 * A test that backdates requests by hours and then asserts on "today" only holds
 * while the app's day is older than the oldest offset. Moving the app to another
 * timezone just moves that window; this removes it. Offsets that already fit come
 * back unchanged. Otherwise they are spread, in the same order, between
 * `minOffset` and one minute after the app's midnight. When the day is too young
 * to hold even that, `waitMs` says how long until it is.
 *
 * @param {number} nowMs - current instant, in milliseconds
 * @param {string} timezone - the app's timezone
 * @param {number[]} offsets - seconds before now, any order
 * @param {number} minOffset - smallest offset allowed after fitting, to stay behind requests sent closer to now
 * @returns {object} {offsets: number[]|null, waitMs: number}
 */
function fitOffsetsInAppDay(nowMs, timezone, offsets, minOffset) {
    var margin = 60;
    var sinceMidnight = Math.floor((nowMs - moment.tz(nowMs, timezone).startOf('day').valueOf()) / 1000);
    var ceiling = sinceMidnight - margin;
    var max = Math.max.apply(null, offsets);
    var min = Math.min.apply(null, offsets);
    if (max <= ceiling) {
        return {offsets: offsets.slice(), waitMs: 0};
    }
    if (ceiling - minOffset < offsets.length) {
        return {offsets: null, waitMs: (minOffset + offsets.length + margin + 1 - sinceMidnight) * 1000};
    }
    return {
        offsets: offsets.map(function(o) {
            return max === min ? ceiling : Math.round(minOffset + (o - min) / (max - min) * (ceiling - minOffset));
        }),
        waitMs: 0
    };
}

module.exports = {
    deriveDateKeys: deriveDateKeys,
    resolveAppTimezone: resolveAppTimezone,
    fitOffsetsInAppDay: fitOffsetsInAppDay
};
