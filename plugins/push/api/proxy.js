const { URL } = require('url'),
    log = require('../../../api/utils/log')('push:proxy');
let protos = {
    http: require('http'),
    https: require('https'),
    http2: require('http2'),
    net: require('net'),
    tls: require('tls'),
};

/**
 * Create new Agent subclass
 *
 * @param {string} url url to construct Agent for
 * @param {obejct} proxy push plugin proxy configuration object (user, pass, host, port, http, auth, http2)
 * @param {obejct|undefined} agentConfig standard proxy configuration object
 *
 * @returns {Agent} Agent subclass with support for this particular request
 */
function proxyAgent(url, proxy, agentConfig = {}) {
    url = new URL(url);
    agentConfig.keepAlive = true;

    let Super;
    let Constructor = function() {
        Super.constructor.apply(this, [agentConfig]);

        let rejects = [];
        this.createConnection = (options, callback) => {
            let connectOptions = {
                    method: 'CONNECT',
                    host: proxy.host,
                    port: proxy.port,
                    path: `${options.host}:${options.port}`,
                    setHost: false,
                    headers: {connection: 'keep-alive', host: `${options.host}:${options.port}`},
                    agent: false,
                    timeout: 5000,
                    // ALPNProtocols: ['http/1.1', 'http/1.0']
                },
                connect;

            if (proxy.user) {
                connectOptions.headers['Proxy-Authorization'] = 'Basic ' + Buffer.from(proxy.user + ':' + proxy.pass).toString('base64');
            }

            connect = protos.http.request(connectOptions);
            connect.once('connect', (response, socket) => {
                if (response.statusCode === 200) {
                    options.socket = socket;
                    options.rejectUnauthorized = proxy.auth;
                    if (proxy.http2) {
                        options.ALPNProtocols = ['h2'];
                    }
                    let sock = Super.createConnection.apply(this, [options]);
                    sock.once('err', err => {
                        callback(err);
                    });
                    socket.on('error', err => {
                        err = err || new Error('ProxySocketError');
                        log.e('socket errored, rejecting %d promises', rejects.length, err);
                        rejects.forEach(rej => rej(err));

                        try {
                            sock.emit('timeout', err);
                        }
                        catch (e) {
                            log.e('Failed to emit err on client socket', e);
                        }
                        try {
                            sock.destroy(err);
                        }
                        catch (e) {
                            log.e('Failed to destroy client socket on proxy err', e);
                        }

                        callback(err);
                    });
                    socket.on('timeout', err => {
                        err = err || new Error('ProxyTimeout');
                        log.e('socket timeouted, rejecting %d promises', rejects.length, err);
                        rejects.forEach(rej => rej(err));

                        try {
                            sock.emit('timeout', err);
                        }
                        catch (e) {
                            log.e('Failed to emit timeout on client socket', e);
                        }
                        try {
                            sock.destroy(err);
                        }
                        catch (e) {
                            log.e('Failed to destroy client socket on ProxyTimeout', e);
                        }
                        callback(err);
                    });
                    socket.on('end', err => {
                        log.e('socket ended', err);
                    });
                    callback(null, sock);
                }
                else {
                    callback(new Error(`Bad response ${response.statusCode} (${response.statusMessage}) from proxy server`));
                }
            });

            connect.once('error', err => {
                callback(err);
            });

            connect.once('timeout', () => {
                connect.destroy(new Error('Proxy timeout'));
            });

            connect.end();
        };
    };

    if (url.protocol === 'http:') {
        Constructor.prototype = Super = protos.http.Agent.prototype;
    }
    else if (url.protocol === 'https:') {
        Constructor.prototype = Super = protos.https.Agent.prototype;
    }
    else {
        throw new Error('Invalid URL protocol "' + url.protocol + '"');
    }

    return Constructor;
}

/**
 * Request either with proxy or without it, depending on conf
 *
 * @param {string} url url to request
 * @param {string} method method
 * @param {object} conf proxy config
 * @returns {Request} request
 */
function request(url, method, conf) {
    let opts = {}, proto;
    try {
        let u = new URL(url);
        opts.host = u.hostname;
        opts.port = u.port;
        opts.path = u.pathname;
        opts.protocol = u.protocol;
        proto = u.protocol.substring(0, u.protocol.length - 1);
        if (!protos[proto]) {
            return new Error('Invalid protocol in url ' + url);
        }
        if (u.username) {
            opts.auth = `${u.username}:${u.password || ''}`;
        }
    }
    catch (e) {
        log.e('Failed to parse media URL', e);
        opts = {method, url};
        proto = url.substr(0, url.indexOf(':'));
    }

    if (conf && conf.proxyhost && conf.proxyport) {
        let Agent = proxyAgent(url, {
            host: conf.proxyhost,
            port: conf.proxyport,
            user: conf.proxyuser || undefined,
            pass: conf.proxyuser && conf.proxypass || undefined,
            auth: !(conf.proxyunauthorized || false),
        });
        opts.agent = new Agent();
    }

    opts.url = url;
    return protos[proto].request(opts);
}


module.exports = {
    proxyAgent,
    request
};
