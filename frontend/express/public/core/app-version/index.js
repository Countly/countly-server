import { i18n } from '../../javascripts/countly/vue/core.js';
import { registerTab } from '../../javascripts/countly/vue/container.js';

import AppVersionView from './components/AppVersionView.vue';

// Register tab under technology analytics.
// Note: This component uses the shared countlyDevicesAndTypes store from device-and-type plugin.
// The store is registered via device-and-type/javascripts/countly.models.js (legacy).
registerTab("/analytics/technology", {
    priority: 4,
    name: "versions",
    permission: "core",
    title: i18n('app-versions.title'),
    route: "#/analytics/technology/versions",
    dataTestId: "technology-versions",
    component: AppVersionView
});
