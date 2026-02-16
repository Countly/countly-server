<template>
    <div>
        <cly-header
            :title="i18n('sources.title')"
            :tooltip="{description: i18n('sources.description')}"
        >
            <template v-slot:header-right>
                <cly-more-options
                    v-if="topDropdown"
                    size="small"
                >
                    <el-dropdown-item
                        v-for="(item, idx) in topDropdown"
                        :key="idx"
                        :command="{url: item.value}"
                    >
                        {{ item.label }}
                    </el-dropdown-item>
                    <el-dropdown-item :command="{url: '#/manage/configurations/sources'}">
                        {{ i18n('sources.plugin-settings') }}
                    </el-dropdown-item>
                </cly-more-options>
            </template>
        </cly-header>
        <cly-main>
            <cly-date-picker-g class="acquisition-sources-view__date-picker-container" />
            <cly-section>
                <div class="bu-columns bu-is-gapless">
                    <div class="bu-column bu-is-6">
                        <cly-chart-pie
                            test-id="pie-source-total-sessions"
                            :option="pieSourcesTotalSessions"
                            :showToggle="false"
                            v-loading="isLoading"
                            :force-loading="isLoading"
                        />
                    </div>
                    <div class="bu-column bu-is-6">
                        <cly-chart-pie
                            test-id="pie-sources-new-users"
                            :option="pieSourcesNewUsers"
                            :showToggle="false"
                            v-loading="isLoading"
                            :force-loading="isLoading"
                        />
                    </div>
                </div>
            </cly-section>
            <cly-section>
                <cly-datatable-n
                    test-id="datatable-analytics-acquisition"
                    :rows="sourcesData.chartData"
                    :key-fn="sourcesFnKey"
                    :hasDynamicCols="false"
                    :force-loading="isLoading"
                    ref="table"
                    row-class-name="bu-is-clickable"
                    @row-click="handleTableRowClick"
                >
                    <template v-slot:header-left>
                    </template>
                    <template v-slot="scope">
                        <el-table-column type="expand">
                            <template slot-scope="rowScope">
                                <sources-extend-table
                                    v-if="sourcesDetailData[rowScope.row.sources]"
                                    class="acquisition-sources-view__extend-table"
                                    :rows="sourcesDetailData[rowScope.row.sources]"
                                />
                            </template>
                        </el-table-column>
                        <el-table-column
                            sortable="true"
                            prop="sources"
                            :label="i18n('sources.source')"
                        >
                            <template v-slot="rowScope">
                                <div :data-test-id="'datatable-acquisition-source-' + rowScope.$index">
                                    {{ rowScope.row.sources }}
                                </div>
                            </template>
                        </el-table-column>
                        <el-table-column
                            sortable="true"
                            prop="t"
                            :label="i18n('common.table.total-sessions')"
                        >
                            <template v-slot="rowScope">
                                <div :data-test-id="'datatable-acquisition-total-sessions-' + rowScope.$index">
                                    {{ formatNumber(rowScope.row.t) }}
                                </div>
                            </template>
                        </el-table-column>
                        <el-table-column
                            sortable="true"
                            prop="u"
                            :label="i18n('common.table.total-users')"
                        >
                            <template v-slot="rowScope">
                                <div :data-test-id="'datatable-acquisition-total-users-' + rowScope.$index">
                                    {{ formatNumber(rowScope.row.u) }}
                                </div>
                            </template>
                        </el-table-column>
                        <el-table-column
                            sortable="true"
                            prop="n"
                            :label="i18n('common.new-users')"
                        >
                            <template v-slot="rowScope">
                                <div :data-test-id="'datatable-acquisition-new-users-' + rowScope.$index">
                                    {{ formatNumber(rowScope.row.n) }}
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
import { i18n, i18nMixin, commonFormattersMixin, autoRefreshMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/core.js';
import { dataMixin } from '../../../../../frontend/express/public/javascripts/countly/vue/container.js';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import ClyMoreOptions from '../../../../../frontend/express/public/javascripts/components/dropdown/more-options.vue';
import ClyChartPie from '../../../../../frontend/express/public/javascripts/components/echart/cly-chart-pie.vue';
import SourcesExtendTable from './SourcesExtendTable.vue';
import countlySources from '../store/index.js';

export default {
    components: {
        ClyMoreOptions,
        ClyChartPie,
        SourcesExtendTable
    },
    mixins: [
        dataMixin({
            'externalLinks': '/analytics/sources/links'
        }),
        commonFormattersMixin,
        autoRefreshMixin,
        i18nMixin
    ],
    data: function() {
        return {
            sourcesData: [],
            pieSourcesNewUsers: {
                series: [
                    {
                        name: i18n('common.table.new-users'),
                        data: [],
                        label: {
                            formatter: function() {
                                return i18n('common.table.new-users') + "\n";
                            }
                        },
                    }
                ]
            },
            pieSourcesTotalSessions: {
                series: [
                    {
                        name: i18n('common.table.total-sessions'),
                        data: [],
                        label: {
                            formatter: function() {
                                return i18n('common.table.total-sessions') + "\n";
                            }
                        },
                    }
                ]
            },
            dataMap: {},
            sourcesDetailData: {},
            isLoading: true
        };
    },
    computed: {
        topDropdown: function() {
            if (this.externalLinks && Array.isArray(this.externalLinks) && this.externalLinks.length > 0) {
                return this.externalLinks;
            }
            else {
                return null;
            }
        }
    },
    methods: {
        sourcesDetailDataMap: function() {
            var self = this;
            var cleanData = countlySources.getData(true).chartData;
            var source;
            for (var i in cleanData) {
                source = countlySources.getSourceName(cleanData[i].sources);
                if (!self.dataMap[source]) {
                    self.dataMap[source] = {};
                }
                self.dataMap[source][cleanData[i].sources] = cleanData[i];
            }
            this.sourcesDetailData = self.dataMap;
        },
        sourcesFnKey: function(row) {
            return row.sources;
        },
        chartsDataPrepare: function(sourcesData) {
            var self = this;

            var totalSessionSeriesData = [{ name: i18n('common.table.no-data'), value: 0 }];
            var newUsersSeriesData = [{ name: i18n('common.table.no-data'), value: 0 }];
            var sumOfTotalSession = 0;
            var sumOfNewUsers = 0;

            if (typeof sourcesData.chartDPTotal !== "undefined" && typeof sourcesData.chartDPTotal.dp !== "undefined") {
                totalSessionSeriesData = [];
                for (var i = 0; i < sourcesData.chartDPTotal.dp.length; i++) {
                    totalSessionSeriesData.push({value: sourcesData.chartDPTotal.dp[i].data[0][1], name: sourcesData.chartDPTotal.dp[i].label});
                    sumOfTotalSession += sourcesData.chartDPTotal.dp[i].data[0][1];
                }
            }

            if (typeof sourcesData.chartDPNew !== "undefined" && typeof sourcesData.chartDPNew.dp !== "undefined") {
                newUsersSeriesData = [];
                for (var j = 0; j < sourcesData.chartDPNew.dp.length; j++) {
                    newUsersSeriesData.push({value: sourcesData.chartDPNew.dp[j].data[0][1], name: sourcesData.chartDPNew.dp[j].label});
                    sumOfNewUsers += sourcesData.chartDPNew.dp[j].data[0][1];
                }
            }

            // set charts center label
            self.pieSourcesTotalSessions.series[0].label = {
                formatter: "{a|" + i18n('common.table.total-sessions') + "}\n" + countlyCommon.getShortNumber(sumOfTotalSession || 0),
                textAlign: "center",
                fontWeight: 500,
                fontSize: 16,
                lineHeight: 24,
                rich: {
                    a: {
                        fontWeight: 400,
                        fontSize: 14,
                        lineHeight: 20
                    }
                }
            };

            self.pieSourcesNewUsers.series[0].label = {
                formatter: "{a|" + i18n('common.table.new-users') + "}\n" + countlyCommon.getShortNumber(sumOfNewUsers || 0),
                textAlign: "center",
                fontWeight: 500,
                fontSize: 16,
                lineHeight: 24,
                rich: {
                    a: {
                        fontWeight: 400,
                        fontSize: 14,
                        lineHeight: 20
                    }
                }
            };

            return {
                t: {
                    data: totalSessionSeriesData
                },
                n: {
                    data: newUsersSeriesData
                }
            };
        },
        refresh: function(force) {
            var self = this;
            if (force) {
                this.isLoading = true;
            }
            Promise.resolve(countlySources.initialize(true))
                .then(function() {
                    self.sourcesData = countlySources.getData();
                    self.sourcesDetailDataMap();

                    // calculate charts data for total session and new users charts
                    var chartsData = self.chartsDataPrepare(self.sourcesData);
                    self.pieSourcesTotalSessions.series[0].data = chartsData.t.data;
                    self.pieSourcesNewUsers.series[0].data = chartsData.n.data;
                    self.isLoading = false;
                });
        },
        handleTableRowClick: function(row) {
            // Only expand row if text inside of it are not highlighted
            if (window.getSelection().toString().length === 0) {
                this.$refs.table.$refs.elTable.toggleRowExpansion(row);
            }
        }
    },
    created: function() {
        this.refresh(true);
    }
};
</script>
