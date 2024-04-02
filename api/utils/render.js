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
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
                ignoreHTTPSErrors: true,
                userDataDir: pathModule.resolve(__dirname, "../../dump/chrome")
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

                page.setDefaultNavigationTimeout(updatedTimeout);

                await page.goto(host + '/login/token/' + token + '?ssr=true');

                await page.waitForSelector('countly', {timeout: updatedTimeout});

                await timeout(1500);

                await page.goto(host + view);

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