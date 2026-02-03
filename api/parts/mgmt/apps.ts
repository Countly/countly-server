/**
 * This module is meant for managing apps
 * @module api/parts/mgmt/apps
 */

import crypto from 'crypto';
import fs from 'fs';
import { createRequire } from 'module';

// createRequire needed for CJS modules without ES exports
// @ts-expect-error TS1470 - import.meta is valid at runtime (Node 22 treats .ts with imports as ESM)
const require = createRequire(import.meta.url);
const common = require('../../utils/common.js');
const moment = require('moment-timezone');
const plugins = require('../../../plugins/pluginManager.js');
const jimp = require('jimp');
const { hasUpdateRight, hasDeleteRight, getUserApps, getAdminApps } = require('../../utils/rights.js');
const countlyFs = require('../../utils/countlyFs.js');
const taskmanager = require('../../utils/taskmanager.js');
const { timezoneValidation } = require('../../utils/timezones.js');

const log = common.log('mgmt:apps') as { d: (...args: unknown[]) => void; e: (...args: unknown[]) => void; w: (...args: unknown[]) => void };

const FEATURE_NAME = 'global_applications';

/**
 * Member interface
 */
interface Member {
    _id: string;
    global_admin: boolean;
    email?: string;
    full_name?: string;
    username?: string;
}

/**
 * Params interface for app operations
 */
interface AppParams {
    qstring: {
        app_id?: string;
        args?: Record<string, unknown>;
        name?: string;
        period?: string;
    };
    member: Member;
    app?: AppDocument;
    app_id?: string;
    files?: {
        app_image?: {
            path: string;
            type: string;
        };
    };
}

/**
 * App document interface
 */
interface AppDocument {
    _id: string;
    name: string;
    key: string;
    country?: string;
    timezone?: string;
    category?: string;
    type?: string;
    owner?: string;
    owner_id?: string;
    salt?: string;
    checksum_salt?: string;
    created_at?: number;
    edited_at?: number;
    plugins?: Record<string, unknown>;
    last_data?: number;
    seq?: number;
    has_image?: boolean;
    locked?: boolean;
}

/**
 * Argument properties for validation
 */
interface ArgProps {
    [key: string]: {
        required: boolean;
        type?: string;
        'min-length'?: number;
        'max-length'?: number;
        'exclude-from-ret-obj'?: boolean;
    };
}

/**
 * Apps API interface
 */
interface AppsApi {
    getAllApps: (params: AppParams) => boolean;
    getCurrentUserApps: (params: AppParams) => boolean;
    getAppsDetails: (params: AppParams) => boolean;
    createApp: (params: AppParams) => Promise<boolean | undefined>;
    updateApp: (params: AppParams) => boolean;
    getAppPlugins: (params: AppParams) => Promise<boolean>;
    updateAppPlugins: (params: AppParams) => boolean;
    deleteApp: (params: AppParams) => boolean;
    resetApp: (params: AppParams) => boolean;
}

/**
 * Upload app icon function
 * @param params - params object with args to create app
 * @returns promise object
 */
async function iconUpload(params: AppParams): Promise<void> {
    const appId = params.app_id || common.sanitizeFilename((params.qstring.args as Record<string, string>)?.app_id);
    if (params.files && params.files.app_image) {
        const tmp_path = params.files.app_image.path;
        const target_path = __dirname + '/../../../frontend/express/public/appimages/' + appId + '.png';
        const type = params.files.app_image.type;

        if (type !== 'image/png' && type !== 'image/gif' && type !== 'image/jpeg') {
            fs.unlink(tmp_path, function() {});
            log.d('Invalid file type');
            throw undefined;
        }
        try {
            const icon = await jimp.Jimp.read(tmp_path);
            const buffer = await icon.cover({ h: 72, w: 72 }).getBuffer(jimp.JimpMime.png);
            countlyFs.saveData('appimages', target_path, buffer, { id: appId + '.png', writeMode: 'overwrite' }, function(err3: Error | null) {
                if (err3) {
                    log.e(err3, (err3 as Error & { stack: string }).stack);
                }
            });
        }
        catch (e) {
            console.log('Problem uploading app icon', e);
        }
        fs.unlink(tmp_path, function() {});
    }
}

/**
 * Converts apps array into object with app_id as key
 * @param apps - array of apps documents
 * @returns object with app_id as key and app doc as value
 */
function packApps(apps: AppDocument[]): Record<string, Partial<AppDocument>> {
    const appsObj: Record<string, Partial<AppDocument>> = {};

    for (let i = 0; i < apps.length; i++) {
        appsObj[apps[i]._id] = {
            '_id': apps[i]._id,
            'category': apps[i].category,
            'country': apps[i].country,
            'key': apps[i].key,
            'name': apps[i].name,
            'timezone': apps[i].timezone,
            'salt': apps[i].salt || apps[i].checksum_salt || '',
        };
    }

    return appsObj;
}

/**
 * Validate and correct app's properties, by modifying original object
 * @param app - app document
 */
function processAppProps(app: Partial<AppDocument>): void {
    if (!app.country || !isValidCountry(app.country)) {
        app.country = plugins.getConfig('apps').country;
    }

    if (!app.timezone || !isValidTimezone(app.timezone)) {
        app.timezone = plugins.getConfig('apps').timezone;
    }

    if (!app.category || !isValidCategory(app.category)) {
        app.category = plugins.getConfig('apps').category;
    }

    if (!app.type || !isValidType(app.type)) {
        app.type = 'mobile';
    }
}

