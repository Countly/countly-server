/*global CV,countlyVue,countlyTimesOfDay,countlyTimesOfDayComponent */
(function() {
    var featureName = "times_of_day";

    var TimesOfDayView = countlyVue.views.create({
        template: CV.T('/times-of-day/templates/times-of-day.html'),
        mixins: [countlyVue.mixins.commonFormatters],
        data: function() {
            return {
                dateBuckets: countlyTimesOfDay.service.getDateBucketsList(),
            };
        },
        computed: {
            series: function() {
                return this.$store.state.countlyTimesOfDay.series;
            },
            maxSeriesValue: function() {
                return this.$store.state.countlyTimesOfDay.maxSeriesValue;
            },
            timesOfDayRows: function() {
                return this.$store.state.countlyTimesOfDay.rows;
            },
            isLoading: function() {
                return this.$store.getters['countlyTimesOfDay/loading'];
            },
            selectedFilter: {
                get: function() {
                    return this.$store.state.countlyTimesOfDay.filters.dataType;
                },
                set: function(value) {
                    this.$store.dispatch('countlyTimesOfDay/setFilters', {dataType: value, dateBucketValue: this.$store.state.countlyTimesOfDay.filters.dateBucketValue});
                    this.$store.dispatch('countlyTimesOfDay/fetchAll', true);
                }
            },
            selectedDateBucketValue: function() {
                return this.$store.state.countlyTimesOfDay.filters.dateBucketValue;
            },

        },
        methods: {
            onSelectDateBucket: function(value) {
                this.$store.dispatch('countlyTimesOfDay/setFilters', {dataType: this.$store.state.countlyTimesOfDay.filters.dataType, dateBucketValue: value});
                this.$store.dispatch('countlyTimesOfDay/fetchAll', true);
            },
            refresh: function() {
                this.$store.dispatch('countlyTimesOfDay/fetchAll', false);
            }
        },
        mounted: function() {
            this.$store.dispatch('countlyTimesOfDay/fetchAll', true);
        },
        components: {
            "times-of-day-scatter-chart": countlyTimesOfDayComponent.ScatterChart
        }
    });

    countlyVue.container.registerTab("/analytics/loyalty", {
        priority: 3,
        name: "times-of-day",
        permission: featureName,
        pluginName: "times-of-day",
        title: CV.i18n('times-of-day.title'),
        route: "#/analytics/loyalty/times-of-day",
        component: TimesOfDayView,
        vuex: [{
            clyModel: countlyTimesOfDay
        }],
    });

    var TimesOfDayWidgetComponent = countlyVue.views.create({
        template: CV.T('/times-of-day/templates/times-of-day-widget.html'),
        mixins: [countlyVue.mixins.customDashboards.global, countlyVue.mixins.commonFormatters],
        computed: {
            title: function() {
                var self = this;
                var periods = countlyTimesOfDay.service.getDateBucketsList();
                var periodName = periods.filter(function(obj) {
                    return obj.value === self.data.period;
                });

                var esTypeName = this.data.data_type === "session" ? this.i18nM('times-of-day.sessions') : this.data.events[0].split("***")[1];
                var widgetTitle = CV.i18n('times-of-day.title') + " : " + esTypeName + " (" + periodName[0].label + ")";
                return this.data.title || widgetTitle;
            },
            dashboardData: function() {
                if (this.data.dashData && this.data.dashData.data) {
                    return this.data.dashData.data;
                }
                return [];
            },
            series: function() {
                return countlyTimesOfDay.service.mapSeries(this.dashboardData);
            },
            maxSeriesValue: function() {
                return countlyTimesOfDay.service.findMaxSeriesValue(this.dashboardData);
            }
        },
        components: {
            "times-of-day-scatter-chart": countlyTimesOfDayComponent.ScatterChart
        }
    });

    var TimesOfDayWidgetDrawer = countlyVue.views.create({
        template: CV.T('/times-of-day/templates/times-of-day-widget-drawer.html'),
        props: {
            scope: {
                type: Object,
                default: function() {
                    return {};
                }
            }
        },
        data: function() {
            return {
                dateBuckets: countlyTimesOfDay.service.getDateBucketsList(),
                eventOptions: countlyTimesOfDay.service.getEventOptions(),
                useCustomTitle: false,
            };
        }
    });

    countlyVue.container.registerData("/custom/dashboards/widget", {
        type: "times-of-day",
        label: CV.i18n("times-of-day.title"),
        priority: 8,
        pluginName: "times-of-day",
        primary: true,
        getter: function(widget) {
            return widget.widget_type === "times-of-day";
        },
        drawer: {
            component: TimesOfDayWidgetDrawer,
            getEmpty: function() {
                return {
                    title: "",
                    feature: featureName,
                    widget_type: "times-of-day",
                    isPluginWidget: true,
                    apps: [],
                    data_type: "",
                    events: "",
                    period: "",
                    visualization: "punchcard"
                };
            },
            beforeLoadFn: function(doc, isEdited) {
                if (isEdited) {
                    if (doc.data_type === 'event' && doc.events.length) {
                        doc.events = doc.events[0].split('***')[1];
                    }
                }
            },
            beforeSaveFn: function(doc) {
                if (doc.data_type === 'event') {
                    var eventItem = countlyTimesOfDay.service.findEventKeyByName(doc.events);
                    doc.events = [eventItem.key + '***' + eventItem.name];
                }
                if (doc.data_type === 'session') {
                    doc.events = undefined;
                }
            }
        },
        grid: {
            component: TimesOfDayWidgetComponent,
            dimensions: function() {
                return {
                    minWidth: 4,
                    minHeight: 4,
                    width: 4,
                    height: 4
                };
            }
        }
    });
})();