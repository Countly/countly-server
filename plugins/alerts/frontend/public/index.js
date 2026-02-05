import countlyVue from '../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { app } from '../../../../frontend/express/public/javascripts/countly/countly.template.js';

import AlertsHome from './components/AlertsHome.vue';
import countlyAlerts from './store/index.js';

const ALERTS_FEATURE_NAME = "alerts";

// Create the view wrapper with Vuex store
const alertsView = new countlyVue.views.BackboneWrapper({
    component: AlertsHome,
    vuex: [
        {
            clyModel: countlyAlerts,
        },
    ],
});

alertsView.featureName = ALERTS_FEATURE_NAME;

// Register route
app.route("/manage/alerts", "alerts", function() {
    this.renderWhenReady(alertsView);
});

// Add menu item
app.addMenu("management", {
    code: "alerts",
    permission: ALERTS_FEATURE_NAME,
    url: "#/manage/alerts",
    text: "alert.plugin-title",
    priority: 100,
});

import "./assets/main.scss";

// Export for other plugins that may need to extend alerts
export { countlyAlerts, AlertsHome };
export default countlyAlerts;