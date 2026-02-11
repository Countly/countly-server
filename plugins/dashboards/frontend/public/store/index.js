import { ajax, i18n } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { Module } from '../../../../../frontend/express/public/javascripts/countly/vue/data/vuex.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import countlyGlobal from '../../../../../frontend/express/public/javascripts/countly/countly.global.js';
import { notify } from '../../../../../frontend/express/public/javascripts/countly/countly.helpers.js';

var isRequestCancelled = function(e) {
    var isCancelled = false;
    if (e && e.statusText === "abort") {
        isCancelled = true;
    }
    return isCancelled;
};

var countlyDashboards = {
    factory: {
        dashboards: {
            getEmpty() {
                return {
                    name: "",
                    shared_email_edit: [],
                    shared_email_view: [],
                    shared_user_groups_edit: [],
                    shared_user_groups_view: [],
                    share_with: "all-users",
                    theme: 0,
                    is_owner: true,
                    send_email_invitation: false,
                    use_refresh_rate: false,
                    refreshRate: 0,
                };
            }
        },
        events: {
            getEventLongName(eventKey, eventMap) {
                var mapKey = eventKey.replace(/\\/g, "\\\\").replace(/\$/g, "\\u0024").replace(/\./g, "\\u002e");
                if (eventMap && eventMap[mapKey] && eventMap[mapKey].name) {
                    return eventMap[mapKey].name;
                }
                else {
                    return eventKey;
                }
            },
            separator: "***"
        },
        request: {
            getEmpty() {
                return {
                    isInit: true,
                    isRefresh: false,
                    isDrawerOpen: false,
                    isGridInteraction: false,
                    isProcessing: false,
                    isSane: true
                };
            }
        },
        log(e) {
            var DEBUG = false;
            if (DEBUG) {
                // eslint-disable-next-line no-console
                console.log(e);
            }
        }
    },
    service: {
        dashboards: {
            getAll(just_schema = false) {
                return ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.r + "/dashboards/all",
                    data: {
                        "just_schema": just_schema,
                    },
                    dataType: "json"
                }, {disableAutoCatch: true});
            },
            get(dashboardId, isRefresh) {
                if (!dashboardId) {
                    return Promise.resolve(null);
                }
                return ajax({
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
            create(settings) {
                return ajax({
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
                        "send_email_invitation": settings.send_email_invitation,
                        "use_refresh_rate": settings.use_refresh_rate,
                        "refreshRate": settings.refreshRate,
                        "theme": settings.theme
                    },
                    dataType: "json"
                }, {disableAutoCatch: true});
            },
            update(dashboardId, settings) {
                return ajax({
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
                        "send_email_invitation": settings.send_email_invitation,
                        "theme": settings.theme,
                        "use_refresh_rate": settings.use_refresh_rate,
                        "refreshRate": settings.refreshRate
                    },
                    dataType: "json"
                }, {disableAutoCatch: true});
            },
            delete(dashboardId) {
                return ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.w + "/dashboards/delete",
                    data: {
                        "dashboard_id": dashboardId
                    },
                    dataType: "json"
                }, {disableAutoCatch: true});
            },
            getEvents(appId) {
                return ajax({
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
            getEventGroups(appId) {
                return ajax({
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
            get(dashboardId, widgetId) {
                return ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.r + "/dashboards/widget",
                    data: {
                        "period": countlyCommon.getPeriodForAjax(),
                        "dashboard_id": dashboardId,
                        "widget_id": widgetId
                    }
                }, {disableAutoCatch: true});
            },
            create(dashboardId, widget) {
                return ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.w + "/dashboards/add-widget",
                    data: {
                        "dashboard_id": dashboardId,
                        "widget": JSON.stringify(widget)
                    },
                    dataType: "json",
                }, {disableAutoCatch: true});
            },
            update(dashboardId, widgetId, widget) {
                return ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.w + "/dashboards/update-widget",
                    data: {
                        "dashboard_id": dashboardId,
                        "widget_id": widgetId,
                        "widget": JSON.stringify(widget)
                    },
                }, {disableAutoCatch: true});
            },
            delete(dashboardId, widgetId) {
                return ajax({
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
    },
    getVuexModule() {
        var widgetsResource = Module("widgets", {
            state() {
                return {
                    all: []
                };
            },
            getters: {
                all(state) {
                    return state.all;
                }
            },
            mutations: {
                setAll(state, widgets) {
                    state.all = widgets;
                },
                update(state, widget) {
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
                remove(state, widgetId) {
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
                },
                syncGeography(state, widget) {
                    var index = -1;
                    var settings = widget.settings || {};

                    for (var i = 0; i < state.all.length; i++) {
                        if (state.all[i]._id === widget._id) {
                            index = i;
                            break;
                        }
                    }

                    if ((index > -1) && (settings.size || settings.position)) {
                        var obj = JSON.parse(JSON.stringify(state.all[index]));

                        if (settings.size) {
                            obj.size = settings.size;
                        }

                        if (settings.position) {
                            obj.position = settings.position;
                        }

                        state.all.splice(index, 1, obj);
                    }
                }
            },
            actions: {
                setAll(context, widgets) {
                    context.commit("setAll", widgets);
                },
                remove(context, id) {
                    context.commit("remove", id);
                },
                get(context, widgetId) {
                    var dashboardId = context.rootGetters["countlyDashboards/selected"].id;

                    return countlyDashboards.service.widgets.get(dashboardId, widgetId).then(function(w) {
                        var selectedDashbaordId = context.rootGetters["countlyDashboards/selected"].id;
                        if (dashboardId !== selectedDashbaordId) {
                            return;
                        }

                        var widget = w && w[0];
                        context.commit("update", widget);
                        return widget;
                    }).catch(function(e) {
                        log(e);
                        return false;
                    });
                },
                create(context, widget) {
                    var dashboardId = context.rootGetters["countlyDashboards/selected"].id;
                    var settings = widget.settings || {};
                    if (widget.settings && widget.settings.custom_period && typeof widget.settings.custom_period === "object" && widget.settings.feature !== "funnels") {
                        if (Array.isArray(widget.settings.custom_period)) {
                            if (widget.settings.custom_period[0] && widget.settings.custom_period[0].toString().length === 13) {
                                widget.settings.custom_period[0] = Math.floor(widget.settings.custom_period[0] / 1000);
                            }
                            if (widget.settings.custom_period[1] && widget.settings.custom_period[1].toString().length === 13) {
                                widget.settings.custom_period[1] = Math.floor(widget.settings.custom_period[1] / 1000);
                            }
                        }
                        widget.settings.custom_period = countlyCommon.getPeriodWithOffset(widget.settings.custom_period);
                    }
                    return countlyDashboards.service.widgets.create(dashboardId, settings).then(function(id) {
                        return id;
                    }).catch(function(e) {
                        log(e);
                        notify({
                            message: "Something went wrong while creating the widget!",
                            type: "error"
                        });

                        return false;
                    });
                },
                update(context, widget) {
                    var dashboardId = context.rootGetters["countlyDashboards/selected"].id;
                    var widgetId = widget.id;
                    var settings = widget.settings;
                    if (widget.settings && widget.settings.custom_period && typeof widget.settings.custom_period === "object" && widget.settings.feature !== "funnels") {
                        if (Array.isArray(widget.settings.custom_period)) {
                            if (widget.settings.custom_period[0] && widget.settings.custom_period[0].toString().length === 13) {
                                widget.settings.custom_period[0] = Math.floor(widget.settings.custom_period[0] / 1000);
                            }
                            if (widget.settings.custom_period[1] && widget.settings.custom_period[1].toString().length === 13) {
                                widget.settings.custom_period[1] = Math.floor(widget.settings.custom_period[1] / 1000);
                            }
                        }
                        widget.settings.custom_period = countlyCommon.getPeriodWithOffset(widget.settings.custom_period);
                    }

                    return countlyDashboards.service.widgets.update(dashboardId, widgetId, settings).then(function() {
                        return widgetId;
                    }).catch(function(e) {
                        log(e);
                        notify({
                            message: "Something went wrong while updating the widget!",
                            type: "error"
                        });

                        return false;
                    });
                },
                delete(context, widgetId) {
                    var dashboardId = context.rootGetters["countlyDashboards/selected"].id;

                    return countlyDashboards.service.widgets.delete(dashboardId, widgetId).then(function() {
                        return true;
                    }).catch(function(e) {
                        log(e);
                        notify({
                            message: "Something went wrong while deleting the widget!",
                            type: "error"
                        });

                        return false;
                    });
                },
                syncGeography(context, widget) {
                    context.commit("syncGeography", widget);
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
                events: {},
                apps: {}
            };
        };

        var getters = {
            all(state) {
                var sorted = state.all.slice();
                sorted.sort(function(a, b) {
                    var nameA = (a.name || "").toLowerCase();
                    var nameB = (b.name || "").toLowerCase();
                    if (nameA < nameB) { return -1; }
                    if (nameA > nameB) { return 1; }
                    return 0;
                });
                return sorted;
            },
            selected(state) {
                return state.selected;
            },
            allApps(state) {
                return state.apps;
            },
            reportDateRangeDict() {
                return {
                    daily: [
                        {name: i18n("common.yesterday"), value: "yesterday"},
                        {name: i18n("common.7days"), value: "7days"},
                        {name: i18n("common.30days"), value: "30days"},
                        {name: i18n("common.60days"), value: "60days"}
                    ],
                    weekly: [
                        {name: i18n("common.7days"), value: "7days"},
                        {name: i18n("common.30days"), value: "30days"},
                        {name: i18n("common.60days"), value: "60days"}
                    ],
                    monthly: [
                        {name: i18n("common.30days"), value: "30days"},
                        {name: i18n("common.60days"), value: "60days"}
                    ]
                };
            },
            allEvents(state) {
                var eventsObj = state.events;
                var appsObj = state.apps;

                return function(appIds) {
                    var allEvents = [];

                    for (var i = 0; i < appIds.length; i++) {
                        var appId = appIds[i];

                        if (eventsObj[appId]) {
                            var events = eventsObj[appId];

                            if (events && events.list) {
                                for (var k = 0; k < events.list.length; k++) {
                                    var isGroupEvent = false;
                                    var eventName = decode(events.list[k]);

                                    var eventNamePostfix = (appIds.length > 1) ? " (" + ((appsObj[events._id] && appsObj[events._id].name) || "Unknown") + ")" : "";

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
            allSegments(state) {
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
            setAll(state, dashboards) {
                state.all = dashboards;
            },
            setSelectedDashboard(state, dashboard) {
                state.selected = {
                    id: dashboard.id,
                    data: dashboard.data
                };
            },
            addOrUpdateDashboard(state, dashboard) {
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
            removeDashboard(state, id) {
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
            setEvents(state, events) {
                var eventsObj = state.events;
                eventsObj[events._id] = events;
                state.events = JSON.parse(JSON.stringify(eventsObj));
            },
            setApps(state, apps) {
                var appsObj = apps.reduce(function(acc, app) {
                    acc[app._id] = {
                        _id: app._id,
                        name: app.name,
                        image: app.image,
                        type: app.type,
                        created_at: app.created_at,
                        has_image: app.has_image
                    };
                    return acc;
                }, {});

                var globalApps = {};

                for (var key in countlyGlobal.apps) {
                    globalApps[key] = {
                        _id: key,
                        name: countlyGlobal.apps[key].name,
                        image: countlyGlobal.apps[key].image,
                        type: countlyGlobal.apps[key].type,
                        created_at: countlyGlobal.apps[key].created_at,
                        has_image: countlyGlobal.apps[key].has_image
                    };
                }

                state.apps = Object.assign({}, appsObj, globalApps);
            }
        };

        var actions = {
            getAll(context, params = null) {
                var just_schema = params && params.just_schema;

                return countlyDashboards.service.dashboards.getAll(just_schema).then(function(res) {
                    var dashboards = res || [];
                    context.dispatch("setAll", dashboards);
                    return dashboards;
                }).catch(function(e) {
                    log(e);
                    notify({
                        message: "Something went wrong while fetching all dashboards!",
                        type: "error"
                    });

                    return false;
                });
            },
            getDashboard(context, params) {
                var dashboardId = context.getters.selected.id;
                var isRefresh = params && params.isRefresh;

                return countlyDashboards.service.dashboards.get(dashboardId, isRefresh).then(function(res) {
                    var isSane = context.getters["requests/isSane"];
                    var dashbaord = null;
                    var widgets = [];
                    var apps = [];
                    var dId = null;

                    if (res && res._id) {
                        dId = res._id;

                        if (dId === dashboardId) {
                            dashbaord = res;
                            widgets = dashbaord.widgets || [];
                            apps = dashbaord.apps || [];
                        }
                        else {
                            dId = null;
                        }
                    }

                    if (isSane) {
                        context.commit("setSelectedDashboard", {id: dId, data: dashbaord});

                        if (dashbaord) {
                            context.commit("addOrUpdateDashboard", dashbaord);
                        }
                        for (var z = 0; z < widgets.length; z++) {
                            if (widgets[z].custom_period) {
                                widgets[z].custom_period = countlyCommon.removePeriodOffset(widgets[z].custom_period);
                            }
                        }
                        context.dispatch("widgets/setAll", widgets);
                        context.commit("setApps", apps);

                        return false;
                    }

                    return dashbaord;
                }).catch(function(e) {
                    if (!isRequestCancelled(e)) {
                        log(e);
                        notify({
                            message: "Something went wrong while fetching the dashbaord!",
                            type: "error"
                        });
                    }
                    else {
                        log("Request cancelled: " + e);
                    }

                    return false;
                });
            },
            setDashboard(context, params) {
                params = params || {};

                var dashboardId = params.id;

                var dash = context.getters.all.find(function(dashboard) {
                    return dashboard._id === dashboardId;
                });

                var widgets = dash && dash.widgets || [];
                var apps = dash && dash.apps || [];

                context.commit("setSelectedDashboard", {id: dashboardId, data: dash});
                context.dispatch("widgets/setAll", widgets);
                context.commit("setApps", apps);

                if (dashboardId) {
                    return context.dispatch("getDashboard", params);
                }

                return false;
            },
            setAll(context, dashboards) {
                context.commit("setAll", dashboards);
            },
            create(context, settings) {
                return countlyDashboards.service.dashboards.create(settings).then(function(id) {
                    return id;
                }).catch(function(e) {
                    log(e);
                    notify({
                        message: "Something went wrong while creating the dashboard!",
                        type: "error"
                    });

                    return false;
                });
            },
            update(context, settings) {
                var dashboardId = context.getters.selected.id;

                return countlyDashboards.service.dashboards.update(dashboardId, settings).then(function() {
                    context.dispatch("getDashboard");
                    return true;
                }).catch(function(e) {
                    log(e);
                    notify({
                        message: "Something went wrong while updating the dashboard!",
                        type: "error"
                    });

                    return false;
                });
            },
            duplicate(context, settings) {
                settings.copyDashId = context.getters.selected.id;
                return context.dispatch("create", settings);
            },
            delete(context, id) {
                return countlyDashboards.service.dashboards.delete(id).then(function() {
                    context.commit("removeDashboard", id);
                    context.dispatch("setDashboard");
                    return true;
                }).catch(function(e) {
                    log(e);
                    notify({
                        message: "Something went wrong while deleting the dashboard!",
                        type: "error"
                    });

                    return false;
                });
            },
            getEvents(context, params) {
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
                        notify({
                            message: "Something went wrong while fetching the events!",
                            type: "error"
                        });

                        return false;
                    });
            }
        };

        var requestResource = Module("requests", {
            state() {
                var empty = countlyDashboards.factory.request.getEmpty();
                return empty;
            },
            getters: {
                isInitializing(state) {
                    return state.isInit;
                },
                isRefreshing(state) {
                    return state.isRefresh;
                },
                drawerOpenStatus(state) {
                    return state.isDrawerOpen;
                },
                gridInteraction(state) {
                    return state.isGridInteraction;
                },
                isProcessing(state) {
                    return state.isProcessing;
                },
                isSane(state) {
                    return state.isSane;
                }
            },
            mutations: {
                setIsInit(state, value) {
                    state.isInit = value;
                },
                setIsRefresh(state, value) {
                    state.isRefresh = value;
                },
                setIsDrawerOpen(state, value) {
                    state.isDrawerOpen = value;
                },
                setIsGridInteraction(state, value) {
                    state.isGridInteraction = value;
                },
                setIsProcessing(state, value) {
                    state.isProcessing = value;
                },
                setIsSane(state, value) {
                    state.isSane = value;
                },
                reset(state) {
                    var empty = countlyDashboards.factory.request.getEmpty();
                    for (var key in empty) {
                        state[key] = empty[key];
                    }
                }
            },
            actions: {
                isInitializing(context, status) {
                    context.commit("setIsInit", status);
                },
                isRefreshing(context, status) {
                    context.commit("setIsRefresh", status);
                },
                drawerOpenStatus(context, status) {
                    context.commit("setIsDrawerOpen", status);
                },
                gridInteraction(context, status) {
                    context.commit("setIsGridInteraction", status);
                },
                isProcessing(context, status) {
                    context.commit("setIsProcessing", status);
                },
                markSanity(context, status) {
                    context.commit("setIsSane", status);
                },
                reset(context) {
                    context.commit("reset");
                }
            }
        });

        return Module("countlyDashboards", {
            state: getEmptyState,
            getters: getters,
            mutations: mutations,
            actions: actions,
            submodules: [widgetsResource, requestResource],
            destroy: false
        });
    }
};

function log(e) {
    countlyDashboards.factory.log(e);
}

function decode(str) {
    if (typeof str === 'string') {
        return str.replace(/^&#36;/g, "$")
            .replace(/&#46;/g, '.')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&le;/g, '<=')
            .replace(/&ge;/g, '>=')
            .replace(/&amp;/g, '&');
    }
    return str;
}

export default countlyDashboards;
