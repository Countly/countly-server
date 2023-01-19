/* global countlyAuth, CountlyHelpers*/

(function(countlyVue) {

    /**
     * Container is a simple class that stores objects
     */
    function Container() {
        this.dict = {};
    }

    Container.prototype.registerData = function(id, value, type) {
        if (value && (value.pluginName || value.permission) && !CountlyHelpers.isPluginEnabled(value.pluginName || value.permission)) {
            return;
        }
        else {
            if (!Object.prototype.hasOwnProperty.call(this.dict, id)) {
                this.dict[id] = {};
            }
            // Note: type property is used when registring data value as object type. By default, container keeps array type.
            if (type === 'object') {
                this.dict[id].data = {};
                Object.assign(this.dict[id].data, value);
                return;
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
        }
    };

    Container.prototype.registerTab = function(id, tab) {
        if (tab && (tab.pluginName || tab.permission) && !CountlyHelpers.isPluginEnabled(tab.pluginName || tab.permission)) {
            return;
        }
        else {
            if (!Object.prototype.hasOwnProperty.call(this.dict, id)) {
                this.dict[id] = {};
            }

            if (!Object.prototype.hasOwnProperty.call(this.dict[id], "tabs")) {
                this.dict[id].tabs = [];
            }
            tab.priority = tab.priority || 0;
            var putAt = this.dict[id].tabs.length;

            if (tab.priority) {
                for (var zz = 0; zz < this.dict[id].tabs.length; zz++) {
                    if (this.dict[id].tabs[zz].priority && this.dict[id].tabs[zz].priority > tab.priority) {
                        putAt = zz;
                        break;
                    }
                }
            }
            this.dict[id].tabs.splice(putAt, 0, tab);
        }
    };

    Container.prototype.registerMixin = function(id, mixin) {
        if (mixin && (!mixin.pluginName || CountlyHelpers.isPluginEnabled(mixin.pluginName))) {
            if (!Object.prototype.hasOwnProperty.call(this.dict, id)) {
                this.dict[id] = {};
            }

            if (!Object.prototype.hasOwnProperty.call(this.dict[id], "mixins")) {
                this.dict[id].mixins = [];
            }

            this.dict[id].mixins.push(mixin);
        }
    };

    Container.prototype.registerTemplate = function(id, path) {
        if (!Object.prototype.hasOwnProperty.call(this.dict, id)) {
            this.dict[id] = {};
        }
        if (!Object.prototype.hasOwnProperty.call(this.dict[id], "templates")) {
            this.dict[id].templates = [];
        }
        if (Array.isArray(path)) {
            this.dict[id].templates = this.dict[id].templates.concat(path);
        }
        else {
            this.dict[id].templates.push(path);
        }
    };

    Container.prototype.dataMixin = function(mapping) {
        var self = this;
        var mixin = {
            data: function() {
                var ob = Object.keys(mapping).reduce(function(acc, val) {
                    var dataOb = self.dict[mapping[val]] ? self.dict[mapping[val]].data : [];
                    if (Array.isArray(dataOb)) {
                        acc[val] = dataOb.filter(function(data) {
                            if (data && data.permission) {
                                return countlyAuth.validateRead(data.permission);
                            }
                            return true;
                        });
                    }
                    else {
                        for (var key in dataOb) {
                            if (dataOb[key] && dataOb[key].permission) {
                                if (countlyAuth.validateRead(dataOb[key].permission)) {
                                    acc[val] = dataOb;
                                }
                            }
                            else {
                                acc[val] = dataOb;
                            }
                            break;
                        }
                    }
                    return acc;
                }, {});
                return ob;
            }
        };
        return mixin;
    };

    Container.prototype.tabsMixin = function(mapping) {
        var self = this;
        var mixin = {
            data: function() {
                var ob = Object.keys(mapping).reduce(function(acc, val) {
                    acc[val] = (self.dict[mapping[val]] ? self.dict[mapping[val]].tabs : []).filter(function(tab) {
                        if (tab.permission) {
                            return countlyAuth.validateRead(tab.permission);
                        }
                        return countlyAuth.validateGlobalAdmin();
                    });
                    return acc;
                }, {});
                return ob;
            }
        };
        return mixin;
    };

    Container.prototype.getAllRoutes = function() {
        var routes = [];

        for (var id in this.dict) {
            if (this.dict[id].data) {
                for (var j = 0; j < this.dict[id].data.length; j++) {
                    if (this.dict[id].data[j].url) {
                        routes.push({url: this.dict[id].data[j].url, app_type: this.dict[id].data[j].app_type});
                    }
                }
            }
            if (this.dict[id].tabs) {
                for (var k = 0; k < this.dict[id].tabs.length; k++) {
                    if (this.dict[id].tabs[k].route) {
                        routes.push({url: this.dict[id].tabs[k].route, app_type: this.dict[id].tabs[k].type});
                    }
                }
            }
        }

        return routes;
    };

    Container.prototype.mixins = function(ids) {
        var self = this;
        var mixins = [];

        ids.forEach(function(id) {
            var mix = self.dict[id] ? self.dict[id].mixins : [];
            mixins = mixins.concat(mix);
        });

        return mixins;
    };

    Container.prototype.templates = function(ids) {
        var self = this;
        var templates = [];
        ids.forEach(function(id) {
            var template = self.dict[id] ? self.dict[id].templates : [];
            templates = templates.concat(template);
        });
        return templates;
    };

    Container.prototype.tabsVuex = function(ids) {
        var self = this;
        var vuex = [];

        ids.forEach(function(id) {
            var tabs = (self.dict[id] ? self.dict[id].tabs : []).filter(function(tab) {
                if (tab.permission) {
                    return countlyAuth.validateRead(tab.permission);
                }
                return countlyAuth.validateGlobalAdmin();
            });

            tabs.forEach(function(t) {
                if (t.vuex) {
                    vuex = vuex.concat(t.vuex);
                }
            });
        });


        return vuex;
    };

    countlyVue.container = new Container();

}(window.countlyVue = window.countlyVue || {}));
