/*
Script prints out how many times each event occured by month.
Values should closely match data points statistics unless data is being :
	a)Periodically cleared
	b)some events are deleted

Path: 
	{COUNTLY DIRECTORY}/bin/scripts/export-data/countl_event_datapoints.js
Command: 
	node ./bin/scripts/export-data/countl_event_datapoints.js

You can pipe result directly to some file and view as csv
node ./bin/scripts/export-data/countl_event_datapoints.js>result.csv

They can set multiple parameters:

1)app_list
	*)app_list = [] will run on all apps
	*)app_list = ["1234","4567"] will run only on apps with those ids
		
2)eventsMatch - regexes by which to filter events which should be checked.
		*)var eventsMatch = [new RegExp('^http_succcess_response.*'), new RegExp('^http_error_response.*')]; //will run on events that match any of given criteria
		*)var eventsMatch = []; //will check all events

3)verbose - if true will output information while working, but in this case result will not be valid .csv file.

4)calculate_from.

	There are 3 options to run it. With more precision calculations will take LONGER.

	OPTION1:
	var calculate_from = "countly"
	Fastest way to calculate.
	Data is calculated using aggregated data. This method will be precise only if  data from SDK is sent right away(server is not reciewing a lot data about events that happened some time ago).
	If there is periodic clenup in drill, this method will still historically recorded data as it is not cleared out from aggregated data. 

	OPTION2:
	var calculate_from= "drill"
	Results will show current situation in drill collections. Results are based on ts(time even happened on clients device), but not on cd - time event was recorded in database.

	OPTION3:
	var calculate_from= "drill_precise"
	runs on drill database.
	Calculates based on cd field not ts field. As a result script will run longer, but it will be most precise result regarding on when data was recorded not when it happened on user instance.



Output example(if sucessful)
	app,event,January 2022,February 2022,March 2022,April 2022,May 2022,June 2022,July 2022,August 2022,September 2022,October 2022,November 2022,December 2022
	TEST,http_succcess_response/v2/app_instances/<device-id>/sd/log,100,87,79,104,85,107,69,97,110,102,80,2
	TEST,http_succcess_response/v1/app_instances/<device-id>/sd/log/hopp3,90,87,72,105,109,97,71,74,106,97,78,4
	TEST,http_succcess_response/v2/app_instances/<device-id>/sd/log/hopp2,89,83,80,86,86,97,81,75,114,104,58,5
	TEST,http_succcess_response/v1/app_instances/<device-id>/sd/log,101,100,77,107,81,98,71,70,107,106,77,4
	TEST,http_succcess_response/v2/app_instances/<device-id>/sd/log/hopp3,91,95,66,105,97,94,74,75,126,99,78,4
	TEST,http_succcess_response/v1/app_instances/<device-id>/sd/log/hopp2,105,86,72,107,78,98,81,99,131,114,81,1

Output example(if there are errors)
	Error
	Error: invalid query

*/
var plugins = require('./../../../plugins/pluginManager.js');
var Promise = require("bluebird");
var crypto = require('crypto');


var app_list = [];//add app ids, if none added will run on all apps
var eventsMatch = []; //rules to match events by. If nothing set will check all events
var calculate_from = "drill_precise"; //"drill" or "countly" or "drill_precise"


var matchQuery = false; //put in query if run on drill to limit drill data by some range or properties.
var verbose = true; //if true - will output process at first, data at the end. If false - only data unless there are errors.

function output(message) {
    if (verbose) {
        console.log(message);
    }
}

//Custom merge function in cases we need to group some events.
//It should be rewritten specifically for each case if needed
function mergeData(data) {
    //we are assuming. 4. item is device id
    var dataMerged = {};
    for (var z = 0; z < data.data.length; z++) {
        var splitted = data.data[z].e.split('/');
        splitted[3] = '<device-id>';
        splitted = splitted.join('/');
        if (dataMerged[splitted]) {
            for (var p in data.data[z].data) {
                dataMerged[splitted][p] = (dataMerged[splitted][p] || 0) + data.data[z].data[p];
            }
        }
        else {
            dataMerged[splitted] = data.data[z].data;
        }
    }
    var arr = [];
    for (var key in dataMerged) {
        arr.push({"e": key, "data": dataMerged[key]});
    }
    data.data = arr;
}


