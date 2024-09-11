const { URL } = require("url");

module.exports = {
    buildProxyUrl
}

/**
 * 
 * @param {import("../types/proxy").ProxyConfiguration} config 
 * @returns {URL}
 */
function buildProxyUrl(config) {
    const proxyUrl = new URL("http://google.com");
    proxyUrl.host = config.host;
    proxyUrl.port = config.port;
    if (config.user) {
        proxyUrl.username = config.user;
    }
    if (config.pass) {
        proxyUrl.password = config.pass;
    }
    return proxyUrl;
}