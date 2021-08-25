/*global countlyVue,CV,countlySession,Promise*/
(function(countlySessionDurations) {

    countlySessionDurations.service = {

        mapSessionDurationsSeries: function(dto) {
            var sessionDurationsSerieData = dto.chartData.map(function(chartDataItem) {
                return chartDataItem.t;
            });
            return [{data: sessionDurationsSerieData, label: CV.i18n("session-durations.title")}]
        },
        mapSessionDurationsRows: function(dto) {
            var rows = [];
            dto.chartData.forEach(function(chartDataItem, index) {
                rows[index] = {
                    duration: chartDataItem.ds,
                    numberOfSessions: chartDataItem.t,
                    percentage: chartDataItem.percentageNumber
                };
            });
            return rows;
        },
        mapSessionDurationsDtoToModel: function(dto) {
            var sessionDurationsModel = {
                series: [],
                rows: []
            };
            sessionDurationsModel.series = this.mapSessionDurationsSeries(dto);
            sessionDurationsModel.rows = this.mapSessionDurationsRows(dto);
            return sessionDurationsModel;
        },
        fetchSessionDurations: function() {
            var self = this;
            return new Promise(function(resolve, reject) {
                countlySession.initialize()
                    .then(function() {
                        var sessionData = countlySession.getRangeData("ds", "d-ranges", countlySession.explainDurationRange, countlySession.getDurationRange());
                        resolve(self.mapSessionDurationsDtoToModel(sessionData));
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
                isLoading: false,
                hasError: false,
                error: null
            };
        };

        var sessionDurationsActions = {
            fetchAll: function(context, useLoader) {
                if (useLoader) {
                    context.dispatch('onFetchInit');
                }
                countlySessionDurations.service.fetchSessionDurations()
                    .then(function(response) {
                        context.commit('setSessionDurations', response);
                        if (useLoader) {
                            context.dispatch('onFetchSuccess');
                        }
                    }).catch(function(error) {
                        if (useLoader) {
                            context.dispatch('onFetchError', error);
                        }
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
        };

        var sessionDurationsMutations = {
            setSessionDurations: function(state, value) {
                state.sessionDurations = value;
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