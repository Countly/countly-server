import Vue from 'vue';
import Vuex from 'vuex';
import jQuery from 'jquery';
import countlyGlobal from '../../countly.global';
import storejs from 'storejs';
import { DEFAULT_PERIOD } from '../../countly.config.js';
import { PeriodCalculator } from '../../countly.period.calculator.js';

Vue.use(Vuex);
/**
 * @typedef {{activeAppKey: string|undefined, activeAppId: string|undefined}} AppSettings
 */

// ============================================================================
// Initialization Logic (computed once at module load time)
// ============================================================================

const NAVIGATOR_LANG = navigator.language || navigator.userLanguage || 'en-US';

/**
 * Compute initial language settings from member preferences or browser
 * @returns {{browserLang: string, browserLangShort: string}} Language settings object
 */
function getInitialLanguageSettings() {
    let browserLang = NAVIGATOR_LANG;
    let browserLangShort = NAVIGATOR_LANG.split('-')[0];

    // Check for member language preference
    if (countlyGlobal.member && countlyGlobal.member.lang) {
        const lang = countlyGlobal.member.lang;
        storejs.set('countly_lang', lang);
        browserLangShort = lang;
        browserLang = lang;
    }
    else if (storejs.has('countly_lang')) {
        const lang = storejs.get('countly_lang');
        browserLangShort = lang;
        browserLang = lang;
    }

    return { browserLang, browserLangShort };
}

/**
 * Compute initial active app settings from stored preferences
 * @returns {AppSettings} App settings object
 */
function getInitialAppSettings() {
    let activeAppKey = undefined;
    let activeAppId = undefined;

    if (storejs.has('countly_active_app')) {
        const storedAppId = storejs.get('countly_active_app');
        if (countlyGlobal.apps && countlyGlobal.apps[storedAppId]) {
            activeAppKey = countlyGlobal.apps[storedAppId].key;
            activeAppId = storedAppId;
        }
    }

    return { activeAppKey, activeAppId };
}

/**
 * Compute initial period settings
 * @param {string} browserLangShort - The short browser language code
 * @returns {{initialPeriod: string, periodCalculator: PeriodCalculator}} Period settings object
 */
function getInitialPeriodSettings(browserLangShort) {
    const initialPeriod = storejs.has('countly_date')
        ? storejs.get('countly_date')
        : DEFAULT_PERIOD ?? '30days';

    const periodCalculator = new PeriodCalculator({
        period: initialPeriod,
        browserLangShort: browserLangShort,
    });

    return { initialPeriod, periodCalculator };
}

/**
 * Get persistent settings from localStorage
 * @returns {Object} Persistent settings object
 */
function getInitialPersistentSettings() {
    try {
        const stored = localStorage.getItem('persistentSettings');
        return stored ? JSON.parse(stored) : {};
    }
    catch (e) {
        return {};
    }
}

// Compute initial values
const langSettings = getInitialLanguageSettings();
const appSettings = getInitialAppSettings();
const periodSettings = getInitialPeriodSettings(langSettings.browserLangShort);

// ============================================================================
// Global Vuex Store
// ============================================================================

/**
 * Global Vuex Store for Countly Vue application
 * Contains core modules: countlyCommon, countlySidebar, and countlyApp
 *
 * This is the single source of truth for shared application state.
 */
