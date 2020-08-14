/*global $, countlyCommon */

(function(countlyVueExample) {

    countlyVueExample.initialize = function() {};

    countlyVueExample.getVuexModule = function() {
        return {
            name: "vueExample",
            module: {
                namespaced: true,
                state: {
                    pairs: [],
                    randomNumbers: [],
                    id: 0
                },
                getters: {
                    pairs: function(state) {
                        return state.pairs;
                    },
                    randomNumbers: function(state) {
                        return state.randomNumbers;
                    }
                },
                mutations: {
                    addPair: function(state, obj) {
                        state.pairs.push({_id: state.id, status: false, name: obj.name, value: obj.value});
                        state.id++;
                    },
                    deletePairById: function(state, _id) {
                        state.pairs = state.pairs.filter(function(val) {
                            return val._id !== _id;
                        });
                    },
                    setRandomNumbers: function(state, obj) {
                        state.randomNumbers = obj;
                    }
                },
                actions: {
                    updateRandomArray: function(context) {
                        return $.when($.ajax({
                            type: "GET",
                            url: countlyCommon.API_URL + "/o",
                            data: {
                                app_id: countlyCommon.ACTIVE_APP_ID,
                                method: 'get-random-numbers'
                            }
                        })).then(function(json) {
                            context.commit("setRandomNumbers", json);
                        }, function() {
                            /* handle error */
                        });
                    }
                }
            }
        };
    };

})(window.countlyVueExample = window.countlyVueExample || {});