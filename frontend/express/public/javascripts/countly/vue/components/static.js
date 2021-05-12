/* global jQuery, CV, Vue*/

(function(countlyVue, $) {

    var SidebarView = countlyVue.views.create({
        template: CV.T('/javascripts/countly/vue/templates/sidebar.html')
    });

    new Vue({
        el: $('#sidebar-vue').get(0),
        store: countlyVue.vuex.getGlobalStore(),
        components: {
            Sidebar: SidebarView
        },
        template: '<div><Sidebar></Sidebar></div>'
    });

}(window.countlyVue = window.countlyVue || {}, jQuery));
