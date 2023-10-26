const cluster = require('cluster'),
    common = require('../../utils/common'),
    config = require('../../config'),
    log = common.log('core:runners'),
    metrics = require('./metrics'),

    ERROR_COOLDOWN = config.runners && config.runners.error_cooldown || 60000, // 1min to cooldown on error
    PERIODICITY = config.runners && config.runners.periodicity || 30000, // 1min between "I'm alive" updates
    MAX_LAST_SEEN = config.runners && config.runners.max_last_seen || 600000, // 10min for leader last seen date before considering it dead

    FORCE_UNLOCK = 60 * 60 * 1000, // ms to forcefully unlock runners
    UNLOCK_ATTEMPTS = 100, // how many times to try to unlock before terminating the process

    COLLECTION = 'runners';

let leader, // leader doc
    me,
    collection, // runners collection
    runners = [],
    advertized = false;

/**
 * Initial setup: insert this server document into db
 */
function setup() {
    if (!collection) {
        common.db.createCollection(COLLECTION, (err, col) => {
            if (err) {
                log.d('collection exists');
                collection = common.db.collection(COLLECTION);
                collection.deleteMany({ls: {$lt: Date.now() - 10 * MAX_LAST_SEEN}}, e => {
                    if (e) {
                        collection = undefined;
                        log.e(e);
                        setTimeout(periodic, ERROR_COOLDOWN);
                    }
                    else {
                        log.d('deleted stale records');
                        setImmediate(periodic);
                    }
                });
            }
            else {
                collection = col;
                setImmediate(periodic);
            }
        });
    }
    else if (!me) {
        let doc = {_id: config.runners && config.runners.id || common.db.ObjectID().toString(), ls: Date.now()};
        collection.updateOne({_id: doc._id}, {$set: doc}, {upsert: true}, err => {
            if (err) {
                log.e(err);
                setTimeout(periodic, ERROR_COOLDOWN);
            }
            else {
                me = doc;
                log.d('inserted me', me);
                setImmediate(periodic);
            }
        });
    }
    else {
        setImmediate(periodic);
    }
}

/**
 * Leader discovery & taking leadership
 */
function discoverLeader() {
    if (!leader) {
        log.d('looking for a leader');
        collection.findOne({_id: 'leader', ls: {$gt: Date.now() - MAX_LAST_SEEN}}, (err, doc) => {
            if (err) {
                leader = undefined;
                log.e(err);
                setTimeout(periodic, ERROR_COOLDOWN);
            }
            else if (doc && doc.ls < Date.now() - MAX_LAST_SEEN) {
                log.d('leader is stale', doc);
                collection.findOneAndUpdate({_id: 'leader', ls: doc.ls}, {$set: {runner: me._id, ls: me.ls}, $unset: {lock: 1}}, {returnDocument: 'after'}, (e, ok) => {
                    if (e) {
                        leader = undefined;
                        log.e(e);
                        setTimeout(periodic, ERROR_COOLDOWN);
                    }
                    else if (ok && ok.ok) {
                        if (ok.value) {
                            leader = ok.value;
                            log.d('took leadership from a stale one', leader);
                            setImmediate(periodic);
                        }
                        else {
                            log.d('failed to become a leader');
                            leader = undefined;
                            setImmediate(discoverLeader);
                        }
                    }
                    else {
                        leader = undefined;
                        log.e('not ok from findOneAndUpdate', ok);
                        setTimeout(periodic, ERROR_COOLDOWN);
                    }
                });
            }
            else if (doc) {
                leader = doc;
                log.d('leader is', leader);
                setImmediate(periodic);
            }
            else if (!config.runners || !config.runners.leader || me._id === config.runners.leader) {
                log.d('no leader, becoming one');
                collection.findOneAndUpdate({_id: 'leader'}, {$set: {runner: me._id, ls: me.ls}, $unset: {lock: 1}}, {upsert: true, returnDocument: 'after'}, (e, ok) => {
                    if (e) {
                        leader = undefined;
                        log.e(e);
                        setTimeout(periodic, ERROR_COOLDOWN);
                    }
                    else if (ok && ok.ok) {
                        if (ok.value) {
                            leader = ok.value;
                            log.d('became a leader', leader);
                            setImmediate(periodic);
                        }
                        else {
                            log.d('failed to become a leader');
                            leader = undefined;
                            setImmediate(discoverLeader);
                        }
                    }
                    else {
                        leader = undefined;
                        log.e('not ok from findOneAndUpdate', ok);
                        setTimeout(periodic, ERROR_COOLDOWN);
                    }
                });
            }
            else {
                setTimeout(periodic, PERIODICITY);
            }
        });
    }
    else if (leader.runner !== me._id && leader.ls < Date.now() - MAX_LAST_SEEN && (!config.runners || !config.runners.leader || me._id === config.runners.leader)) {
        log.d('haven\'t seen a leader for %d, taking leadership', MAX_LAST_SEEN);
        collection.findOneAndUpdate({_id: 'leader', runner: leader._id, ls: leader.ls}, {$set: {runner: me._id, ls: me.ls}, $unset: {lock: 1}}, {returnDocument: 'after'}, (e, ok) => {
            if (e) {
                leader = undefined;
                log.e(e);
                setTimeout(periodic, ERROR_COOLDOWN);
            }
            else if (ok && ok.ok) {
                if (ok.value) {
                    leader = ok.value;
                    log.d('took leadership', leader);
                    setImmediate(periodic);
                }
                else {
                    log.d('failed to become a leader');
                    leader = undefined;
                    setImmediate(discoverLeader);
                }
            }
            else {
                leader = undefined;
                log.e('not ok from findOneAndUpdate', ok);
                setTimeout(periodic, ERROR_COOLDOWN);
            }
        });
    }
    else {
        setTimeout(periodic, PERIODICITY);
    }
}

