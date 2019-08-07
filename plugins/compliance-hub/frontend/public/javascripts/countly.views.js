/*global countlyView,countlyDeviceDetails,countlyAppUsers,countlyDevice,$,countlyConsentManager,countlyGlobal,countlyCommon,moment,CountlyHelpers,jQuery,app,ConsentManagementView,Handlebars,Backbone,countlyUserdata */
window.ConsentManagementView = countlyView.extend({
    curSegment: "",
    initialize: function() {},
    beforeRender: function() {
        if (this.template) {
            return $.when(countlyConsentManager.initialize()).then(function() {});
        }
        else {
            var self = this;
            return $.when(
                $.get(countlyGlobal.path + '/compliance-hub/templates/compliance.html', function(src) {
                    self.template = Handlebars.compile(src);
                }),
                countlyConsentManager.initialize()).then(function() {});
        }
    },
    getExportAPI: function(tableID) {
        var requestPath, apiQueryData;
        if (tableID === 'd-table-users') {
            requestPath = '/o/app_users/consents?api_key=' + countlyGlobal.member.api_key +
            "&app_id=" + countlyCommon.ACTIVE_APP_ID + "&iDisplayStart=0";
            apiQueryData = {
                api_key: countlyGlobal.member.api_key,
                app_id: countlyCommon.ACTIVE_APP_ID,
                path: requestPath,
                method: "GET",
                filename: "Compliance_users_on_" + moment().format("DD-MMM-YYYY"),
                prop: ['aaData']
            };
            return apiQueryData;
        }
        if (tableID === "d-table-history") {
            requestPath = '/o/consent/search?api_key=' + countlyGlobal.member.api_key +
            "&app_id=" + countlyCommon.ACTIVE_APP_ID + "&iDisplayStart=0&filter=" + encodeURIComponent(JSON.stringify(app.activeView.history_filter)) +
            "&period=" + countlyCommon.getPeriodForAjax();
            apiQueryData = {
                api_key: countlyGlobal.member.api_key,
                app_id: countlyCommon.ACTIVE_APP_ID,
                path: requestPath,
                method: "GET",
                filename: "Consent_history_on_" + moment().format("DD-MMM-YYYY"),
                prop: ['aaData']
            };
            return apiQueryData;
        }
        if (tableID === 'd-table-consents') {
            requestPath = '/o/consent/search?api_key=' + countlyGlobal.member.api_key +
            "&app_id=" + countlyCommon.ACTIVE_APP_ID + "&iDisplayStart=0" +
            "&query=" + encodeURIComponent(JSON.stringify({uid: countlyUserdata.getUserdetails().uid}));
            apiQueryData = {
                api_key: countlyGlobal.member.api_key,
                app_id: countlyCommon.ACTIVE_APP_ID,
                path: requestPath,
                method: "GET",
                filename: "User_Consent_history_on_" + moment().format("DD-MMM-YYYY"),
                prop: ['aaData']
            };
            return apiQueryData;
        }
        return null;
    },
    renderCommon: function(isRefresh) {
        var status = {
            "all": jQuery.i18n.map["common.all"],
            "i": jQuery.i18n.map["consent.opt-i"],
            "o": jQuery.i18n.map["consent.opt-o"]
        };
        var types = {
            "all": jQuery.i18n.map["common.all"],
            "sessions": "Sessions",
            "events": "Events",
            "views": "Views",
            "scrolls": "Scrolls",
            "clicks": "Clicks",
            "forms": "Forms",
            "crashes": "Crashes",
            "push": "Push",
            "attribution": "Attribution",
            "users": "Users",
            "star-rating": "Star-rating"
        };
        var data = countlyConsentManager.getBigNumbersData(this.curSegment);
        var epdata = countlyConsentManager.getEPData();
        epdata.e.title = jQuery.i18n.map["consent.userdata-exports"];
        epdata.p.title = jQuery.i18n.map["consent.userdata-purges"];

        this.templateData = {
            "filter0": types,
            "active-filter0": jQuery.i18n.map["consent.feature"],
            "filter1": status,
            "active-filter1": jQuery.i18n.map["consent.type"],
            "filter2": types,
            "active-filter2": jQuery.i18n.map["consent.feature"],
            "big-numbers": {
                "count": 2,
                "items": [
                    {
                        "title": jQuery.i18n.map["consent.opt-i"],
                        "total": data.i.total,
                        "trend": data.i.trend,
                        "change": data.i.change
                    },
                    {
                        "title": jQuery.i18n.map["consent.opt-o"],
                        "total": data.o.total,
                        "trend": data.o.trend,
                        "change": data.o.change,
                        "additionalStyle": "inverse-trend"
                    }
                ]
            },
            "exports": epdata.e,
            "purges": epdata.p
        };

        var self = this;
        if (!isRefresh) {
            this.history_filter = {};
            this.history_user = null;
            this.curSegment = "";
            $(this.el).html(this.template(this.templateData));
            this.drawGraph(true);
            this.tabs = $("#tabs").tabs();
            this.tabs.on("tabsshow", function(event, ui) {
                if (ui && ui.panel) {
                    if ($(ui.panel).find(".widget-header.include-dateselector").length) {
                        $("#date-selector").appendTo($(ui.panel).find(".widget-header"));
                    }
                    if ($(ui.panel).find(".d-table").length && !$(ui.panel).find(".d-table").hasClass("sticky")) {
                        $(ui.panel).find(".d-table").addClass("sticky");
                        setTimeout(function() {
                            $(ui.panel).find(".d-table").stickyTableHeaders();
                        }, 10);
                    }
                    var tab = ($(ui.panel).attr("id") + "").replace("consent-", "");
                    if (tab && tab.length) {
                        if (tab === "metrics") {
                            app.noHistory("#/manage/compliance");
                        }
                        else if (tab === "history") {
                            var title;
                            var fragment = Backbone.history.getFragment().split("/");
                            if (fragment.length === 5) {
                                var id = fragment.pop();
                                self.history_user = id;
                                self.history_filter.uid = id;
                                title = $("#consent-history .widget-header .left .title");
                                title.text(jQuery.i18n.prop("consent.history-for", id));
                                self.dtablehistory.fnDraw(false);
                            }
                            else {
                                app.noHistory("#/manage/compliance/" + tab);
                                self.history_user = null;
                                delete self.history_filter.uid;
                                title = $("#consent-history .widget-header .left .title");
                                title.text(jQuery.i18n.map["consent.history"]);
                                self.dtablehistory.fnDraw(false);
                            }
                        }
                        else {
                            app.noHistory("#/manage/compliance/" + tab);
                        }
                    }
                }
            });

            if (self._tab) {
                setTimeout(function() {
                    var index = $(".ui-tabs-panel", self.tabs).index($("#consent-" + self._tab));
                    if (index !== -1) {
                        self.tabs.tabs("select", index);
                    }
                }, 0);
            }

            this.dtableusers = $('#d-table-users').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "iDisplayLength": 30,
                "aaSorting": [[ 4, "desc" ]],
                "bServerSide": true,
                "sAjaxSource": countlyCommon.API_PARTS.data.r + "/app_users/consents?api_key=" + countlyGlobal.member.api_key + "&app_id=" + countlyCommon.ACTIVE_APP_ID,
                "fnServerData": function(sSource, aoData, fnCallback) {
                    self.request = $.ajax({
                        "dataType": 'json',
                        "type": "POST",
                        "url": sSource,
                        "data": aoData,
                        "success": function(dataResult) {
                            fnCallback(dataResult);
                        }
                    });
                },
                "oLanguage": {
                    "sSearch ": jQuery.i18n.map["consent.search-device-id"]
                },
                "aoColumns": [
                    {
                        "mData": function(row) {
                            return row.did + "";
                        },
                        "sType": "string",
                        "sTitle": "ID",
                        "sClass": "trim"
                    },
                    {
                        "mData": function(row) {
                            return (row.d) ? countlyDevice.getDeviceFullName(row.d) : jQuery.i18n.map["common.unknown"];
                        },
                        "sType": "string",
                        "sTitle": jQuery.i18n.map["devices.table.device"]
                    },
                    {
                        "mData": function(row) {
                            return (row.av) ? (row.av + "").replace(/:/g, ".") : jQuery.i18n.map["common.unknown"];
                        },
                        "sType": "string",
                        "sTitle": jQuery.i18n.map["app-versions.table.app-version"],
                        "sClass": "web-15"
                    },
                    {
                        "mData": function(row) {
                            var str = "";
                            var optin = [];
                            var optout = [];
                            for (var i in row.consent) {
                                if (row.consent[i]) {
                                    optin.push(i.charAt(0).toUpperCase() + i.slice(1));
                                }
                                else {
                                    optout.push(i.charAt(0).toUpperCase() + i.slice(1));
                                }
                            }
                            if (optin.length) {
                                str += "<div style='margin-bottom:10px;'><span class='green-text'>" + jQuery.i18n.map["consent.opt-i"] + ':</span> ' + optin.join(", ") + "</div>";
                            }
                            if (optout.length) {
                                str += "<div><span class='red-text'>" + jQuery.i18n.map["consent.opt-o"] + ':</span> ' + optout.join(", ") + '</div>';
                            }
                            return str;
                        },
                        "sType": "string",
                        "sTitle": jQuery.i18n.map["consent.title"],
                        "bSortable": false,
                        "sClass": "web-30"
                    },
                    {
                        "mData": function(row, type) {
                            if (type === "display") {
                                return countlyCommon.formatTimeAgo(row.ls || 0) + '<a class="cly-list-options" style="float:right; margin-right:2px;"></a>';
                            }
                            else {
                                return row.ls || 0;
                            }
                        },
                        "sType": "format-ago",
                        "sTitle": jQuery.i18n.map["common.time"]
                    }
                ],
                "fnInitComplete": function(oSettings, json) {
                    $.fn.dataTable.defaults.fnInitComplete(oSettings, json);
                    var tableWrapper = $("#" + oSettings.sTableId + "_wrapper");
                    tableWrapper.find(".dataTables_filter input").attr("placeholder", jQuery.i18n.map["consent.search-device-id"]);
                }
            }));

            this.dtablehistory = $('#d-table-history').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "iDisplayLength": 30,
                "aaSorting": [[ 5, "desc" ]],
                "bServerSide": true,
                "sAjaxSource": countlyCommon.API_PARTS.data.r + "/consent/search?api_key=" + countlyGlobal.member.api_key + "&app_id=" + countlyCommon.ACTIVE_APP_ID,
                "fnServerData": function(sSource, aoData, fnCallback) {
                    self.request = $.ajax({
                        "dataType": 'json',
                        "type": "POST",
                        "url": sSource,
                        "data": aoData,
                        "success": function(dataResult) {
                            fnCallback(dataResult);
                            CountlyHelpers.reopenRows(self.dtablehistory, self.formatConsent);
                        }
                    });
                },
                "fnServerParams": function(aoData) {
                    if (self.history_filter) {
                        aoData.push({ "name": "filter", "value": JSON.stringify(self.history_filter) });
                    }
                    aoData.push({ "name": "period", "value": countlyCommon.getPeriodForAjax() });
                },
                "fnRowCallback": function(nRow, aData) {
                    $(nRow).attr("id", aData._id);
                },
                "oLanguage": {
                    "sSearch ": jQuery.i18n.map["consent.search-device-id"]
                },
                "aoColumns": [
                    CountlyHelpers.expandRowIconColumn(),
                    {
                        "mData": function(mData) {
                            return mData.device_id;
                        },
                        "sType": "string",
                        "sTitle": "ID",
                    },
                    {"mData": "uid", "sType": "string", "sTitle": "UID", "sClass": "web-10" },
                    {
                        "mData": function(row) {
                            var str = ""; var arr = (row.type + "").split(","); for (var i = 0; i < arr.length; i++) {
                                str += jQuery.i18n.map["consent.opt-" + arr[i]] + "<br/>";
                            } return str;
                        },
                        "sType": "string",
                        "sTitle": jQuery.i18n.map["consent.changes"]
                    },
                    {
                        "mData": function(row) {
                            var str = "";
                            var optin = 0;
                            var optout = 0;
                            for (var i in row.change) {
                                if (row.change[i]) {
                                    optin++;
                                }
                                else {
                                    optout++;
                                }
                            }
                            if (optin) {
                                str += jQuery.i18n.prop("consent.opt-in", optin) + "<br/>";
                            }
                            if (optout) {
                                str += jQuery.i18n.prop("consent.opt-out", optout) + "<br/>";
                            }
                            return str;
                        },
                        "sType": "string",
                        "sTitle": jQuery.i18n.map["consent.title"],
                        "bSortable": false
                    },
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
                        "sTitle": jQuery.i18n.map["common.time"]
                    }
                ],
                "fnInitComplete": function(oSettings, json) {
                    $.fn.dataTable.defaults.fnInitComplete(oSettings, json);
                    var tableWrapper = $("#" + oSettings.sTableId + "_wrapper");
                    tableWrapper.find(".dataTables_filter input").attr("placeholder", jQuery.i18n.map["consent.search-device-id"]);
                }
            }));

            CountlyHelpers.expandRows(this.dtablehistory, this.formatConsent);

            CountlyHelpers.initializeTableOptions();

            $(".cly-button-menu").on("cly-list.click", function(event, clickData) {
                var row = $(clickData.target).parents("tr");
                //user data is in data
                data = self.dtableusers.fnGetData(row[0]);
                //now show hide list options based on user data

                var have_rights = countlyGlobal.member.global_admin || countlyGlobal.member.admin_of.indexOf(+countlyCommon.ACTIVE_APP_ID) > -1;
                $(".cly-button-menu a.export-user").css("display", "none");
                $(".cly-button-menu a.export-download").css("display", "none");
                $(".cly-button-menu a.export-delete").css("display", "none");
                $(".cly-button-menu a.delete-user").css("display", "none");

                $(".cly-button-menu a").data("id", data.uid);
                if (data.appUserExport) {
                    if (data.appUserExport.slice(-7) === ".tar.gz") {
                        $(".cly-button-menu a.export-download").css("display", "block");
                    }
                    if (have_rights) {
                        $(".cly-button-menu a.export-delete").css("display", "block");
                    }
                }
                else {
                    if (have_rights) {
                        $(".cly-button-menu a.export-user").css("display", "block");
                    }
                }

                if (have_rights) {
                    $(".cly-button-menu a.delete-user").css("display", "block");
                }
            });

            $(".cly-button-menu").on("cly-list.item", function(event, domData) {
                var el = null;
                var tmpEl = $(domData.target);
                if (tmpEl.parent().is("a") && tmpEl.parent().data("id") !== undefined) {
                    el = tmpEl.parent();
                }
                else {
                    el = tmpEl;
                }
                var id = el.data("id");
                if (id) {
                    if (el.hasClass("view-history")) {
                        app.noHistory("#/manage/compliance/history/" + id);
                        var index = $(".ui-tabs-panel", self.tabs).index($("#consent-history"));
                        if (index !== -1) {
                            self.tabs.tabs("select", index);
                        }
                        $(document).scrollTop(0);
                    }
                    else if (el.hasClass("export-user")) {
                        countlyAppUsers.exportUser(JSON.stringify({uid: id}), function(error, export_id, task_id) {
                            if (error) {
                                CountlyHelpers.alert(error, "red");
                            }
                            else if (export_id) {
                                CountlyHelpers.notify({
                                    type: "ok",
                                    title: jQuery.i18n.map["common.success"],
                                    message: jQuery.i18n.map["app-users.export-finished"],
                                    info: jQuery.i18n.map["consent.export-finished-click"],
                                    sticky: false,
                                    clearAll: true,
                                    onClick: function() {
                                        var win = window.open(countlyCommon.API_PARTS.data.r + "/app_users/download/" + export_id + "?auth_token=" + countlyGlobal.auth_token + "&app_id=" + countlyCommon.ACTIVE_APP_ID, '_blank');
                                        win.focus();
                                    }
                                });
                                self.dtableusers.fnDraw(false);
                            }
                            else if (task_id) {
                                CountlyHelpers.notify({type: "ok", title: jQuery.i18n.map["common.success"], message: jQuery.i18n.map["app-users.export-started"], sticky: false, clearAll: false});
                                self.dtableusers.fnDraw(false);
                            }
                            else {
                                CountlyHelpers.alert(jQuery.i18n.map["app-users.export-failed"], "red");
                            }
                        });
                    }
                    else if (el.hasClass("export-download")) {
                        var win = window.open(countlyCommon.API_PARTS.data.r + "/app_users/download/appUser_" + countlyCommon.ACTIVE_APP_ID + "_" + id + "?auth_token=" + countlyGlobal.auth_token + "&app_id=" + countlyCommon.ACTIVE_APP_ID, '_blank');
                        win.focus();
                    }
                    else if (el.hasClass("export-delete")) {
                        countlyAppUsers.deleteExport(id, function(error) {
                            if (error) {
                                CountlyHelpers.alert(error, "red");
                            }
                            else {
                                CountlyHelpers.notify({type: "ok", title: jQuery.i18n.map["common.success"], message: jQuery.i18n.map["app-users.export-deleted"], sticky: false, clearAll: true});
                                self.dtableusers.fnDraw(false);
                            }
                        });
                    }
                    else if (el.hasClass("delete-user")) {
                        CountlyHelpers.confirm(jQuery.i18n.map["app-users.delete-userdata-confirm"], "popStyleGreen", function(result) {
                            if (!result) {
                                return true;
                            }
                            countlyAppUsers.deleteUserdata(JSON.stringify({uid: id}), function(error) {
                                if (error) {
                                    CountlyHelpers.alert(error, "red");
                                }
                                else {
                                    CountlyHelpers.notify({type: "ok", title: jQuery.i18n.map["common.success"], message: jQuery.i18n.map["app-users.userdata-deleted"], sticky: false, clearAll: true});
                                    self.dtableusers.fnDraw(false);
                                }
                            });
                        }, [jQuery.i18n.map["app-users.no-dont-purge"], jQuery.i18n.map["app-users.yes-purge-data"]], {title: jQuery.i18n.map["app-users.purge-confirm-title"], image: "purge-user-data"});
                    }
                }
            });

            var setStatusFilter = function(filterStatus) {
                //reset filter
                var type = self.history_filter.type;
                self.history_filter = {};
                if (type) {
                    self.history_filter.type = type;
                }
                if (self.history_user) {
                    self.history_filter.uid = self.history_user;
                }

                //set query based on type
                if (filterStatus && filterStatus !== "all") {
                    if (!self.history_filter.type) {
                        self.history_filter["change." + filterStatus] = {$exists: true};
                    }
                    else if (self.history_filter.type === "i") {
                        self.history_filter["change." + filterStatus] = true;
                    }
                    else if (self.history_filter.type === "o") {
                        self.history_filter["change." + filterStatus] = {$ne: true};
                    }
                }
            };

            $(".filter1-segmentation .segmentation-option").on("click", function() {
                self.history_filter.type = $(this).data("value");
                if (self.history_filter.type === "all") {
                    delete self.history_filter.type;
                }

                setStatusFilter($(".filter2-segmentation .text").data("value"));
                self.dtablehistory.fnDraw(false);
            });

            $(".filter2-segmentation .segmentation-option").on("click", function() {
                setStatusFilter($(this).data("value"));
                self.dtablehistory.fnDraw(false);
            });

            $(".filter0-segmentation .segmentation-option").on("click", function() {
                self.curSegment = $(this).data("value");
                if (self.curSegment === "all") {
                    self.curSegment = "";
                }
                self.drawGraph();
            });
        }
    },
    drawGraph: function(refresh) {
        if (!refresh) {
            this.renderCommon(true);
        }
        var consentDP = countlyConsentManager.getConsentDP(this.curSegment);
        countlyCommon.drawTimeGraph(consentDP.chartDP, "#dashboard-graph");
        var newPage = $("<div>" + this.template(this.templateData) + "</div>");
        $(this.el).find("#big-numbers-container").html(newPage.find("#big-numbers-container").html());
        if (refresh) {
            countlyCommon.drawTimeGraph(countlyConsentManager.getExportDP().chartDP, "#dashboard-export-graph .graph", null, null, true);
            countlyCommon.drawTimeGraph(countlyConsentManager.getPurgeDP().chartDP, "#dashboard-purge-graph .graph", null, null, true);
            $(this.el).find("#dashboard-export-graph .data").html(newPage.find("#dashboard-export-graph .data").html());
            $(this.el).find("#dashboard-purge-graph .data").html(newPage.find("#dashboard-purge-graph .data").html());
        }
    },
    refresh: function() {
        var self = this;
        $.when(this.beforeRender()).then(function() {
            if (app.activeView !== self) {
                return false;
            }
            self.renderCommon(true);
            self.drawGraph(true);
            self.dtableusers.fnDraw(false);
            self.dtablehistory.fnDraw(false);
        });
    },
    formatConsent: function(d) {
        // `d` is the original data object for the row
        var str = '';
        if (d) {
            str += '<div class="datatablesubrow">' +
				'<table cellpadding="5" cellspacing="0" border="0" class="subtable">' +
				'<tr><td>Device ID</td><td>' + d.device_id + '</td></tr>';
            var optin = [];
            var optout = [];
            for (var i in d.after) {
                if (d.after[i]) {
                    optin.push(i.charAt(0).toUpperCase() + i.slice(1));
                }
                else {
                    optout.push(i.charAt(0).toUpperCase() + i.slice(1));
                }
            }
            if (optin.length) {
                str += '<tr><td>' + jQuery.i18n.map["consent.opt-i"] + '</td><td>' + optin.join(", ") + '</td></tr>';
            }
            if (optout.length) {
                str += '<tr><td>' + jQuery.i18n.map["consent.opt-o"] + '</td><td>' + optout.join(", ") + '</td></tr>';
            }

            if (!d.d) {
                d.d = "";
            }
            d.d = countlyDevice.getDeviceFullName(d.d);
            if (d.p) {
                if (d.pv && d.pv !== "") {
                    d.p += " " + countlyDeviceDetails.getCleanVersion(d.pv).replace(/:/g, ".");
                }
                if (d.d !== "") {
                    d.d += " (" + d.p + ")";
                }
                else {
                    d.d = d.p;
                }
            }
            str += '<tr><td>' + jQuery.i18n.map["devices.table.device"] + '</td><td>' + d.d + '</td></tr>';
            if (d.av) {
                str += '<tr><td>' + jQuery.i18n.map["app-versions.table.app-version"] + '</td><td>' + d.av.replace(/:/g, ".") + '</td></tr>';
            }
            str += '</table>' +
			'</div>';
        }
        return str;
    }
});

