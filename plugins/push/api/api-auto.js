const { Audience, TriggerKind, Message, State } = require('./send'),
    plugins = require('../../pluginManager'),
    common = require('../../../api/utils/common'),
    log = common.log('push:api:auto'),
    logCohorts = log.sub('cohorts'),
    logEvents = log.sub('events');

/**
 * Handler function for /cohort/enter (/cohort/exit) hooks
 * 
 * @param {boolean} entry true if it's cohort enter, false for exit
 * @param {object} cohort cohort object
 * @param {string[]} uids uids array
 */
module.exports.autoOnCohort = function(entry, cohort, uids) {
    log.d('processing cohort %s (%s) %s for %d uids', cohort._id, cohort.name, entry ? 'entry' : 'exit', uids.length);

    let now = Date.now(),
        aid = cohort.app_id.toString(),
        // query = {
        //     app: app._id,
        //     state: {$bitsAllSet: State.Streamable, $bitsAllClear: State.Deleted},
        //     triggers: {
        //         $elemMatch: {
        //             kind: TriggerKind.Cohort,
        //             cohorts: cohort._id,
        //             entry,
        //             start: {$lt: now},
        //             $or: [
        //                 {end: {$exists: false}},
        //                 {end: {$gt: now}}
        //             ],
        //         }
        //     },
        // },
        typ = entry ? 'enter' : 'exit';

    plugins.getPluginsApis().push.cache.iterate((k, msg) => {
        if (msg.app.toString() === aid) {
            let trigger = msg.triggerFind(t =>
                    t.kind === TriggerKind.Cohort &&
                    t.cohorts.indexOf(cohort._id) !== -1 &&
                    t.entry === entry &&
                    t.start.getTime() < now &&
                    (!t.end || t.end.getTime() > now)),
                audience = new Audience(logCohorts, msg);

            // adding messages to queue
            if (trigger) {
                logCohorts.d('processing %s %s', typ, msg._id);
                audience.getApp().then(() => {
                    audience.push(trigger).setUIDs(uids).setStart(new Date()).run().then(result => {
                        logCohorts.d('processing %s %s, result: %j', typ, msg._id, result);
                        if (result.total) {
                            return msg.update({$inc: {'result.total': result.total}}, () => {
                                msg.result.total += result.total;
                            });
                        }
                    }).then(() => {
                        logCohorts.d('done processing %s %s', typ, msg._id);
                    }).catch(error => {
                        logCohorts.e('Error while pushing users to cohorted message queue %s %s', typ, msg._id, error);
                    });
                }).catch(error => {
                    logCohorts.e('Failed to load app %s for message %s', aid, msg._id, error);
                });
            }

            // removing messages from queue on reverse trigger
            let triggerOpposite = msg.triggerFind(t =>
                t.kind === TriggerKind.Cohort &&
                t.cohorts.indexOf(cohort._id) !== -1 &&
                t.entry === !entry &&
                t.cancels &&
                t.start.getTime() < now &&
                (!t.end || t.end.getTime() > now));

            if (triggerOpposite) {
                logCohorts.d('processing cancellation %s %s', typ, msg._id);

                audience.getApp().then(() => {
                    audience.pop(triggerOpposite).setUIDs(uids).run().then(result => {
                        logCohorts.d('done processing cancellation %s %s', typ, msg._id, result);
                    }).catch(error => {
                        logCohorts.e('Error while processing cancellation %s %s', typ, msg._id, error);
                    });
                }).catch(error => {
                    logCohorts.e('Failed to load app %s for message %s', aid, msg._id, error);
                });
            }
        }
    });


    // // adding messages to queue
    // let messages = await Message.findMany(query),
    //     next;
    // log.d('processing %s for %d messages', typ, messages.length);

    // for (let i = 0; i < messages.length; i++) {
    //     let msg = messages[i],
    //         audience = new Audience(app, msg);

    //     log.d('processing %s %s', typ, msg._id);

    //     let result = await audience.pushUIDs(uids);
    //     if (result.count) {
    //         await msg.update({$inc: {'result.total': result.count}});
    //         next = next ? Math.min(next, result.next) : result.next;
    //     }
    // }

    // if (next) {
    //     await Audience.resetQueue(result.next);
    // }

    // // removing messages from queue on reverse trigger
    // query.triggers.$elemMatch.entry = !entry;
    // query.triggers.$elemMatch.cancels = true;

    // messages = await Message.findMany(query);
    // log.d('processing cancelling %s for %d messages', typ, messages.length);

    // for (let i = 0; i < messages.length; i++) {
    //     let msg = messages[i],
    //         audience = new Audience(app, msg);

    //     log.d('processing cancelling %s %s', typ, msg._id);

    //     let result = await audience.popUIDs(uids);
    //     if (result.count) {
    //         await msg.update({$inc: {'result.total': -result.count}});
    //     }
    // }

    // log.d('processing cohort %s (%s) %s for %d uids is DONE', cohort._id, cohort.name, entry ? 'entry' : 'exit', uids.length);
};

