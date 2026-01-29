import countlyGlobal from './countly.global.js';
import countlyCommon from './countly.common.js';
import jQuery from 'jquery';

// internal variables
export let odd = true;
export const types = ["c", "r", "u", "d"];
export const typeNames = ["create", "read", "update", "delete"];
export let features = [];

/**
 * initialize feature list from back-end and set it as features
 * @returns {function} - ajax func to request data and store in features
 */
export function initFeatures() {
    return jQuery.ajax({
        type: 'GET',
        url: countlyCommon.API_URL + "/o/users/permissions",
        data: {
            app_id: countlyGlobal.defaultApp._id
        },
        success: function(res) {
            features = res.features;
        }
    });
}

/**
 * validate write requests for specific feature on specific app
 * @param {string} accessType - write process type [c, u, d]
 * @param {string} feature - feature name that required access right
 * @param {object} member - countly member object
 * @param {string} app_id - countly application id
 * @return {boolean} result of permission check
 */
function validateWrite(accessType, feature, member, app_id) {
    member = member || countlyGlobal.member;
    app_id = app_id || countlyCommon.ACTIVE_APP_ID;
    if (member.locked) {
        return false;
    }

    if (!member.global_admin) {
        const isPermissionObjectExistForAccessType = (member.permission && typeof member.permission[accessType] === "object" && typeof member.permission[accessType][app_id] === "object");

        const memberHasAllFlag = member.permission && member.permission[accessType] && member.permission[accessType][app_id] && member.permission[accessType][app_id].all;
        let memberHasAllowedFlag = false;

        if (typeof feature === 'string') {
            memberHasAllowedFlag = member.permission && member.permission[accessType] && member.permission[accessType][app_id] && member.permission[accessType][app_id].allowed && member.permission[accessType][app_id].allowed[feature];
        }
        else {
            for (let i = 0; i < feature.length; i++) {
                if (member.permission && member.permission[accessType] && member.permission[accessType][app_id] && member.permission[accessType][app_id].allowed && member.permission[accessType][app_id].allowed[feature[i]]) {
                    memberHasAllowedFlag = true;
                    break;
                }
            }
        }

        const isFeatureAllowedInRelatedPermissionObject = isPermissionObjectExistForAccessType && (memberHasAllFlag || memberHasAllowedFlag);
        const hasAdminAccess = (typeof member.permission === "object" && typeof member.permission._ === "object" && typeof member.permission._.a === "object") && member.permission._.a.indexOf(app_id) > -1;
        // don't allow if user has not permission for feature and has no admin access for current app
        if (!(isFeatureAllowedInRelatedPermissionObject) && !(hasAdminAccess)) {
            return false;
        }
        else {
            return true;
        }
    }
    else {
        return true;
    }
}

/**
 * validate create requests for specific feature on specific app
 * @param {string} feature - feature name that required access right
 * @param {object} member - countly member object
 * @param {string} app_id - countly application id
 * @return {boolean} result of permission check
 */
export function validateCreate(feature, member, app_id) {
    return validateWrite('c', feature, member, app_id);
}

/**
 * validate read requests for specific feature on specific app
 * @param {string} feature - feature name that required access right
 * @param {object} member - countly member object
 * @param {string} app_id - countly application id
 * @return {boolean} result of permission check
 */
export function validateRead(feature, member, app_id) {
    member = member || countlyGlobal.member;
    app_id = app_id || countlyCommon.ACTIVE_APP_ID;
    if (member.locked) {
        return false;
    }
    if (!member.global_admin) {
        const isPermissionObjectExistForRead = (member.permission && typeof member.permission.r === "object" && typeof member.permission.r[app_id] === "object");
        // TODO: make here better. create helper method for these checks
        const memberHasAllFlag = member.permission && member.permission.r && member.permission.r[app_id] && member.permission.r[app_id].all;
        let memberHasAllowedFlag = false;

        if (typeof feature === 'string') {
            memberHasAllowedFlag = member.permission && member.permission.r && member.permission.r[app_id] && member.permission.r[app_id].allowed && member.permission.r[app_id].allowed[feature];
        }
        else {
            for (let i = 0; i < feature.length; i++) {
                if (member.permission && member.permission.r && member.permission.r[app_id] && member.permission.r[app_id].allowed && member.permission.r[app_id].allowed[feature[i]]) {
                    memberHasAllowedFlag = true;
                    break;
                }
            }
        }

        const isFeatureAllowedInReadPermissionObject = isPermissionObjectExistForRead && (memberHasAllFlag || memberHasAllowedFlag);

        const hasAdminAccess = (typeof member.permission === "object" && typeof member.permission._ === "object" && typeof member.permission._.a === "object") && member.permission._.a.indexOf(app_id) > -1;
        // don't allow if user has not permission for feature and has no admin access for current app
        if (!(isFeatureAllowedInReadPermissionObject) && !(hasAdminAccess)) {
            return false;
        }
        else {
            return true;
        }
    }
    else {
        return true;
    }
}

