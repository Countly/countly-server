var plugin = {},
    common = require('../../../api/utils/common.js'),
    fetch = require("../../../api/parts/data/fetch.js"),
    crypto = require("crypto"),
    async = require("async"),
    fs = require("fs"),
    path = require("path"),
    Duplex = require('stream').Duplex,
    Promise = require("bluebird"),
    trace = require("./parts/stacktrace.js"),
    plugins = require('../../pluginManager.js'),
    { validateCreate, validateRead, validateUpdate, validateDelete } = require('../../../api/utils/rights.js');
var log = common.log('crashes:api');
const FEATURE_NAME = 'crashes';

/**
* Crash metrics
* cr_u    - simply users but tracked for crash plugin (can't use users from core aggregated data, because it needs more segmentation, like by app version, etc)
* cr_s    - simply sessions but tracked for crash plugin (can't use users from core aggregated data, because it needs more segmentation, like by app version, etc)
*
* crfses  - crash fatal free sessions (how many users experienced any fatal crash in selected period)
* crauf   - crash fatal free users (how many users experienced any fatal crash in selected period)
*
* crnfses - crash non fatal free sessions (how many users experienced any non fatal crash in selected period)
* craunf  - crash non fatal free users (how many users experienced any non fatal crash in selected period)
*
* cruf    - unique fatal crashes (on per crash group) per period
* crunf   - unique non fatal crashes (one per crash group) per period
*
* crf     - crash fatal (simply fatal crash count)
* crnf    - non fatal crashes (simply non fatal crash count)
*
* DEPRECATED (NOT USED ANYMORE)
* cr - crash (no matter fatal or non fatal)
* cru - crash user (no matter fatal or non fatal)
* crru - crash resolved user (users who upgraded and got crashes resolved from upgraded vesion)
*/

