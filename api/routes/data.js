/**
 * Generic data read routes (/o with method-based dispatch).
 * Migrated from the legacy switch/case in requestProcessor.js.
 * @module api/routes/data
 */

const express = require('express');
const router = express.Router();
const common = require('../utils/common.js');
const { validateUser, validateRead, validateUserForWrite, validateGlobalAdmin } = require('../utils/rights.js');
const plugins = require('../../plugins/pluginManager.ts');

const validateUserForDataReadAPI = validateRead;
const validateUserForMgmtReadAPI = validateUser;
const validateUserForDataWriteAPI = validateUserForWrite;
const validateUserForGlobalAdmin = validateGlobalAdmin;

const countlyApi = {
    data: {
        fetch: require('../parts/data/fetch.js'),
        geoData: require('../parts/data/geoData.ts').default
    },
    mgmt: {
        users: require('../parts/mgmt/users.js'),
    }
};

/**
 * Generic /o endpoint - method-based dispatch.
 * Requires app_id parameter and dispatches based on params.qstring.method.
 */
router.all('/o', (req, res) => {
    const params = req.countlyParams;

    if (!params.qstring.app_id) {
        common.returnMessage(params, 400, 'Missing parameter "app_id"');
        return false;
    }

    switch (params.qstring.method) {
    case 'total_users':
        validateUserForDataReadAPI(params, 'core', countlyApi.data.fetch.fetchTotalUsersObj, params.qstring.metric || 'users');
        break;
    case 'get_period_obj':
        validateUserForDataReadAPI(params, 'core', countlyApi.data.fetch.getPeriodObj, 'users');
        break;
    case 'locations':
    case 'sessions':
    case 'users':
        validateUserForDataReadAPI(params, 'core', countlyApi.data.fetch.fetchTimeObj, 'users');
        break;
    case 'app_versions':
    case 'device_details':
        validateUserForDataReadAPI(params, 'core', countlyApi.data.fetch.fetchTimeObj, 'device_details');
        break;
    case 'devices':
    case 'carriers':
        validateUserForDataReadAPI(params, 'core', countlyApi.data.fetch.fetchTimeObj, params.qstring.method);
        break;
    case 'countries':
        if (plugins.getConfig("api", params.app && params.app.plugins, true).country_data !== false) {
            validateUserForDataReadAPI(params, 'core', countlyApi.data.fetch.fetchTimeObj, params.qstring.method);
        }
        else {
            common.returnOutput(params, {});
        }
        break;
    case 'cities':
        if (plugins.getConfig("api", params.app && params.app.plugins, true).city_data !== false) {
            validateUserForDataReadAPI(params, 'core', countlyApi.data.fetch.fetchTimeObj, params.qstring.method);
        }
        else {
            common.returnOutput(params, {});
        }
        break;
    case 'geodata': {
        validateRead(params, 'core', function() {
            if (params.qstring.loadFor === "cities") {
                countlyApi.data.geoData.loadCityCoordiantes({"query": params.qstring.query}, function(err, data) {
                    common.returnOutput(params, data);
                });
            }
        });
        break;
    }
    case 'get_event_groups':
        validateRead(params, 'core', countlyApi.data.fetch.fetchEventGroups);
        break;
    case 'get_event_group':
        validateRead(params, 'core', countlyApi.data.fetch.fetchEventGroupById);
        break;
    case 'events':
        if (params.qstring.events) {
            try {
                params.qstring.events = JSON.parse(params.qstring.events);
            }
            catch (SyntaxError) {
                console.log('Parse events array failed', params.qstring.events, params.req.url, params.req.body);
            }
            if (params.qstring.overview) {
                validateRead(params, 'core', countlyApi.data.fetch.fetchDataEventsOverview);
            }
            else {
                validateRead(params, 'core', countlyApi.data.fetch.fetchMergedEventData);
            }
        }
        else {
            if (params.qstring.event && params.qstring.event.startsWith('[CLY]_group_')) {
                validateRead(params, 'core', countlyApi.data.fetch.fetchMergedEventGroups);
            }
            else {
                params.truncateEventValuesList = true;
                validateRead(params, 'core', countlyApi.data.fetch.prefetchEventData, params.qstring.method);
            }
        }
        break;
    case 'get_events':
        validateRead(params, 'core', async function() {
            try {
                var result = await common.db.collection("events").findOne({ '_id': common.db.ObjectID(params.qstring.app_id) });
                result = result || {};
                result.list = result.list || [];
                result.segments = result.segments || {};

                if (result.list) {
                    result.list = result.list.filter(function(l) {
                        return l.indexOf('[CLY]') !== 0;
                    });
                }
                if (result.segments) {
                    for (let i in result.segments) {
                        if (i.indexOf('[CLY]') === 0) {
                            delete result.segments[i];
                        }
                    }
                }
                const pluginsGetConfig = plugins.getConfig("api", params.app && params.app.plugins, true);
                result.limits = {
                    event_limit: pluginsGetConfig.event_limit,
                    event_segmentation_limit: pluginsGetConfig.event_segmentation_limit,
                    event_segmentation_value_limit: pluginsGetConfig.event_segmentation_value_limit,
                };

                var aggregation = [];
                aggregation.push({$match: {"app_id": params.qstring.app_id, "type": "e", "biglist": {"$ne": true}}});
                aggregation.push({"$project": {e: 1, _id: 0, "sg": 1}});
                //e does not start with [CLY]_
                aggregation.push({$match: {"e": {"$not": /^(\[CLY\]_)/}}});
                aggregation.push({"$sort": {"e": 1}});
                aggregation.push({"$limit": pluginsGetConfig.event_limit || 500});

                var drillRes = await common.drillDb.collection("drill_meta").aggregate(aggregation).toArray();
                for (var k = 0; k < drillRes.length; k++) {
                    if (result.list.indexOf(drillRes[k].e) === -1) {
                        result.list.push(drillRes[k].e);
                    }

                    if (drillRes[k].sg && Object.keys(drillRes[k].sg).length > 0) {
                        result.segments[drillRes[k].e] = result.segments[drillRes[k].e] || [];
                        for (var key in drillRes[k].sg) {
                            if (result.segments[drillRes[k].e].indexOf(key) === -1) {
                                result.segments[drillRes[k].e].push(key);
                            }
                        }
                    }
                    if (result.omitted_segments && result.omitted_segments[drillRes[k].e]) {
                        for (let kz = 0; kz < result.omitted_segments[drillRes[k].e].length; kz++) {
                            //remove items that are in omitted list
                            result.segments[drillRes[k].e].splice(result.segments[drillRes[k].e].indexOf(result.omitted_segments[drillRes[k].e][kz]), 1);
                        }
                    }
                    if (result.whitelisted_segments && result.whitelisted_segments[drillRes[k].e] && Array.isArray(result.whitelisted_segments[drillRes[k].e])) {
                        //remove all that are not whitelisted
                        for (let kz = 0; kz < result.segments[drillRes[k].e].length; kz++) {
                            if (result.whitelisted_segments[drillRes[k].e].indexOf(result.segments[drillRes[k].e][kz]) === -1) {
                                result.segments[drillRes[k].e].splice(kz, 1);
                                kz--;
                            }
                        }
                    }
                    //Sort segments
                    if (result.segments[drillRes[k].e]) {
                        result.segments[drillRes[k].e].sort();
                    }
                }
                if (result.list.length === 0) {
                    delete result.list;
                }
                if (Object.keys(result.segments).length === 0) {
                    delete result.segments;
                }
                common.returnOutput(params, result);

            }
            catch (ex) {
                console.error("Error fetching events", ex);
                common.returnMessage(params, 500, "Error fetching events");
            }
        }, 'events');
        break;
    case 'top_events':
        validateRead(params, 'core', countlyApi.data.fetch.fetchDataTopEvents);
        break;
    case 'all_apps':
        validateUserForGlobalAdmin(params, countlyApi.data.fetch.fetchAllApps);
        break;
    case 'notes':
        validateRead(params, 'core', countlyApi.mgmt.users.fetchNotes);
        break;
    default:
        if (!plugins.dispatch('/o', {
            params: params,
            validateUserForDataReadAPI: validateUserForDataReadAPI,
            validateUserForMgmtReadAPI: validateUserForMgmtReadAPI,
            validateUserForDataWriteAPI: validateUserForDataWriteAPI,
            validateUserForGlobalAdmin: validateUserForGlobalAdmin
        })) {
            common.returnMessage(params, 400, 'Invalid method');
        }
        break;
    }
});

module.exports = router;
