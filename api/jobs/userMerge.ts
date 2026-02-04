/**
 * User Merge Job
 * Handles user merging operations
 * @module api/jobs/userMerge
 */
import { createRequire } from 'module';
// @ts-expect-error TS1470 - import.meta works at runtime with Node 22+ native TS
const require = createRequire(import.meta.url);

import type { Db, Document, Collection } from 'mongodb';

const Job = require("../../jobServer/Job");
const plugins = require('../../plugins/pluginManager.ts');
const log = require('../utils/log.js')('job:userMerge');
const Promise = require("bluebird");
const usersApi = require('../parts/mgmt/app_users.js');

interface MergeDocument extends Document {
    _id: string;
    t?: number;
    merged_to?: string;
    u?: boolean;
    mc?: boolean;
    lu?: number;
}

interface AppUserDocument extends Document {
    _id: string;
    uid: string;
}

interface DataObj {
    list: MergeDocument[];
    pointer: number;
}

interface GetScheduleConfig {
    type: 'once' | 'schedule' | 'now' | 'manual';
    value?: string | Date;
}

type DoneCallback = (error?: Error | null) => void;
type ProgressCallback = (total: number, current: number, bookmark: string) => void;

// Extended collection type that supports callback patterns used in legacy code
type LegacyCollection = Collection & {
    find(filter?: object): { toArray(callback: (err: Error | null, docs: unknown[]) => void): void; limit(n: number): { toArray(callback: (err: Error | null, docs: unknown[]) => void): void } };
    deleteOne(filter: object, callback: (err: Error | null) => void): void;
    updateOne(filter: object, update: object, options: object, callback: (err: Error | null) => void): void;
    updateMany(filter: object, update: object, callback: (err: Error | null) => void): void;
};

const getMergeDoc = function(data: DataObj): MergeDocument | null {
    if (data && data.list && data.list.length > data.pointer) {
        const copy = data.pointer;
        data.pointer++;
        return data.list[copy];
    }
    else {
        return null;
    }
};


