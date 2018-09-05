'use strict';

const log = require('../../../../../api/utils/log.js')('push:fcm/' + process.pid),
    config = require('../../../../../api/config.js'),
    https = require('https'),
    EventEmitter = require('events');


class ConnectionResource extends EventEmitter {
    constructor(key) {
        super();
        log.w('New FCM connection %j', arguments);
        this._key = key;
        this.requestCount = 0;
        this.inFlight = 0;

        this.onSocket = (s) => {
            this.socket = s;
        };

        this.onError = (e) => {
            log.e('socket error %j', e, arguments);
            this.rejectAndCloseOnce(e);
        };
    }

    init() {
        if (this._key.length > 100) {
            this.options = {
                hostname: 'fcm.googleapis.com',
                port: 443,
                path: '/fcm/send',
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': 'key=' + this._key,
                },
            };
        } else {
            this.options = {
                hostname: 'gcm-http.googleapis.com',
                port: 443,
                path: '/gcm/send',
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': 'key=' + this._key,
                },
            };
        }

        log.d('Options %j', this.options);

        if (config.api.push_proxy) {
            var Agent = require('./agent.js');
            this.agent = new Agent({proxyHost: config.api.push_proxy.host, proxyPort: config.api.push_proxy.port});
        } else {
            this.agent = new https.Agent(this.options);
        }
        this.agent.maxSockets = 1;

        this.options.agent = this.agent;

        return Promise.resolve();
    }

    resolve() {
        return Promise.resolve();
    }

    init_connection() {
        return Promise.resolve();
    }

    /**
	 * Format of msgs: [msg id, token, data]
	 */
    send(msgs) {
        log.d('[%d]: send %d', process.pid, msgs.length);
        this.msgs = msgs;
        this.statuses = [];
        this.resouceError = undefined;

        this.serviceImmediate();

        return new Promise((resolve, reject) => {
            this.promiseResolve = resolve;
            this.promiseReject = reject;
        });
    }

    serviceImmediate () {
        if (!this._servicing) {
            this._servicing = true;
            setImmediate(this.service.bind(this));
        }
    }

    serviceWithTimeout () {
        if (!this._servicing) {
            this._servicing = true;
            setTimeout(this.service.bind(this), 1000);
        }
    }

    resolveOnce() {
        if (this.promiseResolve) {
            this.promiseResolve([this.statuses, this.resouceError]);
            this.promiseResolve = this.promiseReject = undefined;
        }
    }

    rejectOnce(err) {
        if (this.promiseReject) {
            this.promiseReject([this.statuses, err || this.resouceError]);
            this.promiseResolve = this.promiseReject = undefined;
        }
    }

    rejectAndCloseOnce(error) {
        this.rejectOnce(error);
        this.close_connection();
    }

    service() {
        log.d('[%d]: Servicing  %j', process.pid, this.msgs);

        this._servicing = false;
	
        if (this.resouceError || this.agent === null || this._closed) {
            return this.rejectOnce(this.resouceError || new Error('Connection is closed or hasn\'t being open yet'));
        }

        if (this.msgs.length === 0 && this.requestCount === 0) {
            return this.resolveOnce();
        }

        let ids = [], tokens = [], message = this.msgs[0].m, i = 0;
		
        while (this.msgs.length) {
            let msg = this.msgs[i++];
            if (!msg || message !== msg.m) {
                this.msgs.splice(0, i - 1);
                break;
            } else {
                ids.push(msg._id);
                tokens.push(msg.t);
            }
        }

        if (tokens.length) {
            message = JSON.parse(message);
            message.registration_ids = tokens;

            this.requestCount++;
            this.inFlight += tokens.length;

            log.i('sending to %d tokens, %d requests / %d notes in flight', ids.length, this.requestCount, this.inFlight);
            log.d('sending %s to %j', message, this.requestCount, this.inFlight);
			
            let content = JSON.stringify(message);

            this.options.headers['Content-length'] = Buffer.byteLength(content, 'utf8');

            let req = https.request(this.options, (res) => {
                res.reply = '';
                res.on('data', d => { res.reply += d; });
                res.on('end', this.handle.bind(this, req, res, ids));
                res.on('close', this.handle.bind(this, req, res, ids));
            });
            req.on('socket', this.onSocket.bind(this));
            req.on('error', this.onError.bind(this));
            req.end(content);

            if (this.requestCount < 10 && this.msgs.length) {
                this.serviceImmediate();
            }
        } else {
            this.serviceWithTimeout();
        }
    }

    handle(req, res, ids) {
        if (req.handled || this._closed) { return; }
        req.handled = true;
		
        let code = res.statusCode,
            data = res.reply;

        ids = ids.map(id => [id]);
        this.inFlight -= ids.length;
        this.requestCount--;

        log.d('FCM handling %d with %d tokens while %d is in flight in %d requests', code, ids.length, this.inFlight, this.requestCount);

        if (code >= 500) {
            this.rejectAndCloseOnce(code + ': FCM Unavailable');
        } else if (code === 401) {
            this.rejectAndCloseOnce(code + ': FCM Unauthorized');
        } else if (code === 400) {
            this.rejectAndCloseOnce(code + ': FCM Bad message');
        } else if (code !== 200) {
            this.rejectAndCloseOnce(code + ': Bad response code');
        } else {
            try {
                if (data && data[0] === '"' && data[data.length - 1] === '"') {
                    data = data.substr(1, data.length - 2);
                    log.d('FCM replaced quotes: %j', data);
                }
                var obj = JSON.parse(data);
                if (obj.failure === 0 && obj.canonical_ids === 0) {
                    ids.forEach(id => id[1] = 200);
                } else if (obj.results) {

                    obj.results.forEach((result, i) => {
                        if (result.message_id) {
                            if (result.registration_id) {
                                ids[i][1] = -200;
                                ids[i][3] = result.registration_id;
                            } else {
                                ids[i][1] = 200;
                            }
                        } else if (result.error === 'InvalidRegistration') {
                            ids[i][1] = -200;
                            ids[i][2] = result.error;
                        } else if (result.error === 'NotRegistered') {
                            ids[i][1] = -200;
                        } else if (result.error === 'MessageTooBig' || result.error === 'InvalidDataKey' || 
								result.error === 'InvalidTtl' || result.error === 'InvalidPackageName') {
                            log.w('FCM returned error %d %s: %j', code, result.error, result);
                            this.resouceError = new Error(result.error);
                        } else {
                            log.w('FCM returned error %d %s: %j', code, result.error, result);
                            ids[i][1] = code;
                            ids[i][2] = result.error;
                        }
                    });
                }

                this.statuses = this.statuses.concat(ids);
                log.d('statuses %j', this.statuses);

                this.serviceImmediate();
            } catch (e) {
                ids.forEach(i => i[1] = -1);
                this.statuses = this.statuses.concat(ids);
                log.e('Bad response from FCM: %j / %j / %j', code, data, e, (e || {}).stack);
                this._servicing = false;
                this.serviceImmediate();
            }
        }

        this._servicing = false;
    }

    close_connection() {
        log.i('[%d]: Closing FCM connection', process.pid);
        this._closed = true;
        if (this.socket) {
            this.socket.emit('agentRemove');
            this.socket = null;
        }
        if (this.agent) {
            this.agent.destroy();
            this.agent = null;
        }

        this.emit('closed');
        return Promise.resolve();
    }
}

module.exports = {
    ConnectionResource: ConnectionResource
};
