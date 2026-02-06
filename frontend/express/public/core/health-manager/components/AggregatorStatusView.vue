<template>
    <div v-bind:class="[componentId]" class="aggregator-status-view">
        <cly-main>
            <!-- Loading state -->
            <div v-if="isLoading && !hasFetched" v-loading="true" class="bu-p-5" style="min-height: 200px;">
            </div>

            <!-- Kafka Stats Section -->
            <template v-if="hasFetched && hasKafkaData">
                <!-- Summary Cards -->
                <cly-section title="Kafka Consumer Stats" tooltip="Kafka consumer health metrics updated every 2 minutes by the lag monitoring job">
                    <cly-metric-cards :multiline="true">
                        <cly-metric-card
                            v-for="card in summaryCards"
                            :key="card.title"
                            color="#097EFF">
                            <template v-slot:default>
                                {{ card.title }}
                                <cly-tooltip-icon v-if="card.tooltip" class="bu-ml-1" :tooltip="card.tooltip"></cly-tooltip-icon>
                            </template>
                            <template v-slot:number>
                                <span :class="card.numberClass || ''">{{ card.value }}</span>
                            </template>
                            <template v-slot:description>
                                <span class="text-small color-cool-gray-100">{{ card.detail }}</span>
                            </template>
                        </cly-metric-card>
                    </cly-metric-cards>
                </cly-section>

                <!-- Lag History Chart -->
                <cly-section v-if="lagHistory.length > 0" title="Lag History" tooltip="Consumer lag over time (last 100 snapshots, updated every 2 minutes)">
                    <cly-chart-line
                        :option="lagChartOption"
                        :height="400"
                        :show-zoom="true"
                        :show-download="true"
                        xAxisLabelOverflow="unset"
                    >
                    </cly-chart-line>
                </cly-section>

                <!-- Consumer Groups Table -->
                <cly-section v-if="kafkaConsumers.length > 0" title="Consumer Groups" tooltip="Per-consumer-group health statistics including lag, rebalances, and errors">
                    <cly-datatable-n :rows="kafkaConsumers" :resizable="true" :force-loading="isLoading">
                        <template v-slot="scope">
                            <el-table-column column-key="groupId" prop="groupId" sortable="custom" label="Group ID" min-width="180">
                                <template v-slot="rowScope">
                                    <span class="text-medium font-weight-bold">{{ rowScope.row.groupId }}</span>
                                </template>
                            </el-table-column>
                            <el-table-column column-key="totalLag" prop="totalLag" sortable="custom" label="Total Lag" min-width="100">
                                <template v-slot="rowScope">
                                    <span :class="getLagClass(rowScope.row.totalLag)">{{ formatNumber(rowScope.row.totalLag) }}</span>
                                </template>
                            </el-table-column>
                            <el-table-column column-key="rebalanceCount" prop="rebalanceCount" sortable="custom" label="Rebalances" min-width="100">
                                <template v-slot="rowScope">
                                    <span>{{ rowScope.row.rebalanceCount || 0 }}</span>
                                </template>
                            </el-table-column>
                            <el-table-column column-key="lastRebalanceAt" prop="lastRebalanceAt" sortable="custom" label="Last Rebalance" min-width="160">
                                <template v-slot="rowScope">
                                    <span>{{ formatDate(rowScope.row.lastRebalanceAt) }}</span>
                                </template>
                            </el-table-column>
                            <el-table-column column-key="commitCount" prop="commitCount" sortable="custom" label="Commits" min-width="100">
                                <template v-slot="rowScope">
                                    <span>{{ formatNumber(rowScope.row.commitCount || 0) }}</span>
                                </template>
                            </el-table-column>
                            <el-table-column column-key="lastCommitAt" prop="lastCommitAt" sortable="custom" label="Last Commit" min-width="160">
                                <template v-slot="rowScope">
                                    <span>{{ formatDate(rowScope.row.lastCommitAt) }}</span>
                                </template>
                            </el-table-column>
                            <el-table-column column-key="errorCount" prop="errorCount" sortable="custom" label="Errors" min-width="80">
                                <template v-slot="rowScope">
                                    <span :class="getErrorClass(rowScope.row.errorCount)">{{ rowScope.row.errorCount || 0 }}</span>
                                </template>
                            </el-table-column>
                            <el-table-column column-key="lastErrorMessage" prop="lastErrorMessage" label="Last Error" min-width="200">
                                <template v-slot="rowScope">
                                    <div v-if="rowScope.row.lastErrorMessage" class="has-ellipsis" v-tooltip="{content: rowScope.row.lastErrorMessage}">
                                        <span class="text-small color-red-100">{{ rowScope.row.lastErrorMessage }}</span>
                                    </div>
                                    <span v-else class="color-cool-gray-50">-</span>
                                </template>
                            </el-table-column>
                            <el-table-column column-key="lagUpdatedAt" prop="lagUpdatedAt" sortable="custom" label="Lag Updated" min-width="160">
                                <template v-slot="rowScope">
                                    <span>{{ formatDate(rowScope.row.lagUpdatedAt) }}</span>
                                </template>
                            </el-table-column>
                        </template>
                    </cly-datatable-n>
                </cly-section>

                <!-- Consumer Group Processing Stats Table -->
                <cly-section v-if="kafkaPartitions.length > 0" title="Consumer Group Processing Stats" tooltip="Batch processing and deduplication statistics per consumer group">
                    <cly-datatable-n :rows="kafkaPartitions" :resizable="true" :force-loading="isLoading">
                        <template v-slot="scope">
                            <el-table-column column-key="consumerGroup" prop="consumerGroup" sortable="custom" label="Consumer Group" min-width="150">
                            </el-table-column>
                            <el-table-column column-key="topic" prop="topic" sortable="custom" label="Topic" min-width="180">
                            </el-table-column>
                            <el-table-column column-key="partitionCount" prop="partitionCount" sortable="custom" label="Partitions" min-width="100">
                                <template v-slot="rowScope">
                                    <span>{{ rowScope.row.activePartitions || 0 }} / {{ rowScope.row.partitionCount || 0 }}</span>
                                </template>
                            </el-table-column>
                            <el-table-column column-key="batchCount" prop="batchCount" sortable="custom" label="Batches" min-width="100">
                                <template v-slot="rowScope">
                                    <span>{{ formatNumber(rowScope.row.batchCount) }}</span>
                                </template>
                            </el-table-column>
                            <el-table-column column-key="duplicatesSkipped" prop="duplicatesSkipped" sortable="custom" label="Dedup" min-width="80">
                                <template v-slot="rowScope">
                                    <span :class="rowScope.row.duplicatesSkipped > 0 ? 'color-yellow-100' : ''">{{ rowScope.row.duplicatesSkipped || 0 }}</span>
                                </template>
                            </el-table-column>
                            <el-table-column column-key="avgBatchSize" prop="avgBatchSize" sortable="custom" label="Avg Batch" min-width="100">
                                <template v-slot="rowScope">
                                    <span>{{ rowScope.row.avgBatchSize || '-' }}</span>
                                </template>
                            </el-table-column>
                            <el-table-column column-key="lastBatchSize" prop="lastBatchSize" sortable="custom" label="Last Batch" min-width="100">
                                <template v-slot="rowScope">
                                    <span>{{ rowScope.row.lastBatchSize || '-' }}</span>
                                </template>
                            </el-table-column>
                            <el-table-column column-key="lastProcessedAt" prop="lastProcessedAt" sortable="custom" label="Last Processed" min-width="160">
                                <template v-slot="rowScope">
                                    <span>{{ formatDate(rowScope.row.lastProcessedAt) }}</span>
                                </template>
                            </el-table-column>
                        </template>
                    </cly-datatable-n>
                </cly-section>
            </template>

            <!-- No Kafka data message -->
            <cly-section v-if="hasFetched && !hasKafkaData" title="Kafka Consumer Stats">
                <div class="bu-has-text-centered bu-p-5 color-cool-gray-50">
                    <i class="el-icon-info bu-mr-2"></i>
                    <span>Kafka consumer stats not available. Kafka may not be enabled or no data has been collected yet.</span>
                </div>
            </cly-section>

            <!-- Change Stream Aggregator Section -->
            <cly-section v-if="hasFetched && hasAggregatorData" title="Change Stream Aggregator Status" tooltip="Resume token status for MongoDB change stream based event processing">
                <cly-datatable-n :rows="aggregatorRows" :resizable="true" :force-loading="isLoading">
                    <template v-slot="scope">
                        <el-table-column column-key="name" prop="name" sortable="custom" :label="i18n('common.name')"></el-table-column>
                        <el-table-column column-key="last_cd" prop="last_cd" sortable="custom" label="Acknowledged">
                            <template v-slot="rowScope">
                                <span>{{ formatDate(rowScope.row.last_cd) }}</span>
                            </template>
                        </el-table-column>
                        <el-table-column column-key="drill" prop="drill" sortable="custom" label="Drill">
                            <template v-slot="rowScope">
                                <span>{{ formatDate(rowScope.row.drill) }}</span>
                            </template>
                        </el-table-column>
                        <el-table-column column-key="diffDrill" prop="diffDrill" sortable="custom" label="Diff(drill)">
                            <template v-slot="rowScope">
                                <span>{{ formatDuration(rowScope.row.diffDrill) }}</span>
                            </template>
                        </el-table-column>
                        <el-table-column column-key="diff" prop="diff" sortable="custom" label="Diff(now)">
                            <template v-slot="rowScope">
                                <span>{{ formatDuration(rowScope.row.diff) }}</span>
                            </template>
                        </el-table-column>
                    </template>
                </cly-datatable-n>
            </cly-section>
        </cly-main>
    </div>
