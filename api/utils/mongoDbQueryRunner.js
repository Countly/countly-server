const moment = require('moment-timezone');

/**
 * Class for running Mongodb drill queries
 */
class MongoDbQueryRunner {
    /**
     * Constructor
     * @param {object} mongoDb  - mongodb connection
     */
    constructor(mongoDb) {
        this.db = mongoDb;
    }


    /**
* Returns number for timestamp making sure it is 13 digits
* @param {integer}ts -  number we need to se as timestamp
* @returns {integer} timestamp in ms
**/
    fixTimestampToMilliseconds(ts) {
        if ((ts + "").length > 13) {
            ts = (ts + '').substring(0, 13);
            ts = parseInt(ts, 10);
        }
        return ts;
    }

    /**
     * Full query runner
     * dbFilter - what we can set as query also in normal drill query
     * event - single or array
     * name - single or array
     * period
     * timezoneOffset
     * props to calculate (object);
     * byVal
     * is_graph - boolean, if true, check bucket
     */

    /**
     * 
     * @param {object} period  - common period in Countly
     * @param {string} timezone  - app timezone
     * @param {number} offset  - offset in minutes
     * @returns {object} - describes period range
     */
    getPeriodRange(period, timezone, offset) {
        //Gets start and end points of period for querying in drill
        var startTimestamp = 0;
        var endTimestamp = 0;
        var _currMoment = moment();

        if (typeof period === 'string' && period.indexOf(",") !== -1) {
            try {
                period = JSON.parse(period);
            }
            catch (SyntaxError) {
                console.log("period JSON parse failed");
                period = "30days";
            }
        }

        var excludeCurrentDay = period.exclude_current_day || false;
        if (period.period) {
            period = period.period;
        }

        if (period.since) {
            period = [period.since, endTimestamp.clone().valueOf()];
        }


        endTimestamp = excludeCurrentDay ? _currMoment.clone().subtract(1, 'days').endOf('day') : _currMoment.clone().endOf('day');

        if (Array.isArray(period)) {
            if ((period[0] + "").length === 10) {
                period[0] *= 1000;
            }
            if ((period[1] + "").length === 10) {
                period[1] *= 1000;
            }
            var fromDate, toDate;

            if (Number.isInteger(period[0]) && Number.isInteger(period[1])) {
                period[0] = this.fixTimestampToMilliseconds(period[0]);
                period[1] = this.fixTimestampToMilliseconds(period[1]);
                fromDate = moment(period[0]);
                toDate = moment(period[1]);
            }
            else {
                fromDate = moment(period[0], ["DD-MM-YYYY HH:mm:ss", "DD-MM-YYYY"]);
                toDate = moment(period[1], ["DD-MM-YYYY HH:mm:ss", "DD-MM-YYYY"]);
            }

            startTimestamp = fromDate.clone().startOf("day");
            endTimestamp = toDate.clone().endOf("day");

            fromDate.tz(timezone);
            toDate.tz(timezone);

            if (fromDate.valueOf() > toDate.valueOf()) {
                //incorrect range - reset to 30 days
                let nDays = 30;

                startTimestamp = _currMoment.clone().startOf("day").subtract(nDays - 1, "days");
                endTimestamp = _currMoment.clone().endOf("day");
            }
        }
        else if (period === "month") {
            startTimestamp = _currMoment.clone().startOf("year");
        }
        else if (period === "day") {
            startTimestamp = _currMoment.clone().startOf("month");
        }
        else if (period === "prevMonth") {
            startTimestamp = _currMoment.clone().subtract(1, "month").startOf("month");
            endTimestamp = _currMoment.clone().subtract(1, "month").endOf("month");
        }
        else if (period === "hour") {
            startTimestamp = _currMoment.clone().startOf("day");
        }
        else if (period === "yesterday") {
            let yesterday = _currMoment.clone().subtract(1, "day");
            startTimestamp = yesterday.clone().startOf("day");
            endTimestamp = yesterday.clone().endOf("day");
        }
        else if (/([1-9][0-9]*)minutes/.test(period)) {
            let nMinutes = parseInt(/([1-9][0-9]*)minutes/.exec(period)[1]);
            startTimestamp = _currMoment.clone().startOf("minute").subtract(nMinutes - 1, "minutes");
        }
        else if (/([1-9][0-9]*)hours/.test(period)) {
            let nHours = parseInt(/([1-9][0-9]*)hours/.exec(period)[1]);
            startTimestamp = _currMoment.clone().startOf("hour").subtract(nHours - 1, "hours");
        }
        else if (/([1-9][0-9]*)days/.test(period)) {
            let nDays = parseInt(/([1-9][0-9]*)days/.exec(period)[1]);
            startTimestamp = _currMoment.clone().startOf("day").subtract(nDays - 1, "days");
        }
        else if (/([1-9][0-9]*)weeks/.test(period)) {
            const nWeeks = parseInt(/([1-9][0-9]*)weeks/.exec(period)[1]);
            startTimestamp = _currMoment.clone().startOf("week").subtract((nWeeks - 1), "weeks");
        }
        else if (/([1-9][0-9]*)months/.test(period)) {
            const nMonths = parseInt(/([1-9][0-9]*)months/.exec(period)[1]);
            startTimestamp = _currMoment.clone().startOf("month").subtract((nMonths - 1), "months");
        }
        else if (/([1-9][0-9]*)years/.test(period)) {
            const nYears = parseInt(/([1-9][0-9]*)years/.exec(period)[1]);
            startTimestamp = _currMoment.clone().startOf("year").subtract((nYears - 1), "years");
        }
        //incorrect period, defaulting to 30 days
        else {
            let nDays = 30;
            startTimestamp = _currMoment.clone().startOf("day").subtract(nDays - 1, "days");
        }
        if (!offset) {
            offset = startTimestamp.utcOffset();
            offset = offset * -1;
        }

        return {"$gt": startTimestamp.valueOf() + offset * 60000, "$lt": endTimestamp.valueOf() + offset * 60000};
    }

