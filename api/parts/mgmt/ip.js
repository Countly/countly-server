/**
* Module returning hostname value
* @module api/parts/mgmt/ip
*/

/** @lends module:api/parts/mgmt/ip */

var ip = {},
    net = require('net'),
    plugins = require('../../../plugins/pluginManager.js'),
    exec = require('child_process').exec;

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
            //command needs bash 
            exec('dig @resolver1.opendns.com A myip.opendns.com +short -4', function(err, stdout1) {
                if (err) {
                    log.e(err);
                    getNetworkIP(function(err2, ipaddress) {
                        callback(err2, "http://" + ipaddress);
                    });
                }
                else {
                    if (stdout1) {
                        callback(err, "http://" + stdout1.replace(/^\s+|\s+$/g, ''));
                    }
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
    var socket = net.createConnection(80, 'icanhazip.com');
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