/**
 * App State Module
 *
 * This module provides accessors for app-level state stored in the Vuex store.
 * The Vuex store (vue/data/store.js) is the single source of truth for all state.
 *
 * IMPORTANT: All state access should use the getter functions exported from this
 * module. The getter functions always return the current value from the store.
 *
 * Do NOT use the static exports (dateToSelected, _isFirstLoad, etc.) as they
 * capture the initial values at module load time. Use the getter functions instead.
 */

import {
    getGlobalStore,
    // View and navigation state
    getIsFirstLoad as storeGetIsFirstLoad,
    setIsFirstLoad as storeSetIsFirstLoad,
    getRefreshActiveView as storeGetRefreshActiveView,
    setRefreshActiveView as storeSetRefreshActiveView,
    getRoutesHit as storeGetRoutesHit,
    setRoutesHit as storeSetRoutesHit,
    incrementRoutesHit as storeIncrementRoutesHit,
    // Date selection state
    getDateToSelected as storeGetDateToSelected,
    setDateToSelected as storeSetDateToSelected,
    getDateFromSelected as storeGetDateFromSelected,
    setDateFromSelected as storeSetDateFromSelected,
    // Localization state
    getOrigLang as storeGetOrigLang,
    setOrigLang as storeSetOrigLang,
    // Request tracking
    getMyRequests as storeGetMyRequests,
    // Menu state
    getMenuForTypes as storeGetMenuForTypes,
    getSubMenuForTypes as storeGetSubMenuForTypes,
    getMenuForAllTypes as storeGetMenuForAllTypes,
    getSubMenuForAllTypes as storeGetSubMenuForAllTypes,
    getSubMenuForCodes as storeGetSubMenuForCodes,
    getSubMenus as storeGetSubMenus,
    getInternalMenuCategories as storeGetInternalMenuCategories,
    getUniqueMenus as storeGetUniqueMenus,
    getMenuCategories as storeGetMenuCategories,
    // App types
    getAppTypes as storeGetAppTypes,
    // Configuration registries
    getPageScripts as storeGetPageScripts,
    getDataExports as storeGetDataExports,
    getAppSettings as storeGetAppSettings,
    getWidgetCallbacks as storeGetWidgetCallbacks,
    getRefreshScripts as storeGetRefreshScripts,
    // Callback registries
    getAppSwitchCallbacks as storeGetAppSwitchCallbacks,
    getAppManagementSwitchCallbacks as storeGetAppManagementSwitchCallbacks,
    getAppObjectModificators as storeGetAppObjectModificators,
    getAppManagementViews as storeGetAppManagementViews,
    getAppAddTypeCallbacks as storeGetAppAddTypeCallbacks,
    getUserEditCallbacks as storeGetUserEditCallbacks,
} from '../vue/data/store.js';

// ============================================================================
// Re-export store accessors
// ============================================================================

// Export the store getter for direct store access
export { getGlobalStore };

// ============================================================================
// Getter Functions - Always return current value from store
// ============================================================================

/**
 * Get the selected end date timestamp for date range
 * @returns {number|null} the end date timestamp
 */
export function getDateToSelected() {
    return storeGetDateToSelected();
}

/**
 * Get the selected start date timestamp for date range
 * @returns {number|null} the start date timestamp
 */
export function getDateFromSelected() {
    return storeGetDateFromSelected();
}

/**
 * Get the isFirstLoad flag
 * @returns {boolean} whether this is the first load
 */
export function getIsFirstLoad() {
    return storeGetIsFirstLoad();
}

/**
 * Get the refreshActiveView interval ID
 * @returns {number} the interval ID
 */
export function getRefreshActiveView() {
    return storeGetRefreshActiveView();
}

/**
 * Get the routesHit count
 * @returns {number} the number of routes hit
 */
export function getRoutesHit() {
    return storeGetRoutesHit();
}

