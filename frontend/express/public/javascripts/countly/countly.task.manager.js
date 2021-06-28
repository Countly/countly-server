/* global countlyCommon, countlyGlobal, countlyAssistant, CountlyHelpers, store, app, jQuery*/
(function(countlyTaskManager, $) {

    //Private Properties
    var _resultData = [],
        _resultObj = {},
        _data = {},
        curTask = 0;

    //Public Methods
    countlyTaskManager.initialize = function(isRefresh, query) {
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r + "/tasks/all",
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "query": JSON.stringify(query || {}),
                "display_loader": !isRefresh
            },
            dataType: "json",
            success: function(json) {
                _resultData = json;
                for (var i = 0; i < json.length; i++) {
                    if (json[i].request) {
                        json[i].request = JSON.parse(json[i].request);
                    }
                    _resultObj[json[i]._id] = json[i];
                }
            }
        });
    };

    countlyTaskManager.getLastReports = function(callback) {
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r + "/tasks/list",
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "query": JSON.stringify({"manually_create": false}),
                "display_loader": false,
                'sSortDir_0': 'desc',
                'iDisplayLength': 10,
                'iDisplayStart': 0,
                "iSortCol_0": 8//sort by started
            },
            dataType: "json",
            success: function(json) {
                json = json || {};
                json.aaData = json.aaData || [];
                callback(json.aaData);
            }
        });
    };

    countlyTaskManager.get_response_text = function(xhr, status, error) {
        var resp;
        if (xhr.responseText) {
            try {
                resp = JSON.parse(xhr.responseText);
                if (resp && resp.result) {
                    resp = resp.result;
                }
                else {
                    resp = null;
                }
            }
            catch (ex) {
                resp = null;
            }
        }
        if (!resp) {
            resp = error;
        }
        return resp;
    };

    countlyTaskManager.fetchResult = function(id, callback) {
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r + "/tasks/task",
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "task_id": id,
                "display_loader": false
            },
            dataType: "json",
            success: function(json) {
                if (json.data) {
                    try {
                        json.data = JSON.parse(json.data);
                    }
                    catch (e) { /**/ }
                }
                if (json.request) {
                    json.request = JSON.parse(json.request);
                }
                _data[id] = json;
                if (callback) {
                    callback(json);
                }
            },
            error: function() {
                if (callback) {
                    callback(false);
                }
            }
        });
    };

    countlyTaskManager.fetchTaskInfo = function(id, callback) {
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r + "/tasks/task",
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "task_id": id,
                "display_loader": false,
                "only_info": true
            },
            dataType: "json",
            success: function(json) {
                if (json.data) {
                    try {
                        json.data = JSON.parse(json.data);
                    }
                    catch (e) { /**/ }
                }
                if (json.request) {
                    json.request = JSON.parse(json.request);
                }
                _data[id] = json;
                if (callback) {
                    callback(json);
                }
            },
            error: function() {
                if (callback) {
                    callback(false);
                }
            }
        });
    };


    countlyTaskManager.fetchSubtaskResult = function(id, options, callback) {
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r + "/tasks/task",
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "task_id": id,
                "display_loader": false,
                "subtask_key": options.subtask_key
            },
            dataType: "json",
            success: function(json) {
                if (json.data) {
                    json.data = JSON.parse(json.data);
                }
                if (json.request) {
                    json.request = JSON.parse(json.request);
                }
                if (json.subtask) {
                    if (!_data[json.subtask]) {
                        _data[json.subtask] = {taskgroup: true, subtasks: {}};
                    }
                    _data[json.subtask].subtasks[json.subtask_key] = json._id;
                    _data[json._id] = json;
                }
                else {
                    _data[id] = json;
                }
                if (callback) {
                    callback(json);
                }
            },
            error: function() {
                if (callback) {
                    callback(false);
                }
            }
        });
    };

    countlyTaskManager.getResult = function(id) {
        if (typeof id === 'object') {
            if (id.subtask_key && id.id) {
                if (_data[id.id] && _data[id.id].taskgroup === true) {
                    if (_data[id.id].subtasks[id.subtask_key] && _data[_data[id.id].subtasks[id.subtask_key]]) {
                        return _data[_data[id.id].subtasks[id.subtask_key]];
                    }
                    else {
                        return null;
                    }
                }
                else {
                    return _data[id.id];
                }
            }
        }
        return _data[id];
    };

    countlyTaskManager.getSubtaskId = function(options) {
        if (options && options.subtask_key && options.id) {
            if (_data[options.id] && _data[options.id].taskgroup === true) {
                if (_data[options.id].subtasks[options.subtask_key]) {
                    return _data[options.id].subtasks[options.subtask_key];
                }
            }
            else {
                return options.id;
            }
        }
    };

    countlyTaskManager.getTask = function(id) {
        return _resultObj[id];
    };

    countlyTaskManager.common = function(id, path, callback) {
        var data = {};
        if (typeof id === "string") {
            data.task_id = id;
        }
        else {
            data = id || {};
        }
        data.app_id = countlyCommon.ACTIVE_APP_ID;
        $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.w + '/tasks/' + path,
            data: data,
            dataType: "json",
            success: function(json) {
                if (callback) {
                    callback(json);
                }
            },
            error: function(xhr, status, error) {
                if (callback) {
                    callback(false, countlyTaskManager.get_response_text(xhr, status, error));
                }
            }
        });
    };

    countlyTaskManager.del = function(id, callback) {
        countlyTaskManager.common(id, "delete", callback);
    };

    countlyTaskManager.update = function(id, callback) {
        countlyTaskManager.common(id, "update", callback);
    };

    countlyTaskManager.name = function(id, name, callback) {
        countlyTaskManager.common({id: id, name: name}, "name", callback);
    };

    countlyTaskManager.check = function(id, callback) {
        $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r + '/tasks/check',
            data: {
                task_id: id,
                app_id: countlyCommon.ACTIVE_APP_ID
            },
            dataType: "json",
            success: function(json) {
                if (callback) {
                    callback(json);
                }
            },
            error: function() {
                if (callback) {
                    callback(false);
                }
            }
        });
    };

    countlyTaskManager.reset = function() {
        _resultData = [];
        _resultObj = {};
        _data = {};
        curTask = 0;
    };

    countlyTaskManager.getResults = function() {
        return _resultData;
    };

    countlyTaskManager.makeTaskNotification = function(title, message, info, data, notifSubType, i18nId, notificationVersion) {
        var contentData = data;
        var ownerName = "ReportManager";
        var notifType = 4;//informational notification, check assistant.js for additional types
        countlyAssistant.createNotification(contentData, ownerName, notifType, notifSubType, i18nId, countlyCommon.ACTIVE_APP_ID, notificationVersion, countlyGlobal.member.api_key, function(res) {
            if (!res) {
                CountlyHelpers.notify({
                    title: title,
                    message: message,
                    info: info
                });
            }
        });
    };

    countlyTaskManager.monitor = function(id, silent) {
        var monitor = store.get("countly_task_monitor") || {};
        if (!monitor[countlyCommon.ACTIVE_APP_ID]) {
            monitor[countlyCommon.ACTIVE_APP_ID] = [];
        }
        if (monitor[countlyCommon.ACTIVE_APP_ID].indexOf(id) === -1) {
            monitor[countlyCommon.ACTIVE_APP_ID].push(id);
            store.set("countly_task_monitor", monitor);
            if (!silent) {
                $(".orange-side-notification-banner-wrapper").css("display", "block");
                app.updateLongTaskViewsNofification();
                /*CountlyHelpers.notify({
                    title: jQuery.i18n.map["assistant.taskmanager.longTaskTooLong.title"],
                    message: jQuery.i18n.map["assistant.taskmanager.longTaskTooLong.message"],
                    info: jQuery.i18n.map["assistant.taskmanager.longTaskTooLong.info"]
                });*/
            }
        }
        else {
            if (!silent) {
                CountlyHelpers.notify({
                    title: jQuery.i18n.map["assistant.taskmanager.longTaskAlreadyRunning.title"],
                    message: jQuery.i18n.map["assistant.taskmanager.longTaskAlreadyRunning.message"],
                    info: jQuery.i18n.map["assistant.taskmanager.longTaskTooLong.info"]
                });
            }
        }
    };

    countlyTaskManager.tick = function() {
        var assistantAvailable = true;
        app.updateLongTaskViewsNofification();
        if (typeof countlyAssistant === "undefined") {
            assistantAvailable = false;
        }
        var monitor = store.get("countly_task_monitor") || {};
        if (monitor[countlyCommon.ACTIVE_APP_ID] && monitor[countlyCommon.ACTIVE_APP_ID][curTask]) {
            var id = monitor[countlyCommon.ACTIVE_APP_ID][curTask];
            countlyTaskManager.check(id, function(res) {
                if (res === false || res.result === "completed" || res.result === "errored") {

                    //get it from storage again, in case it has changed
                    monitor = store.get("countly_task_monitor") || {};
                    //get index of task, cause it might have been changed
                    var index = monitor[countlyCommon.ACTIVE_APP_ID].indexOf(id);
                    //remove item
                    if (index !== -1) {
                        monitor[countlyCommon.ACTIVE_APP_ID].splice(index, 1);
                        store.set("countly_task_monitor", monitor);
                    }

                    //notify task completed
                    if (res && res.result === "completed") {
                        countlyTaskManager.fetchTaskInfo(id, function(res1) {
                            if (res1 && res1.type === "tableExport") {
                                if (res1.report_name) {
                                    res1.name = "<span style='overflow-wrap: break-word;'>" + res1.report_name + "</span>";
                                }
                            }
                            if (res1 && res1.manually_create === false) {
                                $("#manage-long-tasks-icon").addClass('unread'); //new notification. Add unread
                                app.haveUnreadReports = true;
                                app.updateLongTaskViewsNofification();
                            }
                            if (res1 && res1.view) {
                                if (!assistantAvailable) {
                                    CountlyHelpers.notify({
                                        title: jQuery.i18n.prop("assistant.taskmanager.completed.title", "", res1.name || ""),
                                        message: jQuery.i18n.map["assistant.taskmanager.completed.message"],
                                        info: jQuery.i18n.map["assistant.taskmanager.longTaskTooLong.info"],
                                        sticky: true,
                                        onClick: function() {
                                            app.navigate(res1.view + id, true);
                                        }
                                    });
                                }
                                else {
                                    countlyTaskManager.makeTaskNotification(
                                        jQuery.i18n.prop("assistant.taskmanager.completed.title", "", res1.name || ""),
                                        jQuery.i18n.map["assistant.taskmanager.completed.message"],
                                        jQuery.i18n.map["assistant.taskmanager.longTaskTooLong.info"],
                                        [res1.view + id, res1.name || ""], 3, "assistant.taskmanager.completed", 1);
                                }
                            }
                        });
                    }
                    else if (res && res.result === "errored") {
                        countlyTaskManager.fetchTaskInfo(id, function(res1) {
                            if (res1 && res1.type === "tableExport") {
                                if (res1.report_name) {
                                    res1.name = "<span style='overflow-wrap: break-word;'>" + res1.report_name + "</span>";
                                }
                            }
                            if (res1 && res1.view) {
                                if (res1.manually_create === false) {
                                    $("#manage-long-tasks-icon").addClass('unread'); //new notification. Add unread
                                    app.haveUnreadReports = true;
                                    app.updateLongTaskViewsNofification();
                                }
                                if (!assistantAvailable) {
                                    CountlyHelpers.notify({
                                        title: jQuery.i18n.prop("assistant.taskmanager.errored.title", res1.name || ""),
                                        message: jQuery.i18n.map["assistant.taskmanager.errored.message"],
                                        info: jQuery.i18n.map["assistant.taskmanager.errored.info"],
                                        type: "error",
                                        sticky: true,
                                        onClick: function() {
                                            app.navigate("#/manage/tasks", true);
                                        }
                                    });
                                }
                                else {
                                    countlyTaskManager.makeTaskNotification(
                                        jQuery.i18n.prop("assistant.taskmanager.errored.title", res1.name || ""),
                                        jQuery.i18n.map["assistant.taskmanager.errored.message"],
                                        jQuery.i18n.map["assistant.taskmanager.errored.info"],
                                        [res1.name || ""], 4, "assistant.taskmanager.errored", 1);
                                }
                            }
                        });
                    }
                }
                else {
                    curTask++;
                }
                if (curTask >= monitor[countlyCommon.ACTIVE_APP_ID].length) {
                    curTask = 0;
                }
                setTimeout(function() {
                    countlyTaskManager.tick();
                }, countlyCommon.DASHBOARD_REFRESH_MS);
            });
        }
        else {
            setTimeout(function() {
                countlyTaskManager.tick();
            }, countlyCommon.DASHBOARD_REFRESH_MS);
        }
    };

    $(document).ready(function() {
        countlyTaskManager.tick();
        var initial = true;
        //listen for UI app change
        app.addAppSwitchCallback(function() {
            if (initial) {
                initial = false;
            }
            else {
                countlyTaskManager.reset();
            }
        });
    });

}(window.countlyTaskManager = window.countlyTaskManager || {}, jQuery));