/*globals countlyView,_,countlyDeviceDetails,countlyDeviceList,marked,addDrill,extendViewWithFilter,hljs,countlyUserdata,moment,store,jQuery,countlySession,$,countlyGlobal,T,countlyCrashes,app,CountlyHelpers,CrashesView,CrashgroupView,countlySegmentation,countlyCommon, Handlebars, CrashBinaryView, Dropzone */
window.CrashesView = countlyView.extend({
    isAppleOs: function(val) {
        return ["ios", "macos", "tvos", "watchos"].indexOf((val + "").toLowerCase()) !== -1;
    },
    symbolicationEnabled: function() {
        return (typeof app.crashSymbolicationView !== "undefined") && (typeof countlyCrashSymbols !== "undefined");
    },
    convertFilter: {
        "sg.crash": {prop: "_id", type: "string"},
        "sg.cpu": {prop: "cpu", type: "segment"},
        "sg.opengl": {prop: "opengl", type: "segment"},
        "sg.os": {prop: "os", type: "string"},
        "sg.orientation": {prop: "orientation", type: "segment"},
        "sg.nonfatal": {prop: "nonfatal", type: "booltype"},
        "sg.root": {prop: "root", type: "boolsegment"},
        "sg.online": {prop: "online", type: "boolsegment"},
        "sg.signal": {prop: "signal", type: "boolsegment"},
        "sg.muted": {prop: "muted", type: "boolsegment"},
        "sg.background": {prop: "background", type: "boolsegment"},
        "up.d": {prop: "device", type: "segment"},
        "up.pv": {prop: "os_version", type: "segment"},
        "up.av": {prop: "app_version", type: "segment"},
        "up.r": {prop: "resolution", type: "segment"},
        "up.ls": {prop: "lastTs", type: "date"},
        "up.fs": {prop: "startTs", type: "date"},
        "is_new": {prop: "is_new", type: "booltype"},
        "is_resolved": {prop: "is_resolved", type: "booltype"},
        "is_hidden": {prop: "is_hidden", type: "booltype"},
        "is_renewed": {prop: "is_renewed", type: "booltype"},
        "reports": {prop: "reports", type: "number"},
        "users": {prop: "reports", type: "number"},
        "ram_min": {prop: "ram.min", type: "number"},
        "ram_max": {prop: "ram.max", type: "number"},
        "bat_min": {prop: "bat.min", type: "number"},
        "bat_max": {prop: "bat.max", type: "number"},
        "disk_min": {prop: "disk.min", type: "number"},
        "disk_max": {prop: "disk.max", type: "number"},
        "run_min": {prop: "run.min", type: "number"},
        "run_max": {prop: "run.max", type: "number"}
    },
    initialize: function() {
        this.loaded = true;
        this.filter = (store.get("countly_crashfilter")) ? store.get("countly_crashfilter") : "crash-all";
        this.curMetric = "cr";
        this.metrics = {
            cr: jQuery.i18n.map["crashes.total"],
            cru: jQuery.i18n.map["crashes.unique"],
            crau: jQuery.i18n.map["crashes.free-users"],
            crses: jQuery.i18n.map["crashes.free-sessions"],
            crru: jQuery.i18n.map["crashes.resolved-users"]
        };
    },
    destroy: function() {
        countlyCrashes.resetActiveFilter();
        $('body').unbind('mouseup', self.filterBoxCloseCallback);
        $('body').unbind('keydown', self.filterBoxEscapeCallback);
    },
    showOnGraph: {"crashes-fatal": true, "crashes-nonfatal": true, "crashes-total": true},
    beforeRender: function() {
        this.selectedCrashes = {};
        this.selectedCrashesIds = [];
        countlySession.initialize();
        var self = this;
        return $.when(T.render('/crashes/templates/crashes.html', function(src) {
            self.template = src;
        }), countlyCrashes.initialize()).then(function() {});
    },
    getExportAPI: function(tableID) {
        if (tableID === 'd-table-crashes') {
            var userDetails = countlyUserdata.getUserdetails();
            var requestPath = '/o?method=user_crashes&api_key=' + countlyGlobal.member.api_key +
                    "&app_id=" + countlyCommon.ACTIVE_APP_ID + "&uid=" + userDetails.uid +
                    "&iDisplayStart=0&fromExportAPI=true";
            var apiQueryData = {
                api_key: countlyGlobal.member.api_key,
                app_id: countlyCommon.ACTIVE_APP_ID,
                path: requestPath,
                method: "GET",
                filename: "User_Crashes_on_" + moment().format("DD-MMM-YYYY"),
                prop: ['aaData']
            };
            return apiQueryData;
        }
        return null;
    },
    processData: function() {
        var self = this;
        var crashData = countlyCrashes.getData();
        this.dtable = $('#crash-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
            "aaSorting": [[ 5, "desc" ]],
            "bServerSide": true,
            "sAjaxSource": countlyCommon.API_PARTS.data.r + "?app_id=" + countlyCommon.ACTIVE_APP_ID + "&method=crashes",
            "fnServerData": function(sSource, aoData, fnCallback) {
                $.ajax({
                    "type": "POST",
                    "url": sSource,
                    "data": aoData,
                    "success": function(data) {
                        fnCallback(data);
                        $("#view-filter .bar-values").text(jQuery.i18n.prop('crashes.of-users', data.iTotalDisplayRecords, data.iTotalRecords));
                        $("#view-filter .bar span").text(Math.floor((data.iTotalDisplayRecords / data.iTotalRecords) * 100) + "%");
                        $("#view-filter .bar .bar-inner").animate({width: Math.floor((data.iTotalDisplayRecords / data.iTotalRecords) * 100) + "%"}, 1000);
                        $(".extable-link").off('click').on('click', function(e) {
                            e.stopPropagation();
                        });
                    }
                });
            },
            "fnServerParams": function(aoData) {
                if (self.filter) {
                    aoData.push({ "name": "filter", "value": self.filter });
                }
                if (self._query) {
                    aoData.push({ "name": "query", "value": JSON.stringify(self._query) });
                }
            },
            "fnRowCallback": function(nRow, aData) {
                $(nRow).attr("id", aData._id);

                if (aData.is_resolved) {
                    $(nRow).addClass("resolvedcrash");
                }
                else if (aData.is_new) {
                    $(nRow).addClass("newcrash");
                }
                else if (aData.is_renewed) {
                    $(nRow).addClass("renewedcrash");
                }

                $(nRow).find(".tag").tipsy({gravity: 'w'});
            },
            "aoColumns": [
                {
                    "mData": function(row) {
                        if (self.selectedCrashes[row._id]) {
                            return "<a class='fa fa-check-square check-green' id=\"" + row._id + "\"></a>";
                        }
                        else {
                            return "<a class='fa fa-square-o check-green'  id=\"" + row._id + "\"></a>";
                        }
                    },
                    "sType": "numeric",
                    "sClass": "center",
                    "sWidth": "30px",
                    "bSortable": false,
                    "sTitle": "<a class='fa fa-square-o check-green check-header'></a>"
                },
                {
                    "mData": function(row, type) {
                        if (type !== "display") {
                            return row.name;
                        }
                        var tagDivs = "";

                        // This separator is not visible in the UI but | is visible in exported data
                        var separator = "<span class='separator'>|</span>";

                        if (row.is_resolving) {
                            tagDivs += separator + "<div class='tag'>" + "<span style='color:green;'>" + jQuery.i18n.map["crashes.resolving"] + "</span>" + "</div>";
                        }
                        else if (row.is_resolved) {
                            tagDivs += separator + "<div class='tag'>" + "<span style='color:green;'>" + jQuery.i18n.map["crashes.resolved"] + " (" + (row.latest_version + "").replace(/:/g, '.') + ")</span>" + "</div>";
                        }
                        else {
                            tagDivs += separator + "<div class='tag'>" + "<span style='color:red;'>" + jQuery.i18n.map["crashes.unresolved"] + "</span>" + "</div>";
                        }

                        if (row.nonfatal) {
                            tagDivs += separator + "<div class='tag'>" + jQuery.i18n.map["crashes.nonfatal"] + "</div>";
                        }
                        else {
                            tagDivs += separator + "<div class='tag'>" + jQuery.i18n.map["crashes.fatal"] + "</div>";
                        }

                        if (row.session) {
                            tagDivs += separator + "<div class='tag'>" + ((Math.round(row.session.total / row.session.count) * 100) / 100) + " " + jQuery.i18n.map["crashes.sessions"] + "</div>";
                        }
                        else {
                            tagDivs += separator + "<div class='tag'>" + jQuery.i18n.map["crashes.first-crash"] + "</div>";
                        }

                        tagDivs += "<div class='tag not-viewed' title='" + jQuery.i18n.map["crashes.not-viewed"] + "'><i class='fa fa-eye-slash'></i></div>";
                        tagDivs += "<div class='tag re-occurred' title='" + jQuery.i18n.map["crashes.re-occurred"] + "'><i class='fa fa-refresh'></i></div>";

                        return "<div class='truncated'>" + row.name + "</div>" + "<div class='first-crash-line'>" + self.getFirstErrorLine(row) + "</div>" + tagDivs;
                    },
                    "sType": "string",
                    "sTitle": jQuery.i18n.map["crashes.error"]
                },
                {
                    "mData": function(row) {
                        return (row.not_os_specific) ? jQuery.i18n.map["crashes.varies"] : row.os;
                    },
                    "sType": "string",
                    "sTitle": jQuery.i18n.map["crashes.platform"],
                    "sWidth": "90px"
                },
                {
                    "mData": "reports",
                    "sType": "numeric",
                    "sTitle": jQuery.i18n.map["crashes.reports"],
                    "sWidth": "90px"
                },
                {
                    "mData": function(row, type) {
                        row.users = row.users || 1;
                        if (type === "display") {
                            return row.users + " (" + ((row.users / crashData.users.total) * 100).toFixed(2) + "%)";
                        }
                        else {
                            return row.users;
                        }
                    },
                    "sType": "string",
                    "sTitle": jQuery.i18n.map["crashes.users"],
                    "sWidth": "90px"
                },
                {
                    "mData": function(row, type) {
                        if (type === "display") {
                            return countlyCommon.formatTimeAgo(row.lastTs);
                        }
                        else {
                            return row.lastTs;
                        }
                    },
                    "sType": "format-ago",
                    "sTitle": jQuery.i18n.map["crashes.last_time"],
                    "sWidth": "150px"
                },
                {
                    "mData": function(row) {
                        return (row.latest_version + "").replace(/:/g, '.');
                    },
                    "sType": "string",
                    "sTitle": jQuery.i18n.map["crashes.latest_app"],
                    "sWidth": "90px"
                },
                {
                    "mData": function(row) {
                        return "<a class='extable-link table-link green'  href='#/crashes/" + row._id + "'   target='_blank'>" +
                            "<i class='material-icons'>open_in_new</i></a>" +
                            "<a class='table-link green external'>" + jQuery.i18n.map["common.view"] + "</a>";
                    },
                    "sType": "numeric",
                    "sClass": "center",
                    "sWidth": "90px",
                    "bSortable": false
                }
            ],
            "fnInitComplete": function(oSettings, json) {
                $.fn.dataTable.defaults.fnInitComplete(oSettings, json);
                var tableWrapper = $("#" + oSettings.sTableId + "_wrapper");
                tableWrapper.find(".dataTables_filter input").attr("placeholder", jQuery.i18n.map["crashes.search"]);

                // init sticky headers here in order to wait for correct
                // table width (for multi select checkboxes to render)
                self.dtable.stickyTableHeaders();
                $(".extable-link").off('click').on('click', function(e) {
                    e.stopPropagation();
                });
            }
        }));
        //this.dtable.fnSort( [ [5,'desc'] ] );
        this.dtable.find("thead .check-green").click(function() {
            if ($(this).hasClass("fa-check-square")) {
                $(".sticky-header .check-green").removeClass("fa-check-square").addClass("fa-square-o");
                self.dtable.find(".check-green").removeClass("fa-check-square").addClass("fa-square-o");
                self.selectedCrashesIds = [];
                self.selectedCrashes = {};
                $(".action-segmentation").addClass("disabled");
            }
            else {
                $(".sticky-header .check-green").removeClass("fa-square-o").addClass("fa-check-square");
                self.dtable.find(".check-green").removeClass("fa-square-o").addClass("fa-check-square");
                self.dtable.find(".check-green").parents("tr").each(function() {
                    var id = $(this).attr("id");
                    if (id) {
                        if (!self.selectedCrashes[id]) {
                            self.selectedCrashesIds.push(id);
                        }
                        self.selectedCrashes[id] = true;
                        $(".action-segmentation").removeClass("disabled");
                    }
                });
            }
        });

        $('.crashes tbody ').off("click", "tr").on("click", "tr", function() {
            var id = $(this).attr("id");
            if (id) {
                var link = "#/crashes/" + id ;
                window.open(link, "_self");
            }
        });

        $('.crashes tbody ').off("click", "td:first-child").on("click", "td:first-child", function(e) {
            e.cancelBubble = true; // IE Stop propagation
            if (e.stopPropagation) {
                e.stopPropagation();
            } // Other Broswers
            var id = $(this).parent().attr("id");
            if (id) {
                if (self.selectedCrashes[id]) {
                    $(this).find(".check-green").removeClass("fa-check-square").addClass("fa-square-o");
                    self.selectedCrashes[id] = null;
                    var index = self.selectedCrashesIds.indexOf(id);
                    if (index !== -1) {
                        self.selectedCrashesIds.splice(index, 1);
                    }
                }
                else {
                    self.selectedCrashes[id] = true;
                    self.selectedCrashesIds.push(id);
                    $(this).find(".check-green").removeClass("fa-square-o").addClass("fa-check-square");
                }

                if (self.selectedCrashesIds.length) {
                    $(".action-segmentation").removeClass("disabled");
                }
                else {
                    $(".action-segmentation").addClass("disabled");
                }
            }
        });

        $(".filter-segmentation").off("cly-select-change").on("cly-select-change", function(e, val) {
            self.filterCrashes(val);
        });
        $(".action-segmentation").off("cly-select-change").on("cly-select-change", function(e, val) {
            if (val !== "") {
                $(".action-segmentation").clySelectSetSelection("", jQuery.i18n.map["crashes.make-action"]);
                if (val === "crash-resolve") {
                    CountlyHelpers.confirm(jQuery.i18n.prop("crashes.confirm-action-resolved", self.selectedCrashesIds.length), "red", function(result) {
                        if (!result) {
                            return true;
                        }
                        countlyCrashes.markResolve(self.selectedCrashesIds, function(data) {
                            if (!data) {
                                CountlyHelpers.alert(jQuery.i18n.map["crashes.try-later"], "red");
                                self.resetSelection(true);
                            }
                        });
                    });
                }
                else if (val === "crash-unresolve") {
                    CountlyHelpers.confirm(jQuery.i18n.prop("crashes.confirm-action-unresolved", self.selectedCrashesIds.length), "red", function(result) {
                        if (!result) {
                            return true;
                        }
                        countlyCrashes.markUnresolve(self.selectedCrashesIds, function(data) {
                            if (!data) {
                                CountlyHelpers.alert(jQuery.i18n.map["crashes.try-later"], "red");
                            }
                            else {
                                self.resetSelection(true);
                            }
                        });
                    });
                }
                else if (val === "crash-hide") {
                    CountlyHelpers.confirm(jQuery.i18n.prop("crashes.confirm-action-hide", self.selectedCrashesIds.length), "red", function(result) {
                        if (!result) {
                            return true;
                        }
                        countlyCrashes.hide(self.selectedCrashesIds, function(data) {
                            if (!data) {
                                CountlyHelpers.alert(jQuery.i18n.map["crashes.try-later"], "red");
                            }
                            else {
                                self.resetSelection(true);
                            }
                        });
                    });
                }
                else if (val === "crash-resolving") {
                    CountlyHelpers.confirm(jQuery.i18n.prop("crashes.confirm-action-resolving", self.selectedCrashesIds.length), "red", function(result) {
                        if (!result) {
                            return true;
                        }
                        countlyCrashes.resolving(self.selectedCrashesIds, function(data) {
                            if (!data) {
                                CountlyHelpers.alert(jQuery.i18n.map["crashes.try-later"], "red");
                            }
                            else {
                                self.resetSelection(true);
                            }
                        });
                    });
                }
                else if (val === "crash-delete") {
                    CountlyHelpers.confirm(jQuery.i18n.prop("crashes.confirm-action-delete", self.selectedCrashesIds.length), "red", function(result) {
                        if (!result) {
                            return true;
                        }
                        countlyCrashes.del(self.selectedCrashesIds, function(data) {
                            if (!data) {
                                CountlyHelpers.alert(jQuery.i18n.map["crashes.try-later"], "red");
                            }
                            else {
                                self.resetSelection(true);
                            }
                        });
                    });
                }
            }
        });
    },
    getFirstErrorLine: function(row) {
        var rLineNumbers = /^\d+\s*/gim;
        var lines = row.error.split('\n');
        var line = row.name;
        for (var i = 0; i < lines.length; i++) {
            line = (lines[i] + "").trim().replace(rLineNumbers, "");
            if (line.length && (row.name + "").trim().replace(rLineNumbers, "") !== line) {
                break;
            }
        }
        return line;
    },
    resetSelection: function(flash) {
        if (flash) {
            this.dtable.find(".fa-check-square.check-green").parents("tr").addClass("flash");
        }
        this.selectedCrashesIds = [];
        this.selectedCrashes = {};
        this.dtable.find(".check-green").removeClass("fa-check-square").addClass("fa-square-o");
        $(".action-segmentation").addClass("disabled");
        this.refresh();
    },
    refreshFilterInfo: function(keepOpen) {

        if (!keepOpen) {
            $("#crashes-selector-graph").removeClass('active');
            $(".crashes-selector-form").hide();
        }

        var selectText = [];

        var activeFilter = countlyCrashes.getActiveFilter();

        selectText.push(jQuery.i18n.map['crashes.' + activeFilter.fatality] || jQuery.i18n.map['crashes.filter.all-fatalities']);
        selectText.push(activeFilter.platform || jQuery.i18n.map['crashes.filter.all-platforms']);
        selectText.push(countlyCrashes.getVersionName(activeFilter.version) || jQuery.i18n.map['crashes.filter.all-versions']);

        $("#crashes-selector-graph a").text(selectText.join(", "));

    },
    loadFilterBoxState: function() {
        var activeFilter = countlyCrashes.getActiveFilter();
        var version = activeFilter.version,
            platform = activeFilter.platform,
            fatality = activeFilter.fatality;

        if (platform) {
            $("#crashes_filter_platform").clySelectSetSelection(platform, platform);
        }
        else {
            $("#crashes_filter_platform").clySelectSetSelection(false, jQuery.i18n.map['crashes.filter.all-platforms']);
        }

        if (version) {
            $("#crashes_filter_version").clySelectSetSelection(version, countlyCrashes.getVersionName(version));
        }
        else {
            $("#crashes_filter_version").clySelectSetSelection(false, jQuery.i18n.map['crashes.filter.all-versions']);
        }

        if (fatality) {
            $("#crashes_filter_fatal_type").clySelectSetSelection(fatality, jQuery.i18n.map['crashes.' + fatality]);
        }
        else {
            $("#crashes_filter_fatal_type").clySelectSetSelection(false, jQuery.i18n.map['crashes.filter.all-fatalities']);
        }
    },
    addScriptsForFilter: function(crashData) {
        var self = this;

        var versionItems = Object.keys(crashData.crashes.app_version).map(function(version) {
            return {name: countlyCrashes.getVersionName(version), value: version};
        }).sort(function(a, b) {
            return countlyCommon.compareVersions(b.name, a.name);
        });
        var osItems = Object.keys(crashData.crashes.os).sort().map(function(os) {
            return {name: os, value: os};
        });
        var fatalItems = ["fatal", "nonfatal"].map(function(fatality) {
            return {name: jQuery.i18n.map["crashes." + fatality], value: fatality};
        });

        versionItems.unshift({name: jQuery.i18n.map['crashes.filter.all-versions'], value: false});
        osItems.unshift({name: jQuery.i18n.map['crashes.filter.all-platforms'], value: false});

        $("#crashes_filter_version").clySelectSetItems(versionItems);
        $("#crashes_filter_platform").clySelectSetItems(osItems);
        $("#crashes_filter_fatal_type").clySelectSetItems(fatalItems);

        $("#crashes-selector-graph").off("click").on("click", function() {
            if ($(this).hasClass('active')) {
                $(this).removeClass('active');
                $("#crashes-filter").hide();
            }
            else {
                self.loadFilterBoxState();
                $(this).addClass('active');
                $("#crashes-filter").show();
            }
        });

        $(".remove-crashes-filter").off("click").on("click", function() {
            countlyCrashes.resetActiveFilter();
            var oldFilter = countlyCrashes.getActiveFilter();

            self.filterObj = self.filterObj || {};
            if (oldFilter.version) {
                self.filterObj["app_version." + oldFilter.version] = {"$exists": true};
            }

            if (oldFilter.platform) {
                self.filterObj.os = {"$in": [oldFilter.platform]};
            }

            if (oldFilter.fatality) {
                self.filterObj.nonfatal = {"$eq": oldFilter.fatality === "nonfatal"};
            }
            self.loadFilterBoxState();
            self.refreshFilterInfo(true);
            self.refresh();
        });

        $(".apply-crashes-filter").off("click").on("click", function() {
            $("#crashes-selector-graph").removeClass('active');
            $(".crashes-selector-form").hide();

            var version = $("#crashes_filter_version").clySelectGetSelection();
            var platform = $("#crashes_filter_platform").clySelectGetSelection();
            var fatality = $("#crashes_filter_fatal_type").clySelectGetSelection();
            var oldFilter = countlyCrashes.getActiveFilter();

            countlyCrashes.setActiveFilter({
                version: version,
                platform: platform,
                fatality: fatality
            });

            self.filterObj = self.filterObj || {};
            if (version) {
                for (var i in self.filterObj) {
                    if (i.indexOf("app_version.") === 0) {
                        delete self.filterObj[i];
                    }
                }
                self.filterObj["app_version." + version] = {"$exists": true};
            }

            if (platform) {
                self.filterObj.os = {"$in": [platform]};
            }

            if (fatality) {
                self.filterObj.nonfatal = {"$eq": fatality === "nonfatal"};
            }


            self.refreshFilterInfo(false);
            if (oldFilter.version !== version || oldFilter.platform !== platform) {
                self.redraw(true);
            }
            else {
                self.redraw();
            }
            self.buildQuery();
            self.loadAndRefresh();
        });

        self.refreshFilterInfo();
        self.loadFilterBoxState();

        var onFilterBox = false;

        $(".filter-selector-wrapper").hover(function() {
            onFilterBox = true;
        }, function() {
            onFilterBox = false;
        });

        self.filterBoxCloseCallback = function() {
            if (!onFilterBox) {
                self.refreshFilterInfo(false);
            }
        };

        self.filterBoxEscapeCallback = function(e) {
            if (e.keyCode === 27) {
                self.refreshFilterInfo(false);
            }
        };

        $("body").keydown(self.filterBoxEscapeCallback);
        $('body').mouseup(self.filterBoxCloseCallback);
    },
    renderCommon: function(isRefresh) {
        var crashData = countlyCrashes.getData();
        var chartData = countlyCrashes.getChartData(this.curMetric, this.metrics[this.curMetric]);
        var dashboard = countlyCrashes.getDashboardData();
        var filterSelector = countlyCrashes.getActiveFilter();
        this.templateData = {
            "page-title": jQuery.i18n.map["crashes.title"],
            "no-data": jQuery.i18n.map["common.bar.no-data"],
            "usage": [
                {
                    "title": jQuery.i18n.map["crashes.total"],
                    "data": (filterSelector.fatality === "fatal") ? dashboard.usage.crf : dashboard.usage.crnf,
                    "id": "crash-cr",
                    "inverse": "inverse-trend",
                    "help": "crashes.help-total"
                },
                {
                    "title": jQuery.i18n.map["crashes.unique"],
                    "data": (filterSelector.fatality === "fatal") ? dashboard.usage.cruf : dashboard.usage.crunf,
                    "id": "crash-cru",
                    "inverse": "inverse-trend",
                    "help": "crashes.help-unique"
                },
                {//toal crashes pes session
                    "title": jQuery.i18n.map["crashes.total-per-session"],
                    "data": (filterSelector.fatality === "fatal") ? dashboard.usage.crtf : dashboard.usage.crtnf,
                    "id": "crash-cr-session",
                    "inverse": "inverse-trend",
                    "help": "crashes.help-session"
                },
                {
                    "title": jQuery.i18n.map["crashes.free-users"],
                    "data": (filterSelector.fatality === "fatal") ? dashboard.usage.crauf : dashboard.usage.craunf,
                    "id": "crash-crau",
                    "inverse": "",
                    "help": "crashes.help-free-users"
                },
                {
                    "title": jQuery.i18n.map["crashes.free-sessions"],
                    "data": (filterSelector.fatality === "fatal") ? dashboard.usage.crfses : dashboard.usage.crnfses,
                    "id": "crash-crses",
                    "inverse": "",
                    "help": "crashes.help-free-sessions"
                }
                /*,
                {
                    "title":jQuery.i18n.map["crashes.resolved-users"],
                    "data":dashboard.usage['crru'],
                    "id":"crash-crru",
                    "help":"crashes.help-resolved-users"
                }*/
            ],
            /*"chart-select": [
                {
                    title: jQuery.i18n.map["crashes.total_overall"],
                    trend: dashboard.usage.cr['trend-total'],
                    total: dashboard.usage.cr.total,
                    myclass: "crashes-total"
                },
                {
                    title: jQuery.i18n.map["crashes.fatal"],
                    trend: dashboard.usage.crf['trend-total'],
                    total: dashboard.usage.crf.total,
                    myclass: "crashes-fatal"
                },
                {
                    title: jQuery.i18n.map["crashes.nonfatal"],
                    trend: dashboard.usage.crnf['trend-total'],
                    total: dashboard.usage.crnf.total,
                    myclass: "crashes-nonfatal"
                },
            ],*/
            "big-numbers": {
                "items": [
                    {
                        "title": jQuery.i18n.map["crashes.unresolved-crashes"],
                        "total": countlyCommon.getShortNumber(crashData.crashes.unresolved),
                        "help": "crashes.help-unresolved"
                    },
                    {
                        "title": jQuery.i18n.map["crashes.highest-version"],
                        "total": crashData.crashes.highest_app,
                        "help": "crashes.help-latest-version"
                    },
                    {
                        "title": jQuery.i18n.map["crashes.new-crashes"],
                        "total": countlyCommon.getShortNumber(crashData.crashes.news),
                        "help": "crashes.help-new"
                    },
                    {
                        "title": jQuery.i18n.map["crashes.renew-crashes"],
                        "total": countlyCommon.getShortNumber(crashData.crashes.renewed),
                        "help": "crashes.help-reoccurred"
                    }
                ]
            },
            "bars": [
                {
                    "title": jQuery.i18n.map["crashes.resolution-status"],
                    "data": countlyCrashes.getResolvedBars(),
                    "help": "crashes.help-resolved"
                },
                {
                    "title": jQuery.i18n.map["crashes.affected-users"],
                    "data": countlyCrashes.getAffectedUsers(),
                    "help": "crashes.help-affected-levels"
                },
                {
                    "title": jQuery.i18n.map["crashes.platform"],
                    "data": countlyCrashes.getPlatformBars(),
                    "help": "crashes.help-platforms"
                },
                {
                    "title": jQuery.i18n.map["crashes.fatality"],
                    "data": countlyCrashes.getFatalBars(),
                    "help": "crashes.help-fatals"
                }
            ],
            hasDrill: typeof this.initDrill !== "undefined",
            "active-filter": jQuery.i18n.map["crashes.all"],
            "active-action": jQuery.i18n.map["crashes.make-action"]
        };
        if (crashData.loss) {
            this.templateData.loss = true;
            this.templateData["big-numbers"].items.push({
                "title": jQuery.i18n.map["crashes.loss"],
                "total": crashData.loss.toFixed(2),
                "help": "crashes.help-loss"
            });
        }
        var self = this;
        if (!isRefresh) {
            countlyCommon.drawTimeGraph(chartData.chartDP, "#dashboard-graph");
            chartData = countlyCrashes.getChartData(self.curMetric, self.metrics[self.curMetric], self.showOnGraph);
            $(this.el).html(this.template(this.templateData));
            self.switchMetric();
            self.addScriptsForFilter(crashData);

            $(".filter-segmentation").clySelectSetSelection(this.filter, jQuery.i18n.map["crashes." + this.filter.split("-").pop()]);

            $("#crash-" + this.curMetric).parents(".big-numbers").addClass("active");

            $(".widget-content .inner").click(function() {
                $(".big-numbers").removeClass("active");
                $(".big-numbers .select").removeClass("selected");
                $(this).parent(".big-numbers").addClass("active");
                $(this).find('.select').addClass("selected");
            });

            $(".big-numbers .inner").click(function() {
                var elID = $(this).find('.select').attr("id");
                if (elID) {
                    if (self.curMetric === (elID + "").replace("crash-", "")) {
                        return true;
                    }
                    self.curMetric = (elID + "").replace("crash-", "");
                    self.switchMetric();
                }
            });
            if (typeof self.initDrill !== "undefined") {
                self.byDisabled = true;
                $.when(countlySegmentation.initialize("[CLY]_crash")).then(function() {
                    self.initDrill();
                    self.buildQuery();
                    self.processData();
                });
            }
            else {
                $("#view-filter").hide();
                self.processData();
            }

            self.pageScripts();

            //load data from query into filter
            if (self._filter) {
                var oldFilter = countlyCrashes.getActiveFilter();
                var uiFilter = {version: null, platform: null, fatality: "fatal"};
                for (var key in self._query) {
                    if (key === "os" && self._query[key] && self._query[key].$in && self._query[key].$in[0]) {
                        uiFilter.platform = self._query[key].$in[0];
                    }
                    else if (key === "nonfatal" && self._query[key]) {
                        uiFilter.fatality = self._query[key].$eq ? "nonfatal" : "fatal";
                    }
                    else if (key.indexOf("app_version.") === 0) {
                        uiFilter.version = (key + "").split(".").pop();
                    }
                }

                countlyCrashes.setActiveFilter(uiFilter);
                if (oldFilter.version !== uiFilter.version || oldFilter.platform !== uiFilter.platform) {
                    self.redraw(true);
                }
                else {
                    self.redraw();
                }
            }

            self.refreshFilterInfo();
            self.loadFilterBoxState();

            $('.action-segmentation').attr('data-tooltip-content', "#action-segmentation-tooltip");

            $('.action-segmentation').tooltipster({
                theme: ['tooltipster-borderless'],
                contentCloning: false,
                interactive: false,
                trigger: 'hover',
                side: 'left',
                zIndex: 2,
                functionBefore: function() {
                    if (!$('.action-segmentation').hasClass("disabled")) {
                        return false;
                    }
                }
            });
        }

    },
    buildQuery: function() {
        var self = this;
        setTimeout(function() {
            self.filterBlockClone = $("#filter-view").clone(true);
            if (self._filter) {
                $("#filter-view").show();
                $(".filter-view-container").show();
                $("#filter-blocks").empty();
                self.adjustFilters();
                var lookup = {};
                for (var i in self.convertFilter) {
                    lookup[self.convertFilter[i].prop] = i;
                }
                var filter = self._query;
                var inputs = [];
                var subs = {};
                for (var n in filter) {
                    inputs.push(n);
                    subs[n] = [];
                    for (var j in filter[n]) {
                        if (filter[n][j].length) {
                            for (var k = 0; k < filter[n][j].length; k++) {
                                subs[n].push([j, filter[n][j][k]]);
                            }
                        }
                        else {
                            subs[n].push([j, filter[n][j]]);
                        }
                    }
                }
                var setInput = function(cur, sub, total) {
                    sub = sub || 0;
                    if (inputs[cur]) {
                        var filterType = subs[inputs[cur]][sub][0];
                        if (filterType === "$in" || filterType === "$eq") {
                            filterType = "=";
                        }
                        else if (filterType === "$nin" || filterType === "$ne") {
                            filterType = "!=";
                        }
                        else if (filterType === "$exists") {
                            if (subs[inputs[cur]][sub][0]) {
                                filterType = "=";
                            }
                            else {
                                filterType = "!=";
                            }
                        }

                        var val = subs[inputs[cur]][sub][1];
                        var el = $(".query:nth-child(" + (total) + ")");
                        el.find(".filter-name").trigger("click");
                        el.find(".filter-type").trigger("click");
                        var name = inputs[cur];
                        if (lookup[name]) {
                            name = lookup[name];
                        }
                        else if (name.indexOf(".") !== -1) {
                            var parts = name.split(".");
                            if (lookup[parts[0]]) {
                                name = lookup[parts[0]];
                                val = parts[1];
                            }
                        }
                        $(el).data("query_value", val + ""); //saves value as attribute for selected query
                        el.find(".filter-name").find(".select-items .item[data-value='" + name + "']").trigger("click");
                        el.find(".filter-type").find(".select-items .item[data-value='" + filterType + "']").trigger("click");
                        setTimeout(function() {
                            el.find(".filter-value").not(".hidden").trigger("click");
                            if (el.find(".filter-value").not(".hidden").find(".select-items .item[data-value='" + val + "']").length) {
                                el.find(".filter-value").not(".hidden").find(".select-items .item[data-value='" + val + "']").trigger("click");
                            }
                            else if (_.isNumber(val) && (val + "").length === 10) {
                                el.find(".filter-value.date").find("input").val(countlyCommon.formatDate(moment(val * 1000), "DD MMMM, YYYY"));
                                el.find(".filter-value.date").find("input").data("timestamp", val);
                            }
                            else {
                                el.find(".filter-value").not(".hidden").find("input").val(val);
                            }

                            if (subs[inputs[cur]].length === sub + 1) {
                                cur++;
                                sub = 0;
                            }
                            else {
                                sub++;
                            }
                            total++;
                            if (inputs[cur]) {
                                $("#filter-add-container").trigger("click");
                                if (sub > 0) {
                                    setTimeout(function() {
                                        el = $(".query:nth-child(" + (total) + ")");
                                        el.find(".and-or").find(".select-items .item[data-value='OR']").trigger("click");
                                        setInput(cur, sub, total);
                                    }, 500);
                                }
                                else {
                                    setInput(cur, sub, total);
                                }
                            }
                            else {
                                setTimeout(function() {
                                    $("#apply-filter").removeClass("disabled");
                                    $("#no-filter").hide();
                                    var filterData = self.getFilterObjAndByVal();
                                    $("#current-filter").show().find(".text").text(filterData.bookmarkText);
                                    $("#connector-container").show();
                                }, 500);
                            }
                        }, 500);
                    }
                };
                setInput(0, 0, 1);
            }
        }, 0);
    },
    redraw: function(needsRequest) {
        var self = this;
        if (needsRequest) {
            $.when(countlyCrashes.reload()).then(function() {
                self.renderCommon(true);
                var chartData = countlyCrashes.getChartData(self.curMetric, self.metrics[self.curMetric], self.showOnGraph);
                countlyCommon.drawTimeGraph(chartData.chartDP, "#dashboard-graph");
                var newPage = $("<div>" + self.template(self.templateData) + "</div>");
                $(".crashoveral .dashboard").replaceWith(newPage.find(".dashboard"));
                $("#crash-" + self.curMetric).parents(".big-numbers").addClass("active");
                self.pageScripts();
            });
        }
        else {
            self.renderCommon(true);
            var chartData = countlyCrashes.getChartData(self.curMetric, self.metrics[self.curMetric], self.showOnGraph);
            countlyCommon.drawTimeGraph(chartData.chartDP, "#dashboard-graph");
            var newPage = $("<div>" + self.template(self.templateData) + "</div>");
            $(".crashoveral .dashboard").replaceWith(newPage.find(".dashboard"));
            $("#crash-" + self.curMetric).parents(".big-numbers").addClass("active");
            self.pageScripts();
        }
    },
    refresh: function() {
        var self = this;
        if (this.loaded) {
            this.loaded = false;
            $.when(countlyCrashes.refresh()).then(function() {
                self.loaded = true;
                if (app.activeView !== self) {
                    return false;
                }
                self.renderCommon(true);
                var chartData = countlyCrashes.getChartData(self.curMetric, self.metrics[self.curMetric], self.showOnGraph);
                var newPage = $("<div>" + self.template(self.templateData) + "</div>");
                $(".crashoveral .dashboard").replaceWith(newPage.find(".dashboard"));
                $(".crash-big-numbers").replaceWith(newPage.find(".crash-big-numbers"));
                $(".dashboard-summary").replaceWith(newPage.find(".dashboard-summary"));
                $("#data-selector").replaceWith(newPage.find("#data-selector"));

                $("#crash-" + self.curMetric).parents(".big-numbers").addClass("active");

                self.dtable.fnDraw(false);

                self.pageScripts();
                countlyCommon.drawTimeGraph(chartData.chartDP, "#dashboard-graph");

                //app.localize();
            });
        }
    },
    getExportQuery: function() {
        var replacer = function(key, value) {
            if (value instanceof RegExp) {
                return ("__REGEXP " + value.toString());
            }
            else {
                return value;
            }
        };
        var qstring = {
            api_key: countlyGlobal.member.api_key,
            db: "countly",
            collection: "app_crashgroups" + countlyCommon.ACTIVE_APP_ID,
            query: this._query || {}
        };
        if ($('.dataTables_filter input').val().length) {
            qstring.query.name = {"$regex": new RegExp(".*" + $('.dataTables_filter input').val() + ".*", 'i')};
        }
        if (this.filter && this.filter !== "") {
            switch (this.filter) {
            case "crash-resolved":
                qstring.query.is_resolved = true;
                break;
            case "crash-hidden":
                qstring.query.is_hidden = true;
                break;
            case "crash-unresolved":
                qstring.query.is_resolved = false;
                break;
            case "crash-nonfatal":
                qstring.query.nonfatal = true;
                break;
            case "crash-fatal":
                qstring.query.nonfatal = false;
                break;
            case "crash-new":
                qstring.query.is_new = true;
                break;
            case "crash-viewed":
                qstring.query.is_new = false;
                break;
            case "crash-reoccurred":
                qstring.query.is_renewed = true;
                break;
            case "crash-resolving":
                qstring.query.is_resolving = true;
                break;
            }
        }
        if (this.filter !== "crash-hidden") {
            qstring.query.is_hidden = {$ne: true};
        }
        qstring.query._id = {$ne: "meta"};
        qstring.query = JSON.stringify(qstring.query, replacer);
        return qstring;
    },
    filterCrashes: function(filter) {
        this.filter = filter;
        store.set("countly_crashfilter", filter);
        $("#" + this.filter).addClass("selected").addClass("active");
        this.dtable.fnDraw();
    },
    pageScripts: function() {
        var self = this;
        $("#total-user-estimate-ind").off("click").on("click", function() {
            CountlyHelpers.alert(jQuery.i18n.map["common.estimation"], "black");
        });
        $(".big-numbers .inner").off("click").on("click", function() {
            var elID = $(this).find('.select').attr("id");

            if (elID) {
                if (self.curMetric === (elID + "").replace("crash-", "")) {
                    return true;
                }

                self.curMetric = (elID + "").replace("crash-", "");
                self.switchMetric();
            }
            $(".big-numbers").removeClass("active");
            $(".big-numbers .select").removeClass("selected");
            $(this).parent(".big-numbers").addClass("active");
            $(this).find('.select').addClass("selected");
        });
        $(".crashes-show-switch").unbind("click");
        $(".crashes-show-switch").removeClass("selected");
        for (var i in this.showOnGraph) {
            if (this.showOnGraph[i]) {
                $(".crashes-show-switch." + i).addClass("selected");
            }
        }

        $(".crashes-show-switch").off("click").on("click", function() {
            if ($(this).hasClass("selected")) {
                self.showOnGraph[$(this).data("type")] = false;
            }
            else {
                self.showOnGraph[$(this).data("type")] = true;
            }
            $(this).toggleClass("selected");
            self.refresh();
        });
    },
    switchMetric: function() {
        var chartData = countlyCrashes.getChartData(this.curMetric, this.metrics[this.curMetric], this.showOnGraph);
        countlyCommon.drawTimeGraph(chartData.chartDP, "#dashboard-graph");
        this.pageScripts();
    },
    getFilters: function() {
        var self = this;
        var usedFilters = {};

        $(".query:visible").each(function() {
            var filterType = $(this).find(".filter-name .text").data("type");
            // number and date types can be used multiple times for range queries
            if (filterType !== "n" && filterType !== "d") {
                usedFilters[$(this).find(".filter-name .text").data("value")] = true;
            }
        });

        var defaultFilters = countlySegmentation.getFilters(),
            allFilters = "";
        var filters = [];
        for (var i = 0; i < defaultFilters.length; i++) {
            if (defaultFilters[i].id) {
                if (self.convertFilter[defaultFilters[i].id]) {
                    filters.push(defaultFilters[i]);
                }
            }
        }
        var add = {
            "is_new": jQuery.i18n.map["crashes.new-crashes"],
            "is_resolved": jQuery.i18n.map["crashes.resolved"],
            "is_hidden": jQuery.i18n.map["crashes.hidden"],
            "is_renewed": jQuery.i18n.map["crashes.renew-crashes"],
            "reports": jQuery.i18n.map["crashes.reports"],
            "users": jQuery.i18n.map["crashes.affected-users"],
            "ram_min": jQuery.i18n.map["crashes.ram"] + " " + jQuery.i18n.map["crashes.min"].toLowerCase(),
            "ram_max": jQuery.i18n.map["crashes.ram"] + " " + jQuery.i18n.map["crashes.max"].toLowerCase(),
            "bat_min": jQuery.i18n.map["crashes.battery"] + " " + jQuery.i18n.map["crashes.min"].toLowerCase(),
            "bat_max": jQuery.i18n.map["crashes.battery"] + " " + jQuery.i18n.map["crashes.max"].toLowerCase(),
            "disk_min": jQuery.i18n.map["crashes.disk"] + " " + jQuery.i18n.map["crashes.min"].toLowerCase(),
            "disk_max": jQuery.i18n.map["crashes.disk"] + " " + jQuery.i18n.map["crashes.max"].toLowerCase(),
            "run_min": jQuery.i18n.map["crashes.run"] + " " + jQuery.i18n.map["crashes.min"].toLowerCase(),
            "run_max": jQuery.i18n.map["crashes.run"] + " " + jQuery.i18n.map["crashes.max"].toLowerCase()
        };

        for (var addKey in add) {
            filters.push({id: addKey, name: add[addKey], type: (addKey.indexOf("is_") === 0) ? "l" : "n"});
        }

        if (filters.length === 0) {
            CountlyHelpers.alert(jQuery.i18n.map["drill.no-filters"], "black");
        }

        for (i = 0; i < filters.length; i++) {
            if (typeof filters[i].id !== "undefined") {
                if (usedFilters[filters[i].id] === true) {
                    continue;
                }

                var tmpItem = $("<div>");

                tmpItem.addClass("item");
                tmpItem.attr("data-type", filters[i].type);
                tmpItem.attr("data-value", filters[i].id);
                tmpItem.text(filters[i].name);

                allFilters += tmpItem.prop('outerHTML');
            }
            else {
                var tmpItemWithFilterName = $("<div>");

                tmpItemWithFilterName.addClass("group");
                tmpItemWithFilterName.text(filters[i].name);

                allFilters += tmpItemWithFilterName.prop('outerHTML');
            }
        }

        return allFilters;
    },
    setUpFilters: function(elem) {
        var rootHTML = $(elem).parents(".query").find(".filter-value .select-items>div");
        if (this.convertFilter[$(elem).data("value")] && this.convertFilter[$(elem).data("value")].type === "boolsegment") {
            this.setUpFilterValues(rootHTML, ["yes", "no"], ["yes", "no"]);
        }
        else if (this.convertFilter[$(elem).data("value")] && this.convertFilter[$(elem).data("value")].type === "booltype") {
            this.setUpFilterValues(rootHTML, [true, false], ["yes", "no"]);
        }
        else {
            this.setUpFilterValues(rootHTML, countlySegmentation.getFilterValues($(elem).data("value")), countlySegmentation.getFilterNames($(elem).data("value")));
        }
    },
    generateFilter: function(filterObj, filterObjTypes) {
        var self = this;
        var dbFilter = {};
        for (var prop in filterObj) {
            var filter = (self.convertFilter[prop]) ? self.convertFilter[prop].prop : (prop + "").replace("sg.", "");
            for (var i = 0; i < filterObj[prop].length; i++) {
                if (_.isObject(filterObj[prop][i])) {
                    dbFilter[filter] = {};
                    for (var tmpFilter in filterObj[prop][i]) {
                        dbFilter[filter][tmpFilter] = filterObj[prop][i][tmpFilter];
                    }
                }
                else if (filterObjTypes[prop][i] === "!=") {
                    if (!self.convertFilter[prop] || self.convertFilter[prop].type === "segment" || self.convertFilter[prop].type === "boolsegment") {
                        if (filter === "os_version") {
                            filterObj[prop][i] = countlyDeviceDetails.getCleanVersion(filterObj[prop][i]);
                        }
                        dbFilter[filter + "." + filterObj[prop][i]] = {$exists: false};
                    }
                    else if (self.convertFilter[prop].type === "booltype") {
                        if (filterObj[prop][i] === "true") {
                            dbFilter[filter] = {$ne: true};
                        }
                        else {
                            dbFilter[filter] = {$eq: true};
                        }
                    }
                    else {
                        dbFilter[filter] = {};
                        if (!dbFilter[filter].$nin) {
                            dbFilter[filter].$nin = [];
                        }
                        dbFilter[filter].$nin.push(filterObj[prop][i]);
                    }
                }
                else {
                    if (!self.convertFilter[prop] || self.convertFilter[prop].type === "segment" || self.convertFilter[prop].type === "boolsegment") {
                        if (filter === "os_version") {
                            filterObj[prop][i] = countlyDeviceDetails.getCleanVersion(filterObj[prop][i]);
                        }
                        dbFilter[filter + "." + filterObj[prop][i]] = {$exists: true};
                    }
                    else if (self.convertFilter[prop].type === "booltype") {
                        if (filterObj[prop][i] === "true") {
                            dbFilter[filter] = {$eq: true};
                        }
                        else {
                            dbFilter[filter] = {$ne: true};
                        }
                    }
                    else {
                        dbFilter[filter] = {};
                        if (!dbFilter[filter].$in) {
                            dbFilter[filter].$in = [];
                        }
                        dbFilter[filter].$in.push(filterObj[prop][i]);
                    }
                }
            }
        }
        return dbFilter;
    },
    loadAndRefresh: function() {
        var filter = {};
        for (var i in this.filterObj) {
            filter[(i + "").replace("up.", "")] = this.filterObj[i];
        }
        this._query = filter;
        app.navigate("/crashes/filter/" + JSON.stringify(filter), false);
        this.dtable.fnPageChange(0);
        this.refresh(true);
    }
});