/**
 * Validate and correct an app update's properties
 * @param app - app update document
 * @returns invalidProps - keys of invalid properties
 */
function validateAppUpdateProps(app: Partial<AppDocument>): string[] {
    const invalidProps: string[] = [];

    if (app.country && !isValidCountry(app.country)) {
        invalidProps.push('country');
    }

    if (app.timezone && !isValidTimezone(app.timezone)) {
        invalidProps.push('timezone');
    }

    if (app.category && !isValidCategory(app.category)) {
        invalidProps.push('category');
    }

    if (app.type && !isValidType(app.type)) {
        invalidProps.push('type');
    }

    return invalidProps;
}

/**
 * Validate timezone
 * @param timezone - timezone value
 * @returns if timezone was valid or not
 */
function isValidTimezone(timezone: string): boolean {
    return timezoneValidation.includes(timezone);
}

/**
 * Validate category
 * @param category - category value
 * @returns if category was valid or not
 */
function isValidCategory(category: string): boolean {
    const categories = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'];
    return categories.includes(category);
}

/**
 * Validate app type
 * @param type - type value
 * @returns if type was valid or not
 */
function isValidType(type: string): boolean {
    return plugins.appTypes.includes(type) && plugins.isPluginEnabled(type);
}

/**
 * Validate country
 * @param country - country value
 * @returns if country was valid or not
 */
function isValidCountry(country: string): boolean {
    const countries = ['AF', 'AX', 'AL', 'DZ', 'AS', 'AD', 'AO', 'AI', 'AQ', 'AG', 'AR', 'AM', 'AW', 'AU', 'AT', 'AZ', 'BS', 'BH', 'BD', 'BB', 'BY', 'BE', 'BZ', 'BJ', 'BM', 'BT', 'BO', 'BQ', 'BA', 'BW', 'BV', 'BR', 'IO', 'BN', 'BG', 'BF', 'BI', 'KH', 'CM', 'CA', 'CV', 'KY', 'CF', 'TD', 'CL', 'CN', 'CX', 'CC', 'CO', 'KM', 'CG', 'CD', 'CK', 'CR', 'CI', 'HR', 'CU', 'CW', 'CY', 'CZ', 'DK', 'DJ', 'DM', 'DO', 'EC', 'EG', 'SV', 'GQ', 'ER', 'EE', 'ET', 'FK', 'FO', 'FJ', 'FI', 'FR', 'GF', 'PF', 'TF', 'GA', 'GM', 'GE', 'DE', 'GH', 'GI', 'GR', 'GL', 'GD', 'GP', 'GU', 'GT', 'GG', 'GN', 'GW', 'GY', 'HT', 'HM', 'VA', 'HN', 'HK', 'HU', 'IS', 'IN', 'ID', 'IR', 'IQ', 'IE', 'IM', 'IL', 'IT', 'JM', 'JP', 'JE', 'JO', 'KZ', 'KE', 'KI', 'KP', 'KR', 'KW', 'KG', 'LA', 'LV', 'LB', 'LS', 'LR', 'LY', 'LI', 'LT', 'LU', 'MO', 'MK', 'MG', 'MW', 'MY', 'MV', 'ML', 'MT', 'MH', 'MQ', 'MR', 'MU', 'YT', 'MX', 'FM', 'MD', 'MC', 'MN', 'ME', 'MS', 'MA', 'MZ', 'MM', 'NA', 'NR', 'NP', 'NL', 'NC', 'NZ', 'NI', 'NE', 'NG', 'NU', 'NF', 'MP', 'NO', 'OM', 'PK', 'PW', 'PS', 'PA', 'PG', 'PY', 'PE', 'PH', 'PN', 'PL', 'PT', 'PR', 'QA', 'RE', 'RO', 'RU', 'RW', 'BL', 'SH', 'KN', 'LC', 'MF', 'PM', 'VC', 'WS', 'SM', 'ST', 'SA', 'SN', 'RS', 'SC', 'SL', 'SG', 'SX', 'SK', 'SI', 'SB', 'SO', 'ZA', 'GS', 'SS', 'ES', 'LK', 'SD', 'SR', 'SJ', 'SZ', 'SE', 'CH', 'SY', 'TW', 'TJ', 'TZ', 'TH', 'TL', 'TG', 'TK', 'TO', 'TT', 'TN', 'TR', 'TM', 'TC', 'TV', 'UG', 'UA', 'AE', 'GB', 'US', 'UM', 'UY', 'UZ', 'VU', 'VE', 'VN', 'VG', 'VI', 'WF', 'EH', 'YE', 'ZM', 'ZW'];
    return countries.includes(country);
}

/**
 * Check if APP KEY is unique before updating app
 * @param params - params object
 * @param callback - callback to update app
 * @param update - true when updating app, false when creating new app
 */
function checkUniqueKey(params: AppParams, callback: () => void, update: boolean): void {
    if (!(params.qstring.args as Record<string, string>)?.key) {
        callback();
    }
    else {
        const query: Record<string, unknown> = { key: (params.qstring.args as Record<string, string>).key };
        if (update) {
            query._id = { $ne: common.db.ObjectID((params.qstring.args as Record<string, string>).app_id + '') };
        }
        common.db.collection('apps').findOne(query, function(error: Error | null, keyExists: AppDocument | null) {
            if (keyExists) {
                common.returnMessage(params, 400, 'App key already in use');
                return false;
            }
            else {
                callback();
            }
        });
    }
}

