/* global countlyVue,CV,countlyCommon,countlyDevicesAndTypes,app, countlyGlobal*/
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
            return this.$store.state.countlyDevicesAndTypes.isLoading;
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
            return this.$store.state.countlyDevicesAndTypes.isLoading;
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
    route: "#/" + countlyCommon.ACTIVE_APP_ID + "/analytics/technology/devices-and-types",
    name: "devices-and-types",
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
        });
    },
    methods: {
        refresh: function() {
            var self = this;
            this.$store.dispatch('countlyDevicesAndTypes/fetchHomeDashboard').then(function() {
                self.dataBlocks = self.calculateAllData();
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
                    "title": CV.i18n('common.bar.top-platform_'),
                    "description": CV.i18n('common.bar.top-platform.description'),
                    "data": tops.os || []
                },
                {
                    "title": CV.i18n('common.bar.top-devices'),
                    "description": CV.i18n('common.bar.top-devices.description'),
                    "data": tops.devices || []
                }];

            if (appType === "web") {
                dd.push({
                    "title": CV.i18n('common.bar.top-browsers'),
                    "description": CV.i18n('common.bar.top-browsers.description'),
                    "data": tops.browser || []
                });
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

countlyVue.container.registerData("/home/widgets", {
    _id: "technology-dashboard-widget",
    label: CV.i18n('sidebar.analytics.technology'),
    description: CV.i18n('sidebar.analytics.technology-description'),
    enabled: {"default": true}, //object. For each type set if by default enabled
    available: {"default": true}, //object. default - for all app types. For other as specified.
    order: 6, //sorted by ascending
    placeBeforeDatePicker: false,
    component: TechnologyHomeWidget,
    linkTo: {"label": CV.i18n('devices.go-to-technology'), "href": "#/analytics/technology/devices-and-types"}
});