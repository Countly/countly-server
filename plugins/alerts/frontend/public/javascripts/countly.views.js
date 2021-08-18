/*global
    countlyView,
    countlyGlobal,
    CountlyHelpers,
    Handlebars,
    countlyAlerts,
    _,
    jQuery,
    $,
    app,
    T,
    countlyAuth
 */

var AlertDrawer = countlyVue.views.BaseView.extend({
    template: '#alert-drawer',
    components: {
    },
    data: function () {
        var appsSelectorOption = [];
        for (var appId in countlyGlobal.apps) {
            appsSelectorOption.push({label: countlyGlobal.apps[appId].name, value: appId});
        }
        
        var alertDataTypeOptions = [
            {label: jQuery.i18n.map["alert.Metric"], value: 'metric'},
            {label: jQuery.i18n.map["alert.Event"], value: 'event'},
            {label: jQuery.i18n.map["alert.Crash"], value: 'crash'},
            {label: jQuery.i18n.map["alert.rating"], value: 'rating'},
            {label: jQuery.i18n.map["alert.data-point"], value: 'dataPoint'},
        ];

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
        var defaultAppsSelectorOption = Object.assign([], appsSelectorOption);
        return {
            title: "",
            saveButtonLabel: "",
            apps: [""],
            alertDataTypeOptions,
            defaultAppsSelectorOption,
            appsSelectorOption,
            alertDefine,
            emailOptions:[{value: countlyGlobal.member.email, label: countlyGlobal.member.email}],
            showSubType1: true,
            showSubType2: false,
            showCondition: true,
            showConditionValue: true,
            alertDataSubType2Options: [],
        };
    },
    computed: {
        subDataTypeOptions: function () {
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
    mounted: function () {
    },
    methods: {
        appSelected: function (val, notReset) {
            var self = this;
            this.$data.apps= [val];
            if (val) {
                countlyEvent.getEventsForApps([val], function(eventData) {
                    const eventOptions = eventData.map(function(e){
                        return {value: e.value, label: e.name};
                    });
                    self.$data.alertDefine['event']["target"] = eventOptions;
                });
            }
            if (!notReset) {
                this.resetAlertCondition();
            }
        },
        dataTypeSelected: function (val, notRest) {
            this.$data.appsSelectorOption = Object.assign([], this.$data.defaultAppsSelectorOption);
            if (val === 'dataPoint') {
                this.$data.appsSelectorOption.unshift({value: "all-apps", label: "All apps"});
            }
            if (!notRest) {
                this.$children[0].$data.editedObject.selectedApps =[""];
                this.resetAlertCondition();
            }
        },
        resetAlertCondition: function () {
            this.$children[0].$data.editedObject.alertDataSubType = null;
            this.$children[0].$data.editedObject.alertDataSubType2 = null;
            this.$children[0].$data.editedObject.compareType = null;
            this.$children[0].$data.editedObject.compareValue = null;
        },
        resetAlertConditionShow: function () {
            this.$data.showSubType1 = true;
            this.$data.showSubType2 = false;
            this.$data.showCondition = true;
            this.$data.showConditionValue = true;
        },
        alertDataSubTypeSelected: function (alertDataSubType, notReset) {
            switch(alertDataSubType) {
                case 'New crash occurence':
                    this.$data.showSubType2 = false;
                    this.$data.showSubType2 = false;
                    this.$data.showCondition = false;
                    this.$data.showConditionValue = false;
                    break;
                case 'Number of ratings':
                    if (!notReset) {
                     this.resetAlertConditionShow();
                    }
                    this.$data.showSubType2 = true;
                    this.$data.alertDataSubType2Options = countlyAlerts.RatingOptions;
                    break;
                case 'Number of page views':
                case 'Bounce rate':
                    this.resetAlertConditionShow();
                    this.$data.showSubType2 = true;
                    var self = this;
                    countlyAlerts.getViewForApp(this.$data.apps[0], function(viewList) {
                        self.$data.alertDataSubType2Options= viewList.map(function (v) {
                            return {value: v.value, label:v.name}
                        });
                    });
                    break;
                default: 
                    if (!notReset) {
                     this.resetAlertConditionShow();
                    }
                    return;
            }
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
        onSubmit: async function (settings) {
            let target = settings.alertDataSubType;
            let subTarget = settings.alertDataSubType2;
            switch(settings.alertDataType) {
                case "event":
                    target = target.split("***")[1];
                    break;
                case "rating":
                    subTarget = countlyAlerts.RatingOptions[subTarget].label;
                case 'metric':
                    if (target === 'Bounce rate' || target === 'Number of page views') {
                        this.$data.alertDataSubType2Options.forEach(function(item){
                            if (item.value === settings.alertDataSubType2) {
                               subTarget = item.label; 
                            }
                        })
                    }
                    break;
            }
            
            let target2 = settings.alertDataSubType2 ? ' (' + subTarget + ')' : '';
            settings.compareDescribe = target + target2 ;

            switch(settings.alertDataSubType) {
                case 'New crash occurence':
                    break;
                default:
                    settings.compareDescribe += ' ' + settings.compareType +
                    ' ' + settings.compareValue + "%";
                    break;
            }

            delete settings.createdBy;

            await this.$store.dispatch("countlyAlerts/saveAlert", settings);
            await this.$store.dispatch("countlyAlerts/table/fetchAll");
        },
        onClose: function ($event) {
            this.$emit("close", $event);
        },
        onCopy: function (newState) {
            this.resetAlertConditionShow();
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
        tableRows: function () {
            var rows = this.$store.getters["countlyAlerts/table/all"];
            if (this.filteredApps.length > 0) {
                var self = this;
                rows = rows.filter(function (r) {
                    var matched = false;
                    self.filteredApps.forEach(function(a) {
                        if ( r.selectedApps.indexOf(a) >= 0) {
                            matched = true;
                        }
                    });
                    return matched; 
                });
            }
            return rows;
        },
    },
    data: function () {
        const appsSelectorOption = [];
        for (let id in countlyGlobal.apps) {
            appsSelectorOption.push({label: countlyGlobal.apps[id].name, value: id});
        } 
        
        return {
            appsSelectorOption,
            filterStatus: 'all',
            filteredApps: [],
            localTableTrackedFields: ['enabled'],
            isAdmin: countlyGlobal.member.global_admin,
            canUpdate: countlyAuth.validateUpdate(app.alertsView.featureName),
            canDelete: countlyAuth.validateDelete(app.alertsView.featureName),
        };
    },
    methods: {
        handleHookEditCommand: function(command, scope) {
            if (command === "edit-comment") {
                var data = {...scope.row};
                this.$parent.$parent.openDrawer("home", data);
            }
            else if (command === "delete-comment") {
                var alertID = scope.row._id;
                var self = this;
                return CountlyHelpers.confirm(jQuery.i18n.prop("alert.delete-confirm", "<b>" + name + "</b>"), "popStyleGreen", async function (result) {
                    if (result) {
                        await self.$store.dispatch("countlyAlerts/deleteAlert", alertID);
                        await self.$store.dispatch("countlyAlerts/table/fetchAll");
                    }
                }, [jQuery.i18n.map["common.no-dont-delete"], jQuery.i18n.map["alert.yes-delete-alert"]], {title: jQuery.i18n.map["alert.delete-confirm-title"], image: "delete-an-event"});
            }
        },
        updateStatus:  async function (scope) {
            var diff = scope.diff;
            var status = {}
            diff.forEach(function (item) {
                status[item.key] = item.newValue;
            });
            await this.$store.dispatch("countlyAlerts/table/updateStatus", status);
            await this.$store.dispatch("countlyAlerts/table/fetchAll");
            scope.unpatch();
        },
        refresh: function () {
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
        countData: function () {
            var count = this.$store.getters["countlyAlerts/table/count"];
            return [
               {label:'alert.RUNNING_ALERTS', value: count.r},
               {label:'alert.TOTAL_ALERTS_SENT', value: count.t},
               {label:'alert.ALERTS_SENT_TODAY', value: count.today},
            ]
        } 
    },
    data: function () {
        return {
            canCreate: countlyAuth.validateCreate(app.alertsView.featureName)
        }
    },
    beforeCreate: function () {
       this.$store.dispatch("countlyAlerts/initialize");
    },
    methods: {
        createAlert: function () {
            this.openDrawer("home", countlyAlerts.defaultDrawerConfigValue());
        },
    },
});
app.alertsView = new countlyVue.views.BackboneWrapper({
    component: AlertsHomeViewComponent,
    vuex: [{
        clyModel: countlyAlerts,
    }],
    templates: [
        "/alerts/templates/vue-main.html",
    ]
});

app.alertsView.featureName = "alerts";

if (countlyAuth.validateRead(app.alertsView.featureName)) {
    app.route('/manage/alerts', 'alerts', function() {
        this.renderWhenReady(this.alertsView);
    });
}


$(document).ready(function() {
    if (countlyAuth.validateRead(app.alertsView.featureName)) {
        app.addSubMenu("management", {code: "alerts", url: "#/manage/alerts", text: "alert.plugin-title", priority: 40});
    }
});
