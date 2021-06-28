/*global $, countlyTotalUsers, countlyAuth, countlyLanguage, jQuery, app, LanguageView, countlyGlobalLang, Handlebars, countlyView, addDrill, countlyCommon, CountlyHelpers*/
window.LanguageView = countlyView.extend({
    beforeRender: function() {
        return $.when(countlyLanguage.initialize(), countlyTotalUsers.initialize("languages")).then(function() {});
    },
    renderCommon: function(isRefresh) {
        var languageData = countlyLanguage.getData();

        this.templateData = {
            "page-title": jQuery.i18n.map["languages.title"],
            "logo-class": "languages",
            "graph-type-double-pie": true,
            "pie-titles": {
                "left": jQuery.i18n.map["common.total-sessions"],
                "right": jQuery.i18n.map["common.new-users"]
            },
            "chart-helper": "languages.chart",
            "table-helper": ""
        };

        languageData.chartData.forEach(function(row) {
            if (row.language in countlyGlobalLang.languages) {
                row.language = countlyGlobalLang.languages[row.language].englishName;
            }
        });

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            if (typeof addDrill !== "undefined") {
                $(".widget-header .left .title").after(addDrill("up.la"));
            }
            countlyCommon.drawGraph(languageData.chartDPTotal, "#dashboard-graph", "pie");
            countlyCommon.drawGraph(languageData.chartDPNew, "#dashboard-graph2", "pie");

            this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": languageData.chartData,
                "aoColumns": [
                    { "mData": "langs", "sTitle": jQuery.i18n.map["languages.table.language"] },
                    {
                        "mData": "t",
                        sType: "formatted-num",
                        "mRender": function(d) {
                            return countlyCommon.formatNumber(d);
                        },
                        "sTitle": jQuery.i18n.map["common.table.total-sessions"]
                    },
                    {
                        "mData": "u",
                        sType: "formatted-num",
                        "mRender": function(d) {
                            return countlyCommon.formatNumber(d);
                        },
                        "sTitle": jQuery.i18n.map["common.table.total-users"]
                    },
                    {
                        "mData": "n",
                        sType: "formatted-num",
                        "mRender": function(d) {
                            return countlyCommon.formatNumber(d);
                        },
                        "sTitle": jQuery.i18n.map["common.table.new-users"]
                    }
                ]
            }));

            $(".d-table").stickyTableHeaders();

            if (!countlyAuth.validateRead('drill')) {
                $('#drill-down-for-view').hide();
            }
        }
    },
    refresh: function() {
        var self = this;
        $.when(this.beforeRender()).then(function() {
            if (app.activeView !== self) {
                return false;
            }
            self.renderCommon(true);
            var languageData = countlyLanguage.getData();
            countlyCommon.drawGraph(languageData.chartDPTotal, "#dashboard-graph", "pie");
            countlyCommon.drawGraph(languageData.chartDPNew, "#dashboard-graph2", "pie");

            CountlyHelpers.refreshTable(self.dtable, languageData.chartData);
            app.localize();
        });
    }
});

//register views
app.languageView = new LanguageView();

app.route("/analytics/languages", "languages", function() {
    this.renderWhenReady(this.languageView);
});

$(document).ready(function() {
    Handlebars.registerHelper('languageTitle', function(context) {
        return countlyGlobalLang.languages[context];
    });
    app.addSubMenu("analytics", {code: "analytics-languages", url: "#/analytics/languages", text: "sidebar.analytics.languages", priority: 80});
});