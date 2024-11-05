/**
 *  Description: Delete old views (before a certain date).
 *  Server: countly
 *  Path: $(countly dir)/bin/scripts/data-cleanup
 *  Command: node delete_old_views.js
 */

const pluginManager = require('../../../plugins/pluginManager.js');
const drillCommon = require('../../../plugins/drill/api/common.js');

const moment = require('moment-timezone');
const request = require('countly-request')(pluginManager.getConfig('security'));
const { ObjectId } = require('mongodb');

//
const DRY_RUN = false; //set to true to test the script without deleting any data
//
const API_KEY = ""; //API key here with permission to delete views
const SERVER_URL = ""; //countly server URL
//
const APP_LIST = []; //valid app_ids here. If an empty array is passed, the script will process all apps.
const EXPIRATION_DATE = "2024-03-10"; //expiration date for the data
const COOLDOWN_TIME = 5000; //cooldown time between requests in ms
//
var deleted_views = {};
var event = "[CLY]_view";
//

Promise.all([pluginManager.dbConnection("countly"), pluginManager.dbConnection("countly_drill")]).then(async function([countlyDb, drillDb]) {
    console.log("Connected to databases...");
    try {
        // GET APP LIST
        const apps = await getAppList({db: countlyDb});
        if (!apps || !apps.length) {
            return close();
        }
        else {
            console.log(apps.length + " app(s) to process");
            // FOR EACH APP
            for (let i = 0; i < apps.length; i++) {
                var app = apps[i];
                deleted_views[app._id] = [];
                console.log(i + 1, ") Processing app:", app.name);
                try {
                    await processCursor(app);
                }
                catch (err) {
                    console.log("Error processing app: ", app.name, err);
                }
            }
            console.log("Deleted views per app: ", deleted_views);
        }
    }
    catch (err) {
        close(err);
    }
    finally {
        close();
    }

    async function processCursor(app) {
        // FETCH DATA
        try {
            var session, drillSession;
            //start sessions
            session = await countlyDb.client.startSession();
            drillSession = await drillDb.client.startSession();
            //SET EXPIRATION TIMESTAMP
            var expiration_timestamp = moment(EXPIRATION_DATE).tz(app.timezone).endOf('day').valueOf();
            var collectionName = drillCommon.getCollectionName(event, app._id);
            var cursor = session.client.db("countly").collection("app_viewsmeta" + app._id).find({checked: {$exists: false}});
            var refreshTimestamp = new Date();
            try {
                while (cursor && await cursor.hasNext()) {
                    console.log("Timestamp:", new Date());
                    //refresh session every 5 minutes
                    if ((new Date() - refreshTimestamp) / 1000 > 1) {
                        console.log("Refreshing session");
                        try {
                            await session.client.db("countly").admin().command({ refreshSessions: [session.id] });
                            await drillSession.client.db("countly_drill").admin().command({ refreshSessions: [drillSession.id] });
                            refreshTimestamp = new Date();
                        }
                        catch (err) {
                            console.log("Error refreshing sessions: ", err);
                            break;
                        }
                    }
                    //get next view
                    let view = await cursor.next();
                    //Find one drill entry for the view with timestamp greater than expiration date
                    var drillEntry = await drillSession.client.db("countly_drill").collection(collectionName).findOne({"sg.name": view.view, "ts": { $gt: expiration_timestamp }}, {ts: 1});
                    var drillEntry2 = await drillSession.client.db("countly_drill").collection("drill_events").findOne({"a": app._id + "", "e": event, "sg.name": view.view, "ts": { $gt: expiration_timestamp }}, {ts: 1});
                    //If no entry found, delete the view
                    if (!drillEntry && !drillEntry2) {
                        console.log("Deleting view: ", view.view);
                        if (!DRY_RUN) {
                            await new Promise(function(resolve) {
                                sendRequest({
                                    requestType: 'POST',
                                    Url: SERVER_URL + "/i/views",
                                    body: {
                                        app_id: app._id,
                                        api_key: API_KEY,
                                        method: "delete_view",
                                        view_id: view._id,
                                    }
                                }, function(err) {
                                    if (err) {
                                        console.log(JSON.stringify(err));
                                    }
                                    else {
                                        deleted_views[app._id].push(view.view);
                                    }
                                    resolve();
                                });
                            });
                            await sleep(COOLDOWN_TIME);
                        }
                    }
                    else {
                        //flag the view as checked
                        await session.client.db("countly").collection("app_viewsmeta" + app._id).updateOne({_id: view._id}, {$set: {checked: true}});
                    }
                }
            }
            catch (cursorError) {
                console.log("Cursor error: ", cursorError);
                cursor.close();
                console.log("Restarting sessions..");
                await processCursor(app);
            }
        }
        catch (sessionError) {
            console.log("Session error: ", sessionError);
            await sleep(1000);
            console.log("Restarting sessions...");
            await processCursor(app);
        }
        finally {
            if (session) {
                session.endSession();
            }
            if (drillSession) {
                drillSession.endSession();
            }
        }
    }

    async function getAppList(options) {
        var query = {};
        if (APP_LIST && APP_LIST.length > 0) {
            var listed = [];
            for (var z = 0; z < APP_LIST.length; z++) {
                listed.push(ObjectId(APP_LIST[z]));
            }
            query = {_id: {$in: listed}};
        }

        try {
            let apps = await options.db.collection("apps").find(query).toArray();
            return apps;
        }
        catch (err) {
            console.log("Error getting apps: ", err);
            return [];
        }

    }

    function close(err) {
        if (err) {
            console.log("Finished with errors: ", err);
        }
        else {
            console.log("Finished successfully.");
        }
        countlyDb.close();
        drillDb.close();
    }

    /**
 * Function to senmd simulated request to countly server
 * 
 * @param {*} params params Object
 * @param {*} callback callback fn
 */
    function sendRequest(params, callback) {
        try {
            let body = {};

            const requestBodyKeys = params.body ? Object.keys(params.body) : [];
            for (let i = 0; i < requestBodyKeys.length; i++) {
                var requestKey = requestBodyKeys[i];
                body[requestKey] = params.body[requestKey];
            }
            const url = new URL(params.Url || SERVER_URL);
            const requestParamKeys = params.requestParamKeys ? Object.keys(params.requestParamKeys) : [];
            if (requestParamKeys.length > 0) {
                for (let z = 0; z < requestParamKeys.length; z++) {
                    const requestParamKey = requestParamKeys[z];
                    const requestParamValue = Object.values(params.requestParamKeys)[z];
                    url.searchParams.append(requestParamKey, requestParamValue);
                }
            }
            const options = {
                uri: url.href,
                method: params.requestType,
                json: body,
                strictSSL: false
            };
            request(options, function(error, responseBody, response) {
                if (response && response.result) {
                    callback(null);
                }
                else {
                    callback(error);
                }
            });
        }
        catch (e) {
            console.log(e);
            callback({"err": 'Failed to send'});
        }
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
});
