const { Audience, TriggerKind, Filter, Content, PushError, ERROR, ValidationError } = require('./send'),
    plugins = require('../../pluginManager'),
    common = require('../../../api/utils/common'),
    log = common.log('push:api:api');

/**
 * Standard logic for both /push & /pop: validate params, load message from cache, check triggers and construct Audience/Pusher/Popper
 * 
 * @param {params} params request params
 * @param {boolean} push true if we need a Pusher, false for a Popper
 * @returns {Audience} audience
 * @throws {PushError} in case of validation errors
 */
async function check(params, push) {
    let data = common.validateArgs(params.qstring, {
        _id: {type: 'ObjectID', required: true},
        start: {type: 'Date'},
        filter: {type: Filter.scheme, required: true},
        contents: {
            type: Content.scheme,
            array: true,
            required: false,
            nonempty: true,
            'min-length': 1,
        },
        variables: {type: 'Object'}
    }, true);
    if (data.result) {
        data = data.obj;
    }
    else {
        throw new ValidationError(data.errors);
    }

    if (push && !data.start) {
        throw new ValidationError('start is required');
    }

    let message = await plugins.getPluginsApis().push.cache.read(data._id.toString());
    if (!message) {
        throw new PushError('No such message', ERROR.DATA_COUNTLY);
    }

    let trigger = message.triggerFind(TriggerKind.API);
    if (!trigger) {
        throw new PushError('Message is not tx', ERROR.DATA_COUNTLY);
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

module.exports.apiPush = async params => {
    let pusher = await check(params, true),
        {total, next} = await pusher.run();
    common.returnOutput(params, {total, next});
};

module.exports.apiPop = async params => {
    let popper = await check(params, false),
        removed = await popper.run();
    common.returnOutput(params, {removed});
};
