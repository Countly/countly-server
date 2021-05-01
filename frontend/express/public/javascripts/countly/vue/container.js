/* global  */

(function(countlyVue) {

    /**
     * Container is a simple class that stores objects
     */
    function Container() {
        this._records = {};
    }

    Container.prototype.register = function(id, value) {
        if (!Object.prototype.hasOwnProperty.call(this._records, id)) {
            this._records[id] = [];
        }
        this._records[id].push(Object.freeze(value));
    };

    Container.prototype.mixin = function(mapping) {
        var self = this;
        var mixin = {
            data: function() {
                return Object.keys(mapping).reduce(function(acc, val) {
                    acc[val] = self._records[mapping[val]];
                    return acc;
                }, {});
            }
        };
        return mixin;
    };

    countlyVue.container = new Container();

}(window.countlyVue = window.countlyVue || {}));
