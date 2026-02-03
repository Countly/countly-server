/**
 * This module is meant for handling CMS API requests.
 * @module api/parts/mgmt/cms
 */

import { createRequire } from 'module';

// createRequire needed for CJS modules without ES exports
// @ts-expect-error TS1470 - import.meta is valid at runtime (Node 22 treats .ts with imports as ESM)
const require = createRequire(import.meta.url);
const common = require('../../../utils/common.js');
const config = require('../../../config.js');

const log = common.log('core:cms') as { e: (...args: unknown[]) => void };

/**
 * Params type for CMS operations
 */
interface CmsParams {
    qstring: {
        _id?: string;
        populate?: boolean;
        query?: string | Record<string, unknown>;
        refresh?: boolean;
        entries?: string;
    };
    dataTransformed?: boolean;
}

/**
 * CMS entry from database
 */
interface CmsEntry {
    _id: string;
    lu?: number;
    error?: boolean;
    enableGuides?: boolean;
    id?: number;
    attributes?: Record<string, unknown>;
    [key: string]: unknown;
}

/**
 * CMS API response meta
 */
interface CmsMeta {
    pagination?: {
        page: number;
        pageCount: number;
        pageSize: number;
        total: number;
    };
}

/**
 * CMS API response
 */
interface CmsApiResponse {
    data: CmsEntry[] | CmsEntry;
    meta?: CmsMeta;
}

/**
 * CMS API module interface
 */
interface CmsApi {
    saveEntries: (params: CmsParams) => void;
    getEntriesWithUpdate: (params: CmsParams) => boolean;
    getEntries: (params: CmsParams) => boolean;
    clearCache: (params: CmsParams) => void;
}

const currentProcesses: Record<string, number> = {};

const AVAILABLE_API_IDS = new Set(['server-guides', 'server-consents', 'server-intro-video', 'server-quick-start', 'server-guide-config']);
const UPDATE_INTERVAL = 1; // hours
const TOKEN = '17fa74a2b4b1524e57e8790250f89f44f364fe567f13f4dbef02ef583e70dcdb700f87a6122212bb01ca6a14a8d4b85dc314296f71681988993c013ed2f6305b57b251af723830ea2aa180fc689af1052dd74bc3f4b9b35e5674d4214a8c79695face42057424f0494631679922a3bdaeb780b522bb025dfaea8d7d56a857dba';
const BASE_URL = 'https://cms.count.ly/api/';

/**
 * Get entries for a given API ID from Countly CMS
 * @param params - params object
 * @param callback - callback function
 */
function fetchFromCMS(params: CmsParams, callback: (err: Error | null, results: CmsEntry[] | null) => void): void {
    const url = BASE_URL + params.qstring._id;
    const pageSize = 100;
    let results: CmsEntry[] = [];

    /**
     * Get a single page of data
     * @param pageNumber - page number
     */
    function fetchPage(pageNumber: number): void {
        let pageUrl = `${url}?pagination[page]=${pageNumber}&pagination[pageSize]=${pageSize}`;

        if (params.qstring.populate) {
            pageUrl += '&populate=*';
        }

        fetch(pageUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + TOKEN
            }
        })
            .then(response => response.json() as Promise<CmsApiResponse>)
            .then(responseData => {
                const { data, meta } = responseData;
                if (data && ((Array.isArray(data) && data.length > 0) || (!Array.isArray(data) && data.id))) {
                    // Add data to results
                    results = results.concat(Array.isArray(data) ? data : [data]);
                }

                if (meta && meta.pagination && meta.pagination.page < meta.pagination.pageCount) {
                    // Fetch next page
                    fetchPage(meta.pagination.page + 1);
                }
                else {
                    // All pages fetched or no pagination metadata, invoke callback
                    callback(null, results);
                }
            })
            .catch(error => {
                log.e(error);
                callback(error, null);
            });
    }

    fetchPage(1);
}

/**
 * Transform and store CMS entries in DB
 * @param params - params object
 * @param err - error object
 * @param data - data array
 * @param callback - callback function
 */
