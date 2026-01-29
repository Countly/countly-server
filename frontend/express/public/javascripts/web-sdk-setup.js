import Countly from "countly-sdk-web";
import countlyGlobal from "./countly/countly.global";
import countlyCommon from "./countly/countly.common";
import $ from "jquery";
import Backbone from "./utils/backbone-min";

/**
 * Initialize and configure the Countly Web SDK for dashboard analytics
 * Sets up view tracking, session tracking, and content zone functionality
 * based on the global tracking configuration settings
 */
export function setupCountlyWebSDK() {
    /**
     * Get a sanitized view name for analytics tracking
     * Replaces dynamic segments (IDs, queries) with placeholder tokens
     * @returns {string} the sanitized view name with placeholders for dynamic parts
     */
    Countly.getViewName = function() {
        var view = "/dashboard#";
        var fragment = Backbone.history.getFragment();
        var parts = fragment.split("/").slice(0, 3);
        if (fragment.indexOf("/attribution/") === 0) {
            parts[2] = ":campaign_id";
        }
        if (fragment.indexOf("/users/") === 0 && parts.length === 3) {
            parts[2] = ":user_id";
        }
        for (var i = 1; i < parts.length; i++) {
            if (/\d/.test(parts[i])) {
                parts[i] = ":id";
            }
            if (parts[i][0] === "{") {
                parts[i] = ":query";
            }
        }
        return view + parts.join("/");
    };

    /**
     * Get a sanitized view URL for analytics tracking
     * Removes or masks dynamic segments (IDs, queries) from the URL
     * @returns {string} the sanitized view URL with dynamic parts removed or masked
     */
    Countly.getViewUrl = function() {
        var view = "/dashboard#";
        var fragment = Backbone.history.getFragment();
        var parts = fragment.split("/").slice(0, 3);
        if (fragment.indexOf("/attribution/") === 0) {
            parts[2] = "";
        }
        if (fragment.indexOf("/users/") === 0 && parts.length === 3) {
            parts[2] = "";
        }
        for (var i = 1; i < parts.length; i++) {
            if (/\d/.test(parts[i])) {
                parts[i] = "";
            }
            if (parts[i][0] === "{") {
                parts[i] = "{}";
            }
        }
        return view + parts.join("/");
    };

    var domain = countlyGlobal.countly_domain;

    try {
        // try to extract hostname from full domain url
        var urlObj = new URL(domain);
        domain = urlObj.hostname;
    }
    catch (_) {
        // do nothing, domain from config will be used as is
    }

    if (domain && domain !== "localhost") {
        //initializing countly with params
        Countly.init({
            app_key: countlyGlobal.frontend_app,
            url: countlyGlobal.frontend_server,
            device_id: domain,
            app_version: "<%= countlyVersion %>",
            interval: 1000
        });

        // if domain has changed since the last time it is saved as device id set the new domain as device id and merge it with the old domain
        if (Countly.get_device_id() !== domain) {
            Countly.change_id(domain, true);
        }

        if (countlyGlobal.tracking.server_views) {
            //track pageviews automatically
            Countly.track_pageview(Countly.getViewName());

            $(window).on('hashchange', function() {
                Countly.track_pageview(Countly.getViewName());
            });
        }

        if (countlyGlobal.tracking.server_feedback) {
            //display in app messages
            if (Countly.content && Countly.content.enterContentZone) {
                Countly.user_details({custom: {content_messages: true}}); // Ensure user is eligible for content messages
                Countly.content.enterContentZone(function(params) {
                    if (params.journeyId && (params.widget_id || params.id)) {
                        try {
                            var check = params.journeyId + "_";
                            if (params.widget_id) {
                                check += "widget_" + params.widget_id;
                            }
                            else {
                                check += "content_" + params.id;
                            }
                            var key = "cly_seenJourneyIds_c2VlbkpvdXJuZXlJZHM"; // Base64 for 'seenJourneyIds' to avoid potential key conflicts
                            var seen = JSON.parse(localStorage.getItem(key) || "[]");

                            if (seen.includes(check)) {
                                return false;
                            }

                            seen.push(check);
                            localStorage.setItem(key, JSON.stringify(seen));
                            return true;
                        }
                        catch (e) {
                            // Handle localStorage errors (disabled, full, security exceptions in private browsing)
                            // Fail open - allow content to be shown if we can't track it
                            return false;
                        }
                    }
                    return false;
                });
            }
        }
    }

    if (countlyGlobal.tracking.self_tracking_app || (countlyGlobal.tracking.self_tracking_url && countlyGlobal.tracking.self_tracking_app_key)) {
        //initializing countly with params
        var Countly2 = Countly.init({
            app_key: countlyGlobal.tracking.self_tracking_app_key || countlyGlobal.tracking.self_tracking_app,
            url: countlyGlobal.tracking.self_tracking_url || window.location.origin,
            device_id: (countlyGlobal.tracking.self_tracking_app === "email") ? countlyGlobal.member.email : countlyGlobal.member._id + "",
            app_version: "<%= countlyVersion %>",
            interval: 1000
        });

        if (countlyGlobal.tracking.self_tracking_sessions) {
            //track sessions automatically
            Countly2.track_sessions();
        }

        if (countlyGlobal.tracking.self_tracking_views) {
            //track pageviews automatically
            Countly2.track_pageview(Countly.getViewName(), null, {app_id: countlyCommon.ACTIVE_APP_ID, app_name: countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID]?.name});

            $(window).on('hashchange', function() {
                Countly2.track_pageview(Countly.getViewName(), null, {app_id: countlyCommon.ACTIVE_APP_ID, app_name: countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID]?.name});
            });
        }

        if (countlyGlobal.tracking.self_tracking_feedback) {
            //display in app messages
            if (Countly2.content && Countly2.content.enterContentZone) {
                Countly2.content.enterContentZone();
            }
        }

        if (countlyGlobal.tracking.self_tracking_user_details) {
            Countly2.user_details({
                "name": countlyGlobal.member.full_name || "",
                "username": countlyGlobal.member.username || "",
                "email": countlyGlobal.member.email
            });
        }
    }
}
