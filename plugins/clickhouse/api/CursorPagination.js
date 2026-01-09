const common = require("../../../api/utils/common");
const QueryHelpers = require('./QueryHelpers');
const log = common.log('clickhouse:cursor-pagination');

/**
 * Enhanced cursor-based pagination utilities for ClickHouse
 * Supports snapshot, live, and hybrid pagination modes for real-time data consistency
 */
class CursorPagination {
    /**
     * Formats date for ClickHouse DateTime64(3) parameter
     * @param {Date} date - Date object to format
     * @returns {string} ClickHouse compatible date string
     */
    static formatDateForClickHouse(date) {
        // Format: YYYY-MM-DD HH:MM:SS.mmm (without timezone suffix)
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        const milliseconds = String(date.getMilliseconds()).padStart(3, '0');

        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
    }

    /**
     * Pagination modes for handling real-time data
     */
    static MODES = {
        SNAPSHOT: 'snapshot', // Consistent view with timestamp boundary
        LIVE: 'live' // Real-time view, may see data drift
    };

    /**
     * Encodes cursor data to Base64 string
     * @param {Object} cursorData - Cursor data object
     * @param {string} cursorData.ts - Timestamp from primary key
     * @param {string} [cursorData._id] - ID for stable sorting when primary key has duplicates 
     * @param {string} [cursorData.mode] - Pagination mode
     * @param {number} [cursorData.snapshotTs] - Snapshot timestamp boundary
     * @returns {string|null} Base64 encoded cursor or null
     */
    static encodeCursor(cursorData) {
        if (!cursorData || Object.keys(cursorData).length === 0) {
            return null;
        }
        return Buffer.from(JSON.stringify(cursorData)).toString('base64');
    }

    /**
     * Decodes Base64 cursor string to object
     * @param {string} cursor - Base64 encoded cursor
     * @returns {Object|null} Decoded cursor data or null
     */
    static decodeCursor(cursor) {
        if (!cursor) {
            return null;
        }
        try {
            return JSON.parse(Buffer.from(cursor, 'base64').toString());
        }
        catch (error) {
            log.w('Failed to decode cursor', { cursor, error: error.message });
            return null;
        }
    }

    /**
     * Converts timestamp to ClickHouse-compatible format
     * @param {string|Date} timestamp - Timestamp to format
     * @returns {string} ClickHouse-compatible timestamp string
     */
    static formatTimestampForClickHouse(timestamp) {
        if (!timestamp) {
            return null;
        }

        // If it's already in the correct format (YYYY-MM-DD HH:MM:SS.mmm), return as-is
        if (typeof timestamp === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}$/.test(timestamp)) {
            return timestamp;
        }

        let date;
        if (timestamp instanceof Date) {
            date = timestamp;
        }
        else if (typeof timestamp === 'string') {
            // Handle ISO strings with Z suffix
            date = new Date(timestamp);
        }
        else {
            return null;
        }

        if (isNaN(date.getTime())) {
            return null;
        }

