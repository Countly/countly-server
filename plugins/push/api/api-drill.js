const common = require('../../../api/utils/common'),
    countlyCommon = require('../../../api/lib/countly.common.js'),
    log = common.log('push:api:drill'),
    { FIELDS_TITLES } = require('./send/platforms');

module.exports.drillAddPushEvents = ({uid, params, events, event}) => {
    return new Promise((res, rej) => {
        if (event === '[CLY]_push_sent') {
            common.db.collection(`push_${params.app_id}`).findOne({_id: uid, msgs: {$elemMatch: {'1': countlyCommon.getTimestampRangeQuery(params)}}}, (err, pu) => {
                if (err) {
                    rej(err);
                }
                else if (pu) {
                    let ids = pu.msgs.map(([_id]) => _id);
                    ids = ids.filter((id, i) => ids.indexOf(id) === i);

                    common.db.collection('messages').find({_id: {$in: ids}}).toArray((er, msgs) => {
                        if (er) {
                            return rej(er);
                        }

                        for (let id in pu.msgs) {
                            let ts = parseInt(pu.msgs[id], 10),
                                m = msgs.filter(msg => msg._id.toString() === id)[0];
                            events.push({
                                _id: id,
                                key: '[CLY]_push_sent',
                                ts: ts,
                                cd: ts,
                                c: 1,
                                s: 0,
                                dur: 0,
                                sg: {
                                    i: m,
                                    a: m ? m.auto : undefined,
                                    t: m ? m.tx : undefined,
                                },
                            });
                        }

                        res();
                    });

                    // let ids = push.msgs.map(m => m[0]);
                    // common.db.collection('messages').find({_id: {$in: ids}}).toArray((e, msgs) => {

                    // });
                }
                else {
                    res();
                }
            });
        }
        else if (event === '[CLY]_push_action') {
            events = events.filter(e => !!e.sg.i);

            let ids = events.map(e => e.sg.i);
            ids = ids.filter((id, i) => ids.indexOf(id) === i).map(common.db.ObjectID);

            common.db.collection('messages').find({_id: {$in: ids}}).toArray((err, msgs) => {
                if (err) {
                    return rej(err);
                }

                events.forEach(e => {
                    e.sg.i = msgs.filter(m => m._id.toString() === e.sg.i.toString())[0];
                });

                res();
            });
        }
    });
};

/**
 * Transform drill query to mongo query:
 * {$in: [mid1, mid2]},
 * {$nin: [mid1, mid2]},
 * {mid1: 1, mid2: 1},
 * 
 * @param {object|String[]} message query
 * @returns {object|undefined} mongo query
 */
function messageQuery(message) {
    if (message) {
        if (message.$in) {
            return {$or: message.$in.map(m => ({[`msgs.${m}`]: {$exists: true}}))};
        }
        else if (message.$nin) {
            return {$and: message.$nin.map(m => ({[`msgs.${m}`]: {$exists: false}}))};
        }
        else if (Object.keys(message).length) {
            return {$or: message.map(m => ({[`msgs.${m}`]: {$exists: true}}))};
        }
    }
}

/**
 * Find messages using particular query and return ids
 * 
 * @param {object} q message collection query
 * @returns {String[]} array of message ids
 */
async function find(q) {
    let ids = await common.db.collection('messages').find(q, {projection: {_id: 1}}).toArray();
    ids = (ids || []).map(id => id._id.toString());
    return ids.length ? ids : ['nope'];
}

const toIdsMappers = {
    'message.name': (query, app_id) => find({app: common.db.ObjectID(app_id), 'message.info.name': query}),
    'message.title': (query, app_id) => find({app: common.db.ObjectID(app_id), 'contents.title': query}),
    'message.message': (query, app_id) => find({app: common.db.ObjectID(app_id), 'contents.message': query}),
};

