/*global CV, app, countlyVue, countlyConsentManager, countlyCommon, countlyConsentManager */
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
                        label: "Sessions"
                    },
                    {
                        value: "events",
                        label: 'Events'
                    },
                    {
                        value: 'views',
                        label: 'Views'
                    },
                    {
                        value: 'scrolls',
                        label: 'Scrolls'
                    },
                    {
                        value: 'clicks',
                        label: 'Clicks'
                    },
                    {
                        value: 'forms',
                        label: 'Forms'
                    },
                    {
                        value: 'crashes',
                        label: "Crashes"
                    },
                    {
                        value: 'push',
                        label: 'Push'
                    },
                    {
                        value: 'attribution',
                        label: 'Attribution'
                    },
                    {
                        value: 'users',
                        label: 'Users'
                    },
                    {
                        value: 'star-rating',
                        label: 'Star-rating'
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
                        label: "Sessions"
                    },
                    {
                        value: "events",
                        label: 'Events'
                    },
                    {
                        value: 'views',
                        label: 'Views'
                    },
                    {
                        value: 'scrolls',
                        label: 'Scrolls'
                    },
                    {
                        value: 'clicks',
                        label: 'Clicks'
                    },
                    {
                        value: 'forms',
                        label: 'Forms'
                    },
                    {
                        value: 'crashes',
                        label: "Crashes"
                    },
                    {
                        value: 'push',
                        label: 'Push'
                    },
                    {
                        value: 'attribution',
                        label: 'Attribution'
                    },
                    {
                        value: 'users',
                        label: 'Users'
                    },
                    {
                        value: 'star-rating',
                        label: 'Star-rating'
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
        }

    });
    var MetricsView = countlyVue.views.create({
        template: CV.T("/compliance-hub/templates/metrics.html"),
        mixins: [countlyVue.mixins.i18n],
        data: function() {
            return {
                filter0: [
                    {
                        value: 'all',
                        label: this.i18n("common.all")
                    },
                    {
                        value: 'sessions',
                        label: "Sessions"
                    },
                    {
                        value: "events",
                        label: 'Events'
                    },
                    {
                        value: 'views',
                        label: 'Views'
                    },
                    {
                        value: 'scrolls',
                        label: 'Scrolls'
                    },
                    {
                        value: 'clicks',
                        label: 'Clicks'
                    },
                    {
                        value: 'forms',
                        label: 'Forms'
                    },
                    {
                        value: 'crashes',
                        label: "Crashes"
                    },
                    {
                        value: 'push',
                        label: 'Push'
                    },
                    {
                        value: 'attribution',
                        label: 'Attribution'
                    },
                    {
                        value: 'users',
                        label: 'Users'
                    },
                    {
                        value: 'star-rating',
                        label: 'Star-rating'
                    }
                ],
                selectedfilter0: 'sessions',
            };

        },
        beforeCreate: function() {
            countlyConsentManager.initialize();
            var payload = {
                "segment": ""
            };
            this.$store.dispatch("countlyConsentManager/_bigNumberData", payload);
            this.$store.dispatch("countlyConsentManager/_consentDP", payload);
            this.$store.dispatch("countlyConsentManager/_exportDP", payload);
            this.$store.dispatch("countlyConsentManager/_purgeDP");
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
                    optinYAxisData.push[consentDp.chartData[key].i];
                    optoutYAxisData.push(consentDp.chartData[key].o);


                }
                return {
                    series: [
                        {
                            //name: "opt in", //This name will be shown in the legend and tooltip
                            data: optinYAxisData,

                        },
                        {
                            //This name will be shown in the legend and tooltip
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
                        label: "opt-in",
                        value: _bigNumberData.i.total,
                        percentage: _bigNumberData.i.change,
                        trend: _bigNumberData.i.trend === 'u' ? "up" : "down",
                    },
                    {

                        name: "opt-out",
                        label: "opt-out",
                        value: _bigNumberData.o.total,
                        percentage: _bigNumberData.o.change,
                        trend: _bigNumberData.o.trend === 'u' ? "up" : "down",
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
                    presentYAxisData.push[exportDP.chartData[key].e];
                    previousYAxisData.push(exportDP.chartData[key].pe);


                }
                return {
                    series: [
                        {
                            //This name will be shown in the legend and tooltip
                            data: presentYAxisData,

                        },
                        {
                            //This name will be shown in the legend and tooltip
                            //name: "opt out",
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
                    purgeDpPresent.push[purgeDp.chartData[key].p];
                    purgeDpPrevious.push(purgeDp.chartData[key].pp);
                }
                return {
                    series: [
                        {
                            //name: "opt in", //This name will be shown in the legend and tooltip
                            data: purgeDpPresent,

                        },
                        {
                            //name: "opt in", //This name will be shown in the legend and tooltip
                            data: purgeDpPrevious,

                        },
                    ]
                };
            }

        },
        methods: {
            initializeStoreData: function() {
                var newValue = this.selectedfilter0;
                if (this.selectedfilter0 === this.i18n("common.all")) {
                    newValue = "";
                }
                countlyConsentManager.initialize();
                var payload = {
                    "segment": newValue
                };
                this.$store.dispatch("countlyConsentManager/_bigNumberData", payload);
                this.$store.dispatch("countlyConsentManager/_consentDP", payload);
                this.$store.dispatch("countlyConsentManager/_exportDP", payload);
                this.$store.dispatch("countlyConsentManager/_purgeDP");


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
    app.route("/manage/compliance/*tab", 'compliance', function(tab) {
        var renderedView = getMainView();
        var params = {
            tab: tab
        };
        renderedView.params = params;
        this.renderWhenReady(renderedView);
    });

})();