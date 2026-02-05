/**
 * TTL Cleanup Job
 * Cleans expired records inside TTL collections
 * @module api/jobs/ttlCleanup
 */
import { createRequire } from 'module';
// @ts-expect-error TS1470 - import.meta works at runtime with Node 22+ native TS
const require = createRequire(import.meta.url);

import type { Db } from 'mongodb';

const plugins = require('../../plugins/pluginManager.ts');
const common = require('../utils/common');
const log = require('../utils/log.js')('job:ttlCleanup');
const Job = require('../../jobServer/Job');

interface TTLCollectionConfig {
    db?: 'countly' | 'countly_drill' | 'countly_out';
    collection: string;
    property: string;
    expireAfterSeconds?: number;
}

interface GetScheduleConfig {
    type: 'once' | 'schedule' | 'now' | 'manual';
    value?: string | Date;
}

/**
 * Class for job of cleaning expired records inside ttl collections
 */
class TTLCleanup extends Job {

    /**
     * Get the schedule configuration for this job
     * @returns schedule configuration
     */
    getSchedule(): GetScheduleConfig {
        return {
            type: 'schedule',
            value: '* * * * *' // Every minute
        };
    }

    /**
     * Run the job
     */
    async run(): Promise<void> {
        log.d('Started running TTL clean up job');
        const ttlCollections = plugins.ttlCollections as TTLCollectionConfig[];
        for (let i = 0; i < ttlCollections.length; i++) {
            const {
                db = 'countly',
                collection,
                property,
                expireAfterSeconds = 0
            } = ttlCollections[i];
            let dbInstance: Db | undefined;
            switch (db) {
            case 'countly': dbInstance = common.db; break;
            case 'countly_drill': dbInstance = common.drillDb; break;
            case 'countly_out': dbInstance = common.outDb; break;
            }
            if (!dbInstance) {
                log.e('Invalid db selection:', db);
                continue;
            }

            log.d('Started cleaning up', collection);
            const result = await dbInstance.collection(collection).deleteMany({
                [property]: {
                    $lte: new Date(Date.now() - expireAfterSeconds * 1000)
                }
            });
            log.d('Finished cleaning up', result.deletedCount, 'records from', collection);

            // Sleep 1 second to prevent sending too many deleteMany queries
            await new Promise(res => setTimeout(res, 1000));
        }
        log.d('Finished running TTL clean up job');
    }
}

export default TTLCleanup;
