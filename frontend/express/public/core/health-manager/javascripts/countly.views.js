/*global countlyVue, app, CV, countlyHealthManager, countlyCommon, moment*/

var healthManagerDateMixin = {
    methods: {
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
    }
};

var MutationStatusView = countlyVue.views.create({
    template: CV.T('/core/health-manager/templates/mutation-status.html'),
    mixins: [healthManagerDateMixin],
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
    },
    computed: {
        showClickhouseMetrics: function() {
            return this.hasFetched && !(Array.isArray(this.clickhouseIssues) && this.clickhouseIssues.indexOf('service_unavailable') !== -1);
        },
        availableStatuses: function() {
            var base = {
                queued: CV.i18n('mutation-status.status.queued'),
                running: CV.i18n('mutation-status.status.running'),
                failed: CV.i18n('mutation-status.status.failed'),
                completed: CV.i18n('mutation-status.status.completed')
            };
            if (this.showClickhouseMetrics) {
                base.awaiting_ch_mutation_validation = CV.i18n('mutation-status.status.awaiting-ch');
            }
            return base;
        },
        statusOptions: function() {
            var opts = [
                {label: CV.i18n('mutation-status.filters.status-all'), value: 'all'}
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
            var entries = [
                {
                    key: 'status',
                    label: CV.i18n('mutation-status.filters.status'),
                    value: this.filters.status,
                    display: this.filters.status && this.filters.status !== 'all' ? (this.availableStatuses[this.filters.status] || this.filters.status) : ''
                },
                {
                    key: 'db',
                    label: CV.i18n('mutation-status.filters.db'),
                    value: this.filters.db,
                    display: this.filters.db
                },
                {
                    key: 'collection',
                    label: CV.i18n('mutation-status.filters.collection'),
                    value: this.filters.collection,
                    display: this.filters.collection
                },
                {
                    key: 'type',
                    label: CV.i18n('mutation-status.filters.type'),
                    value: this.filters.type,
                    display: this.filters.type
                }
            ];

            entries.forEach(function(entry) {
                if (entry.value && entry.value !== 'all') {
                    parts.push(entry.label + ': ' + entry.display);
                }
            });

            if (!parts.length) {
                parts = [
                    CV.i18n('mutation-status.filters.status-all'),
                    CV.i18n('mutation-status.filters.db-all'),
                    CV.i18n('mutation-status.filters.collection-all'),
                    CV.i18n('mutation-status.filters.type-all')
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
            var rows = [
                {name: CV.i18n('mutation-status.status.queued'), value: summary.queued || 0},
                {name: CV.i18n('mutation-status.status.running'), value: summary.running || 0}
            ];
            if (this.showClickhouseMetrics) {
                rows.push({name: CV.i18n('mutation-status.status.awaiting-ch'), value: summary.awaiting_ch_mutation_validation || 0});
            }
            rows.push({name: CV.i18n('mutation-status.status.failed'), value: summary.failed || 0});
            rows.push({name: CV.i18n('mutation-status.status.completed'), value: summary.completed || 0});
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
                        name: CV.i18n('mutation-status.summary.series-name'),
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
            var deferText = backpressure.deferred_due_to_clickhouse ? CV.i18n('mutation-status.metrics.deferred-yes') : CV.i18n('mutation-status.metrics.deferred-no');
            var issuesText = (this.clickhouseIssues && this.clickhouseIssues.length) ? this.clickhouseIssues.join(', ') : CV.i18n('mutation-status.metrics.no-issues');

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
                    title: CV.i18n('mutation-status.metrics.status'),
                    value: this.clickhouseHealthy ? CV.i18n('mutation-status.metrics.healthy') : CV.i18n('mutation-status.metrics.critical'),
                    detail: issuesText,
                    tooltip: CV.i18n('mutation-status.metrics.status.tooltip'),
                    numberClass: statusClass
                },
                {
                    title: CV.i18n('mutation-status.metrics.merge'),
                    value: countlyCommon.formatNumber ? countlyCommon.formatNumber(snapshot.active_merges || 0) : (snapshot.active_merges || 0),
                    detail: CV.i18n('mutation-status.metrics.merge.detail', snapshot.merges_in_progress || 0),
                    tooltip: CV.i18n('mutation-status.metrics.merge.tooltip'),
                    numberClass: 'color-cool-gray-100'
                },
                {
                    title: CV.i18n('mutation-status.metrics.partition'),
                    value: countlyCommon.formatNumber ? countlyCommon.formatNumber(snapshot.max_parts_per_partition || 0) : (snapshot.max_parts_per_partition || 0),
                    detail: CV.i18n('mutation-status.metrics.partition.detail', partsUtilPercent, partsLimit),
                    tooltip: CV.i18n('mutation-status.metrics.partition.tooltip'),
                    numberClass: 'color-cool-gray-100'
                },
                {
                    title: CV.i18n('mutation-status.metrics.total-parts'),
                    value: countlyCommon.formatNumber ? countlyCommon.formatNumber(snapshot.total_merge_tree_parts || 0) : (snapshot.total_merge_tree_parts || 0),
                    detail: CV.i18n('mutation-status.metrics.total-parts.detail', totalUtilPercent, totalLimit),
                    tooltip: CV.i18n('mutation-status.metrics.total-parts.tooltip'),
                    numberClass: 'color-cool-gray-100'
                },
                {
                    title: CV.i18n('mutation-status.metrics.backpressure'),
                    value: risk,
                    detail: deferText,
                    tooltip: CV.i18n('mutation-status.metrics.backpressure.tooltip'),
                    numberClass: riskClass
                }
            ];
        }
    }

});

