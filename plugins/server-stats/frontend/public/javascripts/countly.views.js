window.DataPointsView = countlyView.extend({
    beforeRender: function() {
        var self = this;

        return $.when($.get(countlyGlobal["path"]+'/server-stats/templates/data-points.html', function(src){
            self.template = Handlebars.compile(src);
        }), countlyDataPoints.initialize()).then(function () {});
    },
    renderCommon:function (isRefresh) {
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
                    { "mData": "app-name", "sType":"string", "sTitle": jQuery.i18n.map["compare.apps.app-name"] || "App Name", "sClass": "break" },
                    { "mData": "sessions", "sType":"numeric", "sTitle": jQuery.i18n.map["sidebar.analytics.sessions"] },
                    { "mData": "events", "sType":"numeric", "sTitle": jQuery.i18n.map["sidebar.events"] },
                    { "mData": "data-points", "sType":"numeric", "sTitle": jQuery.i18n.map["server-stats.data-points"] }
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
    refresh:function () {
        return true;
    }
});

app.dataPointsView = new DataPointsView();

app.route("/manage/data-points", '', function () {
    this.renderWhenReady(this.dataPointsView);
});

$(document).ready(function() {
    if(countlyGlobal["member"].global_admin){
        var menu = '<a href="#/manage/data-points" class="item">'+
            '<div class="text" data-localize="server-stats.data-points"></div>'+
            '</a>';

        if($('#management-submenu .help-toggle').length) {
            $('#management-submenu .help-toggle').before(menu);
        } else {
            $('#management-submenu').append(menu);
        }
    }
});