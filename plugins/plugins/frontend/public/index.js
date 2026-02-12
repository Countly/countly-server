import countlyVue from '../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { i18n } from '../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { app } from '../../../../frontend/express/public/javascripts/countly/countly.template.js';
import { countlyCommon } from '../../../../frontend/express/public/javascripts/countly/countly.common.js';
import countlyGlobal from '../../../../frontend/express/public/javascripts/countly/countly.global.js';
import { validateGlobalAdmin } from '../../../../frontend/express/public/javascripts/countly/countly.auth.js';
import { notify } from '../../../../frontend/express/public/javascripts/countly/countly.helpers.js';
import jQuery from 'jquery';
import * as countlyPlugins from './store/index.js';
import PluginsView from './components/PluginsView.vue';
import ConfigurationsView from './components/ConfigurationsView.vue';
import AccountView from './components/AccountView.vue';

import './assets/main.scss';

//old global handler
app.configurationsView = {
    predefinedInputs: {},
    predefinedLabels: {},
    predefinedStructure: {},
    predefinedUserInputs: {},
    registerInput: function(id, callback) {
        this.predefinedInputs[id] = callback;
    },
    registerLabel: function(id, html) {
        this.predefinedLabels[id] = html;
    },
    registerStructure: function(id, obj) {
        this.predefinedStructure[id] = obj;
    },
    registerUserInput: function(id, getVal) {
        this.predefinedUserInputs[id] = getVal;
    },
    getInputLabel: function(id) {
        if (typeof this.predefinedLabels[id] !== "undefined") {
            return jQuery.i18n.map[this.predefinedLabels[id]] || this.predefinedLabels[id];
        }
        else if (jQuery.i18n.map[id + ".title"]) {
            return jQuery.i18n.map[id + ".title"];
        }
        else if (jQuery.i18n.map[id + ".plugin-title"]) {
            return jQuery.i18n.map[id + ".plugin-title"];
        }
        else if (jQuery.i18n.map["configs." + id]) {
            return jQuery.i18n.map["configs." + id];
        }
        else if (jQuery.i18n.map["configs." + (id).replace(".", "-")]) {
            return jQuery.i18n.map["configs." + (id).replace(".", "-")];
        }
        else if (jQuery.i18n.map[id]) {
            return jQuery.i18n.map[id];
        }
        else if (jQuery.i18n.map[(id).replace(".", "-")]) {
            return jQuery.i18n.map[(id).replace(".", "-")];
        }
        else {
            return id;
        }
    },
    getHelperLabel: function(id, ns) {
        if (id === "__user") {
            return jQuery.i18n.map["configs.help.user-level-configuration"];
        }
        else if (jQuery.i18n.map["configs.help." + ns + "." + id]) {
            return jQuery.i18n.map["configs.help." + ns + "." + id];
        }
        else if (jQuery.i18n.map["configs.help." + (ns + "." + id).replace(".", "-")]) {
            return jQuery.i18n.map["configs.help." + (ns + "." + id).replace(".", "-")];
        }
        else if (this.predefinedInputs[ns + "." + id] && this.predefinedInputs[ns + "." + id].helper) {
            return jQuery.i18n.map[this.predefinedInputs[ns + "." + id].helper] || this.predefinedInputs[ns + "." + id].helper;
        }
    },
    getInputType: function(id) {
        var input = this.predefinedInputs[id];
        if (typeof input === "function") {
            return "function";
        }
        if (input && input.input) {
            return input.input;
        }
    }
};

//register inputs
var zones = countlyGlobal.timezones;
var countryList = [];
for (var z in zones) {
    countryList.push({value: z, label: zones[z].n});
}
app.configurationsView.registerInput("apps.country", {input: "el-select", attrs: {}, list: countryList});

app.configurationsView.registerInput("logs.default", {
    input: "el-select",
    attrs: {},
    list: [
        {value: 'debug', label: i18n("configs.logs.debug")},
        {value: 'info', label: i18n("configs.logs.info")},
        {value: 'warn', label: i18n("configs.logs.warn")},
        {value: 'error', label: i18n("configs.logs.error")}
    ]
});

app.configurationsView.registerInput("security.dashboard_additional_headers", {input: "el-input", attrs: {type: "textarea", rows: 5}});

app.configurationsView.registerInput("security.robotstxt", {input: "el-input", attrs: {type: "textarea", rows: 5}});

app.configurationsView.registerInput("security.api_additional_headers", {input: "el-input", attrs: {type: "textarea", rows: 5}});

app.configurationsView.registerInput("security.proxy_hostname", {input: "el-input", attrs: {type: "textarea", rows: 1}});

app.configurationsView.registerInput("security.proxy_port", {input: "el-input", attrs: {type: "textarea", rows: 1}});

app.configurationsView.registerInput("security.proxy_username", {input: "el-input", attrs: {type: "textarea", rows: 1}});

app.configurationsView.registerInput("security.proxy_password", {input: "el-input", attrs: {type: "textarea", rows: 1}});

