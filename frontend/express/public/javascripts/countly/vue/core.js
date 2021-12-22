/* global countlyCommon, jQuery, Vue, Vuex, T, countlyView, Promise, VueCompositionAPI, app, countlyGlobal, store, countlyAuth */

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
        var appType = (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type) || "mobile";
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
        var appType = (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type) || "mobile";
        if (!appType || appType === "mobile") {
            return jQuery.i18n.map[key] || key;
        }
        else {
            return jQuery.i18n.map[appType + "." + key] || jQuery.i18n.map[key] || key;
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

    var authMixin = function(featureName) {
        return {
            // uses computed mainly to prevent mutations of these values
            computed: {
                canUserCreate: function() {
                    return countlyAuth.validateCreate(featureName);
                },
                canUserRead: function() {
                    return countlyAuth.validateRead(featureName);
                },
                canUserUpdate: function() {
                    return countlyAuth.validateUpdate(featureName);
                },
                canUserDelete: function() {
                    return countlyAuth.validateDelete(featureName);
                }
            }
        };
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
        'commonFormatters': commonFormattersMixin,
        'auth': authMixin
    };

    var _globalVuexStore = new Vuex.Store({
        modules: {
            countlyCommon: {
                namespaced: true,
                state: {
                    period: countlyCommon.getPeriod(),
                    periodLabel: countlyCommon.getDateRangeForCalendar(),
                    activeApp: null,
                    allApps: countlyGlobal.apps,
                    notificationToasts: [],
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
                    },
                    addNotificationToast: function(state, payload) {
                        payload.id = countlyCommon.generateId();
                        state.notificationToasts.push(payload);
                    },
                    removeNotificationToast: function(state, id) {
                        state.notificationToasts = state.notificationToasts.filter(function(item) {
                            return item.id !== id;
                        });
                    },
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
                    },
                    onAddNotificationToast: function(context, payload) {
                        context.commit('addNotificationToast', payload);
                    },
                    onRemoveNotificationToast: function(context, payload) {
                        context.commit('removeNotificationToast', payload);
                    }
                },
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
    };

    var VuexLoader = function(vuex) {
        this.vuex = vuex;
        this.loadedModules = [];
    };

    VuexLoader.prototype.load = function() {
        var self = this;
        this.vuex.forEach(function(item) {
            var module = item.clyModel.getVuexModule();
            _vuex.registerGlobally(module);
            self.loadedModules.push(module);
        });
    };

    VuexLoader.prototype.destroy = function() {
        var self = this;
        this.loadedModules.forEach(function(mid, index) {
            if (mid.destroy !== false) {
                _vuex.unregister(mid.name);
                self.loadedModules.splice(index, 1);
            }
        });
    };

    var NotificationToastsView = VueCompositionAPI.defineComponent({
        name: "NotificationToasts",
        template: '<div class="notification-toasts"> \
                        <cly-notification v-for="(toast) in notificationToasts" :key="toast.id" :id="toast.id" :text="toast.text" :color="toast.color" :closable="true" @close="onClose" class="notification-toasts__item"></cly-notification>\
                    </div>',
        store: _vuex.getGlobalStore(),
        computed: {
            notificationToasts: function() {
                return this.$store.state.countlyCommon.notificationToasts;
            }
        },
        methods: {
            onClose: function(id) {
                this.$store.dispatch('countlyCommon/onRemoveNotificationToast', id);
            }
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
                $(this.el).html("<div><div class='vue-wrapper'></div><div id='vue-templates'></div></div>");
                $("body").addClass("cly-vue-theme-clydef");
                this.templateLoader.mount();
            }
        },
        refresh: function() {
            var self = this;
            if (self.vm) {
                self.vm.$root.$emit("cly-refresh", {reason: "periodical"}); // for 10 sec interval
            }
        },
        onError: function(message) {
            if (this.vm) {
                this.vm.$root.$emit("cly-error", {message: message});
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
                    MainView: self.component,
                    NotificationToasts: NotificationToastsView
                },
                template: '<div>\
                                <MainView> </MainView>\
                                <NotificationToasts> </NotificationToasts> \
                                <DummyCompAPI></DummyCompAPI>\
                            </div>',
                beforeCreate: function() {
                    this.$route.params = self.params;
                },
                methods: {
                    handleClyError: function(payload) {
                        this.$notify.error({
                            title: _i18n("common.error"),
                            message: payload.message
                        });
                    },
                    handleClyRefresh: function() {
                        this.$root.$emit("cly-refresh", {reason: "dateChange"});
                    }
                },
                created: function() {
                    this.$on("cly-date-change", this.handleClyRefresh);
                    this.$on("cly-error", this.handleClyError);
                }
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
