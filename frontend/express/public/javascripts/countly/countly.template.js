/**
 * Countly Dashboard Template
 *
 * Main orchestration module for the Countly dashboard.
 * Creates the Backbone router and ties together all app submodules.
 *
 * State Management:
 * All stateful data is managed by the Vuex store (vue/data/store.js) as the
 * single source of truth. This file uses getter/setter functions that delegate
 * to the store for all state access.
 */

import jQuery from 'jquery';
import _ from 'underscore';
import Backbone from '../utils/backbone-min.js';
import countlyCommon from './countly.common.js';
import countlyGlobal from './countly.global.js';
import { validateCreate, validateAnyAppAdmin, validateGlobalAdmin } from './countly.auth.js';
import { notify, logout } from './countly.helpers.js';
import { DASHBOARD_VALIDATE_SESSION } from './countly.config.js';

// Import store accessors - single source of truth for all state
import {
    getGlobalStore,
    getActiveAppKey as getStoreActiveAppKey,
    getActiveAppName as getStoreActiveAppName,
    // App state getters
    getDateToSelected,
    setDateToSelected,
    getDateFromSelected,
    setDateFromSelected,
    getIsFirstLoad,
    setIsFirstLoad,
    getRefreshActiveView,
    setRefreshActiveView,
    getRoutesHit,
    setRoutesHit,
    getOrigLang,
    setOrigLang,
    getMyRequests,
    getAppTypes,
    getPageScripts,
    getDataExports,
    getAppSettings,
    getWidgetCallbacks,
    getRefreshScripts,
    getAppSwitchCallbacks,
    getAppManagementSwitchCallbacks,
    getAppObjectModificators,
    getAppManagementViews,
    getAppAddTypeCallbacks,
    getUserEditCallbacks,
    getBrowserLangShort,
} from './vue/data/store.js';

// Import from submodules - functions that operate on state
import {
    // Menu
    addMenuCategory,
    addMenuForType,
    addSubMenuForType,
    addMenu,
    addSubMenu,
    // Callbacks
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
    onUserEdit,
    // Lifecycle
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
    noHistory,
    // Types
    addAppType,
    localize
} from './app/index.js';

const $ = jQuery;

// Redefine contains selector for jQuery to be case insensitive
$.expr[":"].contains = $.expr.createPseudo(function(arg) {
    return function(elem) {
        return $(elem).text().toUpperCase().indexOf(arg.toUpperCase()) >= 0;
    };
});

// =============================================================================
// GETTER/SETTER EXPORTS FOR BACKWARDS COMPATIBILITY
// =============================================================================

/**
 * Get the currently active view instance
 * @returns {object|null} the active view instance or null if none
 */
export function getActiveView() {
    return app._activeView;
}

/**
 * Set the currently active view instance
 * @param {object} view - the view instance to set as active
 */
export function setActiveView(view) {
    app._activeView = view;
}

/**
 * Get the selected end date timestamp for date range
 * Uses Vuex store as single source of truth
 * @returns {number} the end date timestamp
 */
export { getDateToSelected };
export { setDateToSelected };

/**
 * Get the selected start date timestamp for date range
 * Uses Vuex store as single source of truth
 * @returns {number} the start date timestamp
 */
export { getDateFromSelected };
export { setDateFromSelected };

/**
 * Get the name of the currently active application
 * Uses Vuex store as single source of truth
 * @returns {string} the active application name
 */
export function getActiveAppName() {
    return getStoreActiveAppName();
}

/**
 * Set the name of the currently active application
 * Note: This is derived from the active app object in the store.
 * Changing the active app via countlyCommon.setActiveApp() will update this automatically.
 * @deprecated Use countlyCommon.setActiveApp() instead
 * @param {string} val - the application name (ignored, use setActiveApp instead)
 */
export function setActiveAppName() {
    // No-op: activeAppName is derived from activeApp in the store
    // This function is kept for backward compatibility but does nothing
    // Use countlyCommon.setActiveApp() to change the active app
    // console.warn('setActiveAppName is deprecated. Use countlyCommon.setActiveApp() to change the active app.');
}

/**
 * Get the API key of the currently active application
 * Uses Vuex store as single source of truth
 * @returns {string} the active application API key
 */
export function getActiveAppKey() {
    return getStoreActiveAppKey();
}

