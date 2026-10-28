/**
* Module returning hostname value
* @module api/parts/mgmt/ip
*/

/** @lends module:api/parts/mgmt/ip */

var ip = {},
    net = require('net'),
    plugins = require('../../../plugins/pluginManager.js');

const log = require('../../utils/log.js')('core:api');

// Replaces the `icanhazip` package, which fetched http://icanhazip.com/ over cleartext,
// passed on whatever body came back regardless of status, and asked the dual-stack host
// from a function named IPv4(). The 6s ceiling and the newline strip match what it did.
const EXTERNAL_IP_URL = 'https://ipv4.icanhazip.com/';
const EXTERNAL_IP_TIMEOUT_MS = 6000;

/**
 * Look up this host's external IPv4 address
 * @returns {Promise<string>} the address, with the trailing newline stripped
 */
async function fetchExternalIPv4() {
    // AbortSignal.timeout is native, not the Bluebird .timeout()
    // eslint-disable-next-line no-restricted-syntax
    const res = await fetch(EXTERNAL_IP_URL, { signal: AbortSignal.timeout(EXTERNAL_IP_TIMEOUT_MS) });
    if (!res.ok) {
        throw new Error(EXTERNAL_IP_URL + ' responded ' + res.status + ' ' + res.statusText);
    }
    return (await res.text()).trim();
}
/**
 * Function to get the hostname/ip address/url to access dashboard
 * @param  {Function} callback - callback function that returns the hostname
 */
ip.getHost = function(callback) {
    // If host is set in config.js use that, otherwise get the external IP from ifconfig.me
    var domain = plugins.getConfig("api").domain || process.env.COUNTLY_CONFIG_HOSTNAME,
        offlineMode = plugins.getConfig("api").offline_mode;
    if (domain) {
        if (domain.indexOf("://") === -1) {
            domain = "http://" + domain;
        }
        callback(false, stripTrailingSlash(domain));
    }
    else {
        if (!offlineMode) {
            fetchExternalIPv4().then(function(externalIp) {
                callback(null, "http://" + externalIp);
            }).catch(function(err) {
                log.e(err);
                getNetworkIP(function(err2, ipaddress) {
                    callback(err2, "http://" + ipaddress);
                });
            });
        }
        else {
            callback("Offline Mode");
        }
    }
};

/**
 * Strip trailing slash
 * @param  {string} str - string from which to remove trailing slash
 * @returns {string} modified string
 */
function stripTrailingSlash(str) {
    if (str.substr(str.length - 1) === '/') {
        return str.substr(0, str.length - 1);
    }
    return str;
}



/**
 * Try to get ip address through network, by connecting to external resource
 * @param  {Function} callback - callback function that returns the ip address
 */
function getNetworkIP(callback) {
    var socket = net.createConnection(80, 'www.google.com');
    socket.setTimeout(1000);
    socket.on('connect', function() {
        callback(undefined, socket.address().address);
        socket.end();
    });
    socket.on('error', function(e) {
        callback(e, 'localhost');
    });
}

module.exports = ip;