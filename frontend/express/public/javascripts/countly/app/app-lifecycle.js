/**
 * App Lifecycle Module
 *
 * Contains functions for view rendering, routing, navigation,
 * and view lifecycle management.
 *
 * All state is now accessed from the Vuex store (countlyApp module)
 * as the single source of truth.
 */

import jQuery from 'jquery';
import _ from 'underscore';
import Backbone from '../../utils/backbone-min.js';
import countlyCommon from '../countly.common.js';
import countlyGlobal from '../countly.global.js';
import { getAllRoutes } from '../vue/container.js';
import { notify } from '../countly.helpers.js';
import {
    getPageScripts,
    getRefreshScripts,
    getRoutesHit,
    setRoutesHit,
    getAppTypes,
    getMyRequests,
    getRefreshActiveView,
    setRefreshActiveView,
} from '../vue/data/store.js';
import { onAppSwitch } from './app-callbacks.js';

const $ = jQuery;

// Reference to the app object - will be set after app is created
let _app = null;

/**
 * Set the app reference for this module
 * @param {object} appInstance - The app instance
 */
export function setAppInstance(appInstance) {
    _app = appInstance;
}

/**
 * Remove unfinished AJAX requests when switching views
 */
export function _removeUnfinishedRequests() {
    const _myRequests = getMyRequests();
    for (var url in _myRequests) {
        for (var data in _myRequests[url]) {
            if (parseInt(_myRequests[url][data].readyState) !== 4) {
                _myRequests[url][data].abort_reason = "view_change";
                _myRequests[url][data].abort();
            }
        }
    }
    Object.keys(_myRequests).forEach(key => delete _myRequests[key]);
    if (_app && _app._activeView) {
        _app._activeView._removeMyRequests();
    }
}

/**
 * Switch to a different app
 * @param {string} app_id - The app ID to switch to
 * @param {function} [callback] - Optional callback after switch
 */
export function switchApp(app_id, callback) {
    countlyCommon.setActiveApp(app_id);
    _removeUnfinishedRequests();
    if (_app && _app._activeView) {
        if (typeof callback === "function") {
            _app._activeView.appChanged(function() {
                onAppSwitch(app_id);
                callback();
            });
        }
        else {
            _app._activeView.appChanged(function() {
                onAppSwitch(app_id);
            });
        }
    }
    else {
        if (typeof callback === "function") {
            callback();
        }
    }
}

/**
 * Main route handler for non-root routes
 */
export function main(/*forced*/) {
    var change = true,
        redirect = false;
    if (Backbone.history.fragment.indexOf("/app/") === 0) {
        var app_id = Backbone.history.fragment.replace("/app/", "");
        redirect = "#/";
        if (app_id && app_id.length) {
            if (app_id.indexOf("/") !== -1) {
                var parts = app_id.split("/");
                app_id = parts.shift();
                redirect = "#/" + parts.join("/");
            }
            if (app_id !== countlyCommon.ACTIVE_APP_ID && countlyGlobal.apps[app_id]) {
                switchApp(app_id, function() {
                    _app.navigate(redirect, true);
                });
                return;
            }
        }
    }
    else if (Backbone.history.fragment.indexOf("/0/") === 0 && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID]) {
        _app.navigate("#/" + countlyCommon.ACTIVE_APP_ID + Backbone.history.fragment.replace("/0", ""), true);
        return;
    }
    else if (Backbone.history.fragment !== "/" && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID]) {
        var type = countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type || "mobile";
        var urls = getAllRoutes();
        urls.sort(function(a, b) {
            return b.url.length - a.url.length;
        });
        for (var i = 0; i < urls.length; i++) {
            if (urls[i].url === "#/") {
                continue;
            }
            if ("#" + Backbone.history.fragment === urls[i].url && (type === urls[i].app_type || !urls[i].app_type)) {
                change = false;
                break;
            }
            else if (("#" + Backbone.history.fragment).indexOf(urls[i].url) === 0 && (type === urls[i].app_type || !urls[i].app_type)) {
                redirect = urls[i].url;
                break;
            }
        }
    }

    if (redirect) {
        _app.navigate(redirect, true);
    }
    else if (change) {
        if (Backbone.history.fragment !== "/") {
            _app.navigate("#/", true);
        }
        else if (countlyCommon.APP_NAMESPACE !== false) {
            _app.navigate("#/" + countlyCommon.ACTIVE_APP_ID + Backbone.history.fragment, true);
        }
        else {
            dashboard();
        }
    }
    else {
        if (countlyCommon.APP_NAMESPACE !== false) {
            _app.navigate("#/" + countlyCommon.ACTIVE_APP_ID + Backbone.history.fragment, true);
        }
        else {
            _app._activeView.render();
        }
    }
}

/**
 * Dashboard route handler for root route
 */
export function dashboard() {
    const appTypes = getAppTypes();

    if (countlyGlobal.member.restrict && countlyGlobal.member.restrict.indexOf("#/") !== -1) {
        return;
    }
    if (_.isEmpty(countlyGlobal.apps)) {
        renderWhenReady(_app.manageAppsView);
    }
    else if (typeof appTypes[countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type] !== "undefined") {
        if (appTypes[countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type] !== null) {
            renderWhenReady(appTypes[countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type]);
        }
        else {
            renderWhenReady(_app.HomeView);
        }
    }
    else {
        renderWhenReady(_app.dashboardView);
    }
}

/**
 * Run all registered refresh scripts for the current route
 */
