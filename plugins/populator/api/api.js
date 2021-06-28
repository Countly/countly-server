var exported = {},
    common = require('../../../api/utils/common.js'),
    plugins = require('../../pluginManager.js'),
    { validateCreate, validateRead, validateUpdate, validateDelete } = require('../../../api/utils/rights.js');

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
    up: {
        required: false,
        type: "String"
    },
    events: {
        required: false,
        type: "String"
    }
};

const FEATURE_NAME = 'populator';

(function() {

    plugins.register("/permissions/features", function(ob) {
        ob.features.push(FEATURE_NAME);
    });

    const createTemplate = function(ob) {
        const obParams = ob.params;

        const validatedArgs = common.validateArgs(obParams.qstring, templateProperties, true);
        if (!validatedArgs.result) {
            common.returnMessage(obParams, 400, "Invalid params: " + validatedArgs.errors.join());
            return false;
        }

        const template = validatedArgs.obj;

        if (template.up) {
            try {
                template.up = JSON.parse(template.up);
            }
            catch (e) {
                common.returnMessage(obParams, 400, "Invalid type for up.");
                return false;
            }
        }

        if (template.events) {
            try {
                template.events = JSON.parse(template.events);
            }
            catch (e) {
                common.returnMessage(obParams, 400, "Invalid type for events.");
                return false;
            }
        }

        template.isDefault = template.isDefault === 'true' ? true : false;

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
                    common.returnMessage(ob.params, 200, 'Success');
                    plugins.dispatch("/systemlogs", {params: params, action: "populator_template_removed", data: templateId});
                    return true;
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

            if (newTemplate.up) {
                try {
                    newTemplate.up = JSON.parse(newTemplate.up);
                }
                catch (e) {
                    common.returnMessage(obParams, 400, "Invalid type for up.");
                    return false;
                }
            }

            if (newTemplate.events) {
                try {
                    newTemplate.events = JSON.parse(newTemplate.events);
                }
                catch (e) {
                    common.returnMessage(obParams, 400, "Invalid type for events.");
                    return false;
                }
            }

            newTemplate.lastEditedBy = params.member.full_name;
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

    /*
     * @apiName: CreatePopulatorTemplate
     * @type: GET
     * @apiDescription: Create populator template
     * @apiParam: 'name', Name of template
     * @apiParam: 'isDefault', is this template default?
     * @apiParam: 'up', Optional template properties object
     * @apiParam: 'events', Optional template events object
     */
    plugins.register("/i/populator/templates/create", createTemplate);

    /*
     * @apiName: RemovePopulatorTemplate
     * @type: GET
     * @apiDescription: Remove populator templlate
     * @apiParam: 'template_id', Id of template which will be removed
     */
    plugins.register("/i/populator/templates/remove", removeTemplate);

    /*
     * @apiName: EditPopulatorTemplate
     * @type: GET
     * @apiDescription: Edit populator template
     * @apiParam: 'name', Name of template
     * @apiParam: 'isDefault', is this template default?
     * @apiParam: 'up', Optional template properties object
     * @apiParam: 'events', Optional template events object
     */
    plugins.register("/i/populator/templates/edit", editTemplate);


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

            common.db.collection('populator_templates').find(query).toArray(function(err, docs) {
                if (err) {
                    common.returnMessage(obParams, 500, err.message);
                    return false;
                }
                else if (query._id) {
                    if (docs.length === 1) {
                        common.returnOutput(obParams, docs.length > 0 ? docs[0] : null);
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
