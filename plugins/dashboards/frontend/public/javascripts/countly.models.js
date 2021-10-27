/*global countlyGlobal,countlyCommon,jQuery,_ */

(function(countlyDashboards, $) {

    var metrics = {
        session: [
            { name: jQuery.i18n.prop("sidebar.analytics.sessions"), value: "t" },
            { name: jQuery.i18n.prop("sidebar.analytics.users"), value: "u" },
            { name: jQuery.i18n.prop("common.table.new-users"), value: "n" }
        ],
        event: [
            { name: jQuery.i18n.prop("events.table.count"), value: "c" },
            { name: jQuery.i18n.prop("events.table.sum"), value: "s" },
            { name: jQuery.i18n.prop("events.table.dur"), value: "dur" }
        ],
        push: [
            { name: jQuery.i18n.prop("dashboards.sent"), value: "sent" },
            { name: jQuery.i18n.prop("dashboards.actioned"), value: "actioned" }
        ],
        crash: [
            { name: jQuery.i18n.prop("dashboards.crf"), value: "crf" },
            { name: jQuery.i18n.prop("dashboards.crnf"), value: "crnf" },
            { name: jQuery.i18n.prop("dashboards.cruf"), value: "cruf" },
            { name: jQuery.i18n.prop("dashboards.crunf"), value: "crunf" }
        ]
    };

    var reportDateRanges = {
        daily: [
            {name: jQuery.i18n.map["common.yesterday"], value: "yesterday"},
            {name: jQuery.i18n.map["common.7days"], value: "7days"},
            {name: jQuery.i18n.map["common.30days"], value: "30days"},
            {name: jQuery.i18n.map["common.60days"], value: "60days"}
        ],
        weekly: [
            {name: jQuery.i18n.map["common.7days"], value: "7days"},
            {name: jQuery.i18n.map["common.30days"], value: "30days"},
            {name: jQuery.i18n.map["common.60days"], value: "60days"}
        ],
        monthly: [
            {name: jQuery.i18n.map["common.30days"], value: "30days"},
            {name: jQuery.i18n.map["common.60days"], value: "60days"}
        ]
    };

    var _dashboards = [],
        _currDashWidgets = [],
        _currDashApps = [],
        _eventMaps = {},
        _initialised = false;

    countlyDashboards.initialize = function(dashboardId, force) {
        if (_initialised && !force) {
            if (dashboardId) {
                setDashWidgetsAndApps(dashboardId);
            }

            return true;
        }

        _initialised = true;

        return $.when(
            $.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r + "/dashboards/all",
                data: {},
                dataType: "json",
                success: function(data) {
                    _dashboards = data;
                    if (dashboardId) {
                        setDashWidgetsAndApps(dashboardId);
                    }
                }
            })
        );

        /**
         * Function to set dashbaord widgets and apps
         * @param  {String} id - dashbaord id
         */
        function setDashWidgetsAndApps(id) {
            var dashboard = _.find(_dashboards, function(d) {
                return d._id === id;
            }) || {};

            _currDashWidgets = dashboard.widgets || [];
            _currDashApps = dashboard.apps || [];
        }
    };

    countlyDashboards.getAllDashboardsAjax = function() {
        var dfd = jQuery.Deferred();

        $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r + "/dashboards/all",
            data: {},
            dataType: "json",
            success: function(data) {
                _dashboards = data;
                dfd.resolve();
            }
        });

        return dfd.promise();
    };

    countlyDashboards.getAllDashboards = function() {
        var ret = [];

        for (var i = 0; i < _dashboards.length; i++) {
            ret.push({
                id: _dashboards[i]._id,
                name: _dashboards[i].name
            });
        }

        return _.sortBy(ret, "name");
    };

    countlyDashboards.getDashboard = function(dashboardId) {
        var retDash = _.find(_dashboards, function(dashboard) {
                return dashboard._id === dashboardId;
            }) || {},
            retDashClone = $.extend({}, retDash);

        retDashClone.name = countlyCommon.decodeHtml(retDashClone.name);

        return retDashClone;
    };

    countlyDashboards.createDashboard = function(settings, callback) {
        $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.w + "/dashboards/create",
            data: {
                "name": settings.name,
                "shared_email_edit": JSON.stringify(settings.shared_email_edit) || [],
                "shared_email_view": JSON.stringify(settings.shared_email_view) || [],
                "shared_user_groups_edit": JSON.stringify(settings.shared_user_groups_edit) || [],
                "shared_user_groups_view": JSON.stringify(settings.shared_user_groups_view) || [],
                "copy_dash_id": settings.copyDashId,
                "share_with": settings.share_with,
                "theme": settings.theme
            },
            dataType: "json",
            success: function(dashboardId) {
                $.when(countlyDashboards.initialize(dashboardId, true)).then(function() {
                    callback(dashboardId);
                });
            }
        });
    };

    countlyDashboards.updateDashboard = function(dashboardId, settings, callback) {
        $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.w + "/dashboards/update",
            data: {
                "dashboard_id": dashboardId,
                "name": settings.name,
                "shared_email_edit": JSON.stringify(settings.shared_email_edit),
                "shared_email_view": JSON.stringify(settings.shared_email_view),
                "shared_user_groups_edit": JSON.stringify(settings.shared_user_groups_edit),
                "shared_user_groups_view": JSON.stringify(settings.shared_user_groups_view),
                "share_with": settings.share_with,
                "theme": settings.theme
            },
            dataType: "json",
            success: function(result) {
                $.when(countlyDashboards.initialize(dashboardId, true)).then(function() {
                    callback(result);
                });
            }
        });
    };

    countlyDashboards.deleteDashboard = function(dashboardId, callback) {
        $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.w + "/dashboards/delete",
            data: {
                "dashboard_id": dashboardId
            },
            dataType: "json",
            success: function(result) {
                $.when(countlyDashboards.initialize(null, true)).then(function() {
                    callback(result);
                });
            }
        });
    };

    countlyDashboards.loadDashboard = function(dashboardId, isRefresh) {
        if (!dashboardId) {
            _currDashWidgets = [];
            _currDashApps = [];
            return true;
        }
        else {
            return $.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r + "/dashboards",
                data: {
                    "dashboard_id": dashboardId,
                    "period": countlyCommon.getPeriodForAjax(),
                    "action": (isRefresh) ? "refresh" : ""
                },
                dataType: "json",
                success: function(data) {
                    var dashboard = _.find(_dashboards, function(d) {
                        return d._id === dashboardId;
                    }) || {};

                    if (data && data.error) {
                        dashboard.widgets = [];
                        dashboard.apps = [];
                    }
                    else {
                        dashboard = Object.assign(dashboard, data);
                    }

                    for (var i = 0; i < dashboard.widgets.length; i++) {
                        var widget = dashboard.widgets[i];
                        var currWidget = _currDashWidgets.filter(function(w) { //eslint-disable-line no-loop-func
                            return w.widget_id === widget._id;
                        });

                        if (!currWidget.length) {
                            //If new widget added somehow
                            continue;
                        }

                        currWidget = currWidget[0];

                        for (var key in currWidget) {
                            //Copy the keys from the stale widget object to the new updated widget object.
                            //Because the new updated widget object is used as a reference everywhere.
                            //Mainly this copies the dashData field and any other field added by the plugin
                            //If the ajax call finishes before.

                            if (!widget[key]) {
                                widget[key] = currWidget[key];
                            }
                        }

                        //Delete plaecholder and orchestration
                        //Because we will recreate the widget
                        //This will also recreate the client fetch widget even if its already created
                        //No check for that yet in widgets module
                        delete widget.placeholder;
                        delete widget.orchestration;
                    }

                    _currDashWidgets = dashboard.widgets;
                    _currDashApps = dashboard.apps;
                }
            });
        }
    };

    countlyDashboards.hasWidgets = function() {
        return (_currDashWidgets.length > 0);
    };

    countlyDashboards.getWidgets = function() {
        return _currDashWidgets;
    };

    countlyDashboards.getWidget = function(widgetId) {
        return _.find(_currDashWidgets, function(widget) {
            return widget._id === widgetId;
        }) || {};
    };

    countlyDashboards.addWidgetToDashboard = function(dashboardId, widget, callback) {
        $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.w + "/dashboards/add-widget",
            data: {
                "dashboard_id": dashboardId,
                "widget": JSON.stringify(widget)
            },
            dataType: "json",
            success: function(res) {
                callback(res);
            }
        });
    };

    countlyDashboards.removeWidgetFromDashboard = function(dashboardId, widgetId, callback) {
        $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.w + "/dashboards/remove-widget",
            data: {
                "dashboard_id": dashboardId,
                "widget_id": widgetId
            },
            dataType: "json",
            success: function(res) {
                if (res && res.error) {
                    return callback(res);
                }

                var widgetIndex = -1;

                for (var i = 0; i < _currDashWidgets.length; i++) {
                    if (_currDashWidgets[i]._id === widgetId) {
                        widgetIndex = i;
                        break;
                    }
                }

                _currDashWidgets.splice(widgetIndex, 1);

                callback(res);
            }
        });
    };

    countlyDashboards.registerWidgetToDashboard = function(widget) {
        _currDashWidgets.push(widget);
    };

    countlyDashboards.updateWidgetOnDashboard = function(widgetId, widget) {
        var widgetIndex = -1;

        for (var i = 0; i < _currDashWidgets.length; i++) {
            if (_currDashWidgets[i]._id === widgetId) {
                widgetIndex = i;
                break;
            }
        }

        _currDashWidgets[widgetIndex] = widget;
    };

    countlyDashboards.getAppName = function(appId) {
        var appName = "Unknown";
        var appObj = _.find(_currDashApps, function(app) {
            return app._id === appId;
        });
        if (appObj && appObj.name) {
            appName = appObj.name;
        }
        else if (countlyGlobal.apps[appId]) {
            appName = countlyGlobal.apps[appId].name;
        }

        return appName;
    };

    countlyDashboards.getEventsForApps = function(appIds, callback) {
        if (!appIds || appIds.length === 0) {
            callback([]);
            return;
        }

        var requests = [],
            results = [],
            i = 0;

        for (i = 0; i < appIds.length; i++) {
            requests.push(getEventsDfd(appIds[i], results));
        }

        $.when.apply(null, requests).done(function() {
            var ret = [];

            for (i = 0; i < results.length; i++) {
                extractEvents(results[i], ret);
            }

            callback(ret);
        });

        /**
         * Function to extract event
         * @param  {Array} data - data array
         * @param  {Array} returnArray - return data array
         */
        function extractEvents(data, returnArray) {
            var eventData = (_.isArray(data)) ? data[0] : data;
            if (eventData && eventData.list) {
                for (var j = 0; j < eventData.list.length; j++) {
                    var eventNamePostfix = (appIds.length > 1) ? " (" + ((countlyGlobal.apps[eventData._id] && countlyGlobal.apps[eventData._id].name) || "Unknown") + ")" : "";
                    if (eventData.map && eventData.map[eventData.list[j]] && eventData.map[eventData.list[j]].is_group_event) {
                        eventNamePostfix += "<div class='group-badge'><span> (</span>" + jQuery.i18n.prop("common.group") + "<span>)</span></div>";
                    }

                    returnArray.push({
                        value: eventData._id + "***" + eventData.list[j],
                        name: getEventLongName(eventData.list[j], eventData.map) + eventNamePostfix
                    });
                }
            }
        }
    };

    countlyDashboards.getSegmentsForEvent = function(eventId, callback) {
        if (!eventId) {
            callback([]);
            return;
        }

        var eventKey = eventId.split("***")[1],
            appId = eventId.split("***")[0],
            results = [];

        $.when(getEventsDfd(appId, results)).then(function() {
            var ret = [];

            if (results[0] && results[0].segments && results[0].segments[eventKey]) {
                for (var i = 0; i < results[0].segments[eventKey].length; i++) {
                    ret.push({
                        value: results[0].segments[eventKey][i],
                        name: results[0].segments[eventKey][i]
                    });
                }
            }

            callback(ret);
        });
    };

    countlyDashboards.getSessionBreakdowns = function(appId) {
        var app = countlyGlobal.apps[appId];

        if (!app || !app.type) {
            return [];
        }

        var ret = [
            { name: "Countries", value: "countries"},
            { name: "Devices", value: "devices"},
            { name: "App Versions", value: "versions"},
            { name: "Platforms", value: "platforms"}
        ];

        if (app.type === "mobile") {
            ret.push({ name: "Carriers", value: "carriers"});
            ret.push({ name: "Resolutions", value: "resolutions"});

            if (typeof countlyDensity !== "undefined") {
                ret.push({ name: "Densities", value: "density"});
            }

            if (typeof countlyLanguage !== "undefined") {
                ret.push({ name: "Languages", value: "langs"});
            }

            if (typeof countlySources !== "undefined") {
                ret.push({ name: "Sources", value: "sources"});
            }

        }
        else if (app.type === "web") {
            ret.push({ name: "Resolutions", value: "resolutions"});

            if (typeof countlyDensity !== "undefined") {
                ret.push({ name: "Densities", value: "density"});
            }

            if (typeof countlyBrowser !== "undefined") {
                ret.push({ name: "Browsers", value: "browser"});
            }

            if (typeof countlyLanguage !== "undefined") {
                ret.push({ name: "Languages", value: "langs"});
            }

            if (typeof countlySources !== "undefined") {
                ret.push({ name: "Sources", value: "sources"});
            }
        }
        else if (app.type === "desktop") {
            ret.push({ name: "Resolutions", value: "resolutions"});

            if (typeof countlyDensity !== "undefined") {
                ret.push({ name: "Densities", value: "density"});
            }

            if (typeof countlyLanguage !== "undefined") {
                ret.push({ name: "Languages", value: "langs"});
            }
        }

        return ret;
    };

    countlyDashboards.getMetrics = function(dataType) {
        return metrics[dataType] || [];
    };

    countlyDashboards.getReportDateRanges = function(frequency) {
        return reportDateRanges[frequency] || [];
    };

    countlyDashboards.getMetricLongName = function(shortCode) {
        var metricLongName = shortCode;

        for (var dataType in metrics) {
            for (var i = 0; i < metrics[dataType].length; i++) {
                if (metrics[dataType][i].value === shortCode) {
                    metricLongName = metrics[dataType][i].name;
                    break;
                }
            }
        }

        return metricLongName;
    };

    countlyDashboards.getBreakdownLongName = function(shortcode) {
        var breakdownMap = {
            "countries": "Countries",
            "devices": "Devices",
            "versions": "App Versions",
            "platforms": "Platforms",
            "carriers": "Carriers",
            "resolutions": "Resolutions",
            "density": "Densities",
            "langs": "Languages",
            "sources": "Sources",
            "browser": "Browsers"
        };

        return breakdownMap[shortcode] || shortcode;
    };

    countlyDashboards.getEventName = function(eventId, callback) {
        var eventKey = eventId.split("***")[1],
            appId = eventId.split("***")[0],
            results = [];

        $.when(getEventsDfd(appId, results)).then(function() {
            callback(getEventLongName(eventKey, (results[0].map) ? results[0].map : null));
        });
    };

    countlyDashboards.getEventNameDfd = function(eventId, results) {
        var dfd = jQuery.Deferred();

        countlyDashboards.getEventName(eventId, function(eventName) {
            results[eventId] = eventName;
            dfd.resolve();
        });

        return dfd.promise();
    };

    countlyDashboards.getTextDecorations = function() {
        return [
            {
                name: jQuery.i18n.map["dashboards.bold"],
                value: "b"
            },
            {
                name: jQuery.i18n.map["dashboards.italic"],
                value: "i"
            },
            {
                name: jQuery.i18n.map["dashboards.underline"],
                value: "u"
            }
        ];
    };

    /**
     * Deferred function to get events
     * @param  {String} appId - app id
     * @param  {Array} results - results array
     * @returns {Promise} - deferred promise
     */
    function getEventsDfd(appId, results) {
        var dfd = jQuery.Deferred();

        if (_eventMaps[appId]) {
            results.push(_eventMaps[appId]);
            dfd.resolve();
        }
        else {
            $.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r,
                data: {
                    "app_id": appId,
                    "method": "get_events",
                    "timestamp": +new Date()
                },
                dataType: "json",
                success: function(data) {
                    if (data && data._id) {
                        _eventMaps[data._id] = data;
                    }
                    results.push(data);
                    $.ajax({
                        type: "GET",
                        url: countlyCommon.API_PARTS.data.r,
                        data: {
                            "app_id": appId,
                            "method": "get_event_groups",
                            "preventRequestAbort": true,
                            "timestamp": +new Date()
                        },
                        dataType: "json",
                        success: function(groups_json) {
                            if (groups_json) {
                                for (var group in groups_json) {
                                    if (groups_json[group].status) {
                                        data.list = data.list || [];
                                        data.list.push(groups_json[group]._id);
                                        data.segments = data.segments || {};
                                        data.segments[groups_json[group]._id] = groups_json[group].source_events;
                                        data.map = data.map || {};
                                        data.map[groups_json[group]._id] = {
                                            name: groups_json[group].name,
                                            count: groups_json[group].display_map.c,
                                            sum: groups_json[group].display_map.s,
                                            dur: groups_json[group].display_map.d,
                                            is_group_event: true
                                        };
                                    }
                                }
                            }
                            dfd.resolve();
                        }
                    });
                }
            });
        }

        return dfd.promise();
    }

    /**
     * Function to get the events long name
     * @param  {String} eventKey - event name
     * @param  {Object} eventMap - event map object
     * @returns {String} event name
     */
    function getEventLongName(eventKey, eventMap) {
        var mapKey = eventKey.replace("\\", "\\\\").replace("\$", "\\u0024").replace(".", "\\u002e");
        if (eventMap && eventMap[mapKey] && eventMap[mapKey].name) {
            return eventMap[mapKey].name;
        }
        else {
            return eventKey;
        }
    }

})(window.countlyDashboards = window.countlyDashboards || {}, jQuery);