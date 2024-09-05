/**
Script for gradual deletion from drill collections.
Script must be placed in :
{countly dir}/bin/scripts/expire-data/

to run:
node countly_single_app_expireDataBatches.js

Best would be to push output in some log file.
At the end there will be text if there is any error:
"There were errors. Please recheck logs for those."
Searching for ERROR in document should show failures.
If something is unclear - showing output would help with determining issues.

Script can be run multiple times on same input parameters.
 */

//[1612144800000,1614477599999]
var APP_ID = "";
var start = 1627786800000; //min timestamp for data deletion
var end = 1641002399999; //max timestamp for data deletion
var timeSpan = 60 * 60 * 24 * 30; //How big timefrimes delete in seconds. 60*60*24 = 1 day

var paralelCn = 10;//How many ops should be run in paralel


//Using batchSize is not very optimal. It relies on find query before deletion. (So twice as many operations)
//Best would be NOT to use it as there are no existing operations, that could make it optimal.
var batchSize = 0; //up to how many documents should be delete in single batch. If set to 0 - will delete all documents that matches current time span. 

var timeout = 500; //timeout in miliseconds between deletion. (One second  ==== 1000 ms)

//!!!!!!If there is incoming data and deletion is happening based in batchSize - it would keep on deleting from same timeframe as long as new data appear !!!!!!!
/*If you want to use only batch size choose time span to be greather that span between min and  max timestamp
    start: A,
	end: B,
	timeSpan: ((B-A)/1000) - at least.
*/


var async = require('async'),
    crypto = require('crypto'),
    Promise = require("bluebird"),
    plugins = require('../../../plugins/pluginManager.js');

var errorCn = 0;


var process = {
    drill_events: true,
    /*app_crashes:true,
	metric_changes:true,
	consent_history:true,
	feedback:true,
	symbolication_jobs:true,
	systemlogs:true */
};

var deleteOptions = {"writeConcern": {"w": "majority"}, "multi": true};

function removeInBatches(db_target, collection, query, callback) {
    db_target.collection(collection).aggregate([{"$match": query}, {"$project": {"_id": 1}}, {"$limit": batchSize}], {"allowDiskUse": true}, function(err, res) {
        if (err) {
            errorCn += 1;
            console.log("ERROR: Error while finding data for: " + collection);
            console.log(err);
            callback();
        }
        else {
            res = res || [];
            if (res.length > 0) {
                var ids = [];
                for (var i = 0; i < res.length; i++) {
                    ids.push(res[i]._id);
                }
                //calls deleteMany from our wrapper.
                db_target.collection(collection).remove({"_id": {"$in": ids}}, deleteOptions, function(err, res) {
                    if (err) {
                        console.log("ERROR: Error while deleting data for: " + collection);
                        console.log(err);
                        callback();
                    }
                    else {
                        console.log(JSON.stringify(res));
                        if (timeout) {
                            setTimeout(function() {
                                removeInBatches(db_target, collection, query, callback);
                            }, timeout);
                        }
                        else {
                            removeInBatches(db_target, collection, query, callback);//call for next batch.
                        }
                    }
                });
            }
            else {
                console.log('Nothing left to delete');
                callback();
            }
        }
    });
}


function eventIterator(fr, done) {
    var collection = fr.collection;
    var db_target = fr.db;

    console.log('Processing range: ' + JSON.stringify({"ts": {"$gte": fr.start, "$lt": fr.end}}) + ' for ' + fr.collection);
    var query = {};
    query["ts"] = {"$gte": fr.start, "$lt": fr.end};
    if (fr.query) {
        for (var key in fr.query) {
            query[key] = fr.query.key;
        }
    }
    if (batchSize) {
        removeInBatches(db_target, collection, query, function() {
            done();
        });
    }
    else { //removing all matching timestamps in one go
        console.log(JSON.stringify(query));
        //calls deleteMany from our wrapper.
        db_target.collection(collection).remove(query, deleteOptions, function(err, res) {
            if (err) {
                console.log("ERROR: Error while removing data");
                console.log(err);
                if (timeout) {
                    setTimeout(function() {
                        done();
                    }, timeout);
                }
                else {
                    done();
                }
            }
            else {
                console.log(JSON.stringify(res));
                if (timeout) {
                    setTimeout(function() {
                        done();
                    }, timeout);
                }
                else {
                    done();
                }
            }
        });
    }
}