/**
 * Deletes long tasks for app
 * @param appId - id of the app for which to delete data
 */
function deleteAppLongTasks(appId: string): void {
    common.db.collection('long_tasks').find({ 'app_id': appId + '' }).toArray(function(err: Error | null, res: Array<{ _id: string }>) {
        for (let k = 0; k < res.length; k++) {
            taskmanager.deleteResult({ id: res[k]._id, db: common.db }, function() {});
        }
    });
}

/**
 * Deletes all app's data or resets data to clean state
 * @param appId - id of the app for which to delete data
 * @param fromAppDelete - true if all document will also be deleted
 * @param params - params object
 * @param app - app document
 */
function deleteAllAppData(appId: string, fromAppDelete: boolean, params: AppParams, app: AppDocument): void {
    if (!fromAppDelete) {
        common.db.collection('apps').update({ '_id': common.db.ObjectID(appId) }, { $set: { seq: 0 } }, function() {});
    }
    common.db.collection('users').remove({ '_id': { $regex: '^' + appId + '.*' } }, function() {});
    common.db.collection('carriers').remove({ '_id': { $regex: '^' + appId + '.*' } }, function() {});
    common.db.collection('devices').remove({ '_id': { $regex: '^' + appId + '.*' } }, function() {});
    common.db.collection('device_details').remove({ '_id': { $regex: '^' + appId + '.*' } }, function() {});
    common.db.collection('cities').remove({ '_id': { $regex: '^' + appId + '.*' } }, function() {});
    common.db.collection('top_events').remove({ 'app_id': common.db.ObjectID(appId) }, function() {});
    common.db.collection('app_user_merges').remove({ '_id': { $regex: '^' + appId + '_.*' } }, function() {});

    plugins.dispatch('/core/delete_granular_data', { query: { 'a': appId + '' }, 'db': 'countly_drill', 'collection': 'drill_events' }, function() {});
    deleteAppLongTasks(appId);

    /**
     * Deletes all app's events
     */
    function deleteEvents(): void {
        common.db.collection('events_data').remove({ '_id': { '$regex': '^' + appId + '_.*' } }, function() {
            if (fromAppDelete || (params.qstring.args as Record<string, string>)?.period === 'reset') {
                common.db.collection('events').remove({ '_id': common.db.ObjectID(appId) }, function() {});
            }
        });
        common.drillDb.collection('drill_meta').remove({ '_id': { '$regex': '^' + appId } }, function() {});
    }

    common.db.collection('app_users' + appId).drop(function() {
        if (!fromAppDelete) {
            common.db.collection('app_user_merges' + appId).drop(function() {});
            if ((params.qstring.args as Record<string, string>)?.period === 'reset') {
                plugins.dispatch('/i/apps/reset', {
                    params: params,
                    appId: appId,
                    data: app
                }, deleteEvents);
            }
            else {
                plugins.dispatch('/i/apps/clear_all', {
                    params: params,
                    appId: appId,
                    data: app
                }, deleteEvents);
            }
        }
        else {
            common.db.collection('app_user_merges' + appId).drop(function() {});
            plugins.dispatch('/i/apps/delete', {
                params: params,
                appId: appId,
                data: app
            }, deleteEvents);
        }
    });

    if (fromAppDelete) {
        common.db.collection('notes').remove({ 'app_id': appId }, function() {});
    }
}

/**
 * Deletes app's data for specific period
 * @param appId - id of the app for which to delete data
 * @param fromAppDelete - true if all document will also be deleted
 * @param params - params object
 * @param app - app document
 */
