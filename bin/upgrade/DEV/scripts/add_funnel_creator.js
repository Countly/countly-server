const pluginManager = require('../../../../plugins/pluginManager.js');
var ObjectId = require('mongodb').ObjectId;

console.log("Assign creator to funnels from systemlogs");

pluginManager.dbConnection().then((countlyDb) => {
    var requests = [];

    function update(done) {
        if (requests.length > 0) {
            console.log("Flushing changes:" + requests.length);
            countlyDb.collection('funnels').bulkWrite(requests, function(err) {
                if (err) {
                    console.error(err);
                }
                if (done) {
                    console.log("Done");
                    countlyDb.close();
                }
            });
        }
        else if (done) {
            console.log("Done");
            countlyDb.close();

        }
    }

    countlyDb.collection('funnels').find({ $or: [{ 'creator': null }, { 'created': null }] }).toArray(function(err, funnels) {
        if (funnels.length === 0) {
            console.log("No changes");
            countlyDb.close();
        }
        else {
            funnels.forEach(function(funnel, index) {
                countlyDb.collection('systemlogs').findOne({ 'i._id': funnel._id, 'a': "funnel_added" }, function(err, log) {
                    if (err) {
                        console.log(err);
                    }
                    requests.push({
                        'updateOne': {
                            'filter': { '_id': funnel._id },
                            'update': {
                                '$set': {'creator': ObjectId(log.user_id), 'created': log.ts}
                            }
                        }
                    });
                    if (requests.length === 500) {
                        //Execute per 500 operations and re-init
                        update(false);
                        requests = [];
                    }
                    if (index === funnels.length - 1) {
                        update(true);
                    }
                });
            });
        }
    });
});