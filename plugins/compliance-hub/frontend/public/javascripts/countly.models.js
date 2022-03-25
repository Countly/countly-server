/*global countlyCommon,CountlyHelpers, jQuery, CV, countlyGlobal, countlyVue, countlyTaskManager */

(function(countlyConsentManager) {
    CountlyHelpers.createMetricModel(countlyConsentManager, {name: "consents", estOverrideMetric: "consents"}, jQuery);
    countlyConsentManager.service = {
        clearObj: function(obj) {
            if (obj) {
                if (!obj.i) {
                    obj.i = 0;
                }
                if (!obj.o) {
                    obj.o = 0;
                }
                if (!obj.e) {
                    obj.e = 0;
                }
                if (!obj.p) {
                    obj.p = 0;
                }
            }
            else {
                obj = { "i": 0, "o": 0, "e": 0, "p": 0 };
            }

            return obj;
        },
        deleteUserdata: function(query, callback) {
            CV.$.ajax({
                type: "POST",
                url: countlyCommon.API_PARTS.data.w + "/app_users/delete",
                data: {
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    "query": query
                },
                success: function(result) {
                    callback(null, result);
                },
                error: function(xhr, status, error) {
                    callback(error, null);
                }
            });
        },
        deleteExport: function(eid, callback) {
            CV.$.ajax({
                type: "POST",
                url: countlyCommon.API_PARTS.data.w + "/app_users/deleteExport/appUser_" + countlyCommon.ACTIVE_APP_ID + "_" + eid,
                data: {
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                },
                success: function(result) {
                    callback(null, result);
                },
                error: function(xhr, status, error) {
                    callback(error, null);
                }
            });
        },
        exportUser: function(query, callback) {
            CV.$.ajax({
                type: "POST",
                url: countlyCommon.API_PARTS.data.w + "/app_users/export",
                data: {
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    "query": query
                },
                success: function(result) {
                    var task_id = null;
                    var fileid = null;
                    if (result && result.result && result.result.task_id) {
                        task_id = result.result.task_id;
                        countlyTaskManager.monitor(task_id);
                    }
                    else if (result && result.result) {
                        fileid = result.result;
                    }
                    callback(null, fileid, task_id);
                },
                error: function(xhr, status, error) {
                    var filename = null;
                    if (xhr && xhr.responseText && xhr.responseText !== "") {
                        var ob = JSON.parse(xhr.responseText);
                        if (ob.result && ob.result.message) {
                            error = ob.result.message;
                        }
                        if (ob.result && ob.result.filename) {
                            filename = ob.result.filename;
                        }
                    }
                    callback(error, filename, null);
                }
            });
        },
        userData: function(data, path, type) {
            data.app_id = countlyCommon.ACTIVE_APP_ID;
            var apiQueryData = CV.$.ajax({
                type: type,
                url: countlyCommon.API_PARTS.data.r + '/app_users/consents' + path,
                data: data,
                dataType: "json",
            });
            return apiQueryData;
        },
        consentHistoryTable: function(data, path, type) {
            data.app_id = countlyCommon.ACTIVE_APP_ID;
            var apiQueryData = CV.$.ajax({
                type: type,
                url: countlyCommon.API_PARTS.data.r + '/consent/search' + path,
                data: data,
                dataType: "json",
            });
            return apiQueryData;

        },
        common: function(data, path, type) {
            data.app_id = countlyCommon.ACTIVE_APP_ID;
            var apiQueryData = CV.$.ajax({
                type: type,
                url: countlyCommon.API_PARTS.data.r + '/consent' + path,
                data: data,
                dataType: "json",
            });
            return apiQueryData;
        }
    };
    var userDataResource = countlyVue.vuex.ServerDataTable("userDataResource", {
        columns: ['_id', 'd', 'av', 'consent', 'lac'],
        loadedData: {},
        //eslint-disable-next-line 
        onRequest: function(context) {
            var data = {
                app_id: countlyCommon.ACTIVE_APP_ID,
            };

            return {
                type: "POST",
                url: countlyCommon.API_PARTS.data.r + '/app_users/consents' + '?api_key=' + countlyGlobal.member.api_key + "&app_id=" + countlyCommon.ACTIVE_APP_ID,
                data: data
            };
        },
        onReady: function(context, rows) {
            for (var k = 0; k < rows.length; k++) {
                rows[k].optin = [];
                rows[k].optout = [];
                rows[k].time = countlyCommon.formatTimeAgoText(rows[k].lac || 0).text;
                if (rows[k].time === 'Invalid date') {
                    rows[k].time = "-";
                }
                if (rows[k].consent) {
                    for (var i in rows[k].consent) {
                        if (rows[k].consent[i]) {
                            rows[k].optin.push(i.charAt(0).toUpperCase() + i.slice(1));
                        }
                        else {
                            rows[k].optout.push(i.charAt(0).toUpperCase() + i.slice(1));
                        }
                    }
                }
            }
            return rows;
        }
    });
    var exportHistoryDataResource = countlyVue.vuex.ServerDataTable("exportHistoryDataResource", {
        columns: ['u', 'ip', 'actions', 'ts'],
        loadedData: {},
        //eslint-disable-next-line 
        onRequest: function(context) {
            var data = {
                app_id: countlyCommon.ACTIVE_APP_ID,
                period: countlyCommon.getPeriodForAjax()
            };

            return {
                type: "POST",
                url: countlyCommon.API_PARTS.data.r + "?api_key=" + countlyGlobal.member.api_key + "&app_id=" + countlyCommon.ACTIVE_APP_ID + "&method=systemlogs",
                data: data
            };
        },
        onReady: function(context, rows) {
            for (var k = 0; k < rows.length; k++) {
                rows[k].time = countlyCommon.formatTimeAgoText(rows[k].ts || 0).text;
                var row = rows[k];
                var ret = "<p>" + ((jQuery.i18n.map["systemlogs.action." + row.a]) ? jQuery.i18n.map["systemlogs.action." + row.a] : row.a) + "</p>";
                if (typeof row.i === "object") {
                    if (typeof row.i.app_id !== "undefined" && countlyGlobal.apps[row.i.app_id]) {
                        ret += "<p title='" + row.i.app_id + "'>" + jQuery.i18n.map["systemlogs.for-app"] + ": " + countlyGlobal.apps[row.i.app_id].name + "</p>";
                    }
                    if (typeof row.i.appuser_id !== "undefined") {
                        ret += "<p title='" + row.i.appuser_id + "'>" + jQuery.i18n.map["systemlogs.for-appuser"] + ": " + row.i.appuser_id + "</p>";
                    }
                    else if (typeof row.i.uids !== "undefined") {
                        ret += "<p title='" + row.i.uids + "'>" + jQuery.i18n.map["systemlogs.for-appuser"] + ": " + row.i.uids + "</p>";
                    }
                    else if (typeof row.i.user_ids !== "undefined") {
                        ret += "<p title='" + row.i.user_ids + "'>" + jQuery.i18n.map["systemlogs.for-appuser"] + ": " + row.i.user_ids + "</p>";
                    }
                    else if (typeof row.i.id !== "undefined") {
                        ret += "<p title='" + row.i.id + "'>" + jQuery.i18n.map["systemlogs.for-appuser"] + ": " + row.i.id + "</p>";
                    }
                }
                rows[k].actions = ret;
            }
            return rows;
        }
    });
    var consentHistoryResource = countlyVue.vuex.ServerDataTable("consentHistoryResource", {
        columns: ['_id', 'type', 'optin', 'optout', 'av', 'ts' ],
        loadedData: {},
        // eslint-disable-next-line 
        onRequest: function(context) {
            var data = {
                app_id: countlyCommon.ACTIVE_APP_ID,
                period: countlyCommon.getPeriodForAjax()
            };
            if (context.rootState.countlyConsentManager.uid !== "") {
                data.filter = JSON.stringify({
                    "uid": context.rootState.countlyConsentManager.uid
                });
            }

            return {
                type: "POST",
                url: countlyCommon.API_PARTS.data.r + '/consent/search' + '?api_key=' + countlyGlobal.member.api_key + "&app_id=" + countlyCommon.ACTIVE_APP_ID,
                data: data
            };
        },
        onReady: function(context, rows) {
            for (var k = 0; k < rows.length; k++) {
                rows[k].optin = [];
                rows[k].optout = [];
                rows[k].time = countlyCommon.formatTimeAgoText(rows[k].ts || 0).text;
                if (rows[k].change) {
                    for (var i in rows[k].change) {
                        if (rows[k].change[i]) {
                            rows[k].optin.push(i.charAt(0).toUpperCase() + i.slice(1));
                        }
                        else {
                            rows[k].optout.push(i.charAt(0).toUpperCase() + i.slice(1));
                        }
                    }
                }
            }
            return rows;
        }
    });

    var consentHistoryUserResource = countlyVue.vuex.ServerDataTable("consentHistoryUserResource", {
        columns: ['_id', 'type', 'optin', 'optout', 'av', 'ts' ],
        // eslint-disable-next-line 
        onRequest: function(context, payload) {
            context.rootState.countlyConsentManager.isLoading = true;
            var data = {
                app_id: countlyCommon.ACTIVE_APP_ID
            };
            if (payload.uid) {
                return {
                    type: "POST",
                    url: countlyCommon.API_PARTS.data.r + '/consent/search' + '?api_key=' + countlyGlobal.member.api_key + "&app_id=" + countlyCommon.ACTIVE_APP_ID + '&query=' + JSON.stringify({ uid: payload.uid }),
                    data: data
                };
            }
        },
        onReady: function(context, rows) {
            for (var k = 0; k < rows.length; k++) {
                rows[k].optin = [];
                rows[k].optout = [];
                rows[k].time = countlyCommon.formatTimeAgoText(rows[k].ts || 0).text;
                if (rows[k].change) {
                    for (var i in rows[k].change) {
                        if (rows[k].change[i]) {
                            rows[k].optin.push(i.charAt(0).toUpperCase() + i.slice(1));
                        }
                        else {
                            rows[k].optout.push(i.charAt(0).toUpperCase() + i.slice(1));
                        }
                    }
                }
            }
            context.rootState.countlyConsentManager.isLoading = false;
            return rows;
        }
    });
    countlyConsentManager.getVuexModule = function() {
        var _consentManagerDbModule = {
            namespaced: true,
            state: function() {
                return {
                    _ePData: {},
                    _purgeDP: {},
                    _consentDP: {},
                    _exportDP: {},
                    _bigNumberData: {},
                    isLoading: false,
                    uid: ''
                };
            },
            getters: {},
            mutations: {},
            actions: {},
            submodules: []
        };
        _consentManagerDbModule.getters.isLoading = function(state) {
            return state.isLoading;
        };
        _consentManagerDbModule.getters.uid = function(state) {
            return state.uid;
        };
        _consentManagerDbModule.getters._ePData = function(state) {
            return state._ePData;
        };
        _consentManagerDbModule.getters._purgeDP = function(state) {
            return state._purgeDP;
        };
        _consentManagerDbModule.getters._consentDP = function(state) {
            return state._consentDP;
        };
        _consentManagerDbModule.getters._exportDP = function(state) {
            return state._exportDP;
        };
        _consentManagerDbModule.getters._bigNumberData = function(state) {
            return state._bigNumberData;
        };
        _consentManagerDbModule.mutations._ePData = function(state, payload) {
            state._ePData = payload;
            state._ePData = Object.assign({}, state._ePData, {});
        };
        _consentManagerDbModule.mutations._purgeDP = function(state, payload) {
            state._purgeDP = payload;
            state._purgeDP = Object.assign({}, state._purgeDP, {});
        };
        _consentManagerDbModule.mutations._consentDP = function(state, payload) {
            state._consentDP = payload;
            state._consentDP = Object.assign({}, payload, {});
        };
        _consentManagerDbModule.mutations._exportDP = function(state, payload) {
            state._exportDP = payload;
            state._exportDP = Object.assign({}, state._exportDP, {});
        };
        _consentManagerDbModule.mutations._bigNumberData = function(state, payload) {
            state._bigNumberData = payload;
            state._bigNumberData = Object.assign({}, state._bigNumberData, {});
        };
        _consentManagerDbModule.mutations.uid = function(state, payload) {
            state.uid = payload;
        };
        _consentManagerDbModule.actions._ePData = function(context) {
            var data = countlyCommon.getDashboardData(countlyConsentManager.getDb(), ["e", "p"], [], {}, countlyConsentManager.service.clearObj);
            return context.commit("_ePData", data);
        };
        _consentManagerDbModule.actions._purgeDP = function(context) {
            var chartData = [
                    { data: [], label: jQuery.i18n.map["consent.userdata-purges"], color: '#DDDDDD', mode: "ghost" },
                    { data: [], label: jQuery.i18n.map["consent.userdata-purges"] }
                ],
                dataProps = [
                    {
                        name: "pp",
                        func: function(dataObj) {
                            return dataObj.p;
                        },
                        period: "previous"
                    },
                    { name: "p" }
                ];

            return context.commit("_purgeDP", countlyCommon.extractChartData(countlyConsentManager.getDb(), countlyConsentManager.service.clearObj, chartData, dataProps));
        };
        _consentManagerDbModule.actions._consentDP = function(context, payload) {
            var chartData = [
                    { data: [], label: jQuery.i18n.map["consent.opt-i"] },
                    { data: [], label: jQuery.i18n.map["consent.opt-o"] }
                ],
                dataProps = [
                    { name: "i" },
                    { name: "o" }
                ];
            return context.commit("_consentDP", countlyCommon.extractChartData(countlyConsentManager.getDb(), countlyConsentManager.service.clearObj, chartData, dataProps, payload.segment));
        };
        _consentManagerDbModule.actions._exportDP = function(context, payload) {
            var chartData = [
                    { data: [], label: jQuery.i18n.map["consent.userdata-exports"], color: '#DDDDDD', mode: "ghost" },
                    { data: [], label: jQuery.i18n.map["consent.userdata-exports"] }
                ],
                dataProps = [
                    {
                        name: "pe",
                        func: function(dataObj) {
                            return dataObj.e;
                        },
                        period: "previous"
                    },
                    { name: "e" }
                ];

            var data = countlyCommon.extractChartData(countlyConsentManager.getDb(), countlyConsentManager.service.clearObj, chartData, dataProps, payload.segment);
            return context.commit("_exportDP", data);
        };
        _consentManagerDbModule.actions._bigNumberData = function(context, payload) {
            var data = countlyCommon.getDashboardData(countlyConsentManager.getDb(), ["i", "o"], [], {}, countlyConsentManager.service.clearObj, payload.segment);
            return context.commit("_bigNumberData", data);
        };
        _consentManagerDbModule.actions.uid = function(context, payload) {
            return context.commit("uid", payload);
        };
        var _module = {
            state: _consentManagerDbModule.state,
            getters: _consentManagerDbModule.getters,
            actions: _consentManagerDbModule.actions,
            mutations: _consentManagerDbModule.mutations,
            submodules: [userDataResource, consentHistoryResource, exportHistoryDataResource, consentHistoryUserResource]
        };
        return countlyVue.vuex.Module("countlyConsentManager", _module);


    };
})(window.countlyConsentManager = window.countlyConsentManager || {});