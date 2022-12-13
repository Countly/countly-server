/*global app, CV, countlyVue, countlyCommon, countlySources, countlyGlobal, $, countlyGraphNotesCommon */
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
                sourcesDetailData: {},
                isLoading: false
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
                self.pieSourcesTotalSessions.series[0].label = {
                    formatter: "{a|" + CV.i18n('common.table.total-sessions') + "}\n" + countlyCommon.getShortNumber(sumOfTotalSession || 0),
                    textAlign: "center",
                    fontWeight: 500,
                    fontSize: 16,
                    lineHeight: 24,
                    rich: {
                        a: {
                            fontWeight: 400,
                            fontSize: 14,
                            lineHeight: 20
                        }
                    }
                };

                self.pieSourcesNewUsers.series[0].label = {
                    formatter: "{a|" + CV.i18n('common.table.new-users') + "}\n" + countlyCommon.getShortNumber(sumOfNewUsers || 0),
                    textAlign: "center",
                    fontWeight: 500,
                    fontSize: 16,
                    lineHeight: 24,
                    rich: {
                        a: {
                            fontWeight: 400,
                            fontSize: 14,
                            lineHeight: 20
                        }
                    }
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
            refresh: function(force) {
                var self = this;
                if (force) {
                    $.when(countlySources.initialize(true))
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
            handleTableRowClick: function(row) {
                // Only expand row if text inside of it are not highlighted
                if (window.getSelection().toString().length === 0) {
                    this.$refs.table.$refs.elTable.toggleRowExpansion(row);
                }
            }
        },
        dateChange: function() {
            this.refresh(true);
        },
        computed: {
            topDropdown: function() {
                if (this.externalLinks && Array.isArray(this.externalLinks) && this.externalLinks.length > 0) {
                    return this.externalLinks;
                }
                else {
                    return null;
                }
            },
        },
        mixins: [
            countlyVue.container.dataMixin({
                'externalLinks': '/analytics/sources/links'
            }),
            countlyVue.mixins.commonFormatters
        ],
        created: function() {
            var self = this;
            this.isLoading = true;
            $.when(countlySources.initialize(true))
                .then(function() {
                    // get fetched sources datas
                    self.isLoading = false;
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
                ],
                isLoading: false
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
        mixins: [countlyVue.mixins.commonFormatters],
        created: function() {
            var self = this;
            this.isLoading = true;
            $.when(countlySources.initializeKeywords())
                .then(function() {
                    // calculate top 3 search terms data
                    self.isLoading = false;
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
        watch: {
            tab: function(newVal) {
                if (newVal === 'sources') {
                    window.location.hash = "#/analytics/acquisition";
                }
            }
        },
        created: function() {
            if (this.isWeb) {
                this.tabs.push({
                    title: CV.i18n('keywords.title'),
                    name: 'keywords',
                    component: KeywordsTabContainer
                });
            }
            if (app.redirectFromHome) {
                this.tab = 'keywords';
            }
        }
    });
    var SourcesView = new countlyVue.views.BackboneWrapper({
        component: SourcesContainer
    });


    app.route("/analytics/acquisition", 'acqusition', function() {
        app.redirectFromHome = false;
        this.renderWhenReady(SourcesView);
    });

    app.route("/analytics/acquisition/*search-terms", 'acqusition', function() {
        app.redirectFromHome = true;
        this.renderWhenReady(SourcesView);
    });

    var WidgetComponent = countlyVue.views.create({
        template: CV.T('/dashboards/templates/widgets/analytics/widget.html'), //using core dashboard widget template
        mixins: [countlyVue.mixins.customDashboards.global,
            countlyVue.mixins.customDashboards.widget,
            countlyVue.mixins.customDashboards.apps,
            countlyVue.mixins.zoom,
            countlyVue.mixins.hasDrawers("annotation"),
            countlyVue.mixins.graphNotesCommand
        ],
        components: {
            "drawer": countlyGraphNotesCommon.drawer
        },
        data: function() {
            return {
                map: {
                    "sources": this.i18n("sources.title")
                },
                tableMap: {
                    "u": this.i18n("common.table.total-users"),
                    "t": this.i18n("common.total-sessions"),
                    "n": this.i18n("common.table.new-users"),
                    "sources": this.i18n("sources.source"),
                }
            };
        },
        computed: {
            title: function() {
                if (this.data.title) {
                    return this.data.title;
                }

                return this.i18n("sources.title");
            },
            showBuckets: function() {
                return false;
            },
            metricLabels: function() {
                return [];
            },
            getTableData: function() {
                return this.calculateTableDataFromWidget(this.data);
            },
            tableStructure: function() {
                return this.calculateTableColsFromWidget(this.data, this.tableMap);
            },
            stackedBarOptions: function() {
                return this.calculateStackedBarOptionsFromWidget(this.data, this.tableMap);
            },
            pieGraph: function() {
                return this.calculatePieGraphFromWidget(this.data, this.tableMap);
            }
        },
        methods: {
            refresh: function() {
                this.refreshNotes();
            }
        }
    });

    var DrawerComponent = countlyVue.views.create({
        template: "#sources-drawer",
        props: {
            scope: {
                type: Object
            }
        },
        data: function() {
            return {};
        },
        computed: {
            metrics: function() {
                return [
                    { label: this.i18n("common.table.total-users"), value: "u" },
                    { label: this.i18n("common.table.new-users"), value: "n" },
                    { label: this.i18n("common.total-sessions"), value: "t" }
                ];
            },
            enabledVisualizationTypes: function() {
                return ['pie-chart', 'bar-chart', 'table'];
            },
            isMultipleMetric: function() {
                var multiple = false;
                var visualization = this.scope.editedObject.visualization;
                if (visualization === 'table') {
                    multiple = true;
                }

                return multiple;
            }
        },
        methods: {
            onDataTypeChange: function(v) {
                var widget = this.scope.editedObject;
                this.$emit("reset", {widget_type: widget.widget_type, data_type: v});
            }
        }
    });

    countlyVue.container.registerData("/custom/dashboards/widget", {
        type: "analytics",
        label: CV.i18nM("sources.title"),
        priority: 1,
        primary: false,
        getter: function(widget) {
            return widget.widget_type === "analytics" && widget.data_type === "sources";
        },
        templates: [
            {
                namespace: "sources",
                mapping: {
                    "drawer": "/sources/templates/widgetDrawer.html"
                }
            }
        ],
        drawer: {
            component: DrawerComponent,
            getEmpty: function() {
                return {
                    title: "",
                    feature: FEATURE_NAME,
                    widget_type: "analytics",
                    app_count: 'single',
                    data_type: "sources",
                    apps: [],
                    visualization: "table",
                    custom_period: null,
                    metrics: ["t"],
                    bar_color: 1,
                    isPluginWidget: true
                };
            },
            beforeSaveFn: function() {
            }
        },
        grid: {
            component: WidgetComponent,
            onClick: function() {}
        }
    });



    var KeywordsDashboardWidget = countlyVue.views.create({
        template: CV.T("/sources/templates/searchedTermsHomeWidget.html"),
        data: function() {
            return {
                searchTermsTop3: [
                    { percentage: 0, label: CV.i18n('common.table.no-data'), value: 0 },
                    { percentage: 0, label: CV.i18n('common.table.no-data'), value: 0 },
                    { percentage: 0, label: CV.i18n('common.table.no-data'), value: 0 }
                ],
                isLoading: true,
                headerData: {
                    label: CV.i18n("keywords.top_terms"),
                    description: CV.i18n("sources.description"),
                    linkTo: {"label": CV.i18n('keywords.go-to-keywords'), "href": "#/analytics/acquisition/search-terms"},
                }
            };
        },
        mounted: function() {
            var self = this;
            $.when(countlySources.initializeKeywords()).then(function() {
                self.searchTermsTop3 = self.calculateAllData();
                self.isLoading = false;
            });
        },
        methods: {
            refresh: function(force) {
                var self = this;
                if (force) {
                    self.isLoading = true;
                }
                $.when(countlySources.initializeKeywords()).then(function() {
                    self.searchTermsTop3 = self.calculateAllData();
                    self.isLoading = false;
                });
            },
            calculateAllData: function() {
                var data = countlySources.getKeywords();
                var totalsArray = [];
                var sum = 0;
                for (var i = 0; data.length > i; i++) {
                    totalsArray.push([i, data[i].t]);
                    sum += data[i].t;
                }
                totalsArray.sort(function(a, b) {
                    return a[1] - b[1];
                }).reverse();

                var totalsData = [];
                for (var z = 0; z < 3; z++) {
                    if (totalsArray[z]) {
                        totalsData.push({percentage: Math.round((data[totalsArray[z][0]].t / sum) * 100), label: data[totalsArray[z][0]]._id, value: countlyCommon.getShortNumber(totalsArray[z][1] || 0)});
                    }
                    else {
                        totalsData.push({ percentage: 0, label: CV.i18n('common.table.no-data'), value: 0 });
                    }
                }
                return totalsData;
            }
        }
    });

    var SourcesDashboardWidget = countlyVue.views.create({
        template: CV.T("/sources/templates/sourcesHomeWidget.html"),
        data: function() {
            return {
                sourceItems: [],
                isLoading: true,
                headerData: {
                    label: CV.i18n("sidebar.acquisition"),
                    description: CV.i18n("sources.description"),
                    linkTo: {"label": CV.i18n('sources.go-to-acquisition'), "href": "#/analytics/acquisition"},
                }
            };
        },
        mounted: function() {
            var self = this;

            $.when(countlySources.initialize(true)).then(function() {
                self.calculateAllData();
                self.isLoading = false;
            });
        },
        methods: {
            refresh: function(force) {
                var self = this;
                if (force) {
                    self.isLoading = true;
                }
                $.when(countlySources.initialize(true)).then(function() {
                    self.calculateAllData();
                    self.isLoading = false;
                });
            },
            calculateAllData: function() {
                var blocks = [];
                var data = countlySources.getData() || {};
                data = data.chartData || [];

                var total = 0;
                var values = [];
                var cn = 5;

                for (var p = 0; p < data.length; p++) {
                    total = total + data[p].t;
                    if (values.length < 5) {
                        values.push({"name": data[p].sources, "t": data[p].t});
                        values = values.sort(function(a, b) {
                            return a.t - b.t;
                        });
                    }
                    else {
                        if (values[cn - 1].t < data[p].t) {
                            values[cn - 1] = {"name": data[p].sources, "t": data[p].t};
                            values = values.sort(function(a, b) {
                                return a.t - b.t;
                            });
                        }
                    }
                }

                for (var k = 0; k < values.length; k++) {
                    var percent = Math.round((values[k].t || 0) * 1000 / (total || 1)) / 10;
                    blocks.push({
                        "name": values[k].name,
                        "value": countlyCommon.getShortNumber(values[k].t || 0),
                        "percent": percent,
                        "percentText": percent + "% " + CV.i18n('common.of-total'),
                        "info": "some description",
                        "color": "#CDAD7A",
                        "value_": values[k].t
                    });
                }
                blocks.sort(function(a, b) {
                    return parseFloat(b.value_) - parseFloat(a.value_);
                });
                this.sourceItems = blocks;
            }
        }
    });

    countlyVue.container.registerData("/home/widgets", {
        _id: "sources-dashboard-widget",
        permission: FEATURE_NAME,
        label: CV.i18n('sidebar.acquisition'),
        enabled: {"default": true}, //object. For each type set if by default enabled
        available: {"default": false, "mobile": true, "web": true}, //object. default - for all app types. For other as specified.
        placeBeforeDatePicker: false,
        order: 3,
        component: SourcesDashboardWidget
    });

    countlyVue.container.registerData("/home/widgets", {
        _id: "keywords-dashboard-widget",
        permission: FEATURE_NAME,
        label: CV.i18n('keywords.top_terms'),
        enabled: {"default": true}, //object. For each type set if by default enabled
        available: {"default": false, "web": true}, //object. default - for all app types. For other as specified.
        placeBeforeDatePicker: false,
        order: 5,
        width: 6,
        component: KeywordsDashboardWidget
    });

    app.addSubMenuForType("web", "analytics", {code: "analytics-acquisition", permission: FEATURE_NAME, url: "#/analytics/acquisition", text: "sidebar.acquisition", priority: 28});
    app.addSubMenuForType("mobile", "analytics", {code: "analytics-acquisition", permission: FEATURE_NAME, url: "#/analytics/acquisition", text: "sidebar.acquisition", priority: 28});
})();