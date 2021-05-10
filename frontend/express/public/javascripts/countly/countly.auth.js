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
                api_key: countlyGlobal.member.api_key,
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
     * helper function for beautifiy feature name in table
     * @param {string} featureName - feature name will be beautified
     * @returns {string} - it returns beautified feature name
     */
    function featureBeautifier(featureName) {
        var fa = featureName.split('_');
        var ret = '';
        for (var i = 0; i < fa.length; i++) {
            ret += fa[i].substr(0, 1).toUpperCase() + fa[i].substr(1, fa[i].length - 1) + ' ';
        }
        return ret;
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
            /*
            if (typeof feature !== 'undefined' && feature.substr(0, 7) === 'global_') {
                feature = feature.split('_')[1];
                if (!((member.permission && typeof member.permission[accessType] === "object" && typeof member.permission[accessType].global === "object") && (member.permission[accessType].global.all || member.permission[accessType].global.allowed[feature]))) {
                    return false;
                }
            }
            */
            if (!((member.permission && typeof member.permission[accessType] === "object" && typeof member.permission[accessType][app_id] === "object") && (member.permission[accessType][app_id].all || member.permission[accessType][app_id].allowed[feature]))) {
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
            /*
            if (typeof feature !== 'undefined' && feature.substr(0, 7) === 'global_') {
                feature = feature.split('_')[1];
                if (!((member.permission && typeof member.permission.r === "object" && typeof member.permission.r.global === "object") && (member.permission.r.global.all || member.permission.r.global.allowed[feature]))) {
                    return false;
                }
            }
            */
            if (!((member.permission && typeof member.permission.r === "object" && typeof member.permission.r[app_id] === "object") && (member.permission.r[app_id].all || member.permission.r[app_id].allowed[feature]))) {
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

    countlyAuth.renderFeatureTemplate = function(featureName, index) {
        var odd = countlyAuth.odd;
        countlyAuth.odd = !countlyAuth.odd;
        var beautifiedFeatureName = featureBeautifier(featureName);

        var featureTemplate = '<div class="permission-item ' + (odd ? 'gray' : '') + '">';
        featureTemplate += '    <div class="permission-column first-column">' + beautifiedFeatureName + '</div>';
        featureTemplate += '    <div class="permission-column">';
        featureTemplate += '        <div class="permission-checkbox" id="c-' + featureName + '-' + index + '"></div>';
        featureTemplate += '    </div>';
        featureTemplate += '    <div class="permission-column">';
        featureTemplate += '        <div class="permission-checkbox" id="r-' + featureName + '-' + index + '"></div>';
        featureTemplate += '    </div>';
        featureTemplate += '    <div class="permission-column">';
        featureTemplate += '        <div class="permission-checkbox" id="u-' + featureName + '-' + index + '"></div>';
        featureTemplate += '    </div>';
        featureTemplate += '    <div class="permission-column">';
        featureTemplate += '        <div class="permission-checkbox" id="d-' + featureName + '-' + index + '"></div>';
        featureTemplate += '    </div>';
        featureTemplate += '    <div style="clear:both"></div>';
        featureTemplate += '</div>';
        return featureTemplate;
    };

    countlyAuth.clearDrawer = function(parent_el, sets) {
        var selector = parent_el.indexOf('group') !== -1 ? 'groups' : 'users';
        $('#manage-' + selector + '-admin-app-selector')[0].selectize.setValue([]);
        for (var i = 0; i < sets.length; i++) {
            $(parent_el + ' #user-app-selector-' + i)[0].selectize.setValue([]);
        }
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

})(window.countlyAuth = window.countlyAuth || {});