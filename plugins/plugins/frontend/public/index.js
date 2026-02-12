import countlyVue from '../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { app } from '../../../../frontend/express/public/javascripts/countly/countly.template.js';
import countlyGlobal from '../../../../frontend/express/public/javascripts/countly/countly.global.js';
import { validateGlobalAdmin } from '../../../../frontend/express/public/javascripts/countly/countly.auth.js';
import { getGlobalStore } from '../../../../frontend/express/public/javascripts/countly/vue/data/store.js';
import jQuery from 'jquery';
import * as countlyPlugins from './store/index.js';
import * as configurationsView from './store/configurations.js';
import PluginsView from './components/PluginsView.vue';
import ConfigurationsView from './components/ConfigurationsView.vue';
import AccountView from './components/AccountView.vue';

import './assets/main.scss';

//backward-compat facade for legacy (non-ESM) callers. TODO: remove this after refactoring legacy code to use ESM imports
var store = getGlobalStore();
app.configurationsView = {
    registerInput(id, val) { store.commit('countlyConfigurations/registerInput', {id: id, value: val}); },
    registerLabel(id, val) { store.commit('countlyConfigurations/registerLabel', {id: id, value: val}); },
    registerStructure(id, val) { store.commit('countlyConfigurations/registerStructure', {id: id, value: val}); },
    registerUserInput(id, val) { store.commit('countlyConfigurations/registerUserInput', {id: id, value: val}); },
    getInputLabel(id) { return store.getters['countlyConfigurations/getInputLabel'](id); },
    getHelperLabel(id, ns) { return store.getters['countlyConfigurations/getHelperLabel'](id, ns); },
    getInputType(id) { return store.getters['countlyConfigurations/getInputType'](id); },
    get predefinedInputs() { return store.state.countlyConfigurations.predefinedInputs; },
    get predefinedLabels() { return store.state.countlyConfigurations.predefinedLabels; },
    get predefinedStructure() { return store.state.countlyConfigurations.predefinedStructure; },
    get predefinedUserInputs() { return store.state.countlyConfigurations.predefinedUserInputs; },
    getVuexModule: configurationsView.getVuexModule
};

var showInAppManagment = {
    "api": {
        "safe": true,
        "session_duration_limit": true,
        "country_data": true,
        "city_data": true,
        "event_limit": true,
        "event_segmentation_limit": true,
        "event_segmentation_value_limit": true,
        "metric_limit": true,
        "session_cooldown": true,
        "total_users": true,
        "prevent_duplicate_requests": true,
        "trim_trailing_ending_spaces": true
    }
};

var getPluginView = function() {
    return new countlyVue.views.BackboneWrapper({
        component: PluginsView,
        vuex: []
    });
};

var getConfigView = function() {
    return new countlyVue.views.BackboneWrapper({
        component: ConfigurationsView,
        vuex: [{clyModel: configurationsView}]
    });
};

var getAccountView = function() {
    return new countlyVue.views.BackboneWrapper({
        component: AccountView,
        vuex: [{clyModel: configurationsView}]
    });
};

