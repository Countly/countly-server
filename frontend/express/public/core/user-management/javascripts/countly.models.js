/* global window, $ */

(function(countlyUserManagement) {
    
    var _users = [],
        _user = {
            "_id":null,
            "full_name": null,
            "username":null,
            "permission": {_: {u: [[]], a: []}},
            "global_admin": false,
            "created_at": null
        },
        _features = [];

    countlyUserManagement.getFeatures = function() {
        return _features;
    }

    countlyUserManagement.getUsers = function() {
        return _users;
    }

    countlyUserManagement.getUser = function() {
        return _user;
    }

    countlyUserManagement.fetchUsers = function() {
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r + '/users/all',
            dataType: "json",
            data: {
                app_id: countlyCommon.ACTIVE_APP_ID
            },
            success: function(json) {
                _users = json;
            },
            error: function(xhr, status, error) {
                console.log('/users/all request failed w:' , error);
            }
        });
    }

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
                _user = json;
            },
            error: function(xhr, status, error) {
                console.log('/users/id request failed w:' , error);
            }
        });
    }

    countlyUserManagement.deleteUser = function(id, callback) {
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.w + '/users/delete',
            dataType: "json",
            data: {
                app_id: countlyCommon.ACTIVE_APP_ID,
                id: id
            },
            success: function(json) {
                callback(json);
            },
            error: function(xhr, status, error) {
                console.log('/users/delete request failed w:' , error);
            }
        });
    }

    countlyUserManagement.editUser = function(id, user, callback) {
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.w + '/users/update',
            dataType: "json",
            data: {
                app_id: countlyCommon.ACTIVE_APP_ID,
                id: id,
                args: user
            },
            success: function(json) {
                callback(json);
            },
            error: function(xhr, status, error) {
                console.log('/users/update request failed w:' , error);
            }
        });
    }

    countlyUserManagement.createUser = function(user, callback) {
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.w + '/users/create',
            dataType: "json",
            data: {
                app_id: countlyCommon.ACTIVE_APP_ID,
                args: user
            },
            success: function(json) {
                callback(json);
            },
            error: function(xhr, status, error) {
                console.log('/users/create request failed w:' , error);
            }
        });
    }

    countlyUserManagement.fetchFeatures = function() {
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r + '/users/permissions',
            dataType: "json",
            success: function(json) {
                _features = json;
            },
            error: function(xhr, status, error) {
                console.log('/users/permissions request failed w:' , error);
            }
        });
    }

})((window.countlyUserManagement = window.countlyUserManagement || {}));
