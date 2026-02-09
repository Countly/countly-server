import { i18n, views } from '../../javascripts/countly/vue/core.js';
import { registerTab, tabsVuex } from '../../javascripts/countly/vue/container.js';
import app from '../../javascripts/countly/countly.template.js';

import HealthManagerView from './components/HealthManagerView.vue';
import MutationStatusView from './components/MutationStatusView.vue';
import AggregatorStatusView from './components/AggregatorStatusView.vue';
import IngestionStatusView from './components/IngestionStatusView.vue';
import './stylesheets/_main.scss';

// Register tabs.
registerTab("/manage/health", {
    priority: 1,
    name: "mutation-status",
    permission: "core",
    title: i18n('health-manager.tabs.mutation'),
    route: "#/manage/health/mutation-status",
    dataTestId: "health-manager-mutation-status",
    component: MutationStatusView,
    tooltip: i18n('mutation-status.overview.tooltip')
});

registerTab("/manage/health", {
    priority: 2,
    name: "aggregator-status",
    permission: "core",
    title: i18n('health-manager.tabs.aggregator'),
    route: "#/manage/health/aggregator-status",
    dataTestId: "health-manager-aggregator-status",
    component: AggregatorStatusView,
    tooltip: i18n('aggregator-status.overview.tooltip')
});

registerTab("/manage/health", {
    priority: 3,
    name: "ingestion-status",
    permission: "core",
    title: 'Ingestion Status',
    route: "#/manage/health/ingestion-status",
    dataTestId: "health-manager-ingestion-status",
    component: IngestionStatusView,
    tooltip: 'Monitor Kafka producer and ClickHouse sink health'
});

// Backbone wrapper for routing.
var getHealthManagerView = function() {
    var vuex = tabsVuex(["/manage/health"]);
    return new views.BackboneWrapper({
        component: HealthManagerView,
        vuex: vuex,
        templates: []
    });
};

// Register routes.
app.route("/manage/health", "health-manager", function() {
    var ViewWrapper = getHealthManagerView();
    var params = {};
    ViewWrapper.params = params;
    this.renderWhenReady(ViewWrapper);
});

app.route("/manage/health/*tab", "health-manager-tab", function(tab) {
    var ViewWrapper = getHealthManagerView();
    var params = {
        tab: tab
    };
    ViewWrapper.params = params;
    this.renderWhenReady(ViewWrapper);
});

app.route("/manage/health/*tab/*query", "health-manager-tab", function(tab, query) {
    var ViewWrapper = getHealthManagerView();
    var params = {
        tab: tab,
        query: query
    };
    ViewWrapper.params = params;
    this.renderWhenReady(ViewWrapper);
});

// Add menu item.
app.addMenu("management", {
    code: "health-manager",
    permission: "core",
    url: "#/manage/health",
    text: i18n('sidebar.management.health-manager'),
    priority: 85,
    tabsPath: "/manage/health"
});
