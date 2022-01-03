/* global Promise, Vue, countlyCommon, countlyLocation, _merge, CommonConstructor, countlyGlobal, Vue2Leaflet, CV, moment */

// _merge is Lodash merge - /frontend/express/public/javascripts/utils/lodash.merge.js

(function(countlyVue) {

    var countlyBaseComponent = countlyVue.components.BaseComponent,
        _mixins = countlyVue.mixins;

    var FONT_FAMILY = "Inter";
    var CHART_HEADER_HEIGHT = 32;

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
        props: {
            height: {
                type: Number,
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
            }
        },
        data: function() {
            return {
                baseOptions: {
                    title: {
                        show: false
                    },
                    grid: {
                        top: 30,
                        bottom: 15,
                        left: 36,
                        right: 36,
                        containLabel: true
                    },
                    legend: {
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
                                show: true
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
                },
                internalLegend: {
                    show: true,
                    type: "secondary",
                    data: [],
                    position: "bottom"
                },
                internalUpdateOptions: {
                    notMerge: true
                }
            };
        },
        methods: {
            onSeriesChange: function(v) {
                this.seriesOptions.type = v;
                this.$emit("series-toggle", v);
            },
            onZoomFinished: function() {
                this.$refs.header.$refs.zoom.onZoomFinished();
            }
        },
        computed: {
            legendOptions: function() {
                var options = _merge({}, this.internalLegend, this.legend || {});
                if (this.legend && this.legend.data && this.legend.data.length) {
                    options.data = JSON.parse(JSON.stringify(this.legend.data));
                }
                else {
                    options.data = JSON.parse(JSON.stringify(this.internalLegend.data));
                }

                return options;
            },
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

                return classes;
            },
            echartHeight: function() {
                var headerHeight = this.isShowingHeader ? CHART_HEADER_HEIGHT : 0;
                return this.height - headerHeight - 40; //20px padding on top and bottom
            },
            echartStyle: function() {
                var styles = {
                    height: this.height + 'px'
                };

                if (this.legendOptions.position !== "bottom") {
                    styles.width = 'calc(100% - 265px)';
                }

                return styles;
            },
            legendStyle: function() {
                var styles = {};

                if (this.legendOptions.position !== "bottom") {
                    styles.width = 265 + 'px';
                    styles.height = this.height + 'px';
                }

                return styles;
            },
            isShowingHeader: function() {
                return this.showZoom || this.showDownload || this.showToggle;
            },
            echartUpdateOptions: function() {
                return _merge({}, this.internalUpdateOptions, this.updateOptions || {});
            },
            isChartEmpty: function() {
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
                var legendData = [];

                for (var i = 0; i < series.length; i++) {
                    series[i] = _merge({}, this.baseSeriesOptions, this.seriesOptions, series[i]);
                    legendData.push({name: series[i].name});
                }

                this.internalLegend.data = legendData;

                //Set default legend show to false
                opt.legend.show = false;

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
                var legendData = [];

                for (var i = 0; i < series.length; i++) {
                    series[i] = _merge({}, this.baseSeriesOptions, this.seriesOptions, series[i]);
                    legendData.push({name: series[i].name});
                }

                this.internalLegend.data = legendData;

                //Set default legend show to false
                opt.legend.show = false;

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
            mergedOptions: function() {
                var opt = _merge({}, this.baseOptions, this.mixinOptions, this.option);

                var series = opt.series || [];

                var legendData = [];
                for (var i = 0; i < series.length; i++) {
                    series[i] = _merge({}, this.baseSeriesOptions, this.seriesOptions, series[i]);
                    var seriesData = series[i].data;

                    var dataSum = seriesData.reduce(function(acc, val) {
                        acc += val.value;
                        return acc;
                    }, 0);

                    seriesData.sort(function(a, b) {
                        return b.value - a.value;
                    });

                    /*
                        Legend data in series comes from within series data names
                    */
                    for (var j = 0; j < seriesData.length; j++) {
                        legendData.push({
                            name: seriesData[j].name,
                            percentage: ((seriesData[j].value / dataSum) * 100).toFixed(1)
                        });
                    }
                }

                this.internalLegend.data = legendData;

                //Set default legend show to false
                opt.legend.show = false;

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
            }
        },
        data: function() {
            return {
                zoomStatus: "reset"
            };
        },
        methods: {
            onZoomTrigger: function() {
                this.echartRef.setOption({tooltip: {show: false}}, {notMerge: false});

                this.echartRef.dispatchAction({
                    type: "takeGlobalCursor",
                    key: 'dataZoomSelect',
                    dataZoomSelectActive: true
                });

                this.zoomStatus = "triggered";
                this.$parent.onZoomTrigger();
            },
            onZoomReset: function() {
                this.echartRef.setOption({tooltip: {show: true}}, {notMerge: false});

                this.echartRef.dispatchAction({
                    type: "restore",
                });

                this.zoomStatus = "reset";
                this.$parent.onZoomReset();
            },
            onZoomCancel: function() {
                this.echartRef.setOption({tooltip: {show: true}}, {notMerge: false});

                this.echartRef.dispatchAction({
                    type: "takeGlobalCursor",
                    key: 'dataZoomSelect',
                    dataZoomSelectActive: false
                });

                this.zoomStatus = "reset";
                this.$parent.onZoomReset();
            },
            onZoomFinished: function() {
                this.echartRef.setOption({tooltip: {show: true}}, {notMerge: false});

                this.echartRef.dispatchAction({
                    type: "takeGlobalCursor",
                    key: 'dataZoomSelect',
                    dataZoomSelectActive: false
                });

                this.zoomStatus = "done";
            }
        },
        template: '<div>\
                        <div v-if="zoomStatus === \'triggered\'" class="bu-mr-3 color-cool-gray-50 text-smallish">\
                            Select an area in the chart to zoom\
                        </div>\
                        <el-button @click="onZoomTrigger" v-if="zoomStatus === \'reset\'"\
                            size="small"\
                            icon="cly-icon-btn cly-icon-zoom">\
                        </el-button>\
                        <el-button @click="onZoomCancel" v-if="zoomStatus === \'triggered\'" size="small">\
                            Cancel Zoom\
                        </el-button>\
                        <el-button @click="onZoomReset" v-if="zoomStatus === \'done\'" size="small">\
                            Reset Zoom\
                        </el-button>\
                    </div>'
    });

    var MagicSwitch = countlyBaseComponent.extend({
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
            }
        },
        data: function() {
            return {
                height: CHART_HEADER_HEIGHT,
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
        template: '<div class="bu-level" :style="{height: height + \'px\'}">\
                        <div class="bu-level-left">\
                            <slot v-if="!isZoom" name="chart-left" v-bind:echart="echartRef"></slot>\
							<slot name="chart-header-left-input"></slot>\
                        </div>\
                        <div class="bu-level-right">\
                            <slot v-if="!isZoom" name="chart-right" v-bind:echart="echartRef"></slot>\
                            <div class="bu-level-item" v-if="showDownload && !isZoom">\
                                <el-button @click="downloadImage" size="small" icon="el-icon-download"></el-button>\
                            </div>\
                            <div class="bu-level-item" v-if="showToggle && !isZoom">\
                                <chart-toggle v-on="$listeners"></chart-toggle>\
                            </div>\
                            <zoom-interactive ref="zoom" v-if="showZoom" :echartRef="echartRef" class="bu-level-item"></zoom-interactive>\
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
                                    <i class="fas fa-arrow-circle-up" v-if="item.trend === \'up\'"></i>\
                                    <i class="fas fa-arrow-circle-down" v-if="item.trend === \'down\'"></i>\
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
            chartOptions: {
                type: Object,
                default: function() {
                    return {};
                }
            },
            options: {
                type: Object,
                default: function() {
                    return {};
                }
            }
        },
        data: function() {
            return {
                legendData: []
            };
        },
        computed: {
            seriesType: function() {
                return this.chartOptions.series && this.chartOptions.series[0] && this.chartOptions.series[0].type;
            },
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

                this.echartRef.dispatchAction({
                    type: "legendToggleSelect",
                    name: item.name
                });

                var obj = JSON.parse(JSON.stringify(this.legendData[index]));

                //For the first time, item.status does not exist
                //So we set it to off
                //On subsequent click we toggle between on and off

                if (obj.status === "off") {
                    obj.status = "on";
                    obj.displayColor = obj.color;
                }
                else {
                    obj.status = "off";
                    obj.displayColor = "#a7aeb8";
                }

                this.$set(this.legendData, index, obj);
            }
        },
        watch: {
            'options': {
                deep: true,
                immediate: true,
                handler: function() {
                    var data = JSON.parse(JSON.stringify(this.options.data || []));

                    var series = this.chartOptions.series || [];

                    if (this.seriesType === "pie") {
                        series = series[0].data;
                    }

                    if (series.length !== data.length) {
                        // eslint-disable-next-line no-console
                        console.log("Series length and legend length should be same");
                        return [];
                    }

                    var colors = this.chartOptions.color || [];
                    var colorIndex = 0;
                    for (var k = 0; k < series.length; k++) {
                        var serie = series[k];

                        if (serie.color) {
                            data[k].color = serie.color;
                        }
                        else {
                            data[k].color = colors[colorIndex];
                            colorIndex++;
                        }

                        data[k].displayColor = data[k].color;
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
                return _merge({}, this.baseOptions, this.option);
            }
        },
        template: '<div class="cly-vue-chart" :class="chartClasses">\
                        <div :style="echartStyle" class="cly-vue-chart__echart">\
                            <chart-header ref="header" v-if="isShowingHeader && !isChartEmpty" @series-toggle="onSeriesChange" v-bind="$props">\
                                <template v-for="item in forwardedSlots" v-slot:[item]="slotScope">\
                                    <slot :name="item" v-bind="slotScope"></slot>\
                                </template>\
                            </chart-header>\
                            <div :class="[isChartEmpty && \'bu-is-flex bu-is-flex-direction-column bu-is-justify-content-center\']" :style="{height: echartHeight + \'px\'}">\
                                <echarts\
                                    v-if="!isChartEmpty"\
                                    :updateOptions="echartUpdateOptions"\
                                    ref="echarts"\
                                    v-bind="$attrs"\
                                    v-on="$listeners"\
                                    :option="chartOptions"\
                                    :autoresize="autoresize"\
                                    @datazoom="onZoomFinished">\
                                </echarts>\
                                <div class="bu-is-flex bu-is-flex-direction-column bu-is-align-items-center" v-if="isChartEmpty && !isLoading">\
                                    <cly-empty-chart></cly-empty-chart>\
                                </div>\
                            </div>\
                        </div>\
                        <custom-legend\
                            :style="legendStyle"\
                            :options="legendOptions"\
                            v-if="legendOptions.show && !isChartEmpty"\
                            :chartOptions="chartOptions">\
                        </custom-legend>\
                    </div>'
    }));


    Vue.component("cly-flow-chart", BaseChart.extend({
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
                return _merge({}, this.baseOptions, this.option);
            }
        },

        template: '<div class="cly-vue-chart" :class="chartClasses">\
                        <div :style="echartStyle" class="cly-vue-chart__echart" :style="{height: \'100%\'}">\
                            <chart-header ref="header" v-if="isShowingHeader && !isChartEmpty" @series-toggle="onSeriesChange" v-bind="$props">\
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
											@datazoom="onZoomFinished">\
										</echarts>\
                                        <div class="bu-is-flex bu-is-flex-direction-column bu-is-align-items-center" v-if="isChartEmpty">\
                                            <cly-empty-chart></cly-empty-chart>\
                                        </div>\
								</div>\
							</vue-scroll>\
							</div>\
                        </div>\
                        <custom-legend\
                            :style="legendStyle"\
                            :options="legendOptions"\
                            v-if="legendOptions.show && !isChartEmpty"\
                            :chartOptions="chartOptions">\
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
                return opt;
            }
        },
        template: '<div class="cly-vue-chart" :class="chartClasses">\
                        <div :style="echartStyle" class="cly-vue-chart__echart">\
                            <chart-header ref="header" v-if="isShowingHeader && !isChartEmpty" @series-toggle="onSeriesChange" v-bind="$props">\
                                <template v-for="item in forwardedSlots" v-slot:[item]="slotScope">\
                                    <slot :name="item" v-bind="slotScope"></slot>\
                                </template>\
                            </chart-header>\
                            <div :class="[isChartEmpty && \'bu-is-flex bu-is-flex-direction-column bu-is-justify-content-center\']" :style="{height: echartHeight + \'px\'}">\
                                <echarts\
                                    v-if="!isChartEmpty"\
                                    :updateOptions="echartUpdateOptions"\
                                    ref="echarts"\
                                    v-bind="$attrs"\
                                    v-on="$listeners"\
                                    :option="chartOptions"\
                                    :autoresize="autoresize"\
                                    @datazoom="onZoomFinished">\
                                </echarts>\
                                <div class="bu-is-flex bu-is-flex-direction-column bu-is-align-items-center" v-if="isChartEmpty && !isLoading">\
                                    <cly-empty-chart></cly-empty-chart>\
                                </div>\
                            </div>\
                        </div>\
                        <custom-legend\
                            :style="legendStyle"\
                            :options="legendOptions"\
                            v-if="legendOptions.show && !isChartEmpty"\
                            :chartOptions="chartOptions">\
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

                return opt;
            }
        },
        template: '<div class="cly-vue-chart" :class="chartClasses">\
                        <div :style="echartStyle" class="cly-vue-chart__echart">\
                            <chart-header ref="header" v-if="isShowingHeader && !isChartEmpty" @series-toggle="onSeriesChange" v-bind="$props">\
                                <template v-for="item in forwardedSlots" v-slot:[item]="slotScope">\
                                    <slot :name="item" v-bind="slotScope"></slot>\
                                </template>\
                            </chart-header>\
                            <div :class="[isChartEmpty && \'bu-is-flex bu-is-flex-direction-column bu-is-justify-content-center\']" :style="{height: echartHeight + \'px\'}">\
                                <echarts\
                                    v-if="!isChartEmpty"\
                                    :updateOptions="echartUpdateOptions"\
                                    ref="echarts"\
                                    v-bind="$attrs"\
                                    v-on="$listeners"\
                                    :option="chartOptions"\
                                    :autoresize="autoresize"\
                                    @datazoom="onZoomFinished">\
                                </echarts>\
                                <div class="bu-is-flex bu-is-flex-direction-column bu-is-align-items-center" v-if="isChartEmpty && !isLoading">\
                                    <cly-empty-chart></cly-empty-chart>\
                                </div>\
                            </div>\
                        </div>\
                        <custom-legend\
                            :style="legendStyle"\
                            :options="legendOptions"\
                            v-if="legendOptions.show && !isChartEmpty"\
                            :chartOptions="chartOptions">\
                        </custom-legend>\
                    </div>'
    }));

    Vue.component("cly-chart-bar", BaseBarChart.extend({
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
                return opt;
            }
        },
        template: '<div class="cly-vue-chart" :class="chartClasses">\
                        <div :style="echartStyle" class="cly-vue-chart__echart">\
                            <chart-header ref="header" v-if="isShowingHeader && !isChartEmpty" @series-toggle="onSeriesChange" v-bind="$props">\
                                <template v-for="item in forwardedSlots" v-slot:[item]="slotScope">\
                                    <slot :name="item" v-bind="slotScope"></slot>\
                                </template>\
                            </chart-header>\
                            <div :class="[isChartEmpty && \'bu-is-flex bu-is-flex-direction-column bu-is-justify-content-center\']" :style="{height: echartHeight + \'px\'}">\
                                <echarts\
                                    v-if="!isChartEmpty"\
                                    :updateOptions="echartUpdateOptions"\
                                    ref="echarts"\
                                    v-bind="$attrs"\
                                    v-on="$listeners"\
                                    :option="chartOptions"\
                                    :autoresize="autoresize"\
                                    @datazoom="onZoomFinished">\
                                </echarts>\
                                <div class="bu-is-flex bu-is-flex-direction-column bu-is-align-items-center" v-if="isChartEmpty && !isLoading">\
                                    <cly-empty-chart></cly-empty-chart>\
                                </div>\
                            </div>\
                        </div>\
                        <custom-legend\
                            :style="legendStyle"\
                            :options="legendOptions"\
                            v-if="legendOptions.show && !isChartEmpty"\
                            :chartOptions="chartOptions">\
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
        template: '<div class="cly-vue-chart" :class="chartClasses">\
                        <div class="cly-vue-chart__echart">\
                            <chart-header ref="header" v-if="isShowingHeader && !isChartEmpty" @series-toggle="onSeriesChange" v-bind="$props">\
                                <template v-for="item in forwardedSlots" v-slot:[item]="slotScope">\
                                    <slot :name="item" v-bind="slotScope"></slot>\
                                </template>\
                            </chart-header>\
                            <div :class="[isChartEmpty && \'bu-is-flex bu-is-flex-direction-column bu-is-justify-content-center\', \'bu-columns bu-is-gapless\']"\
                                :style="{height: echartHeight + \'px\'}">\
                                <div :class="classes">\
                                    <echarts\
                                        v-if="!isChartEmpty"\
                                        :updateOptions="echartUpdateOptions"\
                                        ref="echarts"\
                                        v-bind="$attrs"\
                                        v-on="$listeners"\
                                        :option="chartOptions"\
                                        :autoresize="autoresize"\
                                        @datazoom="onZoomFinished">\
                                    </echarts>\
                                    <div class="bu-is-flex bu-is-flex-direction-column bu-is-align-items-center" v-if="isChartEmpty && !isLoading">\
                                        <cly-empty-chart></cly-empty-chart>\
                                    </div>\
                                </div>\
                                <custom-legend\
                                    :options="pieLegendOptions"\
                                    v-if="pieLegendOptions.show && !isChartEmpty"\
                                    :chartOptions="chartOptions"\
                                    :class="classes">\
                                </custom-legend>\
                            </div>\
                        </div>\
                    </div>'
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
        props: {
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
                minZoom: 0,
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
                    layer.on('click', function() {
                        self.goToCountry(feature.properties.code);
                    });
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
                if (!this.inDetail) {
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