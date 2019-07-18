'use strict';

/* jshint ignore:start */

var common = require('../../../../api/utils/common.js'),
    log = common.log('push:endpoints'),
    api = {},
    crypto = require('crypto'),
    C = require('./credentials.js'),
    S = require('./store.js'),
    moment = require('moment-timezone'),
    N = require('./note.js'),
    jobs = require('../../../../api/parts/jobs'),
    plugins = require('../../../pluginManager.js'),
    geoip = require('geoip-lite'),
    momenttz = require('moment-timezone'),
    SEP = '|';

/** catchy(f)
 * @param {function} f - f
 * @returns {function} f
 */
function catchy(f) {
    return (...args) => {
        try {
            let res = f.apply(this, args);
            if (res && res.resolve && res.reject) {
                res.catch(e => {
                    log.e('Rejection %j', e);
                    if (args[0].res && !args[0].res.finished) {
                        common.returnMessage(args[0], 500, e.message || e.toString());
                    }
                });
            }
            return res;
        }
        catch (e) {
            log.e('Error %j', e.stack || e);
            if (args[0].res && !args[0].res.finished) {
                common.returnMessage(args[0], 500, e.message || e.toString());
            }
        }
    };
}

/**
 * map notification to a simplier cached object
 * @param  {Note} note notification
 * @return {Object}      data to cache
 */
function cachedData(note) {
    return {_id: note._id.toString(), apps: note.apps.map(id => id.toString()), autoEvents: note.autoEvents, autoCohorts: note.autoCohorts, actualDates: note.actualDates};
}

