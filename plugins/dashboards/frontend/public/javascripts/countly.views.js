/*global $,countlyView,countlyGlobal,Countly,screenfull,CustomDashboardsView,countlyDashboards,countlyWidgets,Handlebars,Backbone,_,CountlyHelpers,jQuery,countlyCommon,app, T,DashbaordsCustomPeriod,groupsModel */

window.CustomDashboardsView = countlyView.extend({
    _dashboardId: null,
    emailEditInput: {},
    emailViewInput: {},
    initialize: function() {
        var dashboardsDrop = $('<div id="dashboard-selection" class="dropdown bordered large" style="border-left:none;"></div>');
        dashboardsDrop.append('<div class="selected" data-localize="dashboards.default"></div>');
        dashboardsDrop.append('<div class="empty-state" data-localize="dashboards.default"></div>');

        var dashboardMenu = $('<div class="menu"></div>');
        dashboardMenu.append('<div id="add-dashboard" class="action"><i class="icon ion-plus-circled"></i><span data-localize="dashboards.create-dashboard"></span></div>');
        dashboardMenu.append('<div class="search nav-search"><input type="text" autofocus></div><div class="list"></div>');

        dashboardsDrop.append(dashboardMenu);

        $("#top-bar").find(".left-menu").append(dashboardsDrop);
        app.localize();
        /**
         * Clear highlights class from app items
         * @param {array} filteredItems - filtered app items list
         */
        function clearHighlights(filteredItems) {
            var length = filteredItems.length;
            for (var i = 0; i < length; i++) {
                $(filteredItems[i]).removeClass('highlighted-app-item');
            }
        }

        var arrowed = false;
        var currentIndex = 0;
        $('#dashboard-selection').on('keyup', '.nav-search input', function(e) {
            var code = (e.keyCode || e.which);
            var filteredItems = $('#dashboard-selection > div.menu > div.list > .filtered-app-item');
            var indexLimit = filteredItems.length;
            if (code === 38) {
                clearHighlights(filteredItems);
                if (!arrowed) {
                    arrowed = true;
                    currentIndex = indexLimit - 1;
                }
                else {
                    currentIndex = currentIndex - 1;
                    if (currentIndex === -1) {
                        currentIndex = indexLimit - 1;
                    }
                }
                $(filteredItems[currentIndex]).addClass('highlighted-app-item');
            }
            else if (code === 40) {
                clearHighlights(filteredItems);
                if (!arrowed) {
                    arrowed = true;
                    currentIndex = 0;
                }
                else {
                    currentIndex = currentIndex + 1;
                    if (currentIndex === indexLimit) {
                        currentIndex = 0;
                    }
                }
                $(filteredItems[currentIndex]).addClass('highlighted-app-item');
            }
            else if (code === 13) {
                $('#dashboard-selection').removeClass('clicked');
                window.location.href = $('#dashboard-selection .highlighted-app-item').attr('href');
            }
            else {
                return;
            }
        });

        $.when(
            T.get('/dashboards/templates/widget-drawer.html', function(src) {
                Handlebars.registerPartial("widget-drawer", src);
            }),
            T.get('/dashboards/templates/dashboard-drawer.html', function(src) {
                Handlebars.registerPartial("dashboard-drawer", src);
            }),
            T.get('/dashboards/templates/empty-states/no-widgets.html', function(src) {
                Handlebars.registerPartial("no-widgets", src);
            }),
            T.get('/dashboards/templates/empty-states/no-dashboards.html', function(src) {
                Handlebars.registerPartial("no-dashboards", src);
            }),
            countlyCommon.getGraphNotes()
        ).then(function() {});
    },
    beforeRender: function() {
        $("body").addClass("dashboards-view");
        $("#hide-sidebar-button").hide();

        var self = this;
        self._dashHasData = false;
        self.isGroupSharingAllowed = countlyGlobal.plugins.indexOf("groups") > -1 && countlyGlobal.member.global_admin;
        self.isSharingAllowed = countlyGlobal.sharing_status || (countlyGlobal.member.global_admin && ((countlyGlobal.member.restrict || []).indexOf("#/manage/configurations") < 0));

        var allAjaxCalls = [
            countlyDashboards.initialize(self._dashboardId, false),
            countlyWidgets.initialize(),
            T.render('/dashboards/templates/dashboards.html', function(src) {
                self.template = src;
            })
        ];

        if (this.isGroupSharingAllowed) {
            allAjaxCalls.push(groupsModel.initialize());
        }

        return $.when.apply(null, allAjaxCalls).then(function() {});
    },
    renderCommon: function(isRefresh) {
        var self = this;

        self.orchestrator(isRefresh);

        if (!isRefresh) {
            $("#custom-dashboard").html(this.template(this.templateData));

            $(".cly-drawer").on("cly-drawer-open", function() {
                var totalOpts = $("#widget-drawer .details #widget-types .opts .opt").length;
                if (totalOpts <= 4) {
                    return;
                }

                $("#widget-drawer .details #widget-types .opts .opt").each(function() {
                    $(this).removeClass("cly-grid-4").addClass("dashboard-widget-item");
                });
            });

            $("#add-widget").on("click", function() {
                $(".cly-drawer").removeClass("open editing");
                $("#widget-drawer").find("#widget-types .opt").removeClass("disabled");
                $(".cly-drawer").trigger("cly-drawer-open");
                self.widgetDrawer.reset();
                $("#widget-drawer").addClass("open");
            });

            $("#add-dashboard, #add-dashboard-alt").on("click", function() {
                $(".cly-drawer").removeClass("open editing");
                self.resetDashboardDrawer();
                $("#dashboard-drawer").addClass("open");
            });

            $(".cly-drawer").find(".close").on("click", function() {
                $(".grid-stack-item").removeClass("marked-for-editing");
                $(this).parents(".cly-drawer").removeClass("open");
            });

            $("#delete-dashboard").on("click", function() {
                var dashboardMeta = countlyDashboards.getDashboard(self._dashboardId);

                CountlyHelpers.confirm(jQuery.i18n.prop("dashboards.delete-dashboard-text", dashboardMeta.name), "popStyleGreen", function(r) {
                    if (!r) {
                        return true;
                    }

                    countlyDashboards.deleteDashboard(self._dashboardId, function(result) {
                        if (result && result.error) {
                            if (result.dashboard_access_denied) {
                                self.accessDeniedPopup();
                            }

                            if (result.edit_access_denied) {
                                self.editAccessDeniedPopup();
                            }
                            return;
                        }

                        if (result && result.n === 1) {
                            app.navigate("#/custom", true);
                        }

                        if (result && result.n === 0) {
                            self.editAccessDeniedPopup();
                        }
                    });
                }, [jQuery.i18n.map["common.no-dont-delete"], jQuery.i18n.map["dashboards.yes-delete-dashboard"]], {title: jQuery.i18n.map["dashboards.delete-dashboard-title"], image: "delete-dashboard"});
            });

            $("#edit-dashboard").on("click", function() {
                $(".cly-drawer").removeClass("open");
                $("#dashboard-drawer").addClass("open editing");
                $("#save-dashboard").removeClass("disabled");
                self.resetDashboardDrawer();
                self.loadDashboardSettings();
            });

            $("#duplicate-dashboard").on("click", function() {
                $(".cly-drawer").removeClass("open editing");
                self.loadDashboardSettings(true);
                var dashNameCopy = $("#dashboard-name-input").val();
                $("#dashboard-name-input").val("Copy - " + dashNameCopy);
                $("#dashboard-drawer").addClass("open");
                $("#dashboard-drawer").addClass("duplicate");
                $("#dashboard-drawer").trigger("cly-dashboard-section-complete");
            });

            $("body").off("click", ".edit-widget").on("click", ".edit-widget", function() {
                self.widgetDrawer.reset();

                var widgetId = $(this).parents(".grid-stack-item").data("widget-id");

                $(".cly-drawer").removeClass("open");
                $("#widget-drawer").addClass("open editing");
                $("#widget-drawer").find("#widget-types .opt").addClass("disabled");
                $("#save-widget").data("widget-id", widgetId);
                $(".cly-drawer").trigger("cly-drawer-open");
                // Mark selected widget for editing and remove class from other widgets
                $(".grid-stack-item").removeClass("marked-for-editing");
                $(this).parents(".grid-stack-item").addClass("marked-for-editing");

                self.loadWidgetSettings(widgetId);
            });

            $("body").off("click", ".delete-widget").on("click", ".delete-widget", function() {
                var $selectedWidget = $(this).parents(".grid-stack-item"),
                    widgetId = $selectedWidget.data("widget-id");

                $selectedWidget.addClass("marked-for-deletion");

                CountlyHelpers.confirm(jQuery.i18n.map["dashboards.delete-widget-text"], "popStyleGreen", function(r) {
                    if (!r) {
                        $selectedWidget.removeClass("marked-for-deletion");
                        return true;
                    }

                    countlyDashboards.removeWidgetFromDashboard(self._dashboardId, widgetId, function(result) {
                        if (result && result.error) {
                            if (result.dashboard_access_denied) {
                                self.accessDeniedPopup();
                            }

                            if (result.edit_access_denied) {
                                self.editAccessDeniedPopup();
                            }
                            $selectedWidget.removeClass("marked-for-deletion");
                            return;
                        }

                        self.getGrid().removeWidget($selectedWidget);

                        if (!countlyDashboards.hasWidgets()) {
                            $("#dashboards").attr("class", "no-widgets");
                            self.widgetDrawer.init("time-series", "session");
                        }
                    });
                }, [jQuery.i18n.map["common.no-dont-delete"], jQuery.i18n.map["dashboards.delete-widget"]], { title: jQuery.i18n.map["dashboards.delete-widget-title"] });
            });

            var preventTimeoutInterval;

            $("#fullscreen, #fullscreen-alt").on("click", function() {
                if (screenfull.enabled && !screenfull.isFullscreen) {
                    $("html").addClass("full-screen");
                    screenfull.request();
                    preventTimeoutInterval = setInterval(function() {
                        $(document).trigger("extend-dashboard-user-session");
                    }, 1000);
                    $(document).idleTimer("pause");
                }
                else {
                    $("html").removeClass("full-screen");
                    screenfull.exit();
                    clearInterval(preventTimeoutInterval);
                    $(document).idleTimer("reset");
                }
            });

            $(document).keyup(function(e) {
                if (e.keyCode === 27) {
                    $(".grid-stack-item").removeClass("marked-for-deletion");
                }
            });

            if (screenfull.enabled) {
                document.addEventListener(screenfull.raw.fullscreenchange, function() {
                    if (!screenfull.isFullscreen) {
                        $("html").removeClass("full-screen");
                    }
                });
            }

            $("#app-navigation").on("click", ".item", function() {
                if ($("body").hasClass("dashboards-view")) {
                    app.navigate("#/", true);
                }
            });

            if (Backbone.history.fragment === "/custom") {
                setTimeout(function() {
                    $("#dashboard-drawer").addClass("open");
                }, 500);

                $("#dashboard-selection").addClass("no-selection");
            }
            else {
                $("#dashboard-selection").removeClass("no-selection");
            }

            this.initGrid();
            this.initState();
        }
    },
    initState: function() {
        var self = this;

        self.populateDashboardList();

        self.initDashboardState();

        //Check the case when there are no dashboards
        this.initWidgetCreation();
        this.initDashboardCreation();
    },
    initDashboardState: function() {
        var self = this,
            dashboards = countlyDashboards.getAllDashboards(),
            dashboardMeta = countlyDashboards.getDashboard(self._dashboardId),
            $dashboards = $("#dashboards"),
            dashboardTheme = dashboardMeta.theme || 1;

        $("html").alterClass('theme-*', 'theme-' + dashboardTheme);

        if (!this._dashboardId || dashboards.length === 0) {
            $dashboards.attr("class", "no-dashboards");
        }
        else if (countlyDashboards.hasWidgets()) {
            $dashboards.attr("class", "");

            $("#dashboard-name").text(dashboardMeta.name);
            $("#dashboard-selection").find(".selected").text(dashboardMeta.name);
            $("#dashboard-selection").find(".selected").attr('title', dashboardMeta.name);

            if (!dashboardMeta.is_editable) {
                $dashboards.addClass("view-only");
            }
            else {
                $dashboards.removeClass("view-only");
            }

            countlyWidgets.createBatch(this._dashboardId, countlyDashboards.getWidgets(), function() {
                //Disable the grid if no data present to display
                self.getGrid().disable();
            });
        }
        else {
            $("#dashboard-name").text(dashboardMeta.name);
            $("#dashboard-selection").find(".selected").text(dashboardMeta.name);
            $("#dashboard-selection").find(".selected").attr('title', dashboardMeta.name);

            $dashboards.attr("class", "no-widgets");

            if (!dashboardMeta.is_editable) {
                $dashboards.addClass("view-only");
            }
            else {
                $dashboards.removeClass("view-only");
            }
        }
    },
    initDashboardCreation: function() {
        var self = this;

        $("#dashboard-name-input").on("keyup", function() {
            $("#dashboard-drawer").trigger("cly-dashboard-section-complete");
        });

        $("#dashboard-themes").on("click", ".theme", function() {
            var themeToApply = $(this).data("theme");
            $("#dashboard-themes").find(".theme").removeClass("selected");
            $(this).addClass("selected");

            if ($(this).parents(".cly-drawer").hasClass("editing")) {
                $("html").alterClass('theme-*', 'theme-' + themeToApply);
            }
        });

        $("#dashboard-drawer").on("cly-dashboard-section-complete", function() {
            var settings = self.getDashboardSettings(),
                allGood = true;

            var optionalKeys = ["shared_email_view", "shared_email_edit", "shared_user_groups_edit", "shared_user_groups_view"];
            for (var settingsKey in settings) {
                if ((!settings[settingsKey] ||
                    (_.isArray(settings[settingsKey]) && settings[settingsKey].length === 0)) &&
                    (optionalKeys.indexOf(settingsKey) === -1)) {
                    allGood = false;
                }
            }

            if (allGood) {
                $("#create-dashboard").removeClass("disabled");
                $("#save-dashboard").removeClass("disabled");
            }
            else {
                $("#create-dashboard").addClass("disabled");
                $("#save-dashboard").addClass("disabled");
            }
        });

        $("#multi-user-group-edit-dropdown").on("cly-multi-select-change", function() {
            $("#dashboard-drawer").trigger("cly-dashboard-section-complete");
        });

        $("#multi-user-group-view-dropdown").on("cly-multi-select-change", function() {
            $("#dashboard-drawer").trigger("cly-dashboard-section-complete");
        });

        $("#share-with").off("click").on("click", ".check", function() {
            $("#share-with").find(".check").removeClass("selected");
            $(this).addClass("selected");

            var shareWith = $(this).data("share-with");

            if (shareWith === "all-users" || shareWith === "none") {
                $("#email-share-with-edit").parent(".section").hide();
                $("#multi-user-group-edit-dropdown").parent(".section").hide();
                $("#email-share-with-view").parent(".section").hide();
                $("#multi-user-group-view-dropdown").parent(".section").hide();
            }
            else if (shareWith === "selected-users") {
                $("#email-share-with-edit").parent(".section").show();
                $("#multi-user-group-edit-dropdown").parent(".section").show();
                $("#email-share-with-view").parent(".section").show();
                $("#multi-user-group-view-dropdown").parent(".section").show();
            }

            $("#dashboard-drawer").trigger("cly-dashboard-section-complete");
        });

        self.emailEditInput = self.initEmailInput("#email-share-with-edit");
        self.emailViewInput = self.initEmailInput("#email-share-with-view");

        self.emailEditInput.on("change", function() {
            $("#dashboard-drawer").trigger("cly-dashboard-section-complete");
        });

        self.emailViewInput.on("change", function() {
            $("#dashboard-drawer").trigger("cly-dashboard-section-complete");
        });

        $("#create-dashboard").on("click", function() {
            if ($(this).hasClass("disabled")) {
                return;
            }

            $(".cly-drawer").removeClass("open editing");

            var dashboardSettings = self.getDashboardSettings();
            var isDuplicateDash = $("#dashboard-drawer").hasClass("duplicate");

            if (isDuplicateDash) {
                $("#dashboard-drawer").removeClass("duplicate");
                dashboardSettings.copyDashId = self._dashboardId;
            }

            countlyDashboards.createDashboard(dashboardSettings, function(result) {
                if (result && result.error) {
                    if (result.sharing_denied) {
                        self.sharingDeniedPopup();
                    }
                    return;
                }

                if (typeof Countly !== "undefined") {
                    Countly.q.push(['add_event', {
                        "key": "dashboards-create-dashboard",
                        "count": 1,
                        "segmentation": {
                            "theme": dashboardSettings.theme
                        }
                    }]);
                }

                var dashboardId = result;
                app.navigate("#/custom/" + dashboardId, true);
            });
        });

        $("#save-dashboard").on("click", function() {
            if ($(this).hasClass("disabled")) {
                return;
            }

            $(".cly-drawer").removeClass("open editing");

            countlyDashboards.updateDashboard(self._dashboardId, self.getDashboardSettings(), function(result) {
                if (result && result.error) {
                    if (result.dashboard_access_denied) {
                        self.accessDeniedPopup();
                    }

                    if (result.sharing_denied) {
                        self.sharingDeniedPopup();
                        self.render();
                    }
                    return;
                }

                var dashboardMeta = countlyDashboards.getDashboard(self._dashboardId);
                if (result.nModified === 0 && !dashboardMeta.is_owner) {
                    self.editAccessDeniedPopup();
                    return;
                }
                self.render();
            });
        });

        addToolTip();

        /**
         * Function to add tooltip
         */
        function addToolTip() {
            $('#dashboard-drawer #dashboard-themes .theme').tooltipster({
                animation: "fade",
                animationDuration: 100,
                delay: 100,
                theme: 'tooltipster-borderless',
                trigger: 'custom',
                triggerOpen: {
                    mouseenter: true,
                    touchstart: true
                },
                triggerClose: {
                    mouseleave: true,
                    touchleave: true
                },
                interactive: true,
                contentAsHTML: true,
                functionInit: function(instance, helper) {
                    instance.content(getTooltipText($(helper.origin)));
                }
            });

            /**
             * Function to get tooltip text
             * @param  {String} jqueryEl - DOM element
             * @returns {String} - DOM element
             */
            function getTooltipText(jqueryEl) {
                var dashTheme = jqueryEl.data("theme");
                var tooltipStr = "<div id='dashboard-theme-tip'>";

                tooltipStr += jQuery.i18n.prop("dashbaords.dashboard-theme-" + dashTheme);

                tooltipStr += "</div>";

                return tooltipStr;
            }
        }

        self.resetDashboardDrawer();
    },

    initEmailInput: function(el) {
        var REGEX_EMAIL = '([a-z0-9!#$%&\'*+/=?^_`{|}~-]+(?:\\.[a-z0-9!#$%&\'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)';

        return $(el).selectize({
            plugins: ['remove_button'],
            persist: false,
            maxItems: null,
            valueField: 'email',
            labelField: 'name',
            searchField: ['name', 'email'],
            options: [],
            placeholder: jQuery.i18n.map["dashboards.select-users"],
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
                    return !Object.hasOwnProperty.call(this.options, match[0]);
                }

                // name <email@address.com>
                /*eslint-disable */
                regex = new RegExp('^([^<]*)\<' + REGEX_EMAIL + '\>$', 'i');
                /*eslint-enable */
                match = input.match(regex);
                if (match) {
                    return !Object.hasOwnProperty.call(this.options, match[2]);
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
    },

    initWidgetCreation: function() {
        var self = this;

        for (var i = 1; i <= countlyWidgets.barColors.length; i++) {
            $("#bar-colors").find(".color[data-color=" + i + "]").css({backgroundColor: countlyWidgets.barColors[i - 1]});
        }

        $("#widget-types").on("click", ".opt:not(.disabled)", function() {
            $("#widget-types").find(".opt").removeClass("selected");
            $(this).addClass("selected");

            var selWidgetType = $("#widget-types").find(".opt.selected").data("widget-type"),
                selDataType = $("#data-types").find(".opt.selected").data("data-type");

            resetMetrics();
            self.widgetDrawer.resetPluginWidgets();
            self.widgetDrawer.init(selWidgetType, selDataType);

            $("#widget-drawer").trigger("cly-widget-section-complete");
        });

        $("#data-types").off("click").on("click", ".opt:not(.disabled)", function() {
            $("#data-types").find(".opt").removeClass("selected");
            $(this).addClass("selected");

            var selWidgetType = $("#widget-types").find(".opt.selected").data("widget-type"),
                selDataType = $("#data-types").find(".opt.selected").data("data-type");

            initBreakdowns();
            resetMetrics();
            self.widgetDrawer.resetPluginWidgets();
            self.widgetDrawer.init(selWidgetType, selDataType);

            $("#widget-drawer").trigger("cly-widget-section-complete");
        });

        $("#bar-colors").off("click").on("click", ".color", function() {
            $("#bar-colors").find(".color").removeClass("selected");
            $(this).addClass("selected");

            $("#widget-drawer").trigger("cly-widget-section-complete");
        });

        $("#app-count").off("click").on("click", ".check", function() {
            $("#app-count").find(".check").removeClass("selected");
            $(this).addClass("selected");

            var selWidgetType = $("#widget-types").find(".opt.selected").data("widget-type"),
                selDataType = $("#data-types").find(".opt.selected").data("data-type");

            resetEvents();
            resetApps();
            self.widgetDrawer.init(selWidgetType, selDataType);

            $("#widget-drawer").trigger("cly-widget-section-complete");
        });

        $("#multi-app-dropdown").on("cly-multi-select-change", function(e, selected) {
            if (selected && selected.length) {
                countlyDashboards.getEventsForApps(selected, function(eventData) {
                    $("#multi-event-dropdown").clyMultiSelectSetItems(eventData);
                });

                $("#widget-drawer").trigger("cly-widget-section-complete");
            }
            else {
                $("#multi-event-dropdown").clyMultiSelectClearSelection();
            }
        });

        $("#widget-title-checkbox, #widget-section-widget-title .label span").on("click", function() {
            var check = $("#widget-title-checkbox").hasClass("fa-check-square");
            if (check) {
                $("#widget-title-checkbox").removeClass('fa-check-square').addClass('fa-square-o');
                $("#widget-name").hide();
            }
            else {
                $("#widget-title-checkbox").removeClass('fa-square-o').addClass('fa-check-square');
                $("#widget-name").show();
            }

            $("#widget-drawer").trigger("cly-widget-section-complete");
        });

        $("#widget-custom-period-checkbox, #widget-section-custom-period .label span").on("click", function() {
            var check = $("#widget-custom-period-checkbox").hasClass("fa-check-square");
            if (check) {
                $("#widget-custom-period-checkbox").removeClass('fa-check-square').addClass('fa-square-o');
                $("#custom-period-selector-block").hide();
            }
            else {
                $("#widget-custom-period-checkbox").removeClass('fa-square-o').addClass('fa-check-square');
                $("#custom-period-selector-block").show();
            }

            $("#widget-drawer").trigger("cly-widget-section-complete");
        });

        $("#widget-name").on("keyup", function() {
            $("#widget-drawer").trigger("cly-widget-section-complete");
        });

        $("#font-size").on("keyup", function() {
            $("#widget-drawer").trigger("cly-widget-section-complete");
        });

        $("#single-app-dropdown").on("cly-select-change", function(e, selected) {
            if (selected) {
                countlyDashboards.getEventsForApps([selected], function(eventData) {
                    $("#single-event-dropdown").clySelectSetItems(eventData);
                    var selectedWidgetType = $("#widget-types").find(".opt.selected").data("widget-type");
                    if (selectedWidgetType === "time-series") {
                        $("#multi-event-dropdown").clyMultiSelectSetItems(eventData);
                    }
                });

                initBreakdowns();

                $("#widget-drawer").trigger("cly-widget-section-complete");
            }
        });

        $("#single-event-dropdown").on("cly-select-change", function(e, selected) {
            if (selected) {
                $("#widget-breakdown").clySelectSetSelection("", jQuery.i18n.prop("dashboards.select-breakdown"));

                countlyDashboards.getSegmentsForEvent(selected, function(segmentData) {
                    $("#widget-breakdown").clySelectSetItems(segmentData);
                });

                $("#widget-drawer").trigger("cly-widget-section-complete");
            }
        });

        $("#multi-event-dropdown").on("cly-multi-select-change", function(e, selected) {
            var selectedWidgetType = $("#widget-types").find(".opt.selected").data("widget-type");
            if (selectedWidgetType === "time-series" &&
                ($("#app-count").find(".check.selected").data("from") === "single-app")) {
                if (selected) {
                    if (selected.length > 1) {
                        $("#widget-section-single-metric").show();
                        $("#widget-section-multi-metric").hide();
                    }
                    else {
                        $("#widget-section-single-metric").hide();
                        $("#widget-section-multi-metric").show();
                    }
                }
            }
        });

        $("#single-metric-dropdown, #widget-breakdown").on("cly-select-change", function() {
            $("#widget-drawer").trigger("cly-widget-section-complete");
        });

        $("#multi-metric-dropdown, #multi-event-dropdown, #multi-text-decor-dropdown").on("cly-multi-select-change", function() {
            $("#widget-drawer").trigger("cly-widget-section-complete");
        });

        $("#widget-note").on("focus", function() {
            $("#widget-drawer").trigger("cly-widget-section-complete");
        });

        $("#widget-note").on("input", function() {
            $("#widget-drawer").trigger("cly-widget-section-complete");
        });

        $("#widget-drawer").on("cly-widget-section-complete", function() {
            var settings = getWidgetSettings(),
                allGood = true;

            for (var settingsKey in settings) {
                if (!settings[settingsKey] || (_.isArray(settings[settingsKey]) && settings[settingsKey].length === 0)) {
                    allGood = false;
                }
            }

            if (allGood) {
                $("#create-widget").removeClass("disabled");
                $("#save-widget").removeClass("disabled");
            }
            else {
                $("#create-widget").addClass("disabled");
                $("#save-widget").addClass("disabled");
            }
        });

        $("#create-widget").off("click").on("click", function() {
            if ($(this).hasClass("disabled")) {
                return;
            }

            $("#widget-drawer").removeClass("open");

            countlyWidgets.create(self._dashboardId, getWidgetSettings());

            var dashboardMeta = countlyDashboards.getDashboard(self._dashboardId);

            $("#dashboard-name").text(dashboardMeta.name);

            // Scroll to the newly added widget
            var lastWidget = $(".grid-stack-item:visible").last();

            if (lastWidget && lastWidget.offset()) {
                $('html, body').animate({
                    scrollTop: lastWidget.offset().top + lastWidget.outerHeight()
                }, 1000);
            }
        });

        $("#save-widget").off("click").on("click", function() {
            if ($(this).hasClass("disabled")) {
                return;
            }

            $("#widget-drawer").removeClass("open");
            $(".grid-stack-item").removeClass("marked-for-editing");

            var widgetSettings = getWidgetSettings();
            if (!widgetSettings.title) {
                widgetSettings.title = "";
            }

            if (!widgetSettings.custom_period) {
                widgetSettings.custom_period = "";
            }

            if (!widgetSettings.isPluginWidget && !widgetSettings.events) {
                //This solves a corner case when someone edits a widget which previously had events data type
                //But now he changes the data type of the widget to something else
                //Set events to empty
                widgetSettings.events = [];
            }

            countlyWidgets.update(self._dashboardId, $(this).data("widget-id"), widgetSettings);
        });

        /**
         * Function to get widget settings
         * @returns {Object} widget settings
         */
        function getWidgetSettings() {
            var widgetType = $("#widget-types").find(".opt.selected").data("widget-type"),
                dataType = $("#data-types").find(".opt.selected").data("data-type"),
                customTitle = $("#widget-title-checkbox").hasClass("fa-check-square"),
                customPeriodSelected = $("#widget-custom-period-checkbox").hasClass("fa-check-square"),
                widgetTitle = $("#widget-name").val();

            var settings = {
                widget_type: widgetType
            };

            if (customTitle) {
                settings.title = widgetTitle;
            }

            if (customPeriodSelected) {
                var customPeriod = "";
                if (DashbaordsCustomPeriod.customPeriodPicker.selectedPeriod) {
                    customPeriod = DashbaordsCustomPeriod.customPeriodPicker.selectedPeriod.valueAsString || "";
                }
                settings.custom_period = customPeriod;
            }

            nonPluginwidgetSettings();
            pluginWidgetSettings();

            return settings;

            /**
             * Function to get plugin widget settings
             */
            function pluginWidgetSettings() {
                var widgetCallbacks = app.getWidgetCallbacks()[widgetType];

                if (!widgetCallbacks) {
                    return;
                }

                var widgetSettings = widgetCallbacks.settings() || {};
                widgetSettings.isPluginWidget = true;
                for (var key in widgetSettings) {
                    settings[key] = widgetSettings[key];
                }
            }

            /**
             * Function to get non plugin settings
             */
            function nonPluginwidgetSettings() {
                var $singleAppDrop = $("#single-app-dropdown"),
                    $multiAppDrop = $("#multi-app-dropdown"),
                    $singleMetricDrop = $("#single-metric-dropdown"),
                    $multiMetricDrop = $("#multi-metric-dropdown"),
                    $singleEventDrop = $("#single-event-dropdown"),
                    $multiEventDrop = $("#multi-event-dropdown"),
                    $singleBreakdownDrop = $("#widget-breakdown"),
                    $multiTextDecor = $("#multi-text-decor-dropdown");

                var selectedApp = $singleAppDrop.clySelectGetSelection(),
                    selectedMetric = $singleMetricDrop.clySelectGetSelection(),
                    selectedEvent = $singleEventDrop.clySelectGetSelection(),
                    selectedBreakdown = $singleBreakdownDrop.clySelectGetSelection();

                switch (widgetType) {
                case "time-series":
                    var isSingleApp = ($("#app-count").find(".check.selected").data("from") === "single-app");

                    settings.data_type = dataType;
                    if (isSingleApp) {
                        settings.apps = (selectedApp) ? [ selectedApp ] : [];
                        settings.metrics = $multiMetricDrop.clyMultiSelectGetSelection();
                    }
                    else {
                        settings.apps = $multiAppDrop.clyMultiSelectGetSelection();
                        settings.metrics = (selectedMetric) ? [ selectedMetric ] : [];
                    }

                    if (dataType === "event") {
                        settings.events = $multiEventDrop.clyMultiSelectGetSelection();
                        if ((settings.events.length > 1) || !isSingleApp) {
                            settings.metrics = (selectedMetric) ? [ selectedMetric ] : [];
                        }
                        else {
                            settings.metrics = $multiMetricDrop.clyMultiSelectGetSelection();
                        }
                    }
                    break;
                case "bar-chart":
                    settings.data_type = dataType;
                    settings.apps = (selectedApp) ? [ selectedApp ] : [];
                    settings.breakdowns = (selectedBreakdown) ? [ selectedBreakdown ] : [];
                    settings.metrics = (selectedMetric) ? [ selectedMetric ] : [];
                    settings.bar_color = $("#bar-colors").find(".color.selected").data("color");

                    if (dataType === "event") {
                        settings.events = (selectedEvent) ? [ selectedEvent ] : [];
                    }
                    break;
                case "number":
                    settings.data_type = dataType;
                    settings.apps = (selectedApp) ? [ selectedApp ] : [];
                    settings.metrics = (selectedMetric) ? [ selectedMetric ] : [];

                    if (dataType === "event") {
                        settings.events = (selectedEvent) ? [ selectedEvent ] : [];
                    }
                    break;
                case "table":
                    settings.data_type = dataType;
                    settings.apps = (selectedApp) ? [ selectedApp ] : [];
                    settings.breakdowns = (selectedBreakdown) ? [ selectedBreakdown ] : [];
                    settings.metrics = $multiMetricDrop.clyMultiSelectGetSelection();

                    if (dataType === "event") {
                        settings.events = (selectedEvent) ? [ selectedEvent ] : [];
                    }
                    break;
                case "note":
                    settings.content = $('#widget-note').val();
                    settings.apps = '*';
                    settings.font_size = $("#font-size").val();
                    settings.bar_color = $("#bar-colors").find(".color.selected").data("color");
                    settings.text_decoration = $multiTextDecor.clyMultiSelectGetSelection();

                    if (!settings.text_decoration || !settings.text_decoration.length) {
                        settings.text_decoration = ["none"];
                    }
                    break;
                }
            }
        }

        /**
         * Function to reset metrics
         */
        function resetMetrics() {
            $("#single-metric-dropdown").clySelectSetSelection("", jQuery.i18n.prop("dashboards.select-metric-single"));
            $("#multi-metric-dropdown").clyMultiSelectClearSelection();
        }

        /**
         * Function to reset events
         */
        function resetEvents() {
            $("#multi-event-dropdown").clyMultiSelectClearSelection();
        }

        /**
         * Function to reset apps
         */
        function resetApps() {
            $("#multi-app-dropdown").clyMultiSelectClearSelection();
            $("#single-app-dropdown").clySelectSetSelection("", jQuery.i18n.prop("dashboards.select-applications-single"));
        }

        /**
         * Function to init breakdowns
         */
        function initBreakdowns() {
            $("#widget-breakdown").clySelectSetSelection("", jQuery.i18n.prop("dashboards.select-breakdown"));

            var selDataType = $("#data-types").find(".opt.selected").data("data-type");

            if (selDataType === "session") {
                var selectedApp = $("#single-app-dropdown").clySelectGetSelection();
                $("#widget-breakdown").clySelectSetItems(countlyDashboards.getSessionBreakdowns(selectedApp));
            }
            else if (selDataType === "event") {
                var selectedEvent = $("#single-event-dropdown").clySelectGetSelection();

                countlyDashboards.getSegmentsForEvent(selectedEvent, function(segmentData) {
                    $("#widget-breakdown").clySelectSetItems(segmentData);
                });
            }
        }

        //Initialise the custom period picker
        DashbaordsCustomPeriod.init();

        self.widgetDrawer.init("time-series", "session");
    },
    initGrid: function() {
        var self = this;
        var $grid = $('.grid-stack');

        var gridStackOptions = {
            cellHeight: 100,
            verticalMargin: 20,
            animate: true,
            draggable: {
                //grid: [120, 120],
                //snapTolerance: 100,
                //snapMode: "outer",
                //refreshPositions: false
            }
        };

        $grid.gridstack(gridStackOptions);

        $grid.on('resizestart', function(event) {
            var $element = $(event.target),
                widgetType = $element.data("type");

            $element.resize(function() {
                var height = $element.outerHeight();
                // var width = $element.outerWidth();

                switch (widgetType) {
                case "number":
                    $element.find(".cly-widget").removeClass("small-height");

                    $(".spark").sparkline('html', {
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
                    });

                    if (height < 300) {
                        $element.find(".cly-widget").addClass("small-height");
                    }

                    break;
                }
            });
        });

        $grid.on('resizestop', function(event) {
            var element = event.target;

            $(element).off("resize");
        });

        $grid.on('resizestop', function(event) {
            var element = event.target;

            setTimeout(function() {
                var dashboardId = $(element).data("dashboard-id"),
                    widgetId = $(element).data("widget-id"),
                    size = [parseInt($(element).attr("data-gs-width")), parseInt($(element).attr("data-gs-height"))];

                $.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.w + "/dashboards/update-widget",
                    data: {
                        "dashboard_id": dashboardId,
                        "widget_id": widgetId,
                        "widget": JSON.stringify({ size: size })
                    },
                    success: function(result) {
                        if (result && result.error) {
                            if (result.dashboard_access_denied) {
                                self.accessDeniedPopup();
                            }
                            return;
                        }
                    }
                });
            }, 1000);
        });

        $grid.on('dragstop', function() {
            setTimeout(function() {
                $('.grid-stack').find(".grid-stack-item").each(function(i, el) {
                    var dashboardId = $(el).data("dashboard-id"),
                        widgetId = $(el).data("widget-id"),
                        position = [parseInt($(el).attr("data-gs-x")), parseInt($(el).attr("data-gs-y"))];

                    $.ajax({
                        type: "GET",
                        url: countlyCommon.API_PARTS.data.w + "/dashboards/update-widget",
                        data: {
                            "dashboard_id": dashboardId,
                            "widget_id": widgetId,
                            "widget": JSON.stringify({ position: position })
                        },
                        success: function(result) {
                            if (result && result.error) {
                                if (result.dashboard_access_denied) {
                                    self.accessDeniedPopup();
                                }
                                return;
                            }
                        }
                    });
                });
            }, 1000);
        });
    },
    getGrid: function() {
        return $('.grid-stack').data('gridstack');
    },
    populateDashboardList: function() {
        var dashboards = countlyDashboards.getAllDashboards(),
            $dashboardSelectionList = $("#dashboard-selection").find(".list");

        $dashboardSelectionList.html("");

        for (var i = 0; i < dashboards.length; i++) {
            $dashboardSelectionList.append("<a class='item searchable' title='" + dashboards[i].name + "' href='dashboard#/custom/" + dashboards[i].id + "'>" + dashboards[i].name + "</a>");
        }

        if (dashboards.length === 0) {
            $("#dashboard-selection").find(".search").hide();
        }
        else {
            $("#dashboard-selection").find(".search").show();
        }
    },
    getDashboardSettings: function() {
        var settings = {
            name: $("#dashboard-name-input").val(),
            share_with: $("#share-with").find(".check.selected").data("share-with")
        };

        var $userGroupsEdit = $("#multi-user-group-edit-dropdown");
        var $userGroupsView = $("#multi-user-group-view-dropdown");

        var emailsView = [];
        var emailsEdit = [];
        var userGroupsEdit = $userGroupsEdit.length ? $userGroupsEdit.clyMultiSelectGetSelection() : [];
        var userGroupsView = $userGroupsView.length ? $userGroupsView.clyMultiSelectGetSelection() : [];

        $("#email-share-with-edit  :selected").each(function() {
            emailsEdit.push($(this).val());
        });

        $("#email-share-with-view  :selected").each(function() {
            emailsView.push($(this).val());
        });

        if (this.isSharingAllowed) {
            if (settings.share_with === "selected-users") {
                settings.shared_email_view = emailsView;

                settings.shared_email_edit = emailsEdit;

                if (this.isGroupSharingAllowed) {
                    settings.shared_user_groups_edit = userGroupsEdit;
                    settings.shared_user_groups_view = userGroupsView;
                }
            }
        }

        settings.theme = $("#dashboard-themes").find(".theme.selected").data("theme");

        return settings;
    },
    loadDashboardSettings: function(duplicate) {
        var self = this;
        var dashboardMeta = countlyDashboards.getDashboard(this._dashboardId),
            dName = dashboardMeta.name,
            dSharedEdit = dashboardMeta.shared_with_edit_info || [],
            dSharedView = dashboardMeta.shared_with_view_info || [],
            dSharedUserGroupsEdit = dashboardMeta.shared_user_groups_edit || [],
            dSharedUserGroupsView = dashboardMeta.shared_user_groups_view || [],
            dTheme = dashboardMeta.theme || 1,
            shareWith = dashboardMeta.share_with;

        $("#dashboard-name-input").val(dName);

        if (duplicate) {
            //Incase of duplicate dashboard set shareWith to none if sharing not allowed
            if (!this.isSharingAllowed) {
                shareWith = "none";
            }
        }

        if (shareWith === "selected-users") {
            $("#share-with").find(".check[data-share-with=selected-users]").trigger("click");
        }
        else if (shareWith === "all-users") {
            $("#share-with").find(".check[data-share-with=all-users]").trigger("click");
        }
        else if (shareWith === "none") {
            $("#share-with").find(".check[data-share-with=none]").trigger("click");
        }

        var i = 0;
        if (dSharedEdit.length) {
            if (self.emailEditInput && self.emailEditInput.length > 0) {
                var emailsEdit = [];
                for (i = 0; i < dSharedEdit.length; i++) {
                    (self.emailEditInput[0]).selectize.addOption({ "name": dSharedEdit[i].full_name || "", "email": dSharedEdit[i].email });
                    emailsEdit.push(dSharedEdit[i].email);
                }
                (self.emailEditInput[0]).selectize.setValue(emailsEdit, false);
            }
        }

        if (dSharedView.length) {
            if (self.emailViewInput && self.emailViewInput.length > 0) {
                var emailsView = [];
                for (i = 0; i < dSharedView.length; i++) {
                    (self.emailViewInput[0]).selectize.addOption({ "name": dSharedView[i].full_name || "", "email": dSharedView[i].email });
                    emailsView.push(dSharedView[i].email);
                }
                (self.emailViewInput[0]).selectize.setValue(emailsView, false);
            }
        }

        if (!dashboardMeta.is_owner) {
            if (self.emailEditInput && self.emailEditInput.length > 0) {
                (self.emailEditInput[0]).selectize.disable();
            }

            if (self.emailViewInput && self.emailViewInput.length > 0) {
                (self.emailViewInput[0]).selectize.disable();
            }

            (self.emailEditInput[0]).selectize.settings.placeholder = jQuery.i18n.map["dashbaords.add-edit-disabled"];
            (self.emailViewInput[0]).selectize.settings.placeholder = jQuery.i18n.map["dashbaords.add-edit-disabled"];
            (self.emailEditInput[0]).selectize.updatePlaceholder();
            (self.emailViewInput[0]).selectize.updatePlaceholder();

            $("#share-with").parent(".section").find("> .description").show();
            $("#share-with").addClass("disabled");
        }

        if (this.isGroupSharingAllowed) {
            var groups = _.sortBy(groupsModel.data(), 'name');
            var editGroups = [];
            var viewGroups = [];

            for (i = 0; i < dSharedUserGroupsEdit.length; i++) {
                var editGroup = groups.filter(function(g) {
                    return g._id === dSharedUserGroupsEdit[i];
                });

                if (editGroup.length) {
                    editGroups.push({
                        "name": editGroup[0].name,
                        "value": editGroup[0]._id
                    });
                }
            }

            for (i = 0; i < dSharedUserGroupsView.length; i++) {
                var viewGroup = groups.filter(function(g) {
                    return g._id === dSharedUserGroupsView[i];
                });

                if (viewGroup.length) {
                    viewGroups.push({
                        "name": viewGroup[0].name,
                        "value": viewGroup[0]._id
                    });
                }
            }

            if (editGroups.length) {
                $("#multi-user-group-edit-dropdown").clyMultiSelectSetSelection(editGroups);
            }

            if (viewGroups.length) {
                $("#multi-user-group-view-dropdown").clyMultiSelectSetSelection(viewGroups);
            }
        }

        var $dashboardThemes = $("#dashboard-themes");

        $dashboardThemes.find(".theme").removeClass("selected");
        $dashboardThemes.find(".theme[data-theme=" + dTheme + "]").addClass("selected");
    },
    loadWidgetSettings: function(widgetId) {
        var widgetSettings = countlyDashboards.getWidget(widgetId);
        this.widgetDrawer.set(widgetSettings);
        this.widgetDrawer.init(widgetSettings.widget_type, widgetSettings.data_type);
    },
    resetDashboardDrawer: function() {
        var self = this;
        $("#dashboard-name-input").val("");
        $("#dashboard-drawer").removeClass("duplicate");
        if (self.emailEditInput && self.emailEditInput.length > 0) {
            (self.emailEditInput[0]).selectize.clearOptions();
            (self.emailEditInput[0]).selectize.setValue([], false);
            (self.emailEditInput[0]).selectize.enable();
        }

        if (self.emailViewInput && self.emailViewInput.length > 0) {
            (self.emailViewInput[0]).selectize.clearOptions();
            (self.emailViewInput[0]).selectize.setValue([], false);
            (self.emailViewInput[0]).selectize.enable();
        }

        (self.emailEditInput[0]).selectize.settings.placeholder = jQuery.i18n.map["dashboards.select-users"];
        (self.emailViewInput[0]).selectize.settings.placeholder = jQuery.i18n.map["dashboards.select-users"];
        (self.emailEditInput[0]).selectize.updatePlaceholder();
        (self.emailViewInput[0]).selectize.updatePlaceholder();

        var sharing = this.isSharingAllowed;

        if (this.isGroupSharingAllowed) {
            var groups = _.sortBy(groupsModel.data(), 'name');

            var userGroups = groups.map(function(g) {
                return {
                    name: g.name,
                    value: g._id
                };
            });

            $("#multi-user-group-edit-dropdown").clyMultiSelectSetItems(userGroups);
            $("#multi-user-group-view-dropdown").clyMultiSelectSetItems(userGroups);
            $("#multi-user-group-edit-dropdown").clyMultiSelectClearSelection();
            $("#multi-user-group-view-dropdown").clyMultiSelectClearSelection();

            if (!sharing) {
                $("#multi-user-group-edit-dropdown").addClass("disabled");
                $("#multi-user-group-view-dropdown").addClass("disabled");
            }
        }
        else {
            $("#multi-user-group-edit-dropdown").parent(".section").remove();
            $("#multi-user-group-view-dropdown").parent(".section").remove();
        }

        if (!sharing) {
            if (self.emailEditInput && self.emailEditInput.length > 0) {
                (self.emailEditInput[0]).selectize.disable();
            }

            if (self.emailViewInput && self.emailViewInput.length > 0) {
                (self.emailViewInput[0]).selectize.disable();
            }
            (self.emailEditInput[0]).selectize.settings.placeholder = jQuery.i18n.map["dashbaords.add-edit-disabled"];
            (self.emailViewInput[0]).selectize.settings.placeholder = jQuery.i18n.map["dashbaords.add-edit-disabled"];
            (self.emailEditInput[0]).selectize.updatePlaceholder();
            (self.emailViewInput[0]).selectize.updatePlaceholder();

            $("#share-with").find(".check[data-share-with=none]").trigger("click");
            $("#share-with").parent(".section").find("> .description").show();
            $("#share-with").addClass("disabled");
        }
        else {
            $("#share-with").parent(".section").find("> .description").hide();
            $("#share-with").removeClass("disabled");
            $("#share-with").find(".check[data-share-with=all-users]").trigger("click");
        }

        var $dashboardThemes = $("#dashboard-themes");

        $dashboardThemes.find(".theme").removeClass("selected");
        $dashboardThemes.find(".theme[data-theme=1]").addClass("selected");
    },
    refresh: function() {
        var self = this;

        if (!self._dashHasData) {
            //Dont refresh until we have a one run with data on dashbaord
            return;
        }

        if (self._dashboardId && $("#top-bar").find(".left-menu .dropdown").hasClass("clicked") === false && $(".marked-for-deletion").length === 0) {
            self.orchestrator(true);
        }
    },
    widgetDrawer: {
        init: function(widgetType, dataType) {
            initNonPluginWidgets();
            this.initPluginWidgets();

            /**
             * Function to init non plugin widgets
             */
            function initNonPluginWidgets() {
                $("#data-types").parent(".section").show();
                $("#widget-section-widget-title").show();
                $("#widget-section-custom-period").show();

                if (widgetType === "bar-chart" || widgetType === "table") {
                    if (dataType === "push" || dataType === "crash") {
                        $("#data-types").find(".opt").removeClass("selected");
                        $("#data-types").find(".opt[data-data-type=session]").addClass("selected");
                        dataType = "session";
                    }

                    $("#data-types").find(".opt[data-data-type=push]").addClass("disabled");
                    $("#data-types").find(".opt[data-data-type=crash]").addClass("disabled");
                }
                else {
                    $("#data-types").find(".opt[data-data-type=push]").removeClass("disabled");
                    $("#data-types").find(".opt[data-data-type=crash]").removeClass("disabled");
                }

                if (!$("#widget-types").find(".opt[data-widget-type=" + widgetType + "]").hasClass("selected")) {
                    $("#widget-types").find(".opt").removeClass("selected");
                    $("#widget-types").find(".opt[data-widget-type=" + widgetType + "]").addClass("selected");
                }

                if (!$("#data-types").find(".opt[data-data-type=" + dataType + "]").hasClass("selected")) {
                    $("#data-types").find(".opt").removeClass("selected");
                    $("#data-types").find(".opt[data-data-type=" + dataType + "]").addClass("selected");
                }

                var apps = [];

                for (var appId in countlyGlobal.apps) {
                    apps.push({value: appId, name: countlyGlobal.apps[appId].name});
                }

                $("#single-app-dropdown").clySelectSetItems(apps);
                $("#multi-app-dropdown").clyMultiSelectSetItems(apps);

                var metrics = countlyDashboards.getMetrics(dataType);

                $("#multi-metric-dropdown").clyMultiSelectSetItems(metrics);
                $("#single-metric-dropdown").clySelectSetItems(metrics);

                var textDecorations = countlyDashboards.getTextDecorations();
                $("#multi-text-decor-dropdown").clyMultiSelectSetItems(textDecorations);

                var $appCount = $("#widget-section-app-count"),
                    $multiApp = $("#widget-section-multi-app"),
                    $singleApp = $("#widget-section-single-app"),
                    $multiEvent = $("#widget-section-multi-event"),
                    $singleEvent = $("#widget-section-single-event"),
                    $breakdown = $("#widget-section-breakdown"),
                    $multiMetric = $("#widget-section-multi-metric"),
                    $singleMetric = $("#widget-section-single-metric"),
                    $barColor = $("#widget-section-bar-color"),
                    $note = $("#widget-section-note"),
                    $fontSize = $("#widget-section-font-size"),
                    $textDecoration = $("#widget-section-text-decoration");

                var showArr = [];

                $barColor.find(".label").text(jQuery.i18n.map["dashboards.bar-color"]);

                switch (widgetType) {
                case "time-series":
                    showArr.push($appCount);

                    var isSingleApp = ($("#app-count").find(".check.selected").data("from") === "single-app");

                    if (dataType === "event") {
                        if (isSingleApp) {
                            showArr.push($singleApp, $multiEvent, $multiMetric);
                        }
                        else {
                            showArr.push($multiApp, $multiEvent, $singleMetric);
                        }
                    }
                    else {
                        if (isSingleApp) {
                            showArr.push($singleApp, $multiMetric);
                        }
                        else {
                            showArr.push($multiApp, $singleMetric);
                        }
                    }
                    break;
                case "bar-chart":
                    showArr.push($singleApp, $breakdown, $singleMetric, $barColor);

                    if (dataType === "event") {
                        showArr.push($singleEvent);
                    }
                    break;
                case "number":
                    showArr.push($singleApp, $singleMetric);

                    if (dataType === "event") {
                        showArr.push($singleEvent);
                    }
                    break;
                case "table":
                    showArr.push($singleApp, $breakdown, $multiMetric);

                    if (dataType === "event") {
                        showArr.push($singleEvent);
                    }
                    break;
                case "note":
                    $("#widget-drawer .details #data-types").parent(".section").hide();
                    $("#widget-section-widget-title").hide();
                    $("#widget-section-custom-period").hide();
                    $barColor.find(".label").text(jQuery.i18n.map["dashboards.select-color"]);
                    showArr.push($note, $barColor, $fontSize, $textDecoration);
                    break;
                }

                $("#widget-drawer").find(".section.settings").hide();

                for (var i = 0; i < showArr.length; i++) {
                    showArr[i].show();
                }
            }
        },
        set: function(widgetSettings) {
            var widgetType = widgetSettings.widget_type,
                customPeriod = widgetSettings.custom_period,
                title = widgetSettings.title,
                self = this;

            var $widgetTypes = $("#widget-types"),
                $titleCheckbox = $("#widget-title-checkbox"),
                $customPeriodCheckbox = $("#widget-custom-period-checkbox"),
                $widgetTitle = $("#widget-name");

            $widgetTypes.find(".opt").removeClass("selected");
            $widgetTypes.find(".opt[data-widget-type=" + widgetType + "]").addClass("selected");

            if (title) {
                $titleCheckbox.removeClass('fa-square-o').addClass('fa-check-square');
                $widgetTitle.show();
                $widgetTitle.val(title);
            }

            if (customPeriod) {
                $customPeriodCheckbox.removeClass('fa-square-o').addClass('fa-check-square');
                var customPeriodObj = countlyCommon.convertToTimePeriodObj(customPeriod);
                DashbaordsCustomPeriod.customPeriodPicker.selectedPeriod = customPeriodObj;
                $("#custom-period-selector-block").show();
            }

            if (widgetSettings.content) {
                $("#widget-note").val(widgetSettings.content);
            }
            if (widgetSettings.isPluginWidget) {
                this.setPluginWidgets(widgetSettings);
            }
            else {
                setNonPluginWidgets();
            }

            /**
             * Function to set non plugin widgets
             */
            function setNonPluginWidgets() {
                var dataType = widgetSettings.data_type,
                    apps = widgetSettings.apps,
                    metrics = widgetSettings.metrics,
                    events = widgetSettings.events,
                    breakdowns = widgetSettings.breakdowns,
                    barColor = widgetSettings.bar_color,
                    fontSize = widgetSettings.font_size,
                    textDecoration = widgetSettings.text_decoration;

                var $dataTypes = $("#data-types"),
                    $appCount = $("#app-count"),
                    $singleAppDrop = $("#single-app-dropdown"),
                    $multiAppDrop = $("#multi-app-dropdown"),
                    $singleMetricDrop = $("#single-metric-dropdown"),
                    $multiMetricDrop = $("#multi-metric-dropdown"),
                    $singleEventDrop = $("#single-event-dropdown"),
                    $multiEventDrop = $("#multi-event-dropdown"),
                    $singleBreakdownDrop = $("#widget-breakdown"),
                    $barColors = $("#bar-colors"),
                    $fontSize = $("#font-size"),
                    $textDecorationDrop = $("#multi-text-decor-dropdown");

                var multiSourceApps = apps.length > 1;

                if (widgetType === "time-series" && events && events.length > 1) {
                    multiSourceApps = true;
                }

                $dataTypes.find(".opt").removeClass("selected");
                $dataTypes.find(".opt[data-data-type=" + dataType + "]").addClass("selected");

                if (multiSourceApps) {
                    $appCount.find(".check[data-from=multi-app]").addClass("selected");
                    $appCount.find(".check[data-from=single-app]").removeClass("selected");
                }
                else {
                    $appCount.find(".check[data-from=multi-app]").removeClass("selected");
                    $appCount.find(".check[data-from=single-app]").addClass("selected");
                }

                var i = 0;
                if (multiSourceApps) {
                    var appNameValues = [];
                    for (i = 0; i < apps.length; i++) {
                        appNameValues.push({
                            name: countlyDashboards.getAppName(apps[i]),
                            value: apps[i]
                        });
                    }

                    $multiAppDrop.clyMultiSelectSetSelection(appNameValues);
                }
                else {
                    $singleAppDrop.clySelectSetSelection(apps[0], countlyDashboards.getAppName(apps[0]));
                }

                if (metrics) {
                    if (["time-series", "table"].indexOf(widgetType) > -1) {
                        if (multiSourceApps) {
                            $singleMetricDrop.clySelectSetSelection(metrics[0], countlyDashboards.getMetricLongName(metrics[0]));
                        }
                        else {
                            var metricNameValues = [];
                            for (i = 0; i < metrics.length; i++) {
                                metricNameValues.push({
                                    name: countlyDashboards.getMetricLongName(metrics[i]),
                                    value: metrics[i]
                                });
                            }

                            $multiMetricDrop.clyMultiSelectSetSelection(metricNameValues);
                        }
                    }
                    else {
                        $singleMetricDrop.clySelectSetSelection(metrics[0], countlyDashboards.getMetricLongName(metrics[0]));
                    }
                }

                if (events && events.length) {
                    var eventNames = {},
                        deferreds = [];

                    for (i = 0; i < events.length; i++) {
                        deferreds.push(countlyDashboards.getEventNameDfd(events[i], eventNames));
                    }

                    $.when.apply(null, deferreds).done(function() {
                        var multipleEvents = events.length > 1 || widgetType === "time-series";
                        if (multipleEvents) {
                            var eventNameValues = [];
                            for (i = 0; i < events.length; i++) {
                                eventNameValues.push({
                                    name: eventNames[events[i]],
                                    value: events[i]
                                });
                            }

                            // TODO have app name like (Ryde) next to event name
                            $multiEventDrop.clyMultiSelectSetSelection(eventNameValues);
                        }
                        else {
                            $singleEventDrop.clySelectSetSelection(events[0], eventNames[events[0]]);
                        }

                        self.setBreakdown(breakdowns, $singleBreakdownDrop, apps, dataType);
                    });
                }

                self.setBreakdown(breakdowns, $singleBreakdownDrop, apps, dataType);

                if (barColor) {
                    $barColors.find(".color").removeClass("selected");
                    $barColors.find(".color[data-color=" + barColor + "]").addClass("selected");
                }

                if (fontSize) {
                    $fontSize.val(fontSize);
                }

                if (textDecoration && textDecoration.length) {
                    var textStyles = countlyDashboards.getTextDecorations();
                    var selectedDecorations = [];
                    for (var kl = 0; kl < textDecoration.length; kl++) {
                        var d = textStyles.filter(function(td) {
                            return td.value === textDecoration[kl];
                        });

                        if (d.length) {
                            selectedDecorations.push(d[0]);
                        }
                    }

                    if (selectedDecorations && selectedDecorations.length) {
                        $textDecorationDrop.clyMultiSelectSetSelection(selectedDecorations);
                    }
                }
            }

            $("#save-widget").addClass("disabled");
        },
        reset: function() {
            resetNonPluginWidgets();
            this.resetPluginWidgets();

            /**
             * Function to reset non plugin widgets
             */
            function resetNonPluginWidgets() {
                var $widgetTypes = $("#widget-types"),
                    $dataTypes = $("#data-types"),
                    $appCount = $("#app-count"),
                    $singleAppDrop = $("#single-app-dropdown"),
                    $multiAppDrop = $("#multi-app-dropdown"),
                    $singleMetricDrop = $("#single-metric-dropdown"),
                    $multiMetricDrop = $("#multi-metric-dropdown"),
                    $singleEventDrop = $("#single-event-dropdown"),
                    $multiEventDrop = $("#multi-event-dropdown"),
                    $singleBreakdownDrop = $("#widget-breakdown"),
                    $barColors = $("#bar-colors"),
                    $titleCheckbox = $("#widget-title-checkbox"),
                    $customPeriodCheckbox = $("#widget-custom-period-checkbox"),
                    $customPeriod = $("#custom-period-selector-block"),
                    $widgetTitle = $("#widget-name"),
                    $fontSize = $("#font-size"),
                    $textDecorationDrop = $("#multi-text-decor-dropdown"),
                    $widgetNote = $("#widget-note");

                $widgetTypes.find(".opt[data-widget-type=time-series]").trigger("click");
                $dataTypes.find(".opt[data-data-type=session]").trigger("click");
                $appCount.find(".check[data-from=multi-app]").trigger("click");

                $multiAppDrop.clyMultiSelectClearSelection();
                $singleAppDrop.clySelectSetSelection("", jQuery.i18n.prop("dashboards.select-applications-single"));

                $multiMetricDrop.clyMultiSelectClearSelection();
                $singleMetricDrop.clySelectSetSelection("", jQuery.i18n.prop("dashboards.select-metric-single"));

                $multiEventDrop.clyMultiSelectClearSelection();
                $singleEventDrop.clySelectSetSelection("", jQuery.i18n.prop("dashboards.select-event-single"));

                $singleBreakdownDrop.clySelectSetSelection("", jQuery.i18n.prop("dashboards.select-breakdown"));

                $textDecorationDrop.clyMultiSelectClearSelection();

                $barColors.find(".color").removeClass("selected");
                $barColors.find(".color[data-color=1]").addClass("selected");

                $titleCheckbox.removeClass('fa-check-square').addClass('fa-square-o');
                $customPeriodCheckbox.removeClass('fa-check-square').addClass('fa-square-o');
                $widgetTitle.hide();
                $customPeriod.hide();
                DashbaordsCustomPeriod.customPeriodPicker.selectedPeriod = null;
                $widgetTitle.val("");
                $fontSize.val("15");
                $widgetNote.val("");
            }

            $("#save-widget").addClass("disabled");
        },
        initPluginWidgets: function() {
            var widgetCallbacks = app.getWidgetCallbacks();

            Object.keys(widgetCallbacks).forEach(function(widget) {
                if (widgetCallbacks[widget].init) {
                    widgetCallbacks[widget].init();
                }
            });
        },
        setPluginWidgets: function(widgetSettings) {
            var widgetCallbacks = app.getWidgetCallbacks()[widgetSettings.widget_type];

            if (!widgetCallbacks) {
                return;
            }

            widgetCallbacks.set(widgetSettings);
        },
        resetPluginWidgets: function() {
            var widgetCallbacks = app.getWidgetCallbacks();

            Object.keys(widgetCallbacks).forEach(function(widget) {
                if (widgetCallbacks[widget].reset) {
                    widgetCallbacks[widget].reset();
                }
            });
        },
        setBreakdown: function(breakdowns, $singleBreakdownDrop, apps, dataType) {
            if (breakdowns && apps.length === 1) {
                var breakdownName = breakdowns[0];

                if (dataType === "session") {
                    var sessionBreakdowns = countlyDashboards.getSessionBreakdowns(apps[0]),
                        breakdownMap = _.find(sessionBreakdowns, function(breakdown) {
                            return breakdown.value === breakdowns[0];
                        });

                    breakdownName = breakdownMap.name || breakdownName;
                }

                $singleBreakdownDrop.clySelectSetSelection(breakdowns[0], breakdownName);
            }
        }
    },
    destroy: function() {
        $("body").removeClass("dashboards-view");
        $("html").alterClass('theme-*', '');
        $("#custom-dashboard").html("");
        $("#hide-sidebar-button").show();
    },
    accessDeniedPopup: function() {
        if ($(".dialog.popStyleGreen").length) {
            return;
        }
        $(".dialog.popStyleGreen").remove();
        CountlyHelpers.confirm(jQuery.i18n.map["dashboards.access-denied"], "popStyleGreen", function(result) {
            if (!result) {
                return;
            }
            app.navigate("", true);
        }, [], { title: jQuery.i18n.map["dashbaords.access-denied-title"] });
    },
    editAccessDeniedPopup: function() {
        if ($(".dialog.popStyleGreen").length) {
            return;
        }
        $(".dialog.popStyleGreen").remove();
        CountlyHelpers.confirm(jQuery.i18n.map["dashboards.edit-access-denied"], "popStyleGreen", function() {
            return;
        }, [], { title: jQuery.i18n.map["dashbaords.access-denied-title"] });
    },
    sharingDeniedPopup: function() {
        if ($(".dialog.popStyleGreen").length) {
            return;
        }
        $(".dialog.popStyleGreen").remove();
        CountlyHelpers.confirm(jQuery.i18n.map["dashboards.sharing-denied"], "popStyleGreen", function() {
            return;
        }, [], { title: jQuery.i18n.map["dashbaords.access-denied-title"] });
    },
    orchestrator: function(isRefresh) {
        //Fetching both client side widget data and server side widget data simultanously
        //Render common will be called immediately after above ajax calls, it wont wait for
        //following requests to finish.
        //Once the load dashbaord callfinishes, we could have simply called widgets individual create
        //function but not doing that incase widget data in the client is state,
        //load dashbaord will return new widgets and we will add them aswell.
        //Without dashData, we show the loader on each widget.
        //Dashboard data can only be stale when dashboard data is fetched before load dashboard from
        //a different view other than dashboards

        var self = this;

        $.when(countlyDashboards.loadDashboard(self._dashboardId, isRefresh)).then(function(res) {
            if (res && res.error) {
                if (res.dashboard_access_denied) {
                    self.getGrid().removeAll();
                    $("#dashboards").attr("class", "no-widgets");
                    self.accessDeniedPopup();
                }

                return;
            }

            var allWidgets = countlyDashboards.getWidgets();
            if (!isRefresh) {
                countlyWidgets.createBatch(self._dashboardId, allWidgets, function() {
                    //Enable the grid if data present to display
                    self.getGrid().enable();

                    var dashboardMeta = countlyDashboards.getDashboard(self._dashboardId);
                    if (!dashboardMeta.is_editable) {
                        self.getGrid().disable();
                    }

                    self._dashHasData = true;
                });
            }
            else {
                countlyWidgets.refreshBatch(self._dashboardId, allWidgets);
            }
        });

        self.orchestrateWidgets();
    },

    orchestrateWidgets: function(wd) {
        var widgetCallbacks = app.getWidgetCallbacks();

        if (!wd) {
            var dashboardWidgets = countlyDashboards.getWidgets();

            if (!dashboardWidgets.length) {
                return false;
            }

            Object.keys(widgetCallbacks).forEach(function(widget) {
                var widgetData = dashboardWidgets.filter(function(w) {
                    return w.widget_type === widget;
                });

                for (var i = 0; i < widgetData.length; i++) {
                    initiateAjax(widgetData[i]);
                }
            });
        }
        else {
            initiateAjax(wd);
        }

        /**
         * Fuction to initiate the ajax call
         * @param  {Object} widget - widget data
         */
        function initiateAjax(widget) {
            var wdc = widgetCallbacks[widget.widget_type];

            if (wdc.ajax) {
                $.when(
                    wdc.ajax(widget)
                ).then(function() {
                    //We only try to create the widget from here when the orchestrator
                    //has tried creating it, because it adds the dom placeholder to the
                    //widget data, and without that we cannot create the widget

                    //Fetch the updated list of widgets and find the current widget in it.
                    //Why? - Because the updated list is used as a reference everywhere.
                    //And also because the current widget may be stale
                    var updatedDashboardWidgets = countlyDashboards.getWidgets();
                    var updatedWidget = updatedDashboardWidgets.filter(function(w) {
                        return w._id === widget.widget_id;
                    });

                    if (!updatedWidget.length) {
                        //Maybe this widget has now been removed.
                        //It was present there before the ajax was initiated, but got removed later
                        //This will keep showing loading in the widget
                        return;
                    }

                    updatedWidget = updatedWidget[0];

                    for (var key in widget) {
                        //Copy the keys from the stale widget object to the new updated widget object.
                        //Because the new updated widget object is used as a reference everywhere.
                        //Mainly this copies the dashData field and any other field added by the plugin
                        if (!updatedWidget[key]) {
                            //Updated widget will have updated placeholder - just FYI
                            updatedWidget[key] = widget[key];
                        }
                    }

                    widget = updatedWidget;

                    var stage = widget.orchestration && widget.orchestration.stage;

                    if ((["create", "refresh"].indexOf(stage) > -1) &&
                        (widget.dashData && (widget.dashData.isValid === false))) {
                        widget.placeholder = widget.placeholder || widget.orchestration.widgetEl;
                        countlyWidgets.invalidWidget(widget);
                        return;
                    }

                    if (stage === "create") {
                        //This means orchestrator tried to create the widget but couldn't
                        //because data was not available. So create it manually now.
                        wdc.create(widget, widget.orchestration.bypassPosUpdate);
                    }

                    if (stage === "refresh") {
                        //This means orchestrator tried to refresh the widget but couldn't
                        //because latest data was not available. So refresh it manually now.
                        wdc.refresh(widget.orchestration.widgetEl, widget);
                    }
                });
            }
        }
    }
});

