/* global countlyVue,CV,countlyCommon,countlyDevicesAndTypes,*/
var DevicesTabView = countlyVue.views.create({
    template: CV.T("/core/device-and-type/templates/devices-tab.html"),
    mounted: function() {
        this.$store.dispatch('countlyDevicesAndTypes/fetchDevices');
    },
    computed: {
        data: function() {
            return this.$store.state.countlyDevicesAndTypes.appDevices;
        },
        appDevicesRows: function() {
            return this.data.table || [];

        },
        selectedDatePeriod: {
            get: function() {
                return this.$store.state.countlyDevicesAndTypes.selectedDatePeriod;
            },
            set: function(value) {
                this.$store.dispatch('countlyDevicesAndTypes/onSetSelectedDatePeriod', value);
                this.$store.dispatch('countlyDevicesAndTypes/fetchDevices');
            }
        },
        topData: function() {
            var tops = this.data.tops || {};
            return [
                {
                    "title": CV.i18n('common.bar.top-platform'),
                    "description": CV.i18n('common.bar.top-platform.description'),
                    "data": tops["platform"] || []
                },
                {
                    "title": CV.i18n('common.bar.top-platform-version'),
                    "description": CV.i18n('common.bar.top-platform-version.description'),
                    "data": tops["version"] || []
                },
                {
                    "title": CV.i18n('common.bar.top-resolution'),
                    "description": CV.i18n('common.bar.top-resolution.description'),
                    "data": tops["resolution"] || []
                }
            ];
        },
        pieOptionsNew: function() {
            var self = this;
            return {
                series: [
                    {
                        name: CV.i18n('common.table.new-users'),
                        data: self.data.pie["newUsers"],
                        label: {
                            formatter: function() {
                                return CV.i18n('common.table.new-users') + "</br>" + countlyCommon.getShortNumber(self.data.totals["newUsers"] || 0);
                            }
                        },
                        center: ["25%", "50%"] //Center should be passed as option
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
                        data: self.data.pie["totalSessions"],
                        label: {
                            formatter: function() {
                                return CV.i18n('common.table.total-sessions') + "</br>" + countlyCommon.getShortNumber(self.data.totals["totalSessions"]);
                            }
                        },
                        center: ["25%", "50%"] //Center should be passed as option
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
    mixins: [countlyVue.mixins.hasDrawers("main")],
    data: function() {
        return {
            appId: countlyCommon.ACTIVE_APP_ID,
            description: CV.i18n('device_type.description'),
            dynamicTab: "devices-tab",
            localTabs: [
                {
                    title: CV.i18n('devices.title'),
                    name: "devices-tab",
                    component: DevicesTabView
                },
                {
                    title: CV.i18n('device_type.title'),
                    name: "types-tab",
                    component: countlyVue.views.create({
                        template: CV.T("/core/device-and-type/templates/types-tab.html"),
                        mounted: function() {
                            this.$store.dispatch('countlyDevicesAndTypes/fetchDeviceTypes');
                        },
                        computed: {
                            data: function() {
                                return this.$store.state.countlyDevicesAndTypes.deviceTypes;
                            },
                            deviceTypesRows: function() {
                                return this.data.table || [];

                            },
                            selectedDatePeriod: {
                                get: function() {
                                    return this.$store.state.countlyDevicesAndTypes.selectedDatePeriod;
                                },
                                set: function(value) {
                                    this.$store.dispatch('countlyDevicesAndTypes/onSetSelectedDatePeriod', value);
                                    this.$store.dispatch('countlyDevicesAndTypes/fetchDeviceTypes');
                                }
                            },
                            pieOptionsNew: function() {
                                var self = this;
                                return {
                                    series: [
                                        {
                                            name: CV.i18n('common.table.new-users'),
                                            data: self.data.pie["newUsers"],
                                            label: {
                                                formatter: function() {
                                                    return CV.i18n('common.table.new-users') + " " + countlyCommon.getShortNumber(self.data.totals["newUsers"] || 0);
                                                }
                                            },
                                            center: ["25%", "50%"] //Center should be passed as option
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
                                            data: self.data.pie["totalSessions"],
                                            label: {
                                                formatter: function() {
                                                    return CV.i18n('common.table.total-sessions') + " " + countlyCommon.getShortNumber(self.data.totals["totalSessions"]);
                                                }
                                            },
                                            center: ["25%", "50%"] //Center should be passed as option
                                        }
                                    ]
                                };
                            },
                            isLoading: function() {
                                return this.$store.state.countlyDevicesAndTypes.isLoading;
                            }
                        }
                    })
                }
            ]
        };
    },
    computed: {
        tabs: function() {
            return this.localTabs;
        }
    },
    methods: {

    }
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


app.route("/analytics/technology", "technology", function() {
    var tabsVuex = countlyVue.container.tabsVuex(["/analytics/technology"]);
    var ViewWrapper = new countlyVue.views.BackboneWrapper({
        component: TehnologyAnalyticsView,
        vuex: tabsVuex,
        templates: []
    });
    this.renderWhenReady(ViewWrapper);
});


countlyVue.container.registerTab("/analytics/technology", {
    priority: 2,
    name: "devices_and_types",
    title: "Devices and types",
    component: AllTabs,
    vuex: [{
        clyModel: countlyDevicesAndTypes
    }]
});