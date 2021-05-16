/* global Vue, countlyCommon, VueECharts, _merge */

(function(countlyVue) {

    var _mixins = countlyVue.mixins;

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
            }
        },
        data: function() {
            return {
                baseOptions: {
                    title: {
                        show: false
                    },
                    grid: {
                        top: 45,
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
                    }
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
        }
    });

    Vue.component("cly-chart-line", BaseLineChart.extend({
        computed: {
            mergedOption: function() {
                var opt = _merge({}, this.baseOptions, this.baseLineOptions, this.internalOption, this.option);

                var xAxisData = [];
                var legendData = [];

                var series = JSON.parse(JSON.stringify(opt.series || []));
                for (var i = 0; i < series.length; i++) {
                    series[i] = _merge({}, this.seriesOptions, series[i]);
                    var seriesData = series[i].data;
                    var dataIsObject = typeof seriesData === "object" && !Array.isArray(seriesData);
                    var dataItems = dataIsObject ? seriesData.value : seriesData;

                    if (!opt.xAxis.data && (Array.isArray(dataItems[0]) || typeof dataItems[0] === "object")) {
                        /*
                            If xAxis.data is not provided and
                            series data is array of array or it is an object
                            -   Push the first entry from each item the series data array to xAxis.data
                            -   Or push the first entry from each item of the series data.value
                            -   P.S. This loop only runs once and thats what we want,
                                because x-axis will be same for all series
                        */

                        for (var j = 0; j < series[i].data.length; j++) {
                            if (Array.isArray(series[i].data[j])) {
                                //dataItem is an array
                                xAxisData.push(series[i].data[j][0]);
                            }
                            else {
                                //dataItem is an object, hence its values are in 'value' stored in array
                                xAxisData.push(series[i].data[j].value[0]);
                            }
                        }

                        opt.xAxis.data = xAxisData;
                    }

                    legendData.push(series[i].name);
                }

                opt.legend.data = !opt.legend.data ? legendData : opt.legend.data;
                opt.series = series;

                return opt;
            }
        },
        data: function() {
            return {
                internalOption: {}
            };
        },
        template: '<div class="cly-vue-line-chart bu-columns bu-is-gapless bu-is-multiline">\
                    <div class="bu-column bu-is-full">\
                        <div class="bu-level">\
                            <div class="bu-level-left">\
                                <div class="bu-level-item">\
                                    <slot name="header-left">\
                                    </slot>\
                                </div>\
                            </div>\
                            <div class="bu-level-right">\
                                <slot name="header-right">\
                                </slot>\
                            </div>\
                        </div>\
                    </div>\
                    <div class="bu-column bu-is-full" :style="{height: height + \'px\'}">\
                        <echarts\
                            v-bind="$attrs"\
                            v-on="$listeners"\
                            :option="mergedOption"\
                            :autoresize="autoresize">\
                        </echarts>\
                    </div>\
                </div>'
    }));

    Vue.component("cly-chart-time", BaseLineChart.extend({
        props: {
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
        },
        computed: {
            mergedOption: function() {
                var tickObj = countlyCommon.getTickObj();
                var opt = _merge(this.baseOptions, this.internalOption, this.option);

                opt.xAxis.data = tickObj;
                return opt;
            }
        },
        data: function() {
            return {
                internalOption: {}
            };
        },
        template: '<div class="cly-vue-line-chart bu-columns bu-is-gapless bu-is-multiline">\
                    <div class="bu-column bu-is-full">\
                        <div class="bu-level">\
                            <div class="bu-level-left">\
                                <div class="bu-level-item">\
                                    <slot name="header-left">\
                                    </slot>\
                                </div>\
                            </div>\
                            <div class="bu-level-right">\
                                <slot name="header-right">\
                                </slot>\
                            </div>\
                        </div>\
                    </div>\
                    <div class="bu-column bu-is-full" :style="{height: height + \'px\'}">\
                        <echarts\
                            v-bind="$attrs"\
                            v-on="$listeners"\
                            :option="mergedOption"\
                            :autoresize="autoresize">\
                        </echarts>\
                    </div>\
                </div>'
    }));

}(window.countlyVue = window.countlyVue || {}));
