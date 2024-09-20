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

var RETRY_LIMIT = 3;
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

        const duplicates = await common.db.collection(COLLECTION_NAME).aggregate([
            {
                $group: {
                    _id: "$username",
                    count: { $sum: 1 }
                }
            },
            {
                $match: {
                    count: { $gt: 1 },
                    _id: { $ne: null }
                }
            }
        ]).toArray();

        console.log("Found", duplicates.length, "duplicate username groups.");

        for (var i = 0; i < duplicates.length; i++) {

            var mainUser = null;
            var mergedUsersUIDs = [];

            var query = {
                username: duplicates[i]._id
            };

            var projections = {};

            var sort = { ls: -1 };

            var cursor = common.db.collection(COLLECTION_NAME).find(query).project(projections).sort(sort);

            while (await cursor.hasNext()) {
                var doc = await cursor.next();

                if (doc.uid && doc.uid !== "") {
                    if (!mainUser) {
                        mainUser = doc;
                    }
                    else {
                        await mergeUsers(mainUser, doc);
                        mergedUsersUIDs.push(doc.uid);
                    }
                }
            }

            if (mergedUsersUIDs.length > 0) {
                console.log("Total", mergedUsersUIDs.length, "users merged into user", mainUser.uid, ": (", mergedUsersUIDs.join(", "), ")");
            }
        }
    }

    async function mergeUsers(mainUser, user) {
        var retryCounter = 1;
        var success = false;

        while (!success && retryCounter < RETRY_LIMIT) {
            await new Promise(function(resolve) {
                var newUser = JSON.parse(JSON.stringify(mainUser));

                appUsers.merge(APP_ID, newUser, newUser._id, user._id, newUser.did, user.did, function(err) {
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
            if (retryCounter > 1) {
                console.log("User ", user.uid, " merged successfully after ", retryCounter, " retries.");
            }
            UPDATE_COUNTER += 1;
            if (UPDATE_COUNTER % UPDATE_LIMIT === 0) {
                await checkRecordCount();
            }
        }
        else {
            console.log("Retry limit exceeded for users ", mainUser.uid, " and ", user.uid);
        }
    }

    async function checkRecordCount() {
        var recordCount = await common.db.collection("app_user_merges").countDocuments();
        console.log("Record count in app_user_merges: ", recordCount);

        while (recordCount > RECORD_COUNT_LIMIT) {
            console.log("Record count exceeds limit. Sleeping for " + RECORD_OVERLOAD_SLEEP / 1000 + "seconds.");
            await sleep(RECORD_OVERLOAD_SLEEP);
            recordCount = await common.db.collection("app_user_merges").countDocuments();
        }
    }
});