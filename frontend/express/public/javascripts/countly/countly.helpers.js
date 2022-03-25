/* global _, countlyGlobal, countlyCommon, _JSONEditor, app, TableTools, countlyDeviceDetails, moment, jQuery, $, store, Handlebars, countlyTaskManager, countlyVue*/
/*
 Some helper functions to be used throughout all views. Includes custom
 popup, alert and confirm dialogs for the time being.
 */
/**
 * Some helper functions to be used throughout all views. Includes custom popup, alert and confirm dialogs for the time being.
 * @name CountlyHelpers
 * @global
 * @namespace CountlyHelpers
 */
(function(CountlyHelpers) {

    CountlyHelpers.logout = function(path) {
        if (path) {
            window.location = "/logout";
        }
        else {
            window.location.reload();//this will log us out
        }
    };
    /**
    * Legacy method for displaying notifications. User {@link CountlyHelpers.notify} instead
    * @param {string} msg - msg to display
    * @returns {boolean} true - if message is not defined, else returns nothing
    */
    CountlyHelpers.parseAndShowMsg = function(msg) {
        if (!msg || !msg.length) {
            return true;
        }

        if (_.isArray(msg)) {
            msg = msg[0];
        }

        var type = "info",
            message = "",
            msgArr = msg.split("|");

        if (msgArr.length > 1) {
            type = msgArr[0];
            message = msgArr[1];
        }
        else {
            message = msg;
        }

        CountlyHelpers.notify({type: type, message: message});

        delete countlyGlobal.message;
    };
    /**
    * Display modal popup that requires confirmation input from user and optional checkbox
    * @param {string} msg - message to display in alert popup
    * @param {string} type - type of alert red for errors and green for success
    * @param {boolean} hasCheckbox - popup has checkbox? or not.
    * @param {string} checkboxTitle - title of checkbox element
    * @param {function} callback - to determine result of the input
    * @param {array=} buttonText - [0] element for cancle button text and [1] element for confirm button text
    * @example
    * CountlyHelpers.confirmWithCheckbox("Are you sure?", "red", true, "Chechbox label text", function (result) {
    *    if (!result) {
    *        //user did not confirm, just exit
    *        return true;
    *    }
    *    //user confirmed, do what you need to do
    * });
    */
    CountlyHelpers.confirmWithCheckbox = function(msg, type, hasCheckbox, checkboxTitle, callback, buttonText) {
        var dialog = $("#cly-confirm").clone();
        dialog.removeAttr("id");
        dialog.find(".message").html(msg);
        if (hasCheckbox) {
            dialog.find(".buttons").append("<span style='font-size:12px'><input id='popupCheckbox' type='checkbox'>" + checkboxTitle + "</span>");
        }
        if (buttonText && buttonText.length === 2) {
            dialog.find("#dialog-cancel").text(buttonText[0]);
            dialog.find("#dialog-continue").text(buttonText[1]);
        }

        dialog.addClass(type);
        revealDialog(dialog);

        dialog.find("#dialog-cancel").on('click', function() {
            callback(false);
        });

        dialog.find("#dialog-continue").on('click', function() {
            callback(true);
        });
    };

    /**
    * Create drawer
    * @param {object} options - Options object
    * @param {string} options.id - Optional. Id for drawer
    * @param {object} options.template - Handelbars template object(optional). After creating element from template ".details" and ".buttons" are moved to drawer object. Other parts are not used.
    * @param {object} options.templateData - Data for template (optional)
    * @param {object} options.form  - (optional) Existing html element with form. ".details" and ".buttons" are moved to drawer object. Options.form element is removed.
    * @param {string} options.title - (optional) Title for drawer
    * @param {object} options.root - (optional) Element to which drawer should be appended. If not set drawer is appended to (".widget").
    * @param {boolean} options.saveButtonText - (optional) If there is only single button and there is not set any button using form or template - then passing this string sets text for save button.
    * @param {boolean} options.preventBaseReset - (optional) If true then when reseting form base reset function,which empties text fields won't be called.
    * @param {object} options.applyChangeTriggers  -(optional)  If true - Ads event listeners on textaria and input[text],  cly-multi-select, cly-single select in form to trigger "cly-drawer-form-updated" on drawer. * This event callls options.onUpdate function. 
    * @param {function} options.onUpdate - (optional) function called when "cly-drawer-form-updated" is triggered on drawer.
    * @param {function} options.onClose(callback) - (optional) function called when calling drawer.close() or hitting [X] button. Has one parameter - callback function. Only if callback function returns true as first param - drawer is closed. 
    * @param {function} options.onClosed(callback) - (optional) function called after drawer is successfully closed.
    * @returns {object} Drawer object
    * @example
    * var drawer = CountlyHelpers.createDrawer({
    *           id: "my-id",
    *           form: $('#id-of-elem'), //if using form
    *           title: 'My Drawer title',
    *           applyChangeTriggers: true, //add triggers
    *           onUpdate: function(){
    *              //check all fields here
    *            },
    *            resetForm: function() {
    *                //empty all fields. Text fields are emptied automatically because options.preventBaseReset is not set.
    *            },
    *            onClose: function(callback) {
    *                callback(true); //allow closing form
    *                callback(false); //don't close form
    *            },
    *            onClosed: function() {
    *                //form is closed
    *            }
    *        });
    * //After creation drawer object is returned. Object has multiple functions:
    * drawer.open() //opens drawer
    * drawer.close(force); //closes drawer. force - close anyway even if there is onClose function set. (Withot validating)
    * drawer.resetForm(); //resets drawer (Normally called after closing or before opening drawer)
    *    
    */
    CountlyHelpers.createDrawer = function(options) {
        var drawer = $("#cly-drawer-template").clone();
        drawer.removeAttr("id");

        if (options.template) { //from template or string
            var newPage = "";
            if (typeof options.template === 'function') {
                newPage = $("<div>" + options.template(options.templateData || {}) + "</div>");
            }
            else {
                newPage = $("<div>" + options.template + "</div>");
            }
            $(drawer).find('.details').first().replaceWith($(newPage).find('.details').first()); //copy details
            $(drawer).find('.buttons').first().replaceWith($(newPage).find('.buttons').first()); //copy buttons
        }

        if (options.form) { //from existing html element
            $(drawer).find('.details').first().replaceWith($(options.form).find('.details').first()); //copy details
            $(drawer).find('.buttons').first().replaceWith($(options.form).find('.buttons').first()); //copy buttons
            options.form.remove();
        }

        if (options.id) { //sets id
            $(drawer).attr("id", options.id);
        }
        if (options.title) { //sets title
            $(drawer).find(".title span").first().html(options.title);
        }
        if (options.saveButtonText) {
            $(drawer).find(".buttons .save-drawer-button").first().html(options.saveButtonText);
        }

        //appends drawer to 
        if (options.root) {
            options.root.append(drawer);
        }
        else {
            $(".widget").first().append(drawer);
        }

        if (options.onClose && typeof options.onClose === 'function') {
            drawer.onClose = options.onClose;
        }

        $(drawer).find(".close").off("click").on("click", function() {
            drawer.close();
        });

        app.localize(drawer);

        drawer._resetForm = function() {
            $(this.drawerElement).find("input[type=text]").val("");
            $(this.drawerElement).find("textarea").val("");
        };
        if (options.resetForm) {
            drawer.resetForm = function() {
                if (!options.preventBaseReset) {
                    this._resetForm();
                }
                options.resetForm();
            };
        }
        else {
            drawer.resetForm = drawer._resetForm;
        }
        if (options.initForm) {
            options.initForm();
        }

        drawer.open = function() {
            $(".cly-drawer").removeClass("open editing"); //closes all drawers
            $(this).addClass("open");
        };

        drawer.close = function(force) {
            if (force) {
                $(drawer).removeClass("open editing");
                drawer.trigger('cly-drawer-closed');
            }
            else if (drawer.onClose && typeof drawer.onClose === 'function') {
                drawer.onClose(function(closeMe) {
                    if (closeMe) {
                        $(drawer).removeClass("open editing");
                        drawer.trigger('cly-drawer-closed');
                    }
                });
            }
            else {
                $(drawer).removeClass("open editing");
                drawer.trigger('cly-drawer-closed');
            }
        };

        drawer._changeDefaultHandler = function() {
            $(drawer).trigger('cly-drawer-form-updated');
        };
        drawer._changeDefaultGreenCheckBoxHandler = function() {
            var isChecked = $(this).hasClass("fa-check-square"); //now is checked
            if (isChecked) {
                $(this).addClass("fa-square-o");
                $(this).removeClass("fa-check-square");
            }
            else {
                $(this).removeClass("fa-square-o");
                $(this).addClass("fa-check-square");
            }
            $(drawer).trigger('cly-drawer-form-updated');
        };
        drawer._applyChangeTrigger = function() {
            var domDict = [
                {s: '.on-off-switch input', e: 'change'},
                {s: 'input[type=text]', e: 'keyup'},
                {s: 'textarea', e: 'keyup'},
                {s: '.cly-select', e: 'cly-select-change'},
            ];
            domDict.forEach(function(d) {
                $(drawer).find(d.s).off(d.e, drawer._changeDefaultHandler).on(d.e, drawer._changeDefaultHandler);
            });

            //multi select
            $(drawer).off('cly-multi-select-change', drawer._changeDefaultHandler).on('cly-multi-select-change', drawer._changeDefaultHandler);

            //green checkboxes
            $(drawer).find(".check-green").off("click", drawer._changeDefaultGreenCheckBoxHandler).on("click", drawer._changeDefaultGreenCheckBoxHandler);
        };

        if (options.applyChangeTriggers) {
            drawer._applyChangeTrigger(drawer);
        }
        if (options.onUpdate) {
            $(drawer).on('cly-drawer-form-updated', options.onUpdate);
        }
        if (options.onClosed) {
            $(drawer).on('cly-drawer-closed', options.onClosed);
        }
        return drawer;
    };

    /**
    * Display dashboard notification using Amaran JS library
    * @param {object} msg - notification message object
    * @param {string=} msg.title - title of the notification
    * @deprecated 
    * @param {string=} msg.message - main notification text
    * @param {string=} msg.info - some additional information to display in notification
    * @deprecated 
    * @param {number=} [msg.delay=10000] - delay time in miliseconds before displaying notification
    * @deprecated 
    * @param {string=} [msg.type=ok] - message type, accepted values ok, error and warning
    * @param {string=} [msg.position=top right] - message position
    * @deprecated 
    * @param {string=} [msg.sticky=false] - should message stick until closed
    * @param {string=} [msg.clearAll=false] - clear all previous notifications upon showing this one
    * @deprecated 
    * @param {string=} [msg.closeOnClick=false] - should notification be automatically closed when clicked on
    * @deprecated 
    * @param {function=} msg.onClick - on click listener
    * @deprecated 
    * @example
    * CountlyHelpers.notify({
    *    message: "Main message text",
    * });
    */
    CountlyHelpers.notify = function(msg) {
        var payload = {};
        payload.text = msg.message;
        payload.autoHide = !msg.sticky;
        var colorToUse;

        if (countlyGlobal.ssr) {
            return;
        }

        switch (msg.type) {
        case "error":
            colorToUse = "light-destructive";
            break;
        case "warning":
            colorToUse = "light-warning";
            break;
        case "yellow":
            colorToUse = "light-warning";
            break;
        case "info":
        case "blue":
            colorToUse = "light-informational";
            break;
        case "purple":
        case "ok":
        case "success":
        default:
            colorToUse = "light-successful";
            break;
        }
        payload.color = colorToUse;
        countlyCommon.dispatchNotificationToast(payload);
    };

    CountlyHelpers.goTo = function(options) {
        app.backlinkUrl = options.from;
        app.backlinkTitle = options.title;
        window.location.hash = options.url;
    };

    CountlyHelpers.getBacklink = function() {
        var url = app.backlinkUrl;
        var title = app.backlinkTitle;
        app.backlinkUrl = null;
        app.backlinkTitle = null;
        return {url: url, title: title};
    };
    /**
    * Create new model
    */
    CountlyHelpers.model = function() {
        var self = this;
        $("#overlay").click(function() {
            var model = $(".model:visible");
            if (model.length) {
                model.fadeOut().remove();
                $(this).hide();
            }
        });

        var cnFn = function() {
            $(this).trigger("model-continue");
            $(this).parents(".model:visible").fadeOut().remove();
        };

        var clFn = function() {
            $(this).trigger("model-cancel");
            $(this).parents(".model:visible").fadeOut().remove();
        };

        this.resetModel = function() {
            self.continue = [cnFn];
            self.cancel = [clFn];
        };

        $(document).on('click', "#model-continue", function() {
            var breakStatus = false;
            for (var i = 0; i < self.continue.length; i++) {
                var call = self.continue[i].bind(this);
                if (!call()) {
                    breakStatus = true;
                    break;
                }
            }

            if (breakStatus) {
                $(this).trigger("model-continue");
            }

            if (!$('.model:visible').length) {
                $("#overlay").hide();
            }
        });

        $(document).on('click', "#model-cancel", function() {
            var breakStatus = false;
            for (var i = 0; i < self.cancel.length; i++) {
                var call = self.cancel[i].bind(this);
                if (!call()) {
                    breakStatus = true;
                    break;
                }
            }

            if (breakStatus) {
                $(this).trigger("model-cancel");
            }

            if (!$('.model:visible').length) {
                $("#overlay").hide();
            }
        });

        $(document).keyup(function(e) {
            if (e.keyCode === 27) {
                $(".model:visible").animate({
                    top: 0,
                    opacity: 0
                }, {
                    duration: 1000,
                    easing: 'easeOutQuart',
                    complete: function() {
                        $(this).remove();
                    }
                });

                $("#overlay").hide();
            }
        });

        self.continue = [cnFn];
        self.cancel = [clFn];
    };

    /**
    * Create new model
    * @param {object} json - json object
    * @param {string=} type - classname
    * @param {function=} callback - callback function
    */
    CountlyHelpers.newJSONEditor = function(json, type, callback) {
        var self = this;

        var dialog = $("#cly-json-editor").clone();
        dialog.removeAttr("id");

        dialog.addClass(type);
        CountlyHelpers.revealDialog(dialog);

        var element = dialog.find(".body")[0];
        var statusElements = {
            validElement: dialog.find(".valid-json"),
            invalidElement: dialog.find(".invalid-json"),
        };

        this.JSONEditor = new _JSONEditor(element, json, statusElements);

        this.JSONEditor.editor.on("change", function() {
            dialog.find("#dialog-continue").removeClass("disabled");
            if (!self.JSONEditor.jsonStatus) {
                dialog.find("#dialog-continue").addClass("disabled");
            }
        });

        dialog.find("#dialog-cancel").on('click', function() {
            callback(true);
        });

        dialog.find("#dialog-continue").on('click', function() {
            if (self.JSONEditor.jsonStatus) {
                return callback(false, self.JSONEditor.returnJSON());
            }

            return callback(true);
        });

        dialog.find("#dialog-format").on("click", function() {
            self.JSONEditor.format();
        });
    };

    CountlyHelpers.blinkDots = function(times, speed, element) {
        element.blinkCn = times;
        if ($(element).hasClass("blink")) {
            return;
        }
        $(element).addClass("blink");
        element.blinkElement = function() {
            var self = this;
            if (!$(element).hasClass("blink")) {
                return;
            }
            if (this.blinkCn > 0 || this.blinkCn === -1) {
                if (this.blinkCn > 0) {
                    this.blinkCn -= 1;
                }
                var dots = $(element).find("span");
                $(dots[0]).fadeTo(speed, 0.1, function() {
                    $(dots[0]).fadeTo(speed, 1.0, function() {
                        $(dots[1]).fadeTo(speed, 0.1, function() {
                            $(dots[1]).fadeTo(speed, 1.0, function() {
                                $(dots[2]).fadeTo(speed, 0.1, function() {
                                    $(dots[2]).fadeTo(speed, 1.0, function() {
                                        self.blinkElement();
                                    });
                                });
                            });
                        });
                    });
                });
            }
        };
        element.blinkElement();
    };

    CountlyHelpers.stopBlinking = function(element) {
        $(element).removeClass("blink");
    };
    CountlyHelpers.applyColors = function() {
        $('#custom-color-styles').remove();
        // overview bars
        var barStyles = '<style id="custom-color-styles">';
        barStyles += '.dashboard-summary .item.light .bar .bar-inner:nth-child(1) { background-color: ' + countlyCommon.GRAPH_COLORS[0] + '}';
        barStyles += '.dashboard-summary .item.light .bar .bar-inner:nth-child(2) { background-color: ' + countlyCommon.GRAPH_COLORS[1] + '}';
        barStyles += '.dashboard-summary .item.light .bar .bar-inner:nth-child(3) { background-color: ' + countlyCommon.GRAPH_COLORS[2] + '}';
        barStyles += '.dashboard-summary .item .bar .bar-inner-new .bar-inner-percent{color:' + countlyCommon.GRAPH_COLORS[0] + ';}';
        barStyles += '.dashboard-summary .item .bar .bar-inner-new:nth-child(2) .bar-inner-percent{color:' + countlyCommon.GRAPH_COLORS[1] + ';}';
        barStyles += '.dashboard-summary .item .bar .bar-inner-new:nth-child(3) .bar-inner-percent{color:' + countlyCommon.GRAPH_COLORS[2] + ';}';
        barStyles += '.dashboard-summary .item .bar .bar-inner-new::before{background-color:' + countlyCommon.GRAPH_COLORS[0] + ';}';
        barStyles += '.dashboard-summary .item .bar .bar-inner-new:nth-child(2)::before{background-color:' + countlyCommon.GRAPH_COLORS[1] + ';}';
        barStyles += '.dashboard-summary .item .bar .bar-inner-new:nth-child(3)::before{background-color:' + countlyCommon.GRAPH_COLORS[2] + ';}';
        barStyles += '.big-numbers-v2 .big-numbers.radio:nth-child(1) .color, .big-numbers-v2 .big-numbers.check:nth-child(1) .color {border: 1px solid ' + countlyCommon.GRAPH_COLORS[0] + ';}';
        barStyles += '.big-numbers-v2 .big-numbers.radio:nth-child(2) .color, .big-numbers-v2 .big-numbers.check:nth-child(2) .color, .big-numbers-v2 .big-numbers.check.event-sum .color {border: 1px solid ' + countlyCommon.GRAPH_COLORS[1] + ';}';
        barStyles += '.big-numbers-v2 .big-numbers.radio:nth-child(3) .color, .big-numbers-v2 .big-numbers.check:nth-child(3) .color, .big-numbers-v2 .big-numbers.check.event-dur .color {border: 1px solid ' + countlyCommon.GRAPH_COLORS[2] + ';}';
        barStyles += '.big-numbers-v2 .big-numbers.radio:nth-child(4) .color, .big-numbers-v2 .big-numbers.check:nth-child(4) .color {border: 1px solid ' + countlyCommon.GRAPH_COLORS[3] + ';}';
        barStyles += '.big-numbers-v2 .big-numbers.radio:nth-child(5) .color, .big-numbers-v2 .big-numbers.check:nth-child(5) .color {border: 1px solid ' + countlyCommon.GRAPH_COLORS[4] + ';}';
        barStyles += '.big-numbers-v2 .big-numbers.radio:nth-child(1).selected .color, .big-numbers-v2 .big-numbers.check:nth-child(1).selected .color {background-color:' + countlyCommon.GRAPH_COLORS[0] + '; box-shadow: inset 0 0 0 1px #FFF; border: 1px solid ' + countlyCommon.GRAPH_COLORS[0] + ';}';
        barStyles += '.big-numbers-v2 .big-numbers.radio:nth-child(2).selected .color, .big-numbers-v2 .big-numbers.check:nth-child(2).selected .color, .big-numbers-v2 .big-numbers.check.event-sum.selected .color {background-color:' + countlyCommon.GRAPH_COLORS[1] + '; box-shadow: inset 0 0 0 1px #FFF; border: 1px solid ' + countlyCommon.GRAPH_COLORS[1] + ';}';
        barStyles += '.big-numbers-v2 .big-numbers.radio:nth-child(3).selected .color, .big-numbers-v2 .big-numbers.check:nth-child(3).selected .color, .big-numbers-v2 .big-numbers.check.event-dur.selected .color {background-color:' + countlyCommon.GRAPH_COLORS[2] + '; box-shadow: inset 0 0 0 1px #FFF; border: 1px solid ' + countlyCommon.GRAPH_COLORS[2] + ';}';
        barStyles += '.big-numbers-v2 .big-numbers.radio:nth-child(4).selected .color, .big-numbers-v2 .big-numbers.check:nth-child(4).selected .color {background-color:' + countlyCommon.GRAPH_COLORS[3] + '; box-shadow: inset 0 0 0 1px #FFF; border: 1px solid ' + countlyCommon.GRAPH_COLORS[3] + ';}';
        barStyles += '.big-numbers-v2 .big-numbers.radio:nth-child(5).selected .color, .big-numbers-v2 .big-numbers.check:nth-child(5).selected .color {background-color:' + countlyCommon.GRAPH_COLORS[4] + '; box-shadow: inset 0 0 0 1px #FFF; border: 1px solid ' + countlyCommon.GRAPH_COLORS[4] + ';}';
        barStyles += '.big-numbers:nth-child(1) .color {background-color: ' + countlyCommon.GRAPH_COLORS[0] + ';box-shadow: inset 0 0 0 1px #FFF; border: 1px solid ' + countlyCommon.GRAPH_COLORS[0] + ';}';
        barStyles += '.big-numbers:nth-child(2) .color {background-color: ' + countlyCommon.GRAPH_COLORS[1] + ';box-shadow: inset 0 0 0 1px #FFF; border: 1px solid ' + countlyCommon.GRAPH_COLORS[1] + ';}';
        barStyles += '.big-numbers:nth-child(3) .color {background-color: ' + countlyCommon.GRAPH_COLORS[2] + ';box-shadow: inset 0 0 0 1px #FFF; border: 1px solid ' + countlyCommon.GRAPH_COLORS[2] + ';}';
        barStyles += '</style>';
        $(barStyles).appendTo('head');
    };

    /**
    * Display modal popup UI
    * @param {string|object} element - if third parameter isHTML is true, then HTML code as string is expected, else element's selector or element itself is expected and it's HTML contents will be copied into popup
    * @param {string=} custClass - add custom css class to dialog for easier manipulation
    * @param {boolean=} isHTML - changes the behavior of first parameter element
    * @example
    * CountlyHelpers.popup("<h1>Hello</h1>", "red", true);
    */
    CountlyHelpers.popup = function(element, custClass, isHTML) {
        var dialog = $("#cly-popup").clone();
        dialog.removeAttr("id");
        if (custClass) {
            dialog.addClass(custClass);
        }

        if (isHTML) {
            dialog.find(".content").html(element);
        }
        else {
            dialog.find(".content").html($(element).html());
        }

        revealDialog(dialog);
    };

    /**
    * Display modal popup with external resource from provided URL in iframe. Make sure to use https version of resource for it to work on both http and https dashboard
    * @param {string} url - full absolute url to external resource to display in popup
    * @example
    * CountlyHelpers.openResource("http://resources.count.ly/docs");
    */
    CountlyHelpers.openResource = function(url) {
        var dialog = $("#cly-resource").clone();
        dialog.removeAttr("id");
        dialog.find(".content").html("<iframe style='border-radius:5px; border:none; width:800px; height:600px;' src='" + url + "'></iframe>");

        revealDialog(dialog);
    };

    /**
    * Display modal alert popup for quick short messages that require immediate user's attention, as error submitting form
    * @param {string} msg - message to display in alert popup
    * @param {string} type - type of alert red for errors and green for success
    * @param {object} moreData - more data to display
    * @param {string} moreData.image - image id
    * @param {string} moreData.title - alert title
    * @example
    * CountlyHelpers.alert("Some error happened", "red");
    */
    CountlyHelpers.alert = function(msg, type, moreData) {
        if (countlyGlobal.ssr) {
            return;
        }

        if (window.countlyVue && window.countlyVue.vuex) {

            var confirmLabel = countlyVue.i18n('common.ok'),
                convertedType = "secondary";

            if (moreData && moreData.button_title) {
                confirmLabel = moreData.button_title;
            }

            if (type === "popStyleGreen") {
                convertedType = "success";
            }
            else if (type === "red") {
                convertedType = "danger";
            }

            var payload = {
                intent: 'message',
                message: (moreData && moreData.title) ? countlyCommon.encodeSomeHtml(msg) : "",
                type: convertedType,
                confirmLabel: confirmLabel,
                title: (moreData && moreData.title) || countlyCommon.encodeSomeHtml(msg),
                image: moreData && moreData.image
            };

            var currentStore = window.countlyVue.vuex.getGlobalStore();
            if (currentStore) {
                currentStore.dispatch('countlyCommon/onAddDialog', payload);
            }
        }
    };

    /**
    * Display modal popup that requires confirmation input from user
    * @param {string} msg - message to display in alert popup
    * @param {string} type - type of alert red for errors and green for success
    * @param {function} callback - to determine result of the input
    * @param {array=} buttonText - [0] element for cancle button text and [1] element for confirm button text
    * @param {object} moreData - more data to display
    * @param {string} moreData.image - image id
    * @param {string} moreData.title - alert title
    * @example
    * CountlyHelpers.confirm("Are you sure?", "red", function (result) {
    *    if (!result) {
    *        //user did not confirm, just exit
    *        return true;
    *    }
    *    //user confirmed, do what you need to do
    * });
    */
    CountlyHelpers.confirm = function(msg, type, callback, buttonText, moreData) {
        if (countlyGlobal.ssr) {
            return;
        }

        if (window.countlyVue && window.countlyVue.vuex) {

            var cancelLabel = countlyVue.i18n('common.cancel'),
                confirmLabel = countlyVue.i18n('common.continue'),
                convertedType = "danger"; // Default type is "danger"

            if (buttonText && buttonText.length === 2) {
                cancelLabel = buttonText[0];
                confirmLabel = buttonText[1];
            }

            if (type === "popStyleGreen") {
                convertedType = "success";
            }
            // Default type is "danger"
            // else if (type === "red") {
            //     convertedType = "danger";
            // }

            var payload = {
                intent: 'confirm',
                message: countlyCommon.encodeSomeHtml(msg),
                type: convertedType,
                confirmLabel: confirmLabel,
                cancelLabel: cancelLabel,
                title: moreData && moreData.title,
                image: moreData && moreData.image,
                callback: callback
            };

            var currentStore = window.countlyVue.vuex.getGlobalStore();
            if (currentStore) {
                currentStore.dispatch('countlyCommon/onAddDialog', payload);
            }
        }
    };

    /**
    * Displays loading icong and returns reference to dialog so you could close it once loading is done
    * @param {string} msg - message to display in loading popup
    * @returns {object} jQuery object reference to dialog
    * @example
    * var dialog = CountlyHelpers.loading("we are doing something");
    * //later when done
    * CountlyHelpers.removeDialog(dialog);
    */
    CountlyHelpers.loading = function(msg) {
        var dialog = $("#cly-loading").clone();
        dialog.removeAttr("id");
        dialog.find(".message").html(msg);
        dialog.addClass('cly-loading');
        revealDialog(dialog);
        return dialog;
    };

    /**
    * Check the value which passing as parameter
    * isJSON or not
    * return result as boolean
    * @param {object} val - value of form data
    * @returns {boolean} is this a json object?
    * @example
    * CountlyHelpers.isJSON(variable);
    */
    CountlyHelpers.isJSON = function(val) {
        try {
            JSON.parse(val);
            return true;
        }
        catch (notJSONError) {
            return false;
        }
    };
    /** function to show selected column count in export dialog
	* @param {object} dialog - dialog 
	*/
    function show_selected_column_count(dialog) {

        var allSelected = dialog.find('.export-all-columns.fa-check-square');


        var boxesCn = dialog.find('.columns-wrapper .checkbox-line');
        if (boxesCn) {
            boxesCn = boxesCn.length;
        }
        var selectedCn = dialog.find('.columns-wrapper .fa-check-square');
        if (selectedCn) {
            selectedCn = selectedCn.length;
        }
        if (allSelected.length === 0 && selectedCn !== boxesCn) {
            dialog.find(".export-columns-selector p:first").html(jQuery.i18n.map["export.columns-to-export"] + "<span>" + jQuery.i18n.prop("export.export-columns-selected-count", selectedCn, boxesCn) + "</span>");
        }
        else {
            dialog.find(".export-columns-selector p:first span").text("");
        }
    }

    /** function to show selected column count in export dialog
	* @param {object} dialog - dialog 
	* @param {object} data - object with information about formating 
	* @param {object} instance - refenrence to instance
	*/
    function show_formatting_warning(dialog, data, instance) {

        dialog.find(".export-format-option i").not(".tooltipstered").tooltipster({
            animation: "fade",
            animationDuration: 50,
            delay: 100,
            theme: 'tooltipster-borderless',
            side: ['top'],
            maxWidth: 300,
            trigger: 'hover',
            interactive: true,
            functionBefore: function(instance2) {
                instance2.content("<p>" + jQuery.i18n.map["export.format-if-possible-explain"] + "</p>");
            },
            contentAsHTML: true,
            functionInit: function(instance2) {
                instance2.content("<p>" + jQuery.i18n.map["export.format-if-possible-explain"] + "</p>");
            }
        });

        if (data && data.fields && Object.keys(data.fields).length > 0) {
            dialog.find(".export-format-option").css("display", "none");
            if (dialog.find(".export-columns-selector:visible").length > 0) {
                if (dialog.find(".export-all-columns").hasClass("fa-check-square")) {
                    //export all columns no need for projections
                    for (var filed in data.fields) {
                        if (data.fields[filed].to === "time") {
                            dialog.find(".export-format-option").css("display", "block");
                        }
                    }
                }
                else {
                    var projection = {};

                    var checked = dialog.find('.columns-wrapper .fa-check-square');
                    for (var kz = 0; kz < checked.length; kz++) {
                        projection[$(checked[kz]).data("index")] = true;
                    }

                    if (instance && instance.fixProjectionParams) {
                        projection = instance.fixProjectionParams(projection);
                    }

                    for (var filed2 in data.fields) {
                        if (data.fields[filed2].to === "time" && projection[filed2]) {
                            dialog.find(".export-format-option").css("display", "block");
                        }
                    }

                }
            }
        }
        else {
            dialog.find(".export-format-option").css("display", "none");
        }
    }
    /**
    * Displays database export dialog
    * @param {number} count - total count of documents to export
    * @param {object} data - data for export query to use when constructing url
    * @param {boolean} asDialog - open it as dialog
    * @param {boolean} exportByAPI - export from api request, export from db when set to false
	* @param {boolean} instance - optional. Reference to table to get correct colum names(only if there is need to select columns to export) There must be changes made in table settings to allow it. (table.addColumnExportSelector = true and each column must have columnsSelectorIndex value as field in db)
    * @returns {object} jQuery object reference to dialog
    * @example
    * var dialog = CountlyHelpers.export(300000);
    * //later when done
    * CountlyHelpers.removeDialog(dialog);
    */
    CountlyHelpers.export = function(count, data, asDialog, exportByAPI, instance) {
        //var hardLimit = countlyGlobal.config.export_limit;
        //var pages = Math.ceil(count / hardLimit);
        var dialog = $("#cly-export").clone();
        var type = "csv";
        //var page = 0;
        var tableCols;

        var formatData = data.formatFields || "";
        try {
            formatData = JSON.parse(formatData);
        }
        catch (e) {
            formatData = {};
        }
        dialog.removeAttr("id");
        /*dialog.find(".details").text(jQuery.i18n.prop("export.export-number", (count + "").replace(/(\d)(?=(\d{3})+$)/g, '$1 '), pages));
        if (count <= hardLimit) {
            dialog.find(".cly-select").hide();
        }
        else {
            dialog.find(".select-items > div").append('<div data-value="-1" class="segmentation-option item">' + jQuery.i18n.map["common.all"] + " " + jQuery.i18n.map["export.documents"] + '</div>');
            for (var i = 0; i < pages; i++) {
                dialog.find(".select-items > div").append('<div data-value="' + i + '" class="segmentation-option item">' + ((i * hardLimit + 1) + "").replace(/(\d)(?=(\d{3})+$)/g, '$1 ') + ' - ' + (Math.min((i + 1) * hardLimit, count) + "").replace(/(\d)(?=(\d{3})+$)/g, '$1 ') + " " + jQuery.i18n.map["export.documents"] + '</div>');
            }
            dialog.find(".export-data").addClass("disabled");
        }*/

        var str = "";
        if (instance && instance.addColumnExportSelector && instance.fnSettings) {
            tableCols = instance.fnSettings().aoColumns || [];
        }

        if (tableCols && Array.isArray(tableCols) && tableCols.length > 0) {
            var disabled = ""; //left in case want to add disabled  column feature
            var myClass = "";
            var myClass2 = "";
            for (var colIndex = 0; colIndex < tableCols.length; colIndex++) {
                if (tableCols[colIndex].columnSelectorIndex) {
                    var colName = tableCols[colIndex].columnSelectorIndex;
                    myClass = 'fa-check-square';
                    myClass2 = "";


                    if (tableCols[colIndex].bVisible === true) {
                        //selectedC++;
                    }
                    else {
                        myClass = 'fa-square-o';
                        myClass2 = ' not-checked';
                    }
                    str += "<div class='checkbox-line' data-selectorname='" + colName + "' data-index='" + colIndex + "' class='" + myClass2 + disabled + "'><div><a data-index='" + colName + "' class='fa check-green check-header " + myClass + disabled + " data-table-toggle-column'></a></div>" + tableCols[colIndex].sTitle + "</div>";
                }
            }
            dialog.find(".export-columns-selector .columns-wrapper").html(str);
            dialog.find(".export-columns-selector").css("display", "block");


            dialog.find('.columns-wrapper').slimScroll({
                height: '100%',
                start: 'top',
                wheelStep: 10,
                position: 'right',
                disableFadeOut: true
            });

            $(".data-table-column-selector").on("click", function(e) {
                e.stopPropagation();
            });

            dialog.find(".export-columns-selector").on("click", ".checkbox-line", function() {
                var checkbox = $(this).find("a").first();
                var isChecked = $(checkbox).hasClass("fa-check-square");//is now checked

                if (isChecked) {
                    $(checkbox).addClass("fa-square-o");
                    $(checkbox).removeClass("fa-check-square");
                    if ($(checkbox).hasClass("export-all-columns")) {
                        dialog.find(".export-columns-selector").removeClass("hide-column-selectors");
                    }
                }
                else {
                    $(checkbox).removeClass("fa-square-o");
                    $(checkbox).addClass("fa-check-square");
                    if ($(checkbox).hasClass("export-all-columns")) {
                        dialog.find(".export-columns-selector").addClass("hide-column-selectors");
                    }
                }
                show_selected_column_count(dialog);
                show_formatting_warning(dialog, formatData, instance);
            });



            dialog.on("click", ".export-format-option", function() {
                var checkbox = $(this).find("a").first();
                var isChecked = $(checkbox).hasClass("fa-check-square");//is now checked

                if (isChecked) {
                    $(checkbox).addClass("fa-square-o");
                    $(checkbox).removeClass("fa-check-square");
                }
                else {
                    $(checkbox).removeClass("fa-square-o");
                    $(checkbox).addClass("fa-check-square");
                }
            });

            show_selected_column_count(dialog);
            setTimeout(function() {
                show_formatting_warning(dialog, formatData, instance);
            }, 10);
            dialog.find(".export-columns-search input").on("keyup", function() {
                var value = dialog.find(".export-columns-search input").val();
                value = new RegExp((value || ""), 'i');
                for (var z = 0;z < tableCols.length; z++) {
                    if (tableCols[z].sTitle.match(value)) {
                        dialog.find(".export-columns-selector .columns-wrapper .checkbox-line[data-selectorname='" + tableCols[z].columnSelectorIndex + "']").css("display", "block");
                    }
                    else {
                        dialog.find(".export-columns-selector .columns-wrapper .checkbox-line[data-selectorname='" + tableCols[z].columnSelectorIndex + "']").css("display", "none");
                    }
                }

            });
        }
        else {
            dialog.find(".export-columns-selector .columns-wrapper").html("");
            dialog.find(".export-columns-selector").css("display", "none");
        }

        dialog.find(".button").click(function() {
            dialog.find(".button-selector .button").removeClass("selected");
            dialog.find(".button-selector .button").removeClass("active");
            $(this).addClass("selected");
            $(this).addClass("active");
            type = $(this).attr("id").replace("export-", "");
        });
        /*dialog.find(".segmentation-option").on("click", function() {
            page = $(this).data("value");
            dialog.find(".export-data").removeClass("disabled");
        });*/
        dialog.find(".export-data").click(function() {
            if ($(this).hasClass("disabled")) {
                return;
            }
            data.type = type;
            data.limit = "";
            data.skip = 0;
            /*if (page !== -1) {
                data.limit = hardLimit;
                data.skip = page * hardLimit;
            }
            else {
                data.limit = "";
                data.skip = 0;
            }*/
            if (dialog.find(".export-columns-selector:visible").length > 0) {
                delete data.projection;
                if (dialog.find(".export-all-columns").hasClass("fa-check-square")) {
                    //export all columns no need for projections
                }
                else {
                    var projection = {};
                    var checked = dialog.find('.columns-wrapper .fa-check-square');
                    for (var kz = 0; kz < checked.length; kz++) {
                        projection[$(checked[kz]).data("index")] = true;
                    }

                    if (instance && instance.fixProjectionParams) {
                        projection = instance.fixProjectionParams(projection);
                    }
                    data.projection = JSON.stringify(projection);
                }
            }

            if (!(dialog.find(".export-format-columns").hasClass("fa-check-square"))) {
                delete data.formatFields;
            }
            var url = countlyCommon.API_URL + (exportByAPI ? "/o/export/request" : "/o/export/db");
            if (data.url) {
                url = data.url;
            }

            var form = $('<form method="POST" action="' + url + '">');
            $.each(data, function(k, v) {
                if (CountlyHelpers.isJSON(v)) {
                    form.append($('<textarea style="visibility:hidden;position:absolute;display:none;" name="' + k + '">' + v + '</textarea>'));
                }
                else {
                    form.append($('<input type="hidden" name="' + k + '" value="' + v + '">'));
                }
            });
            if (exportByAPI && url === "/o/export/requestQuery") {
                if (Array.isArray(data.prop)) {
                    data.prop = data.prop.join(",");
                }
                $.ajax({
                    type: "POST",
                    url: countlyCommon.API_PARTS.data.r + "/export/requestQuery",
                    data: data,
                    success: function(result) {
                        var task_id = null;
                        var fileid = null;
                        if (result && result.result && result.result.task_id) {
                            task_id = result.result.task_id;
                            countlyTaskManager.monitor(task_id);
                            CountlyHelpers.displayExportStatus(null, fileid, task_id);
                        }
                        $(".save-table-data").click();

                    },
                    error: function(xhr, status, error) {
                        var filename = null;
                        if (xhr && xhr.responseText && xhr.responseText !== "") {
                            var ob = JSON.parse(xhr.responseText);
                            if (ob.result && ob.result.message) {
                                error = ob.result.message;
                            }
                            if (ob.result && ob.result.filename) {
                                filename = ob.result.filename;
                            }
                        }
                        CountlyHelpers.displayExportStatus(error, filename, null);
                    }
                });
            }
            else {
                $('body').append(form);
                form.submit();
            }
        });
        if (asDialog) {
            revealDialog(dialog);
        }
        return dialog;
    };

    CountlyHelpers.displayExportStatus = function(error, export_id, task_id) {
        if (error) {
            CountlyHelpers.alert(error, "red");
        }
        else if (export_id) {
            CountlyHelpers.notify({
                type: "ok",
                title: jQuery.i18n.map["common.success"],
                message: jQuery.i18n.map["export.export-finished"],
                info: jQuery.i18n.map["app-users.export-finished-click"],
                sticky: false,
                clearAll: true,
                onClick: function() {
                    var win = window.open(countlyCommon.API_PARTS.data.r + "/export/download/" + task_id + "?auth_token=" + countlyGlobal.auth_token + "&app_id=" + countlyCommon.ACTIVE_APP_ID, '_blank');
                    win.focus();
                }
            });
            self.refresh();
        }
        else if (task_id) {
            CountlyHelpers.notify({type: "ok", title: jQuery.i18n.map["common.success"], message: jQuery.i18n.map["export.export-started"], sticky: false, clearAll: false});
            // self.refresh();
        }
        else {
            CountlyHelpers.alert(jQuery.i18n.map["export.export-failed"], "red");
        }
    };

    /**
    * Displays raw data table export dialog
    * @param {opject} dtable - data
    * @param {object} data - data for export query to use when constructing url
    * @param {boolean} asDialog - open it as dialog
    * @param {object} oSettings - oSettings object of the dataTable
    * @returns {object} jQuery object reference to dialog
    * @example
    * var dialog = CountlyHelpers.export(300000);
    * //later when done
    * CountlyHelpers.removeDialog(dialog);
    */
    CountlyHelpers.tableExport = function(dtable, data, asDialog, oSettings) {
        /** gets file name for export
        *   @returns {string} filename
        */
        function getFileName() {
            var name = "countly";
            if ($(".widget-header .title").length) {
                name = jQuery.trim($(".widget-header .title").first().text()).replace(/[\r\n]+/g, " ").split(" ")[0];
            }
            if ($(".widget #date-selector").length) {
                //include export range
                name += "_for_" + countlyCommon.getDateRange();
            }
            else {
                //include export date
                name += +"_on_" + moment().format("DD-MMM-YYYY");
            }
            return (name.charAt(0).toUpperCase() + name.slice(1).toLowerCase());
        }
        /** gets export data from data table
        * @param {object} dtable_pd - data table
        * @returns {array} table data
        */
        function getExportData(dtable_pd) {
            var tableCols = oSettings ? oSettings.aoColumns : dtable_pd.fnSettings().aoColumns,
                tableData = [];
            if (tableCols[0].sExport && app.dataExports[tableCols[0].sExport]) {
                tableData = app.dataExports[tableCols[0].sExport]();
            }
            else {
                var i = 0;
                // TableTools deprecated by offical, 
                // fix bug with workaround for export table
                TableTools.fnGetInstance = function(node) {
                    if (typeof node !== 'object') {
                        node = document.getElementById(node);
                    }
                    var iLen = TableTools._aInstances.length;
                    if (iLen > 0) {
                        for (i = iLen - 1 ; i >= 0 ; i--) {
                            if (TableTools._aInstances[i].s.master && TableTools._aInstances[i].dom.table === node) {
                                return TableTools._aInstances[i];
                            }
                        }
                    }
                    return null;
                };
                tableData = TableTools.fnGetInstance(dtable_pd[0] || oSettings.nTable).fnGetTableData({"sAction": "data", "sTag": "default", "sLinerTag": "default", "sButtonClass": "DTTT_button_xls", "sButtonText": "Save for Excel", "sTitle": "", "sToolTip": "", "sCharSet": "utf16le", "bBomInc": true, "sFileName": "*.csv", "sFieldBoundary": "", "sFieldSeperator": "\t", "sNewLine": "auto", "mColumns": "all", "bHeader": true, "bFooter": true, "bOpenRows": false, "bSelectedOnly": false, "fnMouseover": null, "fnMouseout": null, "fnSelect": null, "fnComplete": null, "fnInit": null, "fnCellRender": null, "sExtends": "xls"});
                tableData = tableData.split(/\r\n|\r|\n/g);
                tableData.shift();

                for (i = 0; i < tableData.length; i++) {
                    tableData[i] = tableData[i].split('\t');
                }
                var retData = [];
                for (i = 0; i < tableData.length; i++) {
                    var ob = {};
                    for (var colIndex = 0; colIndex < tableCols.length; colIndex++) {
                        try {
                            if (!(tableData[i] && tableData[i][colIndex]) || (tableCols[colIndex] && tableCols[colIndex].noExport)) {
                                continue;
                            }
                            if (tableCols[colIndex].sType === "formatted-num") {
                                ob[tableCols[colIndex].sTitle] = tableData[i][colIndex].replace(/,/g, "");
                            }
                            else if (tableCols[colIndex].sType === "percent") {
                                ob[tableCols[colIndex].sTitle] = tableData[i][colIndex].replace("%", "");
                            }
                            else if (tableCols[colIndex].sType === "format-ago" || tableCols[colIndex].sType === "event-timeline") {
                                ob[tableCols[colIndex].sTitle] = tableData[i][colIndex].split("|").pop();
                            }
                            else {
                                ob[tableCols[colIndex].sTitle] = tableData[i][colIndex];
                            }
                        }
                        catch (e) {
                            //not important
                        }
                    }
                    retData.push(ob);
                }
                tableData = retData;
            }
            return tableData;
        }
        var dialog = $("#cly-export").clone();
        var type = "csv";
        dialog.removeAttr("id");
        dialog.find(".details").hide();
        dialog.find(".cly-select").hide();
        dialog.find(".button").click(function() {
            dialog.find(".button-selector .button").removeClass("selected");
            dialog.find(".button-selector .button").removeClass("active");
            $(this).addClass("selected");
            $(this).addClass("active");
            type = $(this).attr("id").replace("export-", "");
        });
        dialog.find(".export-data").click(function() {
            if ($(this).hasClass("disabled")) {
                return;
            }
            data.type = type;
            data.data = JSON.stringify(getExportData(dtable, type));
            data.filename = getFileName(type);

            var url = countlyCommon.API_URL + "/o/export/data";
            var form = $('<form method="POST" action="' + url + '">');

            $.each(data, function(k, v) {
                if (CountlyHelpers.isJSON(v)) {
                    form.append($('<textarea style="visibility:hidden;position:absolute;display:none;" name="' + k + '">' + v + '</textarea>'));
                }
                else {
                    form.append($('<input type="hidden" name="' + k + '" value="' + v + '">'));
                }
            });
            $('body').append(form);
            form.submit();
        });
        if (asDialog) {
            revealDialog(dialog);
        }
        return dialog;
    };

    /**
    * Instead of creating dialog object you can use this method and directly pass jquery element to be used as dialog content, which means complete customization
    * @param {jquery_object} dialog - jQuery object unnattached, like cloned existing object
    * @example
    * var dialog = $("#cly-popup").clone().removeAttr("id").addClass('campaign-create');
    * CountlyHelpers.revealDialog(dialog);
    */
    CountlyHelpers.revealDialog = function(dialog) {
        $("body").append(dialog);
        var dialogHeight = dialog.outerHeight(),
            dialogWidth = dialog.outerWidth() + 2;

        dialog.css({
            "height": dialogHeight,
            "margin-top": Math.floor(-dialogHeight / 2),
            "width": dialogWidth,
            "margin-left": Math.floor(-dialogWidth / 2)
        });

        $("#overlay").fadeIn();
        dialog.fadeIn(app.tipsify.bind(app, $("#help-toggle").hasClass("active"), dialog));
        CountlyHelpers.makeSelectNative();
    };

    /**
    * If contents of the popup change, you may want to resice the popup
    * @param {jquery_object} dialog - jQuery dialog reference
    * @param {boolean} animate - should resizing be animated
    * @example
    * var dialog = $("#cly-popup").clone().removeAttr("id").addClass('campaign-create');
    * CountlyHelpers.revealDialog(dialog);
    * //when content changes
    * CountlyHelpers.changeDialogHeight(dialog, true)
    */
    CountlyHelpers.changeDialogHeight = function(dialog, animate) {
        var dialogHeight = 0,
            dialogWidth = dialog.width(),
            maxHeight = $("#sidebar").height() - 40;

        dialog.children().each(function() {
            dialogHeight += $(this).outerHeight(true);
        });

        if (dialogHeight > maxHeight) {
            dialog[animate ? 'animate' : 'css']({
                "height": maxHeight,
                "margin-top": Math.floor(-maxHeight / 2),
                "width": dialogWidth,
                "margin-left": Math.floor(-dialogWidth / 2),
                "overflow-y": "auto"
            });
        }
        else {
            dialog[animate ? 'animate' : 'css']({
                "height": dialogHeight,
                "margin-top": Math.floor(-dialogHeight / 2),
                "width": dialogWidth,
                "margin-left": Math.floor(-dialogWidth / 2)
            });
        }
    };

    var revealDialog = CountlyHelpers.revealDialog;

    //var changeDialogHeight = CountlyHelpers.changeDialogHeight; - not used anywhere anymore

    /**
    * Remove existing dialog
    * @param {jquery_object} dialog - jQuery dialog reference
    * @example
    * var dialog = $("#cly-popup").clone().removeAttr("id").addClass('campaign-create');
    * CountlyHelpers.revealDialog(dialog);
    * //when dialog not needed anymore
    * CountlyHelpers.removeDialog(dialog);
    */
    CountlyHelpers.removeDialog = function(dialog) {
        dialog.remove();
        $("#overlay").fadeOut();
    };

    CountlyHelpers.setUpDateSelectors = function(self) {
        $("#month").text(moment().year());
        $("#day").text(moment().format("MMMM, YYYY"));
        $("#yesterday").text(moment().subtract(1, "days").format("Do"));

        $("#date-selector").find(".date-selector").click(function() {
            if ($(this).hasClass("selected")) {
                return true;
            }

            self.dateFromSelected = null;
            self.dateToSelected = null;

            $(".date-selector").removeClass("selected").removeClass("active");
            $(this).addClass("selected");
            var selectedPeriod = $(this).attr("id");

            if (countlyCommon.getPeriod() === selectedPeriod) {
                return true;
            }

            countlyCommon.setPeriod(selectedPeriod);

            self.dateChanged(selectedPeriod);
            app.runRefreshScripts();

            $("#" + selectedPeriod).addClass("active");
            $("#date-picker").hide();
            $("#date-selector .calendar").removeClass("selected").removeClass("active");
            $("#selected-date").text(countlyCommon.getDateRangeForCalendar());

        });

        $("#date-selector").find(".date-selector").each(function() {
            if (countlyCommon.getPeriod() === $(this).attr("id")) {
                $(this).addClass("active").addClass("selected");
            }
        });
    };

    /**
    * Initialize countly dropdown select. In most cases it is done automatically, only in some cases, when content loaded via ajax request outside of view lifecycle, you may need to initialize it yourself for your content specifically
    * @param {object} element - jQuery object reference
    * @example
    * CountlyHelpers.initializeSelect($("#my-dynamic-div"));
    */
    CountlyHelpers.initializeSelect = function(element) {
        element = element || $("body");
        var showOptions = function(context) {
            if ($(context).hasClass("disabled")) {
                return true;
            }

            $(context).removeClass("req");

            var selectItems = $(context).find(".select-items"),
                itemCount = selectItems.find(".item").length;

            if (!selectItems.length) {
                return false;
            }

            $(".cly-select").find(".search").remove();
            $(".cly-multi-select").find(".search").remove();

            if (selectItems.is(":visible")) {
                $(context).removeClass("active");
            }
            else {
                $(".cly-select").removeClass("active");
                $(".cly-multi-select").removeClass("active");
                $(".select-items").hide();
                $(context).addClass("active");

                if (itemCount > 10 || $(context).hasClass("big-list")) {
                    $("<div class='search'><div class='inner'><input type='search' readonly onfocus=\"if (this.hasAttribute('readonly')) {this.removeAttribute('readonly'); this.blur(); this.focus();}\" /><i class='fa fa-search'></i></div></div>").insertBefore($(context).find(".select-items"));
                }
            }

            if ($(context).hasClass("centered")) {
                if ((itemCount > 5 && $(context).offset().top > 400) || $(context).hasClass("force")) {
                    var height = $(context).find(".select-items").height(),
                        searchItem = $(context).find(".search");

                    var addThis = 0;

                    if (searchItem.length) {
                        addThis = (searchItem.height() / 2).toFixed(0) - 1;
                        $(context).find(".select-items").css({"min-height": height});
                    }
                    else {
                        $(context).find(".select-items").css({"min-height": "auto"});
                        height = $(context).find(".select-items").height();
                    }

                    $(context).find(".select-items").css("margin-top", (-(height / 2).toFixed(0) - ($(context).height() / 2).toFixed(0) + parseInt(addThis)) + "px");
                    $(context).find(".search").css("margin-top", (-(height / 2).toFixed(0) - searchItem.height()) + "px");
                }
                else {
                    $(context).find(".select-items").css({"min-height": "auto"});
                    $(context).find(".select-items").css("margin-top", '');
                    $(context).find(".search").css("margin-top", '');
                }
            }
            if ($(context).find(".select-items").is(":visible")) {
                $(context).find(".select-items").hide();
            }
            else {
                $(context).find(".select-items").show();
                if ($(context).find(".select-items").find(".scroll-list").length === 0) {
                    $(context).find(".select-items").wrapInner("<div class='scroll-list'></div>");
                    $(context).find(".scroll-list").slimScroll({
                        height: '100%',
                        start: 'top',
                        wheelStep: 10,
                        position: 'right',
                        disableFadeOut: true
                    });
                }
            }
            $(context).find(".select-items").find(".item").removeClass("hidden");
            $(context).find(".select-items").find(".group").show();
            $(context).find(".select-items").find(".item").removeClass("last");
            $(context).find(".select-items").find(".item:visible:last").addClass("last");
            $(context).find(".search input").focus();
            $("#date-picker").hide();
            $(context).find(".search").off("click").on("click", function(e1) {
                e1.stopPropagation();
            });
        };
        var activeOption = 0;

        var hideOptions = function() {
            var $clySelect = $(".cly-select");

            $clySelect.find(".select-items").hide();
            $clySelect.find(".search").remove();
            $clySelect.removeClass("active");
        };

        element.off("click", ".cly-select").on("click", ".cly-select", function(e) {
            showOptions(this);
            activeOption = 0;
            e.stopPropagation();
        });

        element.off("keyup", ".cly-select").on("keyup", ".cly-select", function(e) {
            if (e.keyCode === 32) {
                showOptions(this);
            }
            if (e.keyCode === 27) {
                hideOptions();
            }

            // UP ARROW
            if (e.keyCode === 38) {
                if (typeof $(this).find('.scroll-list > div').first() !== "undefined" && !($(this).find('.scroll-list').first().children().length > 1)) {
                    $($(this).find('.scroll-list > div').first().children[activeOption]).css({"background-color": "white"});
                    if (activeOption === 0) {
                        activeOption = $(this).find('.scroll-list > div').first().children().length - 1;
                    }
                    else {
                        activeOption--;
                    }
                    $(this).find('.scroll-list > div').first().children().eq(activeOption).css({'background-color': '#f3f3f3'});
                }
                else if ($(this).find('.scroll-list').first().children().length > 1) {
                    $(this).find('.scroll-list').first().children().eq(activeOption).css({"background-color": "white"});
                    if (activeOption === 0) {
                        activeOption = $(this).find('.scroll-list').children().length - 1;
                    }
                    else {
                        activeOption--;
                    }

                    $(this).find('.scroll-list').first().children().eq(activeOption).css({'background-color': '#f3f3f3'});
                }
            }
            // DOWN ARROW
            if (e.keyCode === 40) {
                if (typeof $(this).find('.scroll-list > div').first() !== "undefined" && !($(this).find('.scroll-list').first().children().length > 1)) {
                    $(this).find('.scroll-list > div').first().children().eq(activeOption).css({"background-color": "white"});
                    if ($(this).find('.scroll-list > div').first().children().length === activeOption + 1) {
                        activeOption = 0;
                    }
                    else {
                        activeOption++;
                    }
                    $(this).find('.scroll-list > div').first().children().eq(activeOption).css({'background-color': '#f3f3f3'});
                }
                else if ($(this).find('.scroll-list').first().children().length > 1) {
                    $(this).find('.scroll-list').first().children().eq(activeOption).css({"background-color": "white"});
                    if ($(this).find('.scroll-list').first().children().length === activeOption + 1) {
                        activeOption = 0;
                    }
                    else {
                        activeOption++;
                    }
                    $(this).find('.scroll-list').first().children().eq(activeOption).css({'background-color': '#f3f3f3'});
                }
            }
            //ENTER
            if (e.keyCode === 13) {
                var selectedItem = $(this).find(".text");
                var activeKeyItem = $(this).find('.scroll-list').first().children().eq(activeOption);
                if ($(this).hasClass("disabling-on") && activeKeyItem.hasClass("disabled")) {
                    e.stopPropagation();
                    return;
                }
                if ($(this).find('.scroll-list').first().children().length > 1) {
                    if ($(this).find('.scroll-list').first().children().eq(activeOption).find('div > span').length > 0) {
                        selectedItem.text($(this).find('.scroll-list').first().children().eq(activeOption).find('div > span').text());
                    }
                    else {
                        selectedItem.text($(this).find('.scroll-list').first().children().eq(activeOption).first().text());
                    }
                    selectedItem.data("value", $(this).find('.scroll-list').first().children().eq(activeOption).find('div').data('value'));
                }
                else {
                    selectedItem.text($(this).find('.scroll-list > div').first().children().eq(activeOption).text());
                    selectedItem.data("value", $(this).find('.scroll-list > div').first().children().eq(activeOption).data('value'));
                }
                hideOptions();
            }
            e.stopPropagation();
        });

        element.off("click", ".cly-select .select-items .item").on("click", ".cly-select .select-items .item", function(e) {
            var clySelect = $(this).parents(".cly-select");
            var selectedItem = clySelect.find(".text");
            if (clySelect.hasClass("disabling-on") && $(this).hasClass("disabled")) {
                e.stopPropagation();
                return;
            }
            selectedItem.text($(this).text());
            selectedItem.data("value", $(this).data("value"));
            clySelect.trigger("cly-select-change", [$(this).data("value")]);
        });

        element.off("keyup", ".cly-select .search input").on("keyup", ".cly-select .search input", function() {
            if (!$(this).val()) {
                $(this).parents(".cly-select").find(".item").removeClass("hidden");
                $(this).parents(".cly-select").find(".group").show();
            }
            else {
                $(this).parents(".cly-select").find(".item:not(:contains('" + $(this).val() + "'))").addClass("hidden");
                $(this).parents(".cly-select").find(".item:contains('" + $(this).val() + "')").removeClass("hidden");
                var prevHeader = $(this).parents(".cly-select").find(".group").first();
                prevHeader.siblings().each(function() {
                    if ($(this).hasClass("group")) {
                        if (prevHeader) {
                            prevHeader.hide();
                        }
                        prevHeader = $(this);
                    }
                    else if ($(this).hasClass("item") && $(this).is(":visible")) {
                        prevHeader = null;
                    }

                    if (!$(this).next().length && prevHeader) {
                        prevHeader.hide();
                    }
                });
            }
        });

        element.off('mouseenter').on('mouseenter', ".cly-select .item", function() {
            var item = $(this);

            if (this.offsetWidth < this.scrollWidth && !item.attr('title')) {
                item.attr('title', item.text());
            }
        });

        $(window).click(function() {
            hideOptions();
        });

        $.fn.clySelectSetItems = function(items) {
            var $selectItems = $(this).find(".select-items");

            if ($selectItems) {
                $selectItems.html("");

                for (var i = 0; i < items.length; i++) {
                    var current = items[i];
                    if (current.type === 'group') {
                        $selectItems.append('<div class="group">' + current.name + '</div>');
                    }
                    else if (current.disabled) {
                        // effective when .cly-select element has disabling-on class
                        $selectItems.append('<div data-value="' + current.value + '" class="item disabled">' + current.name + '</div>');
                    }
                    else {
                        $selectItems.append('<div data-value="' + current.value + '" class="item">' + current.name + '</div>');
                    }
                }
            }
        };

        $.fn.clySelectGetSelection = function() {
            return $(this).find(".select-inner .text").data("value") || null;
        };

        $.fn.clySelectSetSelection = function(value, name) {
            $(this).find(".select-inner .text").data("value", value);
            $(this).find(".select-inner .text").text($('<div>').html(name).text());
            $(this).trigger("cly-select-change", [value]);
        };
    };

    CountlyHelpers.makeSelectNative = function() {
        var rows = $('body').find('.cly-select');
        for (var i = 0; i < rows.length; i++) {
            $(rows[i]).attr('tabindex', '0');
        }
    };

    /**
    * Initialize countly dropdown multi select. In most cases it is done automatically, only in some cases, when content loaded via ajax request outside of view lifecycle, you may need to initialize it yourself for your content specifically
    * @param {object} element - jQuery object reference
    * @example
    * CountlyHelpers.initializeMultiSelect($("#my-dynamic-div"));
    */
    CountlyHelpers.initializeMultiSelect = function(element) {
        element = element || $("body");

        element.off("click", ".cly-multi-select").on("click", ".cly-multi-select", function(e) {
            if ($(this).hasClass("disabled")) {
                return true;
            }

            $(this).removeClass("req");

            var selectItems = $(this).find(".select-items"),
                itemCount = selectItems.find(".item").length;

            if (!selectItems.length) {
                return false;
            }

            $(".cly-select").find(".search").remove();
            $(".cly-multi-select").find(".search").remove();

            if (selectItems.is(":visible")) {
                $(this).removeClass("active");
            }
            else {
                $(".cly-select").removeClass("active");
                $(".cly-multi-select").removeClass("active");
                $(".select-items").hide();
                $(this).addClass("active");

                if (itemCount > 10) {
                    $("<div class='search'><div class='inner'><input type='search' readonly onfocus=\"if (this.hasAttribute('readonly')) {this.removeAttribute('readonly'); this.blur(); this.focus();}\" /><i class='fa fa-search'></i></div></div>").insertBefore($(this).find(".select-items"));
                }
            }

            if ($(this).find(".select-items").is(":visible")) {
                $(this).find(".select-items").hide();
            }
            else {
                $(this).find(".select-items").show();
                if ($(this).find(".select-items").find(".scroll-list").length === 0) {
                    $(this).find(".select-items").wrapInner("<div class='scroll-list'></div>");
                    $(this).find(".scroll-list").slimScroll({
                        height: '100%',
                        start: 'top',
                        wheelStep: 10,
                        position: 'right',
                        disableFadeOut: true
                    });
                }
            }

            $(this).find(".select-items").find(".item").removeClass("hidden");
            $(this).find(".select-items").find(".group").show();
            $(this).find(".select-items").find(".item").removeClass("last");
            $(this).find(".select-items").find(".item:visible:last").addClass("last");

            $(this).find(".search input").focus();

            $("#date-picker").hide();

            $(this).find(".search").off("click").on("click", function(e1) {
                e1.stopPropagation();
            });

            e.stopPropagation();

            var $multiSelect = $(this);

            setTimeout(function() {
                var maxToSelect = $multiSelect.data("max");
                var selectedItems = getSelected($multiSelect) || [];
                for (var i = 0; i < selectedItems.length; i++) {
                    $multiSelect.find(".item[data-value='" + selectedItems[i] + "']").addClass("disabled");
                }

                if (maxToSelect) {
                    if (selectedItems.length >= maxToSelect) {
                        $multiSelect.find(".item").addClass("disabled");
                    }
                }
            }, 0);
        });

        element.off("click", ".cly-multi-select .select-items .item").on("click", ".cly-multi-select .select-items .item", function(e) {
            if ($(this).hasClass("disabled")) {
                e.stopPropagation();
                return;
            }

            var $multiSelect = $(this).parents(".cly-multi-select"),
                selectionContainer = $multiSelect.find(".text"),
                selectedValue = $(this).data("value"),
                maxToSelect = $multiSelect.data("max");

            if ($(this).hasClass("selected")) {
                selectionContainer.find(".selection[data-value='" + selectedValue + "']").remove();
                $(this).removeClass("selected");
            }
            else {
                var $selection = $("<div class='selection'></div>");

                $selection.text($(this).text());
                $selection.attr("data-value", selectedValue);
                $selection.append("<div class='remove'><i class='ion-android-close'></i></div>");

                selectionContainer.append($selection);

                $(this).addClass("selected");
            }

            if (maxToSelect) {
                if (getSelected($multiSelect).length >= maxToSelect) {
                    $multiSelect.find(".item").addClass("disabled");
                }
            }

            if ($multiSelect.find(".item.selected").length > 0) {
                $multiSelect.addClass("selection-exists");
            }
            else {
                $multiSelect.removeClass("selection-exists");
            }

            $multiSelect.data("value", getSelected($multiSelect));
            $multiSelect.trigger("cly-multi-select-change", [getSelected($multiSelect)]);
            e.stopPropagation();
        });

        element.off("keyup", ".cly-multi-select .search input").on("keyup", ".cly-multi-select .search input", function() {
            var $multiSelect = $(this).parents(".cly-multi-select");

            if (!$(this).val()) {
                $multiSelect.find(".item").removeClass("hidden");
                $multiSelect.find(".group").show();
            }
            else {
                $multiSelect.find(".item:not(:contains('" + $(this).val() + "'))").addClass("hidden");
                $multiSelect.find(".item:contains('" + $(this).val() + "')").removeClass("hidden");
                var prevHeader = $multiSelect.find(".group").first();
                prevHeader.siblings().each(function() {
                    if ($(this).hasClass("group")) {
                        if (prevHeader) {
                            prevHeader.hide();
                        }
                        prevHeader = $(this);
                    }
                    else if ($(this).hasClass("item") && $(this).is(":visible")) {
                        prevHeader = null;
                    }

                    if (!$(this).next().length && prevHeader) {
                        prevHeader.hide();
                    }
                });
            }
        });

        element.off('mouseenter').on('mouseenter', ".cly-multi-select .item", function() {
            var item = $(this);

            if (this.offsetWidth < this.scrollWidth && !item.attr('title')) {
                item.attr('title', item.text());
            }
        });

        element.off("click", ".cly-multi-select .selection").on("click", ".cly-multi-select .selection", function(e) {
            e.stopPropagation();
        });

        element.off("click", ".cly-multi-select .selection .remove").on("click", ".cly-multi-select .selection .remove", function(e) {
            var $multiSelect = $(this).parents(".cly-multi-select");

            $multiSelect.find(".item[data-value='" + $(this).parent(".selection").data("value") + "']").removeClass("selected");

            if ($multiSelect.find(".item.selected").length > 0) {
                $multiSelect.addClass("selection-exists");
            }
            else {
                $multiSelect.removeClass("selection-exists");
            }

            $(this).parent(".selection").remove();

            var maxToSelect = $multiSelect.data("max") || 99;

            if (maxToSelect) {
                if (getSelected($multiSelect).length < maxToSelect) {
                    $multiSelect.find(".item").removeClass("disabled");
                }
            }

            var selectedItems = getSelected($multiSelect) || [];
            for (var i = 0; i < selectedItems.length; i++) {
                $multiSelect.find(".item[data-value='" + selectedItems[i] + "']").addClass("disabled");
            }

            $multiSelect.data("value", getSelected($multiSelect));
            $multiSelect.trigger("cly-multi-select-change", [getSelected($multiSelect)]);

            e.stopPropagation();
        });

        $(window).click(function() {
            var $clyMultiSelect = $(".cly-multi-select");

            $clyMultiSelect.find(".select-items").hide();
            $clyMultiSelect.find(".search").remove();
            $clyMultiSelect.removeClass("active");
        });
        /** get selected from multi select
        * @param {object} multiSelectEl multi select element
        * @returns {array} array of selected values
        */
        function getSelected(multiSelectEl) {
            var selected = [];

            multiSelectEl.find(".text .selection").each(function() {
                selected.push($(this).data("value"));
            });

            return selected;
        }

        $.fn.clyMultiSelectSetItems = function(items) {
            var $selectItems = $(this).find(".select-items");

            if ($selectItems) {
                $selectItems.html("");

                for (var i = 0; i < items.length; i++) {
                    $selectItems.append('<div data-value="' + items[i].value + '" class="item">' + items[i].name + '</div>');
                }
            }
        };

        $.fn.clyMultiSelectGetItems = function() {
            var items = [];
            $(this).find(".item").each(function() {
                items.push({name: $(this).text(), value: $(this).data("value")});
            });
            return items;
        };

        $.fn.clyMultiSelectGetSelection = function() {
            return getSelected($(this));
        };

        $.fn.clyMultiSelectSetSelection = function(valNameArr) {
            var $multiSelect = $(this),
                $selectionContainer = $multiSelect.find(".text");

            $(this).find(".selection").remove();

            for (var i = 0; i < valNameArr.length; i++) {
                var name = valNameArr[i].name,
                    value = valNameArr[i].value;

                var $selection = $("<div class='selection'></div>");

                $selection.text($('<div>').html(name).text());
                $selection.attr("data-value", value);
                $selection.append("<div class='remove'><i class='ion-android-close'></i></div>");

                $selectionContainer.append($selection);
            }

            $(this).addClass("selection-exists");
            $(this).data("value", getSelected($(this)));
            $(this).trigger("cly-multi-select-change", [getSelected($(this))]);
        };

        $.fn.clyMultiSelectClearSelection = function() {
            $(this).find(".selection").remove();
            $(this).data("value", getSelected($(this)));
            $(this).removeClass("selection-exists");
            $(this).trigger("cly-multi-select-change", [getSelected($(this))]);
        };
    };

    /**
    * Initialize dropdown options list usually used on datatables. Firstly you need to add list with class 'cly-button-menu' to your template or add it in the view. Additionally you can add class `dark` to use dark theme.
    * After that datatables last column for options should return a element with `cly-list-options` class and should have cell classes shrink and right and should not be sortable
    * Then call this method in your view and you can start listening to events like:
    * cly-list.click - when your cly-list-options element is clicked, passing click event as data
    * cly-list.open - when list is opened, passing click event as data
    * cly-list.close - when list is closed, passing click event as data
    * cly-list.item - when item is clicked, passing click event as data
    * @param {object} element - jQuery object reference for container
    * @example <caption>Adding list to HTML template</caption>
    * <div class="cly-button-menu dark cohorts-menu" tabindex="1">
    *     <a class="item delete-cohort" data-localize='common.delete'></a>
    *     <a class="item view-cohort" data-localize='cohorts.view-users'></a>
    * </div>
    * @example <caption>Creating last column in datatables</caption>
    * { "mData": function(row, type){
    *     return '<a class="cly-list-options"></a>';
    * }, "sType":"string", "sTitle": "", "sClass":"shrink center", bSortable: false  }
    * @example <caption>Listening to events</caption>
    * $(".cly-button-menu").on("cly-list.click", function(event, data){
    *     var id = $(data.target).parents("tr").data("id");
    * });
    */
    CountlyHelpers.initializeTableOptions = function(element) {
        element = element || $('body');
        element.find("tbody").off("click", ".cly-list-options").on("click", ".cly-list-options", function(event) {
            event.stopPropagation();
            event.preventDefault();
            $(".cly-button-menu").trigger('cly-list.click', event);
            $(event.target).toggleClass("active");
            if ($(event.target).hasClass("active")) {
                element.find(".cly-list-options").removeClass("active");
                $(event.target).addClass("active");
                var pos = $(event.target).offset();
                element.find('.cly-button-menu').css({
                    top: (pos.top + 25) + "px",
                    right: 22 + "px"
                });
                element.find('.cly-button-menu').addClass("active");
                element.find('.cly-button-menu').focus();
                $(".cly-button-menu").trigger('cly-list.open', event);
            }
            else {
                $(event.target).removeClass("active");
                element.find('.cly-button-menu').removeClass("active");
                $(".cly-button-menu").trigger('cly-list.close', event);
            }
            return false;
        });

        element.find('.cly-button-menu .item').off("click").on("click", function(event) {
            $(".cly-button-menu").trigger('cly-list.item', event);
            element.find('.cly-button-menu').removeClass("active");
            element.find(".cly-list-options").removeClass("active");
            $(".cly-button-menu").trigger('cly-list.close', event);
        });

        element.find('.cly-button-menu').off("blur").on("blur", function() {
            element.find('.cly-button-menu').removeClass("active");
            element.find(".cly-list-options").removeClass("active");
            $(".cly-button-menu").trigger('cly-list.close', event);
        });
    };

    /** Adds column selector to data table
     * @param {object} dtable - data table jquery object
     * @param {object} config - configuration for disabling columns
     * @param {object} config.disabled - object for disabled column names. Optional. If nothing set, you can disable all columns. Example: {"name1":true,"name2":true}
     * @param {object} config.visible -Default visible columns. If none set - first N are taken to not exceed max column count. If user has changed it, it gets overwritten by data stored in local storage.
     * @param {number} config.maxCol  - max column count. If not set - max == all columns.
     * @param {string} tableName - table name. Used to create name for storage. need to be unique for every table.
     * 
     *  Example:
     *   CountlyHelpers.addColumnSelector(dtable,{"disabled:"{"name1":true,"name2":true},maxCol:6},"myTableName");
     *  Safe way would be adding in "fnInitComplete" function:
     *
     *  "fnInitComplete": function(oSettings, json) {
     *      $.fn.dataTable.defaults.fnInitComplete(oSettings, json);
     *      CountlyHelpers.addColumnSelector(this, {"disabled":{"name1":true,"name2":true}, "maxCol":5 }, "viewsTable");
     * },
     */
    CountlyHelpers.addColumnSelector = function(dtable, config, tableName) {
        config = config || {};
        config.disabled = config.disabled || {};

        var haveConfigVisible = false;
        if (!config.visible) {
            config.visible = {};
        }
        else {
            haveConfigVisible = true;
        }

        var settings = store.get(tableName + "VisibleDataTableColumns");
        var settingsOld = store.get(tableName + "HiddenDataTableColumns") ;
        var saveSettings = false;
        var tableCols = dtable.fnSettings().aoColumns || [];
        var maxCol = config.maxCol || tableCols.length;
        var colIndex = 0;

        //Take values if selection is stored in old format
        if (settingsOld && typeof settingsOld === 'object' && Object.keys(settingsOld).length > 0) {
            settings = settings || {};
            var dd = {};
            for (colIndex = 0; colIndex < tableCols.length; colIndex++) {
                if (tableCols[colIndex].columnSelectorIndex) {
                    dd[tableCols[colIndex].columnSelectorIndex] = true;
                }
            }
            for (var z in settingsOld) {
                var i = parseInt(z, 10);
                if (tableCols[i] && tableCols[i].columnSelectorIndex) {
                    dd[tableCols[i].columnSelectorIndex] = false;
                }
            }

            for (var zz in config.disabled) {
                if (dd && dd[zz]) {
                    dd[zz] = false;
                }
            }
            var cc = 0;
            for (var p in dd) {
                if (dd[p] === true && cc < maxCol) {
                    settings[p] = true;
                    cc = cc + 1;
                }
            }
            saveSettings = true;
            store.remove(tableName + "HiddenDataTableColumns");
        }

        if (settings && typeof settings === 'object') {
            config.visible = settings;
            haveConfigVisible = true;
        }
        else {
            saveSettings = true;
        }

        var totalCol = 0;
        var SelectedReviewMap = {};

        dtable.CoultyColumnSel = {};
        dtable.CoultyColumnSel.tableCol = 0;

        var str = "";
        var selectedC = 0;


        //Clear out keys not represented in table
        for (var k in config.visible) {
            SelectedReviewMap[k] = 4;
        }
        for (colIndex = 0; colIndex < tableCols.length; colIndex++) {
            if (tableCols[colIndex].columnSelectorIndex) {
                if (!(config.disabled[tableCols[colIndex].columnSelectorIndex])) {
                    totalCol = totalCol + 1;
                }
                if (SelectedReviewMap[tableCols[colIndex].columnSelectorIndex]) {
                    SelectedReviewMap[tableCols[colIndex].columnSelectorIndex] = 5;
                }
            }
        }

        for (var zp in SelectedReviewMap) {
            if (SelectedReviewMap[zp] === 4) {
                delete config.visible[zp];
                saveSettings = true;
            }
        }

        //Take first N values if none set by config or stored selection
        if (!haveConfigVisible) {
            var cp = 0;
            for (colIndex = 0; colIndex < tableCols.length && cp < maxCol; colIndex++) {
                if (tableCols[colIndex].columnSelectorIndex) {
                    if (!(config.disabled[tableCols[colIndex].columnSelectorIndex])) {
                        config.visible[tableCols[colIndex].columnSelectorIndex] = true;
                        cp++;
                    }
                }
            }
            saveSettings = true;
        }

        if (saveSettings) { // we don't have stored value
            store.set(tableName + "VisibleDataTableColumns", config.visible);
        }
        str = redrawColumnsVisibilityTable(tableCols, config, dtable, "");
        selectedC = str.selectedC || 0;
        str = str.str || "";
        dtable.CoultyColumnSel.maxCol = Math.min(maxCol, totalCol);
        $(dtable[0]).parent().find(".select-column-table-data").first().after('<div class="data-table-column-selector" tabindex="1"><div class="title" ><span style="margin-left: 15px;">' + jQuery.i18n.map["common.select-columns-to-display"] + '</span><span class="columncounter" style="margin-right: 15px;">' + selectedC + '/' + dtable.CoultyColumnSel.maxCol + '</span></div><div class="export-columns-search"><table><tr><td><input placeholder="' + jQuery.i18n.map["placeholder.search-columns"] + '" type="text" /></td><td><i class="fa fa-search"></i></td><tr></table></div><div class="all_columns scrollable"><table>' + str + '</table></div></div>');
        if (tableCols.length > 8) {
            $(dtable[0]).parent().find('.scrollable').slimScroll({
                height: '100%',
                start: 'top',
                wheelStep: 10,
                position: 'right',
                disableFadeOut: true
            });
        }

        if (selectedC >= dtable.CoultyColumnSel.maxCol) {
            $(dtable[0]).parent().find(".columncounter").first().addClass('red');
            $(dtable[0]).parent().find(".data-table-column-selector").first().addClass('full-select');
        }

        $(dtable[0]).parent().find(".select-column-table-data").first().on("click", function(e) {
            if ($(this).hasClass('active')) {
                $(this).removeClass('active');
            }
            else {
                $(this).addClass('active');
            }
            e.stopPropagation();
        });

        $("body").on("click", function() {
            $(dtable[0]).parent().find(".select-column-table-data").first().removeClass("active");
        });

        $(".data-table-column-selector").on("click", function(e) {
            e.stopPropagation();
        });

        $($(dtable[0]).parent().find(".data-table-column-selector")).on("click", "td", function() {
            var checkbox = $(this).find(".data-table-toggle-column").first();
            var isChecked = $(checkbox).hasClass("fa-check-square");//is now checked
            if (!(config.disabled && config.disabled[$(this).data("selectorname")] && config.disabled[$(this).data("selectorname")] === true)) {
                if (isChecked) {
                    $(checkbox).addClass("fa-square-o");
                    $(checkbox).removeClass("fa-check-square");
                    $(this).addClass('not-checked');
                    CountlyHelpers.changeDTableColVis(config, dtable, tableName, $(this).data("selectorname"), false);
                }
                else {
                    if (CountlyHelpers.changeDTableColVis(config, dtable, tableName, $(this).data("selectorname"), true)) {
                        $(checkbox).removeClass("fa-square-o");
                        $(checkbox).addClass("fa-check-square");
                        $(this).removeClass('not-checked');
                    }
                }
            }
        });

        $(dtable[0]).parent().find(".export-columns-search input").on("keyup", function() {
            var value = $(dtable[0]).parent().find(".export-columns-search input").val();
            var settings_my = store.get(tableName + "VisibleDataTableColumns") || {};
            var vv = redrawColumnsVisibilityTable(tableCols, {visible: settings_my, disabled: config.disabled, maxCol: config.maxCol}, dtable, value);
            $(dtable[0]).parent().find(".data-table-column-selector .all_columns table").first().replaceWith("<table>" + vv.str + "</table>");
        });


        $(dtable[0]).parent().find(".select-column-table-data").css("display", "table-cell");


        var visibleColCount = dtable.oApi._fnVisbleColumns(dtable.fnSettings());
        $(dtable).find('.dataTables_empty').first().attr("colspan", visibleColCount);
    };

    var redrawColumnsVisibilityTable = function(tableCols, config, dtable, value) {
        if (value) {
            value = new RegExp((value || ""), 'i');
        }
        var myClass = "";
        var myClass2 = "";
        var disabled = "";
        var str = "";
        var startLine = true;
        var selectedC = 0;


        for (var colIndex = 0; colIndex < tableCols.length; colIndex++) {
            if (tableCols[colIndex].columnSelectorIndex) {
                var colName = tableCols[colIndex].columnSelectorIndex;
                myClass = 'fa-check-square';
                myClass2 = "";
                disabled = "";

                if (config.disabled && config.disabled[tableCols[colIndex].columnSelectorIndex] && config.disabled[tableCols[colIndex].columnSelectorIndex] === true) {
                    disabled = " disabled";
                }
                else if (config.visible && config.visible[tableCols[colIndex].columnSelectorIndex] && config.visible[tableCols[colIndex].columnSelectorIndex] === true) {
                    selectedC++;
                }
                else {
                    myClass = 'fa-square-o';
                    myClass2 = ' not-checked';
                    dtable.fnSetColumnVis(parseInt(colIndex), false, false);
                }
                var hideMe = false;
                if (value && !tableCols[colIndex].sTitle.match(value)) {
                    hideMe = true;
                }
                if (hideMe) {
                    if (startLine) {
                        str += "<tr style='display:none'><td  data-selectorname='" + colName + "' data-index='" + colIndex + "' class='" + myClass2 + disabled + "'><div><a data-index='" + colIndex + "' class='fa check-green check-header " + myClass + disabled + " data-table-toggle-column'></a></div>" + tableCols[colIndex].sTitle + "</td></tr>";
                    }
                    else {
                        str += "<td style='display:none'  data-selectorname='" + colName + "' data-index='" + colIndex + "' class='" + myClass2 + disabled + "'><div><a data-index='" + colIndex + "' class='fa check-green check-header " + myClass + disabled + " data-table-toggle-column'></a></div>" + tableCols[colIndex].sTitle + "</td>";
                    }
                }
                else if (startLine === true) {
                    str += "<tr><td data-selectorname='" + colName + "' data-index='" + colIndex + "' class='" + myClass2 + disabled + "'><div><a data-index='" + colIndex + "' class='fa check-green check-header " + myClass + disabled + " data-table-toggle-column'></a></div>" + tableCols[colIndex].sTitle + "</td>";
                    startLine = false;
                }
                else {
                    str += "<td data-selectorname='" + colName + "' data-index='" + colIndex + "' class='" + myClass2 + disabled + "'><div><a data-index='" + colIndex + "' class='fa check-green check-header " + myClass + disabled + " data-table-toggle-column'></a></div>" + tableCols[colIndex].sTitle + "</td></tr>";
                    startLine = true;
                }
            }
        }
        if (!startLine) {
            str += "<td></td></tr>";
        }

        return {str: str, selectedC: selectedC};
    };

    /** function hides column in data table and stores config in local storage
     * @param {object} config  - config object for table
     * @param {object} dtable  - data table object
     * @param {string} tableName - name to use to save in local storage settings
     * @param {number} col  - column number
     * @param {boolean} visible - true - if need to show
     * @returns {boolean} if changes were applied - true, if not false. Changes could not be applied if selecting this column means selecting more columns than allowed
     */
    CountlyHelpers.changeDTableColVis = function(config, dtable, tableName, col, visible) {
        var settings = store.get(tableName + "VisibleDataTableColumns") || {};
        var applyChanges = true;
        if (visible) {
            if (!settings[col] && Object.keys(settings).length < dtable.CoultyColumnSel.maxCol) {
                settings[col] = true;
            }
            else {
                applyChanges = false;
            }
        }
        else {
            delete settings[col];
        }

        var selC = 0;


        if (applyChanges) {
            var tableCols = dtable.fnSettings().aoColumns;
            for (var colIndex = 0; colIndex < tableCols.length; colIndex++) {
                if (tableCols[colIndex].columnSelectorIndex) {
                    if (settings[tableCols[colIndex].columnSelectorIndex] === true) {
                        dtable.fnSetColumnVis(colIndex, true, true);
                        selC++;
                    }
                    else if (config.disabled[tableCols[colIndex].columnSelectorIndex] === true) {
                        dtable.fnSetColumnVis(colIndex, true, false);
                    }
                    else {
                        dtable.fnSetColumnVis(colIndex, false, false);
                    }
                }
            }

            $(dtable[0]).parent().find(".columncounter").first().html(selC + "/" + dtable.CoultyColumnSel.maxCol);

            if (selC >= dtable.CoultyColumnSel.maxCol) {
                $(dtable[0]).parent().find(".columncounter").first().addClass('red');
                $(dtable[0]).parent().find(".data-table-column-selector").first().addClass('full-select');
            }
            else {
                $(dtable[0]).parent().find(".columncounter").first().removeClass('red');
                $(dtable[0]).parent().find(".data-table-column-selector").first().removeClass('full-select');
            }

            store.set(tableName + "VisibleDataTableColumns", settings);
            var visibleColCount = dtable.oApi._fnVisbleColumns(dtable.fnSettings());
            $(dtable).find('.dataTables_empty').first().attr("colspan", visibleColCount);

            var wrapper = dtable.parents('.dataTables_wrapper').first();
            if ($(wrapper).find('.sticky-header').length > 0) { //check if we have sticky header
                dtable.stickyTableHeaders(); //fix sticky header
            }
        }
        return applyChanges;
    };

    /**
    * Refresh existing datatable instance on view refresh, providing new data
    * @param {object} dTable - jQuery object datatable reference
    * @param {object} newDataArr - array with new data in same format as provided while initializing table
    * @example
    * CountlyHelpers.refreshTable(self.dtable, data);
    */
    CountlyHelpers.refreshTable = function(dTable, newDataArr) {
        var oSettings = dTable.fnSettings();
        dTable.fnClearTable(false);

        if (newDataArr && newDataArr.length) {
            for (var i = 0; i < newDataArr.length; i++) {
                dTable.oApi._fnAddData(oSettings, newDataArr[i]);
            }
        }

        if (store.get(dTable[0].id + '_sort')) {
            oSettings.aaSorting = [store.get(dTable[0].id + '_sort')];
        }

        oSettings.aiDisplay = oSettings.aiDisplayMaster.slice();
        dTable.fnStandingRedraw();
        dTable.trigger("table.refresh");
    };

    /**
    * In some cases you may want to allow expanding rows of your datatable. To do that you must add unique id to each row via datatables fnRowCallback property
    * @param {object} dTable - jQuery object datatable reference
    * @param {function} getData - callback function to be called when clicking ont he row. This function will receive original row data object you passed to data tables and should return HTML string to display in subcell
    * @param {object} context - this context if needed, which will be passed to getData function as second parameter
    * @example
    * function formatData(data){
    *    // `data` is the original data object for the row
    *    //return string to display in subcell
    *    var str = '';
	*	if(data){
	*		str += '<div class="datatablesubrow">'+
    *        JSON.stringify(data)+
    *        '</div>';
    *    }
    *    return str;
    * }
    * this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
    *      "aaData": crashData.data,
	*		"fnRowCallback": function( nRow, aData, iDisplayIndex, iDisplayIndexFull ) {
	*			$(nRow).attr("id", aData._id);
	*		},
    *      "aoColumns": [
	*			{ "mData": "ts"}, "sType":"format-ago", "sTitle": jQuery.i18n.map["crashes.crashed"]},
	*			{ "mData": "os", "sType":"string", "sTitle": jQuery.i18n.map["crashes.os_version"] },
	*			{ "mData": "device"}, "sType":"string", "sTitle": jQuery.i18n.map["crashes.device"]},
	*			{ "mData": "app_version", "sType":"string", "sTitle": jQuery.i18n.map["crashes.app_version"] }
    *      ]
    *  }));
    *  CountlyHelpers.expandRows(this.dtable, formatData);
    */
    CountlyHelpers.expandRows = function(dTable, getData, context) {
        dTable.aOpen = [];
        dTable.on("click", "tr", function() {
            var nTr = this;
            var id = $(nTr).attr("id");
            if (id) {
                var i = $.inArray(id, dTable.aOpen);

                if (i === -1) {
                    $(nTr).addClass("selected");
                    var nDetailsRow = dTable.fnOpen(nTr, getData(dTable.fnGetData(nTr), context), 'details');
                    $('div.datatablesubrow', nDetailsRow).show();
                    dTable.aOpen.push(id);
                    dTable.trigger("row.open", id);
                }
                else {
                    $(nTr).removeClass("selected");
                    $('div.datatablesubrow', $(nTr).next()[0]).hide();
                    dTable.fnClose(nTr);
                    dTable.aOpen.splice(i, 1);
                    dTable.trigger("row.close", id);
                }
                var expandIcon = $(nTr).find(".expand-row-icon");
                if (expandIcon.length === 1) {
                    expandIcon.text("keyboard_arrow_" + ((i === -1) ? "up" : "down"));
                }
            }
        });
    };


    CountlyHelpers.expandRowIconColumn = function() {
        return {
            "mData":
            function() {
                return '<i class="material-icons expand-row-icon">  keyboard_arrow_down  </i>';
            },
            "sType": "string",
            "sTitle": '',
            "bSortable": false,
            "noExport": true,
            'sWidth': '1px'
        };
    };

    /**
    * If you allow to open/expand rows, then when refreshing table they will close again. To avoid that you must call this function on each refresh after calling {@link CountlyHelpers.refreshTable}
    * @param {object} dTable - jQuery object datatable reference
    * @param {function} getData - callback function to be called when clicking ont he row. This function will receive original row data object you passed to data tables and should return HTML string to display in subcell
    * @param {object} context - this context if needed, which will be passed to getData function as second parameter
    * @example
    * CountlyHelpers.refreshTable(self.dtable, data);
    * CountlyHelpers.reopenRows(self.dtable, formatData);
    */
    CountlyHelpers.reopenRows = function(dTable, getData, context) {
        var nTr;
        if (dTable.aOpen) {
            $.each(dTable.aOpen, function(i, id) {
                nTr = $("#" + id)[0];
                $(nTr).addClass("selected");
                $(nTr).find('i.expand-row-icon').text('keyboard_arrow_up');
                var nDetailsRow = dTable.fnOpen(nTr, getData(dTable.fnGetData(nTr), context), 'details');
                $('div.datatablesubrow', nDetailsRow).show();
                dTable.trigger("row.reopen", id);
            });
        }
    };

    /**
    * Close all opened datatables rows
    * @param {object} dTable - jQuery object datatable reference
    * @example
    * CountlyHelpers.closeRows(self.dtable);
    */
    CountlyHelpers.closeRows = function(dTable) {
        if (dTable.aOpen) {
            $.each(dTable.aOpen, function(i, id) {
                var nTr = $("#" + id)[0];
                $(nTr).removeClass("selected");
                $(nTr).find('i.expand-row-icon').text('keyboard_arrow_down');
                $('div.datatablesubrow', $(nTr).next()[0]).slideUp(function() {
                    dTable.fnClose(nTr);
                    dTable.aOpen.splice(i, 1);
                });
                dTable.trigger("row.close", id);
            });
        }
    };

    /**
    * Convert array of app ids to comma separate string of app names
    * @param {array} context - array with app ids
    * @returns {string} list of app names (appname1, appname2)
    * @example
    * //outputs Test1, Test2, Test3
    * CountlyHelpers.appIdsToNames(["586e3216326a8b0a07b8d87f", "586e339a326a8b0a07b8ecb9", "586e3343c32cb30a01558cc3"]);
    */
    CountlyHelpers.appIdsToNames = function(context) {
        var ret = "";

        for (var i = 0; i < context.length; i++) {
            if (!context[i]) {
                continue;
            }
            else if (!countlyGlobal.apps[context[i]]) {
                ret += 'deleted app';
            }
            else {
                ret += countlyGlobal.apps[context[i]].name;
            }

            if (context.length > 1 && i !== context.length - 1) {
                ret += ", ";
            }
        }

        return ret;
    };

    /**
    * Load JS file
    * @param {string} js - path or url to js file
    * @param {callback=} callback - callback when file loaded
    * @example
    * CountlyHelpers.loadJS("/myplugin/javascripts/custom.js");
    */
    CountlyHelpers.loadJS = function(js, callback) {
        var fileref = document.createElement('script'),
            loaded;
        fileref.setAttribute("type", "text/javascript");
        fileref.setAttribute("src", js);
        if (callback) {
            fileref.onreadystatechange = fileref.onload = function() {
                if (!loaded) {
                    callback();
                }
                loaded = true;
            };
        }
        document.getElementsByTagName("head")[0].appendChild(fileref);
    };

    /**
    * Load CSS file
    * @param {string} css - path or url to css file
    * @param {callback=} callback - callback when file loaded
    * @example
    * CountlyHelpers.loadCSS("/myplugin/stylesheets/custom.css");
    */
    CountlyHelpers.loadCSS = function(css, callback) {
        var fileref = document.createElement("link"),
            loaded;
        fileref.setAttribute("rel", "stylesheet");
        fileref.setAttribute("type", "text/css");
        fileref.setAttribute("href", css);
        if (callback) {
            fileref.onreadystatechange = fileref.onload = function() {
                if (!loaded) {
                    callback();
                }
                loaded = true;
            };
        }
        document.getElementsByTagName("head")[0].appendChild(fileref);
    };

    CountlyHelpers.messageText = function(messagePerLocale) {
        if (!messagePerLocale) {
            return '';
        }
        else if (messagePerLocale.default) {
            return messagePerLocale.default;
        }
        else if (messagePerLocale.en) {
            return messagePerLocale.en;
        }
        else {
            for (var locale in messagePerLocale) {
                return messagePerLocale[locale];
            }
        }
        return '';
    };
    /**
    * Creates function to be used as mRender for datatables to clip long values
    * @param {function=} f - optional function to change passed data to render and return changed object
    * @param {string=} nothing - text to display in cellS
    * @returns {function} to be used as mRender for datatables to clip long values
    */
    CountlyHelpers.clip = function(f, nothing) {
        return function(opt) {
            var res = typeof f === 'function' ? f(opt) : opt;
            return '<div class="clip' + (res ? '' : ' nothing') + '">' + (res || nothing) + '</div>';
        };
    };

    /**
    * Create Countly metric model to fetch metric data from server and provide it to views
    * @param {object} countlyMetric - initial metric object if you want to pre provide some methods, etc
    * @param {string} metric - metric name to retrieve from server
    * @param {jquery} $ - local jquery reference
    * @param {function=} fetchValue - default function to fetch and transform if needed value from standard metric model
    * @example
    *   window.countlyDensity = {};
    *   countlyDensity.checkOS = function(os, density){
    *        var lastIndex = density.toUpperCase().lastIndexOf("DPI");
    *        if(os.toLowerCase() == "android" && lastIndex !== -1 && lastIndex === density.length - 3)
    *            return true;
    *        if(os.toLowerCase() == "ios" && density[0] == "@")
    *            return true;
    *        return false;
    *   };
    *   CountlyHelpers.createMetricModel(window.countlyDensity, {name: "density", estOverrideMetric: "densities"}, jQuery, function(val, data, separate){
    *        if(separate){
    *            //request separated/unprocessed data
    *            return val;
    *        }
    *        else{
    *            //we can preprocess data and group, for example, by first letter
    *            return val[0];
    *        }
    *   });
    */
    CountlyHelpers.createMetricModel = function(countlyMetric, metric, $, fetchValue) {
        /**
        * Common metric object, all metric models inherit from it and should have these methods
        * @name countlyMetric
        * @global
        * @namespace countlyMetric
        */
        countlyMetric = countlyMetric || {};
        /**
        * Function to get value, modifying it before processing if needed.
        * @memberof countlyMetric
        * @param {string} value - value to fetch
        * @returns {string} modified value
        */
        countlyMetric.fetchValue = fetchValue;
        //Private Properties
        var _Db = {},
            _metrics = {},
            _activeAppKey = 0,
            _initialized = false,
            _processed = false,
            _period = null,
            _name = (metric.name) ? metric.name : metric,
            _estOverrideMetric = (metric.estOverrideMetric) ? metric.estOverrideMetric : "";
        var _promises = {};


        countlyMetric.getCurrentLoadState = function() {
            return {"init": _initialized, "period": _period};
        };
        //Public Methods
        /**
        * Initialize metric model to fetch initial data from server
        * @memberof countlyMetric
        * @param {boolean=} processed - if true will fetch processed data, will fetch raw data by default
        * @returns {jquery_promise} jquery promise to wait while data is loaded
        * @example
        * beforeRender: function() {
        *    return $.when(countlyMetric.initialize()).then(function () {});
        * }
        */
        countlyMetric.initialize = function(processed) {

            var periodToFetch = countlyCommon.getPeriodForAjax();

            var key = countlyCommon.ACTIVE_APP_ID + "-" + _name + "-" + periodToFetch;
            var key_refresh = countlyCommon.ACTIVE_APP_ID + "-" + _name + "-refresh";
            if (_promises[key]) {
                return _promises[key]; //we are currently running request for that. So return that.
            }
            else if (_promises[key_refresh]) {
                return _promises[key_refresh];
            }
            if (_initialized && _period === periodToFetch && _activeAppKey === countlyCommon.ACTIVE_APP_KEY) {
                return this.refresh();
            }
            _period = countlyCommon.getPeriodForAjax();

            if (!countlyCommon.DEBUG) {
                _activeAppKey = countlyCommon.ACTIVE_APP_KEY;
                _initialized = true;

                if (processed) {
                    _processed = true;
                    return $.ajax({
                        type: "GET",
                        url: countlyCommon.API_PARTS.data.r + "/analytics/metric",
                        data: {
                            "app_id": countlyCommon.ACTIVE_APP_ID,
                            "metric": _name,
                            "period": _period
                        },
                        success: function(json) {
                            _Db = json;
                            if (countlyMetric.callback) {
                                countlyMetric.callback(false, json);
                            }
                        }
                    });
                }
                else {

                    _promises[key] = $.ajax({
                        type: "GET",
                        url: countlyCommon.API_PARTS.data.r,
                        data: {
                            "app_id": countlyCommon.ACTIVE_APP_ID,
                            "method": _name,
                            "period": _period
                        },
                        success: function(json) {
                            _Db = json;
                            setMeta();
                            if (countlyMetric.callback) {
                                countlyMetric.callback(false, json);
                            }
                            delete _promises[key];
                        },
                        error: function() {
                            delete _promises[key];
                        }
                    });

                    return _promises[key];
                }
            }
            else {
                _Db = {"2012": {}};
                if (countlyMetric.callback) {
                    countlyMetric.callback(false, _Db);
                }
                return true;
            }
        };

        /**
        * Refresh metric model by fetching data only for the latest time bucket using action=refresh on server. Currently does not fetch data for processed data loaded on initialization
        * @memberof countlyMetric
        * @returns {jquery_promise} jquery promise to wait while data is loaded
        * @example
        *$.when(countlyMetric.refresh()).then(function () {
        *    //data loaded, do something
        *});
        */
        countlyMetric.refresh = function() {
            if (!countlyCommon.DEBUG) {

                if (_activeAppKey !== countlyCommon.ACTIVE_APP_KEY) {
                    _activeAppKey = countlyCommon.ACTIVE_APP_KEY;
                    return this.initialize();
                }

                if (_processed) {
                    if (countlyMetric.callback) {
                        countlyMetric.callback(true);
                    }
                }
                else {
                    var key = countlyCommon.ACTIVE_APP_ID + "-" + _name + "-refresh";
                    if (_promises[key]) {
                        return _promises[key]; //we are currently running request for that. So return that.
                    }
                    _promises[key] = $.ajax({
                        type: "GET",
                        url: countlyCommon.API_PARTS.data.r,
                        data: {
                            "app_id": countlyCommon.ACTIVE_APP_ID,
                            "method": _name,
                            "action": "refresh"
                        },
                        success: function(json) {
                            countlyCommon.extendDbObj(_Db, json);
                            extendMeta();
                            if (countlyMetric.callback) {
                                countlyMetric.callback(true, json);
                            }
                            delete _promises[key];
                        },
                        error: function() {
                            delete _promises[key];
                        }
                    });

                    return _promises[key];
                }
            }
            else {
                _Db = {"2012": {}};
                if (countlyMetric.callback) {
                    countlyMetric.callback(true, _Db);
                }
                return true;
            }
        };

        /**
        * Callback that each metric model can define, to be called when data is loaded or refreshed
        * @memberof countlyMetric
        * @example
        *countlyDeviceDetails.callback = function(isRefresh, data){
        *    if(isRefresh){
        *        countlyAppVersion.refresh(data);
        *    }
        *    else{
        *        countlyAppVersion.initialize();
        *    }
        *};
        */
        countlyMetric.callback;

        /**
        * Reset/delete all retrieved metric data, like when changing app or selected time period
        * @memberof countlyMetric
        */
        countlyMetric.reset = function() {
            if (_processed) {
                _Db = [];
            }
            else {
                _Db = {};
                setMeta();
            }
        };

        /**
        * Get current data, if some view or model requires access to raw data
        * @memberof countlyMetric
        * @return {object} raw data returned from server either in standard metric model or preprocessed data, based on what model uses
        */
        countlyMetric.getDb = function() {
            return _Db;
        };

        /**
        * Set current data for model, if you need to provide data for model from another resource (as loaded in different model)
        * @memberof countlyMetric
        * @param {object} db - set new data to be used by model
        */
        countlyMetric.setDb = function(db) {
            _Db = db;
            setMeta();
        };

        /**
        * Extend current data for model with some additional information about latest period (like data from action=refresh request)
        * @memberof countlyMetric
        * @param {object} data - set new data to be used by model
        */
        countlyMetric.extendDb = function(data) {
            countlyCommon.extendDbObj(_Db, data);
            extendMeta();
        };

        /**
        * Get array of unique segments available for metric data
        * @memberof countlyMetric
        * @param {string} metric1 - name of the segment/metric to get meta for, by default will use default _name provided on initialization
        * @returns {array} array of unique metric values
        */
        countlyMetric.getMeta = function(metric1) {
            metric1 = metric1 || _name;
            return _metrics[metric1] || [];
        };

        /**
        * Get data after initialize finished and data was retrieved
        * @memberof countlyMetric
        * @param {boolean} clean - should retrieve clean data or preprocessed by fetchValue function
        * @param {boolean} join - join new and total users into single graph, for example to dispaly in bars on the same graph and not 2 separate pie charts
        * @param {string} metric1 - name of the segment/metric to get data for, by default will use default _name provided on initialization
        * @param {string} estOverrideMetric - name of the total users estimation override, by default will use default _estOverrideMetric provided on initialization
        * @returns {object} chartData
        * @example <caption>Example output of separate data for 2 pie charts</caption>
        *{"chartData":[
        *    {"langs":"English","t":124,"u":112,"n":50},
        *    {"langs":"Italian","t":83,"u":74,"n":30},
        *    {"langs":"German","t":72,"u":67,"n":26},
        *    {"langs":"Japanese","t":62,"u":61,"n":19},
        *    {"langs":"French","t":66,"u":60,"n":28},
        *    {"langs":"Korean","t":64,"u":58,"n":26}
        *],
        *"chartDPTotal":{
        *    "dp":[
        *        {"data":[[0,124]],"label":"English"},
        *        {"data":[[0,83]],"label":"Italian"},
        *        {"data":[[0,72]],"label":"German"},
        *        {"data":[[0,62]],"label":"Japanese"},
        *        {"data":[[0,66]],"label":"French"},
        *        {"data":[[0,64]],"label":"Korean"}
        *    ]
        *},
        *"chartDPNew":{
        *    "dp":[
        *        {"data":[[0,50]],"label":"English"},
        *        {"data":[[0,30]],"label":"Italian"},
        *        {"data":[[0,26]],"label":"German"},
        *        {"data":[[0,19]],"label":"Japanese"},
        *        {"data":[[0,28]],"label":"French"},
        *        {"data":[[0,26]],"label":"Korean"}
        *    ]
        *}}
        * @example <caption>Example output of joined data for 1 bar chart</caption>
        *{"chartData":[
        *    {"langs":"English","t":124,"u":112,"n":50},
        *    {"langs":"Italian","t":83,"u":74,"n":30},
        *    {"langs":"German","t":72,"u":67,"n":26},
        *    {"langs":"Japanese","t":62,"u":61,"n":19},
        *    {"langs":"French","t":66,"u":60,"n":28},
        *    {"langs":"Korean","t":64,"u":58,"n":26}
        *],
        *"chartDP":{
        *    "dp":[
        *        {"data":[[-1,null],[0,124],[1,83],[2,72],[3,62],[4,66],[5,64],[6,null]],"label":"Total Sessions"},
        *        {"data":[[-1,null],[0,50],[1,30],[2,26],[3,19],[4,28],[5,26],[6,null]],"label":"New Users"}
        *    ],
        *   "ticks":[
        *        [-1,""], //used for padding for bars
        *        [23,""], //used for padding for bars
        *        [0,"English"],
        *        [1,"Italian"],
        *        [2,"German"],
        *        [3,"Japanese"],
        *        [4,"French"],
        *        [5,"Korean"]
        *    ]
        *}}
        */
        countlyMetric.getData = function(clean, join, metric1, estOverrideMetric) {
            var chartData = {};
            var i = 0;
            if (_processed) {
                chartData.chartData = [];
                var data = JSON.parse(JSON.stringify(_Db));
                for (i = 0; i < _Db.length; i++) {
                    if (fetchValue && !clean) {
                        data[i][metric1 || _name] = fetchValue(countlyCommon.decode(data[i]._id));
                    }
                    else {
                        data[i][metric1 || _name] = countlyCommon.decode(data[i]._id);
                    }
                    chartData.chartData[i] = data[i];
                }
            }
            else {
                chartData = countlyCommon.extractTwoLevelData(_Db, this.getMeta(metric1), this.clearObject, [
                    {
                        name: metric1 || _name,
                        func: function(rangeArr) {
                            rangeArr = countlyCommon.decode(rangeArr);
                            if (fetchValue && !clean) {
                                return fetchValue(rangeArr);
                            }
                            else {
                                return rangeArr;
                            }
                        }
                    },
                    { "name": "t" },
                    { "name": "u" },
                    { "name": "n" }
                ], estOverrideMetric || _estOverrideMetric);
            }
            chartData.chartData = countlyCommon.mergeMetricsByName(chartData.chartData, metric1 || _name);
            chartData.chartData.sort(function(a, b) {
                return b.t - a.t;
            });
            var namesData = _.pluck(chartData.chartData, metric1 || _name),
                totalData = _.pluck(chartData.chartData, 't'),
                newData = _.pluck(chartData.chartData, 'n');

            if (join) {
                chartData.chartDP = {ticks: []};
                var chartDP = [
                    {data: [], label: jQuery.i18n.map["common.table.total-sessions"]},
                    {data: [], label: jQuery.i18n.map["common.table.new-users"]}
                ];

                chartDP[0].data[0] = [-1, null];
                chartDP[0].data[namesData.length + 1] = [namesData.length, null];
                chartDP[1].data[0] = [-1, null];
                chartDP[1].data[namesData.length + 1] = [namesData.length, null];

                chartData.chartDP.ticks.push([-1, ""]);
                chartData.chartDP.ticks.push([namesData.length, ""]);

                for (i = 0; i < namesData.length; i++) {
                    chartDP[0].data[i + 1] = [i, totalData[i]];
                    chartDP[1].data[i + 1] = [i, newData[i]];
                    chartData.chartDP.ticks.push([i, namesData[i]]);
                }

                chartData.chartDP.dp = chartDP;
            }
            else {
                var chartData2 = [],
                    chartData3 = [];

                for (i = 0; i < namesData.length; i++) {
                    chartData2[i] = {
                        data: [
                            [0, totalData[i]]
                        ],
                        label: namesData[i]
                    };
                }

                for (i = 0; i < namesData.length; i++) {
                    chartData3[i] = {
                        data: [
                            [0, newData[i]]
                        ],
                        label: namesData[i]
                    };
                }

                chartData.chartDPTotal = {};
                chartData.chartDPTotal.dp = chartData2;

                chartData.chartDPNew = {};
                chartData.chartDPNew.dp = chartData3;
            }
            return chartData;
        };

        /**
        * Prefill all expected properties as u, t, n with 0, to avoid null values in the result, if they don't exist, which won't work when drawing graphs
        * @memberof countlyMetric
        * @param {object} obj - oject to prefill with  values if they don't exist
        * @returns {object} prefilled object
        */
        countlyMetric.clearObject = function(obj) {
            if (obj) {
                if (!obj.t) {
                    obj.t = 0;
                }
                if (!obj.n) {
                    obj.n = 0;
                }
                if (!obj.u) {
                    obj.u = 0;
                }
            }
            else {
                obj = {"t": 0, "n": 0, "u": 0};
            }

            return obj;
        };

        /**
        * Get bar data for metric with percentages of total
        * @memberof countlyMetric
        * @param {string} segment - name of the segment/metric to get data for, by default will use default _name provided on initialization
        * @param {string} mtric - name of the metric to use ordering and returning
        * @param {string} estOverrideMetric - name of the total users estimation override, by default will use default _estOverrideMetric provided on initialization
        * @returns {array} object to use when displaying bars as [{"name":"English","percent":44},{"name":"Italian","percent":29},{"name":"German","percent":27}]
        */
        countlyMetric.getBarsWPercentageOfTotal = function(segment, mtric, estOverrideMetric) {
            mtric = mtric || "t";
            if (_processed) {
                var rangeData = {};
                rangeData.chartData = [];
                var data = JSON.parse(JSON.stringify(_Db));
                for (var i = 0; i < _Db.length; i++) {
                    if (fetchValue) {
                        data[i].range = fetchValue(countlyCommon.decode(data[i]._id));
                    }
                    else {
                        data[i].range = countlyCommon.decode(data[i]._id);
                    }
                    rangeData.chartData[i] = data[i];
                }

                return countlyCommon.calculateBarDataWPercentageOfTotal(rangeData, mtric, this.fixBarSegmentData ? this.fixBarSegmentData.bind(null, segment) : undefined);
            }
            else {
                return countlyCommon.extractBarDataWPercentageOfTotal(_Db, this.getMeta(segment), this.clearObject, fetchValue, mtric, estOverrideMetric, this.fixBarSegmentData ? this.fixBarSegmentData.bind(null, segment) : undefined);
            }
        };

        /**
        * Get bar data for metric
        * @memberof countlyMetric
        * @param {string} metric_pd - name of the segment/metric to get data for, by default will use default _name provided on initialization
        * @returns {array} object to use when displaying bars as [{"name":"English","percent":44},{"name":"Italian","percent":29},{"name":"German","percent":27}]
        */
        countlyMetric.getBars = function(metric_pd) {
            if (_processed) {
                var rangeData = {};
                rangeData.chartData = [];
                var data = JSON.parse(JSON.stringify(_Db));
                for (var i = 0; i < _Db.length; i++) {
                    if (fetchValue) {
                        data[i].range = fetchValue(countlyCommon.decode(data[i]._id));
                    }
                    else {
                        data[i].range = countlyCommon.decode(data[i]._id);
                    }
                    rangeData.chartData[i] = data[i];
                }
                return countlyCommon.calculateBarData(rangeData);
            }
            else {
                return countlyCommon.extractBarData(_Db, this.getMeta(metric_pd), this.clearObject, fetchValue);
            }
        };

        /**
        * If this metric's data should be segmented by OS (which means be prefixed by first os letter on server side), you can get OS segmented data
        * @memberof countlyMetric
        * @param {string} os - os name for which to get segmented metrics data
        * @param {boolean} clean - should retrieve clean data or preprocessed by fetchValue function
        * @param {string} metric_pd - name of the segment/metric to get data for, by default will use default _name provided on initialization
        * @param {string} estOverrideMetric - name of the total users estimation override, by default will use default _estOverrideMetric provided on initialization
        * @returns {object} os segmented metric object
        * @example <caption>Example output</caption>
        * //call
        * //countlyMetric.getOSSegmentedData("wp")
        * //data for Windows Phone segment
        *{"chartData":[
        *    {"density":"2.0","t":18,"u":18,"n":9},
        *    {"density":"3.4","t":13,"u":12,"n":5},
        *    {"density":"1.2","t":11,"u":10,"n":5},
        *    {"density":"3.5","t":10,"u":10,"n":4},
        *    {"density":"3.3","t":9,"u":9,"n":3}
        *],
        *"chartDP":{
        *    "dp":[
        *        {"data":[[0,53]],"label":"2.0"},
        *        {"data":[[0,49]],"label":"3.4"},
        *        {"data":[[0,46]],"label":"1.2"},
        *        {"data":[[0,36]],"label":"3.5"},
        *        {"data":[[0,32]],"label":"3.3"}
        *    ]
        *},
        * //list of all os segments
        *"os":[
        *   {"name":"Windows Phone","class":"windows phone"},
        *    {"name":"Android","class":"android"},
        *    {"name":"iOS","class":"ios"}
        *]}
        */
        countlyMetric.getOSSegmentedData = function(os, clean, metric_pd, estOverrideMetric) {
            var _os = countlyDeviceDetails.getPlatforms();
            var oSVersionData = {};
            var i = 0;
            if (_processed) {
                oSVersionData.chartData = [];
                var data = JSON.parse(JSON.stringify(_Db));
                for (i = 0; i < _Db.length; i++) {
                    if (fetchValue && !clean) {
                        data[i][metric_pd || _name] = fetchValue(countlyCommon.decode(data[i]._id));
                    }
                    else {
                        data[i][metric_pd || _name] = countlyCommon.decode(data[i]._id);
                    }
                    oSVersionData.chartData[i] = data[i];
                }
            }
            else {
                oSVersionData = countlyCommon.extractTwoLevelData(_Db, this.getMeta(metric_pd), this.clearObject, [
                    {
                        name: metric_pd || _name,
                        func: function(rangeArr) {
                            rangeArr = countlyCommon.decode(rangeArr);
                            if (fetchValue && !clean) {
                                return fetchValue(rangeArr);
                            }
                            else {
                                return rangeArr;
                            }
                        }
                    },
                    { "name": "t" },
                    { "name": "u" },
                    { "name": "n" }
                ], estOverrideMetric || _estOverrideMetric);
            }

            os = ((os) ? os : ((_os) ? _os[0] : null));

            var chartData2 = [];
            var osSegmentation = os;
            oSVersionData = countlyDeviceDetails.eliminateOSVersion(oSVersionData, osSegmentation, metric_pd || _name, false);

            var platformVersionTotal = _.pluck(oSVersionData.chartData, 'u');
            oSVersionData.chartData = _.compact(oSVersionData.chartData);
            platformVersionTotal = _.without(platformVersionTotal, false, null, "", undefined, NaN);

            var platformVersionNames = _.pluck(oSVersionData.chartData, metric_pd || _name);

            for (i = 0; i < platformVersionNames.length; i++) {
                chartData2[chartData2.length] = {
                    data: [
                        [0, platformVersionTotal[i]]
                    ],
                    label: platformVersionNames[i].replace(((countlyDeviceDetails.os_mapping[osSegmentation.toLowerCase()]) ? countlyDeviceDetails.os_mapping[osSegmentation.toLowerCase()].name : osSegmentation) + " ", "")
                };
            }

            oSVersionData.chartDP = {};
            oSVersionData.chartDP.dp = chartData2;
            oSVersionData.os = [];

            if (_os && _os.length > 1) {
                for (i = 0; i < _os.length; i++) {
                    //if (_os[i] != osSegmentation) {
                    //    continue;
                    //}

                    oSVersionData.os.push({
                        "name": _os[i],
                        "class": _os[i].toLowerCase()
                    });
                }
            }

            return oSVersionData;
        };

        /** Get range data which is usually stored in some time ranges/buckets. As example is loyalty, session duration and session frequency
        * @memberof countlyMetric
        * @param {string} metric_pd - name of the property in the model to fetch
        * @param {string} meta - name of the meta where property's ranges are stored
        * @param {string} explain - function that receives index of the bucket and returns bucket name
        * @param {array} order - list of keys ordered in preferred order(to return in same order)
        * @returns {object} data
        * @example <caption>Example output</caption>
        * //call
        * //countlyMetric.getRangeData("f", "f-ranges", countlySession.explainFrequencyRange);
        * //returns
        * {"chartData":[
        *    {"f":"First session","t":271,"percent":"<div class='percent-bar' style='width:171px;'></div>85.5%"},
        *    {"f":"2 days","t":46,"percent":"<div class='percent-bar' style='width:29px;'></div>14.5%"}
        *  ],
        *  "chartDP":{
        *      "dp":[
        *        {"data":[[-1,null],[0,271],[1,46],[2,null]]}
        *      ],
        *      "ticks":[
        *        [-1,""],
        *        [2,""],
        *        [0,"First session"],
        *        [1,"2 days"]
        *      ]
        *   }
        *  }
        **/
        countlyMetric.getRangeData = function(metric_pd, meta, explain, order) {

            var chartData = {chartData: {}, chartDP: {dp: [], ticks: []}};

            chartData.chartData = countlyCommon.extractRangeData(_Db, metric_pd, this.getMeta(meta), explain, order);

            var frequencies = _.pluck(chartData.chartData, metric_pd),
                frequencyTotals = _.pluck(chartData.chartData, "t"),
                chartDP = [
                    {data: []}
                ];

            chartDP[0].data[0] = [-1, null];
            chartDP[0].data[frequencies.length + 1] = [frequencies.length, null];

            chartData.chartDP.ticks.push([-1, ""]);
            chartData.chartDP.ticks.push([frequencies.length, ""]);
            var i = 0;
            for (i = 0; i < frequencies.length; i++) {
                chartDP[0].data[i + 1] = [i, frequencyTotals[i]];
                chartData.chartDP.ticks.push([i, frequencies[i]]);
            }

            chartData.chartDP.dp = chartDP;

            for (i = 0; i < chartData.chartData.length; i++) {
                //TODO-LA: use only percent property when sessions views are finished
                chartData.chartData[i].percentageNumber = chartData.chartData[i].percent;
                chartData.chartData[i].percent = "<div class='percent-bar' style='width:" + (2 * chartData.chartData[i].percent) + "px;'></div>" + chartData.chartData[i].percent + "%";
            }

            return chartData;
        };
        /** function set meta
        */
        function setMeta() {
            if (_Db.meta) {
                for (var i in _Db.meta) {
                    _metrics[i] = (_Db.meta[i]) ? _Db.meta[i] : [];
                }
            }
            else {
                _metrics = {};
            }
        }
        /** function extend meta
        */
        function extendMeta() {
            if (_Db.meta) {
                for (var i in _Db.meta) {
                    _metrics[i] = countlyCommon.union(_metrics[i], _Db.meta[i]);
                }
            }
        }

    };

    /**
    * Initialize countly text select. In most cases it is done automatically, only in some cases, when content loaded via ajax request outside of view lifecycle, you may need to initialize it yourself for your content specifically
    * @param {object} element - jQuery object reference
    * @example
    * CountlyHelpers.initializeTextSelect($("#my-dynamic-div"));
    */
    CountlyHelpers.initializeTextSelect = function(element) {
        element = element || $("#content-container");

        element.off("click", ".cly-text-select").on("click", ".cly-text-select", function(e) {
            if ($(this).hasClass("disabled")) {
                return true;
            }

            initItems($(this));

            $("#date-picker").hide();
            e.stopPropagation();
        });

        element.off("click", ".cly-text-select .select-items .item").on("click", ".cly-text-select .select-items .item", function() {
            var selectedItem = $(this).parents(".cly-text-select").find(".text");
            selectedItem.text($(this).text());
            selectedItem.data("value", $(this).data("value"));
            selectedItem.val($(this).text());
        });

        element.off("keyup", ".cly-text-select input").on("keyup", ".cly-text-select input", function() {
            initItems($(this).parents(".cly-text-select"), true);

            $(this).data("value", $(this).val());

            if (!$(this).val()) {
                $(this).parents(".cly-text-select").find(".item").removeClass("hidden");
            }
            else {
                $(this).parents(".cly-text-select").find(".item:not(:contains('" + $(this).val() + "'))").addClass("hidden");
                $(this).parents(".cly-text-select").find(".item:contains('" + $(this).val() + "')").removeClass("hidden");
            }
        });
        /**
        * @param {object} select - html select element
        * @param {boolean} forceShow - if true shows element list
        * @returns {boolean} - returns false if there are no elements
        */
        function initItems(select, forceShow) {
            select.removeClass("req");

            var selectItems = select.find(".select-items");

            if (!selectItems.length) {
                return false;
            }

            if (select.find(".select-items").is(":visible") && !forceShow) {
                select.find(".select-items").hide();
            }
            else {
                select.find(".select-items").show();
                select.find(".select-items>div").addClass("scroll-list");
                select.find(".scroll-list").slimScroll({
                    height: '100%',
                    start: 'top',
                    wheelStep: 10,
                    position: 'right',
                    disableFadeOut: true
                });
            }
        }

        $(window).click(function() {
            $(".select-items").hide();
        });
    };

    /**
    * Generate random password
    * @param {number} length - length of the password
    * @param {boolean} no_special - do not include special characters
    * @returns {string} password
    * @example
    * //outputs 4UBHvRBG1v
    * CountlyHelpers.generatePassword(10, true);
    */
    CountlyHelpers.generatePassword = function(length, no_special) {
        var text = [];
        var chars = "abcdefghijklmnopqrstuvwxyz";
        var upchars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        var numbers = "0123456789";
        var specials = '!@#$%^&*()_+{}:"<>?|[];\',./`~';
        var all = chars + upchars + numbers;
        if (!no_special) {
            all += specials;
        }

        //1 char
        text.push(upchars.charAt(Math.floor(Math.random() * upchars.length)));
        //1 number
        text.push(numbers.charAt(Math.floor(Math.random() * numbers.length)));
        //1 special char
        if (!no_special) {
            text.push(specials.charAt(Math.floor(Math.random() * specials.length)));
            length--;
        }

        var j, x, i;
        //5 any chars
        for (i = 0; i < Math.max(length - 2, 5); i++) {
            text.push(all.charAt(Math.floor(Math.random() * all.length)));
        }

        //randomize order
        for (i = text.length; i; i--) {
            j = Math.floor(Math.random() * i);
            x = text[i - 1];
            text[i - 1] = text[j];
            text[j] = x;
        }

        return text.join("");
    };

    /**
    * Validate email address
    * @param {string} email - email address to validate
    * @returns {boolean} true if valid and false if invalid
    * @example
    * //outputs true
    * CountlyHelpers.validateEmail("test@test.test");
    *
    * //outputs false
    * CountlyHelpers.validateEmail("test@test");
    */
    CountlyHelpers.validateEmail = function(email) {
        var re = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/;
        return re.test(email);
    };

    /**
    * Validate password based on settings provided via security configuration
    * @param {string} password - password to validate
    * @returns {boolean} true if valid and false if invalid
    */
    CountlyHelpers.validatePassword = function(password) {
        if (password.length < countlyGlobal.security.password_min) {
            return jQuery.i18n.prop("management-users.password.length", countlyGlobal.security.password_min);
        }
        if (countlyGlobal.security.password_char && !/[A-Z]/.test(password)) {
            return jQuery.i18n.map["management-users.password.has-char"];
        }
        if (countlyGlobal.security.password_number && !/\d/.test(password)) {
            return jQuery.i18n.map["management-users.password.has-number"];
        }
        if (countlyGlobal.security.password_symbol && !/[^A-Za-z\d]/.test(password)) {
            return jQuery.i18n.map["management-users.password.has-special"];
        }
        return false;
    };

    /**
    * Upload file by the passed optional parameters
    * @param {object} el - dom element
    * @param {string} url - upload url
    * @param {object} data - data object that will send with upload request
    * @param {function} callback - callback for upload result
    */
    CountlyHelpers.upload = function(el, url, data, callback) {
        $(el).simpleUpload(url, {
            data: data,
            success: function(response) {
                callback(null, response);
            },
            error: function(e) {
                callback(e, null);
            }
        });
    };

    /**
     * Function to add breadcrumbs
     * @param  {Array} breadcrumbs - Array of links with name and url
     * @param  {DOMELement} el - This is the element to which the breadcrumb will be prepended to in the beginning
     */
    CountlyHelpers.initBreadcrumbs = function(breadcrumbs, el) {
        var breadcrumbsEl = $("<div class='cly-breadcrumbs'><ul></ul></div>");
        for (var i = 0; i < breadcrumbs.length; i++) {
            var b = breadcrumbs[i];
            var li = "<li><a href='" + b.url + "'>" + b.name + "</a></li>";
            $(breadcrumbsEl).find("ul").append(li);
        }

        el = el ? $(el) : $("#content .widget");

        $(breadcrumbsEl).prependTo(el);
    };

    /**
    * Get currently selected period that can be used in ajax requests
    * @memberof CountlyHelpers
    * @param {string} period selected date period    
    * @returns {string} supported values are (month, 60days, 30days, 7days, yesterday, hour or [startMiliseconds, endMiliseconds] as [1417730400000,1420149600000])
    */
    CountlyHelpers.getPeriodUrlQueryParameter = function(period) {
        if (Object.prototype.toString.call(period) === '[object Array]') {
            return JSON.stringify(period);
        }
        else {
            return period;
        }
    };
    /**
    * Format number to percentage value
    * @memberof CountlyHelpers
    * @param {number} value number to be converted to percentage    
    * @param {number} decimalPlaces number of decimal places to keep for percentage, default is two
    * @returns {number} percentage number for given value. Otherwise, returns 0 for falsy or non number values
    */
    CountlyHelpers.formatPercentage = function(value, decimalPlaces) {
        if (isNaN(value) || !value) {
            return 0;
        }
        if (!decimalPlaces) {
            decimalPlaces = 2;
        }
        return parseFloat((Math.round(value * 100)).toFixed(decimalPlaces));
    };

    /*
     * Function that returns difference between two arrays
     * @param {Array} a1 - first array
     * @param {Array} a2 - second array
     */
    CountlyHelpers.arrayDiff = function(a1, a2) {
        var a = [], diff = [];

        for (var i1 = 0; i1 < a1.length; i1++) {
            a[a1[i1]] = true;
        }

        for (var i2 = 0; i2 < a2.length; i2++) {
            if (a[a2[i2]]) {
                delete a[a2[i2]];
            }
            else {
                a[a2[i2]] = true;
            }
        }

        for (var k in a) {
            diff.push(k);
        }

        return diff;
    };

    /*
     * Function that returns difference between two arrays
     * @param {*} item - item
     * @param {Array} array - array
     */
    CountlyHelpers.removeItemFromArray = function(item, array) {
        var index = array.indexOf(item);
        if (index > -1) {
            array.splice(index, 1);
        }
        return array;
    };

    /**
     * Function that clean duplicates from passed array.
     * @param {Array} array - array
     * @return {Array} - array without duplicates
     */
    CountlyHelpers.arrayUnique = function(array) {
        var a = array.concat();
        for (var i = 0; i < a.length; ++i) {
            for (var j = i + 1; j < a.length; ++j) {
                if (a[i] === a[j]) {
                    a.splice(j--, 1);
                }
            }
        }
        return a;
    };

    /**
     * Function that remove empty values from array.
     * @param {array} array - array that contain empty values
     * @return {array} - array without empty values
     */
    CountlyHelpers.removeEmptyValues = function(array) {
        for (var i = 0; i < array.length; i++) {
            if (array[i] === "") {
                array.splice(i, 1);
            }
        }
        return array;
    };

    /**
     * Function that creates a shallow copy of an object excluding specified fields.
     * Warning: If no excluded fields specified, returns the original reference
     * @param {Object} obj Main object
     * @param {Array} excluded Array of excluded fields
     * @returns {Object} Shallow copy (If no excluded fields, the original reference)
     */
    CountlyHelpers.objectWithoutProperties = function(obj, excluded) {
        if (!obj || !excluded || excluded.length === 0) {
            return obj;
        }
        return Object.keys(obj).reduce(function(acc, val) {
            if (excluded.indexOf(val) === -1) {
                acc[val] = obj[val];
            }
            return acc;
        }, {});
    };

    $(document).ready(function() {
        $("#overlay").click(function() {
            var dialog = $(".dialog:visible:not(.cly-loading)");
            if (dialog.length) {
                dialog.fadeOut().remove();
                $(this).hide();
            }
        });

        $(document).on('click', "#dialog-ok, #dialog-cancel, #dialog-continue", function() {
            $(this).parents(".dialog:visible").fadeOut().remove();
            if (!$('.dialog:visible').length) {
                $("#overlay").hide();
            }
        });

        $(document).keyup(function(e) {
            // ESC
            if (e.keyCode === 27) {
                $(".dialog:visible").animate({
                    top: 0,
                    opacity: 0
                }, {
                    duration: 1000,
                    easing: 'easeOutQuart',
                    complete: function() {
                        $(this).remove();
                    }
                });

                $("#overlay").hide();
            }
        });
    });

}(window.CountlyHelpers = window.CountlyHelpers || {}));

