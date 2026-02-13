<template>
<div>
    <clyd-datatype v-model="scope.editedObject.data_type" @change="onDataTypeChange"></clyd-datatype>
    <clyd-appcount v-model="scope.editedObject.app_count"></clyd-appcount>
    <clyd-sourceapps v-model="scope.editedObject.apps" :multiple="scope.editedObject.app_count === 'multiple'"></clyd-sourceapps>
    <clyd-visualization v-model="scope.editedObject.visualization" :enabled-types="enabledVisualizationTypes"></clyd-visualization>
    <clyd-metric v-model="scope.editedObject.metrics" :metrics="metrics" :multiple="isMultipleMetric"></clyd-metric>
    <clyd-breakdown v-model="scope.editedObject.breakdowns" :type="scope.editedObject.data_type" v-if="showBreakdown" :appId="scope.editedObject.apps[0]"></clyd-breakdown>
    <cly-form-field-group :label="i18nM('dashboards.additional-settings')">
        <clyd-title v-model="scope.editedObject.title"></clyd-title>
        <clyd-period v-if="showPeriod" v-model="scope.editedObject.custom_period"></clyd-period>
    </cly-form-field-group>
</div>
</template>

<script>
import { i18nMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import ClyFormFieldGroup from '../../../../../frontend/express/public/javascripts/components/form/cly-form-field-group.vue';

export default {
    mixins: [i18nMixin],
    components: {
        ClyFormFieldGroup
    },
    props: {
        scope: {
            type: Object
        }
    },
    data: function() {
        return {
            metricLists: {
                "session": [
                    { label: this.i18nM("common.total-sessions"), value: "t" },
                    { label: this.i18nM("common.unique-sessions"), value: "u" },
                    { label: this.i18nM("common.new-sessions"), value: "n" }
                ]
            }
        };
    },
    computed: {
        enabledVisualizationTypes: function() {
            if (this.scope.editedObject.app_count === 'multiple') {
                return ['time-series'];
            }

            return ['time-series', 'table', 'bar-chart', 'number'];
        },
        isMultipleMetric: function() {
            var multiple = false;
            var appCount = this.scope.editedObject.app_count;
            var visualization = this.scope.editedObject.visualization;

            if (appCount === 'single') {
                if (visualization === 'table' || visualization === 'time-series') {
                    multiple = true;
                }
            }

            return multiple;
        },
        metrics: function() {
            return this.metricLists[this.scope.editedObject.data_type];
        },
        showBreakdown: function() {
            return ["bar-chart", "table"].indexOf(this.scope.editedObject.visualization) > -1;
        },
        showPeriod: function() {
            return true;
        }
    },
    methods: {
        onDataTypeChange: function(v) {
            var widget = this.scope.editedObject;
            this.$emit("reset", {widget_type: widget.widget_type, data_type: v});
        }
    }
};
</script>
