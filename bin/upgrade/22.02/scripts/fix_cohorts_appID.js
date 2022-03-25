var pluginManager = require('../../../../plugins/pluginManager.js');

console.log("Fixing app_id in cohorts collection.");
pluginManager.dbConnection().then((countlyDb) => {

    var cursor = countlyDb.collection('cohorts').find({});
    var requests = [];
    cursor.forEach(function(cohort) {
		if (typeof cohort.app_id !== 'string') {
			requests.push({
				'updateOne': {
					'filter': { '_id': cohort._id },
					'update': { '$set': {"app_id": cohort.app_id + ""} }
				}
			});
		}
        if (requests.length === 500) {
            //Execute per 500 operations and re-init
			console.log("Flushing changes:"+requests.length);
            countlyDb.collection('cohorts').bulkWrite(requests, function(err) {
                if (err) {
                    console.error(err);
                }
            });
            requests = [];
        }
    }, function() {
        if (requests.length > 0) {
			console.log("Flushing changes:"+requests.length);
            countlyDb.collection('cohorts').bulkWrite(requests, function(err) {
                if (err) {
                    console.error(err);
                }
                console.log("Done");
                countlyDb.close();
            });
        }
        else {
            console.log("Done");
            countlyDb.close();
        }
    });
});
