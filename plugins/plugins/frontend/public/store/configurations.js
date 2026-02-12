import jQuery from 'jquery';
import { i18n } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import countlyGlobal from '../../../../../frontend/express/public/javascripts/countly/countly.global.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import { notify } from '../../../../../frontend/express/public/javascripts/countly/countly.helpers.js';
import { Module } from '../../../../../frontend/express/public/javascripts/countly/vue/data/vuex.js';
import { registerGlobally } from '../../../../../frontend/express/public/javascripts/countly/vue/data/store.js';

// --- Build default state from static registrations (previously in index.js) ---

const zones = countlyGlobal.timezones;
const countryList = [];
for (let z in zones) {
    countryList.push({value: z, label: zones[z].n});
}

const appList = [{value: "", label: jQuery.i18n.map["configs.tracking.self_tracking.none"]}];
for (let a in countlyGlobal.apps) {
    appList.push({value: countlyGlobal.apps[a].key, label: countlyGlobal.apps[a].name});
}

// --- Vuex module ---

let _vuexModule = null;

export function getVuexModule() {
    if (_vuexModule) {
        return _vuexModule;
    }

    _vuexModule = Module("countlyConfigurations", {
        state() {
            return {
                predefinedInputs: {
                    "apps.country": {input: "el-select", attrs: {}, list: countryList},
                    "logs.default": {
                        input: "el-select",
                        attrs: {},
                        list: [
                            {value: 'debug', label: i18n("configs.logs.debug")},
                            {value: 'info', label: i18n("configs.logs.info")},
                            {value: 'warn', label: i18n("configs.logs.warn")},
                            {value: 'error', label: i18n("configs.logs.error")}
                        ]
                    },
                    "security.dashboard_additional_headers": {input: "el-input", attrs: {type: "textarea", rows: 5}},
                    "security.robotstxt": {input: "el-input", attrs: {type: "textarea", rows: 5}},
                    "security.api_additional_headers": {input: "el-input", attrs: {type: "textarea", rows: 5}},
                    "security.proxy_hostname": {input: "el-input", attrs: {type: "textarea", rows: 1}},
                    "security.proxy_port": {input: "el-input", attrs: {type: "textarea", rows: 1}},
                    "security.proxy_username": {input: "el-input", attrs: {type: "textarea", rows: 1}},
                    "security.proxy_password": {input: "el-input", attrs: {type: "textarea", rows: 1}},
                    "api.reports_regenerate_interval": {
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
                    },
                    "api.send_test_email": {
                        input: "el-button",
                        label: jQuery.i18n.map['common.send'],
                        attrs: {type: "primary", disabled: false},
                        click() {
                            this.attrs.disabled = true;
                            const self = this;
                            jQuery.ajax({
                                type: "GET",
                                url: countlyCommon.API_URL + "/o/email_test",
                                data: {},
                                success() {
                                    self.attrs.disabled = false;
                                    notify({ type: "ok", message: jQuery.i18n.map['configs.help.api-send_test_email_delivered']});
                                },
                                error() {
                                    self.attrs.disabled = false;
                                    notify({ type: "error", message: jQuery.i18n.map['configs.help.api-send_test_email_failed']});
                                }
                            });
                        }
                    },
                    "tracking.self_tracking_app": {
                        input: "el-select",
                        attrs: {},
                        list: appList
                    },
                    "tracking.self_tracking_id_policy": {
                        input: "el-select",
                        attrs: {},
                        list: [{value: "_id", label: "_id"}, {value: "email", label: "email"}]
                    }
                },
                predefinedLabels: {
                    "allow_access_control_origin": jQuery.i18n.map["configs.allow_access_control_origin"]
                },
                predefinedStructure: {
                    "api": {
                        description: "configs.api.description",
                        groups: [
                            {label: "configs.api.batch", list: ["batch_processing", "batch_period", "batch_on_master", "user_merge_paralel"]},
                            {label: "configs.api.cache", list: ["batch_read_processing", "batch_read_period", "batch_read_ttl", "batch_read_on_master"]},
                            {label: "configs.api.limits", list: ["event_limit", "event_segmentation_limit", "event_segmentation_value_limit", "metric_limit", "session_duration_limit", "array_list_limit"]},
                            {label: "configs.api.others", list: ["safe", "domain", "export_limit", "offline_mode", "reports_regenerate_interval", "request_threshold", "sync_plugins", "send_test_email", "city_data", "country_data", "session_cooldown", "total_users", "prevent_duplicate_requests", "data_retention_period", "trim_trailing_ending_spaces"]},
                        ]
                    },
                    "tracking": {
                        description: "configs.tracking.description",
                        groups: [
                            {label: "configs.tracking.self_tracking", list: ["self_tracking_app", "self_tracking_url", "self_tracking_app_key", "self_tracking_id_policy", "self_tracking_sessions", "self_tracking_events", "self_tracking_crashes", "self_tracking_views", "self_tracking_feedback", "self_tracking_user_details"]},
                            {label: "configs.tracking.user", list: ["user_sessions", "user_events", "user_crashes", "user_views", "user_feedback", "user_details"]},
                            {label: "configs.tracking.server", list: ["server_sessions", "server_events", "server_crashes", "server_views", "server_feedback", "server_user_details"]},
                        ]
                    },
                    "logs": {
                        description: "",
                        groups: [
                            {label: "configs.logs.modules", list: ["debug", "warn", "info", "error"]},
                            {label: "configs.logs.default-level", list: ["default"]}
                        ]
                    }
                },
                predefinedUserInputs: {}
            };
        },
        getters: {
            predefinedInputs(state) {
                return state.predefinedInputs;
            },
            predefinedLabels(state) {
                return state.predefinedLabels;
            },
            predefinedStructure(state) {
                return state.predefinedStructure;
            },
            predefinedUserInputs(state) {
                return state.predefinedUserInputs;
            },
            getInputLabel(state) {
                return function(id) {
                    if (typeof state.predefinedLabels[id] !== "undefined") {
                        return jQuery.i18n.map[state.predefinedLabels[id]] || state.predefinedLabels[id];
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
                };
            },
            getHelperLabel(state) {
                return function(id, ns) {
                    if (id === "__user") {
                        return jQuery.i18n.map["configs.help.user-level-configuration"];
                    }
                    else if (jQuery.i18n.map["configs.help." + ns + "." + id]) {
                        return jQuery.i18n.map["configs.help." + ns + "." + id];
                    }
                    else if (jQuery.i18n.map["configs.help." + (ns + "." + id).replace(".", "-")]) {
                        return jQuery.i18n.map["configs.help." + (ns + "." + id).replace(".", "-")];
                    }
                    else if (state.predefinedInputs[ns + "." + id] && state.predefinedInputs[ns + "." + id].helper) {
                        return jQuery.i18n.map[state.predefinedInputs[ns + "." + id].helper] || state.predefinedInputs[ns + "." + id].helper;
                    }
                };
            },
            getInputType(state) {
                return function(id) {
                    const input = state.predefinedInputs[id];
                    if (typeof input === "function") {
                        return "function";
                    }
                    if (input && input.input) {
                        return input.input;
                    }
                };
            }
        },
        mutations: {
            registerInput(state, payload) {
                state.predefinedInputs[payload.id] = payload.value;
            },
            registerLabel(state, payload) {
                state.predefinedLabels[payload.id] = payload.value;
            },
            registerStructure(state, payload) {
                state.predefinedStructure[payload.id] = payload.value;
            },
            registerUserInput(state, payload) {
                state.predefinedUserInputs[payload.id] = payload.value;
            }
        },
        destroy: false
    });

    return _vuexModule;
}

registerGlobally(getVuexModule());
