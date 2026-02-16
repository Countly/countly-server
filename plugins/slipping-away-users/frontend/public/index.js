import { app } from '../../../../frontend/express/public/javascripts/countly/countly.template.js';
import { i18n } from '../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { registerTab } from '../../../../frontend/express/public/javascripts/countly/vue/container.js';

import SlippingAwayUsersView from './components/SlippingAwayUsersView.vue';
import countlySlippingAwayUsers from './store/index.js';

import './assets/main.scss';

var FEATURE_NAME = "slipping_away_users";

// --- Tab Registration ---

registerTab("/analytics/loyalty", {
    priority: 2,
    name: "slipping-away-users",
    permission: FEATURE_NAME,
    pluginName: "slipping-away-users",
    title: i18n('slipping-away-users.title'),
    route: "#/analytics/loyalty/slipping-away-users",
    dataTestId: "slipping-away",
    component: SlippingAwayUsersView,
    vuex: [{
        clyModel: countlySlippingAwayUsers
    }]
});

// --- Configuration Labels ---

if (app.configurationsView) {
    app.configurationsView.registerLabel("slipping-away-users", "slipping-away-users.config-title");
    app.configurationsView.registerLabel("slipping-away-users.p1", "slipping-away-users.config-first-threshold");
    app.configurationsView.registerLabel("slipping-away-users.p2", "slipping-away-users.config-second-threshold");
    app.configurationsView.registerLabel("slipping-away-users.p3", "slipping-away-users.config-third-threshold");
    app.configurationsView.registerLabel("slipping-away-users.p4", "slipping-away-users.config-fourth-threshold");
    app.configurationsView.registerLabel("slipping-away-users.p5", "slipping-away-users.config-fifth-threshold");
}
