/**
 * @module QueryHelpers
 * @description Generic ClickHouse query helper utilities.
 * This module provides common utilities for ClickHouse query building.
 *
 * IMPORTANT USAGE NOTES:
 * =======================
 *
 * ClickHouse Aggregate Function State/Merge Pattern:
 * --------------------------------------------------
 * When using approximate unique counting with precision parameters (e.g., uniqCombined64(20)),
 * the precision MUST match across State and Merge operations:
 *
 * 1. CREATE STATE: Use uniqCombined64State(20) to create aggregation states
 * 2. MERGE STATES: Use uniqCombined64Merge(20) to merge states - precision must match!
 *
 * State Type Example:
 *   uniqCombined64State(20)(uid) → produces AggregateFunction(uniqCombined64(20), String)
 *   This state can ONLY be merged with uniqCombined64Merge(20), not uniqCombined64Merge
 *
 * Method Selection Guide:
 * -----------------------
 *
 * A. For Direct SQL Expressions (returning function calls):
 *    - getUniqFunction(approximate)        → Returns: 'uniqCombined64(20)' or 'uniqExact'
 *    - getUniqStateFunction(approximate)   → Returns: 'uniqCombined64State(20)' or 'uniqExactState'
 *    - getUniqMergeFunction(approximate)   → Returns: 'uniqCombined64Merge(20)' or 'uniqExactMerge'
 *
 *    Usage: const fn = getUniqMergeFunction(true);
 *           const sql = `SELECT ${fn}(state_col) FROM ...`;
 *           // Produces: SELECT uniqCombined64Merge(20)(state_col) FROM ...
 *
 * B. For arrayReduce String Contexts (returning function names as strings):
 *    - getUniqMergeFunctionName(approximate) → Returns: 'uniqCombined64Merge(20)' or 'uniqExactMerge'
 *    - getUniqStateFunctionName(approximate) → Returns: 'uniqCombined64State(20)' or 'uniqExactState'
 *
 *    Usage: const mergeFn = getUniqMergeFunctionName(true);
 *           const sql = `SELECT arrayReduce('${mergeFn}', groupArray(state_col)) ...`;
 *           // Produces: SELECT arrayReduce('uniqCombined64Merge(20)', groupArray(state_col)) ...
 *
 * C. For Convenience (returns complete expressions):
 *    - uniqMergeArrayReduce(stateCol, approximate)  → Complete arrayReduce expression
 *
 *    Usage: const expr = uniqMergeArrayReduce('u_state', true);
 *           const sql = `SELECT ${expr} OVER (ORDER BY day ...) AS weekly`;
 *           // Produces: SELECT arrayReduce('uniqCombined64Merge(20)', groupArray(u_state)) OVER ...
 *
 * Common Patterns:
 * ----------------
 *
 * Pattern 1: Rolling Window Aggregation (DAU → WAU/MAU)
 *   ```sql
 *   WITH daily AS (
 *     SELECT
 *       toDate(ts) AS day,
 *       uniqCombined64State(20)(pid_final) AS u_state
 *     FROM events
 *     GROUP BY day
 *   )
 *   SELECT
 *     day,
 *     finalizeAggregation(u_state) AS dau,
 *     arrayReduce('uniqCombined64Merge(20)', groupArray(u_state) OVER (
 *       ORDER BY toUInt32(day) RANGE BETWEEN 6 PRECEDING AND CURRENT ROW
 *     )) AS wau,
 *     arrayReduce('uniqCombined64Merge(20)', groupArray(u_state) OVER (
 *       ORDER BY toUInt32(day) RANGE BETWEEN 29 PRECEDING AND CURRENT ROW
 *     )) AS mau
 *   FROM daily
 *   ```
 *
 * Pattern 2: Using Helper Methods (Recommended)
 *   ```javascript
 *   const QueryHelpers = require('./QueryHelpers');
 *
 *   const mergeFn = QueryHelpers.getUniqMergeFunctionName(true);
 *   const sql = `
 *     SELECT
 *       day,
 *       arrayReduce('${mergeFn}', groupArray(u_state) OVER (...)) AS wau
 *     FROM daily
 *   `;
 *
 *   // Or use the convenience method:
 *   const sql2 = `
 *     SELECT
 *       day,
 *       ${QueryHelpers.uniqMergeArrayReduce('u_state', true)} OVER (...) AS wau
 *     FROM daily
 *   `;
 *   ```
 */
const common = require('../../../api/utils/common.js');
const countlyConfig = require('../../../api/config');
const log = common.log('clickhouse:query-helpers');
const Identity = require('./users/Identity.js');
const ClusterManager = require('./managers/ClusterManager');
const TABLES = require('./tables');

