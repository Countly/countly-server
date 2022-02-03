/*global jQuery, countlyCommon, CV, countlyVue, _, CountlyHelpers, countlyGlobal, Promise */

(function(countlyDashboards) {

    countlyDashboards.factory = {
        dashboards: {
            getEmpty: function() {
                return {
                    name: "",
                    shared_email_edit: [],
                    shared_email_view: [],
                    shared_user_groups_edit: [],
                    shared_user_groups_view: [],
                    share_with: "all-users",
                    theme: 0
                };
            }
        },
        events: {
            getEventLongName: function(eventKey, eventMap) {
                var mapKey = eventKey.replace("\\", "\\\\").replace("\$", "\\u0024").replace(".", "\\u002e");
                if (eventMap && eventMap[mapKey] && eventMap[mapKey].name) {
                    return eventMap[mapKey].name;
                }
                else {
                    return eventKey;
                }
            },
            separator: "***"
        },
        log: function(e) {
            var DEBUG = true;
            if (DEBUG) {
                // eslint-disable-next-line no-console
                console.log(e);
            }
        }
    };

    countlyDashboards.service = {
        dashboards: {
            getAll: function() {
                return CV.$.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.r + "/dashboards/all",
                    data: {},
                    dataType: "json"
                }, {disableAutoCatch: true});
            },
            get: function(dashboardId, isRefresh) {
                return CV.$.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.r + "/dashboards",
                    data: {
                        "dashboard_id": dashboardId,
                        "period": countlyCommon.getPeriodForAjax(),
                        "action": (isRefresh) ? "refresh" : ""
                    },
                    dataType: "json",
                }, {disableAutoCatch: true});
            },
            create: function(settings) {
                return CV.$.ajax({
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
                    dataType: "json"
                }, {disableAutoCatch: true});
            },
            update: function(dashboardId, settings) {
                return CV.$.ajax({
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
                    dataType: "json"
                }, {disableAutoCatch: true});
            },
            delete: function(dashboardId) {
                return CV.$.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.w + "/dashboards/delete",
                    data: {
                        "dashboard_id": dashboardId
                    },
                    dataType: "json"
                }, {disableAutoCatch: true});
            },

            getEvents: function(appId) {
                return CV.$.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.r,
                    data: {
                        "app_id": appId,
                        "method": "get_events",
                        "timestamp": +new Date()
                    },
                    dataType: "json"
                }, {disableAutoCatch: true});
            },
            getEventGroups: function(appId) {
                return CV.$.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.r,
                    data: {
                        "app_id": appId,
                        "method": "get_event_groups",
                        "preventRequestAbort": true,
                        "timestamp": +new Date()
                    },
                    dataType: "json"
                }, {disableAutoCatch: true});
            }
        },
        widgets: {
            get: function(dashboardId, widgetId) {
                return CV.$.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.r + "/dashboards/widget",
                    data: {
                        "period": countlyCommon.getPeriodForAjax(),
                        "dashboard_id": dashboardId,
                        "widget_id": widgetId
                    }
                }, {disableAutoCatch: true});
            },
            create: function(dashboardId, widget) {
                return CV.$.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.w + "/dashboards/add-widget",
                    data: {
                        "dashboard_id": dashboardId,
                        "widget": JSON.stringify(widget)
                    },
                    dataType: "json",
                }, {disableAutoCatch: true});
            },
            update: function(dashboardId, widgetId, widget) {
                return CV.$.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.w + "/dashboards/update-widget",
                    data: {
                        "dashboard_id": dashboardId,
                        "widget_id": widgetId,
                        "widget": JSON.stringify(widget)
                    },
                }, {disableAutoCatch: true});
            },
            delete: function(dashboardId, widgetId) {
                return CV.$.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.w + "/dashboards/remove-widget",
                    data: {
                        "dashboard_id": dashboardId,
                        "widget_id": widgetId
                    },
                    dataType: "json"
                }, {disableAutoCatch: true});
            }
        }
    };

    countlyDashboards.getVuexModule = function() {
        var widgetsResource = countlyVue.vuex.Module("widgets", {
            state: function() {
                return {
                    all: []
                };
            },
            getters: {
                all: function(state) {
                    return state.all;
                }
            },
            mutations: {
                setAll: function(state, widgets) {
                    state.all = widgets;
                },
                update: function(state, widget) {
                    var index = -1;
                    widget = widget || {};

                    for (var i = 0; i < state.all.length; i++) {
                        if (state.all[i]._id === widget._id) {
                            index = i;
                            break;
                        }
                    }

                    if (index > -1) {
                        state.all.splice(index, 1, widget);
                    }
                    else if (widget._id) {
                        if (widget.size && widget.position) {
                            state.all.push(widget);
                        }
                        else {
                            log("Widgets position or size not available - ", widget);
                        }
                    }
                },
                remove: function(state, widgetId) {
                    var index = -1;

                    for (var i = 0; i < state.all.length; i++) {
                        if (state.all[i]._id === widgetId) {
                            index = i;
                            break;
                        }
                    }

                    if (index > -1) {
                        state.all.splice(index, 1);
                    }
                }
            },
            actions: {
                setAll: function(context, widgets) {
                    context.commit("setAll", widgets);
                },
                remove: function(context, id) {
                    context.commit("remove", id);
                },
                get: function(context, widgetId) {
                    var dashboardId = context.rootGetters["countlyDashboards/selected"].id;

                    return countlyDashboards.service.widgets.get(dashboardId, widgetId).then(function(w) {
                        /*
                            Update the widget in the widget store.
                        */
                        var widget = w && w[0];
                        context.commit("update", widget);
                        return widget;
                    }).catch(function(e) {
                        log(e);
                        CountlyHelpers.notify({
                            message: "Something went wrong while getting the widget!",
                            type: "error"
                        });

                        return false;
                    });
                },
                create: function(context, widget) {
                    var dashboardId = context.rootGetters["countlyDashboards/selected"].id;
                    var settings = widget.settings || {};

                    return countlyDashboards.service.widgets.create(dashboardId, settings).then(function(id) {
                        return id;
                    }).catch(function(e) {
                        log(e);
                        CountlyHelpers.notify({
                            message: "Something went wrong while creating the widget!",
                            type: "error"
                        });

                        return false;
                    });
                },
                update: function(context, widget) {
                    var dashboardId = context.rootGetters["countlyDashboards/selected"].id;
                    var widgetId = widget.id;
                    var settings = widget.settings;

                    return countlyDashboards.service.widgets.update(dashboardId, widgetId, settings).then(function() {
                        return widgetId;
                    }).catch(function(e) {
                        log(e);
                        CountlyHelpers.notify({
                            message: "Something went wrong while updating the widget!",
                            type: "error"
                        });

                        return false;
                    });
                },
                delete: function(context, widgetId) {
                    var dashboardId = context.rootGetters["countlyDashboards/selected"].id;

                    return countlyDashboards.service.widgets.delete(dashboardId, widgetId).then(function() {
                        return true;
                    }).catch(function(e) {
                        log(e);
                        CountlyHelpers.notify({
                            message: "Something went wrong while deleting the widget!",
                            type: "error"
                        });

                        return false;
                    });
                }
            }
        });

        var getEmptyState = function() {
            return {
                all: [],
                selected: {
                    id: null,
                    data: null
                },
                events: {}
            };
        };

        var getters = {
            all: function(state) {
                return _.sortBy(state.all, "name");
            },
            selected: function(state) {
                return state.selected;
            },
            reportDateRangeDict: function() {
                return {
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
            },
            allEvents: function(state) {
                var eventsObj = state.events;

                return function(appIds) {
                    var allEvents = [];

                    for (var i = 0; i < appIds.length; i++) {
                        var appId = appIds[i];

                        if (eventsObj[appId]) {
                            var events = eventsObj[appId];

                            if (events && events.list) {
                                for (var k = 0; k < events.list.length; k++) {
                                    var isGroupEvent = false;
                                    var eventName = events.list[k];

                                    var eventNamePostfix = (appIds.length > 1) ? " (" + ((countlyGlobal.apps[events._id] && countlyGlobal.apps[events._id].name) || "Unknown") + ")" : "";

                                    if (events.map && events.map[eventName] && events.map[eventName].is_group_event) {
                                        isGroupEvent = true;
                                    }

                                    var value = events._id + countlyDashboards.factory.events.separator + eventName;
                                    var name = countlyDashboards.factory.events.getEventLongName(eventName, events.map) + eventNamePostfix;

                                    allEvents.push({
                                        value: value,
                                        label: name,
                                        isGroupEvent: isGroupEvent
                                    });
                                }
                            }
                        }
                    }

                    return allEvents;
                };
            },
            allSegments: function(state) {
                var eventsObj = state.events;

                return function(appId) {
                    var segments = {};
                    if (eventsObj[appId]) {
                        segments = eventsObj[appId].segments || {};
                    }

                    return segments;
                };
            }
        };

        var mutations = {
            setAll: function(state, dashboards) {
                state.all = dashboards;
            },
            setSelectedDashboard: function(state, dashboard) {
                state.selected = {
                    id: dashboard.id,
                    data: dashboard.data
                };
            },
            addOrUpdateDashboard: function(state, dashboard) {
                var index = -1;
                for (var i = 0; i < state.all.length; i++) {
                    if (state.all[i]._id === dashboard._id) {
                        index = i;
                        break;
                    }
                }

                if (index > -1) {
                    state.all.splice(index, 1, dashboard);
                }
                else {
                    state.all.push(dashboard);
                }
            },
            removeDashboard: function(state, id) {
                var index = -1;
                for (var i = 0; i < state.all.length; i++) {
                    if (state.all[i]._id === id) {
                        index = i;
                        break;
                    }
                }

                if (index > -1) {
                    state.all.splice(index, 1);
                }
            },
            setEvents: function(state, events) {
                var eventsObj = state.events;
                eventsObj[events._id] = events;
                state.events = JSON.parse(JSON.stringify(eventsObj));
            }
        };

        var actions = {
            /*
                Public actions
            */
            getAll: function(context) {
                return countlyDashboards.service.dashboards.getAll().then(function(res) {
                    var dashboards = res || [];
                    context.dispatch("setAll", dashboards);
                    return dashboards;
                }).catch(function(e) {
                    log(e);
                    CountlyHelpers.notify({
                        message: "Something went wrong while fetching all dashboards!",
                        type: "error"
                    });

                    return false;
                });
            },
            getDashboard: function(context, params) {
                var dashboardId = context.getters.selected.id;

                countlyDashboards.service.dashboards.get(dashboardId, params && params.isRefresh).then(function(res) {
                    var dashbaord = null;
                    var widgets = [];
                    var dId = null;

                    if (res && res._id) {
                        dId = res._id;

                        if (dId === dashboardId) {
                            dashbaord = res;
                            widgets = dashbaord.widgets || [];
                        }
                        else {
                            dId = null;
                        }
                    }

                    /*
                        On getting the dashboard, Set the selected dashboard data
                        as well as update the local list of all dashboards.
                        If the dashboard is not present in the local list, add it there
                    */

                    context.commit("setSelectedDashboard", {id: dId, data: dashbaord});

                    if (dashbaord) {
                        context.commit("addOrUpdateDashboard", dashbaord);
                    }

                    /*
                        Set all widgets of this dashboard here in the vuex store - Start
                    */
                    context.dispatch("widgets/setAll", widgets);
                    /*
                        Set all widgets of this dashboard here in the vuex store - End
                    */

                    return dashbaord;
                }).catch(function(e) {
                    log(e);
                    CountlyHelpers.notify({
                        message: "Something went wrong while fetching the dashbaord!",
                        type: "error"
                    });

                    return false;
                });
            },
            setDashboard: function(context, params) {
                /**
                 * params will null when dashbaord is deleted
                 * params will also be null there are no dashboards
                 * {
                 *     id: "",
                 *     isRefresh: false
                 * }
                 */

                params = params || {};

                var dashboardId = params.id;

                var dash = context.getters.all.find(function(dashboard) {
                    return dashboard._id === dashboardId;
                });

                var widgets = dash && dash.widgets || [];

                context.commit("setSelectedDashboard", {id: dashboardId, data: dash});

                /*
                    Set all widgets of this dashboard here in the vuex store - Start
                */
                context.dispatch("widgets/setAll", widgets);
                /*
                    Set all widgets of this dashboard here in the vuex store - End
                */

                /*
                    We have already set the current dashboard and its widget data in the vuex store
                    But we will update it again after we have the updated data from the server
                    Until the request is processing, we will show the loading states for the widgets if no data is available
                */

                if (dashboardId) {
                    context.dispatch("getDashboard", params);
                }
            },

            /*
                Private actions
            */
            setAll: function(context, dashboards) {
                context.commit("setAll", dashboards);
            },
            create: function(context, settings) {
                return countlyDashboards.service.dashboards.create(settings).then(function(id) {
                    return id;
                }).catch(function(e) {
                    log(e);
                    CountlyHelpers.notify({
                        message: "Something went wrong while creating the dashboard!",
                        type: "error"
                    });

                    return false;
                });
            },
            update: function(context, settings) {
                var dashboardId = context.getters.selected.id;

                return countlyDashboards.service.dashboards.update(dashboardId, settings).then(function() {
                    context.dispatch("getDashboard");
                    return true;
                }).catch(function(e) {
                    log(e);
                    CountlyHelpers.notify({
                        message: "Something went wrong while updating the dashboard!",
                        type: "error"
                    });

                    return false;
                });
            },
            duplicate: function(context, settings) {
                settings.copyDashId = context.getters.selected.id;
                return context.dispatch("create", settings);
            },
            delete: function(context, id) {
                return countlyDashboards.service.dashboards.delete(id).then(function() {
                    context.commit("removeDashboard", id);
                    context.dispatch("setDashboard");
                    return true;
                }).catch(function(e) {
                    log(e);
                    CountlyHelpers.notify({
                        message: "Something went wrong while deleting the dashboard!",
                        type: "error"
                    });

                    return false;
                });
            },
            getEvents: function(context, params) {
                var appIds = params.appIds;
                var allEvents = context.state.events || {};

                var allPromises = [];

                for (var i = 0; i < appIds.length; i++) {
                    var appId = appIds[i];

                    if (!allEvents[appId]) {
                        allPromises.push(Promise.all(
                            [
                                countlyDashboards.service.dashboards.getEvents(appId),
                                countlyDashboards.service.dashboards.getEventGroups(appId)
                            ]
                        ));
                    }
                }

                return Promise.all(allPromises)
                    .then(function(res) {
                        for (var j = 0; j < res.length; j++) {
                            var data = res[j];
                            var events = data[0];
                            var eventGroups = data[1];

                            if (eventGroups) {
                                for (var group in eventGroups) {
                                    if (eventGroups[group].status) {
                                        events.list = events.list || [];
                                        events.list.push(eventGroups[group]._id);

                                        events.segments = events.segments || {};
                                        events.segments[eventGroups[group]._id] = eventGroups[group].source_events;

                                        events.map = events.map || {};
                                        events.map[eventGroups[group]._id] = {
                                            name: eventGroups[group].name,
                                            count: eventGroups[group].display_map.c,
                                            sum: eventGroups[group].display_map.s,
                                            dur: eventGroups[group].display_map.d,
                                            is_group_event: true
                                        };
                                    }
                                }
                            }

                            context.commit("setEvents", events);
                        }

                        return true;
                    }).catch(function(e) {
                        log(e);
                        CountlyHelpers.notify({
                            message: "Something went wrong while fetching the events!",
                            type: "error"
                        });

                        return false;
                    });
            }
        };

        return countlyVue.vuex.Module("countlyDashboards", {
            state: getEmptyState,
            getters: getters,
            mutations: mutations,
            actions: actions,
            submodules: [widgetsResource],
            destroy: false
        });
    };
    /**
     * Utility method to log errors
     * @param  {Object} e - error object
     */
    function log(e) {
        countlyDashboards.factory.log(e);
    }

})(window.countlyDashboards = window.countlyDashboards || {});
