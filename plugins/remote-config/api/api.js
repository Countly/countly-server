var pluginOb = {},
    plugins = require('../../pluginManager.js'),
    common = require('../../../api/utils/common.js'),
    log = common.log('remote-config:api'),
    remoteConfig = require('./parts/rc'),
    async = require('async'),
    {validateRead, validateCreate, validateUpdate, validateDelete} = require('../../../api/utils/rights.js');

const FEATURE_NAME = 'remote_config';

plugins.setConfigs("remote-config", {
    maximum_allowed_parameters: 2000,
    conditions_per_paramaeters: 20
});

(function() {
    plugins.register("/permissions/features", function(ob) {
        ob.features.push(FEATURE_NAME);
    });

    plugins.register("/o/sdk", function(ob) {
        var params = ob.params;
        if (params.qstring.method !== "rc") {
            return false;
        }
        return getRemoteConfig(params);

    });

    plugins.register("/o/sdk", function(ob) {
        var params = ob.params;
        if (params.qstring.method !== "ab") {
            return false;
        }
        return new Promise(function(resolve, reject) {
            params.qstring.app_id = params.app_id;
            var keys = [];

            if (params.qstring.keys) {
                try {
                    keys = JSON.parse(params.qstring.keys);
                }
                catch (SyntaxError) {
                    console.log('Parse keys failed: ', params.qstring.keys);
                }
            }
            params.parameter_criteria = { "$and": [] };
            if (keys.length) {
                params.parameter_criteria.$and.push({ "parameter_key": { $in: keys } });
            }
            else {
                common.returnMessage(params, 400, 'Missing Keys');
                return reject(true);
            }
            params.app_user = params.app_user || {};
            var user = JSON.parse(JSON.stringify(params.app_user));
            var processMetrics = params.processed_metrics;

            for (var prop in processMetrics) {
                if ((processMetrics[prop] !== undefined) && (processMetrics[prop] !== null)) {
                    user[prop] = processMetrics[prop];
                    params.app_user[prop] = processMetrics[prop];
                }
            }


            async.series([
                fetchParametersFromAB.bind(null, params)
            ], function(err, result) {
                if (err || !result) {
                    common.returnMessage(params, 400, 'Error while fetching remote config data.');
                    return reject(true);
                }
                var abParameters = result[0] || [];
                var output = {};
                for (let i = 0; i < abParameters.length; i++) {
                    var parameterKey = abParameters[i].parameter_key;
                    var paramValue = abParameters[i].value;

                    output[parameterKey] = paramValue;
                }
                common.returnMessage(params, 200, "Successfully enrolled in ab tests");
                return resolve(true);

            });
        });
    });

    /**
     * @api {get} /o/sdk?method=fetch_remote_config Get remote configs in sdk
     * @apiName GetRemoteConfigInSdk
     * @apiGroup Remote Config
     * @apiPermission user
     * @apiDescription Fetch all remote config in sdk
     *
     * @apiQuery {String} app_key APP_KEY of an app for which to fetch remote config
     * @apiQuery {String} device_id Your generated or device specific unique device ID to identify user
     * @apiQuery {String} [timestamp] 10 digit UTC timestamp for recording past data
     * @apiQuery {String} [city] Name of the user's city
     * @apiQuery {String} [country_code] ISO Country code for the user's country
     * @apiQuery {String} [location] Users lat, lng
     * @apiQuery {String} [tz] Users timezone
     * @apiQuery {String} [ip_address]  IP address of user to determine user location, if not provided, countly will try to establish ip address based on connection data
     * @apiQuery {String[]} [keys] Only the values mentioned in the array will be fetched
     * @apiQuery {String[]} [omit_keys] Only the values mentioned in the array will not be fetched
     * @apiQuery {Object} [metrics] JSON object with key value pairs
     *
     * @apiSuccessExample {json} Success-Response:
     * {
            "default_colors": {
                "button": "#f77a22",
                "buttonColor": "#ffffff",
                "titleColor": "#2eb52b"
            },
            "display_onboarding": true,
            "image_alt": "The image cannot be loaded"
        }
     */
    plugins.register("/o/sdk", function(ob) {
        var params = ob.params;

        if (params.qstring.method !== "fetch_remote_config") {
            return false;
        }
        return getRemoteConfig(params);
    });

    plugins.register("/i/remote-config", function(ob) {
        var params = ob.params,
            paths = ob.paths;


        switch (paths[3]) {
        case 'add-parameter': validateCreate(params, FEATURE_NAME, addParameter);
            break;
        case 'update-parameter': validateUpdate(params, FEATURE_NAME, updateParameter);
            break;
        case 'remove-parameter': validateDelete(params, FEATURE_NAME, removeParameter);
            break;
        case 'add-condition': validateUpdate(params, FEATURE_NAME, addCondition);
            break;
        case 'update-condition': validateUpdate(params, FEATURE_NAME, updateCondition);
            break;
        case 'remove-condition': validateDelete(params, FEATURE_NAME, removeCondition);
            break;
        case 'add-complete-config': validateCreate(params, FEATURE_NAME, addCompleteConfig);
            break;
        default: common.returnMessage(params, 404, 'Invalid endpoint');
            break;
        }
        return true;
    });

    /**
     * @api {get} /o?method=remote-config Get remote configs
     * @apiName GetRemoteConfig
     * @apiGroup Remote Config
     * @apiPermission user
     * @apiDescription Get all the remote configs and the conditions in the dashboard
     *
     * @apiQuery {String} app_id Application ID
     *
     * @apiSuccess {Object[]} parameters All the parameter information
     * @apiSuccess {Object[]} conditions All the condition information
     *
     * @apiSuccessExample {json} Success-Response:
     * {
            "parameters": [
                {
                "_id": "5c3b064763c6920705d94e9b",
                "parameter_key": "button_color",
                "default_value": [
                    "#000"
                ],
                "conditions": [
                    {
                    "condition_id": "5c3f8d50a9c3f071cecc8b87",
                    "value": [
                        "#FFF"
                    ]
                    }
                ],
                "description": "Button color of the apps"
                }
            ],
            "conditions": [
                {
                "_id": "5c3f8d50a9c3f071cecc8b87",
                "condition_name": "android",
                "condition_color": 2,
                "condition": "{\"up.d\":{\"$in\":[\"Asus Nexus 10\"]}}",
                "condition_definition": "Device = Asus Nexus 10",
                "seed_value": "",
                "used_in_parameters": 1
                }
            ]
        }
     */
    plugins.register("/o", function(ob) {
        var params = ob.params;

        if (params.qstring.method === "remote-config") {
            validateRead(params, FEATURE_NAME, function() {
                var parallelTasks = [
                    fetchParametersFromRCDB.bind(null, params),
                    fetchConditions.bind(null, params)
                ];

                async.parallel(parallelTasks, function(err, result) {
                    if (err || !result) {
                        common.returnMessage(params, 401, 'Error while fetching remote config data.');
                        return true;
                    }

                    var parameters = result[0] || [];
                    var conditions = result[1] || [];

                    for (let i = 0; i < conditions.length; i++) {
                        var conditionId = conditions[i]._id;
                        conditions[i].used_in_parameters = 0;
                        for (let j = 0; j < parameters.length; j++) {
                            var paramConditions = parameters[j].conditions || [];
                            var filteredCondition = paramConditions.filter(function(obj) {
                                return obj.condition_id.toString() === conditionId.toString();
                            });

                            if (filteredCondition.length) {
                                conditions[i].used_in_parameters++;
                            }
                        }
                    }

                    var output = {
                        parameters: parameters,
                        conditions: conditions
                    };
                    common.returnOutput(params, output);
                });
            });

            return true;
        }
    });

    plugins.register("/log", function(ob) {
        var params = ob.params;
        var insertData = ob.insertData;
        var problems = ob.problems;
        var types = insertData.t;

        if (params.qstring.method === "ab_enroll_variant" || params.qstring.method === "ab_opt_out") {
            plugins.dispatch("/sdk/ab", {params: params});
            return;
        }
        else if (params.qstring.method !== "fetch_remote_config") {
            return;
        }

        types.rc = insertData.res;

        if (params.qstring.keys) {
            try {
                JSON.parse(params.qstring.keys);
            }
            catch (ex) {
                problems.push("Could not parse keys");
            }
        }

        if (params.qstring.omit_keys) {
            try {
                JSON.parse(params.qstring.omit_keys);
            }
            catch (SyntaxError) {
                problems.push("Could not parse omit keys");
            }
        }
    });

    plugins.register("/i/apps/delete", function(ob) {
        var appId = ob.appId;
        common.outDb.collection('remoteconfig_parameters' + appId).drop(function() {});
        common.outDb.collection('remoteconfig_conditions' + appId).drop(function() {});
    });

    plugins.register("/i/apps/reset", function(ob) {
        var appId = ob.appId;
        common.outDb.collection('remoteconfig_parameters' + appId).drop(function() {});
        common.outDb.collection('remoteconfig_conditions' + appId).drop(function() {});
    });

    /**
     * @api {get} /i/remote-config/add-parameter Add a parameter
     * @apiName AddRcParameter
     * @apiGroup Remote Config
     * @apiPermission user
     * @apiDescription Add parameter to remote config
     *
     * @apiQuery {String} app_id Application id
     * @apiQuery {Object} parameter Parameter information
     *
     */
    /**
     * Function to add a parameter
     * @param  {Object} params - params object
     * @returns {String} response
     */
    function addParameter(params) {
        var appId = params.qstring.app_id;
        var parameter = {};

        try {
            parameter = JSON.parse(params.qstring.parameter);
        }
        catch (SyntaxError) {
            console.log('Parse parameter failed: ', params.qstring.parameter);
        }

        var parameterKey = parameter.parameter_key;
        var defaultValue = parameter.default_value;

        if (parameter._id && typeof parameter._id === typeof '') {
            parameter._id = common.outDb.ObjectID(parameter._id);
        }

        var pattern = new RegExp(/^[a-zA-Z_][a-zA-Z0-9_]*$/);
        if (!parameterKey || !pattern.test(parameterKey)) {
            if (params.internal) {
                return 'Invalid parameter: parameter_key';
            }
            common.returnMessage(params, 400, 'Invalid parameter: parameter_key');
            return true;
        }

        if (defaultValue === undefined) {
            if (params.internal) {
                return 'Invalid parameter: default_value';
            }
            common.returnMessage(params, 400, 'Invalid parameter: default_value');
            return true;
        }

        parameter.conditions = parameter.conditions || [];
        processParamValue(parameter);

        var maximumParametersAllowed = plugins.getConfig("remote-config").maximum_allowed_parameters;
        var maximumConditionsAllowed = plugins.getConfig("remote-config").conditions_per_paramaeters;
        var collectionName = "remoteconfig_parameters" + appId;
        parameter.ts = Date.now();
        var asyncTasks = [
            checkMaximumParameterLimit.bind(null, appId, maximumParametersAllowed),
            checkMaximumConditionsLimit.bind(null, parameter.conditions, maximumConditionsAllowed),
            checkIfParameterExists.bind(null, appId, parameterKey, null),
            insertParameter.bind(null, params, collectionName, parameter)
        ];

        async.series(asyncTasks, function(err) {
            if (err) {
                var message = 'Failed to add parameter';
                if (err.exists) {
                    message = 'The parameter already exists';
                }
                if (params.internal) {
                    return message;
                }
                return common.returnMessage(params, 500, message);
            }
            if (params.internal) {
                return true;
            }
            return common.returnMessage(params, 200);
        });
    }

    /**
     * Function to add the complete config including parameter and condition
     * @param  {Object} params - params object
     * @returns {String} response
     */
    function addCompleteConfig(params) {
        var appId = params.qstring.app_id;
        var config = {};

        try {
            config = JSON.parse(params.qstring.config);
        }
        catch (SyntaxError) {
            console.log('Parse config failed: ', params.qstring.config);
        }

        var parameters = config.parameters || [];
        var condition = config.condition || {};
        var isCondition = condition && Object.keys(condition).length;

        if (!parameters.length) {
            common.returnMessage(params, 400, 'Invalid config');
            return true;
        }

        var maximumParametersAllowed = plugins.getConfig("remote-config").maximum_allowed_parameters;
        var maximumConditionsAllowed = plugins.getConfig("remote-config").conditions_per_paramaeters;

        var parametersList = parameters.map(function(p) {
            return p.parameter_key;
        });

        params.parameter_criteria = {
            parameter_key: {
                $in: parametersList
            }
        };

        var asyncTasks = [
            checkMaximumParameterLimit.bind(null, appId, maximumParametersAllowed),
            fetchParametersFromRCDB.bind(null, params),
        ];

        if (isCondition) {
            var conditionName = condition.condition_name;

            var conditionPattern = new RegExp(/^[a-zA-Z0-9 ]+$/);
            if (!conditionName || !conditionPattern.test(conditionName.trim())) {
                common.returnMessage(params, 400, 'Invalid parameter: condition_name');
                return true;
            }

            asyncTasks.push(checkIfConditionExists.bind(null, appId, conditionName, null));
        }

        async.parallel(asyncTasks, function(err, result) {
            if (err) {
                return common.returnMessage(params, 500, "Condition already exists or parameters limit reached");
            }

            var existingParameters = (result && result[1]) || [];

            if (isCondition) {
                condition.condition_color = 1;
                condition.seed_value = "";
                condition.condition = JSON.stringify(condition.condition);
                asyncTasks = [insertCondition.bind(null, condition)];
            }

            async.parallel(asyncTasks, function(error, res) {
                var conditionId;

                if (isCondition) {
                    conditionId = (res && res[0]) || null;

                    if (error || !conditionId) {
                        return common.returnMessage(params, 500, "Error while adding condition");
                    }

                    conditionId = conditionId.toString();
                }

                for (let i = 0; i < parameters.length; i++) {
                    var param = parameters[i];
                    var parameterKey = param.parameter_key;

                    var parameterPattern = new RegExp(/^[a-zA-Z_][a-zA-Z0-9_]*$/);
                    if (!parameterKey || !parameterPattern.test(parameterKey)) {
                        return common.returnMessage(params, 400, 'Invalid parameter: parameter_key');
                    }

                    var existingParameter = existingParameters.filter(function(p) {
                        return p.parameter_key === param.parameter_key;
                    });

                    if (existingParameter.length && isCondition) {
                        var conditions = existingParameter[0].conditions;
                        if (conditions.length >= maximumConditionsAllowed) {
                            return common.returnMessage(params, 500, "Maximum conditions per parameter reached");
                        }
                    }
                }

                async.map(parameters, function(parameter, done) {
                    var existingParam = existingParameters.filter(function(p) {
                        return p.parameter_key === parameter.parameter_key;
                    });

                    var func, parameterObj;

                    var collectionName = "remoteconfig_parameters" + appId;

                    if (existingParam.length) {
                        //The parameter already existed
                        parameterObj = existingParam[0];
                        var parameterId = parameterObj._id.toString();
                        if (isCondition) {
                            //Set the experiment value as condition value
                            //We are not updating the default value here, because
                            //In this case the parameter already has a default value set
                            //in remote config collection. Should we update it?
                            //If so the previous value will be lost.
                            parameterObj.conditions = parameterObj.conditions || [];
                            parameterObj.conditions.unshift({
                                condition_id: conditionId,
                                value: parameter.exp_value
                            });
                        }
                        else {
                            //Set the experiment value as default value
                            parameterObj.default_value = parameter.exp_value;
                        }

                        processParamValue(parameterObj);
                        func = updateParameterInDb.bind(null, params, collectionName, parameterId, parameterObj);
                    }
                    else {
                        //This is a new parameter
                        parameterObj = {};
                        parameterObj.parameter_key = parameter.parameter_key;
                        parameterObj.description = parameter.description || "-";

                        if (isCondition) {
                            //Set the experiment value as condition value
                            parameterObj.default_value = parameter.default_value;
                            parameterObj.conditions = [
                                {
                                    condition_id: conditionId,
                                    value: parameter.exp_value
                                }
                            ];
                        }
                        else {
                            //Set the experiment value as default value
                            parameterObj.conditions = [];
                            parameterObj.default_value = parameter.exp_value;
                        }

                        processParamValue(parameterObj);
                        func = insertParameter.bind(null, params, collectionName, parameterObj);
                    }

                    func(function(e) {
                        return done(e);
                    });
                }, function(errr) {
                    if (errr) {
                        return common.returnMessage(params, 500, "Error while adding the config.");
                    }

                    plugins.dispatch("/systemlogs", {params: params, action: "rc_rollout", data: {parameters: parameters, condition: condition}});
                    return common.returnMessage(params, 200);
                });
            });
        });

        /**
         * Function to insert condition into collection
         * @param  {Object} cond - condition object
         * @param  {Function} callback - callback function
         */
        function insertCondition(cond, callback) {
            var collectionName = "remoteconfig_conditions" + appId;
            common.outDb.collection(collectionName).insert(cond, function(err, result) {
                if (!err && result && result.insertedIds && result.insertedIds[0]) {
                    var conditionId = result.insertedIds[0];
                    return callback(err, conditionId);
                }

                return callback(err);
            });
        }
    }

    /**
     * Function to get all remote configs
     * @param  {Object} params - params object
     * @returns {String} response
     */
    function getRemoteConfig(params) {
        return new Promise(function(resolve, reject) {
            params.qstring.app_id = params.app_id;
            var keys = [];
            var omitKeys = [];
            var parametersCountArray = [];

            if (params.qstring.keys) {
                try {
                    keys = JSON.parse(params.qstring.keys);
                }
                catch (SyntaxError) {
                    console.log('Parse keys failed: ', params.qstring.keys);
                }
            }

            if (params.qstring.omit_keys) {
                try {
                    omitKeys = JSON.parse(params.qstring.omit_keys);
                }
                catch (SyntaxError) {
                    console.log('Parse omit keys failed: ', params.qstring.omit_keys);
                }
            }
            params.parameter_criteria = {"$and": []};
            params.parameter_criteria.$and.push({
                $or: [
                    {"status": {$exists: false}},
                    {"status": {$exists: true, $eq: "Running"}},
                ]
            });
            params.parameter_criteria.$and.push({
                $or: [
                    {"expiry_dttm": {$exists: true, $gt: Date.now()}},
                    {"expiry_dttm": null}
                ]
            });
            if (keys.length || omitKeys.length) {
                if (keys.length) {
                    params.parameter_criteria.$and.push({"parameter_key": { $in: keys }});
                }

                if (omitKeys.length) {
                    params.parameter_criteria.$and.push({"parameter_key": { $nin: omitKeys }});
                }
            }
            params.app_user = params.app_user || {};
            var user = JSON.parse(JSON.stringify(params.app_user));
            var processMetrics = params.processed_metrics;

            for (var prop in processMetrics) {
                if ((processMetrics[prop] !== undefined) && (processMetrics[prop] !== null)) {
                    user[prop] = processMetrics[prop];
                    params.app_user[prop] = processMetrics[prop];
                }
            }

            async.series([
                fetchParametersFromRCDB.bind(null, params),
                fetchParametersFromAB.bind(null, params)
            ], function(err, result) {
                if (err || !result) {
                    common.returnMessage(params, 400, 'Error while fetching remote config data.');
                    return reject(true);
                }

                var parameters = result[0] || [];
                var abParameters = result[1] || [];
                var output = {};

                var parametersArray = [];
                for (let i = 0; i < parameters.length; i++) {
                    parametersArray.push(parameters[i].parameter_key);
                }

                //PRIORITY GIVEN TO PARAMETERS PRESENT IN AB TESTING
                for (let i = 0; i < abParameters.length; i++) {
                    var parameterKey = abParameters[i].parameter_key;
                    var paramValue = abParameters[i].value;

                    var indexOfKey = parametersArray.indexOf(parameterKey);
                    if (indexOfKey > -1) {
                        parameters.splice(indexOfKey, 1);
                        parametersArray.splice(indexOfKey, 1);
                    }

                    output[parameterKey] = paramValue;
                }

                async.map(parameters, function(parameter, callback) {
                    var paramConditions = parameter.conditions || [];
                    var parameterValue = parameter.default_value;
                    var paramConditionIds = [];
                    for (let i = 0; i < paramConditions.length; i++) {
                        paramConditionIds.push(common.outDb.ObjectID(paramConditions[i].condition_id));
                    }

                    params.condition_criteria = {
                        _id: {
                            $in: paramConditionIds
                        }
                    };

                    async.series([fetchConditions.bind(null, params)], function(er, res) {
                        if (er || !res) {
                            output[parameter.parameter_key] = parameterValue;
                            log.w("Error while fetching condition", parameter);
                            if (parameter.c) {
                                parameter.c = parameter.c + 1;
                            }
                            else {
                                parameter.c = 1;
                            }
                            parametersCountArray.push({
                                parameter
                            });
                            return callback(null);
                        }

                        var paramConditionsInfo = res[0];
                        var conditionCount = false;

                        for (let i = 0; i < paramConditions.length; i++) {
                            var conditionInfo = paramConditionsInfo.filter(function(cond) {
                                return cond._id.toString() === paramConditions[i].condition_id.toString();
                            });

                            if (!conditionInfo.length) {
                                continue;
                            }

                            var conditionObj = conditionInfo[0];
                            conditionObj.value = paramConditions[i].value;

                            try {
                                conditionObj.condition = JSON.parse(conditionObj.condition);
                                plugins.dispatch("/drill/preprocess_query", {
                                    query: conditionObj.condition
                                });
                            }
                            catch (e) {
                                log.w("Skipping condition", conditionObj);
                                continue;
                            }

                            var seed = conditionObj.seed_value || "";
                            var deviceId = params.qstring.device_id || "";
                            user.random_percentile = remoteConfig.randomPercentile(seed, deviceId);

                            var conditionStatus = remoteConfig.processFilter(params, user, conditionObj.condition);

                            if (conditionStatus) {
                                parameterValue = conditionObj.value;
                                conditionCount = true;
                                if (parameter.conditions[i].c) {
                                    parameter.conditions[i].c = parameter.conditions[i].c + 1;
                                }
                                else {
                                    parameter.conditions[i].c = 1;
                                }
                                break;
                            }
                        }
                        if (!conditionCount) {
                            if (parameter.c) {
                                parameter.c = parameter.c + 1;
                            }
                            else {
                                parameter.c = 1;
                            }
                        }
                        output[parameter.parameter_key] = parameterValue;
                        parametersCountArray.push({
                            parameter
                        });
                        return callback(null);
                    });
                }, function(e) {
                    if (e) {
                        common.returnMessage(params, 400, 'Error while fetching remote config data.');
                        return reject(true);
                    }
                    updateParametersInDb(params, parametersCountArray);
                    common.returnOutput(params, output, true);
                    return resolve(true);
                });
            });

        });
    }

    /**
     * @api {get} /i/remote-config/update-parameter Update a parameter
     * @apiName UpdateRcParameter
     * @apiGroup Remote Config
     * @apiPermission user
     * @apiDescription Update remote config parameter
     *
     * @apiQuery {String} app_id Application id
     * @apiQuery {Object} parameter Parameter information
     * @apiQuery {String} parameter_id Id of the parameter which is to be updated
     *
     */
    /**
     * Function to update parameter
     * @param  {Object} params - params object
     * @returns {String} response
     */
    function updateParameter(params) {
        var appId = params.qstring.app_id;
        var parameter = {};

        try {
            parameter = JSON.parse(params.qstring.parameter);
        }
        catch (SyntaxError) {
            console.log('Parse parameter failed: ', params.qstring.parameter);
        }

        var parameterId = params.qstring.parameter_id;
        var parameterKey = parameter.parameter_key;
        var defaultValue = parameter.default_value;

        var pattern = new RegExp(/^[a-zA-Z_][a-zA-Z0-9_]*$/);
        if (!pattern.test(parameterKey)) {
            common.returnMessage(params, 400, 'Invalid parameter: parameter_key');
            return true;
        }

        if (!defaultValue && defaultValue !== false) {
            common.returnMessage(params, 400, 'Invalid parameter: default_value');
            return true;
        }

        var maximumConditionsAllowed = plugins.getConfig("remote-config").conditions_per_paramaeters;

        parameter.conditions = parameter.conditions || [];
        processParamValue(parameter);

        var collectionName = "remoteconfig_parameters" + appId;

        var asyncTasks = [
            checkMaximumConditionsLimit.bind(null, parameter.conditions, maximumConditionsAllowed),
            checkIfParameterExists.bind(null, appId, parameterKey, parameterId),
            updateParameterInDb.bind(null, params, collectionName, parameterId, parameter)
        ];

        async.series(asyncTasks, function(err) {
            if (err) {
                var message = 'Failed to update parameter';
                if (err.exists) {
                    message = 'The parameter already exists';
                }
                return common.returnMessage(params, 500, message);
            }

            return common.returnMessage(params, 200);
        });
    }

    /**
     * Function to update parameter in collection
     * @param  {String} params - params object
     * @param  {String} collectionName - collection name
     * @param  {String} parameterId - parameter id
     * @param  {Object} parameter - parameter object
     * @param  {Function} callback - callback function
     */
    function updateParameterInDb(params, collectionName, parameterId, parameter, callback) {
        var valuesList = JSON.parse(JSON.stringify(parameter.valuesList));
        delete parameter.valuesList;

        var update = {
            $set: parameter,
            $addToSet: {
                valuesList: {
                    $each: valuesList
                }
            }
        };

        common.outDb.collection(collectionName).findOne({"_id": common.outDb.ObjectID(parameterId)}, function(err, beforeData) {
            if (!err) {
                common.outDb.collection(collectionName).update({_id: common.outDb.ObjectID(parameterId)}, update, function(updateErr) {
                    delete beforeData.valuesList;
                    if (!beforeData.expiry_dttm) {
                        beforeData.expiry_dttm = "-";
                    }
                    if (!parameter.expiry_dttm) {
                        parameter.expiry_dttm = "-";
                    }
                    plugins.dispatch("/systemlogs", {params: params, action: "rc_parameter_edited", data: { before: beforeData, after: parameter }});
                    return callback(updateErr);
                });
            }
            else {
                return callback(err);
            }
        });
    }
    /**
     * Function to update parameter in collection
     * @param  {String} params - params object
     * @param  {Object} parameters - parameters array
     */
    function updateParametersInDb(params, parameters) {
        try {
            let appId = params.qstring.app_id;
            const collectionName = "remoteconfig_parameters" + appId;
            let bulkArray = [];
            parameters.forEach(parameter=> {
                let id = parameter.parameter._id;
                bulkArray.push({
                    'updateOne': {
                        'filter': {
                            '_id': id
                        },
                        'update': {
                            '$set': parameter.parameter
                        }
                    },
                });
            });
            if (bulkArray.length > 0) {
                common.outDb.collection(collectionName).bulkWrite(bulkArray, function(error) {
                    if (error) {
                        log.w("Error while bulk write of updating parameters count", error);
                    }
                });
            }
        }
        catch (e) {
            log.w("Error while updating parameters count", e);
        }
    }

    /**
     * Function to insert parameter into collection
     * @param  {Object} params - params
     * @param  {Object} collectionName - collection name
     * @param  {Object} parameter - parameters object
     * @param  {Function} callback - callback function
     */
    function insertParameter(params, collectionName, parameter, callback) {
        common.outDb.collection(collectionName).insert(parameter, function(err, result) {
            if (!err && result && result.insertedIds && result.insertedIds[0]) {
                var parameterId = result.insertedIds[0];
                plugins.dispatch("/systemlogs", { params: params, action: "rc_parameter_created", data: parameter });
                return callback(err, parameterId);
            }
            return callback(err);
        });
    }

    /**
     * @api {get} /i/remote-config/remove-parameter Remove a parameter
     * @apiName RemoveRcParameter
     * @apiGroup Remote Config
     * @apiPermission user
     * @apiDescription Remove a remote config parameter
     *
     * @apiQuery {String} app_id Application id
     * @apiQuery {String} parameter_id Id of the parameter which is to be removed
     *
     */
    /**
     * Function to remote parameter
     * @param  {Object} params - params object
     */
    function removeParameter(params) {
        var appId = params.qstring.app_id;
        var parameterId = params.qstring.parameter_id;
        var collectionName = "remoteconfig_parameters" + appId;
        common.outDb.collection(collectionName).findOne({"_id": common.outDb.ObjectID(parameterId)}, function(err, parameter) {
            if (!err) {
                common.outDb.collection(collectionName).remove({_id: common.outDb.ObjectID(parameterId)}, function(removeErr) {
                    if (!removeErr) {
                        plugins.dispatch("/systemlogs", {params: params, action: "rc_parameter_removed", data: parameter});
                        return common.returnMessage(params, 200, 'Success');
                    }

                    return common.returnMessage(params, 500, "Failed to remove parameter");
                });
            }
        });
    }

    /**
     * @api {get} /i/remote-config/add-condition Add a condition
     * @apiName AddRcCondition
     * @apiGroup Remote Config
     * @apiPermission user
     * @apiDescription Add remote config condition
     *
     * @apiQuery {String} app_id Application id
     * @apiQuery {Object} condition Condition information
     *
     */
    /**
     * Function to add condition
     * @param  {Object} params - params object
     * @returns {String} response
     */
    function addCondition(params) {
        var appId = params.qstring.app_id;
        var condition = {};

        try {
            condition = JSON.parse(params.qstring.condition);
        }
        catch (SyntaxError) {
            console.log('Parse condition failed: ', params.qstring.condition);
        }

        var conditionName = condition.condition_name;
        var conditionColor = condition.condition_color;

        var pattern = new RegExp(/^[a-zA-Z0-9 ]+$/);
        if (!conditionName || !pattern.test(conditionName.trim())) {
            if (params.internal) {
                return 'Invalid parameter: condition_name';
            }
            common.returnMessage(params, 400, 'Invalid parameter: condition_name');
            return true;
        }

        if (!conditionColor) {
            if (params.internal) {
                return 'Invalid parameter: condition_color';
            }
            common.returnMessage(params, 400, 'Invalid parameter: condition_color');
            return true;
        }

        if (typeof condition.condition !== typeof '') {
            condition.condition = JSON.stringify(condition.condition);
        }

        var asyncTasks = [
            checkIfConditionExists.bind(null, appId, conditionName, null),
            insertCondition.bind(null)
        ];

        async.series(asyncTasks, function(err, result) {
            if (err) {
                var message = 'Failed to add condition';
                if (err.exists) {
                    message = 'The condition already exists';
                }
                if (params.internal) {
                    return message;
                }
                return common.returnMessage(params, 500, message);
            }

            var conditionId = result && result[1] || null;
            if (params.internal) {
                return conditionId;
            }
            return common.returnOutput(params, conditionId);
        });

        /**
         * Function to insert condition in collection
         * @param  {Function} callback - callback function
         */
        function insertCondition(callback) {
            var collectionName = "remoteconfig_conditions" + appId;
            if (condition._id && typeof condition._id === typeof '') {
                condition._id = common.db.ObjectID(condition._id);
            }
            common.outDb.collection(collectionName).insert(condition, function(err, result) {
                if (!err && result && result.insertedIds && result.insertedIds[0]) {
                    var conditionId = result.insertedIds[0];
                    plugins.dispatch("/systemlogs", {params: params, action: "rc_condition_created", data: condition});
                    return callback(err, conditionId);
                }

                return callback(err);
            });
        }
    }

    /**
     * Function to check if parameter exists
     * @param  {String} appId - app id
     * @param  {String} parameterKey - parameter name
     * @param  {String} expception - exception parameter id
     * @param  {Function} callback - callack function
     */
    function checkIfParameterExists(appId, parameterKey, expception, callback) {
        var collectionName = "remoteconfig_parameters" + appId;
        if (expception) {
            expception = common.outDb.ObjectID(expception);
        }
        common.outDb.collection(collectionName).findOne({parameter_key: parameterKey, _id: { $ne: expception }}, function(err, res) {
            if (err || res) {
                err = err || new Error("The parameter already exists");
                if (res) {
                    err.exists = true;
                }
                return callback(err);
            }

            return callback();
        });
    }

    /**
     * Function to check the maximum parameter limit
     * @param  {String} appId - app id
     * @param  {Number} maximumParams - Maximum allowed parameters
     * @param  {Function} callback - callback function
     */
    function checkMaximumParameterLimit(appId, maximumParams, callback) {
        var collectionName = "remoteconfig_parameters" + appId;
        common.outDb.collection(collectionName).estimatedDocumentCount(function(err, count) {
            if (err || count >= maximumParams) {
                err = err || new Error("Maximum parameters limit reached");
                return callback(err);
            }

            return callback(null);
        });
    }

    /**
     * Function to check maximum condition limit
     * @param  {Array} conditions - conditions array
     * @param  {Number} maximumConditions - maximum allowed conditions
     * @param  {Function} callback - callback function
     * @returns {Function} callback
     */
    function checkMaximumConditionsLimit(conditions, maximumConditions, callback) {
        if (conditions.length > maximumConditions) {
            var err = new Error("Maximum conditions limit reached");
            return callback(err);
        }

        return callback(null);
    }

    /**
     * Function to check if the condition exists
     * @param  {String} appId - app id
     * @param  {String} conditionName - condition name
     * @param  {String} expception - exception condition id
     * @param  {Function} callback - callback function
     */
    function checkIfConditionExists(appId, conditionName, expception, callback) {
        var collectionName = "remoteconfig_conditions" + appId;
        if (expception) {
            expception = common.outDb.ObjectID(expception);
        }

        common.outDb.collection(collectionName).findOne({condition_name: conditionName, _id: { $ne: expception }}, function(err, res) {
            if (err || res) {
                err = err || new Error("The condition already exists");
                if (res) {
                    err.exists = true;
                }
                return callback(err, res);
            }
            return callback();
        });
    }

    /**
     * @api {get} /i/remote-config/update-condition Update a condition
     * @apiName UpdateRcCondition
     * @apiGroup Remote Config
     * @apiPermission user
     * @apiDescription Update remote config condition
     *
     * @apiQuery {String} app_id Application id
     * @apiQuery {Object} condition Condition information
     * @apiQuery {String} condition_id Id of the condition that is to be updated
     *
     */
    /**
     * Function to update condition
     * @param  {Object} params - params object
     * @returns {String} response
     */
    function updateCondition(params) {
        var appId = params.qstring.app_id;
        var condition = {};

        try {
            condition = JSON.parse(params.qstring.condition);
        }
        catch (SyntaxError) {
            console.log('Parse condition failed: ', params.qstring.condition);
        }

        var conditionId = params.qstring.condition_id;
        var conditionName = condition.condition_name;
        var conditionColor = condition.condition_color;

        var pattern = new RegExp(/^[a-zA-Z0-9 ]+$/);
        if (!conditionName || !pattern.test(conditionName.trim())) {
            common.returnMessage(params, 400, 'Invalid parameter: condition_name');
            return true;
        }

        if (!conditionColor) {
            common.returnMessage(params, 400, 'Invalid parameter: condition_color');
            return true;
        }

        condition.condition = JSON.stringify(condition.condition);

        var asyncTasks = [
            checkIfConditionExists.bind(null, appId, conditionName, conditionId),
            updateConditionInDb.bind(null)
        ];

        async.series(asyncTasks, function(err) {
            if (err) {
                var message = 'Failed to update condition';
                if (err.exists) {
                    message = 'The condition already exists';
                }
                return common.returnMessage(params, 500, message);
            }

            return common.returnMessage(params, 200);
        });

        /**
         * Function to update condition in collection
         * @param  {Function} callback - callback function
         */
        function updateConditionInDb(callback) {
            var collectionName = "remoteconfig_conditions" + appId;
            common.outDb.collection(collectionName).findOne({_id: common.outDb.ObjectID(conditionId)}, function(err, beforeData) {
                common.outDb.collection(collectionName).update({_id: common.outDb.ObjectID(conditionId)}, {$set: condition}, function(updateErr) {
                    plugins.dispatch("/systemlogs", {params: params, action: "rc_condition_edited", data: {before: beforeData, after: condition} });
                    return callback(updateErr);
                });
            });
        }
    }

    /**
     * @api {get} /i/remote-config/remove-condition Remove a condition
     * @apiName RemoveRcCondition
     * @apiGroup Remote Config
     * @apiPermission user
     * @apiDescription Remove remote config condition
     *
     * @apiQuery {String} app_id Application id
     * @apiQuery {String} condition_id Id of the condition that is to be removed
     *
    /**
     * Function to remove condition
     * @param  {Object} params - params object
     */
    function removeCondition(params) {
        var appId = params.qstring.app_id;
        var conditionId = params.qstring.condition_id;

        var asyncTasks = [
            removeConditionFromConditions.bind(null, conditionId),
            removeConditionFromParameters.bind(null, conditionId)
        ];

        async.parallel(asyncTasks, function(err) {
            if (!err) {
                return common.returnMessage(params, 200, 'Success');
            }

            return common.returnMessage(params, 500, "Failed to remove condition");
        });

        /**
         * Function to remove condition from conditions collection
         * @param  {String} cId - condtion id
         * @param  {Function} callback - callback function
         */
        function removeConditionFromConditions(cId, callback) {
            var collectionName = "remoteconfig_conditions" + appId;
            common.outDb.collection(collectionName).findOne({_id: common.outDb.ObjectID(cId)}, function(err, condition) {
                common.outDb.collection(collectionName).remove({_id: common.outDb.ObjectID(cId)}, function(removeErr) {
                    plugins.dispatch("/systemlogs", {params: params, action: "rc_condition_removed", data: condition});
                    return callback(removeErr);
                });
            });
        }

        /**
         * Function to remove condition from parameter document
         * @param  {String} condId - condition id
         * @param  {Function} callback - callback function
         */
        function removeConditionFromParameters(condId, callback) {
            var collectionName = "remoteconfig_parameters" + appId;
            common.outDb.collection(collectionName).findOne({_id: common.outDb.ObjectID(condId)}, function(err, condition) {
                common.outDb.collection(collectionName).update({}, {$pull: {conditions: {condition_id: condId}}}, {multi: true}, function(updateErr) {
                    plugins.dispatch("/systemlogs", {params: params, action: "rc_condition_removed", data: condition});
                    return callback(updateErr);
                });
            });
        }
    }

    /**
     * Function to fetch parameter from collection
     * @param  {Object} params - params object
     * @param  {Function} callback - callback function
     */
    function fetchParametersFromRCDB(params, callback) {
        var appId = params.qstring.app_id;
        var collectionName = "remoteconfig_parameters" + appId;
        var criteria = params.parameter_criteria || {};

        common.outDb.collection(collectionName).find(criteria).toArray(function(err, result) {
            if (err) {
                return callback(err);
            }

            return callback(null, result);
        });
    }

    /**
     * Function to fetch paramters from AB testing
     * @param  {Object} params - params object
     * @param  {Function} callback - callback function
     */
    function fetchParametersFromAB(params, callback) {
        plugins.dispatch("/ab/parameters", { params: params }, function() {
            var abParameters = params.ab_parameters || [];
            return callback(null, abParameters);
        });
    }

    /**
     * Function to fetch conditions
     * @param  {Object} params - params object
     * @param  {Function} callback - callback function
     */
    function fetchConditions(params, callback) {
        var appId = params.qstring.app_id;
        var collectionName = "remoteconfig_conditions" + appId;
        var criteria = params.condition_criteria || {};

        common.outDb.collection(collectionName).find(criteria).toArray(function(err, result) {
            if (err) {
                return callback(err);
            }

            return callback(null, result);
        });
    }

    /**
     * Function to process parameter value
     * @param  {Object} parameter - parameter object
     */
    function processParamValue(parameter) {
        parameter.valuesList = [];

        try {
            parameter.default_value = JSON.parse(parameter.default_value);
        }
        catch (e) {
            //Error
        }

        parameter.valuesList.push(parameter.default_value);

        for (let i = 0; i < parameter.conditions.length; i++) {
            try {
                parameter.conditions[i].value = JSON.parse(parameter.conditions[i].value);
            }
            catch (e) {
                //Error
            }

            parameter.valuesList.push(parameter.conditions[i].value);
        }
    }

    plugins.register("/export", async function({app_id, plugin, selectedIds, params}) {
        if (plugin === "remote-config") {
            const data = await exportPlugin(app_id, selectedIds, params);
            return data;
        }
    });

    plugins.register("/import", async function({params, importData}) {
        let parameters = [];
        let conditions = [];
        if (importData.name.startsWith('remote-config')) {
            if (importData.name === 'remote-config') {
                parameters.push(importData.data);
                parameters.forEach(p=>{
                    params.internal = true;
                    params.qstring.parameter = JSON.stringify(p);
                    addParameter(params);
                });
            }
            else if (importData.name === 'remote-config.conditions') {
                conditions.push(importData.data);
                conditions.forEach(c=>{
                    params.internal = true;
                    params.qstring.condition = JSON.stringify(c);
                    addCondition(params);
                });
            }
        }
        return false;
    });

    plugins.register("/import/validate", function({params, pluginData, pluginName}) {
        if (pluginName.startsWith('remote-config')) {
            return validateImport(params, pluginData);
        }
        else {
            return false;
        }
    });

    /**
     * Validation before import
     * 
     * @param {Object} params params object 
     * @param {Object} config config Object
     * @returns {Promise<Object>} validation result
    */
    function validateImport(params, config) {
        return {
            code: 200,
            message: "success",
            data: {
                newId: common.db.ObjectID(),
                oldId: config._id
            }
        };
    }

    /**
     * 
     * @param {*} app_id  app Id for collection name
     * @param {String[]} ids ids of documents to be exported
     * @param {Object<params>} params params object
     */
    async function exportPlugin(app_id, ids, params) {
        const dependencies = [];
        const cohortIds = [];
        const parameters = await common.outDb.collection("remoteconfig_parameters" + app_id).find({_id: {$in: ids.map(id => common.outDb.ObjectID(id)) } }).toArray();
        const conditionIds = [];

        parameters.forEach((parameter) =>{
            parameter.conditions.forEach((cond)=>{
                conditionIds.push(common.outDb.ObjectID(cond.condition_id));
            });
        });

        const conditions = await common.outDb.collection("remoteconfig_conditions" + app_id).find({_id: {$in: conditionIds}}).toArray();
        parameters.forEach((parameter) =>{
            parameter.conditions.forEach((cond)=>{
                conditionIds.push(common.outDb.ObjectID(cond.condition_id));
            });
        });

        conditions.forEach(cond =>{
            try {
                let condition = JSON.parse(cond.condition);
                Object.keys(condition).forEach(k=>{
                    if (k.startsWith('chr.')) {
                        cohortIds.push(k.split("chr.")[1]);
                    }
                });
            }
            catch (e) {
                // ignore
            }
        });

        let cohortDependencies = await params.fetchDependencies(app_id, cohortIds, 'cohorts', params);
        dependencies.push(...cohortDependencies);

        return {
            name: 'remote-config',
            data: parameters,
            dependencies: [
                {
                    name: 'remote-config.conditions',
                    data: conditions,
                    dependencies: []
                },
                ...dependencies
            ]
        };
    }

}(pluginOb));

module.exports = pluginOb;
