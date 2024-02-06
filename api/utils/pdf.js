/*global*/
/**
 * Module for pdf export
 * @module api/utils/pdf
 */
var pathModule = require('path');
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
        console.log(puppeteerArgs);
        throw new Error(
            'Invalid Argument: HTML expected as type of string and received a value of a different type. Check your request body and request headers.'
        );
    }
    let browser;
    // if (puppeteerArgs) {
    //     browser = await puppeteer.launch(puppeteerArgs);
    // }
    // else {
    browser = await puppeteer.launch({
        headless: true,
        debuggingPort: 9229,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        ignoreHTTPSErrors: true,
        userDataDir: pathModule.resolve(__dirname, "../../dump/chrome")
    });
    // }

    const page = await browser.newPage();
    if (!options) {
        options = { format: 'Letter' };
    }

    if (remoteContent === true) {
        console.log('pdf.js Step 1: New page created');
        await page.goto(`data:text/html;base64,${Buffer.from(html).toString('base64')}`, {
            waitUntil: 'networkidle0'
        });
        console.log('pdf.js Step 2: Page loaded with remote content');
    }
    else {
        console.log('pdf.js Step 3: New page created');
        //page.setContent will be faster than page.goto if html is a static
        await page.setContent(html);
        console.log('pdf.js Step 4: Page content set');
    }

    console.log('pdf.js Step 5: Puppeteer launched');
    console.log('pdf.js Step 6: New page created');

    await page.pdf(options).then(callback, function(error) {
        console.log('pdf.js Step 7: PDF generated');
        console.log('pdf.js Error:', error);
    });
    await browser.close();
    console.log('pdf.js Step 8: Browser closed');
};