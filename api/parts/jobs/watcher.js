'use strict';

const log = require('../../utils/log.js')('jobs:watcher'),
    {STATUS} = require('./job.js'),
    plugins = require('../../../plugins/pluginManager.js');

/**
 * Simple class for registering, keeping track of and removal of listeners for job callbacks.
 */
class Notifier {
    /**
     * Constructor
     */
    constructor() {
        this.watchers = {};
    }

    /**
     * Attach a callback to a watch stream.
     * 
     * @param  {String}   name     job name (only beginning of it would also work) or empty string to be notified about all changes
     * @param  {Function} callback callback(job json)
     */
    watch(name, callback) {
        if (!(name in this.watchers)) {
            this.watchers[name] = [];
        }
        this.watchers[name].push(callback);
    }

    /**
     * Internal method for attaching a particular job callback to a watch stream.
     * 
     * @param  {String}   id       job id
     * @param  {Function} callback callback(neo, job json, change)
     */
    _watchId(id, callback) {
        let key = `job:id:${id}`,
            /**
             * Callback
             * @param  {[type]} options.neo    [description]
             * @param  {[type]} options.job    [description]
             * @param  {[type]} options.change [description]
             */
            clb = ({neo, job, change}) => {
                if (job._id.toString() === id.toString()) {
                    let ret = callback({neo, job, change});
                    if (job.status !== STATUS.SCHEDULED && !(job.status & STATUS.RUNNING)) { // not scheduled, not running
                        Promise.resolve(ret).then(r => {
                            if (r === true) {
                                this.unwatch(key, clb);
                            }
                        }).catch(e => {
                            log.e('Error while unwatching', e);
                        });
                    }
                }
            };
        this.watch(key, clb);
    }

    /**
     * Remove a callback from watchers
     * 
     * @param  {String}   name     watch name
     * @param  {Function} callback callback to remove
     * @return {Boolean}           true if removed
     */
    unwatch(name, callback) {
        let idx = (this.watchers[name] || []).indexOf(callback);
        if (idx !== -1) {
            this.watchers[name].splice(idx, 1);
            return true;
        }
    }

    /**
     * Notify all the watchers and plugins about job creation or change.
     * 
     * @param  {Boolean} neo true if job is just created
     * @param  {Object}  job job JSON
     */
    notify({neo, job, change}) {
        let name = job.name,
            namek = 'job:' + name,
            idk = 'job:id:' + job._id;

        Object.keys(this.watchers).forEach(k => {
            if (!k || k === namek || k === idk) {
                let remove = [],
                    promises = this.watchers[k].map(async clb => {
                        try {
                            let ret = await Promise.resolve(clb({neo: neo || false, job, change}));
                            if (ret === true) {
                                remove.push([k, clb]);
                            }
                        }
                        catch (e) {
                            log.e('Error while processing a watcher callback', e);
                            remove.push([k, clb]);
                        }
                    });

                Promise.all(promises).catch(e => {
                    log.e('Error while processing watchers', e);
                }).then(() => {
                    remove.forEach(([kn, clb]) => this.watchers[kn].splice(this.watchers[kn].indexOf(clb), 1));
                });
            }
        });

        plugins.dispatch(namek, {neo, job, change});
    }
}

/**
 * Class responsible for watching `jobs` collection changes and firing callbacks.
 */
class Watcher extends Notifier {

    /**
     * Watcher constructor
     * 
     * @param  {mongodb} db database connection
     */
    constructor(db) {
        super();
        this.db = db;
    }

    /**
     * Start watching jobs collection for changes and broadcast any changes to the watchers.
     */
    async start() {
        log.i('Starting job watcher stream in %d', process.pid);

        if (this.stream) {
            log.w('Stream already started');
            return;
        }

        let [col, last] = await this.createCollection();

        this.stream = col.find({_id: {$gt: last}}, {tailable: true, awaitData: true, noCursorTimeout: true, numberOfRetries: -1}).stream();

        this.stream.on('data', change => {
            log.d('Got data: %j', change);

            this.jobs.findOne({_id: change.id}, (err, job) => {
                if (err || !job) {
                    return log.e('Error while loading job:', err || ('no job ' + change.id));
                }

                try {
                    if (change.u) {
                        change.u = JSON.parse(change.u);
                    }
                }
                catch (e) {
                    log.e('Cannot happen', e);
                }

                this.notify({neo: change.n, job, change: change.u});
            });
        });

        this.stream.on('end', () => {
            log.w('Stream ended');
            this.stop();
        });

        this.stream.on('close', () => {
            log.i('Stream closed');
            this.stream = undefined;
            setImmediate(() => {
                this.start().catch(e => {
                    log.e('Cannot start watcher', e);
                });
            });
        });

        this.stream.on('error', error => {
            log.e('Change stream error', error);
            this.stop();
        });
    }

    /**
     * Create jobs_stream capped collection.
     * 
     * @return {Promise} resolves to array of [collection, _id of last stored record]
     */
    createCollection() {
        return new Promise((resolve, reject) => {
            this.db.onOpened(() => {
                this.jobs = this.db._native.collection('jobs');
                this.db._native.createCollection('jobs_stream', {capped: true, size: 1e7}, (e, col) => {
                    if (e) {
                        log.e('Error while creating jobs_stream:', e);
                        return reject(e);
                    }

                    col.find().sort({_id: -1}).limit(1).toArray((err, arr) => {
                        if (err) {
                            log.e('Error while looking for last record in jobs_stream:', err);
                            return reject(err);
                        }
                        if (arr && arr.length) {
                            log.d('Last change id %s', arr[0]._id);
                            resolve([col, arr[0]._id]);
                        }
                        else {
                            col.insertOne({first: true}, (error, res) => {
                                if (error) {
                                    log.e('Error while looking for last record in jobs_stream:', error);
                                    return reject(e);
                                }
                                log.d('Inserted first change id %s', res.insertedId);
                                resolve([col, res.insertedId]);
                            });
                        }
                    });
                });
            });
        });
    }

    /**
     * Close change stream
     */
    stop() {
        if (this.stream) {
            this.stream.close(e => {
                log.e('Error while closing stream', e);
            });
        }
    }

}

module.exports = {Watcher, Notifier};