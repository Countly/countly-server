/* global Vue, countlyCommon, VueECharts, _merge, CommonConstructor */

(function(countlyVue) {

    var countlyBaseComponent = countlyVue.components.BaseComponent,
        _mixins = countlyVue.mixins;

    var fontFamily = "Inter";
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
        provide: function() {
            var obj = {};
            obj[VueECharts.THEME_KEY] = "white";
            return obj;
        },
        props: {
            height: {
                type: Number,
                default: 400
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
                default: true
            },
            showDownload: {
                type: Boolean,
                default: true
            }
        },
        data: function() {
            return {
                echartRef: {
                    type: Object
                },
                baseOptions: {
                    title: {
                        show: false
                    },
                    grid: {
                        top: 30,
                        bottom: 65,
                        left: 35,
                        right: 35,
                        containLabel: true
                    },
                    legend: {
                        show: true,
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
                        itemWidth: 12
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
                                show: false
                            },
                            magicType: {
                                show: false,
                                type: ['line', 'bar']
                            }
                        },
                        right: 15,
                        top: 5
                    },
                    tooltip: {
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
                        showContent: true,
                        alwaysShowContent: false,
                        enterable: true,
                        renderMode: 'html',
                        textStyle: {
                            color: "#A7AEB8",
                            fontSize: 14
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
                            color: "#A7AEB8",
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
                            color: "#A7AEB8",
                            fontSize: 12
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
                            type: 'slider',
                            show: false,
                            xAxisIndex: 0,
                            filterMode: 'none'
                        },
                        {
                            type: 'slider',
                            show: false,
                            yAxisIndex: 0,
                            filterMode: 'none'
                        },
                        {
                            type: 'inside',
                            xAxisIndex: 0,
                            filterMode: 'none',
                            zoomLock: true
                        },
                        {
                            type: 'inside',
                            yAxisIndex: 0,
                            filterMode: 'none',
                            zoomLock: true
                        }
                    ],
                    color: countlyCommon.GRAPH_COLORS,
                    textStyle: {
                        fontFamily: fontFamily
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
        methods: {
            onSeriesChange: function(v) {
                this.seriesOptions.type = v;
                this.$emit("series-toggle", v);
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
                var legendData = [];

                for (var i = 0; i < series.length; i++) {
                    series[i] = _merge({}, this.baseSeriesOptions, this.seriesOptions, series[i]);
                    legendData.push(series[i].name);
                }

                opt.legend.data = !opt.legend.data ? legendData : opt.legend.data;
                opt.series = series;
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
                var legendData = [];

                for (var i = 0; i < series.length; i++) {
                    series[i] = _merge({}, this.baseSeriesOptions, this.seriesOptions, series[i]);
                    legendData.push(series[i].name);
                }

                opt.legend.data = !opt.legend.data ? legendData : opt.legend.data;
                opt.series = series;
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
        data: function() {
            return {
                mixinOptions: {
                    legend: {
                        orient: 'vertical',
                        right: "25%",
                        top: "25%",
                        bottom: 'auto'
                    },
                    tooltip: {
                        trigger: 'item'
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
                    radius: ['45%', '70%'],
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
            mergedOptions: function() {
                var opt = _merge({}, this.baseOptions, this.mixinOptions, this.option);
                var series = opt.series || [];

                var legendData = [];
                for (var i = 0; i < series.length; i++) {
                    series[i] = _merge({}, this.baseSeriesOptions, this.seriesOptions, series[i]);
                    var seriesData = series[i].data;

                    if (!opt.legend.data) {
                        /*
                            Legend data in series comes from within series data names
                        */
                        for (var j = 0; j < seriesData.length; j++) {
                            legendData.push(seriesData[j].name);
                        }
                    }
                }

                opt.legend.data = !opt.legend.data ? legendData : opt.legend.data;
                opt.series = series;
                return opt;
            }
        }
    });

    var ZoomDropdown = countlyBaseComponent.extend({
        props: {
            echartRef: {
                type: Object
            }
        },
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

    var MagicSwitch = countlyBaseComponent.extend({
        props: {
            echartRef: {
                type: Object
            }
        },
        data: function() {
            return {
                selSwitchOption: ""
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
        template: '<div style="width: 100px;">\
                        <el-select v-model="selSwitch">\
                            <el-option value="line" label="Line"></el-option>\
                            <el-option value="bar" label="Bar"></el-option>\
                        </el-select>\
                    </div>'
    });

    var ChartHeader = countlyBaseComponent.extend({
        props: {
            echartRef: {
                type: Object
            },
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
            }
        },
        components: {
            "zoom-dropdown": ZoomDropdown,
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
            }
        },
        template: '<div class="bu-level">\
                        <div class="bu-level-left">\
                            <slot name="chart-left" v-bind:echart="echartRef"></slot>\
                            <div class="bu-level-item" v-if="showZoom">\
                                <zoom-dropdown :echartRef="echartRef"></zoom-dropdown>\
                            </div>\
                        </div>\
                        <div class="bu-level-right">\
                            <slot name="chart-right" v-bind:echart="echartRef"></slot>\
                            <div class="bu-level-item" v-if="showDownload">\
                                <el-button @click="downloadImage" size="small" icon="el-icon-download"></el-button>\
                            </div>\
                            <div class="bu-level-item" v-if="showToggle">\
                                <chart-toggle v-on="$listeners"></chart-toggle>\
                            </div>\
                        </div>\
                    </div>'
    });

    var CustomLegend = countlyBaseComponent.extend({
        template: '<div class="cly-vue-chart-legend">\
                        <div class="cly-vue-chart-legend__first-row">\
                            <div class="cly-vue-chart-legend__checkbox"></div>\
                            <div class="cly-vue-chart-legend__title">Total sessions</div>\
                            <cly-tooltip-icon class="cly-vue-chart-legend__tooltip" icon="ion-help-circled"></cly-tooltip-icon>\
                        </div>\
                        <div class="cly-vue-chart-legend__second-row">\
                            <div class="cly-vue-chart-legend__number">123</div>\
                            <div class="cly-vue-chart-legend__trend cly-vue-chart-legend--trend-up">\
                                <i class="fas fa-arrow-circle-up"></i>\
                                <i class="fas fa-arrow-circle-down"></i>\
                                <span>4.5%</span>\
                            </div>\
                        </div>\
                    </div>'
    });

    Vue.component("cly-chart-line", BaseLineChart.extend({
        data: function() {
            return {
                forwardedSlots: ["chart-left", "chart-right"],
                showCustomLegend: false
            };
        },
        mounted: function() {
            this.echartRef = this.$refs.echarts;
        },
        components: {
            'chart-header': ChartHeader,
            'custom-legend': CustomLegend
        },
        computed: {
            chartOptions: function() {
                var opt = _merge({}, this.mergedOptions);
                return opt;
            }
        },
        template: '<div class="cly-vue-chart">\
                        <chart-header :echartRef="echartRef" @series-toggle="onSeriesChange" v-bind="$props">\
                            <template v-for="item in forwardedSlots" v-slot:[item]="slotScope">\
                                <slot :name="item" v-bind="slotScope"></slot>\
                            </template>\
                        </chart-header>\
                        <div :style="{height: height + \'px\'}">\
                            <echarts\
                                ref="echarts"\
                                v-bind="$attrs"\
                                v-on="$listeners"\
                                :option="chartOptions"\
                                :autoresize="autoresize">\
                            </echarts>\
                        </div>\
                        <custom-legend :echartRef="echartRef" v-if="showCustomLegend">\
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
        mounted: function() {
            this.echartRef = this.$refs.echarts;
        },
        components: {
            'chart-header': ChartHeader
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

                return opt;
            }
        },
        template: '<div class="cly-vue-chart">\
                        <chart-header :echartRef="echartRef" @series-toggle="onSeriesChange" v-bind="$props">\
                            <template v-for="item in forwardedSlots" v-slot:[item]="slotScope">\
                                <slot :name="item" v-bind="slotScope"></slot>\
                            </template>\
                        </chart-header>\
                        <div :style="{height: height + \'px\'}">\
                            <echarts\
                                ref="echarts"\
                                v-bind="$attrs"\
                                v-on="$listeners"\
                                :option="chartOptions"\
                                :autoresize="autoresize">\
                            </echarts>\
                        </div>\
                        {{bucket}}\
                    </div>'
    }));

    Vue.component("cly-chart-bar", BaseBarChart.extend({
        data: function() {
            return {
                forwardedSlots: ["chart-left", "chart-right"]
            };
        },
        mounted: function() {
            this.echartRef = this.$refs.echarts;
        },
        components: {
            'chart-header': ChartHeader
        },
        computed: {
            chartOptions: function() {
                var opt = _merge({}, this.mergedOptions);
                return opt;
            }
        },
        template: '<div class="cly-vue-chart">\
                        <chart-header :echartRef="echartRef" @series-toggle="onSeriesChange" v-bind="$props">\
                            <template v-for="item in forwardedSlots" v-slot:[item]="slotScope">\
                                <slot :name="item" v-bind="slotScope"></slot>\
                            </template>\
                        </chart-header>\
                        <div :style="{height: height + \'px\'}">\
                            <echarts\
                                ref="echarts"\
                                v-bind="$attrs"\
                                v-on="$listeners"\
                                :option="chartOptions"\
                                :autoresize="autoresize">\
                            </echarts>\
                        </div>\
                    </div>'
    }));

    Vue.component("cly-chart-pie", BasePieChart.extend({
        data: function() {
            return {
                forwardedSlots: ["chart-left", "chart-right"]
            };
        },
        mounted: function() {
            this.echartRef = this.$refs.echarts;
        },
        components: {
            'chart-header': ChartHeader
        },
        computed: {
            chartOptions: function() {
                var opt = _merge({}, this.mergedOptions);
                return opt;
            }
        },
        template: '<div class="cly-vue-chart">\
                        <chart-header :echartRef="echartRef" @series-toggle="onSeriesChange" v-bind="$props">\
                            <template v-for="item in forwardedSlots" v-slot:[item]="slotScope">\
                                <slot :name="item" v-bind="slotScope"></slot>\
                            </template>\
                        </chart-header>\
                        <div :style="{height: height + \'px\'}">\
                            <echarts\
                                ref="echarts"\
                                v-bind="$attrs"\
                                v-on="$listeners"\
                                :option="chartOptions"\
                                :autoresize="autoresize">\
                            </echarts>\
                        </div>\
                    </div>'
    }));

}(window.countlyVue = window.countlyVue || {}));
