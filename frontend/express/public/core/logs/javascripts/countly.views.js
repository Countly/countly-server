/*global app, countlyVue, CV*/
(function() {
    var Logs = countlyVue.views.create({
        template: CV.T('/core/logs/templates/logs-main.html'),
        mixins: [
            countlyVue.container.tabsMixin({
                "logsTabs": "/manage/logs"
            })
        ].concat(countlyVue.container.mixins(["/manage/logs"])),
        data: function() {
            return {
                selectedTab: (this.$route.params && this.$route.params.tab)
            };
        },
        computed: {
            tabs: function() {
                return this.logsTabs;
            }
        }
    });
    var getLogsMainView = function() {
        var tabsVuex = countlyVue.container.tabsVuex(["/manage/logs"]);
        return new countlyVue.views.BackboneWrapper({
            component: Logs,
            vuex: tabsVuex,
            templates: []
        });
    };

    app.route("/manage/logs", "logs-tab", function() {
        var ViewWrapper = getLogsMainView();
        var params = {};
        ViewWrapper.params = params;
        this.renderWhenReady(ViewWrapper);
    });

    app.route("/manage/logs/*tab", "logs-tab", function(tab) {
        var ViewWrapper = getLogsMainView();
        var params = {
            tab: tab
        };
        ViewWrapper.params = params;
        this.renderWhenReady(ViewWrapper);
    });

    app.route("/manage/logs/*tab/*query", "logs-tab", function(tab, query) {
        var ViewWrapper = getLogsMainView();
        var params = {
            tab: tab,
            query: query
        };
        ViewWrapper.params = params;
        this.renderWhenReady(ViewWrapper);
    });

    app.addMenu("management", {code: "logs", permission: "core", url: "#/manage/logs", text: "Logs", priority: 50, tabsPath: "/manage/logs"});
})();