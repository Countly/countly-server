/*global $, jQuery, app, production, countlyView, countlyCommon, countlyGlobal, Handlebars, CountlyHelpers, countlyMonetization, MonetizationIntegrationView, MonetizationMetricsView, iFrameResize */

window.MonetizationMetricsView = countlyView.extend({
    templateData: {},

    /**
    * beforeRender view hook, initializes the template load request.
    * @returns {Promise} Returns a promise which will be resolved when templates and/or data are ready.
    **/
    beforeRender: function() {

        var self = this;

        if (self.template && self.bigNumbersTemplate) {
            return $.when(countlyMonetization.initialize());
        }
        else {
            return $.when($.get(countlyGlobal.path + '/video-intelligence-monetization/templates/metrics.html', function(src) {
                self.template = Handlebars.compile(src);
            }), $.get(countlyGlobal.path + '/video-intelligence-monetization/templates/bignumbers.html', function(src) {
                self.bigNumbersTemplate = Handlebars.compile(src);
            }), countlyMonetization.initialize());
        }
    },

    /**
    * Event types rendered in chart are togglable. This initializes the buttons
    * which manage that event states.
    * @returns {undefined} Returns nothing
    **/
    initializeEventSelector: function() {
        var self = this;
        $("#big-numbers-container").on("click", ".check", function() {
            var classes = $(this).attr('class');
            var id = $(this).attr('data-id');

            if (classes.indexOf('selected') >= 0) {
                if (countlyMonetization.tryDisableEvent(id)) {
                    $(this).removeClass("selected");
                }
            }
            else {
                $(this).addClass("selected");
                countlyMonetization.enableEvent(id);
            }

            self.updateChart();
        });
    },

    /**
    * renderCommon view hook, initializes the template load request.
    * @param {boolean} isRefresh - ensures that it is the first render
    * @returns {undefined} Returns nothing
    **/
    renderCommon: function(isRefresh) {
        var self = this;
        if (!isRefresh) {
            $(this.el).html(self.template(this.templateData));
            self.initializeEventSelector();
            self.updateView(false);
        }
    },

    /**
    * Chart needs to be updated independently, so the only responsibility is that.
    * @returns {undefined} Returns nothing
    **/
    updateChart: function() {
        var self = this;
        var data = self.getData();
        self.renderChart(data.chartDP);
    },

    /**
    * Updates three fundamental components, should be called when data is ready.
    * @param {boolean} isRefresh - renderTable works differently if it is only a refresh, that's why the function needs it
    * @returns {undefined} Returns nothing
    **/
    updateView: function(isRefresh) {
        var self = this;
        var data = self.getData();
        self.renderChart(data.chartDP);
        self.renderNumbers(data.bigNumbersData);
        self.renderTable(data.tableData, isRefresh);
    },

    /**
    * Requests the data, updates view when the data arrives.
    * @returns {undefined} Returns nothing
    **/
    refresh: function() {
        var self = this;
        $.when(
            countlyMonetization.requestMetricData()
        ).done(function() {
            self.updateView(true);
        });
    },

    /**
    * Renders the chart using the passed data. Only renders enabled events.
    * @param {object} data - Processed data from model.
    * @returns {undefined} Returns nothing
    **/
    renderChart: function(data) {
        var enabledLines = countlyMonetization.getEnabledEvents();
        var dataToBeRendered = [];
        enabledLines.forEach(function(key) {
            dataToBeRendered.push(data[key]);
        });
        countlyCommon.drawTimeGraph(dataToBeRendered, "#chartContainer");
    },

    /**
    * Renders the big numbers. Default number of boxes is 3 and less or more boxes
    * would cause design changes.
    * @param {object[]} data - Array of event data objects.
    * @returns {undefined} Returns nothing
    **/
    renderNumbers: function(data) {
        var self = this;
        var compiled = self.bigNumbersTemplate({
            "bignumbers": data
        });

        $("#big-numbers-container").html(compiled);
    },

    /**
    * Renders the table with given data.
    * @param {object} data - Processed data from model.
    * @param {boolean} isRefresh - If it is NOT a refresh, table needs to be created from scratch.
    Otherwise, it should just be refreshed using CountlyHelpers. This guarantees that search works
    well even a refresh() call occurs.
    * @returns {undefined} Returns nothing
    **/
    renderTable: function(data, isRefresh) {
        var self = this;

        var tableData = data;
        if (isRefresh) {
            CountlyHelpers.refreshTable($('#dataTable').dataTable(), tableData);
        }
        else {
            self.createTable(data);
        }
    },

    /**
    * Initializes the table. Should be called only once, view may crash otherwise.
    * @param {object} data - Processed data from model.
    * @returns {undefined} Returns nothing
    **/
    createTable: function(data) {
        var aoColumns = [{
            "mData": "date",
            "sType": "customDate",
            "sTitle": jQuery.i18n.map["common.date"]
        }];

        var eventColumns = countlyMonetization.getColumns();

        for (var ekey in eventColumns) {
            aoColumns.push({
                "mData": ekey,
                sType: "formatted-num",
                "mRender": function(d) {
                    return countlyCommon.formatNumber(d);
                },
                "sTitle": jQuery.i18n.map[eventColumns[ekey].localize]
            });
        }

        this.dtable = $('#dataTable').dataTable($.extend({}, $.fn.dataTable.defaults, {
            "aaData": data,
            "aoColumns": aoColumns
        }));

        $("#dataTable").stickyTableHeaders();
    },

    /**
    * The only way to access to model data.
    * @returns {object} Returns model data
    **/
    getData: function() {
        return countlyMonetization.getMetricData();
    },
});

