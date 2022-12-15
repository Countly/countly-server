/* global app, countlyVue, CV, countlyGlobal, CountlyHelpers, $ */

// if configuration view exists
if (app.configurationsView) {
    // registerLabel for two-factor-auth and two-factor-auth-global_enable
    // http://resources.count.ly/docs/shared-configurations#section-customizing-web-ui-labels
    app.configurationsView.registerLabel("two-factor-auth", "two-factor-auth.two-factor-authentication");
    app.configurationsView.registerLabel("two-factor-auth-globally_enabled", "two-factor-auth.globally_enabled");
}

var TwoFAUser = countlyVue.views.create({
    template: countlyVue.T("/two-factor-auth/templates/setup2fa_modal.html"),
    data: function() {
        if (!countlyGlobal.member.two_factor_auth) {
            countlyGlobal.member.two_factor_auth = {};
        }
        if (typeof countlyGlobal.member.two_factor_auth.enabled === "undefined") {
            countlyGlobal.member.two_factor_auth.enabled = false;
        }
        return {
            TFAsettings: countlyGlobal.member.two_factor_auth,
            dataModal: {showDialog: false},
            qrcode_html: $('<div>').html(countlyGlobal["2fa_qrcode_html"]).text(),
            secret_token: countlyGlobal["2fa_secret_token"],
            secret_code: ""
        };
    },
    methods: {
        onChange: function(value) {
            if (value) {
                this.dataModal.showDialog = true;
            }
            else {
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
                            data: {
                                method: "disable"
                            },
                            success: function() {
                                CountlyHelpers.notify({
                                    title: $.i18n.map["two-factor-auth.disable_title"],
                                    message: $.i18n.map["two-factor-auth.disable_message"],
                                    type: "ok"
                                });
                                countlyGlobal.member.two_factor_auth.enabled = false;
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
            }
        },
        closeDataModal: function() {
            this.dataModal.showDialog = false;
        },
        confirmDialog: function() {
            var self = this;
            $.ajax({
                type: "GET",
                url: countlyGlobal.path + "/i/two-factor-auth",
                data: {
                    method: "enable",
                    secret_token: countlyGlobal["2fa_secret_token"],
                    auth_code: self.secret_code
                },
                success: function() {
                    CountlyHelpers.notify({
                        title: $.i18n.map["two-factor-auth.setup_title"],
                        message: $.i18n.map["two-factor-auth.setup_message"],
                        type: "ok"
                    });

                    self.dataModal.showDialog = false;
                    countlyGlobal.member.two_factor_auth.enabled = true;
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
                    self.dataModal.showDialog = false;
                }
            });
        }
    }
});

countlyVue.container.registerData("/account/settings", {
    _id: "2fa",
    title: CV.i18n('two-factor-auth.plugin-title'),
    component: TwoFAUser
});

/*app.addPageScript("/manage/users", function() {
    $("#content").on("click", "#user-table tr", function(event) {
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
    });
});*/

