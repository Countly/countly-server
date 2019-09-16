/*global countlyCommon,jQuery */
(function(countlyPlugins, $) {

    //Private Properties
    var _pluginsData = {};
    var _configsData = {};
    var _userConfigsData = {};
    var _themeList = [];

    //Public Methods
    countlyPlugins.initialize = function() {
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/o/plugins",
            data: {
            },
            success: function(json) {
                _pluginsData = json;
            }
        });
    };

    countlyPlugins.toggle = function(plugins, callback) {
        $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/i/plugins",
            data: {
                plugin: JSON.stringify(plugins)
            },
            success: function(json) {
                if (callback) {
                    callback(json);
                }
            },
            error: function(xhr, textStatus, errorThrown) {
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
                data: {},
                success: function(json) {
                    _themeList = json;
                }
            }),
            $.ajax({
                type: "GET",
                url: countlyCommon.API_URL + "/o/configs",
                data: {},
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
                configs: JSON.stringify(configs)
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
                data: {},
                success: function(json) {
                    _themeList = json;
                }
            }),
            $.ajax({
                type: "GET",
                url: countlyCommon.API_URL + "/o/userconfigs",
                data: {},
                success: function(json) {
                    _userConfigsData = json;
                }
            })
        ).then(function() {
            return true;
        });
    };

    countlyPlugins.updateUserConfigs = function(configs, callback) {
        $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/i/userconfigs",
            data: {
                configs: JSON.stringify(configs)
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
        return _themeList;
    };

    countlyPlugins.deleteAccount = function(configs, callback) {
        $.ajax({
            type: "POST",
            url: countlyCommon.API_URL + "/i/users/deleteOwnAccount",
            data: {
                password: configs.password,
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