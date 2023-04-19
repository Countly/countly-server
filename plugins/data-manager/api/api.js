const FEATURE_NAME = 'data_manager';
const common = require('../../../api/utils/common.js');
const { validateRead, validateCreate, validateDelete, validateUpdate } = require('../../../api/utils/rights.js');
const plugins = require('../../pluginManager.js');
const log = require('./../../../api/utils/log.js')(FEATURE_NAME + ':core-api');
const auditLog = require('./parts/auditLogs');
plugins.register("/permissions/features", function(ob) {
    ob.features.push(FEATURE_NAME);
});

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
                .findOne({ '_id': common.db.ObjectID(appId) });
            let auditLogs = await auditLog.eventsAuditLogs(events?.list);
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
            common.returnMessage(ob.params, 500, "Error");
        }
    });
    return true;
});

plugins.register("/o/data-manager/category", function(ob) {
    validateRead(ob.params, FEATURE_NAME, async function() {
        try {
            let appId = ob.params.qstring.app_id;

            let categories = await common.db.collection("event_categories")
                .find({app: appId}).toArray();


            common.returnOutput(ob.params, categories);
        }
        catch (e) {
            log.e(e);
            common.returnMessage(ob.params, 500, "Error");
        }
    });
    return true;
});

plugins.register("/i/data-manager/category/create", function(ob) {
    validateCreate(ob.params, FEATURE_NAME, async function() {
        try {
            let appId = ob.params.qstring.app_id;
            let categories = JSON.parse(ob.params.qstring.categories);
            if (!categories?.length) {
                throw new Error('categories cannot be empty');
            }
            const docs = categories.map(cat=>{
                return {
                    app: appId,
                    name: cat
                };
            });
            common.db.collection("event_categories").insertMany(docs);
            plugins.dispatch("/systemlogs", {params: ob.params, action: "dm-category-category", data: { categories: categories }});
            common.returnOutput(ob.params, "Success");
        }
        catch (e) {
            log.e(e);
            common.returnMessage(ob.params, 500, "Error");
        }
    });
    return true;
});

plugins.register("/i/data-manager/category/edit", function(ob) {
    validateUpdate(ob.params, FEATURE_NAME, async function() {
        try {
            let appId = ob.params.qstring.app_id;
            let categories = JSON.parse(ob.params.qstring.categories);
            const bulkArray = [];
            categories.forEach(category=> {
                let id = common.db.ObjectID();
                if (category._id) {
                    id = common.db.ObjectID(category._id) ;
                }
                bulkArray.push({
                    'updateOne': {
                        'filter': {
                            '_id': id
                        },
                        'update': {
                            '$set': {
                                'name': category.name,
                                app: appId
                            }
                        },
                        "upsert": true
                    }
                });
            });
            await common.db.collection("event_categories").bulkWrite(bulkArray);
            plugins.dispatch("/systemlogs", {params: ob.params, action: "dm-category-edit", data: { categories: categories}});
            common.returnOutput(ob.params, "Success");
        }
        catch (e) {
            log.e(e);
            common.returnMessage(ob.params, 500, "Error");
        }
    });
    return true;
});

plugins.register("/i/data-manager/category/delete", function(ob) {
    validateDelete(ob.params, FEATURE_NAME, async function() {
        try {
            let categoryIds = JSON.parse(ob.params.qstring.categoryIds);
            let appId = ob.params.qstring.app_id;

            common.db.collection("event_categories")
                .deleteMany(
                    {
                        "_id": {$in: categoryIds.map(categoryId=>common.db.ObjectID(categoryId)) },
                        app: appId
                    }
                );

            plugins.dispatch("/systemlogs", {params: ob.params, action: "dm-category-delete", data: { ids: categoryIds }});

            common.returnOutput(ob.params, "Success");
        }
        catch (e) {
            log.e(e);
            common.returnMessage(ob.params, 500, "Error");
        }
    });
    return true;
});

plugins.register("/i/data-manager/event/change-category", function(ob) {
    validateUpdate(ob.params, FEATURE_NAME, async function() {
        try {
            let appId = ob.params.qstring.app_id;
            let events = JSON.parse(ob.params.qstring.events);
            let category = ob.params.qstring.category;

            const eventsData = await common.db.collection('events').findOne({'_id': common.db.ObjectID(appId)});

            if (!eventsData.map) {
                eventsData.map = {};
            }

            events.forEach(e=>{
                if (eventsData.map && eventsData.map[e]) {
                    eventsData.map[e].category = category;
                }
                else {
                    eventsData.map[e] = {category: category};
                }
            });

            await common.db.collection('events').update(
                {'_id': common.db.ObjectID(appId)},
                {$set: {map: eventsData.map}}
            );

            events.forEach(event=>{
                plugins.dispatch("/systemlogs",
                    {
                        params: ob.params,
                        action: "dm-event-edit",
                        data: {
                            ev: event,
                            category: category
                        }
                    });
            });
            common.returnOutput(ob.params, "Success");
        }
        catch (e) {
            log.e(e);
            common.returnMessage(ob.params, 500, "Error");
        }
    });
    return true;
});