function prepareIterationList(collections, seconds, callback) {
    var listed = [];

    if (start === 0) {
        getMinTs(function(err, minTs) {
            if (err) {
                console.log("ERROR: Could not fetch min ts for collections");
                callback(err);
            } else {
                console.log("Min ts: " + minTs);
                generateIterationList(minTs);
            }
        });
    } else {
        generateIterationList(start);
    }

    function getMinTs(cb) {
        var minTs = end;
    
        async.each(collections, function(col, cb1) {
            col.db.collection(col.collection).findOne({}, { sort: { ts: 1 }, projection: { ts: 1 } }, function(err, doc) {
                if (err) {
                    console.log("ERROR: Could not fetch min ts for collection " + col.collection);
                    return cb1(err);
                }
                if (doc && doc.ts && doc.ts < minTs) {
                    minTs = doc.ts;
                }
                cb1();
            });
        }, function(err) {
            if (err) {
                cb(err);
            } else {
                cb(null, minTs);
            }
        });
    };

    function generateIterationList(z) {
        z = (start === 0 && z) ? z : start;
        if (timeSpan === 0 && start === 0) {
            collections.forEach(function(col) {
                listed.push({"collection": col.collection, "db": col.db, "start": 0, "end": end, "query": {"ts": {"$lt": end}}});
            });
        }
        else if (timeSpan === 0) {
            collections.forEach(function(col) {
                listed.push({"collection": col.collection, "db": col.db, "start": z, "end": end, "query": {"ts": {"$gte": z, "$lt": end}}});
            });
        }
        else {
            if (seconds) {
                z = Math.floor(z / 1000);
                for (; z <= Math.floor(end / 1000); z += timeSpan) {
                    collections.forEach(function(col) {
                        listed.push({"collection": col.collection, "db": col.db, "start": z, "end": Math.min(z + timeSpan, end), "seconds": true});
                    });
                }
            } else {
                for (; z <= end; z += timeSpan * 1000) {
                    collections.forEach(col => {
                        listed.push({"collection": col.collection, "db": col.db, "start": z, "end": Math.min(z + timeSpan * 1000, end)});
                    });
                }
            }
        }

        callback(null, listed);
    };
}
function processDrillCollections(db, drill_db, callback) {
    if (process && process.drill_events) {
        var collections = [];
        collections.push({'db': drill_db, 'collection': "drill_events" + crypto.createHash('sha1').update("[CLY]_session" + APP_ID).digest('hex')});
        collections.push({'db': drill_db, 'collection': "drill_events" + crypto.createHash('sha1').update("[CLY]_crash" + APP_ID).digest('hex')});
        collections.push({'db': drill_db, 'collection': "drill_events" + crypto.createHash('sha1').update("[CLY]_view" + APP_ID).digest('hex')});
        collections.push({'db': drill_db, 'collection': "drill_events" + crypto.createHash('sha1').update("[CLY]_action" + APP_ID).digest('hex')});
        collections.push({'db': drill_db, 'collection': "drill_events" + crypto.createHash('sha1').update("[CLY]_apm_device" + APP_ID).digest('hex')});
        collections.push({'db': drill_db, 'collection': "drill_events" + crypto.createHash('sha1').update("[CLY]_apm_network" + APP_ID).digest('hex')});
        collections.push({'db': drill_db, 'collection': "drill_events" + crypto.createHash('sha1').update("[CLY]_nps" + APP_ID).digest('hex')});
        collections.push({'db': drill_db, 'collection': "drill_events" + crypto.createHash('sha1').update("[CLY]_survey" + APP_ID).digest('hex')});
        collections.push({'db': drill_db, 'collection': "drill_events" + crypto.createHash('sha1').update("[CLY]_push_action" + APP_ID).digest('hex')});
        collections.push({'db': drill_db, 'collection': "drill_events" + crypto.createHash('sha1').update("[CLY]_star_rating" + APP_ID).digest('hex')});
        collections.push({'db': drill_db, 'collection': "drill_events" + crypto.createHash('sha1').update("[CLY]_push_sent" + APP_ID).digest('hex')});
        collections.push({'db': drill_db, 'collection': "drill_events" + crypto.createHash('sha1').update("[CLY]_consent" + APP_ID).digest('hex')});
        db.collection("events").findOne({'_id': db.ObjectID(APP_ID)}, {list: 1}, function(err, eventData) {
            if (eventData && eventData.list) {
                for (var i = 0; i < eventData.list.length; i++) {
                    collections.push({'db': drill_db, 'collection': "drill_events" + crypto.createHash('sha1').update(eventData.list[i] + APP_ID).digest('hex')});
                }
            }
            prepareIterationList(collections, false, function(err, iteratorList) {
                if (iteratorList) {
                    async.eachLimit(iteratorList, paralelCn, eventIterator, function() {
                        console.log('Drill collections processed');
                        callback();
                    });
                }
            });
        });
    }
    else {
        callback('Skipping drill collections');
    }
}

Promise.all([plugins.dbConnection("countly"), plugins.dbConnection("countly_drill")]).spread(function(db, db_drill) {
    if (!APP_ID) {
        console.log("APP ID is missing");
        console.log('exited');
        db.close();
        db_drill.close();
    }
    else {
        processDrillCollections(db, db_drill, function() {
            var processCols = [];
            for (var key in process) {
                if (key !== 'drill_events') {
                    if (key === 'symbolication_jobs' || key === 'systemlogs') {
                        processCols.push({'collection': key, db: db, seconds: true});
                    }
                    else {
                        processCols.push({'collection': key + APP_ID, db: db, seconds: true});
                    }
                }
            }
            prepareIterationList(processCols, true, function(err, iteratorList) {
                if (iteratorList) {
                    async.eachLimit(iteratorList, paralelCn, eventIterator, function() {
                        if (errorCn > 0) {
                            console.log("There were errors. Please recheck logs for those.");
                        }
                        console.log('finished');
                        db.close();
                        db_drill.close();
                    });
                }
            });
        });
    }
});