(function(/*api*/) {

    api.dashboard = function(params) {
        if (!params.qstring.app_id) {
            common.returnMessage(params, 400, 'Not enough args');
            return false;
        }

        var not = new Date(),
            mom = moment(not),
            noy = not.getFullYear(),
            nom = not.getMonth(),
            nod = not.getDate(),
            // now = mom.isoWeek(),
            ago = mom.clone().add(-365 * 24 * 3600 * 1000),
            agy = noy - 1,
            agm = nom,
            agd = nod,
            // agw = ago.isoWeek(),

            // month numbers (Jan is 1)
            mts = [...Array(13).keys()].map((k, i) => ((agm + i) % 12) + 1),
            // week numbers
            wks = [...new Set([...Array(common.getDaysInYear(agy)).keys()].map((k, i) => ago.clone().add(i * 24 * 3600 * 1000).isoWeek()))],

            // month titles for mts
            mtt = mts.map((m, i) => (i === 0 || m > mts[0] ? agy : noy) + ' ' + moment.localeData().monthsShort(moment([0, m - 1]), '')),
            // week titles for wks
            wkt = wks.map(w => 'W' + w),
            // wkt = wks.map((w, i) => (i === 0 || w > wks[0] ? agy : noy) + '-w' + w),

            // ids of event docs
            suf = '_' + crypto.createHash('md5').update('true').digest('base64')[0],
            ids = mts.map((m, i) => 'no-segment_' + (agm + i >= 12 ? noy : agy) + ':' + m)
                .concat([
                    'a_' + noy + ':' + (nom + 1) + suf, // '_a' is from crypto.createHash('md5').update('false').digest('base64')[0]
                    'a_' + (nom === 0 ? agy : noy) + ':' + (nom === 0 ? 12 : nom) + suf
                ]),
            // mts.reduce((acc, m, i) => {
            //     acc.push('no-segment_' + (agm + i >= 12 ? noy : agy) + ':' + m);
            //     acc.push('a_' + (agm + i >= 12 ? noy : agy) + ':' + m + '_a');   
            //     return acc;
            // }, []),
            que = {_id: {$in: ids}},

            sen = 'events' + crypto.createHash('sha1').update(common.fixEventKey('[CLY]_push_sent') + params.qstring.app_id).digest('hex'),
            act = 'events' + crypto.createHash('sha1').update(common.fixEventKey('[CLY]_push_action') + params.qstring.app_id).digest('hex'),
            app = 'app_users' + params.qstring.app_id,
            geo = 'geos',

            // query on app users to list users with any token
            qtk = {
                $or: [...new Set(Object.keys(C.DB_USER_MAP).map(k => C.DB_USER_MAP[k]).filter(f => ['i', 'a'].indexOf(f.charAt(0)) !== -1))].map(f => {
                    return {[C.DB_USER_MAP.tokens + f]: true};
                })
            },
            // query on geos for this app
            qge = {deleted: {$exists: false}, $or: [{app: common.db.ObjectID(params.qstring.app_id)}, {app: {$exists: false}}]},
            // query on cohorts
            qqh = {app_id: params.qstring.app_id},

            rxp = /([0-9]{4}):([0-9]{1,2})/;

        if (moment().isoWeek() === wks[0]) {
            wks.push(wks.shift());
            wkt.push(wkt.shift());
        }

        // log.d(sen, act);
        // log.d('mts', mts);
        // log.d('wks', wks);
        // log.d('que', que);
        // log.d('qtk', qtk);

        Promise.all([
            common.dbPromise(sen, 'find', que),
            common.dbPromise(act, 'find', que),
            common.dbPromise(app, 'count', qtk),
            common.dbPromise(app, 'count'),
            getCohortsPluginApi() ? common.dbPromise('cohorts', 'find', qqh) : Promise.resolve(),
            getGeoPluginApi() ? common.dbPromise(geo, 'find', qge) : Promise.resolve(),
            getGeoPluginApi() ? new Promise((resolve) => resolve(geoip.lookup(params.ip_address))) : Promise.resolve()
        ]).then(results => {
            try {
                var events = results.slice(0, 2).map(events1 => {
                    var ret = {weekly: {data: Array(wks.length).fill(0), keys: wkt}, monthly: {data: Array(mts.length).fill(0), keys: mtt}, total: 0};
                    var retAuto = { daily: { data: Array(30).fill(0), keys: Array(30).fill(0).map((x, k) => k)}, total: 0 };
                    // log.d('events', events);
                    events1.forEach(e => {
                        // log.d('event', e);
                        var par = e._id.match(rxp),
                            yer = parseInt(par[1]),
                            mon = parseInt(par[2]) - 1;

                        Object.keys(e.d).forEach(d => {
                            d = parseInt(d);
                            if (yer === agy && mon === agm && d < agd) {
                                return;
                            }
                            if (yer === noy && mon === nom && d > nod) {
                                return;
                            }

                            // current week & month numbers are first and last in wks / mts arrays
                            var we = moment(new Date(yer, mon, d)).isoWeek(),
                                wi = wks[yer === agy ? 'indexOf' : 'lastIndexOf'](we),
                                mi = mts[yer === agy ? 'indexOf' : 'lastIndexOf'](mon + 1);

                            if (e.s === 'no-segment') {
                                // log.d('%s / %d: %d', e.s, d, e.d[d].c);
                                ret.weekly.data[wi] += e.d[d].c;
                                ret.monthly.data[mi] += e.d[d].c;
                                ret.total += e.d[d].c;
                            }
                            else if (e.s === 'a' && 'true' in e.d[d]) {
                                // log.d('%s / %d: %d', e.s, d, e.d[d]['true'].c);
                                var date = moment({ year: yer, month: mon, day: d});
                                var diff = moment().diff(date, 'days');

                                if (diff <= 29) {
                                    var target = 29 - diff;
                                    retAuto.daily.data[target] += e.d[d].true.c;
                                    retAuto.total += e.d[d].true.c;
                                }

                                ret.weekly.data[wi] -= e.d[d].true.c;
                                ret.monthly.data[mi] -= e.d[d].true.c;
                                ret.total -= e.d[d].true.c;
                            }
                        });
                    });

                    return {
                        m: ret,
                        a: retAuto
                    };
                });

                common.returnOutput(params, {
                    sent: events[0].m,
                    sent_automated: events[0].a,
                    actions: events[1].m,
                    actions_automated: events[1].a,
                    enabled: results[2] || 0,
                    users: results[3] ? results[3] : 0,
                    cohorts: results[4] || [],
                    geos: results[5] || [],
                    location: results[6] ? results[6].ll || null : null
                });
            }
            catch (error) {
                log.e(error, error.stack);
                common.returnMessage(params, 500, 'Error: ' + error);
            }
        }, error => {
            common.returnMessage(params, 500, 'Error: ' + error);
        });
        return true;
    };

    api.message = function(params) {
        var argProps = {
                '_id': { 'required': true, 'type': 'String', 'min-length': 24, 'max-length': 24 },
                'apps': { 'required': true, 'type': 'Array' },
            },
            args = {};

        if (!(args = common.validateArgs(params.qstring.args, argProps))) {
            log.d('Not enough params to create message: %j', params.qstring.args);
            common.returnMessage(params, 400, 'Not enough args');
            return;
        }

        if (!args.apps.length) {
            common.returnMessage(params, 400, 'Not enough apps');
            return false;
        }

        var not = new Date(),
            noy = not.getFullYear(),
            nom = not.getMonth(),
            // now = mom.isoWeek(),
            agy = noy - 1,
            // agw = ago.isoWeek(),

            // ids of event docs
            suf = '_' + crypto.createHash('md5').update(args._id).digest('base64')[0],
            ids = [
                'i_' + noy + ':' + (nom + 1) + suf, // '_a' is from crypto.createHash('md5').update('false').digest('base64')[0]
                'i_' + (nom === 0 ? agy : noy) + ':' + (nom === 0 ? 12 : nom) + suf
            ],
            que = {_id: {$in: ids}, s: 'i'},
            qms = {_id: common.db.ObjectID(args._id)},

            msg = 'messages',
            sen = args.apps.map(app_id => 'events' + crypto.createHash('sha1').update(common.fixEventKey('[CLY]_push_sent') + app_id).digest('hex')),
            act = args.apps.map(app_id => 'events' + crypto.createHash('sha1').update(common.fixEventKey('[CLY]_push_action') + app_id).digest('hex')),

            rxp = /([0-9]{4}):([0-9]{1,2})/;

        // log.d(sen, act);
        // log.d('mts', mts);
        // log.d('wks', wks);
        // log.d('que', que);
        // log.d('qtk', qtk);

        var promises = [common.dbPromise(msg, 'findOne', qms)]
            .concat(sen.map(sen1 => common.dbPromise(sen1, 'find', que)))
            .concat(act.map(act1 => common.dbPromise(act1, 'find', que)));

        Promise.all(promises).then(catchy(results => {
            if (!results[0]) {
                return common.returnMessage(params, 400, 'Not found');
            }

            var ret = {
                sent: { daily: Array(30).fill(0), total: 0 },
                actions: { daily: Array(30).fill(0), total: 0 }
            };

            results.forEach((events, i) => {
                if (i === 0) {
                    return;
                }

                // console.log(i, events);

                var obj = i - 1 < sen.length ? ret.sent : ret.actions;

                events.forEach(e => {
                    var par = e._id.match(rxp),
                        yer = parseInt(par[1]),
                        mon = parseInt(par[2]) - 1;

                    Object.keys(e.d).forEach(d => {
                        d = parseInt(d);

                        if (!e.d[d][args._id]) {
                            return;
                        }

                        // current week & month numbers are first and last in wks / mts arrays
                        var date = moment({ year: yer, month: mon, day: d});
                        var diff = moment().diff(date, 'days');

                        // console.log(d, diff, e.d[d]);

                        if (diff <= 29) {
                            var target = 29 - diff;
                            obj.daily[target] += e.d[d][args._id].c || 0;
                            obj.total += e.d[d][args._id].c;
                        }
                    });
                });
            });

            results[0].result.events = ret;
            common.returnOutput(params, results[0]);
        }), error => {
            common.returnMessage(params, 500, 'Error: ' + error);
        });
        return true;
    };

    api.setDateParam = (params, name, data) => {
        let v = params.qstring.args[name];
        if (v) {
            if (typeof v === 'string' && (parseInt(v) + '') !== v && isNaN((new Date(v)).getTime())) {
                return 'Only long (ms since Epoch) is supported as date format';
            }

            if ((v + '').length === 10) {
                params.qstring.args[name] *= 1000;
            }

            data[name] = moment.utc(params.qstring.args[name]).toDate();
            return false;
        }
    };

    api.validate = catchy(async(params, skipMpl, skipAppsPlatforms) => {
        var argProps = {
                '_id': { 'required': false, 'type': 'String', 'min-length': 24, 'max-length': 24 },
                'type': { 'required': false, 'type': 'String' },
                'apps': { 'required': false, 'type': 'Array' },
                'platforms': { 'required': false, 'type': 'Array' },
                'messagePerLocale': { 'required': false, 'type': 'Object' },
                'locales': { 'required': false, 'type': 'Array' },
                'userConditions': { 'required': false, 'type': 'Object' },
                'drillConditions': { 'required': false, 'type': 'Object' },
                'geos': { 'required': false, 'type': 'Array' },
                'cohorts': { 'required': false, 'type': 'Array' },
                'delayed': { 'required': false, 'type': 'Boolean' },
                'sound': { 'required': false, 'type': 'String' },
                'badge': { 'required': false, 'type': 'Number' },
                'url': { 'required': false, 'type': 'URL' },
                'buttons': { 'required': false, 'type': 'Number' },
                'media': { 'required': false, 'type': 'URL' },
                'contentAvailable': { 'required': false, 'type': 'Boolean' },
                'newsstandAvailable': { 'required': false, 'type': 'Boolean' },
                'collapseKey': { 'required': false, 'type': 'String' },
                'delayWhileIdle': { 'required': false, 'type': 'Boolean' },
                'data': { 'required': false, 'type': 'Object' },
                'source': { 'required': false, 'type': 'String' },
                'test': { 'required': false, 'type': 'Boolean' },
                'tx': { 'required': false, 'type': 'Boolean' },
                'auto': { 'required': false, 'type': 'Boolean' },
                'autoCohorts': { 'required': false, 'type': 'Array' },
                'autoEvents': { 'required': false, 'type': 'Array' },
                'autoDelay': { 'required': false, 'type': 'Number' },
                'autoTime': { 'required': false, 'type': 'Number' },
                'autoCapMessages': { 'required': false, 'type': 'Number' },
                'autoCapSleep': { 'required': false, 'type': 'Number' },
                'actualDates': { 'required': false, 'type': 'Boolean' },
            },
            data = {};

        if (!(data = common.validateArgs(params.qstring.args, argProps))) {
            log.d('Not enough params to create message: %j', params.qstring.args);
            return [{error: 'Not enough args'}];
        }

        data.autoOnEntry = params.qstring.args.autoOnEntry;

        log.d('validating args %j, data %j', params.qstring.args, data);

        if (!skipAppsPlatforms) {
            if (!skipMpl) {
                if (['message', 'data'].indexOf(data.type) === -1) {
                    return [{error: 'Bad message type'}];
                }
                else if (data.auto && data.tx) {
                    return [{error: 'Message cannot be auto & tx simultaniously'}];
                }
            }

            if (data.source && ['api', 'dash'].indexOf(data.source) === -1) {
                return [{error: 'Invalid message source'}];
            }
            else {
                data.source = data.source || 'api';
            }

            if (!data.platforms || data.platforms.filter(x => Object.values(N.Platform).indexOf(x) === -1).length) {
                return [{error: `Bad message plaform: only ${N.Platform.IOS} (IOS) & ${N.Platform.ANDROID} (ANDROID) are supported`}];
            }

            if (data.type === 'data') {
                if ((!data.data || !Object.keys(data.data).length) && (typeof data.badge === 'undefined' || data.badge === null)) {
                    return [{error: 'Messages of type "data" must have at least "data" or "badge" property'}];
                }

                if (data.sound) {
                    return [{error: 'Messages of type "data" cannot have sound'}];
                }

                delete data.media;
                delete data.url;
                delete data.sound;
                delete data.messagePerLocale;
                data.buttons = 0;
            }
            else {
                if (!skipMpl) {
                    if (!data.messagePerLocale || !data.messagePerLocale.default) {
                        return [{error: 'Messages of type other than "data" must have "messagePerLocale" object with at least "default" key set'}];
                    }
                    else if (data.buttons > 0 && (!data.messagePerLocale['default' + SEP + '0' + SEP + 't'] || !data.messagePerLocale['default' + SEP + '0' + SEP + 'l'])) {
                        return [{error: 'Messages of type other than "data" with 1 button must have "messagePerLocale" object with at least "default|0|t" & "default|0|l" keys set'}];
                    }
                    else if (data.buttons > 1 && (!data.messagePerLocale['default' + SEP + '1' + SEP + 't'] || !data.messagePerLocale['default' + SEP + '1' + SEP + 'l'])) {
                        return [{error: 'Messages of type other than "data" with 2 buttons must have "messagePerLocale" object with at least "default|1|t" & "default|1|l" keys set'}];
                    }
                    else if (data.buttons > 2) {
                        return [{error: 'Maximum 2 buttons supported'}];
                    }
                }
            }
        }

        if ((skipAppsPlatforms && data.messagePerLocale) || (!skipAppsPlatforms && data.type === 'message')) {
            let mpl = {};
            for (var k in data.messagePerLocale) {
                mpl[k.replace(/[[\]]/g, '')] = data.messagePerLocale[k];
            }
            data.messagePerLocale = mpl;
        }

        if (data.tx && (params.qstring.args.date || params.qstring.args.expiryDate)) {
            return [{error: 'Tx messages cannot have date / expiryDate'}];
        }

        if (data.auto && params.qstring.args.expiryDate) {
            return [{error: 'Auto messages cannot have expiryDate'}];
        }

        if (!data.auto && params.qstring.args.autoEnd) {
            return [{error: 'Non-auto messages cannot have end date'}];
        }

        if (api.setDateParam(params, 'date', data)) {
            return [{error: 'Only long (ms since Epoch) is supported as date format'}];
        }
        if (api.setDateParam(params, 'autoEnd', data)) {
            return [{error: 'Only long (ms since Epoch) is supported as autoEnd format'}];
        }
        if (api.setDateParam(params, 'expiryDate', data)) {
            return [{error: 'Only long (ms since Epoch) is supported as expiryDate format'}];
        }

        if (typeof params.qstring.args.tz === 'undefined' || params.qstring.args.tz === false) {
            data.tz = false;
        }
        else if (typeof params.qstring.args.tz !== 'number') {
            return [{error: 'tz must be a number'}];
        }
        else if (!data.date) {
            return [{error: 'tz doesn\'t work without date'}];
        }
        else {
            data.tz = params.qstring.args.tz;
        }

        let [apps, geos, cohorts, prepared, mime, autoCohorts] = await Promise.all([
            skipAppsPlatforms ? Promise.resolve() : common.dbPromise('apps', 'find', {_id: {$in: data.apps.map(common.db.ObjectID)}}).then(apps1 => apps1 || []),
            data.geos && data.geos.length ? common.dbPromise('geos', 'find', {_id: {$in: data.geos.map(common.db.ObjectID)}}) : Promise.resolve(),
            data.cohorts && data.cohorts.length ? common.dbPromise('cohorts', 'find', {_id: {$in: data.cohorts}}) : Promise.resolve(),
            data._id ? N.Note.load(common.db, data._id) : Promise.resolve(),
            data.media && data.type === 'message' ? mimeInfo(data.media) : Promise.resolve(),
            data.auto && data.autoCohorts && data.autoCohorts.length ? common.dbPromise('cohorts', 'find', {_id: {$in: data.autoCohorts}}) : Promise.resolve()
        ]);

        if (skipAppsPlatforms) {
            if (prepared) {
                apps = await common.dbPromise('apps', 'find', {_id: {$in: prepared.apps}}).then(apps1 => apps1 || []);
                data.apps = prepared.apps;
                data.platforms = prepared.platforms;
                data.source = prepared.source;
            }
            else {
                return [{error: 'No such message'}];
            }
        }

        if (!skipAppsPlatforms && apps.length !== data.apps.length) {
            return [{error: 'No such app'}];
        }

        if (data.geos && data.geos.length && (!geos || data.geos.length !== geos.length)) {
            return [{error: 'No such geo'}];
        }

        if (data.cohorts && data.cohorts.length && (!cohorts || data.cohorts.length !== cohorts.length)) {
            return [{error: 'No such cohort'}];
        }

        if (data.auto && data.autoCohorts && data.autoCohorts.length && (!autoCohorts || data.autoCohorts.length !== autoCohorts.length)) {
            return [{error: 'No such cohort'}];
        }

        if (data.media && data.type === 'message' && (!mime || !mime.headers['content-type'])) {
            return [{error: 'Cannot determine MIME type of media attachment'}];
        }

        if (data.auto) {
            if (!skipMpl) {
                if (typeof data.autoOnEntry === 'boolean') {
                    if (!data.autoCohorts || !data.autoCohorts.length) {
                        return [{error: 'Cohorts are required for auto messages'}];
                    }
                    if (!autoCohorts || data.autoCohorts.length !== autoCohorts.length) {
                        return [{error: 'Cohort not found'}];
                    }
                }
                else if (data.autoOnEntry === 'events') {
                    if (!data.autoEvents || !data.autoEvents.length) {
                        return [{error: 'Events are required for auto messages'}];
                    }
                }
                else {
                    return [{error: 'autoOnEntry is required for auto messages'}];
                }
            }
        }

        if (!skipAppsPlatforms && prepared) {
            log.d('found prepared message: %j', prepared);
            if (prepared.apps.map(a => '' + a).filter(id => data.apps.indexOf(id) === -1).length) {
                return [{error: 'Apps changed after preparing message'}];
            }

            if (prepared.platforms.filter(p => data.platforms.indexOf(p) === -1).length) {
                return [{error: 'Platforms changed after preparing message'}];
            }

            if (data.geos && data.geos.length && (prepared.geos.length !== data.geos.length)) {
                return [{error: 'Geo changed after preparing message'}];
            }

            if (data.cohorts && data.cohorts.length && (prepared.cohorts.length !== data.cohorts.length)) {
                return [{error: 'Cohorts changed after preparing message'}];
            }

            if (prepared.test !== data.test) {
                return [{error: 'Test changed after preparing message'}];
            }

            if ((data.userConditions || prepared.userConditions) && JSON.stringify(data.userConditions || {}) !== JSON.stringify(prepared.userConditions || {})) {
                // log.d('Compared data %j to prepared %j', JSON.stringify(data.userConditions || {}), (prepared.userConditions || '{}'));
                return [{error: 'userConditions changed after preparing message'}];
            }

            if ((data.drillConditions || prepared.drillConditions) && JSON.stringify(data.drillConditions || {}) !== JSON.stringify(prepared.drillConditions || {})) {
                return [{error: 'drillConditions changed after preparing message'}];
            }
        }

        let note = new N.Note({
            _id: data._id ? common.db.ObjectID(data._id) : undefined,
            status: N.Status.NotCreated,
            type: data.type,
            source: data.source,
            apps: apps.map(a => a._id),
            appNames: apps.map(a => a.name),
            platforms: data.platforms,
            messagePerLocale: data.messagePerLocale,
            locales: data.locales,
            url: data.url,
            sound: data.sound,
            badge: data.badge,
            buttons: data.buttons,
            media: data.media,
            mediaMime: mime ? mime.headers['content-type'] : undefined,
            contentAvailable: data.contentAvailable,
            collapseKey: data.collapseKey,
            delayWhileIdle: data.delayWhileIdle,
            data: data.data,
            userConditions: data.userConditions && Object.keys(data.userConditions).length ? data.userConditions : undefined,
            drillConditions: data.drillConditions && Object.keys(data.drillConditions).length ? data.drillConditions : undefined,
            geos: geos && geos.length ? data.geos : undefined,
            cohorts: cohorts && cohorts.length ? data.cohorts : undefined,
            delayed: data.delayed,
            test: data.test || false,
            date: data.date || new Date(),
            expiryDate: data.expiryDate,
            tz: data.tz,
            tx: data.tx || false,
            auto: data.auto || false,
            autoOnEntry: data.auto ? data.autoOnEntry : undefined,
            autoCohorts: data.auto && autoCohorts && autoCohorts.length ? autoCohorts.map(c => c._id) : undefined,
            autoEvents: data.auto && data.autoEvents && data.autoEvents.length && data.autoEvents || undefined,
            autoEnd: data.auto ? data.autoEnd : undefined,
            autoDelay: data.auto ? data.autoDelay : undefined,
            autoTime: data.auto ? data.autoTime : undefined,
            autoCapMessages: data.auto ? data.autoCapMessages : undefined,
            autoCapSleep: data.auto ? data.autoCapSleep : undefined,
            actualDates: data.actualDates || false
        });

        return [note, prepared, apps];
    });

    api.prepare = catchy(async(params, dontReturn) => {
        let [note, prepared, apps] = await api.validate(params, true),
            /** return function
             * @param {object} data - data to return
             * @returns {object} returns data if dontReturn==true, else returns output
             */
            ret = (data) => {
                return dontReturn ? data : common.returnOutput(params, data);
            };

        if (note.error) {
            return ret(note);
        }
        else if (note.status & N.Status.Created) {
            return ret({error: 'Already created'});
        }
        else if (prepared) {
            return ret(prepared);
        }

        note._id = new common.db.ObjectID();

        if (note.tx) {
            return ret({error: 'Tx messages shall not be prepared'});
        }
        else {
            note.result.status = N.Status.NotCreated;
        }

        log.i('Saving message to prepare %j', note._id);
        log.d('message data %j', note);

        await note.insert(common.db);

        let sg = new S.StoreGroup(common.db);

        // 
        /**
         * run simple count on app_users:
         * - no accurate build needed (auto, tx & build later cases)
         * - build timeout (return app_users count if aggregation is too slow)
         */
        let countLocales = () => {
            if (!params.res.finished) {
                sg.count(note, apps, true).then(([fields]) => {
                    if (!params.res.finished) {
                        let total = Object.values(fields).reduce((a, b) => a + b, 0);
                        log.i('Returning fast queried audience for %s: %j', note._id, total);
                        note.build = {total: total};
                        ret(note);
                    }
                }, err => {
                    ret({error: err});
                });
            }
        };

        if (note.doesntPrepare) {
            return countLocales();
        }

        let timeout = setTimeout(countLocales, 3000);

        return await sg.count(note, apps).then(async counts => {
            clearTimeout(timeout);

            let [fields, locales] = counts,
                total = Object.values(fields).reduce((a, b) => a + b, 0);

            if (!params.res.finished) {
                if (total === 0) {
                    note.build = {total: total, count: locales};
                    note.result.total = total;
                    log.i('Returning empty audience for %s: %j', note._id, note.build);
                    ret(note);
                }
                else {
                    note.build = {total: total, count: locales};
                    note.result.total = total;
                    log.i('Returning full audience for %s: %j', note._id, note.build);
                    ret(note);
                }
            }

            let update = {$set: {build: note.build}};
            // if (!note.auto && !note.tx) {
            //     update.$set['result.total'] = total;
            // }
            return await note.updateAtomically(common.db, {'result.status': N.Status.NotCreated}, update).then(neo => {
                log.i('Saved full audience for %s: %j', note._id, neo);
                return neo;
            }, err => {
                if (err === 'Not found') {
                    note.updateAtomically(common.db, {'result.status': N.Status.Created}, update).then(() => {
                        log.i('Saved full audience for already created %s', note._id);
                        note.schedule(common.db, jobs);
                    }, err1 => {
                        log.e('Message %s is in unsupported state: %j', note._id, err1);
                    });
                }
                else {
                    log.e('Error when saving full audience for %s: %j', note._id, err);
                }
            });
        }, err => {
            log.e('Error when counting full audience for %s: %j', note._id, err.stack);
        });
    });

    api.create = catchy(async params => {
        let [note, prepared, apps] = await api.validate(params);

        if (note.tx) {
            log.i('Won\'t prepare tx message %j', note);
        }
        else if (!prepared && !params.qstring.args.demo) {
            log.i('No prepared message, preparing');
            let tmp = await api.prepare(params, true);
            log.i('Prepared %j', tmp);
            if (!tmp) {
                return;
            }
            else if (tmp.error) {
                return common.returnOutput(params, tmp);
            }
            params.qstring.args._id = tmp._id.toString();
            [note, prepared, apps] = await api.validate(params);
            log.i('After preparation note %j, prepared %j, returned %j', note, prepared, tmp);
        }

        if (note.error) {
            return common.returnOutput(params, note);
        }
        else if (!adminOfApps(params.member, apps)) {
            return common.returnMessage(params, 403, 'Only app / global admins are allowed to push');
        }
        else if (prepared) {
            if (note.status & N.Status.Created) {
                return common.returnOutput(params, {error: 'Already created'});
            }
            note.build = prepared.build;
            note.result = prepared.result;
        }

        let withCreds = apps.filter(a => {
            return note.platforms.map(p => {
                let id = common.dot(a, `plugins.push.${p}._id`);
                return id && id !== 'demo';
            }).filter(p => !!p).length > 0;
        });

        if (!params.qstring.args.demo && !withCreds.length) {
            return common.returnOutput(params, {error: 'No push credentials'});
        }

        note.result.status = (prepared && prepared.result.status || 0) | N.Status.Created;

        let json = note.toJSON();
        json.creator = json.creator || ('' + params.member._id);

        plugins.dispatch('/i/pushes/validate/create', {params: params, data: json});
        if (params.res.finished) {
            return;
        }

        if (typeof params.qstring.args.demo === 'number') {
            let demo = params.qstring.args.demo;

            json.result.status = N.Status.DONE_SUCCESS;
            await common.dbPromise('messages', 'insertOne', json);

            apps.forEach(app => {
                common.db.collection('apps').updateOne({_id: app._id, 'plugins.push.i._id': {$exists: false}}, {$set: {'plugins.push.i._id': 'demo'}}, () => {});
                common.db.collection('apps').updateOne({_id: app._id, 'plugins.push.a._id': {$exists: false}}, {$set: {'plugins.push.a._id': 'demo'}}, () => {});
            });

            if (json.auto) {
                await new Promise((resolve, reject) => {
                    common.db.collection('app_users' + json.apps[0]).find().count((err, count) => {
                        if (err) {
                            log.e('Error when counting users', err);
                            return reject(err);
                        }

                        let status = N.Status.DONE_SUCCESS | N.Status.Scheduled,
                            total = Math.floor(count * 0.72),
                            processed = total,
                            sent = Math.floor(total * 0.92),
                            actioned = Math.floor(sent * 0.17),
                            errors = 0,
                            offset = momenttz.tz(apps[0].timezone).utcOffset(),
                            now = Date.now() - 3600000;

                        let events = [];

                        let $set = {
                            date: Date.now() - 21 * (24 * 3600000),
                            result: {status, total, processed, sent, errors, actioned, 'actioned|0': 0, 'actioned|1': actioned}
                        };

                        for (let i = 0; i < 19; i++) {
                            let date = now - (i + 1) * (24 * 3600000) - offset,
                                s = Math.floor((Math.random() + 0.5) / (19 - i) * sent),
                                a = Math.floor((Math.random() + 0.5) / (19 - i) * actioned);

                            a = Math.min(a, Math.floor(s * 0.5));

                            sent -= s;
                            actioned -= a;

                            events.push({timestamp: date, key: '[CLY]_push_sent', count: s, segmentation: {i: json._id.toString(), a: true}});
                            events.push({timestamp: date, key: '[CLY]_push_action', count: a, segmentation: {i: json._id.toString(), b: 1, a: true}});
                        }

                        events.push({timestamp: now - 24 * 3600000 - offset, key: '[CLY]_push_sent', count: Math.floor(sent / 3), segmentation: {i: json._id.toString(), a: true}});
                        events.push({timestamp: now - 24 * 3600000 - offset, key: '[CLY]_push_action', count: Math.floor(actioned / 3), segmentation: {i: json._id.toString(), b: 1, a: true}});

                        sent = sent - Math.floor(sent / 3);
                        actioned = Math.min(sent, actioned - Math.floor(actioned / 3));

                        events.push({timestamp: now - offset, key: '[CLY]_push_sent', count: sent, segmentation: {i: json._id.toString(), a: true}});
                        events.push({timestamp: now - offset, key: '[CLY]_push_action', count: actioned, segmentation: {i: json._id.toString(), b: 1, a: true}});

                        require('../../../../api/parts/data/events.js').processEvents({
                            qstring: {events},
                            app_id: apps[0]._id,
                            appTimezone: apps[0].timezone,
                            time: common.initTimeObj(apps[0].timezone)
                        });

                        common.db.collection('messages').updateOne({_id: json._id}, {$set}, e => e ? reject(e) : resolve());
                    });
                });
            }
            else {
                await new Promise((resolve, reject) => {
                    common.db.collection('app_users' + json.apps[0]).find().count((err, count) => {
                        if (err) {
                            log.e('Error when counting users', err);
                            return reject(err);
                        }

                        let status = N.Status.DONE_SUCCESS,
                            total = demo === 1 ? Math.floor(count * 0.92) : Math.floor(Math.floor(count * 0.92) * 0.87),
                            processed = total,
                            sent = demo === 1 ? Math.floor(total * 0.87) : total,
                            actioned = Math.floor(sent * (demo === 1 ? 0.38 : 0.21)),
                            errors = 0,
                            actioned1 = Math.floor(actioned * (demo === 1 ? 0.76 : 0.64)),
                            actioned2 = Math.floor(actioned * (demo === 1 ? 0.21 : 0.37)),
                            actioned0 = actioned - actioned1 - actioned2,
                            events = [];

                        events.push({key: '[CLY]_push_sent', count: sent, segmentation: {i: json._id.toString(), a: false}});
                        events.push({key: '[CLY]_push_action', count: actioned0, segmentation: {i: json._id.toString(), b: 0, a: false}});
                        events.push({key: '[CLY]_push_action', count: actioned1, segmentation: {i: json._id.toString(), b: 1, a: false}});
                        events.push({key: '[CLY]_push_action', count: actioned2, segmentation: {i: json._id.toString(), b: 2, a: false}});

                        require('../../../../api/parts/data/events.js').processEvents({
                            qstring: {events},
                            app_id: apps[0]._id,
                            appTimezone: apps[0].timezone,
                            time: common.initTimeObj(apps[0].timezone)
                        });

                        common.db.collection('messages').updateOne({_id: json._id}, {$set: {result: {status, total, processed, sent, errors, actioned, 'actioned|0': actioned0, 'actioned|1': actioned1, 'actioned|2': actioned2}}}, e => e ? reject(e) : resolve());
                    });
                });
            }

            common.returnOutput(params, json);
        }
        else if (note.auto || note.tx) {
            json.result.status = N.Status.Created;

            delete json.validation_error;
            plugins.dispatch('/i/pushes/validate/schedule', {params: params, data: json});
            if (json.validation_error) {
                log.i('Won\'t activate message %j now because of scheduling validation error %j', json._id, json.validation_error);
            }
            else {
                json.result.status = N.Status.READY;
            }

            await common.dbPromise('messages', prepared ? 'save' : 'insertOne', json);

            api.cache.write(json._id.toString(), cachedData(json)).catch(log.e.bind(log));

            common.returnOutput(params, json);
        }
        else {
            if (!prepared || !prepared.build.total) {
                return common.returnOutput(params, {error: 'No audience'});
            }

            let neo = await note.updateAtomically(common.db, {'result.status': N.Status.NotCreated}, json);
            if (!neo) {
                return common.returnOutput(params, {error: 'Message has already been created'});
            }
            common.returnOutput(params, json);

            delete json.validation_error;
            plugins.dispatch('/i/pushes/validate/schedule', {params: params, data: json});
            if (json.validation_error) {
                log.i('Won\'t schedule message %j now because of scheduling validation error %j', json._id, json.validation_error);
            }
            else {
                await note.schedule(common.db, jobs);
            }
        }

        plugins.dispatch('/systemlogs', {params: params, action: 'push_message_created', data: json});
    });

    api.push = catchy(async params => {
        let [note, prepared, apps] = await api.validate(params, false, true);

        if (!prepared) {
            return common.returnOutput(params, {error: 'No message'});
        }
        else if ((prepared.result.status & N.Status.Scheduled) === 0) {
            return common.returnOutput(params, {error: 'Not scheduled'});
        }
        else if (note.error) {
            return common.returnOutput(params, note);
        }
        else if (!adminOfApps(params.member, apps)) {
            return common.returnMessage(params, 403, 'Only app / global admins are allowed to push');
        }
        else if ((!note.userConditions || !Object.keys(note.userConditions).length) && (!note.drillConditions || !Object.keys(note.drillConditions).length)) {
            return common.returnOutput(params, {error: 'userConditions and/or drillConditions are required'});
        }

        prepared = new N.Note(prepared);
        if (note.userConditions && Object.keys(note.userConditions).length) {
            prepared.userConditions = note.userConditions;
        }
        if (note.drillConditions && Object.keys(note.drillConditions).length) {
            prepared.drillConditions = note.drillConditions;
        }

        let diff = prepared.diff(note);

        log.d('Note %j', note);
        log.d('Prepared %j', prepared);
        log.i('Diff %j', diff);

        let sg = new S.StoreGroup(common.db);
        await sg.ensureIndexes(prepared);

        let result = await sg.pushApps(prepared, null, note.date.getTime(), Object.keys(diff).length ? diff : null);

        log.i('Push results %j', result);

        if (result.total) {
            await prepared.update(common.db, {$inc: {'result.total': result.total}});
        }

        common.returnOutput(params, result);
    });

    api.pop = catchy(async params => {
        let [note, prepared, apps] = await api.validate(params, false, true);

        if (!prepared) {
            return common.returnOutput(params, {error: 'No message'});
        }
        else if (note.error) {
            return common.returnOutput(params, note);
        }
        else if (!adminOfApps(params.member, apps)) {
            return common.returnMessage(params, 403, 'Only app / global admins are allowed to push');
        }
        else if ((!note.userConditions || !Object.keys(note.userConditions).length) && (!note.drillConditions || !Object.keys(note.drillConditions).length)) {
            return common.returnOutput(params, {error: 'userConditions and/or drillConditions are required'});
        }

        prepared = new N.Note(prepared);
        if (note.userConditions && Object.keys(note.userConditions).length) {
            prepared.userConditions = note.userConditions;
        }
        if (note.drillConditions && Object.keys(note.drillConditions).length) {
            prepared.drillConditions = note.drillConditions;
        }

        let diff = prepared.diff(note);

        log.d('Note %j', note);
        log.d('Prepared %j', prepared);
        log.i('Diff %j', diff);

        let sg = new S.StoreGroup(common.db);
        await sg.ensureIndexes(prepared);

        let result = await sg.popApps(prepared);

        log.i('Pop results %j', result);

        if (result.total) {
            await prepared.update(common.db, {$inc: {'result.total': -result.total}});
        }

        common.returnOutput(params, result);
    });

    var geoPlugin, cohortsPlugin;

    /** gets geo plugin api
     * @returns {object} plugins.getPluginsApis().geo or null 
     */
    function getGeoPluginApi() {
        if (geoPlugin === undefined) {
            geoPlugin = plugins.getPluginsApis().geo || null;
        }

        return geoPlugin;
    }

    /** gets cohorts plugin api
     * @returns {object} plugins.getPluginsApis().cohorts or null 
     */
    function getCohortsPluginApi() {
        if (cohortsPlugin === undefined) {
            cohortsPlugin = plugins.getPluginsApis().cohorts || null;
        }

        return cohortsPlugin;
    }

    api.getAllMessages = function(params) {
        var query = {
            'result.status': {$bitsAllSet: N.Status.Created, $bitsAllClear: N.Status.Deleted}
        };

        if (!params.qstring.app_id) {
            common.returnMessage(params, 400, 'Not enough args');
            return false;
        }

        if (!params.member.global_admin) {
            var found = false;

            (params.member.admin_of || []).concat(params.member.user_of || []).forEach(id => {
                if (id === params.qstring.app_id) {
                    found = true;
                }
            });

            if (!found) {
                common.returnMessage(params, 403, 'Forbidden');
                return false;
            }
        }

        query.apps = common.db.ObjectID(params.qstring.app_id);
        query.created = {$ne: null};

        // if(params.qstring.sSearch && params.qstring.sSearch != '){
        //     query[messagePerLocale
        //     //filter['name'] = {'$regex': new RegExp('.*'+params.qstring.sSearch+'.*', 'i')};
        //     filter['$text'] = { '$search': "\""+params.qstring.sSearch+"\"" };
        // }

        if (params.qstring.source) {
            query.source = params.qstring.source;
        }

        if (params.qstring.auto === 'true') {
            query.auto = true;
        }
        else if (params.qstring.tx === 'true') {
            query.tx = true;
        }
        else if (params.qstring.auto === 'false') {
            query.$or = [{auto: {$exists: false}}, {auto: false}];
        }

        log.d('Querying messages: %j', query);

        common.db.collection('messages').find(query).count(function(err, total) {
            if (params.qstring.sSearch) {
                var reg;
                try {
                    reg = new RegExp(params.qstring.sSearch, 'gi');
                }
                catch (ex) {
                    console.log("Incorrect regex: " + params.qstring.sSearch);
                }
                if (reg) {
                    query['messagePerLocale.default'] = {"$regex": reg};
                }
            }

            var cursor = common.db.collection('messages').find(query);

            cursor.count(function(err1, count) {
                if (typeof params.qstring.iDisplayStart !== 'undefined') {
                    cursor.skip(parseInt(params.qstring.iDisplayStart));
                }
                if (typeof params.qstring.iDisplayLength !== 'undefined') {
                    cursor.limit(parseInt(params.qstring.iDisplayLength));
                }
                if (params.qstring.iSortCol_0 && params.qstring.sSortDir_0) {
                    cursor.sort({[params.qstring.iSortCol_0]: params.qstring.sSortDir_0 === 'asc' ? -1 : 1});
                }
                else {
                    cursor.sort({created: -1});
                }
                cursor.toArray(function(err2, items) {
                    // log.d('found', err, items);
                    common.returnOutput(params, {
                        sEcho: params.qstring.sEcho,
                        iTotalRecords: total,
                        iTotalDisplayRecords: count,
                        aaData: items || []
                    }, true);
                });
            });
        });

        /*
         var pageNo = (params.qstring.args && params.qstring.args.page && common.isNumber(params.qstring.args.page))? params.qstring.args.page : 1;

         common.db.collection('messages').find(query).sort({created: -1}).skip((pageNo - 1) * 20).limit(20).toArray(function (err, msgs) {
         */


        // common.db.collection('messages').find(query).sort({created: -1}).toArray(function (err, msgs) {
        //     if (!msgs || err) {
        //         common.returnOutput(params, {});
        //         return false;
        //     }

        //     common.returnOutput(params, packMessages(msgs));
        //     return true;
        // });

        return true;
    };

    api.delete = catchy(async params => {
        var _id = params.qstring._id;

        if (!params.qstring._id) {
            common.returnMessage(params, 400, 'Not enough args');
            return false;
        }

        log.d('going to delete message %j', _id);

        let note = await N.Note.load(common.db, _id),
            sg = new S.StoreGroup(common.db);

        await note.update(common.db, {$bit: {'result.status': {or: N.Status.Deleted}}});
        api.cache.remove(_id);
        note.result.status |= N.Status.Deleted;

        sg.clearNote(note).then(deleted => {
            log.i('Cleared %d scheduled notifications for %s', deleted, note._id);
        }, err => {
            log.w('Error while clearing scheduled notifications for %s: %j', note._id, err.stack || err);
        });

        common.db.collection('jobs').remove({name: 'push:schedule', status: 0, 'data.mid': note._id}, function() {});
        plugins.dispatch('/systemlogs', {params: params, action: 'push_message_deleted', data: note.toJSON()});

        common.returnOutput(params, note.toJSON());
    });

    api.active = async(params) => {
        var _id = params.qstring._id;

        if (!params.qstring._id) {
            common.returnMessage(params, 400, 'Not enough args');
            return false;
        }

        log.d('going to change auto active for message %j', _id);
        common.db.collection('messages').findOne({'_id': common.db.ObjectID(_id)}, function(err, message) {
            if (!message) {
                common.returnMessage(params, 404, 'Message not found');
                return false;
            }

            if (!message.auto) {
                return common.returnMessage(params, 404, 'Message is not automated');
            }

            let preload = message.autoOnEntry === 'events' ? Promise.resolve([]) : new Promise((res, rej) => common.db.collection('cohorts').find({_id: {$in: message.autoCohorts}}).toArray((err3, cohorts) => err3 ? rej(err3) : res(cohorts)));

            preload.then(cohorts => {
                if (message.autoOnEntry !== 'events') {
                    if (cohorts.length !== message.autoCohorts.length) {
                        return common.returnOutput(params, {error: 'Some of message cohorts have been deleted'});
                    }
                }

                if (params.qstring.active === 'true') {
                    console.log(message);
                    delete message.validation_error;
                    plugins.dispatch('/i/pushes/validate/schedule', {params: params, data: message});
                    if (message.validation_error) {
                        log.i('Won\'t activate message %j now because of scheduling validation error %j', message._id, message.validation_error);
                        return common.returnOutput(params, {error: 'Message is not approved'});
                    }
                }

                let update;
                if (params.qstring.active === 'true') {
                    update = {$bit: {'result.status': {or: N.Status.Scheduled, and: ~N.Status.Aborted & ~N.Status.Error}}, $unset: {'result.error': 1}};
                }
                else {
                    update = {$bit: {'result.status': {and: ~N.Status.Scheduled}}};
                }

                common.db.collection('messages').updateOne({_id: message._id}, update, err2 => {
                    if (err2) {
                        log.e(err2.stack);
                        return common.returnMessage(params, 500, 'DB Error');
                    }

                    if (params.qstring.active === 'true') {
                        message.result.status = (message.result.status | N.Status.Scheduled) & ~N.Status.Aborted & ~N.Status.Error;
                        delete message.result.error;
                        plugins.dispatch('/systemlogs', {params: params, action: 'push_message_activated', data: message});

                        api.cache.write(message._id.toString(), cachedData(message));
                    }
                    else {
                        message.result.status = message.result.status & ~N.Status.Scheduled;
                        plugins.dispatch('/systemlogs', {params: params, action: 'push_message_deactivated', data: message});

                        let sg = new S.StoreGroup(common.db);
                        sg.clearNote(new N.Note(message)).then(() => {
                            log.i('Cleared scheduled notifications for %s', message._id);
                        }, err1 => {
                            log.w('Error while clearing scheduled notifications for %s: %j', message._id, err1.stack || err1);
                        });

                        api.cache.remove(message._id.toString());
                    }

                    common.returnOutput(params, message);
                });

            }, err3 => {
                log.e(err3);
                common.returnMessage(params, 500, 'Error when retrieving cohorts');
            });
        });

        return true;
    };


    api.appPluginsUpdate = ({params, app, config}) => {
        log.d('Updating app %s config: %j', app._id, config);
        return new Promise((resolve, reject) => {
            let update = {}, credsToCheck = [], credsToRemove = [];

            if (config[N.Platform.IOS] === null) {
                log.d('Unsetting APN config for app %s', app._id);
                update.$set = Object.assign(update.$set || {}, {['plugins.push.' + N.Platform.IOS]: {}});
                credsToRemove.push(common.db.ObjectID(common.dot(app, `plugins.push.${N.Platform.IOS}._id`)));
            }
            else if (!common.equal(config[N.Platform.IOS], app.plugins && app.plugins.push && app.plugins.push[N.Platform.IOS], true)) {
                let data = config[N.Platform.IOS],
                    mime = data.file.indexOf(';base64,') === -1 ? null : data.file.substring(0, data.file.indexOf(';base64,')),
                    detected;

                if (mime === 'data:application/x-pkcs12' || (mime === 'data:application/octet-stream' && data.fileType === 'p12')) {
                    detected = C.CRED_TYPE[N.Platform.IOS].UNIVERSAL;
                }
                else if (mime === 'data:application/x-pkcs8') {
                    detected = C.CRED_TYPE[N.Platform.IOS].TOKEN;
                }
                else if (mime === 'data:' || (mime === 'data:application/octet-stream' && data.fileType === 'p8')) {
                    var error = C.check_token(data.file.substring(data.file.indexOf(',') + 1), [data.key, data.team, data.bundle].join('[CLY]'));
                    if (error) {
                        return reject('Push: ' + (typeof error === 'string' ? error : error.message || error.code || JSON.stringify(error)));
                    }
                    detected = C.CRED_TYPE[N.Platform.IOS].TOKEN;
                }
                else {
                    return reject('Push: certificate must be in P12 or P8 formats');
                }

                if (data.type && detected !== data.type) {
                    return reject('Push: certificate must be in P12 or P8 formats (bad type value)');
                }
                else {
                    data.type = detected;
                }

                let id = new common.db.ObjectID();
                credsToCheck.push(common.dbPromise('credentials', 'insertOne', {
                    _id: id,
                    type: data.type,
                    platform: N.Platform.IOS,
                    key: data.file.substring(data.file.indexOf(',') + 1),
                    secret: data.type === C.CRED_TYPE[N.Platform.IOS].UNIVERSAL ? data.pass : [data.key, data.team, data.bundle].join('[CLY]')
                }));
                credsToRemove.push(common.db.ObjectID(common.dot(app, `plugins.push.${N.Platform.IOS}._id`)));

                data._id = '' + id;
                log.d('Setting APN config for app %s: %j', app._id, data);
                delete data.file;
                update.$set = Object.assign(update.$set || {}, {['plugins.push.' + N.Platform.IOS]: data});
            }

            if (config[N.Platform.ANDROID] === null) {
                log.d('Unsetting ANDROID config for app %s', app._id);
                update.$set = Object.assign(update.$set || {}, {['plugins.push.' + N.Platform.ANDROID]: {}});
                credsToRemove.push(common.db.ObjectID(common.dot(app, `plugins.push.${N.Platform.ANDROID}._id`)));
            }
            else if (!common.equal(config[N.Platform.ANDROID], app.plugins && app.plugins.push && app.plugins.push[N.Platform.ANDROID], true)) {
                let id = new common.db.ObjectID(),
                    data = config[N.Platform.ANDROID];

                credsToCheck.push(common.dbPromise('credentials', 'insertOne', {
                    _id: id,
                    type: data.type,
                    platform: N.Platform.ANDROID,
                    key: data.key
                }));
                credsToRemove.push(common.db.ObjectID(common.dot(app, `plugins.push.${N.Platform.ANDROID}._id`)));

                data._id = '' + id;
                log.d('Setting ANDROID config for app %s: %j', app._id, data);
                update.$set = Object.assign(update.$set || {}, {['plugins.push.' + N.Platform.ANDROID]: data});
            }

            if (credsToCheck.length) {
                Promise.all(credsToCheck).then(results => {
                    log.d('Done saving credentials for app %s: %j', app._id, results);
                    Promise.all(results.map(mongo => {
                        let credentials = mongo.ops[0];
                        jobs.job('push:clear', {cid: credentials._id}).in(3600);
                        log.d('Checking temporary credentials for app %s: %j', app._id, credentials);
                        return jobs.runTransient('push:validate', {_id: credentials._id, cid: credentials._id, platform: credentials.platform}).then((dt) => {
                            log.d('Check app returned ok: %j', dt);
                        }, (json) => {
                            let err = json && json.error === '3-EOF' ? 'Wrong or expired certificate' : json.error || json;
                            if (err === '1-EOF') {
                                err = 'Invalid credentials';
                            }
                            log.d('Check app returned error %j: %s', json, err);
                            throw err;
                        });
                    })).then(() => {
                        log.d('Done checking temporary credentials for app %s, updating app', app._id);
                        common.dbPromise('apps', 'updateOne', {_id: app._id}, update).then(() => {
                            plugins.dispatch('/systemlogs', {params: params, action: 'plugin_push_config_updated', data: {before: app.plugins ? app.plugins.push : {}, update: update.$set || {}}});
                            common.dbPromise('credentials', 'removeMany', {_id: {$in: credsToRemove}}).then(resolve.bind(null, config), resolve.bind(null, config));
                        }, reject);
                    }, reject);
                }, reject);
            }
            else if (Object.keys(update).length) {
                common.dbPromise('apps', 'updateOne', {_id: app._id}, update).then(() => {
                    plugins.dispatch('/systemlogs', {params: params, action: 'plugin_push_config_updated', data: {before: app.plugins ? app.plugins.push : {}, update: update.$set || {}}});
                    resolve(config);
                }, reject);
            }
            else {
                resolve('Push: nothing to update.');
            }
        });
    };

    // api.download = function(params, id) {
    //  if (!id || (id.length !== 24)) {
    //      return common.returnMessage(params, 400, 'Not enough args');
    //  }

    //  log.i('Downloading credentials %s', id);

    //  common.db.collection('credentials').findOne({_id: common.db.ObjectID(id)}, (err, creds) => {
    //      if (err) {
    //          return common.returnMessage(params, 500, 'DB Error');
    //      }

    //      if (!creds) {
    //          return common.returnMessage(params, 404, 'Not found');
    //      }

    //      log.i('Found credentials %s', creds._id);

    //      common.db.collection('apps').find({$or: [{'plugins.push.i._id': id}, {'plugins.push.a._id': id}]}).toArray((err, apps) => {
    //          if (err) {
    //              return common.returnMessage(params, 500, 'DB Error');
    //          }

    //          if (!apps || !apps.length) {
    //              return common.returnMessage(params, 404, 'Apps not found');
    //          }

    //          if (!adminOfApps(params.member, apps)) {
    //              return common.returnMessage(params, 403, 'Not authorized to download');
    //          }

    //          let mime = creds.type === C.CRED_TYPE[N.Platform.IOS].UNIVERSAL ? 'data:application/x-pkcs12' : 'data:application/x-pkcs8',
    //              name = apps[0].name + (creds.type === C.CRED_TYPE[N.Platform.IOS].UNIVERSAL ? '.p12' : '.p8'),
    //              buf = Buffer.from(creds.key, 'base64');

    //          log.i('Returning credentials %s of type %s', creds._id, mime);

    //          params.res.writeHead(200, {
    //              'Content-Type': mime,
    //              'Content-disposition': 'attachment;filename=' + name,
    //              'Content-Length': buf.length
    //          });
    //          params.res.end(buf); 
    //      });

    //  });
    // };

    api.onCohort = function(entered, cohort, uids) {
        log.d('[auto] ================================= Processing cohort %j %s for %d users =======================================', cohort._id, entered ? 'enter' : 'exit', uids ? uids.length : 0);
        return new Promise((resolve, reject) => {
            common.db.collection('apps').findOne({_id: common.db.ObjectID(cohort.app_id)}, (err, app) => {
                if (err) {
                    log.e('[auto] Error while loading app for automated push: %j', err);
                    reject(err);
                }
                else {
                    if (common.dot(app, `plugins.push.${N.Platform.IOS}._id`) || common.dot(app, `plugins.push.${N.Platform.ANDROID}._id`)) {
                        let now = new Date(), query = {
                            apps: app._id,
                            auto: true,
                            autoCohorts: cohort._id,
                            autoOnEntry: entered,
                            date: {$lt: now},
                            $or: [
                                {autoEnd: {$exists: false}},
                                {autoEnd: {$gt: now}}
                            ],
                            'result.status': {$bitsAllSet: N.Status.Scheduled, $bitsAllClear: N.Status.Deleted | N.Status.Aborted}
                            // 'result.status': {$in: [N.Status.InProcessing, N.Status.Done]}
                        };
                        common.db.collection('messages').find(query).toArray((err2, msgs) => {
                            if (err2) {
                                log.e('[auto] Error while loading messages: %j', err2);
                                reject(err2);
                            }
                            else if (!msgs || !msgs.length) {
                                log.d('[auto] Won\'t process - no messages');
                                resolve(0);
                            }
                            else {
                                Promise.all(msgs.map(async msg => {
                                    log.d('[auto] Processing message %j', msg);
                                    let sg = new S.StoreGroup(common.db),
                                        note = new N.Note(msg),
                                        count = await sg.pushUids(note, app, uids);
                                    if (count) {
                                        await note.update(common.db, {$inc: {'result.total': count.total}});
                                    }
                                    return count;
                                })).then(results => {
                                    log.i('[auto] Finished processing cohort %j with results %j', cohort._id, results);
                                    resolve((results || []).map(r => r.total).reduce((a, b) => a + b, 0));
                                }, err1 => {
                                    log.i('[auto] Finished processing cohort %j with error %j / %j', cohort._id, err1, err1.stack);
                                    reject(err);
                                });
                            }
                        });
                    }
                    else {
                        log.d('[auto] Won\'t process - no push credentials in app');
                        resolve(0);
                    }
                }
            });
        });
    };

    api.onEvent = function(app_id, uid, key, date, msg) {
        log.d('[auto] Processing event %j @ %s for user %s', key, new Date(date), uid);
        return new Promise((resolve, reject) => {
            common.db.collection('apps').findOne({_id: typeof app_id === 'string' ? common.db.ObjectID(app_id) : app_id}, (err, app) => {
                if (err) {
                    log.e('[auto] Error while loading app for automated push: %j', err);
                    reject(err);
                }
                else {
                    if (common.dot(app, `plugins.push.${N.Platform.IOS}._id`) || common.dot(app, `plugins.push.${N.Platform.ANDROID}._id`)) {
                        log.d('[auto] Processing message %s', msg._id);
                        let sg = new S.StoreGroup(common.db),
                            note = new N.Note(msg);

                        sg.pushUids(note, app, [uid], date || Date.now()).then(count => {
                            if (count) {
                                note.update(common.db, {$inc: {'result.total': count.total}});
                                resolve(count.total || 0);
                            }
                            else {
                                resolve(0);
                            }
                        }, reject);
                    }
                    else {
                        log.d('[auto] Won\'t process - no push credentials in app');
                        resolve(0);
                    }
                }
            });
        });
    };

    api.onCohortDelete = (_id, app_id, ack) => {
        return new Promise((resolve, reject) => {
            if (ack) {
                common.dbPromise('messages', 'update', {auto: true, 'result.status': {$bitsAllSet: N.Status.Scheduled}, autoCohorts: _id}, {$bit: {'result.status': {and: ~N.Status.Scheduled}}}).then(() => resolve(ack), reject);
            }
            else {
                common.db.collection('messages').find({auto: true, 'result.status': {$bitsAllSet: N.Status.Scheduled}, autoCohorts: _id}).count((err, count) => {
                    if (err) {
                        log.e('[auto] Error while loading messages: %j', err);
                        reject(err);
                    }
                    else {
                        resolve(count || 0);
                    }
                });
            }
        });
    };

    api.onConsentChange = (params, changes) => {
        if (changes.push === false) {
            let update = {$unset: {}};
            Object.values(C.DB_USER_MAP).map(v => {
                if (v === 'tk') {
                    return undefined;
                }
                else if (v === 'msgs') {
                    return undefined;
                }
                else {
                    common.db.collection(`push_${params.app_id}_${v}`).removeMany({uid: params.app_user.uid}, function() {});
                    delete params.app_user['tk' + v];
                    return 'tk' + v;
                }
            }).filter(v => !!v).forEach(v => update.$unset[v] = 1);
            common.db.collection('app_users' + params.app_id).updateOne({_id: params.app_user_id}, update, () => {});
            common.db.collection('push_' + params.app_id).updateOne({'_id': params.app_user.uid}, {$unset: {tk: 1}}, function() {});
        }
    };

    /** mimeInfo
     * @param {string} url - url to get info from
     * @returns {promise} - reloved:{status:status, headers,headers}, rejected - [errorcode, errormessage]
     */
    function mimeInfo(url) {
        return new Promise((resolve, reject) => {
            if (url) {
                log.d('Retrieving URL', url);
                var parsed = require('url').parse(url);

                parsed.method = 'HEAD';
                log.d('Parsed', parsed);

                let req = require(parsed.protocol === 'http:' ? 'http' : 'https').request(parsed, (res) => {
                    resolve({status: res.statusCode, headers: res.headers});
                });
                req.on('error', (err) => {
                    log.e('error when HEADing ' + url, err);
                    reject([400, 'Cannot access URL']);
                });
                req.end();
            }
            else {
                reject([400, 'No url']);
            }
        });
    }

    api.mimeInfo = function(params) {
        mimeInfo(params.qstring.url).then(resp => {
            common.returnOutput(params, resp);
        }, err => {
            common.returnMessage(params, err[0], err[1]);
        });
        return true;
    };

    api.processTokenSession = function(dbAppUser, params) {
        var token, field, bool;
        if (typeof params.qstring.ios_token !== 'undefined' && typeof params.qstring.test_mode !== 'undefined') {
            token = params.qstring.ios_token;
            field = common.dbUserMap.tokens + '.' + common.dbUserMap['apn_' + params.qstring.test_mode];
            bool = common.dbUserMap.tokens + common.dbUserMap['apn_' + params.qstring.test_mode];
        }
        else if (typeof params.qstring.android_token !== 'undefined' && typeof params.qstring.test_mode !== 'undefined') {
            token = params.qstring.android_token;
            field = common.dbUserMap.tokens + '.' + common.dbUserMap['gcm_' + params.qstring.test_mode];
            bool = common.dbUserMap.tokens + common.dbUserMap['gcm_' + params.qstring.test_mode];
        }

        if (token === 'BLACKLISTED') {
            token = '';
        }

        if (field) {
            common.db.collection('push_' + params.app_id).findOne({'_id': params.app_user.uid}, {projection: {[field]: 1}}, function(err, psh) {
                if (!err) {
                    if (token) {
                        if (!psh || common.dot(psh, field) !== token) {
                            let $set = {[bool]: true};
                            if (params.qstring.locale) {
                                $set[common.dbUserMap.locale] = params.qstring.locale;
                                dbAppUser[common.dbUserMap.locale] = params.qstring.locale;
                            }
                            common.db.collection('app_users' + params.app_id).updateOne({'_id': params.app_user_id}, {$set: $set}, function() {});
                            common.db.collection('push_' + params.app_id).updateOne({'_id': params.app_user.uid}, {$set: {[field]: token}}, {upsert: true}, function() {});

                            dbAppUser[bool] = true;
                        }
                    }
                    else {
                        common.db.collection('app_users' + params.app_id).updateOne({'_id': params.app_user_id}, {$unset: {[bool]: 1}}, function() {});
                        common.db.collection('push_' + params.app_id).updateOne({'_id': params.app_user.uid}, {$unset: {[field]: 1}}, function() {});
                    }
                }
                else {
                    common.db.collection('app_users' + params.app_id).update({'_id': params.app_user_id}, {$unset: {[bool]: 1}}, {upsert: false}, function() {});
                    common.db.collection('push_' + params.app_id).updateOne({'_id': params.app_user.uid}, {$unset: {[field]: 1}}, function() {});
                }
            });
        }
        else if (params.qstring.locale) {
            common.db.collection('app_users' + params.app_id).updateOne({'_id': params.app_user_id}, {$set: {[common.dbUserMap.locale]: params.qstring.locale}}, function() {});
            dbAppUser[common.dbUserMap.locale] = params.qstring.locale;
        }

    };

    /** checks if member is admin of app
     * @param {object} member - member object
     * @param {string} app - app id
     * @returns {boolean} - true if is admin of app
     */
    function adminOfApp(member, app) {
        if (member.global_admin) {
            return true;
        }
        else {
            return member.admin_of && member.admin_of.indexOf(app._id.toString()) !== -1;
        }
    }

    /** checks if member is admin of apps
     * @param {object} member - member object
     * @param {array} apps - list of app ids
     * @returns {boolean} - true if is admin of all given apps
     */
    function adminOfApps(member, apps) {
        var authorized = true;

        apps.forEach(function(app) {
            authorized &= adminOfApp(member, app);
        });

        return authorized;
    }

}(api));

module.exports = api;