/**
 * Get the origLang JSON string
 * @returns {string} the original language JSON string
 */
export function getOrigLang() {
    return storeGetOrigLang();
}

/**
 * Get the myRequests object
 * @returns {Object} the requests object
 */
export function getMyRequests() {
    return storeGetMyRequests();
}

/**
 * Get the menuForTypes object
 * @returns {Object} the menu for types
 */
export function getMenuForTypes() {
    return storeGetMenuForTypes();
}

/**
 * Get the subMenuForTypes object
 * @returns {Object} the sub menu for types
 */
export function getSubMenuForTypes() {
    return storeGetSubMenuForTypes();
}

/**
 * Get the menuForAllTypes array
 * @returns {Array} the menu for all types
 */
export function getMenuForAllTypes() {
    return storeGetMenuForAllTypes();
}

/**
 * Get the subMenuForAllTypes array
 * @returns {Array} the sub menu for all types
 */
export function getSubMenuForAllTypes() {
    return storeGetSubMenuForAllTypes();
}

/**
 * Get the subMenuForCodes object
 * @returns {Object} the sub menu for codes
 */
export function getSubMenuForCodes() {
    return storeGetSubMenuForCodes();
}

/**
 * Get the subMenus object
 * @returns {Object} the sub menus
 */
export function getSubMenus() {
    return storeGetSubMenus();
}

/**
 * Get the internalMenuCategories array
 * @returns {Array} the internal menu categories
 */
export function getInternalMenuCategories() {
    return storeGetInternalMenuCategories();
}

/**
 * Get the uniqueMenus object
 * @returns {Object} the unique menus
 */
export function getUniqueMenus() {
    return storeGetUniqueMenus();
}

/**
 * Get the menuCategories object
 * @returns {Object} the menu categories
 */
export function getMenuCategories() {
    return storeGetMenuCategories();
}

/**
 * Get the appTypes object
 * @returns {Object} the app types
 */
export function getAppTypes() {
    return storeGetAppTypes();
}

/**
 * Get the pageScripts object
 * @returns {Object} the page scripts
 */
export function getPageScripts() {
    return storeGetPageScripts();
}

/**
 * Get the dataExports object
 * @returns {Object} the data exports
 */
export function getDataExports() {
    return storeGetDataExports();
}

/**
 * Get the appSettings object
 * @returns {Object} the app settings
 */
export function getAppSettings() {
    return storeGetAppSettings();
}

/**
 * Get the widgetCallbacks object
 * @returns {Object} the widget callbacks
 */
export function getWidgetCallbacks() {
    return storeGetWidgetCallbacks();
}

/**
 * Get the refreshScripts object
 * @returns {Object} the refresh scripts
 */
export function getRefreshScripts() {
    return storeGetRefreshScripts();
}

/**
 * Get the appSwitchCallbacks array
 * @returns {Array} the app switch callbacks
 */
export function getAppSwitchCallbacks() {
    return storeGetAppSwitchCallbacks();
}

/**
 * Get the appManagementSwitchCallbacks array
 * @returns {Array} the app management switch callbacks
 */
export function getAppManagementSwitchCallbacks() {
    return storeGetAppManagementSwitchCallbacks();
}

/**
 * Get the appObjectModificators array
 * @returns {Array} the app object modificators
 */
export function getAppObjectModificators() {
    return storeGetAppObjectModificators();
}

/**
 * Get the appManagementViews object
 * @returns {Object} the app management views
 */
export function getAppManagementViews() {
    return storeGetAppManagementViews();
}

/**
 * Get the appAddTypeCallbacks array
 * @returns {Array} the app add type callbacks
 */
export function getAppAddTypeCallbacks() {
    return storeGetAppAddTypeCallbacks();
}

/**
 * Get the userEditCallbacks array
 * @returns {Array} the user edit callbacks
 */
export function getUserEditCallbacks() {
    return storeGetUserEditCallbacks();
}