window.CrashgroupView = countlyView.extend({
    initialize: function() {
        this.loaded = true;
    },
    beforeRender: function() {
        this.old = false;
        countlyCrashes.reset();
        var self = this;
        return $.when(T.render('/crashes/templates/crashgroup.html', function(src) {
            self.template = src;
        }), countlyCrashes.initialize(this.id)).then(function() {});
    },
    renderCommon: function(isRefresh) {
        var url = location.protocol + '//' + location.hostname + (location.port ? ':' + location.port : '') + countlyGlobal.path + "/crash/";
        var crashData = countlyCrashes.getGroupData();
        if (crashData.url) {
            url += crashData.url;
        }
        crashData.latest_version = (crashData.latest_version + "").replace(/:/g, '.');

        if (this.old) {
            crashData.reserved_error = crashData.reserved_error || crashData.error;
            crashData.reserved_threads = crashData.reserved_threads || crashData.threads;
            crashData.error = crashData.olderror || crashData.error;
            crashData.threads = crashData.oldthreads || crashData.threads;
        }
        else {
            crashData.error = crashData.reserved_error || crashData.error;
            crashData.threads = crashData.reserved_threads || crashData.threads;
        }

        this.comments = {};

        if (typeof marked !== "undefined") {
            marked.setOptions({
                breaks: true
            });
        }

        if (crashData.comments) {
            for (var i = 0; i < crashData.comments.length; i++) {
                this.comments[crashData.comments[i]._id] = crashData.comments[i].text;
                if (typeof marked !== "undefined") {
                    crashData.comments[i].html = marked(crashData.comments[i].text);
                }
                else {
                    crashData.comments[i].html = crashData.comments[i].text;
                }
            }
        }

        if (!isRefresh) {
            this.metrics = countlyCrashes.getMetrics();
            for (var k in this.metrics) {
                for (var j in this.metrics[k]) {
                    this.curMetric = j;
                    this.curTitle = this.metrics[k][j];
                    break;
                }
                break;
            }
        }
        var ranges = ["ram", "disk", "bat", "run"];
        for (var r = 0; r < ranges.length; r++) {
            if (!crashData[ranges[r]]) {
                crashData[ranges[r]] = {min: 0, max: 0, total: 0, count: 1};
            }
        }
        this.templateData = {
            "page-title": jQuery.i18n.map["crashes.crashes-by"],
            "note-placeholder": jQuery.i18n.map["crashes.editnote"],
            "hasPermission": (countlyGlobal.member.global_admin || countlyGlobal.admin_apps[countlyCommon.ACTIVE_APP_ID]) ? true : false,
            "url": url,
            "data": crashData,
            "error": crashData.name.substr(0, 80),
            "fatal": (crashData.nonfatal) ? jQuery.i18n.map["crashes.nonfatal"] : jQuery.i18n.map["crashes.fatal"],
            "active-segmentation": this.curTitle,
            "segmentations": this.metrics,
            "big-numbers": {
                "class": "four-column",
                "items": [
                    {
                        "title": jQuery.i18n.map["crashes.platform"],
                        "total": (crashData.not_os_specific) ? jQuery.i18n.map["crashes.varies"] : crashData.os,
                        "help": "crashes.help-platform"
                    },
                    {
                        "title": jQuery.i18n.map["crashes.reports"],
                        "total": crashData.reports,
                        "help": "crashes.help-reports"
                    },
                    {
                        "title": jQuery.i18n.map["crashes.affected-users"],
                        "total": crashData.users + " (" + ((crashData.users / crashData.total) * 100).toFixed(2) + "%)",
                        "help": "crashes.help-affected"
                    },
                    {
                        "title": jQuery.i18n.map["crashes.highest-version"],
                        "total": (crashData.latest_version + "").replace(/:/g, '.'),
                        "help": "crashes.help-app-version"
                    }
                ]
            }
        };
        if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type !== "web") {
            this.templateData.ranges = [
                {
                    "title": jQuery.i18n.map["crashes.ram"],
                    "icon": "memory",
                    "help": "crashes.help-ram",
                    "min": crashData.ram.min + " %",
                    "max": crashData.ram.max + " %",
                    "avg": (crashData.ram.total / crashData.ram.count).toFixed(2) + " %"
                },
                {
                    "title": jQuery.i18n.map["crashes.disk"],
                    "icon": "sd_storage",
                    "help": "crashes.help-disk",
                    "min": crashData.disk.min + " %",
                    "max": crashData.disk.max + " %",
                    "avg": (crashData.disk.total / crashData.disk.count).toFixed(2) + " %"
                },
                {
                    "title": jQuery.i18n.map["crashes.battery"],
                    "icon": "battery_full",
                    "help": "crashes.help-battery",
                    "min": crashData.bat.min + " %",
                    "max": crashData.bat.max + " %",
                    "avg": (crashData.bat.total / crashData.bat.count).toFixed(2) + " %"
                },
                {
                    "title": jQuery.i18n.map["crashes.run"],
                    "icon": "play_arrow",
                    "help": "crashes.help-run",
                    "min": countlyCommon.timeString(crashData.run.min / 60),
                    "max": countlyCommon.timeString(crashData.run.max / 60),
                    "avg": countlyCommon.timeString((crashData.run.total / crashData.run.count) / 60)
                }
            ];

            this.templateData.bars = [
                {
                    "title": jQuery.i18n.map["crashes.root"],
                    "data": countlyCrashes.getBoolBars("root"),
                    "help": "crashes.help-root"
                },
                {
                    "title": jQuery.i18n.map["crashes.online"],
                    "data": countlyCrashes.getBoolBars("online"),
                    "help": "crashes.help-online"
                },
                {
                    "title": jQuery.i18n.map["crashes.muted"],
                    "data": countlyCrashes.getBoolBars("muted"),
                    "help": "crashes.help-muted"
                },
                {
                    "title": jQuery.i18n.map["crashes.background"],
                    "data": countlyCrashes.getBoolBars("background"),
                    "help": "crashes.help-background"
                }
            ];
        }
        if (crashData.loss) {
            this.templateData.loss = true;
            this.templateData["big-numbers"].items.push({
                "title": jQuery.i18n.map["crashes.loss"],
                "total": parseFloat(crashData.loss).toFixed(2),
                "help": "crashes.help-loss"
            });
        }

        if (this.templateData["big-numbers"].items.length === 3) {
            this.templateData["big-numbers"].class = "three-column";
        }
        else if (this.templateData["big-numbers"].items.length === 5) {
            this.templateData["big-numbers"].class = "five-column";
        }

        if (crashData.session && this.templateData.ranges) {
            this.templateData.frequency = true;
            this.templateData.ranges.push({
                "title": jQuery.i18n.map["crashes.sessions"],
                "icon": "repeat",
                "help": "crashes.help-frequency",
                "min": crashData.session.min,
                "max": crashData.session.max,
                "avg": ((Math.round(crashData.session.total / crashData.session.count) * 100) / 100)
            });
        }

        var changeResolveStateText = function() {
            if (crashData.is_resolving) {
                $("#resolve-state").text(jQuery.i18n.map["crashes.resolving"]);
                $("#resolve-state").attr('class', 'resolving-text');

                $("#crash-resolving-button").hide();
                $("#crash-resolve-button").show();
                $("#crash-unresolve-button").show();
            }
            else if (crashData.is_resolved) {
                $("#resolve-state").text(jQuery.i18n.map["crashes.resolved"] + "(" + crashData.resolved_version + ")");
                $("#resolve-state").attr('class', 'resolved-text');

                $("#crash-resolving-button").show();
                $("#crash-resolve-button").hide();
                $("#crash-unresolve-button").show();
            }
            else {
                $("#resolve-state").text(jQuery.i18n.map["crashes.unresolved"]);
                $("#resolve-state").attr('class', 'unresolved-text');

                $("#crash-resolving-button").show();
                $("#crash-resolve-button").show();
                $("#crash-unresolve-button").hide();
            }

            if (crashData.is_hidden) {
                $("#crash-hide-button").hide();
                $("#crash-show-button").show();
            }
            else {
                $("#crash-hide-button").show();
                $("#crash-show-button").hide();
            }

            app.localize();
        };

        var self = this;
        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));

            if (app.crashesView.isAppleOs(crashData.os)) {
                $(".error-details-menu[data-id=\"" + crashData.lrid + "\"] .error-download-stracktrace").after('<div class="error-show-binaries item" id="show-binaries-' + crashData._id + '">' + jQuery.i18n.map['crashes.show-binary-images'] + '</div>');
            }

            changeResolveStateText(crashData);

            $('#crash-notes').click(function() {
                $('#tabs').addClass('hide-message');
            });

            $('#crash-errors').click(function() {
                $('#tabs').removeClass('hide-message');
            });

            if (typeof addDrill !== "undefined") {
                $("#content .widget:first-child .widget-header>.right").append(addDrill("sg.crash", this.id, "[CLY]_crash"));
            }
            $(".back-link").click(function(e) {
                e.preventDefault();
                app.back("/crashes");
                return false;
            });
            if (crashData.comments) {
                var count = 0;
                for (var n = 0; n < crashData.comments.length; n++) {
                    if (!crashData.comments[n].is_owner && typeof store.get("countly_" + this.id + "_" + crashData.comments[n]._id) === "undefined") {
                        count++;
                    }
                }
                if (count > 0) {
                    $(".crash-comment-count span").text(count + "");
                    $(".crash-comment-count").show();
                }
            }
            $(".segmentation-option").off("click").on("click", function() {
                self.switchMetric($(this).data("value"));
            });
            this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaSorting": [[1, 'desc']],
                "aaData": crashData.data || [],
                "fnRowCallback": function(nRow, aData) {
                    $(nRow).attr("id", aData._id);
                },
                "aoColumns": [
                    CountlyHelpers.expandRowIconColumn(),
                    {
                        "mData": function(row, type) {
                            if (type === "display") {
                                return countlyCommon.formatTimeAgo(row.ts);
                            }
                            else {
                                return row.ts;
                            }
                        },
                        "sType": "format-ago",
                        "sTitle": jQuery.i18n.map["crashes.crashed"]
                    },
                    {
                        "mData": function(row) {
                            var str = row.os;
                            if (row.os_version) {
                                str += " " + (row.os_version + "").replace(/:/g, '.');
                            } return str;
                        },
                        "sType": "string",
                        "sTitle": jQuery.i18n.map["crashes.os_version"]
                    },
                    {
                        "mData": function(row) {
                            var str = ""; if (row.manufacture) {
                                str += row.manufacture + " ";
                            } if (row.device) {
                                str += countlyDeviceList[row.device] || row.device;
                            } return str;
                        },
                        "sType": "string",
                        "sTitle": jQuery.i18n.map["crashes.device"]
                    },
                    {
                        "mData": function(row) {
                            return (row.app_version + "").replace(/:/g, '.');
                        },
                        "sType": "string",
                        "sTitle": jQuery.i18n.map["crashes.app_version"]
                    }
                ]
            }));
            this.dtable.stickyTableHeaders();

            /*$('.crash-reports tbody').off("click", "tr").on("click", "tr", function (){
                var id = $(this).attr("id");
                if(id)
                    window.location.hash = window.location.hash.toString()+"/"+id;
            });*/
            CountlyHelpers.expandRows(this.dtable, this.formatData, this);
            countlyCommon.drawGraph(crashData.dp[this.curMetric], "#dashboard-graph", "bar");

            $("#crash-share-button").click(function() {
                if ($(this).hasClass("active")) {
                    $(this).removeClass("active");
                    $("#crash-share-list").hide();
                }
                else {
                    $(this).addClass("active");
                    $("#crash-share-list").show();
                }
            });

            $("#share-crash-done").click(function() {
                $("#crash-share-button").removeClass("active");
                $("#crash-share-list").hide();
            });

            if (crashData.is_public) {
                $('#crash-share-public').prop('checked', true);
                $(".crash-share").show();
            }
            else {
                $('#crash-share-public').prop('checked', false);
                $(".crash-share").hide();
            }

            if (crashData.share) {
                for (var c in crashData.share) {
                    if (crashData.share[c]) {
                        $('#crash-share-' + c).prop('checked', true);
                    }
                }
            }

            $('.crash-share input[type=checkbox]').change(function() {
                var opts = {};
                $('.crash-share input[type=checkbox]').each(function() {
                    opts[(this.id + "").replace("crash-share-", "")] = ($(this).is(":checked")) ? 1 : 0;
                });
                countlyCrashes.modifyShare(crashData._id, opts);
            });

            $('#crash-share-public').change(function() {
                if ($(this).is(":checked")) {
                    countlyCrashes.share(crashData._id, function(data) {
                        if (data) {
                            app.recordEvent({
                                "key": "crash-share",
                                "count": 1,
                                "segmentation": {}
                            });
                            $(".crash-share").show();
                        }
                        else {
                            CountlyHelpers.alert(jQuery.i18n.map["crashes.try-later"], "red");
                        }
                    });
                }
                else {
                    countlyCrashes.unshare(crashData._id, function(data) {
                        if (data) {
                            $(".crash-share").hide();
                        }
                        else {
                            CountlyHelpers.alert(jQuery.i18n.map["crashes.try-later"], "red");
                        }
                    });
                }
            });

            this.tabs = $("#tabs").tabs({
                select: function() {
                    $(".flot-text").hide().show(0);
                }
            });
            this.tabs.off("tabsactivate").on("tabsactivate", function(event, ui) {
                if (ui && ui.newPanel) {
                    var id = $(ui.newPanel).attr("id") + "";
                    if (id === "notes") {
                        $(ui.newPanel).closest("#tabs").find(".error_menu").hide();
                    }
                    else {
                        $(ui.newPanel).closest("#tabs").find(".error_menu").show();
                    }
                }
            });
            $("#crash-notes").click(function() {
                var crashNoteData = countlyCrashes.getGroupData();
                if (crashNoteData.comments) {
                    for (var a = 0; a < crashNoteData.comments.length; a++) {
                        store.set("countly_" + self.id + "_" + crashNoteData.comments[a]._id, true);
                    }
                    $(".crash-comment-count").hide();
                }
            });
            $("#add_comment").click(function() {
                var comment = {};
                comment.time = new Date().getTime();
                comment.text = $("#comment").val();
                countlyCrashes.addComment(crashData._id, comment, function(data) {
                    if (data) {
                        self.refresh();
                        $("#comment").val("");
                    }
                    else {
                        CountlyHelpers.alert(jQuery.i18n.map["crashes.try-later"], "red");
                    }
                });
            });
            $("#notes").off("click", ".crash-comment-edit").on("click", ".crash-comment-edit", function() {
                var container = $(this).parents(".comment");
                if (!container.find("#comment_edit").length) {
                    var comment_id = $(this).data("id");
                    container.find(".text").hide();
                    container.append($("#comment_edit").clone());
                    container.find("textarea").val(self.comments[comment_id]);
                    container.find(".cancel_comment").click(function() {
                        container.find("#comment_edit").remove();
                        container.find(".text").show();
                    });
                    container.find(".edit_comment").click(function() {
                        var comment = {};
                        comment.time = new Date().getTime();
                        comment.text = container.find("#edited_comment").val();
                        comment.comment_id = comment_id;
                        countlyCrashes.editComment(crashData._id, comment, function(data) {
                            if (data) {
                                self.refresh();
                                container.find("#comment_edit").remove();
                                container.find(".text").show();
                            }
                            else {
                                CountlyHelpers.alert(jQuery.i18n.map["crashes.try-later"], "red");
                            }
                        });
                    });
                }
            });
            $("#notes").off("click", ".crash-comment-delete").on("click", ".crash-comment-delete", function() {
                var ob = {};
                ob.comment_id = $(this).data("id");
                CountlyHelpers.confirm(jQuery.i18n.map["crashes.confirm-comment-delete"], "red", function(result) {
                    if (!result) {
                        return true;
                    }
                    countlyCrashes.deleteComment(crashData._id, ob, function(data) {
                        if (data) {
                            $("#comment_" + ob.comment_id).remove();
                            self.refresh();
                        }
                        else {
                            CountlyHelpers.alert(jQuery.i18n.map["crashes.try-later"], "red");
                        }
                    });
                });
            });

            $("#expand-crash").off("click").on("click", function() {
                $(this).toggleClass("active");
                $("#expandable").toggleClass("collapsed");
            });

            var errorHeight = $("#expandable").find("code").outerHeight();

            if (errorHeight < 200) {
                $("#expandable").removeClass("collapsed");
                $("#expand-crash").hide();
            }
            else {
                $("#expandable").addClass("collapsed");
                $("#expand-crash").show();
            }

            $("#threads").off("click", ".expand-row-icon").on("click", ".expand-row-icon", function() {
                var el = $(this);
                if (el.hasClass("expand-row-icon")) {
                    var thread = el.closest(".thread");
                    var id = parseInt(thread.attr("data-id"));
                    if (typeof id !== "undefined") {
                        var code = thread.find("code");
                        if (code.hasClass("short_code")) {
                            el.text("keyboard_arrow_up");
                            code.html(crashData.threads[id].error);
                        }
                        else {
                            el.text("keyboard_arrow_down");
                            code.html(crashData.threads[id].short_error);
                        }
                        code.toggleClass("short_code");
                    }
                }
            });

            $("#expand-thread").off("click").on("click", function() {
                $(this).toggleClass("active");
                $("#expandable_thread").toggleClass("collapsed");
            });

            $("document").ready(function() {
                self.highlightStacktrace(crashData.error, function(highlighted) {
                    $("#error pre code").html(highlighted);
                });
            });

            $("#crashgroup-manipulation-trigger").off("click").on("click", function() {
                $("#crashgroup-manipulation-menu").toggle();

                var isHidden = $("#crashgroup-manipulation-menu").is(":hidden");

                $("#crashgroup-manipulation-menu").css("opacity", isHidden ? 0 : 1);

                if (isHidden) {
                    $("#crashgroup-manipulation-trigger i").removeClass("ion-chevron-up").addClass("ion-chevron-down");
                }
                else {
                    $("#crashgroup-manipulation-trigger i").removeClass("ion-chevron-down").addClass("ion-chevron-up");
                }
            });

            $(document).on("click", function(e) {
                var $menu = $("#crashgroup-manipulation-menu");
                var $trigger = $("#crashgroup-manipulation-trigger");

                if (!$trigger.is(e.target) && $trigger.has(e.target).length === 0 && !$menu.is(e.target) && $menu.has(e.target).length === 0) {
                    $("#crashgroup-manipulation-menu").css("opacity", 0);
                    $("#crashgroup-manipulation-menu").hide();
                }

                if ($("#crashgroup-manipulation-menu").is(":hidden")) {
                    $("#crashgroup-manipulation-trigger i").removeClass("ion-chevron-up").addClass("ion-chevron-down");
                }
                else {
                    $("#crashgroup-manipulation-trigger i").removeClass("ion-chevron-down").addClass("ion-chevron-up");
                }
            });

            $("#crashgroup-manipulation-menu .item.crash-manipulation-button").off("click").on("click", function(event) {
                switch ($(event.target).attr("id")) {
                case "crash-resolve-button":
                    countlyCrashes.markResolve(crashData._id, function(version) {
                        if (version) {
                            crashData.is_resolved = true;
                            crashData.is_resolving = false;
                            crashData.resolved_version = version;
                            changeResolveStateText(crashData);
                        }
                        else {
                            CountlyHelpers.alert(jQuery.i18n.map["crashes.try-later"], "red");
                        }
                    });
                    break;
                case "crash-resolving-button":
                    countlyCrashes.resolving([crashData._id], function(data) {
                        if (!data) {
                            CountlyHelpers.alert(jQuery.i18n.map["crashes.try-later"], "red");
                        }
                        else {
                            crashData.is_resolving = true;
                            changeResolveStateText(crashData);
                        }
                    });
                    break;
                case "crash-unresolve-button":
                    countlyCrashes.markUnresolve(crashData._id, function(data) {
                        if (data) {
                            crashData.is_resolved = false;
                            crashData.is_resolving = false;
                            changeResolveStateText(crashData);
                        }
                        else {
                            CountlyHelpers.alert(jQuery.i18n.map["crashes.try-later"], "red");
                        }
                    });
                    break;
                case "crash-hide-button":
                    countlyCrashes.hide(crashData._id, function(data) {
                        if (data) {
                            crashData.is_hidden = true;
                            changeResolveStateText(crashData);
                        }
                        else {
                            CountlyHelpers.alert(jQuery.i18n.map["crashes.try-later"], "red");
                        }
                    });
                    break;
                case "crash-show-button":
                    countlyCrashes.show(crashData._id, function(data) {
                        if (data) {
                            crashData.is_hidden = false;
                            changeResolveStateText(crashData);
                        }
                        else {
                            CountlyHelpers.alert(jQuery.i18n.map["crashes.try-later"], "red");
                        }
                    });
                    break;
                case "crash-delete-button":
                    CountlyHelpers.confirm(jQuery.i18n.map["crashes.confirm-delete"], "red", function(result) {
                        if (!result) {
                            return true;
                        }
                        countlyCrashes.del(crashData._id, function(data) {
                            if (data) {
                                if (data.result === "Success") {
                                    window.location.hash = "/crashes";
                                }
                                else {
                                    CountlyHelpers.alert(data.result, "red");
                                }
                            }
                            else {
                                CountlyHelpers.alert(jQuery.i18n.map["crashes.try-later"], "red");
                            }
                        });
                    });
                    break;
                }
            });

            $(".routename-crashgroup").off("click", ".cly-button-menu-trigger").on("click", ".cly-button-menu-trigger", function(event) {
                var menu = $(this).closest(".error-details-menu");
                event.stopPropagation();
                $(event.target).toggleClass("active");
                if ($(event.target).hasClass("active")) {
                    menu.find('.cly-button-menu').focus();
                }
                else {
                    $(event.target).removeClass("active");
                }
            });
            $(".routename-crashgroup").off("blur", ".cly-button-menu").on("blur", ".cly-button-menu", function() {
                $(this).closest(".error-details-menu").find(".cly-button-menu-trigger").removeClass("active");
            });

            $(".routename-crashgroup").off("click", ".error-download-stracktrace").on("click", ".error-download-stracktrace", function() {
                var menu = $(this).closest(".error-details-menu");
                menu.find(".cly-button-menu-trigger").toggleClass("active");
                var id = menu.attr("data-id");
                if (id) {
                    var win = window.open(countlyCommon.API_PARTS.data.r + "/crashes/download_stacktrace?auth_token=" + countlyGlobal.auth_token + "&app_id=" + countlyCommon.ACTIVE_APP_ID + "&crash_id=" + id, '_blank');
                    win.focus();
                }
            });

            $(".routename-crashgroup").off("click", ".error-show-binaries").on("click", ".error-show-binaries", function() {
                var menu = $(this).closest(".error-details-menu");
                var id = menu.attr("data-id");
                if (id) {
                    app.navigate('/crash/symbols/' + app.crashgroupView.id + "/" + id, true);
                }
            });

            $(".routename-crashgroup").off("click", ".error-download-binary").on("click", ".error-download-binary", function() {
                var menu = $(this).closest(".error-details-menu");
                menu.find(".cly-button-menu-trigger").toggleClass("active");
                var id = menu.attr("data-id");
                if (id) {
                    var win = window.open(countlyCommon.API_PARTS.data.r + "/crashes/download_binary?auth_token=" + countlyGlobal.auth_token + "&app_id=" + countlyCommon.ACTIVE_APP_ID + "&crash_id=" + id, '_blank');
                    win.focus();
                }
            });

            if (crashData.native_cpp) {
                $(".error-download-binary").show();
            }
        }
    },
    highlightStacktrace: function(code, callback) {
        // create virtual element for clean escapes
        var span = document.createElement('span');
        span.innerHTML = code;
        code = span.innerText;
        var lines = '';
        // generate lines
        var num = code.split(/\r\n|\n|\r/).length;
        for (var i = 0; i < num; i++) {
            lines += '<span>' + (i + 1) + '</span>';
        }
        if (typeof Worker !== "undefined") {
            var worker = new Worker(countlyGlobal.path + '/javascripts/utils/highlight/highlight.worker.js');
            worker.onmessage = function(event) {
                worker.terminate();
                worker = undefined;
                callback('<span class="line-number">' + lines + '</span>' + event.data + '<span class="cl"></span>');
            };
            worker.postMessage(code);
        }
        else if (typeof hljs !== "undefined") {
            callback('<span class="line-number">' + lines + '</span>' + hljs.highlightBlock(code) + '<span class="cl"></span>');
        }
    },
    refresh: function(force) {
        var self = this;
        if (this.loaded || force) {
            this.loaded = false;
            $.when(countlyCrashes.initialize(this.id, true)).then(function() {
                self.loaded = true;
                if (app.activeView !== self) {
                    return false;
                }
                self.resetData();
            });
        }
    },
    resetData: function() {
        var self = this;
        self.renderCommon(true);
        var newPage = $("<div>" + self.template(self.templateData) + "</div>");
        $("#big-numbers-container").replaceWith(newPage.find("#big-numbers-container"));
        $(".grouped-numbers").replaceWith(newPage.find(".grouped-numbers"));
        $(".crash-bars").replaceWith(newPage.find(".crash-bars"));
        $("#error-title").replaceWith(newPage.find("#error-title"));

        var crashData = countlyCrashes.getGroupData();
        if (self.old) {
            crashData.reserved_error = crashData.reserved_error || crashData.error;
            crashData.reserved_threads = crashData.reserved_threads || crashData.threads;
            crashData.error = crashData.olderror || crashData.error;
            crashData.threads = crashData.oldthreads || crashData.threads;
        }
        else {
            crashData.error = crashData.reserved_error || crashData.error;
            crashData.threads = crashData.reserved_threads || crashData.threads;
        }
        self.highlightStacktrace(crashData.error, function(highlighted) {
            $("#error pre code").html(highlighted);
            var errorHeight = $("#expandable").find("code").outerHeight();

            //self.redecorateStacktrace();
            if (errorHeight < 200) {
                $("#expandable").removeClass("collapsed");
                $("#expand-crash").hide();
            }
            else {
                if ($('#expand-crash:visible').length === 0) {
                    $("#expandable").addClass("collapsed");
                    $("#expand-crash").show();
                }
            }
        });

        if (crashData.threads) {
            var opened_threads = [];
            $(".threads-list code").each(function() {
                var code = $(this);
                if (!code.hasClass("short_code")) {
                    var id = code.closest(".thread").attr("data-id");
                    if (typeof id !== "undefined") {
                        opened_threads.push(id);
                    }
                }
            });
            $(".threads-list").replaceWith(newPage.find(".threads-list"));
            var thread;
            for (var j = 0; j < opened_threads.length; j++) {
                thread = $('.thread[data-id="' + opened_threads[j] + '"]');
                thread.find("code").removeClass("short_code").html(crashData.threads[opened_threads[j]].error);
                thread.find(".expand-row-icon").text("keyboard_arrow_up");
            }
        }


        if (crashData.comments) {
            var container = $("#comments");
            var comment, parent;
            var count = 0;
            for (var i = 0; i < crashData.comments.length; i++) {
                self.comments[crashData.comments[i]._id] = crashData.comments[i].text;
                comment = crashData.comments[i];
                if (container.find("#comment_" + comment._id).length) {
                    parent = container.find("#comment_" + comment._id);
                    parent.find(".text").html(newPage.find("#comment_" + comment._id + " .text").html());
                    parent.find(".author").html(newPage.find("#comment_" + comment._id + " .author").html());
                    parent.find(".time").html(newPage.find("#comment_" + comment._id + " .time").html());
                }
                else {
                    container.append(newPage.find("#comment_" + comment._id));
                }

                if (!crashData.comments[i].is_owner && typeof store.get("countly_" + self.id + "_" + comment._id) === "undefined") {
                    count++;
                }
            }
            if (count > 0) {
                $(".crash-comment-count span").text(count + "");
                $(".crash-comment-count").show();
            }
        }
        var ids = self.dtable.find(".cly-button-menu-trigger.active").map(function() {
            return $(this).closest(".error-details-menu").attr("data-id");
        });
        CountlyHelpers.refreshTable(self.dtable, crashData.data);
        countlyCommon.drawGraph(crashData.dp[self.curMetric], "#dashboard-graph", "bar");
        CountlyHelpers.reopenRows(self.dtable, self.formatData, self);
        for (var k = 0; k < ids.length; k++) {
            $('.error-details-menu[data-id="' + ids[k] + '"]').find(".cly-button-menu-trigger").addClass("active");
        }
        app.localize();
    },
    formatData: function(data, self) {
        // `d` is the original data object for the row
        var str = '';
        if (data) {
            str += '<div class="datatablesubrow crash-detail-subrow">' +
                   '<div class="error_menu">' +
                    '<div class="error-details-menu" data-id="' + data._id + '">' +
                        '<a class="right icon-button cly-button-menu-trigger"></a>' +
                        '<div class="cly-button-menu" tabindex="100">' +
                            '<div class="error-download-stracktrace item">' + jQuery.i18n.map["crashes.download-stacktrace"] + '</div>';
            if (app.crashesView.isAppleOs(data.os)) {
                str += '<div class="error-show-binaries item" id="show-binaries-' + data._id + '">' + jQuery.i18n.map['crashes.show-binary-images'] + '</div>';
            }
            if (data.native_cpp) {
                str += '<div class="error-download-binary item">' + jQuery.i18n.map["crashes.download-binary"] + '</div>';
            }
            str += '</div>' +
                    '</div>' +
                '</div>' +
                '<table>' +
                        '<tr>' +
                            '<td class="text-left">' + jQuery.i18n.map["crashes.build_info"] + '</td>' +
                            '<td class="text-left">' + jQuery.i18n.map["crashes.device"] + '</td>' +
                            '<td class="text-left">' + jQuery.i18n.map["crashes.state"] + '</td>';
            if (data.custom) {
                str += '<td class="text-left">' + jQuery.i18n.map["crashes.custom"] + '</td>';
            }
            str += '</tr>' +
                        '<tr>' +
                        '<td class="text-left">' + jQuery.i18n.map["crashes.app_version"] + ": " + (data.app_version + "").replace(/:/g, '.');
            if (data.os === 'iOS') {
                str += '<br>' + jQuery.i18n.map["crashes.build_id"] + ": " + data.app_build;
            }
            str += '</td>' +
                '<td class="text-left">' + data.os + ' ';
            if (data.os_version) {
                str += (data.os_version + "").replace(/:/g, '.') + '<br/>';
            }
            if (data.manufacture) {
                str += data.manufacture;
            }+' ';
            if (data.device) {
                str += countlyDeviceList[data.device] || data.device;
            }
            if (data.cpu) {
                str += ' (' + data.cpu + ')';
            }
            str += '<br/>';
            if (data.opengl) {
                str += jQuery.i18n.map["crashes.opengl"] + ': ' + data.opengl + '<br/>';
            }
            if (data.resolution) {
                str += jQuery.i18n.map["crashes.resolution"] + ': ' + data.resolution + '<br/>';
            }
            str += jQuery.i18n.map["crashes.root"] + ': ' + ((data.root) ? "yes" : "no") + '<br/>';
            str += '</td>' +
                            '<td class="text-left">';
            if (data.ram_current && data.ram_total) {
                str += jQuery.i18n.map["crashes.ram"] + ': ' + data.ram_current + '/' + data.ram_total + ' Mb<br/>';
            }
            if (data.disk_current && data.disk_total) {
                str += jQuery.i18n.map["crashes.disk"] + ': ' + data.disk_current + '/' + data.disk_total + ' Mb<br/>';
            }
            if (data.bat_current) {
                str += jQuery.i18n.map["crashes.battery"] + ': ' + data.bat_current + '%<br/>';
            }
            if (data.run) {
                str += jQuery.i18n.map["crashes.run"] + ': ' + countlyCommon.timeString(data.run / 60) + '<br/>';
            }
            if (data.session) {
                str += jQuery.i18n.map["crashes.after"] + ' ' + data.session + ' ' + jQuery.i18n.map["crashes.sessions"] + '<br/>';
            }
            else {
                str += jQuery.i18n.map["crashes.frequency"] + ': ' + jQuery.i18n.map["crashes.first-crash"] + '<br/>';
            }
            str += jQuery.i18n.map["crashes.online"] + ": " + ((data.online) ? "yes" : "no") + "<br/>";
            str += jQuery.i18n.map["crashes.background"] + ": " + ((data.background) ? "yes" : "no") + "<br/>";
            str += jQuery.i18n.map["crashes.muted"] + ": " + ((data.muted) ? "yes" : "no") + "<br/>";
            str += '</td>';
            var span = 3;
            if (data.custom) {
                str += '<td class="text-left">';
                for (var i in data.custom) {
                    str += i + ': ' + data.custom[i] + '<br/>';
                }
                str += '</td>';
                span = 4;
            }
            str += '</tr>';
            if (data.threads) {
                if (self.old) {
                    data.reserved_threads = data.reserved_threads || data.threads;
                    data.threads = data.oldthreads || data.threads;
                }
                else {
                    data.threads = data.reserved_threads || data.threads;
                }
                str += '<tr class="header">';
                str += '<td>' + jQuery.i18n.map["crashes.all-threads"] + '</td>';
                str += '<td colspan="' + (span - 1) + '">';
                str += jQuery.i18n.map["crashes.stacktrace"];
                str += '</td>';
                str += '</tr>';
                for (var j = 0; j < data.threads.length; j++) {
                    str += '<tr class="thread" data-id="' + data.threads[j].id + '">';
                    str += '<td class="thread-name"><p>' + data.threads[j].name + '</p>';
                    if (data.threads[j].crashed) {
                        str += '<span data-localize="crashes.crashed" class="tag">' + jQuery.i18n.map["crashes.crashed"] + '</span>';
                    }
                    str += '</td>';
                    str += '<td colspan="' + (span - 1) + '">';
                    str += '<pre><code class="short_code">' + data.threads[j].error + '</code></pre>';
                    str += '</td>';
                    str += '</tr>';
                }
            }
            else {
                if (self.old) {
                    data.reserved_error = data.reserved_error || data.error;
                    data.error = data.olderror || data.error;
                }
                else {
                    data.error = data.reserved_error || data.error;
                }
                str += '<tr class="header">';
                str += '<td colspan="' + span + '">';
                str += jQuery.i18n.map["crashes.stacktrace"];
                str += '</td>';
                str += '</tr>';
                str += '<tr>' +
                '<td colspan="' + span + '" class="stack-trace">';
                str += '<pre>' + data.error + '</pre>';
                str += '</td>';
                str += '</tr>';
            }

            if (data.logs) {
                str += '<tr class="header">' +
                            '<td colspan="' + span + '">' + jQuery.i18n.map["crashes.logs"] + '</td>' +
                            '</tr>';
                str += '<tr>' +
                            '<td colspan="' + span + '">' +
                                '<p>' + jQuery.i18n.map["crashes.logs"] + '</p>' +
                                '<pre>' + data.logs + '</pre></td>' +
                            '</tr>';
            }
            str += '</table>' +
            '</div>';
        }
        return str;
    },
    switchMetric: function(metric) {
        this.curMetric = metric;
        var crashData = countlyCrashes.getGroupData();
        countlyCommon.drawGraph(crashData.dp[this.curMetric], "#dashboard-graph", "bar");
    }
});

