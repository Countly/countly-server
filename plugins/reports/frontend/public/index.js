import { app } from '../../../../frontend/express/public/javascripts/countly/countly.template.js';
import { views } from '../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { registerData } from '../../../../frontend/express/public/javascripts/countly/vue/container.js';
import countlyGlobal from '../../../../frontend/express/public/javascripts/countly/countly.global.js';
import jQuery from 'jquery';

import countlyReporting, { reportsState } from './store/index.js';
import ReportsHomeView from './components/ReportsHomeView.vue';

import './assets/main.scss';

var FEATURE_NAME = "reports";

var reportsView = new views.BackboneWrapper({
    component: ReportsHomeView,
    vuex: [{ clyModel: countlyReporting }],
    templates: []
});
reportsView.featureName = FEATURE_NAME;

app.route('/manage/reports', 'reports', function() {
    this.renderWhenReady(reportsView);
});

app.route('/manage/reports/create/dashboard/:dashboardID', 'reports', function(dashboardID) {
    reportsState.createDashboard = dashboardID;
    this.renderWhenReady(reportsView);
});

app.addMenu("management", {code: "reports", permission: FEATURE_NAME, url: "#/manage/reports", text: "reports.title", priority: 90});

if (app.configurationsView) {
    app.configurationsView.registerLabel("reports", "reports.title");
    app.configurationsView.registerLabel("reports.secretKey", "reports.secretKey");
}

if (countlyGlobal.plugins.indexOf("dashboards") > -1) {
    registerData("/reports/data-type", {label: jQuery.i18n.map["dashboards.report"], value: 'dashboards'});
}

app.addReportsCallbacks = function(plugin, options) {
    if (!this.reportCallbacks) { this.reportCallbacks = {}; }
    this.reportCallbacks[plugin] = options;
};

app.getReportsCallbacks = function() {
    return this.reportCallbacks;
};
