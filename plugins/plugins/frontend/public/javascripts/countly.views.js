/*global countlyView, countlyAuth, _,$,store,countlyPlugins,Handlebars,jQuery,countlyGlobal,app,countlyCommon,CountlyHelpers,countlyManagementView,ConfigurationsView,PluginsView,T */
window.PluginsView = countlyView.extend({
    featureName: 'global_plugins',
    initialize: function() {
        this.filter = (store.get("countly_pluginsfilter")) ? store.get("countly_pluginsfilter") : "plugins-all";
    },
    beforeRender: function() {
        var self = this;
        return $.when(T.render('/plugins/templates/plugins.html', function(src) {
            self.template = src;
        }), countlyPlugins.initialize()).then(function() { });
    },
    renderCommon: function(isRefresh) {

        var pluginsData = countlyPlugins.getData();
        this.templateData = {
            "page-title": jQuery.i18n.map["plugins.title"]
        };

        var self = this;

        if (!isRefresh) {

            $(this.el).html(this.template(this.templateData));
            $("#" + this.filter).addClass("selected").addClass("active");

            $.fn.dataTableExt.afnFiltering.push(function(oSettings, aData) {
                if (!$(oSettings.nTable).hasClass("plugins-filter")) {
                    return true;
                }

                if (self.filter === "plugins-enabled") {
                    return aData[1];
                }

                if (self.filter === "plugins-disabled") {
                    return !aData[1];
                }

                return true;
            });

            this.dtable = $('#plugins-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": pluginsData,
                "bPaginate": false,
                "aoColumns": [
                    {
                        "mData": function(row) {
                            if (row.enabled) {
                                return jQuery.i18n.map[row.code + ".plugin-title"] || jQuery.i18n.map[row.code + ".title"] || row.title;
                            }
                            else {
                                return row.title;
                            }
                        },
                        "sType": "string",
                        "sTitle": jQuery.i18n.map["plugins.name"]
                    },
                    {
                        "mData": function(row, type) {
                            if (type === "display") {
                                var disabled = (row.prepackaged || !countlyAuth.validateUpdate(self.featureName)) ? 'disabled' : '';
                                var input = '<div data-initial="' + row.enabled + '" class="on-off-switch ' + disabled + '">';

                                if (row.enabled) {
                                    input += '<input type="checkbox" class="on-off-switch-checkbox" id="plugin-' + row.code + '" checked ' + disabled + '>';
                                }
                                else {
                                    input += '<input type="checkbox" class="on-off-switch-checkbox" id="plugin-' + row.code + '" ' + disabled + '>';
                                }

                                input += '<label class="on-off-switch-label" for="plugin-' + row.code + '"></label>';
                                input += '<span class="text">' + jQuery.i18n.map["plugins.enable"] + '</span>';

                                return input;
                            }
                            else {
                                return row.enabled;
                            }
                        },
                        "sType": "string",
                        "sTitle": jQuery.i18n.map["plugins.state"],
                        "sClass": "shrink"
                    },
                    {
                        "mData": function(row) {
                            if (row.enabled) {
                                return jQuery.i18n.map[row.code + ".plugin-description"] || jQuery.i18n.map[row.code + ".description"] || row.description;
                            }
                            else {
                                return row.description;
                            }
                        },
                        "sType": "string",
                        "sTitle": jQuery.i18n.map["plugins.description"],
                        "bSortable": false,
                        "sClass": "light"
                    },
                    {
                        "mData": function(row) {
                            var dependentKeys = Object.keys(row.dependents).map(function(item) {
                                return countlyPlugins.getTitle(item);
                            });
                            return dependentKeys.join(", ");
                        },
                        "sType": "string",
                        "sTitle": jQuery.i18n.map["plugins.dependents"],
                        "sClass": "center",
                        "bSortable": false
                    },
                    {
                        "mData": function(row) {
                            return row.version;
                        },
                        "sType": "string",
                        "sTitle": jQuery.i18n.map["plugins.version"],
                        "sClass": "center",
                        "bSortable": false
                    },
                    {
                        "mData": function(row) {
                            if (row.homepage !== "") {
                                return '<a class="plugin-link" href="' + row.homepage + '" target="_blank"><i class="ion-android-open"></i></a>';
                            }
                            else {
                                return "";
                            }
                        },
                        "sType": "string",
                        "sTitle": jQuery.i18n.map["plugins.homepage"],
                        "sClass": "shrink center",
                        "bSortable": false
                    }
                ]
            }));
            this.dtable.stickyTableHeaders();
            this.dtable.fnSort([[0, 'asc']]);

            /*
             Make header sticky if scroll is more than the height of header
             This is done in order to make Apply Changes button visible
             */
            var navigationTop = $("#sticky-plugin-header").offset().top;
            var tableHeaderTop = $("#plugins-table").find("thead").offset().top;

            $(window).on("scroll", function() {
                var topBarHeight = $("#top-bar").outerHeight();
                var $fixedHeader = $("#sticky-plugin-header");

                if ($(this).scrollTop() > navigationTop - topBarHeight) {
                    var width = $("#content-container").width();
                    $fixedHeader.addClass("fixed");
                    $fixedHeader.css({ width: width });

                    if (topBarHeight) {
                        $fixedHeader.css({ top: topBarHeight });
                    }
                    else {
                        $fixedHeader.css({ top: 0 });
                    }
                }
                else {
                    $fixedHeader.removeClass("fixed");
                    $fixedHeader.css({ width: "" });
                }

                if (($(this).scrollTop() + $fixedHeader.outerHeight()) > tableHeaderTop) {
                    $(".sticky-header").removeClass("hide");
                }
                else {
                    $(".sticky-header").addClass("hide");
                }

            });

            $(window).on("resize", function() {
                var $fixedHeader = $("#sticky-plugin-header");

                if ($fixedHeader.hasClass("fixed")) {
                    var width = $("#content-container").width();
                    $fixedHeader.css({ width: width });
                }
            });
        }
    },
    refresh: function(Refreshme) {
        if (Refreshme) {
            var self = this;
            return $.when(this.beforeRender()).then(function() {
                if (app.activeView !== self) {
                    return false;
                }
                CountlyHelpers.refreshTable(self.dtable, countlyPlugins.getData());
                app.localize();
            });
        }
    },
    togglePlugin: function(plugins) {
        var self = this;
        var overlay = $("#overlay").clone();
        $("body").append(overlay);
        overlay.show();
        var loader = $(this.el).find("#loader");
        loader.show();
        var tryCount = 0;
        /**
         * check plugin update process
         */
        function checkProcess() {
            tryCount++;
            $.ajax({
                type: "GET",
                url: countlyCommon.API_URL + "/o/plugins-check?app_id=" + countlyCommon.ACTIVE_APP_ID,
                data: { t: tryCount },
                success: function(state) {
                    if (state.result === "completed") {
                        self.showPluginProcessMessage(jQuery.i18n.map["plugins.success"], jQuery.i18n.map["plugins.restart"], jQuery.i18n.map["plugins.finish"], 3000, false, 'green', true, true);
                    }
                    else if (state.result === "failed") {
                        self.showPluginProcessMessage(jQuery.i18n.map["plugins.errors"], jQuery.i18n.map["plugins.errors-msg"], '', 3000, false, 'warning', true, true);
                    }
                    else {
                        setTimeout(checkProcess, 5000);
                    }
                },
                error: function() {
                    setTimeout(checkProcess, 5000);
                }
            });
        }

        countlyPlugins.toggle(plugins, function(res) {
            if (res.result === "started") {
                self.showPluginProcessMessage(jQuery.i18n.map["plugins.processing"], jQuery.i18n.map["plugins.will-restart"], jQuery.i18n.map["plugins.please-wait"], 5000, true, 'warning', false, false);
                checkProcess();
            }
            else {
                self.showPluginProcessMessage(jQuery.i18n.map["plugins.error"], res, jQuery.i18n.map["plugins.retry"], 5000, false, 'error', true, true);
            }
        });
    },
    showPluginProcessMessage: function(title, message, info, delay, sticky, type, reload, hideLoader) {
        if (hideLoader) {
            $("#overlay").hide();
            $('#loader').hide();
        }
        CountlyHelpers.notify({clearAll: true, type: type, title: title, message: message, info: info, delay: delay, sticky: sticky});
        if (reload) {
            setTimeout(function() {
                window.location.reload(true);
            }, 3000);
        }
    },
    filterPlugins: function(filter) {
        this.filter = filter;
        store.set("countly_pluginsfilter", filter);
        $("#" + this.filter).addClass("selected").addClass("active");
        this.dtable.fnDraw();
    }
});

