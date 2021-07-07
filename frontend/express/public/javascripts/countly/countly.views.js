/* global countlyView, Dropzone, groupsModel, countlySession, tippy, countlyAuth, countlyTotalUsers, countlyCommon, app, CountlyHelpers, countlyGlobal, store, Handlebars, countlyCity, countlyLocation, countlyDevice, countlyDeviceDetails, countlyAppVersion, countlyCarrier, _, countlyEvent, countlyTaskManager, countlyVersionHistoryManager, countlyTokenManager, UserView, CountriesView, ManageAppsView, ManageUsersView, EventsView, DashboardView, EventsBlueprintView, EventsOverviewView, LongTaskView, DownloadView, TokenManagerView, VersionHistoryView, GraphNotesView, Backbone, pathsToSectionNames, moment, sdks, jstz, getUrls, T, jQuery, $,JobsView, JobDetailView*/


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

window.UserView = countlyView.extend({
    beforeRender: function() {
        return $.when(countlySession.initialize(), countlyTotalUsers.initialize("users")).then(function() {});
    },
    renderCommon: function(isRefresh) {
        var sessionData = countlySession.getSessionData(),
            userDP = countlySession.getUserDP();

        this.templateData = {
            "page-title": jQuery.i18n.map["users.title"],
            "logo-class": "users",
            "big-numbers": {
                "count": 3,
                "items": [
                    {
                        "title": jQuery.i18n.map["common.total-users"],
                        "total": sessionData.usage["total-users"].total,
                        "trend": sessionData.usage["total-users"].trend,
                        "help": "users.total-users"
                    },
                    {
                        "title": jQuery.i18n.map["common.new-users"],
                        "total": sessionData.usage["new-users"].total,
                        "trend": sessionData.usage["new-users"].trend,
                        "help": "users.new-users"
                    },
                    {
                        "title": jQuery.i18n.map["common.returning-users"],
                        "total": sessionData.usage["returning-users"].total,
                        "trend": sessionData.usage["returning-users"].trend,
                        "help": "users.returning-users"
                    }
                ]
            }
        };

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            countlyCommon.drawTimeGraph(userDP.chartDP, "#dashboard-graph");
            CountlyHelpers.applyColors();

            this.dtable = $(".d-table").dataTable(
                $.extend({}, $.fn.dataTable.defaults, {
                    aaData: userDP.chartData,
                    aoColumns: [
                        {
                            mData: "date",
                            sType: "customDate",
                            sTitle: jQuery.i18n.map["common.date"]
                        },
                        {
                            mData: "u",
                            sType: "formatted-num",
                            mRender: function(d) {
                                return countlyCommon.formatNumber(
                                    d
                                );
                            },
                            sTitle:
                                jQuery.i18n.map[
                                    "common.table.total-users"
                                ]
                        },
                        {
                            mData: "n",
                            sType: "formatted-num",
                            mRender: function(d) {
                                return countlyCommon.formatNumber(
                                    d
                                );
                            },
                            sTitle:
                                jQuery.i18n.map[
                                    "common.table.new-users"
                                ]
                        },
                        {
                            mData: "returning",
                            sType: "formatted-num",
                            mRender: function(d) {
                                return countlyCommon.formatNumber(
                                    d
                                );
                            },
                            sTitle:
                                jQuery.i18n.map[
                                    "common.table.returning-users"
                                ]
                        }
                    ]
                })
            );

            $(".d-table").stickyTableHeaders();

        }
    },
    refresh: function() {
        var self = this;
        $.when(this.beforeRender()).then(function() {
            if (app.activeView !== self) {
                return false;
            }
            self.renderCommon(true);
            var newPage = $("<div>" + self.template(self.templateData) + "</div>");

            $(self.el).find("#big-numbers-container").replaceWith(newPage.find("#big-numbers-container"));

            var userDP = countlySession.getUserDP();
            countlyCommon.drawTimeGraph(userDP.chartDP, "#dashboard-graph");
            CountlyHelpers.refreshTable(self.dtable, userDP.chartData);
            app.localize();
        });
    }
});

window.CountriesView = countlyView.extend({
    cityView: (store.get("countly_location_city")) ? store.get("countly_active_app") : false,
    initialize: function() {
        this.curMap = "map-list-sessions";
        this.template = Handlebars.compile($("#template-analytics-countries").html());
    },
    beforeRender: function() {
        this.maps = {
            "map-list-sessions": {id: 'total', label: jQuery.i18n.map["sidebar.analytics.sessions"], type: 'number', metric: "t"},
            "map-list-users": {id: 'total', label: jQuery.i18n.map["sidebar.analytics.users"], type: 'number', metric: "u"},
            "map-list-new": {id: 'total', label: jQuery.i18n.map["common.table.new-users"], type: 'number', metric: "n"}
        };
        return $.when(countlySession.initialize(), countlyCity.initialize(), countlyTotalUsers.initialize("countries"), countlyTotalUsers.initialize("cities"), countlyTotalUsers.initialize("users")).then(function() {});
    },
    drawTable: function() {
        var tableFirstColTitle = (this.cityView) ? jQuery.i18n.map["countries.table.city"] : jQuery.i18n.map["countries.table.country"],
            locationData,
            firstCollData = "country_flag";

        if (this.cityView) {
            locationData = countlyCity.getLocationData();
            firstCollData = "cities";
        }
        else {
            locationData = countlyLocation.getLocationData();
        }

        this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
            "aaData": locationData,
            "aoColumns": [
                { "mData": firstCollData, "sTitle": tableFirstColTitle },
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
    },
    renderCommon: function(isRefresh) {
        var sessionData = countlySession.getSessionData();

        this.templateData = {
            "page-title": jQuery.i18n.map["countries.title"],
            "logo-class": "countries",
            "big-numbers": {
                "count": 3,
                "items": [
                    {
                        "title": jQuery.i18n.map["common.total-sessions"],
                        "total": sessionData.usage["total-sessions"].total,
                        "trend": sessionData.usage["total-sessions"].trend,
                        "help": "countries.total-sessions",
                        "radio-button-id": "map-list-sessions",
                        "radio-button-class": (this.curMap === "map-list-sessions") ? "selected" : ""
                    },
                    {
                        "title": jQuery.i18n.map["common.total-users"],
                        "total": sessionData.usage["total-users"].total,
                        "trend": sessionData.usage["total-users"].trend,
                        "help": "countries.total-users",
                        "radio-button-id": "map-list-users",
                        "radio-button-class": (this.curMap === "map-list-users") ? "selected" : ""
                    },
                    {
                        "title": jQuery.i18n.map["common.new-users"],
                        "total": sessionData.usage["new-users"].total,
                        "trend": sessionData.usage["new-users"].trend,
                        "help": "countries.new-users",
                        "radio-button-id": "map-list-new",
                        "radio-button-class": (this.curMap === "map-list-new") ? "selected" : ""
                    }
                ]
            },
            "chart-helper": "countries.chart",
            "table-helper": "countries.table"
        };

        var self = this;
        $(document).unbind('selectMapCountry').bind('selectMapCountry', function() {
            $("#country-toggle").trigger("click");
        });

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));

            if (countlyGlobal.config.use_google) {
                if (this.cityView) {
                    countlyCity.drawGeoChart({height: 450, metric: self.maps[self.curMap]});
                }
                else {
                    countlyLocation.drawGeoChart({height: 450, metric: self.maps[self.curMap]});
                }

                $(".widget").removeClass("google-disabled");
            }
            else {
                $(".widget").addClass("google-disabled");
            }

            this.drawTable();

            if (countlyCommon.CITY_DATA === false) {
                store.set("countly_location_city", false);
            }

            $("#country-toggle").on('click', function() {
                if ($(this).hasClass("country_selected")) {
                    self.cityView = false;
                    if (countlyGlobal.config.use_google) {
                        countlyLocation.drawGeoChart({height: 450, metric: self.maps[self.curMap]});
                    }
                    $(this).removeClass("country_selected");
                    self.refresh(true);
                    store.set("countly_location_city", false);
                    if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].country) {
                        $(this).text(jQuery.i18n.map["common.show"] + " " + countlyLocation.getCountryName(countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].country));
                    }
                    else {
                        $(this).text(jQuery.i18n.map["common.show"] + " " + jQuery.i18n.map["countries.table.country"]);
                    }
                }
                else {
                    self.cityView = true;
                    if (countlyGlobal.config.use_google) {
                        countlyCity.drawGeoChart({height: 450, metric: self.maps[self.curMap]});
                    }
                    $(this).addClass("country_selected");
                    self.refresh(true);
                    store.set("countly_location_city", true);
                    $(this).html('<i class="fa fa-chevron-left" aria-hidden="true"></i>' + jQuery.i18n.map["countries.back-to-list"]);
                }
            });

            if (self.cityView) {
                $("#country-toggle").html('<i class="fa fa-chevron-left" aria-hidden="true"></i>' + jQuery.i18n.map["countries.back-to-list"]).addClass("country_selected");
            }
            else {
                if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].country) {
                    $("#country-toggle").text(jQuery.i18n.map["common.show"] + " " + countlyLocation.getCountryName(countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].country));
                }
                else {
                    $("#country-toggle").text(jQuery.i18n.map["common.show"] + " " + jQuery.i18n.map["countries.table.country"]);
                }
            }

            $(".geo-switch").on("click", ".radio", function() {
                $(".geo-switch").find(".radio").removeClass("selected");
                $(this).addClass("selected");
                self.curMap = $(this).data("id");

                if (self.cityView) {
                    countlyCity.refreshGeoChart(self.maps[self.curMap]);
                }
                else {
                    countlyLocation.refreshGeoChart(self.maps[self.curMap]);
                }
            });
        }

        CountlyHelpers.applyColors();
    },
    refresh: function(isToggle) {
        var self = this;
        $.when(this.beforeRender()).then(function() {
            if (app.activeView !== self) {
                return false;
            }
            self.renderCommon(true);
            var newPage = $("<div>" + self.template(self.templateData) + "</div>");

            $(self.el).find("#big-numbers-container").replaceWith(newPage.find("#big-numbers-container"));

            if (isToggle) {
                self.drawTable();
            }
            else {
                var locationData;
                if (self.cityView) {
                    locationData = countlyCity.getLocationData();
                    if (countlyGlobal.config.use_google) {
                        countlyCity.refreshGeoChart(self.maps[self.curMap]);
                    }
                }
                else {
                    locationData = countlyLocation.getLocationData();
                    if (countlyGlobal.config.use_google) {
                        countlyLocation.refreshGeoChart(self.maps[self.curMap]);
                    }
                }

                CountlyHelpers.refreshTable(self.dtable, locationData);
            }

            app.localize();
        });
    }
});


