/*global $,countlyView,countlyGlobal,Handlebars,extendViewWithFilter,RemoteConfigComponents,moment,Backbone,_,CountlyHelpers,countlySegmentation,jQuery,countlyCommon,app,remoteConfigView,countlyRemoteConfig, T */

window.remoteConfigView = countlyView.extend({
    initialize: function() {
    },

    beforeRender: function() {
        if (!this.template) {
            var self = this;
            return $.when(
                T.render('/remote-config/templates/remote-config.html', function(src) {
                    self.template = src;
                }),
                T.render('/remote-config/templates/parameters-drawer.html', function(src) {
                    Handlebars.registerPartial("parameters-drawer", src);
                }),
                T.get('/remote-config/templates/conditions-drawer.html', function(src) {
                    Handlebars.registerPartial("conditions-drawer", src);
                }),
                countlyRemoteConfig.initialize()
            ).then(function() {});
        }

        return $.when(
            countlyRemoteConfig.initialize()
        ).then(function() {});
    },

    initializeTabs: function() {
        var self = this;
        var urlPref = "#/remote-config/";
        if (countlyCommon.APP_NAMESPACE !== false) {
            urlPref = "#/" + countlyCommon.ACTIVE_APP_ID + "/remote-config/";
        }
        this.tabs = $("#tabs").tabs();
        this.tabs.on("tabsactivate", function(event, ui) {
            $(window).trigger("resize"); //DATA TABLES HACK FOR STICKY HEADERS
            if (ui && ui.newPanel) {
                var tab = ($(ui.newPanel).attr("id") + "").replace("remote-config-", "");
                self._tab = tab;
                if (tab && tab.length) {
                    Backbone.history.noHistory(urlPref + tab);
                }
            }
        });
    },

    segmentationSection: function() {
        // SegmentationSection for drawers and dialogs
        var segmentationSection = '<div class="section" id="segmentation-section">' +
                                    '    <div id="filter-view" style="width:100%">' +
                                    '        <div style="display:none;" id="defalt-filter-block">' +
                                    '            <div class="query" style="margin-bottom:3px">' +
                                    '                <div class="and-or" style="padding: 10px 0px; margin-top:-5px">' +
                                    '                    <div class="block-line-row">' +
                                    '                        <div class="filter-connector cly-select centered force" style="width:45px; height:24px; margin-left:20px; z-index:1;">' +
                                    '                            <div class="select-inner">' +
                                    '                                <div class="text-container">' +
                                    '                                    <div data-value="AND" class="text" style="font-size:11px; width: 100%; padding: 6px 0px 5px 0px;">' + jQuery.i18n.map["drill.and"] + '</div>' +
                                    '                                </div>' +
                                    '                            </div>' +
                                    '                            <div class="select-items square" style="width:46px; display: none;">' +
                                    '                                <div data-value="AND" class="item" style="font-size:11px">' + jQuery.i18n.map["drill.and"] + '</div>' +
                                    '                                <div data-value="OR" class="item" style="font-size:11px">' + jQuery.i18n.map["drill.or"] + '</div>' +
                                    '                            </div>' +
                                    '                        </div>' +
                                    '                    </div>' +
                                    '                </div>' +
                                    '                <div class="filters">' +
                                    '                    <div class="filter-name cly-select cly-select-keynav centered text-align-left" style="width:200px;">' +
                                    '                        <div class="select-inner">' +
                                    '                            <div class="text-container">' +
                                    '                                <div class="text">' + jQuery.i18n.map["drill.select-filter"] + '</div>' +
                                    '                            </div>' +
                                    '                            <div class="right combo"></div>' +
                                    '                        </div>' +
                                    '                        <div class="select-items square" style="width:200px; display: none;">' +
                                    '                            <div></div>' +
                                    '                        </div>' +
                                    '                    </div>' +
                                    '                    <div class="filter-type cly-select centered force disabled" style="width:110px;">' +
                                    '                        <div class="select-inner">' +
                                    '                            <div class="text-container">' +
                                    '                                <div data-value="=" class="text">' + jQuery.i18n.map["drill.opr.is"] + '</div>' +
                                    '                            </div>' +
                                    '                        </div>' +
                                    '                        <div class="select-items square" style="width:110px; display: none;">' +
                                    '                            <div data-value="rgxcn" class="item str list rgx rgxcn">' + jQuery.i18n.map["drill.opr.contains"] + '</div>' +
                                    '                            <div data-value="rgxntc" class="item str list rgx rgxntc">' + jQuery.i18n.map["drill.opr.notcontain"] + '</div>' +
                                    '                            <div data-value="$gt" class="item num gt">' + jQuery.i18n.map["drill.opr.greater-than"] + '</div>' +
                                    '                            <div data-value="$gte" class="item num gt gte">' + jQuery.i18n.map["drill.opr.at-least"] + '</div>' +
                                    '                            <div data-value="$lt" class="item num lt">' + jQuery.i18n.map["drill.opr.less-than"] + '</div>' +
                                    '                            <div data-value="$lte" class="item num lt lte">' + jQuery.i18n.map["drill.opr.at-most"] + '</div>' +
                                    '                            <div data-value="=" class="item both eq">' + jQuery.i18n.map["drill.opr.is"] + '</div>' +
                                    '                            <div data-value="!=" class="item both neq">' + jQuery.i18n.map["drill.opr.is-not"] + '</div>' +
                                    '                        </div>' +
                                    '                    </div>' +
                                    '                    <div class="filter-value list cly-select cly-select-keynav centered text-align-left disabled" style="width:200px;">' +
                                    '                        <div class="select-inner">' +
                                    '                            <div class="text-container">' +
                                    '                                <div class="text">' + jQuery.i18n.map["drill.list"] + '</div>' +
                                    '                            </div>' +
                                    '                            <div class="right combo"></div>' +
                                    '                        </div>' +
                                    '                        <div class="select-items square" style="width:200px; display: none;">' +
                                    '                            <div></div>' +
                                    '                        </div>' +
                                    '                    </div>' +
                                    '                    <div class="filter-value string hidden">' +
                                    '                        <input type="text" placeholder="String"/>' +
                                    '                    </div>' +
                                    '                    <div class="filter-value num hidden">' +
                                    '                        <input type="number" placeholder="Number"/>' +
                                    '                    </div>' +
                                    '                    <div class="filter-value date hidden">' +
                                    '                        <input class="open-date-picker" type="text" placeholder="Date"/>' +
                                    '                        <div class="date-picker">' +
                                    '                            <div class="calendar-container calendar-light">' +
                                    '                                <div class="calendar"></div>' +
                                    '                            </div>' +
                                    '                        </div>' +
                                    '                    </div>' +
                                    '                </div>' +
                                    '                <div class="delete text-light-gray"><a class="material-icons" style="padding-top:2px">highlight_off</a></div>' +
                                    '            </div>' +
                                    '        </div>' +
                                    '        <div class="panel">' +
                                    '            <div class="panel-heading">' + jQuery.i18n.map["remote-config.condition-definition"] + '</div>' +
                                    '            <div class="panel-body">' +
                                    '                <div id="segmentation" style="float: none; padding:0; min-width: initial; width: 100%;">' +
                                    '                    <div id="filter-blocks" class="empty"></div>' +
                                    '                    <div class="block-line-row"></div>' +
                                    '                    <button id="filter-add-container" style="all:unset;"><span class="btn btn-orange">' + jQuery.i18n.map["remote-config.add-condition"] + '</span></button>' +
                                    '                </div>' +
                                    '            </div>' +
                                    '        </div>' +
                                    '    </div>' +
                                    '</div>';

        return segmentationSection;
    },

    initSegmentation: function(el) {
        if (!this.drillEnabled) {
            return;
        }

        var self = this;
        var segmentationSection = self.segmentationSection();
        $(segmentationSection).insertAfter(el);

        if (typeof self.initDrill === "function") {
            self.byDisabled = true;
            self.initDrill();
            setTimeout(function() {
                self.adjustFilters();
            }, 0);

            var $segmentation = $("#segmentation");
            $segmentation.on("click", ".filter-name .item", function() {
                //SET FILTER TYPES FOR CUSTOM ADDED FILTERS

                $(this).parents(".filter-name").siblings(".filter-value").find("input[type=number]").removeAttr("min");
                $(this).parents(".filter-name").siblings(".filter-value").find("input[type=number]").removeAttr("max");
                $(this).parents(".filter-name").siblings(".filter-value").find("input[type=number]").removeAttr("step");

                if ($(this).data("type") === "n" && $(this).data("value") === "up.random_percentile") {
                    $(this).parents(".filter-name").siblings(".filter-type").find(".item.eq").hide();
                    $(this).parents(".filter-name").siblings(".filter-type").find(".item.neq").hide();
                    $(this).parents(".filter-name").siblings(".filter-type").find(".item.list, .item.str").hide();
                    $(this).parents(".filter-name").siblings(".filter-type").find(".item.num").show();
                    $(this).parents(".filter-name").siblings(".filter-type").find(".item.gte").trigger("click");

                    $(this).parents(".filter-name").siblings(".filter-value").find("input[type=number]").attr("min", 0);
                    $(this).parents(".filter-name").siblings(".filter-value").find("input[type=number]").attr("max", 100);
                    $(this).parents(".filter-name").siblings(".filter-value").find("input[type=number]").attr("step", "any");
                }

                var randomPercentile = false;

                $(".query:visible:not(.by)").each(function() {
                    if (randomPercentile) {
                        return;
                    }

                    if ($(this).find(".filter-name .text").text() === jQuery.i18n.map["drill.select-filter"]) {
                        return false;
                    }

                    randomPercentile = $(this).find(".filter-name .text").data("value") === "up.random_percentile";
                });

                if (randomPercentile) {
                    $("#segmentation-section").siblings("#rc-seed-value-section").show();
                }
                else {
                    $("#segmentation-section").siblings("#rc-seed-value-section").hide();
                }
            });

            $segmentation.on("click", ".filter-name", function() {
                if ($(this).parents(".query").find(".filter-connector .text").data("value") === "OR") {
                    var removeFilters = [];

                    $(".query:visible:not(.by)").each(function() {
                        if ($(this).find(".filter-name .text").text() === jQuery.i18n.map["drill.select-filter"]) {
                            return false;
                        }

                        if ($(this).find(".filter-name .text").data("type") === "n") {
                            if (removeFilters.indexOf($(this).find(".filter-name .text").data("value")) === -1) {
                                removeFilters.push($(this).find(".filter-name .text").data("value"));
                            }
                        }
                    });

                    $(this).find(".item").each(function() {
                        var dataValue = $(this).data("value");
                        if (removeFilters.indexOf(dataValue) > -1) {
                            $(this).remove();
                        }
                    });
                }
            });

            $segmentation.on("click", "#filter-add-container", function() {
                var hideOrList = true;

                $(".query:visible:not(.by)").each(function() {
                    if (!hideOrList) {
                        return;
                    }

                    if ($(this).find(".filter-name .text").text() === jQuery.i18n.map["drill.select-filter"]) {
                        return false;
                    }

                    hideOrList = $(this).find(".filter-name .text").data("value") === "up.random_percentile";
                });

                if (hideOrList) {
                    $(".query:visible:not(.by):last-child").find(".filter-connector .item[data-value='OR']").hide();
                }
            });

            $segmentation.on("click", ".query .delete", function() {
                var randomPercentile = false;

                $(".query:visible:not(.by)").each(function() {
                    if (randomPercentile) {
                        return;
                    }

                    if ($(this).find(".filter-name .text").text() === jQuery.i18n.map["drill.select-filter"]) {
                        return false;
                    }

                    randomPercentile = $(this).find(".filter-name .text").data("value") === "up.random_percentile";
                });

                if (!randomPercentile) {
                    $("#segmentation-section").siblings("#rc-seed-value-section").find("#rc-condition-seed-value-input input").val("");
                    $("#segmentation-section").siblings("#rc-seed-value-section").hide();
                }
            });
            // $segmentation.on("keypress", ".filter-value input[type=number]",function(e) {
            //     var fieldValue = $(this).parents(".filter-value").siblings(".filter-name").find(".text").data("value");
            //     if(fieldValue == "up.random_percentile") {
            //         var currentValue = String.fromCharCode(e.which);
            //         var finalValue = $(this).val() + currentValue;
            //         finalValue = finalValue[finalValue.length - 1] == "." ? finalValue + 0 : finalValue;
            //         if(finalValue <= 100 && finalValue >= 0 && e.which != 45 && e.which != 118 && e.which != 86){
            //             $(this).val(finalValue);
            //         }
            //         e.preventDefault();
            //     }
            // });
        }
    },

    openNewConditionDialog: function(type, callback) {
        var self = this;

        self.conditionModel.resetModel();
        var model = $("#cly-new-condition-model").clone();

        model.removeAttr("id");

        if (type) {
            model.addClass(type);
        }

        model.find("#rc-condition-name-input input").val("");
        model.find("#rc-condition-seed-value-input").parents(".section").hide();
        model.find("#condition-colors").find(".color").removeClass("selected");
        model.find("#condition-colors").find(".color[data-color=1]").addClass("selected");
        model.find("#rc-condition-name-section").find(".description").hide();

        model.find("#rc-condition-name-input input").on("keyup", function() {
            $(this).removeClass("req");
            $(this).parents("#rc-condition-name-section").find(".description").hide();
            var value = $(this).val();
            var pattern = new RegExp(/^[a-zA-Z0-9 ]+$/);
            if (value && !pattern.test(value.trim())) {
                $(this).addClass("req");
                $(this).parents("#rc-condition-name-section").find(".description").show();
            }

            model.trigger("cly-rc-condition-complete");
        });

        model.find("#condition-colors").off("click").on("click", ".color", function() {
            model.find("#condition-colors").find(".color").removeClass("selected");
            $(this).addClass("selected");

            model.trigger("cly-rc-condition-complete");
        });

        model.on("cly-rc-condition-complete", function() {
            var settings = self.getConditionSettings(model),
                allGood = true;

            for (var settingsKey in settings) {
                if (!settings[settingsKey] || (_.isArray(settings[settingsKey]) && settings[settingsKey].length === 0)) {
                    allGood = false;
                }
            }

            if (allGood) {
                model.find("#model-continue").removeClass("disabled");
            }
            else {
                model.find("#model-continue").addClass("disabled");
            }
        });

        CountlyHelpers.revealDialog(model);

        self.conditionModel.cancel.unshift(function() {
            return true;
        });

        model.on('model-cancel', function() {
            return callback(true);
        });

        self.conditionModel.continue.unshift(function() {
            if ($(this).hasClass("disabled")) {
                return false;
            }

            var conditionSettings = self.getConditionSettings(model);

            if (($(".query:visible:not(.by):last").find(".filter-name .text").text() === jQuery.i18n.map["drill.select-filter"]) ||
                !conditionSettings.condition ||
                !conditionSettings.condition_definition) {
                $(".query:visible:not(.by):last").find(".filter-name").addClass("req");
                return false;
            }

            return true;
        });

        model.on('model-continue', function() {
            var conditionSettings = self.getConditionSettings(model);

            if (($(".query:visible:not(.by):last").find(".filter-name .text").text() === jQuery.i18n.map["drill.select-filter"]) ||
                !conditionSettings.condition ||
                !conditionSettings.condition_definition) {
                $(".query:visible:not(.by):last").find(".filter-name").addClass("req");
                return callback(true);
            }

            return callback(false, conditionSettings);
        });

        self.initSegmentation(model.find(".body .details .section:last"));
    },

    renderCommon: function() {
        var self = this;

        var adminApps = Object.keys(countlyGlobal.admin_apps);
        var isAdminofApp = (countlyGlobal.member.global_admin || (adminApps.indexOf(countlyCommon.ACTIVE_APP_ID)) >= 0) ? true : false;

        self.isAdminofApp = isAdminofApp;
        self.drillEnabled = countlyGlobal.plugins.indexOf("drill") > -1;

        this.templateData = {
            "page-title": jQuery.i18n.map["remote-config.plugin-title"],
            "is-admin": isAdminofApp,
            "drill-enabled": self.drillEnabled,
        };

        $(this.el).html(this.template(this.templateData));
        RemoteConfigComponents.init();

        self.initializeTabs();
        var index = $(".ui-tabs-panel", self.tabs).index($("#remote-config-" + self._tab));
        if (index !== -1) {
            self.tabs.tabs("option", "active", index);
        }

        $("#add-parameter").off("click").on("click", function() {
            var maximumParametersAllowed = countlyGlobal.maximum_allowed_parameters;
            var parameters = countlyRemoteConfig.returnParameters() || [];

            if (parameters.length < maximumParametersAllowed) {
                $(".cly-drawer").removeClass("open editing");
                self.resetParameterDrawer();
                $("#rc-parameter-drawer").addClass("open");
            }
            else {
                var message = { title: jQuery.i18n.map["common.error"], message: jQuery.i18n.map["remote-config.maximum_parameters_added"], info: "", type: "error", sticky: false, clearAll: true };
                CountlyHelpers.notify(message);
            }
        });

        $("#add-condition").off("click").on("click", function() {
            $(".cly-drawer").removeClass("open editing");
            self.resetConditionDrawer();
            $("#rc-condition-drawer").addClass("open");
        });

        $(".cly-drawer").find(".close").on("click", function() {
            $(this).parents(".cly-drawer").removeClass("open");
        });

        self.initParametersDrawer();
        self.initParametersTabls();

        if (self.drillEnabled) {
            self.initConditionsDrawer();
            self.initConditionsTable();
            self.conditionModel = new CountlyHelpers.model();
            if (typeof self.initDrill === "function") {
                $.when(countlySegmentation.initialize("[CLY]_session")).then(function() {});
            }
        }
    },

    initParametersDrawer: function() {
        var self = this;

        $("#rc-parameter-name-input").on("keyup", function() {
            $(this).removeClass("req");
            $(this).parents("#rc-parameter-name-section").find(".description").hide();
            var value = $(this).val();
            var pattern = new RegExp(/^[a-zA-Z_][a-zA-Z0-9_]*$/);
            if (value && !pattern.test(value)) {
                $(this).addClass("req");
                $(this).parents("#rc-parameter-name-section").find(".description").show();
            }

            $("#rc-parameter-drawer").trigger("cly-rc-parameter-complete");
        });

        $("#rc-parameter-drawer").on("cly-rc-parameter-complete", function() {
            var settings = self.getParameterSettings(),
                allGood = true;

            for (var settingsKey in settings) {
                if (!settings[settingsKey] || (_.isArray(settings[settingsKey]) && settings[settingsKey].length === 0)) {
                    allGood = false;
                }
            }

            if (allGood) {
                $("#create-parameter").removeClass("disabled");
                $("#save-parameter").removeClass("disabled");
            }
            else {
                $("#create-parameter").addClass("disabled");
                $("#save-parameter").addClass("disabled");
            }
        });

        $("#parameter-description-checkbox, #rc-parameter-description-section .label span").on("click", function() {
            var check = $("#parameter-description-checkbox").hasClass("fa-check-square");
            if (check) {
                $("#parameter-description-checkbox").removeClass('fa-check-square').addClass('fa-square-o');
                $("#parameter-description").hide();
            }
            else {
                $("#parameter-description-checkbox").removeClass('fa-square-o').addClass('fa-check-square');
                $("#parameter-description").show();
            }

            $("#rc-parameter-drawer").trigger("cly-rc-parameter-complete");
        });

        $("#parameter-description").on("keyup", function() {
            $("#rc-parameter-drawer").trigger("cly-rc-parameter-complete");
        });

        $("#create-parameter").on("click", function() {
            if ($(this).hasClass("disabled")) {
                return;
            }

            $(".cly-drawer").removeClass("open editing");

            var parameterSettings = self.getParameterSettings();

            if (!parameterSettings.conditions) {
                parameterSettings.conditions = [];
            }

            if (!parameterSettings.description) {
                parameterSettings.description = "-";
            }

            countlyRemoteConfig.createParameter(parameterSettings, function() {
                self.refresh(true);
            });
        });

        $("#save-parameter").on("click", function() {
            if ($(this).hasClass("disabled")) {
                return;
            }

            $(".cly-drawer").removeClass("open editing");

            var parameterId = $(this).data("parameter-id");
            var parameterSettings = self.getParameterSettings();

            if (!parameterSettings.conditions) {
                parameterSettings.conditions = [];
            }

            if (!parameterSettings.description) {
                parameterSettings.description = "-";
            }

            countlyRemoteConfig.updateParameter(parameterId, parameterSettings, function() {
                self.refresh(true);
            });
        });


        $(".condition-menu-trigger").on("click", function(e) {
            var conditions = countlyRemoteConfig.getConditions(),
                $conditionSelectionList = $(".condition-menu-trigger").find(".list");

            $conditionSelectionList.html("");

            for (var i = 0; i < conditions.length; i++) {
                $conditionSelectionList.append("<div class='item searchable' data-id='" + conditions[i]._id + "'>" + conditions[i].condition_name + "</div>");
            }

            $(".condition-menu-trigger").find(".wrapper").show();
            $(".condition-menu-trigger").find(".menu .condition-title").show();

            if (!conditions || !conditions.length) {
                $(".condition-menu-trigger").find(".wrapper").hide();
                $(".condition-menu-trigger").find(".menu .condition-title").hide();
            }

            var wasActive = $(this).find(".dropdown").hasClass("clicked");

            if (wasActive) {
                $(this).find(".dropdown").removeClass("clicked");
            }
            else {
                $(this).find(".nav-search input").val("");
                $(this).find(".list").scrollTop(0);
                $(this).find(".dropdown").addClass("clicked");
                var _this = $(this);
                setTimeout(function() {
                    _this.find(".nav-search input").focus();
                }, 50);
            }

            e.stopPropagation();
        });

        $(".condition-menu-trigger").on("click", ".dropdown .nav-search", function(e) {
            e.stopPropagation();
        });

        $(".condition-menu-trigger").on("click", ".dropdown .item", function(e) {
            var conditionId = $(this).data("id");
            var unique = true;

            var maximumConditionsAllowed = countlyGlobal.conditions_per_paramaeters;

            var message;
            if (self.sortableConditionsList.length >= maximumConditionsAllowed) {
                message = { title: jQuery.i18n.map["common.error"], message: jQuery.i18n.map["remote-config.maximum_conditions_added"], info: "", type: "error", sticky: false, clearAll: true };
                CountlyHelpers.notify(message);
                return;
            }

            for (var i = 0; i < self.sortableConditionsList.length; i++) {
                if (self.sortableConditionsList[i]._id === conditionId) {
                    unique = false;
                }
            }

            if (!unique) {
                message = { title: jQuery.i18n.map["common.error"], message: jQuery.i18n.map["remote-config.have-already-one"], info: "", type: "error", sticky: false, clearAll: true };
                CountlyHelpers.notify(message);
                return;
            }

            var condition = countlyRemoteConfig.getCondition(conditionId);
            //Value is used as a model by the textarea dropdown
            condition.value = {
                name: "",
                value: ""
            };

            self.sortableConditionsList.push(condition);
            self.populateConditionsSortableList();

            $("#rc-parameter-drawer").trigger("cly-rc-parameter-complete");
            $(".condition-menu-trigger").find(".dropdown").removeClass("clicked");
            e.stopPropagation();
        });

        $("body").on("click", function() {
            $(".condition-menu-trigger").find(".dropdown").removeClass("clicked");
        });

        $("#rc-parameter-drawer").on("click", ".json-braces", function() {
            var thisRef = this;
            var textAreaValue = $(thisRef).parents(".text-field").find("textarea").val();
            CountlyHelpers.newJSONEditor(textAreaValue, "popStyleGreen", function(err, json) {
                if (err) {
                    return;
                }
                json = json || "";

                var isCondition = $(thisRef).parents(".condition-input-container");
                if (isCondition.length) {
                    var orderKey = $(thisRef).parents("tr").data("order-key");

                    //value is used as a vue model by the textarea dropdown
                    self.sortableConditionsList[orderKey].value = {
                        name: json,
                        value: json
                    };

                    self.populateConditionsSortableList();
                }
                else {
                    //defaultValues is used as a vue model by the textarea dropdown
                    RemoteConfigComponents.clyTextDrop.defaultValue = {
                        name: json,
                        value: json
                    };
                }
                $("#rc-parameter-drawer").trigger("cly-rc-parameter-complete");
            });
        });

        $(".condition-menu-trigger").on("click", "#cly-create-new-condition", function() {
            self.openNewConditionDialog("", function(err, settings) {
                if (err) {
                    return;
                }

                if (!settings.seed_value) {
                    settings.seed_value = "";
                }

                countlyRemoteConfig.createCondition(settings, function(id) {
                    self.refresh(true, function() {
                        $(".condition-menu-trigger").trigger("click");
                        $(".condition-menu-trigger .dropdown .item[data-id= '" + id + "']").trigger("click");
                    });
                });
            });
        });

        self.initConditionsSortableList();
    },

    resetParameterDrawer: function() {
        $("#rc-parameter-name-input").val("");
        $("#rc-parameter-name-input").removeClass("req");
        $("#rc-parameter-name-section").find(".description").hide();
        $("#create-parameter").addClass("disabled");
        $("#save-parameter").addClass("disabled");
        $("#rc-parameter-drawer #conditions-overview-table table tbody").empty();
        $("#parameter-description-checkbox").removeClass('fa-check-square').addClass('fa-square-o');
        $("#parameter-description").hide();
        $("#parameter-description").val("");
        $("#rc-parameter-drawer textarea").trigger("change");
        this.sortableConditionsList = [];
        RemoteConfigComponents.clyTextDrop.conditions = [];
        RemoteConfigComponents.clyTextDrop.items = [];
        RemoteConfigComponents.clyTextDrop.defaultValue = {};
    },

    loadParametersDrawer: function(parameter) {
        var parameterKey = parameter.parameter_key;
        var defaultValue = parameter.default_value;
        var paramConditions = parameter.conditions || [];
        var description = parameter.description;
        var valuesList = parameter.valuesList || [];

        if (typeof (defaultValue) === 'object') {
            defaultValue = JSON.stringify(defaultValue);
        }

        for (var i = 0; i < paramConditions.length; i++) {
            var conditionId = paramConditions[i].condition_id;
            var condition = countlyRemoteConfig.getCondition(conditionId);
            var value = paramConditions[i].value;
            if (typeof (value) === 'object') {
                value = JSON.stringify(value);
            }

            condition.value = {
                name: value,
                value: value
            };

            this.sortableConditionsList.push(condition);
        }

        if (!valuesList.length) {
            //Check for backward Compatibility
            //Once the user updates the parameter, valuesList gets added to the database in server
            //And on subsequent requests, execution will never come here.
            //Delete this block after all parameters have been updated for all clients
            //Feature added in October, 2020
            valuesList.push(defaultValue);

            paramConditions.forEach(function(e) {
                valuesList.push(e.value);
            });
        }

        setTimeout(function() {
            //Updating the dropdown component state
            //Do it in the next tick just to be safe
            //Because there is a weird bug that happens sometimes
            //Which doesnt set the items state twice in the same tick
            //We reset the state of the drawer before loading the data

            RemoteConfigComponents.clyTextDrop.items = valuesList.map(function(v) {
                if (typeof (v) === 'object') {
                    v = JSON.stringify(v);
                }

                return {
                    name: v,
                    value: v
                };
            });

            //value is used as a vue model by the textarea dropdown
            RemoteConfigComponents.clyTextDrop.defaultValue = {
                name: defaultValue,
                value: defaultValue
            };
        }, 0);

        if (description && description !== "-") {
            $("#parameter-description-checkbox").removeClass('fa-square-o').addClass('fa-check-square');
            $("#parameter-description").show();
            $("#parameter-description").val(description);
        }

        $("#rc-parameter-name-input").val(parameterKey);

        this.populateConditionsSortableList();
    },

    initParametersTabls: function() {
        var self = this;

        var parameters = countlyRemoteConfig.returnParameters();

        $.fn.textWidth = function(text, font) {

            if (!$.fn.textWidth.fakeEl) {
                $.fn.textWidth.fakeEl = $('<span>').hide().appendTo(document.body);
            }

            $.fn.textWidth.fakeEl.text(this.val()).css('font', font || this.css('font'));

            var width = $.fn.textWidth.fakeEl.width();

            if (!width) {
                $.fn.textWidth.fakeEl.text("A").css('font', font || this.css('font'));
                width = $.fn.textWidth.fakeEl.width();
            }

            return width + 21;
        };

        $('#table-parameters').on('input', "tr .value input", function() {
            var inputWidth = $(this).textWidth();
            $(this).css({ width: inputWidth });
        });

        var aoColumns = [
            {"mData": 'parameter_key', "sType": "string", "sTitle": jQuery.i18n.map['remote-config.parameter']},
            {
                "mData": function(row) {
                    var blockContainer = $('<div></div>');

                    var block = $('<div class="value-box-container" style="visibility:hidden">' +
                                '   <div class="value-box condition-background-color alt0">' +
                                '       <div class="text"></div>' +
                                '       <div class="value"><input class="input" type="text" disabled></div>' +
                                '   </div>' +
                                '</div>');

                    block.find(".text").text(jQuery.i18n.map["remote-config.default-value"]);
                    var value = row.default_value;

                    if (typeof (value) === 'object') {
                        value = JSON.stringify(row.default_value);
                    }
                    block.find(".value input").attr("value", value);
                    blockContainer.append(block);

                    var paramConditions = row.conditions;
                    if (self.drillEnabled) {
                        for (var i = 0; i < paramConditions.length; i++) {
                            var condition = countlyRemoteConfig.getCondition(paramConditions[i].condition_id);
                            block = $('<div class="value-box-container" style="visibility:hidden">' +
                                        '   <div class="value-box condition-background-color alt' + condition.condition_color + '">' +
                                        '       <div class="icon">' +
                                        '           <i class="material-icons condition-text-color alt' + condition.condition_color + '"> call_split </i>' +
                                        '       </div>' +
                                        '       <div class="text condition-text-color alt' + condition.condition_color + '"></div>' +
                                        '       <div class="value"><input class="input" type="text" disabled></div>' +
                                        '   </div>' +
                                        '</div>');
                            block.find(".text").text(condition.condition_name);
                            value = paramConditions[i].value;
                            if (typeof (value) === 'object') {
                                value = JSON.stringify(paramConditions[i].value);
                            }
                            block.find(".value input").attr("value", value);
                            blockContainer.append(block);
                        }
                    }

                    return blockContainer.html();
                },
                "sType": "string",
                "sTitle": jQuery.i18n.map["remote-config.condition"],
                "bSortable": false
            },
            {
                "mData": 'description',
                "sType": "string",
                "sTitle": jQuery.i18n.map["remote-config.description"],
                "sClass": "rc-table-param-description"
            }
        ];

        if (self.isAdminofApp) {
            aoColumns.push(
                {
                    "mData": function(row) {
                        var menu = "<div class='options-menu'>" +
                                        "<div class='edit'></div>" +
                                        "<div class='edit-menu'>" +
                                            "<div class='rc-edit-parameter item'" + " id='" + row._id + "'" + "><i class='fa fa-pencil'></i>" + jQuery.i18n.map['common.edit'] + "</div>" +
                                            "<div class='rc-delete-parameter item'" + " id='" + row._id + "'" + " data-name = '" + row.parameter_key + "' ><i class='fa fa-trash'></i>" + jQuery.i18n.map['common.delete'] + "</div>" +
                                        "</div>" +
                                    "</div>";
                        return menu;
                    },
                    "sWidth": "5%",
                    "bSortable": false,
                }
            );
        }

        self.parametersTable = $('#table-parameters').dataTable($.extend({}, $.fn.dataTable.defaults, {
            "aaData": parameters,
            "fnRowCallback": function(nRow, aData) {
                $(nRow).attr("id", aData._id);
            },
            "aoColumns": aoColumns,
            "fnDrawCallback": function(oSettings) {
                $("#table-parameters .value-box-container .value input").trigger("input");
                setTimeout(function() {
                    setValueBoxContainer();
                }, 0);

                if (!$('#remote-config-parameters').find(".sticky-header").length) {
                    setTimeout(function() {
                        $('#table-parameters').stickyTableHeaders();
                    }, 0);
                }

                $.fn.dataTable.defaults.fnDrawCallback(oSettings);
            }
        }));

        $("#table-parameters").on("resize", function() {
            setValueBoxContainer();
        });

        /**
         * Function to set value box container
         */
        function setValueBoxContainer() {
            var columnWidth = $("#table-parameters td:nth-child(2)").width();

            if (!columnWidth) {
                return;
            }

            var padding = 80;
            columnWidth -= padding;
            var maxWidth = parseInt(columnWidth / 2);

            $("#table-parameters").find("td:nth-child(2) .value-box-container .value-box").each(function(index, el) {
                var textWidth = $(el).find(".text").width();
                var valueWidth = $(el).find(".input").width();
                var textOffset = maxWidth - textWidth;
                var valueOffset = maxWidth - valueWidth;

                textOffset = textOffset > 0 ? textOffset : 0;
                valueOffset = valueOffset > 0 ? valueOffset : 0;

                $(el).find(".text").css({"max-width": maxWidth + valueOffset});
                $(el).find(".input").css({"max-width": maxWidth + textOffset});
            });

            $(".value-box-container").css({"visibility": "visible"});
        }

        $("body").off("click", ".options-menu .edit").on("click", ".options-menu .edit", function(event) {
            $(".edit-menu").fadeOut();
            $(this).next(".edit-menu").fadeToggle();
            event.stopPropagation();
        });

        $(window).click(function() {
            $(".options-menu").find(".edit").next(".edit-menu").fadeOut();
        });

        $("#table-parameters").off("click", ".edit-menu .rc-edit-parameter").on("click", ".edit-menu .rc-edit-parameter", function(e) {
            var parameterId = e.target.id;
            self.resetParameterDrawer();
            $(".cly-drawer").removeClass("open");
            $("#rc-parameter-drawer").addClass("open editing");
            $("#save-parameter").data("parameter-id", parameterId);
            var parameter = countlyRemoteConfig.getParameter(parameterId);
            self.loadParametersDrawer(parameter);
        });

        $("#table-parameters").off("click", ".edit-menu .rc-delete-parameter").on("click", ".edit-menu .rc-delete-parameter", function(e) {
            var parameterId = e.target.id;
            var name = $(e.target).attr("data-name");

            CountlyHelpers.confirm(jQuery.i18n.prop("remote-config.confirm-parameter-delete", "<b>" + name + "</b>"), "popStyleGreen", function(result) {
                if (!result) {
                    return false;
                }

                countlyRemoteConfig.removeParameter(parameterId, function() {
                    self.refresh(true);
                });

            }, [jQuery.i18n.map["common.no-dont-delete"], jQuery.i18n.map["remote-config.yes-delete-parameter"]], {title: jQuery.i18n.map["remote-config.delete-parameter-title"], image: "delete-email-report"});
        });
    },

    getParameterSettings: function() {
        var settings = {
            parameter_key: $("#rc-parameter-name-input").val(),
            default_value: RemoteConfigComponents.clyTextDrop.defaultValue.value
        };

        var customDescription = $("#parameter-description-checkbox").hasClass("fa-check-square");
        var parameterDescription = $("#parameter-description").val();

        var conditionsBlock = RemoteConfigComponents.clyTextDrop.conditions || [];
        var processConditions = true;
        if (conditionsBlock.length) {
            settings.conditions = [];
            conditionsBlock.forEach(function(c) {
                var conditionId = c._id;
                var value = c.value.value;

                if (!(value + "").length) {
                    processConditions = false;
                    return false;
                }

                settings.conditions.push({
                    condition_id: conditionId,
                    value: value
                });
            });
        }

        if (!processConditions) {
            settings.conditions = [];
        }

        if ($("#rc-parameter-name-input").hasClass("req")) {
            settings.parameter_key = "";
        }

        if (customDescription) {
            settings.description = parameterDescription;
        }

        return settings;
    },

    initConditionsDrawer: function() {
        var self = this;

        $("#rc-condition-name-input input").on("keyup", function() {
            $(this).removeClass("req");
            $(this).parents("#rc-condition-name-section").find(".description").hide();
            var value = $(this).val();
            var pattern = new RegExp(/^[a-zA-Z0-9 ]+$/);
            if (value && !pattern.test(value.trim())) {
                $(this).addClass("req");
                $(this).parents("#rc-condition-name-section").find(".description").show();
            }

            $("#rc-condition-drawer").trigger("cly-rc-condition-complete");
        });

        $("#condition-colors").off("click").on("click", ".color", function() {
            $("#condition-colors").find(".color").removeClass("selected");
            $(this).addClass("selected");

            $("#rc-condition-drawer").trigger("cly-rc-condition-complete");
        });

        $("#rc-condition-seed-value-input input").on("keyup", function() {
            $("#rc-condition-drawer").trigger("cly-rc-condition-complete");
        });

        $("#rc-condition-drawer").find(".close").on("click", function() {
            $("#segmentation-section").remove();
        });

        $("#rc-condition-drawer").on("cly-rc-condition-complete", function() {
            var settings = self.getConditionSettings($("#rc-condition-drawer")),
                allGood = true;

            for (var settingsKey in settings) {
                if (!settings[settingsKey] || (_.isArray(settings[settingsKey]) && settings[settingsKey].length === 0)) {
                    allGood = false;
                }
            }

            if (allGood) {
                $("#create-condition").removeClass("disabled");
                $("#save-condition").removeClass("disabled");
            }
            else {
                $("#create-condition").addClass("disabled");
                $("#save-condition").addClass("disabled");
            }
        });

        $("#create-condition").on("click", function() {
            if ($(this).hasClass("disabled")) {
                return;
            }

            var conditionSettings = self.getConditionSettings($("#rc-condition-drawer"));

            if (($(".query:visible:not(.by):last").find(".filter-name .text").text() === jQuery.i18n.map["drill.select-filter"]) ||
                !conditionSettings.condition ||
                !conditionSettings.condition_definition) {
                $(".query:visible:not(.by):last").find(".filter-name").addClass("req");
                return;
            }

            $(".cly-drawer").removeClass("open editing");

            if (!conditionSettings.seed_value) {
                conditionSettings.seed_value = "";
            }

            countlyRemoteConfig.createCondition(conditionSettings, function() {
                self.refresh(true);
            });
        });

        $("#save-condition").on("click", function() {
            if ($(this).hasClass("disabled")) {
                return;
            }

            var conditionId = $(this).data("condition-id");
            var conditionSettings = self.getConditionSettings($("#rc-condition-drawer"));

            if (($(".query:visible:not(.by):last").find(".filter-name .text").text() === jQuery.i18n.map["drill.select-filter"]) ||
                !conditionSettings.condition ||
                !conditionSettings.condition_definition) {
                $(".query:visible:not(.by):last").find(".filter-name").addClass("req");
                return;
            }

            $(".cly-drawer").removeClass("open editing");

            if (!conditionSettings.seed_value) {
                conditionSettings.seed_value = "";
            }

            countlyRemoteConfig.updateCondition(conditionId, conditionSettings, function() {
                self.refresh(true);
            });
        });
    },

    populateConditionsSortableList: function() {
        var self = this;

        for (var i = 0; i < this.sortableConditionsList.length; i++) {
            this.sortableConditionsList[i].order = i;
        }

        setTimeout(function() {
            //Need to run the update in next tick because vue is not updating the component twice.
            RemoteConfigComponents.clyTextDrop.conditions = self.sortableConditionsList;
        }, 0);
    },

    initConditionsSortableList: function() {
        var self = this;

        self.sortableConditionsList = [];

        $("#rc-parameter-drawer #conditions-overview-table").off("click", ".delete a");

        $("#rc-parameter-drawer #conditions-overview-table").on("click", ".delete a", function() {
            var key = $(this).data("order-key");
            if (key >= 0) {
                self.sortableConditionsList.splice(key, 1);
                for (var i = 0; i < self.sortableConditionsList.length; i++) {
                    self.sortableConditionsList[i].order = i;
                }
            }

            self.populateConditionsSortableList();
            $("#rc-parameter-drawer").trigger("cly-rc-parameter-complete");
        });

        $("#rc-parameter-drawer #conditions-overview-table table").sortable({
            items: "tbody tr",
            revert: true,
            handle: ".condition-order",
            helper: function(e, elem) {
                elem.find(".block-line-row").css({"margin-left": "0px", "margin-right": "0px"});
                elem.children().each(function() {
                    $(this).width($(this).width());
                });
                elem.css("width", (parseInt(elem.width())) + "px");
                return elem;
            },
            cursor: "move",
            containment: "parent",
            tolerance: "pointer",
            placeholder: "condition-row-placeholder",
            stop: function(e, elem) {
                elem.item.find(".block-line-row").css({"margin-left": "-20px", "margin-right": "-20px"});
                changeOrder();
                $("#rc-parameter-drawer").trigger("cly-rc-parameter-complete");
            }
        });

        /**
         * Funciton to change condition order
         */
        function changeOrder() {
            var newSortableConditionsList = [];
            $("#rc-parameter-drawer #conditions-overview-table").find(".delete a").each(function() {
                var key = $(this).data("order-key");
                if (key >= 0) {
                    var i = key;
                    $(this).data("order-key", newSortableConditionsList.length);
                    self.sortableConditionsList[i].order = newSortableConditionsList.length;
                    newSortableConditionsList.push(self.sortableConditionsList[i]);
                }
            });

            self.sortableConditionsList = newSortableConditionsList;
        }
    },

    resetConditionDrawer: function() {
        $("#rc-condition-name-input input").val("");
        $("#rc-condition-name-input input").removeClass("req");
        $("#rc-condition-name-section").find(".description").hide();
        $("#rc-condition-seed-value-input input").val("");
        $("#condition-colors").find(".color").removeClass("selected");
        $("#condition-colors").find(".color[data-color=1]").addClass("selected");
        $("#create-condition").addClass("disabled");
        $("#save-condition").addClass("disabled");
        $("#segmentation-section").remove();
        $("#rc-condition-seed-value-input").parents(".section").hide();
        var el = $("#rc-condition-drawer .details .section:last");
        this.initSegmentation(el);
    },

    loadConditionsDrawer: function(condition) {
        var self = this;
        var conditionName = condition.condition_name;
        var conditionColor = condition.condition_color;
        var filter = JSON.parse(_.unescape(condition.condition));
        var seedValue = condition.seed_value || "";

        $("#rc-condition-name-input input").val(conditionName);
        $("#rc-condition-seed-value-input input").val(seedValue);
        $("#condition-colors").find(".color").removeClass("selected");
        $("#condition-colors").find(".color[data-color=" + conditionColor + "]").addClass("selected");

        if (seedValue) {
            $("#rc-seed-value-section").show();
        }
        self.adjustFilters();

        var inputs = [];
        var subs = {};
        for (var i in filter) {
            inputs.push(i);
            subs[i] = [];
            for (var j in filter[i]) {
                if (filter[i][j].length) {
                    for (var k = 0; k < filter[i][j].length; k++) {
                        subs[i].push([j, filter[i][j][k]]);
                    }
                }
                else {
                    subs[i].push([j, filter[i][j]]);
                }
            }
        }

        /**
         * Function to set drill
         * @param  {String} cur - current
         * @param  {Number} sub - subsequent
         * @param  {Number} total - total
         */
        function setInput(cur, sub, total) {
            sub = sub || 0;
            if (inputs[cur]) {
                var filterType = subs[inputs[cur]][sub][0];
                if (filterType === "$in") {
                    filterType = "=";
                }
                else if (filterType === "$nin") {
                    filterType = "!=";
                }

                var val = subs[inputs[cur]][sub][1];
                var el = $(".query:visible:nth-child(" + (total) + ")");
                el.find(".filter-name").trigger("click");
                el.find(".filter-type").trigger("click");

                if (inputs[cur].indexOf("chr.") === 0) {
                    el.find(".filter-name").find(".select-items .item[data-value='chr']").trigger("click");
                    if (val === "t") {
                        el.find(".filter-type").find(".select-items .item[data-value='=']").trigger("click");
                    }
                    else {
                        el.find(".filter-type").find(".select-items .item[data-value='!=']").trigger("click");
                    }
                    val = inputs[cur].split(".")[1];
                    subs[inputs[cur]] = ["true"];
                }
                else {
                    el.find(".filter-name").find(".select-items .item[data-value='" + inputs[cur] + "']").trigger("click");
                    el.find(".filter-type").find(".select-items .item[data-value='" + filterType + "']").trigger("click");
                }

                setTimeout(function() {
                    el.find(".filter-value").not(".hidden").trigger("click");
                    if (el.find(".filter-value").not(".hidden").find(".select-items .item[data-value='" + val + "']").length) {
                        el.find(".filter-value").not(".hidden").find(".select-items .item[data-value='" + val + "']").trigger("click");
                    }
                    else if (el.find(".filter-value").not(".hidden").hasClass("date") && _.isNumber(val) && (val + "").length === 10) {
                        el.find(".filter-value.date").find("input").val(countlyCommon.formatDate(moment(val * 1000), "DD MMMM, YYYY"));
                        el.find(".filter-value.date").find("input").data("timestamp", val);
                    }
                    else {
                        el.find(".filter-value").not(".hidden").find("input").val(val);
                    }

                    if (subs[inputs[cur]].length === sub + 1) {
                        cur++;
                        sub = 0;
                    }
                    else {
                        sub++;
                    }

                    total++;
                    if (inputs[cur]) {
                        $("#filter-add-container").trigger("click");
                        if (sub > 0) {
                            setTimeout(function() {
                                var e = $(".query:visible:nth-child(" + (total) + ")");
                                if (["$gt", "$gte", "$lt", "$lte"].indexOf(filterType) > -1) {
                                    e.find(".and-or").find(".select-items .item[data-value='AND']").trigger("click");
                                }
                                else {
                                    e.find(".and-or").find(".select-items .item[data-value='OR']").trigger("click");
                                }
                                setInput(cur, sub, total);
                            }, 500);
                        }
                        else {
                            setInput(cur, sub, total);
                        }
                    }
                }, 500);
            }
        }

        setInput(0, 0, 1);
        $("#save-condition").removeClass("disabled");
    },

    initConditionsTable: function() {
        var self = this;

        var conditions = countlyRemoteConfig.getConditions();

        var aoColumns = [
            {
                "mData": function(row) {
                    var boxColor = "<div class='rc-condition-color color alt" + row.condition_color + "'></div>";
                    return boxColor;
                },
                "sWidth": "1%",
                "sClass": "rc-relative-row",
                "bSortable": false,
            },
            {"mData": 'condition_name', "sType": "string", "sTitle": jQuery.i18n.map['remote-config.name']},
            {
                "mData": 'condition_definition',
                "sType": "string",
                "sTitle": jQuery.i18n.map["remote-config.definition"]
            },
            {
                "sType": "string",
                "sTitle": jQuery.i18n.map["remote-config.used-in-parameters"],
                "mData": function(row) {
                    return jQuery.i18n.prop("remote-config.used-in-parameters-text", row.used_in_parameters);
                }
            },
            {
                "sType": "string",
                "sTitle": jQuery.i18n.map["remote-config.seed-value"],
                "mData": function(row) {
                    var value = jQuery.i18n.map["remote-config.seed-value-default"];
                    if (row.seed_value) {
                        value = row.seed_value;
                    }
                    return value;
                }
            }
        ];

        if (self.isAdminofApp) {
            aoColumns.push(
                {
                    "mData": function(row) {
                        var menu = "<div class='options-menu'>" +
                                        "<div class='edit'></div>" +
                                        "<div class='edit-menu'>" +
                                            "<div class='rc-edit-condition item'" + " id='" + row._id + "'" + "><i class='fa fa-pencil'></i>" + jQuery.i18n.map['common.edit'] + "</div>" +
                                            "<div class='rc-delete-condition item'" + " id='" + row._id + "'" + " data-name = '" + row.condition_name + "' ><i class='fa fa-trash'></i>" + jQuery.i18n.map['common.delete'] + "</div>" +
                                        "</div>" +
                                    "</div>";
                        return menu;
                    },
                    "sWidth": "5%",
                    "bSortable": false,
                }
            );
        }

        self.conditionsTable = $('#table-conditions').dataTable($.extend({}, $.fn.dataTable.defaults, {
            "aaData": conditions,
            "fnRowCallback": function(nRow, aData) {
                $(nRow).attr("id", aData._id);
            },
            "aoColumns": aoColumns,
            "fnDrawCallback": function(oSettings) {
                if (!$('#remote-config-conditions').find(".sticky-header").length) {
                    setTimeout(function() {
                        $('#table-conditions').stickyTableHeaders();
                    }, 0);
                }

                $.fn.dataTable.defaults.fnDrawCallback(oSettings);
            }
        }));

        $("body").off("click", ".options-menu .edit").on("click", ".options-menu .edit", function(event) {
            $(".edit-menu").fadeOut();
            $(this).next(".edit-menu").fadeToggle();
            event.stopPropagation();
        });

        $(window).click(function() {
            $(".options-menu").find(".edit").next(".edit-menu").fadeOut();
        });

        $("#table-conditions").off("click", ".edit-menu .rc-edit-condition").on("click", ".edit-menu .rc-edit-condition", function(e) {
            var conditionId = e.target.id;
            self.resetConditionDrawer();
            $(".cly-drawer").removeClass("open");
            $("#rc-condition-drawer").addClass("open editing");
            $("#save-condition").data("condition-id", conditionId);
            var condition = countlyRemoteConfig.getCondition(conditionId);
            self.loadConditionsDrawer(condition);
        });

        $("#table-conditions").off("click", ".edit-menu .rc-delete-condition").on("click", ".edit-menu .rc-delete-condition", function(e) {
            var conditionId = e.target.id;
            var name = $(e.target).attr("data-name");

            CountlyHelpers.confirm(jQuery.i18n.prop("remote-config.confirm-condition-delete", "<b>" + name + "</b>"), "popStyleGreen", function(result) {
                if (!result) {
                    return false;
                }

                countlyRemoteConfig.removeCondition(conditionId, function() {
                    self.refresh(true);
                });

            }, [jQuery.i18n.map["common.no-dont-delete"], jQuery.i18n.map["remote-config.yes-delete-condition"]], {title: jQuery.i18n.map["remote-config.delete-condition-title"], image: "delete-email-report"});
        });
    },

    getConditionSettings: function(el) {
        var settings = {
            condition_name: $(el).find("#rc-condition-name-input input").val(),
            condition_color: $(el).find("#condition-colors").find(".color.selected").data("color")
        };

        var seedValue = $(el).find("#rc-condition-seed-value-input input").val();
        if ($(".query:visible:not(.by):last").find(".filter-name .text").text() !== jQuery.i18n.map["drill.select-filter"]) {
            var filterData = this.getFilterObjAndByVal();
            settings.condition = filterData.dbFilter;
            if (filterData.bookmarkText) {
                settings.condition_definition = filterData.bookmarkText;
            }
        }

        if (seedValue && seedValue.trim()) {
            settings.seed_value = seedValue;
            if (!(settings.condition["up.random_percentile"])) {
                delete settings.seed_value;
            }
        }

        if ($(el).find("#rc-condition-name-input input").hasClass("req")) {
            settings.condition_name = "";
        }

        return settings;
    },

    getFilters: function(currEvent, addUsedToo) {
        //OVERWRITE DRILL GET FILTERS TO ADD CUSTOM FILTERS
        var usedFilters = {};

        if (addUsedToo !== true) {
            $(".query:visible").each(function() {
                var filterType = $(this).find(".filter-name .text").data("type");

                if (filterType !== "n" && filterType !== "d" && $(this).find(".filter-name .text").data("value") !== "chr") {
                    usedFilters[$(this).find(".filter-name .text").data("value")] = true;
                }
            });
        }

        var filters = countlySegmentation.getFilters(),
            allFilters = "";

        if (filters.length === 0) {
            CountlyHelpers.alert(jQuery.i18n.map["drill.no-filters"], "black");
        }

        var i = 0;
        for (i = 0; i < filters.length; i++) {
            if (filters[i].id && filters[i].id === "did") {
                filters.splice(i, 0, {id: "up.random_percentile", name: jQuery.i18n.map["remote-config.random-percentile"], type: "n"});
                break;
            }
        }

        for (i = 0; i < filters.length; i++) {
            var tmpItem;
            if (typeof filters[i].id !== "undefined") {
                if (usedFilters[filters[i].id] === true) {
                    continue;
                }

                tmpItem = $("<div>");

                tmpItem.addClass("item");
                tmpItem.attr("data-type", filters[i].type);
                tmpItem.attr("data-value", filters[i].id);
                tmpItem.text(filters[i].name);

                allFilters += tmpItem.prop('outerHTML');
            }
            else {
                tmpItem = $("<div>");

                tmpItem.addClass("group");
                tmpItem.text(filters[i].name);

                allFilters += tmpItem.prop('outerHTML');
            }
        }

        return allFilters;
    },

    loadAndRefresh: function() {
        //OVERWRITING THE DRILL LOAD AND REFRESH --- DONOT REMOVE IT
    },

    refresh: function(force, cbk) {
        if (!force) {
            return;
        }

        var self = this;
        $.when(countlyRemoteConfig.initialize()).then(function() {
            if (app.activeView !== self) {
                return false;
            }

            var parameters = countlyRemoteConfig.returnParameters();

            CountlyHelpers.refreshTable(self.parametersTable, parameters);

            if (self.drillEnabled) {
                var conditions = countlyRemoteConfig.getConditions();
                CountlyHelpers.refreshTable(self.conditionsTable, conditions);
            }

            if (cbk) {
                return cbk();
            }
        });
    }
});

