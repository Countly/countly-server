/*global countlyVue, app, CV, countlyHealthManager, countlyCommon, moment*/

var MutationStatusView = countlyVue.views.create({
    template: CV.T('/core/health-manager/templates/mutation-status.html'),
    data: function() {
        return {
            isLoading: false,
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
            countlyHealthManager.fetchMutationStatus(this.filters).then(function(res) {
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
                queued: 'Queued',
                running: 'Running',
                failed: 'Failed',
                completed: 'Completed'
            };
            if (this.showClickhouseMetrics) {
                base.awaiting_ch_mutation_validation = 'Awaiting CH validation';
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
                {name: 'Queued', value: summary.queued || 0},
                {name: 'Running', value: summary.running || 0}
            ];
            if (this.showClickhouseMetrics) {
                rows.push({name: 'Awaiting CH validation', value: summary.awaiting_ch_mutation_validation || 0});
            }
            rows.push({name: 'Failed', value: summary.failed || 0});
            rows.push({name: 'Completed', value: summary.completed || 0});
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
                        name: 'Mutations',
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
            var deferText = backpressure.deferred_due_to_clickhouse ? 'Mutation operations are being deferred' : 'No mutation operations are being deferred';
            var issuesText = (this.clickhouseIssues && this.clickhouseIssues.length) ? this.clickhouseIssues.join(', ') : 'No issues detected';

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

// TODO: Remove eslint disable when aggregator tab is re-enabled
// eslint-disable-next-line no-unused-vars
var AggregatorStatusView = countlyVue.views.create({
    template: CV.T('/core/health-manager/templates/aggregator-status.html'),
    data: function() {
        return {
            tableData: []
        };
    },
    mounted: function() {
        var self = this;
        countlyHealthManager.fetchAggregatorStatus().then(function(data) {
            self.tableData = data;
        });
    },
    methods: {
        getTable: function() {
            return this.tableData;
        },
        refresh: function() {
            var self = this;
            countlyHealthManager.fetchAggregatorStatus().then(function(data) {
                self.tableData = data;
            });
        }
    },
    computed: {
        aggregatorRows: function() {
            return this.getTable();
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

// TODO: Re-enable when aggregator data is ready
// countlyVue.container.registerTab("/manage/health", {
//     priority: 2,
//     name: "aggregator-status",
//     permission: "core",
//     title: CV.i18n('health-manager.tabs.aggregator'),
//     route: "#/manage/health/aggregator-status",
//     dataTestId: "health-manager-aggregator-status",
//     component: AggregatorStatusView,
//     vuex: [{clyModel: countlyHealthManager.getAggregatorVuex()}]
// });

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
