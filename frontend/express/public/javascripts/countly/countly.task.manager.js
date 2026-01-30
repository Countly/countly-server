import countlyCommon from './countly.common.js';
import { notify } from './countly.helpers.js';
import countlyVue from './vue/core.js';
import store from 'storejs';
import jQuery from 'jquery';
import Vue from 'vue';

// Private Properties
let _resultData = [];
let _resultObj = {};
let _data = {};

/**
 * Parses the response text from an AJAX error response
 * @param {XMLHttpRequest} xhr - The XMLHttpRequest object
 * @param {string} status - The status text of the response
 * @param {string} error - The error message
 * @returns {string|Object} The parsed result from the response or the error message
 */
export function get_response_text(xhr, status, error) {
    let resp;
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
}

/**
 * Initializes the task manager by fetching all tasks from the server
 * @param {boolean} isRefresh - Whether this is a refresh call (affects loader display)
 * @param {Object} [query] - Optional query parameters to filter tasks
 * @returns {jQuery.jqXHR} jQuery AJAX promise object
 */
export function initialize(isRefresh, query) {
    return jQuery.ajax({
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
            for (let i = 0; i < json.length; i++) {
                if (json[i].request) {
                    json[i].request = JSON.parse(json[i].request);
                }
                _resultObj[json[i]._id] = json[i];
            }
        }
    });
}

/**
 * Fetches the last 10 automatically created reports sorted by start time
 * @param {Function} callback - Callback function that receives the array of reports
 * @returns {jQuery.jqXHR} jQuery AJAX promise object
 */
export function getLastReports(callback) {
    return jQuery.ajax({
        type: "GET",
        url: countlyCommon.API_PARTS.data.r + "/tasks/list",
        data: {
            "app_id": countlyCommon.ACTIVE_APP_ID,
            "query": JSON.stringify({"manually_create": false}),
            "display_loader": false,
            'sSortDir_0': 'desc',
            'iDisplayLength': 10,
            'iDisplayStart': 0,
            "iSortCol_0": 8 // sort by started
        },
        dataType: "json",
        success: function(json) {
            json = json || {};
            json.aaData = json.aaData || [];
            callback(json.aaData);
        }
    });
}

/**
 * Fetches the full result of a task including its data
 * @param {string} id - The task ID to fetch
 * @param {Function} [callback] - Optional callback function that receives the task data or false on error
 * @returns {jQuery.jqXHR} jQuery AJAX promise object
 */
