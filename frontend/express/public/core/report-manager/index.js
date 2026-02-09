import { views } from '../../javascripts/countly/vue/core.js';
import app from '../../javascripts/countly/countly.template.js';
import * as countlyAuth from '../../javascripts/countly/countly.auth.js';

import ReportManagerView from './components/ReportManagerView.vue';

var getMainView = function() {
    return new views.BackboneWrapper({
        component: ReportManagerView,
    });
};

app.route("/manage/tasks", "manageJobs", function() {
    if (countlyAuth.validateRead("reports")) {
        this.renderWhenReady(getMainView());
    }
    else {
        app.navigate("/", true);
    }
});