    /**
     * Gets projection  base don timezone and bucket
     * @param {string} bucket  - d, h, m, w
     * @param {string} timezone  - timezone for display
     * @returns  {object} - projection
     */
    getDateStringProjection(bucket, timezone) {
        if (!(bucket === "h" || bucket === "d" || bucket === "m" || bucket === "w")) {
            bucket = "d";
        }
        var dstr = {"$toDate": "$ts"};
        if (bucket === "h") {
            dstr = {"$dateToString": {"date": dstr, "format": "%Y:%m:%d:%H", "timezone": (timezone || "UTC")}};
        }
        if (bucket === "m") {
            dstr = {"$dateToString": {"date": dstr, "format": "%Y:%m", "timezone": (timezone || "UTC")}};
        }
        else if (bucket === "w") {
            dstr = {"$dateToString": {"date": dstr, "format": "%Y:%U", "timezone": (timezone || "UTC")}};
        }
        else if (bucket === "d") {
            dstr = {"$dateToString": {"date": dstr, "format": "%Y:%m:%d", "timezone": (timezone || "UTC")}};
        }
        return dstr;
    }

    /**
     * Calculates timezone for mongo based on offset
     * @param {number} offset  - offset in minutes
     * @returns {string} timezone   
     */
    calculateTimezoneFromOffset(offset) {
        var hours = Math.abs(Math.floor(offset / 60));
        var minutes = Math.abs(offset % 60);
        return (offset < 0 ? "+" : "-") + (hours < 10 ? "0" : "") + hours + ":" + (minutes < 10 ? "0" : "") + minutes;
    }

