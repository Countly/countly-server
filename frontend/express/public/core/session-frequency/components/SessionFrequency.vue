<template>
    <div>
        <cly-header
            :title="i18n('session-frequency.title')"
            :tooltip="{description: i18n('session-frequency.description')}">
        </cly-header>
        <cly-main>
            <cly-date-picker-g class="session-frequency-date-picker-container"></cly-date-picker-g>
            <cly-section>
                <cly-chart-bar
                    test-id="chart-session-frequency"
                    :option="sessionFrequencyOptions"
                    :height="400"
                    v-loading="isLoading"
                    :force-loading="isLoading">
                </cly-chart-bar>
            </cly-section>
            <cly-section>
                <cly-datatable-n
                    test-id="datatable-session-frequency"
                    :rows="sessionFrequencyRows"
                    :resizable="true"
                    :force-loading="isLoading">
                    <template v-slot="scope">
                        <el-table-column
                            :sortable="true"
                            prop="frequency"
                            :label="i18n('session-frequency.table.frequency')"
                            :sort-method="sortFrequencyBuckets">
                            <template slot-scope="scope">
                                <div :data-test-id="'datatable-session-frequency-time-since-last-session-' + scope.$index">
                                    {{scope.row.frequency}}
                                </div>
                            </template>
                        </el-table-column>
                        <el-table-column
                            sortable="custom"
                            prop="numberOfSessions"
                            :label="i18n('common.number-of-sessions')">
                            <template slot-scope="scope">
                                <div :data-test-id="'datatable-session-frequency-number-of-sessions-' + scope.$index">
                                    {{formatNumber(scope.row.numberOfSessions)}}
                                </div>
                            </template>
                        </el-table-column>
                        <el-table-column
                            sortable="custom"
                            prop="numberOfSessions"
                            column-key="percentage"
                            :label="i18n('common.percent')">
                            <template slot-scope="scope">
                                <div class="bu-level-left">
                                    <div
                                        class="bu-level-item slipping-away-users-table-data-item"
                                        :data-test-id="'datatable-session-frequency-percent-' + scope.$index">
                                        <span>{{scope.row.percentage}}%</span>
                                    </div>
                                    <cly-progress-bar
                                        :data-test-id="'datatable-session-frequency-progress-bar-' + scope.$index"
                                        :percentage="parseInt(scope.row.percentage)"
                                        :color="progressBarColor">
                                    </cly-progress-bar>
                                </div>
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
import ClyHeader from '../../../javascripts/components/layout/cly-header.vue';
import ClyMain from '../../../javascripts/components/layout/cly-main.vue';
import ClySection from '../../../javascripts/components/layout/cly-section.vue';
import ClyDatePickerG from '../../../javascripts/components/date/global-date-picker.vue';
import ClyChartBar from '../../../javascripts/components/echart/cly-chart-bar.vue';
import ClyDatatableN from '../../../javascripts/components/datatable/cly-datatable-n.vue';
import ClyProgressBar from '../../../javascripts/components/progress/progress-bar.vue';

export default {
    components: {
        ClyHeader,
        ClyMain,
        ClySection,
        ClyDatePickerG,
        ClyChartBar,
        ClyDatatableN,
        ClyProgressBar
    },
    mixins: [countlyVue.mixins.commonFormatters, countlyVue.mixins.i18n, autoRefreshMixin],
    data: function() {
        return {
            progressBarColor: "#017AFF"
        };
    },
    computed: {
        sessionFrequency: function() {
            return this.$store.state.countlySessionFrequency.sessionFrequency;
        },
        isLoading: function() {
            return this.$store.getters['countlySessionFrequency/isLoading'];
        },
        sessionFrequencyRows: function() {
            return this.$store.state.countlySessionFrequency.sessionFrequency.rows;
        },
        sessionFrequencyOptions: function() {
            return {
                xAxis: {
                    data: this.xAxisSessionFrequency,
                    axisLabel: {
                        color: "#333C48"
                    }
                },
                series: this.yAxisSessionFrequencyCountSerie
            };
        },
        xAxisSessionFrequency: function() {
            return this.$store.state.countlySessionFrequency.sessionFrequency.rows.map(function(tableRow) {
                return tableRow.frequency;
            });
        },
        yAxisSessionFrequencyCountSerie: function() {
            return this.sessionFrequency.series.map(function(sessionFrequencySerie) {
                return {
                    data: sessionFrequencySerie.data,
                    name: sessionFrequencySerie.label,
                };
            });
        },
    },
    methods: {
        refresh: function() {
            this.$store.dispatch('countlySessionFrequency/fetchAll', false);
        },
        dateChanged: function() {
            this.$store.dispatch('countlySessionFrequency/fetchAll', true);
        },
        sortFrequencyBuckets: function(a, b) {
            return a.weight - b.weight;
        }
    },
    mounted: function() {
        this.$store.dispatch('countlySessionFrequency/fetchAll', true);
    }
};
</script>
