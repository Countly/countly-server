/*global window, countlyVue, CV, countlyCommon, countlyGlobal, countlySession, CountlyHelpers, Promise */
(function(countlyUserActivity) {

    countlyUserActivity.helpers = {
        isBucketAdded: function(data, element) {
            return data.some(function(item) {
                return item === element;
            });
        },

        getNonNumericSeriePropertyName: function(name) {
            if (name === '7days') {
                return 'sevenDays';
            }
            if (name === '30days') {
                return 'thirtyDays';
            }
            return name;
        },

        getSerieTotal: function(serie) {
            return serie.reduce(function(total, currentItem) {
                total += currentItem.count;
                return total;
            }, 0);
        },

        findNonEmptyBuckets: function(userActivityDto) {
            var nonEmptybuckets = [];
            Object.keys(userActivityDto).forEach(function(userActivityKey) {
                var userActivitySerie = userActivityDto[userActivityKey];
                userActivitySerie.forEach(function(serieItem) {
                    if (serieItem._id && !countlyUserActivity.helpers.isBucketAdded(nonEmptybuckets, serieItem._id)) {
                        nonEmptybuckets.push(serieItem._id);
                    }
                });
            });
            return nonEmptybuckets;
        }
    };

    countlyUserActivity.service = {


        mapUserActivityDtoToModel: function(responseDto, nonEmptyBuckets) {
            var modelResult = {};
            Object.keys(responseDto).forEach(function(key) {
                var nonNumericSeriePropertyName = countlyUserActivity.helpers.getNonNumericSeriePropertyName(key);
                modelResult[nonNumericSeriePropertyName] = [];
                nonEmptyBuckets.forEach(function(nonEmptyBucket) {
                    if (!responseDto[key].length) {
                        modelResult[nonNumericSeriePropertyName].push({_id: nonEmptyBucket, count: 0});
                    }
                    else {
                        var seriesItemIndex = responseDto[key].findIndex(function(item) {
                            return item._id === nonEmptyBucket;
                        });
                        if (seriesItemIndex === -1) {
                            modelResult[nonNumericSeriePropertyName].push({_id: nonEmptyBucket, count: 0 });
                        }
                        else {
                            modelResult[nonNumericSeriePropertyName].push({_id: nonEmptyBucket, count: responseDto[key][seriesItemIndex].count });

                        }
                    }
                });
            });
            return modelResult;
        },

        fetchUserActivity: function(filters) {
            var self = this;
            return new Promise(function(resolve, reject) {
                CV.$.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.r + '/app_users/loyalty',
                    data: {
                        app_id: countlyCommon.ACTIVE_APP_ID,
                        api_key: countlyGlobal.member.api_key,
                        query: JSON.stringify(CountlyHelpers.buildFilters(filters))
                    },
                    dataType: "json",
                }).then(function(response) {
                    var nonEmptyBuckets = countlyUserActivity.helpers.findNonEmptyBuckets(response);
                    resolve({model: self.mapUserActivityDtoToModel(response, nonEmptyBuckets), nonEmptyBuckets: nonEmptyBuckets});
                }).catch(function(error) {
                    reject(error);
                });
            });
        }
    };

    countlyUserActivity.getVuexModule = function() {

        var getInitialState = function() {
            return {
                userActivity: {},
                seriesTotal: {},
                nonEmptyBuckets: countlySession.getLoyalityRange(),
                userActivityFilters: {query: {}, byVal: []},
                isLoading: false,
                hasError: false,
                error: null
            };
        };

        var userActivityActions = {
            fetchAll: function(context) {
                context.dispatch('onFetchInit');
                countlyUserActivity.service.fetchUserActivity(context.state.userActivityFilters)
                    .then(function(response) {
                        context.commit('setUserActivity', response.model);
                        context.commit('setNonEmptyBuckets', response.nonEmptyBuckets);
                        context.dispatch('findSeriesTotal', response.model);
                        context.dispatch('onFetchSuccess');
                    }).catch(function(error) {
                        context.dispatch('onFetchError', error);
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
            onSetUserActivityFilters: function(context, filters) {
                context.commit('setUserActivityFilters', filters);
            },
            findSeriesTotal: function(context, userActivity) {
                var result = {};
                Object.keys(userActivity).forEach(function(userActivityKey) {
                    result[userActivityKey] = countlyUserActivity.helpers.getSerieTotal(userActivity[userActivityKey]);
                });
                context.commit('setSeriesTotal', result);
            }
        };

        var userActivityMutations = {
            setUserActivity: function(state, value) {
                state.userActivity = value;
            },
            setUserActivityFilters: function(state, value) {
                state.userActivityFilters = value;
            },
            setNonEmptyBuckets: function(state, value) {
                state.nonEmptyBuckets = value;
            },
            setSeriesTotal: function(state, result) {
                state.seriesTotal = result;
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
        return countlyVue.vuex.Module("countlyUserActivity", {
            state: getInitialState,
            actions: userActivityActions,
            mutations: userActivityMutations
        });
    };
}(window.countlyUserActivity = window.countlyUserActivity || {}));