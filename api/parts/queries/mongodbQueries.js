/*
*
* Mongodb queries to calculate aggregated data from granural data
*
*/
const countlyCommon = require('../../lib/countly.common.js');
const common = require('../../utils/common.js');

var obb = {};

(function(agg) {

    /**
     * Gets projection  base don timezone and bucket
     * @param {string} bucket  - d, h, m, w
     * @param {string} timezone  - timezone for display
     * @returns  {object} - projection
     */
    agg.getDateStringProjection = function(bucket, timezone) {
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
    };

    /**
     * Gets session table data
     * @param {options} options  - options
     * @returns {object} - aggregated data
     */
    agg.aggregatedSessionData = async function(options) {
        var pipeline = options.pipeline || [];
        var match = {"e": "[CLY]_session"};

        if (options.appID) {
            match.a = options.appID + "";
        }

        if (options.period) {
            match.ts = countlyCommon.getPeriodRange(options.period, options.timezone, options.periodOffset);
        }

        pipeline.push({"$match": match});
        pipeline.push({"$addFields": {"n": {"$cond": [{"$eq": ["$up.sc", 1]}, 1, 0]}}});
        if (options.segmentation) {
            pipeline.push({"$group": {"_id": {"u": "$uid", "sg": "$" + options.segmentation}, "d": {"$sum": "$dur"}, "t": {"$sum": 1}, "n": {"$sum": "$n"}}});
            pipeline.push({"$group": {"_id": "$_id.sg", "t": {"$sum": "$t"}, "d": {"$sum": "$d"}, "n": {"$sum": "$n"}, "u": {"$sum": 1}}});
        }
        else {
            pipeline.push({"$group": {"_id": "$uid", "t": {"$sum": 1}, "d": {"$sum": "$dur"}, "n": {"$sum": "$n"}}});
            pipeline.push({"$group": {"_id": null, "u": {"$sum": 1}, "d": {"$sum": "$d"}, "t": {"$sum": "$t"}, "n": {"$sum": "$n"}}});

        }
        var data = await common.drillDb.collection("drill_events").aggregate(pipeline).toArray();
        for (var z = 0; z < data.length; z++) {
            // data[z]._id = data[z]._id.replaceAll(/\:0/gi, ":");
            if (data[z].sg) {
                data[z].sg = data[z].sg.replaceAll(/\./gi, ":");
            }
        }
        return {
            _queryMeta: {
                adapter: 'mongodb',
                query: pipeline || 'MongoDB event segmentation aggregation pipeline',
            },
            data: data
        };
    };

    /**
   * Gets aggregated data chosen timezone.If not set - returns in UTC timezone.
   * @param {object} options  - options
   * options.appID - application id
   * options.event - string as event key or array with event keys
   * options.period - Normal Countly period
   * 
   * @returns {object} - aggregated data
   */
    agg.getAggregatedData = async function(options) {
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
            if (Array.isArray(options.event)) {
                match.n = {"$in": options.name};
            }
            else {
                match.n = options.name;
            }
        }
        if (options.period) {
            match.ts = countlyCommon.getPeriodRange(options.period, options.timezone, options.periodOffset);
        }
        if (options.bucket !== "h" && options.bucket !== "d" && options.bucket !== "m" && options.bucket !== "w") {
            options.bucket = "h";
        }
        pipeline.push({"$match": match});

        pipeline.push({"$addFields": {"d": agg.getDateStringProjection(options.bucket, options.timezone)}});
        if (options.segmentation) {
            /*if (Array.isArray(options.segmentation)) {

            }
            else {*/
            pipeline.push({"$unwind": ("$" + options.segmentation)});
            pipeline.push({"$group": {"_id": {"d": "$d", "sg": "$" + options.segmentation}, "c": {"$sum": "$c"}, "dur": {"$sum": "$dur"}, "s": {"$sum": "$s"}}});
            pipeline.push({"$project": { "_id": "$_id.d", "sg": "$_id.sg", "c": 1, "dur": 1, "s": 1}});
            //}
        }
        else {
            pipeline.push({"$group": {"_id": "$d", "c": {"$sum": "$c"}, "dur": {"$sum": "$dur"}, "s": {"$sum": "$s"}}});
        }
        try {
            var data = await common.drillDb.collection("drill_events").aggregate(pipeline).toArray();
        }/*  */
        catch (e) {
            console.log(e);
        }
        data = data || [];
        for (var z = 0; z < data.length; z++) {
            data[z]._id = data[z]._id.replaceAll(/\:0/gi, ":");
            if (data[z].sg) {
                data[z].sg = data[z].sg.replaceAll(/\./gi, ":");
            }
        }

        return {
            _queryMeta: {
                adapter: 'mongodb',
                query: pipeline || 'MongoDB event segmentation aggregation pipeline',
            },
            data: data
        };
        //Group by hour
    };

}(obb));
module.exports = obb;