window.ManageAppsView = countlyView.extend({
    featureName: 'global_applications',
    initialize: function() {
        this.template = Handlebars.compile($("#template-management-applications").html());
        this.templatePlugins = Handlebars.compile($("#template-management-plugins").html());
        this.appManagementViews = [];
    },
    beforeRender: function() {
        if (this.appManagementViews.length === 0) {
            var self = this;
            Object.keys(app.appManagementViews).forEach(function(plugin) {
                var Clas = app.appManagementViews[plugin].view,
                    view = new Clas();
                view.setAppId(countlyCommon.ACTIVE_APP_ID);
                self.appManagementViews.push(view);
            });
        }
        return $.when();
    },
    getAppCategories: function() {
        return { 1: jQuery.i18n.map["application-category.books"], 2: jQuery.i18n.map["application-category.business"], 3: jQuery.i18n.map["application-category.education"], 4: jQuery.i18n.map["application-category.entertainment"], 5: jQuery.i18n.map["application-category.finance"], 6: jQuery.i18n.map["application-category.games"], 7: jQuery.i18n.map["application-category.health-fitness"], 8: jQuery.i18n.map["application-category.lifestyle"], 9: jQuery.i18n.map["application-category.medical"], 10: jQuery.i18n.map["application-category.music"], 11: jQuery.i18n.map["application-category.navigation"], 12: jQuery.i18n.map["application-category.news"], 13: jQuery.i18n.map["application-category.photography"], 14: jQuery.i18n.map["application-category.productivity"], 15: jQuery.i18n.map["application-category.reference"], 16: jQuery.i18n.map["application-category.social-networking"], 17: jQuery.i18n.map["application-category.sports"], 18: jQuery.i18n.map["application-category.travel"], 19: jQuery.i18n.map["application-category.utilities"], 20: jQuery.i18n.map["application-category.weather"]};
    },
    getTimeZones: function() {
        return countlyGlobal.timezones;
    },
    renderCommon: function() {
        var appTypes = {}, self = this;
        var adminApps = countlyAuth.getAdminApps();
        var userApps = countlyAuth.getUserApps();
        var oAdminApps = [];
        for (var k = 0; j < userApps.length; k++) {
            oAdminApps.push(countlyGlobal.apps[userApps[k]]);
        }
        var j = 0;
        for (j in app.appTypes) {
            appTypes[j] = jQuery.i18n.map["management-applications.types." + j] || j;
        }
        $(this.el).html(this.template({
            admin_apps: oAdminApps,
            app_types: appTypes
        }));

        var appCategories = this.getAppCategories();
        var timezones = this.getTimeZones();

        var appId = countlyCommon.ACTIVE_APP_ID;
        if (!adminApps[appId]) {
            for (j in adminApps) {
                appId = adminApps[j];
                break;
            }
        }

        $("#view-app .cly-button-menu .item").on("selectstart", function(event) {
            event.preventDefault();
        });

        $("#app-management-bar .app-container").removeClass("active");
        $("#app-management-bar .app-container[data-id='" + appId + "']").addClass("active");

        $(".select-app-types").on("click", ".item", function() {
            app.onAppManagementSwitch($("#app-edit-id").val(), $(this).data("value"));
            if ($(this).parents('#add-new-app').length) {
                app.onAppAddTypeSwitch($(this).data('value'));
            }
        });

        for (j in app.appSettings) {
            if (app.appSettings[j] && app.appSettings[j].toInject) {
                app.appSettings[j].toInject();
            }
        }

        $("#view-app .widget-header .lock-status > span").tooltipster({
            theme: 'tooltipster-borderless',
            contentCloning: true,
            interactive: true,
            trigger: 'hover',
            side: 'right',
            zIndex: 2,
            maxWidth: 250,
            content: $.i18n.map["management-applications.application-lock-tooltip"]
        });

        var menuBlurTimestamp = 0;
        $("#view-app .widget-header a.cly-button-menu-trigger").off("click").on("click", function(event) {
            var $menu = $("#view-app .app-management-menu");

            if (event.timeStamp - menuBlurTimestamp < 100) {
                return;
            }

            $menu.toggleClass("active");
            if ($menu.hasClass("active")) {
                $menu.focus();
                $("#view-app .app-management-clear-menu").removeClass("active");
            }
        });
        $("#view-app .app-management-menu").off("blur").on("blur", function(event) {
            menuBlurTimestamp = event.timeStamp;
            $(this).removeClass("active");
        });

        /**
         * initial screen prepare method
         * add first app elements and hide other things
         */
        function firstApp() {
            store.set('first_app', true);
            // hide sidebar & app navigation and app management bar
            // make unclickable countly logo
            // re-align elements
            $('#top-bar > div.logo-container > a').attr('href', 'javascript:void(0)');
            $("#sidebar").addClass("hidden");
            $("#app-navigation").css({'opacity': '0', 'pointer-events': 'none'});
            $("#hide-sidebar-button").hide();
            $('#app-management-bar').hide();
            $('#dashboard-selection').css({'opacity': '0', 'pointer-events': 'none'});
            $('#content-container').css({'margin-left': '0px', 'transition': 'none'});
            // create first app screen elements
            $('#content').prepend('<div id="first-app-welcome"></div>');
            $('#first-app-welcome').append('<h1 id="first-app-welcome-header">' + jQuery.i18n.map['management-applications.create-first-app-title'] + '</h1>');
            $('#first-app-welcome').append('<p id="first-app-description">' + jQuery.i18n.map['management-applications.create-first-app-description'] + '</p>');
            $('#content').css({"width": "1000px", "height": "800px", "margin-left": ((($(document).width() - 1000) / 2) - 25) + "px", "margin-top": "5%"});
            $('#content > div.widget').css({"float": "left", "width": "42.5%", "margin-left": "12.5%"});
            $('#first-app-welcome').css({"float": "left", "width": "40%", "margin-right": "5%"});
            $('#add-new-app').hide();
            // make visible first app form
            $('#add-first-app').css({'display': 'block'});

            var userTimezone = jstz.determine().name();
            // Set timezone selection defaults to user's current timezone
            for (var countryCode in timezones) {
                for (var i = 0; i < timezones[countryCode].z.length;i++) {
                    for (var countryTimezone in timezones[countryCode].z[i]) {
                        if (timezones[countryCode].z[i][countryTimezone] === userTimezone) {
                            initCountrySelect("#first-app-add-timezone", countryCode, countryTimezone, userTimezone);
                            break;
                        }
                    }
                }
            }
        }

        /*
        * behave like responsive
        * change on window resize
        */
        $(window).resize(function() {
            if (store.get('first_app') && (jQuery.isEmptyObject(countlyGlobal.apps) || jQuery.isEmptyObject(countlyGlobal.admin_apps))) {
                $('#content').css({"width": "1000px", "height": "800px", "margin-left": ((($(document).width() - 1000) / 2) - 25) + "px", "margin-top": "5%"});
                $('#content > div.widget').css({"float": "left", "width": "42.5%", "margin-left": "12.5%"});
                $('#first-app-welcome').css({"float": "left", "width": "40%", "margin-right": "5%"});
            }
        });

        /**
         * make things normal after first app create process
         */
        function afterFirstApp() {
            $('#content').css({"width": "", "height": "", "margin-left": "", "margin-top": ""});
            $("#sidebar").removeClass("hidden");
            $("#app-navigation").css({'opacity': '1', 'pointer-events': 'auto'});
            $('#dashboard-selection').css({'opacity': '1', 'pointer-events': 'auto'});
            $("#hide-sidebar-button").show();
            $('#app-management-bar').show();
            var widthOfSidebar = $('#sidebar').width();
            $('#content-container').css({'margin-left': widthOfSidebar + 'px'});
            $('#first-app-welcome').remove();
            $('#add-first-app').hide();
            $('#content > div.widget').css({'margin-left': '199px', 'margin-right': '0%', 'width': 'auto', 'float': 'none', 'margin-top': '0%'});
            $('#add-first-app').css({'display': 'none'});
            $('#top-bar > div.logo-container > a').attr('href', '/dashboard#/');
            store.set('first_app', false);
        }

        /** App management initialization function
         * @param {string} app_id - application id
         * @returns {boolean} false - if no apps
         */
        function initAppManagement(app_id) {
            var userApps_ = countlyAuth.getUserApps();

            if (userApps_.length === 0) {
                firstApp();
                $("body").off("click", "#save-first-app-add").on("click", "#save-first-app-add", function() {
                    saveApp();
                });
                return false;
            }
            else {
                $('#content').css({"width": "", "height": "", "margin-left": "", "margin-top": ""});
                store.set('first_app', false);
                hideAdd();

                if (self.appManagementViews.length === 0) {
                    Object.keys(app.appManagementViews).forEach(function(plugin) {
                        var Clas = app.appManagementViews[plugin].view,
                            view = new Clas();
                        view.setAppId(countlyCommon.ACTIVE_APP_ID);
                        self.appManagementViews.push(view);
                    });
                }

                $("body").off("click", "#save-app-add").on("click", "#save-app-add", function() {
                    saveApp();
                });
            }

            if ($("#new-install-overlay").is(":visible")) {
                $("#no-app-warning").hide();
                //$("#first-app-success").show();
                $("#new-install-overlay").fadeOut();
                countlyCommon.setActiveApp(app_id);
                $("#active-app-icon").css("background-image", "url('" + countlyGlobal.cdn + "appimages/" + app_id + ".png')");
                $("#active-app-name").text(countlyGlobal.apps[app_id].name);
                app.onAppSwitch(app_id, true);
                app.sidebar.init();
            }
            if (countlyGlobal.config && countlyGlobal.config.code && $("#code-countly").length) {
                $("#code-countly").show();
            }

            app.onAppManagementSwitch(app_id);

            $("#app-edit-id").val(app_id);
            $("#view-app").find(".widget-header .title").text(countlyGlobal.apps[app_id].name);
            $("#app-edit-name").find(".read span").text(countlyGlobal.apps[app_id].name);
            $("#app-edit-name").find(".edit input").val(countlyGlobal.apps[app_id].name);
            $("#app-edit-key").find(".read").text(countlyGlobal.apps[app_id].key);
            $("#app-edit-key").find(".edit input").val(countlyGlobal.apps[app_id].key);
            $("#app-edit-salt").find(".read").text(countlyGlobal.apps[app_id].checksum_salt || "");
            $("#app-edit-salt").find(".edit input").val(countlyGlobal.apps[app_id].checksum_salt || "");
            $("#view-app-id").text(app_id);
            $("#app-edit-type").find(".cly-select .text").text(appTypes[countlyGlobal.apps[app_id].type]);
            $("#app-edit-type").find(".cly-select .text").data("value", countlyGlobal.apps[app_id].type);
            $("#app-edit-type").find(".read").text(appTypes[countlyGlobal.apps[app_id].type]);
            $("#app-edit-category").find(".cly-select .text").text(appCategories[countlyGlobal.apps[app_id].category]);
            $("#app-edit-category").find(".cly-select .text").data("value", countlyGlobal.apps[app_id].category);
            $("#app-edit-timezone").find(".cly-select .text").data("value", countlyGlobal.apps[app_id].timezone);
            $("#app-edit-category").find(".read").text(appCategories[countlyGlobal.apps[app_id].category]);
            $("#app-edit-image").find(".read .logo").css({"background-image": 'url("' + countlyGlobal.cdn + 'appimages/' + app_id + '.png")'});

            var setAppLock = function(locked) {
                var args = {
                    app_id: app_id,
                    locked: locked
                };

                $.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.apps.w + '/update',
                    data: {
                        args: JSON.stringify(args),
                        app_id: args.app_id
                    },
                    dataType: "json",
                    success: function(data) {
                        for (var modAttr in data) {
                            if (countlyGlobal.apps[app_id]) {
                                countlyGlobal.apps[app_id][modAttr] = data[modAttr];
                            }
                            if (countlyGlobal.admin_apps[app_id]) {
                                countlyGlobal.admin_apps[app_id][modAttr] = data[modAttr];
                            }
                        }

                        initAppManagement(app_id);
                    },
                    error: function(xhr, status, error) {
                        CountlyHelpers.alert(error, "red");
                        initAppManagement(app_id);
                    }
                });
            };

            if (countlyGlobal.apps[app_id].locked) {
                $("#app-lock-button .lock-action").text($.i18n.map["common.unlock"]);
                $("#app-reset-button").addClass("inactive");
                $("#app-clear-button").addClass("inactive");
                $("#app-delete-button").addClass("inactive");
                $("#app-lock-button").off("click").click(function() {
                    setAppLock(false);
                });
                $("#view-app .widget-header .lock-status > i").attr("class", "ion-locked");
                $("#view-app .widget-header .lock-status > span").text($.i18n.map["common.locked"]);
            }
            else {
                $("#app-lock-button .lock-action").text($.i18n.map["common.lock"]);
                $("#app-reset-button").removeClass("inactive");
                $("#app-clear-button").removeClass("inactive");
                $("#app-delete-button").removeClass("inactive");
                $("#app-lock-button").off("click").click(function() {
                    setAppLock(true);
                });
                $("#view-app .widget-header .lock-status > i").attr("class", "ion-unlocked");
                $("#view-app .widget-header .lock-status > span").text($.i18n.map["common.unlocked"]);
            }

            $("#view-app .app-read-settings").each(function() {
                var id = $(this).data('id');
                if (app.appSettings[id] && app.appSettings[id].toDisplay) {
                    app.appSettings[id].toDisplay(app_id, this);
                }
                else if (typeof countlyGlobal.apps[app_id][id] !== "undefined") {
                    $(this).text(countlyGlobal.apps[app_id][id]);
                }
            });
            $("#view-app .app-write-settings").each(function() {
                var id = $(this).data('id');
                if (app.appSettings[id] && app.appSettings[id].toInput) {
                    app.appSettings[id].toInput(app_id, this);
                }
                else if (typeof countlyGlobal.apps[app_id][id] !== "undefined") {
                    $(this).val(countlyGlobal.apps[app_id][id]);
                }
            });
            var appTimezone = timezones[countlyGlobal.apps[app_id].country];

            if (appTimezone && appTimezone.z) {
                for (var i = 0; i < appTimezone.z.length; i++) {
                    for (var tzone in appTimezone.z[i]) {
                        if (appTimezone.z[i][tzone] === countlyGlobal.apps[app_id].timezone) {
                            var appEditTimezone = store.get('first_app') ? $("#first-app-edit-timezone").find(".read") : $("#app-edit-timezone").find(".read"),
                                appCountryCode = countlyGlobal.apps[app_id].country;
                            appEditTimezone.find(".flag").css({"background-image": "url(" + countlyGlobal.cdn + "images/flags/" + appCountryCode.toLowerCase() + ".png)"});
                            appEditTimezone.find(".country").text(appTimezone.n);
                            appEditTimezone.find(".timezone").text(tzone);
                            store.get('first_app') ? initCountrySelect("#first-app-edit-timezone", appCountryCode, tzone, appTimezone.z[i][tzone]) : initCountrySelect("#app-edit-timezone", appCountryCode, tzone, appTimezone.z[i][tzone]);
                            break;
                        }
                    }
                }
            }

            self.el.find('.app-details-plugins').html(self.templatePlugins({
                plugins: Object.keys(app.appManagementViews).map(function(plugin, p) {
                    return {index: p, title: app.appManagementViews[plugin].title};
                })
            }));
            self.el.find('.app-details-plugins').off('remove').on('remove', function() {
                self.appManagementViews = [];
            });
            self.appManagementViews.forEach(function(view, z) {
                view.el = $(self.el.find('.app-details-plugins form')[z]);
                view.setAppId(app_id);
                $.when(view.beforeRender()).always(function() {
                    view.render(view);
                    if (!countlyAuth.validateUpdate('global_configurations')) {
                        $('.mgmt-plugins input').addClass('disabled');
                        $('.mgmt-plugins input').attr('disabled', 'disabled');
                        $('.mgmt-plugins .cly-select').addClass('disabled');
                        for (var selectizeIndex = 0; selectizeIndex < $('.mgmt-plugins .selectized').length; selectizeIndex++) {
                            $('.selectized')[selectizeIndex].selectize.disable();
                        }
                        $('.mgmt-plugins .on-off-switch').addClass('disabled');
                        $('.mgmt-plugins .on-off-switch input').attr('disabled', 'disabled');
                        $('.mgmt-plugins .icon-button').addClass('disabled');
                    }
                });
            });
            self.el.find('.app-details-plugins > div').accordion({active: false, collapsible: true, autoHeight: false, heightStyle: "content" });
            self.el.find('.app-details-plugins > div').off('accordionactivate').on('accordionactivate', function(event, ui) {
                var index = parseInt(ui.oldHeader.data('index'));
                if (self.appManagementViews[index]) {
                    self.appManagementViews[index].afterCollapse();
                }
            });
            self.el.find('.app-details-plugins > div').off('accordionbeforeactivate').on('accordionbeforeactivate', function(event, ui) {
                var index = parseInt(ui.newHeader.data('index'));
                if (self.appManagementViews[index]) {
                    self.appManagementViews[index].beforeExpand();
                }
            });
            /*
                Accordion needs overflow auto during animation in order to keep contents intact.
                We are adding overflow-visible class with a delay so that the dropdown elements
                can overflow outside of the container.
             */
            self.el.find(".mgmt-plugins").on("click", ".ui-accordion-header", function() {
                self.el.find(".mgmt-plugins .ui-accordion-content").removeClass("overflow-visible");

                var accordionContent = $(this).next(".ui-accordion-content");

                setTimeout(function() {
                    if (accordionContent.hasClass("ui-accordion-content-active")) {
                        accordionContent.addClass("overflow-visible");
                    }
                    else {
                        accordionContent.removeClass("overflow-visible");
                    }
                }, 400);
            });
            /** function creates users manage links
             * @param {array} users -  list of users
             * @returns {string} - html string
             */
            function joinUsers(users) {
                var ret = "";
                if (users && users.length) {
                    for (var m = 0; m < users.length; m++) {
                        ret += "<a href='#/manage/users/" + users[m]._id + "' class='table-link-user green'>";
                        if (users[m].full_name && users[m].full_name !== "") {
                            ret += users[m].full_name;
                        }
                        else if (users[m].username && users[m].username !== "") {
                            ret += users[m].username;
                        }
                        else {
                            ret += users[m]._id;
                        }
                        ret += "</a>";
                        ret += ", ";
                    }
                    ret = ret.substring(0, ret.length - 2);
                }
                return ret;
            }
            $("#app_details").off("click").on("click", function() {
                var dialog = CountlyHelpers.loading(jQuery.i18n.map["common.loading"]);
                $.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.apps.r + '/details',
                    data: {
                        app_id: app_id
                    },
                    dataType: "json",
                    success: function(result) {
                        dialog.remove();
                        if (result && result.app) {
                            var table = "<div class='title'>" + jQuery.i18n.map["management-applications.app-details"] + "</div><table class='events-table d-table' cellpadding='0' cellspacing='0'>";
                            table += "<colgroup><col width='200px'><col width='155px'><col width='100%'></colgroup>";
                            //app creator
                            table += "<tr><td>" + jQuery.i18n.map["management-applications.app-creator"] + "</td><td class='details-value' colspan='2'>" + ((result.app.owner === "" || result.app.owner_id === "") ? jQuery.i18n.map["common.unknown"] : "<a href='#/manage/users/" + result.app.owner_id + "' class='table-link-user green'>" + result.app.owner + "</a>") + "</td></tr>";
                            table += "<tr><td>" + jQuery.i18n.map["management-applications.app-created-at"] + "</td><td class='details-value' colspan='2'>" + ((parseInt(result.app.created_at) === 0) ? jQuery.i18n.map["common.unknown"] : countlyCommon.formatTimeAgo(result.app.created_at)) + "</td></tr>";
                            table += "<tr><td>" + jQuery.i18n.map["management-applications.app-edited-at"] + "</td><td class='details-value' colspan='2'>" + ((parseInt(result.app.edited_at) === 0) ? jQuery.i18n.map["common.unknown"] : countlyCommon.formatTimeAgo(result.app.edited_at)) + "</td></tr>";

                            var ts = result.app.last_data;
                            if (Math.round(ts).toString().length === 10) {
                                ts *= 1000;
                            }

                            table += "<tr><td>" + jQuery.i18n.map["management-applications.app-last-data"] + "</td><td class='details-value' colspan='2'>" + ((parseInt(result.app.last_data) === 0) ? jQuery.i18n.map["common.unknown"] : moment(new Date(ts)).format("ddd, D MMM YYYY")) + "</td></tr>";
                            table += "<tr><td rowspan='3'>" + jQuery.i18n.map["management-applications.app-users"] + "</td>";
                            table += "<td class='second-header'>" + jQuery.i18n.map["management-applications.global_admins"] + " (" + result.global_admin.length + ")</td><td class='details-value'>" + joinUsers(result.global_admin) + "</td></tr>";
                            table += "<tr><td class='second-header'>" + jQuery.i18n.map["management-applications.admins"] + " (" + result.admin.length + ")</td><td class='details-value'>" + joinUsers(result.admin) + "</td></tr>";
                            table += "<tr><td class='second-header'>" + jQuery.i18n.map["management-applications.users"] + " (" + result.user.length + ")</td><td class='details-value'>" + joinUsers(result.user) + "</td></tr>";
                            CountlyHelpers.popup(table + "</table><div class='buttons'><div class='icon-button green btn-close'>" + jQuery.i18n.map["common.close"] + "</div></div>", "app_details_table", true);
                            $(".btn-close").off("click").on("click", function() {
                                $("#overlay").trigger('click');
                            });
                        }
                        else {
                            CountlyHelpers.alert(jQuery.i18n.map["management-applications.application-no-details"], "red");
                        }
                    },
                    error: function() {
                        dialog.remove();
                        CountlyHelpers.alert(jQuery.i18n.map["management-applications.application-no-details"], "red");
                    }
                });
            });
            app.localize($("#content"));

            var hasDeleteRight = countlyAuth.validateDelete(self.featureName, countlyGlobal.member, app_id);
            var hasUpdateRight = countlyAuth.validateUpdate(self.featureName, countlyGlobal.member, app_id);

            if (hasDeleteRight) {
                $("#app-delete-button").show();
                $('#app-clear-button').show();
                $('#app-reset-button').show();
            }
            else {
                $("#app-delete-button").hide();
                $('#app-clear-button').hide();
                $('#app-reset-button').hide();
            }

            if (hasUpdateRight) {
                $("#app-edit-button").show();
                $('#app-lock-button').show();
            }
            else {
                $("#app-edit-button").hide();
                $('#app-lock-button').hide();
            }

            if (!hasDeleteRight && !hasUpdateRight) {
                $('#view-app .cly-button-menu-trigger').hide();
            }

        }
        /** initializes country select
         * @param {object} parent - select parent element
         * @param {string} countryCode - country code
         * @param {string} timezoneText - timezone text
         * @param {string} timezone - timezone val
         */
        function initCountrySelect(parent, countryCode, timezoneText, timezone) {
            $(parent + " #timezone-select").hide();
            $(parent + " #selected").hide();
            $(parent + " #timezone-items").html("");
            $(parent + " #country-items").html("");

            var countrySelect = $(parent + " #country-items");
            var timezoneSelect = $(parent + " #timezone-items");

            var countryTimezones = "";
            for (var key in timezones) {
                countrySelect.append("<div data-value='" + key + "' class='item'><div class='flag " + key.toLowerCase() + "' style='background-image:url(" + countlyGlobal.cdn + "images/flags/" + key.toLowerCase() + ".png)'></div>" + timezones[key].n + "</div>");
            }

            if (countryCode && timezoneText && timezone) {
                var country = timezones[countryCode];
                var prop = "";
                if (country.z.length === 1) {
                    for (prop in country.z[0]) {
                        $(parent + " #selected").show();
                        $(parent + " #selected").text(prop);
                        store.get('first_app') ? $(parent + " #first-app-timezone").val(country.z[0][prop]) : $(parent + " #app-timezone").val(country.z[0][prop]);
                        store.get('first_app') ? $(parent + " #first-app-country").val(countryCode) : $(parent + " #app-country").val(countryCode);
                        $(parent + " #country-select .text").html("<div class='flag " + countryCode.toLowerCase() + "' style='background-image:url(" + countlyGlobal.cdn + "images/flags/" + countryCode.toLowerCase() + ".png)'></div>" + country.n);
                    }
                }
                else {
                    countryTimezones = country.z;

                    for (var z = 0; z < countryTimezones.length; z++) {
                        for (prop in countryTimezones[z]) {
                            timezoneSelect.append("<div data-value='" + countryTimezones[z][prop] + "' class='item'>" + prop + "</div>");
                        }
                    }

                    store.get('first_app') ? $(parent + " #first-app-timezone").val(timezone) : $(parent + " #app-timezone").val(timezone);
                    store.get('first_app') ? $(parent + " #first-app-country").val(countryCode) : $(parent + " #app-country").val(countryCode);
                    $(parent + " #country-select .text").html("<div class='flag " + countryCode.toLowerCase() + "' style='background-image:url(" + countlyGlobal.cdn + "images/flags/" + countryCode.toLowerCase() + ".png)'></div>" + country.n);
                    $(parent + " #timezone-select .text").text(timezoneText);
                    $(parent + " #timezone-select").show();
                }

                $(parent + " .select-items .item").click(function() {
                    var selectedItem = $(this).parents(".cly-select").find(".text");
                    selectedItem.html($(this).html());
                    selectedItem.data("value", $(this).data("value"));
                });
                $(parent + " #timezone-items .item").click(function() {
                    store.get('first_app') ? $(parent + " #first-app-timezone").val($(this).data("value")) : $(parent + " #app-timezone").val($(this).data("value"));
                });
            }

            $(parent + " #country-items .item").click(function() {
                $(parent + " #selected").text("");
                $(parent + " #timezone-select").hide();
                timezoneSelect.html("");
                var attr = $(this).data("value");
                countryTimezones = timezones[attr].z;
                var prop2 = "";
                if (countryTimezones.length === 1) {
                    for (prop2 in timezones[attr].z[0]) {
                        $(parent + " #selected").show();
                        $(parent + " #selected").text(prop2);
                        store.get('first_app') ? $(parent + " #first-app-timezone").val(timezones[attr].z[0][prop2]) : $(parent + " #app-timezone").val(timezones[attr].z[0][prop2]);
                        store.get('first_app') ? $(parent + " #first-app-country").val(attr) : $(parent + " #app-country").val(attr);
                    }
                }
                else {

                    var firstTz = "";

                    for (var i = 0; i < timezones[attr].z.length; i++) {
                        for (prop2 in timezones[attr].z[i]) {
                            if (i === 0) {
                                $(parent + " #timezone-select").find(".text").text(prop2);
                                firstTz = timezones[attr].z[0][prop2];
                                store.get('first_app') ? $(parent + " #first-app-country").val(attr) : $(parent + " #app-country").val(attr);
                            }

                            timezoneSelect.append("<div data-value='" + timezones[attr].z[i][prop2] + "' class='item'>" + prop2 + "</div>");
                        }
                    }

                    $(parent + " #timezone-select").show();
                    store.get('first_app') ? $(parent + " #first-app-timezone").val(firstTz) : $(parent + " #app-timezone").val(firstTz);
                    $(parent + " .select-items .item").click(function() {
                        var selectedItem = $(this).parents(".cly-select").find(".text");
                        selectedItem.html($(this).html());
                        selectedItem.data("value", $(this).data("value"));
                    });
                    $(parent + " #timezone-items .item").click(function() {
                        store.get('first_app') ? $(parent + " #first-app-timezone").val($(this).data("value")) : $(parent + " #app-timezone").val($(this).data("value"));
                    });
                }
            });
        }
        /** function hides edit button */
        function hideEdit() {
            $(".edit").hide();
            $(".read").show();
            $(".table-edit").hide();
            $(".required").hide();
        }
        /** function resets add app form */
        function resetAdd() {
            $("#app-add-name").val("");
            $("#app-add-type").text(jQuery.i18n.map["management-applications.type.tip"]);
            $("#app-add-type").data("value", "");
            $("#app-add-category").text(jQuery.i18n.map["management-applications.category.tip"]);
            $("#app-add-category").data("value", "");
            $("#app-add-timezone #selected").text("");
            $("#app-add-timezone #selected").hide();
            $("#app-add-timezone .text").html(jQuery.i18n.map["management-applications.time-zone.tip"]);
            $("#app-add-timezone .text").data("value", "");
            $("#app-add-timezone #app-timezone").val("");
            $("#app-add-timezone #app-country").val("");
            $("#app-add-timezone #timezone-select").hide();
            $(".required").hide();
            if (countlyGlobal.config && countlyGlobal.config.code && $("#code-countly").length) {
                $("#code-countly").show();
            }
        }
        /** function shows add app form
         * @returns {boolean} false - if already visible
         */
        function showAdd() {
            if ($("#app-container-new").is(":visible")) {
                return false;
            }
            $(".app-container").removeClass("active");
            $("#first-app-success").hide();
            $("#code-countly").hide();
            hideEdit();
            var manageBarApp = $("#manage-new-app>div").clone();
            manageBarApp.attr("id", "app-container-new");
            manageBarApp.addClass("active");

            if (jQuery.isEmptyObject(countlyGlobal.apps)) {
                $("#cancel-app-add").hide();
                $("#manage-new-app").hide();
            }
            else {
                $("#cancel-app-add").show();
            }

            $("#app-management-bar .scrollable").append(manageBarApp);
            $("#add-new-app").show();
            $("#view-app").hide();

            var userTimezone = jstz.determine().name();

            // Set timezone selection defaults to user's current timezone
            for (var countryCode in timezones) {
                for (var i = 0; i < timezones[countryCode].z.length;i++) {
                    for (var countryTimezone in timezones[countryCode].z[i]) {
                        if (timezones[countryCode].z[i][countryTimezone] === userTimezone) {
                            initCountrySelect("#app-add-timezone", countryCode, countryTimezone, userTimezone);
                            break;
                        }
                    }
                }
            }
        }
        /** function hides add new app form and resets it */
        function hideAdd() {
            $("#app-container-new").remove();
            $("#add-new-app").hide();
            resetAdd();
            $("#view-app").show();
            if (countlyGlobal.config && countlyGlobal.config.code && $("#code-countly").length) {
                $("#code-countly").show();
            }
        }

        /**
        * prepare unauthorize screen for users
        * who don't have rights to access applications
        * */
        function prepareUnauthorizeScreen() {
            $('#top-bar > div.logo-container > a').attr('href', 'javascript:void(0)');
            $("#sidebar").addClass("hidden");
            $("#app-navigation").css({'opacity': '0', 'pointer-events': 'none'});
            $("#hide-sidebar-button").hide();
            $('#app-management-bar').hide();
            $('#dashboard-selection').css({'opacity': '0', 'pointer-events': 'none'});
            $('#content-container').css({'margin-left': '0px'});
            $('#content').html("<div class='manage-app-no-rights'><img src='images/dashboard/icon-no-rights.svg'><h1 class='manage-app-no-rights-title'>" + jQuery.i18n.map['management-applications.contact-an-admin'] + "</h1><p class='manage-app-no-rights-description'>" + jQuery.i18n.map['management-applications.dont-access'] + "</p></div>");
        }

        /**
        * save application
        * @returns {boolean} false - if button disabled
        * */
        function saveApp() {
            if ($(this).hasClass("disabled")) {
                return false;
            }

            var appName = store.get('first_app') ? $("#first-app-add-name").val() : $("#app-add-name").val(),
                type = store.get('first_app') ? $('#first-app-add-type').data('value') : $("#app-add-type").data("value") + "",
                category = store.get('first_app') ? $("#first-app-add-category").data("value") : $("#app-add-category").data("value") + "",
                timezone = store.get('first_app') ? $("#first-app-add-timezone #first-app-timezone").val() : $("#app-add-timezone #app-timezone").val(),
                country = store.get('first_app') ? $("#first-app-add-timezone #first-app-country").val() : $("#app-add-timezone #app-country").val();

            $(".required").fadeOut().remove();
            $(".required-first-app").fadeOut().remove();
            var reqSpan = store.get('first_app') ? $("<span>").addClass("required-first-app").text("*") : $("<span>").addClass("required").text("*");

            if (!appName) {
                store.get('first_app') ? $("#first-app-add-name").before(reqSpan.clone()) : $("#app-add-name").after(reqSpan.clone());
            }

            if (!type) {
                store.get('first_app') ? $("#select-app-type-label").before(reqSpan.clone()) : $("#app-add-type").parents(".cly-select").after(reqSpan.clone());
            }

            /*if (!category) {
                $("#app-add-category").parents(".cly-select").after(reqSpan.clone());
            }*/

            if (!timezone) {
                store.get('first_app') ? $("#first-app-add-timezone").before(reqSpan.clone()) : $("#app-add-timezone #app-timezone").after(reqSpan.clone());
            }

            if ($(".required-first-app").length) {
                $(".required-first-app").fadeIn();
                return false;
            }

            if ($(".required").length) {
                $(".required-first-app").fadeIn();
                return false;
            }

            var ext = store.get('first_app') ? $('#add-first-app-image-form').find("#first-app_add_image").val().split('.').pop().toLowerCase() : $('#add-app-image-form').find("#app_add_image").val().split('.').pop().toLowerCase();
            if (ext && $.inArray(ext, ['gif', 'png', 'jpg', 'jpeg']) === -1) {
                CountlyHelpers.alert(jQuery.i18n.map["management-applications.icon-error"], "red");
                return false;
            }

            $(this).addClass("disabled");

            var args = {
                name: appName,
                type: type,
                category: category,
                timezone: timezone,
                country: country
            };

            var appWriteSettings = store.get('first_app') ? $("#add-first-app .app-write-settings") : $("#add-new-app .app-write-settings");

            appWriteSettings.each(function() {
                var id = $(this).data('id');
                if (app.appSettings[id] && app.appSettings[id].toSave) {
                    app.appSettings[id].toSave(null, args, this);
                }
                else if (typeof args !== "undefined") {
                    args[id] = $(this).val();
                }
            });

            app.appObjectModificators.forEach(function(mode) {
                mode(args);
            });

            $.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.apps.w + '/create',
                data: {
                    args: JSON.stringify(args)
                },
                dataType: "json",
                success: function(data) {
                    var sidebarApp = $("#sidebar-new-app>div").clone();

                    countlyGlobal.apps[data._id] = data;
                    countlyGlobal.admin_apps[data._id] = data;
                    Backbone.history.appIds.push(data._id + "");

                    var newApp = $("#app-container-new");
                    newApp.data("id", data._id);
                    newApp.data("key", data.key);
                    newApp.find(".name").data("localize", "");
                    newApp.find(".name").text(data.name);
                    newApp.removeAttr("id");

                    if (!ext) {
                        afterFirstApp();
                        $("#save-first-app-add").removeClass("disabled");
                        sidebarApp.find(".name").text(data.name);
                        sidebarApp.data("id", data._id);
                        sidebarApp.data("key", data.key);
                        newApp.find(".logo").css({
                            "background-image": "url(appimages/" + data._id + ".png)"
                        });

                        $("#app-nav .apps-scrollable").append(sidebarApp);
                        initAppManagement(data._id);
                        return true;
                    }
                    var app_image_form = $('#add-app-image-form');
                    if (store.get('first_app')) {
                        app_image_form = $('#add-first-app-image-form');
                        app_image_form.find("#first-app_image_id").val(data._id);
                    }
                    else {
                        app_image_form.find("#app_add_image_id").val(data._id);
                    }
                    app_image_form.ajaxSubmit({
                        resetForm: true,
                        beforeSubmit: function(formData) {
                            formData.push({ name: '_csrf', value: countlyGlobal.csrf_token });
                        },
                        success: function(file) {
                            $("#save-app-add").removeClass("disabled");

                            if (!file) {
                                CountlyHelpers.alert(jQuery.i18n.map["management-applications.icon-error"], "red");
                            }
                            else {
                                newApp.find(".logo").css({
                                    "background-image": "url(" + file + ")"
                                });
                                sidebarApp.find(".logo").css({
                                    "background-image": "url(" + file + ")"
                                });
                            }

                            sidebarApp.find(".name").text(data.name);
                            sidebarApp.data("id", data._id);
                            sidebarApp.data("key", data.key);

                            $("#app-nav .apps-scrollable").append(sidebarApp);
                            initAppManagement(data._id);
                        }
                    });
                    afterFirstApp();
                }
            });
        }

        /** initializes countly code
         * @param {string} app_id  - app id
         * @param {string} server - server address
         */
        function initCountlyCode(app_id, server) {
            if (app_id && app_id !== "" && countlyGlobal.apps[app_id]) {
                $("#code-countly .sdks").empty();
                for (var sdkIndex in sdks) {
                    if (sdks[sdkIndex].integration) {
                        $("#code-countly .sdks").append("<a href='http://code.count.ly/integration-" + sdkIndex + ".html?server=" + server + "&app_key=" + countlyGlobal.apps[app_id].key + "' target='_blank'>" + sdks[sdkIndex].name.replace("SDK", "") + "</a>");
                    }
                }
            }
        }
        if (countlyGlobal.config && countlyGlobal.config.code && $("#code-countly").length) {
            $("#code-countly").show();
            var url = (location.protocol || "http:") + "//" + location.hostname + (location.port ? ":" + location.port : "") + "/" + countlyGlobal.path;

            $.getScript(url + "sdks.js", function(/*data, textStatus, jqxhr*/) {
                var server = (location.protocol || "http:") + "//" + location.hostname + (location.port ? ":" + location.port : "") + "/" + countlyGlobal.path;
                if (server.substr(server.length - 1) === '/') {
                    server = server.substr(0, server.length - 1);
                }
                if (typeof sdks !== "undefined" && server) {

                    initCountlyCode($("#app-edit-id").val(), server);
                    app.addAppManagementSwitchCallback(initCountlyCode);
                }
            });
        }

        if (!countlyGlobal.member.global_admin && $.isEmptyObject(countlyGlobal.apps) && $.isEmptyObject(countlyGlobal.admin_apps) && !countlyGlobal.config.autonomous) {
            prepareUnauthorizeScreen();
        }
        else {
            initAppManagement(appId);
        }
        store.get('first_app') ? initCountrySelect("#first-app-add-timezone") : initCountrySelect("#app-add-timezone");

        $("#app-clear-button").click(function() {
            if (!$(this).hasClass("inactive")) {
                $(".app-management-clear-menu").addClass("active");
                $(".app-management-clear-menu").focus();
                $(".app-management-menu").removeClass("active");
            }
        });

        $("#view-app .cly-button-menu .item:not(.back)").click(function(event) {
            if ($(this).hasClass("inactive")) {
                return;
            }

            if ($(this).attr("id") !== "app-clear-button") {
                $(".app-management-clear-menu").removeClass("active");
                $(".app-management-clear-menu").blur();
            }

            $(".app-management-menu").removeClass("active");
            $(".app-management-menu").blur();
            menuBlurTimestamp = event.timeStamp;
        });

        $(".app-management-clear-menu .item.back").click(function() {
            $(".app-management-clear-menu").removeClass("active");
            $(".app-management-menu").addClass("active");
            $(".app-management-menu").focus();
        });

        $(".app-management-clear-menu").on("blur", function() {
            $(".app-management-clear-menu").removeClass("active");
        });

        $("#view-app .cly-button-menu .clear-item").click(function() {
            var period;

            if ($(this).attr("id") === "app-reset-button") {
                if ($(this).hasClass("inactive")) {
                    return;
                }
                period = "reset";
            }
            else {
                period = $(this).attr("id").replace("clear-", "");
            }

            var helper_msg = jQuery.i18n.map["management-applications.clear-confirm-" + period] || jQuery.i18n.map["management-applications.clear-confirm-period"];
            var helper_title = jQuery.i18n.map["management-applications.clear-" + period + "-data"] || jQuery.i18n.map["management-applications.clear-all-data"];
            var image = "clear-" + period;

            if (period === "reset") {
                image = "reset-the-app";
            }
            if (period === "all") {
                image = "clear-all-app-data";
            }
            CountlyHelpers.confirm(helper_msg, "popStyleGreen", function(result) {
                if (!result) {
                    return true;
                }

                var appId2 = $("#app-edit-id").val();

                $.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.apps.w + '/reset',
                    data: {
                        args: JSON.stringify({
                            app_id: appId2,
                            period: period
                        }),
                        app_id: appId2
                    },
                    dataType: "json",
                    success: function(result1) {

                        if (!result1) {
                            CountlyHelpers.alert(jQuery.i18n.map["management-applications.clear-admin"], "red");
                            return false;
                        }
                        else {
                            $(document).trigger("/i/apps/reset", { app_id: appId2, period: period });

                            if (period === "all" || period === "reset") {
                                countlySession.reset();
                                countlyLocation.reset();
                                countlyCity.reset();
                                countlyDevice.reset();
                                countlyCarrier.reset();
                                countlyDeviceDetails.reset();
                                countlyAppVersion.reset();
                                countlyEvent.reset();
                            }
                            if (period === "reset") {
                                CountlyHelpers.alert(jQuery.i18n.map["management-applications.reset-success"], "black");
                            }
                            else {
                                CountlyHelpers.alert(jQuery.i18n.map["management-applications.clear-success"], "black");
                            }
                        }
                    }
                });
            }, [jQuery.i18n.map["common.no-clear"], jQuery.i18n.map["management-applications.yes-clear-app"]], {title: helper_title + "?", image: image});
        });

        $("#app-delete-button").click(function() {
            if (!$(this).hasClass("inactive")) {
                CountlyHelpers.confirm(jQuery.i18n.map["management-applications.delete-confirm"], "popStyleGreen", function(result) {

                    if (!result) {
                        return true;
                    }
                    var app_id = $("#app-edit-id").val();

                    $.ajax({
                        type: "GET",
                        url: countlyCommon.API_PARTS.apps.w + '/delete',
                        data: {
                            args: JSON.stringify({
                                app_id: app_id
                            }),
                            app_id: app_id
                        },
                        dataType: "json",
                        success: function() {
                            $(document).trigger("/i/apps/delete", { app_id: app_id });

                            delete countlyGlobal.apps[app_id];
                            delete countlyGlobal.admin_apps[app_id];
                            var index = Backbone.history.appIds.indexOf(app_id + "");
                            if (index > -1) {
                                Backbone.history.appIds.splice(index, 1);
                            }
                            var activeApp = $(".app-container").filter(function() {
                                return $(this).data("id") && $(this).data("id") === app_id;
                            });

                            var changeApp = (activeApp.prev().length) ? activeApp.prev() : activeApp.next();
                            initAppManagement(changeApp.data("id"));
                            activeApp.fadeOut("slow").remove();

                            if (_.isEmpty(countlyGlobal.apps)) {
                                $("#new-install-overlay").show();
                                $("#active-app-icon").css("background-image", "");
                                $("#active-app-name").text("");
                                $("body").off("click", "#save-first-app-add").on("click", "#save-first-app-add", function() {
                                    saveApp();
                                });
                            }
                            else if (countlyCommon.ACTIVE_APP_ID === app_id) {
                                countlyCommon.setActiveApp(changeApp.data("id"));
                                $("#active-app-icon").css("background-image", "url(appimages/" + changeApp.data("id") + ".png)");
                                $("#active-app-name").text(countlyGlobal.apps[changeApp.data("id")].name);
                            }
                        },
                        error: function(xhr) {
                            if (xhr.status === 403) {
                                CountlyHelpers.alert(jQuery.i18n.map["management-applications.app-locked"], "red");
                            }
                            else {
                                CountlyHelpers.alert(jQuery.i18n.map["management-applications.delete-admin"], "red");
                            }
                        }
                    });
                }, [jQuery.i18n.map["common.no-dont-delete"], jQuery.i18n.map["management-applications.yes-delete-app"]], {title: jQuery.i18n.map["management-applications.delete-an-app"] + "?", image: "delete-an-app"});
            }
        });

        $("#app-edit-button").click(function() {
            if ($(".table-edit").is(":visible")) {
                hideEdit();
            }
            else {
                $(".edit").show();
                $(".read").hide();
                $(".table-edit").show();
            }
        });

        $("#save-app-edit").click(function() {
            if ($(this).hasClass("disabled")) {
                return false;
            }

            var app_id = $("#app-edit-id").val(),
                appName = $("#app-edit-name .edit input").val(),
                current_app_key = $('#app_key_hidden').val(),
                app_key = $("#app-edit-key .edit input").val();

            $(".required").fadeOut().remove();
            var reqSpan = $("<span>").addClass("required").text("*");

            if (!appName) {
                $("#app-edit-name .edit input").after(reqSpan.clone());
            }

            if (!app_key) {
                $("#app-edit-key .edit input").after(reqSpan.clone());
            }

            if ($(".required").length) {
                $(".required").fadeIn();
                return false;
            }

            var ext = $('#add-edit-image-form').find("#app_edit_image").val().split('.').pop().toLowerCase();
            if (ext && $.inArray(ext, ['gif', 'png', 'jpg', 'jpeg']) === -1) {
                CountlyHelpers.alert(jQuery.i18n.map["management-applications.icon-error"], "red");
                return false;
            }

            $(this).addClass("disabled");

            var args = {
                app_id: app_id,
                name: appName,
                type: $("#app-edit-type .cly-select .text").data("value") + '',
                key: app_key,
                timezone: $("#app-edit-timezone #app-timezone").val(),
                country: $("#app-edit-timezone #app-country").val(),
                checksum_salt: $("#app-edit-salt .edit input").val()
            };

            var categoryValue = $("#app-edit-category .cly-select .text").data("value");
            if (categoryValue) {
                args.category = categoryValue + "";
            }

            $(".app-details .app-write-settings").each(function() {
                var id = $(this).data('id');
                if (app.appSettings[id] && app.appSettings[id].toSave) {
                    app.appSettings[id].toSave(app_id, args, this);
                }
                else if (typeof args !== "undefined") {
                    args[id] = $(this).val();
                }
            });

            app.appObjectModificators.forEach(function(mode) {
                mode(args);
            });

            var updateApp = function() {
                $.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.apps.w + '/update',
                    data: {
                        args: JSON.stringify(args),
                        app_id: args.app_id
                    },
                    dataType: "json",
                    success: function(data) {
                        for (var modAttr in data) {
                            if (countlyGlobal.apps[app_id]) {
                                countlyGlobal.apps[app_id][modAttr] = data[modAttr];
                            }
                            if (countlyGlobal.admin_apps[app_id]) {
                                countlyGlobal.admin_apps[app_id][modAttr] = data[modAttr];
                            }
                        }

                        if (!ext) {
                            $("#save-app-edit").removeClass("disabled");
                            initAppManagement(app_id);
                            hideEdit();
                            $(".app-container").filter(function() {
                                return $(this).data("id") && $(this).data("id") === app_id;
                            }).find(".name").text(appName);

                            var sidebarLogo = $("#active-app-icon").attr("style");
                            if (sidebarLogo.indexOf(app_id) !== -1) {
                                $("#active-app-name").text(appName);
                            }
                            return true;
                        }

                        $('#add-edit-image-form').find("#app_edit_image_id").val(app_id);
                        $('#add-edit-image-form').ajaxSubmit({
                            resetForm: true,
                            beforeSubmit: function(formData) {
                                formData.push({ name: '_csrf', value: countlyGlobal.csrf_token });
                            },
                            success: function(file) {
                                $("#save-app-edit").removeClass("disabled");
                                var updatedApp = $(".app-container").filter(function() {
                                    return $(this).data("id") && $(this).data("id") === app_id;
                                });

                                if (!file) {
                                    CountlyHelpers.alert(jQuery.i18n.map["management-applications.icon-error"], "red");
                                }
                                else {
                                    updatedApp.find(".logo").css({
                                        "background-image": "url(" + file + "?v" + (new Date().getTime()) + ")"
                                    });
                                    $("#active-app-icon").css("background-image", $("#active-app-icon").css("background-image").replace(")", "") + "?v" + (new Date().getTime()) + ")");
                                }

                                initAppManagement(app_id);
                                hideEdit();
                                updatedApp.find(".name").text(appName);
                                $("#app-edit-image").find(".logo").css({
                                    "background-image": "url(" + file + "?v" + (new Date().getTime()) + ")"
                                });
                            },
                            error: function(xhr, status, error) {
                                CountlyHelpers.alert(error, "red");
                                initAppManagement(app_id);
                                hideEdit();
                            }
                        });
                    },
                    error: function(xhr, status, error) {
                        CountlyHelpers.alert(error, "red");
                        initAppManagement(app_id);
                        hideEdit();
                    }
                });
            };

            if (current_app_key !== app_key) {
                var warningText = jQuery.i18n.map["management-applications.app-key-change-warning"];
                if (countlyGlobal.plugins.indexOf("drill") > -1) {
                    warningText = jQuery.i18n.map["management-applications.app-key-change-warning-EE"];
                }
                CountlyHelpers.confirm(warningText, "popStyleGreen popStyleGreenWide", function(result) {
                    if (result) {
                        updateApp();
                    }
                    else {
                        $("#save-app-edit").removeClass("disabled");
                    }
                }, [jQuery.i18n.map["common.no-dont-change"], jQuery.i18n.map["management-applications.app-key-change-warning-confirm"]], {title: jQuery.i18n.map["management-applications.app-key-change-warning-title"], image: "change-the-app-key"});
            }
            else {
                updateApp();
            }
        });

        $("#cancel-app-edit").click(function() {
            hideEdit();
            var appId2 = $("#app-edit-id").val();
            initAppManagement(appId2);
        });

        $(document).on("click", "#management-app-container .app-container:not(#app-container-new)", function() {
            var appId2 = $(this).data("id");
            hideEdit();
            $(".app-container").removeClass("active");
            $(this).addClass("active");
            initAppManagement(appId2);
        });

        $("#add-app-button").click(function() {
            showAdd();
        });

        $("#cancel-app-add").click(function() {
            $("#app-container-new").remove();
            $("#add-new-app").hide();
            $("#view-app").show();
            $(".new-app-name").text(jQuery.i18n.map["management-applications.my-new-app"]);
            resetAdd();
        });

        $("#app-add-name").keyup(function() {
            var newAppName = $(this).val();
            $("#app-container-new .name").text(newAppName);
            $(".new-app-name").text(newAppName);
        });
    }
});

