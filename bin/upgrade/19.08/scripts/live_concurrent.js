var pluginManager = require('../../../../plugins/pluginManager.js'),
    async = require('async');

pluginManager.dbConnection().then((countlyDb) => {

    var dataTransferStatus = false,
        liveDisabledStatus = false,
        liveDataDeletedStatus = false,
        newIndexesCreatedStatus = false;

    function printMessage(message){
        console.log('[live -> concurrent_users] ' + message);
    }
    
    function injectNamespace (doc, setObject) {
        if (doc.ns) {
            if (!setObject.$set){
                setObject.$set = {};
            }
            setObject.$set.ns = doc.ns;
        }
        return setObject;
    }

    function execute(){
        printMessage("Copying maximum values...");
        countlyDb.collection('max_online_counts').find({}).toArray(function(err, docs){
            var outputDocs = [];
            if (err) {
                dataTransferStatus = err;
            }
            else {
                var now = Date.now();
                docs.forEach(function(doc) {
                    var appId = doc._id.toString();
                    var rec = {
                        _id : appId + '_overall',
                        mx: doc.ou,
                        ts: now
                    }
                    var rec_new = {
                        _id : appId + '_overall_new',
                        mx: doc.nu,
                        ns: 'new',
                        ts: now
                    }
                    outputDocs.push(rec);
                    outputDocs.push(rec_new);
                    printMessage("Copying " + JSON.stringify(doc) + " -> ["+JSON.stringify(rec_new)+", "+JSON.stringify(rec)+"]");
                });
            }
            writeToConcurrentMax(outputDocs, function(err){
                if (err) {
                    printMessage("Data of live plugin won't be deleted due to errors.");
                    ensureNewIndexes(function(){
                        finalize();
                    });
                }
                else {
                    printMessage("Data of live plugin will be deleted.");
                    ensureNewIndexes(function(){
                        dropLiveCollections();
                    });
                }
            });
        });
    }
    
    function writeToConcurrentMax(docs, callback) {
        if (!docs || docs.length === 0){
            printMessage("No documents were found in 'max_online_counts' collection. Skipping...");
            callback(null);
            return;
        }
        var bulk = countlyDb.collection('concurrent_users_max').initializeUnorderedBulkOp();
    
        docs.forEach(function(doc){
            bulk.find({
                "_id" : doc._id,
            }).upsert().updateOne(injectNamespace(doc, {
                "$max": {
                    mx: 0
                }
            }));
            bulk.find({
                "_id" : doc._id,
                "mx" : {$lt: doc.mx}
            }).updateOne(injectNamespace(doc, {
                "$set": {
                    "ts": doc.ts,
                    "mx": doc.mx
                }
            }));
        });
    
        bulk.execute(function (bulkErr, updateResult) {
            if(bulkErr) {
                printMessage("Bulk write completed with errors: ", bulkErr, updateResult);
                if (bulkErr.writeErrors && Array.isArray(bulkErr.writeErrors)) {
                    bulkErr.writeErrors.forEach(function(wrt){
                        printMessage("\t" + wrt);
                    });
                }
                dataTransferStatus = bulkErr;
                callback(bulkErr);
            }
            else {
                printMessage("Bulk write completed successfully.");
                dataTransferStatus = true;
                callback(null);
            }
        });
    }
    
    function ensureNewIndexes(callback) {
        countlyDb.collection('apps').find({}).toArray(function (err, apps) {
            if (err) {
                printMessage(err);
                callback(err);
                return;
            }
            function upgrade(app, done){
                printMessage("Creating indexes for concurrent new users " + app.name);
                countlyDb.collection('concurrent_users_new' + app._id).ensureIndex({la: 1}, {expireAfterSeconds: 180}, function(err, resp){
                    done(err);
                });
            }
            async.forEach(apps, upgrade, function(err) {
                if (err) {
                    newIndexesCreatedStatus = err;
                }
                else {
                    newIndexesCreatedStatus = true;
                }
                callback();
            });
        });
    }
    
    function dropLiveCollections() {
        countlyDb.collection('apps').find({}).toArray(function (err, apps) {
            if (err) {
                liveDataDeletedStatus = err;
                finalize();
                return;
            }
            var collectionsToBeRemoved = ['max_online_counts', 'online_users'];
            apps.forEach(function(app) {
                collectionsToBeRemoved.push('live_data' + app._id);
            });
            function dropCol(collection, done){
                countlyDb.collection(collection).drop(function(err, resp){
                    if (resp === true){
                        printMessage("Removed collection '" + collection + "'.");
                    }
                    done();
                });
            }
            async.forEach(collectionsToBeRemoved, dropCol, function(){
                printMessage("Collections were removed.");
                liveDataDeletedStatus = true;
                finalize();
            });
        });
    }
    
    function finalize() {
        var states = {
            'Data transfer': dataTransferStatus, 
            //'Live disabled': liveDisabledStatus,
            'Live data deleted': liveDataDeletedStatus,
            'New indexes': newIndexesCreatedStatus
        }
        var hasError = false;
        for(var key in states) {
            if (states[key] === false) {
                printMessage(key+': SKIPPED');
            }
            else if (states[key] === true) {
                printMessage(key+': OK');
            }
            else {
                printMessage(key+': ERROR');
                console.log('\t', states[key]);
                hasError = true;
            }
        }
        if (!hasError) {
            printMessage("Transfer completed successfully.");
        }
        else {
            printMessage("Transfer completed with errors/warnings.");
        }
        countlyDb.close();
    }
    
    execute();
});