/**
 * Class for ClickHouse query helper utilities.
 */
class QueryHelpers {

    /**
     * Get the appropriate unique count function based on configuration
     * @param {boolean} useApproximateUniq - whether to use approximate or exact counting
     * @returns {string} - ClickHouse unique count function name
     */
    static getUniqFunction(useApproximateUniq = true) {
        const func = useApproximateUniq ? 'uniqCombined64(20)' : 'uniqExact';
        log.d(`Selected unique function: ${func}, approximate: ${useApproximateUniq}`);
        return func;
    }

    /**
     * Return the STATE-building unique function (produces an aggregate state).
     * Use this when you will merge across time windows (DAU→WAU/MAU) or need to carry a state.
     *
     * @param {boolean} [useApproximateUniq=true] - If true, use approximate uniq state.
     * @returns {string} ClickHouse function token, e.g. 'uniqCombined64State(20)' or 'uniqExactState'
     */
    static getUniqStateFunction(useApproximateUniq = true) {
        const func = useApproximateUniq ? 'uniqCombined64State(20)' : 'uniqExactState';
        log.d(`Selected unique STATE function: ${func}, approximate: ${useApproximateUniq}`);
        return func;
    }

    /**
     * Return the MERGE function that consumes states and produces a final number.
     * Use this to combine multiple states (e.g., rolling 7/30 day windows).
     *
     * @param {boolean} [useApproximateUniq=true] - If true, use approximate merge.
     * @returns {string} ClickHouse function token, e.g. 'uniqCombined64Merge(20)' or 'uniqExactMerge'
     */
    static getUniqMergeFunction(useApproximateUniq = true) {
        const func = useApproximateUniq ? 'uniqCombined64Merge(20)' : 'uniqExactMerge';
        log.d(`Selected unique MERGE function: ${func}, approximate: ${useApproximateUniq}`);
        return func;
    }

    /**
     * Build a DISTINCT users expression using pid_final (one-shot; not a state).
     * Example usage in SELECT: `${QueryHelpers.uniqPidFinal(true, 'uid')} AS u`
     *
     * IMPORTANT: This method wraps the expression in an aggregate function (uniqCombined64/uniqExact).
     * Aggregate function arguments are evaluated PER-ROW and must NOT contain nested aggregates.
     * Therefore, this method ALWAYS uses forGroupBy=true internally to avoid any() wrapper.
     *
     * @param {boolean} [useApproximate=true] - Approximate vs exact.
     * @param {string} [uidColumn='uid'] - UID column/expression.
     * @returns {string} e.g. "uniqCombined64(20)(coalesce(...))"
     */
    static uniqPidFinal(useApproximate = true, uidColumn = 'uid') {
        const fn = QueryHelpers.getUniqFunction(useApproximate);
        // ALWAYS use forGroupBy=true because aggregate arguments must not contain nested aggregates
        return `${fn}(${Identity.getFinalExpression(uidColumn, true)})`;
    }

    /**
     * Build a UNIQUE STATE expression using pid_final (state; to be merged later).
     * Example: daily rollup: `${QueryHelpers.uniqStatePidFinal(true, 'uid')} AS u_state`
     *
     * IMPORTANT: This method wraps the expression in an aggregate function (uniqCombined64State/uniqExactState).
     * Aggregate function arguments are evaluated PER-ROW and must NOT contain nested aggregates.
     * Therefore, this method ALWAYS uses forGroupBy=true internally to avoid any() wrapper.
     *
     * @param {boolean} [useApproximate=true] - Approximate vs exact state.
     * @param {string} [uidColumn='uid'] - UID column/expression.
     * @returns {string} e.g. "uniqCombined64State(20)(coalesce(...))"
     */
    static uniqStatePidFinal(useApproximate = true, uidColumn = 'uid') {
        const fn = QueryHelpers.getUniqStateFunction(useApproximate);
        // ALWAYS use forGroupBy=true because aggregate arguments must not contain nested aggregates
        return `${fn}(${Identity.getFinalExpression(uidColumn, true)})`;
    }

    /**
     * Merge previously built uniq states (from *_State) into a final number.
     * Use this inside a window frame or to combine multiple rows of states.
     *
     * @param {string} stateColumn - Column/expression holding the uniq state (e.g., 'u_state').
     * @param {boolean} [useApproximate=true] - Approximate vs exact merge.
     * @returns {string} e.g. "uniqCombined64Merge(20)(u_state)"
     */
    static uniqMergeFromState(stateColumn, useApproximate = true) {
        if (!stateColumn || typeof stateColumn !== 'string') {
            throw new Error('uniqMergeFromState requires a state column/expression string');
        }
        const fn = QueryHelpers.getUniqMergeFunction(useApproximate);
        return `${fn}(${stateColumn})`;
    }

