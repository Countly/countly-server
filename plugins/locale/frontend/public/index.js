import { i18n } from '../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { registerTab } from '../../../../frontend/express/public/javascripts/countly/vue/container.js';

import countlyLanguage from './store/index.js';
import LanguageView from './components/LanguageView.vue';

import './assets/main.scss';

var FEATURE_NAME = 'locale';

registerTab("/analytics/geo", {
    priority: 10,
    name: "languages",
    permission: FEATURE_NAME,
    title: i18n('sidebar.analytics.languages'),
    route: "#/analytics/geo/languages",
    component: LanguageView,
    dataTestId: "languages",
    vuex: [{
        clyModel: countlyLanguage
    }]
});