function deletePeriodAppData(appId: string, fromAppDelete: boolean, params: AppParams, app: AppDocument): void {
    const periods: Record<string, number> = {
        '1month': 1,
        '3month': 3,
        '6month': 6,
        '1year': 12,
        '2year': 24
    };
    const back = periods[(params.qstring.args as Record<string, string>)?.period || ''];
    const skip: Record<string, boolean> = {};
    const dates: Record<string, boolean> = {};
    const now = moment();

    skip[appId + '_' + now.format('YYYY:M')] = true;
    skip[appId + '_' + now.format('YYYY') + ':0'] = true;
    dates[now.format('YYYY:M')] = true;
    dates[now.format('YYYY') + ':0'] = true;

    for (let i = 0; i < common.base64.length; i++) {
        skip[appId + '_' + now.format('YYYY:M') + '_' + common.base64[i]] = true;
        skip[appId + '_' + now.format('YYYY') + ':0' + '_' + common.base64[i]] = true;
        dates[now.format('YYYY:M') + '_' + common.base64[i]] = true;
        dates[now.format('YYYY') + ':0' + '_' + common.base64[i]] = true;
    }

    for (let i = 0; i < back; i++) {
        skip[appId + '_' + now.subtract(1, 'months').format('YYYY:M')] = true;
        skip[appId + '_' + now.format('YYYY') + ':0'] = true;
        dates[now.format('YYYY:M')] = true;
        dates[now.format('YYYY') + ':0'] = true;
        for (let j = 0; j < common.base64.length; j++) {
            skip[appId + '_' + now.format('YYYY:M') + '_' + common.base64[j]] = true;
            skip[appId + '_' + now.format('YYYY') + ':0' + '_' + common.base64[j]] = true;
            dates[now.format('YYYY:M') + '_' + common.base64[j]] = true;
            dates[now.format('YYYY') + ':0' + '_' + common.base64[j]] = true;
        }
    }

    const oldestTimestampWanted = Math.round(now.valueOf() / 1000);
    const skipArr = Object.keys(skip);
    const datesArr = Object.keys(dates);

    common.db.collection('users').remove({ $and: [{ '_id': { $regex: appId + '.*' } }, { '_id': { $nin: skipArr } }] }, function() {});
    common.db.collection('carriers').remove({ $and: [{ '_id': { $regex: appId + '.*' } }, { '_id': { $nin: skipArr } }] }, function() {});
    common.db.collection('devices').remove({ $and: [{ '_id': { $regex: appId + '.*' } }, { '_id': { $nin: skipArr } }] }, function() {});
    common.db.collection('device_details').remove({ $and: [{ '_id': { $regex: appId + '.*' } }, { '_id': { $nin: skipArr } }] }, function() {});
    common.db.collection('cities').remove({ $and: [{ '_id': { $regex: appId + '.*' } }, { '_id': { $nin: skipArr } }] }, function() {});

    plugins.dispatch('/core/delete_granular_data', {
        query: { 'a': appId, 'ts': { $lt: (oldestTimestampWanted * 1000) } },
        db: 'countly_drill',
        collection: 'drill_events'
    }, function() {});

    common.db.collection('events').findOne({ '_id': common.db.ObjectID(appId) }, function(err: Error | null, events: { list?: string[]; segments?: Record<string, string[]> } | null) {
        if (!err && events && events.list) {
            common.arrayAddUniq(events.list, plugins.internalEvents);
            for (let i = 0; i < events.list.length; i++) {
                let segments: string[] = [];

                if (events.list[i] && events.segments && events.segments[events.list[i]]) {
                    segments = events.segments[events.list[i]];
                }

                const collectionNameWoPrefix = crypto.createHash('sha1').update(events.list[i] + appId).digest('hex');
                segments.push('no-segment');
                const docs: string[] = [];
                for (let j = 0; j < segments.length; j++) {
                    for (let k = 0; k < datesArr.length; k++) {
                        docs.push(appId + '_' + collectionNameWoPrefix + '_' + segments[j] + '_' + datesArr[k]);
                    }
                }
                const collectionNameWoPrefix2 = crypto.createHash('sha1').update(events.list[i] + appId).digest('hex');
                common.db.collection('events_data').remove({ '$and': [{ '_id': { '$regex': '^' + appId + '_' + collectionNameWoPrefix2 + '_.*' } }, { '_id': { $nin: docs } }] }, function() {});
            }
        }
    });

    common.db.collection('app_users' + appId).update({ ls: { $lte: oldestTimestampWanted } }, { $set: { ls: 1 } }, function() {});

    plugins.dispatch('/i/apps/clear', {
        params: params,
        appId: appId,
        data: app,
        moment: now,
        dates: datesArr,
        ids: skipArr
    });
}

/**
 * Deletes app's data, either all or for specific period, as well as can reset data to clean state
 * @param appId - id of the app for which to delete data
 * @param fromAppDelete - true if all document will also be deleted
 * @param params - params object
 * @param app - app document
 */
function deleteAppData(appId: string, fromAppDelete: boolean, params: AppParams, app: AppDocument): void {
    if (fromAppDelete || (params.qstring.args as Record<string, string>)?.period === 'all' || (params.qstring.args as Record<string, string>)?.period === 'reset') {
        deleteAllAppData(appId, fromAppDelete, params, app);
    }
    else {
        deletePeriodAppData(appId, fromAppDelete, params, app);
    }
}

