import { i18n } from '../../javascripts/countly/vue/core.js';
import { registerTab } from '../../javascripts/countly/vue/container.js';

import SessionFrequencyView from './components/SessionFrequency.vue';
import store from './store/index.js';

// Register tab.
registerTab("/analytics/sessions", {
    priority: 3,
    name: "frequency",
    permission: "core",
    title: i18n('session-frequency.title'),
    route: "#/analytics/sessions/frequency",
    dataTestId: "session-frequency",
    component: SessionFrequencyView,
    vuex: [{
        clyModel: store
    }]
});
