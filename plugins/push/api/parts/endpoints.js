'use strict';

/* jshint ignore:start */

var common = require('../../../../api/utils/common.js'),
    log = common.log('push:endpoints'),
    api = {},
    crypto = require('crypto'),
    C = require('./credentials.js'),
    S = require('./store.js'),
    moment = require('moment-timezone'),
    momenttz = require('moment-timezone'),
    N = require('./note.js'),
    jobs = require('../../../../api/parts/jobs'),
    plugins = require('../../../pluginManager.js'),
    geoip = require('geoip-lite'),
    SEP = '|';

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

(function(api) {

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
                var events = results.slice(0, 2).map(events => {
                    var ret = {weekly: {data: Array(wks.length).fill(0), keys: wkt}, monthly: {data: Array(mts.length).fill(0), keys: mtt}, total: 0};
                    var retAuto = { daily: { data: Array(30).fill(0), keys: Array(30).fill(0).map((x, k) => k)}, total: 0 };
                    // log.d('events', events);
                    events.forEach(e => {
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
                                    retAuto.daily.data[target] += e.d[d]['true'].c;
                                    retAuto.total += e.d[d]['true'].c;
                                }

                                ret.weekly.data[wi] -= e.d[d]['true'].c;
                                ret.monthly.data[mi] -= e.d[d]['true'].c;
                                ret.total -= e.d[d]['true'].c;
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
            .concat(sen.map(sen => common.dbPromise(sen, 'find', que)))
            .concat(act.map(act => common.dbPromise(act, 'find', que)));

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

            if ((v + '').length == 10) {
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
                'geo': { 'required': false, 'type': 'String' },
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
                'autoOnEntry': { 'required': false, 'type': 'Boolean' },
                'autoCohorts': { 'required': false, 'type': 'Array' },
                'autoDelay': { 'required': false, 'type': 'Number' },
                'autoTime': { 'required': false, 'type': 'Number' },
                'autoCapMessages': { 'required': false, 'type': 'Number' },
                'autoCapSleep': { 'required': false, 'type': 'Number' },
            },
            data = {};

        if (!(data = common.validateArgs(params.qstring.args, argProps))) {
            log.d('Not enough params to create message: %j', params.qstring.args);
            return [{error: 'Not enough args'}];
        }

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

            if (data.source && !['api', 'dash'].indexOf(data.source) === -1) {
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

        let [apps, geo, prepared, mime, cohorts] = await Promise.all([
            skipAppsPlatforms ? Promise.resolve() : common.dbPromise('apps', 'find', {_id: {$in: data.apps.map(common.db.ObjectID)}}).then(apps => apps || []),
            data.geo ? common.dbPromise('geos', 'findOne', {_id: common.db.ObjectID(data.geo)}) : Promise.resolve(),
            data._id ? N.Note.load(common.db, data._id) : Promise.resolve(),
            data.media && data.type === 'message' ? mimeInfo(data.media) : Promise.resolve(),
            data.auto && data.autoCohorts && data.autoCohorts.length ? common.dbPromise('cohorts', 'find', {_id: {$in: data.autoCohorts}}) : Promise.resolve()
        ]);

        if (skipAppsPlatforms) {
            if (prepared) {
                apps = await common.dbPromise('apps', 'find', {_id: {$in: prepared.apps}}).then(apps => apps || []);
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

        if (data.geo && !geo) {
            return [{error: 'No such geo'}];
        }

        if (data.media && data.type === 'message' && (!mime || !mime.headers['content-type'])) {
            return [{error: 'Cannot determine MIME type of media attachment'}];
        }

        if (data.auto) {
            if (!skipMpl) {
                if (!data.autoCohorts || !data.autoCohorts.length) {
                    return [{error: 'Cohorts are required for auto messages'}];
                }
                if (!cohorts || data.autoCohorts.length != cohorts.length) {
                    return [{error: 'Cohort not found'}];
                }
                if (data.autoOnEntry !== false && data.autoOnEntry !== true) {
                    return [{error: 'autoOnEntry is required for auto messages'}];
                }
            }
        }
        else if (data.tx) {

        }

        if (!skipAppsPlatforms && prepared) {
            log.d('found prepared message: %j', prepared);
            if (prepared.apps.map(a => '' + a).filter(id => data.apps.indexOf(id) === -1).length) {
                return [{error: 'Apps changed after preparing message'}];
            }

            if (prepared.platforms.filter(p => data.platforms.indexOf(p) === -1).length) {
                return [{error: 'Platforms changed after preparing message'}];
            }

            if (data.geo && prepared.geo !== data.geo) {
                return [{error: 'Geo changed after preparing message'}];
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
            geo: geo ? data.geo : undefined,
            test: data.test || false,
            date: data.date || new Date(),
            expiryDate: data.expiryDate,
            tz: data.tz,
            tx: data.tx || false,
            auto: data.auto || false,
            autoOnEntry: data.auto ? data.autoOnEntry : undefined,
            autoCohorts: data.auto && cohorts ? cohorts.map(c => c._id) : undefined,
            autoEnd: data.auto ? data.autoEnd : undefined,
            autoDelay: data.auto ? data.autoDelay : undefined,
            autoTime: data.auto ? data.autoTime : undefined,
            autoCapMessages: data.auto ? data.autoCapMessages : undefined,
            autoCapSleep: data.auto ? data.autoCapSleep : undefined
        });

        return [note, prepared, apps];
    });

    api.prepare = catchy(async(params, dontReturn) => {
        let [note, prepared, apps] = await api.validate(params, true),
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

        // build timeout (return app_users count if aggregation is too slow)
        let timeout = setTimeout(() => {
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
        }, 3000);

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
                    }, err => {
                        log.e('Message %s is in unsupported state: %j', note._id, err);
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
        else if (!prepared) {
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

        note.result.status = (prepared && prepared.result.status || 0) | N.Status.Created;

        let json = note.toJSON();

        plugins.dispatch('/i/pushes/validate/create', {params: params, data: note});
        if (params.res.finished) {
            return;
        }

        if (note.auto || note.tx) {
            json.result.status = N.Status.READY;
            await common.dbPromise('messages', prepared ? 'save' : 'insertOne', json);
            common.returnOutput(params, json);
        }
        else {
            if (!prepared || !prepared.build.total) {
                return common.returnOutput(params, {error: 'No audience'});
            }

            plugins.dispatch('/i/pushes/validate/schedule', {params: params, data: note});
            if (note.validation_error) {
                log.i('Won\'t schedule message %j now because of scheduling validation error %j', note._id, note.validation_error);
                await note.update(common.db, {$bit: {'result.status': {or: N.Status.Error}}, $set: {'result.error': note.validation_error}});
                return common.returnOutput(params, {error: note.validation_error});
            }

            await note.schedule(common.db, jobs);
            let neo = await note.updateAtomically(common.db, {'result.status': N.Status.NotCreated}, json);
            if (!neo) {
                return common.returnOutput(params, {error: 'Message has already been created'});
            }
            common.returnOutput(params, json);
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

    var geoPlugin, cohortsPlugin;

    function getGeoPluginApi() {
        if (geoPlugin === undefined) {
            geoPlugin = plugins.getPluginsApis().geo || null;
        }

        return geoPlugin;
    }

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

        common.db.collection('messages').count(query, function(err, total) {
            if (params.qstring.sSearch) {
                query['messagePerLocale.default'] = {$regex: new RegExp(params.qstring.sSearch, 'gi')};
            }

            var cursor = common.db.collection('messages').find(query);

            cursor.count(function(err, count) {
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
                cursor.toArray(function(err, items) {
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

            common.db.collection('cohorts').find({_id: {$in: message.autoCohorts}}).toArray((err, cohorts) => {
                if (err) {
                    return common.returnMessage(params, 500, 'Error when retrieving cohorts');
                }

                if (cohorts.length !== message.autoCohorts.length) {
                    return common.returnOutput(params, {error: 'Some of message cohorts have been deleted'});
                }

                let update = params.qstring.active === 'true' ? {or: N.Status.Scheduled} : {and: ~N.Status.Scheduled};

                common.db.collection('messages').updateOne({_id: message._id}, {$bit: {'result.status': update}}, err => {
                    if (err) {
                        log.e(err.stack);
                        return common.returnMessage(params, 500, 'DB Error');
                    }

                    if (params.qstring.active === 'true') {
                        message.result.status = message.result.status | N.Status.Scheduled;
                        plugins.dispatch('/systemlogs', {params: params, action: 'push_message_activated', data: message});
                    }
                    else {
                        message.result.status = message.result.status & ~N.Status.Scheduled;
                        plugins.dispatch('/systemlogs', {params: params, action: 'push_message_deactivated', data: message});

                        let sg = new S.StoreGroup(common.db);
                        sg.clearNote(new N.Note(message)).then(() => {
                            log.i('Cleared scheduled notifications for %s', message._id);
                        }, err => {
                            log.w('Error while clearing scheduled notifications for %s: %j', message._id, err.stack || err);
                        });

                        common.returnOutput(params, message);
                    }

                });

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

                if (mime === 'data:application/x-pkcs12') {
                    detected = C.CRED_TYPE[N.Platform.IOS].UNIVERSAL;
                }
                else if (mime === 'data:application/x-pkcs8') {
                    detected = C.CRED_TYPE[N.Platform.IOS].TOKEN;
                }
                else if (mime === 'data:') {
                    var error = C.check_token(data.file.substring(data.file.indexOf(',') + 1), [data.key, data.team, data.bundle].join('[CLY]'));
                    if (error) {
                        return resolve('Push: ' + (typeof error === 'string' ? error : error.message || error.code || JSON.stringify(error)));
                    }
                    detected = C.CRED_TYPE[N.Platform.IOS].TOKEN;
                }
                else {
                    return resolve('Push: certificate must be in P12 or P8 formats');
                }

                if (data.type && detected !== data.type) {
                    return resolve('Push: certificate must be in P12 or P8 formats (bad type value)');
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
                            let err = json && json.error === '3-EOF' ? 'badcert' : json.error || json;
                            log.d('Check app returned error %j: %s', json, err);
                            throw err;
                        });
                    })).then(() => {
                        log.d('Done checking temporary credentials for app %s, updating app', app._id);
                        common.dbPromise('apps', 'updateOne', {_id: app._id}, update).then(() => {
                            plugins.dispatch('/systemlogs', {params: params, action: 'plugin_push_config_updated', data: {before: app.plugins ? app.plugins.push : {}, update: update}});
                            common.dbPromise('credentials', 'removeMany', {_id: {$in: credsToRemove}}).then(resolve.bind(null, config), resolve.bind(null, config));
                        }, reject);
                    }, reject);
                }, reject);
            }
            else if (Object.keys(update).length) {
                common.dbPromise('apps', 'updateOne', {_id: app._id}, update).then(() => {
                    plugins.dispatch('/systemlogs', {params: params, action: 'plugin_push_config_updated', data: {before: app.plugins.push, update: update}});
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
                        common.db.collection('messages').find(query).toArray((err, msgs) => {
                            if (err) {
                                log.e('[auto] Error while loading messages: %j', err);
                                reject(err);
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
                                }, err => {
                                    log.i('[auto] Finished processing cohort %j with error %j / %j', cohort._id, err, err.stack);
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

    api.onCohortDelete = (_id, app_id, ack) => {
        return new Promise((resolve, reject) => {
            if (ack) {
                common.dbPromise('messages', 'update', {auto: true, 'result.status': {$bitsAllSet: N.Status.Scheduled}, autoCohorts: _id}, {$bit: {'result.status': {and: ~N.Status.Scheduled}}}).then(() => resolve(ack), reject);
            }
            else {
                common.db.collection('messages').count({auto: true, 'result.status': {$bitsAllSet: N.Status.Scheduled}, autoCohorts: _id}, (err, count) => {
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
            Object.keys(C.DB_USER_MAP).map(k => C.DB_USER_MAP[k]).filter(v => v !== 'msgs').forEach(v => update.$unset[v] = 1);
            common.db.collection('app_users' + params.app_id).updateOne({_id: params.app_user_id}, update, () => {});
        }
    };


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
        var $set = {}, $unset = {};

        if (params.qstring.locale) {
            $set[common.dbUserMap.locale] = params.qstring.locale;
        }

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

        if (field) {
            if (token) {
                $set[field] = token;
                $set[bool] = true;
                if (!dbAppUser) {
                    common.db.collection('app_users' + params.app_id).update({'_id': params.app_user_id}, {$set: $set}, {upsert: true}, function() {});
                }
                else if (common.dot(dbAppUser, field) != token) {
                    common.db.collection('app_users' + params.app_id).update({'_id': params.app_user_id}, {$set: $set}, {upsert: true}, function() {});

                    if (!dbAppUser[common.dbUserMap.tokens]) {
                        dbAppUser[common.dbUserMap.tokens] = {};
                    }
                    common.dot(dbAppUser, field, token);

                    processChangedMessagingToken(dbAppUser, params);
                }
            }
            else {
                $unset[field] = 1;
                $unset[bool] = 1;
                if (common.dot(dbAppUser, field)) {
                    common.db.collection('app_users' + params.app_id).update({'_id': params.app_user_id}, {$unset: $unset}, {upsert: false}, function() {});
                }
            }
        }
        else if (Object.keys($set).length) {
            common.db.collection('app_users' + params.app_id).update({'_id': params.app_user_id}, {$set: $set}, {upsert: true}, function() {});
        }

    };

    function processChangedMessagingToken(dbAppUser, params) {
        var updateUsersMonth = {},
            updateUsersZero = {},
            dbDateIds = common.getDateIds(params);

        var levels = [
            common.dbMap['messaging-enabled'],
        ];

        if (dbAppUser[common.dbUserMap.country_code]) {
            levels.push(dbAppUser[common.dbUserMap.country_code] + common.dbMap['messaging-enabled']);
        }

        // unique messaging sessions
        common.fillTimeObjectZero(params, updateUsersZero, levels);
        common.fillTimeObjectMonth(params, updateUsersMonth, levels);

        var postfix = common.crypto.createHash('md5').update(params.qstring.device_id).digest('base64')[0];
        if (Object.keys(updateUsersZero).length) {
            common.db.collection('users').update({'_id': params.app_id + '_' + dbDateIds.zero + '_' + postfix}, {$set: {m: dbDateIds.zero, a: params.app_id + ''}, '$inc': updateUsersZero}, {'upsert': true}, function() {});
        }
        common.db.collection('users').update({'_id': params.app_id + '_' + dbDateIds.month + '_' + postfix}, {$set: {m: dbDateIds.month, a: params.app_id + ''}, '$inc': updateUsersMonth}, {'upsert': true}, function() {});
    }


    function adminOfApp(member, app) {
        if (member.global_admin) {
            return true;
        }
        else {
            return member.admin_of && member.admin_of.indexOf(app._id.toString()) !== -1;
        }
    }

    function adminOfApps(member, apps) {
        var authorized = true;

        apps.forEach(function(app) {
            authorized &= adminOfApp(member, app);
        });

        return authorized;
    }

}(api));

module.exports = api;