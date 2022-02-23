/*global $, CV, app, countlyVue, countlyConsentManager, countlyCommon, countlyConsentManager */
(function() {
    var UserView = countlyVue.views.create({
        template: CV.T("/compliance-hub/templates/user.html"),
        data: function() {
            return {
                userTableDataSource: countlyVue.vuex.getServerDataSource(this.$store, "countlyConsentManager", "userDataResource"),
            };
        },
        beforeCreate: function() {
            this.$store.dispatch("countlyConsentManager/fetchUserDataResource");
        }
    });
    var ConsentView = countlyVue.views.create({
        template: CV.T("/compliance-hub/templates/consentHistory.html"),
        data: function() {
            return {
                consentHistoryTableSource: countlyVue.vuex.getServerDataSource(this.$store, "countlyConsentManager", "consentHistoryResource"),
                filter0: [
                    {
                        value: 'all',
                        label: this.i18n("common.all")
                    },
                    {
                        value: 'sessions',
                        label: this.i18n("compliance_hub.Sessions")
                    },
                    {
                        value: "events",
                        label: this.i18n('compliance_hub.Events')
                    },
                    {
                        value: 'views',
                        label: this.i18n('compliance_hub.Views')
                    },
                    {
                        value: 'scrolls',
                        label: this.i18n('compliance_hub.Scrolls')
                    },
                    {
                        value: 'clicks',
                        label: this.i18n('compliance_hub.Clicks')
                    },
                    {
                        value: 'forms',
                        label: this.i18n('compliance_hub.Forms')
                    },
                    {
                        value: 'crashes',
                        label: this.i18n("compliance_hub.Crashes")
                    },
                    {
                        value: 'push',
                        label: this.i18n('compliance_hub.Push')
                    },
                    {
                        value: 'attribution',
                        label: this.i18n('compliance_hub.Attribution')
                    },
                    {
                        value: 'users',
                        label: this.i18n('compliance_hub.Users')
                    },
                    {
                        value: 'star-rating',
                        label: this.i18n('compliance_hub.Star-rating')
                    }
                ],
                filter1: [
                    {
                        value: 'all',
                        label: this.i18n("common.all")
                    },
                    {
                        value: 'i',
                        label: this.i18n("consent.opt-i")
                    },
                    {
                        value: 'o',
                        label: this.i18n("consent.opt-o")
                    }
                ],
                selectedfilter1: 'all',
                selectedfilter0: 'sessions',
                selectedfilterforConsent: 'i',
            };
        },
        beforeCreate: function() {
            this.$store.dispatch("countlyConsentManager/fetchConsentHistoryResource");
        },
        computed: {
            selectedfilterforMetrics: {
                get: function() {
                    return this.selectedfilter0;
                },
                set: function(newValue) {
                    this.selectedfilter0 = newValue;
                    this.initializeStoreData();
                }
            },
        },
        methods: {
            initializeStoreData: function() {
                var newValue = this.selectedfilter0;
                if (this.selectedfilter0 === 'all') {
                    newValue = "";
                }
                var self = this;
                countlyConsentManager.initialize().then(function() {
                    var payload = {
                        "segment": newValue
                    };
                    self.$store.dispatch("countlyConsentManager/_bigNumberData", payload);
                    self.$store.dispatch("countlyConsentManager/_consentDP", payload);
                    self.$store.dispatch("countlyConsentManager/_exportDP", payload);
                    self.$store.dispatch("countlyConsentManager/_purgeDP");
                    self.$store.dispatch("countlyConsentManager/_ePData");

                });
            },
        }

    });
    var ExportView = countlyVue.views.create({
        template: CV.T("/compliance-hub/templates/exportHistory.html"),
        data: function() {
            return {
                exportHistoryTableSource: countlyVue.vuex.getServerDataSource(this.$store, "countlyConsentManager", "exportHistoryDataResource"),
                filter0: [
                    {
                        value: 'all',
                        label: this.i18n("common.all")
                    },
                    {
                        value: 'sessions',
                        label: this.i18n("compliance_hub.Sessions")
                    },
                    {
                        value: "events",
                        label: this.i18n('compliance_hub.Events')
                    },
                    {
                        value: 'views',
                        label: this.i18n('compliance_hub.Views')
                    },
                    {
                        value: 'scrolls',
                        label: this.i18n('compliance_hub.Scrolls')
                    },
                    {
                        value: 'clicks',
                        label: this.i18n('compliance_hub.Clicks')
                    },
                    {
                        value: 'forms',
                        label: this.i18n('compliance_hub.Forms')
                    },
                    {
                        value: 'crashes',
                        label: this.i18n("compliance_hub.Crashes")
                    },
                    {
                        value: 'push',
                        label: this.i18n('compliance_hub.Push')
                    },
                    {
                        value: 'attribution',
                        label: this.i18n('compliance_hub.Attribution')
                    },
                    {
                        value: 'users',
                        label: this.i18n('compliance_hub.Users')
                    },
                    {
                        value: 'star-rating',
                        label: this.i18n('compliance_hub.Star-rating')
                    }
                ],
                filter1: [
                    {
                        value: 'all',
                        label: this.i18n("common.all")
                    },
                    {
                        value: 'i',
                        label: this.i18n("consent.opt-i")
                    },
                    {
                        value: 'o',
                        label: this.i18n("consent.opt-o")
                    }
                ],
                selectedfilter1: 'all',
                selectedfilter0: 'sessions',
                selectedfilterforConsent: 'i',
            };
        },
        beforeCreate: function() {
            this.$store.dispatch("countlyConsentManager/fetchExportHistoryDataResource");
        },
        computed: {
            selectedfilterforMetrics: {
                get: function() {
                    return this.selectedfilter0;
                },
                set: function(newValue) {
                    this.selectedfilter0 = newValue;
                    this.initializeStoreData();
                }
            },
        },
        methods: {
            initializeStoreData: function() {
                var newValue = this.selectedfilter0;
                if (this.selectedfilter0 === 'all') {
                    newValue = "";
                }
                var self = this;
                countlyConsentManager.initialize().then(function() {
                    var payload = {
                        "segment": newValue
                    };
                    self.$store.dispatch("countlyConsentManager/_bigNumberData", payload);
                    self.$store.dispatch("countlyConsentManager/_consentDP", payload);
                    self.$store.dispatch("countlyConsentManager/_exportDP", payload);
                    self.$store.dispatch("countlyConsentManager/_purgeDP");
                    self.$store.dispatch("countlyConsentManager/_ePData");

                });
            },
        }

    });
    var MetricsView = countlyVue.views.create({
        template: CV.T("/compliance-hub/templates/metrics.html"),
        data: function() {
            return {
                chartLoading: false,
                filter0: [
                    {
                        value: 'all',
                        label: this.i18n("common.all")
                    },
                    {
                        value: 'sessions',
                        label: this.i18n("compliance_hub.Sessions")
                    },
                    {
                        value: "events",
                        label: this.i18n('compliance_hub.Events')
                    },
                    {
                        value: 'views',
                        label: this.i18n('compliance_hub.Views')
                    },
                    {
                        value: 'scrolls',
                        label: this.i18n('compliance_hub.Scrolls')
                    },
                    {
                        value: 'clicks',
                        label: this.i18n('compliance_hub.Clicks')
                    },
                    {
                        value: 'forms',
                        label: this.i18n('compliance_hub.Forms')
                    },
                    {
                        value: 'crashes',
                        label: this.i18n("compliance_hub.Crashes")
                    },
                    {
                        value: 'push',
                        label: this.i18n('compliance_hub.Push')
                    },
                    {
                        value: 'attribution',
                        label: this.i18n('compliance_hub.Attribution')
                    },
                    {
                        value: 'users',
                        label: this.i18n('compliance_hub.Users')
                    },
                    {
                        value: 'star-rating',
                        label: this.i18n('compliance_hub.Star-rating')
                    }
                ],
                selectedfilter0: 'sessions',
            };

        },
        beforeCreate: function() {
            var self = this;
            var payload = {
                "segment": "sessions"
            };
            countlyConsentManager.initialize().then(function() {
                self.$store.dispatch("countlyConsentManager/_bigNumberData", payload);
                self.$store.dispatch("countlyConsentManager/_consentDP", payload);
                self.$store.dispatch("countlyConsentManager/_exportDP", payload);
                self.$store.dispatch("countlyConsentManager/_purgeDP");
                self.$store.dispatch("countlyConsentManager/_ePData");
            });
        },
        computed: {
            selectedfilterforMetrics: {
                get: function() {
                    return this.selectedfilter0;
                },
                set: function(newValue) {
                    this.selectedfilter0 = newValue;
                    this.initializeStoreData();
                }
            },
            consentDpChart: function() {
                var consentDp = this.$store.getters["countlyConsentManager/_consentDP"];
                var optinYAxisData = [];
                var optoutYAxisData = [];
                for (var key in consentDp.chartData) {
                    optinYAxisData.push(consentDp.chartData[key].i);
                    optoutYAxisData.push(consentDp.chartData[key].o);
                }
                return {
                    series: [
                        {
                            name: "opt-in",
                            data: optinYAxisData,

                        },
                        {
                            name: "opt-out",
                            data: optoutYAxisData
                        }
                    ]
                };
            },
            consentDpChartlegend: function() {
                var _bigNumberData = this.$store.getters["countlyConsentManager/_bigNumberData"];
                var legendData = {
                    show: true,
                    type: "primary",
                    data: [{
                        name: "opt-in",
                        label: this.i18n("consent.opt-i"),
                        value: _bigNumberData && _bigNumberData.i ? this.formatNumber(_bigNumberData.i.total) : 0,
                        percentage: _bigNumberData && _bigNumberData.i ? _bigNumberData.i.change : 0,
                        trend: _bigNumberData && _bigNumberData.i ? _bigNumberData.i.trend === 'u' ? "up" : "down" : "-",
                    },
                    {

                        name: "opt-out",
                        label: this.i18n("consent.opt-o"),
                        value: _bigNumberData && _bigNumberData.o ? this.formatNumber(_bigNumberData.o.total) : 0,
                        percentage: _bigNumberData && _bigNumberData.o ? _bigNumberData.o.change : 0,
                        trend: _bigNumberData && _bigNumberData.o ? _bigNumberData.o.trend === 'u' ? "up" : "down": "-",
                    }
                    ],
                };
                return legendData;
            },
            exportDpChart: function() {
                var exportDP = this.$store.getters["countlyConsentManager/_exportDP"];
                var presentYAxisData = [];
                var previousYAxisData = [];
                for (var key in exportDP.chartData) {
                    presentYAxisData.push(exportDP.chartData[key].e);
                    previousYAxisData.push(exportDP.chartData[key].pe);


                }
                return {
                    series: [
                        {
                            name: "present",
                            data: presentYAxisData,

                        },
                        {
                            name: "Previous",
                            data: previousYAxisData
                        }
                    ]
                };
            },
            purgeDpChart: function() {
                var purgeDp = this.$store.getters["countlyConsentManager/_purgeDP"];
                var purgeDpPresent = [];
                var purgeDpPrevious = [];
                for (var key in purgeDp.chartData) {
                    purgeDpPresent.push(purgeDp.chartData[key].p);
                    purgeDpPrevious.push(purgeDp.chartData[key].pp);
                }
                var data = {
                    series: [
                        {
                            name: "present",
                            data: purgeDpPresent,

                        },
                        {
                            name: "Previous",
                            data: purgeDpPrevious,

                        },
                    ]
                };
                return data;
            },
            userDatalegend: function() {
                var data = this.$store.getters["countlyConsentManager/_ePData"];
                if (data.e) {
                    data.e.title = this.i18n("consent.userdata-exports");
                    data.p.title = this.i18n("consent.userdata-purges");
                    var legendData = {
                        name: data.e.title,
                        label: data.e.title,
                        value: data.e.total,
                        percentage: data.e.change,
                        trend: data.e.trend,
                        class: data.e.trend === 'u' ? 'cly-trend-up' : 'cly-trend-down'
                    };
                    return legendData;
                }
                return {};
            },
            purgeDatalegend: function() {
                var data = this.$store.getters["countlyConsentManager/_ePData"];
                if (data.e) {
                    data.e.title = this.i18n("consent.userdata-exports");
                    data.p.title = this.i18n("consent.userdata-purges");
                    var legendData = {
                        name: data.p.title,
                        label: data.p.title,
                        value: data.e.total,
                        percentage: data.p.change,
                        trend: data.p.trend,
                        class: data.p.trend === 'u' ? 'cly-trend-up' : 'cly-trend-down'
                    };
                    return legendData;
                }
                return {};

            }

        },
        methods: {
            formatTableNumber: function(data) {
                if (Math.abs(data) >= 10000) {
                    return this.getShortNumber(data);
                }
                else {
                    return this.formatNumber(data);
                }
            },
            initializeStoreData: function() {
                this.chartLoading = false;
                var newValue = this.selectedfilter0;
                if (this.selectedfilter0 === 'all') {
                    newValue = "";
                }
                var self = this;
                countlyConsentManager.initialize().then(function() {
                    var payload = {
                        "segment": newValue
                    };
                    self.$store.dispatch("countlyConsentManager/_bigNumberData", payload);
                    self.$store.dispatch("countlyConsentManager/_consentDP", payload);
                    self.$store.dispatch("countlyConsentManager/_exportDP", payload);
                    self.$store.dispatch("countlyConsentManager/_purgeDP");
                    self.$store.dispatch("countlyConsentManager/_ePData");

                });
            },
        }

    });
    var ComplianceMainView = countlyVue.views.create({
        template: CV.T('/compliance-hub/templates/main.html'),
        data: function() {
            return {
                appId: countlyCommon.ACTIVE_APP_ID,
                dynamicTab: (this.$route.params && this.$route.params.tab) || "",
                localTabs: [
                    {
                        title: "Metrics",
                        name: "metrics",
                        component: MetricsView,
                        route: "#/" + countlyCommon.ACTIVE_APP_ID + "/manage/compliance/"
                    },
                    {
                        title: "Users",
                        name: "users",
                        component: UserView,
                        route: "#/" + countlyCommon.ACTIVE_APP_ID + "/manage/compliance/users"
                    },
                    {
                        title: "Consent History",
                        name: "consent/history",
                        component: ConsentView,
                        route: "#/" + countlyCommon.ACTIVE_APP_ID + "/manage/compliance/consent/history"
                    },
                    {
                        title: "Export/Purge History",
                        name: "actionlogs",
                        component: ExportView,
                        route: "#/" + countlyCommon.ACTIVE_APP_ID + "/manage/compliance/actionlogs"
                    },
                ]
            };
        },
        computed: {
            tabs: function() {
                var allTabs = this.localTabs;
                return allTabs;
            }
        }
    });

    countlyVue.container.registerTab("/users/tabs", {
        priority: 3,
        title: CV.i18n("consent.title"),
        name: 'Consent',
        component: countlyVue.components.create({
            template: CV.T("/compliance-hub/templates/userConsentHistory.html"),
            mixins: [countlyVue.mixins.i18n],
            data: function() {
                return {
                    userConsentHistoryTableSource: countlyVue.vuex.getServerDataSource(this.$store, "countlyConsentManager", "consentHistoryUserResource"),
                };
            },
            mounted: function() {
                var userDetails = this.userDetails();
                if (userDetails.uid) {
                    this.$store.dispatch("countlyConsentManager/fetchConsentHistoryUserResource", userDetails);
                }
            },
            methods: {
                userDetails: function() {
                    return this.$store.getters["countlyUsers/userDetailsResource/userDetails"];
                },
            }

        }),
        vuex: [{
            clyModel: countlyConsentManager
        }],
    });
    var getMainView = function() {
        var vuex = [{
            clyModel: countlyConsentManager
        }];

        return new countlyVue.views.BackboneWrapper({
            component: ComplianceMainView,
            vuex: vuex,
        });
    };
    app.route("/manage/compliance/", 'compliance', function() {
        var renderedView = getMainView();
        this.renderWhenReady(renderedView);
    });
    app.route("/manage/compliance/*tab", 'compliance-tab', function(tab) {
        var renderedView = getMainView();
        var params = {
            tab: tab
        };
        renderedView.params = params;
        this.renderWhenReady(renderedView);
    });
    $(document).ready(function() {
        app.addSubMenu("management", {code: "compliance", url: "#/manage/compliance/", text: "compliance_hub.title", priority: 60});
    });

})();