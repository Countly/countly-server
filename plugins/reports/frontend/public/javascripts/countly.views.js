/*global
 
    CountlyHelpers,
    countlyGlobal,
    countlyAuth,
    countlyEvent,
    countlyReporting,
    jQuery,
    countlyVue,
    app,
    CV,
    $,
 */
(function() {
    var FEATURE_NAME = "reports";

    var TableView = countlyVue.views.BaseView.extend({
        template: '#reports-table',
        computed: {
            tableRows: function() {
                var rows = this.$store.getters["countlyReports/table/all"];
                return rows;
            },
            initialized: function() {
                var result = this.$store.getters["countlyReports/table/getInitialized"];
                return result;
            },
            rawTableRows: function() {
                var rows = this.$store.getters["countlyReports/table/all"];
                return rows;
            }
        },
        data: function() {
            return {
                localTableTrackedFields: ['enabled'],
                isAdmin: countlyGlobal.member.global_admin,
                deleteElement: null,
                showDeleteDialog: false,
                deleteMessage: '',
            };
        },
        props: {
            callCreateReportDrawer: {type: Function, default: function() {}},
        },
        methods: {
            createReport: function() {
                this.callCreateReportDrawer();
            },
            handleReportEditCommand: function(command, scope) {
                switch (command) {
                case "edit-comment":
                    var data = Object.assign({}, scope.row);
                    delete data.operation;
                    delete data.triggerEffectColumn;
                    delete data.nameDescColumn;
                    this.$parent.$parent.openDrawer("home", data);
                    break;
                case "delete-comment":
                    this.deleteElement = scope.row;
                    this.showDeleteDialog = true;
                    this.deleteMessage = CV.i18n("reports.confirm", "<b>" + this.deleteElement.title + "</b>");
                    break;
                case "send-comment":
                    var overlay = $("#overlay").clone();
                    overlay.show();
                    $.when(countlyReporting.send(scope.row._id)).always(function(sendResult) {
                        overlay.hide();
                        if (sendResult && sendResult.result === "Success") {
                            CountlyHelpers.alert(jQuery.i18n.map["reports.sent"], "green");
                        }
                        else {
                            if (sendResult && sendResult.result) {
                                CountlyHelpers.alert(sendResult.result, "red");
                            }
                            else {
                                CountlyHelpers.alert(jQuery.i18n.map["reports.too-long"], "red");
                            }
                        }
                    });
                    break;
                case "preview-comment":
                    var url = '/i/reports/preview?api_key=' + countlyGlobal.member.api_key + '&args=' + JSON.stringify({_id: scope.row._id});
                    window.open(url, "_blank");
                    break;
                default:
                    return;
                }
            },
            closeDeleteForm: function() {
                this.deleteElement = null;
                this.showDeleteDialog = false;
            },
            submitDeleteForm: function() {
                this.$store.dispatch("countlyReports/deleteReport", this.deleteElement._id);
                this.showDeleteDialog = false;
            },
            updateStatus: function(scope) {
                var diff = scope.diff;
                var status = {};
                diff.forEach(function(item) {
                    status[item.key] = item.newValue;
                });
                var self = this;
                this.$store.dispatch("countlyReports/table/updateStatus", status).then(function() {
                    return self.$store.dispatch("countlyReports/table/fetchAll");
                });
            },
            refresh: function() {
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
        data: function() {
            var appsSelectorOption = [];
            for (var id in countlyGlobal.apps) {
                appsSelectorOption.push({label: countlyGlobal.apps[id].name, value: id});
            }

            // const reportTypeOptions = [
            //     {label: jQuery.i18n.map["reports.core"], value: 'core'},
            // ];
            // if (countlyGlobal.plugins.indexOf("dashboards")  > -1) {
            //     reportTypeOptions.push({label: jQuery.i18n.map["dashboards.report"], value: 'dashboards'});
            // }

            var metricOptions = [
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

            var frequencyOptions = [
                {label: jQuery.i18n.map["reports.daily"], value: "daily", description: jQuery.i18n.map["reports.daily-desc"]},
                {label: jQuery.i18n.map["reports.weekly"], value: "weekly", description: jQuery.i18n.map["reports.weekly-desc"]},
                {label: jQuery.i18n.map["reports.monthly"], value: "monthly", description: jQuery.i18n.map["reports.monthly-desc"]},
            ];
            var dayOfWeekOptions = [
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
                /* eslint-disable no-loop-func */
                countlyGlobal.timezones[country].z.forEach(function(item) {
                    for (var zone in item) {
                        zones.push({value: item[zone], label: countlyGlobal.timezones[country].n + ' ' + zone});
                    }
                });
                /* eslint-enable no-loop-func */
            }
            var timeListOptions = [];
            for (var i = 0; i < 24; i++) {
                var v = (i > 9 ? i : "0" + i) + ":00";
                timeListOptions.push({ value: i, label: v});
            }

            return {
                title: "",
                saveButtonLabel: "",
                appsSelectorOption: appsSelectorOption,
                metricOptions: metricOptions,
                eventOptions: [],
                frequencyOptions: frequencyOptions,
                dayOfWeekOptions: dayOfWeekOptions,
                timeListOptions: timeListOptions,
                timezoneOptions: zones,
                // emailOptions: [{value: countlyGlobal.member.email, label: countlyGlobal.member.email}],
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
                var dashboardsList = this.$store.getters["countlyDashboards/all"];
                var dashboardsOptions = [];
                for (var i = 0; i < dashboardsList.length; i++) {
                    dashboardsOptions.push({ value: dashboardsList[i]._id, label: dashboardsList[i].name });
                }
                countlyVue.container.registerData("/reports/dashboards-option", dashboardsOptions);
                return dashboardsOptions;
            },
        },
        watch: {
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
                }
                else {
                    this.showApps = true;
                    this.showMetrics = true;
                    this.showDashboards = false;
                }
            },
            reportFrequencyChange: function(reportFrequency) {
                var dashboardRangesDict = this.$store.getters["countlyDashboards/reportDateRangeDict"];
                var reportDateRanges = dashboardRangesDict[reportFrequency] || [];
                this.reportDateRangesOptions = reportDateRanges.map(function(r) {
                    return {value: r.value, label: r.name};
                });
            },
            emailInputFilter: function(val) {
                var REGEX_EMAIL = '([a-z0-9!#$%&\'*+/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&\'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)';
                var regex = new RegExp('^' + REGEX_EMAIL + '$', 'i');
                var match = val.match(regex);
                if (match) {
                    this.emailOptions = [{value: val, label: val}];
                }
                else {
                    this.emailOptions = [];
                }
            },
            appsChange: function(apps) {
                var self = this;
                countlyEvent.getEventsForApps(apps, function(eventData) {
                    var eventOptions = eventData.map(function(e) {
                        return {value: e.value, label: e.name};
                    });
                    self.eventOptions = eventOptions;
                });
                this.$children[0].editedObject.selectedEvents = [];
            },
            onSubmit: function(doc) {
                doc.metrics = {};
                doc.metricsArray.forEach(function(m) {
                    doc.metrics[m] = true;
                });
                delete doc.metricsArray;
                delete doc.hover;
                delete doc.user;
                this.$store.dispatch("countlyReports/saveReport", doc);
            },
            onClose: function($event) {
                this.$emit("close", $event);
            },
            onCopy: function(newState) {
                var self = this;
                if (newState._id !== null) {
                    this.reportTypeChange(newState.report_type);
                    this.reportFrequencyChange(newState.frequency);

                    this.title = jQuery.i18n.map["reports.edit_report_title"];
                    this.saveButtonLabel = jQuery.i18n.map["reports.Save_Changes"];
                    newState.metricsArray = [];
                    for (var k in newState.metrics) {
                        newState.metricsArray.push(k);
                    }
                    countlyEvent.getEventsForApps(newState.apps, function(eventData) {
                        var eventOptions = eventData.map(function(e) {
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
        data: function() {
            return {};
        },
        beforeCreate: function() {
            this.$store.dispatch("countlyReports/initialize");
        },
        methods: {
            createReport: function() {
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
            app.addMenu("management", {code: "reports", url: "#/manage/reports", text: "reports.title", priority: 43});
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
})();
