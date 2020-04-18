var pluginManager = require('../../../../plugins/pluginManager.js'),
    asyncjs = require('async'),
    countlyDb = pluginManager.dbConnection();

function printMessage(messageType, ...message) {
    console[messageType]('[nxret._id <- nxret.uid][' + messageType + '] ', ...message);
}

printMessage("log", "Started...");

countlyDb.collection('apps').find({}).toArray(function(appsErr, apps) {

    var hasAnyErrors = false;

    if (!appsErr && apps) {
        asyncjs.eachSeries(apps, upgrade, function() {
            if (hasAnyErrors) {
                printMessage("error", "-------------------------------------------------");
                printMessage("error", "Finished with ERRORS. Please check previous logs.");
                printMessage("error", "-------------------------------------------------");
            }
            else {
                printMessage("log", "Finished.");
            }
            countlyDb.close();
        });
    }
    else {
        printMessage("error", "Error at app fetch. Stopped. ", appsErr);
        countlyDb.close();
        return;
    }

    function upgrade(app, done) {
        printMessage("log", "(" + app.name + ") Fixing...");
        var cursor = countlyDb.collection('app_nxret' + app._id).find({$expr: {$ne: ["$_id", "$uid"] } });
        var requests = [];
        var nProcessed = 0;
        var nSkipped = 0;
        var bulkWritePromises = [];

        cursor.forEach(function(nxret) {
            if (nxret.uid === null || nxret.uid === undefined) {
                printMessage("log", "(" + app.name + ") Skipping a doc with empty uid");
                nSkipped++;
            }
            else if (nxret._id === nxret.uid) {
                printMessage("log", "(" + app.name + ") Skipping a doc whose _id = uid");
                nSkipped++;
            }
            else {
                var oldId = nxret._id;
                nxret._id = nxret.uid;
                requests.push({
                    insertOne: { "document": nxret }
                });
                requests.push({
                    deleteOne: { "filter": { _id: oldId } }
                });
                if (requests.length === 1000) {
                    bulkWritePromises.push(getBulkWritePromise(requests));
                    requests = [];
                }
                nProcessed++;
            }
        }, function(err) {
            if (err) {
                printMessage("error", "cursor.forEach stopped execution: ", err);
            }
            if (requests.length > 0) {
                bulkWritePromises.push(getBulkWritePromise(requests));
                requests = [];
            }
            Promise.all(bulkWritePromises).then(finalizeApp).catch(function(err) {
                hasAnyErrors = true;
                printMessage("error", err);
                printMessage("error", "----------------------------------------------");
                printMessage("error", "(" + app.name + ")", "ERRORS, see previous", "\n");
                return done();
            });
        });

        function getBulkWritePromise(reqArr) {
            return new Promise(function(resolve/*, reject*/) {
                countlyDb.collection('app_nxret' + app._id).bulkWrite(reqArr, function(err, response) {
                    if (err) {
                        printMessage("error", "Bulk write completed with errors: ", err);
                    }
                    if (response && response.result) {
                        resolve({err: err, result: response.result});
                    }
                    else {
                        resolve({err: err, result: null});
                    }
                });
            }).catch(function(err) {
                printMessage("error", "(" + app.name + ")", "error in Promise:", err);
                return Promise.resolve({err: err, result: null});
            });
        }

        function finalizeApp(responses) {
            var hasError = false;
            var nInserted = 0;
            var nRemoved = 0;
            responses.forEach(function(response) {
                hasError = hasError || response.err;
                if (response.result) {
                    if (response.result.nInserted) {
                        nInserted += response.result.nInserted;
                    }
                    if (response.result.nRemoved) {
                        nRemoved += response.result.nRemoved;
                    }
                }
            });

            if (hasError) {
                hasAnyErrors = true;
                printMessage("error", "----------------------------------------------");
                printMessage("error", "(" + app.name + ")", "ERRORS, see previous", "\n");
            }
            else {
                printMessage("log", "(" + app.name + ")", "processed =", nProcessed, "/", "skipped =", nSkipped);
                if (nProcessed > 0) {
                    printMessage("log", "(" + app.name + ")", "inserted =", nInserted, "/", "removed =", nRemoved);
                }
                if (nProcessed === nInserted && nProcessed === nRemoved) {
                    printMessage("log", "(" + app.name + ")", "Successful.", "\n");
                }
                else {
                    hasAnyErrors = true;
                    printMessage("error", "(" + app.name + ")", "ERROR: processed doesn't match with inserted/removed.", "\n");
                }
            }
            return done();
        }
    }
});