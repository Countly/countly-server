/*global $, jQuery, countlyCommon, moment, countlyVue*/

(function(countlyVueExample) {

    var _store = null;

    countlyVueExample.initialize = function() {
        _store = new Vuex.store({});
    }

})(window.countlyVueExample = window.countlyVueExample || {});