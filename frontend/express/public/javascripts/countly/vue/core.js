/* global  app, countlyAuth */

import jQuery from 'jquery';
import countlyCommon from '../countly.common';
import Vue from 'vue';
import Vuex from 'vuex';
import { logout, notify, T } from '../countly.helpers';
import countlyView from '../countly.view';
import countlyGlobal from '../countly.global';
import store from 'storejs';
import VueECharts from 'vue-echarts';
import "echarts";

Vue.use(Vuex);
Vue.component('echarts', VueECharts);

// @vue/component
export const autoRefreshMixin = {
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

export const i18n = function() {
    var appType = (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type) || "mobile";
    let args = arguments || [];
    if (args.length === 1) { //single arg. use map
        return i18nM(args[0]);
    }
    else if (!appType || appType === "mobile") {
        return jQuery.i18n.prop.apply(null, args);
    }
    else {
        var key = args[0];
        if (!jQuery.i18n.map[appType + "." + key]) {
            // Key miss
            return jQuery.i18n.prop.apply(null, args);
        }
        else {
            // Key hit
            var argsCopy = Array.prototype.slice.call(args);
            argsCopy[0] = appType + "." + key;
            return jQuery.i18n.prop.apply(null, argsCopy);
        }
    }
};

export const i18nM = function(key) {
    var appType = (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type) || "mobile";
    if (!appType || appType === "mobile") {
        return jQuery.i18n.map[key] || key;
    }
    else {
        return jQuery.i18n.map[appType + "." + key] || jQuery.i18n.map[key] || key;
    }
};

export const ajax = function(request, options) {
    options = options || {};
    var ajaxP = new Promise(function(resolve, reject) {
        jQuery.ajax(request).done(resolve).fail(reject);
    });
    if (!options.disableAutoCatch) {
        return ajaxP.catch(function(jqXHR) {
            if (jqXHR.responseJSON && jqXHR.responseJSON.result === 'Token not valid') {
                logout();
            }
            if (jqXHR.abort_reason === "duplicate" || (jqXHR.statusText !== "abort" && jqXHR.statusText !== "canceled")) {
                app.activeView.onError(jqXHR);
            }
        });
    }
    return ajaxP;
};

/**
* This function returns an authentication mixin object for a given feature or array of features.
* @param {string|array} featureName - The name of the feature(s) to create the authentication mixin for
* @returns {object} - Returns an object containing computed properties for authentication.
*/
export const authMixin = function(featureName) {
    if (!Array.isArray(featureName)) {
        featureName = [featureName];
    }
    var checkAuthArray = function(func) {
        for (var i = 0; i < featureName.length; i++) {
            if (func(featureName[i])) {
                return true;
            }
        }
        return false;
    };
    return {
        // uses computed mainly to prevent mutations of these values
        // using helper function checkAuthArray to act as a 'or' returns true if atleast one feature is validated else false
        computed: {
            canUserCreate: function() {
                return checkAuthArray(countlyAuth.validateCreate);
            },
            canUserRead: function() {
                return checkAuthArray(countlyAuth.validateRead);
            },
            canUserUpdate: function() {
                return checkAuthArray(countlyAuth.validateUpdate);
            },
            canUserDelete: function() {
                return checkAuthArray(countlyAuth.validateDelete);
            },
            isUserGlobalAdmin: function() {
                return countlyAuth.validateGlobalAdmin();
            }
        }
    };
};

// @vue/component
export const i18nMixin = {
    methods: {
        i18n: i18n,
        i18nM: i18nM
    }
};

// @vue/component
export const commonFormattersMixin = {
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
export const refreshOnParentActiveMixin = {
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

export const optionalComponent = function(componentId) {
    if (componentId in Vue.options.components) {
        return componentId;
    }
    return null;
};

export const basicComponentUtilsMixin = {
    methods: {
        optionalComponent: optionalComponent
    }
};

export const DashboardsAppsMixin = {
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

export const DashboardsWidgetMixin = {
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
        calculateStackedBarTimeSeriesOptionsFromWidget: function(widgetData) {
            widgetData = widgetData || {};
            widgetData.dashData = widgetData.dashData || {};
            widgetData.dashData.data = widgetData.dashData.data || {};
            widgetData.metrics = widgetData.metrics || [];

            for (var app in widgetData.dashData.data) {
                return widgetData.dashData.data[app];
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

export const DashboardsGlobalMixin = {
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

export const mixins = {
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

const _globalVuexStore = new Vuex.Store({
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
                persistentNotifications: [],
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
                },
                blockerDialogs: function(state) {
                    return state.dialogs.filter(function(item) {
                        return item.intent === "blocker";
                    });
                },
                quickstartContent: function(state) {
                    return state.dialogs.filter(function(item) {
                        return item.intent === "quickstart";
                    });
                },
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
                addPersistentNotification: function(state, payload) {
                    if (!payload.id) {
                        payload.id = countlyCommon.generateId();
                    }
                    state.persistentNotifications.unshift(payload);
                },
                removePersistentNotification: function(state, notificationId) {
                    state.persistentNotifications = state.persistentNotifications.filter(function(item) {
                        return item.id !== notificationId;
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
                onAddPersistentNotification: function(context, payload) {
                    context.commit('addPersistentNotification', payload);
                },
                onRemovePersistentNotification: function(context, notificationId) {
                    context.commit('removePersistentNotification', notificationId);
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
                selectedMenuItem: {},
                guidesButton: '',
                showMainMenu: window.localStorage.getItem('countlySidebarMenuVisible') === "false" ? false : true,
            },
            getters: {
                getSelectedMenuItem: function(state) {
                    return state.selectedMenuItem;
                },
                getGuidesButton: function(state) {
                    return state.guidesButton;
                }
            },
            mutations: {
                setSelectedMenuItem: function(state, payload) {
                    state.selectedMenuItem = payload;
                },
                setGuidesButton: function(state, payload) {
                    state.guidesButton = payload;
                },
                toggleMainMenu(state, show) {
                    if (typeof show !== "boolean") {
                        show = !state.showMainMenu;
                    }
                    state.showMainMenu = show;
                    window.localStorage.setItem('countlySidebarMenuVisible', show);
                }
            },
            actions: {
                updateSelectedMenuItem: function({commit}, payload) {
                    commit('setSelectedMenuItem', payload);
                },
                selectGuidesButton: function(context) {
                    context.commit('setGuidesButton', 'selected');
                },
                deselectGuidesButton: ({ getters, commit }) => {
                    const buttonState = getters.getGuidesButton;
                    if (buttonState !== 'highlighted') {
                        commit('setGuidesButton', '');
                    }
                },
                highlightGuidesButton: function({getters, commit}, payload) {
                    const buttonState = getters.getGuidesButton;
                    if (!payload) {
                        payload = 'hover';
                    }
                    if (buttonState !== 'selected') {
                        commit('setGuidesButton', payload);
                    }
                }
            }
        }
    }
});

jQuery(document).ready(function() {
    app.addAppSwitchCallback(function(appId) {
        _globalVuexStore.dispatch("countlyCommon/updateActiveApp", appId);
    });
});

let _uniqueCopiedStoreId = 0;

export const getGlobalStore = function() {
    return _globalVuexStore;
};

export const registerGlobally = function(wrapper, copy, force) {
    var vuexStore = _globalVuexStore;
    var name = wrapper.name;
    if (copy) {
        name += "_" + _uniqueCopiedStoreId;
        _uniqueCopiedStoreId += 1;
    }
    if (!vuexStore.hasModule(name) || force) {
        vuexStore.registerModule(name, wrapper.module);
    }
    return name;
};

export const unregister = function(name) {
    _globalVuexStore.unregisterModule(name);
};

export const vuex = {
    getGlobalStore: getGlobalStore,
    registerGlobally: registerGlobally,
    unregister: unregister
};

export const BackboneRouteAdapter = function() {};

Vue.prototype.$route = new BackboneRouteAdapter();

// export const DummyCompAPI = defineComponent({
//     name: "DummyCompAPI",
//     template: '<div></div>',
//     setup: function() {}
// });

export const TemplateLoader = function(templates) {
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

        return jQuery.when.apply(null, templatesDeferred);
    }
    return true;
};

TemplateLoader.prototype.mount = function(parentSelector) {
    parentSelector = parentSelector || "#vue-templates";
    this.elementsToBeRendered.forEach(function(el) {
        var jqEl = jQuery(el);
        var elId = jqEl.get(0).id;
        var elType = jqEl.get(0).type;
        if (elId && elType === "text/x-template") {
            if (jQuery(parentSelector).find("#" + elId).length === 0) {
                jQuery(parentSelector).append(jqEl);
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

export const VuexLoader = function(vuexModules) {
    this.vuex = vuexModules;
    this.loadedModules = [];
};

VuexLoader.prototype.load = function() {
    var self = this;
    this.vuex.forEach(function(item) {
        var module = item.clyModel.getVuexModule();
        vuex.registerGlobally(module);
        self.loadedModules.push(module);
    });
};

VuexLoader.prototype.destroy = function() {
    var self = this;
    this.loadedModules.forEach(function(mid, index) {
        if (mid.destroy !== false) {
            vuex.unregister(mid.name);
            self.loadedModules.splice(index, 1);
        }
    });
};

export const NotificationToastsView = {
    template: '<div class="notification-toasts"> \
                    <cly-notification v-for="(toast) in notificationToasts" :key="toast.id" :id="toast.id" :text="toast.text" :goTo="toast.goTo" :autoHide="toast.autoHide" :color="toast.color" :closable="true" :customWidth="toast.width" :toast="true" @close="onClose" class="notification-toasts__item"></cly-notification>\
                </div>',
    store: _globalVuexStore,
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

export const DialogsView = {
    template: '<div>\
                    <cly-confirm-dialog\
                        v-for="dialog in confirmDialogs"\
                        @confirm="onCloseDialog(dialog, true)"\
                        @cancel="onCloseDialog(dialog, false)"\
                        @close="onCloseDialog(dialog, false)"\
                        visible\
                        :key="dialog.id"\
                        :dialogType="dialog.type"\
                        :test-id="dialog.testId"\
                        :saveButtonLabel="dialog.confirmLabel"\
                        :cancelButtonLabel="dialog.cancelLabel"\
                        :title="dialog.title"\
                        :show-close="dialog.showClose"\
                        :alignCenter="dialog.alignCenter">\
                            <template slot-scope="scope">\
                                <div v-html="dialog.message"></div>\
                            </template>\
                    </cly-confirm-dialog>\
                    <cly-message-dialog\
                        v-for="dialog in messageDialogs"\
                        @confirm="onCloseDialog(dialog, true)"\
                        @close="onCloseDialog(dialog, false)"\
                        :test-id="dialog.testId"\
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
                    <el-dialog\
                        v-for="dialog in blockerDialogs"\
                        visible\
                        :test-id="dialog.testId"\
                        :center="dialog.center"\
                        :width="dialog.width"\
                        :close-on-click-modal="false"\
                        :close-on-press-escape="false"\
                        :show-close="false"\
                        :key="dialog.id"\
                        :title="dialog.title">\
                        <div v-html="dialog.message"></div>\
                    </el-dialog>\
            </div>',
    store: _globalVuexStore,
    computed: {
        messageDialogs: function() {
            return this.$store.getters['countlyCommon/messageDialogs'];
        },
        confirmDialogs: function() {
            return this.$store.getters['countlyCommon/confirmDialogs'];
        },
        blockerDialogs: function() {
            return this.$store.getters['countlyCommon/blockerDialogs'];
        },
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

export const GenericPopupsView = {
    components: {
        NotificationToasts: NotificationToastsView,
        Dialogs: DialogsView
    },
    template: '<div>\
                    <NotificationToasts></NotificationToasts>\
                    <Dialogs></Dialogs>\
                </div>'
};

export const QuickstartPopoverView = {
    template: '<div class="quickstart-popover-wrapper" data-test-id="quickstart-popover-wrapper">\
        <div class="quickstart-popover-positioner" data-test-id="quickstart-popover-positioner">\
        <el-popover\
            v-for="content in quickstartContent"\
            popper-class="quickstart-popover-popover"\
            :value="!!content"\
            :visible-arrow="false"\
            trigger="manual"\
            :width="content.width"\
            :key="content.id"\
            :title="content.title">\
            <i class="ion-close bu-is-size-7 quickstart-popover-close" data-test-id="quickstart-popover-close" @click="handleCloseClick(content.id)"></i>\
            <div v-html="content.message"></div>\
        </el-popover>\
        </div>\
    </div>',
    store: _globalVuexStore,
    computed: {
        quickstartContent: function() {
            return this.$store.getters['countlyCommon/quickstartContent'];
        },
    },
    methods: {
        handleCloseClick: function(dialogId) {
            this.$store.dispatch('countlyCommon/onRemoveDialog', dialogId);
        },
    },
};

export const countlyVueWrapperView = countlyView.extend({
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
            jQuery(this.el).html("<div><div class='vue-wrapper'></div><div id='vue-templates'></div></div>");
            jQuery("body").addClass("cly-vue-theme-clydef");
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
        var el = jQuery(this.el).find('.vue-wrapper').get(0),
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
            store: _globalVuexStore,
            components: {
                // DummyCompAPI: DummyCompAPI,
                MainView: self.component,
                GenericPopups: GenericPopupsView,
                QuickstartPopover: QuickstartPopoverView
            },
            template: '<div>\
                            <MainView></MainView>\
                            <GenericPopups></GenericPopups>\
                            <!--<DummyCompAPI></DummyCompAPI>-->\
                            <QuickstartPopover></QuickstartPopover>\
                        </div>',
            beforeCreate: function() {
                this.$route.params = self.params;
            },
            methods: {
                handleClyError: function(payload) {
                    if (countlyCommon.DEBUG) {
                        notify({
                            title: i18n("common.error"),
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
            jQuery("body").removeClass("cly-vue-theme-clydef");
            self.vm.$destroy();
            self.vm.$off();
            jQuery(self.vm.$el).remove();
            self.vm = null;
        }
        this.vuexLoader.destroy();
    }
});

let _uniqueComponentId = 0;

export const countlyBaseComponent = Vue.extend({
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

export const countlyBaseView = countlyBaseComponent.extend(
    // @vue/component
    {
        mixins: [
            mixins.autoRefresh,
            mixins.i18n,
            mixins.commonFormatters
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

export const BaseContentMixin = countlyBaseComponent.extend(
    // @vue/component
    {
        inheritAttrs: false,
        mixins: [
            mixins.i18n
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

// Add BaseContent to mixins
mixins.BaseContent = BaseContentMixin;

export const templateUtil = {
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

export const asyncCreate = function(base) {
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

export const components = {
    BaseComponent: countlyBaseComponent,
    create: asyncCreate(countlyBaseComponent)
};

export const views = {
    BackboneWrapper: countlyVueWrapperView,
    BaseView: countlyBaseView,
    create: asyncCreate(countlyBaseView)
};

// Default export for backwards compatibility
const countlyVue = {
    i18n,
    i18nM,
    mixins,
    views,
    components,
    vuex,
    T: templateUtil.stage,
    optionalComponent,
    $: { ajax }
};

export default countlyVue;