/*global countlyCommon, countlyVue, CV, app, countlyGlobal */

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
        getAb: function() {
            return CV.$.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r,
                data: {
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    "method": "ab-testing"
                },
                dataType: "json",
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
            }, {"disableAutoCatch": true});
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
                    if (res && countlyGlobal.plugins.indexOf("ab-testing") > -1) {
                        countlyRemoteConfig.service.getAb().then(function(resp) {
                            context.state.parameters.isTableLoading = false;
                            if (resp) {
                                var parameters = res.parameters || [];
                                var conditions = res.conditions || [];
                                parameters.forEach(function(parameter) {
                                    parameter.editable = true;
                                    resp.experiments.forEach(function(experiment) {
                                        if (experiment && experiment.status !== "completed" && experiment.variants && experiment.variants.length > 0 && experiment.variants[0].parameters.length && experiment.variants[0].parameters.length > 0 && experiment.variants[0].parameters[0].name === parameter.parameter_key) {
                                            parameter.abStatus = experiment.status;
                                            parameter.editable = false;
                                        }
                                    });
                                    if (parameter.expiry_dttm && parameter.expiry_dttm < Date.now()) {
                                        parameter.status = "Expired";
                                    }
                                });
                                context.dispatch("countlyRemoteConfig/parameters/all", parameters, {root: true});
                                context.dispatch("countlyRemoteConfig/conditions/all", conditions, {root: true});
                            }
                        });
                    }
                    else {
                        context.state.parameters.isTableLoading = false;
                        var parameters = res.parameters || [];
                        var conditions = res.conditions || [];
                        parameters.forEach(function(parameter) {
                            if (parameter.expiry_dttm && parameter.expiry_dttm < Date.now()) {
                                parameter.status = "Expired";
                            }
                            parameter.editable = true;
                        });
                        context.dispatch("countlyRemoteConfig/parameters/all", parameters, {root: true});
                        context.dispatch("countlyRemoteConfig/conditions/all", conditions, {root: true});
                    }
                });
            }
        };

        var parametersResource = countlyVue.vuex.Module("parameters", {
            state: function() {
                return {
                    all: [],
                    showJsonEditor: false,
                    showJsonEditorForCondition: false,
                    showConditionDialog: false,
                    isTableLoading: true
                };
            },
            getters: {
                all: function(state) {
                    return state.all;
                },
                showJsonEditor: function(state) {
                    return state.showJsonEditor;
                },
                showJsonEditorForCondition: function(state) {
                    return state.showJsonEditorForCondition;
                },
                showConditionDialog: function(state) {
                    return state.showConditionDialog;
                },
                isTableLoading: function(_state) {
                    return _state.isTableLoading;
                }
            },
            mutations: {
                setAll: function(state, val) {
                    state.all = val;
                },
                setShowJsonEditor: function(state, val) {
                    state.showJsonEditor = val;
                },
                setShowJsonEditorForCondition: function(state, val) {
                    state.showJsonEditorForCondition = val;
                },
                setConditionDialog: function(state, val) {
                    state.showConditionDialog = val;
                },
                setTableLoading: function(state, value) {
                    state.isTableLoading = value;
                }
            },
            actions: {
                all: function(context, parameters) {
                    context.commit("setAll", parameters);
                },
                showJsonEditor: function(context, parameter) {
                    context.commit("setShowJsonEditor", parameter);
                },
                showJsonEditorForCondition: function(context, parameter) {
                    context.commit("setShowJsonEditorForCondition", parameter);
                },
                showConditionDialog: function(context, parameter) {
                    context.commit("setConditionDialog", parameter);
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
                    delete updateParameter.editable;
                    delete updateParameter.abStatus;
                    return countlyRemoteConfig.service.updateParameter(id, updateParameter);
                },
                remove: function(context, parameter) {
                    return countlyRemoteConfig.service.removeParameter(parameter._id);
                },
                setTableLoading: function(context, value) {
                    context.commit("setTableLoading", value);
                }
            }
        });

        var conditionsResource = countlyVue.vuex.Module("conditions", {
            state: function() {
                return {
                    all: [],
                    isTableLoading: true,
                    conditionError: ''
                };
            },
            getters: {
                all: function(state) {
                    return state.all;
                },
                isTableLoading: function(_state) {
                    return _state.isTableLoading;
                },
                conditionError: function(state) {
                    return state.conditionError;
                }
            },
            mutations: {
                setAll: function(state, val) {
                    state.all = val;
                },
                setTableLoading: function(state, value) {
                    state.isTableLoading = value;
                },
                setConditionError: function(state, value) {
                    state.conditionError = value;
                }
            },
            actions: {
                all: function(context, conditions) {
                    context.commit("setAll", conditions);
                },
                create: function(context, condition) {
                    return countlyRemoteConfig.service.createCondition(condition).catch(function(err) {
                        if (err && err.responseJSON && err.responseJSON.result) {
                            context.commit("setConditionError", err.responseJSON.result);
                        }
                    });
                },
                update: function(context, condition) {
                    var id = condition._id;

                    delete condition._id;
                    delete condition.hover;
                    return countlyRemoteConfig.service.updateCondition(id, condition);
                },
                remove: function(context, condition) {
                    return countlyRemoteConfig.service.removeCondition(condition._id);
                },
                setTableLoading: function(context, value) {
                    context.commit("setTableLoading", value);
                }
            }
        });

        return countlyVue.vuex.Module("countlyRemoteConfig", {
            actions: actions,
            submodules: [parametersResource, conditionsResource]
        });
    };

})(window.countlyRemoteConfig = window.countlyRemoteConfig || {});