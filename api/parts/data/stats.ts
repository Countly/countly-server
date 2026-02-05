/**
 * This module retrieves some stats from server
 * @module api/parts/data/stats
 */

import type { ObjectId } from 'mongodb';
import { createRequire } from 'module';

// createRequire needed for CJS modules without ES exports
// @ts-expect-error TS1470 - import.meta is valid at runtime (Node 22 treats .ts with imports as ESM)
const require = createRequire(import.meta.url);
const async = require('async');
const common = require('../../utils/common.js');
const { getUserApps } = require('../../utils/rights.js');

/**
 * Cursor interface for MongoDB operations
 */
interface Cursor<T> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toArray(callback: (err: Error | null, docs: any) => void): void;
    toArray(): Promise<T[]>;
}

/**
 * Collection interface for MongoDB operations
 */
interface Collection<T = unknown> {
    find(query: Record<string, unknown>, options?: { projection?: Record<string, unknown> }): Cursor<T>;
    aggregate(pipeline: unknown[]): Cursor<T>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    estimatedDocumentCount(callback: (err: Error | null, count: any) => void): void;
    estimatedDocumentCount(): Promise<number>;
}

/**
 * Database interface
 */
interface Database {
    ObjectID: (id: string) => ObjectId;
    collection<T = unknown>(name: string): Collection<T>;
}

/**
 * Member interface
 */
interface Member {
    global_admin?: boolean;
    [key: string]: unknown;
}

/**
 * App interface
 */
interface App {
    _id: string | ObjectId;
}

/**
 * Overall stats interface
 */
interface OverallStats {
    'total-users': number;
    'total-apps': number;
    'total-events': number;
    'total-msg-users': number;
    'total-msg-created': number;
    'total-msg-sent': number;
}

/**
 * Server stats interface
 */
interface ServerStats {
    app_users: number;
    apps: number;
    users: number;
}

/**
 * User stats interface
 */
interface UserStats {
    'total-events': number;
    'total-msg-sent': number;
    'total-crash-groups': number;
    'total-platforms': string[];
    'total-users': number;
}

let countlyDb: Database;

const stats: {
    getOverall: (db: Database, callback: (stats: OverallStats) => void) => void;
    getServer: (db: Database, callback: (stats: ServerStats) => void) => void;
    getUser: (db: Database, user: Member, callback: (stats: UserStats) => void) => void;
} = {
    /**
     * Get overall server data
     * @param db - database connection
     * @param callback - function to call when done
     */
    getOverall: function(db: Database, callback: (stats: OverallStats) => void): void {
        countlyDb = db;
        getTotalUsers(function(totalUsers: number, totalApps: number) {
            getTotalEvents(function(totalEvents: number) {
                getTotalMsgUsers(function(totalMsgUsers: number) {
                    getTotalMsgCreated(function(totalMsgCreated: number) {
                        getTotalMsgSent(function(totalMsgSent: number) {
                            callback({
                                'total-users': totalUsers,
                                'total-apps': totalApps,
                                'total-events': totalEvents,
                                'total-msg-users': totalMsgUsers,
                                'total-msg-created': totalMsgCreated,
                                'total-msg-sent': totalMsgSent
                            });
                        });
                    });
                });
            });
        });
    },

    /**
     * Get minimal server data
     * @param db - database connection
     * @param callback - function to call when done
     */
    getServer: function(db: Database, callback: (stats: ServerStats) => void): void {
        countlyDb = db;
        getTotalUsers(function(totalAppUsers: number, totalApps: number) {
            getDashboardUsers(function(totalUsers: number) {
                callback({
                    'app_users': totalAppUsers,
                    'apps': totalApps,
                    'users': totalUsers
                });
            });
        });
    },

    /**
     * Get overall user data
     * @param db - database connection
     * @param user - members document from db
     * @param callback - function to call when done
     */
    getUser: function(db: Database, user: Member, callback: (stats: UserStats) => void): void {
        countlyDb = db;
        let apps: string[] | undefined;

        if (!user.global_admin) {
            apps = getUserApps(user) || [];
        }

        getTotalEvents(function(totalEvents: number) {
            getTotalMsgSent(function(totalMsgSent: number) {
                getCrashGroups(function(totalCrashgroups: number) {
                    getAllPlatforms(function(platforms: string[]) {
                        getTotalUsers(function(userCount: number) {
                            callback({
                                'total-events': totalEvents,
                                'total-msg-sent': totalMsgSent,
                                'total-crash-groups': totalCrashgroups,
                                'total-platforms': platforms,
                                'total-users': userCount
                            });
                        }, apps);
                    }, apps);
                }, apps);
            }, apps);
        }, apps);
    }
};

