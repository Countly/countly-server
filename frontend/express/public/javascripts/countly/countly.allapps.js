(function (countlyAllApps, $, undefined) {

    //Private Properties
    var _appData = {"all":{_id:"all", name:"All apps"}},
		_appIds = {},
		_sessions = {},
		_sessionData = {};
	var _tempApp;

    //Public Methods
    countlyAllApps.initialize = function () {
        return countlyAllApps.refresh();
    };

    countlyAllApps.refresh = function () {
        if (!countlyCommon.DEBUG) {
			this.reset();
			var deffereds = [];
			_tempApp = countlyCommon.ACTIVE_APP_ID;
			for(var i in countlyGlobal["apps"]){
				deffereds.push(loadApp(i));
			}
			return $.when.apply($, deffereds).then(function(){
				countlyCommon.setActiveApp(_tempApp);
				_appData["all"].sessions = {total:0, trend:0};
				_appData["all"].users = {total:0, trend:0};
				_appData["all"].newusers = {total:0, trend:0};
				_appData["all"].duration = {total:0, trend:0};
				_appData["all"].avgduration = {total:0, trend:0};
				_sessions["all"] = {};
				for(var appID in countlyGlobal["apps"]){
					var sessionData = _sessionData[appID];
					for(var i in _sessions[appID]){
						for(var j = 0, l = _sessions[appID][i].data.length; j < l; j++){
							if(!_sessions["all"][i]){
								_sessions["all"][i] = {};
								_sessions["all"][i].label = _sessions[appID][i].label;
								_sessions["all"][i].data = [];
							}
							if(!_sessions["all"][i].data[j]){
								_sessions["all"][i].data[j] = [0,0];
							}
							_sessions["all"][i].data[j][0] = _sessions[appID][i].data[j][0];
							_sessions["all"][i].data[j][1] += parseFloat(_sessions[appID][i].data[j][1]);
							if(i == "#draw-total-time-spent")
								_appData["all"].duration.total += parseFloat(_sessions[appID][i].data[j][1]);
						}
					}
					_appData["all"].sessions.total += sessionData.usage['total-sessions'].total;
					_appData["all"].users.total += sessionData.usage['total-users'].total;
					_appData["all"].newusers.total += sessionData.usage['new-users'].total;
					_appData["all"].sessions.trend += fromShortNumber(sessionData.usage['total-sessions'].change);
					_appData["all"].users.trend += fromShortNumber(sessionData.usage['total-users'].change);
					_appData["all"].newusers.trend += fromShortNumber(sessionData.usage['new-users'].change);
					_appData["all"].duration.trend += fromShortNumber(sessionData.usage['total-duration'].change);
					_appData["all"].avgduration.trend += fromShortNumber(sessionData.usage['avg-duration-per-session'].change);
				}
				for(var i in _appData["all"]){
					if(_appData["all"][i].trend < 0)
						_appData["all"][i].trend = "d";
					else
						_appData["all"][i].trend = "u";
				}
				_appData["all"].avgduration.total = (_appData["all"].sessions.total == 0 ) ? 0 : _appData["all"].duration.total/_appData["all"].sessions.total;
				//transform total duration
				var timeSpentString = (_appData["all"].duration.total.toFixed(1)) + " " + jQuery.i18n.map["common.minute.abrv"];
				if (_appData["all"].duration.total >= 142560) {
					timeSpentString = (_appData["all"].duration.total / 525600).toFixed(1) + " " + jQuery.i18n.map["common.year.abrv"];
				} else if (_appData["all"].duration.total >= 1440) {
					timeSpentString = (_appData["all"].duration.total / 1440).toFixed(1) + " " + jQuery.i18n.map["common.day.abrv"];
				} else if (_appData["all"].duration.total >= 60) {
					timeSpentString = (_appData["all"].duration.total / 60).toFixed(1) + " " + jQuery.i18n.map["common.hour.abrv"];
				}
				_appData["all"].duration.total = timeSpentString;
				
				//transform avg duration
				var timeSpentString = (_appData["all"].avgduration.total.toFixed(1)) + " " + jQuery.i18n.map["common.minute.abrv"];
				if (_appData["all"].avgduration.total >= 142560) {
					timeSpentString = (_appData["all"].avgduration.total / 525600).toFixed(1) + " " + jQuery.i18n.map["common.year.abrv"];
				} else if (_appData["all"].avgduration.total >= 1440) {
					timeSpentString = (_appData["all"].avgduration.total / 1440).toFixed(1) + " " + jQuery.i18n.map["common.day.abrv"];
				} else if (_appData["all"].avgduration.total >= 60) {
					timeSpentString = (_appData["all"].avgduration.total / 60).toFixed(1) + " " + jQuery.i18n.map["common.hour.abrv"];
				}
				_appData["all"].avgduration.total = timeSpentString;
			});
        } else {
            return true;
        }
    };

    countlyAllApps.reset = function () {
		_appIds = {};
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
	
	countlyAllApps.setApp = function (app) {
        _tempApp = app;
		countlyCommon.setActiveApp(_tempApp);
    };
	
	var loadApp = function(appID){
		countlyCommon.setActiveApp(appID);
		return $.when(countlyUser.initialize()).done(function () {
			var sessionData = countlySession.getSessionData();
			if(!_appIds[appID]){
				_sessionData[appID] = sessionData;
				_sessions[appID] = {
					"#draw-total-users": countlySession.getUserDPActive().chartDP[1],
					"#draw-new-users": countlySession.getUserDPNew().chartDP[1],
					"#draw-total-sessions": countlySession.getSessionDPTotal().chartDP[1],
					"#draw-time-spent": countlySession.getDurationDPAvg().chartDP[1],
					"#draw-total-time-spent": countlySession.getDurationDP().chartDP[1],
					"#draw-avg-events-served": countlySession.getEventsDPAvg().chartDP[1]
				};
				_appData[appID] = {_id:appID, name:countlyGlobal["apps"][appID].name, sessions:sessionData.usage['total-sessions'], users:sessionData.usage['total-users'], newusers:sessionData.usage['new-users'], duration:sessionData.usage['total-duration'], avgduration:sessionData.usage['avg-duration-per-session']};
				_appIds[appID] = true;
			}
		});
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