window.ConfigurationsView = countlyView.extend({
    featureName: 'global_configurations',
    userConfig: false,
    initialize: function() {
        this.predefinedInputs = {};
        this.predefinedLabels = {
        };
        this.configsData = {};
        this.cache = {};
        this.changes = {};

        //register some common system config inputs
        this.registerInput("apps.category", function() {
            return null;
            // var categories = app.manageAppsView.getAppCategories();
            // var select = '<div class="cly-select" id="apps.category">' +
            //     '<div class="select-inner">' +
            //     '<div class="text-container">';
            // if (!categories[value]) {
            //     select += '<div class="text"></div>';
            // }
            // else {
            //     select += '<div class="text">' + categories[value] + '</div>';
            // }
            // select += '</div>' +
            //     '<div class="right combo"></div>' +
            //     '</div>' +
            //     '<div class="select-items square">' +
            //     '<div>';

            // for (var i in categories) {
            //     select += '<div data-value="' + i + '" class="segmentation-option item">' + categories[i] + '</div>';
            // }

            // select += '</div>' +
            //     '</div>' +
            //     '</div>';
            // return select;
        });

        this.registerInput("apps.country", function(value) {
            var zones = app.manageAppsView.getTimeZones();
            var select = '<div class="cly-select ' + (countlyAuth.validateUpdate('global_plugins') ? '' : 'disabled') + '" id="apps.country">' +
                '<div class="select-inner">' +
                '<div class="text-container">';
            if (!zones[value]) {
                select += '<div class="text"></div>';
            }
            else {
                select += '<div class="text"><div class="flag ' + value.toLowerCase() + '" style="background-image:url(images/flags/' + value.toLowerCase() + '.png)"></div>' + zones[value].n + '</div>';
            }

            select += '</div>' +
                '<div class="right combo"></div>' +
                '</div>' +
                '<div class="select-items square">' +
                '<div>';

            for (var i in zones) {
                select += '<div data-value="' + i + '" class="segmentation-option item"><div class="flag ' + i.toLowerCase() + '" style="background-image:url(images/flags/' + i.toLowerCase() + '.png)"></div>' + zones[i].n + '</div>';
            }

            select += '</div>' +
                '</div>' +
                '</div>';
            return select;
        });

        this.registerInput("frontend.theme", function(value) {
            var themes = countlyPlugins.getThemeList();
            var select = '<div class="cly-select ' + (countlyAuth.validateUpdate('global_plugins') ? '' : 'disabled') + '" id="frontend.theme">' +
                '<div class="select-inner">' +
                '<div class="text-container">';
            if (value && value.length) {
                select += '<div class="text">' + value + '</div>';
            }
            else {
                select += '<div class="text" data-localize="configs.no-theme">' + jQuery.i18n.map["configs.no-theme"] + '</div>';
            }

            select += '</div>' +
                '<div class="right combo"></div>' +
                '</div>' +
                '<div class="select-items square">' +
                '<div>';

            for (var i = 0; i < themes.length; i++) {
                if (themes[i] === "") {
                    select += '<div data-value="" class="segmentation-option item" data-localize="configs.no-theme">' + jQuery.i18n.map["configs.no-theme"] + '</div>';
                }
                else {
                    select += '<div data-value="' + themes[i] + '" class="segmentation-option item">' + themes[i] + '</div>';
                }
            }

            select += '</div>' +
                '</div>' +
                '</div>';
            return select;
        });

        //register some common system config inputs
        this.registerInput("logs.default", function(value) {
            var categories = ['debug', 'info', 'warn', 'error'];
            var select = '<div class="cly-select ' + (countlyAuth.validateUpdate('global_plugins') ? '' : 'disabled') + '" id="logs.default">' +
                '<div class="select-inner">' +
                '<div class="text-container">';
            if (value && value.length) {
                select += '<div class="text" data-localize="configs.logs.' + value + '">' + jQuery.i18n.map["configs.logs." + value] + '</div>';
            }
            else {
                select += '<div class="text" data-localize="configs.logs.warn">' + jQuery.i18n.map["configs.logs.warn"] + '</div>';
            }
            select += '</div>' +
                '<div class="right combo"></div>' +
                '</div>' +
                '<div class="select-items square">' +
                '<div>';

            for (var i = 0; i < categories.length; i++) {
                select += '<div data-value="' + categories[i] + '" class="segmentation-option item" data-localize="configs.logs.' + categories[i] + '">' + jQuery.i18n.map["configs.logs." + categories[i]] + '</div>';
            }

            select += '</div>' +
                '</div>' +
                '</div>';
            return select;
        });

        this.registerInput("security.dashboard_additional_headers", function(value) {
            return '<textarea rows="5" ' + (countlyAuth.validateUpdate('global_plugins') ? '' : 'disabled') + ' style="width:100%" id="security.dashboard_additional_headers">' + (value || "") + '</textarea>';
        });

        this.registerInput("security.api_additional_headers", function(value) {
            return '<textarea rows="5" ' + (countlyAuth.validateUpdate('global_plugins') ? '' : 'disabled') + ' style="width:100%" id="security.api_additional_headers">' + (value || "") + '</textarea>';
        });

        this.registerInput("apps.timezone", function() {
            return null;
        });

        this.registerInput("push.proxypass", function(value) {
            return '<input type="password" ' + (countlyAuth.validateUpdate('global_plugins') ? '' : 'disabled') + ' id="push.proxypass" value="' + (value || '') + '"/>';
        });

        this.registerLabel("frontend.google_maps_api_key", "configs.frontend-google_maps_api_key");

        this.registerInput("api.reports_regenerate_interval", function(value) {
            //5 minutes | 30 minutes | 1 hour | 3 hours | 12 hours | 24 hours
            var values = {
                300: jQuery.i18n.prop("common.every.minutes", 5),
                1800: jQuery.i18n.prop("common.every.minutes", 30),
                3600: jQuery.i18n.prop("common.every.hour", 1),
                10800: jQuery.i18n.prop("common.every.hours", 3),
                43200: jQuery.i18n.prop("common.every.hours", 12),
                86400: jQuery.i18n.prop("common.every.hours", 24)
            };
            var select = '<div class="cly-select ' + (countlyAuth.validateUpdate('global_plugins') ? '' : 'disabled') + '" id="api.reports_regenerate_interval">' +
                '<div class="select-inner">' +
                '<div class="text-container">';
            if (!values[value]) {
                select += '<div class="text"></div>';
            }
            else {
                select += '<div class="text">' + values[value] + '</div>';
            }

            select += '</div>' +
                '<div class="right combo"></div>' +
                '</div>' +
                '<div class="select-items square">' +
                '<div>';

            for (var i in values) {
                select += '<div data-value="' + i + '" class="segmentation-option item">' + values[i] + '</div>';
            }

            select += '</div>' +
                '</div>' +
                '</div>';
            return select;

        });

        this.registerLabel("api.google_maps_api_key", "configs.frontend-google_maps_api_key");

        this.registerInput("api.send_test_email", function() {
            return '<div id="send_test_email" style="margin-left: 0px;" class="icon-button green ' + (countlyAuth.validateUpdate('global_plugins') ? '' : 'disabled') + '">Send</div>';
        });
    },
    beforeRender: function() {
        var self = this;
        if (this.userConfig) {
            return $.when(T.render('/plugins/templates/configurations.html', function(src) {
                self.template = src;
            }), countlyPlugins.initializeUserConfigs()).then(function() { });
        }
        else {
            return $.when(T.render('/plugins/templates/configurations.html', function(src) {
                self.template = src;
            }), countlyPlugins.initializeConfigs()).then(function() { });
        }
    },
    renderCommon: function(isRefresh) {
        if (this.reset) {
            $("#new-install-overlay").show();
        }
        if (this.userConfig) {
            this.configsData = countlyPlugins.getUserConfigsData();
        }
        else {
            this.configsData = countlyPlugins.getConfigsData();
        }

        this.searchKeys = this.getSearchKeys(this.configsData);
        this.navTitles = this.setNavTitles(this.configsData);
        this.selectedNav = this.navTitles.coreTitles[0];

        var configsHTML;
        var self = this;
        var title = jQuery.i18n.map["plugins.configs"];

        if (this.userConfig) {
            title = jQuery.i18n.map["plugins.user-configs"];
        }
        if (this.namespace && this.configsData[this.namespace]) {
            this.selectedNav = this.navTitles.coreTitles.find(function(x) {
                return x.key === self.namespace;
            }) || this.navTitles.pluginTitles.find(function(x) {
                return x.key === self.namespace;
            });
            configsHTML = this.generateConfigsTable(this.configsData);
        }
        else {
            if (this.selectedNav && !this.userConfig) {
                app.navigate("/manage/configurations/" + this.selectedNav.key);
            }
            configsHTML = this.generateConfigsTable(this.configsData);
        }

        this.templateData = {
            "page-title": title,
            "configs": configsHTML,
            "namespace": this.namespace,
            "user": this.userConfig,
            "reset": this.reset,
            "navTitles": this.navTitles,
            "selectedNav": this.selectedNav
        };

        /**
         * Set default member image for current member
         * @returns {void} void
         */
        function setDefaultAvatar() {
            var defaultAvatarSelectorSmall = countlyGlobal.member.created_at % 16 * 30;
            var defaultAvatarSelector = countlyGlobal.member.created_at % 16 * 60;
            var name = countlyGlobal.member.full_name.split(" ");
            $('.member_image').html("");
            $('.pp-circle').css({'background-image': 'url("images/avatar-sprite.png")', 'background-position': defaultAvatarSelector + 'px', 'background-size': 'auto'});
            $('.member_image').css({'background-image': 'url("images/avatar-sprite.png")', 'background-position': defaultAvatarSelectorSmall + 'px', 'background-size': '510px 30px', 'text-align': 'center'});
            $('.member_image').prepend('<span style="color: white;position: relative;top: 6px;font-size: 16px;">' + name[0][0] + name[name.length - 1][0] + '</span>');
            $('.pp-menu-list > div:nth-child(2)').css({'display': 'none'});
            $('.pp-circle').prepend('<span style="text-style:uppercase">' + name[0][0] + name[name.length - 1][0] + '</span>');
        }

        if (this.success) {
            CountlyHelpers.notify({
                title: jQuery.i18n.map["configs.changed"],
                message: jQuery.i18n.map["configs.saved"]
            });
            this.success = false;
            if (this.userConfig) {
                app.noHistory("#/manage/user-settings");
                self.configsData = JSON.parse(JSON.stringify(self.cache));
                $("#configs-apply-changes").hide();
                self.changes = {};
            }
            else {
                app.noHistory("#/manage/configurations/" + this.selectedNav.key);
            }
        }
        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));

            if (this.userConfig) {
                $('#configs-title-bar').hide();
                $('#config-title').html(jQuery.i18n.map['plugins.user-configs']);
                $('#config-table-container').addClass('user-settings-table');
            }
            else {
                $('#configs-table-widget').css('marginLeft', '200px');
                $('#nav-item-' + this.selectedNav.key).addClass('selected');
            }

            this.changes = {};
            this.cache = JSON.parse(JSON.stringify(this.configsData));

            $(".configs #username").val(countlyGlobal.member.username);
            $(".configs #api-key").val(countlyGlobal.member.api_key);

            if (countlyGlobal.member.member_image) {
                $('.pp-circle').css({'background-image': 'url(' + countlyGlobal.member.member_image + '?now=' + Date.now() + ')', 'background-size': '100%'});
            }
            else {
                setDefaultAvatar();
            }

            $("#configs-back").click(function() {
                app.back('/manage/configurations');
            });

            $('.on-off-switch input').on("change", function() {
                var isChecked = $(this).is(":checked"),
                    attrID = $(this).attr("id");

                self.updateConfig(attrID, isChecked);
            });

            //numeric input on arrow click
            $('.configs input[type="number"]').on("change", function() {
                var id = $(this).attr("id");
                var value = $(this).val();
                value = parseFloat(value);
                self.updateConfig(id, value);
            });

            $(".configs input").keyup(function() {
                var id = $(this).attr("id");
                var value = $(this).val();
                if ($(this).attr("type") === "number") {
                    value = parseFloat(value);
                }
                self.updateConfig(id, value);
            });

            $(".configs textarea").keyup(function() {
                var id = $(this).attr("id");
                var value = $(this).val();
                self.updateConfig(id, value);
            });

            $(".configs .segmentation-option").on("click", function() {
                var id = $(this).closest(".cly-select").attr("id");
                var value = $(this).data("value");
                self.updateConfig(id, value);
            });

            $('.configs .user-config-select').on('cly-multi-select-change', function() {
                var id = $(this).closest('.cly-multi-select').attr('id');
                var _user = self.configsData[id.split('.')[0]][id.split('.')[1]];

                var value = $(this).data("value");
                var newUserValues = {};
                for (var i in _user) {
                    newUserValues[i] = value.indexOf(i) >= 0;
                }

                self.updateConfig(id, newUserValues);
            });

            $(".configs #username").off("keyup").on("keyup", _.throttle(function() {
                if (!($(this).val().length) || $("#menu-username").text() === $(this).val()) {
                    $(".username-check").remove();
                    return false;
                }

                if ($(this).val() === countlyGlobal.member.username) {
                    $(".username-check").remove();
                    return false;
                }

                $(this).next(".required").remove();

                var existSpan = $("<span class='username-check red-text' data-localize='management-users.username.exists'>").html(jQuery.i18n.map["management-users.username.exists"]),
                    notExistSpan = $("<span class='username-check green-text'>").html("&#10004;"),
                    data = {};

                data.username = $(this).val();
                data._csrf = countlyGlobal.csrf_token;

                var eventContext = $(this);
                $.ajax({
                    type: "POST",
                    url: countlyGlobal.path + "/users/check/username",
                    data: data,
                    success: function(result) {
                        $(".username-check").remove();
                        if (result) {
                            eventContext.after(notExistSpan.clone());
                        }
                        else {
                            eventContext.after(existSpan.clone());
                        }
                    }
                });
            }, 300));

            $(".configs #new_pwd").off("keyup").on("keyup", _.throttle(function() {
                $(".password-check").remove();
                var error = CountlyHelpers.validatePassword($(this).val());
                if (error) {
                    var invalidSpan = $("<div class='password-check red-text'>").html(error);
                    $(this).after(invalidSpan.clone());
                    return false;
                }
            }, 300));

            $(".configs #re_new_pwd").off("keyup").on("keyup", _.throttle(function() {
                $(".password-check").remove();
                var error = CountlyHelpers.validatePassword($(this).val());
                if (error) {
                    var invalidSpan = $("<div class='password-check red-text'>").html(error);
                    $(this).after(invalidSpan.clone());
                    return false;
                }
            }, 300));

            $(".configs #usersettings_regenerate").click(function() {
                $(".configs #api-key").val(CountlyHelpers.generatePassword(32, true)).trigger("keyup");
            });

            $('.config-container:not(.title)').off('click').on('click', function() {
                var key = $(this).attr('id').replace('nav-item-', '');
                app.navigate("/manage/configurations/" + key);

                self.selectedNav = self.navTitles.coreTitles.find(function(x) {
                    return x.key === key;
                }) || self.navTitles.pluginTitles.find(function(x) {
                    return x.key === key;
                });
                self.templateData.selectedNav = self.selectedNav;

                $('.config-container').removeClass('selected');
                $('#nav-item-' + self.selectedNav.key).addClass('selected');

                $('.config-table-row').hide();
                $('.config-table-row-header').hide();
                $('#config-title').html(self.selectedNav.label);
                $('#config-table-row-' + self.selectedNav.key).show();
                $('#config-table-row-header-' + self.selectedNav.key).show();
                $('.config-table-details-row').show();

                $('#config-table-container').removeClass('title-rows-enable');
                $('#config-table-container').addClass('title-rows-hidden');
                $('#empty-search-result').hide();
                $('#search-box').val("");
            });

            $(".configs .account-settings .input input").keyup(function() {
                $("#configs-apply-changes").removeClass("settings-changes");
                $(".configs .account-settings .input input").each(function() {
                    var id = $(this).attr("id");
                    switch (id) {
                    case "username":
                        if (this.value !== $("#menu-username").text()) {
                            $("#configs-apply-changes").addClass("settings-changes");
                        }
                        break;
                    case "api-key":
                        if (this.value !== $("#user-api-key").val()) {
                            $("#configs-apply-changes").addClass("settings-changes");
                        }
                        break;
                    default:
                        if (this.value !== "") {
                            $("#configs-apply-changes").addClass("settings-changes");
                        }
                        break;
                    }
                    if ($("#configs-apply-changes").hasClass("settings-changes")) {
                        $("#configs-apply-changes").show();
                    }
                    else if (!$("#configs-apply-changes").hasClass("configs-changes")) {
                        $("#configs-apply-changes").hide();
                    }
                });
            });
            $("#configs-apply-changes").click(function() {
                if (self.userConfig) {
                    $(".username-check.green-text").remove();
                    if ($(".red-text").length) {
                        CountlyHelpers.notify({
                            title: jQuery.i18n.map["user-settings.please-correct-input"],
                            message: jQuery.i18n.map["configs.not-saved"],
                            type: "error"
                        });
                        return false;
                    }
                    var username = $(".configs #username").val(),
                        old_pwd = $(".user-configuration-modal #old_pwd").val(),
                        new_pwd = $(".user-configuration-modal #new_pwd").val(),
                        re_new_pwd = $(".user-configuration-modal #re_new_pwd").val(),
                        api_key = $(".configs #api-key").val(),
                        member_image = $('#member-image-path').val();

                    var ignoreError = false;

                    if ((new_pwd.length && re_new_pwd.length) || api_key.length || username.length) {
                        ignoreError = true;
                    }

                    if ((new_pwd.length || re_new_pwd.length) && !old_pwd.length) {
                        CountlyHelpers.notify({
                            title: jQuery.i18n.map["configs.not-saved"],
                            message: jQuery.i18n.map["user-settings.old-password-match"],
                            type: "error"
                        });
                        return true;
                    }

                    if (new_pwd !== re_new_pwd) {
                        CountlyHelpers.notify({
                            title: jQuery.i18n.map["configs.not-saved"],
                            message: jQuery.i18n.map["user-settings.password-match"],
                            type: "error"
                        });
                        return true;
                    }

                    if (new_pwd.length && new_pwd === old_pwd) {
                        CountlyHelpers.notify({
                            title: jQuery.i18n.map["configs.not-saved"],
                            message: jQuery.i18n.map["user-settings.password-not-old"],
                            type: "error"
                        });
                        return true;
                    }

                    if (api_key.length !== 32) {
                        CountlyHelpers.notify({
                            title: jQuery.i18n.map["configs.not-saved"],
                            message: jQuery.i18n.map["user-settings.api-key-length"],
                            type: "error"
                        });
                        return true;
                    }

                    var data = {
                        "username": username,
                        "old_pwd": old_pwd,
                        "new_pwd": new_pwd,
                        api_key: api_key,
                        _csrf: countlyGlobal.csrf_token
                    };

                    if (member_image !== "") {
                        data.member_image = member_image;
                    }

                    $.ajax({
                        type: "POST",
                        url: countlyGlobal.path + "/user/settings",
                        data: data,
                        success: function(result) {
                            if (result === "username-exists") {
                                CountlyHelpers.notify({
                                    title: jQuery.i18n.map["configs.not-saved"],
                                    message: jQuery.i18n.map["management-users.username.exists"],
                                    type: "error"
                                });
                                return true;
                            }
                            else if (!result) {
                                CountlyHelpers.notify({
                                    title: jQuery.i18n.map["configs.not-saved"],
                                    message: jQuery.i18n.map["user-settings.alert"],
                                    type: "error"
                                });
                                return true;
                            }
                            else {
                                if (!isNaN(parseInt(result))) {
                                    $("#new-install-overlay").fadeOut();
                                    countlyGlobal.member.password_changed = parseInt(result);
                                }
                                else if (typeof result === "string") {
                                    CountlyHelpers.notify({
                                        title: jQuery.i18n.map["configs.not-saved"],
                                        message: jQuery.i18n.map[result],
                                        type: "error"
                                    });
                                    return true;
                                }
                                $("#user-api-key").val(api_key);
                                $(".configs #old_pwd").val("");
                                $(".configs #new_pwd").val("");
                                $(".configs #re_new_pwd").val("");
                                $("#menu-username").text(username);
                                $("#user-api-key").val(api_key);
                                countlyGlobal.member.username = username;
                                countlyGlobal.member.api_key = api_key;
                            }
                            if (Object.keys(self.changes).length) {
                                countlyPlugins.updateUserConfigs(self.changes, function(err) {
                                    if (err && !ignoreError) {
                                        CountlyHelpers.notify({
                                            title: jQuery.i18n.map["configs.not-saved"],
                                            message: jQuery.i18n.map["configs.not-changed"],
                                            type: "error"
                                        });
                                    }
                                    else {
                                        location.hash = "#/manage/user-settings/success";
                                        window.location.reload(true);
                                    }
                                });
                            }
                            else {
                                CountlyHelpers.notify({
                                    title: jQuery.i18n.map["configs.changed"],
                                    message: jQuery.i18n.map["configs.saved"]
                                });
                                $('#overlay').hide();
                                $('.user-configuration-modal').hide();
                                $("#configs-apply-changes").hide();
                            }
                            if (member_image !== "" && member_image !== "delete") {
                                countlyGlobal.member.member_image = member_image;
                            }
                            if (member_image === "delete") {
                                countlyGlobal.member.member_image = "";
                            }
                        }
                    });
                }
                else {
                    countlyPlugins.updateConfigs(self.changes, function(err) {
                        if (err) {
                            CountlyHelpers.notify({
                                title: jQuery.i18n.map["configs.not-saved"],
                                message: jQuery.i18n.map["configs.not-changed"],
                                type: "error"
                            });
                        }
                        else {
                            location.hash = "#/manage/configurations/success/" + self.selectedNav.key;
                            window.location.reload(true);
                        }
                    });
                }
            });

            $("#delete_account_password").keyup(function() {
                $('#password-input-mandatory-warning').css('visibility', 'hidden');
            });

            $("#delete-user-account").click(function() {
                var pv = $("#delete_account_password").val();
                pv = pv.trim();
                if (pv === "") {
                    var msg1 = {title: jQuery.i18n.map["common.error"], message: jQuery.i18n.map["user-settings.password-mandatory"], clearAll: true, type: "error"};
                    CountlyHelpers.notify(msg1);
                }
                else {
                    var text = jQuery.i18n.map["user-settings.delete-account-confirm"];
                    $('.user-configuration-modal').hide();
                    CountlyHelpers.confirm(text, "popStyleGreen", function(result) {
                        if (!result) {
                            return true;
                        }
                        countlyPlugins.deleteAccount({password: pv}, function(err, msg) {
                            if (msg === true || msg === 'true') {
                                window.location = "/login"; //deleted. go to login
                            }
                            else if (msg === 'password not valid' || msg === 'password mandatory' || msg === 'global admin limit') {
                                $('#overlay').show();
                                $('#user-account-delete-modal').show();
                                CountlyHelpers.notify({title: jQuery.i18n.map["common.error"], message: jQuery.i18n.map["user-settings." + msg], sticky: true, clearAll: true, type: "error"});
                            }
                            else if (err === true) {
                                $('#overlay').show();
                                $('#user-account-delete-modal').show();
                                var msg2 = {title: jQuery.i18n.map["common.error"], message: msg, sticky: true, clearAll: true, type: "error"};
                                CountlyHelpers.notify(msg2);
                            }
                        });
                    }, [jQuery.i18n.map["common.no-dont-continue"], jQuery.i18n.map["common.yes"]], { title: jQuery.i18n.map["user-settings.delete-account-title"], image: "delete-user" });
                }
            });


            $('#search-box').off('input').on('input', function() {
                var searchKey = $(this).val().toLowerCase();

                if (searchKey.length === 0) {
                    $('#nav-item-' + self.selectedNav.key).trigger('click');
                    return;
                }

                var searchResult = self.searchKeys.filter(function(item) {
                    return item.searchKeys.indexOf(searchKey.toLowerCase()) >= 0;
                });

                var configGroups = [];
                searchResult.forEach(function(result) {
                    var group = {
                        key: result.key,
                        rows: result.subItems.filter(function(field) {
                            return field.searchKeys.indexOf(searchKey.toLowerCase()) >= 0;
                        })
                    };
                    configGroups.push(group);
                });

                $('.config-container').removeClass('selected');
                $('#config-title').html('RESULTS FOR: "' + searchKey + '"');
                $('#config-table-container').removeClass('title-rows-hidden');
                $('#config-table-container').addClass('title-rows-enable');
                self.showSearchResult(configGroups);

                if (configGroups.length === 0) {
                    $('#empty-search-result').show();
                }
                else {
                    $('#empty-search-result').hide();
                }
            });

            $('.pp-menu-trigger').off('click').on('click', function() {
                $('.pp-menu-list').show();
                $('.pp-menu-list').focus();
            });

            $('body').off('change', '#pp-uploader').on('change', '#pp-uploader', function() {
                $('.pp-menu-list').hide();
                CountlyHelpers.upload($(this), '/member/icon', {
                    _csrf: countlyGlobal.csrf_token,
                    member_image_id: countlyGlobal.member._id
                },
                function(err, data) {
                    if (!err) {
                        $('.member_image').html("");
                        $('#member-image-path').val(data);
                        $('.pp-circle').find('span').hide();
                        $('.pp-circle').css({'background-image': 'url("' + data + '?now=' + Date.now() + '")', 'background-size': '100%', 'background-position': '0 0'});
                        $('.member_image').css({'background-image': 'url("' + data + '?now=' + Date.now() + '")', 'background-size': '100%', 'background-position': '0 0'});
                        $('#configs-apply-changes').show();
                    }
                    else {
                        CountlyHelpers.notify(jQuery.i18n.map["plugins.errors"]);
                    }
                });
            });

            if (countlyGlobal.member.global_admin) {
                $(".user-row").show();
            }

            /*
                Make header sticky if scroll is more than the height of header
                This is done in order to make Apply Changes button visible
             */
            // var navigationTop = $("#sticky-config-header").offset().top;


            $(window).on("resize", function() {
                var $fixedHeader = $("#sticky-config-header");

                if ($fixedHeader.hasClass("fixed")) {
                    var width = $("#content-container").width();
                    $fixedHeader.css({ width: width });
                }
            });

            $('body').off('blur', '.pp-menu-list').on('blur', '.pp-menu-list', function() {
                $('.pp-menu-list').hide();
            });

            $('body').off('click', '.delete-member-image').on('click', '.delete-member-image', function() {
                $('#member-image-path').val("delete");
                $('#configs-apply-changes').show();
                setDefaultAvatar();
                $('.pp-menu-list').hide();
            });

            $("#config-row-google_maps_api_key-frontend").parent().append($("#config-row-google_maps_api_key-frontend"));
            $("#send_test_email").off("click").on("click", function() {
                if ($("#send_test_email").hasClass("disabled")) {
                    return;
                }
                $("#send_test_email").addClass("disabled");

                return $.ajax({
                    type: "GET",
                    url: countlyCommon.API_URL + "/o/email_test",
                    data: {},
                    success: function() {
                        $("#send_test_email").removeClass("disabled");
                        CountlyHelpers.notify({ type: "ok", message: jQuery.i18n.map['configs.help.api-send_test_email_delivered']});

                    },
                    fail: function() {
                        $("#send_test_email").removeClass("disabled");
                        CountlyHelpers.notify({ type: "error", message: jQuery.i18n.map['configs.help.api-send_test_email_failed']});
                    }
                });
            });

            $('body').off("click", "#user-configuration-change-password").on("click", "#user-configuration-change-password", function() {
                $('.user-configuration-modal').hide();
                $('#overlay').show();
                $('#user-change-password-modal').show();
            });

            $('body').off("click", "#delete-user-account-button").on("click", "#delete-user-account-button", function() {
                $('.user-configuration-modal').hide();
                $('#overlay').show();
                $('#user-account-delete-modal').show();
            });

            $(document).keyup(function(e) {
                if (e.keyCode === 27) {
                    $('.user-configuration-modal').hide();
                }
            });

            $('body').off('click', '.hide-user-configuration-modal').on('click', '.hide-user-configuration-modal', function() {
                $('#overlay').hide();
                $('.user-configuration-modal').hide();
            });

            $('body').on('click', '#change-user-password', function() {
                var old_pwd = $('.user-configuration-modal #old_pwd').val();
                var new_pwd = $('.user-configuration-modal #new_pwd').val();
                var re_new_pwd = $('.user-configuration-modal #re_new_pwd').val();

                if (old_pwd.length > 0 && new_pwd.length > 0 && re_new_pwd.length > 0) {
                    $('#configs-apply-changes').trigger('click');
                }
                else {
                    CountlyHelpers.notify({
                        title: jQuery.i18n.map["configs.not-saved"],
                        message: jQuery.i18n.map["configs.fill-required-fields"],
                        type: "error"
                    });
                }
            });
        }
    },
    updateConfig: function(id, value) {
        var configs = id.split(".");

        //update cache
        var data = this.cache;
        for (var i = 0; i < configs.length; i++) {
            if (typeof data[configs[i]] === "undefined") {
                break;
            }
            else if (i === configs.length - 1) {
                data[configs[i]] = value;
            }
            else {
                data = data[configs[i]];
            }
        }

        //add to changes
        data = this.changes;
        for (i = 0; i < configs.length; i++) {
            if (i === configs.length - 1) {
                data[configs[i]] = value;
            }
            else if (typeof data[configs[i]] === "undefined") {
                data[configs[i]] = {};
            }
            data = data[configs[i]];
        }
        $("#configs-apply-changes").removeClass("configs-changes");
        if (JSON.stringify(this.configsData) !== JSON.stringify(this.cache)) {
            $("#configs-apply-changes").addClass("configs-changes");
        }
        else {
            this.changes = {};
        }

        if ($("#configs-apply-changes").hasClass("configs-changes")) {
            $("#configs-apply-changes").show();
        }
        else if (!$("#configs-apply-changes").hasClass("settings-changes")) {
            $("#configs-apply-changes").hide();
        }
    },
    getSearchKeys: function(data) {

        var result = Object.keys(data).reduce(function(prev, key) {
            var dataItem = data[key];
            var searchItem = {};

            var searcKeyItems = Object.keys(dataItem).reduce(function(subPrev, subKey) {
                var titleText = jQuery.i18n.map["configs." + key + "-" + subKey] || jQuery.i18n.map[key + "." + subKey] || jQuery.i18n.map[key + "." + subKey.replace(/\_/g, '-')] || jQuery.i18n.map["userdata." + subKey] || subKey; // eslint-disable-line no-useless-escape
                var helpText = jQuery.i18n.map["configs.help." + key + "-" + subKey] || "";

                var searchItems = titleText + "," + helpText + "," + subKey + ",";

                subPrev.subItems.push({
                    key: subKey,
                    searchKeys: searchItems.toLowerCase()
                });

                subPrev.wholeList += searchItems.toLowerCase();

                return subPrev;
            }, { wholeList: "", subItems: [] });

            searchItem.searchKeys = searcKeyItems.wholeList;
            searchItem.subItems = searcKeyItems.subItems;
            delete searchItem.subItems.wholeList;
            searchItem.key = key;

            prev.push(searchItem);
            return prev;
        }, []);
        return result;
    },
    generateConfigsTable: function(configsData, id) {
        id = id || "";
        var first = true;
        if (id !== "") {
            first = false;
        }
        var configsHTML = "";
        if (!first) {
            configsHTML += "<table class='d-table help-zone-vb' cellpadding='0' cellspacing='0'>";
        }

        var objectKeys = Object.keys(configsData);

        if (id === ".logs") {
            objectKeys.splice(objectKeys.indexOf("default"), 1);
            objectKeys.unshift('default');
        }

        for (var a in objectKeys) {
            var i = objectKeys[a];
            if (typeof configsData[i] === "object" && i !== "_user") {
                if (configsData[i] !== null) {
                    var label = this.getInputLabel((id + "." + i).substring(1), i);
                    if (label) {
                        var display = i === this.selectedNav.key ? this.userConfig ? "table-row" : "block" : this.userConfig ? "table-row" : "none";

                        // var category = "CORE";
                        var relatedNav = this.navTitles.coreTitles.find(function(x) { // eslint-disable-line no-loop-func
                            return x.key === i;
                        });
                        if (!relatedNav) {
                            // category = "PLUGINS";
                            relatedNav = this.navTitles.pluginTitles.find(function(x) { // eslint-disable-line no-loop-func
                                return x.key === i;
                            });
                        }
                        if (this.userConfig) {
                            configsHTML += "<tr id='config-table-row-" + i + "' class='config-table-row'><td style='border:none; border-right:1px solid #dbdbdb;'></td><td style='padding-left:20px;color:#868686;font-size:11px;'>" + jQuery.i18n.map["configs.table-description"] + "</td></tr>";
                        }
                        configsHTML += "<tr id='config-table-row-" + i + "' style='display:" + display + "' class='config-table-row'>";

                        if (this.userConfig) {
                            configsHTML += "<td>" + relatedNav.label + "</td>";
                        }

                        configsHTML += "<td>" + this.generateConfigsTable(configsData[i], id + "." + i) + "</td>";
                        configsHTML += "</tr>";
                    }

                }
                else {
                    var input = this.getInputByType((id + "." + i).substring(1), "");
                    var detailsLabel = this.getInputLabel((id + "." + i).substring(1), i);
                    if (input && detailsLabel) {
                        configsHTML += "<tr id='config-row-" + i + "-" + id.replace(".", "") + "' class='config-table-details-row'><td>" + detailsLabel + "</td><td>" + input + "</td></tr>";
                    }
                }
            }
            else if (i === "_user") {
                var hasSelectedData = Object.keys(configsData[i]).some(function(key) { // eslint-disable-line no-loop-func
                    return configsData[i][key];
                });
                var userLevelLabel = '<div data-localize="' + jQuery.i18n.map["configs.user-level-configuration"] + '">' + jQuery.i18n.map["configs.user-level-configuration"] + '</div><span class="config-help" data-localize="' + jQuery.i18n.map["configs.help.user-level-configuration"] + '">' + jQuery.i18n.map["configs.help.user-level-configuration"] + '</span>';
                var userLevelInput = '<div class="cly-multi-select ' + (countlyAuth.validateUpdate('global_plugins') ? '' : 'disabled') + ' user-config-select ' + (hasSelectedData ? 'selection-exists' : '') + '" id="' + id.substring(1) + '._user" style="width: 100%; box-sizing: border-box;">';
                userLevelInput += '<div class="select-inner">';
                userLevelInput += '<div class="text-container">';
                userLevelInput += '<div class="text">';
                userLevelInput += '<div class="default-text"></div>';
                for (var c in configsData[i]) {
                    if (configsData[i][c]) {
                        userLevelInput += '<div class="selection" data-value="' + c + '">' + this.getLabelName((id + "." + c).substring(1), c).text + '<div class="remove"><i class="ion-android-close"></i></div></div>';
                    }
                }
                userLevelInput += '</div>';
                userLevelInput += '</div>';
                userLevelInput += '<div class="right combo"></div>';
                userLevelInput += '</div>';
                userLevelInput += '<div class="select-items square" style="width: 100%;"><div>';
                for (var d in configsData[i]) {
                    userLevelInput += '<div data-value="' + d + '" class="item ' + (configsData[i][d] ? 'selected' : '') + '">' + this.getLabelName((id + "." + d).substring(1), d).text + '</div>';
                }
                userLevelInput += '</div></div>';
                userLevelInput += '</div>';

                configsHTML += "<tr id='config-row-" + i + "-user-conf' class='config-table-details-row user-row' style='display:none'><td>" + userLevelLabel + "</td><td>" + userLevelInput + "</td></tr>";
            }
            else {
                var inputElse = this.getInputByType((id + "." + i).substring(1), configsData[i]);
                var labelElse = this.getInputLabel((id + "." + i).substring(1), i);
                if (inputElse && labelElse) {
                    configsHTML += "<tr id='config-row-" + i + "-" + id.replace(".", "") + "' class='config-table-details-row'><td>" + labelElse + "</td><td>" + inputElse + "</td></tr>";
                }
            }
        }
        if (!first) {
            configsHTML += "</table>";
        }
        return configsHTML;
    },
    getLabelName: function(id, value) {
        var ns = id.split(".")[0];
        if (ns !== "frontend" && ns !== "api" && ns !== "apps" && ns !== "logs" && ns !== "security" && countlyGlobal.plugins.indexOf(ns) === -1) {
            return null;
        }

        if (typeof this.predefinedLabels[id] !== "undefined") {
            return { dataLocalize: this.predefinedLabels[id], text: jQuery.i18n.map[this.predefinedLabels[id]] };
        }
        else if (jQuery.i18n.map["configs." + id]) {
            return { dataLocalize: 'configs." + id + "', text: jQuery.i18n.map["configs." + id] };
        }
        else if (jQuery.i18n.map["configs." + id.replace(".", "-")]) {
            return { dataLocalize: 'configs." + id.replace(".", "-") + "', text: jQuery.i18n.map["configs." + id.replace(".", "-")] };
        }
        else if (jQuery.i18n.map[id]) {
            return { dataLocalize: id, text: jQuery.i18n.map[id] };
        }
        else if (jQuery.i18n.map[id.replace(".", "-")]) {
            return { dataLocalize: '" + id.replace(".", "-") + "', text: jQuery.i18n.map[id.replace(".", "-")] };
        }
        else {
            return { text: value };
        }
    },
    getInputLabel: function(id, value, asLabel) {
        var ns = id.split(".")[0];
        if (ns !== "frontend" && ns !== "api" && ns !== "apps" && ns !== "logs" && ns !== "security" && countlyGlobal.plugins.indexOf(ns) === -1) {
            return null;
        }
        var ret = "";
        if (jQuery.i18n.map["configs.help." + id]) {
            ret = "<span class='config-help' data-localize='configs.help." + id + "'>" + jQuery.i18n.map["configs.help." + id] + "</span>";
        }
        else if (jQuery.i18n.map["configs.help." + id.replace(".", "-")]) {
            ret = "<span class='config-help' data-localize='configs.help." + id.replace(".", "-") + "'>" + jQuery.i18n.map["configs.help." + id.replace(".", "-")] + "</span>";
        }

        var labelNameItem = this.getLabelName(id, value);
        if (asLabel) {
            return "<label data-localize='" + labelNameItem.dataLocalize + "'>" + labelNameItem.text + "</label>" + ret;
        }
        else {
            return "<div data-localize='" + labelNameItem.dataLocalize + "'>" + labelNameItem.text + "</div>" + ret;
        }
    },
    getInputByType: function(id, value) {
        if (this.predefinedInputs[id]) {
            return this.predefinedInputs[id](value);
        }
        else if (typeof value === "boolean") {
            var input = '<div class="on-off-switch">';

            if (value) {
                input += '<input type="checkbox" ' + (countlyAuth.validateUpdate('global_plugins') ? '' : 'disabled') + ' name="on-off-switch" class="on-off-switch-checkbox" id="' + id + '" checked>';
            }
            else {
                input += '<input type="checkbox" ' + (countlyAuth.validateUpdate('global_plugins') ? '' : 'disabled') + ' name="on-off-switch" class="on-off-switch-checkbox" id="' + id + '">';
            }

            input += '<label class="on-off-switch-label" for="' + id + '"></label>';
            input += '<span class="text">' + jQuery.i18n.map["plugins.enable"] + '</span>';
            input += "</div>";
            return input;
        }
        else if (typeof value === "number") {
            return "<input type='number' " + (countlyAuth.validateUpdate('global_plugins') ? '' : 'disabled') + " id='" + id + "' value='" + value + "' max='2147483647' min='0' onkeyup='this.value= (parseInt(this.value) > 2147483647) ? 2147483647 : this.value;'/>";
        }
        else {
            return "<input type='text' " + (countlyAuth.validateUpdate('global_plugins') ? '' : 'disabled') + " id='" + id + "' value='" + value + "' readonly onfocus=\"if (this.hasAttribute('readonly')) {this.removeAttribute('readonly'); this.blur(); this.focus();}\"/>";
        }
    },
    getLabel: function(id) {
        if (countlyGlobal.plugins.indexOf(id) === -1) {
            return jQuery.i18n.map["configs." + id];
        }

        var ret = "";
        if (jQuery.i18n.map["configs.help." + id]) {
            ret = jQuery.i18n.map["configs.help." + id];
        }
        else if (jQuery.i18n.map["configs.help." + id.replace(".", "-")]) {
            ret = jQuery.i18n.map["configs.help." + id.replace(".", "-")];
        }
        if (typeof this.predefinedLabels[id] !== "undefined") {
            return jQuery.i18n.map[this.predefinedLabels[id]] + ret;
        }
        else if (jQuery.i18n.map["configs." + id]) {
            return jQuery.i18n.map["configs." + id] + ret;
        }
        else if (jQuery.i18n.map["configs." + id.replace(".", "-")]) {
            return jQuery.i18n.map["configs." + id.replace(".", "-")] + ret;
        }
        else if (jQuery.i18n.map[id]) {
            return jQuery.i18n.map[id] + ret;
        }
        else if (jQuery.i18n.map[id.replace(".", "-")]) {
            return jQuery.i18n.map[id.replace(".", "-")] + ret;
        }
        else {
            return id + ret;
        }
    },
    setNavTitles: function(configdata) {

        var pluginTitles = [], coreTitles = [];

        var self = this;
        var coreDefaults = ['frontend', 'security', 'api', 'apps', 'logs'];

        Object.keys(configdata).forEach(function(key) {
            if (coreDefaults.indexOf(key) >= 0) {
                coreTitles.push({ key: key, label: self.getLabel(key) });
            }
            else if (countlyGlobal.plugins.indexOf(key) >= 0) {
                pluginTitles.push({ key: key, label: self.getLabel(key) });
            }
        });

        coreTitles = coreTitles.sort(function(a, b) {
            return a > b;
        });
        pluginTitles = pluginTitles.sort(function(a, b) {
            return a > b;
        });

        return {
            coreTitles: coreTitles,
            pluginTitles: pluginTitles
        };
    },
    showSearchResult: function(results) {
        $('.config-table-row-header').hide();
        $('.config-table-row').hide();
        $('.config-table-details-row').hide();

        results.forEach(function(result) {
            $('#config-table-row-header-' + result.key).show();
            $('#config-table-row-' + result.key).show();

            result.rows.forEach(function(row) {
                $('#config-row-' + row.key + '-' + result.key).show();
            });
        });
    },
    registerInput: function(id, callback) {
        this.predefinedInputs[id] = callback;
    },
    registerLabel: function(id, html) {
        this.predefinedLabels[id] = html;
    },
    refresh: function() {
    }
});

