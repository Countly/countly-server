/*global $, jQuery, app, countlyView, countlyCommon, countlyGlobal, Handlebars, CountlyHelpers, DataPointsView, countlyDataPoints*/

window.DataPointsView = countlyView.extend({
    beforeRender: function() {
        var self = this;

        return $.when($.get(countlyGlobal.path + '/server-stats/templates/data-points.html', function(src) {
            self.template = Handlebars.compile(src);
        }), countlyDataPoints.initialize()).then(function() {});
    },
    renderCommon: function(isRefresh) {
        var self = this;

        this.templateData = {
            "page-title": jQuery.i18n.map["server-stats.data-points"],
            "periods": countlyDataPoints.getPeriods()
        };

        if (!isRefresh) {
            self.el.html(this.template(this.templateData));

            self.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": countlyDataPoints.getTableData(),
                "aoColumns": [
                    { "mData": "app-name", "sType": "string", "sTitle": jQuery.i18n.map["compare.apps.app-name"] || "App Name", "sClass": "break" },
                    {
                        "mData": "sessions",
                        "sType": "formatted-num",
                        "mRender": function(d) {
                            return countlyCommon.formatNumber(d);
                        },
                        "sTitle": jQuery.i18n.map["sidebar.analytics.sessions"]
                    },
                    {
                        "mData": "events",
                        "sType": "formatted-num",
                        "mRender": function(d) {
                            return countlyCommon.formatNumber(d);
                        },
                        "sTitle": jQuery.i18n.map["sidebar.events"]
                    },
                    {
                        "mData": "data-points",
                        "sType": "formatted-num",
                        "mRender": function(d) {
                            return countlyCommon.formatNumber(d);
                        },
                        "sTitle": jQuery.i18n.map["server-stats.data-points"]
                    }
                ]
            }));

            $(".d-table").stickyTableHeaders();

            $("#data-points-period").on("click", ".button", function() {
                var period = $(this).data("period");
                countlyDataPoints.setPeriod(period);

                CountlyHelpers.refreshTable(self.dtable, countlyDataPoints.getTableData());

                $("#data-points-period").find(".button").removeClass("active");
                $(this).addClass("active");
            });
        }
    },
    refresh: function() {
        return true;
    }
});

app.dataPointsView = new DataPointsView();

app.route("/manage/data-points", '', function() {
    this.renderWhenReady(this.dataPointsView);
});

$(document).ready(function() {
    app.addMenu("management", {code: "data-point", url: "#/manage/data-points", text: "server-stats.data-points", icon: '<div class="logo-icon ion-ios-analytics"></div>', priority: 80});
});