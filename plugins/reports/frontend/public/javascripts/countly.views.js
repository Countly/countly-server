/*global
    Handlebars,
    CountlyHelpers,
    countlyGlobal,
    countlyAuth,
    countlyView,
    countlyEvent,
    countlyReporting,
    jQuery,
    app,
    $,
    _,
    T
 */
(function() {
    var FEATURE_NAME = "reports";

    var TableView = countlyVue.views.BaseView.extend({
        template: '#reports-table',
        computed: {
            tableRows: function () {
                var rows = this.$store.getters["countlyReports/table/all"];
                return rows;
            },
        },
        data: function () {
            var tableDynamicCols = [{
                value: "emails",
                label: jQuery.i18n.map['reports.emails'],
                required: true, 
            },{
                value: "timeColumn",
                label: jQuery.i18n.map['reports.time'],
                required: true, 
            }]; 
            return {
                localTableTrackedFields: ['enabled'],
                isAdmin: countlyGlobal.member.global_admin,
                tableDynamicCols,
            };
        },
        methods: {
            handleHookEditCommand: function(command, scope) {
                switch (command) {
                    case "edit-comment":
                        /* eslint-disable */
                        var data = {...scope.row};
                        /* eslint-enable */
                        delete data.operation;
                        delete data.triggerEffectColumn;
                        delete data.nameDescColumn;
                        this.$parent.$parent.openDrawer("home", data);
                        break;
                    case "delete-comment":
                        var hookID = scope.row._id;
                        var name = scope.row.name;
                        var self = this;
                        return CountlyHelpers.confirm(jQuery.i18n.prop("hooks.delete-confirm", "<b>" + name + "</b>"), "popStyleGreen", function (result) {
                            if (result) {
                                hooksPlugin.deleteHook(hookID, function () {
                                    self.$store.dispatch("countlyReports/table/fetchAll")
                                });
                            }
                        }, [jQuery.i18n.map["common.no-dont-delete"], jQuery.i18n.map["hooks.yes-delete-hook"]], {title: jQuery.i18n.map["hooks.delete-confirm-title"], image: "delete-an-event"});
                        break;
                    case "send-comment":
                        var overlay = $("#overlay").clone();
                        overlay.show();
                        $.when(countlyReporting.send(scope.row._id)).always(function(data) {
                            overlay.hide();
                            if (data && data.result === "Success") {
                                CountlyHelpers.alert(jQuery.i18n.map["reports.sent"], "green");
                            }
                            else {
                                if (data && data.result) {
                                    CountlyHelpers.alert(data.result, "red");
                                }
                                else {
                                    CountlyHelpers.alert(jQuery.i18n.map["reports.too-long"], "red");
                                }
                            }
                        });
                        break;

                    case "preview-comment":
                        var url = '/i/reports/preview?api_key=' + countlyGlobal.member.api_key + '&args=' + JSON.stringify({_id: scope.row._id})
                        window.open(url, "_blank");
                        break;
                    default:
                        return
                }
            },
            updateStatus:  async function (scope) {
                var diff = scope.diff;
                var status = {}
                diff.forEach(function (item) {
                    status[item.key] = item.newValue;
                });
                await this.$store.dispatch("countlyReports/table/updateStatus", status);
                await this.$store.dispatch("countlyReports/table/fetchAll");
                scope.unpatch();
            },
            refresh: function () {
            // this.$store.dispatch("countlyReports/table/fetchAll");
            },
        }
    });



    var ReportsDrawer = countlyVue.views.BaseView.extend({
        template: '#reports-drawer',
        mixins: [
            countlyVue.container.dataMixin({
                "externalDataTypeOptions": "/reports/data-type",
            })
        ],
        components: {
        },
        data: function () {
            const appsSelectorOption = [];
            for (let id in countlyGlobal.apps) {
                appsSelectorOption.push({label: countlyGlobal.apps[id].name, value: id});
            }

            // const reportTypeOptions = [
            //     {label: jQuery.i18n.map["reports.core"], value: 'core'},
            // ];
            // if (countlyGlobal.plugins.indexOf("dashboards")  > -1) {
            //     reportTypeOptions.push({label: jQuery.i18n.map["dashboards.report"], value: 'dashboards'});
            // }

            const metricOptions = [
                {label: jQuery.i18n.map["reports.analytics"], value: "analytics"},
                {label: jQuery.i18n.map["reports.events"], value: "events"},
                {label: jQuery.i18n.map["reports.revenue"], value: "revenue"},
                {label: jQuery.i18n.map["reports.crash"], value: "crash"},
            ];

            if (countlyGlobal.plugins.indexOf("star-rating") > -1) {
                metricOptions.push({label: jQuery.i18n.map["reports.star-rating"], value: "star-rating"});
            }

            if (countlyGlobal.plugins.indexOf("performance-monitoring") > -1) {
                metricOptions.push({label: jQuery.i18n.map["sidebar.performance-monitoring"], value: "performance"});
            }

            const frequencyOptions = [
                {label: jQuery.i18n.map["reports.daily"], value: "daily", description: jQuery.i18n.map["reports.daily-desc"]},
                {label: jQuery.i18n.map["reports.weekly"], value: "weekly", description: jQuery.i18n.map["reports.weekly-desc"]},
                {label: jQuery.i18n.map["reports.monthly"], value: "monthly", description: jQuery.i18n.map["reports.monthly-desc"]},
            ];
            const dayOfWeekOptions = [
                {label: jQuery.i18n.map["reports.monday"], value: 1},
                {label: jQuery.i18n.map["reports.tuesday"], value: 2},
                {label: jQuery.i18n.map["reports.wednesday"], value: 3},
                {label: jQuery.i18n.map["reports.thursday"], value: 4},
                {label: jQuery.i18n.map["reports.friday"], value: 5},
                {label: jQuery.i18n.map["reports.saturday"], value: 6},
                {label: jQuery.i18n.map["reports.sunday"], value: 7},

            ];
            var zones = [];
            for (var country in countlyGlobal.timezones) {
                countlyGlobal.timezones[country].z.forEach((item) => {
                    for (var zone in item) {
                        zones.push({value: item[zone], label: countlyGlobal.timezones[country].n + ' ' + zone});
                    }
                });
            }
            const timeListOptions = [];
            for (var i = 0; i < 24; i++) {
                var v = (i > 9 ? i : "0" + i) + ":00";
                timeListOptions.push({ value: i, label: v});
            }

            return {
                title: "",
                saveButtonLabel: "",
                appsSelectorOption,
                metricOptions,
                eventOptions: [],
                frequencyOptions,
                dayOfWeekOptions,
                timeListOptions,
                timezoneOptions: zones,
                emailOptions:[{value: countlyGlobal.member.email, label: countlyGlobal.member.email}],
                showApps: true,
                showMetrics: true,
                showDashboards: false,
                reportDateRangesOptions: [],
            };
        },
        computed: {
            reportTypeOptions: function() {
                var options = [
                    {label: jQuery.i18n.map["reports.core"], value: 'core'},
                ];
                if (this.externalDataTypeOptions) {
                    options = options.concat(this.externalDataTypeOptions);
                }
                return options;
            },
            dashboardsOptions: function() {
                var dashboardsList = countlyDashboards.getAllDashboards();
                var dashboardsOptions = [];
                for (var i = 0; i < dashboardsList.length; i++) {
                    dashboardsOptions.push({ value: dashboardsList[i].id, label: dashboardsList[i].name });
                };
                countlyVue.container.registerData("/reports/dashboards-option", dashboardsOptions);
                return dashboardsOptions;
            },
        },
        watch: {
            "apps": function () {
                var self = this;
                
            }
        },
        props: {
            controls: {
                type: Object
            }
        },
        methods: {
            reportTypeChange: function(type) {
                if (type === 'dashboards') {
                    this.showApps = false;
                    this.showMetrics = false;
                    this.showDashboards = true; 
                    this.$children[0].editedObject.metricsArray = [];
                } else {
                    this.showApps = true;
                    this.showMetrics = true;
                    this.showDashboards = false
                }
            },
            reportFrequencyChange: function (reportFrequency) {
                var reportDateRanges = countlyDashboards.getReportDateRanges(reportFrequency);
                this.reportDateRangesOptions = reportDateRanges.map(function(r) {
                    return {value: r.value, label: r.name} 
                });
            },
            emailInputFilter: function (val) {
                var REGEX_EMAIL = '([a-z0-9!#$%&\'*+/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&\'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)';
                regex = new RegExp('^' + REGEX_EMAIL + '$', 'i');
                var match = val.match(regex);
                if (match) {
                    this.emailOptions=[{value:val, label:val}]
                } else {
                    this.emailOptions=[]
                }
            },
            appsChange: function (apps, change) {
                var self = this;
                countlyEvent.getEventsForApps(apps, function(eventData) {
                    const eventOptions = eventData.map(function(e){
                        return {value: e.value, label: e.name};
                    });
                    self.eventOptions = eventOptions;
                });
                this.$children[0].editedObject.selectedEvents = [];
            },
            onSubmit: async function (doc) {
                doc.metrics = {};
                doc.metricsArray.forEach(function (m){
                    doc.metrics[m] = true;
                });
                delete doc.metricsArray;
                await this.$store.dispatch("countlyReports/saveReport", doc);
                await this.$store.dispatch("countlyReports/table/fetchAll");
            },
            onClose: function ($event) {
                this.$emit("close", $event);
            },
            onCopy: function (newState) {
                var self = this;
                if (newState._id !== null) {
                    this.reportTypeChange(newState.report_type);
                    this.reportFrequencyChange(newState.frequency);

                    this.title = jQuery.i18n.map["reports.edit_report_title"];
                    this.saveButtonLabel = jQuery.i18n.map["reports.Save_Changes"];
                    newState.metricsArray =[];
                    for(var k in newState.metrics) {
                        newState.metricsArray.push(k);
                    }
                    countlyEvent.getEventsForApps(newState.apps, function(eventData) {
                        const eventOptions = eventData.map(function(e){
                            return {value: e.value, label: e.name};
                        });
                        self.eventOptions = eventOptions;
                    });
                    return;
                }
                this.title = jQuery.i18n.map["reports.create_new_report_title"];
                this.saveButtonLabel = jQuery.i18n.map["reports.Create_New_Report"];
            },
        }
    });

    var ReportsHomeViewComponent = countlyVue.views.BaseView.extend({
        template: "#reports-home",
        mixins: [countlyVue.mixins.hasDrawers("home")],
        components: {
            "table-view": TableView,
            "drawer": ReportsDrawer,
        },
        data: function () {
        return {};
        },
        beforeCreate: function () {
        this.$store.dispatch("countlyReports/initialize");
        },
        methods: {
            createReport: function () {
                this.openDrawer("home", countlyReporting.defaultDrawerConfigValue());
            },
        },
    });

    var reportsView = new countlyVue.views.BackboneWrapper({

        component: ReportsHomeViewComponent,
        vuex: [{
            clyModel: countlyReporting 
        }],
        templates: [
            "/reports/templates/vue-main.html",
        ]
    });
    reportsView.featureName = FEATURE_NAME;

    if (countlyAuth.validateRead(FEATURE_NAME)) {
        app.route('/manage/reports', 'reports', function() {
            this.renderWhenReady(reportsView);
        });
    }

    $(document).ready(function() {
        if (countlyAuth.validateRead(FEATURE_NAME)) {
            app.addSubMenu("management", {code: "reports", url: "#/manage/reports", text: "reports.title", priority: 30});
            if (app.configurationsView) {
                app.configurationsView.registerLabel("reports", "reports.title");
                app.configurationsView.registerLabel(
                    "reports.secretKey",
                    "reports.secretKey"
                );
            }
        }

        if (countlyGlobal.plugins.indexOf("dashboards") > -1) {
            countlyVue.container.registerData("/reports/data-type", {label: jQuery.i18n.map["dashboards.report"], value: 'dashboards'});
        }
    });


    app.addReportsCallbacks = function(plugin, options) {
        if (!this.reportCallbacks) {
            this.reportCallbacks = {};
        }

        this.reportCallbacks[plugin] = options;
    };

    app.getReportsCallbacks = function() {
        return this.reportCallbacks;
    };
})()
