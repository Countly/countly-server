/**
 * App Menu Module
 *
 * Contains functions for managing sidebar menus and submenus.
 * Uses registerData from container.js for sidebar integration.
 *
 * All menu state is now stored in the Vuex store (countlyApp module)
 * as the single source of truth.
 */

import { registerData } from '../vue/container.js';
import { i18n } from '../vue/core.js';
import { isPluginEnabled } from '../countly.helpers.js';
import { getGlobalStore } from '../vue/data/store.js';

/**
 * Get the menu state from the store
 * @returns {Object} Object containing all menu state accessors
 */
function getMenuState() {
    const store = getGlobalStore();
    return {
        menuForTypes: store.state.countlyApp.menuForTypes,
        subMenuForTypes: store.state.countlyApp.subMenuForTypes,
        menuForAllTypes: store.state.countlyApp.menuForAllTypes,
        subMenuForAllTypes: store.state.countlyApp.subMenuForAllTypes,
        subMenuForCodes: store.state.countlyApp.subMenuForCodes,
        subMenus: store.state.countlyApp.subMenus,
        internalMenuCategories: store.state.countlyApp.internalMenuCategories,
        uniqueMenus: store.state.countlyApp.uniqueMenus,
        appTypes: store.state.countlyApp.appTypes,
        menuCategories: store.state.countlyApp.menuCategories,
    };
}

/**
 * Add a new menu category to the sidebar
 * @param {string} category - Category identifier
 * @param {object} node - Category configuration with priority, title, etc.
 */
export function addMenuCategory(category, node) {
    const store = getGlobalStore();
    const { internalMenuCategories } = getMenuState();

    if (internalMenuCategories.indexOf(category) !== -1) {
        throw "Category already exists with name: " + category;
    }
    if (typeof node.priority === "undefined") {
        throw "Provide priority property for category element";
    }

    registerData("/sidebar/analytics/menuCategory", {
        name: category,
        priority: node.priority,
        title: node.text || i18n("sidebar.category." + category),
        node: node
    });

    // Add to internal categories list (this modifies the array in place since it's a reference)
    internalMenuCategories.push(category);

    // Register in store
    store.commit('countlyApp/addMenuCategory', { category: category, config: node });

    if (typeof node.callback === "function") {
        node.callback(category, node);
    }
}

/**
 * Add a menu item for a specific app type
 * @param {string} app_type - App type (e.g., 'mobile', 'web')
 * @param {string} category - Category to add menu to
 * @param {object} node - Menu configuration
 */
export function addMenuForType(app_type, category, node) {
    const {
        internalMenuCategories,
        uniqueMenus,
        appTypes,
        menuForTypes,
        subMenuForCodes,
        subMenus
    } = getMenuState();

    if (internalMenuCategories.indexOf(category) === -1) {
        throw "Wrong category for menu: " + category;
    }
    if (!node.text || !node.code || typeof node.priority === "undefined") {
        throw "Provide code, text, icon and priority properties for menu element";
    }

    if (!uniqueMenus[app_type]) {
        uniqueMenus[app_type] = {};
    }

    if (!uniqueMenus[app_type][category]) {
        uniqueMenus[app_type][category] = {};
    }

    if (!uniqueMenus[app_type][category][node.code]) {
        uniqueMenus[app_type][category][node.code] = true;
    }
    else {
        return;
    }

    registerData("/sidebar/analytics/menu", {
        app_type: app_type,
        category: category,
        name: node.code,
        priority: node.priority,
        title: node.text,
        url: node.url,
        icon: node.icon,
        permission: node.permission,
        tabsPath: node.tabsPath,
        node: node
    });

    if (!appTypes[app_type] && category !== "management" && category !== "users") {
        if (!menuForTypes[app_type]) {
            menuForTypes[app_type] = [];
        }
        menuForTypes[app_type].push({category: category, node: node});
        return;
    }
    if (!node.url && category !== "management" && category !== "users") {
        subMenus[node.code] = true;
    }

    if (typeof node.callback === "function") {
        node.callback(app_type, category, node);
    }

    if (!node.url && category !== "management" && category !== "users" && subMenuForCodes[node.code]) {
        for (var i = 0; i < subMenuForCodes[node.code].length; i++) {
            addSubMenuForType(subMenuForCodes[node.code][i].app_type, node.code, subMenuForCodes[node.code][i].node);
        }
        subMenuForCodes[node.code] = null;
    }
}

