<template>
    <div v-bind:class="[componentId]" class="ingestion-status-view">
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

            <!-- ClickHouse Consumer Section -->
            <template v-if="hasFetched">
                <!-- Connect monitoring not enabled -->
                <cly-section v-if="!connectEnabled && sinkConsumers.length === 0" :title="i18n('ingestion-status.clickhouse-consumer.title')" :tooltip="i18n('ingestion-status.clickhouse-consumer.tooltip')">
                    <div class="bu-has-text-centered bu-p-5 color-cool-gray-50">
                        <i class="el-icon-warning-outline bu-mr-2"></i>
                        <span>{{ i18n('ingestion-status.not-enabled') }}</span>
                    </div>
                </cly-section>

                <!-- Connect Summary Cards (only if enabled) -->
                <template v-if="connectEnabled">
                    <cly-section :title="i18n('ingestion-status.clickhouse-consumer.title')" :tooltip="i18n('ingestion-status.clickhouse-consumer.tooltip')">
                        <cly-metric-cards :multiline="true">
                            <cly-metric-card
                                v-for="card in connectSummaryCards"
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

                    <!-- Sink Lag History Chart -->
                    <cly-section v-if="throughputHistory.length > 0" :title="i18n('ingestion-status.lag-history.title')" :tooltip="i18n('ingestion-status.lag-history.tooltip')">
                        <cly-chart-line
                            :option="throughputChartOption"
                            :height="300"
                            :show-zoom="true"
                            :show-download="true">
                        </cly-chart-line>
                    </cly-section>

                    <!-- Connectors Table -->
                    <cly-section v-if="hasConnectorData" :title="i18n('ingestion-status.connectors.title')" :tooltip="i18n('ingestion-status.connectors.tooltip')">
                        <cly-datatable-n :rows="connectors" :resizable="true" :force-loading="isLoading">
                            <template v-slot="scope">
                                <el-table-column column-key="connectorName" prop="connectorName" sortable="custom" :label="i18n('ingestion-status.table.connector')" min-width="200">
                                    <template v-slot="rowScope">
                                        <span class="text-medium font-weight-bold">{{ rowScope.row.connectorName }}</span>
                                    </template>
                                </el-table-column>
                                <el-table-column column-key="connectorState" prop="connectorState" sortable="custom" :label="i18n('ingestion-status.table.state')" min-width="100">
                                    <template v-slot="rowScope">
                                        <span :class="getConnectorStateClass(rowScope.row.connectorState)">
                                            {{ rowScope.row.connectorState }}
                                        </span>
                                    </template>
                                </el-table-column>
                                <el-table-column column-key="connectorType" prop="connectorType" sortable="custom" :label="i18n('ingestion-status.table.type')" min-width="100">
                                    <template v-slot="rowScope">
                                        <span>{{ rowScope.row.connectorType }}</span>
                                    </template>
                                </el-table-column>
                                <el-table-column column-key="tasks" prop="tasksRunning" sortable="custom" :label="i18n('ingestion-status.table.tasks')" min-width="100">
                                    <template v-slot="rowScope">
                                        <span :class="rowScope.row.tasksRunning === rowScope.row.tasksTotal ? 'color-green-100' : 'color-yellow-100'">
                                            {{ rowScope.row.tasksRunning }} / {{ rowScope.row.tasksTotal }}
                                        </span>
                                    </template>
                                </el-table-column>
                                <el-table-column column-key="workerId" prop="workerId" :label="i18n('ingestion-status.table.worker')" min-width="200">
                                    <template v-slot="rowScope">
                                        <span class="text-small">{{ rowScope.row.workerId || '-' }}</span>
                                    </template>
                                </el-table-column>
                                <el-table-column column-key="updatedAt" prop="updatedAt" sortable="custom" :label="i18n('ingestion-status.table.last-update')" min-width="160">
                                    <template v-slot="rowScope">
                                        <span>{{ formatDate(rowScope.row.updatedAt) }}</span>
                                    </template>
                                </el-table-column>
                            </template>
                        </cly-datatable-n>
                    </cly-section>

                    <!-- No Connector data message (enabled but no data yet) -->
                    <cly-section v-if="!hasConnectorData" :title="i18n('ingestion-status.connectors.title')">
                        <div class="bu-has-text-centered bu-p-5 color-cool-gray-50">
                            <i class="el-icon-info bu-mr-2"></i>
                            <span>{{ i18n('ingestion-status.connectors.no-data') }}</span>
                        </div>
                    </cly-section>

                    <!-- Sink Consumer Group Details -->
                    <cly-section v-if="sinkConsumers.length > 0" :title="i18n('ingestion-status.consumer-group.title')" :tooltip="i18n('ingestion-status.consumer-group.tooltip')">
                        <cly-datatable-n :rows="sinkConsumers" :resizable="true" :force-loading="isLoading">
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

                    <!-- Sink Processing Stats -->
                    <cly-section v-if="sinkPartitions.length > 0" :title="i18n('ingestion-status.processing-stats.title')" :tooltip="i18n('ingestion-status.processing-stats.tooltip')">
                        <cly-datatable-n :rows="sinkPartitions" :resizable="true" :force-loading="isLoading">
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
            </template>
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
            connectStatus: {},
            connectors: [],
            throughputHistory: [],
            sinkConsumers: [],
            sinkPartitions: []
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
            Promise.resolve(countlyHealthManager.fetchKafkaStatus())
                .then(function(data) {
                    if (data) {
                        self.connectStatus = data.connectStatus || {};
                        self.connectors = (data.connectStatus && data.connectStatus.connectors) || [];
                        self.throughputHistory = (data.lagHistory || []).map(function(snapshot) {
                            // Extract connect group lag from groups array
                            var connectGroup = (snapshot.groups || []).find(function(g) {
                                return g.groupId && g.groupId.indexOf('connect-clickhouse-sink') !== -1;
                            });
                            return {
                                ts: snapshot.ts,
                                connectLag: connectGroup ? (connectGroup.totalLag || 0) : 0
                            };
                        });
                        self.sinkConsumers = (data.consumers || []).filter(function(c) {
                            return c.groupId && c.groupId.indexOf('connect-clickhouse-sink') !== -1;
                        });
                        self.sinkPartitions = (data.partitions || []).filter(function(p) {
                            return p.consumerGroup && p.consumerGroup.indexOf('connect-clickhouse-sink') !== -1;
                        });
                    }
                })
                .catch(function() {
                    self.connectors = [];
                    self.sinkConsumers = [];
                    self.sinkPartitions = [];
                    self.hasError = true;
                })
                .finally(function() {
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
        getConnectorStateClass: function(state) {
            if (state === 'RUNNING') {
                return 'color-green-100';
            }
            if (state === 'PAUSED') {
                return 'color-yellow-100';
            }
            return 'color-red-100';
        },
        getLagClass: function(lag) {
            if (!lag || lag === 0) {
                return 'color-green-100';
            }
            if (lag < 1000) {
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
        hasConnectorData: function() {
            return this.connectors.length > 0;
        },
        connectEnabled: function() {
            return this.connectStatus && this.connectStatus.enabled;
        },
        connectSummaryCards: function() {
            var status = this.connectStatus || {};
            var connectors = this.connectors || [];
            var runningConnectors = connectors.filter(function(c) {
                return c.connectorState === 'RUNNING';
            }).length;
            var totalTasks = 0;
            var runningTasks = 0;
            connectors.forEach(function(c) {
                totalTasks += c.tasksTotal || 0;
                runningTasks += c.tasksRunning || 0;
            });

            return [
                {
                    title: this.i18n('ingestion-status.cards.sink-lag'),
                    value: this.formatNumber(status.sinkLag || 0),
                    detail: this.i18n('ingestion-status.cards.sink-lag.detail'),
                    tooltip: this.i18n('ingestion-status.cards.sink-lag.tooltip'),
                    numberClass: this.getLagClass(status.sinkLag)
                },
                {
                    title: this.i18n('ingestion-status.cards.connectors'),
                    value: runningConnectors + ' / ' + connectors.length + ' running',
                    detail: this.i18n('ingestion-status.cards.connectors.detail'),
                    tooltip: this.i18n('ingestion-status.cards.connectors.tooltip'),
                    numberClass: runningConnectors === connectors.length && connectors.length > 0
                        ? 'color-green-100'
                        : 'color-yellow-100'
                },
                {
                    title: this.i18n('ingestion-status.cards.tasks'),
                    value: runningTasks + ' / ' + totalTasks + ' running',
                    detail: this.i18n('ingestion-status.cards.tasks.detail'),
                    tooltip: this.i18n('ingestion-status.cards.tasks.tooltip'),
                    numberClass: runningTasks === totalTasks && totalTasks > 0
                        ? 'color-green-100'
                        : 'color-yellow-100'
                },
                {
                    title: this.i18n('ingestion-status.cards.last-updated'),
                    value: this.formatDate(status.sinkLagUpdatedAt),
                    detail: this.i18n('ingestion-status.cards.last-updated.detail'),
                    tooltip: this.i18n('ingestion-status.cards.last-updated.tooltip'),
                    numberClass: 'color-cool-gray-100'
                }
            ];
        },
        throughputChartOption: function() {
            if (!this.throughputHistory || this.throughputHistory.length === 0) {
                return {};
            }

            var xAxisData = this.throughputHistory.map(function(snapshot) {
                if (!snapshot.ts) {
                    return '';
                }
                return moment(new Date(snapshot.ts)).format('HH:mm');
            });

            var lagData = this.throughputHistory.map(function(snapshot) {
                return snapshot.connectLag || 0;
            });

            return {
                grid: {
                    top: 40,
                    bottom: 40,
                    left: 60,
                    right: 20,
                    containLabel: true
                },
                tooltip: {
                    trigger: 'axis',
                    axisPointer: { type: 'cross' }
                },
                xAxis: {
                    type: 'category',
                    data: xAxisData,
                    axisLabel: {
                        rotate: 45,
                        fontSize: 10
                    }
                },
                yAxis: {
                    type: 'value',
                    name: this.i18n('ingestion-status.chart.sink-lag-axis'),
                    axisLabel: {
                        formatter: function(value) {
                            return value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value;
                        }
                    }
                },
                series: [{
                    name: this.i18n('ingestion-status.chart.sink-lag-series'),
                    type: 'line',
                    data: lagData,
                    smooth: true,
                    showSymbol: false,
                    lineStyle: {
                        width: 2,
                        color: countlyCommon.GRAPH_COLORS[0]
                    },
                    itemStyle: {
                        color: countlyCommon.GRAPH_COLORS[0]
                    },
                    areaStyle: {
                        color: 'rgba(1, 102, 214, 0.1)'
                    }
                }],
                color: countlyCommon.GRAPH_COLORS
            };
        }
    }
};
</script>
