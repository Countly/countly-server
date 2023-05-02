/* global countlyCommon, countlyGlobal, $ */

(function(countlyUserManagement) {
    var _users = [],
        _user = {},
        _emptyPermissionObject = { c: {}, r: {}, u: {}, d: {}, _: { u: [[]], a: [] } },
        _permissionSet = {c: {all: false, allowed: {}}, r: {all: false, allowed: { core: true }}, u: {all: false, allowed: {}}, d: {all: false, allowed: {}}},
        _features = [],
        _featuresPermissionDependency = {},
        _inverseFeaturesPermissionDependency = {};

    countlyUserManagement.getEmptyPermissionObject = function() {
        return _emptyPermissionObject;
    };

    countlyUserManagement.getEmptyPermissionSet = function() {
        return _permissionSet;
    };

    countlyUserManagement.getFeatures = function() {
        return _features;
    };

    countlyUserManagement.getFeaturesPermissionDependency = function() {
        return _featuresPermissionDependency;
    };

    countlyUserManagement.getInverseFeaturesPermissionDependency = function() {
        return _inverseFeaturesPermissionDependency;
    };

    countlyUserManagement.getUsers = function() {
        return _users;
    };

    countlyUserManagement.getEmptyUser = function() {
        var _emptyUser = {
            "_id": null,
            "full_name": null,
            "username": null,
            "password": null,
            "email": null,
            "permission": { c: {}, r: {}, u: {}, d: {}, _: { u: [[]], a: [] } },
            "global_admin": false,
            "created_at": null
        };
        return _emptyUser;
    };

    countlyUserManagement.getUser = function() {
        return _user;
    };

    countlyUserManagement.fetchUsers = function() {
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r + '/users/all',
            dataType: "json",
            data: {
                app_id: countlyCommon.ACTIVE_APP_ID,
                "preventRequestAbort": true
            },
            success: function(json) {
                _users = json;
            },
            error: function(/*xhr, status, error*/) {
                // TODO: handle error
            }
        });
    };

    countlyUserManagement.fetchUserDetail = function(id) {
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r + '/users/id',
            dataType: "json",
            data: {
                app_id: countlyCommon.ACTIVE_APP_ID,
                id: id
            },
            success: function(json) {
                _user = json[Object.keys(json)[0]];
            },
            error: function(/*xhr, status, error*/) {
                // TODO: handle error
            }
        });
    };

    countlyUserManagement.deleteUser = function(id, callback) {
        return $.ajax({
            type: "POST",
            url: countlyCommon.API_PARTS.data.w + '/users/delete',
            dataType: "json",
            data: {
                app_id: countlyCommon.ACTIVE_APP_ID,
                args: JSON.stringify({ user_ids: [id]})
            },
            success: function(json) {
                callback(json);
            },
            error: function(err) {
                callback(err.responseJSON.result);
            }
        });
    };

    countlyUserManagement.editUser = function(id, user, callback) {
        // inject user_id property to user object
        user.user_id = id;

        return $.ajax({
            type: "POST",
            url: countlyCommon.API_PARTS.data.w + '/users/update',
            dataType: "json",
            data: {
                app_id: countlyCommon.ACTIVE_APP_ID,
                args: JSON.stringify(user)
            },
            success: function(json) {
                callback(json);
            },
            error: function(err) {
                callback(err.responseJSON.result);
            }
        });
    };

    countlyUserManagement.createUser = function(user, callback) {
        return $.ajax({
            type: "POST",
            url: countlyCommon.API_PARTS.data.w + '/users/create',
            data: {
                app_id: countlyCommon.ACTIVE_APP_ID,
                args: JSON.stringify(user)
            },
            success: function(json) {
                callback(json);
            },
            error: function(err) {
                callback(err.responseJSON.result);
            }
        });
    };

    countlyUserManagement.fetchFeatures = function() {
        return $.ajax({
            type: 'GET',
            url: countlyCommon.API_URL + "/o/users/permissions",
            data: {
                app_id: countlyGlobal.defaultApp._id,
                _t: Date.now()
            },
            success: function(res) {
                _features = res.features;
                _featuresPermissionDependency = res.featuresPermissionDependency;
                //read permission check, making sure that read is present in every dependency array if any other permission is given
                for (var feature in _featuresPermissionDependency) {
                    var perms = Object.keys(_featuresPermissionDependency[feature]);
                    for (var perm of perms) {
                        var permFeatures = Object.keys(_featuresPermissionDependency[feature][perm]);
                        for (var permFeature of permFeatures) {
                            var targetAr = _featuresPermissionDependency[feature][perm][permFeature];
                            if (targetAr.length && targetAr.indexOf('r') === -1) {
                                _featuresPermissionDependency[feature][perm][permFeature].push('r');
                            }
                        }
                    }
                }
                //building inverse featuresPermissionDependency object to ease up reverse dependency lookup
                var inverseComboPermissionSets = {};
                for (var invFeature in _featuresPermissionDependency) {
                    var invPerms = Object.keys(_featuresPermissionDependency[invFeature]);
                    for (var invPerm of invPerms) {
                        var invPermFeatures = Object.keys(_featuresPermissionDependency[invFeature][invPerm]);
                        for (var invPermFeature of invPermFeatures) {
                            if (!inverseComboPermissionSets[invPermFeature]) {
                                inverseComboPermissionSets[invPermFeature] = {c: {}, r: {}, u: {}, d: {}};
                            }
                            for (var index = 0; index < _featuresPermissionDependency[invFeature][invPerm][invPermFeature].length; index++) {
                                var localPerm = _featuresPermissionDependency[invFeature][invPerm][invPermFeature][index];
                                if (!inverseComboPermissionSets[invPermFeature][localPerm][invFeature]) {
                                    inverseComboPermissionSets[invPermFeature][localPerm][invFeature] = true;
                                }
                            }
                        }
                    }
                }
                _inverseFeaturesPermissionDependency = inverseComboPermissionSets;
            }
        });
    };

})((window.countlyUserManagement = window.countlyUserManagement || {}));
