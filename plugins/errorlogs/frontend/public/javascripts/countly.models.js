(function (countlyErrorLogs, $, undefined) {

    //Private Properties
    var _data = {};

    //Public Methods
    countlyErrorLogs.initialize = function (id) {
		return $.ajax({
            type:"GET",
            url:countlyCommon.API_PARTS.data.r+"/errorlogs",
            data:{
                "api_key":countlyGlobal.member.api_key,
                "app_id":countlyCommon.ACTIVE_APP_ID
            },
            success:function (json) {
                _data = json;
            }
        });
    };
	
	countlyErrorLogs.getData = function () {
		return _data;
    };
    
    countlyErrorLogs.del = function (id) {
		return $.ajax({
            type:"GET",
            url:countlyCommon.API_PARTS.data.w+"/errorlogs",
            data:{
				"api_key":countlyGlobal.member.api_key,
                app_id: countlyCommon.ACTIVE_APP_ID,
                log:id
            }
        });
    };
	
}(window.countlyErrorLogs = window.countlyErrorLogs || {}, jQuery));