const appsApi: AppsApi = {
    /**
     * Get all apps and outputs to browser, requires global admin permission
     * @param params - params object
     * @returns true if got data from db, false if did not
     */
    getAllApps: function(params: AppParams): boolean {
        common.db.collection('apps').find({}).toArray(function(err: Error | null, apps: AppDocument[]) {
            if (!apps || err) {
                common.returnOutput(params, {
                    admin_of: {},
                    user_of: {}
                });
                return false;
            }

            const appsObj = packApps(apps);
            common.returnOutput(params, {
                admin_of: appsObj,
                user_of: appsObj
            });
            return true;
        });

        return true;
    },

    /**
     * Get only apps that current user has access to and outputs to browser
     * @param params - params object
     * @returns true if got data from db, false if did not
     */
    getCurrentUserApps: function(params: AppParams): boolean {
        if (params.member.global_admin) {
            appsApi.getAllApps(params);
            return true;
        }

        const adminOfAppIds = getAdminApps(params.member);
        const userOfAppIds = getUserApps(params.member);

        common.db.collection('apps').find({ _id: { '$in': adminOfAppIds.map((id: string) => common.db.ObjectID(id)) } }).toArray(function(err: Error | null, admin_of: AppDocument[]) {
            common.db.collection('apps').find({ _id: { '$in': userOfAppIds.map((id: string) => common.db.ObjectID(id)) } }).toArray(function(err2: Error | null, user_of: AppDocument[]) {
                common.returnOutput(params, {
                    admin_of: packApps(admin_of),
                    user_of: packApps(user_of)
                });
            });
        });

        return true;
    },

    /**
     * Gets app details for specific app and outputs to browser
     * @param params - params object
     * @returns true if got data from db, false if did not
     */
    getAppsDetails: function(params: AppParams): boolean {
        if (!params.qstring.app_id) {
            common.returnMessage(params, 401, 'No app_id provided');
            return false;
        }
        common.db.collection('apps').findOne({ '_id': common.db.ObjectID(params.qstring.app_id + '') }, function(err1: Error | null, app: AppDocument | null) {
            if (!app) {
                common.returnMessage(params, 401, 'App does not exist');
                return false;
            }
            params.app = app;
            if (app.checksum_salt) {
                app.salt = app.salt || app.checksum_salt;
            }
            if (params.app.owner) {
                params.app.owner_id = params.app.owner;
                params.app.owner = common.db.ObjectID(params.app.owner + '');
            }
            common.db.collection('app_users' + params.qstring.app_id).find({}, {
                lac: 1,
                _id: 0
            }).sort({ lac: -1 }).limit(1).toArray(function(err: Error | null, last: Array<{ lac: number }>) {
                common.db.collection('members').findOne({ _id: params.app!.owner }, {
                    full_name: 1,
                    username: 1
                }, function(err2: Error | null, owner: Member | null) {
                    if (owner) {
                        if (owner.full_name && owner.full_name !== '') {
                            params.app!.owner = owner.full_name;
                        }
                        else if (owner.username && owner.username !== '') {
                            params.app!.owner = owner.username;
                        }
                        else {
                            params.app!.owner = '';
                        }
                    }
                    else {
                        params.app!.owner = '';
                    }
                    common.db.collection('members').find({ global_admin: true }, {
                        full_name: 1,
                        username: 1
                    }).toArray(function(err3: Error | null, global_admins: Member[]) {
                        common.db.collection('members').find({
                            '$or': [
                                { admin_of: params.qstring.app_id },
                                { 'permission._.a': params.qstring.app_id }
                            ]
                        }, {
                            full_name: 1,
                            username: 1
                        }).toArray(function(err4: Error | null, admins: Member[]) {
                            common.db.collection('members').find({
                                '$or': [
                                    { user_of: params.qstring.app_id },
                                    {
                                        'permission._.u':
                                        {
                                            $elemMatch: { $elemMatch: { $eq: params.qstring.app_id } }
                                        }
                                    }
                                ]
                            }, {
                                full_name: 1,
                                username: 1
                            }).toArray(function(err5: Error | null, users: Member[]) {
                                common.returnOutput(params, {
                                    app: {
                                        owner: params.app!.owner || '',
                                        owner_id: params.app!.owner_id || '',
                                        created_at: params.app!.created_at || 0,
                                        edited_at: params.app!.edited_at || 0,
                                        plugins: params.app!.plugins,
                                        last_data: params.app!.last_data,
                                        last_data_users: (last !== undefined && last.length > 0) ? last[0].lac : 0,
                                    },
                                    global_admin: global_admins || [],
                                    admin: admins || [],
                                    user: users || []
                                });
                            });
                        });
                    });
                });
            });
        });

        return true;
    },

    /**
     * Creates new app, and outputs result to browser
     * @param params - params object with args to create app
     * @returns true if operation successful
     */
    createApp: async function(params: AppParams): Promise<boolean | undefined> {
        const argProps: ArgProps = {
            'name': { 'required': true, 'type': 'String' },
            'country': { 'required': false, 'type': 'String' },
            'type': { 'required': false, 'type': 'String' },
            'category': { 'required': false, 'type': 'String' },
            'key': { 'required': false, 'type': 'String' },
            'timezone': { 'required': false, 'type': 'String' },
            'checksum_salt': { 'required': false, 'type': 'String' }
        };

        const createAppValidation = common.validateArgs(params.qstring.args, argProps, true);
        const newApp: Partial<AppDocument> = createAppValidation.obj;
        if (!newApp) {
            common.returnMessage(params, 400, 'Error: ' + createAppValidation.errors);
            return false;
        }

        for (const i in params.qstring.args) {
            if ((newApp as Record<string, unknown>)[i] === undefined) {
                (newApp as Record<string, unknown>)[i] = (params.qstring.args as Record<string, unknown>)[i];
            }
        }

        processAppProps(newApp);

        newApp.created_at = Math.floor((Date.now()) / 1000);
        newApp.edited_at = newApp.created_at;
        newApp.owner = params.member._id + '';
        newApp.seq = 0;
        newApp.has_image = false;

        let seed = '';
        try {
            seed = await new Promise<string>((resolve, reject) => {
                crypto.randomBytes(256, (err, buf) => {
                    if (err) {
                        reject(err);
                    }
                    resolve(buf.toString('hex'));
                });
            });
        }
        catch (e) {
            console.log(e);
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-+/*[]{}-=\\|\';:"<>?,./';
            for (let i = 0; i < 256; i++) {
                seed += chars.charAt(Math.floor(Math.random() * chars.length));
            }
        }

        const appKey = common.sha1Hash(seed, true);
        if (!newApp.key || newApp.key === '') {
            newApp.key = appKey;
        }

        checkUniqueKey(params, function() {
            common.db.collection('apps').insert(newApp, function(err: Error | null, app: { ops: AppDocument[] }) {
                if (!err && app && app.ops && app.ops[0] && app.ops[0]._id) {
                    newApp._id = app.ops[0]._id;

                    common.db.collection('app_users' + app.ops[0]._id).ensureIndex({ ls: -1 }, { background: true }, function() {});
                    common.db.collection('app_users' + app.ops[0]._id).ensureIndex({ 'uid': 1 }, { background: true }, function() {});
                    common.db.collection('app_users' + app.ops[0]._id).ensureIndex({ 'sc': 1 }, { background: true }, function() {});
                    common.db.collection('app_users' + app.ops[0]._id).ensureIndex({ 'lac': -1 }, { background: true }, function() {});
                    common.db.collection('app_users' + app.ops[0]._id).ensureIndex({ 'tsd': 1 }, { background: true }, function() {});
                    common.db.collection('app_users' + app.ops[0]._id).ensureIndex({ 'did': 1 }, { background: true }, function() {});
                    plugins.dispatch('/i/apps/create', {
                        params: params,
                        appId: app.ops[0]._id,
                        data: newApp
                    });
                    iconUpload(Object.assign({}, params, { app_id: app.ops[0]._id }));
                    common.returnOutput(params, newApp);
                }
                else {
                    common.returnMessage(params, 500, 'Error creating App: ' + err);
                }
            });
        }, false);
    },

    /**
     * Updates existing app, and outputs result to browser
     * @param params - params object with args to update app with
     * @returns true if operation successful
     */
    updateApp: function(params: AppParams): boolean {
        const argProps: ArgProps = {
            'app_id': { 'required': true, 'type': 'String', 'min-length': 24, 'max-length': 24, 'exclude-from-ret-obj': true },
            'name': { 'required': false, 'type': 'String' },
            'type': { 'required': false, 'type': 'String' },
            'category': { 'required': false, 'type': 'String' },
            'key': { 'required': false, 'type': 'String' },
            'timezone': { 'required': false, 'type': 'String' },
            'country': { 'required': false, 'type': 'String' },
            'salt': { 'required': false, 'type': 'String' },
            'locked': { 'required': false, 'type': 'Boolean' }
        };

        const updateAppValidation = common.validateArgs(params.qstring.args, argProps, true);
        const updatedApp: Partial<AppDocument> = updateAppValidation.obj;
        if (!updatedApp) {
            common.returnMessage(params, 400, 'Error: ' + updateAppValidation.errors);
            return false;
        }

        if (updateAppValidation.obj.name === '') {
            common.returnMessage(params, 400, 'Invalid app name');
            return false;
        }

        if ((params.qstring.args as Record<string, string>)?.key && updateAppValidation.obj.key === '') {
            common.returnMessage(params, 400, 'Invalid app key');
            return false;
        }

        const invalidProps = validateAppUpdateProps(updatedApp);
        if (invalidProps.length > 0) {
            common.returnMessage(params, 400, 'Invalid props: ' + invalidProps);
            return false;
        }

        for (const i in params.qstring.args) {
            if ((updatedApp as Record<string, unknown>)[i] === undefined && i !== 'app_id') {
                (updatedApp as Record<string, unknown>)[i] = (params.qstring.args as Record<string, unknown>)[i];
            }
        }

        if (Object.keys(updatedApp).length === 0) {
            common.returnMessage(params, 200, 'Nothing changed');
            return true;
        }

        updatedApp.edited_at = Math.floor((Date.now()) / 1000);
        delete updatedApp.checksum_salt;

        common.db.collection('apps').findOne(common.db.ObjectID((params.qstring.args as Record<string, string>)?.app_id), function(err: Error | null, appBefore: AppDocument | null) {
            if (err || !appBefore) {
                common.returnMessage(params, 404, 'App not found');
            }
            else {
                checkUniqueKey(params, function() {
                    if ((params.member && params.member.global_admin) || hasUpdateRight(FEATURE_NAME, (params.qstring.args as Record<string, string>)?.app_id, params.member)) {
                        common.db.collection('apps').update({ '_id': common.db.ObjectID((params.qstring.args as Record<string, string>)?.app_id) }, { $set: updatedApp, '$unset': { 'checksum_salt': '' } }, function() {
                            plugins.dispatch('/i/apps/update', {
                                params: params,
                                appId: (params.qstring.args as Record<string, string>)?.app_id,
                                data: {
                                    app: appBefore,
                                    update: updatedApp
                                }
                            });
                            iconUpload(params);
                            common.returnOutput(params, updatedApp);
                        });
                    }
                    else {
                        common.returnMessage(params, 401, 'User does not have admin rights for this app');
                    }
                }, true);
            }
        });

        return true;
    },

    /**
     * Returns application level configurations
     * @param params - params object with query parameters appId and name(optional parameter)
     * @returns returns true
     */
    getAppPlugins: async function(params: AppParams): Promise<boolean> {
        const queryParamsValidationSchema: ArgProps = {
            'app_id': { 'required': true, 'type': 'String', 'min-length': 24, 'max-length': 24 },
            'name': { 'required': false, 'type': 'String' }
        };
        const getAppPluginsQueryValidationResult = common.validateArgs(params.qstring, queryParamsValidationSchema, true);
        if (!getAppPluginsQueryValidationResult.result) {
            common.returnMessage(params, 400, 'Error: ' + getAppPluginsQueryValidationResult.errors);
            return true;
        }
        try {
            const appId = params.qstring.app_id;
            const pluginName = (params.qstring as Record<string, string>).name;
            const appModel = await common.db.collection('apps').findOne(common.db.ObjectID(appId));
            if (pluginName && appModel.plugins[pluginName]) {
                common.returnOutput(params, { plugins: { [pluginName]: appModel.plugins[pluginName] || {} } });
            }
            else {
                common.returnOutput(params, { plugins: appModel.plugins });
            }
        }
        catch (error) {
            common.returnMessage(params, 400, 'Error getting app plugins:', error);
        }
        return true;
    },

    /**
     * Updates existing app's configurations and outputs result to browser
     * @param params - params object with args to update app with
     * @returns true if operation successful
     */
    updateAppPlugins: function(params: AppParams): boolean {
        const props: ArgProps = {
            'app_id': { 'required': true, 'type': 'String', 'min-length': 24, 'max-length': 24, 'exclude-from-ret-obj': true }
        };

        log.d('Updating plugin config for app %s: %j', params.qstring.app_id, params.qstring.args);

        const updateAppPluginsValidation = common.validateArgs(params.qstring, props, true);
        if (!updateAppPluginsValidation.result) {
            common.returnMessage(params, 400, 'Error: ' + updateAppPluginsValidation.errors);
            return false;
        }

        common.db.collection('apps').findOne(common.db.ObjectID(params.qstring.app_id), (err1: Error | null, app: AppDocument | null) => {
            if (err1 || !app) {
                log.w('App %s not found %j', params.qstring.app_id, err1 || '');
                return common.returnMessage(params, 404, 'App not found');
            }

            const promises: Promise<Record<string, unknown>>[] = [];

            Object.keys(params.qstring.args || {}).forEach(k => {
                if (plugins.getPlugins().includes(k)) {
                    promises.push(new Promise((resolve, reject) => {
                        plugins.dispatch('/i/apps/update/plugins/' + k, {
                            params: params,
                            app: app,
                            config: (params.qstring.args as Record<string, unknown>)[k]
                        }, (err2: Error | null, changes: Array<{ status: string; reason?: { errors?: string[]; message?: string; code?: string }; value?: unknown }> | null) => {
                            if (err2) {
                                reject(err2);
                            }
                            else if (changes) {
                                const err = changes.find(c => c.status === 'rejected');
                                if (err) {
                                    if (err.reason?.errors && err.reason.errors.length > 0) {
                                        reject({ errors: err.reason.errors.join(',') });
                                    }
                                    else {
                                        reject(err.reason);
                                    }
                                }
                                else {
                                    resolve({ [k]: changes.map(c => c.value) });
                                }
                            }
                            else {
                                log.d('Updating %s plugin config for app %s in db: %j', k, params.qstring.app_id, (params.qstring.args as Record<string, unknown>)[k]);
                                common.dbPromise('apps', 'updateOne', { _id: app._id }, { $set: { [`plugins.${k}`]: (params.qstring.args as Record<string, unknown>)[k] } }).then(() => {
                                    plugins.dispatch('/systemlogs', {
                                        params: params,
                                        action: 'app_config_updated',
                                        data: {
                                            config: k,
                                            app_id: app._id + '',
                                            before: common.dot(app, `plugins.${k}` || {}),
                                            after: (params.qstring.args as Record<string, unknown>)[k]
                                        }
                                    });
                                    resolve({ [k]: (params.qstring.args as Record<string, unknown>)[k] });
                                }, reject);
                            }
                        });
                    }));
                }
                else {
                    promises.push(new Promise((resolve, reject) => {
                        log.d('Updating %s plugin config for app %s in db: %j', k, params.qstring.app_id, (params.qstring.args as Record<string, unknown>)[k]);
                        common.dbPromise('apps', 'updateOne', { _id: app._id }, { $set: { [`plugins.${k}`]: (params.qstring.args as Record<string, unknown>)[k] } }).then(() => {
                            plugins.dispatch('/systemlogs', {
                                params: params,
                                action: 'app_config_updated',
                                data: {
                                    config: k,
                                    app_id: app._id + '',
                                    before: common.dot(app, `plugins.${k}` || {}),
                                    after: (params.qstring.args as Record<string, unknown>)[k]
                                }
                            });
                            resolve({ [k]: (params.qstring.args as Record<string, unknown>)[k] });
                        }, reject);
                    }));
                }
            });

            if (promises.length > 0) {
                Promise.all(promises).then(results => {
                    log.d('Plugin config updates for app %s returned %j', params.qstring.app_id, results);
                    let ret: Record<string, unknown> = {};
                    const errors: string[] = [];
                    results.forEach(r => {
                        const plugin = Object.keys(r)[0];
                        const config = Array.isArray(r[plugin]) ? (r[plugin] as unknown[])[0] : r[plugin];
                        log.d('Result for %s is %j', plugin, config);
                        if (typeof config === 'object') {
                            Object.assign(ret, { [plugin]: config });
                        }
                        else {
                            errors.push(config as string);
                        }
                    });
                    ret = {
                        _id: app._id,
                        plugins: ret
                    };
                    if (errors.length > 0) {
                        (ret as Record<string, unknown>).result = errors.join('\n');
                    }
                    common.returnOutput(params, ret);
                }, err => {
                    log.e('Error during plugin config updates for app %s: %j %s, %d', params.qstring.app_id, err, typeof err, (err as { length?: number }).length);
                    if ((err as { errors?: string }).errors) {
                        common.returnMessage(params, 400, { errors: (err as { errors: string }).errors }, null, true);
                    }
                    else {
                        common.returnMessage(params, 400, 'Couldn\'t update plugin: ' + (typeof err === 'string' ? err : (err as Error).message || (err as { code?: string }).code || JSON.stringify(err)));
                    }
                });
            }
            else {
                common.returnMessage(params, 200, 'Nothing changed');
            }
        });

        return true;
    },

    /**
     * Deletes existing app's and outputs result to browser
     * @param params - params object with app_id to delete
     * @returns true if operation successful
     */
    deleteApp: function(params: AppParams): boolean {
        params = params || {} as AppParams;
        const argProps: ArgProps = {
            'app_id': { 'required': true, 'type': 'String', 'min-length': 24, 'max-length': 24 }
        };

        const deleteAppValidation = common.validateArgs(params.qstring.args, argProps, true);
        const appId = deleteAppValidation.obj?.app_id;
        if (!(deleteAppValidation.obj && appId)) {
            common.returnMessage(params, 400, 'Error: ' + deleteAppValidation.errors);
            return false;
        }

        common.db.collection('apps').findOne({ '_id': common.db.ObjectID(appId) }, function(err: Error | null, app: AppDocument | null) {
            if (!err && app) {
                if (app.locked) {
                    common.returnMessage(params, 403, 'Application is locked');
                }
                else if (params.member && params.member.global_admin) {
                    removeApp(app);
                }
                else {
                    if (hasDeleteRight(FEATURE_NAME, (params.qstring.args as Record<string, string>)?.app_id, params.member)) {
                        removeApp(app);
                    }
                    else {
                        common.returnMessage(params, 401, 'User does not have admin rights for this app');
                    }
                }
            }
            else {
                common.returnMessage(params, 500, 'Error deleting app');
            }
        });

        /**
         * Deletes TopEvents data of the application.
         */
        function deleteTopEventsData(): void {
            const collectionName = 'top_events';
            const app_id = common.db.ObjectID(appId);
            common.db.collection(collectionName).remove({ app_id }, function() {});
        }

        /**
         * Removes 'appId' from group permission
         */
        async function updateGroupPermission(): Promise<void> {
            common.db.collection('groups').update({}, {
                $pull: {
                    'permission._.a': appId,
                },
                $unset: {
                    [`permission.c.${appId}`]: '',
                    [`permission.r.${appId}`]: '',
                    [`permission.u.${appId}`]: '',
                    [`permission.d.${appId}`]: '',
                }
            }, { multi: true }, function() {});

            await common.db.collection('groups').update({
                'permission._.u': { $elemMatch: { $elemMatch: { $eq: appId } } },
            }, {
                $pull: { 'permission._.u.$': appId },
            }, { multi: true });

            common.db.collection('groups').update({
                'permission._.u': { $elemMatch: { $size: 0 } },
            }, {
                $pull: { 'permission._.u': { $size: 0 } },
            }, { multi: true }, function() {});
        }

        /**
         * Removes the app after validation of params and calls deleteAppData
         * @param app - app document
         */
        function removeApp(app: AppDocument): void {
            common.db.collection('apps').remove({ '_id': common.db.ObjectID(appId) }, { safe: true }, async function(err: Error | null) {
                if (err) {
                    common.returnMessage(params, 500, 'Error deleting app');
                    return false;
                }

                const iconPath = __dirname + '/../../../frontend/express/public/appimages/' + appId + '.png';
                countlyFs.deleteFile('appimages', iconPath, { id: appId + '.png' }, function() {});

                common.db.collection('members').update({}, {
                    $pull: {
                        'apps': appId,
                        'admin_of': appId,
                        'user_of': appId,
                        'permission._.a': appId,
                    },
                    $unset: {
                        [`permission.c.${appId}`]: '',
                        [`permission.r.${appId}`]: '',
                        [`permission.u.${appId}`]: '',
                        [`permission.d.${appId}`]: '',
                    }
                }, { multi: true }, function() {});

                await common.db.collection('members').update({
                    'permission._.u': { $elemMatch: { $elemMatch: { $eq: appId } } },
                }, {
                    $pull: { 'permission._.u.$': appId },
                }, { multi: true });

                common.db.collection('members').update({
                    'permission._.u': { $elemMatch: { $size: 0 } },
                }, {
                    $pull: { 'permission._.u': { $size: 0 } },
                }, { multi: true }, function() {});

                if (plugins.isPluginEnabled('groups')) {
                    updateGroupPermission();
                }
                deleteAppData(appId!, true, params, app);
                deleteTopEventsData();
                common.returnMessage(params, 200, 'Success');
                return true;
            });
        }

        return true;
    },

    /**
     * Resets app to clean state
     * @param params - params object with app_id to reset
     * @returns true if operation successful
     */
    resetApp: function(params: AppParams): boolean {
        const argProps: ArgProps = {
            'app_id': { 'required': true, 'type': 'String', 'min-length': 24, 'max-length': 24 },
            'period': { 'required': true }
        };

        const resetAppValidation = common.validateArgs(params.qstring.args, argProps, true);
        const appId = resetAppValidation.obj?.app_id;
        if (!(resetAppValidation.obj && appId)) {
            common.returnMessage(params, 400, 'Error: ' + resetAppValidation.errors);
            return false;
        }

        common.db.collection('apps').findOne({ '_id': common.db.ObjectID(appId) }, function(err: Error | null, app: AppDocument | null) {
            if (!err && app) {
                if (app.locked) {
                    common.returnMessage(params, 403, 'Application is locked');
                }
                else if (params.member.global_admin) {
                    deleteAppData(appId, false, params, app);
                    common.returnMessage(params, 200, 'Success');
                }
                else {
                    if (hasDeleteRight(FEATURE_NAME, appId, params.member)) {
                        deleteAppData(appId, false, params, app);
                        common.returnMessage(params, 200, 'Success');
                    }
                    else {
                        common.returnMessage(params, 401, 'User does not have admin rights for this app');
                    }
                }
            }
            else {
                common.returnMessage(params, 404, 'App not found');
            }
        });

        return true;
    }
};

export default appsApi;
export type { AppsApi, AppParams, AppDocument, Member };