// ============================================================================
// Setter Functions - Commit mutations to Vuex store
// ============================================================================

/**
 * Set the selected end date timestamp for date range
 * @param {number|null} val - the end date timestamp to set
 */
export function setDateToSelected(val) {
    storeSetDateToSelected(val);
}

/**
 * Set the selected start date timestamp for date range
 * @param {number|null} val - the start date timestamp to set
 */
export function setDateFromSelected(val) {
    storeSetDateFromSelected(val);
}

/**
 * Set whether this is the first load of the application
 * @param {boolean} val - true if this is the first load, false otherwise
 */
export function setIsFirstLoad(val) {
    storeSetIsFirstLoad(val);
}

/**
 * Set the refresh interval ID for the active view
 * @param {number} val - the interval ID returned by setInterval
 */
export function setRefreshActiveView(val) {
    storeSetRefreshActiveView(val);
}

/**
 * Set the count of routes that have been navigated to
 * @param {number} val - the number of routes hit during this session
 */
export function setRoutesHit(val) {
    storeSetRoutesHit(val);
}

/**
 * Increment the routes hit counter
 */
export function incrementRoutesHit() {
    storeIncrementRoutesHit();
}

/**
 * Set the original language map JSON string
 * @param {string} val - JSON string of the original i18n language map
 */
export function setOrigLang(val) {
    storeSetOrigLang(val);
}

// ============================================================================
// Deprecated Static Exports - For backwards compatibility only
// ============================================================================
// WARNING: These exports capture values at module load time and will NOT
// reflect current state. Use the getter functions instead.
// These are kept only for backwards compatibility with existing code.

/**
 * @deprecated Use getDateToSelected() instead
 * @type {number|null}
 */
export const dateToSelected = null;

/**
 * @deprecated Use getDateFromSelected() instead
 * @type {number|null}
 */
export const dateFromSelected = null;

/**
 * @deprecated Use getIsFirstLoad() instead
 * @type {boolean}
 */
export const _isFirstLoad = false;

/**
 * @deprecated Use getRefreshActiveView() instead
 * @type {number}
 */
export const refreshActiveView = 0;

/**
 * @deprecated Use getRoutesHit() instead
 * @type {number}
 */
export const routesHit = 0;

/**
 * @deprecated Use getOrigLang() instead
 * @type {string}
 */
export const origLang = '';

/**
 * @deprecated Use getMyRequests() instead
 * @type {Object}
 */
export const _myRequests = {};

/**
 * @deprecated Use getMenuForTypes() instead
 * @type {Object}
 */
export const _menuForTypes = {};

/**
 * @deprecated Use getSubMenuForTypes() instead
 * @type {Object}
 */
export const _subMenuForTypes = {};

/**
 * @deprecated Use getMenuForAllTypes() instead
 * @type {Array}
 */
export const _menuForAllTypes = [];

/**
 * @deprecated Use getSubMenuForAllTypes() instead
 * @type {Array}
 */
export const _subMenuForAllTypes = [];

/**
 * @deprecated Use getSubMenuForCodes() instead
 * @type {Object}
 */
export const _subMenuForCodes = {};

/**
 * @deprecated Use getSubMenus() instead
 * @type {Object}
 */
export const _subMenus = {};

/**
 * @deprecated Use getInternalMenuCategories() instead
 * @type {Array}
 */
export const _internalMenuCategories = ["management", "user"];

/**
 * @deprecated Use getUniqueMenus() instead
 * @type {Object}
 */
export const _uniqueMenus = {};

/**
 * @deprecated Use getMenuCategories() instead
 * @type {Object}
 */
export const _menuCategories = {};

/**
 * @deprecated Use getAppTypes() instead
 * @type {Object}
 */
export const appTypes = {};

/**
 * @deprecated Use getPageScripts() instead
 * @type {Object}
 */
export const pageScripts = {};

