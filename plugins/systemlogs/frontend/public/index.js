import { app } from '../../../../frontend/express/public/javascripts/countly/countly.template.js';
import { registerTab } from '../../../../frontend/express/public/javascripts/countly/vue/container.js';
import { validateGlobalAdmin } from '../../../../frontend/express/public/javascripts/countly/countly.auth.js';

import SystemLogsView from './components/SystemLogsView.vue';

import './assets/main.scss';

var FEATURE_NAME = "systemlogs";

// --- Tab Registration ---

if (validateGlobalAdmin()) {
    registerTab("/manage/logs", {
        priority: 2,
        route: "#/manage/logs/systemlogs",
        component: SystemLogsView,
        title: "Audit Logs",
        name: "systemlogs",
        permission: FEATURE_NAME,
        vuex: []
    });

    app.addRefreshScript("/manage/compliance#", function() {
        if (app.activeView.dtableactionlogs) {
            app.activeView.dtableactionlogs.fnDraw(false);
        }
    });
}