app.remoteConfigView = new remoteConfigView();

app.route('/remote-config', 'remote-config', function() {
    this.remoteConfigView._tab = "parameters";
    this.renderWhenReady(this.remoteConfigView);
});

app.route('/remote-config/:tab', 'remote-config-tabs', function(tab) {
    this.remoteConfigView._tab = tab;
    this.renderWhenReady(this.remoteConfigView);
});

app.addPageScript("/manage/logger", function() {
    var rcLogItem = {
        name: jQuery.i18n.map["remote-config.title"],
        value: "logger-remote-config",
        type: "rc"
    };

    app.loggerView.loggerItems.push(rcLogItem);
    app.loggerView.refreshLoggerDropdown(rcLogItem.value);
});

$(document).ready(function() {
    if (typeof extendViewWithFilter === "function") {
        app.remoteConfigView.hideDrillEventMetaProperties = true;
        extendViewWithFilter(app.remoteConfigView);
    }

    app.addMenu("improve", {code: "remote-config", url: "#/remote-config", text: "sidebar.remote-config", icon: '<div class="logo"><i class="material-icons" style="transform:rotate(90deg)"> call_split </i></div>', priority: 20});
});

app.addPageScript("/manage/export/export-features", function() {
    $.when(countlyRemoteConfig.initialize()).then(function() {
        var parameters = countlyRemoteConfig.returnParameters();
        var parameterList = [];
        parameters.forEach(function(parameter) {
            parameterList.push({
                name: parameter.parameter_key,
                id: parameter._id
            });
        });
        var selectItem = {
            id: "remote-config",
            name: "Remote Config",
            children: parameterList
        };
        if (parameterList.length) {
            app.exportView.addSelectTable(selectItem);
        }
    });
});