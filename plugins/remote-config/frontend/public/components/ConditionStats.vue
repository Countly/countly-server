<template>
    <table class="cly-vue-remote-config-percentages-breakdown">
        <thead>
            <tr>
                <th
                    class="cly-vue-remote-config-percentages-breakdown__sequence__heading bu-pl-2"
                    :data-test-id="testId + '-hash-label'"
                >
                    #
                </th>
                <th
                    class="cly-vue-remote-config-percentages-breakdown__condition__heading"
                    :data-test-id="testId + '-condition-label'"
                >
                    {{ i18n("remote-config.condition") }}
                </th>
                <th
                    class="cly-vue-remote-config-percentages-breakdown__percentage__heading"
                    :data-test-id="testId + '-percentage-label'"
                >
                    {{ i18n("remote-config.percentage") }}
                </th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td class="cly-vue-remote-config-percentages-breakdown__sequence__heading">
                    <div
                        class="cly-vue-remote-config-percentages-breakdown__sequence bu-py-1 bu-px-2"
                        :data-test-id="testId + '-order-label'"
                    >
                        1
                    </div>
                </td>
                <td class="has-ellipsis cly-vue-remote-config-percentages-breakdown__condition__heading bu-pr-1">
                    <div class="has-ellipsis cly-vue-remote-config-percentages-breakdown__data bu-py-2 bu-px-1 cly-vue-remote-config-percentages-breakdown__default-value">
                        <span
                            class="bu-ml-2 bu-mr-3 text-medium"
                            :data-test-id="testId + '-default-value-label'"
                        >
                            {{ i18n("remote-config.default-value") }}
                        </span>
                        <span
                            class="cly-vue-remote-config-percentages-breakdown__default-value__value bu-py-1 bu-px-2 text-small"
                            v-tooltip="defaultValue.value"
                            :data-test-id="testId + '-default-value'"
                        >
                            {{ defaultValue.value }}
                        </span>
                    </div>
                </td>
                <td class="cly-vue-remote-config-percentages-breakdown__percentage__heading">
                    <div class="bu-is-flex">
                        <div
                            class="text-big font-weight-bold"
                            :data-test-id="testId + '-percentage'"
                        >
                            {{ defaultValue.percentage }}%
                        </div>
                        <div
                            class="font-weight-normal color-cool-gray-100 bu-pt-1 bu-pl-1"
                            :data-test-id="testId + '-percent-of-total'"
                        >
                            {{ i18n("remote-config.percent.of.total") }}
                        </div>
                    </div>
                </td>
            </tr>
            <tr
                v-if="isDrillEnabled"
                v-for="(condition, i) in conditions"
                :key="i"
            >
                <td class="cly-vue-remote-config-percentages-breakdown__sequence__heading">
                    <div
                        class="cly-vue-remote-config-percentages-breakdown__sequence bu-py-1 bu-px-2"
                        :data-test-id="testId + '-other-order-label-' + i"
                    >
                        {{ i + 2 }}
                    </div>
                </td>
                <td class="has-ellipsis cly-vue-remote-config-percentages-breakdown__condition__heading bu-pr-1">
                    <div
                        class="has-ellipsis cly-vue-remote-config-percentages-breakdown__data bu-py-2 bu-px-1 cly-vue-remote-config-percentages-breakdown__condition"
                        :style="{backgroundColor: condition.color}"
                    >
                        <span class="cly-vue-remote-config-percentages-breakdown__condition__vertical-align">
                            <img src="../assets/images/call_split.svg" />
                        </span>
                        <span
                            class="cly-vue-remote-config-percentages-breakdown__condition__vertical-align bu-ml-2 bu-mr-3 text-medium"
                            :data-test-id="testId + '-condition-name-label-' + i"
                        >
                            {{ condition.name }}
                        </span>
                        <span
                            class="cly-vue-remote-config-percentages-breakdown__condition__vertical-align cly-vue-remote-config-percentages-breakdown__condition__value bu-py-1 bu-px-2 text-small"
                            v-tooltip="condition.value"
                            :data-test-id="testId + '-condition-value-' + i"
                        >
                            {{ condition.value }}
                        </span>
                    </div>
                </td>
                <td class="cly-vue-remote-config-percentages-breakdown__percentage__heading">
                    <div class="bu-is-flex">
                        <div
                            class="text-big font-weight-bold"
                            :data-test-id="testId + '-percentage-label-' + i"
                        >
                            {{ condition.percentage }}%
                        </div>
                        <div
                            class="font-weight-normal color-cool-gray-100 bu-pt-1 bu-pl-1"
                            :data-test-id="testId + '-percent-of-label-' + i"
                        >
                            {{ i18n("remote-config.percent.of.total") }}
                        </div>
                    </div>
                </td>
            </tr>
        </tbody>
    </table>
</template>
<script>
import countlyGlobal from '../../../../../frontend/express/public/javascripts/countly/countly.global.js';
import { i18nMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';

var COLOR_TAG = [
    { value: 1, label: "#6C47FF" },
    { value: 2, label: "#39C0C8" },
    { value: 3, label: "#F96300" },
    { value: 4, label: "#F34971" },
    { value: 5, label: "#F5C900" }
];

export default {
    mixins: [i18nMixin],
    props: {
        parameter: {
            type: Object,
            default: function() {
                return {};
            }
        },
        testId: {
            type: String,
            default: 'condition-stats-default-test-id',
            required: false
        },
    },
    computed: {
        isDrillEnabled: function() {
            return countlyGlobal.plugins.indexOf("drill") > -1;
        },
        conditions: function() {
            var conditions = [];
            var allConditions = this.$store.getters["countlyRemoteConfig/conditions/all"];
            var self = this;
            if (this.parameter.conditions.length > 0) {
                this.parameter.conditions.forEach(function(condition) {
                    var conditionsArr = allConditions.filter(function(item) {
                        return item._id === condition.condition_id;
                    });
                    var conditionProperties = conditionsArr[0];
                    var ob = {
                        color: self.getColor(conditionProperties.condition_color),
                        percentage: (condition.c ? (((condition.c) / self.totalConditions) * 100).toFixed(2) : 0),
                        name: conditionProperties.condition_name,
                        value: condition.value
                    };
                    conditions.push(ob);
                });
            }
            return conditions;
        },
        totalConditions: function() {
            var total = this.parameter.c ? this.parameter.c : 0;
            if (this.parameter.conditions.length > 0) {
                this.parameter.conditions.forEach(function(condition) {
                    total = total + (condition.c ? condition.c : 0);
                });
            }
            return total;
        },
        defaultValue: function() {
            var ob = {
                value: this.parameter.default_value,
                percentage: (this.parameter.c ? (((this.parameter.c) / this.totalConditions) * 100).toFixed(2) : 0),
            };
            return ob;
        }
    },
    methods: {
        getColor: function(condition_color) {
            var arr = COLOR_TAG.filter(function(item) {
                return item.value === condition_color;
            });
            return arr[0].label;
        }
    }
};
</script>
