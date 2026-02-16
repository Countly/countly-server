<template>
    <base-widget
        :data="data"
        :loading="loading"
        :is-allowed="isAllowed"
        :title="title"
        :show-buckets="showBuckets"
        :table-data="getTableData"
        :table-structure="tableStructure"
        :stacked-bar-options="stackedBarOptions"
        :pie-graph="pieGraph"
        :metric-labels="metricLabels"
        @command="$emit('command', $event)"
    />
</template>
<script>
import { i18nMixin, mixins } from '../../../javascripts/countly/vue/core.js';
import BaseWidget from '../../../../../../plugins/dashboards/frontend/public/components/BaseWidget.vue';

export default {
    components: {
        BaseWidget
    },
    mixins: [
        mixins.customDashboards.global,
        mixins.customDashboards.widget,
        i18nMixin
    ],
    data: function() {
        return {
            map: {
                "countries": this.i18n("countries.title"),
                "langs": this.i18n("languages.title")
            },
            tableMap: {
                "u": this.i18n("common.table.total-users"),
                "t": this.i18n("common.total-sessions"),
                "n": this.i18n("common.table.new-users"),
                "countries": this.i18n("countries.title"),
                "langs": this.i18n("languages.table.language")
            }
        };
    },
    computed: {
        title: function() {
            if (this.data.title) {
                return this.data.title;
            }
            if (this.data.dashData) {
                return this.i18n("dashboards.data-type.geo") + " (" + (this.map[this.data.breakdowns[0]] || this.data.breakdowns[0]) + ")";
            }

            return this.i18n("dashboards.data-type.geo");
        },
        showBuckets: function() {
            return false;
        },
        metricLabels: function() {
            return [];
        },
        getTableData: function() {
            var dd = (this.data.dashData && this.data.dashData.data) || {};
            if (!Object.keys(dd).length) {
                return [];
            }
            return this.calculateTableDataFromWidget(this.data);
        },
        tableStructure: function() {
            var dd = (this.data.dashData && this.data.dashData.data) || {};
            if (!Object.keys(dd).length) {
                return [];
            }
            return this.calculateTableColsFromWidget(this.data, this.tableMap);
        },
        stackedBarOptions: function() {
            return this.calculateStackedBarOptionsFromWidget(this.data, this.tableMap);
        },
        pieGraph: function() {
            return this.calculatePieGraphFromWidget(this.data, this.tableMap);
        }
    }
};
</script>
