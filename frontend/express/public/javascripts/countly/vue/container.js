/* global  */

(function(countlyVue) {

    var properties = ["data", "methods", "computed", "beforeCreate", "created", "beforeMount", "mounted", "beforeUpdate", "updated", "beforeDestroy", "destroyed"];

    /**
     * Container is a simple class that stores objects
     */
    function Container() {
        this.dict = {};
    }

    Container.prototype.register = function(id, value) {
        var self = this;

        if (!Object.prototype.hasOwnProperty.call(this.dict, id)) {
            this.dict[id] = {};
            properties.forEach(function(p) {
                self.dict[id][p] = [];
            });
        }

        properties.forEach(function(p) {
            self.dict[id][p].push(value[p]);
        });
    };

    Container.prototype.mixin = function(mapping) {
        var self = this;
        var mixin = {};

        properties.forEach(function(p) {
            if (p === "data") {
                /**
                 * Pass data array to the mapping key
                 */

                mixin[p] = function() {
                    return Object.keys(mapping).reduce(function(acc, val) {
                        acc[val] = self.dict[mapping[val]] ? self.dict[mapping[val]][p] : [];
                        return acc;
                    }, {});
                };
            }
            else {
                mixin[p] = Object.keys(mapping).reduce(function(acc, val) {
                    acc[val] = self.dict[mapping[val]] ? self.dict[mapping[val]][p] : [];
                    return acc;
                }, {});
            }
        });

        return mixin;
    };

    countlyVue.container = new Container();

}(window.countlyVue = window.countlyVue || {}));
