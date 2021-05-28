/*global window, countlyVue, CV, countlyCommon, countlySession, CountlyHelpers, Promise*/
(function(countlySessionsOverview) {

    countlySessionsOverview.service = {

        extractSessionsData: function(dto) {
            var chartData = [
                    { data: [], label: 'totalSessions' },
                    { data: [], label: 'newSessions' },
                    { data: [], label: 'uniqueSessions' }
                ],
                dataProps = [
                    { name: "t" },
                    { name: "n" },
                    { name: "u" }
                ];

            return countlyCommon.extractChartData(dto, countlySession.clearObject, chartData, dataProps);
        },

        mapSessionsOverviewDtoToModel: function(dto) {
            var sessionsData = this.extractSessionsData(dto);
            var sessionsOverviewModel = {
                series: {},
                rows: []
            };
            sessionsData.chartDP.forEach(function(chartDPItem) {
                sessionsOverviewModel.series[chartDPItem.label] = chartDPItem.data.map(function(chartDpItemSerie) {
                    return chartDpItemSerie[1];
                });
            });
            sessionsData.chartData.forEach(function(chartDataItem, index) {
                sessionsOverviewModel.rows[index] = {
                    date: chartDataItem.date,
                    totalSessions: chartDataItem.t,
                    newSessions: chartDataItem.n,
                    uniqueSessions: chartDataItem.u
                };
            });
            return sessionsOverviewModel;
        },

        fetchSessions: function(period) {
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
                    resolve(self.mapSessionsOverviewDtoToModel(response));
                }).catch(function(error) {
                    reject(error);
                });
            });
        }
    };

    countlySessionsOverview.getVuexModule = function() {

        var getInitialState = function() {
            return {
                sessionsOverview: {
                    rows: [],
                    series: {}
                },
                selectedDatePeriod: "day",
                sessionsOverviewDatePeriods: [],
                isLoading: false,
                hasError: false,
                error: null
            };
        };

        var sessionsOverviewActions = {
            fetchAll: function(context) {
                context.dispatch('onFetchInit');
                countlyCommon.setPeriod(context.state.selectedDatePeriod);
                countlySessionsOverview.service.fetchSessions(context.state.selectedDatePeriod)
                    .then(function(response) {
                        context.commit('setSessionsOverview', response);
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

        var sessionsOverviewMutations = {
            setSessionsOverview: function(state, value) {
                state.sessionsOverview = value;
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

        return countlyVue.vuex.Module("countlySessionsOverview", {
            state: getInitialState,
            actions: sessionsOverviewActions,
            mutations: sessionsOverviewMutations
        });
    };
}(window.countlySessionsOverview = window.countlySessionsOverview || {}));