/*global countlyVue,CV,countlySession,Promise*/
(function(countlySessionFrequency) {
    countlySessionFrequency.service = {

        mapSessionFrequencySeries: function(dto) {
            var sessionFrequencySerieData = dto.chartData.map(function(chartDataItem) {
                return chartDataItem.t;
            });
            return [{data: sessionFrequencySerieData, label: CV.i18n("session-frequency.title")}];
        },
        mapSessionFrequencyRows: function(dto) {
            var rows = [];
            dto.chartData.forEach(function(chartDataItem, index) {
                rows[index] = {
                    frequency: chartDataItem.f,
                    numberOfSessions: chartDataItem.t,
                    percentage: chartDataItem.percentageNumber
                };
            });
            return rows;
        },
        mapSessionFrequencyDtoToModel: function(dto) {
            var sessionFrequencyModel = {
                series: [],
                rows: []
            };
            sessionFrequencyModel.series = this.mapSessionFrequencySeries(dto);
            sessionFrequencyModel.rows = this.mapSessionFrequencyRows(dto);
            return sessionFrequencyModel;
        },

        fetchSessionFrequency: function() {
            var self = this;
            return new Promise(function(resolve, reject) {
                countlySession.initialize()
                    .then(function() {
                        var frequencyData = countlySession.getRangeData("f", "f-ranges", countlySession.explainFrequencyRange, countlySession.getFrequencyRange());
                        resolve(self.mapSessionFrequencyDtoToModel(frequencyData));
                    }).catch(function(error) {
                        reject(error);
                    });

            });
        }
    };

    countlySessionFrequency.getVuexModule = function() {

        var getInitialState = function() {
            return {
                sessionFrequency: {
                    rows: [],
                    series: []
                },
                isLoading: false,
                hasError: false,
                error: null
            };
        };

        var sessionFrequencyActions = {
            fetchAll: function(context, useLoader) {
                context.dispatch('onFetchInit');
                context.dispatch('setIsLoadingIfNecessary', {useLoader: useLoader, value: true});
                countlySessionFrequency.service.fetchSessionFrequency()
                    .then(function(response) {
                        context.commit('setSessionFrequency', response);
                        context.dispatch('onFetchSuccess');
                        context.dispatch('setIsLoadingIfNecessary', {useLoader: useLoader, value: false});
                    }).catch(function(error) {
                        context.dispatch('onFetchError', error);
                        context.dispatch('setIsLoadingIfNecessary', {useLoader: useLoader, value: false});
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
            setIsLoadingIfNecessary: function(context, payload) {
                if (payload.useLoader) {
                    context.commit('setIsLoading', payload.value);
                }
            }
        };

        var sessionFrequencyMutations = {
            setSessionFrequency: function(state, value) {
                state.sessionFrequency = value;
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
            },
            setIsLoading: function(state, value) {
                state.isLoading = value;
            }
        };

        return countlyVue.vuex.Module("countlySessionFrequency", {
            state: getInitialState,
            actions: sessionFrequencyActions,
            mutations: sessionFrequencyMutations
        });
    };
}(window.countlySessionFrequency = window.countlySessionFrequency || {}));