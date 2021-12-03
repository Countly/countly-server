/*global
   CV, countlyVue, Uint8Array, $, countlyCommon, jQuery,countlyGlobal, app, hooksPlugin, moment, CountlyHelpers,  countlyEvent, countlyAuth
 */
(function() {
    var FEATURE_NAME = "hooks";

    var TableView = countlyVue.views.BaseView.extend({
        template: '#hooks-table',
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
                showDeleteDialog: false,
                deleteMessage: '',
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
                    delete data.nameDescColumn;
                    delete data.triggerEffectDom;
                    this.$parent.$parent.openDrawer("home", data);
                }
                else if (command === "delete-comment") {
                    this.deleteElement = scope.row;
                    this.showDeleteDialog = true;
                    this.deleteMessage = CV.i18n("hooks.delete-confirm", "<b>" + this.deleteElement.name + "</b>");
                }
            },
            closeDeleteForm: function() {
                this.deleteElement = null;
                this.showDeleteDialog = false;
            },
            submitDeleteForm: function() {
                this.$store.dispatch("countlyHooks/deleteHook", this.deleteElement._id);
                this.showDeleteDialog = false;
            },
            updateStatus: function(scope) {
                var diff = scope.diff;
                var status = {};
                diff.forEach(function(item) {
                    status[item.key] = item.newValue;
                });
                this.$store.dispatch("countlyHooks/table/updateStatus", status);

                scope.unpatch();
            },
            refresh: function() {
            // this.$store.dispatch("countlyHooks/table/fetchAll");
            },
            onRowClick: function(params, target) {
                if (target.id === 'el-table_1_column_1') {
                    return;
                }
                app.navigate("/manage/hooks/" + params._id, true);
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
                methodOptions: [{label: 'GET', value: 'GET'}, {label: 'POST', value: 'POST'}],
            };
        },
        props: {
            value: {
                type: Object
            },
        },
        methods: {
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
            var self = this;
            var REGEX_EMAIL = '([a-z0-9!#$%&\'*+/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&\'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)';
            self.emailInput = $(this.$el).find('select.email-list-input').selectize({
                plugins: ['remove_button'],
                persist: false,
                maxItems: null,
                valueField: 'email',
                labelField: 'name',
                searchField: ['name', 'email'],
                options: [
                    {email: countlyGlobal.member.email, name: ''},
                ],
                render: {
                    item: function(item, escape) {
                        return '<div>' +
                            (item.name ? '<span class="name">' + escape(item.name) + '</span>' : '') +
                            (item.email ? '<span class="email">' + escape(item.email) + '</span>' : '') +
                        '</div>';
                    },
                    option: function(item, escape) {
                        var label = item.name || item.email;
                        var caption = item.name ? item.email : null;
                        return '<div>' +
                            '<span class="label">' + escape(label) + '</span>' +
                            (caption ? '<span class="caption">' + escape(caption) + '</span>' : '') +
                        '</div>';
                    }
                },
                createFilter: function(input) {
                    var match, regex;
                    // email@address.com
                    regex = new RegExp('^' + REGEX_EMAIL + '$', 'i');
                    match = input.match(regex);
                    if (match) {
                        return !Object.prototype.hasOwnProperty.call(this.options, match[0]);
                    }
                    // name <email@address.com>
                    /*eslint-disable */
                    regex = new RegExp('^([^<]*)\<' + REGEX_EMAIL + '\>$', 'i');
                    /*eslint-enable */
                    match = input.match(regex);
                    if (match) {
                        return !Object.prototype.hasOwnProperty.call(this.options, match[2]);
                    }
                    return false;
                },
                create: function(input) {
                    if ((new RegExp('^' + REGEX_EMAIL + '$', 'i')).test(input)) {
                        return {email: input};
                    }
                    /*eslint-disable */
                    var match = input.match(new RegExp('^([^<]*)\<' + REGEX_EMAIL + '\>$', 'i'));
                    /*eslint-enable */
                    if (match) {
                        return {
                            email: match[2],
                            name: $.trim(match[1])
                        };
                    }
                    CountlyHelpers.alert('Invalid email address.', "red");
                    return false;
                },
                onChange: function(value) {
                    self.$emit("input", {address: value || [], emailTemplate: self.value.emailTemplate});
                }
            });
            if (this.value && this.value.address) {
                for (var i = 0; i < this.value.address.length; i++) {
                    this.emailInput[0].selectize.addOption({ "name": '', "email": this.value.address[i] });
                }
                this.emailInput[0].selectize.setValue(this.value.address, false);
            }
        },
        methods: {
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
        methods: {
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
                var change = this.$refs.filterSegments.setQuery.bind(this.$refs.filterSegments, {}, function() {});
                setTimeout(function() {
                    change({}, function() {});
                }, 0);

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
                ],
                cohortOptions: [],
                hookOptions: [],
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
        },
        watch: {
            selectedApp: function() {
                this.getCohortOptioins();
                this.getHookOptions();
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
                    data: {},
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
                        zones.push({value: item[zone], label: countlyGlobal.timezones[country].n + ' ' + zone});
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
                    this.value.configuration = {eventType: null, cohortID: null, hookID: null };
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
            for (var id in countlyGlobal.apps) {
                appsSelectorOption.push({label: countlyGlobal.apps[id].name, value: id});
            }
            return {
                title: "",
                saveButtonLabel: "",
                appsSelectorOption: appsSelectorOption,
            };
        },
        computed: {
            testResult: function() {
                var testResult = this.$store.getters["countlyHooks/testResult"];
                return testResult || [];
            },
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
                this.$store.dispatch("countlyHooks/testHook", hookData);
            },
        }
    });

    var HooksHomeViewComponent = countlyVue.views.BaseView.extend({
        template: "#hooks-home",
        mixins: [countlyVue.mixins.hasDrawers("home")],
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
                this.openDrawer("home", hooksPlugin.defaultDrawerConfigValue());
            },
        },
    });



    var DetailErrorsTableView = countlyVue.views.BaseView.extend({
        template: '#hooks-detail-errors-table-view',
        computed: {
            tableRows: function() {
                var hookDetail = this.$store.getters["countlyHooks/hookDetail"];
                hookDetail.error_logs && hookDetail.error_logs.forEach(function(item) {
                    item.timestamp_string = moment(item.timestamp).format();
                });
                return hookDetail.error_logs || [];
            },
        },
        data: function() {
            return {
            };
        },
        methods: {
            refresh: function() {
            // this.$store.dispatch("countlyHooks/table/fetchAll");
            },
        }
    });

    var HooksDetailComponent = countlyVue.views.BaseView.extend({
        template: "#hooks-detail-view",
        mixins: [countlyVue.mixins.hasDrawers("detail")],
        components: {
            "error-table-view": DetailErrorsTableView,
            "drawer": HookDrawer,
        },
        data: function() {
            return {
                deleteElement: null,
                showDeleteDialog: false,
                deleteMessage: '',
            };
        },
        computed: {
            hookDetail: function() {
                var hookDetail = this.$store.getters["countlyHooks/hookDetail"];
                hookDetail.created_at_string = moment(hookDetail.created_at).fromNow();
                hookDetail.lastTriggerTimestampString = moment(hookDetail.lastTriggerTimestamp).fromNow();
                return hookDetail;
            }
        },
        methods: {
            handleHookEditCommand: function(command, scope) {
                if (command === "edit-comment") {
                    var data = Object.assign({}, scope);
                    delete data.operation;
                    delete data.triggerEffectColumn;
                    delete data.nameDescColumn;
                    delete data.triggerEffectDom;
                    this.openDrawer("detail", data);
                }
                else if (command === "delete-comment") {
                    this.deleteElement = scope;
                    this.showDeleteDialog = true;
                    this.deleteMessage = CV.i18n("hooks.delete-confirm", "<b>" + this.deleteElement.name + "</b>");
                }
            },
            closeDeleteForm: function() {
                this.deleteElement = null;
                this.showDeleteDialog = false;
            },
            submitDeleteForm: function() {
                this.$store.dispatch("countlyHooks/deleteHook", this.deleteElement._id);
                this.showDeleteDialog = false;
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
            "/drill/templates/drill.query.builder.html",
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
            "/drill/templates/drill.query.builder.html",
            "/drill/templates/query.builder.v2.html",

        ]
    });


    if (countlyAuth.validateRead(FEATURE_NAME)) {
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
    }

    $(document).ready(function() {
        if (countlyAuth.validateRead(FEATURE_NAME)) {
            app.addSubMenu("management", {code: "hooks", url: "#/manage/hooks", text: "hooks.plugin-title", priority: 60});

            //check if configuration view exists
            if (app.configurationsView) {
                app.configurationsView.registerLabel("hooks", "hooks.plugin-title");
                app.configurationsView.registerLabel("hooks.batchSize", "hooks.batch-size");
            }
        }

    });
})();