app.configurationsView.registerInput("api.reports_regenerate_interval", {
    input: "el-select",
    attrs: {},
    list: [
        {value: 300, label: jQuery.i18n.prop("common.every.minutes", 5)},
        {value: 1800, label: jQuery.i18n.prop("common.every.minutes", 30)},
        {value: 3600, label: jQuery.i18n.prop("common.every.hour", 1)},
        {value: 10800, label: jQuery.i18n.prop("common.every.hours", 3)},
        {value: 43200, label: jQuery.i18n.prop("common.every.hours", 12)},
        {value: 86400, label: jQuery.i18n.prop("common.every.hours", 24)}
    ]
});

app.configurationsView.registerInput("api.send_test_email", {
    input: "el-button",
    label: jQuery.i18n.map['common.send'],
    attrs: {type: "primary", disabled: false},
    click: function() {
        this.attrs.disabled = true;
        var self = this;
        jQuery.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/o/email_test",
            data: {},
            success: function() {
                self.attrs.disabled = false;
                notify({ type: "ok", message: jQuery.i18n.map['configs.help.api-send_test_email_delivered']});
            },
            error: function() {
                self.attrs.disabled = false;
                notify({ type: "error", message: jQuery.i18n.map['configs.help.api-send_test_email_failed']});
            }
        });
    }
});

var appList = [{value: "", label: jQuery.i18n.map["configs.tracking.self_tracking.none"]}];
for (var a in countlyGlobal.apps) {
    appList.push({value: countlyGlobal.apps[a].key, label: countlyGlobal.apps[a].name});
}

app.configurationsView.registerInput("tracking.self_tracking_app", {
    input: "el-select",
    attrs: {},
    list: appList
});

var idList = [{value: "_id", label: "_id"}, {value: "email", label: "email"}];

app.configurationsView.registerInput("tracking.self_tracking_id_policy", {
    input: "el-select",
    attrs: {},
    list: idList
});

app.configurationsView.registerStructure("api", {
    description: "configs.api.description",
    groups: [
        {label: "configs.api.batch", list: ["batch_processing", "batch_period", "batch_on_master", "user_merge_paralel"]},
        {label: "configs.api.cache", list: ["batch_read_processing", "batch_read_period", "batch_read_ttl", "batch_read_on_master"]},
        {label: "configs.api.limits", list: ["event_limit", "event_segmentation_limit", "event_segmentation_value_limit", "metric_limit", "session_duration_limit", "array_list_limit"]},
        {label: "configs.api.others", list: ["safe", "domain", "export_limit", "offline_mode", "reports_regenerate_interval", "request_threshold", "sync_plugins", "send_test_email", "city_data", "country_data", "session_cooldown", "total_users", "prevent_duplicate_requests", "data_retention_period", "trim_trailing_ending_spaces"]},
    ]
});

app.configurationsView.registerStructure("tracking", {
    description: "configs.tracking.description",
    groups: [
        {label: "configs.tracking.self_tracking", list: ["self_tracking_app", "self_tracking_url", "self_tracking_app_key", "self_tracking_id_policy", "self_tracking_sessions", "self_tracking_events", "self_tracking_crashes", "self_tracking_views", "self_tracking_feedback", "self_tracking_user_details"]},
        {label: "configs.tracking.user", list: ["user_sessions", "user_events", "user_crashes", "user_views", "user_feedback", "user_details"]},
        {label: "configs.tracking.server", list: ["server_sessions", "server_events", "server_crashes", "server_views", "server_feedback", "server_user_details"]},
    ]
});

app.configurationsView.registerStructure("logs", {
    description: "",
    groups: [
        {label: "configs.logs.modules", list: ["debug", "warn", "info", "error"]},
        {label: "configs.logs.default-level", list: ["default"]}
    ]
});

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
        vuex: []
    });
};

var getAccountView = function() {
    return new countlyVue.views.BackboneWrapper({
        component: AccountView,
        vuex: []
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
        for (var key in showInAppManagment) {
            var inputs = {};
            for (var conf in showInAppManagment[key]) {
                if (showInAppManagment[key][conf]) {
                    if (!app.configurationsView.predefinedInputs[key + "." + conf]) {
                        if (pluginsData[key]) {
                            var type = typeof pluginsData[key][conf];
                            if (type === "string") {
                                app.configurationsView.registerInput(key + "." + conf, {input: "el-input", attrs: {}});
                            }
                            else if (type === "number") {
                                app.configurationsView.registerInput(key + "." + conf, {input: "el-input-number", attrs: {}});
                            }
                            else if (type === "boolean") {
                                app.configurationsView.registerInput(key + "." + conf, {input: "el-switch", attrs: {}});
                            }
                        }
                    }
                    if (app.configurationsView.predefinedInputs[key + "." + conf]) {
                        inputs[key + "." + conf] = app.configurationsView.predefinedInputs[key + "." + conf];
                    }
                }
            }
            app.addAppManagementInput(key, jQuery.i18n.map['configs.' + key], inputs);
        }
        app.configurationsView.registerInput("frontend.theme", {input: "el-select", attrs: {}, list: countlyPlugins.getThemeList()});
    });
}

if (app.configurationsView) {
    app.configurationsView.registerLabel("allow_access_control_origin", jQuery.i18n.map["configs.allow_access_control_origin"]);
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