const handleMerges = function(db: Db, callback: (err?: Error | null) => void): void {
    log.d('looking for unfinished merges ...');
    let paralel_cn = plugins.getConfig("api").user_merge_paralel;
    try {
        paralel_cn = Number.parseInt(paralel_cn);
    }
    catch {
        paralel_cn = 1;
    }
    paralel_cn = Math.max(1, paralel_cn);

    const date = Math.round(Date.now() / 1000) - 1;//at least one second old merges
    let limit = 100;
    if (paralel_cn && paralel_cn > limit) {
        limit = paralel_cn;
    }

    /**
     * process merging
     * @param dataObj - data object
     * @param resolve - callback
     */
    function processMerging(dataObj: DataObj, resolve: () => void): void {
        const user = getMergeDoc(dataObj);
        if (user) {
            mergeUserData(user, function() {
                processMerging(dataObj, resolve);
            });
        }
        else {
            resolve();
        }
    }

    /**
     * merge user data
     * @param user - user object
     * @param resolve - callback
     */
    function mergeUserData(user: MergeDocument, resolve: () => void): void {
        const dd = user._id.split("_");
        const mergesCollection = db.collection('app_user_merges') as unknown as LegacyCollection;
        if (dd.length !== 3) {
            log.e("deleting unexpected document in merges with bad _id: " + user._id);
            mergesCollection.deleteOne({ "_id": user._id as unknown }, (err2: Error | null) => {
                if (err2) {
                    log.e("error deleting document in merges with bad _id: " + user._id);
                    log.e(err2);
                }
                resolve();
            });
        }
        else if (user.t && user.t > 100) {
            log.e("deleting document in merges with too many retries: " + user._id);
            mergesCollection.deleteOne({ "_id": user._id as unknown }, (err2: Error | null) => {
                if (err2) {
                    log.e("error deleting document in merges with _id: " + user._id);
                    log.e(err2);
                }
                resolve();
            });
        }
        else {
            const app_id = dd[0];
            const olduid = dd[2];
            //user document is not saved merged - try merging it at first
            if (user.merged_to) {
                if (!user.u) { //user documents are not merged. Could be just failed state.
                    log.e("user doc not saved as merged. Processing it.");
                    const usersCollection = db.collection('app_users' + app_id) as unknown as LegacyCollection;
                    (usersCollection as unknown as { find: (filter: object) => { toArray: (cb: (err: Error | null, docs: unknown[]) => void) => void } }).find({ "uid": { "$in": [olduid, user.merged_to] } }).toArray((err5: Error | null, docs: unknown[]) => {
                        const userDocs = docs as AppUserDocument[];
                        if (err5) {
                            log.e("error fetching users for merge", err5);
                            resolve();
                            return;
                        }
                        let oldAppUser: AppUserDocument | undefined;
                        let newAppUser: AppUserDocument | undefined;
                        if (userDocs) {
                            for (let z = 0; z < userDocs.length; z++) {
                                if (userDocs[z].uid === olduid) {
                                    oldAppUser = userDocs[z];
                                }
                                if (userDocs[z].uid === user.merged_to) {
                                    newAppUser = userDocs[z];
                                }
                            }
                        }
                        if (!oldAppUser && newAppUser) {
                            //old user was merged to new user, but state update failed - we can mark it as merged and process other plugins
                            usersApi.mergeOtherPlugins({ db: db, app_id: app_id, newAppUser: { uid: user.merged_to }, oldAppUser: { uid: olduid }, updateFields: { "mc": true, "cc": true, "u": true }, mergeDoc: user }, resolve);
                        }
                        if (!newAppUser) {
                            //new user do not exists - we can delete merging record
                            mergesCollection.deleteOne({ "_id": user._id as unknown }, (err4: Error | null) => {
                                if (err4) {
                                    log.e("error deleting document in merges with bad _id: " + user._id);
                                    log.e(err4);
                                }
                                resolve();
                            });
                        }
                        else if (oldAppUser && newAppUser) {
                            mergesCollection.updateOne({ "_id": user._id as unknown }, { "$inc": { "t": 1 } }, { upsert: false }, function(err0: Error | null) {
                                if (err0) {
                                    log.e(err0);
                                }
                                //Both documents exists. We can assume that documents were not merged
                                plugins.dispatch("/i/user_merge", {
                                    app_id: app_id,
                                    newAppUser: newAppUser,
                                    oldAppUser: oldAppUser
                                }, function() {
                                    //merge user data
                                    usersApi.mergeUserProperties(newAppUser, oldAppUser);
                                    //update new user

                                    usersCollection.updateOne({ _id: newAppUser._id as unknown }, { '$set': newAppUser }, {}, function(err6: Error | null) {
                                        //Dispatch to other plugins only after callback.
                                        if (!err6) {
                                            //update metric changes document
                                            const metricCol = db.collection("metric_changes" + app_id) as unknown as LegacyCollection;
                                            metricCol.updateMany({ uid: oldAppUser!.uid }, { '$set': { uid: newAppUser!.uid } }, function(err7: Error | null) {
                                                if (err7) {
                                                    log.e("Failed metric changes update in app_users merge", err7);
                                                }
                                            });
                                            //delete old app users document
                                            usersCollection.deleteOne({ _id: oldAppUser!._id as unknown }, function(errRemoving: Error | null) {
                                                if (errRemoving) {
                                                    log.e("Failed to remove merged user from database", errRemoving);
                                                }
                                                else {
                                                    usersApi.mergeOtherPlugins({ db: db, app_id: app_id, newAppUser: { uid: user.merged_to }, oldAppUser: { uid: olduid }, updateFields: { "cc": true, "u": true }, mergeDoc: user }, resolve);
                                                }
                                            });
                                        }
                                        else {
                                            resolve();//will retry after
                                        }
                                    });
                                });
                            });
                        }
                    });
                }
                else if (!user.mc) { //documents are merged, but metric changes and other plugins are not yet
                    mergesCollection.updateOne({ "_id": user._id as unknown }, { "$inc": { "t": 1 } }, { upsert: false }, function(err0: Error | null) {
                        if (err0) {
                            log.e(err0);
                        }
                        const metricCol = db.collection("metric_changes" + app_id) as unknown as LegacyCollection;
                        metricCol.updateMany({ uid: olduid }, { '$set': { uid: user.merged_to } }, function(err7: Error | null) {
                            if (err7) {
                                log.e("Failed metric changes update in app_users merge", err7);
                            }
                            else {
                                usersApi.mergeOtherPlugins({ db: db, app_id: app_id, newAppUser: { uid: user.merged_to }, oldAppUser: { uid: olduid }, updateFields: { "cc": true, "mc": true }, mergeDoc: user }, resolve);
                            }
                        });
                    });
                }
                else {
                    usersApi.mergeOtherPlugins({ db: db, app_id: app_id, newAppUser: { uid: user.merged_to }, oldAppUser: { uid: olduid }, updateFields: { "cc": true }, mergeDoc: user }, resolve);
                }
            }
            else {
                //delete invalid document
                mergesCollection.deleteOne({ "_id": user._id as unknown }, function(err5: Error | null) {
                    if (err5) {
                        log.e(err5);
                    }
                    resolve();
                });
            }
        }
    }

    const mergesCollection = db.collection('app_user_merges') as unknown as LegacyCollection;
    (mergesCollection as unknown as { find: (filter: object) => { limit: (n: number) => { toArray: (cb: (err: Error | null, docs: unknown[]) => void) => void } } }).find({ "lu": { "$lt": date } }).limit(limit).toArray(function(err: Error | null, mergedocs: unknown[]) {
        const mergeDocs = mergedocs as MergeDocument[];
        if (err) {
            callback(err);
        }
        if (mergeDocs && mergeDocs.length > 0) {
            const dataObj: DataObj = { 'list': mergeDocs, pointer: 0 };
            log.d('found ' + mergeDocs.length + ' unfinished merges');
            const promises: Promise<void>[] = [];

            for (let z = 0; z < paralel_cn; z++) {
                promises.push(new Promise((resolve: () => void) => {
                    processMerging(dataObj, resolve);
                }));
            }

            Promise.all(promises).then(() => {
                if (mergeDocs.length === limit) {
                    setTimeout(() => {
                        handleMerges(db, callback);
                    }, 0); //To do not grow stack.
                }
                else {
                    callback();
                }
            }).catch((errThrown: Error) => {
                log.e("finished with errors");
                log.e(errThrown);
                callback(errThrown);
            });
        }
        else {
            log.d('all users merged');
            callback();
        }
    });
};

