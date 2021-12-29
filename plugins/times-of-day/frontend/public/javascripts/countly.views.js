/*global countlyAuth,countlyCommon,countlyVue,countlyTimesOfDay,CV,countlyEvent */

var featureName = "times_of_day";
var MAX_SYMBOL_VALUE = 20;

var TimesOfDayView = countlyVue.views.create({
    template: CV.T('/times-of-day/templates/times-of-day.html'),
    mixins: [countlyVue.mixins.commonFormatters],
    data: function() {
        return {
            dateBuckets: countlyTimesOfDay.service.getDateBucketsList(),
        };
    },
    computed: {
        timesOfDayRows: function() {
            return this.$store.state.countlyTimesOfDay.rows;
        },
        isLoading: function() {
            return this.$store.getters['countlyTimesOfDay/isLoading'];
        },
        normalizedSymbolCoefficient: function() {
            if (this.$store.state.countlyTimesOfDay.maxSeriesValue < MAX_SYMBOL_VALUE) {
                return 1;
            }
            return MAX_SYMBOL_VALUE / this.$store.state.countlyTimesOfDay.maxSeriesValue;
        },
        timesOfDayOptions: function() {
            var self = this;
            return {
                title: {
                    text: CV.i18n('times-of-day.title')
                },
                tooltip: {
                    position: 'top',
                    trigger: 'item',
                    formatter: function(params) {
                        return '<div class="bu-is-flex bu-is-flex-direction-column times-of-day__scatter-chart-tooltip"> \n' +
                                    '<span class="times-of-day__scatter-chart-tooltip-text">' + CV.i18n('times-of-day.total-users') + '</span>\n' +
                                    '<span class="times-of-day__scatter-chart-tooltip-total-users-value">' + self.formatNumber(params.value[2]) + '</span> \n' +
                                    '<span class="times-of-day__scatter-chart-tooltip-text">' + CV.i18n('times-of-day.between') + ' ' + countlyTimesOfDay.service.getHoursPeriod(countlyTimesOfDay.service.HOURS[params.value[0]]) + '</span> \n' +
                                '</div>';
                    }
                },
                xAxis: {
                    data: countlyTimesOfDay.service.HOURS,
                    splitLine: {
                        show: true
                    },
                    axisLine: {
                        show: false
                    }
                },
                yAxis: {
                    type: 'category',
                    data: [
                        CV.i18n('times-of-day.monday'),
                        CV.i18n('times-of-day.tuesday'),
                        CV.i18n('times-of-day.wednesday'),
                        CV.i18n('times-of-day.thursday'),
                        CV.i18n('times-of-day.friday'),
                        CV.i18n('times-of-day.saturday'),
                        CV.i18n('times-of-day.sunday')
                    ],
                    nameLocation: 'middle',
                    boundaryGap: true,
                    axisTick: {
                        alignWithLabel: true
                    }
                },
                series: [{
                    name: CV.i18n('times-of-day.title'),
                    type: "scatter",
                    symbolSize: function(val) {
                        var dataIndexValue = 2;
                        return val[dataIndexValue] * self.normalizedSymbolCoefficient;
                    },
                    data: this.$store.state.countlyTimesOfDay.series,
                }],
                color: "#39C0C8"
            };
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
            maxSeriesValue: null
        };
    },
    computed: {
        dashboardData: function() {
            if (this.data.dashData && this.data.dashData.data) {
                return this.data.dashData.data;
            }
            return [];
        },
        timesOfDayOptions: function() {
            var self = this;
            return {
                title: {
                    text: CV.i18n('times-of-day.title')
                },
                tooltip: {
                    position: 'top',
                    trigger: 'item',
                    formatter: function(params) {
                        return '<div class="bu-is-flex bu-is-flex-direction-column times-of-day__scatter-chart-tooltip"> \n' +
                                    '<span class="times-of-day__scatter-chart-tooltip-text">' + CV.i18n('times-of-day.total-users') + '</span>\n' +
                                    '<span class="times-of-day__scatter-chart-tooltip-total-users-value">' + self.formatNumber(params.value[2]) + '</span> \n' +
                                    '<span class="times-of-day__scatter-chart-tooltip-text">' + CV.i18n('times-of-day.between') + ' ' + countlyTimesOfDay.service.getHoursPeriod(countlyTimesOfDay.service.HOURS[params.value[0]]) + '</span> \n' +
                                '</div>';
                    }
                },
                xAxis: {
                    data: countlyTimesOfDay.service.HOURS,
                    splitLine: {
                        show: true
                    },
                    axisLine: {
                        show: false
                    }
                },
                yAxis: {
                    type: 'category',
                    data: [
                        CV.i18n('times-of-day.monday'),
                        CV.i18n('times-of-day.tuesday'),
                        CV.i18n('times-of-day.wednesday'),
                        CV.i18n('times-of-day.thursday'),
                        CV.i18n('times-of-day.friday'),
                        CV.i18n('times-of-day.saturday'),
                        CV.i18n('times-of-day.sunday')
                    ],
                    nameLocation: 'middle',
                    boundaryGap: true,
                    axisTick: {
                        alignWithLabel: true
                    }
                },
                series: [{
                    name: CV.i18n('times-of-day.title'),
                    type: "scatter",
                    symbolSize: function(val) {
                        var dataIndexValue = 2;
                        return val[dataIndexValue] * self.getNormalizedSymbolCoefficient();
                    },
                    data: countlyTimesOfDay.service.mapSeries(this.dashboardData),
                }],
                color: "#39C0C8"
            };
        }
    },
    methods: {
        findMaxSeriesValue: function() {
            return countlyTimesOfDay.service.findMaxSeriesValue(this.dashboardData);
        },
        setMaxSeriesValue: function(value) {
            this.maxSeriesValue = value;
        },
        getNormalizedSymbolCoefficient: function() {
            if (!this.maxSeriesValue) {
                var value = this.findMaxSeriesValue();
                this.setMaxSeriesValue(value);
            }
            if (this.maxSeriesValue < MAX_SYMBOL_VALUE) {
                return 1;
            }
            return MAX_SYMBOL_VALUE / this.maxSeriesValue;
        },
    },
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