window.ManageUsersView = countlyView.extend({
    template: null,
    dropZone: null,
    /*
        Listen for;
            user-mgmt.user-created : On new user created. Param : new user form model.
            user-mgmt.user-updated : On user updated. Param: user form model.
            user-mgmt.user-deleted : On user deleted. Param: userid
            user-mgmt.user-selected : On user selected. Param : user.
            user-mgmt.new-user-button-clicked : On new user button clicked.

            Ex:
                $(app.manageUsersView).on('user-mgmt.user-selected', function(e, user) { console.log(user) });

        Triggers for;
            user-mgmt.render: To render usertable from outside.

            Ex:
                $(app.manageUsersView).trigger('user-mgmt.render');
    */
    featureName: 'global_users',
    memberPermission: {},
    permissionSets: [],
    memberModel: {},
    adminApps: [],
    userApps: [[]],
    accessibleApps: [],
    permissionSetCount: 1,
    userAppSelectors: [],
    drawerMode: 'c',
    selectedMemberId: '',
    odd: true,
    appOptions: [],
    // TODO: don't rely plugins for features. change this section
    features: [],
    saveUser: function() {
        var self = this;

        var isEditMode = $('.cly-drawer').hasClass("editing");
        var isFallbackMode = $('.fallback').length > 0;
        var filename = "";

        //first we assume that we we are adding a new file
        if (!isFallbackMode && self.dropZone && self.dropZone.files) {
            //if dropzone is used and there is no fallback

            if (self.dropZone.files.length > 0) {
                //if a file was added, get it's filename
                filename = self.dropZone.files[self.dropZone.files.length - 1].name;
            }
        }
        else {
            //dropzone not available, using fallback
            var splitPath = $("#member-image-file").val().split('\\');
            filename = splitPath[splitPath.length - 1];
        }

        if (filename.length === 0 && isEditMode) {
            //if no file was added and we are in edit mode, check for the previous file
            //previous file has to be checked in case platform was changed

            var lineWithFilename = "";
            if (!isFallbackMode) {
                lineWithFilename = $(".dz-message .tline")[0].innerHTML;
            }
            else {
                lineWithFilename = $(".fallback .tline")[0].innerHTML;
            }
            var partArray = lineWithFilename.split(" ");
            filename = partArray[partArray.length - 1];
        }

        //get the extension from the found file
        var extension = filename.substring(filename.lastIndexOf("."), filename.length);

        if (extension !== ".jpeg" && extension !== ".png" && extension !== ".jpg") {
            CountlyHelpers.notify({
                title: jQuery.i18n.map["crash_symbolication.form-error.symbol-file.android.title"],
                message: jQuery.i18n.map["crash_symbolication.form-error.symbol-file.android.msg"],
                type: "error"
            });
            return;
        }

        $('.left-area').append('user creation in progress...');
        $("#create-user-button").addClass("disabled");
    },
    renderPermissionsTable: function(index) {
        if (!index) {
            index = 0;
        }
        var self = this;

        var types = ['create', 'read', 'update', 'delete'];

        var permissionTable = '<div class="user-access access-area" id="user-access-' + index + '">';
        permissionTable += '<div class="header">';
        permissionTable += '<div class="section-title">' + $.i18n.map['management-users.grant-user-access-to-apps'] + '</div>';
        if (index !== 0) {
            permissionTable += '<div class="section-close-icon" data-index="' + index + '"><a href="javascript:void(0)" class="remove-row text-light-gray"><i class="material-icons">highlight_off</i></a></div>';
        }
        permissionTable += '</div>';
        permissionTable += '<div class="app-selector access-area">';
        permissionTable += '<div class="selector-label">' + $.i18n.map['management-users.apps'] + '</div>';
        permissionTable += '<div class="selector-wrapper">';
        permissionTable += '<input type="text" class="user-app-selector" data-index="' + index + '" id="user-app-selector-' + index + '">';
        permissionTable += '</div>';
        permissionTable += '<div style="clear:both"></div>';
        permissionTable += '</div>';
        permissionTable += '<div class="permission-header">';
        permissionTable += '<div class="table-description first-description">' + $.i18n.map['management-users.feature'] + '</div>';

        for (var i in types) {
            if (types[i] === 'read') {
                permissionTable += '<div class="table-description read-all">';
            }
            else {
                permissionTable += '<div class="table-description">';
            }
            permissionTable += '<div data-label="' + $.i18n.map['management-users.' + types[i]] + '" class="mark-all permission-table-header-checkbox" id="mark-all-' + types[i] + '-' + index + '"></div>';
            permissionTable += '</div>';
        }

        permissionTable += '</div>';
        permissionTable += '<div class="permission-table" id="permission-table-' + index + '"></div>';

        $('.add-new-permission-set').before(permissionTable);

        // link checkboxes after dom injection
        for (var typeIndex in types) {
            $('.create-user-drawer #mark-all-' + types[typeIndex] + '-' + index).countlyCheckbox();
        }

        // jQuery selectize handler for projection input
        var userAppSelector = $('#user-app-selector-' + index).selectize({
            plugins: ['remove_button'],
            persist: true,
            maxItems: null,
            valueField: 'val',
            labelField: 'key',
            searchField: ['key'],
            options: this.appOptions,
            render: {
                item: function(item) {
                    return '<div>' + item.key + '</div>';
                },
                option: function(item) {
                    var label = item.key;
                    return '<div>' + '<span class="label">' + label + '</span>' + '</div>';
                }
            },
            createFilter: function() {
                return true;
            },
            create: function(input) {
                return {
                    "key": input
                };
            },
            onItemRemove: function(input) {
                [].splice($('#user-app-selector-' + index).val().split(",").indexOf(input), 1);
            }
        });

        if (!index || index === 0) {
            self.userAppSelectors = [];
        }
        self.userAppSelectors.push(userAppSelector);

        // render permission checkboxes for features/plugins
        self.features.forEach(function(feature) {
            $('#permission-table-' + index).append(countlyAuth.renderFeatureTemplate(feature, index));
            for (var i0 in types) {
                $('.create-user-drawer #' + types[i0][0] + '-' + feature + '-' + index).countlyCheckbox();
                if (types[i0][0] === 'r' && feature === 'core') {
                    $('.create-user-drawer #' + types[i0][0] + '-' + feature + '-' + index).countlyCheckbox().set(true);
                    $('.create-user-drawer #' + types[i0][0] + '-' + feature + '-' + index).countlyCheckbox().setDisabled();
                }
            }
        });
    },
    initialize: function() {
    },
    beforeRender: function() {
        var self = this;
        this.appOptions = [];
        for (var app in countlyGlobal.apps) {
            this.appOptions.push({
                key: countlyGlobal.apps[app].name,
                val: app
            });
        }

        countlyAuth.initFeatures()
            .then(function() {
                self.features = countlyAuth.features;
                self.features = self.features.sort();
            })
            .catch(function() {});

        if (this.template) {
            return true;
        }
        else {
            return $.when(T.render('/templates/users.html', function(src) {
                self.template = src;
            })).then(function() {});
        }
    },
    renderTable: function(users) {
        var self = this;
        // render users.html template into #content div
        $('#content').html(self.template({
            "page-title": jQuery.i18n.map["sidebar.management.users"],
            users: users,
            apps: countlyGlobal.apps,
            is_global_admin: (countlyGlobal.member.global_admin) ? true : false
        }));
        // prepare table-data for users table
        var tableData = [];
        if (users) {
            for (var z in users) {
                tableData.push(users[z]);
            }
        }
        // render table
        self.dtable = $('#user-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
            "aaData": tableData,
            "fnRowCallback": function(nRow, aData) {
                $(nRow).attr("id", aData._id);
            },
            "aoColumns": [
                CountlyHelpers.expandRowIconColumn(),
                {
                    "mData": function(row, type) {
                        if (type === "display") {
                            return "<span title='" + row.full_name + "'>" + row.full_name + "</span>";
                        }
                        else {
                            return row.full_name;
                        }
                    },
                    "sType": "string",
                    "sExport": "userinfo",
                    "sTitle": jQuery.i18n.map["management-users.full-name"],
                    "sClass": "trim"
                },
                {
                    "mData": function(row, type) {
                        if (type === "display") {
                            return "<span title='" + row.username + "'>" + row.username + "</span>";
                        }
                        else {
                            return row.username;
                        }
                    },
                    "sType": "string",
                    "sTitle": jQuery.i18n.map["management-users.username"],
                    "sClass": "trim"
                },
                {
                    "mData": function(row) {
                        if (row.global_admin) {
                            return jQuery.i18n.map["management-users.global-admin"];
                        }
                        else {
                            var apps = [];

                            for (var i = 0; i < row.permission._.a.length; i++) {
                                if (countlyGlobal.apps[row.permission._.a[i]]) {
                                    apps.push('<b>' + countlyGlobal.apps[row.permission._.a[i]].name + '</b>');
                                }
                            }

                            for (var i0 = 0; i0 < row.permission._.u.length; i0++) {
                                for (var j = 0; j < row.permission._.u[i0].length; j++) {
                                    if (countlyGlobal.apps[row.permission._.u[i0][j]]) {
                                        apps.push(countlyGlobal.apps[row.permission._.u[i0][j]].name);
                                    }
                                }
                            }

                            if (apps.length === 0) {
                                return jQuery.i18n.map["management-users.no-role"];
                            }
                            return apps.join(", ");
                        }
                    },
                    "sType": "string",
                    "sTitle": jQuery.i18n.map["management-users.role"]
                },
                {
                    "mData": function(row, type) {
                        if (type === "display") {
                            return "<span title='" + row.email + "'>" + row.email + "</span>";
                        }
                        else {
                            return row.email;
                        }
                    },
                    "sType": "string",
                    "sTitle": jQuery.i18n.map["management-users.email"],
                    "sClass": "trim"
                },
                {
                    "mData": function(row, type) {
                        if (type === "display") {
                            return (row.created_at) ? countlyCommon.formatTimeAgo(row.created_at) : "";
                        }
                        else {
                            return (row.created_at) ? row.created_at : 0;
                        }
                    },
                    "sType": "format-ago",
                    "sTitle": jQuery.i18n.map["management-users.created"]
                },
                {
                    "mData": function(row) {
                        if (!countlyAuth.validateUpdate("global_users")) {
                            return '';
                        }
                        else {
                            return "<div class='manage-users-options-item " + ((row._id === countlyGlobal.member._id) ? 'own-row' : '') + " options-item'>"
                                    + "<div class='edit show-edit-menu' data-id='" + row._id + "'></div>"
                                    + "<div class='edit-menu manage-users-menu-" + row._id + "' id='" + row._id + "'>"
                                    + ((countlyAuth.validateUpdate(self.featureName)) ? "<div class='edit-user item'" + " data-id='" + row._id + "'" + "><i class='fa fa-pencil'></i> &nbsp; " + jQuery.i18n.map["common.edit"] + "</div>" : "")
                                    + ((countlyAuth.validateDelete(self.featureName)) ? "<div data-fullname='" + row.full_name + "' class='delete-user item'" + " data-id='" + row._id + "'" + "><i class='fa fa-trash'></i> &nbsp;" + jQuery.i18n.map["common.delete"] + "</div>" : "")
                                    + "</div>"
                                + "</div>";
                        }
                    },
                    "bSortable": false,
                    "noExport": true
                }
            ]
        }));
        // set datatable confs
        self.dtable.fnSort([ [0, 'asc'] ]);
        self.dtable.stickyTableHeaders();
        $('#user-table .expand-row-icon').hide();

        // CRUD validations
        if (!countlyAuth.validateDelete(this.featureName)) {
            $('.delete-user').hide();
        }
        if (!countlyAuth.validateCreate(this.featureName)) {
            $('#add-user-mgmt').hide();
        }

        app.addDataExport("userinfo", function() {
            var ret = [];
            var elem;
            for (var i = 0; i < tableData.length; i++) {
                elem = {};
                elem[jQuery.i18n.map["management-users.full-name"]] = tableData[i].full_name;
                elem[jQuery.i18n.map["management-users.username"]] = tableData[i].username;
                elem[jQuery.i18n.map["management-users.email"]] = tableData[i].email;
                elem[jQuery.i18n.map["management-users.global-admin"]] = tableData[i].global_admin;
                elem[jQuery.i18n.map["management-users.lock-account"]] = tableData[i].locked;

                if (tableData[i].created_at === 0) {
                    elem[jQuery.i18n.map["management-users.created"]] = jQuery.i18n.map["common.unknown"];
                }
                else {
                    elem[jQuery.i18n.map["management-users.created"]] = moment(parseInt(tableData[i].created_at) * 1000).format("ddd, D MMM YYYY HH:mm:ss");
                }

                if (tableData[i].last_login === 0) {
                    elem[jQuery.i18n.map["management-users.last_login"]] = jQuery.i18n.map["common.unknown"];
                }
                else {
                    elem[jQuery.i18n.map["management-users.last_login"]] = moment(parseInt(tableData[i].last_login) * 1000).format("ddd, D MMM YYYY HH:mm:ss");
                }

                if (tableData[i].admin_of && tableData[i].admin_of.length) {
                    elem[jQuery.i18n.map["management-users.admin-of"]] = CountlyHelpers.appIdsToNames(tableData[i].admin_of);
                }
                else {
                    elem[jQuery.i18n.map["management-users.admin-of"]] = "";
                }

                if (tableData[i].user_of && tableData[i].user_of.length) {
                    elem[jQuery.i18n.map["management-users.user-of"]] = CountlyHelpers.appIdsToNames(tableData[i].user_of);
                }
                else {
                    elem[jQuery.i18n.map["management-users.user-of"]] = "";
                }

                if (typeof pathsToSectionNames !== "undefined") {
                    var allUrls = getUrls();
                    if (tableData[i].restrict && tableData[i].restrict.length) {
                        var allowed = [];
                        for (var j = 0; j < allUrls.length; j++) {
                            if (tableData[i].restrict.indexOf(allUrls[j]) === -1) {
                                allowed.push(allUrls[j]);
                            }
                        }
                        elem[jQuery.i18n.map["restrict.restricted-sections"]] = pathsToSectionNames(tableData[i].restrict);
                        elem[jQuery.i18n.map["restrict.sections-allowed"]] = pathsToSectionNames(allowed);
                    }
                    else {
                        elem[jQuery.i18n.map["restrict.restricted-sections"]] = "";
                        elem[jQuery.i18n.map["restrict.sections-allowed"]] = pathsToSectionNames(allUrls);
                    }
                }

                ret.push(elem);
            }
            return ret;
        });

        if (self._id) {
            $(self.el).prepend('<a class="back back-link"><span>' + jQuery.i18n.map["common.back"] + '</span></a>');
            $(self.el).find(".back").click(function() {
                app.back("/manage/users");
            });
        }
        self.initTable();

        /*
            Handle create new user button
        */
        $("#add-user-mgmt").on("click", function() {
            self.drawerMode = 'c';
            self.userApps = [[]];
            self.adminApps = [];
            $(".generate-password").click();
            var userCreateDrawer = $('.create-user-drawer');
            $('.create-user-drawer .discard-changes').hide();
            $('#create-user-drawer-title').html($.i18n.map['management-users.create-new-user']);
            $('.create-user-drawer #create-user-button').html($.i18n.map['management-users.create-user']);
            $('.access-area').show();
            $('#sub-header-1th').show();
            $('.add-new-permission-set').show();
            $('.create-user-drawer #manage-users-admin-app-selector')[0].selectize.setValue([]);

            // clean inputs
            userCreateDrawer.addClass("open");
            userCreateDrawer.find('.full-name-text').val('');
            userCreateDrawer.find('.email-text').val('');
            userCreateDrawer.find('.username-text').val('');
            // hide checks
            userCreateDrawer.find('.username-check').hide();
            userCreateDrawer.find('.email-check').hide();

            // prevent groups hook if already added
            // this trigger for groups plugin hooks
            $('#user-group-container').remove();
            $('#new-user-group-select').remove();
            $('.user-group-label').remove();

            $(self).trigger('user-mgmt.new-user-button-clicked');
            $('.create-user-drawer #user-drawer-global-admin').countlyCheckbox().set(false);

            // initialize clean permission objects
            var initializedPermissions = countlyAuth.initializePermissions(self.permissionSets);
            self.memberModel.permission = initializedPermissions.permissionObject;
            self.permissionSets = initializedPermissions.permissionSets;

            // clear drawer permission tables
            $('.create-user-drawer .user-access').remove();
            // render permission table
            self.renderPermissionsTable();
            countlyAuth.clearDrawer('.create-user-drawer', self.permissionSets, self.renderPermissionsTable);
            $('.create-user-drawer .img-preview').hide();
            $('.create-user-drawer #user-avatar-upload-drop').show();
            $('.create-user-drawer .edit-picture').hide();
        });

        CountlyHelpers.initializeSelect($('#user-create-group-selector'));

        $(".cly-drawer").find(".close").off("click").on("click", function() {
            $(this).parents(".cly-drawer").removeClass("open");
        });

        $('.scrollable').slimScroll({
            height: '100%',
            start: 'top',
            wheelStep: 10,
            position: 'right',
            disableFadeOut: false
        });

        // jQuery selectize handler for projection input
        var adminAppSelector = $('.create-user-drawer #manage-users-admin-app-selector').selectize({
            plugins: ['remove_button'],
            persist: true,
            maxItems: null,
            valueField: 'val',
            labelField: 'key',
            searchField: ['key'],
            options: this.appOptions,
            render: {
                item: function(item) {
                    return '<div>' + item.key + '</div>';
                },
                option: function(item) {
                    var label = item.key;
                    return '<div>' + '<span class="label">' + label + '</span>' + '</div>';
                }
            },
            createFilter: function() {
                return true;
            },
            create: function(input) {
                return {
                    "key": input
                };
            },
            onItemRemove: function(input) {
                [].splice($('.create-user-drawer #manage-users-admin-app-selector').val().split(",").indexOf(input), 1);
            }
        });

        var memberImageDropzone = new Dropzone("#user-avatar-upload-drop", {
            member: null,
            addRemoveLinks: true,
            url: "/member/icon",
            paramName: "member_image",
            params: { _csrf: countlyGlobal.csrf_token },
            thumbnailWidth: 190,
            thumbnailHeight: 232,
            autoProcessQueue: false,
            clickable: ['.upload-message', '.img-upload'],
            acceptedFiles: '.jpg,.png,.jpeg',
            previewTemplate: '<div class="dz-preview dz-file-preview"><div class="dz-details"><img data-dz-thumbnail /></div></div>',
            init: function() {
                var thisDropzone = this;
                this.on('sending', function(file, xhr, formData) {
                    formData.append('member_image_id', thisDropzone.member._id);
                });
            }
        });

        memberImageDropzone.on("addedfile", function() {
            $('.upload-message').hide();
        });

        memberImageDropzone.on("reset", function() {
            $('.upload-message').show();
        });

        memberImageDropzone.on("complete", function() {
            this.member.user_id = this.member._id;
            this.member.member_image = '/memberimages/' + this.member.user_id + '.png';
            $('.create-user-drawer .img-preview').css({'background-image': 'url(' + this.member.member_image + '?t=' + Date.now() + ')' });
        });

        tippy('.show-tooltip', {
            'theme': 'custom',
            zIndex: 11000,
            arrowType: 'sharp',
            arrow: 'down',
            animation: false
        });

        // Events handlers
        $('body').off('click', '.manage-users-options-item .show-edit-menu').on('click', '.manage-users-options-item .show-edit-menu', function() {
            var that = this;
            $('.edit-menu').hide();
            $('.manage-users-menu-' + $(this).data('id')).show();
            setTimeout(function() {
                $('.manage-users-menu-' + $(that).data('id')).fadeOut();
            }, 3000);
        });

        $('.create-user-drawer').off('click', '.edit-picture').on('click', '.edit-picture', function() {
            $('.edit-picture').hide();
            $('.img-preview').hide();
            $('#user-avatar-upload-drop').show();
        });

        $('.create-user-drawer').off('click', '.discard-changes').on('click', '.discard-changes', function() {
            CountlyHelpers.confirm(jQuery.i18n.prop('management-users.discard-confirm'), "popStyleGreen", function(result) {
                if (result) {
                    $('.create-user-drawer').removeClass('open');
                }
                else {
                    return;
                }
            });
        });

        // user edit drawer opener
        $('body').off('click', '.edit-user').on('click', '.edit-user', function() {
            // step1: open drawer
            $('.create-user-drawer').addClass('open');

            // step2: set local variables, drawer specific dom elements, strings etc.
            var data = {};
            var id = $(this).data('id');
            var url = countlyCommon.API_PARTS.users.r + '/id';
            data.id = id;
            data.app_id = countlyCommon.ACTIVE_APP_ID;
            self.drawerMode = 'u';
            self.selectedMemberId = id;

            $('.create-user-drawer .edit-picture').show();
            $('#create-user-drawer-title').html($.i18n.map['management-users.edit-user']);
            $('.create-user-drawer .discard-changes').show();
            $('.create-user-drawer .create-user-drawer-detail').hide();
            $('.create-user-drawer .drawer-loading').show();
            $('.create-user-drawer #create-user-button').html($.i18n.map['management-users.save-changes']);

            // step3: get member data
            $.ajax({
                url: url,
                data: data,
                dataType: "json",
                success: function(response) {
                    var memberData = response[id];

                    // step4: remove existing group input if exist and render again with correct data
                    $('#user-group-container').remove();
                    $('#new-user-group-select').remove();
                    $('.user-group-label').remove();
                    $(self).trigger('user-mgmt.user-selected', memberData);

                    // step5: fill form inputs with member values
                    $('.create-user-drawer').find('.full-name-text').val(memberData.full_name);
                    $('.create-user-drawer').find('.username-text').val(memberData.username);
                    $('.create-user-drawer').find('.email-text').val(memberData.email);

                    // step6: set drawer by member's global admin state
                    if (memberData.global_admin) {
                        // set checkbox manually
                        $('.create-user-drawer #user-drawer-global-admin').countlyCheckbox().set(true);
                        // hide access boxes, global admin doesn't need that
                        $('.create-user-drawer #sub-header-1th').hide();
                        $('.create-user-drawer .admin-access').hide();
                        $('.create-user-drawer .user-access').hide();
                        $('.create-user-drawer .add-new-permission-set').hide();
                    }
                    else {
                        // set checkbox manually
                        $('.create-user-drawer #user-drawer-global-admin').countlyCheckbox().set(false);
                        // show access boxes
                        $('.create-user-drawer #sub-header-1th').show();
                        $('.create-user-drawer .admin-access').show();
                        $('.create-user-drawer .user-access').show();
                        $('.create-user-drawer .add-new-permission-set').show();
                        $('.create-user-drawer .admin-access .app-selector').show();
                    }

                    // step7: show member image in drawer
                    $('#user-avatar-upload-drop').hide();
                    $('.create-user-drawer .img-preview').show();
                    $('.create-user-drawer .img-preview').css({'background-image': 'url(/memberimages/' + memberData._id + '.png?t=' + Date.now() + ')' });

                    // step8: set local permission box configs as member's permission
                    self.userApps = memberData.permission._.u;
                    self.adminApps = memberData.permission._.a;
                    self.memberPermission = memberData.permission;

                    // step9: set accessible apps for drawer indicator
                    self.accessibleApps = [];
                    for (var i = 0; i < self.userApps.length; i++) {
                        self.accessibleApps = self.accessibleApps.concat(CountlyHelpers.removeEmptyValues(self.userApps[i]));
                    }
                    self.accessibleApps = CountlyHelpers.arrayUnique(self.accessibleApps.concat(CountlyHelpers.removeEmptyValues(self.adminApps)));
                    $('.create-user-drawer #accesible-app-count').html(self.accessibleApps.length);

                    if (memberData.global_admin) {
                        // clear drawer permission tables
                        var permissionTables = $('.create-user-drawer .user-access');

                        for (var i0 = 0; i0 < permissionTables.length; i0++) {
                            if (i0 >= memberData.permission._.u.length + 1) {
                                $(permissionTables[i0]).remove();
                            }
                        }
                    }
                    else {
                        $('.create-user-drawer .user-access').remove();
                        // render new clean tables
                        for (var i1 = 0; i1 < self.userApps.length; i1++) {
                            self.renderPermissionsTable(i1);
                        }
                        self.permissionSets = countlyAuth.permissionParser('.create-user-drawer', self.memberPermission, countlyAuth.permissionSetGenerator(self.userApps.length));
                    }
                    // check is group plugin enabled?
                    if ($('#user-group-container').length > 0) {
                        var groupValue = $('#selected-user-group').val();
                        // check any group selected? if selected, hide permission boxes 
                        // because permission settings will be extended from selected groups
                        if (groupValue !== "") {
                            $('.access-area').hide();
                            $('#sub-header-1th').hide();
                            $('.add-new-permission-set').hide();
                        }
                    }

                    $('.create-user-drawer .create-user-drawer-detail').show();
                    $('.create-user-drawer .drawer-loading').hide();
                },
                error: function() {
                    $(".create-user-drawer").removeClass('open');
                    CountlyHelpers.notify({
                        type: "error",
                        title: "Somethings went wrong",
                        message: "Server doesn't respond, please try again later"
                    });
                }
            });
        });

        $('body').off('click', '.delete-user').on('click', '.delete-user', function() {
            var self2 = $(this);
            CountlyHelpers.confirm(jQuery.i18n.prop('management-users.delete-confirm', "<b>" + self2.data('fullname') + "</b>"), "popStyleGreen", function(result) {
                if (!result) {
                    return false;
                }

                var data = {
                    user_ids: [self2.data('id')]
                };

                $.ajax({
                    type: "POST",
                    url: countlyCommon.API_PARTS.users.w + '/delete',
                    data: {
                        args: JSON.stringify(data),
                        app_id: countlyCommon.ACTIVE_APP_ID
                    },
                    dataType: "json",
                    success: function() {
                        CountlyHelpers.notify({
                            type: 'green',
                            delay: 3000,
                            title: jQuery.i18n.map['management-users.removed'],
                            message: jQuery.i18n.map['management-users.removed-message']
                        });
                        $(app.manageUsersView).trigger('user-mgmt.user-deleted', data.user_ids);
                        app.activeView.render();
                    }
                });
            }, [jQuery.i18n.map["common.no-dont-delete"], jQuery.i18n.map["management-users.yes-delete-user"]], {title: jQuery.i18n.map["management-users.delete-confirm-title"], image: "delete-user"});
        });

        $('body').on("change", "#permission-app-selector", function() {
            self.showPermissionSection($(this).val());
        });

        $('.create-user-drawer #user-drawer-global-admin').on('click', function() {
            if ($('#user-drawer-global-admin').countlyCheckbox().get()) {
                $('#sub-header-1th').hide();
                $('.admin-access').hide();
                $('.user-access').hide();
                $('.add-new-permission-set').hide();
            }
            else {
                $('#sub-header-1th').show();
                $('.admin-access').show();
                $('.user-access').show();
                $('.add-new-permission-set').show();
            }
        });

        $('body').off('click', '.create-user-drawer .permission-checkbox').on('click', '.create-user-drawer .permission-checkbox', function() {
            var selector = $(this).attr('id').split("-");
            var permission_type = selector[0];
            var feature = selector[1];
            var index = selector[2];
            var mapTypes = {c: 'create', r: 'read', u: 'update', d: 'delete'};

            if ($('.create-user-drawer #' + $(this).attr('id')).countlyCheckbox().get()) {
                self.permissionSets[index] = countlyAuth.giveFeaturePermission(permission_type, feature, self.permissionSets[index]);
            }
            else {
                $('.create-user-drawer #mark-all-' + mapTypes[permission_type] + '-' + index).countlyCheckbox().set(false);
                self.permissionSets[index] = countlyAuth.removeFeaturePermission(permission_type, feature, self.permissionSets[index]);
            }

        });

        $('body').off('click', '.create-user-drawer .mark-all').on('click', '.create-user-drawer .mark-all', function() {
            var index = $(this).attr('id').split('-')[3];
            var type = $(this).attr('id').split('-')[2];

            if ($('.create-user-drawer #mark-all-' + type + '-' + index).countlyCheckbox().get()) {
                for (var i = 0; i < self.features.length; i++) {
                    if (type === 'read' && self.features[i] === 'core') {
                        continue;
                    }
                    $('.create-user-drawer #' + type.substr(0, 1) + '-' + self.features[i] + '-' + index).countlyCheckbox().set(true);
                }

                self.permissionSets[index] = countlyAuth.updatePermissionByType(type.substr(0, 1), self.permissionSets[index], true);
            }
            else {
                for (var j = 0; j < self.features.length; j++) {
                    if (type === 'read' && self.features[j] === 'core') {
                        continue;
                    }
                    $('.create-user-drawer #' + type.substr(0, 1) + '-' + self.features[j] + '-' + index).countlyCheckbox().set(false);
                }

                self.permissionSets[index] = countlyAuth.updatePermissionByType(type.substr(0, 1), self.permissionSets[index], false);
            }
        });

        $("#create-user-button").on("click", function() {
            $("#listof-apps").hide();
            $(".row").removeClass("selected");
            $(".email-check.green-text").remove();
            $(".username-check.green-text").remove();

            var currUserDetails = $(".create-user-drawer .left-area");
            var isGroupSelected = false;

            if (($('#new-user-group-select').length > 0 && $('#selected-new-user-group').val() !== "") || (typeof $('#selected-user-group').val() !== "undefined" && $('#selected-user-group').val() !== "")) {
                isGroupSelected = true;
            }

            self.memberModel.full_name = currUserDetails.find(".full-name-text").val();
            self.memberModel.username = currUserDetails.find(".username-text").val();
            self.memberModel.email = currUserDetails.find(".email-text").val();
            self.memberModel.global_admin = $('#user-drawer-global-admin').countlyCheckbox().get();
            if (self.drawerMode === 'c') {
                self.memberModel.password = $(".create-user-drawer #password-text").val();
            }

            if (isGroupSelected) {
                var selectedGroup;
                if (self.drawerMode === 'c') {
                    selectedGroup = $('#selected-new-user-group').val();
                }
                else {
                    selectedGroup = $('#selected-user-group').val();
                }

                var groups = groupsModel.data();

                for (var i = 0; i < groups.length; i++) {
                    if (groups[i]._id === selectedGroup) {
                        self.memberModel.global_admin = groups[i].global_admin;
                        self.memberModel.permission = groups[i].permission;
                    }
                }
            }
            else {
                if (self.memberModel.global_admin) {
                    self.memberModel.permission = countlyAuth.initializePermissions(self.permissionSets).permissionObject;
                }
                else {
                    for (var i0 = 0; i0 < self.userApps.length; i0++) {
                        if (self.userApps[i0].length === 0) {
                            self.userApps = self.userApps.splice(i0, 1);
                        }
                    }

                    self.memberModel.permission = countlyAuth.combinePermissionObject(self.userApps, self.permissionSets, self.memberPermission);
                    self.memberModel.permission._.u = self.userApps;
                    self.memberModel.permission._.a = self.adminApps;
                }
            }

            if (!self.memberModel.full_name.length) {
                CountlyHelpers.notify({
                    type: 'warning',
                    delay: 3000,
                    title: 'Validation error',
                    message: $.i18n.map['management-users.full-name-required']
                });
                return;
            }

            if (!self.memberModel.username.length) {
                CountlyHelpers.notify({
                    type: 'warning',
                    delay: 3000,
                    title: 'Validation error',
                    message: $.i18n.map['management-users.username-required']
                });
                return;
            }

            if (!self.memberModel.email.length) {
                CountlyHelpers.notify({
                    type: 'warning',
                    delay: 3000,
                    title: 'Validation error',
                    message: $.i18n.map['management-users.email-required']
                });
                return;
            }
            else if (!CountlyHelpers.validateEmail(self.memberModel.email)) {
                CountlyHelpers.notify({
                    type: 'warning',
                    delay: 3000,
                    title: 'Validation error',
                    message: $.i18n.map['management-users.email-invalid-format']
                });
                return;
            }

            if (!self.memberModel.global_admin && (self.memberModel.permission._.u[0].length === 0 && self.memberModel.permission._.a.length === 0)) {
                CountlyHelpers.notify({
                    type: 'warning',
                    delay: 3000,
                    title: 'Validation error',
                    message: $.i18n.map['management-users.at-least-one-app-required']
                });
                return;
            }

            // set core read selected as default for all user apps
            for (var i1 = 0; i1 < self.memberModel.permission._.u.length; i1++) {
                for (var j = 0; j < self.memberModel.permission._.u[i1].length; j++) {
                    self.memberModel.permission.r[self.memberModel.permission._.u[i1][j]].allowed.core = true;
                }
            }

            if (self.drawerMode === 'c') {
                $.ajax({
                    type: "POST",
                    url: countlyCommon.API_PARTS.users.w + '/create',
                    data: {
                        args: JSON.stringify(self.memberModel),
                        app_id: countlyCommon.ACTIVE_APP_ID
                    },
                    dataType: "json",
                    success: function(member) {
                        CountlyHelpers.notify({
                            type: 'green',
                            delay: 3000,
                            title: jQuery.i18n.map['management-users.created'],
                            message: jQuery.i18n.map['management-users.created-message']
                        });
                        $(self).trigger('user-mgmt.user-created', self.memberModel);
                        // we need to wait until create process done before send upload request,
                        // because upload request requires member_id as param.
                        memberImageDropzone.member = member;
                        memberImageDropzone.processQueue();
                        if (isGroupSelected) {
                            groupsModel.saveUserGroup({ email: member.email, group_id: $('#selected-new-user-group').val() }, function() {
                                app.activeView.render();
                            });
                        }
                        else {
                            app.activeView.render();
                        }
                    },
                    error: function() {
                        CountlyHelpers.notify({
                            type: "error",
                            title: "Somethings went wrong",
                            message: "Server doesn't respond, please try again later"
                        });
                    }
                });
            }
            else {
                self.memberModel.user_id = self.selectedMemberId;
                $.ajax({
                    type: "POST",
                    url: countlyCommon.API_PARTS.users.w + '/update',
                    data: {
                        args: JSON.stringify(self.memberModel),
                        app_id: countlyCommon.ACTIVE_APP_ID
                    },
                    dataType: "json",
                    success: function() {
                        CountlyHelpers.notify({
                            type: 'green',
                            delay: 3000,
                            title: jQuery.i18n.map['management-users.updated'],
                            message: jQuery.i18n.map['management-users.updated-message']
                        });
                        memberImageDropzone.member = { _id: self.selectedMemberId };
                        memberImageDropzone.processQueue();
                        self.memberModel.group_id = $('#selected-user-group').val();
                        $(self).trigger('user-mgmt.user-updated', self.memberModel);
                        app.activeView.render();
                    },
                    error: function() {
                        CountlyHelpers.notify({
                            type: "error",
                            title: "Somethings went wrong",
                            message: "Server doesn't respond, please try again later"
                        });
                    }
                });
            }
        });

        $(".create-user-drawer #manage-users-admin-app-selector").off("change").on("change", function() {
            var adminApps = $(this).val().split(",");
            var affectedApp = CountlyHelpers.arrayDiff(adminApps, self.adminApps)[0] === "" ? CountlyHelpers.arrayDiff(adminApps, self.adminApps)[1] : CountlyHelpers.arrayDiff(adminApps, self.adminApps)[0];
            var is_already_added = false;
            var conflictIndex = -1;

            // check this app added to any user app selector
            for (var i = 0; i < self.userAppSelectors.length; i++) {
                if (self.userAppSelectors[i][0].selectize.getValue().split(",").indexOf(affectedApp) > -1) {
                    is_already_added = true;
                    conflictIndex = i;
                }
            }

            // remove related app from other user app selectors if already added
            if (is_already_added) {
                var userApps = CountlyHelpers.removeItemFromArray(affectedApp, self.userAppSelectors[conflictIndex][0].selectize.getValue().split(","));
                var selectize = self.userAppSelectors[conflictIndex][0].selectize;
                selectize.setValue(userApps);
            }

            if (adminApps.length > CountlyHelpers.removeEmptyValues(self.adminApps).length) {
                self.memberPermission = countlyAuth.updateAdminPermissions(affectedApp, self.memberPermission, true);
            }
            else {
                self.memberPermission = countlyAuth.updateAdminPermissions(affectedApp, self.memberPermission, false);
            }
            // update model
            self.adminApps = adminApps;
            self.accessibleApps = [];

            for (var i0 = 0; i0 < self.userApps.length; i0++) {
                self.accessibleApps = self.accessibleApps.concat(CountlyHelpers.removeEmptyValues(self.userApps[i0]));
            }
            self.accessibleApps = CountlyHelpers.arrayUnique(self.accessibleApps.concat(CountlyHelpers.removeEmptyValues(self.adminApps)));
            $('.create-user-drawer #accessible-app-count').html(self.accessibleApps.length);
        });

        $('body').off('click', '.create-user-drawer .section-close-icon').on('click', '.create-user-drawer .section-close-icon', function() {
            var that = this;
            CountlyHelpers.confirm($.i18n.map['management-users.are-you-sure-to-continue'], "popStyleGreen", function(result) {
                if (!result) {
                    return true;
                }

                var index = $(that).data('index');
                self.userApps.splice(index, 1);
                self.permissionSets.splice(index, 1);
                $('#user-access-' + index).remove();
            },
            null,
            {
                title: $.i18n.map['management-users.permission-set-will-be-removed'],
                image: "delete-an-app"
            });
        });

        $('body').off('click', '#new-user-group-select div.item').on('click', '#new-user-group-select div.item', function() {
            if ($('#selected-new-user-group').val() !== "") {
                $('.access-area').hide();
                $('#sub-header-1th').hide();
                $('.add-new-permission-set').hide();
            }
            else {
                $('.access-area').show();
                $('#sub-header-1th').show();
                $('.add-new-permission-set').show();
            }
        });

        $('body').off('click', '#group-select div.item').on('click', '#group-select div.item', function() {
            if ($('#selected-user-group').val() !== "") {
                $('.access-area').hide();
                $('#sub-header-1th').hide();
                $('.add-new-permission-set').hide();
            }
            else {
                $('.access-area').show();
                $('#sub-header-1th').show();
                $('.add-new-permission-set').show();
                // reset global admin checkbox
                $('.create-user-drawer .is-global-admin-checkbox').removeClass('fa-check-square');
                $('.create-user-drawer .is-global-admin-checkbox').addClass('fa-square-o');
                $('.create-user-drawer #is-global-admin').data('state', 0);
                $('.create-user-drawer #sub-header-1th').show();
                $('.create-user-drawer .admin-access').show();
                $('.create-user-drawer .user-access').show();
                $('.create-user-drawer .add-new-permission-set').show();
            }
        });

        $('body').off('change', '.create-user-drawer .user-app-selector').on('change', '.create-user-drawer .user-app-selector', function() {
            var index = $(this).data('index');
            var userApps = $(this).val().split(",");
            var currentUserApps = self.userApps[index];
            var conflictIndex = -1;
            var affectedApp = CountlyHelpers.arrayDiff(userApps, currentUserApps)[0] === "" ? CountlyHelpers.arrayDiff(userApps, currentUserApps)[1] : CountlyHelpers.arrayDiff(userApps, currentUserApps)[0];
            var isAlreadyAddedToAdmin = self.adminApps.indexOf(affectedApp) > -1 ? true : false;
            var isAlreadyAddedToOtherUsers = false;

            // remove from admin apps list if already exist
            if (isAlreadyAddedToAdmin) {
                self.adminApps = CountlyHelpers.removeItemFromArray(affectedApp, self.adminApps);
                var selectize = adminAppSelector[0].selectize;
                selectize.setValue(self.adminApps);
            }

            // check is already exist in user apps lists
            if (!isAlreadyAddedToAdmin) {
                for (var i = 0; i < self.userAppSelectors.length; i++) {
                    if ((i !== index) && self.userAppSelectors[index][0].selectize.getValue().split(",").indexOf(affectedApp) > -1) {
                        isAlreadyAddedToOtherUsers = true;
                        conflictIndex = i;
                    }
                }
            }

            // remove from user apps list if already exist
            if (isAlreadyAddedToOtherUsers) {
                var updated_userApps = CountlyHelpers.removeItemFromArray(affectedApp, self.userAppSelectors[conflictIndex][0].selectize.getValue().split(","));
                var selectize0 = self.userAppSelectors[conflictIndex][0].selectize;
                selectize0.setValue(updated_userApps);
            }

            // update model
            self.userApps[index] = userApps;
            self.accessibleApps = [];
            for (var i0 = 0; i0 < self.userApps.length; i0++) {
                self.accessibleApps = self.accessibleApps.concat(CountlyHelpers.removeEmptyValues(self.userApps[i0]));
            }
            self.accessibleApps = CountlyHelpers.arrayUnique(self.accessibleApps.concat(CountlyHelpers.removeEmptyValues(self.adminApps)));
            $('.create-user-drawer #accessible-app-count').html(self.accessibleApps.length);
        });

        $('body').off('click', '.create-user-drawer .add-new-permission-set').on('click', '.create-user-drawer .add-new-permission-set', function() {
            self.userApps.push([]);
            self.permissionSets.push({c: {all: false, allowed: {}}, r: {all: false, allowed: { core: true }}, u: {all: false, allowed: {}}, d: {all: false, allowed: {}}});
            // pass count - 1 because we'll use it as array index in logic
            self.renderPermissionsTable(self.permissionSets.length - 1);
        });
    },
    renderCommon: function() {
        var url = countlyCommon.API_PARTS.users.r + '/all';
        var data = {};
        data.app_id = countlyCommon.ACTIVE_APP_ID;
        if (this._id) {
            url = countlyCommon.API_PARTS.users.r + '/id';
            data.id = this._id;
        }
        var self = this;
        $.ajax({
            url: url,
            data: data,
            dataType: "json",
            success: function(users) {
                self.renderTable(users);
            },
            error: function() {
                self.renderTable();
            }
        });
        $(this).off('user-mgmt.render').on('user-mgmt.render', function() {
            app.activeView.render();
        });

        // init permission model object with default values
        var initializedPermissions = countlyAuth.initializePermissions(self.permissionSets);
        self.memberPermission = initializedPermissions.permissionObject;
        self.permissionSets = initializedPermissions.permissionSets;
    },
    setSelectDeselect: function() {
        var searchInput = $("#listof-apps").find(".search input").val();

        if (searchInput === "") {
            if ($("#listof-apps .app:not(.disabled)").length === 0) {
                $("#select-all").hide();
                $("#deselect-all").hide();
            }
            else if ($("#listof-apps .app.selected").length === $("#listof-apps .app").length) {
                $("#select-all").hide();
                $("#deselect-all").show();
            }
            else {
                $("#select-all").show();
                $("#deselect-all").hide();
            }
        }
        else {
            $("#select-all").hide();
            $("#deselect-all").hide();
        }
    },
    initTable: function(userData) {
        userData = userData || {};
        var self = this;
        var activeRow,
            previousSelectAppPos = {},
            currUsername = userData.username || "",
            currEmail = userData.email || "";
        // translate help module
        $("[data-help-localize]").each(function() {
            var elem = $(this);
            if (typeof elem.data("help-localize") !== "undefined") {
                elem.data("help", jQuery.i18n.map[elem.data("help-localize")]);
            }
        });

        // translate dashboard
        $("[data-localize]").each(function() {
            var elem = $(this);
            elem.text(jQuery.i18n.map[elem.data("localize")]);
        });

        if ($("#help-toggle").hasClass("active")) {
            $('.help-zone-vb').tipsy({
                gravity: $.fn.tipsy.autoNS,
                trigger: 'manual',
                title: function() {
                    return ($(this).data("help")) ? $(this).data("help") : "";
                },
                fade: true,
                offset: 5,
                cssClass: 'yellow',
                opacity: 1,
                html: true
            });
            $('.help-zone-vs').tipsy({
                gravity: $.fn.tipsy.autoNS,
                trigger: 'manual',
                title: function() {
                    return ($(this).data("help")) ? $(this).data("help") : "";
                },
                fade: true,
                offset: 5,
                cssClass: 'yellow narrow',
                opacity: 1,
                html: true
            });

            $.idleTimer('destroy');
            clearInterval(self.refreshActiveView);
            $(".help-zone-vs, .help-zone-vb").hover(
                function() {
                    $(this).tipsy("show");
                },
                function() {
                    $(this).tipsy("hide");
                }
            );
        }
        /** closes active edit */
        function closeActiveEdit() {
            CountlyHelpers.closeRows(self.dtable);
            $("#listof-apps").hide();
            $(".row").removeClass("selected");
        }

        $(".select-apps").off("click").on('click', function() {
            $("#listof-apps .app").removeClass("selected");
            activeRow = $(this).parent(".row");
            activeRow.addClass("selected");
            var buttonPos = $(this).offset();
            buttonPos.top = Math.floor(buttonPos.top) + 25;
            buttonPos.left = Math.floor(buttonPos.left) - 18;

            if ($("#listof-apps").is(":visible") && JSON.stringify(buttonPos) === JSON.stringify(previousSelectAppPos)) {
                $("#listof-apps").hide();
                $(".row").removeClass("selected");
                return true;
            }

            previousSelectAppPos = buttonPos;

            var appList = activeRow.find(".app-list").val().split(","),
                adminAppList = $(".admin-apps:visible .app-list").val().split(","),
                isAdminApps = activeRow.hasClass("admin-apps");

            $("#listof-apps").find(".app_id").each(function() {
                if (appList.indexOf($(this).val()) !== -1) {
                    $(this).parent().addClass("selected");
                }

                if (!isAdminApps && adminAppList.indexOf($(this).val()) !== -1) {
                    $(this).parent().addClass("disabled");
                }
                else {
                    $(this).parent().removeClass("disabled");
                }
            });

            self.setSelectDeselect();

            $("#listof-apps").show().offset(buttonPos);
            $("#listof-apps").find(".search input").focus();
        });

        $("#listof-apps").find(".search").on('input', 'input', function() {
            self.setSelectDeselect();
        });

        $(".username-text").off("keyup").on("keyup", _.throttle(function() {
            if (!($(this).val().length) || currUsername === $(this).val()) {
                $(".username-check").remove();
                return false;
            }

            $(this).next(".required").remove();

            var existSpan = $("<span class='username-check red-text'>").html(jQuery.i18n.map["management-users.username.exists"]),
                notExistSpan = $("<span class='username-check green-text'>").html("&#10004;"),
                data = {};

            data.username = $(this).val();
            data._csrf = countlyGlobal.csrf_token;

            var self2 = $(this);
            $.ajax({
                type: "POST",
                url: countlyGlobal.path + "/users/check/username",
                data: data,
                success: function(result) {
                    $(".username-check").remove();
                    if (result) {
                        self2.before(notExistSpan.clone());
                    }
                    else {
                        self2.before(existSpan.clone());
                    }
                }
            });
        }, 300));

        $(".email-text").off("keyup").on("keyup", _.throttle(function() {
            if (!($(this).val().length) || currEmail === $(this).val()) {
                $(".email-check").remove();
                return false;
            }

            $(this).next(".required").remove();

            if (!CountlyHelpers.validateEmail($(this).val())) {
                $(".email-check").remove();
                var invalidSpan = $("<span class='email-check red-text'>").html(jQuery.i18n.map["management-users.email.invalid"]);
                $(this).before(invalidSpan.clone());
                return false;
            }

            var existSpan = $("<span class='email-check red-text'>").html(jQuery.i18n.map["management-users.email.exists"]),
                notExistSpan = $("<span class='email-check green-text'>").html("&#10004;"),
                data = {};

            data.email = $(this).val();
            data._csrf = countlyGlobal.csrf_token;

            var self2 = $(this);
            $.ajax({
                type: "POST",
                url: countlyGlobal.path + "/users/check/email",
                data: data,
                success: function(result) {
                    $(".email-check").remove();
                    if (result) {
                        self2.before(notExistSpan.clone());
                    }
                    else {
                        self2.before(existSpan.clone());
                    }
                }
            });
        }, 300));

        $(".password-text").off("keyup").on("keyup", _.throttle(function() {
            $(".password-check").remove();
            var error = CountlyHelpers.validatePassword($(this).val());
            if (error) {
                var invalidSpan = $("<span class='password-check red-text'>").html(error);
                $(this).after(invalidSpan.clone());
                return false;
            }
        }, 300));

        $(".cancel-user").off("click").on("click", function() {
            closeActiveEdit();
        });
        $(".delete-user").off("click").on("click", function() {
            return;
        });
        $(".global-admin").off("click").on('click', function() {
            var currUserDetails = $(".user-details:visible");

            // toggle permission section by global-admin state
            if ($(this).hasClass('checked')) {
                $('.member-permission').show();
            }
            else {
                $('.member-permission').hide();
            }

            currUserDetails.find(".user-apps").toggle();
            currUserDetails.find(".admin-apps").toggle();
            $(this).toggleClass("checked");
            $("#listof-apps").hide();
            $(".row").removeClass("selected");
        });
        $(".remove-time-ban").off("click").on('click', function() {
            var currUserDetails = $(".user-details:visible");
            var url = countlyCommon.API_PARTS.users.r + '/reset_timeban';
            var data = {
                username: currUserDetails.find(".username-text").val(),
                app_id: countlyCommon.ACTIVE_APP_ID
            };
            $.ajax({
                url: url,
                data: data,
                dataType: "json",
                success: function() {
                    CountlyHelpers.notify({
                        title: jQuery.i18n.map["management-users.remove-ban-notify-title"],
                        message: jQuery.i18n.map["management-users.remove-ban-notify-message"]
                    });
                    $('.blocked-user-row').hide();
                }
            });
        });
        $(".lock-account").off("click").on('click', function() {
            $(this).toggleClass("checked");
            $("#listof-apps").hide();
            $(".row").removeClass("selected");
        });
        $(".generate-password").off("click").on('click', function() {
            $(".create-user-drawer #password-text").val(CountlyHelpers.generatePassword(countlyGlobal.security.password_min));
        });

        $(".change-password").off("click").on('click', function() {
            $(this).parents(".row").next().toggle();
            $(".manage-users-table .detail .password-text").off("focus").on("focus", function() {
                $(this).select();
            });
        });

        $('body').off('change', '.pp-uploader').on('change', '.pp-uploader', function() {
            $('.pp-menu-list').hide();
            var member_id = $(this).data('member-id');
            CountlyHelpers.upload($(this), "/member/icon",
                {
                    _csrf: countlyGlobal.csrf_token,
                    member_image_id: member_id
                },
                function(err, data) {
                    if (!err) {
                        $('.member-image-path').val(data);
                        $('#pp-circle-' + member_id).find('span').hide();
                        $('#pp-circle-' + member_id).css({'background-image': 'url("' + data + '?now=' + Date.now() + '")', 'background-size': '100%', 'background-position': '0 0'});
                        if (member_id === countlyGlobal.member._id) {
                            $('.member_image').html("");
                            $('.member_image').css({'background-image': 'url("' + data + '?now=' + Date.now() + '")', 'background-size': '100%', 'background-position': '0 0'});
                        }
                    }
                    else {
                        CountlyHelpers.notify(jQuery.i18n.map["plugins.errors"]);
                    }
                }
            );
        });

        $('.delete-member-image').on('click', function() {
            var member_id = $(this).data('member-id');
            $('.member-image-path').val("delete");
            var defaultAvatarSelector = countlyGlobal.member.created_at % 16 * 30;
            var name = countlyGlobal.member.full_name.split(" ");
            $('.member_image').css({'background-image': 'url("images/avatar-sprite.png")', 'background-position': defaultAvatarSelector + 'px', 'background-size': '510px 30px', 'text-align': 'center'});
            $('.pp-menu-list > div:nth-child(2)').css({'display': 'none'});
            $('#pp-circle-' + member_id).prepend('<span style="text-style:uppercase">' + name[0][0] + name[name.length - 1][0] + '</span>');
            if (member_id === countlyGlobal.member._id) {
                $('.member_image').html("");
                $('.member_image').css({'background-image': 'url("images/avatar-sprite.png?now=' + Date.now() + '")', 'background-position': defaultAvatarSelector + 'px', 'background-size': '510px 30px', 'text-align': 'center'});
                $('.member_image').prepend('<span style="text-style: uppercase;color: white; position: absolute; top: 5px; left: 6px; font-size: 16px;">' + name[0][0] + name[name.length - 1][0] + '</span>');
            }
        });

        $('body').off('blur', '.pp-menu-list').on('blur', '.pp-menu-list', function() {
            $('.pp-menu-list').hide();
        });

        $('body').off('click', '.pp-menu-trigger').on('click', '.pp-menu-trigger', function() {
            $('.pp-menu-list').show();
            $('.pp-menu-list').focus();
        });
    }
});

