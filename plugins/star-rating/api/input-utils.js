/**
* Helpers for the /i/feedback/input endpoint.
* @module plugins/star-rating/api/input-utils
*/

/** @lends module:plugins/star-rating/api/input-utils */
var inputUtils = {};

/**
* The only parameters the feedback widget sends, and therefore the only ones
* /i/feedback/input forwards to /i. See the widget request in
* frontend/public/templates/feedback-popup.html.
*/
inputUtils.FORWARDED_INPUT_PARAMS = ["events", "app_key", "device_id", "sdk_name", "sdk_version", "timestamp", "hour", "dow", "app_version"];

/**
* Rebuild the query string that /i/feedback/input forwards to /i, keeping only the
* feedback widget's own parameters.
*
* The forwarded request runs with no_checksum, so whatever is forwarded reaches /i
* without checksum verification. Forwarding the caller's original query string let a
* caller append unrelated parameters, for example old_device_id (which merges app
* users) or token_session (which binds a push token), and have them processed unsigned
* even when the app has a checksum salt configured. Rebuilding the query from the
* allowlist keeps the star rating working while everything else has to go through /i
* and satisfy the checksum.
*
* Values that are not scalars are dropped rather than stringified, because a JSON
* request body can put an object or array in a query string parameter.
*
* @param {object} qstring - query string object of the incoming request
* @returns {string} encoded query string to forward to /i
*/
inputUtils.buildForwardedQuery = function(qstring) {
    var parts = [];
    if (!qstring) {
        return "";
    }
    inputUtils.FORWARDED_INPUT_PARAMS.forEach(function(key) {
        var value = qstring[key];
        if (typeof value === "undefined" || value === null) {
            return;
        }
        if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
            return;
        }
        parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(value));
    });
    return parts.join("&");
};

module.exports = inputUtils;
