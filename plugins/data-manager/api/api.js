const FEATURE_NAME = 'data_manager';
const common = require('../../../api/utils/common.js');
const { validateRead } = require('../../../api/utils/rights.js');
const plugins = require('../../pluginManager.js');
const log = require('./../../../api/utils/log.js')(FEATURE_NAME + ':core-api');

try {
    if (plugins.isPluginEnabled('drill')) {
        require('./api.extended')();
    }
}
catch (e) {
    log.d('running in basic mode');
}

plugins.register("/o/data-manager/events", function(ob) {
    validateRead(ob.params, FEATURE_NAME, async function() {
        try {
            let appId = ob.params.qstring.app_id;

            let events = await common.db.collection('events')
                .findOne({'_id': common.db.ObjectID(appId)});
            let auditLogs = await common.db.collection('systemlogs')
                .aggregate([
                    {
                        '$match': {
                            'a': {'$in': ['dm-event-edit', 'dm-event-create', 'dm-event-approve']},
                            'i.ev': {'$in': events?.list || [] }
                        }
                    }, {
                        '$sort': {'ts': -1 }
                    }, {
                        '$group': {
                            '_id': '$i.ev',
                            'user_id': {'$first': '$user_id'},
                            'ts': {'$first': '$ts' },
                            'event': {'$first': '$i.ev' }
                        }
                    }
                ])
                .toArray();

            let memberIds = [...auditLogs.map(al=>{
                return al.user_id;
            }) ];

            let membersMap = {};
            let members = await common.db.collection('members')
                .find({_id: {$in: memberIds.map(id=>common.db.ObjectID(id))}}, {projection: {'full_name': 1, '_id': 1}})
                .toArray();
            members.forEach(member=>{
                membersMap[member._id] = member.full_name;
            });

            events = events?.list
                .filter(ev=>{
                    return !ev.startsWith('[CLY]');
                })
                .map(ev=>{
                    let combined = {segments: events?.segments[ev] || [], key: ev};
                    let mapObj = events?.map?.[ev] || {};
                    return {...combined, ...mapObj};
                });

            const eventMap = {};
            events?.forEach(ev=>{
                eventMap[ev.key] = ev;
            });
            auditLogs.forEach(al=>{
                al.userName = membersMap[al.user_id];
                let key = al.event;
                eventMap[key].audit = al;
            });

            common.returnOutput(ob.params, Object.values(eventMap));
        }
        catch (e) {
            log.e(e);
            common.returnOutput(ob.params, 500, "Error");
        }
    });
    return true;
});