function transformAndStoreData(params: CmsParams, err: Error | null, data: CmsEntry[] | null, callback: (err: Error | null) => void): void {
    const lu = Date.now();

    if (err || !data || data.length === 0) {
        // Add meta entry
        common.db.collection('cms_cache').updateOne(
            { _id: `${params.qstring._id}_meta` },
            { $set: { _id: `${params.qstring._id}_meta`, lu, error: !!err } },
            { upsert: true },
            function() {
                callback(null);
            }
        );
    }
    else {
        let transformedData: CmsEntry[] = [];

        if (params.dataTransformed) {
            transformedData = data;
            transformedData.forEach(item => {
                item.lu = lu;
            });
        }
        else {
            for (let i = 0; i < data.length; i++) {
                transformedData.push(Object.assign({ _id: `${params.qstring._id}_${data[i].id}`, lu }, data[i].attributes));
            }
        }

        const bulk = common.db.collection('cms_cache').initializeUnorderedBulkOp();
        for (let i = 0; i < transformedData.length; i++) {
            bulk.find({
                '_id': transformedData[i]._id
            }).upsert().updateOne({
                '$set': transformedData[i]
            });
        }

        // Add meta entry
        bulk.find({
            '_id': `${params.qstring._id}_meta`
        }).upsert().replaceOne({
            '_id': `${params.qstring._id}_meta`,
            'lu': lu
        });

        // Execute bulk operations to update/insert new entries
        bulk.execute(function(err1: Error | null) {
            if (err1) {
                callback(err1);
            }

            // Delete old entries
            common.db.collection('cms_cache').deleteMany(
                { '_id': { '$regex': `^${params.qstring._id}` }, 'lu': { '$lt': lu } },
                function(err2: Error | null) {
                    if (err2) {
                        callback(err2);
                    }
                    callback(null);
                }
            );
        });
    }
}

/**
 * Get entries for a given API ID from Countly CMS
 * @param params - params object
 */
function syncCMSDataToDB(params: CmsParams): void {
    // Check if there is a process running
    if (!currentProcesses.id || (currentProcesses.id && currentProcesses.id >= new Date(Date.now() - 5 * 60 * 1000).getTime())) {
        // Set current process
        currentProcesses.id = Date.now();
        fetchFromCMS(params, function(err, results) {
            transformAndStoreData(params, err, results, function(err1) {
                delete currentProcesses.id;
                if (err1) {
                    log.e('An error occured while storing entries in DB: ' + err1);
                }
            });
        });
    }
}

