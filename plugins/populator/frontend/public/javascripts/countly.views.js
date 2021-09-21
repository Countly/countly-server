/* global app, countlyAuth, countlyVue, countlyPopulator, $ */

(function() {
    var PopulatorView = countlyVue.views.create({
        template: countlyVue.T("/populator/templates/populator.html"),
        data: function() {
            return {
                currentTab: "data-populator"
            };
        },
        computed: {
            templates: function() {
                return this.$store.getters["countlyPopulator/templates"];
            },
        },
        methods: {
            newTemplate: function() {
                this.openDrawer("populatorTemplate", {});
            },
            refresh: function() {
                return this.$store.dispatch("countlyPopulator/refresh", true);
            },
            changeTemplate: function(command, template) {
                if (command === "edit") {
                    this.openDrawer("populatorTemplate", template);
                }
                else if (command === "delete") {
                    this.$store.dispatch("countlyPopulator/removeTemplate", template._id);
                }
                else if (command === "duplicate") {
                    this.openDrawer("populatorTemplate", template);
                }
            }
        },
        beforeCreate: function() {
            return this.$store.dispatch("countlyPopulator/initialize");
        },
        mixins: [countlyVue.mixins.hasDrawers("populatorTemplate")]
    });

    var getPopulatorView = function() {
        return new countlyVue.views.BackboneWrapper({
            component: PopulatorView,
            vuex: [{clyModel: countlyPopulator}],
        });
    };

    app.route("/manage/populate*state", "populate", function(state) {
        if (countlyAuth.validateRead("populator")) {
            this.renderWhenReady(getPopulatorView());
        }
        else {
            app.navigate("/", true);
        }
    });

    $(document).ready(function() {
        if (countlyAuth.validateRead("populator")) {
            app.addSubMenu("management", {code: "populate", url: "#/manage/populate", text: "populator.title", priority: 70, classes: "populator-menu"});
        }
    });
})();