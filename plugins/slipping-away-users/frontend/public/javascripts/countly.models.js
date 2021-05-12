/*global countlyCommon,jQuery,countlyVue*/
(function(countlySlippingAwayUsers, $) {

    countlySlippingAwayUsers.helpers = {
        buildFilters: function(filters) {
            var newQuery = {};
            if (filters.query) {
                Object.keys(filters.query).forEach(function(queryItem) {
                    var propertyValue = filters.query[queryItem];
                    var propertyNameWithoutUp = queryItem.split('.')[1];
                    newQuery[propertyNameWithoutUp] = propertyValue;
                });
            }
            return newQuery;
        }
    };

    countlySlippingAwayUsers.service = {
        fetchSlippingAwayUsers: function(filters, callback) {
            $.ajax({
                type: "GET",
                url: countlyCommon.API_URL + "/o/slipping",
                data: {
                    app_id: countlyCommon.ACTIVE_APP_ID,
                    method: 'slipping',
                    query: JSON.stringify(countlySlippingAwayUsers.helpers.buildFilters(filters))
                },
                success: function(json) {
                    callback(null, json);
                },
                error: function(error) {
                    callback(error, null);
                }
            });
        }
    };

    countlySlippingAwayUsers.getVuexModule = function() {
        var getInitialState = function() {
            return {
                slippingAwayUsers: [],
                slippingAwayUsersFilters: { query: {}, byVal: []},
                isLoading: false,
                hasError: false,
                error: null,
            };
        };

        var slippingAwayUsersActions = {
            fetchSlippingAwayUsers: function(context) {
                context.dispatch('onFetchInit');
                countlySlippingAwayUsers.service.fetchSlippingAwayUsers(context.state.slippingAwayUsersFilters, function(error, response) {
                    if (error) {
                        context.dispatch('onFetchError', error);
                    }
                    else {
                        context.commit('setSlippingAwayUsers', response);
                        context.dispatch('onFetchSuccess');
                    }
                });
            },
            onFetchInit: function(context) {
                context.commit('fetchInit');
            },
            onFetchError: function(context, error) {
                context.commit('fetchError', error);
            },
            onFetchSuccess: function(context) {
                context.commit('fetchSuccess');
            },
            onSetSlippingAwayUsersFilters: function(context, filters) {
                context.commit('setSlippingAwayUsersFilters', filters);
            }
        };

        var slippingAwayUsersMutations = {
            setSlippingAwayUsers: function(state, value) {
                state.slippingAwayUsers = value;
            },
            setSlippingAwayUsersFilters: function(state, value) {
                state.slippingAwayUsersFilters = value;
            },
            fetchInit: function(state) {
                state.isLoading = true;
                state.hasError = false;
                state.error = null;
            },
            fetchError: function(state, error) {
                state.isLoading = false;
                state.hasError = true;
                state.error = error;
            },
            fetchSuccess: function(state) {
                state.isLoading = false;
                state.hasError = false;
                state.error = null;
            }
        };

        return countlyVue.vuex.Module("countlySlippingAwayUsers", {
            state: getInitialState,
            actions: slippingAwayUsersActions,
            mutations: slippingAwayUsersMutations,
        });
    };
}(window.countlySlippingAwayUsers = window.countlySlippingAwayUsers || {}, jQuery));