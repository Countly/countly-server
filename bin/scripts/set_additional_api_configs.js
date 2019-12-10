var pluginManager = require('../../plugins/pluginManager.js'),
    countlyDb = pluginManager.dbConnection(),
    logger = require('../../api/utils/log');

/**
 * Get plugins config object
 * */
countlyDb.collection('plugins').findOne({}, function(err, pluginsConfig) {
    if (!pluginsConfig && err) {
        logger('api-config-script:somethings went wrong while getting plugins config object.');
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
                    logger("api-config-script:updated configs succcesfully");
                    process.exit(0);
                }
            });
        }
        else {
            logger("api-config-script:this configs already has access-control-allow-origin value.");
            process.exit(0);
        }
    }
    upgrade();
});