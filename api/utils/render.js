/*global window*/

/**
* Module rendering views as images
* @module api/utils/render
*/

var puppeteer;
try {
    puppeteer = require('puppeteer');
}
catch (err) {
    if (process.env.COUNTLY_CONTAINER !== 'frontend') {
        console.warn(
            `Puppeteer not installed. Please install puppeteer if
            you would like to use api/utils/render.js. \nGracefully skipping
            any functionality associated with Puppeteer...`, err.stack
        );
    }
}
var pathModule = require('path');
var exec = require('child_process').exec;
var alternateChrome = true;
var chromePath = "";
var countlyFs = require('./countlyFs');
var log = require('./log.js')('core:render');
var countlyConfig = require('./../config', 'dont-enclose');
var fs = require('fs');


/**
* Check that a view stays on the dashboard, and return the url to navigate to
*
* The view can come from a request (/o/render passes params.qstring.view through), and the
* url is built by concatenation. With the default countlyConfig.path of "" the prefix is
* exactly "http://localhost", so a view that does not begin with "/" rewrites the host
* instead of the path:
*
*   "@169.254.169.254/latest/meta-data/"  ->  host 169.254.169.254
*   ":8500/v1/kv/?recurse"                ->  host localhost:8500
*   ".internal.example/x"                 ->  host localhost.internal.example
*
* Parsing the concatenated url and comparing origins settles all of those at once, rather
* than trying to enumerate them. It also agrees with what Chromium will do with the same
* string, since both use the WHATWG url parser. Note that a private range denylist would
* be the wrong control here: the intended target is loopback.
*
* The returned url is the concatenation itself, unchanged, so a configured
* countlyConfig.path keeps working exactly as before.
* @param {string} host - dashboard origin plus the configured path
* @param {string} view - view to render, expected to be a path on that dashboard
* @returns {string|null} url to navigate to, or null when it leaves the dashboard origin
**/
function sameOriginView(host, view) {
    if (typeof view !== "string") {
        return null;
    }
    var target = host + view;
    //host may carry no path at all, so normalise it before taking the origin
    var expected = originOf(host + "/");
    if (!expected || originOf(target) !== expected) {
        return null;
    }
    return target;
}

//The dashboard serves nearly all of its own assets, but not quite all of them. Two
//off-origin fetches are part of a normal render: countlyConfig.cdn moves the core
//styles and scripts to a CDN, and the map widgets fetch tiles from OpenStreetMap.
//Refusing those leaves screenshots unstyled or the map blank, and a CDN deployment
//cannot bootstrap the dashboard at all, so both are allowed by origin.
//
//frontend/express/public/javascripts/countly/vue/components/vis.js requests
//https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png and passes no subdomains option,
//so leaflet expands {s} to a, b and c. Listed as exact origins rather than matched by
//suffix: the allowlist stays a set of strings to compare, with no pattern to get wrong.
var TILE_ORIGINS = [
    "https://a.tile.openstreetmap.org",
    "https://b.tile.openstreetmap.org",
    "https://c.tile.openstreetmap.org",
    "https://tile.openstreetmap.org"
];

/**
* Origin of a url, or null when it has none to speak of
*
* A relative cdn ("" or "/assets/") has no origin and returns null here, which is
* correct: it is already served from the dashboard origin and needs no entry.
* @param {string} url - absolute url, or anything at all
* @returns {string|null} the serialised origin, or null when there is not a real one
**/
function originOf(url) {
    var origin;
    try {
        origin = new URL(url).origin;
    }
    catch (error) {
        return null;
    }
    //opaque origins serialise to "null" and would compare equal to each other
    if (!origin || origin === "null") {
        return null;
    }
    return origin;
}

/**
* Origin of the configured CDN, when one is configured as an absolute url
*
* cdn belongs to the dashboard's config rather than the api's. In the standard layout
* both live in the same tree and this finds it with no operator action; where the api
* is deployed without the dashboard the file is absent, and the origin is named in
* countlyConfig.render.allowedOrigins instead.
* @returns {string|null} the CDN origin, or null when there is none to allow
**/
function cdnOrigin() {
    try {
        return originOf(require('../../frontend/express/config.js').cdn || "");
    }
    catch (error) {
        return null;
    }
}

