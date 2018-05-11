'use strict';
const Promise = require("bluebird");
const utils = require('../parts/utils');
const countlyCommon = require('../../../../api/lib/countly.common.js');
const fetch = require('../../../../api/parts/data/fetch.js');
const countlyModel = require('../../../../api/lib/countly.model.js');
const countlySession = countlyModel.load("users");
const bluebird = require("bluebird");
const common = require('../../../../api/utils/common.js');
const log = require('../../../../api/utils/log.js')('alert:event');


const eventAlert = {
	/**
	 * function for sending alert email
	 * @param {*} alertConfigs 
	 * @param {*} result 
	 * @param {*} callback 
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
				if(result.length <=3){
					const appName = [];
					result.map((data)=>{ appName.push(data.app.name)});
					appsListTitle = appName.join(', ');
				}
				let title = '';
				title = `Event count for ${appsListTitle} has changed compared to yesterday`;
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
	 * alert checking logic.
	 * @param options
	 * @param options.db        database object
	 * @param options.alertConfigs    config for alert
	 * @param options.done      done promise for Countly Job module
	 *
	 */
	check({db, alertConfigs, done}){
		var self = this;
		return bluebird.coroutine(function *() {
			const rightHour = yield utils.checkAppLocalTimeHour(alertConfigs.selectedApps[0], 23);
			if(rightHour) { 
				log.i("checking alert:", alertConfigs);
				const data = yield getEventData(alertConfigs);
				const result = utils.compareValues(alertConfigs, data, 'c', 0); 
				log.d('app:', alertConfigs.selectedApps[0] , ' result:', result, "getEventData:", JSON.stringify(data));  
				if(result.matched){
					common.db.collection('apps').findOne({ _id: common.db.ObjectID( result.currentApp)},function (err, app) {
						result.app = app;
						self.alert(alertConfigs, [result]);
					});
				}
			} 
			done();
		})()


	}
}
 
function getEventData(alertConfigs) {
	return new Promise(function (resolve, reject) {
		const currentApp = alertConfigs.selectedApps[0];
		return fetch.prefetchEventData(null, {
			qstring:{
				event: alertConfigs.alertDataSubType,
				period: '7days' 
			},
			app_id: currentApp,
			APICallback: function(data) {
				resolve(data);
			}
		});
	}).catch((e) => {
		log.d("Error in GetEventData:", e);
		return reject(e);
	});
}


module.exports = eventAlert;
