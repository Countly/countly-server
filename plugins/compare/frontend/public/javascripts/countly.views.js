window.CompareView = countlyView.extend({
    selectedMetric: null,
    selectedAlt: null,
    alternatives: [],
    selectedAlts: [],
    alternativeIDs: {},
    lastAlternativeID: 0,
    viewHelper: null,
    setHelper:function (inViewHelper) {
        this.selectedMetric = null;
        this.selectedAlt = null;
        this.alternatives = [];
        this.selectedAlts = [];
        this.alternativeIDs = {};
        this.lastAlternativeID = 0;

        inViewHelper.model.reset();
        this.viewHelper = inViewHelper;
        this.selectedMetric = this.viewHelper.defaultMetric;
    },
    beforeRender: function() {
        var self = this;

        return $.when($.get(countlyGlobal["path"]+'/compare/templates/compare.html', function(src){
            self.template = Handlebars.compile(src);
        }), self.viewHelper.model.initialize()).then(function () {});
    },
    renderCommon:function (isRefresh) {
        var self = this;
        var props = self.viewHelper.model.getProperties();
        var metrics = [];

        for (var i in props) {
            metrics.push({
                "title":props[i],
                "id":"metric-"+i
            });
        }

        this.templateData = {
            "page-title": self.viewHelper.title,
            "max-alternatives": self.viewHelper.maxAlternatives,
            "back-link": self.viewHelper.backLink,
            "multi-select-text": jQuery.i18n.prop("compare.limit", self.viewHelper.maxAlternatives, self.viewHelper.compareText),
            "metrics": metrics,
            "alternatives": self.viewHelper.getAlternatives()
        };

        if (!isRefresh) {
            if (self.viewHelper && self.viewHelper.onRender) {
                self.viewHelper.onRender();
            }

            self.el.html(this.template(this.templateData));

            this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": self.viewHelper.model.getTableData(),
                "fnRowCallback": function( nRow, aData, iDisplayIndex, iDisplayIndexFull ) {
                    if (!self.alternativeIDs[aData.id]) {
                        self.alternativeIDs[aData.id] = "alt-" + self.lastAlternativeID;
                        self.lastAlternativeID++;
                    }

                    $(nRow).attr("id", self.alternativeIDs[aData.id]);
                    $(nRow).data("id", aData.id);
                },
                "aoColumns": self.viewHelper.getTableColumns()
            }));

            $(".d-table").stickyTableHeaders();

            $('.views-table tbody').on("click", "tr", function () {
                var row = $(this);

                self.selectedAlt = row.data("id");

                if (_.contains(self.selectedAlts, self.selectedAlt)){
                    var index = self.selectedAlts.indexOf(self.selectedAlt);
                    self.selectedAlts.splice(index, 1);
                    row.find(".color").css("background-color", "transparent");
                } else if (self.selectedAlts.length < countlyCommon.GRAPH_COLORS.length) {
                    self.selectedAlts.push(self.selectedAlt);
                }

                if (self.selectedAlts.length == 0) {
                    $("#empty-graph").show();
                } else {
                    $("#empty-graph").hide();
                }

                self.drawGraph();
            });

            $("#metric-" + this.selectedMetric).parents(".big-numbers").addClass("active");

            $(".big-numbers .inner").click(function () {
                $(".big-numbers").removeClass("active");
                $(".big-numbers .select").removeClass("selected");
                $(this).parent(".big-numbers").addClass("active");
                $(this).find('.select').addClass("selected");

                var elID = $(this).find('.select').attr("id").replace("metric-", "");

                if (self.selectedMetric == elID) {
                    return true;
                }

                self.selectedMetric = elID;
                self.drawGraph();
            });

            $("#compare-button").on("click", function() {
                if ($(this).hasClass("disabled")) {
                    return;
                }

                $(this).addClass("disabled");

                var forAlternatives = $("#alternative-selector").data("value");

                self.alternatives = forAlternatives;
                self.selectedAlts = forAlternatives;

                $.when(self.viewHelper.model.initialize(forAlternatives)).then(function() {
                    CountlyHelpers.refreshTable(self.dtable, self.viewHelper.model.getTableData());
                    self.drawGraph();
                });
            });

            $("#alternative-selector").on("cly-multi-select-change", function() {
                var selected = $("#alternative-selector").data("value");

                if (selected.length > 0) {
                    $("#compare-button").removeClass("disabled");
                } else {
                    $("#compare-button").addClass("disabled");
                }
            });

            $("#alternative-selector").trigger("click");
            this.drawGraph();
        }
    },
    drawGraph: function(){
        var props = this.viewHelper.model.getProperties();
        var dp = [];

        for (var i = 0;  i < this.selectedAlts.length; i++){
            var color = countlyCommon.GRAPH_COLORS[i];
            var data = this.viewHelper.model.getChartData(this.selectedAlts[i], this.selectedMetric).chartDP;

            if (data) {
                data[1].color = color;

                $("#"+this.alternativeIDs[this.selectedAlts[i]]+" .color").css("background-color", color);

                if (this.selectedAlts.length == 1 && !_.isEmpty(data[0])) {
                    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
                    data[0].color = "rgba("+parseInt(result[1], 16)+","+parseInt(result[2], 16)+","+parseInt(result[3], 16)+",0.5"+")";

                    dp.push(data[0])
                }

                if (data && data[1]) {
                    dp.push(data[1]);
                }
            }
        }

        if (this.selectedAlts.length == 0) {
            $("#empty-graph").show();
        } else {
            $("#empty-graph").hide();
        }

        countlyCommon.drawTimeGraph(dp, "#dashboard-graph");
    },
    refresh:function () {
        var self = this;

        $.when(self.viewHelper.model.refresh()).then(function () {
            if (app.activeView != self) {
                return false;
            }

            CountlyHelpers.refreshTable(self.dtable, self.viewHelper.model.getTableData());
            self.drawGraph();
        });
    },
    dateChanged:function () {
        var self = this;
        if (this.viewHelper.initOnDateChange) {
            var forAlternatives = $("#alternative-selector").data("value");

            $.when(self.viewHelper.model.initialize(forAlternatives)).then(function() {
                CountlyHelpers.refreshTable(self.dtable, self.viewHelper.model.getTableData());
                self.drawGraph();
            });
        } else {
            this.refresh();
        }
    },
    destroy:function() {
        if (this.viewHelper && this.viewHelper.onDestroy) {
            this.viewHelper.onDestroy();
        }
    }
});

