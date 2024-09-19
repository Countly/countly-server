/**
 *  Description: This script is used to merge users based on username.
 *  Server: countly
 *  Path: $(countly dir)/bin/scripts/fix-data
 *  Command: node user-merge.js
 */
var pluginManager = require("../../../plugins/pluginManager.js");
var appUsers = require("../../../api/parts/mgmt/app_users.js");
var common = require("../../../api/utils/common.js");

console.log("Merging app users");

var COLLECTION_NAME = "";
var APP_ID = "";

var READ_LIMIT = 100;
var RETRY_LIMIT = 3;
var READ_COUNTER = 0;
var UPDATE_COUNTER = 0;

//Number of requests to be made before checking record count in app_user_merges
var UPDATE_LIMIT = 100;
//Number of records in app_user_merges after which script will sleep
var RECORD_COUNT_LIMIT = 10;
//Cooldown period if record count exceeds limit
var RECORD_OVERLOAD_SLEEP = 2000;
//Cooldown period between requests
var COOLDOWN_PERIOD = 1000;

const sleep = m => new Promise((r) => {
    //console.log("Cooling period for " + m + " seconds!");
    setTimeout(r, m);
});

pluginManager.dbConnection("countly").then(async(countlyDb) => {
    try {

        common.db = countlyDb;

        await cursor();

        console.log("Total updates on the server - ", UPDATE_COUNTER);
        console.log("Script ran successfully!");
        common.db.close();
        process.exit(1);
    }
    catch (e) {
        console.log("Error while running script ", e);
        common.db.close();
        process.exit(1);
    }

    async function cursor() {
        var query = {};

        var projections = {};

        var usernames = {};

        var cursor = common.db.collection(COLLECTION_NAME).find(query).project(projections);

        var total = await cursor.count();
        console.log("Total data length ", total);

        return new Promise(function(resolve) {
            cursor.forEach(function(doc) {
                if (!doc.username) {
                    return;
                }

                var username = doc.username.trim();

                if (!username.length) {
                    return;
                }

                if (!usernames[username]) {
                    usernames[username] = [];
                }

                READ_COUNTER += 1;

                if (READ_COUNTER % READ_LIMIT === 0) {
                    console.log("Users read - " + READ_COUNTER + ".");
                }

                usernames[username].push(doc);

            }, async function() {
                console.log("Users read - " + READ_COUNTER + ".");

                for (var key in usernames) {
                    var users = usernames[key];

                    if (users.length > 1) {
                        await prepareRequest(users);
                    }
                }

                resolve();
            });
        });
    }

    async function prepareRequest(users) {
        //Main user is the one with the highest ls or lac fields
        var mainUser = users.reduce(function(prev, current) {
            var currentMax = Math.max(current.ls, current.lac);
            var prevMax = Math.max(prev.ls, prev.lac);
            return currentMax > prevMax ? current : prev;
        });

        if (mainUser && mainUser.did) {
            users = users.filter(function(u) {
                return u.uid !== mainUser.uid;
            });

            for (var j = 0; j < users.length; j++) {
                var retryCounter = 0;
                var success = false;

                while(!success && retryCounter < RETRY_LIMIT) {
                    await new Promise(function(resolve) {
                        var newUser = JSON.parse(JSON.stringify(mainUser));
    
                        appUsers.merge(APP_ID, newUser, newUser._id, users[j]._id, newUser.did, users[j].did, function(err) {
                            if (err) {
                                console.log("Error while merging - ", err);
                                retryCounter += 1;
                            }
                            else {
                                success = true;
                            }
    
                            resolve();
                        });
                    });
                    await sleep(COOLDOWN_PERIOD);
                }

                if (success) {
                    if (retryCounter > 0) {
                        console.log("User ", users[j].uid, " merged successfully after ", retryCounter, " retries.");
                    }
                    UPDATE_COUNTER += 1;
                    if (UPDATE_COUNTER % UPDATE_LIMIT === 0) {
                        await checkRecordCount();
                    }
                }
                else {
                    console.log("Retry limit exceeded for users ", mainUser.uid, " and ", users[j].uid);
                }
            }

            console.log("Total " + users.length + " users (" + users.map(function(u) {
                return u.uid;
            }) + ") merged into user ", mainUser.uid + ".");
        }
        else {
            console.log("No main user found - ", users.map(function(u) {
                return u.uid;
            }));
        }
    }

    async function checkRecordCount() {
        var recordCount = await common.db.collection("app_user_merges").countDocuments();
        console.log("Record count in app_user_merges: ", recordCount);

        while (recordCount > RECORD_COUNT_LIMIT) {
            console.log("Record count exceeds limit. Sleeping for " + RECORD_OVERLOAD_SLEEP/1000 + "seconds.");
            await sleep(RECORD_OVERLOAD_SLEEP);
            recordCount = await common.db.collection("app_user_merges").countDocuments();
        }
    }
});