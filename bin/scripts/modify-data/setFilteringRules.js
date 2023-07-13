/**
 * Script to set block filtering rule for list of events.
 * Rule is applied to all apps.
 * Server: countly server
 * Path: countly/bin/scripts/modify-data
 * Command: node setFilteringRules.js
 */

var pluginManager = require('./../../../plugins/pluginManager.js');
var request = require('request');
var Promise = require("bluebird");

var SERVER_URL = "https://yourpage.count.ly"; //Your server url. Has to be accessable from the machine where this script is run
var API_KEY = "7e320fb5dd4af5bf123456e776474ef1"; //Any global admin API key
var eventKeysToBlock = ["Share Score", "Invite Friends"]; //List of event keys for events to block

//get database connections for countly and countly_drill
Promise.all([pluginManager.dbConnection("countly")]).spread(function(countlyDb) {
    //get list of apps
    countlyDb.collection("apps").find({}, {"_id": true, "name": true}).toArray(function(err, apps) {
        //get list of collections
        Promise.each(apps, function(app) {
            console.log("processing app:" + app.name + "(" + app._id + ")");
            return new Promise(function(resolveTop) {
                var blockUs = [];
                countlyDb.collection("events").findOne({"_id": countlyDb.ObjectID(app._id + "")}, {"list": true}, function(err, eventsDb) {
                    eventsDb = eventsDb || {};
                    eventsDb.list = eventsDb.list || [];
                    if (err) {
                        console.log(err);
                    }
                    for (var z = 0; z < eventKeysToBlock.length; z++) {
                        if (eventsDb.list.indexOf(eventKeysToBlock[z]) !== -1) {
                            blockUs.push(eventKeysToBlock[z]);
                        }
                    }

                    if (blockUs.length > 0) {
                        Promise.each(blockUs, function(eventKey) {
                            var data = JSON.stringify({"is_arbitrary_input": false, "key": eventKey, "name": "", "rule": {}, "status": true, "type": "event", "app_id": app._id});
                            return new Promise(function(resolve) {
                                sendRequest({
                                    requestType: 'GET',
                                    Url: SERVER_URL + "/i/blocks/create?api_key=" + API_KEY + "&app_id=" + app._id + "&blocks=" + data,
                                    body: {
                                    }
                                }, function(data) {
                                    if (data && data.err) {
                                        console.log(data.err);
                                    }
                                    else {
                                        console.log("blocked " + eventKey);
                                    }
                                    resolve();
                                });
                            });
                        }).then(function() {
                            console.log("app " + app._id + " processed");
                            resolveTop();
                        }).catch(function(rejection) {
                            console.log("Error:", rejection);
                            resolveTop();
                        });
                    }
                    else {
                        console.log("Nothing to block for this app");
                        resolveTop();
                    }
                });
            });
        }).then(function() {
            console.log("Done");
            countlyDb.close();
        }).catch(function(err) {
            console.log(err);
            countlyDb.close();
        });
    });
});


function sendRequest(params, callback) {
    try {
        let body = {};

        //add dynamic values to body

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
                console.log(JSON.stringify(response));
                console.log(JSON.stringify(error));
                callback({err: 'There was an error while sending a request.', code: response});
            }
            else if (response.statusCode === 200 || response.statusCode === 201) {
                callback(response.body);
            }
            else {
                //console.log(JSON.stringify(response));
                //console.log(JSON.stringify(error));
                var err = "There was an error while sending a request";
                if (response.body && response.body.result) {
                    err = response.body.result;
                }
                callback({err: err, code: response.statusCode});
            }
        });

    }
    catch (e) {
        console.log(e);
        callback({"err": 'Failed to send'});
    }
}