app.compareView = new CompareView();

/* Compare for the events view */
app.addPageScript("/analytics/events", function(){
    $("#event-nav-head").after(
        "<a href='#/analytics/events/compare'>" +
            "<div id='compare-events' class='event-container'>" +
                "<div class='icon'></div>" +
                "<div class='name'>" + jQuery.i18n.map["compare.button"] + "</div>" +
            "</div>" +
        "</a>"
    );
});

var compareEventsViewHelper = {
    title: jQuery.i18n.map["compare.events.title"],
    model: countlyEventCompare,
    defaultMetric: "c",
    backLink: {
        href: "#/analytics/events",
        text: jQuery.i18n.map["compare.events.back"]
    },
    compareText: jQuery.i18n.map["compare.events.limit"],
    maxAlternatives: 10,
    getTableColumns: function() {
        return [
            { "mData": function(row, type){

                if(type == "display"){
                    return "<div class='color'></div><span class='name'>" + row.name + "</span>";
                } else {
                    return row.name;
                }

            }, sType:"string", "sTitle": jQuery.i18n.map["compare.events.table"] , "sClass": "break", "sWidth": "40%"},
            { "mData": "c", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["events.count"] },
            { "mData": "s", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["events.sum"] },
            { "mData": "dur", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["events.dur"] }
        ];
    },
    getAlternatives: function() {
        var events = countlyEvent.getEvents(),
            keys = _.pluck(events, "key"),
            names = _.pluck(events, "name");

        var toReturn = {};

        for (var i = 0; i < keys.length; i++) {
            toReturn[keys[i]] = names[i] || keys[i];
        }

        return toReturn;
    }
};

app.route("/analytics/events/compare", 'views', function () {
    this.compareView.setHelper(compareEventsViewHelper);
    this.renderWhenReady(this.compareView);
});
/* End of compare for the events view */

/* Compare applications */
$(document).ready(function() {
    $("#app-nav-head").after(
        "<a href='#/compare'>" +
            "<div id='compare-apps' class='app-container'>" +
                "<div class='icon'></div>" +
                "<div class='name'>" + jQuery.i18n.map["compare.button"] + "</div>" +
            "</div>" +
        "</a>"
    );
});

