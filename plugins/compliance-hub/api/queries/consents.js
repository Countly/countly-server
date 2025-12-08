const common = require('../../../../api/utils/common');
const countlyCommon = require('../../../../api/lib/countly.common.js');
const log = common.log('compliance-hub:queries');
const moment = require('moment-timezone');
const utils = require('../utils/compliance-hub.utils');
let clickHouseRunner;
try {
    clickHouseRunner = require('../../../clickhouse/api/queries/clickhouseCoreQueries.js');
}
catch (e) {
    log.d('ClickHouse plugin not found, ClickHouse queries will be unavailable');
}

/**
 * Maps field names(formerly consent_history) to drill_event column names
 * @param {Object} query - Original query object
 * @returns {Object} Transformed query object
 */
function mapConsentFieldsForDrillEvents(query) {
    if (!query || typeof query !== 'object') {
        return query;
    }

    // name mapping from consent_history fields to drill_events fields
    const fieldMap = {
        'device_id': 'did',
        'type': 'sg._type'
    };

    /**
     * Recursively maps fields in the query object
     * @param {Object} obj - The object to map fields for
     * @returns {Object} The object with mapped fields
     */
    const mapFields = (obj) => {
        if (Array.isArray(obj)) {
            return obj.map(mapFields);
        }
        if (obj && typeof obj === 'object') {
            const result = {};
            for (const [key, value] of Object.entries(obj)) {
                // Handle nested field mapping (e.g., change.attribution -> sg.attribution)
                let mappedKey;
                if (key.startsWith('type.')) {
                    mappedKey = 'sg._type.' + key.substring(5);
                }
                else if (key.startsWith('change.')) {
                    const base = key.substring(7);
                    const val = mapFields(value);
                    const valStr = (val === undefined || val === null) ? val : String(val);
                    result.$and = result.$and || [];
                    result.$and.push(
                        {['sg.' + base]: valStr},
                        {$expr: {$ne: ['$sg.' + base + '_bf', '$sg.' + base]}}
                    );
                }
                else {
                    mappedKey = fieldMap[key] || key;
                    result[mappedKey] = mapFields(value);
                }
            }
            return result;
        }
        return obj;
    };

    return mapFields(query);
}

/**
 * Sanitizes MongoDB query objects for ClickHouse by removing problematic nested field conditions.
 * 
 * @param {Object|Array} q - MongoDB query object
 * @returns {Object|Array} Sanitized query with problematic conditions removed
 * 
 * @example
 * // Removes problematic nested field condition
 * sanitizeClickhouseFilterQuery(
 *   { sg._type: 'i', sg._type.0: { $exists: false } }
 * );
 * // Returns: { sg._type: 'i' }
 */
function sanitizeClickhouseFilterQuery(q) {
    if (!q || typeof q !== 'object') {
        return q;
    }
    if (q['sg._type.0'] && q['sg._type.0'].$exists === false) {
        const out = {};
        for (const k in q) {
            if (Object.prototype.hasOwnProperty.call(q, k) && k !== 'sg._type.0') {
                out[k] = q[k];
            }
        }
        q = out;
    }
    return q;
}

/**
 * MongoDB handler for consent events list
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} QueryRunner result
 */
async function mongodbConsentsHandler(params) {
    const userQuery = mapConsentFieldsForDrillEvents(params.query || {});
    const essential = { a: params.appID, e: '[CLY]_consent' };
    if (params.sSearch && params.sSearch !== '') {
        try {
            essential.did = {"$regex": new RegExp(".*" + params.sSearch + ".*", 'i')};
        }
        catch (ex) {
            log.e('Skipping sSearch regex due to error', ex);
        }
    }
    if (params.period) {
        countlyCommon.getPeriodObj(params);
        essential.ts = countlyCommon.getTimestampRangeQuery(params, false);
    }

    let match = {...userQuery, ...essential};
    const projection = params.project || params.projection || {};
    const sort = params.sort || {};
    const limit = parseInt(params.limit) || 0;
    const skip = parseInt(params.skip) || 0;

    const collection = common.drillDb.collection('drill_events');
    let cursor = collection.find(match, projection);
    const total = await collection.count(match);
    const count = await cursor.count();

    if (Object.keys(sort).length) {
        cursor = cursor.sort(sort);
    }
    if (skip) {
        cursor = cursor.skip(skip);
    }
    if (limit) {
        cursor = cursor.limit(limit);
    }

    const items = await cursor.toArray();

    return {
        _queryMeta: { adapter: 'mongodb', query: { collection: 'drill_events', operation: 'find', match, projection, sort, skip, limit } },
        data: { total: total || 0, filteredTotal: count || 0, data: items || [] }
    };
}

