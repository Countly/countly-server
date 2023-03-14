/* global countlyCommon, jQuery, Vue, Vuex, T, countlyView, VueCompositionAPI, app, countlyGlobal, store, countlyAuth, CountlyHelpers */

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
                    if (jqXHR.responseJSON && jqXHR.responseJSON.result === 'Token not valid') {
                        CountlyHelpers.logout();
                    }
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
                },
                isUserGlobalAdmin: function() {
                    return countlyAuth.validateGlobalAdmin();
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
            formatNumberSafe: countlyCommon.formatNumberSafe,
            getShortNumber: countlyCommon.getShortNumber,
            unescapeHtml: countlyCommon.unescapeHtml
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

    var optionalComponent = function(componentId) {
        if (componentId in Vue.options.components) {
            return componentId;
        }
        return null;
    };

    var basicComponentUtilsMixin = {
        methods: {
            optionalComponent: optionalComponent
        }
    };

    var DashboardsAppsMixin = {
        computed: {
            __allApps: function() {
                return this.$store.getters["countlyDashboards/allApps"];
            }
        },
        methods: {
            __getAppName: function(appId) {
                if (this.__allApps && this.__allApps[appId] && this.__allApps[appId].name) {
                    return this.__allApps[appId].name;
                }
                else {
                    return "Deleted";
                }
            },
            __getAppLogo: function(appId) {
                if (this.__allApps && this.__allApps[appId] && this.__allApps[appId].image) {
                    return this.__allApps[appId].image;
                }
                else {
                    return 'appimages/' + appId + '.png';
                }
            }
        }
    };

    var DashboardsWidgetMixin = {
        methods: {
            calculateTableDataFromWidget: function(widgetData) {
                widgetData = widgetData || {};
                var dd = widgetData.dashData || {};
                dd = dd.data || {};

                var keys1 = Object.keys(dd);
                if (keys1.length > 0) {
                    dd = dd[keys1[0]];
                }
                var tableData = [];
                for (var k = 0; k < dd.rows.length; k++) {
                    var ob = {};
                    for (var z = 0; z < dd.cols.length; z++) {
                        ob[dd.cols[z]] = dd.rows[k][z];
                    }
                    tableData.push(ob);
                }
                return tableData;
            },
            calculateTableColsFromWidget: function(widgetData, namingMap) {
                widgetData = widgetData || {};
                widgetData.metrics = widgetData.metrics || [];

                var dd = widgetData.dashData || {};
                dd = dd.data || {};

                var keys1 = Object.keys(dd);
                if (keys1.length > 0) {
                    dd = dd[keys1[0]];
                }
                var fields = [];
                for (var k = 0; k < dd.cols.length; k++) {
                    if (k > 0) {
                        if (widgetData.metrics.indexOf(dd.cols[k]) > -1) {
                            fields.push({"prop": dd.cols[k], "title": namingMap[dd.cols[k]], "type": "number"});
                        }
                    }
                    else {
                        fields.push({"prop": dd.cols[k], "title": namingMap[dd.cols[k]] || "name"}); //first one in "name"
                    }
                }
                return fields;
            },
            calculateStackedBarOptionsFromWidget: function(widgetData, map) {
                widgetData = widgetData || {};
                widgetData.dashData = widgetData.dashData || {};
                widgetData.dashData.data = widgetData.dashData.data || {};
                widgetData.metrics = widgetData.metrics || [];

                var labels = [];
                var series = [];
                for (var app in widgetData.dashData.data) {
                    if (widgetData.dashData.data[app].graph) {
                        for (var k = 0; k < widgetData.dashData.data[app].graph.length; k++) {
                            labels.push(widgetData.dashData.data[app].graph[k].name);
                            series.push(widgetData.dashData.data[app].graph[k].value);
                        }
                    }
                    else {
                        for (var kz = 0; kz < widgetData.dashData.data[app].length; kz++) {
                            labels.push(widgetData.dashData.data[app][kz].name);
                            series.push(widgetData.dashData.data[app][kz].value);
                        }
                    }
                }
                var metricName = widgetData.metrics[0];
                if (map && map[widgetData.metrics[0]]) {
                    metricName = map[widgetData.metrics[0]];
                }
                if (widgetData.bar_color && widgetData.bar_color > 0) {
                    return {xAxis: {data: labels}, series: [{"name": metricName, color: countlyCommon.GRAPH_COLORS[this.data.bar_color - 1], "data": series, stack: "A"}]};
                }
                else {
                    return {xAxis: {data: labels}, series: [{"name": metricName, "data": series, stack: "A"}]};
                }
            },
            calculatePieGraphFromWidget: function(widgetData, namingMap) {
                widgetData = widgetData || {};
                widgetData.metrics = widgetData.metrics || [];
                var dd = widgetData.dashData || {};
                dd = dd.data || {};

                if (widgetData.apps && widgetData.apps[0]) {
                    dd = dd[widgetData.apps[0]] || {};
                }
                var metric = widgetData.metrics[0];
                var total = 0;
                if (dd.total && dd.total[metric]) {
                    total = dd.total[metric];
                }
                return {
                    series: [
                        {
                            name: namingMap[metric],
                            data: dd.graph,
                            label: {
                                formatter: "{a|" + namingMap[metric] + "}\n" + (countlyCommon.getShortNumber(total) || 0),
                                fontWeight: 500,
                                fontSize: 16,
                                fontFamily: "Inter",
                                lineHeight: 24,
                                rich: {
                                    a: {
                                        fontWeight: "normal",
                                        fontSize: 14,
                                        lineHeight: 16
                                    }
                                }
                            }
                        }
                    ]
                };
            },
            calculateNumberFromWidget: function(widgetData) {
                widgetData = widgetData || {};
                widgetData.dashData = widgetData.dashData || {};
                var value;
                widgetData.dashData.data = widgetData.dashData.data || {};
                for (var app in widgetData.dashData.data) {
                    value = widgetData.dashData.data[app];
                }
                return value;
            }
        }
    };

    var DashboardsGlobalMixin = {
        props: {
            data: {
                type: Object,
                default: function() {
                    return {};
                }
            },
            isAllowed: {
                type: Boolean,
                default: true
            },
            loading: {
                type: Boolean,
                default: true
            }
        }
    };

    var _mixins = {
        'autoRefresh': autoRefreshMixin,
        'refreshOnParentActive': refreshOnParentActiveMixin,
        'i18n': i18nMixin,
        'commonFormatters': commonFormattersMixin,
        'auth': authMixin,
        'basicComponentUtils': basicComponentUtilsMixin,
        'customDashboards': {
            apps: DashboardsAppsMixin,
            widget: DashboardsWidgetMixin,
            global: DashboardsGlobalMixin
        },
    };

    var _globalVuexStore = new Vuex.Store({
        modules: {
            countlyCommon: {
                namespaced: true,
                state: {
                    areNotesHidden: false,
                    period: countlyCommon.getPeriod(),
                    periodLabel: countlyCommon.getDateRangeForCalendar(),
                    activeApp: null,
                    allApps: countlyGlobal.apps,
                    notificationToasts: [],
                    dialogs: []
                },
                getters: {
                    getAreNotesHidden(state) {
                        return state.areNotesHidden;
                    },
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
                    },
                    confirmDialogs: function(state) {
                        return state.dialogs.filter(function(item) {
                            return item.intent === "confirm";
                        });
                    },
                    messageDialogs: function(state) {
                        return state.dialogs.filter(function(item) {
                            return item.intent === "message";
                        });
                    }
                },
                mutations: {
                    setAreNotesHidden: function(state, value) {
                        state.areNotesHidden = value;
                    },
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
                            state.allApps[additionalApps._id] = JSON.parse(JSON.stringify(additionalApps));
                        }
                        state.allApps = Object.assign({}, state.allApps, {});
                    },
                    removeFromAllApps: function(state, appToRemoveId) {
                        var appObj = state.allApps[appToRemoveId];
                        if (appObj) {
                            delete state.allApps[appToRemoveId];
                        }
                        state.allApps = Object.assign({}, state.allApps, {});

                    },
                    deleteAllApps: function(state) {
                        state.allApps = null;
                        state.allApps = Object.assign({}, state.allApps, {});
                    },
                    addNotificationToast: function(state, payload) {
                        payload.id = countlyCommon.generateId();
                        state.notificationToasts.unshift(payload);
                    },
                    removeNotificationToast: function(state, id) {
                        state.notificationToasts = state.notificationToasts.filter(function(item) {
                            return item.id !== id;
                        });
                    },
                    addDialog: function(state, payload) {
                        payload.id = countlyCommon.generateId();
                        state.dialogs.unshift(payload);
                    },
                    removeDialog: function(state, id) {
                        state.dialogs = state.dialogs.filter(function(item) {
                            return item.id !== id;
                        });
                    }
                },
                actions: {
                    setAreNotesHidden: function(context, value) {
                        context.commit('setAreNotesHidden', value);
                    },
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
                    },
                    onAddDialog: function(context, payload) {
                        context.commit('addDialog', payload);
                    },
                    onRemoveDialog: function(context, payload) {
                        context.commit('removeDialog', payload);
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
            var elType = jqEl.get(0).type;
            if (elId && elType === "text/x-template") {
                if ($(parentSelector).find("#" + elId).length === 0) {
                    $(parentSelector).append(jqEl);
                }
                else {
                    // eslint-disable-next-line no-console
                    console.log("Duplicate component templates are not allowed. Please check the template with \"" + elId + "\" id.");
                }
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

    var NotificationToastsView = {
        template: '<div class="notification-toasts"> \
                        <cly-notification v-for="(toast) in notificationToasts" :key="toast.id" :id="toast.id" :text="toast.text" :autoHide="toast.autoHide" :color="toast.color" :closable="true" @close="onClose" class="notification-toasts__item"></cly-notification>\
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
    };

    var DialogsView = {
        template: '<div>\
                        <cly-confirm-dialog\
                            v-for="dialog in confirmDialogs"\
                            @confirm="onCloseDialog(dialog, true)"\
                            @cancel="onCloseDialog(dialog, false)"\
                            @close="onCloseDialog(dialog, false)"\
                            visible\
                            :key="dialog.id"\
                            :dialogType="dialog.type"\
                            :saveButtonLabel="dialog.confirmLabel"\
                            :cancelButtonLabel="dialog.cancelLabel"\
                            :title="dialog.title">\
                                <template slot-scope="scope">\
                                    <div v-html="dialog.message"></div>\
                                </template>\
                        </cly-confirm-dialog>\
                        <cly-message-dialog\
                            v-for="dialog in messageDialogs"\
                            @confirm="onCloseDialog(dialog, true)"\
                            @close="onCloseDialog(dialog, false)"\
                            visible\
                            :show-close="false"\
                            :key="dialog.id"\
                            :dialogType="dialog.type"\
                            :confirmButtonLabel="dialog.confirmLabel"\
                            :title="dialog.title">\
                                <template slot-scope="scope">\
                                    <div v-html="dialog.message"></div>\
                                </template>\
                        </cly-message-dialog>\
                </div>',
        store: _vuex.getGlobalStore(),
        computed: {
            messageDialogs: function() {
                return this.$store.getters['countlyCommon/messageDialogs'];
            },
            confirmDialogs: function() {
                return this.$store.getters['countlyCommon/confirmDialogs'];
            }
        },
        methods: {
            onCloseDialog: function(dialog, status) {
                if (dialog.callback) {
                    dialog.callback(status);
                }
                this.$store.dispatch('countlyCommon/onRemoveDialog', dialog.id);
            }
        }
    };

    var GenericPopupsView = {
        components: {
            NotificationToasts: NotificationToastsView,
            Dialogs: DialogsView
        },
        template: '<div>\
                        <NotificationToasts></NotificationToasts>\
                        <Dialogs></Dialogs>\
                    </div>'
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
                    GenericPopups: GenericPopupsView
                },
                template: '<div>\
                                <MainView></MainView>\
                                <GenericPopups></GenericPopups>\
                                <DummyCompAPI></DummyCompAPI>\
                            </div>',
                beforeCreate: function() {
                    this.$route.params = self.params;
                },
                methods: {
                    handleClyError: function(payload) {
                        if (countlyCommon.DEBUG) {
                            CountlyHelpers.notify({
                                title: _i18n("common.error"),
                                message: payload.message,
                                type: "error"
                            });
                        }
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
        mixins: [
            basicComponentUtilsMixin
        ],
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
        T: templateUtil.stage,
        optionalComponent: optionalComponent
    };

    for (var key in rootElements) {
        countlyVue[key] = rootElements[key];
    }

    window.CV = countlyVue;

}(window.countlyVue = window.countlyVue || {}, jQuery));
