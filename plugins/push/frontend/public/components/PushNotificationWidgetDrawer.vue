<template>
    <div>
        <clyd-appcount v-model="scope.editedObject.app_count"></clyd-appcount>
        <clyd-sourceapps v-model="scope.editedObject.apps" :multiple="scope.editedObject.app_count === 'multiple'"></clyd-sourceapps>
        <clyd-visualization v-model="scope.editedObject.visualization" :enabled-types="enabledVisualizationTypes"></clyd-visualization>
        <clyd-metric v-model="scope.editedObject.metrics" :metrics="metrics" :multiple="isMultipleMetric" :placeholder="i18n('push-notification.select-max-two-metrics')"></clyd-metric>
        <cly-form-field-group :label="i18n('dashboards.additional-settings')">
            <clyd-title v-model="scope.editedObject.title"></clyd-title>
        </cly-form-field-group>
    </div>
</template>

<script>
import { i18nMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';

export default {
    mixins: [i18nMixin],
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
                { label: this.i18n("dashboards.sent"), value: "sent" },
                { label: this.i18n("dashboards.actioned"), value: "actioned" }
            ]
        };
    },
    computed: {
        enabledVisualizationTypes: function() {
            if (this.scope.editedObject.app_count === 'single') {
                return ['time-series', 'number'];
            }
            else {
                return ['time-series'];
            }
        },
        isMultipleMetric: function() {
            var multiple = false;

            if ((this.scope.editedObject.app_count === 'single') &&
                (this.scope.editedObject.visualization === 'time-series')) {
                multiple = true;
            }

            return multiple;
        }
    }
};
</script>
