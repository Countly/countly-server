const common = require('../../../api/utils/common'),
    log = common.log('push:legacy'),
    moment = require('moment-timezone'),
    { Message, Status } = require('./send'),
    { create, update, mimeInfo } = require('./api-message'),
    N = require('./parts/note'),
    { validateCreate, validateUpdate } = require('../../../api/utils/rights.js'),
    SEP = '|';


// // /**
// //  * Parse named param and return millis timestamp
// //  * 
// //  * @param {string|number|date} date date in any format
// //  * @returns {number|undefined} millis timestamp if it's a date
// //  */
// // function toMillis(date) {
// //     if (date) {
// //         if (typeof date === 'string' && (parseInt(date, 10) + '') !== date && isNaN((new Date(date)).getTime())) {
// //             return undefined;
// //         }

// //         if ((date + '').length === 10) {
// //             return date * 1000;
// //         }

// //         let d = moment.utc(date).toDate();
// //         if (isNaN(d.getTime())) {
// //             return undefined;
// //         }
// //         else {
// //             return d.getTime();
// //         }
// //     }
// // }

// /**
//  * Clear object from undefined & null values
//  * 
//  * @param {object} obj object
//  * @returns {object} the object
//  */
// function clear(obj) {
//     Object.keys(obj).forEach(k => {
//         if (obj[k] === undefined || obj[k] === null) {
//             delete obj[k];
//         }
//     });
//     return obj;
// }

/**
 * Set date from params to data parsing it along the way
 * 
 * @param {object} params params
 * @param {string} name parameter name
 * @param {object} data object to set date to
 * @returns {boolean|string|undefined} false if date has been set, error string if it's not a date, undefined if there's no such param
 */
function setDateParam(params, name, data) {
    let v = params.qstring.args[name];
    if (v) {
        if (typeof v === 'string' && (parseInt(v) + '') !== v && isNaN((new Date(v)).getTime())) {
            return 'Only long (ms since Epoch) is supported as date format';
        }

        if ((v + '').length === 10) {
            params.qstring.args[name] *= 1000;
        }

        data[name] = moment.utc(params.qstring.args[name]).toDate();
        return false;
    }
}

/**
 * Validate params according to previous API implementation
 * 
 * @param {object} params params
 * @param {boolean} skipMpl skip checking mpl
 * @param {boolean} skipAppsPlatforms skip checking apps & platforms
 * @returns {Message|object[]} Mesage instance if validation passed, array of errors otherwise
 */
