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
	
	countlyPlugins.toggle = function (plugin, state, callback) {
		$("#plugins-message pre").append("<p>"+jQuery.i18n.map["plugins.reloaded"]+"</p>");
		$.ajax({
			type:"GET",
			url:countlyCommon.API_URL + "/i/plugins",
			data:{
				plugin:plugin,
				state:state,
				api_key:countlyGlobal['member'].api_key
			},
			success:function (json) {
				$("#plugins-message pre").append("<p>"+json+"</p>");
				if(callback)
					callback();
			},
			error: function(jqXHR, textStatus, errorThrown){
				var ret = "";
				ret += textStatus+"\n";
				if(errorThrown)
					ret += errorThrown+"\n";
				$("#plugins-message pre").append("<p>"+ret+"</p>");
				if(callback)
					callback();
			}
		});
    };
	
	countlyPlugins.getData = function () {
		return _pluginsData;
    };
	
}(window.countlyPlugins = window.countlyPlugins || {}, jQuery));