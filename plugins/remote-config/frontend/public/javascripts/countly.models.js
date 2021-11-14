/*global countlyCommon, countlyVue, CV, app */

(function(countlyRemoteConfig) {
    countlyRemoteConfig.factory = {
        parameters: {
            getEmpty: function() {
                return {
                    parameter_key: "",
                    default_value: "",
                    description: "",
                    conditions: [],
                    status: "Running",
                    expiry_dttm: null
                };
            }
        },
        conditions: {
            getEmpty: function() {
                return {
                    condition_name: "",
                    condition_color: 1,
                    condition: {},
                    condition_definition: "",
                    seed_value: ""
                };
            }
        }
    };

    countlyRemoteConfig.service = {
        initialize: function() {
            return CV.$.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r,
                data: {
                    app_id: countlyCommon.ACTIVE_APP_ID,
                    method: 'remote-config'
                },
                dataType: "json"
            }).then(function(res) {
                return res || {};
            });
        },
        createParameter: function(parameter) {
            return CV.$.ajax({
                type: "POST",
                url: countlyCommon.API_PARTS.data.w + "/remote-config/add-parameter",
                data: {
                    app_id: countlyCommon.ACTIVE_APP_ID,
                    parameter: JSON.stringify(parameter)
                },
                dataType: "json"
            });
        },
        updateParameter: function(id, parameter) {
            return CV.$.ajax({
                type: "POST",
                url: countlyCommon.API_PARTS.data.w + "/remote-config/update-parameter",
                data: {
                    app_id: countlyCommon.ACTIVE_APP_ID,
                    parameter_id: id,
                    parameter: JSON.stringify(parameter)
                },
                dataType: "json"
            });
        },
        removeParameter: function(id) {
            return CV.$.ajax({
                type: "POST",
                url: countlyCommon.API_PARTS.data.w + "/remote-config/remove-parameter",
                data: {
                    app_id: countlyCommon.ACTIVE_APP_ID,
                    parameter_id: id
                },
                dataType: "json"
            });
        },
        createCondition: function(condition) {
            return CV.$.ajax({
                type: "POST",
                url: countlyCommon.API_PARTS.data.w + "/remote-config/add-condition",
                data: {
                    app_id: countlyCommon.ACTIVE_APP_ID,
                    condition: JSON.stringify(condition)
                },
                dataType: "json"
            });
        },
        updateCondition: function(id, condition) {
            return CV.$.ajax({
                type: "POST",
                url: countlyCommon.API_PARTS.data.w + "/remote-config/update-condition",
                data: {
                    app_id: countlyCommon.ACTIVE_APP_ID,
                    condition_id: id,
                    condition: JSON.stringify(condition)
                },
                dataType: "json"
            });
        },
        removeCondition: function(id) {
            return CV.$.ajax({
                type: "POST",
                url: countlyCommon.API_PARTS.data.w + "/remote-config/remove-condition",
                data: {
                    app_id: countlyCommon.ACTIVE_APP_ID,
                    condition_id: id
                },
                dataType: "json"
            });
        },
    };

    countlyRemoteConfig.getVuexModule = function() {
        var actions = {
            initialize: function(context) {
                return countlyRemoteConfig.service.initialize().then(function(res) {
                    var parameters = res.parameters || [];
                    var conditions = res.conditions || [];
                    parameters.forEach(function(parameter) {
                        if (parameter.expiry_dttm && parameter.expiry_dttm < Date.now()) {
                            parameter.status = "Expired";
                        }
                    });
                    context.dispatch("countlyRemoteConfig/parameters/all", parameters, {root: true});
                    context.dispatch("countlyRemoteConfig/conditions/all", conditions, {root: true});
                });
            }
        };

        var parametersResource = countlyVue.vuex.Module("parameters", {
            state: function() {
                return {
                    all: [],
                    showJsonEditor: false
                };
            },
            getters: {
                all: function(state) {
                    return state.all;
                },
                showJsonEditor: function(state) {
                    return state.showJsonEditor;
                }
            },
            mutations: {
                setAll: function(state, val) {
                    state.all = val;
                },
                setShowJsonEditor: function(state, val) {
                    state.showJsonEditor = val;
                }
            },
            actions: {
                all: function(context, parameters) {
                    context.commit("setAll", parameters);
                },
                showJsonEditor: function(context, parameter) {
                    context.commit("setShowJsonEditor", parameter);
                },
                create: function(context, parameter) {
                    return countlyRemoteConfig.service.createParameter(parameter).then(function() {
                        var hasConditions = parameter && parameter.conditions && Array.isArray(parameter.conditions) && parameter.conditions.length > 0;
                        app.recordEvent({
                            "key": "remote-config-create",
                            "count": 1,
                            "segmentation": {has_conditions: hasConditions}
                        });
                    });
                },
                update: function(context, parameter) {
                    var id = parameter._id;
                    var updateParameter = Object.assign({}, parameter);
                    delete updateParameter.value_list;
                    delete updateParameter._id;
                    delete updateParameter.hover;
                    return countlyRemoteConfig.service.updateParameter(id, updateParameter);
                },
                remove: function(context, parameter) {
                    return countlyRemoteConfig.service.removeParameter(parameter._id);
                }
            }
        });

        var conditionsResource = countlyVue.vuex.Module("conditions", {
            state: function() {
                return {
                    all: []
                };
            },
            getters: {
                all: function(state) {
                    return state.all;
                }
            },
            mutations: {
                setAll: function(state, val) {
                    state.all = val;
                }
            },
            actions: {
                all: function(context, conditions) {
                    context.commit("setAll", conditions);
                },
                create: function(context, condition) {
                    return countlyRemoteConfig.service.createCondition(condition);
                },
                update: function(context, condition) {
                    var id = condition._id;

                    delete condition._id;
                    delete condition.hover;
                    return countlyRemoteConfig.service.updateCondition(id, condition);
                },
                remove: function(context, condition) {
                    return countlyRemoteConfig.service.removeCondition(condition._id);
                }
            }
        });

        return countlyVue.vuex.Module("countlyRemoteConfig", {
            actions: actions,
            submodules: [parametersResource, conditionsResource]
        });
    };

})(window.countlyRemoteConfig = window.countlyRemoteConfig || {});