const common = require('../../../api/utils/common.js');

/**
 * @param  {Array} eventList - list of events
 * @returns {Array} - list of events with audit logs
 */
async function eventsAuditLogs(eventList = []) {
    return common.db.collection('systemlogs')
        .aggregate([
            {
                '$match': {
                    'a': { '$in': ['dm-event-edit', 'dm-event-create', 'dm-event-approve'] }
                }
            },
            {
                '$unwind': {
                    'path': "$i.ev",
                    'preserveNullAndEmptyArrays': true
                }
            },
            {
                '$match': {
                    'i.ev': {'$in': eventList || [] }
                }
            },
            {
                '$sort': {'ts': -1 }
            }, {
                '$group': {
                    '_id': '$i.ev',
                    'user_id': {'$first': '$user_id'},
                    'ts': {'$first': '$ts' },
                    'event': {'$first': '$i.ev' }
                }
            }
        ], { allowDiskUse: true })
        .toArray();
}

exports.eventsAuditLogs = eventsAuditLogs;