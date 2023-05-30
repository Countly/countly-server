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
    log = common.log('dashboards:api'),
    requestProcessor = require('../../../../api/utils/requestProcessor.js'),
    plugins = require("../../../pluginManager.js");

/** @lends module:api/parts/data/dashboard */
var dashboard = {};

var separator = "***";

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
        device_type: "device_details",
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

dashboard.mapWidget = function(widget) {
    var widgetType, visualization, dataType, appcount, breakdowns, isPluginWidget, feature;

    switch (widget.widget_type) {
    case "time-series":
        widgetType = "analytics";
        visualization = "time-series";

        var apps = widget.apps;

        if (apps.length > 1) {
            appcount = 'multiple';
        }
        else {
            appcount = 'single';
        }

        break;
    case "bar-chart":
        widgetType = "analytics";
        visualization = "bar-chart";
        appcount = "single";

        break;
    case "number":
        widgetType = "analytics";
        visualization = "number";
        appcount = "single";

        break;
    case "table":
        widgetType = "analytics";
        visualization = "table";
        appcount = "single";

        break;
    case "concurrent_users":
        widgetType = "analytics";
        dataType = "user-analytics";
        breakdowns = ["online"];

        break;
    case "active_users":
        widgetType = "analytics";
        dataType = "user-analytics";
        breakdowns = ["active"];

        break;
    case "retention_segments":
        if (widget.interval) {
            if (widget.interval === "adaily") {
                widget.period = "d" + (widget.selected_span || 7);
            }
            else if (widget.inerval === "aweekly") {
                widget.period = "w" + (widget.selected_span || 12);
            }
            else if (widget.inerval === "amonthly") {
                widget.period = "m" + (widget.selected_span || 6);
            }
        }
        if (widget.retention_event) {
            var thisevent = widget.retention_event.split("***");
            widget.retention_data_type = thisevent[1];
        }
        if (widget.vis_type === "graph-standard") {
            widget.visualization_type = "graph1";
        }
        else if (widget.vis_type === "graph-weighted") {
            widget.visualization_type = "graph2";
        }
        else if (widget.vis_type === "table") {
            widget.visualization_type = "table";
        }

        break;
    case "views":
        widgetType = "analytics";
        dataType = "views";
        if (widget.views) {
            widget.metrics = widget.views;
        }
        visualization = "table";

        break;
    case "funnels":
        /**
         * Backward compatibility check for already created funnels
         * Remove when all previous funnels are shifted to client fetch
         * Funnels are to fetched on the client side
         */
        widget.client_fetch = true;

        break;
    case "note":
        if (!widget.contenthtml && widget.content) {
            var linkStyling = "",
                textStyling = "",
                text = "",
                fontSize = 15,
                colors = ["#52A3EF", "#FF8700", "#0EC1B9", "#ed6262", "#edb762", "#ede262", "#62edb0", "#62beed", "#6279ed", "#c162ed", "#ed62c7", "#9A1B2F", "#E2E4E8"];

            if (widget.font_size && !Number.isNaN(parseFloat(widget.font_size))) {
                fontSize = parseFloat(widget.font_size);
            }

            textStyling += 'font-size: ' + fontSize + 'px;';

            if (widget.text_align) {
                textStyling += "text-align: " + widget.text_align + ";";
            }

            if (widget.bar_color) {
                textStyling += 'color: ' + colors[widget.bar_color - 1] + ';';
            }

            if (widget.text_decoration) {
                for (var i = 0 ; i < widget.text_decoration.length; i++) {
                    if (widget.text_decoration[i] === "b") {
                        textStyling += 'font-weight: bold;';
                    }

                    if (widget.text_decoration[i] === "i") {
                        textStyling += 'font-style: italic;';
                    }

                    if (widget.text_decoration[i] === "u") {
                        textStyling += 'text-decoration: underline;';
                    }
                }
            }

            text = `<p class="bu-pl-2 bu-pr-2" style="${textStyling}">${widget.content}</p>`;

            if (widget.add_link) {
                if (widget.text_align) {
                    linkStyling += 'text-align: ' + widget.text_align + '; ';
                }
                linkStyling += 'white-space: normal !important;';
                text += `<p style="${linkStyling}" class="bu-p-2">
                            <a class="bu-pt-4 bu-is-clickable color-dark-blue-100" target="_blank" href="${widget.link_path}">${widget.link_text}</a>
                        </p>`;
            }

            widget.contenthtml = text;
        }
        break;
    default:
        break;
    }

    switch (widget.widget_type) {
    case "time-series":
    case "bar-chart":
    case "number":
    case "table":
        if (widget.data_type === "push") {
            widgetType = "push";
            isPluginWidget = true;
            feature = "push";
            delete widget.data_type;
        }
        else if (widget.data_type === "crash") {
            widgetType = "crashes";
            isPluginWidget = true;
            feature = "crashes";
            delete widget.data_type;
        }
        else if (widget.data_type === "event") {
            widgetType = "events";
            feature = "events";
            delete widget.data_type;
        }
        else if (widget.data_type === "session") {
            dataType = "session";
            feature = "core";
            delete widget.data_type;
        }

        break;
    case "note":
        if (!widget.feature) {
            feature = "core";
        }
        break;
    default:
        if (!widget.feature) {
            if (widget.isPluginWidget) {
                feature = widget.widget_type;
            }
        }
        break;
    }

    if (widgetType) {
        widget.widget_type = widgetType;
    }

    if (visualization) {
        widget.visualization = visualization;
    }

    if (dataType) {
        widget.data_type = dataType;
    }

    if (appcount) {
        widget.app_count = appcount;
    }

    if (breakdowns) {
        widget.breakdowns = breakdowns;
    }

    if (isPluginWidget) {
        widget.isPluginWidget = true;
    }

    if (feature) {
        widget.feature = feature;
    }

    return widget;
};

