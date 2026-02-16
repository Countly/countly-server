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
import { i18nMixin, mixins } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import BaseWidget from '../../../../dashboards/frontend/public/components/BaseWidget.vue';

export default {
    components: {
        BaseWidget
    },
    mixins: [
        mixins.customDashboards.global,
        mixins.customDashboards.widget,
        mixins.customDashboards.apps,
        i18nMixin
    ],
    data: function() {
        return {
            map: {
                "sources": this.i18n("sources.title")
            },
            tableMap: {
                "u": this.i18n("common.table.total-users"),
                "t": this.i18n("common.total-sessions"),
                "n": this.i18n("common.table.new-users"),
                "sources": this.i18n("sources.source"),
            }
        };
    },
    computed: {
        title: function() {
            if (this.data.title) {
                return this.data.title;
            }
            return this.i18n("sources.title");
        },
        showBuckets: function() {
            return false;
        },
        metricLabels: function() {
            return [];
        },
        getTableData: function() {
            return this.calculateTableDataFromWidget(this.data);
        },
        tableStructure: function() {
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
