/* global CountlyHelpers, jQuery, $,countlyTotalUsers,countlyCommon,countlyVue*/
(function(countlyAppCarrier) {

    var _carrierCodeMap = {"46000": "中国移动(GSM)", "46001": "中国联通(GSM)", "46002": "中国移动(TD-S)", "46003": "中国电信(CDMA)", "46005": "中国电信(CDMA)", "46006": "中国联通(WCDMA)", "46007": "中国移动(TD-S)", "46011": "中国电信(FDD-LTE)", "460 11": "中国电信(FDD-LTE)"};

    countlyAppCarrier.helpers = {
        getSerieTotal: function(serie) {
            return serie.reduce(function(total, currentItem) {
                total += currentItem.count;
                return total;
            }, 0);
        },

        findNonEmptyBuckets: function(data) {
            var nonEmptybuckets = [];
            for (var p = 0; p < data.totalSessions.length; p++) {
                nonEmptybuckets.push(data.totalSessions[p]._id);
            }
            return nonEmptybuckets;
        },

        getCodesFromName: function(value) {
            var codes = [];
            if (_carrierCodeMap) {
                for (var p in _carrierCodeMap) {
                    if (_carrierCodeMap[p].indexOf(value) > -1) {
                        codes.push(p);
                    }
                }
            }
            return codes;
        },

        getCarrierCodeName: function(code) {
            return _carrierCodeMap[code] ? _carrierCodeMap[code] : code;
        }
    };
    CountlyHelpers.createMetricModel(countlyAppCarrier, {name: "carriers", estOverrideMetric: "carriers"}, jQuery, countlyAppCarrier.helpers.getCarrierCodeName);

    countlyAppCarrier.service = {
        fetchData: function() {
            return $.when(countlyAppCarrier.initialize(), countlyTotalUsers.initialize("carriers"));
        },

        mapAppCarrierDtoToModel: function() {
            var metric = "carriers";
            var tableData = countlyCommon.extractTwoLevelData(countlyAppCarrier.getDb(), countlyAppCarrier.getMeta("carriers"), countlyAppCarrier.clearObject, [
                {
                    name: "carriers",
                    func: countlyAppCarrier.helpers.getCarrierCodeName
                },
                { "name": "t" },
                { "name": "u" },
                { "name": "n" }
            ], metric);

            tableData = tableData.chartData || [];
            var graphs = {"newUsers": [], "totalSessions": []};
            var totals = {"totalSessions": 0, "newUsers": 0, "totalUsers": 0};
            for (var k = 0; k < tableData.length; k++) {
                graphs.newUsers.push({"name": tableData[k][metric], "value": tableData[k].n});
                graphs.totalSessions.push({"name": tableData[k][metric], "value": tableData[k].t});
                totals.newUsers += tableData[k].n;
                totals.totalSessions += tableData[k].t;
            }
            return {"table": tableData, "pie": graphs, totals: totals};
        },
    };

    countlyAppCarrier.getVuexModule = function() {
        var getInitialState = function() {
            return {
                appCarrier: {"pie": {"newUsers": [], "totalSessions": []}, "totals": {}, "table": []},
                seriesTotal: {},
                minNonEmptyBucketsLength: 0,
                nonEmptyBuckets: [],
                isLoading: false,
                hasError: false,
                error: null
            };
        };

        var appCarrierActions = {
            fetchAll: function(context, useLoader) {
                if (useLoader) {
                    context.state.isLoading = true;
                }
                context.dispatch('onFetchInit');
                countlyAppCarrier.service.fetchData()
                    .then(function(response) {
                        var dataModel = countlyAppCarrier.service.mapAppCarrierDtoToModel(response);
                        context.commit('setAppCarrier', dataModel);
                        context.dispatch('onFetchSuccess');
                        context.state.isLoading = false;
                    }).catch(function(error) {
                        context.dispatch('onFetchError', error);
                        context.state.isLoading = false;
                    });
            },
            onFetchInit: function(context) {
                context.commit('setFetchInit');
            },
            onFetchError: function(context, error) {
                context.commit('setFetchError', error);
            },
            onFetchSuccess: function(context) {
                context.commit('setFetchSuccess');
            },
            onSetSelectedDatePeriod: function(context, period) {
                context.commit('setSelectedDatePeriod', period);
            }
        };

        var appCarrierMutations = {
            setAppCarrier: function(state, value) {
                state.appCarrier = value;
                state.appCarrier.pie = state.appCarrier.pie || {};
                state.appCarrier.table = state.appCarrier.table || [];
                state.appCarrier.totals = state.appCarrier.totals || {};
            },
            setFetchInit: function(state) {
                state.hasError = false;
                state.error = null;
            },
            setFetchError: function(state, error) {
                state.hasError = true;
                state.error = error;
            },
            setFetchSuccess: function(state) {
                state.hasError = false;
                state.error = null;
            }
        };
        return countlyVue.vuex.Module("countlyAppCarrier", {
            state: getInitialState,
            actions: appCarrierActions,
            mutations: appCarrierMutations
        });
    };
}(window.countlyAppCarrier = window.countlyAppCarrier || {}));