/* global jQuery, CV, Vue*/

(function(countlyVue, $) {


    $(document).ready(function() {

        var SidebarView = countlyVue.views.create({
            template: CV.T('/javascripts/countly/vue/templates/sidebar.html'),
            mixins: [
                countlyVue.container.mixin({
                    "categories": "/sidebar/menuCategory",
                    "menus": "/sidebar/menu",
                    "submenus": "/sidebar/submenu"
                })
            ],
            computed: {
                categorizedMenus: function() {
                    return this.menus.reduce(function(acc, val) {
                        (acc[val.category] = acc[val.category] || []).push(val);
                        return acc;
                    }, {});
                },
                categorizedSubmenus: function() {
                    return this.submenus.reduce(function(acc, val) {
                        (acc[val.parent_code] = acc[val.parent_code] || []).push(val);
                        return acc;
                    }, {});
                }
            }
        });

        new Vue({
            el: $('#sidebar-vue').get(0),
            store: countlyVue.vuex.getGlobalStore(),
            components: {
                Sidebar: SidebarView
            },
            template: '<div><Sidebar></Sidebar></div>'
        });
    });

}(window.countlyVue = window.countlyVue || {}, jQuery));
