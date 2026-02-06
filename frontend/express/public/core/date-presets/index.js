import { views } from '../../javascripts/countly/vue/core.js';
import { validateCreate } from '../../javascripts/countly/countly.auth.js';
import app from '../../javascripts/countly/countly.template.js';

import PresetManagement from './components/PresetManagement.vue';
import PresetList from './components/PresetList.vue';
import store from './store/index.js';
import './stylesheets/_main.scss';

// Expose on window for legacy date.js (runs in virtual:legacy-concat scope).
window.countlyPresets = store;

// Register global component (used by date-picker.vue).
window.Vue.component("date-presets-list", PresetList);

// Backbone wrapper for routing.
var getManagementView = function() {
    return new views.BackboneWrapper({
        component: PresetManagement,
        vuex: [{clyModel: store}]
    });
};

// Register routes (only if user has create permission).
if (validateCreate('core')) {
    app.route("/manage/date-presets", "date-presets", function() {
        var PresetManagementView = getManagementView();
        this.renderWhenReady(PresetManagementView);
    });

    app.addMenu("management", {code: "presets", permission: "core", url: "#/manage/date-presets", text: "sidebar.management.presets", priority: 30});
}
