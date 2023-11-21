/*global $,app, countlyCommon, countlyDataPoints,countlyVue, CV,moment, countlyGlobal*/


var DataPointsView = countlyVue.views.create({
    template: CV.T("/server-stats/templates/data-points.html"),
    data: function() {
        var settings = {
            title: CV.i18n('server-stats.data-points'),
            description: CV.i18n('server-stats.data-points-description'),
            app_id: this.$route.params.appid,
            subPage: false,
            isLoading: true,
            externalLinks: [],
            dataPointsRows: [],
            topDropdown: [],
            dataPointsGraph: this.calculateSeries(),
            useBasicGraph: false,
            showPushColumn: false,
            topApps: []
        };
        if (countlyGlobal.plugins && countlyGlobal.plugins.indexOf("push") > -1) {
            //We have push plugin
            settings.showPushColumn = true;
        }
        if (this.$route.params.appid) {
            settings.subPage = true;
            if (countlyGlobal.apps[this.$route.params.appid]) {
                settings.title = countlyGlobal.apps[this.$route.params.appid].name;
            }
            else {
                settings.title = this.$route.params.appid;
            }
        }
        return settings;
    },
    mounted: function() {
        var self = this;
        $.when(countlyDataPoints.initialize({app_id: this.app_id}), countlyDataPoints.calculateTop(), countlyDataPoints.punchCard({app_id: this.app_id})).then(function() {
            self.dataPointsGraph = self.calculateSeries();
            self.dataPointsRows = countlyDataPoints.getTableData();
            self.topApps = countlyDataPoints.getTop();
            self.isLoading = false;
        });
    },
    methods: {
        refresh: function(force) {
            if (force) {
                this.isLoading = true;
            }
            var self = this;
            $.when(countlyDataPoints.initialize({app_id: this.app_id}), countlyDataPoints.punchCard({app_id: this.app_id})).then(function() {
                self.dataPointsGraph = self.calculateSeries();
                self.dataPointsRows = countlyDataPoints.getTableData(),

                self.isLoading = false;
            });
            $.when(countlyDataPoints.calculateTop()).then(function() {
                self.topApps = countlyDataPoints.getTop();
            });


        },
        getNormalizedSymbolCoefficient: function() {
            return 30 / this.max;
        },
        numberFormatter: function(row, col, value) {
            if (value === null) {
                return "-";
            }
            else {
                return countlyCommon.formatNumber(value, 0);
            }
        },
        calculateSeries: function() {
            var info = countlyDataPoints.getPunchCardData();
            var data = info.data || [];

            var labels = [
                CV.i18n('common.monday'),
                CV.i18n('common.tuesday'),
                CV.i18n('common.wednesday'),
                CV.i18n('common.thursday'),
                CV.i18n('common.friday'),
                CV.i18n('common.saturday'),
                CV.i18n('common.sunday')
            ];
            if (info.labels && info.labels.length > 0) {
                for (var k = 0; k < info.labels.length; k++) {
                    var thisDay = moment(info.labels[k], "YYYY.M.D");
                    info.labels[k] = countlyCommon.formatDate(thisDay, "D MMM, YYYY");
                }
                labels = info.labels;
            }
            var max = 0;
            //var hours = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23];
            if (data && data.length > 0) {
                for (var ddd = 0;ddd < data.length; ddd++) {
                    for (var hour = 0; hour < 24; hour++) {
                        max = Math.max(max, data[ddd][2]);
                    }
                }
            }
            this.max = max;
            var self = this;

            var graphObject = {
                title: {
                    text: CV.i18n('server-stats.data-points')
                },
                tooltip: {
                    position: 'top',
                    trigger: 'item',
                    borderColor: "#ececec",
                    borderWidth: 1,
                },
                xAxis: {
                    data: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
                    splitLine: {
                        show: true
                    },
                    axisLine: {
                        show: false
                    },
                    name: CV.i18n('common.hours'),
                    nameLocation: "start",
                    nameTextStyle: {
                        color: "#A7AEB8",
                        padding: [0, 0, -20, 0],
                        verticalAlign: 'bottom'
                    }
                }

            };
            if (!info.dayCount || info.dayCount > 1) {
                this.useBasicGraph = false;
                graphObject.tooltip.formatter = function(params) {
                    var dd = params.data || [];
                    dd = dd[3] || {};
                    dd.avg = 0;
                    if (dd.cn > 0) {
                        dd.avg = Math.round(dd.sum / dd.cn);
                    }
                    else {
                        dd.avg = dd.sum;
                    }
                    //var tt = 0;
                    var lines = [];

                    if (dd.e) {
                        lines.push('<td>' + countlyCommon.formatNumber(Math.round(dd.e * 100 / dd.sum || 1), 0) + '%</td><td>' + CV.i18n('sidebar.events') + '</td>');
                        //tt += dd.e;
                    }

                    if (dd.s) {
                        lines.push('<td>' + countlyCommon.formatNumber(Math.round(dd.s * 100 / dd.sum || 1), 0) + '%</td><td>' + CV.i18n('sidebar.analytics.sessions') + '</td>');
                        //tt += dd.s;
                    }


                    if (dd.p && self.showPushColumn) {
                        lines.push('<td>' + countlyCommon.formatNumber(Math.round(dd.p * 100 / dd.sum || 1), 0) + '%</td><td>' + CV.i18n('push.plugin-title') + '</td>');
                        //tt += dd.p;
                    }

                    /* if (tt < dd.sum) {
                        lines.push('<td>' + countlyCommon.formatNumber(Math.round((dd.sum - tt) * 100 / dd.sum || 1), 0) + '%</td><td> **Unknown</td>');
                    }*/

                    var retString = '<div class="data-points-tooltip color-cool-gray-100 text-small"><div>' + CV.i18n('server-stats.total-datapoints') + '</div><div class="text-big bu-pt-1 bu-pb-3">' + countlyCommon.formatNumber(dd.sum || 0) + '</div><table><tr><td class="bu-pr-2">Max.</td><td>Min.</td><td>Avg.</td></tr><tr class="text-big"><td>' + countlyCommon.formatNumber(dd.max, 0) + '</td><td>' + countlyCommon.formatNumber((dd.min || 0), 0) + '</td><td>' + countlyCommon.formatNumber(dd.avg, 0) + '</td></tr></table>';

                    if (lines.length > 0) {
                        retString += '<div class="color-cool-gray-100 text-small bu-p-0 bu-pt-3 data-points-tooltip-bottom-table"><table><tr>' + lines.join('</tr><tr>') + '</tr></table></div>';
                    }
                    return retString;
                };

                graphObject.yAxis = {
                    type: 'category',
                    data: labels,
                    nameLocation: 'middle',
                    boundaryGap: true,
                    axisTick: {
                        alignWithLabel: true
                    }
                };
                graphObject.series = [{
                    name: CV.i18n('server-stats.data-points'),
                    type: "scatter",
                    itemStyle: {
                        color: function(params) {
                            var vv = 1;
                            if (params && params.value) {
                                vv = 0.2 + (0.8 * Math.round(100 * params.value[2] / self.max) / 100); //opacity range 0.2 t 1
                            }
                            return "rgba(57,192,200,+" + vv + ")";
                        },

                    },
                    emphasis: {
                        scale: false,
                        itemStyle: {
                            color: 'rgba(57,192,200,1)',
                            shadowColor: "#39C0C8",
                            shadowBlur: 10
                        }
                    },
                    symbolSize: function(val) {
                        var dataIndexValue = 2;
                        if (val[dataIndexValue] === 0) {
                            return 0;
                        }
                        else {
                            return Math.max(5, val[dataIndexValue] * self.getNormalizedSymbolCoefficient());
                        }
                        //return 50;
                    },
                    data: data//pass data here,
                }];

                return graphObject;
            }
            else {
                this.useBasicGraph = true;
                var seriesArr = [];
                var seriesInfo = {};
                for (var z = 0; z < info.data.length; z++) {
                    seriesArr.push(info.data[z][2]);
                    seriesInfo[z + ""] = info.data[z][3];
                }
                this.seriesInfo = seriesInfo;
                graphObject.tooltip.formatter = function(params) {
                    var dd = params.name;
                    dd = self.seriesInfo[dd];
                    dd.avg = 0;
                    if (dd.cn > 0) {
                        dd.avg = Math.round(dd.sum / dd.cn);
                    }
                    else {
                        dd.avg = dd.sum;
                    }
                    var lines = [];

                    if (dd.e) {
                        lines.push('<td>' + countlyCommon.formatNumber(Math.round(dd.e * 100 / dd.sum || 1), 0) + '%</td><td>' + CV.i18n('sidebar.events') + '</td>');
                    }

                    if (dd.s) {
                        lines.push('<td>' + countlyCommon.formatNumber(Math.round(dd.s * 100 / dd.sum || 1), 0) + '%</td><td>' + CV.i18n('sidebar.analytics.sessions') + '</td>');
                    }


                    if (dd.p && self.showPushColumn) {
                        lines.push('<td>' + countlyCommon.formatNumber(Math.round(dd.p * 100 / dd.sum || 1), 0) + '%</td><td>' + CV.i18n('push.plugin-title') + '</td>');
                    }

                    /*if (tt < dd.sum) {
                        lines.push('<td>' + countlyCommon.formatNumber(Math.round((dd.sum - tt) * 100 / dd.sum || 1), 0) + '%</td><td> **Unknown</td>');
                    }*/

                    var retString = '<div class="data-points-tooltip color-cool-gray-100 text-small"><div>' + CV.i18n('common.table.total-users') + '</div><div class="text-big bu-pt-1 bu-pb-3">' + countlyCommon.formatNumber(dd.sum || 0) + '</div>';
                    if (lines.length > 0) {
                        retString += '<div class="color-cool-gray-100 text-small bu-p-0 bu-pt-3 data-points-tooltip-bottom-table"><table><tr>' + lines.join('</tr><tr>') + '</tr></table></div>';
                    }
                    return retString;

                };
                graphObject.xAxis.nameTextStyle.padding = [0, 0, -30, 0];
                graphObject.series = [{"type": "bar", data: seriesArr, name: "data-points"}];
                return graphObject;

            }
        }
    }
});


app.dataPointsView = new countlyVue.views.BackboneWrapper({
    component: DataPointsView,
    vuex: []
});

app.route("/manage/data-points", 'data-points', function() {
    var params = {};
    this.dataPointsView.params = params;
    this.renderWhenReady(this.dataPointsView);
});


app.route("/manage/data-points/*id", 'data-points', function(id) {
    var params = {appid: id};
    this.dataPointsView.params = params;
    this.renderWhenReady(this.dataPointsView);
});

app.addMenu("management", {code: "data-point", permission: "server-stats", url: "#/manage/data-points", text: "server-stats.data-points", priority: 40});