/**
 * Update last seen
 * 
 * @param {function} callback to call when done
 */
function imAlive(callback) {
    log.d('updating ls');
    collection.findOneAndUpdate({_id: me._id}, {$set: {ls: Date.now(), metrics: metrics}}, {returnDocument: 'after'}, (err, doc) => {
        if (err) {
            leader = undefined;
            log.e(err);
            setTimeout(periodic, ERROR_COOLDOWN);
        }
        else if (doc && doc.ok) {
            me = doc.value;
            log.d('updated ls');
            if (leader.runner === me._id) {
                log.d('updating leader ls');
                let update = {ls: me.ls},
                    locking = !leader.lock;
                if (locking) {
                    update.lock = Date.now();
                    log.d('locking leader');
                }
                else if (leader.lock < Date.now() - FORCE_UNLOCK) {
                    update.lock = Date.now();
                    locking = true;
                }
                collection.findOneAndUpdate({_id: 'leader', runner: me._id, ls: leader.ls}, {$set: update}, {returnDocument: 'after'}, (e, ok) => {
                    if (e) {
                        leader = undefined;
                        log.e(e);
                        setTimeout(periodic, ERROR_COOLDOWN);
                    }
                    else if (ok && ok.ok) {
                        if (ok.value) {
                            leader = ok.value;
                            if (locking) {
                                log.d('updated leader ls (%j), calling runners', leader);
                                callback((clb) => {
                                    if (!leader) {
                                        return clb(false);
                                    }
                                    collection.findOneAndUpdate({_id: 'leader', runner: me._id, ls: leader.ls}, {$unset: {lock: 1}}, {returnDocument: 'after'}, (error, ret) => {
                                        if (error) {
                                            clb(false);
                                        }
                                        else if (ret.ok && ret.value) {
                                            leader = ret.value;
                                            log.d('leader unlocked', leader);
                                            clb(true);
                                        }
                                        else {
                                            clb(false);
                                        }
                                    });
                                });
                                setTimeout(periodic, PERIODICITY);
                            }
                            else {
                                log.d('updated leader ls (%j), runners are locked for %dms', leader, Date.now() - leader.lock);
                                setTimeout(periodic, PERIODICITY);
                            }
                        }
                        else {
                            log.e('someone updated leader', leader);
                            leader = undefined;
                            setImmediate(discoverLeader);
                        }
                    }
                    else {
                        leader = undefined;
                        log.e('not ok from imalive leader findOneAndUpdate', ok);
                        setTimeout(periodic, ERROR_COOLDOWN);
                    }
                });
            }
            else {
                collection.findOne({_id: 'leader', ls: {$gt: Date.now() - MAX_LAST_SEEN}}, (e, ld) => {
                    if (e) {
                        leader = undefined;
                        log.e(e);
                        setTimeout(periodic, ERROR_COOLDOWN);
                    }
                    else {
                        leader = ld;
                        setTimeout(periodic, PERIODICITY);
                    }
                });
            }
        }
        else {
            leader = undefined;
            log.e('not ok from imalive findOneAndUpdate', doc);
            setTimeout(periodic, ERROR_COOLDOWN);
        }
    });
}

