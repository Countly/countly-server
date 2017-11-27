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
(function (CountlyHelpers, $, undefined) {

    /**
    * Legacy method for displaying notifications. User {@link CountlyHelpers.notify} instead
    */
    CountlyHelpers.parseAndShowMsg = function (msg) {
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
        } else {
            message = msg;
        }

        CountlyHelpers.notify({type:type, message:message});

        delete countlyGlobal["message"];
    };

    /**
    * Display dashboard notification using Amaran JS library
    * @param {object} msg - notification message object
    * @param {string=} msg.title - title of the notification
    * @param {string=} msg.message - main notification text
    * @param {string=} msg.info - some additional information to display in notification
    * @param {number=} [msg.delay=10000] - delay time in miliseconds before displaying notification
    * @param {string=} [msg.type=ok] - message type, accepted values ok, error and warning
    * @param {string=} [msg.position=top right] - message position
    * @param {string=} [msg.sticky=false] - should message stick until closed
    * @param {string=} [msg.clearAll=false] - clear all previous notifications upon showing this one
    * @param {string=} [msg.closeOnClick=false] - should notification be automatically closed when clicked on
    * @param {function=} msg.onClick - on click listener
    * @example
    * CountlyHelpers.notify({
    *    title: "This is title",
    *    message: "Main message text",
    *    info: "Additional info"
    * });
    */
    CountlyHelpers.notify = function (msg) {
        var iconToUse;

        switch (msg.type) {
            case "error":
                iconToUse = "ion-close-circled";
                break;
            case "warning":
                iconToUse = "ion-alert-circled";
                break;
            case "yellow":
            case "blue":
            case "purple":
                iconToUse = "ion-record";
                break;
            default:
                iconToUse = "ion-checkmark-circled";
                break;
        }

        $.titleAlert((msg.title || msg.message || msg.info || "Notification"), {
            requireBlur:true,
            stopOnFocus:true,
            duration:(msg.delay || 10000),
            interval:1000
        });
        $.amaran({
            content:{
                title: msg.title || "Notification",
                message:msg.message || "",
                info:msg.info || "",
                icon: iconToUse
            },
            theme:'awesome '+ (msg.type || "ok"),
            position: msg.position || 'top right',
            delay: msg.delay || 10000,
            sticky: msg.sticky || false,
            clearAll: msg.clearAll || false,
            closeButton:true,
            closeOnClick:(msg.closeOnClick === false) ? false : true,
            onClick: msg.onClick || null
        });
    };

    /**
    * Display modal popup UI
    * @param {string|object} element - if third parameter isHTML is true, then HTML code as string is expected, else element's selector or element itself is expected and it's HTML contents will be copied into popup
    * @param {string=} custClass - add custom css class to dialog for easier manipulation
    * @param {boolean=} isHTML - changes the behavior of first parameter element
    * @example
    * CountlyHelpers.popup("<h1>Hello</h1>", "red", true);
    */
    CountlyHelpers.popup = function (element, custClass, isHTML) {
        var dialog = $("#cly-popup").clone();
        dialog.removeAttr("id");
        if (custClass) {
            dialog.addClass(custClass);
        }

        if (isHTML) {
            dialog.find(".content").html(element);
        } else {
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
    * @example
    * CountlyHelpers.alert("Some error happened", "red");
    */
    CountlyHelpers.alert = function (msg, type) {
        var dialog = $("#cly-alert").clone();
        dialog.removeAttr("id");
        dialog.find(".message").html(msg);

        dialog.addClass(type);
        revealDialog(dialog);
    };

    /**
    * Display modal popup that requires confirmation input from user
    * @param {string} msg - message to display in alert popup
    * @param {string} type - type of alert red for errors and green for success
    * @param {function} callback - to determine result of the input
    * @param {array=} buttonText - [0] element for cancle button text and [1] element for confirm button text
    * @example
    * CountlyHelpers.confirm("Are you sure?", "red", function (result) {
    *    if (!result) {
    *        //user did not confirm, just exit
    *        return true;
    *    }
    *    //user confirmed, do what you need to do
    * });
    */
    CountlyHelpers.confirm = function (msg, type, callback, buttonText) {
        var dialog = $("#cly-confirm").clone();
        dialog.removeAttr("id");
        dialog.find(".message").html(msg);

        if (buttonText && buttonText.length == 2) {
            dialog.find("#dialog-cancel").text(buttonText[0]);
            dialog.find("#dialog-continue").text(buttonText[1]);
        }

        dialog.addClass(type);
        revealDialog(dialog);

        dialog.find("#dialog-cancel").on('click', function () {
            callback(false);
        });

        dialog.find("#dialog-continue").on('click', function () {
            callback(true);
        });
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
    CountlyHelpers.loading = function (msg) {
        var dialog = $("#cly-loading").clone();
        dialog.removeAttr("id");
        dialog.find(".message").html(msg);
        dialog.addClass('cly-loading');
        revealDialog(dialog);
        return dialog;
    };

    /**
    * Displays database export dialog
    * @param {number} count - total count of documents to export
    * @param {object} data - data for export query to use when constructing url
    * @param {boolean} asDialog - open it as dialog
    * @returns {object} jQuery object reference to dialog
    * @example
    * var dialog = CountlyHelpers.export(300000);
    * //later when done
    * CountlyHelpers.removeDialog(dialog);
    */
    CountlyHelpers.export = function (count, data, asDialog) {
        var hardLimit = countlyGlobal["config"].export_limit;
        var pages = Math.ceil(count/hardLimit);
        var dialog = $("#cly-export").clone();
        var type = "csv";
        var page = 0;
        dialog.removeAttr("id");
        dialog.find(".details").text(jQuery.i18n.prop("export.export-number", (count+"").replace(/(\d)(?=(\d{3})+$)/g, '$1 '), pages));
        if(count <= hardLimit){
            dialog.find(".cly-select").hide();
        }
        else{
            for(var i = 0; i < pages; i++){
                dialog.find(".select-items > div").append('<div data-value="'+i+'" class="segmentation-option item">'+((i*hardLimit+1)+"").replace(/(\d)(?=(\d{3})+$)/g, '$1 ')+' - '+(Math.min((i+1)*hardLimit, count)+"").replace(/(\d)(?=(\d{3})+$)/g, '$1 ')+ " " + jQuery.i18n.map["export.documents"]+'</div>');
            }
            dialog.find(".export-data").addClass("disabled");
        }
        dialog.find(".button").click(function(){
            dialog.find(".button-selector .button").removeClass("selected");
            dialog.find(".button-selector .button").removeClass("active");
            $(this).addClass("selected");
            $(this).addClass("active");
            type = $(this).attr("id").replace("export-", "");
        });
        dialog.find(".segmentation-option").on("click", function () {
            page = $(this).data("value");
            dialog.find(".export-data").removeClass("disabled")
        });
        dialog.find(".export-data").click(function(){
            if($(this).hasClass("disabled"))
                return;
            data.type = type;
            data.limit = hardLimit;
            data.skip = page*hardLimit;
            var url = "/o/export/db";
            var form = $('<form method="POST" action="' + url + '">');
            $.each(data, function(k, v) {
                if(k === "query")
                    form.append($('<textarea style="visibility:hidden;position:absolute;display:none;" name="'+k+'">'+v+'</textarea>'));
                else
                    form.append($('<input type="hidden" name="' + k + '" value="' + v + '">'));
            });
            $('body').append(form);
            form.submit();
        });
        if(asDialog)
            revealDialog(dialog);
        return dialog;
    };

    /**
    * Displays raw data table export dialog
    * @param {object} data - data for export query to use when constructing url
    * @param {boolean} asDialog - open it as dialog
    * @returns {object} jQuery object reference to dialog
    * @example
    * var dialog = CountlyHelpers.export(300000);
    * //later when done
    * CountlyHelpers.removeDialog(dialog);
    */
    CountlyHelpers.tableExport = function (dtable, data, asDialog) {
        function getFileName(){
            var name = "countly";
            if($(".widget-header .title").length)
                name = jQuery.trim($(".widget-header .title").first().text()).replace(/[\r\n]+/g," ").split(" ")[0];
            if($(".widget #date-selector").length){
                //include export range
                name += "_for_"+countlyCommon.getDateRange();
            }
            else{
                //include export date
                name += +"_on_"+moment().format("DD-MMM-YYYY");
            }
            return (name.charAt(0).toUpperCase() + name.slice(1).toLowerCase());
        }
        function getExportData(dtable, type){
            var tableCols = dtable.fnSettings().aoColumns,
                retStr = "",
                tableData = [];
            if(tableCols[0].sExport && app.dataExports[tableCols[0].sExport]){
                tableData = app.dataExports[tableCols[0].sExport]();
            }
            else{
                tableData = TableTools.fnGetInstance(dtable[0]).fnGetTableData({"sAction":"data","sTag":"default","sLinerTag":"default","sButtonClass":"DTTT_button_xls","sButtonText":"Save for Excel","sTitle":"","sToolTip":"","sCharSet":"utf16le","bBomInc":true,"sFileName":"*.csv","sFieldBoundary":"","sFieldSeperator":"\t","sNewLine":"auto","mColumns":"all","bHeader":true,"bFooter":true,"bOpenRows":false,"bSelectedOnly":false,"fnMouseover":null,"fnMouseout":null,"fnSelect":null,"fnComplete":null,"fnInit":null,"fnCellRender":null,"sExtends":"xls"});
                tableData = tableData.split(/\r\n|\r|\n/g);
                tableData.shift();
                for(var i = 0; i < tableData.length; i++){
                    tableData[i] = tableData[i].split('\t');
                }
                var retData = [];
                for (var i = 0;  i < tableData.length; i++) {
                    var ob = {};
                    for (var colIndex = 0;  colIndex < tableCols.length; colIndex++) {
                        try{
                            if(!(tableData[i] && tableData[i][colIndex])){
                                continue;
                            }
                            if (tableCols[colIndex].sType == "formatted-num") {
                                ob[tableCols[colIndex].sTitle] = tableData[i][colIndex].replace(/,/g, "");
                            } else if (tableCols[colIndex].sType == "percent") {
                                ob[tableCols[colIndex].sTitle] = tableData[i][colIndex].replace("%", "");
                            } else if (tableCols[colIndex].sType == "format-ago" || tableCols[colIndex].sType == "event-timeline") {
                                ob[tableCols[colIndex].sTitle] = tableData[i][colIndex].split("|").pop();
                            }
                            else{
                                ob[tableCols[colIndex].sTitle] = tableData[i][colIndex];
                            }
                        }catch(e){
                            console.log(e);
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
        dialog.find(".button").click(function(){
            dialog.find(".button-selector .button").removeClass("selected");
            dialog.find(".button-selector .button").removeClass("active");
            $(this).addClass("selected");
            $(this).addClass("active");
            type = $(this).attr("id").replace("export-", "");
        });
        dialog.find(".export-data").click(function(){
            if($(this).hasClass("disabled"))
                return;
            data.type = type;
            data.data = JSON.stringify(getExportData(dtable, type));
            data.filename = getFileName(type);
            var url = "/o/export/data";
            var form = $('<form method="POST" action="' + url + '">');
            $.each(data, function(k, v) {
                if(k === "data")
                    form.append($('<textarea style="visibility:hidden;position:absolute;display:none;" name="'+k+'">'+v+'</textarea>'));
                else
                    form.append($('<input type="hidden" name="' + k + '" value="' + v + '">'));
            });
            $('body').append(form);
            form.submit();
        });
        if(asDialog)
            revealDialog(dialog);
        return dialog;
    };

    /**
    * Instead of creating dialog object you can use this method and directly pass jquery element to be used as dialog content, which means complete customization
    * @param {jquery_object} dialog - jQuery object unnattached, like cloned existing object
    * @example
    * var dialog = $("#cly-popup").clone().removeAttr("id").addClass('campaign-create');
    * CountlyHelpers.revealDialog(dialog);
    */
    CountlyHelpers.revealDialog = function (dialog) {
        $("body").append(dialog);
        var dialogHeight = dialog.height(),
            dialogWidth = dialog.outerWidth() + 2;

        dialog.css({
            "height":dialogHeight,
            "margin-top":Math.floor(-dialogHeight / 2),
            "width":dialogWidth,
            "margin-left":Math.floor(-dialogWidth / 2)
        });

        $("#overlay").fadeIn();
        dialog.fadeIn(app.tipsify.bind(app, $("#help-toggle").hasClass("active"), dialog));
    }

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

        dialog.children().each(function(){
            dialogHeight += $(this).outerHeight(true);
        });

        if (dialogHeight > maxHeight) {
            dialog[animate ? 'animate' : 'css']({
                "height":maxHeight,
                "margin-top":Math.floor(-maxHeight / 2),
                "width":dialogWidth,
                "margin-left":Math.floor(-dialogWidth / 2),
                "overflow-y": "auto"
            });
        } else {
            dialog[animate ? 'animate' : 'css']({
                "height":dialogHeight,
                "margin-top":Math.floor(-dialogHeight / 2),
                "width":dialogWidth,
                "margin-left":Math.floor(-dialogWidth / 2)
            });
        }
    }

    var revealDialog = CountlyHelpers.revealDialog;

    var changeDialogHeight = CountlyHelpers.changeDialogHeight;

    /**
    * Remove existing dialog
    * @param {jquery_object} dialog - jQuery dialog reference
    * @example
    * var dialog = $("#cly-popup").clone().removeAttr("id").addClass('campaign-create');
    * CountlyHelpers.revealDialog(dialog);
    * //when dialog not needed anymore
    * CountlyHelpers.removeDialog(dialog);
    */
    CountlyHelpers.removeDialog = function(dialog){
        dialog.remove();
        $("#overlay").fadeOut();
    };

    CountlyHelpers.setUpDateSelectors = function(self) {
        $("#month").text(moment().year());
        $("#day").text(moment().format("MMM"));
        $("#yesterday").text(moment().subtract(1, "days").format("Do"));

        $("#date-selector").find(".date-selector").click(function () {
            if ($(this).hasClass("selected")) {
                return true;
            }

            self.dateFromSelected = null;
            self.dateToSelected = null;

            $(".date-selector").removeClass("selected").removeClass("active");
            $(this).addClass("selected");
            var selectedPeriod = $(this).attr("id");

            if (countlyCommon.getPeriod() == selectedPeriod) {
                return true;
            }

            countlyCommon.setPeriod(selectedPeriod);

            self.dateChanged(selectedPeriod);

            $("#" + selectedPeriod).addClass("active");
        });

        $("#date-selector").find(".date-selector").each(function(){
            if (countlyCommon.getPeriod() == $(this).attr("id")) {
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
    CountlyHelpers.initializeSelect = function (element) {
        element = element || $("body");

        element.off("click", ".cly-select").on("click", ".cly-select", function (e) {
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

            if (selectItems.is(":visible")) {
                $(this).removeClass("active");
            } else {
                $(".cly-select").removeClass("active");
                $(".select-items").hide();
                $(this).addClass("active");

                if (itemCount > 10 || $(this).hasClass("big-list")) {
                    $("<div class='search'><div class='inner'><input type='text' /><i class='fa fa-search'></i></div></div>").insertBefore($(this).find(".select-items"));
                }
            }

            if ($(this).hasClass("centered")) {
                if ((itemCount > 5 && $(this).offset().top > 400) || $(this).hasClass("force")) {
                    var height = $(this).find(".select-items").height(),
                        searchItem = $(this).find(".search");

                    var addThis = 0;

                    if (searchItem.length) {
                        addThis = (searchItem.height()/2).toFixed(0) - 1;
                        $(this).find(".select-items").css({"min-height": height});
                    } else {
                        $(this).find(".select-items").css({"min-height": "auto"});
                        height = $(this).find(".select-items").height();
                    }

                    $(this).find(".select-items").css("margin-top", (-(height/2).toFixed(0) - ($(this).height()/2).toFixed(0)+ parseInt(addThis)) + "px");
                    $(this).find(".search").css("margin-top", (-(height/2).toFixed(0) - searchItem.height()) + "px");
                } else {
                    $(this).find(".select-items").css({"min-height": "auto"});
                    $(this).find(".select-items").css("margin-top", '');
                    $(this).find(".search").css("margin-top", '');
                }
            }

            if ($(this).find(".select-items").is(":visible")) {
                $(this).find(".select-items").hide();
            } else {
                $(this).find(".select-items").show();
                if ($(this).find(".select-items").find(".scroll-list").length == 0) {
                    $(this).find(".select-items").wrapInner("<div class='scroll-list'></div>");
                    $(this).find(".scroll-list").slimScroll({
                        height:'100%',
                        start:'top',
                        wheelStep:10,
                        position:'right',
                        disableFadeOut:true
                    });
                }
            }

            $(this).find(".select-items").find(".item").removeClass("hidden");
            $(this).find(".select-items").find(".group").show();
            $(this).find(".select-items").find(".item").removeClass("last");
            $(this).find(".select-items").find(".item:visible:last").addClass("last");

            $(this).find(".search input").focus();

            $("#date-picker").hide();

            $(this).find(".search").off("click").on("click", function (e) {
                e.stopPropagation();
            });

            e.stopPropagation();
        });

        element.off("click", ".cly-select .select-items .item").on("click", ".cly-select .select-items .item", function () {
            var selectedItem = $(this).parents(".cly-select").find(".text");
            selectedItem.text($(this).text());
            selectedItem.data("value", $(this).data("value"));

            $(this).parents(".cly-select").trigger("cly-select-change", [$(this).data("value")]);
        });

        element.off("keyup", ".cly-select .search input").on("keyup", ".cly-select .search input", function(event) {
            if (!$(this).val()) {
                $(this).parents(".cly-select").find(".item").removeClass("hidden");
                $(this).parents(".cly-select").find(".group").show();
            } else {
                $(this).parents(".cly-select").find(".item:not(:contains('" + $(this).val() + "'))").addClass("hidden");
                $(this).parents(".cly-select").find(".item:contains('" + $(this).val() + "')").removeClass("hidden");
                var prevHeader = $(this).parents(".cly-select").find(".group").first();
                prevHeader.siblings().each(function(){
                    if($(this).hasClass("group")){
                        if(prevHeader)
                            prevHeader.hide();
                        prevHeader = $(this);
                    }
                    else if($(this).hasClass("item") && $(this).is(":visible")){
                        prevHeader = null;
                    }

                    if(!$(this).next().length && prevHeader)
                        prevHeader.hide();
                })
            }
        });

        element.off('mouseenter').on('mouseenter', ".cly-select .item", function () {
            var item = $(this);

            if (this.offsetWidth < this.scrollWidth && !item.attr('title')) {
                item.attr('title', item.text());
            }
        });

        $(window).click(function () {
            var $clySelect = $(".cly-select");

            $clySelect.find(".select-items").hide();
            $clySelect.find(".search").remove();
            $clySelect.removeClass("active");
        });

        $.fn.clySelectSetItems = function(items) {
            var $selectItems = $(this).find(".select-items");

            if ($selectItems) {
                $selectItems.html("");

                for (var i = 0; i < items.length; i++) {
                    $selectItems.append('<div data-value="' + items[i].value + '" class="item">' + items[i].name + '</div>');
                }
            }
        };

        $.fn.clySelectGetSelection = function() {
            return $(this).find(".select-inner .text").data("value") || null;
        };

        $.fn.clySelectSetSelection = function(value, name) {
            $(this).find(".select-inner .text").data("value", value);
            $(this).find(".select-inner .text").text(name);
            $(this).trigger("cly-select-change", [value]);
        };
    };

    /**
    * Initialize countly dropdown multi select. In most cases it is done automatically, only in some cases, when content loaded via ajax request outside of view lifecycle, you may need to initialize it yourself for your content specifically
    * @param {object} element - jQuery object reference
    * @example
    * CountlyHelpers.initializeMultiSelect($("#my-dynamic-div"));
    */
    CountlyHelpers.initializeMultiSelect = function (element) {
        element = element || $("body");

        element.off("click", ".cly-multi-select").on("click", ".cly-multi-select", function (e) {
            if ($(this).hasClass("disabled")) {
                return true;
            }

            $(this).removeClass("req");

            var selectItems = $(this).find(".select-items"),
                itemCount = selectItems.find(".item").length;

            if (!selectItems.length) {
                return false;
            }

            $(".cly-multi-select").find(".search").remove();

            if (selectItems.is(":visible")) {
                $(this).removeClass("active");
            } else {
                $(".cly-multi-select").removeClass("active");
                $(".select-items").hide();
                $(this).addClass("active");

                if (itemCount > 10) {
                    $("<div class='search'><div class='inner'><input type='text' /><i class='fa fa-search'></i></div></div>").insertBefore($(this).find(".select-items"));
                }
            }

            if ($(this).find(".select-items").is(":visible")) {
                $(this).find(".select-items").hide();
            } else {
                $(this).find(".select-items").show();
                if ($(this).find(".select-items").find(".scroll-list").length == 0) {
                    $(this).find(".select-items").wrapInner("<div class='scroll-list'></div>");
                    $(this).find(".scroll-list").slimScroll({
                        height:'100%',
                        start:'top',
                        wheelStep:10,
                        position:'right',
                        disableFadeOut:true
                    });
                }
            }

            $(this).find(".select-items").find(".item").removeClass("hidden");
            $(this).find(".select-items").find(".group").show();
            $(this).find(".select-items").find(".item").removeClass("last");
            $(this).find(".select-items").find(".item:visible:last").addClass("last");

            $(this).find(".search input").focus();

            $("#date-picker").hide();

            $(this).find(".search").off("click").on("click", function (e) {
                e.stopPropagation();
            });

            e.stopPropagation();
        });

        element.off("click", ".cly-multi-select .select-items .item").on("click", ".cly-multi-select .select-items .item", function (e) {
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
            } else {
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
            } else {
                $multiSelect.removeClass("selection-exists");
            }

            $multiSelect.data("value", getSelected($multiSelect));
            $multiSelect.trigger("cly-multi-select-change", [getSelected($multiSelect)]);
            e.stopPropagation();
        });

        element.off("keyup", ".cly-multi-select .search input").on("keyup", ".cly-multi-select .search input", function(event) {
            var $multiSelect = $(this).parents(".cly-multi-select");

            if (!$(this).val()) {
                $multiSelect.find(".item").removeClass("hidden");
                $multiSelect.find(".group").show();
            } else {
                $multiSelect.find(".item:not(:contains('" + $(this).val() + "'))").addClass("hidden");
                $multiSelect.find(".item:contains('" + $(this).val() + "')").removeClass("hidden");
                var prevHeader = $multiSelect.find(".group").first();
                prevHeader.siblings().each(function(){
                    if($(this).hasClass("group")){
                        if(prevHeader)
                            prevHeader.hide();
                        prevHeader = $(this);
                    }
                    else if($(this).hasClass("item") && $(this).is(":visible")){
                        prevHeader = null;
                    }

                    if(!$(this).next().length && prevHeader)
                        prevHeader.hide();
                })
            }
        });

        element.off('mouseenter').on('mouseenter', ".cly-multi-select .item", function () {
            var item = $(this);

            if (this.offsetWidth < this.scrollWidth && !item.attr('title')) {
                item.attr('title', item.text());
            }
        });

        element.off("click", ".cly-multi-select .selection").on("click", ".cly-multi-select .selection", function (e) {
            e.stopPropagation();
        });

        element.off("click", ".cly-multi-select .selection .remove").on("click", ".cly-multi-select .selection .remove", function (e) {
            var $multiSelect = $(this).parents(".cly-multi-select");

            $multiSelect.find(".item[data-value='" + $(this).parent(".selection").data("value") + "']").removeClass("selected");

            if ($multiSelect.find(".item.selected").length > 0) {
                $multiSelect.addClass("selection-exists");
            } else {
                $multiSelect.removeClass("selection-exists");
            }

            $(this).parent(".selection").remove();

            var maxToSelect = $multiSelect.data("max");

            if (maxToSelect) {
                if (getSelected($multiSelect).length < maxToSelect) {
                    $multiSelect.find(".item").removeClass("disabled");
                }
            }

            $multiSelect.data("value", getSelected($multiSelect));
            $multiSelect.trigger("cly-multi-select-change", [getSelected($multiSelect)])

            e.stopPropagation();
        });

        $(window).click(function () {
            var $clyMultiSelect = $(".cly-multi-select");

            $clyMultiSelect.find(".select-items").hide();
            $clyMultiSelect.find(".search").remove();
            $clyMultiSelect.removeClass("active");
        });

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

                $selection.text(name);
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
    CountlyHelpers.initializeTableOptions = function (element) {
        element = element || $('body');
        element.find("tbody").off("click", ".cly-list-options").on("click", ".cly-list-options", function (event){
            event.stopPropagation();
            event.preventDefault();
            $(".cly-button-menu").trigger('cly-list.click', event);
            $(event.target).toggleClass("active");
            if($(event.target).hasClass("active")){
                element.find(".cly-list-options").removeClass("active");
                $(event.target).addClass("active");
                var pos = $(event.target).offset();
                element.find('.cly-button-menu').css({
                    top: (pos.top+25) + "px",
                    right: 22 + "px"
                });
                element.find('.cly-button-menu').addClass("active");
                element.find('.cly-button-menu').focus();
                $(".cly-button-menu").trigger('cly-list.open', event);
            }
            else{
                $(event.target).removeClass("active");
                element.find('.cly-button-menu').removeClass("active");
                $(".cly-button-menu").trigger('cly-list.close', event);
            }
            return false;
        });
        
        element.find('.cly-button-menu .item').off("click").on("click", function(event){
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

        if(newDataArr && newDataArr.length)
            for (var i=0; i < newDataArr.length; i++) {
                dTable.oApi._fnAddData(oSettings, newDataArr[i]);
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
    CountlyHelpers.expandRows = function(dTable, getData, context){
        dTable.aOpen = [];
        dTable.on("click", "tr", function (e){
            var nTr = this;
            var id = $(nTr).attr("id");
            if(id){
                var i = $.inArray( id, dTable.aOpen );

                if ( i === -1 ) {
                    $(nTr).addClass("selected");
                    var nDetailsRow = dTable.fnOpen( nTr, getData(dTable.fnGetData( nTr ), context), 'details' );
                    $('div.datatablesubrow', nDetailsRow).show();
                    dTable.aOpen.push( id );
                    dTable.trigger("row.open", id);
                }
                else {
                    $(nTr).removeClass("selected");
                    $('div.datatablesubrow', $(nTr).next()[0]).hide();
                    dTable.fnClose( nTr );
                    dTable.aOpen.splice( i, 1 );
                    dTable.trigger("row.close", id);
                }
            }
        });
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
    CountlyHelpers.reopenRows = function(dTable, getData, context){
        var nTr;
        var oSettings = dTable.fnSettings();
        if(dTable.aOpen){
            $.each( dTable.aOpen, function ( i, id ) {
                var nTr = $("#"+id)[0];
                $(nTr).addClass("selected");
                var nDetailsRow = dTable.fnOpen( nTr, getData(dTable.fnGetData( nTr ), context), 'details' );
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
    CountlyHelpers.closeRows = function(dTable){
        if(dTable.aOpen){
            $.each( dTable.aOpen, function ( i, id ) {
                var nTr = $("#"+id)[0];
                $(nTr).removeClass("selected");
                $('div.datatablesubrow', $(nTr).next()[0]).slideUp( function () {
                    dTable.fnClose( nTr );
                    dTable.aOpen.splice( i, 1 );
                } );
                dTable.trigger("row.close", id);
            });
        }
    };

    /**
    * Convert array of app ids to comma separate string of app names
    * @param {array} context - array with app ids
    * @example
    * //outputs Test1, Test2, Test3
    * CountlyHelpers.appIdsToNames(["586e3216326a8b0a07b8d87f", "586e339a326a8b0a07b8ecb9", "586e3343c32cb30a01558cc3"]);
    */
    CountlyHelpers.appIdsToNames = function(context){
        var ret = "";

        for (var i = 0; i < context.length; i++) {
            if (!context[i]) {
                continue;
            } else if (!countlyGlobal['apps'][context[i]]) {
                ret += 'deleted app';
            } else {
                ret += countlyGlobal['apps'][context[i]]["name"];
            }

            if (context.length > 1 && i != context.length - 1) {
                ret += ", ";
            }
        }

        return ret;
    };

    /**
    * Load JS file
    * @param {string} js - path or url to js file
    * @param {callback=} calback - callback when file loaded
    * @example
    * CountlyHelpers.loadJS("/myplugin/javascripts/custom.js");
    */
    CountlyHelpers.loadJS = function(js, callback){
        var fileref=document.createElement('script'),
            loaded;
        fileref.setAttribute("type","text/javascript");
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
    * @param {callback=} calback - callback when file loaded
    * @example
    * CountlyHelpers.loadCSS("/myplugin/stylesheets/custom.css");
    */
    CountlyHelpers.loadCSS = function(css, callback){
        var fileref=document.createElement("link"),
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
        document.getElementsByTagName("head")[0].appendChild(fileref)
    };

    CountlyHelpers.messageText = function(messagePerLocale) {
        if (!messagePerLocale) {
            return '';
        } else if (messagePerLocale['default']) {
            return messagePerLocale['default'];
        } else if (messagePerLocale.en) {
            return messagePerLocale.en;
        } else {
            for (var locale in messagePerLocale) return messagePerLocale[locale];
        }
        return '';
    };

    /**
    * Returns function to be used as mRender for datatables to clip long values
    * @param {function=} f - optional function to change passed data to render and return changed object
    * @param {string=} nothing - text to display in cell
    */
    CountlyHelpers.clip = function(f, nothing) {
        return function(opt) {
            var res = typeof f === 'fucnction' ? f(opt) : opt;
            return '<div class="clip' + (res ? '' : ' nothing') + '">' + (res || nothing) + '</div>';
        }
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
    CountlyHelpers.createMetricModel = function (countlyMetric, metric, $, fetchValue) {
        countlyMetric = countlyMetric || {};
        countlyMetric.fetchValue = fetchValue;
        //Private Properties
        var _periodObj = {},
            _Db = {},
            _metrics = {},
            _activeAppKey = 0,
            _initialized = false,
            _processed = false,
            _period = null,
            _name = (metric.name)? metric.name : metric,
            _estOverrideMetric = (metric.estOverrideMetric)? metric.estOverrideMetric : "";

        /**
        * Common metric object, all metric models inherit from it and should have these methods
        * @name countlyMetric
        * @global
        * @namespace countlyMetric
        */

        //Public Methods
        /**
        * Initialize metric model to fetch initial data from server
        * @param {boolean=} processed - if true will fetch processed data, will fetch raw data by default
        * @returns {jquery_promise} jquery promise to wait while data is loaded
        * @example
        * beforeRender: function() {
        *    return $.when(countlyMetric.initialize()).then(function () {});
        * }
        */
        countlyMetric.initialize = function (processed) {
            if (_initialized &&  _period == countlyCommon.getPeriodForAjax() && _activeAppKey == countlyCommon.ACTIVE_APP_KEY) {
                return this.refresh();
            }

            _period = countlyCommon.getPeriodForAjax();

            if (!countlyCommon.DEBUG) {
                _activeAppKey = countlyCommon.ACTIVE_APP_KEY;
                _initialized = true;

                if(processed){
                    _processed = true;
                    return $.ajax({
                        type:"GET",
                        url:countlyCommon.API_PARTS.data.r+"/analytics/metric",
                        data:{
                            "api_key":countlyGlobal.member.api_key,
                            "app_id":countlyCommon.ACTIVE_APP_ID,
                            "metric":_name,
                            "period":_period
                        },
                        success:function (json) {
                            _Db = json;
                            if(countlyMetric.callback)
                                countlyMetric.callback(false, json);
                        }
                    });
                }
                else{
                    return $.ajax({
                        type:"GET",
                        url:countlyCommon.API_PARTS.data.r,
                        data:{
                            "api_key":countlyGlobal.member.api_key,
                            "app_id":countlyCommon.ACTIVE_APP_ID,
                            "method":_name,
                            "period":_period
                        },
                        success:function (json) {
                            _Db = json;
                            setMeta();
                            if(countlyMetric.callback)
                                countlyMetric.callback(false, json);
                        }
                    });
                }
            } else {
                _Db = {"2012":{}};
                if(countlyMetric.callback)
                    countlyMetric.callback(false, _Db);
                return true;
            }
        };

        /**
        * Refresh metric model by fetching data only for the latest time bucket using action=refresh on server. Currently does not fetch data for processed data loaded on initialization
        * @returns {jquery_promise} jquery promise to wait while data is loaded
        * @example
        *$.when(countlyMetric.refresh()).then(function () {
        *    //data loaded, do something
        *});
        */
        countlyMetric.refresh = function () {
            _periodObj = countlyCommon.periodObj;

            if (!countlyCommon.DEBUG) {

                if (_activeAppKey != countlyCommon.ACTIVE_APP_KEY) {
                    _activeAppKey = countlyCommon.ACTIVE_APP_KEY;
                    return this.initialize();
                }

                if(_processed){
                    if(countlyMetric.callback)
                        countlyMetric.callback(true);
                }
                else{
                    return $.ajax({
                        type:"GET",
                        url:countlyCommon.API_PARTS.data.r,
                        data:{
                            "api_key":countlyGlobal.member.api_key,
                            "app_id":countlyCommon.ACTIVE_APP_ID,
                            "method":_name,
                            "action":"refresh"
                        },
                        success:function (json) {
                            countlyCommon.extendDbObj(_Db, json);
                            extendMeta();
                            if(countlyMetric.callback)
                                countlyMetric.callback(true, json);
                        }
                    });
                }
            } else {
                _Db = {"2012":{}};
                if(countlyMetric.callback)
                    countlyMetric.callback(true, _Db);
                return true;
            }
        };

        /**
        * Callback that each metric model can define, to be called when data is loaded or refreshed
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
        countlyMetric.callback = undefined;

        /**
        * Reset/delete all retrieved metric data, like when changing app or selected time period
        */
        countlyMetric.reset = function () {
            if(_processed){
                _Db = [];
            }
            else{
                _Db = {};
                setMeta();
            }
        };

        /**
        * Get current data, if some view or model requires access to raw data
        * @return {object} raw data returned from server either in standard metric model or preprocessed data, based on what model uses
        */
        countlyMetric.getDb = function () {
            return _Db;
        };

        /**
        * Set current data for model, if you need to provide data for model from another resource (as loaded in different model)
        * @param {object} db - set new data to be used by model
        */
        countlyMetric.setDb = function (db) {
            _Db = db;
            setMeta();
        };

        /**
        * Extend current data for model with some additional information about latest period (like data from action=refresh request)
        * @param {object} db - set new data to be used by model
        */
        countlyMetric.extendDb = function (data) {
            countlyCommon.extendDbObj(_Db, data);
            extendMeta();
        };

        /**
        * Get array of unique segments available for metric data
        * @param {string} metric - name of the segment/metric to get meta for, by default will use default _name provided on initialization
        * @returns {array} array of unique metric values
        */
        countlyMetric.getMeta = function (metric) {
            metric = metric || _name;
            return _metrics[metric] || [];
        };

        /**
        * Get data after initialize finished and data was retrieved
        * @param {boolean} clean - should retrieve clean data or preprocessed by fetchValue function
        * @param {boolean} join - join new and total users into single graph, for example to dispaly in bars on the same graph and not 2 separate pie charts
        * @param {string} metric - name of the segment/metric to get data for, by default will use default _name provided on initialization
        * @param {string} estOverrideMetric - name of the total users estimation override, by default will use default _estOverrideMetric provided on initialization
        * returns {object} chartData
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
        countlyMetric.getData = function (clean, join, metric, estOverrideMetric) {
            var chartData = {};
            if(_processed){
                chartData.chartData = [];
                var data = JSON.parse(JSON.stringify(_Db));
                for(var i = 0; i < _Db.length; i++){
                    if(fetchValue && !clean)
                        data[i][metric || _name] = fetchValue(countlyCommon.decode(data[i]._id));
                    else
                        data[i][metric || _name] = countlyCommon.decode(data[i]._id);
                    chartData.chartData[i] = data[i];
                }
            }
            else{
                chartData = countlyCommon.extractTwoLevelData(_Db, this.getMeta(metric), this.clearObject, [
                    {
                        name:metric || _name,
                        func:function (rangeArr, dataObj) {
                            rangeArr = countlyCommon.decode(rangeArr);
                            if(fetchValue && !clean)
                                return fetchValue(rangeArr);
                            else
                                return rangeArr;
                        }
                    },
                    { "name":"t" },
                    { "name":"u" },
                    { "name":"n" }
                ], estOverrideMetric || _estOverrideMetric);
            }
            chartData.chartData = countlyCommon.mergeMetricsByName(chartData.chartData, metric || _name);
            chartData.chartData.sort(function(a,b){return b.t-a.t})
            var namesData = _.pluck(chartData.chartData, metric || _name),
                totalData = _.pluck(chartData.chartData, 't'),
                newData = _.pluck(chartData.chartData, 'n');

            if(join){
                chartData.chartDP = {ticks:[]};
                var chartDP = [
                    {data:[], label:jQuery.i18n.map["common.table.total-sessions"]},
                    {data:[], label:jQuery.i18n.map["common.table.new-users"]}
                ];

                chartDP[0]["data"][0] = [-1, null];
                chartDP[0]["data"][namesData.length + 1] = [namesData.length, null];
                chartDP[1]["data"][0] = [-1, null];
                chartDP[1]["data"][namesData.length + 1] = [namesData.length, null];

                chartData.chartDP.ticks.push([-1, ""]);
                chartData.chartDP.ticks.push([namesData.length, ""]);

                for (var i = 0; i < namesData.length; i++) {
                    chartDP[0]["data"][i + 1] = [i, totalData[i]];
                    chartDP[1]["data"][i + 1] = [i, newData[i]];
                    chartData.chartDP.ticks.push([i, namesData[i]]);
                }

                chartData.chartDP.dp = chartDP;
            }
            else{
                var chartData2 = [],
                chartData3 = [];

                var sum = _.reduce(totalData, function (memo, num) {
                    return memo + num;
                }, 0);

                for (var i = 0; i < namesData.length; i++) {
                    var percent = (totalData[i] / sum) * 100;
                    chartData2[i] = {data:[
                        [0, totalData[i]]
                    ], label:namesData[i]};
                }

                var sum2 = _.reduce(newData, function (memo, num) {
                    return memo + num;
                }, 0);

                for (var i = 0; i < namesData.length; i++) {
                    var percent = (newData[i] / sum) * 100;
                    chartData3[i] = {data:[
                        [0, newData[i]]
                    ], label:namesData[i]};
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
        * @param {object} obj - oject to prefill with  values if they don't exist
        * @returns prefilled object
        */
        countlyMetric.clearObject = function (obj) {
            if (obj) {
                if (!obj["t"]) obj["t"] = 0;
                if (!obj["n"]) obj["n"] = 0;
                if (!obj["u"]) obj["u"] = 0;
            }
            else {
                obj = {"t":0, "n":0, "u":0};
            }

            return obj;
        };

        /**
        * Get bar data for metric
        * @param {string} metric - name of the segment/metric to get data for, by default will use default _name provided on initialization
        * @returns {array} object to use when displaying bars as [{"name":"English","percent":44},{"name":"Italian","percent":29},{"name":"German","percent":27}]
        */
        countlyMetric.getBars = function (metric) {
            if(_processed){
                var rangeData = {};
                rangeData.chartData = [];
                var data = JSON.parse(JSON.stringify(_Db));
                for(var i = 0; i < _Db.length; i++){
                    if(fetchValue)
                        data[i]["range"] = fetchValue(countlyCommon.decode(data[i]._id));
                    else
                        data[i]["range"] = countlyCommon.decode(data[i]._id);
                    rangeData.chartData[i] = data[i];
                }
                return countlyCommon.calculateBarData(rangeData);
            }
            else{
                return countlyCommon.extractBarData(_Db, this.getMeta(metric), this.clearObject, fetchValue);
            }
        };

        /**
        * If this metric's data should be segmented by OS (which means be prefixed by first os letter on server side), you can get OS segmented data
        * @param {string} os - os name for which to get segmented metrics data
        * @param {boolean} clean - should retrieve clean data or preprocessed by fetchValue function
        * @param {string} metric - name of the segment/metric to get data for, by default will use default _name provided on initialization
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
        countlyMetric.getOSSegmentedData = function (os, clean, metric, estOverrideMetric) {
            var _os = countlyDeviceDetails.getPlatforms();
            var oSVersionData = {};
            if(_processed){
                oSVersionData.chartData = [];
                var data = JSON.parse(JSON.stringify(_Db));
                for(var i = 0; i < _Db.length; i++){
                    if(fetchValue && !clean)
                        data[i][metric || _name] = fetchValue(countlyCommon.decode(data[i]._id));
                    else
                        data[i][metric || _name] = countlyCommon.decode(data[i]._id);
                    oSVersionData.chartData[i] = data[i];
                }
            }
            else{
                oSVersionData = countlyCommon.extractTwoLevelData(_Db, this.getMeta(metric), this.clearObject, [
                    {
                        name:metric || _name,
                        func:function (rangeArr, dataObj) {
                            rangeArr = countlyCommon.decode(rangeArr);
                            if(fetchValue && !clean)
                                return fetchValue(rangeArr);
                            else
                                return rangeArr;
                        }
                    },
                    { "name":"t" },
                    { "name":"u" },
                    { "name":"n" }
                ], estOverrideMetric || _estOverrideMetric);
            }

            var osSegmentation = ((os) ? os : ((_os) ? _os[0] : null)),
                platformVersionTotal = _.pluck(oSVersionData.chartData, 'u'),
                chartData2 = [];
            var osName = osSegmentation;
            if(osSegmentation){
                if(countlyDeviceDetails.os_mapping[osSegmentation.toLowerCase()])
                    osName = countlyDeviceDetails.os_mapping[osSegmentation.toLowerCase()].short;
                else
                    osName = osSegmentation.toLowerCase()[0];
            }

            if (oSVersionData.chartData) {
                var reg = new RegExp("^"+osName,"g");
                for (var i = 0; i < oSVersionData.chartData.length; i++) {
                    var shouldDelete = true;
                    oSVersionData.chartData[i][metric || _name] = oSVersionData.chartData[i][metric || _name].replace(/:/g, ".");
                    if(reg.test(oSVersionData.chartData[i][metric || _name])){
                        shouldDelete = false;
                        oSVersionData.chartData[i][metric || _name] = oSVersionData.chartData[i][metric || _name].replace(reg, "");
                    }
                    else if(countlyMetric.checkOS && countlyMetric.checkOS(osSegmentation, oSVersionData.chartData[i][metric || _name], osName)){
                        shouldDelete = false;
                    }
                    if(shouldDelete)
                        delete oSVersionData.chartData[i];
                }
            }

            oSVersionData.chartData = _.compact(oSVersionData.chartData);

            var platformVersionNames = _.pluck(oSVersionData.chartData, metric || _name),
                platformNames = [];

            var sum = _.reduce(platformVersionTotal, function (memo, num) {
                return memo + num;
            }, 0);

            for (var i = 0; i < platformVersionNames.length; i++) {
                var percent = (platformVersionTotal[i] / sum) * 100;

                chartData2[chartData2.length] = {data:[
                    [0, platformVersionTotal[i]]
                ], label:platformVersionNames[i].replace(((countlyDeviceDetails.os_mapping[osSegmentation.toLowerCase()]) ? countlyDeviceDetails.os_mapping[osSegmentation.toLowerCase()].name : osSegmentation) + " ", "")};
            }

            oSVersionData.chartDP = {};
            oSVersionData.chartDP.dp = chartData2;
            oSVersionData.os = [];

            if (_os && _os.length > 1) {
                for (var i = 0; i < _os.length; i++) {
                    //if (_os[i] != osSegmentation) {
                    //    continue;
                    //}

                    oSVersionData.os.push({
                        "name":_os[i],
                        "class":_os[i].toLowerCase()
                    });
                }
            }

            return oSVersionData;
        };

        /**
        * Get range data which is usually stored in some time ranges/buckets. As example is loyalty, session duration and session frequency
        * @param {string} metric - name of the property in the model to fetch
        * @param {string} meta - name of the meta where property's ranges are stored
        * @param {string} explain - function that receives index of the bucket and returns bucket name
        * @returns {object}
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
        countlyMetric.getRangeData = function (metric, meta, explain) {

            var chartData = {chartData:{}, chartDP:{dp:[], ticks:[]}};

            chartData.chartData = countlyCommon.extractRangeData(_Db, metric, this.getMeta(meta), explain);

            var frequencies = _.pluck(chartData.chartData, metric),
                frequencyTotals = _.pluck(chartData.chartData, "t"),
                chartDP = [
                    {data:[]}
                ];

            chartDP[0]["data"][0] = [-1, null];
            chartDP[0]["data"][frequencies.length + 1] = [frequencies.length, null];

            chartData.chartDP.ticks.push([-1, ""]);
            chartData.chartDP.ticks.push([frequencies.length, ""]);

            for (var i = 0; i < frequencies.length; i++) {
                chartDP[0]["data"][i + 1] = [i, frequencyTotals[i]];
                chartData.chartDP.ticks.push([i, frequencies[i]]);
            }

            chartData.chartDP.dp = chartDP;

            for (var i = 0; i < chartData.chartData.length; i++) {
                chartData.chartData[i]["percent"] = "<div class='percent-bar' style='width:" + (2 * chartData.chartData[i]["percent"]) + "px;'></div>" + chartData.chartData[i]["percent"] + "%";
            }

            return chartData;
        };

        function setMeta() {
            if (_Db['meta']) {
                for(var i in _Db['meta']){
                    _metrics[i] = (_Db['meta'][i]) ? _Db['meta'][i] : [];
                }
            } else {
                _metrics = {};
            }
        }

        function extendMeta() {
            if (_Db['meta']) {
                for(var i in _Db['meta']){
                    _metrics[i] = countlyCommon.union(_metrics[i], _Db['meta'][i]);
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
    CountlyHelpers.initializeTextSelect = function (element) {
        element = element || $("#content-container");

        element.off("click", ".cly-text-select").on("click", ".cly-text-select", function (e) {
            if ($(this).hasClass("disabled")) {
                return true;
            }

            initItems($(this));

            $("#date-picker").hide();
            e.stopPropagation();
        });

        element.off("click", ".cly-text-select .select-items .item").on("click", ".cly-text-select .select-items .item", function () {
            var selectedItem = $(this).parents(".cly-text-select").find(".text");
            selectedItem.text($(this).text());
            selectedItem.data("value", $(this).data("value"));
            selectedItem.val($(this).text());
        });

        element.off("keyup", ".cly-text-select input").on("keyup", ".cly-text-select input", function(event) {
            initItems($(this).parents(".cly-text-select"), true);

            $(this).data("value", $(this).val());

            if (!$(this).val()) {
                $(this).parents(".cly-text-select").find(".item").removeClass("hidden");
            } else {
                $(this).parents(".cly-text-select").find(".item:not(:contains('" + $(this).val() + "'))").addClass("hidden");
                $(this).parents(".cly-text-select").find(".item:contains('" + $(this).val() + "')").removeClass("hidden");
            }
        });

        function initItems(select, forceShow) {
            select.removeClass("req");

            var selectItems = select.find(".select-items");

            if (!selectItems.length) {
                return false;
            }

            if (select.find(".select-items").is(":visible") && !forceShow) {
                select.find(".select-items").hide();
            } else {
                select.find(".select-items").show();
                select.find(".select-items>div").addClass("scroll-list");
                select.find(".scroll-list").slimScroll({
                    height:'100%',
                    start:'top',
                    wheelStep:10,
                    position:'right',
                    disableFadeOut:true
                });
            }
        }

        $(window).click(function () {
            $(".select-items").hide();
        });
    };

    /**
    * Generate random password
    * @param {number} length - length of the password
    * @param {boolean} no_special - do not include special characters
    * @example
    * //outputs 4UBHvRBG1v
    * CountlyHelpers.generatePassword(10, true);
    */
    CountlyHelpers.generatePassword = function(length, no_special) {
        var text = [];
        var chars = "abcdefghijklmnopqrstuvwxyz";
        var upchars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        var numbers = "0123456789";
        var specials = '!@#$%^&*()_+{}:"<>?\|[];\',./`~';
        var all = chars+upchars+numbers;
        if(!no_special)
            all += specials;

        //1 char
        text.push(upchars.charAt(Math.floor(Math.random() * upchars.length)));
        //1 number
        text.push(numbers.charAt(Math.floor(Math.random() * numbers.length)));
        //1 special char
        if(!no_special){
            text.push(specials.charAt(Math.floor(Math.random() * specials.length)));
            length--;
        }

        //5 any chars
        for( var i=0; i < Math.max(length-2, 5); i++ )
            text.push(all.charAt(Math.floor(Math.random() * all.length)));

        //randomize order
        var j, x, i;
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
    CountlyHelpers.validatePassword = function(password){
        if(password.length < countlyGlobal["security"].password_min)
            return jQuery.i18n.prop("management-users.password.length", countlyGlobal["security"].password_min);
        if(countlyGlobal["security"].password_char && !/[A-Z]/.test(password))
            return jQuery.i18n.map["management-users.password.has-char"];
        if(countlyGlobal["security"].password_number && !/\d/.test(password))
            return jQuery.i18n.map["management-users.password.has-number"];
        if(countlyGlobal["security"].password_symbol && !/[^A-Za-z\d]/.test(password))
            return jQuery.i18n.map["management-users.password.has-special"];
        return false;
    };

    $(document).ready(function () {
        $("#overlay").click(function () {
            var dialog = $(".dialog:visible:not(.cly-loading)");
            if (dialog.length) {
                dialog.fadeOut().remove();
                $(this).hide();
            }
        });

        $("#dialog-ok, #dialog-cancel, #dialog-continue").live('click', function () {
            $(this).parents(".dialog:visible").fadeOut().remove();
            if (!$('.dialog:visible').length) $("#overlay").hide();
        });

        $(document).keyup(function (e) {
            // ESC
            if (e.keyCode == 27) {
                $(".dialog:visible").animate({
                    top:0,
                    opacity:0
                }, {
                    duration:1000,
                    easing:'easeOutQuart',
                    complete:function () {
                        $(this).remove();
                    }
                });

                $("#overlay").hide();
            }
        });
    });

}(window.CountlyHelpers = window.CountlyHelpers || {}, jQuery));