    /**
   * Gets aggregated data chosen timezone.If not set - returns in UTC timezone.
   * @param {object} options  - options
   * options.appID - application id
   * options.event - string as event key or array with event keys
   * options.period - Normal Countly period
   * 
   * @returns {object} - aggregated data
   */
    async getAggregatedData(options) {
        var pipeline = options.pipeline || [];
        var match = options.match || {};

        if (options.appID) {
            match.a = options.appID + "";
        }
        if (options.event) {
            if (Array.isArray(options.event)) {
                match.e = {"$in": options.event};
            }
            else {
                match.e = options.event;
            }
        }
        if (options.name) {
            match.n = options.name;
        }
        if (options.period) {
            match.ts = this.getPeriodRange(options.period, options.timezone, options.periodOffset);
        }
        if (options.bucket !== "h" && options.bucket !== "d" && options.bucket !== "m" && options.bucket !== "w") {
            options.bucket = "h";
        }
        pipeline.push({"$match": match});

        pipeline.push({"$addFields": {"d": this.getDateStringProjection(options.bucket, options.timezone)}});
        if (options.segmentation) {
            /*if (Array.isArray(options.segmentation)) {

            }
            else {*/
            pipeline.push({"$unwind": ("$" + options.segmentation)});
            pipeline.push({"$group": {"_id": {"d": "$d", "sg": "$" + options.segmentation}, "c": {"$sum": "$c"}, "dur": {"$sum": "$dur"}, "sum": {"$sum": "$sum"}}});
            pipeline.push({"$project": { "_id": "$_id.d", "sg": "$_id.sg", "c": 1, "dur": 1, "sum": 1}});
            //}
        }
        else {
            pipeline.push({"$group": {"_id": "$d", "c": {"$sum": "$c"}, "dur": {"$sum": "$dur"}, "sum": {"$sum": "$sum"}}});
        }
        try {
            var data = await this.db.collection("drill_events").aggregate(pipeline).toArray();
        }/*  */
        catch (e) {
            console.log(e);
        }

        for (var z = 0; z < data.length; z++) {
            data[z]._id = data[z]._id.replaceAll(/\:0/gi, ":");
            if (data[z].sg) {
                data[z].sg = data[z].sg.replaceAll(/\./gi, ":");
            }
        }

        return data;
        //Group by hour
    }

    /**
     * Gets session model data
     * @param {options} options  - options
     * @returns {object} - aggregated data
     */
    async getAggregatedSessionData(options) {
        var pipeline = options.pipeline || [];
        var match = {"e": "[CLY]_session"};

        if (options.appID) {
            match.a = options.appID + "";
        }

        if (options.period) {
            match.ts = this.getPeriodRange(options.period, options.timezone, options.periodOffset);
        }

        pipeline.push({"$match": match});
        pipeline.push({"$addFields": {"n": {"$cond": [{"$eq": ["$up.fs", "$up.ls"]}, 1, 0]}}});
        if (options.segmentation) {
            pipeline.push({"$group": {"_id": {"u": "$uid", "sg": "$" + options.segmentation}, "t": {"$sum": "$t"}, "n": {"$sum": "$n"}}});
            pipeline.push({"$group": {"_id": "$_id.sg", "t": {"$sum": "$t"}, "n": {"$sum": "$n"}, "u": {"$sum": 1}}});
        }
        else {
            pipeline.push({"$group": {"_id": "$uid", "t": {"$sum": "$t"}, "n": {"$sum": "$n"}}});
            pipeline.push({"$group": {"_id": null, "u": {"$sum": 1}, "t": {"$sum": "$t"}, "n": {"$sum": "$n"}}});

        }

        var data = await this.db.collection("drill_events").aggregate(pipeline).toArray();
        for (var z = 0; z < data.length; z++) {
            // data[z]._id = data[z]._id.replaceAll(/\:0/gi, ":");
            if (data[z].sg) {
                data[z].sg = data[z].sg.replaceAll(/\./gi, ":");
            }
        }
    }

    /*
    async runDrillDataQuery(options) {
        var match = options.dbFilter || {};
        if (options.app_id) {
            if (Array.isArray(options.app_id)) {
                match.a = {"$in": options.app_id};
            }
            else {
                match.a = options.app_id + "";
            }
        }

        if (options.event) {
            if (Array.isArray(options.event)) {
                match.e = {"$in": options.event};
            }
            else {
                match.e = options.event;
            }
        }
        if (options.periodOffset) {
            options.timezone = this.calculateTimezoneFromOffset(options.periodOffset);
        }
        if (options.period) {
            match.ts = this.getPeriodRange(options.period, "UTC", options.periodOffset);
        }


    }*/

