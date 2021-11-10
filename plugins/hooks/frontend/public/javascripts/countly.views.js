/*global
  countlyView, $, jQuery,countlyGlobal, countlyAuth, app, T, Handlebars, hooksPlugin, _, moment, CountlyHelpers,
 */
window.HooksView = countlyView.extend({
    featureName: 'hooks',
    statusChanged: {},
    initialize: function() {
        var self = this;
        return $.when(
            T.get('/hooks/templates/main.html', function(src) {
                self.template = Handlebars.compile(src);
            }),
            T.get('/hooks/templates/drawer.html', function(src) {
                Handlebars.registerPartial("hooks-widget-drawer", src);
            }),
            hooksPlugin.requestHookList()).then(function() {});
    },
    beforeRender: function() {
    },
    renderCommon: function(refresh) {
        if (!refresh) {
            try {
                $(this.el).html(this.template({"email-placeholder": jQuery.i18n.map["hook.email-place-holder"]}));
            }
            catch (e) {
                //silent catch
            }
            this.renderTable();
            this.DrawerComponent = window.HooksDrawer(this);
            this.DrawerComponent.prepareDrawer();

            if (!countlyAuth.validateCreate(this.featureName)) {
                $('#create-hook').hide();
            }
        }
    },
    renderTable: function() {
        var pluginsData = [];
        var self = this;
        var hookList = hooksPlugin.getHookList();

        for (var i = 0; i < hookList.length; i++) {
            var appNameList = [];
            if (hookList[i].apps) {
                appNameList = _.map(hookList[i].apps, function(appID) {
                    return countlyGlobal.apps[appID] && countlyGlobal.apps[appID].name;
                });
            }

            pluginsData.push({
                id: hookList[i]._id,
                name: hookList[i].name || '',
                description: hookList[i].description || '-',
                appNameList: appNameList.join(', '),
                triggerCount: hookList[i].triggerCount || 0,
                lastTriggerTimestampString: hookList[i].lastTriggerTimestamp && moment(hookList[i].lastTriggerTimestamp).fromNow() || "-",
                lastTriggerTimestamp: hookList[i].lastTriggerTimestamp || 0,
                enabled: hookList[i].enabled || false,
                createdByUser: hookList[i].createdByUser || '',
                trigger: hookList[i].trigger,
                effects: hookList[i].effects,
                created_at: hookList[i].created_at || 0,
            });
        }

        var isAdmin = countlyGlobal.member.global_admin;
        var dataTableDefine = {
            "aaData": pluginsData,
            "aoColumns": [
                {
                    "mData": function(row, type) {
                        if (type === "display") {
                            var disabled = (row.prepackaged || !countlyAuth.validateUpdate(self.featureName)) ? 'disabled' : '';
                            var input = '<div class="on-off-switch ' + disabled + '">';
                            if (row.enabled) {
                                input += '<input type="checkbox" class="on-off-switch-checkbox hook-switcher" id="plugin-' + row.id + '" checked ' + disabled + '>';
                            }
                            else {
                                input += '<input type="checkbox" class="on-off-switch-checkbox hook-switcher" id="plugin-' + row.id + '" ' + disabled + '>';
                            }
                            input += '<label class="on-off-switch-label" for="plugin-' + row.id + '"></label>';
                            //input += '<span class="text">' + 'Enable' + '</span>';
                            return input;
                        }
                        else {
                            return row.enabled;
                        }
                    },
                    "sType": "string",
                    "sTitle": jQuery.i18n.map["common.status"],
                    "bSortable": false,
                    "sWidth": "8%",
                },
                {
                    "mData": function(row, type) {
                        if (type === "display") {
                            var input = '<div style="color:#444444;width: 90%;text-overflow:ellipsis;overflow:hidden;white-space:nowrap;">' + row.name + '</div>';
                            if (row.description) {
                                input += '<div style="color:#aaaaaa;width: 90%;text-overflow:ellipsis;overflow:hidden;white-space:nowrap;">' + row.description + '</div>';
                            }
                            return input;
                        }
                        else {
                            return row.enabled;
                        }
                    },
                    "sType": "string",
                    "bSortable": false,
                    "sTitle": jQuery.i18n.map["hooks.hook-name"],
                    "sWidth": "20%",

                },

                /*   {
                    "mData": 'appNameList',
                    "sType": "string",
                    "sTitle": jQuery.i18n.map["hooks.applications"],
                    "bSortable": false,
                },
                */
                {
                    "mData": function(row, type) {
                        var triggerNames = {
                            "APIEndPointTrigger": jQuery.i18n.map["hooks.trigger-api-endpoint-uri"],
                            "IncomingDataTrigger": jQuery.i18n.map["hooks.IncomingData"],
                            "InternalEventTrigger": jQuery.i18n.map["hooks.internal-event-selector-title"],
                        };

                        if (type === "display") {
                            var triggerText = triggerNames[row.trigger.type];
                            try {
                                if (row.trigger.type === "IncomingDataTrigger") {
                                    var event = row.trigger.configuration.event;
                                    var parts = event[0].split("***");
                                    triggerText += "<span style='margin-left:5px;font-weight: 400;'>" + parts[1] + "</span>";
                                }
                                if (row.trigger.type === "InternalEventTrigger") {
                                    event = row.trigger.configuration.eventType;
                                    triggerText += "<span style='margin-left:5px;font-weight: 400;'>" + event + "</span>";
                                }
                            }
                            catch (e) {
                                //silent catch
                            }

                            var effectList = "";
                            row.effects.forEach(function(effect) {
                                if (effect.type === "EmailEffect") {
                                    effectList += '<div class="table-effect-node"><div class="line-dot"></div><div class="dot"></div><div style="width:90%;text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">E-mail:' + "<span style='margin-left:5px;font-weight: 400;color:#444444;'>" + effect.configuration.address + '</span></div></div>';
                                }
                                if (effect.type === "HTTPEffect") {
                                    effectList += '<div class="table-effect-node"><div class="line-dot"></div><div class="dot"></div><div style="width:90%;text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">URL:' + "<span style='margin-left:5px;font-weight: 400;color:#444444;'>" + effect.configuration.url + '</span></div></div>';
                                }
                            });
                            var input = '<div style="color:#909090;text-transform:uppercase;">' + jQuery.i18n.map["hooks.trigger"] + '</div>';
                            input += '<div class="text" style="font-size:11px;color:#444444;">' + triggerText + '</div>';
                            input += '<div style="margin-top:12px; color:#909090;text-transform:uppercase;">' + jQuery.i18n.map["hooks.effects"] + '</div>';
                            input += '<div style="margin:5px 0 0 2px;">';
                            input += effectList;
                            //input += '<div class="table-effect-node"><div class="line-dot"></div><div class="dot"></div><div>E-mail: abc.com</div></div>';
                            // input += '<div class="table-effect-node"><div class="line-dot"></div><div class="dot"></div><div>E-mail: abc.com</div></div>';
                            input += '</div>';

                            return input;
                        }
                        else {
                            return row.trigger;
                        }
                    },
                    "sType": "string",
                    "sTitle": jQuery.i18n.map["hooks.trigger-and-effects"],
                    "sWidth": "25%",
                    "bSortable": false,

                },
                {
                    "mData": 'triggerCount',
                    "sType": "numeric",
                    "sTitle": jQuery.i18n.map["hooks.trigger-count"],
                    "bSortable": true,
                    "sWidth": "16%",
                },
                {
                    "mData": function(row, type) {
                        try {
                            if (type === "display") {
                                return "<div>" + row.lastTriggerTimestampString + "</div>";
                            }
                            return row.lastTriggerTimestamp;
                        }
                        catch (e) {
                            //silent catch
                        }
                    },
                    "sType": "string",
                    "sTitle": jQuery.i18n.map["hooks.trigger-last-time"],
                    "bSortable": true,
                    "sWidth": "16%",
                },
            ]
        };
        if (isAdmin) {
            dataTableDefine.aoColumns.push({
                "mData": function(row, type) {
                    try {
                        if (type === "display") {
                            var created_at_string = "";
                            if (row.created_at) {
                                created_at_string = moment(row.created_at).fromNow();
                            }
                            return "<div style='text-overflow:ellipsis; overflow:hidden; white-space:nowrap;'>" + row.createdByUser + "</div> <div style='color:#aaaaaa;margin-top:4px;text-overflow:ellipsis; overflow:hidden; white-space:nowrap;'>" + created_at_string + "</div>";
                        }
                        return row.createdByUser;
                    }
                    catch (e) {
                        //silent catch
                    }
                },
                "sType": "string",
                "sTitle": jQuery.i18n.map["hooks.create-by"],
                "bSortable": false,
                "sWidth": "10%",
            });
        }
        dataTableDefine.aoColumns.push({
            "mData": function(row) {
                if (!countlyAuth.validateUpdate(self.featureName) && !countlyAuth.validateDelete(self.featureName)) {
                    return "";
                }
                else {
                    return "<div class='options-item'>" +
                        "<div class='edit'></div>" +
                        "<div class='edit-menu hooks-menu'>" +
                        (countlyAuth.validateUpdate(self.featureName) ? "<div class='edit-hook item'" + " id='" + row.id + "'" + "><i class='fa fa-pencil'></i>" + jQuery.i18n.map["hooks.edit"] + "</div>" : "") +
                        (countlyAuth.validateDelete(self.featureName) ? "<div class='delete-hook item'" + " id='" + row.id + "'" + " data-name='" + row.name + "'" + "><i class='fa fa-trash'></i>" + jQuery.i18n.map["hooks.delete"] + "</div></div>" : "") +
                        "</div>";
                }
            },
            "bSortable": false,
        });
        try {
            this.dtable = $('#hooks-table').dataTable($.extend({}, $.fn.dataTable.defaults, dataTableDefine));
            this.dtable.stickyTableHeaders();
            this.dtable.fnSort([[0, 'asc']]);
        }
        catch (e) {
            //silent catch

        }
        $(window).click(function() {
            $(".options-item").find(".edit").next(".edit-menu").fadeOut();
        });

        $(".edit-hook").off("click").on("click", function(e) {
            var hookID = e.target.id;
            var formData = hooksPlugin.getHook(hookID);
            self.DrawerComponent.init();
            self.DrawerComponent.drawer.open();
            self.DrawerComponent.loadWidgetData(formData);
            $(self.DrawerComponent.drawer).find('.title span').first().html(jQuery.i18n.map["hooks.edit-your-hook"]);
            $(self.DrawerComponent.drawer).addClass("open editing");
        });


        $(".delete-hook").off("click").on("click", function(e) {
            var hookID = e.target.id;
            var name = $(e.target).attr("data-name");
            return CountlyHelpers.confirm(jQuery.i18n.prop("hooks.delete-confirm", "<b>" + name + "</b>"), "popStyleGreen", function(result) {
                if (result) {
                    hooksPlugin.deleteHook(hookID, function() {
                        hooksPlugin.requestHookList(function() {
                            self.renderTable();
                        });
                    });
                }
            }, [jQuery.i18n.map["common.no-dont-delete"], jQuery.i18n.map["hooks.yes-delete-hook"]], {title: jQuery.i18n.map["hooks.delete-confirm-title"], image: "delete-an-event"});
        });

        $(".hook-switcher").off("click").on("click", function() {
            var pluginId = this.id.toString().replace(/^plugin-/, '');
            var newStatus = $(this).is(":checked");
            var list = hooksPlugin.getHookList();
            var hookRecord = _.filter(list, function(item) {
                return item._id === pluginId;
            });
            if (hookRecord) {
                (hookRecord[0].enabled + '' !== newStatus + '') ? (self.statusChanged[pluginId] = newStatus) : (delete self.statusChanged[pluginId]);
            }
            var keys = _.keys(self.statusChanged);
            if (keys && keys.length > 0) {
                if (keys.length === 1) {
                    $(".data-save-bar-remind").text(jQuery.i18n.prop("hooks.make-change-remind"));
                }
                else {
                    $(".data-save-bar-remind").text(jQuery.i18n.prop("hooks.make-changes-remind", keys.length));
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
            hooksPlugin.updateHookStatus(self.statusChanged, function() {
                hooksPlugin.requestHookList(function() {
                    self.renderTable();
                });
            });
            return $(".data-saver-bar").addClass("data-saver-bar-hide");
        });

        // load menu
        $("body").off("click", ".options-item .edit").on("click", ".options-item .edit", function() {
            $(".options-item").find(".edit").next(".edit-menu").fadeOut();
            $(this).next(".edit-menu").fadeToggle();
            event.stopPropagation();
        });

        $(window).click(function() {
            $(".options-item").find(".edit").next(".edit-menu").fadeOut();
        });
    }
});

app.hooksView = new window.HooksView();

if (countlyAuth.validateRead(app.hooksView.featureName)) {
    app.route('/manage/hooks', 'hooks', function() {
        this.renderWhenReady(app.hooksView);
    });
}

$(document).ready(function() {
    if (countlyAuth.validateRead(app.hooksView.featureName)) {
        app.addMenu("management", {code: "hooks", url: "#/manage/hooks", text: "hooks.plugin-title", priority: 50});
    }
    //check if configuration view exists
    if (app.configurationsView) {
        app.configurationsView.registerLabel("hooks", "hooks.plugin-title");
        app.configurationsView.registerLabel("hooks.batchSize", "hooks.batch-size");
    }
});