app.customDashboardsView = new CustomDashboardsView();

app.route("/custom", '', function() {
    delete this.customDashboardsView._dashboardId;
    this.renderWhenReady(this.customDashboardsView);
});

app.route('/custom/*dashboardId', '', function(dashboardId) {
    this.customDashboardsView._dashboardId = dashboardId;
    this.renderWhenReady(this.customDashboardsView);
});

app.addWidgetCallbacks = function(widget, options) {
    //Keeping this function for backward compatibility.
    //Also donot use thif function if you want to use client fetch widget

    if (!app.dashboardsWidgetCallbacks) {
        app.dashboardsWidgetCallbacks = {};
    }

    app.dashboardsWidgetCallbacks[widget] = options;
};

app.getWidgetCallbacks = function() {
    return app.dashboardsWidgetCallbacks;
};

app.addPageScript("/custom#", function() {
    if (countlyGlobal.plugins.indexOf("reports") < 0) {
        return;
    }

    var addEmailButton = '<div id="add-report" class="item"><i class="fa fa-cog"></i><span>' + jQuery.i18n.prop("dashboards.create-email-reports") + '</span></div>';

    $("#dashboards #dashboard-top #add-widget-button-group .cly-button-menu #edit-dashboard").after(addEmailButton);

    var reportsCallbacks = app.getReportsCallbacks().reports;

    if (!reportsCallbacks) {
        return;
    }

    reportsCallbacks.initialize("#dashboards", "dashboards", function() {
        var dashboardDropdown = '<div class="section">' +
        '    <div class="label">' + jQuery.i18n.prop("dashboards.select_dashboards") + '</div>' +
        '    <div id="reports-dashboard-dropdown" class="cly-select" style="width: 100%; box-sizing: border-box;">' +
        '        <div class="select-inner">' +
        '            <div class="text-container">' +
        '                <div class="text">' +
        '                    <div class="default-text">' + jQuery.i18n.prop("dashboards.select") + '</div>' +
        '                </div>' +
        '            </div>' +
        '            <div class="right combo"></div>' +
        '        </div>' +
        '        <div class="select-items square" style="width: 100%;"></div>' +
        '    </div>' +
        '</div>';

        var reportDateRangeDropdown = '<div class="section">' +
        '    <div class="label">' + jQuery.i18n.prop("dashboards.select-report-date-range") + '</div>' +
        '    <div id="reports-dashboard-date-range-dropdown" class="cly-select" style="width: 100%; box-sizing: border-box;">' +
        '        <div class="select-inner">' +
        '            <div class="text-container">' +
        '                <div class="text">' +
        '                    <div class="default-text">' + jQuery.i18n.prop("dashboards.select-date-range") + '</div>' +
        '                </div>' +
        '            </div>' +
        '            <div class="right combo"></div>' +
        '        </div>' +
        '        <div class="select-items square" style="width: 100%;"></div>' +
        '    </div>' +
        '</div>';

        $("#reports-widget-drawer .details").prepend(dashboardDropdown);
        $("#reports-widget-drawer .details").append(reportDateRangeDropdown);

        var currentDashboardId = app.customDashboardsView._dashboardId;
        var currentDashboard = {};
        var dashboards = [];
        var dashboardsList = countlyDashboards.getAllDashboards();
        for (var i = 0; i < dashboardsList.length; i++) {
            if (!currentDashboardId) {
                break;
            }
            dashboards.push({ value: dashboardsList[i].id, name: dashboardsList[i].name });
            if (currentDashboardId.toString() === dashboardsList[i].id) {
                currentDashboard = dashboardsList[i];
                $("#add-report").on("click", selectDashFromDropdown);
            }
        }

        /**
        * Function to select dashboard from dropdown
        */
        function selectDashFromDropdown() {
            $("#reports-dashboard-dropdown").clySelectSetSelection(currentDashboard.id, currentDashboard.name);
        }

        $("#reports-dashboard-dropdown").clySelectSetItems(dashboards);
        $("#reports-dashboard-dropdown").clySelectSetSelection("", jQuery.i18n.prop("dashboards.select"));

        $("#reports-dashboard-dropdown").on("cly-select-change", function() {
            $("#reports-widget-drawer").trigger("cly-report-widget-section-complete");
        });

        $("#reports-dashboard-date-range-dropdown").clySelectSetSelection("", jQuery.i18n.prop("dashboards.select-date-range"));

        $("#reports-dashboard-date-range-dropdown").find(".select-inner").on("click", function() {
            var reportFrequency;
            if ($("#monthly-option").hasClass("selected")) {
                reportFrequency = "monthly";
            }
            else if ($("#weekly-option").hasClass("selected")) {
                reportFrequency = "weekly";
            }
            else {
                reportFrequency = "daily";
            }
            var reportDateRanges = countlyDashboards.getReportDateRanges(reportFrequency);
            $("#reports-dashboard-date-range-dropdown").clySelectSetItems(reportDateRanges);
        });

        $("#reports-dashboard-date-range-dropdown").on("cly-select-change", function() {
            $("#reports-widget-drawer").trigger("cly-report-widget-section-complete");
        });

        $("#reports-frequency").find(".check").on("click", function() {
            $("#reports-dashboard-date-range-dropdown").clySelectSetSelection("", jQuery.i18n.prop("dashboards.select-date-range"));
        });
    });
});

