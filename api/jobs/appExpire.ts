/**
 * App Expire Job
 * Removes expired data with TTL indexes
 * @module api/jobs/appExpire
 */
import { createRequire } from 'module';
// @ts-expect-error TS1470 - import.meta works at runtime with Node 22+ native TS
const require = createRequire(import.meta.url);

import type { Db, ObjectId, Document, IndexDescription, Collection } from 'mongodb';

const async = require('async');
const plugins = require('../../plugins/pluginManager.ts');
const log = require('../utils/log.js')('job:appExpire');
const common = require('../utils/common.js');
const crypto = require('crypto');
const { Job } = require('../../jobServer');

interface Database extends Db {
    ObjectID(id: string): ObjectId;
}

interface AppDocument extends Document {
    _id: string | ObjectId;
    plugins?: Record<string, unknown>;
}

interface EventDocument extends Document {
    _id: ObjectId;
    list?: string[];
}

interface GetScheduleConfig {
    type: 'once' | 'schedule' | 'now' | 'manual';
    value?: string | Date;
}

type DoneCallback = (error?: Error | null) => void;

// Extended collection type that supports callback patterns used in legacy code
type LegacyCollection = Collection & {
    findOne(filter: object, options: object, callback: (err: Error | null, doc: unknown) => void): void;
    find(filter?: object, options?: object): { toArray(callback: (err: Error | null, docs: unknown[]) => void): void };
    indexes(callback: (err: Error | null, indexes: IndexDescription[]) => void): void;
    dropIndex(name: string, callback: (err: Error | null) => void): void;
    createIndex(spec: object, options: object, callback: (err: Error | null) => void): void;
};

/** Class for the app expire job **/
class AppExpireJob extends Job {

    /**
     * Determines if the job should be enabled when created
     * @public
     * @returns True if job should be enabled by default, false otherwise
     */
    getEnabled(): boolean {
        return false;
    }

    /**
     * Get schedule for the job
     * @returns Schedule configuration object
     */
    getSchedule(): GetScheduleConfig {
        return {
            type: 'schedule',
            value: '15 4 * * *' // every day at 4:15 AM
        };
    }

    /**
     * Run the job
     * @param database - connection
     * @param done - callback
     */
    run(database: Database, done: DoneCallback): void {
        log.d('Removing expired data ...');
        const drillDatabase = common.drillDb as Database;

        /**
         * clear expired data
         * @param app - app db document
         * @param callback - when processing finished
         */
        function clearExpiredData(app: AppDocument, callback: () => void): void {
            // convert day value to second
            const EXPIRE_AFTER: number = Number.parseInt(plugins.getConfig('api', app.plugins, true).data_retention_period) * 86400;
            const INDEX_NAME = 'cd_1';

            const collections: string[] = [];
            const events: string[] = ['[CLY]_session', '[CLY]_crash', '[CLY]_view', '[CLY]_action', '[CLY]_push_action', '[CLY]_push_sent', '[CLY]_star_rating', '[CLY]_nps', '[CLY]_survey', '[CLY]_consent'];
            const fromPlugins: string[] = plugins.getExpireList();

            // predefined drill events
            events.forEach(function(event: string) {
                collections.push('drill_events' + crypto.createHash('sha1').update(event + app._id).digest('hex'));
            });
            // collection list that exported from plugins
            fromPlugins.forEach(function(collection: string) {
                collections.push(collection + app._id);
            });

            const eventsCollection = database.collection('events') as unknown as LegacyCollection;
            eventsCollection.findOne({ '_id': database.ObjectID(app._id as string) }, { projection: { list: 1 } }, function(err: Error | null, eventData: unknown) {
                const eventDoc = eventData as EventDocument | null;
                if (eventDoc && eventDoc.list) {
                    for (let i = 0; i < eventDoc.list.length; i++) {
                        collections.push('drill_events' + crypto.createHash('sha1').update(eventDoc.list[i] + app._id).digest('hex'));
                    }
                }
                /**
                * Iterate event cleaning process
                * @param collection - target collection name
                * @param next - iteration callback
                */
                function eventIterator(collectionName: string, next: () => void): void {
                    log.d('processing', collectionName);
                    const drillCol = drillDatabase.collection(collectionName) as unknown as LegacyCollection;
                    drillCol.indexes(function(drillIndexErr: Error | null, indexes: IndexDescription[]) {
                        if (!drillIndexErr && indexes) {
                            let hasIndex = false;
                            let dropIndex = false;
                            for (let j = 0; j < indexes.length; j++) {
                                if (indexes[j].name === INDEX_NAME) {
                                    if ((indexes[j] as { expireAfterSeconds?: number }).expireAfterSeconds === EXPIRE_AFTER) {
                                        //print("skipping", c)
                                        hasIndex = true;
                                    }
                                    //has index but incorrect expire time, need to be reindexed
                                    else {
                                        dropIndex = true;
                                    }
                                    break;
                                }
                            }
                            if (EXPIRE_AFTER === 0 || dropIndex) {
                                log.d('dropping index', collectionName);
                                drillCol.dropIndex(INDEX_NAME, function() {
                                    if (EXPIRE_AFTER === 0) {
                                        next();
                                    }
                                    else {
                                        log.d('creating index', collectionName);
                                        drillCol.createIndex({ 'cd': 1 }, { expireAfterSeconds: EXPIRE_AFTER, 'background': true }, function() {
                                            next();
                                        });
                                    }
                                });
                            }
                            else if (!hasIndex) {
                                log.d('creating index', collectionName);
                                drillCol.createIndex({ 'cd': 1 }, { expireAfterSeconds: EXPIRE_AFTER, 'background': true }, function() {
                                    next();
                                });
                            }
                            else {
                                next();
                            }
                        }
                        else {
                            next();
                        }
                    });
                }
                async.eachSeries(collections, eventIterator, function() {
                    callback();
                });
            });
        }

        const appsCollection = database.collection('apps') as unknown as LegacyCollection;
        (appsCollection.find as (filter: object, options: object) => { toArray: (callback: (err: Error | null, docs: unknown[]) => void) => void })({}, { projection: { _id: 1, plugins: 1 } }).toArray(function(appsErr: Error | null, apps: unknown[]) {
            const appDocs = apps as AppDocument[];
            if (!appsErr && appDocs && appDocs.length > 0) {
                async.eachSeries(appDocs, clearExpiredData, function() {
                    log.d('Clearing data finished ...');
                    done();
                });
            }
            else {
                done(appsErr);
            }
        });
    }
}

export default AppExpireJob;
