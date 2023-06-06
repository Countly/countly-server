/* global countlyAuth,countlyVue,CV,countlyCommon,countlyDevicesAndTypes,app, countlyGlobal, countlyGraphNotesCommon*/
var DevicesTabView = countlyVue.views.create({
    template: CV.T("/core/device-and-type/templates/devices-tab.html"),
    mounted: function() {
        this.$store.dispatch('countlyDevicesAndTypes/fetchDevices');
    },
    methods: {
        refresh: function() {
            this.$store.dispatch('countlyDevicesAndTypes/fetchDevices');
        },
        numberFormatter: function(row, col, value) {
            return countlyCommon.formatNumber(value, 0);
        }
    },
    computed: {
        data: function() {
            return this.$store.state.countlyDevicesAndTypes.appDevices;
        },
        appDevicesRows: function() {
            return this.data.table || [];
        },
        topData: function() {
            var tops = this.data.tops || {};
            return [
                {
                    "title": CV.i18n('common.bar.top-platform'),
                    "description": CV.i18n('common.bar.top-platform.description'),
                    "data": tops.platform || []
                },
                {
                    "title": CV.i18n('common.bar.top-platform-version'),
                    "description": CV.i18n('common.bar.top-platform-version.description'),
                    "data": tops.version || []
                },
                {
                    "title": CV.i18n('common.bar.top-resolution'),
                    "description": CV.i18n('common.bar.top-resolution.description'),
                    "data": tops.resolution || []
                }
            ];
        },
        pieOptionsNew: function() {
            var self = this;
            return {
                series: [
                    {
                        name: CV.i18n('common.table.new-users'),
                        data: self.data.pie.newUsers,
                        label: {
                            formatter: "{a|" + CV.i18n('common.table.new-users') + "}\n" + (countlyCommon.getShortNumber(self.data.totals.newUsers) || 0),
                            fontWeight: 500,
                            fontSize: 16,
                            fontFamily: "Inter",
                            lineHeight: 24,
                            rich: {
                                a: {
                                    fontWeight: "normal",
                                    fontSize: 14,
                                    lineHeight: 16
                                }
                            }
                        },
                    }
                ]
            };
        },
        pieOptionsTotal: function() {
            var self = this;
            return {
                series: [
                    {
                        name: CV.i18n('common.table.total-sessions'),
                        data: self.data.pie.totalSessions,
                        label: {
                            formatter: "{a|" + CV.i18n('common.table.total-sessions') + "}\n" + (countlyCommon.getShortNumber(self.data.totals.totalSessions) || 0),
                            fontWeight: 500,
                            fontSize: 16,
                            fontFamily: "Inter",
                            lineHeight: 24,
                            rich: {
                                a: {
                                    fontWeight: "normal",
                                    fontSize: 14,
                                    lineHeight: 16
                                }
                            }
                        },
                    }
                ]
            };
        },
        isLoading: function() {
            return this.$store.state.countlyDevicesAndTypes.deviceTypesLoading;
        }
    }
});