var compareAppsViewHelper = {
    title: jQuery.i18n.map["compare.apps.title"],
    model: countlyAppCompare,
    defaultMetric: "draw-total-sessions",
    compareText: jQuery.i18n.map["compare.apps.limit"],
    maxAlternatives: 10,
    initOnDateChange: true,
    getTableColumns: function() {
        function getTrendIcon(trend) {
            // We are returning empty for the trend icon
            return '';

            if (trend == 'u') {
                return '<i class="material-icons up">trending_up</i>';
            } else if (trend == 'd') {
                return '<i class="material-icons down">trending_down</i>';
            }
        }

        return [
            { "mData": function(row, type) {
                if (type == "display") {
                    return "<div class='color'></div><span class='name'>" + row.name + "</span>";
                } else {
                    return row.name;
                }
            }, "sType":"string", "sTitle": jQuery.i18n.map["compare.apps.app-name"], "sClass": "break" },
            { "mData": function(row, type) {
                if (type == "display") {
                    return getTrendIcon(row.sessions.trend) +  row.sessions.total;
                } else {
                    return row.sessions.total;
                }
            }, "sType":"numeric", "sTitle": jQuery.i18n.map["common.total-sessions"] },
            { "mData": function(row, type) {
                if (type == "display") {
                    return getTrendIcon(row.users.trend) +  row.users.total;
                } else {
                    return row.users.total;
                }
            }, "sType":"numeric", "sTitle": jQuery.i18n.map["compare.apps.total-unique"] },
            { "mData": function(row, type) {
                if (type == "display") {
                    return getTrendIcon(row.newusers.trend) +  row.newusers.total;
                } else {
                    return row.newusers.total;
                }
            }, "sType":"numeric", "sTitle": jQuery.i18n.map["compare.apps.new-unique"] },
            { "mData": function(row, type) {
                if (type == "display") {
                    return getTrendIcon(row.duration.trend) +  countlyCommon.timeString(row.duration.total);
                } else {
                    return row.duration.total;
                }
            }, "sType":"numeric", "sTitle": jQuery.i18n.map["dashboard.time-spent"] },
            { "mData": function(row, type) {
                if (type == "display") {
                    return getTrendIcon(row.avgduration.trend) +  countlyCommon.timeString(row.avgduration.total);
                } else {
                    return row.avgduration.total;
                }
            }, "sType":"numeric", "sTitle": jQuery.i18n.map["dashboard.avg-time-spent"] }
        ];
    },
    getAlternatives: function() {
        var apps = countlyGlobal.apps,
            ids = _.pluck(apps, "_id"),
            names = _.pluck(apps, "name");

        var toReturn = {};

        for (var i = 0; i < ids.length; i++) {
            toReturn[ids[i]] = names[i] || ids[i];
        }

        return toReturn;
    },
    onRender: function() {
        $("#sidebar-menu").css({visibility: "hidden"});
        $("#app-nav").addClass("compare-active");
        $("#sidebar").append(
            "<div id='compare-apps-pointer'>" +
                "<div>" + jQuery.i18n.map["compare.apps.tip"] + "</div>" +
            "</div>"
        );

        if ($("#app-nav").offset().left == 201) {
            $("#sidebar-app-select").trigger("click");
        }

        $("#app-nav.compare-active").find(".app-navigate").on("click", function (e) {
            $("#sidebar-app-select").data("before-compare", '');

            var appId = $(this).data("id");

            if (countlyCommon.ACTIVE_APP_ID == appId) {
                $("#sidebar-app-select").trigger("click");
                app.navigate("/", true);
            }
        });

        var sidebarApp = $("#sidebar-app-select");
        sidebarApp.addClass("compare-active");
        sidebarApp.data("before-compare", sidebarApp.find(".text").text());
        sidebarApp.find(".text").text(jQuery.i18n.map["compare.apps.app-select"]);
    },
    onDestroy: function() {
        $("#sidebar-menu").css({visibility: "visible"});
        $("#app-nav").removeClass("compare-active");
        $("#sidebar").find("#compare-apps-pointer").remove();

        var sidebarApp = $("#sidebar-app-select");
        if (sidebarApp.data("before-compare")) {
            sidebarApp.find(".text").text(sidebarApp.data("before-compare"));
            sidebarApp.data("before-compare", '');
        }
        sidebarApp.removeClass("compare-active");
    }
};

app.route("/compare", 'views', function () {
    this.compareView.setHelper(compareAppsViewHelper);
    this.renderWhenReady(this.compareView);
});
/* End of compare applications */