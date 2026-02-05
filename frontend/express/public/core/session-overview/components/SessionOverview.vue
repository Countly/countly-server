<template>
    <div>
        <cly-header
            :title="i18n('session-overview.title')"
            :tooltip="{description: i18n('session-overview.description')}"
        >
        </cly-header>
        <cly-main>
            <cly-date-picker-g class="session-overview-date-picker-container"></cly-date-picker-g>
            <cly-section>
                <cly-chart-line test-id="analytics-session-overview" xAxisLabelOverflow="unset" :option="sessionOverviewOptions" :height="400" v-loading="isLoading" :force-loading="isLoading" :legend="legend" category="session"></cly-chart-line>
            </cly-section>
            <cly-section>
                <cly-datatable-n  test-id="analytics-session-overview" :rows="sessionOverviewRows" :resizable="true" :force-loading="isLoading">
                    <template v-slot="scope">
                        <el-table-column prop="date" :label="i18n('common.date')" :sortable="true" :sort-method="sortDates">
                            <template slot-scope="scope">
							<div :data-test-id="'datatable-analytics-session-overview-date-' + scope.$index">{{scope.row.date}}</div>
						</template>
                        </el-table-column>
                        <el-table-column sortable="custom" prop="totalSessions" :label="i18n('common.total-sessions')">
                            <template slot-scope="scope">
                                <div :data-test-id="'datatable-analytics-session-overview-total-sessions-' + scope.$index">{{formatNumber(scope.row.totalSessions)}}</div>
                            </template>
                        </el-table-column>
                        <el-table-column sortable="custom" prop="newSessions" :label="i18n('common.new-sessions')">
                            <template slot-scope="scope">
                                <div :data-test-id="'datatable-analytics-session-overview-new-sessions-' + scope.$index">{{formatNumber(scope.row.newSessions)}}</div>
                            </template>
                        </el-table-column>
                        <el-table-column sortable="custom" prop="uniqueSessions" :label="i18n('common.unique-sessions')">
                            <template slot-scope="scope">
                                <div :data-test-id="'datatable-analytics-session-overview-unique-sessions-' + scope.$index">{{formatNumber(scope.row.uniqueSessions)}}</div>
                            </template>
                        </el-table-column>
                    </template>
                </cly-datatable-n>
            </cly-section>
        </cly-main>
    </div>
</template>

<script>
import countlyVue, { autoRefreshMixin } from '../../../javascripts/countly/vue/core.js';

export default {
    mixins: [countlyVue.mixins.commonFormatters, countlyVue.mixins.i18n, autoRefreshMixin],
    data: function() {
        return {};
    },
    computed: {
        sessionOverview: function() {
            return this.$store.state.countlySessionOverview.sessionOverview;
        },
        isLoading: function() {
            return this.$store.getters['countlySessionOverview/isLoading'];
        },
        sessionOverviewRows: function() {
            return this.$store.state.countlySessionOverview.sessionOverview.rows;
        },
        sessionOverviewOptions: function() {
            return {
                xAxis: {
                    data: this.xAxisSessionOverviewDatePeriods
                },
                series: this.yAxisSessionOverviewCountSeries
            };
        },
        xAxisSessionOverviewDatePeriods: function() {
            return this.$store.state.countlySessionOverview.sessionOverview.rows.map(function(tableRow) {
                return tableRow.date;
            });
        },
        yAxisSessionOverviewCountSeries: function() {
            return this.sessionOverview.series.map(function(sessionOverviewSerie) {
                return {
                    data: sessionOverviewSerie.data,
                    name: sessionOverviewSerie.label,
                };
            });
        },
        legend: function() {
            var result = {
                show: true,
                type: "primary",
                data: this.$store.state.countlySessionOverview.sessionOverview.trends
            };
            return result;
        }
    },
    methods: {
        refresh: function() {
            this.$store.dispatch('countlySessionOverview/fetchAll', false);
        },
        dateChanged: function() {
            this.$store.dispatch('countlySessionOverview/fetchAll', true);
        },
        sortDates: function(a, b) {
            return new Date(a.date) - new Date(b.date);
        }
    },
    mounted: function() {
        this.$store.dispatch('countlySessionOverview/fetchAll', true);
    }
};
</script>