/**
 * Set the API key of the currently active application
 * Note: This is derived from the active app object in the store.
 * Changing the active app via countlyCommon.setActiveApp() will update this automatically.
 * @deprecated Use countlyCommon.setActiveApp() instead
 * @param {string} val - the application key (ignored, use setActiveApp instead)
 */
export function setActiveAppKey() {
    // No-op: activeAppKey is derived from activeApp in the store
    // This function is kept for backward compatibility but does nothing
    // Use countlyCommon.setActiveApp() to change the active app
    // console.warn('setActiveAppKey is deprecated. Use countlyCommon.setActiveApp() to change the active app.');
}

/**
 * Check if this is the first load of the application
 * Uses Vuex store as single source of truth
 * @returns {boolean} true if this is the first load, false otherwise
 */
export function isFirstLoad() {
    return getIsFirstLoad();
}
export { setIsFirstLoad };

/**
 * Get the registered application types
 * Uses Vuex store as single source of truth
 * @returns {object} object containing all registered app types
 */
export { getAppTypes };

/**
 * Get the registered page scripts
 * Uses Vuex store as single source of truth
 * @returns {object} object containing page scripts keyed by path pattern
 */
export { getPageScripts };

/**
 * Get the registered data export configurations
 * Uses Vuex store as single source of truth
 * @returns {object} object containing data export configurations
 */
export { getDataExports };

/**
 * Get the registered app switch callback functions
 * Uses Vuex store as single source of truth
 * @returns {Array<function>} array of callback functions triggered on app switch
 */
export { getAppSwitchCallbacks };

/**
 * Get the registered app management switch callback functions
 * Uses Vuex store as single source of truth
 * @returns {Array<function>} array of callback functions triggered on app management switch
 */
export { getAppManagementSwitchCallbacks };

/**
 * Get the registered app object modificator functions
 * Uses Vuex store as single source of truth
 * @returns {Array<function>} array of functions that modify app objects
 */
export { getAppObjectModificators };

/**
 * Get the registered app management views
 * Uses Vuex store as single source of truth
 * @returns {object} object containing app management view configurations
 */
export { getAppManagementViews };

/**
 * Get the registered app add type callback functions
 * Uses Vuex store as single source of truth
 * @returns {Array<function>} array of callback functions triggered when adding app types
 */
export { getAppAddTypeCallbacks };

/**
 * Get the registered user edit callback functions
 * Uses Vuex store as single source of truth
 * @returns {Array<function>} array of callback functions triggered on user edit
 */
export { getUserEditCallbacks };

/**
 * Get the registered refresh scripts
 * Uses Vuex store as single source of truth
 * @returns {object} object containing refresh scripts keyed by path pattern
 */
export { getRefreshScripts };

/**
 * Get the registered app settings configurations
 * Uses Vuex store as single source of truth
 * @returns {object} object containing app settings configurations
 */
export { getAppSettings };

/**
 * Get the registered widget callback functions
 * Uses Vuex store as single source of truth
 * @returns {object} object containing widget callbacks
 */
export { getWidgetCallbacks };

/**
 * Get the count of routes that have been navigated to
 * Uses Vuex store as single source of truth
 * @returns {number} the number of routes hit during this session
 */
export { getRoutesHit };
export { setRoutesHit };

/**
 * Get the original language map JSON string
 * Uses Vuex store as single source of truth
 * @returns {string} JSON string of the original i18n language map
 */
export { getOrigLang };
export { setOrigLang };

// Re-export all functions from submodules
export {
    _removeUnfinishedRequests,
    switchApp,
    addMenuCategory,
    addMenuForType,
    addSubMenuForType,
    addMenu,
    addSubMenu,
    main,
    dashboard,
    runRefreshScripts,
    performRefresh,
    renderWhenReady,
    hasRoutingHistory,
    back,
    localize,
    addAppType,
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
    onUserEdit,
    pageScript,
    noHistory
};

// =============================================================================
// APP INITIALIZATION
// =============================================================================

/**
 * Initialize the application with default menus and settings
 */