/** Class for the user merging job **/
class UserMergeJob extends Job {

    /**
     * Get the schedule configuration for this job
     * @returns schedule configuration
     */
    getSchedule(): GetScheduleConfig {
        return {
            type: "schedule",
            value: "*/5 * * * *" // Every 5 minutes
        };
    }

    /**
     * Run the job
     * @param db - connection
     * @param done - callback
     * @param progressJob - callback when progress made
     */
    run(db: Db, done: DoneCallback, progressJob: ProgressCallback): void {
        const total = 0;
        const current = 0;
        const bookmark = "";

        let timeout: ReturnType<typeof setTimeout> | number = 0;

        /**
         * check job status periodically
         */
        function ping(): void {
            log.d('Pinging user merging job');
            if (timeout) {
                progressJob(total, current, bookmark);
                timeout = setTimeout(ping, 10000);
            }
        }
        /**
         * end job
         * @returns job done
         */
        function endJob(): void {
            log.d('Ending user merging job');
            clearTimeout(timeout as ReturnType<typeof setTimeout>);
            timeout = 0;
            return done();
        }
        timeout = setTimeout(ping, 10000);

        log.d('finishing up not finished merges merges...');
        plugins.loadConfigs(db, function() {
            handleMerges(db, () => {
                endJob();
            });
        });
    }
}

export default UserMergeJob;
