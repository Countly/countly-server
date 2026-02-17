<template>
<div>
    <cly-form-field :label="i18n('dashboards.source-apps')" name="app" rules="required">
        <cly-app-select
            :disabled="sdkListLoading"
            :placeholder="i18n('placeholder.dashboards.select-applications-single')"
            style="width: 100%"
            @change="loadSDKList(scope.editedObject.selectedApp)"
            v-model="scope.editedObject.selectedApp">
        </cly-app-select>
    </cly-form-field>
    <cly-form-field label="SDK type" name="sdkList" rules="required">
        <cly-select-x
            class="cly-is-fullwidth"
            :auto-commit="true"
            :disabled="sdkListLoading || !scope.editedObject.apps"
            :hide-all-options-tab="true"
            :key="'select_sdk'"
            :options="availableSDKs"
            :width="500"
            v-model="selectedSingleSDK">
        </cly-select-x>
    </cly-form-field>
    <clyd-visualization v-model="scope.editedObject.visualization" :enabled-types="enabledVisualizationTypes"></clyd-visualization>
    <clyd-metric v-model="scope.editedObject.metrics" :metrics="metrics" :multiple="isMultipleMetric"></clyd-metric>
    <clyd-displaytype v-model="scope.editedObject.displaytype" v-if="showDisplayType"></clyd-displaytype>
    <cly-form-field-group :label="i18n('dashboards.additional-settings')">
        <clyd-title v-model="scope.editedObject.title"></clyd-title>
	    <clyd-period v-if="showPeriod" v-model="scope.editedObject.custom_period"></clyd-period>
    </cly-form-field-group>
</div>
</template>

<script>
import { i18n, i18nMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { countlySDK } from '../store/index.js';

export default {
    mixins: [i18nMixin],
    props: {
        scope: {
            type: Object
        }
    },
    data: function() {
        return {
            metricLists: {
                "sdk": [
                    { label: i18n("common.total-sessions"), value: "t" },
                    { label: i18n("common.table.total-users"), value: "u" },
                    { label: i18n("common.new-sessions"), value: "n" }
                ]
            },
            sdkListLoading: false,
            availableSDKs: []
        };
    },
    computed: {
        enabledVisualizationTypes: function() {
            return ['time-series', 'table', 'bar-chart'];
        },
        isMultipleMetric: function() {
            return this.scope.editedObject.visualization === 'table';
        },
        showDisplayType: function() {
            return this.scope.editedObject.visualization === 'time-series';
        },
        metrics: function() {
            return this.metricLists[this.scope.editedObject.data_type];
        },
        showBreakdown: function() {
            return false;
        },
        showPeriod: function() {
            return true;
        },
        selectedSingleSDK: {
            get: function() {
                return this.scope.editedObject.selectedSDK;
            },
            set: function(val) {
                this.scope.editedObject.selectedSDK = val;
            }
        }
    },
    methods: {
        onDataTypeChange: function(v) {
            var widget = this.scope.editedObject;
            this.$emit("reset", {widget_type: widget.widget_type, data_type: v});
        },
        loadSDKList: function(selectedAppId) {
            var self = this;
            self.selectedSingleSDK = "";
            if (!selectedAppId) {
                self.availableSDKs = [];
            }
            else {
                self.sdkListLoading = true;
                countlySDK.loadListOfSDKs(selectedAppId, function(res) {
                    var list = res && res.meta && res.meta.sdks || [];
                    self.availableSDKs = list.map(function(key) {
                        return {label: key, value: key};
                    });
                    self.sdkListLoading = false;
                });
            }
        }
    }
};
</script>
