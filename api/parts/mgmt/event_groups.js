const common = require('./../../utils/common.js');

const crypto = require('crypto');

const COLLECTION_NAME = "event_groups";
const ID_PREFIX = "[CLY]_group_";


/**
 * Event Groups CRUD - The function creating to make a new event groups data.
 * @param {Object} params - params
 * @returns {Object} - 
 */
const create = (params) => {
    const argProps = {
        'app_id': {
            'required': true,
            'type': 'String',
            'exclude-from-ret-obj': true
        },
        'name': {
            'required': true,
            'type': 'String'
        },
        'source_events': {
            'required': true,
            'type': 'Array'
        },
        'description': {
            'required': false,
            'type': 'String'
        },
        'display_map': {
            'required': true,
            'type': 'Object'
        },
        'status': {
            'required': true,
            'type': 'Boolean'
        }
    };
    if (!params.qstring.args) {
        common.returnMessage(params, 400, 'Error: args not found');
        return false;
    }
    params.qstring.args = JSON.parse(params.qstring.args);
    const {obj, errors} = common.validateArgs(params.qstring.args, argProps, true);
    if (!obj) {
        common.returnMessage(params, 400, `Error: ${errors}`);
        return false;
    }
    const _id = `${ID_PREFIX}${crypto.createHash('md5').update(`${JSON.stringify(params.qstring.args.source_events)}${params.qstring.app_id}${Date.now()}`).digest('hex')}`;
    common.db.collection(COLLECTION_NAME).insert({...params.qstring.args, _id}, (error, result) =>{
        if (error) {
            common.returnMessage(params, 500, `error: ${error}`);
            return false;
        }
        if (!error && result) {
            common.returnMessage(params, 200, 'Success');
        }
    });
};

/**
 * Event Groups CRUD - The function updating which created `Event Groups` data by `_id`
 * @param {Object} params - params object containing the query string and other parameters
 * @returns {Boolean} 
 * This function updates the event groups based on the provided parameters.
 * It handles different update scenarios:
 * 1. If `args` is provided, it updates the event group with the specified `_id`.
 * 2. If `event_order` is provided, it updates the order of the events in the group.
 * 3. If `update_status` is provided, it updates the status of the specified event groups.
 * 4. If none of these parameters are found, it returns a 400 error indicating that the required arguments are not found.
 */
const update = (params) => {
    if (params.qstring.args) {
        params.qstring.args = JSON.parse(params.qstring.args);
        common.db.collection(COLLECTION_NAME).updateOne({'_id': params.qstring.args._id, app_id: params.qstring.app_id}, {$set: params.qstring.args}, (error) =>{
            if (error) {
                common.returnMessage(params, 500, `error: ${error}`);
                return false;
            }
            common.returnMessage(params, 200, 'Success');
        });
    }
    else if (params.qstring.event_order) {
        params.qstring.event_order = JSON.parse(params.qstring.event_order);
        var bulkArray = [];
        params.qstring.event_order.forEach(function(id, index) {
            bulkArray.push({
                'updateOne': {
                    'filter': { '_id': id, app_id: params.qstring.app_id },
                    'update': { '$set': { 'order': index } }
                }
            });
        });
        common.db.collection(COLLECTION_NAME).bulkWrite(bulkArray, function(error) {
            if (error) {
                common.returnMessage(params, 500, `error: ${error}`);
                return false;
            }
            common.returnMessage(params, 200, 'Success');
        });
    }
    else if (params.qstring.update_status) {
        params.qstring.update_status = JSON.parse(params.qstring.update_status);
        params.qstring.status = JSON.parse(params.qstring.status);
        var idss = params.qstring.update_status;
        common.db.collection(COLLECTION_NAME).update({ _id: { $in: params.qstring.update_status }, app_id: params.qstring.app_id }, { $set: { status: params.qstring.status } }, {multi: true}, function(error) {
            if (error) {
                common.returnMessage(params, 500, `error: ${error}`);
                return false;
            }
            if (params.qstring.status === false) {
                common.db.collection('events').findOne({"_id": common.db.ObjectID(params.qstring.app_id)}, function(err, event) {
                    if (err) {
                        common.returnMessage(params, 400, err);
                        return;
                    }
                    if (!event) {
                        common.returnMessage(params, 400, "Could not find event");
                        return;
                    }
                    // //fix overview
                    var updateThese = {};
                    if (event.overview && event.overview.length) {
                        for (let i = 0; i < idss.length; i++) {
                            for (let j = 0; j < event.overview.length; j++) {
                                if (event.overview[j].eventKey === idss[i]) {
                                    event.overview.splice(j, 1);
                                    j = j - 1;
                                }
                            }
                        }
                        if (!updateThese.$set) {
                            updateThese.$set = {};
                        }
                        updateThese.$set.overview = event.overview;
                        common.db.collection('events').update({"_id": common.db.ObjectID(params.qstring.app_id)}, updateThese, function(err2) {
                            if (err2) {
                                console.log(err2);
                                common.returnMessage(params, 400, err2);
                                return;
                            }
                            common.returnMessage(params, 200, 'Success');
                        });
                    }
                    else {
                        common.returnMessage(params, 200, 'Success');
                    }
                });
            }
            else {
                common.returnMessage(params, 200, 'Success');
            }
        }
        );
    }
    else {
        common.returnMessage(params, 400, 'Error: args not found');
        return false;
    }
};

/**
 * Event Groups CRUD - The function deleting which created `Event Groups` data by `_id`
 * @param {Object} params - 
 */
const remove = async(params) => {
    if (!params.qstring.args) {
        common.returnMessage(params, 400, 'Error: args not found');
        return false;
    }
    params.qstring.args = JSON.parse(params.qstring.args);
    var idss = params.qstring.args;
    common.db.collection(COLLECTION_NAME).remove({_id: { $in: params.qstring.args }, app_id: params.qstring.app_id}, (error) =>{
        if (error) {
            common.returnMessage(params, 500, `error: ${error}`);
            return false;
        }
        common.db.collection('events').findOne({"_id": common.db.ObjectID(params.qstring.app_id)}, function(err, event) {
            if (err) {
                common.returnMessage(params, 400, err);
                return;
            }
            if (!event) {
                common.returnMessage(params, 400, "Could not find event");
                return;
            }
            // //fix overview
            var updateThese = {};
            if (event.overview && event.overview.length) {
                for (let i = 0; i < idss.length; i++) {
                    for (let j = 0; j < event.overview.length; j++) {
                        if (event.overview[j].eventKey === idss[i]) {
                            event.overview.splice(j, 1);
                            j = j - 1;
                        }
                    }
                }
                if (!updateThese.$set) {
                    updateThese.$set = {};
                }
                updateThese.$set.overview = event.overview;
                common.db.collection('events').update({"_id": common.db.ObjectID(params.qstring.app_id)}, updateThese, function(err2) {
                    if (err2) {
                        console.log(err2);
                        common.returnMessage(params, 400, err);
                        return;
                    }
                    common.returnMessage(params, 200, 'Success');
                });
            }
            else {
                common.returnMessage(params, 200, 'Success');
            }
        });
    });
};

module.exports = {create, update, remove};