app.addPageScript("/manage/reports", function() {
    var dashboardDropdown = '<div class="section">' +
                                '    <div class="label">' + jQuery.i18n.prop("dashboards.select_dashboards") + '</div>' +
                                '    <div id="reports-dashboard-dropdown" class="cly-select" style="width: 100%; box-sizing: border-box;">' +
                                '        <div class="select-inner">' +
                                '            <div class="text-container">' +
                                '                <div class="text">' +
                                '                    <div class="default-text">' + jQuery.i18n.prop("dashboards.select") + '</div>' +
                                '                </div>' +
                                '            </div>' +
                                '            <div class="right combo"></div>' +
                                '        </div>' +
                                '        <div class="select-items square" style="width: 100%;"></div>' +
                                '    </div>' +
                                '</div>';

    var reportDateRangeDropdown = '<div class="section">' +
    '    <div class="label">' + jQuery.i18n.prop("dashboards.select-report-date-range") + '</div>' +
    '    <div id="reports-dashboard-date-range-dropdown" class="cly-select" style="width: 100%; box-sizing: border-box;">' +
    '        <div class="select-inner">' +
    '            <div class="text-container">' +
    '                <div class="text">' +
    '                    <div class="default-text">' + jQuery.i18n.prop("dashboards.select-date-range") + '</div>' +
    '                </div>' +
    '            </div>' +
    '            <div class="right combo"></div>' +
    '        </div>' +
    '        <div class="select-items square" style="width: 100%;"></div>' +
    '    </div>' +
    '</div>';

    var dashboardReportType = '<div data-report-type="dashboards" class="opt cly-grid-3">' +
                                '      <div class="inner">' +
                                '          <span class="icon dashboard"></span>' +
                                '          <span>' + jQuery.i18n.prop("dashboards.report") + '</span>' +
                                '      </div>' +
                                '</div>';

    $("#reports-widget-drawer .details #report-types .opts").append(dashboardReportType);
    $("#reports-widget-drawer .details").append(dashboardDropdown);
    $("#reports-widget-drawer .details").append(reportDateRangeDropdown);

    var dashboards = [];
    var dashboardsList = countlyDashboards.getAllDashboards();
    for (var i = 0; i < dashboardsList.length; i++) {
        dashboards.push({ value: dashboardsList[i].id, name: dashboardsList[i].name });
    }

    $("#reports-dashboard-dropdown").clySelectSetItems(dashboards);
    $("#reports-dashboard-dropdown").clySelectSetSelection("", jQuery.i18n.prop("dashboards.select"));

    $("#reports-dashboard-dropdown").on("cly-select-change", function() {
        $("#reports-widget-drawer").trigger("cly-report-widget-section-complete");
    });

    $("#reports-dashboard-date-range-dropdown").clySelectSetSelection("", jQuery.i18n.prop("dashboards.select-date-range"));

    $("#reports-dashboard-date-range-dropdown").find(".select-inner").on("click", function() {
        var reportFrequency;
        if ($("#monthly-option").hasClass("selected")) {
            reportFrequency = "monthly";
        }
        else if ($("#weekly-option").hasClass("selected")) {
            reportFrequency = "weekly";
        }
        else {
            reportFrequency = "daily";
        }
        var reportDateRanges = countlyDashboards.getReportDateRanges(reportFrequency);
        $("#reports-dashboard-date-range-dropdown").clySelectSetItems(reportDateRanges);
    });

    $("#reports-dashboard-date-range-dropdown").on("cly-select-change", function() {
        $("#reports-widget-drawer").trigger("cly-report-widget-section-complete");
    });

    $("#reports-frequency").find(".check").on("click", function() {
        $("#reports-dashboard-date-range-dropdown").clySelectSetSelection("", jQuery.i18n.prop("dashboards.select-date-range"));
    });
});

