import { views } from '../../javascripts/countly/vue/core.js';
import { registerTab, tabsVuex } from '../../javascripts/countly/vue/container.js';
import app from '../../javascripts/countly/countly.template.js';
import countlyGlobal from '../../javascripts/countly/countly.global.js';
import * as CountlyHelpers from '../../javascripts/countly/countly.helpers.js';

import UserActivityView from './components/UserActivity.vue';
import UserLoyaltyView from './components/UserLoyalty.vue';
import store from './store/index.js';
import './stylesheets/_main.scss';

// Helper function to create BackboneWrapper for UserLoyalty
var getUserLoyaltyView = function() {
    var tabsVuexModules = tabsVuex(["/analytics/loyalty"]);
    var templates = [];
    if (countlyGlobal.plugins.indexOf("drill") !== -1) {
        templates.push("/drill/templates/query.builder.v2.html");
    }
    return new views.BackboneWrapper({
        component: UserLoyaltyView,
        vuex: tabsVuexModules,
        templates: templates
    });
};

// Register routes
app.route("/analytics/loyalty", "loyalty", function() {
    var userLoyaltyViewWrapper = getUserLoyaltyView();
    this.renderWhenReady(userLoyaltyViewWrapper);
});

app.route("/analytics/loyalty/*tab", "loyalty-tab", function(tab) {
    var userLoyaltyViewWrapper = getUserLoyaltyView();
    var params = {
        tab: tab,
    };
    userLoyaltyViewWrapper.params = params;
    this.renderWhenReady(userLoyaltyViewWrapper);
});

app.route("/analytics/loyalty/*tab/*query", "loyalty-tab", function(tab, query) {
    var userLoyaltyViewWrapper = getUserLoyaltyView();
    var params = {
        tab: tab,
    };
    var queryUrlParameter = query && CountlyHelpers.isJSON(query) ? JSON.parse(query) : undefined;
    if (queryUrlParameter) {
        params.query = queryUrlParameter;
    }
    userLoyaltyViewWrapper.params = params;
    this.renderWhenReady(userLoyaltyViewWrapper);
});

// Register user activity tab
registerTab("/analytics/loyalty", {
    priority: 1,
    name: "user-activity",
    permission: "core",
    title: 'user-activity.title',
    route: "#/analytics/loyalty/user-activity",
    dataTestId: "user-activity",
    component: UserActivityView,
    vuex: [{
        clyModel: store
    }],
});
