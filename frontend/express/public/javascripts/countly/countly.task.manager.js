(function (countlyTaskManager, $, undefined) {

    //Private Properties
    var _resultData = [],
        _resultObj = {},
        _data = {},
        curTask = 0;

    //Public Methods
    countlyTaskManager.initialize = function (isRefresh, query) {
        return $.ajax({
            type:"GET",
            url:countlyCommon.API_PARTS.data.r+"/tasks/all",
            data:{
                "api_key":countlyGlobal.member.api_key,
                "app_id":countlyCommon.ACTIVE_APP_ID,
                "query": JSON.stringify(query || {}),
                "display_loader": !isRefresh
            },
            dataType:"json",
            success:function (json) {
                _resultData = json;
                for(var i = 0; i < json.length; i++){
                    if(json[i].meta)
                        json[i].meta = countlyCommon.decodeHtml(json[i].meta);
                    if(json[i].request)
                        json[i].request = JSON.parse(countlyCommon.decodeHtml(json[i].request));
                    _resultObj[json[i]._id] = json[i];
                }
            }
        });
    };
    
    countlyTaskManager.fetchResult = function (id, callback) {
        return $.ajax({
            type:"GET",
            url:countlyCommon.API_PARTS.data.r+"/tasks/task",
            data:{
                "api_key":countlyGlobal.member.api_key,
                "app_id":countlyCommon.ACTIVE_APP_ID,
                "task_id":id,
                "display_loader": false
            },
            dataType:"json",
            success:function (json) {
                if(json.data)
                    json.data = JSON.parse(countlyCommon.decodeHtml(json.data));
                if(json.meta)
                    json.meta = countlyCommon.decodeHtml(json.meta);
                if(json.request)
                    json.request = JSON.parse(countlyCommon.decodeHtml(json.request));
                _data[id] = json;
                if(callback)
                    callback(json);
			},
			error:function(){
                if(callback)
                    callback(false);
			}
        });
    };
    
    countlyTaskManager.getResult = function (id) {
        return _data[id];
    };
    
    countlyTaskManager.getTask = function (id) {
        return _resultObj[id];
    };
    
    countlyTaskManager.common = function (id, path, callback) {
        var data = {}
        if(typeof id === "string"){
            data.task_id = id;
        }
        else{
            data = id || {};
        }
        data.app_id = countlyCommon.ACTIVE_APP_ID;
        data.api_key = countlyGlobal['member'].api_key;
		$.ajax({
			type:"GET",
            url:countlyCommon.API_PARTS.data.w + '/tasks/'+path,
            data:data,
            dataType:"json",
			success:function (json) {
                if(callback)
                    callback(json);
			},
			error:function(){
                if(callback)
                    callback(false);
			}
		});
    };
    
    countlyTaskManager.del = function (id, callback) {
        countlyTaskManager.common(id, "delete", callback);
    };
    
    countlyTaskManager.update = function (id, callback) {
        countlyTaskManager.common(id, "update", callback);
    };
    
    countlyTaskManager.name = function (id, name, callback) {
        countlyTaskManager.common({id:id, name:name}, "name", callback);
    };

    countlyTaskManager.check = function (id, callback) {
        $.ajax({
			type:"GET",
            url:countlyCommon.API_PARTS.data.r + '/tasks/check',
            data:{
                task_id:id,
                app_id: countlyCommon.ACTIVE_APP_ID,
                api_key:countlyGlobal['member'].api_key
            },
            dataType:"json",
			success:function (json) {
                if(callback)
                    callback(json);
			},
			error:function(){
                if(callback)
                    callback(false);
			}
		});
    };

    countlyTaskManager.reset = function () {
		_resultData = [];
        _resultObj = {};
        _data = {};
        curTask = 0;
    };
    
    countlyTaskManager.getResults = function () {
		return _resultData;
    };
    
    countlyTaskManager.makeTaskNotification = function (title, message, info, data, notifSubType, i18nId, notificationVersion) {
        var contentData = data;
        var ownerName = "ReportManager";
        var notifType = 4;//informational notification, check assistant.js for additional types

        countlyAssistant.createNotification(contentData, ownerName, notifType, notifSubType, i18nId, countlyCommon.ACTIVE_APP_ID, notificationVersion, countlyGlobal.member.api_key, function (res, msg) {
            if(!res) {
                CountlyHelpers.notify({
                    title: title,
                    message: message,
                    info: info
                });
            }
        })
    };
    
    countlyTaskManager.monitor = function (id, silent) {
		var monitor = store.get("countly_task_monitor") || {};
        if(!monitor[countlyCommon.ACTIVE_APP_ID])
            monitor[countlyCommon.ACTIVE_APP_ID] = [];
        if(monitor[countlyCommon.ACTIVE_APP_ID].indexOf(id) === -1){
            monitor[countlyCommon.ACTIVE_APP_ID].push(id);
            store.set("countly_task_monitor", monitor);
            if(!silent)
                CountlyHelpers.notify({
                    title: jQuery.i18n.map["assistant.taskmanager.longTaskTooLong.title"],
                    message: jQuery.i18n.map["assistant.taskmanager.longTaskTooLong.message"],
                    info: jQuery.i18n.map["assistant.taskmanager.longTaskTooLong.info"]
                });
        }
        else{
            if(!silent)
                CountlyHelpers.notify({
                    title: jQuery.i18n.map["assistant.taskmanager.longTaskAlreadyRunning.title"],
                    message: jQuery.i18n.map["assistant.taskmanager.longTaskAlreadyRunning.message"],
                    info: jQuery.i18n.map["assistant.taskmanager.longTaskTooLong.info"]
                });
        }
    };
    
    countlyTaskManager.tick = function(){
        var assistantAvailable = true;
        if(typeof countlyAssistant === "undefined") {
            assistantAvailable = false;
        }
        var monitor = store.get("countly_task_monitor") || {};
        if(monitor[countlyCommon.ACTIVE_APP_ID] && monitor[countlyCommon.ACTIVE_APP_ID][curTask]){
            var id = monitor[countlyCommon.ACTIVE_APP_ID][curTask];
            countlyTaskManager.check(id, function(res){
                if(res === false || res.result === "completed" || res.result === "errored"){
                    //get it from storage again, in case it has changed
                    monitor = store.get("countly_task_monitor") || {};
                    //get index of task, cause it might have been changed
                    var index = monitor[countlyCommon.ACTIVE_APP_ID].indexOf(id);
                    //remove item
                    if(index !== -1){
                        monitor[countlyCommon.ACTIVE_APP_ID].splice(index, 1);
                        store.set("countly_task_monitor", monitor);
                    }
                    
                    //notify task completed
                    if(res && res.result === "completed"){
                        countlyTaskManager.fetchResult(id, function(res){
                            if(res && res.view){
                                if(!assistantAvailable) {
                                    CountlyHelpers.notify({
                                        title: jQuery.i18n.map["assistant.taskmanager.completed.title"],
                                        message: jQuery.i18n.map["assistant.taskmanager.completed.message"],
                                        info: jQuery.i18n.map["assistant.taskmanager.longTaskTooLong.info"],
                                        sticky: true,
                                        onClick: function(){
                                            app.navigate(res.view+id, true);
                                        }
                                    });
                                }
                                else{
                                    countlyTaskManager.makeTaskNotification(jQuery.i18n.map["assistant.taskmanager.completed.title"], jQuery.i18n.map["assistant.taskmanager.completed.message"], jQuery.i18n.map["assistant.taskmanager.longTaskTooLong.info"], [res.view+id, res.name || ""], 3, "assistant.taskmanager.completed", 1);
                                }
                            }
                        });
                    }
                    else if(res && res.result === "errored"){
                        if(!assistantAvailable) {
                            CountlyHelpers.notify({
                                title: jQuery.i18n.map["assistant.taskmanager.errored.title"],
                                message: jQuery.i18n.map["assistant.taskmanager.errored.message"],
                                info: jQuery.i18n.map["assistant.taskmanager.errored.info"],
                                type: "error",
                                sticky: true,
                                onClick: function(){
                                    app.navigate("#/manage/tasks", true);
                                }
                            });
                        }
                        else{
                            countlyTaskManager.fetchResult(id, function(res){
                                countlyTaskManager.makeTaskNotification(jQuery.i18n.map["assistant.taskmanager.errored.title"], jQuery.i18n.map["assistant.taskmanager.errored.message"], jQuery.i18n.map["assistant.taskmanager.errored.info"], [res.name || ""], 4, "assistant.taskmanager.errored", 1);
                            });
                        }
                    }
                }
                else{
                    curTask++;
                }
                if(curTask >= monitor[countlyCommon.ACTIVE_APP_ID].length)
                    curTask = 0;
                setTimeout(function(){
                    countlyTaskManager.tick();
                }, countlyCommon.DASHBOARD_REFRESH_MS);
            })
        }
        else{
            setTimeout(function(){
                countlyTaskManager.tick();
            }, countlyCommon.DASHBOARD_REFRESH_MS);
        }
    };
    
    $( document ).ready(function() {
        countlyTaskManager.tick();
        var initial = true;
        //listen for UI app change
        app.addAppSwitchCallback(function(appId){
            if(initial)
                initial = false;
            else
                countlyTaskManager.reset();
        });
    });
	
}(window.countlyTaskManager = window.countlyTaskManager || {}, jQuery));