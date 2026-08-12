/*global*/
/**
 * Module for pdf export
 * @module api/utils/pdf
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
var log = require('./log.js')('core:pdf');
var webConfig = {};
try {
    //web.host and web.port live in the frontend config, which is the origin the
    //report templates point the renderer at. Optional: pdf.js is core and may be
    //loaded where that file is absent, and callers pass their origins anyway.
    webConfig = require('./../../frontend/express/config.js').web || {};
}
catch (error) {
    log.d('no frontend config available for render origins', error.message);
}

/**
* The origins a rendered document is allowed to fetch from.
*
* Rendering runs on the server, so anything the document requests is requested
* from the server's network position: loopback, the private network, a cloud
* metadata service. The report templates only ever point at Countly itself, at
* `host` or at the localhost form the caller builds for exactly that reason, so
* an allow-list of those costs nothing and closes the rest.
*
* Origins are compared as scheme, host and port together. Host alone would be
* too loose, since Countly is frequently on loopback itself and every other
* service on that interface would come along with it.
* @param {array} extra - origins the caller knows it needs, e.g. its public host
* @returns {Set} the set of allowed origins
**/
function renderOrigins(extra) {
    var origins = new Set();
    var protocol = process.env.COUNTLY_CONFIG_PROTOCOL || "http";

    if (webConfig.host) {
        origins.add(protocol + "://" + webConfig.host + (webConfig.port ? ":" + webConfig.port : ""));
    }
    (extra || []).forEach(function(value) {
        if (!value) {
            return;
        }
        try {
            origins.add(new URL(value).origin);
        }
        catch (error) {
            log.d('ignoring an unparseable render origin', value);
        }
    });
    return origins;
}
/**
  * Function to generate pdf from html
  * @param {string} html - html text to be converted to html
  * @param {function} callback - callback function after pdf is generated
  * @param {object} options - pdf options, default null
  * @param {object} puppeteerArgs - pupeteer arguments, default null
  * @param {boolean} remoteContent - if it is set base64 string of html content buffer is set as pdf content, default true
  * @param {array} allowedOrigins - origins the document may fetch from, in
  * addition to the configured Countly origin. Anything else is refused.
  */
exports.renderPDF = async function(html, callback, options = null, puppeteerArgs = null, remoteContent = true, allowedOrigins = null) {
    if (typeof html !== 'string') {
        throw new Error(
            'Invalid Argument: HTML expected as type of string and received a value of a different type. Check your request body and request headers.'
        );
    }
    let browser;
    try {
        log.d('Starting pdf generation', 'puppeteerArgs: ', puppeteerArgs);
        if (puppeteerArgs) {
            browser = await puppeteer.launch(puppeteerArgs);
        }
        else {
            browser = await puppeteer.launch();
        }
        const updatedTimeout = 240000;
        const page = await browser.newPage();
        await page.setBypassCSP(true);
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

        //Refuse anything the document asks for beyond Countly's own origins. The
        //document is opened as a data: url below, and inline data: and blob:
        //resources carry no network request anywhere, so both pass through.
        const origins = renderOrigins(allowedOrigins);
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            const url = request.url();
            if (/^(data|blob|about):/.test(url)) {
                return request.continue();
            }
            let origin;
            try {
                origin = new URL(url).origin;
            }
            catch (error) {
                origin = null;
            }
            if (origin && origins.has(origin)) {
                return request.continue();
            }
            log.w('pdf render refused a request outside the countly origin', url);
            return request.abort();
        });

        page.setDefaultNavigationTimeout(updatedTimeout);
        if (!options) {
            options = { format: 'Letter' };
        }

        if (remoteContent === true) {
            await page.goto(`data:text/html;base64,${Buffer.from(html).toString('base64')}`, {
                waitUntil: 'networkidle0'
            });
        }
        else {
            //page.setContent will be faster than page.goto if html is a static
            await page.setContent(html);
        }

        const contentHeight = await page.evaluate(() => {
            /*global document*/
            return document.body.scrollHeight;
        });

        options.width = '210mm'; // A4 width, for example
        options.height = `${contentHeight}px`; // full content height
        options.printBackground = true;
        options.preferCSSPageSize = true;

        await page.pdf(options).then(callback, function(error) {
            log.d('pdf generation error', error);
        });
        log.d('pdf generated');
    }
    catch (error) {
        //a failed render used to be logged at debug and then replaced by a
        //TypeError from the close below, so the actual reason (a missing chromium,
        //a bad launch argument) never reached the log at all
        log.e('pdf generation failed', error);
    }
    finally {
        if (browser) {
            await browser.close();
        }
    }
};