/**
 * Transform consent rows from drill_events to consent_history for backward compatibility
 * @param {Array<Object>} rows - Raw rows array
 * @returns {Array<Object>} Transformed rows
 */
function transformConsentRows(rows) {
    if (!Array.isArray(rows)) {
        return [];
    }
    return rows.map((row) => {
        const out = { ...row };
        if (typeof out.ts_ms === 'number') {
            out.ts = out.ts_ms;
            delete out.ts_ms;
        }
        else if (typeof out.ts === 'number' && out.ts.toString().length <= 10) {
            out.ts *= 1000;
        }
        else if (typeof out.ts === 'string') {
            out.ts = moment.utc(out.ts).valueOf();
        }
        if (out.sg) {
            try {
                const seg = JSON.parse(JSON.stringify(out.sg));
                const segType = seg._type;
                delete seg._type;

                let change = utils.computeChange(seg);

                if (Object.keys(change).length) {
                    out.change = change;
                }
                if (segType) {
                    out.type = segType;
                }
            }
            catch (e) {
                log.e('Failed to parse sg field:', e);
            }
        }
        if (out.did) {
            out.device_id = out.did;
        }
        if (out.up) {
            Object.assign(out, out.up);
            delete out.up;
        }
        return out;
    });
}

/**
 * Transform consent data into Clickhouse pagination shape
 * @param {Object} data - Raw ClickHouse pagination object
 * @returns {Object} Transformed result
 */
function transformClickhouseConsents(data) {
    if (!data || !data.data) {
        return { total: 0, data: [] };
    }
    const transformed = transformConsentRows(data.data);
    return {
        total: data.total || 0,
        data: transformed,
        isApproximate: data.isApproximate,
        hasNextPage: data.hasNextPage,
        nextCursor: data.nextCursor,
        paginationMode: data.paginationMode
    };
}

/**
 * Transform consent data into Mongodb pagination shape
 * @param {Object} data - Raw MongoDB handler result
 * @returns {Object} Transformed result with totals
 */
function transformMongodbConsents(data) {
    if (!data || !data.data) {
        return { total: 0, filteredTotal: 0, data: [] };
    }
    return {
        total: data.total || 0,
        filteredTotal: data.filteredTotal || 0,
        data: transformConsentRows(data.data)
    };
}

/**
 * Fetch consents list with adapter selection
 * @param {Object} params - Query parameters
 * @param {Object} options - Query options (e.g., adapter override)
 * @returns {Promise<Object>} QueryRunner result
 */
async function fetchConsentsList(params, options = {}) {
    if (!common.queryRunner) {
        throw new Error('QueryRunner not initialized. Ensure API server is fully started.');
    }

    params._consentsHelpers = {
        mapConsentFieldsForDrillEvents,
        sanitizeClickhouseFilterQuery
    };

    const adapters = {
        mongodb: { handler: mongodbConsentsHandler, transform: async(d) => transformMongodbConsents(d) }
    };
    if (clickHouseRunner && clickHouseRunner.getComplianceHubConsents) {
        adapters.clickhouse = {
            handler: clickHouseRunner.getComplianceHubConsents,
            transform: async(d) => transformClickhouseConsents(d)
        };
    }

    const queryDef = {
        name: 'FETCH_COMPLIANCE_HUB_CONSENTS',
        adapters
    };
    return common.queryRunner.executeQuery(queryDef, params, options);
}

module.exports = {
    fetchConsentsList
};


