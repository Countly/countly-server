<template>
    <div class="cly-vue-chart-legend" :class="legendClasses">
        <template v-if="options.type === 'primary'">
            <cly-primary-legend
                :testId="testId"
                :data="legendData"
                :onClick="onLegendClick">
            </cly-primary-legend>
        </template>
        <template v-if="options.type === 'secondary'">
            <cly-secondary-legend
                :testId="testId"
                :data="legendData"
                :position="options.position"
                :onClick="onLegendClick">
            </cly-secondary-legend>
        </template>
    </div>
</template>

<script>
import { EchartRefMixin } from './mixins.js';
import ClyPrimaryLegend from './cly-primary-legend.vue';
import ClySecondaryLegend from './cly-secondary-legend.vue';

export default {
    mixins: [EchartRefMixin],
    components: {
        'cly-primary-legend': ClyPrimaryLegend,
        'cly-secondary-legend': ClySecondaryLegend
    },
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
            if (this.options.position !== "bottom") {
                classes["cly-vue-chart-legend__right"] = true;
            }
            else {
                classes["cly-vue-chart-legend__bottom"] = true;
            }

            if (this.options.chartType === "pie") {
                classes["cly-vue-chart-legend__pie"] = true;
            }

            return classes;
        }
    },
    methods: {
        onLegendClick: function(item, index) {
            var echartRef = this.echartRef;

            if (echartRef) {
                var obj = {};

                if (item.status === "off") {
                    obj.status = "on";
                    obj.displayColor = item.color;
                    echartRef.dispatchAction({
                        type: "legendSelect",
                        name: item.name
                    });
                }
                else {
                    obj.status = "off";
                    obj.displayColor = "transparent";
                    echartRef.dispatchAction({
                        type: "legendUnSelect",
                        name: item.name
                    });
                }

                obj = Object.assign({}, item, obj, {
                    name: item.name
                });

                this.$set(this.legendData, index, obj);
            }
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

                        var existingLegend = this.legendData.find(function(o) {
                            return o.name === legend.name;
                        });

                        if (existingLegend) {
                            legend.status = existingLegend.status;
                            legend.displayColor = existingLegend.displayColor === 'transparent' ? existingLegend.displayColor : data[i].color;
                        }
                    }
                }
                this.legendData = data;
            }
        }
    }
};
</script>
