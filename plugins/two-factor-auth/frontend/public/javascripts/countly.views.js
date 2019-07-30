/* global app, Handlebars, countlyGlobal, countlyCommon, CountlyHelpers, $ */

$(document).ready(function() {
    // if configuration view exists
    if (app.configurationsView) {
        // registerLabel for two-factor-auth and two-factor-auth-global_enable
        // http://resources.count.ly/docs/shared-configurations#section-customizing-web-ui-labels
        app.configurationsView.registerLabel("two-factor-auth", "two-factor-auth.two-factor-authentication");
        app.configurationsView.registerLabel("two-factor-auth-globally_enabled", "two-factor-auth.globally_enabled");
    }
});

app.addPageScript("/manage/users", function() {
    setTimeout(function() {
        $("#user-table tr").on("click", function(event) {
            setTimeout(function() {
                var $userRow = $(event.target).closest("tr"),
                    userId = $userRow.attr("id"),
                    $userDetails = $(event.target).closest("tr").next();

                if ($userDetails.attr("id") === undefined && countlyGlobal.member.global_admin) {
                    $.ajax({
                        type: "GET",
                        url: countlyGlobal.path + "/i/two-factor-auth",
                        data: {
                            method: "admin_check",
                            uid: userId
                        },
                        success: function(data) {
                            var has2FA = JSON.parse(data.result);

                            if (has2FA) {
                                $userDetails.find(".button-container a.delete-user").after('<a class="icon-button red disable-2fa-user" data-localize="two-factor-auth.disable_2fa"></a>');
                                app.localize();
                                $userDetails.find(".button-container a.disable-2fa-user").off("click").on("click", function() {
                                    CountlyHelpers.confirm(
                                        $.i18n.prop("two-factor-auth.confirm_disable_admin", $userDetails.find("input.username-text").val()),
                                        "popStyleGreen",
                                        function(result) {
                                            if (!result) {
                                                return;
                                            }

                                            $.ajax({
                                                type: "GET",
                                                url: countlyGlobal.path + "/i/two-factor-auth",
                                                data: {
                                                    method: "admin_disable",
                                                    uid: userId
                                                },
                                                success: function() {
                                                    CountlyHelpers.notify({
                                                        title: $.i18n.map["two-factor-auth.disable_title"],
                                                        message: $.i18n.map["two-factor-auth.disable_user_message"],
                                                        type: "ok"
                                                    });

                                                    $userDetails.find(".button-container a.disable-2fa-user").remove();
                                                },
                                                error: function(xhr) {
                                                    var errMessage = "";

                                                    try {
                                                        var response = JSON.parse(xhr.responseText);
                                                        errMessage = response.result || xhr.statusText;
                                                    }
                                                    catch (err) {
                                                        errMessage = xhr.statusText;
                                                    }

                                                    CountlyHelpers.notify({
                                                        title: $.i18n.map["two-factor-auth.faildisable_title"],
                                                        message: $.i18n.prop("two-factor-auth.faildisable_message", errMessage),
                                                        type: "error"
                                                    });
                                                }
                                            });
                                        },
                                        [$.i18n.map["common.cancel"], $.i18n.map["common.continue"]],
                                        {
                                            title: $.i18n.map["two-factor-auth.confirm_disable_title"],
                                            image: "delete-user"
                                        }
                                    );
                                });
                            }
                        }
                    });
                }
            }, 250);
        });
    }, 250);
});

