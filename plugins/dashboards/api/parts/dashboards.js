/**
* Fetching and processing data for custom dashboard widgets
* @module api/parts/data/dashboard
*/
var countlyModel = require("../../../../api/lib/countly.model.js"),
    async = require('async'),
    crypto = require('crypto'),
    common = require('../../../../api/utils/common.js'),
    countlyCommon = require('../../../../api/lib/countly.common'),
    fetch = require("../../../../api/parts/data/fetch.js"),
    plugins = require("../../../pluginManager.js");

/** @lends module:api/parts/data/dashboard */
var dashboard = {};

var separator = "***";
/**
 *  @brief Brief description
 *  
 *  @param {object} ob  - object
 *  @param {string} collection  - collection
 *  @param {string} metric - metric
 *  @param {object} widget  - widget
 *  @return {object}  - object
 */
function addWidget(ob, collection, metric, widget) {
    if (!ob[collection]) {
        ob[collection] = {};
    }
    metric = toSegment(metric);
    if (!ob[collection][metric]) {
        ob[collection][metric] = [];
    }
    ob[collection][metric].push(widget);
    return ob;
}
/**
 *  @param {object}  ob - objec
 *  @param {string} name -name
 *  @param {string} widget - widget
 *  @return {object}  - object
 */
function addPluginWidget(ob, name, widget) {
    if (!ob[name]) {
        ob[name] = [];
    }
    ob[name].push(widget);
    return ob;
}
/**
 *  Gets collection name to select data from
 *  @param {string} val - data index
 *  @return {string} collection name
 */
function toCollection(val) {
    var ob = {
        os: "device_details",
        platforms: "device_details",
        versions: "device_details",
        app_versions: "device_details",
        resolutions: "device_details",
        countries: "users"
    };
    if (ob[val]) {
        return ob[val];
    }
    return val;
}
/**
 *  Gets model name to select data from
 *  @param {string} val - data index
 *  @return {string} model name
 */
function toModel(val) {
    var ob = {
        os: "device_details",
        platforms: "device_details",
        versions: "device_details",
        app_versions: "device_details",
        resolutions: "device_details",
        langs: "locale"
    };
    if (ob[val]) {
        return ob[val];
    }
    return val;
}
/**
 *  Gets segment name to select data from
 *  @param {string} val - data index
 *  @return {string} segment name
 */
function toSegment(val) {
    var ob = {
        platforms: "os",
        versions: "app_versions"
    };
    if (ob[val]) {
        return ob[val];
    }
    return val;
}
/**
 *  Gets plugin name
 *  @param {string} val - data index
 *  @return {string} plugin name
 */
