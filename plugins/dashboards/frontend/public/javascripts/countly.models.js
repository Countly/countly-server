/*global countlyCommon, CV, countlyVue, _ */

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
        widgets: {
            getEmpty: function() {
                return {
                    widget_type: "time-series"
                };
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
                });
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
                });
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
                });
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
                });
            },
            delete: function(dashboardId) {
                return CV.$.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.w + "/dashboards/delete",
                    data: {
                        "dashboard_id": dashboardId
                    },
                    dataType: "json"
                });
            }
        },
        widgets: {
            get: function(dashboardId, widgetId) {
                return CV.$.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.r + "/dashboards/widget",
                    data: {
                        "period": "",
                        "dashboard_id": dashboardId,
                        "widget_id": widgetId
                    }
                });
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
                });
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
                });
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
                });
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
                updateWidget: function(state, widget) {
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
                        state.all.push(widget);
                    }
                }
            },
            actions: {
                setAll: function(context, widgets) {
                    context.commit("setAll", widgets);
                },
                get: function(context, widgetId) {
                    var dashboardId = context.rootGetters["countlyDashboards/selected"].id;

                    return countlyDashboards.service.widgets.get(dashboardId, widgetId).then(function(w) {
                        /*
                            Update the widget in the widget store.
                        */
                        context.commit("updateWidget", w && w[0]);
                    });
                },
                create: function(context, widget) {
                    var dashboardId = context.rootGetters["countlyDashboards/selected"].id;

                    return countlyDashboards.service.widgets.create(dashboardId, widget);
                },
                update: function(context, widget) {
                    var dashboardId = context.rootGetters["countlyDashboards/selected"].id;

                    return countlyDashboards.service.widgets.update(dashboardId, widget.id, widget).then(function() {
                        context.dispatch("get", widget.id);
                    });
                },
                updatePosition: function(context, params) {
                    var widget = {
                        id: params.id
                    };

                    if (!params.position && !params.size) {
                        return;
                    }

                    if (params.position) {
                        widget.position = params.position;
                    }

                    if (params.size) {
                        widget.size = params.size;
                    }

                    return context.dispatch("update", widget);
                },
                delete: function(context, widgetId) {
                    var dashboardId = context.rootGetters["countlyDashboards/selected"].id;

                    return countlyDashboards.service.widgets.delete(dashboardId, widgetId);
                }
            }
        });

        var getEmptyState = function() {
            return {
                all: [],
                selected: {
                    id: null,
                    data: null
                }
            };
        };

        var getters = {
            all: function(state) {
                return _.sortBy(state.all, "name");
            },
            selected: function(state) {
                return state.selected;
            }
        };

        var mutations = {
            setAll: function(state, dashboards) {
                state.all = dashboards;
            },
            setDashboard: function(state, dashboard) {
                state.selected = {
                    id: dashboard.id,
                    data: dashboard.data
                };
            },
            updateDashboard: function(state, dashboard) {
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
                });
            },
            getDashboard: function(context, params) {
                var dashboardId = context.getters.selected.id;

                countlyDashboards.service.dashboards.get(dashboardId, params && params.isRefresh).then(function(d) {
                    /*
                        On getting the dashboard, Set the selected dashboard data
                        aswell as update the local list of all dashboards.
                    */
                    context.commit("setDashboard", {id: dashboardId, data: d});
                    context.commit("updateDashboard", d);

                    /*
                        Set all widgets of this dashboard here in the vuex store - Start
                    */
                    context.dispatch("widgets/setAll", d && d.widgets || []);
                    /*
                        Set all widgets of this dashboard here in the vuex store - End
                    */

                    return d;
                });
            },
            setDashboard: function(context, data) {
                data = data || {};

                var dash = context.getters.all.find(function(dashboard) {
                    return dashboard._id === data.id;
                });

                context.commit("setDashboard", {id: data.id, data: dash});

                /*
                    Set all widgets of this dashboard here in the vuex store - Start
                */
                context.dispatch("widgets/setAll", dash && dash.widgets || []);
                /*
                    Set all widgets of this dashboard here in the vuex store - End
                */

                /*
                    We have already set the current dashboard and its widget data in the vuex store
                    But we will update it again after we have the updated data from the server
                    Until the request is processing, we will show the loading states for the widgets if no data is available
                */

                if (data.id) {
                    /*
                        data.id will be null when the dashboard is deleted.
                    */
                    context.dispatch("getDashboard");
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
                    /*
                        Dispatching getAll so that the list of dashboards in the sidebar gets updated.
                        This is required because we navigate the new dashboard after creating it.
                        And when we navigate, the sidebar component is not remounted as its already mounted.
                        Basically its out of the backbone render view.
                        However, the sidebar will react to the all getter whenever all state changes.

                        We could have also dispatched the setDashboard action here itself, but then
                        the url would not be updated in the browser. To update that we navigate the new url
                        resolved promise and that inturn sets the dashboard data automatically.
                    */

                    return context.dispatch("getAll").then(function() {
                        return id;
                    });
                });
            },
            update: function(context, settings) {
                var dashboardId = context.getters.selected.id;

                return countlyDashboards.service.dashboards.update(dashboardId, settings).then(function() {
                    context.dispatch("getDashboard");
                });
            },
            duplicate: function(context, settings) {
                settings.copyDashId = context.getters.selected.id;
                return context.dispatch("create", settings);
            },
            delete: function(context, id) {
                return countlyDashboards.service.dashboards.delete(id).then(function() {
                    context.dispatch("getAll").then(function() {
                        context.dispatch("setDashboard", {id: null, data: null});
                    });
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

})(window.countlyDashboards = window.countlyDashboards || {});