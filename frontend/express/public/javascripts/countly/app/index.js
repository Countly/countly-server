/**
 * App Module Index
 * 
 * Re-exports all app submodules for convenient importing.
 * This provides a clean API for accessing app functionality.
 */

// State management
export {
    // State variables (read-only exports)
    dateToSelected,
    dateFromSelected,
    activeAppName,
    activeAppKey,
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
    appTypes,
    pageScripts,
    dataExports,
    appSettings,
    widgetCallbacks,
    appSwitchCallbacks,
    appManagementSwitchCallbacks,
    appObjectModificators,
    appManagementViews,
    appAddTypeCallbacks,
    userEditCallbacks,
    refreshScripts,
    // State setters
    setDateToSelected,
    setDateFromSelected,
    setActiveAppName,
    setActiveAppKey,
    setIsFirstLoad,
    setRefreshActiveView,
    setRoutesHit,
    setOrigLang
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
    getAppTypes,
    hasAppType,
    getAppTypeView
} from './app-types.js';