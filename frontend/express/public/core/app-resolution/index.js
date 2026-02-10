import { i18n } from '../../javascripts/countly/vue/core.js';
import { registerTab } from '../../javascripts/countly/vue/container.js';

import AppResolutionView from './components/AppResolution.vue';
import './assets/main.scss';

// Register tab.
registerTab("/analytics/technology", {
    priority: 3,
    name: "resolutions",
    permission: "core",
    title: i18n('resolutions.title'),
    route: "#/analytics/technology/resolutions",
    dataTestId: "resolutions",
    component: AppResolutionView
});
