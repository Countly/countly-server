/*global window, countlyVue, CV, countlyCommon, countlySession, CountlyHelpers, Promise*/
(function(countlySessionFrequency) {
    countlySessionFrequency.service = {
        mapSessionFrequencyDtoToModel: function(dto, period) {
            countlySession.setDb(dto);
            countlyCommon.setPeriod(period);
            var frequencyData = countlySession.getRangeData("f", "f-ranges", countlySession.explainFrequencyRange, countlySession.getFrequencyRange());
            var sessionFrequencyModel = {
                series: [],
                rows: []
            };
            var sessionFrequencySerieData = frequencyData.chartData.map(function(chartDataItem) {
                return chartDataItem.t;
            });
            sessionFrequencyModel.series.push({data: sessionFrequencySerieData, label: CV.i18n("session-frequency.title")});
            frequencyData.chartData.forEach(function(chartDataItem, index) {
                sessionFrequencyModel.rows[index] = {
                    frequency: chartDataItem.f,
                    numberOfSessions: chartDataItem.t,
                    percentage: chartDataItem.percentageNumber
                };
            });
            return sessionFrequencyModel;
        },

        fetchSessionFrequency: function(period) {
            var self = this;
            var data = {
                app_id: countlyCommon.ACTIVE_APP_ID,
                method: 'users',
            };
            if (period) {
                data.period = CountlyHelpers.getPeriodUrlQueryParameter(period);
            }
            return new Promise(function(resolve, reject) {
                CV.$.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.r,
                    data: data,
                    dataType: "json",
                }).then(function(response) {
                    resolve(self.mapSessionFrequencyDtoToModel(response, period));
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
                selectedDatePeriod: "day",
                sessionFrequencyDatePeriods: [],
                isLoading: false,
                hasError: false,
                error: null
            };
        };

        var sessionFrequencyActions = {
            fetchAll: function(context) {
                context.dispatch('onFetchInit');
                countlySessionFrequency.service.fetchSessionFrequency(context.state.selectedDatePeriod)
                    .then(function(response) {
                        context.commit('setSessionFrequency', response);
                        context.dispatch('onFetchSuccess');
                    }).catch(function(error) {
                        context.dispatch('onFetchError', error);
                    });
            },
            onSetSelectedDatePeriod: function(context, period) {
                context.commit('setSelectedDatePeriod', period);
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
        };

        var sessionFrequencyMutations = {
            setSessionFrequency: function(state, value) {
                state.sessionFrequency = value;
            },
            setSelectedDatePeriod: function(state, value) {
                state.selectedDatePeriod = value;
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
            }
        };

        return countlyVue.vuex.Module("countlySessionFrequency", {
            state: getInitialState,
            actions: sessionFrequencyActions,
            mutations: sessionFrequencyMutations
        });
    };
}(window.countlySessionFrequency = window.countlySessionFrequency || {}));