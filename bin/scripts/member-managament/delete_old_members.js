/*
Script should be placed in ./bin/scripts/member-managament/delete_old_members.js

Script calls Countly API endpoint to trigger member deletion for members, which have not been active for given amount of time;
Query is editable to delete based on different criteria.
*/
var pluginManager = require('./../../../plugins/pluginManager.js');
var request = require('countly-request')(pluginManager.getConfig("security"));
var Promise = require("bluebird");


var SERVER_URL = "";
var API_KEY = "";
var dry_run = false; //if set true, there will be only information outputted about users like that, but deltetion will not be triggered.
var days = 30;

//query states not logged in in last N days , but logged in at least once

var ts = Math.round(Date.now() / 1000) - days * 24 * 60 * 60;
var query = {"$and": [{"last_login": {"$lt": ts}}, {"last_login": {"$exists": true}}]};

//although mogodb does not return null on $lt, keep like above for safety

var errored = 0;
if (dry_run) {
    console.log("This is dry run");
    console.log("Members will be only listed, not deleted");
}
Promise.all([pluginManager.dbConnection("countly")]).spread(function(countlyDb) {
    countlyDb.collection("members").aggregate([{"$match": query}, {"$project": {"_id": true, "email": true, "username": true, "full_name": true}}], {allowDiskUse: true}, function(err, res) {
        if (err) {
            console.log(err);
        }

        Promise.each(res, function(data) {
            return new Promise(function(resolve) {
                console.log(JSON.stringify(data));
                if (dry_run) {
                    resolve();
                }
                else {
                    sendRequest({
                        requestType: 'POST',
                        Url: SERVER_URL + "/i/users/delete",
                        body: {
                            api_key: API_KEY,
                            args: JSON.stringify({user_ids: [(data._id + "")]})
                        }
                    }, function(data) {
                        if (data.err) {
                            console.log(JSON.stringify(data));
                            errored++;
                        }
                        resolve();
                    });
                }
            });
        }).then(function() {
            if (errored > 0) {
                console.log(errored + " requests failed");
            }
            console.log("ALL done");
            countlyDb.close();
        }).catch(function(rejection) {
            console.log("Error");
            console.log("Error:", rejection);
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