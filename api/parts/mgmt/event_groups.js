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
 * @param {Object} params - 
 */
const update = (params) => {
    if (params.qstring.args) {
        params.qstring.args = JSON.parse(params.qstring.args);
        common.db.collection(COLLECTION_NAME).update({'_id': params.qstring.args._id}, {$set: params.qstring.args}, (error) =>{
            if (error) {
                common.returnMessage(params, 500, `error: ${error}`);
                return false;
            }
            common.returnMessage(params, 200, 'Success');
        });
    }
    if (params.qstring.event_order) {
        params.qstring.event_order = JSON.parse(params.qstring.event_order);
        var bulkArray = [];
        params.qstring.event_order.forEach(function(id, index) {
            bulkArray.push({
                'updateOne': {
                    'filter': { '_id': id },
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
    if (params.qstring.update_status) {
        params.qstring.update_status = JSON.parse(params.qstring.update_status);
        params.qstring.status = JSON.parse(params.qstring.status);
        common.db.collection(COLLECTION_NAME).update({ _id: { $in: params.qstring.update_status } }, { $set: { status: params.qstring.status } }, {multi: true}, function(error) {
            if (error) {
                common.returnMessage(params, 500, `error: ${error}`);
                return false;
            }
            common.returnMessage(params, 200, 'Success');
        }
        );
    }
};

/**
 * Event Groups CRUD - The function deleting which created `Event Groups` data by `_id`
 * @param {Object} params - 
 */
const remove = async(params) => {
    params.qstring.args = JSON.parse(params.qstring.args);
    common.db.collection(COLLECTION_NAME).remove({_id: { $in: params.qstring.args }}, (error, /*result*/) =>{
        if (error) {
            common.returnMessage(params, 500, `error: ${error}`);
            return false;
        }
        common.returnMessage(params, 200, 'Success');
    });
};

module.exports = {create, update, remove};