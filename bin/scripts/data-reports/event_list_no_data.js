/**
 *  Return list of events that have no data in drill_events collection for each app
 *  Server: countly
 *  Path: $(countly dir)/bin/scripts/data-reports
 *  Command: node event_list_no_data.js
 */

const pluginManager = require('../../../plugins/pluginManager.js'),
    common = require('../../../api/utils/common.js'),
    crypto = require('crypto');

Promise.all([pluginManager.dbConnection("countly"), pluginManager.dbConnection("countly_drill")]).then(async function([countlyDb, drillDb]) {

    var empty_event_list = [];

    try {
        var apps = await countlyDb.collection('apps').find({}, {_id: 1, name: 1}).toArray();
        if (apps.length == 0) {
            console.log("No apps");
        }
        else {
            for (const app of apps) {
                var obj = {app_id: app._id, app_name: app.name, events: []};
                try {
                    var events = await countlyDb.collection('events').findOne({_id: countlyDb.ObjectID(app._id)});
                    if (events && events.list) {
                        for (const event of events.list) {
                            try {
                                let eventKey = common.fixEventKey(event);
                                let collection = "drill_events" + crypto.createHash('sha1').update(eventKey + app._id).digest('hex');
                                var drill_events = await drillDb.collection(collection).count();
                                if (drill_events == 0) {
                                    obj.events.push(event);
                                }
                            }
                            catch (err) {
                                console.log(err);
                            }
                        }
                        if (obj.events.length > 0) {
                            empty_event_list.push(obj);
                        }
                    }
                    else {
                        //console.log("No events");
                    }
                }
                catch (err) {
                    console.log(err);
                }
            }
        }
    }
    catch (err) {
        console.log(err);
    }
    finally {
        console.log(JSON.stringify(empty_event_list));
        countlyDb.close();
        drillDb.close();
    }
});
