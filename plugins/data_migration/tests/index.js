var request = require('supertest');
var should = require('should');
var testUtils = require("../../../test/testUtils");
//var request = request(testUtils.url);
var request = request.agent(testUtils.url);
var path = require("path");
var fs = require("fs"),
    readline = require('readline'),
    stream = require('stream');
var cp = require('child_process'); //call process
const exec = cp.exec; //for calling command line
const fse = require('fs-extra'); // delete folders
var crypto = require('crypto');
var APP_KEY = "";
var API_KEY_ADMIN = "";
var APP_ID = "";

var testapp = "";
var test_export_id = "";

//Validating empty upload+ logging in

var TIMEOUT_FOR_DATA_MIGRATION_TEST = 10000;
var TIMES_FOR_DATA_MIGRATION_TEST = 10;

var counter = 0;
var run_command = function(my_command, my_args, callback) {


    exec('sudo ' + my_command + ' ' + my_args.join(" "), (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            callback("err");
        }
        else {
            setTimeout(callback, 1000);
        }
    });

};


function validate_log(exportid, callback) {
    fs.readFile(path.resolve(__dirname, './../../../log/dm-export_' + exportid + '.log'), 'utf8', function(err, data) {
        if (err) {
            callback(err);
        }
        var good_errors = ["Failed: error counting countly_out.: Invalid namespace specified 'countly_out.", "Exited with error code: 1", "Failed: error counting countly.: Invalid namespace specified 'countly.'", "Failed: error counting countly_drill.: Invalid namespace specified 'countly_drill.'"];

        const lines = data.split(/\r?\n/);
        var badErrors = [];
        // print all lines
        lines.forEach((line) => {
            if (line.indexOf("error") > -1) {
                var bad = true;
                for (var z = 0; z < good_errors.length; z++) {
                    if (line.indexOf(good_errors[z]) > -1) {
                        bad = false;
                        break;
                    }
                }
                if (bad) {
                    badErrors.push(line);
                }
            }
        });

        if (badErrors.length > 0) {
            callback(badErrors.join(","));
        }
        else {
            callback();
        }
    });
}
function validate_files(exportid, apps, export_path, callback) {
    var simpleDocs = ["apm_device{1}.bson", "apm_device{1}.metadata.json", "apm_network{1}.bson", "apm_network{1}.metadata.json", "app_crashes{1}.bson", "app_crashes{1}.metadata.json", "app_crashgroups{1}.bson", "app_crashgroups{1}.metadata.json", "app_crashusers{1}.bson", "app_crashusers{1}.metadata.json", "app_nxret{1}.bson", "app_nxret{1}.metadata.json", "app_users{1}.bson", "app_users{1}.metadata.json", "app_viewsmeta{1}.bson", "app_viewsmeta{1}.metadata.json", "apps.bson", "apps.metadata.json", "browser.bson", "browser.metadata.json", "calculated_metrics.bson", "calculated_metrics.metadata.json", "campaigndata.bson", "campaigndata.metadata.json", "campaigns.bson", "campaigns.metadata.json", "carriers.bson", "carriers.metadata.json", "cities.bson", "cities.metadata.json", "cohortdata.bson", "cohortdata.metadata.json", "cohorts.bson", "cohorts.metadata.json", "concurrent_users_max.bson", "concurrent_users_max.metadata.json", "consent_history{1}.bson", "consent_history{1}.metadata.json", "consents.bson", "consents.metadata.json", "crash_share.bson", "crash_share.metadata.json", "crashdata.bson", "crashdata.metadata.json", "density.bson", "density.metadata.json", "device_details.bson", "device_details.metadata.json", "devices.bson", "devices.metadata.json", "events.bson", "events.metadata.json", "feedback{1}.bson", "feedback{1}.metadata.json", "feedback_widgets.bson", "feedback_widgets.metadata.json", "funnels.bson", "funnels.metadata.json", "langs.bson", "langs.metadata.json", "max_online_counts.bson", "max_online_counts.metadata.json", "messages.bson", "messages.metadata.json", "metric_changes{1}.bson", "metric_changes{1}.metadata.json", "notes.bson", "notes.metadata.json", "retention_daily.bson", "retention_daily.metadata.json", "retention_monthly.bson", "retention_monthly.metadata.json", "retention_weekly.bson", "retention_weekly.metadata.json", "server_stats_data_points.bson", "server_stats_data_points.metadata.json", "sources.bson", "sources.metadata.json", "symbolication_jobs.bson", "symbolication_jobs.metadata.json", "top_events.bson", "top_events.metadata.json", "users.bson", "users.metadata.json", "views.bson", "views.metadata.json"];

    export_path = export_path || path.resolve(__dirname, './../export/');


    var target_folder = path.resolve(__dirname, './compare_export');
    if (!fs.existsSync(target_folder)) {
        try {
            fs.mkdirSync(target_folder, 484);
        }
        catch (err) {
            callback(err.message);
            return;
        }
    }

    run_command("tar", ["xvzf", export_path + '/' + exportid + '.tar.gz', "-C", target_folder], function() {
        var missing_files = [];
        for (var i = 0; i < apps.length; i++) {
            var target = target_folder;

            while (fs.existsSync(target + "/" + exportid)) {
                target = target + "/" + exportid;
            }

            while (fs.existsSync(target + "/" + apps[i])) {
                target = target + "/" + apps[i];
            }
            target = target + "/countly";

            var pp = target;
            for (var j = 0; j < simpleDocs.length; j++) {
                var dir = pp + '/' + simpleDocs[j].replace('{1}', apps[i]);
                if (!fs.existsSync(dir)) {
                    missing_files.push(dir);
                }
            }
        }
        if (missing_files.length > 0) {
            callback("File(s) missing: " + missing_files.join('/n'));
        }
        else {
            callback();
        }
    });
}
function validate_result(done, max_wait, wait_on, fail_on, options) {
    if (counter < TIMES_FOR_DATA_MIGRATION_TEST) {
        request
            .post('/o/datamigration/getstatus?exportid=' + options.test_export_id + '&api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
            .expect(200)
            .end(function(err, res) {
                var ob = JSON.parse(res.text);
                console.log("current status:" + ob.result.status + " current step:" + ob.result.step + " " + ob.result.progress);
                if (ob.result.status == wait_on) {
                    (ob.result._id).should.be.exactly(options.test_export_id);
                    done();
                }
                else if (ob.result.status == fail_on) {
                    done("Export changed to status " + fail_on + ". Was expected to reach status " + wait_on);
                }
                else {
                    counter = counter + 1;
                    setTimeout(function() {
                        done();
                    }, TIMEOUT_FOR_DATA_MIGRATION_TEST);
                }
            });
    }
    else {
        console.log("Stopped waiting for update.(was expected to finish under  " + (TIMEOUT_FOR_DATA_MIGRATION_TEST * TIMES_FOR_DATA_MIGRATION_TEST) / 1000 + " seconds). ");
        //try getting log file
        var dir = path.resolve(__dirname, '../../../log/dm-export_' + options.test_export_id + ".log");
        if (fs.existsSync(dir)) {
            var instream = fs.createReadStream(dir);

            var rl = readline.createInterface({
                input: instream
            });

            rl.on('line', function(line) {
                console.log(line);
            });

            rl.on('close', function(line) {
                done("Unfinished");
            });
        }
        else {
            console.log("there was no log file");
            done("Unfinished");
        }

    }

}

function validate_import_result(done, max_wait, exportid) {
    if (counter <= max_wait) {
        //check if info file is here
        //check log file
        if (!fs.existsSync(path.resolve(__dirname, './../import/' + exportid + '.tar.gz')) &&
            !fs.existsSync(path.resolve(__dirname, './../import/' + exportid + '')) &&
            fs.existsSync(path.resolve(__dirname, './../import/' + exportid + '.json')) &&
            fs.existsSync(path.resolve(__dirname, './../../../log/dm-import_' + exportid + '.log'))
        ) {

            fs.readFile(path.resolve(__dirname, './../../../log/dm-import_' + exportid + '.log'), 'utf8', function(err, data) {
                if (err) {
                    done(err);
                }
                else if (data.indexOf("Data imported") > -1) {
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                }
                else {
                    console.log(data);
                    counter = counter + 1;
                    setTimeout(function() {
                        validate_import_result(done, max_wait, exportid);
                    }, TIMEOUT_FOR_DATA_MIGRATION_TEST);
                }
            });
        }
        else {
            counter = counter + 1;
            setTimeout(function() {
                validate_import_result(done, max_wait, exportid);
            }, TIMEOUT_FOR_DATA_MIGRATION_TEST);
        }
    }
    else {
        done("Stopped waiting for update.(was expected to finish under  " + max_wait + " seconds). ");
    }

}


function check_if_empty_list_test() {
    it("Check if export list epmty", function(done) {
        request
            .post('/o/datamigration/getmyexports?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
            .expect(200)
            .end(function(err, res) {
                if (err) {
                    return done(err);
                }
                var ob = JSON.parse(res.text);
                (ob.result).should.be.exactly("data-migration.no-exports");
                done();
            });
    });

}

describe("Testing data migration plugin", function() {
    describe("Catching invalid export parameters", function() {
        it("Check if export list empty", function(done) {
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            APP_ID = testUtils.get("APP_ID");
            APP_KEY = testUtils.get("APP_KEY");
            request
                .post('/o/datamigration/getmyexports?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    (ob.result).should.be.exactly("data-migration.no-exports");
                    done();
                });
        });

        it('clean list just in case', function(done) {
            request
                .post('/i/datamigration/delete_all?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    (ob.result).should.be.exactly("ok");
                    setTimeout(done, 1000);
                });
        });

        it("Try exporting without any id", function(done) {
            request
                .post('/i/datamigration/export?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(404)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    (ob.result).should.be.exactly("data-migration.no_app_ids");
                    done();
                });
        });
        check_if_empty_list_test();


        it("Token missing", function(done) {
            request
                .post('/i/datamigration/export?apps=000f1f77bcf86cd799439011&api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(404)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    (ob.result).should.be.exactly('data-migration.token_missing');
                    done();
                });
        });
        check_if_empty_list_test();

        it("Check if export list epmty", function(done) {
            request
                .post('/o/datamigration/getmyexports?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    (ob.result).should.be.exactly("data-migration.no-exports");
                    done();
                });
        });

        it("Address missing", function(done) {
            request
                .post('/i/datamigration/export?apps=000f1f77bcf86cd799439011&server_token=111111&api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(404)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    (ob.result).should.be.exactly('data-migration.address_missing');
                    done();
                });
        });

        it("Check if export list epmty", function(done) {
            request
                .post('/o/datamigration/getmyexports?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    (ob.result).should.be.exactly("data-migration.no-exports");
                    done();
                });
        });
        it("Try exporting with invaild id", function(done) {
            request
                .post('/i/datamigration/export?only_export=1&apps=1246&api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(404)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    (ob.result).should.be.exactly("data-migration.some_bad_ids");
                    done();
                });
        });

        it("Check if export list epmty", function(done) {
            request
                .post('/o/datamigration/getmyexports?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    (ob.result).should.be.exactly("data-migration.no-exports");
                    done();
                });
        });

        it("Try exporting with not existing app id", function(done) {
            request
                .post('/i/datamigration/export?only_export=1&apps=507f1f77bcf86cd799439011&api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(404)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    (ob.result).should.be.exactly("data-migration.some_bad_ids");
                    done();
                });
        });

        it("Check if export list epmty", function(done) {
            request
                .post('/o/datamigration/getmyexports?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    (ob.result).should.be.exactly("data-migration.no-exports");
                    done();
                });
        });
    });
    describe("Create simple export", function() {
        it('Create dummy app', function(done) {
            request
                .post('/i/apps/create?api_key=' + API_KEY_ADMIN + '&args={"name":"Test my app","type":"mobile"}')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }

                    testapp = JSON.parse(res.text);
                    testapp.should.have.property("name", "Test my app");
                    testapp.should.have.property("type", "mobile");
                    done();
                });

        });

        it("Run simple export", function(done) {
            request
                .post('/i/datamigration/export?only_export=1&apps=' + testapp._id + '&api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var apps = [testapp._id];
                    test_export_id = crypto.createHash('SHA1').update(JSON.stringify(apps)).digest('hex');
                    var ob = JSON.parse(res.text);
                    (ob.result).should.be.exactly(test_export_id);
                    done();
                });
        });

        after(function(done) {
            //checking statuss and seeing if it moves to end
            counter = 0;
            this.timeout(0);
            setTimeout(function() {
                validate_result(done, 200, "finished", "failed", {test_export_id: test_export_id});
            }, TIMEOUT_FOR_DATA_MIGRATION_TEST);
        });

    });

    describe("Validate exported files", function() {
        it("Check for archive", function(done) {
            var dir = path.resolve(__dirname, './../export/' + test_export_id + '.tar.gz');
            var logdir = path.resolve(__dirname, './../../../log/dm-export_' + test_export_id + '.log');
            if (fs.existsSync(dir)) {
                if (fs.existsSync(logdir)) {
                    validate_log(test_export_id, function(err) {
                        if (err) {
                            done(err);
                        }
                        else {
                            done();
                            //validate_files(test_export_id, [testapp._id], null, done)
                        }
                    });
                }
                else {
                    done("Log file not created");
                }
            }
            else {
                done("Archive not created");
            }
        });
    });

    describe("Validate responses for trying to overwrite existing export", function() {
        it("Trying same export again(with existing data)", function(done) {
            request
                .post('/i/datamigration/export?only_export=1&apps=' + testapp._id + '&api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(404)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }

                    var ob = JSON.parse(res.text);
                    (ob.result).should.be.exactly("data-migration.you-have-already-exported-data");
                    done();
                });
        });

        it("Setting up data to emulate running export", function(done) {
            testUtils.db.collection("data_migrations").update({_id: test_export_id}, {$set: {"status": "progress"}}, {upsert: true}, function(err, res) {
                if (err) {
                    done(err);
                }
                done();
            });
        });

        it("Trying to rewrite running exporting process", function(done) {
            request
                .post('/i/datamigration/export?only_export=1&apps=' + testapp._id + '&api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(404)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }

                    var ob = JSON.parse(res.text);
                    (ob.result).should.be.exactly("data-migration.already-running-exporting-process");
                    done();
                });
        });
    });
    describe("delete and validate after delete", function() {
        it("delete export", function(done) {
            request
                .post('/i/datamigration/delete_export?exportid=' + test_export_id + '&api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }

                    var ob = JSON.parse(res.text);
                    (ob.result).should.be.exactly("ok");
                    done();
                });
        });

        it("Check for files", function(done) {
            var dir = path.resolve(__dirname, './../export/' + test_export_id + '.tar.gz');
            var logdir = path.resolve(__dirname, './../../../log/dm-export_' + test_export_id + '.log');
            if (!fs.existsSync(dir)) {
                if (!fs.existsSync(logdir)) {
                    done();
                }
                else {
                    done("Log file not deleted");
                }
            }
            else {
                done("Archive not deleted");
            }
        });

    });

    describe("Try export in different path", function() {
        it("Run simple export", function(done) {
            request
                .post('/i/datamigration/export?only_export=1&apps=' + testapp._id + '&api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&target_path=' + path.resolve(__dirname, './../../'))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var apps = [testapp._id];
                    test_export_id = crypto.createHash('SHA1').update(JSON.stringify(apps)).digest('hex');
                    var ob = JSON.parse(res.text);
                    (ob.result).should.be.exactly(test_export_id);
                    done();
                });
        });

        after(function(done) {
            //checking statuss and seeing if it moves to end
            counter = 0;
            this.timeout(0);
            setTimeout(function() {
                done();
            }, TIMEOUT_FOR_DATA_MIGRATION_TEST);
        });
    });

    describe("Validate exported files", function() {
        it("Check for files", function(done) {

            var dir = path.resolve(__dirname, './../../' + test_export_id + '.tar.gz');

            var logdir = path.resolve(__dirname, './../../../log/dm-export_' + test_export_id + '.log');
            if (fs.existsSync(logdir)) {
                if (fs.existsSync(dir)) {
                    validate_log(test_export_id, function(err) {
                        if (err) {
                            done(err);
                        }
                        else {
                            done();
                            //validate_files(test_export_id, [testapp._id], path.resolve(__dirname, './../../'), done);
                        }
                    });
                }
                else {
                    done("Archive not created");
                }
            }
            else {
                done("Log file not created");
            }


        });

        it("delete export", function(done) {
            request
                .post('/i/datamigration/delete_export?exportid=' + test_export_id + '&api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }

                    var ob = JSON.parse(res.text);
                    (ob.result).should.be.exactly("ok");
                    done();
                });
        });

        it("Check for files", function(done) {
            var dir = path.resolve(__dirname, './../export/' + test_export_id + '.tar.gz');
            var logdir = path.resolve(__dirname, './../../../log/dm-export_' + test_export_id + '.log');
            if (!fs.existsSync(dir)) {
                if (!fs.existsSync(logdir)) {
                    done();
                }
                else {
                    done("Log file not deleted");
                }
            }
            else {
                done("Archive not deleted");
            }
        });
    });

    describe("cleanup", function() {
        it("Remove test app", function(done) {
            request
                .post('/i/apps/delete?api_key=' + API_KEY_ADMIN + '&args={"app_id":"' + testapp._id + '"}')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    done();
                });
        });
    });


    describe("Valiate invalid import", function() {
        var mytoken = "";
        it("Trying import without file", function(done) {
            request
                .post('/i/datamigration/import?app_id=' + APP_ID + '&api_key=' + API_KEY_ADMIN)
                .expect(404)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }

                    var ob = JSON.parse(res.text);
                    (ob.result).should.be.exactly("data-migration.import-file-missing");
                    done();
                });
        });
        it("Import without any autentification", function(done) {
            request
                .post('/i/datamigration/import')
                .expect(401)
                .end(function(err, res) {
                    done();
                });
        });
        it("Invalid token", function(done) {
            request
                .post('/i/datamigration/import')
                .set('countly-token', '000000000000')
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    (ob.result).should.be.exactly('Token not valid');
                    done();
                });
        });
        it("Create token", function(done) {
            request
                .post('/o/datamigration/createimporttoken?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    if (ob.result && ob.result != "") {
                        mytoken = ob.result;
                    }
                    else {
                        done('invalid response. No token provided.' + res.text);
                    }
                    done();
                });
        });
        it("Sending without file", function(done) {
            request
                .post('/i/datamigration/import')
                .set('countly-token', mytoken)
                .expect(404)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    (ob.result).should.be.exactly("data-migration.import-file-missing");
                    done();
                });
        });
    });


    describe("Importing via token", function() {
        var mytoken = "";
        var tt = "";
        it("Unauthorised", function(done) {
            request
                .post('/o/datamigration/createimporttoken')
                .expect(401)
                .end(function(err, res) {
                    done();
                });
        });
        it("Create token", function(done) {
            request
                .post('/o/datamigration/createimporttoken?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    if (ob.result && ob.result != "") {
                        mytoken = ob.result;
                    }
                    else {
                        done('invalid response. No token provided.' + res.text);
                    }
                    done();
                });
        });
        it("Validate token ", function(done) {
            request
                .post('/i/datamigration/import?test_con=1')
                .set('countly-token', mytoken)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    if (ob.result && ob.result == "valid") {
                        done();
                    }
                    else {
                        done('invalid response.' + res.text);
                    }

                });
        });
        it("Send test ", function(done) {
            tt = "b18e10498ec0f41a85bb8155ccd4a209819319a3";

            var dir = path.resolve(__dirname, './' + tt + '.tar.gz');
            request
                .post('/i/datamigration/import?ts=000000&exportid=' + tt)
                .attach('import_file', dir)
                .set('countly-token', mytoken)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    (ob.result).should.be.exactly("data-migration.import-started");
                    done();
                });
        });

        after(function(done) {
        //checking statuss and seeing if it moves to end
            counter = 0;
            setTimeout(function() {
                validate_import_result(done, 10, "b18e10498ec0f41a85bb8155ccd4a209819319a3");
            }, TIMEOUT_FOR_DATA_MIGRATION_TEST);
        });
    });
    describe("get my imports", function() {
        it("try unautorized ", function(done) {
            request
                .post('/o/datamigration/getmyimports')
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    done();
                });
        });

        it("get imports list ", function(done) {
            request
                .post('/o/datamigration/getmyimports?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    ob = ob.result;
                    if (ob['b18e10498ec0f41a85bb8155ccd4a209819319a3'] && ob['b18e10498ec0f41a85bb8155ccd4a209819319a3']['app_list'] == 'Demo' && ob['b18e10498ec0f41a85bb8155ccd4a209819319a3']['log'] == 'dm-import_b18e10498ec0f41a85bb8155ccd4a209819319a3.log') {
                        done();
                    }
                    else {
                        done("Invalid object");
                    }
                });
        });
    });
    describe("deleting import", function() {
        it("try unautorized delete import ", function(done) {
            request
                .post('/i/datamigration/delete_import?exportid=b18e10498ec0f41a85bb8155ccd4a209819319a3')
                .expect(400)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    done();

                });

        });
        it("try deleting import without passing exportid", function(done) {
            request
                .post('/i/datamigration/delete_import?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(404)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }

                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    if (ob.result && ob.result == 'data-migration.exportid-missing') {
                        done();
                    }
                    else {
                        done('invalid response. No token provided.' + res.text);
                    }
                });
        });
        it("delete import request ", function(done) {
            request
                .post('/i/datamigration/delete_import?exportid=b18e10498ec0f41a85bb8155ccd4a209819319a3' + '&api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    if (ob.result && ob.result == "ok") {
                        done();
                    }
                    else {
                        done('invalid response. No token provided.' + res.text);
                    }

                });
        });
        it("get empty import list ", function(done) {
            request
                .post('/o/datamigration/getmyimports?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    if (ob.result && ob.result == "data-migration.no-imports") {
                        done();
                    }
                    else {
                        done('invalid response.' + res.text);
                    }
                });
        });
    });

    describe("Importing uploaded export on server", function() {
        var mytoken = "";
        var tt = "";
        it("Unauthorised", function(done) {
            request
                .post('/o/datamigration/createimporttoken')
                .expect(401)
                .end(function(err, res) {
                    done();
                });
        });
        it("Create token", function(done) {
            request
                .post('/o/datamigration/createimporttoken?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    if (ob.result && ob.result != "") {
                        mytoken = ob.result;
                    }
                    else {
                        done('invalid response. No token provided.' + res.text);
                    }
                    done();
                });
        });
        it("Try invalid path", function(done) {
            request
                .post('/i/datamigration/import?ts=000000&existing_file=var/jsfjkasbfkja/asjghaogha/asjkgfakjbgjka/alsgaklgnl')
                .set('countly-token', mytoken)
                .expect(404)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    (ob.result).should.be.exactly("data-migration.could-not-find-file");
                    done();
                });
        });


        it("Call import process", function(done) {
            tt = "b18e10498ec0f41a85bb8155ccd4a209819319a3";
            var dir = path.resolve(__dirname, './' + tt + '.tar.gz');
            request
                .post('/i/datamigration/import?ts=000000&existing_file=' + dir)
                .set('countly-token', mytoken)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    (ob.result).should.be.exactly("data-migration.import-started");
                    done();
                });
        });

        after(function(done) {
        //checking statuss and seeing if it moves to end
            counter = 0;
            setTimeout(function() {
                validate_import_result(done, 10, tt);
            }, 1000);
        });
    });

    /*describe("cleanup", function() {
		it("Check if app exists", function(done) {
            request
                .post('/o/apps/all?api_key=' + API_KEY_ADMIN)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
					else {
						res = JSON.parse(res.text);
						res = res["admin_of"]
						for(var k in res){
							if(k === "58650a47cc2ed563c5ad964c"){
								done();
								return;
							}
						}
						done("App missing");
					}
                });
        });
        it("Remove test app", function(done) {
            request
                .post('/i/apps/delete?api_key=' + API_KEY_ADMIN + '&args={"app_id":"58650a47cc2ed563c5ad964c"}')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    done();
                });
        });
    });*/

    /*describe("Importing bigger app", function() {
        it("Create token and call import process", function(done) {
            request
                .post('/o/datamigration/createimporttoken?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    if (ob.result && ob.result != "") {
						var tt = "f9b35d90be5f2240eafced7c6bfdf130856cd0a7";
						var dir = path.resolve(__dirname, './' + tt + '.tar.gz');
						request
						.post('/i/datamigration/import?ts=000000&existing_file=' + dir)
						.set('countly-token', ob.result)
						.expect(200)
						.end(function(err, res) {
							if (err) {
								return done(err);
							}
							var ob = JSON.parse(res.text);
							(ob.result).should.be.exactly("Importing process started.");
							done();
						});
						
                    }
                    else {
                        done('invalid response. No token provided.' + res.text);
                    }
                });
        });

        after(function(done) {
        //checking statuss and seeing if it moves to end
            counter = 0;
            setTimeout(function() {
                validate_import_result(done, 10, "f9b35d90be5f2240eafced7c6bfdf130856cd0a7");
            }, 1000);
        });
    });
	describe("some cleanup",function(){
		it("Check if app exists", function(done) {
            request
                .post('/o/apps/all?api_key=' + API_KEY_ADMIN)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
					else {
						res = JSON.parse(res.text);
						res = res["admin_of"]
						for(var k in res){
							if(k === "5f589b9e8df39d7b85474921"){
								done();
								return;
							}
						}
						//try again
						
						setTimeout(function(){
							request
							.post('/o/apps/all?api_key=' + API_KEY_ADMIN)
							.expect(200)
							.end(function(err, res) {
								if (err) {
									return done(err);
								}
								else {
									res = JSON.parse(res.text);
									res = res["admin_of"]
									for(var k in res){
										if(k === "5f589b9e8df39d7b85474921"){
											done();
											return;
										}
									}
									
									done("App missing");
								}
							});
							
						},10000);
					}
                });
        });
		
		it("delete import request ", function(done) {
            request
                .post('/i/datamigration/delete_import?exportid=f9b35d90be5f2240eafced7c6bfdf130856cd0a7' + '&api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    if (ob.result && ob.result == "ok") {
                        setTimeout(done,10000);
                    }
                    else {
                        done('invalid response. No token provided.' + res.text);
                    }

                });
        });
	});

    describe("Exporting same app", function() {
        it("Run bigger export", function(done) {
            request
                .post('/i/datamigration/export?only_export=1&apps=5f589b9e8df39d7b85474921&api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    (ob.result).should.be.exactly("f9b35d90be5f2240eafced7c6bfdf130856cd0a7");
                    done();
                });
        });

        after(function(done) {
            //checking statuss and seeing if it moves to end
            counter = 0;
            this.timeout(0);
            setTimeout(function() {
                validate_result(done, 200, "finished", "failed",{test_export_id:"f9b35d90be5f2240eafced7c6bfdf130856cd0a7"});
            }, TIMEOUT_FOR_DATA_MIGRATION_TEST);
        });
    });

    describe("Comparing if folder contents - if no data missing", function() {
		it("Check for archive", function(done) {
			
            var dir = path.resolve(__dirname, './../export/' + "f9b35d90be5f2240eafced7c6bfdf130856cd0a7" + '.tar.gz');
            var logdir = path.resolve(__dirname, './../../../log/dm-export_' + "f9b35d90be5f2240eafced7c6bfdf130856cd0a7" + '.log');
            if (fs.existsSync(dir)) {
                if (fs.existsSync(logdir)) {
					validate_log("f9b35d90be5f2240eafced7c6bfdf130856cd0a7",function(err){
						if(err) {
							done(err);
						}
						else {
							validate_files("f9b35d90be5f2240eafced7c6bfdf130856cd0a7", ["5f589b9e8df39d7b85474921"], null, done)
						}
					});
					
                }
                else {
                    done("Log file not created");
                }
            }
            else {
                done("Archive not created");
            }
        });
		
		
        it("Get contents", function(done) {
            var exportid = "f9b35d90be5f2240eafced7c6bfdf130856cd0a7";
            var export_path = export_path || path.resolve(__dirname, './../export/');
                var missing_files = [];
                var apps = ["5f589b9e8df39d7b85474921"];
                for (var i = 0; i < apps.length; i++) {
                    var pp = path.resolve(__dirname, './compare_export'+'/' + exportid + '/' + apps[i] + '/countly');
                    var files = fs.readdirSync(path.resolve(__dirname, "./"+"f9b35d90be5f2240eafced7c6bfdf130856cd0a7"+"/" + apps[i] + "/countly"));
                    for (var j = 0; j < files.length; j++) {
                        var dir = path.resolve(pp,"./"+files[j]);
                        if (!fs.existsSync(dir)) {
                            missing_files.push(dir);
                        }
                    }
                }
                if (missing_files.length > 0) {
                    done("File(s) missing: " + missing_files.join('/n'));
                }
                else {
                    done();
                }
        });
		it("Remove test app", function(done) {
            request
                .post('/i/apps/delete?api_key=' + API_KEY_ADMIN + '&args={"app_id":"5f589b9e8df39d7b85474921"}')
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    done();
                });
        });
    });*/

    describe("cleanup", function() {


        it('delete data', function(done) {
            request
                .post('/i/datamigration/delete_all?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    (ob.result).should.be.exactly("ok");
                    done();
                });
        });

        it('delete collection', function(done) {
            testUtils.db.collection("data_migrations").drop(function(err, res) {
                if (err) {
                    return done(err);
                }
                if (res) {
                    done();
                }
                else {
                    done("ERROR cleaning up database");
                }
            });
        });
        it("clenup test dir", function(done) {
            fse.remove(path.resolve(__dirname, './compare_export'), err => {
                if (err) {
                    done(Error('Unable to remove directory'));
                }
                else {
                    done();
                }

            });
        });
        it("Get export list", function(done) {
            request
                .post('/o/datamigration/getmyexports?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        return done(err);
                    }
                    var ob = JSON.parse(res.text);
                    (ob.result).should.be.exactly("data-migration.no-exports");
                    done();
                });
        });
    });
});