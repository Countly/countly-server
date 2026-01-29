/**
 * App State Module
 *
 * Contains module-level state variables for the Countly dashboard.
 * These variables are accessed via getters/setters defined on the app object.
 */

// View and date state
export let dateToSelected = null;
export let dateFromSelected = null;
export let activeAppName = '';
export let activeAppKey = '';
export let _isFirstLoad = false;
export let refreshActiveView = 0;
export let routesHit = 0;
export let origLang = '';

// Request tracking
export const _myRequests = {};

// Menu state
export const _menuForTypes = {};
export const _subMenuForTypes = {};
export const _menuForAllTypes = [];
export const _subMenuForAllTypes = [];
export const _subMenuForCodes = {};
export const _subMenus = {};
export const _internalMenuCategories = ["management", "user"];
export const _uniqueMenus = {};

// App configuration
export let appTypes = {};
export let pageScripts = {};
export let dataExports = {};
export let appSettings = {};
export let widgetCallbacks = {};

// Callback registries
export let appSwitchCallbacks = [];
export let appManagementSwitchCallbacks = [];
export let appObjectModificators = [];
export let appManagementViews = {};
export let appAddTypeCallbacks = [];
export let userEditCallbacks = [];
export let refreshScripts = {};

// Setters for mutable state

/**
 * Set the selected end date timestamp for date range
 * @param {number|null} val - the end date timestamp to set
 */
export function setDateToSelected(val) {
    dateToSelected = val;
}

/**
 * Set the selected start date timestamp for date range
 * @param {number|null} val - the start date timestamp to set
 */
export function setDateFromSelected(val) {
    dateFromSelected = val;
}

/**
 * Set the name of the currently active application
 * @param {string} val - the application name to set
 */
export function setActiveAppName(val) {
    activeAppName = val;
}

/**
 * Set the API key of the currently active application
 * @param {string} val - the application API key to set
 */
export function setActiveAppKey(val) {
    activeAppKey = val;
}

/**
 * Set whether this is the first load of the application
 * @param {boolean} val - true if this is the first load, false otherwise
 */
export function setIsFirstLoad(val) {
    _isFirstLoad = val;
}

/**
 * Set the refresh interval ID for the active view
 * @param {number} val - the interval ID returned by setInterval
 */
export function setRefreshActiveView(val) {
    refreshActiveView = val;
}

/**
 * Set the count of routes that have been navigated to
 * @param {number} val - the number of routes hit during this session
 */
export function setRoutesHit(val) {
    routesHit = val;
}

/**
 * Set the original language map JSON string
 * @param {string} val - JSON string of the original i18n language map
 */
export function setOrigLang(val) {
    origLang = val;
}