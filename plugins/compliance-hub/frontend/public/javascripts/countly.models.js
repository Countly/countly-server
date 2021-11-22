/*global countlyCommon,CountlyHelpers, jQuery, CV, countlyGlobal, countlyVue */

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
        deleteUserdata: function(query) {
            var apiQueryData = CV.$.ajax({
                type: "POST",
                url: countlyCommon.API_PARTS.data.w + "/app_users/delete",
                data: {
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    "query": query
                },
            });
            return apiQueryData;
        },
        deleteExport: function(eid) {
            var apiQueryData = CV.$.ajax({
                type: "POST",
                url: countlyCommon.API_PARTS.data.w + "/app_users/deleteExport/appUser_" + countlyCommon.ACTIVE_APP_ID + "_" + eid,
                data: {
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                },
            });
            return apiQueryData;
        },
        exportUser: function(query) {
            var apiQueryData = CV.$.ajax({
                type: "POST",
                url: countlyCommon.API_PARTS.data.w + "/app_users/export",
                data: {
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    "query": query
                },
            });
            return apiQueryData;
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
            };

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
                };
            },
            getters: {},
            mutations: {},
            actions: {},
            submodules: []
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
            return state._ePData = payload;
        };
        _consentManagerDbModule.mutations._purgeDP = function(state, payload) {
            return state._purgeDP = payload;
        };
        _consentManagerDbModule.mutations._consentDP = function(state, payload) {
            return state._consentDP = payload;
        };
        _consentManagerDbModule.mutations._exportDP = function(state, payload) {
            return state._exportDP = payload;
        };
        _consentManagerDbModule.mutations._bigNumberData = function(state, payload) {
            return state._bigNumberData = payload;
        };
        _consentManagerDbModule.actions._ePData = function(context) {
            var data = countlyCommon.getDashboardData(countlyConsentManager.getDb(), ["e", "p"], [], {}, countlyConsentManager.service.clearObj);
            context.commit("_ePData", data);
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

            var data = countlyCommon.extractChartData(countlyConsentManager.getDb(), countlyConsentManager.service.clearObj, chartData, dataProps);
            context.commit("_purgeDP", data);
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

            var data = countlyCommon.extractChartData(countlyConsentManager.getDb(), countlyConsentManager.service.clearObj, chartData, dataProps, payload.segment);
            context.commit("_consentDP", data);
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
            context.commit("_exportDP", data);
        };
        _consentManagerDbModule.actions._bigNumberData = function(context, payload) {
            var data = countlyCommon.getDashboardData(countlyConsentManager.getDb(), ["i", "o"], [], {}, countlyConsentManager.service.clearObj, payload.segment);
            context.commit("_bigNumberData", data);
        };
        var _module = {
            state: _consentManagerDbModule.state,
            getters: _consentManagerDbModule.getters,
            actions: _consentManagerDbModule.actions,
            mutations: _consentManagerDbModule.mutations,
            submodules: [userDataResource, consentHistoryResource, exportHistoryDataResource]
        };
        return countlyVue.vuex.Module("countlyConsentManager", _module);


    };
})(window.countlyConsentManager = window.countlyConsentManager || {});