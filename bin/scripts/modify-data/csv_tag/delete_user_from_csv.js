/**
 *  Delete users with device id defined in CSV FILE_NAME under FIELD_NAME
 *  Server: countly
 *  Path: countly dir/bin/scripts/modify-data/csv_tag
 *  Command: node delete_user_from_csv.js
 */

//path to the file
var FILE_NAME = "test.csv";
//app id
var APP_ID = "5ab0c3ef92938d0e61cf77f4";
var FIELD_NAME = "did";
var batchLimit = 1000;


var asyncjs = require("async");
var Promise = require("bluebird");
var common = require('../../../../api/utils/common.js');
var app_users = require('../../../../api/parts/mgmt/app_users.js');
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
        if (batch.length > 0) {
            batches.push(batch);
        }
        Promise.all([pluginManager.dbConnection("countly"), pluginManager.dbConnection("countly_drill")]).spread(function(db, drill) {
            common.db = db;
            common.drillDb = drill;
            asyncjs.eachOfSeries(batches, function(batch, num, done) {
                console.log("Deleting batches, record from", (num * batchLimit), "to", ((num + 1) * batchLimit) - 1 - (batchLimit - batch.length));
                app_users.delete(APP_ID, {did: {$in: batch}}, function(err, res) {
                    if (err) {
                        console.log("Error occured deleting batch", err);
                        console.log("It is ok to rerun this script to retry");
                    }
                    else {
                        console.log("Batch deleted", res.result);
                    }
                    done();
                });
            }, function() {
                console.log("Script Completed");
                drill.close();
                db.close();
            });
        });
    });