<template>
    <div class="kafka-events-view">
        <cly-main>
            <cly-section>
                <cly-datatable-n
                    ref="table"
                    :data-source="remoteTableDataSource"
                    :default-sort="{prop: 'ts', order: 'descending'}"
                    :force-loading="isLoading"
                    @row-click="handleTableRowClick"
                    :row-class-name="() => 'bu-is-clickable'">

                    <template v-slot:header-left>
                        <cly-select-x
                            test-id="event-type-select"
                            :search-placeholder="i18n('common.search')"
                            v-model="filters.eventType"
                            @change="onFilterChange"
                            :options="[{label: i18n('kafka-events.filters.all-event-types'), value: 'all'}].concat(filterOptions.eventTypes.map(function(t) { return {label: formatType(t), value: t}; }))">
                        </cly-select-x>
                        <cly-select-x
                            test-id="group-select"
                            class="bu-ml-2"
                            :search-placeholder="i18n('common.search')"
                            v-model="filters.groupId"
                            @change="onFilterChange"
                            :options="[{label: i18n('kafka-events.filters.all-groups'), value: 'all'}].concat(filterOptions.groupIds.map(function(g) { return {label: g, value: g}; }))">
                        </cly-select-x>
                        <cly-select-x
                            test-id="topic-select"
                            class="bu-ml-2"
                            :search-placeholder="i18n('common.search')"
                            v-model="filters.topic"
                            @change="onFilterChange"
                            :options="[{label: i18n('kafka-events.filters.all-topics'), value: 'all'}].concat(filterOptions.topics.map(function(t) { return {label: t, value: t}; }))">
                        </cly-select-x>
                    </template>

                    <template v-slot="scope">
                        <el-table-column type="expand">
                            <template slot-scope="rowScope">
                                <expand-row :row="rowScope.row"></expand-row>
                            </template>
                        </el-table-column>

                        <el-table-column sortable="custom" prop="ts" :label="i18n('kafka-events.table.timestamp')" width="170">
                            <template slot-scope="rowScope">
                                {{ formatDate(rowScope.row.ts) }}
                            </template>
                        </el-table-column>

                        <el-table-column sortable="custom" prop="type" :label="i18n('kafka-events.table.event-type')" width="200">
                            <template slot-scope="rowScope">
                                <span :class="['kafka-event-type', getSeverityBadgeClass(rowScope.row.type)]">
                                    <i :class="getSeverityIcon(rowScope.row.type)"></i>
                                    {{ formatType(rowScope.row.type) }}
                                </span>
                            </template>
                        </el-table-column>

                        <el-table-column sortable="custom" prop="groupId" :label="i18n('kafka-events.table.consumer-group')" width="180">
                        </el-table-column>

                        <el-table-column sortable="custom" prop="topic" :label="i18n('kafka-events.table.topic')" width="110">
                            <template slot-scope="rowScope">
                                {{ rowScope.row.topic || '-' }}
                            </template>
                        </el-table-column>

                        <el-table-column sortable="custom" prop="partition" :label="i18n('kafka-events.table.partition')" width="80">
                            <template slot-scope="rowScope">
                                {{ rowScope.row.partition !== null && rowScope.row.partition !== undefined ? rowScope.row.partition : '-' }}
                            </template>
                        </el-table-column>

                        <el-table-column prop="clusterId" :label="i18n('kafka-events.table.cluster-id')" width="130">
                            <template slot-scope="rowScope">
                                <span class="has-ellipsis" v-tooltip="{content: rowScope.row.clusterId}">
                                    {{ rowScope.row.clusterId || '-' }}
                                </span>
                            </template>
                        </el-table-column>

                        <el-table-column prop="details.message" :label="i18n('kafka-events.table.details')" min-width="300">
                            <template slot-scope="rowScope">
                                <div class="has-ellipsis" v-tooltip="{content: rowScope.row.details && rowScope.row.details.message}">
                                    {{ rowScope.row.details && rowScope.row.details.message || '-' }}
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
import { i18nMixin, vuex } from '../../../javascripts/countly/vue/core.js';
import countlyCommon from '../../../javascripts/countly/countly.common.js';
import moment from 'moment';
import countlyHealthManager from '../store/index.js';