/**
 * Periodic function to be run each second on each server
 */
function periodic() {
    if (!advertized) {
        advertized = true;
        common.plugins.dispatch('/master/runners', module.exports);
    }
    if (!me) {
        setup();
    }
    else if (!leader) {
        discoverLeader();
    }
    else {
        imAlive((done) => {
            Promise.all(runners.map(runner => {
                try {
                    return runner().catch(e => {
                        log.e('Rejection in runner', e);
                    });
                }
                catch (e) {
                    log.e('Error in runner', e);
                }
            })).catch(e => {
                log.e('Error in runners', e);
            }).then(() => {
                /**
                 * Try to unlock runners, exponentially backing off for 20 attempts and terminating if it fails 20 times in a row
                 * 
                 * @param {integer} attempt number of attempt
                 */
                let trydone = (attempt) => {
                    done(ok => {
                        if (ok) {
                            log.d('Unlocked runners', ok);
                        }
                        else if (attempt < UNLOCK_ATTEMPTS) {
                            setTimeout(trydone.bind(this, attempt + 1), attempt * 1000);
                        }
                        else {
                            log.e(`Failed to unlock runners for ${UNLOCK_ATTEMPTS}-th time, terminating`);
                            process.exit(1);
                        }
                    });
                };
                trydone(0);
            });
        });
    }
}

if (cluster.isMaster) {
    setTimeout(periodic, PERIODICITY);
}
else {
    console.err('Runners can only work in master process');
}

/**
 * Simple lib which allows leader election within a cluster of servers.
 * Designed to process push queue on one server in multi server environment.
 * 
 * Works on MongoDB's findOneAndUpdate on `runners` collection:
 * - On server start assigns a random id to this server.
 * - Deletes stale docs from `runners`.
 * - Then checks `runners` collection for a doc with _id = 'leader'. If a leader with last seen < MAX_LAST_SEEN is found, then the leader is responsible for running the functions.
 * - If there's no such leader, tries to take leadership by modifying that doc with findOneAndUpdate and then runs the functions.
 * - In case a leader dies, waits for MAX_LAST_SEEN and picks new leader automagically.
 * 
 * Apart from automagical mode, one can assign configuration in api/config.js on each server:
 * {
 *   ...
 *   runners: {
 *     id: 'unique server id (optional)',
 *     leader: 'id of the leader'
 *   }
 *   ...
 * }
 *
 * runners collection:
 * {
 *   _id: 'leader'
 *   ls: Date.now(), // last seen date
 *   runner: ObjectID.toString() // id of the doc of last or current leader
 * }
 * {
 *   _id: ObjectID.toString()
 *   ls: Date.now(), // last seen date
 * }
 */
module.exports = {
    /**
     * Add runner function.
     * 
     * IMPORTANT: A runner function must not throw of fail. It WILL be called multiple times at once, ensure you use some locking mechanism to prevent that.
     * 
     * @param {function} runner runner function to add
     * @returns {integer} number of runners registered in the process
     */
    push: runner => {
        runners.push(runner);
        return runners.length;
    },
    /**
     * Remove runner function.
     * 
     * @param {function} runner runner function to remove
     * @returns {boolean|undefined} true if removed, undefined if not found
     */
    pop: runner => {
        let idx = runners.indexOf(runner);
        if (idx !== -1) {
            runners.splice(idx, 1);
            return true;
        }
    },
};



// module.exports.push(() => {
//     if (Math.random() < .33) {
//         console.log('throwing outside');
//         throw new Error('outside');
//     }
//     else if (Math.random() < .66) {
//         console.log('rejecting');
//         return new Promise((res, rej) => setTimeout(() => rej(new Error('wat')), 10000 * Math.random()));
//     }
//     else {
//         console.log('resolving');
//         return new Promise(res => setTimeout(res, 10000 * Math.random()));
//     }
// });