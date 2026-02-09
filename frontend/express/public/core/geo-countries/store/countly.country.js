import { ajax, vuex } from '../../../javascripts/countly/vue/core.js';
import countlyCommon from '../../../javascripts/countly/countly.common.js';
import countlySession from '../../../javascripts/countly/countly.session.js';
import countlyTotalUsers from '../../../javascripts/countly/countly.total.users.js';
import countlyLocation from '../../../javascripts/countly/countly.location.js';
import { createMetricModel } from '../../../javascripts/countly/countly.helpers.js';

var countlyCountry = {};

createMetricModel(countlyCountry, {name: "countries", estOverrideMetric: "countries"}, { ajax }, countlyLocation.getCountryName);

var service = {
    fetchData: function() {
        return Promise.all([countlySession.initialize(), countlyTotalUsers.initialize("users")])
            .then(function() {
            })
            .catch(function(err) {
                return err;
            });
    },
    calculateData: function() {
        countlyCountry.setDb(countlySession.getDb());
        var locationData = countlyCommon.extractTwoLevelData(countlyCountry.getDb(), countlyCountry.getMeta(), countlyCountry.clearObject, [
            {
                "name": "country",
                "func": function(rangeArr) {
                    return (rangeArr + "").toUpperCase();
                }
            },
            {
                "name": "countryTranslated",
                "func": function(rangeArr) {
                    return countlyLocation.getCountryName(rangeArr);
                }
            },
            {
                "name": "code",
                "func": function(rangeArr) {
                    return rangeArr.toLowerCase();
                }
            },
            { "name": "t" },
            { "name": "u" },
            { "name": "n" }
        ], "countries");

        locationData = locationData || {};
        locationData = locationData.chartData || [];
        locationData = countlyCommon.mergeMetricsByName(locationData, "country");
        var totals = countlyCommon.getDashboardData(countlyCountry.getDb(), ["u", "t", "n"], ["u"], {"u": "users"}, countlyCountry.clearObject);

        return {"table": locationData, "totals": totals};
    },
    calculateRegionData: function(region) {
        countlyCountry.setDb(countlySession.getDb());
        return countlyCommon.getDashboardData(countlyCountry.getDb(), ["u", "t", "n"], ["u"], {"u": "countries"}, countlyCountry.clearObject, region);
    }
};

countlyCountry.service = service;

countlyCountry.getVuexModule = function() {
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

    var countlyCountryActions = {
        fetchData: function(context, force) {
            context.commit('setFetchInit', force);
            return service.fetchData().then(function() {
                countlyCountry.setDb(countlySession.getDb());
                var countries = service.calculateData();
                context.commit('setData', countries);
                return context.commit('setFetchSuccess');
            }).catch(function(error) {
                return context.commit('setFetchError', error);
            });
        },
        onSetSelectedProperty: function(context, value) {
            context.commit('setSelectedProperty', value);
        },
        onSetRegion: function(context, value) {
            context.commit('setRegion', value);
        },
    };

    var countlyCountryMutations = {
        setData: function(state, value) {
            state.data = value;
            state.data = state.data || {};
            state.data.table = state.data.table || [];
            state.data.totals = state.data.totals || {};
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
    return vuex.Module("countlyCountry", {
        state: getInitialState,
        actions: countlyCountryActions,
        mutations: countlyCountryMutations
    });
};

export default countlyCountry;
