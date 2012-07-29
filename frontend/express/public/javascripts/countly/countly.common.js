(function(countlyCommon, $, undefined) {

	//Private Properties
	var _period = "hour";
	
	//Public Properties
	countlyCommon.ACTIVE_APP_KEY = 1;
	countlyCommon.READ_API_URL = "http://localhost/o";
	countlyCommon.DEBUG = false;
	countlyCommon.GRAPH_COLORS = ["#88BBC8", "#ED8662", "#A0ED62", "#869BD5", "#F7B05A", "#C8A788", "#A2C025", "#DFB114", "#DD770C", "#D35417", "#B93629", "#9A1B2F"];
	countlyCommon.periodObj = {};
	
	//Public Methods
	countlyCommon.setPeriod = function(period) {
		_period = period;
		countlyCommon.periodObj = getPeriodObj();
	};
	
	countlyCommon.getPeriod = function() {
		return _period;
	};
	
	countlyCommon.setActiveApp = function(appKey) {
		countlyCommon.ACTIVE_APP_KEY = appKey;
	};
	
	countlyCommon.getPercentChange = function(previous, current) {	
		var pChange = 0,
			trend = "";
		
		if (previous == 0) {
			pChange = "NA";
			trend = "u";
		} else if (current == 0) {
			pChange = "∞";
			trend = "d";
		} else {
			pChange = countlyCommon.getShortNumber((((current - previous) / current) * 100).toFixed(1)) + "%";
			if (previous > current) {
				trend = "d";
			} else {
				trend = "u";
			}
		}
		
		return {"percent": pChange, "trend": trend};
	};
		
	countlyCommon.getDescendantProp = function(obj, desc) {
		desc = String(desc);
		
		if (desc.indexOf(".") === -1) {
			return obj[desc];
		}
		
		var arr = desc.split(".");
		while(arr.length && (obj = obj[arr.shift()]));

		return obj;
	};
	
	/*
	Draws a graph with the given data points. This function is used to draw all graphs except line graphs.
	*/
	countlyCommon.drawGraph = function(dataPoints, container, graphType, graphProperties) {

		if (!graphProperties) {
			graphProperties = {
				series: {
				   lines: { show: true, fill:true },
				   points: { show: true }
				},
				grid: { hoverable: true, borderColor: "null", color: "#999", borderWidth: 0, minBorderMargin:10},
				xaxis: { minTickSize: 1, tickDecimals:"number", tickLength: 0},
				yaxis: { min: 0, minTickSize: 1, tickDecimals:"number" },
				legend: { backgroundOpacity:0, margin: [5, -19] },
				colors: countlyCommon.GRAPH_COLORS
			};
		}
	
		switch(graphType) {
			case "line":
				graphProperties.series = {lines: { show: true, fill:true }, points: { show: true }};
				break;
			case "bar":
				graphProperties.series = {stack: true, bars: { show: true, align:"center", barWidth:0.6, tickLength: 0 }};
				graphProperties.xaxis.ticks = dataPoints.ticks;
				break;
			case "pie":
				graphProperties.series = { pie: { 
					show: true,
					radius: 115,
					combine: {
						color: '#999',
						threshold: 0.1
					},
					label: {
						show: true,
						radius: 160
					}
				}};
				graphProperties.legend.show = false;
				break;
			default:
				break;
		}
		
		$.plot($(container), dataPoints.dp, graphProperties);
	}
	
	/*
	Draws a line graph with the given dataPoints to container. graphProperties param is optional and you may specify graph's properties
	*/
	countlyCommon.drawTimeGraph = function(dataPoints, container, hideTicks, graphProperties) {
		
		timeGraphData = dataPoints[0].data;
		
		var now = moment(),
			year = now.year(),
			month = (now.month() + 1);
			
		if (!graphProperties) {
			graphProperties = {
				series: {
					lines: { stack:false, show: true, fill:true, lineWidth:2, fillColor: { colors: [ { opacity: 0 }, { opacity: 0.15 } ] }, shadowSize:0 },
					points: { show: true, radius:4, shadowSize:0 },
					shadowSize:0
				},
				grid: { hoverable: !hideTicks, borderColor: "null", color: "#BDBDBD", borderWidth: 0, minBorderMargin:10, labelMargin: 10},
				xaxis: { min: 1, max:31, tickDecimals:"number", tickSize:0, tickLength: 0 },
				yaxis: { min: 0, minTickSize: 1, tickDecimals:"number", ticks: 3 },
				legend: { show:false, margin: [-25, -44], noColumns:3, backgroundOpacity:0 },
				colors: countlyCommon.GRAPH_COLORS
			};
		}
		
		if (dataPoints[0].data.length > 90) {
			graphProperties.series.points.show = false;
		} else {
			graphProperties.series.points.show = true;
		}
					
		var graphTicks = [];
					
		switch (_period) {
			case "month":
				graphProperties.xaxis.max = null;
				graphProperties.xaxis.min = null;
				var monthTicks = [];
				
				monthTicks[0] = [0,""];
				
				for (var i = 0; i < 12; i++) {
					monthTicks[monthTicks.length] = [(i + 1), moment.monthsShort[i]];
					graphTicks[i+1] = [moment.monthsShort[i]];
				}
				
				for (var i = 0; i < dataPoints.length; i++) {
					var tmpData = [[0.9,null]];
					dataPoints[i].data = tmpData.concat(dataPoints[i].data);
					dataPoints[i].data[dataPoints[i].data.length] = [(dataPoints[i].data.length - 0.9), null];
				}
				
				monthTicks[dataPoints[0].data.length - 1] = [dataPoints[0].data.length, ""]
				
				graphProperties.xaxis.ticks = monthTicks;
				break;
			case "day":
				var monthTicks = [],
					daysInMonth = getDaysInMonth(year, month);

				graphProperties.xaxis.max = null;
				graphProperties.xaxis.min = null;
				
				for (var i = 0; i < daysInMonth; i++) {
					var monthStart = moment(year + "-" + month).add('days', i),
						monthStartDay = monthStart.date(),
						monthStartMonth = monthStart.format("MMM");
					
					graphTicks[i+1] = [monthStartDay + " " + monthStartMonth];
				}

				for (var i = 2; i < daysInMonth; (i = i + 3)) {			
					var monthStart = moment(year + "-" + month).add('days', i - 1),
						monthStartYear = monthStart.year(),
						monthStartMonth = monthStart.format("MMM"),
						monthStartDay = monthStart.date();
					
					monthTicks[monthTicks.length] = [i, monthStartDay + " " + monthStartMonth];
				}
				
				graphProperties.xaxis.ticks = monthTicks;
				break;
			case "hour":
				var hourTicks = [];
				for (var i = 0; i < 25; i++) {
					if (i != 0 && i != 24 && i % 3 == 0) {
						hourTicks[hourTicks.length] = [i, i+":00"];
					}
					
					graphTicks[i] = [i+":00"];
				}
				graphProperties.xaxis.max = 24;
				graphProperties.xaxis.ticks = hourTicks;
				graphProperties.xaxis.min = 0;
				break;
			case "90days":
				var monthTicks = [];
				graphProperties.xaxis.max = null;
				graphProperties.xaxis.min = null;
				for (var i = 0; i < 90; i++) {			
					var monthStart = moment().subtract('days', i),
							monthStartYear = monthStart.year(),
							monthStartMonth = monthStart.format("MMM"),
							monthStartDay = monthStart.date();
					
					if (i != 0 && (i == 1 || i % 4 == 0)) {
						monthTicks[monthTicks.length] = [(89 - i), monthStartDay + " " + monthStartMonth];
					}
					
					graphTicks[(89 - i)] = [monthStartDay + " " + monthStartMonth];
				}
				
				graphProperties.xaxis.ticks = monthTicks;
				break;
			case "60days":
				var monthTicks = [];
				graphProperties.xaxis.max = null;
				graphProperties.xaxis.min = null;
				
				for (var i = 0; i < 60; i++) {			
					var monthStart = moment().subtract('days', i),
							monthStartYear = monthStart.year(),
							monthStartMonth = monthStart.format("MMM"),
							monthStartDay = monthStart.date();
					
					if (i != 0 && (i == 1 || i % 4 == 0)) {
						monthTicks[monthTicks.length] = [(59 - i), monthStartDay + " " + monthStartMonth];
					}
					
					graphTicks[(59 - i)] = [monthStartDay + " " + monthStartMonth];
				}
				
				graphProperties.xaxis.ticks = monthTicks;
				
				break;
			case "30days":
				var monthTicks = [];
				graphProperties.xaxis.max = null;
				graphProperties.xaxis.min = null;

				for (var i = 0; i < 30; i++) {			
					var monthStart = moment().subtract('days', i),
							monthStartYear = monthStart.year(),
							monthStartMonth = monthStart.format("MMM"),
							monthStartDay = monthStart.date();
					
					if (i != 0 && (i == 1 || i % 4 == 0)) {
						monthTicks[monthTicks.length] = [(29 - i), monthStartDay + " " + monthStartMonth];
					}
					
					graphTicks[(29 - i)] = [monthStartDay + " " + monthStartMonth];
				}
				
				graphProperties.xaxis.ticks = monthTicks;
				
				break;
			case "7days":
				var weekTicks = [];
				graphProperties.xaxis.max = null;
				graphProperties.xaxis.min = null;
				
				for (var i = 0; i < 7; i++) {
					var weekStart = moment().subtract('days', i),
							weekStartYear = weekStart.year(),
							weekStartMonth = weekStart.format("MMM"),
							weekStartDay = weekStart.date();
					
					if (i == 1 || i == 3 || i == 5) {
						weekTicks[weekTicks.length] = [(6 - i), weekStartDay + " " + weekStartMonth];
					}
					
					graphTicks[(6 - i)] = [weekStartDay + " " + weekStartMonth];
				}
				
				graphProperties.xaxis.ticks = weekTicks;
				break;
			default:
				break;
		}
		
		if (Object.prototype.toString.call(_period) === '[object Array]' && _period.length == 2) {
			var a = moment(_period[0]),
				b = moment(_period[1]);
					
			daysInPeriod = b.diff(a, 'days');
			rangeEndDay = _period[1];
			
			var monthTicks = [];
			
			graphProperties.xaxis.max = null;
			graphProperties.xaxis.min = null;
						
			for (var i = 0; i < daysInPeriod; i++) {			
				var monthStart = moment(_period[0]).add('days', i),
					monthStartYear = monthStart.year(),
					monthStartMonth = monthStart.format("MMM"),
					monthStartDay = monthStart.date();
				
				if (i != 0 && i % Math.ceil(daysInPeriod / 10) == 0) {
					monthTicks[monthTicks.length] = [i, monthStartDay + " " + monthStartMonth];
				}
				
				graphTicks[i] = [monthStartDay + " " + monthStartMonth];
			}
			
			graphProperties.xaxis.ticks = monthTicks;
		}
		
		var graphObj = $.plot($(container), dataPoints, graphProperties),
			keyEventCounter = "A",
			keyEvents = [];
		
		for (var k = 0; k < graphObj.getData().length; k++) {
		
			var tmpMax = 0,
				tmpMaxIndex = 0,
				tmpMin = 999999999999,
				tmpMinIndex = 0,
				label = (graphObj.getData()[k].label).toLowerCase();

			$.each(graphObj.getData()[k].data, function(i, el){
								
				//data point is null
				//this workaround is used to start drawing graph with a certain padding
				if (!el[1] && el[1] !== 0) {
					return true;
				}
				
				el[1] = parseFloat(el[1]);

				if (el[1] >= tmpMax) {
					tmpMax = el[1];
					tmpMaxIndex = el[0];
				}
				
				if (el[1] <= tmpMin) {
					tmpMin = el[1];
					tmpMinIndex = el[0];
				}
			});
			
			if (tmpMax == tmpMin) {
				continue;
			}
			
			keyEvents[k] = [];
			
			keyEvents[k][keyEvents[k].length] = {
				data: [tmpMinIndex, tmpMin],
				code: keyEventCounter,
				color: graphObj.getData()[k].color,
				event: "min",
				desc: "Minimum <b>"+ tmpMin +" </b>" + label + " on <b>" + graphTicks[tmpMinIndex] + "</b>"
			};
			keyEventCounter = String.fromCharCode(keyEventCounter.charCodeAt() + 1);
			
			keyEvents[k][keyEvents[k].length] = {
				data: [tmpMaxIndex, tmpMax], 
				code: keyEventCounter,
				color: graphObj.getData()[k].color,
				event: "max",
				desc: "Maximum <b>"+ tmpMax +" </b>" + label + " reached on <b>" + graphTicks[tmpMaxIndex] + "</b>"
			};
			keyEventCounter = String.fromCharCode(keyEventCounter.charCodeAt() + 1);
		}
		
		var graphWidth = graphObj.width();
		
		for (var k = 0; k < keyEvents.length; k++) {
			var bgColor = graphObj.getData()[k].color;
		
			for (var l = 0; l < keyEvents[k].length; l++) {

				var o = graphObj.pointOffset({x: keyEvents[k][l]["data"][0], y: keyEvents[k][l]["data"][1]});
				
				if (o.left <= 15) {
					o.left = 15;
				}
				
				if (o.left >= (graphWidth - 15)) {
					o.left = (graphWidth - 15);
				}
				
				if (!hideTicks) {
					var keyEventLabel = $('<div class="graph-key-event-label">').text(keyEvents[k][l]["code"]);
					
					keyEventLabel.attr({
						"title": keyEvents[k][l]["desc"],
						"data-points": "[" + keyEvents[k][l]["data"] + "]"
					}).css( {
						"position": 'absolute',
						"left": o.left,
						"top": o.top - 33,
						"display": 'none',
						"background-color": bgColor
					}).appendTo(graphObj.getPlaceholder()).show();
					
					$(".tipsy").remove();
					keyEventLabel.tipsy({gravity: $.fn.tipsy.autoWE, offset:3, html: true});
				}
			}
		}
		
		var previousPoint;
		
		$(container).bind("plothover", function (event, pos, item) {
			$("#x").text(pos.x.toFixed(0));
			$("#y").text(pos.y.toFixed(0));

			if (item) {
				if (previousPoint != item.dataIndex) {
					previousPoint = item.dataIndex;
					
					$("#graph-tooltip").remove();
					var x = item.datapoint[0].toFixed(1).replace(".0", ""),
						y = item.datapoint[1].toFixed(1).replace(".0", "");
	
					showTooltip(item.pageX, item.pageY-40, y + " " + item.series.label);
				}
			}
			else {
				$("#graph-tooltip").remove();
				previousPoint = null;            
			}
		}).bind("plotselected", function (event, ranges) {
			plot = $.plot($(container), dataPoints,
					  $.extend(true, {}, graphProperties, {
						  xaxis: { min: ranges.xaxis.from, max: ranges.xaxis.to }
					  }));
		});
		
		return keyEvents;
	}
		
	countlyCommon.extractRangeData = function(db, propertyName, rangeArray, explainRange) {
	
		var dataArr = [],
			dataArrCounter = 0,
			rangeTotal,
			total = 0;
			
		if (!rangeArray) {
			return dataArr;
		}
			
		for(var j = 0; j < rangeArray.length; j++) {
		
			rangeTotal = 0;
		
			if (!countlyCommon.periodObj.isSpecialPeriod) {
				var tmp_x = countlyCommon.getDescendantProp(db, countlyCommon.periodObj.activePeriod + "." + propertyName);
				
				if (tmp_x && tmp_x[rangeArray[j]]) {
					rangeTotal += tmp_x[rangeArray[j]];
				}
				
				if (rangeTotal != 0) {
					dataArr[dataArrCounter] = {};
					dataArr[dataArrCounter][propertyName] = (explainRange)? explainRange(rangeArray[j]) : rangeArray[j];
					dataArr[dataArrCounter]["t"] = rangeTotal;
					
					total += rangeTotal;
					dataArrCounter++;
				}
			} else {
				for (var i = 0; i < (countlyCommon.periodObj.uniquePeriodArr.length); i++) {
					var tmp_x = countlyCommon.getDescendantProp(db, countlyCommon.periodObj.uniquePeriodArr[i] + "." + propertyName);
					
					if (tmp_x && tmp_x[rangeArray[j]]) {
						rangeTotal += tmp_x[rangeArray[j]];
					}
				}
				
				if (rangeTotal != 0) {
					dataArr[dataArrCounter] = {};
					dataArr[dataArrCounter][propertyName] = (explainRange)? explainRange(rangeArray[j]) : rangeArray[j];
					dataArr[dataArrCounter]["t"] = rangeTotal;
					
					total += rangeTotal;
					dataArrCounter++;
				}
			}
		}

		for(var j = 0; j < dataArr.length; j++) {
			dataArr[j].percent = ((dataArr[j]["t"] / total) * 100).toFixed(1);
		}
		
		dataArr.sort(function(a,b) { return -(a["t"] - b["t"]); });
		
		return dataArr;
	}
	
	countlyCommon.extractChartData = function(db, clearFunction, chartData, dataProperties) {
	
		var periodMin = 0,
			periodMax = 0,
			dataObj = {},
			formattedDate = "",
			tableData = [],
			propertyNames = _.pluck(dataProperties, "name"),
			propertyFunctions = _.pluck(dataProperties, "func");
	
		if (!countlyCommon.periodObj.isSpecialPeriod) {
			periodMin = countlyCommon.periodObj.periodMin;
			periodMax = (countlyCommon.periodObj.periodMax + 1);	
		} else {
			periodMin = 0;
			periodMax = countlyCommon.periodObj.currentPeriodArr.length;
		}
		
		for (var i = periodMin; i < periodMax; i++) {
			
			if (!countlyCommon.periodObj.isSpecialPeriod) {
				
				if (countlyCommon.periodObj.periodMin == 0) {
					formattedDate = moment((countlyCommon.periodObj.activePeriod+" "+i+":00:00").replace(/\./g, "/"));
				} else if ((""+countlyCommon.periodObj.activePeriod).indexOf(".") == -1) {
					formattedDate = moment((countlyCommon.periodObj.activePeriod+"/"+i+"/1").replace(/\./g, "/"));
				} else {
					formattedDate = moment((countlyCommon.periodObj.activePeriod+"/"+i).replace(/\./g, "/"));
				}
			
				dataObj = countlyCommon.getDescendantProp(db, countlyCommon.periodObj.activePeriod + "." + i);
			} else {
				formattedDate = moment((countlyCommon.periodObj.currentPeriodArr[i]).replace(/\./g, "/"));
				dataObj = countlyCommon.getDescendantProp(db, countlyCommon.periodObj.currentPeriodArr[i]);
			}
			
			dataObj = clearFunction(dataObj);
			
			tableData[i] = {};
			tableData[i]["date"] = formattedDate.format(countlyCommon.periodObj.dateString);
			
			for (var j = 0; j < propertyNames.length; j++) {
			
				if (propertyFunctions[j]) {
					propertyValue = propertyFunctions[j](dataObj);
				} else {
					propertyValue = dataObj[propertyNames[j]];
				}
			
				chartData[j]["data"][chartData[j]["data"].length] = [i, propertyValue];
				tableData[i][propertyNames[j]] = propertyValue;
			}
		}
		
		var keyEvents = [];
		
		for (var k = 0; k < chartData.length; k++) {
			var flatChartData = _.flatten(chartData[k]["data"]);
			var chartVals = _.reject(flatChartData, function(context, value, index, list) {return value % 2 == 0;});
			var chartIndexes = _.filter(flatChartData, function(context, value, index, list) {return value % 2 == 0;});
			
			keyEvents[k] = {};
			keyEvents[k].min = _.min(chartVals);
			keyEvents[k].max = _.max(chartVals);
		}
		
		return {"chartDP": chartData, "chartData": _.compact(tableData), "keyEvents": keyEvents};
	}
	
	countlyCommon.extractTwoLevelData = function(db, rangeArray, clearFunction, dataProperties) {
	
		if (!rangeArray) {
			return {"chartData": tableData};
		}
		var periodMin = 0,
			periodMax = 0,
			dataObj = {},
			formattedDate = "",
			tableData = [],
			chartData = [],
			propertyNames = _.pluck(dataProperties, "name"),
			propertyFunctions = _.pluck(dataProperties, "func"),
			propertyValue = 0;
	
		if (!countlyCommon.periodObj.isSpecialPeriod) {
			periodMin = countlyCommon.periodObj.periodMin;
			periodMax = (countlyCommon.periodObj.periodMax + 1);	
		} else {
			periodMin = 0;
			periodMax = countlyCommon.periodObj.currentPeriodArr.length;
		}
		
		var tableCounter = 0;
		
		if (!countlyCommon.periodObj.isSpecialPeriod) {
			for (var j = 0; j < rangeArray.length; j++) {
				dataObj = countlyCommon.getDescendantProp(db, countlyCommon.periodObj.activePeriod + "." + rangeArray[j]);
				
				if (!dataObj) {
					continue;
				}
				
				dataObj = clearFunction(dataObj);
				
				var propertySum = 0,
					tmpPropertyObj = {};
				
				for (var k = 0; k < propertyNames.length; k++) {
				
					if (propertyFunctions[k]) {
						propertyValue = propertyFunctions[k](rangeArray[j], dataObj);
					} else {
						propertyValue = dataObj[propertyNames[k]];
					}
										
					if (typeof propertyValue !== 'string') {
						propertySum += propertyValue;
					}
					
					tmpPropertyObj[propertyNames[k]] = propertyValue;
				}
				
				if (propertySum > 0) {
					tableData[tableCounter] = {};
					tableData[tableCounter] = tmpPropertyObj;
					tableCounter++;
				}
			}
		} else {
		
			for (var j = 0; j < rangeArray.length; j++) {
				
				var propertySum = 0,
					tmpPropertyObj = {},
					tmp_x = {};
				
				for (var i = periodMin; i < periodMax; i++) {
					dataObj = countlyCommon.getDescendantProp(db, countlyCommon.periodObj.currentPeriodArr[i] + "." + rangeArray[j]);
					
					if (!dataObj) {
						continue;
					}
					
					dataObj = clearFunction(dataObj);
					
					for (var k = 0; k < propertyNames.length; k++) {
					
						if (propertyNames[k] == "u") {
							propertyValue = 0;
						} else if (propertyFunctions[k]) {
							propertyValue = propertyFunctions[k](rangeArray[j], dataObj);
						} else {
							propertyValue = dataObj[propertyNames[k]];
						}

						if (!tmpPropertyObj[propertyNames[k]]) {
							tmpPropertyObj[propertyNames[k]] = 0;
						}
						
						if (typeof propertyValue === 'string') {
							tmpPropertyObj[propertyNames[k]] = propertyValue;
						} else {
							propertySum += propertyValue;
							tmpPropertyObj[propertyNames[k]] += propertyValue;
						}
					}
				}
				
				if (propertyNames.indexOf["u"] != -1) {
					tmpPropertyObj["u"] = 0;
				
					for (var l = 0; l < (countlyCommon.periodObj.uniquePeriodArr.length); l++) {
						tmp_x = countlyCommon.getDescendantProp(db, countlyCommon.periodObj.uniquePeriodArr[l] + "." + rangeArray[j]);
						if (!tmp_x) {
							continue;
						}
						tmp_x = clearFunction(tmp_x);
						propertyValue = tmp_x["u"];

						if (typeof propertyValue === 'string') {
							tmpPropertyObj["u"] = propertyValue;
						} else {
							propertySum += propertyValue;
							tmpPropertyObj["u"] += propertyValue;
						}
					}
				}
				
				if (propertySum > 0) {
					tableData[tableCounter] = {};
					tableData[tableCounter] = tmpPropertyObj;
					tableCounter++;
				}
			}
		}
		
		tableData = _.sortBy(tableData, function(obj){ return -obj["t"]});
		
		return {"chartData": tableData};
	}
	
	countlyCommon.extractBarData = function(db, rangeArray, clearFunction) {
	
		var rangeData = countlyCommon.extractTwoLevelData(db, rangeArray, clearFunction, [
			{
				name: "range",
				func: function (rangeArr, dataObj) {
					return rangeArr;
				}
			},
			{ "name": "t" }
		]);

		var rangeNames = _.pluck(rangeData.chartData, 'range'),
			rangeTotal = _.pluck(rangeData.chartData, 't'),
			barData = [],
			sum = 0,
			maxItems = 3,
			totalPercent = 0;

		rangeTotal.sort(function (a, b) {
			if (a < b) return 1;
			if (b < a) return -1;
			return 0;
		});

		if (rangeNames.length < 3) {
			maxItems = rangeNames.length;
		}

		for (var i = 0; i < maxItems; i++) {
			sum += rangeTotal[i];
		}

		for (var i = 0; i < maxItems; i++) {
			var percent = Math.floor((rangeTotal[i] / sum) * 100);
			totalPercent += percent;
			
			if (i == (maxItems - 1)) {
				percent += 100 - totalPercent;
			}
			
			barData[i] = { "name": rangeNames[i], "percent": percent };
		}

		return barData;
	}
	
	countlyCommon.getShortNumber = function(number) {
		
		var tmpNumber = "";
		
		if (number >= 1000000 || number <= -1000000) {
			tmpNumber = ((number / 1000000).toFixed(1).replace(".0", "")) + "M";
		} else if (number >= 1000 || number <= -1000) {
			tmpNumber = ((number / 1000).toFixed(1).replace(".0", "")) + "K";
		} else {
			number += "";
			tmpNumber = number.replace(".0", "");
		}
		
		return tmpNumber;
	}
	
	countlyCommon.getDateRange = function() {
			
		if (!countlyCommon.periodObj.isSpecialPeriod) {
			if (countlyCommon.periodObj.periodMin == 0) {
				formattedDateStart = moment((countlyCommon.periodObj.activePeriod+" " + countlyCommon.periodObj.periodMin + ":00:00").replace(/\./g, "/"));
				formattedDateEnd = moment((countlyCommon.periodObj.activePeriod+" " + (countlyCommon.periodObj.periodMax) + ":00:00").replace(/\./g, "/"));
			} else {
				formattedDateStart = moment((countlyCommon.periodObj.activePeriod+"/" + countlyCommon.periodObj.periodMin).replace(/\./g, "/"));
				formattedDateEnd = moment((countlyCommon.periodObj.activePeriod+"/" + (countlyCommon.periodObj.periodMax)).replace(/\./g, "/"));
			}
		} else {
			formattedDateStart = moment((countlyCommon.periodObj.currentPeriodArr[0]).replace(/\./g, "/"));
			formattedDateEnd = moment((countlyCommon.periodObj.currentPeriodArr[(countlyCommon.periodObj.currentPeriodArr.length - 1)]).replace(/\./g, "/"));
		}
			
		return formattedDateStart.format(countlyCommon.periodObj.dateString) + " - " + formattedDateEnd.format(countlyCommon.periodObj.dateString);
	}
	
	//Private Methods
	function getDaysInMonth(year, month) {
		return new Date(year, month, 0).getDate();
	}
	
	function getPeriodObj() {
		var	now = moment(),
			year = now.year(),
			month = (now.month() + 1),
			day = now.date(),
			hour = (now.hours()),
			activePeriod,
			previousPeriod,
			periodMax,
			periodMin,
			currentPeriodArr = [],
			previousPeriodArr = [],
			periodObj = {},
			isSpecialPeriod = false,
			daysInPeriod = 0,
			rangeEndDay = null,
			dateString,
			uniquePeriods = [],
			previousUniquePeriods = [];

		switch (_period) {
			case "month":
				activePeriod = year;
				previousPeriod = year - 1;
				periodMax = month;
				periodMin = 1;
				dateString = "MMM";
				break;
			case "day":
				activePeriod = year + "." + month;
	
				var previousDate = moment().subtract('days', day),
					previousYear = previousDate.year(),
					previousMonth = (previousDate.month() + 1),
					previousDay = previousDate.date();
					
				previousPeriod = previousYear + "." + previousMonth;
				periodMax = day;
				periodMin = 1;
				dateString = "MMM Do";
				break;
			case "hour":
				activePeriod = year + "." + month + "." + day;
				var previousDate = moment().subtract('days', 1),
					previousYear = previousDate.year(),
					previousMonth = (previousDate.month() + 1),
					previousDay = previousDate.date();
					
				previousPeriod = previousYear + "." + previousMonth + "." + previousDay;
				periodMax = hour;
				periodMin = 0;
				dateString = "HH:mm";
				break;
			case "7days":
				daysInPeriod = 7;
				break;
			case "30days":
				daysInPeriod = 30;
				break;
			case "60days":
				daysInPeriod = 60;
				break;
			case "90days":
				daysInPeriod = 90;
				break;
			default:
				break;
		}
		
		//Check whether period object is array
		if (Object.prototype.toString.call(_period) === '[object Array]' && _period.length == 2) {
			var a = moment(_period[0]),
				b = moment(_period[1]);
					
			daysInPeriod = b.diff(a, 'days');
			rangeEndDay = _period[1];
		}
		
		var weekCounts = {},
			weeksArray = [],
			monthCounts = {},
			monthsArray = [],
			previousWeekCounts = {},
			previousWeeksArray = [],
			previousMonthCounts = {},
			previousMonthsArray = [];
		
		if (daysInPeriod != 0) {
			var yearChanged = false,
				currentYear = 0;
					
			for (var i = (daysInPeriod - 1); i > -1; i--) {			
				var periodStart = (!rangeEndDay)? moment().subtract('days', i) : moment(rangeEndDay).subtract('days', i),
					periodStartYear = periodStart.year(),
					previousPeriodStart = moment().subtract('days', (daysInPeriod + i));
				
				if (i != (daysInPeriod - 1) && currentYear != periodStartYear) {
					yearChanged = true;
				}
				currentYear = periodStartYear;
				
				var currWeek = "w" + periodStart.format("w");
				weeksArray[weeksArray.length] = currWeek;
				weekCounts[currWeek] = (weekCounts[currWeek] != undefined)? (weekCounts[currWeek] + 1) : 1;
				
				var currMonth = periodStart.format("YYYY.M");
				monthsArray[monthsArray.length] = currMonth;
				monthCounts[currMonth] = (monthCounts[currMonth] != undefined)? (monthCounts[currMonth] + 1) : 1;
				
				var prevWeek = "w" + previousPeriodStart.format("w");
				previousWeeksArray[previousWeeksArray.length] = prevWeek;
				previousWeekCounts[prevWeek] = (previousWeekCounts[prevWeek] != undefined)? (previousWeekCounts[prevWeek] + 1) : 1;
				
				var prevMonth = previousPeriodStart.format("YYYY.M");
				previousMonthsArray[previousMonthsArray.length] = prevMonth;
				previousMonthCounts[prevMonth] = (previousMonthCounts[prevMonth] != undefined)? (previousMonthCounts[prevMonth] + 1) : 1;
				
				currentPeriodArr[currentPeriodArr.length] = periodStart.format("YYYY.M.D");
				previousPeriodArr[previousPeriodArr.length] =  previousPeriodStart.format("YYYY.M.D");
			}
			
			for (var key in weekCounts) {
				if (weekCounts[key] < 7) {
					for (var i=0; i < weeksArray.length; i++) {
						weeksArray[i] = weeksArray[i].replace(key, 0);
					}
				}
			}
			
			var tmpDaysInMonth = -1,
				tmpPrevKey = -1;
				
			for (var key in monthCounts) {
				if (tmpPrevKey != key) {
					tmpDaysInMonth = moment(key).daysInMonth();
					tmpPrevKey = key;
				}
				
				if (monthCounts[key] < tmpDaysInMonth) {
					for (var i=0; i < monthsArray.length; i++) {
						monthsArray[i] = monthsArray[i].replace(key, 0);
					}
				}
			}
			var rejectedWeeks = [];
			for (var i=0; i < monthsArray.length; i++) {
				if (monthsArray[i] == 0) {
					if (weeksArray[i] == 0) {
						uniquePeriods[i] = currentPeriodArr[i];
					} else {
						uniquePeriods[i] = weeksArray[i];
					}
				} else {
					rejectedWeeks[rejectedWeeks.length] = weeksArray[i];
					uniquePeriods[i] = monthsArray[i];
				}
			}
			
			rejectedWeeks = _.uniq(rejectedWeeks);
			uniquePeriods = _.uniq(_.difference(uniquePeriods, rejectedWeeks));
			
			for (var key in previousWeekCounts) {
				if (previousWeekCounts[key] < 7) {
					for (var i=0; i < previousWeeksArray.length; i++) {
						previousWeeksArray[i] = previousWeeksArray[i].replace(key, 0);
					}
				}
			}
			
			var tmpDaysInMonth = -1,
				tmpPrevKey = -1;
			
			for (var key in previousMonthCounts) {
				if (tmpPrevKey != key) {
					tmpDaysInMonth = moment(key).daysInMonth();
					tmpPrevKey = key;
				}
				
				if (previousMonthCounts[key] < tmpDaysInMonth) {
					for (var i=0; i < previousMonthsArray.length; i++) {
						previousMonthsArray[i] = previousMonthsArray[i].replace(key, 0);
					}
				}
			}
			
			var rejectedWeeks = [];
			for (var i=0; i < previousMonthsArray.length; i++) {
				if (previousMonthsArray[i] == 0) {
					if (previousWeeksArray[i] == 0) {
						previousUniquePeriods[i] = previousPeriodArr[i];
					} else {
						previousUniquePeriods[i] = previousWeeksArray[i];
					}
				} else {
					rejectedWeeks[rejectedWeeks.length] = weeksArray[i];
					previousUniquePeriods[i] = previousMonthsArray[i];
				}
			}
			
			rejectedWeeks = _.uniq(rejectedWeeks);
			previousUniquePeriods = _.uniq(_.difference(previousUniquePeriods, rejectedWeeks));
			
			dateString = (yearChanged)? "MMM Do, YYYY" : "MMM Do";
			isSpecialPeriod = true;
		}

		periodObj = {
			"activePeriod": activePeriod,
			"periodMax": periodMax,
			"periodMin": periodMin, 
			"previousPeriod": previousPeriod, 
			"currentPeriodArr": currentPeriodArr,
			"previousPeriodArr": previousPeriodArr,
			"isSpecialPeriod": isSpecialPeriod,
			"dateString": dateString,
			"daysInPeriod": daysInPeriod,
			"uniquePeriodArr": uniquePeriods,
			"previousUniquePeriodArr": previousUniquePeriods,
		}

		return periodObj;
	}
	
	function showTooltip(x, y, contents) {			
		var tooltip = '<div id="graph-tooltip">' + contents + '</div>';
		
		$("#content").append("<div id='tooltip-calc'>" + tooltip + "</div>");
		var widthVal= $("#graph-tooltip").outerWidth();
		$("#tooltip-calc").remove();
		
		var newLeft = (x - (widthVal / 2)),
			xReach = (x + (widthVal / 2));
			
		if (xReach > $(window).width()) {
			newLeft = (x - widthVal);
		} else if (xReach < 340) {
			newLeft = x;
		}
		
		$(tooltip).css( {
			top: y,
			left: newLeft
		}).appendTo("body").fadeIn(200);
	}

}(window.countlyCommon = window.countlyCommon || {}, jQuery));
