/*global $, jQuery, countlyCommon, moment, countlyVue*/

(function(countlyVueExample) {

    countlyVueExample.initialize = function() {}

    countlyVueExample.getVuexModule = function() {
        return {
            name: "vueExample",
            module: {
                namespaced: true,
                state: {
                    count: 0
                },
                mutations: {
                    increment: function(state) {
                        state.count++
                    }
                }
            }
        }
    }

})(window.countlyVueExample = window.countlyVueExample || {});