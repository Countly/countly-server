/*global CountlyHelpers, countlyDashboards, countlyView, _, simpleheat, production, countlySegmentation, ViewsView, ViewFrequencyView, ActionMapView, countlyCommon, countlyTokenManager, addDrill, countlyGlobal, countlySession, countlyViews, Handlebars, app, $, jQuery, moment*/

window.ViewsView = countlyView.extend({
    selectedMetric: "u",
    haveActionColumn: false,
    selectedView: null,
    selectedViews: [],
    selectedApps: {all: true},
    selectedCount: 0,
    graphColors: {},
    selectedSegment: {"segmentKey": "", "segmentValue": ""},
    ids: {},
    lastId: 0,
    token: false,
    useView: null,
    loaded: false,
    beforeRender: function() {
        var self = this;
        return $.when($.get(countlyGlobal.path + '/views/templates/views.html', function(src) {
            self.template = Handlebars.compile(src);
        }), countlyViews.initialize()).then(function() {});
    },
    getProperties: function() {
        return {
            "u": jQuery.i18n.map["common.table.total-users"],
            "n": jQuery.i18n.map["common.table.new-users"],
            "t": jQuery.i18n.map["views.total-visits"],
            "d": jQuery.i18n.map["views.duration"],
            "s": jQuery.i18n.map["views.starts"],
            "e": jQuery.i18n.map["views.exits"],
            "b": jQuery.i18n.map["views.bounces"],
            "scr": jQuery.i18n.map["views.scrolling-avg"]
        };
    },
    getExportAPI: function(tableID) {
        if (tableID === 'ViewsDataTableOne') {
            var set = this.dtable.fnSettings();
            var requestPath = countlyCommon.API_PARTS.data.r + "?method=views&action=getTable&seeMee=1" + "&period=" + countlyCommon.getPeriodForAjax() + "&iDisplayStart=0&app_id=" + countlyCommon.ACTIVE_APP_ID + '&api_key=' + countlyGlobal.member.api_key;
            if (self.selectedSegment && self.selectedSegment.segmentKey !== "" && self.selectedSegment.segmentValue !== "") {
                requestPath += "&segment=" + self.selectedSegment.segmentKey;
                requestPath += "&segmentVal=" + self.selectedSegment.segmentKey;
            }
            if (set && set.oPreviousSearch && set.oPreviousSearch.sSearch) {
                requestPath += "&sSearch=" + set.oPreviousSearch.sSearch;
            }
            if (set && set.aaSorting && set.aaSorting[0]) {
                if (set.aaSorting[0][1] === 'asc' || set.aaSorting[0][1] === 'desc') {
                    requestPath += "&iSortCol_0=" + set.aaSorting[0][0];
                    requestPath += "&sSortDir_0=" + set.aaSorting[0][1];
                }
            }
            var apiQueryData = {
                api_key: countlyGlobal.member.api_key,
                app_id: countlyCommon.ACTIVE_APP_ID,
                path: requestPath,
                method: "GET",
                filename: "Systemlogs_on_" + moment().format("DD-MMM-YYYY"),
                prop: ['aaData']
            };
            return apiQueryData;
        }
        return null;
    },
    renderCommon: function(isRefresh) {
        var self = this;
        var props = this.getProperties();
        var usage = [];
        this.segmentMap = countlyViews.getSegments();
        var i;

        for (i in props) {
            usage.push({
                "title": props[i],
                "id": "view-metric-" + i
            });
        }

        var domains = countlyViews.getDomains();
        for (i = 0; i < domains.length; i++) {
            domains[i] = countlyCommon.decode(domains[i]);
        }

        this.templateData = {
            "page-title": jQuery.i18n.map["views.title"],
            "font-logo-class": "fa-eye",
            "active-segmentation": jQuery.i18n.map["views.all-segments"],
            "segmentations": countlyViews.getSegmentKeys(),
            "usage": usage,
            "domains": domains
        };
        if (self.selectedSegment.segmentKey !== "") {
            this.templateData["active-segmentation"] = self.selectedSegment.segmentKey;
            this.templateData["segment-values"] = self.segmentMap[self.selectedSegment.segmentKey];
            if (self.selectedSegment.segmentValue !== "") {
                this.templateData["active-segmentation-value"] = self.selectedSegment.segmentValue;
            }
        }

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));

            var columns = [
                {
                    "mData": function(row, type) {
                        var text = row.view || row._id;
                        if (type === "display") {
                            if (self.graphColors[row._id] && self.selectedViews.indexOf(row._id) !== -1) {
                                return text + "<div class='color' style='background-color:" + self.graphColors[row._id] + "'></div>";
                            }
                            else {
                                return text + "<div class='color'></div>";
                            }
                        }
                        else {
                            return text;
                        }
                    },
                    sType: "string",
                    "sTitle": jQuery.i18n.map["views.table.view"],
                    "sClass": "break",
                },
                {
                    "mData": function(row) {
                        if (typeof row.uvalue !== 'undefined') {
                            return row.uvalue;
                        }
                        else {
                            return row.u;
                        }
                    },
                    sType: "formatted-num",
                    "mRender": function(d) {
                        return countlyCommon.formatNumber(d || 0);
                    },
                    "sTitle": jQuery.i18n.map["common.table.total-users"]
                },
                {
                    "mData": "n",
                    sType: "formatted-num",
                    "mRender": function(d) {
                        return countlyCommon.formatNumber(d || 0);
                    },
                    "sTitle": jQuery.i18n.map["common.table.new-users"]
                },
                {
                    "mData": "t",
                    sType: "formatted-num",
                    "mRender": function(d) {
                        return countlyCommon.formatNumber(d);
                    },
                    "sTitle": jQuery.i18n.map["views.total-visits"]
                },
                {
                    "mData": function(row, type) {
                        row.d = row.d || 0;
                        var time = (row.d === 0 || row.t === 0) ? 0 : row.d / row.t;
                        if (type === "display") {
                            return countlyCommon.timeString(time / 60);
                        }
                        else {
                            return time;
                        }
                    },
                    sType: "numeric",
                    "sTitle": jQuery.i18n.map["views.avg-duration"]
                },
                {
                    "mData": "s",
                    sType: "formatted-num",
                    "mRender": function(d) {
                        return countlyCommon.formatNumber(d || 0);
                    },
                    "sTitle": jQuery.i18n.map["views.starts"]
                },
                {
                    "mData": "e",
                    sType: "formatted-num",
                    "mRender": function(d) {
                        return countlyCommon.formatNumber(d || 0);
                    },
                    "sTitle": jQuery.i18n.map["views.exits"]
                },
                {
                    "mData": "b",
                    sType: "formatted-num",
                    "mRender": function(d) {
                        return countlyCommon.formatNumber(d || 0);
                    },
                    "sTitle": jQuery.i18n.map["views.bounces"]
                }
            ];
            if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type !== "mobile") {
                columns.push({
                    "mData": function(row) {
                        if (row.t !== 0 && row.scr) {
                            return parseFloat(row.scr) / parseFloat(row.t);
                        }
                        else {
                            return 0;
                        }
                    },
                    sType: "formatted-num",
                    "mRender": function(d) {
                        return countlyCommon.formatNumber(d) + "%";
                    },
                    "sTitle": jQuery.i18n.map["views.scrolling-avg"]
                });
            }
            self.haveActionColumn = false;
            if (typeof addDrill !== "undefined") {
                $(".widget-header .left .title").after(addDrill("sg.name", null, "[CLY]_view"));
                if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type === "web" && domains.length) {
                    self.haveActionColumn = true;
                    columns.push({
                        "mData": function(row) {
                            var url = "#/analytics/views/action-map/";
                            if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].app_domain && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].app_domain.length > 0) {
                                url = countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].app_domain;
                                if (url.indexOf("http") !== 0) {
                                    url = "http://" + url;
                                }
                                if (url.substr(url.length - 1) === '/') {
                                    url = url.substr(0, url.length - 1);
                                }
                            }
                            var link = row._id;
                            if (row.url) {
                                link = row.url;
                            }
                            else if (row.view) {
                                link = row.view;
                            }
                            return '<a href=' + url + link + ' class="table-link green" data-localize="views.table.view" style="margin:0px; padding:2px;">' + jQuery.i18n.map["views.table.view"] + '</a>';
                        },
                        sType: "string",
                        "sTitle": jQuery.i18n.map["views.action-map"],
                        "sClass": "shrink center",
                        bSortable: false
                    });
                }
            }
            columns.push({
                "mData": function(row) {
                    var text = row._id;
                    if (row.view) {
                        text = row.view;
                    }
                    return '<a class="cly-list-options" data-title="' + text + '" data-url="' + row._id + '"></a>';
                },
                "sType": "string",
                "sTitle": "",
                "sClass": "shrink center",
                bSortable: false
            });
            this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "bServerSide": true,
                "sAjaxSource": countlyCommon.API_PARTS.data.r + "?method=views&action=getTable&api_key=" + countlyGlobal.member.api_key + "&app_id=" + countlyCommon.ACTIVE_APP_ID,
                "fnServerData": function(sSource, aoData, fnCallback) {
                    self.request = $.ajax({
                        "dataType": 'json',
                        "type": "POST",
                        "url": sSource,
                        "data": aoData,
                        "success": function(data) {
                            fnCallback(data);
                            self.loaded = true;
                            self.request = null;
                        }
                    });
                },
                "fnRowCallback": function(nRow, aData) {
                    if (!self.selectedView) {
                        self.selectedView = aData._id;
                        self.selectedViews.push(self.selectedView);

                        countlyViews.setSelectedViews(self.selectedViews);
                        $.when(countlyViews.refresh()).then(function() {
                            self.drawGraph();
                        });
                    }

                    if (!self.ids[aData.vw]) {
                        self.ids[aData._id] = "view_" + self.lastId;
                        self.lastId++;
                    }
                    $(nRow).attr("id", self.ids[aData._id]);
                    $(nRow).data("viewid", aData._id);
                },
                "fnInitComplete": function(oSettings, json) {
                    $.fn.dataTable.defaults.fnInitComplete(oSettings, json);
                    if (self.haveActionColumn) {
                        CountlyHelpers.addColumnSelector(this, { "disabled": {"0": true, "9": true}}, "viewsTable");
                    }
                    else {
                        CountlyHelpers.addColumnSelector(this, { "disabled": {"0": true, "8": true}}, "viewsTable");
                    }
                },
                "fnServerParams": function(aoData) {
                    aoData.push({"name": "period", "value": countlyCommon.getPeriodForAjax()});
                    if (self.selectedSegment && self.selectedSegment.segmentKey !== "" && self.selectedSegment.segmentValue !== "") {
                        aoData.push({"name": "segment", "value": self.selectedSegment.segmentKey});
                        aoData.push({"name": "segmentVal", "value": self.selectedSegment.segmentValue});
                    }
                },
                "aoColumns": columns
            }));

            $(".d-table").stickyTableHeaders();
            $(".dataTable-bottom").append("<div class='dataTables_info' style='float: right;'>" + jQuery.i18n.map["views.maximum-items"] + " (" + countlyCommon.GRAPH_COLORS.length + ")</div>");

            CountlyHelpers.initializeTableOptions($('.views-table-block'));
            $(".views-table-block .cly-button-menu").on("cly-list.click", function(event, dataInstance) {
                self.targetViewUrl = $(dataInstance.currentTarget).data("url");
                self.targetViewTitle = $(dataInstance.currentTarget).data("title");
            });
            $(".views-table-block .cly-button-menu").on("cly-list.item", function(/*event, dataInstance*/) {
                //if ($(dataInstance.target).hasClass("delete-view")) {
                return CountlyHelpers.confirm(jQuery.i18n.prop("views.delete-confirm", "<b>" + self.targetViewTitle + "</b>"), "popStyleGreen", function(result) {
                    if (result) {
                        countlyViews.deleteView(self.targetViewUrl, function() {
                            $.when(
                                window.countlyViews.reset(),
                                window.countlyViews.initialize()
                            ).then(function() {
                                self.refresh();
                            });
                        });
                    }
                }, [jQuery.i18n.map["common.no-dont-delete"], jQuery.i18n.map["views.yes-delete-view"]], {title: jQuery.i18n.map["views.delete-confirm-title"], image: "delete-view"});
                //}
            });
            $('.views-table tbody').on("click", "tr", function() {
                var row = $(this);
                self.selectedView = row.data("viewid");
                //var persistentSettings = countlyCommon.getPersistentSettings()["pageViewsItems_" + countlyCommon.ACTIVE_APP_ID] || [];
                var persistentSettings = [];
                if (_.contains(self.selectedViews, self.selectedView)) {
                    var index = self.selectedViews.indexOf(self.selectedView);
                    self.selectedViews.splice(index, 1);
                    //persistentSettings.splice(persistentSettings.indexOf(self.selectedView), 1);
                    row.find(".color").css("background-color", "transparent");
                    delete self.graphColors[self.selectedView];
                }
                else if (self.selectedViews.length < countlyCommon.GRAPH_COLORS.length) {
                    self.selectedViews.push(self.selectedView);
                    //persistentSettings.push(self.selectedView);
                }

                for (var k in self.selectedViews) {
                    persistentSettings.push(self.selectedViews[k]);
                }

                var persistData = {};
                persistData["pageViewsItems_" + countlyCommon.ACTIVE_APP_ID] = persistentSettings;
                countlyCommon.setPersistentSettings(persistData);

                if (self.selectedViews.length === 0) {
                    $("#empty-graph").show();
                }
                else {
                    $("#empty-graph").hide();
                }
                countlyViews.setSelectedViews(self.selectedViews);
                $.when(countlyViews.refresh()).then(function() {
                    self.drawGraph();
                });
            });

            $('.views-table tbody').on("click", "a.table-link", function(event) {
                event.stopPropagation();
                var followLink = false;
                var url = event.target.href;

                if (url.indexOf("#/analytics/views/action-map/") < 0) {
                    followLink = true;
                }

                if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].sdk_version && parseInt((countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].sdk_version + "").split(".")[0]) <= 16) {
                    return;
                }
                $(event.target).toggleClass("active");
                if ($(event.target).hasClass("active")) {
                    $(".views-table a.table-link").removeClass("active");
                    $(event.target).addClass("active");

                    if (!followLink) {
                        var pos = $(event.target).offset();
                        $('.widget-content .cly-button-menu').css({
                            top: (pos.top + 25) + "px",
                            left: (pos.left - 250) + "px",
                            right: 65 + "px"
                        });
                        $('.widget-content > .cly-button-menu-trigger').addClass("active");
                        $('.widget-content > .cly-button-menu').focus();
                    }

                    var newWindow = "";
                    self.useView = event.target.hash;
                    if (followLink) {
                        newWindow = window.open("");
                        countlyTokenManager.createToken("View heatmap", "/o/actions", true, countlyCommon.ACTIVE_APP_ID, 1800, function(err, token) {
                            self.token = token && token.result;
                            if (self.token) {
                                newWindow.location.href = url;
                                newWindow.name = "cly:" + JSON.stringify({"token": self.token, "purpose": "heatmap", period: countlyCommon.getPeriodForAjax(), showHeatMap: true});
                            }
                        });
                    }
                }
                else {
                    $(event.target).removeClass("active");
                    $('.widget-content > .cly-button-menu-trigger').removeClass("active");
                }
                event.preventDefault();
            });

            $('.widget-content .cly-button-menu .item').click(function(event) {
                var url = $(event.target).text();
                if (url.indexOf("http") !== 0) {
                    url = "http://" + url;
                }
                if (url.substr(url.length - 1) === '/') {
                    url = url.substr(0, url.length - 1);
                }
                app.recordEvent({
                    "key": "action-map-clicked",
                    "count": 1,
                    "segmentation": {}
                });
                var newWindow = "";
                newWindow = window.open("");
                countlyTokenManager.createToken("View heatmap", "/o/actions", true, countlyCommon.ACTIVE_APP_ID, 1800, function(err, token) {
                    self.token = token && token.result;
                    if (self.token) {
                        var path = self.useView.replace("#/analytics/views/action-map/", "");
                        newWindow.location.href = url + path;
                        newWindow.name = "cly:" + JSON.stringify({"token": self.token, "purpose": "heatmap", period: countlyCommon.getPeriodForAjax(), showHeatMap: true});
                    }
                });
                $('.widget-content > .cly-button-menu-trigger').removeClass("active");
            });

            $('.widget-content .cly-button-menu').blur(function() {
                $('.widget-content > .cly-button-menu-trigger').removeClass("active");
            });

            $("#view-metric-" + this.selectedMetric).parents(".big-numbers").addClass("active");

            $(".widget-content .inner").click(function() {
                $(".big-numbers").removeClass("active");
                $(".big-numbers .select").removeClass("selected");
                $(this).parent(".big-numbers").addClass("active");
                $(this).find('.select').addClass("selected");
            });

            $("#segment-key-dropdown .segmentation-option").on("click", function() {
                self.selectedSegment.segmentKey = $(this).data("value");
                self.selectedSegment.segmentValue = "";
                var items = [];
                if (self.segmentMap[self.selectedSegment.segmentKey] && self.segmentMap[self.selectedSegment.segmentKey].length > 0) {
                    countlyViews.setSegment(self.selectedSegment.segmentKey);
                    for (i = 0; i < self.segmentMap[self.selectedSegment.segmentKey].length; i++) {
                        items.push({value: self.segmentMap[self.selectedSegment.segmentKey][i], name: self.segmentMap[self.selectedSegment.segmentKey][i]});
                    }
                    $("#segment-value-dropdown").clySelectSetItems(items);
                    self.selectedSegment.segmentValue = items[0].value;
                    $("#segment-value-dropdown").clySelectSetSelection(items[0].value, items[0].value);
                    countlyViews.setSegmentValue(items[0].value);
                    $("#segment-value-dropdown").css("display", "block");
                }
                else {
                    self.selectedSegment.segmentKey = "";
                    countlyViews.setSegment("");
                    $("#segment-value-dropdown").css("display", "none");
                }
                self.refresh();
            });


            $("#segment-value-dropdown").on("click", ".item", function() {
                countlyViews.setSegment(self.selectedSegment.segmentKey);
                countlyViews.setSegmentValue($(this).data("value"));
                self.selectedSegment.segmentValue = $(this).data("value");
                self.refresh();
            });

            $(".big-numbers .inner").click(function() {
                var elID = $(this).find('.select').attr("id").replace("view-metric-", "");

                if (self.selectedMetric === elID) {
                    return true;
                }

                self.selectedMetric = elID;
                self.drawGraph();
            });

            var persistentSettings = countlyCommon.getPersistentSettings()['pageViewsItems_' + countlyCommon.ACTIVE_APP_ID] || [];
            self.selectedViews = [];

            for (var l in persistentSettings) {
                var current = persistentSettings[l];
                if (self.selectedViews.indexOf(current) < 0) {
                    self.selectedViews.push(current);
                }
            }
            $("#view-metric-" + this.selectedMetric).parents(".big-numbers").addClass("active");
            if (self.selectedViews.length > 0) {
                countlyViews.setSelectedViews(self.selectedViews);
                $.when(countlyViews.refresh()).then(function() {
                    self.drawGraph();
                });
            }
            else {
                self.drawGraph();

            }
        }
    },
    drawGraph: function() {
        var props = this.getProperties();
        var dp = [];
        for (var i = 0; i < this.selectedViews.length; i++) {
            var color = countlyCommon.GRAPH_COLORS[i];
            var data = countlyViews.getChartData(this.selectedViews[i], this.selectedMetric, props[this.selectedMetric], this.selectedSegment.segmentKey, this.selectedSegment.segmentValue).chartDP;
            if (data) {
                data[1].color = color;
                $("#" + this.ids[this.selectedViews[i]] + " .color").css("background-color", color);
                this.graphColors[this.selectedViews[i]] = color;
                if (this.selectedViews.length === 1) {
                    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
                    data[0].color = "rgba(" + parseInt(result[1], 16) + "," + parseInt(result[2], 16) + "," + parseInt(result[3], 16) + ",0.5" + ")";
                    dp.push(data[0]);
                }
                dp.push(data[1]);
            }
            else {
                delete this.graphColors[this.selectedViews[i]];
                this.selectedViews.splice(i, 1);
                i--;
            }
        }
        countlyCommon.drawTimeGraph(dp, "#dashboard-graph");
    },
    refresh: function(force) {
        var self = this;
        $.when(countlyViews.refresh()).then(function() {
            if (app.activeView !== self) {
                return false;
            }
            self.renderCommon(true);
            var newPage = $("<div>" + self.template(self.templateData) + "</div>");
            $(self.el).find(".dashboard-summary").replaceWith(newPage.find(".dashboard-summary"));

            if (self.loaded || force) {
                self.loaded = false;
                if (self.request) {
                    self.request.abort();
                }
                self.request = null;
                self.dtable.fnDraw(false);
            }
            //CountlyHelpers.refreshTable(self.dtable, "");
            self.drawGraph();
        });
    }
});

