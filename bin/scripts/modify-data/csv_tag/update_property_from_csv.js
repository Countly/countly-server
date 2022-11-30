/**
 *  Update custom user properties named CUSTOM_PROPERTY with value FIELD_VALUE with device id defined in CSV FILE_NAME under FIELD_NAME for APP_ID
 *  Server: countly
 *  Path: countly dir/bin/scripts/modify-data/csv_tag
 *  Command: node update_property_from_csv.js
 */

//path to the file
var FILE_NAME = "test.csv";
//app id
var APP_ID = "5ab0c3ef92938d0e61cf77f4";
//name of the field in CSV file to match to device_id
var FIELD_NAME = "userID";
//name of the field in CSV file where to get value from
var FIELD_VALUE = "clientID";
//key for custom property to assign to user
var CUSTOM_PROPERTY = "myCustomProperty";
var batchLimit = 1000;

var asyncjs = require("async");
var pluginManager = require("../../../../plugins/pluginManager");

var batches = [];
var batch = [];
var rowCount = 0;
var csv = require('csvtojson/v1');
csv()
    .fromFile("./" + FILE_NAME)
    .on('json', (jsonObj)=>{
        rowCount++;
        console.log("Processing row", rowCount);
        if (jsonObj[FIELD_NAME] && jsonObj[FIELD_NAME].length) {
            if (jsonObj[FIELD_VALUE] && jsonObj[FIELD_VALUE].length) {
                var update = {};
                if (typeof jsonObj[FIELD_VALUE] === "boolean") {
                    jsonObj[FIELD_VALUE] = jsonObj[FIELD_VALUE] + "";
                }
                update["custom." + CUSTOM_PROPERTY] = jsonObj[FIELD_VALUE];
                batch.push({
                    'updateOne': {
                        'filter': { 'did': jsonObj[FIELD_NAME] },
                        'update': { '$set': update }
                    }
                });
            }
            else {
                console.log("Missing value for row", rowCount);
            }
        }
        else {
            console.log("Missing field for row", rowCount);
        }
        if (batch.length >= batchLimit) {
            batches.push(batch);
            batch = [];
        }
    })
    .on('done', ()=>{
        Promise.all([pluginManager.dbConnection("countly"), pluginManager.dbConnection("countly_drill")]).spread(function(db, dbDrill) {
            if (batch.length > 0) {
                batches.push(batch);
            }
            asyncjs.eachOfSeries(batches, function(batch, num, done) {
                console.log("Updating batch one, from", (num * batchLimit), "to", ((num + 1) * batchLimit) - 1 - (batchLimit - batch.length));
                db.collection("app_users" + APP_ID).bulkWrite(batch, function(err, res) {
                    if (err) {
                        console.log("Error occured updating batch");
                        console.log("It is ok to rerun this script to retry");
                    }
                    else {
                        console.log("Batch updated", res.result);
                    }
                    done();
                });
            }, function() {
                var update = {};
                update["custom." + CUSTOM_PROPERTY + ".type"] = "s";
                update["custom." + CUSTOM_PROPERTY + ".values"] = {};
                dbDrill.collection("drill_meta" + APP_ID).updateOne({_id: "meta_up"}, {$set: update}, function() {
                    console.log("Completed");
                    dbDrill.close();
                    db.close();
                });
            });
        });
    });