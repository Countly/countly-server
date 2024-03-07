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
            console.log('[' + new Date().toUTCString() + ']', 'render.js Line 3: Starting rendering process');

            if (!chromePath && alternateChrome) {
                chromePath = await fetchChromeExecutablePath();
            }

            var settings = {
                headless: true,
                defaultViewport: null,
                // debuggingPort: 9229,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--enable-features=NetworkService'
                ],
                ignoreHTTPSErrors: true,
                // userDataDir: pathModule.resolve(__dirname, "../../dump/chrome")
            };

            if (chromePath) {
                settings.executablePath = chromePath;
            }

            var browser = await puppeteer.launch(settings);
            console.log('[' + new Date().toUTCString() + ']', 'render.js Line 4: Browser launched');

            try {
                var page = await browser.newPage();
                await page.setRequestInterception(true);
                console.log('[' + new Date().toUTCString() + ']', 'render.js Line 5: New page created');

                page.on('request', (request) => {
                    if (request.url().includes('session_check')) {
                        request.abort();
                        console.log("------------------------- aborted the session_check call");
                    }
                    else {
                        request.continue();
                    }
                });

                page.on('console', (msg) => {
                    console.log('[' + new Date().toUTCString() + ']', `render.js Line 6: Headless chrome page log: ${msg.text()}`);
                });

                page.on('pageerror', (error) => {
                    console.log('[' + new Date().toUTCString() + ']', `render.js Line 7: Headless chrome page error message: ${error.message}`);
                });

                page.on('response', (response) => {
                    console.log('[' + new Date().toUTCString() + ']', `render.js Line 8: Headless chrome page response: ${response.status()}, ${response.url()}`);
                });

                page.on('requestfailed', (request) => {
                    console.log('[' + new Date().toUTCString() + ']', `render.js ine 9: Headless chrome page failed request: ${request.failure().errorText}, ${request.url()}`);
                });

                var host = (process.env.COUNTLY_CONFIG_PROTOCOL || "http") + "://" + (process.env.COUNTLY_CONFIG_HOSTNAME || "localhost") + countlyConfig.path;
                if (options.host) {
                    host = options.host + countlyConfig.path;
                }
                console.log('[' + new Date().toUTCString() + ']', `render.js Host: ${host}`);

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
                console.log('[' + new Date().toUTCString() + ']', `render.js Line 10: Navigated to login page: ${host + '/login/token/' + token + '?ssr=true'}`);

                await page.waitForSelector('countly', {timeout: updatedTimeout});
                console.log('[' + new Date().toUTCString() + ']', 'render.js Line 11: Waited for countly selector');

                await timeout(1500);

                await page.goto(host + view, { waitUntil: 'networkidle0' });
                console.log('[' + new Date().toUTCString() + ']', `render.js Line 12: Navigated to view: ${host + view}`);

                if (waitForRegex) {
                    await page.waitForResponse(
                        function(response) {
                            var url = response.url();
                            console.log('[' + new Date().toUTCString() + ']', `BLOCK 1 reached page.waitForResponse url: ${url}`);
                            console.log('[' + new Date().toUTCString() + ']', `BLOCK 1 response status: ${response.status()}`);
                            console.log('[' + new Date().toUTCString() + ']', `BLOCK 1 waitForRegex.test(url): ${waitForRegex.test(url)}`);
                            console.log('[' + new Date().toUTCString() + ']', `BLOCK 1 response.status() === 200: ${response.status() === 200}`);
                            console.log('[' + new Date().toUTCString() + ']', `BLOCK 1 waitForRegex.test(url) && response.status() === 200: ${waitForRegex.test(url) && response.status() === 200}`);
                            if (waitForRegex.test(url) && response.status() === 200) {
                                console.log('[' + new Date().toUTCString() + ']', `render.js Line 16: Waited for response matching regex after cbFn: ${url}`);
                                return true;
                            }
                            else if (response.status() === 304) {
                                console.log("BLOCK 1:  miss me with this 304");
                                return false;
                            }
                            else {
                                return false;
                            }
                        },
                        { timeout: updatedTimeout }
                    );
                    console.log('[' + new Date().toUTCString() + ']', 'render.js Line 17: Completed code execution');
                    console.log('[' + new Date().toUTCString() + ']', 'render.js Line 13: Waited for response matching regex');
                }

                await timeout(1500);

                await page.evaluate(cbFn, options);
                console.log('[' + new Date().toUTCString() + ']', 'render.js Line 14: Executed cbFn');

                if (waitForRegexAfterCbfn) {
                    console.log('[' + new Date().toUTCString() + ']', 'waitForRegexAfterCbfn if block');
                    console.log('[' + new Date().toUTCString() + ']', `waitForRegexAfterCbfn: ${waitForRegexAfterCbfn}`);
                    if (waitForRegex) {
                        console.log('[' + new Date().toUTCString() + ']', 'waitForRegex if block');
                        console.log('[' + new Date().toUTCString() + ']', `waitforRegex: ${waitForRegex}`);
                        try {
                            let res = await page.waitForResponse(
                                function(response) {
                                    var url = response.url();
                                    console.log('[' + new Date().toUTCString() + ']', `BLOCK 2 reached page.waitForResponse url: ${url}`);
                                    console.log('[' + new Date().toUTCString() + ']', `BLOCK 2 response status: ${response.status()}`);
                                    console.log('[' + new Date().toUTCString() + ']', `BLOCK 2 waitForRegex.test(url): ${waitForRegex.test(url)}`);
                                    console.log('[' + new Date().toUTCString() + ']', `BLOCK 2 response.status() === 200: ${response.status() === 200}`);
                                    console.log('[' + new Date().toUTCString() + ']', `BLOCK 2 waitForRegex.test(url) && response.status() === 200: ${waitForRegex.test(url) && response.status() === 200}`);
                                    if (waitForRegex.test(url) && response.status() === 200) {
                                        console.log('[' + new Date().toUTCString() + ']', `render.js Line 15: Waited for response matching regex after cbFn: ${url}`);
                                        return true;
                                    }
                                    else if (response.status() === 304) {
                                        console.log("BLOCK 2:  miss me with another 304");
                                        return false;
                                    }
                                    else {
                                        return false;
                                    }
                                },
                                { timeout: updatedTimeout }
                            );
                            console.log('[' + new Date().toUTCString() + ']', `res: ${res}`);
                        }
                        catch (urlTryError) {
                            console.log('[' + new Date().toUTCString() + ']', `urlTryError: ${urlTryError}`);
                        }
                        console.log('[' + new Date().toUTCString() + ']', 'render.js Line 15: Waited for response matching regex after cbFn');
                    }
                }

                await timeout(2500);
                console.log('[' + new Date().toUTCString() + ']', 'render.js Line 15: Before setting viewport dimensions');
                console.log('[' + new Date().toUTCString() + ']', `options.dimensions.width: ${options.dimensions.width}`);
                console.log('[' + new Date().toUTCString() + ']', `options.dimensions.height: ${options.dimensions.height}`);
                console.log('[' + new Date().toUTCString() + ']', `options.dimensions.scale: ${options.dimensions.scale}`);

                await page.setViewport({
                    width: parseInt(options.dimensions.width),
                    height: parseInt(options.dimensions.height),
                    deviceScaleFactor: options.dimensions.scale
                });
                console.log('[' + new Date().toUTCString() + ']', 'render.js Line 16: Set viewport dimensions');

                await timeout(1500);

                var bodyHandle = await page.$('body');
                console.log('[' + new Date().toUTCString() + ']', 'render.js Line 16: Obtained body handle');
                var dimensions = await bodyHandle.boundingBox();
                console.log('[' + new Date().toUTCString() + ']', `render.js Line 16: Obtained body bounding box: ${JSON.stringify(dimensions)}`);

                await page.setViewport({
                    width: parseInt(options.dimensions.width || dimensions.width),
                    height: parseInt(dimensions.height - options.dimensions.padding),
                    deviceScaleFactor: options.dimensions.scale
                });
                console.log('[' + new Date().toUTCString() + ']', 'render.js Line 17: Set viewport dimensions based on body bounding box');

                await timeout(1500);

                await page.evaluate(beforeScrnCbFn, options);
                console.log('[' + new Date().toUTCString() + ']', 'render.js Line 18: Executed beforeScrnCbFn');

                await timeout(1500);

                await page.waitForNetworkIdle({
                    idleTime: 5000, // Consider the network idle after 5 seconds of no activity
                    timeout: 100000, // Timeout after 100 seconds
                });

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
                        console.log('[' + new Date().toUTCString() + ']', `render.js Line 23: Obtained dimensions for element with id: ${element.id}`);
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
                    console.log('[' + new Date().toUTCString() + ']', 'render.js Line 24: Set viewport dimensions');

                    var clip = {
                        x: rect.left,
                        y: rect.top,
                        width: rect.width,
                        height: rect.height
                    };

                    screenshotOptions.clip = clip;
                    console.log('[' + new Date().toUTCString() + ']', 'render.js Line 25: Set screenshot clip');
                }

                image = await page.screenshot(screenshotOptions);
                console.log('[' + new Date().toUTCString() + ']', 'render.js Line 19: Captured screenshot');

                await saveScreenshot(image, path, source);
                console.log('[' + new Date().toUTCString() + ']', 'render.js Line 20: Saved screenshot');

                await page.evaluate(function() {
                    var $ = window.$;
                    $("#user-logout").trigger("click");
                });

                await timeout(1500);

                await bodyHandle.dispose();
                await browser.close();
                console.log('[' + new Date().toUTCString() + ']', 'render.js Line 21: Closed browser');

                var imageData = {
                    image: image,
                    path: path
                };

                console.log('[' + new Date().toUTCString() + ']', 'render.js Line 22: Rendering process completed');
                return cb(null, imageData);
            }
            catch (e) {
                console.log('[' + new Date().toUTCString() + ']', `render.js Line 23: Error: ${e}`);
                await browser.close();
                return cb(e);
            }
        }
        catch (err) {
            if (cb) {
                console.log('[' + new Date().toUTCString() + ']', `render.js Line 24: Error: ${err}`);
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