<template>
    <div>
        <clyd-datatype v-model="scope.editedObject.data_type" @change="onDataTypeChange"></clyd-datatype>
        <clyd-sourceapps v-model="scope.editedObject.apps" :multiple="false"></clyd-sourceapps>
        <clyd-breakdown v-model="scope.editedObject.breakdowns" type="geo" :appId="scope.editedObject.apps[0]"></clyd-breakdown>
        <clyd-visualization v-model="scope.editedObject.visualization" :enabled-types="enabledVisualizationTypes"></clyd-visualization>
        <clyd-colors v-if="scope.editedObject.visualization === 'bar-chart'" v-model="scope.editedObject.bar_color"></clyd-colors>
        <clyd-metric v-model="scope.editedObject.metrics" :metrics="metrics" :multiple="isMultipleMetric"></clyd-metric>
        <cly-form-field-group :label="i18n('dashboards.additional-settings')">
            <clyd-title v-model="scope.editedObject.title"></clyd-title>
            <clyd-period v-model="scope.editedObject.custom_period"></clyd-period>
        </cly-form-field-group>
    </div>
</template>

<script>
import { i18nMixin } from '../../../javascripts/countly/vue/core.js';
import ClyFormFieldGroup from '../../../javascripts/components/form/cly-form-field-group.vue';

export default {
    components: {
        ClyFormFieldGroup,
    },
    mixins: [i18nMixin],
    props: {
        scope: {
            type: Object
        }
    },
    computed: {
        metrics: function() {
            return [
                { label: this.i18n("common.table.total-users"), value: "u" },
                { label: this.i18n("common.table.new-users"), value: "n" },
                { label: this.i18n("common.total-sessions"), value: "t" }
            ];
        },
        enabledVisualizationTypes: function() {
            return ['pie-chart', 'bar-chart', 'table'];
        },
        isMultipleMetric: function() {
            var multiple = false;
            var visualization = this.scope.editedObject.visualization;
            if (visualization === 'table') {
                multiple = true;
            }

            return multiple;
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
