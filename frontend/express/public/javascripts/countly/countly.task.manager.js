(function (countlyTaskManager, $, undefined) {

    //Private Properties
    var _resultData = [],
        _resultObj = {},
        _data = {},
        curTask = 0;

    //Public Methods
    countlyTaskManager.initialize = function (isRefresh) {
        return $.ajax({
            type:"GET",
            url:countlyCommon.API_PARTS.data.r+"/tasks/all",
            data:{
                "api_key":countlyGlobal.member.api_key,
                "app_id":countlyCommon.ACTIVE_APP_ID,
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
    
    countlyTaskManager.monitor = function (id, callback) {
		var monitor = store.get("countly_task_monitor") || {};
        if(!monitor[countlyCommon.ACTIVE_APP_ID])
            monitor[countlyCommon.ACTIVE_APP_ID] = [];
        monitor[countlyCommon.ACTIVE_APP_ID].push(id);
        store.set("countly_task_monitor", monitor);
        CountlyHelpers.notify({
            title: "This request is running for too long",
            message: "We have switched to long running task and will notify you when it is finished",
            info: "Or check its status under Management -> Task Manager"
        });
    };
    
    countlyTaskManager.tick = function(){
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
                                CountlyHelpers.notify({
                                    title: "One of long running tasks completed",
                                    message: "Click here to view the result",
                                    info: "Or check it under Management -> Task Manager",
                                    sticky: true,
                                    onClick: function(){
                                        app.navigate(res.view+id, true);
                                    }
                                });
                            }
                        });
                    }
                    else if(res && res.result === "errored"){
                        CountlyHelpers.notify({
                            title: "Could not complete the task",
                            message: "you can try rerunning it",
                            info: "Under Management -> Task Manager",
                            type: "error",
                            sticky: true,
                            onClick: function(){
                                app.navigate(res.view+id, true);
                            }
                        });
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
        //listen for UI app change
        app.addAppSwitchCallback(function(appId){
            countlyTaskManager.reset();
        });
    });
	
}(window.countlyTaskManager = window.countlyTaskManager || {}, jQuery));