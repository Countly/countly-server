/*global countlyVue,CV,countlyCommon,countlySession */
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
        replaceAllSpecialChars: function(value) {
            return value.replace(/&amp;/g, '&').replace(/&lt;/, '<').replace(/&gt;/, '>').replace(/&equals;/, '=');
        },
        findNonEmptyBuckets: function(userActivityDto) {
            var self = this;
            var nonEmptybuckets = [];
            Object.keys(userActivityDto).forEach(function(userActivityKey) {
                var userActivitySerie = userActivityDto[userActivityKey];
                userActivitySerie.forEach(function(serieItem) {
                    if (serieItem._id && !countlyUserActivity.helpers.isBucketAdded(nonEmptybuckets, serieItem._id)) {
                        nonEmptybuckets.push(self.replaceAllSpecialChars(serieItem._id));
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
            var data = {
                app_id: countlyCommon.ACTIVE_APP_ID
            };
            if (filters) {
                data.query = JSON.stringify(filters);
            }
            return new Promise(function(resolve, reject) {
                CV.$.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.r + '/app_users/loyalty',
                    data: data,
                    dataType: "json",
                }, {disableAutoCatch: true}).then(function(response) {
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
            };
        };

        var userActivityActions = {
            fetchAll: function(context, useLoader) {
                context.dispatch('onFetchInit', {useLoader: useLoader});
                countlyUserActivity.service.fetchUserActivity(context.state.userActivityFilters.query)
                    .then(function(response) {
                        context.commit('setUserActivity', response.model);
                        context.commit('setNonEmptyBuckets', response.nonEmptyBuckets);
                        context.dispatch('findSeriesTotal', response.model);
                        context.dispatch('onFetchSuccess', {useLoader: useLoader});
                    }).catch(function(error) {
                        context.dispatch('onFetchError', {error: error, useLoader: useLoader});
                    });
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
        };
        return countlyVue.vuex.Module("countlyUserActivity", {
            state: getInitialState,
            actions: userActivityActions,
            mutations: userActivityMutations,
            submodules: [countlyVue.vuex.FetchMixin()]
        });
    };
}(window.countlyUserActivity = window.countlyUserActivity || {}));