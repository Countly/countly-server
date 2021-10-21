/*global
  DrillQueryBuilder, countlyView, $, jQuery,countlyGlobal, app, T, Handlebars, hooksPlugin, _, moment, CountlyHelpers,  countlyEvent, Vue, T
 */
window.HooksView = countlyView.extend({
    statusChanged: {},
    initialize: function () {
        var self = this;
        return $.when(
            T.get('/hooks/templates/main.html', function (src) {
                self.template = Handlebars.compile(src);
            }),
            T.get('/hooks/templates/drawer.html', function (src) {
                Handlebars.registerPartial("hooks-widget-drawer", src);
            }),
            hooksPlugin.requestHookList()).then(function () {});
    },
    beforeRender: function () {
    },
    renderCommon: function (refresh) {
        if (!refresh) {
            try {
                $(this.el).html(this.template({"email-placeholder": jQuery.i18n.map["hook.email-place-holder"]}));
            }
            catch (e) {
                //silent catch
            }
            this.renderTable();
            this.DrawerComponent = window.HooksDrawer(this);
            this.DrawerComponent.prepareDrawer();
        }
    },
    renderTable: function () {
        var pluginsData = [];
        var self = this;
        var hookList = hooksPlugin.getHookList();

        for (var i = 0; i < hookList.length; i++) {
            var appNameList = [];
            if (hookList[i].apps) {
                appNameList = _.map(hookList[i].apps, function (appID) {
                    return countlyGlobal.apps[appID] && countlyGlobal.apps[appID].name;
                });
            }

            pluginsData.push({
                id: hookList[i]._id,
                name: hookList[i].name || '',
                description: hookList[i].description || '-',
                appNameList: appNameList.join(', '),
                triggerCount: hookList[i].triggerCount || 0,
                lastTriggerTimestampString: hookList[i].lastTriggerTimestamp && moment(hookList[i].lastTriggerTimestamp).fromNow() || "-",
                lastTriggerTimestamp: hookList[i].lastTriggerTimestamp || 0,
                enabled: hookList[i].enabled || false,
                createdByUser: hookList[i].createdByUser || '',
                trigger: hookList[i].trigger,
                effects: hookList[i].effects,
                created_at: hookList[i].created_at || 0,
            });
        }

        var isAdmin = countlyGlobal.member.global_admin;
        var dataTableDefine = {
            "aaData": pluginsData,
            "aoColumns": [
                {
                    "mData": function (row, type) {
                        if (type === "display") {
                            var disabled = (row.prepackaged) ? 'disabled' : '';
                            var input = '<div class="on-off-switch ' + disabled + '">';
                            if (row.enabled) {
                                input += '<input type="checkbox" class="on-off-switch-checkbox hook-switcher" id="plugin-' + row.id + '" checked ' + disabled + '>';
                            }
                            else {
                                input += '<input type="checkbox" class="on-off-switch-checkbox hook-switcher" id="plugin-' + row.id + '" ' + disabled + '>';
                            }
                            input += '<label class="on-off-switch-label" for="plugin-' + row.id + '"></label>';
                            //input += '<span class="text">' + 'Enable' + '</span>';
                            return input;
                        }
                        else {
                            return row.enabled;
                        }
                    },
                    "sType": "string",
                    "sTitle": jQuery.i18n.map["common.status"],
                    "bSortable": false,
                    "sWidth": "8%",
                },
                {
                    "mData": function (row, type) {
                        if (type === "display") {
                            var input = '<div style="color:#444444;width: 90%;text-overflow:ellipsis;overflow:hidden;white-space:nowrap;">' + row.name + '</div>';
                            if (row.description) {
                                input += '<div style="color:#aaaaaa;width: 90%;text-overflow:ellipsis;overflow:hidden;white-space:nowrap;">' + row.description + '</div>';
                            }
                            return input;
                        }
                        else {
                            return row.enabled;
                        }
                    },
                    "sType": "string",
                    "bSortable": false,
                    "sTitle": jQuery.i18n.map["hooks.hook-name"],
                    "sWidth": "20%",

                },

                /*   {
                    "mData": 'appNameList',
                    "sType": "string",
                    "sTitle": jQuery.i18n.map["hooks.applications"],
                    "bSortable": false,
                },
                */
                {
                    "mData": function (row, type) {
                        var triggerNames = {
                            "APIEndPointTrigger": jQuery.i18n.map["hooks.trigger-api-endpoint-uri"],
                            "IncomingDataTrigger": jQuery.i18n.map["hooks.IncomingData"],
                            "InternalEventTrigger": jQuery.i18n.map["hooks.internal-event-selector-title"],
                        };

                        if (type === "display") {
                            var triggerText = triggerNames[row.trigger.type];
                            try {
                                if (row.trigger.type === "IncomingDataTrigger") {
                                    var event = row.trigger.configuration.event;
                                    var parts = event[0].split("***");
                                    triggerText += "<span style='margin-left:5px;font-weight: 400;'>" + parts[1] + "</span>";
                                }
                                if (row.trigger.type === "InternalEventTrigger") {
                                    event = row.trigger.configuration.eventType;
                                    triggerText += "<span style='margin-left:5px;font-weight: 400;'>" + event + "</span>";
                                }
                            }
                            catch (e) {
                                //silent catch
                            }

                            var effectList = "";
                            row.effects.forEach(function (effect) {
                                if (effect.type === "EmailEffect") {
                                    effectList += '<div class="table-effect-node"><div class="line-dot"></div><div class="dot"></div><div style="width:90%;text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">E-mail:' + "<span style='margin-left:5px;font-weight: 400;color:#444444;'>" + effect.configuration.address + '</span></div></div>';
                                }
                                if (effect.type === "HTTPEffect") {
                                    effectList += '<div class="table-effect-node"><div class="line-dot"></div><div class="dot"></div><div style="width:90%;text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">URL:' + "<span style='margin-left:5px;font-weight: 400;color:#444444;'>" + effect.configuration.url + '</span></div></div>';
                                }
                            });
                            var input = '<div style="color:#909090;text-transform:uppercase;">' + jQuery.i18n.map["hooks.trigger"] + '</div>';
                            input += '<div class="text" style="font-size:11px;color:#444444;">' + triggerText + '</div>';
                            input += '<div style="margin-top:12px; color:#909090;text-transform:uppercase;">' + jQuery.i18n.map["hooks.effects"] + '</div>';
                            input += '<div style="margin:5px 0 0 2px;">';
                            input += effectList;
                            //input += '<div class="table-effect-node"><div class="line-dot"></div><div class="dot"></div><div>E-mail: abc.com</div></div>';
                            // input += '<div class="table-effect-node"><div class="line-dot"></div><div class="dot"></div><div>E-mail: abc.com</div></div>';
                            input += '</div>';

                            return input;
                        }
                        else {
                            return row.trigger;
                        }
                    },
                    "sType": "string",
                    "sTitle": jQuery.i18n.map["hooks.trigger-and-effects"],
                    "sWidth": "25%",
                    "bSortable": false,

                },
                {
                    "mData": 'triggerCount',
                    "sType": "numeric",
                    "sTitle": jQuery.i18n.map["hooks.trigger-count"],
                    "bSortable": true,
                    "sWidth": "16%",
                },
                {
                    "mData": function (row, type) {
                        try {
                            if (type === "display") {
                                return "<div>" + row.lastTriggerTimestampString + "</div>";
                            }
                            return row.lastTriggerTimestamp;
                        }
                        catch (e) {
                            //silent catch
                        }
                    },
                    "sType": "string",
                    "sTitle": jQuery.i18n.map["hooks.trigger-last-time"],
                    "bSortable": true,
                    "sWidth": "16%",
                },
            ]
        };
        if (isAdmin) {
            dataTableDefine.aoColumns.push({
                "mData": function (row, type) {
                    try {
                        if (type === "display") {
                            var created_at_string = "";
                            if (row.created_at) {
                                created_at_string = moment(row.created_at).fromNow();
                            }
                            return "<div style='text-overflow:ellipsis; overflow:hidden; white-space:nowrap;'>" + row.createdByUser + "</div> <div style='color:#aaaaaa;margin-top:4px;text-overflow:ellipsis; overflow:hidden; white-space:nowrap;'>" + created_at_string + "</div>";
                        }
                        return row.createdByUser;
                    }
                    catch (e) {
                        //silent catch
                    }
                },
                "sType": "string",
                "sTitle": jQuery.i18n.map["hooks.create-by"],
                "bSortable": false,
                "sWidth": "10%",
            });
        }
        dataTableDefine.aoColumns.push({
            "mData": function (row) {
                return "<div class='options-item'>" +
					"<div class='edit'></div>" +
					"<div class='edit-menu hooks-menu'>" +
					"<div class='edit-hook item'" + " id='" + row.id + "'" + "><i class='fa fa-pencil'></i>" + jQuery.i18n.map["hooks.edit"] + "</div>" +
					"<div class='delete-hook item'" + " id='" + row.id + "'" + " data-name='" + row.name + "'" + "><i class='fa fa-trash'></i>" + jQuery.i18n.map["hooks.delete"] + "</div></div>" +
					"</div>";
            },
            "bSortable": false,
        });
        try {
            this.dtable = $('#hooks-table').dataTable($.extend({}, $.fn.dataTable.defaults, dataTableDefine));
            this.dtable.stickyTableHeaders();
            this.dtable.fnSort([[0, 'asc']]);
        }
        catch (e) {
        }
        $(window).click(function () {
            $(".options-item").find(".edit").next(".edit-menu").fadeOut();
        });

        $(".edit-hook").off("click").on("click", function (e) {
            var hookID = e.target.id;
            var formData = hooksPlugin.getHook(hookID);
            self.DrawerComponent.init();
            self.DrawerComponent.drawer.open();
            self.DrawerComponent.loadWidgetData(formData);
            $(self.DrawerComponent.drawer).find('.title span').first().html(jQuery.i18n.map["hooks.edit-your-hook"]);
            $(self.DrawerComponent.drawer).addClass("open editing");
        });


        $(".delete-hook").off("click").on("click", function (e) {
            var hookID = e.target.id;
            var name = $(e.target).attr("data-name");
            return CountlyHelpers.confirm(jQuery.i18n.prop("hooks.delete-confirm", "<b>" + name + "</b>"), "popStyleGreen", function (result) {
                if (result) {
                    hooksPlugin.deleteHook(hookID, function () {
                        hooksPlugin.requestHookList(function () {
                            self.renderTable();
                        });
                    });
                }
            }, [jQuery.i18n.map["common.no-dont-delete"], jQuery.i18n.map["hooks.yes-delete-hook"]], {title: jQuery.i18n.map["hooks.delete-confirm-title"], image: "delete-an-event"});
        });

        $(".hook-switcher").off("click").on("click", function () {
            var pluginId = this.id.toString().replace(/^plugin-/, '');
            var newStatus = $(this).is(":checked");
            var list = hooksPlugin.getHookList();
            var hookRecord = _.filter(list, function (item) {
                return item._id === pluginId;
            });
            if (hookRecord) {
                (hookRecord[0].enabled + '' !== newStatus + '') ? (self.statusChanged[pluginId] = newStatus) : (delete self.statusChanged[pluginId]);
            }
            var keys = _.keys(self.statusChanged);
            if (keys && keys.length > 0) {
                if (keys.length === 1) {
                    $(".data-save-bar-remind").text(jQuery.i18n.prop("hooks.make-change-remind"));
                }
                else {
                    $(".data-save-bar-remind").text(jQuery.i18n.prop("hooks.make-changes-remind", keys.length));
                }
                return $(".data-saver-bar").removeClass("data-saver-bar-hide");
            }
            $(".data-saver-bar").addClass("data-saver-bar-hide");
        });

        $(".data-saver-cancel-button").off("click").on("click", function () {
            self.statusChanged = {};
            self.renderTable();
            return $(".data-saver-bar").addClass("data-saver-bar-hide");
        });

        $(".data-saver-button").off("click").on("click", function () {
            hooksPlugin.updateHookStatus(self.statusChanged, function () {
                hooksPlugin.requestHookList(function () {
                    self.renderTable();
                });
            });
            return $(".data-saver-bar").addClass("data-saver-bar-hide");
        });

        // load menu
        $("body").off("click", ".options-item .edit").on("click", ".options-item .edit", function () {
            $(".options-item").find(".edit").next(".edit-menu").fadeOut();
            $(this).next(".edit-menu").fadeToggle();
            event.stopPropagation();
        });

        $(window).click(function () {
            $(".options-item").find(".edit").next(".edit-menu").fadeOut();
        });
    }
});