function initializeApp() {
    // Add default menu categories
    addMenuCategory("understand", {priority: 10});
    addMenuCategory("explore", {priority: 20});
    addMenuCategory("reach", {priority: 30});
    addMenuCategory("improve", {priority: 40});
    addMenuCategory("utilities", {priority: 50});

    // Add default menus
    addMenu("understand", {code: "overview", permission: "core", url: "#/", text: "sidebar.home", icon: '<div class="logo dashboard ion-speedometer"></div>', priority: 10, bottom: 20});
    addMenu("understand", {code: "analytics", permission: "core", text: "sidebar.analytics", icon: '<div class="logo analytics ion-ios-pulse-strong"></div>', priority: 20});
    addMenu("understand", {code: "events", permission: "events", text: "sidebar.events", icon: '<div class="logo events"><i class="material-icons">bubble_chart</i></div>', priority: 40});
    addSubMenu("events", {code: "events-overview", permission: "events", url: "#/analytics/events/overview", text: "sidebar.events.overview", priority: 10});
    addSubMenu("events", {code: "all-events", permission: "events", url: "#/analytics/events", text: "sidebar.events.all-events", priority: 20});

    addMenu("utilities", {
        code: "management",
        permission: "core",
        text: "sidebar.utilities",
        icon: '<div class="logo management ion-wrench"></div>',
        priority: 10000000,
        callback: function(type, category, node, menu) {
            menu.filter("#management-submenu").append("<span class='help-toggle'></span>");
        }
    });

    if (validateCreate('core')) {
        addSubMenu("management", {code: "longtasks", permission: "core", url: "#/manage/tasks", text: "sidebar.management.longtasks", priority: 10});
    }

    var jobsIconSvg = '<svg width="20px" height="16px" viewBox="0 0 12 10" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><title>list-24px 2</title><g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"><g id="list-24px-2" fill="#9f9f9f" fill-rule="nonzero"><g id="list-24px"><path d="M0,6 L2,6 L2,4 L0,4 L0,6 Z M0,10 L2,10 L2,8 L0,8 L0,10 Z M0,2 L2,2 L2,0 L0,0 L0,2 Z M3,6 L12,6 L12,4 L3,4 L3,6 Z M3,10 L12,10 L12,8 L3,8 L3,10 Z M3,0 L3,2 L12,2 L12,0 L3,0 Z" id="Shape"></path></g></g></g></svg>';

    if (validateAnyAppAdmin()) {
        addMenu("management", {code: "applications", permission: "core", url: "#/manage/apps", text: "sidebar.management.applications", icon: '<div class="logo-icon ion-ios-albums"></div>', priority: 20});
    }
    if (validateGlobalAdmin()) {
        addMenu("management", {code: "users", permission: "core", url: "#/manage/users", text: "sidebar.management.users", icon: '<div class="logo-icon fa fa-user-friends"></div>', priority: 10});
    }
    if (validateGlobalAdmin()) {
        addMenu("management", {code: "jobs", permission: "core", url: "#/manage/jobs", text: "sidebar.management.jobs", icon: '<div class="logo-icon">' + jobsIconSvg + '</div>', priority: 60});
    }

    // Check URL on document ready
    $(document).ready(function() {
        Backbone.history.checkUrl();
    });

    // Add language class to body
    $("body").addClass("lang-" + getBrowserLangShort());

    // Load i18n properties
    jQuery.i18n.properties({
        name: window.production ? 'localization/min/locale' : ["localization/dashboard/dashboard", "localization/help/help", "localization/mail/mail"].concat(countlyGlobal.plugins.map(function(plugin) {
            return plugin + "/localization/" + plugin;
        })),
        cache: true,
        language: getBrowserLangShort(),
        countlyVersion: countlyGlobal.countlyVersion + "&" + countlyGlobal.pluginsSHA,
        path: countlyGlobal.cdn,
        mode: 'map',
        callback: function() {
            for (var key in jQuery.i18n.map) {
                if (countlyGlobal.company) {
                    jQuery.i18n.map[key] = jQuery.i18n.map[key].replace(new RegExp("Countly", 'ig'), countlyGlobal.company);
                }
                jQuery.i18n.map[key] = countlyCommon.encodeSomeHtml(jQuery.i18n.map[key]);
            }
            setOrigLang(JSON.stringify(jQuery.i18n.map));
        }
    });

    // Document ready handlers
    $(document).ready(function() {
        // License notifications
        if (countlyGlobal.licenseNotification && countlyGlobal.licenseNotification.length && !_.isEmpty(countlyGlobal.apps)) {
            for (var idx = 0; idx < countlyGlobal.licenseNotification.length; idx++) {
                countlyGlobal.licenseNotification[idx].id = countlyCommon.generateId();
                notify(countlyGlobal.licenseNotification[idx]);
            }
        }

        // Add version to HTML template requests
        $.ajaxPrefilter(function(options) {
            var last5char = options.url.substring(options.url.length - 5, options.url.length);
            if (last5char === ".html") {
                var version = countlyGlobal.countlyVersion || "";
                options.url = options.url + "?v=" + version;
            }
        });

        // Session validation
        var validateSession = function() {
            $.ajax({
                url: countlyGlobal.path + "/session",
                data: {check_session: true},
                success: function(result) {
                    if (result === "logout") {
                        logout("/logout");
                    }
                    if (result === "login") {
                        logout();
                    }
                    setTimeout(function() {
                        validateSession();
                    }, DASHBOARD_VALIDATE_SESSION || 30000);
                }
            });
        };
        setTimeout(function() {
            validateSession();
        }, DASHBOARD_VALIDATE_SESSION || 30000);

        // Session timeout handling
        if (parseInt(countlyGlobal.config.session_timeout)) {
            var minTimeout, tenSecondTimeout, logoutTimeout;
            var shouldRecordAction = false;

            var extendSession = function() {
                shouldRecordAction = false;
                $.ajax({
                    url: countlyGlobal.path + "/session",
                    success: function(result) {
                        if (result === "logout") {
                            logout("/logout");
                        }
                        if (result === "login") {
                            logout();
                        }
                        else if (result === "success") {
                            shouldRecordAction = false;
                            var myTimeoutValue = parseInt(countlyGlobal.config.session_timeout) * 1000 * 60;
                            if (myTimeoutValue > 2147483647) {
                                myTimeoutValue = 1800000;
                            }
                            setTimeout(function() {
                                shouldRecordAction = true;
                            }, Math.round(myTimeoutValue / 2));
                            resetSessionTimeouts(myTimeoutValue);
                        }
                    },
                    error: function() {
                        shouldRecordAction = true;
                    }
                });
            };

            var resetSessionTimeouts = function(timeout) {
                var minute = timeout - 60 * 1000;
                if (minTimeout) {
                    clearTimeout(minTimeout);
                    minTimeout = null;
                }
                if (minute > 0) {
                    minTimeout = setTimeout(function() {
                        notify({ title: jQuery.i18n.map["common.session-expiration"], message: jQuery.i18n.map["common.expire-minute"], info: jQuery.i18n.map["common.click-to-login"] });
                    }, minute);
                }
                var tenSeconds = timeout - 10 * 1000;
                if (tenSecondTimeout) {
                    clearTimeout(tenSecondTimeout);
                    tenSecondTimeout = null;
                }
                if (tenSeconds > 0) {
                    tenSecondTimeout = setTimeout(function() {
                        notify({ title: jQuery.i18n.map["common.session-expiration"], message: jQuery.i18n.map["common.expire-seconds"], info: jQuery.i18n.map["common.click-to-login"] });
                    }, tenSeconds);
                }
                if (logoutTimeout) {
                    clearTimeout(logoutTimeout);
                    logoutTimeout = null;
                }
                logoutTimeout = setTimeout(function() {
                    extendSession();
                }, timeout + 1000);
            };

            var myTimeoutValue = parseInt(countlyGlobal.config.session_timeout) * 1000 * 60;
            if (myTimeoutValue > 2147483647) {
                myTimeoutValue = 1800000;
            }
            resetSessionTimeouts(myTimeoutValue);
            $(document).on("click mousemove extend-dashboard-user-session", function() {
                if (shouldRecordAction) {
                    extendSession();
                }
            });
            extendSession();
        }

        // Initialize date selection from period
        var periodObj = countlyCommon.getPeriod();
        if (Object.prototype.toString.call(periodObj) === '[object Array]' && periodObj.length === 2) {
            setDateFromSelected(parseInt(periodObj[0], 10) + countlyCommon.getOffsetCorrectionForTimestamp(parseInt(periodObj[0], 10)));
            setDateToSelected(parseInt(periodObj[1], 10) + countlyCommon.getOffsetCorrectionForTimestamp(parseInt(periodObj[1], 10)));
        }

        // Set moment locale
        try {
            window.moment.locale(getBrowserLangShort());
        }
        catch (e) {
            window.moment.locale("en");
        }
    });

    // Set active app
    // Note: Active app name is now derived from the store's activeApp object
    // countlyCommon.setActiveApp() updates all related state via the Vuex store
    if (!_.isEmpty(countlyGlobal.apps)) {
        if (!countlyCommon.ACTIVE_APP_ID) {
            var activeApp = (countlyGlobal.member && countlyGlobal.member.active_app_id && countlyGlobal.apps[countlyGlobal.member.active_app_id])
                ? countlyGlobal.apps[countlyGlobal.member.active_app_id]
                : countlyGlobal.defaultApp;

            countlyCommon.setActiveApp(activeApp._id);
        }
        // No need to set activeAppName separately - it's derived from the store
    }

    // Idle timer
    $.idleTimer(countlyCommon.DASHBOARD_IDLE_MS);

    $(document).bind("idle.idleTimer", function() {
        clearInterval(getRefreshActiveView());
    });

    $(document).bind("active.idleTimer", function() {
        if (app._activeView && app._activeView.restart) {
            app._activeView.restart();
        }
        setRefreshActiveView(setInterval(function() {
            performRefresh();
        }, countlyCommon.DASHBOARD_REFRESH_MS));
    });

    // Initialize app switch callback
    $(document).ready(function() {
        setTimeout(function() {
            onAppSwitch(countlyCommon.ACTIVE_APP_ID, true, true);
        }, 1);
    });
}

