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

    // agentConfig.maxSockets = 1;
    agentConfig.keepAlive = true;

    let Super;
    let Constructor = function() {
        Super.constructor.apply(this, [agentConfig]);

        // this.keepSocketAlive = socket => {
        //     socket.setKeepAlive(true, this.keepAliveMsecs);
        //     socket.unref();
        //     return true;
        // };

        // this.reuseSocket = (socket /*, request*/) => {
        //     socket.ref();
        // };

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
            // console.error(connectOptions);

            // if (proxy.http) {
            //     connect = protos.http.request(connectOptions);
            // }
            // else {
            //     connectOptions.servername = proxy.host;
            //     connectOptions.rejectUnauthorized = proxy.auth;
            //     connect = protos.https.request(connectOptions);
            // }

            connect.once('connect', (response, socket) => {
                // connect.removeAllListeners();
                // socket.removeAllListeners();

                if (response.statusCode === 200) {
                    options.socket = socket;
                    options.rejectUnauthorized = proxy.auth;
                    if (proxy.http2) {
                        options.ALPNProtocols = ['h2'];
                    }
                    let sock = Super.createConnection.apply(this, [options]);
                    sock.once('err', err => {
                        // console.error(err);
                        // sock.removeAllListeners();
                        callback(err);
                    });
                    callback(null, sock);
                    // callback(null, sock);
                    // Super.createConnection.apply(self, [{...options, socket}, callback]);
                    // let secure = options.protocol === 'https:' || options.port === 443;
                    // options.socket = socket;
                    // if (proxy.http2) {
                    //     options.ALPNProtocols = ['h2'];
                    // }
                    // if (secure) {
                    //     options.rejectUnauthorized = proxy.auth;
                    // }
                    // let sock = (secure ? protos.tls : protos.net).connect(options, function() {
                    //     // log.d('TLS callback');
                    //     callback(null, sock);
                    // });
                    // sock.on('error', function(err) {
                    //     // log.e('TLS error', err);
                    //     callback(err);
                    // });
                    // // callback(null, Super.createConnection.apply(self, [options]));
                }
                else {
                    callback(new Error(`Bad response ${response.statusCode} (${response.statusMessage}) from proxy server`));
                }
            });

            connect.once('error', err => {
                connect.removeAllListeners();
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

// /**
//  * 
//  * @param {string} url url
//  * @param {object} proxy push config
//  * @param {object} agentConfig http/https agent config
//  * @param {object} requestConfig request config
//  * @returns {Promise} promise
//  */
// function test(url, proxy, agentConfig = {}, requestConfig = {}) {
//     return new Promise((resolve, reject) => {
//         // let Agent = proxyAgent(url, proxy),
//         //     agent = new Agent(agentConfig),
//         //     request,
//         //     /**
//         //      * response handler
//         //      * 
//         //      * @param {object} res response
//         //      */
//         //     response = res => {
//         //         let data = '';
//         //         res.on('data', dt => {
//         //             data += dt;
//         //         });
//         //         res.on('end', () => {
//         //             console.log(`${url} result: ${res.statusCode}`);
//         //             request.removeAllListeners();
//         //             agent.destroy();
//         //             resolve({status: res.statusCode, data});
//         //         });
//         //     };

//         // requestConfig = Object.assign({}, requestConfig, {agent});
//         // if (url.startsWith('http:')) {
//         //     request = protos.http.request(url, requestConfig, response);
//         // }
//         // else if (url.startsWith('https:')) {
//         //     requestConfig.rejectUnauthorized = proxy.auth;
//         //     request = protos.https.request(url, requestConfig, response);
//         // }

//         // request.on('error', err => {
//         //     request.removeAllListeners();
//         //     reject(err);
//         // });
//         // request.end();

//         let req = request(url, 'HEAD', proxy);
//         req.once('error', err => {
//             req.removeAllListeners();
//             reject(err);
//         });
//         req.once('response', res => {
//             console.log(`${url} result: ${res.statusCode}`);
//         });
//         req.end();
//     });
// }

// // Promise.all([
// //     // test('https://count.ly/images/home/countly-overview.png', {host: 'doclet.io', port: 8080, auth: false}),
// //     // test('http://count.ly/images/home/countly-overview.png', {host: 'doclet.io', port: 8080, http: true, auth: false}),

// //     // test('https://count.ly/images/home/countly-overview.png', {host: 'doclet.io', port: 9090}),
// //     // test('http://count.ly/images/home/countly-overview.png', {host: 'doclet.io', port: 9090}),

// //     test('https://api.push.apple.com/4/1123', {host: 'doclet.io', port: 9090, http2: true}),
// // ]).then(function() {
// //     console.log('done');
// // }, err => {
// //     console.error(err);
// // });


// Promise.all([
//     test('https://count.ly/images/home/countly-overview.png', {proxyhost: 'doclet.io', proxyport: 8080, proxyunauthorized: true}),
//     // test('http://count.ly/images/home/countly-overview.png', {proxyhost: 'doclet.io', proxyport: 8080, http: true, proxyunauthorized: true}),

//     // test('https://count.ly/images/home/countly-overview.png', {proxyhost: 'doclet.io', proxyport: 9090}),
//     // test('http://count.ly/images/home/countly-overview.png', {proxyhost: 'doclet.io', proxyport: 9090}),

//     // test('https://api.push.apple.com/4/1123', {host: 'doclet.io', port: 9090, http2: true}),
// ]).then(function() {
//     console.log('done');
// }, err => {
//     console.error(err);
// });



// /**
//  * 
//  * @param {Agent} agent agent instance
//  * @param {Socket} s socket instance
//  * @param {object} options socket options
//  */
// function installListeners(agent, s, options) {
//     /**
//      * onFree
//      */
//     function onFree() {
//         agent.emit('free', s, options);
//     }
//     s.on('free', onFree);

//     /**
//      * onClose
//      * @param {Error} err error
//      */
//     function onClose(/*err*/) {
//         // This is the only place where sockets get removed from the Agent.
//         // If you want to remove a socket from the pool, just close it.
//         // All socket errors end in a close event anyway.
//         agent.totalSocketCount--;
//         agent.removeSocket(s, options);
//     }
//     s.on('close', onClose);

//     /**
//      * onTimeout
//      */
//     function onTimeout() {
//         // Destroy if in free list.
//         // TODO(ronag): Always destroy, even if not in free list.
//         const sockets = agent.freeSockets;
//         for (let name in sockets) {
//             if (sockets[name].includes(s)) {
//                 s.destroy();
//             }
//         }
//     }
//     s.on('timeout', onTimeout);

//     /**
//      * onRemove
//      */
//     function onRemove() {
//         // We need this function for cases like HTTP 'upgrade'
//         // (defined by WebSockets) where we need to remove a socket from the
//         // pool because it'll be locked up indefinitely
//         agent.totalSocketCount--;
//         agent.removeSocket(s, options);
//         s.removeListener('close', onClose);
//         s.removeListener('free', onFree);
//         s.removeListener('timeout', onTimeout);
//         s.removeListener('agentRemove', onRemove);
//     }
//     s.on('agentRemove', onRemove);
// }