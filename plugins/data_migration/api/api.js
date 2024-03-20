var pluginOb = {},
    common = require('../../../api/utils/common.js'),
    log = common.log('datamigration:api'),
    plugins = require('../../pluginManager.js'),
    migration_helper = require("./data_migration_helper.js");
const fs = require('fs');
const fse = require('fs-extra');
var path = require('path');
var cp = require('child_process'); //call process
const { validateCreate, validateRead, validateUpdate, validateDelete } = require('../../../api/utils/rights.js');
var NginxConfFile = "";
try {
    NginxConfFile = require('nginx-conf').NginxConfFile;
}
catch (e) {
    log.e("nginx-conf not installed");
}

var Promise = require("bluebird");

var authorize = require('../../../api/utils/authorizer.js'); //for token

const request = require('countly-request')(null, null, null, plugins.getConfig("security"));
const FEATURE_NAME = 'data_migration';
/**
*Function to delete all exported files in export folder
* @returns {Promise} Promise
*/
function delete_all_exports() {
    return new Promise(function(resolve, reject) {
        if (fs.existsSync(__dirname + '/../export')) {
            fse.remove(__dirname + '/../export', err => {
                if (err) {
                    reject(Error('Unable to remove directory'));
                }
                else {
                    resolve();
                }
            });
        }
        else {
            resolve();
        }
    });
}
/**
*Function to update progress on export. Used when receiving data about import on other server.
* @param {string} my_exportid -  export id
* @param {string} step  - export step
* @param {string} status  -  export status
* @param {integer} dif  -  dif from previous(used to track export progress)
* @param {string} reason  -  if failed - error message
* @param {boolean} reset_progress  -  states if need to reset progress variable
* @param {object} more_fields  -  more info to save
* @param {object} myparams  - request parameters
*/
function update_progress(my_exportid, step, status, dif, reason, reset_progress, more_fields, myparams) {
    var data_migrator = new migration_helper(common.db);
    data_migrator.update_progress(my_exportid, step, status, dif, reason, reset_progress, more_fields, myparams);
}

/**
*Function applies redirect to apps
* @param {array} apps  - array of app id
* @param {object} params  - request params
* @param {string} my_redirect_url  -  url to redirect to
* @param {string} userid  -  user id
* @param {string} email  -  user email
* @returns {Promise} Promise
*/
function apply_redirect_to_apps(apps, params, my_redirect_url, userid, email) {
    return new Promise(function(resolve) {
        if (!my_redirect_url || my_redirect_url === "") {
            resolve();
        }
        else {
            var object_array = [];
            for (var i = 0; i < apps.length; i++) {
                object_array.push(common.db.ObjectID(apps[i]));
            }

            common.db.collection("apps").update({_id: {$in: object_array}}, {$set: {redirect_url: my_redirect_url}}, {upsert: true, multi: true}, function(err) {
                if (err) {
                    resolve(err);
                }
                else {
                    plugins.dispatch("/systemlogs", {params: {req: JSON.parse(params)}, user: {_id: userid, email: email}, action: "app_redirected", data: {app_id: apps, redirect_url: my_redirect_url}});
                }
                resolve();
            });
        }
    });
}
/**
*Function fixes given address  -  trims slashes
* @param {string} address  - address to fix
* @returns {string} fixed address
*/
function trim_ending_slashes(address) {
    while (address.length > 0 && address[address.length - 1] === '/') {
        address = address.substring(0, address.length - 1);
    }
    return address;
}


