var pluginOb = {},
    crypto = require('crypto'),
    request = require('request'),
    Promise = require("bluebird"),
    common = require('../../../api/utils/common.js'),
    moment = require('moment-timezone'),
    authorize = require('../../../api/utils/authorizer.js'),
    countlyCommon = require('../../../api/lib/countly.common.js'),
    plugins = require('../../pluginManager.js'),
    fetch = require('../../../api/parts/data/fetch.js'),
    log = common.log('views:api');

const escapedViewSegments = { "name": true, "segment": true, "height": true, "width": true, "y": true, "x": true, "visit": true, "start": true, "bounce": true, "exit": true, "type": true, "view": true, "domain": true, "dur": true};
//keys to not use as segmentation
(function() {
    plugins.setConfigs("views", {
        view_limit: 50000,
        view_name_limit: 100,
        segment_value_limit: 10,
        segment_limit: 100
    });

    plugins.internalDrillEvents.push("[CLY]_view");
    plugins.internalDrillEvents.push("[CLY]_action");

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

    plugins.register("/i/delete_view", function(ob) {
        var params = ob.params;
        var appId = params.qstring.app_id;
        var viewName = "";
        var viewUrl = "";
        var viewid = params.qstring.view_id;
        //var encodedUrl = common.db.encode(url);
        return new Promise(function(resolve) {
            const deleteDocs = [];
            common.db.collection("views").findOne({'_id': common.db.ObjectID(appId)}, {}, function(err1, viewInfo) {
                if (viewInfo) {
                    common.db.collection("app_viewsmeta" + appId).findOne({'_id': common.db.ObjectID(viewid)}, {}, function(err, viewrecord) {
                        if (viewrecord && viewrecord.view) {
                            viewName = viewrecord.view;
                            viewUrl = viewrecord.view;
                        }

                        if (viewrecord && viewrecord.url && viewrecord.url !== "") {
                            viewUrl = viewrecord.url;
                        }
                        //remove all data collections
                        for (let segKey in viewInfo.segments) {
                            var colName2 = "app_viewdata" + crypto.createHash('sha1').update(segKey + appId).digest('hex');
                            common.db.collection(colName2).remove({"vw": common.db.ObjectID(viewid)});
                        }
                        var colName = "app_viewdata" + crypto.createHash('sha1').update(appId).digest('hex');
                        common.db.collection(colName).remove({"vw": common.db.ObjectID(viewid)});

                        //remove from userviews
                        common.db.collection("app_userviews" + appId).update({}, {$unset: {viewid: 1}}, {multi: true});
                        //remove from meta
                        common.db.collection("app_viewsmeta" + appId).remove({'_id': common.db.ObjectID(viewid)});
                        if (common.drillDb) {
                            deleteDocs.push(common.drillDb.collection(
                                "drill_events" + crypto.createHash('sha1').update("[CLY]_view" + params.qstring.app_id).digest('hex')
                            ).remove({"sg.name": viewName}));
                            deleteDocs.push(common.drillDb.collection(
                                "drill_events" + crypto.createHash('sha1').update("[CLY]_action" + params.qstring.app_id).digest('hex')
                            ).remove({"sg.view": viewUrl}));
                        }
                        /** */
                        Promise.all(deleteDocs).then(function() {
                            resolve();
                            common.returnOutput(params, {result: true});
                        });
                    });
                }
                else {
                    resolve();
                    common.returnOutput(params, {result: false});
                }
            });
        });
    });

    plugins.register("/i/device_id", function(ob) {
        var appId = ob.app_id;
        var oldUid = ob.oldUser.uid;
        var newUid = ob.newUser.uid;
        if (oldUid !== newUid) {
            common.db.collection("app_userviews" + appId).find({_id: oldUid}).toArray(function(err, data) {
                const bulk = common.db._native.collection("app_userviews" + appId).initializeUnorderedBulkOp();
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
                common.db.collection("app_userviews" + appId).remove({_id: oldUid}, function(/*err, res*/) {});
            });
        }
    });

    plugins.register("/i/app_users/delete", function(ob) {
        var appId = ob.app_id;
        var uids = ob.uids;
        if (uids && uids.length) {
            common.db.collection("app_userviews" + appId).remove({_id: {$in: uids}}, function(/*err*/) {});
        }
    });

    plugins.register("/i/app_users/export", function(ob) {
        return new Promise(function(resolve/*, reject*/) {
            var uids = ob.uids;
            if (!ob.export_commands.views) {
                ob.export_commands.views = [];
            }
            ob.export_commands.views.push('mongoexport ' + ob.dbstr + ' --collection app_userviews' + ob.app_id + ' -q \'{_id:{$in: ["' + uids.join('","') + '"]}}\' --out ' + ob.export_folder + '/app_userviews' + ob.app_id + '.json');
            resolve();
        });
    });

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
        var app_id = settings.app_id;
        var pipeline = [];
        var period = params.qstring.period || '30days';

        var dates = [];
        var calcUvalue = [];
        var calcUvalue2 = [];
        for (let i = 0; i < 31; i++) {
            dates.push((i + 1) + "");
        }
        var weeks = [];
        for (let i = 0; i < 53; i++) {
            weeks.push("w" + (i + 1));
        }

        var segment = settings.segmentVal;
        if (segment !== "") {
            segment = segment + ".";
        }

        /** function creates branches for uvalues calculation
        * @param {array} a1 - list with time periods
        * @param {string} segmentVal - segment value
        * @returns {object} - select object
        */
        function createUvalues(a1, segmentVal) {
            var branches = {};
            for (let z = 0; z < a1.length; z++) {
                var vv = a1[z].split('.');
                if (vv.length <= 2) {
                    let yy = vv[0] + ":0";
                    if (!branches[vv[0] + ":0"]) {
                        branches[vv[0] + ":0"] = [];
                    }
                    vv[0] = "$d";
                    if (branches[yy].indexOf(vv.join(".") + "." + segmentVal + "u") === -1) {
                        branches[yy].push(vv.join(".") + "." + segmentVal + "u");
                    }
                }
                else {
                    let yy = vv[0] + ":" + vv[1];
                    if (!branches[yy]) {
                        branches[yy] = [];
                    }
                    if (branches[yy].indexOf("$d." + vv[2] + "." + segmentVal + "u") === -1) {
                        branches[yy].push("$d." + vv[2] + "." + segmentVal + "u");
                    }
                }
            }
            return branches;
        }

        var year_array = [];
        var curmonth = "";
        var periodObj = countlyCommon.getPeriodObj(params);
        var now = moment(periodObj.end - 1);
        var month_array = [];
        var last_pushed = "";
        var selectMap = {};
        var projector;
        if (settings && settings.onlyIDs) {
            pipeline.push({$match: {'vw': {'$in': settings.onlyIDs}}});
        }
        if (/([0-9]+)days/.test(period)) {
            //find out month documents
            for (let i = 0; i < periodObj.currentPeriodArr.length; i++) {
                let kk = periodObj.currentPeriodArr[i].split(".");
                if (!selectMap[kk[0] + ":" + kk[1]]) {
                    selectMap[kk[0] + ":" + kk[1]] = [];
                }
                selectMap[kk[0] + ":" + kk[1]].push("$d." + kk[2]);

                if (year_array.length === 0 && year_array[year_array.length - 1] !== kk[0]) {
                    year_array.push(kk[0]);
                    month_array.push({"_id": {$regex: ".*" + kk[0] + ":0"}});
                }
                if (last_pushed === "" || last_pushed !== kk[1]) {
                    last_pushed = kk[1];
                    month_array.push({"_id": {$regex: ".*" + kk[0] + ":" + kk[1] + "_m"}});
                }
            }
            var u0 = createUvalues(periodObj.uniquePeriodArr, segment);
            var u1 = createUvalues(periodObj.uniquePeriodCheckArr, segment);

            projector = {
                "_id": "$vw"
            };

            if (u0) {
                calcUvalue.push('$uvalue0');
                var branches0 = [];
                for (let i in u0) {
                    branches0.push({ case: { $eq: [ "$m", i ] }, then: {$sum: u0[i]}});
                }
                projector.uvalue0 = {$sum: {$switch: {branches: branches0, default: 0}}};
            }

            if (u1) {
                calcUvalue2.push('$uvalue1');
                var branches1 = [];
                for (let i in u1) {
                    branches1.push({ case: { $eq: [ "$m", i ] }, then: {$sum: u1[i]}});
                }
                projector.uvalue1 = {$sum: {$switch: {branches: branches1, default: 0}}};
            }

            for (let i = 0; i < settings.levels.daily.length; i++) {
                var branches2 = [];
                for (let z in selectMap) {
                    var sums = [];
                    for (let k = 0; k < selectMap[z].length; k++) {
                        sums.push(selectMap[z][k] + "." + segment + settings.levels.daily[i]);
                    }
                    branches2.push({ case: { $eq: [ "$m", z ] }, then: {$sum: sums}});

                }
                projector[settings.levels.daily[i]] = {$sum: {$switch: {branches: branches2, default: 0}}};
            }
            pipeline.push({$match: {$or: month_array}});
            pipeline.push({$group: projector});
        }
        else if (period === "month") { //this year
            curmonth = periodObj.activePeriod;
            pipeline.push({$match: {'_id': {$regex: ".*_" + curmonth + ":0"}}});

            var groupBy1 = {_id: "$vw"};
            for (let i = 0; i < settings.levels.monthly.length; i++) {
                var summed = [];
                for (let f = 1; f <= 12; f++) {
                    summed.push("$d." + f + "." + segment + settings.levels.monthly[i]);
                }
                if (settings.levels.daily[i] !== 'u') {
                    groupBy1[settings.levels.daily[i]] = {$sum: {$cond: [{ $eq: [ "$m", curmonth + ":0" ]}, {$sum: summed}, 0]}};
                }
                else {
                    groupBy1.uvalue = {$sum: {$cond: [{ $eq: [ "$m", curmonth + ":0" ]}, "$d." + segment + "u", 0]}};
                }
            }
            pipeline.push({$group: groupBy1});
        }
        else if (period === "day") { //this month
            curmonth = now.format('YYYY:M');
            var monthNumber = curmonth.split(':');
            var thisYear = now.format('YYYY');
            pipeline.push({$match: {'_id': {$regex: ".*_" + thisYear + ":0"}}});

            var groupBy0 = {_id: "$vw"};
            for (let i = 0; i < settings.levels.daily.length; i++) {
                if (settings.levels.daily[i] !== 'u') {
                    groupBy0[settings.levels.daily[i]] = {$sum: '$d.' + monthNumber[1] + '.' + segment + settings.levels.daily[i]};
                }
                else {
                    groupBy0.uvalue = {$sum: '$d.' + monthNumber[1] + '.' + segment + settings.levels.daily[i]};
                }
            }
            pipeline.push({$group: groupBy0});
        }
        else if (period === "yesterday" || period === "hour" || (periodObj.activePeriod && (periodObj.end + 1000 - periodObj.start) === 1000 * 60 * 60 * 24)) { //previous day or this day or day in any other time
            var this_date = periodObj.activePeriod.split(".");
            curmonth = this_date[0] + ":" + this_date[1];
            var curday = this_date[2];
            pipeline.push({$match: {'_id': {$regex: ".*_" + curmonth + "_m"}}});
            var p_a = {vw: true, _id: "$vw"};

            for (let i = 0; i < settings.levels.daily.length; i++) {
                p_a[settings.levels.daily[i]] = "$d." + curday + "." + segment + settings.levels.daily[i];
            }
            p_a.uvalue = "$d." + curday + "." + segment + "u";
            pipeline.push({$project: p_a});
        }
        else { //two timestamps
            period = JSON.parse(period);
            var start = moment(period[0]);
            var firstMonth = start.format('YYYY:M');
            var lastMonth = now.format('YYYY:M');
            var u00 = createUvalues(periodObj.uniquePeriodArr, segment);
            var u10 = createUvalues(periodObj.uniquePeriodCheckArr, segment);

            month_array = [];
            last_pushed = "";
            var fullMonths = {};
            for (let i = 0; i < periodObj.currentPeriodArr.length; i++) {
                let kk = periodObj.currentPeriodArr[i].split(".");
                var monthValue = [kk[0] + ":" + kk[1]];
                if (monthValue === firstMonth || monthValue === lastMonth) {
                    if (!selectMap[kk[0] + ":" + kk[1]]) {
                        selectMap[kk[0] + ":" + kk[1]] = [];
                    }
                    if (selectMap[kk[0] + ":" + kk[1]].indexOf("$d." + kk[2]) === -1) {
                        selectMap[kk[0] + ":" + kk[1]].push("$d." + kk[2]);
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

                if (year_array.length === 0 && year_array[year_array.length - 1] !== kk[0]) {
                    year_array.push(kk[0]);
                    month_array.push({"m": {$regex: kk[0] + ":0"}});
                }
                if (monthValue === firstMonth || monthValue === lastMonth) {
                    if (last_pushed === "" || last_pushed !== kk[1]) {
                        last_pushed = kk[1];

                        month_array.push({"_id": {$regex: ".*" + kk[0] + ":" + kk[1] + "_m"}});
                    }
                }
            }

            projector = {_id: "$vw"};
            if (u00) {
                calcUvalue.push('$uvalue0');
                var branches00 = [];
                for (let i in u00) {
                    branches00.push({ case: { $eq: [ "$m", i ] }, then: {$sum: u00[i]}});
                }
                projector.uvalue0 = {$sum: {$switch: {branches: branches00, default: 0}}};
            }

            if (u10) {
                calcUvalue2.push('$uvalue1');
                var branches01 = [];
                for (let i in u10) {
                    branches01.push({ case: { $eq: [ "$m", i ] }, then: {$sum: u10[i]}});
                }
                projector.uvalue1 = {$sum: {$switch: {branches: branches01, default: 0}}};
            }
            for (let i = 0; i < settings.levels.daily.length; i++) {

                var branches02 = [];
                for (let z in selectMap) {
                    var sums0 = [];
                    for (let k = 0; k < selectMap[z].length; k++) {
                        sums0.push(selectMap[z][k] + "." + segment + settings.levels.daily[i]);
                    }
                    branches02.push({ case: { $eq: [ "$m", z ] }, then: {$sum: sums0}});

                }
                for (let z in fullMonths) {
                    var sums1 = [];
                    for (let k = 0; k < fullMonths[z].length; k++) {
                        sums1.push("$d." + fullMonths[z][k] + "." + segment + settings.levels.daily[i]);
                    }
                    branches02.push({ case: { $eq: [ "$m", z + ":0" ] }, then: {$sum: sums1}});
                }
                projector[settings.levels.daily[i]] = {$sum: {$switch: {branches: branches02, default: 0}}};
            }
            pipeline.push({$match: {$or: month_array}});
            pipeline.push({$group: projector});

        }

        var pulling_attributes = {vw: true, uvalue: true};
        for (let i = 0; i < settings.levels.daily.length; i++) {
            if (settings.levels.daily[i] === 'd' || settings.levels.daily[i] === "scr") {
                pulling_attributes[settings.levels.daily[i] + "-calc"] = { $cond: [ { $or: [{$eq: ["$t", 0]}, {$eq: ['$' + settings.levels.daily[i], 0]}]}, 0, {'$divide': ['$' + settings.levels.daily[i], "$t"]}] } ;
            }
            pulling_attributes[settings.levels.daily[i]] = "$" + settings.levels.daily[i];
        }
        if (calcUvalue.length > 0 && calcUvalue2.length > 0) {
            pulling_attributes.uvalue = {$max: ["$n", {$min: [calcUvalue[0], calcUvalue2[0], "$t"]}]};
        }
        else {
            pulling_attributes.uvalue = true;
        }
        pipeline.push({$project: pulling_attributes});


        if (settings.sortcol !== 'name') {

            var facetLine = [];
            facetLine.push(settings.sortby); //sort values*/
            if (settings.startPos) {
                facetLine.push({$skip: settings.startPos});
            }
            if (settings.dataLength !== 0) {
                facetLine.push({$limit: settings.dataLength || 50}); //limit count
            }

            facetLine.push({
                $lookup: {
                    from: "app_viewsmeta" + app_id,
                    localField: "_id",
                    foreignField: "_id",
                    as: "view_meta"
                }
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
        else {
            var qq = settings.count_query || {};
            common.db.collection("app_viewsmeta" + app_id).find(qq).count(function(err, total) {
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
    plugins.register("/o", function(ob) {
        var params = ob.params;
        var validateUserForDataReadAPI = ob.validateUserForDataReadAPI;

        var segment = params.qstring.segment || "";
        var segmentVal = params.qstring.segmentVal || "";
        if (params.qstring.method === "views") {
            validateUserForDataReadAPI(params, function() {
                var colName = "";
                if (params.qstring.action === 'getTable') {
                    colName = "app_viewdata" + crypto.createHash('sha1').update(segment + params.app_id).digest('hex');
                    var columns = ['name', 'u', 'n', 't', 'd', 's', 'e', 'b', 'scr'];
                    var sortby = {$sort: {"t": -1}};
                    var sortcol = "t";
                    var startPos = 0;
                    var dataLength = 0;
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
                                sortby.$sort.view = 1;
                            }
                            else {
                                sortby.$sort.view = -1;
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

                    var selOptions = {app_id: params.qstring.app_id, startPos: startPos, dataLength: dataLength, sortby: sortby, sortcol: sortcol, segment: segment, segmentVal: segmentVal, unique: "u", levels: {daily: ["u", "t", "s", "b", "e", "d", "n", "scr"], monthly: ["u", "t", "s", "b", "e", "d", "n", "scr"]}};

                    if (sortcol === 'name' || params.qstring.sSearch) {
                        selOptions.count_query = {};
                        var query = [];
                        if (params.qstring.sSearch) {
                            query = [{$match: {"view": {$regex: params.qstring.sSearch}}}];
                            selOptions.count_query = {"view": {$regex: params.qstring.sSearch}};
                        }
                        if (sortcol === 'name') {
                            query.push(sortby);
                            query.push({$skip: startPos});

                        }
                        if (dataLength !== 0) {
                            query.push({$limit: dataLength});
                        }
                        common.db.collection("app_viewsmeta" + params.qstring.app_id).aggregate(query, {allowDiskUse: true}, function(err1, res) {
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
                                    var values = ["u", "t", "s", "b", "e", "d", "n", "scr", "uvalue"];
                                    data = data || [];

                                    //log.e(params.qstring.period+"("+sortcol+") "+(Date.now()-rightNow)/1000);
                                    for (let z = 0; z < data.length; z++) {
                                        for (var p = 0; p < values.length; p++) {
                                            data[z][values[p]] = data[z][values[p]] || 0;
                                        }
                                        if (data[z].view_meta && data[z].view_meta[0] && data[z].view_meta[0].view) {
                                            data[z].view = data[z].view_meta[0].view;
                                        }

                                        if (data[z].view_meta && data[z].view_meta[0] && data[z].view_meta[0].url) {
                                            data[z].url = data[z].view_meta[0].url;
                                        }
                                    }
                                    common.returnOutput(params, {sEcho: params.qstring.sEcho, iTotalRecords: total || data.length, iTotalDisplayRecords: total || data.length, aaData: data});
                                });
                            }
                            else {
                                common.returnOutput(params, {sEcho: params.qstring.sEcho, iTotalRecords: 0, iTotalDisplayRecords: 0, aaData: []});
                            }
                        });
                    }
                    else {
                        getAggregatedData(colName, params, selOptions, function(data, total) {
                            var values = ["u", "t", "s", "b", "e", "d", "n", "scr", "uvalue"];
                            data = data || [];

                            // log.e(params.qstring.period+"("+sortcol+") "+(Date.now()-rightNow)/1000);
                            for (var z = 0; z < data.length; z++) {
                                for (var p = 0; p < values.length; p++) {
                                    data[z][values[p]] = data[z][values[p]] || 0;
                                }
                                if (data[z].view_meta && data[z].view_meta[0] && data[z].view_meta[0].view) {
                                    data[z].view = data[z].view_meta[0].view;
                                }

                                if (data[z].view_meta && data[z].view_meta[0] && data[z].view_meta[0].url) {
                                    data[z].url = data[z].view_meta[0].url;
                                }
                            }
                            common.returnOutput(params, {sEcho: params.qstring.sEcho, iTotalRecords: total || data.length, iTotalDisplayRecords: total || data.length, aaData: data});
                        });
                    }
                }
                else if (params.qstring.action === "get_view_count") {
                    if (params.app_id && params.app_id !== "") {
                        common.db.collection("app_viewsmeta" + params.app_id).estimatedDocumentCount(function(err, count) {
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
                else {
                    var retData = {};
                    colName = "app_viewdata" + crypto.createHash('sha1').update(segment + params.app_id).digest('hex');
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

                    Promise.each(graphKeys, function(viewid) {
                        return new Promise(function(resolve /*, reject*/) {
                            var paramsObj = {};
                            paramsObj.time = params.time;
                            paramsObj.qstring = {};
                            for (let prop in params.qstring) {
                                paramsObj.qstring[prop] = params.qstring[prop];
                            }
                            paramsObj.qstring.action = viewid.action || "";
                            var levels = ["u", "t", "s", "b", "e", "d", "n", "scr"];
                            if (params.qstring.segmentVal && params.qstring.segmentVal !== "") {
                                fetch.getTimeObj(colName, paramsObj, {dontBreak: true, id: viewid.view, unique: "u", levels: {daily: levels, monthly: ["u", "t", "s", "b", "e", "d", "n", "scr"]}},
                                    function(data2) {
                                        retData[viewid.view] = {};
                                        retData[viewid.view][segment] = data2;
                                        resolve();
                                    });
                            }
                            else {
                                fetch.getTimeObj(colName, paramsObj, {dontBreak: true, id: viewid.view, unique: "u", levels: {daily: levels, monthly: ["u", "t", "s", "b", "e", "d", "n", "scr"]}}, function(data2) {
                                    retData[viewid.view] = {};
                                    retData[viewid.view]['no-segment'] = data2;
                                    resolve();
                                });
                            }
                        });
                    }).then(
                        function() {
                            common.returnOutput(params, {appID: params.qstring.app_id, data: retData});
                        }
                    );
                }
            });
            return true;
        }
        else if (params.qstring.method === "get_view_segments") {
            validateUserForDataReadAPI(params, function() {
                var res = {segments: [], domains: []};
                common.db.collection("views").findOne({'_id': common.db.ObjectID(params.app_id)}, function(err1, res1) {
                    if (res1 && res1.segments) {
                        res.segments = res1.segments;
                        for (var k in res1.segments) {
                            res1.segments[k] = Object.keys(res1.segments[k]) || [];
                        }
                    }
                    if (common.drillDb) {
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

    plugins.register("/o/urltest", function(ob) {
        var params = ob.params;
        if (params.qstring.url) {
            var options = {
                url: params.qstring.url,
                headers: {
                    'User-Agent': 'CountlySiteBot'
                }
            };
            request(options, function(error, response) {
                if (!error && response.statusCode >= 200 && response.statusCode < 400) {
                    common.returnOutput(params, {result: true});
                }
                else {
                    common.returnOutput(params, {result: false});
                }
            });
        }
        else {
            common.returnOutput(params, {result: false});
        }
        return true;
    });

    /**
     * @param  {Object} params - Default parameters object
     * @returns {undefined} Returns nothing
     */
    function getHeatmap(params) {
        var result = {types: [], data: []};

        var device = {};
        try {
            device = JSON.parse(params.qstring.device);
        }
        catch (SyntaxError) {
            console.log('Parse device failed: ', params.qstring.device);
        }

        var actionType = params.qstring.actionType;

        if (!(device.minWidth >= 0) || !(device.maxWidth >= 0)) {
            common.returnMessage(params, 400, 'Bad request parameter: device');
            return false;
        }
        var collectionName = "drill_events" + crypto.createHash('sha1').update("[CLY]_action" + params.qstring.app_id).digest('hex');
        common.drillDb.collection(collectionName).findOne({"_id": "meta_v2"}, {_id: 0, "sg.type": 1, "sg.domain": 1}, function(err1, meta) {
            if (meta && meta.sg && meta.sg.type) {
                result.types = Object.keys(meta.sg.type.values);
            }
            else {
                result.types = [];
            }
            if (meta && meta.sg && meta.sg.domain) {
                result.domains = Object.keys(meta.sg.domain.values).map(function(item) {
                    return common.db.decode(item);
                });
            }
            else {
                result.domains = [];
            }
            common.drillDb.collection(collectionName).findOne({"_id": "meta"}, {_id: 0, "sg.type": 1, "sg.domain": 1}, function(err2, meta2) {
                if (meta2 && meta2.sg && meta2.sg.type) {
                    common.arrayAddUniq(result.types, meta2.sg.type.values);
                }
                if (meta2 && meta2.sg && meta2.sg.domain) {
                    common.arrayAddUniq(result.domains, meta2.sg.domain.values);
                }
                var eventHash = crypto.createHash('sha1').update("[CLY]_action" + params.qstring.app_id).digest('hex');
                var collectionMeta = "drill_meta" + params.qstring.app_id;
                common.drillDb.collection(collectionMeta).findOne({"_id": "meta_" + eventHash}, {_id: 0, "sg.domain": 1}, function(err3, meta_event) {
                    if (meta_event && meta_event.sg && meta_event.sg.type) {
                        common.arrayAddUniq(result.types, Object.keys(meta_event.sg.type.values));
                    }
                    if (meta_event && meta_event.sg && meta_event.sg.domain) {
                        common.arrayAddUniq(result.domains, Object.keys(meta_event.sg.domain.values));
                    }

                    if (params.qstring.period) {
                        //check if period comes from datapicker
                        if (params.qstring.period.indexOf(",") !== -1) {
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
                            case "month":
                            case "day":
                            case "yesterday":
                            case "hour":
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
                    var periodObj = countlyCommon.periodObj,
                        queryObject = {},
                        now = params.time.now.toDate();

                    //create current period array if it does not exist
                    if (!periodObj.currentPeriodArr) {
                        periodObj.currentPeriodArr = [];

                        //create a period array that starts from the beginning of the current year until today
                        if (params.qstring.period === "month") {
                            for (let i = 0; i < (now.getMonth() + 1); i++) {
                                var moment1 = moment();
                                var daysInMonth = moment1.month(i).daysInMonth();

                                for (var j = 0; j < daysInMonth; j++) {
                                    periodObj.currentPeriodArr.push(periodObj.activePeriod + "." + (i + 1) + "." + (j + 1));

                                    // If current day of current month, just break
                                    if ((i === now.getMonth()) && (j === (now.getDate() - 1))) {
                                        break;
                                    }
                                }
                            }
                        }
                        //create a period array that starts from the beginning of the current month until today
                        else if (params.qstring.period === "day") {
                            for (let i = 0; i < now.getDate(); i++) {
                                periodObj.currentPeriodArr.push(periodObj.activePeriod + "." + (i + 1));
                            }
                        }
                        //create one day period array
                        else {
                            periodObj.currentPeriodArr.push(periodObj.activePeriod);
                        }
                    }

                    //get timestamps of start of days (DD-MM-YYYY-00:00) with respect to apptimezone for both beginning and end of period arrays
                    var tmpArr;
                    queryObject.ts = {};

                    tmpArr = periodObj.currentPeriodArr[0].split(".");
                    queryObject.ts.$gte = new Date(Date.UTC(parseInt(tmpArr[0]), parseInt(tmpArr[1]) - 1, parseInt(tmpArr[2])));
                    queryObject.ts.$gte.setTimezone(params.appTimezone);
                    queryObject.ts.$gte = queryObject.ts.$gte.getTime() + queryObject.ts.$gte.getTimezoneOffset() * 60000;

                    tmpArr = periodObj.currentPeriodArr[periodObj.currentPeriodArr.length - 1].split(".");
                    queryObject.ts.$lt = new Date(Date.UTC(parseInt(tmpArr[0]), parseInt(tmpArr[1]) - 1, parseInt(tmpArr[2])));
                    queryObject.ts.$lt.setDate(queryObject.ts.$lt.getDate() + 1);
                    queryObject.ts.$lt.setTimezone(params.appTimezone);
                    queryObject.ts.$lt = queryObject.ts.$lt.getTime() + queryObject.ts.$lt.getTimezoneOffset() * 60000;

                    queryObject["sg.width"] = {};
                    queryObject["sg.width"].$gt = device.minWidth;
                    queryObject["sg.width"].$lte = device.maxWidth;
                    queryObject["sg.type"] = actionType;

                    var projections = {
                        _id: 0,
                        c: 1,
                        "sg.type": 1,
                        "sg.width": 1,
                        "sg.height": 1
                    };

                    if (actionType === "scroll") {
                        projections["sg.y"] = 1;
                        queryObject["sg.view"] = params.qstring.view;
                    }
                    else {
                        projections["sg.x"] = 1;
                        projections["sg.y"] = 1;
                        queryObject["up.lv"] = params.qstring.view;
                    }

                    if (params.qstring.segment) {
                        queryObject["sg.segment"] = params.qstring.segment;
                    }
                    common.drillDb.collection(collectionName).find(queryObject, projections).toArray(function(err, data) {
                        result.data = data;
                        common.returnOutput(params, result, true, params.token_headers);
                    });
                });
            });
        });
    }

    plugins.register("/o/actions", function(ob) {
        var params = ob.params;
        var validateUserForDataReadAPI = ob.validateUserForDataReadAPI;
        if (common.drillDb && params.qstring.view) {
            if (params.req.headers["countly-token"]) {
                common.db.collection('apps').findOne({'key': params.qstring.app_key}, function(err1, app) {
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
                validateUserForDataReadAPI(params, getHeatmap);
            }
            return true;
        }
        else {
            common.returnMessage(params, 401, 'Please provide view for which to query data');
        }
        return false;
    });

    plugins.register("/session/post", function(ob) {
        return new Promise(function(resolve) {
            var params = ob.params;
            var dbAppUser = ob.dbAppUser;
            if (dbAppUser && dbAppUser.vc) {
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
                    common.db.collection('users').update({'_id': params.app_id + "_" + dbDateIds.month + "_" + postfix}, {'$inc': updateUsers}, function() {});
                    var update = {'$inc': updateUsersZero, '$set': {}};
                    update.$set['meta_v2.v-ranges.' + calculatedRange] = true;
                    common.db.collection('users').update({'_id': params.app_id + "_" + dbDateIds.zero + "_" + postfix}, update, function() {});

                    if (user.lv) {
                        var segmentation = {name: user.lv.replace(/^\$/, "").replace(/\./g, "&#46;"), exit: 1};
                        common.db.collection('app_viewsmeta' + params.app_id).findAndModify({'view': segmentation.name}, {}, {$set: {'view': segmentation.name}}, {upsert: true, new: true}, function(err, view) {
                            common.db.collection('app_userviews' + params.app_id).findOne({'_id': user.uid}, function(err2, view2) {
                                var LastTime = 0;
                                if (view2 && view2[view.value._id]) {
                                    LastTime = view2[view.value._id].ts;
                                }
                                if (ob.end_session || LastTime && params.time.timestamp - LastTime < 60) {
                                    if (parseInt(user.vc) === 1) {
                                        segmentation.bounce = 1;
                                    }
                                    params.viewsNamingMap = params.viewsNamingMap || {};
                                    params.viewsNamingMap[segmentation.name] = view.value._id;
                                    recordMetrics(params, {"viewAlias": view.value._id, key: "[CLY]_view", segmentation: segmentation}, user);
                                }
                            });
                        });
                    }
                    common.updateAppUser(params, {$set: {vc: 0}});
                    resolve();
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

    plugins.register("/i", function(ob) {
        return new Promise(function(resolve) {
            var params = ob.params;
            if (params.qstring.events && params.qstring.events.length && Array.isArray(params.qstring.events)) {
                if (!params.views) {
                    params.views = [];
                }
                params.viewsNamingMap = {};
                common.db.collection("views").findOne({'_id': params.app_id}, {}, function(err3, viewInfo) {
                    params.qstring.events = params.qstring.events.filter(function(currEvent) {
                        if (currEvent.timestamp) {
                            params.time = common.initTimeObj(params.appTimezone, currEvent.timestamp);
                        }
                        if (currEvent.key === "[CLY]_view") {
                            if (currEvent.segmentation && currEvent.segmentation.name) {
                                currEvent.dur = Math.round(currEvent.dur || currEvent.segmentation.dur || 0);
                                //bug from SDK possibly reporting timestamp instead of duration
                                if (currEvent.dur && (currEvent.dur + "").length >= 10) {
                                    currEvent.dur = 0;
                                }
                                processView(params, currEvent, viewInfo);
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
                                processView(params, currEvent, viewInfo);
                            }
                        }
                        return true;
                    });
                    resolve();
                });
            }
            else {
                resolve();
            }
        });
    });

    /**
     * Function to process view dta after getting view id
     * @param  {Object} currEvent - Current event object
     * @param  {Object} params - Default parameters object
     * @param  {Object} viewInfo - Object with info about segmentation
     */
    function processingData(currEvent, params, viewInfo) {
        if (currEvent.key === "[CLY]_view") {
            if (currEvent.segmentation.visit) {
                params.views.push(currEvent);
                var events = [currEvent];
                plugins.dispatch("/plugins/drill", {params: params, dbAppUser: params.app_user, events: events});
            }
            else {
                if (currEvent.dur) {
                    plugins.dispatch("/view/duration", {params: params, duration: currEvent.dur, viewName: currEvent.viewAlias});
                }
            }
        }
        //geting all segment info
        if (currEvent.segmentation.visit) {
            var lastView = {};
            lastView[currEvent.viewAlias + '.ts'] = params.time.timestamp;
            common.db.collection('app_userviews' + params.app_id).findAndModify({'_id': params.app_user.uid}, {}, {$max: lastView}, {upsert: true, new: false}, function(err2, view2) {
                recordMetrics(params, currEvent, params.app_user, view2 && view2.ok ? view2.value : null, viewInfo);
            });
        }
        else {
            recordMetrics(params, currEvent, params.app_user, null, viewInfo);
        }
    }

    /**
     * Function to process view
     * @param  {Object} params - Default parameters object
     * @param  {Object} currEvent - Current event object
     * @param  {Object} viewInfo - Object with info about segmentation
     */
    function processView(params, currEvent, viewInfo) {
        var update = {$set: {lv: currEvent.segmentation.name}};
        if (currEvent.segmentation.visit) {
            update.$inc = {vc: 1};
            update.$max = {lvt: params.time.timestamp};
        }
        common.updateAppUser(params, update);
        //getting this view base data
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

            common.db.collection("app_viewsmeta" + params.app_id).estimatedDocumentCount(function(err1, total) {
                var options = {upsert: true, new: true};
                if (total >= plugins.getConfig("views").view_limit) {
                    options.upsert = false;
                }

                common.db.collection('app_viewsmeta' + params.app_id).findAndModify(query, {}, {$set: updateData}, options, function(err, view) {
                    if (view && view.value && view.value._id) {
                        params.viewsNamingMap[currEvent.segmentation.name] = view.value._id;
                        var escapedMetricVal = common.db.encode(view.value._id + "");
                        currEvent.viewAlias = escapedMetricVal;
                        processingData(currEvent, params, viewInfo);
                    }
                });
            });
        }
        else if (currEvent.segmentation.view) {
            query = {$or: [{'view': currEvent.segmentation.view}, {'url': currEvent.segmentation.view}]};
            common.db.collection('app_viewsmeta' + params.app_id).findOne(query, function(err, view) {
                if (view) {
                    currEvent.viewAlias = common.db.encode(view._id + "");
                    processingData(currEvent, params, viewInfo);
                }
            });
        }


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
                if (!(escapedViewSegments[segKey] === true)) {
                    if (!viewInfo.segments[segKey] && (segKey === 'platform' || Object.keys(viewInfo.segments).length < plugins.getConfig("views").segment_limit)) {
                        viewInfo.segments[segKey] = {};
                    }
                    tmpSegVal = tmpSegVal.replace(/^\$/, "").replace(/\./g, ":");
                    if (forbiddenSegValues.indexOf(tmpSegVal) !== -1) {
                        tmpSegVal = "[CLY]" + tmpSegVal;
                    }
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
            }
        }
        if (save_structure) {
            common.db.collection('views').update({'_id': params.app_id}, {'$set': addToSetRules}, {'upsert': true}, function() {});
        }
        var dateIds = common.getDateIds(params);
        for (let i = 0; i < segmentList.length; i++) {
            var segment = segmentList[i]; //segment key or "" if without segment

            var colName = "app_viewdata" + crypto.createHash('sha1').update(segment + params.app_id).digest('hex');//collection segment/app
            var tmpMetric = { name: "_segment", set: "sv", short_code: "sv" },
                tmpTimeObjZero = {},
                tmpTimeObjMonth = {},
                zeroObjUpdate = [],
                monthObjUpdate = [],
                monthSmallerUpdate = {};

            var tmpZeroId = currEvent.viewAlias + "_" + dateIds.zero; //view_year
            var tmpMonthId = currEvent.viewAlias + "_" + dateIds.month; //view_month_doc

            var escapedMetricVal = "";
            var viewName = currEvent.viewAlias;
            if (segment !== "") {
                escapedMetricVal = common.db.encode(currEvent.segmentation[segment] + "");
            }

            var tmpSet = {};
            if (segment !== "") { //if we have segment
                tmpSet["meta_v2." + tmpMetric.set + "." + escapedMetricVal] = true;
                escapedMetricVal = escapedMetricVal + ".";//adding dot to work also when there is no segment
            }

            if (currEvent.segmentation.visit) {
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
                        secInMin = (60 * (currDate.getMinutes())) + currDate.getSeconds(),
                        secInHour = (60 * 60 * (currDate.getHours())) + secInMin,
                        secInMonth = (60 * 60 * 24 * (currDate.getDate() - 1)) + secInHour,
                        secInYear = (60 * 60 * 24 * (common.getDOY(params.time.timestamp, params.appTimezone) - 1)) + secInHour;

                    if (lastViewTimestamp < (params.time.timestamp - secInMin)) {
                        tmpTimeObjMonth['d.' + params.time.day + '.' + params.time.hour + '.' + escapedMetricVal + common.dbMap.unique] = 1;
                    }

                    if (lastViewTimestamp < (params.time.timestamp - secInHour)) {
                        tmpTimeObjMonth['d.' + params.time.day + '.' + escapedMetricVal + common.dbMap.unique] = 1;
                        monthSmallerUpdate['d.' + params.time.day + '.' + escapedMetricVal + common.dbMap.unique] = 1;
                    }

                    if (lastViewDate.getFullYear() === params.time.yearly &&
                        Math.ceil(common.moment(lastViewDate).tz(params.appTimezone).format("DDD") / 7) < params.time.weekly) {
                        tmpTimeObjZero["d.w" + params.time.weekly + '.' + escapedMetricVal + common.dbMap.unique] = 1;
                    }

                    if (lastViewTimestamp < (params.time.timestamp - secInMonth)) {
                        tmpTimeObjZero['d.' + params.time.month + '.' + escapedMetricVal + common.dbMap.unique] = 1;
                    }

                    if (lastViewTimestamp < (params.time.timestamp - secInYear)) {
                        tmpTimeObjZero['d.' + escapedMetricVal + common.dbMap.unique] = 1;
                    }
                }
                else {
                    common.fillTimeObjectZero(params, tmpTimeObjZero, escapedMetricVal + common.dbMap.unique);
                    common.fillTimeObjectMonth(params, tmpTimeObjMonth, escapedMetricVal + common.dbMap.unique, 1, true);
                    common.fillTimeObjectMonth(params, monthSmallerUpdate, escapedMetricVal + common.dbMap.unique, 1, false);
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

            common.fillTimeObjectZero(params, tmpTimeObjZero, zeroObjUpdate);
            common.fillTimeObjectMonth(params, tmpTimeObjMonth, monthObjUpdate, 1, true);
            common.fillTimeObjectMonth(params, monthSmallerUpdate, monthObjUpdate, 1, false);

            if (currEvent.dur) {
                let dur = parseInt(currEvent.dur);
                common.fillTimeObjectMonth(params, tmpTimeObjMonth, escapedMetricVal + common.dbMap.duration, dur, true);
                common.fillTimeObjectMonth(params, monthSmallerUpdate, escapedMetricVal + common.dbMap.duration, dur, false);
                tmpTimeObjZero['d.' + params.time.month + '.' + escapedMetricVal + common.dbMap.duration] = dur;
            }

            if (currEvent.scroll) {
                let dur = parseInt(currEvent.scroll);
                common.fillTimeObjectMonth(params, tmpTimeObjMonth, escapedMetricVal + 'scr', dur, true);
                common.fillTimeObjectMonth(params, monthSmallerUpdate, escapedMetricVal + 'scr', dur, false);
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
                common.db.collection(colName).update({'_id': tmpZeroId}, update, {'upsert': true}, function() {});
            }

            //month document
            if (Object.keys(tmpTimeObjMonth).length) {
                update = {$set: {m: dateIds.month, a: params.app_id + "", vw: common.db.ObjectID(viewName), s: segment}};
                if (Object.keys(tmpTimeObjMonth).length) {
                    update.$inc = tmpTimeObjMonth;
                }

                var update2 = {$set: {m: dateIds.month, a: params.app_id + "", vw: common.db.ObjectID(viewName), s: segment}};
                if (Object.keys(monthSmallerUpdate).length) {
                    update2.$inc = monthSmallerUpdate;
                }
                common.db.collection(colName).update({'_id': tmpMonthId}, update, {'upsert': true}, function() {});
                common.db.collection(colName).update({'_id': tmpMonthId + "_m"}, update2, {'upsert': true}, function() {});
            }
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
        if (common.drillDb) {
            common.drillDb.collection("drill_events" + crypto.createHash('sha1').update("[CLY]_action" + appId).digest('hex')).drop(function() {});
            common.drillDb.collection("drill_events" + crypto.createHash('sha1').update("[CLY]_view" + appId).digest('hex')).drop(function() {});
        }
    });

    plugins.register("/i/apps/clear_all", function(ob) {
        var appId = ob.appId;
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
            /** old **/
            common.db.collection('app_viewdata' + appId).drop(function() {
                //common.db.collection("app_viewdata" + appId).insert({_id: "meta_v2"}, function() {});
            });
            common.db.collection('app_views' + appId).drop(function() {
                //common.db.collection('app_views' + appId).ensureIndex({"uid": 1}, function() {});
            });
            /** old end */
            if (common.drillDb) {
                common.drillDb.collection("drill_events" + crypto.createHash('sha1').update("[CLY]_action" + appId).digest('hex')).drop(function() {});
                common.drillDb.collection("drill_events" + crypto.createHash('sha1').update("[CLY]_view" + appId).digest('hex')).drop(function() {});
            }
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
        if (common.drillDb) {
            common.drillDb.collection("drill_events" + crypto.createHash('sha1').update("[CLY]_action" + appId).digest('hex')).remove({ts: {$lt: ob.moment.valueOf()}}, function() {});
            common.drillDb.collection("drill_events" + crypto.createHash('sha1').update("[CLY]_view" + appId).digest('hex')).remove({ts: {$lt: ob.moment.valueOf()}}, function() {});
        }
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
        });
        if (common.drillDb) {
            common.drillDb.collection("drill_events" + crypto.createHash('sha1').update("[CLY]_action" + appId).digest('hex')).drop(function() {});
            common.drillDb.collection("drill_events" + crypto.createHash('sha1').update("[CLY]_view" + appId).digest('hex')).drop(function() {});
        }
    });

    plugins.register("/dashboard/data", function(ob) {
        return new Promise((resolve) => {
            var params = ob.params;
            var data = ob.data;
            params.app_id = data.apps[0];

            if (data.widget_type === "views") {
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
                var colName = "app_viewdata" + crypto.createHash('sha1').update("" + params.app_id).digest('hex');//collection segment/app
                getAggregatedData(colName, params, {app_id: params.app_id, startPos: 0, segment: "", segmentVal: "", dataLength: 10, sortby: {$sort: sort_arr}, sortcol: "t", unique: "u", levels: {daily: ["u", "t", "s", "b", "e", "d", "n", "scr"], monthly: ["u", "t", "s", "b", "e", "d", "n", "scr"]}}, function(dati/*, total*/) {
                    var values = ["u", "t", "s", "b", "e", "d", "n", "scr", "uvalue"];
                    dati = dati || [];
                    for (var z = 0; z < dati.length; z++) {
                        for (var p = 0; p < values.length; p++) {
                            dati[z][values[p]] = dati[z][values[p]] || 0;
                        }
                        dati[z].u = dati[z].uvalue || dati[z].u;
                        dati[z].views = dati[z]._id;
                        if (dati[z].view_meta && dati[z].view_meta[0] && dati[z].view_meta[0].view) {
                            dati[z].views = dati[z].view_meta[0].view;
                        }
                    }
                    if (dati) {
                        dati = {chartData: dati};
                    }
                    data.dashData = {
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