/**
* Origins the renderer may fetch subresources from
*
* The dashboard's own origin, the configured CDN, the map tile provider the shipped
* dashboard uses, and anything the operator adds in countlyConfig.render.allowedOrigins
* (entries may be a bare origin or any url on it). Everything else is aborted.
* @param {string} host - dashboard origin plus the configured path
* @returns {string[]} origins to allow, empty when the host itself cannot be parsed
**/
function renderAssetOrigins(host) {
    var dashboard = originOf(host + "/");
    if (!dashboard) {
        return [];
    }
    var configured = (countlyConfig.render && countlyConfig.render.allowedOrigins) || [];
    if (!Array.isArray(configured)) {
        configured = [];
    }
    var origins = [dashboard, cdnOrigin()]
        .concat(TILE_ORIGINS)
        .concat(configured.map(originOf));
    return origins.filter(function(origin, at) {
        return origin && origins.indexOf(origin) === at;
    });
}

//exported so the same origin check can be unit tested without launching a browser
exports.sameOriginView = sameOriginView;
exports.renderAssetOrigins = renderAssetOrigins;

/**
 * Function to render views as images
 * @param  {object} options - options required for rendering
 * @param  {string} options.host - the hostname
 * @param  {string} options.token - the login token value
 * @param  {string} options.view - the view to open
 * @param  {string} options.id - the id of the block to capture screenshot of
 * @param  {string} options.savePath - path where to save the screenshot
 * @param  {function} options.cbFn - function called after opening the view
 * @param  {function} options.beforeScrnCbFn - function called just before capturing the screenshot
 * @param  {object} options.dimensions - the dimensions of the screenshot
 * @param  {number} options.dimensions.width - the width of the screenshot
 * @param  {number} options.dimensions.height - the height of the screenshot
 * @param  {number} options.dimensions.padding - the padding value to subtract from the height of the screenshot
 * @param  {number} options.dimensions.scale - the scale(ppi) value of the screenshot
 * @param  {function} cb - callback function called with the error value or the image data
 * @return {void} void
 */