</template>

<script>
import countlyVue from '../../../javascripts/countly/vue/core.js';
import countlyCommon from '../../../javascripts/countly/countly.common.js';
import moment from 'moment';
import { service } from '../store/index.js';

import ClyMain from '../../../javascripts/components/layout/cly-main.vue';
import ClySection from '../../../javascripts/components/layout/cly-section.vue';
import ClyMetricCards from '../../../javascripts/components/helpers/cly-metric-cards.vue';
import ClyMetricCard from '../../../javascripts/components/helpers/cly-metric-card.vue';
import ClyTooltipIcon from '../../../javascripts/components/helpers/cly-tooltip-icon.vue';
import ClyChartLine from '../../../javascripts/components/echart/cly-chart-line.vue';
import ClyDatatableN from '../../../javascripts/components/datatable/cly-datatable-n.vue';

export default {
    components: {
        ClyMain,
        ClySection,
        ClyMetricCards,
        ClyMetricCard,
        ClyTooltipIcon,
        ClyChartLine,
        ClyDatatableN
    },
    mixins: [countlyVue.mixins.i18n],
    data: function() {
        return {
            isLoading: false,
            hasFetched: false,
            aggregatorData: [],
            kafkaEnabled: false,
            kafkaSummary: {},
            kafkaPartitions: [],
            kafkaConsumers: [],
            lagHistory: [],
            activeSection: 'overview'
        };
    },
    mounted: function() {
        this.fetchData();
    },
    methods: {
        refresh: function() {
            this.fetchData();
        },
        fetchData: function() {
            this.isLoading = true;
            var self = this;

            var aggregatorPromise = service.fetchAggregatorStatus()
                .then(function(data) {
                    self.aggregatorData = data || [];
                })
                .catch(function() {
                    self.aggregatorData = [];
                });

            var kafkaPromise = service.fetchKafkaStatus()
                .then(function(data) {
                    if (data && (data.partitions || data.consumers)) {
                        self.kafkaEnabled = true;
                        self.kafkaSummary = data.summary || {};
                        self.kafkaPartitions = data.partitions || [];
                        self.kafkaConsumers = data.consumers || [];
                        self.lagHistory = data.lagHistory || [];
                    }
                    else {
                        self.kafkaEnabled = false;
                        self.lagHistory = [];
                    }
                })
                .catch(function() {
                    self.kafkaEnabled = false;
                    self.lagHistory = [];
                });

            Promise.all([aggregatorPromise, kafkaPromise]).finally(function() {
                self.hasFetched = true;
                self.isLoading = false;
            });
        },
        formatDate: function(val) {
            if (!val) {
                return 'N/A';
            }
            var ms = typeof val === 'string' ? Date.parse(val) : Number(val);
            if (String(ms).length === 10) {
                ms *= 1000;
            }
            if (!ms || isNaN(ms)) {
                return 'N/A';
            }
            return moment(ms).format('DD-MM-YYYY HH:mm:ss');
        },
        formatNumber: function(val) {
            if (val === undefined || val === null) {
                return '0';
            }
            return countlyCommon.formatNumber ? countlyCommon.formatNumber(val) : val.toLocaleString();
        },
        formatDuration: function(seconds) {
            if (!seconds || seconds < 0) {
                return 'N/A';
            }
            if (seconds < 60) {
                return Math.round(seconds) + 's';
            }
            if (seconds < 3600) {
                return Math.round(seconds / 60) + 'm';
            }
            if (seconds < 86400) {
                return Math.round(seconds / 3600) + 'h';
            }
            return Math.round(seconds / 86400) + 'd';
        },
        getLagClass: function(lag) {
            if (!lag || lag === 0) {
                return 'color-green-100';
            }
            if (lag < 1000) {
                return 'color-green-100';
            }
            if (lag < 10000) {
                return 'color-yellow-100';
            }
            return 'color-red-100';
        },
        getErrorClass: function(errorCount) {
            if (!errorCount || errorCount === 0) {
                return 'color-green-100';
            }
            if (errorCount < 5) {
                return 'color-yellow-100';
            }
            return 'color-red-100';
        }
    },
    computed: {
        aggregatorRows: function() {
            return this.aggregatorData;
        },
        summaryCards: function() {
            var summary = this.kafkaSummary || {};
            return [
                {
                    title: 'Total Lag',
                    value: this.formatNumber(summary.totalLag || 0),
                    detail: 'Messages behind',
                    tooltip: 'Total number of messages waiting to be processed across all consumer groups',
                    numberClass: this.getLagClass(summary.totalLag)
                },
                {
                    title: 'Batches Processed',
                    value: this.formatNumber(summary.totalBatchesProcessed || 0),
                    detail: 'Since last TTL cleanup',
                    tooltip: 'Total batches successfully processed by all consumers',
                    numberClass: 'color-cool-gray-100'
                },
                {
                    title: 'Duplicates Skipped',
                    value: this.formatNumber(summary.totalDuplicatesSkipped || 0),
                    detail: 'Batches deduplicated',
                    tooltip: 'Number of batches skipped due to rebalance deduplication',
                    numberClass: summary.totalDuplicatesSkipped > 0 ? 'color-yellow-100' : 'color-green-100'
                },
                {
                    title: 'Avg Batch Size',
                    value: this.formatNumber(summary.avgBatchSizeOverall || 0),
                    detail: 'Events per batch',
                    tooltip: 'Average number of events processed per batch',
                    numberClass: 'color-cool-gray-100'
                },
                {
                    title: 'Rebalances',
                    value: this.formatNumber(summary.totalRebalances || 0),
                    detail: 'In last 7 days',
                    tooltip: 'Number of consumer group rebalances (should be low)',
                    numberClass: summary.totalRebalances > 10 ? 'color-yellow-100' : 'color-green-100'
                },
                {
                    title: 'Errors',
                    value: this.formatNumber(summary.totalErrors || 0),
                    detail: 'In last 7 days',
                    tooltip: 'Number of errors recorded by consumers',
                    numberClass: this.getErrorClass(summary.totalErrors)
                }
            ];
        },
        hasKafkaData: function() {
            return this.kafkaEnabled && (this.kafkaPartitions.length > 0 || this.kafkaConsumers.length > 0);
        },
        hasAggregatorData: function() {
            return this.aggregatorData && this.aggregatorData.length > 0;
        },
        lagChartOption: function() {
            if (!this.lagHistory || this.lagHistory.length === 0) {
                return {};
            }

            var groupIds = [];
            this.lagHistory.forEach(function(snapshot) {
                (snapshot.groups || []).forEach(function(g) {
                    if (groupIds.indexOf(g.groupId) === -1) {
                        groupIds.push(g.groupId);
                    }
                });
            });

            var self = this;
            var xAxisData = this.lagHistory.map(function(snapshot) {
                if (!snapshot.ts) {
                    return '';
                }
                var date = new Date(snapshot.ts);
                return moment(date).format('HH:mm');
            });
            var totalPoints = xAxisData.length;
            var maxVisibleLabels = 12;
            var labelStep = totalPoints > maxVisibleLabels ? Math.floor(Math.ceil(totalPoints / maxVisibleLabels)) : 1;
            var axisLabelOptions = {
                rotate: 0,
                fontSize: 10,
                interval: 0,
            };
            if (totalPoints > 16) {
                axisLabelOptions.rotate = 60;
            }
            else if (totalPoints > 8) {
                axisLabelOptions.rotate = 45;
            }
            if (labelStep > 1) {
                var lastIndex = totalPoints - 1;
                axisLabelOptions.interval = function(index) {
                    if (index === lastIndex) {
                        return true;
                    }
                    return index % labelStep === 0;
                };
            }

            var series = groupIds.map(function(groupId, index) {
                var data = self.lagHistory.map(function(snapshot) {
                    var group = (snapshot.groups || []).find(function(g) {
                        return g.groupId === groupId;
                    });
                    return group ? group.totalLag : 0;
                });
                var color = countlyCommon.GRAPH_COLORS[index % countlyCommon.GRAPH_COLORS.length];
                return {
                    name: groupId.replace('cly_', ''),
                    type: 'line',
                    data: data,
                    smooth: true,
                    showSymbol: false,
                    lineStyle: {
                        width: 2,
                        color: color
                    },
                    itemStyle: {
                        color: color
                    }
                };
            });

            return {
                grid: {
                    top: 40,
                    bottom: 40,
                    left: 60,
                    right: 180,
                    containLabel: true
                },
                legend: {
                    show: true,
                    type: 'scroll',
                    orient: 'vertical',
                    right: 10,
                    top: 'middle',
                    itemGap: 8,
                    itemWidth: 14,
                    itemHeight: 8,
                    textStyle: {
                        fontSize: 11,
                        color: '#333C48'
                    },
                    icon: 'roundRect',
                    pageButtonItemGap: 5,
                    pageButtonGap: 10,
                    pageIconSize: 12
                },
                tooltip: {
                    trigger: 'axis',
                    axisPointer: { type: 'cross' }
                },
                xAxis: {
                    type: 'category',
                    data: xAxisData,
                    axisLabel: axisLabelOptions
                },
                yAxis: {
                    type: 'value',
                    name: 'Lag (messages)',
                    axisLabel: {
                        formatter: function(value) {
                            return value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value;
                        }
                    }
                },
                series: series,
                color: countlyCommon.GRAPH_COLORS
            };
        }
    }
};
</script>
