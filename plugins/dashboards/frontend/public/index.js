import Vue from 'vue';
import { app } from '../../../../frontend/express/public/javascripts/countly/countly.template.js';
import { i18n, i18nM, views } from '../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { registerData, registerMixin } from '../../../../frontend/express/public/javascripts/countly/vue/container.js';

import countlyDashboards from './store/index.js';
window.countlyDashboards = countlyDashboards;

import './javascripts/screenfull.min.js';
import './assets/main.scss';

// Helper drawer components
import ClydMetric from './components/helpers/drawer/ClydMetric.vue';
import ClydDisplayType from './components/helpers/drawer/ClydDisplayType.vue';
import ClydBreakdown from './components/helpers/drawer/ClydBreakdown.vue';
import ClydEvent from './components/helpers/drawer/ClydEvent.vue';
import ClydDataType from './components/helpers/drawer/ClydDataType.vue';
import ClydAppCount from './components/helpers/drawer/ClydAppCount.vue';
import ClydSourceApps from './components/helpers/drawer/ClydSourceApps.vue';
import ClydVisualization from './components/helpers/drawer/ClydVisualization.vue';
import ClydTitle from './components/helpers/drawer/ClydTitle.vue';
import ClydPeriod from './components/helpers/drawer/ClydPeriod.vue';
import ClydColors from './components/helpers/drawer/ClydColors.vue';

// Helper widget components
import ClydBucket from './components/helpers/widget/ClydBucket.vue';
import ClydLegendPeriod from './components/helpers/widget/ClydLegendPeriod.vue';
import ClydPrimaryLegend from './components/helpers/widget/ClydPrimaryLegend.vue';
import ClydSecondaryLegend from './components/helpers/widget/ClydSecondaryLegend.vue';
import ClydTitleLabels from './components/helpers/widget/ClydTitleLabels.vue';
import ClydWidgetTitle from './components/helpers/widget/ClydWidgetTitle.vue';
import ClydWidgetApps from './components/helpers/widget/ClydWidgetApps.vue';

// View components
import HomeComponent from './components/HomeComponent.vue';
import DashboardsMenu from './components/DashboardsMenu.vue';

// Widget components
import AnalyticsWidget from './components/AnalyticsWidget.vue';
import AnalyticsDrawer from './components/AnalyticsDrawer.vue';
import EventsWidget from './components/EventsWidget.vue';
import EventsDrawer from './components/EventsDrawer.vue';
import NoteWidget from './components/NoteWidget.vue';
import NoteDrawer from './components/NoteDrawer.vue';

// Register 18 helper components globally
Vue.component("clyd-metric", ClydMetric);
Vue.component("clyd-display", ClydDisplayType);
Vue.component("clyd-breakdown", ClydBreakdown);
Vue.component("clyd-event", ClydEvent);
Vue.component("clyd-datatype", ClydDataType);
Vue.component("clyd-appcount", ClydAppCount);
Vue.component("clyd-sourceapps", ClydSourceApps);
Vue.component("clyd-visualization", ClydVisualization);
Vue.component("clyd-title", ClydTitle);
Vue.component("clyd-period", ClydPeriod);
Vue.component("clyd-colors", ClydColors);
Vue.component("clyd-bucket", ClydBucket);
Vue.component("clyd-legend-period", ClydLegendPeriod);
Vue.component("clyd-primary-legend", ClydPrimaryLegend);
Vue.component("clyd-secondary-legend", ClydSecondaryLegend);
Vue.component("clyd-title-labels", ClydTitleLabels);
Vue.component("clyd-widget-title", ClydWidgetTitle);
Vue.component("clyd-widget-apps", ClydWidgetApps);

// --- Widget Mixins (used by WidgetsMixin for __widgets computed) ---
import WidgetsMixin from './mixins/WidgetsMixin.js';

// --- Routes ---