window.CrashBinaryView = countlyView.extend({
    initialize: function() {
        this.template = Handlebars.compile($("#table-template").html());
    },
    beforeRender: function() {
        if (app.crashesView.symbolicationEnabled()) {
            if (this.formPartial) {
                // eslint-disable-next-line no-undef
                return $.when(countlyCrashSymbols.loadList(countlyCommon.ACTIVE_APP_ID), countlyCrashes.initialize(this.group)).then(function() {});
            }
            else {
                var self = this;
                return $.when(T.get('/crash_symbolication/templates/symbol_drawer.html', function(src) {
                    self.formPartial = src;
                // eslint-disable-next-line no-undef
                }), countlyCrashSymbols.loadList(countlyCommon.ACTIVE_APP_ID), countlyCrashes.initialize(this.group)).then(function() {});
            }
        }
        else {
            return $.when(countlyCrashes.initialize(this.group)).then(function() {});
        }
    },
    checkMount: function() {
        var self = this;
        if (app.crashesView.symbolicationEnabled()) {
            if (typeof $('.cly-drawer')[0] === 'undefined') {
                setTimeout(function() {
                    self.checkMount();
                }, 1000);
            }
            else {
                self.dropZone = new Dropzone("#symbol-upload-drop", {
                    url: '/',
                    autoQueue: false,
                    param_name: "symbols",
                    parallelUploads: 0,
                    maxFiles: 1,
                    addedfile: function(file) {
                        self.dropZone.disable();
                        $('#symbol-upload-drop').removeClass('file-hovered');
                        $('#symbol-upload-drop').addClass('file-selected');

                        $(".dz-filechosen").html('<div class="dz-file-preview"><table><tr><td><i class="fa fa-archive" aria-hidden="true"></i></td><td style="width: 20px;"></td><td><p class="sline">' + countlyCommon.encodeHtml(file.name) + '</p><p class="remove" id="remove-files"><i class="fa fa-trash"  aria-hidden="true"></i> ' + jQuery.i18n.map["crash_symbolication.remove"] + '</p></td></tr></table></div>');
                        app.crashSymbolicationView.validate(self);

                    },
                    dragover: function() {
                        $('#symbol-upload-drop').addClass('file-hovered');
                    },
                    dragleave: function() {
                        $('#symbol-upload-drop').removeClass('file-hovered');
                    }
                });
            }
        }
    },
    renderCommon: function(isRefresh) {
        var self = this;
        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            var crashData = countlyCrashes.getReportData(this.id);
            if (typeof crashData === 'undefined') {
                app.navigate('/crashes', true);
            }

            this.templateData = {
                "page-title": jQuery.i18n.map['crash_symbolication.binary-images'],
                "crash": crashData
            };

            var images;
            try {
                images = JSON.parse(crashData.binary_images);
            }
            catch (ex) {
                images = [];
            }
            var imagesArray = [];
            for (var i in images) {
                imagesArray.push([i, images[i]]);
            }

            $(this.el).html(this.template(this.templateData));
            $('#content > div.widget > div > div.left > div > div.title').css('padding', '0');
            $('#content > div.widget > div > div.left > div').append('<div class="subtitle" style="clear:both;margin-left:3px;">' + crashData.name.substr(0, 80) + '</div>');
            $('#content > div.widget > div').append('<div id="binary-image-info-section" class="right"><div class="binary-image-info"><div class="binary-image-info-title">' + jQuery.i18n.map["crashes.app_version"] + '</div><div class="binary-image-info-data">' + crashData.app_version + '</div></div><div class="binary-image-info"><div class="binary-image-info-title">' + jQuery.i18n.map["crashes.platform_version"] + '</div><div class="binary-image-info-data">' + (crashData.os_version || "") + '</div></div></div>');
            if (app.crashesView.isAppleOs(crashData.os)) {
                $('#binary-image-info-section').prepend('<div class="binary-image-info"><div class="binary-image-info-title">' + jQuery.i18n.map["crashes.build_id"] + '</div><div class="binary-image-info-data">' + (crashData.app_build || "") + '</div></div>');
            }
            $('#content').prepend('<a href="#/crashes/' + this.group + '" class="back-link" style="margin-bottom: 25px;"><span data-localize="common.back">Back</span></a>');
            $(".back-link").click(function(e) {
                e.preventDefault();
                app.back("/crashes/" + this.group);
                return false;
            });
            $('#date-selector').remove();

            var coreImages = [
                "ABMHelper",
                "Accelerate",
                "Accessibility",
                "AccessibilityPlatformTranslation",
                "AccessibilitySharedSupport",
                "AccessibilityUI",
                "AccessibilityUIService",
                "AccessibilityUIShared",
                "AccessibilityUIUtilities",
                "AccessibilityUIViewServices",
                "AccessibilityUtilities",
                "AccessoryAssistiveTouch",
                "AccessoryAudio",
                "AccessoryBLEPairing",
                "AccessoryCommunications",
                "AccessoryHID",
                "AccessoryiAP2Shim",
                "AccessoryMediaLibrary",
                "AccessoryNavigation",
                "AccessoryNowPlaying",
                "AccessoryOOBBTPairing",
                "AccessoryVoiceOver",
                "AccountNotification",
                "Accounts",
                "AccountsDaemon",
                "AccountSettings",
                "AccountsUI",
                "ACTFramework",
                "ActionPredictionHeuristics",
                "ActionPredictionHeuristicsInternal",
                "ActivityAchievements",
                "ActivityAchievementsUI",
                "ActivitySharing",
                "AdAnalytics",
                "AdCore",
                "AddressBook",
                "AddressBookLegacy",
                "AddressBookUI",
                "AdID",
                "AdminLite",
                "AdPlatforms",
                "AdPlatformsInternal",
                "AdSupport",
                "AggregateDictionary",
                "AggregateDictionaryHistory",
                "AGXCompilerConnection",
                "AGXCompilerCore",
                "AirPlayReceiver",
                "AirPlaySender",
                "AirPlaySupport",
                "AirPortAssistant",
                "AirTraffic",
                "AirTrafficDevice",
                "AMPCoreUI",
                "ANECompiler",
                "ANEServices",
                "AnnotationKit",
                "AOPHaptics",
                "AOSKit",
                "APFS",
                "AppAnalytics",
                "AppConduit",
                "AppLaunchStats",
                "AppleAccount",
                "AppleAccountUI",
                "AppleBasebandManager",
                "AppleBasebandServices",
                "AppleCV3D",
                "AppleCV3DModels",
                "AppleCVA",
                "AppleCVAPhoto",
                "AppleFSCompression",
                "AppleHIDTransportSupport",
                "AppleIDAuthSupport",
                "AppleIDSSOAuthentication",
                "AppleJPEG",
                "AppleLDAP",
                "AppleMediaServices",
                "AppleNeuralEngine",
                "ApplePDPHelper",
                "ApplePushService",
                "AppleSauce",
                "AppleServiceToolkit",
                "AppleSRP",
                "AppNotificationsLoggingClient",
                "AppPredictionClient",
                "AppPredictionInternal",
                "AppPredictionUI",
                "AppPredictionWidget",
                "AppPreferenceClient",
                "AppServerSupport",
                "AppStoreDaemon",
                "AppStoreUI",
                "AppSupport",
                "AppSupportUI",
                "APTransport",
                "ARKit",
                "ASEProcessing",
                "AskPermission",
                "AssertionServices",
                "AssetCacheServices",
                "AssetCacheServicesExtensions",
                "AssetExplorer",
                "AssetsLibrary",
                "AssetsLibraryServices",
                "AssetViewer",
                "AssistantCardServiceSupport",
                "AssistantServices",
                "AssistantUI",
                "ATFoundation",
                "AttentionAwareness",
                "AudioCodecs",
                "AudioPasscode",
                "AudioServerApplication",
                "AudioServerDriver",
                "AudioToolbox",
                "AuthenticationServices",
                "AuthKit",
                "AuthKitUI",
                "AutoLoop",
                "AvatarKit",
                "AvatarUI",
                "AVConference",
                "AVFAudio",
                "AVFoundation",
                "AVKit",
                "AXAggregateStatisticsServices",
                "AXContainerServices",
                "AXCoreUtilities",
                "AXElementInteraction",
                "AXFrontBoardUtils",
                "AXHearingSupport",
                "AXLocalizationCaptionService",
                "AXMediaUtilities",
                "AXRuntime",
                "AXSpeechAssetServices",
                "AXSpringBoardServerInstance",
                "BackBoardServices",
                "BackgroundTaskAgent",
                "BarcodeSupport",
                "BaseBoard",
                "BaseBoardUI",
                "BatteryCenter",
                "BioKitAggD",
                "BiometricKit",
                "BiometricKitUI",
                "BiometricSupport",
                "BluetoothManager",
                "Bom",
                "BookDataStore",
                "BookLibrary",
                "BookmarkDAV",
                "BridgePreferences",
                "BulletinBoard",
                "BulletinDistributorCompanion",
                "BusinessChat",
                "ButtonResolver",
                "C2",
                "CacheDelete",
                "Calculate",
                "CalDAV",
                "CalendarDaemon",
                "CalendarDatabase",
                "CalendarFoundation",
                "CalendarNotification",
                "CalendarUIKit",
                "CallHistory",
                "CallKit",
                "CameraEffectsKit",
                "CameraKit",
                "CameraUI",
                "CaptiveNetwork",
                "CardKit",
                "CARDNDUI",
                "Cards",
                "CardServices",
                "CarKit",
                "CarPlay",
                "CarPlaySupport",
                "Catalyst",
                "Categories",
                "Celestial",
                "CellularBridgeUI",
                "CellularPlanManager",
                "CertInfo",
                "CertUI",
                "CFNetwork",
                "ChatKit",
                "CheckerBoardServices",
                "ChunkingLibrary",
                "ClassKit",
                "ClassKitUI",
                "ClassroomKit",
                "ClockKit",
                "ClockKitUI",
                "CloudDocs",
                "CloudDocsDaemon",
                "CloudDocsUI",
                "CloudKit",
                "CloudKitCode",
                "CloudKitCodeProtobuf",
                "CloudKitDaemon",
                "CloudPhotoLibrary",
                "CloudPhotoServices",
                "CloudServices",
                "ColorSync",
                "CommonAuth",
                "CommonUtilities",
                "CommunicationsFilter",
                "CommunicationsSetupUI",
                "CompanionCamera",
                "CompanionSync",
                "CompassUI",
                "ConfigurationEngineModel",
                "ConstantClasses",
                "Contacts",
                "ContactsAutocomplete",
                "ContactsDonation",
                "ContactsDonationFeedback",
                "ContactsFoundation",
                "ContactsUI",
                "ContactsUICore",
                "ContentIndex",
                "ContextKit",
                "ContinuousDialogManagerService",
                "ControlCenterServices",
                "ControlCenterUI",
                "ControlCenterUIKit",
                "ConversationKit",
                "CoreAccessories",
                "CoreAnalytics",
                "CoreAppleCVA",
                "CoreAUC",
                "CoreAudio",
                "CoreAudioKit",
                "CoreBluetooth",
                "CoreBrightness",
                "CoreCapture",
                "CoreCaptureControl",
                "CoreCaptureDaemon",
                "CoreCDP",
                "CoreCDPInternal",
                "CoreCDPUI",
                "CoreCDPUIInternal",
                "CoreData",
                "CoreDAV",
                "CoreDuet",
                "CoreDuetContext",
                "CoreDuetDaemonProtocol",
                "CoreDuetDataModel",
                "CoreDuetDebugLogging",
                "CoreDuetStatistics",
                "CoreEmoji",
                "CoreFollowUp",
                "CoreFollowUpUI",
                "CoreFoundation",
                "CoreGPSTest",
                "CoreGraphics",
                "CoreHandwriting",
                "CoreHAP",
                "CoreImage",
                "CoreIndoor",
                "CoreKnowledge",
                "CoreLocation",
                "CoreLocationProtobuf",
                "CoreMedia",
                "CoreMediaStream",
                "CoreMIDI",
                "CoreML",
                "CoreMotion",
                "CoreNameParser",
                "CoreNavigation",
                "CoreNFC",
                "CoreNLP",
                "CoreOptimization",
                "CoreParsec",
                "CorePDF",
                "CorePhoneNumbers",
                "CorePrediction",
                "CoreRecents",
                "CoreRecognition",
                "CoreRoutine",
                "CoreSDB",
                "CoreServices",
                "CoreServicesInternal",
                "CoreSpeech",
                "CoreSpotlight",
                "CoreSuggestions",
                "CoreSuggestionsInternals",
                "CoreSuggestionsUI",
                "CoreSymbolication",
                "CoreTelephony",
                "CoreText",
                "CoreThemeDefinition",
                "CoreTime",
                "CoreUI",
                "CoreUtils",
                "CoreVideo",
                "CourseKit",
                "CPMLBestShim",
                "CrashReporterSupport",
                "CryptoTokenKit",
                "CTCarrierSpace",
                "DAAPKit",
                "DABookmarkDAV",
                "DACalDAV",
                "DACardDAV",
                "DACoreDAVGlue",
                "DADaemonSupport",
                "DAEAS",
                "DAEASOAuthFramework",
                "DaemonUtils",
                "DAIMAPNotes",
                "DALDAP",
                "DASubCal",
                "DataAccess",
                "DataAccessExpress",
                "DataAccessUI",
                "DataDetectorsCore",
                "DataDetectorsNaturalLanguage",
                "DataDetectorsUI",
                "DataMigration",
                "DCIMServices",
                "DeviceCheck",
                "DeviceCheckInternal",
                "DeviceIdentity",
                "DeviceManagement",
                "DeviceOMatic",
                "DeviceToDeviceManager",
                "DiagnosticExtensions",
                "DiagnosticExtensionsDaemon",
                "DiagnosticLogCollection",
                "DiagnosticsKit",
                "DiagnosticsSupport",
                "DictionaryServices",
                "DictionaryUI",
                "DifferentialPrivacy",
                "DigitalTouchShared",
                "DiskImages",
                "DiskSpaceDiagnostics",
                "DistributedEvaluation",
                "DocumentCamera",
                "DocumentManager",
                "DocumentManagerCore",
                "DocumentManagerUICore",
                "DoNotDisturb",
                "DoNotDisturbKit",
                "DoNotDisturbServer",
                "DragUI",
                "DrawingKit",
                "DuetActivityScheduler",
                "DuetActivitySchedulerUI",
                "DuetExpertCenter",
                "DuetRecommendation",
                "EAFirmwareUpdater",
                "EAP8021X",
                "EasyConfig",
                "EditScript",
                "Email",
                "EmailAddressing",
                "EmailCore",
                "EmbeddedAcousticRecognition",
                "EmojiFoundation",
                "EmojiKit",
                "Engram",
                "Espresso",
                "EventKit",
                "EventKitUI",
                "ExternalAccessory",
                "FaceCore",
                "FamilyCircle",
                "FamilyCircleUI",
                "FamilyNotification",
                "FileProvider",
                "FileProviderUI",
                "FindMyDevice",
                "FindMyDeviceUI",
                "Fitness",
                "FitnessUI",
                "FlightUtilities",
                "Fluid",
                "FMClient",
                "FMCore",
                "FMCoreLite",
                "FMCoreUI",
                "FMF",
                "FMFUI",
                "FMIPSiriActions",
                "FontServices",
                "Foundation",
                "FoundationODR",
                "FoundInAppsPlugins",
                "FriendKit",
                "FrontBoard",
                "FrontBoardServices",
                "FrontBoardUIServices",
                "FTAWD",
                "FTClientServices",
                "FTServices",
                "FuseUI",
                "Futhark",
                "GameCenter",
                "GameCenterFoundation",
                "GameCenterPrivateUI",
                "GameCenterUI",
                "GameController",
                "GameKit",
                "GameKitServices",
                "GameplayKit",
                "GenerationalStorage",
                "GeoServices",
                "GKSPerformance",
                "GLKit",
                "GraphicsServices",
                "GraphVisualizer",
                "GSS",
                "H10ISPServices",
                "HangTracer",
                "Haptics",
                "HardwareDiagnostics",
                "HardwareSupport",
                "HDRProcessing",
                "HealthDaemon",
                "HealthKit",
                "HealthKitUI",
                "HealthRecordServices",
                "HealthUI",
                "HearingCore",
                "HearingUI",
                "HearingUtilities",
                "HeartRhythmUI",
                "Heimdal",
                "HelpKit",
                "HMFoundation",
                "Home",
                "HomeKit",
                "HomeKitDaemon",
                "HomeSharing",
                "HomeUI",
                "HSAAuthentication",
                "iAd",
                "iAdCore",
                "iAdDeveloper",
                "iAdServices",
                "IAP",
                "IAPAuthentication",
                "iCalendar",
                "ICE",
                "iCloudNotification",
                "iCloudQuota",
                "iCloudQuotaDaemon",
                "iCloudQuotaUI",
                "IconServices",
                "IdentityLookup",
                "IdentityLookupUI",
                "IdleTimerServices",
                "IDS",
                "IDSFoundation",
                "IDSHashPersistence",
                "IDSKVStore",
                "ImageCapture",
                "ImageIO",
                "IMAP",
                "IMAssistantCore",
                "IMAVCore",
                "IMCore",
                "IMDaemonCore",
                "IMDMessageServices",
                "IMDPersistence",
                "iMessageApps",
                "IMFoundation",
                "IMSharedUI",
                "IMSharedUtilities",
                "IMTranscoderAgent",
                "IMTranscoding",
                "IMTransferAgent",
                "IMTransferServices",
                "InAppMessages",
                "IncomingCallFilter",
                "InputContext",
                "InstallCoordination",
                "Intents",
                "IntentsCore",
                "IntentsFoundation",
                "IntentsUI",
                "IntentsUICardKitProviderSupport",
                "InternationalSupport",
                "InternationalTextSearch",
                "IntlPreferences",
                "IOAccelerator",
                "IOAccelMemoryInfo",
                "IOAccessoryManager",
                "IOCEC",
                "IOImageLoader",
                "IOImageLoaderDaemon",
                "IOKit",
                "IOMobileFramebuffer",
                "iOSDiagnostics",
                "iOSScreenSharing",
                "IOSurface",
                "IOSurfaceAccelerator",
                "iPhotoMigrationSupport",
                "ITMLKit",
                "iTunesCloud",
                "iTunesStore",
                "iTunesStoreUI",
                "iWorkXPC",
                "JavaScriptCore",
                "Jet",
                "JITAppKit",
                "KeyboardArbiter",
                "KeyboardServices",
                "KeychainCircle",
                "KnowledgeGraphKit",
                "KnowledgeMonitor",
                "kperf",
                "kperfdata",
                "ktrace",
                "LanguageModeling",
                "LatentSemanticMapping",
                "LegacyGameKit",
                "LegacyHandle",
                "Lexicon",
                "libEDR",
                "LimitAdTracking",
                "LinguisticData",
                "LinkPresentation",
                "LocalAuthentication",
                "LocalAuthenticationPrivateUI",
                "LoggingSupport",
                "LoginKit",
                "MailServices",
                "MailSupport",
                "ManagedConfiguration",
                "ManagedConfigurationUI",
                "ManagedEvent",
                "MapKit",
                "MapsSuggestions",
                "MapsSupport",
                "Marco",
                "MarkupUI",
                "MaterialKit",
                "MDM",
                "MechanismBase",
                "MediaAccessibility",
                "MediaControls",
                "MediaControlSender",
                "MediaKit",
                "MediaLibraryCore",
                "MediaMiningKit",
                "MediaPlatform",
                "MediaPlaybackCore",
                "MediaPlayer",
                "MediaPlayerUI",
                "MediaRemote",
                "MediaServices",
                "MediaSocial",
                "MediaStream",
                "MediaToolbox",
                "Memories",
                "Message",
                "MessageProtection",
                "Messages",
                "MessageSecurity",
                "MessageSupport",
                "MessageUI",
                "MetadataUtilities",
                "Metal",
                "MetalKit",
                "MetalPerformanceShaders",
                "MetalTools",
                "MetricsKit",
                "MFAAuthentication",
                "MIME",
                "MMCS",
                "MMCSServices",
                "MobileAccessoryUpdater",
                "MobileActivation",
                "MobileAsset",
                "MobileAssetUpdater",
                "MobileBackup",
                "MobileBluetooth",
                "MobileContainerManager",
                "MobileCoreServices",
                "MobileDeviceLink",
                "MobileIcons",
                "MobileInstallation",
                "MobileKeyBag",
                "MobileLookup",
                "MobileObliteration",
                "MobileSoftwareUpdate",
                "MobileSpotlightIndex",
                "MobileStorage",
                "MobileStoreDemoKit",
                "MobileSync",
                "MobileSystemServices",
                "MobileTimer",
                "MobileTimerUI",
                "MobileWiFi",
                "ModelIO",
                "ModuleBase",
                "Montreal",
                "MPSCore",
                "MPSImage",
                "MPSMatrix",
                "MPSNeuralNetwork",
                "MPSRayIntersector",
                "MPUFoundation",
                "MTLCompiler",
                "MTLSpline",
                "MultipeerConnectivity",
                "MultitouchSupport",
                "MusicCarDisplayUI",
                "MusicLibrary",
                "MusicStoreUI",
                "NanoAppRegistry",
                "NanoAudioControl",
                "NanoBackup",
                "NanoComplicationSettings",
                "NanoLeash",
                "NanoMailKitServer",
                "NanoMediaBridgeUI",
                "NanoMediaRemote",
                "NanoMusicSync",
                "NanoPassKit",
                "NanoPhonePerfTesting",
                "NanoPhotosUICompanion",
                "NanoPreferencesSync",
                "NanoRegistry",
                "NanoResourceGrabber",
                "NanoSystemSettings",
                "NanoTimeKitCompanion",
                "NanoUniverse",
                "NaturalLanguage",
                "Navigation",
                "NCLaunchStats",
                "NearField",
                "NetAppsUtilities",
                "NetAppsUtilitiesUI",
                "Netrb",
                "Network",
                "NetworkExtension",
                "NetworkServiceProxy",
                "NetworkStatistics",
                "NeutrinoCore",
                "NeutrinoKit",
                "NewDeviceOutreach",
                "NewDeviceOutreachUI",
                "NewsAnalytics",
                "NewsAnalyticsUpload",
                "NewsArticles",
                "NewsCore",
                "NewsDaemon",
                "NewsFeed",
                "NewsFeedLayout",
                "NewsFoundation",
                "NewsServices",
                "NewsServicesInternal",
                "NewsstandKit",
                "NewsSubscription",
                "NewsToday",
                "NewsTransport",
                "NewsUI",
                "NewsUI2",
                "NLFoundInAppsPlugin",
                "NLP",
                "Notes",
                "NotesShared",
                "NotesUI",
                "NotificationCenter",
                "OAuth",
                "OfficeImport",
                "OnBoardingKit",
                "oncrpc",
                "OpenAL",
                "OpenGLES",
                "OpusFoundation",
                "OpusKit",
                "OSAnalytics",
                "OSASyncProxyClient",
                "OTSVG",
                "PacketFilter",
                "PairedSync",
                "PairedUnlock",
                "PairingProximity",
                "PaperKit",
                "ParsecModel",
                "ParsecSubscriptionServiceSupport",
                "PASampling",
                "PassKit",
                "PassKitCore",
                "PassKitUI",
                "PassKitUIFoundation",
                "Pasteboard",
                "PBBridgeSupport",
                "PDFKit",
                "Pegasus",
                "PencilKit",
                "PencilPairingUI",
                "perfdata",
                "PersistentConnection",
                "PersonaKit",
                "PersonalizationPortrait",
                "PersonalizationPortraitInternals",
                "PersonaUI",
                "PhoneNumbers",
                "PhotoAnalysis",
                "PhotoBoothEffects",
                "PhotoEditSupport",
                "PhotoFoundation",
                "PhotoImaging",
                "PhotoLibrary",
                "PhotoLibraryServices",
                "Photos",
                "PhotosEditUI",
                "PhotosFormats",
                "PhotosGraph",
                "PhotosImagingFoundation",
                "PhotosPlayer",
                "PhotosUI",
                "PhotosUICore",
                "PhotoVision",
                "PhysicsKit",
                "PipelineKit",
                "PlacesKit",
                "PlatterKit",
                "PLShutdown",
                "PLSnapshot",
                "PlugInKit",
                "POP",
                "PowerLog",
                "PowerlogAccounting",
                "PowerlogControl",
                "PowerlogCore",
                "PowerlogDatabaseReader",
                "PowerlogFullOperators",
                "PowerlogHelperdOperators",
                "PowerlogLiteOperators",
                "PowerUI",
                "PPTopicExtractionPlugin",
                "Preferences",
                "PreferencesUI",
                "PrintKit",
                "PrivateFederatedLearning",
                "ProactiveEventTracker",
                "ProactiveMagicalMoments",
                "ProactiveML",
                "ProactiveSupport",
                "ProactiveSupportStubs",
                "ProactiveWidgetTracker",
                "ProgressUI",
                "ProofReader",
                "ProtectedCloudStorage",
                "ProtocolBuffer",
                "PrototypeTools",
                "PrototypeToolsUI",
                "ProVideo",
                "PushKit",
                "QLCharts",
                "Quagga",
                "QuartzCore",
                "QueryPredictionInternal",
                "QuickLook",
                "QuickLookSupport",
                "QuickLookThumbnailing",
                "Radio",
                "Rapport",
                "RapportUI",
                "RelevanceEngine",
                "RelevanceEngineUI",
                "RemindersUI",
                "RemoteConfiguration",
                "RemoteManagement",
                "RemoteManagementProtocol",
                "RemoteMediaServices",
                "RemoteStateDumpKit",
                "RemoteTextInput",
                "RemoteUI",
                "ReplayKit",
                "ResponseKit",
                "RevealCore",
                "ROCKit",
                "RTCReporting",
                "RTTUI",
                "RTTUtilities",
                "SafariCore",
                "SafariFoundation",
                "SafariSafeBrowsing",
                "SafariServices",
                "SafariShared",
                "SAML",
                "SampleAnalysis",
                "SAObjects",
                "SceneKit",
                "ScreenReaderBrailleDriver",
                "ScreenReaderCore",
                "ScreenReaderOutput",
                "ScreenshotServices",
                "ScreenTimeUI",
                "SDAPI",
                "Search",
                "SearchAds",
                "SearchFoundation",
                "SearchToSharePredictions",
                "SearchToSharePredictionsInternals",
                "SearchUI",
                "SearchUICardKitProviderSupport",
                "SecureChannel",
                "Security",
                "SecurityFoundation",
                "Sentry",
                "ServerAccounts",
                "ServiceManagement",
                "SetupAssistant",
                "SetupAssistantSupport",
                "SetupAssistantUI",
                "SharedUtils",
                "SharedWebCredentials",
                "Sharing",
                "SharingHUD",
                "ShortcutUIKit",
                "SignpostCollection",
                "SignpostMetrics",
                "SignpostNotification",
                "SignpostSupport",
                "Silex",
                "SilexText",
                "SilexVideo",
                "SimpleKeyExchange",
                "SIMSetupSupport",
                "SiriClientFlow",
                "SiriCore",
                "SiriInstrumentation",
                "SiriTape",
                "SiriTasks",
                "SiriTTS",
                "SiriUI",
                "SiriUICardKitProviderSupport",
                "SiriUICore",
                "SlideshowKit",
                "Snappy",
                "snatmap",
                "Social",
                "SocialServices",
                "SoftwareUpdateBridge",
                "SoftwareUpdateServices",
                "SoftwareUpdateServicesUI",
                "SOS",
                "SoundAutoConfig",
                "SpeakThisServices",
                "SpeakTypingServices",
                "Speech",
                "SplashBoard",
                "Spotlight",
                "SpotlightDaemon",
                "SpotlightReceiver",
                "SpotlightServices",
                "SpotlightUI",
                "SpringBoardFoundation",
                "SpringBoardServices",
                "SpringBoardUI",
                "SpringBoardUIServices",
                "SpriteKit",
                "StatsKit",
                "Stocks",
                "StocksAnalytics",
                "StocksCore",
                "StocksUI",
                "StoreBookkeeper",
                "StoreBookkeeperClient",
                "StoreKit",
                "StoreKitUI",
                "StoreServices",
                "StoreServicesCore",
                "StreamingZip",
                "StudyLog",
                "SuggestionsSpotlightMetrics",
                "Symbolication",
                "SymptomAnalytics",
                "SymptomDiagnosticReporter",
                "SymptomEvaluator",
                "SymptomNetworkUsage",
                "SymptomPresentationFeed",
                "SymptomPresentationLite",
                "SymptomReporter",
                "Symptoms",
                "SyncedDefaults",
                "SystemConfiguration",
                "TCC",
                "TeaActivities",
                "TeaCharts",
                "TeaDB",
                "TeaFoundation",
                "TeaSettings",
                "TeaTemplate",
                "TeaUI",
                "TelephonyPreferences",
                "TelephonyRPC",
                "TelephonyUI",
                "TelephonyUtilities",
                "TelephonyXPCClient",
                "TelephonyXPCServer",
                "TemplateKit",
                "TextInput",
                "TextInputCore",
                "TextInputUI",
                "TextToSpeech",
                "TextureIO",
                "ThermalMonitorExporter",
                "TimeSync",
                "TinCanShared",
                "Tips",
                "ToneKit",
                "ToneLibrary",
                "TouchML",
                "TouchRemote",
                "TransparencyDetailsView",
                "TSReading",
                "TSUtility",
                "TTYUtilities",
                "TVMLKit",
                "TVRemoteCore",
                "TVRemoteUI",
                "Twitter",
                "UIAccessibility",
                "UIFoundation",
                "UIKit",
                "UIKitCore",
                "UIKitServices",
                "UITriggerVC",
                "UpNextWidget",
                "URLFormatting",
                "UsageTracking",
                "UserActivity",
                "UserFS",
                "UserManagement",
                "UserManagementUI",
                "UserNotifications",
                "UserNotificationsKit",
                "UserNotificationsServer",
                "UserNotificationsUI",
                "UserNotificationsUIKit",
                "vCard",
                "vecLib",
                "VectorKit",
                "ViceroyTrace",
                "VideoProcessing",
                "VideosExtras",
                "VideoSubscriberAccount",
                "VideoSubscriberAccountUI",
                "VideosUI",
                "VideosUICore",
                "VideoToolbox",
                "vImage",
                "Vision",
                "VisualAlert",
                "VisualPairing",
                "VisualVoicemail",
                "VoicemailStore",
                "VoiceMemos",
                "VoiceOverServices",
                "VoiceServices",
                "VoiceShortcutClient",
                "VoiceShortcuts",
                "VoiceShortcutsUI",
                "VoiceTrigger",
                "VoiceTriggerUI",
                "VPNUtilities",
                "WatchConnectivity",
                "WatchKit",
                "WatchListKit",
                "WatchListKitUI",
                "WatchReplies",
                "Weather",
                "WeatherFoundation",
                "WeatherUI",
                "WebApp",
                "WebBookmarks",
                "WebContentAnalysis",
                "WebCore",
                "WebInspector",
                "WebKit",
                "WebKitLegacy",
                "WebUI",
                "WelcomeKit",
                "WelcomeKitCore",
                "WelcomeKitUI",
                "Widgets",
                "WiFiCloudSyncEngine",
                "WiFiKit",
                "WiFiKitUI",
                "WiFiLogCapture",
                "WiFiVelocity",
                "WirelessCoexManager",
                "WirelessDiagnostics",
                "WirelessProximity",
                "WorkflowKit",
                "XCTTargetBootstrap",
                "XPCKit",
                "YouTube",
                "ZoomServices",
                "zudp"
            ];

            var columns = [
                {
                    "mData": function(row) {
                        if (coreImages.indexOf(row[0]) === -1 && row[0].substr(row[0].length - 6, 6) !== '.dylib') {
                            return row[0];
                        }
                        else {
                            return row[0] + '<span title="' + jQuery.i18n.map["crash_symbolication.os-image"] + '" class="countly-os-indicator">' + jQuery.i18n.map["crashes.os"] + '</span>';
                        }
                    },
                    "sType": "string",
                    "sTitle": jQuery.i18n.map["crash_symbolication.binary-images"]
                },
                {
                    "mData": function(row) {
                        return row[1].id;
                    },
                    "sType": "string",
                    "sTitle": jQuery.i18n.map["crash_symbolication.builds"]
                },
                {
                    "mData": function(row) {
                        return row[1].la;
                    },
                    "sType": "string",
                    "sTitle": jQuery.i18n.map["crash_symbolication.la"]
                },
            ];

            if (app.crashesView.symbolicationEnabled()) {
                // eslint-disable-next-line no-undef
                var symbols = countlyCrashSymbols.getData();

                columns.push({
                    "mData": function(row) {
                        for (var k = 0; k < symbols.length; k++) {
                            if (symbols[k].build === row[1].id) {
                                return '<span style="color:#b3b3b3; margin-right: 10px">' + jQuery.i18n.map["crash_symbolication.symbol-added"] + '</span>';
                            }
                        }
                        return '<span class="add-symbol-from-binary-image-table" style="color:#2EB52B; margin-right: 10px;cursor:pointer" data-uuid="' + row[1].id + '" data-image="' + row[0] + '">' + jQuery.i18n.map["crash_symbolication.add-symbol"] + '</span>';
                    },
                    "sType": "string",
                    "sTitle": ""
                });

                $('body').off('click', '.add-symbol-from-binary-image-table').on('click', '.add-symbol-from-binary-image-table', function() {
                    var uuid = $(this).data('uuid');
                    var image = $(this).data('image');
                    $(".cly-drawer").removeClass("open editing");
                    $("#add-symbol-widget-drawer").addClass("open");
                    $("#upload-symbol-file-form").attr("action", "/i/crash_symbols/add_symbol");
                    $("#add-symbol-widget-drawer").find(".no-edit").show();
                    $(".cly-drawer").find(".close").off("click").on("click", function() {
                        $(this).parents(".cly-drawer").removeClass("open");
                        $("#save-widget").removeClass("disabled");
                    });

                    $(".cly-drawer").find(".tline").text(jQuery.i18n.map["crash_symbolication.upload-description"]);
                    $("#add-symbol-widget-drawer .title span").text(jQuery.i18n.map["crash_symbolication.add-new-file"]);
                    $("#save-widget").text(jQuery.i18n.map["crash_symbolication.upload-file"]);

                    $('#single-app-dropdown').clySelectSetSelection((crashData.os + "").toLowerCase(), crashData.os);
                    $('#single-app-dropdown').addClass('disabled');

                    $('#symbol-build-id').val(uuid);
                    $('#symbol-build-id').attr('disabled', 'disabled');
                    $('#symbol-build-id').css({'background-color': 'white'});
                    $('#symbol-build-id').css({'opacity': '0.4'});
                    $('#symbol-note').val(image);
                });
            }

            $('#data-table').attr("id", "binary-images-table");

            var noDataTable = '<div class="symb-no-data">\n' +
            '    <div class="inner-symb-table">\n' +
            '        <div class="symb-text-column">' +
            '            <div class="text text-symb-top" data-localize="crash_symbolication.empty_table.symbols-top"></div>' +
            '            <div class="text text-symb-bottom" data-localize="crash_symbolication.empty_table.symbols-bottom"></div>' +
            '        </div>\n' +
            '        <img src="crash_symbolication/images/symbols-empty.svg">\n' +
            '    </div>\n' +
            '</div>';

            this.dtable = $('#binary-images-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": imagesArray,
                "aoColumns": columns,
                "oLanguage": {
                    "sEmptyTable": noDataTable
                }
            }));

            $('.countly-os-indicator').tipsy({'gravity': 'n'});

            if (app.crashesView.symbolicationEnabled()) {
                $(".widget").after(this.formPartial);
                for (var type in app.crashSymbolicationView.types) {
                    $("#add-symbol-widget-drawer").find("#single-app-dropdown .select-items").append("<div class='item' data-value='" + type + "'>" + app.crashSymbolicationView.types[type] + "</div>");
                }

                //fallback(if drag&drop not available)
                $("#symbol-map-file").change(function() {
                    var pp = $(this).val().split('\\');
                    $('#symbol-upload-drop').addClass('file-selected');
                    $(".dz-filechosen").html('<div class="dz-file-preview"><table><tr><td><i class="fa fa-archive" aria-hidden="true"></i></td><td style="width: 20px;"></td><td><p class="sline">' + pp[pp.length - 1] + '</p><p class="remove" id="remove-files"><i class="fa fa-trash"  aria-hidden="true"></i> ' + jQuery.i18n.map["crash_symbolication.remove"] + '</p></td></tr></table></div>');
                });

                this.checkMount();

                $('.dz-filechosen').on('click', function(e) {
                    if (e.target.id === 'remove-files') {
                        app.crashSymbolicationView.dzRemoveFiles(self);
                    }
                });

                $("#add-symbol-widget-drawer").find('.fa-info').tipsy({
                    gravity: $.fn.tipsy.autoNS,
                    title: function() {
                        return ($(this).data("help")) ? jQuery.i18n.map[$(this).data("help")] : "";
                    },
                    fade: true,
                    offset: 5,
                    cssClass: 'yellow',
                    opacity: 1,
                    html: true
                });

                $("#symbol-build-id").on("keyup", function() {
                    app.crashSymbolicationView.validate(self);
                });
                $("#symbol-map-file").on("change", function() {
                    app.crashSymbolicationView.validate(self);
                });
                $(".cly-drawer").find(".cly-select").on("cly-select-change", function() {
                    app.crashSymbolicationView.validate(self);
                });

                $("#save-widget").off("click").on("click", function() {
                    app.crashSymbolicationView.saveWidget(self);
                });
            }

            this.dtable.stickyTableHeaders();

            CountlyHelpers.initializeTableOptions();
        }
    },
    refresh: function(force) {
        if (force) {
            var self = this;
            $.when(self.beforeRender()).then(function() {
                self.renderCommon();
            });
        }
    }
});

