/*global
    CountlyHelpers,
    countlyGlobal,
    countlyAlerts,
    jQuery,
    countlyVue,
    app,
    countlyCommon,
    countlyEvent,
    countlyAuth,
    CV,
 */
(function() {
    var ALERTS_FEATURE_NAME = "alerts";

    var AlertDrawer = countlyVue.views.BaseView.extend({
        template: '#alert-drawer',
        mixins: [
            countlyVue.container.dataMixin({
                "externalDataTypeOptions": "/alerts/data-type",
                "externalAlertDefine": "/alerts/data-define",
            })
        ],
        components: {
        },
        data: function() {
            return {
                title: "",
                saveButtonLabel: "",
                apps: [""],
                allowAll: false,
                showSubType1: true,
                showSubType2: false,
                showCondition: true,
                showConditionValue: true,
                alertDataSubType2Options: [],
                eventTargets: [],
                metricTargets: [],
                defaultAlertDefine: {
                    metric: {
                        target: [
                            { value: 'count', label: 'count' },
                            { value: 'sum', label: 'sum' },
                            { value: 'duration', label: 'duration' },
                            { value: 'average sum', label: 'average sum' },
                            { value: 'average duration', label: 'average duration' },
                        ]
                    },
                    event: {
                        target: [
                            { value: 'bounce rate', label: 'bounce rate' },
                            { value: '# of page views', label: '# of page views' }
                        ]
                    },
                    crash: {
                        target: [
                            { value: 'average session duration', label: 'average session duration' },
                            { value: '# of sessions', label: '# of sessions' },
                        ]
                    },
                    rating: {
                        target: [
                            { value: '# of responses', label: '# of responses' },
                            { value: 'new rating response', label: 'new rating response' },
                        ]
                    },
                    dataPoint: {
                        target: [
                            { value: 'number of daily DP', label: 'daily data points' },
                            { value: 'hourly data points', label: 'hourly data points' },
                            { value: 'monthly data points', label: 'monthly data points' }
                        ],
                    },
                },
                defaultAlertVariable: {
                    condition: [
                        { label: "decreased", value: "decreased" },
                        { label: "increased", value: "increased" },
                        { label: "more", value: "more" }
                    ]
                },
                defaultAlertTime: {
                    time: [
                        { label: "month", value: "monthly" },
                        { label: "day", value: "daily" },
                        { label: "hour", value: "hourly" }
                    ]
                }
            };
        },
        computed: {
            isCompareTypeSelectAvailable: function() {
                const disabledMetrics = [
                    "new survey response",
                    "new NPS response",
                    "new rating response",
                    "o",
                    "m",
                ];
                if (disabledMetrics.includes(this.$refs.drawerData.editedObject.alertDataSubType)) {
                    return false;
                }
                return true;
            },
            isPeriodSelectAvailable: function() {
                const disabledMetrics = [
                    "new survey response",
                    "new NPS response",
                    "new rating response",
                    "o",
                    "m",
                ];
                if (disabledMetrics.includes(this.$refs.drawerData.editedObject.alertDataSubType)) {
                    return false;
                }
                return true;
            },
            alertTimeOptions() {
                if (this.$refs.drawerData.editedObject.alertDataType === "rating") {
                    // Filter out the "hour" option if the alert data type is "rating"
                    return this.defaultAlertTime.time.filter(periodItem => periodItem.value !== "hourly");
                }
                else {
                    // Return all options if condition doesn't match
                    return this.defaultAlertTime.time;
                }
            },
            alertDataTypeOptions: function() {
                var alertDataTypeOptions = [
                    {label: jQuery.i18n.map["alert.Metric"], value: 'metric'},
                    {label: jQuery.i18n.map["alert.Event"], value: 'event'},
                    {label: jQuery.i18n.map["alert.Crash"], value: 'crash'},
                    {label: jQuery.i18n.map["alert.rating"], value: 'rating'},
                    {label: jQuery.i18n.map["alert.data-point"], value: 'dataPoint'},
                ];
                if (this.externalDataTypeOptions) {
                    alertDataTypeOptions = alertDataTypeOptions.concat(this.externalDataTypeOptions);
                }
                return alertDataTypeOptions;
            },
            alertDefine: function() {
                var allOptions = JSON.parse(JSON.stringify(this.defaultAlertDefine));
                var eventTargets = this.eventTargets;
                var metricTargets = this.metricTargets;

                this.externalAlertDefine.forEach(function(define) {
                    allOptions = Object.assign(allOptions, define);
                });

                if (eventTargets && eventTargets.length) {
                    allOptions.event.target = eventTargets;
                }

                if (metricTargets && metricTargets.length) {
                    allOptions.metric.target = allOptions.metric.target.concat(metricTargets);
                }

                return allOptions;
            }
        },
        props: {
            placeholder: {type: String, default: 'Select'},
            controls: {
                type: Object
            }
        },
        mounted: function() {
        },
        methods: {
            onAppChange: function(val, notReset) {
                var self = this;
                this.apps = [val];
                if (val) {
                    countlyEvent.getEventsForApps([val], function(eventData) {
                        var eventTargets = eventData.map(function(e) {
                            return {value: e.value, label: e.name};
                        });

                        self.eventTargets = eventTargets;
                    });

                    countlyAlerts.getViewForApp(val, function(viewList) {
                        if (viewList.length !== 0) {
                            var viewTargets = [
                                { value: 'Bounce rate', label: 'Bounce rate (%)' },
                                { value: 'Number of page views', label: 'Number of page views' }
                            ];

                            self.metricTargets = viewTargets;
                            self.alertDataSubType2Options = viewList.map(function(v) {
                                return {value: v.value, label: v.name};
                            });
                        }
                        else {
                            self.metricTargets = [];
                        }
                    });
                }
                else {
                    this.eventTargets = [];
                    this.metricTargets = [];
                    this.alertDataSubType2Options = [];
                }

                if (!notReset) {
                    this.resetAlertCondition();
                }
            },
            dataTypeSelected: function(val, notRest) {
                if (val === 'dataPoint' && countlyGlobal.member.global_admin === true) {
                    this.allowAll = true;
                }
                if (val === 'online-users') {
                    this.showSubType2 = false;
                    this.showCondition = false;
                    this.showConditionValue = false;
                }
                if (!notRest) {
                    this.$refs.drawerData.editedObject.selectedApps = [""];
                    this.resetAlertCondition();
                }
            },
            resetAlertCondition: function() {
                this.$refs.drawerData.editedObject.alertDataSubType = null;
                this.$refs.drawerData.editedObject.alertDataSubType2 = null;
                this.$refs.drawerData.editedObject.compareType = null;
                this.$refs.drawerData.editedObject.compareValue = null;
                this.$refs.drawerData.editedObject.period = null;
                // Reset the background color for all input elements
                const inputs = this.$refs.drawerData.$el.querySelectorAll('input');
                inputs.forEach(input => {
                    this.resetColor(input);
                });

                // Reset the background color for all select elements
                const selects = this.$refs.drawerData.$el.querySelectorAll('select');
                selects.forEach(select => {
                    this.resetColor(select);
                });
            },
            onSubmit: function(settings) {
                settings.selectedApps = [settings.selectedApps];
                if (settings._id) {
                    var rows = this.$store.getters["countlyAlerts/table/all"];
                    for (var i = 0; i < rows.length; i++) {
                        if ((rows[i]._id === settings._id) &&
                            (rows[i].alertDataType === 'online-users' || settings.alertDataType === 'online-users') &&
                            (rows[i].alertDataType !== settings.alertDataType)) {
                            if (rows[i].alertDataType !== 'online-users') {
                                this.$store.dispatch("countlyAlerts/deleteAlert", rows[i]._id);
                            }
                            else {
                                this.$store.dispatch("countlyAlerts/deleteOnlineUsersAlert", rows[i]);
                            }
                            settings._id = null;
                        }
                    }
                }

                var target = settings.alertDataSubType;
                var subTarget = settings.alertDataSubType2;
                switch (settings.alertDataType) {
                case "event":
                    target = target.split("***")[1];
                    break;
                case "rating":
                    subTarget = countlyAlerts.RatingOptions[subTarget].label;
                    if (target === 'Bounce rate' || target === 'Number of page views') {
                        this.alertDataSubType2Options.forEach(function(item) {
                            if (item.value === settings.alertDataSubType2) {
                                subTarget = item.label;
                            }
                        });
                    }
                    break;
                case 'metric':
                    if (target === 'Bounce rate' || target === 'Number of page views') {
                        this.alertDataSubType2Options.forEach(function(item) {
                            if (item.value === settings.alertDataSubType2) {
                                subTarget = item.label;
                            }
                        });
                    }
                    break;
                }




                var target2 = settings.alertDataSubType2 ? ' (' + subTarget + ')' : '';
                settings.compareDescribe = target + target2 ;

                switch (settings.alertDataSubType) {
                case 'New crash occurence':
                    break;
                default:
                    settings.compareDescribe += ' ' + settings.compareType +
                        ' ' + settings.compareValue + "%";
                    break;
                }
                delete settings.createdBy;



                if (settings.alertDataType === 'online-users') {
                    var config = {
                        app: settings.selectedApps[0],
                        app_name: countlyGlobal.apps[settings.selectedApps[0]].name,
                        name: settings.alertName,
                        type: settings.alertDataSubType,
                        def: settings.compareType,
                        users: parseInt(settings.compareValue, 10),
                        minutes: parseInt(settings.compareValue2, 10),
                        email: settings.alertValues,
                        enabled: true,
                    };
                    if (settings._id) {
                        config._id = settings._id;
                    }
                    if (config.type === 't') {
                        config.condition_title = jQuery.i18n.prop("concurrent-users.condition-title", jQuery.i18n.map["concurrent-users." + config.def], countlyCommon.formatNumber(config.users), config.minutes);
                    }
                    else if (config.type === 'o') {
                        config.condition_title = jQuery.i18n.map["concurrent-users.alert-type.overall-title"];
                    }
                    else if (config.type === 'm') {
                        config.condition_title = jQuery.i18n.map["concurrent-users.alert-type.monthly-title"];
                    }

                    this.$store.dispatch("countlyAlerts/saveOnlineUsersAlert", config);
                    return;
                }
                this.$store.dispatch("countlyAlerts/saveAlert", settings);
            },
            onClose: function($event) {
                this.$emit("close", $event);
            },
            onCopy: function(newState) {
                this.showSubType1 = true;
                this.showSubType2 = false;
                this.showCondition = false;
                this.showConditionValue = false;
                newState.selectedApps = newState.selectedApps[0];

                this.onAppChange(newState.selectedApps, true);

                if (newState._id !== null) {
                    this.title = jQuery.i18n.map["alert.Edit_Your_Alert"];
                    this.saveButtonLabel = jQuery.i18n.map["alert.save-alert"];
                    return;
                }
                this.title = jQuery.i18n.map["alert.Create_New_Alert"];
                this.saveButtonLabel = jQuery.i18n.map["alert.add-alert"];
            },
            // Handle the change event of the element
            handleChange(element) {
                this.changeColor(element);
            },
            changeColor(element) {
                // Set the background color of the element to green when a selection is made
                element.style.backgroundColor = "#E1EFFF";
                element.style.color = "#333C48";
                element.style.fontWeight = "500";
            },
            resetColor(element) {
                // Remove the inline background color style to reset to default
                element.style.backgroundColor = '';
                element.style.color = '';
            }
        }
    });

    var TableView = countlyVue.views.BaseView.extend({
        template: '#alerts-table',
        mixins: [
            countlyVue.mixins.auth(ALERTS_FEATURE_NAME),
        ],
        computed: {
            tableRows: function() {
                var rows = this.$store.getters["countlyAlerts/table/all"];
                if (this.filteredApps.length > 0) {
                    var self = this;
                    rows = rows.filter(function(r) {
                        var matched = false;
                        self.filteredApps.forEach(function(a) {
                            if (r.selectedApps.indexOf(a) >= 0) {
                                matched = true;
                            }
                        });
                        return matched;
                    });
                }
                return rows;
            },
            initialized: function() {
                var result = this.$store.getters["countlyAlerts/table/getInitialized"];
                return result;
            },
            rowTableRows: function() {
                var rows = this.$store.getters["countlyAlerts/table/all"];
                return rows;
            }
        },
        data: function() {
            var appsSelectorOption = [];
            for (var id in countlyGlobal.apps) {
                appsSelectorOption.push({label: countlyGlobal.apps[id].name, value: id});
            }

            return {
                appsSelectorOption: appsSelectorOption,
                filterStatus: 'all',
                filteredApps: [],
                localTableTrackedFields: ['enabled'],
                isAdmin: countlyGlobal.member.global_admin,
                deleteElement: null,
            };
        },
        props: {
            callCreateAlertDrawer: {type: Function, default: function() {}},
        },
        methods: {
            createAlert: function() {
                this.callCreateAlertDrawer();
            },
            handleAlertEditCommand: function(command, scope) {
                if (command === "edit-comment") {
                    /* eslint-disable */
                    var data = Object.assign({}, scope.row);
                    /* eslint-enable */
                    this.$parent.$parent.openDrawer("home", data);
                }
                else if (command === "delete-comment") {
                    var self = this;
                    this.deleteElement = scope.row;
                    var deleteMessage = CV.i18n("alert.delete-confirm", "<b>" + this.deleteElement.alertName + "</b>");
                    CountlyHelpers.confirm(deleteMessage, "red", function(result) {
                        if (!result) {
                            return true;
                        }
                        if (self.deleteElement.alertDataType === 'online-users') {
                            self.$store.dispatch("countlyAlerts/deleteOnlineUsersAlert", {alertID: self.deleteElement._id, appid: self.deleteElement.selectedApps[0]});
                        }
                        else {
                            self.$store.dispatch("countlyAlerts/deleteAlert", {alertID: self.deleteElement._id, appid: self.deleteElement.selectedApps[0]});
                        }
                    });
                }
            },
            updateStatus: function(scope) {
                var diff = scope.diff;
                var status = {};
                diff.forEach(function(item) {
                    status[item.key] = item.newValue;
                });
                var alertStatus = {};
                var onlineUsersAlertStatus = {};
                var rows = this.$store.getters["countlyAlerts/table/all"];
                for (var i = 0; i < rows.length; i++) {
                    if (status[rows[i]._id] !== undefined) {
                        if (rows[i].alertDataType === 'online-users') {
                            onlineUsersAlertStatus[rows[i]._id] = status[rows[i]._id];
                        }
                        else {
                            alertStatus[rows[i]._id] = status[rows[i]._id];
                        }
                    }
                }
                var self = this;
                self.scope = scope;
                self.onlineUsersAlertStatus = onlineUsersAlertStatus;
                this.$store.dispatch("countlyAlerts/table/updateStatus", alertStatus).then(function() {
                    return self.$store.dispatch("countlyAlerts/table/updateOnlineusersAlertStatus", self.onlineUsersAlertStatus)
                        .then(function() {
                            return self.$store.dispatch("countlyAlerts/table/fetchAll");
                        });
                });
            },
            refresh: function() {
            // this.$store.dispatch("countlyHooks/table/fetchAll");
            },
        }
    });

    var AlertsHomeViewComponent = countlyVue.views.BaseView.extend({
        template: "#alerts-home",
        mixins: [
            countlyVue.mixins.hasDrawers("home"),
            countlyVue.mixins.auth(ALERTS_FEATURE_NAME),
        ],
        components: {
            "table-view": TableView,
            "drawer": AlertDrawer,
        },
        computed: {
            countData: function() {
                var count = this.$store.getters["countlyAlerts/table/count"];
                return [
                    {label: 'alert.RUNNING_ALERTS', value: count.r},
                    {label: 'alert.TOTAL_ALERTS_SENT', value: count.t},
                    {label: 'alert.ALERTS_SENT_TODAY', value: count.today},
                ];
            },
            shouldHideCount: function() {
                var result = this.$store.getters["countlyAlerts/table/getInitialized"];
                var rows = this.$store.getters["countlyAlerts/table/all"];
                return result && (rows.length === 0);
            },
            initialized: function() {
                var result = this.$store.getters["countlyAlerts/table/getInitialized"];
                return result;
            },
        },
        data: function() {
            return {
                canCreate: countlyAuth.validateCreate(ALERTS_FEATURE_NAME)
            };
        },
        beforeCreate: function() {
            this.$store.dispatch("countlyAlerts/initialize");
        },
        methods: {
            createAlert: function() {
                var config = countlyAlerts.defaultDrawerConfigValue();
                this.openDrawer("home", config);
            },
        },
    });
    var alertsView = new countlyVue.views.BackboneWrapper({
        component: AlertsHomeViewComponent,
        vuex: [{
            clyModel: countlyAlerts,
        }],
        templates: [
            "/alerts/templates/vue-main.html",
        ]
    });

    alertsView.featureName = ALERTS_FEATURE_NAME;


    app.route('/manage/alerts', 'alerts', function() {
        this.renderWhenReady(alertsView);
    });
    app.addMenu("management", {code: "alerts", permission: ALERTS_FEATURE_NAME, url: "#/manage/alerts", text: "alert.plugin-title", priority: 100});

    var conUpdateConcurrentUser = countlyAuth.validateUpdate("concurrent_users");
    var canCreateConcurrentUser = countlyAuth.validateCreate("concurrent_users");
    if (countlyGlobal.plugins.indexOf("concurrent_users") > -1 && (canCreateConcurrentUser || conUpdateConcurrentUser)) {
        countlyVue.container.registerData("/alerts/data-type", {label: jQuery.i18n.map["concurrent-users.title"], value: 'online-users'});
        countlyVue.container.registerData("/alerts/data-define", {
            "online-users": {
                target: [
                    { value: 't', label: jQuery.i18n.map["concurrent-users.alert-type.t"]},
                    { value: 'o', label: jQuery.i18n.map["concurrent-users.alert-type.o"]},
                    { value: 'm', label: jQuery.i18n.map["concurrent-users.alert-type.m"]},
                ],
                condition: [
                    { value: 'gt', label: jQuery.i18n.map["concurrent-users.gt"]},
                    { value: 'lt', label: jQuery.i18n.map["concurrent-users.lt"]},
                ],
            }
        });
    }
})();