/**
 * Add a submenu item for a specific app type
 * @param {string} app_type - App type (e.g., 'mobile', 'web')
 * @param {string} parent_code - Parent menu code
 * @param {object} node - Submenu configuration
 */
export function addSubMenuForType(app_type, parent_code, node) {
    const {
        uniqueMenus,
        appTypes,
        subMenuForTypes,
        subMenus,
        subMenuForCodes
    } = getMenuState();

    if (!parent_code) {
        throw "Provide code name for parent category";
    }
    if (!node.text || !node.code || !node.url || !node.priority) {
        throw "Provide text, code, url and priority for sub menu";
    }

    if (!uniqueMenus[app_type]) {
        uniqueMenus[app_type] = {};
    }

    if (!uniqueMenus[app_type][parent_code]) {
        uniqueMenus[app_type][parent_code] = {};
    }

    if (!uniqueMenus[app_type][parent_code][node.code]) {
        uniqueMenus[app_type][parent_code][node.code] = true;
    }
    else {
        return;
    }

    registerData("/sidebar/analytics/submenu", {
        app_type: app_type,
        parent_code: parent_code,
        name: node.code,
        priority: node.priority,
        title: node.text,
        url: node.url,
        permission: node.permission,
        tabsPath: node.tabsPath,
        node: node
    });

    if (!appTypes[app_type]) {
        if (!subMenuForTypes[app_type]) {
            subMenuForTypes[app_type] = [];
        }
        subMenuForTypes[app_type].push({parent_code: parent_code, node: node});
        return;
    }
    if (!subMenus[parent_code]) {
        if (!subMenuForCodes[parent_code]) {
            subMenuForCodes[parent_code] = [];
        }
        subMenuForCodes[parent_code].push({app_type: app_type, node: node});
        return;
    }

    if (typeof node.callback === "function") {
        node.callback(app_type, parent_code, node);
    }
}

/**
 * Add a menu item for all app types
 * @param {string} category - Category to add menu to
 * @param {object} node - Menu configuration
 */
export function addMenu(category, node) {
    const store = getGlobalStore();
    const { appTypes, menuForAllTypes } = getMenuState();

    if (node && !node.pluginName && !node.permission) {
        console.warn('Please add permission to this menu item.' + JSON.stringify(node) + ' Menu items without permission will not be allowed to be added'); // eslint-disable-line no-console
    }
    if (node && (node.pluginName || node.permission) && !isPluginEnabled(node.pluginName || node.permission)) {
        return;
    }
    else {
        if (category === "management" || category === "users") {
            addMenuForType("default", category, node);
        }
        else {
            for (var type in appTypes) {
                addMenuForType(type, category, node);
            }
            menuForAllTypes.push({category: category, node: node});

            // Also register in store for new app types
            store.commit('countlyApp/addUniqueMenu', { code: node.code, menu: node });
        }
    }
}

/**
 * Add a submenu item for all app types
 * @param {string} parent_code - Parent menu code
 * @param {object} node - Submenu configuration
 */
export function addSubMenu(parent_code, node) {
    const { appTypes, subMenuForAllTypes } = getMenuState();

    if (node && !node.pluginName && !node.permission) {
        console.warn('Please add permission to this submenu item.' + JSON.stringify(node) + ' Menu items without permission will not be allowed to be added'); // eslint-disable-line no-console
    }
    if (node && (node.pluginName || node.permission) && !isPluginEnabled(node.pluginName || node.permission)) {
        return;
    }
    else {
        for (var type in appTypes) {
            addSubMenuForType(type, parent_code, node);
        }
        subMenuForAllTypes.push({parent_code: parent_code, node: node});
    }
}