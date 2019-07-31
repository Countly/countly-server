/*global countlyPopulator, countlyGlobal, store, countlyCommon, $, moment, app, countlyView, Handlebars, jQuery, PopulatorView, CountlyHelpers, production*/
window.PopulatorView = countlyView.extend({
    initialize: function() {
    },
    beforeRender: function() {
        if (!this.template) {
            var self = this;
            return $.when($.get(countlyGlobal.path + '/populator/templates/populate.html', function(src) {
                self.template = Handlebars.compile(src);
            })).then(function() {});
        }
    },
    renderCommon: function() {
        this.templateData = {
            "page-title": jQuery.i18n.map["populator.plugin-title"]
        };
        var now = new Date();
        var fromDate = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30);
        var toDate = now;
        var maxTime = 60;
        var maxTimeout;


        $(this.el).html(this.template(this.templateData));

        if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].locked) {
            $("#populator-locked").show();
            $("#populator > .content").hide();
        }
        else {
            $("#populator-locked").hide();
            $("#populator > .content").show();
        }

        $("#start-populate").on('click', function() {
            CountlyHelpers.confirm(jQuery.i18n.map['populator.warning2'], "popStyleGreen", function(result) {
                if (!result) {
                    return true;
                }

                CountlyHelpers.popup('#populator-modal', "populator_modal cly-loading");

                $('.stop-populate').off('click').on('click', function(e) {
                    e.preventDefault();
                    if (maxTimeout) {
                        clearTimeout(maxTimeout);
                        maxTimeout = null;
                    }
                    countlyPopulator.stopGenerating();
                    $('.close-dialog').trigger('click');
                    $("#start-populate").show();
                    $(".populate-bar div").stop(true);
                    $(".populate-bar div").width(0);
                    CountlyHelpers.confirm(jQuery.i18n.map["populator.success"], "popStyleGreen", function(dialogResult) {
                        if (!dialogResult) {
                            return true;
                        }
                        window.location = countlyGlobal.path + "/dashboard";
                    }, [], {
                        image: 'populate-data',
                        title: jQuery.i18n.map['populator.finished-confirm-title']
                    });
                });

                maxTime = parseInt($("#populate-maxtime").val()) || maxTime;
                maxTimeout = setTimeout(function() {
                    countlyPopulator.stopGenerating(function(done) {
                        $('.close-dialog').trigger('click');
                        if (done === true) {
                            $("#start-populate").show();
                            CountlyHelpers.confirm(jQuery.i18n.map["populator.success"], "popStyleGreen", function(stopGenerationDialogResult) {
                                if (!stopGenerationDialogResult) {
                                    return true;
                                }
                                window.location = countlyGlobal.path + "/dashboard";
                            }, [], {
                                image: 'populate-data',
                                title: jQuery.i18n.map['populator.finished-confirm-title']
                            });
                            $(".populate-bar div").css({width: 0});
                        }
                        else if (done === false) {
                            // do nothing for now
                        }
                        else {
                            CountlyHelpers.alert(done, "red");
                            $("#start-populate").show();
                            $(".populate-bar div").css({width: 0});
                        }
                    });
                }, maxTime * 1000);

                fromDate = $("#populate-from").datepicker("getDate") || fromDate;
                toDate = $("#populate-to").datepicker("getDate") || toDate;
                countlyPopulator.setStartTime(fromDate.getTime() / 1000);
                countlyPopulator.setEndTime(toDate.getTime() / 1000);
                countlyPopulator.generateUsers(250);
                $("#start-populate").hide();
                $(".populate-bar div").animate({width: "100%"}, maxTime * 1000);
            }, [
                jQuery.i18n.map["populator.no-populate-data"],
                jQuery.i18n.map["populator.yes-populate-data"],
            ], {
                image: 'populate-data',
                title: jQuery.i18n.prop('populator.warning1', CountlyHelpers.appIdsToNames([countlyCommon.ACTIVE_APP_ID]))
            });
        });


        $("#populate-explain").on('click', function() {
            CountlyHelpers.alert(jQuery.i18n.map["populator.help"], "green");
        });

        if (countlyPopulator.isGenerating()) {
            $("#start-populate").hide();
            $("#stop-populate").show();
            countlyPopulator.generateUI();
            $("#populate-from").val(moment(countlyPopulator.getStartTime() * 1000).format("YYYY-MM-DD"));
            $("#populate-to").val(moment(countlyPopulator.getEndTime() * 1000).format("YYYY-MM-DD"));
            $("#populate-from").datepicker({dateFormat: "yy-mm-dd", defaultDate: new Date(countlyPopulator.getStartTime() * 1000), constrainInput: true, maxDate: now });
            $("#populate-to").datepicker({dateFormat: "yy-mm-dd", defaultDate: new Date(countlyPopulator.getEndTime() * 1000), constrainInput: true, maxDate: now });
        }
        else {
            $("#populate-from").val(moment(fromDate).format("YYYY-MM-DD"));
            $("#populate-to").val(moment(toDate).format("YYYY-MM-DD"));
            $("#populate-from").datepicker({dateFormat: "yy-mm-dd", defaultDate: -30, constrainInput: true, maxDate: now });
            $("#populate-to").datepicker({dateFormat: "yy-mm-dd", constrainInput: true, maxDate: now });
        }
        app.localize();
        if (this.state === "/autostart") {
            $("#start-populate").click();
        }
    },
    refresh: function() {}
});

