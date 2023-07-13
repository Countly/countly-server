/*global countlyVue,CV,countlySession*/
(function(countlySessionDurations) {

    countlySessionDurations.service = {

        mapSessionDurationsSeries: function(dto) {
            var sessionDurationsSerieData = dto.chartData.map(function(chartDataItem) {
                return chartDataItem.t;
            });
            return [{data: sessionDurationsSerieData, label: CV.i18n("session-durations.title")}];
        },
        mapSessionDurationsRows: function(dto) {
            var rows = [];
            dto.chartData.forEach(function(chartDataItem, index) {
                rows[index] = {
                    duration: chartDataItem.ds,
                    weight: index,
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
            };
        };

        var sessionDurationsActions = {
            fetchAll: function(context, useLoader) {
                context.dispatch('onFetchInit', {useLoader: useLoader});
                countlySessionDurations.service.fetchSessionDurations()
                    .then(function(response) {
                        context.commit('setSessionDurations', response);
                        context.dispatch('onFetchSuccess', {useLoader: useLoader});
                    }).catch(function(error) {
                        context.dispatch('onFetchError', {error: error, useLoader: useLoader});
                    });

            },
        };

        var sessionDurationsMutations = {
            setSessionDurations: function(state, value) {
                state.sessionDurations = value;
            },
        };

        return countlyVue.vuex.Module("countlySessionDurations", {
            state: getInitialState,
            actions: sessionDurationsActions,
            mutations: sessionDurationsMutations,
            submodules: [countlyVue.vuex.FetchMixin()]
        });
    };
}(window.countlySessionDurations = window.countlySessionDurations || {}));