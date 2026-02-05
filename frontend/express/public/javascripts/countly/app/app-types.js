/**
 * App Types Module
 *
 * Contains functions for managing app types (mobile, web, desktop, etc.)
 * and localization utilities.
 *
 * All app type state is now stored in the Vuex store (countlyApp module)
 * as the single source of truth.
 */

import jQuery from 'jquery';
import { getGlobalStore } from '../vue/data/store.js';
import { addMenuForType, addSubMenuForType } from './app-menu.js';

const $ = jQuery;

/**
 * Get the app types state from the store
 * @returns {Object} Object containing app types and menu state
 */
function getAppTypesState() {
    const store = getGlobalStore();
    return {
        appTypes: store.state.countlyApp.appTypes,
        menuForTypes: store.state.countlyApp.menuForTypes,
        subMenuForTypes: store.state.countlyApp.subMenuForTypes,
        menuForAllTypes: store.state.countlyApp.menuForAllTypes,
        subMenuForAllTypes: store.state.countlyApp.subMenuForAllTypes,
    };
}

/**
 * Register a new app type
 * @param {string} name - The app type name (e.g., 'mobile', 'web', 'desktop')
 * @param {function|null} view - The view constructor for this app type's dashboard, or null to use HomeView
 */
export function addAppType(name, view) {
    const store = getGlobalStore();
    const {
        menuForTypes,
        subMenuForTypes,
        menuForAllTypes,
        subMenuForAllTypes
    } = getAppTypesState();

    // Register the app type in the store
    const viewInstance = view ? new view() : null;
    store.commit('countlyApp/addAppType', { type: name, config: viewInstance });

    var menu = $("#default-type").clone();
    menu.attr("id", name + "-type");
    $("#sidebar-menu").append(menu);

    // Process deferred menus for this app type
    if (menuForTypes[name]) {
        for (var i = 0; i < menuForTypes[name].length; i++) {
            addMenuForType(name, menuForTypes[name][i].category, menuForTypes[name][i].node);
        }
        menuForTypes[name] = null;
    }

    // Process deferred submenus for this app type
    if (subMenuForTypes[name]) {
        for (i = 0; i < subMenuForTypes[name].length; i++) {
            addSubMenuForType(name, subMenuForTypes[name][i].parent_code, subMenuForTypes[name][i].node);
        }
        subMenuForTypes[name] = null;
    }

    // Add all-type menus to this app type
    for (i = 0; i < menuForAllTypes.length; i++) {
        addMenuForType(name, menuForAllTypes[i].category, menuForAllTypes[i].node);
    }

    // Add all-type submenus to this app type
    for (i = 0; i < subMenuForAllTypes.length; i++) {
        addSubMenuForType(name, subMenuForAllTypes[i].parent_code, subMenuForAllTypes[i].node);
    }
}

/**
 * Localize elements in the DOM
 * @param {jQuery|HTMLElement} [el] - Element to localize (defaults to document)
 * @param {object} [data] - Additional data for localization
 */
export function localize(el, data) {
    var helpers = {
        onlyFirstUpper: function(str) {
            return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
        },
        upper: function(str) {
            return str.toUpperCase();
        }
    };

    // Handle help localization
    (el ? $(el).find('[data-help-localize]') : $("[data-help-localize]")).each(function() {
        var elem = $(this);
        if (typeof elem.data("help-localize") !== "undefined" && jQuery.i18n && jQuery.i18n.map) {
            elem.data("help", jQuery.i18n.map[elem.data("help-localize")]);
        }
    });

    // Handle main localization
    (el ? $(el).find('[data-localize]') : $("[data-localize]")).each(function() {
        var elem = $(this),
            toLocal = elem.data("localize").split("!"),
            localizedValue = "";

        if (!jQuery.i18n || !jQuery.i18n.map) {
            return;
        }

        if (toLocal.length === 2) {
            if (helpers[toLocal[0]]) {
                localizedValue = helpers[toLocal[0]](jQuery.i18n.map[toLocal[1]]);
            }
            else {
                localizedValue = jQuery.i18n.prop(toLocal[0], (toLocal[1]) ? jQuery.i18n.map[toLocal[1]] : "");
            }
        }
        else {
            localizedValue = jQuery.i18n.map[elem.data("localize")];
        }

        if (localizedValue) {
            if (data) {
                for (var dataKey in data) {
                    localizedValue = localizedValue.replace(new RegExp("\\{" + dataKey + "\\}", "g"), data[dataKey]);
                }
            }

            if (elem.is("input[type=text]") || elem.is("input[type=password]") || elem.is("textarea")) {
                elem.attr("placeholder", localizedValue);
            }
            else if (elem.is("input[type=button]") || elem.is("input[type=submit]")) {
                elem.attr("value", localizedValue);
            }
            else {
                elem.html(localizedValue);
            }
        }
    });
}

/**
 * Get all registered app types
 * Uses Vuex store as single source of truth
 * @returns {object} The app types object
 */
export function getAppTypes() {
    const store = getGlobalStore();
    return store.state.countlyApp.appTypes;
}

/**
 * Check if an app type is registered
 * @param {string} type - The app type to check
 * @returns {boolean} True if the type is registered
 */
export function hasAppType(type) {
    const appTypes = getAppTypes();
    return typeof appTypes[type] !== "undefined";
}

/**
 * Get the view for a specific app type
 * @param {string} type - The app type
 * @returns {object|null} The view for the app type, or null if not found
 */
export function getAppTypeView(type) {
    const appTypes = getAppTypes();
    return appTypes[type] || null;
}