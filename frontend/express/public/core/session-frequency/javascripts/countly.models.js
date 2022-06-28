/*global countlyVue,CV,countlySession*/
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
                    weight: index,
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
            };
        };

        var sessionFrequencyActions = {
            fetchAll: function(context, useLoader) {
                context.dispatch('onFetchInit', {useLoader: useLoader});
                countlySessionFrequency.service.fetchSessionFrequency()
                    .then(function(response) {
                        context.commit('setSessionFrequency', response);
                        context.dispatch('onFetchSuccess', {useLoader: useLoader});
                    }).catch(function(error) {
                        context.dispatch('onFetchError', error);
                        context.dispatch('onFetchError', {error: error, useLoader: useLoader});
                    });
            }
        };

        var sessionFrequencyMutations = {
            setSessionFrequency: function(state, value) {
                state.sessionFrequency = value;
            }
        };

        return countlyVue.vuex.Module("countlySessionFrequency", {
            state: getInitialState,
            actions: sessionFrequencyActions,
            mutations: sessionFrequencyMutations,
            submodules: [countlyVue.vuex.FetchMixin()]
        });
    };
}(window.countlySessionFrequency = window.countlySessionFrequency || {}));