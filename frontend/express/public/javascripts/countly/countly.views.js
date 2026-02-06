/**
 * Countly Views Module
 * @module countly.views
 * @description Provides core dashboard and download views, along with initialization
 * functions for AJAX prefilters, routes, and app lifecycle callbacks.
 */

import countlyView from './countly.view.js';
import countlyCommon from './countly.common.js';
import { app } from './countly.template.js';
import { notify, confirm } from './countly.helpers.js';
import countlyGlobal from './countly.global.js';
import { fetchResult } from './countly.task.manager.js';
import countlyVersionHistoryManager from './countly.version.history.js';
import Backbone from '../utils/backbone-min.js';
import jQuery from 'jquery';

const $ = jQuery;

/**
 * TODO: THIS SEEMS LIKE NOT BEING USED ANYMORE, SHOULD BE REMOVED IF CONFIRMED
 * Dashboard View - Displays a fallback message when no app type plugin is installed
 * or when no apps are configured in the system.
 * @type {Object}
 * @extends countlyView
 * @property {Function} renderCommon - Renders the dashboard view with appropriate messaging
 */
export const DashboardView = countlyView.extend({
    /**
     * Renders the common view content.
     * Shows a message about missing app type plugin or prompts to add a new app.
     * @memberof DashboardView
     * @returns {void}
     */
    renderCommon: function() {
        if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID]) {
            var type = countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type;
            type = jQuery.i18n.map["management-applications.types." + type] || type;
            $(this.el).html("<div id='no-app-type'><h1>" + jQuery.i18n.map["common.missing-type"] + ": " + type + "</h1><h3><a href='#/manage/plugins'>" + jQuery.i18n.map["common.install-plugin"] + "</a><br/>" + jQuery.i18n.map["common.or"] + "<br/><a href='#/manage/apps'>" + jQuery.i18n.map["common.change-app-type"] + "</a></h3></div>");
        }
        else {
            $(this.el).html("<div id='no-app-type'><h1>" + jQuery.i18n.map["management-applications.no-app-warning"] + "</h1><h3><a href='#/manage/apps'>" + jQuery.i18n.map["common.add-new-app"] + "</a></h3></div>");
        }
    }
});

/**
 * Download View - Handles file download functionality for exported data.
 * Supports both app user exports and table exports by redirecting to the download URL.
 * @type {Object}
 * @extends countlyView
 * @property {string} task_id - The task ID for the export job
 * @property {string} path - The API path for downloading (defaults to "/app_users/download/")
 * @property {string} link - The generated download link
 * @property {Function} renderCommon - Renders the download view and initiates the download
 */
export const DownloadView = countlyView.extend({
    /**
     * Renders the download view and initiates file download.
     * If task_id is not set, displays an error message.
     * Otherwise, constructs the download URL and redirects the browser.
     * @memberof DownloadView
     * @returns {void}
     */
    renderCommon: function() {
        var self = this;
        if (!this.task_id) {
            $(this.el).html('<div id="no-app-type"><h1>' + jQuery.i18n.map["downloading-view.download-not-available-title"] + '</h1><p>' + jQuery.i18n.map["downloading-view.download-not-available-text"] + '</p></div>');
            return;
        }
        this.path = this.path || "/app_users/download/";
        var myhtml;
        if (this.path) {
            myhtml = '<div id="no-app-type"><h1>' + jQuery.i18n.map["downloading-view.download-title"] + '</h1>';
            self.link = countlyCommon.API_PARTS.data.r + self.path + self.task_id + "?auth_token=" + countlyGlobal.auth_token + "&app_id=" + countlyCommon.ACTIVE_APP_ID;
            window.location = self.link;

            if (self.link) {
                myhtml += '<p><a href="' + self.link + '">' + jQuery.i18n.map["downloading-view.if-not-start"] + '</a></p>';
            }
            myhtml += "</div>";
            $(self.el).html(myhtml);
        }
        else {
            this.path = "/app_users/download/";
            fetchResult(this.task_id, function(res) {
                myhtml = '<div id="no-app-type"><h1>' + jQuery.i18n.map["downloading-view.download-title"] + '</h1>';
                if (res && res.data) {
                    res.data = res.data.replace(new RegExp("&quot;", 'g'), "");
                    self.link = countlyCommon.API_PARTS.data.r + self.path + res.data + "?auth_token=" + countlyGlobal.auth_token + "&app_id=" + countlyCommon.ACTIVE_APP_ID;
                    window.location = self.link;


                    if (self.link) {
                        myhtml += '<p><a href="' + self.link + '">' + jQuery.i18n.map["downloading-view.if-not-start"] + '</a></p>';
                    }
                    myhtml += "</div>";
                }
                else {
                    myhtml = '<div id="no-app-type"><h1>' + jQuery.i18n.map["downloading-view.download-not-available-title"] + '</h1><p>' + jQuery.i18n.map["downloading-view.download-not-available-text"] + '</p></div>';
                }
                $(self.el).html(myhtml);

            });
        }
    }
});