// =============================================================================
// BACKBONE ROUTER
// =============================================================================

/**
 * Main app instance of Backbone AppRouter used to control views and view change flow
 * @name app
 * @global
 * @instance
 * @namespace app
 */
export const AppRouter = Backbone.Router.extend({
    routes: {
        "/": "dashboard",
        "*path": "main"
    },

    _removeUnfinishedRequests,
    switchApp,
    addMenuCategory,
    addMenuForType,
    addSubMenuForType,
    addMenu,
    addSubMenu,
    main,
    dashboard,
    runRefreshScripts,
    performRefresh,
    renderWhenReady,
    hasRoutingHistory,
    back,
    localize,
    addAppType,
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
    onUserEdit,
    pageScript,

    initialize: function() {
        this.bind("route", function(name) {
            $('#content').removeClass(function(index, className) {
                return (className.match(/(^|\s)routename-\S*/g) || []).join(' ');
            }).addClass("routename-" + name);
        });

        initializeApp();
    }
});

// Create the global app instance
export const app = new AppRouter();

// Set the app instance in the lifecycle module
setAppInstance(app);

// =============================================================================
// DEFINE GETTERS/SETTERS ON APP INSTANCE
// =============================================================================

// Define getters/setters using Object.defineProperty because Backbone.extend
// doesn't preserve ES6 getter/setter syntax - it evaluates them at definition time
// All state is now accessed via the Vuex store as single source of truth
Object.defineProperties(app, {
    activeView: {
        get: function() {
            return this._activeView || null;
        },
        set: function(val) {
            this._activeView = val;
        },
        enumerable: true,
        configurable: true
    },
    dateToSelected: {
        get: function() {
            return getDateToSelected();
        },
        set: function(val) {
            setDateToSelected(val);
        },
        enumerable: true,
        configurable: true
    },
    dateFromSelected: {
        get: function() {
            return getDateFromSelected();
        },
        set: function(val) {
            setDateFromSelected(val);
        },
        enumerable: true,
        configurable: true
    },
    activeAppName: {
        get: function() {
            return getStoreActiveAppName();
        },
        set: function() {
            // No-op: activeAppName is derived from activeApp in the store
            // Use countlyCommon.setActiveApp() to change the active app
            // console.warn('app.activeAppName setter is deprecated. Use countlyCommon.setActiveApp() to change the active app.');
        },
        enumerable: true,
        configurable: true
    },
    activeAppKey: {
        get: function() {
            return getStoreActiveAppKey();
        },
        set: function() {
            // No-op: activeAppKey is derived from activeApp in the store
            // Use countlyCommon.setActiveApp() to change the active app
            // console.warn('app.activeAppKey setter is deprecated. Use countlyCommon.setActiveApp() to change the active app.');
        },
        enumerable: true,
        configurable: true
    },
    _isFirstLoad: {
        get: function() {
            return getIsFirstLoad();
        },
        set: function(val) {
            setIsFirstLoad(val);
        },
        enumerable: true,
        configurable: true
    },
    refreshActiveView: {
        get: function() {
            return getRefreshActiveView();
        },
        set: function(val) {
            setRefreshActiveView(val);
        },
        enumerable: true,
        configurable: true
    },
    _myRequests: {
        get: function() {
            return getMyRequests();
        },
        enumerable: true,
        configurable: true
    },
    appTypes: {
        get: function() {
            return getAppTypes();
        },
        enumerable: true,
        configurable: true
    },
    pageScripts: {
        get: function() {
            return getPageScripts();
        },
        enumerable: true,
        configurable: true
    },
    dataExports: {
        get: function() {
            return getDataExports();
        },
        enumerable: true,
        configurable: true
    },
    appSwitchCallbacks: {
        get: function() {
            return getAppSwitchCallbacks();
        },
        enumerable: true,
        configurable: true
    },
    appManagementSwitchCallbacks: {
        get: function() {
            return getAppManagementSwitchCallbacks();
        },
        enumerable: true,
        configurable: true
    },
    appObjectModificators: {
        get: function() {
            return getAppObjectModificators();
        },
        enumerable: true,
        configurable: true
    },
    appManagementViews: {
        get: function() {
            return getAppManagementViews();
        },
        enumerable: true,
        configurable: true
    },
    appAddTypeCallbacks: {
        get: function() {
            return getAppAddTypeCallbacks();
        },
        enumerable: true,
        configurable: true
    },
    userEditCallbacks: {
        get: function() {
            return getUserEditCallbacks();
        },
        enumerable: true,
        configurable: true
    },
    refreshScripts: {
        get: function() {
            return getRefreshScripts();
        },
        enumerable: true,
        configurable: true
    },
    appSettings: {
        get: function() {
            return getAppSettings();
        },
        enumerable: true,
        configurable: true
    },
    widgetCallbacks: {
        get: function() {
            return getWidgetCallbacks();
        },
        enumerable: true,
        configurable: true
    },
    routesHit: {
        get: function() {
            return getRoutesHit();
        },
        set: function(val) {
            setRoutesHit(val);
        },
        enumerable: true,
        configurable: true
    },
    origLang: {
        get: function() {
            return getOrigLang();
        },
        set: function(val) {
            setOrigLang(val);
        },
        enumerable: true,
        configurable: true
    }
});

