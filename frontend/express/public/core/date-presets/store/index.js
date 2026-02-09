import countlyVue from '../../../javascripts/countly/vue/core.js';
import countlyCommon from '../../../javascripts/countly/countly.common.js';
import * as CountlyHelpers from '../../../javascripts/countly/countly.helpers.js';
import { getPeriodLabel } from '../../../javascripts/components/date/mixins.js';
import jQuery from 'jquery';

var CV = countlyVue;

var countlyPresets = {};

countlyPresets.factory = {
    getEmpty: function() {
        return {
            _id: "",
            name: "",
            range: "30days",
            exclude_current_day: false,
            share_with: "all-users",
            shared_email_edit: [],
            shared_email_view: [],
            shared_user_groups_edit: [],
            shared_user_groups_view: [],
            fav: false,
            sort_order: 0,
            is_owner: true
        };
    }
};

countlyPresets.service = {
    create: function(data) {
        return jQuery.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.w + "/date_presets/create",
            data: {
                "name": data.name,
                "range": JSON.stringify(data.range),
                "exclude_current_day": data.exclude_current_day,
                "share_with": data.share_with,
                "shared_email_edit": JSON.stringify(data.shared_email_edit),
                "shared_email_view": JSON.stringify(data.shared_email_view),
                "shared_user_groups_edit": JSON.stringify(data.shared_user_groups_edit),
                "shared_user_groups_view": JSON.stringify(data.shared_user_groups_view),
                "app_id": countlyCommon.ACTIVE_APP_ID
            },
            dataType: "json"
        }, {disableAutoCatch: true});
    },
    update: function(data) {
        return jQuery.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.w + "/date_presets/update",
            data: {
                "preset_id": data._id,
                "name": data.name,
                "range": JSON.stringify(data.range),
                "exclude_current_day": data.exclude_current_day,
                "share_with": data.share_with,
                "shared_email_edit": JSON.stringify(data.shared_email_edit),
                "shared_email_view": JSON.stringify(data.shared_email_view),
                "shared_user_groups_edit": JSON.stringify(data.shared_user_groups_edit),
                "shared_user_groups_view": JSON.stringify(data.shared_user_groups_view),
                "fav": data.fav,
                "sort_order": data.sort_order,
                "app_id": countlyCommon.ACTIVE_APP_ID
            },
            dataType: "json"
        }, {disableAutoCatch: true});
    },
    delete: function(presetId) {
        return jQuery.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.w + "/date_presets/delete",
            data: {
                "preset_id": presetId,
                "app_id": countlyCommon.ACTIVE_APP_ID
            },
            dataType: "json"
        }, {disableAutoCatch: true});
    },
    getAll: function() {
        return jQuery.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r + "/date_presets/getAll",
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID
            },
            dataType: "json"
        }, {disableAutoCatch: true});
    },
    getById: function(presetId) {
        return jQuery.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r + "/date_presets/getById",
            data: {
                "preset_id": presetId,
                "app_id": countlyCommon.ACTIVE_APP_ID
            },
            dataType: "json"
        }, {disableAutoCatch: true});
    }
};

countlyPresets.getVuexModule = function() {
    return countlyVue.vuex.Module("countlyPresets", {
        state: function() {
            return {
                presets: [],
                isLoading: false
            };
        },
        actions: {
            create: function(context, data) {
                return countlyPresets.service.create(data).then(function(id) {
                    return id;
                }).catch(function() {
                    CountlyHelpers.notify({
                        message: CV.i18n('management.preset.created.error'),
                        type: "error"
                    });
                    return false;
                });
            },
            update: function(context, data) {
                return countlyPresets.service.update(data).then(function() {
                    return true;
                }).catch(function() {
                    CountlyHelpers.notify({
                        message: CV.i18n('management.preset.updated.error'),
                        type: "error"
                    });
                    return false;
                });
            },
            delete: function(context, presetId) {
                return countlyPresets.service.delete(presetId).then(function(response) {
                    return response;
                }).catch(function() {
                    CountlyHelpers.notify({
                        message: CV.i18n('management.preset.deleted.error'),
                        type: "error"
                    });
                    return false;
                });
            },
            getAll: function(context) {
                context.commit("setIsLoading", true);
                return countlyPresets.service.getAll().then(function(presets) {
                    presets = presets || [];
                    presets = presets.map(function(preset) {
                        return {...preset, range_label: getPeriodLabel(preset.range, preset.exclude_current_day, 'absolute')};
                    });
                    context.commit("setPresets", presets);
                    context.commit("setIsLoading", false);
                    return presets;
                }).catch(function() {
                    context.commit("setIsLoading", false);
                    return false;
                });
            },
            getById: function(context, presetId) {
                return countlyPresets.service.getById(presetId).then(function(preset) {
                    return preset;
                }).catch(function() {
                    return false;
                });
            }
        },
        mutations: {
            setPresets: function(state, presets) {
                state.presets = presets;
            },
            setIsLoading: function(state, isLoading) {
                state.isLoading = isLoading;
            }
        },
        getters: {
            presets: function(state) {
                return state.presets;
            },
            isLoading: function(state) {
                return state.isLoading;
            }
        }
    });
};

/* ---------------------- */

var _globalDatePreset = null;

countlyPresets.refreshGlobalDatePreset = function() {
    var presetId = localStorage.getItem("countly_date_preset");
    if (!presetId) {
        _globalDatePreset = null;
    }
    else {
        return jQuery.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r + "/date_presets/getById",
            data: {
                "preset_id": presetId,
                "app_id": countlyCommon.ACTIVE_APP_ID
            },
            dataType: "json",
            success: function(json) {
                _globalDatePreset = json;
            },
            error: function() {
                _globalDatePreset = null;
            }
        }, {disableAutoCatch: true});
    }
};

countlyPresets.getGlobalDatePreset = function() {
    return _globalDatePreset;
};

countlyPresets.getGlobalDatePresetId = function() {
    return localStorage.getItem("countly_date_preset");
};

countlyPresets.setGlobalDatePresetId = function(presetId) {
    if (!presetId) {
        localStorage.removeItem("countly_date_preset");
    }
    else {
        localStorage.setItem("countly_date_preset", presetId);
    }

    countlyPresets.refreshGlobalDatePreset();
};

countlyPresets.clearGlobalDatePresetId = function() {
    localStorage.removeItem("countly_date_preset");

    countlyPresets.refreshGlobalDatePreset();
};

countlyPresets.refreshGlobalDatePreset();

export default countlyPresets;
