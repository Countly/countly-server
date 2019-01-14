var plugin = {},
    countlyConfig = require("../../../frontend/express/config"),
    plugins = require("../../pluginManager");
const fs = require('fs');
const fse = require('fs-extra'); //easiermove files, delete folders
var StreamZip = require('node-stream-zip'); //for zips
var Promise = require("bluebird");
var cp = require('child_process'); //call process
var spawn = cp.spawn; //for calling comannd line

var path = require('path');

var common = require('../../../api/utils/common.js');
var log = common.log('plugin-upload:app');
var plugin_dir = "";
var plugindata = {};

/** checking name - if not overwriting any existing plugin
* @param {string} filepath  - path to file, where plugins are listed
* @param {string} myname - new plugin name
* @param {boolean} mandatory - boolean, if checking enabled plugin list
* @return {Promise} returns promise 
*/
function check_name_list(filepath, myname, mandatory) {
    return new Promise(function(resolve, reject) {
        if (fs.existsSync(filepath)) {
            fs.readFile(filepath, (err, filedata)=> {
                if (err) {
                    reject(Error("Unable to parse plugin list file"));
                }
                var mylist = null;
                try {
                    mylist = JSON.parse(filedata);
                }
                catch (SyntaxError) { //unable to parse package list
                    return reject(Error("Unable to parse plugin list file"));
                }
                if (mylist) {
                    for (let i = 0; i < mylist.length; i++) {
                        if (mylist[i] === myname) {
                            if (mandatory === false) {
                                return reject(Error('existing_name'));
                            }
                            else {
                                return reject(Error('enabled_plugin'));
                            }
                        }
                    }
                    return resolve();
                }
            });

        }
        else {
            if (mandatory) {
                reject(Error('nofile'));
            }
            else {
                resolve();
            }

        }
    });
}

/** checks package.json file(if exists, mandotory fields) calls check_name_list on plugins.ee.json(if exists) and plugins.json to prevent rewriting enterprise or enabled plugins;
* @param {string} my_path  - path to folder, where plugin extracted
* @return {Promise} returns promise 
*/
function check_package_file(my_path) {
    return new Promise(function(resolve, reject) {
        if (!fs.existsSync(my_path + '/package.json')) {
            return reject(Error('package_missing'));
        }
        fs.readFile(my_path + '/package.json', (err, data) => {
            var mydata = null;
            //unable to read package file
            if (err) {
                return reject(Error('package_invalid'));
            }
            try {
                mydata = JSON.parse(data);
            }
            catch (SyntaxError) { //unable to parse package file
                return reject(Error('package_invalid'));
            }

            //check if mandatory fields exist
            if (!mydata) {
                return reject(Error('package_invalid'));
            }
            if (!mydata.name) {
                return reject(Error('name_missing'));
            }
            if (!mydata.title) {
                return reject(Error('title_missing'));
            }
            if (!mydata.version) {
                return reject(Error('version_missing'));
            }
            if (!mydata.description) {
                return reject(Error('description_missing'));
            }

            if (mydata.name.indexOf(".") > -1) {
                return reject(Error('name_invalid'));//name shall not contain dot
            }
            if (!plugin_dir || plugin_dir === '' || plugin_dir === 'unpacked') {
                plugin_dir = mydata.name;
            }
            check_name_list(__dirname + '/../../plugins.ee.json', plugin_dir, false)
                .then(function() {
                    return check_name_list(__dirname + '/../../plugins.json', plugin_dir, true);
                })
                .then(
                    function() {
                        plugindata = mydata;
                        return resolve();
                    },
                    function(error) {
                        return reject(error);
                    }
                );
        });
    });
}

/** checks if there is any of other mandatory files or folders.
* @param {string} my_path  - path to folder, where plugin is extracted
* @returns {Promise} ->resolved or rejected
*/
function check_structure(my_path) {
    return new Promise(function(resolve, reject) {
        if (!fs.existsSync(my_path + '/api/api.js')) {
            return reject(Error('apijs_missing'));
        }
        if (!fs.existsSync(my_path + '/frontend/app.js')) {
            return reject(Error('appjs_missing'));
        }
        if (!fs.existsSync(my_path + '/frontend/public/')) {
            return reject(Error('public_missing'));
        }
        if (!fs.existsSync(my_path + '/install.js')) {
            return reject(Error('install_missing'));
        }
        if (!fs.existsSync(my_path + '/uninstall.js')) {
            return reject(Error('uninstall_missing'));
        }
        if (!fs.existsSync(my_path + '/frontend/public/javascripts')) {
            return reject(Error('javascripts_missing'));
        }

        resolve();
    });
}

