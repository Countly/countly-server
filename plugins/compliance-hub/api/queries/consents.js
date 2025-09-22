const CursorPagination = require('../../../clickhouse/api/CursorPagination');
const QueryHelpers = require('../../../clickhouse/api/QueryHelpers');
const WhereClauseConverter = require('../../../clickhouse/api/WhereClauseConverter');
const common = require('../../../../api/utils/common');
const countlyCommon = require('../../../../api/lib/countly.common.js');
const log = common.log('compliance-hub:queries');
const moment = require('moment-timezone');

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
        'type': 'sg._type',
        'change': 'sg'
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
                if (key.startsWith('change.')) {
                    mappedKey = 'sg.' + key.substring(7);
                }
                else if (key.startsWith('type.')) {
                    mappedKey = 'sg._type.' + key.substring(5);
                }
                else {
                    mappedKey = fieldMap[key] || key;
                }
                result[mappedKey] = mapFields(value);
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
        return out;
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
 * ClickHouse handler for consent events list
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} QueryRunner result
 */
async function clickhouseConsentsHandler(params) {
    if (!common.clickhouseQueryService) {
        throw new Error('ClickHouse query service not available. Ensure ClickHouse plugin is loaded.');
    }

    const essential = { a: params.appID, e: '[CLY]_consent' };
    let enhanced = {};

    if (params.period) {
        countlyCommon.getPeriodObj(params);
        essential.ts = countlyCommon.getTimestampRangeQuery(params, false);
    }

    let userQuery = mapConsentFieldsForDrillEvents(params.query || {});
    userQuery = sanitizeClickhouseFilterQuery(userQuery);
    if (Object.keys(userQuery).length && (userQuery.$and || userQuery.$or || userQuery.$nor)) {
        enhanced = { $and: [ essential, userQuery ] };
    }
    else if (Object.keys(userQuery).length) {
        enhanced = { ...userQuery, ...essential };
    }
    else {
        enhanced = essential;
    }

    if (params.sSearch && params.sSearch !== '') {
        const sCond = { sSearch: [{ field: 'did', value: params.sSearch }] };
        if (enhanced.$and && Array.isArray(enhanced.$and)) {
            enhanced.$and.push(sCond);
        }
        else {
            enhanced = { $and: [ enhanced, sCond ] };
        }
    }

    const converter = new WhereClauseConverter();
    const { sql: whereSQL, params: bindParams } = converter.queryObjToWhere(enhanced);
    const selectFields = [
        'did AS device_id',
        'uid',
        'sg._type AS type',
        'sg',
        'ts',
        'toUnixTimestamp64Milli(ts) AS ts_ms',
        '_id',
        'up'
    ];
    let query = `SELECT ${selectFields.join(', ')} FROM drill_events ${whereSQL}`.trim();

    const paginationMode = CursorPagination.determinePaginationMode(params);
    const snapshotTs = paginationMode === CursorPagination.MODES.SNAPSHOT ? CursorPagination.formatDateForClickHouse(new Date()) : null;
    let cursorWhere = { sql: '', params: {} };
    if (params.cursor) {
        const cursorData = CursorPagination.decodeCursor(params.cursor);
        cursorWhere = CursorPagination.buildCursorWhere(cursorData, 'ASC', paginationMode);
    }
    if (cursorWhere.sql) {
        query = `${query} ${cursorWhere.sql}`;
        Object.assign(bindParams, cursorWhere.params);
    }

    if (params.sort && Object.keys(params.sort)) {
        const allowed = new Set(['device_id', 'uid', 'type', 'ts', 'a', 'e', 'n']);
        const fieldMap = {
            'device_id': 'did',
            'uid': 'uid',
            'type': 'sg._type',
            'ts': 'ts',
            'a': 'a',
            'e': 'e',
            'n': 'n'
        };

        const clauses = [];
        for (const [field, direction] of Object.entries(params.sort)) {
            if (allowed.has(field)) {
                const mappedField = fieldMap[field] || field;
                clauses.push(`${mappedField} ${direction === 1 ? 'ASC' : 'DESC'}`);
            }
        }

        if (clauses.length) {
            const tsClause = clauses.find(clause => clause.startsWith('ts'));
            const otherClauses = clauses.filter(clause => !clause.startsWith('ts'));

            if (tsClause) {
                query += ` ORDER BY a, e, n, ${tsClause}`;
                if (otherClauses.length) {
                    query += `, ${otherClauses.join(', ')}`;
                }
            }
            else {
                query += ` ORDER BY a, e, n, ts, ${otherClauses.join(', ')}`;
            }
        }
        else {
            query += ' ORDER BY a, e, n, ts';
        }
    }
    else {
        query += ' ORDER BY a, e, n, ts';
    }

    const limit = parseInt(params.limit) || 20;
    query += ` LIMIT ${limit + 1}`;

    const rows = await common.clickhouseQueryService.query({ query, params: bindParams });
    const countResult = await CursorPagination.getCount(common.clickhouseQueryService, whereSQL, bindParams, params.useApproximateUniq);
    const pagination = CursorPagination.buildPaginationResponse(rows, limit, countResult, paginationMode, snapshotTs);

    return {
        _queryMeta: {
            adapter: 'clickhouse',
            query: {
                sql: query,
                params: bindParams,
                countFunction: QueryHelpers.getUniqFunction(params.useApproximateUniq)
            }
        },
        data: pagination
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
                const type = seg._type;
                delete seg._type;
                out.change = seg;
                if (type) {
                    out.type = type;
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
    const queryDef = {
        name: 'FETCH_COMPLIANCE_HUB_CONSENTS',
        adapters: {
            mongodb: {
                handler: mongodbConsentsHandler,
                transform: async(data) => transformMongodbConsents(data)
            },
            clickhouse: {
                handler: clickhouseConsentsHandler,
                transform: async(data) => transformClickhouseConsents(data)
            }
        }
    };
    return common.queryRunner.executeQuery(queryDef, params, options);
}

module.exports = {
    fetchConsentsList
};