app.crashesView = new CrashesView();
app.crashgroupView = new CrashgroupView();

app.route('/crashes', 'crashes', function() {
    this.crashesView._filter = false;
    this.crashesView._query = null;
    this.renderWhenReady(this.crashesView);
});

app.route('/crashes/filter/*query', 'userdata', function(query) {
    try {
        query = JSON.parse(query);
    }
    catch (ex) {
        query = null;
    }
    this.crashesView._query = query;
    this.crashesView._filter = true;
    this.renderWhenReady(this.crashesView);
});

app.route('/crashes/:group', 'crashgroup', function(group) {
    this.crashgroupView.id = group;
    this.renderWhenReady(this.crashgroupView);
});

app.addPageScript("/drill#", function() {
    var drillClone;
    var self = app.drillView;
    var record_crashes = countlyGlobal.record_crashes;
    if (countlyGlobal.apps && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].plugins && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].plugins.drill && typeof countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].plugins.drill.record_crashes !== "undefined") {
        record_crashes = countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].plugins.drill.record_crashes;
    }

    if (record_crashes) {
        $("#drill-types").append('<div id="drill-type-crashes" class="item"><div class="inner"><span class="icon crashes"><i class="material-icons">warning</i></span><span class="text">' + jQuery.i18n.map["crashes.title"] + '</span></div></div>');
        $("#drill-type-crashes").on("click", function() {
            if ($(this).hasClass("active")) {
                return true;
            }

            $("#drill-types").find(".item").removeClass("active");
            $(this).addClass("active");
            $("#event-selector").hide();

            $("#drill-no-event").fadeOut();
            $("#segmentation-start").fadeOut().remove();

            var currEvent = "[CLY]_crash";

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
                $("#drill-filter-view").replaceWith(drillClone.clone(true));
                self.adjustFilters();
                if (!self.keepQueryTillExec) {
                    self.draw(true, false);
                }
            });
        });
        setTimeout(function() {
            // drillClone = $("#drill").clone(true);
            drillClone = $("#drill-filter-view").clone(true);
        }, 0);
    }
});