window.ViewFrequencyView = countlyView.extend({
    beforeRender: function() {
        return $.when(countlySession.initialize()).then(function() {});
    },
    renderCommon: function(isRefresh) {
        var durationData = countlyViews.getViewFrequencyData();

        this.templateData = {
            "page-title": jQuery.i18n.map["views.view-frequency"],
            "font-logo-class": "fa-eye"
        };

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));

            countlyCommon.drawGraph(durationData.chartDP, "#dashboard-graph", "bar");

            this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": durationData.chartData,
                "aoColumns": [
                    { "mData": "vc", sType: "view-frequency", "sTitle": jQuery.i18n.map["views.view-frequency"] },
                    {
                        "mData": "t",
                        sType: "formatted-num",
                        "mRender": function(d) {
                            return countlyCommon.formatNumber(d);
                        },
                        "sTitle": jQuery.i18n.map["common.number-of-sessions"]
                    },
                    { "mData": "percent", "sType": "percent", "sTitle": jQuery.i18n.map["common.percent"] }
                ]
            }));

            $(".d-table").stickyTableHeaders();

        }
    },
    refresh: function() {
        var self = this;
        $.when(countlySession.initialize()).then(function() {
            if (app.activeView !== self) {
                return false;
            }

            var durationData = countlyViews.getViewFrequencyData();
            countlyCommon.drawGraph(durationData.chartDP, "#dashboard-graph", "bar");
            CountlyHelpers.refreshTable(self.dtable, durationData.chartData);
        });
    }
});

