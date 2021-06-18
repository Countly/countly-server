/* global app, jQuery, CV, Vue, countlyGlobal, _, setTimeout*/

(function(countlyVue, $) {


    $(document).ready(function() {

        var SidebarView = countlyVue.views.create({
            template: CV.T('/javascripts/countly/vue/templates/sidebar.html'),
            mixins: [
                countlyVue.container.dataMixin({
                    "categories": "/sidebar/menuCategory",
                    "menus": "/sidebar/menu",
                    "submenus": "/sidebar/submenu"
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
                    appSelect: {
                        selected: this.$store.state.countlyCommon.activeApp._id,
                        mode: 'single-list',
                    },
                    allApps: apps,
                };
            },
            computed: {
                activeApp: function() {
                    var self = this;
                    var active = this.allApps.find(function(a) {
                        return a._id === self.appSelect.selected;
                    });

                    return active;
                },
                categorizedMenus: function() {
                    if (!this.activeApp) {
                        return {};
                    }
                    var self = this;
                    return this.menus.reduce(function(acc, val) {
                        if (val.app_type === self.activeApp.type) {
                            (acc[val.category] = acc[val.category] || []).push(val);
                        }
                        return acc;
                    }, {});
                },
                categorizedSubmenus: function() {
                    if (!this.activeApp) {
                        return {};
                    }
                    var self = this;
                    return this.submenus.reduce(function(acc, val) {
                        if (val.app_type === self.activeApp.type) {
                            (acc[val.parent_code] = acc[val.parent_code] || []).push(val);
                        }
                        return acc;
                    }, {});
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
                        setTimeout(function() {
                            window.location.reload();
                        }, 1000);
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