exports.renderView = function(options, cb) {
    if (puppeteer === undefined) {
        cb = typeof cb === 'function' ? cb : () => undefined;
        return cb(new Error(
            'Puppeteer not installed. Please install Puppeteer to use this plugin.'
        ));
    }

    (async() => {
        try {

            if (!chromePath && alternateChrome) {
                chromePath = await fetchChromeExecutablePath();
            }

            var settings = {
                headless: true,
                env: {
                    //https://github.com/hardkoded/puppeteer-sharp/issues/2633
                    XDG_CONFIG_HOME: pathModule.resolve(__dirname, "../../.cache/chrome/tmp/.chromium"),
                    XDG_CACHE_HOME: pathModule.resolve(__dirname, "../../.cache/chrome/tmp/.chromium")
                },
                // --no-sandbox / --disable-setuid-sandbox: needed when running as root in containers.
                // --ignore-certificate-errors: needed because the renderer fetches the local
                //   dashboard at https://localhost which often has a self-signed certificate.
                // Note: master 25.x temporarily added --disable-web-security here and PR #7535's
                //   M-14 commit removed it; this 24.05 branch never had that flag, so M-14 is a no-op.
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors'],
                ignoreHTTPSErrors: true,
                userDataDir: pathModule.resolve(__dirname, "../../dump/chrome/" + Date.now())
            };

            if (chromePath) {
                settings.executablePath = chromePath;
            }

            var browser = await puppeteer.launch(settings);

            try {
                log.d('Started rendering images');
                var page = await browser.newPage();

                page.on('console', (msg) => {
                    log.d("Headless chrome page log", msg.text());
                });

                page.on('pageerror', (error) => {
                    log.e("Headless chrome page error message", error.message);
                });

                page.on('response', (response) => {
                    log.d("Headless chrome page response", response.status(), response.url());
                });

                page.on('requestfailed', (request) => {
                    log.d("Headless chrome page failed request", request.failure().errorText, request.url());
                });

                var host = (process.env.COUNTLY_CONFIG_PROTOCOL || "http") + "://" + (process.env.COUNTLY_CONFIG_HOSTNAME || "localhost") + countlyConfig.path;

                if (options.host) {
                    host = options.host + countlyConfig.path;
                }

                var token = options.token;
                var view = options.view;
                var id = options.id;
                var path = options.savePath || pathModule.resolve(__dirname, "../../frontend/express/public/images/screenshots/" + "screenshot_" + Date.now() + ".png");
                var cbFn = options.cbFn || function() {};
                var beforeScrnCbFn = options.beforeScrnCbFn || function() {};
                var source = options.source;
                var updatedTimeout = options.timeout || 30000;
                var waitForRegex = options.waitForRegex;
                var waitForRegexAfterCbfn = options.waitForRegexAfterCbfn;

                options.dimensions = {
                    width: options.dimensions && options.dimensions.width ? options.dimensions.width : 1800,
                    height: options.dimensions && options.dimensions.height ? options.dimensions.height : 0,
                    padding: options.dimensions && options.dimensions.padding ? options.dimensions.padding : 0,
                    scale: options.dimensions && options.dimensions.scale ? options.dimensions.scale : 2
                };

                //Second, independent control: the renderer may only fetch from the
                //dashboard origin and the few asset origins a dashboard legitimately uses.
                //The check on the view bounds where we navigate, this bounds every
                //subresource the rendered page then asks for, so a page that does reach the
                //browser cannot use it to fetch what the server can reach.
                var allowedOrigins = renderAssetOrigins(host);
                if (!allowedOrigins.length) {
                    log.e("Cannot parse the configured dashboard host", host);
                }
                await page.setRequestInterception(true);
                page.on('request', function(request) {
                    var requestUrl = request.url();
                    if (/^(data|blob|about):/.test(requestUrl)) {
                        return request.continue();
                    }
                    if (allowedOrigins.indexOf(originOf(requestUrl)) !== -1) {
                        return request.continue();
                    }
                    log.d("Refused a request outside the allowed render origins", requestUrl);
                    return request.abort();
                });

                page.setDefaultNavigationTimeout(updatedTimeout);
                const resp = await page.goto(host + '/login/token/' + token + '?ssr=true');
                const status = resp?.status();
                if (status !== 200) {
                    throw new Error(`Failed to open login page. Status: ${status}`);
                }

                await page.waitForSelector('countly', {timeout: updatedTimeout});

                await timeout(1500);

                var viewUrl = sameOriginView(host, view);
                if (!viewUrl) {
                    //the value can be attacker supplied, so keep it out of the log
                    log.e("Refusing to render a view outside the dashboard origin");
                    throw new Error("Invalid view");
                }

                await page.goto(viewUrl);

                if (waitForRegex) {
                    await page.waitForResponse(
                        function(response) {
                            var url = response.url();
                            log.d("waitForRegex - Response Status: " + response.status() + ", URL: " + url);
                            if (waitForRegex.test(url) && response.status() === 200) {
                                return true;
                            }
                            else {
                                return false;
                            }

                        },
                        { timeout: updatedTimeout }
                    );
                }

                await timeout(500);

                await page.evaluate(cbFn, options);

                if (waitForRegexAfterCbfn) {
                    if (waitForRegex) {
                        await page.waitForResponse(
                            function(response) {
                                var url = response.url();
                                log.d("waitForRegexAfterCbfn - Response Status: " + response.status() + ", URL: " + url);
                                if (waitForRegex.test(url) && response.status() === 200) {
                                    return true;
                                }
                                else {
                                    return false;
                                }

                            },
                            { timeout: updatedTimeout }
                        );
                    }
                }

                await timeout(1500);

                await page.setViewport({
                    width: parseInt(options.dimensions.width),
                    height: parseInt(options.dimensions.height),
                    deviceScaleFactor: options.dimensions.scale
                });

                await timeout(1500);

                var bodyHandle = await page.$('body');
                var dimensions = await bodyHandle.boundingBox();

                await page.setViewport({
                    width: parseInt(options.dimensions.width || dimensions.width),
                    height: parseInt(dimensions.height - options.dimensions.padding),
                    deviceScaleFactor: options.dimensions.scale
                });

                await timeout(1500);

                await page.evaluate(beforeScrnCbFn, options);

                await timeout(1500);

                var image = "";
                var screenshotOptions = {
                    type: 'png',
                    encoding: 'binary'
                };

                if (id) {
                    var rect = await page.evaluate(function(selector) {
                    /*global document */
                        var element = document.querySelector(selector);
                        dimensions = element.getBoundingClientRect();
                        return {
                            left: dimensions.x,
                            top: dimensions.y,
                            width: dimensions.width,
                            height: dimensions.height,
                            id: element.id
                        };
                    }, id);

                    await page.setViewport({
                        width: options.dimensions.width,
                        height: parseInt(rect.height),
                        deviceScaleFactor: options.dimensions.scale
                    });


                    var clip = {
                        x: rect.left,
                        y: rect.top,
                        width: rect.width,
                        height: rect.height
                    };

                    screenshotOptions.clip = clip;
                }

                image = await page.screenshot(screenshotOptions);

                await saveScreenshot(image, path, source);

                await page.evaluate(function() {
                    var $ = window.$;
                    $("#user-logout").trigger("click");
                });

                await timeout(1500);

                await bodyHandle.dispose();
                await browser.close();

                // Remove user data directory after use
                fs.rmSync(settings.userDataDir, { recursive: true, force: true });

                var imageData = {
                    image: image,
                    path: path
                };
                log.d('Finished rendering images');
                return cb(null, imageData);
            }
            catch (e) {
                log.e("Headless chrome browser error", e);
                await browser.close();
                // Remove user data directory after use
                fs.rmSync(settings.userDataDir, { recursive: true, force: true });
                return cb(e);
            }
        }
        catch (err) {
            if (cb) {
                log.e("Headless chrome error", err);
                return cb(err);
            }
        }
    })();
};
/**
 * Function to fetch Chrome executable
 * @returns {Promise} Promise
 */
