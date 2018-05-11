'use strict';
const utils = require('../parts/utils');
const countlyCommon = require('../../../../api/lib/countly.common.js');
const fetch = require('../../../../api/parts/data/fetch.js');
const countlyModel = require('../../../../api/lib/countly.model.js');

const countlySession = countlyModel.load("users");
const bluebird = require("bluebird");
const moment = require('moment');
const common = require('../../../../api/utils/common.js');
const mail = require("../../../../api/parts/mgmt/mail");
const log = require('../../../../api/utils/log.js')('alert:metric');

const UserAlert = {

	/**
	 * @param alertConfigs
	 */
	alert(alertConfigs, result, callback) {

		return bluebird.coroutine(function *() {
			log.i('trigger alert:', alertConfigs);
			utils.addAlertCount();
			if (alertConfigs.alertBy === 'email') {
				const emails = yield utils.getDashboardUserEmail(alertConfigs.alertValues) //alertConfigs.alertValues.split(',');
				let html = '';
				const host = yield utils.getHost();

				let appsListTitle = 'several apps';
				if( result.length <= 3 ) {
					const appName = [];
					result.map((data)=>{ appName.push(data.app.name)});
					appsListTitle = appName.join(', ');
				}
				
				let title = '';
				let keyName = alertConfigs.alertDataSubType; //get total session value
				// let keyName =  'Session'; //get total session value
				// if (alertConfigs.alertDataSubType.indexOf('Total users') >= 0 ) {
				// 	keyName = 'Total user';
				// } else if (alertConfigs.alertDataSubType.indexOf('New users') >= 0 ) {
				// 	keyName = 'New user';
				// }else if (alertConfigs.alertDataSubType.indexOf('Purchases') >= 0 ) {
				// 	keyName = 'Purchases';
				// }else if (alertConfigs.alertDataSubType.indexOf('Average session duration') >= 0 ) {
				// 	keyName = 'Average session duration';
				// }

				title = `${keyName} count for ${appsListTitle} has changed compared to yesterday`;
				const subject = title;
				
 				html = yield utils.getEmailTemplate({
					title: `Countly Alert`,
					subTitle: `Countly Alert: ` + alertConfigs.alertName,
					host,
					compareDescribe: alertConfigs.compareDescribe,
					apps: result.map((data)=>{
						const item = {
							id: data.app._id,
							name: data.app.name,
							data:[{
								key:'Today\'s Value',
								value: data.todayValue
							}]
						};
						if(data.lastDateValue != null){
							item['data'].push({key: 'Yesterday\'s Value', value: data.lastDateValue});
						} 
						return item;
					}) 
				})
 				emails.forEach((to) => {
					utils.addAlertCount(to);										
					log.i('will send email=>>>>>>>>>>');
					log.i('to:', to);
					log.d('subject:', subject);
					log.d('message:', html); 
					utils.sendEmail(to, subject, html);
				});		
			
			} 
			// if (alertConfigs.alertBy === 'http') {
			// 	utils.sendRequest(alertConfigs.alertValues)
			// }
		})() 
	},


	/**
	 * check logic for alert.
	 * @param options
	 * @param options.db        database object
	 * @param options.alertConfigs    config for alert
	 * @param options.done      done promise for Countly Job module
	 *
	 */
	check({db, alertConfigs, done}){
		var self = this;
		return bluebird.coroutine(function *() {
			log.i("checking alert:", alertConfigs);
			const apps = alertConfigs.selectedApps;
			const alertList = [];
			for (let i = 0; i < alertConfigs.selectedApps.length; i++) {
				const rightHour = yield utils.checkAppLocalTimeHour(alertConfigs.selectedApps[i], 23);				
				if(!rightHour) { 
					return done();
				}
				
				log.d("APP time is 23:59, start job");					
				
				if(alertConfigs.alertDataSubType === 'Average session duration'){
					const data = yield getAverageSessionDuration(db, alertConfigs.selectedApps[i], 'hour');
					const lastDateValue = parseFloat(data['avg_time']['prev-total'].split(' ')[0]);
					const todayValue = parseFloat(data['avg_time']['total'].split(' ')[0]);
					const result = utils.compareValues(alertConfigs, {todayValue, lastDateValue}, null, i); 
					log.d(`For app getAverageSessionDuration ${result} ${lastDateValue},${todayValue},${alertConfigs.selectedApps[i]}`, data);
					if(result.matched){
						result.todayValue =  `${result.todayValue} min`;
						result.lastDateValue =  `${result.lastDateValue} min`;						
						const app = yield utils.getAppInfo(result.currentApp);
						result.app = app;					 
						alertList.push(result);
					}
				} else if(alertConfigs.alertDataSubType === 'Purchases'){
					const app = yield utils.getAppInfo(alertConfigs.selectedApps[i]);
					const data = yield getPurchasesData(app);
					const result = getCompareValues(alertConfigs, data, i); 
					if(result.matched){
						const app = yield utils.getAppInfo(result.currentApp);
						result.app = app;					 
						alertList.push(result);
					} 
				} else if(alertConfigs.alertDataSubType === 'Number of page views' || alertConfigs.alertDataSubType === 'Bounce rate'){
					const data = yield getViewData(alertConfigs.selectedApps[i]);
					const result =  getCompareValues(alertConfigs, data, i); 
					if(result.matched){
						const app = yield utils.getAppInfo(result.currentApp);
						result.app = app;					 
						alertList.push(result);
					}
				} else {
					const data = yield getUserAndSessionData(db, alertConfigs.selectedApps[i], "7days");
					const result = getCompareValues(alertConfigs, data, i); 
					log.d(`For app ${alertConfigs.selectedApps[i]}`, result);
					if(result.matched){
						const app = yield utils.getAppInfo(result.currentApp);
						result.app = app;					 
						alertList.push(result);
					}	
				}

				
			}
			if(alertList.length > 0){
				self.alert(alertConfigs, alertList);
			}
			done();
		})()

	}
}
 
