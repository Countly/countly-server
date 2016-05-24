(function (countlyAllApps, $, undefined) {

    //Private Properties
    var _appData = {"all":{_id:"all", name:"All apps"}},
		_sessions = {},
        _type = "mobile",
        _tempApp;

    //Public Methods
    countlyAllApps.initialize = function () {
        this.reset();
        _type = countlyGlobal["apps"][countlyCommon.ACTIVE_APP_ID].type;
        _period = countlyCommon.getPeriodForAjax();
        return $.ajax({
            type:"GET",
            url:countlyCommon.API_PARTS.data.r,
            data:{
                "api_key":countlyGlobal.member.api_key,
                "app_id":countlyCommon.ACTIVE_APP_ID,
                "method":"all_apps",
                "filter": JSON.stringify({type:_type}),
                "period":_period
            },
            dataType:"jsonp",
            success:function (json) {
                _appData["all"].sessions = {total:0, trend:0};
				_appData["all"].users = {total:0, trend:0};
				_appData["all"].newusers = {total:0, trend:0};
				_appData["all"].duration = {total:0, trend:0};
				_appData["all"].avgduration = {total:0, trend:0};
				_sessions["all"] = {};
				for(var i = 0; i <  json.length; i++){
                    var appID = json[i]._id;
                    _appData[appID] = json[i];
                    _appData[appID].duration.total = 0;
                    _appData[appID].avgduration.total = 0;
                    _sessions[appID] = {};
                    for(var metric in json[i].charts){
                        var key = "#draw-"+metric;
                        _sessions[appID][key] = {
                            data: json[i].charts[metric]
                        }
                        for(var j = 0, l = json[i].charts[metric].length; j < l; j++){
                            
                            if(!_sessions["all"][key]){
                                _sessions["all"][key] = {};
                                _sessions["all"][key].data = [];
                            }
                            if(!_sessions["all"][key].data[j]){
                                _sessions["all"][key].data[j] = [0,0];
                            }
                            _sessions["all"][key].data[j][0] = _sessions[appID][key].data[j][0];
                            _sessions["all"][key].data[j][1] += parseFloat(_sessions[appID][key].data[j][1]);
                            if(key == "#draw-total-time-spent"){
                                _appData["all"].duration.total += parseFloat(_sessions[appID][key].data[j][1]);
                                _appData[appID].duration.total += parseFloat(_sessions[appID][key].data[j][1]);
                            }
                        }
                    }
                    _appData["all"].sessions.total += _appData[appID].sessions.total;
                    _appData["all"].users.total += _appData[appID].users.total;
                    _appData["all"].newusers.total += _appData[appID].newusers.total;
                    _appData["all"].sessions.trend += fromShortNumber(_appData[appID].sessions.change);
                    _appData["all"].users.trend += fromShortNumber(_appData[appID].users.change);
                    _appData["all"].newusers.trend += fromShortNumber(_appData[appID].newusers.change);
                    _appData["all"].duration.trend += fromShortNumber(_appData[appID].duration.change);
                    _appData["all"].avgduration.trend += fromShortNumber(_appData[appID].avgduration.change);
                    _appData[appID].avgduration.total = (_appData[appID].sessions.total == 0 ) ? 0 : _appData[appID].duration.total/_appData[appID].sessions.total;
				}
				for(var i in _appData["all"]){
					if(_appData["all"][i].trend < 0)
						_appData["all"][i].trend = "d";
					else
						_appData["all"][i].trend = "u";
				}
				_appData["all"].avgduration.total = (_appData["all"].sessions.total == 0 ) ? 0 : _appData["all"].duration.total/_appData["all"].sessions.total;
            }
        });
    };

    countlyAllApps.reset = function () {
		_appData = {"all":{_id:"all", name:"All apps"}};
		_sessions = {};
        _type = "mobile";
    };
	
	countlyAllApps.getData = function () {
		var data = [];
		for(var i in _appData){
			data.push(_appData[i]);
		}
        return data;
    };
	
	countlyAllApps.getSessionData = function () {
        return _sessions;
    };
	
	var fromShortNumber = function(str){
		if(str == "NA" || str == "∞"){
			return 0;
		}
		else{
			str = str.slice(0, -1);
			var rate = 1;
			if(str.slice(-1) == "K"){
				str = str.slice(0, -1);
				rate = 1000;
			}
			else if(str.slice(-1) == "M"){
				str = str.slice(0, -1);
				rate = 1000000;
			}
			return parseFloat(str)*rate;
		}
	};
}(window.countlyAllApps = window.countlyAllApps || {}, jQuery));