//register views
app.pluginsView = new PluginsView();
app.configurationsView = new ConfigurationsView();

var showInAppManagment = {"api": {"safe": true, "send_test_email": true, "session_duration_limit": true, "city_data": true, "event_limit": true, "event_segmentation_limit": true, "event_segmentation_value_limit": true, "metric_limit": true, "session_cooldown": true, "total_users": true, "prevent_duplicate_requests": true, "metric_changes": true, "data_retention_period": true}};

if (countlyAuth.validateRead(app.configurationsView.featureName)) {
    if (countlyGlobal.plugins.indexOf("drill") !== -1) {
        showInAppManagment.drill = {"big_list_limit": true, "record_big_list": true, "cache_threshold": true, "correct_estimation": true, "custom_property_limit": true, "list_limit": true, "projection_limit": true, "record_actions": true, "record_crashes": true, "record_meta": true, "record_pushes": true, "record_sessions": true, "record_star_rating": true, "record_apm": true, "record_views": true};
    }
    if (countlyGlobal.plugins.includes("logger")) {
        showInAppManagment.logger = {"state": true, "limit": true};
    }
}

if (countlyAuth.validateUpdate(app.configurationsView.featureName)) {
    var configManagementPromise = null;
    for (var key in showInAppManagment) {
        app.addAppManagementView(key, jQuery.i18n.map['configs.' + key], countlyManagementView.extend({
            key: key,
            initialize: function() {
                this.plugin = this.key;
            },
            resetTemplateData: function() {
                this.template = Handlebars.compile(this.generateTemplate(this.key));
            },
            generateTemplate: function(id) {
                var fields = '';
                this.configsData = countlyPlugins.getConfigsData();
                id = this.key || id;
                this.cache = {};
                this.templateData = {};

                var appConfigData = this.config();
                for (var i in showInAppManagment[id]) {
                    if (showInAppManagment[id][i] === true) {
                        var myvalue = "";
                        if (appConfigData && typeof appConfigData[i] !== "undefined") {
                            myvalue = appConfigData[i];
                        }
                        else if (this.configsData && this.configsData[id] && typeof this.configsData[id][i] !== "undefined") {
                            myvalue = this.configsData[id][i];
                        }
                        this.templateData[i] = myvalue;
                        var input = app.configurationsView.getInputByType((id + "." + i), myvalue);
                        var label = app.configurationsView.getInputLabel((id + "." + i), i, true);
                        if (input && label) {
                            fields += ('<div id="config-row-' + i + "-" + id.replace(".", "") + '" class="mgmt-plugins-row help-zone-vs" data-help-localize="help.mgmt-plugins.push.ios.type">' +
                                    '   <div>' + label + '</div>' +
                                    '   <div>' + input + '</div>' +
                                    '</div>');
                        }
                    }
                }
                return fields;
            },
            doOnChange: function(name, value) {
                if (name) {
                    name = name.substring(this.key.length + 1);
                    if (name && countlyCommon.dot(this.templateData, name) !== value) {
                        countlyCommon.dot(this.templateData, name, value);
                    }

                    if (this.isSaveAvailable()) {
                        this.el.parent().find("h3[aria-controls=" + this.el.attr("id") + "]").find('.icon-button').show();
                    }
                    else {
                        this.el.parent().find("h3[aria-controls=" + this.el.attr("id") + "]").find('.icon-button').hide();
                    }
                    this.onChange(name, value);
                }
            },
            beforeRender: function() { // eslint-disable-line no-loop-func
                var self = this;
                if (!configManagementPromise) {
                    configManagementPromise = $.when(countlyPlugins.initializeConfigs(), countlyPlugins.initializeActiveAppConfigs());
                }
                return $.when(configManagementPromise).then(function() {
                    configManagementPromise = null;
                    self.template = Handlebars.compile(self.generateTemplate(self.key));
                    self.savedTemplateData = JSON.stringify(self.templateData);
                }).then(function() {});
            }
        }));
    }
}