const _globalVuexStore = new Vuex.Store({
    modules: {
        countlyContainer: {
            namespaced: true,
            state: {
                dict: {}
            },
            mutations: {
                registerData(state, { id, value, type }) {
                    if (!Object.prototype.hasOwnProperty.call(state.dict, id)) {
                        state.dict[id] = {};
                    }

                    if (type === 'object') {
                        state.dict[id].data = {};
                        Object.assign(state.dict[id].data, value);
                        return;
                    }

                    if (!Object.prototype.hasOwnProperty.call(state.dict[id], "data")) {
                        state.dict[id].data = [];
                    }

                    const items = state.dict[id].data;

                    if (!Object.prototype.hasOwnProperty.call(value, 'priority')) {
                        items.push(Object.freeze(value));
                    }
                    else {
                        let found = false;
                        let i = 0;
                        while (!found && i < items.length) {
                            if (!Object.prototype.hasOwnProperty.call(items[i], 'priority') || items[i].priority > value.priority) {
                                found = true;
                            }
                            else {
                                i++;
                            }
                        }
                        items.splice(i, 0, value);
                    }
                },
                registerTab(state, { id, tab }) {
                    if (!Object.prototype.hasOwnProperty.call(state.dict, id)) {
                        state.dict[id] = {};
                    }

                    if (!Object.prototype.hasOwnProperty.call(state.dict[id], "tabs")) {
                        state.dict[id].tabs = [];
                    }

                    tab.priority = tab.priority || 0;
                    let putAt = state.dict[id].tabs.length;

                    if (tab.priority) {
                        for (let zz = 0; zz < state.dict[id].tabs.length; zz++) {
                            if (state.dict[id].tabs[zz].priority && state.dict[id].tabs[zz].priority > tab.priority) {
                                putAt = zz;
                                break;
                            }
                        }
                    }
                    state.dict[id].tabs.splice(putAt, 0, tab);
                },
                registerMixin(state, { id, mixin }) {
                    if (!Object.prototype.hasOwnProperty.call(state.dict, id)) {
                        state.dict[id] = {};
                    }

                    if (!Object.prototype.hasOwnProperty.call(state.dict[id], "mixins")) {
                        state.dict[id].mixins = [];
                    }

                    state.dict[id].mixins.push(mixin);
                },
                registerTemplate(state, { id, path }) {
                    if (!Object.prototype.hasOwnProperty.call(state.dict, id)) {
                        state.dict[id] = {};
                    }
                    if (!Object.prototype.hasOwnProperty.call(state.dict[id], "templates")) {
                        state.dict[id].templates = [];
                    }
                    if (Array.isArray(path)) {
                        state.dict[id].templates = state.dict[id].templates.concat(path);
                    }
                    else {
                        state.dict[id].templates.push(path);
                    }
                }
            },
            getters: {
                getDict: (state) => state.dict,
                getData: (state) => (id) => state.dict[id]?.data || [],
                getTabs: (state) => (id) => state.dict[id]?.tabs || [],
                getMixins: (state) => (id) => state.dict[id]?.mixins || [],
                getTemplates: (state) => (id) => state.dict[id]?.templates || []
            }
        },
        countlyCommon: {
            namespaced: true,
            state: {
                // Language settings
                browserLang: langSettings.browserLang,
                browserLangShort: langSettings.browserLangShort,

                // App settings
                activeAppKey: appSettings.activeAppKey,
                activeAppId: appSettings.activeAppId,
                activeApp: null,
                allApps: countlyGlobal.apps || {},

                // Period settings
                periodLabel: '',
                periodCalculator: periodSettings.periodCalculator,

                // UI state
                areNotesHidden: false,
                notificationToasts: [],
                persistentNotifications: [],
                dialogs: [],

                // Persistent settings
                persistentSettings: getInitialPersistentSettings(),
            },
            getters: {
                // Language getters
                getBrowserLang: function(state) {
                    return state.browserLang;
                },
                getBrowserLangShort: function(state) {
                    return state.browserLangShort;
                },

                // App getters
                getActiveAppKey: function(state) {
                    return state.activeAppKey;
                },
                getActiveAppId: function(state) {
                    return state.activeAppId;
                },
                getActiveApp: function(state) {
                    return state.activeApp;
                },
                getActiveAppName: function(state) {
                    if (state.activeApp) {
                        return state.activeApp.name;
                    }
                    if (state.activeAppId && state.allApps && state.allApps[state.activeAppId]) {
                        return state.allApps[state.activeAppId].name;
                    }
                    return '';
                },
                getAllApps: function(state) {
                    return state.allApps;
                },

                // Period getters
                period: function(state) {
                    return state.periodCalculator._period;
                },
                periodLabel: function(state) {
                    return state.periodLabel;
                },
                getPeriodCalculator: function(state) {
                    return state.periodCalculator;
                },

                // UI getters
                getAreNotesHidden: function(state) {
                    return state.areNotesHidden;
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

                // Persistent settings getter
                getPersistentSettings: function(state) {
                    return state.persistentSettings;
                },
            },
            mutations: {
                // Language mutations
                setBrowserLang: function(state, lang) {
                    state.browserLang = lang;
                },
                setBrowserLangShort: function(state, lang) {
                    state.browserLangShort = lang;
                    storejs.set('countly_lang', lang);
                },

                // App mutations
                setActiveAppKey: function(state, key) {
                    state.activeAppKey = key;
                },
                setActiveAppId: function(state, id) {
                    state.activeAppId = id;
                },
                setActiveApp: function(state, id) {
                    if (id === null) {
                        state.activeApp = null;
                        return;
                    }
                    var appObj = state.allApps[id];
                    if (appObj) {
                        state.activeApp = Object.freeze(JSON.parse(JSON.stringify(appObj)));
                        state.activeAppId = id;
                        state.activeAppKey = appObj.key;
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

                // Period mutations
                setPeriod: function(state, payload) {
                    var period = payload.period;
                    var timeStamp = payload.timeStamp;
                    state.periodCalculator.setPeriod(period, timeStamp);
                },
                setPeriodLabel: function(state, periodLabel) {
                    state.periodLabel = periodLabel;
                },
                setPeriodCalculator: function(state, calculator) {
                    state.periodCalculator = calculator;
                },

                // UI mutations
                setAreNotesHidden: function(state, value) {
                    state.areNotesHidden = value;
                },
                addNotificationToast: function(state, payload) {
                    // Generate ID if not present
                    if (!payload.id) {
                        payload.id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                    }
                    state.notificationToasts.unshift(payload);
                },
                removeNotificationToast: function(state, id) {
                    state.notificationToasts = state.notificationToasts.filter(function(item) {
                        return item.id !== id;
                    });
                },
                addPersistentNotification: function(state, payload) {
                    if (!payload.id) {
                        payload.id = 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                    }
                    state.persistentNotifications.unshift(payload);
                },
                removePersistentNotification: function(state, notificationId) {
                    state.persistentNotifications = state.persistentNotifications.filter(function(item) {
                        return item.id !== notificationId;
                    });
                },
                addDialog: function(state, payload) {
                    if (!payload.id) {
                        payload.id = 'dialog_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                    }
                    state.dialogs.unshift(payload);
                },
                removeDialog: function(state, id) {
                    state.dialogs = state.dialogs.filter(function(item) {
                        return item.id !== id;
                    });
                },

                // Persistent settings mutations
                setPersistentSettings: function(state, data) {
                    for (const key in data) {
                        state.persistentSettings[key] = data[key];
                    }
                    localStorage.setItem('persistentSettings', JSON.stringify(state.persistentSettings));
                },
            },
            actions: {
                // Language actions
                updateBrowserLang: function(context, lang) {
                    context.commit('setBrowserLang', lang);
                },
                updateBrowserLangShort: function(context, lang) {
                    context.commit('setBrowserLangShort', lang);
                },

                // App actions
                updateActiveApp: function(context, id) {
                    context.commit("setActiveApp", id);
                },
                removeActiveApp: function(context) {
                    context.commit("setActiveApp", null);
                    context.commit("setActiveAppKey", undefined);
                    context.commit("setActiveAppId", undefined);
                    storejs.remove('countly_active_app');
                },
                /**
                 * Sets the active app by ID, persists to localStorage and optionally to server
                 * This is the single source of truth action for changing the active app
                 * @param {Object} context - Vuex action context
                 * @param {Object|string} payload - App ID string or object with { appId, persistToServer }
                 */
                setActiveAppById: function(context, payload) {
                    var appId = typeof payload === 'string' ? payload : payload.appId;
                    var persistToServer = typeof payload === 'object' ? payload.persistToServer !== false : true;

                    const allApps = context.state.allApps;
                    if (allApps && allApps[appId]) {
                        // Update store state (setActiveApp also sets key and id)
                        context.commit("setActiveApp", appId);

                        // Persist to localStorage
                        storejs.set('countly_active_app', appId);

                        // Persist to server if requested
                        if (persistToServer && countlyGlobal.member && countlyGlobal.csrf_token) {
                            jQuery.ajax({
                                type: 'POST',
                                url: countlyGlobal.path + '/user/settings/active-app',
                                data: {
                                    username: countlyGlobal.member.username,
                                    appId: appId,
                                    _csrf: countlyGlobal.csrf_token
                                },
                                success: function() { }
                            });
                        }
                    }
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

                // Period actions
                updatePeriod: function(context, obj) {
                    context.commit("setPeriod", {
                        period: obj.period,
                        timeStamp: obj.timeStamp,
                    });
                    context.commit("setPeriodLabel", obj.label);
                    storejs.set('countly_date', obj.period);
                },
                updatePeriodCalculator: function(context, calculator) {
                    context.commit("setPeriodCalculator", calculator);
                },

                // UI actions
                setAreNotesHidden: function(context, value) {
                    context.commit('setAreNotesHidden', value);
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
                },

                // Persistent settings actions
                updatePersistentSettings: function(context, data) {
                    context.commit('setPersistentSettings', data);
                },
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
        },
        /**
         * countlyApp module - Application state management
         *
         * This module serves as the single source of truth for all app-level state
         * that was previously scattered across countly.template.js and app-state.js.
         *
         * State includes:
         * - View and navigation state (activeView, routesHit, isFirstLoad)
         * - Date selection state (dateToSelected, dateFromSelected)
         * - Localization state (origLang)
         * - Request tracking
         * - Menu configurations
         * - App types
         * - Callback registries
         * - Page scripts and refresh scripts
         */
        countlyApp: {
            namespaced: true,
            state: {
                // View and navigation state
                activeView: null,
                isFirstLoad: false,
                refreshActiveView: 0, // Interval ID for view refresh
                routesHit: 0,

                // Date selection state
                dateToSelected: null,
                dateFromSelected: null,

                // Localization state
                origLang: '',

                // Request tracking
                myRequests: {},

                // Menu state
                menuForTypes: {},
                subMenuForTypes: {},
                menuForAllTypes: [],
                subMenuForAllTypes: [],
                subMenuForCodes: {},
                subMenus: {},
                internalMenuCategories: ["management", "user"],
                uniqueMenus: {},
                menuCategories: {},

                // App types
                appTypes: {},

                // Configuration registries
                pageScripts: {},
                dataExports: {},
                appSettings: {},
                widgetCallbacks: {},
                refreshScripts: {},

                // Callback registries
                appSwitchCallbacks: [],
                appManagementSwitchCallbacks: [],
                appObjectModificators: [],
                appManagementViews: {},
                appAddTypeCallbacks: [],
                userEditCallbacks: [],

                // Component ID counter for unique component identifiers
                uniqueComponentId: 0,
            },
            getters: {
                // View getters
                getActiveView: function(state) {
                    return state.activeView;
                },
                getIsFirstLoad: function(state) {
                    return state.isFirstLoad;
                },
                getRefreshActiveView: function(state) {
                    return state.refreshActiveView;
                },
                getRoutesHit: function(state) {
                    return state.routesHit;
                },

                // Date getters
                getDateToSelected: function(state) {
                    return state.dateToSelected;
                },
                getDateFromSelected: function(state) {
                    return state.dateFromSelected;
                },

                // Localization getters
                getOrigLang: function(state) {
                    return state.origLang;
                },

                // Request getters
                getMyRequests: function(state) {
                    return state.myRequests;
                },

                // Menu getters
                getMenuForTypes: function(state) {
                    return state.menuForTypes;
                },
                getSubMenuForTypes: function(state) {
                    return state.subMenuForTypes;
                },
                getMenuForAllTypes: function(state) {
                    return state.menuForAllTypes;
                },
                getSubMenuForAllTypes: function(state) {
                    return state.subMenuForAllTypes;
                },
                getSubMenuForCodes: function(state) {
                    return state.subMenuForCodes;
                },
                getSubMenus: function(state) {
                    return state.subMenus;
                },
                getInternalMenuCategories: function(state) {
                    return state.internalMenuCategories;
                },
                getUniqueMenus: function(state) {
                    return state.uniqueMenus;
                },
                getMenuCategories: function(state) {
                    return state.menuCategories;
                },

                // App types getter
                getAppTypes: function(state) {
                    return state.appTypes;
                },

                // Configuration getters
                getPageScripts: function(state) {
                    return state.pageScripts;
                },
                getDataExports: function(state) {
                    return state.dataExports;
                },
                getAppSettings: function(state) {
                    return state.appSettings;
                },
                getWidgetCallbacks: function(state) {
                    return state.widgetCallbacks;
                },
                getRefreshScripts: function(state) {
                    return state.refreshScripts;
                },

                // Callback getters
                getAppSwitchCallbacks: function(state) {
                    return state.appSwitchCallbacks;
                },
                getAppManagementSwitchCallbacks: function(state) {
                    return state.appManagementSwitchCallbacks;
                },
                getAppObjectModificators: function(state) {
                    return state.appObjectModificators;
                },
                getAppManagementViews: function(state) {
                    return state.appManagementViews;
                },
                getAppAddTypeCallbacks: function(state) {
                    return state.appAddTypeCallbacks;
                },
                getUserEditCallbacks: function(state) {
                    return state.userEditCallbacks;
                },

                // Component ID getter
                getUniqueComponentId: function(state) {
                    return state.uniqueComponentId;
                },
            },
            mutations: {
                // View mutations
                setActiveView: function(state, view) {
                    state.activeView = view;
                },
                setIsFirstLoad: function(state, value) {
                    state.isFirstLoad = value;
                },
                setRefreshActiveView: function(state, intervalId) {
                    state.refreshActiveView = intervalId;
                },
                setRoutesHit: function(state, count) {
                    state.routesHit = count;
                },
                incrementRoutesHit: function(state) {
                    state.routesHit += 1;
                },

                // Date mutations
                setDateToSelected: function(state, timestamp) {
                    state.dateToSelected = timestamp;
                },
                setDateFromSelected: function(state, timestamp) {
                    state.dateFromSelected = timestamp;
                },

                // Localization mutations
                setOrigLang: function(state, langJson) {
                    state.origLang = langJson;
                },

                // Request mutations
                addRequest: function(state, { key, request }) {
                    state.myRequests[key] = request;
                },
                removeRequest: function(state, key) {
                    delete state.myRequests[key];
                },
                clearRequests: function(state) {
                    state.myRequests = {};
                },

                // Menu mutations
                setMenuForType: function(state, { type, menu }) {
                    if (!state.menuForTypes[type]) {
                        state.menuForTypes[type] = [];
                    }
                    state.menuForTypes[type].push(menu);
                },
                setSubMenuForType: function(state, { type, subMenu }) {
                    if (!state.subMenuForTypes[type]) {
                        state.subMenuForTypes[type] = [];
                    }
                    state.subMenuForTypes[type].push(subMenu);
                },
                addMenuForAllTypes: function(state, menu) {
                    state.menuForAllTypes.push(menu);
                },
                addSubMenuForAllTypes: function(state, subMenu) {
                    state.subMenuForAllTypes.push(subMenu);
                },
                setSubMenuForCode: function(state, { code, subMenu }) {
                    if (!state.subMenuForCodes[code]) {
                        state.subMenuForCodes[code] = [];
                    }
                    state.subMenuForCodes[code].push(subMenu);
                },
                setSubMenu: function(state, { code, subMenu }) {
                    if (!state.subMenus[code]) {
                        state.subMenus[code] = [];
                    }
                    state.subMenus[code].push(subMenu);
                },
                addUniqueMenu: function(state, { code, menu }) {
                    state.uniqueMenus[code] = menu;
                },
                addMenuCategory: function(state, { category, config }) {
                    state.menuCategories[category] = config;
                },

                // App types mutations
                addAppType: function(state, { type, config }) {
                    state.appTypes[type] = config;
                },

                // Configuration mutations
                addPageScript: function(state, { path, script }) {
                    if (!state.pageScripts[path]) {
                        state.pageScripts[path] = [];
                    }
                    state.pageScripts[path].push(script);
                },
                addDataExport: function(state, { key, config }) {
                    state.dataExports[key] = config;
                },
                addAppSetting: function(state, { id, config }) {
                    state.appSettings[id] = config;
                },
                addWidgetCallback: function(state, { type, callback }) {
                    if (!state.widgetCallbacks[type]) {
                        state.widgetCallbacks[type] = [];
                    }
                    state.widgetCallbacks[type].push(callback);
                },
                addRefreshScript: function(state, { path, script }) {
                    if (!state.refreshScripts[path]) {
                        state.refreshScripts[path] = [];
                    }
                    state.refreshScripts[path].push(script);
                },

                // Callback mutations
                addAppSwitchCallback: function(state, callback) {
                    state.appSwitchCallbacks.push(callback);
                },
                addAppManagementSwitchCallback: function(state, callback) {
                    state.appManagementSwitchCallbacks.push(callback);
                },
                addAppObjectModificator: function(state, modificator) {
                    state.appObjectModificators.push(modificator);
                },
                addAppManagementView: function(state, { plugin, config }) {
                    state.appManagementViews[plugin] = config;
                },
                addAppAddTypeCallback: function(state, callback) {
                    state.appAddTypeCallbacks.push(callback);
                },
                addUserEditCallback: function(state, callback) {
                    state.userEditCallbacks.push(callback);
                },

                // Component ID mutation
                incrementComponentId: function(state) {
                    state.uniqueComponentId += 1;
                },
            },
            actions: {
                // View actions
                updateActiveView: function(context, view) {
                    context.commit('setActiveView', view);
                },
                updateIsFirstLoad: function(context, value) {
                    context.commit('setIsFirstLoad', value);
                },
                updateRefreshActiveView: function(context, intervalId) {
                    context.commit('setRefreshActiveView', intervalId);
                },
                updateRoutesHit: function(context, count) {
                    context.commit('setRoutesHit', count);
                },
                incrementRoutesHit: function(context) {
                    context.commit('incrementRoutesHit');
                },

                // Date actions
                updateDateToSelected: function(context, timestamp) {
                    context.commit('setDateToSelected', timestamp);
                },
                updateDateFromSelected: function(context, timestamp) {
                    context.commit('setDateFromSelected', timestamp);
                },

                // Localization actions
                updateOrigLang: function(context, langJson) {
                    context.commit('setOrigLang', langJson);
                },

                // Request actions
                trackRequest: function(context, { key, request }) {
                    context.commit('addRequest', { key, request });
                },
                untrackRequest: function(context, key) {
                    context.commit('removeRequest', key);
                },
                clearAllRequests: function(context) {
                    context.commit('clearRequests');
                },

                // Menu actions
                registerMenuForType: function(context, { type, menu }) {
                    context.commit('setMenuForType', { type, menu });
                },
                registerSubMenuForType: function(context, { type, subMenu }) {
                    context.commit('setSubMenuForType', { type, subMenu });
                },
                registerMenuForAllTypes: function(context, menu) {
                    context.commit('addMenuForAllTypes', menu);
                    context.commit('addUniqueMenu', { code: menu.code, menu: menu });
                },
                registerSubMenuForAllTypes: function(context, subMenu) {
                    context.commit('addSubMenuForAllTypes', subMenu);
                },
                registerSubMenuForCode: function(context, { code, subMenu }) {
                    context.commit('setSubMenuForCode', { code, subMenu });
                },
                registerSubMenu: function(context, { code, subMenu }) {
                    context.commit('setSubMenu', { code, subMenu });
                },
                registerMenuCategory: function(context, { category, config }) {
                    context.commit('addMenuCategory', { category, config });
                },

                // App types actions
                registerAppType: function(context, { type, config }) {
                    context.commit('addAppType', { type, config });
                },

                // Configuration actions
                registerPageScript: function(context, { path, script }) {
                    context.commit('addPageScript', { path, script });
                },
                registerDataExport: function(context, { key, config }) {
                    context.commit('addDataExport', { key, config });
                },
                registerAppSetting: function(context, { id, config }) {
                    context.commit('addAppSetting', { id, config });
                },
                registerWidgetCallback: function(context, { type, callback }) {
                    context.commit('addWidgetCallback', { type, callback });
                },
                registerRefreshScript: function(context, { path, script }) {
                    context.commit('addRefreshScript', { path, script });
                },

                // Callback actions
                registerAppSwitchCallback: function(context, callback) {
                    context.commit('addAppSwitchCallback', callback);
                },
                registerAppManagementSwitchCallback: function(context, callback) {
                    context.commit('addAppManagementSwitchCallback', callback);
                },
                registerAppObjectModificator: function(context, modificator) {
                    context.commit('addAppObjectModificator', modificator);
                },
                registerAppManagementView: function(context, { plugin, config }) {
                    context.commit('addAppManagementView', { plugin, config });
                },
                registerAppAddTypeCallback: function(context, callback) {
                    context.commit('addAppAddTypeCallback', callback);
                },
                registerUserEditCallback: function(context, callback) {
                    context.commit('addUserEditCallback', callback);
                },

                // Execute callbacks
                executeAppSwitchCallbacks: function(context, { appId, refresh, firstLoad }) {
                    const callbacks = context.state.appSwitchCallbacks;
                    callbacks.forEach(function(callback) {
                        try {
                            callback(appId, refresh, firstLoad);
                        }
                        catch (e) {
                            // console.error('Error in app switch callback:', e);
                        }
                    });
                },
                executeAppManagementSwitchCallbacks: function(context, { appId, type }) {
                    const callbacks = context.state.appManagementSwitchCallbacks;
                    callbacks.forEach(function(callback) {
                        try {
                            callback(appId, type);
                        }
                        catch (e) {
                            // console.error('Error in app management switch callback:', e);
                        }
                    });
                },
                executeAppAddTypeCallbacks: function(context, type) {
                    const callbacks = context.state.appAddTypeCallbacks;
                    callbacks.forEach(function(callback) {
                        try {
                            callback(type);
                        }
                        catch (e) {
                            // console.error('Error in app add type callback:', e);
                        }
                    });
                },
                executeUserEditCallbacks: function(context, user) {
                    const callbacks = context.state.userEditCallbacks;
                    callbacks.forEach(function(callback) {
                        try {
                            callback(user);
                        }
                        catch (e) {
                            // console.error('Error in user edit callback:', e);
                        }
                    });
                },
            },
        },
    }
});

// ============================================================================
// Module Registration Helpers
// ============================================================================

let _uniqueCopiedStoreId = 0;

/**
 * Returns the global Vuex store instance
 * @returns {Vuex.Store} The global Vuex store
 */
export const getGlobalStore = function() {
    return _globalVuexStore;
};

/**
 * Registers a Vuex module globally in the store
 * @param {Object} wrapper - The module wrapper containing name and module
 * @param {boolean} copy - Whether to create a unique copy of the module
 * @param {boolean} force - Whether to force re-registration
 * @returns {string} The registered module name
 */
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

/**
 * Unregisters a Vuex module from the global store
 * @param {string} name - The name of the module to unregister
 */
export const unregister = function(name) {
    _globalVuexStore.unregisterModule(name);
};

// ============================================================================
// Convenience Accessors for countlyCommon module
// ============================================================================

/**
 * Returns the active app ID from the store
 * @returns {string|undefined} The active app ID
 */
export const getActiveAppId = function() {
    return _globalVuexStore.state.countlyCommon.activeAppId;
};

/**
 * Returns the active app key from the store
 * @returns {string|undefined} The active app key
 */
export const getActiveAppKey = function() {
    return _globalVuexStore.state.countlyCommon.activeAppKey;
};

/**
 * Returns the active app name from the store
 * @returns {string} The active app name
 */
export const getActiveAppName = function() {
    return _globalVuexStore.getters['countlyCommon/getActiveAppName'];
};

/**
 * Returns the browser language short code from the store
 * @returns {string} The browser language short code
 */
export const getBrowserLangShort = function() {
    return _globalVuexStore.state.countlyCommon.browserLangShort;
};

/**
 * Returns the browser language from the store
 * @returns {string} The browser language
 */
export const getBrowserLang = function() {
    return _globalVuexStore.state.countlyCommon.browserLang;
};

// ============================================================================
// Convenience Accessors for countlyApp module
// ============================================================================

/**
 * Returns the active view from the store
 * @returns {Object|null} The active view
 */
export const getActiveView = function() {
    return _globalVuexStore.state.countlyApp.activeView;
};

/**
 * Sets the active view in the store
 * @param {Object|null} view - The view to set as active
 */
export const setActiveView = function(view) {
    _globalVuexStore.commit('countlyApp/setActiveView', view);
};

/**
 * Returns the dateToSelected from the store
 * @returns {number|null} The end date timestamp
 */
export const getDateToSelected = function() {
    return _globalVuexStore.state.countlyApp.dateToSelected;
};

/**
 * Sets the dateToSelected in the store
 * @param {number|null} timestamp - The timestamp to set
 */
export const setDateToSelected = function(timestamp) {
    _globalVuexStore.commit('countlyApp/setDateToSelected', timestamp);
};

/**
 * Returns the dateFromSelected from the store
 * @returns {number|null} The start date timestamp
 */
export const getDateFromSelected = function() {
    return _globalVuexStore.state.countlyApp.dateFromSelected;
};

/**
 * Sets the dateFromSelected in the store
 * @param {number|null} timestamp - The timestamp to set
 */
export const setDateFromSelected = function(timestamp) {
    _globalVuexStore.commit('countlyApp/setDateFromSelected', timestamp);
};

/**
 * Returns the isFirstLoad flag from the store
 * @returns {boolean} Whether this is the first load
 */
export const getIsFirstLoad = function() {
    return _globalVuexStore.state.countlyApp.isFirstLoad;
};

/**
 * Sets the isFirstLoad flag in the store
 * @param {boolean} value - The value to set
 */
export const setIsFirstLoad = function(value) {
    _globalVuexStore.commit('countlyApp/setIsFirstLoad', value);
};

/**
 * Returns the refreshActiveView interval ID from the store
 * @returns {number} The interval ID
 */
export const getRefreshActiveView = function() {
    return _globalVuexStore.state.countlyApp.refreshActiveView;
};

/**
 * Sets the refreshActiveView interval ID in the store
 * @param {number} intervalId - The interval ID to set
 */
export const setRefreshActiveView = function(intervalId) {
    _globalVuexStore.commit('countlyApp/setRefreshActiveView', intervalId);
};

/**
 * Returns the routesHit count from the store
 * @returns {number} The number of routes hit
 */
export const getRoutesHit = function() {
    return _globalVuexStore.state.countlyApp.routesHit;
};

/**
 * Sets the routesHit count in the store
 * @param {number} count - The count to set
 */
export const setRoutesHit = function(count) {
    _globalVuexStore.commit('countlyApp/setRoutesHit', count);
};

/**
 * Increments the routesHit count in the store
 */
export const incrementRoutesHit = function() {
    _globalVuexStore.commit('countlyApp/incrementRoutesHit');
};

/**
 * Returns the origLang from the store
 * @returns {string} The original language JSON string
 */
export const getOrigLang = function() {
    return _globalVuexStore.state.countlyApp.origLang;
};

/**
 * Sets the origLang in the store
 * @param {string} langJson - The language JSON string to set
 */
export const setOrigLang = function(langJson) {
    _globalVuexStore.commit('countlyApp/setOrigLang', langJson);
};

/**
 * Returns the myRequests object from the store
 * @returns {Object} The requests object
 */
export const getMyRequests = function() {
    return _globalVuexStore.state.countlyApp.myRequests;
};

/**
 * Returns the appTypes from the store
 * @returns {Object} The app types
 */
export const getAppTypes = function() {
    return _globalVuexStore.state.countlyApp.appTypes;
};

/**
 * Returns the pageScripts from the store
 * @returns {Object} The page scripts
 */
export const getPageScripts = function() {
    return _globalVuexStore.state.countlyApp.pageScripts;
};

/**
 * Returns the dataExports from the store
 * @returns {Object} The data exports
 */
export const getDataExports = function() {
    return _globalVuexStore.state.countlyApp.dataExports;
};

/**
 * Returns the appSettings from the store
 * @returns {Object} The app settings
 */
export const getAppSettings = function() {
    return _globalVuexStore.state.countlyApp.appSettings;
};

/**
 * Returns the widgetCallbacks from the store
 * @returns {Object} The widget callbacks
 */
export const getWidgetCallbacks = function() {
    return _globalVuexStore.state.countlyApp.widgetCallbacks;
};

/**
 * Returns the refreshScripts from the store
 * @returns {Object} The refresh scripts
 */
export const getRefreshScripts = function() {
    return _globalVuexStore.state.countlyApp.refreshScripts;
};

/**
 * Returns the appSwitchCallbacks from the store
 * @returns {Array} The app switch callbacks
 */
export const getAppSwitchCallbacks = function() {
    return _globalVuexStore.state.countlyApp.appSwitchCallbacks;
};

/**
 * Returns the appManagementSwitchCallbacks from the store
 * @returns {Array} The app management switch callbacks
 */
export const getAppManagementSwitchCallbacks = function() {
    return _globalVuexStore.state.countlyApp.appManagementSwitchCallbacks;
};

/**
 * Returns the appObjectModificators from the store
 * @returns {Array} The app object modificators
 */
export const getAppObjectModificators = function() {
    return _globalVuexStore.state.countlyApp.appObjectModificators;
};

/**
 * Returns the appManagementViews from the store
 * @returns {Object} The app management views
 */
export const getAppManagementViews = function() {
    return _globalVuexStore.state.countlyApp.appManagementViews;
};

/**
 * Returns the appAddTypeCallbacks from the store
 * @returns {Array} The app add type callbacks
 */
export const getAppAddTypeCallbacks = function() {
    return _globalVuexStore.state.countlyApp.appAddTypeCallbacks;
};

/**
 * Returns the userEditCallbacks from the store
 * @returns {Array} The user edit callbacks
 */
export const getUserEditCallbacks = function() {
    return _globalVuexStore.state.countlyApp.userEditCallbacks;
};

/**
 * Returns the menu categories from the store
 * @returns {Object} The menu categories
 */
export const getMenuCategories = function() {
    return _globalVuexStore.state.countlyApp.menuCategories;
};

/**
 * Returns the menuForTypes from the store
 * @returns {Object} The menu for types
 */
export const getMenuForTypes = function() {
    return _globalVuexStore.state.countlyApp.menuForTypes;
};

/**
 * Returns the subMenuForTypes from the store
 * @returns {Object} The sub menu for types
 */
export const getSubMenuForTypes = function() {
    return _globalVuexStore.state.countlyApp.subMenuForTypes;
};

/**
 * Returns the menuForAllTypes from the store
 * @returns {Array} The menu for all types
 */
export const getMenuForAllTypes = function() {
    return _globalVuexStore.state.countlyApp.menuForAllTypes;
};

/**
 * Returns the subMenuForAllTypes from the store
 * @returns {Array} The sub menu for all types
 */
export const getSubMenuForAllTypes = function() {
    return _globalVuexStore.state.countlyApp.subMenuForAllTypes;
};

/**
 * Returns the subMenuForCodes from the store
 * @returns {Object} The sub menu for codes
 */
export const getSubMenuForCodes = function() {
    return _globalVuexStore.state.countlyApp.subMenuForCodes;
};

/**
 * Returns the subMenus from the store
 * @returns {Object} The sub menus
 */
export const getSubMenus = function() {
    return _globalVuexStore.state.countlyApp.subMenus;
};

/**
 * Returns the uniqueMenus from the store
 * @returns {Object} The unique menus
 */
export const getUniqueMenus = function() {
    return _globalVuexStore.state.countlyApp.uniqueMenus;
};

/**
 * Returns the internalMenuCategories from the store
 * @returns {Array} The internal menu categories
 */
export const getInternalMenuCategories = function() {
    return _globalVuexStore.state.countlyApp.internalMenuCategories;
};

/**
 * Returns the current uniqueComponentId from the store
 * @returns {number} The current unique component ID
 */
export const getUniqueComponentId = function() {
    return _globalVuexStore.state.countlyApp.uniqueComponentId;
};

/**
 * Increments the uniqueComponentId in the store and returns the new value
 * @returns {number} The new unique component ID
 */
export const incrementAndGetComponentId = function() {
    _globalVuexStore.commit('countlyApp/incrementComponentId');
    return _globalVuexStore.state.countlyApp.uniqueComponentId;
};

// ============================================================================
// Convenience Accessors for countlyContainer module
// ============================================================================

/**
 * Returns the container dict from the store
 * @returns {Object} The container dict
 */
export const getContainerDict = function() {
    return _globalVuexStore.state.countlyContainer.dict;
};

/**
 * Returns data for a specific container ID from the store
 * @param {string} id - The container identifier
 * @returns {Array|Object} The container data
 */
export const getContainerData = function(id) {
    return _globalVuexStore.getters['countlyContainer/getData'](id);
};

/**
 * Returns tabs for a specific container ID from the store
 * @param {string} id - The container identifier
 * @returns {Array} The container tabs
 */
export const getContainerTabs = function(id) {
    return _globalVuexStore.getters['countlyContainer/getTabs'](id);
};

/**
 * Returns mixins for a specific container ID from the store
 * @param {string} id - The container identifier
 * @returns {Array} The container mixins
 */
export const getContainerMixins = function(id) {
    return _globalVuexStore.getters['countlyContainer/getMixins'](id);
};

/**
 * Returns templates for a specific container ID from the store
 * @param {string} id - The container identifier
 * @returns {Array} The container templates
 */
export const getContainerTemplates = function(id) {
    return _globalVuexStore.getters['countlyContainer/getTemplates'](id);
};

/**
 * Initializes the app switch callback for updating active app in store
 * Should be called when DOM is ready
 */
export const initAppSwitchCallback = function() {
    window.app.addAppSwitchCallback(function(appId) {
        _globalVuexStore.dispatch("countlyCommon/updateActiveApp", appId);
    });
};

// Default export
export default _globalVuexStore;