import { i18n } from '../../javascripts/countly/vue/core.js';
import { registerTab } from '../../javascripts/countly/vue/container.js';

import PlatformView from './components/PlatformView.vue';
import './stylesheets/_main.scss';

// Register tab.
// Note: This plugin uses the shared countlyDevicesAndTypes store from device-and-type plugin.
registerTab("/analytics/technology", {
    priority: 1,
    name: "platforms",
    permission: "core",
    title: i18n('platforms.title'),
    route: "#/analytics/technology/platforms",
    dataTestId: "platforms",
    component: PlatformView
});
