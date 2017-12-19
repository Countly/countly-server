window.todview = countlyView.extend({

    initialize: function () {
    },

    beforeRender: function () {
        var self = this;
        self.tod_type = "[CLY]_session";
        if (!this.timesOfDayData) {
            return $.when($.get(countlyGlobal["path"] + '/times-of-day/templates/times-of-day.html', function (src) {
                self.template = Handlebars.compile(src);
            }), timesOfDayPlugin.fetchAllEvents(), timesOfDayPlugin.fetchTodData(self.tod_type)).then(function () {
                self.timesOfDayData = timesOfDayPlugin.getTodData();
                self.eventsList = timesOfDayPlugin.getEventsList();
            });
        }


    },

    loadSessionEventData: function () {
        $("#event-session-list").html('<div data-value="[CLY]_session" class="es-option item" data-localize="times-of-day.sessions">' + jQuery.i18n.map['times-of-day.sessions'] + '</div>');
        $("#event-session-list").append('<div class="group">' + jQuery.i18n.map['times-of-day.events'] + '</div>');
        var events = this.eventsList || [];
        for (var i = 0; i < events.length; i++) {
            $("#event-session-list").append('<div data-value="' + events[i] + '" class="es-option item" data-localize="">' + events[i] + '</div>');
        }

        var self = this;
        $(".es-option").on("click", function () {
            var value = $(this).data("value");
            self.tod_type = value;
            $.when(
                timesOfDayPlugin.fetchTodData(value),
                timesOfDayPlugin.fetchAllEvents()
            ).done(function (result) {
                self.timesOfDayData = timesOfDayPlugin.getTodData();
                self.eventsList = timesOfDayPlugin.getEventsList();
                self.updateView();
            });
        });
    },

    renderCommon: function (isRefresh) {
        this.templateData = {
            "page-title": jQuery.i18n.map["times-of-day.plugin-title"]
        };

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            this.updateView();
        }
    },

    updateView: function () {
        $('#chart').empty();
        this.loadSessionEventData();
        this.loadTimesOfDay();
        this.loadTimeOfDayTable();
    },

    loadTimesOfDay: function () {
        timesOfDayPlugin.loadTimesOfDay(this.timesOfDayData);
    },

    loadTimeOfDayTable: function () {
        var self = this;
        var tableData = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23].map(function (h) {
            return {
                hour: h,
                sunday: self.timesOfDayData[0][h],
                monday: self.timesOfDayData[1][h],
                tuesday: self.timesOfDayData[2][h],
                wednesday: self.timesOfDayData[3][h],
                thursday: self.timesOfDayData[4][h],
                friday: self.timesOfDayData[5][h],
                saturday: self.timesOfDayData[6][h],
            }
        });

        this.dtable = $('#dataTableOne').dataTable($.extend({}, $.fn.dataTable.defaults, {
            "aaData": tableData,
            "fnRowCallback": function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
            },
            "aoColumns": [
                {
                    "mData": "hour", "mRender": function (hour, type) {
                        var nextHour = hour + 1 > 23 ? 0 : hour + 1;
                        return (hour < 10 ? "0" + hour : hour) + ":00 - " + (nextHour < 10 ? "0" + nextHour : nextHour) + ":00"
                    }, "sType": "string", "sTitle": jQuery.i18n.map['times-of-day.hours']
                },
                { "mData": "monday", "sType": "numeric", "sTitle": jQuery.i18n.map['times-of-day.monday'] },
                { "mData": "tuesday", "sType": "numeric", "sTitle": jQuery.i18n.map['times-of-day.tuesday'] },
                { "mData": "wednesday", "sType": "numeric", "sTitle": jQuery.i18n.map['times-of-day.wednesday'] },
                { "mData": "thursday", "sType": "numeric", "sTitle": jQuery.i18n.map['times-of-day.thursday'] },
                { "mData": "friday", "sType": "numeric", "sTitle": jQuery.i18n.map['times-of-day.friday'] },
                { "mData": "saturday", "sType": "numeric", "sTitle": jQuery.i18n.map['times-of-day.saturday'] },
                { "mData": "sunday", "sType": "numeric", "sTitle": jQuery.i18n.map['times-of-day.sunday'] }
            ]
        }));

        this.dtable.stickyTableHeaders();
        this.dtable.fnSort([[0, 'asc']]);
    },
    refresh: function () {
    },
});

app.todview = new todview();

app.route('/analytics/times-of-day', 'times-of-day', function () {
    this.renderWhenReady(this.todview);
});


$(document).ready(function () {
    var menu = '<a href="#/analytics/times-of-day" class="item" ">' +
        '<div class="logo fa fa-plugin" style="background-image:none; font-size:24px; text-align:center; width:35px; margin-left:14px; line-height:42px;"></div>' +
        '<div class="text" data-localize="times-of-day.plugin-title"></div>' +
        '</a>';

    $('.sidebar-menu #analytics-submenu').append(menu); 
});