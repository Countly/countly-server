/*global window, countlyVue, CV, countlyCommon, countlySession, CountlyHelpers, Promise*/
(function(countlySessionOverview) {

    countlySessionOverview.service = {

        mapSessionOverviewDtoToModel: function(dto, period) {
            countlySession.setDb(dto);
            countlyCommon.setPeriod(period);
            var sessionData = countlySession.getSessionDP();
            var sessionOverviewModel = {
                series: [],
                rows: []
            };
            sessionOverviewModel.series = sessionData.chartDP;
            sessionData.chartData.forEach(function(chartDataItem, index) {
                sessionOverviewModel.rows[index] = {
                    date: chartDataItem.date,
                    totalSessions: chartDataItem.t,
                    newSessions: chartDataItem.n,
                    uniqueSessions: chartDataItem.u
                };
            });
            return sessionOverviewModel;
        },

        fetchSessionOverview: function(period) {
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
                    resolve(self.mapSessionOverviewDtoToModel(response, period));
                }).catch(function(error) {
                    reject(error);
                });
            });
        }
    };

    countlySessionOverview.getVuexModule = function() {

        var getInitialState = function() {
            return {
                sessionOverview: {
                    rows: [],
                    series: []
                },
                selectedDatePeriod: "day",
                isLoading: false,
                hasError: false,
                error: null
            };
        };

        var sessionOverviewActions = {
            fetchAll: function(context) {
                context.dispatch('onFetchInit');
                countlySessionOverview.service.fetchSessionOverview(context.state.selectedDatePeriod)
                    .then(function(response) {
                        context.commit('setSessionOverview', response);
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

        var sessionOverviewMutations = {
            setSessionOverview: function(state, value) {
                state.sessionOverview = value;
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

        return countlyVue.vuex.Module("countlySessionOverview", {
            state: getInitialState,
            actions: sessionOverviewActions,
            mutations: sessionOverviewMutations
        });
    };
}(window.countlySessionOverview = window.countlySessionOverview || {}));