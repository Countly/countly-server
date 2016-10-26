var plugin = {},
	common = require('../../../api/utils/common.js'),
	crypto = require('crypto'),
	countlyCommon = require('../../../api/lib/countly.common.js'),
	plugins = require('../../pluginManager.js');

(function (plugin) {
	/**
	 * 	register internalEvent
	 */
	plugins.internalEvents.push('[CLY]_star_rating');

	/**
	 * register for process new  rating event data.
	 * the original event format like:
	 *  { key: '[CLY]_star_rating', count:1, sum:1, segmentation:{ platform:"iOS", version:"3.2", rating:2}
	 *  this function will add a field call "platform_version_rate" in segmentation.
	 *
	 */
	var ratingEventProcess = function(ob){
		var params = ob.params;
		var events = (params.qstring && params.qstring.events);
		if (events) {
			events.forEach( function(event) {
				if(event.key === '[CLY]_star_rating'){
					event.segmentation['platform_version_rate'] =
                        event.segmentation['platform'] + "**" +
                        event.segmentation['app_version'] + "**" +
                        event.segmentation['rating'] + "**";
				}
			});
		}
	};

	plugins.register("/i", ratingEventProcess);

	/**
	 * register for fetching platform and version metadata.
	 */
	plugins.register('/o', function(ob) {
		var params = ob.params;
 		if(params.qstring.method == 'star'){
			if (params.qstring.period) {
				//check if period comes from datapicker
				if (params.qstring.period.indexOf(",") !== -1) {
					try {
						params.qstring.period = JSON.parse(params.qstring.period);
					} catch (SyntaxError) {
						console.log('Parsing custom period failed!');
						common.returnMessage(params, 400, 'Bad request parameter: period');
						return false;
					}
				}
				else{
					switch (params.qstring.period){
						case "month":
						case "day":
						case "yesterday":
						case "hour":
						case "7days":
						case "30days":
						case "60days":
							break;
						default:
							common.returnMessage(params, 400, 'Bad request parameter: period');
							return false;
							break;
					}
				}
			} else {
				common.returnMessage(params, 400, 'Missing request parameter: period');
				return false;
			}

			countlyCommon.setPeriod(params.qstring.period, true);
			//countlyCommon.setTimezone(params.appTimezone, true);
			//console.log(countlyCommon.periodObj,"@@");

			var periodObj = countlyCommon.periodObj;
 			var collectionName = 'events' + crypto.createHash('sha1')
					.update('[CLY]_star_rating' + params.qstring.app_id).digest('hex');
			var documents=[];
			for (var i = 0; i < periodObj.reqZeroDbDateIds.length; i++) {
				documents.push("no-segment_" + periodObj.reqZeroDbDateIds[i]);
			}

			common.db.collection(collectionName).find({'_id':{$in:documents}}).toArray(
				function(err,docs){
					if(!err){
						var result = {};
						docs.forEach(function (doc){
							doc.meta.platform_version_rate.forEach(function(item){
								var data = item.split('**');
								if(result[data[0]] === undefined)
									result[data[0]] = [];
								if(result[data[0]].indexOf(data[1]) === -1){
									result[data[0]].push(data[1]);
								}
							})
						});
						common.returnOutput(params, result);
						return true;
						//common.returnMessage(params, 200, result);
					}
				}
			);
			return true;
		}
		return false;
	})


}(plugin));

module.exports = plugin;