var reportsOptions = {
    ajax: function() {
        return $.when(countlyDashboards.getAllDashboardsAjax()).done(function() {});
    },

    init: function() {
        $("#reports-dashboard-dropdown").closest(".section").show();
        $("#reports-dashboard-date-range-dropdown").closest(".section").show();
    },

    settings: function() {
        var settings = {
            dashboards: $('#reports-dashboard-dropdown').clySelectGetSelection(),
            date_range: $("#reports-dashboard-date-range-dropdown").clySelectGetSelection()
        };

        return settings;
    },

    reset: function() {
        $("#reports-dashboard-dropdown").clySelectSetSelection("", jQuery.i18n.prop("dashboards.select"));
        $("#reports-dashboard-date-range-dropdown").clySelectSetSelection("", jQuery.i18n.prop("dashboards.select-date-range"));
    },

    set: function(reportData) {
        var dashboardSelected, dateRangeSelected;
        var dashboardsList = countlyDashboards.getAllDashboards();
        var reportFrequency = reportData.frequency || "daily";
        var reportDateRanges = countlyDashboards.getReportDateRanges(reportFrequency);
        var i = 0;
        for (i = 0; i < dashboardsList.length; i++) {
            if (reportData.dashboards === dashboardsList[i].id) {
                dashboardSelected = dashboardsList[i];
                break;
            }
        }

        for (i = 0; i < reportDateRanges.length; i++) {
            if (reportData.date_range === reportDateRanges[i].value) {
                dateRangeSelected = reportDateRanges[i];
                break;
            }

            if (!dateRangeSelected && reportDateRanges[i].value === "30days") {
                dateRangeSelected = reportDateRanges[i];
            }
        }

        $("#reports-dashboard-dropdown").clySelectSetSelection(dashboardSelected.id, dashboardSelected.name);
        $("#reports-dashboard-date-range-dropdown").clySelectSetSelection(dateRangeSelected.value, dateRangeSelected.name);
    },

    tableData: function(reportData) {
        var dashboardId = reportData.dashboards;
        var dashboard = {};
        var dashboardsList = countlyDashboards.getAllDashboards();
        for (var i = 0; i < dashboardsList.length; i++) {
            if (dashboardId === dashboardsList[i].id) {
                dashboard = dashboardsList[i];
            }
        }

        var data = "Dashboard " + (dashboard.name || "");
        return data;
    }
};

