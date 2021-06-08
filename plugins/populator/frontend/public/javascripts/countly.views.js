/*global countlyPopulator, countlyAuth, countlyGlobal, store, countlyCommon, $, moment, app, countlyView, T, jQuery, PopulatorView, CountlyHelpers, countlyVue*/

window.PopulatorView = countlyView.extend({
    featureName: 'populator',
    _tab: 'populator',
    templateTable: undefined,
    templateId: undefined,
    rowInEdit: undefined,
    initialize: function() {
    },
    beforeRender: function() {
        if (!this.template) {
            var self = this;
            return $.when(T.render('/populator/templates/populate.html', function(src) {
                self.template = src;
            })).then(function() {});
        }
    },
    renderTab: function() {
        $(".populator-tab-switcher .populator-tab-item:not([data-target='" + this._tab + "'])").removeClass("active");
        $(".populator-tab-switcher .populator-tab-item[data-target='" + this._tab + "']").addClass("active");
        $(".populator-tab-view:not(#" + this._tab + ")").hide();
        $("#" + this._tab + "-tab").show();
    },
    updateTemplateSelector: function() {
        countlyPopulator.getTemplates(function(templates) {
            var templateList = [];

            templates.forEach(function(template) {
                templateList.push({name: template.name, value: template._id});
            });

            $(".populator-template-name.cly-select").clySelectSetItems(templateList);
        });
    },
    renderTemplatesTable: function() {
        var self = this;

        var columnsDefine = [{
            mData: "name",
            sType: "string",
            sTitle: jQuery.i18n.map["populator.template"],
            bSortable: false
        }, {
            mData: function(row) {
                return row.isDefault ? $.i18n.map["populator.template-type-default"] : $.i18n.map["populator.template-type-custom"];
            },
            sType: "string",
            sTitle: jQuery.i18n.map["populator.template-type"],
            bSortable: false
        }, {
            mData: function(row) {
                return (row && row.up && Object.keys(row.up).length) || 0;
            },
            sType: "numeric",
            sTitle: jQuery.i18n.map["populator.number-of-user-props"],
            bSortable: true
        }, {
            mData: function(row) {
                return (row && row.events && Object.keys(row.events).length) || 0;
            },
            sType: "numeric",
            sTitle: jQuery.i18n.map["populator.number-of-events"],
            bSortable: true
        }, {
            mData: function(row) {
                return (row && row.lastEditedBy || "-");
            },
            sType: "string",
            sTitle: jQuery.i18n.map["populator.edited-by"],
            bSortable: false
        }];

        columnsDefine.push({
            mData: function(row) {
                var editMenu = "<div class='populator-template-options-item options-item' data-id='" + row._id + "'>" +
                        "<div class='edit-icon'></div>" +
                        "<div class='edit-menu populator-template-menu'>";

                if (row.isDefault && countlyAuth.validateCreate(self.featureName)) {
                    editMenu += "<div class='duplicate-populator-template item' data-localize='populator.duplicate-template'><i class='fa fa-clone'></i>" + $.i18n.map["populator.duplicate-template"] + "</div>";
                }
                else {
                    editMenu += (countlyAuth.validateUpdate(self.featureName) ? "<div class='edit-populator-template item' data-localize='populator.edit-template'><i class='fa fa-pencil'></i>" + $.i18n.map["populator.edit-template"] + "</div>" : "") +
                        (countlyAuth.validateCreate(self.featureName) ? "<div class='duplicate-populator-template item' data-localize='populator.duplicate-template'><i class='fa fa-clone'></i>" + $.i18n.map["populator.duplicate-template"] + "</div>" : "") +
                        (countlyAuth.validateDelete(self.featureName) ? "<div class='delete-populator-template item' data-localize='populator.delete-template'><i class='fa fa-trash'></i>" + $.i18n.map["populator.delete-template"] + "</div>" : "");
                }

                editMenu += "</div></div>";

                return editMenu;
            },
            bSortable: false
        });

        countlyPopulator.getTemplates(function(templates) {
            self.templateTable = $('#populator-templates-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                aaData: templates || [],
                aoColumns: columnsDefine
            }));

            var templateList = [];
            (templates || []).forEach(function(template) {
                templateList.push({name: template.name, value: template._id});
            });

            $(".populator-template-name.cly-select").clySelectSetItems(templateList);
        });

        $("#templates-tab").off("click", ".edit-icon").on("click", ".edit-icon", function(e) {
            var menu = $(e.currentTarget).parents(".populator-template-options-item").find(".edit-menu");
            $("#templates-tab .edit-menu").not(menu).hide();
            menu.toggle();
            /*
            if (!menu.is(":hidden")) {
                setTimeout(function() { menu.find(".edit-menu").hide(); }, 5000);
            }
            */
        });

        $("#templates-tab").off("click", ".edit-populator-template").on("click", ".edit-populator-template", function(e) {
            var cell = $(e.currentTarget).parents(".populator-template-options-item");
            cell.find(".edit-menu").hide();
            countlyPopulator.getTemplate(cell.data("id"), function(template) {
                self.renderTemplateDrawer(template);
                self.templateId = cell.data("id");
                self.rowInEdit = cell.parents("tr")[0];
                $("#populator-template-drawer").addClass("open");
            });
        });

        $("#templates-tab").off("click", ".duplicate-populator-template").on("click", ".duplicate-populator-template", function(e) {
            var cell = $(e.currentTarget).parents(".populator-template-options-item");
            cell.find(".edit-menu").hide();
            countlyPopulator.getTemplate(cell.data("id"), function(template) {
                self.renderTemplateDrawer(template, true);
                $("#populator-template-drawer").addClass("open");
            });
        });

        $("#templates-tab").off("click", ".delete-populator-template").on("click", ".delete-populator-template", function(e) {
            var cell = $(e.currentTarget).parents(".populator-template-options-item");
            cell.find(".edit-menu").hide();
            countlyPopulator.removeTemplate(cell.data("id"), function() {
                self.templateTable.fnDeleteRow(cell.parents("tr")[0]);
                self.updateTemplateSelector();
            });
        });
    },
    renderTemplateDrawer: function(templateData, forceCreate) {
        var self = this;
        var isEditing = (typeof templateData !== "undefined") && !forceCreate;

        $("#drawer-title").text(isEditing ? $.i18n.prop("populator.edit-template", templateData && templateData.name || "") : $.i18n.prop("populator.create-template"));
        $("#populator-template-name").val(templateData && templateData.name || "");
        $(".populator-custom-user-prop-row.header-row").hide();
        $(".populator-custom-user-prop-row:not(.header-row)").remove();
        $("#populator-template-events > .populator-event-row").remove();

        if (isEditing) {
            $("#populator-template-discard-changes").show();
        }
        else {
            $("#populator-template-discard-changes").hide();
        }

        if ($("#populator-template-name").val() === "") {
            $("#populator-template-save").addClass("disabled");
        }
        else {
            $("#populator-template-save").removeClass("disabled");
        }

        $("#populator-template-name").off("change paste keyup").on("change paste keyup", function() {
            if ($("#populator-template-name").val() === "") {
                $("#populator-template-save").addClass("disabled");
            }
            else {
                $("#populator-template-save").removeClass("disabled");
            }
        });

        if (templateData && templateData.up && Object.keys(templateData.up).length > 0) {
            $(".populator-custom-user-prop-row.header-row").show();

            Object.keys(templateData.up).forEach(function(key) {
                $(".populator-custom-user-prop-row:last").after(
                    "<div class=\"populator-custom-user-prop-row\">" +
                        "<input class=\"input populator-custom-user-prop-key\" type=\"text\" class=\"input\" value=\"" + key + "\"/>" +
                        "<input class=\"input populator-custom-user-prop-values\" type=\"text\" class=\"input\" value=\"" + templateData.up[key].map(function(val) {
                        return val + "";
                    }).join(", ") + "\"/>" +
                        "<div class=\"icon-button remove text-light-gray\"><i class=\"material-icons\">highlight_off</i></div>" +
                    "</div>"
                );

                app.localize($("#populator-template-drawer"));
            });
        }
        else {
            $(".populator-custom-user-prop-row.header-row").hide();
        }

        Object.keys(templateData && templateData.events || {}).forEach(function(key) {
            var eventVariants = templateData.events[key];

            if (!Array.isArray(eventVariants)) {
                eventVariants = [eventVariants];
            }

            eventVariants.forEach(function(event) {
                var row =
                    "<div class=\"populator-event-row\">" +
                    "<div class=\"populator-event-key-row\">" +
                    "<div class=\"label\" data-localize=\"populator.event-key\"></div>" +
                    "<input type=\"text\" class=\"input\" value=\"" + key + "\"/>" +
                    "<div class=\"populator-template-remove-event text-link\" data-localize=\"populator.remove-event\"></div>" +
                    "</div>" +
                    "<div class=\"populator-event-segmentation-table\">" +
                    "<div class=\"populator-event-segmentation-row header-row\">" +
                    "<div class=\"label populator-event-segmentation-key\" data-localize=\"populator.segmentation-key\"></div>" +
                    "<div class=\"label populator-event-segmentation-values\" data-localize=\"populator.segmentation-values\"></div>" +
                    "</div>";

                if (event.segments && Object.keys(event.segments).length > 0) {
                    Object.keys(event.segments).forEach(function(segmentationKey) {
                        row +=
                            "<div class=\"populator-event-segmentation-row\">" +
                            "<input class=\"input populator-event-segmentation-key\" type=\"text\" class=\"input\"/ value=\"" + segmentationKey + "\">" +
                            "<input class=\"input populator-event-segmentation-values\" type=\"text\" class=\"input\"/ value=\"" + event.segments[segmentationKey].join(", ") + "\">" +
                            "<div class=\"icon-button remove text-light-gray\"><i class=\"material-icons\">highlight_off</i></div>" +
                            "</div>";
                    });
                }

                row += "</div><div class=\"populator-event-add-segmentation text-link\" data-localize=\"populator.add-segmentation\"></div>";
                row += "<div class=\"populator-event-property populator-template-event-duration\"><div class=\"fa check-green " + (event.duration ? "fa-check-square" : "fa-square-o") + "\"></div><div class=\"content\"><div class=\"help-title\" data-localize=\"populator.duration-help-title\"></div><div class=\"help-subtitle\" data-localize=\"populator.duration-help-subtitle\"></div><div class=\"event-property-inputs\"><input type=\"number\" class=\"input duration-start\" value=\"" + (event.duration && event.duration[0] || "") + "\"/><span> - </span><input type=\"number\" class=\"input duration-end\" value=\"" + (event.duration && event.duration[1] || "") + "\"/></div></div></div>";
                row += "<div class=\"populator-event-property populator-template-event-sum\"><div class=\"fa check-green " + (event.sum ? "fa-check-square" : "fa-square-o") + "\"></div><div class=\"content\"><div class=\"help-title\" data-localize=\"populator.sum-help-title\"></div><div class=\"help-subtitle\" data-localize=\"populator.sum-help-subtitle\"></div><div class=\"event-property-inputs\"><input type=\"number\" class=\"input sum-start\" value=\"" + (event.sum && event.sum[0] || "") + "\"/><span> - </span><input type=\"number\" class=\"input sum-end\" value=\"" + (event.sum && event.sum[1] || "") + "\"/></div></div></div>";

                $("#populator-template-add-event").before(row);

                if (!(event.segments && Object.keys(event.segments).length > 0)) {
                    $("#populator-template-drawer .populator-event-row:last .populator-event-segmentation-table .header-row").hide();
                }
            });
        });
        app.localize($("#populator-template-drawer"));

        $("#populator-add-custom-user-prop").off("click").on("click", function() {
            $(".populator-custom-user-prop-row.header-row").show();

            $(".populator-custom-user-prop-row:last").after(
                "<div class=\"populator-custom-user-prop-row\">" +
                    "<input class=\"input populator-custom-user-prop-key\" type=\"text\" class=\"input\"/>" +
                    "<input class=\"input populator-custom-user-prop-values\" type=\"text\" class=\"input\"/>" +
                    "<div class=\"icon-button remove text-light-gray\"><i class=\"material-icons\">highlight_off</i></div>" +
                "</div>"
            );
            app.localize($("#populator-template-drawer"));
        });

        $("#populator-template-add-event").off("click").on("click", function() {
            $("#populator-template-add-event").before(
                "<div class=\"populator-event-row\">" +
                        "<div class=\"populator-event-key-row\">" +
                            "<div class=\"label\" data-localize=\"populator.event-key\"></div>" +
                            "<input type=\"text\" class=\"input\"/>" +
                            "<div class=\"populator-template-remove-event text-link\" data-localize=\"populator.remove-event\"></div>" +
                        "</div>" +
                        "<div class=\"populator-event-segmentation-table\">" +
                            "<div class=\"populator-event-segmentation-row header-row\" style=\"display: none;\">" +
                                "<div class=\"label populator-event-segmentation-key\" data-localize=\"populator.segmentation-key\"></div>" +
                                "<div class=\"label populator-event-segmentation-values\" data-localize=\"populator.segmentation-values\"></div>" +
                            "</div>" +
                        "</div>" +
                        "<div class=\"populator-event-add-segmentation text-link\" data-localize=\"populator.add-segmentation\"></div>" +
                        "<div class=\"populator-event-property populator-template-event-duration\"><div class=\"fa check-green fa-square-o\"></div><div class=\"content\"><div class=\"help-title\" data-localize=\"populator.duration-help-title\"></div><div class=\"help-subtitle\" data-localize=\"populator.duration-help-subtitle\"></div><div class=\"event-property-inputs\"><input class=\"input duration-start\"/><span> - </span><input class=\"input duration-end\"/></div></div></div>" +
                        "<div class=\"populator-event-property populator-template-event-sum\"><div class=\"fa check-green fa-square-o\"></div><div class=\"content\"><div class=\"help-title\" data-localize=\"populator.sum-help-title\"></div><div class=\"help-subtitle\" data-localize=\"populator.sum-help-subtitle\"></div><div class=\"event-property-inputs\"><input class=\"input sum-start\"/><span> - </span><input class=\"input sum-end\"/></div></div></div>" +
                    "</div>"
            );
            app.localize($("#populator-template-drawer"));
        });

        $("#populator-template-drawer").off("click", ".populator-event-row .populator-event-add-segmentation").on("click", ".populator-event-row .populator-event-add-segmentation", function(e) {
            var event = $(e.currentTarget).parents(".populator-event-row");
            event.find(".populator-event-segmentation-row.header-row").show();

            event.find(".populator-event-segmentation-row:last").after(
                "<div class=\"populator-event-segmentation-row\">" +
                    "<input class=\"input populator-event-segmentation-key\" type=\"text\" class=\"input\"/>" +
                    "<input class=\"input populator-event-segmentation-values\" type=\"text\" class=\"input\"/>" +
                    "<div class=\"icon-button remove text-light-gray\"><i class=\"material-icons\">highlight_off</i></div>" +
                "</div>"
            );
        });

        $("#populator-template-drawer").off("click", ".populator-custom-user-prop-row .remove").on("click", ".populator-custom-user-prop-row .remove", function(e) {
            var row = $(e.currentTarget).parents(".populator-custom-user-prop-row");
            if (row.is(":nth-child(2)") && $(".populator-custom-user-prop-row").length < 3) {
                $(".populator-custom-user-prop-row.header-row").hide();
            }
            row.remove();
        });

        $("#populator-template-drawer").off("click", ".populator-event-segmentation-row .remove").on("click", ".populator-event-segmentation-row .remove", function(e) {
            var row = $(e.currentTarget).parents(".populator-event-segmentation-row");
            var event = $(e.currentTarget).parents(".populator-event-row");
            if (row.is(":nth-child(2)") && event.find(".populator-event-segmentation-row").length < 3) {
                event.find(".populator-event-segmentation-row.header-row").hide();
            }
            row.remove();
        });

        $("#populator-template-drawer").off("click", ".populator-template-remove-event").on("click", ".populator-template-remove-event", function(e) {
            $(e.currentTarget).parents(".populator-event-row").remove();
        });

        $("#populator-template-drawer").off("click", ".populator-event-property .check-green").on("click", ".populator-event-property .check-green", function(e) {
            var checkbox = $(e.currentTarget);

            if (checkbox.hasClass("fa-check-square")) {
                checkbox.removeClass("fa-check-square");
                checkbox.addClass("fa-square-o");
            }
            else {
                checkbox.addClass("fa-check-square");
                checkbox.removeClass("fa-square-o");
            }
        });

        $("#populator-template-drawer .close").off("click").on("click", function() {
            $("#populator-template-drawer").removeClass("open");
        });

        $("#populator-template-discard-changes").off("click").on("click", function() {
            $("#populator-template-drawer").removeClass("open");
        });

        $("#create-populator-template-button").off("click").on("click", function() {
            self.renderTemplateDrawer();
            $("#populator-template-drawer").addClass("open");
        });

        $("#populator-template-save").off("click").on("click", function(e) {
            if ($(e.currentTarget).hasClass("disabled")) {
                return;
            }

            if (isEditing) {
                countlyPopulator.editTemplate(self.templateId, self.getTemplateData(), function() {
                    self.templateTable.fnUpdate(self.getTemplateData(self.templateId), self.rowInEdit);
                    self.updateTemplateSelector();
                });
            }
            else {
                countlyPopulator.createTemplate(self.getTemplateData(), function(message) {
                    var messageWords = message.result.split(/\s+/);
                    self.templateTable.fnAddData(self.getTemplateData(messageWords[messageWords.length - 1]));
                    self.updateTemplateSelector();
                });
            }
            $("#populator-template-drawer").removeClass("open");
        });

        document.onkeydown = function(evt) {
            evt = evt || window.event;

            if (("key" in evt) && (evt.key === "Escape" || evt.key === "Esc") || (evt.keyCode === 27)) {
                $("#populator-template-drawer").removeClass("open");
            }
        };
    },
    getTemplateData: function(templateId) {
        var templateData = {_id: templateId};

        /**
         * Tries to parse a string into a boolean or a number value
         * @param {string} s a user input word
         * @returns {boolean|number|string} the cast value
         */
        function dynamicCast(s) {
            if (["true", "false"].indexOf(s) !== -1) {
                return s === "true";
            }
            else if (/^[0-9]+$/.test(s)) {
                return parseInt(s);
            }
            else {
                return s + "";
            }
        }

        /**
         * Tries to parse an array of strings into a homogeneous array of string, number or boolean values
         * @param {array} arr an array of user input words
         * @returns {array} array of cast values
         */
        function processValues(arr) {
            var values = [dynamicCast(arr[0])];
            var lastType = typeof values[0];

            for (var i = 1; i < arr.length; i++) {
                var currentValue = dynamicCast(arr[i]);
                var currentType = typeof currentValue;

                if (lastType !== currentType) {
                    return arr;
                }

                values.push(currentValue);
            }

            return values;
        }

        templateData.name = $("#populator-template-name").val();

        if ($(".populator-custom-user-prop-row:not(.header-row)").length > 0) {
            templateData.up = {};

            $(".populator-custom-user-prop-row:not(.header-row)").each(function(index, row) {
                templateData.up[$(row).find(".input.populator-custom-user-prop-key").val()] = processValues($(row).find(".input.populator-custom-user-prop-values").val().split(/\s*,\s*/));
            });
        }

        if ($(".populator-event-row").length > 0) {
            templateData.events = {};

            $(".populator-event-row").each(function(index, row) {
                var eventKey = $(row).find(".populator-event-key-row input").val();
                var eventData = {};

                if ($(row).find(".populator-event-segmentation-row:not(.header-row)").length > 0) {
                    eventData.segments = {};

                    $(row).find(".populator-event-segmentation-row:not(.header-row)").each(function(segmentationIndex, segmentationRow) {
                        eventData.segments[$(segmentationRow).find("input.populator-event-segmentation-key").val()] = processValues($(segmentationRow).find("input.populator-event-segmentation-values").val().split(/\s*,\s*/));
                    });
                }

                if ($(row).find(".populator-template-event-duration .check-green").hasClass("fa-check-square")) {
                    eventData.duration = [parseInt($(row).find(".duration-start").val()) || 0, parseInt($(row).find(".duration-end").val()) || 0];
                }

                if ($(row).find(".populator-template-event-sum .check-green").hasClass("fa-check-square")) {
                    eventData.sum = [parseFloat($(row).find(".sum-start").val()) || 0, parseFloat($(row).find(".sum-end").val()) || 0];
                }

                if (!Object.prototype.hasOwnProperty.call(templateData.events, eventKey)) {
                    templateData.events[eventKey] = [];
                }

                templateData.events[eventKey].push(eventData);
            });
        }

        return templateData;
    },
    renderCommon: function() {
        this.templateData = {
            "page-title": jQuery.i18n.map["populator.plugin-title"]
        };

        var self = this;
        var now = new Date();
        var fromDate = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30);
        var toDate = now;
        var maxTime = 60;
        var maxTimeout;

        $(this.el).html(this.template(this.templateData));

        if (!countlyAuth.validateCreate('populator')) {
            $("#create-populator-template-button").hide();
        }
        else {
            $("#create-populator-template-button").show();
        }

        if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].locked) {
            $("#populator-locked").show();
            $("#populator > .content").hide();
        }
        else {
            $("#populator-locked").hide();
            $("#populator > .content").show();
        }

        self.renderTab();
        self.renderTemplatesTable();
        self.renderTemplateDrawer();

        $(".populator-tab-switcher .populator-tab-item").off("click").on("click", function(e) {
            self._tab = $(e.target).data("target");
            self.renderTab();
        });

        var setInitialDateValues = false;

        setInterval(function updateDateRangeButton() {
            if (app.activeView === self) {
                if (!setInitialDateValues) {
                    $("#populator #date-picker #date-from").datepicker("setDate", fromDate);
                    $("#populator #date-picker #date-to").datepicker("setDate", toDate);
                    setInitialDateValues = true;
                }

                fromDate = $("#populator #date-picker #date-from").datepicker("getDate") || fromDate;
                toDate = $("#populator #date-picker #date-to").datepicker("getDate") || toDate;
                $("#populator #selected-date").text(moment(fromDate).format("D MMM, YYYY") + " - " + moment(toDate).format("D MMM, YYYY"));
            }
        }, 500);

        $("#start-populate").addClass("disabled");
        $(".populator-template-name.cly-select").on("cly-select-change", function() {
            $("#start-populate").removeClass("disabled");
        });

        $("#start-populate").on('click', function() {
            if ($("#start-populate").hasClass("disabled")) {
                CountlyHelpers.notify({
                    message: jQuery.i18n.map["populator.select-a-template-first"],
                    type: "error"
                });
                return;
            }

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
                    countlyPopulator.stopGenerating(function() {
                        $('.stop-populate').trigger("click");
                    });
                }, maxTime * 1000);

                fromDate = $("#populator #date-picker #date-from").datepicker("getDate") || fromDate;
                toDate = $("#populator #date-picker #date-to").datepicker("getDate") || toDate;
                countlyPopulator.setStartTime(fromDate.getTime() / 1000);
                countlyPopulator.setEndTime(toDate.getTime() / 1000);
                if ($(".populator-template-name.cly-select").clySelectGetSelection()) {
                    countlyPopulator.getTemplate($(".populator-template-name.cly-select").clySelectGetSelection(), function(template) {
                        countlyPopulator.generateUsers(maxTime * 4, template);
                    });
                }
                else {
                    countlyPopulator.generateUsers(maxTime * 4);
                }
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
        /*if (this.state === "/autostart") {
            $("#start-populate").click();
        }*/
        if (!countlyAuth.validateCreate(self.featureName)) {
            $('#populator-tab').hide();
            $('#create-populator-template-button').hide();
        }
    },
    refresh: function() {}
});

//register views
app.populatorView = new PopulatorView();

app.route('/manage/populate*state', 'populate', function(state) {
    if (countlyAuth.validateRead(app.populatorView.featureName)) {
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

    if (countlyAuth.validateRead(app.populatorView.featureName)) {
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
    }
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
    if (countlyAuth.validateRead(app.populatorView.featureName)) {
        app.addSubMenu("management", {code: "populate", url: "#/manage/populate", text: "populator.title", priority: 70, classes: "populator-menu"});
    }
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

countlyVue.container.registerMixin("/manage/export/export-features", {
    beforeCreate: function() {
        var self = this;
        countlyPopulator.getTemplates(function(templates) {
            var templateList = [];
            templates.forEach(function(template) {
                if (!template.isDefault) {
                    templateList.push({
                        id: template._id,
                        name: template.name
                    });
                }
            });
            var selectItem = {
                id: "populator",
                name: "Populator Templates",
                children: templateList
            };
            if (templateList.length) {
                self.$store.dispatch("countlyConfigTransfer/addConfigurations", selectItem);
            }
        });
    }
});