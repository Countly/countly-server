// const job = require("../parts/jobs/job.js");
const Job = require("../../jobServer/Job");
const crypto = require("crypto");
const countlyApi = {
    data: {
        fetch: require("../parts/data/fetch.js"),
        lib: require("../lib/countly.model.js"),
        common: require("../lib/countly.common.js")
    }
};
const countlyEvents = countlyApi.data.lib.load("event");
const countlyCommon = countlyApi.data.common;
const common = require('../utils/common.js');
const log = require('../utils/log.js')('job:topEvents');

/** Class for job of top events widget **/
class TopEventsJob extends Job {

    /**
     * TopEvents initialize function
     */
    async init() {
        return this.getAllApps();
    }

    /**
     * Events collections.
     * @param {Object} params - event, id.
     * @return {string} event collection.
     */
    eventsCollentions(params) {
        const { event, id } = params;
        const eventName = `${event}${id}`;
        return `events${crypto.createHash("sha1").update(eventName).digest("hex")}`;
    }

    /**
     * If the event's name include [CLY], removed them.
     * @param {array} eventsData - events list.
     * @return {array} filtered data.
     */
    eventsFilter(eventsData) {
        return eventsData.filter(l => !l.includes('[CLY]'));
    }

    /**
     * 
     * @param {object} params  - params object
     * @param {object} data  - object where to collect data
     * @param {boolean} previous  - if fetching for previous period
     * @returns {Promise} promise
     */
    async fetchEventTotalCounts(params, data, previous) {
        let collectionName = "all";
        params.qstring.segmentation = "key";
        return await new Promise((resolve) => {
            countlyApi.data.fetch.getTimeObjForEvents("events_data", params, {'id_prefix': params.app_id + "_" + collectionName + '_'}, function(doc) {
                countlyEvents.setDb(doc || {});

                var dd = countlyEvents.getSegmentedData(params.qstring.segmentation);
                for (var z = 0; z < dd.length;z++) {
                    var key = dd[z]._id;
                    data[key] = data[key] || {};
                    data[key].data = data[key].data || {};
                    data[key].data.count = data[key].data.count || {"total": 0, "prev-total": 0, "change": "NA", "trend": "u"};
                    if (previous) {
                        data[key].data.count["prev-total"] = dd[z].c;
                    }
                    else {
                        data[key].data.count.total = dd[z].c;
                    }

                    data[key].data.sum = data[key].data.sum || {"total": 0, "prev-total": 0, "change": "NA", "trend": "u"};
                    if (previous) {
                        data[key].data.sum["prev-total"] = dd[z].s;
                    }
                    else {
                        data[key].data.sum.total = dd[z].s;
                    }

                    data[key].data.duration = data[key].data.duration || {"total": 0, "prev-total": 0, "change": "NA", "trend": "u"};
                    if (previous) {
                        data[key].data.duration["prev-total"] = dd[z].dur;
                    }
                    else {
                        data[key].data.duration.total = dd[z].dur;
                    }
                }
                //data.all = countlyEvents.getSegmentedData(params.qstring.segmentation);
                resolve(true);
            });
        });
    }

    /**
     * async
     * Get total sessions.
     * @param {Object} params - getSessionsCount object
     * @param {String} params.usersCollectionName - users collection name
     * @param {Object} params.ob - it contains all necessary info
     * @param {Object} params.sessionData - dummy session data
     * @param {Object} params.usersData - dummy users data
     * @returns {Promise.<boolean>} true.
     */
    async getSessionCount(params) {
        const { ob, sessionData, usersData, usersCollectionName } = params;
        return await new Promise((resolve) => {
            countlyApi.data.fetch.getTimeObj(usersCollectionName, ob, (doc) => {
                countlyEvents.setDb(doc || {});
                const sessionProp = countlyEvents.getNumber("t", true);
                const usersProp = countlyEvents.getNumber("u", true);
                sessionData.totalSessionCount = sessionProp.total;
                sessionData.prevSessionCount = sessionProp["prev-total"];
                usersData.totalUsersCount = usersProp.total;
                usersData.prevUsersCount = usersProp["prev-total"];
                resolve(true);
            });
        });
    }

    /**
     * Encode event name.
     * @param {Object} data - event data.
     * @return {Object} encoded data.
     */
    encodeEvents(data) {
        const _data = {};
        Object.keys(data).forEach(key => {
            const encodeKey = countlyCommon.encode(key);
            _data[encodeKey] = data[key];
        });
        return _data;
    }

    /**
     * timeSecond function
     * @return {Number} - timesecond
     */
    timeSecond() {
        return Math.round(new Date().getTime() / 1000);
    }

    /**
     * mutatePeriod function
     * @param {String} period - 30days, hour
     * @return {String} - period
     */
    mutatePeriod(period) {
        if (period === "yesterday") {
            period = "today";
        }
        return period;
    }