(function() {
    plugins.register("/permissions/features", function(ob) {
        ob.features.push(FEATURE_NAME);
    });
    plugins.register("/master", function() {
        fs.chmod(path.resolve(__dirname + "/../bin/minidump_stackwalk"), 0o744, function(err) {
            if (err && !process.env.COUNTLY_CONTAINER) {
                console.log(err);
            }
        });
    });
    var bools = {"root": true, "online": true, "muted": true, "signal": true, "background": true};
    plugins.internalDrillEvents.push("[CLY]_crash");

    plugins.register("/i/device_id", function(ob) {
        var appId = ob.app_id;
        var oldUid = ob.oldUser.uid;
        var newUid = ob.newUser.uid;
        if (oldUid !== newUid) {
            return new Promise(function(resolve, reject) {
                common.db.collection("app_crashusers" + appId).find({uid: oldUid}).toArray(function(err, res) {
                    if (err) {
                        log.e(err);
                        reject();
                        return;
                    }
                    if (res && res.length) {
                        try {
                            const bulk = common.db.collection("app_crashusers" + appId).initializeUnorderedBulkOp();
                            for (let i = 0; i < res.length; i++) {
                                const updates = {};
                                for (const key of ['last', 'sessions']) {
                                    if (res[i][key]) {
                                        if (!updates.$max) {
                                            updates.$max = {};
                                        }
                                        updates.$max[key] = res[i][key];
                                    }
                                }
                                for (const key of ['reports', 'crashes', 'fatal']) {
                                    if (res[i][key]) {
                                        if (!updates.$inc) {
                                            updates.$inc = {};
                                        }
                                        updates.$inc[key] = res[i][key];
                                    }
                                }
                                const group = res[i].group;
                                if (Object.keys(updates).length) {
                                    bulk.find({uid: newUid, group: group}).upsert().updateOne(updates);
                                }
                                bulk.find({uid: oldUid, group: group}).delete();
                            }
                            bulk.execute(function(bulkerr) {
                                if (bulkerr) {
                                    console.log(bulkerr);
                                    reject();
                                }
                                else {
                                    resolve();
                                }
                            });
                        }
                        catch (exc) {
                            log.e(exc);
                            reject("Failed to merge crashes");
                        }
                    }
                    else {
                        resolve();
                    }
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
            await common.db.collection("app_crashusers" + appId).remove({uid: {$in: uids}});
        }
    });

    plugins.register("/i/app_users/export", function(ob) {
        return new Promise(function(resolve) {
            var uids = ob.uids;
            if (uids && uids.length) {
                if (!ob.export_commands.crashes) {
                    ob.export_commands.crashes = [];
                }
                ob.export_commands.crashes.push({cmd: 'mongoexport', args: [...ob.dbargs, '--collection', 'app_crashusers' + ob.app_id, '-q', '{"uid":{"$in": ["' + uids.join('","') + '"]}}', '--out', ob.export_folder + '/crashusers' + ob.app_id + '.json']});
                resolve();
            }
        });
    });

    //read api call
    plugins.register("/o", function(ob) {
        var obParams = ob.params;

        if (obParams.qstring.method === 'reports') {
            validateRead(obParams, FEATURE_NAME, function(params) {
                var report_ids = [];

                if (params.qstring.report_ids) {
                    try {
                        report_ids = JSON.parse(params.qstring.report_ids);
                    }
                    catch (ex) {
                        console.log("Cannot parse report ids", params.qstring.report_ids);
                    }
                }
                else if (params.qstring.report_id) {
                    report_ids = [params.qstring.report_id];
                }

                report_ids = report_ids.map(function(rid) {
                    return common.db.ObjectID(rid);
                });
                common.drillDb.collection("drill_events").find({"a": (params.app_id + ""), "e": "[CLY]_crash", "n": {$in: report_ids}}).toArray(function(err, reports) {
                    var reportMap = {};

                    reports.forEach(function(rep) {
                        reportMap[rep._id] = rep;
                    });

                    common.returnOutput(params, reportMap);
                });
            });
            return true;
        }
        else if (obParams.qstring.method === 'crashes') {
            validateRead(obParams, FEATURE_NAME, async function(params) {
                if (params.qstring.group) {
                    if (params.qstring.userlist) {
                        common.db.collection('app_crashusers' + params.app_id).find({group: params.qstring.group}, {uid: 1, _id: 0}).toArray(function(err, uids) {
                            var res = [];
                            for (var i = 0; i < uids.length; i++) {
                                res.push(uids[i].uid);
                            }
                            common.returnOutput(params, res);
                        });
                    }
                    else {
                        common.db.collection('app_users' + params.app_id).estimatedDocumentCount(function(err, total) {
                            common.db.collection('app_crashgroups' + params.app_id).findOne({groups: params.qstring.group}, function(crashGroupsErr, result) {
                                if (result) {
                                    trace.postprocessCrash(result);
                                    result.total = total;
                                    result.url = common.crypto.createHash('sha1').update(params.app_id + result._id + "").digest('hex');
                                    if (result.comments) {
                                        for (var i = 0; i < result.comments.length; i++) {
                                            if (result.comments[i].author_id === params.member._id + "") {
                                                result.comments[i].is_owner = true;
                                            }
                                        }
                                    }
                                    //Fetch from drill. If not enough - check old collections.
                                    var cursor0 = common.drillDb.collection("drill_events").find({"a": (params.app_id + ""), "e": "[CLY]_crash", "n": (result._id + "")}).sort({ts: -1});
                                    cursor0.limit(plugins.getConfig("crashes").report_limit);
                                    cursor0.toArray(function(cursorErr, res0) {
                                        if (cursorErr) {
                                            log.e("Error fetching crash reports from drill: " + cursorErr);
                                        }
                                        res0 = res0 || [];
                                        console.log("Fetched " + res0.length + " crash reports from drill for crash group " + result._id);
                                        if (res0 && res0.length) {
                                            for (var z = 0; z < res0.length; z++) {
                                                //Converts to usual format
                                                res0[z].sg = res0[z].sg || {};
                                                var dd = res0[z].sg;
                                                dd.ts = res0[z].ts;
                                                dd._id = res0[z]._id;
                                                for (var bkey in bools) {
                                                    if (res0[z].sg[bkey] === "true") {
                                                        res0[z].sg[bkey] = 1;
                                                    }
                                                    else if (res0[z].sg[bkey] === "false") {
                                                        res0[z].sg[bkey] = 0;
                                                    }
                                                }
                                                var rw = ["not_os_specific", "nonfatal", "javascript", "native_cpp", "plcrash"];
                                                for (var ii = 0; ii < rw.length; ii++) {
                                                    if (res0[z].sg[rw[ii]] === "true") {
                                                        res0[z].sg[rw[ii]] = true;
                                                    }
                                                    else if (res0[z].sg[rw[ii]] === "false") {
                                                        res0[z].sg[rw[ii]] = false;
                                                    }
                                                }
                                                dd.custom = res0[z].custom || {};
                                                for (var key in res0[z].sg) {
                                                    if (key.indexOf("custom_") === 0) {
                                                        dd.custom[key.replace("custom_", "")] = res0[z].sg[key];
                                                    }
                                                }
                                                dd.group = res0[z].n;
                                                dd.uid = res0[z].uid;
                                                dd.cd = res0[z].cd;
                                                res0[z] = dd;
                                                trace.postprocessCrash(res0[z]);
                                            }
                                            result.data = res0;
                                        }
                                        common.returnOutput(params, result);
                                    });
                                    if (result.is_new) {
                                        common.db.collection('app_crashgroups' + params.app_id).update({groups: params.qstring.group}, {$set: {is_new: false}}, function() {});
                                        common.db.collection('app_crashgroups' + params.app_id).update({_id: "meta"}, {$inc: {isnew: -1}}, function() {});
                                    }
                                }
                                else {
                                    common.returnMessage(params, 400, 'Crash group not found');
                                }
                            });
                        });
                    }
                }
                else if (params.qstring.list) {
                    common.db.collection('app_users' + params.app_id).estimatedDocumentCount(function(errCount, total) {
                        if (!errCount && total && total < 10000) {
                            common.db.collection('app_crashgroups' + params.app_id).find({}, {name: 1}).toArray(function(err, crashes) {
                                if (crashes) {
                                    const crashData = crashes.filter(crash => crash._id !== 'meta').map(crash => ({
                                        _id: crash._id,
                                        name: (crash.name + "").split("\n")[0].trim(),
                                    }));

                                    common.returnOutput(params, crashData || []);
                                }
                                else {
                                    common.returnOutput(params, []);
                                }
                            });
                        }
                        else {
                            common.returnOutput(params, []);
                        }
                    });
                }
                else if (params.qstring.graph) {
                    var result = {};
                    common.db.collection('app_users' + params.app_id).estimatedDocumentCount(function(err, total) {
                        result.users = {};
                        result.users.total = total;
                        result.users.affected = 0;
                        result.users.fatal = 0;
                        result.users.nonfatal = 0;
                        result.crashes = {};
                        result.crashes.total = 0;
                        result.crashes.unique = 0;
                        result.crashes.resolved = 0;
                        result.crashes.unresolved = 0;
                        result.crashes.fatal = 0;
                        result.crashes.nonfatal = 0;
                        result.crashes.news = 0;
                        result.crashes.renewed = 0;
                        result.crashes.os = {};
                        result.crashes.highest_app = "";
                        result.crashes.app_version = {};
                        result.loss = 0;
                        common.db.collection('app_crashgroups' + params.app_id).findOne({_id: "meta"}, function(crashGroupsErr, meta) {
                            if (meta) {
                                result.users.affected = meta.users || 0;
                                result.users.fatal = meta.usersfatal || 0;
                                result.users.nonfatal = result.users.affected - result.users.fatal;
                                result.crashes.total = meta.reports || 0;
                                result.crashes.unique = meta.crashes || 0;
                                result.crashes.resolved = meta.resolved || 0;
                                result.crashes.unresolved = result.crashes.unique - result.crashes.resolved;
                                result.crashes.fatal = meta.fatal || 0;
                                result.crashes.nonfatal = meta.nonfatal || 0;
                                result.crashes.news = meta.isnew || 0;
                                result.crashes.renewed = meta.reoccurred || 0;
                                result.crashes.os = meta.os || {};
                                result.crashes.app_version = meta.app_version || {};
                                result.loss = meta.loss || 0;

                                var max = "0:0";
                                for (var j in meta.app_version) {
                                    if (meta.app_version[j] > 0 && common.versionCompare(j, max) > 0) {
                                        result.crashes.highest_app = j.replace(/:/g, '.');
                                        max = j;
                                    }
                                }
                            }
                            var options = {unique: ["cru", "crau", "crauf", "craunf", "cruf", "crunf", "cr_u"]/*, levels:{daily:["cr","crnf","cru","crf", "crru"], monthly:["cr","crnf","cru","crf", "crru"]}*/};

                            if (params.qstring.os || params.qstring.app_version) {
                                var props = [];
                                props.push(params.qstring.os || "any");
                                props.push(params.qstring.app_version || "any");
                                props.push(params.app_id);
                                options.id = props.join("**");

                            }
                            fetch.getTimeObj("crashdata", params, options, function(data) {
                                result.data = data;
                                common.returnOutput(params, result);
                            });
                        });
                    });
                }
                else {
                    var columns = ["name", "os", "reports", "lastTs", "users", "latest_version"];
                    var filter = {};
                    if (params.qstring.query && params.qstring.query !== "") {
                        try {
                            filter = JSON.parse(params.qstring.query);
                        }
                        catch (ex) {
                            console.log("Cannot parse crashes query", params.qstring.query);
                        }
                    }
                    if (params.qstring.sSearch && params.qstring.sSearch !== "") {
                        var reg;
                        try {
                            reg = new RegExp(".*" + params.qstring.sSearch + ".*", 'i');
                        }
                        catch (ex) {
                            console.log("Incorrect regex: " + params.qstring.sSearch);
                        }
                        if (reg) {
                            filter.name = {"$regex": reg};
                        }
                        //filter["$text"] = { "$search": "\""+params.qstring.sSearch+"\"" };
                    }
                    if (params.qstring.filter && params.qstring.filter !== "") {
                        switch (params.qstring.filter) {
                        case "crash-resolved":
                            filter.is_resolved = true;
                            filter.is_resolving = {$ne: true};
                            break;
                        case "crash-hidden":
                            filter.is_hidden = true;
                            break;
                        case "crash-unresolved":
                            filter.is_resolved = false;
                            filter.is_resolving = {$ne: true};
                            break;
                        case "crash-nonfatal":
                            filter.nonfatal = true;
                            break;
                        case "crash-fatal":
                            filter.nonfatal = false;
                            break;
                        case "crash-new":
                            filter.is_new = true;
                            break;
                        case "crash-viewed":
                            filter.is_new = false;
                            break;
                        case "crash-reoccurred":
                            filter.is_renewed = true;
                            break;
                        case "crash-resolving":
                            filter.is_resolving = true;
                            break;
                        }
                    }

                    if (!('is_hidden' in filter)) {
                        filter.is_hidden = { $ne: true };
                    }

                    plugins.dispatch("/drill/preprocess_query", {
                        query: filter
                    });

                    const crashgroupMeta = await common.db.collection('app_crashgroups' + params.app_id).findOne({ _id: 'meta' });

                    common.db.collection('app_crashgroups' + params.app_id).estimatedDocumentCount(function(crashGroupsErr, total) {
                        total--;
                        var cursor = common.db.collection('app_crashgroups' +
                        params.app_id).find(filter, {
                            app_version: 1,
                            uid: 1,
                            is_new: 1,
                            is_renewed: 1,
                            is_hidden: 1,
                            os: 1,
                            not_os_specific: 1,
                            name: 1,
                            error: 1,
                            users: 1,
                            lastTs: 1,
                            reports: 1,
                            latest_version: 1,
                            latest_version_for_sort: 1,
                            is_resolved: 1,
                            resolved_version: 1,
                            nonfatal: 1,
                            session: 1,
                            is_resolving: 1,
                            native_cpp: 1,
                            javascript: 1,
                            plcrash: 1
                        });
                        cursor.count(function(errCursor, count) {
                            if (params.qstring.iSortCol_0 && params.qstring.sSortDir_0 && columns[params.qstring.iSortCol_0] && columns[params.qstring.iSortCol_0]) {
                                let obj = {};
                                let sortByField = columns[params.qstring.iSortCol_0];

                                if (sortByField === 'latest_version' && crashgroupMeta.latest_version_sorter_added) {
                                    sortByField = 'latest_version_for_sort';
                                }
                                else if (sortByField === 'reports') {
                                    if (filter.app_version_list && filter.app_version_list.$in && Array.isArray(filter.app_version_list.$in) && filter.app_version_list.$in.length === 1) {
                                        sortByField = `app_version.${filter.app_version_list.$in[0].replace(/\./g, ':')}`;
                                    }
                                }

                                obj[sortByField] = (params.qstring.sSortDir_0 === "asc") ? 1 : -1;
                                cursor.sort(obj);
                            }
                            if (params.qstring.iDisplayStart && params.qstring.iDisplayStart !== 0) {
                                cursor.skip(parseInt(params.qstring.iDisplayStart));
                            }
                            if (params.qstring.iDisplayLength && params.qstring.iDisplayLength !== -1) {
                                cursor.limit(parseInt(params.qstring.iDisplayLength));
                            }

                            cursor.toArray(function(cursorErr, crashes) {
                                let crashData = crashes || [];
                                if (crashes && crashes.length) {
                                    crashData = crashes.filter(function(crash) {
                                        if (crash._id === 'meta') {
                                            total--;
                                            count--;
                                            return false;
                                        }
                                        else {
                                            return true;
                                        }
                                    }).map(function(crash) {
                                        try {
                                            trace.postprocessCrash(crash);
                                        }
                                        catch (ee) {
                                            console.error("Error in postprocessing crash", crash, ee);
                                        }
                                        delete crash.threads;
                                        delete crash.oldthreads;
                                        delete crash.olderror;
                                        return crash;
                                    });
                                }
                                common.returnOutput(params, {sEcho: params.qstring.sEcho, iTotalRecords: Math.max(total, count, 0), iTotalDisplayRecords: count, aaData: crashData});
                            });
                        });
                    });
                }
            });
            return true;
        }
        else if (obParams.qstring.method === 'user_crashes') {
            validateRead(obParams, FEATURE_NAME, function(params) {
                if (params.qstring.uid) {
                    var columns = ["group", "reports", "last"];
                    var query = {group: {$ne: 0}, uid: params.qstring.uid};
                    var cursor = common.db.collection('app_crashusers' + params.app_id).find(query || {}, {_id: 0});
                    cursor.count(function(err, total) {
                        total = total || 0;
                        if (params.qstring.iSortCol_0 && params.qstring.sSortDir_0 && columns[params.qstring.iSortCol_0] && columns[params.qstring.iSortCol_0]) {
                            let obj = {};
                            obj[columns[params.qstring.iSortCol_0]] = (params.qstring.sSortDir_0 === "asc") ? 1 : -1;
                            cursor.sort(obj);
                        }
                        if (params.qstring.iDisplayStart && params.qstring.iDisplayStart !== 0) {
                            cursor.skip(parseInt(params.qstring.iDisplayStart));
                        }
                        if (params.qstring.iDisplayLength && params.qstring.iDisplayLength !== -1) {
                            cursor.limit(parseInt(params.qstring.iDisplayLength));
                        }

                        cursor.toArray(function(cursorErr, crashes) {
                            var res = [];
                            var groupIDs = [];
                            for (let i = 0; i < crashes.length; i++) {
                                if (crashes[i].group !== 0 && crashes[i].reports) {
                                    var crash = {};
                                    crash.group = crashes[i].group;
                                    crash.reports = crashes[i].reports;
                                    crash.last = crashes[i].last || (params.qstring.fromExportAPI ? 'Unknow' : 0);
                                    res.push(crash);
                                    groupIDs.push(crash.group);
                                }
                            }
                            if (params.qstring.fromExportAPI) {
                                common.db.collection('app_crashgroups' + params.app_id).find({groups: {$in: groupIDs}}, {name: 1, _id: 1}).toArray(function(crashGroupsErr, groups) {
                                    if (groups) {
                                        for (let i = 0; i < groups.length; i++) {
                                            groups[i].name = (groups[i].name + "").split("\n")[0].trim();
                                            res.forEach(function(eachCrash) {
                                                if (groups[i]._id === eachCrash.group) {
                                                    eachCrash.group = groups[i].name;
                                                    eachCrash.id = groups[i]._id;
                                                }
                                            });
                                        }
                                    }
                                    common.returnOutput(params, {sEcho: params.qstring.sEcho, iTotalRecords: total, iTotalDisplayRecords: total, aaData: res});
                                });
                            }
                            else {
                                common.returnOutput(params, {sEcho: params.qstring.sEcho, iTotalRecords: total, iTotalDisplayRecords: total, aaData: res});
                            }
                        });
                    });
                }
                else {
                    common.returnMessage(params, 400, 'Please provide user uid');
                }
            });
            return true;
        }
    });

    //reading crashes
    plugins.register("/o/crashes", function(ob) {
        var obParams = ob.params;
        var paths = ob.paths;

        switch (paths[3]) {
        case 'download_stacktrace':
            validateRead(obParams, FEATURE_NAME, function(params) {
                if (!params.qstring.crash_id) {
                    common.returnMessage(params, 400, 'Please provide crash_id parameter');
                    return;
                }
                var id = params.qstring.crash_id + "";
                common.drillDb.collection("drill_events").findOne({'_id': id}, {fields: {error: 1}}, function(err, crash) {
                    if (err || !crash) {
                        common.returnMessage(params, 400, 'Crash not found');
                        return;
                    }
                    if (!crash.error) {
                        common.returnMessage(params, 400, 'Crash does not have stacktrace');
                        return;
                    }
                    if (params.res.writeHead) {
                        params.res.writeHead(200, {
                            'Content-Type': 'application/octet-stream',
                            'Content-Length': crash.error.length,
                            'Content-Disposition': "attachment;filename=" + encodeURIComponent(params.qstring.crash_id) + "_stacktrace.txt"
                        });
                        params.res.write(crash.error);
                        params.res.end();
                    }
                });
            });
            break;
        case 'download_binary':
            validateRead(obParams, FEATURE_NAME, function(params) {
                if (!params.qstring.crash_id) {
                    common.returnMessage(params, 400, 'Please provide crash_id parameter');
                    return;
                }
                var id = params.qstring.crash_id + "";
                common.drillDb.collection("drill_events").findOne({'_id': id}, {fields: {binary_crash_dump: 1}}, function(err, crash) {
                    if (err || !crash) {
                        common.returnMessage(params, 400, 'Crash not found');
                        return;
                    }
                    if (!crash.binary_crash_dump) {
                        common.returnMessage(params, 400, 'Crash does not have binary_dump');
                        return;
                    }
                    if (params.res.writeHead) {
                        var buf = Buffer.from(crash.binary_crash_dump, 'base64');
                        params.res.writeHead(200, {
                            'Content-Type': 'application/octet-stream',
                            'Content-Length': buf.byteLength,
                            'Content-Disposition': "attachment;filename=" + encodeURIComponent(params.qstring.crash_id) + "_bin.dmp"
                        });
                        let stream = new Duplex();
                        stream.push(buf);
                        stream.push(null);
                        stream.pipe(params.res);
                    }
                });
            });
            break;
        default:
            common.returnMessage(obParams, 400, 'Invalid path');
            break;
        }
        return true;
    });

    //manipulating crashes
    plugins.register("/i/crashes", function(ob) {
        var obParams = ob.params;
        var paths = ob.paths;
        if (obParams.qstring.args) {
            try {
                obParams.qstring.args = JSON.parse(obParams.qstring.args);
            }
            catch (SyntaxError) {
                console.log('Parse ' + obParams.apiPath + ' JSON failed');
            }
        }

        switch (paths[3]) {
        case 'resolve':
            if (!obParams.qstring.args) {
                common.returnMessage(obParams, 400, 'Please provide args parameter');
                return true;
            }
            validateUpdate(obParams, FEATURE_NAME, function(params) {
                var crashes = params.qstring.args.crashes || [params.qstring.args.crash_id];
                common.db.collection('app_crashgroups' + params.qstring.app_id).find({'_id': {$in: crashes}}).toArray(function(crashGroupsErr, groups) {
                    if (groups) {
                        var inc = {};
                        var ret = {};
                        async.each(groups, function(group, done) {
                            ret[group._id] = group.latest_version;
                            if (!group.is_resolved) {
                                common.db.collection('app_crashgroups' + params.qstring.app_id).update({'_id': group._id}, {"$set": {is_resolved: true, resolved_version: group.latest_version, is_renewed: false, is_new: false, is_resolving: false}}, function() {
                                    if (!inc.resolved) {
                                        inc.resolved = 0;
                                    }
                                    inc.resolved++;

                                    if (group.is_renewed) {
                                        if (!inc.reoccurred) {
                                            inc.reoccurred = 0;
                                        }
                                        inc.reoccurred--;
                                    }
                                    if (group.is_new) {
                                        if (!inc.isnew) {
                                            inc.isnew = 0;
                                        }
                                        inc.isnew--;
                                    }
                                    plugins.dispatch("/systemlogs", {params: params, action: "crash_resolved", data: {app_id: params.qstring.app_id, crash_id: group._id}});
                                    done();
                                    return true;
                                });
                            }
                            else {
                                done();
                            }
                        }, function() {
                            if (Object.keys(inc).length) {
                                common.db.collection('app_crashgroups' + params.qstring.app_id).update({_id: "meta"}, {$inc: inc}, function() {});
                            }
                            common.returnOutput(params, ret);
                        });
                    }
                    else {
                        common.returnMessage(params, 404, 'Not found');
                    }
                });
            });
            break;
        case 'unresolve':
            if (!obParams.qstring.args) {
                common.returnMessage(obParams, 400, 'Please provide args parameter');
                return true;
            }
            validateUpdate(obParams, FEATURE_NAME, function(params) {
                var crashes = params.qstring.args.crashes || [params.qstring.args.crash_id];
                common.db.collection('app_crashgroups' + params.qstring.app_id).find({'_id': {$in: crashes}}).toArray(function(crashGroupsErr, groups) {
                    if (groups) {
                        var inc = {};
                        async.each(groups, function(group, done) {
                            common.db.collection('app_crashgroups' + params.qstring.app_id).update({'_id': group._id }, {"$set": {is_resolved: false, resolved_version: null, is_resolving: false}}, function() {
                                if (group.is_resolved) {
                                    if (!inc.resolved) {
                                        inc.resolved = 0;
                                    }
                                    inc.resolved--;
                                    plugins.dispatch("/systemlogs", {params: params, action: "crash_unresolved", data: {app_id: params.qstring.app_id, crash_id: group._id}});
                                }
                                done();
                                return true;
                            });
                        }, function() {
                            if (Object.keys(inc).length) {
                                common.db.collection('app_crashgroups' + params.qstring.app_id).update({_id: "meta"}, {$inc: inc}, function() {});
                            }
                            common.returnMessage(params, 200, 'Success');
                        });
                    }
                    else {
                        common.returnMessage(params, 404, 'Not found');
                    }
                });
            });
            break;
        case 'view':
            if (!obParams.qstring.args) {
                common.returnMessage(obParams, 400, 'Please provide args parameter');
                return true;
            }
            validateUpdate(obParams, FEATURE_NAME, function(params) {
                var crashes = params.qstring.args.crashes || [params.qstring.args.crash_id];
                common.db.collection('app_crashgroups' + params.qstring.app_id).find({'_id': {$in: crashes}}).toArray(function(crashGroupsErr, groups) {
                    if (groups) {
                        var inc = {};
                        async.each(groups, function(group, done) {
                            if (group.is_new) {
                                common.db.collection('app_crashgroups' + params.qstring.app_id).update({'_id': group._id }, {"$set": {is_new: false}}, function() {
                                    if (!inc.isnew) {
                                        inc.isnew = 0;
                                    }
                                    inc.isnew--;
                                    done();
                                    return true;
                                });
                            }
                            else {
                                done();
                            }
                        }, function() {
                            if (Object.keys(inc).length) {
                                common.db.collection('app_crashgroups' + params.qstring.app_id).update({_id: "meta"}, {$inc: inc}, function() {});
                            }
                            common.returnMessage(params, 200, 'Success');
                        });
                    }
                    else {
                        common.returnMessage(params, 404, 'Not found');
                    }
                });
            });
            break;
        case 'share':
            if (!obParams.qstring.args) {
                common.returnMessage(obParams, 400, 'Please provide args parameter');
                return true;
            }
            validateUpdate(obParams, FEATURE_NAME, function(params) {
                var id = common.crypto.createHash('sha1').update(params.qstring.app_id + params.qstring.args.crash_id + "").digest('hex');
                common.db.collection('crash_share').insert({_id: id, app_id: params.qstring.app_id + "", crash_id: params.qstring.args.crash_id + ""}, function() {
                    common.db.collection('app_crashgroups' + params.qstring.app_id).update({'_id': params.qstring.args.crash_id }, {"$set": {is_public: true}}, function() {});
                    plugins.dispatch("/systemlogs", {params: params, action: "crash_shared", data: {app_id: params.qstring.app_id, crash_id: params.qstring.args.crash_id}});
                    common.returnMessage(params, 200, 'Success');
                    return true;
                });
            });
            break;
        case 'unshare':
            if (!obParams.qstring.args) {
                common.returnMessage(obParams, 400, 'Please provide args parameter');
                return true;
            }
            validateUpdate(obParams, FEATURE_NAME, function(params) {
                var id = common.crypto.createHash('sha1').update(params.qstring.app_id + params.qstring.args.crash_id + "").digest('hex');
                common.db.collection('crash_share').remove({'_id': id }, function() {
                    common.db.collection('app_crashgroups' + params.qstring.app_id).update({'_id': params.qstring.args.crash_id }, {"$set": {is_public: false}}, function() {});
                    plugins.dispatch("/systemlogs", {params: params, action: "crash_unshared", data: {app_id: params.qstring.app_id, crash_id: params.qstring.args.crash_id}});
                    common.returnMessage(params, 200, 'Success');
                    return true;
                });
            });
            break;
        case 'modify_share':
            if (!obParams.qstring.args) {
                common.returnMessage(obParams, 400, 'Please provide args parameter');
                return true;
            }
            validateUpdate(obParams, FEATURE_NAME, function(params) {
                if (params.qstring.args.data) {
                    common.db.collection('app_crashgroups' + params.qstring.app_id).update({'_id': params.qstring.args.crash_id }, {"$set": {share: params.qstring.args.data}}, function() {
                        plugins.dispatch("/systemlogs", {params: params, action: "crash_modify_share", data: {app_id: params.qstring.app_id, crash_id: params.qstring.args.crash_id, data: params.qstring.args.data}});
                        common.returnMessage(params, 200, 'Success');
                        return true;
                    });
                }
                else {
                    common.returnMessage(params, 400, 'No data to save');
                }
            });
            break;
        case 'hide':
            if (!obParams.qstring.args) {
                common.returnMessage(obParams, 400, 'Please provide args parameter');
                return true;
            }
            validateUpdate(obParams, FEATURE_NAME, function(params) {
                var crashes = params.qstring.args.crashes || [params.qstring.args.crash_id];
                common.db.collection('app_crashgroups' + params.qstring.app_id).update({'_id': {$in: crashes} }, {"$set": {is_hidden: true}}, {multi: true}, function() {
                    for (var i = 0; i < crashes.length; i++) {
                        plugins.dispatch("/systemlogs", {params: params, action: "crash_hidden", data: {app_id: params.qstring.app_id, crash_id: crashes[i]}});
                    }
                    common.returnMessage(params, 200, 'Success');
                    return true;
                });
            });
            break;
        case 'show':
            if (!obParams.qstring.args) {
                common.returnMessage(obParams, 400, 'Please provide args parameter');
                return true;
            }
            validateUpdate(obParams, FEATURE_NAME, function(params) {
                var crashes = params.qstring.args.crashes || [params.qstring.args.crash_id];
                common.db.collection('app_crashgroups' + params.qstring.app_id).update({'_id': {$in: crashes} }, {"$set": {is_hidden: false}}, {multi: true}, function() {
                    for (var i = 0; i < crashes.length; i++) {
                        plugins.dispatch("/systemlogs", {params: params, action: "crash_shown", data: {app_id: params.qstring.app_id, crash_id: params.qstring.args.crash_id}});
                    }
                    common.returnMessage(params, 200, 'Success');
                    return true;
                });
            });
            break;
        case 'resolving':
            if (!obParams.qstring.args) {
                common.returnMessage(obParams, 400, 'Please provide args parameter');
                return true;
            }
            validateUpdate(obParams, FEATURE_NAME, function(params) {
                var crashes = params.qstring.args.crashes || [params.qstring.args.crash_id];
                common.db.collection('app_crashgroups' + params.qstring.app_id).update({'_id': {$in: crashes} }, {"$set": {is_resolving: true}}, {multi: true}, function() {
                    for (var i = 0; i < crashes.length; i++) {
                        plugins.dispatch("/systemlogs", {params: params, action: "crash_resolving", data: {app_id: params.qstring.app_id, crash_id: params.qstring.args.crash_id}});
                    }
                    common.returnMessage(params, 200, 'Success');
                    return true;
                });
            });
            break;
        case 'add_comment':
            if (!obParams.qstring.args) {
                common.returnMessage(obParams, 400, 'Please provide args parameter');
                return true;
            }
            validateCreate(obParams, FEATURE_NAME, function() {
                var comment = {};
                if (obParams.qstring.args.time) {
                    comment.time = obParams.qstring.args.time;
                }
                else {
                    comment.time = new Date().getTime();
                }

                if (obParams.qstring.args.text) {
                    comment.text = obParams.qstring.args.text;
                }
                else {
                    comment.text = "";
                }

                comment.author = obParams.member.full_name;
                comment.author_id = obParams.member._id + "";
                comment._id = common.crypto.createHash('sha1').update(obParams.qstring.args.app_id + obParams.qstring.args.crash_id + JSON.stringify(comment) + "").digest('hex');
                common.db.collection('app_crashgroups' + obParams.qstring.args.app_id).update({'_id': obParams.qstring.args.crash_id }, {"$push": {'comments': comment}}, function() {
                    plugins.dispatch("/systemlogs", {params: obParams, action: "crash_added_comment", data: {app_id: obParams.qstring.args.app_id, crash_id: obParams.qstring.args.crash_id, comment: comment}});
                    common.returnMessage(obParams, 200, 'Success');
                    return true;
                });
            });
            break;
        case 'edit_comment':
            if (!obParams.qstring.args) {
                common.returnMessage(obParams, 400, 'Please provide args parameter');
                return true;
            }
            validateUpdate(obParams, FEATURE_NAME, function() {
                common.db.collection('app_crashgroups' + obParams.qstring.args.app_id).findOne({'_id': obParams.qstring.args.crash_id }, function(err, crash) {
                    var comment;
                    if (crash && crash.comments) {
                        for (var i = 0; i < crash.comments.length; i++) {
                            if (crash.comments[i]._id === obParams.qstring.args.comment_id) {
                                comment = crash.comments[i];
                                break;
                            }
                        }
                    }
                    if (comment && (comment.author_id === obParams.member._id + "" || obParams.member.global_admin)) {
                        var commentBefore = JSON.parse(JSON.stringify(comment));
                        if (obParams.qstring.args.time) {
                            comment.edit_time = obParams.qstring.args.time;
                        }
                        else {
                            comment.edit_time = new Date().getTime();
                        }

                        if (obParams.qstring.args.text) {
                            comment.text = obParams.qstring.args.text;
                        }

                        common.db.collection('app_crashgroups' + obParams.qstring.args.app_id).update({'_id': obParams.qstring.args.crash_id, "comments._id": obParams.qstring.args.comment_id}, {$set: {"comments.$": comment}}, function() {
                            plugins.dispatch("/systemlogs", {params: obParams, action: "crash_edited_comment", data: {app_id: obParams.qstring.args.app_id, crash_id: obParams.qstring.args.crash_id, _id: obParams.qstring.args.comment_id, before: commentBefore, update: comment}});
                            common.returnMessage(obParams, 200, 'Success');
                            return true;
                        });
                    }
                    else {
                        common.returnMessage(obParams, 200, 'Success');
                        return true;
                    }
                });
            });
            break;
        case 'delete_comment':
            if (!obParams.qstring.args) {
                common.returnMessage(obParams, 400, 'Please provide args parameter');
                return true;
            }
            validateDelete(obParams, FEATURE_NAME, function() {
                common.db.collection('app_crashgroups' + obParams.qstring.args.app_id).findOne({'_id': obParams.qstring.args.crash_id }, function(err, crash) {
                    var comment;

                    if (crash && crash.comments) {
                        for (var i = 0; i < crash.comments.length; i++) {
                            if (crash.comments[i]._id === obParams.qstring.args.comment_id) {
                                comment = crash.comments[i];
                                break;
                            }
                        }
                    }
                    if (comment && (comment.author_id === obParams.member._id + "" || obParams.member.global_admin)) {
                        common.db.collection('app_crashgroups' + obParams.qstring.args.app_id).update({'_id': obParams.qstring.args.crash_id }, { $pull: { comments: { _id: obParams.qstring.args.comment_id } } }, function() {
                            plugins.dispatch("/systemlogs", {params: obParams, action: "crash_deleted_comment", data: {app_id: obParams.qstring.args.app_id, crash_id: obParams.qstring.args.crash_id, comment: comment}});
                            common.returnMessage(obParams, 200, 'Success');
                            return true;
                        });
                    }
                    else {
                        common.returnMessage(obParams, 200, 'Success');
                        return true;
                    }
                });
            });
            break;
        case 'delete':
            if (!obParams.qstring.args) {
                common.returnMessage(obParams, 400, 'Please provide args parameter');
                return true;
            }
            validateDelete(obParams, FEATURE_NAME, function() {
                var params = obParams;
                var crashes = params.qstring.args.crashes || [params.qstring.args.crash_id];
                common.db.collection('app_crashgroups' + params.qstring.app_id).find({'_id': {$in: crashes}}).toArray(function(err, groups) {
                    if (groups) {
                        var inc = {};
                        var failedCrashNames = [];
                        async.each(groups, function(group, done) {
                            group.app_id = params.qstring.app_id;
                            plugins.dispatch("/systemlogs", {params: params, action: "crash_deleted", data: group});
                            common.drillDb.collection("drill_events").remove({"a": (params.app_id + ""), "e": "[CLY]_crash", "n": {$in: group.groups}}, function() {});
                            common.db.collection('app_crashgroups' + params.qstring.app_id).remove({'_id': group._id }, function() {
                                if (common.drillDb) {
                                    common.drillDb.collection("drill_events" + crypto.createHash('sha1').update("[CLY]_crash" + params.qstring.app_id).digest('hex')).remove({"sg.crash": group._id}, function() {});
                                    plugins.dispatch("/core/delete_granular_data", {
                                        db: "countly_drill",
                                        collection: "drill_events",
                                        query: { a: params.qstring.app_id + "", e: "[CLY]_crash", "n": group._id + "" }
                                    });
                                    plugins.dispatch("/crash/delete", {appId: params.qstring.app_id, crash: group._id + ""});
                                }
                                var id = common.crypto.createHash('sha1').update(params.qstring.app_id + group._id + "").digest('hex');
                                common.db.collection('crash_share').remove({'_id': id }, function() {});
                                common.db.collection('app_crashusers' + params.qstring.app_id).find({"group": {$in: group.groups}}, {reports: 1, uid: 1, _id: 0}).toArray(function(crashUsersErr, users) {
                                    var uids = [];
                                    for (let i = 0; i < users.length; i++) {
                                        if (users[i].reports > 0) {
                                            uids.push(users[i].uid);
                                        }
                                    }
                                    common.db.collection('app_crashusers' + params.qstring.app_id).remove({"group": {$in: group.groups}}, function() {});
                                    var mod = {crashes: -1};
                                    if (!group.nonfatal) {
                                        mod.fatal = -1;
                                    }
                                    common.db.collection('app_crashusers' + params.qstring.app_id).update({"group": 0, uid: {$in: uids}}, {$inc: mod}, {multi: true}, function() {
                                        if (!inc.crashes) {
                                            inc.crashes = 0;
                                        }
                                        inc.crashes--;

                                        if (group.nonfatal) {
                                            if (!inc.nonfatal) {
                                                inc.nonfatal = 0;
                                            }
                                            inc.nonfatal -= group.reports;
                                        }
                                        else {
                                            if (!inc.fatal) {
                                                inc.fatal = 0;
                                            }
                                            inc.fatal -= group.reports;
                                        }

                                        if (group.is_new) {
                                            if (!inc.isnew) {
                                                inc.isnew = 0;
                                            }
                                            inc.isnew--;
                                        }

                                        if (group.is_resolved) {
                                            if (!inc.resolved) {
                                                inc.resolved = 0;
                                            }
                                            inc.resolved--;
                                        }

                                        if (group.loss) {
                                            if (!inc.loss) {
                                                inc.loss = 0;
                                            }
                                            inc.loss -= group.loss;
                                        }

                                        if (group.reports) {
                                            if (!inc.reports) {
                                                inc.reports = 0;
                                            }
                                            inc.reports -= group.reports;
                                        }

                                        if (group.is_renewed) {
                                            if (!inc.reoccurred) {
                                                inc.reoccurred = 0;
                                            }
                                            inc.reoccurred--;
                                        }

                                        if (group.os) {
                                            if (!inc["os." + group.os.replace(/^\$/, "").replace(/\./g, ":")]) {
                                                inc["os." + group.os.replace(/^\$/, "").replace(/\./g, ":")] = 0;
                                            }
                                            inc["os." + group.os.replace(/^\$/, "").replace(/\./g, ":")] -= group.reports;
                                        }

                                        if (group.app_version) {
                                            for (let i in group.app_version) {
                                                if (!inc["app_version." + i]) {
                                                    inc["app_version." + i] = 0;
                                                }
                                                inc["app_version." + i] -= group.app_version[i];
                                            }
                                        }
                                        done();
                                    });
                                });
                            });
                        }, function() {
                            //recalculate users
                            common.db.collection('app_crashusers' + params.qstring.app_id).count({"group": 0, crashes: { $gt: 0 }}, function(crashUsersErr, userCount) {
                                common.db.collection('app_crashusers' + params.qstring.app_id).count({"group": 0, crashes: { $gt: 0 }, fatal: { $gt: 0 }}, function(crashGroupsErr, fatalCount) {
                                    var update = {};
                                    update.$set = {};
                                    update.$set.users = userCount;
                                    update.$set.usersfatal = fatalCount;
                                    if (Object.keys(inc).length) {
                                        update.$inc = inc;
                                    }
                                    common.db.collection('app_crashgroups' + params.qstring.app_id).update({_id: "meta"}, update, function() {});
                                    if (failedCrashNames.length > 0) {
                                        common.returnMessage(params, 200, failedCrashNames);
                                    }
                                    else {
                                        common.returnMessage(params, 200, 'Success');
                                    }
                                });
                            });
                        });
                    }
                    else {
                        common.returnMessage(params, 404, 'Not found');
                    }
                });
            });
            break;
        default:
            common.returnMessage(obParams, 400, 'Invalid path');
            break;
        }
        return true;
    });

    plugins.register("/i/apps/create", function(ob) {
        var appId = ob.appId;
        common.db.collection('app_crashgroups' + appId).updateOne({_id: "meta"}, {$set: {_id: "meta"}}, {upsert: true}, function() {});
        common.db.collection('app_crashgroups' + appId).ensureIndex({"name": 1}, {background: true}, function() {});
        common.db.collection('app_crashgroups' + appId).ensureIndex({"os": 1}, {background: true}, function() {});
        common.db.collection('app_crashgroups' + appId).ensureIndex({"reports": 1}, {background: true}, function() {});
        common.db.collection('app_crashgroups' + appId).ensureIndex({"users": 1}, {background: true}, function() {});
        common.db.collection('app_crashgroups' + appId).ensureIndex({"lastTs": 1}, {background: true}, function() {});
        common.db.collection('app_crashgroups' + appId).ensureIndex({"latest_version": 1}, {background: true}, function() {});
        common.db.collection('app_crashgroups' + appId).ensureIndex({"latest_version_for_sort": 1}, {background: true}, function() {});
        common.db.collection('app_crashgroups' + appId).ensureIndex({"app_version_list": 1}, {background: true}, function() {});
        common.db.collection('app_crashgroups' + appId).ensureIndex({"groups": 1}, {background: true}, function() {});
        common.db.collection('app_crashgroups' + appId).ensureIndex({"is_hidden": 1}, {background: true}, function() {});
        common.db.collection('app_crashusers' + appId).ensureIndex({"group": 1, "uid": 1}, {background: true}, function() {});
        common.db.collection('app_crashusers' + appId).ensureIndex({"group": 1, "crashes": 1, "fatal": 1}, {sparse: true, background: true}, function() {});
        common.db.collection('app_crashusers' + appId).ensureIndex({"uid": 1}, {background: true}, function() {});
    });

    plugins.register("/i/apps/delete", function(ob) {
        var appId = ob.appId;
        common.db.collection('app_crashgroups' + appId).drop(function() {});
        common.db.collection('app_crashusers' + appId).drop(function() {});
        common.db.collection('crash_share').remove({'app_id': appId }, function() {});
        common.db.collection('crashdata').remove({'_id': {$regex: appId + ".*"}}, function() {});
        /*if (common.drillDb) {
            common.drillDb.collection("drill_events" + crypto.createHash('sha1').update("[CLY]_crash" + appId).digest('hex')).drop(function() {});
            common.drillDb.collection("drill_events").remove({"a": appId + "", e: "[CLY]_crash"}, function() {});
        }*/
    });

    plugins.register("/i/apps/clear", function(ob) {
        var appId = ob.appId;
        var ids = ob.ids;
        common.db.collection('crashdata').remove({$and: [{'_id': {$regex: appId + ".*"}}, {'_id': {$nin: ids}}]}, function() {});
        /*if (common.drillDb) {
            common.drillDb.collection("drill_events" + crypto.createHash('sha1').update("[CLY]_crash" + appId).digest('hex')).remove({ts: {$lt: ob.moment.valueOf()}}, function() {});
            common.drillDb.collection("drill_events").remove({a: appId + "", e: "[CLY]_crash", ts: {$lt: ob.moment.valueOf()}}, function() {});
        }*/
    });

    plugins.register("/i/apps/clear_all", function(ob) {
        var appId = ob.appId;
        common.db.collection('app_crashusers' + appId).drop(function() {
            common.db.collection('app_crashusers' + appId).ensureIndex({"group": 1, "uid": 1}, {background: true}, function() {});
            common.db.collection('app_crashusers' + appId).ensureIndex({"group": 1, "crashes": 1, "fatal": 1}, {sparse: true, background: true}, function() {});
            common.db.collection('app_crashusers' + appId).ensureIndex({"uid": 1}, {background: true}, function() {});
        });
        common.db.collection('app_crashgroups' + appId).drop(function() {
            common.db.collection('app_crashgroups' + appId).updateOne({_id: "meta"}, {$set: {_id: "meta"}}, {upsert: true}, function() {});
            common.db.collection('app_crashgroups' + appId).ensureIndex({"name": 1}, {background: true}, function() {});
            common.db.collection('app_crashgroups' + appId).ensureIndex({"os": 1}, {background: true}, function() {});
            common.db.collection('app_crashgroups' + appId).ensureIndex({"reports": 1}, {background: true}, function() {});
            common.db.collection('app_crashgroups' + appId).ensureIndex({"users": 1}, {background: true}, function() {});
            common.db.collection('app_crashgroups' + appId).ensureIndex({"lastTs": 1}, {background: true}, function() {});
            common.db.collection('app_crashgroups' + appId).ensureIndex({"latest_version": 1}, {background: true}, function() {});
            common.db.collection('app_crashgroups' + appId).ensureIndex({"latest_version_for_sort": 1}, {background: true}, function() {});
            common.db.collection('app_crashgroups' + appId).ensureIndex({"app_version_list": 1}, {background: true}, function() {});
            common.db.collection('app_crashgroups' + appId).ensureIndex({"groups": 1}, {background: true}, function() {});
            common.db.collection('app_crashgroups' + appId).ensureIndex({"is_hidden": 1}, {background: true}, function() {});
        });
        common.db.collection('crash_share').remove({'app_id': appId }, function() {});
        common.db.collection('crashdata').remove({'_id': {$regex: appId + ".*"}}, function() {});
        /*if (common.drillDb) {
            common.drillDb.collection("drill_events" + crypto.createHash('sha1').update("[CLY]_crash" + appId).digest('hex')).drop(function() {});
            common.drillDb.collection("drill_events").remove({"a": appId + "", e: "[CLY]_crash"}, function() {});
        }*/
    });

    plugins.register("/i/apps/reset", function(ob) {
        var appId = ob.appId;
        common.db.collection('app_crashusers' + appId).drop(function() {
            common.db.collection('app_crashusers' + appId).ensureIndex({"group": 1, "uid": 1}, {background: true}, function() {});
            common.db.collection('app_crashusers' + appId).ensureIndex({"group": 1, "crashes": 1, "fatal": 1}, {sparse: true, background: true}, function() {});
            common.db.collection('app_crashusers' + appId).ensureIndex({"uid": 1}, {background: true}, function() {});
        });
        common.db.collection('app_crashgroups' + appId).drop(function() {
            common.db.collection('app_crashgroups' + appId).updateOne({_id: "meta"}, {$set: {_id: "meta"}}, {upsert: true}, function() {});
            common.db.collection('app_crashgroups' + appId).ensureIndex({"name": 1}, {background: true}, function() {});
            common.db.collection('app_crashgroups' + appId).ensureIndex({"os": 1}, {background: true}, function() {});
            common.db.collection('app_crashgroups' + appId).ensureIndex({"reports": 1}, {background: true}, function() {});
            common.db.collection('app_crashgroups' + appId).ensureIndex({"users": 1}, {background: true}, function() {});
            common.db.collection('app_crashgroups' + appId).ensureIndex({"lastTs": 1}, {background: true}, function() {});
            common.db.collection('app_crashgroups' + appId).ensureIndex({"latest_version": 1}, {background: true}, function() {});
            common.db.collection('app_crashgroups' + appId).ensureIndex({"latest_version_for_sort": 1}, {background: true}, function() {});
            common.db.collection('app_crashgroups' + appId).ensureIndex({"app_version_list": 1}, {background: true}, function() {});
            common.db.collection('app_crashgroups' + appId).ensureIndex({"groups": 1}, {background: true}, function() {});
            common.db.collection('app_crashgroups' + appId).ensureIndex({"is_hidden": 1}, {background: true}, function() {});
        });
        common.db.collection('crash_share').remove({'app_id': appId }, function() {});
        common.db.collection('crashdata').remove({'_id': {$regex: appId + ".*"}}, function() {});
        /*if (common.drillDb) {
             common.drillDb.collection("drill_events" + crypto.createHash('sha1').update("[CLY]_crash" + appId).digest('hex')).drop(function() {});
             common.drillDb.collection("drill_events").remove({"a": appId + "", e: "[CLY]_crash"}, function() {});
        }*/
    });
}(plugin));

module.exports = plugin;
