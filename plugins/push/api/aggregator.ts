import { autoOnCohort } from './api-auto.ts';
import { loadKafka, setupProducer } from './kafka/producer.ts';
import { createRequire } from 'module';

// createRequire needed for CJS modules without ES exports
const require = createRequire(import.meta.url);
const plugins: import('../../pluginManager.js').IPluginManager = require('../../pluginManager.ts');
const common: import('../../../types/common.d.ts').Common = require('../../../api/utils/common.js');
const { processEvents } = require('../../../api/parts/data/events.js');
const UnifiedEventSource = require('../../../api/eventSource/UnifiedEventSource.js');
const log = common.log('push:aggregator');

const PUSH_EVENT_KEYS = ['[CLY]_push_sent', '[CLY]_push_action'];

interface EventToken {
    cd?: Date;
    resumeToken?: unknown;
}

interface DrillEvent {
    a: string;
    e: string;
    n?: string;
    ts: number;
    c?: number;
    s?: number;
    dur?: number;
    sg?: Record<string, unknown>;
    up?: Record<string, unknown>;
    custom?: Record<string, unknown>;
    [key: string]: unknown;
}

(async() => {
    try {
        const { kafkaInstance, Partitioners } = await loadKafka();
        await setupProducer(kafkaInstance, Partitioners.DefaultPartitioner);
        plugins.register('/cohort/enter', ({cohort, uids}: any) => autoOnCohort(true, cohort, uids));
        plugins.register('/cohort/exit', ({cohort, uids}: any) => autoOnCohort(false, cohort, uids));
        log.i("Kafka producer for push notifications set up successfully.");
    }
    catch (err) {
        log.e("Error setting up Kafka producer for push notifications:", err);
    }
})();

/**
 * Builds the old-style segmentation object for events_data from a drill event's
 * `sg` field. The push dashboard reads these short keys (`i`, `a`, `t`, `p`,
 * `ap`, `tp`) from events_data — they must match what the old
 * `updateInternalsWithResults` produced.
 */
function buildEventsDataSegmentation(sg: Record<string, unknown> | undefined): Record<string, unknown> {
    if (!sg) {
        return {};
    }
    const isAutoTrigger = sg.triggerKind === "cohort" || sg.triggerKind === "event";
    const isApiTrigger = sg.triggerKind === "api";
    const p = sg.platform as string | undefined;
    return {
        i: sg.messageId,
        a: isAutoTrigger,
        t: isApiTrigger,
        ...(p ? {
            p,
            ap: String(isAutoTrigger) + p,
            tp: String(isApiTrigger) + p,
        } : {}),
    };
}

/**
 * Fold [CLY]_push_sent (emitted by resultor) and [CLY]_push_action (emitted by
 * the SDK via the HTTP ingestor) drill rows into aggregated counts under
 * events_data. Uses the core `processEvents` function (api/parts/data/events.ts)
 * so that per-segment breakdown rows and meta documents are created — the same
 * output that the old `processInternalEvents` call produced from the api process.
 */
plugins.register('/aggregator', async function() {
    const eventSource = new UnifiedEventSource('push-events-aggregator', {
        mongo: {
            db: common.drillDb,
            pipeline: [
                { '$match': { 'operationType': 'insert', 'fullDocument.e': { '$in': PUSH_EVENT_KEYS } } },
                { '$project': {
                    '__iid': '$fullDocument._id',
                    'cd': '$fullDocument.cd',
                    'a': '$fullDocument.a',
                    'e': '$fullDocument.e',
                    'n': '$fullDocument.n',
                    'ts': '$fullDocument.ts',
                    'c': '$fullDocument.c',
                    's': '$fullDocument.s',
                    'dur': '$fullDocument.dur',
                    'sg': '$fullDocument.sg',
                } },
            ],
            fallback: {
                pipeline: [
                    { '$match': { 'e': { '$in': PUSH_EVENT_KEYS } } },
                    { '$project': {
                        '__id': '$_id',
                        'cd': '$cd',
                        'a': '$a',
                        'e': '$e',
                        'n': '$n',
                        'ts': '$ts',
                        'c': '$c',
                        's': '$s',
                        'dur': '$dur',
                        'sg': '$sg',
                    } },
                ],
            },
        },
    });

    try {
        await eventSource.processWithAutoAck(async(_token: EventToken, events: DrillEvent[]) => {
            if (!events || !Array.isArray(events)) {
                return;
            }
            const promises: Promise<void>[] = [];
            for (const drillEvent of events) {
                if (!drillEvent || !drillEvent.a || !PUSH_EVENT_KEYS.includes(drillEvent.e)) {
                    continue;
                }
                const appData = await common.readBatcher.getOne('apps', common.db.ObjectID(drillEvent.a), { timezone: 1, plugins: 1 });
                const appTimezone = appData?.timezone || 'UTC';
                const params = {
                    qstring: {
                        events: [{
                            key: drillEvent.e,
                            count: drillEvent.c || 1,
                            timestamp: drillEvent.ts,
                            segmentation: buildEventsDataSegmentation(drillEvent.sg as Record<string, unknown>),
                        }],
                    },
                    app_id: drillEvent.a,
                    app: appData,
                    appTimezone,
                    time: common.initTimeObj(appTimezone, drillEvent.ts),
                };
                promises.push(processEvents(params));
            }
            await Promise.all(promises);
        });
    }
    catch (err) {
        log.e('Push event aggregation error:', err);
    }
});
