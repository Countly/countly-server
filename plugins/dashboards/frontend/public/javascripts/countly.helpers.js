/*global countlyVue, CV */

(function(countlyDashboards) {

    var MetricComponent = countlyVue.views.create({
        template: CV.T('/dashboards/templates/helpers/metric.html'),
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
        template: CV.T('/dashboards/templates/helpers/data-type.html'),
        props: {
            placeholder: {
                type: String
            }
        },
        data: function() {
            return {
                types: [
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
            }
        }
    });

    var AppCountComponent = countlyVue.views.create({
        template: CV.T('/dashboards/templates/helpers/app-count.html'),
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
                    if (!this.count) {
                        return (this.apps.length > 1) ? "multiple" : "single";
                    }

                    return this.count;
                },
                set: function(v) {
                    this.count = v;
                }
            }
        }
    });

    var SourceAppsComponent = countlyVue.views.create({
        template: CV.T('/dashboards/templates/helpers/source-apps.html'),
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

    countlyDashboards.helpers = {
        MetricComponent: MetricComponent,
        DataTypeComponent: DataTypeComponent,
        AppCountComponent: AppCountComponent,
        SourceAppsComponent: SourceAppsComponent
    };

})(window.countlyDashboards = window.countlyDashboards || {});