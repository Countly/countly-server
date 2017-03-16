(function (countlyTaskManager, $, undefined) {

    //Private Properties
    var _resultData = [];

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
            }
        });
    };
    
    countlyTaskManager.getResult = function (id, callback) {
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
                if(callback)
                    callback(json);
			},
			error:function(){
                if(callback)
                    callback(false);
			}
        });
    };
    
    countlyTaskManager.common = function (id, path, callback) {
		$.ajax({
			type:"GET",
            url:countlyCommon.API_PARTS.data.w + '/tasks/'+path,
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
    
    countlyTaskManager.del = function (id, callback) {
        countlyTaskManager.common(id, "delete", callback);
    };
    
    countlyTaskManager.update = function (id, callback) {
        countlyTaskManager.common(id, "update", callback);
    };

    countlyTaskManager.reset = function () {
		_resultData = [];
    };
    
    countlyTaskManager.getResults = function () {
		return _resultData;
    };
	
}(window.countlyTaskManager = window.countlyTaskManager || {}, jQuery));