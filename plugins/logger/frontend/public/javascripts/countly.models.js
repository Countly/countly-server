(function (countlyLogger, $, undefined) {

    //Private Properties
    var _data = {};

    //Public Methods
    countlyLogger.initialize = function (id) {
		return $.ajax({
            type:"GET",
            url:countlyCommon.API_PARTS.data.r,
            data:{
                "api_key":countlyGlobal.member.api_key,
                "app_id":countlyCommon.ACTIVE_APP_ID,
                "method":"logs"
            },
            success:function (json) {
                _data = json;
            }
        });
    };
	
	countlyLogger.getData = function () {
		return _data;
    };
	
}(window.countlyLogger = window.countlyLogger || {}, jQuery));