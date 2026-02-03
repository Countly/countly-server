/**
 * This module processes events for aggregated data
 * @module api/parts/data/events
 */

import { createRequire } from 'module';

// createRequire needed for CJS modules without ES exports
// @ts-expect-error TS1470 - import.meta is valid at runtime (Node 22 treats .ts with imports as ESM)
const require = createRequire(import.meta.url);
const common = require('./../../utils/common.js');
const async = require('async');
const crypto = require('crypto');
const Promise = require('bluebird');
const plugins = require('../../../plugins/pluginManager.ts');

/**
 * Event interface
 */
interface CountlyEvent {
    key: string;
    count?: number;
    sum?: number;
    dur?: number;
    timestamp?: number;
    segmentation?: Record<string, unknown>;
}

/**
 * Params interface
 */
interface Params {
    app_id: string;
    app?: { plugins?: Record<string, unknown> };
    appTimezone?: string;
    time: unknown;
    qstring: {
        events: CountlyEvent[];
        safe_api_response?: boolean;
    };
}

/**
 * Event collection interface
 */
interface EventCollection {
    list?: string[];
    segments?: Record<string, string[]>;
    omitted_segments?: Record<string, string[]>;
    whitelisted_segments?: Record<string, string[]>;
}

/**
 * Event meta document interface
 */
interface EventMetaDoc {
    _id?: string;
    coll?: string;
    meta_v2?: Record<string, Record<string, unknown>>;
}

/**
 * Meta to fetch interface
 */
interface MetaToFetch {
    coll: string;
    id: string;
    app_id: string;
}

