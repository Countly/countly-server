<template>
    <div>
        <clyd-datatype v-model="scope.editedObject.data_type" @change="onDataTypeChange"></clyd-datatype>
        <clyd-sourceapps v-model="scope.editedObject.apps" :multiple="false"></clyd-sourceapps>
        <clyd-visualization v-model="scope.editedObject.visualization" :enabled-types="['table']"></clyd-visualization>
        <clyd-metric v-model="scope.editedObject.metrics" :metrics="availableStatsMetric" :multiple="true"></clyd-metric>
        <cly-form-field-group :label="i18n('dashboards.additional-settings')">
            <clyd-title v-model="scope.editedObject.title"></clyd-title>
            <clyd-period :disabled-shortcuts="['0days']" v-model="scope.editedObject.custom_period"></clyd-period>
        </cly-form-field-group>
    </div>
</template>

<script>
import { i18n, i18nMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import countlyGlobal from '../../../../../frontend/express/public/javascripts/countly/countly.global.js';
import ClyFormFieldGroup from '../../../../../frontend/express/public/javascripts/components/form/cly-form-field-group.vue';

export default {
    components: {
        ClyFormFieldGroup
    },
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
            useCustomTitle: false,
            useCustomPeriod: false
        };
    },
    computed: {
        availableStatsMetric: function() {
            var app = this.scope.editedObject.apps[0];
            var metrics = [
                { label: i18n("views.u"), value: "u" },
                //{ label: i18n("views.n"), value: "n" },
                { label: i18n("views.t"), value: "t" },
                { label: i18n("views.d"), value: "d" },
                { label: i18n("views.s"), value: "s" },
                { label: i18n("views.e"), value: "e" },
                { label: i18n("views.b"), value: "b" },
                { label: i18n("views.br"), value: "br" },
                // { label: i18n("views.uvc"), value: "uvc" }
            ];
            if (app && countlyGlobal.apps[app] && countlyGlobal.apps[app].type === "web") {
                metrics.push({ label: i18n("views.scr"), value: "scr" });
            }
            return metrics;
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