dashboard.fetchWidgetApps = function(params, widgets, callback) {
    if (widgets && widgets.length) {
        var appIds = [];
        for (var i = 0; i < widgets.length; i++) {
            var widget = widgets[i];

            var widgetApps = widget.apps || [];

            for (var j = 0; j < widgetApps.length; j++) {
                var appId = widgetApps[j];
                if (appIds.indexOf(appId) < 0) {
                    appIds.push(common.db.ObjectID(appId));
                }
            }
        }

        common.db.collection("apps").find({_id: {$in: appIds}}).toArray(function(err, res) {
            var apps = {};

            if (!err && res) {
                for (var k = 0; k < res.length; k++) {
                    apps[res[k]._id + ""] = res[k];
                }
            }

            return callback(null, apps);
        });
    }
    else {
        return callback(null, {});
    }
};

dashboard.fetchAllWidgetsData = function(params, widgets, callback) {
    if (widgets && widgets.length) {
        dashboard.fetchWidgetApps(params, widgets, function(err, apps) {
            async.forEach(widgets, function(wget, done) {

                if (wget.client_fetch) {
                    return done();
                }

                var newParams = {
                    qstring: params.qstring,
                    member: params.member
                };

                plugins.dispatch("/dashboard/data", {
                    params: JSON.parse(JSON.stringify(newParams)),
                    apps: JSON.parse(JSON.stringify(apps)),
                    widget: wget
                }, function() {
                    return done();
                });

            }, function() {
                return callback(widgets);
            });
        });
    }
    else {
        return callback([]);
    }
};

