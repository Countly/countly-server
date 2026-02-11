const { onTokenSession } = require('./api-push');
const plugins = require('../../pluginManager');
const platforms = require("./new/constants/platform-keymap.js");
const ALL_PLATFORM_KEYS = Object.keys(platforms);
const { Message, TriggerKind } = require('./send');
const { guessThePlatformFromUserAgentHeader } = require("./new/lib/utils.js");
const { autoOnEvent } = require('./api-auto');
const common = require('../../../api/utils/common');
const log = common.log('push:ingestor');
const { loadKafka, setupProducer } = require('./new/lib/kafka.js');

(async() => {
    try {
        const { kafkaInstance, Partitioners } = await loadKafka();
        await setupProducer(kafkaInstance, Partitioners.DefaultPartitioner);
        log.i("Kafka producer for push notifications set up successfully.");

        plugins.register('/sdk/process_request', async ob => {
            const params = ob.params;
            const qstring = params?.qstring;
            const appUser = params?.app_user;

            if (qstring?.token_session) {
                onTokenSession(appUser, params);
            }

            if (Array.isArray(qstring?.events)) {
                let events = qstring.events,
                    keys = events.map(e => e.key);
                keys = keys.filter((k, i) => keys.indexOf(k) === i);

                autoOnEvent(params.app_id, appUser.uid, keys, events);

                let push = events.filter(
                    e => e.key
                        && e.key.indexOf('[CLY]_push_action') === 0
                        && e.segmentation
                        && e.segmentation.i
                        && e.segmentation.i.length === 24
                );

                if (push.length) {
                    try {
                        let ids = push.map(e => common.db.ObjectID(e.segmentation.i)),
                            msgs = await Message.findMany({ _id: { $in: ids } }),
                            updates = {};
                        for (let i = 0; i < push.length; i++) {
                            let event = push[i],
                                msg = msgs.filter(m => m.id === event.segmentation.i)[0],
                                count = parseInt(event.count, 10);
                            if (!msg || count !== 1) {
                                log.i(
                                    'Invalid segmentation for [CLY]_push_action from %s: %j (msg %s, count %j)',
                                    qstring.device_id,
                                    event.segmentation,
                                    msg ? 'found' : 'not found',
                                    event.segmentation.count
                                );
                                continue;
                            }
                            else {
                                log.d('Recording push action: [%s] (%s) {%d}, %j', msg.id, appUser.uid, count, event);
                            }

                            const language = appUser.la;
                            let p = event.segmentation.p,
                                a = msg.triggers.filter(tr => tr.kind === TriggerKind.Cohort || tr.kind === TriggerKind.Event).length > 0,
                                t = msg.triggers.filter(tr => tr.kind === TriggerKind.API).length > 0,
                                upd = updates[msg.id];
                            if (upd) {
                                upd.$inc['result.actioned'] += count;
                            }
                            else {
                                upd = updates[msg.id] = {$inc: {'result.actioned': count}};
                            }

                            if (!p && params.req.headers['user-agent']) {
                                p = guessThePlatformFromUserAgentHeader(params.req.headers['user-agent']);
                            }

                            event.segmentation.a = a;
                            event.segmentation.t = t;

                            if (p && ALL_PLATFORM_KEYS.indexOf(p) !== -1) {
                                event.segmentation.p = p;
                                event.segmentation.ap = a + p;
                                event.segmentation.tp = t + p;
                                if (upd.$inc[`result.subs.${p}.actioned`]) {
                                    upd.$inc[`result.subs.${p}.actioned`] += count;
                                }
                                else {
                                    upd.$inc[`result.subs.${p}.actioned`] = count;
                                }
                                if (language) {
                                    if (upd.$inc[`result.subs.${p}.subs.${language}.actioned`]) {
                                        upd.$inc[`result.subs.${p}.subs.${language}.actioned`] += count;
                                    }
                                    else {
                                        upd.$inc[`result.subs.${p}.subs.${language}.actioned`] = count;
                                    }
                                }
                            }
                            else {
                                delete event.segmentation.p;
                            }
                        }

                        await Promise.all(
                            Object.keys(updates).map(
                                mid => common.db
                                    .collection('messages')
                                    .updateOne(
                                        { _id: common.db.ObjectID(mid) },
                                        updates[mid]
                                    )
                            )
                        );
                    }
                    catch (e) {
                        log.e('Wrong [CLY]_push_* event i segmentation', e);
                    }
                }
            }
        });
    }
    catch (err) {
        log.e("Error setting up Kafka producer for push notifications:", err);
    }
})();
