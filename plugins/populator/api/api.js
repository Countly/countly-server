var exported = {},
    common = require('../../../api/utils/common.js'),
    plugins = require('../../pluginManager.js'),
    { validateCreate, validateRead, validateUpdate, validateDelete } = require('../../../api/utils/rights.js'),
    log = common.log('data-populator:api');

const templateProperties = {
    name: {
        required: true,
        type: "String"
    },
    isDefault: {
        required: false,
        type: "Boolean"
    },
    lastEditedBy: {
        required: false,
        type: "String"
    },
    users: {
        required: false,
        type: "Array"
    },
    events: {
        required: false,
        type: "Array"
    },
    views: {
        required: false,
        type: "Array"
    },
    sequences: {
        required: false,
        type: "Array"
    },
    behavior: {
        required: false,
        type: "Object"
    },
    uniqueUserCount: {
        required: true,
        type: "Number"
    },
    platformType: {
        required: true,
        type: "Array"
    }
};

const FEATURE_NAME = 'populator';

(function() {

    plugins.register("/permissions/features", function(ob) {
        ob.features.push(FEATURE_NAME);
    });

    plugins.setConfigs("api", {
        safe: true,
    });

    const createTemplate = function(ob) {
        const obParams = ob.params;
        const validatedArgs = common.validateArgs(obParams.qstring, templateProperties, true);

        if (!validatedArgs.result) {
            common.returnMessage(obParams, 400, "Invalid params: " + validatedArgs.errors.join());
            return false;
        }
        const template = validatedArgs.obj;
        if (template.behavior && template.behavior.sequences && !template.behavior.sequences.length) {
            try {
                template.behavior = {};
            }
            catch (e) {
                common.returnMessage(obParams, 400, "Invalid type for behavior!");
                return false;
            }
        }

        template.isDefault = template.isDefault === 'true' ? true : false;
        template.generatedOn = new Date().getTime();
        validateCreate(obParams, FEATURE_NAME, function(params) {
            common.db.collection('populator_templates').insert(template, function(insertTemplateErr, result) {
                if (!insertTemplateErr) {
                    common.returnMessage(ob.params, 201, 'Successfully created ' + result.insertedIds[0]);
                    plugins.dispatch("/systemlogs", {params: params, action: "populator_template_created", data: template});
                    return true;
                }
                else {
                    common.returnMessage(ob.params, 500, insertTemplateErr.message);
                    return false;
                }
            });
        });
        return true;
    };

    const removeTemplate = function(ob) {
        const obParams = ob.params;
        validateDelete(obParams, FEATURE_NAME, function(params) {
            let templateId;

            try {
                templateId = common.db.ObjectID(params.qstring.template_id);
            }
            catch (e) {
                common.returnMessage(obParams, 500, 'Invalid template id.');
                return false;
            }

            common.db.collection('populator_templates').remove({"_id": templateId }, function(removeTemplateErr) {
                if (!removeTemplateErr) {
                    plugins.dispatch("/systemlogs", {params: params, action: "populator_template_removed", data: templateId});
                    common.db.collection('populator_environment_users').deleteMany({"_id": { $regex: new RegExp("^" + params.qstring.app_id + "_" + ob.params.qstring.template_id) }}, function(errEnvUsers) {
                        if (errEnvUsers) {
                            log.e("Error deleting populator environment users while deleting template", errEnvUsers);
                            common.returnMessage(ob.params, 500, errEnvUsers.message);
                            return false;
                        }
                        else {
                            common.db.collection('populator_environments').deleteMany({ "templateId": ob.params.qstring.template_id }, function(errEnvs) {
                                if (errEnvs) {
                                    log.e("Error deleting populator environments while deleting template", errEnvs);
                                    common.returnMessage(ob.params, 500, errEnvs.message);
                                    return false;
                                }
                                common.returnMessage(ob.params, 200, 'Success');
                                plugins.dispatch("/systemlogs", {params: params, action: "populator_environment_removed", data: ob.params.qstring.template_id});
                                return true;
                            });
                        }
                    });
                }
                else {
                    common.returnMessage(ob.params, 500, removeTemplateErr.message);
                    return false;
                }
            });
        });
        return true;
    };

    const editTemplate = function(ob) {
        const obParams = ob.params;
        validateUpdate(obParams, FEATURE_NAME, function(params) {
            let templateId;

            try {
                templateId = common.db.ObjectID(params.qstring.template_id);
            }
            catch (e) {
                common.returnMessage(params, 500, 'Invalid template id.');
            }

            const validatedArgs = common.validateArgs(obParams.qstring, templateProperties, true);
            if (!validatedArgs.result) {
                common.returnMessage(obParams, 400, "Invalid params: " + validatedArgs.errors.join());
                return false;
            }

            const newTemplate = validatedArgs.obj;

            newTemplate.lastEditedBy = params.member.full_name;
            if (params.qstring.generated_on) {
                newTemplate.generatedOn = params.qstring.generated_on;
            }
            newTemplate.isDefault = newTemplate.isDefault === 'true' ? true : false;

            common.db.collection('populator_templates').replaceOne({_id: templateId}, newTemplate, {}, function(updateTemplateErr, template) {
                if (!updateTemplateErr && template) {
                    common.returnMessage(params, 200, 'Success');
                    plugins.dispatch("/systemlogs", {params: params, action: "populator_template_edited", data: {before: template, update: newTemplate}});
                    return true;
                }
                else if (updateTemplateErr) {
                    common.returnMessage(params, 500, updateTemplateErr.message);
                    return false;
                }
                else {
                    common.returnMessage(params, 404, "Template not found");
                    return false;
                }
            });
        });
        return true;
    };

    const saveEnvironment = function(ob) {
        const obParams = ob.params;
        const users = JSON.parse(ob.params.qstring.users);
        const setEnviromentInformationOnce = ob.params.qstring.setEnviromentInformationOnce;
        if (!users || !users.length) {
            common.returnMessage(obParams, 400, "Missing params: " + users);
            return false;
        }

        const environmentId = common.crypto.createHash('sha1').update(users[0].appId + users[0].environmentName).digest('hex');
        const insertedInformations = [];
        const createdAt = new Date().getTime();
        for (let i = 0; i < users.length; i++) {
            insertedInformations.push({
                _id: users[i].appId + "_" + users[i].templateId + "_" + environmentId + "_" + users[i].deviceId,
                userName: users[i].userName,
                platform: users[i].platform,
                device: users[i].device,
                appVersion: users[i].appVersion,
                custom: users[i].custom,
                createdAt: createdAt
            });
        }
        validateCreate(obParams, FEATURE_NAME, function(params) {
            if (setEnviromentInformationOnce) {
                common.db.collection('populator_environments').insertOne({
                    _id: environmentId,
                    name: users[0].environmentName,
                    templateId: users[0].templateId,
                    appId: users[0].appId,
                    createdAt: createdAt
                }, function(err) {
                    if (err) {
                        common.returnMessage(ob.params, 500, err.message);
                        return false;
                    }
                });
            }
            common.db.collection('populator_environment_users').insertMany(insertedInformations, function(err) {
                if (!err) {
                    common.returnMessage(ob.params, 201, 'Successfully created ');
                    plugins.dispatch("/systemlogs", {params: params, action: "populator_environment_created", data: insertedInformations[0].name});
                    return true;
                }
                else {
                    common.returnMessage(ob.params, 500, err.message);
                    return false;
                }
            });
        });
        return true;
    };

    plugins.register("/i", function(ob) {
        const obParams = ob.params;
        if (obParams.qstring.method === "populator_template") {
            if (obParams.qstring.action === "create") {
                createTemplate(obParams);
            }
            else if (obParams.qstring.action === "edit") {
                editTemplate(obParams);
            }
            else if (obParams.qstring.action.remove === "remove") {
                removeTemplate(obParams);
            }
        }
        return true;
    });

    /**
     * @api {get} /i/populator/templates/create
     * @apiName createTemplate
     * @apiGroup DataPopulator
     *
     * @apiDescription Create populator template.
     * @apiQuery {String} name, Name of template
     * @apiQuery {String} isDefault, Is this template default?
     * @apiQuery {String} up, Optional template properties object
     * @apiQuery {String} events, Optional template events object
     * 
     * @apiSuccessExample {json} Success-Response:
     * HTTP/1.1 200 OK
     * {
     *     "_id": "62276669fe2ba9c65d1a3d04",
     *     "name": "Custom Template",
     *     "isDefault": false,
     *     "up": {
     *         "prop1": [
     *         "value of prop1"
     *         ]
     *     },
     *     "events": {
     *         "event1": [
     *         {
     *             "segments": {
     *             "s1": [
     *                 "value of s1"
     *             ]
     *             }
     *         }
     *         ]
     *     }
     * }
     * 
     * @apiErrorExample {json} Error-Response:
     * HTTP/1.1 400 Bad Request
     * {
     *  "result": "Missing parameter "api_key" or "auth_token""
     * }
    */
    plugins.register("/i/populator/templates/create", createTemplate);

    /**
     * @api {get} /i/populator/templates/remove
     * @apiName RemovePopulatorTemplate
     * @apiGroup DataPopulator
     *
     * @apiDescription Remove populator template
     * @apiQuery {String} template_id, Id of template which will be removed
     * @apiQuery {String} app_id, App id of related application
     * 
     * @apiSuccessExample {json} Success-Response:
     * HTTP/1.1 200 OK
     * {
     *    "result": "Success"
     * }
     * 
     * @apiErrorExample {json} Error-Response:
     * HTTP/1.1 400 Bad Request
     * {
     *  "result": "Missing parameter "api_key" or "auth_token""
     * }
    */
    plugins.register("/i/populator/templates/remove", removeTemplate);

    /**
     * @api {get} /i/populator/templates/edit
     * @apiName EditPopulatorTemplate
     * @apiGroup DataPopulator
     *
     * @apiDescription Edit populator template
     * @apiQuery {String} name, Name of template
     * @apiQuery {String} isDefault, Is this template default?
     * @apiQuery {String} up, Optional template properties object
     * @apiQuery {String} events, Optional template events object
     * @apiQuery {String} template_id, Id of template which will be removed
     * @apiQuery {String} app_id, App id of related application
     * 
     * @apiSuccessExample {json} Success-Response:
     * HTTP/1.1 200 OK
     * {
     *    "result": "Success"
     * }
     * 
     * @apiErrorExample {json} Error-Response:
     * HTTP/1.1 400 Bad Request
     * {
     *  "result": "Missing parameter "api_key" or "auth_token""
     * }
    */
    plugins.register("/i/populator/templates/edit", editTemplate);

    /**
     * @api {get} /i/populator/templates
     * @apiName getTemplate
     * @apiGroup DataPopulator
     *
     * @apiDescription Lists custom templates
     * @apiQuery {String} app_id, App id of related application
     * 
     * @apiSuccessExample {json} Success-Response:
     * HTTP/1.1 200 OK
     * [
     *     {
     *         "_id": "621f79b147ec9834a4d5ec54",
     *         "name": "Test Template",
     *         "isDefault": false,
     *         "events": {
     *         "event": [
     *             {
     *             "segments": {
     *                 "s1": [
     *                 "segment value_1"
     *                 ]
     *             }
     *             }
     *         ],
     *         "event2": [
     *             {
     *             "segments": {
     *                 "s2": [
     *                 "segment value_2"
     *                 ]
     *             }
     *             }
     *         ],
     *         "event3": [
     *             {
     *             "segments": {
     *                 "s3": [
     *                 "segment value_3"
     *                 ]
     *             }
     *             }
     *         ]
     *         },
     *         "lastEditedBy": "Pinar Genc"
     *     },
     *     {
     *         "_id": "621f8871f3c2b2349da8ed39",
     *         "name": "Custom Test Template",
     *         "isDefault": false,
     *         "events": {
     *              "event1": [
     *                  {
     *                  "segments": {
     *                      "s1": [
     *                      "v1"
     *                      ]
     *                  }
     *                  }
     *              ],
     *              "event2": [
     *                  {
     *                  "segments": {
     *                      "s2": [
     *                      "v2"
     *                      ]
     *                  }
     *                  }
     *              ]
     *         }
     *     },
     * ]
     * 
     * @apiErrorExample {json} Error-Response:
     * HTTP/1.1 400 Bad Request
     * {
     *  "result": "Missing parameter "api_key" or "auth_token""
     * }
    */
    plugins.register('/o/populator/templates', function(ob) {
        const obParams = ob.params;
        const query = {};
        validateRead(obParams, FEATURE_NAME, function() {
            if (obParams.qstring.template_id) {
                try {
                    query._id = common.db.ObjectID(obParams.qstring.template_id);
                }
                catch (e) {
                    common.returnMessage(obParams, 500, 'Invalid template id.');
                    return false;
                }
            }
            if (obParams.qstring.platform_type) {
                try {
                    query.platformType = {$in: [obParams.qstring.platform_type]};
                }
                catch (e) {
                    common.returnMessage(obParams, 500, 'Invalid platform_type.');
                    return false;
                }
            }
            common.db.collection('populator_templates').find(query).toArray(function(err, docs) {
                if (err) {
                    common.returnMessage(obParams, 500, err.message);
                    return false;
                }
                else if (query._id) {
                    if (docs.length === 1) {
                        common.returnOutput(obParams, docs[0]);
                        return true;
                    }
                    else {
                        common.returnMessage(obParams, 404, "Could not find template with id \"" + query._id + "\"");
                        return false;
                    }
                }
                else {
                    common.returnOutput(obParams, docs);
                    return true;
                }
            });
        });
        return true;
    });

    /**
     * @api {get} /i/populator/environment/save
     * @apiName saveEnvironment
     * @apiGroup DataPopulator
     *
     * @apiDescription Create populator template.
     * @apiQuery {String} deviceId, User device id 
     * @apiQuery {String} templateId, template id that associated with environment
     * @apiQuery {String} appId, application id that associated with environment
     * @apiQuery {String} environmentName, environment name
     * 
     * @apiSuccessExample {json} Success-Response:
     * HTTP/1.1 200 OK
     * {
     *     "deviceId": "d2ed577a-d2a6-ac7e-129b-5321871701d0",
     *     "templateId": "Custom Template",
     *     "appId": "657984294c3287b7df6c220f",
     *     "environmentName": "Custom Environment"
     * }
     * 
     * @apiErrorExample {json} Error-Response:
     * HTTP/1.1 400 Bad Request
     * {
     *  "result": "Missing parameter "api_key" or "auth_token""
     * }
    */
    plugins.register("/i/populator/environment/save", saveEnvironment);

    /**
     * @api {get} /i/populator/environment/check
     * @apiName checkEnvironment
     * @apiGroup DataPopulator
     *
     * @apiDescription Returns environment name if exists 
     * @apiQuery {String} app_id, App id of related application
     * @apiQuery {String} template_id, populator template id
     * 
     * @apiSuccessExample {json} Success-Response:
     * HTTP/1.1 200 OK
     * [
     *    {
    *      "hasEnvironment": true,
     *     "name": "Custom Environment"
     *   }
     * ]
     * @apiErrorExample {json} Error-Response:
     * HTTP/1.1 400 Bad Request
     * {
     *  "result": "Missing parameter "api_key" or "auth_token""
     * }
     * */
    plugins.register('/o/populator/environment/check', function(ob) {
        const obParams = ob.params;
        validateRead(obParams, FEATURE_NAME, function() {
            common.db.collection('populator_environments').find({
                "appId": obParams.qstring.app_id,
                "name": new RegExp(obParams.qstring.environment_name, 'i')
            }, {"_id": 0, "name": 1}).limit(1).toArray(function(errEnv, environments) {
                if (errEnv) {
                    common.returnMessage(obParams, 500, errEnv.message);
                }
                if (environments.length) {
                    common.returnOutput(obParams, {errorMsg: "Duplicated environment name detected for this application! Please try with an another name"});
                }
                else {
                    common.returnOutput(obParams, {result: true});
                }
            });
        });
        return true;
    });

    /**
     * @api {get} /i/populator/environment/list
     * @apiName getEnvironments
     * @apiGroup DataPopulator
     * 
     * @apiDescription Returns environment list
     * @apiQuery {String} app_id, App id of related application
     * 
     * @apiSuccessExample {json} Success-Response:
     * HTTP/1.1 200 OK
     * [
     *   { 
     *       "_id" : "3c7ffdf5b8200ee192968ad89dd4e180d5386c01", 
     *       "name" : "test environment", 
     *       "templateId" : "659e9ab0952356fa505c1f64", 
     *       "appId" : "65cde356b2120c71e8d647bb", 
     *       "createdAt" : 1707992896902.0
     *   }
     * ]
     * @apiErrorExample {json} Error-Response:
     * HTTP/1.1 400 Bad Request
     * {
     * "result": "Missing parameter "api_key" or "auth_token""
     * }
     * */
    plugins.register('/o/populator/environment/list', function(ob) {
        const obParams = ob.params;
        validateRead(obParams, FEATURE_NAME, function() {
            common.db.collection('populator_environments').find({ "appId": ob.params.qstring.app_id }).toArray(function(err, environments) {
                if (err) {
                    common.returnMessage(obParams, 500, err.message);
                }
                common.returnOutput(obParams, environments);
            });
        });
        return true;
    });

    /**
     * 
     * @api {get} /i/populator/environment/get
     * @apiName getEnvironment
     * @apiGroup DataPopulator
     * 
     * @apiDescription Returns environment list
     * @apiQuery {String} app_id, App id of related application
     * @apiQuery {String} environment_id, Environment id
     * 
     * @apiSuccessExample {json} Success-Response:
     * HTTP/1.1 200 OK
     * [
     *  {
     *   "_id": "a5503f74ae6b7e3d686addfd23c87617f3890bfe",
     *  "name": "Custom Environment"
     * }
     * ]
     * @apiErrorExample {json} Error-Response:
     * HTTP/1.1 400 Bad Request
     * {
     * "result": "Missing parameter "api_key" or "auth_token""
     * }
     * */
    plugins.register('/o/populator/environment/get', function(ob) {
        const obParams = ob.params;
        if (!obParams.qstring.environment_id) {
            common.returnMessage(obParams, 401, "Missing parameter environment_id");
            return false;
        }
        if (!obParams.qstring.template_id) {
            common.returnMessage(obParams, 401, "Missing parameter template_id");
            return false;
        }
        if (!obParams.qstring.app_id) {
            common.returnMessage(obParams, 401, "Missing parameter app_id");
            return false;
        }
        validateRead(obParams, FEATURE_NAME, function() {
            common.db.collection('populator_environment_users').find({
                "_id": {
                    $regex: new RegExp("^" + obParams.qstring.app_id + "_" + obParams.qstring.template_id + "_" + obParams.qstring.environment_id)
                }
            }).toArray(function(errEnv, environments) {
                if (errEnv) {
                    common.returnMessage(obParams, 500, errEnv.message);
                }
                else {
                    common.returnOutput(obParams, environments);
                }
            });
        });
        return true;
    });

    /**
     * @api {get} /i/populator/environment/remove
     * @apiName removeEnvironment
     * @apiGroup DataPopulator
     * 
     * @apiDescription Delete environment
     * @apiQuery {String} app_id, App id of related application
     * @apiQuery {String} template_id, Template id of related environment
     * @apiQuery {String} environment_id, Environment id
     * 
     * @apiSuccessExample {json} Success-Response:
     * HTTP/1.1 200 OK
     * { result: true }
     * 
     * @apiErrorExample {json} Error-Response:
     * HTTP/1.1 400 Bad Request
     * {
     *  "result": "Missing parameter "api_key" or "auth_token""
     * }
     * */
    plugins.register('/o/populator/environment/remove', function(ob) {
        const obParams = ob.params;
        if (!obParams.qstring.environment_id) {
            common.returnMessage(obParams, 401, "Missing parameter environment_id");
            return false;
        }
        validateDelete(obParams, FEATURE_NAME, function() {
            common.db.collection('populator_environment_users').deleteMany({
                "_id": {
                    $regex: new RegExp("^" + obParams.qstring.app_id + "_" + obParams.qstring.template_id + "_" + obParams.qstring.environment_id)
                }
            }, function(err) {
                if (err) {
                    log.e("Error deleting populator environment users", err, obParams.qstring.environment_id);
                    common.returnMessage(obParams, 500, err.message);
                }
                else {
                    common.db.collection('populator_environments').deleteOne({
                        "_id": obParams.qstring.environment_id
                    }, function(err_) {
                        if (err_) {
                            log.e("Error deleting populator environment", err_, obParams.qstring.environment_id);
                            common.returnMessage(obParams, 500, err_.message);
                        }
                        else {
                            common.returnOutput(obParams, {result: true});
                        }
                    });
                }
            });
        });
        return true;
    });

    plugins.register("/export", async function({plugin, selectedIds}) {
        if (plugin === "populator") {
            const data = await exportPlugin(selectedIds);
            return data;
        }
    });

    plugins.register("/import", async function({params, importData}) {
        if (importData.name === 'populator') {
            await importPopulator(params, importData);
            return true;
        }
        return false;
    });

    plugins.register("/import/validate", function({params, pluginData, pluginName}) {
        if (pluginName === 'populator') {
            return validateImport(params, pluginData);
        }
        else {
            return false;
        }
    });

    plugins.register("/i/apps/delete", function(ob) {
        var appId = ob.appId;
        common.db.collection('populator_environment_users').deleteMany({"_id": { $regex: new RegExp("^" + appId) }}, function(err) {
            if (err) {
                log.e("Error deleting populator environments for " + appId + " application", err);
            }
        });
    });

    plugins.register("/i/apps/clear_all", function(ob) {
        var appId = ob.appId;
        common.db.collection('populator_environment_users').deleteMany({"_id": { $regex: new RegExp("^" + appId) }}, function(err) {
            if (err) {
                log.e("Error deleting populator environments for " + appId + " application", err);
            }
        });
        common.db.collection('populator_environments').deleteMany({ appId: appId }, function(err) {
            if (err) {
                log.e("Error deleting populator environments for " + appId + " application", err);
            }
        });
    });

    plugins.register("/i/apps/clear", function(ob) {
        var appId = ob.appId;
        common.db.collection("populator_environment_users").deleteMany({createdAt: {$lt: ob.moment.valueOf()}, "_id": { $regex: new RegExp("^" + appId) }}, function(err) {
            if (err) {
                log.e("Error deleting populator environments for " + appId + " application", err);
            }
        });
        common.db.collection('populator_environments').deleteMany({createdAt: {$lt: ob.moment.valueOf()}, appId: appId}, function(err) {
            if (err) {
                log.e("Error deleting populator environments for " + appId + " application", err);
            }
        });
    });

    plugins.register("/i/apps/reset", function(ob) {
        var appId = ob.appId;
        common.db.collection('populator_environment_users').deleteMany({"_id": { $regex: new RegExp("^" + appId) }}, function(err) {
            if (err) {
                log.e("Error deleting populator environments for " + appId + " application", err);
            }
        });
        common.db.collection('populator_environments').deleteMany({ appId: appId }, function(err) {
            if (err) {
                log.e("Error deleting populator environments for " + appId + " application", err);
            }
        });
    });

    /**
     * 
     * @param {String[]} ids ids of documents to be exported
     * @param {String} app_id app Id
     */
    async function exportPlugin(ids) {
        const data = await common.db.collection("populator_templates").find({_id: {$in: ids.map((id) => common.db.ObjectID(id))}}).toArray();
        const dependencies = [];

        return {
            name: 'populator',
            data: data,
            dependencies: dependencies
        };
    }

    /**
     * Validation before import
     * 
     * @param {Object} params params object 
     * @param {Object} template template Object
     * @returns {Promise<Object>} validation result
    */
    function validateImport(params, template) {
        return {
            code: 200,
            message: "Success",
            data: {
                newId: common.db.ObjectID(),
                oldId: template._id
            }
        };
    }

    /**
     * Insert Template Objects
     * 
     * @param {Object} params params object
     * @param {Object} importData iomport data Object
     * @returns {Promise} promise array of all inserts
     */
    function importPopulator(params, importData) {
        const template = importData.data;
        return new Promise((resolve, reject) => {
            template._id = common.db.ObjectID(template._id);
            common.db.collection('populator_templates').insert(template, function(insertTemplateErr) {
                if (!insertTemplateErr) {
                    plugins.dispatch("/systemlogs", {params: params, action: "populator_template_created", data: template});
                    return resolve();
                }
                else {
                    return reject();
                }
            });
        });
    }

}(exported));

module.exports = exported;