    /**
     * Get grph data based on unique
     * @param {object} options  - options
     * @returns {object} model data as array
     */
    async getUniqueGraph(options) {
        var match = options.dbFilter || {};
        if (options.appID) {
            match.a = options.appID + "";
        }
        if (options.event) {
            match.e = options.event;
        }
        if (options.name) {
            match.n = options.name;
        }
        if (options.period) {
            match.ts = this.getPeriodRange(options.period, "UTC", options.periodOffset);
        }
        var field = options.field || "uid";

        if (options.bucket !== "h" && options.bucket !== "d" && options.bucket !== "m" && options.bucket !== "w") {
            options.bucket = "d";
        }

        if (options.periodOffset) {
            options.timezone = this.calculateTimezoneFromOffset(options.periodOffset);
        }
        var pipeline = [];
        pipeline.push({"$match": match});
        pipeline.push({"$addFields": {"d": this.getDateStringProjection(options.bucket, options.timezone)}});
        pipeline.push({"$group": {"_id": {"d": "$d", "id": "$" + field}}});
        pipeline.push({"$group": {"_id": "$_id.d", "u": {"$sum": 1}}});
        var data = await this.db.collection("drill_events").aggregate(pipeline).toArray();
        for (var z = 0; z < data.length; z++) {
            data[z]._id = data[z]._id.replaceAll(/:0/gi, ":");
            if (data[z].sg) {
                data[z].sg = data[z].sg.replaceAll(/\./gi, ":");
            }
        }
        return data;
    }

    /**
     * Gets unique count(single number)
     * @param {options} options  - options
     * @returns {number} number
     */
    async getUniqueCount(options) {
        var match = options.dbFilter || {};
        if (options.appID) {
            match.a = options.appID + "";
        }
        if (options.event) {
            match.e = options.event;'';
        }
        if (options.name) {
            match.n = options.name;
        }
        if (options.period) {
            match.ts = this.getPeriodRange(options.period, "UTC", options.periodOffset);
        }
        var field = options.field || "uid";
        var pipeline = [
            {"$match": match},
            {"$group": {"_id": "$" + field}},
            {"$group": {"_id": null, "c": {"$sum": 1}}}
        ];
        var data = await this.db.collection("drill_events").aggregate(pipeline).toArray();
        data = data[0] || {"c": 0};
        return data.c;
    }

    /**
     * Gets views table data
     * @param {object} options  -options
     * @returns {object} table data
     */
    async getViewsTableData(options) {
        var match = options.dbFilter || {};
        if (options.appID) {
            match.a = options.appID + "";
        }
        match.e = "[CLY]_view";
        if (options.period) {
            match.ts = this.getPeriodRange(options.period, "UTC", options.periodOffset);
        }

        var pipeline = [];
        pipeline.push({"$match": match});
        pipeline.push({"$group": {"_id": {"u": "$uid", "sg": "$n" }, "t": {"$sum": 1}, "d": {"$sum": "$dur"}, "s": {"$sum": "$sg.visit"}, "e": {"$sum": "$sg.exit"}, "b": {"$sum": "$sg.bounce"}}});
        pipeline.push({"$addFields": {"u": 1}});
        //Union with cly action
        pipeline.push({
            "$unionWith": {
                "coll": "drill_events",
                "pipeline": [
                    {"$match": {"e": "[CLY]_action", "sg.type": "scroll", "ts": match.ts, "a": match.a}},
                    {"$group": {"_id": {"u": "$uid", "sg": "$n"}, "scr": {"$sum": "$sg.scr"}}}
                ]
            }
        });
        pipeline.push({"$group": {"_id": "$_id.sg", "u": {"$sum": "$u"}, "t": {"$sum": "$t"}, "d": {"$sum": "$d"}, "s": {"$sum": "$s"}, "e": {"$sum": "$e"}, "b": {"$sum": "$b"}, "scr": {"$sum": "$scr"}}});
        pipeline.push({
            "$addFields": {
                "scr-calc": { $cond: [ { $or: [{$eq: ["$t", 0]}, {$eq: ['$scr', 0]}]}, 0, {'$divide': ['$scr', "$t"]}] },
                "d-calc": { $cond: [ { $or: [{$eq: ["$t", 0]}, {$eq: ['$d', 0]}]}, 0, {'$divide': ['$d', "$t"]}] },
                "br": { $cond: [ { $or: [{$eq: ["$s", 0]}, {$eq: ['$b', 0]}]}, 0, {'$divide': [{"$min": ['$b', "$s"]}, "$s"]}] },
                "b": {"$min": [{"$ifNull": ["$b", 0]}, {"$ifNull": ["$s", 0]}]},
                "view": "$_id"
            }
        });

        console.log(JSON.stringify(pipeline));
        var data = await this.db.collection("drill_events").aggregate(pipeline).toArray();
        for (var z = 0; z < data.length; z++) {
            data[z]._id = data[z]._id.replaceAll(/\:0/gi, ":");
            if (data[z].sg) {
                data[z].sg = data[z].sg.replaceAll(/\./gi, ":");
            }
        }
        return data;
    }

