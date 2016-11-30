'use strict';

var common          = require('../../../../api/utils/common.js'),
    log             = common.log('push:endpoints'),
    _               = require('underscore'),
    api             = {},
    crypto          = require('crypto'),
    creds           = require('./credentials.js'),
    moment          = require('moment'),
    momentiso       = require('moment-isocalendar'),
    mess            = require('./message.js'),
    Divider         = require('./divider.js'),
    jobs            = require('../../../../api/parts/jobs'),
    plugins         = require('../../../pluginManager.js'),
    Platform        = mess.MessagePlatform,
    Message         = mess.Message,
    MessageStatus   = mess.MessageStatus;

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
            // now = mom.isoweek(),
            ago = mom.clone().add(-365 * 24 * 3600 * 1000),
            agy = noy - 1,
            agm = nom,
            agd = nod,
            // agw = ago.isoweek(),

            // month numbers (Jan is 1)
            mts = [...Array(13).keys()].map((k, i) => ((agm + i) % 12) + 1),
            // week numbers
            wks = [...new Set([...Array(common.getDaysInYear(agy)).keys()].map((k, i) => ago.clone().add(i * 24 * 3600 * 1000).isoweek()))],

            // month titles for mts
            mtt = mts.map((m, i) => (i === 0 || m > mts[0] ? agy : noy) + ' ' + moment.monthsShort[m - 1]),
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
                            log.d('d', d);
                            d = parseInt(d);
                            if (yer === agy && mon === agm && d < agd) { return; }
                            if (yer === noy && mon === nom && d > nod) { return; }

                            // current week & month numbers are first and last in wks / mts arrays
                            var we = moment(new Date(yer, mon, d)).isoweek(),
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
                    users: results[3] || 0,
                    geos: results[4] || []
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
        } else for (var platform in msg.platforms) if ([Platform.APNS, Platform.GCM].indexOf(msg.platforms[platform]) === -1) {
            common.returnOutput(params, {error: 'Bad message plaform "' + msg.platforms[platform] + '", only "' + Platform.APNS + '" (APNS) and "' + Platform.GCM + '" (GCM) are supported'});
            return false;
        }

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
                    var message = new Message(msg.apps, apps.map(a => a.name))
                        .setId(msg._id)
                        .setStatus(MessageStatus.Preparing)
                        .addPlatform(msg.platforms)
                        .setUserConditions(msg.userConditions)
                        .setDrillConditions(msg.drillConditions)
                        .setGeo(geo ? msg.geo : undefined)
                        .setTest(msg.test);
            
                    log.d('saving message to prepare %j: %j', MessageStatus.Preparing, message);
                    message = mess.cleanObj(message);
                    message.created = null;

                    log.d('saving message to prepare %j', message);
                    common.db.collection('messages').insert(message, (err, saved) => {
                        if (err || !saved || !saved.result.ok) {
                            log.e('Error while saving message: %j', err || saved);
                            common.returnMessage(params, 400, 'DB error');
                        } else {
                            log.d('saved & building audience for message %j', message);

                            var returned, 
                                // build timeout (return app_users count if aggregation in push:build is too slow)
                                timeout = setTimeout(function() {
                                    if (!returned) {
                                        var query = {$or: [...new Set(
                                                Object.keys(creds.DB_USER_MAP)
                                                    .map(k => creds.DB_USER_MAP[k])
                                                    .filter(f => message.platforms.indexOf(f.charAt(0)) !== -1)
                                                    .filter(f => (message.test ? ['d', 't', 'a'] : ['p']).indexOf(f.charAt(f.length - 1)) !== -1)
                                            )].map(f => { return {[creds.DB_USER_MAP.tokens + f]: true}; })};

                                        if (msg.userConditions) {
                                            for (var k in msg.userConditions) { query[k] = msg.userConditions[k]; }
                                        }

                                        log.i('Fast querying audience: %j', query);

                                        Promise.all(msg.apps.map(appId => common.dbPromise('app_users' + appId, 'count', query))).then(counts => {
                                            if (!returned) {
                                                returned = true;
                                                log.i('Returning fast queried audience: %j', counts);
                                                message.build = {total: counts.reduce((a, b) => a + b)};
                                                common.returnOutput(params, message);
                                            }
                                        }, error => {
                                            if (!returned) {
                                                returned = true;
                                                common.returnMessage(params, 500, 'Error ' + error);
                                            }
                                        });
                                    }
                                }, 30000);

                            jobs.runTransient('push:build', msg).then(build => {
                                log.d('Scheduling message %j clear in 1 hour', msg._id);
                                jobs.job('push:clear', msg).in(3600);

                                message.build = {count: build, total: build.TOTALLY};
                                delete message.build.count.TOTALLY;

                                if (!returned) {
                                    returned = true;
                                    clearTimeout(timeout);
                                    log.i('Returning audience: %j', build);
                                    common.returnOutput(params, message);
                                }

                                // already returned, thus possible that message is already created
                                // first check for message creation
                                common.db.collection('messages').findAndModify(
                                    {_id: message._id, 'result.status': MessageStatus.Preparing, created: null}, 
                                    [['_id', 1]], 
                                    {$set: {build: message.build, 'result.total': message.build.total}}, 
                                    {new: true}, 
                                    (err, doc) => {
                                        if (err) {
                                            log.e('Error while updating message with build result: %j', err);
                                        } else if (!doc || !doc.value) {
                                            log.d('Message %j is created or cleared', message._id);

                                            // message is either created or already cleared, let's put build in it and initiate job if it's not deleted
                                            common.db.collection('messages').findAndModify(
                                                {_id: message._id, 'result.status': MessageStatus.Preparing}, 
                                                [['_id', 1]], 
                                                {$set: {build: message.build, 'result.total': message.build.total}}, 
                                                {new: true}, 
                                                (err, doc) => {
                                                    if (err) {
                                                        log.e('Error while fastsending message: %j', err);
                                                    } else if (!doc || !doc.value) {
                                                        log.w('Message is either cleared or is in unsupported state: %j', message);

                                                    } else if (doc.value.clear) {
                                                        log.d('Message %j is set to clear 1', msg._id);
                                                        jobs.job('push:clear', msg).now();
                                                    } else {
                                                        message = doc.value;
                                                        log.d('Message %j is created, starting job', message._id);
                                                        if (message.date) {
                                                            jobs.job('push:send', {mid: message._id}).once(message.date);
                                                        } else {
                                                            jobs.job('push:send', {mid: message._id}).now();
                                                        }
                                                    }
                                                });
                                        } else if (doc && doc.value && doc.value.clear) {
                                            log.d('Message %j is set to clear 2', msg._id);
                                            jobs.job('push:clear', message).now();
                                        } else {
                                            log.d('Message %j is not created yet', msg._id);
                                            // all good, message not created yet, build is set
                                        }
                                    });

                            }, error => {
                                message.error = error;
                                common.db.collection('messages').update({_id: message._id, $or: [{error: {$exists: false}}, {error: null}]}, {$set: {error: error}}, () => {});

                                jobs.job('push:clear', msg).now();
                                if (!returned) {
                                    returned = true;
                                    common.returnMessage(params, 500, message);
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
                        jobs.job('push:clear', msg).now();
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
                'contentAvailable':     { 'required': false, 'type': 'Boolean' },
                'newsstandAvailable':   { 'required': false, 'type': 'Boolean' },
                'collapseKey':          { 'required': false, 'type': 'String'  },
                'delayWhileIdle':       { 'required': false, 'type': 'Boolean' },
                'data':                 { 'required': false, 'type': 'Object'  },
                'source':               { 'required': false, 'type': 'String'  },
                'tz':                   { 'required': false, 'type': 'Boolean' },
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

        for (var platform in msg.platforms) if ([Platform.APNS, Platform.GCM].indexOf(msg.platforms[platform]) === -1) {
            common.returnOutput(params, {error: 'Bad message plaform "' + msg.platforms[platform] + '", only "' + Platform.APNS + '" (APNS) and "' + Platform.GCM + '" (GCM) are supported'});
            return false;
        }

        if (msg.type !== 'data' && (!msg.messagePerLocale || !msg.messagePerLocale.default)) {
            common.returnOutput(params, {error: 'Messages of type other than "data" must have "messagePerLocale" object with at least "default" key set'});
            return false;
        }

        if (msg.type === 'data' && !msg.data) {
            common.returnOutput(params, {error: 'Messages of type "data" must have "data" property'});
            return false;
        }

        var message = {};
        for (var k in msg.messagePerLocale) {
            message[k.replace(/[\[\]]/g, '')] = msg.messagePerLocale[k];
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
        msg.tz = msg.tz || false;

        msg.messagePerLocale = msg.type === 'data' ? undefined : msg.messagePerLocale;

        log.d('Entering message creation with %j', msg);

        Promise.all([
            common.dbPromise('apps', 'find', {_id: {$in: msg.apps.map(common.db.ObjectID)}}),
            msg.geo ? common.dbPromise('geos', 'findOne', {_id: common.db.ObjectID(msg.geo)}) : Promise.resolve(),
            msg._id ? common.dbPromise('messages', 'findOne', {_id: common.db.ObjectID(msg._id)}) : Promise.resolve(),
        ]).then(results => {
            var apps = results[0], geo = results[1], prepared = results[2];

            if (apps.length !== msg.apps.length) {
                log.d('Asked to load: %j, loaded: %j', msg.apps, apps ? apps.map(a => a._id) : 'nothing');
                return common.returnMessage(params, 404, 'No such app');
            }

            if (msg.geo && !geo) {
                return common.returnMessage(params, 404, 'No such geo');
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

                if (prepared.userConditions !== (msg.userConditions || "{}") && msg.userConditions && (Object.keys(prepared.userConditions).length !== Object.keys(msg.userConditions).length || 
                    Object.keys(prepared.userConditions).filter(k => prepared.userConditions[k] !== msg.userConditions[k]).length)) {
                    log.d('userConditions in prepared message %j is not equal to current %j', prepared.userConditions, msg.userConditions);
                    return common.returnMessage(params, 400, 'userConditions changed after preparing message');
                }

                if (prepared.drillConditions !== (msg.drillConditions || "{}") && msg.drillConditions && (Object.keys(prepared.drillConditions).length !== Object.keys(msg.drillConditions).length || 
                    Object.keys(prepared.drillConditions).filter(k => prepared.drillConditions[k] !== msg.drillConditions[k]).length)) {
                    log.d('drillConditions in prepared message %j is not equal to current %j', prepared.drillConditions, msg.drillConditions);
                    return common.returnMessage(params, 400, 'drillConditions changed after preparing message');
                }
            }

            var message = new Message(apps.map(a => a._id), apps.map(a => a.name))
                .setId(msg._id ? common.db.ObjectID(msg._id) : new common.db.ObjectID())
                .setStatus(MessageStatus.Preparing)
                .setType(msg.type)
                .setSource(msg.source)
                .setMessagePerLocale(msg.messagePerLocale)
                .setLocales(msg.locales)
                .setURL(msg.url)
                .setCategory(msg.category)
                .addPlatform(msg.platforms)
                .setUserConditions(msg.userConditions)
                .setDrillConditions(msg.drillConditions)
                .setGeo(geo ? msg.geo : undefined)
                .setSound(msg.sound)
                .setBadge(msg.badge)
                .setTest(msg.test)
                .setContentAvailable(msg.contentAvailable)
                .setNewsstandAvailable(msg.newsstandAvailable)
                .setCollapseKey(msg.collapseKey)
                .setDelayWhileIdle(msg.delayWhileIdle)
                .setData(msg.data)
                .schedule(msg.date, msg.tz);

            message = mess.cleanObj(message);

            if (prepared) {
                message.result.status = MessageStatus.Preparing;
                message.result.total = prepared.result.total;
                common.db.collection('messages').findAndModify(
                    {_id: message._id, 'result.status': MessageStatus.Preparing, created: null}, 
                    [['_id', 1]], 
                    {$set: message}, // <- created here
                    {new: true}, 
                    (err, doc) => {
                        if (err) {
                            log.e('Error while updating message with build result: %j', err);
                            common.returnMessage(params, 500, 'DB Error');
                        } else if (!doc || !doc.value) {
                            log.d('Message %j is already created or cleared, doing nothing', message._id);
                            common.returnMessage(params, 400, 'Already created or cleared');
                        } else {
                            if (doc.value.build) {
                                log.d('Build finished, starting job');
                                // build already finished, lets schedule the job
                                message = doc.value;
                                if (message.date) {
                                    jobs.job('push:send', {mid: message._id}).once(message.date);
                                } else {
                                    jobs.job('push:send', {mid: message._id}).now();
                                }
                            } else {
                                log.d('Build is not finished yet for message %j', message._id);
                            }
                            plugins.dispatch("/systemlogs", {params:params, action:"push_message_created", data:message});
                            common.returnOutput(params, doc.value);
                        }
                    });
            } else {
                if (!adminOfApps(params.member, apps)) {
                    log.w('User %j is not admin of apps %j', params.member, apps);
                    return common.returnMessage(params, 403, 'Only app / global admins are allowed to push');
                }

                jobs.runTransient('push:build', message).then(build => {
                    if (build.TOTALLY === 0) {
                        common.returnMessage(params, 400, 'No audience');
                    } else {
                        message.build = build;
                        message.result.tital = build.TOTALLY;
                        common.db.collection('messages').save(message, (err, message) => {
                            if (err) {
                                log.e('Error while saving message: %j', err);
                                common.returnMessage(params, 500, 'DB error');
                            } else {
                                common.returnOutput(params, message);
                                log.d('Scheduling push job on date %j', msg.date);
                                if (msg.date) {
                                    jobs.job('push:send', {mid: message._id}).once(msg.date);
                                } else {
                                    jobs.job('push:send', {mid: message._id}).now();
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

    api.checkApp = function (params) {
        var argProps = {
                'appId':            { 'required': true,  'type': 'String'   },
                'platform':         { 'required': true,  'type': 'String'   },
                'test':             { 'required': false, 'type': 'Boolean'  },
            },
            options = {};

        if (params.qstring.test === 'false') { params.qstring.test = false; }
        if (params.qstring.test === 'true') { params.qstring.test = true; }

        if (!(options = common.validateArgs(params.qstring, argProps))) {
            common.returnMessage(params, 400, 'Not enough args');
            return false;
        }

        api.check(options.appId, options.platform, options.test, function(ok, error){
            common.returnOutput(params, {ok: ok, error: error});
        });
    };

    api.check = function (appId, platform, test, callback) {
        var message = new Message([appId], ['Test app'])
            .setId(new common.db.ObjectID())
            .setMessage('[CLY]_test_message')
            .addPlatform(platform)
            .setTest(test);

            log.d('%j', message);

        jobs.runTransient('push:check', mess.cleanObj(message)).then(() => {
            log.d('Check app returned ok');
            callback(true);
        }, (json) => {
            log.d('Check app returned error', json);
            let err = json && json.error === '3-EOF' ? 'badcert' : undefined;
            callback(false, err);
        });
    };

    var withAppsAndGeo = function(appIds, geoId, callback) {
        common.db.collection('apps').find({_id: {$in: appIds}}).toArray(function(error, apps){
            if (geoId) {
                common.db.collection('geos').findOne({_id: common.db.ObjectID(geoId)}, function(err, geo) {
                    callback(err || error, apps, geo);
                });
            } else {
                callback(error, apps);
            }
        });
    };

    api.updateApp = function(params) {
         var argProps = {
                'gcm.key':  { 'required': false, 'type': 'String' }
            },
            updatedApp = {}, $unset = {};

        if (!(updatedApp = common.validateArgs(params.qstring.args, argProps))) {
            common.returnOutput(params, {error: 'Invalid arguments provided'});
            return false;
        }

        if (Object.keys(updatedApp).length === 0) {
            common.returnMessage(params, 200, 'Nothing changed');
            return true;
        }

        if (!updatedApp['gcm.key']) {
            $unset['gcm.key'] = true;
        }

        var update = {$set: updatedApp};
        for (var k in $unset) update.$unset = $unset;

        common.db.collection('apps').findOne(common.db.ObjectID(params.qstring.args.app_id), function(err, app){
            if (err || !app) common.returnMessage(params, 404, 'App not found');
            else {
                var needToCheckGCM = updatedApp['gcm.key'] && (!app.gcm || !app.gcm.key || app.gcm.key != updatedApp['gcm.key']);

                if (params.member && params.member.global_admin) {
                    common.db.collection('apps').findAndModify({_id: common.db.ObjectID(params.qstring.args.app_id)}, [['_id', 1]], update, {new:true}, function(err, new_app){
                        if (err || !new_app || !new_app.ok) {
                            common.returnMessage(params, 404, 'App not found');
                        } else if (needToCheckGCM) {
                            checkGCM(params, new_app.value);
                            plugins.dispatch("/systemlogs", {params:params, action:"push_credentials_update", data:{app_id:params.qstring.args.app_id, before:app, update:new_app.value}});
                        } else {
                            plugins.dispatch("/systemlogs", {params:params, action:"push_credentials_update", data:{app_id:params.qstring.args.app_id, before:app, update:new_app.value}});
                            common.returnOutput(params, new_app.value);
                        }
                    });
                } else {
                    common.db.collection('members').findOne({'_id': params.member._id}, {admin_of: 1}, function(err, member){
                        if (member.admin_of && member.admin_of.indexOf(params.qstring.args.app_id) !== -1) {
                            common.db.collection('apps').findAndModify({_id: common.db.ObjectID(params.qstring.args.app_id)}, [['_id', 1]], update, {new:true}, function(err, new_app){
                                if (err || !new_app || !new_app.ok) {
                                    common.returnMessage(params, 404, 'App not found');
                                } else if (needToCheckGCM) {
                                    checkGCM(params, new_app.value);
                                    plugins.dispatch("/systemlogs", {params:params, action:"push_credentials_update", data:{app_id:params.qstring.args.app_id, before:app, update:new_app.value}});
                                } else {
                                    plugins.dispatch("/systemlogs", {params:params, action:"push_credentials_update", data:{app_id:params.qstring.args.app_id, before:app, update:new_app.value}});
                                    common.returnOutput(params, new_app.value);
                                }
                            });
                        } else {
                            common.returnMessage(params, 401, 'User does not have admin rights for this app');
                        }
                    });
                }
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

    api.audience = function(message, callback) {
        withAppsAndGeo(message.apps, message.geo, function(err, apps, geo){
            if (err || !apps || !apps.length) {
                log.i('No apps found');
                callback(null, []);
            } else {
                message.appNames = _.pluck(apps, 'name');

                if (geo && getGeoPluginApi()) {
                    message.setUserConditions(getGeoPluginApi().conditions(geo, message.getUserConditions()));
                }

                let divider = new Divider(message);
                divider.audience(common.db).then((TOTALLY) => {
                    callback(null, TOTALLY);
                }, (err) => {
                    callback(500, err);
                });
            }
        });
    };

    // build audience collections
    api.build = function (params) {
        var argProps = {
                'build':            { 'required': false, 'type': 'String', 'min-length': 24, 'max-length': 24 },
                'apps':             { 'required': true,  'type': 'Array'   },
                'platforms':        { 'required': true,  'type': 'Array'   },
                'geo':              { 'required': false, 'type': 'String', 'min-length': 24, 'max-length': 24 },
                'userConditions':   { 'required': false, 'type': 'Object'  },
                'drillConditions':  { 'required': false, 'type': 'Object'  },
                'test':             { 'required': false, 'type': 'Boolean' }
            },
            msg = {};

        if (!(msg = common.validateArgs(params.qstring.args, argProps))) {
            common.returnMessage(params, 400, 'Not enough args');
            return;
        }

        msg.apps = msg.apps.map(common.db.ObjectID);
   
        if (msg.build) {
            // second, third, etc. request - lookup build by id returned in first request in case build took too long and preliminary count was returned
            common.collection('jobs').findOne({name: 'push:clear', 'data._id': common.db.ObjectID(msg.build)}, (err, job) => {
                if (err) {
                    common.returnOutput(params, {code: 500, error: err});
                } else if (!job) {
                    common.returnOutput(params, {code: 404, error: 'Build not found'});
                } else if (job.failed) {
                    common.returnOutput(params, {code: 500, error: job.failed});
                } else if (!job.data || !job.data.result) {
                    common.returnOutput(params, {code: 500, error: 'No result'});
                } else {
                    common.returnOutput(params, job.data.result);
                }
            });
        } else {
            // initiate audience build:
            // - start transient push:build job
            //      - if it's done running within 3 seconds, return result
            //      - if not, start simple app_users counting
            //          - if app_users counting returned and build is not yet done, return preliminary count of all users (+userConditions)
            //          - if build is done before counting done, return build and dismiss app_users count
            // - once build is done, schedule push:clear to be run in 1 hour if no message was created with this build
            // - build result (counts by token type & locale) is saved in push:clear job's data.result key once build is done running so it could be queried later on

            msg._id = new common.db.ObjectID(); 

            var returned, 
                // build timeout (return app_users count if aggregation in push:build is too slow)
                timeout = setTimeout(function() {
                    if (!returned) {
                        var query = {$or: [...new Set(Object.keys(creds.DB_USER_MAP)
                                .map(k => creds.DB_USER_MAP[k])
                                .filter(f => msg.platforms.indexOf(f.charAt(0)) !== -1)
                                .filter(f => (msg.test ? ['d', 't', 'a'] : ['p']).indexOf(f.charAt(f.length - 1)) !== -1)
                            )].map(f => { return {[creds.DB_USER_MAP.tokens + f]: true}; })};

                        if (msg.userConditions && Object.keys(msg.userConditions).length) {
                            for (var k in msg.userConditions) { query.k = msg.userConditions[k]; }
                        }

                        log.i('Fast querying audience: %j', query);

                        Promise.all(msg.apps.map(appId => common.dbPromise('app_users' + appId, 'count', query))).then(counts => {
                            if (!returned) {
                                returned = true;
                                log.i('Returning fast queried audience: %j', counts);
                                common.returnOutput(params, {_id: msg._id, total: counts.reduce((a, b) => a + b)});
                            }
                        }, error => {
                            if (!returned) {
                                returned = true;
                                common.returnMessage(params, 500, 'Error ' + error);
                            }
                        });
                    }
                }, 3000);

            log.i('Building audience %j', msg);

            jobs.runTransient('push:build', msg).then(result => {
                msg.result = {_id: msg._id, count: result, total: result.TOTALLY};
                jobs.job('push:clear', msg).in(3600);

                if (!returned) {
                    returned = true;
                    clearTimeout(timeout);
                    log.i('Returning audience: %j', result);
                    common.returnOutput(params, msg.result);
                }
            }, error => {
                msg.failed = error;
                jobs.job('push:clear', msg).now();

                if (!returned) {
                    returned = true;
                    common.returnMessage(params, 500, 'Error ' + error);
                }
            });
        }

        return true;
    };

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
                    });
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

            if ((message.result.status & MessageStatus.InProcessing) > 0) {
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
            plugins.dispatch("/systemlogs", {params:params, action:"push_message_deleted", data:message});
            // TODO: need to delete analytics?
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

    function checkGCM(params, app) {
        api.check('' + app._id, 'a', false, function(ok){
            if (!ok) {
                common.returnOutput(params, {error: 'Invalid GCM key'});
            } else {
                common.returnOutput(params, app);
            }
        });
    }

    api.APNCertificateFile = function(appId, test) {
        return appId + (typeof test === 'undefined' ? '' : test ? '.test' : '.prod') + '.p12';
    };

    api.APNCertificatePath = function(appId, test) {
        return __dirname + '/../../../../frontend/express/certificates/' + api.APNCertificateFile(appId, test);
    };

}(api));

module.exports = api;
