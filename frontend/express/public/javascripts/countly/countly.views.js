/* global countlyView, countlyCommon, app, CountlyHelpers, countlyGlobal, Handlebars, countlyTaskManager, countlyVersionHistoryManager, DownloadView, VersionHistoryView, Backbone, jQuery, $*/

window.DashboardView = countlyView.extend({
    renderCommon: function() {
        if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID]) {
            var type = countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].type;
            type = jQuery.i18n.map["management-applications.types." + type] || type;
            $(this.el).html("<div id='no-app-type'><h1>" + jQuery.i18n.map["common.missing-type"] + ": " + type + "</h1><h3><a href='#/manage/plugins'>" + jQuery.i18n.map["common.install-plugin"] + "</a><br/>" + jQuery.i18n.map["common.or"] + "<br/><a href='#/manage/apps'>" + jQuery.i18n.map["common.change-app-type"] + "</a></h3></div>");
        }
        else {
            $(this.el).html("<div id='no-app-type'><h1>" + jQuery.i18n.map["management-applications.no-app-warning"] + "</h1><h3><a href='#/manage/apps'>" + jQuery.i18n.map["common.add-new-app"] + "</a></h3></div>");
        }
    }
});

window.DownloadView = countlyView.extend({
    renderCommon: function() {
        var self = this;
        if (!this.task_id) {
            $(this.el).html('<div id="no-app-type"><h1>' + jQuery.i18n.map["downloading-view.download-not-available-title"] + '</h1><p>' + jQuery.i18n.map["downloading-view.download-not-available-text"] + '</p></div>');
            return;
        }
        this.path = this.path || "/app_users/download/";
        var myhtml;
        if (this.path) {
            myhtml = '<div id="no-app-type"><h1>' + jQuery.i18n.map["downloading-view.download-title"] + '</h1>';
            self.link = countlyCommon.API_PARTS.data.r + self.path + self.task_id + "?auth_token=" + countlyGlobal.auth_token + "&app_id=" + countlyCommon.ACTIVE_APP_ID;
            window.location = self.link;

            if (self.link) {
                myhtml += '<p><a href="' + self.link + '">' + jQuery.i18n.map["downloading-view.if-not-start"] + '</a></p>';
            }
            myhtml += "</div>";
            $(self.el).html(myhtml);
        }
        else {
            this.path = "/app_users/download/";
            countlyTaskManager.fetchResult(this.task_id, function(res) {
                myhtml = '<div id="no-app-type"><h1>' + jQuery.i18n.map["downloading-view.download-title"] + '</h1>';
                if (res && res.data) {
                    res.data = res.data.replace(new RegExp("&quot;", 'g'), "");
                    self.link = countlyCommon.API_PARTS.data.r + self.path + res.data + "?auth_token=" + countlyGlobal.auth_token + "&app_id=" + countlyCommon.ACTIVE_APP_ID;
                    window.location = self.link;


                    if (self.link) {
                        myhtml += '<p><a href="' + self.link + '">' + jQuery.i18n.map["downloading-view.if-not-start"] + '</a></p>';
                    }
                    myhtml += "</div>";
                }
                else {
                    myhtml = '<div id="no-app-type"><h1>' + jQuery.i18n.map["downloading-view.download-not-available-title"] + '</h1><p>' + jQuery.i18n.map["downloading-view.download-not-available-text"] + '</p></div>';
                }
                $(self.el).html(myhtml);

            });
        }
    }
});

window.VersionHistoryView = countlyView.extend({
    initialize: function() {
        this.template = Handlebars.compile($("#version-history-template").html());
    },
    beforeRender: function() {
        return $.when(countlyVersionHistoryManager.initialize()).then(function() {});
    },
    renderCommon: function(isRefresh) {

        var tableData = countlyVersionHistoryManager.getData(true) || {fs: [], db: [], pkg: "", "mongo": ""};

        //provide template data
        this.templateData = {
            "db-title": jQuery.i18n.map["version_history.page-title"] + " (DB)",
            "fs-title": jQuery.i18n.map["version_history.page-title"] + " (FS)",
            "package-version": jQuery.i18n.map["version_history.package-version"] + ": " + tableData.pkg,
            "mongo-version": "MongDb version:" + tableData.mongo
        };

        /**
         * Processes version history and returns a DataTable config
         * @param {object} dataObj Version history array 
         * @returns {object} DataTable configuration
         */
        function getTable(dataObj) {

            if (!Array.isArray(dataObj)) {
                dataObj = [];
            }
            if (dataObj.length === 0) {
                dataObj.push({"version": countlyGlobal.countlyVersion, "updated": Date.now()});
            }
            else {
                dataObj[dataObj.length - 1].version += (" " + jQuery.i18n.map["version_history.current-version"]);
            }

            return {
                "aaData": dataObj,
                "fnRowCallback": function(nRow, aData) {
                    $(nRow).attr("data-id", aData._id);
                    //$(nRow).attr("data-name", aData.report_name || aData.name || '-');
                },
                "aoColumns": [
                    {
                        "mData": function(row) {
                            return row.version;
                        },
                        "sType": "string",
                        "sTitle": jQuery.i18n.map["version_history.version"],
                        "bSortable": false,
                        "sClass": "break"
                    },
                    {
                        "mData": function(row) {
                            return new Date(row.updated);
                        },
                        "sType": "numeric",
                        "sTitle": jQuery.i18n.map["version_history.upgraded"],
                        "bSortable": true,
                        "sClass": "break"
                    }
                ]
            };
        }

        if (!isRefresh) {
            //set data
            $(this.el).html(this.template(this.templateData));

            this.dtableFs = $('#data-table-fs').dataTable($.extend({"searching": false, "paging": false}, $.fn.dataTable.defaults, getTable(tableData.fs)));
            this.dtableFs.fnSort([ [1, 'desc'] ]);
            this.dtableDb = $('#data-table-db').dataTable($.extend({"searching": false, "paging": false}, $.fn.dataTable.defaults, getTable(tableData.db)));
            this.dtableDb.fnSort([ [1, 'desc'] ]);
        }
    }
});

