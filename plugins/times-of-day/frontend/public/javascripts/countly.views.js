/*global $,countlyAuth,jQuery,countlyCommon,app,countlyVue,countlyTimesOfDay,CV */

var featureName = "times_of_day";
var MAX_SYMBOL_VALUE = 50;

var TimesOfDayView = countlyVue.views.create({
    template: CV.T('/times-of-day/templates/times-of-day.html'),
    data: function() {
        return {
        };
    },
    computed: {
        timesOfDayRows: function() {
            return this.$store.state.countlyTimesOfDay.rows;
        },
        isLoading: function() {
            return this.$store.state.countlyTimesOfDay.isLoading;
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
                    text: "Times of day"
                },
                tooltip: {
                    position: 'top',
                    trigger: 'item',
                    formatter: function(params) {
                        return '<div class="bu-is-flex bu-is-flex-direction-column times-of-day__scatter-chart-tooltip"> \n' +
                                    '<span class="times-of-day__scatter-chart-tooltip-text"> Total users</span>\n' +
                                    '<span class="times-of-day__scatter-chart-tooltip-total-users-value">' + params.value[2] + '</span> \n' +
                                    '<span class="times-of-day__scatter-chart-tooltip-text"> between ' + countlyTimesOfDay.service.getHoursPeriod(countlyTimesOfDay.service.HOURS[params.value[0]]) + '</span> \n' +
                                '</div>';
                    }
                },
                xAxis: {
                    type: 'category',
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
                    data: countlyTimesOfDay.service.WEEK_DAYS,
                    nameLocation: 'middle',
                    boundaryGap: true,
                    axisTick: {
                        alignWithLabel: true
                    }
                },
                series: [{
                    name: "Times of day",
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
        dateBuckets: function() {
            return countlyTimesOfDay.service.getDateBucketsList();
        }
    },
    methods: {
        onSelectDateBucket: function(value) {
            this.$store.dispatch('countlyTimesOfDay/setFilters', {dataType: this.$store.state.countlyTimesOfDay.filters.dataType, dateBucketValue: value});
            this.$store.dispatch('countlyTimesOfDay/fetchAll', true);
        },
        refresh: function() {
            this.$store.dispatch('countlyTimesOfDay/fetchAll', false);
        },
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

app.addPageScript("/custom#", function() {
    /**
     * Adding widget type
     */
    function addWidgetType() {
        var todWidget = '<div data-widget-type="times-of-day" class="opt dashboard-widget-item">' +
            '    <div class="inner">' +
            '        <span class="icon timesofday"></span>' + jQuery.i18n.prop("times-of-day.times") +
            '    </div>' +
            '</div>';

        $("#widget-drawer .details #widget-types .opts").append(todWidget);
    }

    /**
     * Adding settings section
     */
    function addSettingsSection() {
        var setting = '<div id="widget-section-single-tod" class="settings section">' +
                        '    <div class="label">' + jQuery.i18n.prop("times-of-day.period") + '</div>' +
                        '    <div id="single-tod-dropdown" class="cly-select" style="width: 100%; box-sizing: border-box;">' +
                        '        <div class="select-inner">' +
                        '            <div class="text-container">' +
                        '                <div class="text">' +
                        '                    <div class="default-text">' + jQuery.i18n.prop("times-of-day.select") + '</div>' +
                        '                </div>' +
                        '            </div>' +
                        '            <div class="right combo"></div>' +
                        '        </div>' +
                        '        <div class="select-items square" style="width: 100%;"></div>' +
                        '    </div>' +
                        '</div>';

        $(setting).insertAfter(".cly-drawer .details .settings:last");
    }
    if (countlyAuth.validateRead(featureName)) {
        addWidgetType();
        addSettingsSection();

        $("#single-tod-dropdown").on("cly-select-change", function() {
            $("#widget-drawer").trigger("cly-widget-section-complete");
        });
    }
});
