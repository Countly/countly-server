/* global  */

(function(countlyVue) {

    /**
     * Container is a simple class that stores objects
     */
    function Container() {
        this.dict = {};
    }

    Container.prototype.registerData = function(id, value) {
        if (!Object.prototype.hasOwnProperty.call(this.dict, id)) {
            this.dict[id] = {};
        }

        if (!Object.prototype.hasOwnProperty.call(this.dict[id], "data")) {
            this.dict[id].data = [];
        }

        var _items = this.dict[id].data;

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

    Container.prototype.registerTab = function(id, tab) {
        if (!Object.prototype.hasOwnProperty.call(this.dict, id)) {
            this.dict[id] = {};
        }

        if (!Object.prototype.hasOwnProperty.call(this.dict[id], "tabs")) {
            this.dict[id].tabs = [];
        }

        this.dict[id].tabs.push(tab);
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

    Container.prototype.dataMixin = function(mapping) {
        var self = this;
        var mixin = {
            data: function() {
                return Object.keys(mapping).reduce(function(acc, val) {
                    acc[val] = self.dict[mapping[val]] ? self.dict[mapping[val]].data : [];
                    return acc;
                }, {});
            }
        };
        return mixin;
    };

    Container.prototype.tabsMixin = function(mapping) {
        var self = this;
        var mixin = {
            data: function() {
                return Object.keys(mapping).reduce(function(acc, val) {
                    acc[val] = self.dict[mapping[val]] ? self.dict[mapping[val]].tabs : [];
                    return acc;
                }, {});
            }
        };
        return mixin;
    };

    Container.prototype.mixins = function(id) {
        return this.dict[id] ? this.dict[id].mixins : [];
    };

    Container.prototype.tabsVuex = function(id) {
        var tabs = this.dict[id] ? this.dict[id].tabs : [];
        var vuex = [];

        tabs.forEach(function(t) {
            if (t.vuex) {
                vuex = vuex.concat(t.vuex);
            }
        });

        return vuex;
    };

    countlyVue.container = new Container();

}(window.countlyVue = window.countlyVue || {}));