function outputData(options, data) {
    var order = [];
    for (var nn in data.keys) {
        order.push(nn);
    }
    order = order.sort(function(a, b) {
        var aa = a.split(":");
        var bb = b.split(":");
        var yeara = 0;
        var yearb = 0;

        try {
            yeara = parseInt(aa[0], 10);
            yearb = parseInt(bb[0], 10);
        }
        catch (err) {
            output(err);
        }
        if (yeara === yearb) {
            var montha = 0;
            var monthb = 0;
            try {
                if (aa[1].indexOf("m") > -1) {
                    montha = parseInt(aa[1].substr(1), 10);
                    monthb = parseInt(bb[1].substr(1), 10);
                }
                else {
                    montha = parseInt(aa[1], 10);
                    monthb = parseInt(bb[1], 10);
                }
            }
            catch (err) {
                output(err);
            }
            if (montha < monthb) {
                return -1;
            }
            else {
                return 1;
            }

        }
        else if (yeara < yearb) {
            return -1;
        }
        else {
            return 1;
        }

    });
    var formatted = [];
    var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    for (var z1 = 0; z1 < order.length; z1++) {
        var tt = order[z1].replace('m', '');
        tt = tt.split(":");
        formatted.push(months[parseInt(tt[1], 10) - 1] + " " + tt[0]);
    }

    if (data.data.length > 0) {
        console.log("app,event," + formatted.join(","));
    }
    for (var z = 0; z < data.data.length; z++) {
        var line = [options.app.name, data.data[z].e];
        for (var n = 0; n < order.length; n++) {
            if (data.data[z].data && data.data[z].data[order[n]]) {
                line.push(data.data[z].data[order[n]]);
            }
            else {
                line.push(0);
            }
        }
        console.log(line.join(","));
    }
}

