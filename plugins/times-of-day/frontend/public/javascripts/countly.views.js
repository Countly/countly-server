/*global $,countlyAuth,countlyGlobal,T,countlyWidgets,jQuery,countlyCommon,app,countlyDashboards,countlyVue,countlyTimesOfDay,CV */

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
                                    '<span class="times-of-day__scatter-chart-tooltip-total-users-value">' + params.value[2] + '</span> \n' +
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
                    data: countlyTimesOfDay.service.WEEK_DAYS,
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
        formatNumber: function(value) {
            return countlyCommon.formatNumber(value);
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


if (countlyAuth.validateRead(featureName)) {
    initializeTimesOfDayWidget();
}

/**
 * Initialize times of day widget.
 */
function initializeTimesOfDayWidget() {

    if (countlyGlobal.plugins.indexOf("dashboards") < 0) {
        return;
    }

    var widgetOptions = {
        init: initWidgetSections,
        settings: widgetSettings,
        placeholder: addPlaceholder,
        create: createWidgetView,
        reset: resetWidget,
        set: setWidget,
        refresh: refreshWidget
    };

    if (!app.dashboardsWidgetCallbacks) {
        app.dashboardsWidgetCallbacks = {};
    }

    app.dashboardsWidgetCallbacks["times-of-day"] = widgetOptions;

    var todWidgetTemplate;
    var periods = [
        {
            name: jQuery.i18n.map['times-of-day.all-time'],
            value: "all"
        },
        {
            name: jQuery.i18n.map['times-of-day.this-month'],
            value: "current"
        },
        {
            name: jQuery.i18n.map['times-of-day.previous-month'],
            value: "previous"
        },
        {
            name: jQuery.i18n.map['times-of-day.last-3-months'],
            value: "last_3"
        }
    ];

    $.when(
        T.render('/times-of-day/templates/widget.html', function(src) {
            todWidgetTemplate = src;
        })
    ).then(function() {});

    /**
     * Initialize widget section.
     */
    function initWidgetSections() {
        var selWidgetType = $("#widget-types").find(".opt.selected").data("widget-type");

        if (selWidgetType !== "times-of-day") {
            return;
        }

        $("#single-tod-dropdown").clySelectSetItems(periods);

        var dataType = $("#data-types").find(".opt.selected").data("data-type");

        $("#widget-drawer .details #data-types").parent(".section").show();
        $("#data-types").find(".opt[data-data-type=push]").addClass("disabled");
        $("#data-types").find(".opt[data-data-type=crash]").addClass("disabled");
        $("#widget-section-single-app").show();
        $("#widget-section-bar-color").show();
        $("#widget-section-single-tod").show();
        if (dataType === "event") {
            $("#widget-section-single-event").show();
        }
        $("#widget-section-custom-period").hide();
    }

    /**
     * Get Widget settings
     * @returns {object} | Settings object
     */
    function widgetSettings() {
        var $singleAppDrop = $("#single-app-dropdown"),
            $singleEventDrop = $("#single-event-dropdown"),
            dataType = $("#data-types").find(".opt.selected").data("data-type"),
            $barColors = $("#bar-colors"),
            $singleTodDrop = $("#single-tod-dropdown");

        var selectedApp = $singleAppDrop.clySelectGetSelection(),
            selectedEvent = $singleEventDrop.clySelectGetSelection(),
            barColor = $barColors.find(".color.selected").data("color"),
            selectedTodPeriod = $singleTodDrop.clySelectGetSelection();

        var settings = {
            apps: (selectedApp) ? [ selectedApp ] : [],
            data_type: dataType,
            bar_color: barColor,
            period: selectedTodPeriod
        };

        if (dataType === "event") {
            settings.events = (selectedEvent) ? [ selectedEvent ] : [];
        }

        return settings;
    }

    /**
     * Adding placeholder
     * @param {object} dimensions | Dimension object
     */
    function addPlaceholder(dimensions) {
        dimensions.min_height = 3;
        dimensions.min_width = 4;
        dimensions.width = 4;
        dimensions.height = 3;
    }

    /**
     * Create widget view
     * @param {object} widgetData | Widget data
     */
    function createWidgetView(widgetData) {
        var placeHolder = widgetData.placeholder;

        formatData(widgetData);
        render();

        /**
         * Render function
         */
        function render() {
            var title = widgetData.title,
                app = widgetData.apps,
                data = widgetData.formattedData,
                period = widgetData.period;

            var appName = countlyDashboards.getAppName(app[0]),
                appId = app[0];

            var $widget = $(todWidgetTemplate({
                title: title,
                app: {
                    id: appId,
                    name: appName
                },
                data: data
            }));

            placeHolder.find("#loader").fadeOut();
            placeHolder.find(".cly-widget").html($widget.html());

            if (!title) {
                var periodName = periods.filter(function(obj) {
                    return obj.value === period;
                });
                var esTypeName = widgetData.data_type === "session" ? jQuery.i18n.map['times-of-day.sessions'] : widgetData.events[0].split("***")[1];
                var widgetTitle = "Times of day: " + esTypeName + " (" + periodName[0].name + ")";
                placeHolder.find(".title .name").text(widgetTitle);
            }

            addTooltip(placeHolder);

            $(".crcl").on({
                mouseenter: function() {
                    $(".crcl").removeClass("hover");
                    $(this).addClass("hover");
                },
                mouseleave: function() {
                    $(".crcl").removeClass("hover");
                }
            });

            placeHolder.find(".timesofday").off("resize").on("resize", function() {
                if (placeHolder.find(".timesofday").width() >= 690) {
                    placeHolder.find(".timesofday table th:nth-child(2n+1)").css({ "visibility": "visible"});
                }
                else {
                    placeHolder.find(".timesofday table th:nth-child(2n+1)").css({ "visibility": "hidden"});
                }
            });
        }
    }

    /**
     * Format widget data
     * @param {object} widgetData | Widget data
     */
    function formatData(widgetData) {
        var data = widgetData.dashData.data;

        var labelsX = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23"];
        var labelsY = [
            {
                dispLabel: jQuery.i18n.map['times-of-day.sunday'].slice(0, 2),
                label: jQuery.i18n.map['times-of-day.sunday'],
                data: []
            },
            {
                dispLabel: jQuery.i18n.map['times-of-day.monday'].slice(0, 2),
                label: jQuery.i18n.map['times-of-day.monday'],
                data: []
            },
            {
                dispLabel: jQuery.i18n.map['times-of-day.tuesday'].slice(0, 2),
                label: jQuery.i18n.map['times-of-day.tuesday'],
                data: []
            },
            {
                dispLabel: jQuery.i18n.map['times-of-day.wednesday'].slice(0, 2),
                label: jQuery.i18n.map['times-of-day.wednesday'],
                data: []
            },
            {
                dispLabel: jQuery.i18n.map['times-of-day.thursday'].slice(0, 2),
                label: jQuery.i18n.map['times-of-day.thursday'],
                data: []
            },
            {
                dispLabel: jQuery.i18n.map['times-of-day.friday'].slice(0, 2),
                label: jQuery.i18n.map['times-of-day.friday'],
                data: []
            },
            {
                dispLabel: jQuery.i18n.map['times-of-day.saturday'].slice(0, 2),
                label: jQuery.i18n.map['times-of-day.saturday'],
                data: []
            },
        ];

        var color = countlyCommon.hexToRgba(countlyWidgets.barColors[widgetData.bar_color - 1 || 0]);
        var maxDataValue = Math.max.apply(null, ([].concat.apply([], data))) || 1;
        var defaultColor = "rgba(255, 255, 255, .07)";
        var maxRadius = 30;
        var minRadius = 7;

        var averages = [];
        var reducer = function(c, acc, current, y) {
            return acc + data[y][c];
        };

        for (var c = 0; c <= 23; c++) {
            var total = [0, 1, 2, 3, 4, 5, 6].reduce(reducer.bind(this, c), 0);
            averages.push(total / 7);
        }

        for (var i = 0; i < data.length; i++) {
            for (var j = 0; j < data[i].length; j++) {
                var fill = parseFloat((data[i][j] / maxDataValue).toFixed(2));
                var radius = ((maxRadius - minRadius) * fill) + minRadius;
                var setColor = defaultColor;
                if (radius > minRadius) {
                    setColor = color.slice(0, (color.length - 2)) + fill + ")";
                }

                var startHourText = (j < 10 ? "0" + j : j) + ":00";
                var endHour = j + 1 > 23 ? 0 : j + 1;
                var endHourText = (endHour < 10 ? "0" + endHour : endHour) + ":00";

                var percentage = ((data[i][j] - averages[j]) * 100) / averages[j];

                var obj = {
                    color: setColor,
                    radius: radius,
                    count: data[i][j],
                    averagePercentage: percentage.toFixed(0),
                    startHour: startHourText,
                    endHour: endHourText
                };
                labelsY[i].data.push(obj);
            }
        }

        var sunday = labelsY[0];
        labelsY = labelsY.splice(1, 7);
        labelsY.push(sunday);

        var formattedData = {
            labelsX: labelsX,
            labelsY: labelsY,
            type: widgetData.data_type === "session" ? jQuery.i18n.map['times-of-day.sessions'] : widgetData.events[0].split("***")[1]
        };

        widgetData.formattedData = formattedData;
    }

    /**
     * Reset current widget
     */
    function resetWidget() {
        var $singleEventDrop = $("#single-event-dropdown"),
            $sinleTopDrop = $("#single-tod-dropdown");

        $singleEventDrop.clySelectSetSelection("", jQuery.i18n.prop("dashboards.select-event-single"));
        $sinleTopDrop.clySelectSetSelection("", jQuery.i18n.prop("times-of-day.select"));
    }

    /**
     * Set current widget
     * @param {object} widgetData | Widget data
     */
    function setWidget(widgetData) {
        var apps = widgetData.apps;
        var dataType = widgetData.data_type;
        var events = widgetData.events;
        var barColor = widgetData.bar_color;
        var period = widgetData.period;

        var $singleAppDrop = $("#single-app-dropdown");
        var $singleEventDrop = $("#single-event-dropdown");
        var $dataTypes = $("#data-types");
        var $barColors = $("#bar-colors");
        var $singleTodDrop = $("#single-tod-dropdown");

        $singleAppDrop.clySelectSetSelection(apps[0], countlyDashboards.getAppName(apps[0]));

        $dataTypes.find(".opt").removeClass("selected");
        $dataTypes.find(".opt[data-data-type=" + dataType + "]").addClass("selected");

        if (events) {
            var eventNames = {},
                deferreds = [];

            for (var i = 0; i < events.length; i++) {
                deferreds.push(countlyDashboards.getEventNameDfd(events[i], eventNames));
            }

            $.when.apply(null, deferreds).done(function() {
                $singleEventDrop.clySelectSetSelection(events[0], eventNames[events[0]]);
            });
        }

        if (barColor) {
            $barColors.find(".color").removeClass("selected");
            $barColors.find(".color[data-color=" + barColor + "]").addClass("selected");
        }

        if (period) {
            var periodName = periods.filter(function(obj) {
                return obj.value === period;
            });

            $singleTodDrop.clySelectSetSelection(period, periodName[0].name);
        }
    }

    /**
     * Refresh current widget
     * @param {object} widgetEl | Dome element
     * @param {object} widgetData | Widget data
     */
    function refreshWidget(widgetEl, widgetData) {
        formatData(widgetData);
        var data = widgetData.formattedData;

        var $widget = $(todWidgetTemplate({
            title: "",
            app: {
                id: "",
                name: ""
            },
            data: data
        }));

        widgetEl.find("table").replaceWith($widget.find("table"));
        addTooltip(widgetEl);
    }

    /**
     * Add tooltip to widget
     * @param {object} placeHolder | placeholder lib object
     */
    function addTooltip(placeHolder) {
        placeHolder.find('.timesofday-body-cell .crcl circle').tooltipster({
            animation: "fade",
            animationDuration: 50,
            delay: 100,
            theme: 'tooltipster-borderless',
            trigger: 'custom',
            triggerOpen: {
                mouseenter: true,
                touchstart: true
            },
            triggerClose: {
                mouseleave: true,
                touchleave: true
            },
            interactive: true,
            contentAsHTML: true,
            functionInit: function(instance, helper) {
                instance.content(getTooltipText($(helper.origin).parents(placeHolder.find(".timesofday-body-cell"))));
            }
        });

        /**
         * Get tooltip text of element
         * @param {object} jqueryEl | Dom element
         * @returns {string} | Tooltip
         */
        function getTooltipText(jqueryEl) {
            var count = jqueryEl.parents("td").data("count");
            var startHour = jqueryEl.parents("td").data("starthour");
            var endHour = jqueryEl.parents("td").data("endhour");
            var percentage = jqueryEl.parents("td").data("averagepercentage");
            var label = jqueryEl.parents("tr").data("label");
            var type = jqueryEl.parents(".timesofday").find("table").data("es-type");

            var tooltipStr = "<div id='tod-tip'>";

            type = type.toLowerCase();
            if (type !== "sessions") {
                type = type + "(s)";
            }
            tooltipStr += jQuery.i18n.prop('times-of-day.tooltip-1', countlyCommon.formatNumber(count), type, label, startHour, endHour) + "<br/>";
            tooltipStr += count > 0 ? jQuery.i18n.prop('times-of-day.tooltip-' + (percentage > 0 ? "more" : "less") + '-than', Math.abs(percentage)) : "";

            tooltipStr += "</div>";

            return tooltipStr;
        }
    }
}