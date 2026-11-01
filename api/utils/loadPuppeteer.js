/**
 * Loads puppeteer for api/utils/pdf.js and api/utils/render.js
 * @module api/utils/loadPuppeteer
 */

let loading = null;

/**
 * Load puppeteer once. puppeteer 25 is an ES module: require() loads it only on Node.js
 * 20.19 and later, while import() also works on the Node.js 20.18 that 25.03.0 installed.
 * @returns {Promise<object|null>} puppeteer, or null when it is not installed
 */
function loadPuppeteer() {
    if (!loading) {
        loading = import('puppeteer').then(mod => mod.default || mod, err => {
            if (process.env.COUNTLY_CONTAINER !== 'frontend') {
                console.warn(
                    `Puppeteer not installed. Please install puppeteer if
                    you would like to use api/utils/render.js. \nGracefully skipping
                    any functionality associated with Puppeteer...`, err.stack
                );
            }
            return null;
        });
    }
    return loading;
}

module.exports = loadPuppeteer;
