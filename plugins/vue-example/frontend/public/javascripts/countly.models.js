/*global */

(function(countlyVueExample) {

    countlyVueExample.initialize = function() {};

    countlyVueExample.getVuexModule = function() {
        return {
            name: "vueExample",
            module: {
                namespaced: true,
                state: {
                    pairs: []
                },
                getters: {
                    pairs: function(state) {
                        return state.pairs;
                    }
                },
                mutations: {
                    addPair: function(state, obj) {
                        state.pairs.push([obj.name, obj.value]);
                    }
                }
            }
        };
    };

})(window.countlyVueExample = window.countlyVueExample || {});