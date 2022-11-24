/**
* Module returning hostname value
* @module api/parts/mgmt/ip
*/

/** @lends module:api/parts/mgmt/ip */

var ip = {},
    net = require('net'),
    plugins = require('../../../plugins/pluginManager.js'),
    icanhazip = require("icanhazip");

const log = require('../../utils/log.js')('core:api');
/**
 * Function to get the hostname/ip address/url to access dashboard
 * @param  {function} callback - callback function that returns the hostname
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
            icanhazip.IPv4().then(function(externalIp) {
                callback(null, "http://" + externalIp);
            }).catch(function(err) {
                if (err) {
                    log.e(err);
                    getNetworkIP(function(err2, ipaddress) {
                        callback(err2, "http://" + ipaddress);
                    });
                }
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
 * @param  {function} callback - callback function that returns the ip address
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