window.EventsBlueprintView = countlyView.extend({
    beforeRender: function() {
        this.selectedEventGroups = {};
        this.selectedEventGroupsName = {};
        this.selectedEventGroupsIds = [];
        this.selectedEventGroupsNames = [];
    },
    initialize: function() {
        var previousEvent = countlyCommon.getPersistentSettings()["activeEvent_" + countlyCommon.ACTIVE_APP_ID];
        if (previousEvent) {
            countlyEvent.setActiveEvent(previousEvent);
        }
        this.template = Handlebars.compile($("#template-events-blueprint").html());
        this.textLimit = 100;

    },
    initializeTabs: function() {
        var self = this;
        var urlPref = "#/analytics/manage-events/";
        if (countlyCommon.APP_NAMESPACE !== false) {
            urlPref = "#/" + countlyCommon.ACTIVE_APP_ID + "/analytics/manage-events/";
        }
        this.tabs = $("#tabs").tabs();
        this.tabs.on("tabsactivate", function(event, ui) {
            $(window).trigger("resize"); //DATA TABLES HACK FOR STICKY HEADERS
            if (ui && ui.newPanel) {
                var tab = ($(ui.newPanel).attr("id") + "").replace("events-", "");
                self._tab = tab;
                if (tab && tab.length) {
                    Backbone.history.noHistory(urlPref + tab);
                }
            }
        });
    },
    pageScript: function() {
        var self = this;
        //submenu switch
        $(".event-container").unbind("click");
        $(".event-container").on("click", function() {
            var tmpCurrEvent = $(this).attr("data-key") || "";
            tmpCurrEvent = countlyCommon.encodeHtml(tmpCurrEvent);
            var myitem = this;
            if ($("#events-apply-changes").css('display') === "none") {
                $(".event-container").removeClass("active");
                $(myitem).addClass("active");
                if (tmpCurrEvent !== "") {
                    self.selectedSubmenu = tmpCurrEvent;
                    countlyEvent.setActiveEvent(tmpCurrEvent, function() {
                        self.refresh(true, true);
                    });
                }
                else {
                    self.selectedSubmenu = "";
                    countlyEvent.setActiveEvent(tmpCurrEvent, function() {
                        self.refresh(true, false);
                    });
                }
            }
            else {
                CountlyHelpers.confirm(jQuery.i18n.map["events.general.want-to-discard"], "popStyleGreen", function(result) {
                    if (!result) {
                        return true;
                    }

                    $(".event-container").removeClass("active");
                    $(myitem).addClass("active");
                    if (tmpCurrEvent !== "") {
                        self.selectedSubmenu = tmpCurrEvent;
                        countlyEvent.setActiveEvent(tmpCurrEvent, function() {
                            self.refresh(true, true);
                        });
                    }
                    else {
                        self.selectedSubmenu = "";
                        countlyEvent.setActiveEvent(tmpCurrEvent, function() {
                            self.refresh(true, false);
                        });
                    }
                }, [jQuery.i18n.map["common.no-dont-continue"], jQuery.i18n.map['common.yes-discard']], {title: jQuery.i18n.map["events.general.want-to-discard-title"], image: "empty-icon"});
            }
        });

        //General settings drag and drop sorting
        $(".events-table").sortable({
            items: "tbody tr",
            revert: true,
            handle: "td:first-child",
            helper: function(e, elem) {
                elem.children().each(function() {
                    $(this).width($(this).width());
                });
                elem.addClass("moving");
                elem.css("width", (parseInt(elem.width())) + "px");//to not go over line
                return elem;
            },
            cursor: "move",
            containment: "parent",
            tolerance: "pointer",
            placeholder: "event-row-placeholder",
            stop: function(e, elem) {
                elem.item.removeClass("moving");
                $("#events-apply-order").css('display', 'block');
            }
        });


        var segments = [];
        var i = 0;
        if (self.activeEvent && self.activeEvent.segments && self.activeEvent.omittedSegments) {
            for (i = 0; i < self.activeEvent.segments.length; i++) {
                segments.push({"key": self.activeEvent.segments[i], "value": self.activeEvent.segments[i]});
            }
            for (i = 0; i < self.activeEvent.omittedSegments.length; i++) {
                segments.push({"key": self.activeEvent.omittedSegments[i], "value": self.activeEvent.omittedSegments[i]});
            }
        }

        $('#event-management-projection').selectize({
            plugins: ['remove_button'],
            persist: false,
            maxItems: null,
            valueField: 'key',
            labelField: 'key',
            searchField: ['key'],
            delimiter: ',',
            options: segments,
            items: self.activeEvent.omittedSegments,
            render: {
                item: function(item) {
                    return '<div>' +
                        countlyCommon.encodeHtml(item.key) +
                        '</div>';
                },
                option: function(item) {
                    var label = item.key;
                    //var caption = item.key;
                    return '<div>' +
                        '<span class="label">' + label + '</span>' +
                        '</div>';
                }
            },
            createFilter: function() {
                return true;
            },
            create: function(input) {
                return {
                    "key": input
                };
            },
            onChange: function() {
                self.check_changes();
                this.$control_input.css('width', '40px');
            }
        });

        $("#events-apply-changes").css('display', 'none');
        self.preventHashChange = false;
        $("#events-apply-order").css('display', 'none');
        $("#events-general-action").addClass("disabled");

        CountlyHelpers.initializeTableOptions($("#events-custom-settings-table"));
        $(".cly-button-menu").on("cly-list.click", function(event, data) {
            if (!$(data.target).parents("#events-custom-settings-table").length) {
                return;
            }

            var id = $(data.target).parents("tr").data("id");
            var name = $(data.target).parents("tr").data("name");
            var visibility = $(data.target).parents("tr").data("visible");
            if (id) {
                $(".event-settings-menu").find(".delete_single_event").data("id", id);
                $(".event-settings-menu").find(".delete_single_event").data("name", name);
                $(".event-settings-menu").find(".event_toggle_visibility").data("id", id);
                if (visibility === true) {
                    $(".event-settings-menu").find(".event_toggle_visibility[data-changeto=hide]").show();
                    $(".event-settings-menu").find(".event_toggle_visibility[data-changeto=show]").hide();
                }
                else {
                    $(".event-settings-menu").find(".event_toggle_visibility[data-changeto=hide]").hide();
                    $(".event-settings-menu").find(".event_toggle_visibility[data-changeto=show]").show();
                }
            }
        });
    },
    initEventGroupDrawer: function() {
        var self = this;
        this.eventGroupDrawer = CountlyHelpers.createDrawer({
            id: "event-group-drawer",
            form: $('#event-groups-blueprint-drawer'),
            title: jQuery.i18n.map["events.event-group-drawer-create"],
            applyChangeTriggers: false,
            resetForm: function() {
                $(self.eventGroupDrawer).find('.title span').first().html(jQuery.i18n.map["events.event-group-drawer-create"]);
                $("#current_group_id").text('');
                $("#group-name-input").val('');
                $("#event-group-description").val("");
                $("#event-group-include-events-dropdown").clyMultiSelectClearSelection({});
                $("#group-count-input").val('');
                $("#group-sum-input").val('');
                $("#group-duration-input").val('');

                $("#create-widget").show();
                self.checkEventGroupDrawerInterval = setInterval(function() {
                    self.checkEventGroupDrawerDisabled();
                    if (!app.activeView.eventGroupDrawer) {
                        clearInterval(self.checkEventGroupDrawerInterval);
                    }
                }, 1000);
            },
            onClosed: function() {
                $(".grid-stack-item").removeClass("marked-for-editing");
                clearInterval(self.checkEventGroupDrawerInterval);
            }
        });

        this.eventGroupDrawer.init();
        $("#event-group-drawer #use-description-checkbox").off("click").on("click", function(e) {
            var checked = e.target.checked;
            if (checked) {
                $("#event-group-description").attr("disabled", false);
            }
            else {
                $("#event-group-description").val("");
                $("#event-group-description").attr("disabled", true);
            }
        });

        $("#event-group-drawer .on-off-switch input").on("change", function() {
            var isChecked = $(this).is(":checked");
            // var id = $(this).attr("id");
            if (isChecked) {
                $(this).parent().find(".text").replaceWith('<span style="opacity: 1" class="text">' + jQuery.i18n.map["events.group-visibility-checkbox"] + '</span>');
            }
            else {
                $(this).parent().find(".text").replaceWith('<span class="text">' + jQuery.i18n.map["events.group-invisibility-checkbox"] + '</span>');
            }
        });

        var events = countlyEvent.getEvents(true);
        var tableData = [];
        for (var i = 0; i < events.length; i++) {
            if (!events[i].is_event_group) {
                tableData.push({value: events[i].key, name: events[i].name});
            }
        }
        $("#event-group-include-events-dropdown").clyMultiSelectSetItems(tableData);
        $("#event-group-drawer #save-widget").hide();
        $("#event-group-drawer #create-widget").addClass("disabled");

        $("#event-group-drawer #create-widget").off("click").on("click", function() {
            countlyEvent.createEventGroup(JSON.stringify(self.getEventGroupDrawerSetting()), function(res) {
                if (res === true) {
                    CountlyHelpers.notify({type: "ok", title: jQuery.i18n.map["common.success"], message: jQuery.i18n.map["events.general.changes-saved"], sticky: false, clearAll: true});
                    self.refresh(true, false);
                }
                else {
                    CountlyHelpers.alert(jQuery.i18n.map["events.general.update-not-successful"], "red");
                }
            });
            self.eventGroupDrawer.close();
        });
        $("#event-group-drawer #save-widget").off("click").on("click", function() {
            countlyEvent.updateEventGroup(JSON.stringify(self.getEventGroupDrawerSetting()), "", "", "", function(res) {
                if (res === true) {
                    CountlyHelpers.notify({type: "ok", title: jQuery.i18n.map["common.success"], message: jQuery.i18n.map["events.general.changes-saved"], sticky: false, clearAll: true});
                    self.refresh(true, false);
                }
                else {
                    CountlyHelpers.alert(jQuery.i18n.map["events.general.update-not-successful"], "red");
                }
            });
            self.eventGroupDrawer.close();
        });
    },
    getEventGroupDrawerSetting: function() {
        var groupInstance = {
            name: $("#group-name-input").val() || null,
            description: null,
            app_id: countlyCommon.ACTIVE_APP_ID,
            source_events: null,
            status: $("#event-group-drawer .on-off-switch input").is(":checked"),
            display_map: {
                c: $("#group-count-input").val() || null,
                d: $("#group-duration-input").val() || null,
                s: $("#group-sum-input").val() || null
            }
        };

        if (!$("#event-group-description").prop("disabled")) {
            groupInstance.description = $("#event-group-description").val() || null;
        }
        else {
            groupInstance.description = "";
        }

        if ($("#current_group_id").text().length > 0) {
            groupInstance._id = $("#current_group_id").text();
        }

        var source_events = $("#event-group-include-events-dropdown").clyMultiSelectGetSelection();
        if (source_events.length > 0) {
            groupInstance.source_events = source_events;
        }
        return groupInstance;
    },
    checkEventGroupDrawerDisabled: function() {
        var groupConfig = this.getEventGroupDrawerSetting();
        $("#create-widget").removeClass("disabled");
        $("#save-widget").removeClass("disabled");
        for (var key in groupConfig) {
            if (groupConfig[key] === null) {
                $("#create-widget").addClass("disabled");
                $("#save-widget").addClass("disabled");
            }
        }
    },
    loadEventGroupDrawerSetting: function(data) {
        this.eventGroupDrawer.resetForm();
        $("#current_group_id").text(data._id);
        $("#group-name-input").val(_.unescape(data.name));
        var eventsOptions = data.source_events.map(function(e) {
            return {value: e, name: e};
        });
        $("#event-group-include-events-dropdown").clyMultiSelectSetSelection(eventsOptions);
        if (data.description) {
            $("#event-group-drawer #use-description-checkbox").attr("checked", true);
            $("#event-group-description").attr("disabled", false);
            $("#event-group-description").val(_.unescape(data.description));
        }
        else {
            $("#event-group-drawer #use-description-checkbox").attr("checked", false);
            $("#event-group-description").val("");
            $("#event-group-description").attr("disabled", true);
        }
        if (data.status) {
            $("#event-group-drawer .on-off-switch input").attr("checked", true);
        }
        else {
            $("#event-group-drawer .on-off-switch input").attr("checked", false);
        }

        $("#group-count-input").val(_.unescape(data.display_map.c));
        $("#group-duration-input").val(_.unescape(data.display_map.d));
        $("#group-sum-input").val(_.unescape(data.display_map.s));

        // todo: more properties
        window.dd = this.eventGroupDrawer;

        $(this.eventGroupDrawer).find('.title span').first().html(jQuery.i18n.map["events.edit-your-group"]);
        $(this.evntGroupDrawer).addClass("open editing");
        $("#create-widget").hide();
        $("#save-widget").show();
    },
    eventGroupSettingMenu: function() {
        var self = this;
        $(".cly-button-menu").on("cly-list.click", function(event, data) {
            if (!$(data.target).parents("#event-groups-settings-table").length) {
                return;
            }

            var id = $(data.target).parents("tr").attr("id");
            var name = $(data.target).parents("tr").attr("name");
            var visibility = $(data.target).parents("tr").attr("status");
            if (id) {
                $(".event-groups-settings-menu").find(".delete_single_event").attr("id", id);
                $(".event-groups-settings-menu").find(".delete_single_event").attr("name", name);
                $(".event-groups-settings-menu").find(".event_toggle_visibility").attr("id", id);
                if (visibility === "true") {
                    $(".event-groups-settings-menu").find(".event_toggle_visibility[data-changeto=hide]").show();
                    $(".event-groups-settings-menu").find(".event_toggle_visibility[data-changeto=show]").hide();
                }
                else {
                    $(".event-groups-settings-menu").find(".event_toggle_visibility[data-changeto=hide]").hide();
                    $(".event-groups-settings-menu").find(".event_toggle_visibility[data-changeto=show]").show();
                }
            }
        });
        CountlyHelpers.initializeTableOptions($('#events-event-groups'));
        $("#new-event-group-button").off("click").on("click", function() {
            $("#save-widget").hide();
            self.eventGroupDrawer.resetForm();
            self.eventGroupDrawer.open();
        });

        $('.event-groups-table').find("tbody td .edit-event").off("click").on("click", function() {
            self.eventGroupDrawer.resetForm();
            self.eventGroupDrawer.open();
            countlyEvent.getEventGroupById($(this).attr("data-event-group-id"), function(result) {
                self.loadEventGroupDrawerSetting(result);
            });
        });
    },
    initEventGroupsTable: function() {
        var self = this;
        this.getEventGroups = countlyEvent.getEventGroupsTable();
        var aoColumns = [
            {
                "mData": function(row) {
                    return "<i class='fa fa-reorder event-order' data-event-group-order=\"" + row.order + "\" data-event-group-id=\"" + row._id + "\"></i>";
                },
                "bSortable": false,
                "sTitle": "",
                "sClass": 'events-blueprint-order',
                "sWidth": '30px',
            },
            {
                "mData": function(row) {
                    if (self.selectedEventGroups[row._id]) {
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
                "mData": function(row) {
                    return row.name + '<br>' + '<span style="margin-top:2px; opacity: 0.5;">' + row.source_events.length + 'events</span>';
                },
                "sType": "string",
                "sTitle": jQuery.i18n.map['events.general.event'],
                "bSortable": false
            },
            {
                "mData": function(row) {
                    if (row.status) {
                        return '<div class="event_visibility_row_visible"><i class="fa fa-eye"></i> ' + jQuery.i18n.map["events.general.status.visible"] + "</div>";
                    }
                    else {
                        return '<div class="event_visibility_row_hidden"><i class="fa fa-eye-slash"></i>' + jQuery.i18n.map["events.general.status.hidden"] + "</div>";
                    }
                },
                "sType": "string",
                "sTitle": jQuery.i18n.map["events.general.status"],
                "bSortable": false,
                "sWidth": "8%"
            },
            {
                "mData": function(row) {
                    return row.source_events.map(function(o) {
                        return o;
                    }).join("<br>");
                },
                "sType": "string",
                "sTitle": jQuery.i18n.map["events.blueprint-event-group-included-events"],
                "bSortable": false,
                "sWidth": "12%"
            },
            {
                "mData": function(row) {
                    if (!row.description) {
                        return '-';
                    }
                    return row.description;
                },
                "sType": "string",
                "sTitle": jQuery.i18n.map["events.general.event-description"],
                "bSortable": false,
            },
            {
                "mData": function(row) {
                    return "<div><button class='edit-event' data-event-group-id=" + row._id + ">" + jQuery.i18n.map["events.blueprint-edit"] + "</button><a class='cly-list-options'></a></div>";
                },
                "sType": "string",
                "sTitle": "",
                "sClass": 'shrink right',
                "sWidth": '100px',
                "bSortable": false,
                "bSearchable": false,
                "noExport": true
            }
        ];
        this.eventGroupsTable = $('.event-groups-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
            "aaData": this.getEventGroups,
            "fnRowCallback": function(nRow, aData) {
                $(nRow).attr("id", aData._id);
                $(nRow).attr("name", aData.name);
                $(nRow).attr("status", aData.status);
                $(nRow).css("height", "72px");
            },
            "aoColumns": aoColumns,
            "fnDrawCallback": function(oSettings) {
                $.fn.dataTable.defaults.fnDrawCallback(oSettings);
            }
        }));
        $("#event-group-general-filter").off("cly-select-change").on("cly-select-change", function(e, val) {
            if (val === "all") {
                self.eventGroupFilter = null;
            }
            else if (val === "hidden") {
                self.eventGroupFilter = false;
            }
            else if (val === "visible") {
                self.eventGroupFilter = true;
            }
            self.refresh(true);
        });
        $(".event-groups-table").sortable({
            items: "tbody tr",
            revert: true,
            handle: "td:first-child",
            helper: function(e, elem) {
                elem.children().each(function() {
                    $(this).width($(this).width());
                });
                elem.addClass("moving");
                elem.css("width", (parseInt(elem.width())) + "px");//to not go over line
                return elem;
            },
            cursor: "move",
            containment: "parent",
            tolerance: "pointer",
            placeholder: "event-row-placeholder",
            stop: function(e, elem) {
                elem.item.removeClass("moving");
                $("#event-groups-apply-order").css('display', 'block');
            }
        });
        $("#event-groups-apply-order").on("click", function() {
            var eventOrder = [];
            $("#events-event-groups .event-groups-table").find(".event-order").each(function() {
                if ($(this).attr("data-event-group-id")) {
                    eventOrder.push($(this).attr("data-event-group-id"));
                }
            });
            countlyEvent.updateEventGroup("", JSON.stringify(eventOrder), "", "", function(res) {
                if (res) {
                    var msg = {title: jQuery.i18n.map["common.success"], message: jQuery.i18n.map["events.general.changes-saved"], info: "", sticky: false, clearAll: true, type: "ok"};
                    CountlyHelpers.notify(msg);
                    self.resetSelection();
                }
                else {
                    CountlyHelpers.alert(jQuery.i18n.map["events.general.update-not-successful"], "red");
                }
            });
        });
        $("#event-groups-apply-order").css('display', 'none');
        this.eventGroupsTable.find("thead .check-green").click(function() {
            if ($(this).hasClass("fa-check-square")) {
                // $(".sticky-header .check-green").removeClass("fa-check-square").addClass("fa-square-o");
                self.eventGroupsTable.find(".check-green").removeClass("fa-check-square").addClass("fa-square-o");
                self.selectedEventGroups = {};
                self.selectedEventGroupsName = {};
                self.selectedEventGroupsIds = [];
                self.selectedEventGroupsNames = [];
                $("#event-groups-general-action").addClass("disabled");
            }
            else {
                // $(".sticky-header .check-green").removeClass("fa-square-o").addClass("fa-check-square");
                self.eventGroupsTable.find(".check-green").removeClass("fa-square-o").addClass("fa-check-square");
                self.eventGroupsTable.find(".check-green").parents("tr").each(function() {
                    var id = $(this).attr("id");
                    var name = $(this).attr("name");
                    if (id) {
                        if (!self.selectedEventGroups[id]) {
                            self.selectedEventGroupsIds.push(id);
                        }
                        self.selectedEventGroups[id] = true;
                        $("#event-groups-general-action").removeClass("disabled");
                    }
                    if (name) {
                        if (!self.selectedEventGroupsName[name]) {
                            self.selectedEventGroupsNames.push(name);
                        }
                        self.selectedEventGroupsName[name] = true;
                    }
                });
            }
        });
        $('.event-groups-table tbody ').off("click", "td:nth-child(2)").on("click", "td:nth-child(2)", function(e) {
            e.cancelBubble = true; // IE Stop propagation
            if (e.stopPropagation) {
                e.stopPropagation();
            } // Other Broswers
            var id = $(this).parent().attr("id");
            if (id) {
                if (self.selectedEventGroups[id]) {
                    $(this).find(".check-green").removeClass("fa-check-square").addClass("fa-square-o");
                    self.selectedEventGroups[id] = null;
                    var index = self.selectedEventGroupsIds.indexOf(id);
                    if (index !== -1) {
                        self.selectedEventGroupsIds.splice(index, 1);
                    }
                }
                else {
                    self.selectedEventGroups[id] = true;
                    self.selectedEventGroupsIds.push(id);
                    $(this).find(".check-green").removeClass("fa-square-o").addClass("fa-check-square");
                }

                if (self.selectedEventGroupsName[name]) {
                    self.selectedEventGroupsName[name] = null;
                    var k = self.selectedEventGroupsNames.indexOf(name);
                    if (k !== -1) {
                        self.selectedEventGroupsNames.splice(k, 1);
                    }
                }
                else {
                    self.selectedEventGroupsName[name] = true;
                    self.selectedEventGroupsNames.push(name);
                }

                if (self.selectedEventGroupsIds.length) {
                    $("#event-groups-general-action").removeClass("disabled");
                }
                else {
                    $("#event-groups-general-action").addClass("disabled");
                }
            }
        });
        $("#event-groups-general-action").off("cly-select-change").on("cly-select-change", function(e, selected) {
            if (selected !== "") {
                $(".event-groups-general-action").clySelectSetSelection("", jQuery.i18n.map["crashes.make-action"]);
                if (self.selectedEventGroupsIds.length === 0) {
                    CountlyHelpers.alert(jQuery.i18n.map["events.general.none-chosen"], "red");
                }
                else {
                    if (selected === "show" || selected === "hide") {
                        if (selected === "show") {
                            selected = true;
                        }
                        if (selected === "hide") {
                            selected = false;
                        }
                        countlyEvent.updateEventGroup("", "", JSON.stringify(self.selectedEventGroupsIds), selected, function(result) {
                            if (result === true) {
                                var msg = {title: jQuery.i18n.map["common.success"], message: jQuery.i18n.map["events.general.changes-saved"], info: "", sticky: false, clearAll: true, type: "ok"};
                                CountlyHelpers.notify(msg);
                                self.resetSelection();
                            }
                            else {
                                CountlyHelpers.alert(jQuery.i18n.map["events.general.update-not-successful"], "red");
                            }
                        });
                    }
                    else if (selected === "delete") {
                        var title = jQuery.i18n.map["events.general.want-delete-title"];
                        var msg = jQuery.i18n.prop("events.general.want-delete", "<b>" + self.selectedEventGroupsNames.join(", ") + "</b>");
                        if (self.selectedEventGroupsNames.join(", ").length > self.textLimit) {
                            var mz = jQuery.i18n.prop("events.delete.multiple-events", self.selectedEventGroupsNames.length);
                            msg = jQuery.i18n.prop("events.general.want-delete", "<b>" + mz + "</b>");
                        }
                        var yes_but = jQuery.i18n.map["events.general.yes-delete-events"];
                        if (self.selectedEventGroupsIds.length === 1) {
                            if (self.selectedEventGroupsNames[0].length > self.textLimit) {
                                self.selectedEventGroupsNames[0] = self.selectedEventGroupsNames[0].substr(0, self.textLimit) + "...";
                            }
                            msg = jQuery.i18n.prop("events.general.want-delete-this", "<b>" + self.selectedEventGroupsNames.join(", ") + "</b>");
                            title = jQuery.i18n.map["events.general.want-delete-this-title"];
                            yes_but = jQuery.i18n.map["events.general.yes-delete-event"];
                        }
                        CountlyHelpers.confirm(msg, "popStyleGreen", function(result) {
                            if (!result) {
                                return true;
                            }
                            countlyEvent.deleteEventGroup(JSON.stringify(self.selectedEventGroupsIds), function(result1) {
                                if (result1 === true) {
                                    var msg1 = {title: jQuery.i18n.map["common.success"], message: jQuery.i18n.map["events.general.events-deleted"], sticky: false, clearAll: true, type: "ok"};
                                    CountlyHelpers.notify(msg1);
                                    self.resetSelection();
                                }
                                else {
                                    CountlyHelpers.alert(jQuery.i18n.map["events.general.update-not-successful"], "red");
                                }
                            });
                        }, [jQuery.i18n.map["common.no-dont-delete"], yes_but], {title: title, image: "delete-an-event"});
                    }
                }
            }
        });
        self.eventGroupSettingMenu();
        $(".event-groups-settings-menu").on("cly-list.item", function(event, data) {
            var el = $(data.target).parent() || $(data.target);

            if (!el.parents(".event-groups-settings-menu").length) {
                return;
            }

            var id = el.attr("id") || $(data.target).attr("id");

            if (id) {
                if (el.hasClass("delete_single_event")) {
                    var eventName = el.attr("name");
                    if (eventName === "") {
                        eventName = id;
                    }
                    if (eventName.length > self.textLimit) {
                        eventName = eventName.substr(0, self.textLimit) + "...";
                    }
                    CountlyHelpers.confirm(jQuery.i18n.prop("events.general.want-delete-this", "<b>" + eventName + "</b>"), "popStyleGreen", function(result) {
                        if (!result) {
                            return true;
                        }
                        countlyEvent.deleteEventGroup(JSON.stringify([id]), function(result1) {
                            if (result1 === true) {
                                var msg1 = {title: jQuery.i18n.map["common.success"], message: jQuery.i18n.map["events.general.events-deleted"], sticky: false, clearAll: true, type: "ok"};
                                CountlyHelpers.notify(msg1);
                                self.resetSelection();
                            }
                            else {
                                CountlyHelpers.alert(jQuery.i18n.map["events.general.update-not-successful"], "red");
                            }
                        });
                    }, [jQuery.i18n.map["common.no-dont-delete"], jQuery.i18n.map['events.general.yes-delete-event']], {title: jQuery.i18n.map['events.general.want-delete-this-title'], image: "delete-an-event"});
                }
                else if (el.hasClass("event_toggle_visibility")) {
                    var toggleto = el.data("changeto");
                    if (toggleto === "show") {
                        toggleto = true;
                    }
                    if (toggleto === "hide") {
                        toggleto = false;
                    }
                    countlyEvent.updateEventGroup("", "", JSON.stringify([id]), toggleto, function(result) {
                        if (result === true) {
                            var msg = {title: jQuery.i18n.map["common.success"], message: jQuery.i18n.map["events.general.changes-saved"], info: "", sticky: false, clearAll: true, type: "ok"};
                            CountlyHelpers.notify(msg);
                            self.resetSelection();
                        }
                        else {
                            CountlyHelpers.alert(jQuery.i18n.map["events.general.update-not-successful"], "red");
                        }
                    });
                }
            }
        });
        $(".cly-button-menu-trigger").off("click").on("click", function(event) {
            event.stopPropagation();
            $(event.target).toggleClass("active");
            if ($(event.target).hasClass("active")) {
                $('.events-right-menu').focus();
                $(event.target).removeClass("disabled");
            }
            else {
                $(event.target).removeClass("active").addClass("disabled");
            }
        });
        $(".eb-event-group-include-events-tooltip").tooltipster({
            theme: ['tooltipster-borderless', 'tooltipster-borderless-customized'],
            contentCloning: true,
            interactive: true,
            trigger: 'hover',
            side: 'right',
            zIndex: 10001,
            maxWidth: 250,
            content: $.i18n.map["events.blueprint-event-groups-include-events-tooltip"]
        });
        $(".eb-event-group-properties-events-tooltip").tooltipster({
            theme: ['tooltipster-borderless', 'tooltipster-borderless-customized'],
            contentCloning: true,
            interactive: true,
            trigger: 'hover',
            side: 'right',
            zIndex: 10001,
            maxWidth: 250,
            content: $.i18n.map["events.blueprint-event-groups-properties-tooltip"]
        });
    },
    rightButtonsEvents: function() {
        var self = this;
        self.dtable.find("tbody tr").hover(function() {
            $(this).find(".edit-box").css({"visibility": "visible"});
            //$(this).find(".cly-list-options").addClass('cly-list-options-row');
            $(this).find(".edit-event").css({"visibility": "visible"});
        }, function() {
            $(this).find("td .edit-box").css({"visibility": "hidden"});
            //$(this).find(".cly-list-options").removeClass('cly-list-options-row');
            $(this).find(".edit-event").css({"visibility": "hidden"});
        });
    },
    rightButttonsEventGroups: function() {
        var self = this;
        $('.event-groups-table').find("tbody tr").hover(function() {
            $(this).find(".edit-box").css({"visibility": "visible"});
            //$(this).find(".cly-list-options").addClass('cly-list-options-row');
            $(this).find(".edit-event").css({"visibility": "visible"});
        }, function() {
            $(this).find("td .edit-box").css({"visibility": "hidden"});
            //$(this).find(".cly-list-options").removeClass('cly-list-options-row');
            $(this).find(".edit-event").css({"visibility": "hidden"});
        });
        self.eventGroupsTable.find("tbody td .edit-box").click(function() {
            self.eventGroupDrawer.resetForm();
            self.eventGroupDrawer.open();
            countlyEvent.getEventGroupById($(this).attr("data-event-group-id"), function(result) {
                self.loadEventGroupDrawerSetting(result);
            });
        });
    },
    resetSelection: function() {
        this.selectedEventGroups = {};
        this.selectedEventGroupsIds = [];
        this.selectedEventGroupsName = {};
        this.selectedEventGroupsNames = [];
        this.eventGroupsTable.find(".check-green").removeClass("fa-check-square").addClass("fa-square-o");
        $("#event-groups-general-action").addClass("disabled");
        $("#event-groups-apply-order").css('display', 'none');
        this.refresh(true);
    },
    renderCommon: function(isRefresh) {
        var eventData = countlyEvent.getEventData();
        var self = this;

        this.activeEvent = "";

        /**
         * Function to fetch events table data
         * @returns {Array} table data - table data
         */
        function fetchEventsTableData() {
            var em = countlyEvent.getEvents(true);
            var td = [];
            for (var k = 0; k < em.length; k++) {
                if (em[k].is_active === true) {
                    this.activeEvent = em[k];
                }
                if (!em[k].is_event_group) {
                    td.push(em[k]);
                }
            }

            return td;
        }

        var eventmap = countlyEvent.getEvents(true);
        var tableData = fetchEventsTableData();
        this.tableData = tableData;

        this.have_drill = false;
        if (countlyGlobal.plugins && countlyGlobal.plugins.indexOf("drill") > -1) {
            this.have_drill = true;
        }

        var for_general = countlyEvent.getEventMap(true);
        var keys = Object.keys(for_general);
        var allCount = keys.length;
        var visibleCount = 0;
        var hiddenCount = 0;
        for (var i = 0; i < keys.length; i++) {
            if (for_general[keys[i]].is_visible === false) {
                hiddenCount++;
            }
            else {
                visibleCount++;
            }

            if (for_general[keys[i]].is_visible !== self.visibilityFilter && (self.visibilityFilter === true || self.visibilityFilter === false)) {
                delete for_general[keys[i]];
            }
        }

        this.templateData = {
            "page-title": eventData.eventName.toUpperCase(),
            "logo-class": "events",
            "events": eventmap,
            "event-map": for_general,
            "submenu": this.selectedSubmenu || "",
            "active-event": this.activeEvent || eventmap[0],
            "visible": jQuery.i18n.map["events.general.status.visible"],
            "hidden": jQuery.i18n.map["events.general.status.hidden"],
            "allCount": allCount,
            "hiddenCount": hiddenCount,
            "visibleCount": visibleCount,
            "have_drill": this.have_drill
        };
        if (hiddenCount === 0 && self.visibilityFilter === false) {
            this.templateData.onlyMessage = jQuery.i18n.map["events.general.no-hidden-events"];
        }

        if (visibleCount === 0 && self.visibilityFilter === true) {
            this.templateData.onlyMessage = jQuery.i18n.map["events.general.no-visible-events"];
        }


        if (countlyEvent.getEvents(true).length === 0) {
            //recheck events
            $.when(countlyEvent.refreshEvents()).then(function() {
                //if still 0, display error
                if (countlyEvent.getEvents().length === 0) {
                    window.location.hash = "/analytics/events";
                }
                else {
                    //reload the view
                    app.renderWhenReady(app.eventsView);
                    self.refresh(true);
                }
            });
            return true;
        }

        if (!isRefresh) {
            this.visibilityFilter = "";
            this.selectedSubmenu = "";
            this.templateData.submenu = "";
            this.columns = [
                {
                    "mData": function(/*row, type*/) {
                        return '<i class="fa fa-reorder event-order"></i>';
                    },
                    "sType": "string",
                    "sTitle": "",
                    "bSortable": false,
                    "sClass": "center"
                },
                {
                    "mData": function(row) {
                        return '<a class="fa fa-square-o check-green check-header select-event-check" data-event-name="' + row.name + '" data-event-key="' + row.key + '"></a>';
                    },
                    "sType": "string",
                    "sTitle": '<a id="select-all-events" class="fa fa-square-o check-green check-header"></a>',
                    "bSortable": false,
                    "sClass": "center"
                },
                {
                    "mData": function(row) {
                        return row.name;
                    },
                    "sType": "string",
                    "sTitle": jQuery.i18n.map["events.general.event"],
                    "bSortable": false,
                    "sClass": "events-edit-name-field"
                },
                {
                    "mData": function(row) {
                        if (row.is_visible) {
                            return '<div class="event_visibility_row_visible"><i class="fa fa-eye"></i> ' + jQuery.i18n.map["events.general.status.visible"] + "</div>";
                        }
                        else {
                            return '<div class="event_visibility_row_hidden"><i class="fa fa-eye-slash"></i>' + jQuery.i18n.map["events.general.status.hidden"] + "</div>";
                        }
                    },
                    "sType": "string",
                    "sTitle": jQuery.i18n.map["events.general.status"],
                    "bSortable": false
                },

                {
                    "mData": function(row) {
                        if (row.description) {
                            return row.description;
                        }
                        else {
                            return "-";
                        }
                    },
                    "sType": "string",
                    "sTitle": jQuery.i18n.map["events.general.event-description"],
                    "bSortable": false,
                    "sClass": "events-edit-description-field"
                },
                {
                    "mData": function() {
                        return "<div><button class='edit-event'>" + jQuery.i18n.map["events.blueprint-edit"] + "</button><a class='cly-list-options'></a></div>";
                    },
                    "sType": "string",
                    "sTitle": "",
                    "sClass": 'shrink right',
                    "sWidth": '100px',
                    "bSortable": false,
                    "bSearchable": false,
                    "noExport": true
                },
            ];

            $(this.el).html(this.template(this.templateData));
            self.initializeTabs();
            var index = $(".ui-tabs-panel", self.tabs).index($("#events-" + self._tab));
            if (index !== -1) {
                self.tabs.tabs("option", "active", index);
            }
            self.initEventGroupsTable();
            this.dtable = $('.events-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": tableData,
                "aoColumns": this.columns,
                "fnRowCallback": function(nRow, aData) {
                    $(nRow).attr("data-id", aData.key);
                    $(nRow).attr("data-name", aData.name);
                    $(nRow).attr("data-visible", aData.is_visible);
                    $(nRow).css("height", "72px");
                }
            }));

            $(".events-table").stickyTableHeaders();

            self.check_changes();
            self.pageScript();

            $("#events-event-settings").on("change", ".on-off-switch input", function() {
                self.check_changes();
            });

            $("#events-event-settings").on("keyup", "input", function() {
                self.check_changes();
            });

            $("#events-event-settings").on("keyup", "textarea", function() {
                self.check_changes();
            });

            //General settings, select all checkbox
            $("#events-custom-settings-table").on("click", "#select-all-events", function() {
                var isChecked = $(this).hasClass("fa-check-square");//is now checked
                if (isChecked) {
                    $(this).addClass("fa-square-o");
                    $(this).removeClass("fa-check-square");
                    $(".events-table .select-event-check").addClass("fa-square-o");
                    $(".events-table .select-event-check").removeClass("fa-check-square");
                }
                else {
                    $(this).removeClass("fa-square-o");
                    $(this).addClass("fa-check-square");
                    $(".events-table .select-event-check").removeClass("fa-square-o");
                    $(".events-table .select-event-check").addClass("fa-check-square");
                }
                if ($('.select-event-check.fa-check-square').length > 0) {
                    $('#events-general-action').removeClass('disabled');
                }
                else {
                    $('#events-general-action').addClass('disabled');
                }
            });

            //General - checkbooxes in each line:
            $("#events-custom-settings-table").on("click", ".select-event-check", function() {
                var isChecked = $(this).hasClass("fa-check-square");//is now checked
                if (isChecked) {
                    $(this).addClass("fa-square-o");
                    $(this).removeClass("fa-check-square");
                }
                else {
                    $(this).removeClass("fa-square-o");
                    $(this).addClass("fa-check-square");
                }

                if ($('.select-event-check.fa-check-square').length > 0) {
                    $('#events-general-action').removeClass('disabled');
                }
                else {
                    $('#events-general-action').addClass('disabled');
                }
            });

            //General, apply new order
            $("#events-apply-order").on("click", function() {
                var eventOrder = [];
                $("#events-custom-settings .events-table").find(".select-event-check").each(function() {
                    if ($(this).attr("data-event-key")) {
                        eventOrder.push($(this).attr("data-event-key"));
                    }
                });
                countlyEvent.update_map("", JSON.stringify(eventOrder), "", "", function(result) {
                    if (result === true) {
                        var msg = {title: jQuery.i18n.map["common.success"], message: jQuery.i18n.map["events.general.changes-saved"], info: "", sticky: false, clearAll: true, type: "ok"};
                        CountlyHelpers.notify(msg);
                        self.refresh(true, false);
                    }
                    else {
                        CountlyHelpers.alert(jQuery.i18n.map["events.general.update-not-successful"], "red");
                    }
                });
            });

            $("#events-general-filter").on("cly-select-change", function(e, selected) {
                if (selected) {
                    if (selected === 'hidden') {
                        self.visibilityFilter = false;
                    }
                    else if (selected === 'visible') {
                        self.visibilityFilter = true;
                    }
                    else {
                        self.visibilityFilter = "";
                    }
                    self.refresh(true);
                }
            });
            //actions change
            $("#events-general-action").on("cly-select-change", function(e, selected) {
                if (selected) {
                    var changeList = [];
                    var nameList = [];
                    $("#events-custom-settings-table").find(".select-event-check").each(function() {
                        if ($(this).attr("data-event-key") && $(this).hasClass("fa-check-square")) {
                            changeList.push($(this).attr("data-event-key"));

                            if ($(this).attr("data-event-name") && $(this).attr("data-event-name") !== "") {
                                nameList.push($(this).attr("data-event-name"));
                            }
                            else {
                                nameList.push($(this).attr("data-event-key"));
                            }
                        }
                    });

                    if (changeList.length === 0) {
                        CountlyHelpers.alert(jQuery.i18n.map["events.general.none-chosen"], "red");
                    }
                    else {
                        if (selected === "show" || selected === "hide") {
                            countlyEvent.update_visibility(changeList, selected, function(result) {
                                if (result === true) {
                                    var msg = {title: jQuery.i18n.map["common.success"], message: jQuery.i18n.map["events.general.changes-saved"], info: "", sticky: false, clearAll: true, type: "ok"};
                                    CountlyHelpers.notify(msg);
                                    self.refresh(true, false);
                                }
                                else {
                                    CountlyHelpers.alert(jQuery.i18n.map["events.general.update-not-successful"], "red");
                                }
                            });
                        }
                        else if (selected === "delete") {
                            var title = jQuery.i18n.map["events.general.want-delete-title"];
                            var msg = jQuery.i18n.prop("events.general.want-delete", "<b>" + nameList.join(", ") + "</b>");
                            if (nameList.join(", ").length > self.textLimit) {
                                var mz = jQuery.i18n.prop("events.delete.multiple-events", nameList.length);
                                msg = jQuery.i18n.prop("events.general.want-delete", "<b>" + mz + "</b>");
                            }
                            var yes_but = jQuery.i18n.map["events.general.yes-delete-events"];
                            if (changeList.length === 1) {
                                if (nameList[0].length > self.textLimit) {
                                    nameList[0] = nameList[0].substr(0, self.textLimit) + "...";
                                }
                                msg = jQuery.i18n.prop("events.general.want-delete-this", "<b>" + nameList.join(", ") + "</b>");
                                title = jQuery.i18n.map["events.general.want-delete-this-title"];
                                yes_but = jQuery.i18n.map["events.general.yes-delete-event"];
                            }
                            CountlyHelpers.confirm(msg, "popStyleGreen", function(result) {
                                if (!result) {
                                    return true;
                                }
                                countlyEvent.delete_events(changeList, function(result1) {
                                    if (result1 === true) {
                                        var msg1 = {title: jQuery.i18n.map["common.success"], message: jQuery.i18n.map["events.general.events-deleted"], sticky: false, clearAll: true, type: "ok"};
                                        CountlyHelpers.notify(msg1);

                                        self.refresh(true, false);
                                    }
                                    else {
                                        CountlyHelpers.alert(jQuery.i18n.map["events.general.update-not-successful"], "red");
                                    }
                                });
                            }, [jQuery.i18n.map["common.no-dont-delete"], yes_but], {title: title, image: "delete-an-event"});
                        }
                    }
                    $("#events-general-action").clySelectSetSelection("", jQuery.i18n.map["events.general.action.perform-action"]);
                }
            });

            //save chenges for one event
            $("#events-apply-changes").on("click", function() {
                var eventMap = {};
                var eventKey = $("#events-settings-table").find(".event_key").val();
                eventMap[eventKey] = {};
                var omitted_segments = {};

                if ($("#events-settings-table").find(".event_name").val() !== "" && $("#events-settings-table").find(".event_name").val() !== eventKey) {
                    eventMap[eventKey].name = $("#events-settings-table").find(".event_name").val();
                }
                if ($("#events-settings-table").find(".event_count").val() !== "") {
                    eventMap[eventKey].count = $("#events-settings-table").find(".event_count").val();
                }
                if ($("#events-settings-table").find(".event_description").val() !== "") {
                    eventMap[eventKey].description = $("#events-settings-table").find(".event_description").val();
                }
                if ($("#events-settings-table").find(".event_sum").val() !== "") {
                    eventMap[eventKey].sum = $("#events-settings-table").find(".event_sum").val();
                }
                if ($("#events-settings-table").find(".event_dur").val() !== "") {
                    eventMap[eventKey].dur = $("#events-settings-table").find(".event_dur").val();
                }
                var ch = $("#events-settings-table").find(".event_visible").first();
                if ($(ch).is(":checked") === true) {
                    eventMap[eventKey].is_visible = true;
                }
                else {
                    eventMap[eventKey].is_visible = false;
                }
                omitted_segments[eventKey] = $('#event-management-projection').val() || [];

                if (self.compare_arrays(omitted_segments[eventKey], self.activeEvent.omittedSegments) && omitted_segments[eventKey].length > 0) {
                    CountlyHelpers.confirm(jQuery.i18n.map["event.edit.omitt-warning"], "red", function(result) {
                        if (!result) {
                            return true;
                        }
                        countlyEvent.update_map(JSON.stringify(eventMap), "", "", JSON.stringify(omitted_segments), function(result1) {
                            if (result1 === true) {
                                CountlyHelpers.notify({type: "ok", title: jQuery.i18n.map["common.success"], message: jQuery.i18n.map["events.general.changes-saved"], sticky: false, clearAll: true});
                                self.refresh(true, false);
                            }
                            else {
                                CountlyHelpers.alert(jQuery.i18n.map["events.general.update-not-successful"], "red");
                            }
                        });
                    });
                }
                else {
                    countlyEvent.update_map(JSON.stringify(eventMap), "", "", JSON.stringify(omitted_segments), function(result) {
                        if (result === true) {
                            CountlyHelpers.notify({type: "ok", title: jQuery.i18n.map["common.success"], message: jQuery.i18n.map["events.general.changes-saved"], sticky: false, clearAll: true});
                            self.refresh(true, false);
                        }
                        else {
                            CountlyHelpers.alert(jQuery.i18n.map["events.general.update-not-successful"], "red");
                        }
                    });
                }
            });

            if (this.selectedSubmenu === "") {
                $('#events-event-settings').css("display", "none");
                $('#events-custom-settings').css("display", "block");
            }
            else {
                $('#events-event-settings').css("display", "block");
                $('#events-custom-settings').css("display", "none");
            }

            $(".event-settings-menu").on("cly-list.item", function(event1, data) {
                var el = $(data.target).parent() || $(data.target);

                if (!el.parents(".event-settings-menu").length) {
                    return;
                }

                var event = el.data("id") || $(data.target).data("id");

                if (event) {
                    if (el.hasClass("delete_single_event")) {
                        var eventName = el.data('name');
                        if (eventName === "") {
                            eventName = event;
                        }

                        if (eventName.length > self.textLimit) {
                            eventName = eventName.substr(0, self.textLimit) + "...";
                        }
                        CountlyHelpers.confirm(jQuery.i18n.prop("events.general.want-delete-this", "<b>" + eventName + "</b>"), "popStyleGreen", function(result) {
                            if (!result) {
                                return true;
                            }
                            countlyEvent.delete_events([event], function(result1) {
                                if (result1 === true) {
                                    var msg = {title: jQuery.i18n.map["common.success"], message: jQuery.i18n.map["events.general.events-deleted"], info: "", sticky: false, clearAll: true, type: "ok"};
                                    CountlyHelpers.notify(msg);
                                    self.refresh(true, false);
                                }
                                else {
                                    CountlyHelpers.alert(jQuery.i18n.map["events.general.update-not-successful"], "red");
                                }
                            });
                        }, [jQuery.i18n.map["common.no-dont-delete"], jQuery.i18n.map['events.general.yes-delete-event']], {title: jQuery.i18n.map['events.general.want-delete-this-title'], image: "delete-an-event"});
                    }
                    else if (el.hasClass("event_toggle_visibility")) {
                        var toggleto = el.data("changeto");

                        countlyEvent.update_visibility([event], toggleto, function(result) {
                            if (result === true) {
                                var msg = {title: jQuery.i18n.map["common.success"], message: jQuery.i18n.map["events.general.changes-saved"], info: "", sticky: false, clearAll: true, type: "ok"};
                                CountlyHelpers.notify(msg);
                                self.refresh(true, false);
                            }
                            else {
                                CountlyHelpers.alert(jQuery.i18n.map["events.general.update-not-successful"], "red");
                            }
                        });
                    }
                }
            });
            self.rightButtonsEvents();
            self.rightButttonsEventGroups();

            self.initEventGroupDrawer();
            this.dtable.on('click', '.edit-event', function() {
                var key = $(this).parents("tr").data("id");
                var td = fetchEventsTableData();
                var event = td.filter(function(e) {
                    return e.key === key;
                });

                if (!event.length) {
                    return;
                }

                event = event[0];

                $("#events-blueprint-drawer").addClass("open");
                $('#eb-key-name').val(_.unescape(event.key));
                $('#eb-event-name').val(_.unescape(event.name));
                $('#eb-duration-name').val(_.unescape(event.dur));
                $('#eb-sum-name').val(_.unescape(event.sum));
                $('#eb-count-name').val(_.unescape(event.count));
                $('#eb-event-desc-input').val(_.unescape(event.description));

                var segments = [];
                event.segments = event.segments || [];
                for (var j = 0; j < event.segments.length; j++) {
                    segments.push({name: event.segments[j], value: event.segments[j]});
                }

                var omittedSegments = [];
                event.omittedSegments = event.omittedSegments || [];
                for (var k = 0; k < event.omittedSegments.length; k++) {
                    omittedSegments.push({name: event.omittedSegments[k], value: event.omittedSegments[k]});
                }

                self.activeEvent.omittedSegments = event.omittedSegments;
                $("#eb-multi-omit-segments-drop").clyMultiSelectSetItems(segments);
                $("#eb-multi-omit-segments-drop").clyMultiSelectSetSelection(omittedSegments || []);

                if (event.is_visible) {
                    $('#eb-event-visibility .on-off-switch input').attr('checked', true);
                    $('#eb-event-visibility > div.on-off-switch > span').html(jQuery.i18n.map["events.edit.event-visible"]);
                }
                else {
                    $('#eb-event-visibility .on-off-switch input').removeAttr('checked', false);
                    $('#eb-event-visibility > div.on-off-switch > span').html();
                }

                $('#eb-event-desc-input').show();

                if (event.description !== "") {
                    $('#eb-description-checkbox').removeClass('fa-square-o');
                    $('#eb-description-checkbox').addClass('fa-check-square');
                    $('#eb-event-desc-input').removeAttr('disabled');
                }
                else {
                    $('#eb-description-checkbox').removeClass('fa-check-square');
                    $('#eb-description-checkbox').addClass('fa-square-o');
                    $('#eb-event-desc-input').attr('disabled', 'disabled');
                }
            });
            self.initEventDrawer();
        }
    },
    initEventDrawer: function() {
        var self = this;
        $("#eb-event-desc-input").show();
        $("#eb-description-checkbox, #eb-description-section .label span").on("click", function() {
            var check = $("#eb-description-checkbox").hasClass("fa-check-square");
            if (check) {
                $("#eb-description-checkbox").removeClass('fa-check-square').addClass('fa-square-o');
                $('#eb-event-desc-input').attr('disabled', 'disabled');
            }
            else {
                $("#eb-description-checkbox").removeClass('fa-square-o').addClass('fa-check-square');
                $('#eb-event-desc-input').removeAttr('disabled');
            }
        });

        $('#events-blueprint-drawer .on-off-switch input').off("change").on("change", function() {
            var isChecked = $(this).is(":checked");
            if (isChecked) {
                $(this).parents(".on-off-switch").find("span").text(jQuery.i18n.map["events.edit.event-visible"]);
            }
            else {
                $(this).parents(".on-off-switch").find("span").text("");
            }
        });

        $("#save-event").on("click", function() {
            var settings = self.getEventBlueprintDrawerSettings();
            var event_map = {};
            event_map[settings.key] = settings;
            var omitted_segments = {};
            omitted_segments[settings.key] = settings.omit_list;
            if (self.compare_arrays(omitted_segments[settings.key], self.activeEvent.omittedSegments || []) && omitted_segments[settings.key].length > 0) {
                CountlyHelpers.confirm(jQuery.i18n.map["event.edit.omitt-warning"], "red", function(result) {
                    if (!result) {
                        return true;
                    }
                    countlyEvent.update_map(JSON.stringify(event_map), "", "", JSON.stringify(omitted_segments), function(result1) {
                        if (result1 === true) {
                            CountlyHelpers.notify({type: "ok", title: jQuery.i18n.map["common.success"], message: jQuery.i18n.map["events.general.changes-saved"], sticky: false, clearAll: true});
                            $("#events-blueprint-drawer").removeClass("open");
                            self.refresh(true);
                        }
                        else {
                            CountlyHelpers.alert(jQuery.i18n.map["events.general.update-not-successful"], "red");
                        }
                    });
                });
            }
            else {
                countlyEvent.update_map(JSON.stringify(event_map), "", "", JSON.stringify(omitted_segments), function(result2) {
                    if (result2 === true) {
                        CountlyHelpers.notify({type: "ok", title: jQuery.i18n.map["common.success"], message: jQuery.i18n.map["events.general.changes-saved"], sticky: false, clearAll: true});
                        $("#events-blueprint-drawer").removeClass("open");
                        self.refresh(true);
                    }
                    else {
                        CountlyHelpers.alert(jQuery.i18n.map["events.general.update-not-successful"], "red");
                    }
                });
            }
        });
        $(".cly-drawer").find(".close").off("click").on("click", function() {
            $(this).parents(".cly-drawer").removeClass("open");
        });
        $("#eb-event-visibility .on-off-switch input").on("change", function() {
            var isChecked = $(this).is(":checked");
            if (isChecked) {
                $(this).parent().find(".text").replaceWith('<span style="opacity: 1;vertical-align: middle; margin-bottom: 0px;" class="text">' + jQuery.i18n.map["events.edit.event-visible"] + '</span>');
            }
            else {
                $(this).parent().find(".text").replaceWith('<span style="vertical-align: middle; margin-bottom: 0px;" class="text">' + jQuery.i18n.map["events.edit.event-invisible"] + '</span>');
            }
        });
        $(".eb-event-properties-tooltip").tooltipster({
            theme: ['tooltipster-borderless', 'tooltipster-borderless-customized'],
            contentCloning: true,
            interactive: true,
            trigger: 'hover',
            side: 'right',
            zIndex: 10001,
            maxWidth: 250,
            content: $.i18n.map["events.blueprint-events-properties-tooltip"]
        });
    },
    getEventBlueprintDrawerSettings: function() {
        var keyName = $("#eb-key-name").val();
        var eventName = $("#eb-event-name").val();
        var eventDesc = $("#eb-event-desc-input").val();
        var status = $("#eb-event-visibility .on-off-switch input").is(":checked");
        var countName = $("#eb-count-name").val();
        var sumName = $("#eb-sum-name").val();
        var durationName = $("#eb-duration-name").val();
        var omitList = $("#eb-multi-omit-segments-drop").clyMultiSelectGetSelection();

        return {
            key: keyName,
            name: eventName,
            description: eventDesc || "",
            is_visible: status,
            count: countName || "Count",
            sum: sumName || "Sum",
            dur: durationName || "Duration",
            omit_list: omitList || []
        };
    },
    compare_arrays: function(array1, array2) {
        if (Array.isArray(array1) && Array.isArray(array2)) {
            if (array1.length !== array2.length) {
                return true;
            }

            for (var p = 0; p < array1.length; p++) {
                if (array2.indexOf(array1[p]) === -1) {
                    return true;
                }
                if (array1.indexOf(array2[p]) === -1) {
                    return true;
                }
            }
            return false;
        }
        else {
            if (Array.isArray(array1) || Array.isArray(array2)) {
                return false;
            }
            else {
                return array1 === array2;
            }
        }
    },
    check_changes: function() {
        var changed = false;
        if ($("#events-settings-table").find(".event_name").val() !== this.activeEvent.name) {
            changed = true;
        }
        if ($("#events-settings-table").find(".event_count").val() !== this.activeEvent.count) {
            changed = true;
        }
        if ($("#events-settings-table").find(".event_description").val() !== this.activeEvent.description) {
            changed = true;
        }
        if ($("#events-settings-table").find(".event_dur").val() !== this.activeEvent.dur) {
            changed = true;
        }
        if ($("#events-settings-table").find(".event_sum").val() !== this.activeEvent.sum) {
            changed = true;
        }

        var ch = $("#events-settings-table").find(".event_visible").first();
        if ($(ch).is(":checked") !== this.activeEvent.is_visible) {
            changed = true;
        }

        if (this.compare_arrays(($('#event-management-projection').val() || []), this.activeEvent.omittedSegments)) {
            changed = true;
        }

        if (changed) {
            $("#events-apply-changes").css("display", "block");
            this.preventHashChange = true;
        }
        else {
            $("#events-apply-changes").css("display", "none");
            this.preventHashChange = false;
        }
    },
    remakeTable: function() {
        var self = this;

        this.dtable.fnDestroy(false);
        this.dtable = $('.events-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
            "aaData": self.tableData,
            "aoColumns": self.columns,
            "fnRowCallback": function(nRow, aData) {
                $(nRow).attr("data-id", aData.key);
                $(nRow).attr("data-name", aData.name);
                $(nRow).attr("data-visible", aData.is_visible);
                $(nRow).css("height", "72px");
            }
        }));
        self.rightButtonsEvents();
    },
    refresh: function(eventChanged) {
        var self = this;
        if (eventChanged) {
            $.when(countlyEvent.initialize(true)).then(function() {
                if (app.activeView !== self) {
                    return false;
                }
                self.renderCommon(true);
                var newPage = $("<div>" + self.template(self.templateData) + "</div>");
                $(self.el).find("#events-settings-table").html(newPage.find("#events-settings-table").html());//Event settings
                $("#events-event-settings .widget-header .title").html(self.activeEvent.name);//change event settings title
                $(self.el).find("#event-nav-eventitems").html(newPage.find("#event-nav-eventitems").html());//reset navigation

                $('#event-filter-types div[data-value="all"]').html('<span>' + jQuery.i18n.map["events.blueprint-events-show.all"] + '</span>');
                $('#event-filter-types div[data-value="visible"]').html('<span>' + jQuery.i18n.map["events.blueprint-events-show.visible"] + '</span>');
                $('#event-filter-types div[data-value="hidden"]').html('<span>' + jQuery.i18n.map["events.blueprint-events-show.hidden"] + '</span>');

                if (self.visibilityFilter === true) {
                    $('#events-general-filter').clySelectSetSelection("", jQuery.i18n.map["events.blueprint-events-show.visible"] + '');
                }
                else if (self.visibilityFilter === false) {
                    $('#events-general-filter').clySelectSetSelection("", jQuery.i18n.map["events.blueprint-events-show.hidden"] + '');
                }
                else {
                    $('#events-general-filter').clySelectSetSelection("", jQuery.i18n.map["events.blueprint-events-show.all"] + '');
                }
                self.pageScript(); //add scripts


                app.localize($("#events-event-settings"));
                app.localize($("#events-custom-settings-table"));
                app.localize($("#event-groups-settings-table"));
                self.tableData = self.tableData.filter(function(event) {
                    var sourceEventFilter = self.visibilityFilter;
                    var getEventFilter = event.is_visible;
                    if (sourceEventFilter === true) {
                        return getEventFilter;
                    }
                    else if (sourceEventFilter === false) {
                        return !getEventFilter;
                    }
                    else {
                        return self.tableData;
                    }
                });
                CountlyHelpers.refreshTable(self.dtable, self.tableData);
                CountlyHelpers.refreshTable(self.eventGroupsTable, countlyEvent.getEventGroupsTable(self.eventGroupFilter));
                self.rightButttonsEventGroups();
                self.eventGroupSettingMenu();
                var events = countlyEvent.getEvents(true);
                var tableData = [];
                for (var i = 0; i < events.length; i++) {
                    if (!events[i].is_event_group && events[i].is_visible) {
                        tableData.push({value: events[i].key, name: events[i].name});
                    }
                }
                $("#event-group-include-events-dropdown").clyMultiSelectSetItems(tableData);
                $('#select-all-events').addClass("fa-square-o");
                $('#select-all-events').removeClass("fa-check-square");

                if (self.selectedSubmenu === "") {
                    $('#events-event-settings').css("display", "none");
                    $('#events-custom-settings').css("display", "block");
                }
                else {
                    $('#events-event-settings').css("display", "block");
                    $('#events-custom-settings').css("display", "none");
                }
                $("#events-apply-order").trigger("eventSettingsTableUpdated");
                $("#event-groups-apply-order").css('display', 'none');
                self.rightButtonsEvents();
            });
        }
    }
});

