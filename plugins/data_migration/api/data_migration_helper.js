
var crypto = require('crypto');
var Promise = require("bluebird");
var plugins = require('../../pluginManager.js');
const fs = require('fs');
const fse = require('fs-extra');
var path = require('path');
var countlyFs = require('../../../api/utils/countlyFs.js');
var cp = require('child_process'); //call process
var spawn = cp.spawn; //for calling comannd line
const os = require('os'); //hostname, eol
const request = require('countly-request');
var common = require('../../../api/utils/common.js');

module.exports = function(my_db) {
    var db = "";
    if (my_db) {
        db = my_db;
    }
    if (!db) {
        db = common.db;
    }
    var params = "";

    var my_logpath = "";
    var exportid = "";
    var exp_count = 0;
    var exp_prog = 0;
    var log = common.log('datamigration:api');

    var self = this;
    var create_con_strings = function() {
        var dbargs = [];
        var db_params = plugins.getDbConnectionParams('countly');
        for (var p in db_params) {
            dbargs.push("--" + p);
            dbargs.push(db_params[p]);
        }
        var dbargs_drill = [];
        db_params = plugins.getDbConnectionParams('countly_drill');
        for (var k in db_params) {
            dbargs_drill.push("--" + k);
            dbargs_drill.push(db_params[k]);
        }

        var dbargs_out = [];
        db_params = plugins.getDbConnectionParams('countly_out');
        for (var r in db_params) {
            dbargs_out.push("--" + r);
            dbargs_out.push(db_params[r]);
        }

        return {dbargs: dbargs, dbargs_drill: dbargs_drill, dbargs_out: dbargs_out};
    };


    var check_ids = function(apps) {
        return new Promise(function(resolve, reject) {
            var bad_ids = [];
            var app_names = [];
            var object_array = [];
            for (var i = 0; i < apps.length; i++) {
                try {
                    object_array.push(db.ObjectID(apps[i]));
                }
                catch (err) {
                    bad_ids.push(apps[i]);
                }
            }

            if (bad_ids.length > 0) {
                reject(Error("data-migration.invalid_app_id" + bad_ids.join()));
            }
            db.collection("apps").find({_id: { $in: object_array }}).toArray(function(err, res) {
                if (err) {
                    log.e(err); reject();
                }
                else {
                    for (var k = 0; k < apps.length; k++) {
                        bad_ids.push(apps[k]);
                    }

                    for (var j = 0; j < res.length; j++) {
                        app_names.push(res[j].name);
                        if (bad_ids.indexOf(res[j]._id)) {
                            bad_ids.splice(bad_ids.indexOf(res[j]._id), 1);
                        }
                    }
                    if (bad_ids.length > 0) {
                        reject(Error("data-migration.some_bad_ids"));
                    }
                    else {
                        resolve(app_names);
                    }
                }
            });
        });
    };

    var create_and_validate_export_id = function(apps) {
        return new Promise(function(resolve, reject) {
            //exportid - defined at the top of file
            exportid = crypto.createHash('SHA1').update(JSON.stringify(apps)).digest('hex');
            db.collection("data_migrations").findOne({_id: exportid}, function(err, res) {
                if (err) {
                    reject(err);
                }
                else {
                    var havefile = false;
                    var dir = __dirname + '/../export/' + common.sanitizeFilename(exportid) + '.tar.gz';
                    havefile = fs.existsSync(dir);

                    if (res) {
                        if ((res.step === 'sending' || res.step === 'importing') && res.status === 'failed') {
                            if (havefile) {
                                reject(Error('data-migration.you-have-valid-export-failed-in-sending'));
                            }
                            else {
                                resolve();
                            }
                        }
                        else if (res.status === 'finished' && res.step === "exporting" && havefile) {
                            reject(Error("data-migration.you-have-already-exported-data"));
                        }
                        else if (res.stopped === false && res.status !== 'finished' && res.status !== 'failed') {
                            reject(Error('data-migration.already-running-exporting-process'));
                        }
                        else {
                            self.clean_up_data('export', exportid, true).then(
                                function() {
                                    resolve();
                                },
                                function(err1) {
                                    reject(err1);
                                }
                            );
                        }
                    }
                    else {
                        self.clean_up_data('export', exportid, true).then(
                            function() {
                                resolve();
                            },
                            function(err1) {
                                reject(err1);
                            }
                        );
                    }
                }
            });
        });
    };


    var update_progress = function(my_exportid, step, status, dif, reason, reset_progress, more_fields) {
        exp_prog = exp_prog + dif;
        if (reset_progress) {
            exp_prog = dif;
        }
        var progress = 0;
        if (exp_count !== 0) {
            progress = Math.round(100 * exp_prog / exp_count);
        }
        else {
            progress = exp_prog;
        }

        if (typeof reason === 'undefined') {
            reason = "";
        }

        var set_data = {step: step, status: status, progress: progress, ts: Date.now(), reason: reason};
        if (more_fields) {
            for (var k in more_fields) {
                if (Object.prototype.hasOwnProperty.call(more_fields, k)) {
                    set_data[k] = more_fields[k];
                }
            }
        }
        var updatea = {_id: my_exportid};
        if (!reset_progress) {
            updatea.stopped = false;
        }
        db.collection("data_migrations").update(updatea, {$set: set_data}, {upsert: true}, function(err) {
            if (err) {
                log.e("Unable to update export status in db");
            }
            if ((status === 'failed' || status === 'finished')) {
                db.collection("data_migrations").findOne({_id: my_exportid}, function(err1, res) {
                    if (err1) {
                        log.e("db error");
                    }
                    else {
                        if (res) {
                            try {
                                res.myreq = JSON.parse(res.myreq);
                            }
                            catch (SyntaxError) {
                                res.myreq = "";
                            }
                            plugins.dispatch("/systemlogs", {params: {req: res.myreq}, user: {_id: res.userid, email: res.email}, action: "export_" + status, data: {app_ids: res.apps, status: status, message: reason}});
                        }
                    }
                });

            }

        });
    };


    this.clean_up_data = function(folder, my_exportid, remove_archive) {
        return new Promise(function(resolve, reject) {
            if (my_exportid !== "") {
                if (remove_archive) {
                    if (fs.existsSync(path.resolve(__dirname, './../' + folder + '/' + common.sanitizeFilename(my_exportid) + '.tar.gz'))) {
                        try {
                            fs.unlinkSync(path.resolve(__dirname, './../' + folder + '/' + common.sanitizeFilename(my_exportid) + '.tar.gz'));
                        }
                        catch (err) {
                            log.e(err);
                        }
                    }
                }
                //cleans up default(if exist), then special
                new Promise(function(resolve0, reject0) {
                    if (fs.existsSync(path.resolve(__dirname, './../' + folder + '/' + my_exportid))) {
                        //removes default folder if exists
                        fse.remove(path.resolve(__dirname, './../' + folder + '/' + my_exportid), err => {
                            if (err) {
                                reject0(Error('data-migration.unable-to-remove-directory'));
                            }
                            else {
                                resolve0();
                            }

                        });
                    }
                    else {
                        resolve0();
                    }
                }).then(function() {
                    if (folder === 'export') {
                        db.collection("data_migrations").findOne({_id: my_exportid}, function(err, res) {
                            if (err) {
                                log.e(err.message); reject(err);
                            }
                            else {
                                if (res && res.export_path && res.export_path !== '') {
                                    if (remove_archive) {
                                        try {
                                            fs.unlinkSync(res.export_path);
                                        }
                                        catch (err1) {
                                            log.e(err1);
                                        }
                                    }
                                    var my_dir = path.dirname(res.export_path);
                                    if (my_dir && fs.existsSync(my_dir + '/' + my_exportid)) {
                                        fse.remove(my_dir + '/' + my_exportid, err1 => {
                                            if (err1) {
                                                reject(Error('data-migration.unable-to-remove-directory'));
                                            }
                                            else {
                                                resolve();
                                            }
                                        });
                                    }
                                    else {
                                        resolve();
                                    }
                                }
                                else {
                                    if (fs.existsSync(path.resolve(__dirname, './../' + folder + '/' + my_exportid))) {
                                        fse.remove(path.resolve(__dirname, './../' + folder + '/' + my_exportid), err1 => {
                                            if (err1) {
                                                reject(Error('data-migration.unable-to-remove-directory'));
                                            }
                                            else {
                                                resolve();
                                            }
                                        });
                                    }
                                    else {
                                        resolve();
                                    }
                                }
                            }
                        });
                    }
                    else if (folder === 'import') {
                        var infofile = path.resolve(__dirname, './../import/' + common.sanitizeFilename(my_exportid) + '.json');
                        if (fs.existsSync(infofile)) {
                            try {
                                var data = fs.readFileSync(infofile);
                                var mydata = JSON.parse(data);
                                if (mydata && mydata.my_folder) {
                                    fse.remove(mydata.my_folder + "/" + my_exportid, err => {
                                        if (err) {
                                            reject(Error('data-migration.unable-to-remove-directory'));
                                        }
                                        else {
                                            resolve();
                                        }
                                    });
                                }
                                else {
                                    resolve();
                                }
                            }
                            catch (e) {
                                if (e) {
                                    log.e("Json parse error");
                                }
                                resolve();
                            }
                        }
                        else {
                            resolve();
                        }
                    }
                    else {
                        resolve();
                    }//there is nothing to remove
                },
                function(err) {
                    reject(Error(err));
                });
            }
            else {
                reject(Error('data-migration.no-export-id-given'));
            }
        });
    };


    var log_me = function(logpath, message, is_error) {
        if (is_error) {
            log.e(message);
        }
        try {
            if (message.indexOf(os.EOL) === -1) {
                fs.writeFileSync(logpath, message + os.EOL, {'flag': 'a'});
            }
            else {
                fs.writeFileSync(logpath, message, {'flag': 'a'});
            }
        }
        catch (err) {
            log.e('Unable to log import process:' + message);
        }
    };

    var run_command = function(my_command, my_args, update = true) {
        return new Promise(function(resolve, reject) {
            var starr = ['inherit', 'inherit', 'inherit'];
            if (my_logpath !== '') {
                const out = fs.openSync(my_logpath, 'a');
                const err = fs.openSync(my_logpath, 'a');
                starr = [ 'ignore', out, err ];
                log_me(my_logpath, "running command " + my_command + " " + my_args.join(" "), false);
            }
            var child = spawn(my_command, my_args, {shell: false, cwd: __dirname, detached: false, stdio: starr}, function(error) {
                if (error) {
                    reject(Error('error:' + JSON.stringify(error)));
                    return;
                }
            });

            child.on('error', function(error) {
                if (my_logpath !== '') {
                    log_me(my_logpath, error.message, false);
                }
                return resolve();
            });
            child.on('exit', function(code) {
                if (code === 0) {
                    if (update && exp_count > 0 && exportid && exportid !== "") {
                        if (update_progress(exportid, "exporting", "progress", 1, "") === false) {
                            return reject(Error("data-migration.export-stoppedStopped exporting process"));
                        }
                    }
                    return resolve();
                }
                else {
                    if (my_logpath !== '') {
                        log_me(my_logpath, "Exited with error code: " + code, false);
                    }
                    return resolve();
                }
            });
        });
    };

    var generate_events_scripts = function(data) {
        return new Promise(function(resolve, reject) {
            db.collection("events").find({_id: db.ObjectID(data.appid)}).toArray(function(err, res) {
                if (err) {
                    reject(Error(err));
                }
                var scripts = [];
                if (res && res.length > 0) {
                    for (var j = 0; j < res.length; j++) {
                        if (res[j].list && res[j].list.length > 0) {
                            for (var z = 0; z < res[j].list.length; z++) {
                                var eventCollName = "events" + crypto.createHash('sha1').update(res[j].list[z] + data.appid).digest('hex');
                                scripts.push({cmd: 'mongodump', args: [...data.dbargs, '--collection', eventCollName, '--out', data.my_folder]});
                                if (plugins.isPluginEnabled('drill')) {
                                    eventCollName = "drill_events" + crypto.createHash('sha1').update(res[j].list[z] + data.appid).digest('hex');
                                    scripts.push({cmd: 'mongodump', args: [...data.dbargs_drill, '--collection', eventCollName, '--out', data.my_folder]});
                                }
                            }
                        }
                    }
                }
                resolve(scripts);
            }
            );
        });
    };

    var generate_credentials_scripts = function(data) {
        return new Promise(function(resolve, reject) {
            db.collection("apps").findOne({_id: db.ObjectID(data.appid)}, function(err, res) {
                if (err) {
                    reject(Error(err));
                }
                var cid = [];
                if (res && res.plugins && res.plugins.push) {
                    if (res.plugins.push.a && res.plugins.push.a._id) {
                        cid.push('{"$oid":"' + res.plugins.push.a._id + '"}');
                    }

                    if (res.plugins.push.i && res.plugins.push.i._id) {
                        cid.push('{"$oid":"' + res.plugins.push.i._id + '"}');
                    }
                }
                if (cid.length > 0) {
                    resolve([{cmd: 'mongodump', args: [...data.dbargs, '--collection', 'credentials', '-q', '{ "_id": {"$in":[' + cid.join(',') + ']}}', '--out', data.my_folder]}]);
                }
                else {
                    resolve([]);
                }
            });
        });
    };

    var createScriptsForViews = function(data) {
        return new Promise(function(resolve/*, reject*/) {
            var scripts = [];
            var appId = data.appid;
            db.collection("views").findOne({'_id': db.ObjectID(appId)}, {}, function(err, viewInfo) {

                var colName = "app_viewdata" + crypto.createHash('sha1').update(appId).digest('hex');
                scripts.push({cmd: 'mongodump', args: [...data.dbargs, '--collection', colName, '--out', data.my_folder]});
                if (viewInfo) {
                    for (let segKey in viewInfo.segments) {
                        colName = "app_viewdata" + crypto.createHash('sha1').update(segKey + appId).digest('hex');
                        scripts.push({cmd: 'mongodump', args: [...data.dbargs, '--collection', colName, '--out', data.my_folder]});
                    }
                }
                colName = "app_viewdata" + crypto.createHash('sha1').update('platform' + appId).digest('hex');
                scripts.push({cmd: 'mongodump', args: [...data.dbargs, '--collection', colName, '--out', data.my_folder]});
                resolve(scripts);
            });

        });
    };

    var create_export_scripts = function(data) {
        return new Promise(function(resolve, reject) {
            var appid = data.appid;
            var my_folder = data.my_folder;

            var scripts = [];
            var dbargs = [];
            var dbargs0 = [];
            var countly_db_name = "";
            var db_params = plugins.getDbConnectionParams('countly');
            for (var p in db_params) {
                dbargs.push("--" + p);
                dbargs.push(db_params[p]);
                if (p !== 'db') {
                    dbargs0.push("--" + p);
                    dbargs0.push(db_params[p]);
                }
                else {
                    countly_db_name = db_params[p];
                }
            }

            var dbargs_drill = [];
            db_params = plugins.getDbConnectionParams('countly_drill');
            for (var z in db_params) {
                dbargs_drill.push("--" + z);
                dbargs_drill.push(db_params[z]);
            }

            var dbargs_out = [];
            db_params = plugins.getDbConnectionParams('countly_out');
            for (var g in db_params) {
                dbargs_out.push("--" + g);
                dbargs_out.push(db_params[g]);
            }

            db.collection("apps").findOne({_id: db.ObjectID(appid)}, function(err, res) {
                if (err || !res) {
                    reject(Error("data-migration.invalid-app-id"));
                }
                else {
                    if (!res.redirect_url || res.redirect_url === "") {
                        scripts.push({cmd: 'mongodump', args: [...dbargs, "--collection", "apps", "-q", '{ "_id": {"$oid":"' + appid + '"}}', "--out", my_folder]});
                    }
                    else {
                        //remove redirect field and add it after dump.
                        scripts.push({cmd: 'mongo', args: [countly_db_name, ...dbargs0, "--eval", 'db.apps.update({ "_id": ObjectId("' + appid + '")}, { "$unset": { "redirect_url": 1 } })']});
                        scripts.push({cmd: 'mongodump', args: [...dbargs, "--collection", "apps", "-q", '{ "_id": {"$oid":"' + appid + '"}}', "--out", my_folder]});
                        scripts.push({cmd: 'mongo', args: [countly_db_name, ...dbargs0, "--eval", 'db.apps.update({ "_id": ObjectId("' + appid + '")}, { $set: { redirect_url: "' + res.redirect_url + '" } })']});
                    }

                    var appDocs = ['app_users', 'metric_changes', 'app_crashes', 'app_crashgroups', 'app_crashusers', 'app_nxret', 'app_viewdata', 'app_views', 'app_userviews', 'app_viewsmeta', 'blocked_users', 'campaign_users', 'consent_history', 'crashes_jira', 'event_flows', 'timesofday', 'feedback', 'push_', 'apm', "nps", "survey", "completed_surveys"];
                    for (let j = 0; j < appDocs.length; j++) {
                        scripts.push({cmd: 'mongodump', args: [...dbargs, '--collection', appDocs[j] + appid, '--out', my_folder]});
                    }

                    scripts.push({cmd: 'mongodump', args: [...dbargs, '--collection', 'campaigndata', '-q', '{ "a": "' + appid + '"}', '--out', my_folder]});
                    scripts.push({cmd: 'mongodump', args: [...dbargs, '--collection', 'campaigns', '-q', '{ "app_id": "' + appid + '"}', '--out', my_folder]});
                    scripts.push({cmd: 'mongodump', args: [...dbargs, '--collection', 'crash_share', '-q', '{ "app_id": "' + appid + '"}', '--out', my_folder]});
                    scripts.push({cmd: 'mongodump', args: [...dbargs, '--collection', 'feedback_widgets', '-q', '{ "app_id": "' + appid + '"}', '--out', my_folder]});
                    scripts.push({cmd: 'mongodump', args: [...dbargs, '--collection', 'notes', '-q', '{ "app_id":"' + appid + '"}', '--out', my_folder]});
                    scripts.push({cmd: 'mongodump', args: [...dbargs, '--collection', 'messages', '-q', '{ "apps": {"$oid":"' + appid + '"}}', '--out', my_folder]});
                    scripts.push({cmd: 'mongodump', args: [...dbargs, '--collection', 'cohortdata', '-q', '{ "a": "' + appid + '"}', '--out', my_folder]});
                    scripts.push({cmd: 'mongodump', args: [...dbargs, '--collection', 'cohorts', '-q', '{ "app_id": "' + appid + '"}', '--out', my_folder]});
                    scripts.push({cmd: 'mongodump', args: [...dbargs, '--collection', 'server_stats_data_points', '-q', '{ "a": "' + appid + '"}', '--out', my_folder]});
                    //concurrent_users
                    scripts.push({cmd: 'mongodump', args: [...dbargs, '--collection', 'concurrent_users_max', '-q', '{"$or":[{ "app_id": "' + appid + '"},{ "_id": {"$in" :["' + appid + '_overall", "' + appid + '_overall_new"]}}]}', '--out', my_folder]});
                    scripts.push({cmd: 'mongodump', args: [...dbargs, '--collection', 'concurrent_users_alerts', '-q', '{ "app": "' + appid + '"}', '--out', my_folder]});


                    var sameStructures = ["browser", "carriers", "cities", "consents", "crashdata", "density", "device_details", "devices", "langs", "sources", "users", "retention_daily", "retention_weekly", "retention_monthly", "server_stats_data_points"];

                    for (var k = 0; k < sameStructures.length; k++) {
                        scripts.push({cmd: 'mongodump', args: [...dbargs, '--collection', sameStructures[k], '-q', '{ "_id": {"$regex": "' + appid + '_.*" }}', '--out', my_folder]});
                    }
                    if (dbargs_out && dbargs_out.length) {
                        scripts.push({cmd: 'mongodump', args: [...dbargs_out, '--collection', "ab_testing_experiments" + appid, '--out', my_folder]});
                        scripts.push({cmd: 'mongodump', args: [...dbargs_out, '--collection', "remoteconfig_parameters" + appid, '--out', my_folder]});
                        scripts.push({cmd: 'mongodump', args: [...dbargs_out, '--collection', "remoteconfig_conditions" + appid, '--out', my_folder]});
                    }

                    scripts.push({cmd: 'mongodump', args: [...dbargs, '--collection', 'max_online_counts', '-q', '{"_id": {"$oid":"' + appid + '"}}', '--out', my_folder]});
                    scripts.push({cmd: 'mongodump', args: [...dbargs, '--collection', 'top_events', '-q', '{ "app_id": {"$oid":"' + appid + '"}}', '--out', my_folder]});
                    scripts.push({cmd: 'mongodump', args: [...dbargs, '--collection', 'events', '-q', '{ "_id": {"$oid":"' + appid + '"}}', '--out', my_folder]});
                    scripts.push({cmd: 'mongodump', args: [...dbargs, '--collection', 'views', '-q', '{ "_id": {"$oid":"' + appid + '"}}', '--out', my_folder]});
                    scripts.push({cmd: 'mongodump', args: [...dbargs, '--collection', 'funnels', '-q', '{ "app_id": "' + appid + '" }', '--out', my_folder]});
                    scripts.push({cmd: 'mongodump', args: [...dbargs, '--collection', 'calculated_metrics', '-q', '{ "app": "' + appid + '" }', '--out', my_folder]});
                    scripts.push({cmd: 'mongodump', args: [...dbargs, '--collection', 'datamanager_transforms', '-q', '{ "app": "' + appid + '" }', '--out', my_folder]});


                    //event Timeline data:
                    scripts.push({cmd: 'mongodump', args: [...dbargs, '--collection', 'eventTimes' + appid, '--out', my_folder]});
                    scripts.push({cmd: 'mongodump', args: [...dbargs, '--collection', 'timelineStatus', '-q', '{ "app_id": "' + appid + '" }', '--out', my_folder]});

                    //internal events
                    for (let j = 0; j < plugins.internalEvents.length; j++) {
                        let eventCollName = "events" + crypto.createHash('sha1').update(plugins.internalEvents[j] + appid).digest('hex');
                        scripts.push({cmd: 'mongodump', args: [...dbargs, '--collection', eventCollName, '--out', my_folder]});
                    }

                    if (plugins.isPluginEnabled('drill')) {
                        //export drill
                        var drill_events = plugins.internalDrillEvents;

                        for (let j = 0; j < drill_events.length; j++) {
                            let eventCollName = "drill_events" + crypto.createHash('sha1').update(drill_events[j] + appid).digest('hex');
                            scripts.push({cmd: 'mongodump', args: [...dbargs_drill, '--collection', eventCollName, '--out', my_folder]});
                        }

                        scripts.push({cmd: 'mongodump', args: [...dbargs_drill, '--collection', 'drill_bookmarks', '-q', '{ "app_id": "' + appid + '" }', '--out', my_folder]});
                        scripts.push({cmd: 'mongodump', args: [...dbargs_drill, '--collection', 'drill_meta' + appid, '--out', my_folder]});
                    }
                    //export symbolication files
                    if (data.aditional_files) {
                        scripts.push({cmd: 'mongodump', args: [...dbargs, '--collection', 'app_crashsymbols' + appid, '--out', my_folder]});
                        scripts.push({cmd: 'mongodump', args: [...dbargs, '--collection', 'symbolication_jobs', '-q', '{ "app_id": "' + appid + '" }', '--out', my_folder]});
                    }

                    //events sctipts
                    generate_events_scripts({appid: appid, my_folder: my_folder, dbargs: dbargs, dbargs_drill: dbargs_drill}, db)
                        .then(
                            function(result) {
                                if (result && Array.isArray(result)) {
                                    scripts = scripts.concat(result);
                                }

                                return generate_credentials_scripts({appid: appid, my_folder: my_folder, dbargs: dbargs, dbargs_drill: dbargs_drill});
                            })
                        .then(
                            function(result) {
                                if (result && Array.isArray(result)) {
                                    scripts = scripts.concat(result);
                                }

                                return createScriptsForViews({appid: appid, my_folder: my_folder, dbargs: dbargs, dbargs_drill: dbargs_drill});
                            })
                        .then(
                            function(result) {
                                if (result && Array.isArray(result)) {
                                    scripts = scripts.concat(result);
                                }
                                return resolve(scripts);
                            },
                            function(error) {
                                reject(Error(error.message));
                            }
                        ).catch(err1 => {
                            reject(err1);
                        });
                }
            });
        });
    };

    var copy_app_image = function(data) {
        return new Promise(function(resolve) {
            var imagepath = path.resolve(__dirname, './../../../frontend/express/public/appimages/' + data.appid + ".png");
            countlyFs.exists("appimages", imagepath, {id: data.appid + ".png"}, function(err, exist) {
                if (exist) {
                    countlyFs.getStream("appimages", imagepath, {id: data.appid + ".png"}, function(err1, stream) {
                        if (!err1 && stream) {
                            var wstream = fs.createWriteStream(data.image_folder + '/' + data.appid + '.png');

                            wstream.on('error', function(errw) {
                                log.e("Couldn't copy file: " + errw);
                            });

                            stream.pipe(wstream);
                            stream.on('end', () => {
                                resolve("Icon copied: " + data.appid + '.png');
                            });
                            stream.on('error', ()=>{
                                resolve();
                            });
                        }
                    });
                }
                else {
                    resolve("Icon doesn't exist:" + data.appid + '.png');
                }
            });
        });
    };

    var pack_data = function(my_exportid, pack_path, target_path) {
        return new Promise(function(resolve, reject) {
            update_progress(my_exportid, "packing", "progress", 0, "", true);
            var my_command = "tar";
            var my_args = ["-zcvf"];
            if (target_path !== '') {
                let my_dir = path.dirname(target_path);
                my_args.push(target_path);
                my_args.push("--directory=" + my_dir);
                my_args.push(my_exportid);
            }
            else {
                let my_dir = path.resolve(__dirname, "./../export");
                my_args.push(my_dir + "/" + my_exportid + ".tar.gz");
                my_args.push("--directory=" + my_dir);
                my_args.push(my_exportid);
            }
            run_command(my_command, my_args).then(
                function() {
                    return resolve();
                },
                function(error) {
                    return reject(Error(error.message));
                }
            );
        });
    };

    var uploadFile = function(myfile) {
        return new Promise(function(resolve, reject) {
            var var_name = myfile.name;
            var tmp_path = myfile.path;
            if (var_name.length < 6 || var_name.substr(var_name.length - 6, var_name.length - 1) !== "tar.gz") {
                fs.unlink(tmp_path, function() {});
                reject(Error("Invalid file format"));
            }
            else {
                var target_path = path.resolve(__dirname, '../import/' + var_name);
                fs.rename(tmp_path, target_path, (err) => {
                    if (err) {
                        reject(Error("data-migration.unable-to-copy-file"));
                    }
                    resolve();
                });
            }
        });
    };

    var import_app_icons = function(folder) {
        return new Promise(function(resolve, reject) {
            folder = fix_my_path(folder);
            if (folder === false) {
                reject(Error('Bad Archive'));
            }
            folder = folder + '/countly_app_icons';
            if (!fs.existsSync(folder)) {
                resolve("There are no icons");
            }
            else {
                var myfiles = fs.readdirSync(folder);

                var objlist = [];
                for (var i = 0; i < myfiles.length; i++) {
                    objlist.push({imagepath: path.resolve(__dirname, './../../../frontend/express/public/appimages/' + myfiles[i]), source: folder + '/' + myfiles[i], id: myfiles[i]});
                }
                Promise.all(objlist.map(function(obj) {
                    return new Promise(function(resolve1, reject1) {
                        countlyFs.saveFile("appimages", obj.imagepath, obj.source, {id: obj.id}, function(err) {
                            if (err) {
                                reject1(err);
                            }
                            else {
                                resolve1('Icon coppied:' + obj.id);
                            }
                        });
                    });
                }))
                    .then(
                        function(result) {
                            resolve(result);
                        },
                        function(err) {
                            reject(Error(err));
                        }

                    );


            }
        });
    };

    var import_symbolication_files = function(folder) {
        return new Promise(function(resolve, reject) {
            folder = fix_my_path(folder);
            if (folder === false) {
                reject(Error('Bad Archive'));
            }
            folder = folder + '/countly_symbolication_files';
            if (!fs.existsSync(folder)) {
                resolve("data-migration.there-are-no-symbolication-files");
            }
            else {
                var myapps = fs.readdirSync(folder);
                var objlist = [];
                for (var i = 0; i < myapps.length; i++) {
                    var myfiles = fs.readdirSync(folder + '/' + myapps[i]);
                    for (var j = 0; j < myfiles.length; j++) {
                        objlist.push({imagepath: path.resolve(__dirname, './../../crash_symbolication/crashsymbols/' + myapps[i] + '/' + myfiles[j]), source: folder + '/' + myapps[i] + '/' + myfiles[j], id: myapps[i] + '.' + myfiles[j]});
                    }
                }

                if (objlist.length === 0) {
                    resolve();
                }
                else {
                    Promise.all(objlist.map(function(obj) {
                        return new Promise(function(resolve1, reject1) {
                            countlyFs.saveFile("crash_symbols", obj.imagepath, obj.source, {id: obj.id}, function(err) {
                                if (err) {
                                    reject1(err);
                                }
                                else {
                                    resolve1('Crash file coppied:' + obj.id);
                                }
                            });
                        });
                    }))
                        .then(
                            function(result) {
                                resolve(result);
                            },
                            function(err) {
                                reject(Error(err));
                            }

                        );
                }
            }
        });
    };
    var fix_my_path = function(my_path) {
        if (fs.existsSync(my_path)) {
            var myfolder = fs.readdirSync(my_path);
            if (myfolder.length === 1) {
                var mm = myfolder[0].split(".");
                //is folder
                if (mm.length === 1) {
                    var sub_ok = fix_my_path(my_path + "/" + myfolder[0]);
                    if (sub_ok !== false) {
                        return sub_ok;
                    }
                }
            }
            else {
                for (var i = 0; i < myfolder.length; i++) {
                    if (myfolder[i].slice(-5) === '.bson') {
                        return false;
                    }
                }
            }
            return my_path;
        }
        else {
            return false;
        }
    };

    var copy_sybolication_file = function(obj) {
        return new Promise(function(resolve, reject) {
            var tmp_path = path.resolve(__dirname, './../../crash_symbolication/crashsymbols/' + obj.appid + "/" + obj.symbolid + ".cly_symbol");

            countlyFs.exists("crash_symbols", tmp_path, {id: obj.appid + "." + obj.symbolid + ".cly_symbol"}, function(err, exist) {
                if (exist) {
                    countlyFs.getStream("crash_symbols", tmp_path, {id: obj.appid + "." + obj.symbolid + ".cly_symbol"}, function(err1, stream) {
                        if (err1 || !stream) {
                            reject();
                        }
                        else {
                            if (!fs.existsSync(obj.folder + '/' + obj.appid)) {
                                try {
                                    fs.mkdirSync(obj.folder + '/' + obj.appid, 484);
                                }
                                catch (err2) {
                                    log_me(my_logpath, err2.message, true);
                                }
                            }
                            var wstream = fs.createWriteStream(obj.folder + '/' + obj.appid + '/' + obj.symbolid + ".cly_symbol");
                            stream.pipe(wstream);
                            stream.on('end', () => {
                                resolve("Symbolication file copied: " + obj.appid + "/" + obj.symbolid + ".cly_symbol");
                            });
                            stream.on('error', ()=>{
                                reject();
                            });
                        }
                    });
                }
                else {
                    resolve("File doesn't exist:" + obj.appid + "/" + obj.symbolid + ".cly_symbol");
                }
            });
        });
    };

    var copy_symbolication_files = function(data) {
        return new Promise(function(resolve, reject) {
            //aditional_files:path.resolve(my_folder,'./countly_symbolication_files')
            db.collection("app_crashsymbols" + data.appid).find().toArray(function(err, res) {
                if (err) {
                    log.e(err); reject();
                }
                else {
                    var symb_files = [];
                    for (var i = 0; i < res.length; i++) {
                        symb_files.push({folder: data.aditional_files, symbolid: res[i]._id, appid: data.appid});
                    }
                    if (symb_files.length > 0) {
                        Promise.all(symb_files.map(copy_sybolication_file)
                        ).then(
                            function(result) {
                                resolve(result);
                            },
                            function(err1) {
                                reject(Error(err1));
                            }
                        );
                    }
                    else {
                        resolve();
                    }
                }
            });

        });
    };


    var report_import = function(my_params, message, status, my_exportid) {
        if (status !== 'finished') {
            status = 'failed';
        }

        var imported_apps = [];
        var imported_ids = [];
        try {
            var data = fs.readFileSync(path.resolve(__dirname, "./../import/" + common.sanitizeFilename(my_exportid) + '.json'));
            var mydata = JSON.parse(data);
            if (mydata && mydata.app_names) {
                imported_apps = mydata.app_names.split(',');
            }

            if (mydata && mydata.app_ids) {
                imported_ids = mydata.app_ids.split(',');
            }
        }
        catch (err) {
            log.e("JSON parse error" + err);
        }

        var moredata = {"app_ids": imported_ids, "app_names": imported_apps, "exportid": my_exportid, reason: message};
        if (my_params && my_params.qstring && my_params.qstring.exportid) {
            moredata.using_token = true;
            moredata.token = my_params.qstring.auth_token || my_params.req.headers["countly-token"];
            moredata.serverip = my_params.req.headers["x-real-ip"];
            moredata.host = my_params.req.headers.host;

            request.post({url: 'http://' + moredata.serverip + '/i/datamigration/report_import?token=' + moredata.token + "&exportid=" + my_exportid + "&status=" + status + "&message=" + message, agentOptions: {rejectUnauthorized: false}}, function(err, res) {
                if (err) {
                    plugins.dispatch("/systemlogs", {params: my_params, action: "import_" + status + "_response_failed", data: moredata});
                }
                else {
                    if (res.statusCode >= 400 && res.statusCode < 500) {
                        var msg = res.statusMessage;

                        if (res.body && res.body !== '') {
                            try {
                                msg = JSON.parse(res.body);
                                if (msg.result) {
                                    msg = msg.result;
                                }
                            }
                            catch (SyntaxError) {
                                log.e(SyntaxError);
                            }
                        }
                        plugins.dispatch("/systemlogs", {params: my_params, action: "import_" + status + "_response_failed", data: moredata});
                    }
                    else {
                        plugins.dispatch("/systemlogs", {params: my_params, action: "import_" + status + "_response_ok", data: moredata});
                    }
                }

            });
        }
        else {
            plugins.dispatch("/systemlogs", {params: my_params, action: "import_" + status, data: moredata});
        }
    };

    var import_me = function(folder, logpath, my_import_id) {
        return new Promise(function(resolve, reject) {
            var basefolder = folder;
            folder = fix_my_path(folder);
            var mydata = {};
            if (folder === false) {
                reject(Error('Bad Archive'));
            }

            try {
                try {
                    var data = fs.readFileSync(folder + '/info.json');
                    mydata = JSON.parse(data);
                }
                catch (error1) {
                    log.e(error1);
                }
                mydata.my_folder = basefolder;
                fs.writeFileSync(path.resolve(__dirname, './../import/' + my_import_id + '.json'), JSON.stringify(mydata));
            }
            catch (error) {
                log.e(error);
            }

            var myfiles = fs.readdirSync(folder);
            var myscripts = [];

            var constr = create_con_strings();

            for (let i = 0; i < myfiles.length; i++) {
                //folder for each app
                if (myfiles[i] !== '.' && myfiles[i] !== '..' && fs.lstatSync(path.resolve(folder, './' + myfiles[i])).isDirectory() && myfiles[i] !== 'countly_app_icons') {
                    var subdirectory = fs.readdirSync(path.resolve(folder, './' + myfiles[i]));
                    for (var j = 0; j < subdirectory.length; j++) {
                        if (constr.dbargs.indexOf(subdirectory[j]) > -1) {
                            myscripts.push({cmd: 'mongorestore', args: [...constr.dbargs, '--dir', folder + '/' + myfiles[i] + '/' + subdirectory[j]]});
                        }
                        else if (constr.dbargs_drill.indexOf(subdirectory[j]) > -1) {
                            myscripts.push({cmd: 'mongorestore', args: [...constr.dbargs_drill, '--dir', folder + '/' + myfiles[i] + '/' + subdirectory[j]]});
                        }
                        else if (constr.dbargs_out.indexOf(subdirectory[j]) > -1) {
                            myscripts.push({cmd: 'mongorestore', args: [...constr.dbargs_out, '--dir', folder + '/' + myfiles[i] + '/' + subdirectory[j]]});
                        }
                    }
                }
            }
            if (myscripts.length > 0) {
                log_me(logpath, 'Scripts generated sucessfully', false);
                my_logpath = logpath;
                Promise.each(myscripts, function(command) {
                    return run_command(command.cmd, command.args);
                }).then(
                    function() {
                        //update messages 
                        if (mydata && mydata.app_ids) {
                            log_me(logpath, 'Updating records in messages collection', false);
                            var imported_ids = mydata.app_ids.split(',');
                            var objectIDS = [];
                            for (let z = 0; z < imported_ids.length; z++) {
                                if (imported_ids[z] !== "") {
                                    objectIDS.push(common.db.ObjectID(imported_ids[z]));
                                }
                            }
                            common.db.collection('messages').find({"apps": {"$in": objectIDS}}).toArray(function(err1, list) {
                                if (err1) {
                                    log_me(logpath, err1, false);
                                }
                                for (let z = 0; z < list.length; z++) {
                                    if (list[z].auto === true) {
                                        if ((list[z].result.status & 2) > 0) {
                                            list[z].result.status = list[z].result.status & ~2;
                                            common.db.collection('messages').update({_id: list[z]._id}, { $set: {'result.status': list[z].result.status}}, function(err/*, res*/) {
                                                if (err) {
                                                    log_me(logpath, err, false);
                                                }
                                            });
                                        }
                                    }
                                    else if (list[z].auto !== true) {
                                        if ((list[z].result.status & 2) > 0) {
                                            list[z].result.status = list[z].result.status & ~2 | 16 | 1024;
                                            common.db.collection('messages').update({_id: list[z]._id}, { $set: {'result.error': 'Already scheduled messages are not migrated and will be sent from your old server', 'result.status': list[z].result.status}}, function(err/*, res*/) {
                                                if (err) {
                                                    log_me(logpath, err, false);
                                                }
                                            });
                                        }
                                    }
                                }
                                resolve();
                            });
                        }
                        else {
                            resolve();
                        }
                    },
                    function(err) {
                        reject(Error(err.message));
                    });
            }
            else {
                reject(Error('data-migration.there-is-no-data-to-insert'));
            }
        });
    };

    this.send_export = function(my_exportid, passed_db) {
        if (passed_db) {
            db = passed_db;
        }
        /**
        * Request callback function
        * @param {object} err error object
        * @param {object} res result object
        */
        function requestCallback(err, res) {
            if (err) {
                update_progress(my_exportid, "sending", "failed", 0, err.message, true);
            }
            else {
                var msg = res.statusMessage;
                if (res.body && res.body !== '') {
                    try {
                        msg = JSON.parse(res.body);
                        if (msg.result) {
                            msg = msg.result;
                        }
                    }
                    catch (SyntaxError) {
                        log.e(SyntaxError);
                    }
                }
                if (res.statusCode >= 400 && res.statusCode < 500) {
                    if (msg === "Invalid path") {
                        msg = "data-migration.invalid-server-path";
                    }
                    update_progress(my_exportid, "sending", "failed", 0, msg, true, {});
                }
                else if (res.statusCode === 200 && msg === "data-migration.import-started") {
                    update_progress(my_exportid, "importing", "progress", 0, msg, true);
                }
                else {
                    msg = "data-migration.sending-failed-server-address-wrong";
                    update_progress(my_exportid, "sending", "failed", 0, msg, true, {});
                }
            }
        }
        db.collection("data_migrations").findOne({_id: my_exportid}, function(err, res) {
            if (err) {
                log.e(err.message);
            }
            else {
                if (res && res.stopped === false) {
                    update_progress(my_exportid, "validating_files", "progress", 0, "", true);
                    var dir = path.resolve(__dirname, './../export/' + my_exportid + '.tar.gz');
                    if (res.export_path && res.export_path !== '') {
                        dir = res.export_path;
                    }
                    if (!fs.existsSync(dir)) {
                        update_progress(my_exportid, "validating_files", "failed", 0, "Export file missing", true, {});
                        return;
                    }

                    update_progress(my_exportid, "sending", "progress", 0, "", true);
                    const fileData = {
                        fileField: 'import_file',
                        fileStream: fs.createReadStream(dir)
                    };

                    request.post({
                        url: res.server_address + '/i/datamigration/import?exportid=' + my_exportid + '&auth_token=' + res.server_token,
                        form: fileData
                    }, requestCallback);
                }
            }
        });
    };

    this.update_progress = function(my_exportid, step, status, dif, reason, reset_progress, more_fields, myparams) {
        update_progress(my_exportid, step, status, dif, reason, reset_progress, more_fields, myparams);
    };
    this.export_data = function(apps, my_params, passed_db, passed_log) {
        return new Promise(function(resolve, reject) {
            if (passed_db) {
                db = passed_db;
            }
            if (my_params) {
                params = my_params;
            }
            if (passed_log) {
                log = passed_log;
            }

            apps = apps.sort();
            var app_names = [];
            //clear out duplicates
            for (let i = 1; i < apps.length - 1; i++) {
                if (apps[i - 1] === apps[i]) {
                    apps.splice(i, 1); i--;
                }
            }

            check_ids(apps).then(
                function(result) {
                    if (result && Array.isArray(result)) {
                        app_names = result;
                    }
                    return create_and_validate_export_id(apps);
                }
            ).then(
                function() {
                    var my_folder = path.resolve(__dirname, './../export/' + exportid);

                    if (params.qstring.target_path && params.qstring.target_path !== "") {
                        my_folder = params.qstring.target_path + "/" + exportid;
                    }

                    if (!fs.existsSync(my_folder)) {
                        try {
                            fs.mkdirSync(my_folder, 484);
                        }
                        catch (err) {
                            log.e(err.message);
                        }
                    }

                    var created = Date.now();
                    var myreq = JSON.stringify({headers: params.req.headers});

                    var logname = 'dm-export_' + exportid + '.log';
                    my_logpath = path.resolve(__dirname, './../../../log/' + logname);
                    if (fs.existsSync(my_logpath)) {
                        try {
                            fs.unlinkSync(path.resolve(__dirname, './../../../log/' + logname));
                        }
                        catch (err) {
                            log.e(err.message);
                        }
                    }


                    var filepath = "";
                    if (params.qstring.target_path && params.qstring.target_path !== "") {
                        filepath = params.qstring.target_path;
                        filepath = path.resolve(params.qstring.target_path, './' + exportid + '.tar.gz');
                    }
                    update_progress(exportid, "exporting", "progress", 0, "", true, {created: created, stopped: false, only_export: params.qstring.only_export, server_address: params.qstring.server_address, server_token: params.qstring.server_token, redirect_traffic: params.qstring.redirect_traffic, aditional_files: params.qstring.aditional_files, apps: apps, app_names: app_names, userid: params.member._id, email: params.member.email, myreq: myreq, log: logname, export_path: filepath});

                    var scriptobj = [];

                    //creates dir for app icons
                    var image_folder = path.resolve(my_folder, './countly_app_icons');
                    if (!fs.existsSync(image_folder)) {
                        try {
                            fs.mkdirSync(image_folder, 484);
                        }
                        catch (err) {
                            log.e(err.message);
                        }
                    }

                    for (let i = 0; i < apps.length; i++) {
                        let subfolder = path.resolve(my_folder, './' + apps[i]);
                        scriptobj.push({appid: apps[i], my_folder: subfolder, image_folder: image_folder, aditional_files: path.resolve(my_folder, './countly_symbolication_files')});
                        if (!fs.existsSync(subfolder)) {
                            try {
                                fs.mkdirSync(subfolder, 484);
                            }
                            catch (err) {
                                log.e(err.message);
                            }
                        }
                    }

                    Promise.all(scriptobj.map(create_export_scripts))
                        .then(function(result) {
                            var scripts = [];
                            if (result && Array.isArray(result)) {
                                for (var i = 0; i < result.length; i++) {
                                    if (Array.isArray(result[i]) && result[i].length > 0) {
                                        scripts = scripts.concat(result[i]);
                                    }
                                }
                            }

                            if (scripts && scripts.length > 0) {
                                log_me(my_logpath, "Export scripts created", false);
                                exp_count = scripts.length;
                                resolve(exportid);
                                Promise.each(scripts, function(command) {
                                    return run_command(command.cmd, command.args);
                                }).then(
                                    function() {
                                        log_me(my_logpath, "Files generated sucessfully", false);
                                        //create info file
                                        try {
                                            fs.writeFileSync(path.resolve(my_folder, './info.json'), '{"id":"' + exportid + '","app_names":"' + app_names.join() + '","app_ids":"' + apps.join() + '"}', {'flag': 'a'});
                                        }
                                        catch (error) {
                                            log.e(error);
                                        }

                                        //creates dir for app icons
                                        var subfolder = path.resolve(my_folder, './countly_app_icons');
                                        if (!fs.existsSync(subfolder)) {
                                            try {
                                                fs.mkdirSync(subfolder, 484);
                                            }
                                            catch (err) {
                                                log.e(err.message);
                                            }
                                        }

                                        Promise.all(scriptobj.map(copy_app_image))
                                            .then(function(result0) {
                                                log_me(my_logpath, result0, false);
                                                if (params.qstring.aditional_files) {
                                                    //creates folder for symbolication files
                                                    subfolder = path.resolve(my_folder, './countly_symbolication_files');
                                                    if (!fs.existsSync(subfolder)) {
                                                        try {
                                                            fs.mkdirSync(subfolder, 484);
                                                        }
                                                        catch (err) {
                                                            log.e(err.message);
                                                        }
                                                    }
                                                    return Promise.all(scriptobj.map(copy_symbolication_files));
                                                }
                                                else {
                                                    return Promise.resolve();
                                                }
                                            })
                                            .then(function(result1) {
                                                if (Array.isArray(result1)) {
                                                    log_me(my_logpath, result1, false);
                                                }
                                                return pack_data(exportid, path.resolve(__dirname, './../export/' + exportid), filepath);
                                            })
                                            .then(
                                                function() {
                                                    log_me(my_logpath, "Files packed", false);
                                                    log_me(my_logpath, "Starting clean up", false);
                                                    //deletes folder with files(not needed anymore because we have archive
                                                    self.clean_up_data('export', exportid, false).then(
                                                        function() {
                                                            log_me(my_logpath, "Clean up completed", false);
                                                            if (params.qstring.only_export && params.qstring.only_export === true) {
                                                                update_progress(exportid, "exporting", "finished", 0, "", true, {}, params);
                                                            }
                                                            else {
                                                                log_me(my_logpath, "Preparing for sending files", false);
                                                                self.send_export(exportid);
                                                            }
                                                        },
                                                        function() {
                                                            log_me(my_logpath, "Clean up failed", false);
                                                            if (params.qstring.only_export && params.qstring.only_export === true) {
                                                                update_progress(exportid, "exporting", "finished", 0, "data-migration.export-completed-unable-to-delete", true, {}, params);
                                                            }
                                                            else {
                                                                log_me(my_logpath, "Preparing for sending files", false);
                                                                self.send_export(exportid);
                                                            }
                                                        }
                                                    );
                                                },
                                                function(err) {
                                                    update_progress(exportid, "packing", "failed", 0, err.message, true, {}, params);
                                                }
                                            );
                                    },
                                    function(err) {
                                        update_progress(exportid, "exporting", "failed", 0, err.message, true, {}, params);
                                    });

                            }
                            else {
                                reject(Error('data-migration.failed-generate-scripts'));
                            }

                        },
                        function(error) {
                            update_progress(exportid, "exporting", "failed", 0, error.message, true, {}, params);
                            reject(Error('data-migration.failed-generate-scripts'));
                        });
                },
                function(error) {
                    return reject(error);
                }
            );

        });
    };

    this.importExistingData = function(my_file, my_params, logpath, passed_log, foldername) {
        my_logpath = logpath;
        params = my_params;
        if (passed_log) {
            log = passed_log;
        }

        log_me(my_logpath, 'Starting import process', false);
        var current_dir = path.dirname(my_file);

        if (!fs.existsSync(path.resolve(__dirname, './../import'))) {
            try {
                fs.mkdirSync(path.resolve(__dirname, './../import'), 484);
            }
            catch (err) {
                log_me(logpath, err.message, true);
            }
        }

        try {
            fs.mkdirSync(path.resolve(current_dir, './' + foldername), 484);
        }
        catch (err) {
            log_me(logpath, err.message, true);
        }
        //creates forder for info
        try {
            fs.mkdirSync(path.resolve(__dirname, './../import/' + foldername), 484);
        }
        catch (err) {
            log_me(logpath, err.message, true);
        }

        import_process(my_file, my_params, logpath, passed_log, foldername, current_dir + "/" + foldername);
    };

    var import_process = function(import_file, my_params, logpath, passed_log, foldername, process_dir) {
        if (!process_dir) {
            process_dir = path.resolve(__dirname, './../import/' + foldername);
        }

        run_command("tar", ["xvzf", import_file, "-C", process_dir], false) //unpack file
            .then(
                function() {
                    log_me(logpath, 'File unarchived sucessfully', false);
                    return import_me(process_dir, logpath, foldername);//create and run db scripts
                })
            .then(
                function() {
                    log_me(logpath, 'Data imported', false);
                    return import_app_icons(process_dir); //copy icons
                }
            )
            .then(function(result) {
                if (Array.isArray(result)) {
                    log_me(logpath, result, false);
                }
                log_me(logpath, 'Exported icons imported', false);
                return import_symbolication_files(process_dir); //copy symbolication files
            })
            .then(function(result) {

                if (Array.isArray(result)) {
                    log_me(logpath, result, false);
                }
                log_me(logpath, 'Symbolication folder imported', false);
                return self.clean_up_data('import', foldername, true); //delete files
            })
            .then(function() {
                log_me(logpath, 'Cleanup sucessfull', false);
                report_import(params, "systemlogs.action.import_finished", "finished", foldername);
            },
            function(err) {
                log_me(logpath, err.message, true);
                report_import(params, err.message, "failed", foldername);
            }
            ).catch(err => {
                report_import(params, err.message, "failed", foldername);
            });

    };
    this.import_data = function(my_file, my_params, logpath, passed_log, foldername) {
        my_logpath = logpath;
        params = my_params;
        if (passed_log) {
            log = passed_log;
        }

        log_me(my_logpath, 'Starting import process', false);
        var dir = path.resolve(__dirname, './../import');

        if (!fs.existsSync(dir)) {
            try {
                fs.mkdirSync(dir, 484);
            }
            catch (err) {
                log_me(logpath, err.message, true);
            }
        }

        try {
            fs.mkdirSync(path.resolve(__dirname, './../import/' + foldername), 484);
        }
        catch (err) {
            log_me(logpath, err.message, true);
        }

        uploadFile(my_file)
            .then(function() {
                log_me(logpath, 'File uploaded sucessfully', false);
                import_process(path.resolve(__dirname, './../import/' + my_file.name), my_params, logpath, passed_log, foldername);
            }).catch(err => {
                report_import(params, err.message, "failed", foldername);
            });

    };
};