var AggregatorStatusView = countlyVue.views.create({
    template: CV.T('/core/health-manager/templates/aggregator-status.html'),
    mixins: [healthManagerDateMixin],
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
                    title: CV.i18n('aggregator-status.cards.total-lag'),
                    value: this.formatNumber(totalLag),
                    detail: CV.i18n('aggregator-status.cards.total-lag.detail'),
                    tooltip: CV.i18n('aggregator-status.cards.total-lag.tooltip'),
                    numberClass: this.getLagClass(totalLag)
                },
                {
                    title: CV.i18n('aggregator-status.cards.batches'),
                    value: this.formatNumber(totalBatches),
                    detail: CV.i18n('aggregator-status.cards.batches.detail'),
                    tooltip: CV.i18n('aggregator-status.cards.batches.tooltip'),
                    numberClass: 'color-cool-gray-100'
                },
                {
                    title: CV.i18n('aggregator-status.cards.duplicates'),
                    value: this.formatNumber(totalDuplicates),
                    detail: CV.i18n('aggregator-status.cards.duplicates.detail'),
                    tooltip: CV.i18n('aggregator-status.cards.duplicates.tooltip'),
                    numberClass: totalDuplicates > 0 ? 'color-yellow-100' : 'color-green-100'
                },
                {
                    title: CV.i18n('aggregator-status.cards.avg-batch'),
                    value: this.formatNumber(avgBatchSize),
                    detail: CV.i18n('aggregator-status.cards.avg-batch.detail'),
                    tooltip: CV.i18n('aggregator-status.cards.avg-batch.tooltip'),
                    numberClass: 'color-cool-gray-100'
                },
                {
                    title: CV.i18n('aggregator-status.cards.rebalances'),
                    value: this.formatNumber(totalRebalances),
                    detail: CV.i18n('aggregator-status.cards.rebalances.detail'),
                    tooltip: CV.i18n('aggregator-status.cards.rebalances.tooltip'),
                    numberClass: totalRebalances > 10 ? 'color-yellow-100' : 'color-green-100'
                },
                {
                    title: CV.i18n('aggregator-status.cards.errors'),
                    value: this.formatNumber(totalErrors),
                    detail: CV.i18n('aggregator-status.cards.errors.detail'),
                    tooltip: CV.i18n('aggregator-status.cards.errors.tooltip'),
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
                    name: CV.i18n('aggregator-status.chart.lag-axis'),
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
});

