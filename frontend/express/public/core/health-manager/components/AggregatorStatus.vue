<template>
    <div v-bind:class="[componentId]" class="aggregator-status-view">
        <cly-main>
            <!-- Loading state -->
            <div v-if="isLoading && !hasFetched" v-loading="true" class="bu-p-5" style="min-height: 200px;">
            </div>

            <!-- Error state -->
            <cly-notification
                v-if="hasError && hasFetched"
                :text="i18n('health-manager.error.fetch-failed')"
                color="light-destructive"
                :closable="false"
                class="bu-mb-4"
            >
            </cly-notification>

            <!-- Kafka Stats Section -->
            <template v-if="hasFetched && hasKafkaData">
                <!-- Summary Cards -->
                <cly-section :title="i18n('aggregator-status.kafka-stats.title')" :tooltip="i18n('aggregator-status.kafka-stats.tooltip')">
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
                <cly-section v-if="aggregatorLagHistory.length > 0" :title="i18n('aggregator-status.lag-history.title')" :tooltip="i18n('aggregator-status.lag-history.tooltip')">
                    <cly-chart-line
                        :option="lagChartOption"
                        :height="400"
                        :show-zoom="true"
                        :show-download="true"
                        :noEmpty="true"
                        xAxisLabelOverflow="unset"
                    >
                    </cly-chart-line>
                </cly-section>

                <!-- Consumer Groups Table -->
                <cly-section v-if="aggregatorConsumers.length > 0" :title="i18n('aggregator-status.consumer-groups.title')" :tooltip="i18n('aggregator-status.consumer-groups.tooltip')">
                    <cly-datatable-n :rows="aggregatorConsumers" :resizable="true" :force-loading="isLoading">
                        <template v-slot="scope">
                            <el-table-column column-key="groupId" prop="groupId" sortable="custom" :label="i18n('aggregator-status.table.group-id')" min-width="180">
                                <template v-slot="rowScope">
                                    <span class="text-medium font-weight-bold">{{ rowScope.row.groupId }}</span>
                                </template>
                            </el-table-column>
                            <el-table-column column-key="totalLag" prop="totalLag" sortable="custom" :label="i18n('aggregator-status.table.total-lag')" min-width="100">
                                <template v-slot="rowScope">
                                    <span :class="getLagClass(rowScope.row.totalLag)">{{ formatNumber(rowScope.row.totalLag) }}</span>
                                </template>
                            </el-table-column>
                            <el-table-column column-key="rebalanceCount" prop="rebalanceCount" sortable="custom" :label="i18n('aggregator-status.table.rebalances')" min-width="100">
                                <template v-slot="rowScope">
                                    <span>{{ rowScope.row.rebalanceCount || 0 }}</span>
                                </template>
                            </el-table-column>
                            <el-table-column column-key="lastRebalanceAt" prop="lastRebalanceAt" sortable="custom" :label="i18n('aggregator-status.table.last-rebalance')" min-width="160">
                                <template v-slot="rowScope">
                                    <span>{{ formatDate(rowScope.row.lastRebalanceAt) }}</span>
                                </template>
                            </el-table-column>
                            <el-table-column column-key="commitCount" prop="commitCount" sortable="custom" :label="i18n('aggregator-status.table.commits')" min-width="100">
                                <template v-slot="rowScope">
                                    <span>{{ formatNumber(rowScope.row.commitCount || 0) }}</span>
                                </template>
                            </el-table-column>
                            <el-table-column column-key="lastCommitAt" prop="lastCommitAt" sortable="custom" :label="i18n('aggregator-status.table.last-commit')" min-width="160">
                                <template v-slot="rowScope">
                                    <span>{{ formatDate(rowScope.row.lastCommitAt) }}</span>
                                </template>
                            </el-table-column>
                            <el-table-column column-key="errorCount" prop="errorCount" sortable="custom" :label="i18n('aggregator-status.table.errors')" min-width="80">
                                <template v-slot="rowScope">
                                    <span :class="getErrorClass(rowScope.row.errorCount)">{{ rowScope.row.errorCount || 0 }}</span>
                                </template>
                            </el-table-column>
                            <el-table-column column-key="lastErrorMessage" prop="lastErrorMessage" :label="i18n('aggregator-status.table.last-error')" min-width="200">
                                <template v-slot="rowScope">
                                    <div v-if="rowScope.row.lastErrorMessage" class="has-ellipsis" v-tooltip="{content: rowScope.row.lastErrorMessage}">
                                        <span class="text-small color-red-100">{{ rowScope.row.lastErrorMessage }}</span>
                                    </div>
                                    <span v-else class="color-cool-gray-50">-</span>
                                </template>
                            </el-table-column>
                            <el-table-column column-key="lagUpdatedAt" prop="lagUpdatedAt" sortable="custom" :label="i18n('aggregator-status.table.lag-updated')" min-width="160">
                                <template v-slot="rowScope">
                                    <span>{{ formatDate(rowScope.row.lagUpdatedAt) }}</span>
                                </template>
                            </el-table-column>
                        </template>
                    </cly-datatable-n>
                </cly-section>

                <!-- Consumer Group Processing Stats Table -->
                <cly-section v-if="aggregatorPartitions.length > 0" :title="i18n('aggregator-status.processing-stats.title')" :tooltip="i18n('aggregator-status.processing-stats.tooltip')">
                    <cly-datatable-n :rows="aggregatorPartitions" :resizable="true" :force-loading="isLoading">
                        <template v-slot="scope">
                            <el-table-column column-key="consumerGroup" prop="consumerGroup" sortable="custom" :label="i18n('aggregator-status.table.consumer-group')" min-width="150">
                            </el-table-column>
                            <el-table-column column-key="topic" prop="topic" sortable="custom" :label="i18n('aggregator-status.table.topic')" min-width="180">
                            </el-table-column>
                            <el-table-column column-key="partitionCount" prop="partitionCount" sortable="custom" :label="i18n('aggregator-status.table.partitions')" min-width="100">
                                <template v-slot="rowScope">
                                    <span>{{ rowScope.row.activePartitions || 0 }} / {{ rowScope.row.partitionCount || 0 }}</span>
                                </template>
                            </el-table-column>
                            <el-table-column column-key="batchCount" prop="batchCount" sortable="custom" :label="i18n('aggregator-status.table.batches')" min-width="100">
                                <template v-slot="rowScope">
                                    <span>{{ formatNumber(rowScope.row.batchCount) }}</span>
                                </template>
                            </el-table-column>
                            <el-table-column column-key="duplicatesSkipped" prop="duplicatesSkipped" sortable="custom" :label="i18n('aggregator-status.table.dedup')" min-width="80">
                                <template v-slot="rowScope">
                                    <span :class="rowScope.row.duplicatesSkipped > 0 ? 'color-yellow-100' : ''">{{ rowScope.row.duplicatesSkipped || 0 }}</span>
                                </template>
                            </el-table-column>
                            <el-table-column column-key="avgBatchSize" prop="avgBatchSize" sortable="custom" :label="i18n('aggregator-status.table.avg-batch')" min-width="100">
                                <template v-slot="rowScope">
                                    <span>{{ rowScope.row.avgBatchSize || '-' }}</span>
                                </template>
                            </el-table-column>
                            <el-table-column column-key="lastBatchSize" prop="lastBatchSize" sortable="custom" :label="i18n('aggregator-status.table.last-batch')" min-width="100">
                                <template v-slot="rowScope">
                                    <span>{{ rowScope.row.lastBatchSize || '-' }}</span>
                                </template>
                            </el-table-column>
                            <el-table-column column-key="lastProcessedAt" prop="lastProcessedAt" sortable="custom" :label="i18n('aggregator-status.table.last-processed')" min-width="160">
                                <template v-slot="rowScope">
                                    <span>{{ formatDate(rowScope.row.lastProcessedAt) }}</span>
                                </template>
                            </el-table-column>
                        </template>
                    </cly-datatable-n>
                </cly-section>
            </template>

            <!-- No Kafka data message -->
            <cly-section v-if="hasFetched && !hasKafkaData" :title="i18n('aggregator-status.kafka-stats.title')">
                <div class="bu-has-text-centered bu-p-5 color-cool-gray-50">
                    <i class="el-icon-info bu-mr-2"></i>
                    <span>{{ i18n('aggregator-status.no-kafka') }}</span>
                </div>
            </cly-section>

            <!-- Change Stream Aggregator Section -->
            <cly-section v-if="hasFetched && hasAggregatorData" :title="i18n('aggregator-status.change-stream.title')" :tooltip="i18n('aggregator-status.change-stream.tooltip')">
                <cly-datatable-n :rows="aggregatorRows" :resizable="true" :force-loading="isLoading">
                    <template v-slot="scope">
                        <el-table-column column-key="name" prop="name" sortable="custom" :label="i18n('common.name')"></el-table-column>
                        <el-table-column column-key="last_cd" prop="last_cd" sortable="custom" :label="i18n('aggregator-status.table.acknowledged')">
                            <template v-slot="rowScope">
                                <span>{{ formatDate(rowScope.row.last_cd) }}</span>
                            </template>
                        </el-table-column>
                        <el-table-column column-key="drill" prop="drill" sortable="custom" :label="i18n('aggregator-status.table.drill')">
                            <template v-slot="rowScope">
                                <span>{{ formatDate(rowScope.row.drill) }}</span>
                            </template>
                        </el-table-column>
                        <el-table-column column-key="diffDrill" prop="diffDrill" sortable="custom" :label="i18n('aggregator-status.table.diff-drill')">
                            <template v-slot="rowScope">
                                <span>{{ formatDuration(rowScope.row.diffDrill) }}</span>
                            </template>
                        </el-table-column>
                        <el-table-column column-key="diff" prop="diff" sortable="custom" :label="i18n('aggregator-status.table.diff-now')">
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
import { i18nMixin } from '../../../javascripts/countly/vue/core.js';
import countlyCommon from '../../../javascripts/countly/countly.common.js';
import moment from 'moment';
import countlyHealthManager from '../store/index.js';

