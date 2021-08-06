/*global countlyAuth, app, CV, countlyVue, countlyCommon, countlySources, countlyGlobal, $ */
(function() {
    var FEATURE_NAME = "sources";

    var SourcesDetailTableContainer = countlyVue.views.create({
        template: CV.T("/sources/templates/extend-table.html"),
        props: {
            rows: {
                type: Object,
                default: {}
            }
        },
        computed: {
            rowsComputed: function() {
                var computedArray = [];
                for (var el in this.rows) {
                    computedArray.push(el);
                }
                return computedArray;
            }
        }
    });

    var SourcesTabContainer = countlyVue.views.create({
        template: CV.T("/sources/templates/sources-tab.html"),
        components: {
            "extend-table": SourcesDetailTableContainer
        },
        data: function() {
            return {
                sourcesData: [],
                pieSourcesNewUsers: {
                    series: [
                        {
                            name: CV.i18n('common.table.new-users'),
                            data: [],
                            label: {
                                formatter: function() {
                                    return CV.i18n('common.table.new-users') + "\n";
                                }
                            },
                        }
                    ]
                },
                pieSourcesTotalSessions: {
                    series: [
                        {
                            name: CV.i18n('common.table.total-sessions'),
                            data: [],
                            label: {
                                formatter: function() {
                                    return CV.i18n('common.table.total-sessions') + "\n";
                                }
                            },
                        }
                    ]
                },
                dataMap: {},
                sourcesDetailData: {}
            };
        },
        methods: {
            sourcesDetailDataMap: function() {
                var self = this;
                var cleanData = countlySources.getData(true).chartData;
                var source;
                for (var i in cleanData) {
                    source = countlySources.getSourceName(cleanData[i].sources);
                    if (!self.dataMap[source]) {
                        self.dataMap[source] = {};
                    }
                    self.dataMap[source][cleanData[i].sources] = cleanData[i];
                }
                this.sourcesDetailData = self.dataMap;
            },
            sourcesFnKey: function(row) {
                return row.sources;
            },
            handleSourcesCommand: function(e) {
                switch (e) {
                case 'redirect-drill': {
                    window.location.hash = "/drill/" + JSON.stringify({"event": "[CLY]_session", "dbFilter": {}, "byVal": "up.src"});
                    break;
                }
                }
            },
            chartsDataPrepare: function(sourcesData) {
                var self = this;

                var totalSessionSeriesData = [{ name: CV.i18n('common.table.no-data'), value: 0 }];
                var newUsersSeriesData = [{ name: CV.i18n('common.table.no-data'), value: 0 }];
                var sumOfTotalSession = 0;
                var sumOfNewUsers = 0;

                if (typeof sourcesData.chartDPTotal !== "undefined" && typeof sourcesData.chartDPTotal.dp !== "undefined") {
                    totalSessionSeriesData = [];
                    for (var i = 0; i < sourcesData.chartDPTotal.dp.length; i++) {
                        totalSessionSeriesData.push({value: sourcesData.chartDPTotal.dp[i].data[0][1], name: sourcesData.chartDPTotal.dp[i].label});
                        sumOfTotalSession += sourcesData.chartDPTotal.dp[i].data[0][1];
                    }
                }

                if (typeof sourcesData.chartDPNew !== "undefined" && typeof sourcesData.chartDPNew.dp !== "undefined") {
                    newUsersSeriesData = [];
                    for (var j = 0; j < sourcesData.chartDPNew.dp.length; j++) {
                        newUsersSeriesData.push({value: sourcesData.chartDPNew.dp[j].data[0][1], name: sourcesData.chartDPNew.dp[j].label});
                        sumOfNewUsers += sourcesData.chartDPNew.dp[j].data[0][1];
                    }
                }

                // set charts center label
                self.pieSourcesTotalSessions.series[0].label.formatter = function() {
                    return CV.i18n('common.table.total-sessions') + "\n" + countlyCommon.getShortNumber(sumOfTotalSession || 0);
                };
                self.pieSourcesNewUsers.series[0].label.formatter = function() {
                    return CV.i18n('common.table.new-users') + "\n " + countlyCommon.getShortNumber(sumOfNewUsers || 0);
                };

                return {
                    t: {
                        data: totalSessionSeriesData
                    },
                    n: {
                        data: newUsersSeriesData
                    }
                };
            },
            refresh: function() {
                var self = this;
                $.when(countlySources.initialize())
                    .then(function() {
                        self.sourcesData = countlySources.getData();
                        self.sourcesDetailDataMap();

                        // calculate charts data for total session and new users charts
                        var chartsData = self.chartsDataPrepare(self.sourcesData);
                        self.pieSourcesTotalSessions.series[0].data = chartsData.t.data;
                        self.pieSourcesNewUsers.series[0].data = chartsData.n.data;
                    });
            }
        },
        beforeCreate: function() {
            var self = this;
            $.when(countlySources.initialize())
                .then(function() {
                    // get fetched sources datas
                    self.sourcesData = countlySources.getData();
                    self.sourcesDetailDataMap();

                    // calculate charts data for total session and new users charts
                    var chartsData = self.chartsDataPrepare(self.sourcesData);
                    self.pieSourcesTotalSessions.series[0].data = chartsData.t.data;
                    self.pieSourcesNewUsers.series[0].data = chartsData.n.data;
                });
        }
    });

    var KeywordsTabContainer = countlyVue.views.create({
        template: CV.T("/sources/templates/keywords-tab.html"),
        data: function() {
            return {
                searchedTermsData: [],
                searchTermsTop3: [
                    { percentage: 0, label: CV.i18n('common.table.no-data'), value: 0 },
                    { percentage: 0, label: CV.i18n('common.table.no-data'), value: 0 },
                    { percentage: 0, label: CV.i18n('common.table.no-data'), value: 0 }
                ]
            };
        },
        methods: {
            getTop3: function(data) {
                var totalsArray = [];
                var sum = 0;
                for (var i = 0; data.length > i; i++) {
                    totalsArray.push([i, data[i].t]);
                    sum += data[i].t;
                }
                totalsArray.sort(function(a, b) {
                    return a[1] - b[1];
                }).reverse();

                if (totalsArray.length === 0) {
                    return [
                        { percentage: 0, label: CV.i18n('common.table.no-data'), value: 0 },
                        { percentage: 0, label: CV.i18n('common.table.no-data'), value: 0 },
                        { percentage: 0, label: CV.i18n('common.table.no-data'), value: 0 }
                    ];
                }

                return [
                    {percentage: Math.round((data[totalsArray[0][0]].t / sum) * 100), label: data[totalsArray[0][0]]._id, value: countlyCommon.getShortNumber(totalsArray[0][1] || 0)},
                    {percentage: Math.round((data[totalsArray[1][0]].t / sum) * 100), label: data[totalsArray[1][0]]._id, value: countlyCommon.getShortNumber(totalsArray[1][1] || 0)},
                    {percentage: Math.round((data[totalsArray[2][0]].t / sum) * 100), label: data[totalsArray[2][0]]._id, value: countlyCommon.getShortNumber(totalsArray[2][1] || 0)}
                ];
            },
            refresh: function() {
                var self = this;
                $.when(countlySources.initializeKeywords())
                    .then(function() {
                        self.searchedTermsData = countlySources.getKeywords();
                        self.searchTermsTop3 = self.getTop3(self.searchedTermsData);
                    });
            }
        },
        beforeCreate: function() {
            var self = this;
            $.when(countlySources.initializeKeywords())
                .then(function() {
                    // calculate top 3 search terms data
                    self.searchedTermsData = countlySources.getKeywords();
                    self.searchTermsTop3 = self.getTop3(self.searchedTermsData);
                });
        }
    });

    var SourcesContainer = countlyVue.views.create({
        template: CV.T("/sources/templates/main.html"),
        mixins: [],
        data: function() {
            return {
                tab: (this.$route.params && this.$route.params.tab) || 'sources',
                isWeb: countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type === "web",
                appId: countlyCommon.ACTIVE_APP_ID,
                tabs: [
                    {
                        title: CV.i18n('sources.title'),
                        name: 'sources',
                        component: SourcesTabContainer
                    }
                ]
            };
        },
        created: function() {
            if (this.isWeb) {
                this.tabs.push({
                    title: CV.i18n('keywords.title'),
                    name: 'keywords',
                    component: KeywordsTabContainer
                });
            }
        }
    });

    var SourcesView = new countlyVue.views.BackboneWrapper({
        component: SourcesContainer
    });

    if (countlyAuth.validateRead(FEATURE_NAME)) {
        app.route("/analytics/acquisition", 'acqusition', function() {
            this.renderWhenReady(SourcesView);
        });
    }

    $(document).ready(function() {
        if (countlyAuth.validateRead(FEATURE_NAME) && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type === "web") {
            app.addSubMenuForType("web", "analytics", {code: "analytics-acquisition", url: "#/analytics/acquisition", text: "sidebar.acquisition", priority: 90});
        }
        else if (countlyAuth.validateRead(FEATURE_NAME) && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type === "mobile") {
            app.addSubMenuForType("mobile", "analytics", {code: "analytics-acquisition", url: "#/analytics/acquisition", text: "sidebar.acquisition", priority: 90});
        }
    });

})();