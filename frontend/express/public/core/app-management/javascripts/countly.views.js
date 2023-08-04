/*global countlyAuth, ELEMENT, app, countlyGlobal, CV, countlyVue, countlyCommon, CountlyHelpers, jQuery, $, Backbone, moment, sdks, countlyPlugins, countlySession, countlyLocation, countlyCity, countlyDevice, countlyCarrier, countlyDeviceDetails, countlyAppVersion, countlyEvent, _ , countlyAppManagement*/
(function() {
    var ManageAppsView = countlyVue.views.create({
        mixins: [ELEMENT.utils.Emitter],
        template: CV.T('/core/app-management/templates/app-management.html'),
        computed: {
            selectedSearchBar: {
                get: function() {
                    return this.selectedApp;
                },
                set: function(value) {
                    this.newApp = false;
                    this.selectedApp = value;
                    this.$store.dispatch('countlyAppManagement/setSelectedAppId', value);
                    this.uploadData.app_image_id = countlyGlobal.apps[this.selectedApp]._id + "";
                    this.app_icon["background-image"] = 'url("appimages/' + this.selectedApp + '.png?' + Date.now().toString() + '")';
                    this.unpatch();
                    app.onAppManagementSwitch(value, countlyGlobal.apps[value] && countlyGlobal.apps[value].type || "mobile");
                    app.navigate("#/manage/apps/" + value);
                    this.showFileList = false;
                }
            },
            isCode: function() {
                return countlyGlobal.config && countlyGlobal.config.code;
            },
            hasGlobalAdminRights: function() {
                return countlyAuth.validateGlobalAdmin();
            },
            hasAppAdminRights: function() {
                return countlyAuth.validateAppAdmin();
            }
        },
        data: function() {
            var countries = [];
            var timezones = [];
            for (var key in countlyGlobal.timezones) {
                countries.push({label: countlyGlobal.timezones[key].n, value: key});
                if (countlyGlobal.timezones[key].z) {
                    for (var zone = 0; zone < countlyGlobal.timezones[key].z.length; zone++) {
                        var k = Object.keys(countlyGlobal.timezones[key].z[zone])[0];
                        timezones.push({value: countlyGlobal.timezones[key].z[zone][k], label: k});
                    }
                }
            }
            countries.sort(function(a, b) {
                return a.label > b.label && 1 || -1;
            });
            timezones.sort(function(a, b) {
                return a.label > b.label && 1 || -1;
            });
            var appList = Object.keys(countlyGlobal.admin_apps).map(function(id) {
                countlyGlobal.apps[id].image = "appimages/" + id + ".png?" + Date.now().toString();
                return {
                    label: countlyGlobal.apps[id].name,
                    value: id
                };
            });
            if (countlyGlobal.member.appSortList) {
                appList = this.sortBy(appList, countlyGlobal.member.appSortList);
            }
            else {
                appList.sort(function(a, b) {
                    return a.label > b.label && 1 || -1;
                });
            }
            var app_id = this.$route.params.app_id || countlyCommon.ACTIVE_APP_ID;
            return {
                showFileList: true,
                firstApp: this.checkIfFirst(),
                newApp: this.newApp || false,
                formId: "app-management-form",
                types: app.appTypes,
                countries: countries,
                timezones: timezones,
                zoneObject: countlyGlobal.timezones,
                selectedApp: app_id,
                apps: countlyGlobal.apps,
                adminApps: countlyGlobal.admin_apps || {},
                appList: appList,
                appListCount: "",
                diff: [],
                sdks: [],
                server: "",
                changes: {},
                changeKeys: [],
                app_icon: {'background-image': 'url("appimages/' + app_id + '.png?' + Date.now() + '")', "background-repeat": "no-repeat", "background-size": "auto 100px"},
                appDetails: false,
                uploadData: {
                    _csrf: countlyGlobal.csrf_token,
                    app_image_id: app_id
                },
                topOptions: [
                    {value: "clear-1month", label: CV.i18n("management-applications.clear-1month-data")},
                    {value: "clear-3month", label: CV.i18n("management-applications.clear-3month-data")},
                    {value: "clear-6month", label: CV.i18n("management-applications.clear-6month-data")},
                    {value: "clear-1year", label: CV.i18n("management-applications.clear-1year-data")},
                    {value: "clear-2year", label: CV.i18n("management-applications.clear-2year-data")},
                    {value: "clear-all", label: CV.i18n("management-applications.clear-all-data")},
                    //{value: "clear", label: CV.i18n("management-applications.clear-data")},
                    {},
                    {value: "reset", label: CV.i18n("management-applications.clear-reset-data"), divided: true},
                    {},
                    {value: "delete", label: CV.i18n("management-applications.delete-an-app"), divided: true},
                ],
                loadingDetails: false,
                appSettings: {},
                appManagementViews: app.appManagementViews,
                edited: true,
                isAppAdmin: countlyAuth.validateAppAdmin(app_id),
                isGlobalAdmin: countlyAuth.validateGlobalAdmin()
            };
        },
        watch: {
            'appManagementViews': {
                handler: function() {
                    this.unpatch();
                },
                deep: true
            },
            appList: {
                handler: function() {
                    this.appListCount = CV.i18n('common.search') + " in " + this.appList.length + (this.appList.length > 1 ? " Apps" : " App");
                },
                immediate: true
            }
        },
        created: function() {
            var app_id = this.$route.params.app_id || countlyCommon.ACTIVE_APP_ID;
            if (!countlyGlobal.apps[app_id]) {
                this.createNewApp();
            }
        },
        beforeCreate: function() {
            var self = this;
            if (countlyGlobal.config && countlyGlobal.config.code) {
                $.getScript("sdks.js", function() {
                    var server = (location.protocol || "http:") + "//" + location.hostname + (location.port ? ":" + location.port : "") + "/" + countlyGlobal.path;
                    if (server.substr(server.length - 1) === '/') {
                        server = server.substr(0, server.length - 1);
                    }
                    if (typeof sdks !== "undefined") {
                        self.sdks = sdks;
                        self.server = server;
                    }
                });
            }
            return $.when(countlyPlugins.initializeConfigs())
                .then(function() {
                    if (countlyGlobal.apps[self.selectedApp]) {
                        self.unpatch();
                    }
                }, function() {

                });
        },
        methods: {
            joinNameList: function(names) {
                return (names || []).map(function(user) {
                    return user.full_name || user.username || user._id;
                }).join(", ");
            },
            edit: function() {
                this.edited = false;
            },
            checkIfFirst: function() {
                var isFirst = !Object.keys(countlyGlobal.apps).length;
                if (isFirst && !this.newApp) {
                    this.createNewApp();
                }
                return isFirst;
            },
            createNewApp: function() {
                this.edited = false;
                this.selectedApp = "new";
                this.newApp = {};
                if (Intl && Intl.DateTimeFormat) {
                    this.newApp.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                    var timezones = countlyGlobal.timezones;
                    for (var countryCode in timezones) {
                        for (var i = 0; i < timezones[countryCode].z.length;i++) {
                            for (var countryTimezone in timezones[countryCode].z[i]) {
                                if (timezones[countryCode].z[i][countryTimezone] === this.newApp.timezone) {
                                    this.newApp.country = countryCode;
                                    break;
                                }
                            }
                        }
                    }
                }
                this.newApp.key = this.generateAPIKey();
                app.navigate("#/manage/apps/new");
            },
            generateAPIKey: function() {
                var length = 40;
                var text = [];
                var chars = "abcdef";
                var numbers = "0123456789";
                var all = chars + numbers;

                //1 char
                text.push(chars.charAt(Math.floor(Math.random() * chars.length)));
                //1 number
                text.push(numbers.charAt(Math.floor(Math.random() * numbers.length)));

                var j, x, i;
                //5 any chars
                for (i = 0; i < Math.max(length - 2, 5); i++) {
                    text.push(all.charAt(Math.floor(Math.random() * all.length)));
                }

                //randomize order
                for (i = text.length; i; i--) {
                    j = Math.floor(Math.random() * i);
                    x = text[i - 1];
                    text[i - 1] = text[j];
                    text[j] = x;
                }

                return text.join("");

            },
            otherAppKeys: function(id) {
                var keys = [];
                for (var app in countlyGlobal.apps) {
                    if (countlyGlobal.apps[app]._id !== id) {
                        keys.push(countlyGlobal.apps[app].key);
                    }
                }
                return keys;
            },
            rules: function(editedObject) {
                return {
                    required: !this.newApp,
                    excluded: this.otherAppKeys(editedObject._id)
                };
            },
            customMessages: function() {
                return {
                    excluded: CV.i18n('management-applications.app-key-unique')
                };
            },
            isSaveDisabled: function(editedObject) {
                return (!this.newApp && (!editedObject.key || editedObject.key === ""))
                || this.otherAppKeys(editedObject._id).includes(editedObject.key)
                || !editedObject.name || editedObject.name === "" ;
            },
            isDisabled: function() {
                return !this.newApp && (this.apps[this.selectedApp].locked || !this.adminApps[this.selectedApp]);
            },
            handleMenuCommand: function(command) {
                if (command === "delete") {
                    this.deleteApp();
                }
                else {
                    var self = this;
                    var period;

                    if (command === "reset") {
                        period = "reset";
                    }
                    else {
                        period = command.replace("clear-", "");
                    }

                    var helper_msg = jQuery.i18n.map["management-applications.clear-confirm-" + period] || jQuery.i18n.map["management-applications.clear-confirm-period"];
                    var helper_title = jQuery.i18n.map["management-applications.clear-" + period + "-data"] || jQuery.i18n.map["management-applications.clear-all-data"];
                    var image = "clear-" + period;

                    if (period === "reset") {
                        image = "reset-the-app";
                    }
                    if (period === "all") {
                        image = "clear-all-app-data";
                    }
                    CountlyHelpers.confirm(helper_msg, "red", function(result) {
                        if (!result) {
                            return true;
                        }

                        var appId2 = self.selectedApp;

                        $.ajax({
                            type: "GET",
                            url: countlyCommon.API_PARTS.apps.w + '/reset',
                            data: {
                                args: JSON.stringify({
                                    app_id: appId2,
                                    period: period
                                })
                            },
                            dataType: "json",
                            success: function(result1) {

                                if (!result1) {
                                    CountlyHelpers.alert(jQuery.i18n.map["management-applications.clear-admin"], "red");
                                    return false;
                                }
                                else {
                                    $(document).trigger("/i/apps/reset", { app_id: appId2, period: period });

                                    if (period === "all" || period === "reset") {
                                        countlySession.reset();
                                        countlyLocation.reset();
                                        countlyCity.reset();
                                        countlyDevice.reset();
                                        countlyCarrier.reset();
                                        countlyDeviceDetails.reset();
                                        countlyAppVersion.reset();
                                        countlyEvent.reset();
                                    }
                                    if (period === "reset") {
                                        CountlyHelpers.alert("", "black", {title: jQuery.i18n.map["management-applications.reset-success"]});
                                    }
                                    else {
                                        CountlyHelpers.alert("", "black", {title: jQuery.i18n.map["management-applications.clear-success"]});
                                    }
                                }
                            }
                        });
                    }, [jQuery.i18n.map["common.no-clear"], jQuery.i18n.map["management-applications.yes-clear-app"]], {title: helper_title + "?", image: image});
                }
            },
            handleUploadSuccess: function() {
                this.app_icon["background-image"] = 'url("appimages/' + this.selectedApp + '.png?' + Date.now() + '")';
                countlyGlobal.apps[this.selectedApp].image = "appimages/" + this.selectedApp + '.png?' + Date.now();
            },
            loadComponents: function() {
                var cc = countlyVue.container.dataMixin({
                    'appSettingsComponents': '/app/settings'
                });
                cc = cc.data();
                var allComponents = cc.appSettingsComponents;
                for (var i = 0; i < allComponents.length; i++) {
                    if (allComponents[i]._id && allComponents[i].title && allComponents[i].component) {
                        this.appSettings[allComponents[i]._id] = allComponents[i];
                    }
                }
            },
            sortBy: function(arrayToSort, sortList) {
                if (!sortList.length) {
                    return arrayToSort;
                }

                var tmpArr = [],
                    retArr = [];
                var i;
                for (i = 0; i < arrayToSort.length; i++) {
                    var objId = arrayToSort[i]._id + "";
                    if (sortList.indexOf(objId) !== -1) {
                        tmpArr[sortList.indexOf(objId)] = arrayToSort[i];
                    }
                }

                for (i = 0; i < tmpArr.length; i++) {
                    if (tmpArr[i]) {
                        retArr[retArr.length] = tmpArr[i];
                    }
                }

                for (i = 0; i < arrayToSort.length; i++) {
                    if (retArr.indexOf(arrayToSort[i]) === -1) {
                        retArr[retArr.length] = arrayToSort[i];
                    }
                }

                return retArr;
            },
            save: function(doc) {
                var self = this;
                self.edited = true;
                if (this.newApp) {
                    $.ajax({
                        type: "GET",
                        url: countlyCommon.API_PARTS.apps.w + '/create',
                        data: {
                            args: JSON.stringify(doc)
                        },
                        dataType: "json",
                        success: function(data) {
                            data.locked = false;
                            countlyGlobal.apps[data._id] = data;
                            countlyGlobal.admin_apps[data._id] = data;
                            Backbone.history.appIds.push(data._id + "");
                            countlyGlobal.apps[data._id].image = "appimages/" + data._id + ".png?" + Date.now().toString();
                            self.appList.push({
                                value: data._id + "",
                                label: data.name
                            });
                            self.$store.dispatch("countlyCommon/addToAllApps", data);
                            if (self.firstApp) {
                                countlyCommon.ACTIVE_APP_ID = data._id + "";
                                app.onAppManagementSwitch(data._id + "", data && data.type || "mobile");
                                self.$store.dispatch("countlyCommon/updateActiveApp", data._id + "");
                                app.initSidebar();
                            }
                            self.firstApp = self.checkIfFirst();
                            setTimeout(function() {
                                self.selectedSearchBar = data._id + "";
                            }, 1);
                        },
                        error: function(xhr, status, error) {
                            CountlyHelpers.notify({
                                title: jQuery.i18n.map["configs.not-saved"],
                                message: error || jQuery.i18n.map["configs.not-changed"],
                                type: "error"
                            });
                        }
                    });
                }
                else if (countlyGlobal.apps[this.selectedApp].key !== doc.key) {
                    var warningText = jQuery.i18n.map["management-applications.app-key-change-warning"];
                    if (countlyGlobal.plugins.indexOf("drill") > -1) {
                        warningText = jQuery.i18n.map["management-applications.app-key-change-warning-EE"];
                    }
                    CountlyHelpers.confirm(warningText, "popStyleGreen popStyleGreenWide", function(result) {
                        if (result) {
                            self.saveApp(doc);
                        }
                    }, [jQuery.i18n.map["common.no-dont-change"], jQuery.i18n.map["management-applications.app-key-change-warning-confirm"]], {title: jQuery.i18n.map["management-applications.app-key-change-warning-title"], image: "change-the-app-key"});
                }
                else {
                    this.saveApp(doc);
                }
            },
            saveApp: function(doc) {
                doc.app_id = this.selectedApp;
                if (doc.redirect_url) {
                    doc.redirect_url = doc.redirect_url.replace(" ", "");
                }

                delete doc._id;
                var self = this;
                $.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.apps.w + '/update',
                    data: {
                        args: JSON.stringify(doc),
                        app_id: doc.app_id
                    },
                    dataType: "json",
                    success: function(data) {
                        for (var modAttr in data) {
                            countlyGlobal.apps[self.selectedApp][modAttr] = data[modAttr];
                            countlyGlobal.admin_apps[self.selectedApp][modAttr] = data[modAttr];
                        }
                        countlyGlobal.apps[self.selectedApp].label = data.name;
                        for (var i = 0; i < self.appList.length; i++) {
                            if (self.appList[i].value === self.selectedApp) {
                                self.appList[i].label = data.name;
                                break;
                            }
                        }
                        self.discardForm();
                        CountlyHelpers.notify({
                            title: jQuery.i18n.map["configs.changed"],
                            message: jQuery.i18n.map["configs.saved"]
                        });
                    },
                    error: function(xhr, status, error) {
                        CountlyHelpers.notify({
                            title: jQuery.i18n.map["configs.not-saved"],
                            message: error || jQuery.i18n.map["configs.not-changed"],
                            type: "error"
                        });
                    }
                });
            },
            loadDetails: function() {
                this.loadingDetails = true;
                var self = this;
                $.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.apps.r + '/details',
                    data: {
                        app_id: self.selectedApp
                    },
                    dataType: "json",
                    success: function(result) {
                        self.loadingDetails = false;
                        if (result && result.app) {
                            self.appDetails = result;
                            self.appDetails.app.created = (parseInt(result.app.created_at, 10) === 0) ? jQuery.i18n.map["common.unknown"] : countlyCommon.formatTimeAgo(result.app.created_at);
                            self.appDetails.app.edited = (parseInt(result.app.edited_at, 10) === 0) ? jQuery.i18n.map["common.unknown"] : countlyCommon.formatTimeAgo(result.app.edited_at);

                            var ts = self.appDetails.app.last_data;
                            if (Math.round(ts).toString().length === 10) {
                                ts *= 1000;
                            }
                            self.appDetails.app.last_data = (parseInt(result.app.last_data, 10) === 0) ? jQuery.i18n.map["common.unknown"] : moment(new Date(ts)).format("ddd, D MMM YYYY");
                        }
                        else {
                            CountlyHelpers.alert(jQuery.i18n.map["management-applications.application-no-details"], "red");
                        }
                    },
                    error: function(e) {
                        self.loadingDetails = false;
                        if (e && e.status !== 0) {
                            CountlyHelpers.alert(jQuery.i18n.map["management-applications.application-no-details"], "red");
                        }
                    }
                });
            },
            setAppLock: function(value) {
                var args = {
                    app_id: this.selectedApp,
                    locked: value
                };

                $.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.apps.w + '/update',
                    data: {
                        args: JSON.stringify(args),
                        app_id: args.app_id
                    },
                    dataType: "json",
                    success: function(data) {
                        for (var modAttr in data) {
                            countlyGlobal.apps[args.app_id][modAttr] = data[modAttr];
                            countlyGlobal.admin_apps[args.app_id][modAttr] = data[modAttr];
                        }
                    },
                    error: function(xhr, status, error) {
                        CountlyHelpers.alert(error, "red");
                    }
                });
            },
            deleteApp: function() {
                var self = this;
                CountlyHelpers.confirm(jQuery.i18n.map["management-applications.delete-confirm"], "red", function(result) {

                    if (!result) {
                        return true;
                    }
                    var app_id = self.selectedApp;

                    $.ajax({
                        type: "GET",
                        url: countlyCommon.API_PARTS.apps.w + '/delete',
                        data: {
                            args: JSON.stringify({
                                app_id: app_id
                            })
                        },
                        dataType: "json",
                        success: function() {
                            $(document).trigger("/i/apps/delete", { app_id: app_id });
                            self.$store.dispatch("countlyCommon/removeFromAllApps", app_id);

                            var index = Backbone.history.appIds.indexOf(app_id + "");
                            if (index > -1) {
                                Backbone.history.appIds.splice(index, 1);
                            }

                            delete countlyGlobal.apps[app_id];
                            delete countlyGlobal.admin_apps[app_id];

                            if (_.isEmpty(countlyGlobal.apps)) {
                                self.firstApp = self.checkIfFirst();
                                app.navigate("#/manage/apps/new");
                            }

                            var index2;
                            for (var i = 0; i < self.appList.length; i++) {
                                if (self.appList[i].value === app_id) {
                                    index2 = i;
                                    break;
                                }
                            }

                            if (typeof index2 === "number") {
                                self.appList.splice(index2, 1);
                            }

                            if (!_.isEmpty(countlyGlobal.apps)) {

                                //find next app
                                var nextAapp = (self.appList[index2]) ? self.appList[index2].value : self.appList[0].value;
                                self.$store.dispatch("countlyCommon/updateActiveApp", nextAapp);
                                self.selectedApp = nextAapp;
                                self.uploadData.app_image_id = countlyGlobal.apps[self.selectedApp]._id + "";
                                self.app_icon["background-image"] = 'url("appimages/' + self.selectedApp + '.png?' + Date.now().toString() + '")';
                                app.navigate("#/manage/apps/" + self.selectedApp);

                                if (countlyCommon.ACTIVE_APP_ID === app_id) {
                                    app.switchApp(nextAapp);
                                }
                            }
                        },
                        error: function(xhr) {
                            if (xhr.status === 403) {
                                CountlyHelpers.alert(jQuery.i18n.map["management-applications.app-locked"], "red");
                            }
                            else {
                                CountlyHelpers.alert(jQuery.i18n.map["management-applications.delete-admin"], "red");
                            }
                        }
                    });
                }, [jQuery.i18n.map["common.no-dont-delete"], jQuery.i18n.map["management-applications.yes-delete-app"]], {title: jQuery.i18n.map["management-applications.delete-an-app"] + "?", image: "delete-an-app"});
            },
            getLabelName: function(id) {
                return app.configurationsView.getInputLabel(id);
            },
            isChangeKeyFound: function(key) {
                return this.changeKeys.some(function(changedKey) {
                    return changedKey === key;
                });
            },
            addChangeKey: function(key, value, parts) {
                var index = this.changeKeys.indexOf(key);
                if (index > -1) {
                    this.changeKeys.splice(index, 1);
                }
                var pluginsData = countlyGlobal.apps[this.selectedApp].plugins;
                if (!pluginsData[parts[0]] || pluginsData[parts[0]][parts[1]] !== value) {
                    this.changeKeys.push(key);
                }
            },
            compare: function(editedObject, selectedApp) {
                var differences = [];
                if (!this.selectedApp || this.selectedApp === "new") {
                    return differences;
                }
                else {
                    ["name", "category", "type", "key", "country", "timezone", "salt", "_id", "redirect_url"].forEach(function(currentKey) {
                        if (editedObject[currentKey] !== selectedApp[currentKey]) {
                            differences.push(currentKey);
                        }
                    });
                    return differences;
                }
            },
            discardForm: function() {
                this.edited = true;
                this.$refs.appForm.reload();
            },
            updateChangeByLevel: function(value, parts, change, currentLevel) {
                if (!currentLevel) {
                    currentLevel = 0;
                }
                if (!change) {
                    change = this.changes;
                }
                if (!change[parts[currentLevel]]) {
                    change[parts[currentLevel]] = {};
                }
                if (currentLevel === (parts.length - 1)) {
                    change[parts[currentLevel]] = value;
                    return;
                }
                var nextChange = change[parts[currentLevel]];
                var nextLevel = currentLevel + 1;
                this.updateChangeByLevel(value, parts, nextChange, nextLevel);
            },
            updateAppSettings: function(key, value, parts) {
                if (!this.appSettings[parts[0]]) {
                    this.appSettings[parts[0]] = {title: this.getLabelName(parts[0]), inputs: {}};
                }
                if (!this.appSettings[parts[0]].inputs) {
                    this.appSettings[parts[0]].inputs = {};
                }
                if (!this.appSettings[parts[0]].inputs[key]) {
                    this.appSettings[parts[0]].inputs[key] = {};
                }
                this.appSettings[parts[0]].inputs[key].value = value;
            },
            /**
             * Adds user changes made to a specific app plugin using the dot formatted key to assign the value
             * @param {String} key dot formatted string indicating what plugin property has changed, e.g. push.i.file
             *  indicates that file property found in i property of push object has changed
             * @param {String} value key edited value 
             * @param {Boolean} isInitializationCall used by plugins with nested properties to initialize/prepare plugin 
             * config object while not counting it as state change.
             */

            onChange: function(key, value, isInitializationCall) {
                var parts = key.split(".");
                this.updateAppSettings(key, value, parts);
                this.updateChangeByLevel(value, parts);
                if (!isInitializationCall) {
                    this.addChangeKey(key, value, parts);
                }
                this.appSettings = Object.assign({}, this.appSettings);
            },
            resetChanges: function() {
                this.changes = {};
                this.changeKeys = [];
            },
            unpatch: function() {
                this.loadDetails();
                this.resetChanges();
                var pluginsData = countlyPlugins.getConfigsData();
                if (!countlyGlobal.apps[this.selectedApp].plugins) {
                    countlyGlobal.apps[this.selectedApp].plugins = {};
                }
                var plugins = countlyGlobal.apps[this.selectedApp].plugins || {};
                this.appSettings = {};
                for (var i in app.appManagementViews) {
                    if (app.appManagementViews[i].inputs) {
                        if (!this.appSettings[i]) {
                            this.appSettings[i] = app.appManagementViews[i];
                        }
                        for (var j in app.appManagementViews[i].inputs) {
                            if (j === 'consolidate') {
                                this.appSettings[i].inputs[j].value = this.getConsolidatedApps();
                                continue;
                            }
                            var parts = j.split(".");
                            if (parts.length === 2) {
                                if (plugins[parts[0]] && typeof plugins[parts[0]][parts[1]] !== "undefined") {
                                    this.appSettings[i].inputs[j].value = plugins[parts[0]][parts[1]];
                                }
                                else if (pluginsData[parts[0]] && typeof pluginsData[parts[0]][parts[1]] !== "undefined") {
                                    this.appSettings[i].inputs[j].value = pluginsData[parts[0]][parts[1]];
                                }
                                else {
                                    this.appSettings[i].inputs[j].value = this.appSettings[i].inputs[j].defaultValue;
                                }
                            }
                            else if (parts.length === 1) {
                                if (typeof plugins[parts[0]] !== "undefined") {
                                    this.appSettings[i].inputs[j].value = plugins[parts[0]];
                                }
                                else {
                                    this.appSettings[i].inputs[j].value = this.appSettings[i].inputs[j].defaultValue;
                                }
                            }
                            else {
                                this.appSettings[i].inputs[j].value = this.appSettings[i].inputs[j].defaultValue;
                            }
                        }
                    }
                }
                this.loadComponents();
            },
            onDiscard: function() {
                this.broadcast('AppSettingsContainerObservable', 'discard');
                this.unpatch();
            },
            saveSettings: function() {
                var self = this;
                this.$refs.configObserver.validate().then(function(isValid) {
                    if (isValid) {
                        var appSettingKeys = Object.keys(app.appManagementViews);
                        for (var i = 0; i < appSettingKeys.length; i++) {
                            if (self.changes[appSettingKeys[i]]) {
                                if (appSettingKeys[i] === 'consolidate') {
                                    self.changes[appSettingKeys[i]] = {
                                        selectedApps: self.changes[appSettingKeys[i]] || [],
                                        initialApps: self.getConsolidatedApps() || []
                                    };
                                }
                                else {
                                    var subKeys = Object.keys(app.appManagementViews[appSettingKeys[i]].inputs);
                                    for (var j = 0; j < subKeys.length; j++) {
                                        if (!self.changes[appSettingKeys[i]][subKeys[j].split('.', 2)[1]]) {
                                            self.changes[appSettingKeys[i]][subKeys[j].split('.', 2)[1]] = app.appManagementViews[appSettingKeys[i]].inputs[subKeys[j]].value;
                                        }
                                    }
                                }
                            }
                        }
                        $.ajax({
                            type: "POST",
                            url: countlyCommon.API_PARTS.apps.w + '/update/plugins',
                            data: {
                                app_id: self.selectedApp,
                                args: JSON.stringify(self.changes)
                            },
                            dataType: "json",
                            success: function(result) {
                                if (result.result === 'Nothing changed') {
                                    CountlyHelpers.notify({type: 'warning', message: jQuery.i18n.map['management-applications.plugins.saved.nothing']});
                                }
                                else {
                                    CountlyHelpers.notify({title: jQuery.i18n.map['management-applications.plugins.saved.title'], message: jQuery.i18n.map['management-applications.plugins.saved']});
                                }
                                if (!countlyGlobal.apps[self.selectedApp].plugins) {
                                    countlyGlobal.apps[self.selectedApp].plugins = {};
                                }
                                for (var key in self.changes) {
                                    if (key === 'consolidate') {
                                        //self app can only be updated through other apps
                                        //countlyGlobal.apps[self.selectedApp].plugins[key] = self.changes[key].selectedApps;
                                        var removedSourceApps = self.changes.consolidate.selectedApps
                                            .filter(function(x) {
                                                return !self.changes.consolidate.initialApps.includes(x);
                                            })
                                            .concat(self.changes.consolidate.initialApps.filter(function(x) {
                                                return !self.changes.consolidate.selectedApps.includes(x);
                                            }));
                                        for (var removalAppKey of removedSourceApps) {
                                            if (!countlyGlobal.apps[removalAppKey].plugins || !countlyGlobal.apps[removalAppKey].plugins[key]) {
                                                continue;
                                            }
                                            var removalIndex = countlyGlobal.apps[removalAppKey].plugins[key].indexOf(self.selectedApp);
                                            if (removalIndex > -1) {
                                                countlyGlobal.apps[removalAppKey].plugins[key].splice(removalIndex, 1);
                                            }
                                        }
                                        for (var appKey of self.changes[key].selectedApps) {
                                            if (!countlyGlobal.apps[appKey].plugins) {
                                                countlyGlobal.apps[appKey].plugins = {};
                                            }
                                            if (!countlyGlobal.apps[appKey].plugins[key]) {
                                                countlyGlobal.apps[appKey].plugins[key] = [self.selectedApp];
                                            }
                                            if (!countlyGlobal.apps[appKey].plugins[key].includes(self.selectedApp)) {
                                                countlyGlobal.apps[appKey].plugins[key].push(self.selectedApp);
                                            }
                                        }
                                    }
                                    else {
                                        countlyGlobal.apps[self.selectedApp].plugins[key] = self.changes[key];
                                    }
                                }
                                self.resetChanges();
                            },
                            error: function(resp, status, error) {
                                try {
                                    resp = JSON.parse(resp.responseText);
                                }
                                catch (ignored) {
                                    //ignored excep
                                }
                                CountlyHelpers.notify({
                                    title: jQuery.i18n.map["configs.not-saved"],
                                    message: resp.errors || error || resp.result || jQuery.i18n.map['management-applications.plugins.error.server'],
                                    type: "error"
                                });
                            }
                        });
                    }
                });
            },
            getConsolidatedApps: function() {
                var self = this;
                return Object.keys(countlyGlobal.apps).filter(function(key) {
                    if (key === self.selectedApp) {
                        return false;
                    }
                    if (countlyGlobal.apps[key].plugins && countlyGlobal.apps[key].plugins.consolidate && countlyGlobal.apps[key].plugins.consolidate.length) {
                        return countlyGlobal.apps[key].plugins.consolidate.includes(self.selectedApp);
                    }
                }) || [];
            }
        },
        mounted: function() {
            var appId = this.$route.params.app_id || countlyCommon.ACTIVE_APP_ID;
            this.$store.dispatch('countlyAppManagement/setSelectedAppId', appId);
        }
    });

    var getMainView = function() {
        return new countlyVue.views.BackboneWrapper({
            component: ManageAppsView,
            vuex: [{clyModel: countlyAppManagement}]
        });
    };

    if (countlyAuth.validateAnyAppAdmin()) {
        app.route("/manage/apps", "manage-apps", function() {
            var view = getMainView();
            view.params = {app_id: countlyCommon.ACTIVE_APP_ID};
            this.renderWhenReady(view);
        });

        app.route("/manage/apps/:app_id", "manage-apps", function(app_id) {
            var view = getMainView();
            view.params = {app_id: app_id};
            this.renderWhenReady(view);
        });
    }

    //old global handler
    app.manageAppsView = {
        getAppCategories: function() {
            return { 1: jQuery.i18n.map["application-category.books"], 2: jQuery.i18n.map["application-category.business"], 3: jQuery.i18n.map["application-category.education"], 4: jQuery.i18n.map["application-category.entertainment"], 5: jQuery.i18n.map["application-category.finance"], 6: jQuery.i18n.map["application-category.games"], 7: jQuery.i18n.map["application-category.health-fitness"], 8: jQuery.i18n.map["application-category.lifestyle"], 9: jQuery.i18n.map["application-category.medical"], 10: jQuery.i18n.map["application-category.music"], 11: jQuery.i18n.map["application-category.navigation"], 12: jQuery.i18n.map["application-category.news"], 13: jQuery.i18n.map["application-category.photography"], 14: jQuery.i18n.map["application-category.productivity"], 15: jQuery.i18n.map["application-category.reference"], 16: jQuery.i18n.map["application-category.social-networking"], 17: jQuery.i18n.map["application-category.sports"], 18: jQuery.i18n.map["application-category.travel"], 19: jQuery.i18n.map["application-category.utilities"], 20: jQuery.i18n.map["application-category.weather"]};
        },
        getTimeZones: function() {
            return countlyGlobal.timezones;
        }
    };
})();