var should = require("should");
var inputUtils = require("../../plugins/star-rating/api/input-utils.js");

// /i/feedback/input forwards its request to /i with no_checksum, so only the feedback
// widget's own parameters may be forwarded. Anything else would reach /i unsigned and
// bypass a configured checksum salt.
var STAR_RATING_EVENT = JSON.stringify([{
    key: "[CLY]_star_rating",
    count: 1,
    segmentation: { rating: 5, widget_id: "5f8b1c2d3e4f5a6b7c8d9e0f" }
}]);

/**
* Parse a forwarded query string into a plain object.
* @param {string} query - forwarded query string
* @returns {object} decoded parameters
*/
function parseQuery(query) {
    var out = {};
    if (!query) {
        return out;
    }
    query.split("&").forEach(function(pair) {
        var eq = pair.indexOf("=");
        var key = decodeURIComponent(pair.substring(0, eq));
        out[key] = decodeURIComponent(pair.substring(eq + 1));
    });
    return out;
}

describe("star-rating input-utils", function() {

    describe("buildForwardedQuery", function() {
        it("forwards every parameter the feedback widget sends", function(done) {
            var widgetRequest = {
                events: STAR_RATING_EVENT,
                app_key: "APP_KEY",
                device_id: "device-1",
                sdk_name: "javascript_native_web",
                sdk_version: "25.4.0",
                timestamp: "1755500000000",
                hour: "10",
                dow: "2",
                app_version: "5.5"
            };
            var forwarded = parseQuery(inputUtils.buildForwardedQuery(widgetRequest));
            Object.keys(widgetRequest).forEach(function(key) {
                should(forwarded[key]).equal(widgetRequest[key]);
            });
            done();
        });

        it("round-trips the events payload unchanged", function(done) {
            var forwarded = parseQuery(inputUtils.buildForwardedQuery({
                events: STAR_RATING_EVENT,
                app_key: "APP_KEY",
                device_id: "device-1"
            }));
            should(forwarded.events).equal(STAR_RATING_EVENT);
            done();
        });

        it("drops old_device_id so the endpoint cannot merge app users unsigned", function(done) {
            var forwarded = inputUtils.buildForwardedQuery({
                events: STAR_RATING_EVENT,
                app_key: "APP_KEY",
                device_id: "attacker-device",
                old_device_id: "victim-device"
            });
            should(forwarded.indexOf("old_device_id")).equal(-1);
            should(forwarded.indexOf("victim-device")).equal(-1);
            done();
        });

        it("drops push token parameters so the endpoint cannot rebind a token unsigned", function(done) {
            var forwarded = inputUtils.buildForwardedQuery({
                events: STAR_RATING_EVENT,
                app_key: "APP_KEY",
                device_id: "attacker-device",
                token_session: "1",
                token: "attacker-push-token"
            });
            should(forwarded.indexOf("token_session")).equal(-1);
            should(forwarded.indexOf("attacker-push-token")).equal(-1);
            done();
        });

        it("drops other write parameters that would otherwise ride along", function(done) {
            var forwarded = inputUtils.buildForwardedQuery({
                events: STAR_RATING_EVENT,
                app_key: "APP_KEY",
                device_id: "device-1",
                begin_session: "1",
                end_session: "1",
                user_details: JSON.stringify({ name: "someone" }),
                consent: JSON.stringify({ push: true }),
                crash: JSON.stringify({ _error: "x" }),
                metrics: JSON.stringify({ _os: "iOS" }),
                ip_address: "203.0.113.1"
            });
            ["begin_session", "end_session", "user_details", "consent", "crash", "metrics", "ip_address"].forEach(function(key) {
                should(forwarded.indexOf(key)).equal(-1);
            });
            done();
        });

        it("drops non scalar values instead of stringifying them", function(done) {
            var forwarded = inputUtils.buildForwardedQuery({
                events: STAR_RATING_EVENT,
                app_key: "APP_KEY",
                device_id: { $ne: null }
            });
            should(forwarded.indexOf("device_id")).equal(-1);
            should(forwarded.indexOf("object")).equal(-1);
            done();
        });

        it("encodes values so a parameter cannot inject another one", function(done) {
            var forwarded = inputUtils.buildForwardedQuery({
                events: STAR_RATING_EVENT,
                app_key: "APP_KEY",
                device_id: "d1&old_device_id=victim-device"
            });
            should(forwarded.indexOf("&old_device_id=")).equal(-1);
            var forwardedParams = parseQuery(forwarded);
            should(forwardedParams.device_id).equal("d1&old_device_id=victim-device");
            should(forwardedParams).not.have.property("old_device_id");
            done();
        });

        it("skips absent parameters and tolerates an empty query", function(done) {
            var forwarded = inputUtils.buildForwardedQuery({ events: STAR_RATING_EVENT, app_key: "APP_KEY" });
            should(forwarded.indexOf("device_id")).equal(-1);
            should(inputUtils.buildForwardedQuery({})).equal("");
            should(inputUtils.buildForwardedQuery(null)).equal("");
            done();
        });
    });
});
