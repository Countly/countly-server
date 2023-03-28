/* global jQuery,CountlyHelpers,countlyVue, CV,Vue, countlyCommon,countlyGlobal, app,countlyHomeView*/


var HomeWidgetTitleComponent = countlyVue.views.create({
    template: CV.T('/core/home/templates/widgetTitle.html'),
    props: {
        widget: {
            type: Object,
            default: function() {
                return {};
            }
        }
    }
});

Vue.component("clyd-home-widget-header", HomeWidgetTitleComponent);

var HomeViewView = countlyVue.views.create({
    template: CV.T("/core/home/templates/home.html"),
    data: function() {
        return {
            description: CV.i18n('dashboard.home-desc'),
            allComponents: [],
            topComponents: [],
            componentSelector: [],
            showComponentSelector: true,
            selectedDynamicComponents: [],
            selectedText: "",
            registredComponents: {},
            ordered: [],
            isLoading: true
        };
    },
    mounted: function() {
        this.loadAllWidgets();
    },
    methods: {
        refresh: function() {
            this.loadAllWidgets();
        },

        loadAllWidgets: function() {
            var userSettings = {};
            if (countlyGlobal && countlyGlobal.member && countlyGlobal.member.homeSettings && countlyCommon.ACTIVE_APP_ID) {
                userSettings = countlyGlobal.member.homeSettings[countlyCommon.ACTIVE_APP_ID] || {};
            }
            var cc = countlyVue.container.dataMixin({
                'homeComponents': '/home/widgets'
            });
            cc = cc.data();
            var allComponents = cc.homeComponents; //all components

            var appType = "";
            if (countlyGlobal && countlyGlobal.apps && countlyCommon.ACTIVE_APP_ID && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID]) {
                appType = countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type;
            }

            for (var k = 0; k < allComponents.length; k++) {
                var available = false;
                if (allComponents[k].available) {
                    available = allComponents[k].available.default || false;
                    if (typeof allComponents[k].available[appType] !== 'undefined') {
                        available = allComponents[k].available[appType];
                    }
                }
                if (available) {
                    var enabled = false;
                    var order = allComponents[k].order || 0;
                    if (allComponents[k].enabled) {
                        enabled = allComponents[k].enabled.default || false;
                        if (typeof allComponents[k].enabled[appType] !== 'undefined') {
                            enabled = allComponents[k].enabled[appType];
                        }
                    }

                    if (typeof userSettings[allComponents[k]._id] !== "undefined") {
                        enabled = userSettings[allComponents[k]._id].enabled || false;
                        if (typeof userSettings[allComponents[k]._id].order !== "undefined") {
                            order = userSettings[allComponents[k]._id].order;
                        }
                    }

                    if (!this.registredComponents[allComponents[k]._id]) {

                        if (enabled && !allComponents[k].placeBeforeDatePicker && this.selectedDynamicComponents.indexOf(allComponents[k]._id) === -1) {
                            this.selectedDynamicComponents.push(allComponents[k]._id);//add as selected
                        }
                        this.registredComponents[allComponents[k]._id] = {"hide_header": allComponents[k].hide_header || false, "width": allComponents[k].width, "enabled": enabled, _id: allComponents[k]._id, "label": allComponents[k].label, "description": allComponents[k].description, "order": allComponents[k].order, "placeBeforeDatePicker": allComponents[k].placeBeforeDatePicker, "component": allComponents[k].component, "linkTo": allComponents[k].linkTo};
                        if (this.registredComponents[allComponents[k]._id].placeBeforeDatePicker) {
                            if (this.topComponents.length === 0) {
                                this.topComponents.push(this.registredComponents[allComponents[k]._id]);
                            }
                            else {
                                var placeAt = 0;
                                for (var zz = this.topComponents.length; zz > 0; zz--) {
                                    if (this.topComponents[zz - 1].order < allComponents[k].order) {
                                        placeAt = zz;
                                        break;
                                    }

                                }
                                this.topComponents.splice(placeAt, 0, this.registredComponents[allComponents[k]._id]);
                            }
                        }
                    }
                    this.registredComponents[allComponents[k]._id].enabled = enabled;
                    this.registredComponents[allComponents[k]._id].order = order;
                }

            }

            this.calculatePlacedComponents();
            this.isLoading = false;

        },
        calculatePlacedComponents: function() {
            this.componentSelector = [];
            this.allComponents = [];
            var forOrdering = [];

            for (var k in this.registredComponents) {
                if (!this.registredComponents[k].placeBeforeDatePicker) {
                    this.componentSelector.push({"fixed": this.registredComponents[k].placeBeforeDatePicker, "value": this.registredComponents[k]._id, label: CV.i18n(this.registredComponents[k].label), "order": this.registredComponents[k].order});
                }
                if (this.registredComponents[k].enabled) {
                    if (!this.registredComponents[k].placeBeforeDatePicker) {
                        forOrdering.push({"_id": k, "size": this.registredComponents[k].width || 12, "order": this.registredComponents[k].order});
                    }
                }
            }
            this.componentSelector = this.componentSelector.sort(function(a, b) {
                return a.order - b.order;
            });
            forOrdering = forOrdering.sort(function(a, b) {
                return a.order - b.order;
            });

            for (var z = 0; z < forOrdering.length; z++) {
                if (forOrdering[z].size && forOrdering[z].size === 6) {
                    if (z + 1 < forOrdering.length && forOrdering[z + 1].size === 6) {
                        forOrdering[z].classes = "bu-pr-1";
                        forOrdering[z + 1].classes = "bu-pl-3";
                        forOrdering[z] = {"itemgroup": true, data: [forOrdering[z], forOrdering[z + 1]] };
                        forOrdering.splice(z + 1, 1);
                    }
                }
                else {
                    forOrdering[z].classes = "";
                }
                if (z === 0) {
                    forOrdering[z].topGapClasses = "bu-pt-4";
                }
                else {
                    forOrdering[z].topGapClasses = "bu-pt-5 bu-mt-3";
                }
            }


            var not_changed = true;
            if (this.ordered.length === forOrdering.length) {
                for (var z1 = 0; z1 < forOrdering.length; z1++) {
                    if (forOrdering[z1]._id !== this.ordered[z1]._id) {
                        not_changed = false;
                    }
                }
            }
            else {
                not_changed = false;
            }

            if (!not_changed) {

                this.ordered = [];
                var self = this;
                setTimeout(function() {
                    self.ordered = forOrdering;
                }, 1000);
            }

            if (this.componentSelector.length > 0) {
                this.showComponentSelector = true;
            }
            else {
                this.showComponentSelector = false;
            }
        },
        setSelectedComponents: function(values) {
            //save for users
            var userSettings = {};
            var self = this;
            for (var k in this.registredComponents) {
                if (this.registredComponents[k].placeBeforeDatePicker === true) {
                    userSettings[k] = {"enabled": true};
                }
                else if (values.indexOf(k) === -1) {
                    userSettings[k] = {"enabled": false};
                    this.registredComponents[k].enabled = false;
                }
                else {
                    userSettings[k] = {"enabled": true, "order": values.indexOf(k)};
                    this.registredComponents[k].enabled = true;
                    this.registredComponents[k].order = values.indexOf(k);
                }
            }
            countlyGlobal.member.homeSettings = countlyGlobal.member.homeSettings || {};
            countlyGlobal.member.homeSettings[countlyCommon.ACTIVE_APP_ID] = userSettings;

            this.$store.dispatch('countlyHomeView/updateHomeView', userSettings).then(function() {
                if (self.$store.state.countlyHomeView.updateError) {
                    CountlyHelpers.notify({type: "error", title: jQuery.i18n.map["common.error"], message: jQuery.i18n.map["common.error"], sticky: false, clearAll: true});
                }
                else {
                    CountlyHelpers.notify({type: "ok", title: jQuery.i18n.map["common.success"], message: jQuery.i18n.map["events.general.changes-saved"], sticky: false, clearAll: true});
                }
            });

            this.calculatePlacedComponents();
        },
        selected: function(command) {
            if (command === "download") {
                var self = this;
                CountlyHelpers.notify({type: "ok", title: jQuery.i18n.map["common.success"], message: "Starting the image generation process. You will be notified when it is ready. Please do not leave the website while the process is running.", sticky: true, clearAll: true});
                this.$store.dispatch("countlyHomeView/downloadScreen").then(function() {
                    if (self.$store.state.countlyHomeView.image) {
                        CountlyHelpers.notify({type: "ok", title: jQuery.i18n.map["common.success"], message: "<a href='" + self.$store.state.countlyHomeView.image + "'>Download</a>", sticky: true, clearAll: true});
                    }
                    else {
                        CountlyHelpers.notify({type: "error", title: jQuery.i18n.map["common.success"], message: "ERROR", sticky: false, clearAll: true});
                    }
                });
            }
        }
    },
    computed: {

    },
    mixins: [
        countlyVue.container.dataMixin({
            'homeComponents': '/home/widgets'
        })
    ]
});


var HomeView = new countlyVue.views.BackboneWrapper({
    component: HomeViewView,
    vuex: [{clyModel: countlyHomeView}]
});


app.HomeView = HomeView;


app.route("/home", "home", function() {
    var params = {};
    this.HomeView.params = params;
    this.renderWhenReady(this.HomeView);
});
