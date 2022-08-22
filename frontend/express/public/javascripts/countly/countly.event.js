/*global countlyCommon, _, countlyGlobal, jQuery*/
// eslint-disable-next-line no-shadow-restricted-names
(function(countlyEvent, $, undefined) {

    //Private Properties
    var _activeEventDb = {},
        _activeEvents = {},
        _activeEvent = "",
        _activeSegmentation = "",
        _activeSegmentations = [],
        _activeSegmentationValues = [],
        _activeSegmentationObj = {},
        _eventGroups = {},
        _eventGroupsTable = {},
        _activeAppKey = 0,
        _initialized = false,
        _period = null;
    var _activeLoadedEvent = "";
    var _activeLoadedSegmentation = "";

    countlyEvent.hasLoadedData = function() {
        if (_activeLoadedEvent && _activeLoadedEvent === _activeEvent && _activeLoadedSegmentation === _activeSegmentation) {
            return true;
        }
        return false;
    };

    //Public Methods
    countlyEvent.initialize = function(forceReload) {

        if (!forceReload && _initialized && _period === countlyCommon.getPeriodForAjax() && _activeAppKey === countlyCommon.ACTIVE_APP_KEY) {
            return countlyEvent.refresh();
        }
        if (forceReload && countlyEvent.hasLoadedData()) {
            return true;
        }
        var currentActiveEvent = _activeEvent;
        var currentActiveSegmentation = _activeSegmentation;
        _period = countlyCommon.getPeriodForAjax();

        if (!countlyCommon.DEBUG) {
            _activeAppKey = countlyCommon.ACTIVE_APP_KEY;
            _initialized = true;

            return $.when(
                $.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.r,
                    data: {
                        "app_id": countlyCommon.ACTIVE_APP_ID,
                        "method": "get_events",
                        "period": _period,
                        "preventRequestAbort": true
                    },
                    dataType: "json",
                    success: function(json) {
                        $.ajax({
                            type: "GET",
                            url: countlyCommon.API_PARTS.data.r,
                            data: {
                                "app_id": countlyCommon.ACTIVE_APP_ID,
                                "method": "get_event_groups",
                                "preventRequestAbort": true
                            },
                            dataType: "json",
                            success: function(groups_json) {
                                _activeEvents = json;
                                _eventGroupsTable = groups_json;
                                for (var group in groups_json) {
                                    if (groups_json[group].status) {
                                        _eventGroups[groups_json[group]._id] = {
                                            label: groups_json[group].name,
                                            count: groups_json[group].display_map.c,
                                            sum: groups_json[group].display_map.s,
                                            dur: groups_json[group].display_map.d
                                        };
                                        _activeEvents.list.push(groups_json[group]._id);
                                        _activeEvents.segments[groups_json[group]._id] = groups_json[group].source_events;
                                    }
                                }
                                _eventGroups.events = json;
                                if (!_activeEvent && countlyEvent.getEvents()[0]) {
                                    _activeEvent = countlyEvent.getEvents()[0].key;
                                    currentActiveEvent = _activeEvent;
                                }
                            }
                        });
                    }
                }))
                .then(
                    function() {
                        return $.when($.ajax({
                            type: "GET",
                            url: countlyCommon.API_PARTS.data.r,
                            data: {
                                "app_id": countlyCommon.ACTIVE_APP_ID,
                                "method": "events",
                                "event": _activeEvent,
                                "segmentation": currentActiveSegmentation,
                                "period": _period,
                                "preventRequestAbort": true
                            },
                            dataType: "json",
                            success: function(json) {
                                if (currentActiveEvent === _activeEvent && currentActiveSegmentation === _activeSegmentation) {
                                    _activeLoadedEvent = _activeEvent;
                                    _activeLoadedSegmentation = _activeSegmentation;
                                    _activeEventDb = json;
                                    setMeta();
                                }
                            }
                        })).then(function() {
                            return true;
                        });
                    }
                );
        }
        else {
            _activeEventDb = {"2012": {}};
            return true;
        }
    };

    countlyEvent.getEventGroups = function() {
        return _eventGroups;
    };

    countlyEvent.getEventGroupsTable = function(getStatus) {
        if (!!getStatus === getStatus) {
            return _eventGroupsTable.filter(function(x) {
                return x.status === getStatus;
            });
        }
        return _eventGroupsTable;
    };

    countlyEvent.getOverviewList = function() {
        if (_activeEvents && _activeEvents.overview) {
            return _activeEvents.overview;
        }
        else {
            return [];
        }
    };

    countlyEvent.getOverviewData = function(callback) {
        var my_events = [];
        var _overviewData = [];

        if (_activeEvents.overview) {
            for (var z = 0; z < _activeEvents.overview.length; z++) {
                if (my_events.indexOf(_activeEvents.overview[z].eventKey) === -1) {
                    my_events.push(_activeEvents.overview[z].eventKey);
                }
            }
        }

        $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r,
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "method": "events",
                "events": JSON.stringify(my_events),
                "period": countlyCommon.getPeriodForAjax(),
                "timestamp": new Date().getTime(),
                "overview": true
            },
            dataType: "json",
            success: function(json) {
                _overviewData = [];

                if (_activeEvents.overview) {
                    for (var i = 0; i < _activeEvents.overview.length; i++) {
                        var event_key = _activeEvents.overview[i].eventKey;
                        var am_visible = true;
                        if (_activeEvents.map && _activeEvents.map[event_key] && typeof _activeEvents.map[event_key].is_visible !== 'undefined') {
                            am_visible = _activeEvents.map[event_key].is_visible;
                        }
                        if (am_visible === true) {
                            var column = _activeEvents.overview[i].eventProperty;
                            if (event_key && column) {
                                var name = _activeEvents.overview[i].eventKey;
                                if (_activeEvents.overview[i].is_event_group) {
                                    name = _eventGroups && _eventGroups[event_key] && _eventGroups[event_key].label || _activeEvents.overview[i].eventName;
                                }
                                if (_activeEvents.map && _activeEvents.map[event_key] && _activeEvents.map[event_key].name) {
                                    name = _activeEvents.map[event_key].name;
                                }

                                var property = column;
                                if (_activeEvents.map && _activeEvents.map[event_key] && _activeEvents.map[event_key][column]) {
                                    property = _activeEvents.map[event_key][column];
                                }
                                if (_activeEvents.overview[i].is_event_group) {
                                    if (_eventGroups && _eventGroups[event_key] && _eventGroups[event_key][column]) {
                                        property = _eventGroups[event_key][column];
                                    }
                                }
                                var description = "";
                                if (_activeEvents.map && _activeEvents.map[event_key] && _activeEvents.map[event_key].description) {
                                    description = _activeEvents.map[event_key].description;
                                }
                                json[event_key] = json[event_key] || {};
                                json[event_key].data = json[event_key].data || {};
                                json[event_key].data[column] = json[event_key].data[column] || {};
                                _overviewData.push({"ord": _overviewData.length, "name": name, "prop": property, "description": description, "key": event_key, "property": column, "data": json[event_key].data[column].sparkline, "count": json[event_key].data[column].total, "trend": json[event_key].data[column].change});
                            }
                        }
                    }
                }
                callback(_overviewData);
            }
        });

    };

    countlyEvent.createEventGroup = function(data, callback) {
        _activeLoadedEvent = "";
        $.ajax({
            type: "POST",
            url: countlyCommon.API_PARTS.data.w + "/event_groups/create",
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "args": data
            },
            success: function() {
                callback(true);
            },
            error: function() {
                callback(false);
            }
        });
    };

    countlyEvent.deleteEventGroup = function(data, callback) {
        _activeLoadedEvent = "";
        $.ajax({
            type: "POST",
            url: countlyCommon.API_PARTS.data.w + "/event_groups/delete",
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "args": data,
            },
            dataType: "json",
            success: function() {
                callback(true);
            },
            error: function() {
                callback(false);
            }
        });
    };

    countlyEvent.updateEventGroup = function(data, order, update_status, status, callback) {
        _activeLoadedEvent = "";
        $.ajax({
            type: "POST",
            url: countlyCommon.API_PARTS.data.w + "/event_groups/update",
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "args": data,
                "event_order": order,
                "update_status": update_status,
                "status": status
            },
            dataType: "json",
            success: function() {
                callback(true);
            },
            error: function() {
                callback(false);
            }
        });
    };

    countlyEvent.getEventGroupById = function(_id, callback) {
        $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r,
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "method": "get_event_group",
                "_id": _id
            },
            dataType: "json",
            success: function(json) {
                callback(json);
            },
            error: function(json) {
                callback(json);
            }
        });
    };

    countlyEvent.getTopEventData30Day = function(callback) {
        return $.when($.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r,
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "method": "top_events",
                "period": "30days",
                "limit": 5,
            },
            dataType: "json",
            success: function(json) {
                callback(json);
            },
            error: function(err) {
                callback(err);
            }
        }));
    };

    countlyEvent.getTopEventDataDaily = function(callback) {
        return $.when($.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r,
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "method": "top_events",
                "period": "today",
                "limit": 5
            },
            dataType: "json",
            success: function(json) {
                callback(json);
            },
            error: function(err) {
                callback(err);
            }
        }));
    };

    //updates event map for current app
    countlyEvent.update_map = function(event_map, event_order, event_overview, omitted_segments, callback) {
        _activeLoadedEvent = "";
        $.ajax({
            type: "POST",
            url: countlyCommon.API_PARTS.data.w + "/events/edit_map",
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "event_map": event_map,
                "event_order": event_order,
                "event_overview": event_overview,
                "omitted_segments": omitted_segments
            },
            success: function() {
                callback(true);
            },
            error: function() {
                callback(false);
            }
        });
    };
    //Updates visibility for multiple events
    countlyEvent.update_visibility = function(my_events, visibility, callback) {
        _activeLoadedEvent = "";
        $.ajax({
            type: "POST",
            url: countlyCommon.API_PARTS.data.w + "/events/change_visibility",
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "set_visibility": visibility,
                "events": JSON.stringify(my_events)
            },
            success: function() {
                callback(true);
            },
            error: function() {
                callback(false);
            }
        });
    };

    //Deletes events
    countlyEvent.delete_events = function(my_events, callback) {
        _activeLoadedEvent = "";
        $.ajax({
            type: "POST",
            url: countlyCommon.API_PARTS.data.w + "/events/delete_events",
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "events": countlyCommon.decodeHtml(JSON.stringify(my_events))
            },
            success: function() {
                callback(true);
            },
            error: function() {
                callback(false);
            }
        });
    };

    countlyEvent.refresh = function() {

        var currentActiveEvent = _activeEvent;
        var currentActiveSegmentation = _activeSegmentation;
        if (!countlyCommon.DEBUG) {
            return $.when(
                $.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.r,
                    data: {
                        "app_id": countlyCommon.ACTIVE_APP_ID,
                        "method": "get_events"
                    },
                    dataType: "json",
                    success: function(json) {
                        $.ajax({
                            type: "GET",
                            url: countlyCommon.API_PARTS.data.r,
                            data: {
                                "app_id": countlyCommon.ACTIVE_APP_ID,
                                "method": "get_event_groups",
                                "preventRequestAbort": true
                            },
                            dataType: "json",
                            success: function(groups_json) {
                                _activeEvents = json;
                                _eventGroupsTable = groups_json;
                                for (var group in groups_json) {
                                    if (groups_json[group].status) {
                                        _eventGroups[groups_json[group]._id] = {
                                            label: groups_json[group].name,
                                            count: groups_json[group].display_map.c,
                                            sum: groups_json[group].display_map.s,
                                            dur: groups_json[group].display_map.d
                                        };
                                        _eventGroups.events = json;
                                        _activeEvents.list.push(groups_json[group]._id);
                                        _activeEvents.segments[groups_json[group]._id] = groups_json[group].source_events;
                                    }
                                }
                                if (!_activeEvent && countlyEvent.getEvents()[0]) {
                                    _activeEvent = countlyEvent.getEvents()[0].key;
                                    currentActiveEvent = _activeEvent;
                                }
                            }
                        });
                    }
                })
            ).then(
                function() {
                    return $.when(
                        $.ajax({
                            type: "GET",
                            url: countlyCommon.API_PARTS.data.r,
                            data: {
                                "app_id": countlyCommon.ACTIVE_APP_ID,
                                "method": "events",
                                "action": "refresh",
                                "event": _activeEvent,
                                "segmentation": currentActiveSegmentation
                            },
                            dataType: "json",
                            success: function(json) {
                                if (currentActiveEvent === _activeEvent && currentActiveSegmentation === _activeSegmentation) {
                                    _activeLoadedEvent = _activeEvent;
                                    _activeLoadedSegmentation = _activeSegmentation;
                                    countlyCommon.extendDbObj(_activeEventDb, json);
                                    extendMeta();
                                }
                            }
                        })).then(
                        function() {
                            return true;
                        });
                });
        }
        else {
            _activeEventDb = {"2012": {}};
            return true;
        }
    };

    countlyEvent.reset = function() {
        _activeEventDb = {};
        _activeEvents = {};
        _eventGroupsTable = {};
        _activeEvent = "";
        _activeSegmentation = "";
        _activeSegmentations = [];
        _activeSegmentationValues = [];
        _activeSegmentationObj = {};
        _activeAppKey = 0;
        _activeLoadedEvent = "";
        _activeLoadedSegmentation = "";
        _initialized = false;
    };

    countlyEvent.refreshEvents = function() {
        if (!countlyCommon.DEBUG) {
            return $.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r,
                data: {
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    "method": "get_events"
                },
                dataType: "json",
                success: function(json) {
                    _activeEvents = json;
                    if (!_activeEvent && countlyEvent.getEvents()[0]) {
                        _activeEvent = countlyEvent.getEvents()[0].key;
                    }
                }
            });
        }
        else {
            _activeEvents = {};
            return true;
        }
    };

    countlyEvent.setActiveEvent = function(activeEvent, callback) {
        var persistData = {};
        persistData["activeEvent_" + countlyCommon.ACTIVE_APP_ID] = activeEvent;
        countlyCommon.setPersistentSettings(persistData);

        _activeEventDb = {};
        _activeSegmentation = "";
        _activeSegmentations = [];
        _activeSegmentationValues = [];
        _activeSegmentationObj = {};
        _activeEvent = activeEvent && activeEvent.toString();
        _activeLoadedEvent = "";
        _activeLoadedSegmentation = "";

        $.when(countlyEvent.initialize(true)).then(callback);
    };

    countlyEvent.setActiveSegmentation = function(activeSegmentation, callback) {
        _activeEventDb = {};
        _activeSegmentation = activeSegmentation;
        _activeLoadedEvent = "";
        _activeLoadedSegmentation = "";

        $.when(countlyEvent.initialize(true)).then(callback);
    };

    countlyEvent.getActiveSegmentation = function() {
        return (_activeSegmentation) ? _activeSegmentation : jQuery.i18n.map["events.no-segmentation"];
    };

    countlyEvent.isSegmentedView = function() {
        return (_activeSegmentation) ? true : false;
    };

    countlyEvent.getEventData = function() {

        var eventMap = (_activeEvents) ? ((_activeEvents.map) ? _activeEvents.map : {}) : {};
        if (!_activeEvent) {
            _activeEvent = Object.keys(eventMap)[0] || "";
        }

        var eventData = {},
            mapKey = _activeEvent.replace(/\\/g, "\\\\").replace(/\$/g, "\\u0024").replace(/\./g, '\\u002e'),
            countString = (_eventGroups[mapKey] && _eventGroups[mapKey].count) ? _eventGroups[mapKey].count : (eventMap[mapKey] && eventMap[mapKey].count) ? eventMap[mapKey].count : jQuery.i18n.map["events.table.count"],
            sumString = (_eventGroups[mapKey] && _eventGroups[mapKey].sum) ? _eventGroups[mapKey].sum : (eventMap[mapKey] && eventMap[mapKey].sum) ? eventMap[mapKey].sum : jQuery.i18n.map["events.table.sum"],
            durString = (_eventGroups[mapKey] && _eventGroups[mapKey].dur) ? _eventGroups[mapKey].dur : (eventMap[mapKey] && eventMap[mapKey].dur) ? eventMap[mapKey].dur : jQuery.i18n.map["events.table.dur"];

        if (_activeSegmentation) {
            eventData = {chartData: {}, chartDP: {dp: [], ticks: []}};

            var tmpEventData = countlyCommon.extractTwoLevelData(_activeEventDb, _activeSegmentationValues, countlyEvent.clearEventsObject, [
                {
                    name: "curr_segment",
                    func: function(rangeArr) {
                        return rangeArr.replace(/:/g, ".").replace(/\[CLY\]/g, "").replace(/.\/\//g, "://");
                    }
                },
                { "name": "c" },
                { "name": "s" },
                { "name": "dur" }
            ]);

            eventData.chartData = tmpEventData.chartData;

            var segments = _.pluck(eventData.chartData, "curr_segment").slice(0, 15),
                segmentsCount = _.pluck(eventData.chartData, 'c'),
                segmentsSum = _.without(_.pluck(eventData.chartData, 's'), false, null, "", undefined, NaN),
                segmentsDur = _.without(_.pluck(eventData.chartData, 'dur'), false, null, "", undefined, NaN),
                chartDP = [
                    {data: [], color: countlyCommon.GRAPH_COLORS[0]}
                ];

            if (_.reduce(segmentsSum, function(memo, num) {
                return memo + num;
            }, 0) === 0) {
                segmentsSum = [];
            }

            if (_.reduce(segmentsDur, function(memo, num) {
                return memo + num;
            }, 0) === 0) {
                segmentsDur = [];
            }

            chartDP[chartDP.length] = {data: [], color: countlyCommon.GRAPH_COLORS[1]};
            chartDP[1].data[0] = [-1, null];
            chartDP[1].data[segments.length + 1] = [segments.length, null];

            chartDP[chartDP.length] = {data: [], color: countlyCommon.GRAPH_COLORS[2]};
            chartDP[2].data[0] = [-1, null];
            chartDP[2].data[segments.length + 1] = [segments.length, null];

            chartDP[0].data[0] = [-1, null];
            chartDP[0].data[segments.length + 1] = [segments.length, null];

            eventData.chartDP.ticks.push([-1, ""]);
            eventData.chartDP.ticks.push([segments.length, ""]);

            for (var i = 0; i < segments.length; i++) {
                chartDP[0].data[i + 1] = [i, segmentsCount[i]];
                chartDP[1].data[i + 1] = [i, segmentsSum[i]];
                chartDP[2].data[i + 1] = [i, segmentsDur[i]];
                eventData.chartDP.ticks.push([i, segments[i]]);
            }

            eventData.chartDP.dp = chartDP;

            if (_eventGroups[_activeEvent]) {
                eventData.eventName = _eventGroups[_activeEvent].label;
                eventData.is_event_group = true;
            }
            else {
                eventData.eventName = countlyEvent.getEventLongName(_activeEvent);
                eventData.is_event_group = false;
            }

            if (mapKey && eventMap && eventMap[mapKey]) {
                eventData.eventDescription = eventMap[mapKey].description || "";
            }
            eventData.dataLevel = 2;
            eventData.tableColumns = [jQuery.i18n.map["events.table.segmentation"], countString];
            if (segmentsSum.length || segmentsDur.length) {
                if (segmentsSum.length) {
                    eventData.tableColumns[eventData.tableColumns.length] = sumString;
                }
                if (segmentsDur.length) {
                    eventData.tableColumns[eventData.tableColumns.length] = durString;
                }
            }
            else {
                _.each(eventData.chartData, function(element, index, list) {
                    list[index] = _.pick(element, "curr_segment", "c");
                });
            }
        }
        else {
            var chartData = [
                    { data: [], label: countString, color: countlyCommon.GRAPH_COLORS[0] },
                    { data: [], label: sumString, color: countlyCommon.GRAPH_COLORS[1] },
                    { data: [], label: durString, color: countlyCommon.GRAPH_COLORS[2] }
                ],
                dataProps = [
                    { name: "c" },
                    { name: "s" },
                    { name: "dur" }
                ];

            eventData = countlyCommon.extractChartData(_activeEventDb, countlyEvent.clearEventsObject, chartData, dataProps);

            if (_eventGroups[_activeEvent]) {
                eventData.eventName = _eventGroups[_activeEvent].label;
                eventData.is_event_group = true;
            }
            else {
                eventData.eventName = countlyEvent.getEventLongName(_activeEvent);
                eventData.is_event_group = false;
            }

            if (mapKey && eventMap && eventMap[mapKey]) {
                eventData.eventDescription = eventMap[mapKey].description || "";
            }
            eventData.dataLevel = 1;
            eventData.tableColumns = [jQuery.i18n.map["common.date"], countString];

            var cleanSumCol = _.without(_.pluck(eventData.chartData, 's'), false, null, "", undefined, NaN);
            var cleanDurCol = _.without(_.pluck(eventData.chartData, 'dur'), false, null, "", undefined, NaN);

            var reducedSum = _.reduce(cleanSumCol, function(memo, num) {
                return memo + num;
            }, 0);
            var reducedDur = _.reduce(cleanDurCol, function(memo, num) {
                return memo + num;
            }, 0);

            if (reducedSum !== 0 || reducedDur !== 0) {
                if (reducedSum !== 0) {
                    eventData.tableColumns[eventData.tableColumns.length] = sumString;
                }
                if (reducedDur !== 0) {
                    eventData.tableColumns[eventData.tableColumns.length] = durString;
                }
            }
            else {
                eventData.chartDP[1] = false;
                eventData.chartDP = _.compact(eventData.chartDP);
                _.each(eventData.chartData, function(element, index, list) {
                    list[index] = _.pick(element, "date", "c");
                });
            }
        }

        var countArr = _.pluck(eventData.chartData, "c");

        if (countArr.length) {
            eventData.totalCount = _.reduce(countArr, function(memo, num) {
                return memo + num;
            }, 0);
        }

        var sumArr = _.pluck(eventData.chartData, "s");

        if (sumArr.length) {
            eventData.totalSum = _.reduce(sumArr, function(memo, num) {
                return memo + num;
            }, 0);
        }

        var durArr = _.pluck(eventData.chartData, "dur");

        if (durArr.length) {
            eventData.totalDur = _.reduce(durArr, function(memo, num) {
                return memo + num;
            }, 0);
        }

        return eventData;
    };

    countlyEvent.getEvents = function(get_hidden, with_groups) {
        var withGroups = arguments.length === 2 ? with_groups : false;
        var events = (_activeEvents) ? ((_activeEvents.list) ? _activeEvents.list : []) : [],
            eventMap = (_activeEvents) ? ((_activeEvents.map) ? _activeEvents.map : {}) : {},
            eventOrder = (_activeEvents) ? ((_activeEvents.order) ? _activeEvents.order : []) : [],
            eventSegments = (_activeEvents) ? ((_activeEvents.segments) ? _activeEvents.segments : {}) : {},
            eventsWithOrder = [],
            eventsWithoutOrder = [];
        for (var i = 0; i < events.length; i++) {

            var arrayToUse = eventsWithoutOrder;
            var mapKey = events[i];
            if (eventOrder.indexOf(events[i]) !== -1) {
                arrayToUse = eventsWithOrder;
            }

            if (!_activeEvents.omitted_segments) {
                _activeEvents.omitted_segments = {};
            }
            if (eventMap[mapKey]) {
                if (typeof eventMap[mapKey].is_visible === "undefined") {
                    eventMap[mapKey].is_visible = true;
                }
                if (eventMap[mapKey].is_visible || get_hidden) {
                    arrayToUse.push({
                        "order": _eventGroups[events[i]] ? i : null,
                        "key": events[i],
                        "name": _eventGroups[events[i]] ? _eventGroups[events[i]].label : (eventMap[mapKey].name || events[i]),
                        "description": eventMap[mapKey].description || "",
                        "count": eventMap[mapKey].count || "",
                        "sum": eventMap[mapKey].sum || "",
                        "dur": eventMap[mapKey].dur || "",
                        "is_visible": eventMap[mapKey].is_visible,
                        "is_active": (_activeEvent === events[i]),
                        "is_event_group": _eventGroups[events[i]] ? true : false,
                        "segments": eventSegments[mapKey] || [],
                        "omittedSegments": _activeEvents.omitted_segments[mapKey] || []
                    });
                }
            }
            else {
                arrayToUse.push({
                    "order": _eventGroups[events[i]] ? i : null,
                    "key": events[i],
                    "name": _eventGroups[events[i]] ? _eventGroups[events[i]].label : events[i],
                    "description": "",
                    "count": "",
                    "sum": "",
                    "dur": "",
                    "is_visible": true,
                    "is_active": (_activeEvent === events[i]),
                    "segments": eventSegments[mapKey] || [],
                    "is_event_group": _eventGroups[events[i]] ? true : false,
                    "omittedSegments": _activeEvents.omitted_segments[mapKey] || []
                });
            }
        }

        eventsWithOrder = _.sortBy(eventsWithOrder, function(event) {
            return eventOrder.indexOf(event.key);
        });
        eventsWithoutOrder = _.sortBy(eventsWithoutOrder, function(event) {
            return event.order || event.key;
        });

        return withGroups ? eventsWithOrder.concat(eventsWithoutOrder) : eventsWithOrder.concat(eventsWithoutOrder).filter(function(e) {
            return !e.is_event_group;
        });
    };

    countlyEvent.getEventsWithSegmentations = function() {
        var eventSegmentations = (_activeEvents) ? ((_activeEvents.segments) ? _activeEvents.segments : []) : [],
            eventMap = (_activeEvents) ? ((_activeEvents.map) ? _activeEvents.map : {}) : {},
            eventNames = [];

        for (var event in eventSegmentations) {
            var mapKey = event.replace(/\\/g, "\\\\").replace(/\$/g, "\\u0024").replace(/\./g, '\\u002e');
            if (eventMap[mapKey] && eventMap[mapKey].name) {
                eventNames.push({
                    "key": event,
                    "name": eventMap[mapKey].name
                });
            }
            else {
                eventNames.push({
                    "key": event,
                    "name": event
                });
            }

            for (var i = 0; i < eventSegmentations[event].length; i++) {
                if (eventMap[mapKey] && eventMap[mapKey].name) {
                    eventNames.push({
                        "key": event,
                        "name": eventMap[mapKey].name + " / " + eventSegmentations[event][i]
                    });
                }
                else {
                    eventNames.push({
                        "key": event,
                        "name": event + " / " + eventSegmentations[event][i]
                    });
                }
            }
        }

        return eventNames;
    };

    countlyEvent.getEventMap = function(get_hidden, with_groups) {
        var events = countlyEvent.getEvents(get_hidden, with_groups),
            eventMap = {};

        for (var i = 0; i < events.length; i++) {
            eventMap[events[i].key] = events[i];
            if (events[i].is_event_group === true) {
                if (_eventGroups && _eventGroups[events[i].key]) {
                    var props = ["count", "sum", "dur"];
                    for (var k = 0; k < props.length; k++) {
                        if (_eventGroups[events[i].key][props[k]]) {
                            events[i][props[k]] = _eventGroups[events[i].key][props[k]];
                        }
                    }
                }
            }
        }

        return eventMap;
    };

    countlyEvent.getEventLongName = function(eventKey) {
        var eventMap = (_activeEvents) ? ((_activeEvents.map) ? _activeEvents.map : {}) : {};
        eventKey = "" + eventKey;
        var mapKey = eventKey.replace(/\\/g, "\\\\").replace(/\$/g, "\\u0024").replace(/\./g, '\\u002e');
        if (eventMap[mapKey] && eventMap[mapKey].name) {
            return eventMap[mapKey].name;
        }
        else if (_eventGroups[mapKey] && _eventGroups[mapKey].label) {
            return _eventGroups[mapKey].label;
        }
        else {
            return eventKey;
        }
    };

    countlyEvent.getEventSegmentations = function() {
        return _activeSegmentations;
    };

    countlyEvent.clearEventsObject = function(obj) {
        if (obj) {
            if (!obj.c) {
                obj.c = 0;
            }
            if (!obj.s) {
                obj.s = 0;
            }
            if (!obj.dur) {
                obj.dur = 0;
            }
        }
        else {
            obj = {"c": 0, "s": 0, "dur": 0};
        }

        return obj;
    };

    countlyEvent.getEventSummary = function() {
        //Update the current period object in case selected date is changed
        var _periodObj = countlyCommon.periodObj;

        var dataArr = {},
            tmp_x,
            tmp_y,
            currentTotal = 0,
            previousTotal = 0,
            currentSum = 0,
            previousSum = 0,
            currentDur = 0,
            previousDur = 0;
        var segment = "";
        var tmpCurrCount = 0,
            tmpCurrSum = 0,
            tmpCurrDur = 0,
            tmpPrevCount = 0,
            tmpPrevSum = 0,
            tmpPrevDur = 0;
        if (_periodObj.isSpecialPeriod) {
            for (var i = 0; i < (_periodObj.currentPeriodArr.length); i++) {
                tmp_x = countlyCommon.getDescendantProp(_activeEventDb, _periodObj.currentPeriodArr[i]);
                tmp_y = countlyCommon.getDescendantProp(_activeEventDb, _periodObj.previousPeriodArr[i]);
                tmp_x = countlyEvent.clearEventsObject(tmp_x);
                tmp_y = countlyEvent.clearEventsObject(tmp_y);

                if (_activeSegmentation) {
                    tmpCurrCount = 0,
                    tmpCurrSum = 0,
                    tmpCurrDur = 0,
                    tmpPrevCount = 0,
                    tmpPrevSum = 0,
                    tmpPrevDur = 0;
                    for (segment in tmp_x) {
                        tmpCurrCount += tmp_x[segment].c || 0;
                        tmpCurrSum += tmp_x[segment].s || 0;
                        tmpCurrDur += tmp_x[segment].dur || 0;

                        if (tmp_y[segment]) {
                            tmpPrevCount += tmp_y[segment].c || 0;
                            tmpPrevSum += tmp_y[segment].s || 0;
                            tmpPrevDur += tmp_y[segment].dur || 0;
                        }
                    }

                    tmp_x = {
                        "c": tmpCurrCount,
                        "s": tmpCurrSum,
                        "dur": tmpCurrDur
                    };

                    tmp_y = {
                        "c": tmpPrevCount,
                        "s": tmpPrevSum,
                        "dur": tmpPrevDur
                    };
                }

                currentTotal += tmp_x.c;
                previousTotal += tmp_y.c;
                currentSum += tmp_x.s;
                previousSum += tmp_y.s;
                currentDur += tmp_x.dur;
                previousDur += tmp_y.dur;
            }
        }
        else {
            tmp_x = countlyCommon.getDescendantProp(_activeEventDb, _periodObj.activePeriod);
            tmp_y = countlyCommon.getDescendantProp(_activeEventDb, _periodObj.previousPeriod);
            tmp_x = countlyEvent.clearEventsObject(tmp_x);
            tmp_y = countlyEvent.clearEventsObject(tmp_y);

            if (_activeSegmentation) {
                tmpCurrCount = 0,
                tmpCurrSum = 0,
                tmpCurrDur = 0,
                tmpPrevCount = 0,
                tmpPrevSum = 0,
                tmpPrevDur = 0;
                for (segment in tmp_x) {
                    if (typeof tmp_x[segment].c === 'number') {
                        tmpCurrCount += tmp_x[segment].c || 0;
                    }
                    if (typeof tmp_x[segment].s === 'number') {
                        tmpCurrSum += tmp_x[segment].s || 0;
                    }
                    if (typeof tmp_x[segment].dur === 'number') {
                        tmpCurrDur += tmp_x[segment].dur || 0;
                    }

                    if (tmp_y[segment]) {
                        if (typeof tmp_y[segment].c === 'number') {
                            tmpPrevCount += tmp_y[segment].c || 0;
                        }
                        if (typeof tmp_y[segment].s === 'number') {
                            tmpPrevSum += tmp_y[segment].s || 0;
                        }
                        if (typeof tmp_y[segment].dur === 'number') {
                            tmpPrevDur += tmp_y[segment].dur || 0;
                        }
                    }
                }

                tmp_x = {
                    "c": tmpCurrCount,
                    "s": tmpCurrSum,
                    "dur": tmpCurrDur
                };

                tmp_y = {
                    "c": tmpPrevCount,
                    "s": tmpPrevSum,
                    "dur": tmpPrevDur
                };
            }

            currentTotal = tmp_x.c;
            previousTotal = tmp_y.c;
            currentSum = tmp_x.s;
            previousSum = tmp_y.s;
            currentDur = tmp_x.dur;
            previousDur = tmp_y.dur;
        }

        var	changeTotal = countlyCommon.getPercentChange(previousTotal, currentTotal),
            changeSum = countlyCommon.getPercentChange(previousSum, currentSum),
            changeDur = countlyCommon.getPercentChange(previousDur, currentDur);

        dataArr =
        {
            usage: {
                "event-total": {
                    "total": currentTotal,
                    "change": changeTotal.percent,
                    "trend": changeTotal.trend
                },
                "event-sum": {
                    "total": currentSum,
                    "change": changeSum.percent,
                    "trend": changeSum.trend
                },
                "event-dur": {
                    "total": countlyCommon.formatSecond(currentDur),
                    "change": changeDur.percent,
                    "trend": changeDur.trend
                }
            }
        };

        var eventMap = (_activeEvents) ? ((_activeEvents.map) ? _activeEvents.map : {}) : {},
            mapKey = _activeEvent.replace(/\\/g, "\\\\").replace(/\$/g, "\\u0024").replace(/\./g, '\\u002e'),
            countString = (_eventGroups[mapKey] && _eventGroups[mapKey].count) ? _eventGroups[mapKey].count : (eventMap[mapKey] && eventMap[mapKey].count) ? eventMap[mapKey].count.toUpperCase() : jQuery.i18n.map["events.count"],
            sumString = (_eventGroups[mapKey] && _eventGroups[mapKey].sum) ? _eventGroups[mapKey].sum : (eventMap[mapKey] && eventMap[mapKey].sum) ? eventMap[mapKey].sum.toUpperCase() : jQuery.i18n.map["events.sum"],
            durString = (_eventGroups[mapKey] && _eventGroups[mapKey].dur) ? _eventGroups[mapKey].dur : (eventMap[mapKey] && eventMap[mapKey].dur) ? eventMap[mapKey].dur.toUpperCase() : jQuery.i18n.map["events.dur"];

        var bigNumbers = {
            "class": "one-column",
            "items": [
                {
                    "title": countString,
                    "class": "event-count",
                    "total": dataArr.usage["event-total"].total,
                    "trend": dataArr.usage["event-total"].trend
                }
            ]
        };

        if (currentSum !== 0 && currentDur === 0) {
            bigNumbers.class = "two-column";
            bigNumbers.items[bigNumbers.items.length] = {
                "title": sumString,
                "class": "event-sum",
                "total": dataArr.usage["event-sum"].total,
                "trend": dataArr.usage["event-sum"].trend
            };
        }
        else if (currentSum === 0 && currentDur !== 0) {
            bigNumbers.class = "two-column";
            bigNumbers.items[bigNumbers.items.length] = {
                "title": durString,
                "class": "event-dur",
                "total": dataArr.usage["event-dur"].total,
                "trend": dataArr.usage["event-dur"].trend
            };
        }
        else if (currentSum !== 0 && currentDur !== 0) {
            bigNumbers.class = "threes-column";
            bigNumbers.items[bigNumbers.items.length] = {
                "title": sumString,
                "class": "event-sum",
                "total": dataArr.usage["event-sum"].total,
                "trend": dataArr.usage["event-sum"].trend
            };
            bigNumbers.items[bigNumbers.items.length] = {
                "title": durString,
                "class": "event-dur",
                "total": dataArr.usage["event-dur"].total,
                "trend": dataArr.usage["event-dur"].trend
            };
        }

        return bigNumbers;
    };

    countlyEvent.getMultiEventData = function(eventKeysArr, callback) {
        $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r,
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "method": "events",
                "events": JSON.stringify(eventKeysArr)
            },
            dataType: "json",
            success: function(json) {
                callback(extractDataForGraphAndChart(json));
            }
        });

        /** function extracts data for graph and chart
        * @param {object} dataFromDb - extracted data from db
        * @returns {object} graph and chart data
        */
        function extractDataForGraphAndChart(dataFromDb) {
            var eventData = {},
                eventMap = (_activeEvents) ? ((_activeEvents.map) ? _activeEvents.map : {}) : {},
                mapKey = _activeEvent.replace(/\\/g, "\\\\").replace(/\$/g, "\\u0024").replace(/\./g, '\\u002e'),
                countString = (_eventGroups[mapKey] && _eventGroups[mapKey].count) ? _eventGroups[mapKey].count : (eventMap[mapKey] && eventMap[mapKey].count) ? eventMap[mapKey].count : jQuery.i18n.map["events.table.count"],
                sumString = (_eventGroups[mapKey] && _eventGroups[mapKey].sum) ? _eventGroups[mapKey].sum : (eventMap[mapKey] && eventMap[mapKey].sum) ? eventMap[mapKey].sum : jQuery.i18n.map["events.table.sum"],
                durString = (_eventGroups[mapKey] && _eventGroups[mapKey].dur) ? _eventGroups[mapKey].dur : (eventMap[mapKey] && eventMap[mapKey].dur) ? eventMap[mapKey].dur : jQuery.i18n.map["events.table.dur"];

            var chartData = [
                    { data: [], label: countString, color: countlyCommon.GRAPH_COLORS[0] },
                    { data: [], label: sumString, color: countlyCommon.GRAPH_COLORS[1] },
                    { data: [], label: durString, color: countlyCommon.GRAPH_COLORS[2] }
                ],
                dataProps = [
                    { name: "c" },
                    { name: "s" },
                    { name: "dur" }
                ];

            eventData = countlyCommon.extractChartData(dataFromDb, countlyEvent.clearEventsObject, chartData, dataProps);

            eventData.eventName = countlyEvent.getEventLongName(_activeEvent);
            eventData.dataLevel = 1;
            eventData.tableColumns = [jQuery.i18n.map["common.date"], countString];

            var cleanSumCol = _.without(_.pluck(eventData.chartData, 's'), false, null, "", undefined, NaN);
            var cleanDurCol = _.without(_.pluck(eventData.chartData, 'dur'), false, null, "", undefined, NaN);

            var reducedSum = _.reduce(cleanSumCol, function(memo, num) {
                return memo + num;
            }, 0);
            var reducedDur = _.reduce(cleanDurCol, function(memo, num) {
                return memo + num;
            }, 0);

            if (reducedSum !== 0 || reducedDur !== 0) {
                if (reducedSum !== 0) {
                    eventData.tableColumns[eventData.tableColumns.length] = sumString;
                }
                if (reducedDur !== 0) {
                    eventData.tableColumns[eventData.tableColumns.length] = durString;
                }
            }
            else {
                eventData.chartDP[1] = false;
                eventData.chartDP = _.compact(eventData.chartDP);
                _.each(eventData.chartData, function(element, index, list) {
                    list[index] = _.pick(element, "date", "c");
                });
            }

            var countArr = _.pluck(eventData.chartData, "c");

            if (countArr.length) {
                eventData.totalCount = _.reduce(countArr, function(memo, num) {
                    return memo + num;
                }, 0);
            }

            var sumArr = _.pluck(eventData.chartData, "s");

            if (sumArr.length) {
                eventData.totalSum = _.reduce(sumArr, function(memo, num) {
                    return memo + num;
                }, 0);
            }

            var durArr = _.pluck(eventData.chartData, "dur");

            if (durArr.length) {
                eventData.totalDur = _.reduce(durArr, function(memo, num) {
                    return memo + num;
                }, 0);
            }

            return eventData;
        }
    };

    /** function set meta */
    function setMeta() {
        _activeSegmentationObj = _activeEventDb.meta || {};
        _activeSegmentations = _activeSegmentationObj.segments || [];
        if (_activeSegmentations) {
            _activeSegmentations.sort();
        }
        _activeSegmentationValues = (_activeSegmentationObj[_activeSegmentation]) ? _activeSegmentationObj[_activeSegmentation] : [];
    }
    /** function extend meta */
    function extendMeta() {
        for (var metaObj in _activeEventDb.meta) {
            if (_activeSegmentationObj[metaObj] && _activeEventDb.meta[metaObj] && _activeSegmentationObj[metaObj].length !== _activeEventDb.meta[metaObj].length) {
                _activeSegmentationObj[metaObj] = countlyCommon.union(_activeSegmentationObj[metaObj], _activeEventDb.meta[metaObj]);
            }
        }

        _activeSegmentations = _activeSegmentationObj.segments;
        if (_activeSegmentations) {
            _activeSegmentations.sort();
        }
        _activeSegmentationValues = (_activeSegmentationObj[_activeSegmentation]) ? _activeSegmentationObj[_activeSegmentation] : [];
    }

    // cached global events map;
    var eventMaps = {};

    /**
     * Deferred function to get events for target appids
     * @param  {Array} appIds - app ids
     * @param  {function} callback - callback style provided
     */
    countlyEvent.getEventsForApps = function(appIds, callback) {
        /**
         * Deferred function to get events
         * @param  {String} appId - app id
         * @param  {Array} results - results array
         * @returns {Promise} - deferred promise
         */
        function getEventsDfd(appId, results) {
            var dfd = jQuery.Deferred();

            if (eventMaps[appId]) {
                results.push(eventMaps[appId]);
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
                            eventMaps[data._id] = data;
                        }

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
                                results.push(data);
                                dfd.resolve();
                            }
                        });
                    }
                });
            }

            return dfd.promise();
        }
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
            /**
                 * Function to get the events long name
                 * @param  {String} eventKey - event name
                 * @param  {Object} eventMap - event map object
                 * @returns {String} event name
                 */
            function getEventLongName(eventKey, eventMap) {
                var mapKey = eventKey.replace(/\\/g, "\\\\").replace(/\$/g, "\\u0024").replace(/\./g, "\\u002e");
                if (eventMap && eventMap[mapKey] && eventMap[mapKey].name) {
                    return eventMap[mapKey].name;
                }
                else {
                    return eventKey;
                }
            }
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

    countlyEvent.getLimitation = function() {
        return _activeEvents.limits;
    };
    countlyEvent.getActiveEventSegmentMeta = function() {
        return _activeEventDb.meta;
    };
}(window.countlyEvent = window.countlyEvent || {}, jQuery));
