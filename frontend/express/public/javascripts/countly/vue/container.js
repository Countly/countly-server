/* global  */

(function(countlyVue) {

    /**
     * Container is a simple class that stores objects
     */
    function Container() {
        this.dict = {};
    }

    Container.prototype.register = function(id, value) {
        if (!Object.prototype.hasOwnProperty.call(this.dict, id)) {
            this.dict[id] = {};
        }

        if (!Object.prototype.hasOwnProperty.call(this.dict[id], "items")) {
            this.dict[id].items = [];
        }

        var _items = this.dict[id].items;
        if (!Object.prototype.hasOwnProperty.call(value, 'priority')) {
            _items.push(Object.freeze(value));
        }
        else {
            var found = false,
                i = 0;

            while (!found && i < _items.length) {
                if (!Object.prototype.hasOwnProperty.call(_items[i], 'priority') || _items[i].priority > value.priority) {
                    found = true;
                }
                else {
                    i++;
                }
            }
            _items.splice(i, 0, value);
        }
    };

    Container.prototype.registerMixin = function(id, mixin) {
        if (!Object.prototype.hasOwnProperty.call(this.dict, id)) {
            this.dict[id] = {};
        }

        if (!Object.prototype.hasOwnProperty.call(this.dict[id], "mixins")) {
            this.dict[id].mixins = [];
        }

        this.dict[id].mixins.push(mixin);
    };

    Container.prototype.mixin = function(mapping) {
        var self = this;
        var mixin = {
            data: function() {
                return Object.keys(mapping).reduce(function(acc, val) {
                    acc[val] = self.dict[mapping[val]] ? self.dict[mapping[val]].items : [];
                    return acc;
                }, {});
            }
        };
        return mixin;
    };

    Container.prototype.mixins = function(id) {
        return this.dict[id] ? this.dict[id].mixins : [];
    };

    countlyVue.container = new Container();

}(window.countlyVue = window.countlyVue || {}));
