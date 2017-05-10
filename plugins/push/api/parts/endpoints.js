'use strict';

var common          = require('../../../../api/utils/common.js'),
    log             = common.log('push:endpoints'),
    api             = {},
    crypto          = require('crypto'),
    creds           = require('./credentials.js'),
    moment          = require('moment'),
    momenttz        = require('moment-timezone'),
    N               = require('./note.js'),
    jobs            = require('../../../../api/parts/jobs'),
    plugins         = require('../../../pluginManager.js'),
    geoip           = require('geoip-lite'),
    S               = '|';

(function (api) {

    api.dashboard = function (params) {
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
            mtt = mts.map((m, i) => (i === 0 || m > mts[0] ? agy : noy) + ' ' + moment.localeData().monthsShort(moment([0, m - 1]), "")),
            // week titles for wks
            wkt = wks.map(w => 'W' + w),
            // wkt = wks.map((w, i) => (i === 0 || w > wks[0] ? agy : noy) + '-w' + w),

            // ids of event docs
            ids = mts.map((m, i) => 'no-segment_' + (agm + i >= 12 ? noy : agy) + ':' + m),
            que = {_id: {$in: ids}},

            sen = 'events' + crypto.createHash('sha1').update(common.fixEventKey('[CLY]_push_sent') + params.qstring.app_id).digest('hex'),
            act = 'events' + crypto.createHash('sha1').update(common.fixEventKey('[CLY]_push_action') + params.qstring.app_id).digest('hex'),
            app = 'app_users' + params.qstring.app_id,
            geo = 'geos',

            // query on app users to list users with any token
            qtk = {$or: [...new Set(Object.keys(creds.DB_USER_MAP).map(k => creds.DB_USER_MAP[k]).filter(f => ['i', 'a'].indexOf(f.charAt(0)) !== -1))].map(f => { return {[creds.DB_USER_MAP.tokens + f]: true}; })},
            // query on geos for this app
            qge = {deleted: {$exists: false}, $or: [{app: common.db.ObjectID(params.qstring.app_id)}, {app: {$exists: false}}]},

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
            getGeoPluginApi() ? common.dbPromise(geo, 'find', qge) : Promise.resolve(),
            getGeoPluginApi() ? new Promise((resolve) => resolve(geoip.lookup(params.ip_address))) : Promise.resolve()
        ]).then(results => {
            try {
                var events = results.slice(0, 2).map(events => {
                    var ret = {weekly: {data: Array(wks.length).fill(0), keys: wkt}, monthly: {data: Array(mts.length).fill(0), keys: mtt}, total: 0};
                    // log.d('events', events);
                    events.forEach(e => {
                        // log.d('event', e);
                        var par = e._id.match(rxp),
                            yer = parseInt(par[1]),
                            mon = parseInt(par[2]) - 1;
                        
                        Object.keys(e.d).forEach(d => {
                            d = parseInt(d);
                            if (yer === agy && mon === agm && d < agd) { return; }
                            if (yer === noy && mon === nom && d > nod) { return; }

                            // current week & month numbers are first and last in wks / mts arrays
                            var we = moment(new Date(yer, mon, d)).isoWeek(),
                                wi = wks[yer === agy ? 'indexOf' : 'lastIndexOf'](we),
                                mi = mts[yer === agy ? 'indexOf' : 'lastIndexOf'](mon + 1);

                            ret.weekly.data[wi] += e.d[d].c;
                            ret.monthly.data[mi] += e.d[d].c;
                            ret.total += e.d[d].c;
                        });
                    });

                    return ret;
                });

                common.returnOutput(params, {
                    sent: events[0],
                    actions: events[1],
                    enabled: results[2] || 0,
                    users: results[3] ? results[3] - 1 : 0,
                    geos: results[4] || [],
                    location: results[5] ? results[5].ll || null : null
                });
            } catch (error) {
                log.e(error, error.stack);
                common.returnMessage(params, 500, 'Error: ' + error);
            }
        }, error => {
            common.returnMessage(params, 500, 'Error: ' + error);
        });
        return true;
    };


    // create invisible message and build audience
    api.prepare = function (params) {
        var argProps = {
                '_id':              { 'required': false, 'type': 'String', 'min-length': 24, 'max-length': 24 },
                'apps':             { 'required': false, 'type': 'Array'   },
                'platforms':        { 'required': false, 'type': 'Array'   },
                'geo':              { 'required': false, 'type': 'String'  },
                'userConditions':   { 'required': false, 'type': 'Object'  },
                'drillConditions':  { 'required': false, 'type': 'Object'  },
                'test':             { 'required': false, 'type': 'Boolean' }
            },
            msg = {};

        if (!(msg = common.validateArgs(params.qstring.args, argProps))) {
            log.d('Not enough params to create message: %j', params.qstring.args);
            common.returnMessage(params, 400, 'Not enough args');
            return;
        }

        if (!msg.apps || !msg.apps.length || !msg.platforms || !msg.platforms.length) {
            log.w('no apps or platforms: %j / %j', msg.apps, msg.platforms);
            common.returnMessage(params, 400, 'Not enough args');
        } else for (var platform in msg.platforms) if ([N.Platform.APNS, N.Platform.GCM].indexOf(msg.platforms[platform]) === -1) {
            common.returnOutput(params, {error: 'Bad message plaform "' + msg.platforms[platform] + '", only "' + N.Platform.APNS + '" (APNS) and "' + N.Platform.GCM + '" (GCM) are supported'});
            return false;
        }

        if (typeof params.qstring.args.tz === 'undefined') {
            params.qstring.args.tz = false;
        }
        msg.tz = params.qstring.args.tz;

        if (msg._id) {
            common.db.collection('messages').findOne(common.db.ObjectID(msg._id), (err, message) => {
                if (err) {
                    log.e('Error while loading message: %j', err);
                    common.returnMessage(params, 400, 'DB error');
                } else if (!message) {
                    common.returnMessage(params, 404, 'No such message');
                } else {
                    common.returnOutput(params, message);
                }
            });
        } else {
            Promise.all([
                common.dbPromise('apps', 'find', {_id: {$in: msg.apps.map(common.db.ObjectID)}}),
                msg.geo ? common.dbPromise('geos', 'findOne', {_id: common.db.ObjectID(msg.geo)}) : Promise.resolve()
            ]).then(results => {
                var apps = results[0], geo = results[1];

                if (msg.geo && !geo) {
                    return common.returnMessage(params, 404, 'No such geo');
                }

                if (!apps || apps.length !== msg.apps.length) {
                    log.d('Asked to load: %j, loaded: %j', msg.apps, apps ? apps.map(a => a._id) : 'nothing');
                    common.returnMessage(params, 404, 'No such app');
                } else if (!adminOfApps(params.member, apps)) {
                    log.w('User %j is not admin of apps %j', params.member, apps);
                    common.returnMessage(params, 403, 'Only app / global admins are allowed to push');
                } else {
                    msg._id = new common.db.ObjectID();
                    msg.apps = apps.map(a => a._id);

                    var note = new N.Note({
                        _id: msg._id,
                        result: {status: N.Status.Preparing},
                        apps: apps.map(a => a._id),
                        appNames: apps.map(a => a.name),
                        platforms: msg.platforms,
                        userConditions: msg.userConditions && Object.keys(msg.userConditions).length ? msg.userConditions : undefined,
                        drillConditions: msg.drillConditions && Object.keys(msg.drillConditions).length ? msg.drillConditions : undefined,
                        geo: geo ? msg.geo : undefined,
                        tz: msg.tz,
                        test: msg.test || false
                    }), json = note.toJSON();
                    json.created = null;
            
                    log.d('saving message to prepare %j', json);

                    common.db.collection('messages').insert(json, (err, saved) => {
                        if (err || !saved || !saved.result.ok) {
                            log.e('Error while saving message: %j', err || saved);
                            common.returnMessage(params, 400, 'DB error');
                        } else {
                            log.d('saved & building audience for message %j', saved);

                            var returned, 
                                // build timeout (return app_users count if aggregation in push:build is too slow)
                                timeout = setTimeout(function() {
                                    if (!returned) {
                                        var query = {$or: [...new Set(
                                                Object.keys(creds.DB_USER_MAP)
                                                    .map(k => creds.DB_USER_MAP[k])
                                                    .filter(f => json.platforms.indexOf(f.charAt(0)) !== -1)
                                                    .filter(f => (json.test ? ['d', 't', 'a'] : ['p']).indexOf(f.charAt(f.length - 1)) !== -1)
                                            )].map(f => { return {[creds.DB_USER_MAP.tokens + f]: true}; })};

                                        if (msg.userConditions) {
                                            for (var k in msg.userConditions) { query[k] = msg.userConditions[k]; }
                                        }

                                        log.i('Fast querying audience: %j', query);

                                        Promise.all(msg.apps.map(appId => common.dbPromise('app_users' + appId, 'count', query))).then(counts => {
                                            if (!returned) {
                                                returned = true;
                                                log.i('Returning fast queried audience: %j', counts);
                                                json.build = {total: counts.reduce((a, b) => a + b)};
                                                common.returnOutput(params, json);
                                            }
                                        }, error => {
                                            if (!returned) {
                                                returned = true;
                                                common.returnMessage(params, 500, 'Error ' + error);
                                            }
                                        });
                                    }
                                }, 3000);

                            jobs.runTransient('push:build', json).then(build => {
                                json._id = msg._id;
                                log.d('Scheduling message %j clear in 1 hour', msg._id);
                                jobs.job('push:clear', {mid: msg._id}).in(3600);

                                json.build = {count: build, total: build.TOTALLY};
                                json.build.tzs = build.tzs;
                                delete build.tzs;
                                delete json.build.count.TOTALLY;

                                if (!returned) {
                                    returned = true;
                                    clearTimeout(timeout);
                                    log.i('Returning audience: %j / %j', json, build);
                                    common.returnOutput(params, json);
                                }

                                // already returned, thus possible that message is already created
                                // first check for message creation
                                common.db.collection('messages').findAndModify(
                                    {_id: json._id, 'result.status': N.Status.Preparing, created: null}, 
                                    [['_id', 1]], 
                                    {$set: {build: json.build, 'result.total': json.build.total}}, 
                                    {new: true}, 
                                    (err, doc) => {
                                        // log.d('err', err, 'doc', doc, 'args', arguments);
                                        if (err) {
                                            log.e('Error while updating message with build result: %j', err);
                                        } else if (!doc || !doc.value) {
                                            log.d('Message %j is created or cleared', json._id);

                                            // message is either created or already cleared, let's put build in it and initiate job if it's not deleted
                                            common.db.collection('messages').findAndModify(
                                                {_id: json._id, 'result.status': N.Status.Preparing}, 
                                                [['_id', 1]], 
                                                {$set: {build: json.build, 'result.total': json.build.total}}, 
                                                {new: true}, 
                                                (err, doc) => {
                                                    if (err) {
                                                        log.e('Error while fastsending message: %j', err);
                                                    } else if (!doc || !doc.value) {
                                                        log.w('Message is either cleared or is in unsupported state: %j', json);

                                                    } else if (doc.value.clear) {
                                                        log.d('Message %j is set to clear 1', msg._id);
                                                        jobs.job('push:clear', {mid: msg._id}).now();
                                                    } else {
                                                        json = doc.value;
                                                        log.d('Message %j is created, starting job', json._id);
                                                        new N.Note(json).schedule(common.db, jobs);
                                                    }
                                                });
                                        } else if (doc && doc.value && doc.value.clear) {
                                            log.d('Message %j is set to clear 2', msg._id);
                                            jobs.job('push:clear', {mid: msg._id}).now();
                                        } else {
                                            log.d('Message %j is not created yet', msg._id);
                                            // all good, message not created yet, build is set
                                        }
                                    });

                            }, error => {
                                json.error = json.result.error = error;
                                common.db.collection('messages').update({_id: json._id, $or: [{error: {$exists: false}}, {error: null}]}, {$set: {error: error}}, () => {});

                                jobs.job('push:clear', {mid: msg._id}).now();
                                if (!returned) {
                                    returned = true;
                                    common.returnMessage(params, 500, json);
                                }
                            });
                        }
                    });
                }

            }, err => {
                log.e('Error while loading apps & geo: %j', err);
                common.returnMessage(params, 400, 'DB error');
            });
        }

        return true;
    };

    // clear built audience
    api.clear = function (params) {
        var argProps = {
                '_id': { 'required': true, 'type': 'String', 'min-length': 24, 'max-length': 24 },
            },
            msg = {};

        if (!(msg = common.validateArgs(params.qstring.args, argProps))) {
            common.returnMessage(params, 400, 'Not enough args');
            return;
        }

        msg._id = common.db.ObjectID(msg._id);

        log.i('Clearing audience: %j', msg);
    
        common.db.collection('messages').findAndModify(
            msg, 
            [['_id', 1]], 
            {$set: {clear: true}},
            {new: true}, 
            (err, doc) => {
                if (err) {
                    log.e('Error while updating message with build result: %j', err);
                    common.returnMessage(params, 500, 'DB Error');
                } else if (!doc || !doc.value) {
                    common.returnMessage(params, 404, 'Message not found');
                } else {
                    if (doc.value.build) {
                        log.d('Build finished, clearing it');
                        jobs.job('push:clear', {mid: msg._id}).now();
                    } else {
                        log.d('Build is not finished yet, will clear on finish');
                    }
                    common.returnOutput(params, {ok: true});
                }
            });

        return true;
    };

    api.create = function (params) {
        var argProps = {
                '_id':                  { 'required': false, 'type': 'String', 'min-length': 24, 'max-length': 24 },
                'type':                 { 'required': true,  'type': 'String'  },
                'apps':                 { 'required': true,  'type': 'Array'   },
                'platforms':            { 'required': true,  'type': 'Array'   },
                'messagePerLocale':     { 'required': false, 'type': 'Object'  },
                'locales':              { 'required': false, 'type': 'Array'   },
                'userConditions':       { 'required': false, 'type': 'Object'  },
                'drillConditions':      { 'required': false, 'type': 'Object'  },
                'geo':                  { 'required': false, 'type': 'String'  },
                'sound':                { 'required': false, 'type': 'String'  },
                'badge':                { 'required': false, 'type': 'Number'  },
                'url':                  { 'required': false, 'type': 'URL'     },
                'buttons':              { 'required': false, 'type': 'Number'  },
                'media':                { 'required': false, 'type': 'URL'     },
                'contentAvailable':     { 'required': false, 'type': 'Boolean' },
                'newsstandAvailable':   { 'required': false, 'type': 'Boolean' },
                'collapseKey':          { 'required': false, 'type': 'String'  },
                'delayWhileIdle':       { 'required': false, 'type': 'Boolean' },
                'data':                 { 'required': false, 'type': 'Object'  },
                'source':               { 'required': false, 'type': 'String'  },
                'test':                 { 'required': false, 'type': 'Boolean' }
            },
            msg = {};

        if (!(msg = common.validateArgs(params.qstring.args, argProps))) {
            log.d('Not enough params to create message: %j', params.qstring.args);
            common.returnOutput(params, {error: 'Not enough args'});
            return false;
        }

        if (['message', 'data'].indexOf(msg.type) === -1) {
            common.returnOutput(params, {error: 'Bad message type'});
            return false;
        }

        for (var platform in msg.platforms) if ([N.Platform.APNS, N.Platform.GCM].indexOf(msg.platforms[platform]) === -1) {
            common.returnOutput(params, {error: 'Bad message plaform "' + msg.platforms[platform] + '", only "' + N.Platform.APNS + '" (APNS) and "' + N.Platform.GCM + '" (GCM) are supported'});
            return false;
        }

        if (msg.type !== 'data' && (!msg.messagePerLocale || !msg.messagePerLocale.default)) {
            common.returnOutput(params, {error: 'Messages of type other than "data" must have "messagePerLocale" object with at least "default" key set'});
            return false;
        } else if (msg.type !== 'data' && msg.buttons > 0 && (!msg.messagePerLocale['default' + S + '0' + S + 't'] || !msg.messagePerLocale['default' + S + '0' + S + 'l'])) {
            common.returnOutput(params, {error: 'Messages of type other than "data" with 1 button must have "messagePerLocale" object with at least "default|0|t" & "default|0|l" keys set'});
            return false;
        } else if (msg.type !== 'data' && msg.buttons > 1 && (!msg.messagePerLocale['default' + S + '1' + S + 't'] || !msg.messagePerLocale['default' + S + '1' + S + 'l'])) {
            common.returnOutput(params, {error: 'Messages of type other than "data" with 2 buttons must have "messagePerLocale" object with at least "default|1|t" & "default|1|l" keys set'});
            return false;
        } else if (msg.type !== 'data' && msg.buttons > 2) {
            common.returnOutput(params, {error: 'Maximum 2 buttons supported'});
            return false;
        } else if (msg.type !== 'data') {
            var mpl = {};
            for (var k in msg.messagePerLocale) {
                mpl[k.replace(/[\[\]]/g, '')] = msg.messagePerLocale[k];
            }
            msg.messagePerLocale = mpl;
        } else if (msg.type === 'data') {
            msg.messagePerLocale = undefined;
        }

        if (msg.type === 'data' && (!msg.data || !Object.keys(msg.data).length)) {
            common.returnOutput(params, {error: 'Messages of type "data" must have "data" property'});
            return false;
        }

        if (msg.type === 'data' && msg.sound) {
            common.returnOutput(params, {error: 'Messages of type "data" cannot have sound'});
            return false;
        }

        if (msg.source && ['api', 'dash'].indexOf(msg.source) === -1) {
            common.returnOutput(params, {error: 'Invalid message source'});
            return false;
        }

        msg.source = msg.source || 'api';

        if (params.qstring.args.date) {
            if ((params.qstring.args.date + '').length == 10) {
                params.qstring.args.date *= 1000;
            }

            msg.date = moment.utc(params.qstring.args.date).toDate();
        } else {
            msg.date = null;
        }

        if (typeof params.qstring.args.tz === 'undefined') {
            params.qstring.args.tz = false;
        }
        msg.tz = params.qstring.args.tz;

        if (msg.type === 'data') {
            delete msg.media;
            delete msg.url;
            delete msg.sound;
            delete msg.messagePerLocale;
            msg.buttons = 0;
        }

        log.d('Entering message creation with %j', msg);

        Promise.all([
            common.dbPromise('apps', 'find', {_id: {$in: msg.apps.map(common.db.ObjectID)}}),
            msg.geo ? common.dbPromise('geos', 'findOne', {_id: common.db.ObjectID(msg.geo)}) : Promise.resolve(),
            msg._id ? common.dbPromise('messages', 'findOne', {_id: common.db.ObjectID(msg._id)}) : Promise.resolve(),
            msg.media && msg.type === 'message' ? mimeInfo(msg.media) : Promise.resolve()
        ]).then(results => {
            var apps = results[0], geo = results[1], prepared = results[2], mime = results[3];

            if (apps.length !== msg.apps.length) {
                log.d('Asked to load: %j, loaded: %j', msg.apps, apps ? apps.map(a => a._id) : 'nothing');
                return common.returnMessage(params, 404, 'No such app');
            }

            if (msg.geo && !geo) {
                return common.returnMessage(params, 404, 'No such geo');
            }

            if (msg.media && msg.type === 'message' && (!mime || !mime.headers['content-type'])) {
                return common.returnMessage(params, 400, 'Cannot determine MIME type of media attachment');
            }

            if (msg._id && !prepared) {
                return common.returnMessage(params, 404, 'No such message');
            } else if (prepared) {
                log.d('found prepared message: %j', prepared);
                if (prepared.apps.map(a => '' + a).filter(id => msg.apps.indexOf(id) === -1).length) {
                    log.d('Apps in prepared message %j are not equal to current %j', prepared.apps, msg.apps);
                    return common.returnMessage(params, 400, 'Apps changed after preparing message');
                }

                if (prepared.platforms.filter(p => msg.platforms.indexOf(p) === -1).length) {
                    log.d('Apps in prepared message %j are not equal to current %j', prepared.apps, msg.apps);
                    return common.returnMessage(params, 400, 'Platforms changed after preparing message');
                }

                if (msg.geo && prepared.geo !== msg.geo) {
                    log.d('Geo in prepared message %j is not equal to current %j', prepared.geo, msg.geo);
                    return common.returnMessage(params, 400, 'Geo changed after preparing message');
                }

                if (prepared.test !== msg.test) {
                    log.d('Test in prepared message %j is not equal to current %j', prepared.test, msg.test);
                    return common.returnMessage(params, 400, 'Test changed after preparing message');
                }

                if ((msg.userConditions || prepared.userConditions) && JSON.stringify(msg.userConditions || {}) !== (prepared.userConditions || '{}')) {
                    log.d('userConditions in prepared message %j is not equal to current %j', prepared.userConditions, msg.userConditions);
                    return common.returnMessage(params, 400, 'userConditions changed after preparing message');
                }

                if ((msg.drillConditions || prepared.drillConditions) && JSON.stringify(msg.drillConditions || {}) !== (prepared.drillConditions || '{}')) {
                    log.d('drillConditions in prepared message %j is not equal to current %j', prepared.drillConditions, msg.drillConditions);
                    return common.returnMessage(params, 400, 'drillConditions changed after preparing message');
                }
            }

            var note = new N.Note({
                _id: msg._id ? common.db.ObjectID(msg._id) : new common.db.ObjectID(),
                status: N.Status.Preparing,
                type: msg.type,
                source: msg.source,
                apps: apps.map(a => a._id),
                appNames: apps.map(a => a.name),
                platforms: msg.platforms,
                messagePerLocale: msg.messagePerLocale,
                locales: msg.locales,
                url: msg.url,
                sound: msg.sound,
                badge: msg.badge,
                buttons: msg.buttons,
                media: msg.media,
                mediaMime: mime ? mime.headers['content-type'] : undefined,
                contentAvailable: msg.contentAvailable,
                collapseKey: msg.collapseKey,
                delayWhileIdle: msg.delayWhileIdle,
                data: msg.data,
                userConditions: msg.userConditions && Object.keys(msg.userConditions).length ? msg.userConditions : undefined,
                drillConditions: msg.drillConditions && Object.keys(msg.drillConditions).length ? msg.drillConditions : undefined,
                geo: geo ? msg.geo : undefined,
                test: msg.test || false,
                date: msg.date || new Date(),
                tz: msg.tz
            });

            note.date = momenttz(note.date).utc().toDate();

            if (prepared) {
                note.result.status = N.Status.Preparing;
                note.result.total = prepared.result.total;

                var json = note.toJSON();
                delete json.build;

                plugins.dispatch("/i/pushes/validate/create", {params:params, data: json});
                plugins.dispatch("/i/pushes/validate/create", {params:params, data: note});
                if (params.res.finished) {
                    return;
                }

                common.db.collection('messages').findAndModify(
                    {_id: note._id, 'result.status': N.Status.Preparing, created: null}, 
                    [['_id', 1]], 
                    {$set: json}, // <- created here
                    {new: true}, 
                    (err, doc) => {
                        if (err) {
                            log.e('Error while updating message with build result: %j', err);
                            common.returnMessage(params, 500, 'DB Error');
                        } else if (!doc || !doc.value) {
                            log.d('Message %j is already created or cleared, doing nothing', note._id);
                            common.returnMessage(params, 400, 'Already created or cleared');
                        } else {
                            if (doc.value.build) {
                                note.build = doc.value.build;
                                log.d('Build finished, scheduling job with build %j', note.build);
                                plugins.dispatch("/i/pushes/validate/schedule", {params:params, data: note});
                                if (note.validation_error) {
                                    log.i('Won\'t schedule message %j now because of scheduling validation error %j', note._id, note.validation_error);
                                    common.db.collection('messages').updateOne({_id: note._id}, {$set: {'result.status': N.Status.InQueue}}, log.logdb('when updating message status with inqueue'));
                                } else {
                                    note.schedule(common.db, jobs);
                                }
                            } else {
                                log.d('Build is not finished yet for message %j', doc.value);
                            }
                            plugins.dispatch("/systemlogs", {params:params, action:"push_message_created", data: doc.value});
                            common.returnOutput(params, doc.value);
                        }
                    });
            } else {
                if (!adminOfApps(params.member, apps)) {
                    log.w('User %j is not admin of apps %j', params.member, apps);
                    return common.returnMessage(params, 403, 'Only app / global admins are allowed to push');
                }

                jobs.runTransient('push:build', note.toJSON()).then(build => {
                    if (build.TOTALLY === 0) {
                        common.returnMessage(params, 400, 'No audience');
                    } else {
                        note.build = {count: build, total: build.TOTALLY};
                        note.result.total = build.TOTALLY;
                        note.build.tzs = build.tzs;

                        delete build.tzs;
                        delete note.build.count.TOTALLY;

                        plugins.dispatch("/i/pushes/validate/create", {params:params, data: note});
                        if (params.res.finished) {
                            return;
                        }
                        common.db.collection('messages').save(note.toJSON(), (err) => {
                            if (err) {
                                log.e('Error while saving message: %j', err);
                                common.returnMessage(params, 500, 'DB error');
                            } else {
                                common.returnOutput(params, note);
                                plugins.dispatch("/systemlogs", {params:params, action:"push_message_created", data: note});
                                plugins.dispatch("/i/pushes/validate/schedule", {params:params, data: note});
                                if (note.validation_error) {
                                    log.i('Won\'t schedule message %j now because of scheduling validation error %j', note._id, note.validation_error);
                                    common.db.collection('messages').updateOne({_id: note._id}, {$set: {'result.status': N.Status.InQueue}}, log.logdb('when updating message status with inqueue'));
                                } else {
                                    note.schedule(common.db, jobs);
                                }
                            }
                        });
                    }
                }, err => {
                    log.e('Error while preparing audience: %j', err);
                    common.returnMessage(params, 400, 'Audience build error');
                });

            }

        }, err => {
            log.e('Error while loading apps & geo: %j', err);
            common.returnMessage(params, 400, 'DB error');
        });

        return true;
    };

    api.validate = function (params) {
        var argProps = {
                'key':              { 'required': true,  'type': 'String'   },
                'secret':           { 'required': true,  'type': 'String'   },
                'type':             { 'required': false, 'type': 'String'   },
                'platform':         { 'required': true,  'type': 'String'   }
            },
            args = {};

        if (!(args = common.validateArgs(params.qstring, argProps))) {
            log.d('Wrong arguments at /validate: %j', params.qstring);
            common.returnMessage(params, 400, 'Not enough args');
            return false;
        }

        var mime = args.key.indexOf(';base64,') === -1 ? null : args.key.substring(0, args.key.indexOf(';base64,')),
            detected;

        log.d('mime', mime);
        log.d('args.key', args.key);
        
        if (args.platform === N.Platform.APNS) {
            if (mime === 'data:application/x-pkcs12') {
                detected = [creds.CRED_TYPE[N.Platform.APNS].UNIVERSAL, creds.CRED_TYPE[N.Platform.APNS].DEV, creds.CRED_TYPE[N.Platform.APNS].PROD];
            } else if (mime === 'data:application/x-pkcs8') {
                detected = [creds.CRED_TYPE[N.Platform.APNS].TOKEN];
            } else {
                common.returnMessage(params, 400, 'Certificate must be in P12 or P8 formats');
                return false;
            }

            if (args.type) {
                if (detected.indexOf(args.type) === -1) {
                    common.returnMessage(params, 400, 'Certificate must be in P12 or P8 formats (bad type value)');
                    return false;
                }
            } else {
                if (detected.length > 1) {
                    common.returnMessage(params, 400, 'Please set type of credentials supplied');
                    return false;
                }
                args.type = detected[0];
            }
   
            args.key = args.key.substring(args.key.indexOf(',') + 1);
        } else if (args.platform === N.Platform.GCM) {
            if (!args.type) {
                args.type = creds.CRED_TYPE[N.Platform.GCM].GCM;
            }
        } else {
            common.returnMessage(params, 400, 'Bad platform ' + args.platform);
            return false;
        }


        common.db.collection('credentials').insertOne(args, (err, credentials) => {
            if (err) {
                log.e('Error while saving credentials', err);
                common.returnOutput(params, {error: 'DB Error'});
            } else {
                credentials = credentials.ops[0];
                log.i('Saved credentials', credentials);
                jobs.runTransient('push:validate', {_id: credentials._id, cid: credentials._id, platform: args.platform}).then(() => {
                    log.d('Check app returned ok');
                    common.returnOutput(params, {cid: credentials._id});
                }, (json) => {
                    log.d('Check app returned error', json);
                    let err = json && json.error === '3-EOF' ? 'badcert' : json.error || json;
                    common.returnOutput(params, {error: err});
                });
                jobs.job('push:clear', {cid: credentials._id}).in(3600);
            }
        });

        return true;
    };

    var geoPlugin;

    function getGeoPluginApi() {
        if (geoPlugin === undefined) {
            geoPlugin = plugins.getPluginsApis().geo || null;
        }

        return geoPlugin;
    }

    api.getAllMessages = function (params) {
        var query = {
            'deleted': {$exists: false}
        };

        if (!params.qstring.app_id) {
            common.returnMessage(params, 400, 'Not enough args');
            return false; 
        }


        if (!params.member.global_admin) {
            var found = false;

            (params.member.admin_of || []).concat(params.member.user_of || []).forEach(id => {
                if (id === params.qstring.app_id) { found = true; }
            });

            if (!found) {
                common.returnMessage(params, 403, 'Forbidden');
                return false; 
            }
        }

        query.apps = common.db.ObjectID(params.qstring.app_id);
        query.created = {$ne: null};

        // if(params.qstring.sSearch && params.qstring.sSearch != ""){
        //     query[messagePerLocale
        //     //filter["name"] = {"$regex": new RegExp(".*"+params.qstring.sSearch+".*", 'i')};
        //     filter["$text"] = { "$search": "\""+params.qstring.sSearch+"\"" };
        // }

        if (params.qstring.source) {
            query.source = params.qstring.source;
        }

        log.d('Querying messages: %j', query);
   
        common.db.collection('messages').count(query, function(err, total) {
            if (params.qstring.sSearch) {
                query['messagePerLocale.default'] = {$regex: new RegExp(params.qstring.sSearch, 'gi')};
            }

            var cursor = common.db.collection('messages').find(query);
            
            cursor.count(function (err, count) {
                if (typeof params.qstring.iDisplayStart !== 'undefined') {
                    cursor.skip(parseInt(params.qstring.iDisplayStart));
                }
                if (typeof params.qstring.iDisplayLength !== 'undefined') {
                    cursor.limit(parseInt(params.qstring.iDisplayLength));
                }
                if (params.qstring.iSortCol_0 && params.qstring.sSortDir_0) {
                    cursor.sort({[params.qstring.iSortCol_0]: params.qstring.sSortDir_0 === 'asc' ? -1 : 1});
                } else {
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

    api.delete = function (params) {
        var _id = params.qstring._id;

        if (!params.qstring._id) {
            common.returnMessage(params, 400, 'Not enough args');
            return false;
        }

        log.d('going to delete message %j', _id);
        common.db.collection('messages').findOne({'_id': common.db.ObjectID(_id)}, function(err, message) {
            if (!message) {
                common.returnMessage(params, 404, 'Message not found');
                return false;
            }

            if ((message.result.status & N.Status.InProcessing) > 0) {
                // if (message.pushly && message.pushly.length) {
                //     message.pushly.forEach(function(pushlyMessage){
                //         pushly.abort(pushlyMessage);
                //     });
                // }
                common.db.collection('messages').update({_id: message._id}, {$set: {'deleted': true}},function(){});
                message.deleted = true;
                common.returnOutput(params, message);
            } else {
                common.db.collection('messages').update({_id: message._id}, {$set: {'deleted': true}},function(){});
                common.returnOutput(params, message);
            }
            common.db.collection('jobs').remove({name: 'push:send', status: 0, 'data.mid': message._id}, function(){});
            plugins.dispatch("/systemlogs", {params:params, action:"push_message_deleted", data:message});
            // TODO: need to delete analytics?
        });

        return true;
    };


    api.appCreateUpdate = function(ob) {
        var args = ob.params.qstring.args;
        if (typeof args === 'object') {
            var update = {$set: {}}, appObj = ob.data.update || ob.data;
            if (args.apn) { 
                update.$set.apn = args.apn; 
                appObj.apn = args.apn; 
            } else { 
                update.$unset = {apn: 1};
            }
            if (args.gcm) { 
                update.$set.gcm = args.gcm; 
                appObj.gcm = args.gcm; 
            } else {
                if (!update.$unset) { update.$unset = {}; }
                update.$unset.$gcm = 1;
            }

            Object.keys(update.$set).forEach(p => update.$set[p].forEach(cred => cred._id = common.db.ObjectID(cred._id)));
            if (!Object.keys(update.$set).length) { delete update.$set; }
            
            log.d('App %j update query: %j, data %j', ob.appId, update, appObj);
            common.db.collection('apps').findAndModify(
                {_id: typeof ob.appId === 'string' ? common.db.ObjectID(ob.appId) : ob.appId}, 
                [['_id', 1]], 
                update, 
                {new: false}, 
                (err, doc) => {
                    if (err) {
                        log.e('Error while updating app with push credentials', err, err.stack);
                    } else if (!doc.value) {
                        log.w('App not found while updating push credentials');
                    } else {
                        var old = [], neo = [];
                        (doc.value.apn || []).concat(doc.value.gcm || []).forEach(cred => old.push('' + cred._id));
                        if (update.$set) Object.keys(update.$set).forEach(p => update.$set[p].forEach(cred => neo.push('' + cred._id)));

                        log.d('Neo %j, old %j', neo, old);
                        var todel = old.filter(_id => neo.indexOf(_id) === -1);
                        if (todel.length) {
                            log.d('Deleting unused credentials: %j', todel);
                            common.db.collection('credentials').remove({_id: {$in: todel}}, function(err){
                                if (err) {
                                    log.e('Error while deleting unused credentials: ', err, err.stack);
                                }
                            });
                        }
                    }
                });
            // common.db.collection('apps').updateOne({_id: common.db.ObjectID(args.app_id)}, update, log.logdb('updating app with credentials'));
        }
        return false;
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
            } else {
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
        if (params.qstring.ios_token && typeof params.qstring.test_mode !== 'undefined') {
            token = params.qstring.ios_token;
            field = common.dbUserMap.tokens + '.' + common.dbUserMap['apn_' + params.qstring.test_mode];
            bool  = common.dbUserMap.tokens + common.dbUserMap['apn_' + params.qstring.test_mode];
        } else if (params.qstring.android_token && typeof params.qstring.test_mode !== 'undefined') {
            token = params.qstring.android_token;
            field = common.dbUserMap.tokens + '.' + common.dbUserMap['gcm_' + params.qstring.test_mode];
            bool  = common.dbUserMap.tokens + common.dbUserMap['gcm_' + params.qstring.test_mode];
        }

        if (field) {
            if (token) {
                $set[field] = token;
                $set[bool] = true;
                if (!dbAppUser) {
                    common.db.collection('app_users' + params.app_id).update({'_id':params.app_user_id}, {$set: $set}, {upsert: true}, function(){});
                } else if (common.dot(dbAppUser, field) != token) {
                    common.db.collection('app_users' + params.app_id).update({'_id':params.app_user_id}, {$set: $set}, {upsert: true}, function(){});

                    if (!dbAppUser[common.dbUserMap.tokens]) dbAppUser[common.dbUserMap.tokens] = {};
                    common.dot(dbAppUser, field, token);

                    processChangedMessagingToken(dbAppUser, params);
                }
            } else {
                $unset[field] = 1;
                $unset[bool] = 1;
                if (common.dot(dbAppUser, field)) {
                    common.db.collection('app_users' + params.app_id).update({'_id':params.app_user_id}, {$unset: $unset}, {upsert: false}, function(){});
                }
            }
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

        var postfix = common.crypto.createHash("md5").update(params.qstring.device_id).digest('base64')[0];
        if (Object.keys(updateUsersZero).length) {
            common.db.collection('users').update({'_id': params.app_id + '_' + dbDateIds.zero + "_" + postfix}, {$set: {m: dbDateIds.zero, a: params.app_id + ''}, '$inc': updateUsersZero}, {'upsert': true}, function(){});
        }
        common.db.collection('users').update({'_id': params.app_id + '_' + dbDateIds.month + "_" + postfix}, {$set: {m: dbDateIds.month, a: params.app_id + ''}, '$inc': updateUsersMonth}, {'upsert': true}, function(){});
    }


    function adminOfApp(member, app) {
        if (member.global_admin) {
            return true;
        } else {
            return member.admin_of && member.admin_of.indexOf(app._id.toString()) !== -1;
        }
    }

    function adminOfApps(member, apps) {
        var authorized = true;

        apps.forEach(function(app){
            authorized &= adminOfApp(member, app);
        });

        return authorized;
    }

}(api));

module.exports = api;