var IngestionStatusView = countlyVue.views.create({
    template: CV.T('/core/health-manager/templates/ingestion-status.html'),
    mixins: [healthManagerDateMixin],
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
                    title: CV.i18n('ingestion-status.cards.sink-lag'),
                    value: this.formatNumber(status.sinkLag || 0),
                    detail: CV.i18n('ingestion-status.cards.sink-lag.detail'),
                    tooltip: CV.i18n('ingestion-status.cards.sink-lag.tooltip'),
                    numberClass: this.getLagClass(status.sinkLag)
                },
                {
                    title: CV.i18n('ingestion-status.cards.connectors'),
                    value: runningConnectors + ' / ' + connectors.length + ' running',
                    detail: CV.i18n('ingestion-status.cards.connectors.detail'),
                    tooltip: CV.i18n('ingestion-status.cards.connectors.tooltip'),
                    numberClass: runningConnectors === connectors.length && connectors.length > 0
                        ? 'color-green-100'
                        : 'color-yellow-100'
                },
                {
                    title: CV.i18n('ingestion-status.cards.tasks'),
                    value: runningTasks + ' / ' + totalTasks + ' running',
                    detail: CV.i18n('ingestion-status.cards.tasks.detail'),
                    tooltip: CV.i18n('ingestion-status.cards.tasks.tooltip'),
                    numberClass: runningTasks === totalTasks && totalTasks > 0
                        ? 'color-green-100'
                        : 'color-yellow-100'
                },
                {
                    title: CV.i18n('ingestion-status.cards.last-updated'),
                    value: this.formatDate(status.sinkLagUpdatedAt),
                    detail: CV.i18n('ingestion-status.cards.last-updated.detail'),
                    tooltip: CV.i18n('ingestion-status.cards.last-updated.tooltip'),
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
                    name: CV.i18n('ingestion-status.chart.sink-lag-axis'),
                    axisLabel: {
                        formatter: function(value) {
                            return value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value;
                        }
                    }
                },
                series: [{
                    name: CV.i18n('ingestion-status.chart.sink-lag-series'),
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
});

var HealthManagerView = countlyVue.views.create({
    template: CV.T('/core/health-manager/templates/health-manager.html'),
    mixins: [
        countlyVue.container.tabsMixin({
            "healthTabs": "/manage/health"
        })
    ].concat(countlyVue.container.mixins(["/manage/health"])),
    data: function() {
        return {
            selectedTab: (this.$route.params && this.$route.params.tab)
        };
    },
    computed: {
        tabs: function() {
            return this.healthTabs;
        }
    }
});

var KafkaEventsExpandedRow = countlyVue.views.create({
    template: CV.T('/core/health-manager/templates/kafka-events-expanded.html'),
    props: {
        row: {
            type: Object,
            default: function() {
                return {};
            }
        }
    }
});

var KafkaEventsView = countlyVue.views.create({
    template: CV.T('/core/health-manager/templates/kafka-events.html'),
    mixins: [healthManagerDateMixin],
    components: {
        "expand-row": KafkaEventsExpandedRow
    },
    data: function() {
        var self = this;
        var tableStore = countlyVue.vuex.getLocalStore(countlyVue.vuex.ServerDataTable("kafkaEventsTable", {
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
            remoteTableDataSource: countlyVue.vuex.getServerDataSource(tableStore, "kafkaEventsTable"),
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
});

var getHealthManagerView = function() {
    var tabsVuex = countlyVue.container.tabsVuex(["/manage/health"]);
    return new countlyVue.views.BackboneWrapper({
        component: HealthManagerView,
        vuex: tabsVuex,
        templates: []
    });
};

countlyVue.container.registerTab("/manage/health", {
    priority: 1,
    name: "mutation-status",
    permission: "core",
    title: CV.i18n('health-manager.tabs.mutation'),
    route: "#/manage/health/mutation-status",
    dataTestId: "health-manager-mutation-status",
    component: MutationStatusView,
    tooltip: CV.i18n('mutation-status.overview.tooltip')
});

countlyVue.container.registerTab("/manage/health", {
    priority: 2,
    name: "aggregator-status",
    permission: "core",
    title: CV.i18n('health-manager.tabs.aggregator'),
    route: "#/manage/health/aggregator-status",
    dataTestId: "health-manager-aggregator-status",
    component: AggregatorStatusView,
    tooltip: CV.i18n('aggregator-status.overview.tooltip')
});

countlyVue.container.registerTab("/manage/health", {
    priority: 3,
    name: "ingestion-status",
    permission: "core",
    title: CV.i18n('health-manager.tabs.ingestion'),
    route: "#/manage/health/ingestion-status",
    dataTestId: "health-manager-ingestion-status",
    component: IngestionStatusView,
    tooltip: CV.i18n('ingestion-status.overview.tooltip')
});

countlyVue.container.registerTab("/manage/health", {
    priority: 4,
    name: "kafka-events",
    permission: "core",
    title: CV.i18n('health-manager.tabs.kafka-events'),
    route: "#/manage/health/kafka-events",
    dataTestId: "health-manager-kafka-events",
    component: KafkaEventsView,
    tooltip: CV.i18n('kafka-events.overview.tooltip')
});

app.route("/manage/health", "health-manager", function() {
    var ViewWrapper = getHealthManagerView();
    var params = {};
    ViewWrapper.params = params;
    this.renderWhenReady(ViewWrapper);
});

app.route("/manage/health/*tab", "health-manager-tab", function(tab) {
    var ViewWrapper = getHealthManagerView();
    var params = {
        tab: tab
    };
    ViewWrapper.params = params;
    this.renderWhenReady(ViewWrapper);
});

app.route("/manage/health/*tab/*query", "health-manager-tab", function(tab, query) {
    var ViewWrapper = getHealthManagerView();
    var params = {
        tab: tab,
        query: query
    };
    ViewWrapper.params = params;
    this.renderWhenReady(ViewWrapper);
});

app.addMenu("management", {code: "health-manager", permission: "core", url: "#/manage/health", text: CV.i18n('sidebar.management.health-manager'), priority: 85, tabsPath: "/manage/health"});