/**
 * Stop related auto messages or count them on cohort deletion
 * 
 * @param {string} _id cohort id
 * @param {boolean} ack true if stop, false if count
 */
module.exports.autoOnCohortDeletion = async function(_id, ack) {
    if (ack) {
        let msgs = await Message.findMany({'triggers.cohorts': _id, state: {$bitsAnySet: State.Streamable | State.Streaming | State.Paused | State.Scheduling}});
        if (msgs.length) {
            await Promise.all(msgs.map(m => {
                let trigger = m.triggerFind(t => t.kind === TriggerKind.Cohort && t.cohorts.indexOf(_id) !== -1);
                if (trigger) {
                    let audience = new Audience(logCohorts, m);
                    return audience.getApp().then(() => audience.pop(trigger).terminate('Terminated on cohort deletion'));
                }
            }));
        }
    }
    else {
        return await Message.count({'triggers.cohorts': _id, state: {$bitsAnySet: State.Streamable | State.Streaming | State.Paused | State.Scheduling}});
    }

};

/**
 * Handler function for /cohort/enter (/cohort/exit) hooks
 * 
 * @param {ObjectID} appId app id
 * @param {string} uid user uid
 * @param {string[]} keys unique event keys
 * @param {object[]} events event objects
 */
module.exports.autoOnEvent = function(appId, uid, keys, events) {
    let now = Date.now(),
        aid = appId.toString();

    keys = keys.filter((k, i) => keys.indexOf(k) === i);

    logEvents.d('Checking event keys %j', keys);

    plugins.getPluginsApis().push.cache.iterate((k, msg) => {
        logEvents.d('Checking message %s (triggers %j)', k, msg.triggers.map(t => t.kind));
        if (msg.app.toString() === aid) {
            let trigger = msg.triggerFind(t =>
                    t.kind === TriggerKind.Event &&
                    t.events.filter(key => keys.indexOf(key) !== -1).length &&
                    t.start.getTime() < now &&
                    (!t.end || t.end.getTime() > now)),
                event = trigger && events.filter(e => trigger.events.indexOf(e.key) !== -1)[0],
                date;

            if (event && event.timestamp) {
                date = Math.floor(parseInt(event.timestamp));
                if (date > 1000000000) {
                    date = new Date(date);
                }
                else {
                    date = new Date(date * 1000);
                }
            }
            else {
                date = new Date();
            }

            if (trigger) {
                logEvents.d('Pushing %s to %s', uid, k);
                let audience = new Audience(logEvents, msg);
                audience.getApp().then(() => {
                    audience.push(trigger).setUIDs([uid]).setStart(trigger.actuals && date || new Date()).run().catch(e => {
                        logEvents.e('Error while pushing %s to %s on %j', uid, k, keys, e);
                    });
                }).catch(error => {
                    logCohorts.e('Failed to load app %s for message %s', aid, msg._id, error);
                });
            }
            else {
                logEvents.d('Message %s doesn\'t have event trigger', k);
            }
        }
    });
};