module.exports.drillPreprocessQuery = async function({query, params}) {
    if (query && params && params.qstring && params.qstring.event === '[CLY]_push_action') {
        if (query.$or) {
            for (let i = 0; i < query.$or.length; i++) {
                let q = query.$or[i];
                for (let k in q) {
                    if (toIdsMappers[k]) {
                        let ids = await toIdsMappers[k](q[k], params.app_id);
                        log.d(`replaced query.$or[${i}] (%j) with %j`, query.$or[i], {'sg.i': {$in: ids}});
                        query.$or[i] = {
                            'sg.i': {$in: ids}
                        };
                    }
                }
            }
        }
        for (let k in query) {
            if (toIdsMappers[k]) {
                let ids = await toIdsMappers[k](query[k], params.app_id);
                if (query['sg.i'] && query['sg.i'].$in) {
                    query['sg.i'].$in = query['sg.i'].$in.filter(id => ids.includes(id));
                }
                else if (query['sg.i']) {
                    query['sg.i'].$in = ids;
                }
                else {
                    query['sg.i'] = {$in: ids};
                }
                log.d(`replaced query[${k}] (%j) with %j`, query[k], query['sg.i']);
                delete query[k];
            }
        }
        if (query['sg.i'] && query['sg.i'].$in && !query['sg.i'].$in.length) {
            query['sg.i'].$in = ['nope'];
        }
        // if (query.push) {
        //     if (query.push.$nin) {
        //         query.$and = query.push.$nin.map(tk => {
        //             return {$or: [{[tk]: false}, {[tk]: {$exists: false}}]};
        //         });
        //     }
        //     if (query.push.$in) {
        //         let q = query.push.$in.map(tk => {
        //             return {[tk]: true};
        //         });
        //         query.$or = q;
        //     }
        //     delete query.push;
        // }
    }
    else if (query && params) {
        if (query.message) {
            let q = messageQuery(query.message);

            if (!q) {
                return;
            }

            log.d(`removing message ${JSON.stringify(query.message)} from queryObject`);
            delete query.message;

            try {
                let ids = await common.db.collection(`push_${params.app_id}`).find(q, {projection: {_id: 1}}).toArray();
                ids = (ids || []).map(id => id._id);
                query.uid = {$in: ids};
                log.d(`filtered by message: uids out of ${ids.length}`);
            }
            catch (e) {
                log.e(e);
            }
        }

        if (query.push) {
            let q;
            if (query.push.$nin) {
                q = {
                    $and: query.push.$nin.map(tk => {
                        return {[tk]: {$exists: false}};
                    })
                };
            }
            if (query.push.$in) {
                q = {
                    $or: query.push.$in.map(tk => {
                        return {[tk]: {$exists: true}};
                    })
                };
            }
            if (query.push.$regex) {
                q = Object.keys(FIELDS_TITLES).filter(k => query.push.$regex.test(FIELDS_TITLES[k])).map(tk => {
                    return {[tk]: {$exists: true}};
                });
            }

            delete query.push;

            if (q) {
                if (query.$or) {
                    query.$and = [query.$or, q];
                }
                else if (query.$and) {
                    query.$and = [query.$and, q];
                }
                else {
                    for (let k in q) {
                        query[k] = q[k];
                    }
                }
            }
        }
    }
};

// module.exports.drillPreprocessQuery = ({query, params}) => {
//     if (query) {
//         if (query.push) {
//             if (query.push.$nin) {
//                 query.$and = query.push.$nin.map(tk => {
//                     return {$or: [{[tk]: false}, {[tk]: {$exists: false}}]};
//                 });
//             }
//             if (query.push.$in) {
//                 let q = query.push.$in.map(tk => {
//                     return {[tk]: true};
//                 });
//                 query.$or = q;
//             }
//             delete query.push;
//         }

//         if (query.message) {
//             let q = messageQuery(query.message);

//             if (!q) {
//                 return;
//             }

//             log.d(`removing message ${JSON.stringify(query.message)} from queryObject`);
//             delete query.message;

//             return new Promise((res, rej) => {
//                 try {
//                     common.db.collection(`push_${params.app_id}`).find(q, {projection: {_id: 1}}).toArray((err, ids) => {
//                         if (err) {
//                             rej(err);
//                         }
//                         else {
//                             ids = (ids || []).map(id => id._id);
//                             query.uid = {$in: ids};
//                             log.d(`filtered by message: uids out of ${ids.length}`);
//                             res();
//                         }
//                     });
//                 }
//                 catch (e) {
//                     log.e(e);
//                     rej(e);
//                 }
//             });
//         }
//     }
// };

module.exports.drillPostprocessUids = ({uids, params}) => new Promise((res, rej) => {
    let message = params && params.initialQueryObject && params.initialQueryObject.message;
    if (uids && uids.length && message) {
        log.d(`filtering ${uids.length} uids by message`);

        let q = messageQuery(message);
        if (q) {
            q._id = {$in: uids};
            return common.db.collection(`push_${params.app_id}`).find(q, {projection: {_id: 1}}).toArray((err, ids) => {
                if (err) {
                    rej(err);
                }
                else {
                    ids = (ids || []).map(id => id._id);
                    log.d(`filtered by message: now ${ids.length} uids out of ${uids.length}`);
                    uids.splice(0, uids.length, ...ids);
                    res();
                }
            });
        }
    }

    res();
});
