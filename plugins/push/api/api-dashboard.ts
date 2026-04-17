import type { PlatformKey } from "./models/message.ts";
import { isProducerInitialized, verifyKafka } from "./kafka/producer.ts";
import platforms from "./constants/platform-keymap.ts";
import { createRequire } from 'module';

// createRequire needed for CJS modules without ES exports
const require = createRequire(import.meta.url);
const common: import('../../../types/common.d.ts').Common = require('../../../api/utils/common.js');
const log = common.log('push:api:dashboard');

const platformKeys = Object.keys(platforms) as PlatformKey[];

/**
 * Dashboard request handler
 *
 * @api {get} o/push/dashboard Get dashboard data
 * @apiName dashboard
 * @apiDescription Get push notification dashboard data
 * @apiGroup Push Notifications
 *
 * @apiQuery {ObjectID} app_id application id
 *
 * @apiSuccess {Object} enabled Number of push notification - enabled user profiles per platform
 * @apiSuccess {Number} users Total number of user profiles
 * @apiSuccess {Object} platforms Map of platform key to platform title for all supported platforms
 * @apiSuccess {Object} tokens Map of token key to token title for all supported platforms / modes
 *
 * @apiUse PushValidationError
 */
export async function dashboard(params: any) {
    let app_id: any = common.validateArgs(params.qstring, {
        app_id: {type: 'ObjectID', required: true},
    }, true);
    if (app_id.result) {
        app_id = app_id.obj.app_id;
    }
    else {
        common.returnMessage(params, 400, {errors: app_id.errors}, null, true);
        return true;
    }

    const app = 'app_users' + app_id;
    const ptq: any[] = [];
    const any_q: any = {$or: []};

    platformKeys.forEach(p => {
        const filters = platforms[p].combined.map((combined: string) => ({
            ["tk" + combined]: { $exists: true }
        }));
        ptq.push({ $or: filters });
        any_q.$or.push(...filters);
    });

    let results = await Promise.all(
        ptq.map((q: any) => common.dbPromise(app, 'count', q))
            .concat([
                common.dbPromise(app, 'count', any_q),
                common.dbPromise(app, 'estimatedDocumentCount'),
            ])
    );

    try {
        const counts = results.splice(0, ptq.length + 1);
        const enabled: any = { total: counts[counts.length - 1] };

        platformKeys.forEach((p, i) => {
            enabled[p] = counts[i] || 0;
        });

        let isKafkaAvailable = true;
        let errorMessage: string | undefined;
        try {
            verifyKafka();
        }
        catch (error) {
            isKafkaAvailable = false;
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            else {
                errorMessage = 'Unknown error verifying Kafka availability';
                log.e(errorMessage, error);
            }
        }
        if (!isProducerInitialized()) {
            isKafkaAvailable = false;
            errorMessage = 'Kafka producer is not connected';
        }

        common.returnOutput(params, {
            kafkaStatus: {
                available: isKafkaAvailable,
                error: errorMessage
            },
            enabled,
            users: results[0] ? results[0] : 0,
            platforms: Object.fromEntries(
                Object.entries(platforms)
                    .map(([platformKey, { title }]: [string, any]) => [platformKey, title])
            ),
            tokens: Object.fromEntries(Object.entries(platforms).map(
                ([platformKey, { environmentTitles }]: [string, any]) => {
                    return Object.entries(environmentTitles)
                        .map(([envKey, envTitle]: [string, any]) => [`tk${platformKey}${envKey}`, envTitle]);
                }
            ).flat()),
        });
    }
    catch (error: any) {
        log.e(error, error.stack);
        common.returnMessage(params, 500, 'Error: ' + error);
    }
    return true;
}
