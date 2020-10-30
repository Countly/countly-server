/*global
    jQuery,
    app,
    hooksPlugin,
    CountlyHelpers,
    countlyGlobal,
    $
 */
window.HooksDrawer = function(HookView) {
    return {
        prepareDrawer: function() {
            var self = this;
            HookView.DrawerComponent.drawer = CountlyHelpers.createDrawer({
                id: "hooks-widget-drawer",
                form: $('#hooks-widget-drawer'),
                title: jQuery.i18n.map["hooks.drawer-create-title"],
                applyChangeTriggers: true,
                onUpdate: function() {
                    HookView.DrawerComponent.checkDisabled();
                },
                resetForm: function() {
                    $("#current_hook_id").text('');
                    $("#hook-name-input").val('');
                    $("#hook-description").val("");
                    $("#multi-app-dropdown").clyMultiSelectClearSelection({});
                    $("#single-hook-trigger-dropdown").clySelectSetSelection("", "");
                    $(".hook-effects-list").html("");
                    $("#create-widget").show();


                    $(HookView.DrawerComponent.drawer).find('.title span').first().html(jQuery.i18n.map["hooks.drawer-create-title"]);
                    $("#hooks-widget-drawer").find("#widget-types .opt").removeClass("disabled");
                    $("#create-widget").removeClass("disabled");

                    self.checkDrawerInterval = setInterval(function() {
                        self.drawer._applyChangeTrigger(self.drawer);
                        self.checkDisabled();
                        if (!app.activeView.DrawerComponent) {
                            clearInterval(self.checkDrawerInterval);
                        }
                    }, 1000);
                },
                onClosed: function() {
                    clearInterval(self.checkDrawerInterval);
                }
            });
            $("#create-hook").off("click").on("click", function() {
                self.init();
                self.drawer.resetForm();
                self.drawer.open();
                self.checkDisabled();
            });
        },
        init: function() {
            var self = this;
            var apps = [];
            //description


            //select apps
            for (var appId in countlyGlobal.apps) {
                apps.push({ value: appId, name: countlyGlobal.apps[appId].name });
            }
            $("#multi-app-dropdown").clyMultiSelectSetItems(apps);

            // clear app  selected value
            // $("#multi-app-dropdown").clyMultiSelectClearSelection({});

            //trigger selector
            var triggers = hooksPlugin.getHookTriggers();
            var triggerSelectorItems = [];
            for (var trigger in triggers) {
                triggerSelectorItems.push({value: trigger, name: triggers[trigger].name});
            }

            $("#single-hook-trigger-dropdown").off("cly-select-change").on("cly-select-change", function(e, selected) {
                selected = selected.value || selected;
                $(".hook-trigger-view").html($("#template-hook-trigger-" + selected).html());
                if (triggers[selected] && (triggers[selected]).init) {
                    (triggers[selected]).init();
                    app.localize();
                }
                else {
                    $(".hook-trigger-view").html("");
                }
            });

            $("#single-hook-trigger-dropdown").clySelectSetItems(triggerSelectorItems);

            // effects
            var effects = hooksPlugin.getHookEffects();
            var effectsSelectorItems = [];
            for (var effect in effects) {
                effectsSelectorItems.push({value: effect, name: effects[effect].name});
            }

            $(".add-effect-button").off("click").on("click", function() {
                $(".hook-effects-list").append($("#template-hook-effect-selector").html());
                $(".single-hook-effect-dropdown").clySelectSetItems(effectsSelectorItems);
                app.localize($(".effects-block"));
                $(".single-hook-effect-dropdown").off("cly-select-change").on("cly-select-change", function(e, selected) {
                    $(e.currentTarget.parentElement.nextElementSibling).html($("#template-hook-effect-" + selected).html());
                    (effects[selected]).init(e.currentTarget.parentElement.nextElementSibling);
                    self.drawer._applyChangeTrigger(self.drawer);
                    app.localize($(".effects-block"));
                });
                $(".delete-effect-button").off("click").on("click", function(e) {
                    var effectDom = e.currentTarget.parentElement.parentElement;
                    $(effectDom).remove();
                    self.drawer._applyChangeTrigger(self.drawer);
                    self.checkDisabled();
                });
                self.drawer._applyChangeTrigger(self.drawer);
                self.checkDisabled();
            });
            $(".add-effect-button").trigger("click");
            self.drawer._applyChangeTrigger();
            $("#save-widget").hide();

            $("#create-widget").off().on("click", function() {
                var hooksConfig = self.getWidgetSettings(true);
                for (var key in hooksConfig) {
                    if (hooksConfig[key] === null) {
                        return;
                    }
                }
                self.drawer.close();

                hooksPlugin.saveHook(hooksConfig, function callback() {
                    hooksPlugin.requestHookList(function() {
                        app.hooksView.renderTable();
                    });
                });
            });

            $("#save-widget").off("click").on("click", function() {
                var hooksConfig = self.getWidgetSettings();
                for (var key in hooksConfig) {
                    if (hooksConfig[key] === null) {
                        return;
                    }
                }
                self.drawer.close();
                hooksPlugin.saveHook(hooksConfig, function callback() {
                    hooksPlugin.requestHookList(function() {
                        app.hooksView.renderTable();
                    });
                });
            });
        },
        getWidgetSettings: function(enabled) {
            var self = this;
            var hookInstance = {
                name: $("#hook-name-input").val()||null,
                apps: $("#multi-app-dropdown").clyMultiSelectGetSelection(),
                trigger: null,
                effects: null,
            };
            if ($("#current_hook_id").text().length > 0) {
                hookInstance._id = $("#current_hook_id").text();
            }

            hookInstance.description = $("#hook-description").val() || "";
            if (hookInstance.apps.length === 0) {
                hookInstance.apps = null;
            }
            if (enabled) {
                hookInstance.enabled = true;
            }

            // trigger
            hookInstance.trigger = self.getValidTriggerConfig();

            // effects
            hookInstance.effects = self.getValidEffectsConfig();
            return hookInstance;
        },
        checkDisabled: function() {
            var hookConfig = this.getWidgetSettings();
            $("#create-widget").removeClass("disabled");
            $("#save-widget").removeClass("disabled");
            for (var key in hookConfig) {
                if (hookConfig[key] === null) {
                    $("#create-widget").addClass("disabled");
                    $("#save-widget").addClass("disabled");
                }
            }
        },
        loadWidgetData: function(data) {
            this.drawer.resetForm();
            $("#current_hook_id").text(data._id);
            $("#hook-name-input").val(data.name);
            if (data.description) {
                $("#hook-description").val(data.description);
            }

            var selectedApps = [];
            for (var index in data.apps) {
                var appId = data.apps[index];
                selectedApps.push({ value: appId, name: countlyGlobal.apps[appId].name });
            }
            $("#multi-app-dropdown").clyMultiSelectSetSelection(selectedApps);

            // load trigger
            var triggerModels = hooksPlugin.getHookTriggers();
            var trigger = triggerModels[data.trigger.type];
            $("#single-hook-trigger-dropdown").clySelectSetSelection(data.trigger.type, trigger.name);
            trigger.renderConfig(data.trigger);

            // load Effects
            var effectModels = hooksPlugin.getHookEffects();
            for (var i = 0; i < data.effects.length; i++) {
                var effect = data.effects[i];
                $(".add-effect-button").trigger("click");
                var effectDom = $(".hook-effect-item").last();
                $(effectDom).find(".single-hook-effect-dropdown").clySelectSetSelection(effect.type, effectModels[effect.type].name);
                effectModels[effect.type].renderConfig(effect, effectDom);
            }

            $("#create-widget").hide();
            $("#save-widget").show();
            return;
        },

        getValidTriggerConfig: function() {
            var triggerType = $("#single-hook-trigger-dropdown").clySelectGetSelection();
            if (!triggerType) {
                return null;
            }
            triggerType = triggerType.value || triggerType;
            var triggerModels = hooksPlugin.getHookTriggers();
            var triggerConfig = triggerModels[triggerType].getValidConfig();

            if (!triggerConfig) {
                return null;
            }

            var config = {};
            config.type = triggerType;
            config.configuration = triggerConfig;
            return config;
        },

        getValidEffectsConfig: function() {
            var effectDoms = $(".hook-effect-item");
            var configs = [];
            var effectModels = hooksPlugin.getHookEffects();
            if (effectDoms.length === 0) {
                return null;
            }
            for (var i = 0; i < effectDoms.length; i++) {
                var effectType = $(effectDoms[i]).find(".single-hook-effect-dropdown").clySelectGetSelection();

                if (!effectType) {
                    return null;
                }
                var configuration = effectModels[effectType].getValidConfig && effectModels[effectType].getValidConfig(effectDoms[i]);
                if (!configuration) {
                    return null;
                }
                var effect = {type: effectType, configuration: configuration};
                configs.push(effect);
            }
            return configs;
        }
    };
};
