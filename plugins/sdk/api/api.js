var plugins = require('../../pluginManager.js');
var common = require('../../../api/utils/common.js');
var fetch = require('../../../api/parts/data/fetch.js');
var {validateRead, validateUpdate} = require('../../../api/utils/rights.js');

const FEATURE_NAME = 'sdk';

plugins.register("/permissions/features", function(ob) {
    ob.features.push(FEATURE_NAME);
});

(function() {

    plugins.register("/o/sdk", function(ob) {
        var params = ob.params;
        if (params.qstring.method !== "sc") {
            return false;
        }
        return new Promise(function(resolve) {
            getSDKConfig(params).then(function(config) {
                delete config._id;
                config.v = 1;
                config.t = Date.now();
                config.c = config.config || {};
                delete config.config;
                common.returnOutput(params, config);
            })
                .catch(function(err) {
                    common.returnMessage(params, 400, 'Error: ' + err);
                })
                .finally(function() {
                    resolve();
                });
        });
    });

    /**
     * @api {get} /o?method=sc Get SDK config
     * @apiName GetSDKConfig
     * @apiGroup SDK Config
     * @apiPermission app
     * @apiDescription Get SDK configuration for this SDK and this user
     *
     * @apiQuery {String} app_key Application key
     *
     * @apiSuccess {Object} v - version 
     * @apiSuccess {Object} t - timestamp
     * @apiSuccess {Object} c - sdk config
     *
     * @apiSuccessExample {json} Success-Response:
     * {
        "v":1,
        "t":1682328445330,
        "c":{
            "tracking":false,
            "networking":false,
            "crashes":false,
            "views":false,
            "heartbeat":61,
            "event_queue":11,
            "request_queue":1001
        }
     * }
     */
    plugins.register("/o", function(ob) {
        var params = ob.params;

        if (params.qstring.method === "sdk-config") {
            validateRead(params, FEATURE_NAME, function() {
                getSDKConfig(params).then(function(res) {
                    common.returnOutput(params, res.config || {});
                })
                    .catch(function(err) {
                        common.returnMessage(params, 400, 'Error: ' + err);
                    });
            });

            return true;
        }
    });

    plugins.register("/i/sdk-config", function(ob) {
        var params = ob.params,
            paths = ob.paths;

        switch (paths[3]) {
        case 'update-parameter': validateUpdate(params, FEATURE_NAME, updateParameter);
            break;
        default: common.returnMessage(params, 404, 'Invalid endpoint');
            break;
        }
        return true;
    });

    plugins.register("/session/metrics", function(ob) {
        var predefinedMetrics = ob.predefinedMetrics;
        if (ob.params.qstring.sdk_name && ob.params.qstring.sdk_version) {
            ob.params.user.sdk_name = ob.params.qstring.sdk_name;
            ob.params.user.sdk_version = "[" + ob.params.qstring.sdk_name + "]_" + ob.params.qstring.sdk_version;
            predefinedMetrics.push({
                db: "sdks",
                metrics: [
                    {
                        is_user_prop: true,
                        name: "sdk_name",
                        set: "sdks",
                        short_code: "sdk.name"
                    },
                    {
                        is_user_prop: true,
                        name: "sdk_version",
                        set: "sdk_version",
                        short_code: "sdk.version"
                    }
                ]
            });
        }
    });
    plugins.register("/metric/collection", function(ob) {
        if (ob.metric === "sdks") {
            ob.data = ["sdks", "sdks"];
        }
        else if (ob.metric === "sdk_version") {
            ob.data = ["sdks", "sdk_version"];
        }
    });
    plugins.register("/o", function(ob) {
        var params = ob.params;

        if (params.qstring.method === "sdks") {
            validateRead(params, FEATURE_NAME, fetch.fetchTimeObj, 'sdks');
            return true;
        }
        return false;
    });

    plugins.register("/i/apps/clear_all", function(ob) {
        var appId = ob.appId;
        common.db.collection('sdks').remove({'_id': {$regex: appId + ".*"}}, function() {});
    });

    plugins.register("/i/apps/clear", function(ob) {
        var appId = ob.appId;
        var ids = ob.ids;
        common.db.collection('sdks').remove({$and: [{'_id': {$regex: appId + ".*"}}, {'_id': {$nin: ids}}]}, function() {});
    });

    plugins.register("/i/apps/delete", function(ob) {
        var appId = ob.appId;
        common.outDb.collection('sdk_configs').deleteOne({_id: appId + ""}, function() {});
        common.db.collection('sdks').remove({'_id': {$regex: appId + ".*"}}, function() {});
    });

    plugins.register("/i/apps/reset", function(ob) {
        var appId = ob.appId;
        common.outDb.collection('sdk_configs').deleteOne({_id: appId + ""}, function() {});
        common.db.collection('sdks').remove({'_id': {$regex: appId + ".*"}}, function() {});

    });

    /**
     * Updated SDK config
     * @param {params} params - request params
     * @returns {void}
     */
    function updateParameter(params) {
        var parameter = params.qstring.parameter;
        if (typeof parameter === "string") {
            try {
                parameter = JSON.parse(parameter);
            }
            catch (SyntaxError) {
                console.log('Error parsing parameter', parameter);
                return common.returnMessage(params, 400, 'Error parsing parameter');
            }
        }
        common.outDb.collection('sdk_configs').updateOne({_id: params.app_id + ""}, {$set: {config: parameter} }, {upsert: true}, function() {
            common.returnOutput(params, {result: 'Success'});
        });
    }

    /**
     * Function to get all remote configs
     * @param  {Object} params - params object
     * @returns {String} response
     */
    function getSDKConfig(params) {
        return new Promise(function(resolve, reject) {
            common.outDb.collection('sdk_configs').findOne({_id: params.app_id + ""}, function(err, res) {
                if (err) {
                    console.log(err);
                    return reject();
                }
                return resolve(res || {});
            });
        });
    }
}());