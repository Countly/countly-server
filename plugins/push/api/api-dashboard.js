const common = require('../../../api/utils/common'),
    crypto = require('crypto'),
    moment = require('moment-timezone'),
    log = common.log('push:api:dashboard'),
    { platforms, fields, FIELDS_TITLES, PLATFORMS_TITLES } = require('./send');

module.exports.dashboard = function(params) {
    let app_id = params.qstring.app_id;

    if (!app_id || app_id.length !== 24) {
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
                'a_' + noy + ':' + (nom + 1) + suf, // '_s' is from crypto.createHash('md5').update('false').digest('base64')[0]
                'a_' + (nom === 0 ? agy : noy) + ':' + (nom === 0 ? 12 : nom) + suf
            ])
            .concat([
                't_' + noy + ':' + (nom + 1) + suf, // '_s' is from crypto.createHash('md5').update('false').digest('base64')[0]
                't_' + (nom === 0 ? agy : noy) + ':' + (nom === 0 ? 12 : nom) + suf
            ]),
        // mts.reduce((acc, m, i) => {
        //     acc.push('no-segment_' + (agm + i >= 12 ? noy : agy) + ':' + m);
        //     acc.push('a_' + (agm + i >= 12 ? noy : agy) + ':' + m + '_a');   
        //     return acc;
        // }, []),
        que = {_id: {$in: ids}},

        sen = 'events' + crypto.createHash('sha1').update(common.fixEventKey('[CLY]_push_sent') + app_id).digest('hex'),
        act = 'events' + crypto.createHash('sha1').update(common.fixEventKey('[CLY]_push_action') + app_id).digest('hex'),
        app = 'app_users' + app_id,

        // platform token queries ({$or: [{tkip: true}, {tkia: true}, {tkid: true}]})
        ptq = [],

        rxp = /([0-9]{4}):([0-9]{1,2})/;


    platforms.forEach(p => {
        ptq.push({
            $or: fields([p], true).map(f => ({
                [f]: true
            }))
        });
    });

    if (moment().isoWeek() === wks[0]) {
        wks.push(wks.shift());
        wkt.push(wkt.shift());
    }

    log.d(sen, act);
    log.d('mts', mts);
    log.d('wks', wks);
    log.d('que', que);
    log.d('ptq', JSON.stringify(ptq));

    Promise.all(ptq.map(q => common.dbPromise(app, 'count', q)).concat([
        common.dbPromise(sen, 'find', que),
        common.dbPromise(act, 'find', que),
        common.dbPromise(app, 'estimatedDocumentCount'),
    ])).then(results => {
        try {
            let counts = results.splice(0, ptq.length),
                enabled = {total: 0};

            platforms.forEach((p, i) => {
                enabled[p] = counts[i] || 0;
                enabled.total += enabled[p];
            });

            var events = results.slice(0, 2).map(events1 => {
                var ret = {weekly: {data: Array(wks.length).fill(0), keys: wkt}, monthly: {data: Array(mts.length).fill(0), keys: mtt}, total: 0};
                var retAuto = { daily: { data: Array(30).fill(0), keys: Array(30).fill(0).map((x, k) => k)}, total: 0 };
                var retTx = { daily: { data: Array(30).fill(0), keys: Array(30).fill(0).map((x, k) => k)}, total: 0 };
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
                        else if (e.s === 'a' && 'true' in e.d[d]) {
                            // log.d('%s / %d: %d', e.s, d, e.d[d]['true'].c);
                            date = moment({ year: yer, month: mon, day: d});
                            diff = moment().diff(date, 'days');

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
                            // log.d('%s / %d: %d', e.s, d, e.d[d]['true'].c);
                            date = moment({ year: yer, month: mon, day: d});
                            diff = moment().diff(date, 'days');

                            if (diff <= 29) {
                                target = 29 - diff;
                                retTx.daily.data[target] += e.d[d].true.c;
                                retTx.total += e.d[d].true.c;
                            }

                            ret.weekly.data[wi] -= e.d[d].true.c;
                            ret.monthly.data[mi] -= e.d[d].true.c;
                            ret.total -= e.d[d].true.c;
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
    }, error => {
        common.returnMessage(params, 500, 'Error: ' + error);
    });
    return true;
};