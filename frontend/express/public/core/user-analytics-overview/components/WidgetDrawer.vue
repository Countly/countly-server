<template>
    <div>
        <clyd-datatype v-model="scope.editedObject.data_type" @change="onDataTypeChange"></clyd-datatype>
        <clyd-breakdown v-model="scope.editedObject.breakdowns" type="user-analytics" @change="onBreakdownChange" :appId="scope.editedObject.apps[0]"></clyd-breakdown>
        <clyd-appcount v-model="scope.editedObject.app_count"></clyd-appcount>
        <clyd-sourceapps v-model="scope.editedObject.apps" :multiple="scope.editedObject.app_count === 'multiple'"></clyd-sourceapps>
        <clyd-visualization v-model="scope.editedObject.visualization" :enabled-types="enabledVisualizationTypes"></clyd-visualization>
        <clyd-metric v-model="scope.editedObject.metrics" :metrics="metrics" :multiple="isMultipleMetric"></clyd-metric>
        <cly-form-field-group :label="i18n('dashboards.additional-settings')">
            <clyd-title v-model="scope.editedObject.title"></clyd-title>
            <clyd-period v-model="scope.editedObject.custom_period"></clyd-period>
        </cly-form-field-group>
    </div>
</template>

<script>
import countlyVue from '../../../javascripts/countly/vue/core.js';
import ClyFormFieldGroup from '../../../javascripts/components/form/cly-form-field-group.vue';

export default {
    components: {
        ClyFormFieldGroup
    },
    mixins: [
        countlyVue.mixins.i18n
    ],
    data: function() {
        return {
        };
    },
    computed: {
        metrics: function() {
            return [
                { label: this.i18n("common.table.total-users"), value: "u" },
                { label: this.i18n("common.table.new-users"), value: "n" },
                { label: this.i18n("common.table.returning-users"), value: "r" }
            ];
        },
        enabledVisualizationTypes: function() {
            if (this.scope.editedObject.app_count === 'single') {
                return ['time-series', 'bar-chart', 'number'];
            }
            else if (this.scope.editedObject.app_count === 'multiple') {
                return ['time-series', 'bar-chart'];
            }
            else {
                return [];
            }
        },
        isMultipleMetric: function() {
            var multiple = false;
            var appCount = this.scope.editedObject.app_count;
            var visualization = this.scope.editedObject.visualization;

            if (appCount === 'single') {
                if (visualization === 'bar-chart' || visualization === 'time-series') {
                    multiple = true;
                }
            }

            return multiple;
        },
    },
    mounted: function() {
        if (this.scope.editedObject.breakdowns.length === 0) {
            this.scope.editedObject.breakdowns = ['overview'];
        }
    },
    methods: {
        onDataTypeChange: function(v) {
            var widget = this.scope.editedObject;
            this.$emit("reset", {widget_type: widget.widget_type, data_type: v});
        },
        onBreakdownChange: function(v) {
            var widget = this.scope.editedObject;
            this.$emit("reset", {widget_type: widget.widget_type, data_type: widget.data_type, breakdowns: [v]});
        }
    },
    props: {
        scope: {
            type: Object,
            default: function() {
                return {};
            }
        }
    }
};
</script>
