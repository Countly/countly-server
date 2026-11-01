require("should");
var net = require("net");
var plugins = require("../../plugins/pluginManager.js");
var ip = require("../../api/parts/mgmt/ip.js");

// ip.getHost builds the dashboard's own URL. With no domain configured it asks an external
// service for this host's IPv4 address. It used the `icanhazip` package for that, which
// fetched over cleartext and handed back any response body whatever its status; it now uses
// native fetch over https, and anything but a 2xx falls back to the network address.
describe("ip.getHost external address lookup", function() {
    var originalFetch = global.fetch;
    var originalGetConfig = plugins.getConfig;
    var originalCreateConnection = net.createConnection;
    var requested;

    beforeEach(function() {
        requested = [];
        plugins.getConfig = function(name) {
            if (name === "api") {
                return {domain: "", offline_mode: false};
            }
            return originalGetConfig.apply(plugins, arguments);
        };
        // the fallback connects out to learn the local address; answer it without a network
        net.createConnection = function() {
            var handlers = {};
            var socket = {
                setTimeout: function() {},
                on: function(event, fn) {
                    handlers[event] = fn;
                    if (event === "error") {
                        setImmediate(function() {
                            handlers.error(new Error("no network in tests"));
                        });
                    }
                    return socket;
                },
                end: function() {}
            };
            return socket;
        };
    });

    afterEach(function() {
        global.fetch = originalFetch;
        plugins.getConfig = originalGetConfig;
        net.createConnection = originalCreateConnection;
    });

    /**
     * Answer fetch with a fixed response.
     * @param {number} status - HTTP status
     * @param {string} body - response body
     */
    function respond(status, body) {
        global.fetch = function(url, options) {
            requested.push({url: url, signal: options && options.signal});
            return Promise.resolve(new Response(body, {status: status}));
        };
    }

    it("asks the IPv4 endpoint over https and trims the answer", function(done) {
        respond(200, "203.0.113.7\n");
        ip.getHost(function(err, host) {
            (err === null).should.be.true();
            host.should.equal("http://203.0.113.7");
            requested.length.should.equal(1);
            requested[0].url.should.equal("https://ipv4.icanhazip.com/");
            (requested[0].signal instanceof AbortSignal).should.be.true();
            done();
        });
    });

    it("does not take an error page for an address", function(done) {
        respond(503, "Service Unavailable");
        ip.getHost(function(err, host) {
            host.should.not.match(/Service Unavailable/);
            host.should.equal("http://localhost");
            done();
        });
    });

    it("falls back when the request itself fails", function(done) {
        global.fetch = function() {
            return Promise.reject(new TypeError("fetch failed"));
        };
        ip.getHost(function(err, host) {
            host.should.equal("http://localhost");
            done();
        });
    });

    it("uses the configured domain without asking anyone", function(done) {
        respond(200, "203.0.113.7");
        plugins.getConfig = function() {
            return {domain: "analytics.example.com/", offline_mode: false};
        };
        ip.getHost(function(err, host) {
            host.should.equal("http://analytics.example.com");
            requested.length.should.equal(0);
            done();
        });
    });
});
