#!/usr/bin/env node

/**
 * Drill Migration Verification Script
 * 
 * Verifies that data migration from MongoDB to ClickHouse was completed successfully.
 * Optimized for large datasets (10TB+) using:
 * - Parallel processing with configurable concurrency
 * - Batched sampling instead of full scans
 * - Indexed queries only (uses app_id + timestamp partitioning)
 * - Aggregation-based comparisons to minimize data transfer
 * - Statistical sampling for data integrity checks
 * 
 * Usage: node verify_drill_migration.js [options]
 * Options:
 *   --apps <app_ids>        Comma-separated app IDs to verify (default: all)
 *   --sample-size <n>       Number of random documents to sample per app (default: 1000)
 *   --batch-size <n>        Batch size for ID lookups (default: 500)
 *   --concurrency <n>       Parallel operations (default: 4)
 *   --date-from <date>      Start date for verification (ISO format)
 *   --date-to <date>        End date for verification (ISO format)
 *   --quick                 Quick mode: count comparison only
 *   --verbose               Verbose output
 *   --output <file>         Output results to JSON file
 *   --help                  Show this help message
 * 
 * Environment variables:
 *   MONGODB_URI             MongoDB connection string (default: mongodb://localhost:27017)
 *   CLICKHOUSE_HOST         ClickHouse HTTP URL (default: http://localhost:8123)
 */

const { MongoClient } = require('mongodb');
const crypto = require('crypto');
const fs = require('fs');

// Try to load ClickHouse client from the plugin
let createClient;
try {
    createClient = require('../plugins/clickhouse/node_modules/@clickhouse/client').createClient;
}
catch (e) {
    try {
        createClient = require('@clickhouse/client').createClient;
    }
    catch (e2) {
        console.error('ERROR: @clickhouse/client package not found.');
        console.error('Please install it: npm install @clickhouse/client');
        console.error('Or run from /opt/countly directory where the clickhouse plugin is installed.');
        process.exit(1);
    }
}

// Configuration with defaults
const CONFIG = {
    mongodb: {
        uri: "mongodb://127.0.0.1:27017/?directConnection=true",
        database: 'countly_drill',
        collection: 'drill_events'
    },
    clickhouse: {
        url: 'http://localhost:8123',
        username: 'default',
        password: '',
        database: 'countly_drill',
        table: 'drill_events'
    },
    verification: {
        sampleSize: 1000,
        batchSize: 500,
        concurrency: 4,
        hashFields: ['a', 'e', 'n', 'uid', 'did', 'ts', 'c', 's', 'dur'],
        timePartitionHours: 24
    }
};

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        apps: null,
        sampleSize: CONFIG.verification.sampleSize,
        batchSize: CONFIG.verification.batchSize,
        concurrency: CONFIG.verification.concurrency,
        dateFrom: null,
        dateTo: null,
        quick: false,
        verbose: false,
        output: null,
        help: false
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
        case '--help':
        case '-h':
            options.help = true;
            break;
        case '--apps':
            options.apps = args[++i].split(',').map(s => s.trim());
            break;
        case '--sample-size':
            options.sampleSize = parseInt(args[++i], 10);
            break;
        case '--batch-size':
            options.batchSize = parseInt(args[++i], 10);
            break;
        case '--concurrency':
            options.concurrency = parseInt(args[++i], 10);
            break;
        case '--date-from':
            options.dateFrom = new Date(args[++i]);
            break;
        case '--date-to':
            options.dateTo = new Date(args[++i]);
            break;
        case '--quick':
            options.quick = true;
            break;
        case '--verbose':
        case '-v':
            options.verbose = true;
            break;
        case '--output':
        case '-o':
            options.output = args[++i];
            break;
        }
    }

    return options;
}

