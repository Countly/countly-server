/* global app, jQuery, CV, Vue, countlyGlobal, _, Backbone, store, moment, countlyCommon, countlyLocation*/

(function(countlyVue, $) {

    $(document).ready(function() {
        var AppSelector = countlyVue.views.create({
            template: CV.T('/javascripts/countly/vue/templates/sidebar/app-selector.html'),
            data: function() {
                return {
                    centerDialogVisible: true
                };
            },
            computed: {
                activeApp: {
                    get: function() {
                        var app = this.$store.getters["countlyCommon/getActiveApp"];
                        return app && app._id;
                    },
                    set: function(activeApp) {
                        this.onChange(activeApp);
                    }
                },
                showCompare: function() {
                    var cc = countlyVue.container.dataMixin({
                        'compareComponent': '/apps/compare'
                    });
                    var component = cc.data();
                    if (component && component.compareComponent && component.compareComponent.length > 0) {
                        return component.compareComponent[0].enabled.default || false;
                    }
                    return false;
                },
            },
            props: {
                allApps: {
                    type: Array
                }
            },
            methods: {
                compare: function() {
                    app.navigate("#/compare", true);
                    this.$emit("close");
                },
                onChange: function(id) {
                    var selectedApp = this.allApps.find(function(a) {
                        return a._id === id;
                    });

                    var appKey = selectedApp.key;
                    var appName = selectedApp.name;
                    var appId = selectedApp._id;
                    if (app.activeAppKey !== appKey) {
                        app.activeAppName = appName;
                        app.activeAppKey = appKey;
                        app.switchApp(appId);
                    }
                    this.handleClose();
                },
                handleClose: function() {
                    this.$emit("close");
                }
            }
        });

        var UsersMenu = countlyVue.views.create({
            template: CV.T('/javascripts/countly/vue/templates/sidebar/users-menu.html'),
            props: {
                item: {
                    type: Object
                }
            },
            data: function() {
                return {
                    helpCenterLink: {
                        isString: typeof countlyGlobal.usermenu.helpCenterLink === "string" ? countlyGlobal.usermenu.helpCenterLink : false,
                        isBoolean: typeof countlyGlobal.usermenu.helpCenterLink === "boolean" && countlyGlobal.usermenu.helpCenterLink
                    },
                    documentationLink: {
                        isString: typeof countlyGlobal.usermenu.documentationLink === "string" ? countlyGlobal.usermenu.documentationLink : false,
                        isBoolean: typeof countlyGlobal.usermenu.documentationLink === "boolean" && countlyGlobal.usermenu.documentationLink
                    },
                    feedbackLink: {
                        isString: typeof countlyGlobal.usermenu.feedbackLink === "string" ? countlyGlobal.usermenu.feedbackLink : false
                    },
                    featureRequestLink: {
                        isString: typeof countlyGlobal.usermenu.featureRequestLink === "string" ? countlyGlobal.usermenu.featureRequestLink : false,
                        isBoolean: typeof countlyGlobal.usermenu.featureRequestLink === "boolean" && countlyGlobal.usermenu.featureRequestLink
                    }
                };
            },
            methods: {
                logout: function() {
                    this.$store.dispatch("countlyCommon/removeActiveApp");
                    store.remove('countly_date');
                    store.remove('countly_location_city');
                    this.logoutRequest();
                },
                logoutRequest: function() {
                    var logoutForm = document.createElement("form");
                    logoutForm.action = countlyGlobal.path + '/logout';
                    logoutForm.method = "post";
                    logoutForm.style.display = "none";
                    logoutForm.type = "submit";
                    var logoutForm_csrf = document.createElement("input");
                    logoutForm_csrf.name = '_csrf';
                    logoutForm_csrf.value = countlyGlobal.csrf_token;
                    logoutForm.appendChild(logoutForm_csrf);
                    document.body.appendChild(logoutForm);
                    logoutForm.submit();
                    document.body.removeChild(logoutForm);
                }
            }
        });

        var AnalyticsMenu = countlyVue.views.create({
            template: CV.T('/javascripts/countly/vue/templates/sidebar/analytics-menu.html'),
            mixins: [
                countlyVue.container.dataMixin({
                    "categories": "/sidebar/analytics/menuCategory",
                    "menus": "/sidebar/analytics/menu",
                    "submenus": "/sidebar/analytics/submenu"
                })
            ],
            components: {
                "app-selector": AppSelector
            },
            data: function() {
                return {
                    selectedAnalyticsMenu: null,
                    appSelector: false
                };
            },
            computed: {
                allApps: function() {
                    var storedApp = this.$store.getters["countlyCommon/getAllApps"];
                    var apps = _.sortBy(storedApp, function(app) {
                        return (app.name + "").toLowerCase();
                    });
                    if (countlyGlobal.member.appSortList) {
                        apps = this.sortBy(apps, countlyGlobal.member.appSortList);
                    }
                    apps = apps.map(function(a) {
                        a.label = a.name;
                        a.value = a._id;
                        return a;
                        //a.image = countlyGlobal.path + "appimages/" + active._id + ".png"
                    });
                    return apps;
                },
                activeApp: function() {
                    var selectedAppId = this.$store.getters["countlyCommon/getActiveApp"] && this.$store.getters["countlyCommon/getActiveApp"]._id;
                    var active = this.allApps.find(function(a) {
                        return a._id === selectedAppId;
                    });

                    if (active) {
                        active.image = countlyGlobal.path + "appimages/" + active._id + ".png";
                    }
                    return active || {};
                },
                categorizedMenus: function() {
                    if (!this.activeApp) {
                        return {};
                    }
                    var self = this;
                    var menus = this.menus.reduce(function(acc, val) {
                        if (val.app_type === self.activeApp.type) {
                            (acc[val.category] = acc[val.category] || []).push(val);
                        }
                        return acc;
                    }, {});
                    return menus;
                },
                categorizedSubmenus: function() {
                    if (!this.activeApp) {
                        return {};
                    }
                    var self = this;
                    var submenus = this.submenus.reduce(function(acc, val) {
                        if (val.app_type === self.activeApp.type) {
                            (acc[val.parent_code] = acc[val.parent_code] || []).push(val);
                        }
                        return acc;
                    }, {});
                    return submenus;
                },
                selectedMenuItem: function() {
                    var selected = this.$store.getters["countlySidebar/getSelectedMenuItem"];
                    if (selected && selected.menu === "analytics") {
                        this.selectedAnalyticsMenu = selected.item && selected.item.parent_code;
                        return selected.item;
                    }
                    else {
                        this.checkCurrentAnalyticsTab();
                        return {};
                    }
                }
            },
            methods: {
                suffixIconClass: function(dropdown) {
                    return (dropdown.visible ? 'arrow-up is-reverse' : 'arrow-up');
                },
                onMenuItemClick: function(item) {
                    this.$store.dispatch("countlySidebar/updateSelectedMenuItem", {menu: "analytics", item: item});
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
                checkCurrentAnalyticsTab: function() {
                    var currLink = Backbone.history.fragment;
                    if (/^\/custom/.test(currLink) === true) {
                        return;
                    }
                    var menus = this.categorizedMenus;
                    var submenus = this.categorizedSubmenus;
                    var foundMenu = false;
                    var currMenu = {};
                    var part1 = "";
                    var part2 = "";
                    var menu;

                    if (!Object.keys(menus).length || !Object.keys(submenus).length) {
                        // eslint-disable-next-line no-console
                        console.log("Something is terribly wrong, please contact Prikshit Tekta asap and don't clear the logs please! ", currLink, menus, submenus);
                    }

                    for (var k in menus) {
                        for (var i = 0; i < menus[k].length; i++) {
                            menu = menus[k][i];

                            if (menu.url === "#" + currLink) {
                                foundMenu = true;
                                currMenu = menu;
                                break;
                            }

                            if (currLink.split("/").length > 2) {
                                part1 = "/" + currLink.split("/")[1];
                                part2 = part1 + "/" + currLink.split("/")[2];
                                if (menu.url === "#" + part1 || menu.url === "#" + part2) {
                                    foundMenu = true;
                                    currMenu = menu;
                                    break;
                                }
                            }
                        }

                        if (foundMenu) {
                            break;
                        }
                    }

                    if (!foundMenu) {
                        for (var l in submenus) {
                            for (var j = 0; j < submenus[l].length; j++) {
                                menu = submenus[l][j];

                                if (menu.url === "#" + currLink) {
                                    foundMenu = true;
                                    currMenu = menu;
                                    break;
                                }

                                if (currLink.split("/").length > 2) {
                                    part1 = "/" + currLink.split("/")[1];
                                    part2 = part1 + "/" + currLink.split("/")[2];
                                    if (menu.url === "#" + part1 || menu.url === "#" + part2) {
                                        foundMenu = true;
                                        currMenu = menu;
                                        break;
                                    }
                                }
                            }

                            if (foundMenu) {
                                break;
                            }
                        }
                    }

                    var setMenuItem = this.$store.getters["countlySidebar/getSelectedMenuItem"];

                    //Check if we have a selected menu item already
                    //If its management, that means the url is not in the analytics menu
                    //The value of currMenu in that case should be empty
                    //Although analytics menu should be mounted first but just incase it doesn't,
                    //We should check if the menu is already set or not. If its set then the only case
                    //Could be that its a management menu

                    if (!setMenuItem || (setMenuItem.menu !== "management")) {
                        this.$store.dispatch("countlySidebar/updateSelectedMenuItem", { menu: "analytics", item: currMenu });
                    }
                },
                toggleAppSelection: function() {
                    this.appSelector = !this.appSelector;
                }
            },
            mounted: function() {
                this.checkCurrentAnalyticsTab();
            }
        });

        var ManagementMenu = countlyVue.views.create({
            template: CV.T('/javascripts/countly/vue/templates/sidebar/management-menu.html'),
            mixins: [
                countlyVue.container.dataMixin({
                    "menus": "/sidebar/analytics/menu"
                })
            ],
            computed: {
                menu: function() {
                    var menu = this.menus.filter(function(val) {
                        if (val.category === "management") {
                            return true;
                        }
                        return false;
                    });
                    return menu;
                },
                selectedMenuItem: function() {
                    var selected = this.$store.getters["countlySidebar/getSelectedMenuItem"];
                    if (selected && selected.menu === "management") {
                        return selected.item;
                    }
                    else {
                        this.checkCurrentManagementTab();
                        return {};
                    }
                }
            },
            methods: {
                onMenuItemClick: function(item) {
                    this.$store.dispatch("countlySidebar/updateSelectedMenuItem", {menu: "management", item: item});
                },
                checkCurrentManagementTab: function() {
                    var currLink = Backbone.history.fragment;
                    if (/^\/custom/.test(currLink) === true) {
                        return;
                    }
                    var menu = this.menu;

                    var currMenu = menu.find(function(m) {
                        return m.url === currLink;
                    });

                    if (!currMenu) {
                        if (currLink.split("/").length > 2) {
                            var part1 = "/" + currLink.split("/")[1];
                            var part2 = part1 + "/" + currLink.split("/")[2];
                            currMenu = menu.find(function(m) {
                                return (m.url === "#" + part1 || m.url === "#" + part2);
                            });
                        }
                    }
                    if (currMenu) {
                        this.$store.dispatch("countlySidebar/updateSelectedMenuItem", { menu: "management", item: currMenu });
                    }
                }
            },
            mounted: function() {
                this.checkCurrentManagementTab();
            }
        });

        var LanguageMenu = countlyVue.views.create({
            template: CV.T('/javascripts/countly/vue/templates/sidebar/language-menu.html'),
            data: function() {
                return {
                    localLang: countlyCommon.BROWSER_LANG_SHORT
                };
            },
            computed: {
                allLanguages: function() {
                    return countlyGlobal.languages.map(function(l) {
                        return {
                            label: l.name,
                            value: l.code
                        };
                    });
                },
                selLang: {
                    get: function() {
                        return this.localLang;
                    },
                    set: function(langCode) {
                        store.set("countly_lang", langCode);
                        countlyCommon.BROWSER_LANG_SHORT = langCode;
                        countlyCommon.BROWSER_LANG = langCode;

                        this.localLang = langCode;

                        try {
                            moment.locale(countlyCommon.BROWSER_LANG_SHORT);
                        }
                        catch (e) {
                            moment.locale("en");
                        }

                        countlyCommon.getMonths(true);

                        CV.$.ajax({
                            type: "POST",
                            url: countlyGlobal.path + "/user/settings/lang",
                            data: {
                                "username": countlyGlobal.member.username,
                                "lang": countlyCommon.BROWSER_LANG_SHORT,
                                _csrf: countlyGlobal.csrf_token
                            }
                        });

                        jQuery.i18n.properties({
                            name: window.production ? 'localization/min/locale' : ["localization/dashboard/dashboard", "localization/help/help", "localization/mail/mail"].concat(countlyGlobal.plugins.map(function(plugin) {
                                return plugin + "/localization/" + plugin;
                            })),
                            cache: true,
                            language: countlyCommon.BROWSER_LANG_SHORT,
                            countlyVersion: countlyGlobal.countlyVersion + "&" + countlyGlobal.pluginsSHA,
                            path: countlyGlobal.cdn,
                            mode: 'map',
                            callback: function() {
                                for (var key in jQuery.i18n.map) {
                                    if (countlyGlobal.company) {
                                        jQuery.i18n.map[key] = jQuery.i18n.map[key].replace(new RegExp("Countly", 'ig'), countlyGlobal.company);
                                    }
                                    jQuery.i18n.map[key] = countlyCommon.encodeSomeHtml(jQuery.i18n.map[key]);
                                }

                                app.origLang = JSON.stringify(jQuery.i18n.map);
                                $.when(countlyLocation.changeLanguage()).then(function() {
                                    window.location.reload(true);
                                });
                            }
                        });
                    }
                }
            }
        });

        var SidebarView = countlyVue.views.create({
            template: CV.T('/javascripts/countly/vue/templates/sidebar/sidebar.html'),
            mixins: [
                countlyVue.container.dataMixin({
                    "externalMainMenuOptions": "/sidebar/menu/main",
                    "externalOtherMenuOptions": "/sidebar/menu/other"
                })
            ],
            components: {
                "users-menu": UsersMenu,
                "analytics-menu": AnalyticsMenu,
                "management-menu": ManagementMenu,
                "language-menu": LanguageMenu
            },
            data: function() {
                return {
                    selectedMenuOptionLocal: null,
                    versionInfo: countlyGlobal.countlyTypeName
                };
            },
            computed: {
                components: function() {
                    var menuOptions = [];

                    var externalMainMenuOptions = this.externalMainMenuOptions;
                    var externalOtherMenuOptions = this.externalOtherMenuOptions;

                    if (externalMainMenuOptions && externalMainMenuOptions.length) {
                        menuOptions = menuOptions.concat(externalMainMenuOptions);
                    }

                    if (externalOtherMenuOptions && externalOtherMenuOptions.length) {
                        menuOptions = menuOptions.concat(externalOtherMenuOptions);
                    }

                    return menuOptions;
                },
                mainMenuOptions: function() {
                    var menuOptions = [
                        {
                            name: "app",
                            noSelect: true
                        },
                        // {
                        //     name: "search",
                        //     icon: "ion-ios-search-strong"
                        // },
                        {
                            name: "analytics",
                            icon: "ion-stats-bars"
                        },
                        {
                            name: "divider",
                            noSelect: true
                        },
                        {
                            name: "management",
                            icon: "ion-wrench",
                            tooltip: "Management"
                        }
                    ];

                    var externalMainMenuOptions = this.externalMainMenuOptions;

                    if (externalMainMenuOptions && externalMainMenuOptions.length) {
                        for (var i = 0; i < externalMainMenuOptions.length; i++) {
                            menuOptions.splice(2, 0, externalMainMenuOptions[i]);
                        }
                    }

                    return menuOptions;
                },
                otherMenuOptions: function() {
                    var menuOptions = [
                        {
                            name: "clipboard",
                            icon: "ion-clipboard",
                            noSelect: true,
                            tooltip: "Help Center"
                        },
                        {
                            name: "notifications",
                            icon: "ion-android-notifications",
                            noSelect: true,
                            tooltip: "Assistant"
                        },
                        {
                            name: "user",
                            icon: "ion-person",
                            noSelect: true,
                            member: this.member
                        },
                        {
                            name: "language",
                            noSelect: true,
                            tooltip: "Language"
                        },
                        {
                            name: "toggle",
                            icon: "ion-chevron-left",
                            noSelect: true
                        }
                    ];

                    var externalOtherMenuOptions = this.externalOtherMenuOptions;

                    if (externalOtherMenuOptions && externalOtherMenuOptions.length) {
                        for (var i = 0; i < externalOtherMenuOptions.length; i++) {
                            menuOptions.splice(3, 0, externalOtherMenuOptions[i]);
                        }
                    }

                    return menuOptions;
                },
                member: function() {
                    //We should fetch the user from vuex
                    //So that updates are reactive

                    var userImage = {};
                    var member = countlyGlobal.member;
                    if (member.member_image) {
                        userImage.url = member.member_image;
                        userImage.found = true;
                    }
                    else {
                        var defaultAvatarSelector = (member.created_at || Date.now()) % 16 * 60;
                        var name = member.full_name.split(" ");

                        userImage.found = false;
                        userImage.url = "images/avatar-sprite.png";
                        userImage.position = defaultAvatarSelector;
                        userImage.initials = name[0][0] + name[name.length - 1][0];
                    }

                    member.image = userImage;

                    return member;
                },
                selectedMenuOption: function() {
                    var selected = this.$store.getters["countlySidebar/getSelectedMenuItem"];
                    if (!this.selectedMenuOptionLocal && selected) {
                        return selected.menu;
                    }

                    return this.selectedMenuOptionLocal;
                }
            },
            methods: {
                onClick: function(option) {
                    if (!option.noSelect) {
                        this.selectedMenuOptionLocal = option.name;
                    }
                }
            }
        });

        countlyVue.sideBarComponent = new Vue({
            el: $('#sidebar-x').get(0),
            store: countlyVue.vuex.getGlobalStore(),
            components: {
                Sidebar: SidebarView
            },
            template: '<Sidebar></Sidebar>'
        });
    });

}(window.countlyVue = window.countlyVue || {}, jQuery));
