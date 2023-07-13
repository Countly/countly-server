const job = require("../parts/jobs/job.js");
const crypto = require("crypto");
const Promise = require("bluebird");
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
class TopEventsJob extends job.Job {

    /**
     * TopEvents initialize function
     */
    init() {
        this.getAllApps();
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
     * async
     * Get events count.
     * @param {Object} params - getEventsCount object
     * @param {String} params.collectionNameEvents - event collection name
     * @param {Object} params.ob - it contains all necessary info
     * @param {string} params.event - event name
     * @param {Object} params.data - dummy event data
     * @returns {Promise.<boolean>} true.
     */
    async getEventsCount(params) {
        const { collectionNameEvents, ob, data, event } = params;
        return await new Promise((resolve) => {
            countlyApi.data.fetch.getTimeObjForEvents(collectionNameEvents, ob, (doc) => {
                countlyEvents.setDb(doc || {});
                const countProp = countlyEvents.getNumber("c", true);
                const sumProp = countlyEvents.getNumber("s", true);
                const durationProp = countlyEvents.getNumber("dur", true);
                data[event] = {};
                data[event].data = {
                    count: countProp,
                    sum: sumProp,
                    duration: durationProp
                };
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
        try {
            const getAllApps = await new Promise((res, rej) => common.db.collection("apps").find({}, { _id: 1, timezone: 1 }).toArray((err, apps) => err ? rej(err) : res(apps)));
            await Promise.all(getAllApps.map((app) => this.getAppEvents(app)));
        }
        catch (error) {
            log.e("TopEvents Job has a error: ", error);
        }
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
        await new Promise((res, rej) => common.db.collection(TopEventsJob.COLLECTION_NAME).insert({ app_id: _id, ts: timeSecond, period: currentPeriood, data: encodedData, totalCount: totalCount, prevTotalCount: prevTotalCount, totalSum: totalSum, prevTotalSum: prevTotalSum, totalDuration: totalDuration, prevTotalDuration: prevTotalDuration, prevSessionCount: sessionData.prevSessionCount, totalSessionCount: sessionData.totalSessionCount, prevUsersCount: usersData.prevUsersCount, totalUsersCount: usersData.totalUsersCount }, (error, records) => !error && records ? res(records) : rej(error)));
    }

    /**
     * async
     * getAppEvents function
     * @param {Object} app - saveAppEvents object
     */
    async getAppEvents(app) {
        const getEvents = await new Promise((res, rej) => common.db.collection("events").findOne({ _id: app._id }, (errorEvents, result) => errorEvents ? rej(errorEvents) : res(result)));
        if (getEvents && 'list' in getEvents) {
            const eventMap = this.eventsFilter(getEvents.list);
            await new Promise((res, rej) => common.db.collection(TopEventsJob.COLLECTION_NAME).remove({ app_id: app._id }, (error, result) => error ? rej(error) : res(result)));
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
                    for (const event of eventMap) {
                        const collectionNameEvents = this.eventsCollentions({ event, id: app._id });
                        await this.getEventsCount({ collectionNameEvents, ob, data, event });
                        totalCount += data[event].data.count.total;
                        prevTotalCount += data[event].data.count["prev-total"];
                        totalSum += data[event].data.sum.total;
                        prevTotalSum += data[event].data.sum["prev-total"];
                        totalDuration += data[event].data.duration.total;
                        prevTotalDuration += data[event].data.duration["prev-total"];
                    }
                    await this.getSessionCount({ ob, sessionData, usersData, usersCollectionName });
                    await this.saveAppEvents({ app, data, sessionData, usersData, period, totalCount, prevTotalCount, totalSum, prevTotalSum, totalDuration, prevTotalDuration });
                }
            }
        }

    }


    /**
     * Run the job
     * @param {Db} db connection
     * @param {done} done callback
     */
    run(db, done) {
        this.init();
        done();
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