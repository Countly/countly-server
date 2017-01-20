/*
 Some helper functions to be used throughout all views. Includes custom
 popup, alert and confirm dialogs for the time being.
 */
(function (CountlyHelpers, $, undefined) {

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

    CountlyHelpers.notify = function (msg) {
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
                icon:msg.icon || 'fa fa-info'
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

    CountlyHelpers.openResource = function(url) {
        var dialog = $("#cly-resource").clone();
        dialog.removeAttr("id");
        dialog.find(".content").html("<iframe style='border-radius:5px; border:none; width:800px; height:600px;' src='" + url + "'></iframe>");

        revealDialog(dialog);
    };

    CountlyHelpers.alert = function (msg, type) {
        var dialog = $("#cly-alert").clone();
        dialog.removeAttr("id");
        dialog.find(".message").html(msg);

        dialog.addClass(type);
        revealDialog(dialog);
    };

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

    CountlyHelpers.loading = function (msg) {
        var dialog = $("#cly-loading").clone();
        dialog.removeAttr("id");
        dialog.find(".message").html(msg);
        dialog.addClass('cly-loading');
        revealDialog(dialog);
        return dialog;
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

    CountlyHelpers.initializeSelect = function (element) {
        element = element || $("#content-container");

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
    };

    CountlyHelpers.initializeMultiSelect = function (element) {
        element = element || $("#content-container");

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
            $multiSelect.trigger("cly-multi-select-change");
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
            $multiSelect.trigger("cly-multi-select-change");

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
    };

    CountlyHelpers.refreshTable = function(dTable, newDataArr) {
        var oSettings = dTable.fnSettings();
        dTable.fnClearTable(false);

        if(newDataArr && newDataArr.length)
            for (var i=0; i < newDataArr.length; i++) {
                dTable.oApi._fnAddData(oSettings, newDataArr[i]);
            }

        oSettings.aiDisplay = oSettings.aiDisplayMaster.slice();
        dTable.fnStandingRedraw();
    };

    CountlyHelpers.expandRows = function(dTable, getData, context){
        dTable.aOpen = [];
        dTable.on("click", "tr", function (e){
            var nTr = this;
            var id = $(nTr).attr("id");
            if(!id){
                e.stopPropagation();
            }
            else{
                var i = $.inArray( id, dTable.aOpen );

                if ( i === -1 ) {
                    $(nTr).addClass("selected");
                    var nDetailsRow = dTable.fnOpen( nTr, getData(dTable.fnGetData( nTr ), context), 'details' );
                    $('div.datatablesubrow', nDetailsRow).show();
                    dTable.aOpen.push( id );
                }
                else {
                    $(nTr).removeClass("selected");
                    $('div.datatablesubrow', $(nTr).next()[0]).hide();
                    dTable.fnClose( nTr );
                    dTable.aOpen.splice( i, 1 );
                }
            }
        });
    };

    CountlyHelpers.reopenRows = function(dTable, getData, context){
        var nTr;
        var oSettings = dTable.fnSettings();
        if(dTable.aOpen){
            $.each( dTable.aOpen, function ( i, id ) {
                var nTr = $("#"+id)[0];
                $(nTr).addClass("selected");
                var nDetailsRow = dTable.fnOpen( nTr, getData(dTable.fnGetData( nTr ), context), 'details' );
                $('div.datatablesubrow', nDetailsRow).show();
            });
        }
    };

    CountlyHelpers.closeRows = function(dTable){
        if(dTable.aOpen){
            $.each( dTable.aOpen, function ( i, id ) {
                var nTr = $("#"+id)[0];
                $(nTr).removeClass("selected");
                $('div.datatablesubrow', $(nTr).next()[0]).slideUp( function () {
                    dTable.fnClose( nTr );
                    dTable.aOpen.splice( i, 1 );
                } );
            });
        }
    };

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

    CountlyHelpers.clip = function(f, nothing) {
        return function(opt) {
            var res = typeof f === 'fucnction' ? f(opt) : opt;
            return '<div class="clip' + (res ? '' : ' nothing') + '">' + (res || nothing) + '</div>';
        }
    };

    CountlyHelpers.createMetricModel = function (countlyMetric, metric, $, fetchValue) {
        //Private Properties
        var _periodObj = {},
            _Db = {},
            _metrics = [],
            _activeAppKey = 0,
            _initialized = false,
            _processed = false,
            _period = null,
            _name = (metric.name)? metric.name : metric,
            _estOverrideMetric = (metric.estOverrideMetric)? metric.estOverrideMetric : "";

        //Public Methods
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
                        }
                    });
                }
            } else {
                _Db = {"2012":{}};
                return true;
            }
        };

        countlyMetric.refresh = function () {
            _periodObj = countlyCommon.periodObj;

            if (!countlyCommon.DEBUG) {

                if (_activeAppKey != countlyCommon.ACTIVE_APP_KEY) {
                    _activeAppKey = countlyCommon.ACTIVE_APP_KEY;
                    return this.initialize();
                }

                if(_processed){

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
                        }
                    });
                }
            } else {
                _Db = {"2012":{}};

                return true;
            }
        };

        countlyMetric.reset = function () {
            if(_processed){
                _Db = [];
            }
            else{
                _Db = {};
                setMeta();
            }
        };

        countlyMetric.getData = function (clean) {
            var chartData = {};
            if(_processed){
                chartData.chartData = [];
                var data = JSON.parse(JSON.stringify(_Db));
                for(var i = 0; i < _Db.length; i++){
                    if(fetchValue && !clean)
                        data[i][_name] = fetchValue(countlyCommon.decode(data[i]._id));
                    else
                        data[i][_name] = countlyCommon.decode(data[i]._id);
                    chartData.chartData[i] = data[i];
                }
            }
            else{
                chartData = countlyCommon.extractTwoLevelData(_Db, _metrics, this.clearObject, [
                    {
                        name:_name,
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
                ], _estOverrideMetric);
            }

            chartData.chartData = countlyCommon.mergeMetricsByName(chartData.chartData, _name);
            var namesData = _.pluck(chartData.chartData, _name),
                totalData = _.pluck(chartData.chartData, 't'),
                newData = _.pluck(chartData.chartData, 'n'),
                chartData2 = [],
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

            return chartData;
        };

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

        countlyMetric.getBars = function () {
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
                return countlyCommon.extractBarData(_Db, _metrics, this.clearObject, fetchValue);
            }
        };

        countlyMetric.getOSSegmentedData = function (os, clean) {
            var _os = countlyDeviceDetails.getPlatforms();
            var oSVersionData = {};
            if(_processed){
                oSVersionData.chartData = [];
                var data = JSON.parse(JSON.stringify(_Db));
                for(var i = 0; i < _Db.length; i++){
                    if(fetchValue && !clean)
                        data[i][_name] = fetchValue(countlyCommon.decode(data[i]._id));
                    else
                        data[i][_name] = countlyCommon.decode(data[i]._id);
                    oSVersionData.chartData[i] = data[i];
                }
            }
            else{
                oSVersionData = countlyCommon.extractTwoLevelData(_Db, _metrics, this.clearObject, [
                    {
                        name:_name,
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
                ], _estOverrideMetric);
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
                    oSVersionData.chartData[i][_name] = oSVersionData.chartData[i][_name].replace(/:/g, ".");
                    if(reg.test(oSVersionData.chartData[i][_name])){
                        shouldDelete = false;
                        oSVersionData.chartData[i][_name] = oSVersionData.chartData[i][_name].replace(reg, "");
                    }
                    else if(countlyMetric.checkOS && countlyMetric.checkOS(osSegmentation, oSVersionData.chartData[i][_name])){
                        shouldDelete = false;
                    }
                    if(shouldDelete)
                        delete oSVersionData.chartData[i];
                }
            }

            oSVersionData.chartData = _.compact(oSVersionData.chartData);

            var platformVersionNames = _.pluck(oSVersionData.chartData, _name),
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

        function setMeta() {
            if (_Db['meta']) {
                _metrics = (_Db['meta'][_name]) ? _Db['meta'][_name] : [];
            } else {
                _metrics = [];
            }
        }

        function extendMeta() {
            if (_Db['meta']) {
                _metrics = countlyCommon.union(_metrics, _Db['meta'][_name]);
            }
        }

    };

    CountlyHelpers.initializeTextSelect = function () {
        $("#content-container").on("click", ".cly-text-select", function (e) {
            if ($(this).hasClass("disabled")) {
                return true;
            }

            initItems($(this));

            $("#date-picker").hide();
            e.stopPropagation();
        });

        $("#content-container").on("click", ".cly-text-select .select-items .item", function () {
            var selectedItem = $(this).parents(".cly-text-select").find(".text");
            selectedItem.text($(this).text());
            selectedItem.data("value", $(this).data("value"));
            selectedItem.val($(this).text());
        });

        $("#content-container").on("keyup", ".cly-text-select input", function(event) {
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

    function revealDialog(dialog) {
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

    function changeDialogHeight(dialog, animate) {
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

    CountlyHelpers.revealDialog = revealDialog;

    CountlyHelpers.changeDialogHeight = changeDialogHeight;

    CountlyHelpers.removeDialog = function(dialog){
        dialog.remove();
        $("#overlay").fadeOut();
    };

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

    CountlyHelpers.validateEmail = function(email) {
        var re = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/;
        return re.test(email);
    };

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