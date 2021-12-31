const { validateRead } = require('../../../api/utils/rights.js');
const crypto = require('crypto');
const plugins = require('../../pluginManager.js');
const FEATURE_NAME = 'heatmaps';
const common = require('../../../api/utils/common.js');
const log = common.log(FEATURE_NAME + ':api');
const { getAggregatedData, createAggregatePipeline } = require('./../../views/api/api.js');

plugins.register("/permissions/features", function(ob) {
    ob.features.push(FEATURE_NAME);
});

plugins.register("/o/heatmaps/views", function(ob) {
    const params = ob.params;
    validateRead(params, FEATURE_NAME, function() {
        var colName = "";
        var sortby;
        var startPos = 0;
        var dataLength = 0;
        var sortcol = "t";
        var selOptions;
        var columns;
        var query = [];
        var segment = params.qstring.segment || "";
        var segmentVal = params.qstring.segmentVal || "";
        colName = "app_viewdata" + crypto.createHash('sha1').update(segment + params.app_id).digest('hex');
        columns = ['name', 't', 'scr'];
        sortby = {$sort: {"t": -1}};
        if (params.qstring.iSortCol_0 && params.qstring.sSortDir_0) {
            sortby.$sort = {};
            sortcol = columns[parseInt(params.qstring.iSortCol_0, 10)];

            if (sortcol === "scr") {
                if (params.qstring.sSortDir_0 === "asc") {
                    sortby.$sort[sortcol + "-calc"] = 1;
                }
                else {
                    sortby.$sort[sortcol + "-calc"] = -1;
                }
            }
            else if (sortcol === "name") {
                if (params.qstring.sSortDir_0 === "asc") {
                    sortby.$sort.sortcol = 1;
                }
                else {
                    sortby.$sort.sortcol = -1;
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

        selOptions = {
            app_id: params.qstring.app_id,
            startPos: startPos,
            dataLength: dataLength,
            sortby: sortby,
            sortcol: sortcol,
            segment: segment,
            segmentVal: segmentVal,
            unique: "u",
            levels: {
                daily: [ "t", "scr"],
                monthly: ["t", "scr"]
            }
        };

        if (sortcol === 'name' || (params.qstring.sSearch && params.qstring.sSearch !== "")) {
            selOptions.count_query = {};

            query = [{$addFields: {"sortcol": { $cond: [ "$display", "$display", "$view"] }}}];
            if (params.qstring.sSearch && params.qstring.sSearch !== "") {
                query.push({$match: {"sortcol": {$regex: params.qstring.sSearch, $options: 'i'}}});
                selOptions.count_query = {"view": {$regex: params.qstring.sSearch, $options: 'i'}};
            }
            if (sortcol === 'name') {
                query.push(sortby);
                query.push({$skip: startPos});

            }
            if (dataLength !== 0 && sortcol === 'name') {
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
                        var values = [ "t", "scr"];
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
                var values = ["t", "scr"];
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
                common.returnOutput(params, {sEcho: params.qstring.sEcho, iTotalRecords: total || data.length, iTotalDisplayRecords: total || data.length, aaData: data});
            });
        }
    });
    return true;
});

plugins.register("/o/heatmaps/domains", function(ob) {
    const params = ob.params;
    validateRead(params, FEATURE_NAME, function() {
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
});

plugins.register("/o/heatmaps/metrics", function(ob) {
    const params = ob.params;
    validateRead(params, FEATURE_NAME, function() {
        var segment = params.qstring.segment || "";
        var segmentVal = params.qstring.segmentVal || "";
        var settings = {
            app_id: params.qstring.app_id,
            startPos: 0,
            dataLength: 0,
            sortby: {},
            sortcol: 0,
            segment: segment,
            segmentVal: segmentVal,
            unique: "u",
            levels: {
                daily: ["t", "scr"],
                monthly: ["t", "scr"]
            }
        };
        var pipe = createAggregatePipeline(params, settings);
        pipe.push({"$group": {"_id": null, "t": {"$sum": "$t"}, "scr": {"$sum": "$scr-calc"}}});
        var collectionName = "app_viewdata" + crypto.createHash('sha1').update(segment + params.app_id).digest('hex');
        common.db.collection(collectionName).aggregate(pipe, {allowDiskUse: true}, function(err, res) {
            if (err) {
                log.e(err);
            }
            res = res || [];
            res = res[0] || {"_id": null, "t": 0, "scr": 0};
            common.returnOutput(params, res);
        });
    });
    return true;
});

plugins.register("/o/heatmaps/export", function(ob) {
    const params = ob.params;
    validateRead(params, FEATURE_NAME, function() {
        var colName = "";
        var sortby;
        var sortcol = "t";
        var selOptions;
        var columns;
        var segment = params.qstring.segment || "";
        var segmentVal = params.qstring.segmentVal || "";
        colName = "app_viewdata" + crypto.createHash('sha1').update(segment + params.app_id).digest('hex');
        var settingsList = [ 'u', 't', 'scr'];
        columns = ['name', 'scr'];
        selOptions = {
            app_id: params.qstring.app_id,
            sortby: sortby,
            sortcol: sortcol,
            segment: segment,
            segmentVal: segmentVal,
            unique: "u",
            levels: {
                daily: [ "t", "scr"],
                monthly: ["t", "scr"]
            }
        };
        sortby = {$sort: {"t": -1}};
        if (params.qstring.iSortCol_0 && params.qstring.sSortDir_0) {
            sortby.$sort = {};
            sortcol = columns[parseInt(params.qstring.iSortCol_0, 10)];
            if (sortcol === "scr") {
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
    });
    return true;
});