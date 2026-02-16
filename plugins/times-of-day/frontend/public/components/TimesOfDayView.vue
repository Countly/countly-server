<template>
    <div>
        <cly-header
            :title="i18n('times-of-day.title')"
            :tooltip="{description: i18n('times-of-day.description')}"
        />
        <cly-main>
            <div
                class="bu-is-flex bu-is-justify-content-space-between bu-is-align-items-center"
                style="margin-bottom:32px"
            >
                <div class="bu-is-flex bu-is-align-items-center">
                    <div
                        class="bu-mr-1 times-of-day__results-text"
                        data-test-id="results-for-label"
                    >
                        {{ i18n('times-of-day.results-for') }}
                    </div>
                    <cly-event-select
                        test-id="results-for-select"
                        v-model="selectedFilter"
                        :blacklistedEvents="['[CLY]_view','feedback','[CLY]_crash']"
                    />
                </div>
                <el-select
                    test-id="time"
                    :value="selectedDateBucketValue"
                    @change="onSelectDateBucket"
                >
                    <el-option
                        v-for="item in dateBuckets"
                        :key="item.value"
                        :label="item.label"
                        :value="item.value"
                    />
                </el-select>
            </div>
            <cly-section>
                <scatter-chart
                    data-test-id="times-of-day-chart"
                    :height="600"
                    :series="series"
                    :maxSeriesValue="maxSeriesValue"
                    v-loading="isLoading"
                    :force-loading="isLoading"
                />
            </cly-section>
            <cly-section>
                <cly-datatable-n
                    test-id="times-of-day"
                    :rows="timesOfDayRows"
                    :resizable="false"
                    :force-loading="isLoading"
                >
                    <template v-slot="scope">
                        <el-table-column
                            fixed
                            width="240"
                            sortable="custom"
                            prop="period"
                            :label="i18n('times-of-day.table-hours-period')"
                        >
                            <template slot-scope="scope">
                                <div :data-test-id="'datatable-hours-' + scope.$index">{{ scope.row.period }}</div>
                            </template>
                        </el-table-column>
                        <el-table-column
                            width="240"
                            sortable="custom"
                            prop="monday"
                            :label="i18n('times-of-day.monday')"
                        >
                            <template slot-scope="scope">
                                <div :data-test-id="'datatable-monday-' + scope.$index">{{ formatNumber(scope.row.monday) }}</div>
                            </template>
                        </el-table-column>
                        <el-table-column
                            width="240"
                            sortable="custom"
                            prop="tuesday"
                            :label="i18n('times-of-day.tuesday')"
                        >
                            <template slot-scope="scope">
                                <div :data-test-id="'datatable-tuesday-' + scope.$index">{{ formatNumber(scope.row.tuesday) }}</div>
                            </template>
                        </el-table-column>
                        <el-table-column
                            width="240"
                            sortable="custom"
                            prop="wednesday"
                            :label="i18n('times-of-day.wednesday')"
                        >
                            <template slot-scope="scope">
                                <div :data-test-id="'datatable-wednesday-' + scope.$index">{{ formatNumber(scope.row.wednesday) }}</div>
                            </template>
                        </el-table-column>
                        <el-table-column
                            width="240"
                            sortable="custom"
                            prop="thursday"
                            :label="i18n('times-of-day.thursday')"
                        >
                            <template slot-scope="scope">
                                <div :data-test-id="'datatable-thursday-' + scope.$index">{{ formatNumber(scope.row.thursday) }}</div>
                            </template>
                        </el-table-column>
                        <el-table-column
                            width="240"
                            sortable="custom"
                            prop="friday"
                            :label="i18n('times-of-day.friday')"
                        >
                            <template slot-scope="scope">
                                <div :data-test-id="'datatable-friday-' + scope.$index">{{ formatNumber(scope.row.friday) }}</div>
                            </template>
                        </el-table-column>
                        <el-table-column
                            width="240"
                            sortable="custom"
                            prop="saturday"
                            :label="i18n('times-of-day.saturday')"
                        >
                            <template slot-scope="scope">
                                <div :data-test-id="'datatable-saturday-' + scope.$index">{{ formatNumber(scope.row.saturday) }}</div>
                            </template>
                        </el-table-column>
                        <el-table-column
                            width="240"
                            sortable="custom"
                            prop="sunday"
                            :label="i18n('times-of-day.sunday')"
                        >
                            <template slot-scope="scope">
                                <div :data-test-id="'datatable-sunday-' + scope.$index">{{ formatNumber(scope.row.sunday) }}</div>
                            </template>
                        </el-table-column>
                    </template>
                </cly-datatable-n>
            </cly-section>
        </cly-main>
    </div>
</template>
<script>
import { i18nMixin, commonFormattersMixin, autoRefreshMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import ScatterChart from './ScatterChart.vue';
import { service } from '../store/index.js';

export default {
    components: {
        ScatterChart
    },
    mixins: [commonFormattersMixin, autoRefreshMixin, i18nMixin],
    data: function() {
        return {
            dateBuckets: service.getDateBucketsList(),
        };
    },
    computed: {
        series: function() {
            return this.$store.state.countlyTimesOfDay.series;
        },
        maxSeriesValue: function() {
            return this.$store.state.countlyTimesOfDay.maxSeriesValue;
        },
        timesOfDayRows: function() {
            return this.$store.state.countlyTimesOfDay.rows;
        },
        isLoading: function() {
            return this.$store.getters['countlyTimesOfDay/loading'];
        },
        selectedFilter: {
            get: function() {
                return this.$store.state.countlyTimesOfDay.filters.dataType;
            },
            set: function(value) {
                this.$store.dispatch('countlyTimesOfDay/setFilters', {dataType: value, dateBucketValue: this.$store.state.countlyTimesOfDay.filters.dateBucketValue});
                this.$store.dispatch('countlyTimesOfDay/fetchAll', true);
            }
        },
        selectedDateBucketValue: function() {
            return this.$store.state.countlyTimesOfDay.filters.dateBucketValue;
        }
    },
    methods: {
        onSelectDateBucket: function(value) {
            this.$store.dispatch('countlyTimesOfDay/setFilters', {dataType: this.$store.state.countlyTimesOfDay.filters.dataType, dateBucketValue: value});
            this.$store.dispatch('countlyTimesOfDay/fetchAll', true);
        },
        refresh: function() {
            this.$store.dispatch('countlyTimesOfDay/fetchAll', false);
        }
    },
    mounted: function() {
        this.$store.dispatch('countlyTimesOfDay/fetchAll', true);
    }
};
</script>
