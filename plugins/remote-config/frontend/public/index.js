import moment from 'moment';
import { extend } from 'vee-validate';
import { app } from '../../../../frontend/express/public/javascripts/countly/countly.template.js';
import { views } from '../../../../frontend/express/public/javascripts/countly/vue/core.js';

import countlyRemoteConfig from './store/index.js';
import RemoteConfigMain from './components/RemoteConfigMain.vue';

import './assets/main.scss';

var FEATURE_NAME = "remote_config";

// --- VeeValidate rule ---

extend('oneDay', {
    validate: function(inpValue) {
        var valid = true;
        if (moment.duration(moment(inpValue).diff(moment())).asDays() < 1) {
            valid = false;
        }
        return {
            valid: valid,
        };
    },
});

// --- Routes ---

var getMainView = function() {
    var vuex = [
        {
            clyModel: countlyRemoteConfig
        }
    ];
    return new views.BackboneWrapper({
        component: RemoteConfigMain,
        vuex: vuex
    });
};

app.route("/remote-config", 'remote-config', function() {
    var mainView = getMainView();
    this.renderWhenReady(mainView);
});

app.route("/remote-config/*tab", 'remote-config-tab', function(tab) {
    var mainView = getMainView();
    var params = {
        tab: tab
    };
    mainView.params = params;
    this.renderWhenReady(mainView);
});

// --- Menu ---

app.addMenu("improve", {code: "remote-config", permission: FEATURE_NAME, pluginName: "remote-config", url: "#/remote-config", text: "sidebar.remote-config", icon: '<div class="logo"><i class="material-icons" style="transform:rotate(90deg)"> call_split </i></div>', priority: 30});
