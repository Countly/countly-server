import { views } from '../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { app } from '../../../../frontend/express/public/javascripts/countly/countly.template.js';
import { getGlobalStore } from '../../../../frontend/express/public/javascripts/countly/vue/data/store.js';

import hooksPlugin from './store/index.js';
import HooksHomeView from './components/HooksHomeView.vue';
import HooksDetailView from './components/HooksDetailView.vue';

import './assets/main.scss';

var FEATURE_NAME = "hooks";

var getHooksView = function() {
    return new views.BackboneWrapper({
        component: HooksHomeView,
        vuex: [{
            clyModel: hooksPlugin
        }],
    });
};

var getHooksDetailView = function() {
    return new views.BackboneWrapper({
        component: HooksDetailView,
        vuex: [{
            clyModel: hooksPlugin
        }],
    });
};

app.route('/manage/hooks', 'hooks', function() {
    this.renderWhenReady(getHooksView());
});

app.route("/manage/hooks/:id", "hooks-detail", function(id) {
    var view = getHooksDetailView();
    view.params = {
        id: id
    };
    this.renderWhenReady(view);
});

app.addMenu("management", {code: "hooks", permission: FEATURE_NAME, url: "#/manage/hooks", text: "hooks.plugin-title", priority: 110});

getGlobalStore().commit('countlyConfigurations/registerLabel', {id: "hooks", value: "hooks.plugin-title"});
getGlobalStore().commit('countlyConfigurations/registerLabel', {id: "hooks.batchSize", value: "hooks.batch-size"});