function fetchChromeExecutablePath() {
    return new Promise(function(resolve) {
        exec('ls /etc/ | grep -i "redhat-release" | wc -l', function(error1, stdout1, stderr1) {
            if (error1 || parseInt(stdout1) !== 1) {
                if (stderr1) {
                    log.e(stderr1);
                }

                alternateChrome = false;
                return resolve();
            }

            exec('cat /etc/redhat-release | grep -i "release 6" | wc -l', function(error2, stdout2, stderr2) {
                if (error2 || parseInt(stdout2) !== 1) {
                    if (stderr2) {
                        log.e(stderr2);
                    }

                    alternateChrome = false;
                    return resolve();
                }

                var path = "/usr/bin/google-chrome-stable";
                return resolve(path);
            });
        });
    });
}
/**
 * Function to save screenshots
 * @param  {Buffer} image - image data to store
 * @param  {String} path - path where image should be stored
 * @param  {String} source - who provided image
 * @returns {Promise} Promise
 */
function saveScreenshot(image, path, source) {
    return new Promise(function(resolve) {
        var buffer = image;
        var saveDataOptions = {writeMode: "overwrite"};
        if (source && source.length) {
            saveDataOptions.id = source;
        }
        countlyFs.saveData("screenshots", path, buffer, saveDataOptions, function(err3) {
            if (err3) {
                log.e(err3, err3.stack);
            }
            return resolve();
        });
    });
}

/**
 * Function to set a timeout
 * @param  {number} ms - Total milliseconds
 * @returns {Promise} Promise
 */
function timeout(ms) {
    return new Promise(function(resolve) {
        setTimeout(resolve, ms);
    });
}