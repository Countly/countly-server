import countlyVue from '../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { app } from '../../../../frontend/express/public/javascripts/countly/countly.template.js';
import { countlyCommon } from '../../../../frontend/express/public/javascripts/countly/countly.common.js';
import { registerTab, registerData } from '../../../../frontend/express/public/javascripts/countly/vue/container.js';

import CompareEvents from './components/CompareEvents.vue';
import CompareApps from './components/CompareApps.vue';
import countlyCompareEvents from './store/countlyCompareEvents.js';
import countlyCompareApps from './store/countlyCompareApps.js';

import './assets/main.scss';

var FEATURE_NAME = "compare";

// Compare Events tab on /analytics/events
registerTab("/analytics/events", {
    priority: 2,
    name: "compare",
    permission: FEATURE_NAME,
    title: "Compare Events",
    component: CompareEvents,
    dataTestId: "compare-events",
    vuex: [{
        clyModel: countlyCompareEvents
    }]
});

// Compare Apps view
var getMainView = function() {
    return new countlyVue.views.BackboneWrapper({
        component: CompareApps,
        vuex: [{
            clyModel: countlyCompareApps
        }]
    });
};

app.route("/compare", "compare-apps", function() {
    var view = getMainView();
    view.params = {app_id: countlyCommon.ACTIVE_APP_ID};
    this.renderWhenReady(view);
});

registerData("/apps/compare", {
    enabled: {"default": true}
});

export { countlyCompareEvents, countlyCompareApps };
export default countlyCompareEvents;
