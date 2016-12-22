var Util = require('util');
var Http = require('http');
var Https = require('https');
var Tls = require('tls');
 
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
Https.globalAgent.options.secureProtocol = 'SSLv3_method';

function HttpsProxyAgent(options) {
    Https.Agent.call(this, options);
 
    this.proxyHost = options.proxyHost;
    this.proxyPort = options.proxyPort;
 
    this.createConnection = function (opts, callback) {
        console.log('>>>>>>>>>>>>>>>>>>>>>>>> creating connection');
        // do a CONNECT request
        var req = Http.request({
            host: options.proxyHost,
            port: options.proxyPort,
            method: 'CONNECT',
            path: opts.host + ':' + opts.port,
            headers: {
                host: opts.host
            }
        });
 
        req.on('connect', function (res, socket, head) {
            console.log('>>>>>>>>>>>>>>>>>>>>>>>> connected');
            var cts = Tls.connect({
                host: opts.host,
                socket: socket
            }, function () {
                callback(false, cts);
            });
        });
 
        req.on('error', function (err) {
            console.log('>>>>>>>>>>>>>>>>>>>>>>>> error', err);
            callback(err, null);
        });
 
        req.end();
    }
}
 
Util.inherits(HttpsProxyAgent, Https.Agent);
 
// Almost verbatim copy of http.Agent.addRequest
HttpsProxyAgent.prototype.addRequest = function (req, options) {
    var name = options.host + ':' + options.port;
    if (options.path) name += ':' + options.path;
 
    if (!this.sockets[name]) this.sockets[name] = [];
 
    // if (this.sockets[name].length < this.maxSockets) {
    //     console.log('>>>>>>>>>>>>>>>>>>>>>>>> less - creating socket');
    //     // if we are under maxSockets create a new one.
        this.createSocket(name, options.host, options.port, options.path, req, function (socket) {
            req.onSocket(socket);
        });
    // } else {
    //     console.log('>>>>>>>>>>>>>>>>>>>>>>>> more - storing request');
    //     // we are over limit so we'll add it to the queue.
    //     if (!this.requests[name])
    //         this.requests[name] = [];
    //     this.requests[name].push(req);
    // }
};
 
// Almost verbatim copy of http.Agent.createSocket
HttpsProxyAgent.prototype.createSocket = function (name, host, port, localAddress, req, callback) {
    var self = this;
    var options = Util._extend({}, self.options);
    options.port = port;
    options.host = host;
    options.localAddress = localAddress;
 
    options.servername = host;
    if (req) {
        var hostHeader = req.getHeader('host');
        if (hostHeader)
            options.servername = hostHeader.replace(/:.*$/, '');
    }
 
    console.log('>>>>>>>>>>>>>>>>>>>>>>>> creating socket', options);
    self.createConnection(options, function (err, s) {
        console.log('>>>>>>>>>>>>>>>>>>>>>>>> socket created', options);
        if (err) {
            err.message += ' while connecting to HTTP(S) proxy server ' + self.proxyHost + ':' + self.proxyPort;
 
            if (req)
                req.emit('error', err);
            else
                throw err;
 
            return;
        }
 
        if (!self.sockets[name]) self.sockets[name] = [];
 
        self.sockets[name].push(s);
 
        var onFree = function () {
            console.log('>>>>>>>>>>>>>>>>>>>>>>>> onFree')
            self.emit('free', s, host, port, localAddress);
        };
 
        var onClose = function (err) {
            console.log('>>>>>>>>>>>>>>>>>>>>>>>> onClose')
            // this is the only place where sockets get removed from the Agent.
            // if you want to remove a socket from the pool, just close it.
            // all socket errors end in a close event anyway.
            self.removeSocket(s, name, host, port, localAddress);
        };
 
        var onRemove = function () {
            console.log('>>>>>>>>>>>>>>>>>>>>>>>> onRemove')
            // we need this function for cases like HTTP 'upgrade'
            // (defined by WebSockets) where we need to remove a socket from the pool
            // because it'll be locked up indefinitely
            self.removeSocket(s, name, host, port, localAddress);
            s.removeListener('close', onClose);
            s.removeListener('free', onFree);
            s.removeListener('agentRemove', onRemove);
        };
 
        s.on('free', onFree);
        s.on('close', onClose);
        s.on('agentRemove', onRemove);
 
        callback(s);
    });
};

module.exports = HttpsProxyAgent;