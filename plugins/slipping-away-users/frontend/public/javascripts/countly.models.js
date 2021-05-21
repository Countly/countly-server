/*global countlyCommon,countlyVue,CV,CountlyHelpers*/
(function(countlySlippingAwayUsers) {

    countlySlippingAwayUsers.service = {
        fetchSlippingAwayUsers: function(filters) {
            return CV.$.ajax({
                type: "GET",
                url: countlyCommon.API_URL + "/o/slipping",
                data: {
                    app_id: countlyCommon.ACTIVE_APP_ID,
                    method: 'slipping',
                    query: JSON.stringify(CountlyHelpers.buildFilters(filters))
                }
            }, {disableAutoCatch: true});
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
            fetchAll: function(context) {
                context.dispatch('onFetchInit');
                countlySlippingAwayUsers.service.fetchSlippingAwayUsers(context.state.slippingAwayUsersFilters)
                    .then(function(response) {
                        context.commit('setSlippingAwayUsers', response);
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

        return countlyVue.vuex.Module("countlySlippingAwayUsers", {
            state: getInitialState,
            actions: slippingAwayUsersActions,
            mutations: slippingAwayUsersMutations,
        });
    };
}(window.countlySlippingAwayUsers = window.countlySlippingAwayUsers || {}));