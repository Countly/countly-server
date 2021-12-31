/* globals app, countlyCrashSymbols, jQuery, countlyCommon, countlyGlobal, countlyVue, countlyCrashesEventLogs */

(function(countlyCrashes) {
    countlyCrashes.getVuexModule = function() {
        var _overviewSubmodule = {
            state: function() {
                return {
                    crashgroupsFilter: {},
                    activeFilter: {
                        platform: "all",
                        version: "all",
                        fatality: "both"
                    },
                    rawData: {},
                    filteredData: {}
                };
            },
            getters: {},
            actions: {},
            mutations: {},
            submodules: []
        };

        _overviewSubmodule.getters.crashgroupsFilter = function(state) {
            return state.crashgroupsFilter;
        };

        _overviewSubmodule.getters.activeFilter = function(state) {
            return state.activeFilter;
        };

        _overviewSubmodule.getters.dashboardData = function(state) {
            var dashboard = {};

            if ("data" in state.rawData) {
                dashboard = countlyCommon.getDashboardData(state.filteredData.data, ["cr", "crnf", "crf", "cru", "cruf", "crunf", "crru", "crau", "crauf", "craunf", "crses", "crfses", "crnfses", "cr_s", "cr_u"], ["cru", "crau", "cruf", "crunf", "crauf", "craunf", "cr_u"], null, countlyCrashes.clearObject);
            }
            else {
                return dashboard;
            }

            /**
            * Populates the metric's change and trend properties according to its total and prev-total.
            * @param {string} metric - A metric name e.g. "cr"
            * @param {bool} isPercent - Flag to just format the metric's total values as percentages.
            */
            function populateMetric(metric, isPercent) {
                if (dashboard[metric].total !== 0 && dashboard[metric]["prev-total"] !== 0) {
                    if (isPercent) {
                        dashboard[metric].change = (dashboard[metric].total - dashboard[metric]["prev-total"]).toFixed(1) + "%";
                    }
                    else {
                        dashboard[metric].change = (((dashboard[metric].total - dashboard[metric]["prev-total"]) / dashboard[metric]["prev-total"]) * 100).toFixed(1) + "%";
                    }
                }
                else if (dashboard[metric].total === 0 && dashboard[metric]["prev-total"] !== 0) {
                    dashboard[metric].change = "-∞";
                }
                else if (dashboard[metric].total !== 0 && dashboard[metric]["prev-total"] === 0) {
                    dashboard[metric].change = "∞";
                }

                if (dashboard[metric].total === dashboard[metric]["prev-total"]) {
                    dashboard[metric].trend = "n";
                }
                else {
                    dashboard[metric].trend = dashboard[metric].total >= dashboard[metric]["prev-total"] ? "u" : "d";
                }

                if (metric in derivations) {
                    dashboard[metric].isEstimate = derivations[metric].some(function(targetName) {
                        return dashboard[targetName].isEstimate === true;
                    });
                }

                if (isPercent && ["crses", "crnfses", "crfses", "crau", "craunf", "crauf"].includes(metric)) {
                    ["total", "prev-total"].forEach(function(prop) {
                        dashboard[metric][prop] = dashboard[metric][prop].toFixed(2) + '%';
                    });
                }
            }

            var derivations = {
                "cr": ["crf", "crnf"],
                "cru": ["cruf", "crunf"]
            };

            Object.keys(derivations).forEach(function(name) {
                ["total", "prev-total"].forEach(function(prop) {
                    dashboard[name][prop] = derivations[name].reduce(function(acc, targetName) {
                        return dashboard[targetName][prop] + acc;
                    }, 0);

                    populateMetric(name);
                });
            });

            ["cr-session", "crtf", "crtnf", "crau", "crses"].forEach(function(metric) {
                dashboard[metric] = {};
            });

            ["total", "prev-total"].forEach(function(prop) {
                dashboard["cr-session"][prop] = (dashboard.cr_s[prop] === 0) ? 0 : (Math.round(Math.min(dashboard.cr[prop] / dashboard.cr_s[prop], 1) * 100) / 100);
                dashboard.crau[prop] = Math.max(0, dashboard.crauf[prop] + dashboard.craunf[prop] - dashboard.cr_u[prop]);
                dashboard.crses[prop] = Math.max(0, dashboard.crfses[prop] + dashboard.crnfses[prop] - dashboard.cr_s[prop]);
                dashboard.crtf[prop] = Math.round(Math.min(dashboard.crf[prop] / dashboard.cr_s[prop], 1) * 100) / 100;
                dashboard.crtnf[prop] = Math.round(Math.min(dashboard.crnf[prop] / dashboard.cr_s[prop], 1) * 100) / 100;

            });

            ["cr-session", "crtf", "crtnf"].forEach(function(metric) {
                populateMetric(metric);
            });

            ["crau", "craunf", "crauf"].forEach(function(name) {
                ["total", "prev-total"].forEach(function(prop) {
                    dashboard[name][prop] = Math.min(100, (dashboard.cr_u[prop] === 0) ? 100 : (dashboard[name][prop] / dashboard.cr_u[prop] * 100));
                });
                populateMetric(name, true);
            });

            ["crses", "crnfses", "crfses"].forEach(function(name) {
                ["total", "prev-total"].forEach(function(prop) {
                    dashboard[name][prop] = Math.min(100, (dashboard.cr_s[prop] === 0) ? 100 : (dashboard[name][prop] / dashboard.cr_s[prop] * 100));
                });
                populateMetric(name, true);
            });

            return dashboard;
        };

        _overviewSubmodule.getters.chartData = function(state) {
            /**
            *  Crash metric calculations
            *  Total occurences ("cr")         - crf, crnf
            *  Unique crashes ("cru")          - cruf, crunf
            *  Crashes/Sessions ("cr-session") - Math.round(Math.min(cr(n)f / cr_s, 1) * 100) / 100;
            *  Crash Free Users ("crau")       - Math.round(Math.min(crau(n)f / cr_u, 1) * 10000) / 100;
            *  Crash Free Sessions ("crses")   - Math.round(Math.min(cr(n)fses / cr_s, 1) * 10000) / 100;
            *  @param {string} metric - which metric to calculate
            *  @param {string} name - label name in graph
            *  @returns {object} Rto user in graph
            */
            return function(metric, name) {
                if (!("data" in state.filteredData)) {
                    return {};
                }

                var chartData, dataProps;

                var metricChartConfig = {
                    "cr-session": {labelKey: "crashes.total-per-session", colorIndex: 1},
                    "crses": {labelKey: "crashes.free-sessions", colorIndex: 0},
                    "crau": {labelKey: "crashes.free-users", colorIndex: 0},
                    "cr": {labelKey: "crashes.total", colorIndex: 1},
                    "cru": {labelKey: "crashes.unique", colorIndex: 1}
                }[metric];

                if (typeof metricChartConfig !== "undefined") {
                    chartData = [
                        {data: [], label: jQuery.i18n.map[metricChartConfig.labelKey], color: "#DDDDDD", mode: "ghost" },
                        {data: [], label: jQuery.i18n.map[metricChartConfig.labelKey], color: countlyCommon.GRAPH_COLORS[metricChartConfig.colorIndex]}
                    ];
                }
                else {
                    chartData = [
                        {data: [], label: name, color: "#DDDDDD", mode: "ghost" },
                        {data: [], label: name, color: "#333933"}
                    ];
                }

                var metricNames = {
                    "cr-session": {"fatal": "crtf", "nonfatal": "crtnf"},
                    "crses": {"fatal": "crfses", "nonfatal": "crnfses"},
                    "crau": {"fatal": "crauf", "nonfatal": "craunf"},
                    "cr": {"fatal": "crf", "nonfatal": "crnf"},
                    "cru": {"fatal": "cruf", "nonfatal": "crunf"}
                };

                name = name || ((metric in metricNames && state.activeFilter.fatality !== "both") ? metricNames[metric][state.activeFilter.fatality] : metric);

                var metricDataProcessors = {
                    "^cr-session$": function(obj) {
                        return (obj.cr_s === 0) ? 0 : Math.round(Math.min((obj.crf + obj.crnf) / obj.cr_s, 1) * 100) / 100;
                    },
                    "^crses$": function(obj) {
                        return (obj.cr_s === 0) ? 100 : Math.round(Math.min(Math.max((obj.crfses + obj.crnfses - obj.cr_s) / obj.cr_s, 0), 1) * 10000) / 100;
                    },
                    "^crau$": function(obj) {
                        return (obj.cr_u === 0) ? 100 : Math.round(Math.min(Math.max((obj.crauf + obj.craunf - obj.cr_u) / obj.cr_u, 0), 1) * 10000) / 100;
                    },
                    "^cr$": function(obj) {
                        return obj.crf + obj.crnf;
                    },
                    "^cru$": function(obj) {
                        return obj.cruf + obj.crunf;
                    },
                    "^crtn?f$": function(obj) {
                        return (obj.cr_s === 0) ? 0 : Math.round(Math.min(obj[state.activeFilter.fatality === "fatal" ? "crf" : "crnf"] / obj.cr_s, 1) * 100) / 100;
                    },
                    "^crn?fses$": function(obj) {
                        return (obj.cr_s === 0) ? 100 : Math.round(Math.min(obj[name] / obj.cr_s, 1) * 10000) / 100;
                    },
                    "^craun?f$": function(obj) {
                        return (obj.cr_s === 0) ? 100 : Math.round(Math.min(obj[name] / obj.cr_u, 1) * 10000) / 100;
                    }
                };

                dataProps = [
                    {name: "p" + name, period: "previous"},
                    {name: name}
                ];

                var processorKey = Object.keys(metricDataProcessors).find(function(keyRegex) {
                    return RegExp(keyRegex).test(name);
                });

                if (typeof processorKey !== "undefined") {
                    dataProps[0].func = metricDataProcessors[processorKey];
                    dataProps[1].func = metricDataProcessors[processorKey];
                }
                else {
                    dataProps[0].func = function(obj) {
                        return obj[name];
                    };
                }

                var results = countlyCommon.extractChartData(state.filteredData.data, countlyCrashes.clearObject, chartData, dataProps);

                var chartOptions = {
                    xAxis: {
                        data: results.chartData.map(function(dp) {
                            return dp.date;
                        })
                    },
                    series: []
                };

                dataProps.forEach(function(dp, index) {
                    var seriesData = {lineStyle: {}};
                    seriesData.name = (dp.period === "previous") ? ("previous " + results.chartDP[index].label) : results.chartDP[index].label;
                    seriesData.data = results.chartDP[index].data;
                    seriesData.lineStyle.color = results.chartDP[index].color;
                    chartOptions.series.push(seriesData);
                });

                return chartOptions;
            };
        };

        _overviewSubmodule.getters.statistics = function(state) {
            var statistics = {};

            if ("users" in state.rawData) {
                statistics.users = {
                    affected: {
                        total: state.rawData.users.affected,
                        totalPercent: (state.rawData.users.affected / state.rawData.users.total) * 100,
                        fatal: state.rawData.users.fatal,
                        fatalPercent: (state.rawData.users.fatal / state.rawData.users.total) * 100,
                        nonFatal: (state.rawData.users.affected - state.rawData.users.fatal),
                        nonFatalPercent: ((state.rawData.users.affected - state.rawData.users.fatal) / state.rawData.users.total) * 100,
                    },
                    notAffected: {
                        total: state.rawData.users.affected,
                    },
                    total: state.rawData.users.total
                };
            }

            if ("crashes" in state.rawData) {
                statistics.crashes = {
                    total: state.rawData.crashes.total,
                    fatal: state.rawData.crashes.fatal,
                    fatalPercent: (state.rawData.crashes.fatal / state.rawData.crashes.total) * 100,
                    nonFatal: state.rawData.crashes.nonfatal,
                    nonFatalPercent: (state.rawData.crashes.nonfatal / state.rawData.crashes.total) * 100,
                    new: state.rawData.crashes.news,
                    newPercent: (state.rawData.crashes.news / state.rawData.crashes.total) * 100,
                    resolved: state.rawData.crashes.resolved,
                    resolvedPercent: (state.rawData.crashes.resolved / state.rawData.crashes.total) * 100,
                    unresolved: (state.rawData.crashes.total - state.rawData.crashes.resolved),
                    unresolvedPercent: ((state.rawData.crashes.total - state.rawData.crashes.resolved) / state.rawData.crashes.total) * 100,
                    reoccured: state.rawData.crashes.renewed
                };

                statistics.latestAppVersion = state.rawData.crashes.highest_app;

                statistics.topPlatforms = {};
                Object.keys(state.rawData.crashes.os).forEach(function(platform) {
                    statistics.topPlatforms[platform] = {
                        count: countlyCommon.getShortNumber(state.rawData.crashes.os[platform]),
                        percent: (state.rawData.crashes.os[platform] / statistics.crashes.total) * 100
                    };
                });

                statistics.topPlatformsOrder = Object.entries(statistics.topPlatforms)
                    .sort(function(lhs, rhs) {
                        return rhs[1].count - lhs[1].count;
                    })
                    .slice(0, 4)
                    .map(function(pair) {
                        return pair[0];
                    });
            }

            if ("loss" in state.rawData) {
                statistics.revenueLoss = state.rawData.loss;
            }

            return statistics;
        };

        _overviewSubmodule.getters.appVersions = function(state) {
            return "crashes" in state.rawData ? Object.keys(state.rawData.crashes.app_version) : [];
        };

        _overviewSubmodule.getters.platforms = function(state) {
            return "crashes" in state.rawData ? Object.keys(state.rawData.crashes.os) : [];
        };

        _overviewSubmodule.actions.setCrashgroupsFilter = function(context, value) {
            context.state.crashgroupsFilter = value;
        };

        _overviewSubmodule.actions.setActiveFilter = function(context, value) {
            context.state.activeFilter = value;
            context.dispatch("refresh");
        };

        _overviewSubmodule.actions.refresh = function(context) {
            var ajaxPromises = [];

            var requestParams = {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "period": countlyCommon.getPeriodForAjax(),
                "method": "crashes",
                "graph": 1,
                "display_loader": false,
            };

            var filterMapping = {"platform": "os", "version": "app_version"};
            var filterParams = {};
            Object.keys(filterMapping).forEach(function(filterKey) {
                if (context.state.activeFilter[filterKey] !== "all") {
                    filterParams[filterMapping[filterKey]] = context.state.activeFilter[filterKey];
                }
            });
            var isFiltered = Object.keys(filterParams).length > 0;

            if (isFiltered) {
                ajaxPromises.push(countlyVue.$.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.r,
                    data: Object.assign({}, requestParams, filterParams),
                    dataType: "json",
                    success: function(json) {
                        ["latest_version", "error", "os", "highest_app"].forEach(function(crashKey) {
                            if (json.crashes[crashKey] === "") {
                                json.crashes[crashKey] = "None";
                            }
                        });

                        context.state.filteredData = json;
                    }
                }));
            }

            ajaxPromises.push(countlyVue.$.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r,
                data: Object.assign({}, requestParams),
                dataType: "json",
                success: function(json) {
                    ["latest_version", "error", "os", "highest_app"].forEach(function(crashKey) {
                        if (json.crashes[crashKey] === "") {
                            json.crashes[crashKey] = "None";
                        }
                    });

                    context.state.rawData = json;
                    if (!isFiltered) {
                        context.state.filteredData = json;
                    }
                }
            }));

            return Promise.all(ajaxPromises);
        };

        _overviewSubmodule.actions.setSelectedAsResolved = function(context, selectedIds) {
            return countlyCrashes.manipulateCrashgroup(selectedIds, "resolve");
        };

        _overviewSubmodule.actions.setSelectedAsResolving = function(context, selectedIds) {
            return countlyCrashes.manipulateCrashgroup(selectedIds, "resolving");
        };

        _overviewSubmodule.actions.setSelectedAsUnresolved = function(context, selectedIds) {
            return countlyCrashes.manipulateCrashgroup(selectedIds, "unresolve");
        };

        _overviewSubmodule.actions.setSelectedAsShown = function(context, selectedIds) {
            return countlyCrashes.manipulateCrashgroup(selectedIds, "show");
        };

        _overviewSubmodule.actions.setSelectedAsHidden = function(context, selectedIds) {
            return countlyCrashes.manipulateCrashgroup(selectedIds, "hide");
        };

        _overviewSubmodule.actions.setSelectedAsDeleted = function(context, selectedIds) {
            return countlyCrashes.manipulateCrashgroup(selectedIds, "delete");
        };

        var _crashgroupSubmodule = {
            state: function() {
                return {
                    crashgroup: {
                        _id: undefined,
                        is_resolved: false,
                        is_new: false,
                    }
                };
            },
            getters: {},
            actions: {},
            mutations: {},
            submodules: []
        };

        _crashgroupSubmodule.getters.crashgroup = function(state) {
            return state.crashgroup || {};
        };

        _crashgroupSubmodule.getters.crashgroupName = function(state) {
            if ("name" in state.crashgroup) {
                return state.crashgroup.name;
            }
            else {
                return "Error";
            }
        };

        _crashgroupSubmodule.getters.crashes = function(state) {
            if ("data" in state.crashgroup) {
                return state.crashgroup.data;
            }
            else {
                return [];
            }
        };

        _crashgroupSubmodule.getters.commonMetrics = function(state) {
            if (typeof state.crashgroup._id !== "undefined") {
                return {
                    platform: state.crashgroup.os,
                    occurances: state.crashgroup.total,
                    affectedUsers: state.crashgroup.users,
                    crashFrequency: ("session" in state.crashgroup) ? state.crashgroup.session.total / state.crashgroup.session.count : 0,
                    latestAppVersion: state.crashgroup.latest_version
                };
            }
        };

        _crashgroupSubmodule.getters.mobileDiagnostics = function(state) {
            if (typeof state.crashgroup._id !== "undefined") {
                var diagnostics = {
                    ram: state.crashgroup.ram,
                    disk: state.crashgroup.disk,
                    battery: state.crashgroup.bat,
                    running: state.crashgroup.run,
                    sessions: ("session" in state.crashgroup) ? state.crashgroup.session : {average: 0, max: 0, min: 0},
                };

                var tooltips = {
                    ram: jQuery.i18n.prop("crashes.help-ram"),
                    disk: jQuery.i18n.prop("crashes.help-disk"),
                    battery: jQuery.i18n.prop("crashes.help-battery"),
                    running: jQuery.i18n.prop("crashes.help-run"),
                    sessions: jQuery.i18n.prop("crashes.help-session")
                };

                Object.keys(diagnostics).forEach(function(diagnosticKey) {
                    diagnostics[diagnosticKey].average = diagnostics[diagnosticKey].total / diagnostics[diagnosticKey].count;
                    diagnostics[diagnosticKey].tooltip = tooltips[diagnosticKey];
                });

                ["average", "max", "min"].forEach(function(key) {
                    diagnostics.running[key] = diagnostics.running[key] / 60;
                });
                diagnostics.running.unit = jQuery.i18n.prop("crashes.minutes-short");
                diagnostics.sessions.unit = "";

                return diagnostics;
            }
        };

        _crashgroupSubmodule.getters.mobileMetrics = function(state) {
            if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type !== "web" && typeof state.crashgroup._id !== "undefined" && "root" in state.crashgroup) {
                return {
                    rootedPercent: state.crashgroup.root.yes / state.crashgroup.reports * 100,
                    onlinePercent: state.crashgroup.online.yes / state.crashgroup.reports * 100,
                    mutedPercent: state.crashgroup.muted.yes / state.crashgroup.reports * 100,
                    backgroundPercent: state.crashgroup.background.yes / state.crashgroup.reports * 100
                };
            }
        };

        _crashgroupSubmodule.getters.chartByOptions = function(state) {
            var chartByOptions = [
                {value: "os_version", label: "OS Version"},
                {value: "resolution", label: "Resolution"},
                {value: "app_version", label: "App Version"},
                {value: "cpu", label: "CPU"},
                {value: "opengl", label: "OpenGL"},
                {value: "manufacturer", label: "Manufacturer"}
            ];

            chartByOptions = chartByOptions.filter(function(opt) {
                return Object.keys(state.crashgroup).includes(opt.value);
            });

            if ("custom" in state.crashgroup) {
                Object.keys(state.crashgroup.custom).forEach(function(customKey) {
                    chartByOptions.push({value: "custom." + customKey, label: customKey});
                });
            }

            return chartByOptions;
        };

        _crashgroupSubmodule.getters.chartData = function(state) {
            return function(chartBy) {
                var mapObj = countlyCommon.dot(state.crashgroup, chartBy) || {};
                var mapKeys = Object.keys(mapObj);

                if (chartBy === "app_version" || chartBy === "os_version" || chartBy.startsWith("custom.")) {
                    mapKeys = mapKeys.map(function(key) {
                        return key.replace(/:/g, ".");
                    });
                }

                var chartOptions = {
                    xAxis: {
                        data: mapKeys
                    },
                    series: [
                        {data: Object.values(mapObj)}
                    ]
                };

                return chartOptions;
            };
        };

        _crashgroupSubmodule.getters.crashEventLog = function(state) {
            return function(crashId) {
                var crashIndex = state.crashgroup.data.findIndex(function(crash) {
                    return crash._id === crashId;
                });
                return countlyCrashesEventLogs.formatEventLog(state.crashgroup.data[crashIndex].eventlog);
            };
        };

        _crashgroupSubmodule.actions.initialize = function(context, groupId) {
            context.state.crashgroup._id = groupId;
            return context.dispatch("refresh");
        };

        _crashgroupSubmodule.actions.refresh = function(context) {
            if (typeof context.state.crashgroup._id === "undefined") {
                return;
            }

            return new Promise(function(resolve, reject) {
                countlyVue.$.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.r,
                    data: {
                        "app_id": countlyCommon.ACTIVE_APP_ID,
                        "period": countlyCommon.getPeriodForAjax(),
                        "method": "crashes",
                        "group": context.state.crashgroup._id,
                        "display_loader": false
                    },
                    dataType: "json",
                    success: function(crashgroupJson) {
                        if (crashgroupJson.data && crashgroupJson.data.length > 0) {
                            var userIds = {};
                            var ajaxPromises = [];

                            crashgroupJson.data.forEach(function(crash, crashIndex) {
                                if (crash.uid in userIds) {
                                    userIds[crash.uid].push(crashIndex);
                                }
                                else {
                                    userIds[crash.uid] = [crashIndex];
                                }
                            });

                            Object.keys(userIds).forEach(function(uid) { //
                                ajaxPromises.push(countlyVue.$.ajax({
                                    type: "GET",
                                    url: countlyCommon.API_PARTS.data.r,
                                    data: {
                                        "app_id": countlyCommon.ACTIVE_APP_ID,
                                        "method": "user_details",
                                        "uid": uid,
                                        "period": countlyCommon.getPeriodForAjax(),
                                        "return_groups": "basic",
                                    },
                                    success: function(userJson) {
                                        userIds[uid].forEach(function(crashIndex) {
                                            crashgroupJson.data[crashIndex].user = userJson;
                                        });
                                    }
                                }));
                            });

                            if (typeof countlyCrashSymbols !== "undefined") {
                                var crashes = [{
                                    _id: crashgroupJson.lrid,
                                    os: crashgroupJson.os,
                                    native_cpp: crashgroupJson.native_cpp,
                                    app_version: crashgroupJson.latest_version
                                }];

                                crashes = crashes.concat(crashgroupJson.data);

                                var ajaxPromise = countlyCrashSymbols.fetchSymbols(false);
                                ajaxPromises.push(ajaxPromise);
                                ajaxPromise.then(function(symbolIndexing) {
                                    crashes.forEach(function(crash, crashIndex) {
                                        var symbol_id = countlyCrashSymbols.canSymbolicate(crash, symbolIndexing);
                                        if (typeof symbol_id !== "undefined") {
                                            if (crashIndex === 0) {
                                                crashgroupJson._symbol_id = symbol_id;
                                            }
                                            else {
                                                crashgroupJson.data[crashIndex - 1]._symbol_id = symbol_id;
                                            }
                                        }
                                    });
                                });
                            }

                            Promise.all(ajaxPromises)
                                .finally(function() {
                                    context.state.crashgroup = crashgroupJson;
                                    resolve(context.state.crashgroup);
                                })
                                .catch(function(err) {
                                    reject(err);
                                });
                        }
                        else {
                            context.state.crashgroup = crashgroupJson;
                            resolve(context.state.crashgroup);
                        }
                    },
                    error: reject
                });
            });

        };

        _crashgroupSubmodule.actions.generateEventLogs = function(context, crashIds) {
            return new Promise(function(resolve, reject) {
                countlyVue.$.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.w + "/crashes-event-logs",
                    data: {
                        "app_id": countlyCommon.ACTIVE_APP_ID,
                        "args": JSON.stringify({
                            "crashes": crashIds
                        })
                    },
                    dataType: "json",
                    success: function(json) {
                        Object.keys(json).forEach(function(crashId) {
                            var crashIndex = context.state.crashgroup.data.findIndex(function(crash) {
                                return crash._id === crashId;
                            });

                            if (crashIndex === -1) {
                                return;
                            }

                            context.state.crashgroup.data[crashIndex].eventlog = json[crashId];
                        });
                        resolve(json);
                    },
                    error: reject
                });
            });
        };

        _crashgroupSubmodule.actions.symbolicate = function(context, crash) {
            return new Promise(function(resolve, reject) {
                if (typeof countlyCrashSymbols === "undefined") {
                    reject(null);
                }
                else {
                    countlyCrashSymbols.fetchSymbols(false).then(function(symbolIndexing) {
                        var symbol_id = countlyCrashSymbols.canSymbolicate(crash, symbolIndexing);
                        countlyCrashSymbols.symbolicate(crash._id, symbol_id)
                            .then(function(json) {
                                resolve(json);
                            })
                            .catch(function(xhr) {
                                reject(xhr);
                            });
                    });
                }
            });
        };

        _crashgroupSubmodule.actions.markResolved = function(context) {
            return countlyCrashes.manipulateCrashgroup(context.state.crashgroup._id, "resolve").then(function() {
                context.state.crashgroup.is_resolved = true;
                context.state.crashgroup.resolved_version = context.state.crashgroup.latest_version;
            });
        };

        _crashgroupSubmodule.actions.markResolving = function(context) {
            return countlyCrashes.manipulateCrashgroup(context.state.crashgroup._id, "resolving").then(function() {
                context.state.crashgroup.is_resolved = false;
                context.state.crashgroup.is_resolving = true;
            });
        };

        _crashgroupSubmodule.actions.markUnresolved = function(context) {
            return countlyCrashes.manipulateCrashgroup(context.state.crashgroup._id, "unresolve").then(function() {
                context.state.crashgroup.is_resolved = false;
            });
        };

        _crashgroupSubmodule.actions.markSeen = function(context) {
            return countlyCrashes.manipulateCrashgroup(context.state.crashgroup._id, "view").then(function() {
                context.state.crashgroup.is_new = false;
            });
        };

        _crashgroupSubmodule.actions.share = function(context) {
            return countlyCrashes.manipulateCrashgroup(context.state.crashgroup._id, "share");
        };

        _crashgroupSubmodule.actions.unshare = function(context) {
            return countlyCrashes.manipulateCrashgroup(context.state.crashgroup._id, "unshare");
        };

        _crashgroupSubmodule.actions.show = function(context) {
            return countlyCrashes.manipulateCrashgroup(context.state.crashgroup._id, "show").then(function() {
                context.state.crashgroup.is_hidden = false;
            });
        };

        _crashgroupSubmodule.actions.hide = function(context) {
            return countlyCrashes.manipulateCrashgroup(context.state.crashgroup._id, "hide").then(function() {
                context.state.crashgroup.is_hidden = true;
            });
        };

        _crashgroupSubmodule.actions.delete = function(context) {
            return countlyCrashes.manipulateCrashgroup(context.state.crashgroup._id, "delete");
        };

        _crashgroupSubmodule.actions.modifyShare = function(context, args) {
            return countlyCrashes.manipulateCrashgroup(context.state.crashgroup._id, "modify_share", args);
        };

        _crashgroupSubmodule.actions.addComment = function(context, body) {
            var originalPromise = countlyCrashes.manipulateCrashgroup(context.state.crashgroup._id, "add_comment", {text: body});

            originalPromise.then(function() {
                app.recordEvent({
                    "key": "crash-comment",
                    "count": 1,
                    "segmentation": {}
                });
            });

            return originalPromise;
        };

        _crashgroupSubmodule.actions.editComment = function(context, payload) {
            return countlyCrashes.manipulateCrashgroup(context.state.crashgroup._id, "edit_comment", payload);
        };

        _crashgroupSubmodule.actions.deleteComment = function(context, commentId) {
            return countlyCrashes.manipulateCrashgroup(context.state.crashgroup._id, "delete_comment", {comment_id: commentId});
        };

        var _crashSubmodule = {
            state: function() {
                return {
                    crash: {
                        _id: undefined,
                    }
                };
            },
            getters: {},
            actions: {},
            mutations: {},
            submodules: []
        };

        _crashSubmodule.getters.crash = function(state) {
            return state.crash;
        };

        _crashSubmodule.actions.initialize = function(context, crashId) {
            context.state.crash._id = crashId;
            return context.dispatch("refresh");
        };

        _crashSubmodule.actions.refresh = function(context) {
            return countlyVue.$.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r,
                data: {
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    "method": "reports",
                    "report_id": context.state.crash._id
                },
                dataType: "json",
                success: function(json) {
                    context.state.crash = json[context.state.crash._id];
                }
            });
        };

        var crashgroupsResource = countlyVue.vuex.ServerDataTable("crashgroups", {
            onRequest: function() {
                return {
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.r,
                    data: {
                        "app_id": countlyCommon.ACTIVE_APP_ID,
                        "period": countlyCommon.getPeriodForAjax(),
                        "method": "crashes",
                        "display_loader": false
                    }
                };
            }
        });


        var _module = {
            state: undefined,
            getters: {},
            actions: {},
            mutations: {},
            submodules: [
                countlyVue.vuex.Module("overview", _overviewSubmodule),
                countlyVue.vuex.Module("crashgroup", _crashgroupSubmodule),
                countlyVue.vuex.Module("crash", _crashSubmodule),
                crashgroupsResource
            ]
        };

        return countlyVue.vuex.Module("countlyCrashes", _module);
    };

    countlyCrashes.manipulateCrashgroup = function(id, path, args) {
        args = args || {};

        if (typeof id === "string") {
            args.crash_id = id;
        }
        else {
            args.crashes = id;
        }

        if (typeof args.app_id === "undefined") {
            args.app_id = countlyCommon.ACTIVE_APP_ID;
        }

        return countlyVue.$.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.w + "/crashes/" + path,
            data: {
                app_id: countlyCommon.ACTIVE_APP_ID,
                args: JSON.stringify(args)
            },
            dataType: "json"
        });
    };

    countlyCrashes.clearObject = function(obj) {
        var cleanObj = {"cr": 0, "cru": 0, "cruf": 0, "crunf": 0, "crnf": 0, "crf": 0, "crru": 0, "crau": 0, "crauf": 0, "craunf": 0, "crses": 0, "crfses": 0, "crnfses": 0, "cr_s": 0, "cr_u": 0, "cr-session": 0};

        if (obj) {
            Object.keys(cleanObj).forEach(function(key) {
                if (!obj[key]) {
                    obj[key] = 0;
                }
            });
        }
        else {
            obj = cleanObj;
        }

        return obj;
    };

    countlyCrashes.generateBadges = function(crash) {
        var badges = [];

        if (crash.nonfatal) {
            badges.push({type: "neutral", content: jQuery.i18n.prop("crashes.nonfatal")});
        }
        else {
            badges.push({type: "negative", content: jQuery.i18n.prop("crashes.fatal")});
        }

        if (crash.is_resolved) {
            badges.push({type: "positive", content: jQuery.i18n.prop("crashes.resolved") + " (" + crash.resolved_version + ")"});
        }
        else if (crash.is_resolving) {
            badges.push({type: "neutral", content: jQuery.i18n.prop("crashes.resolving")});
        }
        else {
            badges.push({type: "negative", content: jQuery.i18n.prop("crashes.unresolved")});
        }

        if (crash.is_renewed) {
            badges.push({type: "neutral", content: jQuery.i18n.prop("crashes.reoccuring")});
        }


        if ("session" in crash) {
            var frequency = Math.round(crash.session.total / crash.session.count);
            if (frequency === 1) {
                badges.push({type: "info", content: jQuery.i18n.prop("crashes.every-session")});
            }
            else if (frequency > 1) {
                badges.push({type: "info", content: jQuery.i18n.prop("crashes.every-n-sessions", frequency)});
            }
        }

        if (crash.is_new) {
            badges.push({type: "info", content: jQuery.i18n.prop("crashes.new")});
        }

        return badges;
    };
}(window.countlyCrashes = window.countlyCrashes || {}));