    /**
     * Gets timeline table data for user profile
     * @param {object} options - options
     * @returns {object} table data
     */
    async getTimelineSessionTable(options) {
        var match = {"e": "[CLY]_session"};
        if (options.appID) {
            match.a = options.appID + "";
        }
        if (options.uid) {
            match.uid = options.uid;
        }
        if (options.event) {
            match.e = options.event;
        }
        if (options.period) {
            match.ts = this.getPeriodRange(options.period, "UTC", options.periodOffset);
        }

        var projection = {"dur": 1, "ts": 1, "_id": 1};
        var cursor = await this.db.collection("drill_events").find(match, projection);
        var total = await cursor.count();
        if (options.skip) {
            cursor = cursor.skip(options.skip);
        }
        if (options.limit) {
            cursor = cursor.limit(options.limit);
        }
        var data = await cursor.toArray();
        return {data: data || [], total: total || 0};
    }

    /**
     * Gets timeline graph data for user profile
     * @param {object} options  - options
     * @returns {object} table data
     */
    async getTimelineGraph(options) {
        var match = {};
        if (options.appID) {
            match.a = options.appID + "";
        }
        if (options.uid) {
            match.uid = options.uid;
        }

        if (options.period) {
            match.ts = this.getPeriodRange(options.period, "UTC", options.periodOffset);
        }
        if (options.periodOffset) {
            options.timezone = this.calculateTimezoneFromOffset(options.periodOffset);
        }

        var pipeline = [
            {"$match": match},
            {
                "$project": {
                    "d": this.getDateStringProjection(options.bucket || "d", options.timezone),
                    "e": {"$cond": [{"$eq": ["$e", "[CLY]_session"]}, 0, 1]},
                    "s": {"$cond": [{"$eq": ["$e", "[CLY]_session"]}, 1, 0]}
                }
            },
            {"$group": {"_id": "$d", "e": {"$sum": "$e"}, "s": {"$sum": "$s"}}},
            {"$project": {"label": "$_id", "_id": 0, "e": 1, "s": 1}}
        ];

        var data = await this.db.collection("drill_events").aggregate(pipeline).toArray();
        var totals = {"e": 0, "s": 0};
        var mapped = {};
        for (var i = 0; i < data.length; i++) {
            data[i].label = data[i].label + "";
            data[i].label = data[i].label.replaceAll(/\:0/gi, ":");
            mapped[data[i].label] = {"e": data[i].e, "s": data[i].s};
            totals.e += data[i].e;
            totals.s += data[i].s;
        }

        return {"totals": totals, "graph": mapped};
    }

    /**
     * Gets timeline table data for user profile
     * @param {object} options  - options
     * @returns {object} table data
     */
    async getTimelineTable(options) {
        var match = options.match || {};
        if (options.appID) {
            match.a = options.appID + "";
        }
        if (options.uid) {
            match.uid = options.uid;
        }
        if (options.session) {
            match.lsid = options.session;
        }
        if (options.event) {
            match.e = options.event;
        }
        else {
            match.e = {"$ne": "[CLY]_session"};
        }

        if (options.period) {
            match.ts = this.getPeriodRange(options.period, "UTC", options.periodOffset);
        }
        var projection = {
            "key": "$e",
            "ts": 1,
            "c": 1,
            "sum": 1,
            "dur": 1,
            "sg": 1
        };
        if (options.projection) {
            projection = options.projection;
        }

        var cursor = await this.db.collection("drill_events").find(match, projection);
        var total = await cursor.count();
        if (options.sort) {
            cursor = cursor.sort(options.sort);
        }
        if (options.skip) {
            cursor = cursor.skip(options.skip);
        }
        if (options.limit) {
            cursor = cursor.limit(options.limit);
        }

        var data = await cursor.toArray();
        return {data: data || [], total: total || 0};
    }
}

module.exports = {MongoDbQueryRunner};