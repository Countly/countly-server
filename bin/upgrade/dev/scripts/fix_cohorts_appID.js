var pluginManager = require('../../../../plugins/pluginManager.js'),
    asyncjs = require('async');

console.log("Fixing app_id in cohorts collection.");
pluginManager.dbConnection().then((countlyDb) => {
    countlyDb.collection('cohorts').find({}).toArray(function(err, cohorts) {
		var requests= [];
		for(var k=0; k<cohorts.length; k++){
			if(typeof cohorts[k].app_id !== 'string') {
				requests.push( { 
                    'updateOne': {
                        'filter': { '_id': cohorts[k]._id },
                        'update': { '$set': {"app_id": cohorts[k].app_id+""} }
                    }
                });
			}		
		}
		if(requests.length>0) {
			console.log("Fixing "+requests.length+ " records");
			countlyDb.collection('cohorts').bulkWrite(requests, {ordered: false}, function(){
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