import { i18n } from '../../javascripts/countly/vue/core.js';
import { registerTab } from '../../javascripts/countly/vue/container.js';

import CarrierView from './components/CarrierView.vue';
import store from './store/index.js';
import './stylesheets/_main.scss';

// Register tab.
registerTab("/analytics/technology", {
    type: "mobile",
    priority: 5,
    name: "carriers",
    permission: "core",
    title: i18n('carriers.title'),
    route: "#/analytics/technology/carriers",
    dataTestId: "technology-carriers",
    component: CarrierView,
    vuex: [{
        clyModel: store
    }]
});
