/*global countlyVue, CV, _, countlyCommon, CountlyHelpers, jQuery */
(function(countlyAllEvents) {

    countlyAllEvents.helpers = {
        getLineChartData: function(context, eventData) {
            var chartData = eventData.chartData;
            var graphData = [[], [], []];
            var labels = context.state.labels;
            var count = 0;
            var sum = 0;
            var dur = 0;
            for (var i = 0; i < chartData.length; i++) {
                graphData[0].push(chartData[i].c ? chartData[i].c : 0);
                graphData[1].push(chartData[i].s ? chartData[i].s : 0);
                graphData[2].push(chartData[i].dur ? chartData[i].dur : 0);
                if (chartData[i].c) {
                    count += chartData[i].c;
                }
                if (chartData[i].s) {
                    sum += chartData[i].s;
                }
                if (chartData[i].dur) {
                    dur += chartData[i].dur;
                }
            }
            var series = [];
            if (count > 0) {
                var countObj = {
                    name: labels.count,
                    data: graphData[0],
                    color: "#017AFF"
                };
                series.push(countObj);
            }
            if (sum > 0) {
                var sumObj = {
                    name: labels.sum,
                    data: graphData[1],
                    color: "#F96300"
                };
                series.push(sumObj);
            }
            if (dur > 0) {
                var durObj = {
                    name: labels.dur,
                    data: graphData[2],
                    color: "#FF9382"
                };
                series.push(durObj);
            }
            var obj = {
                series: series
            };
            context.commit('setLineChartData', obj);
        },
        getTableRows: function(context) {
            var eventData = context.state.allEventsProcessed;
            var tableRows = eventData.chartData.slice();
            var labels = context.state.labels;
            tableRows.forEach(function(row, i) {
                row.dateVal = i; //because we get them all always sorted by date
                if (row.curr_segment && typeof row.curr_segment === 'string') {
                    row.curr_segment = countlyAllEvents.helpers.decode(row.curr_segment);
                }
            });
            if (eventData.tableColumns.indexOf(labels.sum) !== -1 && eventData.tableColumns.indexOf(labels.dur) !== -1) {
                tableRows.forEach(function(row) {
                    row.avgSum = (parseInt(row.c) === 0 || parseInt(row.s) === 0) ? 0 : (row.s / row.c);
                    row.avgDur = (parseInt(row.c) === 0 || parseInt(row.dur) === 0) ? 0 : (row.dur / row.c);
                });
                eventData.tableColumns.push("AvgSum");
                eventData.tableColumns.push("AvgDur");
            }
            else if (eventData.tableColumns.indexOf(labels.sum) !== -1) {
                tableRows.forEach(function(row) {
                    row.avgSum = (parseInt(row.c) === 0 || parseInt(row.s) === 0) ? 0 : (row.s / row.c);
                });
                eventData.tableColumns.push("AvgSum");
            }
            else if (eventData.tableColumns.indexOf(labels.dur) !== -1) {
                tableRows.forEach(function(row) {
                    row.avgDur = (parseInt(row.c) === 0 || parseInt(row.dur) === 0) ? 0 : (row.dur / row.c);
                });
                eventData.tableColumns.push("AvgDur");
            }
            return tableRows;
        },
        getBarChartData: function(context, eventData) {
            var arrCount = [];
            var arrSum = [];
            var arrDuration = [];
            var xAxisData = [];
            var obj = {};
            var xAxis = {};
            var legend = {};
            var series = [];
            var obCount = {};
            var obSum = {};
            var obDuration = {};
            var labels = context.state.labels;
            var count = 0;
            var sum = 0;
            var dur = 0;
            var maxLength = eventData.chartData.length > 15 ? 15 : eventData.chartData.length;
            for (var i = 0; i < maxLength; i++) {
                arrCount.push(eventData.chartData[i].c);
                arrSum.push(eventData.chartData[i].s);

                arrDuration.push(eventData.chartData[i].dur);
                xAxisData.push(typeof eventData.chartData[i].curr_segment === 'string' ? countlyAllEvents.helpers.decode(eventData.chartData[i].curr_segment) : eventData.chartData[i].curr_segment);
                if (eventData.chartData[i].c) {
                    count += eventData.chartData[i].c;
                }
                if (eventData.chartData[i].s) {
                    sum += eventData.chartData[i].s;
                }
                if (eventData.chartData[i].dur) {
                    dur += eventData.chartData[i].dur;
                }
            }
            xAxis.data = xAxisData;
            if (count > 0) {
                obCount.name = labels.count;
                obCount.data = arrCount;
                obCount.color = "#017AFF";
                series.push(obCount);
            }
            if (sum > 0) {
                obSum.name = labels.sum;
                obSum.data = arrSum;
                obSum.color = "#F96300";
                series.push(obSum);
            }
            if (dur > 0) {
                obDuration.name = labels.dur;
                obDuration.data = arrDuration;
                obDuration.color = "#FF9382";
                series.push(obDuration);
            }
            legend.show = false;
            obj.legend = legend;
            obj.series = series;
            obj.xAxis = xAxis;
            context.commit('setBarData', obj);
        },
        clearEventsObject: function(obj) {
            if (obj) {
                if (!obj.c) {
                    obj.c = 0;
                }
                if (!obj.s) {
                    obj.s = 0;
                }
                if (!obj.dur) {
                    obj.dur = 0;
                }
            }
            else {
                obj = { "c": 0, "s": 0, "dur": 0 };
            }

            return obj;
        },
        decode: function(str) {
            return str.replace(/&amp;/g, '&').replace(/^&#36;/g, "$").replace(/&#46;/g, '.').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&le;/g, '<=').replace(/&ge;/g, '>=');
        },
        encode: function(str) {
            return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/<=/g, "&le;").replace(/>=/g, "&ge;");
        },
        getEventLongName: function(eventKey, eventMap) {
            var mapKey = eventKey.replace(/\\/g, "\\\\").replace(/\$/g, "\\u0024").replace(/\./g, "\\u002e");
            if (eventMap && eventMap[mapKey] && eventMap[mapKey].name) {
                return eventMap[mapKey].name;
            }
            else {
                return eventKey;
            }
        },
        getEventsData: function(context, res) {
            var eventData = { chartData: {}, chartDP: { dp: [], ticks: [] } };
            var allEvents = context.state.allEventsData;
            var groupData = context.state.groupData.displayMap;
            var eventMap = allEvents.map;
            var mapKey = context.state.selectedEventName.replace(/\\/g, "\\\\").replace(/\$/g, "\\u0024").replace(/\./g, '\\u002e');
            var countString = (mapKey.startsWith('[CLY]_group') && groupData.c) ? groupData.c : (eventMap && eventMap[mapKey] && eventMap[mapKey].count) ? eventMap[mapKey].count : jQuery.i18n.map["events.table.count"];
            var sumString = (mapKey.startsWith('[CLY]_group') && groupData.s) ? groupData.s : (eventMap && eventMap[mapKey] && eventMap[mapKey].sum) ? eventMap[mapKey].sum : jQuery.i18n.map["events.table.sum"];
            var durString = (mapKey.startsWith('[CLY]_group') && groupData.d) ? groupData.d : (eventMap && eventMap[mapKey] && eventMap[mapKey].dur) ? eventMap[mapKey].dur : jQuery.i18n.map["events.table.dur"];

            if (context.state.currentActiveSegmentation !== "segment" && context.state.hasSegments) {
                var segments = res.meta[context.state.currentActiveSegmentation].slice();
                var tmpEventData = countlyCommon.extractTwoLevelData(res, segments, countlyAllEvents.helpers.clearEventsObject, [
                    {
                        name: "curr_segment",
                        func: function(rangeArr) {
                            return rangeArr.replace(/:/g, ".").replace(/\[CLY\]/g, "").replace(/.\/\//g, "://");
                        }
                    },
                    { "name": "c" },
                    { "name": "s" },
                    { "name": "dur" }
                ]);

                eventData.chartData = tmpEventData.chartData;

                var segmentsSum = _.without(_.pluck(eventData.chartData, 's'), false, null, "", undefined, NaN);
                var segmentsDur = _.without(_.pluck(eventData.chartData, 'dur'), false, null, "", undefined, NaN);

                if (_.reduce(segmentsSum, function(memo, num) {
                    return memo + num;
                }, 0) === 0) {
                    segmentsSum = [];
                }

                if (_.reduce(segmentsDur, function(memo, num) {
                    return memo + num;
                }, 0) === 0) {
                    segmentsDur = [];
                }

                eventData.eventName = countlyAllEvents.helpers.getEventLongName(context.state.selectedEventName, eventMap);

                if (mapKey && eventMap && eventMap[mapKey]) {
                    eventData.eventDescription = eventMap[mapKey].description || "";
                }
                eventData.dataLevel = 2;
                eventData.tableColumns = [jQuery.i18n.map["events.table.segmentation"], countString];
                if (segmentsSum.length || segmentsDur.length) {
                    if (segmentsSum.length) {
                        eventData.tableColumns[eventData.tableColumns.length] = sumString;
                    }
                    if (segmentsDur.length) {
                        eventData.tableColumns[eventData.tableColumns.length] = durString;
                    }
                }
                else {
                    _.each(eventData.chartData, function(element, index, list) {
                        list[index] = _.pick(element, "curr_segment", "c");
                    });
                }
            }
            else {
                var chartData = [
                        { data: [], label: countString },
                        { data: [], label: sumString },
                        { data: [], label: durString }
                    ],
                    dataProps = [
                        { name: "c" },
                        { name: "s" },
                        { name: "dur" }
                    ];

                eventData = countlyCommon.extractChartData(res, countlyAllEvents.helpers.clearEventsObject, chartData, dataProps);

                eventData.eventName = countlyAllEvents.helpers.getEventLongName(context.state.selectedEventName, eventMap);

                if (mapKey && eventMap && eventMap[mapKey]) {
                    eventData.eventDescription = eventMap[mapKey].description || "";
                }
                eventData.dataLevel = 1;
                eventData.tableColumns = [jQuery.i18n.map["common.date"], countString];

                var cleanSumCol = _.without(_.pluck(eventData.chartData, 's'), false, null, "", undefined, NaN);
                var cleanDurCol = _.without(_.pluck(eventData.chartData, 'dur'), false, null, "", undefined, NaN);

                var reducedSum = _.reduce(cleanSumCol, function(memo, num) {
                    return memo + num;
                }, 0);
                var reducedDur = _.reduce(cleanDurCol, function(memo, num) {
                    return memo + num;
                }, 0);

                if (reducedSum !== 0 || reducedDur !== 0) {
                    if (reducedSum !== 0) {
                        eventData.tableColumns[eventData.tableColumns.length] = sumString;
                    }
                    if (reducedDur !== 0) {
                        eventData.tableColumns[eventData.tableColumns.length] = durString;
                    }
                }
                else {
                    eventData.chartDP = _.compact(eventData.chartDP);
                    _.each(eventData.chartData, function(element, index, list) {
                        list[index] = _.pick(element, "date", "c");
                    });
                }
            }
            var countArr = _.pluck(eventData.chartData, "c");

            if (countArr.length) {
                eventData.totalCount = _.reduce(countArr, function(memo, num) {
                    return memo + num;
                }, 0);
            }

            var sumArr = _.pluck(eventData.chartData, "s");

            if (sumArr.length) {
                eventData.totalSum = _.reduce(sumArr, function(memo, num) {
                    return memo + num;
                }, 0);
            }

            var durArr = _.pluck(eventData.chartData, "dur");

            if (durArr.length) {
                eventData.totalDur = _.reduce(durArr, function(memo, num) {
                    return memo + num;
                }, 0);
            }
            context.commit('setAllEventsProcessed', eventData);
            return eventData;
        },
        getSegments: function(context, res) {
            var segments = [];
            if (res.meta && res.meta.segments.length > 0) {
                segments = res.meta.segments.slice();
                segments.push("segment");
                context.commit('setHasSegments', true);
            }
            else {
                context.commit('setHasSegments', false);
            }
            var eventData = countlyAllEvents.helpers.getEventsData(context, res);
            if (context.state.currentActiveSegmentation !== "segment") {
                countlyAllEvents.helpers.getBarChartData(context, eventData);
            }
            else {
                countlyAllEvents.helpers.getLineChartData(context, eventData);
            }
            return segments;
        },
        getLegendData: function(context) {
            if (!context.state.allEventsProcessed) {
                return;
            }
            var lineLegend = {};
            var legendData = [];
            var eventsOverview = context.state.selectedEventsOverview;
            var labels = context.state.labels;
            var count = {};
            if (eventsOverview.count.total > 0) {
                count.name = labels.count;
                count.value = countlyCommon.formatNumber(eventsOverview.count.total);
                count.trend = eventsOverview.count.trend === "u" ? "up" : "down";
                count.percentage = eventsOverview.count.change;
                legendData.push(count);
            }
            var sum = {};
            if (eventsOverview.sum.total > 0) {
                sum.name = labels.sum;
                sum.value = countlyCommon.formatNumber(eventsOverview.sum.total);
                sum.trend = eventsOverview.sum.trend === "u" ? "up" : "down";
                sum.percentage = eventsOverview.sum.change;
                legendData.push(sum);
            }
            var dur = {};
            if (eventsOverview.dur.total > 0) {
                dur.name = labels.dur;
                dur.value = countlyCommon.formatNumber(eventsOverview.dur.total);
                dur.trend = eventsOverview.dur.trend === "u" ? "up" : "down";
                dur.percentage = eventsOverview.dur.change;
                legendData.push(dur);
            }
            lineLegend.show = true;
            lineLegend.type = "primary";
            lineLegend.data = legendData;
            return lineLegend;
        },
        getSelectedEventsOverview: function(context, res) {
            if (typeof context.state.selectedEventName === "string") {
                var event = res[countlyAllEvents.helpers.encode(context.state.selectedEventName)];
                return event.data;
            }
            return res[context.state.selectedEventName].data;
        },
        getAllEventsList: function(eventsList, groupList) {
            var map = eventsList.map || {};
            var allEvents = [];
            if (eventsList && eventsList.list) {
                eventsList.list.forEach(function(item) {
                    if (!map[item] || (map[item] && (map[item].is_visible || map[item].is_visible === undefined))) {
                        var label;
                        if (map[item] && map[item].name && typeof map[item].name === 'string') {
                            label = countlyAllEvents.helpers.decode(map[item].name);
                        }
                        if (item && typeof item === 'string') {
                            item = countlyAllEvents.helpers.decode(item);
                        }
                        var obj = {
                            "label": map[item] && map[item].name ? label : item,
                            "value": item,
                            "custom": {
                                "value": undefined
                            }
                        };
                        allEvents.push(obj);
                    }
                });
            }
            if (groupList) {
                groupList.forEach(function(item) {
                    if (item.status) {
                        var obj = {
                            "label": item.name,
                            "value": item._id,
                            "custom": {
                                "value": "GROUP"
                            }
                        };
                        allEvents.push(obj);
                    }
                });
            }
            return allEvents;
        },
        getGroupData: function(groupData, selectedEventName) {
            var description = undefined;
            var name = "";
            var isGroup = false;
            var displayMap = {};
            if (selectedEventName.startsWith('[CLY]_group')) {
                groupData.every(function(item) {
                    if (item._id === selectedEventName) {
                        description = item.description;
                        name = item.name;
                        isGroup = true;
                        displayMap = Object.assign({}, item.display_map);
                        return false;
                    }
                    return true;
                });
            }
            return {
                "description": description,
                "name": name,
                "isGroup": isGroup,
                "displayMap": displayMap
            };
        },
        getLabels: function(allEventsData, groupData, selectedEventName) {
            if (groupData.isGroup) {
                return {
                    count: groupData.displayMap.c ? groupData.displayMap.c : CV.i18n("events.overview.count"),
                    sum: groupData.displayMap.s ? groupData.displayMap.s : CV.i18n("events.overview.sum"),
                    dur: groupData.displayMap.d ? groupData.displayMap.d : CV.i18n("events.overview.duration")
                };
            }
            return {
                count: allEventsData && allEventsData.map && allEventsData.map[selectedEventName] && allEventsData.map[selectedEventName].count ? allEventsData.map[selectedEventName].count : CV.i18n("events.overview.count"),
                sum: allEventsData && allEventsData.map && allEventsData.map[selectedEventName] && allEventsData.map[selectedEventName].sum ? allEventsData.map[selectedEventName].sum : CV.i18n("events.overview.sum"),
                dur: allEventsData && allEventsData.map && allEventsData.map[selectedEventName] && allEventsData.map[selectedEventName].dur ? allEventsData.map[selectedEventName].dur : CV.i18n("events.overview.duration")
            };

        },
        getLimitAlerts: function(context) {
            var limitAlert = [];
            var allEventsList = context.state.allEventsList;
            var limits = context.state.allEventsData.limits;
            var eventLimit = {};
            var eventSegmentationLimit = {};
            var eventSegmentationLimitValue = {};
            var availableSegments = context.state.availableSegments.length - 1;
            var meta = context.state.selectedEventsData.meta;
            var eventsLength = allEventsList.filter(function(item) {
                return item.custom.value !== "GROUP";
            }).length;
            if (eventsLength >= limits.event_limit) {
                eventLimit.message = CV.i18n("events.max-event-key-limit", limits.event_limit);
                eventLimit.show = true;
                limitAlert.push(eventLimit);
            }
            if (!context.state.selectedEventName.startsWith('[CLY]_group')) {
                if (availableSegments >= limits.event_segmentation_limit) {
                    eventSegmentationLimit.message = CV.i18n("events.max-segmentation-limit", limits.event_segmentation_limit, context.state.allEventsProcessed.eventName);
                    eventSegmentationLimit.show = true;
                    limitAlert.push(eventSegmentationLimit);
                }
                context.state.availableSegments.forEach(function(s) {
                    if (s !== "segment" && meta[s] && meta[s].length >= limits.event_segmentation_value_limit) {
                        eventSegmentationLimitValue = {};
                        eventSegmentationLimitValue.message = CV.i18n("events.max-unique-value-limit", limits.event_segmentation_value_limit, s);
                        eventSegmentationLimitValue.show = true;
                        limitAlert.push(eventSegmentationLimitValue);
                    }
                });
            }
            return limitAlert;
        },
        getCurrentCategory: function(context) {
            if (context.state.allEventsData.map && context.state.allEventsData.map[context.state.selectedEventName]) {
                var categoryId = context.state.allEventsData.map[context.state.selectedEventName].category;
                if (categoryId && context.state.categoriesMap[categoryId]) {
                    return context.state.categoriesMap[categoryId];
                }
            }
            return "";
        },
        extendMeta: function(prevState, selectedEventsData) {
            for (var metaObj in selectedEventsData.meta) {
                if (prevState.meta[metaObj] && selectedEventsData.meta[metaObj] && prevState.meta[metaObj].length !== selectedEventsData.meta[metaObj].length) {
                    selectedEventsData.meta[metaObj] = countlyCommon.union(prevState.meta[metaObj], selectedEventsData.meta[metaObj]);
                }
            }
        },
        getSelectedEventsLegend: function(context, currentEventData) {
            var periodObj = countlyCommon.periodObj;
            var currentSegment = context.currentActiveSegmentation;
            var lineLegend = {};
            var legendData = [];
            var labels = context.state.labels;
            var count = {};
            var tempX,
                tempY,
                currentTotal = 0,
                previousTotal = 0,
                currentSum = 0,
                previousSum = 0,
                currentDur = 0,
                previousDur = 0;
            var segment = "";
            var tmpCurrCount = 0,
                tmpCurrSum = 0,
                tmpCurrDur = 0,
                tmpPrevCount = 0,
                tmpPrevSum = 0,
                tmpPrevDur = 0;
            if (periodObj.isSpecialPeriod) {
                for (var i = 0; i < (periodObj.currentPeriodArr.length); i++) {
                    tempX = countlyCommon.getDescendantProp(currentEventData, periodObj.currentPeriodArr[i]);
                    tempY = countlyCommon.getDescendantProp(currentEventData, periodObj.previousPeriodArr[i]);
                    tempX = countlyAllEvents.helpers.clearEventsObject(tempX);
                    tempY = countlyAllEvents.helpers.clearEventsObject(tempY);

                    if (currentSegment !== "segment") {
                        tmpCurrCount = 0,
                        tmpCurrSum = 0,
                        tmpCurrDur = 0,
                        tmpPrevCount = 0,
                        tmpPrevSum = 0,
                        tmpPrevDur = 0;
                        for (segment in tempX) {
                            tmpCurrCount += tempX[segment].c || 0;
                            tmpCurrSum += tempX[segment].s || 0;
                            tmpCurrDur += tempX[segment].dur || 0;

                            if (tempY[segment]) {
                                tmpPrevCount += tempY[segment].c || 0;
                                tmpPrevSum += tempY[segment].s || 0;
                                tmpPrevDur += tempY[segment].dur || 0;
                            }
                        }

                        tempX = {
                            "c": tmpCurrCount,
                            "s": tmpCurrSum,
                            "dur": tmpCurrDur
                        };

                        tempY = {
                            "c": tmpPrevCount,
                            "s": tmpPrevSum,
                            "dur": tmpPrevDur
                        };
                    }

                    currentTotal += tempX.c;
                    previousTotal += tempY.c;
                    currentSum += tempX.s;
                    previousSum += tempY.s;
                    currentDur += tempX.dur;
                    previousDur += tempY.dur;
                }
            }
            else {
                tempX = countlyCommon.getDescendantProp(currentEventData, periodObj.activePeriod);
                tempY = countlyCommon.getDescendantProp(currentEventData, periodObj.previousPeriod);
                tempX = countlyAllEvents.helpers.clearEventsObject(tempX);
                tempY = countlyAllEvents.helpers.clearEventsObject(tempY);

                if (currentSegment !== "segment") {
                    tmpCurrCount = 0,
                    tmpCurrSum = 0,
                    tmpCurrDur = 0,
                    tmpPrevCount = 0,
                    tmpPrevSum = 0,
                    tmpPrevDur = 0;
                    for (segment in tempX) {
                        if (typeof tempX[segment].c === 'number') {
                            tmpCurrCount += tempX[segment].c || 0;
                        }
                        if (typeof tempX[segment].s === 'number') {
                            tmpCurrSum += tempX[segment].s || 0;
                        }
                        if (typeof tempX[segment].dur === 'number') {
                            tmpCurrDur += tempX[segment].dur || 0;
                        }

                        if (tempY[segment]) {
                            if (typeof tempY[segment].c === 'number') {
                                tmpPrevCount += tempY[segment].c || 0;
                            }
                            if (typeof tempY[segment].s === 'number') {
                                tmpPrevSum += tempY[segment].s || 0;
                            }
                            if (typeof tempY[segment].dur === 'number') {
                                tmpPrevDur += tempY[segment].dur || 0;
                            }
                        }
                    }

                    tempX = {
                        "c": tmpCurrCount,
                        "s": tmpCurrSum,
                        "dur": tmpCurrDur
                    };

                    tempY = {
                        "c": tmpPrevCount,
                        "s": tmpPrevSum,
                        "dur": tmpPrevDur
                    };
                }

                currentTotal = tempX.c;
                previousTotal = tempY.c;
                currentSum = tempX.s;
                previousSum = tempY.s;
                currentDur = tempX.dur;
                previousDur = tempY.dur;
            }

            var	changeCount = countlyCommon.getPercentChange(previousTotal, currentTotal),
                changeSum = countlyCommon.getPercentChange(previousSum, currentSum),
                changeDur = countlyCommon.getPercentChange(previousDur, currentDur);
            if (currentTotal > 0) {
                count.name = labels.count;
                count.value = countlyCommon.formatNumber(currentTotal);
                count.trend = changeCount.trend === "u" ? "up" : "down";
                count.percentage = changeCount.percent;
                legendData.push(count);
            }
            var sum = {};
            if (currentSum > 0) {
                sum.name = labels.sum;
                sum.value = countlyCommon.formatNumber(currentSum);
                sum.trend = changeSum.trend === "u" ? "up" : "down";
                sum.percentage = changeSum.percent;
                legendData.push(sum);
            }
            var dur = {};
            if (currentDur > 0) {
                dur.name = labels.dur;
                dur.value = countlyCommon.formatSecond(currentDur);
                dur.trend = changeDur.trend === "u" ? "up" : "down";
                dur.percentage = changeDur.percent;
                legendData.push(dur);
            }
            lineLegend.show = true;
            lineLegend.type = "primary";
            lineLegend.data = legendData;
            return lineLegend;
        }
    };

    countlyAllEvents.service = {
        fetchAllEventsData: function(context, period) {
            return CV.$.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r,
                data: {
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    "method": "get_events",
                    "period": CountlyHelpers.getPeriodUrlQueryParameter(period),
                    "preventRequestAbort": true
                },
                dataType: "json",
            }, {"disableAutoCatch": true});
        },
        fetchAllEventsGroupData: function() {
            return CV.$.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r,
                data: {
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    "method": "get_event_groups",
                    "preventRequestAbort": true
                },
                dataType: "json",
            }, {"disableAutoCatch": true});
        },
        fetchSelectedEventsData: function(context, period) {
            return CV.$.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r,
                data: {
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    "method": "events",
                    "event": context.state.selectedEventName,
                    "segmentation": context.state.currentActiveSegmentation === "segment" ? "" : context.state.currentActiveSegmentation,
                    "period": CountlyHelpers.getPeriodUrlQueryParameter(period),
                    "preventRequestAbort": true
                },
                dataType: "json",
            }, {"disableAutoCatch": true});
        },
        fetchSelectedEventsOverview: function(context, period) {
            return CV.$.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r,
                data: {
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    "method": "events",
                    "events": JSON.stringify([context.state.selectedEventName]),
                    "period": CountlyHelpers.getPeriodUrlQueryParameter(period),
                    "timestamp": new Date().getTime(),
                    "overview": true
                },
                dataType: "json",
            }, {"disableAutoCatch": true});
        },
        fetchCategories: function() {
            return CV.$.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r + '/data-manager/category',
                data: {
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    "preventRequestAbort": true
                },
                dataType: "json"
            }, {"disableAutoCatch": true});
        },
        fetchSegmentMap: function() {
            return CV.$.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r + '/data-manager/event-segment',
                data: {
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    "preventRequestAbort": true,
                },
                dataType: "json"
            }, {"disableAutoCatch": true});
        },
        fetchRefreshSelectedEventsData: function(context) {
            return CV.$.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.r,
                data: {
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    "method": "events",
                    "event": context.state.selectedEventName,
                    "segmentation": context.state.currentActiveSegmentation === "segment" ? "" : context.state.currentActiveSegmentation,
                    "action": "refresh"
                },
                dataType: "json",
            }, {"disableAutoCatch": true});
        }
    };

    countlyAllEvents.getVuexModule = function() {
        var getInitialState = function() {
            return {
                allEventsData: {},
                allEventsGroupData: [],
                selectedEventsData: {},
                selectedEventName: undefined,
                groupData: {},
                currentActiveSegmentation: "segment",
                hasSegments: false,
                availableSegments: [],
                allEventsProcessed: {},
                barData: {},
                lineChartData: {},
                legendData: {
                    type: "primary",
                    data: []
                },
                tableRows: [],
                selectedEventsOverview: {},
                allEventsList: [],
                labels: [],
                limitAlerts: [],
                categoriesMap: [],
                currentCategory: "",
                segments: [],
                segmentDescription: "",
                isChartLoading: true,
                isTableLoading: true
            };
        };

        var allEventsActions = {
            fetchAllEventsData: function(context) {
                var period = context.rootGetters["countlyCommon/period"];
                return countlyAllEvents.service.fetchAllEventsData(context, period)
                    .then(function(res) {
                        if (res) {
                            context.commit("setAllEventsData", res);
                            if (!context.state.selectedEventName) {
                                var appId = countlyCommon.ACTIVE_APP_ID;
                                var eventKeyForStorage = {};
                                eventKeyForStorage[appId] = res.list[0];
                                localStorage.setItem("eventKey", JSON.stringify(eventKeyForStorage));
                                context.commit('setSelectedEventName', res.list[0]);
                            }
                            context.commit("setCurrentCategory", countlyAllEvents.helpers.getCurrentCategory(context));

                            countlyAllEvents.service.fetchAllEventsGroupData(context)
                                .then(function(result) {
                                    if (result) {
                                        context.commit("setAllEventsGroupData", result);
                                        context.commit("setAllEventsList", countlyAllEvents.helpers.getAllEventsList(res, result));
                                        context.commit("setGroupData", countlyAllEvents.helpers.getGroupData(result, context.state.selectedEventName));
                                        context.commit("setLabels", countlyAllEvents.helpers.getLabels(res, context.state.groupData, context.state.selectedEventName));
                                        countlyAllEvents.service.fetchSelectedEventsData(context, period)
                                            .then(function(response) {
                                                if (response) {
                                                    context.commit("setSelectedEventsData", response);
                                                    context.commit("setAvailableSegments", countlyAllEvents.helpers.getSegments(context, response) || []);
                                                    context.commit("setTableRows", countlyAllEvents.helpers.getTableRows(context) || []);
                                                    context.commit("setLimitAlerts", countlyAllEvents.helpers.getLimitAlerts(context) || []);

                                                    countlyAllEvents.service.fetchSelectedEventsOverview(context, period)
                                                        .then(function(resp) {
                                                            if (resp) {
                                                                context.commit("setSelectedEventsOverview", countlyAllEvents.helpers.getSelectedEventsOverview(context, resp) || {});
                                                                context.commit("setLegendData", countlyAllEvents.helpers.getSelectedEventsLegend(context, response));
                                                                context.dispatch('setTableLoading', false);
                                                                context.dispatch('setChartLoading', false);
                                                            }
                                                        });
                                                }
                                            }).catch(function() {
                                                context.dispatch('setTableLoading', false);
                                                context.dispatch('setChartLoading', false);
                                                context.commit("setSelectedEventsData", {});
                                                context.commit("setAvailableSegments", []);
                                                context.commit("setTableRows", []);
                                                context.commit("setLimitAlerts", []);
                                                context.commit("setSelectedEventsOverview", {});
                                                context.commit("setLegendData", {});
                                                context.commit('setLineChartData', {});
                                                context.commit('setBarData', {});
                                                context.commit('setAllEventsProcessed', {});
                                                context.commit('setHasSegments', false);
                                                CountlyHelpers.notify({
                                                    title: CV.i18n("common.error"),
                                                    message: CV.i18n("events.all.error"),
                                                    type: "error"
                                                });
                                            });
                                    }
                                });
                        }
                    }).catch(function() {
                        context.dispatch('setTableLoading', false);
                        context.dispatch('setChartLoading', false);
                    });
            },
            fetchAllEventsGroupData: function(context) {
                return countlyAllEvents.service.fetchAllEventsGroupData(context)
                    .then(function(res) {
                        if (res) {
                            context.commit("setAllEventsGroupData", res);
                        }
                    });
            },
            fetchSelectedEventsData: function(context) {
                var period = context.rootGetters["countlyCommon/period"];
                return countlyAllEvents.service.fetchSelectedEventsData(context, period)
                    .then(function(res) {
                        if (res) {
                            context.commit("setSelectedEventsData", res);
                            context.commit("setAvailableSegments", countlyAllEvents.helpers.getSegments(context, res) || []);
                            context.commit("setTableRows", countlyAllEvents.helpers.getTableRows(context) || []);
                            context.dispatch('setTableLoading', false);
                            context.dispatch('setChartLoading', false);
                            context.commit("setLegendData", countlyAllEvents.helpers.getSelectedEventsLegend(context, res));
                        }
                    }).catch(function() {
                        context.dispatch('setTableLoading', false);
                        context.dispatch('setChartLoading', false);
                    });
            },
            fetchSelectedEventName: function(context, name) {
                var appId = countlyCommon.ACTIVE_APP_ID;
                var eventKeyForStorage = {};
                eventKeyForStorage[appId] = name;
                localStorage.setItem("eventKey", JSON.stringify(eventKeyForStorage));
                context.commit('setSelectedEventName', name);
            },
            fetchCurrentActiveSegmentation: function(context, name) {
                context.commit('setCurrentActiveSegmentation', name);
            },
            fetchHasSegments: function(context, hasSegments) {
                context.commit('setHasSegments', hasSegments);
            },
            fetchCategories: function(context) {
                countlyAllEvents.service.fetchCategories().then(function(data) {
                    if (data) {
                        var map = {};
                        data.forEach(function(c) {
                            map[c._id] = c.name;
                        });
                        context.commit('setCategoriesMap', map);
                    }
                });
            },
            fetchSegments: function(context) {
                countlyAllEvents.service.fetchSegmentMap().then(function(data) {
                    if (data) {
                        var segments = [];
                        data.forEach(function(segmap) {
                            return segmap.sg.forEach(function(s) {
                                s.event = segmap._id;
                                segments.push(s);
                            });
                        });
                        context.commit('setSegments', segments);
                        return data;
                    }
                });
            },
            setSegmentDescription: function(context) {
                var segment = context.state.segments.filter(function(seg) {
                    return (seg.event === context.state.selectedEventName) && (seg.name === context.state.currentActiveSegmentation);
                });
                if (segment.length > 0 && segment[0].description) {
                    context.commit('setSegmentDescription', segment[0].description);
                }
                else {
                    context.commit('setSegmentDescription', "");
                }
            },
            setTableLoading: function(context, value) {
                context.commit("setTableLoading", value);
            },
            setChartLoading: function(context, value) {
                context.commit("setChartLoading", value);
            },
            fetchRefreshAllEventsData: function(context) {
                var period = context.rootGetters["countlyCommon/period"];
                return countlyAllEvents.service.fetchAllEventsData(context, period)
                    .then(function(res) {
                        if (res) {
                            context.commit("setAllEventsData", res);
                            if (!context.state.selectedEventName) {
                                var appId = countlyCommon.ACTIVE_APP_ID;
                                var eventKeyForStorage = {};
                                eventKeyForStorage[appId] = res.list[0];
                                localStorage.setItem("eventKey", JSON.stringify(eventKeyForStorage));
                                context.commit('setSelectedEventName', res.list[0]);
                            }
                            countlyAllEvents.service.fetchAllEventsGroupData(context)
                                .then(function(result) {
                                    if (result) {
                                        context.commit("setAllEventsGroupData", result);
                                        context.commit("setAllEventsList", countlyAllEvents.helpers.getAllEventsList(res, result));
                                        context.commit("setGroupData", countlyAllEvents.helpers.getGroupData(result, context.state.selectedEventName));
                                        context.commit("setLabels", countlyAllEvents.helpers.getLabels(res, context.state.groupData, context.state.selectedEventName));
                                        countlyAllEvents.service.fetchRefreshSelectedEventsData(context)
                                            .then(function(response) {
                                                if (response) {
                                                    var prevState = Object.assign({}, context.state.selectedEventsData);
                                                    countlyCommon.extendDbObj(context.state.selectedEventsData, response);
                                                    countlyAllEvents.helpers.extendMeta(prevState, context.state.selectedEventsData);
                                                    context.commit("setAvailableSegments", countlyAllEvents.helpers.getSegments(context, context.state.selectedEventsData) || []);
                                                    context.commit("setTableRows", countlyAllEvents.helpers.getTableRows(context) || []);
                                                    context.commit("setLimitAlerts", countlyAllEvents.helpers.getLimitAlerts(context) || []);

                                                    countlyAllEvents.service.fetchSelectedEventsOverview(context, period)
                                                        .then(function(resp) {
                                                            if (resp) {
                                                                context.commit("setSelectedEventsOverview", countlyAllEvents.helpers.getSelectedEventsOverview(context, resp) || {});
                                                                context.commit("setLegendData", countlyAllEvents.helpers.getLegendData(context || {}));
                                                            }
                                                        });
                                                }
                                            });
                                    }
                                });
                        }
                    });
            },

        };

        var allEventsMutations = {
            setAllEventsData: function(state, value) {
                state.allEventsData = value;
            },
            setAllEventsList: function(state, value) {
                state.allEventsList = value;
            },
            setAllEventsGroupData: function(state, value) {
                state.allEventsGroupData = value;
            },
            setSelectedEventsData: function(state, value) {
                state.selectedEventsData = value;
            },
            setSelectedEventName: function(state, value) {
                state.selectedEventName = value;
            },
            setGroupData: function(state, value) {
                state.groupData = value;
            },
            setCurrentActiveSegmentation: function(state, value) {
                state.currentActiveSegmentation = value;
            },
            setHasSegments: function(state, value) {
                state.hasSegments = value;
            },
            setAvailableSegments: function(state, value) {
                state.availableSegments = value;
            },
            setAllEventsProcessed: function(state, value) {
                state.allEventsProcessed = value;
            },
            setBarData: function(state, value) {
                state.barData = value;
            },
            setLineChartData: function(state, value) {
                state.lineChartData = value;
            },
            setLegendData: function(state, value) {
                state.legendData = value;
            },
            setTableRows: function(state, value) {
                state.tableRows = value;
            },
            setSelectedEventsOverview: function(state, value) {
                state.selectedEventsOverview = value;
            },
            setLabels: function(state, value) {
                state.labels = value;
            },
            setLimitAlerts: function(state, value) {
                state.limitAlerts = value;
            },
            setCategoriesMap: function(state, value) {
                state.categoriesMap = value;
            },
            setCurrentCategory: function(state, value) {
                state.currentCategory = value;
            },
            setSegments: function(state, value) {
                state.segments = value;
            },
            setSegmentDescription: function(state, value) {
                state.segmentDescription = value;
            },
            setTableLoading: function(state, value) {
                state.isTableLoading = value;
            },
            setChartLoading: function(state, value) {
                state.isChartLoading = value;
            }
        };
        var allEventsGetters = {
            allEvents: function(_state) {
                return _state.allEventsData;
            },
            allEventsList: function(_state) {
                return _state.allEventsList;
            },
            allEventsGroup: function(_state) {
                return _state.allEventsGroupData;
            },
            selectedEvent: function(_state) {
                return _state.selectedEventsData;
            },
            selectedEventName: function(_state) {
                return _state.selectedEventName;
            },
            groupData: function(_state) {
                return _state.groupData;
            },
            currentActiveSegmentation: function(_state) {
                return _state.currentActiveSegmentation;
            },
            hasSegments: function(_state) {
                return _state.hasSegments;
            },
            availableSegments: function(_state) {
                return _state.availableSegments;
            },
            allEventsProcessed: function(_state) {
                return _state.allEventsProcessed;
            },
            barData: function(_state) {
                return _state.barData;
            },
            lineChartData: function(_state) {
                return _state.lineChartData;
            },
            legendData: function(_state) {
                return _state.legendData;
            },
            tableRows: function(_state) {
                return _state.tableRows;
            },
            selectedEventsOverview: function(_state) {
                return _state.selectedEventsOverview;
            },
            labels: function(_state) {
                return _state.labels;
            },
            limitAlerts: function(_state) {
                return _state.limitAlerts;
            },
            categoriesMap: function(_state) {
                return _state.categoriesMap;
            },
            currentCategory: function(_state) {
                return _state.currentCategory;
            },
            segments: function(_state) {
                return _state.segments;
            },
            segmentDescription: function(_state) {
                return _state.segmentDescription;
            },
            isTableLoading: function(_state) {
                return _state.isTableLoading;
            },
            isChartLoading: function(_state) {
                return _state.isChartLoading;
            }
        };
        return countlyVue.vuex.Module("countlyAllEvents", {
            state: getInitialState,
            actions: allEventsActions,
            mutations: allEventsMutations,
            getters: allEventsGetters,
        });
    };
}(window.countlyAllEvents = window.countlyAllEvents || {}));