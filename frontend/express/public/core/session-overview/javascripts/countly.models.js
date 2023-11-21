/*global countlyVue,countlySession,countlyTotalUsers,CV,countlyCommon*/
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
        mapTrendDto: function(trendDto) {
            if (trendDto === 'u') {
                return 'up';
            }
            if (trendDto === 'd') {
                return 'down';
            }
            return null;
        },
        mapChangeDto: function(changeDto) {
            if (changeDto === 'NA') {
                return null;
            }
            return changeDto.split('%')[0];
        },
        mapSessionOverviewTrends: function(dto) {
            return [
                {
                    name: CV.i18n("common.total-sessions"),
                    value: countlyCommon.formatNumber(dto.usage['total-sessions'].total),
                    percentage: this.mapChangeDto(dto.usage['total-sessions'].change),
                    trend: this.mapTrendDto(dto.usage['total-sessions'].trend),
                    tooltip: CV.i18n("common.total-sessions-description")
                },
                {
                    name: CV.i18n("common.new-sessions"),
                    value: countlyCommon.formatNumber(dto.usage['new-users'].total),
                    percentage: this.mapChangeDto(dto.usage['new-users'].change),
                    trend: this.mapTrendDto(dto.usage['new-users'].trend),
                    tooltip: CV.i18n("common.new-sessions-description")
                },
                {
                    name: CV.i18n("common.unique-sessions"),
                    value: countlyCommon.formatNumber(dto.usage['unique-sessions'].total),
                    tooltip: CV.i18n("common.unique-sessions-description"),
                    isEstimate: dto.usage['unique-sessions'].isEstimate,
                    estimateTooltip: CV.i18n("users.total-users-estimate-tooltip")
                }
            ];
        },
        mapSessionOverviewDtoToModel: function(dpDto, dataDto) {
            var sessionOverviewModel = {
                series: [],
                rows: [],
                trends: []
            };
            sessionOverviewModel.series = this.mapSessionOverviewSeries(dpDto);
            sessionOverviewModel.rows = this.mapSessionOverviewRows(dpDto);
            sessionOverviewModel.trends = this.mapSessionOverviewTrends(dataDto);
            return sessionOverviewModel;
        },

        fetchSessionOverview: function() {
            var self = this;
            return new Promise(function(resolve, reject) {
                Promise.all([countlySession.initialize(), countlyTotalUsers.initialize("users")])
                    .then(function() {
                        var sessionDP = countlySession.getSessionDP();
                        var sessionData = countlySession.getSessionData();
                        sessionData.usage['unique-sessions'] = sessionData.usage['total-users'];
                        resolve(self.mapSessionOverviewDtoToModel(sessionDP, sessionData));
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
                    series: [],
                    trends: []
                }
            };
        };

        var sessionOverviewActions = {
            fetchAll: function(context, useLoader) {
                context.dispatch('onFetchInit', {useLoader: useLoader});
                countlySessionOverview.service.fetchSessionOverview()
                    .then(function(response) {
                        context.commit('setSessionOverview', response);
                        context.dispatch('onFetchSuccess', {useLoader: useLoader});
                    }).catch(function(error) {
                        context.dispatch('onFetchError', {error: error, useLoader: useLoader});
                    });
            }
        };

        var sessionOverviewMutations = {
            setSessionOverview: function(state, value) {
                state.sessionOverview = value;
            }
        };
        return countlyVue.vuex.Module("countlySessionOverview", {
            state: getInitialState,
            actions: sessionOverviewActions,
            mutations: sessionOverviewMutations,
            submodules: [countlyVue.vuex.FetchMixin()]
        });
    };
}(window.countlySessionOverview = window.countlySessionOverview || {}));