/*global $, jQuery, app, countlyView, countlyCommon, countlyGlobal, Handlebars, CountlyHelpers, DataPointsView, countlyDataPoints, moment*/

window.DataPointsView = countlyView.extend({
    beforeRender: function() {
        var self = this;
        self.date_range = this.getDateRange("current");

        return $.when($.get(countlyGlobal.path + '/server-stats/templates/data-points.html', function(src) {
            self.template = Handlebars.compile(src);
        }), countlyDataPoints.initialize()).then(function() {
            countlyDataPoints.punchCard(self.date_range).then(function() {
                self.punchCardData = countlyDataPoints.getPunchCardData();
            });
        });
    },
    getDateRange: function(period) {

        var MONTHS_12 = "12_months";
        var MONTHS_6 = "6_months";
        var MONTHS_3 = "3_months";
        var CURRENT = "current";

        /**
         *  isSingleMonth function should be checking month is single or not
         * @param {String} getPeriod - period
         * @returns {Boolean} -
         */
        function isSingleMonth(getPeriod) {
            if (getPeriod !== CURRENT && getPeriod !== MONTHS_12 && getPeriod !== MONTHS_6 && getPeriod !== MONTHS_3) {
                return true;
            }
            return false;
        }

        /**
         * formatPeriod
         * @param {*} m - period
         * @returns {String} -
         */
        function formatPeriod(m) {
            if (isSingleMonth(m)) {
                return m.replace("-", ":");
            }
            return calculateMonths(m);
        }

        /**
         * calculateMonths
         * @param {*} calculatePeriods - period
         * @returns {*} -
         */
        function calculateMonths(calculatePeriods) {
            /**
             * calculateCurrent
             * @returns {String} - period
             */
            function calculateCurrent() {
                var d = moment();
                return d.year() + ":" + (d.month() + 1);
            }
            /**
             * calculateMoment
             * @param {*} periodFormat - period
             * @returns {String} -
             */
            function calculateMoment(periodFormat) {
                var date;
                var response = [];
                for (var index = 0; index < periodFormat; index++) {
                    date = moment().add(-1 * index, "M");
                    response.push(date.year() + ":" + (date.month() + 1));
                }
                return response.join(",");
            }
            /**
             * calculatePeriod
             * @param {*} calculateMonth -f
             * @returns {*} -
             */
            function calculatePeriod(calculateMonth) {
                switch (calculateMonth) {
                case MONTHS_12:
                    return calculateMoment(12);
                case MONTHS_6:
                    return calculateMoment(6);
                case MONTHS_3:
                    return calculateMoment(3);
                case CURRENT:
                    return calculateCurrent();
                default:
                    break;
                }
            }

            return calculatePeriod(calculatePeriods);
        }

        return formatPeriod(period);
    },
    renderCommon: function(isRefresh) {
        var self = this;

        this.templateData = {
            "page-title": jQuery.i18n.map["server-stats.data-points"],
            "periods": countlyDataPoints.getPeriods()
        };

        if (!isRefresh) {
            self.el.html(this.template(this.templateData));
            self.updateView();

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
                self.date_range = self.getDateRange(period);
                $.when(
                    countlyDataPoints.punchCard(self.date_range)
                ).done(function() {
                    self.punchCardData = countlyDataPoints.getPunchCardData();
                    self.updateView();
                });
                CountlyHelpers.refreshTable(self.dtable, countlyDataPoints.getTableData());
                $("#data-points-period").find(".button").removeClass("active");
                $(this).addClass("active");
            });
        }
    },
    updateView: function() {
        $('#chart').empty();
        countlyDataPoints.loadPunchCard(this.punchCardData);
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