var pluginManager = require('../../../../plugins/pluginManager.js');

/**
 * Get plugins config object
 * */
pluginManager.dbConnection().then((countlyDb) => {
    countlyDb.collection('plugins').findOne({ _id: "plugins" }, function(err, pluginsConfig) {
        if (!pluginsConfig || err) {
            console.log('api-config-script:somethings went wrong while getting plugins config object.');
            console.log(err);
        }
        // add access-control-allow-origin to security property if not exist
        function upgrade() {
            var edited = false;
            var modifiedApiAdditionalHeaders = "";
            // access-control-allow-origin is already configured?
            var accessControlIndex = pluginsConfig.security.api_additional_headers.indexOf("Access-Control-Allow-Origin");
            // if not edit it
            if (accessControlIndex === -1) {
                modifiedApiAdditionalHeaders = pluginsConfig.security.api_additional_headers + "\nAccess-Control-Allow-Origin:*";
                edited = true;
            }
            // make changes persistent
            if (edited) {
                countlyDb.collection('plugins').findAndModify({"_id": pluginsConfig._id }, {}, {$set: { "security.api_additional_headers": modifiedApiAdditionalHeaders }}, function(err) {
                    if (!err) {
                        console.log("api-config-script:updated configs succcesfully");
                        countlyDb.close();
                        process.exit(0);
                    }
                });
            }
            else {
                console.log("api-config-script:this configs already has access-control-allow-origin value.");
                countlyDb.close();
                process.exit(0);
            }
        }
        upgrade();
    });
});