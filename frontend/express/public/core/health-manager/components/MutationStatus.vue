<template>
    <div v-bind:class="[componentId]" class="mutation-status-view">
        <cly-main>
            <div class="bu-mb-4">
                <cly-notification
                    v-if="hasError"
                    :text="i18n('health-manager.error.fetch-failed')"
                    color="light-destructive"
                    :closable="false"
                >
                </cly-notification>
                <cly-notification
                    v-if="!clickhouseHealthy && showClickhouseMetrics"
                    :text="i18n('mutation-status.alert.clickhouse-unhealthy')"
                    color="light-warning"
                    :closable="false"
                >
                </cly-notification>
                <cly-notification
                    v-if="(mutationSummary.failed || 0) > 0"
                    :text="i18n('mutation-status.alert.failed-tasks')"
                    color="light-destructive"
                    :closable="false"
                >
                </cly-notification>
            </div>
            <cly-section v-if="showClickhouseMetrics" :title="i18n('mutation-status.metrics.title')" :tooltip="i18n('mutation-status.metrics.tooltip')">
                <cly-metric-cards :multiline="true">
                    <cly-metric-card
                        v-for="card in systemCards"
                        :key="card.title"
                        color="#097EFF">
                        <template v-slot:default>
                            {{ card.title }}
                            <cly-tooltip-icon v-if="card.tooltip" class="bu-ml-1" :tooltip="card.tooltip"></cly-tooltip-icon>
                        </template>
                        <template v-slot:number>
                            <span :class="card.numberClass || ''">{{ card.value != null ? String(card.value).toUpperCase() : '-' }}</span>
                        </template>
                        <template v-slot:description>
                            <span class="text-small color-cool-gray-600">{{ card.detail }}</span>
                        </template>
                    </cly-metric-card>
                </cly-metric-cards>
            </cly-section>

            <cly-section :title="i18n('mutation-status.summary.title')" :tooltip="i18n('mutation-status.summary.tooltip')">
                <cly-chart-bar :option="summaryBarOption" :showToggle="false" :noEmpty="true" v-loading="isLoading"></cly-chart-bar>
            </cly-section>

            <cly-section :title="i18n('mutation-status.table.title')" :tooltip="i18n('mutation-status.table.tooltip')">
                <cly-datatable-n :rows="mutationStatusData" :force-loading="isLoading">
                    <template v-slot:header-left>
                        <cly-dropdown ref="filterDropdown" :width="320" @hide="onFilterCancel" @show="onFilterShow">
                            <template v-slot:trigger="dropdown">
                                <cly-input-dropdown-trigger
                                    v-tooltip="filterSummaryText"
                                    :selected-options="filterSummaryText"
                                    :focused="dropdown.focused"
                                    :opened="dropdown.visible"
                                    :adaptive-length="true">
                                </cly-input-dropdown-trigger>
                            </template>
                            <template>
                                <cly-form
                                    :key="filterFormKey"
                                    :initial-edited-object="filterForm"
                                    ref="filterForm"
                                    @submit="onFilterApply">
                                    <template v-slot="formScope">
                                        <cly-form-step id="filter-form-step">
                                            <div class="bu-m-4">
                                                <div class="bu-level">
                                                    <div class="bu-level-left">
                                                        <div class="bu-level-item">
                                                            <h4>{{ i18n('mutation-status.filters.title') }}</h4>
                                                        </div>
                                                    </div>
                                                    <div class="bu-level-right">
                                                        <div class="bu-level-item">
                                                            <el-button type="text" class="cly-multi-select__reset" @click="onFilterReset">
                                                                {{ i18n('mutation-status.filters.reset') }}
                                                            </el-button>
                                                        </div>
                                                    </div>
                                                </div>
                                                <cly-form-field :label="i18n('mutation-status.filters.status')">
                                                    <el-select v-model="formScope.editedObject.status" :placeholder="i18n('mutation-status.filters.status-all')" class="select-full-width" placement="bottom-start" clearable>
                                                        <el-option v-for="option in statusOptions" :key="option.value" :label="option.label" :value="option.value"></el-option>
                                                    </el-select>
                                                </cly-form-field>
                                                <cly-form-field :label="i18n('mutation-status.filters.db')">
                                                    <el-select v-model="formScope.editedObject.db" clearable :placeholder="i18n('mutation-status.filters.db-all')" class="select-full-width" placement="bottom-start">
                                                        <el-option v-for="value in availableDbs" :key="value" :label="value === 'all' ? i18n('mutation-status.filters.db-all') : value" :value="value"></el-option>
                                                    </el-select>
                                                </cly-form-field>
                                                <cly-form-field :label="i18n('mutation-status.filters.collection')">
                                                    <el-select v-model="formScope.editedObject.collection" clearable :placeholder="i18n('mutation-status.filters.collection-all')" class="select-full-width" placement="bottom-start">
                                                        <el-option v-for="value in availableCollections" :key="value" :label="value === 'all' ? i18n('mutation-status.filters.collection-all') : value" :value="value"></el-option>
                                                    </el-select>
                                                </cly-form-field>
                                                <cly-form-field :label="i18n('mutation-status.filters.type')">
                                                    <el-select v-model="formScope.editedObject.type" clearable :placeholder="i18n('mutation-status.filters.type-all')" class="select-full-width" placement="bottom-start">
                                                        <el-option v-for="value in availableTypes" :key="value" :label="value === 'all' ? i18n('mutation-status.filters.type-all') : value" :value="value"></el-option>
                                                    </el-select>
                                                </cly-form-field>
                                                <div class="bu-has-text-right bu-pt-3">
                                                    <el-button type="secondary" @click="onFilterCancel">{{ i18n('common.cancel') }}</el-button>
                                                    <el-button type="success" @click="formScope.submit()">{{ i18n('common.apply') }}</el-button>
                                                </div>
                                            </div>
                                        </cly-form-step>
                                    </template>
                                </cly-form>
                            </template>
                        </cly-dropdown>
                    </template>
                    <template v-slot="scope">
                        <el-table-column fixed="left" width="150" sortable="custom" prop="status" :label="i18n('mutation-status.table.status')">
                            <template v-slot="rowScope">
                                <div v-tooltip="rowScope.row.status === 'completed' ? i18n('mutation-status.table.completed-at', formatDate(rowScope.row.mutation_completion_ts)) : (rowScope.row.status || '').toUpperCase()">
                                    <cly-status-tag
                                        :text="(rowScope.row.status || '').toUpperCase()"
                                        :color="rowScope.row.status === 'failed' ? 'red' : (rowScope.row.status === 'completed' ? 'green' : 'yellow')">
                                    </cly-status-tag>
                                </div>
                            </template>
                        </el-table-column>
                        <el-table-column sortable="custom" prop="db" :label="i18n('mutation-status.table.database')" min-width="180">
                            <template v-slot="rowScope">
                                <div> {{ rowScope.row.db }} </div>
                            </template>
                        </el-table-column>
                        <el-table-column sortable="custom" prop="collection" :label="i18n('mutation-status.table.collection')" min-width="200">
                            <template v-slot="rowScope">
                                <div> {{ rowScope.row.collection }} </div>
                            </template>
                        </el-table-column>
                        <el-table-column sortable="custom" prop="query" :label="i18n('mutation-status.table.query')" min-width="320">
                            <template v-slot="rowScope">
                                <div v-tooltip="{content: JSON.stringify(rowScope.row.query)}">
                                    <code> {{ rowScope.row.query }} </code>
                                </div>
                            </template>
                        </el-table-column>
                        <el-table-column sortable="custom" prop="type" :label="i18n('mutation-status.table.type')" min-width="140">
                            <template v-slot="rowScope">
                                <div class="text-medium font-weight-bold"> {{ (rowScope.row.type || '').toUpperCase() }} </div>
                            </template>
                        </el-table-column>
                        <el-table-column sortable="custom" prop="ts" :label="i18n('mutation-status.table.timestamp')" min-width="200">
                            <template v-slot="rowScope">
                                <div> {{ formatDate(rowScope.row.ts) }} </div>
                            </template>
                        </el-table-column>
                        <el-table-column sortable="custom" prop="running" :label="i18n('mutation-status.table.running')" min-width="140">
                            <template v-slot="rowScope">
                                <div> {{ rowScope.row.running }} </div>
                            </template>
                        </el-table-column>
                        <el-table-column sortable="custom" prop="error" :label="i18n('mutation-status.table.error')" min-width="280">
                            <template v-slot="rowScope">
                                <div class="has-ellipsis" v-tooltip="{content: rowScope.row.error}"> {{ rowScope.row.error }} </div>
                            </template>
                        </el-table-column>
                        <el-table-column sortable="custom" prop="fail_count" :label="i18n('mutation-status.table.attempts')" min-width="140">
                            <template v-slot="rowScope">
                                <div> {{ rowScope.row.fail_count }} </div>
                            </template>
                        </el-table-column>
                        <el-table-column sortable="custom" prop="retry_at" :label="i18n('mutation-status.table.retry-at')" min-width="200">
                            <template v-slot="rowScope">
                                <div> {{ formatDate(rowScope.row.retry_at) }} </div>
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
import ClyStatusTag from '../../../javascripts/components/helpers/cly-status-tag.vue';
import ClyChartBar from '../../../javascripts/components/echart/cly-chart-bar.vue';
import ClyDatatableN from '../../../javascripts/components/datatable/cly-datatable-n.vue';
import ClyDropdown from '../../../javascripts/components/dropdown/dropdown.vue';
import ClyInputDropdownTrigger from '../../../javascripts/components/dropdown/input-dropdown-trigger.vue';
import ClyForm from '../../../javascripts/components/form/cly-form.vue';
import ClyFormStep from '../../../javascripts/components/form/cly-form-step.vue';
import ClyFormField from '../../../javascripts/components/form/cly-form-field.vue';

