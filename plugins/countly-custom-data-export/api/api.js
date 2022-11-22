const plugins = require('../../pluginManager.js'),
    common = require('../../../api/utils/common.js'),
    {validateRead} = require('../../../api/utils/rights.js'),
    log = common.log('countly-custom-data-export:api'),
    FEATURE_NAME = 'countly-custom-data-export',
    _ = require('underscore'),
    drillCommon = require('../../drill/api/common.js'),
    moment = require('moment-timezone');

var exports = require("../../../api/parts/data/exports.js");

const defaultEventList = ["Login", "Purchase", "Settings Changed"]; // todo: will add default events
const defaultProjectionFields = { ts: 1, sg: 1, uid: 1, "up.username": 1, "up.email": 1};

plugins.register("/permissions/features", function(ob) {
    ob.features.push(FEATURE_NAME);
});

plugins.register('/o/custom-export', function(ob, options) {
    validateRead(ob.params, FEATURE_NAME, async function() {
        try {
            var startPeriod = moment();
            startPeriod = startPeriod.subtract(90, "days").valueOf();

            let appId = ob.params.qstring.app_id;
            let period = ob.params.qstring.period || startPeriod; // optional
            let events = defaultEventList; // optional
            let projectionFields = defaultProjectionFields; // optional
            if (ob.params.qstring.projects) {
                projectionFields = JSON.parse(ob.params.qstring.projects);
                projectionFields._id = 0;
            }

            if (ob.params.qstring.events) {
                events = JSON.parse(ob.params.qstring.events);
            }

            let exportType = ob.params.qstring.type;
            if (_.isUndefined(appId)) {
                common.returnMessage(ob.params, 400, 'Missing parameter "appId"');
                return true;
            }

            if (_.isUndefined(exportType)) {
                common.returnMessage(ob.params, 400, 'Missing parameter "type". (You should send one of these types: json, stream, xls, xlsx, csv)');
                return true;
            }

            if (events.length < 2) {
                common.returnMessage(ob.params, 400, 'You should send at least 2 events.');
                return true;
            }

            const eventCollections = [];
            for (var i = 0; i < events.length; i++) {
                try {
                    var collectionName = drillCommon.getCollectionName(events[i], appId);
                    eventCollections.push(collectionName);
                }
                catch {
                    eventCollections.push("Unknown");
                }
            }
            options = {
                db: common.drillDb,
                params: ob.params,
                type: exportType,
                filename: "custom_data_export" + moment().format("DD-MMM-YYYY HH:MM:SS"),
                streamOptions: {},
                writeHeaders: true
            };
            if (options.params && options.params.qstring && options.params.qstring.formatFields) {
                options.mapper = options.params.qstring.formatFields;
            }

            // prepare pipeline
            var $match = { $match: { ts: {$gte: period} } };
            var $project = { $project: projectionFields };

            var $unionWith = [];
            for (var j = 1; j < eventCollections.length; j++) {
                $unionWith.push({$unionWith: {coll: eventCollections[j], pipeline: [$match, $project]}});
            }

            var cursor = common.drillDb.collection(eventCollections[0]).aggregate([
                $match,
                $project,
                ...$unionWith
            ], {allowDiskUse: true, cursor: {}});
            if (options.type === "stream" || options.type === "json") {
                options.streamOptions.transform = function(doc) {
                    doc = transformValuesInObject(doc, options.mapper);
                    return JSON.stringify(doc);
                };
            }
            if (options.type === "stream" || options.type === "json" || options.type === "xls" || options.type === "xlsx" || options.type === "csv") {
                options.output = options.output || function(stream) {
                    exports.stream(options.params, stream, options);
                };
                options.output(cursor);
            }
            else {
                cursor.toArray(function(err, data) {
                    exports.fromData(data, options);
                });
            }
        }
        catch (e) {
            log.e(e);
            common.returnMessage(ob.params, 500, "Error");
        }
    });

    // eslint-disable-next-line require-jsdoc
    function transformValuesInObject(doc, mapper) {
        for (var z in doc) {
            doc[z] = transformValue(doc[z], z, mapper);
        }
        return doc;
    }

    // eslint-disable-next-line require-jsdoc
    function transformValue(value, key, mapper) {
        if (mapper && mapper.fields && mapper.fields[key]) {
            //if we need we can easy add later different transformations and pass other params for them
            if (mapper.fields[key].to && mapper.fields[key].to === "time") {
                if (value) {
                    if (Math.round(value).toString().length === 10) {
                        value *= 1000;
                    }
                    value = moment(new Date(value)).tz(mapper.tz);
                    if (value) {
                        value = value.format("ddd, D MMM YYYY HH:mm:ss");
                    }
                    else {
                        value /= 1000;
                    }
                }
            }
            return value;
        }
        else {
            return value;
        }
    }
    return true;
});