/**
 * Sets up a jQuery AJAX prefilter to automatically inject authentication tokens,
 * timezone information, and database debug parameters into API requests.
 *
 * This prefilter handles:
 * - Adding the countly-token header for authenticated requests
 * - Appending periodOffset and userTimezone parameters
 * - Adding database debug comparison and override parameters when enabled
 *
 * @returns {void}
 */
export function setupAjaxPrefilter() {
    $.ajaxPrefilter(function(options, originalOptions, jqXHR) {
        if (countlyGlobal.auth_token) {
            var testurl = originalOptions.url;

            if (testurl.indexOf(countlyCommon.API_PARTS.data.w) === 0 || testurl.indexOf(countlyCommon.API_PARTS.data.r) === 0) {
                var pack_data_after = false;
                try {
                    if (typeof options.data === "string") {
                        var unpackedData = JSON.parse(options.data);
                        options.data = unpackedData;
                        pack_data_after = true;
                    }
                }
                catch (e) {
                    //ignore
                }
                jqXHR.setRequestHeader('countly-token', countlyGlobal.auth_token);
                try {
                    var offset = new Date().getTimezoneOffset();
                    var tzone = Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
                    if (typeof options.data === "string") {
                        if (options.data.indexOf('&periodOffset=') === -1) {
                            options.data += '&periodOffset=' + offset;
                        }
                        if (tzone) {
                            if (options.data.indexOf('&userTimezone=') === -1) {
                                options.data += '&userTimezone=' + tzone;
                            }
                        }
                    }
                    else if (typeof options.data === "object") {
                        options.data.periodOffset = offset;
                        if (tzone) {
                            options.data.userTimezone = tzone;
                        }
                    }
                    else {
                        var params0 = {};
                        params0.periodOffset = offset;
                        if (tzone) {
                            params0.userTimezone = tzone;
                        }
                        options.data = params0;
                    }
                }
                catch (e) {
                    //ignore
                }

                if (countlyGlobal.database_debug) {
                    const databaseDebugComparisonValue = localStorage.getItem(`database_debug_comparison_mode_${countlyCommon.ACTIVE_APP_ID}`);
                    const databaseDebugDbOverrideValue = localStorage.getItem(`database_debug_db_override_${countlyCommon.ACTIVE_APP_ID}`);
                    if (options.data) {
                        if (typeof options.data === 'string') {
                            if (databaseDebugComparisonValue) {
                                options.data += '&comparison=' + databaseDebugComparisonValue;
                            }
                            if (databaseDebugDbOverrideValue && options.data.indexOf('db_override=') === -1) {
                                options.data += '&db_override=' + databaseDebugDbOverrideValue;
                            }
                        }
                        else if (typeof options.data === 'object') {
                            if (databaseDebugComparisonValue) {
                                options.data.comparison = databaseDebugComparisonValue;
                            }
                            if (databaseDebugDbOverrideValue) {
                                options.data.db_override = databaseDebugDbOverrideValue;
                            }
                        }
                        else {
                            var params = {};
                            if (databaseDebugComparisonValue) {
                                params.comparison = databaseDebugComparisonValue;
                            }
                            if (databaseDebugDbOverrideValue) {
                                params.db_override = databaseDebugDbOverrideValue;
                            }
                            options.data = params;
                        }
                    }
                    else {
                        var paramString = '';
                        if (databaseDebugComparisonValue) {
                            paramString += 'comparison=' + databaseDebugComparisonValue;
                        }
                        if (databaseDebugDbOverrideValue) {
                            if (paramString) {
                                paramString += '&';
                            }
                            paramString += 'db_override=' + databaseDebugDbOverrideValue;
                        }
                        if (paramString) {
                            options.data = paramString;
                        }
                    }
                }
                if (pack_data_after) {
                    options.data = JSON.stringify(options.data);
                }
            }
        }
    });
}

/**
 * Registers view instances on the app object.
 * Creates a new DownloadView instance and attaches it to app.DownloadView.
 * @returns {void}
 */
export function registerViews() {
    app.DownloadView = new DownloadView();
}

/**
 * Registers application routes for handling exported data downloads.
 *
 * Routes registered:
 * - `/exportedData/AppUserExport/:task_id` - For app user export downloads
 * - `/exportedData/tableExport/:task_id` - For table export downloads
 *
 * @returns {void}
 */
export function registerRoutes() {
    app.route('/exportedData/AppUserExport/:task_id', 'userExportTask', function(task_id) {
        this.DownloadView.task_id = task_id;
        this.renderWhenReady(this.DownloadView);
    });

    app.route('/exportedData/tableExport/:task_id', 'userExportTask', function(task_id) {
        this.DownloadView.task_id = task_id;
        this.DownloadView.path = "/export/download/";
        this.renderWhenReady(this.DownloadView);
    });
}

