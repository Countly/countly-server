<template>
    <div class="cly-vue-radio-block" :class="topClasses" style="height: 100%; overflow: auto; border-right: 1px solid #ececec">
        <div :class="wrapperClasses" style="height: 100%">
            <div
                @click="setValue(item.value)"
                v-for="(item, i) in items"
                :key="i"
                :class="buttonClasses"
                :style="buttonStyles"
            >
                <div
                    :class="{ 'selected': value == item.value }"
                    class="radio-button bu-is-flex bu-is-justify-content-center bu-is-align-items-center"
                    style="height: 100%;"
                    :data-test-id="`cly-radio-button-box-${item.label.replaceAll(' ', '-').toLowerCase()}`"
                >
                    <div class="bu-is-flex" :data-test-id="`cly-radio-box-container-${item.label.replaceAll(' ', '-').toLowerCase()}`">
                        <div class="box" :data-test-id="`cly-radio-box-${item.label.replaceAll(' ', '-').toLowerCase()}`"></div>
                        <div class="bu-is-flex bu-is-flex-direction-column bu-is-justify-content-space-between">
                            <div>
                                <span class="text-medium" :data-test-id="`cly-radio-label-${item.label.replaceAll(' ', '-').toLowerCase()}`">{{ item.label }}</span>
                                <span
                                    v-if="item.description"
                                    :data-test-id="`cly-radio-description-${item.label.replaceAll(' ', '-').toLowerCase()}`"
                                    class="cly-vue-tooltip-icon ion ion-help-circled bu-pl-2"
                                    v-tooltip.top-center="item.description"
                                ></span>
                            </div>
                            <div class="bu-is-flex bu-is-align-items-center number">
                                <h2
                                    v-if="item.isEstimate"
                                    class="is-estimate"
                                    v-tooltip="item.estimateTooltip"
                                    :data-test-id="`cly-radio-number-${item.label.replaceAll(' ', '-').toLowerCase()}`"
                                >~{{ item.number }}</h2>
                                <h2
                                    v-else
                                    :data-test-id="`cly-radio-number-${item.label.replaceAll(' ', '-').toLowerCase()}`"
                                >{{ item.number }}</h2>
                                <div
                                    v-if="item.trend == 'u'"
                                    class="cly-trend-up bu-ml-2"
                                    :data-test-id="`cly-radio-trend-${item.label.replaceAll(' ', '-').toLowerCase()}`"
                                >
                                    <i class="cly-trend-up-icon ion-android-arrow-up" :data-test-id="`cly-radio-trend-icon-${item.label.replaceAll(' ', '-').toLowerCase()}`"></i>
                                    <span :data-test-id="`cly-radio-trend-value-${item.label.replaceAll(' ', '-').toLowerCase()}`">{{ item.trendValue }}</span>
                                </div>
                                <div
                                    v-if="item.trend == 'd'"
                                    class="cly-trend-down bu-ml-2"
                                    :data-test-id="`cly-radio-trend-${item.label.replaceAll(' ', '-').toLowerCase()}`"
                                >
                                    <i class="cly-trend-down-icon ion-android-arrow-down" :data-test-id="`cly-radio-trend-icon-${item.label.replaceAll(' ', '-').toLowerCase()}`"></i>
                                    <span :data-test-id="`cly-radio-trend-value-${item.label.replaceAll(' ', '-').toLowerCase()}`">{{ item.trendValue }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    props: {
        value: {
            required: true,
            default: -1,
            type: [String, Number]
        },
        items: {
            required: true,
            type: Array,
            default: function() {
                return [];
            }
        },
        skin: {
            type: String,
            default: "main"
        },
        disabled: {
            type: Boolean,
            default: false
        },
        radioDirection: {
            type: String,
            default: "vertical"
        }
    },
    computed: {
        topClasses: function() {
            var classes = [];
            if (["main", "light"].indexOf(this.skin) > -1) {
                classes.push("radio-" + this.skin + "-skin");
            }
            else {
                classes.push("radio-main-skin");
            }
            if (this.disabled) {
                classes.push("disabled");
            }
            return classes;
        },
        wrapperClasses: function() {
            var classes = "radio-wrapper";
            if (this.radioDirection === "horizontal") {
                classes = "radio-wrapper radio-wrapper-horizontal bu-columns bu-m-0";
            }
            else {
                classes = "radio-wrapper bu-is-flex bu-is-flex-direction-column";
            }
            return classes;
        },
        buttonClasses: function() {
            var classes = "";
            if (this.radioDirection === "horizontal") {
                classes = " bu-column bu-p-0";
            }
            return classes;
        },
        buttonStyles: function() {
            var classes = "";
            var itemCn = this.items.length;
            if (this.radioDirection === "horizontal") {
                classes = "width: " + 100 / itemCn + "%;";
            }
            classes += "height: 100%;";
            return classes;
        }
    },
    methods: {
        setValue: function(e) {
            if (!this.disabled) {
                this.$emit('input', e);
            }
        }
    }
};
</script>