import ClyMain from '../../../javascripts/components/layout/cly-main.vue';
import ClySection from '../../../javascripts/components/layout/cly-section.vue';
import ClyDatatableN from '../../../javascripts/components/datatable/cly-datatable-n.vue';
import ClySelectX from '../../../javascripts/components/input/select-x.vue';
import KafkaEventsExpandedRow from './KafkaEventsExpandedRow.vue';

export default {
    components: {
        ClyMain,
        ClySection,
        ClyDatatableN,
        ClySelectX,
        "expand-row": KafkaEventsExpandedRow
    },
    mixins: [i18nMixin],
    data: function() {
        var self = this;
        var tableStore = vuex.getLocalStore(vuex.ServerDataTable("kafkaEventsTable", {
            columns: ['_id', 'ts', 'type', 'groupId', 'topic', 'partition', 'clusterId'],
            onRequest: function() {
                return {
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.r + "/system/kafka/events",
                    data: {
                        eventType: self.filters.eventType,
                        groupId: self.filters.groupId,
                        topic: self.filters.topic,
                        clusterId: self.filters.clusterId
                    }
                };
            },
            onReady: function(context, rows) {
                return rows.map(function(row) {
                    row.displayTs = moment(new Date(row.ts)).format("DD MMM YYYY HH:mm:ss");
                    return row;
                });
            }
        }));

        return {
            isLoading: false,
            hasFetched: false,
            tableStore: tableStore,
            remoteTableDataSource: vuex.getServerDataSource(tableStore, "kafkaEventsTable"),
            filters: {
                eventType: 'all',
                groupId: 'all',
                topic: 'all',
                clusterId: 'all'
            },
            filterOptions: {
                eventTypes: [],
                groupIds: [],
                topics: [],
                clusterIds: []
            }
        };
    },
    mounted: function() {
        this.fetchMeta();
    },
    methods: {
        refresh: function(force) {
            if (!this.isLoading || force) {
                this.tableStore.dispatch("fetchKafkaEventsTable", {_silent: !force});
            }
        },
        fetchMeta: function() {
            var self = this;
            if (countlyHealthManager && typeof countlyHealthManager.fetchKafkaEventsMeta === "function") {
                Promise.resolve(countlyHealthManager.fetchKafkaEventsMeta()).then(function(meta) {
                    meta = meta || {};
                    self.filterOptions.eventTypes = meta.eventTypes || [];
                    self.filterOptions.groupIds = meta.groupIds || [];
                    self.filterOptions.topics = meta.topics || [];
                    self.filterOptions.clusterIds = meta.clusterIds || [];
                }).catch(function() {
                    // Meta endpoint may not be available; keep empty filter options
                }).finally(function() {
                    self.hasFetched = true;
                });
            }
            else {
                self.hasFetched = true;
            }
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
        getSeverityClass: function(type) {
            switch (type) {
            case 'CLUSTER_MISMATCH':
            case 'OFFSET_BACKWARD':
                return 'color-red-100';
            case 'STATE_RESET':
                return 'color-yellow-100';
            case 'STATE_MIGRATED':
                return 'color-cool-gray-100';
            default:
                return 'color-cool-gray-100';
            }
        },
        getSeverityBadgeClass: function(type) {
            switch (type) {
            case 'CLUSTER_MISMATCH':
            case 'OFFSET_BACKWARD':
                return 'kafka-event-type--error';
            case 'STATE_RESET':
                return 'kafka-event-type--warning';
            case 'STATE_MIGRATED':
                return 'kafka-event-type--success';
            default:
                return 'kafka-event-type--info';
            }
        },
        getSeverityIcon: function(type) {
            switch (type) {
            case 'CLUSTER_MISMATCH':
            case 'OFFSET_BACKWARD':
                return 'cly-icon-warning';
            case 'STATE_RESET':
                return 'cly-icon-info';
            case 'STATE_MIGRATED':
                return 'cly-icon-check';
            default:
                return 'cly-icon-info';
            }
        },
        handleTableRowClick: function(row) {
            if (window.getSelection().toString().length === 0) {
                this.$refs.table.$refs.elTable.toggleRowExpansion(row);
            }
        },
        onFilterChange: function() {
            this.refresh(true);
        },
        formatType: function(type) {
            if (!type) {
                return '-';
            }
            return type.replace(/_/g, ' ');
        }
    }
};
</script>
