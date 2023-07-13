/**
 *  Update custom user properties named CUSTOM_PROPERTY with static value CUSTOM_PROPERTY_VALUE for device id defined in CSV FILE_NAME under FIELD_NAME for APP_ID
 *  Server: countly
 *  Path: countly dir/bin/scripts/modify-data/csv_tag
 *  Command: node update_property_static_value.js
 */

//path to the file
var FILE_NAME = "test.csv";
//app id
var APP_ID = "5ab0c3ef92938d0e61cf77f4";
//name of the field in CSV file to match to username
var FIELD_NAME = "userID";
//key for custom property to assign to user
var CUSTOM_PROPERTY = "myCustomProperty";
//value for custom property to assign to user
var CUSTOM_PROPERTY_VALUE = "true";
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
            batch.push(jsonObj[FIELD_NAME]);
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
            var update = {};
            if (typeof CUSTOM_PROPERTY_VALUE === "boolean") {
                CUSTOM_PROPERTY_VALUE = CUSTOM_PROPERTY_VALUE + "";
            }
            update["custom." + CUSTOM_PROPERTY] = CUSTOM_PROPERTY_VALUE;
            asyncjs.eachOfSeries(batches, function(batch, num, done) {
                console.log("Updating batch one, from", (num * batchLimit), "to", ((num + 1) * batchLimit) - 1 - (batchLimit - batch.length));
                db.collection("app_users" + APP_ID).updateMany({did: {$in: batch}}, {$set: update}, function(err, res) {
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
                update["custom." + CUSTOM_PROPERTY + ".type"] = "l";
                update["custom." + CUSTOM_PROPERTY + ".values"] = {};
                update["custom." + CUSTOM_PROPERTY + ".values"][CUSTOM_PROPERTY_VALUE] = true;
                dbDrill.collection("drill_meta" + APP_ID).updateOne({_id: "meta_up"}, {$set: update}, function() {
                    console.log("Completed");
                    dbDrill.close();
                    db.close();
                });
            });
        });
    });