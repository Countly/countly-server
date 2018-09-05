window.MonetizationMetricsView = countlyView.extend({
    templateData: {},
    beforeRender: function() {

        var self = this;

        if (self.template && self.bigNumbersTemplate) {
            return $.when(countlyMonetization.initialize());
        }
        else {
            return $.when($.get(countlyGlobal["path"] + '/video-intelligence-monetization/templates/metrics.html', function(src) {
                self.template = Handlebars.compile(src);
            }), $.get(countlyGlobal["path"] + '/video-intelligence-monetization/templates/bignumbers.html', function(src) {
                self.bigNumbersTemplate = Handlebars.compile(src);
            }), countlyMonetization.initialize());
        }

    },
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
    renderCommon: function(isRefresh) {
        var self = this;
        if (!isRefresh) {
            $(this.el).html(self.template(this.templateData));
            self.initializeEventSelector();
            self.updateView(false);
        }
    },
    updateChart: function(fetchData) {
        var self = this;
        var data = self.getData();
        self.renderChart(data.chartDP);
    },
    updateView: function(isRefresh) {
        var self = this;
        var data = self.getData();
        self.renderChart(data.chartDP);
        self.renderNumbers(data.bigNumbersData);
        self.renderTable(data.tableData, isRefresh);
    },
    refresh: function() {
        var self = this;
        $.when(
            countlyMonetization.requestMetricData()
        ).done(function() {
            self.updateView(true);
        });
    },
    renderChart: function(data) {
        var enabledLines = countlyMonetization.getEnabledEvents();
        var dataToBeRendered = [];
        enabledLines.forEach(function(key) {
            dataToBeRendered.push(data[key]);
        });
        return countlyCommon.drawTimeGraph(dataToBeRendered, "#chartContainer");
    },
    renderNumbers: function(data) {
        var self = this;
        var compiled = self.bigNumbersTemplate({
            "bignumbers": data
        });

        $("#big-numbers-container").html(compiled);
    },
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
    getData: function() {
        return countlyMonetization.getMetricData();
    },
});

window.monetizationIntegrationView = countlyView.extend({
    beforeRender: function() {
        var self = this;
        if (!self.integrationTemplate) {
            return $.when($.get(countlyGlobal["path"] + '/video-intelligence-monetization/templates/integration.html', function(src) {
                self.integrationTemplate = Handlebars.compile(src);
            })).then(function() {});
        }
    },
    renderCommon: function(isRefresh) {
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
    refresh: function() {

    },
    destroy: function() {
        if (window.monetization_iFrame) {
            window.monetization_iFrame.close();
            window.monetization_iFrame = null;
        }
        window.monetization_iFrameResize = undefined;
    }
});

app.monetizationIntegrationView = new monetizationIntegrationView();
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