export function fetchResult(id, callback) {
    return jQuery.ajax({
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
}

/**
 * Fetches only the task information without the full data payload
 * @param {string} id - The task ID to fetch
 * @param {Function} [callback] - Optional callback function that receives the task info or false on error
 * @returns {jQuery.jqXHR} jQuery AJAX promise object
 */
export function fetchTaskInfo(id, callback) {
    return jQuery.ajax({
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
}

/**
 * Fetches the result of a subtask within a task group
 * @param {string} id - The parent task ID
 * @param {Object} options - Options object containing subtask_key
 * @param {string} options.subtask_key - The key identifying the subtask
 * @param {Function} [callback] - Optional callback function that receives the subtask data or false on error
 * @returns {jQuery.jqXHR} jQuery AJAX promise object
 */
export function fetchSubtaskResult(id, options, callback) {
    return jQuery.ajax({
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
}

/**
 * Gets the cached result of a task or subtask from local storage
 * @param {string|Object} id - The task ID as a string, or an object with id and subtask_key properties
 * @param {string} [id.id] - The task ID when id is an object
 * @param {string} [id.subtask_key] - The subtask key when id is an object
 * @returns {Object|null} The cached task data or null if not found
 */
export function getResult(id) {
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
}

/**
 * Gets the subtask ID from a task group based on the subtask key
 * @param {Object} options - Options object
 * @param {string} options.id - The parent task group ID
 * @param {string} options.subtask_key - The key identifying the subtask
 * @returns {string|undefined} The subtask ID or undefined if not found
 */
export function getSubtaskId(options) {
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
}

/**
 * Gets a task from the result object by its ID
 * @param {string} id - The task ID
 * @returns {Object|undefined} The task object or undefined if not found
 */
export function getTask(id) {
    return _resultObj[id];
}

/**
 * Makes a common API request to the tasks endpoint
 * @param {string|Object} id - The task ID as a string, or an object with additional parameters
 * @param {string} path - The API endpoint path (e.g., 'delete', 'update', 'name')
 * @param {Function} [callback] - Optional callback function that receives the response or false on error
 */
export function common(id, path, callback) {
    let data = {};
    if (typeof id === "string") {
        data.task_id = id;
    }
    else {
        data = id || {};
    }
    data.app_id = countlyCommon.ACTIVE_APP_ID;
    jQuery.ajax({
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
                callback(false, get_response_text(xhr, status, error));
            }
        }
    });
}

/**
 * Deletes a task by its ID
 * @param {string} id - The task ID to delete
 * @param {Function} [callback] - Optional callback function that receives the response or false on error
 */
export function del(id, callback) {
    common(id, "delete", callback);
}

/**
 * Updates a task by its ID
 * @param {string} id - The task ID to update
 * @param {Function} [callback] - Optional callback function that receives the response or false on error
 */
export function update(id, callback) {
    common(id, "update", callback);
}

/**
 * Renames a task
 * @param {string} id - The task ID to rename
 * @param {string} taskName - The new name for the task
 * @param {Function} [callback] - Optional callback function that receives the response or false on error
 */
export function name(id, taskName, callback) {
    common({id: id, name: taskName}, "name", callback);
}

/**
 * Checks the status of one or more tasks
 * @param {string|string[]} id - A single task ID or an array of task IDs to check
 * @param {Function} [callback] - Optional callback function that receives the check results or false on error
 */
export function check(id, callback) {
    const isMulti = Array.isArray(id);
    const tasks = isMulti ? JSON.stringify(id) : id;

    jQuery.ajax({
        type: isMulti ? "POST" : "GET",
        url: countlyCommon.API_PARTS.data.r + '/tasks/check',
        data: {
            task_id: tasks,
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
}

/**
 * Gets all cached task results
 * @returns {Array} Array of all task result data
 */
export function getResults() {
    return _resultData;
}

/**
 * Displays a task notification to the user
 * @param {string} title - The notification title
 * @param {string} message - The notification message
 * @param {string} info - Additional information to display
 */
export function makeTaskNotification(title, message, info) {
    notify({
        title: title,
        message: message,
        info: info,
        type: "info"
    });
}

/**
 * @private
 * Internal notification handlers for task status changes
 */
const notifiers = {
    dispatched: function() {
        notify({
            message: countlyVue.i18n("assistant.taskmanager.longTaskTooLong.title") + " " + countlyVue.i18n("assistant.taskmanager.longTaskTooLong.message"),
            info: countlyVue.i18n("assistant.taskmanager.longTaskTooLong.info"),
            type: "info"
        });
    },
    duplicate: function() {
        notify({
            message: countlyVue.i18n("assistant.taskmanager.longTaskAlreadyRunning.title") + " " + countlyVue.i18n("assistant.taskmanager.longTaskAlreadyRunning.message"),
            info: countlyVue.i18n("assistant.taskmanager.longTaskTooLong.info"),
            type: "info",
            goTo: {
                title: countlyVue.i18n("common.go-to-task-manager"),
                url: "#/manage/tasks"
            }
        });
    },
    completed: function(fetchedTasks) {
        if (!fetchedTasks || !fetchedTasks.length) {
            return;
        }
        notify({
            title: countlyVue.i18n("assistant.taskmanager.completed.title"),
            message: countlyVue.i18n("assistant.taskmanager.completed.message", fetchedTasks.length),
            sticky: true
        });
    },
    errored: function(fetchedTasks) {
        if (!fetchedTasks || !fetchedTasks.length) {
            return;
        }
        notify({
            title: countlyVue.i18n("assistant.taskmanager.errored.title"),
            message: countlyVue.i18n("assistant.taskmanager.errored.message", fetchedTasks.length),
            info: countlyVue.i18n("assistant.taskmanager.errored.info"),
            type: "error",
            sticky: true
        });
    }
};

/**
 * @private
 * Vuex module for task manager state management
 */
const taskManagerVuex = countlyVue.vuex.Module("countlyTaskManager", {
    state: function() {
        const persistent = store.get("countly_task_monitor") || {};
        const unreadPersistent = store.get("countly_task_monitor_unread") || {};
        return {
            monitored: persistent,
            unread: unreadPersistent,
            opId: 0
        };
    },
    getters: {
        unreadStats: function(state) {
            const unread = state.unread;

            return Object.keys(unread).reduce(function(acc, appId) {
                const appTasks = unread[appId];
                const taskIds = Object.keys(appTasks);
                const obj = {
                    _total: taskIds.length
                };

                taskIds.forEach(function(taskId) {
                    const origin = appTasks[taskId].type;
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
        reloadPersistent: function(state) {
            state.monitored = store.get("countly_task_monitor") || {};
            state.unread = store.get("countly_task_monitor_unread") || {};
        },
        registerTask: function(state, payload) {
            const monitored = state.monitored;
            const appId = payload.appId;
            const taskId = payload.taskId;

            if (!monitored[appId]) {
                monitored[appId] = [];
            }
            if (monitored[appId].indexOf(taskId) === -1) {
                monitored[appId].push(taskId);
                store.set("countly_task_monitor", state.monitored);
            }
        },
        unregisterTask: function(state, payload) {
            const monitored = state.monitored;
            const appId = payload.appId;
            const taskId = payload.taskId;

            const index = monitored[appId].indexOf(taskId);

            if (index !== -1) {
                monitored[appId].splice(index, 1);
                store.set("countly_task_monitor", state.monitored);
            }
        },
        setUnread: function(state, payload) {
            const unread = state.unread;
            const task = payload.task;
            const appId = task.app_id || payload.appId;

            if (!unread[appId]) {
                Vue.set(unread, appId, {});
            }
            Vue.set(unread[appId], task._id, {type: task.type});
            store.set("countly_task_monitor_unread", unread);
        },
        setRead: function(state, payload) {
            const unread = state.unread;
            const appId = payload.appId;
            const taskId = payload.taskId;

            if (unread[appId]) {
                Vue.delete(unread[appId], taskId);
                store.set("countly_task_monitor_unread", unread);
            }
        }
    },
    actions: {
        clearOrphanUnreads: function(context, payload) {
            payload = payload || {};
            return new Promise(function(resolve) {
                context.commit("reloadPersistent");

                const unread = context.state.unread;
                const appId = payload.appId || countlyCommon.ACTIVE_APP_ID;

                if (!unread[appId] || !Object.keys(unread[appId]).length) {
                    resolve();
                    return;
                }

                check(Object.keys(unread[appId]), function(checkedTasks) {
                    checkedTasks.result.forEach(function(checkedTask) {
                        const id = checkedTask._id;

                        if (checkedTask.result === "deleted") {
                            context.commit("setRead", {
                                appId: appId,
                                taskId: id
                            });
                        }
                    });
                    resolve();
                });
            });
        },
        tick: function(context, payload) {
            payload = payload || {};
            return new Promise(function(resolve) {

                context.commit("reloadPersistent");

                let monitored = context.state.monitored;
                const appId = payload.appId || countlyCommon.ACTIVE_APP_ID;

                if (!monitored[appId] || !monitored[appId].length) {
                    resolve();
                    return;
                }

                check(monitored[appId], function(checkedTasks) {
                    // get it from storage again, in case it has changed
                    context.commit("reloadPersistent");
                    monitored = context.state.monitored;
                    const completedQueue = [];
                    const erroredQueue = [];

                    checkedTasks.result.forEach(function(checkedTask) {
                        const id = checkedTask._id;

                        if (checkedTask.result === "deleted") {
                            context.commit("unregisterTask", {
                                appId: appId,
                                taskId: id
                            });
                        }
                        if (checkedTask.result === "completed" || checkedTask.result === "errored") {
                            context.commit("unregisterTask", {
                                appId: appId,
                                taskId: id
                            });

                            // notify task completed
                            if (checkedTask.type === "tableExport" && checkedTask.report_name) {
                                checkedTask.name = "<span style='overflow-wrap: break-word;'>" + checkedTask.report_name + "</span>";
                            }
                            else {
                                checkedTask.name = checkedTask.report_name;
                            }

                            if (checkedTask.manually_create === false) {
                                context.commit("reloadPersistent");
                                context.commit("setUnread", {
                                    task: checkedTask,
                                    appId: appId
                                });
                            }
                            if (checkedTask.view) {
                                if (checkedTask.result === "completed") {
                                    completedQueue.push(checkedTask);
                                }
                                else if (checkedTask.result === "errored") {
                                    erroredQueue.push(checkedTask);
                                }
                            }
                        }
                    });
                    notifiers.completed(completedQueue);
                    notifiers.errored(erroredQueue);
                    context.commit("incrementOpId");
                    resolve();
                });
            });
        },
        monitor: function(context, payload) {
            context.commit("reloadPersistent");
            const monitored = context.state.monitored;
            const appId = payload.appId || countlyCommon.ACTIVE_APP_ID;
            const taskId = payload.taskId;

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

const vuexStore = countlyVue.vuex.getGlobalStore();

/**
 * Starts monitoring a task for completion status
 * @param {string} id - The task ID to monitor
 * @param {boolean} [silent=false] - If true, suppresses notifications
 */
export function monitor(id, silent) {
    vuexStore.dispatch("countlyTaskManager/monitor", {
        taskId: id,
        silent: silent
    });
}

/**
 * Performs a periodic check of all monitored tasks and handles status updates.
 * Automatically reschedules itself based on DASHBOARD_REFRESH_MS interval.
 */
export function tick() {
    vuexStore.dispatch("countlyTaskManager/tick").then(function() {
        setTimeout(function() {
            tick();
        }, countlyCommon.DASHBOARD_REFRESH_MS);
    });
}

/**
 * Resets the task manager state, clearing all cached data and orphan unreads
 */
export function reset() {
    vuexStore.dispatch("countlyTaskManager/clearOrphanUnreads");
    _resultData = [];
    _resultObj = {};
    _data = {};
}

// Initialize on document ready
jQuery(document).ready(function() {
    vuexStore.dispatch("countlyTaskManager/clearOrphanUnreads");
    tick();
    let initial = true;
    // listen for UI app change
    window.app.addAppSwitchCallback(function() {
        if (initial) {
            initial = false;
        }
        else {
            reset();
            vuexStore.commit("countlyTaskManager/incrementOpId");
        }
    });
});