/**
 * Registers a callback that runs when the active app is switched.
 * This callback checks for version mismatches between the filesystem and database
 * versions of Countly and displays a notification if they differ.
 * @returns {void}
 */
export function registerAppSwitchCallback() {
    app.addAppSwitchCallback(function() {
        $.when(countlyVersionHistoryManager.initialize()).then(function() {
            var versionsData = countlyVersionHistoryManager.getData(true) || {fs: [], db: [], pkg: ""};
            var dbVersion = countlyGlobal.countlyVersion;
            if (versionsData.db && versionsData.db.length > 0) {
                dbVersion = versionsData.db[versionsData.db.length - 1];
            }

            var fsVersion = countlyGlobal.countlyVersion;
            if (versionsData.fs && versionsData.fs.length > 0) {
                fsVersion = versionsData.fs[versionsData.fs.length - 1];
            }

            var versions = [versionsData.pkg, dbVersion, fsVersion];
            for (var z = 0; z < versions.length; z++) {
                if (versions[z].version) {
                    versions[z] = versions[z].version;
                }
                versions[z] = versions[z].split(".");
                if (versions[z].length > 2) {
                    versions[z] = versions[z].slice(0, 2);
                }
                versions[z] = versions[z].join(".");
            }

            if (versions[1] !== versions[2]) {
                notify({
                    title: jQuery.i18n.map["version_history.alert-title"],
                    message: jQuery.i18n.map["version_history.alert-message"]
                });
            }
        });
    });
}

/**
 * Checks if there are unsaved changes in the event blueprint view and prompts
 * the user for confirmation before navigating away.
 *
 * This function is used as a URL check callback in Backbone.history to prevent
 * accidental navigation when the user has unsaved changes.
 *
 * @returns {boolean} Returns true if navigation should proceed (no unsaved changes
 *                    or user confirmed discard), false if navigation should be blocked
 */
export function checkIfEventViewHaveNotUpdatedChanges() {
    if (app.eventsBlueprintView && app.eventsBlueprintView.preventHashChange === true) {
        var movemeto = Backbone.history.getFragment();
        if (movemeto !== "/analytics/events/blueprint") {
            confirm(jQuery.i18n.map["events.general.want-to-discard"], "popStyleGreen", function(result) {
                if (!result) {
                    window.location.hash = "/analytics/events/blueprint";
                }
                else {
                    app.eventsBlueprintView.preventHashChange = false;
                    window.location.hash = movemeto;
                }
            }, [jQuery.i18n.map["common.no-dont-continue"], jQuery.i18n.map['common.yes-discard']], {title: jQuery.i18n.map["events.general.want-to-discard-title"], image: "empty-icon"});
            return false;
        }
        else {
            return true;
        }
    }
    else {
        return true;
    }
}

/**
 * Registers the event view unsaved changes check with Backbone's URL validation system.
 * Adds `checkIfEventViewHaveNotUpdatedChanges` to the list of URL checks that are
 * performed before navigation occurs.
 * @returns {void}
 */
export function registerUrlCheck() {
    Backbone.history.urlChecks.push(checkIfEventViewHaveNotUpdatedChanges);
}

/**
 * Initializes all views, routes, and callbacks for the module.
 * This is the main entry point that should be called to set up everything
 * that was previously executed on module load.
 *
 * Calls the following initialization functions in order:
 * 1. setupAjaxPrefilter() - Sets up AJAX request interceptors
 * 2. registerViews() - Creates and registers view instances
 * 3. registerRoutes() - Sets up URL routing
 * 4. registerAppSwitchCallback() - Registers app switch handlers
 * 5. registerUrlCheck() - Registers navigation guards
 *
 * @returns {void}
 */
export function initialize() {
    setupAjaxPrefilter();
    registerViews();
    registerRoutes();
    registerAppSwitchCallback();
    registerUrlCheck();
}

/**
 * Default export containing all views and functions from this module.
 * @type {Object}
 * @property {Object} DashboardView - The dashboard view constructor
 * @property {Object} DownloadView - The download view constructor
 * @property {Function} setupAjaxPrefilter - Sets up AJAX prefilter for auth and debug params
 * @property {Function} registerViews - Registers view instances on the app
 * @property {Function} registerRoutes - Registers download routes
 * @property {Function} registerAppSwitchCallback - Registers version check callback
 * @property {Function} checkIfEventViewHaveNotUpdatedChanges - Navigation guard for event view
 * @property {Function} registerUrlCheck - Registers URL validation check
 * @property {Function} initialize - Main initialization function
 */
export default {
    DashboardView,
    DownloadView,
    setupAjaxPrefilter,
    registerViews,
    registerRoutes,
    registerAppSwitchCallback,
    checkIfEventViewHaveNotUpdatedChanges,
    registerUrlCheck,
    initialize
};