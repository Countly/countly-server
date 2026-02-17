import { app } from '../../../../frontend/express/public/javascripts/countly/countly.template.js';
import { views } from '../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { registerTab, registerData, tabsVuex } from '../../../../frontend/express/public/javascripts/countly/vue/container.js';

import countlySDKModule from './store/index.js';
import SDKMain from './components/SDKMain.vue';
import SDKConfigurationView from './components/SDKConfigurationView.vue';
import SDKStatsView from './components/SDKStatsView.vue';
import SDKRequestStatsView from './components/SDKRequestStatsView.vue';
import SDKHealthCheckView from './components/SDKHealthCheckView.vue';
import SDKWidget from './components/SDKWidget.vue';
import SDKWidgetDrawer from './components/SDKWidgetDrawer.vue';

import './assets/main.scss';

var FEATURE_NAME = "sdk";

// --- Routes ---

var getSDKMainView = function() {
    var tabsVuexData = tabsVuex(["/manage/sdk"]);
    return new views.BackboneWrapper({
        component: SDKMain,
        vuex: [{ clyModel: countlySDKModule }].concat(tabsVuexData),
        templates: []
    });
};

app.route("/manage/sdk", "sdk-tab", function() {
    var ViewWrapper = getSDKMainView();
    ViewWrapper.params = {};
    this.renderWhenReady(ViewWrapper);
});

app.route("/manage/sdk/*tab", "sdk-tab", function(tab) {
    var ViewWrapper = getSDKMainView();
    ViewWrapper.params = { tab: tab };
    this.renderWhenReady(ViewWrapper);
});

// --- Menu ---

app.addSubMenu("management", {code: "sdk", permission: FEATURE_NAME, url: "#/manage/sdk", text: "SDK Manager", priority: 50, tabsPath: "/manage/sdk"});

// --- Tab registrations ---

registerTab("/manage/sdk", {
    priority: 1,
    route: "#/manage/sdk/stats",
    component: SDKStatsView,
    title: "SDK Stats",
    name: "stats",
    permission: FEATURE_NAME,
    vuex: [
        {
            clyModel: countlySDKModule
        }
    ]
});

registerTab("/manage/sdk", {
    priority: 2,
    route: "#/manage/sdk/configurations",
    component: SDKConfigurationView,
    title: "SDK Behavior Settings",
    name: "configurations",
    permission: FEATURE_NAME,
    vuex: [
        {
            clyModel: countlySDKModule
        }
    ]
});

registerTab("/manage/sdk", {
    priority: 1,
    route: "#/manage/sdk/request_stats",
    component: SDKRequestStatsView,
    title: "Request Stats",
    name: "request_stats",
    permission: FEATURE_NAME,
    vuex: [
        {
            clyModel: countlySDKModule
        }
    ]
});

registerTab("/manage/sdk", {
    priority: 1,
    route: "#/manage/sdk/health_check",
    component: SDKHealthCheckView,
    title: "Health Check",
    name: "health_check",
    permission: FEATURE_NAME,
    vuex: [
        {
            clyModel: countlySDKModule
        }
    ]
});

// --- Dashboard Widget ---

registerData("/custom/dashboards/widget", {
    type: "sdk",
    label: "SDK Analytics",
    priority: 100,
    primary: true,
    getter: function(widget) {
        return widget.widget_type === "sdk";
    },
    drawer: {
        component: SDKWidgetDrawer,
        getEmpty: function() {
            return {
                title: "",
                feature: "sdk",
                widget_type: "sdk",
                data_type: "sdk",
                metrics: [],
                apps: [],
                selectedApp: "",
                visualization: "",
                displaytype: "",
                custom_period: null,
                selectedSDK: ""
            };
        },
        beforeLoadFn: function(doc, isEdited) {
            if (isEdited) {
                doc.selectedApp = doc.apps[0];
            }
        },
        beforeSaveFn: function(doc) {
            doc.apps = [doc.selectedApp];
            delete doc.selectedApp;
        }
    },
    grid: {
        component: SDKWidget,
        onClick: function() {}
    }
});
