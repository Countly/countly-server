/* global Vue, countlyCommon, VueECharts, _merge */

(function(countlyVue) {

    var countlyBaseComponent = countlyVue.components.BaseComponent,
        _mixins = countlyVue.mixins;

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
                        top: 60,
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
                            fontFamily: "Inter",
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
                                show: true
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
                                show: true,
                                type: ['line', 'bar']
                            }
                        },
                        right: 15,
                        top: 5
                    },
                    color: countlyCommon.GRAPH_COLORS
                }
            };
        }
    });

    /*
        Use xAxis.axisLabel.showMinLabel to change visibility of minimum label
        Use xAxis.axisLabel.showMaxLabel to change visibility of maximum label
        Use xAxis.inverse to inverse the labels

        xAxis.data - https://echarts.apache.org/en/option.html#xAxis.data
        yAxis.data - https://echarts.apache.org/en/option.html#yAxis.data
        Category data, available in type: 'category' axis.
        If type is not specified, but axis.data is specified, the type is auto set as 'category'.
        should notice that axis.data provides then value range of the 'category' axis.

        If it is auto collected from series.data, Only the values appearing in series.data can be collected.
        For example, if series.data is empty, nothing will be collected.

        - series-line. name - Series name used for displaying in tooltip and filtering with legend, or updating data and configuration with setOption.
        - series-line. emphasis
        - series-line. sampling : To improve performance
        - series-line. dimensions : Used in tooltips
        - series-line. encode
        - series-line. data
            Example - Sample data -
                        [
                            [0, 12],
                            {
                                value: [1, 32],
                                label: {},
                                labelStyle: {},
                                itemStyle:{}
                            },
                            [2, 33]
                        ]
        - axisPointer - Automatically shown if tooltip.trigger = 'axis'
        - toolbox. feature - Besides the tools we provide, user-defined toolbox is also supported.
    */
    var BaseLineChart = BaseChart.extend({
        props: {
        },
        data: function() {
            return {
                baseLineOptions: {
                    xAxis: {
                        boundaryGap: false,
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
                            showMinLabel: false,
                            showMaxLabel: false,
                            fontSize: 14,
                            fontFamily: "Inter"
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
                            fontSize: 12,
                            fontFamily: "Inter"
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
                    ]
                },
                seriesOptions: {
                    type: 'line',
                    showSymbol: false,
                    lineStyle: {
                        type: "solid",
                        cap: "round",
                    },
                    smooth: false
                }
            };
        },
        computed: {
            mergedOptions: function() {
                var opt = _merge({}, this.baseOptions, this.baseLineOptions, this.option);
                var series = JSON.parse(JSON.stringify(opt.series || []));
                var legendData = [];

                for (var i = 0; i < series.length; i++) {
                    series[i] = _merge({}, this.seriesOptions, series[i]);
                    legendData.push(series[i].name);
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
                        name: "Reset"
                    },
                    {
                        value: 10,
                        name: "10%"
                    },
                    {
                        value: 20,
                        name: "20%"
                    },
                    {
                        value: 30,
                        name: "30%"
                    },
                    {
                        value: 40,
                        name: "40%"
                    },
                    {
                        value: 50,
                        name: "50%"
                    },
                    {
                        value: 60,
                        name: "60%"
                    },
                    {
                        value: 70,
                        name: "70%"
                    },
                    {
                        value: 80,
                        name: "80%"
                    },
                    {
                        value: 90,
                        name: "90%"
                    },
                    {
                        value: 100,
                        name: "100%"
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
                    this.echartRef.dispatchAction({
                        type: "dataZoom",
                        start: v / 2,
                        end: 100 - v / 2
                    });

                    this.selZoomNumber = v;
                }
            }
        },
        template: "<div style='width: 94px'>\
                        <el-select v-model='selZoom'>\
                            <el-option :key='item.value' :value='item.value' :label='item.name'\
                                v-for='item in zoomNumbers'></el-option>\
                        </el-select>\
                    </div>"
    });

    var ChartHeader = countlyBaseComponent.extend({
        props: {
            echartRef: {
                type: Object
            },
            showZoom: {
                type: Boolean
            }
        },
        components: {
            "zoom-dropdown": ZoomDropdown
        },
        template: '<div class="bu-level">\
                        <div class="bu-level-left">\
                            <div class="bu-level-item">\
                                <slot name="chart-left">\
                                </slot>\
                            </div>\
                            <div class="bu-level-item" v-if="showZoom">\
                                <zoom-dropdown :echartRef="echartRef"></zoom-dropdown>\
                            </div>\
                        </div>\
                        <div class="bu-level-right">\
                            <slot name="chart-right">\
                            </slot>\
                        </div>\
                    </div>'
    });

    Vue.component("cly-chart-line", BaseLineChart.extend({
        mounted: function() {
            this.echartRef = this.$refs.echarts;
        },
        components: {
            'chart-header': ChartHeader
        },
        computed: {
            chartOptions: function() {
                var opt = this.mergedOptions;

                if (!opt.xAxis.data) {
                    /*
                        If xAxis.data is not provided,
                        create xAxis.data automatically
                    */
                    var xAxisData = [];
                    var seriesData = opt.series[0].data; //Since all series will have same xAxis
                    var dataIsObject = typeof seriesData === "object" && !Array.isArray(seriesData);
                    var dataItems = dataIsObject ? seriesData.value : seriesData;

                    if ((Array.isArray(dataItems[0]) || typeof dataItems[0] === "object")) {
                        /*
                            Enter this conidtion only if series data is array of array or it is an object
                            -   Push the first entry from each item the series data array to xAxis.data
                            -   Or push the first entry from each item of the series data.value
                        */

                        for (var j = 0; j < seriesData.length; j++) {
                            if (Array.isArray(seriesData[j])) {
                                //dataItem is an array
                                xAxisData.push(seriesData[j][0]);
                            }
                            else {
                                //dataItem is an object, hence its values are in 'value' stored in array
                                xAxisData.push(seriesData[j].value[0]);
                            }
                        }

                        opt.xAxis.data = xAxisData;
                    }
                }

                return opt;
            }
        },
        template: '<div class="cly-vue-line-chart bu-columns bu-is-gapless bu-is-multiline">\
                        <div class="bu-column bu-is-10 cly-vue-line-chart__header-left">\
                            <chart-header :echartRef="echartRef" :showZoom="showZoom"></chart-header>\
                        </div>\
                        <div class="bu-column bu-is-full" :style="{height: height + \'px\'}">\
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

    Vue.component("cly-chart-time", BaseLineChart.extend({
        mounted: function() {
            this.echartRef = this.$refs.echarts;
        },
        components: {
            'chart-header': ChartHeader
        },
        computed: {
            chartOptions: function() {
                var opt = this.mergedOptions;

                if (!opt.xAxis.data) {
                    /*
                        If xAxis.data is not provided,
                        create xAxis.data automatically
                    */
                    var xAxisData = [];
                    var seriesData = opt.series[0].data; //Since all series will have same xAxis
                    var dataIsObject = typeof seriesData === "object" && !Array.isArray(seriesData);
                    var dataItems = dataIsObject ? seriesData.value : seriesData;

                    if ((Array.isArray(dataItems[0]) || typeof dataItems[0] === "object")) {
                        /*
                            Enter this conidtion only if series data is array of array or it is an object
                            -   Push the first entry from each item the series data array to xAxis.data
                            -   Or push the first entry from each item of the series data.value
                        */

                        for (var j = 0; j < seriesData.length; j++) {
                            if (Array.isArray(seriesData[j])) {
                                //dataItem is an array
                                xAxisData.push(seriesData[j][0]);
                            }
                            else {
                                //dataItem is an object, hence its values are in 'value' stored in array
                                xAxisData.push(seriesData[j].value[0]);
                            }
                        }

                        opt.xAxis.data = xAxisData;
                    }
                }

                return opt;
            }
        },
        template: '<div class="cly-vue-line-chart bu-columns bu-is-gapless bu-is-multiline">\
                        <div class="bu-column bu-is-10 cly-vue-line-chart__header-left">\
                            <chart-header :echartRef="echartRef" :showZoom="showZoom"></chart-header>\
                        </div>\
                        <div class="bu-column bu-is-full" :style="{height: height + \'px\'}">\
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
