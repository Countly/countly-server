/*global
    countlyGlobal,
    countlyAlerts,
    jQuery,
    countlyVue,
    $,
    app,
    countlyCommon,
    countlyEvent,
    alertDefine,
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
            var appsSelectorOption = [];
            for (var appId in countlyGlobal.apps) {
                appsSelectorOption.push({label: countlyGlobal.apps[appId].name, value: appId});
            }
            var defaultAppsSelectorOption = Object.assign([], appsSelectorOption);
            return {
                title: "",
                saveButtonLabel: "",
                apps: [""],
                defaultAppsSelectorOption: defaultAppsSelectorOption,
                appsSelectorOption: appsSelectorOption,
                emailOptions: [{value: countlyGlobal.member.email, label: countlyGlobal.member.email}],
                showSubType1: true,
                showSubType2: false,
                showCondition: true,
                showConditionValue: true,
                alertDataSubType2Options: [],
            };
        },
        computed: {
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
                var alertDefine = {
                    metric: {
                        target: [
                            { value: 'Total users', label: 'Total users' },
                            { value: 'New users', label: 'New users' },
                            { value: 'Total sessions', label: 'Total sessions' },
                            { value: 'Average session duration', label: 'Average session duration' },
                            { value: 'Bounce rate', label: 'Bounce rate (%)' },
                            { value: 'Number of page views', label: 'Number of page views' },
                            { value: 'Purchases', label: 'Purchases' },
                        ],
                        condition: [
                            { value: 'increased by at least', label: 'increased by at least' },
                            { value: 'decreased by at least', label: 'decreased by at least' },
                        ]
                    },
                    event: {
                        target: [],
                        condition: [
                            { value: 'increased by at least', label: 'increased by at least' },
                            { value: 'decreased by at least', label: 'decreased by at least' },
                        ]
                    },
                    crash: {
                        target: [
                            { value: 'Total crashes', label: 'Total crashes' },
                            { value: 'New crash occurence', label: 'New crash occurence' },
                            { value: 'None fatal crash per session', label: 'None fatal crash per session' },
                            { value: 'Fatal crash per session', label: 'Fatal crash per session' },
                        ],
                        condition: [
                            { value: 'increased by at least', label: 'increased by at least' },
                            { value: 'decreased by at least', label: 'decreased by at least' },
                        ]
                    },
                    rating: {
                        target: [
                            { value: 'Number of ratings', label: 'Number of ratings' },
                        ],
                        condition: [
                            { value: 'increased by at least', label: 'increased by at least' },
                            { value: 'decreased by at least', label: 'decreased by at least' },
                        ]
                    },
                    dataPoint: {
                        target: [
                            { value: 'Number of daily DP', label: 'Daily data points' },
                            { value: 'Hourly data points', label: 'Hourly data points' },
                            { value: 'Monthly data points', label: 'Monthly data points' }
                        ],
                        condition: [
                            { value: 'increased by at least', label: 'increased by at least' },
                            { value: 'decreased by at least', label: 'decreased by at least' },
                        ]
                    },
                };
                var self = this;
                this.externalAlertDefine.forEach(function(define) {
                    self.alertDefine = Object.assign(alertDefine, define);
                });
                return alertDefine;
            },
            subDataTypeOptions: function() {
                return alertDefine;
            }
        },
        watch: {
        },
        props: {
            controls: {
                type: Object
            }
        },
        mounted: function() {
        },
        methods: {
            appSelected: function(val, notReset) {
                var self = this;
                this.apps = [val];
                if (val) {
                    countlyEvent.getEventsForApps([val], function(eventData) {
                        var eventOptions = eventData.map(function(e) {
                            return {value: e.value, label: e.name};
                        });
                        self.alertDefine.event.target = eventOptions;
                    });
                }
                if (!notReset) {
                    this.resetAlertCondition();
                }
            },
            dataTypeSelected: function(val, notRest) {
                this.appsSelectorOption = Object.assign([], this.defaultAppsSelectorOption);
                if (val === 'dataPoint') {
                    this.appsSelectorOption.unshift({value: "all-apps", label: "All apps"});
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
            },
            resetAlertConditionShow: function() {
                this.showSubType1 = true;
                this.showSubType2 = false;
                this.showCondition = true;
                this.showConditionValue = true;
            },
            alertDataSubTypeSelected: function(alertDataSubType, notReset) {
                switch (alertDataSubType) {
                case 'New crash occurence':
                    this.showSubType2 = false;
                    this.showCondition = false;
                    this.showConditionValue = false;
                    break;
                case 'Number of ratings':
                    if (!notReset) {
                        this.resetAlertConditionShow();
                    }
                    this.showSubType2 = true;
                    this.alertDataSubType2Options = countlyAlerts.RatingOptions;
                    break;
                case 'Number of page views':
                case 'Bounce rate':
                    this.resetAlertConditionShow();
                    this.showSubType2 = true;
                    var self = this;
                    countlyAlerts.getViewForApp(this.apps[0], function(viewList) {
                        self.alertDataSubType2Options = viewList.map(function(v) {
                            return {value: v.value, label: v.name};
                        });
                    });
                    break;
                case 't':
                    this.showUserCount = true;
                    this.showSubType2 = false;
                    this.showCondition = false;
                    this.showConditionValue = false;
                    break;
                case 'o':
                case 'm':
                    this.showSubType2 = false;
                    this.showCondition = false;
                    this.showConditionValue = false;
                    break;
                default:
                    if (!notReset) {
                        this.resetAlertConditionShow();
                    }
                    return;
                }
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
            onSubmit: function(settings) {
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

                this.appSelected(newState.selectedApps[0], true);
                this.alertDataSubTypeSelected(newState.alertDataSubType, true);

                if (newState._id !== null) {
                    this.title = jQuery.i18n.map["alert.Edit_Your_Alert"];
                    this.saveButtonLabel = jQuery.i18n.map["alert.save-alert"];
                    return;
                }
                this.title = jQuery.i18n.map["alert.Create_New_Alert"];
                this.saveButtonLabel = jQuery.i18n.map["alert.add-alert"];
            },
        }
    });

    var TableView = countlyVue.views.BaseView.extend({
        template: '#alerts-table',
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
                canUpdate: countlyAuth.validateUpdate(ALERTS_FEATURE_NAME),
                canDelete: countlyAuth.validateDelete(ALERTS_FEATURE_NAME),
                deleteElement: null,
                showDeleteDialog: false,
                deleteMessage: '',
            };
        },
        methods: {
            handleAlertEditCommand: function(command, scope) {
                if (command === "edit-comment") {
                    /* eslint-disable */
                    var data = Object.assign({}, scope.row);
                    /* eslint-enable */
                    this.$parent.$parent.openDrawer("home", data);
                }
                else if (command === "delete-comment") {
                    this.deleteElement = scope.row;
                    this.showDeleteDialog = true;
                    this.deleteMessage = CV.i18n("alert.delete-confirm", "<b>" + this.deleteElement.alertName + "</b>");
                }
            },
            closeDeleteForm: function() {
                this.deleteElement = null;
                this.showDeleteDialog = false;
            },
            submitDeleteForm: function() {
                if (this.deleteElement.alertDataType === 'online-users') {
                    this.$store.dispatch("countlyAlerts/deleteOnlineUsersAlert", this.deleteElement._id);
                }
                else {
                    this.$store.dispatch("countlyAlerts/deleteAlert", this.deleteElement._id);
                }
                this.showDeleteDialog = false;
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

                this.$store.dispatch("countlyAlerts/table/updateStatus", alertStatus);
                this.$store.dispatch("countlyAlerts/table/updateOnlineusersAlertStatus", onlineUsersAlertStatus);
                this.$store.dispatch("countlyAlerts/table/fetchAll");
                scope.unpatch();
            },
            refresh: function() {
            // this.$store.dispatch("countlyHooks/table/fetchAll");
            },
        }
    });

    var AlertsHomeViewComponent = countlyVue.views.BaseView.extend({
        template: "#alerts-home",
        mixins: [countlyVue.mixins.hasDrawers("home")],
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
            }
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
                this.openDrawer("home", countlyAlerts.defaultDrawerConfigValue());
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


    if (countlyAuth.validateRead(ALERTS_FEATURE_NAME)) {
        app.route('/manage/alerts', 'alerts', function() {
            this.renderWhenReady(alertsView);
        });
    }
    $(document).ready(function() {
        if (countlyAuth.validateRead(ALERTS_FEATURE_NAME)) {
            app.addSubMenu("management", {code: "alerts", url: "#/manage/alerts", text: "alert.plugin-title", priority: 40});
        }

        if (countlyGlobal.plugins.indexOf("concurrent_users") > -1) {
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
    });
})();