import ClyMain from '../../../javascripts/components/layout/cly-main.vue';
import ClySection from '../../../javascripts/components/layout/cly-section.vue';
import ClyMetricCards from '../../../javascripts/components/helpers/cly-metric-cards.vue';
import ClyMetricCard from '../../../javascripts/components/helpers/cly-metric-card.vue';
import ClyTooltipIcon from '../../../javascripts/components/helpers/cly-tooltip-icon.vue';
import ClyNotification from '../../../javascripts/components/helpers/cly-notification.vue';
import ClyChartLine from '../../../javascripts/components/echart/cly-chart-line.vue';
import ClyDatatableN from '../../../javascripts/components/datatable/cly-datatable-n.vue';

export default {
    components: {
        ClyMain,
        ClySection,
        ClyMetricCards,
        ClyMetricCard,
        ClyTooltipIcon,
        ClyNotification,
        ClyChartLine,
        ClyDatatableN
    },
    mixins: [i18nMixin],
    data: function() {
        return {
            isLoading: false,
            hasFetched: false,
            hasError: false,
            // Aggregator (change stream) data
            aggregatorData: [],
            // Kafka stats data
            kafkaEnabled: false,
            kafkaSummary: {},
            kafkaPartitions: [],
            kafkaConsumers: [],
            lagHistory: [],
            // UI state
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

            self.hasError = false;

            // Fetch aggregator (change stream) status
            var aggregatorPromise = Promise.resolve(countlyHealthManager.fetchAggregatorStatus())
                .then(function(data) {
                    self.aggregatorData = data || [];
                })
                .catch(function() {
                    self.aggregatorData = [];
                    self.hasError = true;
                });

            // Fetch Kafka stats
            var kafkaPromise = Promise.resolve(countlyHealthManager.fetchKafkaStatus())
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
                    self.hasError = true;
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
            var consumers = this.aggregatorConsumers;
            var partitions = this.aggregatorPartitions;
            var totalLag = consumers.reduce(function(acc, c) {
                return acc + (c.totalLag || 0);
            }, 0);
            var totalBatches = partitions.reduce(function(acc, p) {
                return acc + (p.batchCount || 0);
            }, 0);
            var totalDuplicates = partitions.reduce(function(acc, p) {
                return acc + (p.duplicatesSkipped || 0);
            }, 0);
            var avgBatchSize = partitions.length > 0
                ? Math.round(partitions.reduce(function(acc, p) {
                    return acc + (p.avgBatchSize || 0);
                }, 0) / partitions.length)
                : 0;
            var totalRebalances = consumers.reduce(function(acc, c) {
                return acc + (c.rebalanceCount || 0);
            }, 0);
            var totalErrors = consumers.reduce(function(acc, c) {
                return acc + (c.errorCount || 0);
            }, 0);
            return [
                {
                    title: this.i18n('aggregator-status.cards.total-lag'),
                    value: this.formatNumber(totalLag),
                    detail: this.i18n('aggregator-status.cards.total-lag.detail'),
                    tooltip: this.i18n('aggregator-status.cards.total-lag.tooltip'),
                    numberClass: this.getLagClass(totalLag)
                },
                {
                    title: this.i18n('aggregator-status.cards.batches'),
                    value: this.formatNumber(totalBatches),
                    detail: this.i18n('aggregator-status.cards.batches.detail'),
                    tooltip: this.i18n('aggregator-status.cards.batches.tooltip'),
                    numberClass: 'color-cool-gray-100'
                },
                {
                    title: this.i18n('aggregator-status.cards.duplicates'),
                    value: this.formatNumber(totalDuplicates),
                    detail: this.i18n('aggregator-status.cards.duplicates.detail'),
                    tooltip: this.i18n('aggregator-status.cards.duplicates.tooltip'),
                    numberClass: totalDuplicates > 0 ? 'color-yellow-100' : 'color-green-100'
                },
                {
                    title: this.i18n('aggregator-status.cards.avg-batch'),
                    value: this.formatNumber(avgBatchSize),
                    detail: this.i18n('aggregator-status.cards.avg-batch.detail'),
                    tooltip: this.i18n('aggregator-status.cards.avg-batch.tooltip'),
                    numberClass: 'color-cool-gray-100'
                },
                {
                    title: this.i18n('aggregator-status.cards.rebalances'),
                    value: this.formatNumber(totalRebalances),
                    detail: this.i18n('aggregator-status.cards.rebalances.detail'),
                    tooltip: this.i18n('aggregator-status.cards.rebalances.tooltip'),
                    numberClass: totalRebalances > 10 ? 'color-yellow-100' : 'color-green-100'
                },
                {
                    title: this.i18n('aggregator-status.cards.errors'),
                    value: this.formatNumber(totalErrors),
                    detail: this.i18n('aggregator-status.cards.errors.detail'),
                    tooltip: this.i18n('aggregator-status.cards.errors.tooltip'),
                    numberClass: this.getErrorClass(totalErrors)
                }
            ];
        },
        hasKafkaData: function() {
            return this.kafkaEnabled && (this.aggregatorPartitions.length > 0 || this.aggregatorConsumers.length > 0);
        },
        hasAggregatorData: function() {
            return this.aggregatorData && this.aggregatorData.length > 0;
        },
        aggregatorConsumers: function() {
            return (this.kafkaConsumers || []).filter(function(c) {
                return !c.groupId || c.groupId.indexOf('connect-clickhouse-sink') === -1;
            });
        },
        aggregatorPartitions: function() {
            return (this.kafkaPartitions || []).filter(function(p) {
                return !p.consumerGroup || p.consumerGroup.indexOf('connect-clickhouse-sink') === -1;
            });
        },
        aggregatorLagHistory: function() {
            return (this.lagHistory || []).map(function(snapshot) {
                return {
                    ts: snapshot.ts,
                    groups: (snapshot.groups || []).filter(function(g) {
                        return !g.groupId || g.groupId.indexOf('connect-clickhouse-sink') === -1;
                    })
                };
            });
        },
        lagChartOption: function() {
            if (!this.aggregatorLagHistory || this.aggregatorLagHistory.length === 0) {
                return {};
            }

            // Extract unique group IDs from all snapshots
            var groupIds = [];
            this.aggregatorLagHistory.forEach(function(snapshot) {
                (snapshot.groups || []).forEach(function(g) {
                    if (groupIds.indexOf(g.groupId) === -1) {
                        groupIds.push(g.groupId);
                    }
                });
            });

            // Build X-axis labels (timestamps)
            var self = this;
            var xAxisData = this.aggregatorLagHistory.map(function(snapshot) {
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

            // Build series for each consumer group with explicit colors
            var series = groupIds.map(function(groupId, index) {
                var data = self.aggregatorLagHistory.map(function(snapshot) {
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
                    name: this.i18n('aggregator-status.chart.lag-axis'),
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
