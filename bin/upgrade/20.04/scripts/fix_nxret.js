var pluginManager = require('../../../../plugins/pluginManager.js'),
    asyncjs = require('async');

function printMessage(messageType, ...message) {
    console[messageType]('[nxret._id <- nxret.uid][' + messageType + '] ', ...message);
}

printMessage("log", "Started...");
pluginManager.dbConnection().then((countlyDb) => {
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
    
            var originalColId = 'app_nxret' + app._id;
            var fixedColId = "fixed_app_nxret" + app._id;
    
            function getOneDoc(collectionId, callback) {
                countlyDb.collection(collectionId).findOne({}, function(err, result) {
                    if (err) {
                        printMessage("error", "(" + app.name + ") Error at getOneDoc", err);
                    }
                    if (callback) {
                        callback(err, result || {"notFound": true});
                    }
                });
            }
    
            function checkFixStatus(callback) {
                getOneDoc(originalColId, function(oColErr, oColRes) {
                    if (oColErr) {
                        return callback(true, "error");
                    }
                    getOneDoc(fixedColId, function(fColErr, fColRes) {
                        if (fColErr) {
                            return callback(true, "error");
                        }
                        if (oColRes.notFound !== true && fColRes.notFound !== true) {
                            if (!Object.prototype.hasOwnProperty.call(fColRes, "_id") ||
                                !Object.prototype.hasOwnProperty.call(fColRes, "uid")) {
                                printMessage("error", "(" + app.name + ") Error at checkFixStatus: Fixed collection document has missing properties.", fColRes);
                                return callback(true, "error");
                            }
                            if (fColRes._id === fColRes.uid) {
                                printMessage("log", "(" + app.name + ") Needs rename");
                                callback(null, "rename");
                            }
                            else {
                                printMessage("error", "(" + app.name + ") Error at checkFixStatus: Fixed collection has item with _id != uid (unexpected).");
                                callback(true, "error");
                            }
                        }
                        else if (oColRes.notFound === true && fColRes.notFound === true) {
                            printMessage("log", "(" + app.name + ") Both collections are empty.");
                            callback(null, "skip");
                        }
                        else if (oColRes.notFound !== true) {
                            if (!Object.prototype.hasOwnProperty.call(oColRes, "_id") ||
                                !Object.prototype.hasOwnProperty.call(oColRes, "uid")) {
                                printMessage("error", "(" + app.name + ") Error at checkFixStatus: Original collection document has missing properties.", oColRes);
                                return callback(true, "error");
                            }
                            if (oColRes._id === oColRes.uid) {
                                printMessage("log", "(" + app.name + ") App already fixed.");
                                callback(null, "skip");
                            }
                            else {
                                printMessage("log", "(" + app.name + ") Needs complete fix");
                                callback(null, "fix");
                            }
                        }
                        else if (fColRes.notFound !== true) {
                            printMessage("log", "(" + app.name + ") Warning at checkFixStatus: Only fixed collection exists (unexpected).");
                            printMessage("log", "(" + app.name + ") Needs rename");
                            callback(null, "rename");
                        }
                    });
                });
            }
    
            function fixCollection(callback) {
                var pipeline = [
                    {
                        $group: {
                            "_id": "$uid",
                            "min_fs": {$min: "$fs"},
                            "candidates": {$push: "$$ROOT"}
                        }
                    },
                    {
                        $addFields: {
                            candidates: {
                                $filter: {
                                    input: '$candidates',
                                    as: "cand",
                                    cond: { $eq: [ "$$cand.fs", '$$ROOT.min_fs'] }
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            'winner': { $arrayElemAt: [ "$candidates", 0 ] }
                        }
                    },
                    {
                        $replaceRoot: {
                            'newRoot': '$winner'
                        }
                    },
                    {
                        $addFields: {
                            '_id': '$uid'
                        }
                    },
                    {
                        $out: fixedColId
                    }
                ];
                printMessage("log", "(" + app.name + ") Fixing collection...");
                countlyDb.collection(originalColId).aggregate(pipeline, {allowDiskUse: true}, function(err, res) {
                    if (err) {
                        printMessage("error", "(" + app.name + ") Error at fixCollection", err);
                    }
                    else {
                        printMessage("log", "(" + app.name + ") Fixed collection.");
                    }
                    if (callback) {
                        callback(err, res);
                    }
                });
            }
    
            function ensureUidIndex(collectionId, callback) {
                printMessage("log", "(" + app.name + ") Ensuring uid index...");
                countlyDb.collection(collectionId).ensureIndex({ "uid": 1 }, function(err) {
                    if (err) {
                        printMessage("log", "(" + app.name + ") Error at ensureUidIndex", err);
                    }
                    else {
                        printMessage("log", "(" + app.name + ") Ensured uid index.");
                    }
                    if (callback) {
                        callback(err);
                    }
                });
            }
    
            function renameCollection(callback) {
                printMessage("log", "(" + app.name + ") Renaming collection...");
                countlyDb.collection(fixedColId).rename(originalColId, {dropTarget: true}, function(err) {
                    if (err) {
                        printMessage("error", "(" + app.name + ") Error at renameCollection", err);
                        if (callback) {
                            callback(err);
                        }
                    }
                    else {
                        printMessage("log", "(" + app.name + ") Renamed collection.");
                        ensureUidIndex(originalColId, callback);
                    }
                });
            }
    
            function finalizeApp(err, res) {
                if (err) {
                    hasAnyErrors = true;
                    printMessage("error", "----------------------------------------------");
                    printMessage("error", "(" + app.name + ")", "ERRORS, see previous", "\n");
                }
                else {
                    if (res) {
                        printMessage("log", "(" + app.name + ") Result", res);
                    }
                    printMessage("log", "(" + app.name + ")", "Successful.", "\n");
                }
                return done();
            }
    
            (function runFix() {
                checkFixStatus(function(err, action) {
                    if (err || action === "error") {
                        finalizeApp(true);
                    }
                    else if (action === "skip") {
                        printMessage("log", "(" + app.name + ")", "Skipping...");
                        finalizeApp(false);
                    }
                    else if (action === "rename") {
                        renameCollection(function(err) {
                            finalizeApp(err);
                        });
                    }
                    else if (action === "fix") {
                        fixCollection(function(fixErr) {
                            if (fixErr) {
                                return finalizeApp(fixErr);
                            }
                            renameCollection(function(renameErr) {
                                finalizeApp(renameErr);
                            });
                        });
                    }
                });
            })();
        }
    });
});