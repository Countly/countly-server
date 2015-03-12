console.log("renaming event collections " + new Date());

var	common = require('../../../api/utils/common.js'),
    async = require('../../../api/utils/async.min.js'),
    crypto = require('crypto');

common.db.collection('events').find({}, {list:1}).toArray(function (err, events) {
    if (!err && events && events.length) {
		var eventCollsToRename = [];
	
		for (var i = 0; i < events.length; i++) {
            if (events[i].list) {
                for (var j = 0; j < events[i].list.length; j++) {

					var oldCollName = events[i].list[j] + events[i]._id;
                    var hash = crypto.createHash('sha1').update(oldCollName).digest('hex');
					var newCollName = "events" + hash;

					if (newCollName && oldCollName) {
						eventCollsToRename.push({o:oldCollName, n:newCollName});
					}
                }
            }
        }
		
		async.map(eventCollsToRename, renameColl, function (err, results) {
            console.log("renaming event collections finished " + new Date());
            process.exit(0);
        });
    }
});

function renameColl(obj, callback) {
	common.db.renameCollection(obj.o, obj.n, {dropTarget: true}, function(err, coll) {								
		if (err) {
			console.log(obj.o);
			console.log(err);
		} else {
            callback();
        }
	});
}