    /**
     * async
     * That initialize function for TopEvents Job but Its main purpose is to get all the Apps.
     * The errors of all functions will be caught here.
     */
    async getAllApps() {
        log.d("Fetching all apps");
        try {
            const getAllApps = await new Promise((res, rej) => common.db.collection("apps").find({}, { _id: 1, timezone: 1 }).toArray((err, apps) => err ? rej(err) : res(apps)));
            for (var z = 0; z < getAllApps.length; z++) {
                //Calculating for each app serially.
                await this.getAppEvents(getAllApps[z]);
            }
        }
        catch (error) {
            log.e("TopEvents Job has a error: ", error);
            throw error;
        }
        log.d("Finished processing");
    }

    /**
     * async
     * saveAppEvents function
     * @param {Object} params - saveAppEvents object
     */
    async saveAppEvents(params) {
        const { data, sessionData, usersData, period, app: { _id }, totalCount, prevTotalCount, totalSum, prevTotalSum, totalDuration, prevTotalDuration } = params;
        const encodedData = this.encodeEvents(data);
        const timeSecond = this.timeSecond();
        const currentPeriood = this.mutatePeriod(period);
        await new Promise((res, rej) => common.db.collection(TopEventsJob.COLLECTION_NAME).findOneAndReplace(
            {
                app_id: _id, period: currentPeriood,
            },
            {
                app_id: _id, ts: timeSecond, period: currentPeriood, data: encodedData, totalCount: totalCount, prevTotalCount: prevTotalCount, totalSum: totalSum, prevTotalSum: prevTotalSum, totalDuration: totalDuration, prevTotalDuration: prevTotalDuration, prevSessionCount: sessionData.prevSessionCount, totalSessionCount: sessionData.totalSessionCount, prevUsersCount: usersData.prevUsersCount, totalUsersCount: usersData.totalUsersCount
            },
            {
                upsert: true
            },
            (error, records) => !error && records ? res(records) : rej(error))
        );
    }

    /**
     * async
     * getAppEvents function
     * @param {Object} app - saveAppEvents object
     */
    async getAppEvents(app) {
        log.d(app._id + ": Fetching app events");
        const getEvents = await new Promise((res, rej) => common.db.collection("events").findOne({ _id: app._id }, (errorEvents, result) => errorEvents ? rej(errorEvents) : res(result)));
        if (getEvents && 'list' in getEvents) {
            const eventMap = this.eventsFilter(getEvents.list);
            if (eventMap && eventMap instanceof Array) {
                for (const period of TopEventsJob.PERIODS) {
                    const data = {};
                    const sessionData = {};
                    const usersData = {};
                    const usersCollectionName = "users";
                    const ob = { app_id: app._id, appTimezone: app.timezone, qstring: { period: period } };
                    // if (period === "hour") {
                    //     ob.time = common.initTimeObj(app.timezone, new Date().getTime());
                    //     ob.qstring.action = "refresh";
                    // }
                    let totalCount = 0;
                    let prevTotalCount = 0;
                    let totalSum = 0;
                    let prevTotalSum = 0;
                    let totalDuration = 0;
                    let prevTotalDuration = 0;

                    //Fetching totals for this period
                    await this.fetchEventTotalCounts({ app_id: app._id, appTimezone: app.timezone, qstring: { period: period } }, data, false);
                    var period2 = countlyCommon.getPeriodObj({appTimezone: app.timezone, qstring: {}}, period);
                    var newPeriod = [period2.start - (period2.end - period2.start), period2.start];
                    //Fetching totals for previous period
                    await this.fetchEventTotalCounts({ app_id: app._id, appTimezone: app.timezone, qstring: { period: newPeriod } }, data, true);


                    for (var event in data) {
                        //Calculating trend
                        var trend = countlyCommon.getPercentChange(data[event].data.count["prev-total"], data[event].data.count.total);
                        data[event].data.count.change = trend.percent;
                        data[event].data.count.trend = trend.trend;
                        totalCount += data[event].data.count.total;
                        prevTotalCount += data[event].data.count["prev-total"];
                        totalSum += data[event].data.sum.total;
                        prevTotalSum += data[event].data.sum["prev-total"];
                        totalDuration += data[event].data.duration.total;
                        prevTotalDuration += data[event].data.duration["prev-total"];
                    }
                    log.d("    getting session count (" + period + ")");
                    await this.getSessionCount({ ob, sessionData, usersData, usersCollectionName });
                    log.d("    saving data (" + period + ")");
                    await this.saveAppEvents({ app, data, sessionData, usersData, period, totalCount, prevTotalCount, totalSum, prevTotalSum, totalDuration, prevTotalDuration });
                }
            }
        }
        else {
            log.d("    No events found for app");
        }

    }


    /**
     * Run the job
     * @param {Db} db connection
     * @param {done} done callback
     */
    async run(db, done) {
        try {
            await this.init();
            done();
        }
        catch (error) {
            done(error);
        }
    }

    /**
     * Get schedule
     * @returns {GetScheduleConfig} schedule
     */
    getSchedule() {
        return {
            type: "schedule",
            value: "1 0 * * *" // every day at 00:01
        };
    }
}

/**
 * TopEvents collection name.
 * @property {string}
 */
TopEventsJob.COLLECTION_NAME = "top_events";

/**
 * Events periods.
 * @property {array} ["30days", "hour", "month", "60days", "yesterday", "7days"]
 */
TopEventsJob.PERIODS = ["30days", "yesterday"];

module.exports = TopEventsJob;