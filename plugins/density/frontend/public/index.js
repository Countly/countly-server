import { i18n } from '../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { registerTab } from '../../../../frontend/express/public/javascripts/countly/vue/container.js';

import './store/index.js';
import DensityView from './components/DensityView.vue';

import './assets/main.scss';

var FEATURE_NAME = "density";

registerTab("/analytics/technology", {
    priority: 7,
    name: "densities",
    permission: FEATURE_NAME,
    route: "#/analytics/technology/densities",
    title: i18n('density.title'),
    dataTestId: "technology-densities",
    component: DensityView
});
