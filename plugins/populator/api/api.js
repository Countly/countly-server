var exported = {},
    common = require('../../../api/utils/common.js'),
    plugins = require('../../pluginManager.js'),
    {validateUserForWrite} = require('../../../api/utils/rights.js');

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

(function() {

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

        validateUserForWrite(obParams, function(params) {
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
        validateUserForWrite(obParams, function(params) {
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
        validateUserForWrite(obParams, function(params) {
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

            const changes = validatedArgs.obj;
            // log who changed this
            changes.lastEditedBy = params.member._id;
            changes.isDefault = changes.isDefault === 'true' ? true : false;

            common.db.collection('populator_templates').findAndModify({"_id": templateId}, {}, {$set: changes}, function(updateTemplateErr, template) {
                if (!updateTemplateErr && template) {
                    common.returnMessage(params, 200, 'Success');
                    plugins.dispatch("/systemlogs", {params: params, action: "populator_template_edited", data: {before: template, update: changes}});
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

        const validateUserForRead = ob.validateUserForDataReadAPI;
        validateUserForRead(obParams, function() {
            if (obParams.qstring._id) {
                try {
                    query._id = common.db.ObjectID(obParams.qstring.template_id);
                }
                catch (e) {
                    common.returnMessage(obParams, 500, 'Invalid template id.');
                    return false;
                }
            }

            common.db.collection('populator_templates').find(query).toArray(function(err, docs) {
                if (!err) {
                    common.returnOutput(obParams, docs);
                    return true;
                }
                else {
                    common.returnMessage(obParams, 500, err.message);
                    return false;
                }
            });
        });
        return true;
    });

}(exported));

module.exports = exported;