var TableView = countlyVue.views.BaseView.extend({
    template: '#hooks-table',
    computed: {
        tableRows: function () {
            var rows = this.$store.getters["countlyHooks/table/all"];
            if (this.filterStatus != "all") {
                var enabled = this.filterStatus === "enabled" ? true : false;
                rows = rows.filter(function (r) {
                    return r.enabled === enabled;
                });
            };

            if (this.filteredApps.length > 0) {
                var self = this;
                rows = rows.filter(function (r) {
                    var matched = false;
                    self.filteredApps.forEach(function(a) {
                        if ( r.apps.indexOf(a) >= 0) {
                            matched = true;
                        }
                    })
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
            tableDynamicCols: [
               /* {
                    value: "appNameList",
                    label: "App Name List",
                    required: true
                }, */
                {
                    value: "triggerCount",
                    label: "Trigger Count",
                    required: true
                },
                {
                    value: "lastTriggerTimestampString",
                    label: "last Trigger Time",
                    required: true
                },
            ],
            localTableTrackedFields: ['enabled'],
            isAdmin: countlyGlobal.member.global_admin,
        };
    },
    methods: {
        handleHookEditCommand: function(command, scope) {
            if (command === "edit-comment") {
                var data = {...scope.row};
                delete data.operation;
                delete data.triggerEffectColumn;
                delete data.nameDescColumn;
                this.$parent.$parent.openDrawer("home", data);
            }
            else if (command === "delete-comment") {
                var hookID = scope._id;
                var name = scope.name;
                var self = this;
                return CountlyHelpers.confirm(jQuery.i18n.prop("hooks.delete-confirm", "<b>" + name + "</b>"), "popStyleGreen", function (result) {
                    if (result) {
                        hooksPlugin.deleteHook(hookID, function () {
                            self.$store.dispatch("countlyHooks/table/fetchAll")
                        });
                    }
                }, [jQuery.i18n.map["common.no-dont-delete"], jQuery.i18n.map["hooks.yes-delete-hook"]], {title: jQuery.i18n.map["hooks.delete-confirm-title"], image: "delete-an-event"});
            }
        },
        updateStatus:  async function (scope) {
            var diff = scope.diff;
            var status = {}
            diff.forEach(function (item) {
                status[item.key] = item.newValue;
            });
            await this.$store.dispatch("countlyHooks/table/updateStatus", status);
            await this.$store.dispatch("countlyHooks/table/fetchAll");
            scope.unpatch();
        },
        refresh: function () {
           // this.$store.dispatch("countlyHooks/table/fetchAll");
        },
        onRowClick: function(params, target) {
            if (target.id === 'el-table_1_column_1') {
                return;
            }
            app.navigate("/manage/hooks/" + params._id, true);
            console.log("!!", params, target)
        },
    }
});




var EffectFactory = {
    options: [
        {label: jQuery.i18n.map["hooks.EmailEffect"], value: 'EmailEffect'},
        {label: jQuery.i18n.map["hooks.CustomCodeEffect"], value: 'CustomCodeEffect'},
        {label: jQuery.i18n.map["hooks.HTTPEffect"], value: 'HTTPEffect'},
    ]
}

var HTTPEffect = countlyVue.views.BaseView.extend({
    template:'#hooks-effect-HTTPEffect',
    data: function () {
        return {
            methodOptions: [{label:'GET', value:'GET'}, {label: 'POST', value: 'POST'}],
        };
    },
    props: {
        value: {
            type: Object
        },
    },
    methods: {
    }
})


var EmailEffect = countlyVue.views.BaseView.extend({
    template:'#hooks-effect-EmailEffect',
    data: function () {
        return {
        };
    },
    props: {
        value: {
            type: Object
        },
    },
    watch: {
        ["value.address"] : function() {
            console.log("!!aaa", this);
            //this.emailInput.selectize.setValue(this.value.address, false);
        }
    },
    mounted: function () {
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
                self.$emit("input", {address: value || []});
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
})

var CustomCodeEffect = countlyVue.views.BaseView.extend({
    template:'#hooks-effect-CustomCode',
    data: function () {
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
})

var EffectViews = countlyVue.views.BaseView.extend({
    template: '#hooks-effects',
    data: function () {
        return {
            selectedEffect: null,
            effectsOption: EffectFactory.options,
        }
    },
    props: {
        value: {
            type: Object
        },
    },
    watch: {
        ["value.type"]: function(newValue, oldValue) {
            console.log(newValue, oldValue, "ttt");
            if (!oldValue && this.value.configuration) { // edit record
                return;
            }
            if (1 ||!oldValue) {
                switch(newValue) {
                    case 'EmailEffect': 
                        this.value.configuration={address:[]};
                        break;
                    case 'CustomCodeEffect':
                        this.value.configuration = {code:''};
                        break;
                    case 'HTTPEffect':
                        this.value.configuration = {url:'', method:'', requestData:''};
                    default:
                        return;
                }
            }
        },

    },
    computed: {
    },
    components: {
        EmailEffect,
        CustomCodeEffect,
        HTTPEffect,
    },
    methods: {
        removeEffect: function () {
            console.log("ddd");
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
}

var IncomingDataTrigger =  countlyVue.views.BaseView.extend({
    template: '#hooks-IncomingDataTrigger',
    data: function (){
        var defaultFilter = {}
        try {
            defaultFilter = JSON.parse(this.$props.value.filter) || {};
        } catch(e) {}

        return {
            eventOptions:[],
            hiddenFields: [],
            query: defaultFilter.dbFilter,
        }
    },
    components: {
        "segmentation-filter": DrillQueryBuilder.genericSegmentation,
    },
    props: {
        value: {
            type: Object
        },
        app: {
            type: String,
        }
    },
    mounted: function () {
        this.getEventOptions();
    },
    computed:{
        selectedEvent: function() {
            var event = this.$props.value.event;
            if ( event && event.indexOf("***") > 0) {
                event = event.split("***")[1];
                return event;
            }
            return ""
        }
    },
    watch: {
        ["$props.app"]: function() {
            this.getEventOptions();
        }
    },
    methods: {
        eventChange: function(e) {
            var change = this.$refs.filterSegments.setQuery.bind(this.$refs.filterSegments, {},function(){});
            setTimeout(function(){
                change({}, function(){});
            }, 0);
            
        },
        queryChange: function (changedQueryWrapper, isQueryValid) {
            if (isQueryValid) {
                this.$emit("input", Object.assign({},{...this.$props.value, filter: JSON.stringify({dbFilter: changedQueryWrapper.query})}));
            }
        },
        getEventOptions: function () {
            console.log("get event", this);
            var self = this;
            var apps = [this.$props.app];
            countlyEvent.getEventsForApps(apps, function(events) {
                events = events.map(function(e) { e.label = e.name; return e;});
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
                        self.$data.eventOptions = Object.assign([],events);
                    }
                });
            });

        },
    },
});


var InternalEventTrigger = countlyVue.views.BaseView.extend({
    template:'#hooks-InternalEventTrigger',
    data: function () {
        return {
            internalEventOptions:[
                    {value: "/cohort/enter", label: "/cohort/enter"},
                    {value: "/cohort/exit", label: "/cohort/exit"},
                    {value: "/i/app_users/create", label: "/i/app_users/create"},
                    {value: "/i/app_users/update", label: "/i/app_users/update"},
                    {value: "/i/app_users/delete", label: "/i/app_users/delete"},
                    {value: "/hooks/trigger", label: "/hooks/trigger"},
             ],
            cohortOptions: [],
            hookOptions: [],
        };
    },
    mounted: function(){
    },
    computed: {
    },
    props: {
        value: {
            type: Object
        },
        app: {
            type: String,
        }
    },
    mounted: function () {
        this.getCohortOptioins();
        this.getHookOptions();
    },
    watch: {
        ["$props.app"]: function() {
            this.getCohortOptioins();
            this.getHookOptions();
        }
    },
    methods: {
        getCohortOptioins: function () {
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
                    self.$data.cohortOptions = Object.assign([],cohortItems);
                }
            });
        },
        getHookOptions: function () {
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
                    self.$data.hookOptions = hookList;
                }
            });

        },
    }
});

