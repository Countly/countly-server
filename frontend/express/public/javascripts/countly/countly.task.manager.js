/* global countlyCommon, countlyGlobal, countlyAssistant, CountlyHelpers, store, app, jQuery, countlyVue, CV, Promise, Vue*/
(function(countlyTaskManager, $) {

    //Private Properties
    var _resultData = [],
        _resultObj = {},
        _data = {};

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

    var notifiers = {
        dispatched: function() {
            CountlyHelpers.notify({
                title: CV.i18n("assistant.taskmanager.longTaskTooLong.title"),
                message: CV.i18n("assistant.taskmanager.longTaskTooLong.message"),
                info: CV.i18n("assistant.taskmanager.longTaskTooLong.info")
            });
        },
        duplicate: function() {
            CountlyHelpers.notify({
                title: CV.i18n("assistant.taskmanager.longTaskAlreadyRunning.title"),
                message: CV.i18n("assistant.taskmanager.longTaskAlreadyRunning.message"),
                info: CV.i18n("assistant.taskmanager.longTaskTooLong.info")
            });
        },
        completed: function(id, fetchedTask) {
            var assistantAvailable = typeof countlyAssistant !== "undefined";
            if (!assistantAvailable) {
                CountlyHelpers.notify({
                    title: CV.i18n("assistant.taskmanager.completed.title", "", fetchedTask.name || ""),
                    message: CV.i18n("assistant.taskmanager.completed.message"),
                    info: CV.i18n("assistant.taskmanager.longTaskTooLong.info"),
                    sticky: true,
                    onClick: function() {
                        app.navigate(fetchedTask.view + id, true);
                    }
                });
            }
            else {
                countlyTaskManager.makeTaskNotification(
                    CV.i18n("assistant.taskmanager.completed.title", "", fetchedTask.name || ""),
                    CV.i18n("assistant.taskmanager.completed.message"),
                    CV.i18n("assistant.taskmanager.longTaskTooLong.info"),
                    [fetchedTask.view + id, fetchedTask.name || ""], 3, "assistant.taskmanager.completed", 1);
            }
        },
        errored: function(id, fetchedTask) {
            var assistantAvailable = typeof countlyAssistant !== "undefined";
            if (!assistantAvailable) {
                CountlyHelpers.notify({
                    title: CV.i18n("assistant.taskmanager.errored.title", fetchedTask.name || ""),
                    message: CV.i18n("assistant.taskmanager.errored.message"),
                    info: CV.i18n("assistant.taskmanager.errored.info"),
                    type: "error",
                    sticky: true,
                    onClick: function() {
                        app.navigate("#/manage/tasks", true);
                    }
                });
            }
            else {
                countlyTaskManager.makeTaskNotification(
                    CV.i18n("assistant.taskmanager.errored.title", fetchedTask.name || ""),
                    CV.i18n("assistant.taskmanager.errored.message"),
                    CV.i18n("assistant.taskmanager.errored.info"),
                    [fetchedTask.name || ""], 4, "assistant.taskmanager.errored", 1);
            }
        }
    };

    var taskManagerVuex = countlyVue.vuex.Module("countlyTaskManager", {
        state: function() {
            var persistent = store.get("countly_task_monitor") || {};
            var unreadPersistent = store.get("countly_task_monitor_unread") || {};
            return {
                monitored: persistent,
                unread: unreadPersistent,
                opId: 0,
                curTask: 0
            };
        },
        getters: {
            unreadStats: function(state) {
                var unread = state.unread;

                return Object.keys(unread).reduce(function(acc, appId) {
                    var appTasks = unread[appId],
                        taskIds = Object.keys(appTasks),
                        obj = {
                            _total: taskIds.length
                        };

                    taskIds.forEach(function(taskId) {
                        var origin = appTasks[taskId].type;
                        if (!obj[origin]) {
                            obj[origin] = 0;
                        }
                        obj[origin]++;
                    });
                    acc[appId] = obj;
                    return acc;
                }, {});
            }
        },
        mutations: {
            incrementOpId: function(state) {
                state.opId += 1;
            },
            incrementCurTask: function(state) {
                state.curTask += 1;
            },
            resetCurTask: function(state) {
                state.curTask = 0;
            },
            reloadPersistent: function(state) {
                state.monitored = store.get("countly_task_monitor") || {};
                state.unread = store.get("countly_task_monitor_unread") || {};
            },
            registerTask: function(state, payload) {
                var monitored = state.monitored,
                    appId = payload.appId,
                    taskId = payload.taskId;

                if (!monitored[appId]) {
                    monitored[appId] = [];
                }
                if (monitored[appId].indexOf(taskId) === -1) {
                    monitored[appId].push(taskId);
                    store.set("countly_task_monitor", state.monitored);
                }
            },
            unregisterTask: function(state, payload) {
                var monitored = state.monitored,
                    appId = payload.appId,
                    taskId = payload.taskId;

                var index = monitored[appId].indexOf(taskId);

                if (index !== -1) {
                    monitored[appId].splice(index, 1);
                    store.set("countly_task_monitor", state.monitored);
                }
            },
            setUnread: function(state, payload) {
                var unread = state.unread,
                    task = payload.task,
                    appId = task.app_id;

                if (!unread[appId]) {
                    Vue.set(unread, appId, {});
                }
                Vue.set(unread[appId], task._id, {type: task.type});
                store.set("countly_task_monitor_unread", unread);
            },
            setRead: function(state, payload) {
                var unread = state.unread,
                    appId = payload.appId,
                    taskId = payload.taskId;

                if (unread[appId]) {
                    Vue.delete(unread[appId], taskId);
                    store.set("countly_task_monitor_unread", unread);
                }
            }
        },
        actions: {
            tick: function(context, payload) {
                payload = payload || {};
                return new Promise(function(resolve) {
                    context.commit("reloadPersistent");

                    var monitored = context.state.monitored,
                        appId = payload.appId || countlyCommon.ACTIVE_APP_ID,
                        curTask = context.state.curTask;

                    if (monitored[appId] && monitored[appId][curTask]) {
                        var id = monitored[appId][curTask];
                        countlyTaskManager.check(id, function(checkedTask) {
                            if (checkedTask === false || checkedTask.result === "completed" || checkedTask.result === "errored") {

                                //get it from storage again, in case it has changed
                                context.commit("reloadPersistent");
                                monitored = context.state.monitored;
                                context.commit("unregisterTask", {
                                    appId: appId,
                                    taskId: id
                                });

                                //notify task completed
                                if (checkedTask && checkedTask.result) {
                                    countlyTaskManager.fetchTaskInfo(id, function(fetchedTask) {
                                        if (!fetchedTask) {
                                            return;
                                        }
                                        if (fetchedTask.type === "tableExport") {
                                            if (fetchedTask.report_name) {
                                                fetchedTask.name = "<span style='overflow-wrap: break-word;'>" + fetchedTask.report_name + "</span>";
                                            }
                                        }
                                        if (fetchedTask.manually_create === false) {
                                            context.commit("reloadPersistent");
                                            context.commit("setUnread", {
                                                task: fetchedTask
                                            });
                                        }
                                        if (fetchedTask.view) {
                                            if (checkedTask.result === "completed") {
                                                notifiers.completed(id, fetchedTask);
                                            }
                                            else if (checkedTask.result === "errored") {
                                                notifiers.errored(id, fetchedTask);
                                            }
                                        }
                                        context.commit("incrementOpId");
                                    });
                                }
                            }
                            else {
                                context.commit("incrementCurTask");
                            }
                            if (context.state.curTask >= monitored[appId].length) {
                                context.commit("resetCurTask");
                            }
                            resolve();
                        });
                    }
                    else {
                        resolve();
                    }
                });
            },
            monitor: function(context, payload) {
                context.commit("reloadPersistent");
                var monitored = context.state.monitored,
                    appId = payload.appId || countlyCommon.ACTIVE_APP_ID,
                    taskId = payload.taskId;

                if (!monitored[appId] || monitored[appId].indexOf(taskId) === -1) {
                    context.commit("registerTask", {
                        appId: countlyCommon.ACTIVE_APP_ID,
                        taskId: payload.taskId
                    });
                    if (!payload.silent) {
                        notifiers.dispatched();
                    }
                    context.commit("incrementOpId");
                }
                else if (!payload.silent) {
                    notifiers.duplicate();
                }
            }
        }
    });

    countlyVue.vuex.registerGlobally(taskManagerVuex);

    var vuexStore = countlyVue.vuex.getGlobalStore();

    countlyTaskManager.monitor = function(id, silent) {
        vuexStore.dispatch("countlyTaskManager/monitor", {
            taskId: id,
            silent: silent
        });
    };

    countlyTaskManager.tick = function() {
        vuexStore.dispatch("countlyTaskManager/tick").then(function() {
            setTimeout(function() {
                countlyTaskManager.tick();
            }, countlyCommon.DASHBOARD_REFRESH_MS);
        });
    };

    countlyTaskManager.reset = function() {
        _resultData = [];
        _resultObj = {};
        _data = {};
        vuexStore.commit("countlyTaskManager/resetCurTask");
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
                vuexStore.commit("countlyTaskManager/incrementOpId");
            }
        });
    });

}(window.countlyTaskManager = window.countlyTaskManager || {}, jQuery));