export function runRefreshScripts() {
    const refreshScripts = getRefreshScripts();
    var i = 0;
    var l = 0;
    if (refreshScripts[Backbone.history.fragment]) {
        for (i = 0, l = refreshScripts[Backbone.history.fragment].length; i < l; i++) {
            refreshScripts[Backbone.history.fragment][i]();
        }
    }
    for (var k in refreshScripts) {
        if (k !== '#' && k.indexOf('#') !== -1 && Backbone.history.fragment.match("^" + k.replace(/#/g, '.*'))) {
            for (i = 0, l = refreshScripts[k].length; i < l; i++) {
                refreshScripts[k][i]();
            }
        }
    }
    if (refreshScripts["#"]) {
        for (i = 0, l = refreshScripts["#"].length; i < l; i++) {
            refreshScripts["#"][i]();
        }
    }
}

/**
 * Perform a data refresh on the active view
 */
export function performRefresh() {
    var currentView = _app._activeView;
    if (countlyCommon.periodObj.periodContainsToday && currentView && currentView.isLoaded && !countlyCommon.DISABLE_AUTO_REFRESH) {
        currentView.isLoaded = false;
        $.when(currentView.refresh()).always(function() {
            currentView.isLoaded = true;
            runRefreshScripts();
        });
    }
}

/**
 * Render a view when ready, handling authentication and setup checks
 * @param {object} viewName - The view to render
 */
export function renderWhenReady(viewName) {
    if (_app._activeView && _app._activeView.destroy) {
        _app._activeView._removeMyRequests && _app._activeView._removeMyRequests();
        _app._activeView.destroy();
    }

    if (window.components && window.components.slider && window.components.slider.instance) {
        window.components.slider.instance.close();
    }

    _app._activeView = viewName;

    var currentRoutesHit = getRoutesHit() + 1;
    setRoutesHit(currentRoutesHit);

    // Clear the refresh interval
    clearInterval(getRefreshActiveView());

    if (typeof countlyGlobal.member.password_changed === "undefined") {
        countlyGlobal.member.password_changed = Math.round(new Date().getTime() / 1000);
    }

    if (_.isEmpty(countlyGlobal.apps)) {
        if (!countlyGlobal.member.global_admin) {
            if (Backbone.history.fragment !== "/account-settings/no-access") {
                _app.navigate("/account-settings/no-access", true);
            }
            else {
                viewName.render();
            }
        }
        else if (Backbone.history.fragment !== "/initial-setup") {
            _app.navigate("/initial-setup", true);
        }
        else {
            viewName.render();
        }
        return;
    }
    else if ((countlyGlobal.security.password_expiration > 0) &&
            (countlyGlobal.member.password_changed + countlyGlobal.security.password_expiration * 24 * 60 * 60 < new Date().getTime() / 1000) &&
            (!countlyGlobal.ssr)) {
        if (Backbone.history.fragment !== "/account-settings/reset") {
            _app.navigate("/account-settings/reset", true);
        }
        else {
            viewName.render();
        }
        return;
    }

    viewName.render();

    // Set up refresh interval and store the ID
    const refreshIntervalId = setInterval(function() {
        performRefresh();
    }, countlyCommon.DASHBOARD_REFRESH_MS);
    setRefreshActiveView(refreshIntervalId);

    if (countlyGlobal && countlyGlobal.message) {
        const message = Array.isArray(countlyGlobal.message)
            ? countlyGlobal.message[0]
            : countlyGlobal.message;

        if (message) {
            notify(message);
        }
    }

    // Access countlyVue from window since it's set globally
    if (window.countlyVue && window.countlyVue.sideBarComponent) {
        window.countlyVue.sideBarComponent.$children[0].identifySelected();
    }
}

/**
 * Check if there is routing history
 * @returns {boolean} True if there is routing history
 */
export function hasRoutingHistory() {
    if (getRoutesHit() > 1) {
        return true;
    }
    return false;
}

/**
 * Navigate back in history or to a fallback route
 * @param {string} [fallback_route] - Optional fallback route if no history
 */
export function back(fallback_route) {
    if (hasRoutingHistory()) {
        window.history.back();
    }
    else {
        if (fallback_route === undefined) {
            fallback_route = '/';
        }
        _app.navigate(fallback_route || '/', {trigger: true, replace: true});
    }
}

/**
 * Run page scripts for the current route
 */
export function pageScript() {
    const pageScripts = getPageScripts();
    var i = 0;
    var l = 0;
    if (pageScripts["#" + Backbone.history.fragment]) {
        for (i = 0, l = pageScripts["#" + Backbone.history.fragment].length; i < l; i++) {
            pageScripts["#" + Backbone.history.fragment][i]();
        }
    }
    for (var k in pageScripts) {
        if (k !== '#' && k.indexOf('#') !== -1 && ("#" + Backbone.history.fragment).match("^" + k.replace(/#/g, '.*'))) {
            for (i = 0, l = pageScripts[k].length; i < l; i++) {
                pageScripts[k][i]();
            }
        }
    }
    if (pageScripts["#"]) {
        for (i = 0, l = pageScripts["#"].length; i < l; i++) {
            pageScripts["#"][i]();
        }
    }

    // Header animation on main content scroll
    $("#content").off("scroll").on("scroll", function() {
        var elem = document.getElementById("content");
        var distanceFromTop = elem.scrollTop;
        if (distanceFromTop >= 94) {
            $(".widget-header").addClass("sticky");
        }
        else if (distanceFromTop < 44) {
            $(".widget-header").removeClass("sticky");
        }
    });
}

/**
 * Navigate to a hash without leaving a trace in history
 * @param {string} hash - The hash to navigate to
 */
export function noHistory(hash) {
    if (countlyCommon.APP_NAMESPACE !== false) {
        hash = "#/" + countlyCommon.ACTIVE_APP_ID + hash.substr(1);
    }
    if (history && history.replaceState) {
        history.replaceState(undefined, undefined, hash);
    }
    else {
        location.replace(hash);
    }
}