$.ajaxPrefilter(function(options, originalOptions, jqXHR) {
    //jqXHR.setRequestHeader('X-CSRFToken', csrf_token);
    if (countlyGlobal.auth_token) {
        var testurl = originalOptions.url;

        //if url is valid+auth_token and api_key not given
        if (testurl.indexOf(countlyCommon.API_PARTS.data.w) === 0 || testurl.indexOf(countlyCommon.API_PARTS.data.r) === 0) {
            //add token in header
            jqXHR.setRequestHeader('countly-token', countlyGlobal.auth_token);
        }

    }
});

//register views
app.DownloadView = new DownloadView();
app.VersionHistoryView = new VersionHistoryView();


// app.route("/analytics/events", "events", function() {
//     this.renderWhenReady(this.eventsView);
// });

app.route('/exportedData/AppUserExport/:task_id', 'userExportTask', function(task_id) {
    this.DownloadView.task_id = task_id;
    this.renderWhenReady(this.DownloadView);
});

app.route('/exportedData/tableExport/:task_id', 'userExportTask', function(task_id) {
    this.DownloadView.task_id = task_id;
    this.DownloadView.path = "/export/download/";
    this.renderWhenReady(this.DownloadView);
});

app.route('/versions', 'version_history', function() {
    this.renderWhenReady(this.VersionHistoryView);
});

app.addAppSwitchCallback(function() {
    $.when(countlyVersionHistoryManager.initialize()).then(function() {
        var versionsData = countlyVersionHistoryManager.getData(true) || {fs: [], db: [], pkg: ""};
        var dbVersion = countlyGlobal.countlyVersion;
        if (versionsData.db && versionsData.db.length > 0) {
            dbVersion = versionsData.db[versionsData.db.length - 1];
        }

        var fsVersion = countlyGlobal.countlyVersion;
        if (versionsData.fs && versionsData.fs.length > 0) {
            fsVersion = versionsData.fs[versionsData.fs.length - 1];
        }

        var versions = [versionsData.pkg, dbVersion, fsVersion];
        for (var z = 0; z < versions.length; z++) {
            if (versions[z].version) {
                versions[z] = versions[z].version;
            }
            versions[z] = versions[z].split(".");
            if (versions[z].length > 2) {
                versions[z] = versions[z].slice(0, 2);
            }
            versions[z] = versions[z].join(".");
        }

        if (versions[1] !== versions[2]) {
            CountlyHelpers.notify({
                title: jQuery.i18n.map["version_history.alert-title"],
                message: jQuery.i18n.map["version_history.alert-message"]
            });
        }
    });
});


/**to check if there are changes in event view and ask for conformation befor moving forvard
 * @returns {boolean} true - no changes, moving forward
 */
function checkIfEventViewHaveNotUpdatedChanges() {
    if (app.eventsBlueprintView && app.eventsBlueprintView.preventHashChange === true) {
        var movemeto = Backbone.history.getFragment();
        if (movemeto !== "/analytics/events/blueprint") {
            CountlyHelpers.confirm(jQuery.i18n.map["events.general.want-to-discard"], "popStyleGreen", function(result) {
                if (!result) {
                    window.location.hash = "/analytics/events/blueprint";
                }
                else {
                    app.eventsBlueprintView.preventHashChange = false;
                    window.location.hash = movemeto;
                }
            }, [jQuery.i18n.map["common.no-dont-continue"], jQuery.i18n.map['common.yes-discard']], {title: jQuery.i18n.map["events.general.want-to-discard-title"], image: "empty-icon"});
            return false;
        }
        else {
            return true;
        }
    }
    else {
        return true;
    }
}
Backbone.history.urlChecks.push(checkIfEventViewHaveNotUpdatedChanges);