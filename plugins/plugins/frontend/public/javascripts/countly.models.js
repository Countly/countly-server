(function (countlyPlugins, $, undefined) {

    //Private Properties
    var _pluginsData = {};
    var _configsData = {};
    var _userConfigsData = {};
    var _themeList = [];

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
    
    countlyPlugins.initializeConfigs = function (id) {
		return $.when(
            $.ajax({
                type:"GET",
                url:countlyCommon.API_URL + "/o/themes",
                data:{
                    api_key:countlyGlobal['member'].api_key
                },
                success:function (json) {
                    _themeList = json;
                }
            }),
            $.ajax({
                type:"GET",
                url:countlyCommon.API_URL + "/o/configs",
                data:{
                    api_key:countlyGlobal['member'].api_key
                },
                success:function (json) {
                    _configsData = json;
                }
            })
        ).then(function(){
            return true;
        });
    };
    
    countlyPlugins.updateConfigs = function (configs, callback) {
		$.ajax({
			type:"GET",
			url:countlyCommon.API_URL + "/i/configs",
			data:{
                configs:JSON.stringify(configs),
                api_key:countlyGlobal['member'].api_key
            },
			success:function (json) {
				_configsData = json;
                if(callback)
                    callback(null, json);
			},
			error:function (json) {
                if(callback)
                    callback(true, json);
			}
		});
    };
    
    countlyPlugins.initializeUserConfigs = function (id) {
		return $.when(
            $.ajax({
                type:"GET",
                url:countlyCommon.API_URL + "/o/themes",
                data:{
                    api_key:countlyGlobal['member'].api_key
                },
                success:function (json) {
                    _themeList = json;
                }
            }),
            $.ajax({
                type:"GET",
                url:countlyCommon.API_URL + "/o/userconfigs",
                data:{
                    api_key:countlyGlobal['member'].api_key
                },
                success:function (json) {
                    _userConfigsData = json;
                }
            })
        ).then(function(){
            return true;
        });
    };
    
    countlyPlugins.updateUserConfigs = function (configs, callback) {
		$.ajax({
			type:"GET",
			url:countlyCommon.API_URL + "/i/userconfigs",
			data:{
                configs:JSON.stringify(configs),
                api_key:countlyGlobal['member'].api_key
            },
			success:function (json) {
				_userConfigsData = json;
                if(callback)
                    callback(null, json);
			},
			error:function (json) {
                if(callback)
                    callback(true, json);
			}
		});
    };
	
	countlyPlugins.getData = function () {
		return _pluginsData;
    };
    
    countlyPlugins.getConfigsData = function () {
		return _configsData;
    };
    
    countlyPlugins.getUserConfigsData = function () {
		return _userConfigsData;
    };
    
    countlyPlugins.getThemeList = function () {
		return _themeList;
    };
	
}(window.countlyPlugins = window.countlyPlugins || {}, jQuery));