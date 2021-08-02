/* global app, jQuery, CV, Vue, countlyGlobal, _, Backbone*/

(function(countlyVue, $) {

    $(document).ready(function() {

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
            data: function() {
                var apps = _.sortBy(countlyGlobal.apps, function(app) {
                    return (app.name + "").toLowerCase();
                });

                apps = apps.map(function(a) {
                    a.label = a.name;
                    a.value = a._id;

                    return a;
                });

                return {
                    allApps: apps,
                    selectMode: "single-list",
                    selectedAppLocal: null,
                    selectedAnalyticsMenuLocal: null
                };
            },
            computed: {
                selectedApp: {
                    get: function() {
                        var activeApp = this.$store.getters["countlyCommon/getActiveApp"];

                        if (!this.selectedAppLocal) {
                            if (!activeApp) {
                                // eslint-disable-next-line no-undef
                                // console.log("sidebar:: active app not set");
                            }

                            this.selectedAppLocal = activeApp && activeApp._id;
                        }

                        return this.selectedAppLocal;
                    },
                    set: function(id) {
                        this.selectedAppLocal = id;
                    }
                },
                activeApp: function() {
                    var selectedAppId = this.selectedApp;
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

                    if (selected.menu === "analytics") {
                        return selected.item;
                    }

                    return {};
                },
                selectedAnalyticsMenu: {
                    get: function() {
                        var selectedAnalyticsMenu = this.selectedMenuItem;

                        if (!this.selectedAnalyticsMenuLocal) {
                            return selectedAnalyticsMenu.parent_code;
                        }

                        return this.selectedAnalyticsMenuLocal;
                    },
                    set: function(m) {
                        this.selectedAnalyticsMenuLocal = m;
                    }
                }
            },
            methods: {
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
                },
                suffixIconClass: function(dropdown) {
                    return (dropdown.visible ? 'arrow-up is-reverse' : 'arrow-up');
                },
                onMenuItemClick: function(item) {
                    this.$store.dispatch("countlySidebar/updateSelectedMenuItem", {menu: "analytics", item: item});
                }
            },
            mounted: function() {
                var currLink = Backbone.history.fragment;

                if (/^\/custom/.test(currLink) === true) {
                    return;
                }

                var menus = this.categorizedMenus;
                var submenus = this.categorizedSubmenus;
                var foundMenu = false;
                var currMenu = {};
                var menu;

                for (var k in menus) {
                    for (var i = 0; i < menus[k].length; i++) {
                        menu = menus[k][i];
                        if (menu.url === "#" + currLink) {
                            foundMenu = true;
                            currMenu = menu;
                            break;
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
                        }

                        if (foundMenu) {
                            break;
                        }
                    }
                }

                if (foundMenu) {
                    this.$store.dispatch("countlySidebar/updateSelectedMenuItem", {menu: "analytics", item: currMenu});
                }
                else {
                    // eslint-disable-next-line no-console
                    console.log("Analytics menu not found. ", currLink, menus, submenus);
                }
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

                    if (selected.menu === "management") {
                        return selected.item;
                    }

                    return {};
                }
            },
            methods: {
                onMenuItemClick: function(item) {
                    this.$store.dispatch("countlySidebar/updateSelectedMenuItem", {menu: "management", item: item});
                }
            },
            mounted: function() {
                var currLink = Backbone.history.fragment;

                if (/^\/custom/.test(currLink) === true) {
                    return;
                }

                var menu = this.menu;
                var currMenu = menu.filter(function(m) {
                    return m.url === "#" + currLink;
                });

                if (currMenu.length) {
                    this.$store.dispatch("countlySidebar/updateSelectedMenuItem", {menu: "management", item: currMenu[0]});
                }
                else {
                    // eslint-disable-next-line no-console
                    console.log("Management menu not found. ", currLink, menu);
                }
            }
        });

        var SidebarView = countlyVue.views.create({
            template: CV.T('/javascripts/countly/vue/templates/sidebar/sidebar.html'),
            mixins: [
                countlyVue.container.dataMixin({
                    "externalMainOptions": "/sidebar/options/main",
                    "externalOtherOptions": "/sidebar/options/other"
                })
            ],
            components: {
                "users-menu": UsersMenu,
                "analytics-menu": AnalyticsMenu,
                "management-menu": ManagementMenu
            },
            data: function() {
                return {
                    selectedOptionLocal: null
                };
            },
            computed: {
                components: function() {
                    var options = [];

                    var externalMainOptions = this.externalMainOptions;
                    var externalOtherOptions = this.externalOtherOptions;

                    if (externalMainOptions && externalMainOptions.length) {
                        options = options.concat(externalMainOptions);
                    }

                    if (externalOtherOptions && externalOtherOptions.length) {
                        options = options.concat(externalOtherOptions);
                    }

                    return options;
                },
                mainOptions: function() {
                    var options = [
                        {
                            name: "app",
                            noSelect: true
                        },
                        {
                            name: "search",
                            icon: "ion-ios-search-strong"
                        },
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
                            icon: "ion-wrench"
                        }
                    ];

                    var externalMainOptions = this.externalMainOptions;

                    if (externalMainOptions && externalMainOptions.length) {
                        for (var i = 0; i < externalMainOptions.length; i++) {
                            options.splice(3, 0, externalMainOptions[i]);
                        }
                    }

                    return options;
                },
                otherOptions: function() {
                    var options = [
                        {
                            name: "clipboard",
                            icon: "ion-clipboard",
                            noSelect: true
                        },
                        {
                            name: "notifications",
                            icon: "ion-android-notifications",
                            noSelect: true
                        },
                        {
                            name: "user",
                            icon: "ion-person",
                            noSelect: true,
                            member: this.member
                        },
                        {
                            name: "toggle",
                            icon: "ion-chevron-left",
                            noSelect: true
                        }
                    ];

                    var externalOtherOptions = this.externalOtherOptions;

                    if (externalOtherOptions && externalOtherOptions.length) {
                        for (var i = 0; i < externalOtherOptions.length; i++) {
                            options.splice(3, 0, externalOtherOptions[i]);
                        }
                    }

                    return options;
                },
                member: function() {
                    //We should fetch the user from vuex
                    //So that updates are reactive

                    var userImage = {};
                    var member = JSON.parse(JSON.stringify(countlyGlobal.member));
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
                selectedOption: function() {
                    var selected = this.$store.getters["countlySidebar/getSelectedMenuItem"];
                    if (!this.selectedOptionLocal) {
                        return selected.menu;
                    }

                    return this.selectedOptionLocal;
                }
            },
            methods: {
                onClick: function(option) {
                    if (!option.noSelect) {
                        this.selectedOptionLocal = option.name;
                    }
                }
            }
        });

        new Vue({
            el: $('#sidebar-x').get(0),
            store: countlyVue.vuex.getGlobalStore(),
            components: {
                Sidebar: SidebarView
            },
            template: '<Sidebar></Sidebar>'
        });
    });

}(window.countlyVue = window.countlyVue || {}, jQuery));
