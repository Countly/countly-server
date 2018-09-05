/**
* Module returning hostname value
* @module api/parts/mgmt/ip
*/

/** @lends module:api/parts/mgmt/ip */

var ip = {},
    net = require('net'),
    extIP = require('external-ip'),
    plugins = require('../../../plugins/pluginManager.js');

(function(ip) {
    /**
     * Function to get the hostname
     * @param  {function} callback - callback function that returns the hostname
     */
    ip.getHost = function(callback) {
        // If host is set in config.js use that, otherwise get the external IP from ifconfig.me
        var domain = plugins.getConfig("api").domain;
        if (typeof domain !== "undefined" && domain != "") {
            if (domain.indexOf("://") == -1) {
                domain = "http://" + domain;
            }
            callback(false, stripTrailingSlash(domain));
        }
        else {
            getIP(function(err, ip) {
                if (err) {
                    getNetworkIP(function(err, ip) {
                        callback(err, "http://" + ip);
                    });
                }
                else {
                    callback(err, "http://" + ip);
                }
            });
        }
    };

    function stripTrailingSlash(str) {
        if (str.substr(str.length - 1) == '/') {
            return str.substr(0, str.length - 1);
        }
        return str;
    }

    var getIP = extIP({
        timeout: 600,
        getIP: 'parallel'
    });

    function getNetworkIP(callback) {
        var socket = net.createConnection(80, 'www.google.com');
        socket.on('connect', function() {
            callback(undefined, socket.address().address);
            socket.end();
        });
        socket.on('error', function(e) {
            callback(e, 'localhost');
        });
    }
}(ip));

module.exports = ip;