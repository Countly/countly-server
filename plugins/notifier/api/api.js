var plugin = {},
	common = require('../../../api/utils/common.js'),
	plugins = require('../../pluginManager'),
	fetch = require('../../../api/parts/data/fetch.js'),
	countlyCommon = require('../../../api/lib/countly.common.js'),
	moment = require('moment');

(function (plugin) {

	function getDailySessionCount(appId) {
		var paramCopy = {};
        paramCopy.app_id = appId;
        paramCopy.qstring = {};
        paramCopy.qstring.period = "day";
        paramCopy.qstring.method='users';
        countlyCommon.setPeriod(paramCopy.qstring.period);
        fetch.getTimeObj('users', paramCopy, function (fetchResultUsers) {
        	if ( fetchResultUsers[String(moment().year())][String(moment().month() + 1)][String(moment().date())]["t"] == 100)
    			console.log("[NOTIFIER] Total session count reached 100 for today"); 	
        });	
	}

	//listens sessions and notify if daily sessions count reaches 100
    plugins.register("/i", function(ob) {
    	var validate = ob.validateUserForDataReadAPI;
		var countlyDb = common.db;
    	var params = ob.params;
		var app_id = params.qstring.app_id;
		if (params.qstring.begin_session) {
			//Checks if there is no app_id in params
			if ( !app_id ) {
				countlyDb.collection("apps").findOne({ key: params.qstring.app_key}, function(err, app) {
					getDailySessionCount(app._id)
					
				});
			} else {
				getDailySessionCount(app_id);
			}
		}
    });

    //Users who didn't have a session for more than 7 days
	plugins.register('/i/daily/non_returning', function(ob) {
		var params = ob.params;
		var validate = ob.validateUserForDataReadAPI;
		var countlyDb = common.db;
		var app_id = params.qstring.app_id;
		var now = new moment();
      	now.utc().hours(0).minutes(0).seconds(0).unix();
      	var dayOfYear = now.dayOfYear();
		var time = now.dayOfYear(dayOfYear - 7).utc().unix();
		condition = {
          ls:{$lt: time},
        };
		countlyDb.collection('app_users' + app_id)
        .find(condition)
        .count( function (err, count) {
        	if(err){
			  common.returnMessage(params, err);
            }
            console.log("[NOTIFIER] " + count + " users didn't have a session for more than 7 days");
			common.returnOutput(params, count);
        }); 

		return true;
	});
	
}(plugin));

module.exports = plugin;