dashboard.fetchAnalyticsData = async function(params, apps, widget) {
    var dashData = {};
    var widgetApps;
    var widgetData;

    switch (widget.data_type) {
    case "session":
        try {
            widgetApps = widget.apps || [];
            widgetData = {};

            for (let i = 0; i < widgetApps.length; i++) {
                var appId = widgetApps[i];
                widgetData[appId] = await getAnalyticsSessionDataForApp(params, apps, appId, widget);
            }

            dashData.isValid = true;
            dashData.data = widgetData;
            widget.dashData = dashData;
        }
        catch (e) {
            log.d("Error while fetching analytics widget data for - ", widget);
            log.d("Error is - ", e);

            dashData.isValid = false;
            dashData.data = undefined;
            widget.dashData = dashData;

            return widget;
        }

        break;
    case "technology":
    case "geo":
    case "sources":
        try {
            widgetApps = widget.apps || [];
            widgetData = {};

            for (let i = 0; i < widgetApps.length; i++) {
                var appId2 = widgetApps[i];
                widgetData[appId2] = await getAnalyticsTechnologyDataForApp(params, apps, appId2, widget);
            }
            dashData.isValid = true;
            dashData.data = widgetData;
            widget.dashData = dashData;
        }
        catch (e) {
            log.d("Error while fetching analytics widget data for - ", widget);
            log.d("Error is - ", e);

            dashData.isValid = false;
            dashData.data = undefined;
            widget.dashData = dashData;
            return widget;
        }
        break;
    case "user-analytics":
        if (widget.breakdowns && Array.isArray(widget.breakdowns) && widget.breakdowns[0] === "overview") {

            try {
                widgetApps = widget.apps || [];
                widgetData = {};
                var metrics = [];
                for (var k = 0;k < widget.metrics.length; k++) {
                    metrics.push(widget.metrics[k]);
                }

                widget.metrics = ['u', 'n']; //calculate all by those

                for (let i = 0; i < widgetApps.length; i++) {
                    var appId3 = widgetApps[i];
                    widgetData[appId3] = await getAnalyticsSessionDataForApp(params, apps, appId3, widget);
                }
                widget.metrics = metrics; //put back original
                dashData.isValid = true;
                dashData.data = widgetData;

                widget.dashData = dashData;
            }
            catch (e) {
                log.d("Error while fetching analytics widget data for - ", widget);
                log.d("Error is - ", e);

                dashData.isValid = false;
                dashData.data = undefined;

                widget.dashData = dashData;

                return widget;
            }
        }
        break;
    default:
        break;
    }
};

dashboard.fetchEventsData = async function(params, apps, widget) {
    var dashData = {};

    try {
        var widgetApps = widget.apps || [];
        var widgetData = {};

        for (let i = 0; i < widgetApps.length; i++) {
            var appId = widgetApps[i];
            widgetData[appId] = await getEventsDataForApp(params, apps, appId, widget);
        }
        var names = await getEventsNames(widget);
        dashData.naming = names;

        dashData.isValid = true;
        dashData.data = widgetData;

        widget.dashData = dashData;
    }
    catch (e) {
        log.d("Error while fetching events widget data for - ", widget);
        log.d("Error is - ", e);

        dashData.isValid = false;
        dashData.data = undefined;

        widget.dashData = dashData;

        return widget;
    }
};

dashboard.fetchPushData = async function(params, apps, widget) {
    var dashData = {};

    try {
        var widgetApps = widget.apps || [];
        var widgetData = {};

        for (let i = 0; i < widgetApps.length; i++) {
            var appId = widgetApps[i];
            widgetData[appId] = await getPushDataForApp(params, apps, appId, widget);
        }

        dashData.isValid = true;
        dashData.data = widgetData;

        widget.dashData = dashData;
    }
    catch (e) {
        log.d("Error while fetching events widget data for - ", widget);
        log.d("Error is - ", e);

        dashData.isValid = false;
        dashData.data = undefined;

        widget.dashData = dashData;

        return widget;
    }
};

dashboard.fetchCrashData = async function(params, apps, widget) {
    var dashData = {};

    try {
        var widgetApps = widget.apps || [];
        var widgetData = {};

        for (let i = 0; i < widgetApps.length; i++) {
            var appId = widgetApps[i];
            widgetData[appId] = await getCrashDataForApp(params, apps, appId, widget);
        }

        dashData.isValid = true;
        dashData.data = widgetData;

        widget.dashData = dashData;
    }
    catch (e) {
        log.d("Error while fetching events widget data for - ", widget);
        log.d("Error is - ", e);

        dashData.isValid = false;
        dashData.data = undefined;

        widget.dashData = dashData;

        return widget;
    }
};

dashboard.fetchNoteData = async function(params, apps, widget) {
    widget.dashData = {
        isValid: true,
        isProcessing: false,
        data: widget.content
    };

    return widget;
};


/**
 * Remove deleted records from widgets
 * 
 * @param {string} apiKey user's api key
 * @param {object} matchOperator match operator for aggregation
 */
