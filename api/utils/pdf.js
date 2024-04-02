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
/**
  * Function to generate pdf from html
  * @param {string} html - html text to be converted to html
  * @param {function} callback - callback function after pdf is generated
  * @param {object} options - pdf options, default null
  * @param {object} puppeteerArgs - pupeteer arguments, default null
  * @param {boolean} remoteContent - if it is set base64 string of html content buffer is set as pdf content, default true
  */
exports.renderPDF = async function(html, callback, options = null, puppeteerArgs = null, remoteContent = true) {
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

        await page.pdf(options).then(callback, function(error) {
            log.d('pdf generation error', error);
        });
        log.d('pdf generated');
    }
    catch (error) {
        log.d('Error:', error);
    }
    finally {
        await browser.close();
    }
};