function countDataPoints(options, callback) {
    var data = [];
    var selectedEvents = [];
    var monthKeys = {};

    options.db.collection("events").findOne({'_id': options.db.ObjectID(options.app._id)}, {"list": 1}, function(err, res) {
        if (err) {
            callback(err, []);
        }
        else {
            if (res && res.list) {
                for (var k = 0; k < res.list.length; k++) {
                    if (eventsMatch.length > 0) {
                        for (var z = 0; z < eventsMatch.length; z++) {
                            if (eventsMatch[z].test(res.list[k])) {
                                selectedEvents.push(res.list[k]);
                                break;
                            }
                        }
                    }
                    else {
                        selectedEvents.push(res.list[k]);
                    }
                }
            }
            output(selectedEvents.length + " events found");
            if (selectedEvents.length > 0) {
                Promise.each(selectedEvents, function(key) {
                    return new Promise(function(resolve, reject) {
                        var collection = "";
                        var pipeline = [];
                        if (calculate_from === "drill") {
                            collection = "drill_events" + crypto.createHash('sha1').update(key + options.app._id).digest('hex');
                            if (matchQuery) {
                                pipeline.push({"$match": matchQuery});
                            }
                            pipeline.push({'$group': {'_id': "$m", 'cn': {"$sum": 1}}});

                            options.db_drill.collection(collection).aggregate(pipeline, {"allowDiskUse": true}, function(err, oo) {
                                if (err) {
                                    reject(err);
                                }
                                else {
                                    var dd = {};
                                    for (var z = 0; z < oo.length; z++) {
                                        dd[oo[z]._id] = oo[z].cn;
                                        monthKeys[oo[z]._id] = true;
                                    }
                                    data.push({"e": key, data: dd});
                                    resolve();
                                }
                            });
                        }
                        else if (calculate_from === "drill_precise") {
                            collection = "drill_events" + crypto.createHash('sha1').update(key + options.app._id).digest('hex');
                            if (matchQuery) {
                                pipeline.push({"$match": matchQuery});
                            }
                            pipeline.push({"$project": {"_id": 0, "y": {"$year": {"date": "$cd", "timezone": "GMT"}}, "m": {"$month": {"date": "$cd", "timezone": "GMT"}}}}, {'$group': {'_id': {"$concat": [{"$toString": '$y'}, ":", {"$toString": '$m'}]}, 'cn': {"$sum": 1}}});
                            options.db_drill.collection(collection).aggregate(pipeline, {"allowDiskUse": true}, function(err, oo) {
                                if (err) {
                                    reject(err);
                                }
                                else {
                                    var dd = {};
                                    for (var z = 0; z < oo.length; z++) {
                                        dd[oo[z]._id] = oo[z].cn;
                                        monthKeys[oo[z]._id] = true;
                                    }
                                    data.push({"e": key, data: dd});
                                    resolve();
                                }
                            });
                        }
                        else {
                            collection = "events" + crypto.createHash('sha1').update(key + options.app._id).digest('hex');
                            var ll = [];
                            for (var z = 0; z < 31; z++) {
                                ll.push("$d." + z + ".c");
                            }
                            pipeline.push({"$project": {"c": {"$sum": ll}, "m": "$m"}});
                            pipeline.push({'$group': {'_id': "$m", 'cn': {"$sum": "$c"}}});

                            options.db.collection(collection).aggregate(pipeline, {"allowDiskUse": true}, function(err, oo) {
                                if (err) {
                                    reject(err);
                                }
                                else {
                                    var dd = {};
                                    for (var z = 0; z < oo.length; z++) {
                                        if (oo[z]._id.indexOf(":0") === -1) { //filter out zero docs
                                            dd[oo[z]._id] = oo[z].cn;
                                            monthKeys[oo[z]._id] = true;
                                        }
                                    }
                                    data.push({"e": key, data: dd});
                                    resolve();
                                }
                            });
                        }
                    });
                }).then(function() {
                    callback(null, {"data": data, "keys": monthKeys});
                }).catch(function(rejection) {
                    console.log("rejected");
                    console.log(rejection);
                    console.log(JSON.stringify(rejection));
                    callback(null, {"data": data, "keys": monthKeys});
                });
            }
            else {
                callback(null, {"data": data, "keys": monthKeys});
            }
        }
    });
}

Promise.all([plugins.dbConnection("countly"), plugins.dbConnection("countly_drill")]).spread(function(db, db_drill) {
    getAppList({db: db}, function(err, apps) {
        if (err) {
            console.log(err);
            db.close();
            db_drill.close();
        }
        else {
            output(apps.length + " apps found");
            Promise.each(apps, function(app) {
                return new Promise(function(resolve, reject) {
                    countDataPoints({db: db, db_drill: db_drill, app: app, eventsRule: eventsMatch, drillRule: matchQuery}, function(err, res) {
                        if (err) {
                            console.log(err);
                            reject();
                        }
                        else {
                            //merge data if needed
                           // mergeData(res);
                            outputData({app: app}, res);
                        }
                        resolve();
                    });
                });
            }).then(function() {
                output("ALL done");
                db.close();
                db_drill.close();
            }).catch(function(rejection) {
                console.log("Error");
                console.log("Error:", rejection);
                db.close();
                db_drill.close();
            });
        }
    });
});

function getAppList(options, callback) {
    var query = {};
    if (app_list && app_list.length > 0) {
        var listed = [];
        for (var z = 0; z < app_list.length; z++) {
            listed.push(options.db.ObjectID(app_list[z]));
        }
        query = {"_id": {"$in": listed}};
    }

    options.db.collection("apps").find(query).toArray(function(err, myapps) {
        myapps = myapps || [];
        if (err) {
            callback("Couldn't get app list", []);
        }

        callback(err, myapps);
    });
}

