import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import { ajax } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { Module, FetchMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/data/vuex.js';

var service = {
    mapSeries: function(dto) {
        return dto.map(function(item) {
            return item.count;
        });
    },
    mapDtoToModel: function(dto) {
        var slippingAwayUsersModel = {
            series: [],
            rows: []
        };
        slippingAwayUsersModel.series = this.mapSeries(dto);
        slippingAwayUsersModel.rows = dto;
        return slippingAwayUsersModel;
    },
    fetchSlippingAwayUsers: function(filters) {
        var self = this;
        var data = {
            app_id: countlyCommon.ACTIVE_APP_ID,
            method: 'slipping',
            query: JSON.stringify(filters)
        };
        if (filters) {
            data.query = JSON.stringify(filters);
        }
        return new Promise(function(resolve, reject) {
            ajax({
                type: "GET",
                url: countlyCommon.API_URL + "/o/slipping",
                data: data
            }, {disableAutoCatch: true})
                .then(function(response) {
                    resolve(self.mapDtoToModel(response));
                }).catch(function(error) {
                    reject(error);
                });
        });
    }
};

var getInitialState = function() {
    return {
        rows: [],
        series: [],
        filters: { query: {}, byVal: []},
    };
};

var slippingAwayUsersActions = {
    fetchAll: function(context, useLoader) {
        context.dispatch('onFetchInit', {useLoader: useLoader});
        service.fetchSlippingAwayUsers(context.state.filters.query)
            .then(function(response) {
                context.commit('setSlippingAwayUsers', response);
                context.dispatch('onFetchSuccess', {useLoader: useLoader});
            }).catch(function(error) {
                context.dispatch('onFetchError', {error: error, useLoader: useLoader});
            });
    },
    onSetFilters: function(context, filters) {
        context.commit('setFilters', filters);
    }
};

var slippingAwayUsersMutations = {
    setSlippingAwayUsers: function(state, value) {
        state.rows = value.rows;
        state.series = value.series;
    },
    setFilters: function(state, value) {
        state.filters = value;
    }
};

var countlySlippingAwayUsers = {
    getVuexModule: function() {
        return Module("countlySlippingAwayUsers", {
            state: getInitialState,
            actions: slippingAwayUsersActions,
            mutations: slippingAwayUsersMutations,
            submodules: [FetchMixin()]
        });
    }
};

export default countlySlippingAwayUsers;
