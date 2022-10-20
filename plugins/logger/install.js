var async = require('async'),
    pluginManager = require('../pluginManager.js');

console.log("Installing logger plugin");
pluginManager.dbConnection().then((countlyDb) => {
    countlyDb.collection('apps').find({}).toArray(function(err, apps) {

        if (!apps || err) {
            countlyDb.close();
            return;
        }
        function upgrade(app, done) {
            console.log("Creating logs collection for " + app.name);
            function cb() {
                done();
            }

            countlyDb.command({"listCollections": 1, "filter": {"name": "logs" + app._id }}, function(err, res) {
                if (err) {
                    countlyDb.close();
                    return;
                }
                else {
                    //check if collection capped
                    if (res && res.cursor && res.cursor.firstBatch) {
                        //collection exists
                        if (res.cursor.firstBatch > 0) {
                            if (!res.cursor.firstBatch[0].options.capped) {
                                countlyDb.command({ "convertToCapped": 'logs' + app._id, size: 10000000, max: 1000 }, function(err) {
                                    if (err) {
                                        countlyDb.close();
                                        return;
                                    }
                                    else {
                                        cb();
                                    }
                                });
                            }
                        }
                    }
                    else { //collection does not exist
                        countlyDb.createCollection('logs' + app._id, {capped: true, size: 10000000, max: 1000}, cb);
                    }

                }
            });

            countlyDb.command({ "convertToCapped": 'logs' + app._id, size: 10000000, max: 1000 }, function(err) {
                if (err) {
                    countlyDb.createCollection('logs' + app._id, { capped: true, size: 10000000, max: 1000 }, cb);
                }
                else {
                    cb();
                }
            });
        }
        async.forEach(apps, upgrade, function() {
            console.log("Logger plugin installation finished");
            countlyDb.close();
        });
    });
});