app.addPageScript("/users/#", function() {
    if (app.activeView && app.activeView.tabs) {
        var ul = app.activeView.tabs.find("ul");
        $("<li><a href='#usertab-crashes'>" + jQuery.i18n.map["crashes.title"] + "</a></li>").appendTo(ul);
        $("<div id='usertab-crashes'></div>").appendTo(app.activeView.tabs);
        app.activeView.tabs.tabs("refresh");
        var userDetails = countlyUserdata.getUserdetails();
        $("#usertab-crashes").append("<div class='widget-header'><div class='left'><div class='title'>" + jQuery.i18n.map["userdata.crashes"] + "</div></div></div><table  data-view='crashesView' id='d-table-crashes' class='d-table sortable help-zone-vb' cellpadding='0' cellspacing='0'></table>");
        app.activeView.shouldLoadCrashes = false;
        app.activeView.tabs.on("tabsactivate", function(event, ui) {
            if (ui && ui.newPanel) {
                var tab = ($(ui.newPanel).attr("id") + "").replace("usertab-", "");
                if (tab === "crashes") {
                    if (!app.activeView.shouldLoadCrashes) {
                        app.activeView.shouldLoadCrashes = true;
                        if (app.activeView.dtablecrashes) {
                            app.activeView.dtablecrashes.fnDraw(false);
                        }
                    }
                    app.activeView.dtablecrashes.stickyTableHeaders();
                }
            }
        });
        app.activeView.dtablecrashes = $('#d-table-crashes').dataTable($.extend({}, $.fn.dataTable.defaults, {
            "iDisplayLength": 30,
            "aaSorting": [[ 2, "desc" ]],
            "bServerSide": true,
            "bFilter": false,
            "sAjaxSource": countlyCommon.API_PARTS.data.r + "?app_id=" + countlyCommon.ACTIVE_APP_ID + "&method=user_crashes&uid=" + userDetails.uid,
            "fnServerData": function(sSource, aoData, fnCallback) {
                if (app.activeView.shouldLoadCrashes) {
                    self.request = $.ajax({
                        "dataType": 'json',
                        "type": "POST",
                        "url": sSource,
                        "data": aoData,
                        "success": function(data) {
                            fnCallback(data);
                        }
                    });
                }
            },
            "aoColumns": [
                {
                    "mData": function(row) {
                        return countlyCrashes.getCrashName(row.group);
                    },
                    "sType": "numeric",
                    "sTitle": jQuery.i18n.map["crashes.error"],
                    "sClass": "break web-50",
                    "bSortable": false,
                    "sWidth": "45%"
                },
                {
                    "mData": function(row) {
                        return row.reports;
                    },
                    "sType": "numeric",
                    "sTitle": jQuery.i18n.map["crashes.reports"],
                    "sWidth": "20%"
                },
                {
                    "mData": function(row, type) {
                        if (type === "display") {
                            return (row.last === 0) ? jQuery.i18n.map["common.unknown"] + "&nbsp;<a class='extable-link table-link green' href='#/crashes/" + row.group + "' target='_blank'><i class='material-icons'>open_in_new</i></a><a class='extable-link table-link green' href='#/crashes/" + row.group + "' style='float: right;' >" + jQuery.i18n.map["common.view"] + "</a>" : countlyCommon.formatTimeAgo(row.last) + "&nbsp;<a class='extable-link table-link green' href='#/crashes/" + row.group + "' target='_blank'><i class='material-icons'>open_in_new</i></a><a class='extable-link table-link green' href='#/crashes/" + row.group + "' style='float: right;' >" + jQuery.i18n.map["common.view"] + "</a>";
                        }
                        else {
                            return row.last;
                        }
                    },
                    "sType": "numeric",
                    "sTitle": jQuery.i18n.map["crashes.last_time"]
                }
            ]
        }));
    }
});