window.ActionMapView = countlyView.extend({
    actionType: "",
    curSegment: 0,
    curRadius: 1,
    curBlur: 1,
    baseRadius: 1,
    baseBlur: 1.6,
    beforeRender: function() {
        var self = this;
        return $.when($.get(countlyGlobal.path + '/views/templates/actionmap.html', function(src) {
            self.template = Handlebars.compile(src);
        }), countlyViews.loadActionsData(this.view)).then(function() {});
    },
    getData: function(data) {
        var heat = [];
        var point;
        var width = $("#view-canvas-map").prop('width');
        var height = $("#view-canvas-map").prop('height');
        for (var i = 0; i < data.length; i++) {
            point = data[i].sg;
            if (point.type === this.actionType) {
                heat.push([parseInt((point.x / point.width) * width), parseInt((point.y / point.height) * height), data[i].c]);
            }
        }
        return heat;
    },
    getMaxHeight: function(data) {
        var width = $("#view-map").width();
        var lowest = {w: 0, h: 0};
        var highest = {w: 100000, h: 5000};
        var i;
        for (i = 0; i < data.length; i++) {
            if (width === data[i].sg.width) {
                return data[i].sg.height;
            }
            else if (width > data[i].sg.width && lowest.w < data[i].sg.width) {
                lowest.w = data[i].sg.width;
                lowest.h = data[i].sg.height;
            }
        }

        if (lowest.h > 0) {
            return lowest.h;
        }

        for (i = 0; i < data.length; i++) {
            if (width < data[i].sg.width && highest.w > data[i].sg.width) {
                highest.w = data[i].sg.width;
                highest.h = data[i].sg.height;
            }
        }

        return highest.h;
    },
    getResolutions: function() {
        var res = ["Normal", "Fullscreen", "320x480", "480x800"];
        return res;
    },
    resize: function() {
        $('#view-canvas-map').prop('width', $("#view-map").width());
        $('#view-canvas-map').prop('height', $("#view-map").height());
        if (this.map) {
            this.map.resize();
        }
    },
    loadIframe: function() {
        var self = this;
        var segments = countlyViews.getActionsData().domains;
        var url = "http://" + segments[self.curSegment] + self.view;
        if ($("#view_loaded_url").val().length === 0) {
            $("#view_loaded_url").val(url);
        }
        countlyViews.testUrl(url, function(result) {
            if (result) {
                $("#view-map iframe").attr("src", url);
                $("#view_loaded_url").val(url);
            }
            else {
                self.curSegment++;
                if (segments[self.curSegment]) {
                    self.loadIframe();
                }
                else {
                    $("#view_loaded_url").show();
                    CountlyHelpers.alert(jQuery.i18n.map["views.cannot-load"], "red");
                }
            }
        });
    },
    renderCommon: function(isRefresh) {
        var data = countlyViews.getActionsData();
        this.actionType = data.types[0] || jQuery.i18n.map["views.select-action-type"];
        var segments = countlyViews.getSegments();
        var self = this;
        this.templateData = {
            "page-title": jQuery.i18n.map["views.action-map"],
            "font-logo-class": "fa-eye",
            "first-type": this.actionType,
            "active-segmentation": jQuery.i18n.map["views.all-segments"],
            "segmentations": segments,
            "resolutions": this.getResolutions(),
            "data": data
        };

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            $("#view-map").height(this.getMaxHeight(data.data));
            this.resize();
            this.loadIframe();
            this.map = simpleheat("view-canvas-map");
            this.map.data(this.getData(data.data));
            this.baseRadius = Math.max((48500 - 35 * data.data.length) / 900, 5);
            this.drawMap();

            app.localize();

            $("#view_reload_url").on("click", function() {
                $("#view-map iframe").attr("src", "/o/urlload?url=" + encodeURIComponent($("#view_loaded_url").val()));
            });

            $("#view_loaded_url").keyup(function(event) {
                if (event.keyCode === 13) {
                    $("#view_reload_url").click();
                }
            });

            $("#radius").on("change", function() {
                self.curRadius = parseInt($("#radius").val()) / 10;
                self.drawMap();
            });

            $("#blur").on("change", function() {
                self.curBlur = parseInt($("#blur").val()) / 10;
                self.drawMap();
            });

            $("#action-map-type .segmentation-option").on("click", function() {
                self.actionType = $(this).data("value");
                self.refresh();
            });

            $("#action-map-resolution .segmentation-option").on("click", function() {
                switch ($(this).data("value")) {
                case "Normal":
                    $("#view-map").width("100%");
                    $("#view-map").prependTo("#view-map-container");
                    break;
                case "Fullscreen":
                    $("#view-map").width("100%");
                    $("#view-map").prependTo(document.body);
                    break;
                default:
                    var parts = $(this).data("value").split("x");
                    $("#view-map").width(parts[0] + "px");
                    $("#view-map").prependTo("#view-map-container");
                }
                self.resize();
                self.refresh();
            });

            $("#view-segments .segmentation-option").on("click", function() {
                countlyViews.reset();
                countlyViews.setSegment($(this).data("value"));
                self.refresh();
            });
        }
    },
    drawMap: function() {
        this.map.radius(this.baseRadius * this.curRadius, this.baseRadius * this.baseBlur * this.curBlur);
        this.map.draw();
    },
    refresh: function() {
        var self = this;
        $.when(countlyViews.loadActionsData(this.view)).then(function() {
            if (app.activeView !== self) {
                return false;
            }
            self.renderCommon(true);
            var data = countlyViews.getActionsData();
            if (self.map) {
                self.map.clear();
                self.map.data(self.getData(data.data));
                self.baseRadius = Math.max((48500 - 35 * data.data.length) / 900, 5);
                self.drawMap();
            }
        });
    }
});
//register views
app.viewsView = new ViewsView();
app.viewFrequencyView = new ViewFrequencyView();
app.actionMapView = new ActionMapView();

