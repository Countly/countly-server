const { Audience, TriggerKind, Filter, Content, PushError, ERROR, ValidationError } = require('./send'),
    plugins = require('../../pluginManager'),
    common = require('../../../api/utils/common'),
    log = common.log('push:api:api');


const schemes = {
    [true]: {
        app_id: {type: 'ObjectID', required: true},
        _id: {type: 'ObjectID', required: true},
        start: {type: 'Date', required: true},
        filter: {type: Filter.scheme, required: true},
        contents: {
            type: Content.scheme,
            array: true,
            required: false,
            nonempty: true,
            'min-length': 1,
        },
        variables: {type: 'Object'}
    },
    [false]: {
        app_id: {type: 'ObjectID', required: true},
        _id: {type: 'ObjectID', required: true},
        filter: {type: Filter.scheme, required: true},
    }
};

/**
 * Standard logic for both /push & /pop: validate params, load message from cache, check triggers and construct Audience/Pusher/Popper
 * 
 * @param {params} params request params
 * @param {boolean} push true if we need a Pusher, false for a Popper
 * @returns {Audience} audience
 * @throws {PushError} in case of validation errors
 */
async function check(params, push) {
    let data = common.validateArgs(params.qstring, schemes[push], true);
    if (data.result) {
        data = data.obj;
    }
    else {
        throw new ValidationError(data.errors);
    }

    let message = await plugins.getPluginsApis().push.cache.read(data._id.toString());
    if (!message) {
        throw new PushError('No such message or it doesn\'t have API trigger', ERROR.DATA_COUNTLY);
    }

    let trigger = message.triggerFind(TriggerKind.API);
    if (!trigger) {
        throw new PushError('Message is not api', ERROR.DATA_COUNTLY);
    }
    else if (trigger.start.getTime() > data.start.getTime()) {
        throw new PushError('Message start date is later than push date', ERROR.DATA_COUNTLY);
    }
    else if (trigger.end && trigger.end.getTime() < data.start.getTime()) {
        throw new PushError('Message end date is earlier than push date', ERROR.DATA_COUNTLY);
    }

    return new Audience(log, message, params.app)[push ? 'push' : 'pop'](trigger)
        .setStart(data.start)
        .setFilter(new Filter(data.filter))
        .setContents(data.contents)
        .setVariables(data.variables);
}

/**
 * Add notification to API message
 * 
 * @param {object} params params object
 * 
 * @api {POST} i/push/message/push Message / API / add users
 * @apiName message/push
 * @apiDescription Add notifications to previously created message with API trigger
 * @apiGroup Push Notifications
 *
 * @apiQuery {ObjectID} app_id application id
 * @apiBody {ObjectID} _id Message ID
 * @apiBody {Date} start Date to send notifications on
 * @apiBody {Object} filter User profile filter to limit recipients of this message, must not be empty
 * @apiBody {String} [filter.user] JSON with app_usersAPPID collection filter
 * @apiBody {String} [filter.drill] Drill plugin filter in JSON format
 * @apiBody {ObjectID[]} [filter.geos] Array of geo IDs
 * @apiBody {String[]} [filter.cohorts] Array of cohort IDs
 * @apiBody {Object[]} contents Array of contents, see message/create for details
 * @apiBody {Object} [variables] Custom variables object ({var1: 2, var2: 'Yes'})
 * 
 * @apiSuccess {Number} total Number of notifications added
 * 
 * @apiUse PushError
 * @apiError NotAPI The app is not found
 * @apiErrorExample NotAPI
 *      HTTP/1.1 400 Bad Request
 *      {
 *          "errors": ["Message is not api"]
 *      }
 * @apiError WrongDate No credentials for selected platform
 * @apiErrorExample WrongDate
 *      HTTP/1.1 400 Bad Request
 *      {
 *          "errors": ["Message start date is later than push date"]
 *      }
 */
module.exports.apiPush = async params => {
    let pusher = await check(params, true),
        result = await pusher.run();
    common.returnOutput(params, result.json);
};

/**
 * Remove notifications from API message
 * 
 * @param {object} params params object
 * 
 * @api {POST} i/push/message/pop Message / API / remove users
 * @apiName message/pop
 * @apiDescription Remove notifications from previously created message with API trigger
 * @apiGroup Push Notifications
 *
 * @apiQuery {ObjectID} app_id application id
 * @apiBody {ObjectID} _id Message ID
 * @apiBody {Object} filter User profile filter to limit recipients of this message, must not be empty
 * @apiBody {String} [filter.user] JSON with app_usersAPPID collection filter
 * @apiBody {String} [filter.drill] Drill plugin filter in JSON format
 * @apiBody {ObjectID[]} [filter.geos] Array of geo IDs
 * @apiBody {String[]} [filter.cohorts] Array of cohort IDs
 * 
 * @apiSuccess {Number} removed Number of notifications removed
 * 
 * @apiUse PushError
 * @apiError NoMessage No such message or it doesn't have API trigger
 * @apiErrorExample NoMessage
 *      HTTP/1.1 400 Bad Request
 *      {
 *          "errors": ["No such message or it doesn't have API trigger"]
 *      }
 * @apiError NotAPI The app is not found
 * @apiErrorExample NotAPI
 *      HTTP/1.1 400 Bad Request
 *      {
 *          "errors": ["Message is not api"]
 *      }
 * @apiError WrongDate No credentials for selected platform
 * @apiErrorExample WrongDate
 *      HTTP/1.1 400 Bad Request
 *      {
 *          "errors": ["Message start date is later than push date"]
 *      }
 */
module.exports.apiPop = async params => {
    let popper = await check(params, false),
        removed = await popper.run();
    common.returnOutput(params, {removed});
};
