/*global countlyView, store, $, countlyLogger, countlyGlobal, Handlebars, countlyCommon, jQuery, moment, app, LoggerView, CountlyHelpers*/
window.LoggerView = countlyView.extend({
    initialize: function() {
        this.filter = (store.get("countly_loggerfilter")) ? store.get("countly_loggerfilter") : "logger-all";
    },
    beforeRender: function() {
        if (this.template) {
            return $.when(countlyLogger.initialize(this.filterToQuery()), countlyLogger.collection_info()).then(function() {});
        }
        else {
            var self = this;
            return $.when($.get(countlyGlobal.path + '/logger/templates/logger.html', function(src) {
                self.template = Handlebars.compile(src);
            }), countlyLogger.initialize(this.filterToQuery())
            , countlyLogger.collection_info()).then(function() {});
        }
    },
    renderCommon: function(isRefresh) {
        var data = countlyLogger.getData();
        var collectoin_info = countlyLogger.getCollectionInfo();
        this.templateData = {
            "page-title": jQuery.i18n.map["logger.title"],
            "collection-info": jQuery.i18n.prop("logger.collection-description", collectoin_info.max),
            "collection-capped": collectoin_info.capped,
        };
        var self = this;
        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            $("#" + this.filter).addClass("selected").addClass("active");

            this.dtable = $('#logger-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": data,
                "fnRowCallback": function(nRow, aData) {
                    $(nRow).attr("id", aData._id);
                },
                "aoColumns": [
                    CountlyHelpers.expandRowIconColumn(),
                    {
                        "mData": function(row) {
                            var ret = '';
                            if (row.m) {
                                ret += row.m + "<br/>";
                            }
                            else {
                                ret += "GET<br/>";
                            }
                            if (row.b === true) {
                                ret += "Bulk";
                            }

                            return ret;
                        },
                        "sType": "string",
                        "sTitle": jQuery.i18n.map["logger.type"]
                    },
                    {
                        "mData": function(row, type) {
                            if (type === "display") {
                                if ((Math.round(parseFloat(row.reqts, 10)) + "").length === 10) {
                                    return moment(row.reqts * 1000).format("MMMM Do YYYY<br/>HH:mm:ss");
                                }
                                else {
                                    return moment(row.reqts).format("MMMM Do YYYY<br/>HH:mm:ss");
                                }
                            }
                            else {
                                if ((Math.round(parseFloat(row.reqts, 10)) + "").length === 10) {
                                    return row.reqts * 1000;
                                }
                                else {
                                    return row.reqts;
                                }
                            }
                        },
                        "sType": "string",
                        "sTitle": jQuery.i18n.map["logger.requestts"]
                    },
                    {
                        "mData": function(row, type) {
                            if (type === "display") {
                                if ((Math.round(parseFloat(row.ts, 10)) + "").length === 10) {
                                    return moment(row.ts * 1000).format("MMMM Do YYYY<br/>HH:mm:ss");
                                }
                                else {
                                    return moment(row.ts).format("MMMM Do YYYY<br/>HH:mm:ss");
                                }
                            }
                            else {
                                if ((Math.round(parseFloat(row.ts, 10)) + "").length === 10) {
                                    return row.ts * 1000;
                                }
                                else {
                                    return row.ts;
                                }
                            }
                        },
                        "sType": "string",
                        "sTitle": jQuery.i18n.map["logger.timestamp"]
                    },
                    {
                        "mData": function(row) {
                            var ret = "<b>Device ID:</b> <br/>" + row.d.id;
                            if (row.d.d) {
                                ret += "<br/><br/>" + row.d.d;
                                if (row.d.p) {
                                    ret += " (" + row.d.p;
                                    if (row.d.pv) {
                                        ret += " " + row.d.pv.substring(1).replace(new RegExp(":", 'g'), ".");
                                    }
                                    ret += ")";
                                }
                            }
                            return ret;
                        },
                        "sType": "string",
                        "sTitle": jQuery.i18n.map["logger.device"]
                    },
                    {
                        "mData": function(row) {
                            if (typeof row.t === "object") {
                                var ob = {};
                                if (self.filter && self.filter !== "logger-all") {
                                    var filterToQuery = self.filterToQuery();
                                    var value = "";
                                    if (filterToQuery.types) {
                                        //LOG SOURCE IS LOGGER ITSELF
                                        //HENCE THE DATA FOR THE FILTER IS STORED IN THE TYPES
                                        value = row.t[filterToQuery.types];
                                    }
                                    else if (filterToQuery.source) {
                                        //LOG SOURCE IS A PLUGIN
                                        //HENCE IN THIS CASE SHOW THE RESPONSE SENT BY THE PLUGIN IN INFORMATION
                                        value = row.res;
                                    }
                                    if (typeof value === "string") {
                                        try {
                                            ob = JSON.parse(countlyCommon.decodeHtml(value));
                                        }
                                        catch (ex) {
                                            ob = countlyCommon.decodeHtml(value);
                                        }
                                    }
                                    else {
                                        ob = value;
                                    }
                                }
                                else {
                                    ob = [];
                                    for (var i in row.t) {
                                        ob.push(i);
                                    }
                                }
                                return "<pre>" + JSON.stringify(ob, null, 2) + "</pre>";
                            }
                            else if (typeof row.i === "object") {
                                return "<pre>" + JSON.stringify(row.i, null, 2) + "</pre>";
                            }
                            else {
                                var infoVal = "";
                                try {
                                    infoVal = JSON.parse(countlyCommon.decodeHtml(row.i));
                                }
                                catch (e) {
                                    return "<pre>" + countlyCommon.decodeHtml(row.i) + "</pre>";
                                }

                                return "<pre>" + JSON.stringify(infoVal, null, 2) + "</pre>";
                            }
                        },
                        "sType": "string",
                        "sTitle": jQuery.i18n.map["logger.info"],
                        "bSortable": false
                    },
                    {
                        "mData": function(row) {

                            var ret = "";

                            if (row.v) {
                                ret += "<b>" + jQuery.i18n.map["logger.version"] + ":</b> ";
                                ret += "<br/>";
                                ret += row.v.replace(new RegExp(":", 'g'), ".");
                                ret += "<br/><br/>";
                            }

                            if (row.s && (row.s.name || row.s.version)) {
                                ret += "<b>" + jQuery.i18n.map["logger.sdk"] + ":</b> ";
                                ret += "<br/>";
                                ret += (row.s.name || "") + " " + (row.s.version || "");
                                ret += "<br/><br/>";
                            }

                            if (row.l.cc) {
                                ret += "<b>" + jQuery.i18n.map["logger.location"] + ":</b> ";
                                ret += "<br/>";
                                ret += '<div class="flag ' + row.l.cc.toLowerCase() + '" style="margin-top:2px; margin-right:6px; background-image: url(images/flags/' + row.l.cc.toLowerCase() + '.png);"></div>' + row.l.cc;
                                if (row.l.cty) {
                                    ret += " (" + row.l.cty + ")";
                                }
                                ret += "<br/><br/>";
                            }

                            if (row.c) {
                                ret += "<b class='red-text'>" + jQuery.i18n.map["logger.request-canceled"] + ":</b><br/> " + row.c + "";
                                ret += "<br/><br/>";
                            }

                            if (jQuery.isArray(row.p)) {
                                ret += "<b class='red-text'>" + jQuery.i18n.map["logger.problems"] + ":</b><br/>" + row.p.join("<br/>");
                                ret += "<br/><br/>";
                            }

                            return ret;
                        },
                        "sType": "string",
                        "bSortable": false
                    }
                ]
            }));
            this.dtable.stickyTableHeaders();
            this.dtable.fnSort([ [2, 'desc'] ]);
            CountlyHelpers.expandRows(this.dtable, this.requestInfo);
        }
    },
    refresh: function() {
        var self = this;
        if (!this.dtable.aOpen.length) {
            $.when(countlyLogger.initialize(this.filterToQuery())).then(function() {
                if (app.activeView !== self) {
                    return false;
                }
                var data = countlyLogger.getData();
                CountlyHelpers.refreshTable(self.dtable, data);
                CountlyHelpers.reopenRows(self.dtable, self.requestInfo);
                app.localize();
            });
        }
    },
    filterLog: function(filter) {
        this.filter = filter;
        store.set("countly_loggerfilter", filter);
        $("#" + this.filter).addClass("selected").addClass("active");
        this.refresh();
    },
    filterToQuery: function() {
        if (this.filter) {
            var filter = {};

            if (this.filter === "logger-all") {
                //No filter
            }
            else if (this.filter === "logger-event") {
                filter.types = "events";
            }
            else if (this.filter === "logger-session") {
                filter.types = "session";
            }
            else if (this.filter === "logger-metric") {
                filter.types = "metrics";
            }
            else if (this.filter === "logger-user") {
                filter.types = "user_details";
            }
            else if (this.filter === "logger-crash") {
                filter.types = "crash";
            }
            else if (this.filter === "logger-consent") {
                filter.types = "consent";
            }
            else {
                //THIS ELSE REPRESENTS ALL THOSE CASES WHEN THE LOG SOURCE IS SOME EXTERNAL PLUGIN
                //AND YOU WANT TO THE FILTER THE LOGS BY THAT PLUGIN
                var source = this.filter.replace("logger-", "");
                if (source) {
                    filter.source = source;
                }
            }

            return filter;
        }
    },
    requestInfo: function(d) {
        // `d` is the original data object for the row
        var str = '';
        if (d && (d.h || d.q)) {
            str += '<div class="datatablesubrow">' +
			'<table cellpadding="5" cellspacing="0" border="0" style="width: 100%;">';
            if (d.h) {
                str += '<tr><td style="text-transform:none;">' + "<b>" + jQuery.i18n.map["logger.request-header"] + ":</b><pre>" + JSON.stringify(d.h, null, 2) + "</pre>" + '</td></tr>';
            }
            if (d.q) {
                str += '<tr><td>' + "<b>" + jQuery.i18n.map["logger.request-payload"] + ":</b><pre>" + JSON.stringify(JSON.parse(countlyCommon.decode(d.q)), null, 2) + "</pre>" + '</td></tr>';
            }
            if (d.res && (typeof d.res === "string")) {
                str += '<tr><td>' + "<b>" + jQuery.i18n.map["logger.request-reponse"] + ":</b><pre>" + JSON.stringify(JSON.parse(countlyCommon.decode(d.res)), null, 2) + "</pre>" + '</td></tr>';
            }
            str += '</table>';
            str += '</div>';
        }
        return str;
    },
});

//register views
app.loggerView = new LoggerView();

app.route('/manage/logger', 'logger', function() {
    this.renderWhenReady(this.loggerView);
});
app.addPageScript("/manage/logger", function() {
    $("#logger-selector").on("click", ">.button", function() {
        if ($(this).hasClass("selected")) {
            return true;
        }

        $(".logger-selector").removeClass("selected").removeClass("active");
        var filter = $(this).attr("id");
        app.activeView.filterLog(filter);
    });
});

$(document).ready(function() {
    app.addSubMenu("management", {code: "logger", url: "#/manage/logger", text: "logger.title", priority: 60});
});