/* global countlyCommon, jQuery, Vue, Vuex, T, countlyView, Promise, VueCompositionAPI */

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

    var _i18n = function() {
        return jQuery.i18n.prop.apply(null, arguments);
    };

    var _$ = {
        ajax: function(request, options) {
            options = options || {};
            var ajaxP = new Promise(function(resolve, reject) {
                $.ajax(request).done(resolve).fail(reject);
            });
            if (!options.disableAutoCatch) {
                return ajaxP.catch(function(err) {
                    // eslint-disable-next-line no-console
                    console.log("AJAX Promise error:", err);
                });
            }
            return ajaxP;
        }
    };

    // @vue/component
    var i18nMixin = {
        methods: {
            i18n: _i18n
        }
    };

    // @vue/component
    var commonFormattersMixin = {
        methods: {
            formatTimeAgo: countlyCommon.formatTimeAgo,
            formatNumber: countlyCommon.formatTimeAgo
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
        'i18n': i18nMixin,
        'commonFormatters': commonFormattersMixin
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

    var _uniqueCopiedStoreId = 0;

    var _vuex = {
        getGlobalStore: function() {
            return _globalVuexStore;
        },
        registerGlobally: function(wrapper, copy, force) {
            var store = _globalVuexStore;
            var name = wrapper.name;
            if (copy) {
                name += "_" + _uniqueCopiedStoreId;
                _uniqueCopiedStoreId += 1;
            }
            if (!store.hasModule(name) || force) {
                store.registerModule(name, wrapper.module);
            }
            return name;
        },
        unregister: function(name) {
            _globalVuexStore.unregisterModule(name);
        }
    };

    var BackboneRouteAdapter = function() {};

    Vue.prototype.$route = new BackboneRouteAdapter();

    var DummyCompAPI = VueCompositionAPI.defineComponent({
        name: "DummyCompAPI",
        template: '<div></div>',
        setup: function() {}
    });

    var TemplateLoader = function(templates) {
        this.templates = templates;
        this.elementsToBeRendered = [];
    };

    TemplateLoader.prototype.load = function() {
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
    };

    TemplateLoader.prototype.mount = function(parentSelector) {
        parentSelector = parentSelector || "#vue-templates";
        this.elementsToBeRendered.forEach(function(el) {
            var jqEl = $(el);
            var elId = jqEl.get(0).id;
            if ($(parentSelector).find("#" + elId).length === 0) {
                $(parentSelector).append(jqEl);
            }
        });
    };

    TemplateLoader.prototype.destroy = function() {
        this.elementsToBeRendered = [];
    };

    var countlyVueWrapperView = countlyView.extend({
        constructor: function(opts) {
            this.component = opts.component;
            this.defaultArgs = opts.defaultArgs;
            this.vuex = opts.vuex;
            this.templates = opts.templates;
            this.templateLoader = new TemplateLoader(this.templates);
        },
        beforeRender: function() {
            return this.templateLoader.load();
        },
        renderCommon: function(isRefresh) {
            if (!isRefresh) {
                $(this.el).html("<div><div class='vue-wrapper'></div><div id='vue-templates'></div></div>");
                $("body").addClass("cly-vue-theme-clydef");
                this.templateLoader.mount();
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

            /*
                Some 3rd party components such as echarts, use Composition API.
                It is not clear why, but when a view with those components destroyed,
                they leave some memory leaks. Instantiating DummyCompAPI triggers memory cleanups. 
            */

            self.vm = new Vue({
                el: el,
                store: _vuex.getGlobalStore(),
                components: {
                    DummyCompAPI: DummyCompAPI,
                    MainView: self.component
                },
                template: '<div>\
                                <MainView></MainView>\
                                <DummyCompAPI></DummyCompAPI>\
                            </div>',
                beforeCreate: function() {
                    this.$route.params = self.params;
                },
                // render: function(h) {
                //     if (self.defaultArgs) {
                //         return h(self.component, { attrs: self.defaultArgs });
                //     }
                //     else {
                //         return h(self.component);
                //     }
                // }
            });

            self.vm.$on("cly-date-change", function() {
                self.vm.$emit("cly-refresh");
            });
        },
        destroy: function() {
            var self = this;
            this.templateLoader.destroy();
            if (self.vm) {
                $("body").removeClass("cly-vue-theme-clydef");
                self.vm.$destroy();
                self.vm.$off();
                $(self.vm.$el).remove();
                self.vm = null;
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

    var countlyCreateComponent = function(opts) {
        if (opts.templates) {
            return function() {
                var templateLoader = new TemplateLoader(opts.templates);
                return new Promise(function(resolve) {
                    templateLoader.load().then(function() {
                        templateLoader.mount();
                        resolve(opts.component);
                    }).fail(function(err) {
                        // eslint-disable-next-line no-console
                        console.log("Async component template load error:", err);
                        resolve(opts.component);
                    });
                });
            };
        }
        return opts.component;
    };

    var countlyBaseView = countlyBaseComponent.extend(
        // @vue/component
        {
            mixins: [
                _mixins.autoRefresh,
                _mixins.i18n,
                _mixins.commonFormatters
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
        BaseComponent: countlyBaseComponent,
        create: countlyCreateComponent
    };

    var _views = {
        BackboneWrapper: countlyVueWrapperView,
        BaseView: countlyBaseView
    };

    var rootElements = {
        i18n: _i18n,
        $: _$,
        mixins: _mixins,
        views: _views,
        components: _components,
        vuex: _vuex
    };

    for (var key in rootElements) {
        countlyVue[key] = rootElements[key];
    }

    window.CV = countlyVue;

}(window.countlyVue = window.countlyVue || {}, jQuery));