//update_progress
//apply_redirect_to_apps
(function() {

    plugins.register("/permissions/features", function(ob) {
        ob.features.push(FEATURE_NAME);
    });

    //report import status from remote server
    plugins.register("/i/datamigration/report_import", function(ob) {
        var params = ob.params;

        if (params.qstring && params.qstring.args) {
            try {
                params.qstring.args = JSON.parse(params.qstring.args);
            }
            catch (SyntaxError) {
                log.e('Parse ' + params.qstring.args + ' JSON failed');
            }
        }

        if (params.qstring) {
            if (!params.qstring.exportid) {
                common.returnMessage(params, 404, 'data-migration.exportid_not_provided');
                return;
            }
            if (!params.qstring.token) {
                common.returnMessage(params, 404, 'data-migration.token_missing');
                return;
            }

            common.db.collection("data_migrations").findOne({_id: params.qstring.exportid, server_token: params.qstring.token}, function(err, res) {
                if (err) {
                    common.returnMessage(params, 404, err);
                }
                else {
                    if (res) {
                        if (params.qstring.status && params.qstring.status !== "") {
                            if (params.qstring.status === 'finished') {
                                update_progress(params.qstring.exportid, "importing", "finished", 0, "", true, {}, params);
                                if (res.server_address && res.server_address.length > 0 && res.redirect_traffic && res.redirect_traffic === true) {
                                    //remove trailing slash
                                    while (res.server_address.length > 0 && res.server_address[res.server_address.length - 1] === '/') {
                                        res.server_address = res.server_address.substring(0, res.server_address.length - 1);
                                    }
                                    apply_redirect_to_apps(res.apps, res.myreq, res.server_address, res.userid, res.email).then(
                                        function() {},
                                        function(err1) {
                                            log.e(err1.message);
                                        }
                                    );
                                }
                                common.returnMessage(ob.params, 200, "ok");
                            }
                            else {
                                update_progress(params.qstring.exportid, "importing", params.qstring.status, 0, params.qstring.message, true, {}, params);
                            }
                        }
                        else {
                            common.returnMessage(ob.params, 404, "data-migration.status-missing");
                        }
                    }
                    else {
                        common.returnMessage(ob.params, 404, "data-migration.export_not_found");
                    }
                }
            });
        }
        return true;
    });

    //Import data
    //to import existing import, which is coppied on server in folder data_migration/import/ 
    //You have to pass export_id as existing_file
    plugins.register("/i/datamigration/import", function(ob) {
        //exportid
        //my hash key
        var params = ob.params;
        //if we have import key or validated as user


        if (params.qstring && params.qstring.args) {
            try {
                params.qstring.args = JSON.parse(params.qstring.args);
            }
            catch (SyntaxError) {
                log.e('Parse ' + params.qstring.args + ' JSON failed');
            }
        }

        validateCreate(params, FEATURE_NAME, function() {
            if (params.qstring.test_con) {
                common.returnMessage(params, 200, "valid");
                return;
            }
            var foldername = "";
            var data_migrator = "";
            var logpath = "";
            if (params.files && params.files.import_file) {
                foldername = params.files.import_file.name.split('.');
                if (params.qstring.exportid && params.qstring.exportid === '') {
                    foldername = params.qstring.exportid;
                }
                else {
                    foldername = foldername[0];
                }

                if (fs.existsSync(__dirname + "/../import/" + foldername + ".tar.gz") || fs.existsSync(__dirname + "/../import/" + foldername)) {
                    common.returnMessage(params, 404, 'data-migration.import-process-exist');
                    return;
                }
                logpath = path.resolve(__dirname, '../../../log/dm-import_' + foldername + '.log');
                common.returnMessage(params, 200, "data-migration.import-started");

                data_migrator = new migration_helper();

                data_migrator.import_data(params.files.import_file, params, logpath, log, foldername);
            }
            else if (params.qstring.existing_file) {

                if (fs.existsSync(params.qstring.existing_file)) {
                    var fname = path.basename(params.qstring.existing_file);//path to file
                    fname = fname.split(".");
                    foldername = fname[0];

                    if (foldername.length === 0) {
                        common.returnMessage(params, 404, "data-migration.could-not-find-file");
                    }
                    else {
                        logpath = path.resolve(__dirname, '../../../log/dm-import_' + foldername + '.log');
                        common.returnMessage(params, 200, "data-migration.import-started");
                        data_migrator = new migration_helper();
                        data_migrator.importExistingData(params.qstring.existing_file, params, logpath, log, foldername);
                    }
                }
                else {
                    common.returnMessage(params, 404, "data-migration.could-not-find-file");
                }

            }
            else {
                common.returnMessage(params, 404, "data-migration.import-file-missing");
            }
        });
        return true;
    });

    plugins.register("/i/datamigration/delete_all", function(ob) {
        var params = ob.params;

        if (params.qstring && params.qstring.args) {
            try {
                params.qstring.args = JSON.parse(params.qstring.args);
            }
            catch (SyntaxError) {
                log.e('Parse ' + params.qstring.args + ' JSON failed');
            }
        }
        validateDelete(params, FEATURE_NAME, function() {
            delete_all_exports()
                .then(function() {
                    if (fs.existsSync(path.resolve(__dirname, './../import'))) {
                        fse.remove(path.resolve(__dirname, './../import'), function() {
                            common.returnMessage(ob.params, 200, "ok");
                        });
                    }
                    else {
                        common.returnMessage(ob.params, 200, "ok");
                    }
                },
                function(err) {
                    common.returnMessage(ob.params, 404, err.message);
                });
        });
        return true;
    });


    plugins.register("/i/datamigration/delete_export", function(ob) {
        var params = ob.params;

        if (params.qstring && params.qstring.args) {
            try {
                params.qstring.args = JSON.parse(params.qstring.args);
            }
            catch (SyntaxError) {
                log.e('Parse ' + params.qstring.args + ' JSON failed');
            }
        }
        validateDelete(params, FEATURE_NAME, function() {
            if (params.qstring.exportid) {
                common.db.collection("data_migrations").findOne({_id: params.qstring.exportid}, function(err, res) {
                    if (err) {
                        common.returnMessage(params, 404, err);
                    }
                    else {
                        if (res) {
                            var data_migrator = new migration_helper(common.db);

                            data_migrator.clean_up_data('export', params.qstring.exportid, true).then(function() {
                                if (fs.existsSync(path.resolve(__dirname, './../../../log/' + res.log))) {
                                    try {
                                        fs.unlinkSync(path.resolve(__dirname, './../../../log/' + res.log));
                                    }
                                    catch (err1) {
                                        log.e(err1);
                                        common.returnMessage(ob.params, 401, "data-migration.unable-to-delete-log-file"); return;
                                    }
                                }
                                common.db.collection("data_migrations").remove({_id: params.qstring.exportid}, function(err1) {
                                    if (err1) {
                                        common.returnMessage(params, 404, err1);
                                    }
                                    else {
                                        common.returnMessage(ob.params, 200, "ok");
                                    }
                                });

                            },
                            function(err2) {
                                common.returnMessage(ob.params, 404, err2.message);
                            });
                        }
                        else {
                            common.returnMessage(ob.params, 404, "data-migration.invalid-exportid");
                        }
                    }
                });
            }
            else {
                common.returnMessage(ob.params, 404, 'data-migration.exportid_not_provided');
            }
        });
        return true;
    });


    plugins.register("/i/datamigration/delete_import", function(ob) {
        var params = ob.params;

        if (params.qstring && params.qstring.args) {
            try {
                params.qstring.args = JSON.parse(params.qstring.args);
            }
            catch (SyntaxError) {
                log.e('Parse ' + params.qstring.args + ' JSON failed');
            }
        }
        validateDelete(params, FEATURE_NAME, function() {
            if (params.qstring.exportid && params.qstring.exportid !== '') {
                var data_migrator = new migration_helper(common.db);
                data_migrator.clean_up_data('import', params.qstring.exportid, true).then(function() {
                    //delete log file
                    if (fs.existsSync(path.resolve(__dirname, './../../../log/dm-import_' + params.qstring.exportid + '.log'))) {
                        try {
                            fs.unlinkSync(path.resolve(__dirname, './../../../log/dm-import_' + params.qstring.exportid + '.log'));
                        }
                        catch (err) {
                            log.e(err);
                        }
                    }
                    //delete info file
                    try {
                        fs.unlinkSync(path.resolve(__dirname, './../import/' + params.qstring.exportid + '.json'));
                    }
                    catch (err) {
                        log.e(err);
                    }

                    common.returnMessage(ob.params, 200, "ok");
                },
                function(err) {
                    common.returnMessage(ob.params, 404, err.message);
                });
            }
            else {
                common.returnMessage(ob.params, 404, 'data-migration.exportid-missing');
            }
        });
        return true;
    });

    plugins.register("/i/datamigration/stop_export", function(ob) {
        var params = ob.params;

        if (params.qstring && params.qstring.args) {
            try {
                params.qstring.args = JSON.parse(params.qstring.args);
            }
            catch (SyntaxError) {
                log.e('Parse ' + params.qstring.args + ' JSON failed');
            }
        }
        validateUpdate(params, FEATURE_NAME, function() {
            if (params.qstring.exportid) {
                common.db.collection("data_migrations").findOne({_id: params.qstring.exportid}, function(err, res) {
                    if (err) {
                        common.returnMessage(params, 404, err);
                    }
                    else {
                        if (res) {
                            if (res.status === 'finished') {
                                common.returnMessage(ob.params, 404, 'data-migration.export-already-finished');
                            }
                            else if (res.status === 'failed') {
                                common.returnMessage(ob.params, 404, 'data-migration.export-already-failed');
                            }
                            else {
                                common.db.collection("data_migrations").update({_id: params.qstring.exportid}, {$set: {stopped: true}}, {upsert: true}, function(err1) {
                                    if (err1) {
                                        log.e("Unable to update export status in db");
                                    }
                                });

                                if (res.step === 'packing' || res.step === 'exporting') {
                                    common.returnMessage(ob.params, 200, "data-migration.export-already-stopped");
                                }
                                else {
                                    common.returnMessage(ob.params, 404, "data-migration.export-already-sent");
                                }
                            }
                            return true;

                        }
                        else {
                            common.returnMessage(ob.params, 404, "data-migration.data-migration.exportid_not_provided");
                        }
                    }
                });
            }
            else {
                common.returnMessage(ob.params, 404, 'data-migration.data-migration.exportid_not_provided');
            }
        });
        return true;
    });

    //gets list of exports
    plugins.register("/o/datamigration/getmyexports", function(ob) {
        var params = ob.params;
        //var validate = ob.validateUserForGlobalAdmin;
        if (params.qstring && params.qstring.args) {
            try {
                params.qstring.args = JSON.parse(params.qstring.args);
            }
            catch (SyntaxError) {
                log.e('/o/datamigration/getmyexports Parse ' + params.qstring.args + ' JSON failed');
            }
        }
        validateRead(params, FEATURE_NAME, function() {
            common.db.collection("data_migrations").find().sort({ts: -1}).toArray(function(err, res) {
                if (err) {
                    common.returnMessage(ob.params, 404, err.message);
                }
                else {
                    if (res) {
                        if (res.length === 0) {
                            common.returnMessage(params, 200, "data-migration.no-exports");
                            return true;
                        }
                        for (var i = 0; i < res.length; i++) {
                            var dir = path.resolve(__dirname, './../export/' + res[i]._id + '.tar.gz');
                            if (res[i].export_path && res[i].export_path !== '') {
                                dir = res[i].export_path;
                            }

                            if (fs.existsSync(dir)) {
                                res[i].can_download = true;
                            }
                            else {
                                res[i].can_download = false;
                            }

                            if (fs.existsSync(path.resolve(__dirname, './../export/' + res[i]._id))) {
                                res[i].have_folder = true;
                            }
                            else {
                                res[i].have_folder = false;
                            }

                            if (!fs.existsSync(path.resolve(__dirname, './../../../log/' + res[i].log))) {
                                res[i].log = "";
                            }
                        }
                        common.returnMessage(ob.params, 200, res);
                    }
                    else {
                        common.returnMessage(params, 200, "data-migration.no-exports");
                    }
                }
            });
        });
        return true;
    });


    plugins.register("/o/datamigration/getmyimports", function(ob) {
        var params = ob.params;

        if (params.qstring && params.qstring.args) {
            try {
                params.qstring.args = JSON.parse(params.qstring.args);
            }
            catch (SyntaxError) {
                log.e('/o/datamigration/getmyimports Parse ' + params.qstring.args + ' JSON failed');
            }
        }
        validateRead(params, FEATURE_NAME, function() {
            var ret_arr = {};
            var have_any = false;
            var myfiles = "";
            var filename = "";
            if (fs.existsSync(path.resolve(__dirname, "./../import"))) {
                myfiles = fs.readdirSync(path.resolve(__dirname, "./../import"));
                for (var i = 0; i < myfiles.length; i++) {
                    filename = myfiles[i].split('.');
                    if (!ret_arr[filename[0]]) {
                        ret_arr[filename[0]] = {type: '', log: '', last_update: ""};
                        have_any = true;
                    }

                    if (filename.length > 0 && filename[1] === 'tar') {
                        ret_arr[filename[0]].type = 'archive';
                    }
                    else if (filename.length > 0 && filename[1] === 'json') {
                        try {
                            var data = fs.readFileSync(path.resolve(__dirname, "./../import/" + myfiles[i]));
                            var mydata = JSON.parse(data);
                            if (mydata && mydata.app_names) {
                                ret_arr[filename[0]].app_list = mydata.app_names;
                            }
                        }
                        catch (SyntaxError) {
                            log.e("Parse error");
                        }
                    }
                    else {
                        ret_arr[filename[0]].type = 'folder';
                    }
                }
            }

            if (fs.existsSync(path.resolve(__dirname, "../../../log"))) {
                myfiles = fs.readdirSync(path.resolve(__dirname, "../../../log"));
                for (var j = 0; j < myfiles.length; j++) {
                    filename = myfiles[j].split('_');
                    if (filename[0] === 'dm-import' && filename.length > 0) {
                        var myid = myfiles[j].substr(10).split('.');
                        if (myid[0] && typeof ret_arr[myid[0]] !== 'undefined') {
                            ret_arr[myid[0]].log = myfiles[j];
                        }
                        else {
                            ret_arr[myid[0]] = {type: '', log: myfiles[j], last_update: ""};
                            have_any = true;
                        }

                        try {
                            var stats = fs.statSync(path.resolve(__dirname, "../../../log/" + myfiles[j]));
                            ret_arr[myid[0]].last_update = stats.atime;
                        }
                        catch (error) {
                            log.e('Error getting stat of  log file');
                        }
                    }
                }
            }
            if (have_any) {
                common.returnMessage(ob.params, 200, ret_arr);
            }
            else {
                common.returnMessage(ob.params, 200, "data-migration.no-imports");
            }
        });
        return true;
    });

    //create import token
    //@params.ttl = time to live in minutes
    plugins.register("/o/datamigration/createimporttoken", function(ob) {
        var params = ob.params;

        if (params.qstring && params.qstring.args) {
            try {
                params.qstring.args = JSON.parse(params.qstring.args);
            }
            catch (SyntaxError) {
                log.e('Parse ' + params.qstring.args + ' JSON failed');
            }
        }

        validateCreate(params, FEATURE_NAME, function() {
            var ttl, multi;
            //passed in minutes
            if (params.qstring.ttl) {
                ttl = parseInt(params.qstring.ttl) * 60;
            }
            else {
                ttl = 86400;
            }//1 day
            if (params.qstring.multi === false) {
                multi = false;
            }
            else {
                multi = true;
            }

            authorize.save({
                endpoint: ['/i/datamigration/import'],
                db: common.db,
                ttl: ttl,
                multi: multi,
                owner: params.member._id + "",
                app: "",
                callback: function(err, token) {
                    if (err) {
                        log.e(err);
                        common.returnMessage(params, 404, 'data-migration.unable-to-create-token');
                    }
                    else {
                        common.returnMessage(params, 200, token);
                    }
                }
            });
        });
        return true;
    });


    //Get status of export
    //@params.exportid  - Export ID
    plugins.register("/o/datamigration/getstatus", function(ob) {
        var params = ob.params;

        if (params.qstring && params.qstring.args) {
            try {
                params.qstring.args = JSON.parse(params.qstring.args);
            }
            catch (SyntaxError) {
                log.e('/o/datamigration/getstatus Parse ' + params.qstring.args + ' JSON failed');
            }
        }
        validateRead(params, FEATURE_NAME, function() {
            if (typeof params.qstring.exportid !== "undefined") {
                common.db.collection("data_migrations").findOne({_id: params.qstring.exportid}, function(err, res) {
                    if (err) {
                        common.returnOutput(ob.params, err.message);
                    }
                    else {
                        if (res) {
                            common.returnMessage(params, 200, res);
                        }
                        else {
                            common.returnMessage(params, 404, 'data-migration.invalid-exportid');
                        }
                    }
                });
            }
            else {
                common.returnOutput(ob.params, 'data-migration.exportid-missing');
            }
        });

        return true;
    });


    //Get configuration. Default export path for.
    plugins.register("/o/datamigration/get_config", function(ob) {
        var params = ob.params;
        if (params.qstring && params.qstring.args) {
            try {
                params.qstring.args = JSON.parse(params.qstring.args);
            }
            catch (SyntaxError) {
                log.e('/o/datamigration/getstatus Parse ' + params.qstring.args + ' JSON failed');
            }
        }
        validateRead(params, FEATURE_NAME, function() {
            var fileSizeLimit = 0;

            cp.exec("nginx -t", (error, stdout, stderr) => {
                if (error) {
                    console.log(error);
                    common.returnMessage(params, 200, {def_path: path.resolve(__dirname, './../export'), fileSizeLimit: fileSizeLimit});
                }
                else {
                    var dd = stdout;
                    if (stdout === "") {
                        dd = stderr;
                    }
                    var pos1 = dd.indexOf("the configuration file");
                    var pos2 = dd.indexOf(" ", pos1 + 23 + 2);
                    var conffile = "";
                    if (typeof dd === "string") {
                        conffile = dd.substring(pos1 + 23, pos2).trim();
                    }
                    else {
                        conffile = dd.toString("utf-8", pos1 + 23, pos2).trim();
                    }

                    if (NginxConfFile && NginxConfFile !== "" && conffile !== "" && fs.existsSync(conffile)) {
                        NginxConfFile.create(conffile, function(err, conf) {
                            if (err) {
                                console.log(err);
                                return;
                            }
                            fileSizeLimit = conf.nginx.http.client_max_body_size._value || 0;
                            if (fileSizeLimit[fileSizeLimit.length - 1] === 'k' || fileSizeLimit[fileSizeLimit.length - 1] === 'K') {
                                fileSizeLimit = parseInt(fileSizeLimit.substr(0, fileSizeLimit.length - 1));
                            }
                            else if (fileSizeLimit[fileSizeLimit.length - 1] === 'm' || fileSizeLimit[fileSizeLimit.length - 1] === 'M') {
                                fileSizeLimit = parseInt(fileSizeLimit.substr(0, fileSizeLimit.length - 1)) * 1024;
                            }
                            else if (fileSizeLimit[fileSizeLimit.length - 1] === 'g' || fileSizeLimit[fileSizeLimit.length - 1] === 'G') {
                                fileSizeLimit = parseInt(fileSizeLimit.substr(0, fileSizeLimit.length - 1)) * 1024 * 1024;
                            }
                            else {
                                fileSizeLimit = parseInt(fileSizeLimit) / 1024;
                            }
                            common.returnMessage(params, 200, {def_path: path.resolve(__dirname, './../export'), fileSizeLimit: fileSizeLimit});
                        });
                    }
                    else {
                        common.returnMessage(params, 200, {def_path: path.resolve(__dirname, './../export'), fileSizeLimit: fileSizeLimit});
                    }
                }
            });

        });

        return true;
    });

    //Export data
    //@only_export  - 1(only export data), 0 - export and send to remote server
    //@apps - app id's separated with ','
    //@server_address - remote server address
    //@server_token  - token generated on remote server
    plugins.register("/i/datamigration/export", function(ob) {
        var params = ob.params;

        if (params.qstring.args) {
            try {
                params.qstring.args = JSON.parse(params.qstring.args);
            }
            catch (SyntaxError) {
                log.e('Parse ' + params.qstring.args + ' JSON failed');
            }
        }
        validateCreate(params, FEATURE_NAME, function() {
            var dir = __dirname + '/../export';
            if (!fs.existsSync(dir)) {
                try {
                    fs.mkdirSync(dir, 484);
                }
                catch (err) {
                    log.e(err.message);
                }
            }

            var apps = [];
            if (typeof params.qstring.apps !== 'undefined' && params.qstring.apps !== "") {
                apps = params.qstring.apps.split(',');
            }
            else {
                common.returnMessage(params, 404, 'data-migration.no_app_ids');
                return true;
            }

            if (!params.qstring.only_export || parseInt(params.qstring.only_export) !== 1) {
                params.qstring.only_export = false;
                if (!params.qstring.server_token || params.qstring.server_token === '') {
                    common.returnMessage(params, 404, 'data-migration.token_missing');
                    return true;
                }

                if (!params.qstring.server_address || params.qstring.server_address === '') {
                    common.returnMessage(params, 404, 'data-migration.address_missing');
                    return true;
                }
                else {
                    params.qstring.server_address = trim_ending_slashes(params.qstring.server_address);
                }
            }
            else {
                params.qstring.only_export = true;
                params.qstring.server_address = "";
                params.qstring.server_token = "";
            }

            if (params.qstring.aditional_files && parseInt(params.qstring.aditional_files) === 1) {
                params.qstring.aditional_files = true;
            }
            else {
                params.qstring.aditional_files = false;
            }

            if (params.qstring.redirect_traffic && parseInt(params.qstring.redirect_traffic) === 1) {
                params.qstring.redirect_traffic = true;
            }
            else {
                params.qstring.redirect_traffic = false;
            }



            var data_migrator = new migration_helper();

            data_migrator.export_data(apps, params, common.db, log).then(
                function(result) {
                    common.returnMessage(params, 200, result);
                },
                function(error) {
                    common.returnMessage(params, 404, error.message);
                }

            );

        });
        return true;
    });

    //Validates if given token and address can be used for data import
    //@server_address - remote server address
    //@server_token  - token generated on remote server
    plugins.register("/o/datamigration/validateconnection", function(ob) {
        var params = ob.params;

        if (params.qstring.args) {
            try {
                params.qstring.args = JSON.parse(params.qstring.args);
            }
            catch (SyntaxError) {
                log.e('Parse ' + params.qstring.args + ' JSON failed');
            }
        }

        validateRead(params, FEATURE_NAME, function() {
            if (!params.qstring.server_token || params.qstring.server_token === '') {
                common.returnMessage(params, 404, 'data-migration.token_missing');
                return true;
            }

            if (!params.qstring.server_address || params.qstring.server_address === '') {
                common.returnMessage(params, 404, 'data-migration.address_missing');
                return true;
            }
            /**
            * callback function for sending data
            * @param {object} err  - error object
            * @param {object} res - result object
            * @returns {boolean} true or nothing
            */
            function requestCallback(err, res) {
                if (err) {
                    common.returnMessage(params, 404, err.message);
                    return true;
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
                        catch (exp) {
                            log.e('Parse ' + res.body + ' JSON failed');
                        }
                    }

                    if (res.statusCode >= 400 && res.statusCode < 500) {
                        if (msg === "Invalid path") {
                            msg = "data-migration.invalid-server-path";
                        }
                        common.returnMessage(params, 404, msg);
                    }
                    else if (res.statusCode === 200 && msg === "valid") {
                        common.returnMessage(params, 200, 'data-migration.connection-is-valid');
                    }
                    else {
                        msg = "data-migration.target-server-not-valid";
                        common.returnMessage(params, 404, msg);
                    }
                }
                return;
            }
            //remove forvarding slashes
            params.qstring.server_address = trim_ending_slashes(params.qstring.server_address);
            var r = request.post({url: params.qstring.server_address + '/i/datamigration/import?test_con=1&auth_token=' + params.qstring.server_token}, requestCallback);
            r.form();
        });
        return true;

    });

    //Send exported
    //@server_address - remote server address
    //@server_token  - token generated on remote server
    //@exportid = export id
    plugins.register("/i/datamigration/sendexport", function(ob) {
        var params = ob.params;

        if (params.qstring.args) {
            try {
                params.qstring.args = JSON.parse(params.qstring.args);
            }
            catch (SyntaxError) {
                log.e('Parse ' + params.qstring.args + ' JSON failed');
            }
        }
        validateCreate(params, FEATURE_NAME, function() {
            if (params.qstring.exportid) {
                if (!params.qstring.server_token || params.qstring.server_token === '') {
                    common.returnMessage(params, 404, 'data-migration.token_missing');
                    return true;
                }

                if (!params.qstring.server_address || params.qstring.server_address === '') {
                    common.returnMessage(params, 404, 'data-migration.address_missing');
                    return true;
                }

                //remove forvarding slashes
                params.qstring.server_address = trim_ending_slashes(params.qstring.server_address);

                if (params.qstring.redirect_traffic && parseInt(params.qstring.redirect_traffic) === 1) {
                    params.qstring.redirect_traffic = true;
                }
                else {
                    params.qstring.redirect_traffic = false;
                }

                var myreq = JSON.stringify({headers: params.req.headers});
                update_progress(params.qstring.exportid, "packing", "progress", 100, "", true, {stopped: false, only_export: false, server_address: params.qstring.server_address, server_token: params.qstring.server_token, redirect_traffic: params.qstring.redirect_traffic, userid: params.member._id, email: params.member.email, myreq: myreq});

                common.returnMessage(params, 200, "Success");

                var data_migrator = new migration_helper(common.db);
                data_migrator.send_export(params.qstring.exportid, common.db);

            }
            else {
                common.returnMessage(params, 404, 'data-migration.invalid-exportid');
            }

        });
        return true;
    });

}(pluginOb));

module.exports = pluginOb;