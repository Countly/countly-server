/* globals app, jQuery, countlyCommon, countlyGlobal, countlyVue, countlyCrashesEventLogs, Promise */

(function(countlyCrashes) {
    countlyCrashes.getVuexModule = function() {
        var _overviewSubmodule = {
            state: function() {
                return {
                    activeFilter: {
                        os: null,
                        app_version: null,
                        fatality: "fatal"
                    },
                    rawData: {},
                    rawCrashgroups: []
                };
            },
            getters: {},
            actions: {},
            mutations: {},
            submodules: []
        };

        _overviewSubmodule.getters.activeFilter = function(state) {
            return state.activeFilter;
        };

        _overviewSubmodule.getters.dashboardData = function(state) {
            var dashboard = {};

            if ("data" in state.rawData) {
                dashboard = countlyCommon.getDashboardData(state.rawData.data, ["cr", "crnf", "crf", "cru", "cruf", "crunf", "crru", "crau", "crauf", "craunf", "crses", "crfses", "crnfses", "cr_s", "cr_u"], ["cru", "crau", "cruf", "crunf", "crauf", "craunf", "cr_u"], null, countlyCrashes.clearObject);
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
                "cru": ["cruf", "crunf"],
                "crau": ["crauf", "craunf"],
                "crses": ["crfses", "crnfses"]
            };

            Object.keys(derivations).forEach(function(name) {
                ["total", "prev-total"].forEach(function(prop) {
                    dashboard[name][prop] = derivations[name].reduce(function(acc, targetName) {
                        return dashboard[targetName][prop] + acc;
                    }, 0);

                    populateMetric(name);
                });
            });

            dashboard["cr-session"] = {};
            ["total", "prev-total"].forEach(function(prop) {
                dashboard["cr-session"][prop] = (dashboard.cr_s[prop] === 0) ? 0 : (Math.round(Math.min(dashboard.cr[prop] / dashboard.cr_s[prop], 1) * 100) / 100);
                dashboard.crau[prop] = Math.max(0, dashboard.crau[prop] - dashboard.cr_u[prop]);
                dashboard.crses[prop] = Math.max(0, dashboard.crses[prop] - dashboard.cr_s[prop]);
            });
            populateMetric("cr-session");

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

                name = name || ((metric in metricNames) ? metricNames[metric][state.activeFilter.fatality] : metric);

                var metricDataProcessors = {
                    "crtn?f": function(obj) {
                        return (obj.cr_s === 0) ? 0 : Math.round(Math.min(obj[state.activeFilter.fatality === "fatal" ? "crf" : "crnf"] / obj.cr_s, 1) * 100) / 100;
                    },
                    "crn?fses": function(obj) {
                        return (obj.cr_s === 0) ? 100 : Math.round(Math.min(obj[name] / obj.cr_s, 1) * 10000) / 100;
                    },
                    "craun?f": function(obj) {
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

                var results = countlyCommon.extractChartData(state.rawData.data, countlyCrashes.clearObject, chartData, dataProps);

                var chartOptions = {
                    xAxis: {
                        data: results.chartData.map(function(dp) {
                            return dp.date;
                        })
                    },
                    series: []
                };

                [0, 1].forEach(function(index) {
                    var seriesData = {lineStyle: {}};
                    seriesData.name = results.chartDP[index].label + " " + index;
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

        _overviewSubmodule.getters.crashgroupRows = function(state) {
            return state.rawCrashgroups.aaData;
        };

        _overviewSubmodule.actions.refresh = function(context) {
            var statisticsRequestParams = {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "period": countlyCommon.getPeriodForAjax(),
                "method": "crashes",
                "graph": 1,
                "display_loader": false
            };

            Object.keys(context.state.activeFilter).forEach(function(filterKey) {
                var filterValue = context.state.activeFilter[filterKey];

                if (filterValue !== null) {
                    statisticsRequestParams[filterKey] = filterValue;
                }
            });

            var ajaxPromises = [];

            ajaxPromises.push(countlyVue.$.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r,
                data: statisticsRequestParams,
                dataType: "json",
                success: function(json) {
                    ["latest_version", "error", "os", "highest_app"].forEach(function(crashKey) {
                        if (json.crashes[crashKey] === "") {
                            json.crashes[crashKey] = "None";
                        }
                    });

                    context.state.rawData = json;
                }
            }));

            var crashgroupsRequestParams = {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "period": countlyCommon.getPeriodForAjax(),
                "method": "crashes",
                "display_loader": false
            };

            ajaxPromises.push(countlyVue.$.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r,
                data: crashgroupsRequestParams,
                dataType: "json",
                success: function(json) {
                    context.state.rawCrashgroups = json;
                }
            }));

            return Promise.all(ajaxPromises);
        };

        _overviewSubmodule.mutations.setActiveFilter = function(state, value) {
            state.activeFilter = value;
        };

        _overviewSubmodule.mutations.resetActiveFilter = function(state) {
            state.activeFilter = {
                platform: null,
                version: null,
                fatality: "fatal"
            };
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
            if ("os" in state.crashgroup) {
                return {
                    platform: state.crashgroup.os,
                    occurances: state.crashgroup.total,
                    affectedUsers: state.crashgroup.users,
                    crashFrequency: state.crashgroup.session.total / state.crashgroup.session.count,
                    latestAppVersion: state.crashgroup.latest_version
                };
            }
        };

        _crashgroupSubmodule.getters.mobileDiagnostics = function(state) {
            if ("ram" in state.crashgroup) {
                var diagnostics = {
                    ram: state.crashgroup.ram,
                    disk: state.crashgroup.disk,
                    battery: state.crashgroup.bat,
                    running: state.crashgroup.run,
                    sessions: state.crashgroup.session,
                };

                Object.keys(diagnostics).forEach(function(diagnosticKey) {
                    diagnostics[diagnosticKey].average = diagnostics[diagnosticKey].total / diagnostics[diagnosticKey].count;
                });

                return diagnostics;
            }
        };

        _crashgroupSubmodule.getters.mobileMetrics = function(state) {
            if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type !== "web" && "root" in state.crashgroup) {
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
                var chartOptions = {
                    xAxis: {
                        data: Object.keys(mapObj)
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

            return countlyVue.$.ajax({
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
                success: function(json) {
                    context.state.crashgroup = json;
                }
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

        _crashgroupSubmodule.actions.markResolved = function(context) {
            countlyCrashes.manipulateCrashgroup(context.state.crashgroup._id, "resolve").then(function() {
                context.state.crashgroup.is_resolved = true;
            });
        };

        _crashgroupSubmodule.actions.markResolving = function(context) {
            countlyCrashes.manipulateCrashgroup(context.state.crashgroup._id, "resolving").then(function() {
                context.state.crashgroup.is_resolved = true;
            });
        };

        _crashgroupSubmodule.actions.markUnresolved = function(context) {
            countlyCrashes.manipulateCrashgroup(context.state.crashgroup._id, "unresolve").then(function() {
                context.state.crashgroup.is_resolved = false;
            });
        };

        _crashgroupSubmodule.actions.markSeen = function(context) {
            countlyCrashes.manipulateCrashgroup(context.state.crashgroup._id, "view").then(function() {
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
            return countlyCrashes.manipulateCrashgroup(context.state.crashgroup._id, "show");
        };

        _crashgroupSubmodule.actions.hide = function(context) {
            return countlyCrashes.manipulateCrashgroup(context.state.crashgroup._id, "hide");
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

        var _module = {
            state: undefined,
            getters: {},
            actions: {},
            mutations: {},
            submodules: [
                countlyVue.vuex.Module("overview", _overviewSubmodule),
                countlyVue.vuex.Module("crashgroup", _crashgroupSubmodule),
                countlyVue.vuex.Module("crash", _crashSubmodule)]
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

        if (crash.is_new) {
            badges.push({type: "new"});
        }

        if (crash.is_resolved) {
            badges.push({type: "resolved", version: crash.resolved_version});
        }
        else if (crash.is_resolving) {
            badges.push({type: "resolving"});
        }
        else {
            badges.push({type: "unresolved"});
        }

        if (crash.is_hidden) {
            badges.push({type: "hidden"});
        }

        return badges;
    };
}(window.countlyCrashes = window.countlyCrashes || {}));