    /**
     * Get the merge function NAME (as string) for use in arrayReduce contexts.
     * IMPORTANT: Use this when you need the function name as a string literal in arrayReduce.
     * The precision parameter MUST match the precision used when creating the state.
     *
     * Example usage:
     *   const mergeFn = QueryHelpers.getUniqMergeFunctionName(true);
     *   const sql = `SELECT arrayReduce('${mergeFn}', groupArray(u_state) OVER (...)) AS merged`;
     *
     * @param {boolean} [useApproximateUniq=true] - If true, use approximate (must match state creation).
     * @returns {string} Function name like 'uniqCombined64Merge(20)' or 'uniqExactMerge'
     */
    static getUniqMergeFunctionName(useApproximateUniq = true) {
        const func = useApproximateUniq ? 'uniqCombined64Merge(20)' : 'uniqExactMerge';
        log.d(`Selected unique MERGE function name for arrayReduce: ${func}, approximate: ${useApproximateUniq}`);
        return func;
    }

    /**
     * Get the state function NAME (as string) for use in arrayReduce contexts.
     * IMPORTANT: Use this when you need the function name as a string literal in arrayReduce.
     *
     * Example usage:
     *   const stateFn = QueryHelpers.getUniqStateFunctionName(true);
     *   const sql = `SELECT arrayReduce('${stateFn}', groupArray(uid)) AS state`;
     *
     * @param {boolean} [useApproximateUniq=true] - If true, use approximate state.
     * @returns {string} Function name like 'uniqCombined64State(20)' or 'uniqExactState'
     */
    static getUniqStateFunctionName(useApproximateUniq = true) {
        const func = useApproximateUniq ? 'uniqCombined64State(20)' : 'uniqExactState';
        log.d(`Selected unique STATE function name for arrayReduce: ${func}, approximate: ${useApproximateUniq}`);
        return func;
    }

    /**
     * Build an arrayReduce expression for merging uniq states in window frames or groupArray contexts.
     * This is a convenience method that ensures the correct function name with precision is used.
     *
     * @example
     *   const sql = `
     *     SELECT
     *       day,
     *       ${QueryHelpers.uniqMergeArrayReduce('u_state', true)} OVER (
     *         ORDER BY day RANGE BETWEEN 6 PRECEDING AND CURRENT ROW
     *       ) AS w
     *     FROM ...
     *   `;
     *
     * @param {string} stateColumn - Column/expression holding the state (e.g., 'u_state').
     * @param {boolean} [useApproximate=true] - Approximate vs exact (must match state creation).
     * @param {string} [groupArrayExpr] - Optional: if provided, wraps stateColumn in groupArray.
     *                                     e.g., 'groupArray(u_state)' or leave undefined if already wrapped.
     * @returns {string} Complete arrayReduce expression
     */
    static uniqMergeArrayReduce(stateColumn, useApproximate = true, groupArrayExpr = undefined) {
        if (!stateColumn || typeof stateColumn !== 'string') {
            throw new Error('uniqMergeArrayReduce requires a state column/expression string');
        }
        const mergeFn = QueryHelpers.getUniqMergeFunctionName(useApproximate);
        const arrayExpr = groupArrayExpr || `groupArray(${stateColumn})`;
        return `arrayReduce('${mergeFn}', ${arrayExpr})`;
    }

    /**
     * Create a WITH clause to expose pid_final alias for reuse in SELECT/GROUP BY/WINDOWs.
     * Example:
     *   const withPid = QueryHelpers.withPidFinal('uid');
     *   const sql = `${withPid} SELECT ${QueryHelpers.getUniqFunction(true)}(pid_final) AS u FROM ... GROUP BY pid_final`;
     *
     * @param {string} [uidColumn='uid'] - UID column/expression.
     * @param {string} [alias='pid_final'] - Alias to expose.
     * @param {boolean} [forGroupBy=false] - If true, returns GROUP BY-safe expression (no any())
     * @returns {string} e.g. "WITH coalesce(...) AS pid_final"
     */
    static withPidFinal(uidColumn = 'uid', alias = 'pid_final', forGroupBy = false) {
        return `WITH ${Identity.getFinalExpression(uidColumn, forGroupBy)} AS ${alias}`;
    }

