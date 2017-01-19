(function (countlyCommon, $, undefined) {

    // Private Properties
    var _period = (store.get("countly_date")) ? store.get("countly_date") : "30days";
    
    countlyCommon.browserLang = function(){
        var lang = navigator.language || navigator.userLanguage;
        if(lang){
            lang = lang.toLowerCase();
            lang.length > 3 && ( lang = lang.substring(0,3) + lang.substring(3).toUpperCase());
        };
        return lang;
    };

    // Public Properties
    countlyCommon.ACTIVE_APP_KEY = 0;
    countlyCommon.ACTIVE_APP_ID = 0;
    countlyCommon.BROWSER_LANG = countlyCommon.browserLang() || "en-US";
    countlyCommon.BROWSER_LANG_SHORT = countlyCommon.BROWSER_LANG.split("-")[0];
    countlyCommon.periodObj = calculatePeriodObj();

    if (store.get("countly_active_app")) {
        if (countlyGlobal['apps'][store.get("countly_active_app")]) {
            countlyCommon.ACTIVE_APP_KEY = countlyGlobal['apps'][store.get("countly_active_app")].key;
            countlyCommon.ACTIVE_APP_ID = store.get("countly_active_app");
        }
    }

    if(countlyGlobal["member"].lang){
        var lang = countlyGlobal["member"].lang;
        store.set("countly_lang", lang);
        countlyCommon.BROWSER_LANG_SHORT = lang;
        countlyCommon.BROWSER_LANG = lang;
    }
    else if (store.get("countly_lang")) {
        var lang = store.get("countly_lang");
        countlyCommon.BROWSER_LANG_SHORT = lang;
        countlyCommon.BROWSER_LANG = lang;
    }

    // Public Methods

    countlyCommon.setPeriod = function (period) {
        _period = period;
        countlyCommon.periodObj = calculatePeriodObj();
        store.set("countly_date", period);
    };

    countlyCommon.getPeriod = function () {
        return _period;
    };

    countlyCommon.getPeriodForAjax = function () {
        if (Object.prototype.toString.call(_period) === '[object Array]'){
            return JSON.stringify(_period);
        } else {
            return _period;
        }
    };

    countlyCommon.setActiveApp = function (appId) {
        countlyCommon.ACTIVE_APP_KEY = countlyGlobal['apps'][appId].key;
        countlyCommon.ACTIVE_APP_ID = appId;
        store.set("countly_active_app", appId);
    };
    
    countlyCommon.encode = function(str){
        return str.replace(/^\$/g, "&#36;").replace(/\./g, '&#46;');
    };
        
    countlyCommon.decode = function(str){
        return str.replace(/^&#36;/g, "$").replace(/^&amp;#36;/g, '$').replace(/&#46;/g, '.').replace(/&amp;#46;/g, '.');
    };

    countlyCommon.decodeHtml = function(html) {
        var txt = document.createElement("textarea");
        txt.innerHTML = html;
        return txt.value;
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
            var change = (((current - previous) / previous) * 100).toFixed(1);
            pChange = countlyCommon.getShortNumber(change) + "%";

            if (change < 0) {
                trend = "d";
            } else {
                trend = "u";
            }
        }

        return {"percent":pChange, "trend":trend};
    };

    // Fetches nested property values from an obj.
    countlyCommon.getDescendantProp = function (obj, path, def) {
        for (var i = 0, path = (path + "").split('.'), len = path.length; i < len; i++) {
            if(!obj || typeof obj !== 'object') return def;
            obj = obj[path[i]];
        }

        if(obj === undefined) return def;
        return obj;
    };

    // Draws a graph with the given dataPoints to container. Used for drawing bar and pie charts.
    countlyCommon.drawGraph = function (dataPoints, container, graphType, inGraphProperties) {
        _.defer(function(){
            if ((!dataPoints.dp || !dataPoints.dp.length) || (graphType == "bar" && dataPoints.dp[0].data[0][1]== null && dataPoints.dp[0].data[1][1] == null)) {
                $(container).hide();
                $(container).siblings(".graph-no-data").show();
                return true;
            } else {
                $(container).show();
                $(container).siblings(".graph-no-data").hide();
            }

            var graphProperties = {
                series:{
                    lines:{ show:true, fill:true },
                    points:{ show:true }
                },
                grid:{ hoverable:true, borderColor:"null", color:"#999", borderWidth:0, minBorderMargin:10},
                xaxis:{ minTickSize:1, tickDecimals:"number", tickLength:0},
                yaxis:{ min:0, minTickSize:1, tickDecimals:"number", position:"right" },
                legend:{ backgroundOpacity:0, margin:[20, -19] },
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

                    var barWidth = 0.6;

                    switch(dataPoints.dp.length) {
                        case 2:
                            barWidth = 0.3;
                            break;
                        case 3:
                            barWidth = 0.2;
                            break;
                    }

                    for (var i = 0; i < dataPoints.dp.length; i++) {
                        dataPoints.dp[i].bars = {
                            order: i,
                            barWidth: barWidth
                        }
                    }

                    graphProperties.series = {stack:true, bars:{ show:true, barWidth:0.6, tickLength:0, fill:1 }};
                    graphProperties.xaxis.ticks = dataPoints.ticks;
                    break;
                case "separate-bar":
                    if (dataPoints.ticks.length > 20) {
                        graphProperties.xaxis.rotateTicks = 45;
                    }
                    graphProperties.series = {bars:{ show:true, align:"center", barWidth:0.6, tickLength:0, fill:1 }};
                    graphProperties.xaxis.ticks = dataPoints.ticks;
                    break;
                case "pie":
                    graphProperties.series = { pie:{
                        show:true,
                        lineWidth:0,
                        radius:115,
                        innerRadius: 0.45,
                        combine:{
                            color:'#CCC',
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

            if (graphType == "bar" || graphType == "separate-bar") {
                $(container).unbind("plothover");
                $(container).bind("plothover", function (event, pos, item) {
                    $("#graph-tooltip").remove();

                    if (item && item.datapoint && item.datapoint[1]) {
                        // For stacked bar chart calculate the diff
                        var yAxisValue = item.datapoint[1].toFixed(1).replace(".0", "") - item.datapoint[2].toFixed(1).replace(".0", "");

                        showTooltip({
                            x: pos.pageX,
                            y: item.pageY,
                            contents: yAxisValue || 0
                        });
                    }
                });
            } else {
                $(container).unbind("plothover");
            }
        }, dataPoints, container, graphType, inGraphProperties);
    };

    // Draws a line graph with the given dataPoints to container.
    countlyCommon.drawTimeGraph = function (dataPoints, container, bucket, overrideBucket) {
        _.defer(function(){
            if (!dataPoints.length) {
                $(container).hide();
                $(container).siblings(".graph-no-data").show();
                return true;
            } else {
                $(container).show();
                $(container).siblings(".graph-no-data").hide();
            }

            // Some data points start with [1, XXX] (should be [0, XXX]) and brakes the new tick logic
            // Below loops converts the old structures to the new one
            if (dataPoints[0].data[0][0] == 1) {
                for (var i = 0; i < dataPoints.length; i++) {
                    for (var j = 0; j < dataPoints[i].data.length; j++) {
                        dataPoints[i].data[j][0] -= 1;
                    }
                }
            }

            var graphProperties = {
                    series:{
                        lines:{ stack:false, show:false, fill:true, lineWidth:2.5, fillColor:{ colors:[
                            { opacity:0 },
                            { opacity:0 }
                        ] }, shadowSize:0 },
                        splines: {
                            show: true,
                            lineWidth: 2.5
                        },
                        points:{ show:true, radius:0, shadowSize:0, lineWidth:2 },
                        shadowSize:0
                    },
                    crosshair: { mode: "x", color: "rgba(78,78,78,0.4)" },
                    grid:{ hoverable:true, borderColor:"null", color:"#666", borderWidth:0, minBorderMargin:10, labelMargin:10},
                    xaxis:{ tickDecimals:"number", tickSize:0, tickLength:0 },
                    yaxis:{ min:0, minTickSize:1, tickDecimals:"number", ticks:3, position:"right" },
                    legend:{ show:false, margin:[-25, -44], noColumns:3, backgroundOpacity:0 },
                    colors:countlyCommon.GRAPH_COLORS
                };

            graphProperties.series.points.show = (dataPoints[0].data.length <= 90);

            if (overrideBucket) {
                graphProperties.series.points.radius = 4;
            }

            var graphTicks = [],
                tickObj = {};

            if (_period == "month" && !bucket) {
                tickObj = countlyCommon.getTickObj("monthly");
            } else {
                tickObj = countlyCommon.getTickObj(bucket, overrideBucket);
            }

            graphProperties.xaxis.max = tickObj.max;
            graphProperties.xaxis.min = tickObj.min;
            graphProperties.xaxis.ticks = tickObj.ticks;

            graphTicks = tickObj.tickTexts;

            var graphObj = $(container).data("plot"),
                keyEventCounter = "A",
                keyEvents = [],
                keyEventsIndex = 0;

            if (graphObj && graphObj.getOptions().series && graphObj.getOptions().series.splines && graphObj.getOptions().series.splines.show) {
                graphObj = $(container).data("plot");

                if (overrideBucket) {
                    graphObj.getOptions().series.points.radius = 4;
                } else {
                    graphObj.getOptions().series.points.radius = 0;
                }

                graphObj.getOptions().xaxes[0].max = tickObj.max;
                graphObj.getOptions().xaxes[0].min = tickObj.min;
                graphObj.getOptions().xaxes[0].ticks = tickObj.ticks;

                graphObj.setData(dataPoints);
                graphObj.setupGrid();
                graphObj.draw();

            } else {
                graphObj = $.plot($(container), dataPoints, graphProperties);
            }

            for (var k = 0; k < graphObj.getData().length; k++) {

                var tmpMax = 0,
                    tmpMaxIndex = 0,
                    tmpMin = 999999999999,
                    tmpMinIndex = 0,
                    label = (graphObj.getData()[k].label + "").toLowerCase();

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

            $(".graph-key-event-label").remove();
            $(".graph-note-label").remove();

            for (var k = 0; k < keyEvents.length; k++) {
                var bgColor = graphObj.getData()[k].color;

                if (!keyEvents[k]) {
                    continue;
                }

                for (var l = 0; l < keyEvents[k].length; l++) {
                    var o = graphObj.pointOffset({x:keyEvents[k][l]["data"][0], y:keyEvents[k][l]["data"][1]});
                    var p = graphObj.pointOffset({x:keyEvents[k][l]["data"][0], y:keyEvents[k][l]["data"][1]});

                    if (o.left <= 15) {
                        o.left = 15;
                    }

                    if (o.left >= (graphWidth - 15)) {
                        o.left = (graphWidth - 15);
                    }

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

            // Add note labels to the graph
            if (!(bucket == "hourly" && dataPoints[0].data.length > 24) && bucket != "weekly") {
                var noteDateIds = countlyCommon.getNoteDateIds(bucket),
                    frontData = graphObj.getData()[graphObj.getData().length - 1],
                    startIndex = (!frontData.data[1] && frontData.data[1] !== 0)? 1 : 0;

                for (var k = 0, l = startIndex; k < frontData.data.length; k++, l++) {
					if(frontData.data[l]){
						var graphPoint = graphObj.pointOffset({x:frontData.data[l][0], y:frontData.data[l][1]});

						if (countlyCommon.getNotesForDateId(noteDateIds[k]).length) {
							var graphNoteLabel = $('<div class="graph-note-label"><div class="fa fa-pencil"></div></div>');
                            graphNoteLabel.attr({
								"title":countlyCommon.getNotesForDateId(noteDateIds[k]),
                                "data-points":"[" + frontData.data[l] + "]"
							}).css({
								"position":'absolute',
								"left":graphPoint.left,
								"top":graphPoint.top - 33,
								"display":'none',
								"border-color":frontData.color
							}).appendTo(graphObj.getPlaceholder()).show();

                            $(".tipsy").remove();
                            graphNoteLabel.tipsy({gravity:$.fn.tipsy.autoWE, offset:3, html:true});
						}
					}
                }
            }

            $(container).on("mouseout", function() {
                graphObj.unlockCrosshair();
                graphObj.clearCrosshair();
                graphObj.unhighlight();
                $("#graph-tooltip").fadeOut(200, function() {
                    $(this).remove();
                });
            });

            function showCrosshairTooltip(dataIndex, position, onPoint) {

                var tooltip = $("#graph-tooltip");
                var crossHairPos = graphObj.p2c(position);
                var tooltipLeft = (crossHairPos.left < 200)? crossHairPos.left + 20 : crossHairPos.left - tooltip.width() - 20;

                tooltip.css({left: tooltipLeft});

                if (onPoint) {
                    var dataSet = graphObj.getData(),
                        tooltipHTML = "<div class='title'>" + tickObj.tickTexts[dataIndex] + "</div>";

                    dataSet = _.sortBy(dataSet, function(obj) { return obj.data[dataIndex][1]; });

                    for (i = dataSet.length - 1; i >= 0; --i) {
                        var series = dataSet[i],
                            formattedValue = series.data[dataIndex][1];

                        // Change label to previous period if there is a ghost graph
                        if (series.mode == "ghost") {
                            series.label = jQuery.i18n.map["common.previous-period"];
                        }

                        if (formattedValue) {
                            formattedValue = parseFloat(formattedValue).toFixed(2).replace(/[.,]00$/, "");
                        }

                        tooltipHTML += "<div class='inner'>";
                        tooltipHTML += "<div class='color' style='background-color: "+ series.color + "'></div>";
                        tooltipHTML += "<div class='series'>" + series.label + "</div>";
                        tooltipHTML += "<div class='value'>" + formattedValue + "</div>";
                        tooltipHTML += "</div>";
                    }

                    if (tooltip.length) {
                        tooltip.html(tooltipHTML);
                    } else {
                        tooltip = $("<div id='graph-tooltip' class='white' style='top:-15px;'>" + tooltipHTML + "</div>");

                        $(container).prepend(tooltip);
                    }

                    if (tooltip.is(":visible")) {
                        tooltip.css({
                            "transition": "left .15s"
                        });
                    } else {
                        tooltip.fadeIn();
                    }
                }
            }

            $(container).unbind("plothover");

            $(container).bind("plothover", function (event, pos, item) {
                graphObj.unlockCrosshair();
                graphObj.unhighlight();

                var i,
                    j,
                    dataset = graphObj.getData(),
                    pointFound = false;

                for (i = 0; i < dataset.length; ++i) {
                    var series = dataset[i];

                    // Find the nearest points, x-wise
                    for (j = 0; j < series.data.length; ++j) {
                        var currX = series.data[j][0],
                            currCrossX = pos.x.toFixed(2);

                        if ((currX - 0.10) < currCrossX && (currX + 0.10) > currCrossX) {

                            graphObj.lockCrosshair({
                                x: series.data[j][0],
                                y: series.data[j][1]
                            });

                            graphObj.highlight(series, j);
                            pointFound = true;
                            break;
                        }
                    }
                }

                showCrosshairTooltip(j, pos, pointFound);
            });
        }, dataPoints, container, bucket);
    };

    countlyCommon.drawGauge = function(targetEl, value, maxValue, gaugeColor, textField) {
        var opts = {
            lines:12,
            angle:0.15,
            lineWidth:0.44,
            pointer:{
                length:0.7,
                strokeWidth:0.05,
                color:'#000000'
            },
            colorStart:gaugeColor,
            colorStop:gaugeColor,
            strokeColor:'#E0E0E0',
            generateGradient:true
        };

        var gauge  = new Gauge($(targetEl)[0]).setOptions(opts);

        if (textField) {
            gauge.setTextField($(textField)[0]);
        }

        gauge.maxValue = maxValue;
        gauge.set(1);
        gauge.set(value);
    };

    countlyCommon.drawHorizontalStackedBars = function(data, intoElement, colorIndex) {
        var processedData = [],
            tmpProcessedData = [],
            totalCount = 0,
            maxToDisplay = 10,
            barHeight = 30;

            for (var i = 0; i < data.length; i++) {
            tmpProcessedData.push({
                label: data[i].label,
                count: data[i].data[0][1],
                index: i
            });

            totalCount += data[i].data[0][1];
        }

        var totalPerc = 0,
            proCount = 0;

        for (var i = 0; i < tmpProcessedData.length; i++) {
            if (i >= maxToDisplay) {
                processedData.push({
                    label: "Other",
                    count: totalCount - proCount,
                    perc:  countlyCommon.round((100 - totalPerc), 2) + "%",
                    index: i
                });

                break;
            }

            var perc = countlyCommon.round((tmpProcessedData[i].count / totalCount) * 100, 2);
            tmpProcessedData[i].perc = perc + "%";
            totalPerc += perc;
            proCount += tmpProcessedData[i].count;

            processedData.push(tmpProcessedData[i]);
        }

        if (processedData.length > 0) {
            var percentSoFar = 0;

            var chart = d3.select(intoElement)
                .attr("width", "100%")
                .attr("height", barHeight);

            var bar = chart.selectAll("g")
                .data(processedData)
                .enter().append("g");

            bar.append("rect")
                .attr("width", function(d) { return ((d.count / totalCount) * 100) + "%"; } )
                .attr("x", function(d) {
                    var myPercent = percentSoFar;
                    percentSoFar = percentSoFar + (100 * (d.count / totalCount));

                    return myPercent + "%";
                })
                .attr("height", barHeight)
                .attr("fill",  function(d) {
                    if (colorIndex || colorIndex === 0) {
                        return countlyCommon.GRAPH_COLORS[colorIndex];
                    } else {
                        return countlyCommon.GRAPH_COLORS[d.index];
                    }
                })
                .attr("stroke", "#FFF")
                .attr("stroke-width", 2);

            if (colorIndex || colorIndex === 0) {
                bar.attr("opacity", function(d) {
                    return 1 - (0.05 * d.index);
                });
            }

            percentSoFar = 0;

            bar.append("foreignObject")
                .attr("width", function(d) { return ((d.count / totalCount) * 100) + "%"; } )
                .attr("height", barHeight)
                .attr("x", function(d) {
                    var myPercent = percentSoFar;
                    percentSoFar = percentSoFar + (100 * (d.count / totalCount));

                    return myPercent + "%";
                })
                .append("xhtml:div")
                .attr("class", "hsb-tip")
                .html(function(d) { return "<div>" + d.perc + "</div>"; });

            percentSoFar = 0;

            bar.append("text")
                .attr("x", function(d) {
                    var myPercent = percentSoFar;
                    percentSoFar = percentSoFar + (100 * (d.count / totalCount));

                    return myPercent + 0.5 + "%";
                })
                .attr("dy", "1.35em")
                .text(function(d) { return d.label; });
        } else {
            var chart = d3.select(intoElement)
                .attr("width", "100%")
                .attr("height", barHeight);

            var bar = chart.selectAll("g")
                .data([{text: jQuery.i18n.map["common.bar.no-data"]}])
                .enter().append("g");

            bar.append("rect")
                .attr("width", "100%" )
                .attr("height", barHeight)
                .attr("fill",  "#FBFBFB")
                .attr("stroke", "#FFF")
                .attr("stroke-width", 2);

            bar.append("foreignObject")
                .attr("width", "100%" )
                .attr("height", barHeight)
                .append("xhtml:div")
                .attr("class", "no-data")
                .html(function(d) { return d.text; });
        }
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

    countlyCommon.extractChartData = function (db, clearFunction, chartData, dataProperties, metric) {
        if(metric)
            metric = "."+metric;
        else
            metric = "";
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
                        formattedDate = moment((activeDate + " " + i + ":00:00").replace(/\./g, "/"), "YYYY/MM/DD HH:mm:ss");
                    } else if (("" + activeDate).indexOf(".") == -1) {
                        formattedDate = moment((activeDate + "/" + i + "/1").replace(/\./g, "/"), "YYYY/MM/DD");
                    } else {
                        formattedDate = moment((activeDate + "/" + i).replace(/\./g, "/"), "YYYY/MM/DD");
                    }

                    dataObj = countlyCommon.getDescendantProp(db, activeDate + "." + i+metric);
                } else {
                    formattedDate = moment((activeDateArr[i]).replace(/\./g, "/"), "YYYY/MM/DD");
                    dataObj = countlyCommon.getDescendantProp(db, activeDateArr[i]+metric);
                }

                dataObj = clearFunction(dataObj);

                if (!tableData[i]) {
                    tableData[i] = {};
                }

                tableData[i]["date"] = countlyCommon.formatDate(formattedDate, countlyCommon.periodObj.dateString);

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

    countlyCommon.extractTwoLevelData = function (db, rangeArray, clearFunction, dataProperties, estOverrideMetric) {

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

            var calculatedObj = (estOverrideMetric)? countlyTotalUsers.get(estOverrideMetric) : {};

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
                    if (countlyTotalUsers.isUsable() && estOverrideMetric && calculatedObj[rangeArray[j]]) {

                        tmpPropertyObj["u"] = calculatedObj[rangeArray[j]];

                    } else {
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

                    // Total users can't be less than new users
                    if (tmpPropertyObj.u < tmpPropertyObj.n) {
                        tmpPropertyObj.u = tmpPropertyObj.n;
                    }

                    // Total users can't be more than total sessions
                    if (tmpPropertyObj.u > tmpPropertyObj.t) {
                        tmpPropertyObj.u = tmpPropertyObj.t;
                    }
                }

                tableData[tableCounter] = {};
                tableData[tableCounter] = tmpPropertyObj;
                tableCounter++;
            }
        }

        if (propertyNames.indexOf("u") !== -1) {
            tableData.sort(function(a,b){
                return b.u - a.u;
            });
        } else if (propertyNames.indexOf("t") !== -1) {
            tableData.sort(function(a,b){
                return b.t - a.t;
            });
        } else if (propertyNames.indexOf("c") !== -1) {
            tableData.sort(function(a,b){
                return b.c - a.c;
            });
        }

        for (var i = 0; i < tableData.length; i++) {
            if (_.isEmpty(tableData[i])) {
                tableData[i] = null;
            }
        }

        return {"chartData":_.compact(tableData)};
    };

    countlyCommon.mergeMetricsByName = function(chartData, metric){
        var uniqueNames = {},
            data;
        for(var i = 0; i < chartData.length; i++){
            data = chartData[i];
            if(data[metric] && !uniqueNames[data[metric]]){
                uniqueNames[data[metric]] = data
            }
            else{
                for(var key in data){
                    if(typeof data[key] == "string")
                       uniqueNames[data[metric]][key] = data[key];
                    else if(typeof data[key] == "number"){
                        if(!uniqueNames[data[metric]][key])
                            uniqueNames[data[metric]][key] = 0;
                        uniqueNames[data[metric]][key] += data[key];
                    }
                }
            }
        }
        return _.values(uniqueNames);
    };

    // Extracts top three items (from rangeArray) that have the biggest total session counts from the db object.
    countlyCommon.extractBarData = function (db, rangeArray, clearFunction, fetchFunction) {
        fetchFunction = fetchFunction || function (rangeArr, dataObj) {return rangeArr;};

        var rangeData = countlyCommon.extractTwoLevelData(db, rangeArray, clearFunction, [
            {
                name:"range",
                func:fetchFunction
            },
            { "name":"t" }
        ]);
        return countlyCommon.calculateBarData(rangeData);
    };
    
    countlyCommon.calculateBarData = function (rangeData) {
        rangeData.chartData = countlyCommon.mergeMetricsByName(rangeData.chartData, "range");
        rangeData.chartData = _.sortBy(rangeData.chartData, function(obj) { return -obj.t; });

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

	countlyCommon.extractUserChartData = function (db, label, sec) {
		var ret = {"data":[],"label":label};
        countlyCommon.periodObj = getPeriodObj();
        var periodMin, periodMax, dateob;
		if(countlyCommon.periodObj.isSpecialPeriod){
			periodMin = 0;
            periodMax = (countlyCommon.periodObj.daysInPeriod);
			var dateob1 = countlyCommon.processPeriod(countlyCommon.periodObj.currentPeriodArr[0].toString());
			var dateob2 = countlyCommon.processPeriod(countlyCommon.periodObj.currentPeriodArr[countlyCommon.periodObj.currentPeriodArr.length-1].toString());
			dateob = {timestart:dateob1.timestart, timeend:dateob2.timeend, range:"d"};
		}
		else{
			periodMin = countlyCommon.periodObj.periodMin;
            periodMax = countlyCommon.periodObj.periodMax+1;
			dateob = countlyCommon.processPeriod(countlyCommon.periodObj.activePeriod.toString());
		}
		var res = [],
			ts;
		//get all timestamps in that period
		for(var i = 0, l = db.length; i < l; i++){
			ts = db[i];
			if(sec)
				ts.ts = ts.ts*1000;
			if(ts.ts > dateob.timestart && ts.ts <= dateob.timeend){
				res.push(ts);
			}
		}
		var lastStart,
			lastEnd = dateob.timestart,
			total,
			ts,
			data = ret.data;
		for(var i = periodMin; i < periodMax; i++){
			total = 0;
			lastStart = lastEnd;
			lastEnd = moment(lastStart).add(moment.duration(1, dateob.range)).valueOf();
			for(var j = 0, l = res.length; j < l; j++){
				ts = res[j];
				if(ts.ts > lastStart && ts.ts <= lastEnd)
					if(ts.c)
						total += ts.c;
					else
						total++;
			}
			data.push([i, total]);
		}
        return ret;
    };

	countlyCommon.processPeriod = function(period){
		var date = period.split(".");
		var range,
			timestart,
			timeend;
		if(date.length == 1){
			range = "M";
			timestart = moment(period, "YYYY").valueOf();
			timeend = moment(period, "YYYY").add(moment.duration(1, "y")).valueOf();
		}
		else if(date.length == 2){
			range = "d";
			timestart = moment(period, "YYYY.MM").valueOf();
			timeend = moment(period, "YYYY.MM").add(moment.duration(1, "M")).valueOf();
		}
		else if(date.length == 3){
			range = "h";
			timestart = moment(period, "YYYY.MM.DD").valueOf();
			timeend = moment(period, "YYYY.MM.DD").add(moment.duration(1, "d")).valueOf();
		}
		return {timestart:timestart, timeend:timeend, range:range};
	}

    // Shortens the given number by adding K (thousand) or M (million) postfix.
    // K is added only if the number is bigger than 10000.
    countlyCommon.getShortNumber = function (number) {

        var tmpNumber = "";

        if (number >= 1000000000 || number <= -1000000000) {
            tmpNumber = ((number / 1000000000).toFixed(1).replace(".0", "")) + "B";
        } else if (number >= 1000000 || number <= -1000000) {
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
                formattedDateEnd.add(nowMin, "minutes");

            } else if (countlyCommon.periodObj.dateString == "D MMM, HH:mm") {
                formattedDateStart = moment(countlyCommon.periodObj.activePeriod, "YYYY.M.D");
                formattedDateEnd = moment(countlyCommon.periodObj.activePeriod, "YYYY.M.D").add(23, "hours").add(59, "minutes");
            } else {
                formattedDateStart = moment(countlyCommon.periodObj.activePeriod + "." + countlyCommon.periodObj.periodMin, "YYYY.M.D");
                formattedDateEnd = moment(countlyCommon.periodObj.activePeriod + "." + countlyCommon.periodObj.periodMax, "YYYY.M.D");
            }
        } else {
            formattedDateStart = moment(countlyCommon.periodObj.currentPeriodArr[0], "YYYY.M.D");
            formattedDateEnd = moment(countlyCommon.periodObj.currentPeriodArr[(countlyCommon.periodObj.currentPeriodArr.length - 1)], "YYYY.M.D");
        }

        var fromStr = countlyCommon.formatDate(formattedDateStart,countlyCommon.periodObj.dateString),
            toStr = countlyCommon.formatDate(formattedDateEnd,countlyCommon.periodObj.dateString);

        if (fromStr == toStr) {
            return fromStr;
        } else {
            return fromStr + " - " + toStr;
        }
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

    countlyCommon.toFirstUpper = function(str) {
        return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
    };

    countlyCommon.divide = function (val1, val2) {
        var temp = val1 / val2;

        if (!temp || temp == Number.POSITIVE_INFINITY) {
            temp = 0;
        }

        return temp;
    };

    countlyCommon.getTickObj = function(bucket, overrideBucket) {
        var days = parseInt(countlyCommon.periodObj.numberOfDays, 10),
            ticks = [],
            tickTexts = [],
            skipReduction = false,
            limitAdjustment = 0;

        if (overrideBucket) {
            var thisDay = moment(countlyCommon.periodObj.activePeriod, "YYYY.M.D");
            ticks.push([0, countlyCommon.formatDate(thisDay,"D MMM")]);
            tickTexts[0] = countlyCommon.formatDate(thisDay,"D MMM, dddd");
        } else if ((days == 1 && _period != "month" && _period != "day") || (days == 1 && bucket == "hourly")) {
            for (var i = 0; i < 24; i++) {
                ticks.push([i, (i + ":00")]);
                tickTexts.push((i + ":00"));
            }
            skipReduction = true;
        } else {
            var start = moment().subtract(days, 'days');
            if (Object.prototype.toString.call(countlyCommon.getPeriod()) === '[object Array]'){
                start = moment(countlyCommon.periodObj.currentPeriodArr[countlyCommon.periodObj.currentPeriodArr.length - 1], "YYYY.MM.DD").subtract(days, 'days');
            }
            if (bucket == "monthly") {
                var allMonths = [];

                for (var i = 0; i < days; i++) {
                    start.add(1, 'days');
                    allMonths.push(start.format("MMM YYYY"));
                }

                allMonths = _.uniq(allMonths);

                for (var i = 0; i < allMonths.length; i++) {
                    ticks.push([i, allMonths[i]]);
                    tickTexts[i] = allMonths[i];
                }
            } else if (bucket == "weekly") {
                var allWeeks = [];
                for (var i = 0; i < days; i++) {
                    start.add(1, 'days');
                    allWeeks.push(start.isoWeek()+" "+start.isoWeekYear());
                }

                allWeeks = _.uniq(allWeeks);

                for (var i = 0; i < allWeeks.length; i++) {
                    var parts = allWeeks[i].split(" ");
                    if(parseInt(parts[1]) == moment().isoWeekYear(parseInt(parts[1])).isoWeek(parseInt(parts[0])).startOf('week').year()){
                        ticks.push([i, "W" + allWeeks[i]]);
    
                        var weekText = countlyCommon.formatDate(moment().isoWeekYear(parseInt(parts[1])).isoWeek(parseInt(parts[0])).startOf('week'), ", D MMM YYYY");
                        tickTexts[i] = "W" + parts[0] + weekText;
                    }
                }
            } else if (bucket == "hourly") {
                for (var i = 0; i < days; i++) {
                    start.add(1, 'days');

                    for (var j = 0; j < 24; j++) {
                        if (j == 0) {
                            ticks.push([((24 * i) + j), countlyCommon.formatDate(start,"D MMM") + " 0:00"]);
                        }

                        tickTexts.push(countlyCommon.formatDate(start,"D MMM, ") + j + ":00");
                    }
                }
            } else {
                for (var i = 0; i < days; i++) {
                    start.add(1, 'days');
                    ticks.push([i, countlyCommon.formatDate(start,"D MMM")]);
                    tickTexts[i] = countlyCommon.formatDate(start,"D MMM, dddd");
                }
            }

            ticks = _.compact(ticks);
            tickTexts = _.compact(tickTexts);
        }

        if (ticks.length <= 2) {
            limitAdjustment = 0.02;
            var tmpTicks = [],
                tmpTickTexts = [];

            tmpTickTexts[0] = "";
            tmpTicks[0] = [-0.02, ""];

            for (var i = 0; i < ticks.length; i++) {
                tmpTicks[i + 1] = [i, ticks[i][1]];
                tmpTickTexts[i + 1] = tickTexts[i];
            }

            tmpTickTexts.push("");
            tmpTicks.push([tmpTicks.length - 1 - 0.98, ""]);

            ticks = tmpTicks;
            tickTexts = tmpTickTexts;
        } else if (!skipReduction && ticks.length > 10) {
            var reducedTicks = [],
                step = (Math.floor(ticks.length / 10) < 1)? 1 : Math.floor(ticks.length / 10),
                pickStartIndex = (Math.floor(ticks.length / 30) < 1)? 1 : Math.floor(ticks.length / 30);

            for (var i = pickStartIndex; i < (ticks.length - 1); i = i + step) {
                reducedTicks.push(ticks[i]);
            }

            ticks = reducedTicks;
        } else {
            ticks[0] = null;

            // Hourly ticks already contain 23 empty slots at the end
            if (!(bucket == "hourly" && days != 1)) {
                ticks[ticks.length - 1] = null;
            }
        }

        return {
            min: 0 - limitAdjustment,
            max: (limitAdjustment)? tickTexts.length - 3 + limitAdjustment : tickTexts.length - 1,
            tickTexts: tickTexts,
            ticks: _.compact(ticks)
        };
    };

    countlyCommon.union = function(x, y) {
        if (!x) {
            return y;
        } else if (!y) {
            return x;
        }

        var obj = {};
        for (var i = x.length-1; i >= 0; -- i) {
            obj[x[i]] = true;
        }

        for (var i = y.length-1; i >= 0; -- i) {
            obj[y[i]] = true;
        }

        var res = [];

        for (var k in obj) {
            res.push(k);
        }

        return res;
    };

    countlyCommon.formatNumber = function(x) {
        x = parseFloat(parseFloat(x).toFixed(2));
        var parts = x.toString().split(".");
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return parts.join(".");
    };

	countlyCommon.pad = function(n, width, z){
		z = z || '0';
		n = n + '';
		return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
	};

    countlyCommon.getNoteDateIds = function(bucket) {
        var _periodObj = countlyCommon.periodObj,
            dateIds = [],
            dotSplit = [],
            tmpDateStr = "";

        if (!_periodObj.isSpecialPeriod && !bucket) {
            for (var i = _periodObj.periodMin; i < (_periodObj.periodMax + 1); i++) {
                dotSplit = (_periodObj.activePeriod + "." + i).split(".");
                tmpDateStr = "";

                for (var j = 0; j < dotSplit.length; j++) {
                    if (dotSplit[j].length == 1) {
                        tmpDateStr += "0" + dotSplit[j];
                    } else {
                        tmpDateStr += dotSplit[j];
                    }
                }

                dateIds.push(tmpDateStr);
            }
        } else {
            if (!_periodObj.currentPeriodArr && bucket == "daily") {
                var tmpDate = new Date();
                _periodObj.currentPeriodArr = [];

                if (countlyCommon.getPeriod() == "month") {
                    for (var i = 0; i < (tmpDate.getMonth() + 1); i++) {
                        var daysInMonth = moment().month(i).daysInMonth();

                        for (var j = 0; j < daysInMonth; j++) {
                            _periodObj.currentPeriodArr.push(_periodObj.activePeriod + "." + (i + 1) + "." + (j + 1));

                            // If current day of current month, just break
                            if ((i == tmpDate.getMonth()) && (j == (tmpDate.getDate() - 1))) {
                                break;
                            }
                        }
                    }
                } else if(countlyCommon.getPeriod() == "day") {
                    for (var i = 0; i < tmpDate.getDate(); i++) {
                        _periodObj.currentPeriodArr.push(_periodObj.activePeriod + "." + (i + 1));
                    }
                } else{
                    _periodObj.currentPeriodArr.push(_periodObj.activePeriod);
                }
            }

            for (var i = 0; i < (_periodObj.currentPeriodArr.length); i++) {
                dotSplit = _periodObj.currentPeriodArr[i].split(".");
                tmpDateStr = "";

                for (var j = 0; j < dotSplit.length; j++) {
                    if (dotSplit[j].length == 1) {
                        tmpDateStr += "0" + dotSplit[j];
                    } else {
                        tmpDateStr += dotSplit[j];
                    }
                }

                dateIds.push(tmpDateStr);
            }
        }

        switch (bucket) {
            case "hourly":
                var tmpDateIds = [];

                for (var i = 0; i < 25; i++) {
                    tmpDateIds.push(dateIds[0] + ((i < 10)? "0" + i : i))
                }

                dateIds = tmpDateIds;
                break;
            case "monthly":
                var tmpDateIds = [];

                for (var i = 0; i < dateIds.length; i++) {
                    countlyCommon.arrayAddUniq(tmpDateIds, moment(dateIds[i], "YYYYMMDD").format("YYYYMM"))
                }

                dateIds = tmpDateIds;
                break;
        }

        return dateIds;
    };

    countlyCommon.getNotesForDateId = function(dateId) {
        var ret = [];

        if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].notes) {
            for (var date in countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].notes) {
                if (date.indexOf(dateId) === 0) {
                    ret = ret.concat(countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].notes[date]);
                }
            }
        }

        return ret.join("<br/>");
    };

    countlyCommon.arrayAddUniq = function (arr, item) {
        if (!arr) {
            arr = [];
        }

        if (toString.call(item) === "[object Array]") {
            for (var i = 0; i < item.length; i++) {
                if (arr.indexOf(item[i]) === -1) {
                    arr[arr.length] = item[i];
                }
            }
        } else {
            if (arr.indexOf(item) === -1) {
                arr[arr.length] = item;
            }
        }
    };

	countlyCommon.formatTimeAgo = function(timestamp) {
        var target = new Date(timestamp*1000);
        var tooltip = moment(target).format("ddd, D MMM YYYY HH:mm:ss");
        var elem = $("<span>");
        elem.prop("title", tooltip);
		var now = new Date();
		var diff = Math.floor((now - target) / 1000);
		if (diff <= 1) {elem.css("color", "#50C354"); elem.text(jQuery.i18n.map["common.ago.just-now"]);}
		else if (diff < 20) {elem.css("color", "#50C354"); elem.text(jQuery.i18n.prop("common.ago.seconds-ago", diff));}
		else if (diff < 40) {elem.css("color", "#50C354"); elem.text(jQuery.i18n.map["common.ago.half-minute"]);}
		else if (diff < 60) {elem.css("color", "#50C354"); elem.text(jQuery.i18n.map["common.ago.less-minute"]);}
		else if (diff <= 90) {elem.text(jQuery.i18n.map["common.ago.one-minute"]);}
		else if (diff <= 3540) {elem.text(jQuery.i18n.prop("common.ago.minutes-ago", Math.round(diff / 60)));}
		else if (diff <= 5400) {elem.text(jQuery.i18n.map["common.ago.one-hour"]);}
		else if (diff <= 86400) {elem.text(jQuery.i18n.prop("common.ago.hours-ago", Math.round(diff / 3600)));}
		else if (diff <= 129600) {elem.text(jQuery.i18n.map["common.ago.one-day"]);}
		else if (diff < 604800) {elem.text(jQuery.i18n.prop("common.ago.days-ago", Math.round(diff / 86400)));}
		else if (diff <= 777600) {elem.text(jQuery.i18n.map["common.ago.one-week"]);}
		else elem.text(tooltip);
        elem.append("<a style='display: none;'>|"+tooltip+"</a>");
        return elem.prop('outerHTML');
	};

	countlyCommon.formatTime = function(timestamp) {
		var str = "";
		var seconds = timestamp % 60;
		str = str+leadingZero(seconds);
		timestamp -= seconds;
		var minutes = timestamp % (60*60);
		str = leadingZero(minutes/60)+":"+str;
		timestamp -= minutes;
		var hours = timestamp % (60*60*24);
		str = leadingZero(hours/(60*60))+":"+str;
		timestamp -= hours;
		if(timestamp > 0){
			var days = timestamp % (60*60*24*365);
			str = (days/(60*60*24))+" day(s) "+str;
			timestamp -= days;
			if(timestamp > 0){
				str = (timestamp/(60*60*24*365))+" year(s) "+str;
			}
		}
		return str;
	};

    countlyCommon.timeString = function(timespent){
        var timeSpentString = (timespent.toFixed(1)) + " " + jQuery.i18n.map["common.minute.abrv"];

        if (timespent >= 142560) {
            timeSpentString = (timespent / 525600).toFixed(1) + " " + jQuery.i18n.map["common.year.abrv"];
        } else if (timespent >= 1440) {
            timeSpentString = (timespent / 1440).toFixed(1) + " " + jQuery.i18n.map["common.day.abrv"];
        } else if (timespent >= 60) {
            timeSpentString = (timespent / 60).toFixed(1) + " " + jQuery.i18n.map["common.hour.abrv"];
        }
        return timeSpentString;


        /*var timeSpentString = "";
        if(timespent > 1){
            timeSpentString = Math.floor(timespent) + " " + jQuery.i18n.map["common.minute.abrv"]+" ";
            var left = Math.floor((timespent - Math.floor(timespent))*60);
            if(left > 0)
                timeSpentString += left + " s";
        }
        else
            timeSpentString += Math.floor((timespent - Math.floor(timespent))*60) + " s";

        if (timespent >= 142560) {
            timeSpentString = Math.floor(timespent / 525600) + " " + jQuery.i18n.map["common.year.abrv"];
            var left = Math.floor((timespent - Math.floor(timespent / 525600)*525600)/1440);
            if(left > 0)
                timeSpentString += " "+left + " " + jQuery.i18n.map["common.day.abrv"];
        } else if (timespent >= 1440) {
            timeSpentString = Math.floor(timespent / 1440) + " " + jQuery.i18n.map["common.day.abrv"];
            var left = Math.floor((timespent - Math.floor(timespent / 1440)*1440)/60);
            if(left > 0)
                timeSpentString += " "+left + " " + jQuery.i18n.map["common.hour.abrv"];
        } else if (timespent >= 60) {
            timeSpentString = Math.floor(timespent / 60) + " " + jQuery.i18n.map["common.hour.abrv"];
            var left = Math.floor(timespent - Math.floor(timespent / 60)*60)
            if(left > 0)
                timeSpentString += " "+left + " " + jQuery.i18n.map["common.minute.abrv"];
        }
        return timeSpentString;*/
    };

	countlyCommon.getDate = function(timestamp) {
		var d = new Date(timestamp*1000);
		return leadingZero(d.getDate())+"."+leadingZero(d.getMonth()+1)+"."+d.getFullYear();
	}

	countlyCommon.getTime = function(timestamp) {
		var d = new Date(timestamp*1000);
		return leadingZero(d.getHours())+":"+leadingZero(d.getMinutes());
	}

    countlyCommon.round = function(num, digits) {
        digits = Math.pow(10, digits || 0);
        return Math.round(num * digits) / digits;
    };

    countlyCommon.getDashboardData = function(data, properties, _periodObj){
        function clearObject(obj){
            if (obj) {
                for(var i = 0; i < properties.length; i++){
                    if (!obj[properties[i]]) obj[properties[i]] = 0;
                }
            }
            else {
                obj = {}
                for(var i = 0; i < properties.length; i++){
                    obj[properties[i]] = 0;
                }
            }

            return obj;
        };

        var dataArr = {},
            tmp_x,
            tmp_y,
            current = {},
            previous = {},
            change = {};

            for(var i = 0; i < properties.length; i++){
                current[properties[i]] = 0;
                previous[properties[i]] = 0;
            }

        if (_periodObj.isSpecialPeriod) {

            for (var j = 0; j < (_periodObj.currentPeriodArr.length); j++) {
                tmp_x = countlyCommon.getDescendantProp(data, _periodObj.currentPeriodArr[j]);
                tmp_x = clearObject(tmp_x);
                for(var i = 0; i < properties.length; i++){
                    current[properties[i]] += tmp_x[properties[i]];
                }
            }

            for (var j = 0; j < (_periodObj.previousPeriodArr.length); j++) {
                tmp_y = countlyCommon.getDescendantProp(data, _periodObj.previousPeriodArr[j]);
                tmp_y = clearObject(tmp_y);
                for(var i = 0; i < properties.length; i++){
                    previous[properties[i]] += tmp_y[properties[i]];
                }
            }
        } else {
            tmp_x = countlyCommon.getDescendantProp(data, _periodObj.activePeriod);
            tmp_y = countlyCommon.getDescendantProp(data, _periodObj.previousPeriod);
            tmp_x = clearObject(tmp_x);
            tmp_y = clearObject(tmp_y);

            for(var i = 0; i < properties.length; i++){
                current[properties[i]] = tmp_x[properties[i]];
                previous[properties[i]] = tmp_y[properties[i]];
            }
        }

        for(var i = 0; i < properties.length; i++){
            change[properties[i]] = countlyCommon.getPercentChange(previous[properties[i]], current[properties[i]]);
            dataArr[properties[i]] = {
                "total":current[properties[i]],
                "change":change[properties[i]].percent,
                "trend":change[properties[i]].trend,
            };
        }

        return dataArr;
    }

    countlyCommon.formatDate = function(date, format){
        if(countlyCommon.BROWSER_LANG_SHORT.toLowerCase() == "ko")
            format = format.replace("MMM D", "MMM D[일]").replace("D MMM", "MMM D[일]");
        else if(countlyCommon.BROWSER_LANG_SHORT.toLowerCase() == "ja")
            format = format.replace("MMM D", "MMM D[日]").replace("D MMM", "MMM D[日]");
        else if(countlyCommon.BROWSER_LANG_SHORT.toLowerCase() == "zh")
            format = format.replace("MMMM", "M").replace("MMM", "M").replace("MM", "M").replace("DD", "D").replace("D M, YYYY", "YYYY M D").replace("D M", "M D").replace("D", "D[日]").replace("M", "M[月]").replace("YYYY", "YYYY[年]");
        return date.format(format);
    }

    countlyCommon.showTooltip = function(args) {
        showTooltip(args);
    };

    // Private Methods

    function getDaysInMonth(year, month) {
        return new Date(year, month, 0).getDate();
    }

    function getDOY() {
        var onejan = new Date((new Date()).getFullYear(),0,1);
        return Math.ceil(((new Date()) - onejan) / 86400000);
    }

    // Returns a period object used by all time related data calculation functions.
    function getPeriodObj() {
        return countlyCommon.periodObj;
    }

    function calculatePeriodObj() {

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
            numberOfDays = 0,
            rangeEndDay = null,
            dateString,
            uniquePeriodsCheck = [],
            previousUniquePeriodsCheck = [],
            periodContainsToday = true;

        switch (_period) {
            case "month":
                activePeriod = year;
                previousPeriod = year - 1;
                periodMax = month;
                periodMin = 1;
                dateString = "MMM";
                numberOfDays = getDOY();
                break;
            case "day":
                activePeriod = year + "." + month;

                var previousDate = moment().subtract(day, 'days'),
                    previousYear = previousDate.year(),
                    previousMonth = (previousDate.month() + 1),
                    previousDay = previousDate.date();

                previousPeriod = previousYear + "." + previousMonth;
                periodMax = day;
                periodMin = 1;
                dateString = "D MMM";
                numberOfDays = moment().format("D");
                break;
            case "yesterday":
                var yesterday = moment().subtract(1, 'days'),
                    year = yesterday.year(),
                    month = (yesterday.month() + 1),
                    day = yesterday.date();

                activePeriod = year + "." + month + "." + day;
                var previousDate = moment().subtract(2, 'days'),
                    previousYear = previousDate.year(),
                    previousMonth = (previousDate.month() + 1),
                    previousDay = previousDate.date();

                previousPeriod = previousYear + "." + previousMonth + "." + previousDay;
                periodMax = 23;
                periodMin = 0;
                dateString = "D MMM, HH:mm";
                numberOfDays = 1;
                periodContainsToday = false;
                break;
            case "hour":
                activePeriod = year + "." + month + "." + day;
                var previousDate = moment().subtract(1, 'days'),
                    previousYear = previousDate.year(),
                    previousMonth = (previousDate.month() + 1),
                    previousDay = previousDate.date();

                previousPeriod = previousYear + "." + previousMonth + "." + previousDay;
                periodMax = 23;
                periodMin = 0;
                dateString = "HH:mm";
                numberOfDays = 1;
                break;
            case "7days":
                numberOfDays = daysInPeriod = 7;
                break;
            case "30days":
                numberOfDays = daysInPeriod = 30;
                break;
            case "60days":
                numberOfDays = daysInPeriod = 60;
                break;
            case "90days":
                numberOfDays = daysInPeriod = 90;
                break;
            default:
                break;
        }

        // Check whether period object is array
        if (Object.prototype.toString.call(_period) === '[object Array]' && _period.length == 2) {

            // "Date to" selected date timezone changes based on how the
            // date picker is initialised so we take care of it here
            var tmpDate = new Date (_period[1]);
            tmpDate.setHours(0,0,0,0);

            _period[1] = tmpDate.getTime();
            _period[1] -= getOffsetCorrectionForTimestamp(_period[1]);

            // One day is selected from the datepicker
            if (_period[0] == _period[1]) {
                var selectedDate = moment(_period[0]),
                    selectedYear = selectedDate.year(),
                    selectedMonth = (selectedDate.month() + 1),
                    selectedDay = selectedDate.date(),
                    selectedHour = (selectedDate.hours());

                activePeriod = selectedYear + "." + selectedMonth + "." + selectedDay;

                var previousDate = selectedDate.subtract(1, 'days'),
                    previousYear = previousDate.year(),
                    previousMonth = (previousDate.month() + 1),
                    previousDay = previousDate.date();

                previousPeriod = previousYear + "." + previousMonth + "." + previousDay;
                periodMax = 23;
                periodMin = 0;
                dateString = "D MMM, HH:mm";
                numberOfDays = 1;
                periodContainsToday = (moment(_period[0]).format("YYYYMMDD") == now.format("YYYYMMDD"));
            } else {
                var a = moment(_period[0]),
                    b = moment(_period[1]);

                numberOfDays = daysInPeriod = b.diff(a, 'days') + 1;
                rangeEndDay = _period[1];
                periodContainsToday = (b.format("YYYYMMDD") == now.format("YYYYMMDD"));
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
                var currIndex = (!rangeEndDay) ? moment().subtract(i, 'days') : moment(rangeEndDay).subtract(i, 'days'),
                    currIndexYear = currIndex.year(),
                    prevIndex = (!rangeEndDay) ? moment().subtract((daysInPeriod + i), 'days') : moment(rangeEndDay).subtract((daysInPeriod + i), 'days'),
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
            "numberOfDays":numberOfDays,
            "uniquePeriodArr":getUniqArray(currWeeksArr, currWeekCounts, currMonthsArr, currMonthCounts, currPeriodArr),
            "uniquePeriodCheckArr":getUniqCheckArray(currWeeksArr, currWeekCounts, currMonthsArr, currMonthCounts),
            "previousUniquePeriodArr":getUniqArray(prevWeeksArr, prevWeekCounts, prevMonthsArr, prevMonthCounts, prevPeriodArr),
            "previousUniquePeriodCheckArr":getUniqCheckArray(prevWeeksArr, prevWeekCounts, prevMonthsArr, prevMonthCounts),
            "periodContainsToday": periodContainsToday
        };

        return periodObj;
    }

    countlyCommon.getPeriodObj = getPeriodObj;

    function getUniqArray(weeksArray, weekCounts, monthsArray, monthCounts, periodArr) {

        if (_period == "month" || _period == "day" || _period == "yesterday" || _period == "hour") {
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

        if (_period == "month" || _period == "day" || _period == "yesterday" || _period == "hour") {
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
    function showTooltip(args) {
        var x = args.x || 0,
            y = args.y || 0,
            contents = args.contents,
            title = args.title,
            notes = args.notes;

        var tooltip = $('<div id="graph-tooltip" class="v2"></div>').append('<span class="content">' + contents + '</span>');

        if (title) {
            tooltip.prepend('<span id="graph-tooltip-title">' + title + '</span>');
        }

        if (notes) {
            var noteLines = (notes + "").split("===");

            for (var i = 0; i < noteLines.length; i++) {
                tooltip.append("<div class='note-line'>&#8211;  " + noteLines[i] + "</div>");
            }
        }

        $("#content").append("<div id='tooltip-calc'>" + $('<div>').append(tooltip.clone()).html() + "</div>");
        var widthVal = $("#graph-tooltip").outerWidth(),
            heightVal = $("#graph-tooltip").outerHeight();
        $("#tooltip-calc").remove();

        var newLeft = (x - (widthVal / 2)),
            xReach = (x + (widthVal / 2));

        if (notes) {
            newLeft += 10.5;
            xReach += 10.5;
        }

        if (xReach > $(window).width()) {
            newLeft = (x - widthVal);
        } else if (xReach < 340) {
            newLeft = x;
        }

        tooltip.css({
            top: y - heightVal - 20,
            left: newLeft
        }).appendTo("body").show();
    }

    function flattenObjUntilLastProp(ob) {
        var toReturn = flattenObj(ob);

        for (var i in toReturn) {
            var n = i.lastIndexOf('.');

            if (n !== -1) {
                toReturn[i.substring(0, n)] = toReturn[i];
                delete toReturn[i];
            }
        }

        return toReturn
    }

    function flattenObj(ob) {
        var toReturn = {};

        for (var i in ob) {
            if ((typeof ob[i]) == 'object') {
                var flatObject = flattenObj(ob[i]);
                for (var x in flatObject) {
                    toReturn[i + '.' + x] = flatObject[x];
                }
            } else {
                toReturn[i] = ob;
            }
        }

        return toReturn;
    }

    function leadingZero(value) {
        if(value > 9)
            return value
        return "0"+value;
    }

    function getOffsetCorrectionForTimestamp(inTS) {
        var timeZoneOffset = new Date().getTimezoneOffset(),
            intLength = inTS.toString().length,
            tzAdjustment = 0;

        if (timeZoneOffset < 0) {
            if (intLength == 13) {
                tzAdjustment = timeZoneOffset * 60000;
            } else if (intLength == 10) {
                tzAdjustment = timeZoneOffset * 60;
            }
        }

        return tzAdjustment;
    }

    countlyCommon.getOffsetCorrectionForTimestamp = getOffsetCorrectionForTimestamp;
    
    var __months = [];
    countlyCommon.getMonths = function(reset){
        if(reset){
            __months = [];
        }
        
        if(!__months.length){
            for(var i = 0; i < 12; i++){
                __months.push(moment.monthsShort(moment([0, i]), ""));
            }
        }
        return __months;
    };

}(window.countlyCommon = window.countlyCommon || {}, jQuery));