var TypesTabView = countlyVue.views.create({
    template: CV.T("/core/device-and-type/templates/types-tab.html"),
    mounted: function() {
        this.$store.dispatch('countlyDevicesAndTypes/fetchDeviceTypes');
    },
    methods: {
        refresh: function() {
            this.$store.dispatch('countlyDevicesAndTypes/fetchDeviceTypes');
        },
        numberFormatter: function(row, col, value) {
            return countlyCommon.formatNumber(value, 0);
        }
    },
    computed: {
        data: function() {
            return this.$store.state.countlyDevicesAndTypes.deviceTypes;
        },
        deviceTypesRows: function() {
            return this.data.table || [];
        },
        pieOptionsNew: function() {
            var self = this;
            self.data.totals = self.data.totals || {};
            return {
                series: [
                    {
                        name: CV.i18n('common.table.new-users'),
                        data: self.data.pie.newUsers,
                        label: {
                            formatter: "{a|" + CV.i18n('common.table.new-users') + "}\n" + (countlyCommon.getShortNumber(self.data.totals.newUsers) || 0),
                            fontWeight: 500,
                            fontSize: 16,
                            fontFamily: "Inter",
                            lineHeight: 24,
                            rich: {
                                a: {
                                    fontWeight: "normal",
                                    fontSize: 14,
                                    lineHeight: 16
                                }
                            }
                        }
                    }
                ]
            };
        },
        pieOptionsTotal: function() {
            var self = this;
            self.data.totals = self.data.totals || {};
            return {
                series: [
                    {
                        name: CV.i18n('common.table.total-sessions'),
                        data: self.data.pie.totalSessions,
                        label: {
                            formatter: "{a|" + CV.i18n('common.table.total-sessions') + "}\n" + (countlyCommon.getShortNumber(self.data.totals.totalSessions) || 0),
                            fontWeight: 500,
                            fontSize: 16,
                            fontFamily: "Inter",
                            lineHeight: 24,
                            rich: {
                                a: {
                                    fontWeight: "normal",
                                    fontSize: 14,
                                    lineHeight: 16
                                }
                            }
                        }
                    }
                ]
            };
        },
        isLoading: function() {
            return this.$store.state.countlyDevicesAndTypes.typeLoading;
        }
    }
});

var AllTabs = countlyVue.views.create({
    template: CV.T('/core/device-and-type/templates/devices-and-types.html'),
    data: function() {
        return {
            appId: countlyCommon.ACTIVE_APP_ID,
            description: CV.i18n('device_type.description'),
            dynamicTab: "devices-tab",
            localTabs: [
                {
                    title: CV.i18n('device_type.devices'),
                    name: "devices-tab",
                    component: DevicesTabView
                },
                {
                    title: CV.i18n('device_type.types'),
                    name: "types-tab",
                    component: TypesTabView
                }
            ]
        };
    },
    computed: {
        tabs: function() {
            return this.localTabs;
        },
        topDropdown: function() {
            if (this.externalLinks && Array.isArray(this.externalLinks) && this.externalLinks.length > 0) {
                return this.externalLinks;
            }
            else {
                return null;
            }
        }
    },
    methods: {

    },
    mixins: [
        countlyVue.container.dataMixin({
            'externalLinks': '/analytics/devices/links'
        })
    ]
});

var TehnologyAnalyticsView = countlyVue.views.create({
    template: CV.T("/core/app-version/templates/technology-analytics.html"),
    mixins: [
        countlyVue.container.tabsMixin({
            "technologyAnalyticsTabs": "/analytics/technology"
        })
    ].concat(countlyVue.container.mixins(["/analytics/technology"])),
    data: function() {
        return {
            selectedTab: (this.$route.params && this.$route.params.tab) || "platforms"
        };
    },
    computed: {
        tabs: function() {
            return this.technologyAnalyticsTabs;
        }
    }
});

var getTechnologyAnalyticsView = function() {
    var tabsVuex = countlyVue.container.tabsVuex(["/analytics/technology"]);
    return new countlyVue.views.BackboneWrapper({
        component: TehnologyAnalyticsView,
        vuex: tabsVuex,
        templates: []
    });
};
app.route("/analytics/technology", "technology", function() {
    var ViewWrapper = getTechnologyAnalyticsView();
    this.renderWhenReady(ViewWrapper);
});


app.route("/analytics/technology/*tab", "technology-tab", function(tab) {
    var ViewWrapper = getTechnologyAnalyticsView();
    var params = {
        tab: tab
    };
    ViewWrapper.params = params;
    this.renderWhenReady(ViewWrapper);
});

countlyVue.container.registerTab("/analytics/technology", {
    priority: 2,
    route: "#/analytics/technology/devices-and-types",
    name: "devices-and-types",
    permission: "core",
    title: CV.i18n('devices.devices-and-types.title'),
    component: AllTabs,
    vuex: [{
        clyModel: countlyDevicesAndTypes
    }]
});