if (countlyAuth.validateRead(app.pluginsView.featureName)) {
    app.route('/manage/plugins', 'plugins', function() {
        if (countlyGlobal.COUNTLY_CONTAINER === 'frontend') {
            app.navigate("#/", true);
        }
        else {
            this.renderWhenReady(this.pluginsView);
        }
    });

    app.addPageScript("/manage/plugins", function() {
        $("#plugins-selector").find(">.button").click(function() {
            if ($(this).hasClass("selected")) {
                return true;
            }

            $(".plugins-selector").removeClass("selected").removeClass("active");
            var filter = $(this).attr("id");

            app.activeView.filterPlugins(filter);
        });

        var pluginsData = countlyPlugins.getData();
        var plugins = [];
        var dirtyPlugins = {};
        for (var i = 0; i < pluginsData.length; i++) {
            if (pluginsData[i].enabled) {
                plugins.push(pluginsData[i].code);
            }
        }

        /**
         *  Change state of plugins
         *  @param {Array} pluginList - list of plugins to change state for
         *  @param {Boolean} newState - State to change to
         */
        function changeStateOf(pluginList, newState) {
            pluginList.forEach(function(item) {
                $("#plugin-" + item).prop('checked', newState);
                if (newState) {
                    plugins.push(item);
                    plugins = _.uniq(plugins);
                }
                else {
                    plugins = _.without(plugins, item);
                }
            });
        }

        $("#plugins-table").on("change", ".on-off-switch input", function() {
            var $checkBox = $(this),
                plugin = $checkBox.attr("id").replace(/^plugin-/, '');

            var defaultAction = function(affected) {
                if ($checkBox.is(":checked")) {
                    plugins.push(plugin);
                    plugins = _.uniq(plugins);
                }
                else {
                    plugins = _.without(plugins, plugin);
                }

                if (!affected) {
                    affected = [plugin];
                }
                else {
                    affected = [plugin].concat(affected);
                }

                affected.forEach(function(item) {
                    var itemCb = $("#plugin-" + item);
                    if (itemCb.length > 0 && itemCb.is(":checked") !== itemCb.parent().data("initial")) {
                        itemCb.parents("tr").addClass("dirty");
                        dirtyPlugins[item] = 1;
                    }
                    else {
                        itemCb.parents("tr").removeClass("dirty");
                        delete dirtyPlugins[item];
                    }
                });

                var isDirty = Object.keys(dirtyPlugins).length > 0;

                if (isDirty) {
                    $(".btn-plugin-enabler").show();
                }
                else {
                    $(".btn-plugin-enabler").hide();
                }
            };

            var enabledDescendants = _.intersection(countlyPlugins.getRelativePlugins(plugin, "down"), plugins),
                disabledAncestors = _.difference(countlyPlugins.getRelativePlugins(plugin, "up"), plugins);

            if (!$checkBox.is(":checked") && enabledDescendants.length > 0) {
                CountlyHelpers.confirm(jQuery.i18n.prop("plugins.disable-descendants", countlyPlugins.getTitle(plugin), enabledDescendants.map(function(item) {
                    return countlyPlugins.getTitle(item);
                }).join(", ")), "popStyleGreen popStyleGreenWide", function(result) {
                    if (result) {
                        changeStateOf(enabledDescendants, false);
                        defaultAction(enabledDescendants);
                    }
                    else {
                        $checkBox.prop('checked', true);
                    }
                }, [jQuery.i18n.map["common.no-dont-continue"], jQuery.i18n.map["plugins.yes-i-want-to-continue"]], { title: jQuery.i18n.map["plugins.indirect-status-change"], image: "apply-changes-to-plugins" });
            }
            else if ($checkBox.is(":checked") && disabledAncestors.length > 0) {
                CountlyHelpers.confirm(jQuery.i18n.prop("plugins.enable-ancestors", countlyPlugins.getTitle(plugin), disabledAncestors.map(function(item) {
                    return countlyPlugins.getTitle(item);
                }).join(", ")), "popStyleGreen popStyleGreenWide", function(result) {
                    if (result) {
                        changeStateOf(disabledAncestors, true);
                        defaultAction(disabledAncestors);
                    }
                    else {
                        $checkBox.prop('checked', false);
                    }
                }, [jQuery.i18n.map["common.no-dont-continue"], jQuery.i18n.map["plugins.yes-i-want-to-continue"]], { title: jQuery.i18n.map["plugins.indirect-status-change"], image: "apply-changes-to-plugins" });
            }
            else {
                defaultAction();
            }
        });

        $(document).on("click", ".btn-plugin-enabler", function() {
            var pluginsEnabler = {};

            $("#plugins-table").find(".on-off-switch input").each(function() {
                var plugin = this.id.toString().replace(/^plugin-/, ''),
                    state = ($(this).is(":checked")) ? true : false;
                pluginsEnabler[plugin] = state;
            });

            var text = jQuery.i18n.map["plugins.confirm"];
            var msg = { title: jQuery.i18n.map["plugins.processing"], message: jQuery.i18n.map["plugins.wait"], info: jQuery.i18n.map["plugins.hold-on"], sticky: true };
            CountlyHelpers.confirm(text, "popStyleGreen popStyleGreenWide", function(result) {
                if (!result) {
                    return true;
                }
                CountlyHelpers.notify(msg);
                app.activeView.togglePlugin(pluginsEnabler);
            }, [jQuery.i18n.map["common.no-dont-continue"], jQuery.i18n.map["plugins.yes-i-want-to-apply-changes"]], { title: jQuery.i18n.map["plugins-apply-changes-to-plugins"], image: "apply-changes-to-plugins" });
        });
    });
}