var ScheduledTrigger = countlyVue.views.BaseView.extend({
    template:'#hooks-ScheduledTrigger',
    data: function () {
        var zones = [];
        for (var country in countlyGlobal.timezones) {
            countlyGlobal.timezones[country].z.forEach((item) => {
                for (var zone in item) {
                    zones.push({value: item[zone], label: countlyGlobal.timezones[country].n + ' ' + zone});
                }
            });
        }

        return {
            period1Options: [
                {value:'month', label: 'Every Month'},
                {value:'week', label: 'Every Week'},
                {value:'day', label: 'Every Day'},
            ],
            periodDaysOptions: Array.from(Array(31).keys()).map((item, idx)=> {return {value:idx+1, label: idx+1}}),

            periodHoursOptions: Array.from(Array(24).keys()).map((item, idx)=> {return {value:idx, label: idx < 10 ? '0'+idx+':00' : idx +":00"}}),

            periodWeekOptions: Array.from(Array(7).keys()).map((item, idx)=> {return {value:idx, label: ['Sunday','Monday', 'Tursday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][idx]}}),
            timezoneOptions: zones,

        };
    },
    props: {
        value: {
            type: Object
        }
    },
    computed: {
        cron: function () {
            let cron = null; 
            
            const period1 = this.value.period1;
            const period2 = this.value.period2;
            const period3 = this.value.period3;

            switch (period1) {
                case "month": 
                    cron = ["23", period3, period2, "*", "*"]; 
                    break; 
                case "week":
                    cron = ["0", period3, "*", "*", period2];
                    break;
                case  "day":
                    cron = ["0", period3, "*", "*", "*"];
                    break;
                default:
                    this.value.cron = null;
                    return null;
            }

            this.value.cron = cron.join(" ");
            return cron.join(" ");

            
            this.value.cron = cron;
            return cron;
        }
    }
});

var APIEndPointTrigger = countlyVue.views.BaseView.extend({
    template:'#hooks-APIEndpointTrigger',
    data: function () {
        return {
        };
    },
    mounted: function(){
    },
    computed: {
        url: function () {
            if (!this.value.path) {
                var uri = ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, function (c) {
                    return (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16);
                });
            //    this.$emit("input", {path:uri, method:'get'});
            }
            return  window.location.protocol + "//" + window.location.host + "/o/hooks/" + this.value.path;
        },
    },
    props: {
        value: {
            type: Object
        },
    },
    watch: {
        ["value.path"]: function() {
            if (!this.value.path) {
                var uri = ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, function (c) {
                    return (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16);
                });
                this.$emit("input", {path:uri, method:'get'});
            }
        }
    },
    methods: {
        copyURL: function () {
            var textbox = document.getElementById('url-box');
            textbox.select();
            document.execCommand("Copy");
            CountlyHelpers.notify({clearAll: true, type: 'green', title: jQuery.i18n.map['hooks.copy-notify-title'], message: jQuery.i18n.map['hooks.copy-notify-message'], info: "", delay: 2000, sticky: false});
        }
    }
});


var TriggerViews = countlyVue.views.BaseView.extend({
    template: '#hooks-triggers',
    data: function () {
        return {
            triggersOption: TriggerFactory.options,
        }
    },
    props: {
        value: {
            type: Object
        },
    },
    watch: {
        ["value.type"]: function(newValue, oldValue) {
            if (!oldValue && this.value.configuration) { // edit record
                return;
            }
            switch(newValue) {
                case 'APIEndPointTrigger':
                    var uri = ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, function (c) {
                        return (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16);
                    });
                    this.value.configuration = {path:uri, method:'get'};
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
        APIEndPointTrigger,
        IncomingDataTrigger,
        InternalEventTrigger,
        ScheduledTrigger,
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
    
    data: function () {
        const appsSelectorOption = [];
        for (let id in countlyGlobal.apps) {
            appsSelectorOption.push({label: countlyGlobal.apps[id].name, value: id});
        }
        return {
            title: "",
            saveButtonLabel: "",
            appsSelectorOption,
        };
    },
    props: {
        controls: {
            type: Object
        }
    },
    methods: {
        onSubmit: async function (doc) {
            await this.$store.dispatch("countlyHooks/saveHook", doc);
            await this.$store.dispatch("countlyHooks/table/fetchAll");
        },
        onClose: function ($event) {
            this.$emit("close", $event);
        },
        onCopy: function (newState) {
            if (newState._id !== null) {
                this.title = jQuery.i18n.map["hooks.edit-your-hook"];
                this.saveButtonLabel = jQuery.i18n.map["hooks.save-hook"];
                return;
            }
            this.title = jQuery.i18n.map["hooks.drawer-create-title"];
            this.saveButtonLabel = jQuery.i18n.map["hooks.create-hook"];
        },
        addEffect: function(){
           this.$children[0].$data.editedObject.effects.push({type:null, configuration: null});
        },

        removeEffect: function (index) {
            console.log("reeff", index);
            this.$children[0].$data.editedObject.effects.splice(index,1);
        },

        updateHookConfigValue: function ({path, value}) {
            var object = this.$children[0].$data.editedObject;
            if(!path) {
                return;
            }
            var stack = path.split('.');
            while(stack.length>1){
              object = object[stack.shift()];
            }
            object[stack.shift()] = value;
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
    data: function () {
       return {}; 
    },
    beforeCreate: function () {
       this.$store.dispatch("countlyHooks/initialize");
    },
    methods: {
        createHook: function () {
            this.openDrawer("home", hooksPlugin.defaultDrawerConfigValue());
        },
    },
});

app.hooksView2 = new countlyVue.views.BackboneWrapper({
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
    ]
});


var DetailErrorsTableView = countlyVue.views.BaseView.extend({
    template: '#hooks-detail-errors-table-view',
    computed: {
        tableRows: function () {
            var hookDetail = this.$store.getters["countlyHooks/hookDetail"]; 
            hookDetail.error_logs && hookDetail.error_logs.forEach(function(item) {
                item.timestamp_string = moment(item.timestamp).format();
            })
            return hookDetail.error_logs || [];
        },
    },
    data: function () {
        return {
        };
    },
    methods: {
     

        refresh: function () {
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
    computed: {
        hookDetail: function () {
            var hookDetail = this.$store.getters["countlyHooks/hookDetail"];
            hookDetail.created_at_string = moment(hookDetail.created_at).fromNow();
            hookDetail.lastTriggerTimestampString = moment(hookDetail.lastTriggerTimestamp).fromNow();
            console.log(hookDetail,"#3333");
            return hookDetail 
        }
    },
    methods: {
 
        handleHookEditCommand: function(command, scope) {
            if (command === "edit-comment") {
                var data = {...scope};
                delete data.operation;
                delete data.triggerEffectColumn;
                delete data.nameDescColumn;
                this.openDrawer("detail", data);
            }
            else if (command === "delete-comment") {
                var hookID = scope._id;
                var name = scope.name;
                var self = this;
                return CountlyHelpers.confirm(jQuery.i18n.prop("hooks.delete-confirm", "<b>" + name + "</b>"), "popStyleGreen", function (result) {
                    if (result) {
                        hooksPlugin.deleteHook(hookID, function () {
                            self.$store.dispatch("countlyHooks/table/fetchAll")
                        });
                    }
                }, [jQuery.i18n.map["common.no-dont-delete"], jQuery.i18n.map["hooks.yes-delete-hook"]], {title: jQuery.i18n.map["hooks.delete-confirm-title"], image: "delete-an-event"});
            }
        },
    },
    beforeCreate: function() {
        this.$store.dispatch("countlyHooks/initializeDetail", this.$route.params.id, {root: true});
    }
});


app.hooksDetailView = new countlyVue.views.BackboneWrapper({
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
        
    ]
});

//app.hooksView = new window.HooksView();

if (countlyGlobal.member.global_admin || countlyGlobal.member.admin_of.length) {
    app.route('/manage/hooks', 'hooks', function () {
        this.renderWhenReady(app.hooksView2);
    });


    app.route("/manage/hooks/:id", "hooks-detail", function(id) {
        var params = {
            id: id
        };

        this.hooksDetailView.params = params;
        this.renderWhenReady(this.hooksDetailView);
    });
}

$(document).ready(function () {
    if (countlyGlobal.member.global_admin || countlyGlobal.member.admin_of.length) {
        app.addSubMenu("management", {code: "hooks", url: "#/manage/hooks", text: "hooks.plugin-title", priority: 60});
    }
    //check if configuration view exists
    if (app.configurationsView) {
        app.configurationsView.registerLabel("hooks", "hooks.plugin-title");
        app.configurationsView.registerLabel("hooks.batchSize", "hooks.batch-size");
    }
});
