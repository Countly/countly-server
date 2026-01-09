const log = require('../../../../api/utils/log.js')('clickhouse:materialized-view-manager');

/**
 * Generic manager for ClickHouse materialized views.
 * Supports both traditional materialized views and refreshable materialized views.
 *
 * Traditional Materialized Views:
 * - Incrementally updated on each insert to the source table
 * - Data is stored in a target table
 * - Used for real-time aggregations
 *
 * Refreshable Materialized Views (ClickHouse 24+):
 * - Periodically refreshed on a schedule
 * - Completely recalculates the view data
 * - Useful for complex aggregations over changing data
 * - Can be manually triggered
 */
class MaterializedViewManager {
    /**
     * Creates a new MaterializedViewManager instance.
     * @param {ClickHouseClient} client - ClickHouse client instance
     * @param {string} database - Database containing the view
     * @param {string} name - View name
     */
    constructor(client, database, name) {
        this.client = client;
        this.database = database;
        this.name = name;
        this.fullName = `${database}.${name}`;
        log.d(`MaterializedViewManager initialized for ${this.fullName}`);
    }

    /**
     * Creates a traditional materialized view.
     * @param {Object} config - Materialized view configuration
     * @param {string} config.targetTable - Target table to store the view data
     * @param {string} config.query - SELECT query defining the view
     * @param {boolean} [config.populate=false] - Populate with existing data
     * @returns {Promise<void>} returns Promise that resolves when the view is created
     */
    async createTraditional(config) {
        log.d(`Creating traditional materialized view ${this.fullName}`, config);

        try {
            const parts = [`CREATE MATERIALIZED VIEW ${this.fullName}`];

            // Add TO clause for target table
            parts.push(`TO ${config.targetTable}`);

            // Add AS clause with query
            parts.push(`AS ${config.query}`);

            let createQuery = parts.join('\n');

            await this.client.exec({
                query: createQuery
            });

            log.d(`Materialized view ${this.fullName} created successfully`);

            // Populate if requested - insert into target table, not the view
            if (config.populate) {
                await this.populate(config.targetTable, config.query);
            }
        }
        catch (error) {
            log.e(`Failed to create materialized view ${this.fullName}:`, error);
            throw error;
        }
    }

    /**
     * Creates a refreshable materialized view (ClickHouse 24+).
     * @param {Object} config - Refreshable view configuration
     * @param {string} config.targetTable - Target table to store the view data
     * @param {string} config.query - SELECT query defining the view
     * @param {Object} config.refresh - Refresh configuration
     * @param {string} [config.refresh.type='EVERY'] - Refresh type: 'EVERY', 'AFTER'
     * @param {string} [config.refresh.value] - Refresh interval (e.g., '1 MINUTE', '5 HOUR')
     * @param {number} [config.refresh.offset] - Offset in seconds for EVERY type
     * @param {string} [config.refresh.depends] - Comma-separated list of tables to depend on
     * @returns {Promise<void>} returns Promise that resolves when the view is created
     */
    async createRefreshable(config) {
        log.d(`Creating refreshable materialized view ${this.fullName}`, config);

        try {
            const parts = [`CREATE MATERIALIZED VIEW ${this.fullName}`];

            // Add REFRESH clause
            parts.push(this._buildRefreshClause(config.refresh));

            // Add TO clause for target table
            parts.push(`TO ${config.targetTable}`);

            // Add AS clause with query
            parts.push(`AS ${config.query}`);

            const createQuery = parts.join('\n');

            await this.client.exec({
                query: createQuery
            });

            log.d(`Refreshable materialized view ${this.fullName} created successfully`);
        }
        catch (error) {
            log.e(`Failed to create refreshable materialized view ${this.fullName}:`, error);
            throw error;
        }
    }

    /**
     * Builds the REFRESH clause for refreshable materialized views.
     * @private
     * @param {Object} refresh - Refresh configuration
     * @returns {string} REFRESH clause
     */
    _buildRefreshClause(refresh) {
        const parts = ['REFRESH'];

        if (refresh.type === 'EVERY' || !refresh.type) {
            parts.push(`EVERY ${refresh.value}`);

            if (refresh.offset) {
                parts.push(`OFFSET ${refresh.offset}`);
            }
        }
        else if (refresh.type === 'AFTER') {
            parts.push(`AFTER ${refresh.value}`);
        }

        if (refresh.depends) {
            parts.push(`DEPENDS ON ${refresh.depends}`);
        }

        return parts.join(' ');
    }

    /**
     * Populates a traditional materialized view with existing data.
     * Inserts into the target table (not the view itself).
     * @param {string} targetTable - The target table that stores the view data
     * @param {string} query - The SELECT query used in the view
     * @returns {Promise<void>} returns Promise that resolves when population is complete
     */
    async populate(targetTable, query) {
        log.d(`Populating materialized view ${this.fullName} (target: ${targetTable})`);

        try {
            // Insert into target table, not the view - MVs route inserts through the view
            const populateQuery = `INSERT INTO ${targetTable} ${query}`;

            await this.client.exec({
                query: populateQuery
            });

            log.d(`Materialized view ${this.fullName} populated successfully via ${targetTable}`);
        }
        catch (error) {
            log.e(`Failed to populate materialized view ${this.fullName}:`, error);
            throw error;
        }
    }