var Template = function() {
    this.cached = {};
    this.raw = {};
};

/**
* Template loader for loading static resources over jquery
* @name T
* @global
* @namespace T
* @example <caption>Get Handlebar compiled HTML</caption>
*$.when(T.render('/density/templates/density.html', function(src){
*    self.template = src;
*})).then(function () {});
*
* @example <caption>Get raw resources</caption>
*$.when(T.get('/density/templates/density.html', function(src){
*    self.template = Handlebar.compile(src);
*})).then(function () {});
*/
var T = new Template();

$.extend(Template.prototype, {
    /**
     *  Process and return fetched template
     *  @memberof T
     *  @param {string} name - Template path
     *  @param {function} callback - when done
     *  @returns {Promise} ajax promise
     */
    render: function(name, callback) {
        if (T.isCached(name)) {
            if (typeof callback === "function") {
                callback(T.cached[name]);
            }
            return T.cached[name];
        }
        else {
            return $.get(T.urlFor(name), function(raw) {
                T.store(name, raw);
                T.render(name, callback);
            });
        }
    },
    /**
     *  Fetch and return raw template
     *  @memberof T
     *  @param {string} name - Template path
     *  @param {function} callback - when done
     *  @returns {Promise} ajax promise
     */
    get: function(name, callback) {
        if (T.isCached(name)) {
            if (typeof callback === "function") {
                callback(T.raw[name]);
            }
            return T.raw[name];
        }
        else {
            return $.get(T.urlFor(name), function(raw) {
                T.store(name, raw);
                T.get(name, callback);
            });
        }
    },
    /**
     *  Fetch and return raw template in sync
     *  @memberof T
     *  @param {string} name - Template path
     *  @param {function} callback - when done
     */
    renderSync: function(name, callback) {
        if (!T.isCached(name)) {
            T.fetch(name);
        }
        T.render(name, callback);
    },
    /**
     *  Prefetch template
     *  @memberof T
     *  @param {string} name - Template path
     */
    prefetch: function(name) {
        $.get(T.urlFor(name), function(raw) {
            T.store(name, raw);
        });
    },
    /**
     *  Fetch template in sync request
     *  @memberof T
     *  @param {string} name - Template path
     */
    fetch: function(name) {
        // synchronous, for those times when you need it.
        if (!T.isCached(name)) {
            var raw = $.ajax({ 'url': T.urlFor(name), 'async': false }).responseText;
            T.store(name, raw);
        }
    },
    /**
     *  Check if template is cached
     *  @memberof T
     *  @param {string} name - Template path
     *  @returns {boolean} true if template is cached
     */
    isCached: function(name) {
        return !!T.cached[name];
    },
    /**
     *  Store template in cache
     *  @memberof T
     *  @param {string} name - Template path
     *  @param {string} raw - Raw template data
     */
    store: function(name, raw) {
        T.raw[name] = raw;
        try {
            T.cached[name] = Handlebars.compile(raw);
        }
        catch (ex) {
            T.cached[name] = raw;
        }
    },
    /**
     *  Generate request URL for template
     *  @memberof T
     *  @param {string} name - Template path
     *  @returns {string} URL where to fetch template
     */
    urlFor: function(name) {
        //return "/resources/templates/"+ name + ".handlebars";
        if (countlyGlobal.path && countlyGlobal.path.length && name.indexOf(countlyGlobal.path) !== 0) {
            name = countlyGlobal.path + name;
        }
        return name + "?" + countlyGlobal.countlyVersion;
    }
});


