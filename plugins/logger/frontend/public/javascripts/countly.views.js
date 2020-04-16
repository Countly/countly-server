/*global countlyView, store, $, countlyLogger, T, countlyCommon, countlyGlobal, jQuery, moment, app, LoggerView, CountlyHelpers*/
window.LoggerView = countlyView.extend({
    initialize: function() {
        this.filter = (store.get("countly_loggerfilter")) ? store.get("countly_loggerfilter") : "logger-all";
    },
    beforeRender: function() {
        var self = this;
        this.defaultLogItems();

        return $.when(T.render('/logger/templates/logger.html', function(src) {
            self.template = src;
        }), countlyLogger.initialize(this.filterToQuery())
        , countlyLogger.collection_info()).then(function() {});
    },

    defaultLogItems: function() {
        this.loggerItems = [
            {
                name: jQuery.i18n.map["logger.all"],
                value: "logger-all",
                type: ""
            },
            {
                name: jQuery.i18n.map["logger.session"],
                value: "logger-session",
                type: "session"
            },
            {
                name: jQuery.i18n.map["logger.event"],
                value: "logger-event",
                type: "events"
            },
            {
                name: jQuery.i18n.map["logger.metric"],
                value: "logger-metric",
                type: "metrics"
            },
            {
                name: jQuery.i18n.map["consent.title"],
                value: "logger-consent",
                type: "consent"
            },
            {
                name: jQuery.i18n.map["logger.user-details"],
                value: "logger-user",
                type: "user_details"
            },
            {
                name: jQuery.i18n.map["logger.crashes"],
                value: "logger-crash",
                type: "crash"
            }
        ];
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
                                    var selectedLog = (self.loggerItems.filter(function(o) {
                                        return o.value === self.filter;
                                    })[0]) || {};

                                    var value = row.t[selectedLog.type];

                                    if (!value && selectedLog.value === "logger-remote-config") {
                                        //This is a backward compatibility check for remote config
                                        //Remove this after 6 months approx from 16-04-2020
                                        //There is one more check below, remove that too
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
            this.refreshLoggerDropdown(this.filter);
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
    filterToQuery: function() {
        var self = this;
        var query = {};

        if (!this.filter) {
            return;
        }

        var selectedLog = this.loggerItems.filter(function(o) {
            return o.value === self.filter;
        });

        if (!selectedLog.length) {
            return;
        }

        selectedLog = selectedLog[0];

        if (selectedLog.value !== "logger-all") {
            query["t." + selectedLog.type] = {$exists: true};
        }

        if (selectedLog.value === "logger-remote-config") {
            //This is a backward compatibility check for remote config
            //Remove this after 6 months approx from 16-04-2020
            //There is one more check above, remove that too
            var lookt = {};
            var looksrc = {};
            lookt["t.rc"] = {$exists: true};
            looksrc.src = "remote-config";

            query = { "$or": [ lookt, looksrc] };
        }

        return query;
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
    refreshLoggerDropdown: function(filter) {
        var self = this;
        $("#logger-selector").clySelectSetItems(this.loggerItems);

        var currentLogItem = this.loggerItems.filter(function(o) {
            return o.value === self.filter;
        });

        $("#logger-selector").off("cly-select-change").on("cly-select-change", function(e, selected) {
            self.filter = selected;
            store.set("countly_loggerfilter", selected);
            self.refresh();
        });

        if (!currentLogItem.length) {
            var plugin = self.filter.replace("logger-", "");
            if (countlyGlobal.plugins.indexOf(plugin) < 0) {
                //The plugin is not present so set the logger-all as default item
                currentLogItem = [self.loggerItems[0]];
                filter = currentLogItem[0].value;
            }
        }

        if (currentLogItem.length && (currentLogItem[0].value === filter)) {
            //This check avoids setting the same filter multiple times when called by the plugins
            currentLogItem = currentLogItem[0];
            $("#logger-selector").clySelectSetSelection(currentLogItem.value, currentLogItem.name);
        }
    }
});

//register views
app.loggerView = new LoggerView();

app.route('/manage/logger', 'logger', function() {
    this.renderWhenReady(this.loggerView);
});

$(document).ready(function() {
    app.addSubMenu("management", {code: "logger", url: "#/manage/logger", text: "logger.title", priority: 60});
});