import { i18n } from '../../javascripts/countly/vue/core.js';
import { registerTab } from '../../javascripts/countly/vue/container.js';

import SessionDurationsView from './components/SessionDurations.vue';
import store from './store/index.js';

// Register tab.
registerTab("/analytics/sessions", {
    priority: 2,
    name: "durations",
    permission: "core",
    title: i18n('session-durations.title'),
    route: "#/analytics/sessions/durations",
    dataTestId: "session-durations",
    component: SessionDurationsView,
    vuex: [{
        clyModel: store
    }]
});

// Add exports if needed for other plugins.