/**
 * @deprecated Use getDataExports() instead
 * @type {Object}
 */
export const dataExports = {};

/**
 * @deprecated Use getAppSettings() instead
 * @type {Object}
 */
export const appSettings = {};

/**
 * @deprecated Use getWidgetCallbacks() instead
 * @type {Object}
 */
export const widgetCallbacks = {};

/**
 * @deprecated Use getRefreshScripts() instead
 * @type {Object}
 */
export const refreshScripts = {};

/**
 * @deprecated Use getAppSwitchCallbacks() instead
 * @type {Array}
 */
export const appSwitchCallbacks = [];

/**
 * @deprecated Use getAppManagementSwitchCallbacks() instead
 * @type {Array}
 */
export const appManagementSwitchCallbacks = [];

/**
 * @deprecated Use getAppObjectModificators() instead
 * @type {Array}
 */
export const appObjectModificators = [];

/**
 * @deprecated Use getAppManagementViews() instead
 * @type {Object}
 */
export const appManagementViews = {};

/**
 * @deprecated Use getAppAddTypeCallbacks() instead
 * @type {Array}
 */
export const appAddTypeCallbacks = [];

/**
 * @deprecated Use getUserEditCallbacks() instead
 * @type {Array}
 */
export const userEditCallbacks = [];

// ============================================================================
// State Object - For reactive access
// ============================================================================

/**
 * Get a live reference to state that always reflects current store values.
 * Use this when you need reactive access to state properties.
 *
 * @example
 * import { getState } from './app-state.js';
 * const state = getState();
 * console.log(state.dateToSelected); // Always returns current value
 *
 * @returns {Object} State object with getters delegating to store
 */
export function getState() {
    return {
        get dateToSelected() {
            return storeGetDateToSelected();
        },
        get dateFromSelected() {
            return storeGetDateFromSelected();
        },
        get _isFirstLoad() {
            return storeGetIsFirstLoad();
        },
        get refreshActiveView() {
            return storeGetRefreshActiveView();
        },
        get routesHit() {
            return storeGetRoutesHit();
        },
        get origLang() {
            return storeGetOrigLang();
        },
        get _myRequests() {
            return storeGetMyRequests();
        },
        get _menuForTypes() {
            return storeGetMenuForTypes();
        },
        get _subMenuForTypes() {
            return storeGetSubMenuForTypes();
        },
        get _menuForAllTypes() {
            return storeGetMenuForAllTypes();
        },
        get _subMenuForAllTypes() {
            return storeGetSubMenuForAllTypes();
        },
        get _subMenuForCodes() {
            return storeGetSubMenuForCodes();
        },
        get _subMenus() {
            return storeGetSubMenus();
        },
        get _internalMenuCategories() {
            return storeGetInternalMenuCategories();
        },
        get _uniqueMenus() {
            return storeGetUniqueMenus();
        },
        get _menuCategories() {
            return storeGetMenuCategories();
        },
        get appTypes() {
            return storeGetAppTypes();
        },
        get pageScripts() {
            return storeGetPageScripts();
        },
        get dataExports() {
            return storeGetDataExports();
        },
        get appSettings() {
            return storeGetAppSettings();
        },
        get widgetCallbacks() {
            return storeGetWidgetCallbacks();
        },
        get refreshScripts() {
            return storeGetRefreshScripts();
        },
        get appSwitchCallbacks() {
            return storeGetAppSwitchCallbacks();
        },
        get appManagementSwitchCallbacks() {
            return storeGetAppManagementSwitchCallbacks();
        },
        get appObjectModificators() {
            return storeGetAppObjectModificators();
        },
        get appManagementViews() {
            return storeGetAppManagementViews();
        },
        get appAddTypeCallbacks() {
            return storeGetAppAddTypeCallbacks();
        },
        get userEditCallbacks() {
            return storeGetUserEditCallbacks();
        },
    };
}