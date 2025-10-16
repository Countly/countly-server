var pluginOb = {},
    crypto = require('crypto'),
    Promise = require("bluebird"),
    common = require('../../../api/utils/common.js'),
    moment = require('moment-timezone'),
    authorize = require('../../../api/utils/authorizer.js'),
    countlyCommon = require('../../../api/lib/countly.common.js'),
    plugins = require('../../pluginManager.js'),
    fetch = require('../../../api/parts/data/fetch.js'),
    log = common.log('views:api'),
    {checkViewQuery} = require('./common.js'),
    { validateRead, validateUpdate, validateDelete } = require('../../../api/utils/rights.js'),
    {getTotals, getUniqueCount, getGraphValues} = require('./queries/views.js');
var calculatedDataManager = require('../../../api/utils/calculatedDataManager.js');

const viewsUtils = require("./parts/viewsUtils.js");
const FEATURE_NAME = 'views';
const escapedViewSegments = { "name": true, "segment": true, "height": true, "width": true, "y": true, "x": true, "visit": true, "uvc": true, "start": true, "bounce": true, "exit": true, "type": true, "view": true, "domain": true, "dur": true, "_id": true, "_idv": true, "utm_source": true, "utm_medium": true, "utm_campaign": true, "utm_term": true, "utm_content": true, "referrer": true};
//keys to not use as segmentation
(function() {
    plugins.register("/i/user_merge", function(ob) {
        var newAppUser = ob.newAppUser;
        var oldAppUser = ob.oldAppUser;
        if (typeof oldAppUser.vc !== "undefined") {
            if (typeof newAppUser.vc === "undefined") {
                newAppUser.vc = 0;
            }
            newAppUser.vc += oldAppUser.vc;
        }
        if (typeof oldAppUser.lvt !== "undefined") {
            if (!newAppUser.lvt || oldAppUser.lvt > newAppUser.lvt) {
                newAppUser.lvt = oldAppUser.lvt;
                newAppUser.lv = oldAppUser.lv;
            }
        }
    });

    plugins.register("/i/views", function(ob) {
        var appId = ob.params.qstring.app_id;

        return new Promise(function(resolve) {

            if (ob.params.qstring.method === "rename_views") {
                validateUpdate(ob.params, FEATURE_NAME, function(params) {
                    if (ob.params.qstring.data) {
                        var haveUpdate = false;
                        var data = [];
                        try {
                            data = JSON.parse(ob.params.qstring.data);
                        }
                        catch (SyntaxError) {
                            log.e('Parsing data failed: ', ob.params.qstring.data);
                            common.returnMessage(params, 400, 'Invalid request parameter: data');
                            resolve();
                            return;
                        }
                        const bulk = common.db.collection("app_viewsmeta" + appId).initializeUnorderedBulkOp();
                        for (var k = 0; k < data.length; k++) {
                            if (data[k].value !== "") {
                                bulk.find({_id: common.db.ObjectID(data[k].key)}).updateOne({$set: {"display": data[k].value}});
                            }
                            else {
                                bulk.find({_id: common.db.ObjectID(data[k].key)}).updateOne({$unset: {"display": true}});
                            }
                            haveUpdate = true;
                        }

                        if (haveUpdate) {
                            bulk.execute(function(err/*, updateResult*/) {
                                if (err) {
                                    log.e(err);
                                    common.returnMessage(params, 400, err);
                                    resolve();
                                }
                                else {
                                    common.returnMessage(params, 200, 'Success');
                                    resolve();
                                }
                            });
                        }
                        else {
                            common.returnMessage(params, 400, 'Nothing to update');
                            resolve();
                        }
                    }
                    else {
                        common.returnMessage(params, 400, 'Missing request parameter: data');
                        resolve();
                    }
                });
            }
            else if (ob.params.qstring.method === "delete_view") {
                var viewName = "";
                var viewUrl = "";
                var viewids = ob.params.qstring.view_id;
                viewids = viewids.split(","); //can pass many, concat ","
                validateDelete(ob.params, FEATURE_NAME, async function(params) {
                    try {
                        for (var k = 0; k < viewids.length; k++) {
                            var viewid = viewids[k];
                            await new Promise(function(resolveView) {
                                const deleteDocs = [];
                                common.db.collection("views").findOne({'_id': common.db.ObjectID(appId)}, {}, function(err1, viewInfo) {
                                    if (err1) {
                                        log.e(err1);
                                    }
                                    if (viewInfo) {
                                        common.db.collection("app_viewsmeta").findOne({'_id': viewid}, {}, function(err, viewrecord) {
                                            if (viewrecord && viewrecord.view) {
                                                viewName = viewrecord.view;
                                                viewUrl = viewrecord.view;
                                            }

                                            if (viewrecord && viewrecord.url && viewrecord.url !== "") {
                                                viewUrl = viewrecord.url;
                                            }

                                            common.db.collection("app_viewdata").remove({"vw": viewid});
                                            //remove from userviews
                                            common.db.collection("app_userviews" + appId).update({}, {$unset: {viewid: 1}}, {multi: true});
                                            common.db.collection("app_userviews").update({"_id": {"$regex": "^" + appId + "_.*"}}, {$unset: {viewid: 1}}, {multi: true});
                                            //remove from meta
                                            common.db.collection("app_viewsmeta").remove({'_id': viewid});

                                            plugins.dispatch("/core/delete_granular_data", {
                                                db: "countly_drill",
                                                collection: "drill_events",
                                                query: { a: appId + "", e: "[CLY]_view", n: viewName }
                                            });
                                            plugins.dispatch("/core/delete_granular_data", {
                                                db: "countly_drill",
                                                collection: "drill_events",
                                                query: { a: appId + "", e: "[CLY]_action", n: viewUrl }
                                            });

                                            plugins.dispatch("/view/delete", {appId: appId, view: viewid + ""});
                                            /** */
                                            Promise.all(deleteDocs).then(function() {
                                                resolveView();
                                            }).catch(function(/*rejection*/) {
                                                resolveView();
                                            });
                                        });
                                    }
                                    else {
                                        resolveView();
                                    }
                                });
                            });
                        }
                        common.returnOutput(params, {result: true});
                        resolve();
                    }
                    catch (rejection) {
                        log.e(rejection);
                        resolve();
                        common.returnOutput(params, {result: false});
                    }
                });
            }
            else if (ob.params.qstring.method === "omit_segments") {
                validateDelete(ob.params, FEATURE_NAME, function(params) {
                    if (!params.qstring.app_id) {
                        common.returnMessage(params, 400, 'Missing request parameter: app_id');
                        resolve();
                        return;
                    }
                    if (params.qstring.omit_list) {
                        var omit = [];
                        try {
                            omit = JSON.parse(ob.params.qstring.omit_list);
                        }
                        catch (SyntaxError) {
                            log.e('Parsing data failed: ', ob.params.qstring.omit_list);
                            common.returnMessage(params, 400, 'Cannot parse  parameter: omit_list');
                            resolve();
                            return;
                        }
                        if (!Array.isArray(omit)) {
                            common.returnMessage(params, 400, 'Invalid request parameter: omit_list');
                            resolve();
                            return;
                        }

                        viewsUtils.ommit_segments({params: params, db: common.db, omit: omit, appId: params.qstring.app_id}, function(err) {
                            if (err) {
                                common.returnMessage(params, 400, "Updating database failed");
                            }
                            else {
                                common.returnMessage(params, 200, 'Success');
                            }
                            resolve();
                            return;
                        });
                    }
                    else {
                        common.returnMessage(params, 400, 'Nothing is passed for omiting');
                    }
                });
            }
            else {
                common.returnMessage(ob.params, 400, 'Invalid method. Must be one of:delete_view,rename_views,omit_segments ');
                resolve();
            }
        });
    });

    plugins.register("/batcher/fail", function(ob) {
        if (ob.db === "countly" && (ob.collection.indexOf("app_viewdata") === 0)) {
            //omit segment using app_id and segment name
            if (ob.data && ob.data.updateOne && ob.data.updateOne.update && ob.data.updateOne.update.$set) {
                var appId = ob.data.updateOne.update.$set.a;
                var segment = ob.data.updateOne.update.$set.s;
                if (appId && segment) {
                    log.d("calling segment omiting for " + appId + " - " + segment);
                    viewsUtils.ommit_segments({extend: true, db: common.db, omit: [segment], appId: appId, params: {"qstring": {}, "user": {"_id": "SYSTEM", "username": "SYSTEM"}}}, function(err) {
                        if (err) {
                            log.e(err);
                        }
                    });
                }

            }
        }
    });

    plugins.register("/i/device_id", function(ob) {
        var appId = ob.app_id;
        var oldUid = ob.oldUser.uid;
        var newUid = ob.newUser.uid;
        if (oldUid !== newUid) {
            return new Promise(function(resolve, reject) {
                common.db.collection("app_userviews" + appId).find({_id: oldUid}).toArray(function(err, data) {
                    if (err) {
                        log.e(err);
                        reject(err);
                        return;
                    }
                    const bulk = common.db.collection("app_userviews" + appId).initializeUnorderedBulkOp();
                    var haveUpdate = false;
                    for (var k in data) {
                        for (var view in data[k]) {
                            if (view !== '_id') {
                                if (data[k][view].ts) {
                                    let orRule = {};
                                    orRule[view + ".ts"] = {$lt: data[k][view].ts};
                                    let orRule2 = {};
                                    orRule2[view] = {$exists: false};
                                    let setRule = {};
                                    setRule[view + ".ts"] = data[k][view].ts;
                                    if (data[k][view].lvid) {
                                        setRule[view + ".lvid"] = data[k][view].lvid;
                                    }
                                    if (data[k][view].sg) {
                                        setRule[view + ".sg"] = data[k][view].sg;
                                    }
                                    bulk.find({$and: [{_id: newUid}, {$or: [orRule, orRule2]}]}).upsert().updateOne({$set: setRule});
                                    haveUpdate = true;
                                }
                            }
                        }
                    }
                    if (haveUpdate) {
                        bulk.execute().catch(function(err1) {
                            if (parseInt(err1.code) !== 11000) {
                                log.e(err1);
                            }
                        });
                    }
                    common.db.collection("app_userviews" + appId).remove({_id: oldUid}, function(/*err, res*/) {
                        resolve();
                    });
                });
            });
        }
    });

    plugins.register("/i/app_users/delete", async function(ob) {
        var appId = ob.app_id;
        var uids = ob.uids;
        if (uids && uids.length) {
            // By using await and no callback, error in db operation will be thrown
            // This error will then be caught by app users api dispatch so that it can cancel app user deletion
            await common.db.collection("app_userviews" + appId).remove({_id: {$in: uids}});
            var fixed_uids = [];
            for (var i = 0; i < uids.length; i++) {
                fixed_uids.push(appId + "_" + uids[i]);
            }
            await common.db.collection("app_userviews").remove({_id: {$in: fixed_uids}});
        }
    });

    plugins.register("/i/app_users/export", function(ob) {
        return new Promise(function(resolve/*, reject*/) {
            var uids = ob.uids;
            if (!ob.export_commands.views) {
                ob.export_commands.views = [];
            }
            ob.export_commands.views.push({cmd: 'mongoexport', args: [...ob.dbargs, '--collection', 'app_userviews' + ob.app_id, '-q', '{"_id":{"$in": ["' + uids.join('","') + '"]}}', '--out', ob.export_folder + '/app_userviews' + ob.app_id + '.json']});
            resolve();
        });
    });

    /* Function for future use to use ugroups instead of usual method. Needs to be rechecked for agregation pipeline speed
    function getUvalueSelectFromMap(map, segmentVal) {
        var groups = {};
        for (var year in map) {
            let yy = year + ":0";
            groups[yy] = [];
            groups[yy].push({"k": yy, "v": "$d." + year + "." + segmentVal + "u"});
            if (Object.keys(map[year]).length > 0) { //we need also monthly doc for those
                for (var month in map[year]) {
                    let mm = year + ":" + month;
                    groups[mm] = [];
                    groups[mm].push({"k": mm, "v": "$d." + mm + "." + segmentVal + "u"});
                    if (Object.keys(map[year][month]).length > 0) { //we need also weekly doc for those
                        for (var week in map[year][month]) {
                            let ww = year + ":" + week;
                            groups[yy].push({"k": ww, "v": "$d." + week + "." + segmentVal + "u"});

                            for (var day in map[year][month][week]) {
                                let dd = year + ":" + month + ":" + day;
                                groups[mm].push(mm + "." + dd + "." + segmentVal + "u");
                                groups[mm].push({"k": dd, "v": "$d." + month + "." + day + "." + segmentVal + "u"});
                            }
                        }
                    }
                }
            }
        }
        return groups;
    }
    */
    /** function returns aggregation pipeline
     * @param {object} params  -  params object(passed from request).
     * @param {string} params.qstring.app_id - app id
     * @param {string} params.qstring.period - period
     * @param {object} settings - settings for select
     * @param {string} settings.segmentVal - segment value. (Segment key is set by collection name)
	 * @returns {object} pipeline
    */
    function createAggregatePipeline(params, settings) {
        //settings.offset(in hours);
        var prefix = params.qstring.app_id + "_" + "no-segment_";
        if (settings.segment) {
            prefix = params.qstring.app_id + "_" + settings.segment + "_";
        }
        settings = settings || {};
        if (params.qstring.periodOffset) {
            settings.offset = Math.round(parseInt(params.qstring.periodOffset));
            var dd = moment(new Date());
            if (params.appTimezone) {
                dd.tz(params.appTimezone);
            }
            var appOffset = dd.utcOffset();
            settings.offset = (appOffset + settings.offset) / 60;
            settings.offset = settings.offset * -1;
        }
        var pipeline = [];
        var period = params.qstring.period || '30days';
        if (params.qstring.period && params.qstring.period.indexOf('since') !== -1) {
            params.qstring.period = JSON.parse(params.qstring.period);
        }
        var segment = settings.segmentVal;
        if (segment !== "") {
            segment = segment + ".";
        }

        var periodObj = countlyCommon.getPeriodObj(params);
        if (settings.offset) {
            period = JSON.stringify([periodObj.start - settings.offset * 60 * 60 * 1000, periodObj.end - settings.offset * 60 * 60 * 1000]);
            periodObj = countlyCommon.getPeriodObj({"qstring": {"period": period}});
            period = params.qstring.period;
        }
        else {
            period = JSON.stringify([periodObj.start, periodObj.end]);
        }

        var selectMap = {};
        var projector;
        var parsedPeriod = period;
        var periodsToBeConverted = ["months", "weeks", "days"];

        if (typeof period === 'string') {
            try {
                parsedPeriod = JSON.parse(period);
            }
            catch (error) {
                parsedPeriod = period;
            }
        }
        if ((typeof parsedPeriod === 'object' && Object.prototype.hasOwnProperty.call(parsedPeriod, 'since')) || periodsToBeConverted.some(x=>period.includes(x))) {
            try {
                period = [periodObj.start, periodObj.end];
            }
            catch (error) {
                //
            }
        }

        //Period is 2 timestamps
        var firstDay = periodObj.currentPeriodArr[0];
        var firstMonth = firstDay.split(".");
        firstMonth = firstMonth[0] + "." + firstMonth[1];

        var lastDay = periodObj.currentPeriodArr[periodObj.currentPeriodArr.length - 1];
        var lastMonth = periodObj.currentPeriodArr[periodObj.currentPeriodArr.length - 1].split(".");
        lastMonth = lastMonth[0] + "." + lastMonth[1];

        var fullMonths = {};
        for (let i = 0; i < periodObj.currentPeriodArr.length; i++) {
            let kk = periodObj.currentPeriodArr[i].split(".");
            var monthValue = kk[0] + "." + kk[1];
            if (monthValue === firstMonth || monthValue === lastMonth) {
                if (!selectMap[kk[0] + ":" + kk[1]]) {
                    selectMap[kk[0] + ":" + kk[1]] = [];
                }
                if (selectMap[kk[0] + ":" + kk[1]].indexOf("$d." + kk[2]) === -1) {
                    if (settings.offset !== 0) {
                        if (firstDay === kk[0] + "." + kk[1] + "." + kk[2]) {
                            var s1 = 0;
                            var e1 = 23;
                            if (settings.offset > 0) {
                                s1 = 24 - settings.offset;
                            }
                            else {
                                s1 = -1 * settings.offset;
                            }
                            for (; s1 <= e1; s1++) {
                                selectMap[kk[0] + ":" + kk[1]].push("$d." + kk[2] + "." + s1);
                            }
                        }
                        else if (lastDay === kk[0] + "." + kk[1] + "." + kk[2]) {
                            var s2 = 0;
                            var e2 = 23;
                            if (settings.offset > 0) {
                                e2 = 24 - settings.offset;
                            }
                            else {
                                e2 = -1 * settings.offset - 1;
                            }
                            for (; s2 <= e2; s2++) {
                                selectMap[kk[0] + ":" + kk[1]].push("$d." + kk[2] + "." + s2);
                            }

                        }
                        else {
                            selectMap[kk[0] + ":" + kk[1]].push("$d." + kk[2]);
                        }
                    }
                    else {
                        selectMap[kk[0] + ":" + kk[1]].push("$d." + kk[2]);
                    }
                }
            }
            else {
                if (!fullMonths[kk[0]]) {
                    fullMonths[kk[0]] = [];
                }
                if (fullMonths[kk[0]].indexOf(kk[1]) === -1) {
                    fullMonths[kk[0]].push(kk[1]);
                }
            }
        }

        if (Object.keys(selectMap).length > 0) {
            for (var z in selectMap) {
                var matchStage0 = {"$match": {"_id": {"$regex": prefix + z + "_.*"}}};
                if (settings && settings.onlyIDs) {
                    matchStage0.vw = {"$in": settings.onlyIDs};
                }
                projector = {_id: "$vw", name: "$n"};
                for (let i = 0; i < settings.levels.daily.length; i++) {
                    var sums0 = [];
                    for (let k = 0; k < selectMap[z].length; k++) {
                        sums0.push(selectMap[z][k] + "." + segment + settings.levels.daily[i]);
                    }
                    projector[settings.levels.daily[i]] = {$sum: sums0};
                }
                if (pipeline.length > 0) {
                    pipeline.push({"$unionWith": {coll: "app_viewdata", pipeline: [matchStage0, {"$project": projector}]}});
                }
                else {
                    pipeline.push(matchStage0);
                    pipeline.push({"$project": projector});
                }
            }
        }
        for (var year in fullMonths) {
            var matchStage = {"$match": {"_id": {$regex: prefix + year + ":0_.*"}}};
            if (settings && settings.onlyIDs) {
                matchStage.$match.vw = {"$in": settings.onlyIDs};
            }
            var projector2 = {_id: "$vw", name: "$n"};
            for (let i = 0; i < settings.levels.daily.length; i++) {
                var sums00 = [];
                for (var idx = 0; idx < fullMonths[year].length; idx++) {
                    let month = fullMonths[year][idx];
                    sums00.push("$d." + month + "." + segment + settings.levels.daily[i]);
                }
                projector2[settings.levels.daily[i]] = {"$sum": sums00};
            }
            if (pipeline.length > 0) {
                pipeline.push({"$unionWith": {coll: "app_viewdata", pipeline: [matchStage, {"$project": projector2}]}});
            }
            else {
                pipeline.push(matchStage);
                pipeline.push({"$project": projector2});
            }
        }


        var groupRule = {"_id": "$_id", "name": {"$first": "$name"}};
        for (let i = 0; i < settings.levels.daily.length; i++) {
            groupRule[settings.levels.daily[i]] = {"$sum": "$" + settings.levels.daily[i]};
        }

        pipeline.push({"$group": groupRule});

        var pulling_attributes = {vw: true};
        for (let i = 0; i < settings.levels.daily.length; i++) {
            if (settings.levels.daily[i] === 'd' || settings.levels.daily[i] === "scr") {
                pulling_attributes[settings.levels.daily[i] + "-calc"] = { $cond: [ { $or: [{$eq: ["$t", 0]}, {$eq: ['$' + settings.levels.daily[i], 0]}]}, 0, {'$divide': ['$' + settings.levels.daily[i], "$t"]}] } ;
            }

            if (settings.levels.daily[i] === 'br') {
                pulling_attributes[settings.levels.daily[i]] = { $cond: [ { $or: [{$eq: ["$s", 0]}, {$eq: ['$b', 0]}]}, 0, {'$divide': [{"$min": ['$b', "$s"]}, "$s"]}] } ;
            }
            else if (settings.levels.daily[i] === 'b') {
                pulling_attributes[settings.levels.daily[i]] = {"$min": [{"$ifNull": ["$b", 0]}, {"$ifNull": ["$s", 0]}]};
            }
            else {
                pulling_attributes[settings.levels.daily[i]] = {"$ifNull": ["$" + settings.levels.daily[i], 0]};
            }
        }

        pipeline.push({$project: pulling_attributes});

        return pipeline;
    }
    //group all together

    pluginOb.createAggregatePipeline = createAggregatePipeline;

    /** function return calculated totals for given period. Used in table tata
     * @param {string} collectionName - collection name from where to select
     * @param {object} params  -  params object(passed from request).
     * @param {string} params.qstring.app_id - app id
     * @param {string} params.qstring.period - period
     * @param {object} settings - settings for select
     * @param {string} settings.segmentVal - segment value. (Segment key is set by collection name)
     * @param {@function} callback - callback function
    */
    function getAggregatedData(collectionName, params, settings, callback) {
        settings = settings || {};
        collectionName = "app_viewdata";
        var app_id = settings.app_id;
        var pipeline = createAggregatePipeline(params, settings);
        if (settings.depends) {
            pipeline.push({"$match": settings.depends}); //filter only those which has some value in choosen column
        }
        var facetLine = [];

        if (settings.sortcol !== 'name') {
            facetLine.push(settings.sortby); //sort values*/
            if (settings.startPos) {
                facetLine.push({$skip: settings.startPos});
            }
            if (settings.dataLength !== 0) {
                facetLine.push({$limit: settings.dataLength || 50}); //limit count
            }

            facetLine.push({
                $lookup: {
                    from: "app_viewsmeta",
                    localField: "_id",
                    foreignField: "_id",
                    as: "view_meta"
                }
            });
            var project2 = {vw: true, "view_meta": {"$first": "$view_meta"}};
            for (let i = 0; i < settings.levels.daily.length; i++) {
                project2[settings.levels.daily[i]] = "$" + settings.levels.daily[i];
                if (settings.levels.daily[i] === "scr" || settings.levels.daily[i] === "d") {
                    project2[settings.levels.daily[i] + "-calc"] = "$" + settings.levels.daily[i] + "-calc";
                }
            }

            facetLine.push({
                "$project": project2
            });


            var project3 = {vw: true};
            for (let i = 0; i < settings.levels.daily.length; i++) {
                project3[settings.levels.daily[i]] = "$" + settings.levels.daily[i];
                if (settings.levels.daily[i] === "scr" || settings.levels.daily[i] === "d") {
                    project3[settings.levels.daily[i] + "-calc"] = "$" + settings.levels.daily[i] + "-calc";
                }
            }
            project3.view = "$view_meta.view";
            project3.display = {"$ifNull": ["$view_meta.display", "$view_meta.view"]};
            project3.url = "$view_meta.url";


            facetLine.push({
                "$project": project3
            });


            pipeline.push({$facet: {data: facetLine, count: [{$count: 'count'}]}});
            common.db.collection(collectionName).aggregate(pipeline, {allowDiskUse: true}, function(err, res) {
                var cn = 0;
                var data = [];
                if (err) {
                    log.e(err);
                }
                if (res && res[0]) {
                    if (res[0].count && res[0].count[0]) {
                        cn = res[0].count[0].count || 0;
                    }
                    data = res[0].data || [];
                }
                callback(data, cn);
            });
        }
        else if (settings.sortcol === "name" && settings.depends) {
            facetLine.push({
                $lookup: {
                    from: "app_viewsmeta",
                    localField: "_id",
                    foreignField: "_id",
                    as: "view_meta"
                }
            });

            var project_items = {vw: true, uvalue: true, "view_meta": {"$first": "$view_meta"}};
            for (let i = 0; i < settings.levels.daily.length; i++) {
                project_items[settings.levels.daily[i]] = "$" + settings.levels.daily[i];
                if (settings.levels.daily[i] === "scr" || settings.levels.daily[i] === "d") {
                    project_items[settings.levels.daily[i] + "-calc"] = "$" + settings.levels.daily[i] + "-calc";
                }
            }

            facetLine.push({
                "$project": project_items
            });


            var project_names = {vw: true, uvalue: true};
            for (let i = 0; i < settings.levels.daily.length; i++) {
                project_names[settings.levels.daily[i]] = "$" + settings.levels.daily[i];
                if (settings.levels.daily[i] === "scr" || settings.levels.daily[i] === "d") {
                    project_names[settings.levels.daily[i] + "-calc"] = "$" + settings.levels.daily[i] + "-calc";
                }
            }
            project_names.view = "$view_meta.view";
            project_names.display = {"$ifNull": ["$view_meta.display", "$view_meta.view"]};
            project_names.url = "$view_meta.url";
            project_names.domain = "$view_meta.domain";

            facetLine.push({
                "$project": project_names
            });

            facetLine.push(settings.sortby); //sort values*/
            if (settings.startPos) {
                facetLine.push({$skip: settings.startPos});
            }
            if (settings.dataLength !== 0) {
                facetLine.push({$limit: settings.dataLength || 50}); //limit count
            }

            pipeline.push({$facet: {data: facetLine, count: [{$count: 'count'}]}});
            common.db.collection(collectionName).aggregate(pipeline, {allowDiskUse: true}, function(err, res) {
                var cn = 0;
                var data = [];
                if (err) {
                    log.e(err);
                }
                if (res && res[0]) {
                    if (res[0].count && res[0].count[0]) {
                        cn = res[0].count[0].count || 0;
                    }
                    data = res[0].data || [];
                }
                callback(data, cn);
            });
        }
        else {
            var qq = settings.count_query || {};
            common.db.collection("app_viewsmeta" + app_id).count(qq, function(err, total) {
                common.db.collection(collectionName).aggregate(pipeline, {allowDiskUse: true}, function(err1, res) {
                    if (err1) {
                        log.e(err1);
                    }
                    res = res || [];
                    for (var p = 0;p < res.length; p++) {
                        var index = settings.dataNamingMap[res[p]._id];
                        for (let s in res[p]) {
                            settings.dataObject[index][s] = res[p][s];
                        }
                    }
                    callback(settings.dataObject, total);
                });
            });
        }

    }

    /** 
    * Helper function which users calculatedDataManager to fetch unique values from drill data
    * @param {object} params - request params
    * @param {object} data - information about views to update
    * @param {function} callback - callback function
    **/
    function getUniqueValuesForTable(params, data, callback) {
        var promises = [];
        var ret = {};

        var tz = countlyCommon.getTimezone(params) || "UTC";
        var currentRange = countlyCommon.getPeriodRange(params.qstring.period, tz);
        var query = {
            "a": params.qstring.app_id,
            "e": "[CLY]_view",
            "ts": currentRange,
            "n": {"$in": []}
        };
        if (params.qstring.segment && params.qstring.segmentVal) {
            query["sg." + params.qstring.segment] = params.qstring.segmentVal;
        }
        var mapper = {};
        for (var z = 0; z < data.length; z++) {
            query.n.$in.push(data[z].view);
            mapper[data[z].view] = z;
        }

        var queryParams = {};
        queryParams.adapter = params.qstring.db_override &&
                                            params.qstring.db_override !== 'compare' &&
                                            params.qstring.db_override !== 'config'
            ? params.qstring.db_override
            : undefined;

        queryParams.comparison = params.qstring.comparison === 'true' || params.qstring.comparison === true;


        promises.push(new Promise(function(resolve) {
            calculatedDataManager.longtask({
                db: common.db,
                threshold: plugins.getConfig("api").request_threshold / 2,
                app_id: params.qstring.app_id,
                no_cache: params.qstring.no_cache,
                query_data: {
                    "query": query
                },
                query_function: async function(query_data, callback2) {
                    try {
                        var my_data = await getUniqueCount(query_data, queryParams);
                        callback2(null, my_data);
                    }
                    catch (error) {
                        callback2(error);
                    }
                },
                outputData: function(err, data2) {
                    if (err) {
                        log.e(err);
                    }
                    if (data2 && data2.data) {
                        for (var k = 0; k < data2.data.length; k++) {
                            if (data[mapper[data2.data[k]._id]]) {
                                data[mapper[data2.data[k]._id]].u = data2.data[k].u;
                            }
                        }
                    }
                    ret.lu = data2?.lu;
                    ret.running = data2.running;
                    if (ret.lu) {
                        //get difference in seconds
                        ret.lu_diff = Math.floor((Date.now() - new Date(ret.lu).getTime()) / 1000);
                    }
                    resolve();
                }
            });
        }));


        Promise.all(promises).then(function() {
            ret.data = data;
            callback(ret);
        });

    }
    pluginOb.getAggregatedData = getAggregatedData;

    plugins.register("/o", function(ob) {
        var params = ob.params;


        var segment = params.qstring.segment || "";
        var segmentVal = params.qstring.segmentVal || "";
        if (params.qstring.method === "views") {
            validateRead(params, FEATURE_NAME, function() {
                var colName = "";
                var sortby;
                var startPos = 0;
                var dataLength = 0;
                var sortcol = "t";
                var selOptions;
                var columns;
                var query = [];

                var offset = 0;

                if (params.qstring.periodOffset) {
                    offset = Math.round(parseInt(params.qstring.periodOffset));
                    var dd = moment(new Date());
                    if (params.appTimezone) {
                        dd.tz(params.appTimezone);
                    }
                    var appOffset = dd.utcOffset();
                    offset = (appOffset + offset) / 60;
                }
                if (params.qstring.action === "getExportQuery") {
                    colName = "app_viewdata" + crypto.createHash('sha1').update(segment + params.app_id).digest('hex');
                    var settingsList = [ 'u', 't', 'd', 's', 'e', 'b', 'br', 'scr'/*, "uvc"*/];
                    columns = ['name', 'u', 't', 'd', 's', 'e', 'b', 'br', 'scr'/*, "uvc"*/];
                    selOptions = {app_id: params.qstring.app_id, sortby: sortby, sortcol: sortcol, segment: segment, segmentVal: segmentVal, unique: "u", levels: {daily: ["u", "t", "s", "b", "e", "d", "n", "scr", "br", "uvc"], monthly: ["u", "t", "s", "b", "e", "d", "n", "scr", "br", "uvc"]}};
                    sortby = {$sort: {"t": -1}};
                    if (params.qstring.iSortCol_0 && params.qstring.sSortDir_0) {
                        sortby.$sort = {};
                        sortcol = columns[parseInt(params.qstring.iSortCol_0, 10)];

                        if (sortcol === "d" || sortcol === "scr") {
                            if (params.qstring.sSortDir_0 === "asc") {
                                sortby.$sort[sortcol + "-calc"] = 1;
                            }
                            else {
                                sortby.$sort[sortcol + "-calc"] = -1;
                            }
                        }
                        else if (sortcol === "u") {
                            if (params.qstring.sSortDir_0 === "asc") {
                                sortby.$sort.u = 1;
                            }
                            else {
                                sortby.$sort.u = -1;
                            }
                        }
                        else if (sortcol === "name") {
                            if (params.qstring.sSortDir_0 === "asc") {
                                sortby.$sort.display = 1;
                            }
                            else {
                                sortby.$sort.display = -1;
                            }
                        }
                        else {
                            if (params.qstring.sSortDir_0 === "asc") {
                                sortby.$sort[sortcol] = 1;
                            }
                            else {
                                sortby.$sort[sortcol] = -1;
                            }
                        }
                    }

                    var pipeline = createAggregatePipeline(params, selOptions);
                    pipeline.push({
                        $lookup: {
                            from: "app_viewsmeta" + params.qstring.app_id,
                            localField: "_id",
                            foreignField: "_id",
                            as: "view_meta"
                        }
                    });
                    var project2 = {_id: {"$toString": "$_id"}, uvalue: true, "view_meta": {"$first": "$view_meta"}};
                    for (let i = 0; i < settingsList.length; i++) {
                        if (settingsList[i] === "scr") {
                            project2[settingsList[i]] = "$" + settingsList[i] + "-calc";
                        }
                        else if (settingsList[i] === "u") {
                            project2[settingsList[i]] = "$uvalue";
                        }
                        else {
                            project2[settingsList[i]] = "$" + settingsList[i];
                        }
                    }


                    pipeline.push({"$project": project2});

                    var project3 = {};
                    for (let i = 0; i < settingsList.length; i++) {
                        project3[settingsList[i]] = "$" + settingsList[i];
                    }
                    project3.view = "$view_meta.view";
                    project3.display = {"$ifNull": ["$view_meta.display", "$view_meta.view"]};
                    project3.url = "$view_meta.url";


                    pipeline.push({
                        "$project": project3
                    });
                    pipeline.push(sortby);

                    var pp = {"_id": true, "view": true, "url": true, "display": true};
                    for (let i = 0; i < settingsList.length; i++) {
                        pp[settingsList[i]] = true;
                    }
                    common.returnOutput(params, {db: "countly", "pipeline": pipeline, "collection": colName, "projection": pp});
                }
                if (params.qstring.action === 'getTable') {
                    colName = "app_viewdata";
                    columns = ['name', 't', 'd', 's', 'e', 'b', 'br', 'scr'];
                    sortby = {$sort: {"t": -1}};
                    var depends = {"t": {"$gt": 0}};
                    if (params.qstring.iSortCol_0 && params.qstring.sSortDir_0) {
                        sortby.$sort = {};
                        sortcol = columns[parseInt(params.qstring.iSortCol_0, 10)];

                        if (sortcol === "d" || sortcol === "scr") {
                            if (params.qstring.sSortDir_0 === "asc") {
                                sortby.$sort[sortcol + "-calc"] = 1;
                            }
                            else {
                                sortby.$sort[sortcol + "-calc"] = -1;
                            }
                        }
                        else if (sortcol === "u") {
                            if (params.qstring.sSortDir_0 === "asc") {
                                sortby.$sort.uvalue = 1;
                            }
                            else {
                                sortby.$sort.uvalue = -1;
                            }
                        }
                        else if (sortcol === "name") {

                            if (params.qstring.sSortDir_0 === "asc") {
                                sortby.$sort.display = 1;
                            }
                            else {
                                sortby.$sort.display = -1;
                            }
                        }
                        else {
                            if (params.qstring.sSortDir_0 === "asc") {
                                sortby.$sort[sortcol] = 1;
                            }
                            else {
                                sortby.$sort[sortcol] = -1;
                            }
                        }
                    }

                    if (params.qstring.iDisplayStart && parseInt(params.qstring.iDisplayStart, 10) !== 0) {
                        startPos = parseInt(params.qstring.iDisplayStart, 10);
                    }
                    if (params.qstring.iDisplayLength && parseInt(params.qstring.iDisplayLength, 10) !== -1) {
                        dataLength = parseInt(params.qstring.iDisplayLength, 10);
                    }
                    //var rightNow = Date.now();

                    selOptions = {offset: offset, app_id: params.qstring.app_id, startPos: startPos, dataLength: dataLength, sortby: sortby, depends: depends, sortcol: sortcol, segment: segment, segmentVal: segmentVal, unique: "u", levels: {daily: ["u", "t", "s", "b", "e", "d", "br", "scr"], monthly: ["u", "t", "s", "b", "e", "d", "br", "scr"]}};

                    if (params.qstring.sSearch && params.qstring.sSearch !== "") {
                        selOptions.count_query = {};
                        query = [{$addFields: {"sortcol": { $cond: [ "$display", "$display", "$view"] }}}];
                        if (params.qstring.sSearch && params.qstring.sSearch !== "") {
                            //Dealing with special symbols
                            params.qstring.sSearch = params.qstring.sSearch.replace(/\\/g, "\\\\");
                            params.qstring.sSearch = params.qstring.sSearch.replace(/\./g, "\\.");
                            params.qstring.sSearch = params.qstring.sSearch.replace(/\?/g, "\\?");
                            query.push({$match: {"sortcol": {$regex: ".*" + params.qstring.sSearch + ".*", $options: 'i'}}});
                            selOptions.count_query = {"view": {$regex: params.qstring.sSearch, $options: 'i'}};
                        }
                        if (sortcol === 'name') {
                            sortby.$sort = {};
                            if (params.qstring.sSortDir_0 === "asc") {
                                sortby.$sort.sortcol = 1;
                            }
                            else {
                                sortby.$sort.sortcol = -1;
                            }

                            query.push(sortby);
                            query.push({$skip: startPos});

                        }
                        if (dataLength !== 0 && sortcol === 'name') {
                            query.push({$limit: dataLength});
                        }
                        common.db.collection("app_viewsmeta").aggregate(query, {allowDiskUse: true}, function(err1, res) {
                            if (err1) {
                                log.e(err1);
                            }
                            selOptions.dataNamingMap = {};
                            selOptions.dataObject = res;
                            selOptions.onlyIDs = [];
                            if (res) {
                                for (let z = 0; z < res.length; z++) {
                                    selOptions.onlyIDs[z] = common.db.ObjectID(res[z]._id);
                                    selOptions.dataNamingMap[res[z]._id] = z;
                                }

                                getAggregatedData(colName, params, selOptions, function(data, total) {
                                    var values = ["u", "t", "s", "b", "e", "d", "scr", "br"];
                                    data = data || [];

                                    //log.e(params.qstring.period+"("+sortcol+") "+(Date.now()-rightNow)/1000);
                                    for (let z = 0; z < data.length; z++) {
                                        for (var p = 0; p < values.length; p++) {
                                            data[z][values[p]] = data[z][values[p]] || 0;
                                            if (values[p] === "br") {
                                                data[z][values[p]] = Math.round(data[z][values[p]] * 100);
                                            }
                                        }
                                        if (data[z].view_meta && data[z].view_meta[0]) {
                                            if (data[z].view_meta[0].view) {
                                                data[z].view = data[z].view_meta[0].view;
                                            }
                                            if (data[z].view_meta[0].url) {
                                                data[z].url = data[z].view_meta[0].url;
                                            }

                                            if (data[z].view_meta[0].sortcol) {
                                                data[z].display = data[z].view_meta[0].sortcol;
                                            }
                                        }
                                    }
                                    getUniqueValuesForTable(params, data, function(ret) {
                                        ret.sEcho = params.qstring.sEcho;
                                        ret.iTotalRecords = total || ret.data.length;
                                        ret.iTotalDisplayRecords = total || ret.data.length;
                                        common.returnOutput(params, ret);
                                    });
                                });
                            }
                            else {
                                common.returnOutput(params, {sEcho: params.qstring.sEcho, iTotalRecords: 0, iTotalDisplayRecords: 0, aaData: []});
                            }
                        });
                    }
                    else {
                        getAggregatedData(colName, params, selOptions, function(data, total) {
                            var values = ["u", "t", "s", "b", "e", "d", "scr", "br"];
                            data = data || [];
                            // log.e(params.qstring.period+"("+sortcol+") "+(Date.now()-rightNow)/1000);
                            for (var z = 0; z < data.length; z++) {
                                for (var p = 0; p < values.length; p++) {
                                    data[z][values[p]] = data[z][values[p]] || 0;
                                    if (values[p] === "br") {
                                        data[z][values[p]] = Math.round(data[z][values[p]] * 100);
                                    }
                                }
                                if (data[z].view_meta && data[z].view_meta[0]) {
                                    if (data[z].view_meta[0].view) {
                                        data[z].view = data[z].view_meta[0].view;
                                    }
                                    if (data[z].view_meta[0].url) {
                                        data[z].url = data[z].view_meta[0].url;
                                    }

                                    if (data[z].view_meta[0].display) {
                                        data[z].display = data[z].view_meta[0].display;
                                    }
                                }
                            }
                            getUniqueValuesForTable(params, data, function() {
                                common.returnOutput(params, {sEcho: params.qstring.sEcho, iTotalRecords: total || data.length, iTotalDisplayRecords: total || data.length, aaData: data});
                            });
                        });
                    }
                }
                else if (params.qstring.action === 'getTableNames') {
                    sortby = {$sort: {"sortcol": -1}};
                    sortcol = "sortcol";
                    var total = 100;
                    if (params.qstring.iDisplayStart && parseInt(params.qstring.iDisplayStart, 10) !== 0) {
                        startPos = parseInt(params.qstring.iDisplayStart, 10);
                    }
                    if (params.qstring.iDisplayLength && parseInt(params.qstring.iDisplayLength, 10) !== -1) {
                        dataLength = parseInt(params.qstring.iDisplayLength, 10);
                    }
                    query = [{"$match": {"_id": {"$regex": "^" + params.qstring.app_id + "_.*"}}}, {$addFields: {"sortcol": { $cond: [ "$display", "$display", "$view"] }}}];

                    if (params.qstring.iSortCol_0 && params.qstring.sSortDir_0) {
                        if (parseInt(params.qstring.iSortCol_0, 10) === 1) {
                            sortcol = "view";
                            sortby = {$sort: {"view": -1}};
                        }
                        if (params.qstring.sSortDir_0 === "asc") {
                            sortby.$sort[sortcol] = 1;
                        }
                        else {
                            sortby.$sort[sortcol] = -1;
                        }
                    }
                    if (params.qstring.sSearch && params.qstring.sSearch !== "") {
                        query.push({$match: {"sortcol": {$regex: params.qstring.sSearch}}});
                    }
                    query.push(sortby);
                    var facetLine = [];
                    facetLine.push({$skip: startPos});
                    if (dataLength !== 0) {
                        facetLine.push({$limit: dataLength});
                    }

                    if (params.qstring.project) {
                        query.push({$project: {"Display name": "$sortcol", "view": 1}});
                    }
                    query.push({$facet: {data: facetLine, count: [{$count: 'count'}]}});
                    common.db.collection("app_viewsmeta").aggregate(query, {allowDiskUse: true}, function(err1, res) {
                        if (err1) {
                            log.e(err1);
                        }
                        var data = [];
                        total = 0;
                        if (res && res[0]) {
                            data = res[0].data;
                            if (res[0].count && res[0].count[0]) {
                                total = res[0].count[0].count || 0;
                            }
                        }
                        common.returnOutput(params, {sEcho: params.qstring.sEcho, iTotalRecords: total || data.length, iTotalDisplayRecords: total || data.length, aaData: data});
                    });
                }
                else if (params.qstring.action === "get_view_count") {
                    if (params.app_id && params.app_id !== "") {
                        common.db.collection("app_viewsmeta").count({"_id": {"$regex": "^" + params.qstring.app_id + "_.*"}}, function(err, count) {
                            if (err) {
                                common.returnMessage(params, 200, 0);
                            }
                            else {
                                common.returnMessage(params, 200, count || 0);
                            }
                        });
                    }
                    else {
                        common.returnMessage(params, 400, "Missing request parameter: app_id");
                    }
                }
                else if (params.qstring.action === "getTotals") {
                    var settings = {offset: offset, app_id: params.qstring.app_id, startPos: 0, dataLength: 0, sortby: {}, sortcol: 0, segment: segment, segmentVal: segmentVal, unique: "u", levels: {daily: ["s", "u", "t", "b", "uvc"], monthly: ["u", "t", "s", "b", "uvc"] }};
                    var pipe = createAggregatePipeline(params, settings);
                    pipe.push({"$group": {"_id": null, "s": {"$sum": "$s"}, "t": {"$sum": "$t"}, "b": {"$sum": "$b"}}});
                    var collectionName = "app_viewdata";

                    var ret_data = {"_id": null, "t": 0, "b": 0, "s": 0, "uvc": 0};

                    var promises = [];
                    promises.push(new Promise(function(resolve) {
                        var tz = countlyCommon.getTimezone(params) || "UTC";
                        var currentRange = countlyCommon.getPeriodRange(params.qstring.period, tz);
                        var my_query = {
                            "a": params.qstring.app_id,
                            "e": "[CLY]_view",
                            "ts": currentRange
                        };

                        var queryParams = {};
                        queryParams.adapter = params.qstring.db_override &&
                                            params.qstring.db_override !== 'compare' &&
                                            params.qstring.db_override !== 'config'
                            ? params.qstring.db_override
                            : undefined;

                        queryParams.comparison = params.qstring.comparison === 'true' || params.qstring.comparison === true;

                        calculatedDataManager.longtask({
                            db: common.db,
                            no_cache: params.qstring.no_cache,
                            threshold: plugins.getConfig("api").request_threshold / 2,
                            app_id: params.qstring.app_id,
                            query_data: {
                                "query": my_query
                            },
                            async query_function(query_data, callback) {
                                try {
                                    var totals = await getTotals(query_data, queryParams);
                                    callback(null, totals);
                                }
                                catch (error) {
                                    log.e("Error occurred while fetching totals: " + error);
                                    callback("Error occurred while fetching totals" + error);
                                }
                            },
                            outputData: function(err, data) {
                                if (err) {
                                    log.e(err);
                                }
                                data = data || {};
                                if (data.data && data.data.u) {
                                    ret_data.u = data.data.u;
                                }
                                else {
                                    console.trace();
                                }
                                ret_data.lu = data.lu;
                                if (ret_data.lu) {
                                    //get difference in seconds
                                    ret_data.lu_diff = Math.floor((Date.now() - new Date(ret_data.lu).getTime()) / 1000);
                                }
                                if (data.running) {
                                    ret_data.running = true;
                                }
                                resolve();
                            }
                        });
                    }));
                    promises.push(new Promise(function(resolve) {
                        common.db.collection(collectionName).aggregate(pipe, {allowDiskUse: true}, function(err, res) {
                            if (err) {
                                log.e(err);
                            }
                            res = res || [];
                            res = res[0];
                            for (var key in res) {
                                ret_data[key] = res[key];
                            }
                            resolve();
                        });
                    }));

                    //all promises
                    Promise.all(promises).then(function() {
                        common.returnOutput(params, ret_data);
                    });
                }
                else if (params.qstring.action === "listNames") {
                    common.db.collection("app_viewsmeta").count({"_id": {"$regex": "^" + params.qstring.app_id + "_.*"}}, function(errCount, totalCn) {
                        if (!errCount && totalCn && totalCn < 10000) {
                            common.db.collection("app_viewsmeta").find({}, {view: 1, display: 1}).toArray(function(err, res) {
                                common.returnOutput(params, res || []);
                            });
                        }
                        else {
                            common.returnOutput(params, []);
                        }
                    });
                }
                else {
                    //Get graph data
                    var retData = {};
                    colName = "app_viewdata";
                    var graphKeys = [];
                    params.qstring.action = "";

                    if (params.qstring.selectedViews) {
                        try {
                            graphKeys = JSON.parse(params.qstring.selectedViews);
                        }
                        catch (err) {
                            graphKeys = [];
                        }
                    }
                    if (graphKeys.length === 0) {
                        common.returnOutput(params, {appID: params.qstring.app_id, data: []});
                    }
                    else {
                        var ids = [];
                        for (var k = 0; k < graphKeys.length; k++) {
                            ids.push(graphKeys[k].view);
                        }
                        common.db.collection("app_viewsmeta").find({"_id": {"$in": ids}}).toArray(function(err, res) {
                            if (err) {
                                log.e(err);
                            }
                            res = res || [];
                            for (var p = 0; p < res.length; p++) {
                                retData[res[p]._id + "_name"] = res[p].display || res[p].view;
                                for (var pz = 0; pz < graphKeys.length; pz++) {
                                    if (graphKeys[pz].view === res[p]._id) {
                                        graphKeys[pz].name = res[p].view;
                                    }
                                }
                            }

                            var tz = countlyCommon.getTimezone(params) || "UTC";
                            var currentRange = countlyCommon.getPeriodRange(params.qstring.period, tz);


                            var queryParams = {};
                            queryParams.adapter = params.qstring.db_override &&
                                            params.qstring.db_override !== 'compare' &&
                                            params.qstring.db_override !== 'config'
                                ? params.qstring.db_override
                                : undefined;

                            queryParams.comparison = params.qstring.comparison === 'true' || params.qstring.comparison === true;

                            Promise.each(graphKeys, function(viewid) {
                                return new Promise(function(resolve /*, reject*/) {
                                    var paramsObj = {};
                                    paramsObj.time = params.time;
                                    paramsObj.app_id = params.qstring.app_id;
                                    paramsObj.qstring = {};
                                    for (let prop in params.qstring) {
                                        paramsObj.qstring[prop] = params.qstring[prop];
                                    }
                                    //paramsObj.qstring.action = viewid.action || "";
                                    var levels = ["u", "t", "s", "b", "e", "d", "scr", "uvc"];

                                    if (!segment) {
                                        segment = "no-segment";
                                    }

                                    fetch.getTimeObj(colName, paramsObj, {dontBreak: true, id_prefix: (params.qstring.app_id + "_"), "id": segment, id_postfix: "_" + (viewid.view.replace(params.qstring.app_id + "_", "")), levels: {daily: levels, monthly: [ "t", "s", "b", "e", "d", "scr"]}}, function(data2) {
                                        if (offset) {
                                            var props = {"b": true, "t": true, "s": true, "d": true, "u": true, "scr": true, "e": true};
                                            //Trasform model to array, 
                                            var arrayData = common.convertModelToArray(data2, (segment !== "no-segment"));
                                            //log.e("arrayData: " + JSON.stringify(arrayData));
                                            // shift data, 
                                            arrayData = common.shiftHourlyData(arrayData, offset * -1);
                                            //log.e("arrayData(shifted): " + JSON.stringify(arrayData));
                                            // transform back to model.
                                            data2 = common.convertArrayToModel(arrayData, (segment !== "no-segment") ? segment : null, props);
                                            //log.e("rebuilded model" + JSON.stringify(data2));
                                        }
                                        var my_query = {
                                            "a": params.qstring.app_id,
                                            "e": "[CLY]_view",
                                            "ts": currentRange,
                                            "n": viewid.name
                                        };
                                        if (params.qstring.segment && params.qstring.segmentVal) {
                                            my_query["sg." + params.qstring.segment] = params.qstring.segmentVal;
                                        }

                                        calculatedDataManager.longtask({
                                            db: common.db,
                                            threshold: plugins.getConfig("api").request_threshold / 2,
                                            app_id: params.qstring.app_id,
                                            query_data: {
                                                "timezone": tz,
                                                "bucket": params.qstring.bucket,
                                                "query": my_query
                                            },
                                            query_function: async function(query_data, callback) {
                                                try {
                                                    var totals = await getGraphValues(query_data);
                                                    callback(null, totals);
                                                }
                                                catch (error) {
                                                    log.e("Error occurred while fetching totals: " + error);
                                                    callback("Error occurred while fetching totals" + error);
                                                }
                                            },
                                            outputData: function(err5, data3) {
                                                if (err5) {
                                                    log.e(err5);
                                                }
                                                // log.e("Current data2: " + JSON.stringify(data2));
                                                if (data3 && data3.data) {
                                                    common.applyUniqueOnModel(data2, data3.data, "u", params.qstring.segmentVal);
                                                }
                                                //log.e("after applying model" + JSON.stringify(data2));
                                                retData[viewid.view] = {};
                                                retData[viewid.view][segment] = data2;
                                                resolve();
                                            }
                                        });

                                    });

                                });
                            }).then(
                                function() {
                                    common.returnOutput(params, {appID: params.qstring.app_id, data: retData});
                                }
                            );
                        });
                    }
                }
            });
            return true;
        }
        else if (params.qstring.method === "get_view_segments") {
            validateRead(params, FEATURE_NAME, function() {
                var res = {segments: [], domains: []};
                common.db.collection("views").findOne({'_id': common.db.ObjectID(params.app_id)}, function(err1, res1) {
                    if (res1 && res1.segments) {
                        res.segments = res1.segments;
                        for (var k in res1.segments) {
                            res1.segments[k] = Object.keys(res1.segments[k]) || [];
                        }
                    }
                    if (res1 && res1.omit) {
                        res.omit = res1.omit;
                    }
                    if (common.drillDb && !params.qstring.skip_domains) {
                        var collectionName = "drill_events" + crypto.createHash('sha1').update("[CLY]_action" + params.qstring.app_id).digest('hex');
                        common.drillDb.collection(collectionName).findOne({"_id": "meta_v2"}, {_id: 0, "sg.domain": 1}, function(err3, meta1) {
                            if (meta1 && meta1.sg && meta1.sg.domain.values) {
                                res.domains = Object.keys(meta1.sg.domain.values);
                            }
                            common.drillDb.collection(collectionName).findOne({"_id": "meta"}, {_id: 0, "sg.domain": 1}, function(err4, meta2) {
                                if (meta2 && meta2.sg && meta2.sg.domain) {
                                    common.arrayAddUniq(res.domains, meta2.sg.domain.values);
                                }
                                var eventHash = crypto.createHash('sha1').update("[CLY]_action" + params.qstring.app_id).digest('hex');
                                collectionName = "drill_meta" + params.qstring.app_id;
                                common.drillDb.collection(collectionName).findOne({"_id": "meta_" + eventHash}, {_id: 0, "sg.domain": 1}, function(err5, meta) {
                                    if (meta && meta.sg && meta.sg.domain && meta.sg.domain.values) {
                                        common.arrayAddUniq(res.domains, Object.keys(meta.sg.domain.values));
                                    }
                                    common.returnOutput(params, res);
                                });
                            });

                        });
                    }
                    else {
                        common.returnOutput(params, res);
                    }
                });
            });
            return true;
        }
        return false;
    });

    /**
     * @param  {Object} params - Default parameters object
     * @returns {undefined} Returns nothing
     */
    async function getHeatmap(params) {
        const result = {types: [], data: [], domains: []};

        let device = {};
        try {
            device = JSON.parse(params.qstring.device);
        }
        catch (SyntaxError) {
            log.e('Parse device failed: ', params.qstring.device);
        }

        const actionType = params.qstring.actionType;

        if (!(device.minWidth >= 0) || !(device.maxWidth >= 0)) {
            common.returnMessage(params, 400, 'Bad request parameter: device');
            return false;
        }

        if (params.qstring.period) {
            //check if period comes from datapicker
            if (params.qstring.period.indexOf(',') !== -1) {
                try {
                    params.qstring.period = JSON.parse(params.qstring.period);
                }
                catch (SyntaxError) {
                    log.d('Parsing custom period failed!');
                    common.returnMessage(params, 400, 'Bad request parameter: period');
                    return false;
                }
            }
            else {
                switch (params.qstring.period) {
                case 'month':
                case 'day':
                case 'yesterday':
                case 'hour':
                    break;
                default:
                    if (!/([0-9]+)days/.test(params.qstring.period)) {
                        common.returnMessage(params, 400, 'Bad request parameter: period');
                        return false;
                    }
                    break;
                }
            }
        }
        else {
            common.returnMessage(params, 400, 'Missing request parameter: period');
            return false;
        }

        countlyCommon.setTimezone(params.appTimezone);
        countlyCommon.setPeriod(params.qstring.period);

        const periodObj = countlyCommon.periodObj;
        const matchQuery = {};
        const now = params.time.now.toDate();

        //create current period array if it does not exist
        if (!periodObj.currentPeriodArr) {
            periodObj.currentPeriodArr = [];

            //create a period array that starts from the beginning of the current year until today
            if (params.qstring.period === 'month') {
                for (let i = 0; i < (now.getMonth() + 1); i++) {
                    const moment1 = moment();
                    const daysInMonth = moment1.month(i).daysInMonth();

                    for (let j = 0; j < daysInMonth; j++) {
                        periodObj.currentPeriodArr.push(periodObj.activePeriod + '.' + (i + 1) + '.' + (j + 1));

                        // If current day of current month, just break
                        if ((i === now.getMonth()) && (j === (now.getDate() - 1))) {
                            break;
                        }
                    }
                }
            }
            //create a period array that starts from the beginning of the current month until today
            else if (params.qstring.period === 'day') {
                for (let i = 0; i < now.getDate(); i++) {
                    periodObj.currentPeriodArr.push(periodObj.activePeriod + '.' + (i + 1));
                }
            }
            //create one day period array
            else {
                periodObj.currentPeriodArr.push(periodObj.activePeriod);
            }
        }

        //get timestamps of start of days (DD-MM-YYYY-00:00) with respect to apptimezone for both beginning and end of period arrays
        let tmpArr;
        const ts = {};

        tmpArr = periodObj.currentPeriodArr[0].split('.');
        ts.$gte = moment(new Date(Date.UTC(parseInt(tmpArr[0]), parseInt(tmpArr[1]) - 1, parseInt(tmpArr[2]))));
        if (params.appTimezone) {
            ts.$gte.tz(params.appTimezone);
        }
        ts.$gte = ts.$gte.valueOf() - ts.$gte.utcOffset() * 60000;

        tmpArr = periodObj.currentPeriodArr[periodObj.currentPeriodArr.length - 1].split('.');
        ts.$lt = moment(new Date(Date.UTC(parseInt(tmpArr[0]), parseInt(tmpArr[1]) - 1, parseInt(tmpArr[2])))).add(1, 'days');
        if (params.appTimezone) {
            ts.$lt.tz(params.appTimezone);
        }
        ts.$lt = ts.$lt.valueOf() - ts.$lt.utcOffset() * 60000;

        matchQuery.ts = ts;
        matchQuery.a = params.qstring.app_id;
        matchQuery.e = '[CLY]_action';
        matchQuery['sg.width'] = {};
        matchQuery['sg.width'].$gt = device.minWidth;
        matchQuery['sg.width'].$lte = device.maxWidth;
        matchQuery['sg.type'] = actionType;

        const projectionQuery = {
            _id: 0,
            c: 1,
            'sg.type': 1,
            'sg.width': 1,
            'sg.height': 1
        };

        if (actionType === 'scroll') {
            projectionQuery['sg.y'] = 1;
            matchQuery['sg.view'] = params.qstring.view;
        }
        else {
            projectionQuery['sg.x'] = 1;
            projectionQuery['sg.y'] = 1;
            matchQuery['up.lv'] = params.qstring.view;
        }

        if (params.qstring.segment) {
            matchQuery['sg.segment'] = params.qstring.segment;
        }

        const aggregateQuery = [
            { $match: matchQuery },
        ];

        aggregateQuery.push({ $project: projectionQuery });

        try {
            const data = await common.drillDb.collection('drill_events').aggregate(aggregateQuery, { allowDiskUse: true }).toArray();
            result.data = data;
            common.returnOutput(params, result, true, params.token_headers);
        }
        catch (err) {
            log.e(err);
            common.returnMessage(params, 500, 'Error fetching drill events');
        }
    }

    plugins.register("/o/actions", function(ob) {
        var params = ob.params;

        if (common.drillDb && params.qstring && params.qstring.view) {
            if (params.req.headers["countly-token"]) {
                common.readBatcher.getOne("apps", {'key': params.qstring.app_key}, (err1, app) => {
                    if (!app) {
                        common.returnMessage(params, 401, 'User does not have view right for this application');
                        return false;
                    }
                    params.qstring.app_id = app._id + "";
                    authorize.verify_return({
                        db: common.db,
                        token: params.req.headers["countly-token"],
                        req_path: params.fullPath,
                        callback: function(owner, expires_after) {
                            if (owner) {
                                var token = params.req.headers["countly-token"];
                                if (expires_after < 600 && expires_after > -1) {
                                    authorize.extend_token({
                                        extendTill: Date.now() + 600000, //10 minutes
                                        token: params.req.headers["countly-token"],
                                        callback: function(/*err,res*/) {
                                            params.token_headers = {"countly-token": token, "content-language": token, "Access-Control-Expose-Headers": "countly-token"};
                                            params.app_id = app._id;
                                            params.app_cc = app.country;
                                            params.appTimezone = app.timezone;
                                            params.app = app;
                                            params.time = common.initTimeObj(params.appTimezone, params.qstring.timestamp);
                                            getHeatmap(params);
                                        }
                                    });

                                }
                                else {
                                    params.token_headers = {"countly-token": token, "content-language": token, "Access-Control-Expose-Headers": "countly-token"};
                                    params.app_id = app._id;
                                    params.app_cc = app.country;
                                    params.appTimezone = app.timezone;
                                    params.app = app;
                                    params.time = common.initTimeObj(params.appTimezone, params.qstring.timestamp);
                                    getHeatmap(params);
                                }
                            }
                            else {
                                common.returnMessage(params, 401, 'User does not have view right for this application');
                            }
                        }
                    });
                });
            }
            else {
                validateRead(params, FEATURE_NAME, getHeatmap);
            }
            return true;
        }
        else {
            common.returnMessage(params, 401, 'Please provide view for which to query data');
        }
        return false;
    });

    /**
	* @param   {object} params - params object
     * @param  {string} collection - collection name
	 * @param  {object} query - query object
	 * @param  {object} update - update object(for find and modify)
	 * @param  {object} options - db options object
	 * @param  {function} callback - callback function
     */
    function getViewNameObject(params, collection, query, update, options, callback) {
        if (plugins.getConfig("api", params.app && params.app.plugins, true).batch_read_processing === true) {
            common.readBatcher.getOne(collection, query, {}, (err, view) => {
                if (view) {
                    var good_value = true;
                    if (update && update.$set) {
                        for (var k in update.$set) {
                            if (common.getDescendantProp(view, k) !== update.$set[k]) {
                                good_value = false;
                            }
                        }
                    }
                    if (good_value) { //current record have same values - so keep them
                        callback(err, view);
                    }
                    else { //current record has different values - find and modify;
                        common.db.collection(collection).findAndModify(query, {}, update, options, function(err2, view2) {
                            callback(err2, view2);
                            common.readBatcher.invalidate(collection, query, {}, false);
                        });
                    }
                }
                else {
                    if (err) {
                        callback(err, view);
                    }
                    if (update) {
                        //we have no error and have no data - so we don't have record. Run find and modify
                        common.db.collection("app_viewsmeta" + params.app_id).estimatedDocumentCount(function(err1, total) {
                            if (total >= plugins.getConfig("views").view_limit) {
                                options.upsert = false;
                            }
                            common.db.collection(collection).findAndModify(query, {}, update, options, function(err2, view2) {
                                if (err2) {
                                    log.e(err);
                                }
                                if (view2 && view2.value) {
                                    callback(err, view2.value);
                                    common.readBatcher.invalidate(collection, query, {}, false);
                                }
                                else {
                                    callback(err, null);
                                }
                            });
                        });
                    }
                    else {
                        callback(err, view);
                    }
                }
            });
        }
        else { //no batch processing. run as before.
            if (update) {
                common.db.collection("app_viewsmeta" + params.app_id).estimatedDocumentCount(function(err1, total) {
                    if (total >= plugins.getConfig("views").view_limit) {
                        options.upsert = false;
                    }
                    common.db.collection(collection).findAndModify(query, {}, update, options, function(err, view) {
                        if (err) {
                            log.e(err);
                        }
                        if (view && view.value) {
                            callback(err, view.value);
                        }
                        else {
                            callback(err, null);
                        }
                    });
                });
            }
            else {
                common.db.collection(collection).findOne(query, function(err, view) {
                    callback(err, view);
                });
            }
        }
    }
    plugins.register("/session/post", async function(ob) {
        var params = ob.params;
        var user = params.app_user;
        if (user && user.vc) {
            var ranges = [
                    [0, 2],
                    [3, 5],
                    [6, 10],
                    [11, 15],
                    [16, 30],
                    [31, 50],
                    [51, 100]
                ],
                rangesMax = 101,
                calculatedRange,
                updateUsers = {},
                updateUsersZero = {},
                dbDateIds = common.getDateIds(params),
                monthObjUpdate = [];

            if (user.vc >= rangesMax) {
                calculatedRange = (ranges.length) + '';
            }
            else {
                for (var i = 0; i < ranges.length; i++) {
                    if (user.vc <= ranges[i][1] && user.vc >= ranges[i][0]) {
                        calculatedRange = i + '';
                        break;
                    }
                }
            }

            monthObjUpdate.push('vc.' + calculatedRange);
            common.fillTimeObjectMonth(params, updateUsers, monthObjUpdate);
            common.fillTimeObjectZero(params, updateUsersZero, 'vc.' + calculatedRange);
            var postfix = common.crypto.createHash("md5").update(params.qstring.device_id).digest('base64')[0];
            common.writeBatcher.add('users', params.app_id + "_" + dbDateIds.month + "_" + postfix, {'$inc': updateUsers});
            var update = {'$inc': updateUsersZero, '$set': {}};
            update.$set['meta_v2.v-ranges.' + calculatedRange] = true;
            common.writeBatcher.add('users', params.app_id + "_" + dbDateIds.zero + "_" + postfix, update);
            await new Promise(function(resolve) {
                common.db.collection("app_userviews" + params.app_id).find({_id: user.uid}).toArray(function(err, data) {
                    if (err) {
                        log.e(err);
                    }
                    data = data || [];
                    data = data[0] || {};
                    for (var vw in data) {
                        if (vw !== "_id") {
                            if (data[vw].ts >= user.ls) {
                                var sg = {'uvc': 1};
                                for (var key0 in (data[vw].sg || {})) {
                                    if (key0 === 'platform' || !escapedViewSegments[key0]) {
                                        sg[key0] = data[vw].sg[key0];
                                    }
                                }
                                recordMetrics(params, {"viewAlias": vw, key: "[CLY]_view", segmentation: sg}, user);
                            }
                        }
                    }
                    if (user.lv) {
                        var segmentation = {name: user.lv, exit: 1};

                        getViewNameObject(params, 'app_viewsmeta' + params.app_id, {'view': segmentation.name}, {$set: {'view': segmentation.name}}, {upsert: true, new: true}, function(err5, view) {
                            if (err5) {
                                log.e(err5);
                            }
                            if (view) {
                                if (data[(view._id + "")] && data[(view._id + "")].sg) {
                                    for (var key in data[(view._id + "")].sg) {
                                        if (key === 'platform' || !escapedViewSegments[key]) {
                                            segmentation[key] = data[(view._id + "")].sg[key];
                                        }
                                    }

                                }
                                if (parseInt(user.vc) === 1) {
                                    segmentation.bounce = 1;
                                }
                                params.viewsNamingMap = params.viewsNamingMap || {};
                                params.viewsNamingMap[segmentation.name] = view._id;
                                recordMetrics(params, {"viewAlias": view._id, key: "[CLY]_view", segmentation: segmentation}, user);

                                if (segmentation.exit || segmentation.bounce) {
                                    plugins.dispatch("/view/duration", {params: params, updateMultiViewParams: {exit: segmentation.exit, bounce: segmentation.bounce}, viewName: view._id});
                                }
                            }
                            checkViewQuery(ob.updates, 0, 0);
                            resolve();
                        });

                    }
                    else {
                        checkViewQuery(ob.updates, 0, 0);
                        resolve();
                    }

                    //update unique view vount for session

                });
            });
        }
    });

    plugins.register("/sdk/user_properties", function(ob) {
        return new Promise(function(resolve) {
            var params = ob.params;
            if (params.qstring.events && params.qstring.events.length && Array.isArray(params.qstring.events)) {
                if (!params.views) {
                    params.views = [];
                }
                params.viewsNamingMap = {};

                //do this before to make sure they are not processed before duration is added
                var current_views = {};
                var haveViews = false;
                var update;
                for (let p = 0; p < params.qstring.events.length; p++) {
                    var currE = params.qstring.events[p];
                    if (currE.key === "[CLY]_view") {
                        haveViews = true;
                        if (currE.segmentation && currE.segmentation.name) {
                            currE.dur = Math.round(currE.dur || currE.segmentation.dur || 0);
                            if (currE.dur && (currE.dur + "").length >= 10) {
                                currE.dur = 0;
                            }

                            if (currE.segmentation.visit) {
                                current_views[currE.segmentation.name] = current_views[currE.segmentation.name] || [];
                                var doc = {"index": p};
                                if (currE.segmentation._idv) {
                                    doc._idv = currE.segmentation._idv;
                                }
                                current_views[currE.segmentation.name].push(doc);
                            }
                            else {
                                if (current_views[currE.segmentation.name]) {
                                    var index = current_views[currE.segmentation.name][current_views[currE.segmentation.name].length - 1].index;
                                    if (currE.segmentation._idv) {
                                        for (var z = current_views[currE.segmentation.name].length - 2; z >= 0; z--) {
                                            if (current_views[currE.segmentation.name][z]._idv === currE.segmentation._idv) {
                                                index = current_views[currE.segmentation.name][z].index;
                                                break;
                                            }
                                        }
                                    }
                                    if (currE.dur) {
                                        params.qstring.events[index].dur += currE.dur; //add duration to this request
                                    }
                                    for (var seg in currE.segmentation) {
                                        if (seg !== 'dur' && seg !== "_idv") {
                                            params.qstring.events[index].segmentation = params.qstring.events[index].segmentation || {};
                                            params.qstring.events[index].segmentation[seg] = currE.segmentation[seg];
                                        }
                                    }
                                    params.qstring.events[p].dur = 0; //not use duration from this one anymore;
                                    params.qstring.events[p].skip = true;//as we have 
                                }
                            }
                            //App Users update
                            update = {$set: {lv: currE.segmentation.name}};
                            var inc = 0;
                            if (currE.segmentation.visit) {
                                inc++;
                                update.$max = {lvt: params.time.timestamp};
                            }
                            if (inc > 0) {
                                checkViewQuery(ob.updates, inc);
                                if (!update.$inc) {
                                    update.$inc = {};
                                }
                                update.$inc["data.views"] = inc;
                            }
                            ob.updates.push(update);
                        }
                    }
                    else if (currE.key === "[CLY]_action") {
                        haveViews = true;
                    }
                }
                //filter events and call functions to get view names
                var promises = [];
                params.qstring.events = params.qstring.events.filter(function(currEvent) {
                    if (currEvent.timestamp) {
                        params.time = common.initTimeObj(params.appTimezone, currEvent.timestamp);
                    }
                    if ((currEvent.key === "[CLY]_view" || currEvent.key === "[CLY]_action") && currEvent.skip) {
                        return false;
                    }

                    if (currEvent.key === "[CLY]_view") {
                        if (currEvent.segmentation && currEvent.segmentation.name) {
                            currEvent.dur = Math.round(currEvent.dur || currEvent.segmentation.dur || 0);
                            //bug from SDK possibly reporting timestamp instead of duration	
                            if (currEvent.dur && (currEvent.dur + "").length >= 10) {
                                currEvent.dur = 0;
                            }
                            promises.push(processView(params, currEvent));
                        }
                        return false;
                    }
                    else if (currEvent.key === "[CLY]_action") {
                        if (currEvent.segmentation && (currEvent.segmentation.name || currEvent.segmentation.view) && currEvent.segmentation.type && currEvent.segmentation.type === 'scroll') {
                            currEvent.scroll = 0;
                            if (currEvent.segmentation.y && currEvent.segmentation.height) {
                                var height = parseInt(currEvent.segmentation.height, 10);
                                if (height !== 0) {
                                    currEvent.scroll = parseInt(currEvent.segmentation.y, 10) * 100 / height;
                                }
                            }
                            promises.push(processView(params, currEvent));
                        }
                    }
                    return true;
                });
                if (haveViews) {
                    common.readBatcher.getOne("views", {'_id': common.db.ObjectID(params.app_id)}, (err3, viewInfo) => {
                        //Matches correct view naming
                        Promise.all(promises).then(function(results) {
                            var runDrill = [];
                            var haveVisit = {};
                            var lastView = {};
                            var segmentation = {};
                            var projection = {};
                            for (let p = 0; p < results.length; p++) {
                                if (results[p] !== false) {
                                    if (results[p].key === '[CLY]_view') {
                                        if (results[p].segmentation.visit) {
                                            params.views.push(results[p]);
                                            runDrill.push(results[p]);
                                        }
                                        else {
                                            var updateMultiViewParams = {};
                                            for (var k in results[p].segmentation) {
                                                updateMultiViewParams[k] = results[p].segmentation[k];
                                            }
                                            if (Object.keys(updateMultiViewParams).length > 0 || results[p].dur) {
                                                plugins.dispatch("/view/duration", {params: params, updateMultiViewParams: updateMultiViewParams, duration: results[p].dur, viewName: results[p].viewAlias, _idv: results[p].segmentation._idv});
                                            }
                                        }
                                        //geting all segment info
                                        if (results[p].segmentation.visit) {
                                            haveVisit[p] = true;
                                            lastView[results[p].viewAlias + '.ts'] = params.time.timestamp;
                                            try {
                                                segmentation[results[p].viewAlias + '.sg'] = JSON.parse(JSON.stringify(results[p].segmentation || {}));
                                            }
                                            catch (ee) {
                                                log.e(ee);
                                            }
                                            projection[results[p].viewAlias] = 1;
                                        }
                                        else {
                                            recordMetrics(params, results[p], params.app_user, null, viewInfo);
                                        }
                                    }
                                    else { //cly action
                                        recordMetrics(params, results[p], params.app_user, null, viewInfo);
                                    }
                                }
                            }

                            if (Object.keys(haveVisit).length > 0) {
                                common.db.collection('app_userviews' + params.app_id).findOneAndUpdate({'_id': params.app_user.uid}, {$max: lastView, "$set": segmentation}, {upsert: true, new: false, projection: projection}, function(err2, view2) {
                                    for (let p in haveVisit) {
                                        if (results[p] && results[p] !== false) {
                                            var currEvent = results[p];
                                            recordMetrics(params, currEvent, params.app_user, view2 && view2.ok ? view2.value : null, viewInfo);
                                        }
                                    }
                                });
                            }
                            if (runDrill.length > 0) {
                                plugins.dispatch("/plugins/drill", {params: params, dbAppUser: params.app_user, events: runDrill});
                            }

                        }, function(onfail) {
                            log.e(JSON.stringify(onfail || ""));
                        }).catch(function(rejection) {
                            log.e(rejection);
                        });
                        resolve();
                    });
                }
                else {
                    resolve();
                }
            }
            else {
                resolve();
            }
        });
    });

    /**
     * Function to process view
     * @param  {Object} params - Default parameters object
     * @param  {Object} currEvent - Current event object
	 * @returns {Object} Promise - Promise
     */
    function processView(params, currEvent) {
        return new Promise(function(resolve) {
            var updateData = {};

            if (currEvent.segmentation.view) {
                updateData.url = currEvent.segmentation.view;
            }
            if (currEvent.segmentation.domain) {
                updateData['domain.' + common.db.encode(currEvent.segmentation.domain)] = true;
            }

            var query = {};
            if (currEvent.segmentation.name) {
                if (currEvent.segmentation.name.length > plugins.getConfig("views").view_name_limit) {
                    currEvent.segmentation.name = currEvent.segmentation.name.slice(0, plugins.getConfig("views").view_name_limit);
                }
                query = {'view': currEvent.segmentation.name};
                updateData.view = currEvent.segmentation.name;
                var options = {upsert: true, new: true};

                getViewNameObject(params, 'app_viewsmeta' + params.app_id, query, {$set: updateData}, options, function(err, view) {
                    if (view && view._id) {
                        params.viewsNamingMap[currEvent.segmentation.name] = view._id;
                        var escapedMetricVal = common.db.encode(view._id + "");
                        currEvent.viewAlias = escapedMetricVal;
                        resolve(currEvent);
                    }
                    else {
                        resolve(false);
                    }
                });
            }
            else if (currEvent.segmentation.view) {
                query = {$or: [{'view': currEvent.segmentation.view}, {'url': currEvent.segmentation.view}]};
                getViewNameObject(params, 'app_viewsmeta' + params.app_id, query, null, null, function(err, view) {
                    if (view) {
                        currEvent.viewAlias = common.db.encode(view._id + "");
                        resolve(currEvent);
                    }
                    else {
                        resolve(false);
                    }
                });
            }
            else {
                resolve(false);
            }
        });
    }

    /**
     * Function to record metrics
     * @param  {Object} params - Default parameters object
     * @param  {Object} currEvent - Current event object
     * @param  {Object} user - User
     * @param  {Object} view - View object
     * @param {Object} viewInfo - view info object
     */
    function recordMetrics(params, currEvent, user, view, viewInfo) {
        viewInfo = viewInfo || {};
        viewInfo.segments = viewInfo.segments || {};
        viewInfo.omit = viewInfo.omit || [];

        //making sure metrics are strings
        // tmpSet["meta_v2." + tmpMetric.set + "." + escapedMetricVal] = true;
        var save_structure = false; //if we need to update views record
        var forbiddenSegValues = [];

        for (let i = 1; i < 32; i++) {
            forbiddenSegValues.push(i + "");
        }
        for (let i = 1; i < 53; i++) {
            forbiddenSegValues.push("w" + i);
        }
        var segmentList = [""];
        var addToSetRules = {};
        if (currEvent.segmentation) {
            for (let segKey in currEvent.segmentation) {
                let tmpSegKey = "";
                if (segKey.indexOf('.') !== -1 || segKey.substr(0, 1) === '$') {
                    tmpSegKey = segKey.replace(/^\$|\./g, "");
                    currEvent.segmentation[tmpSegKey] = currEvent.segmentation[segKey];
                    delete currEvent.segmentation[segKey];
                    segKey = tmpSegKey;
                }
                if (segKey === "segment") {
                    //backwards compability
                    currEvent.segmentation.platform = currEvent.segmentation[segKey];
                    segKey = "platform";
                }
                let tmpSegVal = currEvent.segmentation[segKey] + "";
                if (!(escapedViewSegments[segKey] === true) && !(Array.isArray(viewInfo.omit) && viewInfo.omit.indexOf(segKey) !== -1)) {
                    if (!viewInfo.segments[segKey] && (segKey === 'platform' || Object.keys(viewInfo.segments).length < plugins.getConfig("views").segment_limit)) {
                        viewInfo.segments[segKey] = {};
                    }
                    tmpSegVal = tmpSegVal.replace(/^\$/, "").replace(/\./g, ":");
                    if (forbiddenSegValues.indexOf(tmpSegVal) !== -1) {
                        tmpSegVal = "[CLY]" + tmpSegVal;
                    }

                    if (tmpSegVal) {
                        currEvent.segmentation[segKey] = tmpSegVal;
                        if (viewInfo.segments[segKey]) {
                            if (viewInfo.segments[segKey][tmpSegVal]) {
                                segmentList.push(segKey);
                            }
                            else {
                                if (Object.keys(viewInfo.segments[segKey]).length >= plugins.getConfig("views").segment_value_limit) {
                                    delete currEvent.segmentation[segKey];
                                }
                                else {
                                    viewInfo.segments[segKey][segKey] = true;
                                    segmentList.push(segKey);
                                    addToSetRules["segments." + segKey + "." + tmpSegVal] = true;
                                    save_structure = true;
                                }
                            }
                        }
                    }
                    else {
                        delete currEvent.segmentation[segKey];
                    }
                }
            }
        }
        if (save_structure) {
            common.writeBatcher.add('views', common.db.ObjectID(params.app_id), {'$set': addToSetRules});
        }
        var dateIds = common.getDateIds(params);
        for (let i = 0; i < segmentList.length; i++) {
            var segment = segmentList[i]; //segment key or "" if without segment

            var colName = "app_viewdata" + crypto.createHash('sha1').update(segment + params.app_id).digest('hex');//collection segment/app
            var tmpMetric = { name: "_segment", set: "sv", short_code: "sv" },
                tmpTimeObjZero = {},
                tmpTimeObjMonth = {},
                zeroObjUpdate = [],
                monthObjUpdate = [];

            var tmpZeroId = currEvent.viewAlias + "_" + dateIds.zero; //view_year
            var tmpMonthId = currEvent.viewAlias + "_" + dateIds.month; //view_month_doc

            var escapedMetricVal = "";
            var viewName = currEvent.viewAlias;
            var updateTimestamp = 0;
            if (segment !== "") {
                escapedMetricVal = common.db.encode(currEvent.segmentation[segment] + "");
            }

            var tmpSet = {};
            if (segment !== "") { //if we have segment
                tmpSet["meta_v2." + tmpMetric.set + "." + escapedMetricVal] = true;
                escapedMetricVal = escapedMetricVal + ".";//adding dot to work also when there is no segment
            }

            if (currEvent.segmentation.visit && currEvent.key === '[CLY]_view') {
                monthObjUpdate.push(escapedMetricVal + common.dbMap.total);
                tmpTimeObjZero['d.' + params.time.month + '.' + escapedMetricVal + common.dbMap.total] = 1;
                if (view && view[viewName] && typeof view[viewName] === 'object') {
                    if (view[viewName].ts) {
                        view[viewName] = view[viewName].ts;
                    }
                    else {
                        delete view[viewName];
                    }
                }
                //old if (view && !view[viewName]) {
                if (!view || !view[viewName]) {
                    monthObjUpdate.push(escapedMetricVal + common.dbMap.new);
                    tmpTimeObjZero['d.' + params.time.month + '.' + escapedMetricVal + common.dbMap.new] = 1;
                    if (!view) {
                        view = {};
                    }
                }
                if (view && view[viewName]) {
                    var lastViewTimestamp = view[viewName];
                    var currDate = common.getDate(params.time.timestamp, params.appTimezone),
                        lastViewDate = common.getDate(lastViewTimestamp, params.appTimezone),
                        secInMin = (60 * (currDate.minutes())) + currDate.seconds(),
                        secInHour = (60 * 60 * (currDate.hours())) + secInMin,
                        secInMonth = (60 * 60 * 24 * (currDate.date() - 1)) + secInHour,
                        secInYear = (60 * 60 * 24 * (common.getDOY(params.time.timestamp, params.appTimezone) - 1)) + secInHour;


                    var lastMoment = new moment(lastViewTimestamp);
                    lastMoment.tz(params.appTimezone);

                    if (lastViewTimestamp < (params.time.timestamp - secInMin)) {
                        tmpTimeObjMonth['d.' + params.time.day + '.' + params.time.hour + '.' + escapedMetricVal + common.dbMap.unique] = 1;
                    }

                    if (lastViewTimestamp < (params.time.timestamp - secInHour)) {
                        tmpTimeObjMonth['d.' + params.time.day + '.' + escapedMetricVal + common.dbMap.unique] = 1;
                    }
                    if ((lastViewDate.year() + "") === (params.time.yearly + "") && lastMoment.isoWeek() < params.time.weeklyISO) {
                        tmpTimeObjZero["d.w" + params.time.weeklyISO + '.' + escapedMetricVal + common.dbMap.unique] = 1;
                    }

                    if (lastViewTimestamp < (params.time.timestamp - secInMonth)) {
                        tmpTimeObjZero['d.' + params.time.month + '.' + escapedMetricVal + common.dbMap.unique] = 1;
                    }

                    if (lastViewTimestamp < (params.time.timestamp - secInYear)) {
                        tmpTimeObjZero['d.' + escapedMetricVal + common.dbMap.unique] = 1;
                    }
                    if (params.time.timestamp > lastViewTimestamp) {
                        updateTimestamp = params.time.timestamp;
                    }
                }
                else {
                    updateTimestamp = params.time.timestamp;
                    common.fillTimeObjectZero({"time": {"weekly": params.time.weeklyISO || params.time.weekly, "yearly": params.time.yearly, "month": params.time.month }}, tmpTimeObjZero, escapedMetricVal + common.dbMap.unique);
                    common.fillTimeObjectMonth(params, tmpTimeObjMonth, escapedMetricVal + common.dbMap.unique, 1, true);
                }
            }

            if (currEvent.segmentation.start) {
                monthObjUpdate.push(escapedMetricVal + 's');
                tmpTimeObjZero['d.' + params.time.month + '.' + escapedMetricVal + 's'] = 1;
            }

            if (currEvent.segmentation.exit) {
                monthObjUpdate.push(escapedMetricVal + 'e');
                tmpTimeObjZero['d.' + params.time.month + '.' + escapedMetricVal + 'e'] = 1;
            }


            if (currEvent.segmentation.bounce) {
                monthObjUpdate.push(escapedMetricVal + 'b');
                tmpTimeObjZero['d.' + params.time.month + '.' + escapedMetricVal + 'b'] = 1;
            }


            if (currEvent.segmentation.uvc) {
                monthObjUpdate.push(escapedMetricVal + 'uvc');
                tmpTimeObjZero['d.' + params.time.month + '.' + escapedMetricVal + 'uvc'] = 1;
            }

            common.fillTimeObjectZero(params, tmpTimeObjZero, zeroObjUpdate);
            common.fillTimeObjectMonth(params, tmpTimeObjMonth, monthObjUpdate, 1, true);

            if (currEvent.dur) {
                let dur = parseInt(currEvent.dur);
                common.fillTimeObjectMonth(params, tmpTimeObjMonth, escapedMetricVal + common.dbMap.duration, dur, true);
                tmpTimeObjZero['d.' + params.time.month + '.' + escapedMetricVal + common.dbMap.duration] = dur;
            }

            if (currEvent.scroll) {
                let dur = parseInt(currEvent.scroll);
                common.fillTimeObjectMonth(params, tmpTimeObjMonth, escapedMetricVal + 'scr', dur, true);
                tmpTimeObjZero['d.' + params.time.month + '.' + escapedMetricVal + 'scr'] = dur;
            }
            var update;
            if (segment === "") {
                segment = 'no-segment';
            }
            //year document
            if (Object.keys(tmpTimeObjZero).length || Object.keys(tmpSet).length) {
                tmpSet.m = dateIds.zero;
                tmpSet.a = params.app_id + "";
                tmpSet.vw = common.db.ObjectID(viewName);
                tmpSet.s = segment;
                update = {$set: tmpSet};
                if (Object.keys(tmpTimeObjZero).length) {
                    update.$inc = tmpTimeObjZero;
                }
                common.writeBatcher.add(colName, tmpZeroId, update);
            }

            //month document
            if (Object.keys(tmpTimeObjMonth).length) {
                update = {$set: {m: dateIds.month, a: params.app_id + "", vw: common.db.ObjectID(viewName), s: segment}};
                if (Object.keys(tmpTimeObjMonth).length) {
                    update.$inc = tmpTimeObjMonth;
                }
                common.writeBatcher.add(colName, tmpMonthId, update);
                // common.writeBatcher.add(colName, tmpMonthId + "_m", update2);
            }
        }
        if (updateTimestamp) {
            view[viewName] = updateTimestamp;
        }
    }

    plugins.register("/i/apps/create", function(ob) {
        var appId = ob.appId;
        common.db.collection('app_viewsmeta' + appId).ensureIndex({"view": 1}, {'unique': 1}, function() {});
    });

    plugins.register("/i/apps/delete", function(ob) {
        var appId = ob.appId;
        /* old  - run anyway*/
        common.db.collection('app_viewdata' + appId).drop(function() {});
        common.db.collection('app_views' + appId).drop(function() {});
        /* old end */

        common.db.collection("views").findOne({'_id': common.db.ObjectID(appId)}, {}, function(err, viewInfo) {
            //deleing user last view data
            common.db.collection('app_userviews' + appId).drop(function() {});
            common.db.collection('app_viewsmeta' + appId).drop(function() {});

            common.db.collection("app_viewdata").remove({"_id": {"$regex": "^" + appId + "_.*"}}, function() {});
            common.db.collection("app_viewsmeta").remove({"_id": {"$regex": "^" + appId + "_.*"}}, function() {});

            var colName = "app_viewdata" + crypto.createHash('sha1').update(appId).digest('hex');
            common.db.collection(colName).drop(function() {});
            if (viewInfo) {
                for (let segKey in viewInfo.segments) {
                    colName = "app_viewdata" + crypto.createHash('sha1').update(segKey + appId).digest('hex');
                    common.db.collection(colName).drop(function() {});
                }
            }
            colName = "app_viewdata" + crypto.createHash('sha1').update('platform' + appId).digest('hex');
            common.db.collection(colName).drop(function() {});
            common.db.collection("views").remove({'_id': common.db.ObjectID(appId)}, {}, function() {}); //remove views record
        });
        /*if (common.drillDb) {
            common.drillDb.collection("drill_events" + crypto.createHash('sha1').update("[CLY]_action" + appId).digest('hex')).drop(function() {});
            common.drillDb.collection("drill_events" + crypto.createHash('sha1').update("[CLY]_view" + appId).digest('hex')).drop(function() {});
        }*/
    });

    plugins.register("/i/apps/clear_all", function(ob) {
        var appId = ob.appId;
        common.db.collection('app_userviews' + appId).drop(function() {});
        common.db.collection("views").findOne({'_id': common.db.ObjectID(appId)}, {}, function(err, viewInfo) {
            common.db.collection('app_viewsmeta' + appId).drop(function() {
                //common.db.collection('app_viewsmeta' + appId).ensureIndex({"view": 1}, {'unique': 1}, function() {});
            });

            var colName = "app_viewdata" + crypto.createHash('sha1').update(appId).digest('hex');
            common.db.collection(colName).drop(function() {});
            if (viewInfo) {
                for (let segKey in viewInfo.segments) {
                    var colName2 = "app_viewdata" + crypto.createHash('sha1').update(segKey + appId).digest('hex');
                    common.db.collection(colName2).drop(function() {});
                }
            }
            common.db.collection("views").remove({'_id': common.db.ObjectID(appId)}, {}, function() {});

            common.db.collection("app_viewdata").remove({"_id": {"$regex": "^" + appId + "_.*"}}, function() {});
            common.db.collection("app_viewsmeta").remove({"_id": {"$regex": "^" + appId + "_.*"}}, function() {});
            /** old **/
            common.db.collection('app_viewdata' + appId).drop(function() {
                //common.db.collection("app_viewdata" + appId).insert({_id: "meta_v2"}, function() {});
            });
            common.db.collection('app_views' + appId).drop(function() {
                //common.db.collection('app_views' + appId).ensureIndex({"uid": 1}, function() {});
            });
            /** old end */
            /*if (common.drillDb) {
                common.drillDb.collection("drill_events" + crypto.createHash('sha1').update("[CLY]_action" + appId).digest('hex')).drop(function() {});
                common.drillDb.collection("drill_events" + crypto.createHash('sha1').update("[CLY]_view" + appId).digest('hex')).drop(function() {});
            }*/
        });
    });

    plugins.register("/i/apps/clear", function(ob) {
        var appId = ob.appId;
        var dates = ob.dates;
        common.db.collection("views").findOne({'_id': common.db.ObjectID(appId)}, {}, function(err, viewInfo) {
            var colName = "app_viewdata" + crypto.createHash('sha1').update(appId).digest('hex');
            common.db.collection(colName).remove({'m': {$nin: dates}});
            if (viewInfo) {
                for (let segKey in viewInfo.segments) {
                    colName = "app_viewdata" + crypto.createHash('sha1').update(segKey + appId).digest('hex');
                    common.db.collection(colName).remove({'m': {$nin: dates}});
                }
                //new merged model
                common.db.collection("app_viewdata").remove({"_id": {"$regex": "^" + appId + "_.*"}, 'm': {$nin: dates}}, function() {});
            }
        });
        //old format. 
        common.db.collection('app_viewdata' + appId).findOne({_id: "meta_v2"}, function(err, doc) {
            if (!err && doc && doc.segments) {
                var segments = Object.keys(doc.segments);
                segments.push("no-segment");
                var docs = [];
                for (var j = 0; j < segments.length; j++) {
                    for (var k = 0; k < dates.length; k++) {
                        docs.push(segments[j] + "_" + dates[k]);
                    }
                }
                common.db.collection('app_viewdata' + appId).remove({'_id': {$nin: docs}}, function() {});
            }
        });
        //old format end
        /*if (common.drillDb) {
            common.drillDb.collection("drill_events" + crypto.createHash('sha1').update("[CLY]_action" + appId).digest('hex')).remove({ts: {$lt: ob.moment.valueOf()}}, function() {});
            common.drillDb.collection("drill_events" + crypto.createHash('sha1').update("[CLY]_view" + appId).digest('hex')).remove({ts: {$lt: ob.moment.valueOf()}}, function() {});
        }*/
    });

    plugins.register("/i/apps/reset", function(ob) {
        var appId = ob.appId;
        //old collections
        common.db.collection('app_viewdata' + appId).drop(function() {
            //common.db.collection("app_viewdata" + appId).insert({_id: "meta_v2"}, function() {});
        });
        common.db.collection('app_views' + appId).drop(function() {
            //common.db.collection('app_views' + appId).ensureIndex({"uid": 1}, function() {});
        });
        //old done
        common.db.collection('app_userviews' + appId).drop(function() {});
        common.db.collection("views").findOne({'_id': common.db.ObjectID(appId)}, {}, function(err, viewInfo) {
            common.db.collection('app_viewsmeta' + appId).drop(function() {
                common.db.collection('app_viewsmeta' + appId).ensureIndex({"view": 1}, {'unique': 1}, function() {});
            });
            var colName = "app_viewdata" + crypto.createHash('sha1').update(appId).digest('hex');
            common.db.collection(colName).drop(function() {});
            if (viewInfo) {
                for (let segKey in viewInfo.segments) {
                    var colName2 = "app_viewdata" + crypto.createHash('sha1').update(segKey + appId).digest('hex');
                    common.db.collection(colName2).drop(function() {});
                }
            }

            common.db.collection("views").remove({'_id': common.db.ObjectID(appId)}, {}, function() {});
            //new merged model
            common.db.collection("app_viewdata").remove({"_id": {"$regex": "^" + appId + "_.*"}}, function() {});
            common.db.collection("app_viewsmeta").remove({"_id": {"$regex": "^" + appId + "_.*"}}, function() {});
        });


        /*if (common.drillDb) {
            common.drillDb.collection("drill_events" + crypto.createHash('sha1').update("[CLY]_action" + appId).digest('hex')).drop(function() {});
            common.drillDb.collection("drill_events" + crypto.createHash('sha1').update("[CLY]_view" + appId).digest('hex')).drop(function() {});
        }*/
    });

    plugins.register("/dashboard/data", function(ob) {
        return new Promise((resolve) => {
            var params = ob.params;
            var data = ob.widget;
            var allApps = data.apps;
            var customPeriod = data.custom_period;
            if (customPeriod && typeof customPeriod === 'object') {
                customPeriod = JSON.stringify(data.custom_period);
            }
            if (data.widget_type === "analytics" && data.data_type === "views") {
                var appId = data.apps[0];
                var paramsObj = {
                    app_id: appId,
                    app: allApps[appId],
                    appTimezone: allApps[appId] && allApps[appId].timezone,
                    qstring: {
                        period: customPeriod || params.qstring.period
                    },
                    time: common.initTimeObj(allApps[appId] && allApps[appId].timezone),
                    member: params.member
                };

                var sort_arr = {};
                if (data.views) {
                    for (var k = 0; k < data.views.length; k++) {
                        if (data.views[k] === "d" || data.views[k] === "scr") {
                            sort_arr[data.views[k] + "-calc"] = -1;
                        }
                        else if (data.views[k] === "u") {
                            sort_arr.uvalue = -1;
                        }
                        sort_arr[data.views[k]] = -1;
                    }
                }
                else {
                    sort_arr = {"t": -1};
                }
                var colName = "app_viewdata" + crypto.createHash('sha1').update("" + paramsObj.app_id).digest('hex');//collection segment/app
                getAggregatedData(colName, paramsObj, {app_id: paramsObj.app_id, startPos: 0, segment: "", segmentVal: "", dataLength: 10, sortby: {$sort: sort_arr}, sortcol: "t", unique: "u", levels: {daily: ["u", "t", "s", "b", "e", "d", "scr", "br"], monthly: ["u", "t", "s", "b", "e", "d", "scr", "br"]}}, function(dati/*, total*/) {
                    var values = ["u", "t", "s", "b", "e", "d", "scr", "br"];
                    dati = dati || [];
                    for (var z = 0; z < dati.length; z++) {
                        for (var p = 0; p < values.length; p++) {
                            dati[z][values[p]] = dati[z][values[p]] || 0;
                            if (values[p] === "br") {
                                dati[z][values[p]] = Math.round(dati[z][values[p]] * 1000) / 10 + " %";
                            }
                        }
                        dati[z].u = dati[z].uvalue || dati[z].u;
                        dati[z].views = dati[z]._id;
                    }

                    if (dati) {
                        dati = {chartData: dati};
                    }
                    data.dashData = {
                        isValid: true,
                        data: dati || { chartData: [] }
                    };
                    resolve();
                });
            }
            else {
                resolve();
            }
        });
    });

}(pluginOb));

module.exports = pluginOb;
