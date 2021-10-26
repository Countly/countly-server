/*global countlyDashboards, countlyCommon, _, app, Countly, jQuery, CountlyHelpers, T, countlyGlobal, CommonConstructor */
(function(countlyWidgets, $) {

    var numberWidgetTemplate,
        timeSeriesWidgetTemplate,
        barChartWidgetTemplate,
        tableWidgetTemplate;

    var initialised = false;

    countlyWidgets.barColors = [countlyCommon.GRAPH_COLORS[0], countlyCommon.GRAPH_COLORS[2], countlyCommon.GRAPH_COLORS[1], countlyCommon.GRAPH_COLORS[9]];

    countlyWidgets.initialize = function() {
        if (initialised) {
            return true;
        }

        initialised = true;

        return $.when(
            T.render('/dashboards/templates/widgets/number.html', function(src) {
                numberWidgetTemplate = src;
            }),
            T.render('/dashboards/templates/widgets/time-series.html', function(src) {
                timeSeriesWidgetTemplate = src;
            }),
            T.render('/dashboards/templates/widgets/bar-chart.html', function(src) {
                barChartWidgetTemplate = src;
            }),
            T.render('/dashboards/templates/widgets/table.html', function(src) {
                tableWidgetTemplate = src;
            })
        ).then(function() {});
    };

    countlyWidgets.create = function(dashboardId, widgetSettings) {
        countlyDashboards.addWidgetToDashboard(dashboardId, widgetSettings, function(result) {
            if (result && result.error) {
                if (result.dashboard_access_denied) {
                    accessDeniedPopup();
                }
                return;
            }

            $("#dashboards").attr("class", "");
            widgetSettings.dashboard_id = dashboardId;
            widgetSettings.widget_id = result;

            loadAndCreate(widgetSettings);
        });
    };

    countlyWidgets.update = function(dashboardId, widgetId, widgetSettings) {
        var $widget = $(".grid-stack-item[data-widget-id=" + widgetId + "]");

        $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.w + "/dashboards/update-widget",
            data: {
                "dashboard_id": dashboardId,
                "widget_id": widgetId,
                "widget": JSON.stringify(widgetSettings)
            },
            success: function(result) {
                if (result && result.error) {
                    if (result.dashboard_access_denied) {
                        accessDeniedPopup();
                    }

                    if (result.edit_access_denied) {
                        editAccessDeniedPopup();
                    }
                    return;
                }

                $widget.find(".cly-widget").html("<div id='loader'><div>Loading</div></div>");

                $.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.r + "/dashboards/widget",
                    data: {
                        "period": countlyCommon.getPeriodForAjax(),
                        "dashboard_id": dashboardId,
                        "widget_id": widgetId
                    },
                    success: function(res) {
                        if (res && res.error) {
                            if (res.dashboard_access_denied) {
                                accessDeniedPopup();
                            }
                            return;
                        }

                        if (_.isArray(res)) {
                            res[0].dashboard_id = dashboardId;
                            res[0].widget_id = widgetId;
                            res[0].placeholder = $widget;

                            countlyDashboards.updateWidgetOnDashboard(widgetId, res[0]);

                            if (res[0].client_fetch) {
                                //Inititate the ajax call for the client fetch widget update
                                app.customDashboardsView.orchestrateWidgets(res[0]);
                            }

                            createWidget(res[0], true);
                        }
                    }
                });
            }
        });
    };

    countlyWidgets.createBatch = function(dashboardId, widgets, doneCallback) {
        var sortedWidgets = _.sortBy(widgets, function(widget) {
                return (parseInt(widget.position && widget.position[1] || 0) * 10) + parseInt(widget.position && widget.position[0] || 0);
            }),
            widgetCount = sortedWidgets.length;

        for (var i = 0; i < widgetCount; i++) {
            sortedWidgets[i].dashboard_id = dashboardId;
            sortedWidgets[i].widget_id = sortedWidgets[i]._id;

            timeout(sortedWidgets[i], i, widgetCount, doneCallback);
        }

        /** timeout function
        * @param {object} widget  - widget object
        * @param {integer} index  - index
        * @param {integer} totalCount - widget count
        * @param {function} doneCallback1  - callback function
        */
        function timeout(widget, index, totalCount, doneCallback1) {
            setTimeout(function() {
                //This function is called only for the first time when page loads.
                //So since we have dashboard widgets already available in the frontend
                //and we set placeholder to them, its important to delete them when the user
                //navigates away from the dashbaords view and comes back.
                //Because otherwise on subsequent visits to dashboard nothing will appear
                delete widget.placeholder;
                delete widget.orchestration;
                createWidget(widget, true);

                if (index === totalCount - 1) {
                    doneCallback1();
                }

            }, index * 100);
        }
    };

    countlyWidgets.refreshBatch = function(dashboardId, widgets) {
        var sortedWidgets = _.sortBy(widgets, function(widget) {
                return (parseInt(widget.position && widget.position[1] || 0) * 10) + parseInt(widget.position && widget.position[0] || 0);
            }),
            widgetCount = sortedWidgets.length;
        countlyCommon.getGraphNotes();
        for (var i = 0; i < widgetCount; i++) {
            sortedWidgets[i].dashboard_id = dashboardId;
            sortedWidgets[i].widget_id = sortedWidgets[i]._id;
            refreshWidget(sortedWidgets[i]);
        }
    };

    countlyWidgets.invalidWidget = function(widget) {
        invalidWidgetData(widget);
        freezeWidgetDimensions(widget);
        resetWidgetOptions(widget);
    };

    countlyWidgets.formatPeriod = function(period) {
        if (!period) {
            period = countlyCommon.getPeriod();
            if (Array.isArray(period) && period[1]) {
                //Core adds 1 extra to end date.
                period = JSON.parse(JSON.stringify(period));
                period[1] = period[1] - (24 * 60 * 60 * 1000) + 1;
            }
        }

        var periodObj = countlyCommon.convertToTimePeriodObj(period);
        return periodObj;
    };

    countlyWidgets.setPeriod = function(widgetEl, period) {
        var periodDesc = countlyWidgets.formatPeriod(period);
        widgetEl.find(".period").text(periodDesc.name);
    };

    /** load and create widget
     * @param {object} widgetSettings  - widget settings object
     */
    function loadAndCreate(widgetSettings) {
        $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r + "/dashboards/widget",
            data: {
                "period": countlyCommon.getPeriod(),
                "dashboard_id": widgetSettings.dashboard_id,
                "widget_id": widgetSettings.widget_id
            },
            success: function(res) {
                if (res && res.error) {
                    if (res.dashboard_access_denied) {
                        accessDeniedPopup();
                    }
                    return;
                }

                if (_.isArray(res)) {
                    var placeHolder = createWidgetPlaceholder(res[0]);
                    res[0].dashboard_id = widgetSettings.dashboard_id;
                    res[0].widget_id = widgetSettings.widget_id;
                    res[0].placeholder = placeHolder;

                    countlyDashboards.registerWidgetToDashboard(res[0]);

                    if (res[0].client_fetch) {
                        //Inititate the ajax call for the client fetch widget create
                        app.customDashboardsView.orchestrateWidgets(res[0]);
                    }

                    createWidget(res[0]);

                    if (typeof Countly !== "undefined") {
                        Countly.q.push(['add_event', {
                            "key": "dashboards-create-widget",
                            "count": 1,
                            "segmentation": {
                                "widget_type": res[0].widget_type || "unknown",
                                "data_type": res[0].data_type || "unknown"
                            }
                        }]);
                    }
                }
            }
        });
    }

    /**
     * Get valid buckets for widget
     * @param {object} widgetData - widget data
     * @returns {object} with bucket data
     */
    function getValidBuckets(widgetData) {
        var allowedBuckets = {};

        if (widgetData.overrideAllowedBuckets) {
            allowedBuckets = widgetData.overrideAllowedBuckets;
        }
        else {
            var numberOfDays = countlyCommon.periodObj.numberOfDays;

            allowedBuckets.daily = true;

            if (numberOfDays >= 30) {
                allowedBuckets.weekly = true;
            }
            if (numberOfDays >= 60) {
                allowedBuckets.monthly = true;
            }

            if (countlyCommon.periodObj.period === "day") {
                allowedBuckets.daily = true;
            }

            if (countlyCommon.periodObj.period === "month") {
                allowedBuckets.monthly = true;
            }
        }

        if (allowedBuckets[widgetData.bucket] !== true) {
            if (allowedBuckets.daily) {
                widgetData.bucket = "daily";
            }
            else if (allowedBuckets.weekly) {
                widgetData.bucket = "weekly";
            }
        }
        if (!widgetData.allowPeriodOverride) {
            return {};
        }
        else {
            return allowedBuckets;
        }
    }

    /**
     * Set bucket buttons to correct state based on data
     * @param {object} buckets - bucket data
     * @param {jquery} placeHolder - jquery element for bucket buttons
     * @param {object} widgetData - widget data
     */
    function fixBucketButtons(buckets, placeHolder, widgetData) {
        placeHolder.find(".widget-bucket-selector span").html(jQuery.i18n.map[("drill." + widgetData.bucket)]);
        placeHolder.find(".widget-bucket-menu div").removeClass("active");
        placeHolder.find(".widget-bucket-menu div[data-bucket='" + widgetData.bucket + "']").addClass("active");
        if (buckets.monthly) {
            placeHolder.find(".widget-bucket-menu div[data-bucket='monthly']").css("display", "block");
        }
        else {
            placeHolder.find(".widget-bucket-menu div[data-bucket='monthly']").css("display", "none");
        }
        if (buckets.weekly) {
            placeHolder.find(".widget-bucket-menu div[data-bucket='weekly']").css("display", "block");
        }
        else {
            placeHolder.find(".widget-bucket-menu div[data-bucket='weekly']").css("display", "none");
        }

        if (buckets.daily) {
            placeHolder.find(".widget-bucket-menu div[data-bucket='daily']").css("display", "block");
        }
        else {
            placeHolder.find(".widget-bucket-menu div[data-bucket='daily']").css("display", "none");
        }
    }

    /**
     * Create bucket buttons HTML
     * @param {object} widgetData - widget data
     */
    function createBucketButtons(widgetData) {
        widgetData.placeholder.find(".cly-widget").append(
            '<div class="widget-bucket-selector edit" >' +
           ' <span>{{bucket}}<span>' +
        '</div>' +
        '<div class="edit-menu widget-bucket-menu" style="display:none;">' +
            '<div data-bucket="daily" class="item" data-localize="drill.daily">Daily</div>' +
            '<div data-bucket="weekly" class="item" data-localize="drill.weekly">Weekly</div>' +
            '<div data-bucket="monthly" class="item" data-localize="drill.monthly">Monthly</div>' +
        '</div>');

        widgetData.placeholder.find(".widget-bucket-selector").off("click").on("click", function() {
            $(this).toggleClass("active");
        });
        var my_buckets = getValidBuckets(widgetData);
        fixBucketButtons(my_buckets, widgetData.placeholder, widgetData);
        widgetData.placeholder.find(".widget-bucket-menu ").off("click").on("click", "div", function() {
            var my_buckets2 = getValidBuckets(widgetData);
            if (my_buckets2[$(this).data("bucket")] === true) {
                widgetData.placeholder.find(".widget-bucket-selector").removeClass("active");
                $(this).addClass("active");
                widgetData.bucket = $(this).data("bucket");
                countlyWidgets.update(widgetData.dashboard_id, widgetData._id, {"bucket": widgetData.bucket});
            }
        });

        widgetData.placeholder.find('.widget-bucket-selector').tooltipster({
            animation: "fade",
            animationDuration: 100,
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
            functionInit: function(instance) {
                instance.content("<span>" + jQuery.i18n.prop("drill.choose-bucket") + "</span>");
            }
        });
    }

    /** function createWidget
    * @param {Object} widgetData  - widget object
    * @param {boolean} bypassPosUpdate  - if true - not update position
    */
    function createWidget(widgetData, bypassPosUpdate) {
        var widgetType = widgetData.widget_type;
        var widgetId = widgetData.widget_id;

        if (!widgetData.orchestration) {
            //Set the orchestration stage here to tell the dashbaord orchestrator to call create
            //after the ajax call finishes for the client fetch widgets
            widgetData.orchestration = {
                stage: "create",
                bypassPosUpdate: bypassPosUpdate
            };
        }

        //When widget is created/updated, the placeholder is added
        //Use that placeholder first
        var placeHolder = widgetData.placeholder || '';

        if (!placeHolder.length) {
            //Check if widget is already present on the dashboard
            //Case when empty states of widgets laoded before the actual dashboard data
            placeHolder = $(".grid-stack-item[data-widget-id=" + widgetId + "]");
        }

        if (!placeHolder.length) {
            //Case when we create widgets in batch
            placeHolder = createWidgetPlaceholder(widgetData);
        }

        //Not Handled -
        //There is a case that happens when we have empty state already created for the widgets
        //and in client fetch widgets ajax call creates the widget and later
        //load dashbaord tries to recreate the widgets
        //Dont recreate the widget if it has finished creating
        //But check for the case when widget update happens
        //Currently the created widgets are recreated

        widgetData.placeholder = placeHolder;

        placeHolder.attr("data-dashboard-id", widgetData.dashboard_id);
        placeHolder.attr("data-widget-id", widgetData.widget_id);

        if (widgetData.isPluginWidget) {
            if (countlyGlobal.plugins.indexOf(widgetType) < 0) {
                //Plugin has been disabled
                dummyWidget(widgetData);
            }
            else if (widgetData.dashData && (widgetData.dashData.isValid === false)) {
                //Plugin data is invalid
                countlyWidgets.invalidWidget(widgetData);
            }
            else {
                createPluginWidgets(widgetData);
            }
        }
        else {
            createNonPluginWidgets(widgetData);
        }

        /** function create Plugin Widgets
        * @param {Object} widgetData2 - widget data
        */
        function createPluginWidgets(widgetData2) {
            var widgetCallbacks = app.getWidgetCallbacks()[widgetData2.widget_type];

            if (!widgetCallbacks) {
                return;
            }

            if (!widgetData2.dashData) {
                //It is just a safety check to avoid errors if the widget doesnt have dashbaord data for server side fetch plugins

                return;
            }

            widgetCallbacks.create(widgetData2, bypassPosUpdate);

            if (widgetData2.allowBuckets === true) {
                createBucketButtons(widgetData2);
            }
            if ((widgetData2.widget_type === "drill" && widgetData2.visualization === "line") || (widgetData2.widget_type === "formulas" && widgetData2.visualization === "series")) {
                addZoomingFeature(widgetData2);
            }
        }

        /** function create non Plugin Widgets
        * @param {Object} widgetData2 - widget data
        */
        function createNonPluginWidgets(widgetData2) {
            switch (widgetType) {
            case "time-series":
            case "bar-chart":
            case "number":
            case "table":
                if (!widgetData2.data) {
                    return;
                }
            }

            switch (widgetType) {
            case "time-series":
                createTimeSeriesWidget(widgetData2);
                break;
            case "bar-chart":
                createBarChartWidget(widgetData2);
                break;
            case "number":
                createNumberWidget(widgetData2);
                break;
            case "table":
                createTableWidget(widgetData2);
                break;
            case "note":
                createNoteWidget(widgetData2);
            }
        }

        if (widgetData.placeholder && !bypassPosUpdate) {
            updateWidgetPosAndSize(widgetData);
        }
    }

    /** function create widget placeholder
        * @param {Object} widgetData - widget data
        * @returns {object} widget
        */
    function createWidgetPlaceholder(widgetData) {
        var widgetType = widgetData.widget_type;
        var dimensions = {
                min_height: 0,
                min_width: 0,
                height: 0,
                width: 0
            },
            position = {
                x: 0,
                y: 0
            },
            dataType = "",
            autoPosition = true,
            customClass = "",
            freshWidget;

        if (widgetData.isPluginWidget) {
            createPluginWidgetPlaceholder();
            freshWidget = (widgetData.dashData === undefined);
        }
        else {
            createNonPluginWidgetPlaceholder();
            freshWidget = (widgetData.data === undefined);
        }

        /**
         * createPluginWidgetPlaceholder()
        */
        function createPluginWidgetPlaceholder() {
            var widgetCallbacks = app.getWidgetCallbacks()[widgetType];

            if (!widgetCallbacks) {
                return;
            }

            widgetCallbacks.placeholder(dimensions, widgetData);
        }

        /**
         * createNonPluginWidgetPlaceholder()
        */
        function createNonPluginWidgetPlaceholder() {
            switch (widgetType) {
            case "time-series":
            case "bar-chart":
                dimensions.min_height = 2;
                dimensions.min_width = 6;
                dimensions.width = 6;
                dimensions.height = 3;

                dataType = "graph";
                break;
            case "number":
                dimensions.min_height = 2;
                dimensions.min_width = 2;
                dimensions.width = 2;
                dimensions.height = 3;

                dataType = "number";
                break;
            case "table":
                dimensions.min_height = 4;
                dimensions.min_width = 4;
                dimensions.width = 4;
                dimensions.height = 4;

                dataType = "table";
                break;
            case "note":
                dimensions.min_height = 1;
                dimensions.min_width = 2;
                dimensions.height = 4;
                dimensions.width = 4;
                break;
            }
        }

        var widgetPos = widgetData.position,
            widgetSize = widgetData.size;

        if (widgetPos && _.isArray(widgetPos) && widgetPos.length === 2) {
            position.x = widgetPos[0];
            position.y = widgetPos[1];

            autoPosition = false;
        }

        if (widgetSize && _.isArray(widgetSize) && widgetSize.length === 2) {
            dimensions.width = widgetSize[0];
            dimensions.height = widgetSize[1];

            if (widgetSize[1] <= 2) {
                customClass = "small-height";
            }
        }

        if (!freshWidget) {
            customClass += " transition";
        }

        var grid = $('.grid-stack').data('gridstack');
        var placeholderHtml = '<div class="grid-stack-item"> ' +
                                    '<div class="grid-stack-item-content cly-widget ' + customClass + '"> ' +
                                        '<div id="loader"> ' +
                                            '<div>Loading</div> ' +
                                        '</div> ' +
                                    '</div> ' +
                                '</div>';

        var placeHolder = $(placeholderHtml);

        placeHolder.attr("data-gs-x", position.x);
        placeHolder.attr("data-gs-y", position.y);
        placeHolder.attr("data-gs-min-height", dimensions.min_height);
        placeHolder.attr("data-gs-min-width", dimensions.min_width);
        placeHolder.attr("data-gs-width", dimensions.width);
        placeHolder.attr("data-gs-height", dimensions.height);
        placeHolder.attr("data-type", dataType);

        var $newWidget = grid.addWidget(placeHolder, position.x, position.y, dimensions.width, dimensions.height, autoPosition);

        if (!freshWidget) {
            $newWidget.find(".cly-widget").addClass("visible");
        }

        $newWidget.append("<div class='edit'></div>");
        $newWidget.append("<div class='edit-menu'>" +
                                "<div class='edit-widget item'>Edit</div>" +
                                "<div class='delete-widget item'>Delete</div>" +
                            "</div>");

        return $newWidget;
    }

    /**
     * Function to set dummy widget
     * @param {Object} widgetData - widget data
    */
    function dummyWidget(widgetData) {
        var placeholder = widgetData.placeholder;
        var loader = placeholder.find("#loader");
        var text = "<div class='no-plugin-widget'>" + jQuery.i18n.prop("dashboards.plugin-disabled", widgetData.widget_type) + " </div>";
        $(loader).html(text);
    }

    /**
     * Function to set invalid widget
     * @param {Object} widgetData - widget data
    */
    function invalidWidgetData(widgetData) {
        var placeholder = widgetData.placeholder;
        var loader = placeholder.find("#loader");
        var text = "<div class='no-plugin-widget'>" + jQuery.i18n.prop("dashboards.plugin-invalid-data", widgetData.widget_type) + " </div>";
        $(loader).html(text);
    }

    /**
     * Function to freeze widget dimensions
     * @param {Object} widget - widget data
    */
    function freezeWidgetDimensions(widget) {
        var placeHolder = widget.placeholder;
        var widgetSize = widget.size;
        var dimensions = {};

        if (widgetSize && _.isArray(widgetSize) && widgetSize.length === 2) {
            dimensions.width = widgetSize[0];
            dimensions.height = widgetSize[1];
        }

        var grid = app.customDashboardsView.getGrid();
        grid.minHeight(placeHolder, dimensions.height);
        grid.minWidth(placeHolder, dimensions.width);
        grid.maxHeight(placeHolder, dimensions.height);
        grid.maxWidth(placeHolder, dimensions.width);
    }

    /**
     * Function to reset widget options
     * @param  {Object} widget - widget data
     */
    function resetWidgetOptions(widget) {
        widget.placeholder.find(".edit-menu").remove();
        widget.placeholder.append("<div class='edit-menu'><div class='delete-widget item'>Delete</div></div>");
    }

    /** create number widget
     * @param {Object} widgetData - widget data
    */
    function createNumberWidget(widgetData) {
        var placeHolder = widgetData.placeholder;

        var title = widgetData.title,
            app = widgetData.apps,
            sparkline = widgetData.data.sparkline,
            number = Math.round(widgetData.data.total * 100) / 100,
            change = widgetData.data.change,
            additionalClasses = '';

        if (widgetData.data_type === "crash") {
            additionalClasses = "inverse-trend";
        }
        var metricValue = widgetData.metrics[0];
        var periodDesc = countlyWidgets.formatPeriod(widgetData.custom_period);

        var $widget = $(numberWidgetTemplate({
            title: title,
            period: periodDesc.name,
            sparkline: sparkline,
            number: metricValue === "dur" ? countlyCommon.formatTime(number) : number,
            trend: generateTrend(change),
            trend_fullscreen: generateTrendForFullScreen(change),
            additionalClasses: additionalClasses,
            app: {
                id: app[0],
                name: countlyDashboards.getAppName(app[0])
            }
        }));

        placeHolder.find("#loader").fadeOut();
        placeHolder.find(".cly-widget").html($widget.html());

        drawSparkline(".spark");

        if (!title) {
            if (widgetData.data_type === "event") {
                countlyDashboards.getEventName(widgetData.events[0], function(eventName) {
                    placeHolder.find(".title .name").text(eventName + " (" + countlyDashboards.getMetricLongName(widgetData.metrics[0]) + ")");
                });
            }
            else {
                placeHolder.find(".title .name").text(countlyDashboards.getMetricLongName(widgetData.metrics[0]));
            }
        }

        $(".grid-stack-item[data-widget-id=" + widgetData.widget_id + "]").find(".value").attr("data-seconds", number);

    }

    /**
     *  Adds zooming controls to widget
     *  @param {object} widgetData - widget data
     *  @param {jquery} placeHolder - jquery element where to place buttons
     */
    function addZoomingFeature(widgetData, placeHolder) {
        placeHolder = placeHolder || widgetData.placeholder;
        placeHolder.addClass("timeseries-zoompan");

        placeHolder.find('.dashboard-zoom').remove();
        placeHolder.append("<div class=\"dashboard-zoom\"><div class=\"zoom-background-facade\"></div><div class=\"edit zoom-out\"></div><div class=\"edit zoom-reset\"></div><div class=\"edit zoom-in\"></div></div>");
        widgetData.zoom = 1;

        placeHolder.find(".zoom-in").tooltipster({
            theme: "tooltipster-borderless",
            content: $.i18n.map["common.zoom-in"]
        });

        placeHolder.find(".zoom-out").tooltipster({
            theme: "tooltipster-borderless",
            content: $.i18n.map["common.zoom-out"]
        });

        placeHolder.find(".zoom-reset").tooltipster({
            theme: "tooltipster-borderless",
            content: {},
            functionFormat: function() {
                return $.i18n.prop("common.zoom-reset", Math.round(widgetData.zoom * 100));
            }
        });

        placeHolder.find(".zoom-out").off("click").on("click", function() {
            var plot = placeHolder.find(".graph").data("plot");
            plot.zoomOut({
                amount: 1.5,
                center: {left: plot.width() / 2, top: plot.height()}
            });
            widgetData.zoom /= 1.5;
        });

        placeHolder.find(".zoom-reset").off("click").on("click", function() {
            var plot = placeHolder.find(".graph").data("plot");

            plot.zoomOut({
                amount: widgetData.zoom,
                center: {left: plot.width() / 2, top: plot.height()}
            });
            widgetData.zoom = 1;

            var yaxis = plot.getAxes().yaxis;
            var panOffset = yaxis.p2c(0) - yaxis.box.height + yaxis.box.width + 2;
            if (Math.abs(panOffset) > 10) {
                plot.pan({top: panOffset});
            }

        });

        placeHolder.find(".zoom-in").off("click").on("click", function() {
            var plot = placeHolder.find(".graph").data("plot");
            plot.zoom({
                amount: 1.5,
                center: {left: plot.width() / 2, top: plot.height()}
            });
            widgetData.zoom *= 1.5;
        });
    }
    /** createTimeSeriesWidget
     * @param {Object} widgetData - widget data
    */
    function createTimeSeriesWidget(widgetData) {
        var placeHolder = widgetData.placeholder;

        addZoomingFeature(widgetData, placeHolder);

        var eventNames = {};

        if (widgetData.data_type === "event") {
            var events = widgetData.events,
                deferreds = [];

            for (var j = 0; j < events.length; j++) {
                deferreds.push(countlyDashboards.getEventNameDfd(events[j], eventNames));
            }

            $.when.apply(null, deferreds).done(function() {
                render();
            });
        }
        else {
            render();
        }

        /** render()
        */
        function render() {
            var title = widgetData.title,
                apps = widgetData.apps,
                data = widgetData.data,
                selectedMetrics = widgetData.metrics,
                series = {},
                appsInData = [],
                eventKeysInData = [];

            var customPeriod = widgetData.custom_period;
            var periodDesc = countlyWidgets.formatPeriod(customPeriod);

            if (widgetData.custom_period && periodDesc.type === "range") {
                customPeriod = periodDesc.value;
                customPeriod = customPeriod.map(function(t) {
                    return t * 1000;
                });
            }

            if (!customPeriod) {
                customPeriod = countlyCommon.getPeriod();
            }

            for (var dataId in data) {
                for (var dateTick in data[dataId]) {
                    for (var metric in data[dataId][dateTick]) {

                        if (selectedMetrics.indexOf(metric) < 0) {
                            continue;
                        }

                        if (!series[dataId + "***" + metric]) {
                            series[dataId + "***" + metric] = [];
                        }

                        series[dataId + "***" + metric].push([series[dataId + "***" + metric].length, data[dataId][dateTick][metric]]);
                    }
                }

                var appId = dataId.split("***")[0];

                if (appsInData.indexOf(appId) === -1) {
                    appsInData.push(appId);
                }

                if (widgetData.data_type === "event") {
                    var tmpEvent = dataId.split("***")[1];

                    if (eventKeysInData.indexOf(tmpEvent) === -1) {
                        eventKeysInData.push(tmpEvent);
                    }
                }
            }

            var appCount = appsInData.length,
                eventCount = eventKeysInData.length,
                graphData = [],
                serieCounter = 0;

            var seriesLabelsForApp = {};
            var dataValForLabels = {};

            for (var serie in series) {
                var label = "";
                var tmpAppId = "";
                var tmpMetric = "";
                var tmpEventKey = "";
                if (widgetData.data_type === "event") {
                    tmpAppId = serie.split("***")[0];
                    tmpEventKey = serie.split("***")[1];
                    tmpMetric = serie.split("***")[2];
                    var tmpEventId = tmpAppId + "***" + tmpEventKey;

                    if (appCount > 1) {
                        label = eventNames[tmpEventId] + " (" + countlyDashboards.getAppName(tmpAppId) + ") - " + countlyDashboards.getMetricLongName(tmpMetric);
                    }
                    else {
                        label = eventNames[tmpEventId] + " - " + countlyDashboards.getMetricLongName(tmpMetric);
                    }

                    if (!seriesLabelsForApp[tmpAppId]) {
                        seriesLabelsForApp[tmpAppId] = [];
                    }

                    if (eventCount > 1) {
                        seriesLabelsForApp[tmpAppId].push({
                            color: countlyCommon.GRAPH_COLORS[serieCounter],
                            label: eventNames[tmpEventId]
                        });
                    }
                    else {
                        seriesLabelsForApp[tmpAppId].push({
                            color: countlyCommon.GRAPH_COLORS[serieCounter],
                            label: countlyDashboards.getMetricLongName(tmpMetric)
                        });
                    }
                }
                else {
                    tmpAppId = serie.split("***")[0];
                    tmpMetric = serie.split("***")[1];

                    if (!seriesLabelsForApp[tmpAppId]) {
                        seriesLabelsForApp[tmpAppId] = [];
                    }

                    if (appCount > 1) {
                        label = countlyDashboards.getAppName(tmpAppId) + " - " + countlyDashboards.getMetricLongName(tmpMetric);

                        seriesLabelsForApp[tmpAppId].push({
                            color: countlyCommon.GRAPH_COLORS[serieCounter]
                        });
                    }
                    else {
                        label = countlyDashboards.getMetricLongName(tmpMetric);

                        seriesLabelsForApp[tmpAppId].push({
                            color: countlyCommon.GRAPH_COLORS[serieCounter],
                            label: countlyDashboards.getMetricLongName(tmpMetric)
                        });
                    }
                }

                serieCounter++;

                graphData.push({
                    data: series[serie],
                    label: label
                });

                dataValForLabels[serie] = label;
            }

            var templateApps = [];

            for (var i = 0; i < apps.length; i++) {
                if (appsInData.indexOf(apps[i]) !== -1) {
                    templateApps.push({
                        id: apps[i],
                        name: countlyDashboards.getAppName(apps[i]),
                        labels: seriesLabelsForApp[apps[i]]
                    });
                }
            }

            var $widget = $(timeSeriesWidgetTemplate({
                title: title,
                period: periodDesc.name,
                apps: templateApps
            }));

            placeHolder.find("#loader").fadeOut();
            placeHolder.find(".cly-widget").html($widget.html());

            placeHolder.attr("data-graph-labels", JSON.stringify(dataValForLabels));

            var countlyCommonInstance = new CommonConstructor();
            countlyCommonInstance.setPeriod(customPeriod, null, true);

            countlyCommonInstance.drawTimeGraph(graphData, placeHolder.find(".graph"), null, null, null, apps, {
                series: {lines: {show: true}, splines: {show: false}},
                zoom: {active: true},
                pan: {interactive: true, active: true, mode: "smartLock", frameRate: 120},
                xaxis: {zoomRange: false, panRange: false},
                yaxis: {showZeroTick: true, ticks: 5},
            });

            if (!title) {
                var widgetTitle = "",
                    metrics = widgetData.metrics;

                if (widgetData.data_type === "event") {
                    var eventCounter = 0;

                    for (var eventName in eventNames) {
                        if (eventCounter !== 0) {
                            widgetTitle += ", ";
                        }

                        widgetTitle += eventNames[eventName];
                        eventCounter++;
                    }
                }

                var widgetTitleLabel = "";

                for (var z = 0; z < metrics.length; z++) {
                    if (z !== 0) {
                        widgetTitleLabel += ", ";
                    }

                    widgetTitleLabel += countlyDashboards.getMetricLongName(metrics[z]);
                }

                if (widgetTitleLabel) {
                    if (widgetData.data_type === "event") {
                        widgetTitle += "<span class='label'>" + widgetTitleLabel + "</span>";
                    }
                    else {
                        widgetTitle += widgetTitleLabel;
                    }
                }

                placeHolder.find(".title .name").html(widgetTitle);
            }
        }
    }

    /** createBarChartWidget
     * @param {Object} widgetData - widget data
    */
    function createBarChartWidget(widgetData) {
        var placeHolder = widgetData.placeholder;

        var eventNames = {};

        if (widgetData.data_type === "event") {
            $.when.apply(null, [countlyDashboards.getEventNameDfd(widgetData.events[0], eventNames)]).done(function() {
                render();
            });
        }
        else {
            render();
        }
        /** render()
        */
        function render() {
            placeHolder.alterClass('tick-color-*', "tick-color-" + (widgetData.bar_color || 1));

            var title = widgetData.title,
                app = widgetData.apps,
                data = widgetData.data;

            var periodDesc = countlyWidgets.formatPeriod(widgetData.custom_period);

            var graphData = {
                dp: [{ data: [], color: countlyWidgets.barColors[widgetData.bar_color - 1 || 0] }],
                ticks: []
            };

            if (data) {
                for (var i = 0; i < data.length; i++) {
                    graphData.dp[0].data.push([i, data[i].value]);
                    graphData.ticks.push([i, data[i].name]);
                }
            }

            var appName = countlyDashboards.getAppName(app[0]),
                appId = app[0];

            var $widget = $(barChartWidgetTemplate({
                title: title,
                period: periodDesc.name,
                app: {
                    id: appId,
                    name: appName
                }
            }));

            placeHolder.find("#loader").fadeOut();
            placeHolder.find(".cly-widget").html($widget.html());

            if (graphData.dp[0].data.length) {
                placeHolder.find(".no-data").hide();
                placeHolder.find(".graph").show();
                countlyCommon.drawGraph(graphData, placeHolder.find(".graph"), "bar");
            }
            else {
                placeHolder.find(".graph").hide();
                placeHolder.find(".no-data").show();
            }

            if (!title) {
                var widgetTitle = "";

                if (widgetData.data_type === "event") {
                    for (var eventName in eventNames) {
                        widgetTitle = eventNames[eventName];
                    }

                    widgetTitle += " (" + countlyDashboards.getMetricLongName(widgetData.metrics[0]) + ")";
                    widgetTitle += " BY " + widgetData.breakdowns[0];

                }
                else {
                    widgetTitle = countlyDashboards.getMetricLongName(widgetData.metrics[0]);
                    widgetTitle += " BY " + countlyDashboards.getBreakdownLongName(widgetData.breakdowns[0]);
                }

                placeHolder.find(".title .name").text(widgetTitle);
            }
        }
    }

    /** createTableWidget
     * @param {Object} widgetData - widget data
    */
    function createTableWidget(widgetData) {
        var placeHolder = widgetData.placeholder;

        var eventNames = {};

        if (widgetData.data_type === "event") {
            $.when.apply(null, [countlyDashboards.getEventNameDfd(widgetData.events[0], eventNames)]).done(function() {
                render();
            });
        }
        else {
            render();
        }
        /** render()
        */
        function render() {
            var title = widgetData.title,
                app = widgetData.apps,
                data = widgetData.data;

            var appName = countlyDashboards.getAppName(app[0]),
                appId = app[0],
                tableCols = [];

            for (var i = 0; i < data.cols.length; i++) {
                tableCols.push(countlyDashboards.getBreakdownLongName(countlyDashboards.getMetricLongName(data.cols[i])));
            }

            var periodDesc = countlyWidgets.formatPeriod(widgetData.custom_period);

            var $widget = $(tableWidgetTemplate({
                title: title,
                period: periodDesc.name,
                app: {
                    id: appId,
                    name: appName
                },
                cols: tableCols,
                rows: data.rows
            }));

            placeHolder.find("#loader").fadeOut();
            placeHolder.find(".cly-widget").html($widget.html());

            if (!title) {
                var widgetTitle = "";

                if (widgetData.data_type === "event") {
                    for (var eventName in eventNames) {
                        widgetTitle = eventNames[eventName];
                    }

                    widgetTitle += " BY " + widgetData.breakdowns[0];

                }
                else {
                    widgetTitle = "SESSIONS BY " + countlyDashboards.getBreakdownLongName(widgetData.breakdowns[0]);
                }

                placeHolder.find(".title .name").text(widgetTitle);
            }
        }
    }

    /** refreshWidget
     * @param {Object} widgetData - widget data
    */
    function refreshWidget(widgetData) {
        var widgetType = widgetData.widget_type;
        var widgetEl = $(".grid-stack-item[data-widget-id=" + widgetData.widget_id + "]");

        if (!widgetEl || !widgetEl.length) {
            //First the widget element needs to be created by going through the create flow.
            //Only then can we refresh it.
            return;
        }

        if (!widgetData.orchestration) {
            //Setting the refresh orchestration stage here
            widgetData.orchestration = {
                stage: "refresh",
                widgetEl: widgetEl
            };
        }

        refreshNonPluginWidgets();
        refreshPluginWidgets();

        /** refreshPluginWidgets()
        */
        function refreshPluginWidgets() {
            var widgetCallbacks = app.getWidgetCallbacks()[widgetType];

            if (widgetData.allowBuckets === true) {
                var my_buckets = getValidBuckets(widgetData);
                fixBucketButtons(my_buckets, widgetEl, widgetData);
            }

            if (!widgetCallbacks) {
                return;
            }

            if (countlyGlobal.plugins.indexOf(widgetType) < 0) {
                //Plugin has been disabled
                return;
            }

            if (widgetData.client_fetch) {
                //Refresh client fetch widget from orchestrator
                return;
            }

            if (!widgetData.dashData) {
                //Widget has no data
                return;
            }

            if (widgetData.dashData && (widgetData.dashData.isValid === false)) {
                //Plugin data is invalid
                return;
            }

            widgetCallbacks.refresh(widgetEl, widgetData);
        }

        /** refreshNonPluginWidgets()
        */
        function refreshNonPluginWidgets() {
            switch (widgetType) {
            case "time-series":
                refreshTimeSeriesWidget(widgetEl, widgetData);
                break;
            case "bar-chart":
                refreshBarChartWidget(widgetEl, widgetData);
                break;
            case "number":
                refreshNumberWidget(widgetEl, widgetData);
                break;
            case "table":
                refreshTableWidget(widgetEl, widgetData);
                break;
            }
        }
    }

    /** refreshNumberWidget
    * @param {Object} widgetEl - widget element
     * @param {Object} widgetData - widget data
    */
    function refreshNumberWidget(widgetEl, widgetData) {
        var change = widgetData.data.change;

        widgetEl.find(".spark").attr("values", widgetData.data.sparkline);
        drawSparkline(".spark");

        var valueEl = widgetEl.find(".value"),
            metricValue = widgetData.metrics[0],
            currVal = (metricValue === "dur" ? valueEl.attr("data-seconds") : parseFloat(valueEl.text())) || 0,
            targetVal = widgetData.data.total;

        if (targetVal !== currVal) {
            jQuery({someValue: currVal, currEl: valueEl}).animate({someValue: targetVal}, {
                duration: 2000,
                easing: 'easeInOutQuint',
                step: function() {
                    if (metricValue === "dur") {
                        this.currEl.text(countlyCommon.formatTime(Math.round(this.someValue)));
                    }
                    else if ((targetVal + "").indexOf(".") === -1) {
                        this.currEl.text(Math.round(this.someValue));
                    }
                    else {
                        this.currEl.text(parseFloat((this.someValue).toFixed(1)));
                    }
                },
                complete: function() {
                    widgetEl.find(".value").attr("data-seconds", this.someValue);
                }
            });
        }

        widgetEl.find(".trend .val").replaceWith(generateTrend(change));
        widgetEl.find(".trend.full-screen").html(generateTrendForFullScreen(change));
        countlyWidgets.setPeriod(widgetEl, widgetData.custom_period);
    }

    /** refreshTimeSeriesWidget
    * @param {Object} widgetEl - widget element
     * @param {Object} widgetData - widget data
    */
    function refreshTimeSeriesWidget(widgetEl, widgetData) {
        var data = widgetData.data,
            selectedMetrics = widgetData.metrics,
            series = {},
            graphData = [];

        for (var dataId in data) {
            for (var dateTick in data[dataId]) {
                for (var metric in data[dataId][dateTick]) {

                    if (selectedMetrics.indexOf(metric) < 0) {
                        continue;
                    }

                    if (!series[dataId + "***" + metric]) {
                        series[dataId + "***" + metric] = [];
                    }

                    series[dataId + "***" + metric].push([series[dataId + "***" + metric].length, data[dataId][dateTick][metric]]);
                }
            }
        }

        var dataValForLabels = widgetEl.attr("data-graph-labels");
        dataValForLabels = dataValForLabels ? JSON.parse(dataValForLabels) : dataValForLabels;

        for (var serie in series) {
            graphData.push({
                data: series[serie],
                label: (dataValForLabels) ? dataValForLabels[serie] : ""
            });
        }

        var customPeriod = widgetData.custom_period;
        var periodDesc = countlyWidgets.formatPeriod(customPeriod);

        if (widgetData.custom_period && periodDesc.type === "range") {
            customPeriod = periodDesc.value;
            customPeriod = customPeriod.map(function(t) {
                return t * 1000;
            });
        }

        if (!customPeriod) {
            customPeriod = countlyCommon.getPeriod();
        }

        var countlyCommonInstance = new CommonConstructor();
        countlyCommonInstance.setPeriod(customPeriod, null, true);

        countlyCommonInstance.drawTimeGraph(graphData, widgetEl.find(".graph"), null, null, null, widgetData.apps, {
            series: {lines: {show: true}, splines: {show: false}},
            zoom: {active: true},
            pan: {interactive: true, active: true, mode: "smartLock", frameRate: 120},
            xaxis: {zoomRange: false, panRange: false},
            yaxis: {showZeroTick: true, ticks: 5},
        });

        countlyWidgets.setPeriod(widgetEl, widgetData.custom_period);
    }

    /** refreshBarChartWidget
    * @param {Object} widgetEl - widget element
     * @param {Object} widgetData - widget data
    */
    function refreshBarChartWidget(widgetEl, widgetData) {
        var data = widgetData.data;

        var graphData = {
            dp: [{ data: [], color: countlyWidgets.barColors[widgetData.bar_color - 1 || 0] }],
            ticks: []
        };

        if (data) {
            for (var i = 0; i < data.length; i++) {
                graphData.dp[0].data.push([i, data[i].value]);
                graphData.ticks.push([i, data[i].name]);
            }
        }

        if (graphData.dp[0].data.length) {
            widgetEl.find(".no-data").hide();
            widgetEl.find(".graph").show();
            countlyCommon.drawGraph(graphData, widgetEl.find(".graph"), "bar");
        }
        else {
            widgetEl.find(".graph").hide();
            widgetEl.find(".no-data").show();
        }

        countlyWidgets.setPeriod(widgetEl, widgetData.custom_period);
    }

    /** createNoteWidget
     * @param {Object} widgetData - widget data
    */
    function createNoteWidget(widgetData) {
        var placeholder = widgetData.placeholder;

        var loader = placeholder.find("#loader");
        if (!loader.length) {
            return;
        }

        var style = "", fontSize, lineHeight;
        if (widgetData.font_size && !Number.isNaN(parseFloat(widgetData.font_size))) {
            fontSize = parseFloat(widgetData.font_size);
            lineHeight = fontSize + 7;
        }
        else {
            fontSize = 15;
            lineHeight = 22;
        }

        style += 'font-size: ' + fontSize + 'px;';
        style += 'line-height: ' + lineHeight + 'px;';

        if (widgetData.bar_color) {
            style += 'color: ' + countlyWidgets.barColors[widgetData.bar_color - 1 || 0] + ';';
        }

        if (widgetData.text_decoration) {
            for (var i = 0 ; i < widgetData.text_decoration.length; i++) {
                if (widgetData.text_decoration[i] === "b") {
                    style += 'font-weight: bold;';
                }

                if (widgetData.text_decoration[i] === "i") {
                    style += 'font-style: italic;';
                }

                if (widgetData.text_decoration[i] === "u") {
                    style += 'text-decoration: underline;';
                }
            }
        }

        var text = "<div class='content'><p style='" + style + "'>" + widgetData.content + "</p></div> ";
        $(loader).parent().css("overflow-y", "hidden");
        $(loader).addClass("note-placeholder");
        $(loader).html(text);

        $(loader).attr('id', 'note-widget-content');
        if ($(loader).children()[0].scrollHeight > $(loader).children()[0].clientHeight) {
            $(loader).html(text);
        }
    }

    /** refreshTableWidget
    * @param {Object} widgetEl - widget element
     * @param {Object} widgetData - widget data
    */
    function refreshTableWidget(widgetEl, widgetData) {
        var data = widgetData.data;
        var tableCols = [];

        for (var i = 0; i < data.cols.length; i++) {
            tableCols.push(countlyDashboards.getMetricLongName(data.cols[i]));
        }

        var $widget = $(tableWidgetTemplate({
            title: "",
            app: { id: "", name: "" },
            cols: tableCols,
            rows: data.rows
        }));

        widgetEl.find("table").replaceWith($widget.find("table"));
        countlyWidgets.setPeriod(widgetEl, widgetData.custom_period);
    }

    /** generateTrend
    * @param {number} changePercent -changePercent
    * @returns {string} outerHTML
    */
    function generateTrend(changePercent) {
        var $toRet = $("<span class='val'>");

        if (changePercent.indexOf("-") !== -1) {
            $toRet.text(changePercent.replace("-", "") + " lower");
            $toRet.addClass("down");
        }
        else if (changePercent.indexOf("∞") !== -1 || changePercent.indexOf("NA") !== -1) {
            $toRet.text("unknown");
            $toRet.addClass("unknown");
        }
        else {
            $toRet.text(changePercent + " higher");
            $toRet.addClass("up");
        }

        return $toRet[0].outerHTML;
    }

    /** generateTrendForFullScreen
    * @param {number} changePercent -changePercent
    * @returns {string} outerHTML
    */
    function generateTrendForFullScreen(changePercent) {
        var $toRet = $("<span>");

        if (changePercent.indexOf("-") !== -1) {
            $toRet.text(changePercent);
            $toRet.addClass("down");
            $toRet.append('<i class="material-icons">trending_down</i>');
        }
        else if (changePercent.indexOf("∞") !== -1 || changePercent.indexOf("NA") !== -1) {
            $toRet.addClass("unknown");
            $toRet.append('<i class="material-icons">trending_flat</i>');
        }
        else {
            $toRet.text(changePercent);
            $toRet.addClass("up");
            $toRet.append('<i class="material-icons">trending_up</i>');
        }

        return $toRet[0].outerHTML;
    }

    /** drawSparkline
    * @param {string} selector -selector
    */
    function drawSparkline(selector) {
        $(selector).sparkline('html', {
            type: 'line',
            height: '40',
            width: '150',
            lineColor: '#49c1e9',
            fillColor: "transparent",
            lineWidth: 1.5,
            spotColor: '#49c1e9',
            minSpotColor: "transparent",
            maxSpotColor: "transparent",
            highlightSpotColor: "transparent",
            highlightLineColor: "transparent",
            spotRadius: 3,
            drawNormalOnTop: false,
            disableTooltips: true
        });
    }

    /** updateWidgetPosAndSize
     * @param {Object} widgetData - widget data
    */
    function updateWidgetPosAndSize(widgetData) {
        if (!widgetData.placeholder) {
            return;
        }

        $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.w + "/dashboards/update-widget",
            data: {
                "dashboard_id": widgetData.dashboard_id,
                "widget_id": widgetData.widget_id,
                "widget": JSON.stringify({
                    position: getWidgetPosition(widgetData.placeholder),
                    size: getWidgetSize(widgetData.placeholder)
                })
            },
            success: function(res) {
                if (res && res.error) {
                    if (res.dashboard_access_denied) {
                        accessDeniedPopup();
                    }
                    return;
                }
            }
        });
    }

    /** getWidgetPosition
     * @param {Object} widgetEl - widget element
     * @returns {Array} [xpos, ypos]
    */
    function getWidgetPosition(widgetEl) {
        return [parseInt(widgetEl.attr("data-gs-x")), parseInt(widgetEl.attr("data-gs-y"))];
    }

    /** getWidgetSize
     * @param {Object} widgetEl - widget element
     * @returns {Array} [width, height]
    */
    function getWidgetSize(widgetEl) {
        return [parseInt(widgetEl.attr("data-gs-width")), parseInt(widgetEl.attr("data-gs-height"))];
    }

    /** access denied popup
    */
    function accessDeniedPopup() {
        if ($(".dialog.popStyleGreen").length) {
            return;
        }
        $(".dialog.popStyleGreen").remove();
        CountlyHelpers.confirm(jQuery.i18n.map["dashboards.access-denied"], "popStyleGreen", function(result) {
            if (!result) {
                return;
            }
            app.navigate("", true);
        }, [], { title: jQuery.i18n.map["dashbaords.access-denied-title"] });
    }

    /** edit access denied popup
    */
    function editAccessDeniedPopup() {
        if ($(".dialog.popStyleGreen").length) {
            return;
        }
        $(".dialog.popStyleGreen").remove();
        CountlyHelpers.confirm(jQuery.i18n.map["dashboards.edit-access-denied"], "popStyleGreen", function(/*result*/) {
            return;
        }, [], { title: jQuery.i18n.map["dashbaords.access-denied-title"] });
    }

})(window.countlyWidgets = window.countlyWidgets || {}, jQuery);