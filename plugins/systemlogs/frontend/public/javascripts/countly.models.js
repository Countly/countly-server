(function (countlySystemLogs, $, undefined) {

    //Private Properties
    var _data = {};

    //Public Methods
    countlySystemLogs.initialize = function (id) {
		return $.ajax({
            type:"GET",
            url:countlyCommon.API_PARTS.data.r,
            data:{
                "api_key":countlyGlobal.member.api_key,
                "app_id":countlyCommon.ACTIVE_APP_ID,
                "method":"systemlogs"
            },
            success:function (json) {
                _data = json;
            }
        });
    };
	
	countlySystemLogs.getData = function () {
		return _data;
    };
	
}(window.countlySystemLogs = window.countlySystemLogs || {}, jQuery));