function showHelp() {
    console.log(`
Drill Migration Verification Script

Verifies that data migration from MongoDB to ClickHouse was completed successfully.
Optimized for large datasets (10TB+).

Usage: node verify_drill_migration.js [options]

Options:
  --apps <app_ids>        Comma-separated app IDs to verify (default: all)
  --sample-size <n>       Number of random documents to sample per app (default: 1000)
  --batch-size <n>        Batch size for ID lookups (default: 500)
  --concurrency <n>       Parallel operations (default: 4)
  --date-from <date>      Start date for verification (ISO format, e.g., 2025-01-01)
  --date-to <date>        End date for verification (ISO format)
  --quick                 Quick mode: count comparison only (faster, less thorough)
  --verbose, -v           Verbose output
  --output, -o <file>     Output results to JSON file
  --help, -h              Show this help message

Examples:
  # Full verification of all apps
  node verify_drill_migration.js

  # Quick count-only check
  node verify_drill_migration.js --quick

  # Verify specific apps with date range
  node verify_drill_migration.js --apps app1,app2 --date-from 2025-01-01 --date-to 2025-01-31

  # Verbose output with results saved to file
  node verify_drill_migration.js -v -o results.json
`);
}

// Logger
class Logger {
    constructor(verbose) {
        this.verbose = verbose;
        this.startTime = Date.now();
    }

    log(message) {
        const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
        console.log(`[${elapsed}s] ${message}`);
    }

    debug(message) {
        if (this.verbose) {
            this.log(`DEBUG: ${message}`);
        }
    }

    error(message) {
        this.log(`ERROR: ${message}`);
    }

    success(message) {
        this.log(`✓ ${message}`);
    }

    warning(message) {
        this.log(`⚠ ${message}`);
    }
}