app.consentManagementView = new ConsentManagementView();

app.route('/manage/compliance/:tab', 'compliance', function(tab) {
    this.consentManagementView._tab = tab;
    this.renderWhenReady(this.consentManagementView);
});
app.route("/manage/compliance", "compliance", function() {
    this.consentManagementView._tab = null;
    this.renderWhenReady(this.consentManagementView);
});

app.addPageScript("/users/#", function() {
    if (app.activeView && app.activeView.tabs) {
        var formatConsent = function(d) {
            // `d` is the original data object for the row
            var str = '';
            if (d) {
                str += '<div class="datatablesubrow">' +
                    '<table cellpadding="5" cellspacing="0" border="0" class="subtable">' +
                    '<tr><td>Device ID</td><td>' + d.device_id + '</td></tr>';
                var optin = [];
                var optout = [];
                for (var i in d.after) {
                    if (d.after[i]) {
                        optin.push(i.charAt(0).toUpperCase() + i.slice(1));
                    }
                    else {
                        optout.push(i.charAt(0).toUpperCase() + i.slice(1));
                    }
                }
                if (optin.length) {
                    str += '<tr><td>' + jQuery.i18n.map["consent.opt-i"] + '</td><td>' + optin.join(", ") + '</td></tr>';
                }
                if (optout.length) {
                    str += '<tr><td>' + jQuery.i18n.map["consent.opt-o"] + '</td><td>' + optout.join(", ") + '</td></tr>';
                }

                if (!d.d) {
                    d.d = "";
                }
                d.d = countlyDevice.getDeviceFullName(d.d);
                if (d.p) {
                    if (d.pv && d.pv !== "") {
                        d.p += " " + countlyDeviceDetails.getCleanVersion(d.pv).replace(/:/g, ".");
                    }
                    if (d.d !== "") {
                        d.d += " (" + d.p + ")";
                    }
                    else {
                        d.d = d.p;
                    }
                }
                str += '<tr><td>' + jQuery.i18n.map["userdata.device-os"] + '</td><td>' + d.d + '</td></tr>';
                if (d.av) {
                    str += '<tr><td>' + jQuery.i18n.map["userdata.app-version"] + '</td><td>' + d.av.replace(/:/g, ".") + '</td></tr>';
                }
                str += '</table>' +
                '</div>';
            }
            return str;
        };
        app.activeView.tabs.tabs('add', '#usertab-consent', jQuery.i18n.map["consent.title"]);
        app.activeView.tabs.tabs("refresh");
        var userDetails = countlyUserdata.getUserdetails();
        $("#usertab-consent").append("<div class='widget-header'><div class='left'><div class='title'>" + jQuery.i18n.map["userdata.consents"] + "</div></div></div><table id='d-table-consents' class='d-table sortable help-zone-vb' cellpadding='0' cellspacing='0' data-view='consentManagementView'></table>");
        app.activeView.dtableconsents = $('#d-table-consents').dataTable($.extend({}, $.fn.dataTable.defaults, {
            "iDisplayLength": 30,
            "aaSorting": [[ 5, "desc" ]],
            "bServerSide": true,
            "bFilter": false,
            "sAjaxSource": countlyCommon.API_PARTS.data.r + "/consent/search?api_key=" + countlyGlobal.member.api_key + "&app_id=" + countlyCommon.ACTIVE_APP_ID + "&query=" + JSON.stringify({uid: userDetails.uid}),
            "fnServerData": function(sSource, aoData, fnCallback) {
                $.ajax({
                    "dataType": 'json',
                    "type": "POST",
                    "url": sSource,
                    "data": aoData,
                    "success": function(data) {
                        fnCallback(data);
                        CountlyHelpers.reopenRows(app.activeView.dtableconsents, formatConsent);
                    }
                });
            },
            "fnRowCallback": function(nRow, aData) {
                $(nRow).attr("id", aData._id);
            },
            "aoColumns": [
                CountlyHelpers.expandRowIconColumn(),
                {
                    "mData": function(row) {
                        return row.device_id;
                    },
                    "sType": "string",
                    "sTitle": "ID"
                },
                {"mData": "uid", "sType": "string", "sTitle": "UID" },
                {
                    "mData": function(row) {
                        var str = ""; var arr = (row.type + "").split(","); for (var i = 0; i < arr.length; i++) {
                            str += jQuery.i18n.map["consent.opt-" + arr[i]] + "<br/>";
                        } return str;
                    },
                    "sType": "string",
                    "sTitle": jQuery.i18n.map["consent.changes"]
                },
                {
                    "mData": function(row) {
                        var str = "";
                        var optin = 0;
                        var optout = 0;
                        for (var i in row.change) {
                            if (row.change[i]) {
                                optin++;
                            }
                            else {
                                optout++;
                            }
                        }
                        if (optin) {
                            str += jQuery.i18n.prop("consent.opt-in", optin) + "<br/>";
                        }
                        if (optout) {
                            str += jQuery.i18n.prop("consent.opt-out", optout) + "<br/>";
                        }
                        return str;
                    },
                    "sType": "string",
                    "sTitle": jQuery.i18n.map["consent.title"],
                    "bSortable": false
                },
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
                    "sTitle": jQuery.i18n.map["common.time"]
                }
            ]
        }));
        CountlyHelpers.expandRows(app.activeView.dtableconsents, formatConsent);
    }
});

$(document).ready(function() {
    app.addSubMenu("management", {code: "compliance", url: "#/manage/compliance", text: "compliance_hub.title", priority: 20});
});