dashboard.removeDeletedRecordsFromWidgets = async function(apiKey, matchOperator) {
    try {
        if (!apiKey || !matchOperator) {
            log.e('missing parameters for removeDeletedRecordsFromWidgets', apiKey, matchOperator);
            return false;
        }

        var pipeline = [
            {
                $match: matchOperator
            },
            {
                $lookup: {
                    from: "dashboards",
                    localField: "_id",
                    foreignField: "widgets",
                    as: "dashboard"
                }
            },
            {
                $unwind: "$dashboard"
            },
            {
                $project: {
                    _id: 0,
                    widget_id: "$_id",
                    dashboard_id: "$dashboard._id",
                }
            }
        ];
        const widgets = await common.db.collection('widgets').aggregate(pipeline, {allowDiskUse: true}).toArray();
        widgets.forEach((widget)=>{
            var dashboardId = widget.dashboard_id;
            var widgetId = widget.widget_id;
            if (!dashboardId || !widgetId) {
                log.e('dashbordId or widgetId could not found in remove widget');
                return false;
            }
            var params = {
                'req': {
                    url: "/i/dashboards/remove-widget?dashboard_id=" + dashboardId + "&widget_id=" + widgetId + "&api_key=" + apiKey
                },
                //adding custom processing for API responses
                'APICallback': function(err, responseData, headers, returnCode) {
                    if (err) {
                        log.e('Error while removing widget from dashboard', err, responseData, headers, returnCode);
                    }
                }
            };
            requestProcessor.processRequest(params);
        });
    }
    catch (error) {
        log.e('Invalid request for remove widget', error);
        return false;
    }
};

/**
 * Function to fetch technology analytics data for app
 * @param  {Object} params - params object
 * @param  {Object} apps - all apps object
 * @param  {String} appId - app id
 * @param  {Object} widget - widget object
 */
async function getAnalyticsTechnologyDataForApp(params, apps, appId, widget) {
    var visualization = widget.visualization;
    var breakdowns = widget.breakdowns;
    var widgetData = {};

    if (widget.custom_period && widget.custom_period !== "") {
        params.qstring.period = widget.custom_period;
    }
    if (widget.data_type === "sources") {
        breakdowns = ['sources'];
    }
    //bar-chart, pie-chart, table
    var collection, segment;
    switch (visualization) {
    case 'bar-chart':
    case 'pie-chart':
    case 'time-series':
    case 'table':
        if (!breakdowns || !breakdowns.length) {
            throw new Error("Breakdowns are required for bar chart and table");
        }

        collection = toCollection(breakdowns[0]);
        segment = toSegment(breakdowns[0]);

        break;
    default:
        throw new Error("Invalid visualization!");
    }

    var model = await getSessionModel(params, apps, appId, collection, segment, widget);

    switch (visualization) {
    case 'bar-chart':
    case 'pie-chart':
        var totals = {};
        totals[widget.metrics[0]] = 0;
        var graph = model.getBars(segment, -1);
        for (var z in graph) {
            totals[widget.metrics[0]] += graph[z].value;
        }

        widgetData = {"total": totals, "graph": model.getBars(segment, 10)};

        break;
    case 'table':
        widgetData = model.getTableData(segment, 10);
        break;
    case 'time-series':
        widgetData = model.getStackedBarData(segment, 10, widget.metrics[0] || "u", widget.displaytype || "percentage");
        break;
    default:
        break;
    }

    return widgetData;
}

/**
 * Function to fetch sessions analytics data for app
 * @param  {Object} params - params object
 * @param  {Object} apps - all apps object
 * @param  {String} appId - app id
 * @param  {Object} widget - widget object
 */
async function getAnalyticsSessionDataForApp(params, apps, appId, widget) {
    var visualization = widget.visualization;
    var breakdowns = widget.breakdowns;
    var widgetData = {};

    if (widget.custom_period && widget.custom_period !== "") {
        params.qstring.period = widget.custom_period;
    }
    var collection, segment;
    //user barchart - same data as timeline
    if (visualization === 'bar-chart' && widget.data_type === "user-analytics") {
        visualization = 'time-series';
    }

    switch (visualization) {
    case 'time-series':
    case 'number':
        collection = "users";
        segment = toSegment("users");

        break;
    case 'bar-chart':
    case 'table':
        if (!breakdowns || !breakdowns.length) {
            throw new Error("Breakdowns are required for bar chart and table");
        }

        collection = toCollection(breakdowns[0]);
        segment = toSegment(breakdowns[0]);

        break;
    default:
        throw new Error("Invalid visualization!");
    }

    var model = await getSessionModel(params, apps, appId, collection, segment, widget);

    switch (visualization) {
    case 'time-series':
        widgetData = model.getTimelineData();

        break;
    case 'number':
        if (widget.data_type === "user-analytics") {
            widgetData = {};
            widgetData.u = model.getNumber();
            widget.metrics = ['n'];
            model = await getSessionModel(params, apps, appId, collection, segment, widget);
            widgetData.n = model.getNumber();
        }
        else {
            widgetData = model.getNumber();
        }

        break;
    case 'bar-chart':
        widgetData = model.getBars(segment, 10);

        break;
    case 'table':
        widgetData = model.getTableData(segment, 10);

        break;
    default:
        break;
    }

    return widgetData;
}

