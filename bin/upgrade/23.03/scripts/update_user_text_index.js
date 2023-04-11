// Drop the existing index
// make the following code eslint valid
const pluginManager = require('../../../../plugins/pluginManager.js'),
    asyncjs = require('async');

pluginManager.dbConnection().then((countlyDb) => {
    countlyDb.collection('apps').find({}).toArray(function(err, apps) {
        function upgrade(app, done) {
            countlyDb.collection('app_users' + app._id).dropIndex("name_text_email_text", function(err) {
                countlyDb.collection('app_users' + app._id).createIndex(
                    { "name": "text", "email": "text", "did": "text", "uid": "text", "username": "text" },
                    { background: true, default_language: "none" },
                    function(err, result) {
                        if (err) {
                            console.log(err);
                        }
                        done();
                    }
                );
            });

        }

        asyncjs.eachSeries(apps, upgrade, function() {
            console.log("Updating index finished");
            countlyDb.close();
        });

    });

});

