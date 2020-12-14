/*global countlyGlobal, $, app, Handlebars, countlyManagementView, CountlyHelpers, jQuery, countlyCommon*/

app.addAppManagementView(
    "consolidate",
    jQuery.i18n.map["consolidate.plugin-title"],
    countlyManagementView.extend({
        initialize: function() {
            this.plugin = "consolidate";
            this.template = Handlebars.compile(
                "<div class=\"mgmt-plugins-row\" data-help-localize=\"configs.help.consolidate-app\">" +
                    "<div>" +
                        "<label for=\"bundle\" data-localize=\"consolidate.app\"/>" +
                        "<span data-localize=\"configs.help.consolidate-app\"/>" +
                    "</div>" +
                    "<div class='selectize-right-drop'>" +
                        "<br/>" +
                        "<input type=\"text\" name=\"consolidated-apps\" value=\"\"/>" +
                    "</div>" +
                "</div>"
            );
            this.resetTemplateData();
        },
        afterRender: function() {
            var self = this;
            this.el.find("input").selectize({
                onInitialize: function() {
                    var ref = this;
                    this.$control.on("click", function() {
                        var selected = $(this).parents(".selectize-right-drop").hasClass("selected");
                        if (!selected) {
                            $(this).parents(".selectize-right-drop").addClass("selected");
                            ref.open();
                        }
                        else {
                            $(this).parents(".selectize-right-drop").removeClass("selected");
                            ref.close();
                        }
                    });
                },
                placeholder: jQuery.i18n.map['configs.help.consolidate-select-apps'],
                plugins: ["remove_button"],
                persist: false,
                maxItems: null,
                valueField: "value",
                labelField: "key",
                searchField: ["key"],
                delimiter: ',',
                options: (this.templateData.apps || []).map(function(app) {
                    return { key: app.name, value: app._id };
                }),
                items: (this.templateData.apps || []).map(function(app) {
                    if (app.plugins && app.plugins.consolidate && app.plugins.consolidate.length > 0 && app.plugins.consolidate.includes(self.appId)) {
                        return app._id;
                    }
                }),
                render: {
                    item: function(item) {
                        return "<div>" + item.key + "</div>";
                    },
                    option: function(item) {
                        return "<div><span class=\"label\">" + item.key + "</span></div>";
                    }
                },
                onChange: function(value) {
                    self.doOnChange("selectedApps", value && value.split(",") || []);
                    this.$control_input.css("width", "40px");
                }
            });
        },
        resetTemplateData: function() {
            var apps = [];
            for (var key in countlyGlobal.apps) {
                if (key !== this.appId) {
                    apps.push(countlyGlobal.apps[key]);
                }
            }
            this.templateData = {
                apps: apps
            };
        },
        prepare: function() {
            return $.when({
                "consolidate": {
                    selectedApps: this.templateData.selectedApps,
                    initialApps: this.templateData.apps.map(function(app) {
                        return app._id;
                    })
                }
            });
        },
        save: function(ev) {
            ev.preventDefault();

            if (this.el.find('.icon-button').hasClass('disabled') || !this.isSaveAvailable()) {
                return;
            }

            var error = this.validate(), self = this;
            if (error) {
                return this.showError(error === true ? jQuery.i18n.map['management-applications.plugins.save.nothing'] : error);
            }

            this.el.find('.icon-button').addClass('disabled');

            this.prepare().then(function(data) {
                var dialog, timeout = setTimeout(function() {
                    dialog = CountlyHelpers.loading(jQuery.i18n.map['management-applications.plugins.saving']);
                }, 300);

                $.ajax({
                    type: "POST",
                    url: countlyCommon.API_PARTS.apps.w + '/update/plugins',
                    data: {
                        app_id: self.appId,
                        args: JSON.stringify(data)
                    },
                    dataType: "json",
                    success: function(result) {
                        self.el.find('.icon-button').removeClass('disabled');
                        clearTimeout(timeout);
                        if (dialog) {
                            CountlyHelpers.removeDialog(dialog);
                        }
                        if (result.result === 'Nothing changed') {
                            CountlyHelpers.notify({type: 'warning', message: jQuery.i18n.map['management-applications.plugins.saved.nothing']});
                        }
                        else {
                            CountlyHelpers.notify({title: jQuery.i18n.map['management-applications.plugins.saved.title'], message: jQuery.i18n.map['management-applications.plugins.saved']});
                            for (var k in result.plugins) {
                                if (Array.isArray(result.plugins[k])) {
                                    result.plugins[k].forEach(function(app) {
                                        countlyGlobal.apps[app._id] = app;
                                    });
                                }
                            }
                            self.resetTemplateData();
                            self.savedTemplateData = JSON.stringify(self.templateData);
                            self.render();
                        }
                        self.doOnChange();
                    },
                    error: function(resp) {
                        try {
                            resp = JSON.parse(resp.responseText);
                        }
                        catch (ignored) {
                            //ignored excep
                        }

                        self.el.find('.icon-button').removeClass('disabled');
                        clearTimeout(timeout);
                        if (dialog) {
                            CountlyHelpers.removeDialog(dialog);
                        }
                        self.showError(resp.result || jQuery.i18n.map['management-applications.plugins.error.server']);
                    }
                });
            }, function(error1) {
                self.el.find('.icon-button').removeClass('disabled');
                self.showError(error1);
            });
        }
    })
);