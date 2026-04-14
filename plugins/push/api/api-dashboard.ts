import type { PlatformKey } from "./models/message.ts";
import { isProducerInitialized, verifyKafka } from "./kafka/producer.ts";
import platforms from "./constants/platform-keymap.ts";
import { createRequire } from 'module';
import crypto from 'crypto';
import moment from 'moment-timezone';

// createRequire needed for CJS modules without ES exports
const require = createRequire(import.meta.url);
const common: import('../../../types/common.d.ts').Common = require('../../../api/utils/common.js');
const log = common.log('push:api:dashboard');

const platformKeys = Object.keys(platforms) as PlatformKey[];

function add(from: any, to: any) {
    from.data.forEach((n: any, i: any) => {
        to.data[i] += n;
    });
}

function eventIdFilter(event: string, app_id: string, agy: number, agm: number, noy: number, mts: number[], nom: number): string[] {
    const eventHash = crypto
        .createHash('sha1')
        .update(common.fixEventKey(event) + app_id)
        .digest('hex');
    const prefix = app_id + "_" + eventHash + "_";
    const ids = (seg: string, val: string) => ([
        prefix + seg + '_' + noy + ':' + (nom + 1) + '_' + crypto.createHash('md5').update(val + '').digest('base64')[0],
        prefix + seg + '_' + (nom === 0 ? agy : noy) + ':' + (nom === 0 ? 12 : nom) + '_' + crypto.createHash('md5').update(val + '').digest('base64')[0]
    ]);
    return mts.map((m: number, i: number) => prefix + 'no-segment_' + (agm + i >= 12 ? noy : agy) + ':' + m)
        .concat(platformKeys.map(p => mts.map((m: number, i: number) => prefix + 'p_' + (agm + i >= 12 ? noy : agy) + ':' + m + '_' + crypto.createHash('md5').update(p).digest('base64')[0])).flat())
        .concat(ids('a', 'true'))
        .concat(ids('t', 'true'))
        .concat(platformKeys.map(p => ids('ap', 'true' + p)).flat())
        .concat(platformKeys.map(p => ids('tp', 'true' + p)).flat());
}

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
 * @apiSuccess {Object} sent Sent notifications metrics
 * @apiSuccess {Number} sent.total Total quantity of notifications sent
 * @apiSuccess {Object} sent.weekly Weekly metrics for sent notifications
 * @apiSuccess {String[]} sent.weekly.keys Metrics keys
 * @apiSuccess {Number[]} sent.weekly.data Metrics values
 * @apiSuccess {Object} sent.monthly Monthly metrics for sent notifications
 * @apiSuccess {String[]} sent.monthly.keys Metrics keys
 * @apiSuccess {Number[]} sent.monthly.data Metrics values
 * @apiSuccess {Object} sent.platforms Sent metrics per platform (same structure as in sent: total, weekly, monthly)
 * @apiSuccess {Object} sent_automated Sent notifications metrics for automated messages (same structure as in sent)
 * @apiSuccess {Object} sent_tx Sent notifications metrics for API messages (same structure as in sent)
 * @apiSuccess {Object} actions Actions metrics (same structure as in sent)
 * @apiSuccess {Object} actions_automated Actions metrics for automated messages (same structure as in sent)
 * @apiSuccess {Object} actions_tx Actions metrics for API messages (same structure as in sent)
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

    let not = new Date(),
        mom = moment(not),
        noy = not.getFullYear(),
        nom = not.getMonth(),
        nod = not.getDate(),
        ago = mom.clone().add(-365 * 24 * 3600 * 1000),
        agy = noy - 1,
        agm = nom,
        agd = nod,

        // month numbers (Jan is 1)
        mts = [...Array(13).keys()].map((k, i) => ((agm + i) % 12) + 1),
        // week numbers
        wks: any[] = [...new Set([...Array(common.getDaysInYear(agy)).keys()].map((k: any, i: any) => ago.clone().add(i * 24 * 3600 * 1000).isoWeek()))],

        // month titles for mts
        mtt = mts.map((m, i) => (i === 0 || m > mts[0] ? agy : noy) + ' ' + moment.localeData().monthsShort(moment([0, m - 1]), '')),
        // week titles for wks
        wkt: any[] = wks.map((w: any) => 'W' + w),

        // event docs query
        sentQuery = {
            e: "[CLY]_push_sent",
            _id: { $in: eventIdFilter('[CLY]_push_sent', app_id, agy, agm, noy, mts, nom) }
        },
        actionQuery = {
            e: "[CLY]_push_action",
            _id: { $in: eventIdFilter('[CLY]_push_action', app_id, agy, agm, noy, mts, nom) }
        },

        app = 'app_users' + app_id,

        ptq: any[] = [],
        any_q: any = {$or: []},
        rxp = /([0-9]{4}):([0-9]{1,2})/;

    platformKeys.forEach(p => {
        const filters = platforms[p].combined.map((combined: string) => ({
            ["tk" + combined]: {
                $exists: true
            }
        }));
        ptq.push({ $or: filters });
        any_q.$or.push(...filters);
    });

    if (moment().isoWeek() === wks[0]) {
        wks.push(wks.shift());
        wkt.push(wkt.shift());
    }

    log.d('mts', mts);
    log.d('wks', wks);
    log.d('sentQuery', JSON.stringify(sentQuery));
    log.d('actionQuery', JSON.stringify(actionQuery));
    log.d('ptq', JSON.stringify(ptq));
    log.d('any', JSON.stringify(any_q));

    let results = await Promise.all(
        ptq.map((q: any) => common.dbPromise(app, 'count', q))
            .concat([common.dbPromise(app, 'count', any_q)])
            .concat([
                common.dbPromise("events_data", 'find', sentQuery),
                common.dbPromise("events_data", 'find', actionQuery),
                common.dbPromise(app, 'estimatedDocumentCount'),
            ])
    );

    try {
        let counts = results.splice(0, ptq.length + 1),
            enabled: any = {total: counts[counts.length - 1]};

        platformKeys.forEach((p, i) => {
            enabled[p] = counts[i] || 0;
        });

        let events = results.slice(0, 2).map((events1: any) => {
            let ret: any = {
                    weekly: {data: Array(wks.length).fill(0), keys: wkt},
                    monthly: {data: Array(mts.length).fill(0), keys: mtt},
                    total: 0,
                    platforms: {}
                },
                retAuto: any = {
                    daily: { data: Array(30).fill(0), keys: Array(30).fill(0).map((_x: any, k: any) => k)},
                    total: 0,
                    platforms: {}
                },
                retTx: any = {
                    daily: { data: Array(30).fill(0), keys: Array(30).fill(0).map((_x: any, k: any) => k)},
                    total: 0,
                    platforms: {}
                };

            platformKeys.forEach(p => {
                ret.platforms[p] = {
                    weekly: {data: Array(wks.length).fill(0), keys: wkt},
                    monthly: {data: Array(mts.length).fill(0), keys: mtt},
                    total: 0
                };
                retAuto.platforms[p] = {
                    daily: { data: Array(30).fill(0), keys: Array(30).fill(0).map((_x: any, k: any) => k)},
                    total: 0
                };
                retTx.platforms[p] = {
                    daily: { data: Array(30).fill(0), keys: Array(30).fill(0).map((_x: any, k: any) => k)},
                    total: 0
                };
            });

            events1.forEach((e: any) => {
                var par = e._id.match(rxp),
                    yer = parseInt(par[1], 10),
                    mon = parseInt(par[2], 10) - 1;

                Object.keys(e.d).forEach((d: any) => {
                    d = parseInt(d, 10);
                    if (yer === agy && mon === agm && d < agd) {
                        return;
                    }
                    if (yer === noy && mon === nom && d > nod) {
                        return;
                    }

                    var we = moment(new Date(yer, mon, d)).isoWeek(),
                        wi = wks[yer === agy ? 'indexOf' : 'lastIndexOf'](we),
                        mi = mts[yer === agy ? 'indexOf' : 'lastIndexOf'](mon + 1),
                        date: any, diff: any, target: any;

                    if (e.s === 'no-segment') {
                        ret.weekly.data[wi] += e.d[d].c;
                        ret.monthly.data[mi] += e.d[d].c;
                        ret.total += e.d[d].c;
                    }
                    else {
                        date = moment({ year: yer, month: mon, day: d});
                        diff = moment().diff(date, 'days');
                        if (e.s === 'a' && 'true' in e.d[d]) {
                            if (diff <= 29) {
                                target = 29 - diff;
                                retAuto.daily.data[target] += e.d[d].true.c;
                                retAuto.total += e.d[d].true.c;
                            }

                            ret.weekly.data[wi] -= e.d[d].true.c;
                            ret.monthly.data[mi] -= e.d[d].true.c;
                            ret.total -= e.d[d].true.c;
                        }
                        else if (e.s === 't' && 'true' in e.d[d]) {
                            if (diff <= 29) {
                                target = 29 - diff;
                                retTx.daily.data[target] += e.d[d].true.c;
                                retTx.total += e.d[d].true.c;
                            }

                            ret.weekly.data[wi] -= e.d[d].true.c;
                            ret.monthly.data[mi] -= e.d[d].true.c;
                            ret.total -= e.d[d].true.c;
                        }
                        else if (e.s === 'p') {
                            platformKeys.forEach(p => {
                                if (!e.d[d][p]) {
                                    return;
                                }
                                ret.platforms[p].weekly.data[wi] += e.d[d][p].c;
                                ret.platforms[p].monthly.data[mi] += e.d[d][p].c;
                                ret.platforms[p].total += e.d[d][p].c;
                            });
                        }
                        else if (e.s === 'ap' && diff <= 29) {
                            target = 29 - diff;
                            platformKeys.forEach(p => {
                                let k = 'true' + p;
                                if (!e.d[d][k]) {
                                    return;
                                }
                                retAuto.platforms[p].daily.data[target] += e.d[d][k].c;
                                retAuto.platforms[p].total += e.d[d][k].c;

                                ret.platforms[p].weekly.data[wi] -= e.d[d][k].c;
                                ret.platforms[p].monthly.data[mi] -= e.d[d][k].c;
                                ret.platforms[p].total -= e.d[d][k].c;
                            });
                        }
                        else if (e.s === 'tp' && diff <= 29) {
                            target = 29 - diff;
                            platformKeys.forEach(p => {
                                let k = 'true' + p;
                                if (!e.d[d][k]) {
                                    return;
                                }
                                retTx.platforms[p].daily.data[target] += e.d[d][k].c;
                                retTx.platforms[p].total += e.d[d][k].c;

                                ret.platforms[p].weekly.data[wi] -= e.d[d][k].c;
                                ret.platforms[p].monthly.data[mi] -= e.d[d][k].c;
                                ret.platforms[p].total -= e.d[d][k].c;
                            });
                        }
                    }
                });
            });

            if (ret.platforms.h) {
                add(ret.platforms.h.weekly, ret.platforms.a.weekly);
                add(ret.platforms.h.monthly, ret.platforms.a.monthly);
                add(retAuto.platforms.h.daily, retAuto.platforms.a.daily);
                add(retTx.platforms.h.daily, retTx.platforms.a.daily);
                delete ret.platforms.h;
                delete retAuto.platforms.h;
                delete retTx.platforms.h;
            }
            delete ret.platforms.t;
            delete retAuto.platforms.t;
            delete retTx.platforms.t;

            return {
                m: ret,
                a: retAuto,
                t: retTx
            };
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
            sent: events[0].m,
            sent_automated: events[0].a,
            sent_tx: events[0].t,
            actions: events[1].m,
            actions_automated: events[1].a,
            actions_tx: events[1].t,
            enabled,
            users: results[2] ? results[2] : 0,
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
