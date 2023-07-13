const should = require('should'),
    data = require('./data'),
    log = require('../../../api/utils/log')('push'),
    { ObjectID } = require('mongodb'),
    { Readable } = require('stream'),
    { State } = require('../api/jobs/util/state'),
    { Batcher } = require('../api/jobs/util/batcher'),
    { Resultor } = require('../api/jobs/util/resultor'),
    { Connector } = require('../api/jobs/util/connector'),
    { ERROR, Pool, pools, ConnectionError, SendError } = require('../api/send'),
    { State: MessageState } = require('../api/send/data'),
    { CREDS } = require('../api/send/platforms');

const cfg = {
    sendAhead: 60000,
    connection: {
        retries: 3,
        retryFactor: 1000,
    },
    pool: {
        pushes: 100000,
        bytes: 100000,
        concurrency: 5
    }
};

function db_fixture(ret, total = 1000) {
    ret.messageUpdates = [];
    ret.messageSaves = [];
    ret.pushDeletes = [];
    ret.bulks = {};
    return Object.assign({}, data.dbext, {
        ObjectID,
        collection: name => {
            if (name === 'apps') {
                return {
                    async findOne() {
                        return data.app;
                    }
                };
            }
            else if (name === 'creds') {
                return {
                    async findOne() {
                        return data.credentials;
                    }
                };
            }
            else if (name === 'messages') {
                return {
                    async findOne(q) {
                        return Object.values(data.messages).filter(m => m._id.toString() === q._id.toString())[0];
                    },
                    async updateOne(q, update) {
                        ret.messageUpdates.push(update);
                        return {
                            ok: true,
                        };
                    },
                    async findOneAndUpdate(q, update) {
                        ret.messageUpdates.push(update);
                        if (update.$set.status === 'sending') {
                            let m = JSON.parse(JSON.stringify(Object.values(data.messages).filter(m => m._id.toString() === q._id.toString())[0]));
                            return {
                                ok: true,
                                value: Object.assign(m, update.$set, {
                                    state: MessageState.Created | MessageState.Scheduled | MessageState.Streaming
                                })
                            };
                        }
                        return {
                            ok: true,
                        };
                    },
                    async save(save) {
                        ret.messageSaves.push(save);
                        return this;
                    }
                };
            }
            else if (name === 'push') {
                return {
                    find: () => ({
                        sort: () => ({
                            stream: () => {
                                let idx = 0;
                                return new Readable({
                                    objectMode: true,
                                    highWaterMark: 1000,
                                    read(size) {
                                        console.log('reading', size);
                                        while (size-- > 0) {
                                            if (idx >= total) {
                                                return this.push(null);
                                            }
                                            else {
                                                let push = Object.assign({}, data.compilation[idx % data.compilation.length]);
                                                push.u = idx + '';
                                                if (idx >= data.compilation.length) {
                                                    push._id = ObjectID();
                                                }
                                                if (ret.connection_error[idx]) {
                                                    push.connection_error = true;
                                                }
                                                else if (ret.token_invalid[idx]) {
                                                    push.token_invalid = true;
                                                }
                                                else if (ret.token_expired[idx]) {
                                                    push.token_expired = true;
                                                }
                                                else if (ret.token_changed[idx]) {
                                                    push.token_changed = true;
                                                }
                                                this.push(push);
                                            }
                                            idx++;
                                        }
                                    }
                                });
                            }
                        })
                    }),
                    updateMany: async() => {},
                    deleteMany: async(q) => {
                        ret.pushDeletes = ret.pushDeletes.concat(q._id.$in);
                    },
                };
            }
            else if (name.indexOf('push_') === 0 || name.indexOf('app_users') === 0) {
                return {
                    async bulkWrite(updates) {
                        if (ret.bulks[name]) {
                            ret.bulks[name] = ret.bulks[name].concat(updates);
                        }
                        else {
                            ret.bulks[name] = updates;
                        }
                        return true;
                    },
                };
            }
            else {
                throw new Error('Wrong collection');
            }
        }
    });
}