/* Not used function
function toPlugin(val) {
    var ob = {
        langs: "locale"
    };
    if (ob[val]) {
        return ob[val];
    }
    return val;
}
*/
dashboard.fetchWidgetData = function(params, my_widgets, callback) {
    if (my_widgets) {
        var nonPluginWidgets = {};
        var pluginWidgets = {};
        var widget = "";
        var apps = [];
        for (var i = 0; i < my_widgets.length; i++) {
            widget = my_widgets[i];
            if (widget.widget_type === "funnels") {
                //Backward compatibility check for already created funnels
                //Remove when all previous funnels are shifted to client fetch
                widget.client_fetch = true;
            }

            apps = widget.apps || [];
            for (var j = 0; j < apps.length; j++) {
                if (!nonPluginWidgets[apps[j]]) {
                    nonPluginWidgets[apps[j]] = {};
                }

                if (!pluginWidgets[apps[j]]) {
                    pluginWidgets[apps[j]] = {};
                }

                if (widget.isPluginWidget) {
                    //PLUGIN BASED WIDGETS
                    pluginWidgets[apps[j]] = addPluginWidget(pluginWidgets[apps[j]], widget.widget_type, i);
                }
                else {
                    //NON PLUGIN BASED WIDGETS
                    var events = [];
                    if (widget.data_type === "crash") {
                        nonPluginWidgets[apps[j]] = addWidget(nonPluginWidgets[apps[j]], "crashdata", "data", i);
                    }
                    else if (widget.data_type === "event") {
                        events = widget.events || [];
                        var segment = (widget.breakdowns && widget.breakdowns[0]) ? widget.breakdowns[0] : "no-segment";
                        for (var k = 0; k < events.length; k++) {
                            if (events[k].startsWith(apps[j])) {
                                var event = events[k].replace(apps[j] + separator, "");
                                nonPluginWidgets[apps[j]] = addWidget(nonPluginWidgets[apps[j]], "events" + JSON.stringify(["events" + crypto.createHash('sha1').update(event + apps[j]).digest('hex'), event, segment]), "data", i);
                            }
                        }
                    }
                    else if (widget.data_type === "push") {
                        if (Array.isArray(widget.metrics)) {
                            if (widget.metrics.indexOf("sent") !== -1) {
                                events.push("[CLY]_push_sent");
                            }
                            if (widget.metrics.indexOf("actioned") !== -1) {
                                events.push("[CLY]_push_action");
                            }
                        }
                        for (var kk = 0; kk < events.length; kk++) {
                            nonPluginWidgets[apps[j]] = addWidget(nonPluginWidgets[apps[j]], "events" + JSON.stringify(["events" + crypto.createHash('sha1').update(events[kk] + apps[j]).digest('hex'), events[kk], "no-segment"]), "data", i);
                        }
                    }
                    else if (widget.data_type === "session") {
                        if (widget.breakdowns && widget.breakdowns[0]) {
                            nonPluginWidgets[apps[j]] = addWidget(nonPluginWidgets[apps[j]], toCollection(widget.breakdowns[0]), widget.breakdowns[0], i);
                        }
                        else {
                            nonPluginWidgets[apps[j]] = addWidget(nonPluginWidgets[apps[j]], "users", "users", i);
                        }
                    }
                }
            }
        }

        var nonPluginApps = Object.keys(nonPluginWidgets).map(function(id) {
            return common.db.ObjectID(id);
        });
        var pluginApps = Object.keys(pluginWidgets).map(function(id) {
            return common.db.ObjectID(id);
        });
        var appIds = nonPluginApps.concat(pluginApps);

        //FETCHING DATA
        common.db.collection("apps").find({_id: {$in: appIds}}).toArray(function(err, res) {
            apps = {};
            if (!err && res) {
                for (var bb = 0; bb < res.length; bb++) {
                    apps[res[bb]._id + ""] = res[bb];
                }
            }

            var parallelTasks = [];

            parallelTasks.push(fetchNonPluginWidgetsData.bind(null, my_widgets));
            parallelTasks.push(fetchPluginWidgetsData.bind(null, my_widgets));

            async.parallel(parallelTasks, function(/*err*/) {
                callback(my_widgets);
            });

            /** fetchNonPluginWidgetsData
             * @param {object} widgets - widgets
             * @param {function} cb - callback function
            */
            function fetchNonPluginWidgetsData(widgets, cb) {
                async.map(Object.keys(nonPluginWidgets), function(app, cb_nonplugin) {
                    async.map(Object.keys(nonPluginWidgets[app]), function(collection, cb_collection) {
                        async.map(Object.keys(nonPluginWidgets[app][collection]), function(metric, cb_metric) {
                            async.map(nonPluginWidgets[app][collection][metric], function(index, cb_widget) {
                                evaluateNonPluginWidgetData(widgets, app, collection, metric, index, function() {
                                    return cb_widget();
                                });
                            },
                            function() {
                                return cb_metric();
                            });
                        },
                        function() {
                            return cb_collection();
                        });
                    }, function() {
                        cb_nonplugin();
                    });
                }, function() {
                    cb();
                });
            }

            /** fetchPluginWidgetsData
            * @param  {object} widgets2 - widget    
            * @param {function} cb - callback function
            */
            function fetchPluginWidgetsData(widgets2, cb) {
                async.map(Object.keys(pluginWidgets), function(app, callback2) {
                    async.map(Object.keys(pluginWidgets[app]), function(my_widget, done) {
                        async.each(pluginWidgets[app][my_widget], function(z, cbk) {
                            if (widgets2[z].client_fetch) {
                                //If widget is client fetch
                                //Donot initiate the data collection form api orchestrator
                                return cbk();
                            }

                            var widgetParams = {
                                app_id: app,
                                app: apps[app],
                                appTimezone: apps[app] && apps[app].timezone,
                                qstring: {
                                    period: widgets2[z].custom_period || params.qstring.period
                                },
                                time: common.initTimeObj(apps[app] && apps[app].timezone, params.qstring.timestamp),
                                member: params.member
                            };
                            plugins.dispatch("/dashboard/data", { params: widgetParams, data: widgets2[z] }, function() {
                                cbk();
                            });
                        }, function() {
                            done();
                        });
                    }, function(err1) {
                        callback2(err1);
                    });
                }, function(/*err*/) {
                    cb();
                });
            }

            /**
			 * Function to evaluate non plugin widget data
             * @param  {Array} widgets -  all widgets
             * @param  {String} app - App id
             * @param  {String} collection - collection name
             * @param  {String} metric - metric name
             * @param  {Number} index - widget index
             * @param  {Function} cbk - callback function
             */
            function evaluateNonPluginWidgetData(widgets, app, collection, metric, index, cbk) {
                var ob = {
                    app_id: app,
                    appTimezone: apps[app] && apps[app].timezone,
                    qstring: {
                        period: widgets[index].custom_period || params.qstring.period
                    },
                    time: common.initTimeObj(apps[app] && apps[app].timezone, params.qstring.timestamp)
                };

                /**
				 * Process Non plugin widget data
				 * @param {object} data - data
				*/
                function ret(data) {
                    var model;

                    countlyCommon.setPeriod(ob.qstring.period);
                    if (collection.startsWith("events")) {
                        model = countlyModel.load("event");
                    }
                    else {
                        model = countlyModel.load(toModel(metric));
                    }
                    model.setDb(data);

                    if (data.metrics && data.metrics[metric]) {
                        model.setTotalUsersObj(data.metrics[metric]);
                    }

                    widget = widgets[index];
                    widget.metrics = widget.metrics || model.getMetrics();
                    var modelMetrics = JSON.parse(JSON.stringify(widget.metrics));

                    if (modelMetrics.indexOf("u") !== -1) {
                        if (modelMetrics.indexOf("t") === -1) {
                            modelMetrics.push("t");
                        }
                        if (modelMetrics.indexOf("n") === -1) {
                            modelMetrics.push("n");
                        }
                    }

                    if (modelMetrics.indexOf("n") !== -1) {
                        if (modelMetrics.indexOf("u") === -1) {
                            modelMetrics.push("u");
                        }
                    }

                    if (widget.data_type !== "push") {
                        model.setMetrics(modelMetrics);
                    }
                    if (collection === "crashdata") {
                        model.setUniqueMetrics(["cru"]);
                    }

                    var widgetDat = widgets[index].data || {};
                    if (widget.widget_type === "bar-chart") {
                        widgetDat = model.getBars((widget.breakdowns && widget.breakdowns[0]) ? toSegment(widget.breakdowns[0]) : null, 10);
                    }
                    else if (widget.widget_type === "table") {
                        widgetDat = model.getTableData((widget.breakdowns && widget.breakdowns[0]) ? toSegment(widget.breakdowns[0]) : null, 10);
                    }
                    else if (widget.widget_type === "number") {
                        widgetDat = model.getNumber();
                    }
                    else if (widget.widget_type === "time-series") {
                        var parts = "";
                        if (widget.data_type === "event") {
                            parts = JSON.parse(collection.replace("events", ""));
                            widgetDat[app + separator + parts[1]] = model.getTimelineData();
                        }
                        else if (widget.data_type === "push") {
                            parts = JSON.parse(collection.replace("events", ""));
                            if (!widgetDat[app]) {
                                widgetDat[app] = {};
                            }
                            var d = model.getTimelineData();
                            for (var z in d) {
                                if (!widgetDat[app][z]) {
                                    widgetDat[app][z] = {};
                                }
                                if (parts[1] === "[CLY]_push_action") {
                                    widgetDat[app][z].actioned = d[z].c;
                                }
                                else if (parts[1] === "[CLY]_push_sent") {
                                    widgetDat[app][z].sent = d[z].c;
                                }
                            }
                        }
                        else {
                            widgetDat[app] = model.getTimelineData();
                        }
                    }
                    widgets[index].data = widgetDat;

                    cbk();
                }

                if (collection.startsWith("events")) {
                    var parts = JSON.parse(collection.replace("events", ""));
                    var col = parts.shift();
                    ob.qstring.segmentation = parts.pop();
                    if (parts[0] && (parts[0] + "").startsWith('[CLY]_group_')) {
                        fetch.getMergedEventGroups(ob, parts[0], {}, ret);
                    }
                    else {
                        fetch.getTimeObjForEvents(col, ob, ret);
                    }
                }
                else if (collection === "crashdata") {
                    fetch.getTimeObj("crashdata", ob, {unique: "cru"}, ret);
                }
                else {
                    fetch.getTimeObj(collection, ob, function(data) {
                        data.metrics = {};
                        fetch.getTotalUsersObj(metric, ob, function(dbTotalUsersObj) {
                            data.metrics[metric] = fetch.formatTotalUsersObj(dbTotalUsersObj);
                            ret(data);
                        });
                    });
                }
            }
        });
    }
    else {
        callback([]);
    }
};

module.exports = dashboard;