/* globals app, countlyCommon, countlyCrashes, countlyVue */

(function() {
    var CrashOverviewView = countlyVue.views.BaseView.extend({
        template: "#crashes-overview",
        computed: {
            crashStatistics: function() {
                return this.$store.getters["countlyCrashes/overview/crashStatistics"];
            }
        },
        data: function() {
            return {
                appId: countlyCommon.ACTIVE_APP_ID,
                currentTab: (this.$route.params && this.$route.params.tab) || "crash-groups"
            };
        }
    });

    var getOverviewView = function() {
        return new countlyVue.views.BackboneWrapper({
            component: CrashOverviewView,
            vuex: [{clyModel: countlyCrashes}],
            templates: [
                {
                    namespace: "crashes",
                    mapping: {
                        overview: "crashes-vue/templates/overview.html"
                    }
                }
            ]
        });
    };

    app.route("/crashes", "crashes", function() {
        this.renderWhenReady(getOverviewView());
    });
})();