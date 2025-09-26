const moment = require('moment-timezone');

const plugins = require('../../pluginManager.js');
const common = require('../../../api/utils/common.js');
const UnifiedEventSource = require('../../../api/eventSource/UnifiedEventSource.js');
const { WriteBatcher } = require('../../../api/parts/data/batcher.js');
const log = require('../../../api/utils/log.js')('crashes:aggregator');

const ranges = ['ram', 'bat', 'disk', 'run', 'session'];
const segments = ['os_version', 'os_name', 'manufacture', 'device', 'resolution', 'app_version', 'cpu', 'opengl', 'orientation', 'view', 'browser'];
const bools = { root: true, online: true, muted: true, signal: true, background: true };

const props = [
    //device metrics
    'os',
    'os_version',
    'manufacture', //may not be provided for ios or be constant, like Apple
    'device', //model for Android, iPhone1,1 etc for iOS
    'resolution',
    'app_version',
    'cpu', //type of cpu used on device (for ios will be based on device)
    'opengl', //version of open gl supported
    'view', //screen, view or page where error happened
    'browser', //browser in which error happened, if applicable

    //state of device
    'ram',
    'ram_current', //in megabytes
    'ram_total',
    'disk',
    'disk_current', //in megabytes
    'disk_total',
    'bat_current', //battery level, probably usually from 0 to 100
    'bat_total', //but for consistency also provide total
    'bat', //or simple value from 0 to 100
    'orientation', //in which device was held, landscape, portrait, etc
    'session',

    //bools
    'root', //true if device is rooted/jailbroken, false or not provided if not
    'online', //true if device is connected to the internet (WiFi or 3G), false or not provided if not connected
    'muted', //true if volume is off, device is in muted state
    'signal', //true if have cell/gsm signal or is not in airplane mode, false when no gsm signal or in airplane mode
    'background', //true if app was in background when it crashed

    //error info
    'name', //optional if provided by OS/Platform, else will use first line of stack
    'type', //optional type of the error
    'error', //error stack
    'nonfatal', //true if handled exception, false or not provided if crash
    'logs', //some additional logs provided, if any
    'run', //running time since app start in seconds

    //build specific fields
    'architecture',
    'app_build',
    'binary_images',
    'build_uuid',
    'executable_name',
    'load_address',
    'native_cpp',
    'javascript',
    'plcrash',
    'binary_crash_dump',
    'unprocessed'
];

const recordCustomMetric = function(params, collection, id, metrics, value, segm, uniques, lastTimestamp, token, localBatcher) {
    value = value || 1;
    const updateUsersZero = {};
    const updateUsersMonth = {};
    const tmpSet = {};

    if (metrics) {
        for (let i = 0; i < metrics.length; i++) {
            common.collectMetric(params, metrics[i], {
                segments: segm,
                value: value,
                unique: (uniques && uniques.indexOf(metrics[i]) !== -1) ? true : false,
                lastTimestamp,
            },
            tmpSet, updateUsersZero, updateUsersMonth);
        }
    }
    const dbDateIds = common.getDateIds(params);

    if (Object.keys(updateUsersZero).length || Object.keys(tmpSet).length) {
        const update = {
            $set: {
                m: dbDateIds.zero,
                a: `${params.app_id}`,
            }
        };
        if (Object.keys(updateUsersZero).length) {
            update.$inc = updateUsersZero;
        }
        if (Object.keys(tmpSet).length) {
            update.$addToSet = {};
            for (let i in tmpSet) {
                update.$addToSet[i] = {$each: tmpSet[i]};
            }
        }
        localBatcher.add(collection, `${id}_${dbDateIds.zero}`, update, 'countly', { token: token });

    }
    if (Object.keys(updateUsersMonth).length) {
        localBatcher.add(collection, `${id}_${dbDateIds.month}`, {
            $set: {
                m: dbDateIds.month,
                a: `${params.app_id}`,
            },
            $inc: updateUsersMonth
        }, 'countly', { token: token });
    }
};

