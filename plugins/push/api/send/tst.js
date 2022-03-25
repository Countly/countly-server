/* eslint-disable no-shadow */
const { Base, util, SendError, ConnectionError, ERROR } = require('./index'),
    logger = require('../../../../api/utils/log.js')('push:send:worker'),
    { threadId } = require('worker_threads');

/**
 * Connection implementation for tests
 */
class TestConnection extends Base {
    /**
     * Standard constructor
     * @param {string} type type of connection: ap, at, id, ia, ip, ht, hp
     * @param {string} key authorization key: server key for FCM/HW, P8/P12 for APN
     * @param {string} secret passphrase for P12
     * @param {Object[]} messages initial array of messages to send
     * @param {Object} options standard stream options
     * @param {number} options.concurrency number of notifications which can be processed concurrently
     */
    constructor(type, key, secret, messages, options) {
        super(type, key, secret, messages, options);
        this.log = logger.sub(`wrk-${threadId}-t`);
        this.e_connect = options.e_connect ? new ConnectionError(options.e_connect[2], options.e_connect[0]).setConnectionError(options.e_connect[1], options.e_connect[2]) : undefined;
        this.e_send_recoverable = options.e_send_recoverable;
        this.e_send_nonrecoverable = options.e_send_nonrecoverable;
    }

    /**
     * Simulates sending process
     * @param {Object[]} data pushes to send
     * @param {integer} length number of bytes in data
     * @returns {Promise} sending promise
     */
    send(data, length) {
        return this.with_retries(data, length, (pushes, bytes, attempt) => {
            this.log.d('%d-th attempt for %d bytes', attempt, bytes);
            return new Promise((res, rej) => {
                let one = Math.floor(bytes / pushes.length);
                if (this.e_send_recoverable) {
                    setTimeout(() => {
                        this.send_results([pushes[0]._id], one);
                        setImmediate(() => {
                            this.send_push_error(new SendError(this.e_send_recoverable, ERROR.CONNECTION_PROVIDER)
                                .setAffected([pushes[1]._id], one)
                                .setLeft(pushes.slice(2), bytes - 2 * one));
                            if (pushes.length > 2) {
                                setImmediate(() => {
                                    this.send_results(pushes.slice(2).map(dt => dt._id), bytes - 2 * one);
                                    res();
                                });
                            }
                            else {
                                res();
                            }
                        });
                    }, 500);
                }
                else {
                    setTimeout(() => {
                        if (this.e_send_nonrecoverable) {
                            if (this.e_send_nonrecoverable[1] === ERROR.CONNECTION_PROXY && pushes.length === 3) {
                                rej(new ConnectionError(this.e_send_nonrecoverable[0], this.e_send_nonrecoverable[1])
                                    .setConnectionError(this.e_send_nonrecoverable[0], this.e_send_nonrecoverable[1])
                                    .setAffected([pushes.shift()], one)
                                    .setLeft(pushes, bytes - one));
                            }
                            else {
                                this.send_results(pushes[0]._id, one);
                                pushes.shift();
                                rej(new ConnectionError(this.e_send_nonrecoverable[0], this.e_send_nonrecoverable[1])
                                    .setConnectionError(this.e_send_nonrecoverable[0], this.e_send_nonrecoverable[1])
                                    .setLeft(pushes, bytes - one));
                            }
                        }
                        else if (this.batch) {
                            let sent = 0;

                            /**
                             * "send" next batch
                             */
                            let next = () => {
                                let data = pushes.splice(0, this.batch),
                                    dataBytes = pushes.length ? data.length * one : bytes - sent;
                                sent += dataBytes;
                                this.send_results(data.map(dt => dt._id), dataBytes);
                                if (pushes.length) {
                                    setTimeout(next, Math.random() * 3000);
                                }
                            };

                            next();
                        }
                        else {
                            let [d1, d2, d3, d4] = pushes;
                            this.send_results([d1._id], one);
                            if (!d2) {
                                return res();
                            }
                            setTimeout(() => {
                                this.send_push_error(new SendError('Token expired', ERROR.DATA_TOKEN_EXPIRED).addAffected(d2._id, one));
                                if (!d3) {
                                    return res();
                                }
                                setTimeout(() => {
                                    this.send_results([[d3._id, 'new_token']], one);
                                    if (!d4) {
                                        return res();
                                    }
                                    setTimeout(() => {
                                        this.send_push_error(new SendError('Token invalid', ERROR.DATA_TOKEN_INVALID).addAffected(d2._id, one));
                                        if (pushes.length <= 4) {
                                            return res();
                                        }
                                        setTimeout(() => {
                                            this.send_results(pushes.slice(4).map(dt => dt._id), bytes - 4 * one);
                                            res();
                                        }, Math.random() * 1000);
                                    }, Math.random() * 1000);
                                }, Math.random() * 1000);
                            }, Math.random() * 1000);
                        }
                    }, Math.random() * 1000);
                }
            });
        });
    }

    /**
     * Simulating connection errors
     * 
     * @param {Object[]|undefined} messages messages array
     */
    async connect(messages) {
        if (messages) {
            if (!this.connected) {
                await this.connect();
            }
            if (!this.connected) {
                throw new Error('Failed to connect');
            }
            messages.forEach(m => this.message(m._id, m));
        }
        else if (this.e_connect) {
            this.log.d('simulating connection error');
            this.closingForcefully = this.e_connect;
            setImmediate(() => {
                this.closingForcefully = this.e_connect = undefined;
                // this.destroy(this.closingForcefully);
            });
            throw this.closingForcefully;
        }
        else {
            this.log.d('simulating connection');
            await util.wait(Math.random() * 1000);
            this.log.d('simulating connection done');
            this.connected = true;
        }
    }
}

module.exports = TestConnection;