var plugin = {},
    fs = require('fs'),
    path = require('path'),
    common = require('../../../api/utils/common.js'),
    parser = require('properties-parser'),
    mail = require('../../../api/parts/mgmt/mail.js'),
    plugins = require('../../pluginManager.js'),
    log = common.log('plugins:api'),
    { validateUser, validateGlobalAdmin, validateAppAdmin } = require('../../../api/utils/rights.js');

(function() {
    plugins.register('/i/plugins', function(ob) {
        var params = ob.params;

        validateGlobalAdmin(params, function() {
            /*if (process.env.COUNTLY_CONTAINER === 'api') {
                common.returnMessage(params, 400, 'Not allowed in containerized environment');
                return false;
            }*/

            if (typeof params.qstring.plugin !== 'undefined' && params.qstring.plugin !== 'plugins') {
                try {
                    params.qstring.plugin = JSON.parse(params.qstring.plugin);
                }
                catch (err) {
                    console.log('Error parsing plugins');
                }

                if (params.qstring.plugin && typeof params.qstring.plugin === 'object') {
                    // updatePluginState("start");

                    var before = {};
                    var fordb = {};
                    var arr = plugins.getPlugins();
                    for (var i in params.qstring.plugin) {
                        fordb['plugins.' + i] = params.qstring.plugin[i];
                        if (arr.indexOf(i) === -1) {
                            before[i] = false;
                        }
                        else {
                            before[i] = true;
                        }
                    }
                    common.db.collection('plugins').updateOne({'_id': 'plugins'}, {'$set': fordb}, function(err1) {
                        if (err1) {
                            log.e(err1);
                        }
                        else {
                            plugins.dispatch("/systemlogs", {params: params, action: "change_plugins", data: {before: before, update: params.qstring.plugin}});
                            // process.send({ cmd: "startPlugins" });
                            plugins.loadConfigs(common.db, function() {
                                common.returnMessage(params, 200, "started");
                                /* plugins.syncPlugins(params.qstring.plugin, function(err) {
									if (!err) {
										process.send({ cmd: "endPlugins" });
										updatePluginState("end");
									}
									else {
										updatePluginState("failed");
									}
								}, common.db);*/
                            });
                        }
                    });
                }
            }
            else {
                common.returnOutput(params, "Not enough parameters");
            }
        });
        return true;
    });

    plugins.register('/o/plugins-check', function(ob) {
        var params = ob.params;
        validateGlobalAdmin(params, function() {
            common.db.collection('plugins').count({"_id": "failed"}, function(failedErr, failedCount) {
                if (!failedErr && failedCount < 1) {
                    common.db.collection('plugins').count({"_id": "busy"}, function(busyErr, count) {
                        if (busyErr) {
                            common.returnMessage(params, 200, "failed");
                        }
                        else {
                            if (count > 0) {
                                common.returnMessage(params, 200, "busy");
                            }
                            else {
                                common.returnMessage(params, 200, "completed");
                            }
                        }
                    });
                }
                else {
                    common.returnMessage(params, 200, "failed");
                }
            });
        });
        return true;
    });

    plugins.register("/o/plugins", function(ob) {

        var params = ob.params;
        var ignore = {"empty": true, "plugins": true};
        var walk = function(dir, allPlugins, done) {
            var results = [];
            fs.readdir(dir, function(err, list) {
                if (err) {
                    return done(err);
                }
                var pending = list.length;
                if (!pending) {
                    return done(null, results);
                }
                list.forEach(function(file) {
                    if (!ignore[file] && typeof allPlugins[file] !== 'undefined') {
                        var fullpath = dir + '/' + file;
                        fs.stat(fullpath, function(fsError, stat) {
                            if (stat && stat.isDirectory()) {
                                var data;
                                try {
                                    data = require(fullpath + '/package.json');
                                }
                                catch (ex) {
                                    // Error
                                }
                                var resultObj = {};
                                resultObj.enabled = allPlugins[file] || false;

                                resultObj.code = file;
                                if (data) {
                                    resultObj.title = data.title || file;
                                    resultObj.name = data.name || file;
                                    resultObj.description = data.description || file;
                                    resultObj.version = data.version || "unknown";
                                    resultObj.author = data.author || "unknown";
                                    resultObj.homepage = data.homepage || "";
                                    resultObj.cly_dependencies = data.cly_dependencies || {};

                                    //we need to get localization only if plugin is disabled
                                    if (!resultObj.enabled) {
                                        var local_path = fullpath + "/frontend/public/localization/" + resultObj.code + ".properties";
                                        if (params.member.lang && params.member.lang !== "en") {
                                            local_path = fullpath + "/frontend/public/localization/" + resultObj.code + "_" + params.member.lang + ".properties";
                                        }
                                        if (fs.existsSync(local_path)) {
                                            var local_properties = fs.readFileSync(local_path);
                                            local_properties = parser.parse(local_properties);
                                            resultObj.title = local_properties[resultObj.code + ".plugin-title"] || local_properties[resultObj.code + ".title"] || resultObj.title;
                                            resultObj.description = local_properties[resultObj.code + ".plugin-description"] || local_properties[resultObj.code + ".description"] || resultObj.description;
                                        }
                                    }
                                }
                                else {
                                    resultObj = {name: file, title: file, description: file, version: "unknown", author: "unknown", homepage: "", code: file, enabled: false, cly_dependencies: {}};
                                }
                                if (global.enclose) {
                                    var eplugin = global.enclose.plugins[file];
                                    resultObj.prepackaged = eplugin && eplugin.prepackaged;
                                }
                                results.push(resultObj);
                                if (!--pending) {
                                    done(null, results);
                                }
                            }
                            else {
                                if (!--pending) {
                                    done(null, results);
                                }
                            }
                        });
                    }
                    else
                    if (!--pending) {
                        done(null, results);
                    }
                });
            });
        };
        validateGlobalAdmin(params, function() {
            var dir = path.resolve(__dirname, "../../");

            //getting list of plugins.
            common.db.collection("plugins").findOne({_id: "plugins"}, function(err0, res) {
                if (err0) {
                    log.e(err0);
                }
                var allPlugins = res.plugins;
                allPlugins = allPlugins || {};

                var pluginList = plugins.getPlugins(true);

                var update = {};
                for (var z = 0; z < pluginList.length; z++) {
                    if (typeof allPlugins[pluginList[z]] === 'undefined') {
                        update['plugins.' + pluginList[z]] = true;
                        allPlugins[pluginList[z]] = true;
                    }
                }
                if (Object.keys(update).length > 0) {
                    common.db.collection("plugins").updateOne({_id: "plugins"}, {"$set": update}, function(err6) {
                        if (err6) {
                            log.e(err6);
                        }
                    });
                }

                walk(dir, allPlugins, function(err, results) {
                    if (err) {
                        console.error(err);
                    }
                    common.returnOutput(params, results || {});
                });

            });
        });
        return true;
    });

    plugins.register("/o/internal-events", function(ob) {
        var params = ob.params;

        validateGlobalAdmin(params, function() {
            var events = [];
            common.arrayAddUniq(events, plugins.internalEvents.concat(plugins.internalDrillEvents));
            common.returnOutput(params, events);
        });
        return true;
    });

    plugins.register("/i/configs", function(ob) {
        var params = ob.params;

        validateGlobalAdmin(params, function() {
            var data = {};
            if (params.qstring.configs) {
                try {
                    data = JSON.parse(params.qstring.configs);
                }
                catch (err) {
                    console.log("Error parsing configs", params.qstring.configs);
                }
            }
            if (Object.keys(data).length > 0) {
                if (data.frontend && typeof data.frontend.session_timeout !== "undefined") {
                    var updateArr = {"ttl": 0, "ends": 0};
                    if (data.frontend.session_timeout) {
                        updateArr.ends = data.frontend.session_timeout * 60 + Math.round(Date.now() / 1000);
                        updateArr.ttl = data.frontend.session_timeout * 60;
                    }
                    if (params.member.settings && params.member.settings.frontend && typeof data.frontend.session_timeout !== "undefined") {} //eslint-disable-line no-empty
                    else { //if not set member value
                        common.db.collection("auth_tokens").update({"owner": ob.params.member._id + "", "purpose": "LoggedInAuth"}, {$set: updateArr}, function(err) {
                            if (err) {
                                console.log(err);
                            }
                        });
                    }
                }
                plugins.dispatch("/systemlogs", {params: params, action: "change_configs", data: {before: plugins.getAllConfigs(), update: data}});
                plugins.updateAllConfigs(common.db, data, function() {
                    plugins.loadConfigs(common.db, function() {
                        common.returnOutput(params, plugins.getAllConfigs());
                    });
                });
            }
            else {
                common.returnMessage(params, 400, 'Error updating configs');
            }
        });
        return true;
    });

    plugins.register("/o/configs", function(ob) {
        var params = ob.params;
        validateAppAdmin(params, function() {
            plugins.loadConfigs(common.db, function() {
                var confs = plugins.getAllConfigs();
                delete confs.services;
                common.returnOutput(params, confs);
            });
        });
        return true;
    });

    plugins.register("/i/userconfigs", function(ob) {
        var params = ob.params;
        validateGlobalAdmin(params, function() {
            var data = {};
            if (params.qstring.configs) {
                try {
                    data = JSON.parse(params.qstring.configs);
                }
                catch (err) {
                    console.log("Error parsing configs", params.qstring.configs);
                }
            }
            if (Object.keys(data).length > 0) {
                if (data.frontend && typeof data.frontend.session_timeout !== "undefined") {
                    var updateArr = {"ttl": 0, "ends": 0};
                    if (data.frontend.session_timeout) {
                        updateArr.ends = data.frontend.session_timeout * 60 + Math.round(Date.now() / 1000);
                        updateArr.ttl = data.frontend.session_timeout * 60;
                    }

                    common.db.collection("auth_tokens").update({"owner": ob.params.member._id + "", "purpose": "LoggedInAuth"}, {$set: updateArr}, function(err) {
                        if (err) {
                            console.log(err);
                        }
                    });
                }
                plugins.updateUserConfigs(common.db, data, params.member._id, function() {
                    common.returnOutput(params, plugins.getUserConfigs(params.member.settings));
                });
            }
            else {
                common.returnMessage(params, 400, 'Error updating configs');
            }
        });
        return true;
    });

    plugins.register("/o/userconfigs", function(ob) {
        var params = ob.params;
        validateUser(params, function() {
            plugins.loadConfigs(common.db, function() {
                var confs = plugins.getUserConfigs(params.member.settings);
                common.returnOutput(params, confs);
            });
        });
        return true;
    });

    plugins.register("/o/themes", function(ob) {
        var params = ob.params;
        validateUser(params, function() {
            var themeDir = path.resolve(__dirname, "../../../frontend/express/public/themes/");
            fs.readdir(themeDir, function(err, list) {
                if (!Array.isArray(list)) {
                    list = [];
                }
                list.unshift("");
                var index = list.indexOf(".gitignore");
                if (index > -1) {
                    list.splice(index, 1);
                }
                common.returnOutput(params, list);
            });
        });
        return true;
    });

    /*var updatePluginState = function(state) {
        switch (state) {
        case 'start':
            common.db.collection('plugins').remove({"_id": "failed"}, function() {});
            common.db.collection('plugins').insert({"_id": "busy"}, function() {});
            break;
        case 'failed':
            common.db.collection('plugins').remove({"_id": "busy"}, function() {});
            common.db.collection('plugins').insert({"_id": "failed"}, function() {});
            break;
        case 'end':
            common.db.collection('plugins').remove({"_id": "busy"}, function() {});
            break;
        }
    };*/

    plugins.register("/o/email_test", function(ob) {
        // check if global admin
        validateGlobalAdmin(ob.params, function(params) {
            const member = ob.params.member || {};

            var fullpath = path.resolve(__dirname, "../");
            var local_path = fullpath + "/frontend/public/localization/plugins.properties";
            if (params.member.lang && params.member.lang !== "en") {
                path = fullpath + "/frontend/public/localization/plugins" + "_" + params.member.lang + ".properties";
                if (fs.existsSync(path)) {
                    local_path = path;
                }
            }
            let subject = 'Countly test email';
            let message = 'Countly test email succesfully delivered!';
            if (fs.existsSync(local_path)) {
                var local_properties = fs.readFileSync(local_path);
                local_properties = parser.parse(local_properties);
                subject = local_properties["configs.help.api-send_test_email_subject"] || subject;
                message = local_properties["configs.help.api-send_test_email_message"] || message;
            }

            mail.sendMessage(member.email, subject, message, (err) => {
                if (err) {
                    return common.returnMessage(params, 503, 'Failed');
                }
                return common.returnMessage(params, 200, 'OK');
            });

        });
        return true;
    });

}(plugin));

module.exports = plugin;