// =============================================================================
// BACKBONE HISTORY EXTENSIONS
// =============================================================================

import storejs from 'storejs';

Backbone.history || (Backbone.history = new Backbone.History);
Backbone.history._checkUrl = Backbone.history.checkUrl;
Backbone.history.urlChecks = [];

Backbone.history.checkOthers = function() {
    var proceed = true;
    for (var i = 0; i < Backbone.history.urlChecks.length; i++) {
        if (!Backbone.history.urlChecks[i]()) {
            proceed = false;
        }
    }
    return proceed;
};

Backbone.history.checkUrl = function() {
    if (Backbone.history.checkOthers()) {
        Backbone.history._checkUrl();
    }
};

Backbone.history.noHistory = function(hash) {
    if (history && history.replaceState) {
        history.replaceState(undefined, undefined, encodeURI(hash));
    }
    else {
        location.replace(hash);
    }
};

Backbone.history.__checkUrl = Backbone.history.checkUrl;
Backbone.history._getFragment = Backbone.history.getFragment;
Backbone.history.appIds = [];

for (var appId in countlyGlobal.apps) {
    Backbone.history.appIds.push(appId);
}

Backbone.history.getFragment = function() {
    var fragment = Backbone.history._getFragment();
    if (fragment.indexOf("/" + countlyCommon.ACTIVE_APP_ID) === 0) {
        fragment = fragment.replace("/" + countlyCommon.ACTIVE_APP_ID, "");
    }
    return fragment;
};

