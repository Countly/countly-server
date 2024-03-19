/*global
   CV, _,  countlyVue, $, countlyCommon, jQuery,countlyGlobal, app, hooksPlugin, moment, CountlyHelpers,  countlyEvent, countlyAuth
 */
(function() {
    var FEATURE_NAME = "hooks";

    var TableView = countlyVue.views.BaseView.extend({
        template: '#hooks-table',
        mixins: [
            countlyVue.mixins.auth(FEATURE_NAME)
        ],
        computed: {
            tableRows: function() {
                var rows = this.$store.getters["countlyHooks/table/all"];
                if (this.filterStatus !== "all") {
                    var enabled = this.filterStatus === "enabled" ? true : false;
                    rows = rows.filter(function(r) {
                        return r.enabled === enabled;
                    });
                }

                if (this.filteredApps.length > 0) {
                    var self = this;
                    rows = rows.filter(function(r) {
                        var matched = false;
                        self.filteredApps.forEach(function(a) {
                            if (r.apps.indexOf(a) >= 0) {
                                matched = true;
                            }
                        });
                        return matched;
                    });
                }
                return rows;
            },
            initialized: function() {
                var result = this.$store.getters["countlyHooks/table/getInitialized"];
                return result;
            },

        },
        data: function() {
            var appsSelectorOption = [];
            for (var id in countlyGlobal.apps) {
                appsSelectorOption.push({label: countlyGlobal.apps[id].name, value: id, image: "background-image:url(" + countlyGlobal.apps[id].image + ")"});
            }
            return {
                appsSelectorOption: appsSelectorOption,
                filterStatus: 'all',
                filteredApps: [],
                localTableTrackedFields: ['enabled'],
                isAdmin: countlyGlobal.member.global_admin,
                deleteElement: null,
                showDeleteDialog: false,
                deleteMessage: '',
                tableDynamicCols: [{
                    value: "triggerCount",
                    label: CV.i18n('hooks.trigger-count'),
                    default: true
                },
                {
                    value: "lastTriggerTimestampString",
                    label: CV.i18n('hooks.trigger-last-time'),
                    default: true
                }],
                tablePersistKey: "hooks_table_" + countlyCommon.ACTIVE_APP_ID,

            };
        },
        methods: {
            handleHookEditCommand: function(command, scope) {
                if (command === "edit-comment") {
                    /* eslint-disable */
                     var data = Object.assign({}, scope.row);
                    /* eslint-enable */

                    delete data.operation;
                    delete data.triggerEffectColumn;
                    delete data.triggerEffectDom;
                    delete data.error_logs;
                    this.$store.dispatch("countlyHooks/resetTestResult");
                    this.$parent.$parent.openDrawer("home", data);
                }
                else if (command === "delete-comment") {
                    var self = this;
                    this.deleteElement = scope.row;
                    var deleteMessage = CV.i18n("hooks.delete-confirm", "<b>" + this.deleteElement.name + "</b>");
                    CountlyHelpers.confirm(deleteMessage, "red", function(result) {
                        if (!result) {
                            return true;
                        }
                        self.$store.dispatch("countlyHooks/deleteHook", self.deleteElement._id);
                    }, [jQuery.i18n.map['common.no-dont-delete'], jQuery.i18n.map['common.delete']], {title: jQuery.i18n.map['hooks.delete-confirm-title']});
                }
            },
            updateStatus: function(scope) {
                var diff = scope.diff;
                var status = {};
                diff.forEach(function(item) {
                    status[item.key] = item.newValue;
                });
                var self = this;
                this.$store.dispatch("countlyHooks/table/updateStatus", status).then(function() {
                    return self.$store.dispatch("countlyHooks/table/fetchAll");
                });
            },
            refresh: function() {
            },
            onRowClick: function(params) {
                app.navigate("/manage/hooks/" + params._id, true);
            },
            formatExportFunction: function() {
                var tableData = this.tableRows;
                var table = [];
                for (var i = 0; i < tableData.length; i++) {
                    var item = {};
                    item[CV.i18n('hooks.hook-name').toUpperCase()] = tableData[i].name;
                    item[CV.i18n('hooks.description').toUpperCase()] = tableData[i].description;
                    item[CV.i18n('hooks.trigger-and-actions').toUpperCase()] = hooksPlugin.generateTriggerActionsTreeForExport(tableData[i]);
                    item[CV.i18n('hooks.trigger-count').toUpperCase()] = tableData[i].triggerCount;
                    item[CV.i18n('hooks.trigger-last-time').toUpperCase()] = tableData[i].lastTriggerTimestampString === "-" ? "" : tableData[i].lastTriggerTimestampString;
                    item[CV.i18n('hooks.create-by').toUpperCase()] = tableData[i].createdByUser;

                    table.push(item);
                }
                return table;

            },
        }
    });


    var EffectFactory = {
        options: [
            {label: jQuery.i18n.map["hooks.EmailEffect"], value: 'EmailEffect'},
            {label: jQuery.i18n.map["hooks.CustomCodeEffect"], value: 'CustomCodeEffect'},
            {label: jQuery.i18n.map["hooks.HTTPEffect"], value: 'HTTPEffect'},
        ]
    };

    var HTTPEffect = countlyVue.views.BaseView.extend({
        template: '#hooks-effect-HTTPEffect',
        data: function() {
            return {
                methodOptions: [{label: 'GET', value: 'get'}, {label: 'POST', value: 'post'}],
            };
        },
        props: {
            value: {
                type: Object
            },
        },
        mounted: function() {
            this.value.requestData = _.unescape(this.value.requestData);
        },
        methods: {
            textChange: function(event) {
                this.value.requestData = _.unescape(event.currentTarget.value);
            }
        }
    });


    var EmailEffect = countlyVue.views.BaseView.extend({
        template: '#hooks-effect-EmailEffect',
        data: function() {
            return {
            };
        },
        props: {
            value: {
                type: Object
            },
        },
        watch: {
        },
        mounted: function() {
            this.value.emailTemplate = _.unescape(this.value.emailTemplate);
        },
        methods: {
            textChange: function(event) {
                this.value.emailTemplate = _.unescape(event.currentTarget.value);
            }
        }
    });

    var CustomCodeEffect = countlyVue.views.BaseView.extend({
        template: '#hooks-effect-CustomCode',
        data: function() {
            return {
                code: ''
            };
        },
        props: {
            value: {
                type: Object
            },
        },
        mounted: function() {
            this.value.code = _.unescape(this.value.code);
        },
        methods: {
            textChange: function(event) {
                this.value.code = _.unescape(event.currentTarget.value);
            }
        }
    });

    var EffectViews = countlyVue.views.BaseView.extend({
        template: '#hooks-effects',
        data: function() {
            return {
                selectedEffect: null,
                effectsOption: EffectFactory.options,
            };
        },
        computed: {
            effectType: function() {
                return this.value.type;
            }
        },
        props: {
            value: {
                type: Object
            },
        },
        watch: {
            effectType: function(newValue, oldValue) {
                if (!oldValue && this.value.configuration) { // edit record
                    return;
                }
                switch (newValue) {
                case 'EmailEffect':
                    this.value.configuration = {address: [], emailTemplate: ''};
                    break;
                case 'CustomCodeEffect':
                    this.value.configuration = {code: ''};
                    break;
                case 'HTTPEffect':
                    this.value.configuration = {url: '', method: '', requestData: ''};
                    break;
                default:
                    return;
                }
            },

        },
        components: {
            EmailEffect: EmailEffect,
            CustomCodeEffect: CustomCodeEffect,
            HTTPEffect: HTTPEffect,
        },
        methods: {
            removeEffect: function() {
                this.$emit('removeEffect', this.$attrs.index);
            },
        }
    });


    var TriggerFactory = {
        options: [
            {label: jQuery.i18n.map["hooks.trigger-api-endpoint-uri"], value: 'APIEndPointTrigger'},
            {label: jQuery.i18n.map["hooks.IncomingData"], value: 'IncomingDataTrigger'},
            {label: jQuery.i18n.map["hooks.internal-event-selector-title"], value: 'InternalEventTrigger'},
            {label: jQuery.i18n.map["hooks.ScheduledTrigger"], value: 'ScheduledTrigger'},
        ]
    };

    var IncomingDataTrigger = countlyVue.views.BaseView.extend({
        template: '#hooks-IncomingDataTrigger',
        data: function() {
            var defaultFilter = {};
            var result = {};
            try {
                defaultFilter = JSON.parse(this.$props.value.filter) || {};
            }
            finally {
                result = {
                    eventOptions: [],
                    hiddenFields: [],
                    openSegmentTab: this.$props.value.filter ? true : false,
                    query: defaultFilter.dbFilter,
                };
            }
            return result;
        },
        components: {

        },
        props: {
            value: {
                type: Object
            },
            app: {
                type: String,
            }
        },
        mounted: function() {
            this.getEventOptions();
        },
        computed: {
            selectedEvent: function() {
                var event = this.$props.value.event[0];
                if (event && event.indexOf("***") > 0) {
                    event = event.split("***")[1];
                    return event;
                }
                return "";
            },
            queryObj: {
                set: function(newValue) {
                    var queryData = Object.assign({}, this.$props.value);
                    queryData.filter = JSON.stringify({dbFilter: newValue});
                    this.$emit("input", queryData);
                    this.query = newValue;
                    return;
                },
                get: function() {
                    return this.query;
                }
            },
            selectedApp: function() {
                return this.$props.app;
            }
        },
        watch: {
            selectedApp: function() {
                this.getEventOptions();
            },
            'openSegmentTab': {
                deep: true,
                handler: function(newVal) {
                    if (!newVal) {
                        this.queryObj = {} ;
                    }
                }
            },
        },
        methods: {
            eventChange: function() {
                this.queryObj = {};
            },
            queryChange: function(changedQueryWrapper, isQueryValid) {
                if (isQueryValid) {
                    /* eslint-disable */
                    var queryObj = Object.assign({}, this.$props.value);
                    queryObj.filter = JSON.stringify({dbFilter: changedQueryWrapper.query});
                    this.$emit("input", Object.assign({}, queryObj));
                    /* eslint-enable */
                }
            },
            getEventOptions: function() {
                var self = this;
                var apps = [this.$props.app];
                countlyEvent.getEventsForApps(apps, function(events) {
                    events = events.map(function(e) {
                        e.label = e.name; return e;
                    });
                    $.ajax({
                        type: "GET",
                        url: countlyCommon.API_URL + '/o/internal-events',
                        data: {
                            app_id: apps[0],
                        },
                        success: function(json) {
                            var internal_events = [];
                            json.forEach(function(event) {
                                internal_events.push({value: apps[0] + "***" + event, label: jQuery.i18n.map["internal-events." + event] || event, description: '', count: '', sum: ''});
                            });
                            events = events.concat(internal_events);
                            events.unshift({value: apps[0] + "****", label: jQuery.i18n.map["hooks.any-events"]});
                            self.eventOptions = Object.assign([], events);
                        }
                    });
                });

            },
        },
    });


    var InternalEventTrigger = countlyVue.views.BaseView.extend({
        template: '#hooks-InternalEventTrigger',
        data: function() {
            return {
                internalEventOptions: [
                    {value: "/cohort/enter", label: "/cohort/enter"},
                    {value: "/cohort/exit", label: "/cohort/exit"},
                    {value: "/i/app_users/create", label: "/i/app_users/create"},
                    {value: "/i/app_users/update", label: "/i/app_users/update"},
                    {value: "/i/app_users/delete", label: "/i/app_users/delete"},
                    {value: "/i/apps/create", label: "/i/apps/create"},
                    {value: "/i/apps/update", label: "/i/apps/update"},
                    {value: "/i/apps/delete", label: "/i/apps/delete"},
                    {value: "/i/users/create", label: "/i/users/create"},
                    {value: "/i/users/update", label: "/i/users/update"},
                    {value: "/i/users/delete", label: "/i/users/delete"},
                    {value: "/master", label: "/master"},
                    {value: "/systemlogs", label: "/systemlogs"},
                    {value: "/crashes/new", label: "/crashes/new"},
                    {value: "/hooks/trigger", label: "/hooks/trigger"},
                    {value: "/alerts/trigger", label: "/alerts/trigger"}
                ],
                cohortOptions: [],
                hookOptions: [],
                alertOptions: []
            };
        },
        computed: {
            selectedApp: function() {
                return this.$props.app;
            }
        },
        props: {
            value: {
                type: Object
            },
            app: {
                type: String,
            }
        },
        mounted: function() {
            this.getCohortOptioins();
            this.getHookOptions();
            this.getAlertOptions();
        },
        watch: {
            selectedApp: function() {
                this.getCohortOptioins();
                this.getHookOptions();
                this.getAlertOptions();
            }
        },
        methods: {
            getCohortOptioins: function() {
                var apps = [this.$props.app];
                var data = {
                    "app_id": apps[0], //countlyCommon.ACTIVE_APP_ID,
                    "method": "get_cohorts",
                    "display_loader": false
                };
                var self = this;
                $.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.r,
                    data: data,
                    dataType: "json",
                    success: function(cohorts) {
                        var cohortItems = [];
                        cohorts.forEach(function(c) {
                            cohortItems.push({ value: c._id, label: c.name});
                        });
                        self.cohortOptions = Object.assign([], cohortItems);
                    }
                });
            },
            getHookOptions: function() {
                var self = this;
                var apps = [this.$props.app];
                $.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.r + '/hook/list',
                    data: {app_id: this.$props.app},
                    dataType: "json",
                    success: function(data) {
                        var hookList = [];
                        data.hooksList.forEach(function(hook) {
                            if (hook.apps.indexOf(apps[0]) > -1) {
                                hookList.push({value: hook._id, label: hook.name});
                            }
                        });
                        self.hookOptions = hookList;
                    }
                });

            },
            getAlertOptions: function() {
                var self = this;
                var selectedApps = [this.$props.app];
                $.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.r + '/alert/list',
                    data: {app_id: this.$props.app},
                    dataType: "json",
                    success: function(data) {
                        var alertList = [];
                        data.alertsList.forEach(function(alert) {
                            if (alert.selectedApps.indexOf(selectedApps[0]) > -1) {
                                alertList.push({value: alert._id, label: alert.alertName});
                            }
                        });
                        self.alertOptions = alertList;
                    }
                });
            },
        }
    });

    var ScheduledTrigger = countlyVue.views.BaseView.extend({
        template: '#hooks-ScheduledTrigger',
        data: function() {
            var zones = [];
            /* eslint-disable  no-loop-func */
            for (var country in countlyGlobal.timezones) {
                var c = countlyGlobal.timezones[country];
                c && c.z && c.z.forEach(function(item) {
                    for (var zone in item) {
                        zones.push({value: item[zone], label: countlyGlobal.timezones[country].n + ' ' + zone, image: "background-image:url(" + countlyGlobal.path + "/images/flags/" + country.toLowerCase() + ".png)"});
                    }
                });
            }
            /* eslint-enable  no-loop-func */

            return {
                period1Options: [
                    {value: 'month', label: 'Every Month'},
                    {value: 'week', label: 'Every Week'},
                    {value: 'day', label: 'Every Day'},
                ],
                periodDaysOptions: Array.from(Array(31).keys()).map(function(item, idx) {
                    return {value: idx + 1, label: idx + 1};
                }),

                periodHoursOptions: Array.from(Array(24).keys()).map(function(item, idx) {
                    return {value: idx, label: idx < 10 ? '0' + idx + ':00' : idx + ":00"};
                }),

                periodWeekOptions: Array.from(Array(7).keys()).map(function(item, idx) {
                    return {value: idx, label: ['Sunday', 'Monday', 'Tursday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][idx]};
                }),
                timezoneOptions: zones,

            };
        },
        props: {
            value: {
                type: Object
            }
        },
        computed: {
            cron: function() {
                var cron = null;

                var period1 = this.value.period1;
                var period2 = this.value.period2;
                var period3 = this.value.period3;

                switch (period1) {
                case "month":
                    cron = ["23", period3, period2, "*", "*"];
                    break;
                case "week":
                    cron = ["0", period3, "*", "*", period2];
                    break;
                case "day":
                    cron = ["0", period3, "*", "*", "*"];
                    break;
                default:
                    this.value.cron = null;
                    return null;
                }

                this.value.cron = cron.join(" ");
                return cron.join(" ");

            }
        }
    });

    var APIEndPointTrigger = countlyVue.views.BaseView.extend({
        template: '#hooks-APIEndpointTrigger',
        data: function() {
            return {
            };
        },
        mounted: function() {
        },
        computed: {
            url: function() {
                return window.location.protocol + "//" + window.location.host + "/o/hooks/" + this.value.path;
            },
            valuePath: function() {
                return this.value.path;
            }

        },
        props: {
            value: {
                type: Object
            },
        },
        watch: {
            valuePath: function() {
                if (!this.value.path) {
                    var uri = ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, function(c) {
                        return (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16);
                    });
                    this.$emit("input", {path: uri, method: 'get'});
                }
            }
        },
        methods: {
            copyURL: function() {
                var textbox = document.getElementById('url-box');
                textbox.select();
                document.execCommand("Copy");
                CountlyHelpers.notify({clearAll: true, type: 'green', title: jQuery.i18n.map['hooks.copy-notify-title'], message: jQuery.i18n.map['hooks.copy-notify-message'], info: "", delay: 2000, sticky: false});
            }
        }
    });

    var TriggerViews = countlyVue.views.BaseView.extend({
        template: '#hooks-triggers',
        data: function() {
            return {
                triggersOption: TriggerFactory.options,
            };
        },
        computed: {
            triggerType: function() {
                return this.value.type;
            }
        },
        props: {
            value: {
                type: Object
            },

        },
        watch: {
            triggerType: function(newValue, oldValue) {
                if (!oldValue && this.value.configuration) { // edit record
                    return;
                }
                switch (newValue) {
                case 'APIEndPointTrigger':
                    var uri = ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, function(c) {
                        return (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16);
                    });
                    this.value.configuration = {path: uri, method: 'get'};
                    break;
                case 'IncomingDataTrigger':
                    this.value.configuration = {event: [null], filter: null};
                    break;
                case 'InternalEventTrigger':
                    this.value.configuration = {eventType: null, cohortID: null, hookID: null, alertID: null};
                    break;
                case 'ScheduledTrigger':
                    this.value.configuration = {period1: 'month', cron: null};
                    break;
                }
            },
        },
        components: {
            APIEndPointTrigger: APIEndPointTrigger,
            IncomingDataTrigger: IncomingDataTrigger,
            InternalEventTrigger: InternalEventTrigger,
            ScheduledTrigger: ScheduledTrigger,
        },
        methods: {
        }
    });

    var HookDrawer = countlyVue.views.BaseView.extend({
        template: '#hooks-drawer',
        components: {
            "hook-trigger": TriggerViews,
            "hook-effect": EffectViews,
        },

        data: function() {
            var appsSelectorOption = [];
            var appsSelectorOption2 = [];
            for (var id in countlyGlobal.apps) {
                var item = {label: countlyGlobal.apps[id].name, value: id, image: "background-image:url(" + countlyGlobal.apps[id].image + ")"};
                if (countlyAuth.validateCreate(FEATURE_NAME, countlyGlobal.member, id)) {
                    appsSelectorOption.push(item);
                }
                if (countlyAuth.validateUpdate(FEATURE_NAME, countlyGlobal.member, id)) {
                    appsSelectorOption2.push(item);
                }
            }

            return {
                title: "",
                saveButtonLabel: "",
                appsSelectorOption: appsSelectorOption,
                appsSelectorOption2: appsSelectorOption2,
                testClaps: [],
                newTest: false,
                description: "",
            };
        },
        computed: {
            testResult: function() {
                var testResult = this.$store.getters["countlyHooks/testResult"];
                if ((this.$data.newTest === true) && (testResult.length > 0)) {
                    this.$data.newTest = false;
                    this.$data.testClaps = [];
                    for (var i = 0; i < testResult.length; i++) {
                        if (testResult[i].logs) {
                            this.$data.testClaps.push(i);
                        }
                    }

                }
                return testResult || [];
            }
        },
        props: {
            controls: {
                type: Object
            }
        },
        methods: {
            onSubmit: function(doc) {
                this.$store.dispatch("countlyHooks/saveHook", doc);
            },
            onClose: function($event) {
                this.$emit("close", $event);
            },
            onCopy: function(newState) {
                if (newState._id !== null) {
                    this.title = jQuery.i18n.map["hooks.edit-your-hook"];
                    this.saveButtonLabel = jQuery.i18n.map["hooks.save-hook"];
                    return;
                }
                this.title = jQuery.i18n.map["hooks.drawer-create-title"];
                this.saveButtonLabel = jQuery.i18n.map["hooks.create-hook"];
            },
            addEffect: function() {
                this.$refs.drawerData.editedObject.effects.push({type: null, configuration: null});
            },

            removeEffect: function(index) {
                this.$refs.drawerData.editedObject.effects.splice(index, 1);
            },

            testHook: function() {
                var hookData = this.$refs.drawerData.editedObject;
                this.$data.newTest = true;
                this.$store.dispatch("countlyHooks/testHook", hookData);
            },
        }
    });

    var HooksHomeViewComponent = countlyVue.views.BaseView.extend({
        template: "#hooks-home",
        mixins: [
            countlyVue.mixins.hasDrawers("home"),
            countlyVue.mixins.auth(FEATURE_NAME),
        ],
        components: {
            "table-view": TableView,
            "drawer": HookDrawer,
        },
        data: function() {
            return {};
        },
        beforeCreate: function() {
            this.$store.dispatch("countlyHooks/initialize");
        },
        methods: {
            createHook: function() {
                this.$store.dispatch("countlyHooks/resetTestResult");
                this.openDrawer("home", hooksPlugin.defaultDrawerConfigValue());
            },
        },
    });



    var DetailErrorsTableView = countlyVue.views.BaseView.extend({
        template: '#hooks-detail-errors-table-view',
        computed: {
            tableRows: function() {
                var hookDetail = this.$store.getters["countlyHooks/hookDetail"];
                hookDetail.error_logs = hookDetail.error_logs && hookDetail.error_logs.reverse();
                return hookDetail.error_logs || [];
            },
            detailLogsInitialized: function() {
                var result = this.$store.getters["countlyHooks/getDetailLogsInitialized"];
                return result;
            },
            hookDetail: function() {
                var hookDetail = this.$store.getters["countlyHooks/hookDetail"];
                return hookDetail;
            }
        },
        data: function() {
            return {
            };
        },
        methods: {
            refresh: function() {
            // this.$store.dispatch("countlyHooks/table/fetchAll");
            },
            downloadLog: function(text, timestamp) {
                var element = document.createElement('a');
                var fileName = 'HookError-' + this.hookDetail._id + '-' + timestamp + '.txt';
                element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
                element.setAttribute('download', fileName);

                element.style.display = 'none';
                document.body.appendChild(element);

                element.click();

                document.body.removeChild(element);

            }
        }
    });

    var HooksDetailComponent = countlyVue.views.BaseView.extend({
        template: "#hooks-detail-view",
        mixins: [
            countlyVue.mixins.hasDrawers("detail"),
            countlyVue.mixins.auth(FEATURE_NAME),
        ],
        components: {
            "error-table-view": DetailErrorsTableView,
            "drawer": HookDrawer,
        },
        data: function() {
            return {
                deleteElement: null,
            };
        },
        computed: {
            hookDetail: function() {
                var hookDetail = this.$store.getters["countlyHooks/hookDetail"];
                hookDetail.created_at_string = moment(hookDetail.created_at).fromNow();
                hookDetail.lastTriggerTimestampString = hookDetail.lastTriggerTimestamp && moment(hookDetail.lastTriggerTimestamp).fromNow() || "-";
                return hookDetail;
            },
            detailLogsInitialized: function() {
                return this.$store.getters["countlyHooks/getDetailLogsInitialized"];
            }
        },
        methods: {
            handleHookEditCommand: function(command, scope) {
                if (command === "edit-comment") {
                    var data = Object.assign({}, scope);
                    delete data.operation;
                    delete data.triggerEffectColumn;
                    delete data.triggerEffectDom;
                    delete data.error_logs;
                    this.$store.dispatch("countlyHooks/resetTestResult");
                    this.openDrawer("detail", data);
                }
                else if (command === "delete-comment") {
                    var self = this;
                    this.deleteElement = scope;
                    var deleteMessage = CV.i18n("hooks.delete-confirm", "<b>" + this.deleteElement.name + "</b>");
                    CountlyHelpers.confirm(deleteMessage, "red", function(result) {
                        if (!result) {
                            return true;
                        }
                        self.$store.dispatch("countlyHooks/deleteHook", self.deleteElement._id);
                    }, [jQuery.i18n.map['common.no-dont-delete'], jQuery.i18n.map['common.delete']], {title: jQuery.i18n.map['hooks.delete-confirm-title']});
                }
            },
        },
        beforeCreate: function() {
            this.$store.dispatch("countlyHooks/initializeDetail", this.$route.params.id, {root: true});
        }
    });


    var hooksView = new countlyVue.views.BackboneWrapper({
        component: HooksHomeViewComponent,
        vuex: [{
            clyModel: hooksPlugin
        }],
        templates: [
            {
                namespace: "hooks",
                mapping: {
                    "home": "/hooks/templates/vue-main.html",
                    "table": "/hooks/templates/vue-table.html",
                    "drawer": "/hooks/templates/vue-drawer.html",
                },
            },
            "/hooks/templates/vue-triggers.html",
            "/hooks/templates/vue-effects.html",
            "/drill/templates/query.builder.v2.html",
        ]
    });

    var hooksDetailView = new countlyVue.views.BackboneWrapper({
        component: HooksDetailComponent,
        vuex: [{
            clyModel: hooksPlugin
        }],
        templates: [
            {
                namespace: "hooks",
                mapping: {
                    "drawer": "/hooks/templates/vue-drawer.html",
                },
            },
            "/hooks/templates/vue-hooks-detail.html",
            "/hooks/templates/vue-hooks-detail-error-table.html",
            "/hooks/templates/vue-triggers.html",
            "/hooks/templates/vue-effects.html",
            "/drill/templates/query.builder.v2.html",
        ]
    });

    app.route('/manage/hooks', 'hooks', function() {
        this.renderWhenReady(hooksView);
    });

    app.route("/manage/hooks/:id", "hooks-detail", function(id) {
        var params = {
            id: id
        };

        hooksDetailView.params = params;
        this.renderWhenReady(hooksDetailView);
    });

    app.addMenu("management", {code: "hooks", permission: FEATURE_NAME, url: "#/manage/hooks", text: "hooks.plugin-title", priority: 110});

    //check if configuration view exists
    if (app.configurationsView) {
        app.configurationsView.registerLabel("hooks", "hooks.plugin-title");
        app.configurationsView.registerLabel("hooks.batchSize", "hooks.batch-size");
    }
})();