/**
 * validate update requests for specific feature on specific app
 * @param {string} feature - feature name that required access right
 * @param {object} member - countly member object
 * @param {string} app_id - countly application id
 * @return {boolean} result of permission check
 */
export function validateUpdate(feature, member, app_id) {
    return validateWrite('u', feature, member, app_id);
}

/**
 * validate delete requests for specific feature on specific app
 * @param {string} feature - feature name that required access right
 * @param {object} member - countly member object
 * @param {string} app_id - countly application id
 * @return {boolean} result of permission check
 */
export function validateDelete(feature, member, app_id) {
    return validateWrite('d', feature, member, app_id);
}

/**
 * validate all types of requests for specific feature on specific app
 * @param {string} accessType - write process type [c, r, u, d]
 * @param {string} feature - feature name that required access right
 * @param {object} member - countly member object
 * @param {string} app_id - countly application id
 * @return {boolean} result of permission check
 */
export function validate(accessType, feature, member, app_id) {
    if (accessType === "r") {
        return validateRead(feature, member, app_id);
    }
    else {
        return validateWrite(accessType, feature, member, app_id);
    }
}

/**
 * Validate is this user global admin or not
 * @returns {boolean} is this user global admin or not?
 */
export function validateGlobalAdmin() {
    return countlyGlobal.member.global_admin;
}

/**
 * Validate is this user admin of specific app or not
 * @param {string} app - countly application id, optional
 * @returns {boolean} user admin of specific app or not?
 */
export function validateAppAdmin(app) {
    const _app = app || countlyCommon.ACTIVE_APP_ID;

    if (countlyGlobal.member.global_admin) {
        return true;
    }
    else {
        return countlyGlobal.member.permission && countlyGlobal.member.permission._ && countlyGlobal.member.permission._.a && countlyGlobal.member.permission._.a.indexOf(_app) > -1;
    }
}

/**
 * Validate is this user admin of any app or not
 * If this user has admin access for at least one app,
 * we can show applications view to this user
 * @returns {boolean} is this user admin of any app or not?
 */
export function validateAnyAppAdmin() {
    return countlyGlobal.member.global_admin || (countlyGlobal.member.permission && countlyGlobal.member.permission._ && countlyGlobal.member.permission._.a && countlyGlobal.member.permission._.a.length > 0);
}

/**
 * Generate an array of empty permission sets with CRUD structure
 * @param {number} count - number of permission sets to generate
 * @returns {Array<object>} array of permission set objects with c, r, u, d keys
 */
export function permissionSetGenerator(count) {
    const permission_sets = [];
    for (let i = 0; i < count; i++) {
        permission_sets.push({c: {all: false, allowed: {}}, r: {all: false, allowed: {}}, u: {all: false, allowed: {}}, d: {all: false, allowed: {}}});
    }
    return permission_sets;
}

/**
 * Initialize a default permission object structure for all apps
 * @param {Array<object>} permissionSets - initial permission sets (will be reset internally)
 * @returns {object} object containing permissionObject and permissionSets
 */
export function initializePermissions(permissionSets) {
    const permissionObject = {
        c: {},
        r: {},
        u: {},
        d: {},
        _: {
            a: [],
            u: [[]]
        }
    };

    for (const countlyApp in countlyGlobal.apps) {
        for (const accessType in permissionObject) {
            permissionObject[accessType][countlyApp] = {};
            permissionObject[accessType][countlyApp].all = false;
            permissionObject[accessType][countlyApp].allowed = {};
            permissionObject[accessType].global = {};
            permissionObject[accessType].global.all = false;
            permissionObject[accessType].global.allowed = {};
        }
    }

    permissionSets = [];
    permissionSets.push({c: {all: false, allowed: {}}, r: {all: false, allowed: { core: true }}, u: {all: false, allowed: {}}, d: {all: false, allowed: {}}});

    return {
        permissionObject: permissionObject,
        permissionSets: permissionSets
    };
}

/**
 * Update admin permissions for a specific app by setting all CRUD permissions
 * @param {string} app_id - countly application id
 * @param {object} permissionObject - the permission object to update
 * @param {boolean} processFlag - whether to grant (true) or revoke (false) admin permissions
 * @returns {object} updated permission object
 */
export function updateAdminPermissions(app_id, permissionObject, processFlag) {
    for (const i in types) {
        permissionObject[types[i]][app_id] = {all: processFlag, allowed: {}};
    }
    return permissionObject;
}

