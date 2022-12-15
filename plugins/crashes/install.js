var async = require('async'),
    pluginManager = require('../pluginManager.js'),
    fs = require('fs'),
    path = require('path');
console.log("Installing crash plugin");
pluginManager.dbConnection().then(function(countlyDb) {
    countlyDb.collection('apps').find({}).toArray(function(err, apps) {

        if (!apps || err) {
            countlyDb.close();
            return;
        }
        function upgrade(app, done) {
            var cnt = 0;
            console.log("Adding crash collections to " + app.name);
            function cb() {
                cnt++;
                if (cnt == 15) {
                    done();
                }
            }
            countlyDb.collection('app_crashgroups' + app._id).insert({_id: "meta"}, {ignore_errors: [11000]}, cb);
            countlyDb.collection('app_crashgroups' + app._id).ensureIndex({"name": 1}, {background: true}, cb);
            countlyDb.collection('app_crashgroups' + app._id).ensureIndex({"os": 1}, {background: true}, cb);
            countlyDb.collection('app_crashgroups' + app._id).ensureIndex({"reports": 1}, {background: true}, cb);
            countlyDb.collection('app_crashgroups' + app._id).ensureIndex({"users": 1}, {background: true}, cb);
            countlyDb.collection('app_crashgroups' + app._id).ensureIndex({"lastTs": 1}, {background: true}, cb);
            countlyDb.collection('app_crashgroups' + app._id).ensureIndex({"latest_version": 1}, {background: true}, cb);
            countlyDb.collection('app_crashgroups' + app._id).ensureIndex({"groups": 1}, {background: true}, cb);
            countlyDb.collection('app_crashgroups' + app._id).ensureIndex({"is_hidden": 1}, {background: true}, cb);
            countlyDb.collection('app_crashusers' + app._id).ensureIndex({"group": 1, "uid": 1}, {background: true}, cb);
            countlyDb.collection('app_crashusers' + app._id).ensureIndex({"group": 1, "crashes": 1, "fatal": 1}, {sparse: true, background: true}, cb);
            countlyDb.collection('app_crashusers' + app._id).ensureIndex({"uid": 1}, {background: true}, cb);
            countlyDb.collection('app_crashes' + app._id).ensureIndex({"group": 1, ts: -1}, {background: true}, cb);
            countlyDb.collection('app_crashes' + app._id).dropIndex({"group": 1}, {background: true}, cb);
            countlyDb.collection('app_crashes' + app._id).ensureIndex({"uid": 1}, {background: true}, cb);
            countlyDb.collection('app_crashes' + app._id).ensureIndex({"name": "text"}, { background: true }, cb);
        }
        async.forEach(apps, upgrade, function() {
            fs.chmod(path.resolve(__dirname + "/bin/minidump_stackwalk"), 0o744, function(err) {
                if (err && !process.env.COUNTLY_CONTAINER) {
                    console.log(err);
                }
                console.log("Crash plugin installation finished");
                countlyDb.close();
            });
        });
    });
});