        // Format as 'YYYY-MM-DD HH:MM:SS.mmm' for ClickHouse DateTime64(3)
        return date.toISOString()
            .replace('T', ' ')
            .replace('Z', '')
            .substring(0, 23); // Keep milliseconds precision
    }

    /**
     * Builds WHERE clause for cursor-based pagination optimized for primary key (ts, _id)
     * @param {Object} cursorData - Cursor data object
     * @param {string} sortDirection - Sort direction 'ASC' or 'DESC'
     * @param {string} [mode] - Pagination mode (snapshot, live)
     * @returns {Object} SQL and parameters for WHERE clause
     */
    static buildCursorWhere(cursorData, sortDirection = 'DESC', mode = this.MODES.LIVE) {
        if (!cursorData || (!cursorData.ts && !cursorData._id)) {
            return { sql: '', params: {} };
        }

        const isDesc = sortDirection.toUpperCase() === 'DESC';
        const op = isDesc ? '<' : '>';
        const eqOp = '=';

        let conditions = [];
        const params = {};

        // Build compound cursor conditions based on primary key (ts, _id)
        // This matches the ORDER BY ts DESC, _id DESC used in the query
        if (cursorData.ts) {
            conditions.push(`(ts ${op} toDateTime64({cursor_ts:String}, 3))`);
            params.cursor_ts = this.formatTimestampForClickHouse(cursorData.ts);

            // Add _id as tiebreaker for exact same timestamp
            if (cursorData._id) {
                conditions.push(`(ts ${eqOp} toDateTime64({cursor_ts:String}, 3) AND _id ${op} {cursor_id:String})`);
                params.cursor_id = cursorData._id;
            }
        }
        else if (cursorData._id) {
            // Fallback to _id only if timestamp is not available
            conditions.push(`(_id ${op} {cursor_id:String})`);
            params.cursor_id = cursorData._id;
        }

        let sql = '';
        if (conditions.length > 0) {
            sql = ` AND (${conditions.join(' OR ')})`;
        }

        // Add snapshot boundary for consistent view across pages
        if (mode === this.MODES.SNAPSHOT && cursorData.snapshotTs) {
            sql += ` AND ts <= toDateTime64({snapshot_ts:String}, 3)`;
            params.snapshot_ts = this.formatTimestampForClickHouse(cursorData.snapshotTs);
        }

        return { sql, params };
    }

    /**
     * Extracts cursor data from the last row of results using primary key fields
     * @param {Array} data - Array of result rows
     * @param {string} [mode] - Pagination mode
     * @param {number} [snapshotTs] - Snapshot timestamp for consistent pagination
     * @returns {Object|null} Cursor data object or null
     */
    static extractCursorFromRow(data, mode = this.MODES.LIVE, snapshotTs = null) {
        if (!data || data.length === 0) {
            return null;
        }

        const lastRow = data[data.length - 1];
        const cursor = {
            mode: mode
        };

        // Extract primary key fields (ts, _id) for cursor-based pagination
        if (lastRow.ts) {
            cursor.ts = lastRow.ts; // Keep as DateTime64 string from ClickHouse
        }

        // Add _id as tiebreaker for stable pagination
        if (lastRow._id) {
            cursor._id = lastRow._id;
        }

        // Add snapshot timestamp for consistent pagination across pages
        if (mode === this.MODES.SNAPSHOT) {
            cursor.snapshotTs = snapshotTs || this.formatTimestampForClickHouse(new Date());
        }

        return cursor;
    }

    /**
     * Gets count using QueryHelpers 
     * @param {Object} clickhouseService - ClickHouse service instance
     * @param {string} whereSQL - WHERE clause SQL
     * @param {Object} queryParams - Query parameters
     * @param {boolean} [useApproximateUniq] - Whether to use approximate counting
     * @param {string} field - Field to count
     * @returns {Promise<Object>} Count result with total and isApproximate
     */
    static async getCount(clickhouseService, whereSQL, queryParams, useApproximateUniq = true, field = '') {
        const uniqFunction = QueryHelpers.getUniqFunction(useApproximateUniq);
        const isApproximate = uniqFunction.startsWith('uniqCombined');

        //SELECT ${uniqFunction}(1) as total
        //TODO: use uniqFunction when we have a better way to get the count ex: uniqExact(uid)
        var functionField = "count()";
        if (field) {
            functionField = `${uniqFunction}(` + field + `)`;
        }
        const countQuery = `
            SELECT ${functionField} as total
            FROM ${QueryHelpers.resolveTable('drill_events')}
            ${whereSQL}
        `;

        const countData = await clickhouseService.query({
            query: countQuery.trim(),
            params: queryParams
        });

        return {
            count: countData[0]?.total || 0,
            total: countData[0]?.total || 0,
            isApproximate: isApproximate
        };
    }

    /**
     * Builds pagination response with cursor information and mode support
     * @param {Array} data - Query result data
     * @param {number} limit - Page size limit
     * @param {Object} countResult - Count result with total and isApproximate
     * @param {string} [mode] - Pagination mode
     * @param {number} [snapshotTs] - Snapshot timestamp for consistent pagination
     * @returns {Object} Pagination response object
     */
    static buildPaginationResponse(data, limit, countResult, mode = this.MODES.LIVE, snapshotTs = null) {
        const hasMore = data.length > limit;
        const resultData = hasMore ? data.slice(0, limit) : data;

        let nextCursor = null;
        if (hasMore && resultData.length > 0) {
            const cursorData = this.extractCursorFromRow(resultData, mode, snapshotTs);
            nextCursor = this.encodeCursor(cursorData);
        }

        return {
            data: resultData,
            total: countResult.total,
            isApproximate: countResult.isApproximate,
            hasNextPage: hasMore,
            nextCursor: nextCursor,
            paginationMode: mode
        };
    }

    /**
     * Determines optimal pagination mode based on query parameters
     * @param {Object} params - Query parameters
     * @returns {string} Recommended pagination mode
     */
    static determinePaginationMode(params) {
        // Force mode if explicitly specified
        if (params.paginationMode && Object.values(this.MODES).includes(params.paginationMode)) {
            return params.paginationMode;
        }

        // Default to snapshot mode for better consistency
        // Can be overridden by configuration
        return this.MODES.SNAPSHOT;
    }

    /**
     * Applies cursor pagination to a query with proper WHERE clause generation
     * @param {string} baseQuery - Base SQL query without cursor constraints
     * @param {Object} params - Query parameters including cursor
     * @param {Object} baseParams - Base query parameters
     * @param {string} [sortDirection] - Sort direction for cursor
     * @returns {Object} Enhanced query with cursor constraints and parameters
     */
    static applyCursorToQuery(baseQuery, params, baseParams, sortDirection = 'DESC') {
        const paginationMode = this.determinePaginationMode(params);
        const snapshotTs = paginationMode === this.MODES.SNAPSHOT ? this.formatTimestampForClickHouse(new Date()) : null;

        let enhancedQuery = baseQuery;
        let enhancedParams = { ...baseParams };

        // Handle cursor-based pagination
        if (params.cursor) {
            const cursorData = this.decodeCursor(params.cursor);
            if (cursorData) {
                const cursorWhere = this.buildCursorWhere(cursorData, sortDirection, paginationMode);

                // Find WHERE clause in the query and append cursor conditions
                if (cursorWhere.sql) {
                    enhancedQuery = enhancedQuery.replace(/WHERE\s+(.+?)(?=\s+ORDER\s+BY|\s+GROUP\s+BY|\s+LIMIT|$)/i,
                        (match, whereClause) => `WHERE ${whereClause}${cursorWhere.sql}`);
                    Object.assign(enhancedParams, cursorWhere.params);
                }
            }
        }

        return {
            query: enhancedQuery,
            params: enhancedParams,
            paginationMode,
            snapshotTs
        };
    }

    /**
     * Complete pagination workflow for ClickHouse queries
     * @param {Object} clickhouseService - ClickHouse service instance
     * @param {string} selectQuery - Main SELECT query
     * @param {string} countQuery - COUNT query for total
     * @param {Object} params - Query parameters
     * @param {Object} baseParams - Base query parameters
     * @returns {Promise<Object>} Complete pagination result
     */
    static async executePaginatedQuery(clickhouseService, selectQuery, countQuery, params, baseParams) {
        const limit = params.limit || 20;

        // Apply cursor to queries
        const { query: enhancedSelectQuery, params: selectParams, paginationMode, snapshotTs } =
            this.applyCursorToQuery(selectQuery, params, baseParams);

        // Add LIMIT to main query (fetch one extra to detect next page)
        const finalSelectQuery = enhancedSelectQuery + ` LIMIT ${limit + 1}`;

        // Execute queries in parallel
        const [data, countResult] = await Promise.all([
            clickhouseService.query({
                query: finalSelectQuery.trim(),
                params: selectParams
            }),
            this.getCount(clickhouseService,
                countQuery.match(/WHERE\s+(.+?)(?=\s+ORDER\s+BY|\s+GROUP\s+BY|\s+LIMIT|$)/i)?.[0] || 'WHERE 1=1',
                baseParams,
                params.useApproximateUniq)
        ]);


        // Build pagination response
        return this.buildPaginationResponse(data, limit, countResult, paginationMode, snapshotTs);
    }
}

module.exports = CursorPagination;