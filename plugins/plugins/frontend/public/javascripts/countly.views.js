/*global countlyAuth, _,$,countlyPlugins,Handlebars,jQuery,countlyGlobal,app,countlyCommon,CountlyHelpers,countlyManagementView,countlyVue,CV */

(function() {
    var FEATURE_PLUGIN_NAME = "global_plugins";
    var PluginsView = countlyVue.views.create({
        template: CV.T('/plugins/templates/plugins.html'),
        data: function() {
            return {
                scope: {},
                curRow: {},
                curDependents: [],
                defaultSort: {prop: 1, order: "asc"},
                loading: false,
                tryCount: 0,
                pluginsData: [],
                localTableTrackedFields: ['enabled'],
                filterList: {all: true, enabled: false, disabled: false},
                changes: {},
                dialog: {type: "", showDialog: false, saveButtonLabel: "", cancelButtonLabel: "", title: "", text: ""}
            };
        },
        beforeCreate: function() {
            var self = this;
            return $.when(countlyPlugins.initialize())
                .then(function() {
                    try {
                        self.pluginsData = JSON.parse(JSON.stringify(countlyPlugins.getData()));
                    }
                    catch (ex) {
                        self.pluginsData = [];
                    }
                    for (var i = 0; i < self.pluginsData.length; i++) {
                        self.formatRow(self.pluginsData[i]);
                    }
                });
        },
        methods: {
            formatRow: function(row) {
                row._id = row.code;
                row.name = jQuery.i18n.map[row.code + ".plugin-title"] || jQuery.i18n.map[row.code + ".title"] || row.title;
                row.desc = jQuery.i18n.map[row.code + ".plugin-description"] || jQuery.i18n.map[row.code + ".description"] || row.description;
                row.deps = Object.keys(row.dependents).map(function(item) {
                    return countlyPlugins.getTitle(item);
                }).join(", ");
            },
            refresh: function() {

            },
            updateStatus: function(scope) {
                this.scope = scope;
                var diff = scope.diff;
                this.changes = {};
                var self = this;
                diff.forEach(function(item) {
                    self.changes[item.key] = item.newValue;
                });
                this.dialog = {
                    type: "save",
                    showDialog: true,
                    saveButtonLabel: CV.i18n('plugins.yes-i-want-to-apply-changes'),
                    cancelButtonLabel: CV.i18n('common.no-dont-continue'),
                    title: CV.i18n('plugins-apply-changes-to-plugins'),
                    text: CV.i18n('plugins.confirm')
                };
            },
            checkProcess: function() {
                this.tryCount++;
                var self = this;
                $.ajax({
                    type: "GET",
                    url: countlyCommon.API_URL + "/o/plugins-check?app_id=" + countlyCommon.ACTIVE_APP_ID,
                    data: { t: this.tryCount },
                    success: function(state) {
                        if (state.result === "completed") {
                            self.showPluginProcessMessage(jQuery.i18n.map["plugins.success"], jQuery.i18n.map["plugins.restart"], jQuery.i18n.map["plugins.finish"], 3000, false, 'green', true);
                        }
                        else if (state.result === "failed") {
                            self.showPluginProcessMessage(jQuery.i18n.map["plugins.errors"], jQuery.i18n.map["plugins.errors-msg"], '', 3000, false, 'warning', true);
                        }
                        else {
                            setTimeout(self.checkProcess, 10000);
                        }
                    },
                    error: function() {
                        setTimeout(self.checkProcess, 10000);
                    }
                });
            },
            togglePlugin: function(plugins) {
                this.loading = true;
                var self = this;
                this.$loading({
                    lock: true,
                    background: 'rgba(0, 0, 0, 0.7)'
                });

                countlyPlugins.toggle(plugins, function(res) {
                    if (res.result === "started") {
                        self.showPluginProcessMessage(jQuery.i18n.map["plugins.processing"], jQuery.i18n.map["plugins.will-restart"], jQuery.i18n.map["plugins.please-wait"], 5000, true, 'warning', false);
                        self.checkProcess();
                    }
                    else {
                        self.showPluginProcessMessage(jQuery.i18n.map["plugins.error"], res, jQuery.i18n.map["plugins.retry"], 5000, false, 'error', true);
                    }
                });
            },
            showPluginProcessMessage: function(title, message, info, delay, sticky, type, reload) {
                CountlyHelpers.notify({clearAll: true, type: type, title: title, message: message, info: info, delay: delay, sticky: sticky});
                if (reload) {
                    setTimeout(function() {
                        window.location.reload(true);
                    }, 5000);
                }
            },
            submitConfirmDialog: function() {
                if (this.dialog.type === "save") {
                    var msg = { title: jQuery.i18n.map["plugins.processing"], message: jQuery.i18n.map["plugins.wait"], info: jQuery.i18n.map["plugins.hold-on"], sticky: true };
                    CountlyHelpers.notify(msg);
                    this.togglePlugin(this.changes);
                }
                else if (this.dialog.type === "check") {
                    for (var i = 0; i < this.pluginsData.length; i++) {
                        if (this.curDependents.indexOf(this.pluginsData[i].code) !== -1) {
                            this.scope.patch(this.pluginsData[i], {enabled: !this.curRow.enabled});
                        }
                    }
                }
                this.dialog = {type: "", showDialog: false, saveButtonLabel: "", cancelButtonLabel: "", title: "", text: ""};
            },
            closeConfirmDialog: function() {
                if (this.dialog.type === "check") {
                    this.scope.unpatch(this.curRow);
                }
                this.dialog = {type: "", showDialog: false, saveButtonLabel: "", cancelButtonLabel: "", title: "", text: ""};
            },
            filter: function(type) {
                this.filterList = {all: false, enabled: false, disabled: false};
                this.filterList[type] = true;
                try {
                    var self = this;
                    var plugins = JSON.parse(JSON.stringify(countlyPlugins.getData()));
                    this.pluginsData = plugins.filter(function(row) {
                        self.formatRow(row);
                        if (type === "enabled") {
                            return row.enabled;
                        }
                        else if (type === "disabled") {
                            return !row.enabled;
                        }
                        return true;
                    });
                }
                catch (ex) {
                    this.pluginsData = [];
                }
            },
            onToggle: function(scope, row) {
                this.scope = scope;
                this.curRow = row;
                scope.patch(row, {enabled: !row.enabled});
                var plugin = row.code;
                var plugins = [];
                var changes = {};
                var i;
                for (i = 0; i < scope.diff.length; i++) {
                    changes[scope.diff[i].key] = scope.diff[i].newValue;
                }
                for (i = 0; i < this.pluginsData.length; i++) {
                    if (changes[this.pluginsData[i].code]) {
                        plugins.push(this.pluginsData[i].code);
                    }
                    else if (typeof changes[this.pluginsData[i].code] === "undefined" && this.pluginsData[i].enabled) {
                        plugins.push(this.pluginsData[i].code);
                    }
                }
                //diff does not include currently processed plugin
                if (!row.enabled) {
                    plugins.push(row.code);
                }

                var enabledDescendants = _.intersection(countlyPlugins.getRelativePlugins(plugin, "down"), plugins),
                    disabledAncestors = _.difference(countlyPlugins.getRelativePlugins(plugin, "up"), plugins);

                if (row.enabled && enabledDescendants.length > 0) {
                    this.curDependents = enabledDescendants;
                    this.dialog = {
                        type: "check",
                        showDialog: true,
                        saveButtonLabel: CV.i18n('plugins.yes-i-want-to-continue'),
                        cancelButtonLabel: CV.i18n('common.no-dont-continue'),
                        title: CV.i18n('plugins.indirect-status-change'),
                        text: CV.i18n("plugins.disable-descendants", countlyPlugins.getTitle(plugin), enabledDescendants.map(function(item) {
                            return countlyPlugins.getTitle(item);
                        }).join(", "))
                    };
                }
                else if (!row.enabled && disabledAncestors.length > 0) {
                    this.curDependents = disabledAncestors;
                    this.dialog = {
                        type: "check",
                        showDialog: true,
                        saveButtonLabel: CV.i18n('plugins.yes-i-want-to-continue'),
                        cancelButtonLabel: CV.i18n('common.no-dont-continue'),
                        title: CV.i18n('plugins.indirect-status-change'),
                        text: CV.i18n("plugins.enable-ancestors", countlyPlugins.getTitle(plugin), disabledAncestors.map(function(item) {
                            return countlyPlugins.getTitle(item);
                        }).join(", "))
                    };
                }
            }
        }
    });

    var FEATURE_CONFIG_NAME = "global_configurations";
    var ConfigurationsView = countlyVue.views.create({
        template: CV.T('/plugins/templates/configurations.html'),
        computed: {
            selectedConfigSearchBar: {
                get: function() {
                    return this.selectedConfig;
                },
                set: function(value) {
                    this.selectedConfig = value;
                    this.diff = [];
                    try {
                        this.configsData = JSON.parse(JSON.stringify(countlyPlugins.getConfigsData()));
                    }
                    catch (ex) {
                        this.configsData = {};
                    }
                    app.navigate("#/manage/configurations/" + value);
                }
            },
            selectedConfigName: function() {
                return this.getLabel(this.selectedConfig);
            }
        },
        data: function() {
            return {
                back: false,
                configsData: {},
                configsList: [],
                coreDefaults: ['api', 'frontend', 'logs', 'security'],
                diff: [],
                selectedConfig: this.$route.params.namespace || "api",
                searchPlaceholder: CV.i18n("common.search"),
                predefinedLabels: app.configurationsView.predefinedLabels,
                predefinedInputs: app.configurationsView.predefinedInputs,
                predefinedStructure: app.configurationsView.predefinedStructure
            };
        },
        beforeCreate: function() {
            var self = this;
            if (this.$route.params.success) {
                CountlyHelpers.notify({
                    title: jQuery.i18n.map["configs.changed"],
                    message: jQuery.i18n.map["configs.saved"]
                });
                this.$route.params.success = false;
                app.noHistory("#/manage/configurations/" + this.$route.params.namespace || "api");
            }
            return $.when(countlyPlugins.initializeConfigs())
                .then(function() {
                    try {
                        self.configsData = JSON.parse(JSON.stringify(countlyPlugins.getConfigsData()));
                    }
                    catch (ex) {
                        self.configsData = {};
                    }
                    self.configsList.push({
                        "label": self.getLabel("core"),
                        "group": true,
                        "value": "core"
                    });
                    self.coreDefaults.forEach(function(key) {
                        self.configsList.push({
                            "label": self.getLabel(key, true),
                            "value": key
                        });
                    });
                    self.configsList.push({
                        "label": self.getLabel("plugins"),
                        "group": true,
                        "value": "plugins"
                    });
                    var plugins = [];
                    for (var key in self.configsData) {
                        if (self.coreDefaults.indexOf(key) === -1) {
                            plugins.push(key);
                        }
                        if (!self.predefinedStructure[key]) {
                            self.predefinedStructure[key] = {groups: []};
                        }
                        var otherStructure = [];
                        for (var subkey in self.configsData[key]) {
                            if (!self.predefinedInputs[key + "." + subkey]) {
                                var type = typeof self.configsData[key][subkey];
                                if (type === "string") {
                                    app.configurationsView.registerInput(key + "." + subkey, {input: "el-input", attrs: {}});
                                }
                                else if (type === "number") {
                                    app.configurationsView.registerInput(key + "." + subkey, {input: "el-input-number", attrs: {}});
                                }
                                else if (type === "boolean") {
                                    app.configurationsView.registerInput(key + "." + subkey, {input: "el-switch", attrs: {}});
                                }
                            }
                            if (!self.predefinedStructure[key].groups.length) {
                                otherStructure.push(subkey);
                            }
                            else {
                                var found = false;
                                for (var i = 0; i < self.predefinedStructure[key].groups.length; i++) {
                                    if (self.predefinedStructure[key].groups[i].list.indexOf(subkey) !== -1) {
                                        found = true;
                                        break;
                                    }
                                }
                                if (!found) {
                                    otherStructure.push(subkey);
                                }
                            }
                        }
                        if (otherStructure.length) {
                            self.predefinedStructure[key].groups.push({label: "", list: otherStructure});
                        }
                    }
                    plugins.sort();
                    plugins.forEach(function(k) {
                        self.configsList.push({
                            "label": self.getLabel(k, true),
                            "value": k
                        });
                    });
                });
        },
        methods: {
            refresh: function() {

            },
            goBack: function() {
                app.back();
            },
            onChange: function(key, value) {
                var configsData = countlyPlugins.getConfigsData();

                //delete value from diff if it already exists
                var index = this.diff.indexOf(key);
                if (index > -1) {
                    this.diff.splice(index, 1);
                }

                this.configsData[this.selectedConfig][key] = value;
                if (configsData[this.selectedConfig][key] !== value) {
                    this.diff.push(key);
                }
            },
            getLabel: function(id) {
                if (countlyGlobal.plugins.indexOf(id) === -1) {
                    return jQuery.i18n.map["configs." + id];
                }
                if (typeof this.predefinedLabels[id] !== "undefined") {
                    return jQuery.i18n.map[this.predefinedLabels[id]];
                }
                if (jQuery.i18n.map["configs." + id]) {
                    return jQuery.i18n.map["configs." + id];
                }
                if (jQuery.i18n.map["configs." + id.replace(".", "-")]) {
                    return jQuery.i18n.map["configs." + id.replace(".", "-")];
                }
                if (jQuery.i18n.map[id]) {
                    return jQuery.i18n.map[id];
                }
                if (jQuery.i18n.map[id.replace(".", "-")]) {
                    return jQuery.i18n.map[id.replace(".", "-")] ;
                }
                return id;
            },
            getLabelName: function(id) {
                var ns = this.selectedConfig;
                if (ns !== "frontend" && ns !== "api" && ns !== "apps" && ns !== "logs" && ns !== "security" && countlyGlobal.plugins.indexOf(ns) === -1) {
                    return null;
                }

                if (typeof this.predefinedLabels[this.selectedConfig + "." + id] !== "undefined") {
                    return jQuery.i18n.map[this.predefinedLabels[this.selectedConfig + "." + id]];
                }
                else if (jQuery.i18n.map["configs." + this.selectedConfig + "." + id]) {
                    return jQuery.i18n.map["configs." + this.selectedConfig + "." + id];
                }
                else if (jQuery.i18n.map["configs." + (this.selectedConfig + "." + id).replace(".", "-")]) {
                    return jQuery.i18n.map["configs." + (this.selectedConfig + "." + id).replace(".", "-")];
                }
                else if (jQuery.i18n.map[this.selectedConfig + "." + id]) {
                    return jQuery.i18n.map[this.selectedConfig + "." + id];
                }
                else if (jQuery.i18n.map[(this.selectedConfig + "." + id).replace(".", "-")]) {
                    return jQuery.i18n.map[(this.selectedConfig + "." + id).replace(".", "-")];
                }
                else {
                    return id;
                }
            },
            getHelperLabel: function(id) {
                if (jQuery.i18n.map["configs.help." + this.selectedConfig + "." + id]) {
                    return jQuery.i18n.map["configs.help." + this.selectedConfig + "." + id];
                }
                else if (jQuery.i18n.map["configs.help." + (this.selectedConfig + "." + id).replace(".", "-")]) {
                    return jQuery.i18n.map["configs.help." + (this.selectedConfig + "." + id).replace(".", "-")];
                }
            },
            getInputType: function(id) {
                var input = this.predefinedInputs[this.selectedConfig + "." + id];
                if (typeof input === "function") {
                    return "function";
                }
                if (input && input.input) {
                    return input.input;
                }
            },
            unpatch: function() {
                try {
                    this.configsData = JSON.parse(JSON.stringify(countlyPlugins.getConfigsData()));
                }
                catch (ex) {
                    this.configsData = {};
                }
                this.diff = [];
            },
            save: function() {
                var changes = {};
                changes[this.selectedConfig] = {};
                for (var i = 0; i < this.diff.length; i++) {
                    changes[this.selectedConfig][this.diff[i]] = this.configsData[this.selectedConfig][this.diff[i]];
                }
                var self = this;
                countlyPlugins.updateConfigs(changes, function(err) {
                    if (err) {
                        CountlyHelpers.notify({
                            title: jQuery.i18n.map["configs.not-saved"],
                            message: jQuery.i18n.map["configs.not-changed"],
                            type: "error"
                        });
                    }
                    else {
                        location.hash = "#/manage/configurations/" + self.selectedConfig + "/success";
                        window.location.reload(true);
                    }
                });
            }
        }
    });


    var getPluginView = function() {
        return new countlyVue.views.BackboneWrapper({
            component: PluginsView,
            vuex: [] //empty array if none
        });
    };

    var getConfigView = function() {
        return new countlyVue.views.BackboneWrapper({
            component: ConfigurationsView,
            vuex: [] //empty array if none
        });
    };

    //old global handler
    app.configurationsView = {
        predefinedInputs: {},
        predefinedLabels: {},
        predefinedStructure: {},
        registerInput: function(id, callback) {
            this.predefinedInputs[id] = callback;
        },
        registerLabel: function(id, html) {
            this.predefinedLabels[id] = html;
        },
        registerStructure: function(id, obj) {
            this.predefinedStructure[id] = obj;
        }
    };

    //register inputs
    var zones = app.manageAppsView.getTimeZones();
    var countryList = [];
    for (var z in zones) {
        countryList.push({value: z, label: zones[z].n});
    }
    app.configurationsView.registerInput("apps.country", {input: "el-select", attrs: {}, list: countryList});

    app.configurationsView.registerInput("frontend.theme", {input: "el-select", attrs: {}, list: countlyPlugins.getThemeList()});

    app.configurationsView.registerInput("logs.default", {
        input: "el-select",
        attrs: {},
        list: [
            {value: 'debug', label: 'debug'}, {value: 'info', label: 'info'}, {value: 'warn', label: 'warn'}, {value: 'error', label: 'error'}]
    });

    app.configurationsView.registerInput("security.dashboard_additional_headers", {input: "el-input", attrs: {type: "textarea", rows: 5}});

    app.configurationsView.registerInput("security.api_additional_headers", {input: "el-input", attrs: {type: "textarea", rows: 5}});

    app.configurationsView.registerInput("push.proxypass", {input: "el-input", attrs: {type: "password"}});

    app.configurationsView.registerInput("api.reports_regenerate_interval", {
        input: "el-select",
        attrs: {},
        list: [
            {value: 300, label: jQuery.i18n.prop("common.every.minutes", 5)},
            {value: 1800, label: jQuery.i18n.prop("common.every.minutes", 30)},
            {value: 3600, label: jQuery.i18n.prop("common.every.hour", 1)},
            {value: 10800, label: jQuery.i18n.prop("common.every.hours", 3)},
            {value: 43200, label: jQuery.i18n.prop("common.every.hours", 12)},
            {value: 86400, label: jQuery.i18n.prop("common.every.hours", 24)}
        ]
    });

    app.configurationsView.registerInput("api.send_test_email", {
        input: "el-button",
        label: jQuery.i18n.map['common.send'],
        attrs: {type: "primary", disabled: false},
        click: function() {
            this.attrs.disabled = true;
            var self = this;
            $.ajax({
                type: "GET",
                url: countlyCommon.API_URL + "/o/email_test",
                data: {},
                success: function() {
                    self.attrs.disabled = false;
                    CountlyHelpers.notify({ type: "ok", message: jQuery.i18n.map['configs.help.api-send_test_email_delivered']});

                },
                fail: function() {
                    self.attrs.disabled = false;
                    CountlyHelpers.notify({ type: "error", message: jQuery.i18n.map['configs.help.api-send_test_email_failed']});
                }
            });
        }
    });

    app.configurationsView.registerStructure("api", {
        description: "configs.api.description",
        groups: [
            {label: "configs.api.batch", list: ["batch_processing", "batch_period", "batch_on_master"]},
            {label: "configs.api.cache", list: ["batch_read_processing", "batch_read_period", "batch_read_ttl", "batch_read_on_master"]},
            {label: "configs.api.limits", list: ["event_limit", "event_segmentation_limit", "event_segmentation_value_limit", "metric_limit", "session_duration_limit"]},
        ]
    });

    var showInAppManagment = {"api": {"safe": true, "send_test_email": true, "session_duration_limit": true, "city_data": true, "event_limit": true, "event_segmentation_limit": true, "event_segmentation_value_limit": true, "metric_limit": true, "session_cooldown": true, "total_users": true, "prevent_duplicate_requests": true, "metric_changes": true, "data_retention_period": true}};

    if (countlyAuth.validateRead(FEATURE_PLUGIN_NAME)) {
        if (countlyGlobal.plugins.indexOf("drill") !== -1) {
            showInAppManagment.drill = {"big_list_limit": true, "record_big_list": true, "cache_threshold": true, "correct_estimation": true, "custom_property_limit": true, "list_limit": true, "projection_limit": true, "record_actions": true, "record_crashes": true, "record_meta": true, "record_pushes": true, "record_sessions": true, "record_star_rating": true, "record_apm": true, "record_views": true};
        }
        if (countlyGlobal.plugins.includes("logger")) {
            showInAppManagment.logger = {"state": true, "limit": true};
        }
    }

    if (countlyAuth.validateUpdate(FEATURE_CONFIG_NAME)) {
        var configManagementPromise = null;
        for (var key in showInAppManagment) {
            app.addAppManagementView(key, jQuery.i18n.map['configs.' + key], countlyManagementView.extend({
                key: key,
                initialize: function() {
                    this.plugin = this.key;
                },
                resetTemplateData: function() {
                    this.template = Handlebars.compile(this.generateTemplate(this.key));
                },
                generateTemplate: function(id) {
                    var fields = '';
                    this.configsData = countlyPlugins.getConfigsData();
                    id = this.key || id;
                    this.cache = {};
                    this.templateData = {};

                    var appConfigData = this.config();
                    for (var i in showInAppManagment[id]) {
                        if (showInAppManagment[id][i] === true) {
                            var myvalue = "";
                            if (appConfigData && typeof appConfigData[i] !== "undefined") {
                                myvalue = appConfigData[i];
                            }
                            else if (this.configsData && this.configsData[id] && typeof this.configsData[id][i] !== "undefined") {
                                myvalue = this.configsData[id][i];
                            }
                            this.templateData[i] = myvalue;
                            var input = app.configurationsView.getInputByType((id + "." + i), myvalue);
                            var label = app.configurationsView.getInputLabel((id + "." + i), i, true);
                            if (input && label) {
                                fields += ('<div id="config-row-' + i + "-" + id.replace(".", "") + '" class="mgmt-plugins-row help-zone-vs" data-help-localize="help.mgmt-plugins.push.ios.type">' +
                                    '   <div>' + label + '</div>' +
                                    '   <div>' + input + '</div>' +
                                    '</div>');
                            }
                        }
                    }
                    return fields;
                },
                doOnChange: function(name, value) {
                    if (name) {
                        name = name.substring(this.key.length + 1);
                        if (name && countlyCommon.dot(this.templateData, name) !== value) {
                            countlyCommon.dot(this.templateData, name, value);
                        }

                        if (this.isSaveAvailable()) {
                            this.el.parent().find("h3[aria-controls=" + this.el.attr("id") + "]").find('.icon-button').show();
                        }
                        else {
                            this.el.parent().find("h3[aria-controls=" + this.el.attr("id") + "]").find('.icon-button').hide();
                        }
                        this.onChange(name, value);
                    }
                },
                beforeRender: function() { // eslint-disable-line no-loop-func
                    var self = this;
                    if (!configManagementPromise) {
                        configManagementPromise = $.when(countlyPlugins.initializeConfigs(), countlyPlugins.initializeActiveAppConfigs());
                    }
                    return $.when(configManagementPromise).then(function() {
                        configManagementPromise = null;
                        self.template = Handlebars.compile(self.generateTemplate(self.key));
                        self.savedTemplateData = JSON.stringify(self.templateData);
                    }).then(function() {});
                }
            }));
        }
    }

    if (countlyAuth.validateRead(FEATURE_PLUGIN_NAME)) {
        app.route('/manage/plugins', 'plugins', function() {
            if (countlyGlobal.COUNTLY_CONTAINER === 'frontend') {
                app.navigate("#/", true);
            }
            else {
                this.renderWhenReady(getPluginView());
            }
        });
    }

    if (countlyAuth.validateRead(FEATURE_CONFIG_NAME)) {
        app.route('/manage/configurations', 'configurations', function() {
            var view = getConfigView();
            view.params = {namespace: null, success: false};
            this.renderWhenReady(view);
        });

        app.route('/manage/configurations/:namespace', 'configurations_namespace', function(namespace) {
            var view = getConfigView();
            view.params = {namespace: namespace, success: false};
            this.renderWhenReady(view);
        });

        app.route('/manage/configurations/:namespace/:status', 'configurations_namespace', function(namespace, status) {
            if (status === "success") {
                var view = getConfigView();
                view.params = {namespace: namespace, success: true};
                this.renderWhenReady(view);
            }
        });

        app.route('/manage/user-settings', 'user-settings', function() {
            this.configurationsView.namespace = null;
            this.configurationsView.reset = false;
            this.configurationsView.userConfig = true;
            this.configurationsView.success = false;
            this.renderWhenReady(this.configurationsView);
        });

        app.route('/manage/user-settings/:namespace', 'user-settings_namespace', function(namespace) {
            if (namespace === "reset") {
                this.configurationsView.reset = true;
                this.configurationsView.success = false;
                this.configurationsView.namespace = null;
            }
            else if (namespace === "success") {
                this.configurationsView.reset = false;
                this.configurationsView.success = true;
                this.configurationsView.namespace = null;
            }
            else {
                this.configurationsView.reset = false;
                this.configurationsView.success = false;
                this.configurationsView.namespace = namespace;
            }
            this.configurationsView.userConfig = true;
            this.renderWhenReady(this.configurationsView);
        });
    }

    $(document).ready(function() {
        if (countlyGlobal.member && countlyGlobal.member.global_admin || countlyAuth.validateRead(FEATURE_PLUGIN_NAME)) {
            if (countlyGlobal.COUNTLY_CONTAINER !== 'frontend') {
                app.addMenu("management", {code: "plugins", url: "#/manage/plugins", text: "plugins.title", icon: '<div class="logo-icon fa fa-puzzle-piece"></div>', priority: 30});
            }
        }
        if (countlyGlobal.member && countlyGlobal.member.global_admin || countlyAuth.validateRead(FEATURE_CONFIG_NAME)) {
            app.addMenu("management", {code: "configurations", url: "#/manage/configurations", text: "plugins.configs", icon: '<div class="logo-icon ion-android-options"></div>', priority: 40});

            var isCurrentHostnameIP = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(window.location.hostname);
            var isGlobalDomainHasValue = countlyGlobal.domain === "" || typeof countlyGlobal.domain === "undefined" ? false : true;
            if (!isCurrentHostnameIP && !isGlobalDomainHasValue) {
                countlyPlugins.updateConfigs({"api": {"domain": window.location.protocol + "//" + window.location.hostname}}, function(err) {
                    if (err) {
                    // throw err
                    }
                });
            }
        }
    });
})();