/**
 * Function to fetch names
 * @param  {Object} widget - widget object
 */
async function getEventsNames(widget) {
    return new Promise((resolve) => {
        if (widget.title) { //no need to fetch as we have default title
            resolve({});
        }
        else {
            var sel = {};
            var eventGroups = {};
            for (let k = 0; k < widget.events.length; k++) {
                var splitted = widget.events[k].split("***");
                if (!sel[splitted[0]]) {
                    sel[splitted[0]] = {};
                }
                sel[splitted[0]][splitted[1]] = splitted[1];
                if (splitted[1] && splitted[1].startsWith('[CLY]_group_')) {
                    eventGroups[splitted[1]] = true;
                }
            }
            var match = [];
            for (var app in sel) {
                match.push(common.db.ObjectID(app));
            }

            var pipeline = [{"$match": {"_id": {"$in": match}}}, {"$project": {"_id": true, "map": true}}];
            if (Object.keys(eventGroups).length > 0) {
                var match2 = [];
                for (var key in eventGroups) {
                    match2.push(key);
                }
                pipeline.push({"$unionWith": {coll: "event_groups", pipeline: [{"$match": {"_id": {"$in": match2}}}, {"$project": {"_id": true, "app_id": true, "name": true, "is_group": "1"}}] }});
            }
            common.db.collection("events").aggregate(pipeline, function(err, data) {
                if (err) {
                    log.e(err);
                    resolve({});
                }
                else {
                    for (let k = 0; k < data.length; k++) {
                        if (data[k].is_group === "1") {
                            if (sel[data[k].app_id]) {
                                sel[data[k].app_id][data[k]._id + ""] = data[k].name;
                            }
                        }
                        else {
                            if (sel[data[k]._id + ""]) {
                                for (var eventKey in sel[data[k]._id + ""]) {
                                    if (data[k].map && data[k].map[eventKey] && data[k].map[eventKey].name) {
                                        sel[data[k]._id + ""][eventKey] = data[k].map[eventKey].name;
                                    }
                                }
                            }
                        }
                    }
                    resolve(sel);
                }
            });
        }
    });
}

/**
 * Function to fetch events data for app
 * @param  {Object} params - params object
 * @param  {Object} apps - all apps object
 * @param  {String} appId - app id
 * @param  {Object} widget - widget object
 */
async function getEventsDataForApp(params, apps, appId, widget) {
    var visualization = widget.visualization;
    var breakdowns = widget.breakdowns;
    var events = widget.events || [];
    var widgetData = {}, segment;

    switch (visualization) {
    case 'time-series':
    case 'number':
        segment = toSegment("no-segment");

        break;
    case 'bar-chart':
    case 'table':
        if (!breakdowns || !breakdowns.length) {
            throw new Error("Breakdowns are required for bar chart and table");
        }

        segment = toSegment(breakdowns[0]);
        break;
    default:
        throw new Error("Invalid visualization!");
    }

    for (var k = 0; k < events.length; k++) {
        if (events[k].startsWith(appId)) {
            var event = events[k].replace(appId + separator, "");
            var collection = "events" + crypto.createHash('sha1').update(event + appId).digest('hex');
            var model = await getEventsModel(params, apps, appId, collection, segment, event, widget);

            switch (visualization) {
            case 'time-series':
                widgetData[event] = model.getTimelineData();

                break;
            case 'number':
                widgetData[event] = model.getNumber();

                break;
            case 'bar-chart':
                widgetData[event] = model.getBars(segment, 10);

                break;
            case 'table':
                widgetData[event] = model.getTableData(segment, 10);

                break;
            default:
                break;
            }
        }
    }

    return widgetData;
}

/**
 * Function to fetch push data for app
 * @param  {Object} params - params object
 * @param  {Object} apps - all apps object
 * @param  {String} appId - app id
 * @param  {Object} widget - widget object
 */