const recalculateStats = async function(currEvent) {
    const avPrev = currEvent.up_extra?.av_prev;
    const avLatest = currEvent.up?.av;
    const isAvNewer = avPrev && avLatest && common.versionCompare(avLatest, avPrev) > 0;

    if (typeof currEvent.up_extra?.hadFatalCrash !== 'undefined' && typeof currEvent.up_extra?.hadNonfatalCrash !== 'undefined' && isAvNewer) {
        const crashuserCollectionName = `app_crashusers${currEvent.a}`;
        const crashgroupCollectionName = `app_crashgroups{currEvent.a}`;

        const crashgroupIds = await common.db.collection(crashuserCollectionName)
            .find({ uid: currEvent.uid, group: { $ne: 0 } }, { group: 1, _id: 0 })
            .toArray();

        let shouldRecalculate = false;
        for (let idx = 0; idx < crashgroupIds.length; idx += 1) {
            const crashgroupId = crashgroupIds[idx];
            const crashgroup = await common.db.collection(crashgroupCollectionName)
                .findOne({ groups: crashgroupId });

            if (crashgroup && crashgroup.is_resolved && crashgroup.resolved_version) {
                if (common.versionCompare(avLatest, crashgroup.resolved_version.replace(/\./g, ":")) > 0) {

                    //update crash stats
                    common.db.collection(crashuserCollectionName).remove({group: crashgroupId, uid: currEvent.uid});
                    common.db.collection(crashgroupCollectionName).update({_id: crashgroupId, users: {$gt: 0} }, {$inc: {users: -1}});
                    const mod = {crashes: -1};
                    if (!crashgroup.nonfatal) {
                        mod.fatal = -1;
                    }

                    const res = common.db.collection(crashuserCollectionName)
                        .findAndModify({group: 0, uid: currEvent.uid}, {}, {$inc: mod}, {upsert: true, new: true});
                    const crashuser = res && res.ok ? res.value : null;
                    if (crashuser && crashuser.crashes <= 0) {
                        common.db.collection(crashuserCollectionName)
                            .remove({group: 0, uid: currEvent.uid});
                    }

                    shouldRecalculate = true;
                }
            }
        }

        if (shouldRecalculate) {
            const userCount = await common.db.collection('app_crashusers' + currEvent.a)
                .count({ group: 0, crashes: { $gt: 0 } });
            const userFatalCount = await common.db.collection('app_crashusers' + currEvent.a)
                .count({ group: 0, crashes: { $gt: 0 }, fatal: { $gt: 0 } });
            await common.db.collection(crashgroupCollectionName)
                .update({ _id: 'meta' }, { $set: { users: userCount, usersFatal: userFatalCount } });
        }
    }
};

