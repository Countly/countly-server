import { i18n, views } from '../../javascripts/countly/vue/core.js';
import { tabsVuex } from '../../javascripts/countly/vue/container.js';
import app from '../../javascripts/countly/countly.template.js';

import LogsMain from './components/LogsMain.vue';

/**
 * Get the logs main view wrapped for Backbone routing
 * @returns {Object} Backbone wrapper view
 */
var getLogsMainView = function() {
    var vuex = tabsVuex(["/manage/logs"]);
    return new views.BackboneWrapper({
        component: LogsMain,
        vuex: vuex,
        templates: []
    });
};

// Register routes
app.route("/manage/logs", "logs-tab", function() {
    var ViewWrapper = getLogsMainView();
    var params = {};
    ViewWrapper.params = params;
    this.renderWhenReady(ViewWrapper);
});

app.route("/manage/logs/*tab", "logs-tab", function(tab) {
    var ViewWrapper = getLogsMainView();
    var params = {
        tab: tab
    };
    ViewWrapper.params = params;
    this.renderWhenReady(ViewWrapper);
});

app.route("/manage/logs/*tab/*query", "logs-tab", function(tab, query) {
    var ViewWrapper = getLogsMainView();
    var params = {
        tab: tab,
        query: query
    };
    ViewWrapper.params = params;
    this.renderWhenReady(ViewWrapper);
});

// Add menu item
app.addMenu("management", {
    code: "logs",
    permission: "core",
    url: "#/manage/logs",
    text: i18n("sidebar.management.logs"),
    priority: 50,
    tabsPath: "/manage/logs"
});