$(document).ready(function() {
    countlyDashboards.initialize();

    var $dashboardNavigation = $("#dashboard-selection");

    $dashboardNavigation.on("click", ".item", function() {
        $dashboardNavigation.find(".selected").text($(this).text());
    });

    $dashboardNavigation.on("click", "#add-dashboard", function() {
        if (!$("body").hasClass("dashboards-view")) {
            app.navigate("#/custom", true);
        }
    });

    $dashboardNavigation.on("click", function() {
        app.customDashboardsView.populateDashboardList();
    });

    if (typeof app.addReportsCallbacks === "function") {
        app.addReportsCallbacks("dashboards", reportsOptions);
    }

    if (app.configurationsView) {
        app.configurationsView.registerLabel("dashboards", "dashboards.dashboard");
    }
});

$.fn.alterClass = function(removals, additions) {
    var self = this;

    if (removals.indexOf('*') === -1) {
        // Use native jQuery methods if there is no wildcard matching
        self.removeClass(removals);
        return !additions ? self : self.addClass(additions);
    }

    var patt = new RegExp('\\s' +
        removals.
            replace(/\*/g, '[A-Za-z0-9-_]+').
            split(' ').
            join('\\s|\\s') +
        '\\s', 'g');

    self.each(function(i, it) {
        var cn = ' ' + it.className + ' ';
        while (patt.test(cn)) {
            cn = cn.replace(patt, ' ');
        }
        it.className = $.trim(cn);
    });

    return !additions ? self : self.addClass(additions);
};

app.addPageScript("/manage/export/export-features", function() {
    $.when(countlyDashboards.initialize(null, true)).then(function() {
        var dashboards = countlyDashboards.getAllDashboards();
        var dashboardsList = [];
        dashboards.forEach(function(dashboard) {
            dashboardsList.push({
                name: dashboard.name,
                id: dashboard.id
            });
        });
        var selectItem = {
            id: "dashboards",
            name: "Dashboards",
            children: dashboardsList
        };
        if (dashboardsList.length) {
            app.exportView.addSelectTable(selectItem);
        }
    });
});