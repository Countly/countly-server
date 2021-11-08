/*global
    jQuery, $,
 */

(function(hooksPlugin, jQuery) {
    var _hookList = [];
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
        }
        switch (triggerType) {
            case 'APIEndPointTrigger':
                data = {
                    qstring: {"paramA": "abc", "paramB": 123,  "paramC": [1,2,3]}, 
                    paths: `localhost/o/hooks/${hookConfig.trigger.configuration.path}`.split("/") 
                };
                break;
            case 'IncomingDataTrigger':
                data = {
                    events: [
                        {
                            key: "eventA",
                            count: 1,
                            segmentation: {
                                "a":"1",
                                "b":"2",
                            }
                        },
                        {
                            key: "eventB",
                            count: 1,
                            segmentation: {
                                "a":"1",
                                "b":"2",
                            }
                        },
                    ],
                    user: mockUser,
                };
                break;
            case 'InternalEventTrigger':
                var eventType = hookConfig.trigger.configuration.eventType
                data = {
                    user: mockUser, 
                }
                if (eventType.indexOf('cohort') >= 0) {
                    data.corhort = {
                        _id: "****",
                        name: "corhort A",
                    }
                }
                break;
        }
        return data;
    }

    hooksPlugin.generateTriggerActionsTreeDom = function (row) {
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
        var arrow = '<div class="is-effect-col-arrow"><svg width="12" height="13" viewBox="0 0 12 13" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.25 8.25L6.75 12.75L5.685 11.685L8.3775 9H0V0H1.5V7.5H8.3775L5.685 4.815L6.75 3.75L11.25 8.25Z" fill="#CDAD7A"/></svg></div>';
        row.effects.forEach(function(effect) {
            effectList +="<div class='is-effect-col'>" + arrow + '<div class="is-trigger-col-tag">'+ effectNames[effect.type] + '</div> </div>';
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

        var triggerEffectDom= '<div class="is-trigger-col-tag">' + triggerText + '</div>';
        triggerEffectDom += triggerDesc;
        triggerEffectDom += '<div style="margin:5px 0 0 2px;">';
        triggerEffectDom += effectList;
        triggerEffectDom += '</div>';
        return triggerEffectDom;
    }

    hooksPlugin.getVuexModule = function() {
        var getEmptyState = function() {
            return {
                hookDetail: {},
                testResult: [],
            };
        };

        var state = function() {
            return {
                hookDetail: [],
                testResult: [],
            };
        };

        var getters = {
            hookDetail(state) {
                return state.hookDetail;
            },
            testResult(state) {
                return state.testResult;
            }
        };

        var mutations = {
            setDetail: function (state, detail) {
                state.hookDetail = detail;
            },
            setTestResult: function (state, result) {
                state.testResult = result;
            },
            resetTestResult: function (state) {
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
                    },
                    dataType: "json",
                    success: function(data) {
                        if(data.hooksList && data.hooksList.length === 1) {
                            data.hooksList[0].triggerEffectDom = hooksPlugin.generateTriggerActionsTreeDom(data.hooksList[0]);
                            context.commit("setDetail", data.hooksList[0]);
                        }
                    },
                }) 
            },
            refresh: function(context) {
                context.dispatch("countlyHooks/table/fetchAll", null, {root: true});
            },
            saveHook: function (context, record) {
                return CV.$.ajax({
                    type: "POST",
                    url: countlyCommon.API_PARTS.data.w + "/hook/save",
                    data: {
                        "hook_config": JSON.stringify(record)
                    },
                    dataType: "json",
                });
            },
            testHook: function (context, hookConfig) {
                delete hookConfig.error_logs;
                var mockData = hooksPlugin.mockDataGenerator(hookConfig);
                context.commit("resetTestResult");
                return CV.$.ajax({
                    type: "get",
                    url: countlyCommon.API_PARTS.data.w + "/hook/test",
                    data: {
                        "hook_config": JSON.stringify(hookConfig),
                        "mock_data": JSON.stringify(mockData),
                    },
                    dataType: "json",
                    success: function(res) {
                        if (res.result){
                            res.result = res.result.map(function(data, idx) {
                                    data.t = idx === 0? data.rule.trigger.type : data.rule.effects[idx-1].type;
                                    data.i = idx === 0? data.params : res.result[idx-1].params;
                                    data.o = data.params;
                                    return data;
                            });
                            context.commit("setTestResult", res.result);
                        }
                    }
                });
            }
        }

        var tableResource = countlyVue.vuex.Module("table", {
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
                updateStatus: function(context, status) {
                    return CV.$.ajax({
                        type: "post",
                        url: countlyCommon.API_PARTS.data.w + "/hook/status",
                        data: {
                            "status": JSON.stringify(status)
                        },
                        dataType: "json",
                    })
                },
                fetchAll: function(context) {
                    return CV.$.ajax({
                        type: "GET",
                        url: countlyCommon.API_PARTS.data.r + "/hook/list",
                        data: {preventGlobalAbort: true},
                    },).then(function(res) {
                        const hookList = res && res.hooksList || [];
                        const tableData = [];
                        for (var i = 0; i < hookList.length; i++) {
                            const row = hookList[i];
                            var appNameList = [];
                            if (hookList[i].apps) {
                                appNameList = _.map(hookList[i].apps, function(appID) {
                                    return countlyGlobal.apps[appID] && countlyGlobal.apps[appID].name;
                                });
                            }
                            let nameDescColumn = '<div class="is-name-col">' + row.name + '</div>'
                            if (row.description) {
                                nameDescColumn += '<div class="is-desc-col">' + row.description + '</div>';
                            }
                            
                            var triggerEffectDom = hooksPlugin.generateTriggerActionsTreeDom(row);
                            tableData.push({
                                _id: hookList[i]._id,
                                name: hookList[i].name || '',
                                description: hookList[i].description || '-',
                                apps: hookList[i].apps,
                                nameDescColumn: nameDescColumn,
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
                            });
                        };
                        if (tableData && tableData.length > 0) {
                            context.commit("setAll", tableData);
                        }
                    });
                },
            }
        });
        return countlyVue.vuex.Module("countlyHooks", {
            resetFn: getEmptyState,
            getters: getters,
            actions: actions,
            mutations: mutations,
            state: state,
            submodules: [tableResource]
        });
    }

    hooksPlugin.defaultDrawerConfigValue = function () {
        const data = {
            _id: null,
            name: "",
            description: "",
            apps: [""],
            trigger:{
                type: null,
                configuration: null, 
            },
            createdBy:'',
            createdByUser:'',
            effects:[{type:null, configuration: null}],
            enabled: true, 
        }
        return data;
    }

 
}(window.hooksPlugin = window.hooksPlugin || {}, jQuery));
