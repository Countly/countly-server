/*global
    countlyView,
    countlyGlobal,
    CountlyHelpers,
    Handlebars,
    alertsPlugin,
    _,
    jQuery,
    $,
    app,
    T,
    countlyAuth
 */


var alertDefine = {
    metric: {
        target: [
            { value: 'Total users', name: 'Total users' },
            { value: 'New users', name: 'New users' },
            { value: 'Total sessions', name: 'Total sessions' },
            { value: 'Average session duration', name: 'Average session duration' },
            { value: 'Bounce rate', name: 'Bounce rate (%)' },
            { value: 'Number of page views', name: 'Number of page views' },
            { value: 'Purchases', name: 'Purchases' },
        ],
        condition: [
            { value: 'increased by at least', name: 'increased by at least' },
            { value: 'decreased by at least', name: 'decreased by at least' },
        ]
    },
    event: {
        target: [],
        condition: [
            { value: 'increased by at least', name: 'increased by at least' },
            { value: 'decreased by at least', name: 'decreased by at least' },
        ]
    },
    crash: {
        target: [
            { value: 'Total crashes', name: 'Total crashes' },
            { value: 'New crash occurence', name: 'New crash occurence' },
            { value: 'None fatal crash per session', name: 'None fatal crash per session' },
            { value: 'Fatal crash per session', name: 'Fatal crash per session' },
        ],
        condition: [
            { value: 'increased by at least', name: 'increased by at least' },
            { value: 'decreased by at least', name: 'decreased by at least' },
        ]
    },
    rating: {
        target: [
            { value: 'Number of ratings', name: 'Number of ratings' },
        ],
        condition: [
            { value: 'increased by at least', name: 'increased by at least' },
            { value: 'decreased by at least', name: 'decreased by at least' },
        ]
    },
    dataPoint: {
        target: [
            { value: 'Number of daily DP', name: 'Daily data points' },
            { value: 'Hourly data points', name: 'Hourly data points' },
            { value: 'Monthly data points', name: 'Monthly data points' }
        ],
        condition: [
            { value: 'increased by at least', name: 'increased by at least' },
            { value: 'decreased by at least', name: 'decreased by at least' },
        ]
    },

};

// dynamic to get value for different settings properties.
var dict = {
    crash: {
        'New crash occurence': {
            compareDescribe: function(settings) {
                return settings.alertDataSubType ;
            },
            period: function() {
                return 'every 1 hour on the 59th min';
            }
        },
    },
};



