/*global countlyAuth,CV,countlyCommon,countlyVue,countlyTimesOfDay,countlyTimesOfDayComponent,countlyEvent */

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
            return this.$store.getters['countlyTimesOfDay/isLoading'];
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

if (countlyAuth.validateRead(featureName)) {
    countlyVue.container.registerTab("/analytics/loyalty", {
        priority: 3,
        name: "times-of-day",
        title: CV.i18n('times-of-day.title'),
        route: "#/" + countlyCommon.ACTIVE_APP_ID + "/analytics/loyalty/times-of-day",
        component: TimesOfDayView,
        vuex: [{
            clyModel: countlyTimesOfDay
        }],
    });
}

var TimesOfDayWidgetComponent = countlyVue.views.create({
    template: CV.T('/times-of-day/templates/times-of-day-widget.html'),
    mixins: [countlyVue.mixins.commonFormatters],
    props: {
        data: {
            type: Object,
            default: function() {
                return {};
            }
        }
    },
    data: function() {
        return {
            _maxSeriesValue: 0
        };
    },
    computed: {
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
    methods: {
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
            eventOptions: countlyEvent.getEvents().map(function(event) {
                return {label: event.name, value: event.key};
            }),
            useCustomTitle: false,
            selectedVisualization: "scatter"
        };
    }
});

/**
 * 
 * @param {string} name of the event 
 * @returns {object} event or null
 */
function findEventKeyByName(name) {
    return countlyEvent.getEvents().find(function(item) {
        return item.name === name;
    });
}

if (countlyAuth.validateRead(featureName)) {
    countlyVue.container.registerData("/custom/dashboards/widget", {
        type: "times-of-day",
        label: CV.i18n("times-of-day.title"),
        priority: 1,
        drawer: {
            component: TimesOfDayWidgetDrawer,
            getEmpty: function() {
                return {
                    title: "",
                    widget_type: "times-of-day",
                    isPluginWidget: true,
                    apps: [],
                    data_type: "",
                    events: [],
                    period: "",
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
                    var eventItem = findEventKeyByName(doc.events);
                    doc.events = [eventItem.key + '***' + eventItem.name];
                }
            }
        },
        grid: {
            component: TimesOfDayWidgetComponent,
            dimensions: function() {
                return {
                    minWidth: 6,
                    minHeight: 4,
                    width: 7,
                    height: 4
                };
            },
        }
    });
}