    /**
     * Manually triggers a refresh of a refreshable materialized view.
     * @returns {Promise<void>} returns Promise that resolves when the refresh is complete
     */
    async refresh() {
        log.d(`Manually refreshing materialized view ${this.fullName}`);

        try {
            await this.client.exec({
                query: `SYSTEM REFRESH VIEW ${this.fullName}`
            });

            log.d(`Materialized view ${this.fullName} refreshed successfully`);
        }
        catch (error) {
            log.e(`Failed to refresh materialized view ${this.fullName}:`, error);
            throw error;
        }
    }

    /**
     * Stops automatic refreshing of a refreshable materialized view.
     * @returns {Promise<void>} returns Promise that resolves when the refresh is stopped
     */
    async stopRefresh() {
        log.d(`Stopping refresh for materialized view ${this.fullName}`);

        try {
            await this.client.exec({
                query: `SYSTEM STOP VIEW ${this.fullName}`
            });

            log.d(`Refresh stopped for ${this.fullName}`);
        }
        catch (error) {
            log.e(`Failed to stop refresh for ${this.fullName}:`, error);
            throw error;
        }
    }

    /**
     * Starts automatic refreshing of a refreshable materialized view.
     * @returns {Promise<void>} returns Promise that resolves when the refresh is started
     */
    async startRefresh() {
        log.d(`Starting refresh for materialized view ${this.fullName}`);

        try {
            await this.client.exec({
                query: `SYSTEM START VIEW ${this.fullName}`
            });

            log.d(`Refresh started for ${this.fullName}`);
        }
        catch (error) {
            log.e(`Failed to start refresh for ${this.fullName}:`, error);
            throw error;
        }
    }

    /**
     * Cancels a currently running refresh operation.
     * @returns {Promise<void>} returns Promise that resolves when the refresh is canceled
     */
    async cancelRefresh() {
        log.d(`Canceling refresh for materialized view ${this.fullName}`);

        try {
            await this.client.exec({
                query: `SYSTEM CANCEL VIEW ${this.fullName}`
            });

            log.d(`Refresh canceled for ${this.fullName}`);
        }
        catch (error) {
            log.e(`Failed to cancel refresh for ${this.fullName}:`, error);
            throw error;
        }
    }

    /**
     * Modifies the refresh schedule of a refreshable materialized view.
     * @param {Object} refresh - New refresh configuration
     * @returns {Promise<void>} returns Promise that resolves when the refresh is modified
     */
    async modifyRefresh(refresh) {
        log.d(`Modifying refresh for materialized view ${this.fullName}`, refresh);

        try {
            const refreshClause = this._buildRefreshClause(refresh);

            await this.client.exec({
                query: `ALTER TABLE ${this.fullName} MODIFY ${refreshClause}`
            });

            log.d(`Refresh modified for ${this.fullName}`);
        }
        catch (error) {
            log.e(`Failed to modify refresh for ${this.fullName}:`, error);
            throw error;
        }
    }

    /**
     * Drops the materialized view.
     * @param {boolean} [ifExists=true] - Add IF EXISTS clause
     * @returns {Promise<void>} returns Promise that resolves when the view is dropped
     */
    async drop(ifExists = true) {
        log.d(`Dropping materialized view ${this.fullName}`);

        try {
            const query = ifExists
                ? `DROP VIEW IF EXISTS ${this.fullName}`
                : `DROP VIEW ${this.fullName}`;

            await this.client.exec({
                query: query
            });

            log.d(`Materialized view ${this.fullName} dropped successfully`);
        }
        catch (error) {
            log.e(`Failed to drop materialized view ${this.fullName}:`, error);
            throw error;
        }
    }

    /**
     * Checks if the materialized view exists.
     * @returns {Promise<boolean>} True if view exists
     */
    async exists() {
        log.d(`Checking if materialized view ${this.fullName} exists`);

        try {
            const query = `
                SELECT count() as count
                FROM system.tables
                WHERE database = {database:String}
                  AND name = {name:String}
                  AND engine LIKE '%MaterializedView%'
            `;

            const result = await this.client.query({
                query: query,
                query_params: {
                    database: this.database,
                    name: this.name
                },
                format: 'JSONEachRow'
            });

            const rows = await result.json();
            const exists = rows[0]?.count > 0;
            log.d(`Materialized view ${this.fullName} exists:`, exists);
            return exists;
        }
        catch (error) {
            log.e(`Failed to check view existence:`, error);
            throw error;
        }
    }

