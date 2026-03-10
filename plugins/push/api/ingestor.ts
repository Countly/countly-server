import { onTokenSession } from './api-push.ts';
import platforms from "./constants/platform-keymap.ts";
import { guessThePlatformFromUserAgentHeader } from "./lib/utils.ts";
import { autoOnEvent } from './api-auto.ts';
import { loadKafka, setupProducer } from './lib/kafka.ts';
import { createRequire } from 'module';

// createRequire needed for CJS modules without ES exports
const require = createRequire(import.meta.url);
const common: import('../../../types/common.d.ts').Common = require('../../../api/utils/common.js');
const log = common.log('push:ingestor');
const plugins = common.plugins;
const ALL_PLATFORM_KEYS = Object.keys(platforms);

(async() => {
    try {
        const { kafkaInstance, Partitioners } = await loadKafka();
        await setupProducer(kafkaInstance, Partitioners.DefaultPartitioner);
        log.i("Kafka producer for push notifications set up successfully.");

        plugins.register('/sdk/process_request', async(ob: any) => {
            const params = ob.params;
            const qstring = params?.qstring;
            const appUser = params?.app_user;

            if (qstring?.token_session) {
                onTokenSession(appUser, params);
            }

            if (Array.isArray(qstring?.events)) {
                let events = qstring.events,
                    keys = events.map((e: any) => e.key);
                keys = keys.filter((k: any, i: any) => keys.indexOf(k) === i);

                autoOnEvent(params.app_id, appUser.uid, keys, events);

                let push = events.filter(
                    (e: any) => e.key
                        && e.key.indexOf('[CLY]_push_action') === 0
                        && e.segmentation
                        && e.segmentation.i
                        && e.segmentation.i.length === 24
                );

                if (push.length) {
                    try {
                        let ids = push.map((e: any) => common.db.ObjectID(e.segmentation.i)),
                            msgs = await common.db.collection('messages').find({ _id: { $in: ids } }).toArray(),
                            updates: any = {};
                        for (let i = 0; i < push.length; i++) {
                            let event = push[i],
                                msg = msgs.filter((m: any) => m._id.toString() === event.segmentation.i)[0],
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
                                log.d('Recording push action: [%s] (%s) {%d}, %j', msg._id.toString(), appUser.uid, count, event);
                            }

                            const language = appUser.la;
                            let p = event.segmentation.p,
                                a = msg.triggers.filter((tr: any) => tr.kind === 'cohort' || tr.kind === 'event').length > 0,
                                t = msg.triggers.filter((tr: any) => tr.kind === 'api').length > 0,
                                msgId = msg._id.toString(),
                                upd = updates[msgId];
                            if (upd) {
                                upd.$inc['result.actioned'] += count;
                            }
                            else {
                                upd = updates[msgId] = {$inc: {'result.actioned': count}};
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
                                (mid: any) => common.db
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
