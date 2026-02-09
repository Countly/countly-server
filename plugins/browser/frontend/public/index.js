import { i18n } from '../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { registerTab } from '../../../../frontend/express/public/javascripts/countly/vue/container.js';

import BrowserView from './components/BrowserView.vue';
import browserModel from './browser-model.js';
window.countlyBrowser = browserModel;

import './assets/main.scss';

const FEATURE_NAME = 'browser';

// Register tab under technology analytics.
// Note: This component uses the shared countlyDevicesAndTypes store from device-and-type plugin.
// The store is registered via device-and-type/javascripts/countly.models.js (legacy).
registerTab("/analytics/technology", {
    type: "web",
    priority: 6,
    name: "browsers",
    permission: FEATURE_NAME,
    route: "#/analytics/technology/browsers",
    title: i18n('browser.title'),
    dataTestId: "browser-analytics",
    component: BrowserView
});

// Export for other plugins that may need to extend browser analytics
export { BrowserView };