/*global countlyCommon,jQuery,countlyGlobal,CV */
(function(countlyPlugins, $) {

    //Private Properties
    var _pluginsData = {};
    var _configsData = {};
    var _userConfigsData = {};
    var _themeList = [];
    var _graph = {};

    //Public Methods
    countlyPlugins.initialize = function() {
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/o/plugins",
            data: {
                app_id: countlyCommon.ACTIVE_APP_ID
            },
            success: function(json) {
                _pluginsData = json;
                _graph = {};
                var dependentsMap = _pluginsData.reduce(function(acc, val) {
                    Object.keys(val.cly_dependencies).forEach(function(dep) {
                        if (!Object.prototype.hasOwnProperty.call(acc, dep)) {
                            acc[dep] = {};
                        }
                        acc[dep][val.code] = 1;
                    });
                    return acc;
                }, {});
                _pluginsData.forEach(function(plugin) {
                    if (Object.prototype.hasOwnProperty.call(dependentsMap, plugin.code)) {
                        plugin.dependents = dependentsMap[plugin.code];
                    }
                    else {
                        plugin.dependents = {};
                    }
                    _graph[plugin.code] = {title: plugin.title, parents: plugin.cly_dependencies, children: plugin.dependents};
                });
            }
        });
    };

    countlyPlugins.getTitle = function(code) {
        if (!Object.prototype.hasOwnProperty.call(_graph, code)) {
            return "";
        }

        return _graph[code].title;
    };

    countlyPlugins.getRelativePlugins = function(code, direction) {

        if (!Object.prototype.hasOwnProperty.call(_graph, code)) {
            return [];
        }

        direction = direction || "up";

        if (Object.prototype.hasOwnProperty.call(_graph[code], direction)) {
            return _graph[code][direction];
        }

        var queue = [code],
            visited = {},
            relativeType = "parents";
        if (direction !== "up") {
            relativeType = "children";
        }
        while (queue.length > 0) {
            var current = queue.pop();
            if (Object.prototype.hasOwnProperty.call(visited, current)) {
                continue;
            }

            if (!_graph[current]) {
                visited[current] = 1;
                continue;
            }

            for (var item in _graph[current][relativeType]) {
                queue.push(item);
            }
            visited[current] = 1;
        }
        var relatives = [];
        for (var itemCode in visited) {
            if (itemCode !== code) {
                relatives.push(itemCode);
            }
        }

        _graph[code][direction] = relatives;

        return relatives;
    };

    countlyPlugins.toggle = function(plugins, callback) {
        $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/i/plugins",
            data: {
                plugin: JSON.stringify(plugins),
                app_id: countlyCommon.ACTIVE_APP_ID
            },
            success: function(json) {
                if (callback) {
                    callback(json);
                }
            },
            error: function(xhr, textStatus, errorThrown) {
                try {
                    var json = JSON.parse(xhr.responseText);
                    if (callback && json.result) {
                        return callback(json.result);
                    }
                }
                catch (e) {
                    e.message;
                }
                var ret = textStatus + " ";
                ret += xhr.status + ": " + $(xhr.responseText).text();
                if (errorThrown) {
                    ret += errorThrown + "\n";
                }
                if (callback) {
                    callback(ret);
                }
            }
        });
    };

    countlyPlugins.initializeConfigs = function() {
        return $.when(
            $.ajax({
                type: "GET",
                url: countlyCommon.API_URL + "/o/themes",
                data: {
                    app_id: countlyCommon.ACTIVE_APP_ID
                },
                success: function(json) {
                    _themeList = json;
                }
            }),
            $.ajax({
                type: "GET",
                url: countlyCommon.API_URL + "/o/configs",
                data: {
                    app_id: countlyCommon.ACTIVE_APP_ID
                },
                success: function(json) {
                    _configsData = json;
                }
            })
        ).then(function() {
            return true;
        });
    };

    countlyPlugins.updateConfigs = function(configs, callback) {
        $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/i/configs",
            data: {
                configs: JSON.stringify(configs),
                app_id: countlyCommon.ACTIVE_APP_ID
            },
            success: function(json) {
                _configsData = json;
                if (callback) {
                    callback(null, json);
                }
            },
            error: function(json) {
                if (callback) {
                    callback(true, json);
                }
            }
        });
    };

    countlyPlugins.initializeUserConfigs = function() {
        return $.when(
            $.ajax({
                type: "GET",
                url: countlyCommon.API_URL + "/o/themes",
                data: {
                    app_id: countlyCommon.ACTIVE_APP_ID
                },
                success: function(json) {
                    _themeList = json;
                }
            }),
            $.ajax({
                type: "GET",
                url: countlyCommon.API_URL + "/o/userconfigs",
                data: {
                    app_id: countlyCommon.ACTIVE_APP_ID
                },
                success: function(json) {
                    _userConfigsData = json;
                }
            })
        ).then(function() {
            return true;
        });
    };

    countlyPlugins.initializeActiveAppConfigs = function() {
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/o/apps/plugins",
            data: {
                app_id: countlyCommon.ACTIVE_APP_ID,
            },
            success: function(appPluginsConfig) {
                countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].plugins = appPluginsConfig.plugins;
            }
        });
    };

    countlyPlugins.updateUserConfigs = function(configs, callback) {
        $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/i/userconfigs",
            data: {
                configs: JSON.stringify(configs),
                app_id: countlyCommon.ACTIVE_APP_ID
            },
            success: function(json) {
                _userConfigsData = json;
                if (callback) {
                    callback(null, json);
                }
            },
            error: function(json) {
                if (callback) {
                    callback(true, json);
                }
            }
        });
    };

    countlyPlugins.getData = function() {
        return _pluginsData;
    };

    countlyPlugins.getConfigsData = function() {
        return _configsData;
    };

    countlyPlugins.getUserConfigsData = function() {
        return _userConfigsData;
    };

    countlyPlugins.getThemeList = function() {
        var themeList = [];
        themeList.push({value: "", label: CV.i18n("configs.no-theme")});
        for (var theme in _themeList) {
            if (_themeList[theme]) {
                themeList.push({value: _themeList[theme], label: _themeList[theme]});
            }
        }
        return themeList;
    };

    countlyPlugins.deleteAccount = function(configs, callback) {
        $.ajax({
            type: "POST",
            url: countlyCommon.API_URL + "/i/users/deleteOwnAccount",
            data: {
                password: configs.password,
                app_id: countlyCommon.ACTIVE_APP_ID
            },
            success: function(json) {
                if (callback) {
                    if (json && json.result && json.result === 'Success') {
                        callback(null, true);
                    }
                    else {
                        callback(null, json);
                    }
                }
            },
            error: function(xhr, textStatus/*, errorThrown*/) {
                if (callback) {
                    if (xhr.responseText && xhr.responseText !== "") {
                        try {
                            var resp = JSON.parse(xhr.responseText);
                            if (resp) {
                                callback(true, resp.result);
                            }
                            else {
                                callback(true, textStatus);
                            }
                        }
                        catch (ex) {
                            callback(true, textStatus);
                        }
                    }
                    else {
                        callback(true, textStatus);
                    }

                }
            }
        });
    };

}(window.countlyPlugins = window.countlyPlugins || {}, jQuery));
