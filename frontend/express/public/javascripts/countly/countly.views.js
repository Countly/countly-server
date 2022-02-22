/* global countlyView, countlyCommon, app, CountlyHelpers, countlyGlobal, Handlebars, countlyTaskManager, countlyVersionHistoryManager, DownloadView, VersionHistoryView, GraphNotesView, Backbone, moment, jQuery, $*/


window.GraphNotesView = countlyView.extend({
    beforeRender: function() {
        this.template = Handlebars.compile($("#template-graph-notes-view").html());
    },
    addNotesMenuLink: function(self) {
        if ($('#notes-button-group').length > 0) {
            return;
        }
        var menu = '<span  id="notes-button-group" class="cly-button-menu-group">' +
        '<div class="cly-button-menu-trigger"></div>' +
            '<div class="cly-button-menu">' +
                '<div id="add-note" class="item" data-localize="notes.add-note"></div>' +
                '<div id="manage-notes" class="item" data-localize="notes.manage-notes"></div>' +
            '</div>' +
        '</span>';
        $(menu).insertBefore("#date-selector");

        $("#notes-button-group .cly-button-menu-trigger").off("click").on("click", function(event) {
            event.stopPropagation();
            $(event.target).toggleClass("active");
            if ($(event.target).hasClass("active")) {
                $('#notes-button-group > .cly-button-menu').focus();
            }
            else {
                $(event.target).removeClass("active");
            }
        });

        $("#date-time-selector").appendTo($(".graph-note-create .date-time"));

        $("#notes-button-group .cly-button-menu .item").off("click").on("click", function(event) {
            var item = event.target.id;
            if (item === 'add-note') {
                app.graphNotesView.initNoteDialog(self);
            }
            if (item === 'manage-notes') {
                location.href = "#/analytics/graph-notes";
            }
        });
    },
    checkInput: function() {
        var note = $(".graph-note-textarea").val();
        var datetimeText = $(".date-time-selector-container .date-time-value-show").text();
        var dateTime = moment(datetimeText, "DD.MM.YYYY, HH:mm", true);
        var noteType = $(".note-type.active").data("note-type");
        var emailValid = true;
        if (noteType === 'shared') {
            emailValid = ($("#email-list-input").val() !== null);
        }
        if (!note || !dateTime._isValid || !emailValid) {
            $(".add-note").addClass('disabled');
        }
        else {
            $(".add-note").removeClass('disabled');
        }
    },
    initNoteDialog: function(self, data) {
        var that = this;
        $("#notes-button-group > .cly-button-menu-trigger").removeClass("active");
        var dialog = $("#cly-popup").clone().removeAttr("id").addClass('graph-note-create');
        dialog.removeClass('black');
        var content = dialog.find(".content");
        var noteHTML = Handlebars.compile($("#graph-note-create").html());
        content.html(noteHTML(this));
        CountlyHelpers.revealDialog(dialog);
        app.localize();
        $(".graph-note-textarea").attr("placeholder", jQuery.i18n.map["notes.note-textarea-placeholder"]);

        //date time picker
        var element = $('.date-time-picker');
        $(element).datepicker({
            defaultDate: new Date(),
            minDate: new Date(2000, 1 - 1, 1),
            maxDate: new Date(),
            numberOfMonths: 1,
            showOtherMonths: true,
            onSelect: function() {}
        });
        $(element).datepicker("option", $.datepicker.regional[countlyCommon.BROWSER_LANG]);
        var REGEX_EMAIL = '([a-z0-9!#$%&\'*+/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&\'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)';
        self.emailInput = $('#email-list-input').selectize({
            plugins: ['remove_button'],
            persist: false,
            maxItems: null,
            valueField: 'email',
            labelField: 'name',
            searchField: ['name', 'email'],
            placeholder: jQuery.i18n.map["dashboards.select-users"],

            options: [
                {email: countlyGlobal.member.email, name: countlyGlobal.member.full_name},
            ],
            render: {
                item: function(item, escape) {
                    return '<div>' +
                        (item.name ? '<span class="name">' + escape(item.name) + ' : </span>' : '') +
                        (item.email ? '<span class="email">' + escape(item.email) + '</span>' : '') +
                    '</div>';
                },
                option: function(item, escape) {
                    var label = item.name || item.email;
                    var caption = item.name ? item.email : null;
                    return '<div>' +
                        '<span class="label">' + escape(label) + '</span>' +
                        (caption ? ' : <span class="caption">' + escape(caption) + '</span>' : '') +
                    '</div>';
                }
            },
            createFilter: function(input) {
                var match, regex;
                // email@address.com
                regex = new RegExp('^' + REGEX_EMAIL + '$', 'i');
                match = input.match(regex);
                if (match) {
                    return !Object.prototype.hasOwnProperty.call(this.options, match[0]);
                }

                // name <email@address.com>

                regex = new RegExp('^([^<]*)\<' + REGEX_EMAIL + '\>$', 'i');

                match = input.match(regex);
                if (match) {
                    return !Object.prototype.hasOwnProperty.call(this.options, match[2]);
                }
                that.checkInput();
                return false;
            },
            create: function(input) {
                if ((new RegExp('^' + REGEX_EMAIL + '$', 'i')).test(input)) {
                    return {email: input};
                }
                /*eslint-disable */
                var match = input.match(new RegExp('^([^<]*)\<' + REGEX_EMAIL + '\>$', 'i'));
                /*eslint-enable */
                if (match) {
                    return {
                        email: match[2],
                        name: $.trim(match[1])
                    };
                }
                CountlyHelpers.alert('Invalid email address.', "red");
                return false;
            }
        });

        self.emailInput.off("change").on("change", function() {
            that.checkInput();
        });
        $(".date-time-selector-container").off("click").on("click", function() {
            setTimeout(function() {
                $('.date-time-picker').toggle();
                $('.date-time-picker').css("display", "flex");
            }, 0);
        });
        $(".date-time-selector-container .date-clear").off("click").on("click", function() {
            $('.date-time-picker').toggle();
        });
        $(".date-time-picker").off('click').click(function(e) {
            e.stopPropagation();
        });
        $(".date-time-selector-container .date-submit").off("click").on("click", function() {
            var currentDate = $(".date-time-picker").datepicker("getDate");
            var hours = $(".date-time-selector-container .time-field .hour").val();
            var minutes = $(".date-time-selector-container .time-field .minute").val();
            currentDate.setHours(hours);
            currentDate.setMinutes(minutes);
            var result = moment(currentDate);
            $(".date-time-selector-container .date-time-value-show").text(result.format("DD.MM.YYYY, HH:mm"));
            $('.date-time-picker').toggle();
            that.checkInput();
            return result;
        });
        $(".graph-note-create .note-type").off("click").on("click", function(e) {
            $(".graph-note-create .note-type").removeClass("active");
            $(e.target).addClass("active");
            var noteType = $(e.target).data("note-type");
            $(".graph-note-create").css("height", "unset");
            if (noteType === "shared") {
                $(".email-select-block").css("display", "block");
            }
            else {
                $(".email-select-block").css("display", "none");
            }
            that.checkInput();
        });
        $(".graph-note-create .color").off("click").on("click", function(e) {
            $(".graph-note-create .color").removeClass("selected");
            $(e.target).addClass("selected");
        });

        //load note data in edit mode
        if (data) {
            $(".note-form-hearder").text(jQuery.i18n.map['notes.edit-note-form-title']);
            $(".graph-note-textarea").val(data.note);
            $(".graph-note-create").find(".note-type").removeClass("active");
            $(".graph-note-create").find(".note-type[data-note-type=" + data.noteType + "]").trigger("click");

            $(".grah-note-create").find(".color").removeClass("selected");
            $(".graph-note-create").find(".color[data-color=" + data.color + "]").trigger("click");
            for (var i = 0; i < data.emails.length; i++) {
                self.emailInput[0].selectize.createItem(data.emails[i], false);
            }
            self.emailInput[0].selectize.setValue(data.emails, false);

            var ts = new Date(data.ts);

            $(".date-time-picker").datepicker("setDate", ts);
            $(".date-time-selector-container .date-time-value-show").text(moment(ts).format("DD.MM.YYYY, HH:mm"));

            $(".date-time-selector-container .time-field .hour").val(ts.getHours());
            $(".date-time-selector-container .time-field .minute").val(ts.getMinutes());
        }

        $(".cancel-add-note").off("click").on("click", function() {
            CountlyHelpers.removeDialog(dialog);
        });
        that.checkInput();
        $(".graph-note-textarea").off('input').on("input", function() {
            that.checkInput();
        });
        $(".add-note").off("click").on("click", function() {
            if ($(".add-note").hasClass('disabled')) {
                return;
            }
            var note = $(".graph-note-textarea").val();
            var datetimeText = $(".date-time-selector-container .date-time-value-show").text();
            var dateTime = moment(datetimeText, "DD.MM.YYYY, HH:mm", true);
            var noteType = $(".note-type.active").data("note-type") || "private";
            var color = $(".graph-note-create .color.selected").data("color");
            var args = {
                note: note,
                ts: dateTime.valueOf(),
                noteType: noteType,
                color: color,
                category: 'session',
            };
            if (noteType === 'shared') {
                args.emails = $("#email-list-input").val();
            }
            if (data && data._id) {
                args._id = data._id;
            }
            $.ajax({
                type: "POST",
                url: countlyCommon.API_PARTS.data.w + '/notes/save',
                data: {
                    args: JSON.stringify(args),
                    api_key: countlyGlobal.member.api_key,
                    app_id: countlyCommon.ACTIVE_APP_ID,
                },
                dataType: "json",
                success: function() {
                    CountlyHelpers.removeDialog(dialog);
                    countlyCommon.getGraphNotes([countlyCommon.ACTIVE_APP_ID], function() {
                        self.refresh();
                    });
                },
                error: function(xhr, status, error) {
                    CountlyHelpers.alert(error, "red");
                }
            });
        });

        var noteTips = {
            "private": jQuery.i18n.map["notes.private-remind"],
            "shared": jQuery.i18n.map["notes.shared-remind"],
            "public": jQuery.i18n.map["notes.public-remind"]
        };

        for (var key in noteTips) {
            var node = $(".graph-note-create").find(".note-type[data-note-type=" + key + "]");
            node.attr({
                "title": "<div><div class='note-type-tip-title'>" + key + " Note</div>" + "<div class='note-type-tip-content'>" + noteTips[key] + "</div></div>"
            });
            node.tipsy({ gravity: $.fn.tipsy.autoNS, offset: 3, html: true, delayOut: 1, trigger: 'hover', hoverable: true });
        }

    },
    renderCommon: function(isRefresh) {
        if (isRefresh) {
            return;
        }
        var self = this;
        this.types = {
            all: jQuery.i18n.map["notes.note-all"],
            public: jQuery.i18n.map["notes.note-public"],
            shared: jQuery.i18n.map["notes.note-shared"],
            private: jQuery.i18n.map["notes.note-private"],
        };
        this.templateData = {
            "page-title": jQuery.i18n.map["notes.manage-notes"],
            "filter1": this.types,
            "active-filter1": jQuery.i18n.map["notes.note-all"],
        };
        $(this.el).html(this.template(this.templateData));
        var tableData = [];
        this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
            "iDisplayLength": 10,
            "aaData": tableData,
            "bServerSide": true,
            "sAjaxSource": countlyCommon.API_PARTS.data.r + "/notes?api_key=" + countlyGlobal.member.api_key,
            "fnServerData": function(sSource, aoData, fnCallback) {
                self.request = $.ajax({
                    "dataType": 'json',
                    "type": "POST",
                    "url": sSource + "&app_id=" + countlyCommon.ACTIVE_APP_ID + '&period=' + countlyCommon.getPeriod() + "&notes_apps=" + encodeURIComponent(JSON.stringify([countlyCommon.ACTIVE_APP_ID])) + (self.filter_type ? "&note_type=" + self.filter_type : ""),
                    "data": aoData,
                    "success": function(dataResult) {
                        self.tableData = dataResult;
                        fnCallback(dataResult);
                    }
                });
            },
            "aoColumns": [
                { "mData": "note", sType: "string", "sTitle": jQuery.i18n.map["notes.note"], "sWidth": "50%", "bSortable": false},
                {
                    "mData": "owner_name",
                    "sType": "string",
                    "sTitle": jQuery.i18n.map["notes.note-owner"],
                    "bSortable": false,
                    "sDefaultContent": "",
                },
                {
                    "mData": function(row) {
                        return row.ts && moment(row.ts).format("D MMM, HH:mm, YYYY");
                    },
                    "sType": "string",
                    "sWidth": "20%",
                    "sTitle": jQuery.i18n.map["notes.note-date-and-time"],
                },
                {
                    "mData": function(row) {
                        return jQuery.i18n.map["notes.note-" + row.noteType] || row.noteType;
                    },
                    "sType": "string",
                    "sTitle": jQuery.i18n.map["notes.note-type"],
                },
                {
                    "mData": function(row) {
                        return typeof row.emails === "object" && row.emails.join("<br/>") || '-';
                    },
                    "sType": "string",
                    "sTitle": jQuery.i18n.map["notes.note-email"],
                    "sDefaultContent": "-",
                    "bSortable": false,
                },
                {
                    "mData": function(row) {
                        var adminApps = Object.keys(countlyGlobal.admin_apps);
                        var isAdminofApp = adminApps.indexOf(countlyCommon.ACTIVE_APP_ID) >= 0 ? true : false;
                        if (row.owner === countlyGlobal.member._id || (isAdminofApp && row.noteType === 'public') || (countlyGlobal.member.global_admin && row.noteType === 'public')) {
                            return "<div class='notes-manage-options-item'>" +
                                "<div class='edit'></div>" +
                                "<div class='edit-menu'>" +
                                    "<div class='edit-note item' id='" + row._id + "'><i class='fa fa-pencil'></i><span id='" + row._id + "'data-localize='notes.note-edit'> </span></div>" +
                                    "<div class='delete-note item' id='" + row._id + "'><i class='fa fa-trash' ></i><span id='" + row._id + "' data-localize='notes.note-delete'> </span></div>" +
                                "</div>" +
                            "</div>";
                        }
                        return "";
                    },
                    "bSortable": false,
                },
            ]
        }));

        $(".d-table").stickyTableHeaders();
        $("body").off("click", ".notes-manage-options-item .edit").on("click", ".notes-manage-options-item .edit", function() {
            $(this).next(".edit-menu").fadeToggle();
            event.stopPropagation();
            app.localize();
        });

        $("body").off("click", ".delete-note").on("click", ".delete-note", function(e) {
            var noteId = e.currentTarget.id;
            CountlyHelpers.confirm("", "popStyleGreen", function(result) {
                if (!result) {
                    return true;
                }
                $.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.w + '/notes/delete',
                    dataType: "json",
                    data: {
                        app_id: countlyCommon.ACTIVE_APP_ID,
                        api_key: countlyGlobal.member.api_key,
                        note_id: noteId,
                    },
                    success: function() {
                        self.refresh();
                    },
                    error: function(xhr, status, error) {
                        CountlyHelpers.alert(error, "red");
                    }
                });
            },
            [
                jQuery.i18n.map["common.no-dont-delete"],
                jQuery.i18n.map["notes.note-yes-delete"]
            ],
            {title: jQuery.i18n.map["notes.note-delete-title"], image: "delete-report"});
        });

        $("body").off("click", ".edit-note").on("click", ".edit-note", function(e) {
            var noteId = e.currentTarget.id;
            self.tableData.aaData.forEach(function(note) {
                if (note._id === noteId) {
                    app.graphNotesView.initNoteDialog(self, note);
                }
            });
        });
        $(window).click(function() {
            $(".notes-manage-options-item").find(".edit").next(".edit-menu").fadeOut();
        });
        CountlyHelpers.initializeSelect();
        $(".segmentation-option").off("click").on("click", function() {
            var value = $(this).data("value");
            self.filter_type = value;
            if (value === "all") {
                delete self.filter_type;
            }
            self.refresh();
        });
        app.localize();

    },
    refresh: function() {
        this.dtable.fnDraw(false);
        app.localize();
    },
});

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

        var tableData = countlyVersionHistoryManager.getData(true) || {fs: [], db: [], pkg: ""};

        //provide template data
        this.templateData = {
            "db-title": jQuery.i18n.map["version_history.page-title"] + " (DB)",
            "fs-title": jQuery.i18n.map["version_history.page-title"] + " (FS)",
            "package-version": jQuery.i18n.map["version_history.package-version"] + ": " + tableData.pkg
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
app.graphNotesView = new GraphNotesView();
app.DownloadView = new DownloadView();
app.VersionHistoryView = new VersionHistoryView();

app.route("/analytics/graph-notes", "graphNotes", function() {
    this.renderWhenReady(this.graphNotesView);
});


if (countlyAuth.validateGlobalAdmin()) {
    app.route("/manage/users", "manageUsers", function() {
        this.manageUsersView._id = null;
        this.renderWhenReady(this.manageUsersView);
    });

    app.route('/manage/users/:id', 'manageUsersId', function(id) {
        this.manageUsersView._id = id;
        this.renderWhenReady(this.manageUsersView);
    });
}

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