/*global countlyGlobal, countlyCommon, $ */
(function(countlyAuth) {
    // internal variables
    countlyAuth.odd = true;
    countlyAuth.types = ["c", "r", "u", "d"];
    countlyAuth.typeNames = ["create", "read", "update", "delete"];
    countlyAuth.features = [];

    /**
    * initialize feature list from back-end and set it as countlyAuth.features
    * @returns {function} - ajax func to request data and store in countlyAuth.features
    */
    countlyAuth.initFeatures = function() {
        return $.ajax({
            type: 'GET',
            url: countlyCommon.API_URL + "/o/users/permissions",
            data: {
                app_id: countlyGlobal.defaultApp._id
            },
            success: function(res) {
                if (res.length) {
                    countlyAuth.features = res;
                }
            }
        });
    };

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
            var isPermissionObjectExistForAccessType = (typeof member.permission[accessType] === "object" && typeof member.permission[accessType][app_id] === "object");

            var memberHasAllFlag = member.permission && member.permission[accessType] && member.permission[accessType][app_id] && member.permission[accessType][app_id].all;
            var memberHasAllowedFlag = false;

            if (typeof feature === 'string') {
                memberHasAllowedFlag = member.permission && member.permission[accessType] && member.permission[accessType][app_id] && member.permission[accessType][app_id].allowed && member.permission[accessType][app_id].allowed[feature];
            }
            else {
                for (var i = 0 ; i < feature.length; i++) {
                    if (member.permission && member.permission[accessType] && member.permission[accessType][app_id] && member.permission[accessType][app_id].allowed && member.permission[accessType][app_id].allowed[feature[i]]) {
                        memberHasAllowedFlag = true;
                        break;
                    }
                }
            }

            var isFeatureAllowedInRelatedPermissionObject = isPermissionObjectExistForAccessType && (memberHasAllFlag || memberHasAllowedFlag);
            var hasAdminAccess = (typeof member.permission === "object" && typeof member.permission._ === "object" && typeof member.permission._.a === "object") && member.permission._.a.indexOf(app_id) > -1;
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
    countlyAuth.validateCreate = function(feature, member, app_id) {
        return validateWrite('c', feature, member, app_id);
    };

    /**
     * validate read requests for specific feature on specific app
     * @param {string} feature - feature name that required access right
     * @param {object} member - countly member object
     * @param {string} app_id - countly application id
     * @return {boolean} result of permission check
     */
    countlyAuth.validateRead = function(feature, member, app_id) {
        member = member || countlyGlobal.member;
        app_id = app_id || countlyCommon.ACTIVE_APP_ID;
        if (member.locked) {
            return false;
        }
        if (!member.global_admin) {
            var isPermissionObjectExistForRead = (typeof member.permission.r === "object" && typeof member.permission.r[app_id] === "object");
            // TODO: make here better. create helper method for these checks
            var memberHasAllFlag = member.permission && member.permission.r && member.permission.r[app_id] && member.permission.r[app_id].all;
            var memberHasAllowedFlag = false;

            if (typeof feature === 'string') {
                memberHasAllowedFlag = member.permission && member.permission.r && member.permission.r[app_id] && member.permission.r[app_id].allowed && member.permission.r[app_id].allowed[feature];
            }
            else {
                for (var i = 0; i < feature.length; i++) {
                    if (member.permission && member.permission.r && member.permission.r[app_id] && member.permission.r[app_id].allowed && member.permission.r[app_id].allowed[feature[i]]) {
                        memberHasAllowedFlag = true;
                        break;
                    }
                }
            }

            var isFeatureAllowedInReadPermissionObject = isPermissionObjectExistForRead && (memberHasAllFlag || memberHasAllowedFlag);

            var hasAdminAccess = (typeof member.permission === "object" && typeof member.permission._ === "object" && typeof member.permission._.a === "object") && member.permission._.a.indexOf(app_id) > -1;
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
    };

    /**
     * validate update requests for specific feature on specific app
     * @param {string} feature - feature name that required access right
     * @param {object} member - countly member object
     * @param {string} app_id - countly application id
     * @return {boolean} result of permission check
     */
    countlyAuth.validateUpdate = function(feature, member, app_id) {
        return validateWrite('u', feature, member, app_id);
    };

    /**
     * validate delete requests for specific feature on specific app
     * @param {string} feature - feature name that required access right
     * @param {object} member - countly member object
     * @param {string} app_id - countly application id
     * @return {boolean} result of permission check
     */
    countlyAuth.validateDelete = function(feature, member, app_id) {
        return validateWrite('d', feature, member, app_id);
    };

    /**
     * validate all types of requests for specific feature on specific app
     * @param {string} accessType - write process type [c, r, u, d]
     * @param {string} feature - feature name that required access right
     * @param {object} member - countly member object
     * @param {string} app_id - countly application id
     * @return {boolean} result of permission check
     */
    countlyAuth.validate = function(accessType, feature, member, app_id) {
        if (accessType === "r") {
            return countlyAuth.validateRead(feature, member, app_id);
        }
        else {
            return validateWrite(accessType, feature, member, app_id);
        }
    };

    /**
     * Validate is this user global admin or not
     * @returns {boolean} is this user global admin or not?
     */
    countlyAuth.validateGlobalAdmin = function() {
        return countlyGlobal.member.global_admin;
    };

    /**
     * Validate is this user admin of specific app or not
     * @param {string} app - countly application id, optional
     * @returns {boolean} user admin of specific app or not?
     */
    countlyAuth.validateAppAdmin = function(app) {
        var _app = app || countlyCommon.ACTIVE_APP_ID;

        if (countlyGlobal.member.global_admin) {
            return true;
        }
        else {
            return countlyGlobal.member.permission && countlyGlobal.member.permission._ && countlyGlobal.member.permission._.a && countlyGlobal.member.permission._.a.indexOf(_app) > -1;
        }
    };

    /**
     * Validate is this user admin of any app or not
     * If this user has admin access for at least one app, 
     * we can show applications view to this user
     * @returns {boolean} is this user admin of any app or not?
     */
    countlyAuth.validateAnyAppAdmin = function() {
        return countlyGlobal.member.global_admin || (countlyGlobal.member.permission && countlyGlobal.member.permission._ && countlyGlobal.member.permission._.a && countlyGlobal.member.permission._.a.length > 0);
    };

    countlyAuth.permissionSetGenerator = function(count) {
        var permission_sets = [];
        for (var i = 0; i < count; i++) {
            permission_sets.push({c: {all: false, allowed: {}}, r: {all: false, allowed: {}}, u: {all: false, allowed: {}}, d: {all: false, allowed: {}}});
        }
        return permission_sets;
    };

    countlyAuth.initializePermissions = function(permissionSets) {
        var permissionObject = {
            c: {},
            r: {},
            u: {},
            d: {},
            _: {
                a: [],
                u: [[]]
            }
        };

        for (var countlyApp in countlyGlobal.apps) {
            for (var accessType in permissionObject) {
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
    };

    countlyAuth.updateAdminPermissions = function(app_id, permissionObject, processFlag) {
        for (var i in countlyAuth.types) {
            permissionObject[countlyAuth.types[i]][app_id] = {all: processFlag, allowed: {}};
        }
        return permissionObject;
    };

    countlyAuth.updatePermissionByType = function(permissionType, permissionObject, processFlag) {
        permissionObject[permissionType].all = processFlag;
        for (var i = 0; i < countlyAuth.features.length; i++) {
            if (permissionType === 'r' && countlyAuth.features[i] === 'core') {
                continue;
            }
            if (processFlag) {
                permissionObject[permissionType].allowed[countlyAuth.features[i]] = processFlag;
            }
            else {
                delete permissionObject[permissionType].allowed[countlyAuth.features[i]];
            }
        }
        return permissionObject;
    };

    countlyAuth.giveFeaturePermission = function(permissionType, feature, permissionObject) {
        var allCheck = true;
        for (var i = 0; i < countlyAuth.features.length; i++) {
            if (permissionType === 'r' && countlyAuth.features[i] === 'core') {
                continue;
            }
            if (!permissionObject[permissionType].allowed[countlyAuth.features[i]]) {
                allCheck = false;
            }
        }
        permissionObject[permissionType].all = allCheck;
        permissionObject[permissionType].allowed[feature] = true;
        return permissionObject;
    };

    countlyAuth.removeFeaturePermission = function(permissionType, feature, permissionObject) {
        permissionObject[permissionType].all = false;
        delete permissionObject[permissionType].allowed[feature];
        return permissionObject;
    };

    countlyAuth.combinePermissionObject = function(user_apps, user_permission_sets, permission_object) {
        for (var i = 0; i < user_apps.length; i++) {
            for (var j = 0; j < user_apps[i].length; j++) {
                permission_object.c[user_apps[i][j]] = user_permission_sets[i].c;
                permission_object.r[user_apps[i][j]] = user_permission_sets[i].r;
                permission_object.u[user_apps[i][j]] = user_permission_sets[i].u;
                permission_object.d[user_apps[i][j]] = user_permission_sets[i].d;
            }
        }
        return permission_object;
    };

    countlyAuth.permissionParser = function(parent_el, permission_object, permission_sets) {
        var admin_apps = permission_object._.a;
        var user_apps = permission_object._.u;
        var checked_admin_apps = [];
        var checked_user_apps = [];

        for (var i = 0; i < admin_apps.length; i++) {
            if (countlyGlobal.apps[admin_apps[i]]) {
                checked_admin_apps.push(admin_apps[i]);
            }
        }

        $('#manage-users-admin-app-selector')[0].selectize.setValue(checked_admin_apps);

        for (var i0 = 0; i0 < user_apps.length; i0++) {
            checked_user_apps = [];
            for (var j0 = 0; j0 < user_apps[i0].length; j0++) {
                if (countlyGlobal.apps[user_apps[i0][j0]]) {
                    checked_user_apps.push(user_apps[i0][j0]);
                }
            }

            $(parent_el + ' #user-app-selector-' + i0)[0].selectize.setValue(checked_user_apps);

            for (var j1 = 0; j1 < countlyAuth.types.length; j1++) {
                if (user_apps[i0].length > 0) {
                    if (permission_object[countlyAuth.types[j1]][user_apps[i0][0]].all) {

                        $(parent_el + ' #mark-all-' + countlyAuth.typeNames[j1] + '-' + i0).countlyCheckbox().set(true);

                        for (var k = 0; k < countlyAuth.features.length; k++) {
                            $(parent_el + ' #' + countlyAuth.types[j1] + '-' + countlyAuth.features[k] + '-' + i0).countlyCheckbox().set(true);
                            if (countlyAuth.types[j1] === "r" && countlyAuth.features[k] === 'core') {
                                $(parent_el + ' #' + countlyAuth.types[j1] + '-' + countlyAuth.features[k] + '-' + i0).countlyCheckbox().setDisabled();
                            }
                        }

                        permission_sets[i0][countlyAuth.types[j1]].all = true;
                        permission_sets[i0][countlyAuth.types[j1]].allowed = permission_object[countlyAuth.types[j1]][user_apps[i0][0]].allowed;
                    }
                    else {
                        for (var feature in permission_object[countlyAuth.types[j1]][user_apps[i0][0]].allowed) {
                            permission_sets[i0] = countlyAuth.giveFeaturePermission(countlyAuth.types[j1], feature, permission_sets[i0]);
                            $(parent_el + ' #' + countlyAuth.types[j1] + '-' + feature + '-' + i0).countlyCheckbox().set(true);
                            if (countlyAuth.types[j1] === "r" && feature === 'core') {
                                $(parent_el + ' #' + countlyAuth.types[j1] + '-' + feature + '-' + i0).countlyCheckbox().setDisabled();
                            }
                        }
                    }
                }
            }
        }

        return permission_sets;
    };

    countlyAuth.getUserApps = function() {
        var member = countlyGlobal.member;
        var userApps = [];
        if (member.global_admin) {
            for (var app in countlyGlobal.apps) {
                userApps.push(app);
            }
            return userApps;
        }
        else {
            for (var i = 0; i < member.permission._.u.length; i++) {
                userApps = userApps.concat(member.permission._.u[i]);
            }
            return userApps.concat(member.permission._.a);
        }
    };

    countlyAuth.getAdminApps = function() {
        var member = countlyGlobal.member;
        var adminApps = [];
        if (member.global_admin) {
            for (var app in countlyGlobal.apps) {
                adminApps.push(app);
            }
            return adminApps;
        }
        else {
            return member.permission._.a;
        }
    };

    countlyAuth.featureBeautifier = function(featureName) {
        var withDash = featureName.replaceAll("_", "-");
        var withUnderscore = featureName.replaceAll("-", "_");
        var localizedName = $.i18n.map[withDash + ".plugin-title"] || $.i18n.map[withDash + ".title"] || $.i18n.map[withUnderscore + ".plugin-title"] || $.i18n.map[withUnderscore + ".title"] || featureName;
        return localizedName.split(" ").map(function(word) {
            return word.charAt(0).toUpperCase() + word.slice(1);
        }).join(" ");
    };

})(window.countlyAuth = window.countlyAuth || {});