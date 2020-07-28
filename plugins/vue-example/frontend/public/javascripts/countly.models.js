/*global $, jQuery, countlyCommon, moment, Vuex*/

(function(countlyVueExample) {

    var _store = null;

    countlyVueExample.initialize = function() {
        _store = new Vuex.store({});
    }
    
    countlyVueExample.getMetricData = function() {
        return _data;
    };

})(window.countlyVueExample = window.countlyVueExample || {});