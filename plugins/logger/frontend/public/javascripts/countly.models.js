(function (countlyLogger, $, undefined) {

    //Private Properties
    var _data = {};
    var _collection_info = {};
    //Public Methods
    countlyLogger.initialize = function (filter) {
        var query = {};
        if(filter){
            query["t."+filter] = {$exists:true};
        }
		return $.ajax({
            type:"GET",
            url:countlyCommon.API_PARTS.data.r,
            data:{
                "api_key":countlyGlobal.member.api_key,
                "app_id":countlyCommon.ACTIVE_APP_ID,
                "method":"logs",
                "filter":JSON.stringify(query)
            },
            success:function (json) {
                _data = json;
            }
        });
    };

    countlyLogger.collection_info = function () {
		return $.ajax({
            type:"GET",
            url:countlyCommon.API_PARTS.data.r,
            data:{
                "api_key":countlyGlobal.member.api_key,
                "app_id":countlyCommon.ACTIVE_APP_ID,
                "method":"collection_info"
            },
            success:function (json) {
                _collection_info = json;
            }
        });
    };


	
	countlyLogger.getData = function () {
		return _data;
    };

    countlyLogger.getCollectionInfo = function () {
		return _collection_info;
    };
	
}(window.countlyLogger = window.countlyLogger || {}, jQuery));