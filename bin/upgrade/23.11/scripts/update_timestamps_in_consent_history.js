var pluginManager = require('../../../../plugins/pluginManager.js'),
    asyncjs = require('async');

console.log("Updating consent_history data");
pluginManager.dbConnection().then((countlyDb) => {
    countlyDb.collection('apps').find({}).toArray(function(err, apps) {
        function update(app, done) {
            console.log("Updating consent_history for " + app.name);
            var cursor = countlyDb.collection('consent_history' + app._id).find({}, {projection: {_id: 1, ts: 1}});
            var requests = [];
            var promises = [];
            cursor.forEach(function(consent) {
                var update = {};
                if (consent.ts && (consent.ts + "").length === 10) {
                    update.ts = Math.round(parseInt(consent.ts, 10) * 1000);
                }
                if (Object.keys(update).length) {
                    requests.push({
                        'updateOne': {
                            'filter': { '_id': consent._id },
                            'update': { '$set': update }
                        }
                    });
                }
                if (requests.length === 500) {
                    //Execute per 500 operations and re-init
                    try {
                        promises.push(countlyDb.collection('consent_history' + app._id).bulkWrite(requests, {ordered: false}));
                    }
                    catch (ex) {
                        console.error(ex);
                    }
                    requests = [];
                }
            }, function() {
                if (requests.length > 0) {
                    try {
                        promises.push(countlyDb.collection('consent_history' + app._id).bulkWrite(requests, {ordered: false}));
                    }
                    catch (ex) {
                        console.error(ex);
                    }
                }
                Promise.all(promises).finally(done);
            });
        }
        asyncjs.eachSeries(apps, update, function() {
            console.log("consent_history data update finished");
            countlyDb.close();
        });
    });
});