app.addPageScript("/manage/user-settings", function() {
    var member = countlyGlobal.member,
        templateData = {
            "secret_token": countlyGlobal["2fa_secret_token"],
            "qrcode_html": countlyCommon.decodeHtml(countlyGlobal["2fa_qrcode_html"])
        };

    $('.account-settings').find('.d-table').first().append(
        '<tr><td><div class="title" data-localize="two-factor-auth.two-factor-authentication"></div><span id="global-2fa-notice" class="config-help" data-localize="two-factor-auth.disable_global_first"></span></td>' +
            '<td id="setup-2fa-cell"><div class="on-off-switch" id="setup-2fa-switch">' +
            '<input type="checkbox" name="on-off-switch" class="on-off-switch-checkbox">' +
            '<label class="on-off-switch-label"></label>' +
            '<span class="text" data-localize="common.enable"></span></div>' +
            '<div id="resetup-2fa-link" data-localize="two-factor-auth.resetup_2fa"></div></td></tr>');
    app.localize();

    var _setupButton = function(disabled) {
        if (disabled || countlyGlobal["2fa_globally_enabled"]) {
            var setupButton = "";

            if (disabled) {
                $("#resetup-2fa-link").hide();
                $("#global-2fa-notice").hide();
                $("#setup-2fa-switch").show();
                $("#setup-2fa-switch input").removeAttr("checked");
                setupButton = "#setup-2fa-switch label";
            }
            else {
                $("#resetup-2fa-link").show();
                $("#global-2fa-notice").show();
                $("#setup-2fa-switch").hide();
                $("#setup-2fa-switch input").attr("checked", "");
                setupButton = "#resetup-2fa-link";
            }

            $.get(countlyGlobal.path + '/two-factor-auth/templates/setup2fa_modal.html', function(src) {
                var setup2FATemplate = Handlebars.compile(src);
                $(setupButton).off("click").on("click", function() {
                    CountlyHelpers.popup(setup2FATemplate(templateData), "setup-2fa-dialog", true);
                    app.localize();

                    $(".setup-2fa-dialog .cancel-2fa-button").off("click").on("click", function() {
                        CountlyHelpers.removeDialog($(".setup-2fa-dialog"));
                    });

                    $(".setup-2fa-dialog .confirm-2fa-button").off("click").on("click", function() {
                        $.ajax({
                            type: "GET",
                            url: countlyGlobal.path + "/i/two-factor-auth",
                            data: {
                                method: "enable",
                                secret_token: countlyGlobal["2fa_secret_token"],
                                auth_code: $(".setup-2fa-dialog input[name=\"2fa_code\"]").val()
                            },
                            success: function() {
                                CountlyHelpers.notify({
                                    title: $.i18n.map["two-factor-auth.setup_title"],
                                    message: $.i18n.map["two-factor-auth.setup_message"],
                                    type: "ok"
                                });

                                _setupButton(false);
                            },
                            error: function(xhr) {
                                var errMessage = "";

                                try {
                                    var response = JSON.parse(xhr.responseText);
                                    errMessage = response.result || xhr.statusText;
                                }
                                catch (err) {
                                    errMessage = xhr.statusText;
                                }

                                CountlyHelpers.notify({
                                    title: $.i18n.map["two-factor-auth.failsetup_title"],
                                    message: $.i18n.prop("two-factor-auth.failsetup_message", errMessage),
                                    type: "error"
                                });
                            }
                        });
                        CountlyHelpers.removeDialog($(".setup-2fa-dialog"));
                    });
                });
            });
        }
        else {
            $("#resetup-2fa-link").hide();
            $("#global-2fa-notice").hide();
            $("#setup-2fa-switch").show();
            $("#setup-2fa-switch input").attr("checked", "");

            $("#setup-2fa-switch label").off("click").on("click", function() {
                CountlyHelpers.confirm(
                    $.i18n.map["two-factor-auth.confirm_disable"],
                    "popStyleGreen",
                    function(result) {
                        if (!result) {
                            return;
                        }
                        $.ajax({
                            type: "GET",
                            url: countlyGlobal.path + "/i/two-factor-auth",
                            data: {method: "disable"},
                            success: function() {
                                CountlyHelpers.notify({
                                    title: $.i18n.map["two-factor-auth.disable_title"],
                                    message: $.i18n.map["two-factor-auth.disable_message"],
                                    type: "ok"
                                });
                                _setupButton(true);
                            },
                            error: function(xhr) {
                                var errMessage = "";

                                try {
                                    var response = JSON.parse(xhr.responseText);
                                    errMessage = response.result || xhr.statusText;
                                }
                                catch (err) {
                                    errMessage = xhr.statusText;
                                }

                                CountlyHelpers.notify({
                                    title: $.i18n.map["two-factor-auth.faildisable_title"],
                                    message: $.i18n.prop("two-factor-auth.faildisable_message", errMessage),
                                    type: "error"
                                });
                            }
                        });
                    },
                    [$.i18n.map["common.cancel"], $.i18n.map["common.continue"]],
                    {
                        title: $.i18n.map["two-factor-auth.confirm_disable_title"],
                        image: "delete-user"
                    }
                );
            });
        }
    };

    _setupButton(!(member && member.two_factor_auth && member.two_factor_auth.enabled));
});