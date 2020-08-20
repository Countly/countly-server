var pluginManager = require('../../../../plugins/pluginManager.js'),
    async = require('async');

pluginManager.dbConnection().then((countlyDb) => {
    countlyDb.collection('auth_tokens').find({}).toArray(function(err, tokens) {
        function check_and_fix_token(token, done) {
            if (typeof token.owner == 'string') {
                done();
            }
            else {
                console.log("Fixing token record: " + token._id);
                countlyDb.collection("auth_tokens").update({_id: token._id}, {$set: {"owner": token.owner + ""}}, {upsert: true}, function(err, res) {
                    done();
                });
            }
        }
        async.each(tokens, check_and_fix_token, function() {
            console.log("Finished checking tokens");
            countlyDb.close();
        });
    });
});