/**
 * Get total users for all apps
 * @param callback - function to call when done
 * @param apps - provide array of apps to fetch data for, else will fetch data for all apps
 */
function getTotalUsers(callback: (totalUsers: number, totalApps: number) => void, apps?: string[]): void {
    /**
     * Process app result
     * @param err - database error
     * @param allApps - array of apps
     */
    function processApps(err: Error | null, allApps: App[] | null): void {
        if (err || !allApps) {
            callback(0, 0);
        }
        else {
            async.map(allApps, getUserCountForApp, function(err2: Error | null, results: number[]) {
                if (err2) {
                    callback(0, 0);
                }

                let userCount = 0;

                for (let i = 0; i < results.length; i++) {
                    userCount += results[i] || 0;
                }

                callback(userCount, allApps.length);
            });
        }
    }
    if (apps !== undefined) {
        async.map(apps, function(app: string, done: (err: Error | null, count: number) => void) {
            getUserCountForApp({ _id: app }, done);
        }, function(err: Error | null, results: number[]) {
            if (err) {
                callback(0, 0);
            }

            let userCount = 0;

            for (let i = 0; i < results.length; i++) {
                userCount += results[i] || 0;
            }

            callback(userCount, apps.length);
        });
    }
    else {
        if (common.readBatcher) {
            common.readBatcher.getMany('apps', {}, { _id: 1 }, processApps);
        }
        else {
            countlyDb.collection('apps').find({}, { projection: { _id: 1 } }).toArray(processApps);
        }
    }
}

/**
 * Get total events for all apps
 * @param callback - function to call when done
 * @param apps - provide array of apps to fetch data for, else will fetch data for all apps
 */
function getTotalEvents(callback: (total: number) => void, apps?: string[]): void {
    const query: Record<string, unknown> = {};
    if (apps !== undefined) {
        const inarray: ObjectId[] = [];
        for (let i = 0; i < apps.length; i++) {
            if (apps[i] && apps[i].length > 0) {
                inarray.push(countlyDb.ObjectID(apps[i]));
            }
        }
        query._id = { $in: inarray };
    }
    countlyDb.collection('events').aggregate([{ $match: query }, { $project: { len: { $size: '$list' } } }, { $group: { _id: 'count', len: { $sum: '$len' } } }]).toArray(function(err: Error | null, count: Array<{ len: number }> | null) {
        callback(count && count[0] && count[0].len || 0);
    });
}

/**
 * Get total messaging users for all apps
 * @param callback - function to call when done
 */
function getTotalMsgUsers(callback: (total: number) => void): void {
    countlyDb.collection('users').find({ _id: { '$regex': '.*:0.*' } }, { projection: { 'd.m': 1 } }).toArray(function(err: Error | null, msgUsers: Array<{ d?: { m?: number } }> | null) {
        if (err || !msgUsers) {
            callback(0);
        }
        else {
            let msgUserCount = 0;

            for (let i = 0; i < msgUsers.length; i++) {
                if (msgUsers[i] && msgUsers[i].d && msgUsers[i].d!.m) {
                    msgUserCount += msgUsers[i].d!.m!;
                }
            }

            callback(msgUserCount);
        }
    });
}

/**
 * Get total messages for all apps
 * @param callback - function to call when done
 */
function getTotalMsgCreated(callback: (total: number) => void): void {
    countlyDb.collection('messages').estimatedDocumentCount(function(err: Error | null, msgCreated: number) {
        if (err || !msgCreated) {
            callback(0);
        }
        else {
            callback(msgCreated);
        }
    });
}

/**
 * Get total messages sent for all apps
 * @param callback - function to call when done
 * @param apps - provide array of apps to fetch data for, else will fetch data for all apps
 */