//register views
app.populatorView = new PopulatorView();

app.route('/manage/populate*state', 'populate', function(state) {
    if (countlyGlobal.member.global_admin || countlyGlobal.admin_apps[countlyCommon.ACTIVE_APP_ID]) {
        this.populatorView.state = state;
        this.renderWhenReady(this.populatorView);
    }
    else {
        app.navigate("/", true);
    }
});

var start_populating = false;
app.addPageScript("/manage/apps", function() {
    var populateApp = '<tr class="populate-demo-data">' +
        '<td>' +
            '<span data-localize="populator.demo-data"></span>' +
        '</td>' +
        '<td>' +
            '<label><input type="checkbox" id="populate-app-after"/>&nbsp;&nbsp;&nbsp;<span data-localize="populator.tooltip"></span></label>' +
        '</td>' +
    '</tr>';

    var populateFirstApp = '<div class="add-app-input-wrapper">' +
        '<label class="populate-checkbox-container">' +
        '<input id="populate-first-app-after" type="checkbox">' +
        '<span class="checkmark"></span>' + $.i18n.map['populator.tooltip'] +
        '</label>' +
        '<div class="clear:both"></div><br>' +
        '</div>';

    $("#add-new-app table .table-add").before(populateApp);
    $('#save-first-app-add').before(populateFirstApp);

    var saveBtn = store.get('first_app') ? '#save-first-app-add' : '#save-app-add';
    $(saveBtn).click(function() {
        var isFirstApp = store.get('first_app'),
            isFirstAppPopulateChecked = $("#add-first-app #populate-first-app-after").is(':checked'),
            isNewAppPopulateChecked = $("#add-new-app table #populate-app-after").is(':checked');

        if ((isFirstApp && isFirstAppPopulateChecked) || (!isFirstApp && isNewAppPopulateChecked)) {
            start_populating = true;
            setTimeout(function() {
                start_populating = false;
            }, 5000);
        }
    });
});

app.addAppManagementSwitchCallback(function() {
    if (start_populating) {
        start_populating = false;
        setTimeout(function() {
            var appId = $("#view-app-id").text();
            app.switchApp(appId, function() {
                app.navigate("/manage/populate/autostart", true);
            });
        }, 1000);
    }
});

$(document).ready(function() {
    if (!production) {
        CountlyHelpers.loadJS("populator/javascripts/chance.js");
    }
    var style = "display:none;";
    if (countlyGlobal.member.global_admin || countlyGlobal.admin_apps[countlyCommon.ACTIVE_APP_ID]) {
        style = "";
    }
    app.addSubMenu("management", {code: "populate", url: "#/manage/populate", text: "populator.title", priority: 70, classes: "populator-menu", style: style});

    //listen for UI app change
    app.addAppSwitchCallback(function(appId) {
        if (countlyGlobal.member.global_admin || countlyGlobal.admin_apps[appId]) {
            $(".populator-menu").show();
        }
        else {
            $(".populator-menu").hide();
        }
    });
});