Backbone.history.checkUrl = function() {
    storejs.set("countly_fragment_name", Backbone.history._getFragment());
    var app_id = Backbone.history._getFragment().split("/")[1] || "";
    if (countlyCommon.APP_NAMESPACE !== false && countlyCommon.ACTIVE_APP_ID !== 0 && countlyCommon.ACTIVE_APP_ID !== app_id && Backbone.history.appIds.indexOf(app_id) === -1) {
        Backbone.history.noHistory("#/" + countlyCommon.ACTIVE_APP_ID + Backbone.history._getFragment());
        app_id = countlyCommon.ACTIVE_APP_ID;
    }

    if (countlyCommon.ACTIVE_APP_ID !== 0 && countlyCommon.ACTIVE_APP_ID !== app_id && Backbone.history.appIds.indexOf(app_id) !== -1) {
        switchApp(app_id, function() {
            if (Backbone.history.checkOthers()) {
                Backbone.history.__checkUrl();
            }
        });
    }
    else {
        if (Backbone.history.checkOthers()) {
            Backbone.history.__checkUrl();
        }
    }
};

// Initial hash check
(function() {
    if (!Backbone.history.getFragment() && storejs.get("countly_fragment_name")) {
        Backbone.history.noHistory("#" + storejs.get("countly_fragment_name"));
    }
    else {
        var app_id = Backbone.history._getFragment().split("/")[1] || "";
        if (countlyCommon.ACTIVE_APP_ID === app_id || Backbone.history.appIds.indexOf(app_id) !== -1) {
            if (app_id !== countlyCommon.ACTIVE_APP_ID) {
                countlyCommon.setActiveApp(app_id);
            }
        }
        else if (countlyCommon.APP_NAMESPACE !== false) {
            Backbone.history.noHistory("#/" + countlyCommon.ACTIVE_APP_ID + Backbone.history._getFragment());
        }
    }
})();

