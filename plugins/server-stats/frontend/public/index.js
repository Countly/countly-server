import { app } from '../../../../frontend/express/public/javascripts/countly/countly.template.js';
import { views } from '../../../../frontend/express/public/javascripts/countly/vue/core.js';

import countlyDataPoints from './store/index.js';
import DataPointsView from './components/DataPointsView.vue';

import './assets/main.scss';

// --- Routes ---

var getMainView = function() {
    var vuex = [
        {
            clyModel: countlyDataPoints
        }
    ];
    return new views.BackboneWrapper({
        component: DataPointsView,
        vuex: vuex
    });
};

app.route("/manage/data-points", 'data-points', function() {
    var mainView = getMainView();
    this.renderWhenReady(mainView);
});

app.route("/manage/data-points/*id", 'data-points', function(id) {
    var mainView = getMainView();
    mainView.params = {appid: id};
    this.renderWhenReady(mainView);
});

// --- Menu ---

app.addMenu("management", {code: "data-point", permission: "server-stats", url: "#/manage/data-points", text: "server-stats.data-points", priority: 40});
