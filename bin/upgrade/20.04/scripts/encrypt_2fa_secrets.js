var pluginManager = require('../../../../plugins/pluginManager.js'),
    apiUtils = require('../../../../api/utils/utils.js');

pluginManager.dbConnection().then((countlyDb) => {
    countlyDb.collection('members').find({}).toArray(function(membersErr, members) {
        if (membersErr) {
            console.log(membersErr);
            return;
        }
    
        const promises = [];
    
        for (let member of members) {
            if (member.two_factor_auth && member.two_factor_auth.enabled && !member.two_factor_auth.secret_token.endsWith("[CLY]_true")) {
                promises.push(countlyDb.collection('members').updateOne(
                    {_id: member._id},
                    {$set: {"two_factor_auth.secret_token": apiUtils.encrypt(member.two_factor_auth.secret_token)}}
                ));
            }
        }
    
        Promise.all(promises)
            .then(function(result) {
                console.log(`Updated ${promises.length} unencrypted secrets`);
                countlyDb.close();
            })
            .catch(function(err) {
                console.log(err);
                countlyDb.close();
            });
    });
});