$(document).ready(function() {
    if (typeof extendViewWithFilter === "function") {
        extendViewWithFilter(app.crashesView);
    }
    app.addAppSwitchCallback(function(appId) {
        if (app._isFirstLoad !== true) {
            countlyCrashes.loadList(appId);
        }
    });

    app.addMenu("improve", {code: "crashes", text: "crashes.title", icon: '<div class="logo ion-alert-circled"></div>', priority: 10});
    app.addSubMenu("crashes", {code: "crash", url: "#/crashes", text: "sidebar.dashboard", priority: 10});

    //check if configuration view exists
    if (app.configurationsView) {
        app.configurationsView.registerLabel("crashes", "crashes.title");
        app.configurationsView.registerInput("crashes.grouping_strategy", function(value) {
            var categories = ['error_and_file', 'stacktrace'];
            var select = '<div class="cly-select crashes-group-input" id="crashes.grouping_strategy">' +
                '<div class="select-inner">' +
                '<div class="text-container">';
            if (value && value.length) {
                select += '<div class="text" data-localize="crashes.grouping_strategy.' + value + '">' + jQuery.i18n.map["crashes.grouping_strategy." + value] + '</div>';
            }
            else {
                select += '<div class="text" data-localize="crashes.grouping_strategy.error_and_file">' + jQuery.i18n.map["crashes.grouping_strategy.error_and_file"] + '</div>';
            }
            select += '</div>' +
                '<div class="right combo"></div>' +
                '</div>' +
                '<div class="select-items square">' +
                '<div>';

            for (var i = 0; i < categories.length; i++) {
                select += '<div data-value="' + categories[i] + '" class="segmentation-option item" data-localize="crashes.grouping_strategy.' + categories[i] + '">' + jQuery.i18n.map["crashes.grouping_strategy." + categories[i]] + '</div>';
            }

            select += '</div>' +
                '</div>' +
                '</div>';
            return select;
        });
    }
});

app.crashBinaryView = new CrashBinaryView();

app.route('/crash/symbols/:group/:id', 'binary_images', function(group, id) {
    this.crashBinaryView.group = group;
    this.crashBinaryView.id = id;
    this.renderWhenReady(this.crashBinaryView);
});