const versionInfo = require("../../frontend/express/version.info");
const qrcode = require("qrcode");
const URL = require('url').URL;
const { authenticator: GA } = require("otplib");
const plugins = require('../pluginManager.js');


/**
 * Generates a QR code SVG string for given username and secret.
 * @param {string} username - user identifier
 * @param {string} secret - base32 encoded 2FA secret
 * @param {function} warningLogger - function to log warnings
 * @returns {Promise<string>} - Promise resolving to SVG string of the QR code
 */
function generateQRCode(username, secret, warningLogger) {
    var domain = versionInfo.company || versionInfo.title || "Countly";
    if (domain === "Countly") {
        try {
            const apiURL = plugins.getConfig("api").domain;
            if (apiURL) {
                let parsedURL = new URL(apiURL);
                domain = parsedURL.hostname;
            }
        }
        catch (err) {
            if (warningLogger) {
                warningLogger("Error parsing api URL", err);
            }
        }
    }
    return new Promise((res, rej) => {
        qrcode.toString(
            GA.keyuri(username, domain, secret),
            {
                type: "svg",
                errorCorrectionLevel: "L",
                color: {
                    light: "#FFF0"
                }
            },
            (err, svg) => {
                if (err) {
                    return rej(err);
                }
                res(svg);
            }
        );
    });
}

module.exports = {
    generateQRCode
};