async function getPushDataForApp(params, apps, appId, widget) {
    var visualization = widget.visualization;
    var metrics = widget.metrics || [];
    var widgetData = {}, data, segment, pushEvents = [];

    switch (visualization) {
    case 'time-series':
    case 'number':
        segment = toSegment("no-segment");

        break;
    default:
        throw new Error("Invalid visualization!");
    }

    if (Array.isArray(metrics) && metrics.length) {
        if (metrics.indexOf("sent") !== -1) {
            pushEvents.push("[CLY]_push_sent");
        }
        if (metrics.indexOf("actioned") !== -1) {
            pushEvents.push("[CLY]_push_action");
        }
    }

    for (var k = 0; k < pushEvents.length; k++) {
        var event = pushEvents[k];
        var collection = "events" + crypto.createHash('sha1').update(event + appId).digest('hex');
        var model = await getPushModel(params, apps, appId, collection, segment, event, widget);

        switch (visualization) {
        case 'time-series':
            data = model.getTimelineData();

            for (var z in data) {
                if (!widgetData[z]) {
                    widgetData[z] = {};
                }

                if (event === "[CLY]_push_action") {
                    widgetData[z].actioned = data[z].c;
                }

                if (event === "[CLY]_push_sent") {
                    widgetData[z].sent = data[z].c;
                }
            }

            break;
        case 'number':
            widgetData = model.getNumber();

            break;
        default:
            break;
        }
    }

    return widgetData;
}

/**
 * Function to fetch crash data for app
 * @param  {Object} params - params object
 * @param  {Object} apps - all apps object
 * @param  {String} appId - app id
 * @param  {Object} widget - widget object
 */
async function getCrashDataForApp(params, apps, appId, widget) {
    var visualization = widget.visualization;
    var widgetData = {}, collection;

    switch (visualization) {
    case 'time-series':
    case 'number':
        collection = "crashdata";

        break;
    default:
        throw new Error("Invalid visualization!");
    }

    var model = await getCrashModel(params, apps, appId, collection, widget);

    switch (visualization) {
    case 'time-series':
        widgetData = model.getTimelineData();

        break;
    case 'number':
        widgetData = model.getNumber();

        break;
    default:
        break;
    }

    return widgetData;
}

/**
 * Function to get analytics session data type model
 * @param  {Object} params - params object
 * @param  {Object} apps - all apps object
 * @param  {String} appId - app id
 * @param  {String} collection - collection name
 * @param  {String} segment - segment name
 * @param  {Object} widget - widget object
 * @returns {Object} - session data type model object
 */
function getSessionModel(params, apps, appId, collection, segment, widget) {
    return new Promise((resolve) => {
        var period = widget.custom_period || params.qstring.period;
        if (period.since) {
            period = [period.since, Date.now()];
        }
        var paramsObj = {
            app_id: appId,
            appTimezone: apps[appId] && apps[appId].timezone,
            qstring: {
                period: period
            },
            time: common.initTimeObj(apps[appId] && apps[appId].timezone, params.qstring.timestamp)
        };

        fetch.getTimeObj(collection, paramsObj, function(data) {
            fetch.getTotalUsersObj(segment, paramsObj, function(dbTotalUsersObj) {
                var formattedUserObj = fetch.formatTotalUsersObj(dbTotalUsersObj);

                var model = countlyModel.load(toModel(segment));

                model.setPeriod(paramsObj.qstring.period);
                model.setDb(data);

                if (formattedUserObj) {
                    model.setTotalUsersObj(formattedUserObj);
                }

                /**
                 * Can widget.metrics be null? Not sure.
                 * For Session data type and all its visualizations metrics are required,
                 * so it shouldn't be null imo.
                 * widget.metrics = widget.metrics || model.getMetrics();
                 * Code on master has above line, not sure when its required,
                 * Lets not add it yet and see what happens.
                 */
                var widgetMetrics = JSON.parse(JSON.stringify(widget.metrics));

                if (widgetMetrics.indexOf("u") !== -1) {
                    if (widgetMetrics.indexOf("t") === -1) {
                        widgetMetrics.push("t");
                    }
                    if (widgetMetrics.indexOf("n") === -1) {
                        widgetMetrics.push("n");
                    }
                }

                if (widgetMetrics.indexOf("n") !== -1) {
                    if (widgetMetrics.indexOf("u") === -1) {
                        widgetMetrics.push("u");
                    }
                }

                model.setMetrics(widgetMetrics);

                return resolve(model);
            });
        });
    });
}

