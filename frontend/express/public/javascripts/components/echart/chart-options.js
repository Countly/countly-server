import { mergeWith as _mergeWith } from 'lodash';
import { countlyCommon } from '../../countly/countly.common.js';

const FONT_FAMILY = "Inter";

/**
 * Creates base chart options for ECharts
 * @param {*} self - The chart component instance 
 * @returns  {object} Base chart options object
 */
export function createBaseOptions(self) {
    return {
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
                                            <div class="chart-tooltip__header text-smaller font-weight-bold bu-mb-3">' + self.sanitizeHtml(params.seriesName) + '</div>\
                                            <div class="text-small"> ' + self.sanitizeHtml(params.data.name) + '</div>\
                                            <div class="text-big">' + formatter(self.sanitizeHtml(params.data.value)) + '</div>\
                                        </div>\
                                  </div>';

                    return template;
                }
                else {
                    template = "<div class='chart-tooltip" + ((params.length > 10) ? " chart-tooltip__has-scroll" : "") + "'>";
                    if (params.length > 0) {
                        template += "<span class='chart-tooltip__header text-smaller font-weight-bold'>" + self.sanitizeHtml(params[0].axisValueLabel) + "</span></br>";
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
                                                <span class="text-small">' + self.sanitizeHtml(params[i].seriesName) + '</span>\
                                        </div>\
                                        <div class="chart-tooltip__value">\
                                            <span class="text-big">' + (typeof params[i].value === 'object' ? formatter((isNaN(self.sanitizeHtml(params[i].value[1])) ? 0 : self.sanitizeHtml(params[i].value[1])), self.sanitizeHtml(params[i].value), i) : formatter((isNaN(params[i].value) ? 0 : self.sanitizeHtml(params[i].value)), null, i)) + '</span>\
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
                        return countlyCommon.getShortNumber(self.sanitizeHtml(value));
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
    };
}

export const baseSeriesOptions = {
    showSymbol: false,
    lineStyle: {
        type: "solid",
        cap: "round",
    },
    smooth: false,
    itemStyle: {
        borderRadius: [2, 2, 0, 0],
    },
    legendHoverLink: true,
    showBackground: false,
    label: {
        show: false,
    },
    selectedMode: false,
    progressive: true,
    emphasis: {
        focus: 'series'
    }
};

export const BaseChartMixin = {
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
        return {
            baseOptions: createBaseOptions(this),
            baseSeriesOptions: baseSeriesOptions,
            forwardedSlots: ["chart-left", "chart-right"]
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
                                if (options.series[i].data[j][2] !== 0) {
                                    isEmpty = false;
                                }
                            }
                        }
                    }
                    else if (options.series[i].nodes) {
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
};

export { FONT_FAMILY };
