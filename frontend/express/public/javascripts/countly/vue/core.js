/* global countlyCommon, jQuery, Vue, Vuex, T, countlyView */

(function(countlyVue, $) {

    // @vue/component
    var autoRefreshMixin = {
        mounted: function() {
            var self = this;
            this.$root.$on("cly-refresh", function() {
                self.refresh();
            });
        },
        methods: {
            refresh: function() {}
        }
    };

    // @vue/component
    var i18nMixin = {
        methods: {
            i18n: function() {
                return jQuery.i18n.prop.apply(null, arguments);
            }
        }
    };

    // @vue/component
    var refreshOnParentActiveMixin = {
        watch: {
            isParentActive: function(newState) {
                if (newState) {
                    this.refresh();
                }
            }
        },
        methods: {
            refresh: function() {}
        }
    };

    var _mixins = {
        'autoRefresh': autoRefreshMixin,
        'refreshOnParentActive': refreshOnParentActiveMixin,
        'i18n': i18nMixin
    };

    var _globalVuexStore = new Vuex.Store({
        modules: {
            countlyCommon: {
                namespaced: true,
                state: {
                    period: countlyCommon.getPeriod(),
                    periodLabel: countlyCommon.getDateRangeForCalendar()
                },
                getters: {
                    period: function(state) {
                        return state.period;
                    },
                    periodLabel: function(state) {
                        return state.periodLabel;
                    }
                },
                mutations: {
                    setPeriod: function(state, period) {
                        state.period = period;
                    },
                    setPeriodLabel: function(state, periodLabel) {
                        state.periodLabel = periodLabel;
                    }
                },
                actions: {
                    updatePeriod: function(context, obj) {
                        context.commit("setPeriod", obj.period);
                        context.commit("setPeriodLabel", obj.label);
                    }
                }
            }
        }
    });

    var _vuex = {
        getGlobalStore: function() {
            return _globalVuexStore;
        },
        registerGlobally: function(wrapper, force) {
            var store = _globalVuexStore;
            if (!store.hasModule(wrapper.name) || force) {
                store.registerModule(wrapper.name, wrapper.module);
            }
        }
    };

    var BackboneRouteAdapter = function() {};

    Vue.prototype.$route = new BackboneRouteAdapter();

    var countlyVueWrapperView = countlyView.extend({
        constructor: function(opts) {
            this.component = opts.component;
            this.defaultArgs = opts.defaultArgs;
            this.vuex = opts.vuex;
            this.templates = opts.templates;
            this.elementsToBeRendered = [];
        },
        beforeRender: function() {
            var self = this;

            var getDeferred = function(fName, elId) {
                if (!elId) {
                    return T.get(fName, function(src) {
                        self.elementsToBeRendered.push(src);
                    });
                }
                else {
                    return T.get(fName, function(src) {
                        self.elementsToBeRendered.push("<script type='text/x-template' id='" + elId + "'>" + src + "</script>");
                    });
                }
            };

            if (this.templates) {
                var templatesDeferred = [];
                this.templates.forEach(function(item) {
                    if (typeof item === "string") {
                        templatesDeferred.push(getDeferred(item));
                        return;
                    }
                    for (var name in item.mapping) {
                        var fileName = item.mapping[name];
                        var elementId = item.namespace + "-" + name;
                        templatesDeferred.push(getDeferred(fileName, elementId));
                    }
                });

                return $.when.apply(null, templatesDeferred);
            }
            return true;
        },
        renderCommon: function(isRefresh) {
            if (!isRefresh) {
                $(this.el).html("<div class='cly-vue-theme-clydef'><div class='vue-wrapper'></div><div id='vue-templates'></div></div>");
                this.elementsToBeRendered.forEach(function(el) {
                    $("#vue-templates").append(el);
                });
            }
        },
        refresh: function() {
            var self = this;
            if (self.vm) {
                self.vm.$emit("cly-refresh");
            }
        },
        afterRender: function() {
            var el = $(this.el).find('.vue-wrapper').get(0),
                self = this;

            if (self.vuex) {
                self.vuex.forEach(function(item) {
                    _vuex.registerGlobally(item.clyModel.getVuexModule());
                });
            }

            self.vm = new Vue({
                el: el,
                store: _vuex.getGlobalStore(),
                beforeCreate: function() {
                    this.$route.params = self.params;
                },
                render: function(h) {
                    if (self.defaultArgs) {
                        return h(self.component, { attrs: self.defaultArgs });
                    }
                    else {
                        return h(self.component);
                    }
                }
            });

            self.vm.$on("cly-date-change", function() {
                self.vm.$emit("cly-refresh");
            });
        },
        destroy: function() {
            var self = this;
            self.elementsToBeRendered = [];
            if (self.vm) {
                self.vm.$destroy();
            }
        }
    });

    var _uniqueComponentId = 0;

    var countlyBaseComponent = Vue.extend({
        computed: {
            componentId: function() {
                return "cly-cmp-" + _uniqueComponentId;
            }
        },
        beforeCreate: function() {
            this.ucid = _uniqueComponentId.toString();
            _uniqueComponentId += 1;
        }
    });

    var countlyBaseView = countlyBaseComponent.extend(
        // @vue/component
        {
            mixins: [
                _mixins.autoRefresh,
                _mixins.i18n
            ],
            props: {
                name: { type: String, default: null},
                id: { type: String, default: null }
            },
            computed: {
                isParentActive: function() {
                    return this.$parent.isActive !== false;
                },
                vName: function() {
                    return this.name;
                },
                vId: function() {
                    return this.id;
                }
            }
        }
    );

    var _components = {
        BaseComponent: countlyBaseComponent
    };

    var _views = {
        BackboneWrapper: countlyVueWrapperView,
        BaseView: countlyBaseView
    };

    var rootElements = {
        mixins: _mixins,
        views: _views,
        components: _components,
        vuex: _vuex
    };

    for (var key in rootElements) {
        countlyVue[key] = rootElements[key];
    }

}(window.countlyVue = window.countlyVue || {}, jQuery));
