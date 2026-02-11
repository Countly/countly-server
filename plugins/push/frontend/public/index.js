import { app } from '../../../../frontend/express/public/javascripts/countly/countly.template.js';
import { i18n, views } from '../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { registerData } from '../../../../frontend/express/public/javascripts/countly/vue/container.js';
import { countlyCommon } from '../../../../frontend/express/public/javascripts/countly/countly.common.js';
import { isActiveAppMobile } from '../../../../frontend/express/public/javascripts/countly/countly.helpers.js';

import PushNotificationView from './components/PushNotificationView.vue';
import PushNotificationDetailsView from './components/PushNotificationDetailsView.vue';
import PushNotificationAppConfigView from './components/PushNotificationAppConfigView.vue';
import CreateMessageDropdownItemWrapper from './components/CreateMessageDropdownItemWrapper.vue';
import PushNotificationDrawerWrapper from './components/PushNotificationDrawerWrapper.vue';
import PushNotificationWidgetDrawer from './components/PushNotificationWidgetDrawer.vue';
import PushNotificationWidgetComponent from './components/PushNotificationWidgetComponent.vue';

import countlyPushNotification from './store/index.js';

import './assets/main.scss';

var featureName = 'push';

// --- Routes ---

var mainPushNotificationVuex = [{
    clyModel: countlyPushNotification.main
}, {
    clyModel: countlyPushNotification.dashboard
}];

var detailsPushNotificationVuex = [{
    clyModel: countlyPushNotification.details
}, {
    clyModel: countlyPushNotification.dashboard
}];

app.route('/messaging', 'messagingDashboardView', function() {
    if (!isActiveAppMobile()) {
        window.location.hash = "/";
        return;
    }
    var view = new views.BackboneWrapper({
        component: PushNotificationView,
        vuex: mainPushNotificationVuex,
    });
    this.renderWhenReady(view);
});

app.route('/messaging/details/*id', "messagingDetails", function(id) {
    if (!isActiveAppMobile()) {
        window.location.hash = "/";
        return;
    }
    var view = new views.BackboneWrapper({
        component: PushNotificationDetailsView,
        vuex: detailsPushNotificationVuex,
    });
    view.params = {
        id: id
    };
    this.renderWhenReady(view);
});

// --- Menu ---

app.addMenuForType("mobile", "reach", {code: "push", permission: featureName, url: "#/messaging", text: "push-notification.title", icon: '<div class="logo ion-chatbox-working"></div>', priority: 10});

// --- Configurations ---

if (app.configurationsView) {
    app.configurationsView.registerLabel("push", "push-notification.title");
    app.configurationsView.registerLabel("push.proxyhost", "push-notification.proxy-host");
    app.configurationsView.registerLabel("push.proxypass", "push-notification.proxy-password");
    app.configurationsView.registerLabel("push.proxyport", "push-notification.proxy-port");
    app.configurationsView.registerLabel("push.proxyuser", "push-notification.proxy-user");
}

// --- App Settings ---

registerData("/app/settings", {
    _id: "push",
    inputs: {},
    permission: featureName,
    title: i18n('push-notification.title'),
    component: PushNotificationAppConfigView
});

// --- Drill External Drawer ---

function getCreateNewMessageEventContainerData() {
    return {
        id: "createMessageDropdownItemWrapper",
        name: "createMessageDropdownItemWrapper",
        command: "CREATE_PUSH_NOTIFICATION",
        pluginName: "push",
        component: CreateMessageDropdownItemWrapper,
        click: function() {
            this.openDrawer("pushNotificationDrawer", {});
        }
    };
}

function getDrawerContainerData() {
    return {
        id: "pushNotificationDrawer",
        name: "pushNotificationDrawer",
        pluginName: "push",
        component: PushNotificationDrawerWrapper,
        type: countlyPushNotification.service.TypeEnum.ONE_TIME
    };
}

// Add push notification drawer to drill main view
registerData("/drill/external/events", getCreateNewMessageEventContainerData());
registerData("/drill/external/drawers", getDrawerContainerData());
registerData('/drill/external/drawers/data', countlyCommon.getExternalDrawerData('pushNotificationDrawer'), 'object');

// Add push notification drawer to user profiles main view
registerData("/users/external/events", getCreateNewMessageEventContainerData());
registerData("/users/external/drawers", getDrawerContainerData());
registerData('/users/external/drawers/data', countlyCommon.getExternalDrawerData('pushNotificationDrawer'), 'object');

// --- Custom Dashboard Widget ---

registerData('/custom/dashboards/widget', {
    type: 'push',
    label: i18n('push-notification.title'),
    priority: 6,
    pluginName: "push",
    primary: true,
    getter: function(widget) {
        return widget.widget_type === "push";
    },
    drawer: {
        component: PushNotificationWidgetDrawer,
        getEmpty: function() {
            return {
                title: "",
                feature: featureName,
                widget_type: "push",
                isPluginWidget: true,
                apps: [],
                app_count: 'single',
                visualization: "",
                metrics: [],
            };
        },
        beforeLoadFn: function() {},
        beforeSaveFn: function() {}
    },
    grid: {
        component: PushNotificationWidgetComponent
    }
});