var getMainView = function() {
    var vuex = [
        {
            clyModel: countlyDashboards
        }
    ];

    var templates = [];

    // Collect templates from external widget registrations (non-ESM plugins)
    var widgets = WidgetsMixin.computed.__widgets();

    for (var type in widgets) {
        for (var i = 0; i < widgets[type].length; i++) {
            var widget = widgets[type][i];

            if (Array.isArray(widget.templates)) {
                templates = templates.concat(widget.templates);
            }
        }
    }

    return new views.BackboneWrapper({
        component: HomeComponent,
        vuex: vuex,
        templates: templates
    });
};

app.route("/custom", '', function() {
    var mainView = getMainView();
    this.renderWhenReady(mainView);
});

app.route('/custom/*dashboardId', '', function(dashboardId) {
    var mainView = getMainView();
    var params = {
        dashboardId: dashboardId
    };

    mainView.params = params;
    this.renderWhenReady(mainView);
});

// --- Sidebar Menu ---

registerData("/sidebar/menu/main", {
    name: "dashboards",
    pluginName: "dashboards",
    icon: "cly-icon-sidebar-dashboards",
    tooltip: i18n("sidebar.dashboard-tooltip"),
    component: DashboardsMenu
});

// --- Export Features Mixin ---

registerMixin("/manage/export/export-features", {
    pluginName: "dashboards",
    beforeCreate: function() {
        var self = this;
        this.$store.dispatch("countlyDashboards/getAll", {just_schema: true}).then(function(res) {
            if (res) {
                var dashboards = [];

                res.forEach(function(dashboard) {
                    dashboards.push({
                        name: dashboard.name,
                        id: dashboard._id
                    });
                });

                if (dashboards.length) {
                    var selectItem = {
                        id: "dashboards",
                        name: "Dashboards",
                        children: dashboards
                    };

                    self.$store.dispatch("countlyConfigTransfer/addConfigurations", selectItem);
                }
            }
        });
    }
});

// --- Widget Type Registrations ---

registerData("/custom/dashboards/widget", {
    type: "analytics",
    label: i18nM("dashboards.widget-type.analytics"),
    priority: 1,
    primary: true,
    getter: function(widget) {
        return widget.widget_type === "analytics" && widget.data_type === "session";
    },
    drawer: {
        component: AnalyticsDrawer,
        getEmpty: function() {
            return {
                title: "",
                feature: "core",
                widget_type: "analytics",
                app_count: 'single',
                data_type: "session",
                metrics: [],
                apps: [],
                visualization: "",
                breakdowns: [],
                custom_period: null
            };
        },
        beforeSaveFn: function(doc) {
            if (["bar-chart", "table"].indexOf(doc.visualization) === -1) {
                delete doc.breakdowns;
            }
        }
    },
    grid: {
        component: AnalyticsWidget,
        onClick: function() {}
    }
});

registerData("/custom/dashboards/widget", {
    type: "events",
    label: i18nM("dashboards.widget-type.events"),
    priority: 2,
    primary: true,
    getter: function(widget) {
        return widget.widget_type === "events";
    },
    drawer: {
        component: EventsDrawer,
        getEmpty: function() {
            return {
                title: "",
                feature: "events",
                widget_type: "events",
                app_count: 'single',
                apps: [],
                visualization: "",
                events: [],
                metrics: [],
                breakdowns: [],
                custom_period: null
            };
        },
        beforeSaveFn: function(doc) {
            if (["bar-chart", "table"].indexOf(doc.visualization) === -1) {
                delete doc.breakdowns;
            }
        }
    },
    grid: {
        component: EventsWidget
    }
});

registerData("/custom/dashboards/widget", {
    type: "note",
    label: i18nM("dashboards.widget-type.note"),
    priority: 5,
    primary: true,
    getter: function(widget) {
        return widget.widget_type === "note";
    },
    drawer: {
        component: NoteDrawer,
        getEmpty: function() {
            return {
                widget_type: "note",
                feature: "core",
                apps: "*",
                contenthtml: "",
            };
        },
        beforeSaveFn: function() {
        }
    },
    grid: {
        component: NoteWidget,
        dimensions: function() {
            return {
                minWidth: 1,
                minHeight: 1,
                width: 1,
                height: 3
            };
        }
    }
});
