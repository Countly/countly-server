import jQuery from 'jquery';
import { registerTab } from '../../../../frontend/express/public/javascripts/countly/vue/container.js';
import { validateGlobalAdmin } from '../../../../frontend/express/public/javascripts/countly/countly.auth.js';

import ErrorLogsView from './components/ErrorLogsView.vue';

import './assets/main.scss';

var FEATURE_NAME = "errorlogs";

if (validateGlobalAdmin()) {
    registerTab("/manage/logs", {
        priority: 1,
        route: "#/manage/logs/errorlogs",
        component: ErrorLogsView,
        title: jQuery.i18n.map["errorlogs.server-logs"] || "Server Logs",
        name: "errorlogs",
        permission: FEATURE_NAME,
        vuex: []
    });
}
