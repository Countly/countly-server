/**
 * App Menu Module
 *
 * Contains functions for managing sidebar menus and submenus.
 * Uses registerData from container.js for sidebar integration.
 */

import { registerData } from '../vue/container.js';
import { i18n } from '../vue/core.js';
import { isPluginEnabled } from '../countly.helpers.js';
import {
    _menuForTypes,
    _subMenuForTypes,
    _menuForAllTypes,
    _subMenuForAllTypes,
    _subMenuForCodes,
    _subMenus,
    _internalMenuCategories,
    _uniqueMenus,
    appTypes
} from './app-state.js';

/**
 * Add a new menu category to the sidebar
 * @param {string} category - Category identifier
 * @param {object} node - Category configuration with priority, title, etc.
 */
export function addMenuCategory(category, node) {
    if (_internalMenuCategories.indexOf(category) !== -1) {
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
    _internalMenuCategories.push(category);
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
    if (_internalMenuCategories.indexOf(category) === -1) {
        throw "Wrong category for menu: " + category;
    }
    if (!node.text || !node.code || typeof node.priority === "undefined") {
        throw "Provide code, text, icon and priority properties for menu element";
    }

    if (!_uniqueMenus[app_type]) {
        _uniqueMenus[app_type] = {};
    }

    if (!_uniqueMenus[app_type][category]) {
        _uniqueMenus[app_type][category] = {};
    }

    if (!_uniqueMenus[app_type][category][node.code]) {
        _uniqueMenus[app_type][category][node.code] = true;
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
        if (!_menuForTypes[app_type]) {
            _menuForTypes[app_type] = [];
        }
        _menuForTypes[app_type].push({category: category, node: node});
        return;
    }
    if (!node.url && category !== "management" && category !== "users") {
        _subMenus[node.code] = true;
    }

    if (typeof node.callback === "function") {
        node.callback(app_type, category, node);
    }

    if (!node.url && category !== "management" && category !== "users" && _subMenuForCodes[node.code]) {
        for (var i = 0; i < _subMenuForCodes[node.code].length; i++) {
            addSubMenuForType(_subMenuForCodes[node.code][i].app_type, node.code, _subMenuForCodes[node.code][i].node);
        }
        _subMenuForCodes[node.code] = null;
    }
}

/**
 * Add a submenu item for a specific app type
 * @param {string} app_type - App type (e.g., 'mobile', 'web')
 * @param {string} parent_code - Parent menu code
 * @param {object} node - Submenu configuration
 */
export function addSubMenuForType(app_type, parent_code, node) {
    if (!parent_code) {
        throw "Provide code name for parent category";
    }
    if (!node.text || !node.code || !node.url || !node.priority) {
        throw "Provide text, code, url and priority for sub menu";
    }

    if (!_uniqueMenus[app_type]) {
        _uniqueMenus[app_type] = {};
    }

    if (!_uniqueMenus[app_type][parent_code]) {
        _uniqueMenus[app_type][parent_code] = {};
    }

    if (!_uniqueMenus[app_type][parent_code][node.code]) {
        _uniqueMenus[app_type][parent_code][node.code] = true;
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
        if (!_subMenuForTypes[app_type]) {
            _subMenuForTypes[app_type] = [];
        }
        _subMenuForTypes[app_type].push({parent_code: parent_code, node: node});
        return;
    }
    if (!_subMenus[parent_code]) {
        if (!_subMenuForCodes[parent_code]) {
            _subMenuForCodes[parent_code] = [];
        }
        _subMenuForCodes[parent_code].push({app_type: app_type, node: node});
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
            _menuForAllTypes.push({category: category, node: node});
        }
    }
}

/**
 * Add a submenu item for all app types
 * @param {string} parent_code - Parent menu code
 * @param {object} node - Submenu configuration
 */
export function addSubMenu(parent_code, node) {
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
        _subMenuForAllTypes.push({parent_code: parent_code, node: node});
    }
}