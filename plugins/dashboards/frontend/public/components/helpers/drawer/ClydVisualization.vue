<template>
<cly-form-field
    name="visualization"
    test-id="visualization"
    :rules="{ required: { allowFalse: false } }"
    :subheading="!mute && i18nM('dashbaords.visualization-description')"
    :label="!mute && i18nM('dashbaords.visualization')">
    <div class="bu-columns bu-is-multiline bu-m-0 clyd-visualization">
        <div style="box-sizing: border-box; height: 64px;"
            v-for="(item, index) in visualizationTypes"
            :key="item.value"
            :class="['bu-column bu-is-one-third bu-m-0 bu-p-0',
                    {'bu-pr-2': ((index + 1) % 3 !== 0)},
                    {'bu-mb-3': (index < (visualizationTypes.length - (visualizationTypes.length % 3)))}]">
            <div style="height: 100%;"
                :class="['clyd-visualization__item bu-is-clickable',
                        'bu-is-flex bu-is-flex-direction-column bu-is-justify-content-center bu-is-align-items-center',
                        {'selected': item.value === selectedType}]"
                :data-test-id="`visualization-item-${item.value}`"
                @click="onClick(item)">
                <div class="text-smallish">{{item.label}}</div>
            </div>
        </div>
        <cly-value :value="isSelected"></cly-value>
    </div>
</cly-form-field>
</template>

<script>
import { i18nMixin } from '../../../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import ClyFormField from '../../../../../../../frontend/express/public/javascripts/components/form/cly-form-field.vue';

export default {
    mixins: [i18nMixin],
    components: {
        ClyFormField
    },
    props: {
        extraTypes: {
            type: Array,
            default: function() {
                return [];
            }
        },
        enabledTypes: {
            type: Array,
            default: function() {
                return [];
            }
        },
        mute: {
            type: Boolean,
            default: false
        },
        value: String,
    },
    data: function() {
        return {
            types: [
                {
                    value: "time-series",
                    label: this.i18n("dashboards.visualization.time-series")
                },
                {
                    value: "bar-chart",
                    label: this.i18n("dashboards.visualization.bar-chart")
                },
                {
                    value: "number",
                    label: this.i18n("dashboards.visualization.number")
                },
                {
                    value: "pie-chart",
                    label: this.i18n("dashboards.visualization.pie-chart")
                },
                {
                    value: "table",
                    label: this.i18n("dashboards.visualization.table")
                },
            ]
        };
    },
    computed: {
        visualizationTypes: function() {
            var extraTypes = this.extraTypes;
            var enabledTypes = this.enabledTypes;
            var fullList = this.types;

            if (enabledTypes && enabledTypes.length) {
                fullList = fullList.filter(function(item) {
                    return enabledTypes.includes(item.value);
                });
            }
            if (extraTypes && extraTypes.length) {
                fullList = fullList.concat(extraTypes);
            }

            fullList.sort(function(a, b) {
                return (a.priority || 0) - (b.priority || 0);
            });

            return fullList;
        },
        selectedType: function() {
            return this.value;
        },
        isSelected: function() {
            return this.selectedType ? true : false;
        }
    },
    methods: {
        onClick: function(item) {
            this.$emit("input", item.value);
        }
    },
    watch: {
        enabledTypes: {
            handler: function(val, oldVal) {
                if (val.length !== oldVal.length) {
                    return this.$emit("input", "");
                }

                for (var i = 0; i < val.length; i++) {
                    var v = val[i];
                    if (!oldVal.includes(v)) {
                        return this.$emit("input", "");
                    }
                }
            }
        }
    }
};
</script>