    /**
     * Return the raw pid_final expression (no alias).
     * Use when inlining inside PARTITION BY / GROUP BY / uniq* / conditions.
     *
     * @param {string} [uidColumn='uid'] - UID column/expression.
     * @param {boolean} [forGroupBy=false] - If true, returns GROUP BY-safe expression (no any())
     * @returns {string} coalesce(...) expression
     */
    static pidFinalExpr(uidColumn = 'uid', forGroupBy = false) {
        return Identity.getFinalExpression(uidColumn, forGroupBy);
    }

    /**
     * Return a SELECT-friendly clause that aliases pid_final.
     * Use when you need `..., <expr> AS pid_final, ...` in a column list.
     *
     * @param {string} [uidColumn='uid'] - UID column/expression.
     * @param {string} [alias='pid_final'] - Alias name.
     * @param {boolean} [forGroupBy=false] - If true, returns GROUP BY-safe expression (no any())
     * @returns {string} e.g. "<expr> AS pid_final"
     */
    static pidFinalSelect(uidColumn = 'uid', alias = 'pid_final', forGroupBy = false) {
        return Identity.getFinalSelect(uidColumn, alias, forGroupBy);
    }

    /**
     * Build a WHERE predicate that expands a uid (or array of uids) to the full identity cluster.
     * CRITICAL: This must be app-scoped to prevent cross-app data leakage.
     *
     * @param {string} appIdParamToken - ClickHouse param token for app value (e.g. '{p0:String}' or '{app_id:String}')
     * @param {string} uidParamToken - ClickHouse param token for uid(s) (e.g. '{uid:String}' or '{uids:Array(String)}')
     * @param {string} [uidColumn='uid'] - Column name containing the uid in the table
     * @param {boolean} [isArray=false] - Whether uidParamToken represents an array of uids
     * @param {boolean} [skipAppFilter=false] - If true, skip the app filter (use when app filter already exists in WHERE clause)
     * @returns {string} WHERE predicate SQL fragment
     *
     * @example Single UID
     *   WHERE ${QueryHelpers.pidClusterPredicate('{app_id:String}', '{uid:String}')}
     *   // With query_params: { app_id: appID, uid: userId }
     *
     * @example Multiple UIDs
     *   WHERE ${QueryHelpers.pidClusterPredicate('{app_id:String}', '{uids:Array(String)}', 'uid', true)}
     *   // With query_params: { app_id: appID, uids: [uid1, uid2, uid3] }
     *
     * @example With existing app filter (from WhereClauseConverter)
     *   WHERE a = {p0:String} AND ${QueryHelpers.pidClusterPredicate('{p0:String}', '{uid:String}', 'uid', false, true)}
     *   // With query_params: { p0: appID, uid: userId }
     *
     * It compares each row's pid_final against the canonical anchor(s) of the input param(s).
     * Always filters by app first for security (unless skipAppFilter=true).
     *
     * Note: All Countly ClickHouse tables use 'a' column for app identifier.
     */
    static pidClusterPredicate(appIdParamToken, uidParamToken, uidColumn = 'uid', isArray = false, skipAppFilter = false) {
        if (!appIdParamToken || typeof appIdParamToken !== 'string') {
            throw new Error('pidClusterPredicate requires an app_id param token, e.g. {app_id:String}');
        }
        if (!uidParamToken || typeof uidParamToken !== 'string') {
            throw new Error('pidClusterPredicate requires a uid param token, e.g. {uid:String}');
        }

        // CRITICAL: Always filter by app first (security boundary) unless already filtered
        // All Countly ClickHouse tables use 'a' column for app identifier
        const appFilter = skipAppFilter ? '' : `a = ${appIdParamToken} AND `;

        // Left side: per-row pid_final resolution
        // IMPORTANT: Use forGroupBy=true because WHERE clauses cannot contain aggregate functions
        // (WHERE is evaluated before GROUP BY, so any() would be invalid)
        const left = Identity.getFinalExpression(uidColumn, true);

        if (!isArray) {
            // Right side: resolve the single uid param to its canonical anchor
            // Use app_id parameter explicitly for dictionary lookup (not row's 'a' column)
            const anchor = `coalesce(
                nullIf(
                    dictGetOrDefault(
                        'identity.uid_map_dict',
                        'canon',
                        (${appIdParamToken}, ${uidParamToken}),
                        ''
                    ),
                    ''
                ),
                ${uidParamToken}
            )`;
            // The comparison works as follows:
            // 1. If both sides have dictionary mappings, compare canonical values
            // 2. If one or both sides lack mappings, both fall back to their uid values via coalesce
            // 3. This ensures rows match when either canonical values match OR raw uids match (via fallback)
            const predicate = `${appFilter}${left} = ${anchor}`;
            return skipAppFilter ? predicate : `(${predicate})`;
        }

        // Right side: resolve array of uids to their canonical anchors
        // Note: Parameters CAN be used in arrayMap lambdas (tested and verified)
        // The appIdParamToken is used here to ensure app-scoping in the dictionary lookup
        const anchors =
            `arrayDistinct(arrayMap(x -> coalesce(nullIf(dictGetOrDefault('identity.uid_map_dict', 'canon', (${appIdParamToken}, x), ''), ''), x), ${uidParamToken}))`;

        // IMPORTANT: Use has(array, element) instead of element IN array
        // ClickHouse IN operator requires right side to be constant or table expression
        // has() function works with dynamic arrays from function results
        const predicate = `${appFilter}has(${anchors}, ${left})`;
        return skipAppFilter ? predicate : `(${predicate})`;
    }

