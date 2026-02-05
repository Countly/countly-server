/**
 * App Callbacks Module
 *
 * Contains functions for registering and invoking various callbacks
 * throughout the application lifecycle.
 * 
 * All callback registries are now stored in the Vuex store (countlyApp module)
 * as the single source of truth. This module provides convenience functions
 * that dispatch actions or commit mutations to the store.
 */

import jQuery from 'jquery';
import countlyGlobal from '../countly.global.js';
import { getGlobalStore } from '../vue/data/store.js';

const $ = jQuery;

/**
 * Register a callback to be called when the app is switched
 * @param {function|object} callback - Callback function or object with name and fn properties
 */
export function addAppSwitchCallback(callback) {
    const store = getGlobalStore();
    const callbackObj = typeof callback === "function"
        ? { name: "unknown", fn: callback }
        : callback;
    store.commit('countlyApp/addAppSwitchCallback', callbackObj);
}

/**
 * Register a callback for app management switch
 * @param {function} callback - Callback function
 */
export function addAppManagementSwitchCallback(callback) {
    const store = getGlobalStore();
    store.commit('countlyApp/addAppManagementSwitchCallback', callback);
}

/**
 * Register a function to modify the app object
 * @param {function} callback - Modificator function
 */
export function addAppObjectModificator(callback) {
    const store = getGlobalStore();
    store.commit('countlyApp/addAppObjectModificator', callback);
}

/**
 * Register a view for app management
 * @param {string} plugin - Plugin name
 * @param {object} options - View options with title and view properties
 */
export function addAppManagementView(plugin, options) {
    const store = getGlobalStore();
    store.commit('countlyApp/addAppManagementView', {
        plugin: plugin,
        config: {
            title: options.title,
            view: options.view
        }
    });
}

/**
 * Register inputs for app management
 * @param {string} plugin - Plugin name
 * @param {object} options - Input options with title and inputs properties
 */
export function addAppManagementInput(plugin, options) {
    const store = getGlobalStore();
    store.commit('countlyApp/addAppManagementView', {
        plugin: plugin,
        config: {
            title: options.title,
            inputs: options.inputs
        }
    });
}

/**
 * Register an app setting
 * @param {string} id - Setting identifier
 * @param {object} options - Setting options
 */
export function addAppSetting(id, options) {
    const store = getGlobalStore();
    store.commit('countlyApp/addAppSetting', { id: id, config: options });
}

/**
 * Register a callback for app type addition
 * @param {function} callback - Callback function
 */
export function addAppAddTypeCallback(callback) {
    const store = getGlobalStore();
    store.commit('countlyApp/addAppAddTypeCallback', callback);
}

/**
 * Register a callback for user edit
 * @param {function} callback - Callback function
 */
export function addUserEditCallback(callback) {
    const store = getGlobalStore();
    store.commit('countlyApp/addUserEditCallback', callback);
}

/**
 * Register a data export handler
 * @param {string} name - Export name
 * @param {function} callback - Export function
 */
export function addDataExport(name, callback) {
    const store = getGlobalStore();
    store.commit('countlyApp/addDataExport', { key: name, config: callback });
}

/**
 * Register a page script to run on specific routes
 * @param {string} route - Route pattern
 * @param {function} callback - Script function
 */
export function addPageScript(route, callback) {
    const store = getGlobalStore();
    store.commit('countlyApp/addPageScript', { path: route, script: callback });
}

/**
 * Register a refresh script to run on data refresh
 * @param {string} route - Route pattern
 * @param {function} callback - Refresh function
 */
export function addRefreshScript(route, callback) {
    const store = getGlobalStore();
    store.commit('countlyApp/addRefreshScript', { path: route, script: callback });
}

/**
 * Invoke all registered app switch callbacks
 * @param {string} appId - The app ID being switched to
 * @param {boolean} [isRefresh] - Whether this is a refresh
 * @param {boolean} [isInit] - Whether this is initialization
 */
export function onAppSwitch(appId, isRefresh, isInit) {
    if (countlyGlobal.apps[appId]) {
        const store = getGlobalStore();
        const appSwitchCallbacks = store.state.countlyApp.appSwitchCallbacks;
        for (var i = 0; i < appSwitchCallbacks.length; i++) {
            try {
                if (typeof appSwitchCallbacks[i] === "function") {
                    appSwitchCallbacks[i](appId, countlyGlobal.apps[appId], isRefresh, isInit);
                }
                else if (appSwitchCallbacks[i].fn) {
                    appSwitchCallbacks[i].fn(appId, countlyGlobal.apps[appId], isRefresh, isInit);
                }
            }
            catch (e) {
                console.error("Error in app switch callback:", e); // eslint-disable-line no-console
            }
        }
    }
}

/**
 * Invoke all registered app management switch callbacks
 * @param {string} appId - The app ID
 * @param {string} type - The app type
 */
export function onAppManagementSwitch(appId, type) {
    const store = getGlobalStore();
    const appManagementSwitchCallbacks = store.state.countlyApp.appManagementSwitchCallbacks;
    for (var i = 0; i < appManagementSwitchCallbacks.length; i++) {
        try {
            appManagementSwitchCallbacks[i](appId, type || "mobile");
        }
        catch (e) {
            console.error("Error in app management switch callback:", e); // eslint-disable-line no-console
        }
    }
}

/**
 * Invoke all registered app type addition callbacks
 * @param {string} type - The app type being added
 */
export function onAppAddTypeSwitch(type) {
    const store = getGlobalStore();
    const appAddTypeCallbacks = store.state.countlyApp.appAddTypeCallbacks;
    for (var i = 0; i < appAddTypeCallbacks.length; i++) {
        try {
            appAddTypeCallbacks[i](type || "mobile");
        }
        catch (e) {
            console.error("Error in app add type callback:", e); // eslint-disable-line no-console
        }
    }
}

/**
 * Invoke all registered user edit callbacks
 * @param {object} user - The user object being edited
 * @returns {jQuery.Deferred} A deferred object that resolves when all callbacks complete
 */
export function onUserEdit(user) {
    const store = getGlobalStore();
    const userEditCallbacks = store.state.countlyApp.userEditCallbacks;
    var deferreds = [];
    for (var i = 0; i < userEditCallbacks.length; i++) {
        try {
            deferreds.push(userEditCallbacks[i](user));
        }
        catch (e) {
            console.error("Error in user edit callback:", e); // eslint-disable-line no-console
        }
    }
    return $.when.apply(null, deferreds);
}