if (validateGlobalAdmin()) {
    if (countlyGlobal.plugins.indexOf("drill") !== -1) {
        showInAppManagment.drill = {
            "big_list_limit": true,
            "record_big_list": true,
            "cache_threshold": true,
            "use_union_with": true,
            "correct_estimation": true,
            "custom_property_limit": true,
            "list_limit": true,
            "projection_limit": true,
            "record_actions": true,
            "record_crashes": true,
            "record_meta": true,
            "record_pushes": true,
            "record_pushes_sent": true,
            "record_sessions": true,
            "record_star_rating": true,
            "record_apm": true,
            "record_consent": true,
            "record_views": true
        };
    }
    if (countlyGlobal.plugins.includes("logger")) {
        showInAppManagment.logger = {"state": true, "limit": true};
    }

    app.route('/manage/plugins', 'plugins', function() {
        this.renderWhenReady(getPluginView());
    });

    app.route('/manage/configurations', 'configurations', function() {
        var view = getConfigView();
        view.params = {namespace: null, success: false};
        this.renderWhenReady(view);
    });

    app.route('/manage/configurations/:namespace', 'configurations_namespace', function(namespace) {
        var view = getConfigView();
        view.params = {namespace: namespace, success: false};
        this.renderWhenReady(view);
    });

    app.route('/manage/configurations/:namespace/:status', 'configurations_namespace', function(namespace, status) {
        var view = getConfigView();
        if (status === "success" && namespace !== "search") {
            view.params = {namespace: namespace, success: true};
            this.renderWhenReady(view);
        }
        if (namespace === "search") {
            view.params = {namespace, success: false, searchQuery: status};
            this.renderWhenReady(view);
        }
    });

    app.route('/manage/configurations/:namespace/:status/:success', 'configurations_namespace', function(namespace, status, success) {
        if (success === "success" && namespace === "search" && status !== "") {
            var view = getConfigView();
            view.params = {namespace, success: true, searchQuery: status};
            this.renderWhenReady(view);
        }
    });

    app.route('/manage/configurations/:namespace#:section', 'configurations_namespace', function(namespace, section) {
        var view = getConfigView();
        view.params = {namespace: namespace, section: section, success: false};
        this.renderWhenReady(view);
    });

    countlyPlugins.initializeConfigs().always(function() {
        var pluginsData = countlyPlugins.getConfigsData();
        var predefinedInputs = store.getters['countlyConfigurations/predefinedInputs'];
        for (var key in showInAppManagment) {
            var inputs = {};
            for (var conf in showInAppManagment[key]) {
                if (showInAppManagment[key][conf]) {
                    if (!predefinedInputs[key + "." + conf]) {
                        if (pluginsData[key]) {
                            var type = typeof pluginsData[key][conf];
                            if (type === "string") {
                                store.commit('countlyConfigurations/registerInput', {id: key + "." + conf, value: {input: "el-input", attrs: {}}});
                            }
                            else if (type === "number") {
                                store.commit('countlyConfigurations/registerInput', {id: key + "." + conf, value: {input: "el-input-number", attrs: {}}});
                            }
                            else if (type === "boolean") {
                                store.commit('countlyConfigurations/registerInput', {id: key + "." + conf, value: {input: "el-switch", attrs: {}}});
                            }
                        }
                    }
                    // Re-read after possible registration
                    predefinedInputs = store.getters['countlyConfigurations/predefinedInputs'];
                    if (predefinedInputs[key + "." + conf]) {
                        inputs[key + "." + conf] = predefinedInputs[key + "." + conf];
                    }
                }
            }
            app.addAppManagementInput(key, jQuery.i18n.map['configs.' + key], inputs);
        }
        store.commit('countlyConfigurations/registerInput', {id: "frontend.theme", value: {input: "el-select", attrs: {}, list: countlyPlugins.getThemeList()}});
    });
}

app.addAppManagementInput("allow_access_control_origin", jQuery.i18n.map["configs.access_control_origin"], {"allow_access_control_origin": {input: "el-input", attrs: {type: "textarea", rows: 5}}});

app.route('/account-settings', 'account-settings', function() {
    this.renderWhenReady(getAccountView());
});

app.route('/account-settings/reset', 'account-settings', function() {
    var view = getAccountView();
    view.params = {reset: true};
    this.renderWhenReady(view);
});

app.route('/account-settings/no-access', 'account-settings', function() {
    var view = getAccountView();
    view.params = {noaccess: true};
    this.renderWhenReady(view);
});

if (validateGlobalAdmin()) {
    if (!countlyGlobal.mycountly && countlyGlobal.plugins.indexOf('my-countly') === -1) {
        app.addMenu("management", {code: "plugins", pluginName: "plugins", url: "#/manage/plugins", text: "plugins.title", icon: '<div class="logo-icon fa fa-puzzle-piece"></div>', priority: 80});
    }
}
if (validateGlobalAdmin()) {
    app.addMenu("management", {code: "configurations", pluginName: "plugins", url: "#/manage/configurations", text: "plugins.configs", icon: '<div class="logo-icon ion-android-options"></div>', priority: 30});

    var isCurrentHostnameIP = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(window.location.hostname);
    var isGlobalDomainHasValue = countlyGlobal.domain === "" || typeof countlyGlobal.domain === "undefined" ? false : true;
    if (!isCurrentHostnameIP && !isGlobalDomainHasValue) {
        countlyPlugins.updateConfigs({"api": {"domain": window.location.protocol + "//" + window.location.hostname}}, function(err) {
            if (err) {
                // throw err
            }
        });
    }
}
