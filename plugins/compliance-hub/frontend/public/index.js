import { app } from '../../../../frontend/express/public/javascripts/countly/countly.template.js';
import { registerTab } from '../../../../frontend/express/public/javascripts/countly/vue/container.js';
import { i18n, views } from '../../../../frontend/express/public/javascripts/countly/vue/core.js';

import ComplianceMain from './components/ComplianceMain.vue';
import UserConsentHistory from './components/UserConsentHistory.vue';
import countlyConsentManager from './store/index.js';

import './assets/main.scss';

var FEATURE_NAME = "compliance_hub";

var getMainView = function() {
    var vuex = [{
        clyModel: countlyConsentManager
    }];

    return new views.BackboneWrapper({
        component: ComplianceMain,
        vuex: vuex,
    });
};

app.route("/manage/compliance/", 'compliance', function() {
    var renderedView = getMainView();
    this.renderWhenReady(renderedView);
});

app.route("/manage/compliance/*tab", 'compliance-tab', function(tab) {
    var renderedView = getMainView();
    var params = {
        tab: tab
    };
    renderedView.params = params;
    this.renderWhenReady(renderedView);
});

app.route("/manage/compliance/*tab/*uid", 'compliance-tab-uid', function(tab, uid) {
    var renderedView = getMainView();
    var params = {
        tab: tab,
        uid: uid
    };
    renderedView.params = params;
    this.renderWhenReady(renderedView);
});

registerTab("/users/tabs", {
    priority: 3,
    title: i18n("consent.title"),
    name: 'Consent',
    pluginName: "compliance-hub",
    permission: FEATURE_NAME,
    component: UserConsentHistory,
    vuex: [{
        clyModel: countlyConsentManager
    }],
});

app.addSubMenu("management", {
    code: "compliance",
    permission: FEATURE_NAME,
    pluginName: "compliance-hub",
    url: "#/manage/compliance/",
    text: "compliance_hub.title",
    priority: 60
});
