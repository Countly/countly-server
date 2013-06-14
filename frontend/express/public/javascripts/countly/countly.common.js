(function (countlyCommon, $, undefined) {

    // Private Properties
    var _period = (store.get("countly_date")) ? store.get("countly_date") : "30days";

    // Public Properties
    countlyCommon.ACTIVE_APP_KEY = 0;
    countlyCommon.ACTIVE_APP_ID = 0;
    countlyCommon.BROWSER_LANG = jQuery.i18n.browserLang();
    countlyCommon.BROWSER_LANG_SHORT = jQuery.i18n.browserLang().split("-")[0];
    countlyCommon.HELP_MAP = {};
    countlyCommon.periodObj = getPeriodObj();

    if (store.get("countly_active_app")) {
        if (countlyGlobal['apps'][store.get("countly_active_app")]) {
            countlyCommon.ACTIVE_APP_KEY = countlyGlobal['apps'][store.get("countly_active_app")].key;
            countlyCommon.ACTIVE_APP_ID = store.get("countly_active_app");
        }
    }

    if (store.get("countly_lang")) {
        var lang = store.get("countly_lang");
        countlyCommon.BROWSER_LANG_SHORT = lang;
        countlyCommon.BROWSER_LANG = lang;
    }

    // Public Methods

    countlyCommon.setPeriod = function (period) {
        _period = period;
        countlyCommon.periodObj = getPeriodObj();
        store.set("countly_date", period);
    };

    countlyCommon.getPeriod = function () {
        return _period;
    };

    countlyCommon.setActiveApp = function (appId) {
        countlyCommon.ACTIVE_APP_KEY = countlyGlobal['apps'][appId].key;
        countlyCommon.ACTIVE_APP_ID = appId;
        store.set("countly_active_app", appId);
    };

    // Calculates the percent change between previous and current values.
    // Returns an object in the following format {"percent": "20%", "trend": "u"}
    countlyCommon.getPercentChange = function (previous, current) {
        var pChange = 0,
            trend = "";

        if (previous == 0) {
            pChange = "NA";
            trend = "u"; //upward
        } else if (current == 0) {
            pChange = "∞";
            trend = "d"; //downward
        } else {
            pChange = countlyCommon.getShortNumber((((current - previous) / current) * 100).toFixed(1)) + "%";
            if (previous > current) {
                trend = "d";
            } else {
                trend = "u";
            }
        }

        return {"percent":pChange, "trend":trend};
    };

    // Fetches nested property values from an obj.
    countlyCommon.getDescendantProp = function (obj, desc) {
        desc = String(desc);

        if (desc.indexOf(".") === -1) {
            return obj[desc];
        }

        var arr = desc.split(".");
        while (arr.length && (obj = obj[arr.shift()]));

        return obj;
    };

    // Draws a graph with the given dataPoints to container. Used for drawing bar and pie charts.
    countlyCommon.drawGraph = function (dataPoints, container, graphType, inGraphProperties) {

        var graphProperties = {
            series:{
                lines:{ show:true, fill:true },
                points:{ show:true }
            },
            grid:{ hoverable:true, borderColor:"null", color:"#999", borderWidth:0, minBorderMargin:10},
            xaxis:{ minTickSize:1, tickDecimals:"number", tickLength:0},
            yaxis:{ min:0, minTickSize:1, tickDecimals:"number" },
            legend:{ backgroundOpacity:0, margin:[5, -19] },
            colors:countlyCommon.GRAPH_COLORS
        };

        switch (graphType) {
            case "line":
                graphProperties.series = {lines:{ show:true, fill:true }, points:{ show:true }};
                break;
            case "bar":
                if (dataPoints.ticks.length > 20) {
                    graphProperties.xaxis.rotateTicks = 45;
                }

                graphProperties.series = {stack:true, bars:{ show:true, align:"center", barWidth:0.6, tickLength:0 }};
                graphProperties.xaxis.ticks = dataPoints.ticks;
                break;
            case "pie":
                graphProperties.series = { pie:{
                    show:true,
                    lineWidth:0,
                    radius:115,
                    combine:{
                        color:'#999',
                        threshold:0.05
                    },
                    label:{
                        show:true,
                        radius:160
                    }
                }};
                graphProperties.legend.show = false;
                break;
            default:
                break;
        }

        if (inGraphProperties) {
            $.extend(true, graphProperties, inGraphProperties);
        }

        $.plot($(container), dataPoints.dp, graphProperties);

        if (graphType == "bar" && !graphProperties.series.stack) {
            var previousBar;

            $(container).bind("plothover", function (event, pos, item) {
                if (item) {
                    var x = item.datapoint[0].toFixed(1).replace(".0", ""),
                        y = item.datapoint[1].toFixed(1).replace(".0", "");

                    if (previousBar != y) {
                        $("#graph-tooltip").remove();
                        showTooltip(item.pageX, item.pageY - 40, y);
                        previousBar = y;
                    }
                } else {
                    $("#graph-tooltip").remove();
                    previousBar = null;
                }
            });
        } else {
            $(container).unbind("plothover");
        }
    };

    // Draws a line graph with the given dataPoints to container.
    countlyCommon.drawTimeGraph = function (dataPoints, container, hideTicks, graphProperties) {

        timeGraphData = dataPoints[0].data;

        var now = moment(),
            year = now.year(),
            month = (now.month() + 1);

        if (!graphProperties) {
            graphProperties = {
                series:{
                    lines:{ stack:false, show:true, fill:true, lineWidth:2, fillColor:{ colors:[
                        { opacity:0 },
                        { opacity:0.15 }
                    ] }, shadowSize:0 },
                    points:{ show:true, radius:4, shadowSize:0 },
                    shadowSize:0
                },
                grid:{ hoverable:!hideTicks, borderColor:"null", color:"#BDBDBD", borderWidth:0, minBorderMargin:10, labelMargin:10},
                xaxis:{ min:1, max:31, tickDecimals:"number", tickSize:0, tickLength:0 },
                yaxis:{ min:0, minTickSize:1, tickDecimals:"number", ticks:3 },
                legend:{ show:false, margin:[-25, -44], noColumns:3, backgroundOpacity:0 },
                colors:countlyCommon.GRAPH_COLORS
            };
        }

        graphProperties.series.points.show = (dataPoints[0].data.length <= 90);

        var graphTicks = [];

        switch (_period) {
            case "month":
                graphProperties.xaxis.max = null;
                graphProperties.xaxis.min = null;
                var monthTicks = [];

                monthTicks[0] = [0, ""];

                for (var i = 0; i < 12; i++) {
                    monthTicks[monthTicks.length] = [(i + 1), moment.monthsShort[i]];
                    graphTicks[i + 1] = [moment.monthsShort[i]];
                }

                for (var i = 0; i < dataPoints.length; i++) {
                    var tmpData = [
                        [0.9, null]
                    ];
                    dataPoints[i].data = tmpData.concat(dataPoints[i].data);
                    dataPoints[i].data[dataPoints[i].data.length] = [(dataPoints[i].data.length - 0.9), null];
                }

                monthTicks[dataPoints[0].data.length - 1] = [dataPoints[0].data.length, ""];

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

                    graphTicks[i + 1] = [monthStartDay + " " + monthStartMonth];
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
                for (var i = 0; i < 24; i++) {
                    if (i != 0 && i != 23 && i % 3 == 0) {
                        hourTicks[hourTicks.length] = [i, i + ":00"];
                    }

                    graphTicks[i] = [i + ":00"];
                }
                graphProperties.xaxis.max = 23;
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
            // One day is selected from the datepicker
            if (_period[0] == _period[1]) {
                var hourTicks = [];
                for (var i = 0; i < 25; i++) {
                    if (i != 0 && i != 24 && i % 3 == 0) {
                        hourTicks[hourTicks.length] = [i, i + ":00"];
                    }

                    graphTicks[i] = [i + ":00"];
                }
                graphProperties.xaxis.max = 23;
                graphProperties.xaxis.ticks = hourTicks;
                graphProperties.xaxis.min = 0;
            } else {
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
        }

        var graphObj = $.plot($(container), dataPoints, graphProperties),
            keyEventCounter = "A",
            keyEvents = [],
            keyEventsIndex = 0;

        for (var k = 0; k < graphObj.getData().length; k++) {

            var tmpMax = 0,
                tmpMaxIndex = 0,
                tmpMin = 999999999999,
                tmpMinIndex = 0,
                label = (graphObj.getData()[k].label).toLowerCase();

            if (graphObj.getData()[k].mode === "ghost") {
                keyEventsIndex += graphObj.getData()[k].data.length;
                continue;
            }

            $.each(graphObj.getData()[k].data, function (i, el) {

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
                data:[tmpMinIndex, tmpMin],
                code:keyEventCounter,
                color:graphObj.getData()[k].color,
                event:"min",
                desc:jQuery.i18n.prop('common.graph-min', tmpMin, label, graphTicks[tmpMinIndex])
            };
            keyEventCounter = String.fromCharCode(keyEventCounter.charCodeAt() + 1);

            keyEvents[k][keyEvents[k].length] = {
                data:[tmpMaxIndex, tmpMax],
                code:keyEventCounter,
                color:graphObj.getData()[k].color,
                event:"max",
                desc:jQuery.i18n.prop('common.graph-max', tmpMax, label, graphTicks[tmpMaxIndex])
            };
            keyEventCounter = String.fromCharCode(keyEventCounter.charCodeAt() + 1);
        }

        var graphWidth = graphObj.width();

        for (var k = 0; k < keyEvents.length; k++) {
            var bgColor = graphObj.getData()[k].color;

            if (!keyEvents[k]) {
                continue;
            }

            for (var l = 0; l < keyEvents[k].length; l++) {

                var o = graphObj.pointOffset({x:keyEvents[k][l]["data"][0], y:keyEvents[k][l]["data"][1]});

                if (o.left <= 15) {
                    o.left = 15;
                }

                if (o.left >= (graphWidth - 15)) {
                    o.left = (graphWidth - 15);
                }

                if (!hideTicks) {
                    var keyEventLabel = $('<div class="graph-key-event-label">').text(keyEvents[k][l]["code"]);

                    keyEventLabel.attr({
                        "title":keyEvents[k][l]["desc"],
                        "data-points":"[" + keyEvents[k][l]["data"] + "]"
                    }).css({
                            "position":'absolute',
                            "left":o.left,
                            "top":o.top - 33,
                            "display":'none',
                            "background-color":bgColor
                        }).appendTo(graphObj.getPlaceholder()).show();

                    $(".tipsy").remove();
                    keyEventLabel.tipsy({gravity:$.fn.tipsy.autoWE, offset:3, html:true});
                }
            }
        }

        var previousPoint;

        $(container).bind("plothover", function (event, pos, item) {
            if (item) {
                if (previousPoint != item.dataIndex) {
                    previousPoint = item.dataIndex;

                    $("#graph-tooltip").remove();
                    var x = item.datapoint[0].toFixed(1).replace(".0", ""),
                        y = item.datapoint[1].toFixed(1).replace(".0", "");

                    showTooltip(item.pageX, item.pageY - 40, y + " " + item.series.label);
                }
            } else {
                $("#graph-tooltip").remove();
                previousPoint = null;
            }
        });

        return keyEvents;
    };

    countlyCommon.extractRangeData = function (db, propertyName, rangeArray, explainRange) {

        countlyCommon.periodObj = getPeriodObj();

        var dataArr = [],
            dataArrCounter = 0,
            rangeTotal,
            total = 0;

        if (!rangeArray) {
            return dataArr;
        }

        for (var j = 0; j < rangeArray.length; j++) {

            rangeTotal = 0;

            if (!countlyCommon.periodObj.isSpecialPeriod) {
                var tmp_x = countlyCommon.getDescendantProp(db, countlyCommon.periodObj.activePeriod + "." + propertyName);

                if (tmp_x && tmp_x[rangeArray[j]]) {
                    rangeTotal += tmp_x[rangeArray[j]];
                }

                if (rangeTotal != 0) {
                    dataArr[dataArrCounter] = {};
                    dataArr[dataArrCounter][propertyName] = (explainRange) ? explainRange(rangeArray[j]) : rangeArray[j];
                    dataArr[dataArrCounter]["t"] = rangeTotal;

                    total += rangeTotal;
                    dataArrCounter++;
                }
            } else {
                var tmpRangeTotal = 0;

                for (var i = 0; i < (countlyCommon.periodObj.uniquePeriodArr.length); i++) {
                    var tmp_x = countlyCommon.getDescendantProp(db, countlyCommon.periodObj.uniquePeriodArr[i] + "." + propertyName);

                    if (tmp_x && tmp_x[rangeArray[j]]) {
                        rangeTotal += tmp_x[rangeArray[j]];
                    }
                }

                for (var i = 0; i < (countlyCommon.periodObj.uniquePeriodCheckArr.length); i++) {
                    var tmp_x = countlyCommon.getDescendantProp(db, countlyCommon.periodObj.uniquePeriodCheckArr[i] + "." + propertyName);

                    if (tmp_x && tmp_x[rangeArray[j]]) {
                        tmpRangeTotal += tmp_x[rangeArray[j]];
                    }
                }

                if (rangeTotal > tmpRangeTotal) {
                    rangeTotal = tmpRangeTotal;
                }

                if (rangeTotal != 0) {
                    dataArr[dataArrCounter] = {};
                    dataArr[dataArrCounter][propertyName] = (explainRange) ? explainRange(rangeArray[j]) : rangeArray[j];
                    dataArr[dataArrCounter]["t"] = rangeTotal;

                    total += rangeTotal;
                    dataArrCounter++;
                }
            }
        }

        for (var j = 0; j < dataArr.length; j++) {
            dataArr[j].percent = ((dataArr[j]["t"] / total) * 100).toFixed(1);
        }

        dataArr.sort(function (a, b) {
            return -(a["t"] - b["t"]);
        });

        return dataArr;
    };

    countlyCommon.extractChartData = function (db, clearFunction, chartData, dataProperties) {

        countlyCommon.periodObj = getPeriodObj();

        var periodMin = countlyCommon.periodObj.periodMin,
            periodMax = (countlyCommon.periodObj.periodMax + 1),
            dataObj = {},
            formattedDate = "",
            tableData = [],
            propertyNames = _.pluck(dataProperties, "name"),
            propertyFunctions = _.pluck(dataProperties, "func"),
            currOrPrevious = _.pluck(dataProperties, "period"),
            activeDate,
            activeDateArr;

        for (var j = 0; j < propertyNames.length; j++) {
            if (currOrPrevious[j] === "previous") {
                if (countlyCommon.periodObj.isSpecialPeriod) {
                    periodMin = 0;
                    periodMax = countlyCommon.periodObj.previousPeriodArr.length;
                    activeDateArr = countlyCommon.periodObj.previousPeriodArr;
                } else {
                    activeDate = countlyCommon.periodObj.previousPeriod;
                }
            } else {
                if (countlyCommon.periodObj.isSpecialPeriod) {
                    periodMin = 0;
                    periodMax = countlyCommon.periodObj.currentPeriodArr.length;
                    activeDateArr = countlyCommon.periodObj.currentPeriodArr;
                } else {
                    activeDate = countlyCommon.periodObj.activePeriod;
                }
            }

            for (var i = periodMin; i < periodMax; i++) {

                if (!countlyCommon.periodObj.isSpecialPeriod) {

                    if (countlyCommon.periodObj.periodMin == 0) {
                        formattedDate = moment((activeDate + " " + i + ":00:00").replace(/\./g, "/"));
                    } else if (("" + activeDate).indexOf(".") == -1) {
                        formattedDate = moment((activeDate + "/" + i + "/1").replace(/\./g, "/"));
                    } else {
                        formattedDate = moment((activeDate + "/" + i).replace(/\./g, "/"));
                    }

                    dataObj = countlyCommon.getDescendantProp(db, activeDate + "." + i);
                } else {
                    formattedDate = moment((activeDateArr[i]).replace(/\./g, "/"));
                    dataObj = countlyCommon.getDescendantProp(db, activeDateArr[i]);
                }

                dataObj = clearFunction(dataObj);

                if (!tableData[i]) {
                    tableData[i] = {};
                }

                tableData[i]["date"] = formattedDate.format(countlyCommon.periodObj.dateString);

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
            var chartVals = _.reject(flatChartData, function (context, value, index, list) {
                return value % 2 == 0;
            });
            var chartIndexes = _.filter(flatChartData, function (context, value, index, list) {
                return value % 2 == 0;
            });

            keyEvents[k] = {};
            keyEvents[k].min = _.min(chartVals);
            keyEvents[k].max = _.max(chartVals);
        }

        return {"chartDP":chartData, "chartData":_.compact(tableData), "keyEvents":keyEvents};
    };

    countlyCommon.extractTwoLevelData = function (db, rangeArray, clearFunction, dataProperties) {

        countlyCommon.periodObj = getPeriodObj();

        if (!rangeArray) {
            return {"chartData":tableData};
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

                if (propertyNames.indexOf("u") !== -1 && Object.keys(tmpPropertyObj).length) {
                    var tmpUniqVal = 0,
                        tmpUniqValCheck = 0,
                        tmpCheckVal = 0;

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
                            tmpUniqVal += propertyValue;
                            tmpPropertyObj["u"] += propertyValue;
                        }
                    }

                    for (var l = 0; l < (countlyCommon.periodObj.uniquePeriodCheckArr.length); l++) {
                        tmp_x = countlyCommon.getDescendantProp(db, countlyCommon.periodObj.uniquePeriodCheckArr[l] + "." + rangeArray[j]);
                        if (!tmp_x) {
                            continue;
                        }
                        tmp_x = clearFunction(tmp_x);
                        tmpCheckVal = tmp_x["u"];

                        if (typeof tmpCheckVal !== 'string') {
                            propertySum += tmpCheckVal;
                            tmpUniqValCheck += tmpCheckVal;
                            tmpPropertyObj["u"] += tmpCheckVal;
                        }
                    }

                    if (tmpUniqVal > tmpUniqValCheck) {
                        tmpPropertyObj["u"] = tmpUniqValCheck;
                    }
                }

                //if (propertySum > 0)
                {
                    tableData[tableCounter] = {};
                    tableData[tableCounter] = tmpPropertyObj;
                    tableCounter++;
                }
            }
        }

        if (propertyNames.indexOf("u") !== -1) {
            tableData = _.sortBy(tableData, function (obj) {
                return -obj["u"];
            });
        } else if (propertyNames.indexOf("t") !== -1) {
            tableData = _.sortBy(tableData, function (obj) {
                return -obj["t"];
            });
        } else if (propertyNames.indexOf("c") !== -1) {
            tableData = _.sortBy(tableData, function (obj) {
                return -obj["c"];
            });
        }

        for (var i = 0; i < tableData.length; i++) {
            if (_.isEmpty(tableData[i])) {
                tableData[i] = null;
            }
        }

        return {"chartData":_.compact(tableData)};
    };

    // Extracts top three items (from rangeArray) that have the biggest total session counts from the db object.
    countlyCommon.extractBarData = function (db, rangeArray, clearFunction) {

        var rangeData = countlyCommon.extractTwoLevelData(db, rangeArray, clearFunction, [
            {
                name:"range",
                func:function (rangeArr, dataObj) {
                    return rangeArr;
                }
            },
            { "name":"t" }
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

        if (rangeNames.length < maxItems) {
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

            barData[i] = { "name":rangeNames[i], "percent":percent };
        }

        return barData;
    };

    // Shortens the given number by adding K (thousand) or M (million) postfix.
    // K is added only if the number is bigger than 10000.
    countlyCommon.getShortNumber = function (number) {

        var tmpNumber = "";

        if (number >= 1000000 || number <= -1000000) {
            tmpNumber = ((number / 1000000).toFixed(1).replace(".0", "")) + "M";
        } else if (number >= 10000 || number <= -10000) {
            tmpNumber = ((number / 1000).toFixed(1).replace(".0", "")) + "K";
        } else {
            number += "";
            tmpNumber = number.replace(".0", "");
        }

        return tmpNumber;
    };

    // Function for getting the date range shown on the dashboard like 1 Aug - 30 Aug.
    // countlyCommon.periodObj holds a dateString property which holds the date format.
    countlyCommon.getDateRange = function () {

        countlyCommon.periodObj = getPeriodObj();

        if (!countlyCommon.periodObj.isSpecialPeriod) {
            if (countlyCommon.periodObj.dateString == "HH:mm") {
                formattedDateStart = moment(countlyCommon.periodObj.activePeriod + " " + countlyCommon.periodObj.periodMin + ":00", "YYYY.M.D HH:mm");
                formattedDateEnd = moment(countlyCommon.periodObj.activePeriod + " " + countlyCommon.periodObj.periodMax + ":00", "YYYY.M.D HH:mm");

                var nowMin = moment().format("mm");
                formattedDateEnd.add("minutes", nowMin);

            } else if (countlyCommon.periodObj.dateString == "D MMM, HH:mm") {
                formattedDateStart = moment(countlyCommon.periodObj.activePeriod, "YYYY.M.D");
                formattedDateEnd = moment(countlyCommon.periodObj.activePeriod, "YYYY.M.D").add("hours", 23).add("minutes", 59);
            } else {
                formattedDateStart = moment(countlyCommon.periodObj.activePeriod + "." + countlyCommon.periodObj.periodMin, "YYYY.M.D");
                formattedDateEnd = moment(countlyCommon.periodObj.activePeriod + "." + countlyCommon.periodObj.periodMax, "YYYY.M.D");
            }
        } else {
            formattedDateStart = moment(countlyCommon.periodObj.currentPeriodArr[0], "YYYY.M.D");
            formattedDateEnd = moment(countlyCommon.periodObj.currentPeriodArr[(countlyCommon.periodObj.currentPeriodArr.length - 1)], "YYYY.M.D");
        }

        return formattedDateStart.format(countlyCommon.periodObj.dateString) + " - " + formattedDateEnd.format(countlyCommon.periodObj.dateString);
    };

    // Function for merging updateObj object to dbObj.
    // Used for merging the received data for today to the existing data while updating the dashboard.
    countlyCommon.extendDbObj = function (dbObj, updateObj) {
        var now = moment(),
            year = now.year(),
            month = (now.month() + 1),
            day = now.date(),
            weekly = Math.ceil(now.format("DDD") / 7),
            intRegex = /^\d+$/,
            tmpUpdateObj = {},
            tmpOldObj = {};

        if (updateObj[year] && updateObj[year][month] && updateObj[year][month][day]) {
            if (!dbObj[year]) {
                dbObj[year] = {};
            }
            if (!dbObj[year][month]) {
                dbObj[year][month] = {};
            }
            if (!dbObj[year][month][day]) {
                dbObj[year][month][day] = {};
            }
            if (!dbObj[year]["w" + weekly]) {
                dbObj[year]["w" + weekly] = {};
            }

            tmpUpdateObj = updateObj[year][month][day];
            tmpOldObj = dbObj[year][month][day];

            dbObj[year][month][day] = updateObj[year][month][day];
        }

        if (updateObj["meta"]) {
            if (!dbObj["meta"]) {
                dbObj["meta"] = {};
            }

            dbObj["meta"] = updateObj["meta"];
        }

        for (var level1 in tmpUpdateObj) {
            if (!tmpUpdateObj.hasOwnProperty(level1)) {
                continue;
            }

            if (intRegex.test(level1)) {
                continue;
            }

            if (_.isObject(tmpUpdateObj[level1])) {
                if (!dbObj[year][level1]) {
                    dbObj[year][level1] = {};
                }

                if (!dbObj[year][month][level1]) {
                    dbObj[year][month][level1] = {};
                }

                if (!dbObj[year]["w" + weekly][level1]) {
                    dbObj[year]["w" + weekly][level1] = {};
                }
            } else {
                if (dbObj[year][level1]) {
                    if (tmpOldObj[level1]) {
                        dbObj[year][level1] += (tmpUpdateObj[level1] - tmpOldObj[level1]);
                    } else {
                        dbObj[year][level1] += tmpUpdateObj[level1];
                    }
                } else {
                    dbObj[year][level1] = tmpUpdateObj[level1];
                }

                if (dbObj[year][month][level1]) {
                    if (tmpOldObj[level1]) {
                        dbObj[year][month][level1] += (tmpUpdateObj[level1] - tmpOldObj[level1]);
                    } else {
                        dbObj[year][month][level1] += tmpUpdateObj[level1];
                    }
                } else {
                    dbObj[year][month][level1] = tmpUpdateObj[level1];
                }

                if (dbObj[year]["w" + weekly][level1]) {
                    if (tmpOldObj[level1]) {
                        dbObj[year]["w" + weekly][level1] += (tmpUpdateObj[level1] - tmpOldObj[level1]);
                    } else {
                        dbObj[year]["w" + weekly][level1] += tmpUpdateObj[level1];
                    }
                } else {
                    dbObj[year]["w" + weekly][level1] = tmpUpdateObj[level1];
                }
            }

            if (tmpUpdateObj[level1]) {
                for (var level2 in tmpUpdateObj[level1]) {
                    if (!tmpUpdateObj[level1].hasOwnProperty(level2)) {
                        continue;
                    }

                    if (dbObj[year][level1][level2]) {
                        if (tmpOldObj[level1] && tmpOldObj[level1][level2]) {
                            dbObj[year][level1][level2] += (tmpUpdateObj[level1][level2] - tmpOldObj[level1][level2]);
                        } else {
                            dbObj[year][level1][level2] += tmpUpdateObj[level1][level2];
                        }
                    } else {
                        dbObj[year][level1][level2] = tmpUpdateObj[level1][level2];
                    }

                    if (dbObj[year][month][level1][level2]) {
                        if (tmpOldObj[level1] && tmpOldObj[level1][level2]) {
                            dbObj[year][month][level1][level2] += (tmpUpdateObj[level1][level2] - tmpOldObj[level1][level2]);
                        } else {
                            dbObj[year][month][level1][level2] += tmpUpdateObj[level1][level2];
                        }
                    } else {
                        dbObj[year][month][level1][level2] = tmpUpdateObj[level1][level2];
                    }

                    if (dbObj[year]["w" + weekly][level1][level2]) {
                        if (tmpOldObj[level1] && tmpOldObj[level1][level2]) {
                            dbObj[year]["w" + weekly][level1][level2] += (tmpUpdateObj[level1][level2] - tmpOldObj[level1][level2]);
                        } else {
                            dbObj[year]["w" + weekly][level1][level2] += tmpUpdateObj[level1][level2];
                        }
                    } else {
                        dbObj[year]["w" + weekly][level1][level2] = tmpUpdateObj[level1][level2];
                    }
                }
            }
        }

        // Fix update of total user count

        if (updateObj[year]) {
            if (updateObj[year]["u"]) {
                if (!dbObj[year]) {
                    dbObj[year] = {};
                }

                dbObj[year]["u"] = updateObj[year]["u"];
            }

            if (updateObj[year][month] && updateObj[year][month]["u"]) {
                if (!dbObj[year]) {
                    dbObj[year] = {};
                }

                if (!dbObj[year][month]) {
                    dbObj[year][month] = {};
                }

                dbObj[year][month]["u"] = updateObj[year][month]["u"];
            }

            if (updateObj[year]["w" + weekly] && updateObj[year]["w" + weekly]["u"]) {
                if (!dbObj[year]) {
                    dbObj[year] = {};
                }

                if (!dbObj[year]["w" + weekly]) {
                    dbObj[year]["w" + weekly] = {};
                }

                dbObj[year]["w" + weekly]["u"] = updateObj[year]["w" + weekly]["u"];
            }
        }
    };

    // Private Methods

    function getDaysInMonth(year, month) {
        return new Date(year, month, 0).getDate();
    }

    // Returns a period object used by all time related data calculation functions.
    function getPeriodObj() {

        var now = moment(),
            year = now.year(),
            month = (now.month() + 1),
            day = now.date(),
            hour = (now.hours()),
            activePeriod,
            previousPeriod,
            periodMax,
            periodMin,
            periodObj = {},
            isSpecialPeriod = false,
            daysInPeriod = 0,
            rangeEndDay = null,
            dateString,
            uniquePeriodsCheck = [],
            previousUniquePeriodsCheck = [];

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
                dateString = "D MMM";
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

        // Check whether period object is array
        if (Object.prototype.toString.call(_period) === '[object Array]' && _period.length == 2) {

            // One day is selected from the datepicker
            if (_period[0] == _period[1]) {
                var selectedDate = moment(_period[0]),
                    selectedYear = selectedDate.year(),
                    selectedMonth = (selectedDate.month() + 1),
                    selectedDay = selectedDate.date(),
                    selectedHour = (selectedDate.hours());

                activePeriod = selectedYear + "." + selectedMonth + "." + selectedDay;

                var previousDate = selectedDate.subtract('days', 1),
                    previousYear = previousDate.year(),
                    previousMonth = (previousDate.month() + 1),
                    previousDay = previousDate.date();

                previousPeriod = previousYear + "." + previousMonth + "." + previousDay;
                periodMax = 23;
                periodMin = 0;
                dateString = "D MMM, HH:mm";
            } else {
                var a = moment(_period[0]),
                    b = moment(_period[1]);

                daysInPeriod = b.diff(a, 'days') + 1;
                rangeEndDay = _period[1];
            }
        }

        if (daysInPeriod != 0) {
            var yearChanged = false,
                currentYear = 0,
                currWeeksArr = [],
                currWeekCounts = {},
                currMonthsArr = [],
                currMonthCounts = {},
                currPeriodArr = [],
                prevWeeksArr = [],
                prevWeekCounts = {},
                prevMonthsArr = [],
                prevMonthCounts = {},
                prevPeriodArr = [];

            for (var i = (daysInPeriod - 1); i > -1; i--) {
                var currIndex = (!rangeEndDay) ? moment().subtract('days', i) : moment(rangeEndDay).subtract('days', i),
                    currIndexYear = currIndex.year(),
                    prevIndex = (!rangeEndDay) ? moment().subtract('days', (daysInPeriod + i)) : moment(rangeEndDay).subtract('days', (daysInPeriod + i)),
                    prevYear = prevIndex.year();

                if (i != (daysInPeriod - 1) && currentYear != currIndexYear) {
                    yearChanged = true;
                }
                currentYear = currIndexYear;

                // Current period variables

                var currWeek = currentYear + "." + "w" + Math.ceil(currIndex.format("DDD") / 7);
                currWeeksArr[currWeeksArr.length] = currWeek;
                currWeekCounts[currWeek] = (currWeekCounts[currWeek]) ? (currWeekCounts[currWeek] + 1) : 1;

                var currMonth = currIndex.format("YYYY.M");
                currMonthsArr[currMonthsArr.length] = currMonth;
                currMonthCounts[currMonth] = (currMonthCounts[currMonth]) ? (currMonthCounts[currMonth] + 1) : 1;

                currPeriodArr[currPeriodArr.length] = currIndex.format("YYYY.M.D");

                // Previous period variables

                var prevWeek = prevYear + "." + "w" + Math.ceil(prevIndex.format("DDD") / 7);
                prevWeeksArr[prevWeeksArr.length] = prevWeek;
                prevWeekCounts[prevWeek] = (prevWeekCounts[prevWeek]) ? (prevWeekCounts[prevWeek] + 1) : 1;

                var prevMonth = prevIndex.format("YYYY.M");
                prevMonthsArr[prevMonthsArr.length] = prevMonth;
                prevMonthCounts[prevMonth] = (prevMonthCounts[prevMonth]) ? (prevMonthCounts[prevMonth] + 1) : 1;

                prevPeriodArr[prevPeriodArr.length] = prevIndex.format("YYYY.M.D");
            }

            dateString = (yearChanged) ? "D MMM, YYYY" : "D MMM";
            isSpecialPeriod = true;
        }

        periodObj = {
            "activePeriod":activePeriod,
            "periodMax":periodMax,
            "periodMin":periodMin,
            "previousPeriod":previousPeriod,
            "currentPeriodArr":currPeriodArr,
            "previousPeriodArr":prevPeriodArr,
            "isSpecialPeriod":isSpecialPeriod,
            "dateString":dateString,
            "daysInPeriod":daysInPeriod,
            "uniquePeriodArr":getUniqArray(currWeeksArr, currWeekCounts, currMonthsArr, currMonthCounts, currPeriodArr),
            "uniquePeriodCheckArr":getUniqCheckArray(currWeeksArr, currWeekCounts, currMonthsArr, currMonthCounts),
            "previousUniquePeriodArr":getUniqArray(prevWeeksArr, prevWeekCounts, prevMonthsArr, prevMonthCounts, prevPeriodArr),
            "previousUniquePeriodCheckArr":getUniqCheckArray(prevWeeksArr, prevWeekCounts, prevMonthsArr, prevMonthCounts)
        };

        return periodObj;
    }

    function getUniqArray(weeksArray, weekCounts, monthsArray, monthCounts, periodArr) {

        if (_period == "month" || _period == "day" || _period == "hour") {
            return [];
        }

        if (Object.prototype.toString.call(_period) === '[object Array]' && _period.length == 2) {
            if (_period[0] == _period[1]) {
                return [];
            }
        }

        var weeksArray = clone(weeksArray),
            weekCounts = clone(weekCounts),
            monthsArray = clone(monthsArray),
            monthCounts = clone(monthCounts),
            periodArr = clone(periodArr);

        var uniquePeriods = [],
            tmpDaysInMonth = -1,
            tmpPrevKey = -1,
            rejectedWeeks = [],
            rejectedWeekDayCounts = {};

        for (var key in weekCounts) {

            // If this is the current week we can use it
            if (key === moment().format("YYYY.\\w w").replace(" ", "")) {
                continue;
            }

            if (weekCounts[key] < 7) {
                for (var i = 0; i < weeksArray.length; i++) {
                    weeksArray[i] = weeksArray[i].replace(key, 0);
                }
            }
        }

        for (var key in monthCounts) {
            if (tmpPrevKey != key) {
                if (moment().format("YYYY.M") === key) {
                    tmpDaysInMonth = moment().format("D");
                } else {
                    tmpDaysInMonth = moment(key, "YYYY.M").daysInMonth();
                }

                tmpPrevKey = key;
            }

            if (monthCounts[key] < tmpDaysInMonth) {
                for (var i = 0; i < monthsArray.length; i++) {
                    monthsArray[i] = monthsArray[i].replace(key, 0);
                }
            }
        }

        for (var i = 0; i < monthsArray.length; i++) {
            if (monthsArray[i] == 0) {
                if (weeksArray[i] == 0 || (rejectedWeeks.indexOf(weeksArray[i]) != -1)) {
                    uniquePeriods[i] = periodArr[i];
                } else {
                    uniquePeriods[i] = weeksArray[i];
                }
            } else {
                rejectedWeeks[rejectedWeeks.length] = weeksArray[i];
                uniquePeriods[i] = monthsArray[i];

                if (rejectedWeekDayCounts[weeksArray[i]]) {
                    rejectedWeekDayCounts[weeksArray[i]].count++;
                } else {
                    rejectedWeekDayCounts[weeksArray[i]] = {
                        count:1,
                        index:i
                    };
                }
            }
        }

        var totalWeekCounts = _.countBy(weeksArray, function (per) {
            return per;
        });

        for (var weekDayCount in rejectedWeekDayCounts) {

            // If the whole week is rejected continue
            if (rejectedWeekDayCounts[weekDayCount].count == 7) {
                continue;
            }

            // If its the current week continue
            if (moment().format("YYYY.\\w w").replace(" ", "") == weekDayCount && totalWeekCounts[weekDayCount] == rejectedWeekDayCounts[weekDayCount].count) {
                continue;
            }

            // If only some part of the week is rejected we should add back daily buckets

            var startIndex = rejectedWeekDayCounts[weekDayCount].index - (totalWeekCounts[weekDayCount] - rejectedWeekDayCounts[weekDayCount].count),
                limit = startIndex + (totalWeekCounts[weekDayCount] - rejectedWeekDayCounts[weekDayCount].count);

            for (var i = startIndex; i < limit; i++) {
                // If there isn't already a monthly bucket for that day
                if (monthsArray[i] == 0) {
                    uniquePeriods[i] = periodArr[i];
                }
            }
        }

        rejectedWeeks = _.uniq(rejectedWeeks);
        uniquePeriods = _.uniq(_.difference(uniquePeriods, rejectedWeeks));

        return uniquePeriods;
    }

    function getUniqCheckArray(weeksArray, weekCounts, monthsArray, monthCounts) {

        if (_period == "month" || _period == "day" || _period == "hour") {
            return [];
        }

        if (Object.prototype.toString.call(_period) === '[object Array]' && _period.length == 2) {
            if (_period[0] == _period[1]) {
                return [];
            }
        }

        var weeksArray = clone(weeksArray),
            weekCounts = clone(weekCounts),
            monthsArray = clone(monthsArray),
            monthCounts = clone(monthCounts);

        var uniquePeriods = [],
            tmpDaysInMonth = -1,
            tmpPrevKey = -1;

        for (var key in weekCounts) {
            if (key === moment().format("YYYY.\\w w").replace(" ", "")) {
                continue;
            }

            if (weekCounts[key] < 1) {
                for (var i = 0; i < weeksArray.length; i++) {
                    weeksArray[i] = weeksArray[i].replace(key, 0);
                }
            }
        }

        for (var key in monthCounts) {
            if (tmpPrevKey != key) {
                if (moment().format("YYYY.M") === key) {
                    tmpDaysInMonth = moment().format("D");
                } else {
                    tmpDaysInMonth = moment(key, "YYYY.M").daysInMonth();
                }

                tmpPrevKey = key;
            }

            if (monthCounts[key] < (tmpDaysInMonth * 0.5)) {
                for (var i = 0; i < monthsArray.length; i++) {
                    monthsArray[i] = monthsArray[i].replace(key, 0);
                }
            }
        }

        for (var i = 0; i < monthsArray.length; i++) {
            if (monthsArray[i] == 0) {
                if (weeksArray[i] == 0) {

                } else {
                    uniquePeriods[i] = weeksArray[i];
                }
            } else {
                uniquePeriods[i] = monthsArray[i];
            }
        }

        uniquePeriods = _.uniq(uniquePeriods);

        return uniquePeriods;
    }

    function clone(obj) {
        if (null == obj || "object" != typeof obj) return obj;

        if (obj instanceof Date) {
            var copy = new Date();
            copy.setTime(obj.getTime());
            return copy;
        }

        if (obj instanceof Array) {
            var copy = [];
            for (var i = 0, len = obj.length; i < len; ++i) {
                copy[i] = clone(obj[i]);
            }
            return copy;
        }

        if (obj instanceof Object) {
            var copy = {};
            for (var attr in obj) {
                if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
            }
            return copy;
        }
    }

    // Function to show the tooltip when any data point in the graph is hovered on.
    function showTooltip(x, y, contents) {
        var tooltip = '<div id="graph-tooltip">' + contents + '</div>';

        $("#content").append("<div id='tooltip-calc'>" + tooltip + "</div>");
        var widthVal = $("#graph-tooltip").outerWidth();
        $("#tooltip-calc").remove();

        var newLeft = (x - (widthVal / 2)),
            xReach = (x + (widthVal / 2));

        if (xReach > $(window).width()) {
            newLeft = (x - widthVal);
        } else if (xReach < 340) {
            newLeft = x;
        }

        $(tooltip).css({
            top:y,
            left:newLeft
        }).appendTo("body").fadeIn(200);
    }

}(window.countlyCommon = window.countlyCommon || {}, jQuery));