$.widget("cly.datepickerExtended", {
    _init: function() {
        var self = this;

        if (this.options.range === true) {
            this._initRangeSelection();
        }
        else {
            this._initDateSelection();
        }

        $(this.element).addClass("datepicker-extended");

        this.baseInstance = this.element.datepicker(this.options);

        if (this.options.textEdit === true) {
            this._initTextEdit();
        }
        setTimeout(function() {
            self._finalizeInit();
        }, 0);
    },

    // Private, range picker
    _initRangeSelection: function() {
        var self = this,
            originalOnSelect = this.options.onSelect,
            originalBeforeShowDay = this.options.beforeShowDay || function() {
                return [true, "", ""];
            },
            currentFirst = null,
            currentSecond = null,
            $el = this.element;

        this.committedRange = null;
        this.temporaryRange = null;
        this.isSelectingSecond = false;

        /**
         * Wraps onSelect callback of jQuery UI Datepicker and 
         * injects the necessary business logic needed for range picking
         * @param {String} dateText Date as string, passed by Datepicker 
         * @param {Object} inst Instance object, passed by Datepicker
         */
        function _onSelect(dateText, inst) {
            var point = self.isSelectingSecond ? "second" : "first";
            if (originalOnSelect) {
                originalOnSelect.apply($($el), [dateText, inst, point]);
            }

            var instance = $($el).data("datepicker");
            var parsedDate = $.datepicker.parseDate(instance.settings.dateFormat || $.datepicker._defaults.dateFormat, dateText, instance.settings);
            parsedDate.setHours(0, 0, 0, 0);
            var reset = false;

            if (self.isSelectingSecond && parsedDate < currentFirst) {
                self.isSelectingSecond = false;
                reset = true;
                // reset
            }

            if (self.isSelectingSecond) {
                currentSecond = parsedDate;
                self.temporaryRange = null;
                self._commitRange(currentFirst, currentSecond, true);
                $($el).find(".text-fields input").removeClass("focused");
            }
            else {
                currentFirst = parsedDate;
                $($el).find(".input-1").addClass("focused");
            }
            self.isSelectingSecond = !self.isSelectingSecond;
            if (reset) {
                self._onTemporaryRangeUpdate(currentFirst, null);
            }
        }

        /**
         * Wraps beforeShowDay callback of jQuery UI Datepicker and 
         * injects the necessary business logic needed for highlighting
         * the current and temporary range.
         * @param {Date} date Date as Date, passed by Datepicker 
         * @returns {Array} Array structure requested by Datepicker UI
         */
        function _beforeShowDay(date) {
            var returned = originalBeforeShowDay.apply($($el), [date]);
            var targetRange = self.committedRange;
            if (self.isSelectingSecond) {
                targetRange = self.temporaryRange;
            }
            if (targetRange) {
                if (targetRange[0] < date && date < targetRange[1]) {
                    return [returned[0], returned[1] + " in-range", returned[2]];
                }
                if (targetRange[0].getTime() === date.getTime() || date.getTime() === targetRange[1].getTime()) {
                    return [returned[0], returned[1] + " point", returned[2]];
                }
            }
            return returned;
        }

        this.options.beforeShowDay = _beforeShowDay;
        this.options.onSelect = _onSelect;

        $($el).addClass("datepicker-range");

        $($el).on("mouseover", ".ui-state-default", function() {
            self._onTemporaryRangeUpdate(currentFirst, self._cellToDate($(this).parent()));
        });

        $($el).on("mouseout", ".ui-state-default", function() {
            self._onTemporaryRangeUpdate(currentFirst, null);
        });
    },
    _onTemporaryRangeUpdate: function(currentFirst, temporarySecond) {
        var self = this;
        if (!self.isSelectingSecond) {
            return;
        }
        if (temporarySecond && currentFirst <= temporarySecond) {
            self.temporaryRange = [currentFirst, temporarySecond];
        }
        else {
            self.temporaryRange = [currentFirst, currentFirst];
        }
        self._syncWith("picker", 0);
        self._syncWith("picker", 1);
        self._refreshCellStates();
    },
    _commitRange: function(dateFirst, dateSecond, fireOnCommit) {
        var self = this,
            $el = this.element;

        self.committedRange = [dateFirst, dateSecond].sort(function(a, b) {
            return a - b;
        });

        var minDate = self.baseInstance.datepicker("option", "minDate"),
            maxDate = self.baseInstance.datepicker("option", "maxDate");

        minDate = minDate ? moment(minDate, "MM/DD/YYYY").toDate() : false;
        maxDate = maxDate ? moment(maxDate, "MM/DD/YYYY").toDate() : false;

        if (minDate && minDate - self.committedRange[0] > 0) {
            self.committedRange[0] = new Date(minDate.getTime());
        }

        if (maxDate && self.committedRange[1] - maxDate > 0) {
            self.committedRange[1] = new Date(maxDate.getTime());
        }

        self.committedRange[0].setHours(0, 0, 0, 0);
        self.committedRange[1].setHours(0, 0, 0, 0);

        if (fireOnCommit && self.options.onCommit) {
            self.options.onCommit.apply($($el), self.committedRange);
        }
        self._syncWith("picker", 0, { onlyCommitted: true });
        self._syncWith("picker", 1, { onlyCommitted: true });
    },

    // Private, generic
    _initDateSelection: function() {
        var self = this,
            originalOnSelect = this.options.onSelect,
            $el = this.element;

        /**
         * Wraps onSelect callback of jQuery UI Datepicker and 
         * injects the necessary business logic needed for picker -> text field
         * data binding.
         * @param {String} dateText Date as string, passed by Datepicker 
         * @param {Object} inst Instance object, passed by Datepicker
         */
        function _onSelect(dateText, inst) {
            originalOnSelect.apply($($el), [dateText, inst]);
            self._syncWith("picker", 0);
        }

        this.options.onSelect = _onSelect;
    },
    _initTextEdit: function() {
        var $el = this.element,
            self = this;

        $($el).addClass("datepicker-text-edit");
        $($el).prepend("<div class='text-fields'></div>");

        $el.find(".text-fields").append('<input type="text" class="calendar-input-field input-0" data-input="0"></input>');
        if (this.options.range === true) {
            $el.find(".text-fields").append('<input type="text" class="calendar-input-field input-1" data-input="1"></input>');
        }

        $($el).on("keyup", ".text-fields input", function(event) {
            if (event.keyCode === 13) {
                var date = moment($(this).val(), "MM/DD/YYYY");
                var inputIdx = parseInt($(this).data("input"), 10);

                if (date.isValid()) {
                    // update the picker value
                    self._syncWith("text", inputIdx, {isDOMEvent: true});
                }
                else {
                    // revert back to the original value
                    self._syncWith("picker", inputIdx);
                }
            }
        });
    },
    _syncWith: function(source, inputIdx, syncOptions) {

        if (!this.options.textEdit) {
            return;
        }

        syncOptions = syncOptions || {};

        var $el = this.element,
            self = this;

        if (source === "text") {
            var parsedDate = moment($($el).find(".text-fields .input-" + inputIdx).val(), "MM/DD/YYYY").toDate();
            if (self.options.range !== true && inputIdx === 0) {
                self.setDate(parsedDate);
                if (syncOptions.isDOMEvent) {
                    // manually trigger onSelect
                    self.baseInstance.find('.ui-datepicker-current-day').click(); // represents the current day
                }
            }
            else if (self.options.range === true) {
                if (self.isSelectingSecond) {
                    self.isSelectingSecond = false;
                    // abort the ongoing picking
                }
                if (inputIdx === 0) {
                    self._commitRange(parsedDate, self.committedRange[1], syncOptions.isDOMEvent);
                }
                else if (inputIdx === 1) {
                    self._commitRange(self.committedRange[0], parsedDate, syncOptions.isDOMEvent);
                }
                this.baseInstance.datepicker("setDate", parsedDate);
                this.baseInstance.datepicker("refresh");
            }
        }
        else if (source === "picker") {
            if (self.options.range !== true && inputIdx === 0) {
                $($el).find(".text-fields .input-" + inputIdx).val(moment(self.getDate()).format("MM/DD/YYYY"));
            }
            else if (self.options.range === true) {
                var targetRange = self.committedRange;
                if (self.isSelectingSecond && !syncOptions.onlyCommitted) {
                    targetRange = self.temporaryRange;
                }
                var selectedDate = targetRange[inputIdx];
                $($el).find(".text-fields .input-" + inputIdx).val(moment(selectedDate).format("MM/DD/YYYY"));
            }
        }
    },
    _finalizeInit: function() {
        if (this.options.range === true) {
            if (this.options.defaultRange) {
                this.setRange(this.options.defaultRange);
            }
            else {
                this.setRange([moment().subtract(8, "d").startOf("d").toDate(), moment().subtract(1, "d").startOf("d").toDate()]);
            }
        }
    },
    _cellToDate: function(element) {
        var day = parseInt($(element).find("a").text(), 10);
        var month = parseInt($(element).data("month"), 10);
        var year = parseInt($(element).data("year"), 10);
        if (Number.isInteger(day) && Number.isInteger(month) && Number.isInteger(year)) {
            return new Date(year, month, day, 0, 0, 0, 0);
        }
        else {
            return null;
        }
    },
    _refreshCellStates: function() {
        var self = this,
            $el = this.element;

        $($el).find(".ui-datepicker-calendar td").each(function() {
            var parsedDate = self._cellToDate($(this));
            if (parsedDate) {
                var returned = self.options.beforeShowDay(parsedDate);
                $(this).attr('class', returned[1]);
            }
        });
    },

    // Public
    abortRangePicking: function() {
        if (this.options.range === true) {
            this.isSelectingSecond = false;
            this._syncWith("picker", 0);
            this._syncWith("picker", 1);
            this.temporaryRange = null;
            $(this.element).find(".text-fields input").removeClass("focused");
            this.baseInstance.datepicker("refresh");
        }
    },
    getRange: function() {
        return this.committedRange;
    },
    getDate: function() {
        if (this.options.range === true) {
            return this.getRange();
        }
        return this.baseInstance.datepicker("getDate");
    },
    setRange: function(dateRange) {
        this._commitRange(dateRange[0], dateRange[1]);
        this.baseInstance.datepicker("setDate", dateRange[1]);
    },
    setDate: function(date) {
        if (this.options.range === true) {
            this.setRange(date);
        }
        else {
            this.baseInstance.datepicker("setDate", date);
            this._syncWith("picker", 0);
        }
    },
});