const countlyEvents: {
    processEvents: (params: Params) => Promise<void>;
} = {
    /**
     * Process JSON decoded events data from request
     * @param params - params object
     * @returns resolved when processing finished
     */
    processEvents: function(params: Params): Promise<void> {
        return new Promise(function(resolve: () => void) {
            const forbiddenSegValues: string[] = [];
            for (let i = 1; i < 32; i++) {
                forbiddenSegValues.push(i + '');
            }
            common.readBatcher.getOne('events', { '_id': params.app_id }, {
                list: 1,
                segments: 1,
                omitted_segments: 1,
                whitelisted_segments: 1
            }, (err: Error | null, eventColl: EventCollection | null) => {
                let appEvents: string[] = [];
                let appSegments: Record<string, string[]> = {};
                const metaToFetch: Record<string, MetaToFetch> = {};
                let omitted_segments: Record<string, string[]> = {};
                let whitelisted_segments: Record<string, string[]> = {};
                const pluginsGetConfig = plugins.getConfig('api', params.app && params.app.plugins, true);

                if (!err && eventColl) {
                    if (eventColl.list) {
                        appEvents = eventColl.list;
                    }

                    if (eventColl.segments) {
                        appSegments = eventColl.segments;
                    }

                    if (eventColl.omitted_segments) {
                        omitted_segments = eventColl.omitted_segments;
                    }

                    if (eventColl.whitelisted_segments) {
                        whitelisted_segments = eventColl.whitelisted_segments;
                    }
                }

                for (let i = 0; i < params.qstring.events.length; i++) {

                    if (typeof params.qstring.events[i].key !== 'string') {
                        try {
                            params.qstring.events[i].key = JSON.stringify(params.qstring.events[i].key);
                        }
                        catch (_) {
                            params.qstring.events[i].key += '';
                        }
                    }

                    const currEvent = params.qstring.events[i];
                    let shortEventName = '';
                    let eventCollectionName = '';

                    if (!currEvent.segmentation) {
                        continue;
                    }

                    // Key fields is required
                    if (!currEvent.key || (currEvent.key.indexOf('[CLY]_') === 0 && plugins.internalEvents.indexOf(currEvent.key) === -1)) {
                        continue;
                    }
                    if (currEvent.count && common.isNumber(currEvent.count)) {
                        currEvent.count = parseInt(currEvent.count as unknown as string, 10);
                    }
                    else {
                        currEvent.count = 1;
                    }

                    if (pluginsGetConfig.event_limit &&
                            appEvents.length >= pluginsGetConfig.event_limit &&
                            appEvents.indexOf(currEvent.key) === -1) {
                        continue;
                    }
                    shortEventName = common.fixEventKey(currEvent.key);

                    if (!shortEventName) {
                        continue;
                    }
                    eventCollectionName = crypto.createHash('sha1').update(shortEventName + params.app_id).digest('hex');
                    if (currEvent.segmentation) {

                        for (const segKey in currEvent.segmentation) {
                            // check if segment should be omitted
                            if (plugins.internalOmitSegments[currEvent.key] && Array.isArray(plugins.internalOmitSegments[currEvent.key]) && plugins.internalOmitSegments[currEvent.key].indexOf(segKey) !== -1) {
                                continue;
                            }
                            // check if segment should be omitted
                            if (omitted_segments[currEvent.key] && Array.isArray(omitted_segments[currEvent.key]) && omitted_segments[currEvent.key].indexOf(segKey) !== -1) {
                                continue;
                            }

                            // check if whitelisted is set and this one not in whitelist
                            if (whitelisted_segments[currEvent.key] && Array.isArray(whitelisted_segments[currEvent.key]) && whitelisted_segments[currEvent.key].indexOf(segKey) === -1) {
                                continue;
                            }

                            if (pluginsGetConfig.event_segmentation_limit &&
                                    appSegments[currEvent.key] &&
                                    appSegments[currEvent.key].indexOf(segKey) === -1 &&
                                    appSegments[currEvent.key].length >= pluginsGetConfig.event_segmentation_limit) {
                                continue;
                            }

                            let tmpSegVal: string;
                            let myValues: unknown[] = [];
                            if (Array.isArray(currEvent.segmentation[segKey])) {
                                currEvent.segmentation[segKey] = (currEvent.segmentation[segKey] as unknown[]).splice(0, (pluginsGetConfig.array_list_limit || 10));
                                myValues = []; // ignore array values.
                            }
                            else {
                                myValues = [currEvent.segmentation[segKey]];
                            }
                            for (let z = 0; z < myValues.length; z++) {
                                try {
                                    tmpSegVal = myValues[z] + '';
                                    tmpSegVal = tmpSegVal.replace(/^\$+/, '').replace(/\./g, ':');
                                    tmpSegVal = common.encodeCharacters(tmpSegVal);

                                    if (forbiddenSegValues.indexOf(tmpSegVal) !== -1) {
                                        tmpSegVal = '[CLY]' + tmpSegVal;
                                    }

                                    const postfix = common.crypto.createHash('md5').update(tmpSegVal).digest('base64')[0];
                                    metaToFetch[eventCollectionName + 'no-segment_' + common.getDateIds(params).zero + '_' + postfix] = {
                                        coll: eventCollectionName,
                                        id: 'no-segment_' + common.getDateIds(params).zero + '_' + postfix,
                                        app_id: params.app_id
                                    };
                                }
                                catch (ex) {
                                    console.log('Incorrect segment value', params.app_id, currEvent.key, 'segment', segKey, ex);
                                    delete currEvent.segmentation[segKey];
                                }
                            }

                        }
                    }
                }
                async.map(Object.keys(metaToFetch), fetchEventMeta, function(err2: Error | null, eventMetaDocs: EventMetaDoc[]) {
                    const appSgValues: Record<string, Record<string, Record<string, string[]>>> = {};

                    for (let i = 0; i < eventMetaDocs.length; i++) {
                        if (eventMetaDocs[i].coll) {
                            if (eventMetaDocs[i].meta_v2) {
                                if (!appSgValues[eventMetaDocs[i].coll!]) {
                                    appSgValues[eventMetaDocs[i].coll!] = {};
                                }
                                if (!appSgValues[eventMetaDocs[i].coll!][eventMetaDocs[i]._id!]) {
                                    appSgValues[eventMetaDocs[i].coll!][eventMetaDocs[i]._id!] = {};
                                }
                                for (const segment in eventMetaDocs[i].meta_v2!) {
                                    appSgValues[eventMetaDocs[i].coll!][eventMetaDocs[i]._id!][segment] = Object.keys(eventMetaDocs[i].meta_v2![segment]);
                                }
                            }
                        }
                    }
                    processEvents(appEvents, appSegments, appSgValues, params, omitted_segments, whitelisted_segments, resolve);
                });

                /**
                 * Fetch event meta
                 * @param id - id to of event to fetchEventMeta
                 * @param callback - for result
                 */
                function fetchEventMeta(id: string, callback: (err: Error | null, result: EventMetaDoc) => void): void {
                    common.readBatcher.getOne('events_data', { '_id': metaToFetch[id].app_id + '_' + metaToFetch[id].coll + '_' + metaToFetch[id].id }, { meta_v2: 1 }, (err2: Error | null, eventMetaDoc: EventMetaDoc | null) => {
                        const retObj: EventMetaDoc = eventMetaDoc || {};
                        retObj.coll = metaToFetch[id].coll;

                        callback(null, retObj);
                    });
                }
            });
        });
    }
};