    /**
     * Gets information about the materialized view.
     * @returns {Promise<Object|null>} View information or null
     */
    async getInfo() {
        log.d(`Getting information for materialized view ${this.fullName}`);

        try {
            const query = `
                SELECT
                    database,
                    name,
                    engine,
                    create_table_query,
                    total_rows,
                    total_bytes
                FROM system.tables
                WHERE database = {database:String}
                  AND name = {name:String}
            `;

            const result = await this.client.query({
                query: query,
                query_params: {
                    database: this.database,
                    name: this.name
                },
                format: 'JSONEachRow'
            });

            const rows = await result.json();
            if (rows.length > 0) {
                log.d(`View info:`, rows[0]);
                return rows[0];
            }
            return null;
        }
        catch (error) {
            log.e(`Failed to get view information:`, error);
            throw error;
        }
    }

    /**
     * Gets refresh status for a refreshable materialized view.
     * @returns {Promise<Object|null>} Refresh status or null
     */
    async getRefreshStatus() {
        log.d(`Getting refresh status for ${this.fullName}`);

        try {
            const query = `
                SELECT
                    database,
                    view,
                    status,
                    last_refresh_time,
                    last_success_time,
                    last_refresh_result,
                    next_refresh_time,
                    exception,
                    read_rows,
                    read_bytes,
                    total_rows,
                    written_rows,
                    written_bytes
                FROM system.view_refreshes
                WHERE database = {database:String}
                  AND view = {name:String}
            `;

            const result = await this.client.query({
                query: query,
                query_params: {
                    database: this.database,
                    name: this.name
                },
                format: 'JSONEachRow'
            });

            const rows = await result.json();
            if (rows.length > 0) {
                log.d(`Refresh status:`, rows[0]);
                return rows[0];
            }
            return null;
        }
        catch (error) {
            log.e(`Failed to get refresh status:`, error);
            throw error;
        }
    }

    /**
     * Checks if a refresh is currently running.
     * @returns {Promise<boolean>} True if refresh is running
     */
    async isRefreshing() {
        const status = await this.getRefreshStatus();
        return status && status.status === 'Running';
    }

    /**
     * Gets the last exception that occurred during refresh.
     * @returns {Promise<string|null>} Exception message or null
     */
    async getLastException() {
        const status = await this.getRefreshStatus();
        return status?.exception || null;
    }

    /**
     * Gets statistics about the materialized view data.
     * @returns {Promise<Object>} View statistics
     */
    async getStats() {
        log.d(`Getting statistics for materialized view ${this.fullName}`);

        try {
            const query = `
                SELECT
                    count() AS row_count,
                    sum(data_compressed_bytes) AS compressed_bytes,
                    sum(data_uncompressed_bytes) AS uncompressed_bytes,
                    sum(rows) AS total_rows,
                    max(modification_time) AS last_modification
                FROM system.parts
                WHERE database = {database:String}
                  AND table = {name:String}
                  AND active = 1
            `;

            const result = await this.client.query({
                query: query,
                query_params: {
                    database: this.database,
                    name: this.name
                },
                format: 'JSONEachRow'
            });

            const stats = await result.json();
            log.d(`View statistics:`, stats[0]);
            return stats[0];
        }
        catch (error) {
            log.e(`Failed to get view statistics:`, error);
            throw error;
        }
    }

    /**
     * Creates or replaces the materialized view.
     * @param {Object} config - View configuration
     * @param {string} config.type - 'traditional' or 'refreshable'
     * @returns {Promise<void>} returns Promise that resolves when the view is created or replaced
     */
    async createOrReplace(config) {
        log.d(`Creating or replacing materialized view ${this.fullName}`);
        await this.drop(true);

        if (config.type === 'refreshable') {
            await this.createRefreshable(config);
        }
        else {
            await this.createTraditional(config);
        }
    }

    /**
     * Gets the view's CREATE statement from system tables.
     * @returns {Promise<string|null>} CREATE statement or null
     */
    async getCreateStatement() {
        log.d(`Getting CREATE statement for ${this.fullName}`);

        try {
            const query = `
                SELECT create_table_query
                FROM system.tables
                WHERE database = {database:String}
                  AND name = {name:String}
            `;

            const result = await this.client.query({
                query: query,
                query_params: {
                    database: this.database,
                    name: this.name
                },
                format: 'JSONEachRow'
            });

            const rows = await result.json();
            return rows[0]?.create_table_query || null;
        }
        catch (error) {
            log.e(`Failed to get CREATE statement:`, error);
            throw error;
        }
    }

    /**
     * Waits for a refresh operation to complete.
     * @param {number} [timeoutMs=300000] - Timeout in milliseconds (default 5 minutes)
     * @param {number} [pollIntervalMs=1000] - Polling interval in milliseconds
     * @returns {Promise<Object>} Final refresh status
     */
    async waitForRefresh(timeoutMs = 300000, pollIntervalMs = 1000) {
        log.d(`Waiting for refresh to complete for ${this.fullName}`);

        const startTime = Date.now();

        while (Date.now() - startTime < timeoutMs) {
            const status = await this.getRefreshStatus();

            if (!status) {
                throw new Error('View not found or not a refreshable view');
            }

            if (status.status !== 'Running') {
                log.d(`Refresh completed with status: ${status.status}`);
                return status;
            }

            // Wait before polling again
            await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
        }

        throw new Error(`Refresh timeout after ${timeoutMs}ms`);
    }
}

module.exports = MaterializedViewManager;
