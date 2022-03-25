/*global countlyAuth, _,$,countlyPlugins,jQuery,countlyGlobal,app,countlyCommon,CountlyHelpers,countlyVue,CV */

(function() {
    var PluginsView = countlyVue.views.create({
        template: CV.T('/plugins/templates/plugins.html'),
        data: function() {
            return {
                scope: {},
                highlightedRows: {},
                curRow: {},
                curDependents: [],
                components: {},
                defaultSort: {prop: 1, order: "asc"},
                loading: false,
                tryCount: 0,
                pluginsData: [],
                localTableTrackedFields: ['enabled'],
                filterValue: "all",
                changes: {},
                dialog: {type: "", showDialog: false, saveButtonLabel: "", cancelButtonLabel: "", title: "", text: ""}
            };
        },
        beforeCreate: function() {
            var self = this;
            return $.when(countlyPlugins.initialize()).then(
                function() {
                    try {
                        self.pluginsData = JSON.parse(JSON.stringify(countlyPlugins.getData()));
                    }
                    catch (ex) {
                        self.pluginsData = [];
                    }
                    for (var i = 0; i < self.pluginsData.length; i++) {
                        self.formatRow(self.pluginsData[i]);
                    }
                }
            );
        },
        mounted: function() {
            this.loadComponents();
        },
        methods: {
            refresh: function() {
                var self = this;
                return $.when(countlyPlugins.initialize()).then(
                    function() {
                        try {
                            var plugins = JSON.parse(JSON.stringify(countlyPlugins.getData()));
                            self.pluginsData = plugins.filter(function(row) {
                                self.formatRow(row);
                                if (self.filterValue === "enabled") {
                                    return row.enabled;
                                }
                                else if (self.filterValue === "disabled") {
                                    return !row.enabled;
                                }
                                return true;
                            });
                        }
                        catch (ex) {
                            self.pluginsData = [];
                        }
                    }
                );
            },
            updateRow: function(code) {
                this.highlightedRows[code] = true;
                this.refresh();
            },
            loadComponents: function() {
                var cc = countlyVue.container.dataMixin({
                    'pluginComponents': '/plugins/header'
                });
                cc = cc.data();
                var allComponents = cc.pluginComponents;
                for (var i = 0; i < allComponents.length; i++) {
                    if (allComponents[i]._id && allComponents[i].component) {
                        this.components[allComponents[i]._id] = allComponents[i];
                    }
                }
                this.components = Object.assign({}, this.components);
            },
            tableRowClassName: function(ob) {
                if (this.highlightedRows[ob.row.code]) {
                    return "plugin-highlighted-row";
                }
            },
            formatRow: function(row) {
                row._id = row.code;
                row.name = jQuery.i18n.map[row.code + ".plugin-title"] || jQuery.i18n.map[row.code + ".title"] || row.title;
                row.desc = jQuery.i18n.map[row.code + ".plugin-description"] || jQuery.i18n.map[row.code + ".description"] || row.description;
                row.deps = Object.keys(row.dependents).map(function(item) {
                    return countlyPlugins.getTitle(item);
                }).join(", ");
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
                this.filterValue = type;
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
                    disabledAncestors = _.difference(countlyPlugins.getRelativePlugins(plugin, "up"), plugins, ["___CLY_ROOT___"]);

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

                    if (this.configsData.frontend && this.configsData.frontend._user) {
                        this.configsData.frontend.__user = [];
                        for (var userProp in this.configsData.frontend._user) {
                            if (this.configsData.frontend._user[userProp]) {
                                this.configsData.frontend.__user.push(userProp);
                            }
                        }
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
                        self.removeNonGlobalConfigs(self.configsData);
                    }
                    catch (error) {
                        // eslint-disable-next-line no-console
                        console.error(error);
                        self.configsData = {};
                    }

                    if (self.configsData.frontend && self.configsData.frontend._user && !self.predefinedInputs["frontend.__user"]) {
                        var list = [];
                        self.configsData.frontend.__user = [];
                        for (var userProp in self.configsData.frontend._user) {
                            list.push({value: userProp, label: self.getLabelName(userProp, "frontend")});
                            if (self.configsData.frontend._user[userProp]) {
                                self.configsData.frontend.__user.push(userProp);
                            }
                        }
                        app.configurationsView.registerInput("frontend.__user", {input: "el-select", attrs: {multiple: true}, list: list});
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
                        if (self.coreDefaults.indexOf(key) === -1 && countlyGlobal.plugins.indexOf(key) !== -1) {
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
            removeNonGlobalConfigs: function(configData) {
                Object.keys(configData).forEach(function(configKey) {
                    if ((configData[configKey].use_google || configData[configKey].google_maps_api_key) && configKey === 'frontend') {
                        delete configData[configKey].use_google;
                        delete configData[configKey].google_maps_api_key;
                    }
                    if (configData[configKey].rate && configKey === 'push') {
                        delete configData[configKey].rate; // Note: push notification rate is app level config only
                    }
                    if (configData[configKey].test && configKey === 'push') {
                        delete configData[configKey].test; // Note: push notification test is app level config only
                    }
                });
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

                if (Array.isArray(value) && Array.isArray(configsData[this.selectedConfig][key])) {
                    value.sort();
                    configsData[this.selectedConfig][key].sort();

                    if (JSON.stringify(value) !== JSON.stringify(configsData[this.selectedConfig][key])) {
                        this.diff.push(key);
                    }
                }
                else if (configsData[this.selectedConfig][key] !== value) {
                    this.diff.push(key);
                }
            },
            getLabel: function(id) {
                return app.configurationsView.getInputLabel(id);
            },
            getLabelName: function(id, ns) {
                ns = ns || this.selectedConfig;
                if (ns !== "frontend" && ns !== "api" && ns !== "apps" && ns !== "logs" && ns !== "security" && countlyGlobal.plugins.indexOf(ns) === -1) {
                    return null;
                }

                if (id === "__user") {
                    return jQuery.i18n.map["configs.user-level-configuration"];
                }

                return app.configurationsView.getInputLabel((ns || this.selectedConfig) + "." + id);
            },
            getHelperLabel: function(id, ns) {
                ns = ns || this.selectedConfig;
                return app.configurationsView.getHelperLabel(id, ns);
            },
            getInputType: function(id) {
                return app.configurationsView.getInputType(this.selectedConfig + "." + id);
            },
            checkIfOverwritten: function(id) {
                var configsData = countlyPlugins.getConfigsData();
                var plugs = countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].plugins;
                //check if value can be overwritten on user level
                if (configsData[this.selectedConfig]._user && configsData[this.selectedConfig]._user[id]) {
                    //check if value is overwritten on user level
                    var sets = countlyGlobal.member.settings;
                    if (sets && sets[this.selectedConfig] && typeof sets[this.selectedConfig][id] !== "undefined") {
                        return {label: jQuery.i18n.map["configs.overwritten.user"], href: "#/account-settings"};
                    }
                }
                //check if config overwritten on app level
                else if (plugs && plugs[this.selectedConfig] && typeof plugs[this.selectedConfig][id] !== "undefined") {
                    return {label: jQuery.i18n.map["configs.overwritten.app"], href: "#/manage/apps"};
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
                if (this.configsData.frontend && this.configsData.frontend._user) {
                    this.configsData.frontend.__user = [];
                    for (var userProp in this.configsData.frontend._user) {
                        if (this.configsData.frontend._user[userProp]) {
                            this.configsData.frontend.__user.push(userProp);
                        }
                    }
                }
            },
            save: function() {
                var changes = {};
                changes[this.selectedConfig] = {};
                for (var i = 0; i < this.diff.length; i++) {
                    if (this.diff[i] === "__user") {
                        if (!changes[this.selectedConfig]._user) {
                            changes[this.selectedConfig]._user = {};
                        }
                        for (var userProp in this.configsData[this.selectedConfig]._user) {
                            if (this.configsData[this.selectedConfig][this.diff[i]].indexOf(userProp) === -1) {
                                changes[this.selectedConfig]._user[userProp] = false;
                            }
                            else {
                                changes[this.selectedConfig]._user[userProp] = true;
                            }
                        }
                    }
                    else {
                        changes[this.selectedConfig][this.diff[i]] = this.configsData[this.selectedConfig][this.diff[i]];
                    }
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

    var AccountView = countlyVue.views.create({
        template: CV.T('/plugins/templates/account-settings.html'),
        data: function() {
            return {
                uploadData: {
                    _csrf: countlyGlobal.csrf_token,
                    member_image_id: countlyGlobal.member._id
                },
                changes: {},
                deleteAccount: {
                    showDialog: false,
                    title: CV.i18n("configs.delete-account"),
                    saveButtonLabel: CV.i18n("configs.delete-my-account"),
                    cancelButtonLabel: CV.i18n("configs.cancel"),
                    password: ""
                },
                changePassword: {
                    showDialog: false,
                    title: CV.i18n("configs.change-password"),
                    saveButtonLabel: CV.i18n("configs.change-password"),
                    cancelButtonLabel: CV.i18n("configs.cancel"),
                    password: "",
                    newPassword: "",
                    confirmPassword: ""
                },
                components: {},
                formId: "account-settings-form",
                userData: countlyGlobal.member,
                userConfigs: {},
                avatar: this.setDefaultAvatar(countlyGlobal.member.member_image),
                initials: this.updateInitials(countlyGlobal.member.full_name),
                predefinedLabels: app.configurationsView.predefinedLabels,
                predefinedInputs: app.configurationsView.predefinedInputs,
                selectedConfig: "frontend",
                security: countlyGlobal.security
            };
        },
        beforeCreate: function() {
            var self = this;
            return $.when(countlyPlugins.initializeUserConfigs())
                .then(function() {
                    try {
                        self.userConfigs = JSON.parse(JSON.stringify(countlyPlugins.getUserConfigsData()));
                    }
                    catch (ex) {
                        self.userConfigs = {};
                    }
                    if (!self.userConfigs.frontend) {
                        self.userConfigs.frontend = {};
                    }
                    for (var key in app.configurationsView.predefinedUserInputs) {
                        var parts = key.split(".");
                        var val = app.configurationsView.predefinedUserInputs[key];
                        if (!self.userConfigs[parts[0]]) {
                            self.userConfigs[parts[0]] = {};
                        }
                        if (parts[1]) {
                            self.userConfigs[parts[0]][parts[1]] = typeof val === "function" ? val() : val;
                        }
                    }
                    for (var subkey in self.userConfigs[self.selectedConfig]) {
                        if (!self.predefinedInputs[self.selectedConfig + "." + subkey]) {
                            var type = typeof self.userConfigs[self.selectedConfig][subkey];
                            if (type === "string") {
                                app.configurationsView.registerInput(self.selectedConfig + "." + subkey, {input: "el-input", attrs: {}});
                            }
                            else if (type === "number") {
                                app.configurationsView.registerInput(self.selectedConfig + "." + subkey, {input: "el-input-number", attrs: {}});
                            }
                            else if (type === "boolean") {
                                app.configurationsView.registerInput(self.selectedConfig + "." + subkey, {input: "el-switch", attrs: {}});
                            }
                        }
                    }
                    self.loadComponents();
                });
        },
        methods: {
            onChange: function(id, key, value) {
                if (!this.changes[id]) {
                    this.changes[id] = {};
                }

                this.changes[id][key] = value;

                var configsData = countlyPlugins.getUserConfigsData();

                if (!this.changes[id]) {
                    this.changes[id] = {};
                }

                //delete value from diff if it already exists
                delete this.changes[id][key];

                this.userConfigs[id][key] = value;

                if (Array.isArray(value) && Array.isArray(configsData[id][key])) {
                    value.sort();
                    configsData[id][key].sort();
                    if (JSON.stringify(value) !== JSON.stringify(configsData[id][key])) {
                        this.changes[id][key] = value;
                    }

                }
                else if (configsData[id][key] !== value) {
                    this.changes[id][key] = value;
                }
            },
            passwordDialog: function() {
                var old_pwd = this.changePassword.password;
                var new_pwd = this.changePassword.newPassword;
                var re_new_pwd = this.changePassword.confirmPassword;

                if (old_pwd.length > 0 && new_pwd.length > 0 && re_new_pwd.length > 0) {
                    var data = {
                        _csrf: countlyGlobal.csrf_token,
                        username: countlyGlobal.member.username,
                        full_name: countlyGlobal.member.full_name,
                        api_key: countlyGlobal.member.api_key,
                        old_pwd: old_pwd,
                        new_pwd: new_pwd,
                        re_new_pwd: re_new_pwd
                    };
                    this.saveSettings(data);
                }
                else {
                    CountlyHelpers.notify({
                        title: jQuery.i18n.map["configs.not-saved"],
                        message: jQuery.i18n.map["configs.fill-required-fields"],
                        type: "error"
                    });
                }
            },
            submitDeleteDialog: function() {
                var pv = this.deleteAccount.password.trim();
                if (pv === "") {
                    var msg1 = {title: jQuery.i18n.map["common.error"], message: jQuery.i18n.map["user-settings.password-mandatory"], clearAll: true, type: "error"};
                    CountlyHelpers.notify(msg1);
                }
                else {
                    countlyPlugins.deleteAccount({password: pv}, function(err, msg) {
                        if (msg === true || msg === 'true') {
                            window.location = "/login"; //deleted. go to login
                        }
                        else if (msg === 'password not valid' || msg === 'password mandatory' || msg === 'global admin limit') {
                            CountlyHelpers.notify({title: jQuery.i18n.map["common.error"], message: jQuery.i18n.map["user-settings." + msg], sticky: true, clearAll: true, type: "error"});
                        }
                        else if (err === true) {
                            var msg2 = {title: jQuery.i18n.map["common.error"], message: msg, sticky: true, clearAll: true, type: "error"};
                            CountlyHelpers.notify(msg2);
                        }
                    });
                }
            },
            getLabelName: function(id, key) {
                return app.configurationsView.getInputLabel(id + "." + key);
            },
            getInputType: function(id, key) {
                return app.configurationsView.getInputType(id + "." + key);
            },
            save: function(doc) {
                var data = {
                    _csrf: countlyGlobal.csrf_token,
                    username: doc.username,
                    full_name: doc.full_name,
                    api_key: doc.api_key
                };
                this.saveSettings(data);
            },
            saveSettings: function(doc) {
                var self = this;
                $.ajax({
                    type: "POST",
                    url: countlyGlobal.path + "/user/settings",
                    data: doc,
                    success: function(result) {
                        if (result === "username-exists") {
                            CountlyHelpers.notify({
                                title: jQuery.i18n.map["configs.not-saved"],
                                message: jQuery.i18n.map["management-users.username.exists"],
                                type: "error"
                            });
                            return true;
                        }
                        else if (!result) {
                            CountlyHelpers.notify({
                                title: jQuery.i18n.map["configs.not-saved"],
                                message: jQuery.i18n.map["user-settings.alert"],
                                type: "error"
                            });
                            return true;
                        }
                        else {
                            if (!isNaN(parseInt(result))) {
                                countlyGlobal.member.password_changed = parseInt(result);
                            }
                            else if (typeof result === "string") {
                                CountlyHelpers.notify({
                                    title: jQuery.i18n.map["configs.not-saved"],
                                    message: jQuery.i18n.map[result],
                                    type: "error"
                                });
                                return true;
                            }

                            countlyGlobal.member.full_name = doc.full_name;
                            countlyGlobal.member.username = doc.username;
                            countlyGlobal.member.api_key = doc.api_key;
                        }
                        if (Object.keys(self.changes).length) {
                            countlyPlugins.updateUserConfigs(self.changes, function(err) {
                                if (err) {
                                    CountlyHelpers.notify({
                                        title: jQuery.i18n.map["configs.not-saved"],
                                        message: jQuery.i18n.map["configs.not-changed"],
                                        type: "error"
                                    });
                                }
                                else {
                                    window.location.reload(true);
                                }
                            });
                        }
                        else {
                            CountlyHelpers.notify({
                                title: jQuery.i18n.map["configs.changed"],
                                message: jQuery.i18n.map["configs.saved"]
                            });
                        }
                    },
                    error: function() {
                        CountlyHelpers.notify({
                            title: jQuery.i18n.map["configs.not-saved"],
                            message: jQuery.i18n.map["configs.not-changed"],
                            type: "error"
                        });
                    }
                });
            },
            handleAvatarSuccess: function(url) {
                countlyGlobal.member.member_image = url;
                this.avatar = this.setDefaultAvatar(countlyGlobal.member.member_image);
                this.updateGlobalObject();
            },
            nameChanged: function(val) {
                this.initials = this.updateInitials(val);
                this.updateGlobalObject();
            },
            updateInitials: function(full_name) {
                var name = (full_name || "").trim().split(" ");
                if (name.length === 1) {
                    return name[0][0] || "";
                }
                return (name[0][0] || "") + (name[name.length - 1][0] || "");
            },
            updateGlobalObject: function() {
                var userImage = {};
                var member = countlyGlobal.member;
                if (member.member_image) {
                    userImage.url = member.member_image;
                    userImage.found = true;
                }
                else {
                    var defaultAvatarSelector = (member.created_at || Date.now()) % 16 * 60;
                    userImage.found = false;
                    userImage.url = "images/avatar-sprite.png";
                    userImage.position = defaultAvatarSelector;
                    userImage.initials = this.initials;
                }

                member.image = userImage;
            },
            deleteAvatar: function() {
                var self = this;
                $.ajax({
                    type: "POST",
                    url: countlyCommon.API_URL + "/user/settings",
                    data: {
                        username: countlyGlobal.member.username,
                        api_key: countlyGlobal.member.api_key,
                        member_image: "delete",
                        _csrf: countlyGlobal.csrf_token
                    },
                    success: function() {
                        countlyGlobal.member.member_image = "";
                        self.avatar = self.setDefaultAvatar(countlyGlobal.member.member_image);
                        self.updateGlobalObject();
                    },
                    error: function() {
                        CountlyHelpers.notify({ type: "error", message: jQuery.i18n.map['configs.delete_avatar_failed']});
                    }
                });
            },
            setDefaultAvatar: function(image) {
                if (image) {
                    return {'background-image': 'url("' + image + '?' + Date.now() + '")', "background-repeat": "no-repeat", "background-size": "auto 100px"};
                }
                else {
                    var defaultAvatarSelector = countlyGlobal.member.created_at % 16 * 100;
                    return {'background-image': 'url("images/avatar-sprite.png")', 'background-position': defaultAvatarSelector + 'px', 'background-size': 'auto 100px'};
                }
            },
            loadComponents: function() {
                var cc = countlyVue.container.dataMixin({
                    'accountSettingsComponents': '/account/settings'
                });
                cc = cc.data();
                var allComponents = cc.accountSettingsComponents;
                for (var i = 0; i < allComponents.length; i++) {
                    if (allComponents[i]._id && allComponents[i].title && allComponents[i].component) {
                        this.components[allComponents[i]._id] = allComponents[i];
                    }
                }
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

    var getAccountView = function() {
        return new countlyVue.views.BackboneWrapper({
            component: AccountView,
            vuex: [] //empty array if none
        });
    };

    //old global handler
    app.configurationsView = {
        predefinedInputs: {},
        predefinedLabels: {},
        predefinedStructure: {},
        predefinedUserInputs: {},
        registerInput: function(id, callback) {
            this.predefinedInputs[id] = callback;
        },
        registerLabel: function(id, html) {
            this.predefinedLabels[id] = html;
        },
        registerStructure: function(id, obj) {
            this.predefinedStructure[id] = obj;
        },
        registerUserInput: function(id, getVal) {
            this.predefinedUserInputs[id] = getVal;
        },
        getInputLabel: function(id) {
            if (typeof this.predefinedLabels[id] !== "undefined") {
                return jQuery.i18n.map[this.predefinedLabels[id]] || this.predefinedLabels[id];
            }
            else if (jQuery.i18n.map[id + ".title"]) {
                return jQuery.i18n.map[id + ".title"];
            }
            else if (jQuery.i18n.map[id + ".plugin-title"]) {
                return jQuery.i18n.map[id + ".plugin-title"];
            }
            else if (jQuery.i18n.map["configs." + id]) {
                return jQuery.i18n.map["configs." + id];
            }
            else if (jQuery.i18n.map["configs." + (id).replace(".", "-")]) {
                return jQuery.i18n.map["configs." + (id).replace(".", "-")];
            }
            else if (jQuery.i18n.map[id]) {
                return jQuery.i18n.map[id];
            }
            else if (jQuery.i18n.map[(id).replace(".", "-")]) {
                return jQuery.i18n.map[(id).replace(".", "-")];
            }
            else {
                return id;
            }
        },
        getHelperLabel: function(id, ns) {
            if (id === "__user") {
                return jQuery.i18n.map["configs.help.user-level-configuration"];
            }
            else if (jQuery.i18n.map["configs.help." + ns + "." + id]) {
                return jQuery.i18n.map["configs.help." + ns + "." + id];
            }
            else if (jQuery.i18n.map["configs.help." + (ns + "." + id).replace(".", "-")]) {
                return jQuery.i18n.map["configs.help." + (ns + "." + id).replace(".", "-")];
            }
            else if (this.predefinedInputs[ns + "." + id] && this.predefinedInputs[ns + "." + id].helper) {
                return jQuery.i18n.map[this.predefinedInputs[ns + "." + id].helper] || this.predefinedInputs[ns + "." + id].helper;
            }
        },
        getInputType: function(id) {
            var input = this.predefinedInputs[id];
            if (typeof input === "function") {
                return "function";
            }
            if (input && input.input) {
                return input.input;
            }
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
            {value: 'debug', label: CV.i18n("configs.logs.debug")},
            {value: 'info', label: CV.i18n("configs.logs.info")},
            {value: 'warn', label: CV.i18n("configs.logs.warn")},
            {value: 'error', label: CV.i18n("configs.logs.error")}
        ]
    });

    app.configurationsView.registerInput("security.dashboard_additional_headers", {input: "el-input", attrs: {type: "textarea", rows: 5}});

    app.configurationsView.registerInput("security.robotstxt", {input: "el-input", attrs: {type: "textarea", rows: 5}});

    app.configurationsView.registerInput("security.api_additional_headers", {input: "el-input", attrs: {type: "textarea", rows: 5}});


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
                error: function() {
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
            {label: "configs.api.others", list: ["safe", "domain", "export_limit", "offline_mode", "reports_regenerate_interval", "request_threshold", "sync_plugins", "send_test_email", "city_data", "session_cooldown", "total_users", "prevent_duplicate_requests", "metric_changes", "data_retention_period"]},
        ]
    });

    app.configurationsView.registerStructure("logs", {
        description: "",
        groups: [
            {label: "configs.logs.modules", list: ["debug", "warn", "info", "error"]},
            {label: "configs.logs.default-level", list: ["default"]}
        ]
    });

    var showInAppManagment = {};
    if (countlyAuth.validateGlobalAdmin()) {
        if (countlyGlobal.plugins.indexOf("drill") !== -1) {
            showInAppManagment.drill = {"big_list_limit": true, "record_big_list": true, "cache_threshold": true, "correct_estimation": true, "custom_property_limit": true, "list_limit": true, "projection_limit": true, "record_actions": true, "record_crashes": true, "record_meta": true, "record_pushes": true, "record_sessions": true, "record_star_rating": true, "record_apm": true, "record_views": true};
        }
        if (countlyGlobal.plugins.includes("logger")) {
            showInAppManagment.logger = {"state": true, "limit": true};
        }

        app.route('/manage/plugins', 'plugins', function() {
            if (countlyGlobal.COUNTLY_CONTAINER === 'frontend') {
                app.navigate("#/", true);
            }
            else {
                this.renderWhenReady(getPluginView());
            }
        });

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

        countlyPlugins.initializeConfigs().always(function() {
            var pluginsData = countlyPlugins.getConfigsData();
            for (var key in showInAppManagment) {
                var inputs = {};
                for (var conf in showInAppManagment[key]) {
                    if (showInAppManagment[key][conf]) {
                        if (!app.configurationsView.predefinedInputs[key + "." + conf]) {
                            if (pluginsData[key]) {
                                var type = typeof pluginsData[key][conf];
                                if (type === "string") {
                                    app.configurationsView.registerInput(key + "." + conf, {input: "el-input", attrs: {}});
                                }
                                else if (type === "number") {
                                    app.configurationsView.registerInput(key + "." + conf, {input: "el-input-number", attrs: {}});
                                }
                                else if (type === "boolean") {
                                    app.configurationsView.registerInput(key + "." + conf, {input: "el-switch", attrs: {}});
                                }
                            }
                        }
                        if (app.configurationsView.predefinedInputs[key + "." + conf]) {
                            inputs[key + "." + conf] = app.configurationsView.predefinedInputs[key + "." + conf];
                        }
                    }
                }
                app.addAppManagementInput(key, jQuery.i18n.map['configs.' + key], inputs);
            }
        });
    }

    app.route('/account-settings', 'account-settings', function() {
        this.renderWhenReady(getAccountView());
    });

    $(document).ready(function() {
        if (countlyAuth.validateGlobalAdmin()) {
            if (countlyGlobal.COUNTLY_CONTAINER !== 'frontend') {
                app.addMenu("management", {code: "plugins", url: "#/manage/plugins", text: "plugins.title", icon: '<div class="logo-icon fa fa-puzzle-piece"></div>', priority: 80});
            }
        }
        if (countlyAuth.validateGlobalAdmin()) {
            app.addMenu("management", {code: "configurations", url: "#/manage/configurations", text: "plugins.configs", icon: '<div class="logo-icon ion-android-options"></div>', priority: 10});

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