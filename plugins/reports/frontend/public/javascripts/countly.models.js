(function (countlyReporting, $, undefined) {

    //Private Properties
    var _data = {};

    //Public Methods
    countlyReporting.initialize = function (id) {
		return $.ajax({
			type:"GET",
			url:countlyCommon.API_PARTS.data.r+"/reports/all",
			data:{
				"api_key":countlyGlobal.member.api_key
			},
			success:function (json) {
				_data = json;
			}
		});
    };
    
    countlyReporting.getData = function(){
        return _data;
    }
	
	countlyReporting.create = function (args) {
		return $.ajax({
            type:"GET",
            url:countlyCommon.API_PARTS.data.w+"/reports/create",
            data:{
				"api_key":countlyGlobal.member.api_key,
				args:JSON.stringify(args)
            }
        });
    };
	
	countlyReporting.update = function (args) {
		return $.ajax({
            type:"GET",
            url:countlyCommon.API_PARTS.data.w+"/reports/update",
            data:{
				"api_key":countlyGlobal.member.api_key,
				args:JSON.stringify(args)
            }
        });
    };
	
	countlyReporting.del = function (id) {
		return $.ajax({
            type:"GET",
            url:countlyCommon.API_PARTS.data.w+"/reports/delete",
            data:{
				"api_key":countlyGlobal.member.api_key,
				args:JSON.stringify({
                    "_id":id
                })
            }
        });
    };
    
    countlyReporting.send = function (id) {
		return $.ajax({
            type:"GET",
            url:countlyCommon.API_PARTS.data.w+"/reports/send",
            data:{
				"api_key":countlyGlobal.member.api_key,
				args:JSON.stringify({
                    "_id":id
                })
            }
        });
    };
	
}(window.countlyReporting = window.countlyReporting || {}, jQuery));