/**
 * Update all feature permissions for a specific permission type (c, r, u, or d)
 * @param {string} permissionType - the type of permission to update [c, r, u, d]
 * @param {object} permissionObject - the permission object to update
 * @param {boolean} processFlag - whether to grant (true) or revoke (false) permissions
 * @returns {object} updated permission object
 */
export function updatePermissionByType(permissionType, permissionObject, processFlag) {
    permissionObject[permissionType].all = processFlag;
    for (let i = 0; i < features.length; i++) {
        if (permissionType === 'r' && features[i] === 'core') {
            continue;
        }
        if (processFlag) {
            permissionObject[permissionType].allowed[features[i]] = processFlag;
        }
        else {
            delete permissionObject[permissionType].allowed[features[i]];
        }
    }
    return permissionObject;
}

/**
 * Grant permission for a specific feature and update the 'all' flag accordingly
 * @param {string} permissionType - the type of permission [c, r, u, d]
 * @param {string} feature - the feature name to grant permission for
 * @param {object} permissionObject - the permission object to update
 * @returns {object} updated permission object
 */
export function giveFeaturePermission(permissionType, feature, permissionObject) {
    let allCheck = true;
    for (let i = 0; i < features.length; i++) {
        if (permissionType === 'r' && features[i] === 'core') {
            continue;
        }
        if (!permissionObject[permissionType].allowed[features[i]]) {
            allCheck = false;
        }
    }
    permissionObject[permissionType].all = allCheck;
    permissionObject[permissionType].allowed[feature] = true;
    return permissionObject;
}

/**
 * Remove permission for a specific feature and reset the 'all' flag
 * @param {string} permissionType - the type of permission [c, r, u, d]
 * @param {string} feature - the feature name to remove permission for
 * @param {object} permissionObject - the permission object to update
 * @returns {object} updated permission object
 */
export function removeFeaturePermission(permissionType, feature, permissionObject) {
    permissionObject[permissionType].all = false;
    delete permissionObject[permissionType].allowed[feature];
    return permissionObject;
}

/**
 * Combine user apps with their permission sets into a single permission object
 * @param {Array<Array<string>>} user_apps - nested array of app ids grouped by permission set
 * @param {Array<object>} user_permission_sets - array of permission set objects
 * @param {object} permission_object - the permission object to populate
 * @returns {object} combined permission object with CRUD permissions for each app
 */
export function combinePermissionObject(user_apps, user_permission_sets, permission_object) {
    for (let i = 0; i < user_apps.length; i++) {
        for (let j = 0; j < user_apps[i].length; j++) {
            permission_object.c[user_apps[i][j]] = user_permission_sets[i].c;
            permission_object.r[user_apps[i][j]] = user_permission_sets[i].r;
            permission_object.u[user_apps[i][j]] = user_permission_sets[i].u;
            permission_object.d[user_apps[i][j]] = user_permission_sets[i].d;
        }
    }
    return permission_object;
}

/**
 * Get all app ids that the current user has access to
 * @returns {Array<string>} array of app ids the user can access
 */
export function getUserApps() {
    const member = countlyGlobal.member;
    let userApps = [];
    if (member.global_admin) {
        for (const app in countlyGlobal.apps) {
            userApps.push(app);
        }
        return userApps;
    }
    else {
        for (let i = 0; i < member.permission._.u.length; i++) {
            userApps = userApps.concat(member.permission._.u[i]);
        }
        return userApps.concat(member.permission._.a);
    }
}

/**
 * Get all app ids where the current user has admin privileges
 * @returns {Array<string>} array of app ids where user is admin
 */
export function getAdminApps() {
    const member = countlyGlobal.member;
    const adminApps = [];
    if (member.global_admin) {
        for (const app in countlyGlobal.apps) {
            adminApps.push(app);
        }
        return adminApps;
    }
    else {
        return member.permission._.a;
    }
}

/**
 * Convert a feature name to a human-readable, localized display name
 * @param {string} featureName - the raw feature name (may contain underscores or dashes)
 * @returns {string} beautified and localized feature name with title case
 */
export function featureBeautifier(featureName) {
    const withDash = featureName.replaceAll("_", "-");
    const withUnderscore = featureName.replaceAll("-", "_");
    const localizedName = jQuery.i18n.map[withDash + ".plugin-title"] || jQuery.i18n.map[withDash + ".title"] || jQuery.i18n.map[withUnderscore + ".plugin-title"] || jQuery.i18n.map[withUnderscore + ".title"] || featureName;
    return localizedName.split(" ").map(function(word) {
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(" ");
}
