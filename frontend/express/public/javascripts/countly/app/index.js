/**
 * App Module Index
 * 
 * Re-exports all app submodules for convenient importing.
 * This provides a clean API for accessing app functionality.
 * 
 * State is now managed by the Vuex store (vue/data/store.js) as the single
 * source of truth. The exports from app-state.js delegate to the store.
 * 
 * IMPORTANT: Use getter functions (getDateToSelected, getIsFirstLoad, etc.)
 * instead of static exports (dateToSelected, _isFirstLoad, etc.) to ensure
 * you always get the current value from the store.
 */

// State management - Getter functions (RECOMMENDED - always return current value)
export {
    // Store access
    getGlobalStore,
    getState,
    // View and navigation getters
    getDateToSelected,
    getDateFromSelected,
    getIsFirstLoad,
    getRefreshActiveView,
    getRoutesHit,
    getOrigLang,
    getMyRequests,
    // Menu getters
    getMenuForTypes,
    getSubMenuForTypes,
    getMenuForAllTypes,
    getSubMenuForAllTypes,
    getSubMenuForCodes,
    getSubMenus,
    getInternalMenuCategories,
    getUniqueMenus,
    getMenuCategories,
    // App configuration getters
    getAppTypes,
    getPageScripts,
    getDataExports,
    getAppSettings,
    getWidgetCallbacks,
    getRefreshScripts,
    // Callback registry getters
    getAppSwitchCallbacks,
    getAppManagementSwitchCallbacks,
    getAppObjectModificators,
    getAppManagementViews,
    getAppAddTypeCallbacks,
    getUserEditCallbacks,
    // Setters (commit to Vuex store)
    setDateToSelected,
    setDateFromSelected,
    setIsFirstLoad,
    setRefreshActiveView,
    setRoutesHit,
    incrementRoutesHit,
    setOrigLang,
} from './app-state.js';

// Deprecated static exports - kept for backwards compatibility
// WARNING: These capture initial values and do NOT reflect current state
export {
    dateToSelected,
    dateFromSelected,
    _isFirstLoad,
    refreshActiveView,
    routesHit,
    origLang,
    _myRequests,
    _menuForTypes,
    _subMenuForTypes,
    _menuForAllTypes,
    _subMenuForAllTypes,
    _subMenuForCodes,
    _subMenus,
    _internalMenuCategories,
    _uniqueMenus,
    _menuCategories,
    appTypes,
    pageScripts,
    dataExports,
    appSettings,
    widgetCallbacks,
    refreshScripts,
    appSwitchCallbacks,
    appManagementSwitchCallbacks,
    appObjectModificators,
    appManagementViews,
    appAddTypeCallbacks,
    userEditCallbacks,
} from './app-state.js';

// Menu management
export {
    addMenuCategory,
    addMenuForType,
    addSubMenuForType,
    addMenu,
    addSubMenu
} from './app-menu.js';

// Callback management
export {
    addAppSwitchCallback,
    addAppManagementSwitchCallback,
    addAppObjectModificator,
    addAppManagementView,
    addAppManagementInput,
    addAppSetting,
    addAppAddTypeCallback,
    addUserEditCallback,
    addDataExport,
    addPageScript,
    addRefreshScript,
    onAppSwitch,
    onAppManagementSwitch,
    onAppAddTypeSwitch,
    onUserEdit
} from './app-callbacks.js';

// Lifecycle management
export {
    setAppInstance,
    _removeUnfinishedRequests,
    switchApp,
    main,
    dashboard,
    runRefreshScripts,
    performRefresh,
    renderWhenReady,
    hasRoutingHistory,
    back,
    pageScript,
    noHistory
} from './app-lifecycle.js';

// App types
export {
    addAppType,
    localize,
    getAppTypes as getAppTypesConfig,
    hasAppType,
    getAppTypeView
} from './app-types.js';