describe('PUSH WORKER', () => {
    describe('GENERAL', () => {
        // it('processOnce works', async() => {
        //     let pool = new Pool('test-x', 't', new CREDS.test(), [data.messages.m1], {
        //         bytes: 100,
        //         workers: 1,
        //     });

        //     let results = await pool.processOnce([data.compilation[0]]);

        //     should.ok(results);
        //     should.ok(results.results);
        //     should.equal(results.results.length, 1);
        //     should.equal(results.results[0], data.compilation[0]._id);
        // }).timeout(5000);

        it('streaming & multiplexing works', done => {

            let total = 200000,
                dbdata = {
                    connection_error: {
                        0: true,
                        5555: true,
                        9999: true
                    },
                    token_invalid: {
                        1: true,
                        7777: true
                    },
                    token_expired: {
                        8888: true,
                        10000: true,
                        10001: true,
                        10002: true
                    },
                    token_changed: {
                        6666: true,
                        15000: true,
                        15001: true,
                        19998: true,
                        19999: true
                    },
                },
                // push_bulk_writes = total +
                //     (-3) + // connection error
                //     3 + // token invalid: unset
                //     3 + // token expired: unset
                //     4, // token changed: set
                db = db_fixture(dbdata, total),
                state = new State(cfg),
                pushes = db.collection('push').find({d: {$lte: this.last}}).sort({d: 1}).stream(),
                connector = new Connector(log, db, state, 100000),
                batcher = new Batcher(log, state, 1000),
                resultor = new Resultor(log, db, state, 100000, () => pushes.readableEnded && batcher.writableEnded),
                flush;

            require('../../../api/utils/common').db = db;

            pushes
                .pipe(connector, {end: false})
                .pipe(batcher, {end: false})
                .pipe(resultor, {end: false});

            pushes.once('close', () => {
                connector.end();
            });
            connector.once('close', () => {
                batcher.end();
            });
            // batcher.once('close', () => {
            //     resultor.end(function() {
            //         resultor.destroy();
            //     });
            // });
            // connector.on('close', () => batcher.closeOnSyn());

            // wait for last stream close
            resultor.once('close', () => {
                this.log.i('close');
                pools.exit();
                should.equal(dbdata.pushDeletes.length, total);
                should.equal(Object.keys(dbdata.bulks).length, 1);
                let bulks = dbdata.bulks[Object.keys(dbdata.bulks)[0]];

                let unsets = [],
                    sets = [],
                    users = [];
                bulks.forEach(update => {
                    if (update.updateOne) {
                        update = update.updateOne;
                        if (update.update.$unset) {
                            unsets.push(update.filter._id);
                        }
                        else if (update.update.$set) {
                            sets.push(update.filter._id);
                        }
                    }
                    else if (update.updateMany) {
                        update = update.updateMany;
                        if (update.update.$unset) {
                            unsets.push(...update.filter._id.$in);
                        }
                        else if (update.update.$set) {
                            users.push(...update.filter._id.$in);
                        }
                    }
                });
                should.equal(unsets.length, 2 + 4);
                should.equal(sets.length, 5);
                should.equal(users.length, total - 3 - 4 - 2); // connection error + expired + invalid
                should.equal(dbdata.messageSaves.length, 2);
                should.equal(dbdata.messageSaves[1].result.errors['Connection error'], 3);
                should.equal(dbdata.messageSaves[1].result.errors['Token expired'], 4);
                should.equal(dbdata.messageSaves[1].result.errors['Token invalid'], 2);
                should.equal(dbdata.messageSaves[1].result.processed, total);
                should.equal(dbdata.messageSaves[1].result.sent, total - 3 - 4 - 2);
                should.equal(dbdata.messageSaves[1].result.subs.t.errors['Connection error'], 3);
                should.equal(dbdata.messageSaves[1].result.subs.t.errors['Token expired'], 4);
                should.equal(dbdata.messageSaves[1].result.subs.t.errors['Token invalid'], 2);
                // connector.synAndDestroy();
                // resultor.destroy();
                // batcher.destroy();
                // connector.destroy();
                done();
            });
            pushes.on('error', err => {
                console.error('Streaming error', err);
                done(err);
            });
            resultor.on('error', err => {
                console.error('Resultor error', err);
                done(err);
            });
            batcher.on('error', err => {
                console.error('Batching error', err);
                done(err);
            });
            connector.on('error', err => {
                console.error('Connector error', err);
                done(err);
            });
            resultor.on('close', () => {
                log.i('close');
            });
        }).timeout(100000);
    });

    // describe('VALIDATE', () => {
    //     it('validate works: ok', async() => {
    //         let pool = new Pool('test-x', 't', new CREDS.test(), [data.messages.m1], Object.assign({}, cfg, {
    //             bytes: 100,
    //             workers: 1,
    //             e_send_recoverable: 'Test error'
    //         }));

    //         await pool.validate().then(ok => {
    //             should.ok(ok);
    //         }, error => {
    //             console.log(error);
    //             should.fail('error is thrown');
    //         });
    //     });

    //     it('validate works: fail', async() => {
    //         let pool = new Pool('test-x', 't', new CREDS.test(), [data.messages.m1], Object.assign({}, cfg, {
    //             bytes: 100,
    //             workers: 1,
    //             e_connect: [ERROR.INVALID_CREDENTIALS, 401, 'Wrong credentials']
    //         }));

    //         await pool.validate().then(ok => {
    //             should.equal(ok, false);
    //         }, error => {
    //             console.log(error);
    //             should.fail('error is thrown');
    //         });
    //     });
    // });

    // describe('ERROR HANDLING', () => {
    //     it('processOnce handles connection errors', async() => {
    //         let pool = new Pool('test-x', 't', new CREDS.test(), [data.messages.m1], Object.assign({}, cfg, {
    //             bytes: 100,
    //             workers: 1,
    //             e_connect: [ERROR.CONNECTION_PROVIDER, 401, 'Wrong credentials']
    //         }));

    //         await pool.processOnce([data.compilation[0]]).then(() => {
    //             should.fail('no ConnectionError error thrown');
    //         }, error => {
    //             should.ok(error instanceof ConnectionError);
    //             should.ok(error.message);
    //             should.ok(error.message.includes('Wrong credentials'));
    //         });
    //     });

    //     it('processOnce handles mid-sending recoverable errors', async() => {
    //         let pool = new Pool('test-x', 't', new CREDS.test(), [data.messages.m1], Object.assign({}, cfg, {
    //             bytes: 100,
    //             workers: 1,
    //             e_send_recoverable: 'Test error'
    //         }));

    //         await pool.processOnce(data.compilation.slice(0, 3)).then(res => {
    //             should.ok(res);
    //             should.ok(res.results);
    //             should.ok(res.errors);
    //             should.equal(res.results.length, 2);
    //             should.equal(res.errors.length, 1);
    //             should.ok(res.errors[0] instanceof SendError);
    //             should.equal(res.errors[0].affected.length, 1);
    //         }, error => {
    //             console.error(error);
    //             should.fail('processOnce rejected');
    //         });
    //     }).timeout(5000);

    //     it('processOnce handles mid-sending non recoverable connection errors with no affected', async() => {
    //         let pool = new Pool('test-x', 't', new CREDS.test(), [data.messages.m1], Object.assign({}, cfg, {
    //             bytes: 100,
    //             workers: 1,
    //             e_send_nonrecoverable: ['Test error', ERROR.CONNECTION_PROVIDER]
    //         }));

    //         await pool.processOnce(data.compilation.slice(0, 5)).then(res => {
    //             should.ok(res);
    //             should.ok(res.results);
    //             should.ok(res.left);
    //             should.ok(res.errors);
    //             should.equal(res.results.length, 3);
    //             should.equal(res.errors.length, 0);
    //             should.equal(res.left.length, 2);
    //             should.equal(res.left[0], data.compilation[3]._id);
    //             should.equal(res.left[1], data.compilation[4]._id);
    //         }, error => {
    //             console.error(error);
    //             should.fail('processOnce rejected');
    //         });
    //     }).timeout(5000);

    //     it('processOnce handles mid-sending non recoverable connection errors with affected', async() => {
    //         let pool = new Pool('test-x', 't', new CREDS.test(), [data.messages.m1], Object.assign({}, cfg, {
    //             bytes: 100,
    //             workers: 1,
    //             e_send_nonrecoverable: ['Test error', ERROR.CONNECTION_PROXY]
    //         }));

    //         await pool.processOnce(data.compilation.slice(0, 5)).then(res => {
    //             should.ok(res);
    //             should.ok(res.results);
    //             should.ok(res.left);
    //             should.ok(res.errors);
    //             should.equal(res.results.length, 2);
    //             should.equal(res.errors.length, 1);
    //             should.equal(res.left.length, 2);
    //             should.equal(res.errors[0].affected[0], data.compilation[2]._id);
    //             should.equal(res.left[0], data.compilation[3]._id);
    //             should.equal(res.left[1], data.compilation[4]._id);
    //         }, error => {
    //             console.error(error);
    //             should.fail('processOnce rejected');
    //         });
    //     }).timeout(5000);
    // });
});