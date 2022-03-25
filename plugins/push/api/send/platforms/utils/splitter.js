const { Template, Message, PushError, ERROR } = require('../../data'),
    { Base } = require('../../std'),
    { ProxyAgent } = require('./agent'),
    { Agent } = require('https'),
    https = require('https');
const { FRAME } = require('../../proto');

/**
 * Splitter stands in front of actual connection stream and splits incoming stream of pushes into stream of messages with the same content.
 * That's needed for FCM & Huawei as they accept multiple tokens for the same message.
 * Splitter also acts as a base class for FCM & Huawei connections since they share quite a lot of logic.
 */
class Splitter extends Base {
    /**
     * Standard constructor
     * @param {string} log logger name
     * @param {string} type type of connection: ap, at, id, ia, ip, ht, hp
     * @param {Credentials} creds server key
     * @param {Object[]} messages initial array of messages to send
     * @param {Object} options standard stream options
     * @param {number} options.concurrency number of notifications which can be processed concurrently, this parameter is strictly overwritten to 500
     * @param {string} options.proxy.host proxy hostname
     * @param {string} options.proxy.port proxy port
     * @param {string} options.proxy.user proxy username
     * @param {string} options.proxy.pass proxy password
     */
    constructor(log, type, creds, messages, options) {
        super(log, type, creds, messages, options);

        if (options.proxy) {
            this.agent = new ProxyAgent(options);
        }
        else {
            this.agent = new Agent();
        }

        this.agent.maxSockets = 1;
        this.templates = {};
        this.results = [];
        this.opts = {
            agent: this.agent,
            hostname: 'fcm.googleapis.com',
            port: 443,
            path: '/fcm/send',
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `key=${creds._data.key}`,
            },
        };
        // this.onSocket = socket => {
        //     this.socket = socket;
        // };

        // this.onError = error => {
        //     this.log.e('socket error', error);
        //     this.rejectAndClose(error);
        // };
    }

    /**
     * Get template by message id, create if none exists
     * 
     * @param {string} id message id
     * @param {map} map platform mapping object
     * @returns {Template} template instance
     */
    template(id) {
        let { PLATFORM } = require('../index');
        return this.templates[id] || (this.templates[id] = new Template(this.messages[id], PLATFORM[this.type.substr(0, 1)]));
    }

    /**
     * Send individual request in a promise form
     * 
     * @param {string} content request payload to send
     * @returns {Promise} which resolves to string response or rejects with [code, response string]
     */
    sendRequest(content) {
        return new Promise((resolve, reject) => {
            /**
             * Response handler function
             * 
             * @param {Response} res response object
             */
            function handler(res) {
                let code = res.statusCode,
                    data = res.reply;

                if (code === 200) {
                    resolve(data);
                }
                else {
                    reject([code, data]);
                }
            }

            let req = https.request(this.opts, res => {
                res.reply = '';
                res.on('data', d => {
                    res.reply += d;
                });
                res.on('end', () => handler(res));
                res.on('close', () => handler(res));
            });
            req.on('socket', socket => {
                this.socket = socket;
            });
            req.on('error', error => reject([0, error]));
            req.end(content);
        });
    }

    /**
     * Overriding the one in Base to introduce splitting by message id & hash and caching results
     * 
     * @param {array} chunks Array of chunks
     */
    async do_writev(chunks) {
        this.log.d('do_writev', chunks.length);
        chunks = chunks.map(c => c.chunk);

        for (let i = 0; i < chunks.length; i++) {
            let {payload, length, frame} = chunks[i];

            this.log.d('do_writev', i, frame, payload);
            if (!(frame & FRAME.SEND)) {
                if (frame & FRAME.CMD) {
                    this.push(chunks[i]);
                }
                continue;
            }
            console.log(frame, length, payload);

            if (payload.length === 1) {
                await this.send(payload, length);
                this.log.d('do_writev sent one', i, frame, payload);
            }
            else {
                let p,
                    one = Math.floor(length / payload.length),
                    sent = 0,
                    first = 0,
                    hash = payload[0].h,
                    mid = payload[0].n;

                for (p = first + 1; p < payload.length; p++) {
                    if (!mid || payload[p].n !== mid || payload[p].h !== hash) {
                        let len = p === payload.length - 1 ? length - sent : (p - first) * one;
                        await this.send(payload, first, p, len);
                        this.log.d('do_writev sent', i, frame, payload);
                        // total += len;
                        sent += len;

                        first = p;
                        hash = payload[p].h;
                        mid = payload[p].n;
                    }
                }

                if (first < payload.length - 1) {
                    await this.send(payload, first, payload.length, length - sent);
                    // total += length - sent;
                }
            }
        }
    }

    /**
     * Connect to FCM server and send a dummy token to verify connection
     * 
     * @returns {Promise} resolving to a boolean of whether credentials are valid
     */
    connect() {
        this.messages.test = Message.test();
        let data = [];
        this.once('data', dt => data.push(dt));
        return this.send([{_id: -Math.random(), m: 'test', pr: {}, t: Math.random() + ''}], 0).then(() => new Promise((res, rej) => {
            setImmediate(() => {
                if (!data.length) {
                    return rej(new PushError('IllegalState: no data after connect'));
                }
                else if (data[0].p && data[0].p instanceof PushError) {
                    if (data[0].p.isCredentials) {
                        return res(false);
                    }
                    else if (data[0].p.type & ERROR.DATA_TOKEN_INVALID) {
                        return res(true);
                    }
                }
                rej(new PushError('WeirdState'));
            });
        }), err => {
            if (err.isCredentials) {
                return false;
            }
            throw err;
        });
    }

    /**
     * Gracefully shutdown the worker
     * 
     * @param {function} callback callback to call when done
     */
    _final(callback) {
        if (this.socket) {
            this.socket.emit('agentRemove');
            this.socket = undefined;
        }
        if (this.agent) {
            this.agent.destroy();
            this.agent = undefined;
        }
        callback();
    }

    /**
     * 
     */
}


module.exports = { Splitter };