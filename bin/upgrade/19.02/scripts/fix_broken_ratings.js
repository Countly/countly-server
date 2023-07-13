var pluginManager = require('../../../../plugins/pluginManager.js'),
    async = require('async'),
    crypto = require('crypto');

Promise.all([pluginManager.dbConnection("countly"),pluginManager.dbConnection("countly_drill")]).then(function([countlyDB,countlyDrillDB]){
    countlyDb.collection('apps').find({}).toArray(function(errAppFind, apps) {
        if (!apps || errAppFind) {
            console.log('No apps to fix');
            countlyDb.close();
            countlyDrillDB.close();
            return;
        }
    
        /**
        * fix device id's of broken records
        * @method fixBrokenDeviceIds
        * @param {object} app - application object
        * @param {callback} done - callback function
        */
        function fixBrokenDeviceIDs(app, done) {
            // find all broken app_user record containts sdk_name
            countlyDb.collection('app_users' + app._id).find({did: /.*sdk_name=javascript_feedback_popup/}).toArray(function(errBrokenUserFind, users) {
                if (!errBrokenUserFind) {
                    async.forEach(users, function(brokenUser, doneUser) {
                        let fixed_device_id = brokenUser.did.substr(0, brokenUser.did.length - 34);
                        // check is there correct app_user for this fixed_device_id
                        countlyDb.collection('app_users' + app._id).findOne({did: fixed_device_id}, function(errFindCorrectUser, correctUser) {
                            if (!errFindCorrectUser) {
                                // if there is correct app_user for fixed_device_id, use that values, otherwise use brokenUser uid and fixed did
                                var correctReference = (correctUser) ? correctUser : {
                                    did: fixed_device_id,
                                    uid: brokenUser.uid
                                };
                                // map correct uid and did values to drill events records
                                countlyDrillDB.collection("drill_events" + crypto.createHash('sha1').update("[CLY]_star_rating" + app._id).digest('hex'))
                                    .updateMany({did: brokenUser.did}, {
                                        $set: {
                                            did: correctReference.did,
                                            uid: correctReference.uid
                                        }
                                    }, function(errUpdateDrill) {
                                        if (!errUpdateDrill) {
                                            console.log("Drill event fixed for " + app.name);
                                            // map correct uid and did values to broken feedback records
                                            countlyDb.collection("feedback" + app._id)
                                                .updateMany({device_id: brokenUser.did}, {
                                                    $set: {
                                                        device_id: correctReference.did,
                                                        uid: correctReference.uid
                                                    }
                                                }, function(errUpdateFeedback) {
                                                    if (!errUpdateFeedback) {
                                                        console.log("Feedback fixed for " + app.name);
                                                        // if there is correct user for this fixed device_id, remove broken app_user record.
                                                        countlyDb.collection('app_users' + app._id).remove({_id: brokenUser._id}, function(errRemoveAppUser) {
                                                            if (errRemoveAppUser) {
                                                                console.log(errRemoveAppUser);
                                                                doneUser();
                                                            }
                                                            else {
                                                                if (!correctUser) {
                                                                    brokenUser._id = crypto.createHash('sha1')
                                                                        .update(app.key + fixed_device_id + "")
                                                                        .digest('hex');
                                                                    brokenUser.did = fixed_device_id;
                                                                    countlyDb.collection('app_users' + app._id).insert(brokenUser, function(err) {
                                                                        if (err) {
                                                                            console.log(err);
                                                                        }
                                                                        doneUser();
                                                                    });
                                                                }
                                                                else {
                                                                    doneUser();
                                                                }
                                                            }
                                                        });
                                                    }
                                                    else {
                                                        console.log(errUpdateFeedback);
                                                        doneUser();
                                                    }
                                                });
                                        }
                                        else {
                                            console.log(errUpdateDrill);
                                            doneUser();
                                        }
                                    });
                            }
                        });
                    }, function() {
                        done();
                    });
                }
                else {
                    console.log(errBrokenUserFind);
                    done();
                }
            });
        }
        async.forEach(apps, fixBrokenDeviceIDs, function() {
            countlyDb.close();
            countlyDrillDB.close();
        });
    });
});