if (countlyAuth.validateRead(app.configurationsView.featureName)) {
    app.route('/manage/configurations', 'configurations', function() {
        this.configurationsView.namespace = null;
        this.configurationsView.reset = false;
        this.configurationsView.userConfig = false;
        this.configurationsView.success = false;
        this.renderWhenReady(this.configurationsView);
    });

    app.route('/manage/configurations/:namespace', 'configurations_namespace', function(namespace) {
        if (namespace === "reset") {
            this.configurationsView.namespace = null;
            this.configurationsView.reset = true;
            this.configurationsView.userConfig = false;
            this.configurationsView.success = false;
            this.renderWhenReady(this.configurationsView);
        }
        else {
            this.configurationsView.namespace = namespace;
            this.configurationsView.reset = false;
            this.configurationsView.userConfig = false;
            this.configurationsView.success = false;
            this.renderWhenReady(this.configurationsView);
        }
    });

    app.route('/manage/configurations/:status/:namespace', 'configurations_namespace', function(status, namespace) {
        if (status === "success") {
            this.configurationsView.namespace = namespace;
            this.configurationsView.reset = false;
            this.configurationsView.userConfig = false;
            this.configurationsView.success = true;
            this.renderWhenReady(this.configurationsView);
        }
    });

    app.route('/manage/user-settings', 'user-settings', function() {
        this.configurationsView.namespace = null;
        this.configurationsView.reset = false;
        this.configurationsView.userConfig = true;
        this.configurationsView.success = false;
        this.renderWhenReady(this.configurationsView);
    });

    app.route('/manage/user-settings/:namespace', 'user-settings_namespace', function(namespace) {
        if (namespace === "reset") {
            this.configurationsView.reset = true;
            this.configurationsView.success = false;
            this.configurationsView.namespace = null;
        }
        else if (namespace === "success") {
            this.configurationsView.reset = false;
            this.configurationsView.success = true;
            this.configurationsView.namespace = null;
        }
        else {
            this.configurationsView.reset = false;
            this.configurationsView.success = false;
            this.configurationsView.namespace = namespace;
        }
        this.configurationsView.userConfig = true;
        this.renderWhenReady(this.configurationsView);
    });
}

$(document).ready(function() {
    if (countlyGlobal.member && countlyGlobal.member.global_admin || countlyAuth.validateRead(app.pluginsView.featureName)) {
        if (countlyGlobal.COUNTLY_CONTAINER !== 'frontend') {
            app.addMenu("management", {code: "plugins", url: "#/manage/plugins", text: "plugins.title", icon: '<div class="logo-icon fa fa-puzzle-piece"></div>', priority: 30});
        }
    }
    if (countlyGlobal.member && countlyGlobal.member.global_admin || countlyAuth.validateRead(app.configurationsView.featureName)) {
        app.addMenu("management", {code: "configurations", url: "#/manage/configurations", text: "plugins.configs", icon: '<div class="logo-icon ion-android-options"></div>', priority: 40});
    }
});
