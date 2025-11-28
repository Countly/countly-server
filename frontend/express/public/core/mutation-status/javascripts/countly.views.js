/*global countlyVue, app, CV, countlyMutationStatus, countlyCommon, moment*/

var MutationStatusView = countlyVue.views.create({
    template: CV.T('/core/mutation-status/templates/mutation-status.html'),
    data: function() {
        return {
            isLoading: false,
            mutationStatusData: [],
            mutationSummary: {},
            clickhouseMetrics: {},
            clickhouseHealthy: true,
            clickhouseIssues: [],
            hasFetched: false
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
            countlyMutationStatus.fetchData().then(function(res) {
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
                    var awaitingStatuses = ['awaiting_validation', 'awaiting_ch_mutation_validation'];
                    queue = queue.filter(function(item) {
                        return item && awaitingStatuses.indexOf(item.status) === -1;
                    });
                    summary.awaiting_validation = 0;
                }

                self.mutationStatusData = queue;
                self.mutationSummary = summary;
                self.hasFetched = true;
                self.isLoading = false;
            });
        },
        formatDate(val) {
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
        summaryBarOption: function() {
            var summary = this.mutationSummary || {};
            var rows = [
                {name: 'Queued', value: summary.queued || 0},
                {name: 'Running', value: summary.running || 0}
            ];
            if (this.showClickhouseMetrics) {
                rows.push({name: 'Awaiting CH validation', value: summary.awaiting_validation || 0});
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

app.route("/mutation-status", 'mutationStatus', function() {
    this.renderWhenReady(new CV.views.BackboneWrapper({
        component: MutationStatusView
    }));
});