window.AlertsView = countlyView.extend({
    featureName: 'alerts',
    initialize: function() {
    },
    statusChanged: {},
    lastAlertAppId: '',
    beforeRender: function() {
        var self = this;
        return $.when(
            T.get('/alerts/templates/alert-widget-drawer.html', function(src) {
                Handlebars.registerPartial("alert-widget-drawer", src);
            }),
            T.get('/alerts/templates/alert-types-config-template.html', function(src) {
                Handlebars.registerPartial("alert-types-config-template", src);
            }),
            T.get('/alerts/templates/form.html', function(src) {
                self.template = Handlebars.compile(src);
            }),
            alertsPlugin.requestAlertsList()
        ).then(function() {
        });
    },
    prepareDrawer: function() {
        var self = this;
        this.widgetDrawer.drawer = CountlyHelpers.createDrawer({
            id: "alert-widget-drawer",
            form: $('#alert-widget-drawer'),
            title: jQuery.i18n.map["alert.Add_New_Alert"],
            applyChangeTriggers: false,
            resetForm: function() {
                $("#current_alert_id").text('');
                $(self.widgetDrawer.drawer).find('.title span').first().html(jQuery.i18n.map["alert.Add_New_Alert"]);
                $("#alert-widget-drawer").find("#widget-types .opt").removeClass("disabled");
                $("#create-widget").removeClass("disabled");
                $(($('#alert-data-types').find("[data-data-type='metric']"))).trigger("click");
                if (self.widgetDrawer.emailInput && self.widgetDrawer.emailInput.length > 0) {
                    (self.widgetDrawer.emailInput[0]).selectize.setValue("");
                }
            },
            onClosed: function() {
                $(".grid-stack-item").removeClass("marked-for-editing");
            }
        });

        this.widgetDrawer.init();
        var self1 = this;
        $("#create-alert").off("click").on("click", function() {
            self1.widgetDrawer.init();
            self1.widgetDrawer.drawer.resetForm();
            self1.widgetDrawer.drawer.open();
        });
    },

    renderTable: function() {
        var pluginsData = [];
        var self = this;
        var alertsList = alertsPlugin.getAlertsList();
        app.alertsView.updateCount();

        for (var i = 0; i < alertsList.length; i++) {
            var appNameList = [];
            if (alertsList[i].selectedApps) {
                appNameList = _.map(alertsList[i].selectedApps, function(appID) {
                    if (appID === "all-apps") {
                        return "All apps";
                    }
                    return countlyGlobal.apps[appID] && countlyGlobal.apps[appID].name;
                });
            }
            pluginsData.push({
                id: alertsList[i]._id,
                app_id: alertsList[i].selectedApps[0],
                appNameList: appNameList.join(', '),
                alertName: alertsList[i].alertName || '',
                type: alertsList[i].alertDataSubType || '',
                condtionText: alertsList[i].compareDescribe || '',
                enabled: alertsList[i].enabled || false,
                createdByUser: alertsList[i].createdByUser || ''
            });
        }
        var isAdmin = countlyGlobal.member.global_admin;
        var dataTableDefine = {
            "aaData": pluginsData,
            "aoColumns": [
                {
                    "mData": 'alertName',
                    "sType": "string",
                    "sTitle": jQuery.i18n.map["alert.Alert_Name"],
                },
                {
                    "mData": function(row, type) {
                        if (type === "display") {
                            var disabled = (row.prepackaged) || (!countlyAuth.validateUpdate(self.featureName)) ? 'disabled' : '';
                            var input = '<div class="on-off-switch ' + disabled + '">';
                            if (row.enabled) {
                                input += '<input type="checkbox" class="on-off-switch-checkbox alert-switcher" app-id="' + row.app_id + '" id="plugin-' + row.id + '" checked ' + disabled + '>';
                            }
                            else {
                                input += '<input type="checkbox" class="on-off-switch-checkbox alert-switcher" app-id="' + row.app_id + '" id="plugin-' + row.id + '" ' + disabled + '>';
                            }
                            input += '<label class="on-off-switch-label" for="plugin-' + row.id + '"></label>';
                            input += '<span class="text">' + 'Enable' + '</span>';
                            return input;
                        }
                        else {
                            return row.enabled;
                        }
                    },
                    "sType": "string",
                    "sTitle": jQuery.i18n.map["common.status"],
                    "bSortable": false,

                },
                {
                    "mData": 'appNameList',
                    "sType": "string",
                    "sTitle": jQuery.i18n.map["alert.Application"],
                    "bSortable": false,
                },
                {
                    "mData": 'condtionText',
                    "sType": "string",
                    "sTitle": jQuery.i18n.map["alert.Condition"],
                    "bSortable": false,
                }
            ]
        };
        if (isAdmin) {
            dataTableDefine.aoColumns.push({
                "mData": 'createdByUser',
                "sType": "string",
                "sTitle": jQuery.i18n.map["alert.CreateBy"],
                "bSortable": false
            });
        }
        if (countlyAuth.validateUpdate(self.featureName) || countlyAuth.validateDelete(self.featureName)) {
            dataTableDefine.aoColumns.push({
                "mData": function(row) {
                    var menu = "<div class='options-item'>";
                    menu += "<div class='edit'></div>";
                    menu += "<div class='edit-menu alerts-menu'>";
                    if (countlyAuth.validateUpdate(self.featureName)) {
                        menu += "<div class='edit-alert item'" + " app-id='" + row.app_id + "' id='" + row.id + "'" + "><i class='fa fa-pencil'></i>" + jQuery.i18n.map["alert.Edit"] + "</div>";
                    }
                    if (countlyAuth.validateDelete(self.featureName)) {
                        menu += "<div class='delete-alert item'" + " app-id='" + row.app_id + "' id='" + row.id + "'" + " data-name='" + row.alertName + "'" + "><i class='fa fa-trash'></i>" + jQuery.i18n.map["alert.Delete"] + "</div></div>";
                    }
                    menu += "</div>";

                    return menu;
                },
                "bSortable": false,
            });
        }

        this.dtable = $('#alerts-table').dataTable($.extend({}, $.fn.dataTable.defaults, dataTableDefine));
        this.dtable.stickyTableHeaders();
        this.dtable.fnSort([[0, 'asc']]);

        $(".alert-switcher").off("click").on("click", function() {
            var pluginId = this.id.toString().replace(/^plugin-/, '');
            var appId = $(this).attr('app-id');
            var newStatus = $(this).is(":checked");
            var list = alertsPlugin.getAlertsList();
            self.lastAlertAppId = appId;
            var alertRecord = _.filter(list, function(item) {
                return item._id === pluginId;
            });
            if (alertRecord) {
                (alertRecord[0].enabled + '' !== newStatus + '') ? (self.statusChanged[pluginId] = newStatus) : (delete self.statusChanged[pluginId]);
            }
            var keys = _.keys(self.statusChanged);
            if (keys && keys.length > 0) {
                if (keys.length === 1) {
                    $(".data-save-bar-remind").text(jQuery.i18n.prop("alert.make-change-remind"));
                }
                else {
                    $(".data-save-bar-remind").text(jQuery.i18n.prop("alert.make-changes-remind", keys.length));
                }
                return $(".data-saver-bar").removeClass("data-saver-bar-hide");
            }
            $(".data-saver-bar").addClass("data-saver-bar-hide");
        });
        $(".data-saver-cancel-button").off("click").on("click", function() {
            self.statusChanged = {};
            self.renderTable();
            return $(".data-saver-bar").addClass("data-saver-bar-hide");
        });
        $(".data-saver-button").off("click").on("click", function() {
            alertsPlugin.updateAlertStatus(self.statusChanged, self.lastAlertAppId, function() {
                alertsPlugin.requestAlertsList(function() {
                    self.renderTable();
                });
            });
            return $(".data-saver-bar").addClass("data-saver-bar-hide");
        });

        // load menu
        $("body").off("click", ".options-item .edit").on("click", ".options-item .edit", function() {
            $(this).next(".edit-menu").fadeToggle();
            event.stopPropagation();
        });

        $(window).click(function() {
            $(".options-item").find(".edit").next(".edit-menu").fadeOut();
        });

        $(".delete-alert").off("click").on("click", function(e) {
            var alertID = e.target.id;
            var appId = $('#' + alertID).attr('app-id');
            var name = $(e.target).attr("data-name");
            return CountlyHelpers.confirm(jQuery.i18n.prop("alert.delete-confirm", "<b>" + name + "</b>"), "popStyleGreen", function(result) {
                if (result) {
                    alertsPlugin.deleteAlert(alertID, appId, function() {
                        alertsPlugin.requestAlertsList(function() {
                            self.renderTable();
                        });
                    });
                }
            }, [jQuery.i18n.map["common.no-dont-delete"], jQuery.i18n.map["alert.yes-delete-alert"]], {title: jQuery.i18n.map["alert.delete-confirm-title"], image: "delete-alert"});
        });

        $(".edit-alert").off("click").on("click", function(e) {
            var alertID = e.target.id;
            self.lastAlertAppId = $('#' + alertID).attr('app-id');
            var formData = alertsPlugin.getAlert(alertID);
            self.widgetDrawer.loadData(formData);
            $(self.widgetDrawer.drawer).find('.title span').first().html(jQuery.i18n.map["alert.Edit_Your_Alert"]);

            self.widgetDrawer.drawer.open();
            $(self.widgetDrawer.drawer).addClass("open editing");
        });

    },
    renderCommon: function(refresh) {
        var self = this;
        $(this.el).html(this.template({"email-placeholder": jQuery.i18n.map["alert.email-place-holder"]}));
        if (!refresh) {
            var views = ["starView", "crashesView"];
            views.forEach(function(view) {
                if (!app[view]) {
                    CountlyHelpers.notify({
                        clearAll: false,
                        type: 'warning',
                        title: jQuery.i18n.map["alert." + view + "-disabled-title"],
                        message: jQuery.i18n.map["alert." + view + "-disabled-desc"],
                        info: jQuery.i18n.map["alert." + view + "-disabled-suggest"],
                        delay: 5000,
                        sticky: false
                    });
                }
            });
        }
        if (countlyAuth.validateCreate(self.featureName)) {
            $('#create-alert').show();
        }
        this.renderTable();
        this.prepareDrawer();
    },
    updateCount: function() {
        var count = alertsPlugin.getCount();
        $("#alerts-running-sum").text(count.r);
        $("#alerts-total-sum").text(count.t);
        $("#alerts-today-sum").text(count.today);
    },
    widgetDrawer: {
        loadRatingOptions: function(selected) {
            var ratings = [
                {value: 1, name: jQuery.i18n.map["star.one-star"]},
                {value: 2, name: jQuery.i18n.map["star.two-star"]},
                {value: 3, name: jQuery.i18n.map["star.three-star"]},
                {value: 4, name: jQuery.i18n.map["star.four-star"]},
                {value: 5, name: jQuery.i18n.map["star.five-star"]},
            ];
            $("#single-target2-dropdown").clySelectSetItems(ratings);
            if (selected) {
                $("#single-target2-dropdown").clySelectSetSelection(ratings[selected - 1].value, ratings[selected - 1].name);
            }
            else {
                $("#single-target2-dropdown").clySelectSetSelection("", "Select a rating");
            }
        },
        loadAppViewData: function(selectedView) {
            var appID = $("#single-app-dropdown").clySelectGetSelection();
            var self = this;
            self.selectedView = selectedView;
            if (appID) {
                alertsPlugin.getViewForApp(appID, function(viewList) {
                    $("#single-target2-dropdown").clySelectSetItems(viewList);
                    if (self.selectedView) {
                        alertsPlugin.getViewForApp(appID, function() {
                            var selectedViewName = '';
                            for (var i = 0; i < viewList.length; i++) {
                                if (viewList[i].value === self.selectedView) {
                                    selectedViewName = viewList[i].name;
                                }
                            }
                            $("#single-target2-dropdown").clySelectSetSelection(self.selectedView, selectedViewName);
                        });
                    }
                    else {
                        $("#single-target2-dropdown").clySelectSetSelection("", "Select a View");
                    }
                });
            }
            else {
                $("#single-target2-dropdown").clySelectSetSelection("", "please select app first");
            }
            $("#alert-compare-value-input").attr("placeholder", jQuery.i18n.map["alert.add-number"]);
        },
        init: function() {
            var self = this;
            // clear alertName
            $("#alert-name-input").val('');
            $("#alert-name-input").off('input').on('input', function() {
                self.checkDisabled();
            });
            // select alert data type : metric , event crash
            var metricClickListner = function() {
                $("#single-target-dropdown").off("cly-select-change").on("cly-select-change", function(e, selected) {
                    var dataType = $(($('#alert-data-types').find(".selected")[0])).data("dataType");
                    var source = $("#" + dataType + "-condition-template").html();
                    $('.alert-condition-block').html(source);

                    if (selected === 'Number of page views') {
                        source = $("#metric2-condition-template").html();
                        $('.alert-condition-block').html(source);
                        $("#single-target-dropdown").clySelectSetItems(alertDefine[dataType].target);
                        self.loadAppViewData();
                    }
                    else if (selected === 'Number of ratings') {
                        source = $("#rating-condition-template").html();
                        $('.alert-condition-block').html(source);
                        $("#single-target-dropdown").clySelectSetItems(alertDefine[dataType].target);
                        self.loadRatingOptions();
                    }
                    else if (selected === 'Bounce rate') {
                        source = $("#metric2-condition-template").html();
                        $('.alert-condition-block').html(source);
                        $("#single-target-dropdown").clySelectSetItems(alertDefine[dataType].target);
                        self.loadAppViewData();
                    }
                    else if (selected === 'New crash occurence') {
                        $("#single-target-condition-dropdown").css("visibility", "hidden");
                        $('#alert-compare-value').css("visibility", "hidden");
                    }
                    else if (selected === 'Monthly data points' || selected === 'Hourly data points') {
                        $("#single-target-condition-dropdown").clySelectSetSelection("reach threshold", "reach threshold");
                        $("#alert-view .alert-compare-value-class").addClass("datapoint");
                        setTimeout(function() {
                            $("#single-target-condition-dropdown").clySelectSetItems([{value: 'reach threshold', name: 'reach threshold'}]);
                        }, 10);
                    }
                    else {
                        $("#single-target-condition-dropdown").css("visibility", "visible");
                        $('#alert-compare-value').css("visibility", "visible");

                    }


                    $("#single-target-dropdown").clySelectSetItems(alertDefine[dataType].target);
                    $("#single-target-condition-dropdown").clySelectSetItems(alertDefine[dataType].condition);
                    for (var i = 0; i < alertDefine[dataType].target.length; i++) {
                        var item = alertDefine[dataType].target[i];
                        if (item.value === selected) {
                            $("#single-target-dropdown").clySelectSetSelection(item.value, item.name);
                        }
                    }

                    $("#single-target-condition-dropdown").off("cly-select-change").on("cly-select-change", function() {
                        self.checkDisabled();
                    });
                    $("#alert-compare-value-input").off("input").on("input", function() {
                        self.checkDisabled();
                    });
                    metricClickListner();
                    self.checkDisabled();
                    $("#alert-compare-value-input").attr("placeholder", jQuery.i18n.map["alert.add-number"]);
                    app.localize();
                });

            };
            $(".alert-data-type").off("click").on("click", function() {
                var dataType = $(this).data("dataType");
                $(".alert-data-type").removeClass('selected');
                $(this).addClass('selected');

                $("#widget-section-single-app").show();

                $("#single-app-dropdown").clySelectSetSelection("", "Select App");

                var source = $("#" + dataType + "-condition-template").html();
                $('.alert-condition-block').html(source);

                $("#single-target-dropdown").clySelectSetItems(alertDefine[dataType].target);
                $("#single-target-condition-dropdown").clySelectSetItems(alertDefine[dataType].condition);
                switch (dataType) {
                case 'metric':
                case 'crash':
                case 'rating':
                case 'dataPoint':
                    metricClickListner();
                    break;
                case 'event':
                    break;
                }
                self.checkDisabled();
                $("#alert-compare-value-input").attr("placeholder", jQuery.i18n.map["alert.add-number"]);
                var apps = [];
                for (var appId in countlyGlobal.apps) {
                    apps.push({ value: appId, name: countlyGlobal.apps[appId].name });
                }
                if ($(($('#alert-data-types').find(".selected")[0])).data("dataType") === "dataPoint") {
                    apps.unshift({value: "all-apps", name: "All apps"});
                }
                // $("#multi-app-dropdown").clyMultiSelectSetItems(apps);
                $("#single-app-dropdown").clySelectSetItems(apps);
                app.localize();
            });
            // init content
            $(".alert-condition-block").html('');
            $("#single-app-dropdown").off("cly-select-change").on("cly-select-change", function(e, selected) {
                var dataType = $(($('#alert-data-types').find(".selected")[0])).data("dataType");
                var dataSubType = $("#single-target-dropdown").clySelectGetSelection();

                if (selected && dataType === 'event') {
                    alertsPlugin.getEventsForApps(selected, function(eventData) {
                        $("#single-target-dropdown").clySelectSetItems(eventData);
                        $("#single-target-dropdown").clySelectSetSelection("", "Select event");
                        $("#single-target-dropdown").off("cly-select-change").on("cly-select-change", function() {
                            self.checkDisabled();
                            $("#single-target-condition-dropdown").off("cly-select-change").on("cly-select-change", function() {
                                self.checkDisabled();
                            });
                            $("#alert-compare-value-input").off("input").on("input", function() {
                                self.checkDisabled();
                            });
                        });
                    });
                }

                if (selected && (dataSubType === 'Number of page views' || dataSubType === 'Bounce rate')) {
                    self.loadAppViewData();
                }
                self.checkDisabled();
            });


            // clear app  selected value
            // $("#multi-app-dropdown").clyMultiSelectClearSelection();
            $("#single-app-dropdown").clySelectSetSelection({});


            //alert by
            $("#email-alert-input").val("");

            $("#alert-widget-drawer").find(".section.settings").hide();

            // $("#alert-widget-drawer").trigger("cly-widget-section-complete");



            $("#create-widget").off().on("click", function() {
                var alertConfig = self.getWidgetSettings(true);
                for (var key in alertConfig) {
                    if (!alertConfig[key]) {
                        return;
                    }
                }
                self.drawer.close();

                alertsPlugin.saveAlert(alertConfig, function callback() {
                    alertsPlugin.requestAlertsList(function() {
                        app.alertsView.renderTable();
                    });
                });
            });

            $("#save-widget").off("click").on("click", function() {
                var alertConfig = self.getWidgetSettings();
                for (var key in alertConfig) {
                    if (!alertConfig[key]) {
                        return;
                    }
                }
                self.drawer.close();
                alertsPlugin.saveAlert(alertConfig, function callback() {
                    alertsPlugin.requestAlertsList(function() {
                        app.alertsView.renderTable();
                    });
                });
            });

            var REGEX_EMAIL = '([a-z0-9!#$%&\'*+/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&\'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)';
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
                self.checkDisabled();
            });
        },

        loadData: function(data) {
            var self = this;
            $(($('#alert-data-types').find("[data-data-type='" + data.alertDataType + "']"))).trigger("click");
            $("#current_alert_id").text(data._id);
            $("#alert-name-input").val(data.alertName);
            if (self.emailInput && self.emailInput.length > 0) {
                for (var i = 0; i < data.alertValues.length; i++) {
                    (self.emailInput[0]).selectize.addOption({ "name": '', "email": data.alertValues[i] });
                }
                (self.emailInput[0]).selectize.setValue(data.alertValues, false);
            }

            switch (data.alertDataType) {
            case 'metric':
            case 'crash':
            case 'rating':
            case 'dataPoint':
                var appSelected = [];
                for (var index in data.selectedApps) {
                    var appId = data.selectedApps[index];
                    countlyGlobal.apps[appId] && appSelected.push({ value: appId, name: countlyGlobal.apps[appId].name });
                    countlyGlobal.apps[appId] && $("#single-app-dropdown").clySelectSetSelection(appId, countlyGlobal.apps[appId].name);
                    if (appId === "all-apps") {
                        $("#single-app-dropdown").clySelectSetSelection("all-apps", "All apps");
                    }
                }
                var target = _.find(alertDefine[data.alertDataType].target, function(m) {
                    return m.value === data.alertDataSubType;
                });
                if (target) {
                    $("#single-target-dropdown").clySelectSetSelection(target.value, target.name);
                }
                if (data.alertDataSubType2 && (data.alertDataSubType === 'Number of page views' || data.alertDataSubType === 'Bounce rate')) {
                    this.loadAppViewData(data.alertDataSubType2);
                }
                if (data.alertDataSubType2 && (data.alertDataSubType === 'Number of ratings')) {
                    this.loadRatingOptions(data.alertDataSubType2);
                }
                break;
            case 'event':
                $("#single-target-dropdown").off("cly-select-change").on("cly-select-change", function() {
                    $("#single-target-dropdown").off("cly-select-change");
                    $("#single-target-dropdown").clySelectSetSelection(data.alertDataSubType, data.alertDataSubType);
                });
                var targetEvent = _.find(alertDefine[data.alertDataType].target, function(m) {
                    return m.value === data.alertDataSubType;
                });
                if (targetEvent) {
                    $("#single-target-dropdown").clySelectSetSelection(targetEvent.value, targetEvent.name);
                }
                for (index in data.selectedApps) {
                    appId = data.selectedApps[index];
                    countlyGlobal.apps[appId] && $("#single-app-dropdown").clySelectSetSelection(appId, countlyGlobal.apps[appId].name);
                }
                break;
            }
            var condition = _.find(alertDefine[data.alertDataType].condition, function(m) {
                return m.value === data.compareType;
            });
            if (condition) {
                $("#single-target-condition-dropdown").clySelectSetSelection(condition.value, condition.name);
            }
            $('#alert-compare-value-input').val(data.compareValue);
            for (var key in dict[data.alertDataSubType]) {
                if (typeof dict[data.alertDataSubType][key] === 'string') {
                    $("#" + dict[data.alertDataSubType][key]).val(data[key]);
                }
            }

            $("#save-widget").removeClass("disabled");
        },

        getWidgetSettings: function(enabled) {
            var dataType = $(($('#alert-data-types').find(".selected")[0])).data("dataType");
            var settings = {
                alertName: $("#alert-name-input").val(),
                alertDataType: dataType,
                alertDataSubType: $("#single-target-dropdown").clySelectGetSelection(),
                compareType: $('#single-target-condition-dropdown').clySelectGetSelection(),
                compareValue: $('#alert-compare-value-input').val(),
                period: 'every 1 hour on the 59th min', // 'every 10 seconds',    //'at 23:59 everyday',
                alertBy: 'email',
            };
            if (enabled) {
                settings.enabled = true;
            }
            if ($("#single-target2-dropdown").clySelectGetSelection()) {
                settings.alertDataSubType2 = $("#single-target2-dropdown").clySelectGetSelection();
            }
            switch (dataType) {
            case 'metric':
            case 'crash':
                if (settings.alertDataSubType === 'New crash occurence') {
                    delete settings.compareType;
                    delete settings.compareValue;
                }
                break;

            case 'event':
                break;
            }
            var selectedSingleAPP = $("#single-app-dropdown").clySelectGetSelection();
            settings.selectedApps = selectedSingleAPP ? [selectedSingleAPP] : null;

            settings.compareDescribe = settings.alertDataSubType + (settings.alertDataSubType2 ? ' (' + document.querySelector('div[data-value="' + settings.alertDataSubType2 + '"]').textContent + ')' : '') +
                ' ' + settings.compareType +
                ' ' + settings.compareValue + "%";

            if (dataType === 'dataPoint' && (settings.alertDataSubType === 'Monthly data points' || settings.alertDataSubType === 'Hourly data points')) {
                settings.compareDescribe = settings.compareDescribe.substring(0, settings.compareDescribe.length - 1);
            }
            var dictObject = dict[settings.alertDataType] && dict[settings.alertDataType][settings.alertDataSubType];
            if (dictObject) {
                for (var key in dictObject) {
                    settings[key] = typeof dictObject[key] === 'string' ?
                        $("#" + dictObject[key]).val() : dictObject[key](settings);
                }
            }

            // var emailList = [countlyGlobal.member._id];
            var emailList = [];
            $("#email-list-input  :selected").each(function() {
                emailList.push($(this).val());
            });
            settings.alertValues = emailList && emailList.length > 0 ? emailList : null;
            var currentId = $("#current_alert_id").text();
            currentId && (settings._id = currentId);
            return settings;
        },
        checkDisabled: function() {
            var alertConfig = this.getWidgetSettings();
            if (!alertConfig.selectedApps) {
                $("#single-target-dropdown").addClass("disabled");
                $("#single-target2-dropdown").addClass("disabled");
                $("#single-target-condition-dropdown").addClass("disabled");
                $("#alert-compare-value").addClass("disabled");
                $("#alert-compare-value-input").attr("disabled", "true");
            }
            else {
                $("#single-target-dropdown").removeClass("disabled");
                $("#single-target2-dropdown").removeClass("disabled");
                $("#single-target-condition-dropdown").removeClass("disabled");
                $("#alert-compare-value").removeClass("disabled");
                $("#alert-compare-value-input").removeAttr("disabled");
            }

            $("#create-widget").removeClass("disabled");
            $("#save-widget").removeClass("disabled");
            for (var key in alertConfig) {
                if (!alertConfig[key]) {
                    $("#create-widget").addClass("disabled");
                    $("#save-widget").addClass("disabled");
                }
            }
        }
    }
});

app.alertsView = new window.AlertsView();


if (countlyAuth.validateRead(app.alertsView.featureName)) {
    app.route('/manage/alerts', 'alerts', function() {
        this.renderWhenReady(this.alertsView);
    });
}


$(document).ready(function() {
    if (countlyAuth.validateRead(app.alertsView.featureName)) {
        app.addSubMenu("management", {code: "alerts", url: "#/manage/alerts", text: "alert.plugin-title", priority: 40});
    }
});