/**
 * This script deletes all the users as specified in the var[QUERY] variable
 * Will delete only var[USER_DELETE_LIMIT] no. of users in a single go,
 * since user deletion is a background and db intensive process, 
 * it is suggested to run this script as a cron after 1 to 2 hours interval
 * 
 * RUN in node.js
 * Path : COUNTLY ROOT dir [`countly dir`] 
 * out_dir : good ol console :D, you should probably save the output anyway, specially in case of errors
 */
/* ****************************
 * Change these vars
 * ****************************/
var SERVER_URL = "https://server.count.ly";
var APP_ID = "APP_ID";
var API_KEY = "API_KEY";
var USER_DELETE_LIMIT = 200;
/* ****************************
 * END of vars
 * ****************************/
// Do not edit this QUERY unless you want to change the deletion parameters
var QUERY = {
    "ls": { "$exists": false }, // last seen not set
    "fs": { "$exists": false }, // first seen not set
    "tsd": { "$exists": false }, // total session duration not set
    "hasInfo": { "$ne": true } // anonymous user
};
var pluginManager = require("./plugins/pluginManager.js");
var request = require('request');
var DB = 'countly';
var COLLECTION_NAME = "app_users" + APP_ID; // do not change
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
            json: true,
            body: body,
            strictSSL: false
        };
        request(options, function(error, response) {
            if (error || !response) {
                console.log(JSON.stringify(error));
                callback({err: 'There was an error while sending a request.', code: response});
            }
            else if (response.statusCode === 200 || response.statusCode === 201) {
                callback(response.body);
            }
            else {
                callback({err: 'There was an error while sending a request.', code: response.statusCode, response: response});
            }
        });
    }
    catch (e) {
        console.log(e);
        callback({"err": 'Failed to send'});
    }
}
// start script
pluginManager.dbConnection(DB).then(async(countlyDb) => {
    try {
        console.log("Deleting unknown app users");
        var query = QUERY;
        var projections = { uid: 1 };
        var users = await countlyDb.collection(COLLECTION_NAME).find(query).project(projections).limit(USER_DELETE_LIMIT).toArray();
        var uids = users.map(u => u.uid);
        if (uids.length) {
            await new Promise(function(resolve) {
                sendRequest({
                    requestType: 'POST',
                    Url: SERVER_URL + "/i/app_users/delete",
                    body: {
                        app_id: APP_ID,
                        api_key: API_KEY,
                        query: {"uid": {"$in": uids}},
                        force: true
                    }
                }, function(data) {
                    if (data.err) {
                        console.log(JSON.stringify(data));
                    }
                    resolve();
                });
            });
        }
        else {
            console.log('NOTHING TO DELETE');
        }
        console.log("Script ran successfully!!!");
        countlyDb.close();
        process.exit(0);
    }
    catch (e) {
        console.log("Error while running script ", e);
        countlyDb.close();
        process.exit(1);
    }
});