/**
* fetch purchase data
* @param {*} appObject  
*/ 
function getPurchasesData(appObject) { 
	return new bluebird(function (resolve, reject) {
		const purchaseEvents = appObject.iap_event;
		if(purchaseEvents && purchaseEvents.length > 0 ){
			 return fetch.fetchMergedEventData({
				 qstring:{
					 events: purchaseEvents,
					 period: '7days' 
				 },
				 app_id: appObject._id,
				 APICallback: function(data) {
					 resolve(data);
				 }
			 });	
		 }
	}).catch((e)=>{
		console.log(e);
	})
 }

/**
 * fetch session, user data
 * @param {*} db 
 * @param {*} app_id 
 * @param {*} period 
 */
 
function getUserAndSessionData(db, app_id, period) {
	return new bluebird(function (resolve, reject) {
		return fetch.fetchTimeObj('users', {app_id, qstring: {period}}, false, function (data) {
			return resolve(data);
		});
	})
}
 
/**
 * fetch average session duration
 * @param {*} db 
 * @param {*} app_id 
 * @param {*} period 
 */
 
function getAverageSessionDuration(db, app_id, period) {
	var params = {qstring: {}};
	params.app_id = app_id;
	params.qstring.period= period;

	return new bluebird(function (resolve, reject) {
 		return  fetch.fetchTimeObj('users', params, false, function(usersDoc) {
			// We need to set app_id once again here because after the callback
			// it is reset to it's original value
		 
			fetch.getTotalUsersObj("users", params, function(dbTotalUsersObj) {
				countlySession.setDb(usersDoc || {});
				countlySession.setTotalUsersObj(fetch.formatTotalUsersObj(dbTotalUsersObj));

				var map = {t:"total_sessions", n:"new_users", u:"total_users", d:"total_time", e:"events"};
				var ret = {};
				var data = countlyCommon.getDashboardData(countlySession.getDb(), ["t", "n", "u", "d", "e"], ["u"], {u:countlySession.getTotalUsersObj().users}, countlySession.clearObject);
				for(var i in data){
					ret[map[i]] = data[i];
				}
				
				//convert duration to minutes
				ret["total_time"]["total"] /= 60;
				ret["total_time"]["prev-total"] /= 60;
				
				//calculate average duration
				var changeAvgDuration = countlyCommon.getPercentChange(
					(ret["total_sessions"]["prev-total"] === 0) ? 0 : ret["total_time"]["prev-total"] / ret["total_sessions"]["prev-total"], 
					(ret["total_sessions"]["total"] === 0 ) ? 0 : ret["total_time"]["total"] / ret["total_sessions"]["total"]);
				ret["avg_time"] = {
					"prev-total":(ret["total_sessions"]["prev-total"] === 0) ? 0 : ret["total_time"]["prev-total"] / ret["total_sessions"]["prev-total"],
					"total":(ret["total_sessions"]["total"] === 0 ) ? 0 : ret["total_time"]["total"] / ret["total_sessions"]["total"],
					"change":changeAvgDuration.percent,
					"trend":changeAvgDuration.trend
				};
				ret["total_time"]["total"] = countlyCommon.timeString(ret["total_time"]["total"]);
				ret["total_time"]["prev-total"] = countlyCommon.timeString(ret["total_time"]["prev-total"]);
				ret["avg_time"]["total"] = countlyCommon.timeString(ret["avg_time"]["total"]);
				ret["avg_time"]["prev-total"] = countlyCommon.timeString(ret["avg_time"]["prev-total"]);
 				
				resolve(ret);
			});
		});
		
	}).catch((e)=>{
		console.log(e);
	})
}


/**
 * fetch view count and bounce rate data 
 * @param {*} app_id 
 */
function getViewData(app_id) {
	return new bluebird(function (resolve, reject) {
		fetch.getTimeObjForEvents("app_viewdata"+ app_id, {app_id, qstring:{}}, {unique: "u", levels:{daily:["u","t","s","b","e","d","n"], monthly:["u","t","s","b","e","d","n"]}}, function(data){			
			resolve(data);
		});
	}).catch((e)=>{
		reject(e);
	})
}


/**
 * compare data logic for different alert config types('Total users', 'New users', 'Total sessions')
 * @param {*} alertConfigs 
 * @param {*} data 
 * @param {*} index 
 */
function getCompareValues(alertConfigs, data, index){
	let keyName =  't'; //get total session value
	if (alertConfigs.alertDataSubType.indexOf('Total users') >= 0 ) {
		keyName = 'u';
	} else if (alertConfigs.alertDataSubType.indexOf('New users') >= 0 ) {
		keyName = 'n';
	} else if(alertConfigs.alertDataSubType === 'Purchases'){
		keyName = 's';
	} else if(alertConfigs.alertDataSubType === 'Number of page views'){
		keyName = alertConfigs.alertDataSubType2 + ".t";
	}else if(alertConfigs.alertDataSubType === 'Bounce rate'){
		keyName = alertConfigs.alertDataSubType2 + ".b";
	}
	return utils.compareValues(alertConfigs, data, keyName, index); 
}


module.exports = UserAlert;
