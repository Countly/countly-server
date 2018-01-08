var plugin = {},
	common = require('../../../api/utils/common.js'),
	plugins = require('../../pluginManager.js'),
	async = require('async');

(function (plugin) {
	plugins.register("/i", function (ob) {
		var params = ob.params;

		if (!params.qstring.begin_session && !params.qstring.events) {
			return false;
		}

		var appId = params.app_id;

		var events = [];

		if (!appId) return false;

		var hasSession = false;
		var hasEvents = false;

		if (params.qstring.begin_session) {
			hasSession = true;
		}

		if (params.qstring.events && params.qstring.events.length) {
			hasEvents = true;
			events = params.qstring.events;
		}

		var query = {};
		var criteria = {};
		var update = {};
		var options = {};


		if (hasSession && params.qstring.hour !== undefined && params.qstring.dow !== undefined) {
			var sessionDate = common.initTimeObj(params.appTimezone, params.qstring.timestamp);
			var id = "[CLY]_session" + "_" + sessionDate.monthly.replace('.', ':');

			criteria = {
				"_id": id
			};

			var incData = {};
			incData['d.' + params.qstring.dow + "." + params.qstring.hour + ".count"] = 1;
			var setData = {};
			setData["_id"] = id;
			setData['m'] = sessionDate.monthly.replace('.', ':');
			setData['s'] = "[CLY]_session";
			setData['a'] = appId;

			update = {
				$set: setData,
				$inc: incData
			};

			options = {
				upsert: true
			};

			query[id] = {
				"criteria": criteria,
				"update": update,
				"options": options
			}
		}

		if (hasEvents) {

			for (var i = 0; i < events.length; i++) {
				if (events[i].key === undefined || events[i].count === undefined) continue;

				var timeStamp = events[i].timestamp || params.qstring.timestamp;
				var eventDate = common.initTimeObj(params.appTimezone, timeStamp)

				var id = events[i].key + "_" + eventDate.monthly.replace('.', ':');

				criteria = {
					"_id": id
				};

				var dow = events[i].dow === undefined ? params.qstring.dow : events[i].dow;
				var hour = events[i].hour === undefined ? params.qstring.hour : events[i].hour;


				if (dow === undefined || hour === undefined)
					continue;

				var incData = (query[id] && query[id].update) ? query[id].update.$inc : {};
				incData['d.' + dow + "." + hour + ".count"] = incData['d.' + dow + "." + hour + ".count"]
					? incData['d.' + dow + "." + hour + ".count"] + events[i].count
					: events[i].count;

				var setData = {};
				setData["_id"] = id;
				setData['m'] = eventDate.monthly.replace('.', ':');
				setData['s'] = events[i].key;
				setData['a'] = appId;

				update = {
					$set: setData,
					$inc: incData
				};

				options = {
					upsert: true
				};

				query[id] = {
					"criteria": criteria,
					"update": update,
					"options": options
				};
			}
		}

		var collectionName = "timesofday" + appId;


		if (query) {
			common.db.collection('events').findOne({ _id: common.db.ObjectID(appId) }, { list: 1 }, function (err, eventData) {

				if (err) {
					console.log("err", err);
					return true;
				}

				eventData = eventData == undefined ? { list: [] } : eventData;

				var limit = plugins.getConfig("api").event_limit;
				var overLimit = eventData.list.count > limit;

				common.db.onOpened(function () {
					var bulk = common.db._native.collection(collectionName).initializeUnorderedBulkOp();


					Object.keys(query).forEach(function (key, index) {
						var queryObject = query[key];
						var s = queryObject.update.$set.s;

						if (s === "[CLY]_session" || !overLimit || (overLimit && eventData.list.indexOf(s) >= 0))
							bulk.find(queryObject.criteria).upsert().updateOne(queryObject.update);
					})


					if (bulk.length > 0) {
						bulk.execute(function (err, updateResult) {
							if (err) {
								//there was an error
							}
							//all done
						});
					}
				});
			})
		}

		return true;
	});

	plugins.register("/o", function (ob) {
		var params = ob.params;

		if (params.qstring.method == "times-of-day") {
			var appId = params.qstring.app_id;
			var todType = params.qstring.tod_type;

			var criteria = {
				"s": todType
			}

			if (params.qstring.date_range)
				criteria.m = { $in: params.qstring.date_range.split(',') }

			var collectionName = "timesofday" + appId;
			common.db.collection(collectionName).find(criteria).toArray(function (err, results) {
				if (err) {
					console.log("Error while fetching times of day data: ", err.message);
					common.returnMessage(params, 400, "Something went wrong");
					return false;
				}

				var timesOfDay = [0, 1, 2, 3, 4, 5, 6].map(function (x) {
					return Array(24).fill(0)
				});

				results.forEach(result => {
					for (var i = 0; i < 7; i++) {
						for (var j = 0; j < 24; j++) {
							timesOfDay[i][j] += result["d"][i] ?
								(result["d"][i][j] ? result["d"][i][j]["count"] : 0)
								: 0;
						}
					}
				});

				common.returnOutput(params, timesOfDay);
				return true;
			})
			return true;
		}
		return false;
	});

	plugins.register("/i/apps/clear_all", function (ob) {
		common.db.collection("timesofday" + ob.appId).drop(function () { });
	});

	plugins.register("/i/apps/reset", function (ob) {
		common.db.collection("timesofday" + ob.appId).drop(function () { });
	});

	plugins.register("/i/apps/delete", function (ob) {
		common.db.collection("timesofday" + ob.appId).drop(function () { });
	});
}(plugin));

module.exports = plugin;