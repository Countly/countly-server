/*global window, countlyVue, CV, countlyCommon, countlySession, CountlyHelpers, Promise*/
(function(countlySessionDurations) {

    countlySessionDurations.service = {
        mapSessionDurationsDtoToModel: function(dto, period) {
            countlySession.setDb(dto);
            countlyCommon.setPeriod(period);
            var sessionData = countlySession.getRangeData("ds", "d-ranges", countlySession.explainDurationRange, countlySession.getDurationRange());
            var sessionDurationsModel = {
                series: [],
                rows: []
            };
            var sessionDurationsSerieData = sessionData.chartData.map(function(chartDataItem) {
                return chartDataItem.t;
            });
            sessionDurationsModel.series.push({data: sessionDurationsSerieData, label: CV.i18n("session-durations.title")});
            sessionData.chartData.forEach(function(chartDataItem, index) {
                sessionDurationsModel.rows[index] = {
                    duration: chartDataItem.ds,
                    numberOfSessions: chartDataItem.t,
                    percentage: chartDataItem.percentageNumber
                };
            });
            return sessionDurationsModel;
        },

        fetchSessionDurations: function(period) {
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
                    resolve(self.mapSessionDurationsDtoToModel(response, period));
                }).catch(function(error) {
                    reject(error);
                });
            });
        }
    };

    countlySessionDurations.getVuexModule = function() {

        var getInitialState = function() {
            return {
                sessionDurations: {
                    rows: [],
                    series: []
                },
                selectedDatePeriod: "day",
                sessionDurationsDatePeriods: [],
                isLoading: false,
                hasError: false,
                error: null
            };
        };

        var sessionDurationsActions = {
            fetchAll: function(context) {
                context.dispatch('onFetchInit');
                countlySessionDurations.service.fetchSessionDurations(context.state.selectedDatePeriod)
                    .then(function(response) {
                        context.commit('setSessionDurations', response);
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

        var sessionDurationsMutations = {
            setSessionDurations: function(state, value) {
                state.sessionDurations = value;
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

        return countlyVue.vuex.Module("countlySessionDurations", {
            state: getInitialState,
            actions: sessionDurationsActions,
            mutations: sessionDurationsMutations
        });
    };
}(window.countlySessionDurations = window.countlySessionDurations || {}));