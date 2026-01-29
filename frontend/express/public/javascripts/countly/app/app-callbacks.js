/**
 * App Callbacks Module
 *
 * Contains functions for registering and invoking various callbacks
 * throughout the application lifecycle.
 */

import jQuery from 'jquery';
import countlyGlobal from '../countly.global.js';
import {
    appSwitchCallbacks,
    appManagementSwitchCallbacks,
    appObjectModificators,
    appManagementViews,
    appAddTypeCallbacks,
    userEditCallbacks,
    pageScripts,
    refreshScripts,
    dataExports,
    appSettings,
} from './app-state.js';

const $ = jQuery;

/**
 * Register a callback to be called when the app is switched
 * @param {function|object} callback - Callback function or object with name and fn properties
 */
export function addAppSwitchCallback(callback) {
    if (typeof callback === "function") {
        appSwitchCallbacks.push({name: "unknown", fn: callback});
    }
    else {
        appSwitchCallbacks.push(callback);
    }
}

/**
 * Register a callback for app management switch
 * @param {function} callback - Callback function
 */
export function addAppManagementSwitchCallback(callback) {
    appManagementSwitchCallbacks.push(callback);
}

/**
 * Register a function to modify the app object
 * @param {function} callback - Modificator function
 */
export function addAppObjectModificator(callback) {
    appObjectModificators.push(callback);
}

/**
 * Register a view for app management
 * @param {string} plugin - Plugin name
 * @param {object} options - View options with title and view properties
 */
export function addAppManagementView(plugin, options) {
    appManagementViews[plugin] = {
        title: options.title,
        view: options.view
    };
}

/**
 * Register inputs for app management
 * @param {string} plugin - Plugin name
 * @param {object} options - Input options with title and inputs properties
 */
export function addAppManagementInput(plugin, options) {
    appManagementViews[plugin] = {
        title: options.title,
        inputs: options.inputs
    };
}

/**
 * Register an app setting
 * @param {string} id - Setting identifier
 * @param {object} options - Setting options
 */
export function addAppSetting(id, options) {
    appSettings[id] = options;
}

/**
 * Register a callback for app type addition
 * @param {function} callback - Callback function
 */
export function addAppAddTypeCallback(callback) {
    appAddTypeCallbacks.push(callback);
}

/**
 * Register a callback for user edit
 * @param {function} callback - Callback function
 */
export function addUserEditCallback(callback) {
    userEditCallbacks.push(callback);
}

/**
 * Register a data export handler
 * @param {string} name - Export name
 * @param {function} callback - Export function
 */
export function addDataExport(name, callback) {
    dataExports[name] = callback;
}

/**
 * Register a page script to run on specific routes
 * @param {string} route - Route pattern
 * @param {function} callback - Script function
 */
export function addPageScript(route, callback) {
    if (!pageScripts[route]) {
        pageScripts[route] = [];
    }
    pageScripts[route].push(callback);
}

/**
 * Register a refresh script to run on data refresh
 * @param {string} route - Route pattern
 * @param {function} callback - Refresh function
 */
export function addRefreshScript(route, callback) {
    if (!refreshScripts[route]) {
        refreshScripts[route] = [];
    }
    refreshScripts[route].push(callback);
}

/**
 * Invoke all registered app switch callbacks
 * @param {string} appId - The app ID being switched to
 * @param {boolean} [isRefresh] - Whether this is a refresh
 * @param {boolean} [isInit] - Whether this is initialization
 */
export function onAppSwitch(appId, isRefresh, isInit) {
    if (countlyGlobal.apps[appId]) {
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
    for (var i = 0; i < appManagementSwitchCallbacks.length; i++) {
        appManagementSwitchCallbacks[i](appId, type || "mobile");
    }
}

/**
 * Invoke all registered app type addition callbacks
 * @param {string} type - The app type being added
 */
export function onAppAddTypeSwitch(type) {
    for (var i = 0; i < appAddTypeCallbacks.length; i++) {
        appAddTypeCallbacks[i](type || "mobile");
    }
}

/**
 * Invoke all registered user edit callbacks
 * @param {object} user - The user object being edited
 * @returns {jQuery.Deferred} A deferred object that resolves when all callbacks complete
 */
export function onUserEdit(user) {
    var deferreds = [];
    for (var i = 0; i < userEditCallbacks.length; i++) {
        deferreds.push(userEditCallbacks[i](user));
    }
    return $.when.apply(null, deferreds);
}