async function validate(params, skipMpl, skipAppsPlatforms) {
    var argProps = {
            '_id': { 'required': false, 'type': 'String', 'min-length': 24, 'max-length': 24 },
            'type': { 'required': false, 'type': 'String' },
            'apps': { 'required': false, 'type': 'Array' },
            'platforms': { 'required': false, 'type': 'Array' },
            'messagePerLocale': { 'required': false, 'type': 'Object' },
            'locales': { 'required': false, 'type': 'Array' },
            'userConditions': { 'required': false, 'type': 'Object' },
            'drillConditions': { 'required': false, 'type': 'Object' },
            'geos': { 'required': false, 'type': 'Array' },
            'cohorts': { 'required': false, 'type': 'Array' },
            'delayed': { 'required': false, 'type': 'Boolean' },
            'sound': { 'required': false, 'type': 'String' },
            'badge': { 'required': false, 'type': 'Number' },
            'url': { 'required': false, 'type': 'URL' },
            'buttons': { 'required': false, 'type': 'Number' },
            'media': { 'required': false, 'type': 'URL' },
            'contentAvailable': { 'required': false, 'type': 'Boolean' },
            'newsstandAvailable': { 'required': false, 'type': 'Boolean' },
            'collapseKey': { 'required': false, 'type': 'String' },
            'delayWhileIdle': { 'required': false, 'type': 'Boolean' },
            'data': { 'required': false, 'type': 'Object' },
            'userProps': { 'required': false, 'type': 'Array' },
            'source': { 'required': false, 'type': 'String' },
            'test': { 'required': false, 'type': 'Boolean' },
            'tx': { 'required': false, 'type': 'Boolean' },
            'auto': { 'required': false, 'type': 'Boolean' },
            'autoCohorts': { 'required': false, 'type': 'Array' },
            'autoEvents': { 'required': false, 'type': 'Array' },
            'autoDelay': { 'required': false, 'type': 'Number' },
            'autoTime': { 'required': false, 'type': 'Number' },
            'autoCapMessages': { 'required': false, 'type': 'Number' },
            'autoCapSleep': { 'required': false, 'type': 'Number' },
            'autoCancelTrigger': { 'required': false, 'type': 'Boolean' },
            'actualDates': { 'required': false, 'type': 'Boolean' },
            'expiration': { 'required': false, 'type': 'Number' },
        },
        data = common.validateArgs(params.qstring.args, argProps, true);

    if (!data.result) {
        log.w('Not enough params to create message: %j / %j', params.qstring.args, data.errors);
        return [{error: 'Not enough args', errors: data.errors}];
    }

    data = data.obj;

    data.autoOnEntry = params.qstring.args.autoOnEntry;

    log.d('validating args %j, data %j', params.qstring.args, data);

    if (!skipAppsPlatforms) {
        if (!skipMpl) {
            if (['message', 'data'].indexOf(data.type) === -1) {
                return [{error: 'Bad message type'}];
            }
            else if (data.auto && data.tx) {
                return [{error: 'Message cannot be auto & tx simultaniously'}];
            }
        }

        if (data.source && ['api', 'dash'].indexOf(data.source) === -1) {
            return [{error: 'Invalid message source'}];
        }
        else {
            data.source = data.source || 'api';
        }

        if (!data.platforms || data.platforms.filter(x => Object.values(N.Platform).indexOf(x) === -1).length) {
            return [{error: `Bad message plaform: only ${N.Platform.IOS} (IOS), ${N.Platform.ANDROID} (ANDROID) & ${N.Platform.HUAWEI} (HUAWEI) are supported`}];
        }

        if (data.type === 'data') {
            if ((!data.data || !Object.keys(data.data).length) && (typeof data.badge === 'undefined' || data.badge === null)) {
                return [{error: 'Messages of type "data" must have at least "data" or "badge" property'}];
            }

            if (data.sound) {
                return [{error: 'Messages of type "data" cannot have sound'}];
            }

            delete data.media;
            delete data.url;
            delete data.sound;
            delete data.messagePerLocale;
            data.buttons = 0;
        }
        else {
            if (!skipMpl) {
                if (!data.messagePerLocale || !data.messagePerLocale.default) {
                    return [{error: 'Messages of type other than "data" must have "messagePerLocale" object with at least "default" key set'}];
                }
                else if (data.buttons > 0 && (!data.messagePerLocale['default' + SEP + '0' + SEP + 't'] || !data.messagePerLocale['default' + SEP + '0' + SEP + 'l'])) {
                    return [{error: 'Messages of type other than "data" with 1 button must have "messagePerLocale" object with at least "default|0|t" & "default|0|l" keys set'}];
                }
                else if (data.buttons > 1 && (!data.messagePerLocale['default' + SEP + '1' + SEP + 't'] || !data.messagePerLocale['default' + SEP + '1' + SEP + 'l'])) {
                    return [{error: 'Messages of type other than "data" with 2 buttons must have "messagePerLocale" object with at least "default|1|t" & "default|1|l" keys set'}];
                }
                else if (data.buttons > 2) {
                    return [{error: 'Maximum 2 buttons supported'}];
                }
            }
        }
    }

    if ((skipAppsPlatforms && data.messagePerLocale) || (!skipAppsPlatforms && data.type === 'message')) {
        let mpl = {};
        for (var k in data.messagePerLocale) {
            mpl[k.replace(/[[\]]/g, '')] = data.messagePerLocale[k];
        }
        data.messagePerLocale = mpl;
    }

    if (!data.auto && params.qstring.args.autoEnd) {
        return [{error: 'Non-auto messages cannot have end date'}];
    }

    if (setDateParam(params, 'date', data)) {
        return [{error: 'Only long (ms since Epoch) is supported as date format'}];
    }
    if (setDateParam(params, 'autoEnd', data)) {
        return [{error: 'Only long (ms since Epoch) is supported as autoEnd format'}];
    }

    if (typeof params.qstring.args.tz === 'undefined' || params.qstring.args.tz === false) {
        data.tz = false;
    }
    else if (typeof params.qstring.args.tz !== 'number') {
        return [{error: 'tz must be a number'}];
    }
    else if (!data.date) {
        return [{error: 'tz doesn\'t work without date'}];
    }
    else {
        data.tz = params.qstring.args.tz;
    }

    let [app, geos, cohorts, prepared, mime, autoCohorts] = await Promise.all([
        skipAppsPlatforms ? Promise.resolve() : common.dbPromise('apps', 'findOne', {_id: data.apps.map(common.db.ObjectID)[0]}),
        data.geos && data.geos.length ? common.dbPromise('geos', 'find', {_id: {$in: data.geos.map(common.db.ObjectID)}}) : Promise.resolve(),
        data.cohorts && data.cohorts.length ? common.dbPromise('cohorts', 'find', {_id: {$in: data.cohorts}}) : Promise.resolve(),
        data._id ? Message.findOne(data._id) : Promise.resolve(),
        data.media && data.type === 'message' ? mimeInfo(data.media) : Promise.resolve(),
        data.auto && data.autoCohorts && data.autoCohorts.length ? common.dbPromise('cohorts', 'find', {_id: {$in: data.autoCohorts}}) : Promise.resolve()
    ]);

    if (skipAppsPlatforms) {
        if (prepared) {
            app = await common.dbPromise('apps', 'findOne', {_id: prepared.app}).then(app1 => app1 || {});
            data.app = prepared.app;
            data.platforms = prepared.platforms;
        }
        else {
            return [{error: 'No such message'}];
        }
    }

    if (data.platforms.indexOf(N.Platform.ANDROID) !== 1 &&
        data.platforms.indexOf(N.Platform.HUAWEI) === -1 &&
        common.dot(app, `plugins.push.${N.Platform.HUAWEI}._id`)) {
        data.platforms.push(N.Platform.HUAWEI);
    }

    if (!skipAppsPlatforms && !app) {
        return [{error: 'No such app'}];
    }

    if (data.geos && data.geos.length && (!geos || data.geos.length !== geos.length)) {
        return [{error: 'No such geo'}];
    }

    if (data.cohorts && data.cohorts.length && (!cohorts || data.cohorts.length !== cohorts.length)) {
        return [{error: 'No such cohort'}];
    }

    if (data.auto && data.autoCohorts && data.autoCohorts.length && (!autoCohorts || data.autoCohorts.length !== autoCohorts.length)) {
        return [{error: 'No such cohort'}];
    }

    if (data.media && data.type === 'message' && (!mime || !mime.headers['content-type'])) {
        return [{error: 'Cannot determine MIME type of media attachment'}];
    }

    if (data.auto) {
        if (!skipMpl) {
            if (typeof data.autoOnEntry === 'boolean') {
                if (!data.autoCohorts || !data.autoCohorts.length) {
                    return [{error: 'Cohorts are required for auto messages'}];
                }
                if (!autoCohorts || data.autoCohorts.length !== autoCohorts.length) {
                    return [{error: 'Cohort not found'}];
                }
            }
            else if (data.autoOnEntry === 'events') {
                if (!data.autoEvents || !data.autoEvents.length) {
                    return [{error: 'Events are required for auto messages'}];
                }
            }
            else {
                return [{error: 'autoOnEntry is required for auto messages'}];
            }
        }
    }

    if (!skipAppsPlatforms && prepared) {
        log.d('found prepared message: %j', prepared);
        if (prepared.app.toString() !== data.apps[0]) {
            return [{error: 'Apps changed after preparing message'}];
        }

        if (prepared.platforms.filter(p => data.platforms.indexOf(p) === -1).length) {
            return [{error: 'Platforms changed after preparing message'}];
        }

        if (data.geos && data.geos.length && (!prepared.filter.geos || prepared.filter.geos.length !== data.geos.filter.length)) {
            return [{error: 'Geo changed after preparing message'}];
        }

        if (data.cohorts && data.cohorts.length && (!prepared.filter.cohorts || prepared.filter.cohorts.length !== data.cohorts.length)) {
            return [{error: 'Cohorts changed after preparing message'}];
        }

        if ((data.userConditions || prepared.filter.user) && JSON.stringify(data.userConditions || {}) !== JSON.stringify(prepared.filter.user || {})) {
            // log.d('Compared data %j to prepared %j', JSON.stringify(data.userConditions || {}), (prepared.userConditions || '{}'));
            return [{error: 'userConditions changed after preparing message'}];
        }

        if ((data.drillConditions || prepared.filter.drill) && JSON.stringify(data.drillConditions || {}) !== JSON.stringify(prepared.filter.drill || {})) {
            return [{error: 'drillConditions changed after preparing message'}];
        }
    }

    let note = new N.Note({
        _id: data._id ? common.db.ObjectID(data._id) : undefined,
        status: N.Status.NotCreated,
        type: data.type,
        source: data.source,
        apps: [app._id],
        appNames: [app.name],
        platforms: data.platforms,
        messagePerLocale: data.messagePerLocale,
        locales: data.locales,
        url: data.url,
        sound: data.sound,
        badge: data.badge,
        buttons: data.buttons,
        media: data.media,
        mediaMime: mime ? mime.headers['content-type'] : undefined,
        contentAvailable: data.contentAvailable,
        collapseKey: data.collapseKey,
        delayWhileIdle: data.delayWhileIdle,
        data: data.data,
        userProps: data.userProps && data.userProps.length ? data.userProps : undefined,
        userConditions: data.userConditions && Object.keys(data.userConditions).length ? data.userConditions : undefined,
        drillConditions: data.drillConditions && Object.keys(data.drillConditions).length ? data.drillConditions : undefined,
        geos: geos && geos.length ? data.geos : undefined,
        cohorts: cohorts && cohorts.length ? data.cohorts : undefined,
        delayed: data.delayed,
        test: data.test || false,
        date: data.date || new Date(),
        expiration: data.expiration,
        tz: data.tz,
        tx: data.tx || false,
        auto: data.auto || false,
        autoOnEntry: data.auto ? data.autoOnEntry : undefined,
        autoCancelTrigger: data.auto ? data.autoCancelTrigger : undefined,
        autoCohorts: data.auto && autoCohorts && autoCohorts.length ? autoCohorts.map(c => c._id) : undefined,
        autoEvents: data.auto && data.autoEvents && data.autoEvents.length && data.autoEvents || undefined,
        autoEnd: data.auto ? data.autoEnd : undefined,
        autoDelay: data.auto ? data.autoDelay : undefined,
        autoTime: data.auto ? data.autoTime : undefined,
        autoCapMessages: data.auto ? data.autoCapMessages : undefined,
        autoCapSleep: data.auto ? data.autoCapSleep : undefined,
        actualDates: data.actualDates || false
    });

    return Message.fromNote(note);
}

