/*global countlyVue, CV, Vue, countlyCommon, countlyGlobal, countlyDashboards */

(function() {

    /**
     * DRAWER HELPERS
     */

    var MetricComponent = countlyVue.views.create({
        template: CV.T('/dashboards/templates/helpers/drawer/metric.html'),
        props: {
            metrics: {
                type: Array,
                default: function() {
                    return [];
                }
            },
            multipleLimit: {
                type: Number,
                default: 3
            },
            placeholder: {
                type: String
            },
            value: {
                type: Array,
                required: true,
                default: function() {
                    return [];
                }
            },
            multiple: {
                type: Boolean,
                default: false
            }
        },
        data: function() {
            return {
                rerender: "_id_" + this.multiple
            };
        },
        computed: {
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
            selectedMetrics: {
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
            },
            allListeners: function() {
                return Object.assign({},
                    this.$listeners,
                    {
                        input: function() {
                            /**
                             * Overwrite the input listener passed from parent,
                             * Since all parent listeners are passed to the children,
                             * we want to overwrite this input listener so that the value
                             * is not updated in the parent directly from the children.
                             * We want to intercept the child value and return as array to parent
                             * with the help of the selectedApps computed property
                             */
                        }
                    }
                );
            }
        },
        watch: {
            multiple: {
                handler: function(newVal, oldVal) {
                    /**
                     * Everytime multiple changes we want to reset the selected value of
                     * the component because the value depends on the multiple value.
                     *
                     * We also want to rerender the component to update the selected value.
                     * We want to do this because el-select has a bug where even if the model
                     * value changes, the input value is not updated.
                     */
                    if (newVal !== oldVal) {
                        this.rerender = "_id_" + this.multiple;
                        this.$emit("input", []);
                    }
                }
            }
        }
    });

    var BreakdownComponent = countlyVue.views.create({
        template: CV.T('/dashboards/templates/helpers/drawer/breakdown.html'),
        props: {
            appId: {
                type: String,
                default: ""
            },
            type: {
                type: String,
                validator: function(value) {
                    return (["session", "events", "user-analytics"].indexOf(value) > -1) ? true : false;
                },
                required: true
            },
            value: {
                type: Array,
                required: true,
                default: function() {
                    return [];
                }
            },
            event: {
                type: String,
                default: ""
            }
        },
        data: function() {
            return {
                store: null
            };
        },
        computed: {
            breakdowns: function() {
                var breakdowns = [];
                var event = this.event;
                var appId = this.appId;

                switch (this.type) {
                case "session":

                    var app = countlyGlobal.apps[appId];

                    if (app && app.type) {

                        breakdowns.push(
                            { label: "Countries", value: "countries"},
                            { label: "Devices", value: "devices"},
                            { label: "App Versions", value: "versions"},
                            { label: "Platforms", value: "platforms"}
                        );

                        switch (app.type) {
                        case "web":

                            breakdowns.push({ label: "Resolutions", value: "resolutions"});

                            if (typeof countlyDensity !== "undefined") {
                                breakdowns.push({ label: "Densities", value: "density"});
                            }

                            if (typeof countlyBrowser !== "undefined") {
                                breakdowns.push({ label: "Browsers", value: "browser"});
                            }

                            if (typeof countlyLanguage !== "undefined") {
                                breakdowns.push({ label: "Languages", value: "langs"});
                            }

                            if (typeof countlySources !== "undefined") {
                                breakdowns.push({ label: "Sources", value: "sources"});
                            }

                            break;
                        case "mobile":

                            breakdowns.push({ label: "Carriers", value: "carriers"});
                            breakdowns.push({ label: "Resolutions", value: "resolutions"});

                            if (typeof countlyDensity !== "undefined") {
                                breakdowns.push({ label: "Densities", value: "density"});
                            }

                            if (typeof countlyLanguage !== "undefined") {
                                breakdowns.push({ label: "Languages", value: "langs"});
                            }

                            if (typeof countlySources !== "undefined") {
                                breakdowns.push({ label: "Sources", value: "sources"});
                            }

                            break;
                        case "desktop":

                            breakdowns.push({ label: "Resolutions", value: "resolutions"});

                            if (typeof countlyDensity !== "undefined") {
                                breakdowns.push({ label: "Densities", value: "density"});
                            }

                            if (typeof countlyLanguage !== "undefined") {
                                breakdowns.push({ label: "Languages", value: "langs"});
                            }

                            break;
                        }
                    }

                    break;
                case "events":
                    if (event && event.length) {
                        var eventKey = event.split(countlyDashboards.factory.events.separator)[1];
                        appId = event.split(countlyDashboards.factory.events.separator)[0];

                        var allSegments = this.store.getters["countlyDashboards/allSegments"]([appId]);

                        var eventSegments = allSegments[eventKey] || [];

                        if (eventSegments && eventSegments.length) {
                            for (var i = 0; i < eventSegments.length; i++) {
                                if (eventSegments[i]) {
                                    breakdowns.push({
                                        value: eventSegments[i],
                                        name: eventSegments[i]
                                    });
                                }
                            }
                        }
                    }

                    break;
                case "user-analytics":
                    breakdowns.push({ label: this.i18n("user-analytics.overview-title"), value: "overview"});

                    if (countlyGlobal.plugins && countlyGlobal.plugins.indexOf("active_users") > -1) {
                        breakdowns.push({ label: this.i18n("active_users.title"), value: "active"});
                    }
                    if (countlyGlobal.plugins && countlyGlobal.plugins.indexOf("concurrent_users") > -1) {
                        breakdowns.push({ label: this.i18n("concurrent-users.title"), value: "online"});
                    }


                    break;
                }

                return breakdowns;
            },
            selectedBreakdown: {
                get: function() {
                    return this.value && this.value[0] || "";
                },
                set: function(item) {
                    var i = [item];
                    this.$emit("input", i);
                }
            },
            allListeners: function() {
                return Object.assign({},
                    this.$listeners,
                    {
                        input: function() {
                            /**
                             * Overwrite the input listener passed from parent,
                             * Since all parent listeners are passed to the children,
                             * we want to overwrite this input listener so that the value
                             * is not updated in the parent directly from the children.
                             * We want to intercept the child value and return as array to parent
                             * with the help of the selectedApps computed property
                             */
                        }
                    }
                );
            }
        },
        watch: {
            event: {
                immediate: true,
                handler: function(newVal) {
                    var event = newVal;

                    if (this.type !== "events") {
                        return;
                    }

                    if (this.store && event && event.length) {
                        var appId = event.split(countlyDashboards.factory.events.separator)[0];

                        this.store.dispatch("countlyDashboards/getEvents", {appIds: [appId]});
                    }

                    this.$emit("input", []);
                }
            }
        },
        beforeMount: function() {
            this.store = countlyVue.vuex.getGlobalStore();
        }
    });

    var EventComponent = countlyVue.views.create({
        template: CV.T('/dashboards/templates/helpers/drawer/events.html'),
        props: {
            appIds: {
                type: Array,
                default: function() {
                    return [];
                }
            },
            multipleLimit: {
                type: Number,
                default: 3
            },
            placeholder: {
                type: String
            },
            value: {
                type: Array,
                required: true,
                default: function() {
                    return [];
                }
            },
            multiple: {
                type: Boolean,
                default: false
            }
        },
        data: function() {
            return {
                store: null,
                rerender: "_id_" + this.multiple + "_" + this.appIds
            };
        },
        computed: {
            placeholderText: function() {
                if (this.placeholder) {
                    return this.placeholder;
                }

                if (this.multiple) {
                    return this.i18n("placeholder.dashboards.select-event-multi", this.multipleLimit);
                }
                else {
                    return this.i18n("placeholder.dashboards.select-event-single");
                }
            },
            allEvents: function() {
                var appIds = this.appIds;
                return this.store.getters["countlyDashboards/allEvents"](appIds);
            },
            selectedEvents: {
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
            },
            allListeners: function() {
                return Object.assign({},
                    this.$listeners,
                    {
                        input: function() {
                            /**
                             * Overwrite the input listener passed from parent,
                             * Since all parent listeners are passed to the children,
                             * we want to overwrite this input listener so that the value
                             * is not updated in the parent directly from the children.
                             * We want to intercept the child value and return as array to parent
                             * with the help of the selectedApps computed property
                             */
                        }
                    }
                );
            }
        },
        watch: {
            appIds: {
                immediate: true,
                handler: function(newVal) {
                    var appIds = newVal;

                    if (this.store && Array.isArray(appIds) && appIds.length) {
                        this.store.dispatch("countlyDashboards/getEvents", {appIds: appIds});
                    }

                    this.rerender = "_id_" + this.multiple + "_" + this.appIds;
                    this.$emit("input", []);
                }
            },
            multiple: {
                handler: function(newVal, oldVal) {
                    /**
                     * Everytime multiple changes we want to reset the selected value of
                     * the component because the value depends on the multiple value and appIds.
                     *
                     * We also want to rerender the component to update the selected value.
                     * We want to do this because el-select has a bug where even if the model
                     * value changes, the input value is not updated.
                     */
                    if (newVal !== oldVal) {
                        this.rerender = "_id_" + this.multiple + "_" + this.appIds;
                        this.$emit("input", []);
                    }
                }
            }
        },
        beforeMount: function() {
            this.store = countlyVue.vuex.getGlobalStore();
        }
    });

    var DataTypeComponent = countlyVue.views.create({
        template: CV.T('/dashboards/templates/helpers/drawer/data-type.html'),
        props: {
            placeholder: {
                type: String
            },
            extraTypes: {
                type: Array,
                default: function() {
                    return [];
                }
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
                        label: this.i18n("dashboards.data-type.session")
                    },
                    {
                        value: "user-analytics",
                        label: this.i18n("dashboards.data-type.user-analytics")
                    },
                    {
                        value: "technology",
                        label: this.i18n("dashboards.data-type.technology")
                    },
                    {
                        value: "geo",
                        label: this.i18n("dashboards.data-type.geo")
                    },
                    {
                        value: "views",
                        label: this.i18n("dashboards.data-type.views")
                    },
                    {
                        value: "sources",
                        label: this.i18n("dashboards.data-type.sources")
                    }
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
                var fullList = this.allTypes.concat(this.extraTypes);

                fullList.sort(function(a, b) {
                    return (a.priority || 0) - (b.priority || 0);
                });

                if (this.enabledTypes && this.enabledTypes.length) {
                    var self = this;
                    return fullList.filter(function(item) {
                        return self.enabledTypes.includes(item.value);
                    });
                }

                return fullList;
            }
        }
    });

    var AppCountComponent = countlyVue.views.create({
        template: CV.T('/dashboards/templates/helpers/drawer/app-count.html'),
        props: {
            value: {
                type: String,
                default: 'single',
                required: true,
            }
        },
        computed: {
            count: {
                get: function() {
                    return this.value;
                },
                set: function(v) {
                    this.$emit("input", v);
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
            multipleLimit: {
                type: Number,
                default: 4
            },
            placeholder: {
                type: String
            },
            value: {
                type: Array,
                required: true,
                default: function() {
                    return [];
                }
            },
            multiple: {
                type: Boolean,
                default: false
            }
        },
        data: function() {
            return {
                rerender: "_id_" + this.multiple
            };
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
            },
            allListeners: function() {
                return Object.assign({},
                    this.$listeners,
                    {
                        input: function() {
                            /**
                             * Overwrite the input listener passed from parent,
                             * Since all parent listeners are passed to the children,
                             * we want to overwrite this input listener so that the value
                             * is not updated in the parent directly from the children.
                             * We want to intercept the child value and return as array to parent
                             * with the help of the selectedApps computed property
                             */
                        }
                    }
                );
            }
        },
        watch: {
            multiple: {
                handler: function(newVal, oldVal) {
                    /**
                     * Everytime multiple changes we want to reset the selected value of
                     * the component because the value depends on the multiple value.
                     *
                     * We also want to rerender the component to update the selected value.
                     * We want to do this because el-select has a bug where even if the model
                     * value changes, the input value is not updated.
                     */
                    if (newVal !== oldVal) {
                        this.rerender = "_id_" + this.multiple;
                        this.$emit("input", []);
                    }
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
                default: function() {
                    return [];
                }
            },
            mute: {
                type: Boolean,
                default: false
            },
            value: String,
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
                var extraTypes = this.extraTypes;
                var enabledTypes = this.enabledTypes;
                var fullList = this.types.concat(extraTypes);

                fullList.sort(function(a, b) {
                    return (a.priority || 0) - (b.priority || 0);
                });

                if (enabledTypes && enabledTypes.length) {
                    fullList = fullList.filter(function(item) {
                        return enabledTypes.includes(item.value);
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
        },
        watch: {
            enabledTypes: {
                handler: function(val, oldVal) {
                    if (val.length !== oldVal.length) {
                        return this.$emit("input", "");
                    }

                    for (var i = 0; i < val.length; i++) {
                        var v = val[i];
                        if (!oldVal.includes(v)) {
                            return this.$emit("input", "");
                        }
                    }
                }
            }
        }
    });

    var TitleComponent = countlyVue.views.create({
        template: CV.T('/dashboards/templates/helpers/drawer/title.html'),
        props: {
            value: {
                type: String,
                default: ""
            }
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


    var PeriodComponent = countlyVue.views.create({
        template: CV.T('/dashboards/templates/helpers/drawer/period.html'),
        props: {
            value: {
                type: String,
                default: ""
            }
        },
        data: function() {
            return {
                titleCheckbox: null
            };
        },
        computed: {
            custom_period: {
                get: function() {
                    return this.value || "30days";
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

                    if (this.value) {
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

    var ColorsComponent = countlyVue.views.create({
        template: CV.T('/dashboards/templates/helpers/drawer/colors.html'),
        props: {
            value: { default: 1 },
            options: {
                type: Array,
                default: function() {
                    return countlyCommon.GRAPH_COLORS;
                }
            },
            label: {required: false, default: CV.i18n("dashboards.bar-color")}
        },
        methods: {
            commitValue: function(v) {
                this.$emit("input", v);
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
            value: {type: String, required: true, default: ""}
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
    Vue.component("clyd-breakdown", BreakdownComponent);
    Vue.component("clyd-event", EventComponent);
    Vue.component("clyd-datatype", DataTypeComponent);
    Vue.component("clyd-appcount", AppCountComponent);
    Vue.component("clyd-sourceapps", SourceAppsComponent);
    Vue.component("clyd-visualization", VisualizationComponent);
    Vue.component("clyd-title", TitleComponent);
    Vue.component("clyd-period", PeriodComponent);
    Vue.component("clyd-colors", ColorsComponent);

    /**
     * WIDGET HELPERS REGISTRATION
     */
    Vue.component("clyd-bucket", BucketComponent);

})();