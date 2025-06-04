/**
 *  Description: This script merges users if they match on any fields configured in the script.
 *  configure - processAllFields function to add or remove fields for merging.
 *  Server: countly
 *  Path: $(countly dir)/bin/scripts/fix-data
 *  Command: node user-merge.js --no-dry-run
 */
var pluginManager = require("../../../plugins/pluginManager.js");
var appUsers = require("../../../api/parts/mgmt/app_users.js");
var common = require("../../../api/utils/common.js");

var APP_ID = "";
var COLLECTION_NAME = "app_users" + APP_ID;

if (!APP_ID) {
    console.error("Please set APP_ID variable to the ID of the app you want to merge users for.");
    process.exit(1);
}

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

// Check for dry run flag
let DRY_RUN = true;
if (process.argv.includes('--no-dry-run')) {
    DRY_RUN = false;
}
console.log(DRY_RUN ? "Running in DRY RUN mode - no actual merges will be performed" : "Running in LIVE mode - merges will be performed");

console.log("Merging app users");

const sleep = m => new Promise((r) => {
    setTimeout(r, m);
});

pluginManager.dbConnection("countly").then(async(countlyDb) => {
    try {
        common.db = countlyDb;
        await processAllFields();
        console.log("Total potential merges found - ", UPDATE_COUNTER);
        if (DRY_RUN) {
            console.log("Dry run completed - no actual merges were performed");
        }
        else {
            console.log("All merges completed successfully!");
        }
        common.db.close();
        process.exit(0);
    }
    catch (e) {
        console.log("Error while running script ", e);
        common.db.close();
        process.exit(1);
    }

    async function processAllFields() {
        //await processDuplicates('email'); we can also run multiple merges one after the other based on different fields
        await processDuplicates('name');
    }

    async function processDuplicates(field) {
        console.log(`\nProcessing duplicates by ${field}`);

        const duplicates = await common.db.collection(COLLECTION_NAME).aggregate([
            {
                $match: {
                    [field]: { $nin: [null, ""], $exists: true } // Only match non-null, non-empty values
                }
            },
            {
                $group: {
                    _id: `$${field}`,
                    count: { $sum: 1 }
                }
            },
            {
                $match: {
                    count: { $gt: 1 }
                }
            }
        ]).toArray();

        console.log(`Found ${duplicates.length} duplicate groups for ${field}`);

        for (const duplicate of duplicates) {
            const query = { [field]: duplicate._id };

            const cursor = common.db.collection(COLLECTION_NAME)
                .find(query)
                .sort({ lac: -1 })
                .cursor();

            let mainUser = null;
            let mergedUIDs = 0;

            console.log(`\n${DRY_RUN ? '[DRY RUN] Would merge' : 'Merging'} users matching ${field}: "${duplicate._id}"`);

            for await (const user of cursor) {
                if (!mainUser) {
                    mainUser = user;
                    console.log('Main user would be:', {
                        uid: mainUser.uid,
                        email: mainUser.email || "null",
                        phone: mainUser.phone || "null",
                        name: mainUser.name || "null",
                        last_action: formatLac(mainUser.lac)
                    });
                    continue;
                }

                if (user.uid && user.uid !== "") {
                    console.log('Would merge user:', {
                        uid: user.uid,
                        email: user.email || "null",
                        phone: user.phone || "null",
                        name: user.name || "null",
                        last_action: formatLac(user.lac)
                    });

                    if (!DRY_RUN) {
                        await mergeUsers(mainUser, user);
                    }
                    mergedUIDs++;
                    UPDATE_COUNTER++;
                }
            }

            if (mergedUIDs > 0) {
                console.log(`${DRY_RUN ? '[DRY RUN] Would merge' : 'Merged'} ${mergedUIDs} users into ${mainUser.uid}`);
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
            if (UPDATE_COUNTER % UPDATE_LIMIT === 0) {
                await checkRecordCount();
            }
        }
        else {
            console.log("Retry limit exceeded for users ", mainUser.uid, " and ", user.uid);
        }
    }

    async function checkRecordCount() {
        if (DRY_RUN) {
            return;
        }

        var recordCount = await common.db.collection("app_user_merges").countDocuments();
        console.log("Record count in app_user_merges: ", recordCount);

        while (recordCount > RECORD_COUNT_LIMIT) {
            console.log("Record count exceeds limit. Sleeping for " + RECORD_OVERLOAD_SLEEP / 1000 + " seconds.");
            await sleep(RECORD_OVERLOAD_SLEEP);
            recordCount = await common.db.collection("app_user_merges").countDocuments();
        }
    }

    function formatLac(timestamp) {
        if (!timestamp) {
            return null;
        }
        if (Math.round(timestamp).toString().length === 10) {
            timestamp *= 1000;
        }
        return new Date(timestamp);
    }
});