<template>
    <div class="cly-vue-metric-breakdown bu-column" :class="topClasses">
        <cly-section class="cly-vue-metric-breakdown__wrapper">
            <div class="bu-is-relative">
                <div class="bu-level-left bu-p-5" v-if="typeof name !== 'undefined'">
                    <span class="text-medium">{{name}}</span>
                    <cly-tooltip-icon v-if="description" class="bu-ml-3" :tooltip="description" placement="top-center"></cly-tooltip-icon>
                </div>
                <div class="bu-level-left bu-p-2" v-if="typeof name === 'undefined'"></div>
                <div v-if="values.length === 0" class="bu-pl-3 bu-pr-3 cly-vue-metric-breakdown__empty" style="height: 264px;">
                    <div>{{$i18n('common.table.no-data')}}</div>
                </div>
                <div v-else class="bu-pl-3 bu-pr-1 cly-vue-metric-breakdown__rows" style="height: 264px;">
                    <vue-scroll :ops="effectiveScrollOps">
                        <div :key="idx" v-for="(item, idx) in values">
                            <div :class="{'cly-vue-metric-breakdown__value-row--is-clickable': !!item.link}" class="cly-vue-metric-breakdown__value-row bu-p-3">
                                <div class="bu-columns cly-vue-metric-breakdown__inner text-medium color-cool-gray-100">
                                    <div class="bu-column">
                                        <img class="cly-vue-metric-breakdown__row-icon" v-if="item.icon" :src="item.icon"/>
                                        <span :data-test-id="'metric-card-column-' + testId + '-name'">{{item.name}}</span>
                                    </div>
                                    <div class="bu-column cly-vue-metric-breakdown__numbers">
                                        <a v-if="item.link" :href="item.link">
                                            <span v-if="item.description" :data-test-id="'metric-card-column-' + testId + '-description'">{{item.description}}</span>
                                            <span class="divider" :data-test-id="'metric-card-column-' + testId + '-divider'"> | </span>
                                            <span :data-test-id="'metric-card-column-' + testId + '-percent'">{{item.percent}}%</span>
                                            <i class="fas fa-arrow-circle-right color-cool-gray-40"></i>
                                        </a>
                                        <div v-else>
                                            <span v-if="item.description" :data-test-id="'metric-card-column-' + testId + '-desc'">{{item.description}}</span>
                                            <span class="divider" :data-test-id="'metric-card-column-' + testId + '-divider'"> | </span>
                                            <span :data-test-id="'metric-card-column-' + testId + '-percent'">{{item.percent}}%</span>
                                        </div>
                                    </div>
                                </div>
                                <cly-progress-bar :data-test-id="'metric-card-column-' + testId + '-progress-bar'" :entities="getProgressBarEntities(item)" :height="8"></cly-progress-bar>
                            </div>
                        </div>
                    </vue-scroll>
                </div>
                <div class="cly-vue-metric-breakdown__blur_container"></div>
            </div>
        </cly-section>
    </div>
</template>

<script>
import vuescroll from 'vuescroll';

export default {
    components: {
        'vue-scroll': vuescroll
    },
    props: {
        name: {
            type: String
        },
        description: {
            type: String,
            default: '',
            required: false
        },
        values: {
            type: Array
        },
        columnWidth: { type: [Number, String], default: -1 },
        isVertical: { type: Boolean, default: false },
        color: { type: [String, Function, Array], default: '#017AFF' },
        scrollOps: {
            type: Object,
            default: null,
            required: false
        },
        isSyncedScroll: {
            type: Boolean,
            default: false,
            required: false
        },
        testId: {
            type: String,
            default: "metric-breakdown-test-id",
            required: false
        }
    },
    computed: {
        topClasses: function() {
            if (this.isVertical || this.columnWidth === -1) {
                return "";
            }
            else if (this.isSyncedScroll) {
                return "is-synced bu-is-" + this.columnWidth;
            }
            else {
                return "bu-is-" + this.columnWidth;
            }
        },
        effectiveScrollOps: function() {
            if (this.scrollOps) {
                return this.scrollOps;
            }
            return this.defaultScrollOps;
        }
    },
    methods: {
        getProgressBarEntities: function(item) {
            return item.bar ? item.bar : [{ color: this.color, percentage: item.percent }];
        }
    },
    data: function() {
        return {
            defaultScrollOps: {
                vuescroll: {},
                scrollPanel: {
                    initialScrollX: false
                },
                rail: {
                    gutterOfSide: "1px",
                    gutterOfEnds: "15px"
                },
                bar: {
                    background: "#A7AEB8",
                    size: "6px",
                    specifyBorderRadius: "3px",
                    keepShow: false
                }
            }
        };
    }
};
</script>
