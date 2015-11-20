var appsApi = {},
    common = require('./../../utils/common.js'),
    moment = require('moment'),
    crypto = require('crypto'),
	plugins = require('../../../plugins/pluginManager.js'),
    fs = require('fs');

(function (appsApi) {

    appsApi.getAllApps = function (params) {
        if (!(params.member.global_admin)) {
            common.returnMessage(params, 401, 'User is not a global administrator');
            return false;
        }

        common.db.collection('apps').find({}).toArray(function (err, apps) {

            if (!apps || err) {
                common.returnOutput(params, {admin_of: {}, user_of: {}});
                return false;
            }

            var appsObj = packApps(apps);
            common.returnOutput(params, {admin_of: appsObj, user_of: appsObj});
            return true;
        });

        return true;
    };

    appsApi.getCurrentUserApps = function (params) {
        if (params.member.global_admin) {
            appsApi.getAllApps(params);
            return true;
        }

        var adminOfAppIds = [],
            userOfAppIds = [];

        if (params.member.admin_of) {
            for (var i = 0; i < params.member.admin_of.length ;i++) {
                if (params.member.admin_of[i] == "") {
                    continue;
                }

                adminOfAppIds[adminOfAppIds.length] = common.db.ObjectID(params.member.admin_of[i]);
            }
        }

        if (params.member.user_of) {
            for (var i = 0; i < params.member.user_of.length ;i++) {
                userOfAppIds[userOfAppIds.length] = common.db.ObjectID(params.member.user_of[i]);
            }
        }

        common.db.collection('apps').find({ _id : { '$in': adminOfAppIds } }).toArray(function(err, admin_of) {
            common.db.collection('apps').find({ _id : { '$in': userOfAppIds } }).toArray(function(err, user_of) {
                common.returnOutput(params, {admin_of: packApps(admin_of), user_of: packApps(user_of)});
            });
        });

        return true;
    };

    appsApi.createApp = function (params) {
        if (!(params.member.global_admin)) {
            common.returnMessage(params, 401, 'User is not a global administrator');
            return false;
        }

        var argProps = {
                'name':     { 'required': true, 'type': 'String' },
                'country':  { 'required': false, 'type': 'String' },
                'type':     { 'required': false, 'type': 'String' },
                'category': { 'required': false, 'type': 'String' },
                'timezone': { 'required': false, 'type': 'String' }
            },
            newApp = {};

        if (!(newApp = common.validateArgs(params.qstring.args, argProps))) {
            common.returnMessage(params, 400, 'Not enough args');
            return false;
        }

        processAppProps(newApp);

        common.db.collection('apps').insert(newApp, function(err, app) {
            var appKey = common.sha1Hash(app.ops[0]._id, true);

            common.db.collection('apps').update({'_id': app.ops[0]._id}, {$set: {key: appKey}}, function(err, app) {});

            newApp._id = app.ops[0]._id;
            newApp.key = appKey;

            common.db.collection('app_users' + app.ops[0]._id).insert({_id:"uid-sequence", seq:0},function(err,res){});
			plugins.dispatch("/i/apps/create", {params:params, appId:app.ops[0]._id, data:app.ops[0]});
            common.returnOutput(params, newApp);
        });
    };

    appsApi.updateApp = function (params) {
        var argProps = {
                'app_id':   { 'required': true, 'type': 'String', 'min-length': 24, 'max-length': 24, 'exclude-from-ret-obj': true },
                'name':     { 'required': false, 'type': 'String' },
                'type':     { 'required': false, 'type': 'String' },
                'category': { 'required': false, 'type': 'String' },
                'timezone': { 'required': false, 'type': 'String' },
                'country':  { 'required': false, 'type': 'String' }
            },
            updatedApp = {};

        if (!(updatedApp = common.validateArgs(params.qstring.args, argProps))) {
            common.returnMessage(params, 400, 'Not enough args');
            return false;
        }

        if (Object.keys(updatedApp).length === 0) {
            common.returnMessage(params, 200, 'Nothing changed');
            return true;
        }

        processAppProps(updatedApp);

		common.db.collection('apps').findOne(common.db.ObjectID(params.qstring.args.app_id), function(err, app){
            if (err || !app) common.returnMessage(params, 404, 'App not found');
            else {
				if (params.member && params.member.global_admin) {
					common.db.collection('apps').update({'_id': common.db.ObjectID(params.qstring.args.app_id)}, {$set: updatedApp}, function(err, app) {
						plugins.dispatch("/i/apps/update", {params:params, appId:params.qstring.args.app_id, data:updatedApp});
						common.returnOutput(params, updatedApp);
					});
				} else {
					common.db.collection('members').findOne({'_id': params.member._id}, {admin_of: 1}, function(err, member){
						if (member.admin_of && member.admin_of.indexOf(params.qstring.args.app_id) !== -1) {
							common.db.collection('apps').update({'_id': common.db.ObjectID(params.qstring.args.app_id)}, {$set: updatedApp}, function(err, app) {
								plugins.dispatch("/i/apps/update", {params:params, appId:params.qstring.args.app_id, data:updatedApp});
								common.returnOutput(params, updatedApp);
							});
						} else {
							common.returnMessage(params, 401, 'User does not have admin rights for this app');
						}
					});
				}
			}
		});

        return true;
    };

    appsApi.deleteApp = function (params) {
        if (!(params.member.global_admin)) {
            common.returnMessage(params, 401, 'User is not a global administrator');
            return false;
        }

        var argProps = {
                'app_id': { 'required': true, 'type': 'String', 'min-length': 24, 'max-length': 24 }
            },
            appId = '';

        if (!(appId = common.validateArgs(params.qstring.args, argProps).app_id)) {
            common.returnMessage(params, 400, 'Not enough args');
            return false;
        }
		common.db.collection('apps').findOne({'_id': common.db.ObjectID(appId)}, function(err, app){
			if(!err && app)
				common.db.collection('apps').remove({'_id': common.db.ObjectID(appId)}, {safe: true}, function(err, result) {
		
					if (err) {
						common.returnMessage(params, 500, 'Error deleting app');
						return false;
					}
		
					var iconPath = __dirname + '/public/appimages/' + appId + '.png';
					fs.unlink(iconPath, function() {});
		
					common.db.collection('members').update({}, {$pull: {'apps': appId, 'admin_of': appId, 'user_of': appId}}, {multi: true}, function(err, app) {});
		
					deleteAppData(appId, true, params, app);
					common.returnMessage(params, 200, 'Success');
					return true;
				});
			else
				common.returnMessage(params, 500, 'Error deleting app');
		});

        return true;
    };

    appsApi.resetApp = function (params) {
        var argProps = {
                'app_id': { 'required': true, 'type': 'String', 'min-length': 24, 'max-length': 24 }
            },
            appId = '';

        if (!(appId = common.validateArgs(params.qstring.args, argProps).app_id)) {
            common.returnMessage(params, 400, 'Not enough args');
            return false;
        }
		common.db.collection('apps').findOne({'_id': common.db.ObjectID(appId)}, function(err, app){
			if(!err && app){
				if (params.member.global_admin) {
					deleteAppData(appId, false, params, app);
					common.returnMessage(params, 200, 'Success');
				} else {
					common.db.collection('members').findOne({ admin_of : appId, api_key: params.member.api_key}, function(err, member) {
						if (!err && member) {
							deleteAppData(appId, false, params, app);
							common.returnMessage(params, 200, 'Success');
						} else {
							common.returnMessage(params, 401, 'User does not have admin rights for this app');
						}
					});
				}
            }
		});

        return true;
    };
    
    function deleteAppData(appId, fromAppDelete, params, app) {
        if(fromAppDelete || !params.qstring.args.period || params.qstring.args.period == "all"){
            deleteAllAppData(appId, fromAppDelete, params, app);
        }
        else{
            deletePeriodAppData(appId, fromAppDelete, params, app);
        }
    }

    function deleteAllAppData(appId, fromAppDelete, params, app) {
        common.db.collection('users').remove({'_id': {$regex: appId + ".*"}},function(){});
        common.db.collection('carriers').remove({'_id': {$regex: appId + ".*"}},function(){});
        common.db.collection('devices').remove({'_id': {$regex: appId + ".*"}},function(){});
        common.db.collection('device_details').remove({'_id': {$regex: appId + ".*"}},function(){});
        common.db.collection('cities').remove({'_id': {$regex: appId + ".*"}},function(){});

        function deleteEvents(){
            common.db.collection('events').findOne({'_id': common.db.ObjectID(appId)}, function(err, events) {
                if (!err && events && events.list) {
                    for (var i = 0; i < events.list.length; i++) {
                        var collectionNameWoPrefix = crypto.createHash('sha1').update(events.list[i] + appId).digest('hex');
                        common.db.collection("events" + collectionNameWoPrefix).drop(function(){});
                    }
    
                    common.db.collection('events').remove({'_id': common.db.ObjectID(appId)},function(){});
                }
            });
        }
        common.db.collection('app_users' + appId).drop(function() {
            if (!fromAppDelete) {
                common.db.collection('app_users' + appId).insert({_id:"uid-sequence", seq:0},function(){});
            }
            if (!fromAppDelete)
                plugins.dispatch("/i/apps/reset", {params:params, appId:appId, data:app}, deleteEvents);
            else
                plugins.dispatch("/i/apps/delete", {params:params, appId:appId, data:app}, deleteEvents);
        });

        if (fromAppDelete) {
            common.db.collection('graph_notes').remove({'_id': common.db.ObjectID(appId)},function(){});
        }
    };
    
    function deletePeriodAppData(appId, fromAppDelete, params, app) {
        var periods = {
            "1month":1,
            "3month":3,
            "6month":6,
            "1year":12,
            "2year":24
        };
        var back = periods[params.qstring.args.period];
        var skip = {};
        var dates = {};
        var now = moment();
        skip[appId+"_"+now.format('YYYY:M')] = true;
        dates[now.format('YYYY:M')] = true;
        for(var i = 0; i < back; i++){
            skip[appId+"_"+now.subtract("months", 1).format('YYYY:M')] = true;
            skip[appId+"_"+now.format('YYYY')+":0"] = true;
            dates[now.format('YYYY:M')] = true;
            dates[now.format('YYYY')+":0"] = true;
        }
        skip = Object.keys(skip);
        dates = Object.keys(dates);
        common.db.collection('users').remove({$and:[{'_id': {$regex: appId + ".*"}}, {'_id': {$nin:skip}}]},function(){});
        common.db.collection('carriers').remove({$and:[{'_id': {$regex: appId + ".*"}}, {'_id': {$nin:skip}}]},function(){});
        common.db.collection('devices').remove({$and:[{'_id': {$regex: appId + ".*"}}, {'_id': {$nin:skip}}]},function(){});
        common.db.collection('device_details').remove({$and:[{'_id': {$regex: appId + ".*"}}, {'_id': {$nin:skip}}]},function(){});
        common.db.collection('cities').remove({$and:[{'_id': {$regex: appId + ".*"}}, {'_id': {$nin:skip}}]},function(){});
        
        common.db.collection('events').findOne({'_id': common.db.ObjectID(appId)}, function(err, events) {
            if (!err && events && events.list) {
                for (var i = 0; i < events.list.length; i++) {
                    var segments = [];
                    
                    if(events.list[i] && events.segments && events.segments[events.list[i]])
                        segments = events.segments[events.list[i]];
                    
                    segments.push("no-segment");
                    var docs = [];
                    for(var j = 0; j < segments.length; j++){
                        for(var k = 0; k < dates.length; k++){
                            docs.push(segments[j]+"_"+dates[k]);
                        }
                    }
                    var collectionNameWoPrefix = crypto.createHash('sha1').update(events.list[i] + appId).digest('hex');
                    common.db.collection("events" + collectionNameWoPrefix).remove({'_id': {$nin:docs}},function(){});
                }
            }
        });
        
        plugins.dispatch("/i/apps/clear", {params:params, appId:appId, data:app, moment:now, dates:dates, ids:skip});
    }

    function packApps(apps) {
        var appsObj = {};

        for (var i = 0; i < apps.length ;i++) {
            appsObj[apps[i]._id] = {
                '_id': apps[i]._id,
                'category' : apps[i].category,
                'country' : apps[i].country,
                'key' : apps[i].key,
                'name' : apps[i].name,
                'timezone' : apps[i].timezone
            };
        }

        return appsObj;
    }

    function processAppProps(app) {
        if (!app.country || !isValidCountry(app.country)) {
            app.country = plugins.getConfig("apps").country;
        }

        if (!app.timezone || !isValidTimezone(app.timezone)) {
            app.timezone = plugins.getConfig("apps").timezone;
        }

        if (!app.category || !isValidCategory(app.category)) {
            app.category = plugins.getConfig("apps").category;
        }
    }

    function isValidTimezone(timezone) {
        var timezones = ["Africa/Abidjan","Africa/Accra","Africa/Addis_Ababa","Africa/Algiers","Africa/Asmera","Africa/Bamako","Africa/Bangui","Africa/Banjul","Africa/Bissau","Africa/Blantyre","Africa/Brazzaville","Africa/Bujumbura","Africa/Cairo","Africa/Casablanca","Africa/Ceuta","Africa/Conakry","Africa/Dakar","Africa/Dar_es_Salaam","Africa/Djibouti","Africa/Douala","Africa/El_Aaiun","Africa/Freetown","Africa/Gaborone","Africa/Harare","Africa/Johannesburg","Africa/Kampala","Africa/Khartoum","Africa/Kigali","Africa/Kinshasa","Africa/Lagos","Africa/Libreville","Africa/Lome","Africa/Luanda","Africa/Lubumbashi","Africa/Lusaka","Africa/Malabo","Africa/Maputo","Africa/Maseru","Africa/Mbabane","Africa/Mogadishu","Africa/Monrovia","Africa/Nairobi","Africa/Ndjamena","Africa/Niamey","Africa/Nouakchott","Africa/Ouagadougou","Africa/Porto-Novo","Africa/Sao_Tome","Africa/Tripoli","Africa/Tunis","Africa/Windhoek","America/Anchorage","America/Anguilla","America/Antigua","America/Araguaina","America/Aruba","America/Asuncion","America/Bahia","America/Barbados","America/Belem","America/Belize","America/Boa_Vista","America/Bogota","America/Buenos_Aires","America/Campo_Grande","America/Caracas","America/Cayenne","America/Cayman","America/Chicago","America/Costa_Rica","America/Cuiaba","America/Curacao","America/Danmarkshavn","America/Dawson_Creek","America/Denver","America/Dominica","America/Edmonton","America/El_Salvador","America/Fortaleza","America/Godthab","America/Grand_Turk","America/Grenada","America/Guadeloupe","America/Guatemala","America/Guayaquil","America/Guyana","America/Halifax","America/Havana","America/Hermosillo","America/Iqaluit","America/Jamaica","America/La_Paz","America/Lima","America/Los_Angeles","America/Maceio","America/Managua","America/Manaus","America/Martinique","America/Mazatlan","America/Mexico_City","America/Miquelon","America/Montevideo","America/Montreal","America/Montserrat","America/Nassau","America/New_York","America/Noronha","America/Panama","America/Paramaribo","America/Phoenix","America/Port-au-Prince","America/Port_of_Spain","America/Porto_Velho","America/Puerto_Rico","America/Recife","America/Regina","America/Rio_Branco","America/Santiago","America/Santo_Domingo","America/Sao_Paulo","America/Scoresbysund","America/St_Johns","America/St_Kitts","America/St_Lucia","America/St_Thomas","America/St_Vincent","America/Tegucigalpa","America/Thule","America/Tijuana","America/Toronto","America/Tortola","America/Vancouver","America/Whitehorse","America/Winnipeg","America/Yellowknife","Antarctica/Casey","Antarctica/Davis","Antarctica/DumontDUrville","Antarctica/Mawson","Antarctica/Palmer","Antarctica/Rothera","Antarctica/Syowa","Antarctica/Vostok","Arctic/Longyearbyen","Asia/Aden","Asia/Almaty","Asia/Amman","Asia/Aqtau","Asia/Aqtobe","Asia/Ashgabat","Asia/Baghdad","Asia/Bahrain","Asia/Baku","Asia/Bangkok","Asia/Beirut","Asia/Bishkek","Asia/Brunei","Asia/Calcutta","Asia/Choibalsan","Asia/Colombo","Asia/Damascus","Asia/Dhaka","Asia/Dili","Asia/Dubai","Asia/Dushanbe","Asia/Gaza","Asia/Hong_Kong","Asia/Hovd","Asia/Irkutsk","Asia/Jakarta","Asia/Jayapura","Asia/Jerusalem","Asia/Kabul","Asia/Kamchatka","Asia/Karachi","Asia/Katmandu","Asia/Krasnoyarsk","Asia/Kuala_Lumpur","Asia/Kuwait","Asia/Macau","Asia/Magadan","Asia/Makassar","Asia/Manila","Asia/Muscat","Asia/Nicosia","Asia/Omsk","Asia/Phnom_Penh","Asia/Pyongyang","Asia/Qatar","Asia/Rangoon","Asia/Riyadh","Asia/Saigon","Asia/Seoul","Asia/Shanghai","Asia/Singapore","Asia/Taipei","Asia/Tashkent","Asia/Tbilisi","Asia/Tehran","Asia/Thimphu","Asia/Tokyo","Asia/Ulaanbaatar","Asia/Vientiane","Asia/Vladivostok","Asia/Yakutsk","Asia/Yekaterinburg","Asia/Yerevan","Atlantic/Azores","Atlantic/Bermuda","Atlantic/Canary","Atlantic/Cape_Verde","Atlantic/Faeroe","Atlantic/Reykjavik","Atlantic/South_Georgia","Atlantic/St_Helena","Atlantic/Stanley","Australia/Adelaide","Australia/Brisbane","Australia/Darwin","Australia/Hobart","Australia/Perth","Australia/Sydney","Etc/GMT","Europe/Amsterdam","Europe/Andorra","Europe/Athens","Europe/Belgrade","Europe/Berlin","Europe/Bratislava","Europe/Brussels","Europe/Bucharest","Europe/Budapest","Europe/Chisinau","Europe/Copenhagen","Europe/Dublin","Europe/Gibraltar","Europe/Helsinki","Europe/Istanbul","Europe/Kaliningrad","Europe/Kiev","Europe/Lisbon","Europe/Ljubljana","Europe/London","Europe/Luxembourg","Europe/Madrid","Europe/Malta","Europe/Minsk","Europe/Monaco","Europe/Moscow","Europe/Oslo","Europe/Paris","Europe/Prague","Europe/Riga","Europe/Rome","Europe/Samara","Europe/San_Marino","Europe/Sarajevo","Europe/Skopje","Europe/Sofia","Europe/Stockholm","Europe/Tallinn","Europe/Tirane","Europe/Vaduz","Europe/Vatican","Europe/Vienna","Europe/Vilnius","Europe/Warsaw","Europe/Zagreb","Europe/Zurich","Indian/Antananarivo","Indian/Chagos","Indian/Christmas","Indian/Cocos","Indian/Comoro","Indian/Kerguelen","Indian/Mahe","Indian/Maldives","Indian/Mauritius","Indian/Mayotte","Indian/Reunion","Pacific/Apia","Pacific/Auckland","Pacific/Easter","Pacific/Efate","Pacific/Enderbury","Pacific/Fakaofo","Pacific/Fiji","Pacific/Funafuti","Pacific/Galapagos","Pacific/Gambier","Pacific/Guadalcanal","Pacific/Guam","Pacific/Honolulu","Pacific/Johnston","Pacific/Kiritimati","Pacific/Kosrae","Pacific/Kwajalein","Pacific/Majuro","Pacific/Marquesas","Pacific/Midway","Pacific/Nauru","Pacific/Niue","Pacific/Norfolk","Pacific/Noumea","Pacific/Pago_Pago","Pacific/Palau","Pacific/Pitcairn","Pacific/Ponape","Pacific/Port_Moresby","Pacific/Rarotonga","Pacific/Saipan","Pacific/Tahiti","Pacific/Tarawa","Pacific/Tongatapu","Pacific/Truk","Pacific/Wake","Pacific/Wallis"];

        return timezones.indexOf(timezone) !== -1;
    }

    function isValidCategory(category) {
        var categories = ["1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20"];

        return categories.indexOf(category) !== -1;
    }

    function isValidCountry(country) {
        var countries = ["AF","AX","AL","DZ","AS","AD","AO","AI","AQ","AG","AR","AM","AW","AU","AT","AZ","BS","BH","BD","BB","BY","BE","BZ","BJ","BM","BT","BO","BQ","BA","BW","BV","BR","IO","BN","BG","BF","BI","KH","CM","CA","CV","KY","CF","TD","CL","CN","CX","CC","CO","KM","CG","CD","CK","CR","CI","HR","CU","CW","CY","CZ","DK","DJ","DM","DO","EC","EG","SV","GQ","ER","EE","ET","FK","FO","FJ","FI","FR","GF","PF","TF","GA","GM","GE","DE","GH","GI","GR","GL","GD","GP","GU","GT","GG","GN","GW","GY","HT","HM","VA","HN","HK","HU","IS","IN","ID","IR","IQ","IE","IM","IL","IT","JM","JP","JE","JO","KZ","KE","KI","KP","KR","KW","KG","LA","LV","LB","LS","LR","LY","LI","LT","LU","MO","MK","MG","MW","MY","MV","ML","MT","MH","MQ","MR","MU","YT","MX","FM","MD","MC","MN","ME","MS","MA","MZ","MM","NA","NR","NP","NL","NC","NZ","NI","NE","NG","NU","NF","MP","NO","OM","PK","PW","PS","PA","PG","PY","PE","PH","PN","PL","PT","PR","QA","RE","RO","RU","RW","BL","SH","KN","LC","MF","PM","VC","WS","SM","ST","SA","SN","RS","SC","SL","SG","SX","SK","SI","SB","SO","ZA","GS","SS","ES","LK","SD","SR","SJ","SZ","SE","CH","SY","TW","TJ","TZ","TH","TL","TG","TK","TO","TT","TN","TR","TM","TC","TV","UG","UA","AE","GB","US","UM","UY","UZ","VU","VE","VN","VG","VI","WF","EH","YE","ZM","ZW"];

        return countries.indexOf(country) !== -1;
    }

}(appsApi));

module.exports = appsApi;