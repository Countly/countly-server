import { i18n, views } from '../../javascripts/countly/vue/core.js';
import { registerTab, registerData, tabsVuex } from '../../javascripts/countly/vue/container.js';
import app from '../../javascripts/countly/countly.template.js';

import SessionOverviewView from './components/SessionOverview.vue';
import SessionAnalyticsView from './components/SessionAnalytics.vue';
import SessionsHomeWidget from './components/SessionsHomeWidget.vue';
import store from './store/index.js';

// Helper function to create BackboneWrapper for SessionAnalytics
var getSessionAnalyticsView = function() {
    var tabsVuexModules = tabsVuex(["/analytics/sessions"]);
    return new views.BackboneWrapper({
        component: SessionAnalyticsView,
        vuex: tabsVuexModules,
        templates: []
    });
};

// Register routes
app.route("/analytics/sessions", "sessions", function() {
    var sessionAnalyticsViewWrapper = getSessionAnalyticsView();
    this.renderWhenReady(sessionAnalyticsViewWrapper);
});

app.route("/analytics/sessions/*tab", "sessions-tab", function(tab) {
    var sessionAnalyticsViewWrapper = getSessionAnalyticsView();
    var params = {
        tab: tab
    };
    sessionAnalyticsViewWrapper.params = params;
    this.renderWhenReady(sessionAnalyticsViewWrapper);
});

// Register session overview tab
registerTab("/analytics/sessions", {
    priority: 1,
    name: "overview",
    permission: "core",
    title: i18n('session-overview.title'),
    route: "#/analytics/sessions/overview",
    dataTestId: "session-overview",
    component: SessionOverviewView,
    vuex: [{
        clyModel: store
    }]
});

// Register sessions home widget
registerData("/home/widgets", {
    _id: "sessions-dashboard-widget",
    permission: "core",
    label: i18n('dashboard.audience'),
    enabled: {"default": true},
    available: {"default": true},
    order: 0,
    placeBeforeDatePicker: false,
    component: SessionsHomeWidget,
});