    // ========================================
    // Table Name Resolution
    // ========================================

    /**
     * Unified table name resolution for all ClickHouse operations.
     *
     * Registered tables: drill_events, drill_snapshots, uid_map
     *
     * @param {string} table - Table name from registry: 'drill_events' | 'drill_snapshots' | 'uid_map'
     * @param {Object} [options={}] - Resolution options
     * @param {boolean} [options.forInsert=false] - Use cluster-aware insert logic (respects writeThrough config)
     * @param {boolean} [options.forMutation=false] - Always use _local suffix in cluster mode (for ALTER/DELETE)
     * @param {boolean} [options.includeDb=true] - Include database prefix in result
     * @returns {string} Resolved table name (e.g., 'countly_drill.drill_events')
     * @throws {Error} If table is not in the registry
     *
     * @example SELECT queries (default)
     *   const sql = `SELECT * FROM ${QueryHelpers.resolveTable('drill_events')} WHERE ...`;
     *   // Returns: SELECT * FROM countly_drill.drill_events WHERE ...
     *
     * @example INSERT operations (respects writeThrough config)
     *   const sql = `INSERT INTO ${QueryHelpers.resolveTable('drill_events', { forInsert: true })} VALUES ...`;
     *   // In single-node: INSERT INTO countly_drill.drill_events VALUES ...
     *   // In cluster with writeThrough=true: INSERT INTO countly_drill.drill_events VALUES ...
     *   // In cluster with writeThrough=false: INSERT INTO countly_drill.drill_events_local VALUES ...
     *
     * @example MUTATION operations (always _local in cluster mode)
     *   const sql = `ALTER TABLE ${QueryHelpers.resolveTable('drill_events', { forMutation: true })} UPDATE ...`;
     *   // In single-node: ALTER TABLE countly_drill.drill_events UPDATE ...
     *   // In cluster mode: ALTER TABLE countly_drill.drill_events_local UPDATE ...
     *
     * @example Without database prefix
     *   const tableName = QueryHelpers.resolveTable('drill_events', { includeDb: false });
     *   // Returns: 'drill_events'
     *
     * @example Identity table
     *   const sql = `SELECT * FROM ${QueryHelpers.resolveTable('uid_map')} WHERE ...`;
     *   // Returns: SELECT * FROM identity.uid_map WHERE ...
     */
    static resolveTable(table, options = {}) {
        const {
            forInsert = false,
            forMutation = false,
            includeDb = true
        } = options;

        // Validate table is registered
        const tableConfig = TABLES[table];
        if (!tableConfig) {
            const registered = Object.keys(TABLES).join(', ');
            throw new Error(`Unknown table '${table}'. Registered tables: ${registered}`);
        }

        // Get database name - use config override for countly_drill tables
        let db = tableConfig.db;
        if (db === 'countly_drill') {
            db = countlyConfig.clickhouse?.database || 'countly_drill';
        }

        // Determine table name based on operation type
        let resolvedTable = table;
        const cm = new ClusterManager(countlyConfig.clickhouse || {});

        if (forMutation) {
            // MUTATION operations (ALTER TABLE, DELETE) always target local table in cluster mode
            if (cm.isClusterMode() && !cm.isCloudMode()) {
                resolvedTable = `${table}_local`;
            }
        }
        else if (forInsert) {
            // INSERT operations respect writeThrough configuration
            resolvedTable = cm.getInsertTable(table);
        }
        // Default: SELECT queries use base table (distributed table handles routing)

        return includeDb ? `${db}.${resolvedTable}` : resolvedTable;
    }

}

module.exports = QueryHelpers;