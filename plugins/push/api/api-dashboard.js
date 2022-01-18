const common = require('../../../api/utils/common'),
    crypto = require('crypto'),
    moment = require('moment-timezone'),
    log = common.log('push:api:dashboard'),
    { platforms, fields, FIELDS_TITLES, PLATFORMS_TITLES } = require('./send');

module.exports.dashboard = async function(params) {
    let app_id = common.validateArgs(params.qstring, {
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

        /**
         * Generate ids of event docs
         * 
         * @param {string} seg segment name
         * @param {string} val segment value
         * @returns {string[]} event doc ids
         */
        ids = (seg, val) => ([
            seg + '_' + noy + ':' + (nom + 1) + '_' + crypto.createHash('md5').update(val + '').digest('base64')[0],
            seg + '_' + (nom === 0 ? agy : noy) + ':' + (nom === 0 ? 12 : nom) + '_' + crypto.createHash('md5').update(val + '').digest('base64')[0]
        ]),

        // event docs query
        que = {
            _id: {
                $in: mts.map((m, i) => 'no-segment_' + (agm + i >= 12 ? noy : agy) + ':' + m)
                    .concat(platforms.map(p => mts.map((m, i) => 'p_' + (agm + i >= 12 ? noy : agy) + ':' + m + '_' + crypto.createHash('md5').update(p).digest('base64')[0])).flat())
                    .concat(ids('a', 'true'))
                    .concat(ids('t', 'true'))
                    .concat(platforms.map(p => ids('ap', 'true' + p)).flat())
                    .concat(platforms.map(p => ids('tp', 'true' + p)).flat())
            }
        },

        sen = 'events' + crypto.createHash('sha1').update(common.fixEventKey('[CLY]_push_sent') + app_id).digest('hex'),
        act = 'events' + crypto.createHash('sha1').update(common.fixEventKey('[CLY]_push_action') + app_id).digest('hex'),
        app = 'app_users' + app_id,

        // platform token queries ({$or: [{tkip: true}, {tkia: true}, {tkid: true}]}, {$or: [{tkap: true}, {tkat: true}]})
        ptq = [],

        // any token query (same as above but $or of any token)
        any = {$or: []},

        rxp = /([0-9]{4}):([0-9]{1,2})/;


    platforms.forEach(p => {
        ptq.push({
            $or: fields([p], true).map(f => ({
                [f]: true
            }))
        });
        any.$or.push(...fields([p], true).map(f => ({
            [f]: true
        })));
    });

    if (moment().isoWeek() === wks[0]) {
        wks.push(wks.shift());
        wkt.push(wkt.shift());
    }

    log.d('sen', sen, 'act', act);
    log.d('mts', mts);
    log.d('wks', wks);
    log.d('que', que);
    log.d('ptq', JSON.stringify(ptq));
    log.d('any', JSON.stringify(any));

    let results = await Promise.all(ptq.map(q => common.dbPromise(app, 'count', q)).concat([common.dbPromise(app, 'count', any)]).concat([
        common.dbPromise(sen, 'find', que),
        common.dbPromise(act, 'find', que),
        common.dbPromise(app, 'estimatedDocumentCount'),
    ]));

    try {
        let counts = results.splice(0, ptq.length + 1),
            enabled = {total: counts[counts.length - 1]};

        platforms.forEach((p, i) => {
            enabled[p] = counts[i] || 0;
        });

        let events = results.slice(0, 2).map(events1 => {
            let ret = {
                    weekly: {data: Array(wks.length).fill(0), keys: wkt},
                    monthly: {data: Array(mts.length).fill(0), keys: mtt},
                    total: 0,
                    platforms: {}
                },
                retAuto = {
                    daily: { data: Array(30).fill(0), keys: Array(30).fill(0).map((x, k) => k)},
                    total: 0,
                    platforms: {}
                },
                retTx = {
                    daily: { data: Array(30).fill(0), keys: Array(30).fill(0).map((x, k) => k)},
                    total: 0,
                    platforms: {}
                };

            platforms.forEach(p => {
                ret.platforms[p] = {
                    weekly: {data: Array(wks.length).fill(0), keys: wkt},
                    monthly: {data: Array(mts.length).fill(0), keys: mtt},
                    total: 0
                };
                retAuto.platforms[p] = {
                    daily: { data: Array(30).fill(0), keys: Array(30).fill(0).map((x, k) => k)},
                    total: 0
                };
                retTx.platforms[p] = {
                    daily: { data: Array(30).fill(0), keys: Array(30).fill(0).map((x, k) => k)},
                    total: 0
                };
            });

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
                        mi = mts[yer === agy ? 'indexOf' : 'lastIndexOf'](mon + 1),
                        date, diff, target;

                    if (e.s === 'no-segment') {
                        // log.d('%s / %d: %d', e.s, d, e.d[d].c);
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
                            platforms.forEach(p => {
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
                            platforms.forEach(p => {
                                p = 'true' + p;
                                if (!e.d[d][p]) {
                                    return;
                                }
                                retAuto.platforms[p].daily.data[target] += e.d[d][p].c;
                                retAuto.platforms[p].total += e.d[d][p].c;
                            });
                        }
                        else if (e.s === 'tp' && diff <= 29) {
                            target = 29 - diff;
                            platforms.forEach(p => {
                                p = 'true' + p;
                                if (!e.d[d][p]) {
                                    return;
                                }
                                retAuto.platforms[p].daily.data[target] += e.d[d][p].c;
                                retAuto.platforms[p].total += e.d[d][p].c;
                            });
                        }
                    }
                });
            });

            return {
                m: ret,
                a: retAuto,
                t: retTx
            };
        });

        common.returnOutput(params, {
            sent: events[0].m,
            sent_automated: events[0].a,
            sent_tx: events[0].t,
            actions: events[1].m,
            actions_automated: events[1].a,
            actions_tx: events[1].t,
            enabled,
            users: results[2] ? results[2] : 0,
            platforms: PLATFORMS_TITLES,
            tokens: FIELDS_TITLES
        });
    }
    catch (error) {
        log.e(error, error.stack);
        common.returnMessage(params, 500, 'Error: ' + error);
    }
    return true;
};