app.route("/analytics/views", 'views', function() {
    this.renderWhenReady(this.viewsView);
});

app.route("/analytics/view-frequency", 'views', function() {
    this.renderWhenReady(this.viewFrequencyView);
});

app.route("/analytics/views/action-map/*view", 'views', function(view) {
    this.actionMapView.view = view;
    this.renderWhenReady(this.actionMapView);
});

app.addPageScript("/drill#", function() {
    var drillClone;
    var self = app.drillView;
    var record_views = countlyGlobal.record_views;
    if (countlyGlobal.apps && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].plugins && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].plugins.drill && typeof countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].plugins.drill.record_views !== "undefined") {
        record_views = countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].plugins.drill.record_views;
    }
    if (record_views) {

        $("#drill-types").append('<div id="drill-type-views" class="item"><div class="inner"><span class="icon views"></span><span class="text">' + jQuery.i18n.map["views.title"] + '</span></div></div>');
        $("#drill-type-views").on("click", function() {
            if ($(this).hasClass("active")) {
                return true;
            }

            $("#drill-types").find(".item").removeClass("active");
            $(this).addClass("active");
            $("#event-selector").hide();

            $("#drill-no-event").fadeOut();
            $("#segmentation-start").fadeOut().remove();

            var currEvent = "[CLY]_view";

            self.graphType = "line";
            self.graphVal = "times";
            self.filterObj = {};
            self.byVal = "";
            self.drillChartDP = {};
            self.drillChartData = {};
            self.activeSegmentForTable = "";
            countlySegmentation.reset();

            $("#drill-navigation").find(".menu[data-open=table-view]").hide();

            $.when(countlySegmentation.initialize(currEvent)).then(function() {
                $("#drill").replaceWith(drillClone.clone(true));
                self.adjustFilters();
                self.draw(true, false);
            });
        });
        setTimeout(function() {
            drillClone = $("#drill").clone(true);
        }, 0);
    }
});

