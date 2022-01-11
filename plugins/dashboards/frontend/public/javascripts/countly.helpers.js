/*global countlyVue, CV, Vue */

(function() {

    /**
     * DRAWER HELPERS
     */

    var MetricComponent = countlyVue.views.create({
        template: CV.T('/dashboards/templates/helpers/drawer/metric.html'),
        props: {
            dataType: {
                type: String
            },
            multiple: {
                type: Boolean,
                default: false
            },
            multipleLimit: {
                type: Number,
                default: 3
            },
            placeholder: {
                type: String
            },
            value: {
                type: Array
            }
        },
        data: function() {
            return {
                metrics: {
                    session: [
                        { label: this.i18n("sidebar.analytics.sessions"), value: "t" },
                        { label: this.i18n("sidebar.analytics.users"), value: "u" },
                        { label: this.i18n("common.table.new-users"), value: "n" }
                    ],
                    event: [
                        { label: this.i18n("events.table.count"), value: "c" },
                        { label: this.i18n("events.table.sum"), value: "s" },
                        { label: this.i18n("events.table.dur"), value: "dur" }
                    ],
                    push: [
                        { label: this.i18n("dashboards.sent"), value: "sent" },
                        { label: this.i18n("dashboards.actioned"), value: "actioned" }
                    ],
                    crash: [
                        { label: this.i18n("dashboards.crf"), value: "crf" },
                        { label: this.i18n("dashboards.crnf"), value: "crnf" },
                        { label: this.i18n("dashboards.cruf"), value: "cruf" },
                        { label: this.i18n("dashboards.crunf"), value: "crunf" }
                    ]
                }
            };
        },
        computed: {
            selectedMetrics: function() {
                return this.metrics[this.dataType];
            },
            placeholderText: function() {
                if (this.placeholder) {
                    return this.placeholder;
                }

                if (this.multiple) {
                    return this.i18n("placeholder.dashboards.select-metric-multi", this.multipleLimit);
                }
                else {
                    return this.i18n("placeholder.dashboards.select-metric-single");
                }
            },
            val: function() {
                if (!this.multiple) {
                    return this.value && this.value[0] || "";
                }

                return this.value;
            }
        },
        methods: {
            change: function(item) {
                var i = item;

                if (!this.multiple) {
                    i = [item];
                }

                this.$emit("input", i);
            }
        }
    });

    var DataTypeComponent = countlyVue.views.create({
        template: CV.T('/dashboards/templates/helpers/drawer/data-type.html'),
        props: {
            placeholder: {
                type: String
            },
            enabledTypes: {
                type: Array,
                default: function() {
                    return [];
                }
            }
        },
        data: function() {
            return {
                allTypes: [
                    {
                        value: "session",
                        label: this.i18n("dashboards.session")
                    },
                    {
                        value: "event",
                        label: this.i18n("dashboards.event")
                    },
                    {
                        value: "push",
                        label: this.i18n("dashboards.push")
                    },
                    {
                        value: "crash",
                        label: this.i18n("dashboards.crash")
                    },
                ]
            };
        },
        computed: {
            placeholderText: function() {
                if (this.placeholder) {
                    return this.placeholder;
                }
                return this.i18n("placeholder.dashbaords.select-data-type");
            },
            types: function() {
                var self = this;
                var result = this.allTypes.filter(function(item) {
                    return self.enabledTypes.some(function(enabledItem) {
                        return enabledItem === item.value;
                    });
                });
                return result;
            }
        }
    });

    var AppCountComponent = countlyVue.views.create({
        template: CV.T('/dashboards/templates/helpers/drawer/app-count.html'),
        props: {
            apps: {
                type: Array,
                default: []
            }
        },
        data: function() {
            return {
                count: null
            };
        },
        computed: {
            appCount: {
                get: function() {
                    return this.count;
                },
                set: function(v) {
                    this.count = v;
                    this.$emit('app-count', v);
                }
            }
        }
    });

    /**
     * Source app component returns the selected apps in an array even if single app is selected
     */
    var SourceAppsComponent = countlyVue.views.create({
        template: CV.T('/dashboards/templates/helpers/drawer/source-apps.html'),
        props: {
            multiple: {
                type: Boolean,
                default: false
            },
            multipleLimit: {
                type: Number,
                default: 4
            },
            placeholder: {
                type: String
            },
            value: {
                type: Array
            }
        },
        data: function() {
            return {};
        },
        computed: {
            placeholderText: function() {
                if (this.placeholder) {
                    return this.placeholder;
                }

                if (this.multiple) {
                    return this.i18n("placeholder.dashboards.select-applications-multi", this.multipleLimit);
                }
                else {
                    return this.i18n("placeholder.dashboards.select-applications-single");
                }
            },
            selectedApps: {
                get: function() {
                    if (!this.multiple) {
                        return this.value && this.value[0] || "";
                    }

                    return this.value;
                },
                set: function(item) {
                    var i = item;
                    if (!this.multiple) {
                        i = [item];
                    }

                    this.$emit("input", i);
                }
            }
        }
    });

    var VisualizationComponent = countlyVue.views.create({
        template: CV.T('/dashboards/templates/helpers/drawer/visualization.html'),
        props: {
            extraTypes: {
                type: Array,
                default: function() {
                    return [];
                }
            },
            enabledTypes: {
                type: Array,
                default: null
            },
            value: String
        },
        data: function() {
            return {
                types: [
                    {
                        value: "time-series",
                        label: this.i18n("dashboards.visualization.time-series")
                    },
                    {
                        value: "bar-chart",
                        label: this.i18n("dashboards.visualization.bar-chart")
                    },
                    {
                        value: "number",
                        label: this.i18n("dashboards.visualization.number")
                    },
                    {
                        value: "table",
                        label: this.i18n("dashboards.visualization.table")
                    },
                ]
            };
        },
        computed: {
            visualizationTypes: function() {
                var fullList = this.types.concat(this.extraTypes);
                fullList.sort(function(a, b) {
                    return (a.priority || 0) - (b.priority || 0);
                });
                if (this.enabledTypes) {
                    var self = this;
                    return fullList.filter(function(item) {
                        return self.enabledTypes.includes(item.value);
                    });
                }
                return fullList;
            },
            selectedType: function() {
                return this.value;
            },
            isSelected: function() {
                return this.selectedType ? true : false;
            }
        },
        methods: {
            onClick: function(item) {
                this.$emit("input", item.value);
            }
        }
    });

    var TitleComponent = countlyVue.views.create({
        template: CV.T('/dashboards/templates/helpers/drawer/title.html'),
        props: {
            value: {type: String}
        },
        data: function() {
            return {
                titleCheckbox: null
            };
        },
        computed: {
            title: {
                get: function() {
                    return this.value;
                },
                set: function(t) {
                    this.$emit("input", t);
                }
            },
            checkbox: {
                get: function() {
                    if (this.titleCheckbox !== null) {
                        return this.titleCheckbox;
                    }

                    if (this.value && this.value.length) {
                        return true;
                    }

                    return false;
                },
                set: function(v) {
                    if (v === false && this.value && this.value.length) {
                        this.$emit("input", "");
                    }

                    this.titleCheckbox = v;
                }
            }
        }
    });

    /**
     * WIDGET HELPERS
     */

    var BucketComponent = countlyVue.views.create({
        template: CV.T('/dashboards/templates/helpers/widget/bucket.html'),
        props: {
            widgetId: {type: String, required: true},
            value: {type: String, required: true}
        },
        data: function() {
            return {
                allBuckets: [
                    {
                        value: "daily",
                        label: this.i18nM("drill.daily")
                    },
                    {
                        value: "weekly",
                        label: this.i18nM("drill.weekly")
                    },
                    {
                        value: "monthly",
                        label: this.i18nM("drill.monthly")
                    }
                ]
            };
        },
        computed: {
            val: function() {
                return this.value;
            }
        },
        methods: {
            onChange: function(b) {
                var self = this;
                this.$store.dispatch("countlyDashboards/widgets/update", {id: this.widgetId, settings: {"bucket": b}}).then(function() {
                    self.$store.dispatch("countlyDashboards/widgets/get", self.widgetId);
                });

                this.$emit("input", b);
            }
        }
    });

    // var AppsMixin = {
    //     methods: {
    //         getAppname: function(appId) {
    //             var selected = this.$store.getters["countlyDashboards/selected"];
    //             var dash = selected.data || {};

    //             var dashboardApps = dash.apps || [];

    //             var appName = "Unknown";

    //             var appObj = dashboardApps.find(function(app) {
    //                 return app._id === appId;
    //             });

    //             if (appObj && appObj.name) {
    //                 appName = appObj.name;
    //             }
    //             else if (countlyGlobal.apps[appId]) {
    //                 appName = countlyGlobal.apps[appId].name;
    //             }

    //             return appName;
    //         }
    //     }
    // };

    /**
     * DRAWER HELPERS REGISTRATION
     */
    Vue.component("clyd-metric", MetricComponent);
    Vue.component("clyd-datatype", DataTypeComponent);
    Vue.component("clyd-appcount", AppCountComponent);
    Vue.component("clyd-sourceapps", SourceAppsComponent);
    Vue.component("clyd-visualization", VisualizationComponent);
    Vue.component("clyd-title", TitleComponent);

    /**
     * WIDGET HELPERS REGISTRATION
     */
    Vue.component("clyd-bucket", BucketComponent);

})();