window.EventsOverviewView = countlyView.extend({
    beforeRender: function() {},
    initialize: function() {
        var previousEvent = countlyCommon.getPersistentSettings()["activeEvent_" + countlyCommon.ACTIVE_APP_ID];
        if (previousEvent) {
            countlyEvent.setActiveEvent(previousEvent);
        }
        this.template = Handlebars.compile($("#template-events-overview").html());
    },
    overviewTableScripts: function() {
        var self = this;
        //dragging and droping for event overview list
        $(".events-table").sortable({
            items: "tbody tr",
            revert: true,
            handle: "td:first-child",
            helper: function(e, elem) {
                elem.children().each(function() {
                    $(this).width($(this).width());
                });
                elem.css("width", (parseInt(elem.width()) - 2) + "px");//to not go over line
                elem.addClass("moving");
                return elem;
            },
            cursor: "move",
            containment: "parent",
            tolerance: "pointer",
            placeholder: "event-row-placeholder",
            stop: function(e, elem) {
                elem.item.removeClass("moving");
                self.order_changed();
                $("#update_overview_button").removeClass('disabled');
            }
        });

        $(".delete-event-overview").unbind("click");
        //removes item from overview List
        $(".delete-event-overview").on("click", function() {
            if ($(this).attr("data-order-key")) {
                var oldKey = $(this).attr("data-order-key");
                self.overviewList.splice(oldKey, 1);
                for (var i = 0; i < self.overviewList.length; i++) {
                    self.overviewList[i].order = i;
                }
            }
            self.refresh(true, true);
            $("#update_overview_button").removeClass('disabled');
        });
        $(".top-events-widget .col").off("click").on("click", function(e) {
            window.location.href = $(e.currentTarget).children("h4").children("a").attr("href");
        });
        $(".event-overview-grid-block").off("click").on("click", function(e) {
            window.location.href = $(e.currentTarget).children(".title").children("a").attr("href");
        });

    },
    pageScripts: function() {
        var self = this;
        var sparkline_settings = {
            type: 'line',
            height: '40',
            width: '150',
            lineColor: '#49c1e9',
            fillColor: "transparent",
            lineWidth: 1.5,
            spotColor: '#49c1e9',
            minSpotColor: "transparent",
            maxSpotColor: "transparent",
            highlightSpotColor: "transparent",
            highlightLineColor: "transparent",
            spotRadius: 3,
            drawNormalOnTop: false,
            disableTooltips: true
        };

        $(".spark-count").sparkline('html', sparkline_settings);
        sparkline_settings.lineColor = "#ff8700";
        sparkline_settings.spotColor = "#ff8700";
        $(".spark-sum").sparkline('html', sparkline_settings);
        sparkline_settings.lineColor = "#0EC1B9";
        sparkline_settings.spotColor = "#0EC1B9";
        $(".spark-dur").sparkline('html', sparkline_settings);

        //tooltip
        $('.show-my-event-description').tooltipster({
            theme: ['tooltipster-borderless', 'tooltipster-borderless-customized'],
            contentCloning: true,
            interactive: true,
            trigger: 'hover',
            side: 'right',
            zIndex: 2,
            maxWidth: 250
        });
        self.overviewTableScripts();
    },
    reloadGraphs: function() {
        var self = this;
        countlyEvent.getOverviewData(function(dd) {
            self.overviewGraph = dd;
            for (var i = 0; i < dd.length; i++) {
                var tt = self.fixTrend(dd[i].trend);
                dd[i].trendClass = tt.class;
                dd[i].trendText = tt.text;
                dd[i].classdiv = tt.classdiv;
                dd[i].arrow_class = tt.arrow_class;
                if (dd[i].prop === "dur") {
                    dd[i].count = countlyCommon.formatSecond(dd[i].count);
                }
                else {
                    dd[i].count = countlyCommon.getShortNumber(Math.round(dd[i].count * 100) / 100);
                }
            }
            self.refresh(true);
        });
    },
    topEvents: function() {
        var self = this;
        self.totalEventCount = 5;
        countlyEvent.getTopEventData30Day(function(dd) {
            self.getTopEventData30Day = false;
            if (dd) {
                self.getTopEventData30Day = dd.data;
                var fromDate = parseInt(dd.ts);
                var toDate = parseInt(Math.round(new Date().getTime() / 1000));
                var timeDiff = Math.round((toDate - fromDate) / 3600);
                if (timeDiff === 0) {
                    timeDiff = 1;
                }
                self.getTopEventDataLastUpdated = timeDiff;
                for (var index = 0; index < dd.data.length; index++) {
                    var element = self.fixTrend(dd.data[index].trend);
                    dd.data[index].trendClass = element.class;
                    dd.data[index].trendText = element.text;
                    dd.data[index].classdiv = element.classdiv;
                    dd.data[index].arrow_class = element.arrow_class;
                    dd.data[index].count = countlyCommon.getShortNumber(Math.round(dd.data[index].count * 100) / 100);
                    if (!countlyEvent.getEventMap(true, false)[dd.data[index].name]) {
                        dd.data[index].isDeletedEvent = true;
                    }
                }
            }
            self.refresh(true);
        });
        countlyEvent.getTopEventDataDaily(function(dd) {
            self.getTopEventDataDaily = false;
            if (dd) {
                self.getTopEventDataDaily = dd.data;
                for (var index = 0; index < dd.data.length; index++) {
                    var element = self.fixTrend(dd.data[index].trend);
                    dd.data[index].trendClass = element.class;
                    dd.data[index].trendText = element.text;
                    dd.data[index].classdiv = element.classdiv;
                    dd.data[index].arrow_class = element.arrow_class;
                    dd.data[index].count = countlyCommon.getShortNumber(Math.round(dd.data[index].count * 100) / 100);
                    if (!countlyEvent.getEventMap(true, false)[dd.data[index].name]) {
                        dd.data[index].isDeletedEvent = true;
                    }
                }
            }
            self.refresh(true);
        });
    },
    dateChanged: function() {
        var self = this;
        self.reloadGraphs();
    },
    order_changed: function() {
        //self.eventmap
        var self = this;
        var NeweventOrder = [];
        $("#event-overview-drawer .events-table").find(".delete-event-overview").each(function() {
            if ($(this).attr("data-order-key")) {
                var i = $(this).attr("data-order-key");
                $(this).attr("data-order-key", NeweventOrder.length);
                NeweventOrder.push({"order": NeweventOrder.length, "eventKey": self.overviewList[i].eventKey, "eventProperty": self.overviewList[i].eventProperty, is_event_group: (self.overviewList[i].is_event_group || false), "eventName": self.overviewList[i].eventName, "propertyName": self.overviewList[i].propertyName});
                $("#update_overview_button").removeClass('disabled');
            }
        });
        self.overviewList = NeweventOrder;
    },
    resetOverviewList: function() {
        var overviewList = countlyEvent.getOverviewList();
        this.overviewList = [];
        for (var i = 0; i < overviewList.length; i++) {
            var evname = overviewList[i].eventKey;
            var propname = overviewList[i].eventProperty;
            if (this.eventmap && this.eventmap[overviewList[i].eventKey] && this.eventmap[overviewList[i].eventKey].name) {
                evname = this.eventmap[evname].name;
            }
            if (this.eventmap && this.eventmap[overviewList[i].eventKey] && this.eventmap[overviewList[i].eventKey][propname]) {
                propname = this.eventmap[overviewList[i].eventKey][propname];
            }
            this.overviewList.push({"order": i, "eventKey": overviewList[i].eventKey, "eventProperty": overviewList[i].eventProperty, is_event_group: (overviewList[i].is_event_group || false), "eventName": evname, "propertyName": propname});
        }
        this.templateData["overview-list"] = this.overviewList;
    },
    fixTrend: function(changePercent) {
        var value = {"class": "", "text": "", "classdiv": "u", "arrow_class": "trending_up"};
        if (changePercent.indexOf("-") !== -1) {
            value.text = changePercent;
            value.class = "down";
            value.classdiv = "d";
            value.arrow_class = "trending_down";
        }
        else if (changePercent.indexOf("∞") !== -1 || changePercent.indexOf("NA") !== -1) {
            value.text = jQuery.i18n.map["events.overview.unknown"];
            value.class = "unknown";
            value.arrow_class = "trending_flat";
        }
        else {
            value.text = changePercent;
            value.class = "up";
        }
        return value;
    },
    renderCommon: function(isRefresh) {
        var self = this;
        this.currentOverviewList = countlyEvent.getOverviewList();
        this.eventmap = countlyEvent.getEventMap(false, true); //with event groups
        var app_admin = false;
        if (countlyAuth.validateCreate('core')) {
            app_admin = true;
        }

        this.templateData = {
            "logo-class": "events",
            "active-app-id": countlyCommon.ACTIVE_APP_ID,
            "event-map": this.eventmap,
            "overview-list": this.overviewList || [],
            "overview-graph": this.overviewGraph || [],
            "tabledGraph": [],
            "admin_rights": app_admin,
            "event-count": Object.keys(this.eventmap).length,
            "currentOverviewListCount": Object.keys(this.currentOverviewList).length,
            "getTopEventData30Day": this.getTopEventData30Day,
            "getTopEventDataDaily": this.getTopEventDataDaily,
            "getTopEventDataLastUpdated": this.getTopEventDataLastUpdated,
            "topEventsIsVisible": ((!!this.getTopEventData30Day && !!this.getTopEventDataDaily && !!this.getTopEventDataLastUpdated) && Object.keys(this.eventmap).length >= this.totalEventCount)
        };
        if (!this.overviewGraph) {
            this.overviewGraph = [];
        }
        if (!this.overviewList) {
            this.overviewList = [];
        }

        this.templateData["overview-length"] = this.templateData["overview-graph"].length;
        this.templateData["overview-table-length"] = this.templateData["overview-list"].length;

        if (!isRefresh) {
            this.resetOverviewList();
            this.templateData["overview-length"] = this.templateData["overview-graph"].length;
            this.templateData["overview-table-length"] = this.templateData["overview-list"].length;
            $(this.el).html(this.template(this.templateData));

            this.overviewDrawer = CountlyHelpers.createDrawer({
                id: "event-overview-drawer",
                form: $('#event-overview-drawer'),
                title: jQuery.i18n.map["data-migration.import-title"],
                applyChangeTriggers: true,
                onUpdate: function() {
                    var event = $("#events-overview-event").clySelectGetSelection();
                    var property = $("#events-overview-attr").clySelectGetSelection();
                    if (event && property) {
                        $("#add_to_overview").removeClass('disabled');
                    }
                    else {
                        $("#add_to_overview").addClass('disabled');
                    }
                },
                resetForm: function() {
                    self.resetOverviewList();
                    self.templateData["overview-table-length"] = self.overviewList.length;
                    $("#events-overview-table").css("max-height", $(window).height() - 280);
                    $("#events-overview-event").clySelectSetSelection("", jQuery.i18n.map["events.overview.choose-event"]);
                    $("#events-overview-attr").clySelectSetSelection("", jQuery.i18n.map["events.overview.choose-property"]);
                    $("#add_to_overview").addClass('disabled');
                    $("#update_overview_button").addClass('disabled');


                    var newPage = $("<div>" + self.template(self.templateData) + "</div>");
                    $(self.el).find("#events-overview-table-wrapper").html(newPage.find("#events-overview-table-wrapper").html());
                    self.overviewTableScripts();
                    app.localize($("#events-overview-table-wrapper"));
                }
            });

            self.pageScripts();

            //open editing drawer
            $("#events-overview-show-configure").on("click", function() {
                self.overviewDrawer.resetForm();
                self.overviewDrawer.open();
            });
            $("#events-overview-event").off("cly-select-change").on("cly-select-change", function() {
                var event = $("#events-overview-event").clySelectGetSelection();
                event = countlyCommon.encodeHtml(event);
                var prop = ["count", "sum", "dur"];
                for (var z = 0; z < prop.length; z++) {
                    var text = jQuery.i18n.map["events.table." + prop[z]];
                    if (self.eventmap[event] && self.eventmap[event][prop[z]]) {
                        text = self.eventmap[event][prop[z]];
                    }
                    $("#events-overview-attr").find(".item[data-value=" + prop[z] + "]").html(text);
                }

            });
            //Add new item to overview
            $("#add_to_overview").on("click", function() {
                var event = $("#events-overview-event").clySelectGetSelection();
                var event_encoded = countlyCommon.encodeHtml(event);
                var property = $("#events-overview-attr").clySelectGetSelection();
                if (event && property) {
                    if (self.overviewList.length < 12) {
                        //check if not duplicate
                        var unique_over = true;
                        for (var g = 0; g < self.overviewList.length; g++) {
                            if (self.overviewList[g].eventKey === event && self.overviewList[g].eventProperty === property) {
                                unique_over = false;
                            }
                        }
                        if (unique_over === true) {
                            self.overviewList.push({is_event_group: self.eventmap[event_encoded].is_event_group || false, eventKey: event, eventProperty: property, eventName: self.eventmap[event_encoded].name, propertyName: self.eventmap[event_encoded][property] || jQuery.i18n.map["events.table." + property], order: self.overviewList.length});
                            $("#events-overview-event").clySelectSetSelection("", jQuery.i18n.map["events.overview.choose-event"]);
                            $("#events-overview-attr").clySelectSetSelection("", jQuery.i18n.map["events.overview.choose-property"]);
                            $("#update_overview_button").removeClass('disabled');
                        }
                        else {
                            var msg2 = {title: jQuery.i18n.map["common.error"], message: jQuery.i18n.map["events.overview.have-already-one"], info: "", type: "error", sticky: false, clearAll: true};
                            CountlyHelpers.notify(msg2);
                        }
                    }
                    else {
                        var msg1 = {title: jQuery.i18n.map["common.error"], message: jQuery.i18n.map["events.overview.max-c"], info: "", type: "error", sticky: false, clearAll: true};
                        CountlyHelpers.notify(msg1);
                    }
                }
                self.refresh(true, true);
            });

            //save changes made in overview drawer
            $("#update_overview_button").on("click", function() {
                if ($(this).hasClass("disabled")) {
                    return;
                }
                countlyEvent.update_map("", "", JSON.stringify(self.overviewList), "", function(result) {
                    if (result === true) {
                        var widgetCount = self.overviewList ? self.overviewList.length : 0;

                        app.recordEvent({
                            "key": "events-overview-configure",
                            "count": 1,
                            "segmentation": {widget_count: widgetCount}
                        });

                        var msg = {title: jQuery.i18n.map["common.success"], message: jQuery.i18n.map["events.general.changes-saved"], sticky: false, clearAll: true, type: "ok"};
                        CountlyHelpers.notify(msg);
                        $("#event-overview-drawer").removeClass('open');
                        $.when(countlyEvent.initialize(true)).then(function() {
                            var overviewList2 = countlyEvent.getOverviewList();
                            this.overviewList = [];
                            for (var p = 0; p < overviewList2.length; p++) {
                                this.overviewList.push({is_event_group: overviewList2[p].is_event_group || false, "order": p, "eventKey": overviewList2[p].eventKey, "eventProperty": overviewList2[p].eventProperty, "eventName": overviewList2[p].eventName, "propertyName": overviewList2[p].propertyName});
                            }
                            self.dateChanged();
                        });
                    }
                    else {
                        CountlyHelpers.alert(jQuery.i18n.map["events.general.update-not-successful"], "red");
                    }
                });
            });
            self.reloadGraphs();
            self.topEvents();
            $(window).on('resize', function() {
                self.refresh(true);
            });
        }
    },
    refresh: function(dataChanged, onlyTable) {
        var self = this;
        if (dataChanged) {
            self.renderCommon(true);
            if (onlyTable !== true) {
                var window_width = $(window).width();
                var per_line = 4;
                if (window_width < 1200) {
                    per_line = 3;
                }
                if (window_width < 750) {
                    per_line = 2;
                }
                if (window_width < 500) {
                    per_line = 1;
                }

                var lineCN = Math.ceil(self.overviewGraph.length / per_line);
                var displayOverviewTable = [];
                for (var i = 0; i < lineCN; i++) {
                    displayOverviewTable[i] = [];
                    for (var j = 0; j < per_line; j++) {
                        if (i * per_line + j < self.overviewGraph.length) {
                            displayOverviewTable[i][j] = self.overviewGraph[i * per_line + j];
                        }
                        else {
                            displayOverviewTable[i][j] = {};
                        }
                    }
                }
                self.templateData.tabledGraph = displayOverviewTable;
            }

            var newPage = $("<div>" + self.template(self.templateData) + "</div>");
            $(self.el).find("#events-overview-table-wrapper").html(newPage.find("#events-overview-table-wrapper").html());//Event settings
            app.localize($("#events-overview-table-wrapper"));
            if (onlyTable !== true) {
                $(self.el).find("#top-events-widget-container").html(newPage.find("#top-events-widget-container").html());
                $(self.el).find("#eventOverviewWidgets").html(newPage.find("#eventOverviewWidgets").html()); //redraw widgets
                app.localize($("#top-events-widget-container"));
                var topEventsUpdatedTextElement = "#top-events-widget-container > .top-events-widget > .outer > .info_text";
                $(self.el).find(topEventsUpdatedTextElement).text(jQuery.i18n.prop("events.top-events.info-text", this.getTopEventDataLastUpdated));
                app.localize($("#eventOverviewWidgets"));
                self.pageScripts();
                self.overviewTableScripts();
            }
            else {
                self.overviewTableScripts();
            }
            if ($(".events-empty-block").length > 0) {
                $(".events-empty-block").first().parent().css("height", $(window).height() - 230);
            }

        }
    }
});

