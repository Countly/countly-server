/* global Promise, Vue, countlyCommon, countlyLocation, _merge, CommonConstructor, countlyGlobal, Vue2Leaflet, CV, moment, L */

// _merge is Lodash merge - /frontend/express/public/javascripts/utils/lodash.merge.js

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
                var options = _merge({}, this.calculatedLegend, this.legend || {});

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
                return _merge({}, this.internalUpdateOptions, this.updateOptions || {});
            }
        }
    };

    var EventsMixin = {
        methods: {
            onSeriesChange: function(v) {
                this.seriesOptions.type = v;
                this.$emit("series-toggle", v);
            }
        }
    };

    countlyVue.mixins.zoom = ExternalZoomMixin;

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
                default: 472
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
                        bottom: 15,
                        left: 36,
                        right: 24,
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
                                yAxisIndex: false
                            },
                            magicType: {
                                show: false,
                                type: ['line', 'bar']
                            }
                        },
                        right: 15,
                        top: 5,
                        itemSize: 0
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
                        formatter: function(params) {
                            var template = "";
                            if (params.seriesType === 'pie') {
                                template += '<div class="bu-is-flex">\
                                                        <div class="chart-tooltip__bar bu-mr-2" style="background-color: ' + params.color + ';"></div>\
                                                        <div>\
                                                            <div class="chart-tooltip__header text-smaller font-weight-bold bu-mb-3">' + params.seriesName + '</div>\
                                                            <div class="text-small"> ' + params.data.name + '</div>\
                                                            <div class="text-big">' + self.valFormatter(params.data.value) + '</div>\
                                                        </div>\
                                                  </div>';

                                return template;
                            }
                            else {
                                template = "<div class='chart-tooltip'>";
                                if (params.length > 0) {
                                    template += "<span class='chart-tooltip__header text-smaller font-weight-bold'>" + params[0].axisValueLabel + "</span></br>";
                                }

                                for (var i = 0; i < params.length; i++) {
                                    template += '<div class="chart-tooltip__body">\
                                                        <div class="chart-tooltip__bar" style="background-color: ' + params[i].color + ';"></div>\
                                                    <div class="chart-tooltip__series">\
                                                            <span class="text-small bu-mr-2">' + params[i].seriesName + '</span>\
                                                        <div class="chart-tooltip__value">\
                                                            <span class="text-big">' + (typeof params[i].value === 'object' ? self.valFormatter((isNaN(params[i].value[1]) ? 0 : params[i].value[1]), params[i].value, i) : self.valFormatter((isNaN(params[i].value) ? 0 : params[i].value), null, i)) + '</span>\
                                                        </div>\
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
                            showMinLabel: true,
                            showMaxLabel: true,
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
                            formatter: function(value) {
                                if (typeof value === "number") {
                                    return countlyCommon.getShortNumber(value);
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
                var options = _merge({}, this.option);

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
        props: {
            showToggle: {
                type: Boolean,
                default: true
            },
        },
        data: function() {
            return {
                mixinOptions: {},
                seriesOptions: {
                    type: 'line'
                }
            };
        },
        computed: {
            mergedOptions: function() {
                var opt = _merge({}, this.baseOptions, this.mixinOptions, this.option);
                var series = opt.series || [];

                for (var i = 0; i < series.length; i++) {
                    series[i] = _merge({}, this.baseSeriesOptions, this.seriesOptions, series[i]);
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
                var opt = _merge({}, this.baseOptions, this.mixinOptions, this.option);
                var series = opt.series || [];

                for (var i = 0; i < series.length; i++) {
                    series[i] = _merge({}, this.baseSeriesOptions, this.seriesOptions, series[i]);
                }

                this.setCalculatedLegendData(opt, series);

                opt.series = series;

                if (this.legendOptions.position !== "bottom") {
                    opt.grid.right = 0;
                }

                return opt;
            }
        },
        methods: {
            handleXAxisOverflow: function(options, strategy) {
                if (strategy === "unset" || !options || !options.xAxis || !options.xAxis.data) {
                    return null;
                }
                var xAxis = options.xAxis;

                // Early return, no need to analyze the array
                if (xAxis.data.length > 15) {
                    // no need to force all points to be present
                    // if there are too many of them
                    return {
                        grid: {containLabel: false, bottom: 90, left: 75},
                        xAxis: {
                            axisLabel: {
                                width: 100,
                                overflow: "truncate",
                                rotate: 45,
                            }
                        }
                    };
                }
                else if (xAxis.data.length >= 5) {
                    return {
                        grid: {containLabel: false, bottom: 90, left: 75},
                        xAxis: {
                            axisLabel: {
                                width: 100,
                                overflow: "truncate",
                                interval: 0,
                                rotate: 45,
                            }
                        }
                    };
                }

                var maxLen = 0;

                xAxis.data.forEach(function(item) {
                    var str = "";
                    if (Array.isArray(item)) {
                        str = (item[1] || item[0] || "") + "";
                    }
                    else {
                        str = (item || "") + "";
                    }
                    maxLen = Math.max(maxLen, str.length);
                });

                if (maxLen > 25 && xAxis.data.length >= 2) {
                    return {
                        grid: {containLabel: false, bottom: 90, left: 75},
                        xAxis: {
                            axisLabel: {
                                width: 150,
                                overflow: "truncate",
                                interval: 0,
                                rotate: 30,
                            }
                        }
                    };
                }
                else if (xAxis.data.length >= 2) {
                    return {
                        grid: {
                            bottom: 50
                        },
                        xAxis: {
                            axisLabel: {
                                width: 150,
                                overflow: "break",
                                interval: 0
                            }
                        }
                    };
                }
                return {
                    xAxis: {axisLabel: {interval: 0}}
                };
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
                    radius: ['60%', '95%'],
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
                var opt = _merge({}, this.baseOptions, this.mixinOptions, this.option);
                var series = opt.series || [];

                var sumOfOthers;
                var seriesArr;

                for (var i = 0; i < series.length; i++) {
                    seriesArr = [];
                    sumOfOthers = 0;

                    series[i] = _merge({}, this.baseSeriesOptions, this.seriesOptions, series[i]);

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
                        <el-button class="chart-zoom-button" @click="onZoomTrigger" v-if="zoomStatus === \'reset\'"\
                            size="small"\
                            icon="cly-icon-btn cly-icon-zoom">\
                        </el-button>\
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
            }
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
            }
        },
        data: function() {
            return {
                isZoom: false
            };
        },
        components: {
            "zoom-interactive": ZoomInteractive,
            "chart-toggle": MagicSwitch
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
            }
        },
        template: '<div class="bu-level">\
                        <div class="bu-level-left">\
                            <slot v-if="!isZoom" name="chart-left" v-bind:echart="echartRef"></slot>\
							<slot name="chart-header-left-input"></slot>\
                        </div>\
                        <div class="bu-level-right">\
                            <slot v-if="!isZoom" name="chart-right" v-bind:echart="echartRef"></slot>\
                            <div class="bu-level-item" v-if="showDownload && !isZoom">\
                                <el-button @click="downloadImage" size="small" icon="cly-icon-btn cly-icon-download" class="chart-download-button">\
                                </el-button>\
                            </div>\
                            <div class="bu-level-item" v-if="showToggle && !isZoom">\
                                <chart-toggle :chart-type="chartType" v-on="$listeners"></chart-toggle>\
                            </div>\
                            <zoom-interactive @zoom-reset="onZoomReset" @zoom-triggered="onZoomTrigger" ref="zoom" v-if="showZoom" :echartRef="echartRef" class="bu-level-item"></zoom-interactive>\
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
                                <div class="cly-vue-chart-legend__s-rectangle" :style="{backgroundColor: item.displayColor}"></div>\
                                <div class="cly-vue-chart-legend__s-title has-ellipsis">{{item.label || item.name}}</div>\
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
                                    <span v-if="item.percentage">{{item.percentage}}</span>\
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
                                legend.displayColor = existingLegend.displayColor;
                            }
                        }
                    }

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
                var opt = _merge({}, this.baseOptions, this.option);
                opt = this.patchChart(opt);

                return opt;
            }
        },
        template: '<div class="cly-vue-chart" :class="chartClasses" :style="chartStyles">\
                        <div class="cly-vue-chart__echart bu-is-flex bu-is-flex-direction-column bu-is-flex-grow-1 bu-is-flex-shrink-1" style="min-height: 0">\
                            <chart-header ref="header" v-if="!isChartEmpty" @series-toggle="onSeriesChange" :show-zoom="showZoom" :show-toggle="showToggle" :show-download="showDownload">\
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
                var ops = _merge({}, this.baseOptions, this.option);
                delete ops.grid;
                delete ops.xAxis;
                delete ops.yAxis; //remove not needed to don;t get grey line at bottom

                ops = this.patchChart(ops);

                return ops;
            }
        },

        template: '<div class="cly-vue-chart" :class="chartClasses">\
                        <div class="cly-vue-chart__echart bu-is-flex bu-is-flex-direction-column bu-is-flex-grow-1 bu-is-flex-shrink-1" style="min-height: 0">\
                            <chart-header ref="header" v-if="!isChartEmpty" @series-toggle="onSeriesChange" :show-zoom="showZoom" :show-toggle="showToggle" :show-download="showDownload">\
                                <template v-for="item in forwardedSlots" v-slot:[item]="slotScope">\
                                    <slot :name="item" v-bind="slotScope"></slot>\
                                </template>\
                            </chart-header>\
							<div class="chart-wrapper" :style="{height: (chartOptions.chartheight) + \'px\'}">\
                                <vue-scroll :ops="scrollOptions" >\
                                    <div :class="[isChartEmpty && \'bu-is-flex bu-is-flex-direction-column bu-is-justify-content-center\']" :style="{height: (chartOptions.chartheight) + \'px\', width: chartOptions.chartwidth + \'px\'}">\
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
                var opt = _merge({}, this.mergedOptions);

                opt = this.patchChart(opt);

                return opt;
            }
        },
        template: '<div class="cly-vue-chart" :class="chartClasses" :style="chartStyles">\
                        <div class="cly-vue-chart__echart bu-is-flex bu-is-flex-direction-column bu-is-flex-grow-1 bu-is-flex-shrink-1" style="min-height: 0">\
                            <chart-header :chart-type="\'line\'" ref="header" v-if="!isChartEmpty" @series-toggle="onSeriesChange" :show-zoom="showZoom" :show-toggle="showToggle" :show-download="showDownload">\
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
            }
        },
        components: {
            'chart-header': ChartHeader,
            'custom-legend': CustomLegend
        },
        computed: {
            chartOptions: function() {
                var opt = _merge({}, this.mergedOptions);

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

                    if (period === "month" && !this.bucket) {
                        tickObj = chartsCommon.getTickObj("monthly", false, true);
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
        template: '<div class="cly-vue-chart" :class="chartClasses" :style="chartStyles">\
                        <div class="cly-vue-chart__echart bu-is-flex bu-is-flex-direction-column bu-is-flex-grow-1 bu-is-flex-shrink-1" style="min-height: 0">\
                            <chart-header ref="header" v-if="!isChartEmpty" @series-toggle="onSeriesChange" :show-zoom="showZoom" :show-toggle="showToggle" :show-download="showDownload">\
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
                            v-if="legendOptions.show && !isChartEmpty">\
                        </custom-legend>\
                    </div>'
    }));

    Vue.component("cly-chart-bar", BaseBarChart.extend({
        data: function() {
            return {
                forwardedSlots: ["chart-left", "chart-right"]
            };
        },
        props: {
            xAxisLabelOverflow: {
                type: String,
                default: 'auto',
                required: false
            }
        },
        components: {
            'chart-header': ChartHeader,
            'custom-legend': CustomLegend
        },
        computed: {
            chartOptions: function() {
                var opt = _merge({}, this.mergedOptions);
                opt = this.patchChart(opt);
                var xAxisOverflowPatch = this.handleXAxisOverflow(opt, this.xAxisLabelOverflow);
                if (xAxisOverflowPatch) {
                    opt = _merge(opt, xAxisOverflowPatch);
                }
                return opt;
            }
        },
        template: '<div class="cly-vue-chart" :class="chartClasses" :style="chartStyles">\
                        <div class="cly-vue-chart__echart bu-is-flex bu-is-flex-direction-column bu-is-flex-grow-1 bu-is-flex-shrink-1" style="min-height: 0">\
                            <chart-header :chart-type="\'bar\'" ref="header" v-if="!isChartEmpty" @series-toggle="onSeriesChange" :show-zoom="showZoom" :show-toggle="showToggle" :show-download="showDownload">\
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
                var opt = _merge({}, this.mergedOptions);
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
                var opt = _merge({}, this.legendOptions);
                opt.type = "secondary";

                if (opt.position === "bottom") {
                    opt.position = "right";
                }

                return opt;
            }
        },
        template: '<div class="cly-vue-chart" :class="chartClasses" :style="chartStyles">\
                        <div class="cly-vue-chart__echart bu-is-flex bu-is-flex-direction-column bu-is-flex-grow-1" style="height: 100%">\
                            <chart-header ref="header" v-if="!isChartEmpty" @series-toggle="onSeriesChange" :show-zoom="showZoom" :show-toggle="showToggle" :show-download="showDownload">\
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
            'l-tooltip': Vue2Leaflet.LTooltip
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
                default: 0
            },
            maxZoom: {
                type: Number,
                default: null
            },
            showTooltip: {
                type: Boolean,
                default: true
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
                    direction: "right",
                    //permanent: true,
                    //offset: L.point(5, 5)
                },
                circleMarkerConfig: {
                    pane: "markerPane",
                    fillColor: "#017AFF",
                    fillOpacity: 0.6,
                    color: "transparent",
                },
                defaultMapOptions: {
                    attributionControl: false,
                    zoomControl: false,
                    zoomSnap: 0.1,
                    zoom: 1.3
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
                return this.loadingGeojson || this.loadingCities;
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
                        this.$refs.lmap.mapObject.fitBounds(this.maxBounds);
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