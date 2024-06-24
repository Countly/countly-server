/*global countlyCommon,countlyVue, CV*/

(function(countlyContentBuilder) {

    countlyContentBuilder.service = {
        loadAssets: function() {
            return CV.$.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r + "/content/assets",
            }, {"disableAutoCatch": true});
        },

    };

    countlyContentBuilder.getVuexModule = function() {
        var getEmptyState = function() {
            return {
                assets: []
            };
        };

        var getters = {
            assets: function(state) {
                return state.assets;
            }
        };

        var actions = {
            fetchAssets: function(context) {
                return countlyContentBuilder.service.loadAssets().then(function(data) {
                    if (data === 'Error') {
                        data = [];
                    }
                    context.commit("setAssets", data);
                });
            }
        };

        var mutations = {
            setAssets: function(state, assets) {
                state.assets = assets;
            }
        };
        return countlyVue.vuex.Module("countlyContentBuilder", {
            state: getEmptyState,
            getters: Object.assign({}, getters),
            actions: Object.assign({}, actions),
            mutations: Object.assign({}, mutations),
            submodules: []
        });
    };

}(window.countlyContentBuilder = window.countlyContentBuilder || {}));