/**
 * Function to get events model
 * @param  {Object} params - params object
 * @param  {Object} apps - all apps object
 * @param  {String} appId - app id
 * @param  {String} collection - collection name
 * @param  {String} segment - segment name
 * @param  {String} event - event name
 * @param  {Object} widget - widget object
 * @returns {Object} - session data type model object
 */
function getEventsModel(params, apps, appId, collection, segment, event, widget) {
    return new Promise((resolve) => {
        var paramsObj = {
            app_id: appId,
            appTimezone: apps[appId] && apps[appId].timezone,
            qstring: {
                period: widget.custom_period || params.qstring.period,
                segmentation: segment
            },
            time: common.initTimeObj(apps[appId] && apps[appId].timezone, params.qstring.timestamp)
        };

        var fn;

        if (event.startsWith('[CLY]_group_')) {
            fn = fetch.getMergedEventGroups.bind(null, paramsObj, event, {});
        }
        else {
            fn = fetch.getTimeObjForEvents.bind(null, collection, paramsObj);
        }

        fn(function(data) {
            countlyCommon.setPeriod(paramsObj.qstring.period);

            var model = countlyModel.load("event");
            model.setPeriod(paramsObj.qstring.period);
            model.setDb(data);

            /**
             * Can widget.metrics be null? Not sure.
             * For Events and all its visualizations metrics are required,
             * so it shouldn't be null imo.
             * widget.metrics = widget.metrics || model.getMetrics();
             * Code on master has above line, not sure when its required,
             * Lets not add it yet and see what happens.
             */

            model.setMetrics(widget.metrics);

            return resolve(model);
        });
    });
}

/**
 * Function to get push model
 * @param  {Object} params - params object
 * @param  {Object} apps - all apps object
 * @param  {String} appId - app id
 * @param  {String} collection - collection name
 * @param  {String} segment - segment name
 * @param  {Object} widget - widget object
 * @returns {Object} - session data type model object
 */
function getPushModel(params, apps, appId, collection, segment, widget) {
    return new Promise((resolve) => {
        var paramsObj = {
            app_id: appId,
            appTimezone: apps[appId] && apps[appId].timezone,
            qstring: {
                period: widget.custom_period || params.qstring.period,
                segmentation: segment
            },
            time: common.initTimeObj(apps[appId] && apps[appId].timezone, params.qstring.timestamp)
        };

        fetch.getTimeObjForEvents(collection, paramsObj, function(data) {
            countlyCommon.setPeriod(paramsObj.qstring.period);

            var model = countlyModel.load("event");
            model.setPeriod(paramsObj.qstring.period);

            model.setDb(data);

            return resolve(model);
        });
    });
}

/**
 * Function to get crash model
 * @param  {Object} params - params object
 * @param  {Object} apps - all apps object
 * @param  {String} appId - app id
 * @param  {String} collection - collection name
 * @param  {Object} widget - widget object
 * @returns {Object} - session data type model object
 */
function getCrashModel(params, apps, appId, collection, widget) {
    return new Promise((resolve) => {
        var paramsObj = {
            app_id: appId,
            appTimezone: apps[appId] && apps[appId].timezone,
            qstring: {
                period: widget.custom_period || params.qstring.period
            },
            time: common.initTimeObj(apps[appId] && apps[appId].timezone, params.qstring.timestamp)
        };

        fetch.getTimeObj(collection, paramsObj, {unique: "cru"}, function(data) {
            countlyCommon.setPeriod(paramsObj.qstring.period);

            var model = model = countlyModel.load(toModel("data"));
            model.setPeriod(paramsObj.qstring.period);

            model.setDb(data);

            /**
             * Can widget.metrics be null? Not sure.
             * For Events and all its visualizations metrics are required,
             * so it shouldn't be null imo.
             * widget.metrics = widget.metrics || model.getMetrics();
             * Code on master has above line, not sure when its required,
             * Lets not add it yet and see what happens.
             */

            model.setMetrics(widget.metrics);
            model.setUniqueMetrics(["cru"]);

            return resolve(model);
        });
    });
}

module.exports = dashboard;