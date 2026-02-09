import countlyVue from '../../../javascripts/countly/vue/core.js';
import countlyCommon from '../../../javascripts/countly/countly.common.js';
import countlyCarrier from '../../../javascripts/countly/countly.carrier.js';
import countlyTotalUsers from '../../../javascripts/countly/countly.total.users.js';
import jQuery from 'jquery';

const countlyAppCarrier = {};

countlyAppCarrier.service = {
    fetchData: function() {
        return jQuery.when(countlyCarrier.initialize(), countlyTotalUsers.initialize("carriers"));
    },

    mapAppCarrierDtoToModel: function() {
        var metric = "carriers";
        var tableData = countlyCommon.extractTwoLevelData(countlyCarrier.getDb(), countlyCarrier.getMeta("carriers"), countlyCarrier.clearObject, [
            {
                name: "carriers",
                func: countlyCarrier.getCarrierCodeName
            },
            { "name": "t" },
            { "name": "u" },
            { "name": "n" }
        ], metric);

        tableData = tableData.chartData || [];

        var unknownCarriers = ["--", "null", "unknown", ""],
            newTableData = [],
            unknownOb = {carriers: "Unknown", n: 0, t: 0, u: 0};
        for (let index = 0; index < tableData.length; index++) {
            if (unknownCarriers.includes(tableData[index].carriers.trim().toLowerCase())) {
                unknownOb.n += tableData[index].n;
                unknownOb.t += tableData[index].t;
                unknownOb.u += tableData[index].u;
            }
            else {
                newTableData.push(tableData[index]);
            }
        }
        if (unknownOb.n !== 0 || unknownOb.t !== 0 || unknownOb.u !== 0) {
            newTableData.push(unknownOb);
        }
        tableData = newTableData;

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
                .then(function() {
                    var dataModel = countlyAppCarrier.service.mapAppCarrierDtoToModel();
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

export default countlyAppCarrier;
