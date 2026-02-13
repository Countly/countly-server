<template>
<div>
    <clyd-appcount v-model="scope.editedObject.app_count"></clyd-appcount>
    <clyd-sourceapps v-model="scope.editedObject.apps" :multiple="scope.editedObject.app_count === 'multiple'"></clyd-sourceapps>
    <clyd-visualization v-model="scope.editedObject.visualization" :enabled-types="enabledVisualizationTypes"></clyd-visualization>
    <clyd-event :disabled="!showEventsSelector" v-model="scope.editedObject.events" :multiple="isMultipleEvents" :multiple-limit="5" :appIds="scope.editedObject.apps"></clyd-event>
    <clyd-breakdown v-model="scope.editedObject.breakdowns" type="events" v-if="showBreakdown" :event="scope.editedObject.events[0]"></clyd-breakdown>
    <clyd-metric v-model="scope.editedObject.metrics" :metrics="metrics" :multiple="isMultipleMetric"></clyd-metric>
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
            type: Object,
            default: function() {
                return {};
            }
        }
    },
    data: function() {
        return {
            metrics: [
                { label: this.i18nM("events.table.count"), value: "c" },
                { label: this.i18nM("events.table.sum"), value: "s" },
                { label: this.i18nM("events.table.dur"), value: "dur" }
            ]
        };
    },
    computed: {
        enabledVisualizationTypes: function() {
            if (this.scope.editedObject.app_count === 'multiple') {
                return ['time-series'];
            }
            else {
                return ['table', 'time-series', 'number', 'bar-chart'];
            }
        },
        isMultipleMetric: function() {
            var multiple = false;

            if (this.scope.editedObject.app_count === 'single') {
                if (this.scope.editedObject.visualization === 'table' ||
                    this.scope.editedObject.visualization === 'time-series') {
                    multiple = true;
                }
            }

            return multiple;
        },
        showEventsSelector: function() {
            if (this.scope.editedObject.apps && this.scope.editedObject.apps.length > 0) {
                return true;
            }
            else {
                return false;
            }
        },
        showBreakdown: function() {
            if (this.scope.editedObject.events && this.scope.editedObject.events.length > 0) {
                return ["bar-chart", "table"].indexOf(this.scope.editedObject.visualization) > -1;
            }
            else {
                return false;
            }
        },
        showPeriod: function() {
            return true;
        },
        isMultipleEvents: function() {
            return this.scope.editedObject.visualization === "time-series";
        }
    }
};
</script>
