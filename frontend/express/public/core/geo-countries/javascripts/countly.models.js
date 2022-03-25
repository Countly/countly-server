/* global CountlyHelpers, jQuery, $,countlyCommon,countlyVue, countlySession, countlyLocation*/
(function(countlyCountry) {

    CountlyHelpers.createMetricModel(countlyCountry, {name: "countries", estOverrideMetric: "countries"}, jQuery, countlyLocation.getCountryName);

    countlyCountry.service = {
        fetchData: function() {
            return $.when(countlySession.initialize()).then(function() {});
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
            var totals = countlyCommon.getDashboardData(countlyCountry.getDb(), ["u", "t", "n"], ["u"], {"u": "countries"}, countlyCountry.clearObject); //get totals with change

            return {"table": locationData, "totals": totals};
        },
        calculateRegionData: function(region) {
            countlyCountry.setDb(countlySession.getDb());
            return countlyCommon.getDashboardData(countlyCountry.getDb(), ["u", "t", "n"], ["u"], {"u": "countries"}, countlyCountry.clearObject, region);
        }
    };

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
            fetchData: function(context) {
                context.dispatch('onFetchInit');
                return countlyCountry.service.fetchData().then(function() {
                    countlyCountry.setDb(countlySession.getDb());
                    var countries = countlyCountry.service.calculateData();
                    context.commit('setData', countries);
                    return context.dispatch('onFetchSuccess');
                }).catch(function(error) {
                    return context.dispatch('onFetchError', error);
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
            setFetchInit: function(state) {
                state.isLoading = true;
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
        return countlyVue.vuex.Module("countlyCountry", {
            state: getInitialState,
            actions: countlyCountryActions,
            mutations: countlyCountryMutations
        });
    };


}(window.countlyCountry = window.countlyCountry || {}));