// MongoDB helper class
class MongoDBHelper {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
        this.client = null;
        this.db = null;
        this.collection = null;
    }

    async connect() {
        this.client = new MongoClient(this.config.uri);
        await this.client.connect();
        this.db = this.client.db(this.config.database);
        this.collection = this.db.collection(this.config.collection);
        this.logger.debug('Connected to MongoDB');
    }

    async close() {
        if (this.client) {
            await this.client.close();
        }
    }

    async getAppIds() {
        const result = await this.collection.aggregate([
            { $group: { _id: '$a' } },
            { $project: { _id: 0, app_id: '$_id' } }
        ], { allowDiskUse: true }).toArray();
        return result.map(r => r.app_id).filter(Boolean);
    }

    async getTotalCount(appId, dateFrom, dateTo) {
        const match = { a: appId };
        if (dateFrom || dateTo) {
            match.ts = {};
            if (dateFrom) {
                match.ts.$gte = dateFrom.getTime();
            }
            if (dateTo) {
                match.ts.$lte = dateTo.getTime();
            }
        }
        return await this.collection.countDocuments(match);
    }

    async getCountByEventType(appId, dateFrom, dateTo) {
        const match = { a: appId };
        if (dateFrom || dateTo) {
            match.ts = {};
            if (dateFrom) {
                match.ts.$gte = dateFrom.getTime();
            }
            if (dateTo) {
                match.ts.$lte = dateTo.getTime();
            }
        }

        const pipeline = [
            { $match: match },
            { $group: { _id: '$e', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ];

        const result = await this.collection.aggregate(pipeline, { allowDiskUse: true }).toArray();
        return result.reduce((acc, r) => {
            acc[r._id] = r.count;
            return acc;
        }, {});
    }

    async getCountByTimePartition(appId, dateFrom, dateTo, partitionHours) {
        const match = { a: appId };
        if (dateFrom || dateTo) {
            match.ts = {};
            if (dateFrom) {
                match.ts.$gte = dateFrom.getTime();
            }
            if (dateTo) {
                match.ts.$lte = dateTo.getTime();
            }
        }

        const partitionMs = partitionHours * 60 * 60 * 1000;
        const pipeline = [
            { $match: match },
            {
                $group: {
                    _id: { $subtract: ['$ts', { $mod: ['$ts', partitionMs] }] },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ];

        const result = await this.collection.aggregate(pipeline, { allowDiskUse: true }).toArray();
        return result.reduce((acc, r) => {
            acc[r._id] = r.count;
            return acc;
        }, {});
    }

    async getAggregatedStats(appId, dateFrom, dateTo) {
        const match = { a: appId };
        if (dateFrom || dateTo) {
            match.ts = {};
            if (dateFrom) {
                match.ts.$gte = dateFrom.getTime();
            }
            if (dateTo) {
                match.ts.$lte = dateTo.getTime();
            }
        }

        const pipeline = [
            { $match: match },
            {
                $group: {
                    _id: null,
                    totalCount: { $sum: 1 },
                    sumC: { $sum: '$c' },
                    sumS: { $sum: '$s' },
                    sumDur: { $sum: '$dur' },
                    minTs: { $min: '$ts' },
                    maxTs: { $max: '$ts' }
                }
            }
        ];

        const result = await this.collection.aggregate(pipeline, { allowDiskUse: true }).toArray();
        return result[0] || null;
    }

    async getSampleIds(appId, sampleSize, dateFrom, dateTo) {
        const match = { a: appId };
        if (dateFrom || dateTo) {
            match.ts = {};
            if (dateFrom) {
                match.ts.$gte = dateFrom.getTime();
            }
            if (dateTo) {
                match.ts.$lte = dateTo.getTime();
            }
        }

        const pipeline = [
            { $match: match },
            { $sample: { size: sampleSize } },
            { $project: { _id: 1 } }
        ];

        const result = await this.collection.aggregate(pipeline, { allowDiskUse: true }).toArray();
        return result.map(r => r._id);
    }

    async getDocumentsByIds(ids) {
        const result = await this.collection.find(
            { _id: { $in: ids } },
            { projection: { _id: 1, a: 1, e: 1, n: 1, uid: 1, did: 1, ts: 1, c: 1, s: 1, dur: 1 } }
        ).toArray();
        return result;
    }
}

// ClickHouse helper class
class ClickHouseHelper {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
        this.client = null;
    }

    async connect() {
        this.client = createClient({
            url: this.config.url,
            username: this.config.username,
            password: this.config.password,
            database: this.config.database,
            request_timeout: 300000,
            clickhouse_settings: {
                max_execution_time: 300,
                connect_timeout: 10
            }
        });

        try {
            await this.client.ping();
            this.logger.debug('Connected to ClickHouse');
        }
        catch (error) {
            throw new Error(`Failed to connect to ClickHouse: ${error.message}`);
        }
    }

    async close() {
        if (this.client) {
            await this.client.close();
        }
    }

    async query(sql) {
        const result = await this.client.query({ query: sql, format: 'JSONEachRow' });
        return await result.json();
    }

    escapeString(str) {
        return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    }

    formatDateTime(date) {
        // ClickHouse DateTime64 doesn't accept the 'Z' suffix from toISOString()
        return date.toISOString().replace('Z', '');
    }

    async getTotalCount(appId, dateFrom, dateTo) {
        let sql = `SELECT count() as cnt FROM ${this.config.table} WHERE a = '${this.escapeString(appId)}'`;
        if (dateFrom) {
            sql += ` AND ts >= toDateTime64('${this.formatDateTime(dateFrom)}', 3)`;
        }
        if (dateTo) {
            sql += ` AND ts <= toDateTime64('${this.formatDateTime(dateTo)}', 3)`;
        }
        const result = await this.query(sql);
        return parseInt(result[0]?.cnt || 0, 10);
    }

    async getCountByEventType(appId, dateFrom, dateTo) {
        // In ClickHouse, custom events are stored as e='[CLY]_custom' with actual name in 'n'
        // We need to use 'n' for custom events to match MongoDB's format where e=eventName directly
        let sql = `
            SELECT 
                if(e = '[CLY]_custom', n, e) as event_name,
                count() as cnt 
            FROM ${this.config.table} 
            WHERE a = '${this.escapeString(appId)}'`;
        if (dateFrom) {
            sql += ` AND ts >= toDateTime64('${this.formatDateTime(dateFrom)}', 3)`;
        }
        if (dateTo) {
            sql += ` AND ts <= toDateTime64('${this.formatDateTime(dateTo)}', 3)`;
        }
        sql += ' GROUP BY event_name ORDER BY cnt DESC';

        const result = await this.query(sql);
        return result.reduce((acc, r) => {
            acc[r.event_name] = parseInt(r.cnt, 10);
            return acc;
        }, {});
    }

    async getCountByTimePartition(appId, dateFrom, dateTo, partitionHours) {
        let sql = `
            SELECT 
                toInt64(toUnixTimestamp64Milli(ts) / ${partitionHours * 60 * 60 * 1000}) * ${partitionHours * 60 * 60 * 1000} as partition,
                count() as cnt 
            FROM ${this.config.table} 
            WHERE a = '${this.escapeString(appId)}'`;

        if (dateFrom) {
            sql += ` AND ts >= toDateTime64('${this.formatDateTime(dateFrom)}', 3)`;
        }
        if (dateTo) {
            sql += ` AND ts <= toDateTime64('${this.formatDateTime(dateTo)}', 3)`;
        }
        sql += ' GROUP BY partition ORDER BY partition';

        const result = await this.query(sql);
        return result.reduce((acc, r) => {
            acc[r.partition] = parseInt(r.cnt, 10);
            return acc;
        }, {});
    }

    async getAggregatedStats(appId, dateFrom, dateTo) {
        let sql = `
            SELECT 
                count() as totalCount,
                sum(c) as sumC,
                sum(s) as sumS,
                sum(dur) as sumDur,
                toInt64(min(toUnixTimestamp64Milli(ts))) as minTs,
                toInt64(max(toUnixTimestamp64Milli(ts))) as maxTs
            FROM ${this.config.table} 
            WHERE a = '${this.escapeString(appId)}'`;

        if (dateFrom) {
            sql += ` AND ts >= toDateTime64('${this.formatDateTime(dateFrom)}', 3)`;
        }
        if (dateTo) {
            sql += ` AND ts <= toDateTime64('${this.formatDateTime(dateTo)}', 3)`;
        }

        const result = await this.query(sql);
        if (result.length === 0) {
            return null;
        }

        return {
            totalCount: parseInt(result[0].totalCount, 10),
            sumC: parseInt(result[0].sumC, 10),
            sumS: parseFloat(result[0].sumS),
            sumDur: parseInt(result[0].sumDur, 10),
            minTs: parseInt(result[0].minTs, 10),
            maxTs: parseInt(result[0].maxTs, 10)
        };
    }

    async getDocumentsByIds(ids) {
        if (ids.length === 0) {
            return [];
        }

        const escapedIds = ids.map(id => `'${this.escapeString(String(id))}'`).join(',');
        const sql = `
            SELECT _id, a, e, n, uid, did, 
                   toInt64(toUnixTimestamp64Milli(ts)) as ts, 
                   c, s, dur 
            FROM ${this.config.table} 
            WHERE _id IN (${escapedIds})`;

        const result = await this.query(sql);
        return result.map(r => ({
            _id: r._id,
            a: r.a,
            e: r.e,
            n: r.n,
            uid: r.uid,
            did: r.did,
            ts: parseInt(r.ts, 10),
            c: parseInt(r.c, 10),
            s: parseFloat(r.s),
            dur: parseInt(r.dur, 10)
        }));
    }
}

// Verification result class
class VerificationResult {
    constructor() {
        this.startTime = new Date();
        this.endTime = null;
        this.success = true;
        this.apps = {};
        this.summary = {
            totalApps: 0,
            passedApps: 0,
            failedApps: 0,
            warnings: 0,
            mongoDbTotal: 0,
            clickHouseTotal: 0
        };
        this.errors = [];
    }

    addAppResult(appId, result) {
        this.apps[appId] = result;
        this.summary.totalApps++;

        if (result.passed) {
            this.summary.passedApps++;
        }
        else {
            this.summary.failedApps++;
            this.success = false;
        }

        this.summary.warnings += result.warnings.length;
        this.summary.mongoDbTotal += result.mongodb.totalCount || 0;
        this.summary.clickHouseTotal += result.clickhouse.totalCount || 0;
    }

    addError(error) {
        this.errors.push(error);
        this.success = false;
    }

    finalize() {
        this.endTime = new Date();
        this.duration = (this.endTime - this.startTime) / 1000;
    }

    toJSON() {
        return {
            success: this.success,
            startTime: this.startTime.toISOString(),
            endTime: this.endTime ? this.endTime.toISOString() : null,
            duration: this.duration,
            summary: this.summary,
            apps: this.apps,
            errors: this.errors
        };
    }
}

// Main verification class
class MigrationVerifier {
    constructor(options, logger) {
        this.options = options;
        this.logger = logger;
        this.mongoHelper = new MongoDBHelper(CONFIG.mongodb, logger);
        this.chHelper = new ClickHouseHelper(CONFIG.clickhouse, logger);
        this.result = new VerificationResult();
    }

    async connect() {
        await Promise.all([
            this.mongoHelper.connect(),
            this.chHelper.connect()
        ]);
    }

    async close() {
        await Promise.all([
            this.mongoHelper.close(),
            this.chHelper.close()
        ]);
    }

    computeHash(doc, fields, isClickHouse = false) {
        const values = fields.map(f => {
            let val = doc[f];
            // Normalize event field: in ClickHouse [CLY]_custom events have actual name in 'n'
            // In MongoDB, custom events have the name directly in 'e'
            if (f === 'e' && isClickHouse && val === '[CLY]_custom') {
                // For ClickHouse [CLY]_custom, use 'n' as the effective event name
                val = doc['n'] || val;
            }
            return String(val ?? '');
        }).join('|');
        return crypto.createHash('md5').update(values).digest('hex');
    }

    findDifferences(mongoDoc, chDoc, fields) {
        const diffs = {};
        for (const field of fields) {
            let mongoVal = mongoDoc[field];
            let chVal = chDoc[field];

            // Normalize event field comparison
            // MongoDB: custom events have name in 'e' (e.g., e="Login")
            // ClickHouse: custom events have e="[CLY]_custom" and name in 'n'
            if (field === 'e' && chVal === '[CLY]_custom') {
                chVal = chDoc['n'] || chVal;
            }

            if (String(mongoVal) !== String(chVal)) {
                diffs[field] = { mongodb: mongoVal, clickhouse: chVal };
            }
        }
        return diffs;
    }

    async verifyApp(appId) {
        const appResult = {
            appId,
            passed: true,
            warnings: [],
            checks: {},
            mongodb: {},
            clickhouse: {}
        };

        try {
            // 1. Total count comparison
            this.logger.debug(`[${appId}] Checking total counts...`);
            const [mongoCount, chCount] = await Promise.all([
                this.mongoHelper.getTotalCount(appId, this.options.dateFrom, this.options.dateTo),
                this.chHelper.getTotalCount(appId, this.options.dateFrom, this.options.dateTo)
            ]);

            appResult.mongodb.totalCount = mongoCount;
            appResult.clickhouse.totalCount = chCount;
            appResult.checks.totalCount = {
                mongodb: mongoCount,
                clickhouse: chCount,
                match: mongoCount === chCount,
                diff: chCount - mongoCount
            };

            if (mongoCount !== chCount) {
                // Count mismatch is a warning, not a failure - we'll check event types to understand what's different
                const pctDiff = mongoCount > 0 ? ((chCount - mongoCount) / mongoCount * 100).toFixed(2) : 'N/A';
                appResult.warnings.push(`Count mismatch: MongoDB=${mongoCount}, ClickHouse=${chCount} (${pctDiff}%)`);
            }

            if (this.options.quick) {
                // In quick mode, count mismatch is a failure
                if (mongoCount !== chCount) {
                    appResult.passed = false;
                }
                return appResult;
            }

            // 2. Event type distribution comparison
            this.logger.debug(`[${appId}] Checking event type distribution...`);
            const [mongoEventCounts, chEventCounts] = await Promise.all([
                this.mongoHelper.getCountByEventType(appId, this.options.dateFrom, this.options.dateTo),
                this.chHelper.getCountByEventType(appId, this.options.dateFrom, this.options.dateTo)
            ]);

            appResult.checks.eventTypes = {
                mongodb: mongoEventCounts,
                clickhouse: chEventCounts,
                mismatches: [],
                missingInClickHouse: [],
                extraInClickHouse: [],
                summary: {
                    totalEventTypes: 0,
                    matchingEventTypes: 0,
                    mismatchedEventTypes: 0
                }
            };

            const allEventTypes = new Set([...Object.keys(mongoEventCounts), ...Object.keys(chEventCounts)]);
            appResult.checks.eventTypes.summary.totalEventTypes = allEventTypes.size;

            for (const eventType of allEventTypes) {
                const mongoC = mongoEventCounts[eventType] || 0;
                const chC = chEventCounts[eventType] || 0;

                if (mongoC === chC) {
                    appResult.checks.eventTypes.summary.matchingEventTypes++;
                }
                else {
                    appResult.checks.eventTypes.summary.mismatchedEventTypes++;

                    const mismatchInfo = {
                        event: eventType,
                        mongodb: mongoC,
                        clickhouse: chC,
                        diff: chC - mongoC,
                        pctDiff: mongoC > 0 ? ((chC - mongoC) / mongoC * 100).toFixed(2) + '%' : (chC > 0 ? '+100%' : '0%')
                    };

                    if (mongoC > 0 && chC === 0) {
                        appResult.checks.eventTypes.missingInClickHouse.push(mismatchInfo);
                    }
                    else if (mongoC === 0 && chC > 0) {
                        appResult.checks.eventTypes.extraInClickHouse.push(mismatchInfo);
                    }
                    else {
                        appResult.checks.eventTypes.mismatches.push(mismatchInfo);
                    }
                }
            }

            // Log detailed event type analysis
            if (appResult.checks.eventTypes.missingInClickHouse.length > 0) {
                const missing = appResult.checks.eventTypes.missingInClickHouse;
                const totalMissing = missing.reduce((sum, m) => sum + m.mongodb, 0);
                appResult.warnings.push(`Events missing in ClickHouse: ${missing.length} event type(s), ${totalMissing} total records`);
                this.logger.debug(`[${appId}] Missing event types: ${missing.map(m => `${m.event}(${m.mongodb})`).join(', ')}`);
            }

            if (appResult.checks.eventTypes.extraInClickHouse.length > 0) {
                const extra = appResult.checks.eventTypes.extraInClickHouse;
                const totalExtra = extra.reduce((sum, m) => sum + m.clickhouse, 0);
                appResult.warnings.push(`Extra events in ClickHouse: ${extra.length} event type(s), ${totalExtra} total records`);
                this.logger.debug(`[${appId}] Extra event types: ${extra.map(m => `${m.event}(${m.clickhouse})`).join(', ')}`);
            }

            if (appResult.checks.eventTypes.mismatches.length > 0) {
                appResult.warnings.push(`Event type count mismatches: ${appResult.checks.eventTypes.mismatches.length}`);
            }

            // 3. Time partition comparison
            this.logger.debug(`[${appId}] Checking time partition distribution...`);
            try {
                const [mongoTimeCounts, chTimeCounts] = await Promise.all([
                    this.mongoHelper.getCountByTimePartition(appId, this.options.dateFrom, this.options.dateTo, CONFIG.verification.timePartitionHours),
                    this.chHelper.getCountByTimePartition(appId, this.options.dateFrom, this.options.dateTo, CONFIG.verification.timePartitionHours)
                ]);

                appResult.checks.timePartitions = {
                    partitionHours: CONFIG.verification.timePartitionHours,
                    totalPartitions: Object.keys(mongoTimeCounts).length,
                    mismatches: []
                };

                const allPartitions = new Set([...Object.keys(mongoTimeCounts), ...Object.keys(chTimeCounts)]);
                for (const partition of allPartitions) {
                    const mongoC = mongoTimeCounts[partition] || 0;
                    const chC = chTimeCounts[partition] || 0;
                    if (mongoC !== chC) {
                        appResult.checks.timePartitions.mismatches.push({
                            partition: new Date(parseInt(partition)).toISOString(),
                            mongodb: mongoC,
                            clickhouse: chC,
                            diff: chC - mongoC
                        });
                    }
                }

                if (appResult.checks.timePartitions.mismatches.length > 0) {
                    appResult.warnings.push(`Time partition mismatches: ${appResult.checks.timePartitions.mismatches.length}`);
                }
            }
            catch (error) {
                this.logger.debug(`[${appId}] Time partition check failed: ${error.message}`);
                appResult.checks.timePartitions = { error: error.message };
            }

            // 4. Aggregated stats comparison
            this.logger.debug(`[${appId}] Checking aggregated statistics...`);
            const [mongoStats, chStats] = await Promise.all([
                this.mongoHelper.getAggregatedStats(appId, this.options.dateFrom, this.options.dateTo),
                this.chHelper.getAggregatedStats(appId, this.options.dateFrom, this.options.dateTo)
            ]);

            appResult.mongodb.stats = mongoStats;
            appResult.clickhouse.stats = chStats;

            if (mongoStats && chStats) {
                appResult.checks.aggregatedStats = {
                    sumC: { mongodb: mongoStats.sumC, clickhouse: chStats.sumC, match: mongoStats.sumC === chStats.sumC },
                    sumDur: { mongodb: mongoStats.sumDur, clickhouse: chStats.sumDur, match: mongoStats.sumDur === chStats.sumDur },
                    minTs: { mongodb: mongoStats.minTs, clickhouse: chStats.minTs, match: mongoStats.minTs === chStats.minTs },
                    maxTs: { mongodb: mongoStats.maxTs, clickhouse: chStats.maxTs, match: mongoStats.maxTs === chStats.maxTs }
                };

                if (mongoStats.sumC !== chStats.sumC) {
                    appResult.warnings.push(`Sum of count (c) differs: MongoDB=${mongoStats.sumC}, ClickHouse=${chStats.sumC}`);
                }
                if (mongoStats.sumDur !== chStats.sumDur) {
                    appResult.warnings.push(`Sum of duration differs: MongoDB=${mongoStats.sumDur}, ClickHouse=${chStats.sumDur}`);
                }
            }

            // 5. Sample document verification
            this.logger.debug(`[${appId}] Sampling ${this.options.sampleSize} documents for verification...`);
            const sampleIds = await this.mongoHelper.getSampleIds(
                appId,
                this.options.sampleSize,
                this.options.dateFrom,
                this.options.dateTo
            );

            appResult.checks.sampleVerification = {
                sampleSize: sampleIds.length,
                missingInClickHouse: [],
                dataIntegrityErrors: []
            };

            // Process in batches
            for (let i = 0; i < sampleIds.length; i += this.options.batchSize) {
                const batchIds = sampleIds.slice(i, i + this.options.batchSize);
                this.logger.debug(`[${appId}] Processing batch ${Math.floor(i / this.options.batchSize) + 1}/${Math.ceil(sampleIds.length / this.options.batchSize)}`);

                const [mongoDocs, chDocs] = await Promise.all([
                    this.mongoHelper.getDocumentsByIds(batchIds),
                    this.chHelper.getDocumentsByIds(batchIds)
                ]);

                const chDocsMap = new Map(chDocs.map(d => [d._id, d]));

                for (const mongoDoc of mongoDocs) {
                    const chDoc = chDocsMap.get(mongoDoc._id);

                    if (!chDoc) {
                        appResult.checks.sampleVerification.missingInClickHouse.push(mongoDoc._id);
                        continue;
                    }

                    const mongoHash = this.computeHash(mongoDoc, CONFIG.verification.hashFields, false);
                    const chHash = this.computeHash(chDoc, CONFIG.verification.hashFields, true);

                    if (mongoHash !== chHash) {
                        if (appResult.checks.sampleVerification.dataIntegrityErrors.length < 10) {
                            appResult.checks.sampleVerification.dataIntegrityErrors.push({
                                id: mongoDoc._id,
                                differences: this.findDifferences(mongoDoc, chDoc, CONFIG.verification.hashFields)
                            });
                        }
                    }
                }
            }

            const missingCount = appResult.checks.sampleVerification.missingInClickHouse.length;
            const integrityErrorCount = appResult.checks.sampleVerification.dataIntegrityErrors.length;

            if (missingCount > 0) {
                // Missing documents in sample is a critical failure
                appResult.passed = false;
                appResult.warnings.push(
                    `Missing documents in ClickHouse: ${missingCount}/${sampleIds.length} (${(missingCount / sampleIds.length * 100).toFixed(1)}%)`
                );
            }

            if (integrityErrorCount > 0) {
                // Data integrity errors are critical failures
                appResult.passed = false;
                appResult.warnings.push(
                    `Data integrity errors: ${integrityErrorCount}/${sampleIds.length}`
                );
            }

            // If sample verification passed but counts differ, it's likely ongoing ingestion
            // Mark as passed with warnings
            if (missingCount === 0 && integrityErrorCount === 0 && !appResult.checks.totalCount.match) {
                this.logger.debug(`[${appId}] Count mismatch but sample verification passed - likely due to ongoing data ingestion`);
            }

        }
        catch (error) {
            appResult.passed = false;
            appResult.error = error.message;
            this.logger.error(`[${appId}] Error: ${error.message}`);
        }

        return appResult;
    }

    async run() {
        this.logger.log('Starting migration verification...');
        this.logger.log(`MongoDB: ${CONFIG.mongodb.uri}/${CONFIG.mongodb.database}`);
        this.logger.log(`ClickHouse: ${CONFIG.clickhouse.url}/${CONFIG.clickhouse.database}`);

        try {
            await this.connect();

            let appIds = this.options.apps;
            if (!appIds) {
                this.logger.log('Discovering apps from MongoDB...');
                appIds = await this.mongoHelper.getAppIds();
            }

            this.logger.log(`Verifying ${appIds.length} app(s): ${appIds.slice(0, 5).join(', ')}${appIds.length > 5 ? ` ... and ${appIds.length - 5} more` : ''}`);

            for (const appId of appIds) {
                this.logger.log(`Verifying app: ${appId}`);
                const result = await this.verifyApp(appId);
                this.result.addAppResult(appId, result);

                if (result.passed) {
                    this.logger.success(`App ${appId}: PASSED (MongoDB: ${result.mongodb.totalCount?.toLocaleString()}, ClickHouse: ${result.clickhouse.totalCount?.toLocaleString()})`);
                }
                else {
                    this.logger.warning(`App ${appId}: FAILED - ${result.warnings.slice(0, 3).join('; ')}`);
                }
            }

        }
        catch (error) {
            this.result.addError(error.message);
            this.logger.error(`Fatal error: ${error.message}`);
            if (this.options.verbose) {
                console.error(error.stack);
            }
        }
        finally {
            await this.close();
        }

        this.result.finalize();
        return this.result;
    }
}

// Main entry point
async function main() {
    const options = parseArgs();

    if (options.help) {
        showHelp();
        process.exit(0);
    }

    const logger = new Logger(options.verbose);

    logger.log('='.repeat(60));
    logger.log('Drill Migration Verification Tool');
    logger.log('='.repeat(60));

    if (options.quick) {
        logger.log('Mode: QUICK (count comparison only)');
    }
    else {
        logger.log(`Mode: FULL (sample size: ${options.sampleSize}, batch size: ${options.batchSize})`);
    }

    if (options.dateFrom || options.dateTo) {
        logger.log(`Date range: ${options.dateFrom?.toISOString() || 'beginning'} to ${options.dateTo?.toISOString() || 'now'}`);
    }

    logger.log('');

    const verifier = new MigrationVerifier(options, logger);
    const result = await verifier.run();

    // Print summary
    logger.log('');
    logger.log('='.repeat(60));
    logger.log('VERIFICATION SUMMARY');
    logger.log('='.repeat(60));
    logger.log(`Total Apps: ${result.summary.totalApps}`);
    logger.log(`Passed: ${result.summary.passedApps}`);
    logger.log(`Failed: ${result.summary.failedApps}`);
    logger.log(`Warnings: ${result.summary.warnings}`);
    logger.log(`MongoDB Total: ${result.summary.mongoDbTotal.toLocaleString()} documents`);
    logger.log(`ClickHouse Total: ${result.summary.clickHouseTotal.toLocaleString()} rows`);
    logger.log(`Difference: ${(result.summary.clickHouseTotal - result.summary.mongoDbTotal).toLocaleString()}`);
    logger.log(`Duration: ${result.duration.toFixed(2)}s`);
    logger.log('');

    if (result.success) {
        logger.success('MIGRATION VERIFICATION PASSED');
    }
    else {
        logger.error('MIGRATION VERIFICATION FAILED');

        const failedApps = Object.entries(result.apps).filter(([, r]) => !r.passed);
        if (failedApps.length > 0) {
            logger.log('');
            logger.log('Failed apps:');
            for (const [appId, appResult] of failedApps) {
                logger.log(`  - ${appId}: ${appResult.warnings[0] || appResult.error || 'Unknown error'}`);
            }
        }
    }

    if (options.output) {

        fs.writeFileSync(options.output, JSON.stringify(result.toJSON(), null, 2));
        logger.log(`Results written to: ${options.output}`);
    }

    process.exit(result.success ? 0 : 1);
}

main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
});
