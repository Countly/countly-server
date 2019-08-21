/*global
    Handlebars,
    CountlyHelpers,
    countlyGlobal,
    countlyView,
    ReportingView,
    countlyReporting,
    jQuery,
    app,
    $,
    _,
 */

window.ReportingView = countlyView.extend({
    statusChanged: {},
    emailInput: {},
    initialize: function() {
    },
    beforeRender: function() {
        var allAjaxCalls = [];
        var reportCallbacks = app.getReportsCallbacks();

        Object.keys(reportCallbacks).forEach(function(report) {
            if (reportCallbacks[report].ajax) {
                allAjaxCalls.push(reportCallbacks[report].ajax());
            }
        });

        allAjaxCalls.push(
            countlyReporting.initialize(),
            countlyReporting.requestEmailAddressList()
        );

        if (this.template) {
            return $.when.apply(null, allAjaxCalls).then(function() {});
        }
        else {
            var self = this;
            allAjaxCalls.push(
                $.get(countlyGlobal.path + '/reports/templates/drawer.html', function(src) {
                    src = (Handlebars.compile(src))({"email-placeholder": jQuery.i18n.map["reports.report-email"]});
                    Handlebars.registerPartial("reports-drawer-template", src);
                }),
                $.get(countlyGlobal.path + '/reports/templates/reports.html', function(src) {
                    self.template = Handlebars.compile(src);
                })
            );
            return $.when.apply(null, allAjaxCalls).then(function() {});
        }
    },
    getDayName: function(day) {
        switch (day) {
        case 1:
            return jQuery.i18n.map["reports.monday"];
        case 2:
            return jQuery.i18n.map["reports.tuesday"];
        case 3:
            return jQuery.i18n.map["reports.wednesday"];
        case 4:
            return jQuery.i18n.map["reports.thursday"];
        case 5:
            return jQuery.i18n.map["reports.friday"];
        case 6:
            return jQuery.i18n.map["reports.saturday"];
        case 7:
            return jQuery.i18n.map["reports.sunday"];
        default:
            return "";
        }
    },
    getDayNumber: function(day) {
        switch (day) {
        case jQuery.i18n.map["reports.monday"]:
            return "1";
        case jQuery.i18n.map["reports.tuesday"]:
            return "2";
        case jQuery.i18n.map["reports.wednesday"]:
            return "3";
        case jQuery.i18n.map["reports.thursday"]:
            return "4";
        case jQuery.i18n.map["reports.friday"]:
            return "5";
        case jQuery.i18n.map["reports.saturday"]:
            return "6";
        case jQuery.i18n.map["reports.sunday"]:
            return "7";
        default:
            return "1";
        }
    },
    renderCommon: function(isRefresh) {
        var cnts = app.manageAppsView.getTimeZones();
        ReportingView.zones = {};
        var zNames = {};
        var zoneNames = [];
        for (var i in cnts) {
            for (var j = 0; j < cnts[i].z.length; j++) {
                for (var k in cnts[i].z[j]) {
                    zoneNames.push(k);
                    ReportingView.zones[k] = cnts[i].z[j][k];
                    zNames[cnts[i].z[j][k]] = k;
                }
            }
        }

        var data = countlyReporting.getData();
        for (i = 0; i < data.length; i++) {
            data[i].appNames = CountlyHelpers.appIdsToNames(data[i].apps || []).split(", ");
            if (data[i].hour < 10) {
                data[i].hour = "0" + data[i].hour;
            }
            if (data[i].minute < 10) {
                data[i].minute = "0" + data[i].minute;
            }

            data[i].dayname = this.getDayName(data[i].day);
            data[i].zoneName = zNames[data[i].timezone] || "(GMT+00:00) GMT (no daylight saving)";
        }

        zoneNames.sort(function(a, b) {
            a = parseFloat(a.split(")")[0].replace(":", ".").substring(4));
            b = parseFloat(b.split(")")[0].replace(":", ".").substring(4));
            if (a < b) {
                return -1;
            }
            if (a > b) {
                return 1;
            }
            return 0;
        });
        this.zoneNames = zoneNames;
        this.zones = ReportingView.zones;
        this.templateData = {
            "page-title": jQuery.i18n.map["reports.title"],
            "data": data,
            "apps": countlyGlobal.apps,
            "zoneNames": zoneNames,
            "member": countlyGlobal.member,
            "hasCrash": (typeof countlyCrashes !== "undefined"),
            "hasPush": (typeof countlyPush !== "undefined"),
            "hasRevenue": (typeof countlyRevenue !== "undefined"),
            "hasViews": (typeof countlyViews !== "undefined")
        };


        var self = this;
        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            self.dtable = $('#reports-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": data,
                "fnRowCallback": function(nRow, aData) {
                    $(nRow).attr("id", aData._id);
                },
                "aoColumns": [
                    {"mData": 'title', "sType": "string", "sTitle": jQuery.i18n.map['report.report-title']},
                    {
                        "mData": function(row, type) {
                            if (type === "display") {
                                var disabled = (row.prepackaged) ? 'disabled' : '';
                                var input = '<div class="on-off-switch ' + disabled + '">';
                                if (row.enabled) {
                                    input += '<input type="checkbox" class="on-off-switch-checkbox report-switcher" id="plugin-' + row._id + '" checked ' + disabled + '>';
                                }
                                else {
                                    input += '<input type="checkbox" class="on-off-switch-checkbox report-switcher" id="plugin-' + row._id + '" ' + disabled + '>';
                                }
                                input += '<label class="on-off-switch-label" for="plugin-' + row._id + '"></label>';
                                input += '<span class="text">' + 'Enable' + '</span>';
                                return input;
                            }
                            else {
                                return row.enabled;
                            }
                        },
                        "sType": "string",
                        "sTitle": jQuery.i18n.map['report.status'],
                        "bSortable": false,

                    },
                    {
                        "mData": function(row) {
                            return row.emails.join("<br/>");
                        },
                        "sType": "string",
                        "sTitle": jQuery.i18n.map["reports.emails"]
                    },
                    {
                        "mData": function(row) {
                            var ret = "";

                            if (row.report_type === "core") {
                                for (var rowProp in row.metrics) {
                                    ret += jQuery.i18n.map["reports." + rowProp] + ", ";
                                }

                                ret = ret.substring(0, ret.length - 2);

                                ret += " for " + row.appNames.join(", ");
                            }
                            else if (!row.pluginEnabled) {
                                ret = jQuery.i18n.prop("reports.enable-plugin", row.report_type);
                            }
                            else if (!row.isValid) {
                                ret = jQuery.i18n.prop("reports.not-valid");
                            }
                            else {
                                var report = app.getReportsCallbacks()[row.report_type];
                                if (report && report.tableData) {
                                    ret = report.tableData(row);
                                }
                            }

                            return ret;
                        },
                        "sType": "string",
                        "sTitle": jQuery.i18n.map["reports.metrics"]
                    },
                    {
                        "mData": function(row) {
                            return jQuery.i18n.map["reports." + row.frequency];
                        },
                        "sType": "string",
                        "sTitle": jQuery.i18n.map["reports.frequency"]
                    },
                    {
                        "mData": function(row) {
                            var ret = jQuery.i18n.map["reports.at"] + " " + row.hour + ":" + row.minute + ", " + row.zoneName;
                            if (row.frequency === "weekly") {
                                ret += ", " + jQuery.i18n.map["reports.on"] + " " + row.dayname;
                            }
                            if (row.frequency === "monthly") {
                                ret += ", " + jQuery.i18n.map["reports.every-month"];
                            }
                            return ret;
                        },
                        "sType": "string",
                        "sTitle": jQuery.i18n.map["reports.time"]
                    },
                    {
                        "mData": function(row) {
                            var menu = "<div class='options-item'>" +
                                            "<div class='edit'></div>" +
                                            "<div class='edit-menu reports-menu'>";
                            if (row.pluginEnabled && row.isValid) {
                                menu += "<div class='edit-report item'" + " id='" + row._id + "'" + "><i class='fa fa-pencil'></i>Edit</div>" +
                                                        "<div class='send-report item'" + " id='" + row._id + "'" + "><i class='fa fa-paper-plane'></i>Send Now</div>" +
                                                        "<div class='preview-report item'" + " id='" + row._id + "'" + ">" +
                                                            '<a href=\'/i/reports/preview?api_key=' + countlyGlobal.member.api_key + '&args=' + JSON.stringify({_id: row._id}) + '\' target="_blank" class=""><i class="fa fa-eye"></i><span data-localize="reports.preview">' + jQuery.i18n.map["reports.preview"] + '</span></a>'
                                                        + "</div>";
                            }
                            menu += "<div class='delete-report item'" + " id='" + row._id + "'" + " data-name = '" + row.title + "' ><i class='fa fa-trash'></i>Delete</div>" +
                                            "</div>" +
                                        "</div>";
                            return menu;
                        },
                        "bSortable": false,
                    }
                ]
            }));
            self.dtable.fnSort([ [0, 'desc'] ]);
            self.dtable.stickyTableHeaders();
            self.initTable();

            self.initReportsWidget("core");
            $("#add-report").on("click", function() {
                self.widgetDrawer.init("core");
            });
        }
    },

    initReportsWidget: function(reportType) {
        var self = this;
        var apps = [];

        $("#add-report").on("click", function() {
            $("#reports-widget-drawer").addClass("open");
            $("#reports-widget-drawer").removeClass("editing");

            var reportCallbacks = app.getReportsCallbacks();

            Object.keys(reportCallbacks).forEach(function(report) {
                if (reportCallbacks[report].reset) {
                    reportCallbacks[report].reset();
                }
            });

            self.widgetDrawer.resetCore();
        });

        $("#frequency-dropdown").clySelectSetItems([
            {name: jQuery.i18n.map["reports.daily"], value: "daily"},
            {name: jQuery.i18n.map["reports.weekly"], value: "weekly"},
            {name: jQuery.i18n.map["reports.monthly"], value: "monthly"}
        ]);

        var timeList = [];
        for (var i = 0; i < 24; i++) {
            var v = (i > 9 ? i : "0" + i) + ":00";
            timeList.push({ value: v, name: v});
        }

        $("#reports-time-dropdown").clySelectSetItems(timeList);

        var cnts = app.manageAppsView.getTimeZones();
        var zones = {};
        var zNames = {};
        var zoneNames = [];
        var timeZoneList = [];
        for (i in cnts) {
            for (var j = 0; j < cnts[i].z.length; j++) {
                for (var k in cnts[i].z[j]) {
                    zoneNames.push(k);
                    zones[k] = cnts[i].z[j][k];
                    zNames[cnts[i].z[j][k]] = k;
                }
            }
        }
        zoneNames.sort(function(a, b) {
            a = parseFloat(a.split(")")[0].replace(":", ".").substring(4));
            b = parseFloat(b.split(")")[0].replace(":", ".").substring(4));
            if (a < b) {
                return -1;
            }
            if (a > b) {
                return 1;
            }
            return 0;
        });
        zoneNames.forEach(function(zone) {
            timeZoneList.push({value: zone, name: zone});
        });
        $("#reports-timezone-dropdown").clySelectSetItems(timeZoneList);

        for (var appId in countlyGlobal.apps) {
            apps.push({ value: appId, name: countlyGlobal.apps[appId].name });
        }

        $("#reports-multi-app-dropdown").clyMultiSelectSetItems(apps);

        $("#include-metrics-dropdown").clyMultiSelectSetItems([
            {name: jQuery.i18n.map["reports.analytics"], value: "analytics"},
            {name: jQuery.i18n.map["reports.events"], value: "events"},
            {name: jQuery.i18n.map["reports.revenue"], value: "revenue"},
            {name: jQuery.i18n.map["reports.crash"], value: "crash"},
        ]);

        $('#reports-widge-close').off("click").on("click", function() {
            $("#reports-widget-drawer").removeClass("open");
        });

        $('#daily-option').on("click", function() {
            $("#reports-dow-section").css("display", "none");
            $('#weekly-option').removeClass("selected");
            $('#monthly-option').removeClass("selected");
            $(this).addClass("selected");
            $("#reports-widget-drawer").trigger("cly-report-widget-section-complete");
        });
        $('#weekly-option').on("click", function() {
            $("#reports-dow-section").css("display", "block");
            $('#daily-option').removeClass("selected");
            $('#monthly-option').removeClass("selected");
            $("#reports-dow").clySelectSetSelection("", "");
            $(this).addClass("selected");
            $("#reports-widget-drawer").trigger("cly-report-widget-section-complete");
        });
        $('#monthly-option').on("click", function() {
            $("#reports-dow-section").css("display", "none");
            $('#weekly-option').removeClass("selected");
            $('#daily-option').removeClass("selected");
            $(this).addClass("selected");
            $("#reports-widget-drawer").trigger("cly-report-widget-section-complete");
        });

        var weekList = [
            {name: jQuery.i18n.map["reports.monday"], value: 1},
            {name: jQuery.i18n.map["reports.tuesday"], value: 2},
            {name: jQuery.i18n.map["reports.wednesday"], value: 3},
            {name: jQuery.i18n.map["reports.thursday"], value: 4},
            {name: jQuery.i18n.map["reports.friday"], value: 5},
            {name: jQuery.i18n.map["reports.saturday"], value: 6},
            {name: jQuery.i18n.map["reports.sunday"], value: 7},

        ];
        $("#reports-dow").clySelectSetItems(weekList);

        $("#reports-create-widget").off().on("click", function() {
            if ($(this).hasClass("disabled")) {
                return;
            }
            var reportSetting = self.widgetDrawer.getReportSetting();
            reportSetting.enabled = true;

            for (var key in reportSetting) {
                if (!reportSetting[key] || reportSetting[key] === '' ||
                    (reportSetting[key] && reportSetting[key].length === 0)) {
                    return CountlyHelpers.alert("Please complete all required fields",
                        "green",
                        function() { });
                }
            }
            $.when(countlyReporting.create(reportSetting)).then(function(data) {
                if (data.result === "Success") {
                    $("#reports-widget-drawer").removeClass("open");
                    app.activeView.render();
                }
                else {
                    CountlyHelpers.alert(data.result, "red");
                }
            }, function(err) {
                var data = JSON.parse(err.responseText);
                CountlyHelpers.alert(data.result, "red");
            });
        });

        $("#reports-save-widget").off().on("click", function() {
            if ($(this).hasClass("disabled")) {
                return;
            }
            var reportSetting = self.widgetDrawer.getReportSetting();
            reportSetting._id = $("#current_report_id").text();
            for (var key in reportSetting) {
                if (!reportSetting[key] || reportSetting[key] === '' ||
                    (reportSetting[key] && reportSetting[key].length === 0)) {
                    return CountlyHelpers.alert("Please complete all required fields",
                        "green",
                        function() { });
                }
            }
            $.when(countlyReporting.update(reportSetting)).then(function(data) {
                if (data.result === "Success") {
                    $("#reports-widget-drawer").removeClass("open");
                    app.activeView.render();
                }
                else {
                    CountlyHelpers.alert(data.result, "red");
                }
            }, function(err) {
                var data = JSON.parse(err.responseText);
                CountlyHelpers.alert(data.result, "red");
            });
        });

        $(".cly-drawer").find(".close").off("click").on("click", function() {
            $(".grid-stack-item").removeClass("marked-for-editing");
            $(this).parents(".cly-drawer").removeClass("open");
        });

        $("#report-name-input").on("keyup", function() {
            $("#reports-widget-drawer").trigger("cly-report-widget-section-complete");
        });

        $("#reports-metrics-analytics, #reports-metrics-revenue, #reports-metrics-events, #reports-metrics-crash").on("change", function() {
            $("#reports-widget-drawer").trigger("cly-report-widget-section-complete");
        });

        $("#report-types").on("click", ".opt:not(.disabled)", function() {
            $("#report-types").find(".opt").removeClass("selected");
            $(this).addClass("selected");

            var selReportType = $("#report-types").find(".opt.selected").data("report-type");

            var reportCallbacks = app.getReportsCallbacks();

            Object.keys(reportCallbacks).forEach(function(report) {
                if (reportCallbacks[report].reset) {
                    reportCallbacks[report].reset();
                }
            });

            $("#reports-multi-app-dropdown").clyMultiSelectClearSelection();
            $("#reports-multi-app-dropdown .select-items .item").removeClass("selected");
            $("#reports-metrics-analytics").prop("checked", false);
            $("#reports-metrics-revenue").prop("checked", false);
            $("#reports-metrics-events").prop("checked", false);
            $("#reports-metrics-crash").prop("checked", false);

            self.widgetDrawer.init(selReportType);
            $("#reports-widget-drawer").trigger("cly-report-widget-section-complete");
        });

        $("#reports-dow, #reports-time-dropdown, #reports-timezone-dropdown").on("cly-select-change", function() {
            $("#reports-widget-drawer").trigger("cly-report-widget-section-complete");
        });

        $("#reports-multi-app-dropdown").on("cly-multi-select-change", function() {
            $("#reports-widget-drawer").trigger("cly-report-widget-section-complete");
        });
        /*eslint-disable */
        var REGEX_EMAIL = '([a-z0-9!#$%&\'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&\'*+/=?^_`{|}~-]+)*@' +
        '(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)';
        /*eslint-enable */

        self.emailInput = $('#email-list-input').selectize({
            plugins: ['remove_button'],
            persist: false,
            maxItems: null,
            valueField: 'email',
            labelField: 'name',
            searchField: ['name', 'email'],
            options: [
                {email: countlyGlobal.member.email, name: ''},
            ],
            render: {
                item: function(item, escape) {
                    return '<div>' +
                        (item.name ? '<span class="name">' + escape(item.name) + '</span>' : '') +
                        (item.email ? '<span class="email">' + escape(item.email) + '</span>' : '') +
                    '</div>';
                },
                option: function(item, escape) {
                    var label = item.name || item.email;
                    var caption = item.name ? item.email : null;
                    return '<div>' +
                        '<span class="label">' + escape(label) + '</span>' +
                        (caption ? '<span class="caption">' + escape(caption) + '</span>' : '') +
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
                /*eslint-disable */
                regex = new RegExp('^([^<]*)\<' + REGEX_EMAIL + '\>$', 'i');
                /*eslint-enable */
                match = input.match(regex);
                if (match) {
                    return !Object.prototype.hasOwnProperty.call(this.options, match[2]);
                }

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

        self.emailInput.on("change", function() {
            $("#reports-widget-drawer").trigger("cly-report-widget-section-complete");
        });

        $("#reports-widget-drawer").on("cly-report-widget-section-complete", function() {
            var reportSetting = self.widgetDrawer.getReportSetting();
            reportSetting.enabled = true;

            var allGood = true;

            for (var key in reportSetting) {
                if (!reportSetting[key] || reportSetting[key] === '' ||
                    (reportSetting[key] && reportSetting[key].length === 0)) {
                    allGood = false;
                }
            }

            if (allGood) {
                $("#reports-create-widget").removeClass("disabled");
                $("#reports-save-widget").removeClass("disabled");
            }
            else {
                $("#reports-create-widget").addClass("disabled");
                $("#reports-save-widget").addClass("disabled");
            }
        });

        self.widgetDrawer.init(reportType);
    },

    widgetDrawer: {
        init: function(reportType) {
            var self = this;

            self.report_type = reportType;
            $("#reports-widget-drawer .details .section").hide();

            $("#reports-widget-drawer .details #report-name-input").closest(".section").show();
            $("#reports-widget-drawer .details #email-list-input").closest(".section").show();
            $("#reports-widget-drawer .details #reports-frequency").closest(".section").show();
            $("#reports-widget-drawer .details #reports-time-dropdown").closest(".section").show();
            $("#reports-widget-drawer .details #reports-timezone-dropdown").closest(".section").show();
            $("#reports-widget-drawer .details #report-types").closest(".section").show();

            if ($("#weekly-option").hasClass("selected")) {
                $("#reports-dow-section").show();
            }
            var $reportTypes = $("#report-types");
            $reportTypes.find(".opt").removeClass("selected");
            $reportTypes.find(".opt[data-report-type=" + reportType + "]").addClass("selected");

            var report = app.getReportsCallbacks()[reportType];
            if (report && report.init) {
                report.init();
            }

            if (reportType === "core") {
                $("#reports-widget-drawer .details #reports-multi-app-dropdown").closest(".section").show();
                $("#reports-widget-drawer .details .include-metrics").closest(".section").show();
            }
        },

        loadData: function(data) {
            var reportType = data.report_type || "core";
            this.init(reportType);
            var emailInp = app.reportingView.emailInput;
            if (emailInp && emailInp.length > 0) {
                for (var i = 0; i < data.emails.length; i++) {
                    (emailInp[0]).selectize.addOption({ "name": '', "email": data.emails[i] });
                }
                (emailInp[0]).selectize.setValue(data.emails, false);
            }

            $("#report-types").find(".opt").removeClass("selected");
            $("#report-types").find(".opt[data-report-type=" + reportType + "]").addClass("selected");

            $("#reports-widget-drawer").addClass("open editing");
            $("#current_report_id").text(data._id);
            $("#report-name-input").val(data.title);

            if (data.frequency === 'daily') {
                $('#daily-option').addClass("selected");
                $('#weekly-option').removeClass("selected");
                $('#monthly-option').removeClass("selected");
                $("#reports-dow-section").css("display", "none");
            }
            else if (data.frequency === 'monthly') {
                $('#daily-option').removeClass("selected");
                $('#weekly-option').removeClass("selected");
                $('#monthly-option').addClass("selected");
                $("#reports-dow-section").css("display", "none");
            }
            else {
                $('#daily-option').removeClass("selected");
                $('#monthly-option').removeClass("selected");
                $('#weekly-option').addClass("selected");
                $("#reports-dow-section").css("display", "block");
                $("#reports-dow").clySelectSetSelection(data.day, app.reportingView.getDayName(data.day));
            }

            var timeString = data.hour + ":" + data.minute;
            $("#reports-time-dropdown").clySelectSetSelection(timeString, timeString);

            $("#reports-timezone-dropdown").clySelectSetSelection(data.zoneName, data.zoneName);

            var report = app.getReportsCallbacks()[reportType];
            if (report && report.set) {
                report.set(data);
            }

            if (reportType === "core") {
                var appSelected = [];
                for (var index in data.apps) {
                    var appId = data.apps[index];
                    appSelected.push({name: countlyGlobal.apps[appId].name, value: appId});
                }

                $("#reports-multi-app-dropdown").clyMultiSelectSetSelection(appSelected);
                $("#reports-metrics-analytics").prop("checked", data.metrics.analytics ? true : false);
                $("#reports-metrics-revenue").prop("checked", data.metrics.revenue ? true : false);
                $("#reports-metrics-events").prop("checked", data.metrics.events ? true : false);
                $("#reports-metrics-crash").prop("checked", data.metrics.crash ? true : false);
            }

            $("#reports-save-widget").addClass("disabled");
        },

        resetCore: function() {
            $("#current_report_id").text("");
            $("#report-name-input").val("");
            $("#report-name-input").attr("placeholder", jQuery.i18n.prop("reports.report-name"));
            $("#reports-dow").clySelectSetSelection("", jQuery.i18n.prop("reports.select_dow"));
            $("#reports-timezone-dropdown").clySelectSetSelection("", jQuery.i18n.prop("reports.select_timezone"));
            $("#reports-time-dropdown").clySelectSetSelection("", jQuery.i18n.prop("reports.select_time"));
            $("#reports-multi-app-dropdown").clyMultiSelectClearSelection();
            $("#reports-multi-app-dropdown .select-items .item").removeClass("selected");
            $("#reports-metrics-analytics").prop("checked", false);
            $("#reports-metrics-revenue").prop("checked", false);
            $("#reports-metrics-events").prop("checked", false);
            $("#reports-metrics-crash").prop("checked", false);
            $("#reports-dow-section").css("display", "none");
            $("#reports-frequency").find(".check").removeClass("selected");
            $('#daily-option').addClass("selected");
            var emailInp = app.reportingView.emailInput;

            if (emailInp && emailInp.length > 0) {
                (emailInp[0]).selectize.addOption({});
                (emailInp[0]).selectize.setValue([], false);
            }
        },

        getReportSetting: function() {
            var reportType = this.report_type;
            var emails = [];
            $("#email-list-input  :selected").each(function() {
                emails.push($(this).val());
            });
            var settings = {
                report_type: reportType,
                title: $("#report-name-input").val(),
                emails: emails,
                frequency: "daily",
                day: 1,
                hour: null,
                minute: null
            };
            var selectDaily = $("#daily-option").hasClass("selected");
            var selectMonthly = $("#monthly-option").hasClass("selected");
            if (!selectDaily && !selectMonthly) {
                settings.frequency = "weekly";
                settings.day = parseInt($("#reports-dow").clySelectGetSelection());
            }
            if (selectMonthly) {
                settings.frequency = "monthly";
            }
            var timeSelected = $("#reports-time-dropdown").clySelectGetSelection();
            if (timeSelected) {
                var time = timeSelected ? timeSelected.split(":") : null;
                settings.hour = time[0];
                settings.minute = time[1];
            }

            var zones = app.reportingView.zones;
            if (!zones) {
                var cnts = app.manageAppsView.getTimeZones();
                zones = {};
                for (var i in cnts) {
                    for (var j = 0; j < cnts[i].z.length; j++) {
                        for (var k in cnts[i].z[j]) {
                            zones[k] = cnts[i].z[j][k];
                        }
                    }
                }
            }

            var timeZone = $("#reports-timezone-dropdown").clySelectGetSelection() || "Etc/GMT";
            settings.timezone = zones[timeZone];

            if (reportType === "core") {
                settings.metrics = null;

                if ($("#reports-metrics-analytics").prop("checked")) {
                    if (!settings.metrics) {
                        settings.metrics = {};
                    }
                    settings.metrics.analytics = true;
                }
                if ($("#reports-metrics-revenue").prop("checked")) {
                    if (!settings.metrics) {
                        settings.metrics = {};
                    }
                    settings.metrics.revenue = true;
                }
                if ($("#reports-metrics-events").prop("checked")) {
                    if (!settings.metrics) {
                        settings.metrics = {};
                    }
                    settings.metrics.events = true;
                }
                if ($("#reports-metrics-crash").prop("checked")) {
                    if (!settings.metrics) {
                        settings.metrics = {};
                    }
                    settings.metrics.crash = true;
                }

                settings.apps = $('#reports-multi-app-dropdown').clyMultiSelectGetSelection();
            }

            var report = app.getReportsCallbacks()[reportType];
            if (report && report.settings) {
                var reportSettings = report.settings();
                for (var key in reportSettings) {
                    settings[key] = reportSettings[key];
                }
            }

            return settings;
        }
    },
    initTable: function() {
        var self = this;
        $(".save-report").off("click").on("click", function(data) {
            $.when(countlyReporting.update(data)).then(function(result) {
                if (result.result === "Success") {
                    app.activeView.render();
                }
                else {
                    CountlyHelpers.alert(result.result, "red");
                }
            }, function(err) {
                var errorData = JSON.parse(err.responseText);
                CountlyHelpers.alert(errorData.result, "red");
            });
        });

        $(".edit-report").off("click").on("click", function(e) {
            var reportId = e.target.id;
            var formData = countlyReporting.getReport(reportId);
            self.widgetDrawer.loadData(formData);
        });

        $(".delete-report").off("click").on("click", function(e) {
            var id = e.target.id;
            var name = $(e.target).attr("data-name");
            CountlyHelpers.confirm(jQuery.i18n.prop("reports.confirm", "<b>" + name + "</b>"), "popStyleGreen", function(result) {
                if (!result) {
                    return false;
                }
                $.when(countlyReporting.del(id)).then(function(data) {
                    if (data.result === "Success") {
                        app.activeView.render();
                    }
                    else {
                        CountlyHelpers.alert(data.result, "red");
                    }
                });

            }, [jQuery.i18n.map["common.no-dont-delete"], jQuery.i18n.map["reports.yes-delete-report"]], {title: jQuery.i18n.map["reports.delete-report-title"], image: "delete-email-report"});
        });

        $(".send-report").off("click").on("click", function(e) {
            var id = e.target.id;
            var overlay = $("#overlay").clone();
            overlay.show();
            $.when(countlyReporting.send(id)).always(function(data) {
                overlay.hide();
                if (data && data.result === "Success") {
                    CountlyHelpers.alert(jQuery.i18n.map["reports.sent"], "green");
                }
                else {
                    if (data && data.result) {
                        CountlyHelpers.alert(data.result, "red");
                    }
                    else {
                        CountlyHelpers.alert(jQuery.i18n.map["reports.too-long"], "red");
                    }
                }
            });
        });

        $('input[name=frequency]').off("click").on("click", function() {
            var currUserDetails = $(".user-details:visible");
            switch ($(this).val()) {
            case "daily":
                currUserDetails.find(".reports-dow").hide();
                break;
            case "weekly":
                currUserDetails.find(".reports-dow").show();
                break;
            case "monthly":
                currUserDetails.find(".reports-dow").hide();
                break;
            }
        });
        CountlyHelpers.initializeSelect($(".user-details"));

        // load menu
        $("body").off("click", ".options-item .edit").on("click", ".options-item .edit", function() {
            $(".edit-menu").fadeOut();
            $(this).next(".edit-menu").fadeToggle();
            event.stopPropagation();
        });

        $(window).click(function() {
            $(".options-item").find(".edit").next(".edit-menu").fadeOut();
        });

        $(".report-switcher").off("click").on("click", function() {
            var pluginId = this.id.toString().replace(/^plugin-/, '');
            var newStatus = $(this).is(":checked");
            var list = countlyReporting.getData();
            var record = _.filter(list, function(item) {
                return item._id === pluginId;
            });
            if (record) {
                (record[0].enabled !== newStatus) ? (self.statusChanged[pluginId] = newStatus) : (delete self.statusChanged[pluginId]);
            }
            var keys = _.keys(self.statusChanged);
            if (keys && keys.length > 0) {
                $(".data-save-bar-remind").text(' You made ' + keys.length + (keys.length === 1 ? ' change.' : ' changes.'));

                return $(".data-saver-bar").removeClass("data-saver-bar-hide");
            }
            $(".data-saver-bar").addClass("data-saver-bar-hide");
        });

        $(".data-saver-cancel-button").off("click").on("click", function() {
            $.when(countlyReporting.initialize()).then(function() {
                self.statusChanged = {};
                self.renderCommon();
                app.localize();
                return $(".data-saver-bar").addClass("data-saver-bar-hide");
            });
        });

        $(".data-saver-button").off("click").on("click", function() {
            $.when(countlyReporting.updateStatus(self.statusChanged)).then(function() {
                return $.when(countlyReporting.initialize()).then(function() {
                    self.statusChanged = {};
                    self.renderCommon();
                    app.localize();
                    return $(".data-saver-bar").addClass("data-saver-bar-hide");
                });
            });
        });

        $(".save-table-data").css("display", "none");
    }
});

app.addReportsCallbacks = function(plugin, options) {
    if (!this.reportCallbacks) {
        this.reportCallbacks = {};
    }

    this.reportCallbacks[plugin] = options;
};

app.getReportsCallbacks = function() {
    return this.reportCallbacks;
};

app.addReportsCallbacks("reports", {
    initialize: function(el, reportType, cb) {
        el = el || "body";
        var self = this;
        $.when(
            $.get(countlyGlobal.path + '/reports/templates/drawer.html', function(src) {
                self.reportsDrawer = src;
            }),
            countlyReporting.requestEmailAddressList(),
            countlyReporting.initialize()
        ).then(function() {
            $('#reports-widget-drawer').remove();
            var drawerViewDom = Handlebars.compile(self.reportsDrawer)({"email-placeholder": jQuery.i18n.map["reports.report-email"]});
            $(el).after(drawerViewDom);
            app.localize();
            app.reportingView.initReportsWidget(reportType);
            $("#reports-widget-drawer .details #report-types").closest(".section").hide();

            if (cb) {
                return cb();
            }
        });
    }
});

//register views
app.reportingView = new ReportingView();

app.route('/manage/reports', 'reports', function() {
    this.renderWhenReady(this.reportingView);
});

$(document).ready(function() {
    app.addSubMenu("management", {code: "reports", url: "#/manage/reports", text: "reports.title", priority: 30});
});