window.EventsView = countlyView.extend({
    showOnGraph: {"event-count": true, "event-sum": true, "event-dur": true},
    beforeRender: function() {},
    initialize: function() {
        var previousEvent = countlyCommon.getPersistentSettings()["activeEvent_" + countlyCommon.ACTIVE_APP_ID];
        if (previousEvent) {
            countlyEvent.setActiveEvent(previousEvent);
        }
        this.template = Handlebars.compile($("#template-events").html());
    },
    showExceedRemind: function() {
        /**
         * generate event limitaion remind tooltips
         * @param {string} text - i18n text for reminding
         */
        function generateDom(text) {
            var html = '<div class="event-remind-tooltip" style="display: block;">' +
                '<div class="content">' +
                        '<span class="prefix"></span>' +
                        '<span class="remind-context">' + text + '</span>' +
                        '<i class="fas fa-times"></i>' +
                '</div>' +
            '</div>';
            setTimeout(function() {
                $(".routename-events #event-alert").append(html);
            }, 0);
            $(".event-remind-tooltip .fa-times").off("click").on("click", function(e) {
                $(e.currentTarget.parentElement.parentElement).remove();
            });
        }
        $(".routename-events #event-alert").html("");
        var limitation = countlyEvent.getLimitation();
        var currentEventList = countlyEvent.getEvents() || [];
        if (currentEventList.length >= limitation.event_limit) {
            var tips = jQuery.i18n.prop("events.max-event-key-limit", limitation.event_limit);
            generateDom(tips);
        }

        var event_name = countlyEvent.getEventData().eventName;
        var segments = countlyEvent.getEventSegmentations() || [];
        if (segments && segments.length >= limitation.event_segmentation_limit) {
            var tips2 = jQuery.i18n.prop("events.max-segmentation-limit", limitation.event_segmentation_limit, event_name);
            generateDom(tips2);
        }

        var metaDB = countlyEvent.getActiveEventSegmentMeta();
        segments.forEach(function(s) {
            if (metaDB[s] && metaDB[s].length >= limitation.event_segmentation_value_limit) {
                var tips3 = jQuery.i18n.prop("events.max-unique-value-limit", limitation.event_segmentation_value_limit, s);
                generateDom(tips3);
            }
        });

    },
    pageScript: function() {
        $(".event-container").unbind("click");
        $(".segmentation-option").unbind("click");
        $(".big-numbers").unbind("click");

        var self = this;

        $(".event-container").on("click", function() {
            var tmpCurrEvent = $(this).data("key");
            for (var i in self.showOnGraph) {
                self.showOnGraph[i] = true;
            }
            $(".event-container").removeClass("active");
            $(this).addClass("active");
            app.navigate("/analytics/events/key/" + encodeURIComponent(tmpCurrEvent));

            countlyEvent.setActiveEvent(tmpCurrEvent, function() {
                self.refresh(true);
            });
        });

        $(".segmentation-option").on("click", function() {
            var tmpCurrSegmentation = $(this).data("value");
            countlyEvent.setActiveSegmentation(tmpCurrSegmentation, function() {
                if (countlyEvent.hasLoadedData()) {
                    self.renderCommon(true);
                    var newPage = $("<div>" + self.template(self.templateData) + "</div>");

                    $(self.el).find("#event-nav .scrollable").html(function() {
                        return newPage.find("#event-nav .scrollable").html();
                    });

                    $(self.el).find(".widget-footer").html(newPage.find(".widget-footer").html());
                    $(self.el).find("#edit-event-container").replaceWith(newPage.find("#edit-event-container"));

                    var eventData = countlyEvent.getEventData();
                    self.drawGraph(eventData);
                    self.pageScript();

                    self.drawTable(eventData);
                    app.localize();
                    $('.nav-search').find("input").trigger("input");
                }
            });
        });

        $(".big-numbers").on("click", function() {
            if ($(".big-numbers.selected").length === 1) {
                if ($(this).hasClass("selected")) {
                    return true;
                }
                else {
                    self.showOnGraph[$(this).data("type")] = true;
                }
            }
            else if ($(".big-numbers.selected").length > 1) {
                if ($(this).hasClass("selected")) {
                    self.showOnGraph[$(this).data("type")] = false;
                }
                else {
                    self.showOnGraph[$(this).data("type")] = true;
                }
            }

            $(this).toggleClass("selected");

            self.drawGraph(countlyEvent.getEventData());
        });

        if (countlyAuth.validateUpdate('core') && countlyAuth.validateDelete('core')) {
            $("#edit-events-button").show();
        }
        setTimeout(self.resizeTitle, 100);
    },
    drawGraph: function(eventData) {
        $(".big-numbers").removeClass("selected");
        var use = [];
        var cnt = 0;
        var i = 0;
        for (i in this.showOnGraph) {
            if (this.showOnGraph[i]) {
                $(".big-numbers." + i).addClass("selected");
                use.push(cnt);
            }
            cnt++;
        }

        var data = [];
        for (i = 0; i < use.length; i++) {
            if (parseInt(eventData.dataLevel) === 2) {
                data.push(eventData.chartDP.dp[use[i]]);
            }
            else {
                data.push(eventData.chartDP[use[i]]);
            }
        }


        if (parseInt(eventData.dataLevel) === 2) {
            eventData.chartDP.dp = data;
            countlyCommon.drawGraph(eventData.chartDP, "#dashboard-graph", "bar", {series: {stack: null}});
        }
        else {
            eventData.chartDP = data;
            countlyCommon.formatSecondForDP(eventData.chartDP, jQuery.i18n.map["views.duration"]);
            countlyCommon.drawTimeGraph(eventData.chartDP, "#dashboard-graph");
        }
    },
    drawTable: function(eventData) {
        if (this.dtable && this.dtable.fnDestroy) {
            this.dtable.fnDestroy(true);
        }

        $("#event-main").append('<table class="d-table" cellpadding="0" cellspacing="0"></table>');

        var aaColumns = [];

        if (countlyEvent.isSegmentedView()) {
            aaColumns.push({"mData": "curr_segment", "sTitle": jQuery.i18n.map["events.table.segmentation"], "sClass": 'break'});
        }
        else {
            aaColumns.push({"mData": "date", "sType": "customDate", "sTitle": jQuery.i18n.map["common.date"]});
        }

        aaColumns.push({
            "mData": "c",
            sType: "formatted-num",
            "mRender": function(d) {
                return countlyCommon.formatNumber(d);
            },
            "sTitle": eventData.tableColumns[1]
        });

        if (eventData.tableColumns[2]) {
            if (eventData.tableColumns[2] === jQuery.i18n.map["events.table.dur"]) {
                aaColumns.push({
                    "mData": "dur",
                    sType: "numeric",
                    "mRender": function(d, type) {
                        if (type === "display") {
                            return countlyCommon.formatSecond(d);
                        }
                        else {
                            return d;
                        }
                    },
                    "sTitle": eventData.tableColumns[2]
                });
                aaColumns.push({
                    "sClass": "dynamic-col",
                    "mData": function(row) {
                        if (parseInt(row.c) === 0 || parseInt(row.dur) === 0) {
                            return 0;
                        }
                        else {
                            return (row.dur / row.c);
                        }
                    },
                    sType: "numeric",
                    "mRender": function(d, type) {
                        if (type === "display") {
                            return countlyCommon.formatSecond(d);
                        }
                        else {
                            return d;
                        }
                    },
                    "sTitle": jQuery.i18n.map["events.table.avg-dur"]
                });
            }
            else {
                aaColumns.push({
                    "mData": "s",
                    sType: "formatted-num",
                    "mRender": function(d) {
                        return countlyCommon.formatNumber(d);
                    },
                    "sTitle": eventData.tableColumns[2]
                });
                aaColumns.push({
                    "sClass": "dynamic-col",
                    "mData": function(row) {
                        if (parseInt(row.c) === 0 || parseInt(row.s) === 0) {
                            return 0;
                        }
                        else {
                            return (row.s / row.c);
                        }
                    },
                    sType: "formatted-num",
                    "mRender": function(d) {
                        return countlyCommon.formatNumber(d);
                    },
                    "sTitle": jQuery.i18n.map["events.table.avg-sum"]
                });
            }
        }

        if (eventData.tableColumns[3]) {
            aaColumns.push({
                "mData": "dur",
                sType: "numeric",
                "mRender": function(d, type) {
                    if (type === "display") {
                        return countlyCommon.formatSecond(d);
                    }
                    else {
                        return d;
                    }
                },
                "sTitle": eventData.tableColumns[3]
            });
            aaColumns.push({
                "sClass": "dynamic-col",
                "mData": function(row) {
                    if (parseInt(row.c) === 0 || parseInt(row.dur) === 0) {
                        return 0;
                    }
                    else {
                        return (row.dur / row.c);
                    }
                },
                sType: "numeric",
                "mRender": function(d, type) {
                    if (type === "display") {
                        return countlyCommon.formatSecond(d);
                    }
                    else {
                        return d;
                    }
                },
                "sTitle": jQuery.i18n.map["events.table.avg-dur"]
            });
        }

        this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
            "aaData": eventData.chartData,
            "aoColumns": aaColumns
        }));

        $(".d-table").stickyTableHeaders();
    },
    resizeTitle: function() {
        var dW = $("#date-selector").width();
        var bW = $("#events-widget-header").width();
        $("#events-widget-header .dynamic-title").css("max-width", (bW - dW - 20) + "px");
    },
    getColumnCount: function() {
        return $(".dataTable").first().find("thead th").length;
    },
    getDataColumnCount: function(cnt) {
        if (cnt === 3) {
            return 4;
        }
        if (cnt === 4) {
            return 6;
        }
        return cnt;
    },
    renderCommon: function(isRefresh) {
        var eventData = countlyEvent.getEventData(),
            eventSummary = countlyEvent.getEventSummary(),
            eventGroups = countlyEvent.getEventGroups(),
            events = countlyEvent.getEvents(false, true),
            self = this;

        // manipulate events list & replace keys with event_group names
        for (var i = 0; i < events.length; i++) {
            if (eventGroups[events[i].key]) {
                events[i].name = eventGroups[events[i].key].label;
                events[i].is_event_group = true;
            }
        }

        var showManagmentButton = false;
        if (countlyAuth.validateDelete('core') && countlyAuth.validateDelete('core')) {
            showManagmentButton = true;
        }

        var eventCount = countlyEvent.getEvents().length;
        this.templateData = {
            "page-title": eventData.eventName.toUpperCase(),
            "is_event_group": eventData.is_event_group,
            "active-app-id": countlyCommon.ACTIVE_APP_ID,
            "event-description": eventData.eventDescription,
            "logo-class": "events",
            "events": events,
            "event-map": countlyEvent.getEventMap(),
            "segmentations": countlyEvent.getEventSegmentations(),
            "active-segmentation": countlyEvent.getActiveSegmentation(),
            "big-numbers": eventSummary,
            "chart-data": {
                "columnCount": eventData.tableColumns.length,
                "columns": eventData.tableColumns,
                "rows": eventData.chartData
            },
            "showManagmentButton": showManagmentButton,
            "event-count": eventCount
        };

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            CountlyHelpers.applyColors();
            if (eventCount > 0) {
                for (var k in this.showOnGraph) {
                    self.showOnGraph[k] = $(".big-numbers.selected." + k).length;
                }
                this.drawGraph(eventData);
                this.drawTable(eventData);
                this.pageScript();
            }
            $(window).on('resize', function() {
                self.resizeTitle();
            });
            $('.nav-search').find("input").trigger("input");

            var eventURLComponents = window.location.hash.match(/analytics\/events\/key\/(.*)/);
            if (eventURLComponents && eventURLComponents.length >= 2) {
                var targetEvent = decodeURIComponent(eventURLComponents[1]);
                if (countlyEvent.getEventData().eventName !== targetEvent) {
                    $("div[data-key='" + targetEvent + "']").click();
                    countlyEvent.setActiveEvent(targetEvent);
                }
            }
            this.showExceedRemind();
        }
    },
    refresh: function(eventChanged, segmentationChanged) {
        var self = this;
        self.resizeTitle();
        $.when(countlyEvent.initialize(eventChanged)).then(function() {

            if (app.activeView !== self) {
                return false;
            }
            if (countlyEvent.hasLoadedData()) {
                self.renderCommon(true);

                var newPage = $("<div>" + self.template(self.templateData) + "</div>");
                if (self.templateData['event-count'] > 0) {
                    $(self.el).find("#event-nav .scrollable").html(function() {
                        return newPage.find("#event-nav .scrollable").html();
                    });

                    $(self.el).find(".events-general-description").html(function() {
                        return newPage.find(".events-general-description").html();
                    });

                    // Segmentation change does not require title area refresh
                    if (!segmentationChanged) {
                        if ($("#event-update-area .cly-select").length && !eventChanged) {
                        // If there is segmentation for this event and this is not an event change refresh
                        // we just refresh the segmentation select's list
                            $(self.el).find("#event-update-area .select-items").html(function() {
                                return newPage.find("#event-update-area .select-items").html();
                            });

                            $("#event-update-area .select-items>div").addClass("scroll-list");
                            $("#event-update-area .select-items").find(".scroll-list").slimScroll({
                                height: '100%',
                                start: 'top',
                                wheelStep: 10,
                                position: 'right',
                                disableFadeOut: true
                            });

                            $(".select-items .item").click(function() {
                                var selectedItem = $(this).parents(".cly-select").find(".text");
                                selectedItem.text($(this).text());
                                selectedItem.data("value", $(this).data("value"));
                            });
                        }
                        else {
                        // Otherwise we refresh whole title area including the title and the segmentation select
                        // and afterwards initialize the select since we replaced it with a new element
                            $(self.el).find("#event-update-area").replaceWith(newPage.find("#event-update-area"));
                        }
                    }

                    $(self.el).find(".widget-footer").html(newPage.find(".widget-footer").html());
                    $(self.el).find("#edit-event-container").replaceWith(newPage.find("#edit-event-container"));

                    var eventData = countlyEvent.getEventData();
                    var i = 0;
                    for (i in self.showOnGraph) {
                        if (!$(".big-numbers." + i).length) {
                            self.showOnGraph[i] = false;
                        }
                    }
                    for (i in self.showOnGraph) {
                        if (self.showOnGraph[i]) {
                            $(".big-numbers." + i).addClass("selected");
                        }
                    }

                    self.drawGraph(eventData);
                    self.pageScript();

                    if (eventChanged || segmentationChanged) {
                        self.drawTable(eventData);
                    }
                    else if (self.getColumnCount() !== self.getDataColumnCount(eventData.tableColumns.length)) {
                        self.drawTable(eventData);
                    }
                    else {
                        CountlyHelpers.refreshTable(self.dtable, eventData.chartData);
                    }
                }
                app.localize();
                $('.nav-search').find("input").trigger("input");
                if (segmentationChanged || eventChanged) {
                    self.showExceedRemind();
                }
            }
        });
    }
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

