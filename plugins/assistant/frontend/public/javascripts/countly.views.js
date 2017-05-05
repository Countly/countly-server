window.AssistantView = {
    initialize: function(isRefresh) {
        if ($("#top-bar").find("#assistant-menu").length == 0) {
            var assistantMenu =
                '<div id="assistant-menu" class="dropdown icon" style="display: block">' +
                    '<div id="notification-icon" class="empty-state">' +
                        '<i class="ion-android-notifications"></i>' +
                    '</div>' +
                    '<div class="menu right" style="width: 400px; min-height:500px;"></div>' +
                '</div>';

            $("#top-bar").find(".right-menu").prepend(assistantMenu);
        }

        var self = this;
        if(this.template) {
            return $.when(countlyAssistant.initialize(isRefresh)).then(function () {
                self.renderCommon(false);
            });
        } else {
            return $.when($.get(countlyGlobal["path"]+'/assistant/templates/panel.html', function(src){
                self.template = Handlebars.compile(src);
            }), countlyAssistant.initialize()).then(function () {
                self.renderCommon(false);
            });
        }
    },
    renderCommon:function (isRefresh) {
        var data = countlyAssistant.getDataForApp(countlyCommon.ACTIVE_APP_ID);

        this.templateData = {
            "page-title":jQuery.i18n.map["assistant.title"],
            all_notifs: data.notifications,
            saved_private: data.notifs_saved_private,
            saved_global: data.notifs_saved_global,
            icon_styling_class: 'assistant_icon_regular'
        };

        var changeNotification = function (id, is_private, is_save, parent) {

            if(typeof Countly !== "undefined") {
                var nAction = is_save ? "save" : "unsave";
                var nKey = is_private ? "assistant-change-status-private" : "assistant-change-status-global";
                var sendObj = ['add_event', {
                    "key": nKey,
                    "count": 1,
                    "segmentation": {
                        "action" : nAction
                    }
                }];
                Countly.q.push(sendObj);
            }

            $.when(countlyAssistant.changeNotification(id, is_private, is_save)).then(function (data) {
                if(true || data.result == "Success"){//todo finish this
                    
                    var refresh_stuff = function () {
                        $.when(countlyAssistant.initialize()).then(function () {
                            self.renderCommon();
                            app.localize();

                        });
                    };

                    if(!is_save) {
                        parent.slideUp(function () {
                            refresh_stuff();
                        });
                    } else {
                        parent.fadeTo(500, 0.2, function () {
                            parent.fadeTo(500, 1, function () {
                                refresh_stuff();
                            });
                        });
                    }
                }
                else{
                    CountlyHelpers.alert(data.result, "red");
                }
            }).fail(function (data) {
                CountlyHelpers.alert(data, "red");
            });
        };

        var self = this;
        if (!isRefresh) {
            var topBarElem = $("#top-bar").find("#assistant-menu .menu");
            topBarElem.html(this.template(this.templateData));
            topBarElem.css("height", $( window ).height() * 0.8);

            $(window).on("resize", function() {
                $("#top-bar").find("#assistant-menu .menu").css("height", $( window ).height() * 0.8);
            });

            $("#assistant-tabs").tabs({
                selected: store.get("assistant_tab") || 0,
                show: function( event, ui ) {
                    store.set("assistant_tab", ui.index);

                    var tabName = ["all", "saved-private", "saved-global"][ui.index];
                    if(typeof Countly !== "undefined") {
                        Countly.q.push(['add_event', {
                            "key": "assistant-click-tab",
                            "count": 1,
                            "segmentation": {
                                "tab_name" : tabName
                            }
                        }]);
                    }
                }
            });

            $(".btn-save-global").on("click", function(){
                var id = $(this).data("id");//notification id
                var parent = $(this).parents(".assistant_notif");
                changeNotification(id, false, true, parent);
            });

            $(".btn-save-private").on("click", function(){
                var id = $(this).data("id");//notification id
                var parent = $(this).parents(".assistant_notif");
                //CountlyHelpers.alert(7, "green");
                changeNotification(id, true, true, parent);
            });

            $(".btn-unsave-global").on("click", function(){
                var id = $(this).data("id");//notification id
                var parent = $(this).parents(".assistant_notif");

                // Add force-clicked class to the menu to keep it open
                // until confirmation dialog closes
                $("#assistant-menu").addClass("force-clicked");

                CountlyHelpers.confirm(jQuery.i18n.map["assistant.confirm-unsave-global"], "red", function (result) {
                    setTimeout(function () {
                        var $asstMenu = $("#assistant-menu");

                        // Remove force-clicked class and add regular clicked class
                        $asstMenu.removeClass("force-clicked");
                        $asstMenu.addClass("clicked");
                    }, 1000);

                    if (!result) {
                        return true;
                    }
                    changeNotification(id, false, false, parent);
                });
            });

            $(".btn-unsave-private").on("click", function(){
                var id = $(this).data("id");//notification id
                var parent = $(this).parents(".assistant_notif");

                // Add force-clicked class to the menu to keep it open
                // until confirmation dialog closes
                $("#assistant-menu").addClass("force-clicked");

                CountlyHelpers.confirm(jQuery.i18n.map["assistant.confirm-unsave-private"], "red", function (result) {
                    setTimeout(function () {
                        var $asstMenu = $("#assistant-menu");

                        // Remove force-clicked class and add regular clicked class
                        $asstMenu.removeClass("force-clicked");
                        $asstMenu.addClass("clicked");
                    }, 1000);

                    if (!result) {
                        return true;
                    }
                    changeNotification(id, true, false, parent);
                });
            });
        }

        app.localize($("#assistant_container"));

        // Prevent clicks inside the container from closing the popup
        $("#assistant_container").on("click", function (e) {
            e.stopPropagation();
        });
    }
};

//register views

$(document).ready(function() {
    app.localize($("#assistant_container"));
    AssistantView.initialize();
    setInterval(function(){
        // Don't refresh if the assistant popup is open
        if (!$("#assistant-menu").hasClass("clicked")) {
            AssistantView.initialize(true);
        }
    }, 10000);
});