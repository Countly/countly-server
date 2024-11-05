const path = require('path');
const countlyDir = __dirname;
const puppeteerInstallPath= path.join(countlyDir, '.cache', 'puppeteer')
/**
* @type {import("puppeteer").Configuration}
*/
module.exports = {
    // Download Chrome (default `skipDownload: false`)
    chrome: {
        skipDownload: false,
    },
    cacheDirectory: puppeteerInstallPath,
};