/** install dependencies and validate app.js. clears plugins/{myplugindir} if already uploaded once. 
* @returns {Promise} ->resolved or rejected
*/
function reset_plugin_dir() {
    return new Promise(function(resolve, reject) {
        if (plugin_dir !== '') {
            if (fs.existsSync(__dirname + '/../../' + plugin_dir)) {
                fse.remove(__dirname + '/../../' + plugin_dir, err => {
                    if (err) {
                        reject(Error('unable_copy_files'));
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
            reject(Error('unable_copy_files'));
        }
    });
}

/** cleans up uploaded temporary files
* @returns {Promise} promise
*/
function cleanup() {
    return new Promise(function(resolve, reject) {
        if (fs.existsSync(__dirname + '/upload')) {
            fse.remove(__dirname + '/upload')
                .then(() => {
                    resolve();
                })
                .catch(err => {
                    reject(err);
                });
        }
    });
}

/** Fixes path
* @param {string} my_path - path to fix
* @returns {string} if returned false - path was wrong. if string - fixed path.
*/
function fix_my_path(my_path) {
    if (fs.existsSync(my_path)) {
        var myfolder = fs.readdirSync(my_path);
        if (myfolder.length === 1) {
            var mm = myfolder[0].split(".");
            //is folder
            if (mm.length === 1) {
                return fix_my_path(my_path + "/" + myfolder[0]);
            }
        }
        return my_path;
    }
    else {
        return false;
    }
}

/**Plugin validation. Called after extraction.
* @param {string} my_path - path to extracted files
* @returns {Promise} promise
*/
function validate_files(my_path) {
    return new Promise(function(resolve, reject) {
        //sometimes there is created subfolder when extracted - fix it
        my_path = fix_my_path(my_path);
        //check
        if (my_path === false) {
            return reject(Error("Folder missing"));
        }
        else {
            var foldername = my_path.split('/');
            plugin_dir = foldername[foldername.length - 1];
            check_package_file(my_path)
                .then(function() {
                    return check_structure(my_path);
                })
                .then(function() {
                    return reset_plugin_dir();
                })
                .then(
                    function() {
                    //copy files
                        fse.move(my_path, __dirname + '/../../' + plugin_dir).then(() => {
                            return resolve();
                        })
                            .catch(err => {
                                reject(err);
                            });
                    },
                    function(err) {
                        return reject(err);
                    }
                ).catch(err => {
                    return reject(err);
                });
        }
    });
}


/**Function used to call new child process, separated from parent. For validate_reset() 
* @param {string} my_command = command to call
* @param {string} my_dir - folder
* @param {string} logpath - path to log file
* @returns {Promise} promise
*/
function run_command(my_command, my_dir, logpath) {
    return new Promise(function(resolve, reject) {
        var stdio = ['inherit', 'inherit', 'inherit'];
        if (logpath) {
            const out = fs.openSync(logpath, 'a');
            const err = fs.openSync(logpath, 'a');
            stdio = [ 'ignore', out, err ];

        }
        var child = spawn(my_command, {cwd: __dirname, shell: true, detached: true, stdio: stdio}, function(error) {
            if (error) {
                return reject(Error('error:' + JSON.stringify(error)));
            }
            else {
                return resolve();
            }
        });

        child.on('exit', function(code) {
            if (code === 0) {
                return resolve();
            }
            else {

                return reject();
            }
        });
    });
}

/**checks if we are not in neverending chrashing  - restarting loop
* If countly is restarted at least 5 times in a row(and there is less than 10 seconds between any restart) - 
* calling /plugin-upload/scripts/disable_plugins.sh. (disables lastly enabled plugins, call upgrade->restart) Creates log with timestamp in log folder. 
*/
function validate_reset() {
    var tstamp = new Date().getTime();
    var tarray = [];
    if (fs.existsSync(__dirname + '/reset_time.json')) {
        let data = fs.readFileSync(__dirname + '/reset_time.json');
        if (data) {
            try {
                tarray = JSON.parse(data);
            }
            catch (SyntaxError) {
                log.d(SyntaxError);
            }
        }
    }
    if (tarray.length > 0) {
        //10 seconds
        if ((tstamp - tarray[tarray.length - 1]) < 10000) {
            tarray.push(tstamp);
            log.d("Reload failure ");
            log.d("Reload failure " + tarray.length);
            //already 5. time in row
            if (tarray.length >= 5) {
                log.d("Attempting disabling plugins, which might cause restart");
                tarray = [tstamp];
                //try reseting all plugins,enabled in last turn
                if (fs.existsSync(__dirname + '/last_enabled_plugins.json')) {
                    var pluginlist = [];
                    let data = fs.readFileSync(__dirname + '/last_enabled_plugins.json');
                    if (data) {
                        try {
                            pluginlist = JSON.parse(data);
                        }
                        catch (error) {
                            log.e(error.message + "1");
                        }
                    }
                }
                if (pluginlist.length > 0) {
                    var logpath = path.resolve(__dirname, './../../../log/plugins-disable' + (new Date().toISOString().replace('T', ':')) + '.log');

                    var mydir = path.resolve(__dirname + '/../scripts');
                    run_command('bash ' + mydir + '/disable_plugins.sh ' + pluginlist.join(' '),
                        mydir, logpath)
                        .then(
                            function() {
                                try {
                                    fs.writeFileSync(__dirname + '/reset_time.json', JSON.stringify(tarray));
                                }
                                catch (error) {
                                    log.e(error.message + "2");
                                }
                            },
                            function(err) {
                                log.e(err.message + "3");
                            }
                        )
                        .catch(err => {
                            log.e(err.message + "4");
                        });

                    log.e('Countly has been crashing and resatarting repeatedly.In attempt to fix it lastly enabled plugins are being disabled:' + pluginlist.join() + ' You can review disabling process here:' + logpath);

                    try {
                        fs.writeFileSync(__dirname + '/reset_time.json', JSON.stringify(tarray));
                    }
                    catch (error) {
                        log.e(error.message + "5");
                    }
                    //saves empty array to not perform disabling
                    try {
                        fs.writeFileSync(__dirname + '/last_enabled_plugins.json', "[]");
                    }
                    catch (error) {
                        log.e(error.message);
                    }
                }
                else {
                    log.d("There are no plugins in [last enabled plugins] list");
                }
            }
        }
        else {
            log.d('good reload');
            tarray = [tstamp];
        }
    }
    else {
        tarray.push(tstamp);
    }
    try {
        fs.writeFileSync(__dirname + '/reset_time.json', JSON.stringify(tarray));
    }
    catch (err) {
        log.e(err.message + "6");
    }
}
/** Extracting files
* @param {string} ext - file extention
* @param {string} target_path  - file to extract
* @returns {Promise} promise
*/
function extract_files(ext, target_path) {
    return new Promise(function(resolve, reject) {
        if (ext === "zip") {
            var zip = new StreamZip({ file: target_path, storeEntries: true });
            zip.on('error', function() {
                return reject(Error("bad_archive"));
            });
            zip.on('ready', function() {
                // extract all
                zip.extract(null, path.resolve(__dirname + '/upload/unpacked'), function(err) {
                    if (err) {
                        return reject(Error("bad_archive"));
                    }
                    else {
                        resolve();
                    }
                });
            });
        }
        //for other - tar, tar.gz
        else {
            var command = "tar xzf " + target_path + " -C " + path.resolve(__dirname + '/upload/unpacked');
            if (ext === "tar") {
                command = "tar xf " + target_path + " -C " + path.resolve(__dirname + '/upload/unpacked');
            }
            run_command(command, null, null).then(function() {
                resolve();
            },
            function() {
                reject(Error("bad_archive"));
            });
        }
    });
}

plugin.init = function(app, countlyDb) {
    validate_reset();//checks if we are not in neverending crashing-restarting loop
    app.post(countlyConfig.path + '/plugins/plugin-upload', function(req, res) {
        if (req.session && req.session.gadm) {
            plugindata = {};
            if (!req) {
                res.end("nofile");return true;
            }
            if (!req.files) {
                res.end("nofile");return true;
            }
            if (!req.files.new_plugin_input) {
                res.end("nofile");return true;
            }

            //upload folder
            var dir = path.resolve(__dirname + '/upload');
            if (!fs.existsSync(dir)) {
                try {
                    fs.mkdirSync(dir, 484);
                }
                catch (err) {
                    log.e(err.message);
                }
            }
            //folder for extracted data
            dir = path.resolve(__dirname + '/upload/unpacked');
            if (!fs.existsSync(dir)) {
                try {
                    fs.mkdirSync(dir, 484);
                }
                catch (err) {
                    log.e(err.message);
                }
            }

            var tmp_path = req.files.new_plugin_input.path;
            var target_path = path.resolve(__dirname + '/upload/' + req.files.new_plugin_input.name);
            var plain_name_array = req.files.new_plugin_input.name.split(".");

            var ext = "";

            if (plain_name_array.length < 2) {
                fs.unlink(tmp_path, function() {});
                res.send("badformat");
                cleanup().then(function() {
                    return true;
                });
            }
            else {
                ext = plain_name_array[1];//zip tar tar.gz tgz

                if (ext !== "zip" && ext !== "tar" && ext !== "tgz") {
                    fs.unlink(tmp_path, function() {});
                    res.send("badformat");
                    cleanup().then(function() {
                        return true;
                    });
                }

                if (plain_name_array.length > 2) {
                    ext = ext + "." + plain_name_array[2];
                }
            }

            var is = fs.createReadStream(tmp_path);
            var os = fs.createWriteStream(target_path);
            is.pipe(os);
            is.on('end', function() {
                fs.unlink(tmp_path, function() {});
            });
            os.on('finish', function() {

                let edir = path.resolve(__dirname + '/upload/unpacked/');
                extract_files(ext, target_path)
                    .then(function() {
                        return validate_files(edir, app, countlyDb);
                    })
                    .then(
                        function() {
                            cleanup()
                                .then(function() {
                                    plugins.callMethod("logAction", {req: req, user: {_id: req.session.uid, email: req.session.email}, action: "plugin_uploaded", data: plugindata});
                                    res.send('Success.' + plugin_dir);
                                });
                        },
                        function(err) {
                            cleanup().then(function() {
                                res.send(err.message);
                            });
                        }
                    );
            });
        }
        else {
            res.send(false);
        }
    });
};

module.exports = plugin;