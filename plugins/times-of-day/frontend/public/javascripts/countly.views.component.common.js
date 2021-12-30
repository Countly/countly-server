/*global countlyVue,CV,countlyTimesOfDay*/
(function(countlyTimesOfDayComponent) {

    var MAX_SYMBOL_VALUE = 20;

    countlyTimesOfDayComponent.ScatterChart = countlyVue.views.create({
        template: '<cly-chart-generic v-bind="$attrs" :option="timesOfDayOptions" v-loading="isLoading"></cly-chart-generic>',
        mixins: [countlyVue.mixins.commonFormatters],
        props: {
            maxSeriesValue: {
                type: [Number],
                required: true,
            },
            series: {
                type: Array,
                default: function() {
                    return [];
                }
            },
            isLoading: {
                type: Boolean,
                default: false
            }
        },
        data: function() {
            return {};
        },
        computed: {
            timesOfDayOptions: function() {
                var self = this;
                return {
                    title: {
                        text: CV.i18n('times-of-day.title')
                    },
                    tooltip: {
                        position: 'top',
                        trigger: 'item',
                        formatter: function(params) {
                            return '<div class="bu-is-flex bu-is-flex-direction-column times-of-day__scatter-chart-tooltip"> \n' +
                                        '<span class="times-of-day__scatter-chart-tooltip-text">' + CV.i18n('times-of-day.total-users') + '</span>\n' +
                                        '<span class="times-of-day__scatter-chart-tooltip-total-users-value">' + self.formatNumber(params.value[2]) + '</span> \n' +
                                        '<span class="times-of-day__scatter-chart-tooltip-text">' + CV.i18n('times-of-day.between') + ' ' + countlyTimesOfDay.service.getHoursPeriod(countlyTimesOfDay.service.HOURS[params.value[0]]) + '</span> \n' +
                                    '</div>';
                        }
                    },
                    xAxis: {
                        data: countlyTimesOfDay.service.HOURS,
                        splitLine: {
                            show: true
                        },
                        axisLine: {
                            show: false
                        }
                    },
                    yAxis: {
                        type: 'category',
                        data: [
                            CV.i18n('times-of-day.monday'),
                            CV.i18n('times-of-day.tuesday'),
                            CV.i18n('times-of-day.wednesday'),
                            CV.i18n('times-of-day.thursday'),
                            CV.i18n('times-of-day.friday'),
                            CV.i18n('times-of-day.saturday'),
                            CV.i18n('times-of-day.sunday')
                        ],
                        nameLocation: 'middle',
                        boundaryGap: true,
                        axisTick: {
                            alignWithLabel: true
                        }
                    },
                    series: [{
                        name: CV.i18n('times-of-day.title'),
                        type: "scatter",
                        symbolSize: function(val) {
                            var dataIndexValue = 2;
                            return val[dataIndexValue] * self.getNormalizedSymbolCoefficient();
                        },
                        data: this.series,
                    }],
                    color: "#39C0C8"
                };
            },

        },
        methods: {
            getNormalizedSymbolCoefficient: function() {
                if (this.maxSeriesValue < MAX_SYMBOL_VALUE) {
                    return 1;
                }
                return MAX_SYMBOL_VALUE / this.maxSeriesValue;
            },
        }
    });

}(window.countlyTimesOfDayComponent = window.countlyTimesOfDayComponent || {}));