/**
 * Process events from params
 * @param appEvents - array with existing event keys
 * @param appSegments - object with event key as key, and segments as array value
 * @param appSgValues - object in format [collection][document_id][segment] and array of values as value
 * @param params - params object
 * @param omitted_segments - segments to omit
 * @param whitelisted_segments - segments to keep
 * @param done - callback function to call when done processing
 */
function processEvents(
    appEvents: string[],
    appSegments: Record<string, string[]>,
    appSgValues: Record<string, Record<string, Record<string, string[]>>>,
    params: Params,
    omitted_segments: Record<string, string[]>,
    whitelisted_segments: Record<string, string[]>,
    done: () => void
): void {
    const events: string[] = [];
    const eventCollections: Record<string, Record<string, Record<string, number>>> = {};
    const eventSegments: Record<string, Record<string, unknown>> = {};
    const eventSegmentsZeroes: Record<string, string[]> = {};
    let tmpEventObj: Record<string, number>;
    let tmpEventColl: Record<string, Record<string, number>>;
    let shortEventName = '';
    let eventCollectionName = '';
    const eventHashMap: Record<string, string> = {};
    const forbiddenSegValues: string[] = [];
    const pluginsGetConfig = plugins.getConfig('api', params.app && params.app.plugins, true);

    for (let i = 1; i < 32; i++) {
        forbiddenSegValues.push(i + '');
    }

    for (let i = 0; i < params.qstring?.events.length; i++) {
        const currEvent = params.qstring.events[i];
        tmpEventObj = {};
        tmpEventColl = {};
        const tmpTotalObj: Record<string, number> = {};

        // Key fields is required
        if (!currEvent.key || (currEvent.key.indexOf('[CLY]_') === 0 && plugins.internalEvents.indexOf(currEvent.key) === -1)) {
            continue;
        }

        if (currEvent.count && common.isNumber(currEvent.count)) {
            currEvent.count = parseInt(currEvent.count as unknown as string, 10);
        }
        else {
            currEvent.count = 1;
        }

        if (pluginsGetConfig.event_limit &&
                appEvents.length >= pluginsGetConfig.event_limit &&
                appEvents.indexOf(currEvent.key) === -1) {
            continue;
        }

        plugins.dispatch('/i/events', {
            params: params,
            currEvent: currEvent
        });

        shortEventName = common.fixEventKey(currEvent.key);

        if (!shortEventName) {
            continue;
        }

        // Create new collection name for the event
        eventCollectionName = crypto.createHash('sha1').update(shortEventName + params.app_id).digest('hex');

        eventHashMap[eventCollectionName] = shortEventName;

        // If present use timestamp inside each event while recording
        const time = params.time;
        if (params.qstring.events[i].timestamp) {
            params.time = common.initTimeObj(params.appTimezone, params.qstring.events[i].timestamp);
        }

        common.arrayAddUniq(events, shortEventName);

        if (currEvent.sum && common.isNumber(currEvent.sum)) {
            currEvent.sum = parseFloat(parseFloat(currEvent.sum as unknown as string).toFixed(5));
            common.fillTimeObjectMonth(params, tmpEventObj, common.dbMap.sum, currEvent.sum);
            common.fillTimeObjectMonth(params, tmpTotalObj, shortEventName + '.' + common.dbMap.sum, currEvent.sum);
        }

        if (currEvent.dur && common.isNumber(currEvent.dur)) {
            currEvent.dur = parseFloat(currEvent.dur as unknown as string);
            common.fillTimeObjectMonth(params, tmpEventObj, common.dbMap.dur, currEvent.dur);
            common.fillTimeObjectMonth(params, tmpTotalObj, shortEventName + '.' + common.dbMap.dur, currEvent.dur);
        }

        if (currEvent.count && common.isNumber(currEvent.count)) {
            currEvent.count = parseInt(currEvent.count as unknown as string, 10);
        }

        common.fillTimeObjectMonth(params, tmpEventObj, common.dbMap.count, currEvent.count);
        common.fillTimeObjectMonth(params, tmpTotalObj, shortEventName + '.' + common.dbMap.count, currEvent.count);

        const dateIds = common.getDateIds(params);
        const postfix2 = common.crypto.createHash('md5').update(shortEventName).digest('base64')[0];

        tmpEventColl['no-segment' + '.' + dateIds.month] = tmpEventObj;

        if (!eventCollections.all) {
            eventCollections.all = {};
        }
        const ee: Record<string, Record<string, number>> = {};
        ee['key.' + dateIds.month + '.' + postfix2] = tmpTotalObj;

        mergeEvents(eventCollections.all, ee);
        // fill time object for total event count

        if (currEvent.segmentation) {
            for (let segKey in currEvent.segmentation) {
                let tmpSegKey = '';
                if (segKey.indexOf('.') !== -1 || segKey.substr(0, 1) === '$') {
                    tmpSegKey = segKey.replace(/^\$+|\./g, '');
                    currEvent.segmentation[tmpSegKey] = currEvent.segmentation[segKey];
                    delete currEvent.segmentation[segKey];
                }
            }

            for (const segKey in currEvent.segmentation) {
                // check if segment should be omitted
                if (plugins.internalOmitSegments[currEvent.key] && Array.isArray(plugins.internalOmitSegments[currEvent.key]) && plugins.internalOmitSegments[currEvent.key].indexOf(segKey) !== -1) {
                    continue;
                }
                // check if segment should be omitted
                if (omitted_segments[currEvent.key] && Array.isArray(omitted_segments[currEvent.key]) && omitted_segments[currEvent.key].indexOf(segKey) !== -1) {
                    continue;
                }

                if (whitelisted_segments[currEvent.key] && Array.isArray(whitelisted_segments[currEvent.key]) && whitelisted_segments[currEvent.key].indexOf(segKey) === -1) {
                    continue;
                }
                // if segKey is empty
                if (segKey === '') {
                    continue;
                }

                if (pluginsGetConfig.event_segmentation_limit &&
                        appSegments[currEvent.key] &&
                        appSegments[currEvent.key].indexOf(segKey) === -1 &&
                        appSegments[currEvent.key].length >= pluginsGetConfig.event_segmentation_limit) {
                    continue;
                }

                let myValues: unknown[] = [];
                let tmpSegVal: string;
                if (Array.isArray(currEvent.segmentation[segKey])) {
                    myValues = []; // ignore array values
                }
                else {
                    myValues = [currEvent.segmentation[segKey]];
                }
                for (let z = 0; z < myValues.length; z++) {
                    tmpEventObj = {};
                    tmpSegVal = myValues[z] as string;
                    try {
                        tmpSegVal = tmpSegVal + '';
                    }
                    catch (_) {
                        tmpSegVal = '';
                    }

                    if (tmpSegVal === '') {
                        continue;
                    }

                    // Mongodb field names can't start with $ or contain .
                    tmpSegVal = tmpSegVal.replace(/^\$+/, '').replace(/\./g, ':');

                    if (forbiddenSegValues.indexOf(tmpSegVal) !== -1) {
                        tmpSegVal = '[CLY]' + tmpSegVal;
                    }

                    tmpSegVal = common.encodeCharacters(tmpSegVal);

                    const postfix = common.crypto.createHash('md5').update(tmpSegVal).digest('base64')[0];

                    if (pluginsGetConfig.event_segmentation_value_limit &&
                            appSgValues[eventCollectionName] &&
                            appSgValues[eventCollectionName]['no-segment' + '_' + dateIds.zero + '_' + postfix] &&
                            appSgValues[eventCollectionName]['no-segment' + '_' + dateIds.zero + '_' + postfix][segKey] &&
                            appSgValues[eventCollectionName]['no-segment' + '_' + dateIds.zero + '_' + postfix][segKey].indexOf(tmpSegVal) === -1 &&
                            appSgValues[eventCollectionName]['no-segment' + '_' + dateIds.zero + '_' + postfix][segKey].length >= pluginsGetConfig.event_segmentation_value_limit) {
                        continue;
                    }

                    if (currEvent.sum && common.isNumber(currEvent.sum)) {
                        common.fillTimeObjectMonth(params, tmpEventObj, tmpSegVal + '.' + common.dbMap.sum, currEvent.sum);
                    }

                    if (currEvent.dur && common.isNumber(currEvent.dur)) {
                        common.fillTimeObjectMonth(params, tmpEventObj, tmpSegVal + '.' + common.dbMap.dur, currEvent.dur);
                    }

                    common.fillTimeObjectMonth(params, tmpEventObj, tmpSegVal + '.' + common.dbMap.count, currEvent.count);

                    if (!eventSegmentsZeroes[eventCollectionName]) {
                        eventSegmentsZeroes[eventCollectionName] = [];
                        common.arrayAddUniq(eventSegmentsZeroes[eventCollectionName], dateIds.zero + '.' + postfix);
                    }
                    else {
                        common.arrayAddUniq(eventSegmentsZeroes[eventCollectionName], dateIds.zero + '.' + postfix);
                    }

                    if (!eventSegments[eventCollectionName + '.' + dateIds.zero + '.' + postfix]) {
                        eventSegments[eventCollectionName + '.' + dateIds.zero + '.' + postfix] = {};
                    }

                    eventSegments[eventCollectionName + '.' + dateIds.zero + '.' + postfix]['meta_v2.' + segKey + '.' + tmpSegVal] = true;
                    eventSegments[eventCollectionName + '.' + dateIds.zero + '.' + postfix]['meta_v2.segments.' + segKey] = true;

                    tmpEventColl[segKey + '.' + dateIds.month + '.' + postfix] = tmpEventObj;
                }
            }
        }
        if (!eventCollections[eventCollectionName]) {
            eventCollections[eventCollectionName] = {};
        }

        if (!eventSegmentsZeroes.all) {
            eventSegmentsZeroes.all = [];
            common.arrayAddUniq(eventSegmentsZeroes.all, dateIds.zero + '.' + postfix2);
        }
        else {
            common.arrayAddUniq(eventSegmentsZeroes.all, dateIds.zero + '.' + postfix2);
        }

        if (!eventSegments['all.' + dateIds.zero + '.' + postfix2]) {
            eventSegments['all.' + dateIds.zero + '.' + postfix2] = {};
        }

        eventSegments['all.' + dateIds.zero + '.' + postfix2]['meta_v2.key.' + shortEventName] = true;
        eventSegments['all.' + dateIds.zero + '.' + postfix2]['meta_v2.segments.key'] = true;

        mergeEvents(eventCollections[eventCollectionName], tmpEventColl);
        // switch back to request time
        params.time = time;
    }

    if (!pluginsGetConfig.safe && !(params.qstring?.safe_api_response)) {
        for (const collection in eventCollections) {
            if (eventSegmentsZeroes[collection] && eventSegmentsZeroes[collection].length) {
                for (let i = 0; i < eventSegmentsZeroes[collection].length; i++) {
                    let zeroId = '';

                    if (!eventSegmentsZeroes[collection] || !eventSegmentsZeroes[collection][i]) {
                        continue;
                    }
                    else {
                        zeroId = eventSegmentsZeroes[collection][i];
                    }
                    (eventSegments[collection + '.' + zeroId] as Record<string, unknown>).m = zeroId.split('.')[0];
                    (eventSegments[collection + '.' + zeroId] as Record<string, unknown>).s = 'no-segment';
                    (eventSegments[collection + '.' + zeroId] as Record<string, unknown>).a = params.app_id + '';
                    (eventSegments[collection + '.' + zeroId] as Record<string, unknown>).e = eventHashMap[collection] || collection;
                    (eventSegments[collection + '.' + zeroId] as Record<string, unknown>)._id = params.app_id + '_' + collection + '_' + 'no-segment_' + zeroId.replace('.', '_');
                    common.writeBatcher.add('events_data', params.app_id + '_' + collection + '_' + 'no-segment_' + zeroId.replace('.', '_'), { $set: eventSegments[collection + '.' + zeroId] });
                }
            }

            for (const segment in eventCollections[collection]) {
                const collIdSplits = segment.split('.');
                const collId = params.app_id + '_' + collection + '_' + segment.replace(/\./g, '_');

                common.writeBatcher.add('events_data', collId, {
                    $set: {
                        'm': collIdSplits[1],
                        's': collIdSplits[0],
                        'a': params.app_id + '',
                        'e': eventHashMap[collection] || collection
                    },
                    '$inc': eventCollections[collection][segment]
                });
            }
        }
    }
    else {
        const eventDocs: Array<{ collection: string; _id: string; updateObj: Record<string, unknown>; rollbackObj?: Record<string, number> }> = [];
        for (const collection in eventCollections) {
            if (eventSegmentsZeroes[collection] && eventSegmentsZeroes[collection].length) {
                for (let i = 0; i < eventSegmentsZeroes[collection].length; i++) {
                    let zeroId = '';

                    if (!eventSegmentsZeroes[collection] || !eventSegmentsZeroes[collection][i]) {
                        continue;
                    }
                    else {
                        zeroId = eventSegmentsZeroes[collection][i];
                    }

                    (eventSegments[collection + '.' + zeroId] as Record<string, unknown>).m = zeroId.split('.')[0];
                    (eventSegments[collection + '.' + zeroId] as Record<string, unknown>).s = 'no-segment';
                    (eventSegments[collection + '.' + zeroId] as Record<string, unknown>).a = params.app_id + '';
                    (eventSegments[collection + '.' + zeroId] as Record<string, unknown>).e = eventHashMap[collection] || collection;


                    eventDocs.push({
                        'collection': 'events_data',
                        '_id': params.app_id + '_' + collection + '_' + 'no-segment_' + zeroId.replace('.', '_'),
                        'updateObj': { $set: eventSegments[collection + '.' + zeroId] }
                    });
                }
            }

            for (const segment in eventCollections[collection]) {
                const collIdSplits = segment.split('.');
                const collId = params.app_id + '_' + collection + '_' + segment.replace(/\./g, '_');

                eventDocs.push({
                    'collection': 'events_data',
                    '_id': collId,
                    'updateObj': {
                        $set: {
                            'm': collIdSplits[1],
                            's': collIdSplits[0],
                            'a': params.app_id + '',
                            'e': eventHashMap[collection] || collection
                        },
                        '$inc': eventCollections[collection][segment]
                    },
                    'rollbackObj': eventCollections[collection][segment]
                });
            }
        }
        for (let k = 0; k < eventDocs.length; k++) {
            common.writeBatcher.add(eventDocs[k].collection, eventDocs[k]._id, eventDocs[k].updateObj);
        }
    }

    if (events.length) {
        const eventSegmentList: { $addToSet: Record<string, unknown> } = { '$addToSet': { 'list': { '$each': events } } };

        for (const event in eventSegments) {
            const eventSplits = event.split('.');
            const eventKey = eventSplits[0];

            const realEventKey = ((eventHashMap[eventKey] || '') + '').replace(/\./g, ':');
            // for segment describing all events there is no event key.
            if (realEventKey && !eventSegmentList.$addToSet['segments.' + realEventKey]) {
                eventSegmentList.$addToSet['segments.' + realEventKey] = {};
            }

            if (eventSegments[event] && realEventKey) {
                for (const segment in eventSegments[event]) {
                    if (segment.indexOf('meta_v2.segments.') === 0) {
                        const name = segment.replace('meta_v2.segments.', '');
                        if (eventSegmentList.$addToSet['segments.' + realEventKey] && (eventSegmentList.$addToSet['segments.' + realEventKey] as Record<string, unknown>).$each) {
                            common.arrayAddUniq((eventSegmentList.$addToSet['segments.' + realEventKey] as Record<string, unknown>).$each, name);
                        }
                        else {
                            eventSegmentList.$addToSet['segments.' + realEventKey] = { $each: [name] };
                        }
                    }
                }
            }
        }
        common.writeBatcher.add('events', common.db.ObjectID(params.app_id), eventSegmentList);
    }
    done();
}

/**
 * Merge multiple event document objects
 * @param firstObj - first object to merge
 * @param secondObj - second object to merge
 */
function mergeEvents(firstObj: Record<string, Record<string, number>>, secondObj: Record<string, Record<string, number>>): void {
    for (const firstLevel in secondObj) {

        if (!Object.prototype.hasOwnProperty.call(secondObj, firstLevel)) {
            continue;
        }

        if (!firstObj[firstLevel]) {
            firstObj[firstLevel] = secondObj[firstLevel];
            continue;
        }

        for (const secondLevel in secondObj[firstLevel]) {

            if (!Object.prototype.hasOwnProperty.call(secondObj[firstLevel], secondLevel)) {
                continue;
            }

            if (firstObj[firstLevel][secondLevel]) {
                firstObj[firstLevel][secondLevel] += secondObj[firstLevel][secondLevel];
            }
            else {
                firstObj[firstLevel][secondLevel] = secondObj[firstLevel][secondLevel];
            }
        }
    }
}

export default countlyEvents;
export { countlyEvents };
export type { CountlyEvent, Params, EventCollection };
