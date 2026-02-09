<template>
    <div :class="classes">
        <vue-scroll :ops="scrollOptions">
            <div v-for="(item, index) in data"
                :key="item.name" :data-series="item.name"
                :class="['cly-vue-chart-legend__s-series',
                        {'cly-vue-chart-legend__s-series--deselected': item.status === 'off'}]"
                @click="onClick(item, index)">
                <div :data-test-id="testId + '-' + item.name.replaceAll(' ', '-').toLowerCase() + '-legend-icon'" class="cly-vue-chart-legend__s-rectangle" :style="{backgroundColor: item.displayColor}"></div>
                <div :data-test-id="testId + '-' + item.name.replaceAll(' ', '-').toLowerCase() + '-legend-label'" class="cly-vue-chart-legend__s-title has-ellipsis">{{unescapeHtml(item.label || item.name)}}</div>
                <div :data-test-id="testId + '-' + item.name.replaceAll(' ', '-').toLowerCase() + '-legend-percentage'" class="cly-vue-chart-legend__s-percentage" v-if="item.percentage">{{item.percentage}}%</div>
            </div>
        </vue-scroll>
    </div>
</template>

<script>
import countlyVue from '../../countly/vue/core.js';
import vuescroll from 'vuescroll';

export default {
    components: {
        'vue-scroll': vuescroll
    },
    mixins: [
        countlyVue.mixins.commonFormatters,
    ],
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
    }
};
</script>
