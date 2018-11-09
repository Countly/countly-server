var pluginManager = require('../../plugins/pluginManager.js'),
    async = require('async'),
    crypto = require('crypto'),
    countlyDb = pluginManager.dbConnection(),
    countlyDrillDB = pluginManager.dbConnection("countly_drill");

countlyDb.collection('apps').find({}).toArray(function(err, apps) {
    if (!apps || err) {
        console.log('No apps to fix');
        countlyDb.close();
        countlyDrillDB.close();
        return;
    }

    function fixBrokenDeviceIDs(app, done) {
        // find all broken app_user record containts sdk_name
        countlyDb.collection('app_users' + app._id).find({did: /.*sdk_name=javascript_feedback_popup/}).toArray(function(err, users) {
            if (!err) {
                async.forEach(users, function(brokenUser, doneUser) {
                    let fixed_device_id = brokenUser.did.substr(0, brokenUser.did.length - 34);

                    // check is there correct app_user for this fixed_device_id
                    countlyDb.collection('app_users' + app._id).findOne({did: fixed_device_id}, function(err, correctUser) {
                        if (!err) {
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
                                }, function(err) {
                                    if (!err) {
                                        countlyDb.collection('app_users' + app._id).remove({_id: brokenUser._id}, function(err) {
                                            if (!err) {
                                                countlyDb.collection('app_users' + app._id).findOne({did: fixed_device_id}, function(err, correctAppUser) {
                                                    if (!err && !correctAppUser) {
                                                        brokenUser._id = crypto.createHash('sha1')
                                                            .update(app.app_key + fixed_device_id + "")
                                                            .digest('hex');
                                                        brokenUser.did = fixed_device_id;
                                                        countlyDb.collection('app_users' + app._id).insert(brokenUser, function(err) {
                                                            if (!err) {
                                                                // map correct uid and did values to broken feedback records
                                                                countlyDb.collection("feedback" + app._id)
                                                                    .updateMany({device_id: brokenUser.did}, {
                                                                        $set: {
                                                                            device_id: brokenUser.did,
                                                                            uid: brokenUser.uid
                                                                        }
                                                                    }, function(err) {
                                                                        if(!err) doneUser();
                                                                    });
                                                            } else console.log(err);
                                                        });
                                                    } else {
                                                        // map correct uid and did values to broken feedback records
                                                        countlyDb.collection("feedback" + app._id)
                                                            .updateMany({device_id: brokenUser.did}, {
                                                                $set: {
                                                                    device_id: correctAppUser.did,
                                                                    uid: correctAppUser.uid
                                                                }
                                                            }, function(err) {
                                                                if(!err) doneUser();
                                                            });
                                                    }
                                                });
                                            }
                                        })
                                    }
                                    else {
                                        console.log(err);
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
                console.log(err);
                done();
            }
        });
    }


    async.forEach(apps, fixBrokenDeviceIDs, function() {
        countlyDb.close();
        countlyDrillDB.close();
    });
});
