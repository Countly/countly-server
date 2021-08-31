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
            };
        };

        var slippingAwayUsersActions = {
            fetchAll: function(context, useLoader) {
                context.dispatch('onFetchInit', {useLoader: useLoader});
                countlySlippingAwayUsers.service.fetchSlippingAwayUsers(context.state.slippingAwayUsersFilters)
                    .then(function(response) {
                        context.commit('setSlippingAwayUsers', response);
                        context.dispatch('onFetchSuccess', {useLoader: useLoader});
                    }).catch(function(error) {
                        context.dispatch('onFetchError', {error: error, useLoader: useLoader});
                    });
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
            }
        };

        return countlyVue.vuex.Module("countlySlippingAwayUsers", {
            state: getInitialState,
            actions: slippingAwayUsersActions,
            mutations: slippingAwayUsersMutations,
            submodules: [countlyVue.vuex.FetchMixin()]
        });
    };
}(window.countlySlippingAwayUsers = window.countlySlippingAwayUsers || {}));