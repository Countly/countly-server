/**
 * @typedef {import('../types/proxy.ts').ProxyAgentOptions} ProxyAgentOptions
 * @typedef {import('../types/proxy.ts').BaseAgent} BaseAgent
 */
const log = require('../../../../../api/utils/log')('push:proxy');

let protos = {
    http: require('http'),
    https: require('https'),
};
/**
 * Create new Agent constructor
 * @param {ProxyAgentOptions} options push plugin proxy configuration object
 * @returns {BaseAgent} a constructor function inherits http or https Agent
 */
function proxyAgent({ proxy, ...agentConfig }, https = true) {
    agentConfig.keepAlive = true;

    let Super;
    function Constructor() {
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
                connect.destroy(new Error('ProxyTimeout'));
            });

            connect.end();
        };

        this.pushReject = rej => {
            rejects.push(rej);
        };

        this.popReject = rej => {
            let i = rejects.indexOf(rej);
            if (i !== -1) {
                rejects.splice(i, 1);
            }
        };
    };

    Super = protos[https ? "https" : "http"].Agent.prototype;
    Constructor.prototype = Super;

    // @ts-ignore
    const instance = /** @type {BaseAgent} */ (new Constructor);
    return instance;
}


module.exports = { proxyAgent };
