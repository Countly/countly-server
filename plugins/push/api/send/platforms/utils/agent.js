const http = require('http'),
    https = require('https'),
    tls = require('tls'),
    log = require('../../../../../../api/utils/log')('push:send:worker:agent');

// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
// https.globalAgent.options.secureProtocol = 'SSLv3_method';

/**
 * HTTP Agent for proxy support
 */
class ProxyAgent extends https.Agent {
    /**
     * Constructor
     * 
     * @param {object} options standard Agent options
     * @param {string} options.proxy.host proxy hostname
     * @param {string} options.proxy.port proxy port
     * @param {string} options.proxy.user proxy username
     * @param {string} options.proxy.pass proxy password
     */
    constructor(options) {
        super(options);
        this.proxy = options.proxy;
    }

    /**
     * Create connection
     * 
     * @param {object} opts options
     * @param {function} callback callback
     */
    createConnection(opts, callback) {
        let reqopts = {
            host: this.proxy.host,
            port: this.proxy.port,
            rejectUnauthorized: this.proxy.auth,
            method: 'CONNECT',
            path: opts.host + ':' + opts.port,
            headers: {
                host: opts.host
            },
        };

        if (this.proxy.user && this.proxy.pass) {
            reqopts.headers['Proxy-Authorization'] = 'Basic ' + Buffer.from(this.proxy.user + ':' + this.proxy.pass).toString('base64');
        }

        let req = http.request(reqopts);

        req.on('connect', function(res, socket/*, head*/) {
            log.d('connected');
            var cts = tls.connect({
                host: opts.host,
                rejectUnauthorized: reqopts.rejectUnauthorized,
                socket: socket
            }, function() {
                log.d('TLS callback');
                callback(false, cts);
            });
            cts.on('error', function(err) {
                log.e('TLS error', err);
                callback(err.message || 'TLS error', null);
            });
        });

        req.on('error', function(err) {
            log.e('request error', err);
            callback(err, null);
        });

        req.end();
    }

    /**
     * Add request
     * 
     * @param {Request} req request
     * @param {obejct} options options
     */
    addRequest(req, options) {
        var name = options.host + ':' + options.port;
        if (options.path) {
            name += ':' + options.path;
        }

        if (!this.sockets[name]) {
            this.sockets[name] = [];
        }

        this.createSocket(name, options.host, options.port, options.path, req, function(socket) {
            req.onSocket(socket);
        });
    }

    /**
     * Create new socket
     * 
     * @param {string} name socket name
     * @param {string} host hostname
     * @param {number} port port
     * @param {*} localAddress local address
     * @param {Request} req request
     * @param {function} callback callback
     */
    createSocket(name, host, port, localAddress, req, callback) {
        let self = this,
            options = Object.assign({}, self.options);

        options.port = port;
        options.host = host;
        options.localAddress = localAddress;

        options.servername = host;
        if (req) {
            var hostHeader = req.getHeader('host');
            if (hostHeader) {
                options.servername = hostHeader.replace(/:.*$/, '');
            }
        }

        log.d('creating socket', options);
        this.createConnection(options, function(err, s) {
            if (err) {
                log.e('error while creating proxy connection', err);
                if (!err.message) {
                    err = new Error(err);
                }
                err.message += ' while connecting to HTTP(S) proxy server ' + self.proxy.host + ':' + self.proxy.port;

                if (req) {
                    req.emit('error', err);
                }
                else {
                    throw err;
                }

                return;
            }
            log.d('socket created');

            if (!self.sockets[name]) {
                self.sockets[name] = [];
            }

            self.sockets[name].push(s);

            let onFree = function() {
                log.d('free', s, name, host, port, localAddress);
                self.emit('free', s, name, host, port, localAddress);
            };

            let onClose = function(/*err*/) {
                log.d('socket closed', s, name, host, port, localAddress);
                // this is the only place where sockets get removed from the Agent.
                // if you want to remove a socket from the pool, just close it.
                // all socket errors end in a close event anyway.
                self.removeSocket(s, name, host, port, localAddress);
            };

            let onRemove = function() {
                log.d('socket removed', s, name, host, port, localAddress);
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
    }

    /**
     * Return any socket instance
     * 
     * @returns {Socket} socket instance
     */
    anySocket() {
        for (let k in this.sockets) {
            return this.sockets[k];
        }
    }
}

module.exports = { ProxyAgent };