//Tehnology Dashboard widget
var TechnologyHomeWidget = countlyVue.views.create({
    template: CV.T("/core/device-and-type/templates/technologyHomeWidget.html"),
    data: function() {
        return {
            dataBlocks: [],
            isLoading: true,
            headerData: {
                label: CV.i18n("sidebar.analytics.technology"),
                description: CV.i18n("sidebar.analytics.technology-description"),
                linkTo: {"label": CV.i18n('devices.go-to-technology'), "href": "#/analytics/technology/devices-and-types"}
            }
        };
    },
    beforeCreate: function() {
        this.module = countlyDevicesAndTypes.getVuexModule();
        CV.vuex.registerGlobally(this.module);
    },
    beforeDestroy: function() {
        CV.vuex.unregister(this.module.name);
        this.module = null;
    },
    mounted: function() {
        var self = this;
        this.$store.dispatch('countlyDevicesAndTypes/fetchHomeDashboard').then(function() {
            self.dataBlocks = self.calculateAllData();
            self.isLoading = false;
        });
    },
    methods: {
        refresh: function(force) {
            var self = this;
            if (force) {
                self.isLoading = true;
            }
            this.$store.dispatch('countlyDevicesAndTypes/fetchHomeDashboard').then(function() {
                self.dataBlocks = self.calculateAllData();
                self.isLoading = false;
            });
        },
        calculateAllData: function() {
            var tops = {};
            if (this.$store.state && this.$store.state.countlyDevicesAndTypes && this.$store.state.countlyDevicesAndTypes.dashboardTotals) {
                tops = this.$store.state.countlyDevicesAndTypes.dashboardTotals || {};
            }

            var appType = "";
            if (countlyGlobal && countlyGlobal.apps && countlyCommon.ACTIVE_APP_ID && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID]) {
                appType = countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type;
            }


            var dd = [
                {
                    "title": CV.i18n('common.bar.top-platform'),
                    "description": CV.i18n('common.bar.top-platform.description'),
                    "data": tops.os || []
                },
                {
                    "title": CV.i18n('common.bar.top-devices'),
                    "description": CV.i18n('common.bar.top-devices.description'),
                    "data": tops.devices || []
                }];

            if (appType === "web") {
                if (countlyAuth.validateRead('browser')) {
                    dd.push({
                        "title": CV.i18n('common.bar.top-browsers'),
                        "description": CV.i18n('common.bar.top-browsers.description'),
                        "data": tops.browser || []
                    });
                }
            }
            else {
                dd.push({
                    "title": CV.i18n('common.bar.top-app-versions'),
                    "description": CV.i18n('common.bar.top-app-versions.description'),
                    "data": tops.app_versions || []
                });
            }

            dd.push(
                {
                    "title": CV.i18n('common.bar.top-device-types'),
                    "description": CV.i18n('common.bar.top-device-types.description'),
                    "data": tops.device_type || []
                }
            );
            return dd;
        }
    }
});