/**
 * Legacy /prepare endpoint
 * 
 * @param {object} params params
 * @returns {Promise} response promise
 */
async function legacyPrepare(params) {
    if (typeof params.qstring.args === 'string') {
        try {
            params.qstring.args = JSON.parse(params.qstring.args);
        }
        catch (SyntaxError) {
            log.e('Parse /i/pushes JSON failed');
        }
    }
    let msg = await validate(params);
    if (!(msg instanceof Message)) {
        if (msg[0].error) {
            return common.returnOutput(params, msg[0]);
        }
        else {
            return common.returnOutput(params, {error: 'Invalid state'});
        }
    }

    Object.assign(params.qstring, msg.json);
    delete params.qstring.result;

    params.qstring.status = Status.Draft;

    await create(params);
}

/**
 * Legacy /create endpoint
 * 
 * @param {object} params params
 * @returns {Promise} response promise
 */
async function legacyCreate(params) {
    if (typeof params.qstring.args === 'string') {
        try {
            params.qstring.args = JSON.parse(params.qstring.args);
        }
        catch (SyntaxError) {
            log.e('Parse /i/pushes JSON failed');
        }
    }
    let msg = await validate(params);
    if (!(msg instanceof Message)) {
        if (msg[0].error) {
            return common.returnOutput(params, msg[0]);
        }
        else {
            return common.returnOutput(params, {error: 'Invalid state'});
        }
    }

    Object.assign(params.qstring, msg.json);
    delete params.qstring.result;

    if (params.qstring._id) {
        params.qstring.status = Status.Created;
        await update(params);
    }
    else {
        await create(params);
    }
}

module.exports.legacyApis = {
    i: {
        create: [validateCreate, legacyCreate],
        prepare: [validateUpdate, legacyPrepare],
    }
};