// Add noHistory to app instance
app.noHistory = noHistory;

// =============================================================================
// AJAX PREFILTER FOR REQUEST TRACKING
// =============================================================================

$.ajaxPrefilter(function(options, originalOptions, jqXHR) {
    var myurl = "";
    var mydata = "{}";
    if (originalOptions && originalOptions.url) {
        myurl = originalOptions.url;
    }
    if (originalOptions && originalOptions.data) {
        mydata = JSON.stringify(originalOptions.data);
    }
    jqXHR.my_set_url = myurl;
    jqXHR.my_set_data = mydata;

    var _myRequests = getMyRequests();

    if (originalOptions && (originalOptions.type === 'GET' || originalOptions.type === 'get') && originalOptions.url.substr(0, 2) === '/o') {
        if (originalOptions.data && originalOptions.data.preventGlobalAbort && originalOptions.data.preventGlobalAbort === true) {
            if (!_myRequests[myurl]) {
                _myRequests[myurl] = {};
            }
            _myRequests[myurl][mydata] = jqXHR;
        }
        else {
            if (app._activeView) {
                if (app._activeView._myRequests && app._activeView._myRequests[myurl] && app._activeView._myRequests[myurl][mydata]) {
                    jqXHR.abort_reason = "duplicate";
                    jqXHR.abort();
                }
                else {
                    jqXHR.always(function(data, textStatus, jqXHR1) {
                        if (jqXHR1 && jqXHR1.my_set_url && jqXHR1.my_set_data) {
                            if (app._activeView._myRequests[jqXHR1.my_set_url] && app._activeView._myRequests[jqXHR1.my_set_url][jqXHR1.my_set_data]) {
                                delete app._activeView._myRequests[jqXHR1.my_set_url][jqXHR1.my_set_data];
                            }
                        }
                        else if (data && data.my_set_url && data.my_set_data) {
                            if (app._activeView._myRequests[data.my_set_url] && app._activeView._myRequests[data.my_set_url][data.my_set_data]) {
                                delete app._activeView._myRequests[data.my_set_url][data.my_set_data];
                            }
                        }
                    });
                    if (!app._activeView._myRequests[myurl]) {
                        app._activeView._myRequests[myurl] = {};
                    }
                    app._activeView._myRequests[myurl][mydata] = jqXHR;
                }
            }
        }
    }
});

// =============================================================================
// EXPORTS
// =============================================================================

// Export the Vuex store getter for external access
export { getGlobalStore };

// Default export is the app instance
export default app;