window.MonetizationIntegrationView = countlyView.extend({
    /**
    * Integration view is almost empty. It only contains an iframe.
    * @returns {undefined} Returns nothing
    **/
    beforeRender: function() {
        var self = this;
        if (!self.integrationTemplate) {
            return $.when($.get(countlyGlobal.path + '/video-intelligence-monetization/templates/integration.html', function(src) {
                self.integrationTemplate = Handlebars.compile(src);
            })).then(function() {});
        }
    },

    /**
    * The iframe needs to be resized w.r.t. screen size. Since iframe operations
    * are a bit complicated, iFrameResizer --an external plugin-- handles that.
    * @returns {undefined} Returns nothing
    **/
    renderCommon: function() {
        $(this.el).html(this.integrationTemplate({}));
        if (!window.monetization_iFrameResize) {
            window.monetization_iFrameResize = function() {
                var ifrm = iFrameResize({
                    interval: 5000,
                    log: false
                }, '#vi-integration');
                if (ifrm[0].iFrameResizer) {
                    window.monetization_iFrame = ifrm[0].iFrameResizer;
                }
            };
        }
    },

    /**
    *
    * @returns {undefined} Returns nothing
    **/
    refresh: function() {

    },

    /**
    * iFrameResizer contains an interval-based checker that needs to be destroyed when
    * the view is disposed.
    * @returns {undefined} Returns nothing
    **/
    destroy: function() {
        if (window.monetization_iFrame) {
            window.monetization_iFrame.close();
            window.monetization_iFrame = null;
        }
        window.monetization_iFrameResize = undefined;
    }
});

app.monetizationIntegrationView = new MonetizationIntegrationView();
app.monetizationMetricsView = new MonetizationMetricsView();

app.route("/monetization/integration", 'monetization-integration', function() {
    this.renderWhenReady(this.monetizationIntegrationView);
});

app.route("/monetization/metrics", 'monetization-metrics', function() {
    this.renderWhenReady(this.monetizationMetricsView);
});

$(document).ready(function() {

    var folder = '<a class="item" id="sidebar-monetization"><div class="logo ion-social-usd"></div><div class="text" data-localize="monetization.title"></div><span class="ion-chevron-right"></span></a>';
    var items = [
        '<a href="#/monetization/integration" class="item"><div class="text" data-localize="monetization.integration">Integration</div></a>',
        '<a href="#/monetization/metrics" class="item"><div class="text" data-localize="monetization.metrics">Metrics</div></a>'
    ];
    var wrapper = '<div class="sidebar-submenu" id="monetization-submenu">' + items.join('') + '</div>';

    if (!production) {
        CountlyHelpers.loadJS("video-intelligence-monetization/javascripts/iframeResizer.js");
    }
    if ($('.sidebar-menu #management-menu').length) {
        $('.sidebar-menu #management-menu').before(folder + wrapper);
    }
    else {
        $('.sidebar-menu').append(folder + wrapper);
    }
});