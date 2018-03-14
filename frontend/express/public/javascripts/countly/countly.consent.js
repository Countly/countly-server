(function (countlyConsentManager, $, undefined) {

    //Private Properties
    var _resultData = [],
        _resultObj = {},
        _data = {};
    
    countlyConsentManager.initialize = function () {
        
    };
    
    countlyConsentManager.common = function (data, path, callback) {
        data.app_id = countlyCommon.ACTIVE_APP_ID;
        data.api_key = countlyGlobal['member'].api_key;
		$.ajax({
			type:"GET",
            url:countlyCommon.API_PARTS.data.r + '/consent/'+path,
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
	
}(window.countlyConsentManager = window.countlyConsentManager || {}, jQuery));