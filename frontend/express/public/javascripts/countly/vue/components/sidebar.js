/* global app, jQuery, CV, Vue, countlyGlobal, _, Backbone, store, moment, countlyCommon, CountlyHelpers */

(function(countlyVue, $) {

    $(document).ready(function() {
        var AppsMixin = {
            computed: {
                allApps: {
                    get: function() {
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
                        });
                        return apps;
                    },
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
            },
            methods: {
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
                }
            }
        };

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
                    },
                    successMessage: CV.i18n("sidebar.copy-api-key-success-message"),
                    errorMessage: CV.i18n("common.copy-error-message")
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
                },
                onCopy: function() {
                    CountlyHelpers.notify({
                        message: this.successMessage,
                        type: "success"
                    });
                },
                onError: function() {
                    CountlyHelpers.notify({
                        message: this.errorMessage,
                        type: "error"
                    });
                }
            }
        });

        var ValidationMixin = {
            methods: {
                validate: function(item) {
                    var valid = true;

                    var tabsValidated = this.validateTabs(item);

                    return valid && tabsValidated;
                },
                validateTabs: function(item) {
                    var valid = true;

                    if (item.tabsPath) {
                        var tbs = countlyVue.container.tabsMixin({
                            t: item.tabsPath
                        });

                        var tabs = tbs.data().t;

                        valid = (tabs.length > 0);
                    }

                    return valid;
                }
            }
        };

        var AnalyticsMenu = countlyVue.views.create({
            template: CV.T('/javascripts/countly/vue/templates/sidebar/analytics-menu.html'),
            mixins: [AppsMixin, ValidationMixin],
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
                categories: function() {
                    if (!this.activeApp || !this.activeApp._id) {
                        return [];
                    }

                    var c = countlyVue.container.dataMixin({
                        categories: "/sidebar/analytics/menuCategory"
                    });

                    var cats = c.data().categories;

                    return cats;
                },
                categorizedMenus: function() {
                    if (!this.activeApp || !this.activeApp._id) {
                        return {};
                    }

                    var m = countlyVue.container.dataMixin({
                        menus: "/sidebar/analytics/menu"
                    });

                    var mm = m.data().menus;

                    var self = this;
                    var menus = mm.reduce(function(acc, val) {
                        if (val.app_type === self.activeApp.type) {
                            if (self.validate(val)) {
                                if (!acc[val.category]) {
                                    acc[val.category] = [];
                                }

                                acc[val.category].push(val);
                            }
                        }
                        return acc;
                    }, {});

                    return menus;
                },
                categorizedSubmenus: function() {
                    if (!this.activeApp || !this.activeApp._id) {
                        return {};
                    }

                    var s = countlyVue.container.dataMixin({
                        submenus: "/sidebar/analytics/submenu"
                    });

                    var sbm = s.data().submenus;

                    var self = this;
                    var submenus = sbm.reduce(function(acc, val) {
                        if (val.app_type === self.activeApp.type) {
                            if (self.validate(val)) {
                                if (!acc[val.parent_code]) {
                                    acc[val.parent_code] = [];
                                }

                                acc[val.parent_code].push(val);
                            }
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

                    return {};
                }
            },
            methods: {
                suffixIconClass: function(dropdown) {
                    return (dropdown.visible ? 'arrow-up is-reverse' : 'arrow-up');
                },
                onMenuItemClick: function(item) {
                    this.$store.dispatch("countlySidebar/updateSelectedMenuItem", {menu: "analytics", item: item});
                },
                identifySelected: function() {
                    var currLink = Backbone.history.fragment;
                    if (/^\/custom/.test(currLink) === true) {
                        return;
                    }
                    var menus = this.categorizedMenus;
                    var submenus = this.categorizedSubmenus;
                    var foundMenu = false;
                    var currMenu;
                    var part1 = "";
                    var part2 = "";
                    var part3 = "";
                    var menu;

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
                                part3 = part2 + "/";
                                if (menu.url === "#" + part1 || menu.url === "#" + part2 || menu.url === "#" + part3) {
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
                                    part3 = part2 + "/";
                                    if (menu.url === "#" + part1 || menu.url === "#" + part2 || menu.url === "#" + part3) {
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

                    if (currMenu) {
                        this.$store.dispatch("countlySidebar/updateSelectedMenuItem", { menu: "analytics", item: currMenu });
                    }
                    else {
                        var selected = this.$store.getters["countlySidebar/getSelectedMenuItem"];
                        if (selected.menu === "analytics") {
                            /**
                             * Incase the selected menu is already analytics, we need to reset
                             * the selected item to {}. Since we did not find the menu item.
                             *
                             * This is important as there are urls in countly like /versions,
                             * which are not in the sidebar. So for them we don't need to highlight
                             * anything.
                             */
                            this.$store.dispatch("countlySidebar/updateSelectedMenuItem", { menu: "analytics", item: {} });
                        }
                    }
                },
                toggleAppSelection: function() {
                    this.appSelector = !this.appSelector;
                }
            }
        });

        var ManagementMenu = countlyVue.views.create({
            template: CV.T('/javascripts/countly/vue/templates/sidebar/management-menu.html'),
            mixins: [AppsMixin, ValidationMixin],
            computed: {
                menu: function() {
                    if (!this.activeApp || !this.activeApp._id) {
                        return [];
                    }
                    var m = countlyVue.container.dataMixin({
                        menus: "/sidebar/analytics/menu"
                    });

                    var mm = m.data().menus;
                    var self = this;

                    var menu = mm.filter(function(val) {
                        if (val.category === "management" && self.validate(val)) {
                            return true;
                        }

                        return false;
                    });

                    this.$emit("management-menu-ready", menu);
                    return menu;
                },
                selectedMenuItem: function() {
                    var selected = this.$store.getters["countlySidebar/getSelectedMenuItem"];
                    if (selected && selected.menu === "management") {
                        return selected.item;
                    }

                    return {};
                }
            },
            methods: {
                onMenuItemClick: function(item) {
                    this.$store.dispatch("countlySidebar/updateSelectedMenuItem", {menu: "management", item: item});
                },
                identifySelected: function() {
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
                    else {
                        var selected = this.$store.getters["countlySidebar/getSelectedMenuItem"];
                        if (selected.menu === "management") {
                            /**
                             * Incase the selected menu is already management, we need to reset
                             * the selected item to {}. Since we did not find the menu item.
                             *
                             * This is important as there are urls in countly like /versions,
                             * which are not in the sidebar. So for them we don't need to highlight
                             * anything.
                             */
                            this.$store.dispatch("countlySidebar/updateSelectedMenuItem", { menu: "management", item: {} });
                        }
                    }
                }
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
                            },
                            success: function() {
                                window.location.reload(true);
                            },
                            error: function() {
                                //we could output error here
                                window.location.reload(true);
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
                    versionInfo: countlyGlobal.countlyTypeName,
                    showMainMenu: true,
                    redirectHomePage: '/dashboard#/' + countlyCommon.ACTIVE_APP_ID,
                    onOptionsMenu: false,
                    onMainMenu: false,
                    defaultMainMenuOptions: [
                        {
                            name: "app",
                            icon: "cly-icon-sidebar-app",
                            noSelect: true
                        },
                        {
                            name: "analytics",
                            icon: "cly-icon-sidebar-analytics",
                            tooltip: CV.i18n("sidebar.main-menu")
                        },
                        {
                            name: "divider",
                            icon: "cly-icon-sidebar-divider",
                            noSelect: true
                        },
                        {
                            name: "management",
                            icon: "cly-icon-sidebar-management",
                            tooltip: "Management",
                            svg: ""
                        },
                        {
                            name: "last-queries",
                            icon: "cly-icon-sidebar-report-manager",
                            noSelect: true,
                            tooltip: "Report Manager"
                        }
                    ]
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
                    var menuOptions = JSON.parse(JSON.stringify(this.defaultMainMenuOptions));

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
                            name: "help-center",
                            icon: "cly-icon-sidebar-help-center",
                            noSelect: true,
                            tooltip: "Help Center"
                        },
                        {
                            name: "user",
                            noSelect: true,
                            member: this.member,
                            tooltip: CV.i18n("sidebar.my-profile")
                        },
                        {
                            name: "language",
                            noSelect: true,
                            tooltip: "Language"
                        },
                        {
                            name: "toggle",
                            icon: "cly-icon-sidebar-toggle-left",
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
                        var defaultAvatarSelector = (member.created_at || Date.now()) % 10 * -60;
                        var name = member.full_name.split(" ");

                        userImage.found = false;
                        userImage.url = "images/avatar-sprite.png?v2";
                        userImage.position = defaultAvatarSelector;
                        userImage.initials = name[0][0] + name[name.length - 1][0];
                    }

                    member.image = userImage;

                    return member;
                },
                pseudoSelectedMenuOption: function() {
                    var selected = this.$store.getters["countlySidebar/getSelectedMenuItem"];

                    if (!this.selectedMenuOptionLocal && selected) {
                        return selected.menu;
                    }

                    return this.selectedMenuOptionLocal;
                },
                selectedMenuOption: function() {
                    var selected = this.$store.getters["countlySidebar/getSelectedMenuItem"];
                    return selected && selected.menu;
                }
            },
            methods: {
                onClick: function(option) {
                    if (!option.noSelect) {
                        this.selectedMenuOptionLocal = option.name;
                        this.showMainMenu = true;
                    }

                    if (option.name === "toggle") {
                        this.onToggleClick();
                    }
                },
                onToggleClick: function() {
                    this.showMainMenu = !this.showMainMenu;
                },
                identifySelected: function() {
                    for (var ref in this.$refs) {
                        if (Array.isArray(this.$refs[ref])) {
                            for (var i = 0; i < this.$refs[ref].length; i++) {
                                if (this.$refs[ref][i].identifySelected) {
                                    this.$refs[ref][i].identifySelected();
                                }
                            }
                        }
                        else if (this.$refs[ref].identifySelected) {
                            this.$refs[ref].identifySelected();
                        }
                    }

                    this.setDefaultMenu();
                },
                setDefaultMenu: function() {
                    var selected = this.$store.getters["countlySidebar/getSelectedMenuItem"];

                    if (!selected || !selected.menu) {
                        this.$store.dispatch("countlySidebar/updateSelectedMenuItem", {menu: "analytics", item: {}});
                    }

                    if (selected && selected.menu && selected.menu === "dashboards") {
                        /**
                         * If the selected menu in vuex is dashboards, the sidebar should be floating.
                         */
                        this.showMainMenu = false;
                    }
                },
                onOptionsMenuMouseOver: function() {
                    this.onOptionsMenu = true;

                    var selectedOption = this.$store.getters["countlySidebar/getSelectedMenuItem"];

                    if (selectedOption && selectedOption.menu === "dashboards" && !this.showMainMenu) {
                        this.showMainMenu = true;
                    }
                },
                onOptionsMenuMouseLeave: function() {
                    var self = this;
                    this.onOptionsMenu = false;
                    var selectedOption = this.$store.getters["countlySidebar/getSelectedMenuItem"];

                    /**
                     * We don't want to run our side effect in this tick.
                     * We want to check if the user went over the main menu or not.
                     * If he went over it, onMainMenuMouseOver will be triggered either in this tick or next.
                     * In the next tick it will be clear to us whether the user went over the main menu or not.
                     * If it doesn't get triggered in the next two ticks,
                     * we can safely assume that the user is not over the main menu.
                     * And thus hide the main menu.
                     *
                     * We need this handler mainly for the case when the user moves away
                     * from the browser window. Basically the window is small and the user
                     * is moving outside of the window from the left side.
                     * Bcz if he goes to the right side, onMainMenu will be set to true,
                     * and the main menu will still be visible.
                     */
                    this.$nextTick(function() {
                        this.$nextTick(function() {
                            setTimeout(function() {
                                if (selectedOption && selectedOption.menu === "dashboards") {
                                    if (!self.onMainMenu && self.$refs.dashboards && self.$refs.dashboards[0] && !self.$refs.dashboards[0].hasOpenDrawer()) {
                                        0;
                                        /**
                                         * If not on the main menu, hide the main menu.
                                         */
                                        self.showMainMenu = false;
                                    }
                                }
                            }, 0);
                        });
                    });
                },
                onMainMenuMouseOver: function() {
                    this.onMainMenu = true;
                },
                onMainMenuMouseLeave: function() {
                    var self = this;
                    this.onMainMenu = false;
                    var selectedOption = this.$store.getters["countlySidebar/getSelectedMenuItem"];

                    /**
                     * We don't want to run our side effect in this tick.
                     * We want to check if the user went over the options menu or not.
                     * If he went over it, onOptionsMenuMouseOver will be triggered either in this tick or next.
                     * In the next tick it will be clear to us whether the user went over the options menu or not.
                     * If it doesn't get triggered in the next two ticks,
                     * we can safely assume that the user is not over the options menu.
                     * And thus hide the main menu.
                     */
                    this.$nextTick(function() {
                        this.$nextTick(function() {
                            setTimeout(function() {
                                if (selectedOption && selectedOption.menu === "dashboards") {
                                    if (!self.onOptionsMenu && self.$refs.dashboards && self.$refs.dashboards[0] && !self.$refs.dashboards[0].hasOpenDrawer()) {
                                        /**
                                         * If not on the options menu, hide the main menu.
                                         */
                                        self.showMainMenu = false;
                                    }
                                }
                            }, 0);
                        });
                    });
                },
                onManagementMenuReady: function(items) {
                    this.defaultMainMenuOptions = this.defaultMainMenuOptions.map(function(menu) {
                        if (menu.name === "management") {
                            if (items.length) {
                                delete menu.hide;
                            }
                            else {
                                menu.hide = true;
                            }
                        }

                        return menu;
                    });
                }
            },
            mounted: function() {
                var self = this;

                /**
                 * As per official vue documentation for mounted, its likely that refs are not
                 * available immediately. Therefore, they suggest to check for the refs
                 * in the nextTick.
                 *
                 * Following technique of checking refs is just a fullproof way of doing it.
                 */
                setTimeout(function() {
                    self.$nextTick(function() {
                        self.$nextTick(function() {
                            /**
                             * Check if the refs are available.
                             */
                            if (Object.keys(self.$refs).length) {
                                self.identifySelected();
                            }
                            else {
                                /**
                                 * This means that we don't have refs available yet.
                                 * Lets retry to check refs after a interval.
                                 * Clear the interval when the refs are found.
                                 */
                                var counter = 0;
                                var interval = setInterval(function() {
                                    if (counter > 10) {
                                        /**
                                         * Lets only check for the refs 10 times.
                                         * Bcz this could go on forever although not likely.
                                         * If refs are not found until then, the its likely
                                         * that there is some other issue.
                                         * After that lets clear the interval and return.
                                         */

                                        // eslint-disable-next-line no-console
                                        console.log("Refs not found in sidebar yet. Returning...");
                                        clearInterval(interval);
                                        return;
                                    }

                                    if (Object.keys(self.$refs).length) {
                                        self.identifySelected();
                                        clearInterval(interval);
                                    }

                                    counter++;
                                }, 50);
                            }
                        });
                    });
                }, 0);
            }
        });

        app.initSidebar = function() {
            countlyVue.sideBarComponent = new Vue({
                el: $('#sidebar-x').get(0),
                store: countlyVue.vuex.getGlobalStore(),
                components: {
                    Sidebar: SidebarView
                },
                template: '<Sidebar></Sidebar>'
            });
        };

        if (Object.keys(countlyGlobal.apps).length) {
            app.initSidebar();
        }
    });

}(window.countlyVue = window.countlyVue || {}, jQuery));