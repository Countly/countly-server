/*global
    jQuery, 
    CV,
    countlyVue,
    countlyGlobal,
    countlyAuth,
    _,
    moment,
 */

(function(hooksPlugin, jQuery) {
    var FEATURE_NAME = "hooks";
    var countlyCommon = window.countlyCommon;


    /**
     * hook mock data generator
     * @param {object} hookConfig - hookConfig record
     * @return {object} mockData - trigger related mock data
     */
    hooksPlugin.mockDataGenerator = function mockDataGenerator(hookConfig) {
        var triggerType = hookConfig && hookConfig.trigger && hookConfig.trigger.type;
        var data;

        var mockUser = {
            _id: "*****",
            name: "foobar",
            did: "****",
        };
        switch (triggerType) {
        case 'APIEndPointTrigger':
            data = {
                qstring: {"paramA": "abc", "paramB": 123, "paramC": [1, 2, 3]},
                paths: ("localhost/o/hooks/" + hookConfig.trigger.configuration.path).split("/")
            };
            break;
        case 'IncomingDataTrigger':
            data = {
                events: [
                    {
                        key: "eventA",
                        count: 1,
                        segmentation: {
                            "a": "1",
                            "b": "2",
                        }
                    },
                    {
                        key: "eventB",
                        count: 1,
                        segmentation: {
                            "a": "1",
                            "b": "2",
                        }
                    },
                ],
                user: mockUser,
            };
            break;
        case 'InternalEventTrigger':
            var eventType = hookConfig.trigger.configuration.eventType;
            data = {
                user: mockUser,
            };
            if (eventType.indexOf('cohort') >= 0) {
                data.corhort = {
                    _id: "****",
                    name: "corhort A",
                };
            }
            break;
        case 'ScheduledTrigger':
            data = {};
            break;
        default:
            data = {};
        }
        return data;
    };

    hooksPlugin.generateTriggerActionsTreeDom = function(row) {
        var triggerNames = {
            "APIEndPointTrigger": jQuery.i18n.map["hooks.trigger-api-endpoint-uri"],
            "IncomingDataTrigger": jQuery.i18n.map["hooks.IncomingData"],
            "InternalEventTrigger": jQuery.i18n.map["hooks.internal-event-selector-title"],
            "ScheduledTrigger": jQuery.i18n.map["hooks.ScheduledTrigger"],
        };
        var triggerText = triggerNames[row.trigger.type];
        var triggerDesc = '';
        try {
            if (row.trigger.type === "IncomingDataTrigger") {
                var event = row.trigger.configuration.event;
                var parts = event[0].split("***");
                triggerDesc = '<div class="is-trigger-effect-desc">' + parts[1] + '</div>';
            }

            if (row.trigger.type === "APIEndPointTrigger") {
                var path = row.trigger.configuration.path;
                triggerDesc = '<div class="is-trigger-effect-desc">' + path + '</div>';
            }

            if (row.trigger.type === "InternalEventTrigger") {
                var eventType = row.trigger.configuration.eventType;
                triggerDesc = '<div class="is-trigger-effect-desc">' + eventType + '</div>';
            }
        }
        catch (e) {
            //silent catch
        }

        var effectNames = {
            "EmailEffect": jQuery.i18n.map["hooks.EmailEffect"],
            "HTTPEffect": jQuery.i18n.map["hooks.HTTPEffect"],
            "CustomCodeEffect": jQuery.i18n.map["hooks.CustomCodeEffect"],
        };
        var effectList = "";
        var arrow = '<div class="is-effect-col-arrow"><svg width="11.25" height="12.75" viewBox="0 0 12 13" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.25 8.25L6.75 12.75L5.685 11.685L8.3775 9H0V0H1.5V7.5H8.3775L5.685 4.815L6.75 3.75L11.25 8.25Z" fill="#CDAD7A"/></svg></div>';
        row.effects.forEach(function(effect) {
            effectList += "<div class='is-effect-col'>" + arrow + '<div class="is-trigger-col-tag">' + (effectNames[effect.type] && effectNames[effect.type].toUpperCase()) + '</div> </div>';
            if (effect.type === "EmailEffect") {
                effectList += '<div class="is-trigger-effect-desc">' + effect.configuration.address + '</div>';
            }
            if (effect.type === "HTTPEffect") {
                effectList += '<div class="is-trigger-effect-desc">' + effect.configuration.url + '</div>';
            }
            if (effect.type === "CustomCodeEffect") {
                effectList += '<div class="is-trigger-effect-desc">' + effect.configuration.code + '</div>';
            }
        });

        var triggerEffectDom = '<div class="is-trigger-col-tag">' + triggerText.toUpperCase() + '</div>';
        triggerEffectDom += triggerDesc;
        triggerEffectDom += '<div style="margin:5px 0 0 2px;">';
        triggerEffectDom += effectList;
        triggerEffectDom += '</div>';
        return triggerEffectDom;
    };

    hooksPlugin.generateTriggerActionsTreeForExport = function(row) {
        var triggerNames = {
            "APIEndPointTrigger": jQuery.i18n.map["hooks.trigger-api-endpoint-uri"],
            "IncomingDataTrigger": jQuery.i18n.map["hooks.IncomingData"],
            "InternalEventTrigger": jQuery.i18n.map["hooks.internal-event-selector-title"],
            "ScheduledTrigger": jQuery.i18n.map["hooks.ScheduledTrigger"],
        };
        var triggerText = triggerNames[row.trigger.type];
        var triggerDesc = '';
        try {
            if (row.trigger.type === "IncomingDataTrigger") {
                var event = row.trigger.configuration.event;
                var parts = event[0].split("***");
                triggerDesc = ' ' + parts[1] + ' ';
            }

            if (row.trigger.type === "APIEndPointTrigger") {
                var path = row.trigger.configuration.path;
                triggerDesc = ' ' + path + ' ';
            }

            if (row.trigger.type === "InternalEventTrigger") {
                var eventType = row.trigger.configuration.eventType;
                triggerDesc = ' ' + eventType + ' ';
            }
        }
        catch (e) {
            //silent catch
        }

        var effectNames = {
            "EmailEffect": jQuery.i18n.map["hooks.EmailEffect"],
            "HTTPEffect": jQuery.i18n.map["hooks.HTTPEffect"],
            "CustomCodeEffect": jQuery.i18n.map["hooks.CustomCodeEffect"],
        };
        var effectList = "";
        var arrow = ' -> ';
        row.effects.forEach(function(effect) {
            effectList += arrow + (effectNames[effect.type] && effectNames[effect.type].toUpperCase()) + ' ';
            if (effect.type === "EmailEffect") {
                effectList += ' ' + effect.configuration.address + ' ';
            }
            if (effect.type === "HTTPEffect") {
                effectList += ' ' + effect.configuration.url + ' ';
            }
            if (effect.type === "CustomCodeEffect") {
                effectList += ' ' + effect.configuration.code + ' ';
            }
        });

        var triggerEffectDom = triggerText.toUpperCase() + ' ';
        triggerEffectDom += triggerDesc;
        triggerEffectDom += ' ';
        triggerEffectDom += effectList;
        triggerEffectDom += ' ';
        return triggerEffectDom;
    };

    hooksPlugin.getVuexModule = function() {
        var getEmptyState = function() {
            return {
                hookDetail: {},
                testResult: [],
                detailLogsInitialized: false,
            };
        };

        var getters = {
            hookDetail: function(state) {
                return state.hookDetail;
            },
            getDetailLogsInitialized: function(state) {
                return state.detailLogsInitialized;
            },
            testResult: function(state) {
                return state.testResult;
            }
        };

        var mutations = {
            setDetail: function(state, detail) {
                detail.error_logs = detail.error_logs && detail.error_logs.map(function(err, idx) {
                    // err.e = err.e.replaceAll("\n",'<br/>');
                    err.e = err.e.replaceAll("\\n", '\n');
                    err._id = idx;
                    err.timestamp_string = moment(err.timestamp).format('ddd, DD MMM YYYY, HH:mm:ss');
                    err._lines = Array.apply(null, Array(err.e.split("\n").length)).map(function(_, i) {
                        return i + 1;
                    }).join("\n");
                    return err;
                });
                state.hookDetail = detail;
            },
            setDetailLogsInitialized: function(state, initialized) {
                state.detailLogsInitialized = initialized;
            },
            setTestResult: function(state, result) {
                state.testResult = result;
            },
            resetTestResult: function(state) {
                state.testResult = [];
            }
        };



        var actions = {
            initialize: function(context) {
                context.dispatch("refresh");
            },
            initializeDetail: function(context, id) {
                return CV.$.ajax({
                    type: "get",
                    url: countlyCommon.API_PARTS.data.r + "/hook/list",
                    data: {
                        "id": id,
                        "app_id": countlyCommon.ACTIVE_APP_ID,
                    },
                    dataType: "json",
                    success: function(data) {
                        if (data.hooksList && data.hooksList.length === 1) {
                            var record = data.hooksList[0];
                            record.triggerEffectDom = hooksPlugin.generateTriggerActionsTreeDom(record);
                            record._canUpdate = countlyAuth.validateUpdate(FEATURE_NAME, countlyGlobal.member, record.apps[0]),
                            record._canDelete = countlyAuth.validateDelete(FEATURE_NAME, countlyGlobal.member, record.apps[0]),
                            context.commit("setDetail", record);
                            context.commit("setDetailLogsInitialized", true);
                        }
                    },
                });
            },
            refresh: function(context) {
                context.dispatch("countlyHooks/table/fetchAll", null, {root: true});
            },
            saveHook: function(context, record) {
                delete record._canUpdate;
                delete record._canDelete;
                return CV.$.ajax({
                    type: "POST",
                    url: countlyCommon.API_PARTS.data.w + "/hook/save?" + "app_id=" + record.apps[0],
                    data: {
                        "hook_config": JSON.stringify(record)
                    },
                    dataType: "json",
                    success: function() {
                        context.dispatch("countlyHooks/table/fetchAll", null, {root: true});
                        context.dispatch("countlyHooks/initializeDetail", record._id, {root: true});
                    }
                });
            },
            deleteHook: function(context, id) {
                return CV.$.ajax({
                    type: "POST",
                    url: countlyCommon.API_PARTS.data.w + "/hook/delete" + "?app_id=" + countlyCommon.ACTIVE_APP_ID,
                    data: {
                        "hookID": id
                    },
                    dataType: "json",
                    success: function() {
                        context.dispatch("countlyHooks/table/fetchAll", null, {root: true});
                        window.app.navigate("/manage/hooks", true);
                    }
                });
            },
            testHook: function(context, hookConfig) {
                delete hookConfig.error_logs;
                var mockData = hooksPlugin.mockDataGenerator(hookConfig);
                context.commit("resetTestResult");
                return CV.$.ajax({
                    type: "get",
                    url: countlyCommon.API_PARTS.data.w + "/hook/test" + "?app_id=" + countlyCommon.ACTIVE_APP_ID,
                    data: {
                        "hook_config": JSON.stringify(hookConfig),
                        "mock_data": JSON.stringify(mockData),
                    },
                    dataType: "json",
                    success: function(res) {
                        if (res.result) {
                            res.result = res.result.map(function(data, idx) {
                                data.t = idx === 0 ? data.rule.trigger.type : data.rule.effects[idx - 1].type;
                                data.i = idx === 0 ? data.params : res.result[idx - 1].params;
                                data.o = data.params;
                                return data;
                            });
                            context.commit("setTestResult", res.result);
                        }
                    }
                });
            },
            resetTestResult: function(context) {
                context.commit("setTestResult", []);
            }
        };

        var tableResource = countlyVue.vuex.Module("table", {
            state: function() {
                return {
                    all: [],
                    initialized: false,
                };
            },
            getters: {
                all: function(state) {
                    return state.all;
                },
                getInitialized: function(state) {
                    return state.initialized;
                }
            },
            mutations: {
                setAll: function(state, val) {
                    state.all = val;
                },
                setInitialized: function(state, val) {
                    state.initialized = val;
                },
            },
            actions: {
                updateStatus: function(context, status) {
                    return CV.$.ajax({
                        type: "post",
                        url: countlyCommon.API_PARTS.data.w + "/hook/status" + "?app_id=" + countlyCommon.ACTIVE_APP_ID,
                        data: {
                            "status": JSON.stringify(status)
                        },
                        dataType: "json",
                        success: function() {
                            context.dispatch("countlyHooks/table/fetchAll", null, {root: true});
                        }
                    });
                },
                fetchAll: function(context) {
                    context.commit("setInitialized", false);
                    return CV.$.ajax({
                        type: "GET",
                        url: countlyCommon.API_PARTS.data.r + "/hook/list" + "?app_id=" + countlyCommon.ACTIVE_APP_ID,
                        data: {preventGlobalAbort: true},
                    }).then(function(res) {
                        var hookList = res && res.hooksList || [];
                        var tableData = [];
                        for (var i = 0; i < hookList.length; i++) {
                            var row = hookList[i];
                            var appNameList = [];
                            if (hookList[i].apps) {
                                appNameList = _.map(hookList[i].apps, function(appID) {
                                    return countlyGlobal.apps[appID] && countlyGlobal.apps[appID].name;
                                });
                            }


                            var triggerEffectDom = hooksPlugin.generateTriggerActionsTreeDom(row);

                            tableData.push({
                                _id: hookList[i]._id,
                                name: hookList[i].name || '',
                                description: hookList[i].description || '',
                                apps: hookList[i].apps,
                                appNameList: appNameList.join(', '),
                                triggerCount: hookList[i].triggerCount || 0,
                                lastTriggerTimestampString: hookList[i].lastTriggerTimestamp && moment(hookList[i].lastTriggerTimestamp).fromNow() || "-",
                                lastTriggerTimestamp: hookList[i].lastTriggerTimestamp || 0,
                                enabled: hookList[i].enabled || false,
                                createdByUser: hookList[i].createdByUser || '',
                                trigger: hookList[i].trigger,
                                effects: hookList[i].effects,
                                created_at: hookList[i].created_at || 0,
                                created_at_string: moment(hookList[i].created_at).fromNow(),
                                triggerEffectColumn: triggerEffectDom || "",
                                _canUpdate: countlyAuth.validateUpdate(FEATURE_NAME, countlyGlobal.member, hookList[i].apps[0]),
                                _canDelete: countlyAuth.validateDelete(FEATURE_NAME, countlyGlobal.member, hookList[i].apps[0]),
                            });
                        }
                        context.commit("setInitialized", true);
                        if (tableData && tableData.length > 0) {
                            context.commit("setAll", tableData);
                        }
                    });
                },
            }
        });

        var state = function() {
            return {
                hookDetail: [],
                testResult: [],
                detailLogsInitialized: false,
            };
        };
        return countlyVue.vuex.Module("countlyHooks", {
            resetFn: getEmptyState,
            getters: getters,
            actions: actions,
            mutations: mutations,
            state: state,
            submodules: [tableResource]
        });
    };

    hooksPlugin.defaultDrawerConfigValue = function() {
        var data = {
            _id: null,
            name: "",
            description: "",
            apps: [""],
            trigger: {
                type: null,
                configuration: null,
            },
            createdBy: '',
            createdByUser: '',
            effects: [{type: null, configuration: null}],
            enabled: true,
        };
        return data;
    };


}(window.hooksPlugin = window.hooksPlugin || {}, jQuery));