var GridComponent = countlyVue.views.create({
    template: CV.T('/dashboards/templates/widgets/analytics/widget.html'), //using core dashboard widget template
    mixins: [countlyVue.mixins.customDashboards.global, countlyVue.mixins.customDashboards.widget, countlyVue.mixins.zoom, countlyVue.mixins.hasDrawers("annotation"), countlyVue.mixins.graphNotesCommand],
    components: {
        "drawer": countlyGraphNotesCommon.drawer
    },
    data: function() {
        return {
            showBuckets: false,
            map: {
                "platforms": this.i18n("platforms.title"),
                "app_versions": this.i18n("app-versions.title"),
                "resolutions": this.i18n("resolutions.title"),
                "density": this.i18n("density.title"),
                "carriers": this.i18n("carriers.title"),
                "devices": this.i18n("devices.title"),
                "browser": this.i18n("browser.title"),
                "device_type": this.i18n("device_type.title"),
            },
            tableMap: {
                "u": this.i18n("common.table.total-users"),
                "t": this.i18n("common.total-sessions"),
                "n": this.i18n("common.table.new-users"),
                "resolutions": this.i18n("resolutions.table.resolution"),
                "app_versions": this.i18n("app-versions.table.app-version"),
                "os": this.i18n("platforms.table.platform"),
                "devices": this.i18n("devices.table.device"),
                "density": this.i18n("density.table.density"),
                "carriers": this.i18n("carriers.table.carrier"),
                "browser": this.i18n("browser.table.browser"),
                "device_type": this.i18n("device_type.table.device_type"),
            }
        };
    },
    computed: {
        title: function() {
            if (this.data.title) {
                return this.data.title;
            }
            if (this.data.dashData) {
                return this.i18n("sidebar.analytics.technology") + " (" + (this.map[this.data.breakdowns[0]] || this.data.breakdowns[0]) + ")";
            }
            return this.i18n("sidebar.analytics.technology");
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
        stackedBarTimeSeriesOptions: function() {
            return this.calculateStackedBarTimeSeriesOptionsFromWidget(this.data, this.tableMap);
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
    template: "#technology-drawer",
    data: function() {
        return {

        };
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
            if (this.scope.editedObject.breakdowns.indexOf("devices") !== -1 || this.scope.editedObject.breakdowns.indexOf("resolutions") !== -1 || this.scope.editedObject.breakdowns.indexOf("carriers") !== -1 || this.scope.editedObject.breakdowns.indexOf("density") !== -1) {
                return ['pie-chart', 'bar-chart', 'table'];
            }
            return ['time-series', 'pie-chart', 'bar-chart', 'table'];
        },
        isMultipleMetric: function() {
            var multiple = false;
            var visualization = this.scope.editedObject.visualization;
            if (visualization === 'table') {
                multiple = true;
            }

            return multiple;
        },
        showDisplayType: function() {
            return this.scope.editedObject.data_type === 'technology' && this.scope.editedObject.visualization === 'time-series';
        }
    },
    mounted: function() {
        if (this.scope.editedObject.breakdowns.length === 0) {
            this.scope.editedObject.breakdowns = ['devices'];
        }
    },
    methods: {
        onDataTypeChange: function(v) {
            var widget = this.scope.editedObject;
            this.$emit("reset", {widget_type: widget.widget_type, data_type: v});
        }
    },
    props: {
        scope: {
            type: Object,
            default: function() {
                return {};
            }
        }
    }
});

countlyVue.container.registerData("/custom/dashboards/widget", {
    type: "analytics",
    label: CV.i18n("sidebar.analytics.technology"),
    priority: 1,
    primary: false,
    getter: function(widget) {
        if (widget.widget_type === "analytics" && widget.data_type === "technology") {
            return true;
        }
        else {
            return false;
        }
    },
    templates: [
        {
            namespace: "technology",
            mapping: {
                "drawer": "/core/device-and-type/templates/widgetDrawer.html"
            }
        }
    ],
    drawer: {
        component: DrawerComponent,
        getEmpty: function() {
            return {
                title: "",
                feature: "core",
                widget_type: "analytics",
                data_type: "technology",
                app_count: 'single',
                metrics: [],
                displaytype: "",
                apps: [],
                visualization: "",
                breakdowns: ['devices'],
                custom_period: null,
                bar_color: 1
            };
        },
        beforeLoadFn: function(/*doc, isEdited*/) {
        },
        beforeSaveFn: function(/*doc*/) {
        }
    },
    grid: {
        component: GridComponent
    }

});


countlyVue.container.registerData("/home/widgets", {
    _id: "technology-dashboard-widget",
    permission: "core",
    label: CV.i18n('sidebar.analytics.technology'),
    enabled: {"default": true}, //object. For each type set if by default enabled
    available: {"default": true}, //object. default - for all app types. For other as specified.
    order: 6, //sorted by ascending
    placeBeforeDatePicker: false,
    component: TechnologyHomeWidget,
});