app.addPageScript("/custom#", function() {
    addWidgetType();
    addSettingsSection();
    /**
     * Function to add widget
     */
    function addWidgetType() {
        var viewsWidget = '<div data-widget-type="views" class="opt dashboard-widget-item">' +
                            '    <div class="inner">' +
                            '        <span class="icon views"></span>' + jQuery.i18n.prop("views.widget-type") +
                            '    </div>' +
                            '</div>';

        $("#widget-drawer .details #widget-types .opts").append(viewsWidget);
    }

    /**
     * Function to add setting section
     */
    function addSettingsSection() {
        var setting = '<div id="widget-section-multi-views" class="settings section">' +
                        '    <div class="label">' + jQuery.i18n.prop("views.widget-type") + '</div>' +
                        '    <div id="multi-views-dropdown" class="cly-multi-select" data-max="2" style="width: 100%; box-sizing: border-box;">' +
                        '        <div class="select-inner">' +
                        '            <div class="text-container">' +
                        '                <div class="text">' +
                        '                    <div class="default-text">' + jQuery.i18n.prop("views.select") + '</div>' +
                        '                </div>' +
                        '            </div>' +
                        '            <div class="right combo"></div>' +
                        '        </div>' +
                        '        <div class="select-items square" style="width: 100%;"></div>' +
                        '    </div>' +
                        '</div>';

        $(setting).insertAfter(".cly-drawer .details .settings:last");
    }

    $("#multi-views-dropdown").on("cly-multi-select-change", function() {
        $("#widget-drawer").trigger("cly-widget-section-complete");
    });
});

