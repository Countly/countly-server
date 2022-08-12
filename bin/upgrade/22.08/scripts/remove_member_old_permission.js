const async = require('async');

const pluginManager = require('../../../../plugins/pluginManager.js');

// This script will remove old permission from members that have new permission object
// New permissions are generated in this script `./member_permission_generator`

pluginManager.dbConnection().then((countlyDb) => {
    // If member has no permission object then that member permission might not be migrated yet
    // We will not do anything to that member
    countlyDb.collection('members').find({ permission: { $exists: true } }).toArray((err, members) => {
        if (!members || err) {
            console.log(err);
            countlyDb.close();
            return;
        }

        function removeOldPermission(member, done) {
            // Remove old permission 'admin_of' and 'user_of'
            countlyDb.collection('members').findAndModify({ _id: member._id }, {}, { $unset: { admin_of: '', user_of: '' } }, (err, member) => {
                if (err || !member) {
                    console.log('Member not found.');
                }

                done();
                return;
            });
        }

        async.forEach(members, removeOldPermission, () => {
            console.log('Finished removing members old permissions');
            countlyDb.close();
        });
    });
});
