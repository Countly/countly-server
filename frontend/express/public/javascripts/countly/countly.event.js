(function(countlyEvent, $, undefined) {

	//Private Properties
	var _activeEventDb = {},
		_activeEvents = {},
		_activeEvent = "",
		_activeSegmentation,
		_activeSegmentationValues = [],
		_activeAppKey = 0;
		
	//Public Methods
	countlyEvent.initialize = function() {
		if (!countlyCommon.DEBUG) {
			return $.when(
				$.ajax({
					type: "GET",
					url: countlyCommon.READ_API_URL,
					data: {
						"app_key" : countlyCommon.ACTIVE_APP_KEY,
						"method" : "get_events"
					},
					dataType: "jsonp",
					success: function(json) {
						_activeEvents = json;
						if (!_activeEvent && countlyEvent.getEvents()[0]) {
							_activeEvent = countlyEvent.getEvents()[0].key;
						}
					}
				}),
				$.ajax({
					type: "GET",
					url: countlyCommon.READ_API_URL,
					data: {
						"app_key" : countlyCommon.ACTIVE_APP_KEY,
						"method" : "events",
						"event": _activeEvent
					},
					dataType: "jsonp",
					success: function(json) {
						var tmpJson = {};
						if (json.length){
							for (var i=0; i < json.length; i++) {
								tmpJson = $.extend(true, tmpJson, json[i]);
							}
						}
					
						_activeEventDb = tmpJson;
						setMeta();
					}
				})
			).then(function(){ 
				 return true;
			});
		} else {
			_activeEventDb = {"2012":{}};
			_activeEvents = {};
			return true;
		}
	};
	
	countlyEvent.refresh = function() {
		if (!countlyCommon.DEBUG) {
		
			if (_activeAppKey != countlyCommon.ACTIVE_APP_KEY) {
				_activeAppKey = countlyCommon.ACTIVE_APP_KEY;
				return countlyEvent.initialize();
			}
		
			return $.when(
				$.ajax({
					type: "GET",
					url: countlyCommon.READ_API_URL,
					data: {
						"app_key" : countlyCommon.ACTIVE_APP_KEY,
						"method" : "get_events"
					},
					dataType: "jsonp",
					success: function(json) {
						_activeEvents = json;
						if (!_activeEvent) {
							_activeEvent = countlyEvent.getEvents()[0].key;
						}
					}
				}),
				$.ajax({
					type: "GET",
					url: countlyCommon.READ_API_URL,
					data: {
						"app_key" : countlyCommon.ACTIVE_APP_KEY,
						"method" : "events",
						"action" : "refresh",
						"event": _activeEvent
					},
					dataType: "jsonp",
					success: function(json) {
						var tmpJson = {};
						if (json.length){
							for (var i=0; i < json.length; i++) {
								tmpJson = $.extend(true, tmpJson, json[i]);
							}
						}

						countlyCommon.extendDbObj(_activeEventDb, tmpJson);
						setMeta();
					}
				})
			).then(function(){ 
				 return true;
			});
		} else {
			_activeEventDb = {"2012":{}};
			_activeEvents = {};
			return true;
		}
	};
	
	countlyEvent.reset = function() {
		_activeEventDb = {};
		setMeta();
	}
	
	countlyEvent.refreshEvents = function() {
		if (!countlyCommon.DEBUG) {
			$.ajax({
				type: "GET",
				url: countlyCommon.READ_API_URL,
				data: {
					"app_key" : countlyCommon.ACTIVE_APP_KEY,
					"method" : "get_events"
				},
				dataType: "jsonp",
				success: function(json) {
					_activeEvents = json;
					if (!_activeEvent && countlyEvent.getEvents()[0]) {
						_activeEvent = countlyEvent.getEvents()[0].key;
					}
				}
			});
		} else {
			_activeEvents = {};
			return true;
		}
	}
	
	countlyEvent.setActiveEvent = function(activeEvent) {
		_activeEvent = activeEvent;
		_activeSegmentation = "";
		countlyEvent.initialize();
	}
	
	countlyEvent.setActiveSegmentation = function(activeSegmentation) {
		_activeSegmentation = activeSegmentation;
	}
	
	countlyEvent.getActiveSegmentation = function() {
		return (_activeSegmentation)? _activeSegmentation : jQuery.i18n.map["events.no-segmentation"];
	}
	
	countlyEvent.getEventData = function() {
	
		var eventData = {},
			eventMap = (_activeEvents)? ((_activeEvents.map)? _activeEvents.map : {}) : {},
			countString = (eventMap[_activeEvent] && eventMap[_activeEvent].count)? eventMap[_activeEvent].count : jQuery.i18n.map["events.table.count"],
			sumString = (eventMap[_activeEvent] && eventMap[_activeEvent].sum)? eventMap[_activeEvent].sum : jQuery.i18n.map["events.table.sum"];
	
		if (_activeSegmentation) {
			eventData = {chartData: {}, chartDP: {dp: [], ticks: []}};
			
			var tmpEventData = countlyCommon.extractTwoLevelData(_activeEventDb, _activeSegmentationValues, countlyEvent.clearEventsObject, [
				{
					name: "curr_segment",
					func: function (rangeArr, dataObj) {
						return rangeArr.replace(/:/g, ".");
					}
				},
				{ "name": "c" },
				{ "name": "s" }
			]);
				
			eventData.chartData = tmpEventData.chartData;

			var segments = _.pluck(eventData.chartData, "curr_segment"),
				segmentsCount = _.pluck(eventData.chartData, 'c'),
				segmentsSum = _.compact(_.pluck(eventData.chartData, 's')),
				chartDP = [{data: []}];
			
			//segments = segments.join().replace(/:/g, ".").split(",");
			
			if (segmentsSum.length) {
				chartDP[chartDP.length] = {data: []};
			}
			
			chartDP[0]["data"][0] = [-1,null];
			chartDP[0]["data"][segments.length+1] = [segments.length, null];
			
			eventData.chartDP.ticks.push([-1, ""]);
			eventData.chartDP.ticks.push([segments.length, ""]);
					
			for (var i = 0; i < segments.length; i++) {
				chartDP[0]["data"][i+1] = [i, segmentsCount[i]];
				if (segmentsSum.length) {
					chartDP[1]["data"][i+1] = [i, segmentsSum[i]];
				}
				eventData.chartDP.ticks.push([i, segments[i]]);
			}
			
			eventData.chartDP.dp = chartDP;
			
			eventData["eventName"] = countlyEvent.getEventLongName(_activeEvent);
			eventData["dataLevel"] = 2;
			eventData["tableColumns"] = [jQuery.i18n.map["events.table.segmentation"], countString];
			if (segmentsSum.length) {
				eventData["tableColumns"][eventData["tableColumns"].length] = sumString;
			} else {
				_.each(eventData.chartData, function(element, index, list){ list[index] = _.pick(element, "curr_segment", "c"); });
			}
		} else {
			var chartData = [ { data: [], label: countString }, { data: [], label: sumString } ],
				dataProps = [
					{ name: "c" },
					{ name: "s" }
				];
				
			eventData = countlyCommon.extractChartData(_activeEventDb, countlyEvent.clearEventsObject, chartData, dataProps);
			
			eventData["eventName"] = countlyEvent.getEventLongName(_activeEvent);
			eventData["dataLevel"] = 1;
			eventData["tableColumns"] = [jQuery.i18n.map["common.date"], countString];

			if(_.compact(_.pluck(eventData.chartData, 's')).length) {
				eventData["tableColumns"][eventData["tableColumns"].length] = sumString;
			} else {
				eventData.chartDP[1] = false;
				eventData.chartDP = _.compact(eventData.chartDP);
				_.each(eventData.chartData, function(element, index, list){ list[index] = _.pick(element, "date", "c"); });
			}
		}
		
		return eventData;
	}
	
	countlyEvent.getEvents = function() {
		var events = (_activeEvents)? ((_activeEvents.list)? _activeEvents.list : []) : [],
			eventMap = (_activeEvents)? ((_activeEvents.map)? _activeEvents.map : {}) : {},
			eventNames = [];
			
		for (var i = 0; i < events.length; i++) {
			if (eventMap[events[i]] && eventMap[events[i]]["name"]) {
				eventNames.push({
					"key": events[i],
					"name": eventMap[events[i]]["name"],
					"is_active": (_activeEvent == events[i])
				});
			} else {
				eventNames.push({
					"key": events[i],
					"name": events[i],
					"is_active": (_activeEvent == events[i])
				});
			}
		}
			
		return eventNames;
	};
	
	countlyEvent.getEventsWithSegmentations = function() {
		var eventSegmentations = (_activeEvents)? ((_activeEvents.segments)? _activeEvents.segments : []) : [],
			eventMap = (_activeEvents)? ((_activeEvents.map)? _activeEvents.map : {}) : {},
			eventNames = [];
		
		for (var event in eventSegmentations) {

			if (eventMap[event] && eventMap[event]["name"]) {
				eventNames.push({
					"key": event,
					"name": eventMap[event]["name"]
				});
			} else {
				eventNames.push({
					"key": event,
					"name": event
				});
			}
		
			for (var i = 0; i < eventSegmentations[event].length; i++) {
				if (eventMap[event] && eventMap[event]["name"]) {
					eventNames.push({
						"key": event,
						"name": eventMap[event]["name"] + " / " + eventSegmentations[event][i]
					});
				} else {
					eventNames.push({
						"key": event,
						"name": event + " / " + eventSegmentations[event][i]
					});
				}
			}
		}
			
		return eventNames;
	};
	
	countlyEvent.getEventMap = function() {
		var events = (_activeEvents)? ((_activeEvents.list)? _activeEvents.list : []) : [],
			eventMap = (_activeEvents)? ((_activeEvents.map)? _activeEvents.map : {}) : {};
		
		for (var i = 0; i < events.length; i++) {
			if (!eventMap[events[i]]) {
				eventMap[events[i]] = {
					"name": "",
					"count": "",
					"sum": ""
				};
			}
			
			eventMap[events[i]]["event_key"] = events[i];
		}
	
		return eventMap;
	};
	
	countlyEvent.getEventLongName = function(eventKey) {
		var eventMap = (_activeEvents)? ((_activeEvents.map)? _activeEvents.map : {}) : {};
		
		if (eventMap[eventKey] && eventMap[eventKey]["name"]) {
			return eventMap[eventKey]["name"];
		} else {
			return eventKey;
		}
	}
	
	countlyEvent.getEventSegmentations = function() {
		var eventSegmentations = (_activeEventDb.meta && _activeEventDb.meta.segments)? _activeEventDb.meta.segments : [];
		return eventSegmentations;
	};
	
	countlyEvent.clearEventsObject = function(obj) {
		if (obj) {
			if(!obj["c"]) obj["c"] = 0;
			if(!obj["s"]) obj["s"] = 0;
		}
		else {
			obj = {"c": 0, "s": 0};
		}
		
		return obj;
	}
	
	countlyEvent.getEventSummary = function() {
		
		//Update the current period object in case selected date is changed
		_periodObj = countlyCommon.periodObj;
		
		var dataArr = {},
			tmp_x,
			tmp_y,
			currentTotal = 0,
			previousTotal = 0,
			currentSum = 0,
			previousSum = 0;
			
		if (_periodObj.isSpecialPeriod) {		
			for (var i = 0; i < (_periodObj.currentPeriodArr.length); i++) {
				tmp_x = countlyCommon.getDescendantProp(_activeEventDb, _periodObj.currentPeriodArr[i]);
				tmp_y = countlyCommon.getDescendantProp(_activeEventDb, _periodObj.previousPeriodArr[i]);
				tmp_x = countlyEvent.clearEventsObject(tmp_x);
				tmp_y = countlyEvent.clearEventsObject(tmp_y);
				
				currentTotal += tmp_x["c"];
				previousTotal += tmp_y["c"];
				currentSum += tmp_x["s"];
				previousSum += tmp_y["s"];
			}
		} else {
			tmp_x = countlyCommon.getDescendantProp(_activeEventDb, _periodObj.activePeriod);
			tmp_y = countlyCommon.getDescendantProp(_activeEventDb, _periodObj.previousPeriod);
			tmp_x = countlyEvent.clearEventsObject(tmp_x);
			tmp_y = countlyEvent.clearEventsObject(tmp_y);
				
			currentTotal = tmp_x["c"];
			previousTotal = tmp_y["c"];
			currentSum = tmp_x["s"];
			previousSum = tmp_y["s"];
		}
		
		var	changeTotal = countlyCommon.getPercentChange(previousTotal, currentTotal),
			changeSum = countlyCommon.getPercentChange(previousSum, currentSum);

		dataArr = 
		{
			usage: {
				"event-total": {
					"total": currentTotal,
					"change": changeTotal.percent,
					"trend": changeTotal.trend
				},
				"event-sum": {
					"total": currentSum,
					"change": changeSum.percent,
					"trend": changeSum.trend
				}
			}
		}

		var eventMap = (_activeEvents)? ((_activeEvents.map)? _activeEvents.map : {}) : {},
			countString = (eventMap[_activeEvent] && eventMap[_activeEvent].count)? eventMap[_activeEvent].count.toUpperCase() : jQuery.i18n.map["events.count"],
			sumString = (eventMap[_activeEvent] && eventMap[_activeEvent].sum)? eventMap[_activeEvent].sum.toUpperCase() : jQuery.i18n.map["events.sum"];
		
		var bigNumbers = {
			"class": "one-column",
			"items": [
				{
					"title": countString,
					"total": dataArr.usage["event-total"].total,
					"trend": dataArr.usage["event-total"].trend
				}
			]
		};
		
		if (currentSum != 0) {
			bigNumbers.class = "two-column";
			bigNumbers.items[bigNumbers.items.length] = {
				"title": sumString,
				"total": dataArr.usage["event-sum"].total,
				"trend": dataArr.usage["event-sum"].trend
			}
		}
		
		return bigNumbers;
	};
	
	function setMeta() {
		if (_activeSegmentation && _activeEventDb['meta']) {
			_activeSegmentationValues = (_activeEventDb['meta'][_activeSegmentation])? _activeEventDb['meta'][_activeSegmentation]: [];
		} else {
			_activeSegmentationValues = [];
		}
	}
	
}(window.countlyEvent = window.countlyEvent || {}, jQuery));
