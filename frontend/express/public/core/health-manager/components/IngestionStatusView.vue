<template>
    <div v-bind:class="[componentId]" class="ingestion-status-view">
        <cly-main>
            <!-- Loading state -->
            <div v-if="isLoading && !hasFetched" v-loading="true" class="bu-p-5" style="min-height: 200px;">
            </div>

            <!-- ClickHouse Consumer Section -->
            <template v-if="hasFetched">
                <!-- Connect monitoring not enabled -->
                <cly-section v-if="!connectEnabled" title="ClickHouse Consumer" tooltip="Kafka Connect sink status and lag for ClickHouse data pipeline">
                    <div class="bu-has-text-centered bu-p-5 color-cool-gray-50">
                        <i class="el-icon-warning-outline bu-mr-2"></i>
                        <span>ClickHouse consumer monitoring is not enabled. Set <code>kafka.connectApiUrl</code> in config to enable.</span>
                    </div>
                </cly-section>

                <!-- Connect Summary Cards (only if enabled) -->
                <template v-if="connectEnabled">
                    <cly-section title="ClickHouse Consumer" tooltip="Kafka Connect sink status and lag for ClickHouse data pipeline">
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
                    <cly-section v-if="throughputHistory.length > 0" title="Sink Lag History" tooltip="ClickHouse sink consumer lag over time (last 100 snapshots)">
                        <cly-chart-line
                            :option="throughputChartOption"
                            :height="300"
                            :show-zoom="true"
                            :show-download="true">
                        </cly-chart-line>
                    </cly-section>

                    <!-- Connectors Table -->
                    <cly-section v-if="hasConnectorData" title="Connectors" tooltip="Kafka Connect connector status and task health">
                        <cly-datatable-n :rows="connectors" :resizable="true" :force-loading="isLoading">
                            <template v-slot="scope">
                                <el-table-column column-key="connectorName" prop="connectorName" sortable="custom" label="Connector" min-width="200">
                                    <template v-slot="rowScope">
                                        <span class="text-medium font-weight-bold">{{ rowScope.row.connectorName }}</span>
                                    </template>
                                </el-table-column>
                                <el-table-column column-key="connectorState" prop="connectorState" sortable="custom" label="State" min-width="100">
                                    <template v-slot="rowScope">
                                        <span :class="getConnectorStateClass(rowScope.row.connectorState)">
                                            {{ rowScope.row.connectorState }}
                                        </span>
                                    </template>
                                </el-table-column>
                                <el-table-column column-key="connectorType" prop="connectorType" sortable="custom" label="Type" min-width="100">
                                    <template v-slot="rowScope">
                                        <span>{{ rowScope.row.connectorType }}</span>
                                    </template>
                                </el-table-column>
                                <el-table-column column-key="tasks" prop="tasksRunning" sortable="custom" label="Tasks" min-width="100">
                                    <template v-slot="rowScope">
                                        <span :class="rowScope.row.tasksRunning === rowScope.row.tasksTotal ? 'color-green-100' : 'color-yellow-100'">
                                            {{ rowScope.row.tasksRunning }} / {{ rowScope.row.tasksTotal }}
                                        </span>
                                    </template>
                                </el-table-column>
                                <el-table-column column-key="workerId" prop="workerId" label="Worker" min-width="200">
                                    <template v-slot="rowScope">
                                        <span class="text-small">{{ rowScope.row.workerId || '-' }}</span>
                                    </template>
                                </el-table-column>
                                <el-table-column column-key="updatedAt" prop="updatedAt" sortable="custom" label="Last Update" min-width="160">
                                    <template v-slot="rowScope">
                                        <span>{{ formatDate(rowScope.row.updatedAt) }}</span>
                                    </template>
                                </el-table-column>
                            </template>
                        </cly-datatable-n>
                    </cly-section>

                    <!-- No Connector data message (enabled but no data yet) -->
                    <cly-section v-if="!hasConnectorData" title="Connectors">
                        <div class="bu-has-text-centered bu-p-5 color-cool-gray-50">
                            <i class="el-icon-info bu-mr-2"></i>
                            <span>No connector data available yet. Data will appear after the next lag monitor job runs.</span>
                        </div>
                    </cly-section>
                </template>
            </template>
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
            connectStatus: {},
            connectors: [],
            throughputHistory: []
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

            Promise.resolve(service.fetchKafkaStatus())
                .then(function(data) {
                    if (data) {
                        self.connectStatus = data.connectStatus || {};
                        self.connectors = (data.connectStatus && data.connectStatus.connectors) || [];
                        self.throughputHistory = (data.lagHistory || []).map(function(snapshot) {
                            return {
                                ts: snapshot.ts,
                                connectLag: snapshot.connectLag || 0
                            };
                        });
                    }
                })
                .catch(function() {
                    self.connectors = [];
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
                    title: 'Sink Lag',
                    value: this.formatNumber(status.sinkLag || 0),
                    detail: 'Messages behind',
                    tooltip: 'Consumer lag for Kafka Connect ClickHouse sink (connect-ch group)',
                    numberClass: this.getLagClass(status.sinkLag)
                },
                {
                    title: 'Connectors',
                    value: runningConnectors + ' / ' + connectors.length + ' running',
                    detail: 'Active connectors',
                    tooltip: 'Number of connectors in RUNNING state',
                    numberClass: runningConnectors === connectors.length && connectors.length > 0
                        ? 'color-green-100'
                        : 'color-yellow-100'
                },
                {
                    title: 'Tasks',
                    value: runningTasks + ' / ' + totalTasks + ' running',
                    detail: 'Active tasks',
                    tooltip: 'Number of connector tasks in RUNNING state',
                    numberClass: runningTasks === totalTasks && totalTasks > 0
                        ? 'color-green-100'
                        : 'color-yellow-100'
                },
                {
                    title: 'Last Updated',
                    value: this.formatDate(status.sinkLagUpdatedAt),
                    detail: 'Lag check time',
                    tooltip: 'When the sink lag was last updated by the monitoring job',
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
                    name: 'Sink Lag',
                    axisLabel: {
                        formatter: function(value) {
                            return value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value;
                        }
                    }
                },
                series: [{
                    name: 'ClickHouse Sink Lag',
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
