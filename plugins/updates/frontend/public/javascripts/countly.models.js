(function (countlyUpdates, $, undefined) {

    //Private Properties
    var _data = [];

    //Public Methods
    countlyUpdates.initialize = function (id) {
		return $.ajax({
            type:"GET",
            url:countlyCommon.API_PARTS.data.r+"/updates",
            data:{
                "api_key":countlyGlobal.member.api_key,
                "app_id":countlyCommon.ACTIVE_APP_ID
            },
            success:function (json) {
                _data = json;
            }
        });
    };
	
	countlyUpdates.getData = function () {
		return _data;
    };
    
    countlyUpdates.update = function (type, id) {
        return $.ajax({
            type:"GET",
            url:countlyCommon.API_PARTS.data.w+"/updates",
            data:{
                "api_key":countlyGlobal.member.api_key,
                type: type,
                id: id
            }
        });
    };
    
    countlyUpdates.check = function (key) {
		return $.ajax({
            type:"GET",
            url:countlyCommon.API_PARTS.data.r+"/updates/check",
            data:{
				"api_key":countlyGlobal.member.api_key,
                key: key
            }
        });
    };
	
}(window.countlyUpdates = window.countlyUpdates || {}, jQuery));