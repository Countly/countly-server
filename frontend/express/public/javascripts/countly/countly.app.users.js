/*global countlyCommon, countlyTaskManager, jQuery, $*/
(function(countlyAppUsers) {

    //export data for user based on passed id
    //callback(error, fileid(if exist), taskid(if exist))
    countlyAppUsers.exportUser = function(query, callback) {
        $.ajax({
            type: "POST",
            url: countlyCommon.API_PARTS.data.w + "/app_users/export",
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "query": query
            },
            success: function(result) {
                var task_id = null;
                var fileid = null;
                if (result && result.result && result.result.task_id) {
                    task_id = result.result.task_id;
                    countlyTaskManager.monitor(task_id);
                }
                else if (result && result.result) {
                    fileid = result.result;
                }
                callback(null, fileid, task_id);
            },
            error: function(xhr, status, error) {
                var filename = null;
                if (xhr && xhr.responseText && xhr.responseText !== "") {
                    var ob = JSON.parse(xhr.responseText);
                    if (ob.result && ob.result.message) {
                        error = ob.result.message;
                    }
                    if (ob.result && ob.result.filename) {
                        filename = ob.result.filename;
                    }
                }
                callback(error, filename, null);
            }
        });
    };

    //delete specific export data
    //callback(error, fileid(if exist), taskid(if exist))
    countlyAppUsers.deleteExport = function(eid, callback) {
        $.ajax({
            type: "POST",
            url: countlyCommon.API_PARTS.data.w + "/app_users/deleteExport/appUser_" + countlyCommon.ACTIVE_APP_ID + "_" + eid,
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID,
            },
            success: function(result) {
                callback(null, result);
            },
            error: function(xhr, status, error) {
                callback(error, null);
            }
        });
    };

    //delete all data about specific users
    //callback(error, fileid(if exist), taskid(if exist))
    countlyAppUsers.deleteUserdata = function(query, force, callback) {
        if (typeof force === "function") {
            callback = force;
            force = false;
        }
        var data = {
            "app_id": countlyCommon.ACTIVE_APP_ID,
            "query": query
        };
        if (force) {
            data.force = true;
        }
        $.ajax({
            type: "POST",
            url: countlyCommon.API_PARTS.data.w + "/app_users/delete",
            data: data,
            success: function(result) {
                callback(null, result);
            },
            error: function(xhr, status, error) {
                if (xhr.responseJSON && xhr.responseJSON.result && xhr.responseJSON.result.errorMessage) {
                    callback(xhr.responseJSON.result.errorMessage, null);
                }
                else {
                    callback(error, null);
                }
            }
        });
    };

}(window.countlyAppUsers = window.countlyAppUsers || {}, jQuery));