window.LongTaskView = countlyView.extend({
    initialize: function() {
        this.template = Handlebars.compile($("#report-manager-template").html());
        this.taskCreatedBy = 'manually';
        this.types = {
            "all": jQuery.i18n.map["common.all"],
            "funnels": jQuery.i18n.map["sidebar.funnels"] || "Funnels",
            "drill": jQuery.i18n.map["drill.drill"] || "Drill",
            "flows": jQuery.i18n.map["flows.flows"] || "Flows",
            "retention": jQuery.i18n.map["retention.retention"] || "Retention",
            "formulas": jQuery.i18n.map["calculated-metrics.formulas"] || "Formulas",
            "dbviewer": jQuery.i18n.map["dbviewer.title"] || "DBViewer"
        };

        this.runTimeTypes = {
            "all": jQuery.i18n.map["common.all"],
            "auto-refresh": jQuery.i18n.map["taskmanager.auto"],
            "none-auto-refresh": jQuery.i18n.map["taskmanager.manual"]
        };

        this.states = {
            "all": jQuery.i18n.map["common.all"],
            "running": jQuery.i18n.map["common.running"],
            "rerunning": jQuery.i18n.map["taskmanager.rerunning"],
            "completed": jQuery.i18n.map["common.completed"],
            "errored": jQuery.i18n.map["common.errored"]
        };
    },
    beforeRender: function() {
        // return $.when(countlyTaskManager.initialize(null,
        //     {"manually_create": true}
        // )).then(function() {});
    },
    getStatusColor: function(status) {
        if (status === "completed") {
            return "#2FA732";
        }
        if (status === "errored") {
            return "#D63E40";
        }
        return "#E98010";
    },
    reporInputValidator: function() {
        var report_name = $("#report-name-input").val();
        //var report_desc = $("#report-desc-input").val();
        // var global = $("#report-global-option").hasClass("selected") || false;
        var autoRefresh = $("#report-refresh-option").hasClass("selected");
        var period = $("#single-period-dropdown").clySelectGetSelection();
        if (!report_name || (autoRefresh && !period)) {
            $("#create-report").addClass("disabled");
            return false;
        }
        $("#create-report").removeClass("disabled");
        return true;
    },
    loadReportDrawerView: function(id) {
        $("#current_report_id").text(id);
        var data = this.task_list;
        for (var i = 0; i < data.length; i++) {
            if (data[i]._id === id) {

                $("#report-name-input").val(data[i].report_name);
                $("#report-desc-input").val(data[i].report_desc);

                if (data[i].global) {
                    $("#report-global-option").addClass("selected");
                    $("#report-private-option").removeClass("selected");
                }
                else {
                    $("#report-private-option").addClass("selected");
                    $("#report-global-option").removeClass("selected");
                }



                if ((data[i].taskgroup === true && data[i].type === "drill") || data[i].type === "formulas") {
                    $("#single-period-dropdown").clySelectSetSelection(data[i].period_desc, data[i].period_desc);
                    $("#report-period-block").css("display", "none");
                    $("#report-data-block").css("display", "none");
                }
                else {
                    $("#report-data-block").css("display", "block");
                    if (data[i].autoRefresh) {
                        $("#report-period-block").css("display", "block");
                        $("#report-refresh-option").addClass("selected");
                        $("#report-onetime-option").removeClass("selected");
                        $("#single-period-dropdown").clySelectSetSelection(
                            data[i].period_desc,
                            jQuery.i18n.map["taskmanager.last-" + data[i].period_desc]
                        );
                    }
                    else {
                        $("#report-period-block").css("display", "none");
                        $("#report-refresh-option").removeClass("selected");
                        $("#report-onetime-option").addClass("selected");
                    }
                }


            }
        }
        $("#report-widget-drawer").addClass("open");
    },
    initDrawer: function() {
        var self = this;

        $('#report-widge-close').off("click").on("click", function() {
            $("#report-widget-drawer").removeClass("open");
        });
        $("#report-global-option").off("click").on("click", function() {
            $("#report-global-option").addClass("selected");
            $("#report-private-option").removeClass("selected");
            self.reporInputValidator();
        });
        $("#report-private-option").off("click").on("click", function() {
            $("#report-private-option").addClass("selected");
            $("#report-global-option").removeClass("selected");
            self.reporInputValidator();
        });

        $("#report-onetime-option").off("click").on("click", function() {
            $("#report-onetime-option").addClass("selected");
            $("#report-refresh-option").removeClass("selected");
            $("#report-period-block").css("display", "none");
            self.reporInputValidator();
        });
        $("#report-refresh-option").off("click").on("click", function() {
            $("#report-refresh-option").addClass("selected");
            $("#report-onetime-option").removeClass("selected");
            $("#report-period-block").css("display", "block");
            self.reporInputValidator();
        });

        $("#single-period-dropdown").clySelectSetItems([
            { value: 'today', name: jQuery.i18n.map["taskmanager.last-today"]},
            { value: '7days', name: jQuery.i18n.map["taskmanager.last-7days"]},
            { value: '30days', name: jQuery.i18n.map["taskmanager.last-30days"]}
        ]);

        $("#single-period-dropdown").clySelectSetSelection("", jQuery.i18n.map["drill.select_a_period"]);

        $("#report-name-input").off("keyup").on("keyup", function() {
            self.reporInputValidator();
        });
        $("#report-desc-input").off("keyup").on("keyup", function() {
            self.reporInputValidator();
        });
        $("#single-period-dropdown").off("cly-select-change").on("cly-select-change", function() {
            self.reporInputValidator();
        });

        $("#create-report").off("click").on("click", function() {
            var report_id = $("#current_report_id").text();
            var canSubmit = self.reporInputValidator();
            if (!canSubmit) {
                return;
            }
            var report_name = $("#report-name-input").val();
            var report_desc = $("#report-desc-input").val();
            var global_permission = $("#report-global-option").hasClass("selected");
            var autoRefresh = $("#report-refresh-option").hasClass("selected");
            var period = $("#single-period-dropdown").clySelectGetSelection();
            if (autoRefresh && !period) {
                return CountlyHelpers.alert(jQuery.i18n.map["drill.report_fileds_remind"],
                    "green",
                    function(/*result*/) { });
            }


            return $.ajax({
                type: "GET",
                url: countlyCommon.API_PARTS.data.w + '/tasks/edit',
                data: {
                    "task_id": report_id,
                    "app_id": countlyCommon.ACTIVE_APP_ID,
                    "report_name": report_name,
                    "report_desc": report_desc,
                    "global": global_permission,
                    "autoRefresh": autoRefresh,
                    "period_desc": autoRefresh ? period : null
                },
                dataType: "json",
                success: function() {
                    self.refresh();
                    $("#report-widget-drawer").removeClass("open");
                },
                error: function() {
                    self.refresh();
                    $("#report-widget-drawer").removeClass("open");
                }
            });
        });
        $("#create-report").addClass("disabled");
    },
    renderCommon: function(isRefresh) {
        var self = this;
        this.templateData = {
            "page-title": jQuery.i18n.map["report-maanger.manually-created-title"],
            "filter1": this.types,
            "active-filter1": jQuery.i18n.map["taskmanager.select-origin"],
            "filter2": this.runTimeTypes,
            "active-filter2": jQuery.i18n.map["common.select-type"],
            "filter3": this.states,
            "active-filter3": jQuery.i18n.map["common.select-status"],
            "graph-description": jQuery.i18n.map['taskmanager.automatically-table-remind']
        };
        var typeCodes = ['manually', 'automatically'];
        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            this.tabs = $("#reports-manager-tabs").tabs();
            this.tabs.on("tabsactivate", function(event, ui) {
                self.taskCreatedBy = typeCodes[ui.newTab.index()];
                $("#report-manager-table-title").text(jQuery.i18n.map["report-maanger." + self.taskCreatedBy + "-created-title"]);
                self.showTableColumns(self);
                self.refresh();
            });
            this.renderTable();
            this.initDrawer();
        }
        if (self.taskCreatedBy === 'manually') {
            $("#report-manager-graph-description").text(jQuery.i18n.map['taskmanager.manually-table-remind']);
            $(".report-manager-data-col").removeClass("report-manager-automatically-created");
        }
        else {
            $("#report-manager-graph-description").text(jQuery.i18n.map['taskmanager.automatically-table-remind']);
            $(".report-manager-data-col").addClass("report-manager-automatically-created");
        }
        this.showTableColumns(self);
    },
    showTableColumns: function(self) {
        var manuallyColumns = [true, true, true, true, true, true, true, true, false, true];
        var automaticallyColumns = [false, true, true, true, false, false, false, true, true, true];
        //                         [NAME, DATA, STAT(R),ORIGIN, TYPE,PERIOD,VISIB,LASTUp,Started,duration,status(SUB),but]
        if (self.taskCreatedBy === 'manually') {
            manuallyColumns.forEach(function(vis, index) {
                self.dtable.fnSetColumnVis(index, vis);
            });
            $(".report-manager-widget-header .filter2-segmentation").show();
        }
        else {
            automaticallyColumns.forEach(function(vis, index) {
                self.dtable.fnSetColumnVis(index, vis);
            });
            $(".report-manager-widget-header .filter2-segmentation").hide();
        }
    },
    renderTable: function() {
        var self = this;
        var tableColumns = [];
        tableColumns = [
            {
                "mData": function(row, type) {
                    if (type === "display") {
                        return (row.report_name || "-") + "<div class=\"report-manager-report-desc\">" + (row.report_desc || "-") + "</div>";
                    }
                    else {
                        return row.report_name || "-";
                    }
                },
                "sType": "string",
                "sTitle": jQuery.i18n.map["report-manager.name-and-desc"],
                "bSortable": false,
                "sClass": "report-manager-break"
            },
            {
                "mData": function(row) {
                    if (row.type === 'tableExport') {
                        return row.report_name;
                    }
                    else {
                        return row.name || row.meta || "";
                    }
                },
                "sType": "string",
                "sTitle": jQuery.i18n.map["report-manager.data"],
                "bSortable": false,
                "sClass": "report-manager-break report-manager-data-col"
            },
            {
                "mData": function(row) {
                    if (row.taskgroup && row.subtasks) {
                        var difStats = false;
                        var stat = "completed";
                        var dd = "";

                        for (var k in row.subtasks) {
                            if (row.subtasks[k].status !== stat) {
                                difStats = true;
                            }
                            var color = "green";
                            if (row.subtasks[k].status === "errored") {
                                color = "red";
                            }
                            if (row.subtasks[k].status === "running" || row.subtasks[k].status === "rerunning") {
                                color = "blue";
                            }
                            if (row.subtasks[k].errormsg) {
                                dd += "<div class='have_error_message table_status_dot table_status_dot_" + color + "'><span >" + "</span>" + row.subtasks[k].status + "<p class='error_message_div'>" + row.subtasks[k].errormsg + "</div></div>";
                            }
                            else {
                                dd += "<div class='table_status_dot table_status_dot_" + color + "'><span >" + "</span>" + row.subtasks[k].status + "</div>";
                            }

                        }
                        if (difStats) {
                            return dd;
                        }
                        else {
                            if (row.errormsg && row.status === "errored") {
                                return '<span class="status-color" style="color:' + self.getStatusColor(row.status) + ';"><i class="fa fa-circle" aria-hidden="true"></i>' + (self.states[row.status] || row.status) + "<p class='error_message_div'>" + row.errormsg + "</p></span>";
                            }
                            else {
                                return '<span class="status-color" style="color:' + self.getStatusColor(row.status) + ';"><i class="fa fa-circle" aria-hidden="true"></i>' + (self.states[row.status] || row.status) + "</span>";
                            }
                        }
                    }
                    else {
                        if (row.errormsg) {
                            return '<span class="status-color" style="color:' + self.getStatusColor(row.status) + ';"><i class="fa fa-circle" aria-hidden="true"></i>' + (self.states[row.status] || row.status) + "<p class='error_message_div'>" + row.errormsg + "</p></span>";
                        }
                        else {
                            return '<span class="status-color" style="color:' + self.getStatusColor(row.status) + ';"><i class="fa fa-circle" aria-hidden="true"></i>' + (self.states[row.status] || row.status) + "</span>";
                        }
                    }
                },
                "sType": "string",
                "bSortable": false,
                "sTitle": jQuery.i18n.map["common.status"]
            },
            {
                "mData": function(row) {
                    return '<span class="status-color" style="text-transform:capitalize">' + row.type + "</span>";
                },
                "sType": "string",
                "bSortable": false,
                "sTitle": jQuery.i18n.map["taskmanager.origin"]
            },
            {
                "mData": function(row) {
                    return row.autoRefresh ? jQuery.i18n.map["taskmanager.auto"] : jQuery.i18n.map["taskmanager.manual"];
                },
                "sType": "string",
                "sTitle": jQuery.i18n.map["common.type"],
                "bSortable": false,
                "sClass": "report-manager-break"
            },
            {
                "mData": function(row) {
                    return row.period_desc || "-";
                },
                "sType": "string",
                "sTitle": jQuery.i18n.map["report-manager.period"],
                "bSortable": false,
                "sClass": "report-manager-break"
            },
            {
                "mData": function(row) {
                    return row.global === false ? 'Private' : 'Global';
                },
                "sType": "string",
                "sTitle": jQuery.i18n.map["report-manager.visibility"],
                "bSortable": false,
                "sClass": "report-manager-break"
            },
            {
                "mData": function(row, type) {
                    if (type === "display") {
                        return countlyCommon.formatTimeAgo(row.start);
                    }
                    else {
                        return row.start;
                    }
                },
                "sType": "string",
                "sTitle": jQuery.i18n.map["common.last-updated"]
            },
            {
                "mData": function(row, type) {
                    var time = 0;
                    if (row.taskgroup && row.subtasks) {
                        for (var k in row.subtasks) {
                            if (row.subtasks[k].status === "running" || row.subtasks[k].status === "rerunning") {
                                row.status = row.subtasks[k].status;
                                row.start = row.subtasks[k].start || row.start;
                            }
                            if (row.end < row.subtasks[k].end) {
                                row.end = row.subtasks[k].end;
                            }
                        }
                    }
                    if (row.status === "running" || row.status === "rerunning") {
                        time = Math.max(new Date().getTime() - row.start, 0);
                    }
                    else if (row.end && row.end > row.start) {
                        time = row.end - row.start;
                    }
                    if (type === "display") {
                        return countlyCommon.formatTime(Math.round(time / 1000));
                    }
                    else {
                        return time;
                    }
                },
                "bSortable": false,
                "sType": "numeric",
                "sTitle": jQuery.i18n.map["events.table.dur"]
            },
            {
                "mData": function() {
                    return '<a class="cly-list-options"></a>';
                },
                "sType": "string",
                "sTitle": "",
                "sClass": "shrink center",
                bSortable: false
            }
        ];

        this.dtable = $('#data-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
            "iDisplayLength": 10,
            "bServerSide": true,
            "sAjaxSource": countlyCommon.API_PARTS.data.r + "/tasks/list?api_key=" + countlyGlobal.member.api_key + "&app_id=" + countlyCommon.ACTIVE_APP_ID,
            "fnServerParams": function(aoData) {
                self._query = self._query ? self._query : {};
                var queryObject = {};
                Object.assign(queryObject, self._query);
                if (self.taskCreatedBy === 'manually') {
                    queryObject.manually_create = true;
                }
                else {
                    queryObject.manually_create = {$ne: true};
                    delete queryObject.autoRefresh;
                }
                aoData.push({ "name": "query", "value": JSON.stringify(queryObject) });
                self._cachedAoData = aoData;
            },
            "fnServerData": function(sSource, aoData, fnCallback) {
                self.request = $.ajax({
                    "dataType": 'json',
                    "type": "get",
                    "url": sSource,
                    "data": aoData,
                    "success": function(dataResult) {
                        self.task_list = dataResult.aaData;
                        fnCallback(dataResult);
                        CountlyHelpers.reopenRows(self.dtable, {});
                    }
                });
            },
            "fnRowCallback": function(nRow, aData) {
                $(nRow).attr("data-id", aData._id);
                $(nRow).attr("data-name", aData.report_name || aData.name || '-');
            },
            "aoColumns": tableColumns
        }));
        this.dtable.stickyTableHeaders();
        // this.addErrorTooltips();
        this.dtable.fnSort([ [7, 'desc'] ]);
        $(this.el).append('<div class="cly-button-menu tasks-menu" tabindex="1">' +
            '<a class="item view-task" href="" data-localize="common.view"></a>' +
            '<a class="item rerun-task" data-localize="taskmanager.rerun"></a>' +
            '<a class="item edit-task" data-localize="taskmanager.edit"></a>' +
            '<a class="item delete-task" data-localize="common.delete"></a>' +
        '</div>');
        CountlyHelpers.initializeTableOptions();

        $(".cly-button-menu").on("cly-list.click", function(event, data) {
            var id = $(data.target).parents("tr").data("id");
            var reportName = $(data.target).parents("tr").data("name");
            if (id) {
                var row = {};
                self.task_list.forEach(function(item) {
                    if (item._id === id) {
                        row = item;
                    }
                });

                var subid = id;
                $(".tasks-menu").find(".edit-task").data("id", id);
                if (countlyGlobal.member.global_admin || countlyGlobal.admin_apps[countlyCommon.ACTIVE_APP_ID]) {
                    $(".tasks-menu").find(".delete-task").data("id", id);
                    $(".tasks-menu").find(".delete-task").data("name", reportName);
                }
                else {
                    $(".tasks-menu").find(".delete-task").hide();
                }

                if (row.status !== "running" && row.status !== "rerunning") {
                    if (row.view && row.hasData) {
                        $(".tasks-menu").find(".view-task").attr("href", row.view + subid).data("localize", "common.view").text(jQuery.i18n.map["common.view"]).show();
                    }
                    else {
                        $(".tasks-menu").find(".view-task").hide();
                    }
                    if (row.request) {
                        $(".tasks-menu").find(".rerun-task").data("id", id).show();
                    }
                    else {
                        $(".tasks-menu").find(".rerun-task").hide();
                    }
                }
                else {
                    if (row.view && row.hasData) {
                        $(".tasks-menu").find(".view-task").attr("href", row.view + subid).data("localize", "taskmanager.view-old").text(jQuery.i18n.map["taskmanager.view-old"]).show();
                    }
                    else {
                        $(".tasks-menu").find(".view-task").hide();
                    }
                }


                if (self.taskCreatedBy === 'manually') {
                    $(".tasks-menu").find(".edit-task").show();
                }
                else {
                    $(".tasks-menu").find(".edit-task").hide();
                }
            }
        });

        $(".cly-button-menu").on("cly-list.item", function(event, data) {
            var el = $(data.target);
            var id = el.data("id");
            if (id) {
                if (el.hasClass("delete-task")) {
                    CountlyHelpers.confirm(jQuery.i18n.prop("taskmanager.confirm-delete", "<b>" + el.data("name") + "</b>"), "popStyleGreen", function(result) {
                        if (!result) {
                            return true;
                        }
                        countlyTaskManager.del(id, function() {
                            self.refresh();
                        });
                    }, [jQuery.i18n.map["common.no-dont-delete"], jQuery.i18n.map["taskmanager.yes-delete-report"]], {title: jQuery.i18n.map["taskmanager.confirm-delete-title"], image: "delete-report"});
                }
                else if (el.hasClass("rerun-task")) {
                    CountlyHelpers.confirm(jQuery.i18n.map["taskmanager.confirm-rerun"], "popStyleGreen", function(result) {
                        if (!result) {
                            return true;
                        }
                        countlyTaskManager.update(id, function(res, error) {
                            if (res.result === "Success") {
                                countlyTaskManager.monitor(id, true);
                                self.refresh();
                            }
                            else {
                                CountlyHelpers.alert(error, "red");
                            }
                        });
                    }, [jQuery.i18n.map["common.no-dont-do-that"], jQuery.i18n.map["taskmanager.yes-rerun-report"]], {title: jQuery.i18n.map["taskmanager.confirm-rerun-title"], image: "rerunning-task"});
                }
                else if (el.hasClass("edit-task")) {
                    self.loadReportDrawerView(id);
                }
            }
        });

        $(".filter1-segmentation .segmentation-option").on("click", function() {
            if (!self._query) {
                self._query = {};
            }
            self._query.type = $(this).data("value");
            if (self._query.type === "all") {
                delete self._query.type;
            }
            self.refresh();
        });

        $(".filter2-segmentation .segmentation-option").on("click", function() {
            if (!self._query) {
                self._query = {};
            }
            self._query.autoRefresh = $(this).data("value") === 'auto-refresh';
            if ($(this).data("value") === "all") {
                delete self._query.autoRefresh;
            }
            self.refresh();
        });
        $(".filter3-segmentation .segmentation-option").on("click", function() {
            if (!self._query) {
                self._query = {};
            }
            self._query.status = $(this).data("value");
            if (self._query.status === "all") {
                delete self._query.status;
            }
            self.refresh();
        });
    },
    getExportAPI: function() {
        var requestPath = '/o/tasks/list?api_key=' + countlyGlobal.member.api_key +
            "&app_id=" + countlyCommon.ACTIVE_APP_ID;
        if (this._cachedAoData) {
            for (var i = 0; i < this._cachedAoData.length; i++) {
                var item = this._cachedAoData[i];
                switch (item.name) {
                case 'iDisplayStart':
                    requestPath += '&' + item.name + '=0';
                    break;
                case 'iDisplayLength':
                    requestPath += '&' + item.name + '=10000';
                    break;
                case 'query':
                    requestPath += '&' + item.name + '=' + encodeURI(item.value);
                    break;
                default:
                    requestPath += '&' + item.name + '=' + item.value;
                }
            }
        }
        var apiQueryData = {
            api_key: countlyGlobal.member.api_key,
            app_id: countlyCommon.ACTIVE_APP_ID,
            path: requestPath,
            method: "GET",
            filename: "Reports" + moment().format("DD-MMM-YYYY"),
            prop: ['aaData']
        };
        return apiQueryData;
    },
    refresh: function() {
        this.dtable.fnDraw(false);
    },
    addErrorTooltips: function() {
        $("#data-table").on('mouseenter mouseleave', ".have_error_message", function() {
            $('.have_error_message span').not(".tooltipstered").tooltipster({
                animation: "fade",
                animationDuration: 50,
                delay: 100,
                theme: 'tooltipster-borderless',
                side: ['top'],
                maxWidth: 500,
                trigger: 'click',
                interactive: true,
                functionBefore: function(instance, helper) {
                    instance.content($(helper.origin).parent().find(".error_message_div").html());
                },
                contentAsHTML: true,
                functionInit: function(instance, helper) {
                    instance.content($(helper.origin).parent().find(".error_message_div").html());
                }
            });

        });
        $("#data-table").on('click', ".have_error_message", function(e) {
            if ($(e.target).hasClass('have_error_message')) {
                $(this).find('span').trigger("click");
            }
        });


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

window.TokenManagerView = countlyView.extend({
    initialize: function() {
        this.template = Handlebars.compile($("#token-manager-template").html());
    },
    beforeRender: function() {
        return $.when(countlyTokenManager.initialize()).then(function() {});
    },
    reset_form_drawer: function() {
        $("#use_multi").addClass("fa-square-o");
        $("#use_multi").removeClass("fa-check-square");
        //reset limit apps
        $("#data-token-apps-selector").find(".check").removeClass("selected");
        $('#data-token-apps-selector .check[data-from=apps-allow]').addClass("selected");
        $("#limit_apps").css("display", "none");
        //reset limit time
        $("#data-token-exp-selector").find(".check").removeClass("selected");
        $('#data-token-exp-selector .check[data-from=time-allow]').addClass("selected");
        $('#limit_life').css('display', 'none');
        $('#select_limit_value').val("");
        $('#token_purpose').val("");
        $("#create_new_token").removeClass("disabled");

        var cc = $("#create-token-drawer").find(".endpoint_blocks_wrapper");
        var children = $(cc).find('.token_endpoint_block');
        if ($(children).length > 1) {
            for (var k = $(children).length - 1; k > 0; k--) {
                $(children[k]).remove();
            }
        }
        var my_block = $(cc).find(".token_endpoint_block").first();
        this.clear_endpoint_block(my_block);
    },
    clear_endpoint_block: function(block) {
        $(block).find(".endpoint-text").first().val("");
        var cc = $(block).find(".param_blocks_wrapper").first();
        var children = $(cc).find('.param_block');
        if ($(children).length > 1) {
            for (var k = $(children).length - 1; k > 0; k--) {
                $(children[k]).remove();
            }
        }
        var my_block = $(cc).find(".param_block").first();
        $(my_block).find(".param-key-input").first().val("");
        $(my_block).find(".param-value-input").first().val("");

    },
    add_scripts_to_table: function() {
        $('.tokenvalue').tooltipster({
            animation: "fade",
            animationDuration: 50,
            delay: 100,
            theme: 'tooltipster-borderless',
            trigger: 'custom',
            side: 'top',
            triggerOpen: {
                mouseenter: true,
                touchstart: true
            },
            triggerClose: {
                mouseleave: true,
                touchleave: true
            },
            interactive: true,
            functionBefore: function(instance) {
                instance.content("<span class='copy-tokenvalue' >" + jQuery.i18n.map["token_manager.copy-token"] + "<span>");
            },
            contentAsHTML: true,
            functionInit: function(instance) {
                instance.content("<span class='copy-tokenvalue' >" + jQuery.i18n.map["token_manager.copy-token"] + "<span>");
            }
        });
    },
    renderCommon: function(isRefresh) {
        //provide template data
        this.templateData = {"page-title": jQuery.i18n.map["token_manager.page-title"], "purpose-desc": jQuery.i18n.map["token_manager.table.purpose-desc"], "enter-number": jQuery.i18n.map["token_manager.table.enter-number"], "endpoint": jQuery.i18n.map["common.enter-value"], "query-param": jQuery.i18n.map["token_manager.parameter"], "query-param-value": jQuery.i18n.map["token_manager.query-param-value"] };
        //def values for all fields
        var tableData = countlyTokenManager.getData();
        //this.configsData = countlyWhiteLabeling.getData();
        for (var i = 0; i < tableData.length; i++) {
            if (tableData[i]._id === countlyGlobal.auth_token) {
                tableData.splice(i, 1);
            }
        }
        var self = this;
        if (!isRefresh) {
            //set data
            $(this.el).html(this.template(this.templateData));
            $(".widget").after(self.form_drawer);
            app.localize($("#create-token-drawer"));

            //add apps
            var apps = [];
            for (var appId in countlyGlobal.apps) {
                apps.push({value: appId, name: countlyGlobal.apps[appId].name});
            }
            $("#multi-app-dropdown").clyMultiSelectSetItems(apps);
            $("#multi-app-dropdown").on("cly-multi-select-change", function() {
                $("#export-widget-drawer").trigger("data-updated");
            });

            this.dtable = $('#data-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": tableData,
                "fnRowCallback": function(nRow, aData) {
                    $(nRow).attr("data-id", aData._id);
                    //$(nRow).attr("data-name", aData.report_name || aData.name || '-');
                },
                "aoColumns": [
                    {
                        "mData": function(row) {
                            var retv = row._id || "-";
                            var retp = row.purpose || "-";
                            if (jQuery.i18n.map["token_manager." + row.purpose + "-description"]) {
                                retp = "<b>(" + row.purpose + ")</b> " + jQuery.i18n.map["token_manager." + row.purpose + "-description"];
                            }
                            return retp + '<span class="tokenvalue_wrapper"><input class="tokenvalue" type="text" value="' + retv + '" /></span>';
                        },
                        "sType": "string",
                        "sTitle": jQuery.i18n.map["token_manager.table.purpose"],
                        "bSortable": true,
                        "sClass": "break"
                    },
                    {
                        "mData": function(row) {
                            if (row.ttl) {
                                return new Date(row.ends * 1000);
                            }
                            else {
                                return jQuery.i18n.map["token_manager.table.not-expire"];
                            }
                        },
                        "sType": "string",
                        "sTitle": jQuery.i18n.map["token_manager.table.ends"],
                        "bSortable": true,
                        "sClass": "break"
                    },
                    {
                        "mData": function(row) {
                            return row.multi || "-";
                        },
                        "sType": "string",
                        "sTitle": jQuery.i18n.map["token_manager.table.multi"],
                        "bSortable": true,
                        "sClass": "break"
                    },
                    {
                        "mData": function(row) {
                            if (row.app) {
                                if (row.app.length === 0) {
                                    return jQuery.i18n.map["token_manager.table.all-apps"];
                                }
                                else {
                                    return CountlyHelpers.appIdsToNames(row.app);
                                }
                            }
                            else {
                                return jQuery.i18n.map["token_manager.table.all-apps"];
                            }
                        },
                        "sType": "string",
                        "sTitle": jQuery.i18n.map["token_manager.table.app"],
                        "bSortable": true,
                        "sClass": "break"
                    },
                    {
                        "mData": function(row) {
                            row.endpoint = row.endpoint || "-";
                            if (typeof row.endpoint === "string") {
                                return row.endpoint;
                            }
                            else {
                                if (Array.isArray(row.endpoint)) {
                                    var lines = [];
                                    for (var p = 0; p < row.endpoint.length; p++) {
                                        if (typeof row.endpoint[p] === "string") {
                                            lines.push(row.endpoint[p]);
                                        }
                                        else {
                                            if (row.endpoint[p].endpoint) {
                                                var params = [];
                                                var have_params = false;
                                                for (var k in row.endpoint[p].params) {
                                                    params.push(k + ": " + row.endpoint[p].params[k]);
                                                    have_params = true;
                                                }
                                                if (have_params) {
                                                    lines.push(row.endpoint[p].endpoint + " (" + params.join(",") + ")");
                                                }
                                                else {
                                                    lines.push(row.endpoint[p].endpoint);
                                                }
                                            }
                                            else {
                                                lines.push(row.endpoint[p]);
                                            }
                                        }
                                    }
                                    return lines.join("</br>");
                                }
                                else {
                                    return row.endpoint; //shouldn't even get there
                                }
                            }
                        },
                        "sType": "string",
                        "sTitle": jQuery.i18n.map["token_manager.table.endpoint"],
                        "bSortable": true,
                        "sClass": "break"
                    },
                    {
                        "mData": function(row) {
                            if (row.ttl && ((row.ends * 1000) - Date.now()) < 0) {
                                return '<div class="table_status_dot table_status_dot_red"><span ></span>' + jQuery.i18n.map["token_manager.table.status-expired"] + "</div>";
                            }
                            else {
                                return '<div class="table_status_dot table_status_dot_green"><span ></span>' + jQuery.i18n.map["token_manager.table.status-active"] + "</div>";
                            }
                        },
                        "sType": "string",
                        "sTitle": jQuery.i18n.map["token_manager.table.status"],
                        "bSortable": true,
                        "sClass": "break"
                    },
                    {
                        "mData": function() {
                            return '<a class="cly-list-options"></a>';
                        },
                        "sType": "string",
                        "sTitle": "",
                        "sClass": "shrink center",
                        bSortable: false
                    }
                ]
            }));

            self.add_scripts_to_table();

            $(document).on("click", ".tokenvalue", function() {
                $(this).select();
                document.execCommand("copy");
                var val = $(this).val();
                $('.tokenvalue').tooltipster('content', "<span class='copy-tokenvalue' data-value='" + val + "'>" + jQuery.i18n.map["token_manager.token-coppied"] + "<span>");
            });
            $(this.el).append('<div class="cly-button-menu token-menu" tabindex="1"><a class="item delete-token" data-localize="token_manager.table.delete-token"></a></div>');
            this.dtable.stickyTableHeaders();
            CountlyHelpers.initializeTableOptions();

            $(".cly-button-menu").on("cly-list.click", function(event, data) {
                var id = $(data.target).parents("tr").data("id");
                if (id) {
                    $(".token-menu").find(".delete-token").data("id", id);
                }
            });

            $(".cly-button-menu").on("cly-list.item", function(event, data) {
                var el = $(data.target);
                var value = el.data("id");
                if (value) {
                    CountlyHelpers.confirm(jQuery.i18n.map["token_manager.delete-token-confirm"], "popStyleGreen", function(result) {
                        if (!result) {
                            return true;
                        }
                        var overlay = $("#overlay").clone();
                        $("body").append(overlay);
                        overlay.show();
                        countlyTokenManager.deleteToken(value, function(err) {
                            overlay.hide();
                            if (err) {
                                CountlyHelpers.alert(jQuery.i18n.map["token_manager.delete-error"], "red");
                            }
                            self.refresh(true);
                        });
                    }, [jQuery.i18n.map["common.no-dont-delete"], jQuery.i18n.map["token_manager.yes-delete-token"]], { title: jQuery.i18n.map["token_manager.delete-token-confirm-title"], image: "delete-token" });
                }
            });

            $("#show_token_form").on("click", function() {
                $(".cly-drawer").removeClass("open editing");
                self.reset_form_drawer();
                $("#create-token-drawer").addClass("open");
                $(".cly-drawer").find(".close").off("click").on("click", function() {
                    $(this).parents(".cly-drawer").removeClass("open");
                });
            });

            //multi checkbox
            $("#use_multi").on("click", function() {
                var isChecked = $(this).hasClass("fa-check-square");//is now checked
                if (isChecked) {
                    $(this).addClass("fa-square-o");
                    $(this).removeClass("fa-check-square");
                }
                else {
                    $(this).removeClass("fa-square-o");
                    $(this).addClass("fa-check-square");
                }
            });

            //restrict by apps checkbox
            $("#data-token-apps-selector").off("click").on("click", ".check", function() {
                $("#data-token-apps-selector").find(".check").removeClass("selected");
                $(this).addClass("selected");

                if ($(this).attr('data-from') === 'apps-limit') {
                    $('#limit_apps').css('display', 'block');
                }
                else {
                    $('#limit_apps').css('display', 'none');
                }
                $("#export-widget-drawer").trigger("data-updated");
            });

            //restrict lifetime radio
            $("#data-token-exp-selector").off("click").on("click", ".check", function() {
                $("#data-token-exp-selector").find(".check").removeClass("selected");
                $(this).addClass("selected");

                if ($(this).attr('data-from') === 'time-limit') {
                    $('#limit_life').css('display', 'block');
                }
                else {
                    $('#limit_life').css('display', 'none');
                }
                $("#export-widget-drawer").trigger("data-updated");
            });

            $("#create-token-drawer").on("click", ".delete-param", function() {
                var cc = $(this).closest(".param_blocks_wrapper");
                if ($(cc).find('.param_block').length > 1) {
                    $(this).closest(".param_block").remove(); //if there are many - delete this brick
                }
                else {
                    var my_block = $(cc).find(".param_block").first();
                    $(my_block).find(".param-key-input").first().val("");
                    $(my_block).find(".param-value-input").first().val("");
                }
            });

            $("#create-token-drawer").on("click", ".add-query-block", function() {
                var cc = $(this).siblings(".param_blocks_wrapper");
                var dup = $(cc).find('.param_block').first().clone();
                cc.append(dup);
                $(dup).find(".param-key-input").first().val("");
                $(dup).find(".param-value-input").first().val("");

            });


            $("#create-token-drawer").on("click", ".add-endpoint-block", function() {
                var parentBlock = $(this).siblings(".endpoint_blocks_wrapper");
                var dup = $(parentBlock).find('.token_endpoint_block');
                dup = dup.first();
                dup = dup.clone();
                parentBlock.append(dup);
                self.clear_endpoint_block(dup);
            });

            $("#create-token-drawer").off("click", ".delete-endpoint-block .cly-list-options").on("click", ".delete-endpoint-block .cly-list-options", function(event) {
                event.stopPropagation();
                event.preventDefault();
                $(event.target).toggleClass("active");
                if ($(event.target).hasClass("active")) {
                    $("#create-token-drawer").find(".cly-list-options").removeClass("active");
                    $(event.target).addClass("active");
                    var pos = $(event.target).offset();
                    $("#create-token-drawer").find('.delete-new-endpoint-block-menu').css({
                        top: (pos.top + 20) + "px",
                        right: 43 + "px"
                    });
                    $("#create-token-drawer").find('.delete-new-endpoint-block-menu').addClass("active");
                    $("#create-token-drawer").find('.delete-new-endpoint-block-menu').focus();

                    var cc = $("#create-token-drawer").find(".endpoint_blocks_wrapper").first();
                    if ($(cc).find('.token_endpoint_block').length === 1) {
                        $("#create-token-drawer").find('.delete-endpoint-block-item').first().css("display", "none");
                    }
                    else {
                        $("#create-token-drawer").find('.delete-endpoint-block-item').first().css("display", "block");
                    }
                }
                else {
                    $(event.target).removeClass("active");
                    $("#create-token-drawer").find('.delete-new-endpoint-block-menu').removeClass("active");
                }
                return false;
            });

            $("#create-token-drawer").on("click", function() {
                $("#create-token-drawer").find('.delete-new-endpoint-block-menu').removeClass("active");
                $("#create-token-drawer").find(".cly-list-options").removeClass("active");
            });
            $("#create-token-drawer").find('.delete-new-endpoint-block-menu .item').off("click").on("click", function() {
                var cc = $("#create-token-drawer").find(".endpoint_blocks_wrapper").first();
                if ($(this).hasClass("delete-endpoint-block-item")) {
                    if ($(cc).find('.token_endpoint_block').length > 1) {
                        var bb = $("#create-token-drawer").find('.cly-list-options.active').first();
                        bb = $(bb).closest(".token_endpoint_block");
                        $(bb).remove(); //if there are many - delete this brick
                    }
                    else {
                        var my_block = $(cc).find(".token_endpoint_block").first();
                        self.clear_endpoint_block(my_block);
                    }
                }
                else {
                    var zz = $("#create-token-drawer").find('.cly-list-options.active').first();
                    zz = $(zz).closest(".token_endpoint_block");
                    self.clear_endpoint_block(zz);
                }

                $("#create-token-drawer").find('.delete-new-endpoint-block-menu').removeClass("active");
                $("#create-token-drawer").find(".cly-list-options").removeClass("active");
            });



            var myarr = [{value: "h", name: jQuery.i18n.map["token_manager.limit.h"]}, {value: "d", name: jQuery.i18n.map["token_manager.limit.d"]}, {value: "m", name: jQuery.i18n.map["token_manager.limit.m"]}];

            $("#select_limit_span").clySelectSetItems(myarr);
            $("#select_limit_number").on("cly-select-change", function() {
                $("#create-token-drawer").trigger("data-updated");
            });

            $("#create_new_token").on("click", function() {
                var purpose = $("#token_purpose").val();
                var endpoint = [];

                var endpointBlocks = $("#create-token-drawer").find(".token_endpoint_block");
                for (var z = 0; z < endpointBlocks.length; z++) {
                    var ePoint = {};
                    var eValue = $(endpointBlocks[z]).find(".endpoint-text").first().val();
                    if (eValue && eValue !== "") {
                        ePoint.endpoint = eValue;
                        ePoint.params = {};
                        var params = $(endpointBlocks[z]).find(".param_block");
                        for (var k = 0; k < params.length; k++) {
                            var key = $(params[k]).find(".param-key-input").first().val();
                            var value = $(params[k]).find(".param-value-input").first().val() || "";

                            if (key && value && key !== "") {
                                ePoint.params[key] = value;
                            }
                        }
                        endpoint.push(ePoint);
                    }
                }

                endpoint = JSON.stringify(endpoint);
                var multi = $("#use_multi").hasClass("fa-check-square");
                var apps_list = [];
                var ttl = 0;

                var set1 = $("#data-token-apps-selector .selected").first();
                if (set1 && set1.attr('data-from') === 'apps-limit') {
                    apps_list = $("#multi-app-dropdown").clyMultiSelectGetSelection();
                    if (apps_list.length === 0) {
                        CountlyHelpers.alert(jQuery.i18n.map["token_manager.select-apps-error"], "red");
                        return;
                    }
                    apps_list = apps_list.join();
                }

                set1 = $("#data-token-exp-selector .selected").first();
                if (set1 && set1.attr('data-from') === 'time-limit') {
                    var spans = {"h": 3600, "d": 3600 * 24, "m": 3600 * 24 * 30};
                    var val = $("#select_limit_span").clySelectGetSelection();
                    ttl = spans[val];
                    ttl = ttl * parseInt($("#select_limit_value").val());
                    if (!ttl || ttl <= 0) {
                        CountlyHelpers.alert(jQuery.i18n.map["token_manager.select-expire-error"], "red");
                        return;
                    }

                }
                countlyTokenManager.createTokenWithQuery(purpose, endpoint, multi, apps_list, ttl, function(err) {
                    if (err) {
                        CountlyHelpers.alert(err, "red");
                    }
                    $("#create-token-drawer").removeClass("open");
                    self.refresh(true);
                });
            });
        }
    },
    //here we need to refresh data
    refresh: function(dataChanged) {
        var self = this;
        if (dataChanged) {
            $.when(countlyTokenManager.initialize()).then(function() {
                var tableData = countlyTokenManager.getData();
                for (var i = 0; i < tableData.length; i++) {
                    if (tableData[i]._id === countlyGlobal.auth_token) {
                        tableData.splice(i, 1);
                    }
                }
                CountlyHelpers.refreshTable(self.dtable, tableData);
                self.add_scripts_to_table();
            });
        }
    }
});

