/*global $, jQuery, countlyCommon, moment, countlyVue*/

(function(countlyVueExample) {

    countlyVueExample.initialize = function() {}

    countlyVueExample.getVuexModule = function() {
        return {
            name: "vueExample",
            module: {
                namespaced: true,
            }
        }
    }

})(window.countlyVueExample = window.countlyVueExample || {});