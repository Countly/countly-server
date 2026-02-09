import { ajax, vuex, i18n } from '../../../javascripts/countly/vue/core.js';
import countlyCommon from '../../../javascripts/countly/countly.common.js';
import countlySession from '../../../javascripts/countly/countly.session.js';
import countlyTotalUsers from '../../../javascripts/countly/countly.total.users.js';
import { createMetricModel } from '../../../javascripts/countly/countly.helpers.js';

var countlyCities = {};

createMetricModel(countlyCities, {name: "cities", estOverrideMetric: "cities"}, { ajax }, function(rangeArr) {
    if (rangeArr === "Unknown") {
        return i18n("common.unknown");
    }
    return rangeArr;
});

var service = {
    fetchData: function() {
        return Promise.all([countlySession.initialize(), countlyCities.initialize(), countlyTotalUsers.initialize("cities")]).then(function() {});
    },
    calculateData: function(state) {
        var locationData = countlyCommon.extractTwoLevelData(countlyCities.getDb(), countlyCities.getMeta(), countlyCities.clearObject, [
            {
                "name": "city",
                "func": function(rangeArr) {
                    if (rangeArr === "Unknown") {
                        return i18n("common.unknown");
                    }
                    return rangeArr;
                }
            },
            { "name": "t" },
            { "name": "u" },
            { "name": "n" }
        ], "cities");

        locationData = locationData || {};
        locationData = locationData.chartData || [];
        var totals = countlyCommon.getDashboardData(countlySession.getDb(), ["u", "t", "n"], ["u"], {"u": "countries"}, countlyCities.clearObject, state.region || "TR");
        return {"table": locationData, "totals": totals};
    }
};

countlyCities.service = service;

countlyCities.getVuexModule = function() {
    var getInitialState = function() {
        return {
            data: {"table": [], "totals": {"u": {}, "t": {}, "n": {}}},
            isLoading: false,
            hasError: false,
            error: null,
            selectedProperty: "t",
            region: "TR"
        };
    };

    var countlyCitiesActions = {
        fetchData: function(context, force) {
            context.commit('setFetchInit', force);
            service.fetchData().then(function() {
                var countries = service.calculateData(context.state);
                countries.cities = countries.table;
                context.commit('setData', countries);
                context.commit('setFetchSuccess');
            }).catch(function(error) {
                context.commit('setFetchError', error);
            });
        },
        onSetSelectedProperty: function(context, value) {
            context.commit('setSelectedProperty', value);
        },
        onSetRegion: function(context, value) {
            context.commit('setRegion', value);
        },
    };

    var countlyCitiesMutations = {
        setData: function(state, value) {
            state.data = value;
        },
        setRegion: function(state, value) {
            state.region = value;
        },
        setFetchInit: function(state, force) {
            if (force) {
                state.isLoading = true;
            }
            state.hasError = false;
            state.error = null;
        },
        setFetchError: function(state, error) {
            state.isLoading = false;
            state.hasError = true;
            state.error = error;
        },
        setFetchSuccess: function(state) {
            state.isLoading = false;
            state.hasError = false;
            state.error = null;
        },
        setSelectedProperty: function(state, value) {
            state.selectedProperty = value;
        }
    };
    return vuex.Module("countlyCities", {
        state: getInitialState,
        actions: countlyCitiesActions,
        mutations: countlyCitiesMutations
    });
};

export default countlyCities;
