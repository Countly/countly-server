/* global countlyCommon, jQuery, Vue, Vuex, T, countlyView, Promise, VueCompositionAPI, app, countlyGlobal, store */

(function(countlyVue, $) {

    // @vue/component
    var autoRefreshMixin = {
        mounted: function() {
            if (this.refresh || this.dateChanged) {
                this.$root.$on("cly-refresh", this.refreshHandler);
            }
        },
        methods: {
            refreshHandler: function(payload) {
                var isForced = payload && payload.reason === "dateChange";
                if (isForced && this.dateChanged) {
                    // branch to dateChange implementation if any
                    this.dateChanged();
                }
                else if (this.refresh) {
                    this.refresh(isForced);
                }
            }
        },
        beforeDestroy: function() {
            if (this.refresh || this.dateChanged) {
                this.$root.$off("cly-refresh", this.refreshHandler);
            }
        }
    };

    var _i18n = function() {
        var appType = countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type;
        arguments = arguments || [];
        if (arguments.length === 1) { //single arg. use map
            return _i18nM(arguments[0]);
        }
        else if (!appType || appType === "mobile") {
            return jQuery.i18n.prop.apply(null, arguments);
        }
        else {
            var key = arguments[0];
            if (!jQuery.i18n.map[appType + "." + key]) {
                // Key miss
                return jQuery.i18n.prop.apply(null, arguments);
            }
            else {
                // Key hit
                var argsCopy = Array.prototype.slice.call(arguments);
                argsCopy[0] = appType + "." + key;
                return jQuery.i18n.prop.apply(null, argsCopy);
            }
        }
    };

    var _i18nM = function(key) {
        var appType = countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type;
        if (!appType || appType === "mobile") {
            return jQuery.i18n.map[key];
        }
        else {
            return jQuery.i18n.map[appType + "." + key] || jQuery.i18n.map[key];
        }
    };

    var _$ = {
        ajax: function(request, options) {
            options = options || {};
            var ajaxP = new Promise(function(resolve, reject) {
                $.ajax(request).done(resolve).fail(reject);
            });
            if (!options.disableAutoCatch) {
                return ajaxP.catch(function(jqXHR) {
                    if (jqXHR.abort_reason === "duplicate" || (jqXHR.statusText !== "abort" && jqXHR.statusText !== "canceled")) {
                        app.activeView.onError(jqXHR);
                    }
                });
            }
            return ajaxP;
        }
    };

    // @vue/component
    var i18nMixin = {
        methods: {
            i18n: _i18n,
            i18nM: _i18nM
        }
    };

    // @vue/component
    var commonFormattersMixin = {
        methods: {
            parseTimeAgo: countlyCommon.formatTimeAgoText,
            formatTimeAgo: countlyCommon.formatTimeAgo,
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
                    activeApp: null,
                    allApps: countlyGlobal.apps
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
                    },
                    getAllApps: function(state) {
                        return state.allApps;
                    }
                },
                mutations: {
                    setPeriod: function(state, period) {
                        state.period = period;
                    },
                    setPeriodLabel: function(state, periodLabel) {
                        state.periodLabel = periodLabel;
                    },
                    setActiveApp: function(state, id) {
                        var appObj = state.allApps[id];
                        if (appObj) {
                            state.activeApp = Object.freeze(JSON.parse(JSON.stringify(appObj)));
                        }
                    },
                    addToAllApps: function(state, additionalApps) {
                        if (Array.isArray(additionalApps)) {
                            additionalApps.forEach(function(app) {
                                state.allApps[app._id] = app;
                            });
                        }
                        else {
                            state.allApps[additionalApps._id] = additionalApps;
                        }
                    },
                    removeFromAllApps: function(state, appToRemoveId) {
                        var appObj = state.allApps[appToRemoveId];
                        if (appObj) {
                            delete state.allApps[appToRemoveId];
                        }
                    },
                    deleteAllApps: function(state) {
                        state.allApps = null;
                    }
                },
                actions: {
                    updatePeriod: function(context, obj) {
                        context.commit("setPeriod", obj.period);
                        context.commit("setPeriodLabel", obj.label);
                    },
                    updateActiveApp: function(context, id) {
                        context.commit("setActiveApp", id);
                    },
                    removeActiveApp: function(context) {
                        context.commit("setActiveApp", null);
                        store.remove('countly_active_app');
                    },
                    addToAllApps: function(context, additionalApps) {
                        context.commit("addToAllApps", additionalApps);
                    },
                    removeFromAllApps: function(context, appToRemoveId) {
                        if (Array.isArray(appToRemoveId)) {
                            appToRemoveId.forEach(function(app) {
                                context.commit("removeFromAllApps", app);
                            });
                        }
                        else {
                            context.commit("removeFromAllApps", appToRemoveId);
                        }
                    },
                    deleteAllApps: function(context) {
                        context.commit("deleteAllApps");
                    }
                }
            },
            countlySidebar: {
                namespaced: true,
                state: {
                    selectedMenuItem: {}
                },
                getters: {
                    getSelectedMenuItem: function(state) {
                        return state.selectedMenuItem;
                    }
                },
                mutations: {
                    setSelectedMenuItem: function(state, payload) {
                        state.selectedMenuItem = payload;
                    }
                },
                actions: {
                    updateSelectedMenuItem: function(context, payload) {
                        context.commit('setSelectedMenuItem', payload);
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
        $("#vue-templates").empty();
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
            _globalVuexStore.dispatch(mid + "/reset");
            _vuex.unregister(mid);
        });
        this.loadedModuleIds = [];
    };

    var memoryTracker = {
        data: function() {
            return {
                memoryTicks: [],
                memoryUsage: {},
                prevVal: 0
            };
        },
        created: function() {
            var self = this;
            // logMemory("view_change", app.route);
            setInterval(function() {
                self.logMemory("interval");
                self.memoryUsage = self.memoryTicks[0];
            }, 1000);
        },
        methods: {
            bytesToSize: function(bytes, nFractDigit) {
                var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
                if (bytes === 0) {
                    return 'n/a';
                }
                nFractDigit	= nFractDigit !== undefined ? nFractDigit : 0;
                var precision	= Math.pow(10, nFractDigit);
                var i = Math.floor(Math.log(bytes) / Math.log(1024));
                return Math.round(bytes * precision / Math.pow(1024, i)) / precision + ' ' + sizes[i];
            },
            logMemory: function(event) {
                var lastVal = performance.memory.usedJSHeapSize;
                var delta = lastVal - this.prevVal;
                this.prevVal = lastVal;
                var deltaSign = delta < 0 ? "-" : "+";
                this.memoryTicks.unshift([Date.now(), event, this.bytesToSize(lastVal, 3), deltaSign + this.bytesToSize(Math.abs(delta), 3), window.location.hash]);
            }
        },
        template: '<div style="position: fixed;right: 0;opacity: 0.8;background-color: antiquewhite;padding: 10px;border-radius: 4px;margin: 10px;bottom: 0;z-index: 10000;>Memory usage <pre>{{memoryUsage}}</pre></div>'
    };

    var mainVM = new Vue({
        el: $('#vue-content .vue-wrapper').get(0),
        store: _vuex.getGlobalStore(),
        components: {
            /*
                Some 3rd party components such as echarts, use Composition API.
                It is not clear why, but when a view with those components destroyed,
                they leave some memory leaks. Instantiating DummyCompAPI triggers memory cleanups. 
            */
            'memory-tracker': memoryTracker,
            DummyCompAPI: DummyCompAPI
        },
        data: function() {
            return { currentViewComponent: null };
        },
        template: '<div>\
                        <memory-tracker></memory-tracker>\
                        <component :is="currentViewComponent"></component>\
                        <DummyCompAPI></DummyCompAPI>\
                    </div>',
        methods: {
            handleClyError: function(payload) {
                this.$notify.error({
                    title: _i18n("common.error"),
                    message: payload.message
                });
            },
            handleClyRefresh: function() {
                this.$root.$emit("cly-refresh", {reason: "dateChange"});
            },
            loadViewComponent: function(cmp, params) {
                this.currentViewComponent = cmp;
                this.$route.params = params;
            },
            killViewComponent: function(callback) {
                this.currentViewComponent = null;
                if (callback) {
                    this.$nextTick(function() {
                        callback();
                    });
                }
            }
        },
        created: function() {
            this.$on("cly-date-change", this.handleClyRefresh);
            this.$on("cly-error", this.handleClyError);
        }
    });

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
                $("body").addClass("cly-vue-theme-clydef");
                this.templateLoader.mount();
            }
        },
        refresh: function() {
            mainVM.$root.$emit("cly-refresh", {reason: "periodical"}); // for 10 sec interval
        },
        onError: function(message) {
            mainVM.$root.$emit("cly-error", {message: message});
        },
        afterRender: function() {
            var self = this;

            if (self.vuex) {
                self.vuexLoader.load();
            }

            mainVM.loadViewComponent(self.component, self.params);
        },
        destroy: function() {
            var self = this;
            this.templateLoader.destroy();
            $("body").removeClass("cly-vue-theme-clydef");
            self.vuexLoader.destroy();
            mainVM.killViewComponent();
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
        i18nM: _i18nM,
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