const cmsApi: CmsApi = {
    saveEntries: function(params: CmsParams): void {
        let entries: CmsEntry[] = [];
        try {
            entries = JSON.parse(params.qstring.entries || '[]');
        }
        catch (ex) {
            log.e(params.qstring.entries);
            common.returnMessage(params, 400, 'Invalid entries parameter');
            return;
        }

        transformAndStoreData(
            Object.assign({ dataTransformed: true }, params),
            null,
            entries,
            function(err1) {
                if (err1) {
                    log.e('An error occured while storing entries in DB: ' + err1);
                    common.returnMessage(params, 500, `Error occured when saving entries to DB: ${err1}`);
                }
                else {
                    common.returnMessage(params, 200, 'Entries saved');
                }
            }
        );
    },

    /**
     * Get entries for a given API ID
     * Will request from CMS if entries are stale or not found
     * @param params - params object
     * @returns true
     */
    getEntriesWithUpdate: function(params: CmsParams): boolean {
        if (!params.qstring._id || !AVAILABLE_API_IDS.has(params.qstring._id)) {
            common.returnMessage(params, 400, 'Missing or incorrect API _id parameter');
            return false;
        }

        let query: Record<string, unknown> = { '_id': { '$regex': `^${params.qstring._id}` } };

        try {
            params.qstring.query = JSON.parse(params.qstring.query as string);
        }
        catch (ex) {
            params.qstring.query = undefined;
        }

        if (params.qstring.query) {
            query = {
                $and: [
                    { '_id': { '$regex': `^${params.qstring._id}` } },
                    {
                        $or: [
                            { '_id': `${params.qstring._id}_meta` },
                        ]
                    }
                ]
            };
            for (const cond in params.qstring.query as Record<string, unknown>) {
                const condition: Record<string, unknown> = {};
                condition[cond] = (params.qstring.query as Record<string, unknown>)[cond];
                (query.$and as Array<Record<string, unknown>>)[1].$or = (query.$and as Array<Record<string, unknown>>)[1].$or || [];
                ((query.$and as Array<Record<string, unknown>>)[1].$or as Array<Record<string, unknown>>).push(condition);
            }
            params.qstring.query = query;
        }

        common.db.collection('cms_cache').find(query).toArray(function(err: Error | null, entries: CmsEntry[]) {
            if (err) {
                common.returnMessage(params, 500, 'An error occured while fetching CMS entries from DB: ' + err);
                return false;
            }
            const results: { data: CmsEntry[]; updating?: boolean } = { data: entries || [] };

            if (!entries || entries.length === 0) {
                // Force update
                results.updating = true;
                syncCMSDataToDB(params);
            }
            else {
                const metaEntry = entries.find((item) => item._id.endsWith('meta')) || {} as CmsEntry;
                const updateInterval = UPDATE_INTERVAL * 60 * 60 * 1000;
                const timeDifference = Date.now() - (metaEntry.lu || entries[0].lu || 0);

                // Update if the update interval has passed
                if (timeDifference >= updateInterval) {
                    results.updating = true;
                    syncCMSDataToDB(params);
                }
                // Update if the refresh flag is set and the meta entry does not contain an error
                else if (params.qstring.refresh) {
                    if (metaEntry && !metaEntry.error) {
                        results.updating = true;
                        syncCMSDataToDB(params);
                    }
                }
            }

            // Remove meta entry
            results.data = results.data.filter((item) => !item._id.endsWith('meta'));

            // Special case for server-guide-config
            if (params.qstring._id === 'server-guide-config' && results.data && results.data[0]) {
                results.data[0].enableGuides = results.data[0].enableGuides || config.enableGuides;
            }

            common.returnOutput(params, results);
            return true;
        });

        return true;
    },

    /**
     * Get entries for a given API ID
     * @param params - params object
     * @returns true
     */
    getEntries: function(params: CmsParams): boolean {
        if (!params.qstring._id || !AVAILABLE_API_IDS.has(params.qstring._id)) {
            common.returnMessage(params, 400, 'Missing or incorrect API _id parameter');
            return false;
        }

        let query: Record<string, unknown> = { '_id': { '$regex': `^${params.qstring._id}` } };

        try {
            params.qstring.query = JSON.parse(params.qstring.query as string);
        }
        catch (ex) {
            params.qstring.query = undefined;
        }

        if (params.qstring.query) {
            query = {
                $and: [
                    { '_id': { '$regex': `^${params.qstring._id}` } },
                    {
                        $or: [
                            { '_id': `${params.qstring._id}_meta` },
                        ]
                    }
                ]
            };
            for (const cond in params.qstring.query as Record<string, unknown>) {
                const condition: Record<string, unknown> = {};
                condition[cond] = (params.qstring.query as Record<string, unknown>)[cond];
                (query.$and as Array<Record<string, unknown>>)[1].$or = (query.$and as Array<Record<string, unknown>>)[1].$or || [];
                ((query.$and as Array<Record<string, unknown>>)[1].$or as Array<Record<string, unknown>>).push(condition);
            }
            params.qstring.query = query;
        }

        common.db.collection('cms_cache').find(query).toArray(function(err: Error | null, entries: CmsEntry[]) {
            if (err) {
                common.returnMessage(params, 500, 'An error occured while fetching CMS entries from DB: ' + err);
                return false;
            }
            const results: { data: CmsEntry[] } = { data: entries || [] };

            // Remove meta entry
            results.data = results.data.filter((item) => !item._id.endsWith('meta'));

            // Special case for server-guide-config
            if (params.qstring._id === 'server-guide-config' && results.data && results.data[0]) {
                results.data[0].enableGuides = results.data[0].enableGuides || config.enableGuides;
            }

            common.returnOutput(params, results);
            return true;
        });

        return true;
    },

    /**
     * Clear cache for all API IDs
     * @param params - params object
     */
    clearCache: function(params: CmsParams): void {
        let query: Record<string, unknown> = {};
        if (params.qstring._id) {
            query = { '_id': { '$regex': `^${params.qstring._id}` } };
        }
        common.db.collection('cms_cache').deleteMany(query, function(err: Error | null) {
            if (err) {
                common.returnMessage(params, 500, 'An error occured while clearing CMS cache: ' + err);
            }
            else {
                common.returnMessage(params, 200, 'CMS cache cleared');
            }
        });
    }
};

export default cmsApi;
export type { CmsParams, CmsEntry, CmsApi };
