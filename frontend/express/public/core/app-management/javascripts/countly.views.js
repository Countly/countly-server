/*global countlyAuth, app, countlyGlobal, CV, countlyVue, countlyCommon, CountlyHelpers, jQuery, $, Backbone, moment */
(function() {
    var FEATURE_NAME = "global_applications";

    var ManageAppsView = countlyVue.views.create({
        template: CV.T('/core/app-management/templates/app-management.html'),
        computed: {
            selectedSearchBar: {
                get: function() {
                    return this.selectedApp;
                },
                set: function(value) {
                    this.newApp = false;
                    this.selectedApp = value;
                    this.uploadData.app_image_id = countlyGlobal.apps[this.selectedApp]._id + "";
                    this.app_icon["background-image"] = 'url("appimages/' + this.selectedApp + '.png")';
                    app.navigate("#/manage/apps/" + value);
                }
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
            var appList = Object.keys(countlyGlobal.apps).map(function(id) {
                countlyGlobal.apps[id].image = "appimages/" + id + ".png";
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
            if (!countlyGlobal.apps[app_id]) {
                this.createNewApp();
            }
            return {
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
                diff: [],
                changes: {},
                app_icon: {'background-image': 'url("appimages/' + app_id + '.png?' + Date.now() + '")', "background-repeat": "no-repeat", "background-size": "auto 100px"},
                appDetails: false,
                uploadData: {
                    _csrf: countlyGlobal.csrf_token,
                    app_image_id: app_id
                },
                topOptions: [],
                loadingDetails: false
            };
        },
        beforeCreate: function() {

        },
        methods: {
            createNewApp: function() {
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
                //this.newApp.key = CountlyHelpers.generatePassword(40, true).toLowerCase();
                app.navigate("#/manage/apps/new");
            },
            isDisabled: function() {
                return !this.newApp && (this.apps[this.selectedApp].locked || !this.adminApps[this.selectedApp]);
            },
            handleUploadSuccess: function() {
                this.app_icon["background-image"] = 'url("appimages/' + this.selectedApp + '.png?' + Date.now() + '")';
                countlyGlobal.apps[this.selectedApp].image = "appimages/" + this.selectedApp + '.png?' + Date.now();
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
                if (this.newApp) {
                    $.ajax({
                        type: "GET",
                        url: countlyCommon.API_PARTS.apps.w + '/create',
                        data: {
                            args: JSON.stringify(doc)
                        },
                        dataType: "json",
                        success: function(data) {
                            countlyGlobal.apps[data._id] = data;
                            countlyGlobal.admin_apps[data._id] = data;
                            Backbone.history.appIds.push(data._id + "");
                            countlyGlobal.apps[data._id].image = "appimages/" + data._id + ".png";
                            self.appList.push({
                                value: data._id + "",
                                label: data.name
                            });
                            self.selectedSearchBar = data._id + "";
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
                            self.saveSettings(doc);
                        }
                    }, [jQuery.i18n.map["common.no-dont-change"], jQuery.i18n.map["management-applications.app-key-change-warning-confirm"]], {title: jQuery.i18n.map["management-applications.app-key-change-warning-title"], image: "change-the-app-key"});
                }
                else {
                    this.saveSettings(doc);
                }
            },
            saveSettings: function(doc) {
                doc.app_id = this.selectedApp;
                delete doc._id;
                var self = this;
                $.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.apps.w + '/update',
                    data: {
                        args: JSON.stringify(doc)
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
                        /*if (Object.keys(self.changes).length) {
                            countlyPlugins.updateUserConfigs(self.changes, function(err) {
                                if (err) {
                                    CountlyHelpers.notify({
                                        title: jQuery.i18n.map["configs.not-saved"],
                                        message: jQuery.i18n.map["configs.not-changed"],
                                        type: "error"
                                    });
                                }
                                else {
                                    CountlyHelpers.notify({
                                        title: jQuery.i18n.map["configs.changed"],
                                        message: jQuery.i18n.map["configs.saved"]
                                    });
                                }
                            });
                        }
                        else {*/
                        CountlyHelpers.notify({
                            title: jQuery.i18n.map["configs.changed"],
                            message: jQuery.i18n.map["configs.saved"]
                        });
                        //}
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
                            self.appDetails.app.created = (parseInt(result.app.created_at) === 0) ? jQuery.i18n.map["common.unknown"] : countlyCommon.formatTimeAgo(result.app.created_at);
                            self.appDetails.app.edited = (parseInt(result.app.edited_at) === 0) ? jQuery.i18n.map["common.unknown"] : countlyCommon.formatTimeAgo(result.app.edited_at);

                            var ts = self.appDetails.app.last_data;
                            if (Math.round(ts).toString().length === 10) {
                                ts *= 1000;
                            }
                            self.appDetails.app.last_data = (parseInt(result.app.last_data) === 0) ? jQuery.i18n.map["common.unknown"] : moment(new Date(ts)).format("ddd, D MMM YYYY");
                        }
                        else {
                            CountlyHelpers.alert(jQuery.i18n.map["management-applications.application-no-details"], "red");
                        }
                    },
                    error: function() {
                        self.loadingDetails = false;
                        CountlyHelpers.alert(jQuery.i18n.map["management-applications.application-no-details"], "red");
                    }
                });
            },
            unpatch: function() {}
        }
    });

    var getMainView = function() {
        return new countlyVue.views.BackboneWrapper({
            component: ManageAppsView,
            vuex: [] //empty array if none
        });
    };

    if (countlyAuth.validateRead(FEATURE_NAME)) {
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