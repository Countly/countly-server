import countlyVue, { views } from '../../javascripts/countly/vue/core.js';
import { registerTab, registerData, tabsVuex } from '../../javascripts/countly/vue/container.js';
import app from '../../javascripts/countly/countly.template.js';

import OverviewView from './components/Overview.vue';
import UserAnalyticsView from './components/UserAnalytics.vue';
import GridComponent from './components/Widget.vue';
import DrawerComponent from './components/WidgetDrawer.vue';

var CV = countlyVue;

// Helper function to create BackboneWrapper for UserAnalytics
var getUserAnalyticsView = function() {
    var tabsVuexModules = tabsVuex(["/analytics/users"]);
    return new views.BackboneWrapper({
        component: UserAnalyticsView,
        vuex: tabsVuexModules,
        templates: []
    });
};

// Register routes
app.route("/analytics/users", "user-analytics", function() {
    var ViewWrapper = getUserAnalyticsView();
    this.renderWhenReady(ViewWrapper);
});

app.route("/analytics/users/*tab", "user-analytics-tab", function(tab) {
    var ViewWrapper = getUserAnalyticsView();
    var params = {
        tab: tab
    };
    ViewWrapper.params = params;
    this.renderWhenReady(ViewWrapper);
});

// Register dashboard widget
registerData("/custom/dashboards/widget", {
    type: "analytics",
    label: CV.i18n("user-analytics.overview-title"),
    priority: 1,
    primary: false,
    getter: function(widget) {
        var kk = widget.breakdowns || [];
        if (widget.widget_type === "analytics" && widget.data_type === "user-analytics" && (kk.length === 0 || kk[0] === 'overview' || (kk[0] !== "active" && kk[0] !== "online"))) {
            return true;
        }
        else {
            return false;
        }
    },
    templates: [],
    drawer: {
        component: DrawerComponent,
        getEmpty: function() {
            return {
                title: "",
                feature: "core",
                widget_type: "analytics",
                data_type: "user-analytics",
                app_count: 'single',
                metrics: [],
                apps: [],
                visualization: "",
                breakdowns: ['overview'],
                custom_period: null
            };
        },
        beforeLoadFn: function(/*doc, isEdited*/) {
        },
        beforeSaveFn: function(/*doc*/) {
        }
    },
    grid: {
        component: GridComponent,
        dimensions: function() {
            return {
                minWidth: 2,
                minHeight: 4,
                width: 2,
                height: 4
            };
        }
    }
});

// Register overview tab
registerTab("/analytics/users", {
    priority: 1,
    route: "#/analytics/users/overview",
    name: "overview",
    permission: "core",
    title: 'user-analytics.overview-title',
    component: OverviewView,
    vuex: []
});
