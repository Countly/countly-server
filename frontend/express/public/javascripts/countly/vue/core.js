/* global countlyCommon, jQuery, Vue, Vuex, T, countlyView, Promise, VueCompositionAPI, app, countlyGlobal */

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
        },
        beforeDestroy: function() {
            this.$root.$off();
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
            i18n: _i18n,
            i18nM: function(key) {
                return jQuery.i18n.map[key];
            }
        }
    };

    // @vue/component
    var commonFormattersMixin = {
        methods: {
            formatTimeAgo: countlyCommon.formatTimeAgoText,
            formatNumber: countlyCommon.formatNumber,
            getShortNumber: countlyCommon.getShortNumber
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
                    periodLabel: countlyCommon.getDateRangeForCalendar(),
                    activeApp: null
                },
                getters: {
                    period: function(state) {
                        return state.period;
                    },
                    periodLabel: function(state) {
                        return state.periodLabel;
                    },
                    getActiveApp: function(state) {
                        return state.activeApp;
                    }
                },
                mutations: {
                    setPeriod: function(state, period) {
                        state.period = period;
                    },
                    setPeriodLabel: function(state, periodLabel) {
                        state.periodLabel = periodLabel;
                    },
                    setActiveApp: function(state, activeApp) {
                        state.activeApp = activeApp;
                    }
                },
                actions: {
                    updatePeriod: function(context, obj) {
                        context.commit("setPeriod", obj.period);
                        context.commit("setPeriodLabel", obj.label);
                    },
                    updateActiveApp: function(context, id) {
                        var appObj = countlyGlobal.apps[id];
                        if (appObj) {
                            context.commit("setActiveApp", Object.freeze(JSON.parse(JSON.stringify(appObj))));
                        }
                    }
                }
            }
        }
    });

    $(document).ready(function() {
        app.addAppSwitchCallback(function(appId) {
            _globalVuexStore.dispatch("countlyCommon/updateActiveApp", appId);
        });
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
            else {
                // eslint-disable-next-line no-console
                console.log("Duplicate component templates are not allowed. Please check the template with \"" + elId + "\" id.");
            }
        });
    };

    TemplateLoader.prototype.destroy = function() {
        this.elementsToBeRendered = [];
    };

    var VuexLoader = function(vuex) {
        this.vuex = vuex;
        this.loadedModuleIds = [];
    };

    VuexLoader.prototype.load = function() {
        var self = this;
        this.vuex.forEach(function(item) {
            var module = item.clyModel.getVuexModule();
            _vuex.registerGlobally(module);
            self.loadedModuleIds.push(module.name);
        });
    };

    VuexLoader.prototype.destroy = function() {
        this.loadedModuleIds.forEach(function(mid) {
            _vuex.unregister(mid);
        });
        this.loadedModuleIds = [];
    };

    var countlyVueWrapperView = countlyView.extend({
        constructor: function(opts) {
            this.component = opts.component;
            this.defaultArgs = opts.defaultArgs;
            this.vuex = opts.vuex;
            this.templates = opts.templates;
            this.templateLoader = new TemplateLoader(this.templates);
            this.vuexLoader = new VuexLoader(this.vuex);
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
                self.vuexLoader.load();
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
                }
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
            this.vuexLoader.destroy();
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

    var BaseContentMixin = countlyBaseComponent.extend(
        // @vue/component
        {
            inheritAttrs: false,
            mixins: [
                _mixins.i18n
            ],
            props: {
                name: { type: String, default: null},
                id: { type: String, default: null },
                alwaysMounted: { type: Boolean, default: true },
                alwaysActive: { type: Boolean, default: false },
                role: { type: String, default: "default" }
            },
            data: function() {
                return {
                    isContent: true
                };
            },
            computed: {
                isActive: function() {
                    return this.alwaysActive || (this.role === "default" && this.$parent.activeContentId === this.id);
                },
                tName: function() {
                    return this.name;
                },
                tId: function() {
                    return this.id;
                },
                elementId: function() {
                    return this.componentId + "-" + this.id;
                }
            }
        }
    );

    var templateUtil = {
        stage: function(fileName) {
            return {
                fileName: fileName
            };
        },
        load: function(fileName) {
            return new Promise(function(resolve) {
                T.get(fileName, function(src) {
                    resolve(src);
                });
                /*
                    // eslint-disable-next-line no-console
                    console.log("Async component template load error:", err);
                    resolve(opts.component);
                */
            });
        }
    };

    var asyncCreate = function(base) {
        return function(opts, baseOverride) {
            var finalBase = baseOverride || base;
            if (typeof opts.template === "string") {
                return finalBase.extend(opts);
            }
            return function() {
                return templateUtil.load(opts.template.fileName).then(function(template) {
                    opts.template = template;
                    return finalBase.extend(opts);
                });
            };
        };
    };

    _mixins.BaseContent = BaseContentMixin;

    var _components = {
        BaseComponent: countlyBaseComponent,
        create: asyncCreate(countlyBaseComponent)
    };

    var _views = {
        BackboneWrapper: countlyVueWrapperView,
        BaseView: countlyBaseView,
        create: asyncCreate(countlyBaseView)
    };

    var rootElements = {
        i18n: _i18n,
        $: _$,
        mixins: _mixins,
        views: _views,
        components: _components,
        vuex: _vuex,
        T: templateUtil.stage
    };

    for (var key in rootElements) {
        countlyVue[key] = rootElements[key];
    }

    window.CV = countlyVue;

}(window.countlyVue = window.countlyVue || {}, jQuery));