$(document).ready(function() {
    if (!production) {
        CountlyHelpers.loadJS("views/javascripts/simpleheat.js");
    }
    jQuery.fn.dataTableExt.oSort['view-frequency-asc'] = function(x, y) {
        x = countlyViews.getFrequencyIndex(x);
        y = countlyViews.getFrequencyIndex(y);

        return ((x < y) ? -1 : ((x > y) ? 1 : 0));
    };

    jQuery.fn.dataTableExt.oSort['view-frequency-desc'] = function(x, y) {
        x = countlyViews.getFrequencyIndex(x);
        y = countlyViews.getFrequencyIndex(y);

        return ((x < y) ? 1 : ((x > y) ? -1 : 0));
    };

    app.addSubMenu("analytics", {code: "analytics-views", url: "#/analytics/views", text: "views.title", priority: 100});
    app.addSubMenu("engagement", {code: "analytics-view-frequency", url: "#/analytics/view-frequency", text: "views.view-frequency", priority: 50});

    //check if configuration view exists
    if (app.configurationsView) {
        app.configurationsView.registerLabel("views", "views.title");
        app.configurationsView.registerLabel("views.view_limit", "views.view-limit");
    }

    initializeViewsWidget();
});
/**
 * Function that initializes widget
 */
function initializeViewsWidget() {

    if (countlyGlobal.plugins.indexOf("dashboards") < 0) {
        return;
    }

    //TO REFRESH VIEWS DATA CHECK FETCH.JS IN API LINE NO: 926
    //SEGMENT THINGY REMAINING

    var viewsWidgetTemplate;
    var viewsMetric = [
        { name: "Total Visitors", value: "u" },
        { name: "New Visitors", value: "n" },
        { name: "Total Visits", value: "t" },
        { name: "Avg. Time", value: "d" },
        { name: "Landings", value: "s" },
        { name: "Exits", value: "e" },
        { name: "Bounces", value: "b" }
    ];
    /**
     * Function to return view name
     * @param  {String} view - View value
     * @returns {String} name - View name
     */
    function returnViewName(view) {
        var name = "Unknown";

        var viewName = viewsMetric.filter(function(obj) {
            return obj.value === view;
        });

        if (viewName.length) {
            name = viewName[0].name;
        }

        return name;
    }

    $.when(
        $.get(countlyGlobal.path + '/views/templates/widget.html', function(src) {
            viewsWidgetTemplate = Handlebars.compile(src);
        })
    ).then(function() {

        var widgetOptions = {
            init: initWidgetSections,
            settings: widgetSettings,
            placeholder: addPlaceholder,
            create: createWidgetView,
            reset: resetWidget,
            set: setWidget,
            refresh: refreshWidget
        };

        app.addWidgetCallbacks("views", widgetOptions);
    });
    /**
     * Function to init widget sections
     */
    function initWidgetSections() {
        var selWidgetType = $("#widget-types").find(".opt.selected").data("widget-type");

        if (selWidgetType !== "views") {
            return;
        }

        $("#widget-drawer .details #data-types").parent(".section").hide();
        $("#widget-section-single-app").show();
        $("#multi-views-dropdown").clyMultiSelectSetItems(viewsMetric);
        $("#widget-section-multi-views").show();
    }
    /**
     * Function to set widget settings
     * @returns {Object} Settings - Settings object
     */
    function widgetSettings() {
        var $singleAppDrop = $("#single-app-dropdown"),
            $multiViewsDrop = $("#multi-views-dropdown");

        var selectedApp = $singleAppDrop.clySelectGetSelection();
        var selectedViews = $multiViewsDrop.clyMultiSelectGetSelection();

        var settings = {
            apps: (selectedApp) ? [ selectedApp ] : [],
            views: selectedViews
        };

        return settings;
    }
    /**
     * Function to set placeholder values
     * @param  {Object} dimensions - dimensions object
     */
    function addPlaceholder(dimensions) {
        dimensions.min_height = 4;
        dimensions.min_width = 4;
        dimensions.width = 4;
        dimensions.height = 4;
    }
    /**
     * Function to create widget front end view
     * @param  {Object} widgetData - widget data object
     */
    function createWidgetView(widgetData) {
        var placeHolder = widgetData.placeholder;

        formatData(widgetData);
        render();
        /**
         * Function to render view
         */
        function render() {
            var title = widgetData.title,
                app = widgetData.apps,
                data = widgetData.formattedData;

            var appName = countlyDashboards.getAppName(app[0]),
                appId = app[0];

            var $widget = $(viewsWidgetTemplate({
                title: title,
                app: {
                    id: appId,
                    name: appName
                },
                "views": data.viewsValueNames,
                "views-data": data.viewsData,
            }));

            placeHolder.find("#loader").fadeOut();
            placeHolder.find(".cly-widget").html($widget.html());

            if (!title) {
                var widgetTitle = jQuery.i18n.prop("views.heading");
                placeHolder.find(".title").text(widgetTitle);
            }

            addTooltip(placeHolder);
        }
    }
    /**
     * Function to format widget data
     * @param  {Object} widgetData - Widget data object
     */
    function formatData(widgetData) {
        var data = widgetData.dashData.data,
            views = widgetData.views;

        var viewsValueNames = [];
        var i;

        for (i = 0; i < views.length; i++) {
            viewsValueNames.push({
                name: returnViewName(views[i]),
                value: views[i]
            });
        }

        data.chartData.splice(10);

        var viewsData = [];
        for (i = 0; i < data.chartData.length; i++) {
            viewsData.push({
                views: data.chartData[i].views,
                data: []
            });
            for (var j = 0; j < viewsValueNames.length; j++) {
                var fullName = viewsValueNames[j].name;
                var metricName = viewsValueNames[j].value;
                var value = data.chartData[i][metricName];
                if (metricName === "d") {
                    var totalVisits = data.chartData[i].t;
                    var time = (value === 0 || totalVisits === 0) ? 0 : value / totalVisits;
                    value = countlyCommon.timeString(time / 60);
                }
                viewsData[i].data.push({
                    value: value,
                    name: fullName
                });
            }
        }
        var returnData = {
            viewsData: viewsData,
            viewsValueNames: viewsValueNames
        };

        widgetData.formattedData = returnData;
    }
    /**
     * Function to reset widget
     */
    function resetWidget() {
        $("#multi-views-dropdown").clyMultiSelectClearSelection();
    }
    /**
     * Function to set widget data
     * @param  {Object} widgetData - Widget data object
     */
    function setWidget(widgetData) {
        var views = widgetData.views;
        var apps = widgetData.apps;
        var $multiViewsDrop = $("#multi-views-dropdown");
        var $singleAppDrop = $("#single-app-dropdown");

        $singleAppDrop.clySelectSetSelection(apps[0], countlyDashboards.getAppName(apps[0]));

        var viewsValueNames = [];
        for (var i = 0; i < views.length; i++) {
            viewsValueNames.push({
                name: returnViewName(views[i]),
                value: views[i]
            });
        }

        $multiViewsDrop.clyMultiSelectSetSelection(viewsValueNames);
    }
    /**
     * Function to refresh widget
     * @param  {Object} widgetEl - DOM element
     * @param  {Object} widgetData - Widget data object
     */
    function refreshWidget(widgetEl, widgetData) {
        formatData(widgetData);
        var data = widgetData.formattedData;

        var $widget = $(viewsWidgetTemplate({
            title: "",
            app: {
                id: "",
                name: ""
            },
            "views": data.viewsValueNames,
            "views-data": data.viewsData,
        }));

        widgetEl.find("table").replaceWith($widget.find("table"));
        addTooltip(widgetEl);
    }
    /**
     * Function to add tooltip
     * @param  {Object} placeHolder - DOM element
     */
    function addTooltip(placeHolder) {
        placeHolder.find('.views table tr td:first-child').tooltipster({
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
                instance.content(getTooltipText($(helper.origin).parents(placeHolder.find("views table tr td:first-child"))));
            }
        });
        /**
         * Function to add tooltip text
         * @param  {Object} jqueryEl - DOM element
         * @returns {String} tooltipStr - Tool tip text string
         */
        function getTooltipText(jqueryEl) {
            var viewName = jqueryEl.find("td:first-child").data("view-name");
            var tooltipStr = "<div id='views-tip'>";

            tooltipStr += viewName;

            tooltipStr += "</div>";

            return tooltipStr;
        }
    }
}