(() => {
    plugins.register('/aggregator', async() => {
        const eventSource = new UnifiedEventSource(
            'crash', // Name of the aggregator. Has to be unique for each aggregator.
            {
                //Options for working with mongo changestreams.
                mongo: {
                    db: common.drillDb,
                    //Pipeline is run on changestream.
                    pipeline: [
                        {
                            $match: {
                                operationType: 'insert',
                                'fullDocument.e': { $in: ['[CLY]_crash'] },
                            },
                        },
                        {
                            // Project needed properties from user properties (up) so they are available in document root.
                            $project: {
                                _id: '$fullDocument._id',
                                a: '$fullDocument.a',
                                cd: '$fullDocument.cd',
                                e: '$fullDocument.e',
                                n: '$fullDocument.n',
                                sg: '$fullDocument.sg',
                                ts: '$fullDocument.ts',
                            },
                        },
                    ],
                    fallback: {
                        // If changestreams are not supported or fails, then we fall back to fetching events in batches. Given pipleine gets extended by cd range, You need to only define filters if needed.
                        pipeline: [
                            {
                                $match: {
                                    e: { $in: ['[CLY]_crash'] }
                                },
                            },
                        ],
                    },
                },
            },
        );

        const localWriteBatcher = new WriteBatcher(common.db);

        for await (const { token, events } of eventSource) {
            // events is an array of event, each event has the same structure as drill documents.
            // They will come this way in kafka, the pipeline above should make sure they are the same if coming from changestreams.
            if (events && Array.isArray(events)) {
                for (let idx = 0; idx < events.length; idx += 1) {
                    const currEvent = events[idx];
                    // Kafka will send all events here, so filter out if needed.
                    if (currEvent.e === '[CLY]_crash' && 'a' in currEvent) {
                        common.readBatcher.getOne('apps', common.db.ObjectID(currEvent.a), async(err, app) => {
                            if (err) {
                                log.e('Error getting app data for crash', err);
                                return;
                            }

                            if (app && '_id' in app) {
                                const params = {app_id: currEvent.a, app: app, time: common.initTimeObj(app.timezone, currEvent.ts), appTimezone: (app.timezone || 'UTC')};
                                const platform = currEvent.sg?.os || currEvent.up?.p;
                                const version = currEvent.sg?.app_version?.replace(/\./g, ':') || currEvent.up?.av;

                                const groupSet = {};
                                const groupInsert = {};
                                const groupInc = {};
                                const groupMin = {};
                                const groupMax = {};

                                const metaInc = {};

                                currEvent.sg = currEvent.sg || {};
                                const hash = currEvent.sg.group;

                                groupInsert._id = hash;
                                groupSet.os = platform;
                                groupSet.lastTs = moment(currEvent.ts).unix();

                                if (currEvent.sg.name) {
                                    groupSet.name = ((`${currEvent.sg.name}`).split('\n')[0] + '').trim();
                                }
                                else {
                                    currEvent.sg.error = currEvent.sg.error || '';
                                    groupSet.name = (currEvent.sg.error.split('\n')[0] + '').trim();
                                }

                                groupSet.nonfatal = currEvent.sg.nonfatal === true ? true : false;
                                if (currEvent.sg.not_os_specific) {
                                    groupSet.not_os_specific = true;
                                }

                                if (currEvent.sg.javascript) {
                                    groupSet.javascript = true;
                                }

                                if (currEvent.sg.native_cpp) {
                                    groupSet.native_cpp = true;
                                }

                                if (currEvent.sg.plcrash) {
                                    groupSet.plcrash = true;
                                }

                                groupInc.reports = 1;

                                const set = {
                                    group: hash,
                                    uid: currEvent.uid,
                                    last: currEvent.ts,
                                    sessions: currEvent.up.sc || 0
                                };

                                const user = await common.db.collection('app_crashusers' + params.app_id).findOneAndUpdate({group: hash, 'uid': currEvent.uid}, {$set: set, $inc: {reports: 1}}, {upsert: true, new: false, returnDocument: 'before', returnNewDocument: false});

                                let AllUsersUpdate = {$set: {group: 0, 'uid': currEvent.uid}};
                                if (!user || !user.reports) {
                                    const inc = {crashes: 1};
                                    if (groupSet.nonfatal === false) {
                                        inc.usersfatal = 1;
                                        inc.fatal = 1;
                                    }
                                    AllUsersUpdate.$inc = inc;
                                }
                                if (user && user.sessions && currEvent.up.sc && currEvent.up.sc > user.sessions) {
                                    currEvent.sg.session = currEvent.up.sc - user.sessions;
                                }
                                else {
                                    delete currEvent.sg.session;
                                }
                                if (currEvent.up.sc) {
                                    set.sessions = currEvent.up.sc;
                                }

                                const userAll = await common.db.collection('app_crashusers' + params.app_id).findOneAndUpdate({group: 0, 'uid': currEvent.uid}, AllUsersUpdate, {upsert: true, new: false, returnDocument: 'before', returnNewDocument: false});

                                if ((currEvent.sg.nonfatal === true) && currEvent.up.sc && currEvent.up.sc > 0 && currEvent.up.tp) {
                                    metaInc.loss = currEvent.up.tp / currEvent.up.sc;
                                    groupInc.loss = currEvent.up.tp / currEvent.up.sc;
                                }

                                if (!user || !user.reports) {
                                    groupInc.users = 1;
                                }

                                if (currEvent.sg.nonfatal === false && (!userAll || !userAll.fatal)) {
                                    metaInc.usersfatal = 1;
                                }

                                groupInsert.is_new = true;
                                groupInsert.is_resolved = false;
                                groupInsert.startTs = moment(currEvent.ts).unix();
                                groupInsert.latest_version = currEvent.sg.app_version;
                                groupInsert.latest_version_for_sort = common.transformAppVersion(currEvent.sg.app_version);
                                groupInsert.lrid = `${currEvent._id}`;
                                groupInsert.error = currEvent.sg.error || '';
                                const metrics = [];

                                metaInc.reports = 1;

                                if (currEvent.sg.nonfatal === true) {
                                    metrics.push('crnf');
                                    metrics.push('crunf');
                                    metaInc.nonfatal = 1;
                                }
                                else {
                                    metrics.push('crf');
                                    metrics.push('cruf');
                                    metaInc.fatal = 1;
                                }

                                if (!userAll || !userAll.crashes) {
                                    metaInc.users = 1;
                                }

                                //process segments
                                for (let i = 0; i < props.length; i++) {
                                    // Segment type range
                                    if (ranges.includes(props[i])) {
                                        if (currEvent.sg[props[i] + '_current'] && currEvent.sg[props[i] + '_total']) {
                                            const ratio = ((parseInt(currEvent.sg[props[i] + '_current']) / parseInt(currEvent.sg[props[i] + '_total'])) * 100).toFixed(2);
                                            groupInc[props[i] + '.total'] = parseFloat(ratio);
                                            groupInc[props[i] + '.count'] = 1;
                                            groupMin[props[i] + '.min'] = parseFloat(ratio);
                                            groupMax[props[i] + '.max'] = parseFloat(ratio);
                                        }
                                        else if (typeof currEvent.sg[props[i]] !== 'undefined') {
                                            groupInc[props[i] + '.total'] = parseFloat(currEvent.sg[props[i]]);
                                            groupInc[props[i] + '.count'] = 1;
                                            groupMin[props[i] + '.min'] = parseFloat(currEvent.sg[props[i]]);
                                            groupMax[props[i] + '.max'] = parseFloat(currEvent.sg[props[i]]);
                                        }
                                    }
                                    // Segment type booleans
                                    else if (props[i] in bools) {
                                        let safeKey = 'no';
                                        if (currEvent.sg[props[i]] + '' === 'true') {
                                            safeKey = 'yes';
                                        }

                                        if (groupInc[props[i] + '.' + safeKey]) {
                                            groupInc[props[i] + '.' + safeKey]++;
                                        }
                                        else {
                                            groupInc[props[i] + '.' + safeKey] = 1;
                                        }
                                    }
                                    // Other segment types
                                    else if (props[i] in currEvent.sg && segments.includes(props[i])) {
                                        let safeKey = (currEvent.sg[props[i]] + '').replace(/^\$/, '').replace(/\./g, ':');

                                        if (safeKey) {
                                            if (groupInc[props[i] + '.' + safeKey]) {
                                                groupInc[props[i] + '.' + safeKey]++;
                                            }
                                            else {
                                                groupInc[props[i] + '.' + safeKey] = 1;
                                            }
                                        }
                                    }
                                }

                                //Process custom values
                                if (currEvent.sg) {
                                    for (let key in currEvent.sg) {
                                        if (key.indexOf('custom_') === 0) {
                                            let safeKey = (currEvent.sg[key] + '').replace(/^\$/, '').replace(/\./g, ':');
                                            key = key.replace(/^custom_/, '');
                                            if (safeKey) {
                                                if (groupInc['custom.' + key + '.' + safeKey]) {
                                                    groupInc['custom.' + key + '.' + safeKey]++;
                                                }
                                                else {
                                                    groupInc['custom.' + key + '.' + safeKey] = 1;
                                                }
                                            }
                                        }
                                    }
                                }

                                metaInc['os.' + platform] = 1;
                                metaInc['app_version.' + version] = 1;

                                let update = {};
                                if (Object.keys(groupSet).length > 0) {
                                    update.$set = groupSet;
                                }
                                if (Object.keys(groupInsert).length > 0) {
                                    update.$setOnInsert = groupInsert;
                                }
                                if (Object.keys(groupInc).length > 0) {
                                    update.$inc = groupInc;
                                }
                                if (Object.keys(groupMin).length > 0) {
                                    update.$min = groupMin;
                                }
                                if (Object.keys(groupMax).length > 0) {
                                    update.$max = groupMax;
                                }

                                update.$addToSet = {
                                    groups: hash,
                                    app_version_list: currEvent.sg.app_version,
                                };

                                const crashGroup = await common.db.collection('app_crashgroups' + params.app_id).findOneAndUpdate({'groups': {$elemMatch: {$eq: hash}}}, update, {upsert: true, new: false, returnDocument: 'before', returnNewDocument: false});
                                if (!crashGroup) {
                                    metaInc.isnew = 1;
                                    metaInc.crashes = 1;
                                }
                                let lastTs;

                                if (crashGroup) {
                                    lastTs = crashGroup.lastTs;
                                    if (crashGroup.latest_version !== currEvent.sg.app_version) {
                                        let group = {};
                                        if (crashGroup.latest_version && common.versionCompare(currEvent.sg.app_version.replace(/\./g, ':'), crashGroup.latest_version.replace(/\./g, ':')) > 0) {
                                            group.latest_version = currEvent.sg.app_version;
                                            group.latest_version_for_sort = common.transformAppVersion(currEvent.sg.app_version);
                                        }
                                        if (plugins.getConfig('crashes').same_app_version_crash_update) {
                                            if (crashGroup.latest_version && common.versionCompare(currEvent.sg.app_version.replace(/\./g, ':'), crashGroup.latest_version.replace(/\./g, ':')) >= 0) {
                                                group.error = currEvent.sg.error;
                                                group.lrid = `${currEvent._id}`;
                                            }
                                        }
                                        else {
                                            if (crashGroup.latest_version && common.versionCompare(currEvent.sg.app_version.replace(/\./g, ':'), crashGroup.latest_version.replace(/\./g, ':')) > 0) {
                                                group.error = currEvent.sg.error;
                                                group.lrid = `${currEvent._id}`;
                                            }
                                        }
                                        if (crashGroup.resolved_version && crashGroup.is_resolved && common.versionCompare(currEvent.sg.app_version.replace(/\./g, ':'), crashGroup.resolved_version.replace(/\./g, ':')) > 0) {
                                            group.is_resolved = false;
                                            group.is_renewed = true;
                                        }
                                        if (Object.keys(group).length > 0) {
                                            common.db.collection('app_crashgroups' + params.app_id).updateOne({'groups': {$elemMatch: {$eq: hash}}}, {$set: group}, function() {});
                                        }
                                    }
                                }

                                recordCustomMetric(params, 'crashdata', params.app_id, metrics, 1, null, ['cru', 'crunf', 'cruf'], lastTs, token, localWriteBatcher);
                                recordCustomMetric(params, 'crashdata', platform + '**' + version + '**' + params.app_id, metrics, 1, null, ['cru', 'crunf', 'cruf'], lastTs, token, localWriteBatcher);
                                recordCustomMetric(params, 'crashdata', platform + '**any**' + params.app_id, metrics, 1, null, ['cru', 'crunf', 'cruf'], lastTs, token, localWriteBatcher);
                                recordCustomMetric(params, 'crashdata', 'any**' + version + '**' + params.app_id, metrics, 1, null, ['cru', 'crunf', 'cruf'], lastTs, token, localWriteBatcher);


                                //total numbers
                                localWriteBatcher.add('app_crashgroups' + params.app_id, 'meta', {$inc: metaInc}, 'countly', {token: token});
                            }
                        });
                    }
                }

                // Flush batchers
                await localWriteBatcher.flush('countly', 'crashdata');
            }
        }
    });

    plugins.register('/aggregator', async() => {
        const eventSource = new UnifiedEventSource(
            'crash-session-start', // Name of the aggregator. Has to be unique for each aggregator.
            {
                //Options for working with mongo changestreams.
                mongo: {
                    db: common.drillDb,
                    //Pipeline is run on changestream.
                    pipeline: [
                        {
                            $match: {
                                operationType: 'insert',
                                'fullDocument.e': { $in: ['[CLY]_session_begin'] },
                            },
                        },
                        {
                            // Project needed properties from user properties (up) so they are available in document root.
                            $project: {
                                _id: '$fullDocument._id',
                                a: '$fullDocument.a',
                                cd: '$fullDocument.cd',
                                e: '$fullDocument.e',
                                n: '$fullDocument.n',
                                sg: '$fullDocument.sg',
                                ts: '$fullDocument.ts',
                            },
                        },
                    ],
                    fallback: {
                        // If changestreams are not supported or fails, then we fall back to fetching events in batches. Given pipleine gets extended by cd range, You need to only define filters if needed.
                        pipeline: [
                            {
                                $match: {
                                    e: { $in: ['[CLY]_session_begin'] }
                                },
                            },
                        ],
                    },
                },
            },
        );

        const localWriteBatcher = new WriteBatcher(common.db);

        for await (const { token, events } of eventSource) {
            // events is an array of event, each event has the same structure as drill documents.
            // They will come this way in kafka, the pipeline above should make sure they are the same if coming from changestreams.
            if (events && Array.isArray(events)) {
                for (let idx = 0; idx < events.length; idx += 1) {
                    const currEvent = events[idx];
                    // Kafka will send all events here, so filter out if needed.
                    if (currEvent.e === '[CLY]_session_begin' && 'a' in currEvent) {
                        common.readBatcher.getOne('apps', common.db.ObjectID(currEvent.a), async(err, app) => {
                            if (err) {
                                log.e('Error getting app data for session', err);
                                return;
                            }

                            // record event totals in aggregated data
                            if (app && '_id' in app) {
                                await recalculateStats(currEvent);

                                const params = {
                                    'app_id': currEvent.a,
                                    'app': app,
                                    'time': common.initTimeObj(app.timezone, currEvent.ts),
                                    'appTimezone': (app.timezone || 'UTC'),
                                };

                                const metrics = ['cr_s', 'cr_u'];
                                const platform = currEvent.up?.p;
                                const version = currEvent.up?.av;
                                const lastTs = currEvent.sg?.prev_start || 0;

                                //WE DON"T know platfirm and version from previous session. So it if changes  - new model is not recording that.
                                recordCustomMetric(params, 'crashdata', params.app_id, metrics, 1, null, ['cr_u'], lastTs, token, localWriteBatcher);
                                if (platform && version) {
                                    const ts = platform === currEvent.up_extra?.p_prev && version === currEvent.up_extra?.av_prev ? lastTs : 0;
                                    recordCustomMetric(params, 'crashdata', `${platform}**${version}**${params.app_id}`, metrics, 1, null, ['cr_u'], ts, token, localWriteBatcher);
                                }
                                if (platform) {
                                    const ts = platform === currEvent.up_extra?.p_prev ? lastTs : 0;
                                    recordCustomMetric(params, 'crashdata', `${platform}**any**${params.app_id}`, metrics, 1, null, ['cr_u'], ts, token, localWriteBatcher);
                                }
                                if (version) {
                                    const ts = version === currEvent.up_extra?.av_prev ? lastTs : 0;
                                    recordCustomMetric(params, 'crashdata', `any**${version}**${params.app_id}`, metrics, 1, null, ['cr_u'], ts, token, localWriteBatcher);
                                }
                            }
                        });
                    }
                }

                // Flush batchers
                await localWriteBatcher.flush('countly', 'crashdata');
            }
        }
    });

    plugins.register('/aggregator', async() => {
        const eventSource = new UnifiedEventSource(
            'crash-session-update', // Name of the aggregator. Has to be unique for each aggregator.
            {
                //Options for working with mongo changestreams.
                mongo: {
                    db: common.drillDb,
                    //Pipeline is run on changestream.
                    pipeline: [
                        {
                            $match: {
                                operationType: 'insert',
                                'fullDocument.e': { $in: ['[CLY]_session'] }
                            },
                        },
                        {
                            // Project needed properties from user properties (up) so they are available in document root.
                            $project: {
                                _id: '$fullDocument._id',
                                _uid: '$fullDocument._uid',
                                a: '$fullDocument.a',
                                cd: '$fullDocument.cd',
                                e: '$fullDocument.e',
                                n: '$fullDocument.n',
                                sg: '$fullDocument.sg',
                                ts: '$fullDocument.ts',
                            },
                        },
                    ],
                    fallback: {
                        // If changestreams are not supported or fails, then we fall back to fetching events in batches. Given pipleine gets extended by cd range, You need to only define filters if needed.
                        pipeline: [
                            {
                                $match: {
                                    e: { $in: ['[CLY]_session'] },
                                },
                            },
                        ],
                    },
                },
            },
        );

        const localWriteBatcher = new WriteBatcher(common.db);

        for await (const { token, events } of eventSource) {
            if (events && Array.isArray(events)) {
                for (let idx = 0; idx < events.length; idx += 1) {
                    const currEvent = events[idx];
                    // Kafka will send all events here, so filter out if needed.
                    if (currEvent.e === '[CLY]_session' && 'a' in currEvent) {
                        common.readBatcher.getOne('apps', common.db.ObjectID(currEvent.a), async(appErr, app) => {
                            if (appErr) {
                                log.e('Error getting app data for session update', appErr);
                                return;
                            }

                            if (app && '_id' in app) {
                                await recalculateStats(currEvent);
                                const params = {
                                    app_id: currEvent.a,
                                    app,
                                    time: common.initTimeObj(app.timezone, currEvent.ts),
                                    appTimezone: (app.timezone || 'UTC')
                                };
                                const platform = currEvent.up?.p;
                                const version = currEvent.up_extra?.av_prev || currEvent.up?.av;

                                // check if it is not user's first session
                                if (currEvent.up?.ls) {
                                    const fatalMetrics = [];

                                    if (!currEvent.up_extra?.hadFatalCrash) {
                                        fatalMetrics.push('crfses');
                                        fatalMetrics.push('crauf');
                                    }

                                    if (fatalMetrics.length) {
                                        const ts = currEvent.sg?.prev_start || currEvent.up_extra?.hadAnyFatalCrash || 0;

                                        recordCustomMetric(params, 'crashdata', params.app_id, fatalMetrics, 1, null, ['crauf'], ts, token, localWriteBatcher);
                                        recordCustomMetric(params, 'crashdata', `${platform}**${version}**${params.app_id}`, fatalMetrics, 1, null, ['crauf'], ts, token, localWriteBatcher);
                                        recordCustomMetric(params, 'crashdata', `${platform}**any**${params.app_id}`, fatalMetrics, 1, null, ['crauf'], ts, token, localWriteBatcher);
                                        recordCustomMetric(params, 'crashdata', `any**${version}**${params.app_id}`, fatalMetrics, 1, null, ['crauf'], ts, token, localWriteBatcher);
                                    }

                                    const nonfatalMetrics = [];

                                    if (!currEvent.up_extra?.hadNonfatalCrash) {
                                        nonfatalMetrics.push('craunf');
                                        nonfatalMetrics.push('crnfses');
                                    }

                                    if (nonfatalMetrics.length) {
                                        const ts = currEvent.sg?.prev_start || currEvent.up_extra?.hadAnyNonfatalCrash || 0;

                                        recordCustomMetric(params, 'crashdata', params.app_id, nonfatalMetrics, 1, null, ['craunf'], ts, token, localWriteBatcher);
                                        recordCustomMetric(params, 'crashdata', `${platform}**${version}**${params.app_id}`, nonfatalMetrics, 1, null, ['craunf'], ts, token, localWriteBatcher);
                                        recordCustomMetric(params, 'crashdata', `${platform}**any**${params.app_id}`, nonfatalMetrics, 1, null, ['craunf'], ts, token, localWriteBatcher);
                                        recordCustomMetric(params, 'crashdata', `any**${version}**${params.app_id}`, nonfatalMetrics, 1, null, ['craunf'], ts, token, localWriteBatcher);
                                    }
                                }
                            }
                        });
                    }
                }

                // Flush batchers
                await localWriteBatcher.flush('countly', 'crashdata');
            }
        }
    });
})();
