/*global CV, app, countlyVue, countlyConsentManager, countlyCommon, countlyConsentManager, CountlyHelpers, countlyGlobal, countlyAuth */
(function() {
    var FEATURE_NAME = "compliance_hub";
    var UserView = countlyVue.views.create({
        template: CV.T("/compliance-hub/templates/user.html"),
        mixins: [countlyVue.mixins.auth(FEATURE_NAME), countlyVue.mixins.i18n],
        data: function() {
            return {
                userTableDataSource: countlyVue.vuex.getServerDataSource(this.$store, "countlyConsentManager", "userDataResource"),
            };
        },
        beforeCreate: function() {
            this.$store.dispatch("countlyConsentManager/fetchUserDataResource");
        },
        methods: {
            switchToConsentHistory: function(uid) {
                window.location.hash = "#/manage/compliance/history/" + uid;
            },
            deleteUserData: function(uid) {
                var self = this;
                CountlyHelpers.confirm(this.i18n("app-users.delete-userdata-confirm"), "popStyleGreen", function(result) {
                    if (!result) {
                        return true;
                    }
                    countlyConsentManager.service.deleteUserdata(JSON.stringify({ uid: uid }), function(error) {
                        if (error) {
                            CountlyHelpers.alert(error, "red");
                        }
                        else {
                            CountlyHelpers.notify({ type: "success", title: self.i18n("common.success"), message: self.i18n("app-users.userdata-deleted") });
                            self.$store.dispatch("countlyConsentManager/fetchUserDataResource");
                        }
                    });
                }, [self.i18n("app-users.no-dont-purge"), self.i18n("app-users.yes-purge-data")], { title: self.i18n("app-users.purge-confirm-title"), image: "purge-user-data" });
            },
            exportUserData: function(uid) {
                var self = this;
                countlyConsentManager.service.exportUser(JSON.stringify({ uid: uid }), function(error, export_id, task_id) {
                    self.$store.dispatch("countlyConsentManager/fetchUserDataResource");
                    if (error) {
                        CountlyHelpers.alert(error, "red");
                    }
                    else if (export_id) {
                        CountlyHelpers.notify({
                            type: "ok",
                            title: self.i18n("common.success"),
                            message: self.i18n("app-users.export-finished"),
                            info: self.i18n("consent.export-finished-click"),
                            sticky: false,
                            clearAll: true,
                            onClick: function() {
                                var win = window.open(countlyCommon.API_PARTS.data.r + "/app_users/download/" + export_id + "?auth_token=" + countlyGlobal.auth_token + "&app_id=" + countlyCommon.ACTIVE_APP_ID, '_blank');
                                win.focus();
                            }
                        });
                    }
                    else if (task_id) {
                        CountlyHelpers.notify({ type: "ok", title: self.i18n("common.success"), message: self.i18n("app-users.export-started"), sticky: false, clearAll: false });
                    }
                    else {
                        CountlyHelpers.alert(self.i18n("app-users.export-failed"), "red");
                    }
                });
            },
            deleteExport: function(uid) {
                var self = this;
                countlyConsentManager.service.deleteExport(uid, function(error) {
                    self.$store.dispatch("countlyConsentManager/fetchUserDataResource");
                    if (error) {
                        CountlyHelpers.alert(error, "red");
                    }
                    else {
                        CountlyHelpers.notify({ type: "ok", title: self.i18n("common.success"), message: self.i18n("app-users.export-deleted"), sticky: false, clearAll: true });
                    }
                });
            },
            downloadExportedData: function(uid) {
                var win = window.open(countlyCommon.API_PARTS.data.r + "/app_users/download/appUser_" + countlyCommon.ACTIVE_APP_ID + "_" + uid + "?auth_token=" + countlyGlobal.auth_token + "&app_id=" + countlyCommon.ACTIVE_APP_ID, '_blank');
                win.focus();
            }

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
            };
        },
        beforeCreate: function() {
            this.$store.dispatch("countlyConsentManager/uid", this.$route.params.uid);
            this.$store.dispatch("countlyConsentManager/fetchConsentHistoryResource");
        },
        computed: {
            selectedfilterforConsent: {
                get: function() {
                    return this.$store.getters["countlyConsentManager/consentHistoryFilter"].type;
                },
                set: function(newValue) {
                    this.$store.commit("countlyConsentManager/setConsentHistoryFilter", {
                        key: 'type',
                        value: newValue,
                    });
                    this.initializeStoreData();
                }
            },
            selectedfilterforMetrics: {
                get: function() {
                    return this.$store.getters["countlyConsentManager/consentHistoryFilter"].change;
                },
                set: function(newValue) {
                    this.$store.commit("countlyConsentManager/setConsentHistoryFilter", {
                        key: 'change',
                        value: newValue,
                    });
                    this.initializeStoreData();
                }
            },
        },
        methods: {
            dateChanged: function() {
                this.initializeStoreData();
            },
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
                    self.$store.dispatch("countlyConsentManager/fetchConsentHistoryResource");
                });
            },
            tableRowClickHandler: function(row) {
                // Only expand row if text inside of it are not highlighted
                if (window.getSelection().toString().length === 0) {
                    this.$refs.table.$refs.elTable.toggleRowExpansion(row);
                }
            }
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
                        value: 'export_app_user',
                        label: this.i18n("compliance_hub.Export-finished")
                    },
                    {
                        value: 'app_user_deleted',
                        label: this.i18n("compliance_hub.App-user-deleted")
                    },
                    {
                        value: 'export_app_user_deleted',
                        label: this.i18n("compliance_hub.Export-file-deleted")
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
                selectedfilter0: 'all',
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
            dateChanged: function() {
                this.initializeStoreData();
            },
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
                    self.$store.commit("countlyConsentManager/exportHistoryFilter", self.selectedfilter0);
                    self.$store.dispatch("countlyConsentManager/fetchExportHistoryDataResource");

                });
            },
        }

    });
    var MetricsView = countlyVue.views.create({
        template: CV.T("/compliance-hub/templates/metrics.html"),
        data: function() {
            return {
                consentDpChartloaded: false,
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
                this.consentDpChartloaded = false;
                var consentDp = this.$store.getters["countlyConsentManager/_consentDP"];
                var optinYAxisData = [];
                var optoutYAxisData = [];
                for (var key in consentDp.chartData) {
                    optinYAxisData.push(consentDp.chartData[key].i);
                    optoutYAxisData.push(consentDp.chartData[key].o);
                }
                if (optinYAxisData.length > 0) {
                    this.consentDpChartloaded = true;
                }
                else if (consentDp.chartData) {
                    this.consentDpChartloaded = true;
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
                        trend: _bigNumberData && _bigNumberData.o ? _bigNumberData.o.trend === 'u' ? "up" : "down" : "-",
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
            dateChanged: function() {
                this.initializeStoreData();
            },
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
            var tabs = [
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
                    name: "history",
                    component: ConsentView,
                    route: "#/" + countlyCommon.ACTIVE_APP_ID + "/manage/compliance/history"
                }
            ];

            if (countlyAuth.validateGlobalAdmin()) {
                tabs.push({
                    title: "Export/Purge History",
                    name: "actionlogs",
                    component: ExportView,
                    route: "#/" + countlyCommon.ACTIVE_APP_ID + "/manage/compliance/actionlogs"
                });
            }
            return {
                appId: countlyCommon.ACTIVE_APP_ID,
                dynamicTab: (this.$route.params && this.$route.params.tab) || "",
                localTabs: tabs
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
        pluginName: "compliance-hub",
        permission: "compliance_hub",
        component: countlyVue.components.create({
            template: CV.T("/compliance-hub/templates/userConsentHistory.html"),
            mixins: [countlyVue.mixins.i18n],
            data: function() {
                return {
                    userConsentHistoryTableSource: countlyVue.vuex.getServerDataSource(this.$store, "countlyConsentManager", "consentHistoryUserResource"),
                };
            },
            computed: {
                isLoading: function() {
                    return this.$store.getters["countlyConsentManager/isLoading"];
                }
            },
            mounted: function() {
                var userDetails = this.$store.getters["countlyUsers/userDetailsResource/userDetails"];
                if (userDetails.uid) {
                    this.$store.dispatch("countlyConsentManager/fetchConsentHistoryUserResource", userDetails);
                }
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
    app.route("/manage/compliance/*tab/*uid", 'compliance-tab-uid', function(tab, uid) {
        var renderedView = getMainView();
        var params = {
            tab: tab,
            uid: uid
        };
        renderedView.params = params;
        this.renderWhenReady(renderedView);
    });
    app.addSubMenu("management", {code: "compliance", permission: "compliance_hub", pluginName: "compliance-hub", url: "#/manage/compliance/", text: "compliance_hub.title", priority: 60});

})();
