/*global countlyCommon,jQuery,countlyGlobal,CV */
(function(countlyPlugins, $) {

    //Private Properties
    var _pluginsData = {};
    var _configsData = {};
    var _userConfigsData = {};
    var _themeList = [];
    var _graph = {};
    var _configWarnings = null;

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
            }),
            $.ajax({
                type: "GET",
                url: countlyCommon.API_URL + "/subscription/flex",
                success: function(json) {
                    // create subscription object if it doesn't exist
                    if (!_configsData.subscription) {
                        _configsData.subscription = {};
                    }
                    
                    // add response data to subscription object
                    _configsData.subscription.region = json.region || "";
                    _configsData.subscription.startsAt = json.startsAt || "";
                    _configsData.subscription.endsAt = json.endsAt || "";
                    _configsData.subscription.totalCapacity = json.totalCapacity || 0;
                    _configsData.subscription.used = json.used || 0;
                    _configsData.subscription.available = json.available || 0;
                    _configsData.subscription.currentPlan = json.currentPlan || "basic";
                    _configsData.subscription.extras = json.extras || [];
                    _configsData.subscription.addOns = json.addOns || [];
                    
                    console.log("Subscription data received:", json);
                },
                error: function(xhr, status, error) {
                    console.error("Error fetching subscription data:", error);
                    if (!_configsData.subscription) {
                        _configsData.subscription = {};
                    }
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

    // Warning types and their associated colors
    var WARNING_TYPES = {
        DATA_INGESTION: 'dataIngestion',
        UI_FILTERING: 'uiFiltering',
        SERVER_PERFORMANCE: 'serverPerformance'
        // SECURITY_IMPACT: 'securityImpact' // for the 2nd phase
    };

    // Tooltip color mappings
    var TOOLTIP_COLORS = {
        dataIngestion: { bgColor: '#FCF5E5', textColor: '#E49700' },
        serverPerformance: { bgColor: '#FBECE5', textColor: '#D23F00' },
        uiFiltering: { bgColor: '#E1EFFF', textColor: '#0166D6' }
    };

    /**
     * Helper function to create warning objects
     * @param {string} type - Warning type
     * @param {string} textKey - Warning text key
     * @returns {Object} Warning object with type and text
     */
    function createWarning(type, textKey) {
        return {
            type: type,
            text: textKey
        };
    }

    // Predefined warning combinations
    var WARNING_COMBINATIONS = {
        DATA_INGESTION: [
            createWarning(WARNING_TYPES.DATA_INGESTION, "configs.tooltip.data-ingestion-warning")
        ],
        UI_FILTERING: [
            createWarning(WARNING_TYPES.UI_FILTERING, "configs.tooltip.ui-filtering-warning")
        ],
        SERVER_PERFORMANCE: [
            createWarning(WARNING_TYPES.SERVER_PERFORMANCE, "configs.tooltip.server-performance-warning")
        ]
    };

    /**
     * Initialize configuration warnings
     * @returns {Object} Configuration warnings map
     */
    function initializeConfigWarnings() {
        if (_configWarnings !== null) {
            return _configWarnings;
        }

        var configWarnings = {
            // API Core Configurations
            "api.trim_trailing_ending_spaces": [
                ...WARNING_COMBINATIONS.DATA_INGESTION,
                ...WARNING_COMBINATIONS.UI_FILTERING
            ],
            "api.event_limit": [
                ...WARNING_COMBINATIONS.SERVER_PERFORMANCE,
                ...WARNING_COMBINATIONS.DATA_INGESTION,
                ...WARNING_COMBINATIONS.UI_FILTERING
            ],
            "api.event_segmentation_limit": [
                ...WARNING_COMBINATIONS.SERVER_PERFORMANCE,
                ...WARNING_COMBINATIONS.DATA_INGESTION,
                ...WARNING_COMBINATIONS.UI_FILTERING
            ],
            "api.event_segmentation_value_limit": [
                ...WARNING_COMBINATIONS.SERVER_PERFORMANCE,
                ...WARNING_COMBINATIONS.DATA_INGESTION,
                ...WARNING_COMBINATIONS.UI_FILTERING
            ],
            "api.metric_limit": [
                ...WARNING_COMBINATIONS.SERVER_PERFORMANCE,
                ...WARNING_COMBINATIONS.DATA_INGESTION,
                ...WARNING_COMBINATIONS.UI_FILTERING
            ],
            "api.session_duration_limit": [
                ...WARNING_COMBINATIONS.DATA_INGESTION,
                ...WARNING_COMBINATIONS.UI_FILTERING
            ],
            "api.array_list_limit": [
                ...WARNING_COMBINATIONS.SERVER_PERFORMANCE,
                ...WARNING_COMBINATIONS.DATA_INGESTION,
                ...WARNING_COMBINATIONS.UI_FILTERING
            ],
            "api.city_data": [
                ...WARNING_COMBINATIONS.DATA_INGESTION,
                ...WARNING_COMBINATIONS.UI_FILTERING
            ],
            "api.country_data": [
                ...WARNING_COMBINATIONS.DATA_INGESTION,
                ...WARNING_COMBINATIONS.UI_FILTERING
            ],

            // Logging Configurations
            "logs.default": WARNING_COMBINATIONS.UI_FILTERING,

            // Plugin-specific Configurations
            "attribution.segment_value_limit": [
                ...WARNING_COMBINATIONS.SERVER_PERFORMANCE,
                ...WARNING_COMBINATIONS.DATA_INGESTION,
                ...WARNING_COMBINATIONS.UI_FILTERING
            ],

            "crashes.report_limit": [
                ...WARNING_COMBINATIONS.UI_FILTERING
            ],
            "crashes.max_custom_field_keys": [
                ...WARNING_COMBINATIONS.SERVER_PERFORMANCE,
                ...WARNING_COMBINATIONS.DATA_INGESTION,
                ...WARNING_COMBINATIONS.UI_FILTERING
            ],
            "crashes.smart_regexes": WARNING_COMBINATIONS.UI_FILTERING,

            "drill.list_limit": [
                ...WARNING_COMBINATIONS.UI_FILTERING
            ],
            "drill.custom_property_limit": [
                ...WARNING_COMBINATIONS.UI_FILTERING
            ],
            "drill.projection_limit": [
                ...WARNING_COMBINATIONS.UI_FILTERING
            ],
            "drill.big_list_limit": [
                ...WARNING_COMBINATIONS.SERVER_PERFORMANCE,
                ...WARNING_COMBINATIONS.DATA_INGESTION,
                ...WARNING_COMBINATIONS.UI_FILTERING
            ],

            "flows.maxDepth": [
                ...WARNING_COMBINATIONS.UI_FILTERING
            ],
            "flows.nodesCn": [
                ...WARNING_COMBINATIONS.UI_FILTERING
            ],

            "hooks.requestLimit": [
                ...WARNING_COMBINATIONS.DATA_INGESTION
            ],

            "logger.limit": [
                ...WARNING_COMBINATIONS.SERVER_PERFORMANCE,
                ...WARNING_COMBINATIONS.DATA_INGESTION,
                ...WARNING_COMBINATIONS.UI_FILTERING
            ],
            "logger.state": [
                ...WARNING_COMBINATIONS.SERVER_PERFORMANCE,
                ...WARNING_COMBINATIONS.DATA_INGESTION,
                ...WARNING_COMBINATIONS.UI_FILTERING
            ],

            "remote-config.conditions_per_paramaeters": [
                ...WARNING_COMBINATIONS.DATA_INGESTION,
                ...WARNING_COMBINATIONS.UI_FILTERING
            ],
            "remote-config.maximum_allowed_parameters": [
                ...WARNING_COMBINATIONS.DATA_INGESTION,
                ...WARNING_COMBINATIONS.UI_FILTERING
            ],

            "sources.sources_length_limit": [
                ...WARNING_COMBINATIONS.DATA_INGESTION,
                ...WARNING_COMBINATIONS.UI_FILTERING
            ],

            "users.custom_prop_limit": [
                ...WARNING_COMBINATIONS.SERVER_PERFORMANCE,
                ...WARNING_COMBINATIONS.DATA_INGESTION,
                ...WARNING_COMBINATIONS.UI_FILTERING
            ],
            "users.custom_set_limit": [
                ...WARNING_COMBINATIONS.SERVER_PERFORMANCE,
                ...WARNING_COMBINATIONS.DATA_INGESTION,
                ...WARNING_COMBINATIONS.UI_FILTERING
            ],

            "views.segment_limit": [
                ...WARNING_COMBINATIONS.SERVER_PERFORMANCE,
                ...WARNING_COMBINATIONS.DATA_INGESTION,
                ...WARNING_COMBINATIONS.UI_FILTERING
            ],
            "views.segment_value_limit": [
                ...WARNING_COMBINATIONS.SERVER_PERFORMANCE,
                ...WARNING_COMBINATIONS.DATA_INGESTION,
                ...WARNING_COMBINATIONS.UI_FILTERING
            ],
            "views.view_limit": [
                ...WARNING_COMBINATIONS.SERVER_PERFORMANCE,
                ...WARNING_COMBINATIONS.DATA_INGESTION,
                ...WARNING_COMBINATIONS.UI_FILTERING
            ],
            "views.view_name_limit": [
                ...WARNING_COMBINATIONS.DATA_INGESTION,
                ...WARNING_COMBINATIONS.UI_FILTERING
            ],

            "data-manager.globalValidationAction": [
                ...WARNING_COMBINATIONS.DATA_INGESTION,
                ...WARNING_COMBINATIONS.UI_FILTERING
            ],
            "data-manager.segmentLevelValidationAction": [
                ...WARNING_COMBINATIONS.DATA_INGESTION,
                ...WARNING_COMBINATIONS.UI_FILTERING
            ],
            "data-manager.enableDataMasking": [
                ...WARNING_COMBINATIONS.DATA_INGESTION,
                ...WARNING_COMBINATIONS.UI_FILTERING
            ]
        };

        _configWarnings = configWarnings;
        return _configWarnings;
    }

    countlyPlugins.getConfigWarnings = function(configGroup, key) {
        var warnings = initializeConfigWarnings();
        var mapKey = configGroup + "." + key;
        return warnings[mapKey] || [];
    };

    countlyPlugins.getTooltipColors = function() {
        return TOOLTIP_COLORS;
    };

    countlyPlugins.getTooltipLabel = function(type) {
        var labels = {
            dataIngestion: CV.i18n('configs.tooltip.data-ingestion'),
            uiFiltering: CV.i18n('configs.tooltip.ui-filtering'),
            serverPerformance: CV.i18n('configs.tooltip.server-performance')
        };
        return labels[type] || 'Unknown Type';
    };

}(window.countlyPlugins = window.countlyPlugins || {}, jQuery));