window.JobsView = countlyView.extend({
    initialize: function() {},
    beforeRender: function() {
        if (this.template) {
            return true;
        }
        else {
            var self = this;
            return $.when(T.render('/templates/jobs.html', function(src) {
                self.template = src;
            })).then(function() {});
        }
    },
    renderCommon: function() {
        this.templateData = {
            "page-title": jQuery.i18n.map["sidebar.management.jobs"]
        };
        $(this.el).html(this.template(this.templateData));
        this.renderTable();
    },
    refresh: function() {
        this.dtable.fnDraw(false);
    },
    renderTable: function() {
        var self = this;
        this.dtable = $('#jobs-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
            "aaSorting": [[ 0, "asc" ]],
            "bServerSide": true,
            "sAjaxSource": countlyCommon.API_PARTS.data.r + "?app_id=" + countlyCommon.ACTIVE_APP_ID + "&method=jobs",
            "fnServerData": function(sSource, aoData, fnCallback) {
                $.ajax({
                    "type": "POST",
                    "url": sSource,
                    "data": aoData,
                    "success": function(data) {
                        fnCallback(data);
                    }
                });
            },
            "fnRowCallback": function(nRow, aData) {
                $(nRow).attr("id", aData.name);
            },
            "aoColumns": [
                {
                    "mData": function(row) {
                        return row.name;
                    },
                    "sType": "string",
                    "bSortable": true,
                    "bSearchable": true,
                    "sTitle": jQuery.i18n.map["jobs.job-name"]
                },
                {
                    "mData": function(row) {
                        return row.schedule;
                    },
                    "sType": "string",
                    "bSortable": false,
                    "bSearchable": false,
                    "sTitle": jQuery.i18n.map["jobs.job-schedule"]
                },
                {
                    "mData": function(row) {
                        return countlyCommon.getDate(row.next) + " " + countlyCommon.getTime(row.next);
                    },
                    "sType": "format-ago",
                    "bSortable": true,
                    "bSearchable": false,
                    "sTitle": jQuery.i18n.map["jobs.job-next-run"]
                },
                {
                    "mData": function(row) {
                        return countlyCommon.formatTimeAgo(row.finished);
                    },
                    "sType": "format-ago",
                    "bSortable": true,
                    "bSearchable": false,
                    "sTitle": jQuery.i18n.map["jobs.job-last-run"]
                },
                {
                    "mData": function(row) {
                        return row.status;
                    },
                    "sType": "string",
                    "bSortable": true,
                    "bSearchable": false,
                    "sTitle": jQuery.i18n.map["jobs.job-status"]
                },
                {
                    "mData": function(row) {
                        return row.total;
                    },
                    "sType": "numeric",
                    "bSortable": true,
                    "bSearchable": false,
                    "sTitle": jQuery.i18n.map["jobs.job-total-scheduled"]
                }
            ],
        }));
        self.dtable.fnSort([ [0, 'asc'] ]);
        self.dtable.stickyTableHeaders();
        $('#jobs-table tbody').on("click", "tr", function() {
            var name = $(this).attr("id");
            if (name) {
                window.location.hash = "/manage/jobs/" + name;
            }
        });
    },
});

window.JobDetailView = countlyView.extend({
    initialize: function() {},
    beforeRender: function() {
        if (this.template) {
            return true;
        }
        else {
            var self = this;
            return $.when(T.render('/templates/jobs.html', function(src) {
                self.template = src;
            })).then(function() {});
        }
    },

    renderCommon: function() {
        this.templateData = {
            "page-title": this.name
        };
        $(this.el).html(this.template(this.templateData));
        this.renderTable();
    },
    refresh: function() {
        this.dtable.fnDraw(false);
    },
    renderTable: function() {
        var self = this;
        this.dtable = $('#jobs-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
            "aaSorting": [[ 3, "desc" ]],
            "bFilter": false,
            "bServerSide": true,
            "sAjaxSource": countlyCommon.API_PARTS.data.r + "?app_id=" + countlyCommon.ACTIVE_APP_ID + "&method=jobs&name=" + self.name,
            "fnServerData": function(sSource, aoData, fnCallback) {
                $.ajax({
                    "type": "POST",
                    "url": sSource,
                    "data": aoData,
                    "success": function(data) {
                        fnCallback(data);
                    }
                });
            },
            "aoColumns": [
                {
                    "mData": function(row) {
                        return row.schedule;
                    },
                    "sType": "string",
                    "bSortable": false,
                    "bSearchable": false,
                    "sTitle": jQuery.i18n.map["jobs.job-schedule"]
                },
                {
                    "mData": function(row) {
                        return countlyCommon.getDate(row.next) + " " + countlyCommon.getTime(row.next);
                    },
                    "sType": "format-ago",
                    "bSortable": true,
                    "bSearchable": false,
                    "sTitle": jQuery.i18n.map["jobs.job-next-run"]
                },
                {
                    "mData": function(row) {
                        return countlyCommon.formatTimeAgo(row.finished);
                    },
                    "sType": "format-ago",
                    "bSortable": true,
                    "bSearchable": false,
                    "sTitle": jQuery.i18n.map["jobs.job-last-run"]
                },
                {
                    "mData": function(row) {
                        return row.status;
                    },
                    "sType": "string",
                    "bSortable": true,
                    "bSearchable": false,
                    "sTitle": jQuery.i18n.map["jobs.job-status"]
                },
                {
                    "mData": function(row) {
                        return "<pre>" + JSON.stringify(row.data, null, 2) + "</pre>";
                    },
                    "sType": "string",
                    "bSortable": false,
                    "bSearchable": false,
                    "sTitle": jQuery.i18n.map["jobs.job-data"]
                },
                {
                    "mData": function(row) {
                        return (row.duration / 1000) + 's';
                    },
                    "sType": "string",
                    "bSortable": true,
                    "bSearchable": false,
                    "sTitle": jQuery.i18n.map["jobs.run-duration"]
                },
            ],
        }));
        self.dtable.fnSort([ [3, 'desc'] ]);
        self.dtable.stickyTableHeaders();
        $(self.el).prepend('<a class="back back-link"><span>' + jQuery.i18n.map["jobs.back-to-jobs-list"] + '</span></a>');
        $(self.el).find(".back").click(function() {
            app.back("/manage/jobs");
        });
    },
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
app.userView = new UserView();
app.countriesView = new CountriesView();
app.manageAppsView = new ManageAppsView();
app.manageUsersView = new ManageUsersView();
app.eventsView = new EventsView();
app.dashboardView = new DashboardView();
app.eventsBlueprintView = new EventsBlueprintView();
app.eventsOverviewView = new EventsOverviewView();
app.longTaskView = new LongTaskView();
app.DownloadView = new DownloadView();
app.TokenManagerView = new TokenManagerView();
app.VersionHistoryView = new VersionHistoryView();
app.jobsView = new JobsView();
app.jobDetailView = new JobDetailView();

app.route("/analytics/graph-notes", "graphNotes", function() {
    this.renderWhenReady(this.graphNotesView);
});
app.route("/analytics/users", "users", function() {
    this.renderWhenReady(this.userView);
});

app.route("/analytics/countries", "countries", function() {
    this.renderWhenReady(this.countriesView);
});

if (countlyAuth.validateRead('global_applications')) {
    app.route("/manage/apps", "manageApps", function() {
        this.renderWhenReady(this.manageAppsView);
    });
}

if (countlyAuth.validateRead('global_users')) {
    app.route("/manage/users", "manageUsers", function() {
        this.manageUsersView._id = null;
        this.renderWhenReady(this.manageUsersView);
    });

    app.route('/manage/users/:id', 'manageUsersId', function(id) {
        this.manageUsersView._id = id;
        this.renderWhenReady(this.manageUsersView);
    });
}

app.route("/manage/tasks", "longTasks", function() {
    this.renderWhenReady(this.longTaskView);
});

app.route("/analytics/events", "events", function() {
    this.renderWhenReady(this.eventsView);
});

app.route('/exportedData/AppUserExport/:task_id', 'userExportTask', function(task_id) {
    this.DownloadView.task_id = task_id;
    this.renderWhenReady(this.DownloadView);
});

app.route('/exportedData/tableExport/:task_id', 'userExportTask', function(task_id) {
    this.DownloadView.task_id = task_id;
    this.DownloadView.path = "/export/download/";
    this.renderWhenReady(this.DownloadView);
});

app.route('/manage/token_manager', 'token_manager', function() {
    this.renderWhenReady(this.TokenManagerView);
});
app.route('/versions', 'version_history', function() {
    this.renderWhenReady(this.VersionHistoryView);
});
app.route("/analytics/events/key/:event", "events", function() {
    this.renderWhenReady(this.eventsView);
});
app.route("/analytics/events/:subpageid", "events", function(subpageid) {
    this.eventsView.subpageid = subpageid;
    if (subpageid === 'overview') {
        this.renderWhenReady(this.eventsOverviewView);
    }
    else {
        this.renderWhenReady(this.eventsView);
    }
});
app.route('/analytics/manage-events', 'events', function() {
    if (countlyAuth.validateDelete('core') && countlyAuth.validateUpdate('core')) {
        this.eventsBlueprintView._tab = "events";
        this.renderWhenReady(this.eventsBlueprintView);
    }
    else {
        app.navigate("/analytics/events", true);
    }
});
app.route('/analytics/manage-events/:tab', 'event-groups', function(tab) {
    if (countlyAuth.validateDelete('core') && countlyAuth.validateUpdate('core')) {
        this.eventsBlueprintView._tab = tab;
        this.renderWhenReady(this.eventsBlueprintView);
    }
    else {
        app.navigate("/analytics/events", true);
    }
});

if (countlyAuth.validateRead('global_jobs')) {
    app.route("/manage/jobs", "manageJobs", function() {
        this.renderWhenReady(this.jobsView);
    });

    app.route("/manage/jobs/:name", "manageJobName", function(name) {
        this.jobDetailView.name = name;
        this.renderWhenReady(this.jobDetailView);
    });
}


app.addAppSwitchCallback(function() {
    if (countlyAuth.validateDelete('core') && countlyAuth.validateUpdate('core')) {
        $('.sidebar-menu #events-submenu .events-blueprint-side-menu').css("display", "block");
    }
    else {
        $('.sidebar-menu #events-submenu .events-blueprint-side-menu').css("display", "none");
    }

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

        if (versions[0] !== versions[1] || versions[1] !== versions[2]) {
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
