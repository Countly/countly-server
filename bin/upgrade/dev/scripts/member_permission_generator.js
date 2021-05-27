var pluginManager = require('../../../plugins/pluginManager.js'),
    async = require('async');

pluginManager.dbConnection().then((countlyDb) => {
    countlyDb.collection('members').find({global_admin: {$ne: true}}).toArray(function(err, members) {
        if (!members && err) {
            console.log(err);
            countlyDb.close();
            return;
        }

        function upgrade(member, done) {
            if (!member.admin_of || !member.user_of) {
                done();
                return;
            }

            var writeAccess = member.admin_of;
            var readAccess = member.user_of;

            var memberPermission = {
                "c": {},
                "r": {},
                "u": {},
                "d": {}
            };

            writeAccess.forEach(app => {
                memberPermission.c[app] = {all: true};
                memberPermission.r[app] = {all: true};
                memberPermission.u[app] = {all: true};
                memberPermission.d[app] = {all: true};
            });

            readAccess.forEach(app => {
                memberPermission.r[app] = {all: true};
            });

            countlyDb.collection('members').findAndModify({"_id": member._id}, {}, {$set: {permission: memberPermission}}, function(err, member) {
                if (err || !member) {
                    console.log("Member not found.");
                }
                done();
                return;
            });
        }

        async.forEach(members, upgrade, function() {
            console.log("Finished upgrading member permissions.");
            countlyDb.close();
        });
    });
});