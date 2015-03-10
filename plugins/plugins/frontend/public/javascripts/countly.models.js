(function (countlyPlugins, $, undefined) {

    //Private Properties
    var _pluginsData = {};

    //Public Methods
    countlyPlugins.initialize = function (id) {
		return $.ajax({
			type:"GET",
			url:countlyCommon.API_URL + "/o/plugins",
			data:{
                api_key:countlyGlobal['member'].api_key
            },
			success:function (json) {
				_pluginsData = json;
			}
		});
    };
	
	countlyPlugins.toggle = function (plugins, callback) {
		$.ajax({
			type:"GET",
			url:countlyCommon.API_URL + "/i/plugins",
			data:{
				plugin:JSON.stringify(plugins),
				api_key:countlyGlobal['member'].api_key
			},
			success:function (json) {
				if(callback)
					callback(json);
			},
			error: function(xhr, textStatus, errorThrown){
				var ret = textStatus+" ";
				ret += xhr.status+": "+$(xhr.responseText).text();
				if(errorThrown)
					ret += errorThrown+"\n";
				if(callback)
					callback(ret);
			}
		});
    };
	
	countlyPlugins.getData = function () {
		return _pluginsData;
    };
	
}(window.countlyPlugins = window.countlyPlugins || {}, jQuery));