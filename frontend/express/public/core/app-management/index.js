import { views } from '../../javascripts/countly/vue/core.js';
import { validateAnyAppAdmin } from '../../javascripts/countly/countly.auth.js';
import countlyCommon from '../../javascripts/countly/countly.common.js';
import app from '../../javascripts/countly/countly.template.js';
import countlyAppManagement from './store/index.js';
import ManageAppsView from './components/ManageAppsView.vue';

import './assets/main.scss';

var getMainView = function() {
    return new views.BackboneWrapper({
        component: ManageAppsView,
        vuex: [{clyModel: countlyAppManagement}]
    });
};

if (validateAnyAppAdmin()) {
    app.route("/manage/apps", "manage-apps", function() {
        var view = getMainView();
        view.params = {app_id: countlyCommon.ACTIVE_APP_ID};
        this.renderWhenReady(view);
    });

    app.route("/manage/apps/:app_id", "manage-apps", function(app_id) {
        var view = getMainView();
        view.params = {app_id: app_id};
        this.renderWhenReady(view);
    });
}