export default {
    components: {
        ClyMain,
        ClySection,
        ClyMetricCards,
        ClyMetricCard,
        ClyTooltipIcon,
        ClyNotification,
        ClyStatusTag,
        ClyChartBar,
        ClyDatatableN,
        ClyDropdown,
        ClyInputDropdownTrigger,
        ClyForm,
        ClyFormStep,
        ClyFormField
    },
    mixins: [i18nMixin],
    data: function() {
        return {
            isLoading: false,
            hasError: false,
            mutationStatusData: [],
            mutationSummary: {},
            clickhouseMetrics: {},
            clickhouseHealthy: true,
            clickhouseIssues: [],
            hasFetched: false,
            filters: {
                status: 'all',
                db: 'all',
                collection: 'all',
                type: 'all'
            },
            filterForm: {
                status: 'all',
                db: 'all',
                collection: 'all',
                type: 'all'
            }
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
            Promise.resolve(countlyHealthManager.fetchMutationStatus(this.filters)).then(function(res) {
                var mutation = Array.isArray(res)
                    ? res.find(function(item) {
                        return item && item.provider === 'mutation';
                    }) || {}
                    : res || {};
                var queue = Array.isArray(mutation.metrics?.queue) ? mutation.metrics.queue : [];
                var summary = (mutation.metrics && mutation.metrics.summary) || {};

                var clickhouse = Array.isArray(res)
                    ? res.find(function(item) {
                        return item && item.provider === 'clickhouse';
                    }) || {}
                    : {};
                self.clickhouseMetrics = clickhouse.metrics || {};
                self.clickhouseHealthy = typeof clickhouse.healthy !== 'undefined' ? clickhouse.healthy : true;
                self.clickhouseIssues = clickhouse.issues || [];

                var hasServiceUnavailable = Array.isArray(self.clickhouseIssues) && self.clickhouseIssues.indexOf('service_unavailable') !== -1;
                if (hasServiceUnavailable) {
                    queue = queue.filter(function(item) {
                        return item && item.status !== 'awaiting_ch_mutation_validation';
                    });
                    summary.awaiting_ch_mutation_validation = 0;
                }

                self.mutationStatusData = queue;
                self.mutationSummary = summary;
            }).catch(function() {
                self.hasError = true;
                self.mutationStatusData = [];
                self.mutationSummary = {};
            }).finally(function() {
                self.hasFetched = true;
                self.isLoading = false;
            });
        },
        onFilterApply: function(editedObject) {
            var payload = editedObject && editedObject.editedObject ? editedObject.editedObject : editedObject;
            var edited = Object.assign({
                status: 'all',
                db: 'all',
                collection: 'all',
                type: 'all'
            }, payload || {});

            this.filters = {
                status: edited.status || 'all',
                db: edited.db || 'all',
                collection: edited.collection || 'all',
                type: edited.type || 'all'
            };

            this.filterForm = Object.assign({}, this.filters);
            if (this.$refs.filterDropdown && this.$refs.filterDropdown.doClose) {
                this.$refs.filterDropdown.doClose();
            }
            this.fetchData();
        },
        onFilterReset: function() {
            this.filterForm = {
                status: 'all',
                db: 'all',
                collection: 'all',
                type: 'all'
            };
            if (this.$refs.filterForm && this.$refs.filterForm.clear) {
                this.$refs.filterForm.clear();
            }
            this.filters = {
                status: 'all',
                db: 'all',
                collection: 'all',
                type: 'all'
            };
        },
        onFilterCancel: function() {
            this.filterForm = Object.assign({}, this.filters);
            if (this.$refs.filterDropdown && this.$refs.filterDropdown.doClose) {
                this.$refs.filterDropdown.doClose();
            }
        },
        onFilterShow: function() {
            this.filterForm = Object.assign({}, this.filters);
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
        }
    },
    computed: {
        showClickhouseMetrics: function() {
            return this.hasFetched && !(Array.isArray(this.clickhouseIssues) && this.clickhouseIssues.indexOf('service_unavailable') !== -1);
        },
        availableStatuses: function() {
            var base = {
                queued: this.i18n('mutation-status.status.queued'),
                running: this.i18n('mutation-status.status.running'),
                failed: this.i18n('mutation-status.status.failed'),
                completed: this.i18n('mutation-status.status.completed')
            };
            if (this.showClickhouseMetrics) {
                base.awaiting_ch_mutation_validation = this.i18n('mutation-status.status.awaiting-ch');
            }
            return base;
        },
        statusOptions: function() {
            var opts = [
                {label: this.i18n('mutation-status.filters.status-all'), value: 'all'}
            ];
            var self = this;
            Object.keys(this.availableStatuses).forEach(function(key) {
                opts.push({label: self.availableStatuses[key], value: key});
            });
            return opts;
        },
        availableDbs: function() {
            var set = {};
            (this.mutationStatusData || []).forEach(function(item) {
                if (item && item.db) {
                    set[item.db] = true;
                }
            });
            if (this.filters.db && this.filters.db !== 'all') {
                set[this.filters.db] = true;
            }
            return ['all'].concat(Object.keys(set));
        },
        availableCollections: function() {
            var set = {};
            (this.mutationStatusData || []).forEach(function(item) {
                if (item && item.collection) {
                    set[item.collection] = true;
                }
            });
            if (this.filters.collection && this.filters.collection !== 'all') {
                set[this.filters.collection] = true;
            }
            return ['all'].concat(Object.keys(set));
        },
        availableTypes: function() {
            var set = {};
            (this.mutationStatusData || []).forEach(function(item) {
                if (item && item.type) {
                    set[item.type] = true;
                }
            });
            if (this.filters.type && this.filters.type !== 'all') {
                set[this.filters.type] = true;
            }
            return ['all'].concat(Object.keys(set));
        },
        filterSummary: function() {
            var parts = [];
            var self = this;
            var entries = [
                {
                    key: 'status',
                    label: self.i18n('mutation-status.filters.status'),
                    value: self.filters.status,
                    display: self.filters.status && self.filters.status !== 'all' ? (self.availableStatuses[self.filters.status] || self.filters.status) : ''
                },
                {
                    key: 'db',
                    label: self.i18n('mutation-status.filters.db'),
                    value: self.filters.db,
                    display: self.filters.db
                },
                {
                    key: 'collection',
                    label: self.i18n('mutation-status.filters.collection'),
                    value: self.filters.collection,
                    display: self.filters.collection
                },
                {
                    key: 'type',
                    label: self.i18n('mutation-status.filters.type'),
                    value: self.filters.type,
                    display: self.filters.type
                }
            ];

            entries.forEach(function(entry) {
                if (entry.value && entry.value !== 'all') {
                    parts.push(entry.label + ': ' + entry.display);
                }
            });

            if (!parts.length) {
                parts = [
                    self.i18n('mutation-status.filters.status-all'),
                    self.i18n('mutation-status.filters.db-all'),
                    self.i18n('mutation-status.filters.collection-all'),
                    self.i18n('mutation-status.filters.type-all')
                ];
            }
            return parts;
        },
        filterFormKey: function() {
            return JSON.stringify(this.filterForm);
        },
        filterSummaryText: function() {
            return this.filterSummary.join(', ');
        },
        summaryBarOption: function() {
            var summary = this.mutationSummary || {};
            var self = this;
            var rows = [
                {name: self.i18n('mutation-status.status.queued'), value: summary.queued || 0},
                {name: self.i18n('mutation-status.status.running'), value: summary.running || 0}
            ];
            if (this.showClickhouseMetrics) {
                rows.push({name: self.i18n('mutation-status.status.awaiting-ch'), value: summary.awaiting_ch_mutation_validation || 0});
            }
            rows.push({name: self.i18n('mutation-status.status.failed'), value: summary.failed || 0});
            rows.push({name: self.i18n('mutation-status.status.completed'), value: summary.completed || 0});
            var total = rows.reduce(function(acc, cur) {
                return acc + (cur.value || 0);
            }, 0);

            return {
                grid: {
                    left: '3%',
                    right: '3%',
                    bottom: '8%',
                    containLabel: true
                },
                xAxis: {
                    type: 'category',
                    data: rows.map(function(row) {
                        return row.name;
                    }),
                    axisLabel: {
                        interval: 0,
                        rotate: 20
                    }
                },
                yAxis: {
                    type: 'value'
                },
                tooltip: {
                    trigger: 'axis',
                    axisPointer: {type: 'shadow'},
                    formatter: function(params) {
                        var item = Array.isArray(params) ? params[0] : params;
                        var val = item.value || 0;
                        var pct = total ? ((val / total) * 100).toFixed(1) : 0;
                        return item.name + ': ' + val + (total ? ' (' + pct + '%)' : '');
                    }
                },
                series: [
                    {
                        name: self.i18n('mutation-status.summary.series-name'),
                        type: 'bar',
                        data: rows.map(function(row) {
                            return row.value;
                        }),
                        itemStyle: {
                            color: '#0166d6'
                        },
                        barMaxWidth: 32,
                        label: {
                            show: true,
                            position: 'top',
                            formatter: function(param) {
                                var val = param.value || 0;
                                var pct = total ? ((val / total) * 100).toFixed(1) : 0;
                                return total ? (val + ' (' + pct + '%)') : val;
                            }
                        }
                    }
                ]
            };
        },
        systemCards: function() {
            var snapshot = this.clickhouseMetrics.clickhouse_snapshot || {};
            var backpressure = this.clickhouseMetrics.backpressure || {};
            var thresholds = backpressure.thresholds || {};
            var utilization = backpressure.utilization || {};

            var risk = (backpressure.risk_level || 'unknown').toString().toUpperCase();
            var deferText = backpressure.deferred_due_to_clickhouse ? this.i18n('mutation-status.metrics.deferred-yes') : this.i18n('mutation-status.metrics.deferred-no');
            var issuesText = (this.clickhouseIssues && this.clickhouseIssues.length) ? this.clickhouseIssues.join(', ') : this.i18n('mutation-status.metrics.no-issues');

            var partsLimit = thresholds.CH_MAX_PARTS_PER_PARTITION || 0;
            var totalLimit = thresholds.CH_MAX_TOTAL_MERGETREE_PARTS || 0;
            var partsUtilPercent = ((utilization.max_parts_per_partition || 0) * 100).toFixed(1);
            var totalUtilPercent = ((utilization.total_merge_tree_parts || 0) * 100).toFixed(3);
            var statusClass = this.clickhouseHealthy ? 'color-green-100' : 'color-red-100';
            var riskClass = 'color-red-100';
            if (risk === 'LOW') {
                riskClass = 'color-green-100';
            }
            else if (risk === 'MODERATE') {
                riskClass = 'color-yellow-100';
            }
            else if (risk !== 'HIGH' && risk !== 'CRITICAL') {
                riskClass = 'color-cool-gray-100';
            }

            return [
                {
                    title: this.i18n('mutation-status.metrics.status'),
                    value: this.clickhouseHealthy ? this.i18n('mutation-status.metrics.healthy') : this.i18n('mutation-status.metrics.critical'),
                    detail: issuesText,
                    tooltip: this.i18n('mutation-status.metrics.status.tooltip'),
                    numberClass: statusClass
                },
                {
                    title: this.i18n('mutation-status.metrics.merge'),
                    value: countlyCommon.formatNumber ? countlyCommon.formatNumber(snapshot.active_merges || 0) : (snapshot.active_merges || 0),
                    detail: this.i18n('mutation-status.metrics.merge.detail', snapshot.merges_in_progress || 0),
                    tooltip: this.i18n('mutation-status.metrics.merge.tooltip'),
                    numberClass: 'color-cool-gray-100'
                },
                {
                    title: this.i18n('mutation-status.metrics.partition'),
                    value: countlyCommon.formatNumber ? countlyCommon.formatNumber(snapshot.max_parts_per_partition || 0) : (snapshot.max_parts_per_partition || 0),
                    detail: this.i18n('mutation-status.metrics.partition.detail', partsUtilPercent, partsLimit),
                    tooltip: this.i18n('mutation-status.metrics.partition.tooltip'),
                    numberClass: 'color-cool-gray-100'
                },
                {
                    title: this.i18n('mutation-status.metrics.total-parts'),
                    value: countlyCommon.formatNumber ? countlyCommon.formatNumber(snapshot.total_merge_tree_parts || 0) : (snapshot.total_merge_tree_parts || 0),
                    detail: this.i18n('mutation-status.metrics.total-parts.detail', totalUtilPercent, totalLimit),
                    tooltip: this.i18n('mutation-status.metrics.total-parts.tooltip'),
                    numberClass: 'color-cool-gray-100'
                },
                {
                    title: this.i18n('mutation-status.metrics.backpressure'),
                    value: risk,
                    detail: deferText,
                    tooltip: this.i18n('mutation-status.metrics.backpressure.tooltip'),
                    numberClass: riskClass
                }
            ];
        }
    }
};
</script>
