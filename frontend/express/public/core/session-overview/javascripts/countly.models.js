/*global countlyVue,countlySession,countlyTotalUsers,Promise*/
(function(countlySessionOverview) {

    countlySessionOverview.service = {

        mapSessionOverviewSeries: function(dto) {
            return Object.keys(dto.chartDP).map(function(key) {
                return {
                    data: dto.chartDP[key].data.reduce(function(totalData, dataItems) {
                        totalData.push(dataItems[1]);
                        return totalData;
                    }, []),
                    label: dto.chartDP[key].label
                };
            });
        },
        mapSessionOverviewRows: function(dto) {
            var rows = [];
            dto.chartData.map(function(chartDataItem, index) {
                rows[index] = {
                    date: chartDataItem.date,
                    totalSessions: chartDataItem.t,
                    newSessions: chartDataItem.n,
                    uniqueSessions: chartDataItem.u
                };
            });
            return rows;
        },

        mapSessionOverviewDtoToModel: function(dto) {
            var sessionOverviewModel = {
                series: [],
                rows: []
            };
            sessionOverviewModel.series = this.mapSessionOverviewSeries(dto);
            sessionOverviewModel.rows = this.mapSessionOverviewRows(dto);
            return sessionOverviewModel;
        },

        fetchSessionOverview: function() {
            var self = this;
            return new Promise(function(resolve, reject) {
                Promise.all([countlySession.initialize(), countlyTotalUsers.initialize("users")])
                    .then(function() {
                        var sessionDP = countlySession.getSessionDP();
                        resolve(self.mapSessionOverviewDtoToModel(sessionDP));
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
                isLoading: false,
                hasError: false,
                error: null
            };
        };

        var sessionOverviewActions = {
            fetchAll: function(context, useLoader) {
                if (useLoader) {
                    context.dispatch('onFetchInit');
                }
                countlySessionOverview.service.fetchSessionOverview(context.state.selectedDatePeriod)
                    .then(function(response) {
                        context.commit('setSessionOverview', response);
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

        var sessionOverviewMutations = {
            setSessionOverview: function(state, value) {
                state.sessionOverview = value;
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