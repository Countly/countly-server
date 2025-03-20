const { Template, Message, PushError, SendError, ERROR } = require('../../data'),
    { Base } = require('../../std'),
    { proxyAgent } = require('../../../proxy'),
    { Agent } = require('https'),
    // { ProxyAgent } = require('./agent'),
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
     * @param {number} options.pool.pushes number of notifications which can be processed concurrently, this parameter is strictly overwritten to 500
     * @param {string} options.proxy.host proxy hostname
     * @param {string} options.proxy.port proxy port
     * @param {string} options.proxy.user proxy username
     * @param {string} options.proxy.pass proxy password
     */
    constructor(log, type, creds, messages, options) {
        super(log, type, creds, messages, options);

        if (options.proxy) {
            let ProxyAgent = proxyAgent('https://example.com', options.proxy);
            this.agent = new ProxyAgent();
            // this.agent = new ProxyAgent(options);
        }
        else {
            this.agent = new Agent();
        }

        this.templates = {};
        this.results = [];
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
                res.on('end', () => {
                    if (this.opts.agent && this.opts.agent.popReject) {
                        this.opts.agent.popReject(reject);
                    }
                    handler(res);
                });
                // res.on('close', () => handler(res));
            });
            // req.on('socket', socket => {
            //     this.socket = socket;
            // });
            req.on('error', error => {
                this.log.d('send request error', error);
                reject([0, error]);
            });

            if (this.opts.agent && this.opts.agent.pushReject) {
                this.opts.agent.pushReject(reject);
            }
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

            this.log.d('do_writev', i, frame);
            if (!(frame & FRAME.SEND)) {
                if (frame & FRAME.CMD) {
                    this.push(chunks[i]);
                }
                continue;
            }

            try {
                if (payload.length === 1) {
                    await this.send(payload, length);
                    this.log.d('do_writev sent one', i, frame);
                }
                else {
                    let p,
                        one = Math.floor(length / payload.length),
                        sent = 0,
                        first = 0,
                        hash = payload[0].h,
                        mid = payload[0].m;

                    for (p = first + 1; p < payload.length; p++) {
                        if (!mid || payload[p].m !== mid || payload[p].h !== hash) {
                            let len = p === payload.length - 1 ? length - sent : (p - first) * one;
                            await this.send(payload.slice(first, p), len);
                            this.log.d('do_writev sent', i, frame);
                            // total += len;
                            sent += len;

                            first = p;
                            hash = payload[p].h;
                            mid = payload[p].m;
                        }
                    }

                    if (first < payload.length - 1) {
                        await this.send(payload.slice(first, payload.length), length - sent);
                        // total += length - sent;
                    }
                }
            }
            catch (error) { // catch adds the rest of chunks to the error, the chunk itself must be handled within try
                this.log.w('Error in splitter', error);
                if (error instanceof SendError) {
                    for (let j = i + 1; j < chunks.length; j++) {
                        if (chunks[j].frame & FRAME.SEND) {
                            this.log.w('Adding chunk with %d pushes to left', chunks[j].payload.length);
                            error.addLeft(chunks[j].payload.map(p => p._id), length);
                        }
                        else if (chunks[j].frame & FRAME.CMD) {
                            this.push(chunks[j]);
                        }
                    }
                }
                throw error; // rethrow
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