/* global Vue, countlyCommon, countlyLocation, _mergeWith, CommonConstructor, countlyGlobal, Vue2Leaflet, CV, moment, L, countlyGraphNotesCommon */
// _mergeWith is Lodash mergeWith - /frontend/express/public/javascripts/utils/lodash.mergeWith.js

(function(countlyVue) {

    var countlyBaseComponent = countlyVue.components.BaseComponent,
        _mixins = countlyVue.mixins;

    var FONT_FAMILY = "Inter";

    /**
     * legendOptions depends on calculatedLegend and legend
     * mergedOptions depends on legendOptions
     * chartOptions depends on mergedOptions
     * chartOptions also calls patchChart which intern calls patchZoom and patchLegend
     * patchZoom internally calls patchZoom of Zoom component
     * patchLegend depends on legendOptions
     */
    var EchartRefMixin = {
        data: function() {
            return {
                echartRef: null
            };
        },
        mounted: function() {
            this.echartRef = this.$parent.$refs.echarts;
        }
    };

    var LegendMixin = {
        data: function() {
            return {
                calculatedLegend: {
                    show: true,
                    type: "secondary",
                    data: [],
                    position: "bottom"
                }
            };
        },
        computed: {
            legendOptions: function() {
                var options = _mergeWith({}, this.calculatedLegend, this.legend || {});

                delete options.data;

                if (this.legend && this.legend.data && this.legend.data.length) {
                    options.data = JSON.parse(JSON.stringify(this.legend.data));
                }
                else {
                    options.data = JSON.parse(JSON.stringify(this.calculatedLegend.data));
                }

                /**
                 * There is an issue.
                 *
                 * So we calculate calculatedLegend.data from the series right.
                 * And this.legend is independent.
                 *
                 * Sometimes what happens is that there is a delay in the change of
                 * this.legend as compared to the calculatedLegend. So lets say chartOptions
                 * and legend both are to be changed, but this.legend changes after chartOptions.
                 * So this creates an inconsistent state between the values of calculatedLegend
                 * and this.legend. While calculatedLegend is latest, this.legend is old as this.legend
                 * hasn't changed yet from the parent.
                 *
                 * But this inconsistent state is very hard to catch in the UI as shortly
                 * after this.legend changes and hence both calculatedLegend and this.legend are the same.
                 */

                for (var i = 0; i < options.data.length; i++) {
                    var currLegend = options.data[i];
                    // eslint-disable-next-line no-loop-func
                    var legend = this.calculatedLegend.data.find(function(l) {
                        return l.name === currLegend.name;
                    });

                    if (legend) {
                        currLegend.color = legend.color;
                        currLegend.displayColor = legend.color;
                    }
                }
                return options;
            }
        },
        methods: {
            setCalculatedLegendData: function(opt, series) {
                var data = [];
                var colorIndex = 0;
                var obj = {}, color;
                var colors = opt.color;

                for (var i = 0; i < series.length; i++) {
                    var seriesData = series[i];
                    var dataSum = 0;

                    if (seriesData.type === "pie") {
                        seriesData = seriesData.data;

                        dataSum = seriesData.reduce(function(acc, val) {
                            acc += val.value;
                            return acc;
                        }, 0);

                        for (var j = 0; j < seriesData.length; j++) {
                            color = seriesData[j].color;

                            if (!color) {
                                color = colors[colorIndex];
                                colorIndex++;
                            }

                            obj = {
                                name: seriesData[j].name,
                                color: color,
                                percentage: ((seriesData[j].value / dataSum) * 100).toFixed(1)
                            };

                            data.push(obj);
                        }
                    }
                    else {
                        color = seriesData.color;

                        if (!color) {
                            color = colors[colorIndex];
                            colorIndex++;
                        }

                        obj = {
                            name: seriesData.name,
                            color: color
                        };

                        data.push(obj);
                    }
                }

                this.calculatedLegend.data = data;

                //Set default legend show to false
                opt.legend.show = false;

                return data;
            },
            patchLegend: function(chartOpt) {
                var echartRef = this.$refs.echarts;
                var legend = this.$refs.legend;

                if (echartRef && legend) {
                    var oldChartOpt = echartRef.getOption();

                    if (Array.isArray(oldChartOpt.legend)) {
                        var oldSelected = oldChartOpt.legend.find(function(item) {
                            return item.id === "__chartLegend";
                        });

                        if (oldSelected && oldSelected.selected) {
                            var legendOptions = this.legendOptions;
                            for (var i = 0; i < legendOptions.data.length; i++) {
                                var leg = legendOptions.data[i];
                                if (oldSelected.selected[leg.name] === false) {
                                    chartOpt.legend.selected[leg.name] = false;
                                }
                            }
                        }
                    }
                }

                return chartOpt;
            }
        }
    };

    var ZoomMixin = {
        methods: {
            onDataZoom: function(event) {
                if (this.$refs.header && this.$refs.header.$refs.zoom) {
                    this.$refs.header.$refs.zoom.onZoomFinished(event);
                }

                this.$emit("datazoom", event);
            },
            patchZoom: function(chartOpt) {
                var echartRef = this.$refs.echarts;
                var header = this.$refs.header;

                if (echartRef && header) {
                    var oldChartOpt = echartRef.getOption();
                    if (Array.isArray(oldChartOpt.dataZoom)) {
                        var dataZoom = oldChartOpt.dataZoom[0];

                        /**
                         * Since patchZoom depends on the headers isZoom state,
                         * therefore, the computed property calling patchZoom function,
                         * will be re-computed after the headers isZoom state is updated.
                         */
                        if (dataZoom && header.isZoom) {
                            chartOpt.dataZoom[0].start = dataZoom.start;
                            chartOpt.dataZoom[0].end = dataZoom.end;

                            var self = this;
                            this.$nextTick(function() {
                                self.$nextTick(function() {
                                    if (header.$refs.zoom) {
                                        header.$refs.zoom.patchZoom(false);
                                    }
                                    self.$emit("patchzoom");
                                });
                            });
                        }
                    }
                }
                return chartOpt;
            }
        }
    };

    var ExternalZoomMixin = {
        data: function() {
            /**
             * Usage of external zoom component -
             * <cly-chart-zoom ref="zoomRef" v-if="showZoom" @zoom-reset="onZoomReset" :echartRef="$refs.echartRef && $refs.echartRef.$refs && $refs.echartRef.$refs.echarts" class="bu-is-flex bu-is-align-items-center bu-is-justify-content-flex-end bu-m-0 cly-vue-zoom__external"></cly-chart-zoom>
             * <cly-chart-line ref="echartRef" @patchzoom="onPatchZoom" @datazoom="onDataZoom" :show-zoom="false"></cly-chart-line>
             *
             * For external zoom to work, you need to ensure following things -
             * 1. Refer to the usage above for using the chart zoom component.
             * 2. Hide anything that should not be visible in the zoomed view in the same row as zoom status.
             * 3. Add a ref to your chart titled as 'echartRef' as mentioned above.
             * 4. On your chart listen to these events - 'patchzoom' and 'datazoom' as mentioned above.
             * 5. Default zoom of the chart should be disabled by setting :show-zoom="false"
             */
            return {
                showZoom: false,
            };
        },
        methods: {
            triggerZoom: function() {
                var self = this;
                this.showZoom = true;
                setTimeout(function() {
                    self.$nextTick(function() {
                        self.$nextTick(function() {
                            if (self.$refs.zoomRef) {
                                self.onTriggerZoom();
                            }
                            else {
                                var interval = setInterval(function() {
                                    if (self.$refs.zoomRef) {
                                        self.onTriggerZoom();
                                        clearInterval(interval);
                                    }
                                }, 50);
                            }
                        });
                    });
                }, 0);
            },
            onTriggerZoom: function() {
                /**
                 * Its very important to set headers isZoom to true.
                 * Bcz it triggers the internal chartOptions computed property
                 * of the chart.
                 * Which inturn dispatches patchzoom.
                 */
                this.$refs.zoomRef.onZoomTrigger();
                if (this.$refs.echartRef && this.$refs.echartRef.$refs.header) {
                    this.$refs.echartRef.$refs.header.isZoom = true;
                }
            },
            onZoomReset: function() {
                /**
                 * Its very important to set headers isZoom to true.
                 * Bcz it triggers the internal chartOptions computed property
                 * of the chart.
                 * Which inturn dispatches patchzoom.
                 */
                if (this.$refs.echartRef && this.$refs.echartRef.$refs.header) {
                    this.$refs.echartRef.$refs.header.isZoom = false;
                }
                this.showZoom = false;
            },
            onDataZoom: function() {
                this.$refs.zoomRef.onZoomFinished();
            },
            onPatchZoom: function() {
                this.$refs.zoomRef.patchZoom();
            },
            onWidgetCommand: function(event) {
                if (event === 'zoom') {
                    this.triggerZoom();
                    return;
                }
                return this.$emit('command', event);
            }
        }
    };


    var UpdateOptionsMixin = {
        data: function() {
            return {
                internalUpdateOptions: {
                    notMerge: true
                }
            };
        },
        computed: {
            echartUpdateOptions: function() {
                setTimeout(() => {
                    if (this.seriesType === 'line') {
                        this.getGraphNotes(); // when chart updated (date change etc.)
                    }
                }, 0);
                return _mergeWith({}, this.internalUpdateOptions, this.updateOptions || {});
            }
        }
    };

    var EventsMixin = {
        methods: {
            onSeriesChange: function(v) {
                this.seriesOptions.type = v;
                this.$emit("series-toggle", v);
                if (v === "bar") {
                    this.seriesOptions.markPoint.data = [];
                }
                if (v === "line") {
                    this.getGraphNotes();
                }
            }
        }
    };

    countlyVue.mixins.zoom = ExternalZoomMixin;

    /**
     * Merging default object into array of objects
     * @param {Object|Array} objValue The destination object
     * @param {Object|Array} srcValue The source object
     * @returns {Object|Array} merged object/array
    */
    function mergeWithCustomizer(objValue, srcValue) {
        if (Array.isArray(srcValue) && typeof objValue === 'object') {
            srcValue.forEach(function(value, index) {
                srcValue[index] = _mergeWith({}, objValue, value);
            });
            return srcValue;
        }
    }

    /**
     * Calculating width of text
     * @param {string} txt Text value to calculate width.
     * @param {string} fontname Font name of text
     * @param {int} fontsize Font size of text
     * @returns {int} calculated width
    */
    function getWidthOfText(txt, fontname, fontsize) {
        if (getWidthOfText.c === undefined) {
            getWidthOfText.c = document.createElement('canvas');
            getWidthOfText.ctx = getWidthOfText.c.getContext('2d');
        }
        var fontspec = fontsize + ' ' + fontname;
        if (getWidthOfText.ctx.font !== fontspec) {
            getWidthOfText.ctx.font = fontspec;
        }
        return getWidthOfText.ctx.measureText(txt).width;
    }

    var xAxisOverflowHandler = {
        data: function() {
            return {
                chartWidth: 0,
                chartHeight: 0
            };
        },
        props: {
            xAxisLabelOverflow: {
                type: String,
                default: 'auto',
                required: false
            }
        },
        methods: {
            patchOptionsForXAxis: function(opt) {
                var xAxisOverflowPatch = this.handleXAxisOverflow(opt, this.xAxisLabelOverflow, {
                    w: this.chartWidth,
                    h: this.chartHeight
                });
                if (xAxisOverflowPatch) {
                    opt = _mergeWith(opt, xAxisOverflowPatch);
                }
                return opt;
            },
            onChartFinished: function() {
                var ref = this.$refs.echarts;
                this.chartWidth = ref.getWidth();
                this.chartHeight = ref.getHeight();
            },
            handleXAxisOverflow: function(options, strategy, size) {
                if (strategy === "unset" || !options || !options.xAxis || !options.xAxis.data) {
                    return null;
                }
                var xAxis = options.xAxis;
                var labelW = Math.floor((size.w - 100) / (xAxis.data.length + 1));
                var maxLen = 0;
                var maxStr = "";

                if (xAxis.data.length) {
                    xAxis.data = xAxis.data.map(function(item) {
                        return countlyCommon.unescapeHtml(item);
                    });
                }
                xAxis.data.forEach(function(item) {
                    var str = "";
                    if (Array.isArray(item)) {
                        str = (item[1] || item[0] || "") + "";
                    }
                    else {
                        str = (item || "") + "";
                    }

                    if (str.length > maxLen) {
                        maxStr = str;
                    }

                    maxLen = Math.max(maxLen, str.length);
                });

                var longestLabelTextW = getWidthOfText(maxStr, FONT_FAMILY, "12px");
                var returnObj = {
                    xAxis: {
                        axisLabel: {
                            fontSize: 12,
                            interval: 0,
                            width: labelW,
                            rotate: 0,
                            overflow: "truncate",
                        }
                    }
                };
                if (longestLabelTextW > labelW) {
                    returnObj.xAxis.axisLabel.margin = -5;
                    returnObj.xAxis.axisLabel.overflow = "break";
                    returnObj.grid = {bottom: 40};

                    returnObj.xAxis.axisLabel.formatter = function(value) {
                        value = countlyCommon.encodeHtml(value);
                        var ellipsis = "...";
                        var lengthToTruncate = (Math.floor(maxLen / Math.ceil(longestLabelTextW / labelW)) * 2);
                        if (value.length > lengthToTruncate) {
                            return value.substr(0, lengthToTruncate - ellipsis.length) + ellipsis;
                        }
                        else {
                            return value;
                        }
                    };
                }
                return returnObj;
            }
        }
    };


    /*
        Use xAxis.axisLabel.showMinLabel to change visibility of minimum label
        Use xAxis.axisLabel.showMaxLabel to change visibility of maximum label
        Use xAxis.inverse to inverse the labels

        xAxis.data
        yAxis.data
        xAxis.boundaryGap - Sets some gap from both the edges of the graph of the corresponding axis

        Category data, available in type: 'category' axis.
        If type is not specified, but axis.data is specified, the type is auto set as 'category'.
        should notice that axis.data provides then value range of the 'category' axis.

        If it is auto collected from series.data, Only the values appearing in series.data can be collected.
        For example, if series.data is empty, nothing will be collected.

        - axisPointer - Automatically shown if tooltip.trigger = 'axis'

        - toolbox. feature - Besides the tools we provide, user-defined toolbox is also supported.

        - tooltip. trigger - Is item for charts that dont have category axis
        - tooltip. confine, tooltip. appendToBody - Used when there is overflow
        - tooltip. formatter - Tooltip content formatter
    */

    var BaseChart = _mixins.BaseContent.extend({
        mixins: [LegendMixin, ZoomMixin, UpdateOptionsMixin, EventsMixin],
        props: {
            height: {
                type: [Number, String],
                default: 440
            },
            autoresize: {
                type: Boolean,
                default: true
            },
            option: {
                type: Object,
                default: function() {
                    return {};
                }
            },
            showZoom: {
                type: Boolean,
                default: true
            },
            showToggle: {
                type: Boolean,
                default: false
            },
            showDownload: {
                type: Boolean,
                default: true
            },
            legend: {
                type: Object
            },
            updateOptions: {
                type: Object
            },
            forceLoading: {
                type: Boolean,
                default: false,
                required: false
            },
            valFormatter: {
                type: Function,
                default: countlyCommon.getShortNumber,
                required: false
            },
            skin: {
                type: String,
                default: "padded"
            },
            noEmpty: {
                type: Boolean,
                default: false
            },
            sortBy: {
                type: String,
                default: "value",
                required: false
            }
        },
        data: function() {
            var self = this;
            return {
                baseOptions: {
                    title: {
                        show: false
                    },
                    grid: {
                        top: 30,
                        bottom: 30,
                        left: 43,
                        right: 30,
                        containLabel: true
                    },
                    legend: {
                        id: "__chartLegend",
                        show: false,
                        type: 'scroll',
                        bottom: 10,
                        padding: 15,
                        itemGap: 25,
                        lineStyle: {
                            width: 0
                        },
                        textStyle: {
                            color: "#333C48",
                            fontSize: 12,
                            overflow: "truncate",
                        },
                        icon: "roundRect",
                        itemHeight: 6,
                        itemWidth: 12,
                        selected: {}
                    },
                    toolbox: {
                        id: "toolbox",
                        showTitle: false,
                        feature: {
                            saveAsImage: {
                                show: false
                            },
                            dataView: {
                                show: false
                            },
                            restore: {
                                show: false
                            },
                            dataZoom: {
                                show: true,
                                yAxisIndex: false,
                            },
                            magicType: {
                                show: false,
                                type: ['line', 'bar']
                            }
                        },
                        itemSize: 0,
                        top: 100,
                        left: 100,
                    },
                    tooltip: {
                        appendToBody: false,
                        confine: true,
                        show: true,
                        trigger: 'axis',
                        axisPointer: {
                            type: "line",
                            label: {
                                show: false
                            },
                            lineStyle: {
                                color: "#A7AEB8",
                                type: "dashed",
                                cap: "round"
                            }
                        },
                        formatter: (params) => {
                            var template = "";
                            let formatter = self.valFormatter;
                            if (params.seriesType === 'pie') {
                                template += '<div class="bu-is-flex">\
                                                        <div class="chart-tooltip__bar bu-mr-2 bu-mt-1" style="background-color: ' + params.color + ';"></div>\
                                                        <div>\
                                                            <div class="chart-tooltip__header text-smaller font-weight-bold bu-mb-3">' + this.sanitizeHtml(params.seriesName) + '</div>\
                                                            <div class="text-small"> ' + this.sanitizeHtml(params.data.name) + '</div>\
                                                            <div class="text-big">' + formatter(this.sanitizeHtml(params.data.value)) + '</div>\
                                                        </div>\
                                                  </div>';

                                return template;
                            }
                            else {
                                template = "<div class='chart-tooltip" + ((params.length > 10) ? " chart-tooltip__has-scroll" : "") + "'>";
                                if (params.length > 0) {
                                    template += "<span class='chart-tooltip__header text-smaller font-weight-bold'>" + this.sanitizeHtml(params[0].axisValueLabel) + "</span></br>";
                                }

                                if (self.sortBy === "index") {
                                    params.sort(function(a, b) {
                                        return a.seriesIndex - b.seriesIndex;
                                    });
                                }
                                else {
                                    params.sort(function(a, b) {
                                        if (typeof a.value === 'object') {
                                            return b.value[1] - a.value[1];
                                        }
                                        else {
                                            return b.value - a.value;
                                        }
                                    });
                                }

                                for (var i = 0; i < params.length; i++) {
                                    if (params[i].seriesName.toLowerCase() === 'duration' || params[i].seriesName.toLowerCase() === 'avg. duration') {
                                        formatter = countlyCommon.formatSecond;
                                    }
                                    else {
                                        formatter = self.valFormatter;
                                    }
                                    template += '<div class="chart-tooltip__body' + ((params.length > 4) ? " chart-tooltip__single-row" : " ") + '">\
                                                    <div class="chart-tooltip__bar" style="background-color: ' + params[i].color + ';"></div>\
                                                    <div class="chart-tooltip__series">\
                                                            <span class="text-small">' + this.sanitizeHtml(params[i].seriesName) + '</span>\
                                                    </div>\
                                                    <div class="chart-tooltip__value">\
                                                        <span class="text-big">' + (typeof params[i].value === 'object' ? formatter((isNaN(this.sanitizeHtml(params[i].value[1])) ? 0 : this.sanitizeHtml(params[i].value[1])), this.sanitizeHtml(params[i].value), i) : formatter((isNaN(params[i].value) ? 0 : this.sanitizeHtml(params[i].value)), null, i)) + '</span>\
                                                    </div>\
                                                </div>';
                                }
                                template += "</div>";
                                return template;
                            }
                        },
                        showContent: true,
                        alwaysShowContent: false,
                        enterable: true,
                        renderMode: 'html',
                        textStyle: {
                            color: "#333C48",
                            fontSize: 12
                        }
                    },
                    xAxis: {
                        boundaryGap: true,
                        offset: 10,
                        type: 'category',
                        axisLine: {
                            show: true,
                            lineStyle: {
                                type: "solid",
                                color: "#ECECEC"
                            }
                        },
                        axisTick: {
                            show: false
                        },
                        axisLabel: {
                            show: true,
                            color: "#81868D",
                            fontSize: 14
                        },
                        splitLine: {
                            show: false
                        }
                    },
                    yAxis: {
                        boundaryGap: false,
                        offset: 10,
                        type: 'value',
                        axisLine: {
                            show: false
                        },
                        axisTick: {
                            show: false
                        },
                        axisLabel: {
                            show: true,
                            color: "#81868D",
                            fontSize: 12,
                            formatter: (value) => {
                                if (typeof value === "number") {
                                    return countlyCommon.getShortNumber(this.sanitizeHtml(value));
                                }
                                return value;
                            }
                        },
                        splitLine: {
                            show: true,
                            lineStyle: {
                                color: "#ECECEC",
                                type: "dashed"
                            }
                        }
                    },
                    dataZoom: [
                        {
                            type: 'inside',
                            filterMode: 'none',
                            zoomLock: true,
                            start: 0,
                            end: 100
                        }
                    ],
                    color: countlyCommon.GRAPH_COLORS,
                    textStyle: {
                        fontFamily: FONT_FAMILY
                    }
                },
                baseSeriesOptions: {
                    //Keeping series options global for magic type changing i.e. series toggle

                    //Line chart options
                    showSymbol: false,
                    lineStyle: {
                        type: "solid",
                        cap: "round",
                    },
                    smooth: false,
                    itemStyle: {
                        borderRadius: [2, 2, 0, 0],
                    },
                    //Bar chart options
                    legendHoverLink: true,
                    showBackground: false,
                    label: {
                        show: false,
                    },
                    selectedMode: false,
                    progressive: true,

                    //Common options
                    emphasis: {
                        focus: 'series'
                    }
                }
            };
        },
        computed: {
            chartClasses: function() {
                var classes = {};

                if (this.legendOptions.position === "bottom") {
                    classes['bu-is-flex'] = true;
                    classes['bu-is-flex-direction-column'] = true;
                }
                else {
                    classes['bu-is-flex'] = true;
                    classes['bu-is-flex-direction-row'] = true;
                }

                classes['cly-vue-chart--' + this.skin] = true;

                return classes;
            },
            chartStyles: function() {
                var styles = {};

                if (this.height === "auto") {
                    styles.height = '100%';
                }
                else {
                    styles.height = this.height + 'px';
                }

                return styles;
            },
            isChartEmpty: function() {
                if (this.noEmpty) {
                    return false;
                }
                var isEmpty = true;
                var options = _mergeWith({}, this.option);

                if (options.series) {
                    for (var i = 0; i < options.series.length; i++) {
                        if (options.series[i].data) {
                            for (var j = 0; j < options.series[i].data.length; j++) {
                                if (typeof options.series[i].data[j] !== "object") {
                                    if (options.series[i].data[j] !== 0) {
                                        isEmpty = false;
                                    }
                                }
                                else {
                                    // time of days case
                                    if (options.series[i].data[j][2] !== 0) {
                                        isEmpty = false;
                                    }
                                }
                            }
                        }
                        else if (options.series[i].nodes) { //flow sankey diagramm
                            if (options.series[i].nodes.length > 0) {
                                isEmpty = false;
                            }
                        }
                    }
                }

                return isEmpty;
            },
            isLoading: function() {
                if (this.forceLoading === true) {
                    return true;
                }
                else {
                    return false;
                }
            },
            seriesType: function() {
                return this.chartOptions.series && this.chartOptions.series[0] && this.chartOptions.series[0].type;
            }
        },
        methods: {
            patchChart: function(options) {
                this.patchZoom(options);
                this.patchLegend(options);

                return options;
            },
            sanitizeHtml: function(value) {
                if (value) {
                    value = countlyCommon.encodeHtml(value);
                    return countlyCommon.unescapeHtml(value);
                }
                return value;
            }
        }
    });

    /*
        Some handy series option for line series

        - series-line. name - Series name used for displaying in tooltip and filtering with legend, or updating data and configuration with setOption.
        - series-line. color - To change the series color
        - series-line. sampling : To improve performance
        - series-line. dimensions : Used in tooltips
        - series-line. encode
        - series-line. areaStyle : Will simply create an area chart
        - series-line. data
            Example - Sample data -
                        [
                            [0, 12],
                            {
                                value: [1, 32],
                                label: {},
                                labelStyle: {},
                            },
                            [2, 33]
                        ]
            Note: '-' or null or undefined or NaN can be used to describe that a data item does not exist
                    (ps：not exist does not means its value is 0)
    */

    var BaseLineChart = BaseChart.extend({
        mixins: [
            countlyVue.mixins.autoRefresh
        ],
        props: {
            showToggle: {
                type: Boolean,
                default: true
            },
            category: {
                type: String,
                required: false,
                default: ''
            },
            subCategory: {
                type: Array,
                required: false,
                default: function() {
                    return [];
                }
            },
            notationSelectedBucket: {
                type: String,
                required: false,
                default: "weekly"
            }
        },
        data: function() {
            return {
                mixinOptions: {},
                notes: [],
                seriesOptions: {
                    type: 'line',
                    markPoint: {
                        data: [],
                        label: {
                            normal: {
                                show: true,
                                color: "rgba(255, 251, 251, 1)",
                                fontWeight: "500",
                                align: "center",
                                padding: [1, 1, 1, 2],
                            },
                        },
                        emphasis: {
                            itemStyle: {
                            }
                        },
                        animation: false
                    },
                },
                mergedNotes: [],
            };
        },
        computed: {
            mergedOptions: function() {
                var opt = _mergeWith({}, this.baseOptions, this.mixinOptions, this.option, mergeWithCustomizer);
                var series = opt.series || [];
                for (var i = 0; i < series.length; i++) {
                    series[i] = _mergeWith({}, this.baseSeriesOptions, this.seriesOptions, series[i]);
                }
                this.setCalculatedLegendData(opt, series);

                opt.series = series;

                if (this.legendOptions.position !== "bottom") {
                    opt.grid.right = 0;
                }

                if (typeof window.hideGraphTooltip !== "undefined") {
                    window.hideGraphTooltip();
                }

                return opt;
            },
            areNotesHidden: function() {
                return this.$store.getters['countlyCommon/getAreNotesHidden'];
            }
        },
        methods: {
            dateChanged: function() {
                if (!this.areNotesHidden) {
                    this.seriesOptions.markPoint.data = [];
                    var self = this;
                    setTimeout(() => {
                        self.getGraphNotes();
                    }, 500);
                }
            },
            getDateFormat: function(date) {
                var dateFormats = {
                    "yyyy-mm-d-hh-mm": "YYYY-MM-D HH:00",
                    "yyyy-mm-d-h-mm": "YYYY-MM-D H:00",
                    "d-mmm": "D MMM",
                    "dd-mmm": "DD MMM",
                    "d-mmm-yyyy": "D MMM YYYY",
                    "yyyy-mm-d": "YYYY-MM-D",
                    "yyyy-m-d": "YYYY-M-D",
                    "yyyy-mm-dd": "YYYY-MM-DD",
                    "yyyy-mm": "YYYY-MM",
                    "yyyy-m": "YYYY-M",
                    "mmm-yyyy": "MMM YYYY",
                    "h-00": "H:00",
                    "hh-00": "HH:00",
                    "dd/mm/yyyy": "DD/MM/YY",
                    "mmm": "MMM"
                    //define other well known formats
                };

                for (var prop in dateFormats) {
                    if (moment(date, dateFormats[prop], true).isValid()) {
                        return dateFormats[prop];
                    }
                }
                return null;
            },
            graphNotesTimeConverter: function(ts) {
                var graphNoteDate = new Date(ts);
                if (this.seriesType === "bar") {
                    return null;
                }
                else if (this.category === "drill" || this.category === "formulas") {
                    if (this.notationSelectedBucket === "hourly") {
                        return countlyCommon.formatDate(moment(graphNoteDate), "D MMM YYYY hh:00") || 0;
                    }
                    else if (this.notationSelectedBucket === "daily") {
                        return countlyCommon.formatDate(moment(graphNoteDate), "D MMM YYYY") || 0;
                    }
                    else if (this.notationSelectedBucket === "weekly") {
                        return "W" + moment(graphNoteDate).isoWeek() + " " + moment(graphNoteDate).isoWeekYear();
                    }
                    else if (this.notationSelectedBucket === "monthly") {
                        return countlyCommon.formatDate(moment(graphNoteDate), "MMM YYYY");
                    }
                }
                else if (this.category === "push-notification") {
                    if (this.notationSelectedBucket === "weekly") {
                        return "W" + moment(graphNoteDate).isoWeek();
                    }
                    else if (this.notationSelectedBucket === "monthly") {
                        return countlyCommon.formatDate(moment(graphNoteDate), "YYYY MMM");
                    }
                }
                else {
                    var xAxisLabel = null;
                    if (this.$refs.echarts && this.$refs.echarts.option && this.$refs.echarts.option.xAxis.data) {
                        xAxisLabel = this.$refs.echarts.option.xAxis.data[0];
                    }
                    else {
                        return null;
                    }
                    var formatType = this.getDateFormat(xAxisLabel);
                    return countlyCommon.formatDate(moment(ts), formatType) || 0;
                }
            },
            mergeGraphNotesByDate: function(notes, mergeByWeek) {
                var self = this;
                const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
                var multiplierCount = 2;
                if (this.$refs.echarts && (this.$refs.echarts.getWidth() < 500 && this.$refs.echarts.getWidth() !== 100)) {
                    multiplierCount = 8;
                }
                notes.forEach(function(orderedItem) {
                    orderedItem.dateStr = self.graphNotesTimeConverter(orderedItem.ts);
                    orderedItem.weekCount = moment(orderedItem.ts).year() - moment(orderedItem.ts).week();
                });

                if (mergeByWeek) {
                    for (var k = 1; k < notes.length; k++) {
                        for (var m = 0; m < k; m++) {
                            if (notes[k].weekCount === notes[m].weekCount) {
                                notes[k].dateStr = notes[m].dateStr;
                            }
                        }
                    }
                }

                notes.map(function(item) {
                    item.times = notes.filter(obj => obj.dateStr === item.dateStr).length;
                });

                notes = notes.sort(function(a, b) {
                    return new Date(b.ts) - new Date(a.ts);
                });
                for (var i = 0; i < notes.length - 1; i++) {
                    if ((i !== notes.length - 1) && (Math.round(Math.abs((notes[i].ts - notes[i + 1].ts) / oneDay)) > 0 && Math.round(Math.abs((notes[i].ts - notes[i + 1].ts) / oneDay)) < multiplierCount)) {
                        notes[i].hasCloseDate = true;
                    }
                }
                return notes;
            },
            graphNotesTooltipFormatter: function(arr, params) {
                var filteredNotes = arr.filter(x=>x.dateStr === params.data.note.dateStr && x.times > 1);
                var minimizeTooltip = false;
                var template = "";
                var conditionalClassName = "graph-notes-tooltip";

                if ((this.$refs && this.$refs.echarts) && (this.$refs.echarts.getHeight() < 200 || this.$refs.echarts.getWidth() < 500)) {
                    minimizeTooltip = true;
                }


                if (minimizeTooltip) {
                    conditionalClassName = 'graph-notes-tooltip minimize';
                }
                else if (!minimizeTooltip && filteredNotes.length > 0) {
                    conditionalClassName = 'graph-notes-tooltip bu-mb-4 bu-mx-2';
                }

                if (filteredNotes.length > 0) {
                    for (var i = 0; i < filteredNotes.length; i++) {
                        if (i === 0) {
                            template = '<div class="graph-tooltip-wrapper bu-is-flex bu-is-justify-content-end">\
                                            <span onClick="window.hideGraphTooltip()">\
                                                <i class="el-icon-close"></i>\
                                            </span>\
                                        </div>\
                                        <div class="graph-tooltip-wrapper__container">';
                        }
                        template += '<div class="' + this.sanitizeHtml(conditionalClassName) + '">\
                                        <div class="bu-mb-1"><span class="text-small color-cool-gray-50">#' + this.sanitizeHtml(filteredNotes[i].indicator) + '</span></div>\
                                        <div class="bu-is-flex bu-is-justify-content-space-between graph-notes-tooltip__header">\
                                            <div class="bu-is-flex bu-is-flex-direction-column">\
                                                <div class="text-small input-owner">' + this.sanitizeHtml(filteredNotes[i].owner_name) + '</div>\
                                                <div class="text-small color-cool-gray-50 note-date">' + moment(filteredNotes[i].ts).format("MMM D, YYYY hh:mm A") + '</div>\
                                            </div>\
                                            <div class="bu-is-flex bu-is-flex-direction-column bu-is-align-items-flex-end">\
                                                <span class="text-small color-cool-gray-50 bu-is-capitalized note-type">' + this.sanitizeHtml(filteredNotes[i].noteType) + '</span>\
                                            </div>\
                                        </div>\
                                        <div class="bu-mt-2 graph-notes-tooltip__body"><span class="text-small input-notes input-minimizer">' + this.sanitizeHtml(filteredNotes[i].note) + '</span></div>\
                                    </div>';
                        if (i === filteredNotes.length) {
                            template = "</div>";
                        }
                    }
                }
                else {
                    template += '<div class="' + this.sanitizeHtml(conditionalClassName) + '">\
                                    <div class="bu-is-flex bu-is-justify-content-space-between graph-notes-tooltip__header">\
                                        <div class="bu-is-flex bu-is-flex-direction-column name-wrapper">\
                                            <div class="text-medium input-owner">' + this.sanitizeHtml(params.data.note.owner_name) + '</div>\
                                            <div class="text-small color-cool-gray-50 note-date">' + moment(params.data.note.ts).format("MMM D, YYYY hh:mm A") + '</div>\
                                        </div>\
                                        <div class="bu-is-flex bu-is-flex-direction-column bu-is-align-items-flex-end">\
                                            <span onClick="window.hideGraphTooltip()">\
                                                <i class="el-icon-close"></i>\
                                            </span>\
                                            <span class="text-small color-cool-gray-50 bu-is-capitalized note-type">' + this.sanitizeHtml(params.data.note.noteType) + '</span>\
                                        </div>\
                                    </div>\
                                    <div class="graph-notes-tooltip__body"><span class="text-medium input-notes">' + this.sanitizeHtml(params.data.note.note) + '</span></div>\
                                </div>';
                }
                return template;
            },
            weekCountToDate: function(year, week, day) {
                const firstDayOfYear = new Date(year, 0, 1);
                const days = 2 + day + (week - 1) * 7 - firstDayOfYear.getDay();
                return new Date(year, 0, days);
            },
            graphNotesFilterChecks: function() {
                var returnedObj = {};
                var filter = {};
                var appIds = [countlyCommon.ACTIVE_APP_ID];
                if (this.$parent && this.$parent.data) {
                    if (this.$parent.data.apps) {
                        appIds = this.$parent.data.apps;
                    }
                    if (this.$parent.data.custom_period && this.$parent.data.custom_period.length) {
                        if (typeof this.$parent.data.custom_period === "string") {
                            var convertedTimeObj = countlyCommon.getPeriodObj(this.$parent.data.custom_period);
                            filter.customPeriod = [convertedTimeObj.start, convertedTimeObj.end];
                        }
                        else if (Array.isArray(this.$parent.data.custom_period)) {
                            filter.customPeriod = [this.$parent.data.custom_period[0], this.$parent.data.custom_period[1]];
                        }
                    }
                }

                if ((this.category === "formulas" || this.category === "drill") && (this.$parent && this.$parent.data)) {
                    var xAxisLabels = this.option.xAxis.data;
                    var customPeriodStartDate;
                    var customPeriodEndDate;
                    if (this.$parent.data.bucket === "daily") {
                        customPeriodStartDate = new Date(xAxisLabels[0]).getTime();
                        customPeriodEndDate = new Date(xAxisLabels[xAxisLabels.length - 1]).setHours(23, 59);
                        filter.customPeriod = [customPeriodStartDate, customPeriodEndDate];
                    }
                    else if (this.$parent.data.bucket === "weekly") {
                        customPeriodStartDate = this.weekCountToDate(xAxisLabels[0].split(' ')[1], xAxisLabels[0].split(' ')[0].split('W')[1], 7);
                        customPeriodEndDate = this.weekCountToDate(xAxisLabels[xAxisLabels.length - 1].split(' ')[1], xAxisLabels[xAxisLabels.length - 1].split(' ')[0].split('W')[1], 7);
                        filter.customPeriod = [customPeriodStartDate.getTime(), customPeriodEndDate.getTime()];
                    }
                    else if (this.$parent.data.bucket === "monthly") {
                        customPeriodStartDate = new Date(xAxisLabels[0]).getTime();
                        customPeriodEndDate = new Date(xAxisLabels[xAxisLabels.length - 1]).getTime();
                        customPeriodEndDate = moment(customPeriodEndDate).endOf('month')._d.valueOf();
                        filter.customPeriod = [customPeriodStartDate, customPeriodEndDate];
                    }
                }
                returnedObj.appIds = appIds;
                returnedObj.customPeriod = filter;
                return returnedObj;
            },
            getGraphNotes: function() {
                if (!this.hideNotation && !this.areNotesHidden) {
                    var self = this;
                    var chartHeight = 300;
                    var yAxisHeight = '';
                    var filter = {};
                    var mergeByDate = false;
                    // sub category parser
                    var categories = [];
                    if (this.subCategory.length) {
                        this.subCategory.forEach(function(item) {
                            categories.push("events " + item.split("***")[1]);
                        });
                    }

                    filter = this.graphNotesFilterChecks();
                    countlyCommon.getGraphNotes(filter.appIds, filter.customPeriod /*{category: categories.length ? categories : [this.category]}*/).then(function(data) {
                        self.notes = data.aaData;
                    }).then(function() {
                        self.seriesOptions.markPoint.data = [];
                        if (self.notes && self.notes.length) {
                            if (self.$refs.echarts) {
                                chartHeight = self.$refs.echarts.getHeight();
                            }
                            // if custom range date is bigger than 30days, then group notes by week
                            if ((Array.isArray(countlyCommon.periodObj._period) && countlyCommon.periodObj.currentPeriodArr.length > 30)) {
                                mergeByDate = true;
                            }
                            self.mergedNotes = self.mergeGraphNotesByDate(self.notes, mergeByDate);
                            self.mergedNotes.forEach(function(note, index) {
                                if (note.dateStr) {
                                    if (chartHeight < 250 && chartHeight !== 100) {
                                        if (note.hasCloseDate && note.times === 1) {
                                            yAxisHeight = '65%';
                                        }
                                        else {
                                            yAxisHeight = '60%';
                                        }
                                    }
                                    else {
                                        if (note.hasCloseDate && note.times === 1) {
                                            yAxisHeight = '80%';
                                        }
                                        else {
                                            yAxisHeight = '75%';
                                        }
                                    }
                                }

                                self.seriesOptions.markPoint.data.push({
                                    note: note,
                                    value: note.times > 1 ? ' ' : note.indicator,
                                    xAxis: note.dateStr,
                                    y: yAxisHeight,
                                    symbolRotate: -20,
                                    symbolSize: note.indicator.length === 1 ? 30 : 40,
                                });

                                self.seriesOptions.markPoint.data[index].itemStyle = {
                                    color: note.times > 1 ? countlyGraphNotesCommon.COLOR_TAGS[0].label : countlyGraphNotesCommon.COLOR_TAGS.find(x=>x.value === note.color).label
                                };
                                self.seriesOptions.markPoint.emphasis.itemStyle = {
                                    borderColor: "#c5c5c5",
                                    borderWidth: 4
                                };
                            });

                            self.seriesOptions.markPoint.tooltip = {
                                transitionDuration: 1,
                                show: true,
                                trigger: "item",
                                confine: true,
                                extraCssText: 'z-index: 1000',
                                alwaysShowContent: true,
                                formatter: function(params) {
                                    return self.graphNotesTooltipFormatter(self.mergedNotes, params);
                                }
                            };
                        }
                    });
                }
                else {
                    this.seriesOptions.markPoint.data = [];
                }
            },
            onClick: function() {
                if (!document.querySelectorAll(".graph-overlay").length) {
                    var overlay = document.createElement("div");
                    overlay.setAttribute("class", "graph-overlay");
                    overlay.setAttribute("style", "width: 100%; height: 100%; top: 0px; background-color: black; position: absolute; z-index: 999; opacity: 0; display: none;");
                    var echarts = document.querySelectorAll('.echarts');
                    for (var i = 0; i < echarts.length; i++) {
                        if (typeof echarts[i] !== 'undefined') {
                            echarts[i].appendChild(overlay.cloneNode(true));
                        }
                    }
                }
                if (document.querySelectorAll(".graph-overlay")) {
                    for (var j = 0; j < document.querySelectorAll(".graph-overlay").length; j++) {
                        document.querySelectorAll(".graph-overlay")[j].style.display = "block";
                    }
                }
                if (document.querySelectorAll(".graph-notes-tooltip")) {
                    for (var z = 0; z < document.querySelectorAll(".graph-notes-tooltip").length; z++) {
                        document.querySelectorAll(".graph-notes-tooltip")[z].parentNode.style.opacity = 1;
                    }
                }

                if (document.querySelectorAll(".graph-tooltip-wrapper")) {
                    for (var k = 0; k < document.querySelectorAll(".graph-tooltip-wrapper").length; k++) {
                        document.querySelectorAll(".graph-tooltip-wrapper")[k].parentNode.style.opacity = 1;
                    }
                }


                if (document.querySelector('x-vue-echarts div .graph-notes-tooltip')) {
                    localStorage.setItem('showTooltipFlag', true);
                    document.querySelector('x-vue-echarts div .graph-notes-tooltip').parentNode.addEventListener('mouseleave', window.hideTooltip, true);
                }

                if (document.querySelector('x-vue-echarts div .graph-tooltip-wrapper')) {
                    localStorage.setItem('showTooltipFlag', true);
                    document.querySelector('x-vue-echarts div .graph-tooltip-wrapper').parentNode.addEventListener('mouseleave', window.hideTooltip, true);
                }
                countlyCommon.DISABLE_AUTO_REFRESH = true;
            }
        },
        watch: {
            notationSelectedBucket: function() {
                this.seriesOptions.markPoint.data = [];
                var self = this;
                setTimeout(() => {
                    self.getGraphNotes();
                }, 0);
            },
            category: function() {
                this.getGraphNotes();
            },
            areNotesHidden: function() {
                this.getGraphNotes();
            }
        },
        created: function() {
            this.getGraphNotes();
        },
        mounted: function() {
            window.hideGraphTooltip = function() {
                if (typeof document.querySelectorAll(".graph-overlay") !== 'undefined') {
                    for (var j = 0; j < document.querySelectorAll(".graph-overlay").length; j++) {
                        document.querySelectorAll(".graph-overlay")[j].style.display = "none";
                    }
                }
                if (typeof document.querySelectorAll(".graph-notes-tooltip") !== 'undefined') {
                    for (var z = 0; z < document.querySelectorAll(".graph-notes-tooltip").length; z++) {
                        document.querySelectorAll(".graph-notes-tooltip")[z].parentNode.style.opacity = 0;
                    }
                }

                if (typeof document.querySelectorAll(".graph-tooltip-wrapper") !== 'undefined') {
                    for (var k = 0; k < document.querySelectorAll(".graph-tooltip-wrapper").length; k++) {
                        document.querySelectorAll(".graph-tooltip-wrapper")[k].parentNode.style.opacity = 0;
                    }
                }


                if (document.querySelector('x-vue-echarts div .graph-notes-tooltip')) {
                    localStorage.removeItem('showTooltipFlag');
                }

                if (document.querySelector('x-vue-echarts div .graph-tooltip-wrapper')) {
                    localStorage.removeItem('showTooltipFlag');
                }
                countlyCommon.DISABLE_AUTO_REFRESH = false;
            };

            window.hideTooltip = function(event) {
                if (localStorage.getItem('showTooltipFlag')) {
                    event.stopImmediatePropagation();
                }
                return;
            };
        }
    });

    /*
        Some handy series option for bar series

        series-bar. stack - Name of stack. On the same category axis, the series with the same stack name would be put on top of each other.
        series-bar. large - Whether to enable the optimization of large-scale data.
        series-bar. barGap - The gap between bars between different series.

        To make a horizontal bar chart, set xAxis.type = "value" and yAxis.type = "category"

        Stacked bar charts should not have series toggle option
        because the y axis does not adjusts itself when the series changes
    */
    var BaseBarChart = BaseChart.extend({
        data: function() {
            return {
                mixinOptions: {},
                seriesOptions: {
                    type: 'bar'
                }
            };
        },
        computed: {
            mergedOptions: function() {
                var opt = _mergeWith({}, this.baseOptions, this.mixinOptions, this.option);
                var series = opt.series || [];

                for (var i = 0; i < series.length; i++) {
                    series[i] = _mergeWith({}, this.baseSeriesOptions, this.seriesOptions, series[i]);
                }

                this.setCalculatedLegendData(opt, series);

                opt.series = series;

                if (this.legendOptions.position !== "bottom") {
                    opt.grid.right = 0;
                }

                return opt;
            }
        }
    });

    /*
        Some handy series option for bar series

        series-pie.label. overflow - Only works when width is set
        series-pie. center - To change position of the pie chart
        series-pie. center - Useful for positioning pie chart
        series-pie. radius - Useful for setting width of the pie chart
    */
    var BasePieChart = BaseChart.extend({
        props: {
            showZoom: {
                type: Boolean,
                default: false
            },
            showDownload: {
                type: Boolean,
                default: false
            }
        },
        data: function() {
            return {
                mixinOptions: {
                    legend: {
                        orient: 'vertical',
                        right: "25%",
                        top: "25%",
                        bottom: 'auto',
                        show: false
                    },
                    tooltip: {
                        trigger: 'item',
                        position: function(point, params, dom, rect, size) {
                            if (size.contentSize[0] + 110 >= size.viewSize[0]) {
                                return [point[0] + 30, point[1] + 30];
                            }
                        }
                    },
                    xAxis: {
                        show: false
                    },
                    yAxis: {
                        show: false
                    }
                },
                seriesOptions: {
                    type: 'pie',
                    radius: ['50%', '80%'],
                    center: ['50%', '50%'],
                    itemStyle: {
                        borderRadius: 0,
                        borderColor: '#fff',
                        borderWidth: 2
                    },
                    label: {
                        show: true,
                        position: "center",
                        overflow: "breakAll",
                        lineOverflow: "truncate",
                        fontSize: 14,
                        lineHeight: 18
                    }
                }
            };
        },
        computed: {
            hasAllEmptyValues: function() {
                var options = this.mergedOptions;
                if (options.series) {
                    for (var i = 0; i < options.series.length; i++) {
                        if (!options.series[i].isEmptySeries) {
                            return false;
                        }
                    }
                }
                return true;
            },
            mergedOptions: function() {
                var opt = _mergeWith({}, this.baseOptions, this.mixinOptions, this.option);
                var series = opt.series || [];

                var sumOfOthers;
                var seriesArr;

                for (var i = 0; i < series.length; i++) {
                    seriesArr = [];
                    sumOfOthers = 0;

                    series[i] = _mergeWith({}, this.baseSeriesOptions, this.seriesOptions, series[i]);

                    series[i].data = series[i].data.filter(function(el) {
                        return el.value > 0;
                    });
                    if (series[i].data.length === 0) {
                        series[i].isEmptySeries = true;
                        series[i].data.push({"label": "empty", "value": 100});
                        opt.legend.show = false;
                        opt.tooltip.show = false;
                        series[i].color = "#ECECEC";
                        series[i].name = "empty";
                        series[i].emphasis = {
                            itemStyle: {
                                color: "#ECECEC"
                            }
                        };
                    }

                    var seriesData = series[i].data;
                    seriesData.sort(function(a, b) {
                        return b.value - a.value;
                    });

                    if (seriesData.length > 12) {
                        for (var k = 12; k < seriesData.length; k++) {
                            sumOfOthers += seriesData[k].value;
                        }
                        seriesArr = seriesData.slice(0, 12);
                        seriesArr.push({value: sumOfOthers, name: 'Others'});
                        series[i].data = seriesData = seriesArr;
                    }
                }

                this.setCalculatedLegendData(opt, series);

                opt.series = series;

                return opt;
            }
        }
    });

    /*
    var ZoomDropdown = countlyBaseComponent.extend({
        data: function() {
            return {
                zoomNumbers: [
                    {
                        value: 0,
                        name: "100%"
                    },
                    {
                        value: 8,
                        name: "110%"
                    },
                    {
                        value: 16,
                        name: "120%"
                    },
                    {
                        value: 24,
                        name: "130%"
                    },
                    {
                        value: 32,
                        name: "140%"
                    },
                    {
                        value: 40,
                        name: "150%"
                    },
                    {
                        value: 48,
                        name: "160%"
                    },
                    {
                        value: 56,
                        name: "170%"
                    },
                    {
                        value: 64,
                        name: "180%"
                    },
                    {
                        value: 72,
                        name: "190%"
                    },
                    {
                        value: 80,
                        name: "200%"
                    },
                ],
                selZoomNumber: ""
            };
        },
        computed: {
            selZoom: {
                get: function() {
                    return this.selZoomNumber;
                },
                set: function(v) {
                    var zoomNumber = this.zoomNumbers.filter(function(z) {
                        return z.value === v;
                    });

                    if (!v) {
                        this.echartRef.dispatchAction({
                            type: "restore",
                        });

                        this.selZoomNumber = "";
                        return;
                    }

                    this.echartRef.dispatchAction({
                        type: "dataZoom",
                        start: parseInt(v / 2),
                        end: 100 - parseInt(v / 2)
                    });

                    this.selZoomNumber = zoomNumber[0].name;
                }
            }
        },
        template: "<div style='width: 105px'>\
                        <el-select v-model='selZoom' placeholder='Zoom out'>\
                            <el-option :key='item.value' :value='item.value' :label='item.name'\
                                v-for='item in zoomNumbers'></el-option>\
                        </el-select>\
                    </div>"
    });
    */

    var ZoomInteractive = countlyBaseComponent.extend({
        props: {
            echartRef: {
                type: Object
            },
            zoomInfo: {
                type: Boolean,
                default: true
            },
            isZoom: {
                type: Boolean,
                default: false
            }
        },
        mixins: [
            countlyVue.mixins.i18n
        ],
        data: function() {
            return {
                zoomStatus: "reset"
            };
        },
        watch: {
            isZoom: function(newVal) {
                if (newVal) {
                    this.onZoomTrigger();
                }
            }
        },
        methods: {
            onZoomTrigger: function(e) {
                if (this.echartRef) {
                    this.echartRef.setOption({tooltip: {show: false}}, {notMerge: false});

                    this.echartRef.dispatchAction({
                        type: "takeGlobalCursor",
                        key: 'dataZoomSelect',
                        dataZoomSelectActive: true
                    });
                }

                this.zoomStatus = "triggered";
                if (e) {
                    this.$emit("zoom-triggered", e);
                }
            },
            onZoomReset: function() {
                if (this.echartRef) {
                    this.echartRef.setOption({tooltip: {show: true}}, {notMerge: false});

                    this.echartRef.dispatchAction({
                        type: "restore",
                    });
                }

                this.zoomStatus = "reset";
                this.$emit("zoom-reset");
            },
            onZoomCancel: function() {
                if (this.echartRef) {
                    this.echartRef.setOption({tooltip: {show: true}}, {notMerge: false});

                    this.echartRef.dispatchAction({
                        type: "takeGlobalCursor",
                        key: 'dataZoomSelect',
                        dataZoomSelectActive: false
                    });
                }

                this.zoomStatus = "reset";
                this.$emit("zoom-reset");
            },
            onZoomFinished: function() {
                if (this.echartRef) {
                    this.echartRef.setOption({tooltip: {show: true}}, {notMerge: false});

                    this.echartRef.dispatchAction({
                        type: "takeGlobalCursor",
                        key: 'dataZoomSelect',
                        dataZoomSelectActive: false
                    });
                }

                this.zoomStatus = "done";
            },
            patchZoom: function() {
                if (this.zoomStatus === "triggered") {
                    this.onZoomTrigger(false);
                }
            }
        },
        template: '<div>\
                        <div v-if="zoomInfo && zoomStatus === \'triggered\'" class="bu-mr-3 color-cool-gray-50 text-smallish">\
                            {{i18nM(\'common.zoom-info\')}}\
                        </div>\
                        <el-button class="chart-zoom-button" @click="onZoomCancel" v-if="zoomStatus === \'triggered\'" size="small">\
                            {{i18nM(\'common.cancel-zoom\')}}\
                        </el-button>\
                        <el-button class="chart-zoom-button" @click="onZoomReset" v-if="zoomStatus === \'done\'" size="small">\
                            {{i18nM(\'common.zoom-reset\')}}\
                        </el-button>\
                    </div>'
    });

    var MagicSwitch = countlyBaseComponent.extend({
        props: {
            chartType: {
                type: String,
                default: 'line'
            },
        },
        mixins: [
            countlyVue.mixins.i18n
        ],
        data: function() {
            return {
                selSwitchOption: this.chartType
            };
        },
        computed: {
            selSwitch: {
                get: function() {
                    return this.selSwitchOption;
                },
                set: function(v) {
                    this.$emit("series-toggle", v);
                    this.selSwitchOption = v;
                }
            }
        },
        template: '<div class="chart-type-toggle-wrapper">\
                        <el-select v-model="selSwitch" class="chart-type-toggle-wrapper__select">\
                            <div class="chart-type-toggle-wrapper__title"><span class="text-smaller font-weight-bold bu-is-uppercase">{{i18n("common.chart-type")}}</span></div>\
                            <el-option value="line" label="Line"><i class="ion-ios-pulse-strong bu-mr-2"></i><span class="chart-type-toggle-wrapper__type">Line Chart</span></el-option>\
                            <el-option value="bar" label="Bar"><i class="ion-stats-bars bu-mr-3"></i><span class="chart-type-toggle-wrapper__type">Bar</span></el-option>\
                        </el-select>\
                    </div>'
    });
    var AnnotationHandleCommand = {
        data: function() {
            return {
                drawerSettingsForWidgets: {
                    createTitle: CV.i18n('notes.add-new-note'),
                    editTitle: CV.i18n('notes.edit-note'),
                    saveButtonLabel: CV.i18n('common.save'),
                    createButtonLabel: CV.i18n('common.create'),
                    isEditMode: false
                },
            };
        },
        computed: {
            areNotesHidden: function() {
                return this.$store.getters['countlyCommon/getAreNotesHidden'];
            }
        },
        methods: {
            refreshNotes: function() {
                if (this.$refs.echartRef && this.$refs.echartRef.seriesOptions.type === "line") {
                    this.$refs.echartRef.getGraphNotes();
                }
            },
            graphNotesHandleCommand: function(event) {
                if (event === "add") {
                    this.openDrawer("annotation", {
                        noteType: "private",
                        ts: Date.now(),
                        color: {value: 1, label: '#39C0C8'},
                        emails: [],
                        category: this.category,
                        appIds: this.data ? this.data.apps : null
                    });
                }
                else if (event === "manage") {
                    window.location.href = '#/analytics/graph-notes';
                }
                else if (event === "show") {
                    this.notesVisibility();
                }
            },
            notesVisibility: function() {
                this.$store.dispatch('countlyCommon/setAreNotesHidden', !this.areNotesHidden);
            },
        }
    };

    countlyVue.mixins.graphNotesCommand = AnnotationHandleCommand;

    var AnnotationManagement = countlyBaseComponent.extend({
        props: {
            category: {
                type: String,
                default: '',
                required: false
            }
        },
        mixins: [countlyVue.mixins.hasDrawers("annotation"), countlyVue.mixins.i18n, countlyVue.mixins.graphNotesCommand],
        data: function() {
            return {
                selectedItem: '',
                drawerSettings: {
                    createTitle: CV.i18n('notes.add-new-note'),
                    editTitle: CV.i18n('notes.edit-note'),
                    saveButtonLabel: CV.i18n('common.save'),
                    createButtonLabel: CV.i18n('common.create'),
                    isEditMode: false
                },
            };
        },
        methods: {
            refresh: function() {
                this.$emit('refresh');
            }
        },
        components: {
            "drawer": countlyGraphNotesCommon.drawer
        },
        template:
            '<div class="chart-type-annotation-wrapper">\
                <el-dropdown trigger="click" @command="graphNotesHandleCommand($event)">\
                    <el-button size="small">\
                        <img src="../images/annotation/notation-icon.svg" class="chart-type-annotation-wrapper__icon"/>\
                    </el-button>\
                    <el-dropdown-menu slot="dropdown">\
                        <el-dropdown-item command="add"><img src="../images/annotation/add-icon.svg" class="chart-type-annotation-wrapper__img bu-mr-4"/><span>{{i18n("notes.add-note")}}</span></el-dropdown-item>\
                        <el-dropdown-item command="manage"><img src="../images/annotation/manage-icon.svg" class="chart-type-annotation-wrapper__img bu-mr-4"/>{{i18n("notes.manage-notes")}}</el-dropdown-item>\
                        <el-dropdown-item command="show"><img src="../images/annotation/show-icon.svg" class="chart-type-annotation-wrapper__img bu-mr-3"/>{{!areNotesHidden ? i18n("notes.hide-notes") : i18n("notes.show-notes")}}</el-dropdown-item>\
                    </el-dropdown-menu>\
                </el-dropdown>\
                <drawer :settings="drawerSettings" :controls="drawers.annotation" @cly-refresh="refresh"></drawer>\
            </div>'
    });

    var ChartHeader = countlyBaseComponent.extend({
        mixins: [EchartRefMixin],
        props: {
            showZoom: {
                type: Boolean,
                default: false
            },
            showToggle: {
                type: Boolean,
                default: false
            },
            showDownload: {
                type: Boolean,
                default: false
            },
            chartType: {
                type: String,
                default: 'line'
            },
            category: {
                type: String,
                default: '',
                required: false
            },
            hideNotation: {
                type: Boolean,
                default: false,
                required: false
            },
            testId: {
                type: String,
                default: 'cly-chart-header-test-id',
            }
        },
        data: function() {
            return {
                isZoom: false,
                selectedChartType: ''
            };
        },
        components: {
            "zoom-interactive": ZoomInteractive,
            "chart-toggle": MagicSwitch,
            "add-note": AnnotationManagement
        },
        methods: {
            downloadImage: function() {
                /*
                    Echarts does not provide an api to download the chart images programmatically.
                    So I implemented the download myself.
                    This resembles to the actual download handler of echarts.
                    This does not support download in IE and older edge versions yet.
                */
                if (!this.echartRef) {
                    this.echartRef = this.$parent.$refs.echarts;
                }
                var chartOptions = this.echartRef.getOption();

                var aTag = document.createElement('a');
                aTag.setAttribute("download", "image.png");
                aTag.setAttribute("href", this.echartRef.getDataURL({
                    type: 'png',
                    pixelRatio: 2,
                    backgroundColor: chartOptions.backgroundColor || "#fff"
                }));

                var evt = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: false
                });

                aTag.dispatchEvent(evt);
            },
            onZoomTrigger: function() {
                this.isZoom = true;
            },
            onZoomReset: function() {
                this.isZoom = false;
            },
            onSeriesChange: function(v) {
                this.selectedChartType = v;
            },
            handleCommand: function(command) {
                switch (command) {
                case "download":
                    this.downloadImage();
                    break;
                case "zoom":
                    this.isZoom = true;
                    break;
                default:
                    break;
                }
            },
            refresh: function() {
                this.$emit("graph-notes-refresh");
            },
            notesVisibility: function() {
                this.$emit("notes-visibility");
            }
        },
        created: function() {
            if (!this.selectedChartType) {
                this.selectedChartType = this.chartType;
            }
            if (window.location.href.split('/').indexOf('custom') > -1) {
                this.selectedChartType = "dashboard";
            }
        },
        template: '<div class="bu-level">\
                        <div class="bu-level-left">\
                            <div class="bu-level-item" v-if="showToggle && !isZoom">\
                                <chart-toggle :chart-type="chartType" @series-toggle="onSeriesChange" v-on="$listeners"></chart-toggle>\
                            </div>\
                            <slot v-if="!isZoom" name="chart-left" v-bind:echart="echartRef"></slot>\
							<slot name="chart-header-left-input"></slot>\
                        </div>\
                        <div class="bu-level-right bu-mt-1">\
                            <slot v-if="!isZoom" name="chart-right" v-bind:echart="echartRef"></slot>\
                            <div class="bu-level-item" v-if="(selectedChartType === \'line\') && (!hideNotation && !isZoom)">\
                                <add-note :category="this.category" @refresh="refresh"></add-note>\
                            </div>\
                            <cly-more-options :test-id="testId + \'-cly-chart-more-dropdown\'" v-if="!isZoom && (showDownload || showZoom)" class="bu-level-item" size="small" @command="handleCommand($event)">\
                                <el-dropdown-item :data-test-id="testId + \'-download-button\'" v-if="showDownload" command="download"><i class="cly-icon-btn cly-icon-download bu-mr-3"></i>Download</el-dropdown-item>\
                                <el-dropdown-item :data-test-id="testId + \'-more-zoom-button\'" v-if="showZoom" command="zoom"><i class="cly-icon-btn cly-icon-zoom bu-mr-3"></i>Zoom In</el-dropdown-item>\
                            </cly-more-options>\
                            <zoom-interactive @zoom-reset="onZoomReset" :is-zoom="isZoom" @zoom-triggered="onZoomTrigger" ref="zoom" v-if="showZoom" :echartRef="echartRef" class="bu-level-item"></zoom-interactive>\
                        </div>\
                    </div>'
    });

    var SecondaryLegend = countlyBaseComponent.extend({
        props: {
            data: {
                type: Array,
                default: function() {
                    return [];
                }
            },
            onClick: {
                type: Function
            },
            position: {
                type: String
            },
            testId: {
                type: String,
                default: "secondary-legend-test-id"
            }
        },
        computed: {
            scrollOptions: function() {
                var options = {
                    vuescroll: {},
                    scrollPanel: {},
                    rail: {
                        gutterOfSide: "0px"
                    },
                    bar: {
                        background: "#A7AEB8",
                        size: "6px",
                        specifyBorderRadius: "3px",
                        keepShow: true
                    }
                };

                if (this.position === "bottom") {
                    options.scrollPanel.scrollingX = true;
                    options.scrollPanel.scrollingY = false;
                }
                else {
                    options.scrollPanel.scrollingX = false;
                    options.scrollPanel.scrollingY = true;
                }

                return options;
            },
            classes: function() {
                var classes = {
                    'cly-vue-chart-legend__secondary': true,
                    'cly-vue-chart-legend__secondary--text-center': this.position === "bottom"
                };

                return classes;
            }
        },
        template: '<div :class="classes">\
                        <vue-scroll :ops="scrollOptions">\
                            <div v-for="(item, index) in data"\
                                :key="item.name" :data-series="item.name"\
                                :class="[\'cly-vue-chart-legend__s-series\',\
                                        {\'cly-vue-chart-legend__s-series--deselected\': item.status === \'off\'}]"\
                                @click="onClick(item, index)">\
                                <div :data-test-id="testId + \'-legend-icon\'" class="cly-vue-chart-legend__s-rectangle" :style="{backgroundColor: item.displayColor}"></div>\
                                <div :data-test-id="testId + \'-legend-label\'" class="cly-vue-chart-legend__s-title has-ellipsis">{{item.label || item.name}}</div>\
                                <div class="cly-vue-chart-legend__s-percentage" v-if="item.percentage">{{item.percentage}}%</div>\
                            </div>\
                        </vue-scroll>\
                    </div>'
    });

    var PrimaryLegend = countlyBaseComponent.extend({
        props: {
            data: {
                type: Array,
                default: function() {
                    return [];
                }
            },
            onClick: {
                type: Function
            }
        },
        template: '<div class="cly-vue-chart-legend__primary">\
                        <div v-for="(item, index) in data"\
                            :key="item.name"\
                            :data-series="item.name"\
                            :class="[\'cly-vue-chart-legend__p-series\',\
                                    {\'cly-vue-chart-legend__p-series--deselected\': item.status === \'off\'}]"\
                            @click="onClick(item, index)">\
                            <div class="cly-vue-chart-legend__first-row">\
                                <div class="cly-vue-chart-legend__p-checkbox" :style="{backgroundColor: item.displayColor}"></div>\
                                <div class="cly-vue-chart-legend__p-title">{{item.label || item.name}}</div>\
                                <div class="cly-vue-chart-legend__p-tooltip" v-if="item.tooltip">\
                                    <cly-tooltip-icon :tooltip="item.tooltip" icon="ion-help-circled"></cly-tooltip-icon>\
                                </div>\
                            </div>\
                            <div class="cly-vue-chart-legend__second-row">\
                                <div class="cly-vue-chart-legend__p-number">{{item.value}}</div>\
                                <div\
                                    :class="[\'cly-vue-chart-legend__p-trend\', \
                                            {\'cly-vue-chart-legend__p-trend--trend-up\': item.trend === \'up\'}, \
                                            {\'cly-vue-chart-legend__p-trend--trend-down\': item.trend === \'down\'}]"\
                                >\
                                    <i class="cly-trend-up-icon ion-android-arrow-up" v-if="item.trend === \'up\'"></i>\
                                    <i class="cly-trend-down-icon ion-android-arrow-down" v-if="item.trend === \'down\'"></i>\
                                    <span v-if="typeof item.percentage === \'number\' && !isNaN(item.percentage)">{{item.percentage}}%</span>\
                                    <span v-if="typeof item.percentage === \'string\' && item.percentage.length">{{item.percentage}}</span>\
                                </div>\
                            </div>\
                        </div>\
                    </div>'
    });

    /*
        Custom legend class
        Structure of the object in data array -
        {
            name: name of the series to which this legend maps (optional)
            value: value of the series to display
            trend: accepted values are "up" and "down"
            percentage: percentage of the trend
            tooltip: tooltip text
        }
    */
    var CustomLegend = countlyBaseComponent.extend({
        mixins: [EchartRefMixin],
        props: {
            options: {
                type: Object,
                default: function() {
                    return {};
                }
            },
            seriesType: {
                type: String,
                default: ""
            },
            testId: {
                type: String,
                default: "custom-legend-test-id"
            }
        },
        data: function() {
            return {
                legendData: []
            };
        },
        computed: {
            legendClasses: function() {
                var classes = {};
                classes['cly-vue-chart-legend__' + this.options.position] = true;
                classes['cly-vue-chart-legend__' + this.seriesType] = true;
                return classes;
            }
        },
        components: {
            "secondary-legend": SecondaryLegend,
            "primary-legend": PrimaryLegend
        },
        methods: {
            onLegendClick: function(item, index) {
                var offs = this.legendData.filter(function(d) {
                    return d.status === "off";
                });

                if (item.status !== "off" && offs.length === (this.legendData.length - 1)) {
                    //Always show one series and hence the legend
                    return;
                }

                var obj = JSON.parse(JSON.stringify(this.legendData[index]));

                //For the first time, item.status does not exist
                //So we set it to off
                //On subsequent clicks we toggle between on and off

                if (obj.status === "off") {
                    obj.status = "on";
                    obj.displayColor = obj.color;

                    this.echartRef.dispatchAction({
                        type: "legendSelect",
                        name: item.name
                    });
                }
                else {
                    obj.status = "off";
                    obj.displayColor = "transparent";

                    this.echartRef.dispatchAction({
                        type: "legendUnSelect",
                        name: item.name
                    });
                }

                this.$set(this.legendData, index, obj);
            }
        },
        watch: {
            'options': {
                immediate: true,
                handler: function() {
                    var data = JSON.parse(JSON.stringify(this.options.data || []));

                    if (this.legendData) {
                        for (var i = 0; i < data.length; i++) {
                            var legend = data[i];

                            // eslint-disable-next-line no-loop-func
                            var existingLegend = this.legendData.find(function(o) {
                                return o.name === legend.name;
                            });

                            if (existingLegend) {
                                legend.status = existingLegend.status;
                                legend.displayColor = existingLegend.displayColor === 'transparent' ? existingLegend.displayColor : data[i].color;
                            }
                        }
                    }
                    data.forEach((item) => {
                        item.name = countlyCommon.unescapeHtml(item.name);
                    });
                    this.legendData = data;
                }
            }
        },
        template: '<div class="cly-vue-chart-legend" :class="legendClasses">\
                        <template v-if="options.type === \'primary\'">\
                            <primary-legend\
                                :data="legendData"\
                                :onClick="onLegendClick">\
                            </primary-legend>\
                        </template>\
                        <template v-if="options.type === \'secondary\'">\
                            <secondary-legend\
                                :testId="testId"\
                                :data="legendData"\
                                :position="options.position"\
                                :onClick="onLegendClick">\
                            </secondary-legend>\
                        </template>\
                    </div>'
    });

    Vue.component("cly-chart-zoom", ZoomInteractive);

    Vue.component("cly-chart-generic", BaseChart.extend({
        data: function() {
            return {
                forwardedSlots: ["chart-left", "chart-right"]
            };
        },
        components: {
            'chart-header': ChartHeader,
            'custom-legend': CustomLegend
        },
        computed: {
            chartOptions: function() {
                var opt = _mergeWith({}, this.baseOptions, this.option);
                opt = this.patchChart(opt);
                return opt;
            }
        },
        template: '<div class="cly-vue-chart" :class="chartClasses" :style="chartStyles">\
                        <div class="cly-vue-chart__echart bu-is-flex bu-is-flex-direction-column bu-is-flex-grow-1 bu-is-flex-shrink-1" style="min-height: 0">\
                            <chart-header ref="header":chart-type="\'pie\'" v-if="!isChartEmpty" @series-toggle="onSeriesChange" :show-zoom="showZoom" :show-toggle="showToggle" :show-download="showDownload">\
                                <template v-for="item in forwardedSlots" v-slot:[item]="slotScope">\
                                    <slot :name="item" v-bind="slotScope"></slot>\
                                </template>\
                            </chart-header>\
                            <div :class="[isChartEmpty && \'bu-is-flex bu-is-flex-direction-column bu-is-justify-content-center\', \'bu-is-flex-grow-1\']" style="min-height: 0">\
                                <echarts\
                                    v-if="!isChartEmpty"\
                                    :updateOptions="echartUpdateOptions"\
                                    ref="echarts"\
                                    v-bind="$attrs"\
                                    v-on="$listeners"\
                                    :option="chartOptions"\
                                    :autoresize="autoresize"\
                                    @datazoom="onDataZoom">\
                                </echarts>\
                                <div class="bu-is-flex bu-is-flex-direction-column bu-is-align-items-center" v-if="isChartEmpty && !isLoading">\
                                    <cly-empty-chart :classes="{\'bu-py-0\': true}"></cly-empty-chart>\
                                </div>\
                            </div>\
                        </div>\
                        <custom-legend\
                            ref="legend"\
                            :options="legendOptions"\
                            :seriesType="seriesType"\
                            v-if="legendOptions.show && !isChartEmpty"\
                        </custom-legend>\
                    </div>'
    }));

    Vue.component("cly-chart-flow", BaseChart.extend({
        data: function() {
            return {
                forwardedSlots: ["chart-left", "chart-right", "chart-header-left-input"],
                scrollOptions: {
                    vuescroll: {},
                    scrollPanel: {
                        scrollingY: false
                    },
                    rail: {
                        gutterOfSide: "1px",
                        gutterOfEnds: "15px"
                    },
                    bar: {
                        background: "#A7AEB8",
                        size: "6px",
                        specifyBorderRadius: "3px",
                        keepShow: true
                    }
                }
            };
        },
        components: {
            'chart-header': ChartHeader,
            'custom-legend': CustomLegend
        },
        computed: {
            chartOptions: function() {
                var ops = _mergeWith({}, this.baseOptions, this.option);
                delete ops.grid;
                delete ops.xAxis;
                delete ops.yAxis; //remove not needed to don;t get grey line at bottom

                ops = this.patchChart(ops);
                return ops;
            }
        },

        template: '<div class="cly-vue-chart" :class="chartClasses">\
                        <div class="cly-vue-chart__echart bu-is-flex bu-is-flex-direction-column bu-is-flex-grow-1 bu-is-flex-shrink-1" style="min-height: 0">\
                            <chart-header ref="header" :chart-type="\'flow\'" v-if="!isChartEmpty" @series-toggle="onSeriesChange" :show-zoom="showZoom" :show-toggle="showToggle" :show-download="showDownload">\
                                <template v-for="item in forwardedSlots" v-slot:[item]="slotScope">\
                                    <slot :name="item" v-bind="slotScope"></slot>\
                                </template>\
                            </chart-header>\
							<div class="chart-wrapper" :style="{height: (chartOptions.chartheight) + \'px\'}">\
                                <vue-scroll :ops="scrollOptions" >\
                                    <div :class="[isChartEmpty && \'bu-is-flex bu-is-flex-direction-column bu-is-justify-content-center\']" :style="{\'min-width\':\'100%\',height: (chartOptions.chartheight) + \'px\', width: chartOptions.chartwidth + \'px\'}">\
                                            <echarts\
                                                v-if="!isChartEmpty"\
                                                :updateOptions="echartUpdateOptions"\
                                                ref="echarts"\
                                                v-bind="$attrs"\
                                                v-on="$listeners"\
                                                :option="chartOptions"\
                                                :autoresize="autoresize"\
                                                @datazoom="onDataZoom">\
                                            </echarts>\
                                        <div class="bu-is-flex bu-is-flex-direction-column bu-is-align-items-center" v-if="isChartEmpty && !isLoading">\
                                            <cly-empty-chart :classes="{\'bu-py-0\': true}"></cly-empty-chart>\
                                        </div>\
                                    </div>\
                                </vue-scroll>\
							</div>\
                        </div>\
                        <custom-legend\
                            ref="legend"\
                            :options="legendOptions"\
                            :seriesType="seriesType"\
                            v-if="legendOptions.show && !isChartEmpty">\
                        </custom-legend>\
                    </div>'
    }));

    Vue.component("cly-chart-line", BaseLineChart.extend({
        mixins: [
            xAxisOverflowHandler,
            countlyVue.mixins.autoRefresh
        ],
        data: function() {
            return {
                forwardedSlots: ["chart-left", "chart-right"]
            };
        },
        components: {
            'chart-header': ChartHeader,
            'custom-legend': CustomLegend
        },
        computed: {
            chartOptions: function() {
                if (this.mergedOptions && this.mergedOptions.series && this.mergedOptions.series.length > 1) {
                    for (var index = 1; index < this.mergedOptions.series.length; index++) {
                        delete this.mergedOptions.series[index].markPoint;
                    }
                }
                var opt = _mergeWith({}, this.mergedOptions);

                opt = this.patchChart(opt);
                opt = this.patchOptionsForXAxis(opt);
                return opt;
            }
        },
        methods: {
            refresh: function() {
                if (this.seriesOptions.type !== "line") {
                    this.seriesOptions.markPoint.data = [];
                }
                else if (!this.areNotesHidden) {
                    this.getGraphNotes();
                }
            },
            notesVisibility: function() {
                if (!this.areNotesHidden) {
                    this.getGraphNotes();
                }
                else {
                    this.seriesOptions.markPoint.data = [];
                }
            }
        },
        props: {
            hideNotation: {
                type: Boolean,
                default: false,
                required: false
            }
        },
        template: '<div class="cly-vue-chart" :class="chartClasses" :style="chartStyles">\
                        <div class="cly-vue-chart__echart bu-is-flex bu-is-flex-direction-column bu-is-flex-grow-1 bu-is-flex-shrink-1" style="min-height: 0">\
                        <chart-header :chart-type="\'line\'" :category="this.category" :hide-notation="this.hideNotation" ref="header" v-if="!isChartEmpty" @series-toggle="onSeriesChange" :show-zoom="showZoom" :show-toggle="showToggle" :show-download="showDownload" @graph-notes-refresh="refresh" @notes-visibility="notesVisibility">\
                                <template v-for="item in forwardedSlots" v-slot:[item]="slotScope">\
                                    <slot :name="item" v-bind="slotScope"></slot>\
                                </template>\
                            </chart-header>\
                            <div :class="[isChartEmpty && \'bu-is-flex bu-is-flex-direction-column bu-is-justify-content-center\', \'bu-is-flex-grow-1\']" style="min-height: 0">\
                            <echarts\
                                v-if="!isChartEmpty"\
                                :updateOptions="echartUpdateOptions"\
                                ref="echarts"\
                                v-bind="$attrs"\
                                v-on="$listeners"\
                                :option="chartOptions"\
                                @click="onClick"\
                                :autoresize="autoresize"\
                                @finished="onChartFinished"\
                                @datazoom="onDataZoom">\
                            </echarts>\
                                <div class="bu-is-flex bu-is-flex-direction-column bu-is-align-items-center" v-if="isChartEmpty && !isLoading">\
                                    <cly-empty-chart :classes="{\'bu-py-0\': true}"></cly-empty-chart>\
                                </div>\
                            </div>\
                        </div>\
                        <custom-legend\
                            ref="legend"\
                            :options="legendOptions"\
                            :seriesType="seriesType"\
                            v-if="legendOptions.show && !isChartEmpty">\
                        </custom-legend>\
                    </div>'
    }));


    Vue.component("cly-chart-time", BaseLineChart.extend({
        data: function() {
            return {
                forwardedSlots: ["chart-left", "chart-right"]
            };
        },
        props: {
            bucket: {
                type: String,
                validator: function(value) {
                    return ['hourly', 'daily', 'weekly', 'monthly'].indexOf(value) !== -1;
                }
            },
            dummy: {
                type: Boolean
            },
            period: {
                type: [Array, String]
            },
            hideNotation: {
                type: Boolean,
                default: false,
                required: false
            },
            noHourly: {
                type: Boolean,
                default: false,
                required: false
            }
        },
        components: {
            'chart-header': ChartHeader,
            'custom-legend': CustomLegend
        },
        computed: {
            chartOptions: function() {
                if (this.mergedOptions && this.mergedOptions.series && this.mergedOptions.series.length > 1) {
                    for (var index = 1; index < this.mergedOptions.series.length; index++) {
                        delete this.mergedOptions.series[index].markPoint;
                    }
                }
                var opt = _mergeWith({}, this.mergedOptions);

                var xAxisData = [];
                if (!opt.xAxis.data) {
                    /*
                        If xAxis.data is not provided,
                        create xAxis.data automatically
                    */

                    var period = (this.period && this.period.length) ? this.period : countlyCommon.getPeriod();

                    var chartsCommon = new CommonConstructor();
                    //We wont change the global period state
                    chartsCommon.setPeriod(period, undefined, true);

                    var tickObj = {};

                    if (period === "month" && this.category !== "active-users" && !this.bucket) {
                        tickObj = chartsCommon.getTickObj("monthly", false, true);
                    }
                    else if (countlyCommon.periodObj.numberOfDays === 1 && this.noHourly) {
                        tickObj = {
                            ticks: [[0, countlyCommon.formatDate(moment((countlyCommon.periodObj.activePeriod).replace(/\./g, "/"), "YYYY/MM/DD"), "D MMM")]],
                            tickTexts: [countlyCommon.formatDate(moment((countlyCommon.periodObj.activePeriod).replace(/\./g, "/"), "YYYY/MM/DD"), "D MMM")]
                        };
                    }
                    else {
                        tickObj = chartsCommon.getTickObj(this.bucket, false, true);
                    }

                    var ticks = tickObj.ticks;
                    for (var i = 0; i < ticks.length; i++) {
                        var tick = ticks[i];
                        var tickIndex = tick[0];
                        var tickValue = tick[1];
                        while (xAxisData.length < tickIndex) {
                            /*
                                tickIndex is the array index
                                Although ticks should be continuous, but they might not be
                            */
                            xAxisData.push("");
                        }
                        xAxisData.push(tickValue);
                    }

                    opt.xAxis.data = xAxisData;
                }

                if (this.dummy) {
                    //Adding dummy data start
                    var dummyData = [];
                    for (var j = 0; j < xAxisData.length; j++) {
                        dummyData.push(parseInt(Math.random() * 100));
                    }

                    for (var k = 0; k < opt.series.length; k++) {
                        opt.series[k].data = dummyData;
                    }
                    //Adding dummy data end
                }

                opt = this.patchChart(opt);

                return opt;
            }
        },
        methods: {
            refresh: function() {
                if (this.seriesOptions.type !== "line") {
                    this.seriesOptions.markPoint.data = [];
                }
                else if (!this.areNotesHidden) {
                    this.getGraphNotes();
                }
            },
            notesVisibility: function() {
                if (!this.areNotesHidden) {
                    this.getGraphNotes();
                }
                else {
                    this.seriesOptions.markPoint.data = [];
                }
            },
        },
        template: '<div class="cly-vue-chart" :class="chartClasses" :style="chartStyles">\
                        <div class="cly-vue-chart__echart bu-is-flex bu-is-flex-direction-column bu-is-flex-grow-1 bu-is-flex-shrink-1" style="min-height: 0">\
                            <chart-header ref="header" :category="this.category" :hide-notation="this.hideNotation" v-if="!isChartEmpty" @series-toggle="onSeriesChange" :show-zoom="showZoom" :show-toggle="showToggle" :show-download="showDownload" @graph-notes-refresh="refresh" @notes-visibility="notesVisibility">\
                                <template v-for="item in forwardedSlots" v-slot:[item]="slotScope">\
                                    <slot :name="item" v-bind="slotScope"></slot>\
                                </template>\
                            </chart-header>\
                            <div :class="[isChartEmpty && \'bu-is-flex bu-is-flex-direction-column bu-is-justify-content-center\', \'bu-is-flex-grow-1\']" style="min-height: 0">\
                                <echarts\
                                    v-if="!isChartEmpty"\
                                    :updateOptions="echartUpdateOptions"\
                                    ref="echarts"\
                                    v-bind="$attrs"\
                                    v-on="$listeners"\
                                    :option="chartOptions"\
                                    @click="onClick"\
                                    :autoresize="autoresize"\
                                    @datazoom="onDataZoom"/>\
                                <div class="bu-is-flex bu-is-flex-direction-column bu-is-align-items-center" v-if="isChartEmpty && !isLoading">\
                                    <cly-empty-chart :classes="{\'bu-py-0\': true}"></cly-empty-chart>\
                                </div>\
                            </div>\
                        </div>\
                        <custom-legend\
                            ref="legend"\
                            :options="legendOptions"\
                            :seriesType="seriesType"\
                            v-if="legendOptions.show && !isChartEmpty">\
                        </custom-legend>\
                    </div>'
    }));

    Vue.component("cly-chart-bar", BaseBarChart.extend({
        mixins: [
            xAxisOverflowHandler
        ],
        data: function() {
            return {
                forwardedSlots: ["chart-left", "chart-right"]
            };
        },
        props: {
            patchXAxis: {
                type: Boolean,
                default: true,
                required: false
            },
            testId: {
                type: String,
                default: "cly-chart-bar-test-id",
                required: false
            }
        },
        components: {
            'chart-header': ChartHeader,
            'custom-legend': CustomLegend
        },
        computed: {
            chartOptions: function() {
                var opt = _mergeWith({}, this.mergedOptions);
                opt = this.patchChart(opt);
                if (this.patchXAxis) {
                    opt = this.patchOptionsForXAxis(opt);
                }
                return opt;
            }
        },
        template: '<div class="cly-vue-chart" :class="chartClasses" :style="chartStyles">\
                        <div class="cly-vue-chart__echart bu-is-flex bu-is-flex-direction-column bu-is-flex-grow-1 bu-is-flex-shrink-1" style="min-height: 0">\
                            <chart-header :chart-type="\'bar\'" ref="header" v-if="!isChartEmpty" :test-id="testId" @series-toggle="onSeriesChange" :show-zoom="showZoom" :show-toggle="showToggle" :show-download="showDownload">\
                                <template v-for="item in forwardedSlots" v-slot:[item]="slotScope">\
                                    <slot :name="item" v-bind="slotScope"></slot>\
                                </template>\
                            </chart-header>\
                            <div :class="[isChartEmpty && \'bu-is-flex bu-is-flex-direction-column bu-is-justify-content-center\', \'bu-is-flex-grow-1\']" style="min-height: 0">\
                                <echarts\
                                    v-if="!isChartEmpty"\
                                    :updateOptions="echartUpdateOptions"\
                                    ref="echarts"\
                                    v-bind="$attrs"\
                                    v-on="$listeners"\
                                    :option="chartOptions"\
                                    :autoresize="autoresize"\
                                    @finished="onChartFinished"\
                                    @datazoom="onDataZoom">\
                                </echarts>\
                                <div class="bu-is-flex bu-is-flex-direction-column bu-is-align-items-center" v-if="isChartEmpty && !isLoading">\
                                    <cly-empty-chart :test-id="testId" :classes="{\'bu-py-0\': true}"></cly-empty-chart>\
                                </div>\
                            </div>\
                        </div>\
                        <custom-legend\
                            ref="legend"\
                            :options="legendOptions"\
                            :seriesType="seriesType"\
                            :testId="testId"\
                            v-if="legendOptions.show && !isChartEmpty">\
                        </custom-legend>\
                    </div>'
    }));

    Vue.component("cly-chart-pie", BasePieChart.extend({
        data: function() {
            return {
                forwardedSlots: ["chart-left", "chart-right"]
            };
        },
        components: {
            'chart-header': ChartHeader,
            'custom-legend': CustomLegend
        },
        computed: {
            chartOptions: function() {
                var opt = _mergeWith({}, this.mergedOptions);
                opt = this.patchChart(opt);
                return opt;
            },
            classes: function() {
                var classes = {
                    "bu-column": true
                };

                if (this.legendOptions.show) {
                    classes["bu-is-half"] = true;
                }
                else {
                    classes["bu-is-full"] = true;
                }

                return classes;
            },
            pieLegendOptions: function() {
                var opt = _mergeWith({}, this.legendOptions);
                opt.type = "secondary";

                if (opt.position === "bottom") {
                    opt.position = "right";
                }

                return opt;
            }
        },
        template: '<div class="cly-vue-chart" :class="chartClasses" :style="chartStyles">\
                        <div class="cly-vue-chart__echart bu-is-flex bu-is-flex-direction-column bu-is-flex-grow-1" style="height: 100%">\
                            <chart-header ref="header" :chart-type="\'pie\'" v-if="!isChartEmpty" @series-toggle="onSeriesChange" :show-zoom="showZoom" :show-toggle="showToggle" :show-download="showDownload">\
                                <template v-for="item in forwardedSlots" v-slot:[item]="slotScope">\
                                    <slot :name="item" v-bind="slotScope"></slot>\
                                </template>\
                            </chart-header>\
                            <div :class="[isChartEmpty && \'bu-is-flex bu-is-flex-direction-column bu-is-justify-content-center\', \'bu-columns bu-is-gapless bu-is-flex-grow-1\']" style="min-height: 0;">\
                                <div :class="classes">\
                                    <echarts\
                                        v-if="!isChartEmpty"\
                                        :updateOptions="echartUpdateOptions"\
                                        ref="echarts"\
                                        v-bind="$attrs"\
                                        v-on="$listeners"\
                                        :option="chartOptions"\
                                        :autoresize="autoresize"\
                                        @datazoom="onDataZoom">\
                                    </echarts>\
                                </div>\
                                <custom-legend\
                                    ref="legend"\
                                    :options="pieLegendOptions"\
                                    :seriesType="seriesType"\
                                    v-if="pieLegendOptions.show && !isChartEmpty && !hasAllEmptyValues"\
                                    :class="classes" class="shadow-container">\
                                </custom-legend>\
								<div v-if="!isChartEmpty && hasAllEmptyValues" :class="classes" class="shadow-container">\
									<div class="cly-vue-chart-legend__secondary" >\
										<div style="height: 100%; display: flex; flex-direction: column; justify-content: center;">\
											<div class="bu-p-4">{{i18n("common.bar.no-data")}}</div>\
										</div>\
									</div>\
								</div>\
                                <div class="bu-column bu-is-flex-direction-column bu-is-align-items-center" v-if="isChartEmpty && !isLoading">\
                                    <cly-empty-chart :classes="{\'bu-py-0\': true}"></cly-empty-chart>\
                                </div>\
                            </div>\
                        </div>\
                    </div>'
    }));

    Vue.component("cly-map-picker", countlyVue.components.create({
        components: {
            'l-map': Vue2Leaflet.LMap,
            'l-tile-layer': Vue2Leaflet.LTileLayer,
            'l-marker': Vue2Leaflet.LMarker,
            'l-circle': Vue2Leaflet.LCircle,
        },
        props: {
            value: {
                type: [Object],
                required: false,
                validator: function(item) {
                    return item && item.lng && item.lat;
                },
                default: null
            },
            radius: {
                type: Object,
                required: false,
                validator: function(value) {
                    return value && (value.unit === 'km' || value.unit === 'mi') && value.value;
                },
                default: null
            },
            isEnabled: {
                type: Boolean,
                required: false,
                default: false
            },
            height: {
                type: String,
                required: false,
                default: '450px'
            }
        },
        data: function() {
            return {
                defaultCenterCoordinates: {lat: 48.66194284607008, lng: 8.964843750000002}, // Note: arbitrary coordinates used for map center when user location is not found
                userCenterCoordinates: null,
                tileFeed: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                tileAttribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
                markerIcon: L.icon({
                    iconUrl: '/images/leaflet/marker-icon.svg',
                    iconSize: [32, 32],
                    iconAnchor: [ 16, 32],
                }),
                MI_TO_KM_RATIO: 1.60934,
                KM_TO_M_RATIO: 1000,
                RadiusUnitEnum: {
                    KM: 'km',
                    MI: 'mi'
                }
            };
        },
        computed: {
            radiusInMeters: function() {
                if (this.radius && this.radius.unit === this.RadiusUnitEnum.KM) {
                    return this.radius.value * this.KM_TO_M_RATIO;
                }
                if (this.radius && this.radius.unit === this.RadiusUnitEnum.MI) {
                    return this.radius.value * this.MI_TO_KM_RATIO * this.KM_TO_M_RATIO;
                }
                return 0;
            },
            centerCoordinates: function() {
                if (this.value) {
                    return this.value;
                }
                if (this.userCenterCoordinates) {
                    return this.userCenterCoordinates;
                }
                return this.defaultCenterCoordinates;
            },
            dynamicZoom: function() {
                if (this.value) {
                    return 8;
                }
                if (this.userCenterCoordinates) {
                    return 12;
                }
                return 6;
            },
        },
        methods: {
            onLocationClick: function(event) {
                this.$emit('input', event.latlng);
            },
            onLocationFound: function(event) {
                this.userCenterCoordinates = event.latlng;
            },
            locateUserWhenMarkerNotFound: function() {
                if (!this.value) {
                    this.$nextTick(function() {
                        this.$refs.lmap.mapObject.locate({setView: true});
                    });
                }
            },
            registerEventListenersWhenEnabled: function(listeners) {
                var self = this;
                if (!this.isEnabled) {
                    return;
                }
                this.$nextTick(function() {
                    listeners.forEach(function(item) {
                        self.$refs.lmap.mapObject.on(item.name, item.handler);
                    });
                });
            },
            unregisterEventListenersWhenEnabled: function(listeners) {
                var self = this;
                if (!this.isEnabled) {
                    return;
                }
                listeners.forEach(function(item) {
                    self.$refs.lmap.mapObject.off(item.name, item.handler);
                });
            },
            invalidateSize: function() {
                window.dispatchEvent(new Event('resize'));
            }
        },
        mounted: function() {
            this.registerEventListenersWhenEnabled([
                {name: 'click', handler: this.onLocationClick},
                {name: 'locationfound', handler: this.onLocationFound}
            ]);
            this.locateUserWhenMarkerNotFound();
        },
        beforeDestroy: function() {
            this.unregisterEventListenersWhenEnabled([
                {name: 'click', handler: this.onLocationClick},
                {name: 'locationfound', handler: this.onLocationFound}
            ]);
        },
        template: CV.T('/javascripts/countly/vue/templates/mappicker.html')
    }));

    Vue.component("cly-worldmap", countlyVue.components.create({
        components: {
            'l-map': Vue2Leaflet.LMap,
            'l-circle-marker': Vue2Leaflet.LCircleMarker,
            'l-geo-json': Vue2Leaflet.LGeoJson,
            'l-tile-layer': Vue2Leaflet.LTileLayer,
            'l-control': Vue2Leaflet.LControl,
            'l-tooltip': Vue2Leaflet.LTooltip,
            'l-control-zoom': Vue2Leaflet.LControlZoom
        },
        mixins: [countlyVue.mixins.commonFormatters, countlyVue.mixins.i18n],
        props: {
            navigationLoading: {
                type: Boolean,
                default: false,
                required: false
            },
            showNavigation: {
                type: Boolean,
                default: true,
                required: false
            },
            showDetailModeSelect: {
                type: Boolean,
                default: true,
                required: false
            },
            externalCountry: {
                type: String,
                default: null,
                required: false
            },
            externalDetailMode: {
                type: String,
                default: null,
                required: false
            },
            valueType: {
                type: String,
                default: "",
                required: false
            },
            showTile: {
                type: Boolean,
                default: false,
                required: false
            },
            countriesData: {
                type: Object,
                default: function() {
                    return {};
                },
                required: false
            },
            regionsData: {
                type: Object,
                default: function() {
                    return {};
                },
                required: false
            },
            citiesData: {
                type: Object,
                default: function() {
                    return {};
                },
                required: false
            },
            fillColor: {
                type: String,
                default: '#D6D6D6',
                required: false
            },
            borderColor: {
                type: String,
                default: '#FFF',
                required: false
            },
            maxMarkerRadius: {
                type: Number,
                default: 15,
                required: false
            },
            minMarkerRadius: {
                type: Number,
                default: 4,
                required: false
            },
            countriesTitle: {
                type: String,
                default: '',
                required: false
            },
            regionsTitle: {
                type: String,
                default: '',
                required: false
            },
            citiesTitle: {
                type: String,
                default: '',
                required: false
            },
            preventGoingToCountry: {
                type: Boolean,
                default: false,
                required: false
            },
            preventLayerClick: {
                type: Boolean,
                default: false,
                required: false
            },
            options: {
                type: Object,
                default: function() {
                    return {};
                }
            },
            minZoom: {
                type: Number,
                default: 1
            },
            maxZoom: {
                type: Number,
                default: null
            },
            showTooltip: {
                type: Boolean,
                default: true
            },
            blockAutoLoading: {
                type: Boolean,
                default: false
            }
        },
        beforeCreate: function() {
            this.geojsonHome = [];
            this.geojsonDetail = [];
        },
        created: function() {
            var self = this;
            this.loadGeojson().then(function(json) {
                self.geojsonHome = json;
                json.features.forEach(function(f) {
                    self.boundingBoxes[f.properties.code] = f.bbox;
                    self.countriesToLatLng[f.properties.code] = {
                        lat: f.properties.lat,
                        lon: f.properties.lon
                    };
                });
                self.handleViewChange();
            });
        },
        beforeDestroy: function() {
            this.geojsonHome = [];
            this.geojsonDetail = [];
            // We don't need reactivity for these fields. So they are defined outside "data".
        },
        data: function() {
            return {
                loadingGeojson: false,
                loadingCities: false,
                enableTooltip: true,
                maxBounds: null,
                tileFeed: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                tileAttribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
                boundingBoxes: {},
                country: null,
                focusedRegion: null,
                focusedCity: null,
                detailMode: 'regions',
                countriesToLatLng: {},
                regionsToLatLng: {},
                citiesToLatLng: {},
                markerTooltipOptions: {
                    sticky: true,
                    direction: "auto"
                },
                circleMarkerConfig: {
                    pane: "markerPane",
                    fillColor: "#017AFF",
                    fillOpacity: 0.6,
                    color: "transparent",
                },
                defaultMapOptions: {
                    attributionControl: false,
                    zoom: 1,
                    zoomSnap: 0.1,
                    zoomDelta: 0.5,
                    zoomControl: false,
                    scrollWheelZoom: false
                }
            };
        },
        watch: {
            country: function(newVal) {
                this.$emit("countryChanged", newVal);
            },
            detailMode: function(newVal) {
                this.$emit("detailModeChanged", newVal);
            },
            citiesData: function() {
                if (this.detailMode === 'cities') {
                    this.indexCities();
                }
            },
            externalCountry: {
                immediate: true,
                handler: function(newVal) {
                    if (!newVal) {
                        this.goToMain();
                    }
                    else {
                        this.goToCountry(newVal);
                    }
                }
            },
            externalDetailMode: {
                immediate: true,
                handler: function(newVal) {
                    if (newVal === "regions" || newVal === "cities") {
                        this.detailMode = newVal;
                    }
                }
            }
        },
        computed: {
            loading: function() {
                return !this.blockAutoLoading && (this.loadingGeojson || this.loadingCities);
            },
            inDetail: function() {
                return this.country !== null;
            },
            optionsHome: function() {
                return {
                    onEachFeature: this.onEachFeatureFunction
                };
            },
            optionsDetail: function() {
                return {
                    onEachFeature: this.onEachFeatureFunctionDetail
                };
            },
            styleFunction: function() {
                var fillColor = this.fillColor,
                    borderColor = this.borderColor;

                return function() {
                    return {
                        weight: 1,
                        color: borderColor,
                        opacity: 1,
                        fillColor: fillColor,
                        fillOpacity: 1
                    };
                };
            },
            onEachFeatureFunction: function(/*params*/) {
                var self = this;
                return function(feature, layer) {
                    if (!self.preventLayerClick) {
                        layer.on('click', function() {
                            self.goToCountry(feature.properties.code);
                        });
                    }
                };
            },
            onEachFeatureFunctionDetail: function() {
                return function() {};
            },
            currentViewType: function() {
                if (!this.inDetail) {
                    return "main";
                }
                return this.detailMode;
            },
            locations: function() {
                var self = this,
                    arr = [];

                switch (this.currentViewType) {
                case "main":
                    var countryCodes = Object.keys(this.countriesData);

                    arr = countryCodes.map(function(code) {
                        return {
                            label: countlyLocation.getCountryName(code),
                            value: code,
                            icon: countlyGlobal.cdn + "images/flags/" + code.toLowerCase() + ".svg",
                            custom: self.countriesData[code] || {}
                        };
                    });
                    break;

                case "regions":
                    var regionCodes = Object.keys(this.regionsData[this.country] || {});

                    arr = regionCodes.map(function(code) {
                        return {
                            label: countlyLocation.getRegionName(code, self.country),
                            value: code,
                            custom: self.regionsData[self.country][code]
                        };
                    });
                    break;

                case "cities":
                    var cityNames = Object.keys(this.citiesData[this.country] || {});

                    arr = cityNames.map(function(name) {
                        return {
                            label: name,
                            value: name,
                            custom: self.citiesData[self.country][name]
                        };
                    });
                    break;
                }
                arr.sort(function(a, b) {
                    return b.custom.value - a.custom.value;
                });
                return arr;
            },
            activeMarkers: function() {
                switch (this.currentViewType) {
                case "main":
                    return this.countriesData;
                case "regions":
                    return this.regionsData[this.country];
                case "cities":
                    return this.citiesData[this.country];
                }
            },
            largestMarkerValue: function() {
                if (!this.activeMarkers) {
                    return 1;
                }
                var self = this;
                return Object.keys(this.activeMarkers).reduce(function(acc, val) {
                    return Math.max(acc, self.activeMarkers[val].value);
                }, 0);
            },
            nameToLatLng: function() {
                switch (this.currentViewType) {
                case "main":
                    return this.countriesToLatLng;
                case "regions":
                    return this.regionsToLatLng;
                case "cities":
                    return this.citiesToLatLng;
                }
            },
            countryName: function() {
                return countlyLocation.getCountryName(this.country);
            },
            countryValue: function() {
                if (!this.countriesData[this.country]) {
                    return "-";
                }
                return this.countriesData[this.country].value;
            },
            inDetailWrapperStyle: function() {
                var style = {
                    'overflow': 'hidden',
                    'height': '100%'
                };

                if (this.inDetail) {
                    style.height = 'calc(100% - 185px)';
                }

                return style;
            },
            mapOptions: function() {
                var options = this.options;
                var opt = this.defaultMapOptions;

                for (var key in options) {
                    opt[key] = options[key];
                }

                return opt;
            }
        },
        methods: {
            indexCities: function() {
                var self = this;
                if (this.citiesData[this.country]) {
                    return self.loadCities(this.country, Object.keys(this.citiesData[this.country])).then(function(json) {
                        self.citiesToLatLng = {};
                        json.forEach(function(f) {
                            self.citiesToLatLng[f.name] = {lat: f.loc.coordinates[1], lon: f.loc.coordinates[0]};
                        });
                    });
                }
                else {
                    self.citiesToLatLng = {};
                }
                return Promise.resolve();
            },
            boxToLatLng2d: function(boundingBox) {
                var x0 = boundingBox[0],
                    y0 = boundingBox[1],
                    x1 = boundingBox[2],
                    y1 = boundingBox[3];

                return [
                    [y0, x0],
                    [y1, x1]
                ];
            },
            getMarkerRadius: function(value) {
                if (this.minMarkerRadius >= this.maxMarkerRadius) {
                    return this.minMarkerRadius;
                }
                return Math.max(this.minMarkerRadius, (value / this.largestMarkerValue) * this.maxMarkerRadius);
            },
            getMarkerFlag: function(code) {
                if (this.detailMode === "cities") {
                    return false;
                }
                else {
                    return "/images/flags/" + code.toLowerCase() + ".png";
                }
            },
            getMarkerTooltipTitle: function(code) {
                switch (this.currentViewType) {
                case "main":
                    return countlyLocation.getCountryName(code);
                case "regions":
                    return countlyLocation.getRegionName(code, self.country);
                case "cities":
                    return code;
                }
            },
            updateMaxBounds: function() {
                var boundingBox = this.inDetail ? this.boundingBoxes[this.country] : this.geojsonHome.bbox;
                if (boundingBox) {
                    this.maxBounds = this.boxToLatLng2d(boundingBox);
                    if (this.$refs.lmap && this.$refs.lmap.mapObject) {
                        this.$refs.lmap.mapObject.fitBounds(this.maxBounds, {animate: false, padding: [20, 20]});
                    }
                }
            },
            loadGeojson: function(country) {
                var self = this;
                this.loadingGeojson = true;

                var url = '/geodata/world.geojson';

                if (country) {
                    url = '/geodata/region/' + country + '.geojson';
                }

                return CV.$.ajax({
                    type: "GET",
                    url: url,
                    dataType: "json",
                }).then(function(json) {
                    var componentContext = self;
                    if (!componentContext._isBeingDestroyed && !componentContext._isDestroyed) {
                        self.loadingGeojson = false;
                        return Object.freeze(json);
                    }
                    else {
                        return [];
                    }
                });
            },
            loadCities: function(country, cities) {
                var self = this;
                this.loadingCities = true;

                var query = {"country": country};

                if (cities) {
                    query.name = {"$in": cities};
                }

                return CV.$.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.r,
                    data: {
                        "app_id": countlyCommon.ACTIVE_APP_ID,
                        "method": "geodata",
                        "loadFor": "cities",
                        "query": JSON.stringify(query),
                        "preventRequestAbort": true
                    },
                    dataType: "json",
                }).then(function(json) {
                    var componentContext = self;
                    if (!componentContext._isBeingDestroyed && !componentContext._isDestroyed) {
                        self.loadingCities = false;
                        return Object.freeze(json);
                    }
                    else {
                        return [];
                    }
                });
            },
            goToMain: function() {
                this.geojsonDetail = [];
                this.country = null;
                this.handleViewChange();
            },
            goToCountry: function(country) {
                this.$emit("country-click", country);
                if (this.preventGoingToCountry) {
                    return;
                }

                var self = this;

                if (!Object.prototype.hasOwnProperty.call(this.countriesData, country)) {
                    return;
                }

                this.loadGeojson(country).then(function(json) {
                    self.geojsonDetail = json;
                    self.country = country;
                    self.regionsToLatLng = {};
                    json.features = json.features || {};
                    json.features.forEach(function(f) {
                        self.regionsToLatLng[f.properties.iso_3166_2] = {
                            lat: f.properties.lat || 0,
                            lon: f.properties.lon || 0
                        };
                    });
                    return self.indexCities().then(function() {
                        self.handleViewChange();
                    });
                });
            },
            onMarkerClick: function(code) {
                if (!this.inDetail && !this.preventLayerClick) {
                    this.goToCountry(code);
                }
            },
            focusToRegion: function() {

            },
            focusToCity: function() {

            },
            handleViewChange: function() {
                this.updateMaxBounds();
            },
            unique: function(name) {
                return name + "_" + moment.now();
            },
            countryIcon: function(code) {
                return countlyGlobal.cdn + "images/flags/" + code.toLowerCase() + ".svg";
            }
        },
        template: CV.T('/javascripts/countly/vue/templates/worldmap.html')
    }));

}(window.countlyVue = window.countlyVue || {}));