function getTotalMsgSent(callback: (total: number) => void, apps?: string[]): void {
    const query: Record<string, unknown> = {};
    if (apps !== undefined) {
        const inarray: ObjectId[] = [];
        for (let i = 0; i < apps.length; i++) {
            if (apps[i] && apps[i].length > 0) {
                inarray.push(countlyDb.ObjectID(apps[i]));
            }
        }
        query.apps = { $in: inarray };
    }
    countlyDb.collection('messages').aggregate([{ $match: query }, { $group: { _id: 'count', sent: { $sum: '$result.sent' } } }]).toArray(function(err: Error | null, count: Array<{ sent: number }> | null) {
        callback(count && count[0] && count[0].sent || 0);
    });
}

/**
 * Get total user count for app
 * @param app - app document from db
 * @param callback - function to call when done
 */
function getUserCountForApp(app: App, callback: (err: Error | null, count: number) => void): void {
    countlyDb.collection('app_users' + app._id).estimatedDocumentCount(function(err: Error | null, count: number) {
        if (err || !count) {
            callback(null, 0);
        }
        else {
            callback(null, count);
        }
    });
}

/**
 * Get dashboard user count
 * @param callback - function to call when done
 */
function getDashboardUsers(callback: (count: number) => void): void {
    countlyDb.collection('members').estimatedDocumentCount(function(err: Error | null, count: number) {
        if (err || !count) {
            callback(0);
        }
        else {
            callback(count);
        }
    });
}

/**
 * Get total crash count for app
 * @param app - app id string
 * @param callback - function to call when done
 */
function getCrashGroupsForApp(app: string, callback: (err: Error | null, count: number) => void): void {
    countlyDb.collection('app_crashgroups' + app).estimatedDocumentCount(function(err: Error | null, count: number) {
        if (err || !count) {
            callback(null, 0);
        }
        else {
            callback(null, count);
        }
    });
}

/**
 * Get total unique crashes count for app
 * @param callback - function to call when done
 * @param apps - provide array of apps to fetch data for, else will fetch data for all apps
 */
function getCrashGroups(callback: (total: number, appCount?: number) => void, apps?: string[]): void {
    if (apps !== undefined) {
        async.map(apps, getCrashGroupsForApp, function(err: Error | null, results: number[]) {
            if (err) {
                callback(0, 0);
            }

            let userCount = 0;

            for (let i = 0; i < results.length; i++) {
                userCount += results[i];
            }

            callback(userCount, apps.length);
        });
    }
    else {
        countlyDb.collection('apps').find({}, { projection: { _id: 1 } }).toArray(function(err: Error | null, allApps: App[] | null) {
            if (err || !allApps) {
                callback(0, 0);
            }
            else {
                async.map(allApps, function(app: App, done: (err: Error | null, count: number) => void) {
                    getCrashGroupsForApp(app._id as string, done);
                }, function(err2: Error | null, results: number[]) {
                    if (err2) {
                        callback(0, 0);
                    }

                    let userCount = 0;

                    for (let i = 0; i < results.length; i++) {
                        userCount += results[i];
                    }

                    callback(userCount, allApps.length);
                });
            }
        });
    }
}

/**
 * Get all platforms for apps
 * @param callback - function to call when done
 * @param apps - provide array of apps to fetch data for, else will fetch data for all apps
 */
function getAllPlatforms(callback: (platforms: string[]) => void, apps?: string[]): void {
    countlyDb.collection('device_details').find({ _id: { '$regex': '.*:0.*' } }, {
        projection: {
            'a': 1,
            'meta': 1
        }
    }).toArray(function(err: Error | null, arr: Array<{ a?: string; meta?: { os?: string[] } }> | null) {
        if (err || !arr) {
            callback([]);
        }
        else {
            const platforms: Record<string, boolean> = {};

            for (let i = 0; i < arr.length; i++) {
                if (arr[i] && arr[i].meta && arr[i].meta!.os && (apps === undefined || apps.includes(arr[i].a!))) {
                    for (let j = 0; j < arr[i].meta!.os!.length; j++) {
                        platforms[arr[i].meta!.os![j]] = true;
                    }
                }
            }

            callback(Object.keys(platforms));
        }
    });
}

export default stats;
export { stats };
export type { OverallStats, ServerStats, UserStats, Member, App, Database };
