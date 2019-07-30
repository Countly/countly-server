/**
* Module returning hostname value
* @module api/parts/mgmt/ip
*/

/** @lends module:api/parts/mgmt/ip */

var ip = {},
    net = require('net'),
    extIP = require('external-ip'),
    plugins = require('../../../plugins/pluginManager.js');

/**
 * Function to get the hostname/ip address/url to access dashboard
 * @param  {function} callback - callback function that returns the hostname
 */
ip.getHost = function(callback) {
    // If host is set in config.js use that, otherwise get the external IP from ifconfig.me
    var domain = plugins.getConfig("api").domain;
    if (typeof domain !== "undefined" && domain !== "") {
        if (domain.indexOf("://") === -1) {
            domain = "http://" + domain;
        }
        callback(false, stripTrailingSlash(domain));
    }
    else {
        getIP(function(err, ipres) {
            if (err) {
                console.log(err);
                getNetworkIP(function(err2, ipaddress) {
                    callback(err2, "http://" + ipaddress);
                });
            }
            else {
                callback(err, "http://" + ipres);
            }
        });
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

var getIP = extIP({
    timeout: 600,
    getIP: 'parallel'
});


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