/*global countlyVue, countlyDrillMeta, countlyTaskManager, countlyCommon, moment, CV */
(function() {

    var AVAILABLE_CHART_TYPES = ["timeSeries", "bar", "stackedBar", "pie", "heatmap"];

    var ExecutionResultChartMixin = {
        data: function() {
            return {
                isChartAvailable: false,
                pieOptions: {},
                timeSeriesOptions: {},
                barOptions: {},
                stackedBarOptions: {},
                heatmapOptions: {},
                graphNotesSeriesOptions: {
                    type: 'line',
                    markPoint: {
                        data: [],
                        label: {
                            normal: {
                                show: true,
                                color: "rgba(255, 251, 251, 1)",
                                fontWeight: "500",
                                align: "center",
                            },
                        },
                        animation: false
                    },
                }
            };
        },
        computed: {
            selectedResultMetricMeta: function() {
                if (!this.executionResult.availableMetrics) {
                    return {};
                }
                return this.executionResult.availableMetrics.reduce(function(acc, item) {
                    acc[item.value] = item;
                    return acc;
                }, {});
            },
        },
        methods: {
            formatMatrixChartValue: function(value, cell) {
                return this.formatChartValue(cell[2]);
            },
            formatChartValue: function(value, cell, index, metric) {
                if (this.selectedResultMetric.length === 1) {
                    index = 0;
                }
                index = index % this.selectedResultMetric.length;
                metric = metric || this.selectedResultMetric[index];
                return this.selectedResultMetricMeta[metric].formatter(value);
            },
            formatChartAxes: function(axisName, type, value, metric) {
                if (axisName === "yAxis" && type === "axisLabel") {
                    return this.selectedResultMetricMeta[metric].formatter(value);
                }
            },
            chartHandler_stackedBar: function() {
                if (this.selectedBucket &&
                    this.selectedResultMetric.length > 0 &&
                    this.executionResult.hasProjection &&
                    this.executionResult.getTimeSeries().hasValues(this.selectedBucket)) {

                    this.isChartAvailable = true;
                    var values = this.executionResult.getTimeSeries().getValues(this.selectedBucket, this.selectedResultMetric[0]),
                        self = this;

                    var series = Object.keys(values).map(function(byKey) {
                        return {
                            type: "bar",
                            stack: 'default',
                            name: self.executionResult.getSegmentName(byKey),
                            data: values[byKey].map(function(val, idx) {
                                return [idx, val];
                            })
                        };
                    });

                    this.stackedBarOptions = {
                        xAxis: {
                            type: 'category',
                            data: this.executionResult.getTimeSeries().getBucketsMap(this.selectedBucket).map(function(bucket) {
                                return bucket.formatted;
                            })
                        },
                        yAxis: {
                            axisLabel: {
                                formatter: function(value) {
                                    return self.formatChartAxes("yAxis", "axisLabel", value, self.selectedResultMetric[0]);
                                }
                            }
                        },
                        series: series
                    };
                }
                else {
                    this.isChartAvailable = false;
                }
            },
            chartHandler_timeSeries: function() {
                if (this.selectedBucket &&
                    this.selectedResultMetric.length > 0 &&
                    this.executionResult.getTimeSeries().hasValues(this.selectedBucket)) {

                    this.isChartAvailable = true;

                    var series = null,
                        self = this;
                    if (this.executionResult.hasProjection) {
                        var values = this.executionResult.getTimeSeries().getValues(this.selectedBucket, this.selectedResultMetric[0]);
                        series = Object.keys(values).map(function(byKey, sIdx) {
                            return {
                                type: "line",
                                color: countlyCommon.GRAPH_COLORS[sIdx % countlyCommon.GRAPH_COLORS.length],
                                app: self.executionResult.requestPayload.app_id,
                                name: self.executionResult.getSegmentName(byKey),
                                data: values[byKey].map(function(val, idx) {
                                    return [idx, val || 0];
                                })
                            };
                        });
                    }
                    else {
                        var executionResults = this.executionResults || [this.executionResult],
                            sIdx = 0;
                        series = executionResults.reduce(function(accRes, executionResult) {
                            var allTimeSeries = executionResult.getAllTimeSeries();
                            var subSeries = Object.keys(allTimeSeries).reduce(function(acc, timeSeriesKey) {
                                var timeSeries = allTimeSeries[timeSeriesKey],
                                    metricKeys = self.selectedResultMetric;
                                return acc.concat(metricKeys.map(function(metricKey) {
                                    var lookup = executionResult.availableMetrics.reduce(function(accLookup, item) {
                                        accLookup[item.value] = item;
                                        return accLookup;
                                    }, {});
                                    var localValues = timeSeries.getValues(self.selectedBucket, metricKey),
                                        seriesName = lookup[metricKey].label,
                                        chartType = localValues.length <= 1 ? "bar" : "line";

                                    if (timeSeries.label) {
                                        seriesName += " (" + timeSeries.label + ")";
                                    }

                                    if (executionResults.length > 1 && executionResult.title) {
                                        seriesName = executionResult.title + " - " + seriesName;
                                    }

                                    return {
                                        type: chartType,
                                        color: countlyCommon.GRAPH_COLORS[(sIdx++) % countlyCommon.GRAPH_COLORS.length],
                                        app: executionResult.requestPayload.app_id,
                                        name: seriesName,
                                        data: localValues.map(function(val, idx) {
                                            return [idx, val || 0];
                                        })
                                    };
                                }));
                            }, []);
                            return accRes.concat(subSeries);
                        }, []);
                    }

                    this.timeSeriesOptions = {
                        xAxis: {
                            type: 'category',
                            data: this.executionResult.getTimeSeries().getBucketsMap(this.selectedBucket).map(function(bucket) {
                                return bucket.formatted;
                            })
                        },
                        yAxis: {
                            axisLabel: {
                                formatter: function(value) {
                                    return self.formatChartAxes("yAxis", "axisLabel", value, self.selectedResultMetric[0]);
                                }
                            }
                        },
                        series: series
                    };
                }
                else {
                    this.isChartAvailable = false;
                }
            },
            chartHandler_pie: function() {
                if (this.selectedResultMetric.length > 0 &&
                    this.executionResult.hasProjection &&
                    this.executionResult.segmentValues) {

                    this.isChartAvailable = true;
                    var segmentPairs = this.executionResult.segmentValues[this.selectedResultMetric[0]],
                        self = this;

                    this.pieOptions = {
                        series: [
                            {
                                data: Object.keys(segmentPairs).map(function(key) {
                                    return {
                                        name: self.executionResult.getSegmentName(key),
                                        value: segmentPairs[key]
                                    };
                                })
                            }
                        ],
                        label: {
                            formatter: function() {
                                return self.selectedResultMetricMeta[self.selectedResultMetric[0]].label;
                            }
                        },
                    };
                }
                else {
                    this.isChartAvailable = false;
                }
            },
            chartHandler_bar: function() {
                if (this.selectedResultMetric.length > 0 &&
                    this.executionResult.hasProjection &&
                    this.executionResult.segmentValues) {

                    this.isChartAvailable = true;
                    var segmentPairs = this.executionResult.segmentValues[this.selectedResultMetric[0]],
                        self = this;

                    var sorted = Object.keys(segmentPairs).map(function(key) {
                        return {
                            name: self.executionResult.getSegmentName(key),
                            value: segmentPairs[key]
                        };
                    });

                    sorted.sort(function(a, b) {
                        return b.value - a.value;
                    });

                    var xAxisData = [],
                        values = [];

                    sorted.forEach(function(item) {
                        xAxisData.push(item.name);
                        values.push(item.value);
                    });

                    this.barOptions = {
                        xAxis: {
                            type: 'category',
                            data: xAxisData
                        },
                        yAxis: {
                            axisLabel: {
                                formatter: function(value) {
                                    return self.formatChartAxes("yAxis", "axisLabel", value, self.selectedResultMetric[0]);
                                }
                            }
                        },
                        series: [{
                            name: self.selectedResultMetricMeta[self.selectedResultMetric[0]].label,
                            color: countlyCommon.GRAPH_COLORS[0],
                            app: self.executionResult.requestPayload.app_id,
                            type: 'bar',
                            data: values
                        }],
                        color: self.overrideChartColor || countlyCommon.GRAPH_COLORS
                    };
                }
                else {
                    this.isChartAvailable = false;
                }
            },
            chartHandler_heatmap: function() {
                if (this.selectedResultMetric.length > 0 &&
                    this.executionResult.hasProjection &&
                    this.executionResult.segmentsMatrix &&
                    this.executionResult.segmentValues) {

                    this.isChartAvailable = true;
                    var segmentsMatrix = this.executionResult.segmentsMatrix,
                        segmentPairs = this.executionResult.segmentValues[this.selectedResultMetric[0]],
                        self = this;

                    var minVal = Number.MAX_SAFE_INTEGER,
                        maxVal = Number.MIN_SAFE_INTEGER;

                    var data = segmentsMatrix.values.map(function(pair) {
                        var pointValue = segmentPairs[pair[2]];
                        minVal = Math.min(minVal, pointValue);
                        maxVal = Math.max(maxVal, pointValue);
                        return [pair[0], pair[1], pointValue];
                    });

                    this.heatmapOptions = {
                        tooltip: {
                            position: 'top'
                        },
                        grid: {
                            height: '50%',
                            top: '10%'
                        },
                        xAxis: {
                            boundaryGap: true,
                            offset: 0,
                            type: 'category',
                            data: segmentsMatrix.xAxisValues.map(function(val) {
                                return self.executionResult.getSegmentName(val, segmentsMatrix.xAxisProp);
                            }),
                            splitArea: {
                                show: true
                            }
                        },
                        yAxis: {
                            boundaryGap: true,
                            offset: 0,
                            type: 'category',
                            data: segmentsMatrix.yAxisValues.map(function(val) {
                                return self.executionResult.getSegmentName(val, segmentsMatrix.yAxisProp);
                            }),
                            splitArea: {
                                show: true
                            }
                        },
                        visualMap: {
                            min: minVal,
                            max: maxVal,
                            calculable: true,
                            orient: 'horizontal',
                            left: 'center',
                            bottom: '15%',
                            formatter: function(value) {
                                return self.formatChartValue(value);
                            }
                        },
                        series: [{
                            type: 'heatmap',
                            data: data,
                            label: {
                                show: true,
                                formatter: function(cell) {
                                    return self.formatChartValue(cell.value[2]);
                                }
                            },
                            emphasis: {
                                itemStyle: {
                                    shadowBlur: 10,
                                    shadowColor: 'rgba(0, 0, 0, 0.5)'
                                }
                            }
                        }]
                    };
                }
                else {
                    this.isChartAvailable = false;
                }
            }
        }
    };

    var ExecutionResultTableMixin = {
        data: function() {
            return {
                timeSeriesRows: [],
                selectedTableSegment: null,
            };
        },
        methods: {
            formatTableCell: function(metric, nameColumn) {
                nameColumn = nameColumn || "value";
                return function(row) {
                    return metric.formatter(row[metric[nameColumn]]);
                };
            },
            formatDateCell: function(row) {
                return row.date.formatted;
            },
            refreshTimeTableRows: function() {
                if (this.selectedBucket &&
                    this.executionResult.getTimeSeries().hasValues(this.selectedBucket)) {

                    var values = this.executionResult.getTimeSeries().getValues(this.selectedBucket),
                        self = this;

                    if (this.executionResult.hasProjection) {
                        var selectedExistingElement = this.executionResult.availableSegments.some(function(item) {
                            return item.value === self.selectedTableSegment;
                        });
                        if (!selectedExistingElement && this.executionResult.availableSegments.length > 0) {
                            this.selectedTableSegment = this.executionResult.availableSegments[0].value;
                        }
                        this.timeSeriesRows = this.executionResult.getTimeSeries().getBucketsMap(this.selectedBucket).map(function(bucket, idx) {
                            var row = {date: bucket};
                            Object.keys(values).forEach(function(valKey) {
                                if (self.selectedTableSegment in values[valKey]) {
                                    row[valKey] = values[valKey][self.selectedTableSegment][idx];
                                }
                            });
                            return row;
                        });
                    }
                    else {
                        this.timeSeriesRows = this.executionResult.getTimeSeries().getBucketsMap(this.selectedBucket).map(function(bucket, idx) {
                            var row = {date: bucket};
                            Object.keys(values).forEach(function(valKey) {
                                row[valKey] = values[valKey][idx];
                            });
                            return row;
                        });
                    }
                }
                else {
                    this.timeSeriesRows = [];
                }
            }
        }
    };

    var ExecutionResultViewMixin = function(modelId) {
        return {
            mixins: [
                ExecutionResultChartMixin,
                ExecutionResultTableMixin
            ],
            beforeCreate: function() {
                this.$store.dispatch(modelId + "/main/initialize", this.$route.params);
            },
            beforeDestroy: function() {
                this.$store.dispatch(modelId + "/main/reset");
            },
            computed: {
                executionResult: function() {
                    return this.$store.state[modelId].main.executionResult;
                },
                isReady: function() {
                    return this.$store.getters[modelId + "/main/isReady"];
                },
                resultTitle: function() {
                    if (this.executionResult.isTask && this.executionResult.status !== "ready") {
                        return this.i18n('drill.task-not-calculated');
                    }
                    else if (this.executionResult.status === "error") {
                        return this.i18n('common.error');
                    }
                    return this.i18n('drill.execute');
                },
                resultDescription: function() {
                    if (this.executionResult.status === "error") {
                        return JSON.stringify(this.executionResult.err);
                    }
                    return this.i18n('drill.execute-warning');
                },
                isTableSegmentSelectEnabled: function() {
                    return this.executionResult.hasProjection && ["timeSeries", "stackedBar"].includes(this.selectedChartType);
                }
            },
            data: function() {
                return {
                    selectedResultMetric: [],
                    selectedBucket: 'weekly',
                    selectedChartType: null,
                };
            },
            watch: {
                'executionResult': function(newVal, oldVal) {
                    if (newVal === oldVal) {
                        // Computed property re-evaluation causes this 
                        // to be triggered, no need to proceed 
                        return;
                    }
                    this.lastExecutedDoc = window[modelId].documentFactory.fromExecutionResult(newVal);
                    this.usesCustomDatepicker = newVal.isTask;
                    this.customDatepickerVal = newVal.effectiveRange;
                    this.checkResultModifiers();
                    this.refreshChartOptions();
                    this.refreshTable();
                },
                'selectedChartType': function() {
                    this.refreshChartOptions();
                    this.refreshTable();
                },
                'selectedBucket': function() {
                    this.refreshChartOptions();
                    this.refreshTable();
                },
                'isTableSegmentSelectEnabled': function(newVal) {
                    if (newVal) {
                        this.refreshTimeTableRows();
                    }
                }
            },
            methods: {
                resetExecutionResult: function() {
                    this.$store.dispatch(modelId + "/main/switchToDefaultExecutionResult");
                },
                switchToTask: function(taskId) {
                    var self = this;
                    this.isLoadingTask = true;
                    window[modelId].executionResultFactory.fromTask(taskId).then(function(executionResult) {
                        self.$store.dispatch(modelId + "/main/switchExecutionResult", executionResult);
                        self.setCurrentDocument(window[modelId].documentFactory.fromExecutionResult(executionResult), true);
                    });
                    setTimeout(function() {
                        // A small hack to freeze isStale watcher for a while
                        self.isLoadingTask = false;
                    }, 500);
                },
                checkResultModifiers: function() {
                    if (this.executionResult.availableBuckets.length > 0) {
                        if (!this.executionResult.availableBuckets.includes(this.selectedBucket)) {
                            this.selectedBucket = this.executionResult.availableBuckets[0];
                        }
                    }
                    if (this.executionResult.availableChartTypes.length > 0) {
                        if (!this.executionResult.availableChartTypes.includes(this.selectedChartType)) {
                            this.selectedChartType = this.executionResult.availableChartTypes[0];
                        }
                    }
                    if (this.executionResult.availableMetrics.length > 0) {
                        var self = this;
                        var metricFound = self.selectedResultMetric.length > 0 && this.executionResult.availableMetrics.some(function(item) {
                            return item.value === self.selectedResultMetric[0];
                        });

                        if (!metricFound) {
                            this.selectedResultMetric = [this.executionResult.availableMetrics[0].value];
                        }
                    }
                },
                refreshChartOptions: function() {
                    if (this.selectedChartType && AVAILABLE_CHART_TYPES.includes(this.selectedChartType)) {
                        this["chartHandler_" + this.selectedChartType]();
                    }
                },
                refreshTable: function() {
                    this.refreshTimeTableRows();
                }
            }
        };
    };

    var ExecutionResultWidgetMixin = function(modelId) {
        return {
            mixins: [
                ExecutionResultChartMixin
            ],
            props: {
                data: {
                    type: Object,
                    default: function() {
                        return {};
                    }
                }
            },
            data: function() {
                return {
                    selectedResultMetric: [],
                    selectedChartType: null,
                    executionResult: window[modelId].executionResultFactory.defaultState
                };
            },
            computed: {
                currentPeriod: function() {
                    return this.$store.getters["countlyCommon/period"];
                },
                selectedBucket: {
                    get: function() {
                        if (this.data.dashData) {
                            if (this.data.dashData.buckets) {
                                return this.data.dashData.buckets[0];
                            }
                            else if (this.data.dashData.data && this.data.dashData.data[0] && this.data.dashData.data[0].subtask_key) {
                                return this.data.dashData.data[0].subtask_key;
                            }
                        }
                        return "daily";
                    },
                    set: function() {
                        // The value is read-only in widgets, this is just to omit set calls.
                    }
                },
                blankMessage: function() {
                    var timeSeries = this.executionResult.getTimeSeries();
                    if (timeSeries.error) {
                        return timeSeries.label;
                    }
                    return CV.i18n('common.graph.no-data');
                },
                status: function() {
                    if (this.executionResult) {
                        return this.executionResult.status;
                    }
                    return "error";
                },
                isProcessing: function() {
                    return this.data && this.data.dashData && this.data.dashData.isProcessing;
                },
                legendLabels: function() {

                    if (!this.isChartAvailable || !["timeSeries", "bar"].includes(this.selectedChartType)) {
                        return {};
                    }

                    var graphData = this.selectedChartType === "timeSeries" ? this.timeSeriesOptions : this.barOptions;
                    var series = graphData.series;

                    return series.reduce(function(acc, val) {
                        if (!acc[val.app]) {
                            acc[val.app] = [];
                        }

                        acc[val.app].push({
                            appId: val.app,
                            color: val.color,
                            label: val.name
                        });

                        return acc;
                    }, {});
                },
            },
            watch: {
                'executionResult': function() {
                    this.reorganizeData();
                },
                'currentPeriod': function() {
                    this.reorganizeData();
                },
                "data.dashData": function(newVal) {
                    this.prepData(newVal);
                }
            },
            mounted: function() {
                if (this.data && this.data.dashData) {
                    this.prepData(this.data.dashData);
                }
            },
            methods: {
                prepData: function(val) {
                    var self = this;
                    this.convertToExecutionResult(val).then(function(executionResult) {
                        self.executionResult = executionResult;
                    });
                },
                reorganizeData: function() {
                    if (this.data.allowPeriodOverride) {
                        if (this.executionResults) {
                            var self = this;
                            this.executionResults.forEach(function(res) {
                                res.reorganizeRanges(countlyCommon, self.data.comparison);
                            });
                        }
                        else {
                            this.executionResult.reorganizeRanges(countlyCommon, this.data.comparison);
                        }
                    }
                    this.checkResultModifiers();
                    this.refreshChartOptions();
                    if (this.dataChanged) {
                        this.dataChanged();
                    }
                },
                checkResultModifiers: function() {
                    if (this.executionResult.availableBuckets.length > 0) {
                        if (!this.executionResult.availableBuckets.includes(this.selectedBucket)) {
                            this.selectedBucket = this.executionResult.availableBuckets[0];
                        }
                    }
                    this.selectedChartType = "timeSeries";
                    if (this.data.visualization && this.data.visualization !== "line" && this.data.visualization !== "series") {
                        this.selectedChartType = this.data.visualization;
                    }
                    //
                    // else if (this.executionResult.availableChartTypes.length > 0) {
                    //     if (!this.executionResult.availableChartTypes.includes(this.selectedChartType)) {
                    //         this.selectedChartType = this.executionResult.availableChartTypes[0];
                    //     }
                    // }
                    if (this.data.metric) {
                        this.selectedResultMetric = this.data.metric;
                    }
                    else if (this.executionResult.availableMetrics.length > 0) {
                        var self = this;
                        var metricFound = this.executionResult.availableMetrics.some(function(item) {
                            return self.selectedResultMetric.includes(item.value);
                        });

                        if (!metricFound) {
                            this.selectedResultMetric = [this.executionResult.availableMetrics[0].value];
                        }
                    }
                },
                refreshChartOptions: function() {
                    if (this.selectedChartType && AVAILABLE_CHART_TYPES.includes(this.selectedChartType)) {
                        this["chartHandler_" + this.selectedChartType]();
                    }
                }
            }
        };
    };

    var CurrentDocumentWithTasksMixin = function(modelId) {
        return {
            data: function() {
                return {
                    // Flags
                    isLoadingTask: false,
                    isMounted: false,

                    // Misc
                    docNameTimecode: moment().format("DD-MM-YYYY-HH:mm:ss"),

                    // Custom datepicker
                    usesCustomDatepicker: false,
                    customDatepickerVal: "30days",

                    // Document instances
                    lastSavedDoc: null,
                    lastExecutedDoc: null,
                    currentDoc: window[modelId].documentFactory.create(),
                    modelId: '',
                    selectedChartType: null
                };
            },
            computed: {
                taskDescription: function() {
                    var periodObj = this.executionResult.commonInstance.periodObj;

                    // var taskData = countlyTaskManager.getResult(this._task);
                    // if (taskData && taskData.taskgroup === true) {
                    //     periodObj = countlyCommon.calcSpecificPeriodObj("732days", taskData.end);
                    // }
                    if (periodObj.currentPeriodArr && periodObj.currentPeriodArr.length === 1) { //daily: today, yesterday
                        return this.i18n('drill.task-period-remind') + ' ' + periodObj.currentPeriodArr[0] + " 00:00" + " - " + "23:59";
                    }
                    else { // N days: 7days, 30days, 90days, or date from datepicker
                        var periodList = periodObj.currentPeriodArr;
                        var start = new moment(periodList[0], 'YYYY.MM.DD');
                        var end = new moment(periodList[periodList.length - 1], 'YYYY.MM.DD');
                        var endString = end.locale(countlyCommon.BROWSER_LANG_SHORT).format('DD MMMM YYYY');
                        var startStringFormat = '';
                        if (start.year() !== end.year()) {
                            startStringFormat = 'YYYY';
                            startStringFormat = 'MMMM ' + startStringFormat;
                        }
                        else {
                            if (start.month() !== end.month()) {
                                startStringFormat = 'MMMM ' + startStringFormat;
                            }
                        }
                        startStringFormat = 'DD ' + startStringFormat;
                        var startString = start.locale(countlyCommon.BROWSER_LANG_SHORT).format(startStringFormat);
                        return periodObj.currentPeriodArr.length > 0 ?
                            this.i18n('drill.task-period-remind') + ' ' + startString + ' - ' + endString :
                            this.i18n('drill.task-none-period-remind') + ' ' + endString;
                    }
                },
                fullDocName: function() {
                    if (this.executionResult.isTask) {
                        return this.executionResult.taskPayload.report_name;
                    }
                    if (this.isAnonymous) {
                        return this.currentDoc.name + " [" + this.docNameTimecode + "]";
                    }
                    if (this.isDirty && !this.isAnonymous) {
                        return this.currentDoc.name + " [Draft: " + this.docNameTimecode + "]";
                    }
                    return this.currentDoc.name;
                },
                isAnonymous: function() {
                    return !this.currentDoc.id;
                },
                isDirty: function() {
                    if (!this.lastSavedDoc || !this.isMounted) {
                        return false;
                    }
                    return !this.currentDoc.equals(this.lastSavedDoc);
                },
            },
            mounted: function() {
                this.isMounted = true;
            },
            methods: {
                refreshDocNameTimecode: function() {
                    this.docNameTimecode = moment().format("DD-MM-YYYY-HH:mm:ss");
                },
                exitTaskMode: function() {
                    this.$store.dispatch(modelId + "/main/switchToDefaultExecutionResult");
                    this.updatePath();
                    this.currentDoc.anonymize();
                },
                onLoadTask: function(task) {
                    var self = this;
                    this.updatePath({
                        task: task
                    });
                    this.isLoadingTask = true;
                    window[modelId].executionResultFactory.fromTask(task._id).then(function(executionResult) {
                        self.$store.dispatch(modelId + "/main/switchExecutionResult", executionResult);
                        self.setCurrentDocument(window[modelId].documentFactory.fromExecutionResult(executionResult), true);
                        setTimeout(function() {
                            // A small hack to freeze isStale watcher for a while
                            self.isLoadingTask = false;
                        }, 500);
                    });
                },
                execute: function() {
                    var self = this;
                    if (this.executionResult.isTask) {
                        countlyCommon.setPeriod(this.customDatepickerVal);
                    }
                    this.$store.dispatch(modelId + "/main/executeDocument", {
                        currentDoc: this.currentDoc,
                        report_name: this.fullDocName
                    }).then(function(executionResult) {
                        if (executionResult.status !== "ready") {
                            self.refreshDocNameTimecode(); // Leave the previous one to the task
                        }
                    });
                    if (this.currentDoc._filter.byVal[0] && this.currentDoc.useBreakdown === true) {
                        this.selectedChartType = "bar";
                    }
                    this.modelId = modelId;
                    this.updatePath();
                },
                onCustomDatepickerChange: function(payload) {
                    countlyCommon.setPeriod(payload.value);
                    this.usesCustomDatepicker = false;
                    this.exitTaskMode();
                }
            },
            watch: {
                'isStale': function(newVal) {
                    if (!this.isLoadingTask && newVal && this.executionResult.isTask) {
                        this.exitTaskMode();
                    }
                }
            },
        };
    };

    var bucketConverters = {
        "single": {
            parse: function(bucket) {
                var split = bucket.split("--");
                return [moment(split[0], 'YYYY.M.D'), moment(split[1], 'YYYY.M.D')];
            },
            unparse: function(rangeObj) {
                return rangeObj[0].format('YYYY.M.D') + "--" + rangeObj[1].format('YYYY.M.D');
            },
            label: function(rangeObj) {
                return countlyCommon.formatDate(rangeObj[0], 'D MMM YYYY') + " - " + countlyCommon.formatDate(rangeObj[1], 'D MMM YYYY');
            }
        },
        "hourly": {
            parse: function(bucket) {
                return moment(bucket, 'YYYY.M.D.[h]H');
            },
            unparse: function(momentObj) {
                return momentObj.format('YYYY.M.D.[h]H');
            },
            label: function(momentObj) {
                return countlyCommon.formatDate(momentObj, 'D MMM YYYY H:mm');
            }
        },
        "daily": {
            parse: function(bucket) {
                return moment(bucket, 'YYYY.M.D');
            },
            unparse: function(momentObj) {
                return momentObj.format('YYYY.M.D');
            },
            label: function(momentObj) {
                return countlyCommon.formatDate(momentObj, 'D MMM YYYY');
            }
        },
        "weekly": {
            parse: function(bucket) {
                return moment(bucket, 'GGGG.[w]W');
            },
            unparse: function(momentObj) {
                return momentObj.isoWeekYear() + ".w" + momentObj.isoWeek();
            },
            label: function(momentObj) {
                return "W" + momentObj.isoWeek() + " " + momentObj.isoWeekYear();
            }
        },
        "monthly": {
            parse: function(bucket) {
                return moment(bucket, 'YYYY.[m]M');
            },
            unparse: function(momentObj) {
                return momentObj.format('YYYY.[m]M');
            },
            label: function(momentObj) {
                return countlyCommon.formatDate(momentObj, 'MMM YYYY');
            }
        }
    };

    /**
     * A wrapper class for time series data
     * Makes the data access less painful
     * @param {Object} options Options object
     * @param {Boolean} skipBucketMapGeneration Prevents bucket map generation when true
     */
    function TimeSeries(options, skipBucketMapGeneration) {
        options = options || {};
        if (options.error) {
            this.buckets = {};
            this.values = {};
            this.bucketsMap = {};
            this.label = options.label || "";
            this.error = true;
        }
        else {
            this.label = options.label || "";
            this.buckets = options.buckets || {};
            this.values = options.values || {};
            if (!skipBucketMapGeneration) {
                this._updateBucketsMap();
            }
            else {
                this.bucketsMap = options.bucketsMap;
            }
        }
    }

    TimeSeries.prototype.padZerosUntil = function(level, metric, offset, dir) {
        if (!this.values[level]) {
            this.values[level] = {};
        }
        if (!this.values[level][metric]) {
            this.values[level][metric] = [];
        }
        dir = dir || "right";
        for (var i = 0; i < offset; i++) {
            if (dir === "right") {
                this.values[level][metric].push(0);
            }
            else {
                this.values[level][metric].unshift(0);
            }
        }
    };

    TimeSeries.prototype.copyValuesFrom = function(other) {
        var self = this;
        Object.keys(other.buckets).forEach(function(level) {
            var offset = self.buckets[level].indexOf(other.buckets[level][0]);
            if (offset === -1) {
                return;
            }
            Object.keys(other.values[level]).forEach(function(metric) {
                self.padZerosUntil(level, metric, offset);
                for (var i = 0; self.buckets[level][offset + i]; i++) {
                    self.values[level][metric].push(other.values[level][metric][i]);
                }
            });
        });
    };

    TimeSeries.prototype.clip = function(startMs, endMs, strict) {
        var other = {
            label: this.label,
            buckets: {},
            values: {},
            bucketsMap: {}
        };
        for (var bucket in this.bucketsMap) {
            var sub = this.bucketsMap[bucket],
                globalStart = sub[0].parsed.valueOf(),
                //globalEnd = sub[sub.length - 1].parsed.valueOf(),
                start = startMs,
                end = endMs;

            var outOfBounds = globalStart >= start; // || (end - globalEnd) > 2 * 86400000; // TODO(vck): Check

            if (strict && outOfBounds) {
                return new TimeSeries({
                    label: CV.i18n('dashboards.widget-warning.time', sub[0].parsed.format("LLL"), sub[sub.length - 1].parsed.format("LLL")),
                    error: true
                });
            }

            if (outOfBounds) {
                var newInst = new TimeSeries();
                newInst.generateBuckets(Object.keys(this.buckets), start, end);
                newInst.copyValuesFrom(this);
                return newInst;
            }
            else {
                var startCursor, endCursor;

                for (startCursor = 0 ; startCursor < sub.length ; startCursor++) {
                    if (sub[startCursor].parsed.valueOf() >= start) {
                        break;
                    }
                }
                for (endCursor = sub.length - 1; endCursor > 0 ; endCursor--) {
                    if (sub[endCursor].parsed.valueOf() <= end) {
                        break;
                    }
                }

                startCursor = Math.max(0, startCursor - 1); // TODO(vck): Check

                other.bucketsMap[bucket] = this.bucketsMap[bucket].slice(startCursor, endCursor);
                other.buckets[bucket] = this.buckets[bucket].slice(startCursor, endCursor);
                other.values[bucket] = {};
                for (var metricKey in this.values[bucket]) {
                    other.values[bucket][metricKey] = this.values[bucket][metricKey].slice(startCursor, endCursor);
                }
            }
        }
        return new TimeSeries(other, true);
    };

    TimeSeries.prototype._updateBucketsMap = function() {
        var self = this;
        this.bucketsMap = Object.keys(this.buckets).reduce(function(acc, bucketKey) {
            var conv = bucketConverters[bucketKey];
            var bucketsArr = self.buckets[bucketKey];
            acc[bucketKey] = bucketsArr.map(function(bucket) {
                var parsed = conv.parse(bucket);
                return {
                    raw: bucket,
                    parsed: parsed,
                    formatted: conv.label(parsed),
                    sortBy: Array.isArray(parsed) ? parsed[0].unix() : parsed.unix()
                };
            });
            return acc;
        }, {});
    };

    TimeSeries.prototype.setBuckets = function(buckets) {
        this.buckets = buckets;
        this._updateBucketsMap();
    };

    TimeSeries.prototype.generateBuckets = function(buckets, start, end) {
        var bucketsInRange = {},
            stepSize = "day",
            mCursor = moment(start),
            mEnd = moment(end);

        if (buckets.includes("hourly")) {
            stepSize = "hour";
        }
        else if (buckets.includes("daily")) {
            stepSize = "day";
        }
        else if (buckets.includes("weekly")) {
            stepSize = "week";
        }
        else if (buckets.includes("monthly")) {
            stepSize = "month";
        }

        while (mCursor < mEnd) {
            buckets.forEach(function(bucketType) {
                if (!bucketsInRange[bucketType]) {
                    bucketsInRange[bucketType] = {};
                }
                var bObj = bucketConverters[bucketType].unparse(mCursor);
                bucketsInRange[bucketType][bObj] = true;
            });
            mCursor.add(1, stepSize);
        }

        buckets.forEach(function(bucketType) {
            bucketsInRange[bucketType] = Object.keys(bucketsInRange[bucketType]);
        });

        this.setBuckets(bucketsInRange);
    };

    TimeSeries.prototype.getBuckets = function(bucketType) {
        if (!bucketType) {
            return this.buckets;
        }
        return this.buckets[bucketType];
    };

    TimeSeries.prototype.getBucketsMap = function(bucketType) {
        if (!bucketType) {
            return this.bucketsMap;
        }
        return this.bucketsMap[bucketType];
    };

    TimeSeries.prototype.setValues = function(values) {
        this.values = values;
    };

    TimeSeries.prototype.getValues = function(bucketType, metric) {
        if (!bucketType) {
            return this.values;
        }
        if (!metric) {
            return this.values[bucketType];
        }
        if (!this.values[bucketType]) {
            return [];
        }
        return this.values[bucketType][metric];
    };

    TimeSeries.prototype.getMetricKeys = function(bucketType) {
        if (!this.values || !this.values[bucketType]) {
            return [];
        }
        return Object.keys(this.values[bucketType]);
    };

    TimeSeries.prototype.hasValues = function(bucketType, metric) {
        if (bucketType && !metric) {
            return Object.prototype.hasOwnProperty.call(this.values, bucketType);
        }
        if (bucketType && metric) {
            if (!this.values[bucketType]) {
                return false;
            }
            return Object.prototype.hasOwnProperty.call(this.values[bucketType], metric);
        }
        return false;
    };


    /**
     * Wraps execution information with meta data and response payload.
     * 
     * The primary objective of the class is to place a middle man that is responsible for
     * unification of the result and post-processing the payload. 
     * 
     * This is an immutable class by definition, since a result cannot be altered (except the 
     * internal post-processing).
     * 
     * @param {object} options DTO
     * @param {Function} onResponse Function called with ExecutionResult instance after initialization, basically for modifying result object
     */
    function ExecutionResult(options, onResponse) {
        options = options || {};
        this.title = options.title || "";
        this.status = options.status || "empty";
        this.payload = options.payload || {};
        this.err = options.err || null;
        this.taskId = options.taskId || null;
        this.isTask = !!this.taskId;
        this.requestPayload = options.requestPayload || {};
        this.taskPayload = options.taskPayload || {};
        this.effectiveRange = "30days";
        this.commonInstance = countlyCommon;
        this.timeSeries = {};
        this.timeSeriesRaw = {};
        this.availableMetrics = [];
        this.totals = this.payload.totals || {};
        this.availableBuckets = this.payload.buckets || [];
        this.availableSegments = [];
        this.availableChartTypes = ["timeSeries"];
        if (onResponse) {
            onResponse(this);
        }
    }

    ExecutionResult.prototype.reorganizeRanges = function(commonInstance, comparisonStrategy) {
        if (Object.keys(this.timeSeriesRaw).length === 0) {
            // First backup the raw, if haven't been done before
            Object.assign(this.timeSeriesRaw, this.timeSeries);
        }
        var currentStart = commonInstance.periodObj.start,
            currentEnd = commonInstance.periodObj.end;

        this.timeSeries.current = this.timeSeriesRaw.current.clip(currentStart, currentEnd, true);

        if (!comparisonStrategy || comparisonStrategy === "none") {
            return this;
        }

        var previousStart, previousEnd;

        if (comparisonStrategy === 'previous-period') {
            previousStart = moment(currentStart).subtract(currentEnd - currentStart, "ms").valueOf();
            previousEnd = moment(currentEnd).subtract(currentEnd - currentStart, "ms").valueOf();
            this.timeSeries.previous = this.timeSeriesRaw.current.clip(previousStart, previousEnd, false);
        }
        else if (comparisonStrategy === 'previous-year') {
            previousStart = moment(currentStart).subtract(1, "y").valueOf();
            previousEnd = moment(currentEnd).subtract(1, "y").valueOf();
            this.timeSeries.previous = this.timeSeriesRaw.current.clip(previousStart, previousEnd, false);
        }
        this.timeSeries.previous.label = CV.i18n("common." + comparisonStrategy);
        return this;
    };

    ExecutionResult.prototype.initTimeSeries = function(period, label) {
        period = period || "current";
        if (!this.timeSeries[period]) {
            this.timeSeries[period] = new TimeSeries({label: label});
        }
    };

    ExecutionResult.prototype.getTimeSeries = function(period) {
        period = period || "current";
        if (period === "current" && !this.timeSeries[period]) {
            this.initTimeSeries();
        }
        return this.timeSeries[period];
    };

    ExecutionResult.prototype.getAllTimeSeries = function() {
        return this.timeSeries;
    };

    ExecutionResult.prototype.fetchSegmentNames = function() {
        if (this.metaInitPromise) {
            return this.metaInitPromise;
        }
        if (this.status !== "ready" || !this.hasProjection || this.segmentNamesMap) {
            return Promise.resolve(this);
        }
        var self = this;
        this.drillMeta = countlyDrillMeta.getContext(this.requestPayload.event);
        this.metaInitPromise = this.drillMeta.initialize().then(function() {
            self.segmentNamesMap = Object.keys(self.payload.segments).reduce(function(acc, segmentId) {
                var segment = self.payload.segments[segmentId];
                acc[segmentId] = Object.keys(segment.keys).map(function(segKey) {
                    // Replace falsy values with NA
                    var label = self.drillMeta.getUserPropertyLongName(segKey, segment.keys[segKey]);
                    if (!label || label === "null") {
                        label = CV.i18n('events.overview.unknown');
                    }
                    return label;
                }).join(" | ");
                return acc;
            }, {});

            self.availableSegments.forEach(function(seg) {
                seg.label = self.segmentNamesMap[seg.value];
            });
            return self;
        });
        return this.metaInitPromise;
    };

    ExecutionResult.prototype.getSegmentName = function(segmentValue, segmentKey) {
        if (segmentKey) {
            return this.drillMeta.getMultiUserPropertyLongName(segmentKey, segmentValue) || segmentValue;
        }

        if (this.segmentNamesMap && (segmentValue in this.segmentNamesMap)) {
            return this.segmentNamesMap[segmentValue];
        }
        return segmentValue;
    };

    var createDocumentFactory = function(options) {
        var createFn = function(createOpts) {
            return options.create(createOpts);
        };
        return {
            create: createFn,
            fromSaved: function(savedObj) {
                return createFn(options.fromSaved(savedObj));
            },
            fromExecutionResult: function(executionResult) {
                return createFn(options.fromExecutionResult(executionResult));
            }
        };
    };

    var createExecutionResultFactory = function(options) {
        var createFn = function(dto) {
            var res = new ExecutionResult(dto, options.onResponse);
            if (options.needsSegments) {
                return res.fetchSegmentNames().then(function(instance) {
                    return Object.freeze(instance);
                });
            }
            else {
                return Promise.resolve(Object.freeze(res));
            }
        };
        return {
            create: createFn,
            fromTask: function(taskId) {
                return new Promise(function(resolve, reject) {
                    countlyTaskManager.fetchResult(taskId, function(taskDoc) {
                        if (!taskDoc) {
                            return reject(createFn({
                                "status": "error",
                                "err": "Task fetch error.",
                                "taskId": taskId,
                                "requestPayload": {}
                            }));
                        }
                        resolve(createFn({
                            "status": "ready",
                            "payload": taskDoc.data,
                            "taskId": taskId,
                            "requestPayload": taskDoc.request.json,
                            "taskPayload": taskDoc
                        }));
                    });
                });
            },
            fromCustom: function(requestPayload, payload, taskDoc) {
                return createFn({
                    "status": taskDoc.errormsg ? "error" : "ready",
                    "payload": payload,
                    "taskId": taskDoc && taskDoc._id,
                    "requestPayload": requestPayload,
                    "taskPayload": taskDoc
                });
            },
            defaultState: Object.freeze(new ExecutionResult())
        };
    };

    var createCompanionModule = function(moduleName, options) {

        var mainEmptyStateFn = function() {
            return {
                executionResult: options.executionResultFactory.defaultState,
                ready: true
            };
        };

        var mainMutations = {
            setExecutionResult: function(state, executionResult) {
                state.executionResult = executionResult;
            },
            setReadiness: function(state, ready) {
                state.ready = ready;
            }
        };

        var mainGetters = {
            isReady: function(state) {
                return state.ready;
            }
        };

        var mainActions = {
            initialize: function() {
                //
            },
            refresh: function() {
                //
            },
            switchExecutionResult: function(context, executionResult) {
                context.commit("setExecutionResult", executionResult);
                context.commit("setReadiness", true);
            },
            switchToDefaultExecutionResult: function(context) {
                context.dispatch("switchExecutionResult", options.executionResultFactory.defaultState);
            },
            executeDocument: function(context, payload) {
                context.commit("setReadiness", false);

                return options.onExecute(payload, options.executionResultFactory).then(function(executionResult) {
                    context.dispatch("switchExecutionResult", executionResult);
                    return executionResult;
                });
            }
        };

        var mainModule = countlyVue.vuex.Module("main", {
            state: mainEmptyStateFn,
            getters: mainGetters,
            actions: mainActions,
            mutations: mainMutations
        });

        return countlyVue.vuex.Module(moduleName, {
            submodules: [mainModule]
        });
    };

    var extendModel = function(modelRef, options) {
        modelRef.documentFactory = createDocumentFactory({
            create: options.createDoc,
            fromSaved: options.createDocFromSaved,
            fromExecutionResult: options.createDocFromExecutionResult
        });
        modelRef.executionResultFactory = createExecutionResultFactory({
            onResponse: options.onResponse,
            needsSegments: options.needsSegments
        });
        modelRef.getVuexModule = function() {
            return createCompanionModule(options.name, {
                onExecute: options.onExecute,
                executionResultFactory: modelRef.executionResultFactory
            });
        };
    };

    var BUCKETS_DEFAULT_ORDER = {"hourly": 0, "daily": 1, "weekly": 2, "monthly": 3, "single": 4};

    window.countlyDrillCommons = {
        views: {
            CurrentDocumentWithTasksMixin: CurrentDocumentWithTasksMixin,
            ExecutionResultViewMixin: ExecutionResultViewMixin,
            ExecutionResultWidgetMixin: ExecutionResultWidgetMixin
        },
        models: {
            extendModel: extendModel
        },
        utils: {
            getAvailableBuckets: function(commonInstance, supportsSingle) {
                var selectedBuckets = {"weekly": true, "monthly": true};
                var numberOfDays = commonInstance.periodObj.numberOfDays;
                if (numberOfDays <= 14) {
                    selectedBuckets.hourly = true;
                }
                if (numberOfDays <= 366) {
                    selectedBuckets.daily = true;
                }
                if (supportsSingle) {
                    selectedBuckets.single = true;
                }

                var buckets = Object.keys(selectedBuckets);

                buckets.sort(function(a, b) {
                    return BUCKETS_DEFAULT_ORDER[a] - BUCKETS_DEFAULT_ORDER[b];
                });

                return buckets;
            },
            alignExecutionResults: function(executionResults, levels, period) {
                levels.forEach(function(level) {
                    var localMin = Number.MAX_SAFE_INTEGER,
                        earliestTs = null;

                    executionResults.forEach(function(res) {
                        if (!res.timeSeries[period].bucketsMap[level]) {
                            return;
                        }
                        var first = res.timeSeries[period].bucketsMap[level][0];
                        if (first.sortBy < localMin) {
                            localMin = first.sortBy;
                            earliestTs = res;
                        }
                    });

                    if (!earliestTs) {
                        return;
                    }

                    executionResults.forEach(function(res) {
                        if (res === earliestTs || !res.timeSeries[period].bucketsMap[level]) {
                            return;
                        }
                        var current = res.timeSeries[period];
                        var earliest = earliestTs.timeSeries[period];
                        var offset = earliest.buckets[level].indexOf(current.buckets[level][0]);
                        if (offset <= 0) {
                            return;
                        }
                        current.buckets[level] = earliest.buckets[level].slice(0, offset).concat(current.buckets[level]);
                        current.bucketsMap[level] = earliest.bucketsMap[level].slice(0, offset).concat(current.bucketsMap[level]);
                        Object.keys(current.values[level]).forEach(function(metric) {
                            current.padZerosUntil(level, metric, offset, "left");
                        });
                    });
                });
            }
        }
    };

}());