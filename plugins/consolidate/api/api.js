const plugins = require('../../pluginManager.js');
const common = require('../../../api/utils/common.js');
const { processRequest } = require('../../../api/utils/requestProcessor');

//write api call
plugins.register("/sdk/pre", function(ob) {
    if (ob.params.qstring && ob.params.qstring.events) {
        ob.params.preservedEvents = JSON.stringify(ob.params.qstring.events);
    }
    if (ob.params.qstring && ob.params.qstring.old_device_id) {
        ob.params.preservedOldId = ob.params.qstring.old_device_id;
    }
});

plugins.register("/i", async function(ob) {
    try {
        let requestParams = [];
        let consolidateDestinations = [];

        // get config from application document
        if (ob.app.plugins && ob.app.plugins.consolidate && ob.app.plugins.consolidate.length) {
            consolidateDestinations = ob.app.plugins.consolidate;
        }
        else {
            return;
        }

        // get app docs for ob.app.consolidateApps
        const desinationApps = await common.db.collection('apps').find({
            _id: {$in: consolidateDestinations.map((id) => common.db.ObjectID(id))}
        }).toArray();

        // all appIds to which request is being dispatched
        const consolidateAppIds = [...desinationApps.map((app) => app._id + ""), ...(ob.params.qstring.consolidateAppIds || []), ob.params.app._id + ""];

        // create request params for al destinationApps
        desinationApps.forEach((app) =>{
        // prevent cyclic requests
            if (ob.params.qstring && ob.params.qstring.consolidateAppIds && ob.params.qstring.consolidateAppIds.includes(app._id + "")) {
                return;
            }
            // check for same app and populator requests
            if (app._id + "" !== ob.params.app._id + "" && ob.params.qstring && !ob.params.qstring.populator) {
                let data = JSON.parse(JSON.stringify(ob.params.qstring));

                // replace appkey and preserved event data
                data.app_key = app.key;
                data.ip_address = ob.params.ip_address;
                data.events = ob.params.preservedEvents ? JSON.parse(ob.params.preservedEvents) : data.events;
                if (ob.params.preservedOldId) {
                    data.old_device_id = ob.params.preservedOldId;
                }
                // adding list of apps already received the event/data
                data.consolidateAppIds = consolidateAppIds;

                requestParams.push({
                //providing data in request object
                    'req': {
                        url: "/i",
                        body: data,
                        method: "consolidate"
                    },
                    //adding custom processing for API responses
                    'APICallback': function(reqErr, responseData, headers, returnCode) {
                        if (reqErr) {
                            console.log("Problem processing consoldiated request", reqErr, responseData, headers, returnCode);
                        }
                    }
                });
            }
        });

        // dispatch all requests
        if (requestParams.length) {
            requestParams.forEach((params) => {
                processRequest(params);
            });
        }
    }
    catch (e) {
        console.error("Error during consolidation");
        console.error(e);
    }

});

plugins.register('/i/apps/update/plugins/consolidate', async function({app, config}) {
    try {
        console.log('Updating app %s config: %j', app._id, config);
        const addedSourceApps = config.selectedApps;
        const initialSourceApps = config.initialApps;

        if (!addedSourceApps || !initialSourceApps) {
            return "Nothing changed";
        }

        const removedSourceApps = addedSourceApps
            .filter(x => !initialSourceApps.includes(x))
            .concat(initialSourceApps.filter(x => !addedSourceApps.includes(x)));

        // unset removed apps
        await common.db.collection('apps').updateMany(
            {_id: {$in: removedSourceApps.map(id => common.db.ObjectID(id))}},
            {$pull: { 'plugins.consolidate': app._id + ""}}
        );

        // set added apps
        await common.db.collection('apps').updateMany(
            {_id: {$in: addedSourceApps.map(id => common.db.ObjectID(id))}},
            {$addToSet: {'plugins.consolidate': app._id + ""}}
        );

        // get all updated app documents
        const apps = await common.db.collection('apps').find(
            {_id: {$in: [...addedSourceApps, ...removedSourceApps].map(id => common.db.ObjectID(id)) }}
        ).toArray();

        console.log('App %s updated successfully', app._id);

        return apps;
    }
    catch (e) {
        console.error(e);
        throw new Error('Failed to update config');
    }
});