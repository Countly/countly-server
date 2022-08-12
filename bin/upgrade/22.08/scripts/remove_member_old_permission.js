const async = require('async');

const pluginManager = require('../../../../plugins/pluginManager.js');

// This script will remove old permission from members that have new permission object
// New permissions are generated in this script `./member_permission_generator`

pluginManager.dbConnection().then((countlyDb) => {
    countlyDb.collection('members').updateMany({ permission: { $exists: true } }, { $unset: { admin_of: '', user_of: '' } }, function(err){
        if (err) {
            console.log(err);
        }
        countlyDb.close();
        return;
    });
});
