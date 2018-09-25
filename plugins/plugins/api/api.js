var plugin = {},
    fs = require('fs'),
    path = require('path'),
    common = require('../../../api/utils/common.js'),    
    parser = require('properties-parser'),
    plugins = require('../../pluginManager.js');

(function() {
    plugins.register('/i/plugins', function(ob) {
        var params = ob.params;
        var validateUserForWriteAPI = ob.validateUserForWriteAPI;
        validateUserForWriteAPI(function() {
            if (!params.member.global_admin) {
                common.returnMessage(params, 401, 'User is not a global administrator');
                return false;
            }
            if (typeof params.qstring.plugin !== 'undefined' && params.qstring.plugin != 'plugins') {
                try {
                    params.qstring.plugin = JSON.parse(params.qstring.plugin);
                }
                catch (err) {
                    console.log('Error parsing plugins');
                }

                if (params.qstring.plugin && typeof params.qstring.plugin === 'object') {
                    var before = {};
                    var arr = plugins.getPlugins();
                    for (var i in params.qstring.plugin) {
                        if (arr.indexOf(i) === -1) {
                            before[i] = false;
                        }
                        else {
                            before[i] = true;
                        }
                    }
                    plugins.dispatch("/systemlogs", {params: params, action: "change_plugins", data: {before: before, update: params.qstring.plugin}});
                    process.send({ cmd: "startPlugins" });
                    plugins.syncPlugins(params.qstring.plugin, function(err) {
                        process.send({ cmd: "endPlugins" });
                        if (err) {
                            common.returnOutput(params, 'Errors');
                        }
                        else {
                            common.returnOutput(params, 'Success');
                        }
                    }, common.db);
                }
            }
            else {
                common.returnOutput(params, 'Not enough parameters');
            }
        }, params);
        return true;
    });
    plugins.register("/o/plugins", function(ob) {
        var params = ob.params;
        var pluginList = plugins.getPlugins();
        var ignore = {"empty": true, "plugins": true};
        var walk = function(dir, done) {
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
                    if (!ignore[file]) {
                        var fullpath = dir + '/' + file;
                        fs.stat(fullpath, function(err, stat) {
                            if (stat && stat.isDirectory()) {
                                var data;
                                try {
                                    data = require(fullpath + '/package.json');
                                }
                                catch (ex) {
                                    // Error
                                }
                                ob = {};
                                if (pluginList.indexOf(file) > -1) {
                                    ob.enabled = true;
                                }
                                else {
                                    ob.enabled = false;
                                }
                                ob.code = file;
                                if (data) {
                                    ob.title = data.title || file;
                                    ob.name = data.name || file;
                                    ob.description = data.description || file;
                                    ob.version = data.version || "unknown";
                                    ob.author = data.author || "unknown";
                                    ob.homepage = data.homepage || "";

                                    //we need to get localization only if plugin is disabled
                                    if (!ob.enabled) {
                                        var local_path = fullpath + "/frontend/public/localization/" + ob.code + ".properties";
                                        if (params.member.lang && params.member.lang !== "en") {
                                            local_path = fullpath + "/frontend/public/localization/" + ob.code + "_" + params.member.lang + ".properties";
                                        }
                                        if (fs.existsSync(local_path)) {
                                            var local_properties = fs.readFileSync(local_path);
                                            local_properties = parser.parse(local_properties);
                                            ob.title = local_properties[ob.code + ".plugin-title"] || local_properties[ob.code + ".title"] || ob.title;
                                            ob.description = local_properties[ob.code + ".plugin-description"] || local_properties[ob.code + ".description"] || ob.description;
                                        }
                                    }
                                }
                                else {
                                    ob = {name: file, title: file, description: file, version: "unknown", author: "unknown", homepage: "", code: file, enabled: false};
                                }
                                if (global.enclose) {
                                    var eplugin = global.enclose.plugins[file];
                                    ob.prepackaged = eplugin && eplugin.prepackaged;
                                }
                                results.push(ob);
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
        var validateUserForMgmtReadAPI = ob.validateUserForMgmtReadAPI;
        validateUserForMgmtReadAPI(function() {
            if (!params.member.global_admin) {
                common.returnMessage(params, 401, 'User is not a global administrator');
                return false;
            }
            var dir = path.resolve(__dirname, "../../");
            walk(dir, function(err, results) {
                if (err) {
                    console.error(err);
                }
                common.returnOutput(params, results || {});
            });
        }, params);
        return true;
    });

    plugins.register("/i/configs", function(ob) {
        var params = ob.params;
        var validateUserForWriteAPI = ob.validateUserForWriteAPI;
        validateUserForWriteAPI(function() {
            if (!params.member.global_admin) {
                common.returnMessage(params, 401, 'User is not a global administrator');
                return false;
            }
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
                    if (params.member.settings && params.member.settings.frontend && typeof data.frontend.session_timeout !== "undefined") {
                        // Empty block
                    }
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
        }, params);
        return true;
    });

    plugins.register("/o/configs", function(ob) {
        var params = ob.params;
        var validateUserForMgmtReadAPI = ob.validateUserForMgmtReadAPI;
        validateUserForMgmtReadAPI(function() {
            if (!params.member.global_admin) {
                common.returnMessage(params, 401, 'User is not a global administrator');
                return false;
            }
            var confs = plugins.getAllConfigs();
            delete confs.services;
            common.returnOutput(params, confs);
        }, params);
        return true;
    });

    plugins.register("/i/userconfigs", function(ob) {
        var params = ob.params;
        var validateUserForWriteAPI = ob.validateUserForWriteAPI;
        validateUserForWriteAPI(function() {
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
        }, params);
        return true;
    });

    plugins.register("/o/userconfigs", function(ob) {
        var params = ob.params;
        var validateUserForMgmtReadAPI = ob.validateUserForMgmtReadAPI;
        validateUserForMgmtReadAPI(function() {
            var confs = plugins.getUserConfigs(params.member.settings);
            common.returnOutput(params, confs);
        }, params);
        return true;
    });

    plugins.register("/o/themes", function(ob) {
        var params = ob.params;
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
        return true;
    });
}(plugin));

module.exports = plugin;