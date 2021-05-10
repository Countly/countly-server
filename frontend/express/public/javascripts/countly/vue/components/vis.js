/* global Vue, countlyCommon, _, VueECharts */

(function(countlyVue) {

    var countlyBaseComponent = countlyVue.components.BaseComponent;

    Vue.component("cly-chart", countlyBaseComponent.extend({
        provide: function() {
            var obj = {};
            obj[VueECharts.THEME_KEY] = "white";
            return obj;
        },
        props: {
            autoresize: {
                type: Boolean,
                default: true
            },
            preset: {
                type: String,
                default: "none",
                validator: function(value) {
                    return ['none', 'timeSeries'].indexOf(value) !== -1;
                }
            },
            series: {
                type: Array,
                default: function() {
                    return [];
                }
            },
            option: {
                type: Object,
                default: function() {
                    return {};
                }
            }
        },
        computed: {
            mergedOption: function() {
                // TODO : This might be a memory-intensive action.
                // We should reconsider using it.

                if (this.preset === "none") {
                    return this.option;
                }
                else if (this.preset === "timeSeries") {
                    var tickObj = countlyCommon.getTickObj();
                    return Object.freeze(_.extend({}, this.internalOption, {
                        xAxis: {
                            type: 'category',
                            data: tickObj.tickTexts
                        },
                        series: this.series
                    }, this.option));
                }
            }
        },
        data: function() {
            return {
                internalOption: {
                    grid: {
                        left: 20,
                        top: 20,
                        right: 20,
                        bottom: 40,
                        containLabel: true
                    },
                    yAxis: {
                        type: 'value'
                    },
                    legend: {
                        bottom: "0%",
                        itemHeight: 10,
                        itemWidth: 10,
                    }
                }
            };
        },
        template: '<echarts\
                        v-bind="$attrs"\
                        v-on="$listeners"\
                        :option="mergedOption"\
                        :autoresize="autoresize">\
                    </echarts>'
    }));

}(window.countlyVue = window.countlyVue || {}));
