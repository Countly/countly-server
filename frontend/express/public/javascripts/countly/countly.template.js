/*
 A countly view is defined as a page corresponding to a url fragment such 
 as #/manage/apps. This interface defines common functions or properties 
 the view object has. A view may override any function or property.
 */
var countlyView = Backbone.View.extend({
    template:null, //handlebars template of the view
    templateData:{}, //data to be used while rendering the template
    el:$('#content'), //jquery element to render view into
    initialize:function () {    //compile view template
        this.template = Handlebars.compile($("#template-analytics-common").html());
    },
    dateChanged:function () {    //called when user changes the date selected
        if (Backbone.history.fragment == "/") {
			this.refresh(true);
		} else {
			this.refresh();
		}
    },
    appChanged:function () {    //called when user changes selected app from the sidebar
        countlyEvent.reset();

        var self = this;
        $.when(countlyEvent.initialize()).then(function() {
            self.render();
        });
    },
    beforeRender: function () {
        return true;
    },
    afterRender: function() {},
    render:function () {    //backbone.js view render function
        $("#content-top").html("");
        this.el.html('');

        if (countlyCommon.ACTIVE_APP_ID) {
            var self = this;
            $.when(this.beforeRender(), initializeOnce()).then(function() {
                self.renderCommon();
                self.afterRender();
                app.pageScript();
            });
        } else {
            this.renderCommon();
            this.afterRender();
            app.pageScript();
        }

        return this;
    },
    renderCommon:function (isRefresh) {}, // common render function of the view
    refresh:function () {    // resfresh function for the view called every 10 seconds by default
        return true;
    },
    restart:function () { // triggered when user is active after idle period
        this.refresh();
    },
    destroy:function () {}
});

var initializeOnce = _.once(function() {
    return $.when(countlyEvent.initialize()).then(function() {});
});

var Template = function () {
    this.cached = {};
};
var T = new Template();

$.extend(Template.prototype, {
    render:function (name, callback) {
        if (T.isCached(name)) {
            callback(T.cached[name]);
        } else {
            $.get(T.urlFor(name), function (raw) {
                T.store(name, raw);
                T.render(name, callback);
            });
        }
    },
    renderSync:function (name, callback) {
        if (!T.isCached(name)) {
            T.fetch(name);
        }
        T.render(name, callback);
    },
    prefetch:function (name) {
        $.get(T.urlFor(name), function (raw) {
            T.store(name, raw);
        });
    },
    fetch:function (name) {
        // synchronous, for those times when you need it.
        if (!T.isCached(name)) {
            var raw = $.ajax({'url':T.urlFor(name), 'async':false}).responseText;
            T.store(name, raw);
        }
    },
    isCached:function (name) {
        return !!T.cached[name];
    },
    store:function (name, raw) {
        T.cached[name] = Handlebars.compile(raw);
    },
    urlFor:function (name) {
        //return "/resources/templates/"+ name + ".handlebars";
        return name + ".html";
    }
});

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
        $("#yesterday").text(moment().subtract("days",1).format("Do"));

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

$.expr[":"].contains = $.expr.createPseudo(function(arg) {
    return function( elem ) {
        return $(elem).text().toUpperCase().indexOf(arg.toUpperCase()) >= 0;
    };
});

window.SessionView = countlyView.extend({
    beforeRender: function() {
        return $.when(countlyUser.initialize(), countlyTotalUsers.initialize("users")).then(function () {});
    },
    renderCommon:function (isRefresh) {

        var sessionData = countlySession.getSessionData(),
            sessionDP = countlySession.getSessionDP();

        this.templateData = {
            "page-title":jQuery.i18n.map["sessions.title"],
            "logo-class":"sessions",
            "big-numbers":{
                "count":3,
                "items":[
                    {
                        "title":jQuery.i18n.map["common.total-sessions"],
                        "total":sessionData.usage["total-sessions"].total,
                        "trend":sessionData.usage["total-sessions"].trend,
                        "help":"sessions.total-sessions"
                    },
                    {
                        "title":jQuery.i18n.map["common.new-sessions"],
                        "total":sessionData.usage["new-users"].total,
                        "trend":sessionData.usage["new-users"].trend,
                        "help":"sessions.new-sessions"
                    },
                    {
                        "title":jQuery.i18n.map["common.unique-sessions"],
                        "total":sessionData.usage["total-users"].total,
                        "trend":sessionData.usage["total-users"].trend,
                        "help":"sessions.unique-sessions"
                    }
                ]
            }
        };

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            countlyCommon.drawTimeGraph(sessionDP.chartDP, "#dashboard-graph");

            this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": sessionDP.chartData,
                "aoColumns": [
                    { "mData": "date", "sType":"customDate", "sTitle": jQuery.i18n.map["common.date"] },
                    { "mData": "t", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.total-sessions"] },
                    { "mData": "n", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.new-sessions"] },
                    { "mData": "u", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.unique-sessions"] }
                ]
            }));

            $(".d-table").stickyTableHeaders();
        }
    },
    refresh:function () {
        var self = this;
        $.when(this.beforeRender()).then(function () {
            if (app.activeView != self) {
                return false;
            }
            self.renderCommon(true);
            newPage = $("<div>" + self.template(self.templateData) + "</div>");
            $(self.el).find("#big-numbers-container").html(newPage.find("#big-numbers-container").html());

            var sessionDP = countlySession.getSessionDP();
            countlyCommon.drawTimeGraph(sessionDP.chartDP, "#dashboard-graph");
            CountlyHelpers.refreshTable(self.dtable, sessionDP.chartData);

            app.localize();
        });
    }
});

window.UserView = countlyView.extend({
    beforeRender: function() {
        return $.when(countlyUser.initialize(), countlyTotalUsers.initialize("users")).then(function () {});
    },
    renderCommon:function (isRefresh) {
        var sessionData = countlySession.getSessionData(),
            userDP = countlySession.getUserDP();

        this.templateData = {
            "page-title":jQuery.i18n.map["users.title"],
            "logo-class":"users",
            "big-numbers":{
                "count":3,
                "items":[
                    {
                        "title":jQuery.i18n.map["common.total-users"],
                        "total":sessionData.usage["total-users"].total,
                        "trend":sessionData.usage["total-users"].trend,
                        "help":"users.total-users"
                    },
                    {
                        "title":jQuery.i18n.map["common.new-users"],
                        "total":sessionData.usage["new-users"].total,
                        "trend":sessionData.usage["new-users"].trend,
                        "help":"users.new-users"
                    },
                    {
                        "title":jQuery.i18n.map["common.returning-users"],
                        "total":sessionData.usage["returning-users"].total,
                        "trend":sessionData.usage["returning-users"].trend,
                        "help":"users.returning-users"
                    }
                ]
            }
        };

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            countlyCommon.drawTimeGraph(userDP.chartDP, "#dashboard-graph");
            this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": userDP.chartData,
                "aoColumns": [
                    { "mData": "date", "sType":"customDate", "sTitle": jQuery.i18n.map["common.date"] },
                    { "mData": "u", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.total-users"] },
                    { "mData": "n", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.new-users"] },
                    { "mData": "returning", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.returning-users"] }
                ]
            }));

            $(".d-table").stickyTableHeaders();
        }
    },
    refresh:function () {
        var self = this;
        $.when(this.beforeRender()).then(function () {
            if (app.activeView != self) {
                return false;
            }
            self.renderCommon(true);
            newPage = $("<div>" + self.template(self.templateData) + "</div>");

            $(self.el).find("#big-numbers-container").replaceWith(newPage.find("#big-numbers-container"));

            var userDP = countlySession.getUserDP();
            countlyCommon.drawTimeGraph(userDP.chartDP, "#dashboard-graph");
            CountlyHelpers.refreshTable(self.dtable, userDP.chartData);

            app.localize();
        });
    }
});

window.LoyaltyView = countlyView.extend({
    beforeRender: function() {
        return $.when(countlyUser.initialize()).then(function () {});
    },
    renderCommon:function (isRefresh) {
        var loyaltyData = countlyUser.getLoyaltyData();

        this.templateData = {
            "page-title":jQuery.i18n.map["user-loyalty.title"],
            "logo-class":"loyalty",
            "chart-helper":"loyalty.chart",
            "table-helper":"loyalty.table"
        };

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));

            countlyCommon.drawGraph(loyaltyData.chartDP, "#dashboard-graph", "bar");

            this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": loyaltyData.chartData,
                "aoColumns": [
                    { "mData": "l", sType:"loyalty", "sTitle": jQuery.i18n.map["user-loyalty.table.session-count"] },
                    { "mData": "t", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.number-of-users"] },
                    { "mData": "percent", "sType":"percent", "sTitle": jQuery.i18n.map["common.percent"] }
                ]
            }));

            $(".d-table").stickyTableHeaders();
        }
    },
    refresh:function () {
        var self = this;
        $.when(countlyUser.initialize()).then(function () {
            if (app.activeView != self) {
                return false;
            }

            var loyaltyData = countlyUser.getLoyaltyData();
            countlyCommon.drawGraph(loyaltyData.chartDP, "#dashboard-graph", "bar");
            CountlyHelpers.refreshTable(self.dtable, loyaltyData.chartData);
        });
    }
});

window.CountriesView = countlyView.extend({
    cityView: (store.get("countly_location_city")) ? store.get("countly_active_app") : false,
    initialize:function () {
        this.curMap = "map-list-sessions";
        this.template = Handlebars.compile($("#template-analytics-countries").html());
    },
    beforeRender: function() {
        this.maps = {
            "map-list-sessions": {id:'total', label:jQuery.i18n.map["sidebar.analytics.sessions"], type:'number', metric:"t"},
            "map-list-users": {id:'total', label:jQuery.i18n.map["sidebar.analytics.users"], type:'number', metric:"u"},
            "map-list-new": {id:'total', label:jQuery.i18n.map["common.table.new-users"], type:'number', metric:"n"}
        };
        return $.when(countlyUser.initialize(), countlyCity.initialize(), countlyTotalUsers.initialize("countries"), countlyTotalUsers.initialize("cities"), countlyTotalUsers.initialize("users")).then(function () {});
    },
    drawTable: function() {
        var tableFirstColTitle = (this.cityView) ? jQuery.i18n.map["countries.table.city"] : jQuery.i18n.map["countries.table.country"],
            locationData,
            firstCollData = "country_flag"

        if (this.cityView) {
            locationData = countlyCity.getLocationData();
            firstCollData = "city";
        } else {
            locationData = countlyLocation.getLocationData();
        }

        var activeApp = countlyGlobal['apps'][countlyCommon.ACTIVE_APP_ID];

        this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
            "aaData": locationData,
            "aoColumns": [
                { "mData": firstCollData, "sTitle": tableFirstColTitle },
                { "mData": "t", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.total-sessions"] },
                { "mData": "u", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.total-users"] },
                { "mData": "n", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.new-users"] }
            ]
        }));

        $(".d-table").stickyTableHeaders();
    },
    renderCommon:function (isRefresh) {
        var sessionData = countlySession.getSessionData();

        this.templateData = {
            "page-title":jQuery.i18n.map["countries.title"],
            "logo-class":"countries",
            "big-numbers":{
                "count":3,
                "items":[
                    {
                        "title":jQuery.i18n.map["common.total-sessions"],
                        "total":sessionData.usage["total-sessions"].total,
                        "trend":sessionData.usage["total-sessions"].trend,
                        "help":"countries.total-sessions",
                        "radio-button-id": "map-list-sessions",
                        "radio-button-class": (this.curMap == "map-list-sessions")? "selected" : ""
                    },
                    {
                        "title":jQuery.i18n.map["common.total-users"],
                        "total":sessionData.usage["total-users"].total,
                        "trend":sessionData.usage["total-users"].trend,
                        "help":"countries.total-users",
                        "radio-button-id": "map-list-users",
                        "radio-button-class": (this.curMap == "map-list-users")? "selected" : ""
                    },
                    {
                        "title":jQuery.i18n.map["common.new-users"],
                        "total":sessionData.usage["new-users"].total,
                        "trend":sessionData.usage["new-users"].trend,
                        "help":"countries.new-users",
                        "radio-button-id": "map-list-new",
                        "radio-button-class": (this.curMap == "map-list-new")? "selected" : ""
                    }
                ]
            },
            "chart-helper":"countries.chart",
            "table-helper":"countries.table"
        };

        var self = this;
        $(document).unbind('selectMapCountry').bind('selectMapCountry', function () {
            $("#country-toggle").trigger("click");
        });

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));

            if (countlyGlobal["config"].use_google) {
                if (this.cityView) {
                    countlyCity.drawGeoChart({height:450, metric:self.maps[self.curMap]});
                } else {
                    countlyLocation.drawGeoChart({height:450, metric:self.maps[self.curMap]});
                }

                $(".widget").removeClass("google-disabled");
            }
            else{
                $(".widget").addClass("google-disabled");
            }

            this.drawTable();

            if (countlyCommon.CITY_DATA === false) {
                store.set("countly_location_city", false);
            }
            
            $("#country-toggle").on('click', function () {
                if ($(this).hasClass("country_selected")) {
                    self.cityView = false;
                    if(countlyGlobal["config"].use_google)
                        countlyLocation.drawGeoChart({height:450, metric:self.maps[self.curMap]});
                    $(this).removeClass("country_selected");
                    self.refresh(true);
                    store.set("countly_location_city", false);
                    if(countlyGlobal['apps'][countlyCommon.ACTIVE_APP_ID] && countlyGlobal['apps'][countlyCommon.ACTIVE_APP_ID].country)
                        $(this).text(jQuery.i18n.map["common.show"]+" "+countlyLocation.getCountryName(countlyGlobal['apps'][countlyCommon.ACTIVE_APP_ID].country));
                    else
                        $(this).text(jQuery.i18n.map["common.show"]+" "+jQuery.i18n.map["countries.table.country"]);
                } else {
                    self.cityView = true;
                    if(countlyGlobal["config"].use_google)
                        countlyCity.drawGeoChart({height:450, metric:self.maps[self.curMap]});
                    $(this).addClass("country_selected");
                    self.refresh(true);
                    store.set("countly_location_city", true);
                    $(this).html('<i class="fa fa-chevron-left" aria-hidden="true"></i>'+jQuery.i18n.map["countries.back-to-list"]);
                }
            });
            
            if(self.cityView){
                $("#country-toggle").html('<i class="fa fa-chevron-left" aria-hidden="true"></i>'+jQuery.i18n.map["countries.back-to-list"]).addClass("country_selected");
            }
            else{
                if(countlyGlobal['apps'][countlyCommon.ACTIVE_APP_ID] && countlyGlobal['apps'][countlyCommon.ACTIVE_APP_ID].country)
                    $("#country-toggle").text(jQuery.i18n.map["common.show"]+" "+countlyLocation.getCountryName(countlyGlobal['apps'][countlyCommon.ACTIVE_APP_ID].country));
                else
                    $("#country-toggle").text(jQuery.i18n.map["common.show"]+" "+jQuery.i18n.map["countries.table.country"]);
            }
            
            $(".geo-switch").on("click", ".radio", function(){
                $(".geo-switch").find(".radio").removeClass("selected");
                $(this).addClass("selected");
                self.curMap = $(this).data("id");

                if (self.cityView)
                    countlyCity.refreshGeoChart(self.maps[self.curMap]);
                else
                    countlyLocation.refreshGeoChart(self.maps[self.curMap]);
            });
        }
    },
    refresh:function (isToggle) {
        var self = this;
        $.when(this.beforeRender()).then(function () {
            if (app.activeView != self) {
                return false;
            }
            self.renderCommon(true);
            newPage = $("<div>" + self.template(self.templateData) + "</div>");

            $(self.el).find("#big-numbers-container").replaceWith(newPage.find("#big-numbers-container"));

            if (isToggle) {
                self.drawTable();
            } else {
                var locationData;
                if (self.cityView) {
                    locationData = countlyCity.getLocationData();
                    if(countlyGlobal["config"].use_google)
                        countlyCity.refreshGeoChart(self.maps[self.curMap]);
                } else {
                    locationData = countlyLocation.getLocationData();
                    if(countlyGlobal["config"].use_google)
                        countlyLocation.refreshGeoChart(self.maps[self.curMap]);
                }

                CountlyHelpers.refreshTable(self.dtable, locationData);
            }

            app.localize();
        });
    }
});

window.FrequencyView = countlyView.extend({
    beforeRender: function() {
        return $.when(countlyUser.initialize()).then(function () {});
    },
    renderCommon:function (isRefresh) {
        var frequencyData = countlyUser.getFrequencyData();

        this.templateData = {
            "page-title":jQuery.i18n.map["session-frequency.title"],
            "logo-class":"frequency",
            "chart-helper":"frequency.chart",
            "table-helper":"frequency.table"
        };

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));

            countlyCommon.drawGraph(frequencyData.chartDP, "#dashboard-graph", "bar");

            this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": frequencyData.chartData,
                "aoColumns": [
                    { "mData": "f", sType:"frequency", "sTitle": jQuery.i18n.map["session-frequency.table.time-after"] },
                    { "mData": "t", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.number-of-sessions"] },
                    { "mData": "percent", "sType":"percent", "sTitle": jQuery.i18n.map["common.percent"] }
                ]
            }));

            $(".d-table").stickyTableHeaders();
        }
    },
    refresh:function () {
        var self = this;
        $.when(countlyUser.initialize()).then(function () {
            if (app.activeView != self) {
                return false;
            }

            var frequencyData = countlyUser.getFrequencyData();
            countlyCommon.drawGraph(frequencyData.chartDP, "#dashboard-graph", "bar");
            CountlyHelpers.refreshTable(self.dtable, frequencyData.chartData);
        });
    }
});

window.DeviceView = countlyView.extend({
    beforeRender: function() {
        return $.when(countlyDevice.initialize(), countlyDeviceDetails.initialize(), countlyTotalUsers.initialize("devices")).then(function () {});
    },
    pageScript:function () {
        app.localize();
    },
    renderCommon:function (isRefresh) {
        var deviceData = countlyDevice.getDeviceData();

        this.templateData = {
            "page-title":jQuery.i18n.map["devices.title"],
            "logo-class":"devices",
            "graph-type-double-pie":true,
            "pie-titles":{
                "left":jQuery.i18n.map["common.total-users"],
                "right":jQuery.i18n.map["common.new-users"]
            },
            "bars":[
                {
                    "title":jQuery.i18n.map["common.bar.top-platform"],
                    "data":countlyDeviceDetails.getPlatformBars(),
                    "help":"dashboard.top-platforms"
                },
                {
                    "title":jQuery.i18n.map["common.bar.top-platform-version"],
                    "data":countlyDeviceDetails.getOSVersionBars(),
                    "help":"devices.platform-versions2"
                },
                {
                    "title":jQuery.i18n.map["common.bar.top-resolution"],
                    "data":countlyDeviceDetails.getResolutionBars(),
                    "help":"dashboard.top-resolutions"
                }
            ],
            "chart-helper":"devices.chart",
            "table-helper":""
        };

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            this.pageScript();

            countlyCommon.drawGraph(deviceData.chartDPTotal, "#dashboard-graph", "pie");
            countlyCommon.drawGraph(deviceData.chartDPNew, "#dashboard-graph2", "pie");

            this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": deviceData.chartData,
                "aoColumns": [
                    { "mData": "device", "sTitle": jQuery.i18n.map["devices.table.device"] },
                    { "mData": "t", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.total-sessions"] },
                    { "mData": "u", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.total-users"] },
                    { "mData": "n", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.new-users"] }
                ]
            }));

            $(".d-table").stickyTableHeaders();
        }
    },
    refresh:function () {
        var self = this;
        $.when(this.beforeRender()).then(function () {
            if (app.activeView != self) {
                return false;
            }
            self.renderCommon(true);

            newPage = $("<div>" + self.template(self.templateData) + "</div>");
            $(self.el).find(".dashboard-summary").replaceWith(newPage.find(".dashboard-summary"));

            var deviceData = countlyDevice.getDeviceData();

            countlyCommon.drawGraph(deviceData.chartDPTotal, "#dashboard-graph", "pie");
            countlyCommon.drawGraph(deviceData.chartDPNew, "#dashboard-graph2", "pie");
            CountlyHelpers.refreshTable(self.dtable, deviceData.chartData);

            self.pageScript();
        });
    }
});

window.PlatformView = countlyView.extend({
    activePlatform:{},
    beforeRender: function() {
        return $.when(countlyDeviceDetails.initialize(), countlyTotalUsers.initialize("platforms"), countlyTotalUsers.initialize("platform_versions")).then(function () {});
    },
    pageScript:function () {
        var self = this;

        app.localize();
    },
    renderCommon:function (isRefresh) {
        var self = this;
        var platformData = countlyDeviceDetails.getPlatformData();
        platformData.chartData.sort(function(a,b) {return (a.os_ > b.os_) ? 1 : ((b.os_ > a.os_) ? -1 : 0);});
        var chartHTML = "";

        if (platformData && platformData.chartDP && platformData.chartDP.dp && platformData.chartDP.dp.length) {
            chartHTML += '<div class="hsb-container top"><div class="label">Platforms</div><div class="chart"><svg id="hsb-platforms"></svg></div></div>';

            for (var i = 0; i < platformData.chartDP.dp.length; i++) {
                chartHTML += '<div class="hsb-container"><div class="label">'+ platformData.chartDP.dp[i].label +'</div><div class="chart"><svg id="hsb-platform'+ i +'"></svg></div></div>';
            }
        }
        
        if(!this.activePlatform[countlyCommon.ACTIVE_APP_ID])
            this.activePlatform[countlyCommon.ACTIVE_APP_ID] = (platformData.chartData[0]) ? platformData.chartData[0].os_ : "";
        
        var segments = [];
        for(var i = 0; i < platformData.chartData.length; i++){
            segments.push({name:platformData.chartData[i].os_, value:platformData.chartData[i].origos_})
        }

        this.templateData = {
            "page-title":jQuery.i18n.map["platforms.title"],
            "segment-title":jQuery.i18n.map["platforms.table.platform-version-for"],
            "logo-class":"platforms",
            "chartHTML": chartHTML,
            "isChartEmpty": (chartHTML)? false : true,
            "chart-helper":"platform-versions.chart",
            "table-helper":"",
            "two-tables": true,
            "active-segment": this.activePlatform[countlyCommon.ACTIVE_APP_ID],
            "segmentation": segments
        };

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            this.pageScript();

            this.dtable = $('#dataTableOne').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": platformData.chartData,
                "fnRowCallback": function( nRow, aData, iDisplayIndex, iDisplayIndexFull ) {
                    $(nRow).data("name", aData.origos_);
                    $(nRow).addClass("os-rows");
                },
                "aoColumns": [
                    { "mData": "os_", "sTitle": jQuery.i18n.map["platforms.table.platform"] },
                    { "mData": "t", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.total-sessions"] },
                    { "mData": "u", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.total-users"] },
                    { "mData": "n", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.new-users"] }
                ]
            }));
            
            $(".segmentation-widget .segmentation-option").on("click", function () {
                self.activePlatform[countlyCommon.ACTIVE_APP_ID] = $(this).data("value");
                self.refresh();
            });

            countlyCommon.drawHorizontalStackedBars(platformData.chartDP.dp, "#hsb-platforms");

            if (platformData && platformData.chartDP) {
                for (var i = 0; i < platformData.chartDP.dp.length; i++) {
                    var tmpOsVersion = countlyDeviceDetails.getOSVersionData(platformData.chartDP.dp[i].label);

                    countlyCommon.drawHorizontalStackedBars(tmpOsVersion.chartDP.dp, "#hsb-platform"+i, i);
                }
            }

            var oSVersionData = countlyDeviceDetails.getOSVersionData(this.activePlatform[countlyCommon.ACTIVE_APP_ID]);

            this.dtableTwo = $('#dataTableTwo').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": oSVersionData.chartData,
                "aoColumns": [
                    { "mData": "os_version", "sTitle": jQuery.i18n.map["platforms.table.platform-version"] },
                    { "mData": "t", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.total-sessions"] },
                    { "mData": "u", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.total-users"] },
                    { "mData": "n", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.new-users"] }
                ]
            }));

            $("#dataTableTwo").stickyTableHeaders();
        }
    },
    refresh:function () {
        var self = this;
        $.when(this.beforeRender()).then(function () {
            if (app.activeView != self) {
                return false;
            }
            self.renderCommon(true);

            var oSVersionData = countlyDeviceDetails.getOSVersionData(self.activePlatform[countlyCommon.ACTIVE_APP_ID]),
                platformData = countlyDeviceDetails.getPlatformData(),
                newPage = $("<div>" + self.template(self.templateData) + "</div>");

            $(self.el).find(".widget-content").replaceWith(newPage.find(".widget-content"));
            $(self.el).find(".dashboard-summary").replaceWith(newPage.find(".dashboard-summary"));

            countlyCommon.drawHorizontalStackedBars(platformData.chartDP.dp, "#hsb-platforms");

            if (platformData && platformData.chartDP) {
                for (var i = 0; i < platformData.chartDP.dp.length; i++) {
                    var tmpOsVersion = countlyDeviceDetails.getOSVersionData(platformData.chartDP.dp[i].label);

                    countlyCommon.drawHorizontalStackedBars(tmpOsVersion.chartDP.dp, "#hsb-platform"+i, i);
                }
            }

            CountlyHelpers.refreshTable(self.dtable, platformData.chartData);
            CountlyHelpers.refreshTable(self.dtableTwo, oSVersionData.chartData);

            self.pageScript();
        });
    }
});

window.AppVersionView = countlyView.extend({
    beforeRender: function() {
        return $.when(countlyDeviceDetails.initialize(), countlyTotalUsers.initialize("app_versions")).then(function () {});
    },
    renderCommon:function (isRefresh) {
        var appVersionData = countlyAppVersion.getAppVersionData();

        this.templateData = {
            "page-title":jQuery.i18n.map["app-versions.title"],
            "logo-class":"app-versions",
            "chart-helper":"app-versions.chart",
            "table-helper":""
        };

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            countlyCommon.drawGraph(appVersionData.chartDP, "#dashboard-graph", "bar");

            this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": appVersionData.chartData,
                "aoColumns": [
                    { "mData": "app_version", "sTitle": jQuery.i18n.map["app-versions.table.app-version"] },
                    { "mData": "t", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.total-sessions"] },
                    { "mData": "u", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.total-users"] },
                    { "mData": "n", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.new-users"] }
                ]
            }));

            $(".d-table").stickyTableHeaders();
        }
    },
    refresh:function () {
        var self = this;
        $.when(this.beforeRender()).then(function () {
            if (app.activeView != self) {
                return false;
            }

            var appVersionData = countlyAppVersion.getAppVersionData();
            countlyCommon.drawGraph(appVersionData.chartDP, "#dashboard-graph", "bar");
            CountlyHelpers.refreshTable(self.dtable, appVersionData.chartData);
        });
    }
});

window.CarrierView = countlyView.extend({
    beforeRender: function() {
        return $.when(countlyCarrier.initialize(), countlyTotalUsers.initialize("carriers")).then(function () {});
    },
    renderCommon:function (isRefresh) {
        var carrierData = countlyCarrier.getCarrierData();

        this.templateData = {
            "page-title":jQuery.i18n.map["carriers.title"],
            "logo-class":"carriers",
            "graph-type-double-pie":true,
            "pie-titles":{
                "left":jQuery.i18n.map["common.total-users"],
                "right":jQuery.i18n.map["common.new-users"]
            },
            "chart-helper":"carriers.chart",
            "table-helper":""
        };

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));

            countlyCommon.drawGraph(carrierData.chartDPTotal, "#dashboard-graph", "pie");
            countlyCommon.drawGraph(carrierData.chartDPNew, "#dashboard-graph2", "pie");

            this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": carrierData.chartData,
                "aoColumns": [
                    { "mData": "carrier", "sTitle": jQuery.i18n.map["carriers.table.carrier"] },
                    { "mData": "t", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.total-sessions"] },
                    { "mData": "u", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.total-users"] },
                    { "mData": "n", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.new-users"] }
                ]
            }));

            $(".d-table").stickyTableHeaders();
        }
    },
    refresh:function () {
        var self = this;
        $.when(this.beforeRender()).then(function () {
            if (app.activeView != self) {
                return false;
            }

            var carrierData = countlyCarrier.getCarrierData();
            countlyCommon.drawGraph(carrierData.chartDPTotal, "#dashboard-graph", "pie");
            countlyCommon.drawGraph(carrierData.chartDPNew, "#dashboard-graph2", "pie");
            CountlyHelpers.refreshTable(self.dtable, carrierData.chartData);
        });
    }
});

window.ResolutionView = countlyView.extend({
    beforeRender: function() {
        return $.when(countlyDeviceDetails.initialize(), countlyTotalUsers.initialize("resolutions")).then(function () {});
    },
    renderCommon:function (isRefresh) {
        var resolutionData = countlyDeviceDetails.getResolutionData();

        this.templateData = {
            "page-title":jQuery.i18n.map["resolutions.title"],
            "logo-class":"resolutions",
            "graph-type-double-pie":true,
            "pie-titles":{
                "left":jQuery.i18n.map["common.total-users"],
                "right":jQuery.i18n.map["common.new-users"]
            },
            "chart-helper":"resolutions.chart"
        };

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));

            countlyCommon.drawGraph(resolutionData.chartDPTotal, "#dashboard-graph", "pie");
            countlyCommon.drawGraph(resolutionData.chartDPNew, "#dashboard-graph2", "pie");

            this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": resolutionData.chartData,
                "aoColumns": [
                    { "mData": "resolution", "sTitle": jQuery.i18n.map["resolutions.table.resolution"] },
                    { "mData": function(row){return parseInt(row.width.replace(/<(?:.|\n)*?>/gm, ''))}, sType:"numeric","sTitle": jQuery.i18n.map["resolutions.table.width"] },
                    { "mData": function(row){return parseInt(row.height.replace(/<(?:.|\n)*?>/gm, ''))}, sType:"numeric","sTitle": jQuery.i18n.map["resolutions.table.height"] },
                    { "mData": "t", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.total-sessions"] },
                    { "mData": "u", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.total-users"] },
                    { "mData": "n", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.new-users"] }
                ]
            }));

            $(".d-table").stickyTableHeaders();
        }
    },
    refresh:function () {
        var self = this;
        $.when(this.beforeRender()).then(function () {
            if (app.activeView != self) {
                return false;
            }
            self.renderCommon(true);

            newPage = $("<div>" + self.template(self.templateData) + "</div>");
            $(self.el).find(".dashboard-summary").replaceWith(newPage.find(".dashboard-summary"));

            var resolutionData = countlyDeviceDetails.getResolutionData();

            countlyCommon.drawGraph(resolutionData.chartDPTotal, "#dashboard-graph", "pie");
            countlyCommon.drawGraph(resolutionData.chartDPNew, "#dashboard-graph2", "pie");
            CountlyHelpers.refreshTable(self.dtable, resolutionData.chartData);
        });
    }
});

window.DurationView = countlyView.extend({
    beforeRender: function() {
        return $.when(countlyUser.initialize()).then(function () {});
    },
    renderCommon:function (isRefresh) {
        var durationData = countlySession.getDurationData();

        this.templateData = {
            "page-title":jQuery.i18n.map["session-duration.title"],
            "logo-class":"durations",
            "chart-helper":"durations.chart",
            "table-helper":"durations.table"
        };

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));

            countlyCommon.drawGraph(durationData.chartDP, "#dashboard-graph", "bar");

            this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": durationData.chartData,
                "aoColumns": [
                    { "mData": "ds", sType:"session-duration", "sTitle": jQuery.i18n.map["session-duration.table.duration"] },
                    { "mData": "t", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.number-of-sessions"] },
                    { "mData": "percent", "sType":"percent", "sTitle": jQuery.i18n.map["common.percent"] }
                ]
            }));

            $(".d-table").stickyTableHeaders();
        }
    },
    refresh:function () {
        var self = this;
        $.when(countlyUser.initialize()).then(function () {
            if (app.activeView != self) {
                return false;
            }

            var durationData = countlySession.getDurationData();
            countlyCommon.drawGraph(durationData.chartDP, "#dashboard-graph", "bar");
            CountlyHelpers.refreshTable(self.dtable, durationData.chartData);
        });
    }
});

window.ManageAppsView = countlyView.extend({
    initialize:function () {
        this.template = Handlebars.compile($("#template-management-applications").html());
    },
    getAppCategories: function(){
        return { 1:jQuery.i18n.map["application-category.books"], 2:jQuery.i18n.map["application-category.business"], 3:jQuery.i18n.map["application-category.education"], 4:jQuery.i18n.map["application-category.entertainment"], 5:jQuery.i18n.map["application-category.finance"], 6:jQuery.i18n.map["application-category.games"], 7:jQuery.i18n.map["application-category.health-fitness"], 8:jQuery.i18n.map["application-category.lifestyle"], 9:jQuery.i18n.map["application-category.medical"], 10:jQuery.i18n.map["application-category.music"], 11:jQuery.i18n.map["application-category.navigation"], 12:jQuery.i18n.map["application-category.news"], 13:jQuery.i18n.map["application-category.photography"], 14:jQuery.i18n.map["application-category.productivity"], 15:jQuery.i18n.map["application-category.reference"], 16:jQuery.i18n.map["application-category.social-networking"], 17:jQuery.i18n.map["application-category.sports"], 18:jQuery.i18n.map["application-category.travel"], 19:jQuery.i18n.map["application-category.utilities"], 20:jQuery.i18n.map["application-category.weather"]};
    },
    getTimeZones: function(){
        return { "AF":{"n":"Afghanistan","z":[{"(GMT+04:30) Kabul":"Asia/Kabul"}]}, "AL":{"n":"Albania","z":[{"(GMT+01:00) Tirane":"Europe/Tirane"}]}, "DZ":{"n":"Algeria","z":[{"(GMT+01:00) Algiers":"Africa/Algiers"}]}, "AS":{"n":"American Samoa","z":[{"(GMT-11:00) Pago Pago":"Pacific/Pago_Pago"}]}, "AD":{"n":"Andorra","z":[{"(GMT+01:00) Andorra":"Europe/Andorra"}]}, "AO":{"n":"Angola","z":[{"(GMT+01:00) Luanda":"Africa/Luanda"}]}, "AI":{"n":"Anguilla","z":[{"(GMT-04:00) Anguilla":"America/Anguilla"}]}, "AQ":{"n":"Antarctica","z":[{"(GMT-04:00) Palmer":"Antarctica/Palmer"},{"(GMT-03:00) Rothera":"Antarctica/Rothera"},{"(GMT+03:00) Syowa":"Antarctica/Syowa"},{"(GMT+05:00) Mawson":"Antarctica/Mawson"},{"(GMT+06:00) Vostok":"Antarctica/Vostok"},{"(GMT+07:00) Davis":"Antarctica/Davis"},{"(GMT+08:00) Casey":"Antarctica/Casey"},{"(GMT+10:00) Dumont D'Urville":"Antarctica/DumontDUrville"}]}, "AG":{"n":"Antigua and Barbuda","z":[{"(GMT-04:00) Antigua":"America/Antigua"}]}, "AR":{"n":"Argentina","z":[{"(GMT-03:00) Buenos Aires":"America/Buenos_Aires"}]}, "AM":{"n":"Armenia","z":[{"(GMT+04:00) Yerevan":"Asia/Yerevan"}]}, "AW":{"n":"Aruba","z":[{"(GMT-04:00) Aruba":"America/Aruba"}]}, "AU":{"n":"Australia","z":[{"(GMT+08:00) Western Time - Perth":"Australia/Perth"},{"(GMT+09:30) Central Time - Adelaide":"Australia/Adelaide"},{"(GMT+09:30) Central Time - Darwin":"Australia/Darwin"},{"(GMT+10:00) Eastern Time - Brisbane":"Australia/Brisbane"},{"(GMT+10:00) Eastern Time - Hobart":"Australia/Hobart"},{"(GMT+10:00) Eastern Time - Melbourne, Sydney":"Australia/Sydney"}]}, "AT":{"n":"Austria","z":[{"(GMT+01:00) Vienna":"Europe/Vienna"}]}, "AZ":{"n":"Azerbaijan","z":[{"(GMT+04:00) Baku":"Asia/Baku"}]}, "BS":{"n":"Bahamas","z":[{"(GMT-05:00) Nassau":"America/Nassau"}]}, "BH":{"n":"Bahrain","z":[{"(GMT+03:00) Bahrain":"Asia/Bahrain"}]}, "BD":{"n":"Bangladesh","z":[{"(GMT+06:00) Dhaka":"Asia/Dhaka"}]}, "BB":{"n":"Barbados","z":[{"(GMT-04:00) Barbados":"America/Barbados"}]}, "BY":{"n":"Belarus","z":[{"(GMT+03:00) Minsk":"Europe/Minsk"}]}, "BE":{"n":"Belgium","z":[{"(GMT+01:00) Brussels":"Europe/Brussels"}]}, "BZ":{"n":"Belize","z":[{"(GMT-06:00) Belize":"America/Belize"}]}, "BJ":{"n":"Benin","z":[{"(GMT+01:00) Porto-Novo":"Africa/Porto-Novo"}]}, "BM":{"n":"Bermuda","z":[{"(GMT-04:00) Bermuda":"Atlantic/Bermuda"}]}, "BT":{"n":"Bhutan","z":[{"(GMT+06:00) Thimphu":"Asia/Thimphu"}]}, "BO":{"n":"Bolivia","z":[{"(GMT-04:00) La Paz":"America/La_Paz"}]}, "BA":{"n":"Bosnia and Herzegovina","z":[{"(GMT+01:00) Central European Time - Belgrade":"Europe/Sarajevo"}]}, "BW":{"n":"Botswana","z":[{"(GMT+02:00) Gaborone":"Africa/Gaborone"}]}, "BR":{"n":"Brazil","z":[{"(GMT-04:00) Boa Vista":"America/Boa_Vista"},{"(GMT-04:00) Campo Grande":"America/Campo_Grande"},{"(GMT-04:00) Cuiaba":"America/Cuiaba"},{"(GMT-04:00) Manaus":"America/Manaus"},{"(GMT-04:00) Porto Velho":"America/Porto_Velho"},{"(GMT-04:00) Rio Branco":"America/Rio_Branco"},{"(GMT-03:00) Araguaina":"America/Araguaina"},{"(GMT-03:00) Belem":"America/Belem"},{"(GMT-03:00) Fortaleza":"America/Fortaleza"},{"(GMT-03:00) Maceio":"America/Maceio"},{"(GMT-03:00) Recife":"America/Recife"},{"(GMT-03:00) Salvador":"America/Bahia"},{"(GMT-03:00) Sao Paulo":"America/Sao_Paulo"},{"(GMT-02:00) Noronha":"America/Noronha"}]}, "IO":{"n":"British Indian Ocean Territory","z":[{"(GMT+06:00) Chagos":"Indian/Chagos"}]}, "VG":{"n":"British Virgin Islands","z":[{"(GMT-04:00) Tortola":"America/Tortola"}]}, "BN":{"n":"Brunei","z":[{"(GMT+08:00) Brunei":"Asia/Brunei"}]}, "BG":{"n":"Bulgaria","z":[{"(GMT+02:00) Sofia":"Europe/Sofia"}]}, "BF":{"n":"Burkina Faso","z":[{"(GMT+00:00) Ouagadougou":"Africa/Ouagadougou"}]}, "BI":{"n":"Burundi","z":[{"(GMT+02:00) Bujumbura":"Africa/Bujumbura"}]}, "KH":{"n":"Cambodia","z":[{"(GMT+07:00) Phnom Penh":"Asia/Phnom_Penh"}]}, "CM":{"n":"Cameroon","z":[{"(GMT+01:00) Douala":"Africa/Douala"}]}, "CA":{"n":"Canada","z":[{"(GMT-07:00) Mountain Time - Dawson Creek":"America/Dawson_Creek"},{"(GMT-08:00) Pacific Time - Vancouver":"America/Vancouver"},{"(GMT-08:00) Pacific Time - Whitehorse":"America/Whitehorse"},{"(GMT-06:00) Central Time - Regina":"America/Regina"},{"(GMT-07:00) Mountain Time - Edmonton":"America/Edmonton"},{"(GMT-07:00) Mountain Time - Yellowknife":"America/Yellowknife"},{"(GMT-06:00) Central Time - Winnipeg":"America/Winnipeg"},{"(GMT-05:00) Eastern Time - Iqaluit":"America/Iqaluit"},{"(GMT-05:00) Eastern Time - Montreal":"America/Montreal"},{"(GMT-05:00) Eastern Time - Toronto":"America/Toronto"},{"(GMT-04:00) Atlantic Time - Halifax":"America/Halifax"},{"(GMT-03:30) Newfoundland Time - St. Johns":"America/St_Johns"}]}, "CV":{"n":"Cape Verde","z":[{"(GMT-01:00) Cape Verde":"Atlantic/Cape_Verde"}]}, "KY":{"n":"Cayman Islands","z":[{"(GMT-05:00) Cayman":"America/Cayman"}]}, "CF":{"n":"Central African Republic","z":[{"(GMT+01:00) Bangui":"Africa/Bangui"}]}, "TD":{"n":"Chad","z":[{"(GMT+01:00) Ndjamena":"Africa/Ndjamena"}]}, "CL":{"n":"Chile","z":[{"(GMT-06:00) Easter Island":"Pacific/Easter"},{"(GMT-04:00) Santiago":"America/Santiago"}]}, "CN":{"n":"China","z":[{"(GMT+08:00) China Time - Beijing":"Asia/Shanghai"}]}, "CX":{"n":"Christmas Island","z":[{"(GMT+07:00) Christmas":"Indian/Christmas"}]}, "CC":{"n":"Cocos [Keeling] Islands","z":[{"(GMT+06:30) Cocos":"Indian/Cocos"}]}, "CO":{"n":"Colombia","z":[{"(GMT-05:00) Bogota":"America/Bogota"}]}, "KM":{"n":"Comoros","z":[{"(GMT+03:00) Comoro":"Indian/Comoro"}]}, "CD":{"n":"Congo [DRC]","z":[{"(GMT+01:00) Kinshasa":"Africa/Kinshasa"},{"(GMT+02:00) Lubumbashi":"Africa/Lubumbashi"}]}, "CG":{"n":"Congo [Republic]","z":[{"(GMT+01:00) Brazzaville":"Africa/Brazzaville"}]}, "CK":{"n":"Cook Islands","z":[{"(GMT-10:00) Rarotonga":"Pacific/Rarotonga"}]}, "CR":{"n":"Costa Rica","z":[{"(GMT-06:00) Costa Rica":"America/Costa_Rica"}]}, "CI":{"n":"Côte d’Ivoire","z":[{"(GMT+00:00) Abidjan":"Africa/Abidjan"}]}, "HR":{"n":"Croatia","z":[{"(GMT+01:00) Central European Time - Belgrade":"Europe/Zagreb"}]}, "CU":{"n":"Cuba","z":[{"(GMT-05:00) Havana":"America/Havana"}]}, "CW":{"n":"Curaçao","z":[{"(GMT-04:00) Curacao":"America/Curacao"}]}, "CY":{"n":"Cyprus","z":[{"(GMT+02:00) Nicosia":"Asia/Nicosia"}]}, "CZ":{"n":"Czech Republic","z":[{"(GMT+01:00) Central European Time - Prague":"Europe/Prague"}]}, "DK":{"n":"Denmark","z":[{"(GMT+01:00) Copenhagen":"Europe/Copenhagen"}]}, "DJ":{"n":"Djibouti","z":[{"(GMT+03:00) Djibouti":"Africa/Djibouti"}]}, "DM":{"n":"Dominica","z":[{"(GMT-04:00) Dominica":"America/Dominica"}]}, "DO":{"n":"Dominican Republic","z":[{"(GMT-04:00) Santo Domingo":"America/Santo_Domingo"}]}, "EC":{"n":"Ecuador","z":[{"(GMT-06:00) Galapagos":"Pacific/Galapagos"},{"(GMT-05:00) Guayaquil":"America/Guayaquil"}]}, "EG":{"n":"Egypt","z":[{"(GMT+02:00) Cairo":"Africa/Cairo"}]}, "SV":{"n":"El Salvador","z":[{"(GMT-06:00) El Salvador":"America/El_Salvador"}]}, "GQ":{"n":"Equatorial Guinea","z":[{"(GMT+01:00) Malabo":"Africa/Malabo"}]}, "ER":{"n":"Eritrea","z":[{"(GMT+03:00) Asmera":"Africa/Asmera"}]}, "EE":{"n":"Estonia","z":[{"(GMT+02:00) Tallinn":"Europe/Tallinn"}]}, "ET":{"n":"Ethiopia","z":[{"(GMT+03:00) Addis Ababa":"Africa/Addis_Ababa"}]}, "FK":{"n":"Falkland Islands [Islas Malvinas]","z":[{"(GMT-03:00) Stanley":"Atlantic/Stanley"}]}, "FO":{"n":"Faroe Islands","z":[{"(GMT+00:00) Faeroe":"Atlantic/Faeroe"}]}, "FJ":{"n":"Fiji","z":[{"(GMT+12:00) Fiji":"Pacific/Fiji"}]}, "FI":{"n":"Finland","z":[{"(GMT+02:00) Helsinki":"Europe/Helsinki"}]}, "FR":{"n":"France","z":[{"(GMT+01:00) Paris":"Europe/Paris"}]}, "GF":{"n":"French Guiana","z":[{"(GMT-03:00) Cayenne":"America/Cayenne"}]}, "PF":{"n":"French Polynesia","z":[{"(GMT-10:00) Tahiti":"Pacific/Tahiti"},{"(GMT-09:30) Marquesas":"Pacific/Marquesas"},{"(GMT-09:00) Gambier":"Pacific/Gambier"}]}, "TF":{"n":"French Southern Territories","z":[{"(GMT+05:00) Kerguelen":"Indian/Kerguelen"}]}, "GA":{"n":"Gabon","z":[{"(GMT+01:00) Libreville":"Africa/Libreville"}]}, "GM":{"n":"Gambia","z":[{"(GMT+00:00) Banjul":"Africa/Banjul"}]}, "GE":{"n":"Georgia","z":[{"(GMT+04:00) Tbilisi":"Asia/Tbilisi"}]}, "DE":{"n":"Germany","z":[{"(GMT+01:00) Berlin":"Europe/Berlin"}]}, "GH":{"n":"Ghana","z":[{"(GMT+00:00) Accra":"Africa/Accra"}]}, "GI":{"n":"Gibraltar","z":[{"(GMT+01:00) Gibraltar":"Europe/Gibraltar"}]}, "GR":{"n":"Greece","z":[{"(GMT+02:00) Athens":"Europe/Athens"}]}, "GL":{"n":"Greenland","z":[{"(GMT-04:00) Thule":"America/Thule"},{"(GMT-03:00) Godthab":"America/Godthab"},{"(GMT-01:00) Scoresbysund":"America/Scoresbysund"},{"(GMT+00:00) Danmarkshavn":"America/Danmarkshavn"}]}, "GD":{"n":"Grenada","z":[{"(GMT-04:00) Grenada":"America/Grenada"}]}, "GP":{"n":"Guadeloupe","z":[{"(GMT-04:00) Guadeloupe":"America/Guadeloupe"}]}, "GU":{"n":"Guam","z":[{"(GMT+10:00) Guam":"Pacific/Guam"}]}, "GT":{"n":"Guatemala","z":[{"(GMT-06:00) Guatemala":"America/Guatemala"}]}, "GN":{"n":"Guinea","z":[{"(GMT+00:00) Conakry":"Africa/Conakry"}]}, "GW":{"n":"Guinea-Bissau","z":[{"(GMT+00:00) Bissau":"Africa/Bissau"}]}, "GY":{"n":"Guyana","z":[{"(GMT-04:00) Guyana":"America/Guyana"}]}, "HT":{"n":"Haiti","z":[{"(GMT-05:00) Port-au-Prince":"America/Port-au-Prince"}]}, "HN":{"n":"Honduras","z":[{"(GMT-06:00) Central Time - Tegucigalpa":"America/Tegucigalpa"}]}, "HK":{"n":"Hong Kong","z":[{"(GMT+08:00) Hong Kong":"Asia/Hong_Kong"}]}, "HU":{"n":"Hungary","z":[{"(GMT+01:00) Budapest":"Europe/Budapest"}]}, "IS":{"n":"Iceland","z":[{"(GMT+00:00) Reykjavik":"Atlantic/Reykjavik"}]}, "IN":{"n":"India","z":[{"(GMT+05:30) India Standard Time":"Asia/Calcutta"}]}, "ID":{"n":"Indonesia","z":[{"(GMT+07:00) Jakarta":"Asia/Jakarta"},{"(GMT+08:00) Makassar":"Asia/Makassar"},{"(GMT+09:00) Jayapura":"Asia/Jayapura"}]}, "IR":{"n":"Iran","z":[{"(GMT+03:30) Tehran":"Asia/Tehran"}]}, "IQ":{"n":"Iraq","z":[{"(GMT+03:00) Baghdad":"Asia/Baghdad"}]}, "IE":{"n":"Ireland","z":[{"(GMT+00:00) Dublin":"Europe/Dublin"}]}, "IL":{"n":"Israel","z":[{"(GMT+02:00) Jerusalem":"Asia/Jerusalem"}]}, "IT":{"n":"Italy","z":[{"(GMT+01:00) Rome":"Europe/Rome"}]}, "JM":{"n":"Jamaica","z":[{"(GMT-05:00) Jamaica":"America/Jamaica"}]}, "JP":{"n":"Japan","z":[{"(GMT+09:00) Tokyo":"Asia/Tokyo"}]}, "JO":{"n":"Jordan","z":[{"(GMT+02:00) Amman":"Asia/Amman"}]}, "KZ":{"n":"Kazakhstan","z":[{"(GMT+05:00) Aqtau":"Asia/Aqtau"},{"(GMT+05:00) Aqtobe":"Asia/Aqtobe"},{"(GMT+06:00) Almaty":"Asia/Almaty"}]}, "KE":{"n":"Kenya","z":[{"(GMT+03:00) Nairobi":"Africa/Nairobi"}]}, "KI":{"n":"Kiribati","z":[{"(GMT+12:00) Tarawa":"Pacific/Tarawa"},{"(GMT+13:00) Enderbury":"Pacific/Enderbury"},{"(GMT+14:00) Kiritimati":"Pacific/Kiritimati"}]}, "KW":{"n":"Kuwait","z":[{"(GMT+03:00) Kuwait":"Asia/Kuwait"}]}, "KG":{"n":"Kyrgyzstan","z":[{"(GMT+06:00) Bishkek":"Asia/Bishkek"}]}, "LA":{"n":"Laos","z":[{"(GMT+07:00) Vientiane":"Asia/Vientiane"}]}, "LV":{"n":"Latvia","z":[{"(GMT+02:00) Riga":"Europe/Riga"}]}, "LB":{"n":"Lebanon","z":[{"(GMT+02:00) Beirut":"Asia/Beirut"}]}, "LS":{"n":"Lesotho","z":[{"(GMT+02:00) Maseru":"Africa/Maseru"}]}, "LR":{"n":"Liberia","z":[{"(GMT+00:00) Monrovia":"Africa/Monrovia"}]}, "LY":{"n":"Libya","z":[{"(GMT+02:00) Tripoli":"Africa/Tripoli"}]}, "LI":{"n":"Liechtenstein","z":[{"(GMT+01:00) Vaduz":"Europe/Vaduz"}]}, "LT":{"n":"Lithuania","z":[{"(GMT+02:00) Vilnius":"Europe/Vilnius"}]}, "LU":{"n":"Luxembourg","z":[{"(GMT+01:00) Luxembourg":"Europe/Luxembourg"}]}, "MO":{"n":"Macau","z":[{"(GMT+08:00) Macau":"Asia/Macau"}]}, "MK":{"n":"Macedonia [FYROM]","z":[{"(GMT+01:00) Central European Time - Belgrade":"Europe/Skopje"}]}, "MG":{"n":"Madagascar","z":[{"(GMT+03:00) Antananarivo":"Indian/Antananarivo"}]}, "MW":{"n":"Malawi","z":[{"(GMT+02:00) Blantyre":"Africa/Blantyre"}]}, "MY":{"n":"Malaysia","z":[{"(GMT+08:00) Kuala Lumpur":"Asia/Kuala_Lumpur"}]}, "MV":{"n":"Maldives","z":[{"(GMT+05:00) Maldives":"Indian/Maldives"}]}, "ML":{"n":"Mali","z":[{"(GMT+00:00) Bamako":"Africa/Bamako"}]}, "MT":{"n":"Malta","z":[{"(GMT+01:00) Malta":"Europe/Malta"}]}, "MH":{"n":"Marshall Islands","z":[{"(GMT+12:00) Kwajalein":"Pacific/Kwajalein"},{"(GMT+12:00) Majuro":"Pacific/Majuro"}]}, "MQ":{"n":"Martinique","z":[{"(GMT-04:00) Martinique":"America/Martinique"}]}, "MR":{"n":"Mauritania","z":[{"(GMT+00:00) Nouakchott":"Africa/Nouakchott"}]}, "MU":{"n":"Mauritius","z":[{"(GMT+04:00) Mauritius":"Indian/Mauritius"}]}, "YT":{"n":"Mayotte","z":[{"(GMT+03:00) Mayotte":"Indian/Mayotte"}]}, "MX":{"n":"Mexico","z":[{"(GMT-07:00) Mountain Time - Hermosillo":"America/Hermosillo"},{"(GMT-08:00) Pacific Time - Tijuana":"America/Tijuana"},{"(GMT-07:00) Mountain Time - Chihuahua, Mazatlan":"America/Mazatlan"},{"(GMT-06:00) Central Time - Mexico City":"America/Mexico_City"}]}, "FM":{"n":"Micronesia","z":[{"(GMT+10:00) Truk":"Pacific/Truk"},{"(GMT+11:00) Kosrae":"Pacific/Kosrae"},{"(GMT+11:00) Ponape":"Pacific/Ponape"}]}, "MD":{"n":"Moldova","z":[{"(GMT+02:00) Chisinau":"Europe/Chisinau"}]}, "MC":{"n":"Monaco","z":[{"(GMT+01:00) Monaco":"Europe/Monaco"}]}, "MN":{"n":"Mongolia","z":[{"(GMT+07:00) Hovd":"Asia/Hovd"},{"(GMT+08:00) Choibalsan":"Asia/Choibalsan"},{"(GMT+08:00) Ulaanbaatar":"Asia/Ulaanbaatar"}]}, "MS":{"n":"Montserrat","z":[{"(GMT-04:00) Montserrat":"America/Montserrat"}]}, "MA":{"n":"Morocco","z":[{"(GMT+00:00) Casablanca":"Africa/Casablanca"}]}, "MZ":{"n":"Mozambique","z":[{"(GMT+02:00) Maputo":"Africa/Maputo"}]}, "MM":{"n":"Myanmar [Burma]","z":[{"(GMT+06:30) Rangoon":"Asia/Rangoon"}]}, "NA":{"n":"Namibia","z":[{"(GMT+01:00) Windhoek":"Africa/Windhoek"}]}, "NR":{"n":"Nauru","z":[{"(GMT+12:00) Nauru":"Pacific/Nauru"}]}, "NP":{"n":"Nepal","z":[{"(GMT+05:45) Katmandu":"Asia/Katmandu"}]}, "NL":{"n":"Netherlands","z":[{"(GMT+01:00) Amsterdam":"Europe/Amsterdam"}]}, "NC":{"n":"New Caledonia","z":[{"(GMT+11:00) Noumea":"Pacific/Noumea"}]}, "NZ":{"n":"New Zealand","z":[{"(GMT+12:00) Auckland":"Pacific/Auckland"}]}, "NI":{"n":"Nicaragua","z":[{"(GMT-06:00) Managua":"America/Managua"}]}, "NE":{"n":"Niger","z":[{"(GMT+01:00) Niamey":"Africa/Niamey"}]}, "NG":{"n":"Nigeria","z":[{"(GMT+01:00) Lagos":"Africa/Lagos"}]}, "NU":{"n":"Niue","z":[{"(GMT-11:00) Niue":"Pacific/Niue"}]}, "NF":{"n":"Norfolk Island","z":[{"(GMT+11:30) Norfolk":"Pacific/Norfolk"}]}, "KP":{"n":"North Korea","z":[{"(GMT+09:00) Pyongyang":"Asia/Pyongyang"}]}, "MP":{"n":"Northern Mariana Islands","z":[{"(GMT+10:00) Saipan":"Pacific/Saipan"}]}, "NO":{"n":"Norway","z":[{"(GMT+01:00) Oslo":"Europe/Oslo"}]}, "OM":{"n":"Oman","z":[{"(GMT+04:00) Muscat":"Asia/Muscat"}]}, "PK":{"n":"Pakistan","z":[{"(GMT+05:00) Karachi":"Asia/Karachi"}]}, "PW":{"n":"Palau","z":[{"(GMT+09:00) Palau":"Pacific/Palau"}]}, "PS":{"n":"Palestinian Territories","z":[{"(GMT+02:00) Gaza":"Asia/Gaza"}]}, "PA":{"n":"Panama","z":[{"(GMT-05:00) Panama":"America/Panama"}]}, "PG":{"n":"Papua New Guinea","z":[{"(GMT+10:00) Port Moresby":"Pacific/Port_Moresby"}]}, "PY":{"n":"Paraguay","z":[{"(GMT-04:00) Asuncion":"America/Asuncion"}]}, "PE":{"n":"Peru","z":[{"(GMT-05:00) Lima":"America/Lima"}]}, "PH":{"n":"Philippines","z":[{"(GMT+08:00) Manila":"Asia/Manila"}]}, "PN":{"n":"Pitcairn Islands","z":[{"(GMT-08:00) Pitcairn":"Pacific/Pitcairn"}]}, "PL":{"n":"Poland","z":[{"(GMT+01:00) Warsaw":"Europe/Warsaw"}]}, "PT":{"n":"Portugal","z":[{"(GMT-01:00) Azores":"Atlantic/Azores"},{"(GMT+00:00) Lisbon":"Europe/Lisbon"}]}, "PR":{"n":"Puerto Rico","z":[{"(GMT-04:00) Puerto Rico":"America/Puerto_Rico"}]}, "QA":{"n":"Qatar","z":[{"(GMT+03:00) Qatar":"Asia/Qatar"}]}, "RE":{"n":"Réunion","z":[{"(GMT+04:00) Reunion":"Indian/Reunion"}]}, "RO":{"n":"Romania","z":[{"(GMT+02:00) Bucharest":"Europe/Bucharest"}]}, "RU":{"n":"Russia","z":[{"(GMT+03:00) Moscow-01 - Kaliningrad":"Europe/Kaliningrad"},{"(GMT+04:00) Moscow+00":"Europe/Moscow"},{"(GMT+04:00) Moscow+00 - Samara":"Europe/Samara"},{"(GMT+06:00) Moscow+02 - Yekaterinburg":"Asia/Yekaterinburg"},{"(GMT+07:00) Moscow+03 - Omsk, Novosibirsk":"Asia/Omsk"},{"(GMT+08:00) Moscow+04 - Krasnoyarsk":"Asia/Krasnoyarsk"},{"(GMT+09:00) Moscow+05 - Irkutsk":"Asia/Irkutsk"},{"(GMT+10:00) Moscow+06 - Yakutsk":"Asia/Yakutsk"},{"(GMT+11:00) Moscow+07 - Yuzhno-Sakhalinsk":"Asia/Vladivostok"},{"(GMT+12:00) Moscow+08 - Magadan":"Asia/Magadan"},{"(GMT+12:00) Moscow+08 - Petropavlovsk-Kamchatskiy":"Asia/Kamchatka"}]}, "RW":{"n":"Rwanda","z":[{"(GMT+02:00) Kigali":"Africa/Kigali"}]}, "SH":{"n":"Saint Helena","z":[{"(GMT+00:00) St Helena":"Atlantic/St_Helena"}]}, "KN":{"n":"Saint Kitts and Nevis","z":[{"(GMT-04:00) St. Kitts":"America/St_Kitts"}]}, "LC":{"n":"Saint Lucia","z":[{"(GMT-04:00) St. Lucia":"America/St_Lucia"}]}, "PM":{"n":"Saint Pierre and Miquelon","z":[{"(GMT-03:00) Miquelon":"America/Miquelon"}]}, "VC":{"n":"Saint Vincent and the Grenadines","z":[{"(GMT-04:00) St. Vincent":"America/St_Vincent"}]}, "WS":{"n":"Samoa","z":[{"(GMT+13:00) Apia":"Pacific/Apia"}]}, "SM":{"n":"San Marino","z":[{"(GMT+01:00) Rome":"Europe/San_Marino"}]}, "ST":{"n":"São Tomé and Príncipe","z":[{"(GMT+00:00) Sao Tome":"Africa/Sao_Tome"}]}, "SA":{"n":"Saudi Arabia","z":[{"(GMT+03:00) Riyadh":"Asia/Riyadh"}]}, "SN":{"n":"Senegal","z":[{"(GMT+00:00) Dakar":"Africa/Dakar"}]}, "RS":{"n":"Serbia","z":[{"(GMT+01:00) Central European Time - Belgrade":"Europe/Belgrade"}]}, "SC":{"n":"Seychelles","z":[{"(GMT+04:00) Mahe":"Indian/Mahe"}]}, "SL":{"n":"Sierra Leone","z":[{"(GMT+00:00) Freetown":"Africa/Freetown"}]}, "SG":{"n":"Singapore","z":[{"(GMT+08:00) Singapore":"Asia/Singapore"}]}, "SK":{"n":"Slovakia","z":[{"(GMT+01:00) Central European Time - Prague":"Europe/Bratislava"}]}, "SI":{"n":"Slovenia","z":[{"(GMT+01:00) Central European Time - Belgrade":"Europe/Ljubljana"}]}, "SB":{"n":"Solomon Islands","z":[{"(GMT+11:00) Guadalcanal":"Pacific/Guadalcanal"}]}, "SO":{"n":"Somalia","z":[{"(GMT+03:00) Mogadishu":"Africa/Mogadishu"}]}, "ZA":{"n":"South Africa","z":[{"(GMT+02:00) Johannesburg":"Africa/Johannesburg"}]}, "GS":{"n":"South Georgia and the South Sandwich Islands","z":[{"(GMT-02:00) South Georgia":"Atlantic/South_Georgia"}]}, "KR":{"n":"South Korea","z":[{"(GMT+09:00) Seoul":"Asia/Seoul"}]}, "ES":{"n":"Spain","z":[{"(GMT+00:00) Canary Islands":"Atlantic/Canary"},{"(GMT+01:00) Ceuta":"Africa/Ceuta"},{"(GMT+01:00) Madrid":"Europe/Madrid"}]}, "LK":{"n":"Sri Lanka","z":[{"(GMT+05:30) Colombo":"Asia/Colombo"}]}, "SD":{"n":"Sudan","z":[{"(GMT+03:00) Khartoum":"Africa/Khartoum"}]}, "SR":{"n":"Suriname","z":[{"(GMT-03:00) Paramaribo":"America/Paramaribo"}]}, "SJ":{"n":"Svalbard and Jan Mayen","z":[{"(GMT+01:00) Oslo":"Arctic/Longyearbyen"}]}, "SZ":{"n":"Swaziland","z":[{"(GMT+02:00) Mbabane":"Africa/Mbabane"}]}, "SE":{"n":"Sweden","z":[{"(GMT+01:00) Stockholm":"Europe/Stockholm"}]}, "CH":{"n":"Switzerland","z":[{"(GMT+01:00) Zurich":"Europe/Zurich"}]}, "SY":{"n":"Syria","z":[{"(GMT+02:00) Damascus":"Asia/Damascus"}]}, "TW":{"n":"Taiwan","z":[{"(GMT+08:00) Taipei":"Asia/Taipei"}]}, "TJ":{"n":"Tajikistan","z":[{"(GMT+05:00) Dushanbe":"Asia/Dushanbe"}]}, "TZ":{"n":"Tanzania","z":[{"(GMT+03:00) Dar es Salaam":"Africa/Dar_es_Salaam"}]}, "TH":{"n":"Thailand","z":[{"(GMT+07:00) Bangkok":"Asia/Bangkok"}]}, "TL":{"n":"Timor-Leste","z":[{"(GMT+09:00) Dili":"Asia/Dili"}]}, "TG":{"n":"Togo","z":[{"(GMT+00:00) Lome":"Africa/Lome"}]}, "TK":{"n":"Tokelau","z":[{"(GMT+14:00) Fakaofo":"Pacific/Fakaofo"}]}, "TO":{"n":"Tonga","z":[{"(GMT+13:00) Tongatapu":"Pacific/Tongatapu"}]}, "TT":{"n":"Trinidad and Tobago","z":[{"(GMT-04:00) Port of Spain":"America/Port_of_Spain"}]}, "TN":{"n":"Tunisia","z":[{"(GMT+01:00) Tunis":"Africa/Tunis"}]}, "TR":{"n":"Turkey","z":[{"(GMT+02:00) Istanbul":"Europe/Istanbul"}]}, "TM":{"n":"Turkmenistan","z":[{"(GMT+05:00) Ashgabat":"Asia/Ashgabat"}]}, "TC":{"n":"Turks and Caicos Islands","z":[{"(GMT-05:00) Grand Turk":"America/Grand_Turk"}]}, "TV":{"n":"Tuvalu","z":[{"(GMT+12:00) Funafuti":"Pacific/Funafuti"}]}, "UM":{"n":"U.S. Minor Outlying Islands","z":[{"(GMT-11:00) Midway":"Pacific/Midway"},{"(GMT-10:00) Johnston":"Pacific/Johnston"},{"(GMT+12:00) Wake":"Pacific/Wake"}]}, "VI":{"n":"U.S. Virgin Islands","z":[{"(GMT-04:00) St. Thomas":"America/St_Thomas"}]}, "UG":{"n":"Uganda","z":[{"(GMT+03:00) Kampala":"Africa/Kampala"}]}, "UA":{"n":"Ukraine","z":[{"(GMT+02:00) Kiev":"Europe/Kiev"}]}, "AE":{"n":"United Arab Emirates","z":[{"(GMT+04:00) Dubai":"Asia/Dubai"}]}, "GB":{"n":"United Kingdom","z":[{"(GMT+00:00) GMT (no daylight saving)":"Etc/GMT"},{"(GMT+00:00) London":"Europe/London"}]}, "US":{"n":"United States","z":[{"(GMT-10:00) Hawaii Time":"Pacific/Honolulu"},{"(GMT-09:00) Alaska Time":"America/Anchorage"},{"(GMT-07:00) Mountain Time - Arizona":"America/Phoenix"},{"(GMT-08:00) Pacific Time":"America/Los_Angeles"},{"(GMT-07:00) Mountain Time":"America/Denver"},{"(GMT-06:00) Central Time":"America/Chicago"},{"(GMT-05:00) Eastern Time":"America/New_York"}]}, "UY":{"n":"Uruguay","z":[{"(GMT-03:00) Montevideo":"America/Montevideo"}]}, "UZ":{"n":"Uzbekistan","z":[{"(GMT+05:00) Tashkent":"Asia/Tashkent"}]}, "VU":{"n":"Vanuatu","z":[{"(GMT+11:00) Efate":"Pacific/Efate"}]}, "VA":{"n":"Vatican City","z":[{"(GMT+01:00) Rome":"Europe/Vatican"}]}, "VE":{"n":"Venezuela","z":[{"(GMT-04:30) Caracas":"America/Caracas"}]}, "VN":{"n":"Vietnam","z":[{"(GMT+07:00) Hanoi":"Asia/Saigon"}]}, "WF":{"n":"Wallis and Futuna","z":[{"(GMT+12:00) Wallis":"Pacific/Wallis"}]}, "EH":{"n":"Western Sahara","z":[{"(GMT+00:00) El Aaiun":"Africa/El_Aaiun"}]}, "YE":{"n":"Yemen","z":[{"(GMT+03:00) Aden":"Asia/Aden"}]}, "ZM":{"n":"Zambia","z":[{"(GMT+02:00) Lusaka":"Africa/Lusaka"}]}, "ZW":{"n":"Zimbabwe","z":[{"(GMT+02:00) Harare":"Africa/Harare"}]} };
    },
    renderCommon:function () {
        var appTypes = {};
        for(var i in app.appTypes){
            appTypes[i] = jQuery.i18n.map["management-applications.types."+i] || i;
        }
        $(this.el).html(this.template({
            admin_apps:countlyGlobal['admin_apps'],
            app_types:appTypes
        }));
        
        var appCategories = this.getAppCategories();
        var timezones = this.getTimeZones();

        var appId = countlyCommon.ACTIVE_APP_ID;
        if(!countlyGlobal['admin_apps'][appId]){
            for(var i in countlyGlobal['admin_apps']){
                appId = i;
                break;
            }
        }
        $("#app-management-bar .app-container").removeClass("active");
        $("#app-management-bar .app-container[data-id='" + appId + "']").addClass("active");
        
        $(".select-app-types").on("click",".item", function(){
            app.onAppManagementSwitch($("#app-edit-id").val(), $(this).data("value"));
            if ($(this).parents('#add-new-app').length) {
                app.onAppAddTypeSwitch($(this).data('value'));
            }
        });

        function initAppManagement(appId) {
            if (jQuery.isEmptyObject(countlyGlobal['apps'])) {
                showAdd();
                $("#no-app-warning").show();
                return false;
            } else if (jQuery.isEmptyObject(countlyGlobal['admin_apps'])) {
                showAdd();
                return false;
            } else {
                hideAdd();

                if (countlyGlobal['admin_apps'][appId]) {
                    $("#delete-app").show();
                } else {
                    $("#delete-app").hide();
                }
            }

            if ($("#new-install-overlay").is(":visible")) {
                $("#no-app-warning").hide();
                //$("#first-app-success").show();
                $("#new-install-overlay").fadeOut();
                countlyCommon.setActiveApp(appId);
                $("#sidebar-app-select").find(".logo").css("background-image", "url('"+countlyGlobal["cdn"]+"appimages/" + appId + ".png')");
                $("#sidebar-app-select").find(".text").text(countlyGlobal['apps'][appId].name);
                app.onAppSwitch(appId, true);
                app.sidebar.init();
            }
            if(countlyGlobal["config"] && countlyGlobal["config"].code && $("#code-countly").length){
                $("#code-countly").show();
            }
            
            app.onAppManagementSwitch(appId);

            $("#app-edit-id").val(appId);
            $("#view-app").find(".widget-header .title").text(countlyGlobal['apps'][appId].name);
            $("#app-edit-name").find(".read span").text(countlyGlobal['apps'][appId].name);
            $("#app-edit-name").find(".edit input").val(countlyGlobal['apps'][appId].name);
            $("#app-edit-key").find(".read").text(countlyGlobal['apps'][appId].key);
            $("#app-edit-key").find(".edit input").val(countlyGlobal['apps'][appId].key);
            $("#app-edit-salt").find(".read").text(countlyGlobal['apps'][appId].checksum_salt || "");
            $("#app-edit-salt").find(".edit input").val(countlyGlobal['apps'][appId].checksum_salt || "");
            $("#view-app-id").text(appId);
            $("#app-edit-type").find(".cly-select .text").text(appTypes[countlyGlobal['apps'][appId].type]);
            $("#app-edit-type").find(".cly-select .text").data("value", countlyGlobal['apps'][appId].type);
            $("#app-edit-type").find(".read").text(appTypes[countlyGlobal['apps'][appId].type]);
            $("#app-edit-category").find(".cly-select .text").text(appCategories[countlyGlobal['apps'][appId].category]);
            $("#app-edit-category").find(".cly-select .text").data("value", countlyGlobal['apps'][appId].category);
            $("#app-edit-timezone").find(".cly-select .text").data("value", countlyGlobal['apps'][appId].timezone);
            $("#app-edit-category").find(".read").text(appCategories[countlyGlobal['apps'][appId].category]);
            $("#app-edit-image").find(".read .logo").css({"background-image":'url("'+countlyGlobal["cdn"]+'appimages/' + appId + '.png")'});
            var appTimezone = timezones[countlyGlobal['apps'][appId].country];

            for (var i = 0; i < appTimezone.z.length; i++) {
                for (var tzone in appTimezone.z[i]) {
                    if (appTimezone.z[i][tzone] == countlyGlobal['apps'][appId].timezone) {
                        var appEditTimezone = $("#app-edit-timezone").find(".read"),
                            appCountryCode = countlyGlobal['apps'][appId].country;
                        appEditTimezone.find(".flag").css({"background-image":"url("+countlyGlobal["cdn"]+"images/flags/" + appCountryCode.toLowerCase() + ".png)"});
                        appEditTimezone.find(".country").text(appTimezone.n);
                        appEditTimezone.find(".timezone").text(tzone);
                        initCountrySelect("#app-edit-timezone", appCountryCode, tzone, appTimezone.z[i][tzone]);
                        break;
                    }
                }
            }
            
            function joinUsers(users){
                var ret = "";
                if(users && users.length){
                    for(var i = 0; i < users.length; i++){
                        if(users[i].full_name && users[i].full_name != "")
                            ret += users[i].full_name + ", ";
                        else if(users[i].username && users[i].username != "")
                            ret += users[i].username + ", ";
                        else
                            ret += users[i]._id + ", ";
                    }
                    ret = ret.substring(0, ret.length - 2);
                }
                return ret;
            }
            $("#app_details").off("click").on("click", function(){
                var dialog = CountlyHelpers.loading(jQuery.i18n.map["common.loading"]);
                $.ajax({
                    type:"GET",
                    url:countlyCommon.API_PARTS.apps.r + '/details',
                    data:{
                        app_id:appId,
                        api_key:countlyGlobal['member'].api_key
                    },
                    dataType:"json",
                    success:function (result) {
                        dialog.remove();
                        if(result && result.app){
                            var table = "<table class='events-table d-table' cellpadding='0' cellspacing='0'>";
                            table += "<colgroup><col width='200px'><col width='155px'><col width='100%'></colgroup>";
                            //app creator
                            table += "<tr><th colspan='3'>"+jQuery.i18n.map["management-applications.app-details"]+"</th></tr>";
                            table += "<tr><td>"+jQuery.i18n.map["management-applications.app-creator"]+"</td><td class='details-value' colspan='2'>"+((result.app.owner == "") ? jQuery.i18n.map["common.unknown"] : result.app.owner) +"</td></tr>";
                            table += "<tr><td>"+jQuery.i18n.map["management-applications.app-created-at"]+"</td><td class='details-value' colspan='2'>"+((result.app.created_at == 0)? jQuery.i18n.map["common.unknown"] : countlyCommon.formatTimeAgo(result.app.created_at))+"</td></tr>";
                            table += "<tr><td>"+jQuery.i18n.map["management-applications.app-edited-at"]+"</td><td class='details-value' colspan='2'>"+((result.app.edited_at == 0)? jQuery.i18n.map["common.unknown"] : countlyCommon.formatTimeAgo(result.app.edited_at))+"</td></tr>";
                            table += "<tr><td>"+jQuery.i18n.map["management-applications.app-last-data"]+"</td><td class='details-value' colspan='2'>"+((result.app.last_data == 0)? jQuery.i18n.map["common.unknown"] : countlyCommon.formatTimeAgo(result.app.last_data))+"</td></tr>";
                            table += "<tr><td rowspan='3'>"+jQuery.i18n.map["management-applications.app-users"]+"</td>";
                            table += "<td class='second-header'>"+jQuery.i18n.map["management-applications.global_admins"]+"</td><td class='details-value'>"+joinUsers(result.global_admin)+"</td></tr>";
                            table += "<tr><td class='second-header'>"+jQuery.i18n.map["management-applications.admins"]+"</td><td class='details-value'>"+joinUsers(result.admin)+"</td></tr>";
                            table += "<tr><td class='second-header'>"+jQuery.i18n.map["management-applications.users"]+"</td><td class='details-value'>"+joinUsers(result.user)+"</td></tr>";
                            CountlyHelpers.popup(table+"</table><div class='buttons'><div class='icon-button light btn-close'>"+jQuery.i18n.map["common.close"]+"</div></div>", "app_details_table", true);
                            $(".btn-close").off("click").on("click", function(){$("#overlay").trigger('click');});
                        }
                        else{
                            CountlyHelpers.alert(jQuery.i18n.map["management-applications.application-no-details"], "red");
                        }
                    },
                    error: function(){
                        dialog.remove();
                        CountlyHelpers.alert(jQuery.i18n.map["management-applications.application-no-details"], "red");
                    }
                });
            });
        }

        function initCountrySelect(parent, countryCode, timezoneText, timezone) {
            $(parent + " #timezone-select").hide();
            $(parent + " #selected").hide();
            $(parent + " #timezone-items").html("");
            $(parent + " #country-items").html("");

            var countrySelect = $(parent + " #country-items");
            var timezoneSelect = $(parent + " #timezone-items");

            for (var key in timezones) {
                countrySelect.append("<div data-value='" + key + "' class='item'><div class='flag' style='background-image:url("+countlyGlobal["cdn"]+"images/flags/" + key.toLowerCase() + ".png)'></div>" + timezones[key].n + "</div>")
            }

            if (countryCode && timezoneText && timezone) {
                var country = timezones[countryCode];

                if (country.z.length == 1) {
                    for (var prop in country.z[0]) {
                        $(parent + " #selected").show();
                        $(parent + " #selected").text(prop);
                        $(parent + " #app-timezone").val(country.z[0][prop]);
                        $(parent + " #app-country").val(countryCode);
                        $(parent + " #country-select .text").html("<div class='flag' style='background-image:url("+countlyGlobal["cdn"]+"images/flags/" + countryCode.toLowerCase() + ".png)'></div>" + country.n);
                    }
                } else {
                    $(parent + " #timezone-select").find(".text").text(prop);
                    var countryTimezones = country.z;

                    for (var i = 0; i < countryTimezones.length; i++) {
                        for (var prop in countryTimezones[i]) {
                            timezoneSelect.append("<div data-value='" + countryTimezones[i][prop] + "' class='item'>" + prop + "</div>")
                        }
                    }

                    $(parent + " #app-timezone").val(timezone);
                    $(parent + " #app-country").val(countryCode);
                    $(parent + " #country-select .text").html("<div class='flag' style='background-image:url("+countlyGlobal["cdn"]+"images/flags/" + countryCode.toLowerCase() + ".png)'></div>" + country.n);
                    $(parent + " #timezone-select .text").text(timezoneText);
                    $(parent + " #timezone-select").show();
                }

                $(parent + " .select-items .item").click(function () {
                    var selectedItem = $(this).parents(".cly-select").find(".text");
                    selectedItem.html($(this).html());
                    selectedItem.data("value", $(this).data("value"));
                });
                $(parent + " #timezone-items .item").click(function () {
                    $(parent + " #app-timezone").val($(this).data("value"));
                });
            }

            $(parent + " #country-items .item").click(function () {
                $(parent + " #selected").text("");
                $(parent + " #timezone-select").hide();
                timezoneSelect.html("");
                var attr = $(this).data("value");
                var countryTimezones = timezones[attr].z;

                if (countryTimezones.length == 1) {
                    for (var prop in timezones[attr].z[0]) {
                        $(parent + " #selected").show();
                        $(parent + " #selected").text(prop);
                        $(parent + " #app-timezone").val(timezones[attr].z[0][prop]);
                        $(parent + " #app-country").val(attr);
                    }
                } else {

                    var firstTz = "";

                    for (var i = 0; i < timezones[attr].z.length; i++) {
                        for (var prop in timezones[attr].z[i]) {
                            if (i == 0) {
                                $(parent + " #timezone-select").find(".text").text(prop);
                                firstTz = timezones[attr].z[0][prop];
                                $(parent + " #app-country").val(attr);
                            }

                            timezoneSelect.append("<div data-value='" + timezones[attr].z[i][prop] + "' class='item'>" + prop + "</div>")
                        }
                    }

                    $(parent + " #timezone-select").show();
                    $(parent + " #app-timezone").val(firstTz);
                    $(parent + " .select-items .item").click(function () {
                        var selectedItem = $(this).parents(".cly-select").find(".text");
                        selectedItem.html($(this).html());
                        selectedItem.data("value", $(this).data("value"));
                    });
                    $(parent + " #timezone-items .item").click(function () {
                        $(parent + " #app-timezone").val($(this).data("value"));
                    });
                }
            });
        }

        function hideEdit() {
            $("#edit-app").removeClass("active");
            $(".edit").hide();
            $(".read").show();
            $(".table-edit").hide();
            $(".required").hide();
        }

        function resetAdd() {
            $("#app-add-name").val("");
            $("#app-add-type").text(jQuery.i18n.map["management-applications.type.tip"]);
            $("#app-add-type").data("value", "");
            $("#app-add-category").text(jQuery.i18n.map["management-applications.category.tip"]);
            $("#app-add-category").data("value", "");
            $("#app-add-timezone #selected").text("");
            $("#app-add-timezone #selected").hide();
            $("#app-add-timezone .text").html(jQuery.i18n.map["management-applications.time-zone.tip"]);
            $("#app-add-timezone .text").data("value", "");
            $("#app-add-timezone #app-timezone").val("");
            $("#app-add-timezone #app-country").val("");
            $("#app-add-timezone #timezone-select").hide();
            $(".required").hide();
            if(countlyGlobal["config"] && countlyGlobal["config"].code && $("#code-countly").length){
                $("#code-countly").show();
            }
        }

        function showAdd() {
            if ($("#app-container-new").is(":visible")) {
                return false;
            }
            $(".app-container").removeClass("active");
            $("#first-app-success").hide();
            $("#code-countly").hide();
            hideEdit();
            var manageBarApp = $("#manage-new-app>div").clone();
            manageBarApp.attr("id", "app-container-new");
            manageBarApp.addClass("active");

            if (jQuery.isEmptyObject(countlyGlobal['apps'])) {
                $("#cancel-app-add").hide();
                $("#manage-new-app").hide();
            } else {
                $("#cancel-app-add").show();
            }

            $("#app-management-bar .scrollable").append(manageBarApp);
            $("#add-new-app").show();
            $("#view-app").hide();

            var userTimezone = jstz.determine().name();

            // Set timezone selection defaults to user's current timezone
            for (var countryCode in timezones) {
                for (var i = 0; i < timezones[countryCode].z.length; i++) {
                    for (var countryTimezone in timezones[countryCode].z[i]) {
                        if (timezones[countryCode].z[i][countryTimezone] == userTimezone) {
                            initCountrySelect("#app-add-timezone", countryCode, countryTimezone, userTimezone);
                            break;
                        }
                    }
                }
            }
        }

        function hideAdd() {
            $("#app-container-new").remove();
            $("#add-new-app").hide();
            resetAdd();
            $("#view-app").show();
            if(countlyGlobal["config"] && countlyGlobal["config"].code && $("#code-countly").length){
                $("#code-countly").show();
            }
        }
        
        if(countlyGlobal["config"] && countlyGlobal["config"].code && $("#code-countly").length){
            $("#code-countly").show();
            var url = (location.protocol || "http:")+"//countly.github.io/countly-code-generator/"; 
                
            $.getScript( url+"js/sdks.js", function( data, textStatus, jqxhr ) {
                var server = (location.protocol || "http:")+"//"+location.hostname;
                if(sdks && server){
                    function initCountlyCode(appId, type){
                        var app_id = $("#app-edit-id").val();
                        if(appId && appId != "" && countlyGlobal["apps"][appId]){
                            $("#code-countly .sdks").empty();
                            for(var i in sdks){
                                if(sdks[i].integration)
                                    $("#code-countly .sdks").append("<a href='http://code.count.ly/integration-"+i+".html?server="+server+"&app_key="+countlyGlobal["apps"][appId].key+"' target='_blank'>"+sdks[i].name.replace("SDK", "")+"</a>");
                            }
                        }
                    }
                    initCountlyCode($("#app-edit-id").val());
                    app.addAppManagementSwitchCallback(initCountlyCode);
                }
            });
        }
        
        initAppManagement(appId);
        initCountrySelect("#app-add-timezone");

        $("#clear-app-data").click(function () {
            if ($(this).hasClass("active")){
                $(this).removeClass("active");
                $(".options").hide();
            }
            else{
                $(this).addClass("active");
                $(".options").show();
            }
        });
        
        $("#clear-data.options li").click(function(){
            $("#clear-app-data").removeClass('active');
            $(".options").hide();
            var period = $(this).attr("id").replace("clear-", "");
            CountlyHelpers.confirm(jQuery.i18n.map["management-applications.clear-confirm"], "red", function (result) {
                if (!result) {
                    return true;
                }

                var appId = $("#app-edit-id").val();

                $.ajax({
                    type:"GET",
                    url:countlyCommon.API_PARTS.apps.w + '/reset',
                    data:{
                        args:JSON.stringify({
                            app_id:appId,
                            period:period
                        }),
                        api_key:countlyGlobal['member'].api_key
                    },
                    dataType:"jsonp",
                    success:function (result) {

                        if (!result) {
                            CountlyHelpers.alert(jQuery.i18n.map["management-applications.clear-admin"], "red");
                            return false;
                        } else {
                            $(document).trigger("/i/apps/reset", { app_id: appId, period: period });

                            if(period == "all"){
                                countlySession.reset();
                                countlyLocation.reset();
                                countlyCity.reset();
                                countlyUser.reset();
                                countlyDevice.reset();
                                countlyCarrier.reset();
                                countlyDeviceDetails.reset();
                                countlyAppVersion.reset();
                                countlyEvent.reset();
                            }
                            CountlyHelpers.alert(jQuery.i18n.map["management-applications.clear-success"], "black");
                        }
                    }
                });
            });
        });

        $("#delete-app").click(function () {
            CountlyHelpers.confirm(jQuery.i18n.map["management-applications.delete-confirm"], "red", function (result) {

                if (!result) {
                    return true;
                }

                var appId = $("#app-edit-id").val();

                $.ajax({
                    type:"GET",
                    url:countlyCommon.API_PARTS.apps.w + '/delete',
                    data:{
                        args:JSON.stringify({
                            app_id:appId
                        }),
                        api_key:countlyGlobal['member'].api_key
                    },
                    dataType:"jsonp",
                    success:function () {
                        $(document).trigger("/i/apps/delete", { app_id: appId });

                        delete countlyGlobal['apps'][appId];
                        delete countlyGlobal['admin_apps'][appId];
                        var activeApp = $(".app-container").filter(function () {
                            return $(this).data("id") && $(this).data("id") == appId;
                        });
                        
                        var changeApp = (activeApp.prev().length) ? activeApp.prev() : activeApp.next();
                        initAppManagement(changeApp.data("id"));
                        activeApp.fadeOut("slow").remove();

                        if (_.isEmpty(countlyGlobal['apps'])) {
                            $("#new-install-overlay").show();
                            $("#sidebar-app-select .logo").css("background-image", "");
                            $("#sidebar-app-select .text").text("");
                        }
                        else if(countlyCommon.ACTIVE_APP_ID == appId){
                            countlyCommon.setActiveApp(changeApp.data("id"));
                            $("#sidebar-app-select .logo").css("background-image", "url(appimages/"+changeApp.data("id")+".png)");
                            $("#sidebar-app-select .text").text(countlyGlobal['apps'][changeApp.data("id")].name);
                        }
                    },
                    error:function () {
                        CountlyHelpers.alert(jQuery.i18n.map["management-applications.delete-admin"], "red");
                    }
                });
            });
        });

        $("#edit-app").click(function () {
            if ($(".table-edit").is(":visible")) {
                hideEdit();
            } else {
                $(".edit").show();
                $("#edit-app").addClass("active");
                $(".read").hide();
                $(".table-edit").show();
            }
        });

        $("#save-app-edit").click(function () {
            if ($(this).hasClass("disabled")) {
                return false;
            }

            var appId = $("#app-edit-id").val(),
                appName = $("#app-edit-name .edit input").val(),
                app_key = $("#app-edit-key .edit input").val();

            $(".required").fadeOut().remove();
            var reqSpan = $("<span>").addClass("required").text("*");

            if (!appName) {
                $("#app-edit-name .edit input").after(reqSpan.clone());
            }
            
            if (!app_key) {
                $("#app-edit-key .edit input").after(reqSpan.clone());
            }

            if ($(".required").length) {
                $(".required").fadeIn();
                return false;
            }

            var ext = $('#add-edit-image-form').find("#app_image").val().split('.').pop().toLowerCase();
            if (ext && $.inArray(ext, ['gif', 'png', 'jpg', 'jpeg']) == -1) {
                CountlyHelpers.alert(jQuery.i18n.map["management-applications.icon-error"], "red");
                return false;
            }

            $(this).addClass("disabled");

            var args = {
                app_id:appId,
                name:appName,
                type:$("#app-edit-type .cly-select .text").data("value") + '',
                category:$("#app-edit-category .cly-select .text").data("value") + '',
                key:app_key,
                timezone:$("#app-edit-timezone #app-timezone").val(),
                country:$("#app-edit-timezone #app-country").val(),
                checksum_salt:$("#app-edit-salt .edit input").val()
            };

            app.appObjectModificators.forEach(function(mode){
                mode(args);
            });

            $.ajax({
                type:"GET",
                url:countlyCommon.API_PARTS.apps.w + '/update',
                data:{
                    args:JSON.stringify(args),
                    api_key:countlyGlobal['member'].api_key
                },
                dataType:"jsonp",
                success:function (data) {
                    for (var modAttr in data) {
                        countlyGlobal['apps'][appId][modAttr] = data[modAttr];
                        countlyGlobal['admin_apps'][appId][modAttr] = data[modAttr];
                    }

                    if (!ext) {
                        $("#save-app-edit").removeClass("disabled");
                        initAppManagement(appId);
                        hideEdit();
                        $(".app-container").filter(function () {
                            return $(this).data("id") && $(this).data("id") == appId;
                        }).find(".name").text(appName);

                        var sidebarLogo = $("#sidebar-app-select .logo").attr("style");
                        if (sidebarLogo.indexOf(appId) !== -1) {
                            $("#sidebar-app-select .text").text(appName);
                        }
                        return true;
                    }

                    $('#add-edit-image-form').find("#app_image_id").val(appId);
                    $('#add-edit-image-form').ajaxSubmit({
                        resetForm:true,
                        beforeSubmit:function (formData, jqForm, options) {
                            formData.push({ name:'_csrf', value:countlyGlobal['csrf_token'] });
                        },
                        success:function (file) {
                            $("#save-app-edit").removeClass("disabled");
                            var updatedApp = $(".app-container").filter(function () {
                                return $(this).data("id") && $(this).data("id") == appId;
                            });

                            if (!file) {
                                CountlyHelpers.alert(jQuery.i18n.map["management-applications.icon-error"], "red");
                            } else {
                                updatedApp.find(".logo").css({
                                    "background-image":"url(" + file + "?v" + (new Date().getTime()) + ")"
                                });
                                $("#sidebar-app-select .logo").css("background-image", $("#sidebar-app-select .logo").css("background-image").replace(")","") + "?v" + (new Date().getTime()) + ")");
                            }

                            initAppManagement(appId);
                            hideEdit();
                            updatedApp.find(".name").text(appName);
                            $("#app-edit-image").find(".logo").css({
                                "background-image":"url(" + file + "?v" + (new Date().getTime()) + ")"
                            });
                        },
                        error: function(xhr, status, error){
                            CountlyHelpers.alert(error, "red");
                            initAppManagement(appId);
                            hideEdit();
                        }
                    });
                }
            });
        });

        $("#cancel-app-edit").click(function () {
            hideEdit();
            var appId = $("#app-edit-id").val();
            initAppManagement(appId);
        });

        $("#management-app-container .app-container:not(#app-container-new)").live("click", function () {
            var appId = $(this).data("id");
            hideEdit();
            $(".app-container").removeClass("active");
            $(this).addClass("active");
            initAppManagement(appId);
        });

        $("#add-app-button").click(function () {
            showAdd();
        });

        $("#cancel-app-add").click(function () {
            $("#app-container-new").remove();
            $("#add-new-app").hide();
            $("#view-app").show();
            $(".new-app-name").text(jQuery.i18n.map["management-applications.my-new-app"]);
            resetAdd();
        });

        $("#app-add-name").keyup(function () {
            var newAppName = $(this).val();
            $("#app-container-new .name").text(newAppName);
            $(".new-app-name").text(newAppName);
        });

        $("#save-app-add").click(function () {

            if ($(this).hasClass("disabled")) {
                return false;
            }

            var appName = $("#app-add-name").val(),
                type = $("#app-add-type").data("value") + "",
                category = $("#app-add-category").data("value") + "",
                timezone = $("#app-add-timezone #app-timezone").val(),
                country = $("#app-add-timezone #app-country").val();

            $(".required").fadeOut().remove();
            var reqSpan = $("<span>").addClass("required").text("*");

            if (!appName) {
                $("#app-add-name").after(reqSpan.clone());
            }
            
            if (!type) {
                $("#app-add-type").parents(".cly-select").after(reqSpan.clone());
            }

            /*if (!category) {
                $("#app-add-category").parents(".cly-select").after(reqSpan.clone());
            }*/

            if (!timezone) {
                $("#app-add-timezone #app-timezone").after(reqSpan.clone());
            }

            if ($(".required").length) {
                $(".required").fadeIn();
                return false;
            }

            var ext = $('#add-app-image-form').find("#app_image").val().split('.').pop().toLowerCase();
            if (ext && $.inArray(ext, ['gif', 'png', 'jpg', 'jpeg']) == -1) {
                CountlyHelpers.alert(jQuery.i18n.map["management-applications.icon-error"], "red");
                return false;
            }

            $(this).addClass("disabled");

            var args = {
                name:appName,
                type:type,
                category:category,
                timezone:timezone,
                country:country
            };

            app.appObjectModificators.forEach(function(mode){
                mode(args);
            });

            $.ajax({
                type:"GET",
                url:countlyCommon.API_PARTS.apps.w + '/create',
                data:{
                    args:JSON.stringify(args),
                    api_key:countlyGlobal['member'].api_key
                },
                dataType:"jsonp",
                success:function (data) {

                    var sidebarApp = $("#sidebar-new-app>div").clone();

                    countlyGlobal['apps'][data._id] = data;
                    countlyGlobal['admin_apps'][data._id] = data;

                    var newApp = $("#app-container-new");
                    newApp.data("id", data._id);
                    newApp.data("key", data.key);
                    newApp.find(".name").data("localize", "");
                    newApp.find(".name").text(data.name);
                    newApp.removeAttr("id");

                    if (!ext) {
                        $("#save-app-add").removeClass("disabled");
                        sidebarApp.find(".name").text(data.name);
                        sidebarApp.data("id", data._id);
                        sidebarApp.data("key", data.key);
                        newApp.find(".logo").css({
                            "background-image":"url(appimages/" + data._id + ".png)"
                        });

                        $("#app-nav .apps-scrollable").append(sidebarApp);
                        initAppManagement(data._id);
                        return true;
                    }

                    $('#add-app-image-form').find("#app_image_id").val(data._id);
                    $('#add-app-image-form').ajaxSubmit({
                        resetForm:true,
                        beforeSubmit:function (formData, jqForm, options) {
                            formData.push({ name:'_csrf', value:countlyGlobal['csrf_token'] });
                        },
                        success:function (file) {
                            $("#save-app-add").removeClass("disabled");

                            if (!file) {
                                CountlyHelpers.alert(jQuery.i18n.map["management-applications.icon-error"], "red");
                            } else {
                                newApp.find(".logo").css({
                                    "background-image":"url(" + file + ")"
                                });
                                sidebarApp.find(".logo").css({
                                    "background-image":"url(" + file + ")"
                                });
                            }

                            sidebarApp.find(".name").text(data.name);
                            sidebarApp.data("id", data._id);
                            sidebarApp.data("key", data.key);

                            $("#app-nav .apps-scrollable").append(sidebarApp);
                            initAppManagement(data._id);
                        }
                    });
                }
            });
        });
        
    }
});

window.ManageUsersView = countlyView.extend({
    template:null,
    initialize:function () {
        var self = this;
        T.render('templates/users', function (t) {
            self.template = t;
        });
    },
    beforeRender: function() {
		if(this.template)
			return true;
		else{
			var self = this;
			return $.when($.get(countlyGlobal["path"]+'/templates/users.html', function(src){
				self.template = Handlebars.compile(src);
			})).then(function () {});
		}
    },
    renderCommon:function (isRefresh) {
        var self = this;
        $.ajax({
            url:countlyCommon.API_PARTS.users.r + '/all',
            data:{
                api_key:countlyGlobal['member'].api_key
            },
            dataType:"jsonp",
            success:function (users) {
                $('#content').html(self.template({
                    "page-title":jQuery.i18n.map["sidebar.management.users"],
                    users:users,
                    apps:countlyGlobal['apps'],
                    is_global_admin: (countlyGlobal["member"].global_admin) ? true : false
                }));
                var tableData = [];
                for(var i in users){
                    tableData.push(users[i])
                }
                self.dtable = $('#user-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                    "aaData": tableData,
                    "fnRowCallback": function( nRow, aData, iDisplayIndex, iDisplayIndexFull ) {
                        $(nRow).attr("id", aData._id);
                    },
                    "aoColumns": [
                        { "mData": function(row, type){return row.full_name;}, "sType":"string", "sExport":"userinfo", "sTitle": jQuery.i18n.map["management-users.full-name"]},
                        { "mData": function(row, type){return row.username;}, "sType":"string", "sTitle": jQuery.i18n.map["management-users.username"]},
                        { "mData": function(row, type){if(row.global_admin) return jQuery.i18n.map["management-users.global-admin"]; else if(row.admin_of && row.admin_of.length) return jQuery.i18n.map["management-users.admin"]; else if(row.user_of && row.user_of.length)  return jQuery.i18n.map["management-users.user"]; else return jQuery.i18n.map["management-users.no-role"]}, "sType":"string", "sTitle": jQuery.i18n.map["management-users.no-role"]},
                        { "mData": function(row, type){return row.email;}, "sType":"string", "sTitle": jQuery.i18n.map["management-users.email"]},
                        { "mData": function(row, type){if(type == "display") return (row["created_at"]) ? countlyCommon.formatTimeAgo(row["created_at"]) : ""; else return (row["created_at"]) ? row["created_at"] : 0;}, "sType":"format-ago", "sTitle": jQuery.i18n.map["management-users.created"]},
                        { "mData": function(row, type){if(type == "display") return (row["last_login"]) ? countlyCommon.formatTimeAgo(row["last_login"]) : jQuery.i18n.map["common.never"]; else return (row["last_login"]) ? row["last_login"] : 0;}, "sType":"format-ago", "sTitle": jQuery.i18n.map["management-users.last_login"]}
                    ]
                }));
                self.dtable.fnSort( [ [0,'asc'] ] );
                self.dtable.stickyTableHeaders();
                CountlyHelpers.expandRows(self.dtable, self.editUser, self);
                app.addDataExport("userinfo", function(){
                    var ret = [];
                    var elem;
                    for(var i = 0; i < tableData.length; i++){
                        elem = {};
                        elem[jQuery.i18n.map["management-users.full-name"]] = tableData[i].full_name;
                        elem[jQuery.i18n.map["management-users.username"]] = tableData[i].username;
                        elem[jQuery.i18n.map["management-users.email"]] = tableData[i].email;
                        elem[jQuery.i18n.map["management-users.global-admin"]] = tableData[i].global_admin;
                        elem[jQuery.i18n.map["management-users.lock-account"]] = tableData[i].locked;
                        
                        if(tableData[i].created_at == 0)
                            elem[jQuery.i18n.map["management-users.created"]] = jQuery.i18n.map["common.unknown"];
                        else
                            elem[jQuery.i18n.map["management-users.created"]] = moment(parseInt(tableData[i].created_at)*1000).format("ddd, D MMM YYYY HH:mm:ss");
                        
                        if(tableData[i].last_login == 0)
                            elem[jQuery.i18n.map["management-users.last_login"]] = jQuery.i18n.map["common.unknown"];
                        else
                            elem[jQuery.i18n.map["management-users.last_login"]] = moment(parseInt(tableData[i].last_login)*1000).format("ddd, D MMM YYYY HH:mm:ss");

                        if(tableData[i].admin_of && tableData[i].admin_of.length)
                            elem[jQuery.i18n.map["management-users.admin-of"]] = CountlyHelpers.appIdsToNames(tableData[i].admin_of);
                        else
                            elem[jQuery.i18n.map["management-users.admin-of"]] = "";
                        
                        if(tableData[i].user_of && tableData[i].user_of.length)
                            elem[jQuery.i18n.map["management-users.user-of"]] = CountlyHelpers.appIdsToNames(tableData[i].user_of);
                        else
                            elem[jQuery.i18n.map["management-users.user-of"]] = "";
                        
                        if(typeof pathsToSectionNames !== "undefined"){
                            if(tableData[i].restrict && tableData[i].restrict.length)
                                elem[jQuery.i18n.map["restrict.restricted-sections"]] = pathsToSectionNames(tableData[i].restrict);
                            else
                                elem[jQuery.i18n.map["restrict.restricted-sections"]] = "";
                        }
                        
                        ret.push(elem);
                    }
                    return ret;
                });
                
                self.initTable();
                $("#add-user-mgmt").on("click", function(){
                    CountlyHelpers.closeRows(self.dtable);
                    $("#listof-apps").hide();
                    $(".row").removeClass("selected");
                    if ($(".create-user-row").is(":visible")) { 
                         $(".create-user-row").slideUp();
                    }
                    else{
                        $(".create-user-row").slideDown();
                        self.initTable();
                    }
                });
                $("#listof-apps .app").on('click', function() {
                    if ($(this).hasClass("disabled")) {
                        return true;
                    }
                    
                    $(this).toggleClass("selected");

                    self.setSelectDeselect();
                    
                    adminsOf = [];
                    var adminOfIds = [];
                    $("#listof-apps .app.selected").each(function() {
                        adminsOf[adminsOf.length] = $(this).find(".name").text();
                        adminOfIds[adminOfIds.length] = $(this).find(".app_id").val();
                    });
                    
                    activeRow = $(".row.selected");
                    
                    if ($("#listof-apps .app.selected").length == 0) {
                        activeRow.find(".no-apps").show();
                    } else {
                        activeRow.find(".no-apps").hide();
                    }
                    
                    activeRow.find(".user-admin-list").text(adminsOf.join(", "));
                    activeRow.find(".app-list").val(adminOfIds.join(","));
                    
                    var userAppRow = activeRow.next(".user-apps");
                    
                    if (userAppRow.length) {
                        var userAppIds = userAppRow.find(".app-list").val(),
                            usersOfIds = (userAppIds)? userAppIds.split(",") : [];
                    
                        for (var i = 0; i < adminOfIds.length; i++) {
                            if (usersOfIds.indexOf(adminOfIds[i]) == -1) {
                                if (usersOfIds.length == 0 && i == 0) {
                                    userAppRow.find(".user-admin-list").text(adminsOf[i]);
                                    userAppRow.find(".app-list").val(adminOfIds[i]);
                                } else {
                                    userAppRow.find(".user-admin-list").text(userAppRow.find(".user-admin-list").text().trim() + ", " + adminsOf[i]);
                                    userAppRow.find(".app-list").val(userAppRow.find(".app-list").val() + "," + adminOfIds[i]);
                                }
                                
                                userAppRow.find(".no-apps").hide();
                            }
                        }
                    }
                });
                $(".cancel-user-row").on("click", function() {
                    $("#listof-apps").hide();
                    $(".row").removeClass("selected");
                    $(".create-user-row").slideUp();
                });
                $(".create-user").on("click", function() {		
                    $("#listof-apps").hide();
                    $(".row").removeClass("selected");
                    $(".email-check.green-text").remove();
                    $(".username-check.green-text").remove();
                    
                    var data = {},
                        currUserDetails = $(".user-details:visible");
                    
                    data.full_name = currUserDetails.find(".full-name-text").val();
                    data.username = currUserDetails.find(".username-text").val();
                    data.email = currUserDetails.find(".email-text").val();
                    data.global_admin = currUserDetails.find(".global-admin").hasClass("checked");
                    data.password = currUserDetails.find(".password-text").val();
                    
                    $(".required").fadeOut().remove();
                    var reqSpan = $("<span>").addClass("required").text("*");
                    
                    if (!data.password.length) {
                        currUserDetails.find(".password-text").after(reqSpan.clone());
                    } else {
                        $(".password-check").remove();
                        var error = CountlyHelpers.validatePassword(data.password);
                        if(error){
                            var invalidSpan = $("<span class='password-check red-text'>").html(error);
                            currUserDetails.find(".password-text").after(invalidSpan.clone());
                        }
                    }
                    
                    if (!data.full_name.length) {
                        currUserDetails.find(".full-name-text").after(reqSpan.clone());
                    }
                    
                    if (!data.username.length) {
                        currUserDetails.find(".username-text").after(reqSpan.clone());
                    }
                    
                    if (!data.email.length) {
                        currUserDetails.find(".email-text").after(reqSpan.clone());
                    } else if (!CountlyHelpers.validateEmail(data.email)) {
                        $(".email-check").remove();
                        var invalidSpan = $("<span class='email-check red-text'>").html(jQuery.i18n.map["management-users.email.invalid"]);
                        currUserDetails.find(".email-text").after(invalidSpan.clone());
                    }
                    
                    if ($(".required").length) {
                        $(".required").fadeIn();
                        return false;
                    } else if ($(".red-text").length) {
                        return false;
                    }
                    
                    if (!data.global_admin) {
                        data.admin_of = currUserDetails.find(".admin-apps .app-list").val().split(",");
                        data.user_of = currUserDetails.find(".user-apps .app-list").val().split(",");
                    }
                    $.ajax({
                        type: "GET",
                        url: countlyCommon.API_PARTS.users.w + '/create',
                        data: {
                            args: JSON.stringify(data),
                            api_key: countlyGlobal['member'].api_key
                        },
                        dataType: "jsonp",
                        success: function() {
                            app.activeView.render();
                        }
                    });
                });
                $('.scrollable').slimScroll({
                    height: '100%',
                    start: 'top',
                    wheelStep: 10,
                    position: 'right'
                });
                $("#select-all").on('click', function() {
                    $("#listof-apps .app:not(.disabled)").addClass("selected");
                    adminsOf = [];
                    var adminOfIds = [];
                    
                    $("#listof-apps .app.selected").each(function() {
                        adminsOf[adminsOf.length] = $(this).find(".name").text();
                        adminOfIds[adminOfIds.length] = $(this).find(".app_id").val();
                    });
        
                    activeRow = $(".row.selected");
                    
                    activeRow.find(".user-admin-list").text(adminsOf.join(", "));
                    activeRow.find(".app-list").val(adminOfIds.join(","));
                    activeRow.find(".no-apps").hide();
		
                    var userAppRow = activeRow.next(".user-apps");
                    
                    if (userAppRow.length) {
                        userAppRow.find(".user-admin-list").text(adminsOf.join(", "));
                        userAppRow.find(".app-list").val(adminOfIds.join(","));
                        userAppRow.find(".no-apps").hide();
                    }
                    
                    $(this).hide();
                    $("#deselect-all").show();
                });
                
                $("#deselect-all").on('click', function() {
                    $("#listof-apps").find(".app:not(.disabled)").removeClass("selected");
                    
                    adminsOf = [];
                    var adminOfIds = [];
                    
                    $("#listof-apps .app.selected").each(function() {
                        adminsOf[adminsOf.length] = $(this).find(".name").text();
                        adminOfIds[adminOfIds.length] = $(this).find(".app_id").val();
                    });
                    
                    activeRow = $(".row.selected");
                    
                    activeRow.find(".user-admin-list").text(adminsOf.join(", "));
                    activeRow.find(".app-list").val(adminOfIds.join(","));
                    
                    if ($("#listof-apps .app.selected").length == 0) {
                        activeRow.find(".no-apps").show();
                    } else {
                        activeRow.find(".no-apps").hide();
                    }
                    
                    $(this).hide();
                    $("#select-all").show();
                });
                
                $("#done").on('click', function() {
                    $("#listof-apps").hide();
                    $(".row").removeClass("selected");
                });	
            }
        });
    },
    setSelectDeselect: function() {
        var searchInput = $("#listof-apps").find(".search input").val();

        if (searchInput == "") {
            if ($("#listof-apps .app:not(.disabled)").length == 0) {
                $("#select-all").hide();
                $("#deselect-all").hide();
            } else if ($("#listof-apps .app.selected").length == $("#listof-apps .app").length) {
                $("#select-all").hide();
                $("#deselect-all").show();
            } else {
                $("#select-all").show();
                $("#deselect-all").hide();
            }
        } else {
            $("#select-all").hide();
            $("#deselect-all").hide();
        }
    },
    initTable: function(userData){
        userData = userData || {};
        var self = this;
        var adminsOf = [],
		activeRow,
		userDetailsClone,
		previousUserDetails,
		lastUserSaved = false,
		previousSelectAppPos = {},
		currUsername = userData.username || "",
		currEmail = userData.email || "";
        // translate help module
        $("[data-help-localize]").each(function() {
            var elem = $(this);
            if (elem.data("help-localize") != undefined) {
                elem.data("help", jQuery.i18n.map[elem.data("help-localize")]);
            }
        });
        
        // translate dashboard
        $("[data-localize]").each(function() {
            var elem = $(this);
            elem.text(jQuery.i18n.map[elem.data("localize")]);				
        });
        
        if ($("#help-toggle").hasClass("active")) {
            $('.help-zone-vb').tipsy({gravity: $.fn.tipsy.autoNS, trigger: 'manual', title: function(){ return ($(this).data("help"))? $(this).data("help") : ""; }, fade: true, offset: 5, cssClass: 'yellow', opacity: 1, html: true});
            $('.help-zone-vs').tipsy({gravity: $.fn.tipsy.autoNS, trigger: 'manual', title: function(){ return ($(this).data("help"))? $(this).data("help") : ""; }, fade: true, offset: 5, cssClass: 'yellow narrow', opacity: 1, html: true});
            
            $.idleTimer('destroy');
            clearInterval(self.refreshActiveView);
            $(".help-zone-vs, .help-zone-vb").hover(
                function () {
                    $(this).tipsy("show");
                }, 
                function () {
                    $(this).tipsy("hide");
                }
            );
        }
        
        function closeActiveEdit() {
            CountlyHelpers.closeRows(self.dtable);
            $("#listof-apps").hide();
            $(".row").removeClass("selected");
        }
        
        $(".select-apps").off("click").on('click', function() {
            $("#listof-apps .app").removeClass("selected");
            activeRow = $(this).parent(".row");
            activeRow.addClass("selected");
            var buttonPos = $(this).offset();
            buttonPos.top = Math.floor(buttonPos.top) + 25;
            buttonPos.left = Math.floor(buttonPos.left) - 18;
            
            if ($("#listof-apps").is(":visible") && JSON.stringify(buttonPos) === JSON.stringify(previousSelectAppPos)) {
                $("#listof-apps").hide();
                $(".row").removeClass("selected");
                return true;
            }
            
            previousSelectAppPos = buttonPos;
            
            var appList = activeRow.find(".app-list").val().split(","),
                adminAppList = $(".admin-apps:visible .app-list").val().split(","),
                isAdminApps = activeRow.hasClass("admin-apps");
            
            $("#listof-apps").find(".app_id").each(function() {
                if (appList.indexOf($(this).val()) != -1) {
                    $(this).parent().addClass("selected");
                }
                
                if (!isAdminApps && adminAppList.indexOf($(this).val()) != -1) {
                    $(this).parent().addClass("disabled");
                } else {
                    $(this).parent().removeClass("disabled");
                }
            });

            self.setSelectDeselect();
            
            $("#listof-apps").show().offset(buttonPos);
            $("#listof-apps").find(".search input").focus();
        });

        $("#listof-apps").find(".search").on('input', 'input', function(e,v) {
            self.setSelectDeselect();
        });

        $(".save-user").off("click").on("click", function() {
            $("#listof-apps").hide();
            $(".row").removeClass("selected");
            $(".email-check.green-text").remove();
            $(".username-check.green-text").remove();
            
            lastUserSaved = true;
            
            var data = {},
                currUserDetails = $(".user-details:visible"),
                changedPassword = false;
            
            data.user_id = $(this).parent(".button-container").find(".user_id").val();
            data.full_name = currUserDetails.find(".full-name-text").val();
            data.username = currUserDetails.find(".username-text").val();
            data.email = currUserDetails.find(".email-text").val();
            
            $(".required").fadeOut().remove();
            var reqSpan = $("<span>").addClass("required").text("*");
            
            if (!data.full_name.length) {
                currUserDetails.find(".full-name-text").after(reqSpan.clone());
            }
            
            if (!data.username.length) {
                currUserDetails.find(".username-text").after(reqSpan.clone());
            }
            
            if (!data.email.length) {
                currUserDetails.find(".email-text").after(reqSpan.clone());
            }
            
            if ($(".required").length) {
                $(".required").fadeIn();
                return false;
            } else if ($(".red-text").length) {
                return false;
            }
            
            if (currUserDetails.find(".delete-user").length != 0) {
                data.global_admin = currUserDetails.find(".global-admin").hasClass("checked");
                data.locked = currUserDetails.find(".lock-account").hasClass("checked");
                
                if (!data.global_admin) {
                    data.admin_of = currUserDetails.find(".admin-apps .app-list").val().split(",");
                    data.user_of = currUserDetails.find(".user-apps .app-list").val().split(",");
                }
            }
            
            if (currUserDetails.find(".password-row").is(":visible") && currUserDetails.find(".password-text").val().length) {
                data.password = currUserDetails.find(".password-text").val();
                changedPassword = true;
            }
            
            if (changedPassword) {
                CountlyHelpers.confirm(jQuery.i18n.prop('management-users.password-change-confirm', data.full_name), "black", function(result) {
                    if (result) {
                        data.send_notification = true;
                    }
                    
                    saveUser();
                }, [jQuery.i18n.map["common.no"], jQuery.i18n.map["common.yes"]]);
            } else {
                saveUser();
            }
            
            function saveUser() {
                $.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.users.w + '/update',
                    data: {
                        args: JSON.stringify(data),
                        api_key: countlyGlobal['member'].api_key
                    },
                    dataType: "jsonp",
                    success: function(result) {
                        if (currUserDetails.find(".delete-user").length == 0) {
                            $("#menu-username").text(data.username);
                        }
                        app.activeView.render();
                    }
                });
            }
        });
        
        $(".username-text").off("keyup").on("keyup",_.throttle(function() {
            if (!($(this).val().length) || currUsername == $(this).val()) {
                $(".username-check").remove();
                return false;
            }
        
            $(this).next(".required").remove();
        
            var existSpan = $("<span class='username-check red-text'>").html(jQuery.i18n.map["management-users.username.exists"]),
                notExistSpan = $("<span class='username-check green-text'>").html("&#10004;"),
                data = {};
            
            data.username = $(this).val();
            data._csrf = countlyGlobal['csrf_token'];
        
            var self = $(this);
            $.ajax({
                type: "POST",
                url: countlyGlobal["path"]+"/users/check/username",
                data: data,
                success: function(result) {
                    $(".username-check").remove();
                    if (result) {
                        self.after(notExistSpan.clone());
                    } else {
                        self.after(existSpan.clone());
                    }
                }
            });
        }, 300));
        
        $(".email-text").off("keyup").on("keyup",_.throttle(function() {
            if (!($(this).val().length) || currEmail == $(this).val()) {
                $(".email-check").remove();
                return false;
            }
            
            $(this).next(".required").remove();
            
            if (!CountlyHelpers.validateEmail($(this).val())) {
                $(".email-check").remove();
                var invalidSpan = $("<span class='email-check red-text'>").html(jQuery.i18n.map["management-users.email.invalid"]);
                $(this).after(invalidSpan.clone());
                return false;
            }
            
            var existSpan = $("<span class='email-check red-text'>").html(jQuery.i18n.map["management-users.email.exists"]),
                notExistSpan = $("<span class='email-check green-text'>").html("&#10004;"),
                data = {};
            
            data.email = $(this).val();
            data._csrf = countlyGlobal['csrf_token'];
            
            var self = $(this);
            $.ajax({
                type: "POST",
                url: countlyGlobal["path"]+"/users/check/email",
                data: data,
                success: function(result) {
                    $(".email-check").remove();
                    if (result) {
                        self.after(notExistSpan.clone());
                    } else {
                        self.after(existSpan.clone());
                    }
                }
            });
        }, 300));
        
        $(".password-text").off("keyup").on("keyup",_.throttle(function() {
            $(".password-check").remove();
            var error = CountlyHelpers.validatePassword($(this).val());
            if (error) {
                var invalidSpan = $("<span class='password-check red-text'>").html(error);
                $(this).after(invalidSpan.clone());
                return false;
            }
        }, 300));
        
        $(".cancel-user").off("click").on("click", function() {
            closeActiveEdit();
        });
        $(".delete-user").off("click").on("click", function() {
            var currUserDetails = $(".user-details:visible");
            var fullName = currUserDetails.find(".full-name-text").val();
        
            var self = $(this);
            CountlyHelpers.confirm(jQuery.i18n.prop('management-users.delete-confirm', fullName), "red", function(result) {
                
                if (!result) {
                    return false;
                }
            
                var data = {
                    user_ids: [self.parent(".button-container").find(".user_id").val()]
                };
                $.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.users.w + '/delete',
                    data: {
                        args: JSON.stringify(data),
                        api_key: countlyGlobal['member'].api_key
                    },
                    dataType: "jsonp",
                    success: function(result) {
                        app.activeView.render();
                    }
                });
            });
        });
        $(".global-admin").off("click").on('click', function() {
            var currUserDetails = $(".user-details:visible");
            
            currUserDetails.find(".user-apps").toggle();
            currUserDetails.find(".admin-apps").toggle();	
            $(this).toggleClass("checked");
            $("#listof-apps").hide();
            $(".row").removeClass("selected");
        });
        $(".lock-account").off("click").on('click', function() {
            var currUserDetails = $(".user-details:visible");	
            $(this).toggleClass("checked");
            $("#listof-apps").hide();
            $(".row").removeClass("selected");
        });
        $(".generate-password").off("click").on('click', function() {
            $(this).parent().find(".password-text").val(CountlyHelpers.generatePassword(countlyGlobal["security"].password_min));
        });
        
        $(".change-password").off("click").on('click', function() {
            $(this).parents(".row").next().toggle();
        });
    },
    editUser: function( d, self ) {
        $(".create-user-row").slideUp();
        $("#listof-apps").hide();
        $(".row").removeClass("selected");
        CountlyHelpers.closeRows(self.dtable);
		// `d` is the original data object for the row
		var str = '';
		if (d) {
			str += '<div class="user-details datatablesubrow">';

            if (countlyGlobal["member"].global_admin) {
				str += '<div class="row help-zone-vs" data-help-localize="help.manage-users.full-name">';
                    str += '<div class="title" data-localize="management-users.full-name">'+jQuery.i18n.map["management-users.full-name"]+'</div>';
                    str += '<div class="detail"><input class="full-name-text" type="text" value="'+d.full_name+'"/></div>';
                str += '</div>';
				str += '<div class="row help-zone-vs" data-help-localize="help.manage-users.username">';
					str += '<div class="title" data-localize="management-users.username">'+jQuery.i18n.map["management-users.username"]+'</div>';
					str += '<div class="detail">';
					str += '<input class="username-text" type="text" value="'+d.username+'"/><br/>';
						str += '<div class="small-link change-password" data-localize="management-users.change-password">'+jQuery.i18n.map["management-users.change-password"]+'</div>';
					str += '</div>';
				str += '</div>';
				str += '<div class="row password-row">';
					str += '<div class="title" data-localize="management-users.password">'+jQuery.i18n.map["management-users.password"]+'</div>';
					str += '<div class="detail">';
						str += '<input class="password-text" type="text" value=""/><br/>';
						str += '<div class="small-link generate-password" data-localize="management-users.generate-password">'+jQuery.i18n.map["management-users.generate-password"]+'</div>';
					str += '</div>';
				str += '</div>';
				str += '<div class="row help-zone-vs" data-help-localize="help.manage-users.email">';
					str += '<div class="title" data-localize="management-users.email">'+jQuery.i18n.map["management-users.email"]+'</div>';
					str += '<div class="detail"><input class="email-text" type="text" value="'+d.email+'"/></div>';
				str += '</div>';
            }

			if (!d.is_current_user) {
                if (countlyGlobal["member"].global_admin) {
					str += '<div class="row help-zone-vs" data-help-localize="help.manage-users.global-admin">';
                    str += '<div class="title" data-localize="management-users.global-admin">'+jQuery.i18n.map["management-users.global-admin"]+'</div>';
                    str += '<div class="detail">';
                    str += '<div class="option">';

                    if (d.global_admin) {
                        str += '<div class="global-admin checkbox checked"></div>';
                    } else {
                        str += '<div class="global-admin checkbox"></div>';
                    }

                    str += '<div class="text"></div>';
                    str += '</div>';
                    str += '</div>';
					str += '</div>';

                    if (!d.global_admin) {
                        str += '<div class="row help-zone-vs" data-help-localize="help.manage-users.lock-account">';
                        str += '<div class="title" data-localize="management-users.lock-account">'+jQuery.i18n.map["management-users.lock-account"]+'</div>';
                        str += '<div class="detail">';
                        str += '<div class="option">';

                        if (d.locked) {
                            str += '<div class="lock-account checkbox checked"></div>';
                        } else {
                            str += '<div class="lock-account checkbox"></div>';
                        }

                        str += '<div class="text"></div>';
                        str += '</div>';
                        str += '</div>';
                        str += '</div>';
                    }
                }

                if (d.global_admin) {
					str += '<div class="row admin-apps help-zone-vs" data-help-localize="help.manage-users.admin-of" style="display:none;">';
                } else {
					str += '<div class="row admin-apps help-zone-vs" data-help-localize="help.manage-users.admin-of">';
                }

                str += '<div class="title" data-localize="management-users.admin-of">'+jQuery.i18n.map["management-users.admin-of"]+'</div>';
                str += '<div class="select-apps">';
                str += '<i class="fa fa-plus-circle"></i>';
                str += '<input type="hidden" value="'+d.admin_of+'" class="app-list"/>';
                str += '</div>';
                str += '<div class="detail user-admin-list">';

				if (d.admin_of && d.admin_of.length) {
                    str += CountlyHelpers.appIdsToNames(d.admin_of);
				} else {
                    str += '<span data-localize="management-users.admin-of.tip">'+jQuery.i18n.map["management-users.admin-of.tip"]+'</span>';
				}

                str += '</div>';
                str += '<div class="no-apps" data-localize="management-users.admin-of.tip">'+jQuery.i18n.map["management-users.admin-of.tip"]+'</div>';
				str += '</div>';

                if(d.global_admin) {
                    str += '<div class="row user-apps help-zone-vs" data-help-localize="help.manage-users.user-of" style="display:none;">';
                } else {
                    str += '<div class="row user-apps help-zone-vs" data-help-localize="help.manage-users.user-of">';
                }

                str += '<div class="title" data-localize="management-users.user-of">'+jQuery.i18n.map["management-users.user-of"]+'</div>';
                str += '<div class="select-apps">';
                str += '<i class="fa fa-plus-circle"></i>';
                str += '<input type="hidden" value="'+d.user_of+'" class="app-list"/>';
                str += '</div>';
                str += '<div class="detail user-admin-list">';

				if (d.user_of && d.user_of.length) {
                    str += CountlyHelpers.appIdsToNames(d.user_of);
				} else {
                    str += '<span data-localize="management-users.user-of.tip">'+jQuery.i18n.map["management-users.user-of.tip"]+'</span>';
				}

                str += '</div>';
                str += '<div class="no-apps" data-localize="management-users.user-of.tip">'+jQuery.i18n.map["management-users.user-of.tip"]+'</div>';
                str += '</div>';
			}

            str += '<div class="button-container">';
            str += '<input class="user_id" type="hidden" value="'+d._id+'"/>';
            str += '<a class="icon-button light save-user" data-localize="common.save">'+jQuery.i18n.map["common.save"]+'</a>';
            str += '<a class="icon-button light cancel-user" data-localize="common.cancel">'+jQuery.i18n.map["common.cancel"]+'</a>';

            if (!d.is_current_user) {
                str += '<a class="icon-button red delete-user" data-localize="management-users.delete-user">'+jQuery.i18n.map["management-users.delete-user"]+'</a>';
            }

            str += '</div>';
			str += '</div>';
		}

        setTimeout(function(){self.initTable(d);}, 1);
		return str;
	}
});

window.EventsView = countlyView.extend({
    showOnGraph: {"event-count":true, "event-sum":true, "event-dur":true},
    beforeRender: function() {},
    initialize:function () {
        this.template = Handlebars.compile($("#template-events").html());
    },
    pageScript:function () {
        $(".event-container").unbind("click");
        $(".segmentation-option").unbind("click");
        $(".big-numbers").unbind("click");

        var self = this;

        $(".event-container").on("click", function () {
            var tmpCurrEvent = $(this).data("key");
            for(var i in self.showOnGraph){
                self.showOnGraph[i] = true;
            }
            $(".event-container").removeClass("active");
            $(this).addClass("active");

            countlyEvent.setActiveEvent(tmpCurrEvent, function() { self.refresh(true); });
        });
		
		$("#event-nav .event-container").mouseenter(function(){
			var elem = $(this);
			var name = elem.find(".name");
			if(name[0].scrollWidth > name.innerWidth()){
                elem.attr("title", name.text());
			}
		});

        $(".segmentation-option").on("click", function () {
            var tmpCurrSegmentation = $(this).data("value");
            countlyEvent.setActiveSegmentation(tmpCurrSegmentation, function() {
                self.renderCommon(true);
                newPage = $("<div>" + self.template(self.templateData) + "</div>");

                $(self.el).find("#event-nav .scrollable").html(function () {
                    return newPage.find("#event-nav .scrollable").html();
                });

                $(self.el).find(".widget-footer").html(newPage.find(".widget-footer").html());
                $(self.el).find("#edit-event-container").replaceWith(newPage.find("#edit-event-container"));

                var eventData = countlyEvent.getEventData();
                self.drawGraph(eventData);
                self.pageScript();

                self.drawTable(eventData);

                app.localize();
            });
        });

        $(".big-numbers").on("click", function () {
            if ($(".big-numbers.selected").length == 1) {
                if ($(this).hasClass("selected")) {
                    return true;
                } else {
                    self.showOnGraph[$(this).data("type")] = true;
                }
            }
            else if ($(".big-numbers.selected").length > 1) {
                if ($(this).hasClass("selected"))
                    self.showOnGraph[$(this).data("type")] = false;
                else
                    self.showOnGraph[$(this).data("type")] = true;
            }
            
            $(this).toggleClass("selected");

            self.drawGraph(countlyEvent.getEventData());
        });

        if (countlyGlobal['admin_apps'][countlyCommon.ACTIVE_APP_ID]) {
            $("#edit-events-button").show();
        }
    },
    drawGraph:function(eventData) {
        $(".big-numbers").removeClass("selected");
        var use = [];
        var cnt = 0;
        for(var i in this.showOnGraph){
            if(this.showOnGraph[i]){
                $(".big-numbers."+i).addClass("selected");
                use.push(cnt);
            }
            else{

            }
            cnt++;
        }
        
        var data = [];
        for(var i = 0; i < use.length; i++){
            if (eventData.dataLevel == 2) {
                data.push(eventData.chartDP.dp[use[i]]);
            } else {
                data.push(eventData.chartDP[use[i]]);
            }
        }

        if (eventData.dataLevel == 2) {
            eventData.chartDP.dp = data;
            countlyCommon.drawGraph(eventData.chartDP, "#dashboard-graph", "bar", {series:{stack:null}});
        } else {
            eventData.chartDP = data;
            countlyCommon.drawTimeGraph(eventData.chartDP, "#dashboard-graph");
        }
    },
    drawTable:function(eventData) {
        if (this.dtable && this.dtable.fnDestroy) {
            this.dtable.fnDestroy(true);
        }

        $("#event-main").append('<table class="d-table" cellpadding="0" cellspacing="0"></table>');

        var aaColumns = [];

        if (countlyEvent.isSegmentedView()) {
            aaColumns.push({"mData":"curr_segment", "sTitle":jQuery.i18n.map["events.table.segmentation"]});
        } else {
            aaColumns.push({"mData":"date", "sType":"customDate", "sTitle":jQuery.i18n.map["common.date"]});
        }

        aaColumns.push({"mData":"c", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle":eventData.tableColumns[1]});

        if (eventData.tableColumns[2]) {
            if(eventData.tableColumns[2] == jQuery.i18n.map["events.table.dur"]){
                aaColumns.push({"mData":"dur", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle":eventData.tableColumns[2]});
                aaColumns.push({"sClass": "dynamic-col", "mData":function(row, type){if(row.c == 0 || row.dur == 0) return 0; else return (row.dur/row.c);}, sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle":jQuery.i18n.map["events.table.avg-dur"]});
            }
            else{
                aaColumns.push({"mData":"s", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle":eventData.tableColumns[2]});
                aaColumns.push({"sClass": "dynamic-col","mData":function(row, type){if(row.c == 0 || row.s == 0) return 0; else return (row.s/row.c);}, sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle":jQuery.i18n.map["events.table.avg-sum"]});
            }
        }
        
        if (eventData.tableColumns[3]) {
            aaColumns.push({"mData":"dur", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle":eventData.tableColumns[3]});
            aaColumns.push({"sClass": "dynamic-col","mData":function(row, type){if(row.c == 0 || row.dur == 0) return 0; else return (row.dur/row.c);}, sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle":jQuery.i18n.map["events.table.avg-dur"]});
        }
        
        this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
            "aaData": eventData.chartData,
            "aoColumns": aaColumns
        }));

        $(".d-table").stickyTableHeaders();
    },
    getColumnCount:function(){
        return $(".dataTable").find("thead th:not(.dynamic-col)").length;
    },
    renderCommon:function (isRefresh) {
        var eventData = countlyEvent.getEventData(),
            eventSummary = countlyEvent.getEventSummary(),
            self = this;

        this.templateData = {
            "page-title":eventData.eventName.toUpperCase(),
            "logo-class":"events",
            "events":countlyEvent.getEvents(),
            "event-map":countlyEvent.getEventMap(),
            "segmentations":countlyEvent.getEventSegmentations(),
            "active-segmentation":countlyEvent.getActiveSegmentation(),
            "big-numbers":eventSummary,
            "chart-data":{
                "columnCount":eventData.tableColumns.length,
                "columns":eventData.tableColumns,
                "rows":eventData.chartData
            }
        };

        if (countlyEvent.getEvents().length == 0) {
            window.location = "dashboard#/";
            CountlyHelpers.alert(jQuery.i18n.map["events.no-event"], "black");
            return true;
        }

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            for(var i in this.showOnGraph){
                self.showOnGraph[i] = $(".big-numbers.selected."+i).length;
            }
            this.drawGraph(eventData);
            this.drawTable(eventData);
            this.pageScript();

            $("#edit-events-button").on("click", function () {
                CountlyHelpers.popup("#edit-event-container", "events");

                $(".dialog #edit-event-table-container").slimScroll({
                    height:'100%',
                    start:'top',
                    wheelStep:10,
                    position:'right',
                    disableFadeOut:true
                });

                $(".dialog .events-table").sortable({
                    items:"tbody tr",
                    revert:true,
                    handle:"td:first-child",
                    helper:function (e, elem) {
                        elem.children().each(function () {
                            $(this).width($(this).width());
                        });

                        elem.addClass("moving");

                        return elem;
                    },
                    cursor:"move",
                    containment:"parent",
                    tolerance:"pointer",
                    placeholder:"event-row-placeholder",
                    stop:function (e, elem) {
                        elem.item.removeClass("moving");
                    }
                });

                $(".dialog #events-save").on("click", function () {
                    var eventMap = {},
                        eventOrder = [];

                    $(".dialog .events-table tbody tr").each(function () {
                        var currEvent = $(this);
                        eventKey = currEvent.find(".event-key").text().replace("\\", "\\\\").replace("\$", "\\u0024").replace(".", "\\u002e");

                        if (currEvent.find(".event-name").val() && eventKey != currEvent.find(".event-name").val()) {
                            if (!eventMap[eventKey]) {
                                eventMap[eventKey] = {}
                            }
                            eventMap[eventKey]["name"] = currEvent.find(".event-name").val();
                        }

                        if (currEvent.find(".event-count").val()) {
                            if (!eventMap[eventKey]) {
                                eventMap[eventKey] = {}
                            }
                            eventMap[eventKey]["count"] = currEvent.find(".event-count").val();
                        }

                        if (currEvent.find(".event-sum").val()) {
                            if (!eventMap[eventKey]) {
                                eventMap[eventKey] = {}
                            }
                            eventMap[eventKey]["sum"] = currEvent.find(".event-sum").val();
                        }
                        
                        if (currEvent.find(".event-dur").val()) {
                            if (!eventMap[eventKey]) {
                                eventMap[eventKey] = {}
                            }
                            eventMap[eventKey]["dur"] = currEvent.find(".event-dur").val();
                        }
                    });

                    $(".dialog .events-table").find(".event-key").each(function () {
                        if ($(this).text()) {
                            eventOrder.push($(this).text());
                        }
                    });

                    $.ajax({
                        type:"POST",
                        url:countlyGlobal["path"]+"/events/map/edit",
                        data:{
                            "app_id":countlyCommon.ACTIVE_APP_ID,
                            "event_map":eventMap,
                            "event_order":eventOrder,
                            _csrf:countlyGlobal['csrf_token']
                        },
                        success:function (result) {
                            self.refresh();
                        }
                    });
                });

                $(".delete-event").on("click", function() {
                    var eventKey = $(this).data("event-key");
                    var dialog = $(this).parents(".dialog");
                    if (eventKey) {
                        CountlyHelpers.confirm(jQuery.i18n.prop('events.delete-confirm', eventKey), "red", function (result) {
                            if (result) {
                                $.ajax({
                                    type:"POST",
                                    url:countlyGlobal["path"]+"/events/delete",
                                    data:{
                                        "event_key":eventKey,
                                        "app_id":countlyCommon.ACTIVE_APP_ID,
                                        _csrf:countlyGlobal['csrf_token']
                                    },
                                    success:function (result) {
                                        countlyEvent.reset();
                                        $.when(countlyEvent.initialize(true)).then(function () {
                                            self.render();
                                        });
                                        $(".dialog #edit-event-table-container tr").each(function(){
                                            if($(this).find(".delete-event").data("event-key") == eventKey){
                                                var height = dialog.outerHeight()-$(this).outerHeight();
                                                $(this).remove();
                                                dialog.css({
                                                    "height":height
                                                });
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
                
                $(".delete-event-selected").on("click", function() {
                    var eventKey = $(this).data("event-key");
                    var dialog = $(this).parents(".dialog");
                    CountlyHelpers.confirm(jQuery.i18n.prop('events.delete-confirm-many'), "red", function (result) {
                        if (result) {
                            var events = [];
                            var recheck = {};
                            var key;
                            $(".dialog .delete-event-check").each(function(){
                                if($(this).is(':checked')){
                                    key = $(this).data("event-key");
                                    events.push(key);
                                    recheck[key] = true;
                                }
                            });
                            $.ajax({
                                type:"POST",
                                url:countlyGlobal["path"]+"/events/delete_multi",
                                data:{
                                    "events":JSON.stringify(events),
                                    "app_id":countlyCommon.ACTIVE_APP_ID,
                                    _csrf:countlyGlobal['csrf_token']
                                },
                                success:function (result) {
                                    countlyEvent.reset();
                                    $.when(countlyEvent.initialize(true)).then(function () {
                                        self.render();
                                    });
                                    $(".dialog #edit-event-table-container tr").each(function(){
                                        if(recheck[$(this).find(".delete-event").data("event-key")]){
                                            var height = dialog.outerHeight()-$(this).outerHeight();
                                            $(this).remove();
                                            dialog.css({
                                                "height":height
                                            });
                                        }
                                    });
                                }
                            });
                        }
                    });
                });
            });
        }
    },
    refresh:function (eventChanged, segmentationChanged) {
        var self = this;
        $.when(countlyEvent.initialize(eventChanged)).then(function () {

            if (app.activeView != self) {
                return false;
            }
            self.renderCommon(true);
            newPage = $("<div>" + self.template(self.templateData) + "</div>");

            $(self.el).find("#event-nav .scrollable").html(function () {
                return newPage.find("#event-nav .scrollable").html();
            });

            // Segmentation change does not require title area refresh
            if (!segmentationChanged) {
                if ($("#event-update-area .cly-select").length && !eventChanged) {
                    // If there is segmentation for this event and this is not an event change refresh
                    // we just refresh the segmentation select's list
                    $(self.el).find("#event-update-area .select-items").html(function () {
                        return newPage.find("#event-update-area .select-items").html();
                    });

                    $("#event-update-area .select-items>div").addClass("scroll-list");
                    $("#event-update-area .select-items").find(".scroll-list").slimScroll({
                        height:'100%',
                        start:'top',
                        wheelStep:10,
                        position:'right',
                        disableFadeOut:true
                    });

                    $(".select-items .item").click(function () {
                        var selectedItem = $(this).parents(".cly-select").find(".text");
                        selectedItem.text($(this).text());
                        selectedItem.data("value", $(this).data("value"));
                    });
                } else {
                    // Otherwise we refresh whole title area including the title and the segmentation select
                    // and afterwards initialize the select since we replaced it with a new element
                    $(self.el).find("#event-update-area").replaceWith(newPage.find("#event-update-area"));
                }
            }

            $(self.el).find(".widget-footer").html(newPage.find(".widget-footer").html());
            $(self.el).find("#edit-event-container").replaceWith(newPage.find("#edit-event-container"));

            var eventData = countlyEvent.getEventData();
            for(var i in self.showOnGraph){
                if(!$(".big-numbers."+i).length)
                    self.showOnGraph[i] = false;
            }
            for(var i in self.showOnGraph){
                if(self.showOnGraph[i])
                    $(".big-numbers."+i).addClass("selected");
            }

            self.drawGraph(eventData);
            self.pageScript();

            if (eventChanged || segmentationChanged) {
                self.drawTable(eventData);
            } else if (self.getColumnCount() != eventData.tableColumns.length) {
                self.drawTable(eventData);
            } else {
                CountlyHelpers.refreshTable(self.dtable, eventData.chartData);
            }

            app.localize();
            $('.nav-search').find("input").trigger("input");
        });
    }
});

window.DashboardView = countlyView.extend({
    renderCommon:function () {
        if(countlyGlobal["apps"][countlyCommon.ACTIVE_APP_ID]){
            var type = countlyGlobal["apps"][countlyCommon.ACTIVE_APP_ID].type;
            type = jQuery.i18n.map["management-applications.types."+type] || type;
            $(this.el).html("<div id='no-app-type'><h1>"+jQuery.i18n.map["common.missing-type"]+": "+type+"</h1><h3><a href='#/manage/plugins'>"+jQuery.i18n.map["common.install-plugin"]+"</a><br/>"+jQuery.i18n.map["common.or"]+"<br/><a href='#/manage/apps'>"+jQuery.i18n.map["common.change-app-type"]+"</a></h3></div>");
        }
        else{
            $(this.el).html("<div id='no-app-type'><h1>"+jQuery.i18n.map["management-applications.no-app-warning"]+"</h1><h3><a href='#/manage/apps'>"+jQuery.i18n.map["common.add-new-app"]+"</a></h3></div>");
        }
    }
});

var AppRouter = Backbone.Router.extend({
    routes:{
        "/":"dashboard",
        "/analytics/sessions":"sessions",
        "/analytics/countries":"countries",
		"/analytics/users":"users",
        "/analytics/loyalty":"loyalty",
        "/analytics/devices":"devices",
        "/analytics/platforms":"platforms",
        "/analytics/versions":"versions",
        "/analytics/carriers":"carriers",
        "/analytics/frequency":"frequency",
        "/analytics/events":"events",
        "/analytics/resolutions":"resolutions",
        "/analytics/durations":"durations",
		"/all":"allapps",
        "/manage/apps":"manageApps",
        "/manage/users":"manageUsers",
        "*path":"main"
    },
    activeView:null, //current view
    dateToSelected:null, //date to selected from the date picker
    dateFromSelected:null, //date from selected from the date picker
    activeAppName:'',
    activeAppKey:'',
    refreshActiveView:0, //refresh interval function reference
    main:function (forced) {
        var change = true,
            redirect = false;
        if(location.hash != "#/" && countlyGlobal["apps"][countlyCommon.ACTIVE_APP_ID]){
            $("#"+countlyGlobal["apps"][countlyCommon.ACTIVE_APP_ID].type+"-type a").each(function(){
                if(this.hash != "#/" && this.hash != ""){
                    if(location.hash == this.hash && $(this).css('display') != 'none' ){
                        change = false;
                        return false;
                    }
                    else if(location.hash.indexOf(this.hash) == 0 && $(this).css('display') != 'none'){
                        redirect = this.hash;
                        return false;
                    }
                }
            });
        }
        if(redirect){
            app.navigate(redirect, true);
        }
        else if(change){
            this.navigate("/", true);
            if(forced && this.activeView != this.appTypes[countlyGlobal["apps"][countlyCommon.ACTIVE_APP_ID].type]){
                this.dashboard();
            }
        }
    },
    dashboard:function () {
        if(_.isEmpty(countlyGlobal['apps']))
            this.renderWhenReady(this.manageAppsView);
        else if(typeof this.appTypes[countlyGlobal["apps"][countlyCommon.ACTIVE_APP_ID].type] != "undefined")
            this.renderWhenReady(this.appTypes[countlyGlobal["apps"][countlyCommon.ACTIVE_APP_ID].type]);
        else
            this.renderWhenReady(this.dashboardView);
    },
    sessions:function () {
        this.renderWhenReady(this.sessionView);
    },
    countries:function () {
        this.renderWhenReady(this.countriesView);
    },
    devices:function () {
        this.renderWhenReady(this.deviceView);
    },
    platforms:function () {
        this.renderWhenReady(this.platformView);
    },
    versions:function () {
        this.renderWhenReady(this.appVersionView);
    },
    users:function () {
        this.renderWhenReady(this.userView);
    },
    loyalty:function () {
        this.renderWhenReady(this.loyaltyView);
    },
    frequency:function () {
        this.renderWhenReady(this.frequencyView);
    },
    carriers:function () {
        this.renderWhenReady(this.carrierView);
    },
    manageApps:function () {
        this.renderWhenReady(this.manageAppsView);
    },
    manageUsers:function () {
        this.renderWhenReady(this.manageUsersView);
    },
    events:function () {
        this.renderWhenReady(this.eventsView);
    },
    resolutions:function () {
        this.renderWhenReady(this.resolutionsView);
    },
    durations:function () {
        this.renderWhenReady(this.durationsView);
    },
    runRefreshScripts: function() {
        if(this.refreshScripts[Backbone.history.fragment])
            for(var i = 0, l = this.refreshScripts[Backbone.history.fragment].length; i < l; i++)
                this.refreshScripts[Backbone.history.fragment][i]();
        for(var k in this.refreshScripts) 
            if (k !== '#' && k.indexOf('#') !== -1 && Backbone.history.fragment.match(k.replace(/#/g, '.*')))
                for(var i = 0, l = this.refreshScripts[k].length; i < l; i++)
                    this.refreshScripts[k][i]();
        if(this.refreshScripts["#"])
            for(var i = 0, l = this.refreshScripts["#"].length; i < l; i++)
                this.refreshScripts["#"][i]();

    },
    renderWhenReady:function (viewName) { //all view renders end up here

        // If there is an active view call its destroy function to perform cleanups before a new view renders
        if (this.activeView) {
            this.activeView.destroy();
        }

        if (window.components && window.components.slider && window.components.slider.instance) {
            window.components.slider.instance.close();
        }

        this.activeView = viewName;
        clearInterval(this.refreshActiveView);
        if(typeof countlyGlobal["member"].password_changed === "undefined"){
            countlyGlobal["member"].password_changed = Math.round(new Date().getTime()/1000);
        }

        if (_.isEmpty(countlyGlobal['apps'])) {
            if (Backbone.history.fragment != "/manage/apps") {
                this.navigate("/manage/apps", true);
            } else {
                viewName.render();
            }
            return false;
        }
        else if(countlyGlobal["security"].password_expiration > 0 && countlyGlobal["member"].password_changed + countlyGlobal["security"].password_expiration*24*60*60 < new Date().getTime()/1000){
            if(Backbone.history.fragment != "/manage/user-settings/reset")
                this.navigate("/manage/user-settings/reset", true);
            else
                viewName.render();
            return false;
        }

        viewName.render();

        var self = this;
        this.refreshActiveView = setInterval(function () {
            self.activeView.refresh();
            self.runRefreshScripts();
        }, countlyCommon.DASHBOARD_REFRESH_MS);
        
        if(countlyGlobal && countlyGlobal["message"]){
            CountlyHelpers.parseAndShowMsg(countlyGlobal["message"]);
        }

        // Init sidebar based on the current url
        self.sidebar.init();
    },
    sidebar: {
        init: function() {
            setTimeout(function() {
                $("#sidebar-menu").find(".item").removeClass("active menu-active");
                var selectedMenu = $($("#sidebar-menu").find("a[href='#" + Backbone.history.fragment + "']"));
               
                if(!selectedMenu.length){
                    var parts = Backbone.history.fragment.split("/");
                    selectedMenu = $($("#sidebar-menu").find("a[href='#/" + (parts[1] || "") + "']"));
                    if(!selectedMenu.length){
                        selectedMenu = $($("#sidebar-menu").find("a[href='#/" + (parts[1]+"/"+parts[2] || "") + "']"));
                    }
                }
                
                var selectedSubmenu = selectedMenu.parents(".sidebar-submenu");

                if (selectedSubmenu.length) {
                    selectedMenu.addClass("active");
                    selectedSubmenu.prev().addClass("active menu-active");
                    app.sidebar.submenu.toggle(selectedSubmenu);
                } else {
                    selectedMenu.addClass("active");
                    app.sidebar.submenu.toggle();
                }
            }, 1000);
        },
        submenu: {
            toggle: function(el) {
                $(".sidebar-submenu").removeClass("half-visible");

                if (!el) {
                    $(".sidebar-submenu:visible").animate({"right":"-170px"}, {duration:300, easing:'easeOutExpo', complete: function() {
                        $(this).hide();
                    }});
                    return true;
                }

                if (el.is(":visible")) {

                } else if ($(".sidebar-submenu").is(":visible")) {
                    $(".sidebar-submenu").hide();
                    el.css({"right":"-110px"}).show().animate({"right":"0"}, {duration:300, easing:'easeOutExpo'});
                    addText();
                } else {
                    el.css({"right":"-170px"}).show().animate({"right":"0"}, {duration:300, easing:'easeOutExpo'});
                    addText();
                }

                function addText() {
                    var mainMenuText = $(el.prev()[0]).find(".text").text();

                    $(".menu-title").remove();
                    var menuTitle = $("<div class='menu-title'></div>").text(mainMenuText).prepend("<i class='submenu-close ion-close'></i>");
                    el.prepend(menuTitle);

                    // Try setting submenu title once again if it was empty
                    // during previous try
                    if (!mainMenuText) {
                        setTimeout(function() {
                            $(".menu-title").text($(el.prev()[0]).find(".text").text());
                            $(".menu-title").prepend("<i class='submenu-close ion-close'></i>")
                        }, 1000);
                    }
                }
            }
        }
    },
    initialize:function () { //initialize the dashboard, register helpers etc.
		this.appTypes = {};
		this.pageScripts = {};
        this.dataExports = {};
        this.appSwitchCallbacks = [];
        this.appManagementSwitchCallbacks = [];
        this.appObjectModificators = [];
        this.appAddTypeCallbacks = [];
		this.refreshScripts = {};
        this.dashboardView = new DashboardView();
        this.sessionView = new SessionView();
        this.countriesView = new CountriesView();
        this.userView = new UserView();
        this.loyaltyView = new LoyaltyView();
        this.deviceView = new DeviceView();
        this.platformView = new PlatformView();
        this.appVersionView = new AppVersionView();
        this.frequencyView = new FrequencyView();
        this.carrierView = new CarrierView();
        this.manageAppsView = new ManageAppsView();
        this.manageUsersView = new ManageUsersView();
        this.eventsView = new EventsView();
        this.resolutionsView = new ResolutionView();
        this.durationsView = new DurationView();

        Handlebars.registerPartial("date-selector", $("#template-date-selector").html());
        Handlebars.registerPartial("timezones", $("#template-timezones").html());
        Handlebars.registerPartial("app-categories", $("#template-app-categories").html());
        Handlebars.registerHelper('eachOfObject', function (context, options) {
            var ret = "";
            for (var prop in context) {
                ret = ret + options.fn({property:prop, value:context[prop]});
            }
            return ret;
        });
        Handlebars.registerHelper('eachOfObjectValue', function (context, options) {
            var ret = "";
            for (var prop in context) {
                ret = ret + options.fn(context[prop]);
            }
            return ret;
        });
        Handlebars.registerHelper('eachOfArray', function (context, options) {
            var ret = "";
            for (var i = 0; i < context.length; i++) {
                ret = ret + options.fn({index:i, value:context[i]});
            }
            return ret;
        });
		Handlebars.registerHelper('prettyJSON', function (context, options) {
            return JSON.stringify(context, undefined, 4);
        });
        Handlebars.registerHelper('getShortNumber', function (context, options) {
            return countlyCommon.getShortNumber(context);
        });
        Handlebars.registerHelper('getFormattedNumber', function (context, options) {
            if (isNaN(context)) {
                return context;
            }

            ret = parseFloat((parseFloat(context).toFixed(2)).toString()).toString();
            return ret.replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,");
        });
        Handlebars.registerHelper('toUpperCase', function (context, options) {
            return context.toUpperCase();
        });
        Handlebars.registerHelper('appIdsToNames', function (context, options) {
            return CountlyHelpers.appIdsToNames(context);
        });
        Handlebars.registerHelper('forNumberOfTimes', function (context, options) {
            var ret = "";
            for (var i = 0; i < context; i++) {
                ret = ret + options.fn({count:i + 1});
            }
            return ret;
        });
        Handlebars.registerHelper('include', function (templatename, options) {
            var partial = Handlebars.partials[templatename];
            var context = $.extend({}, this, options.hash);
            return partial(context);
        });
		Handlebars.registerHelper('for', function(from, to, incr, block) {
			var accum = '';
			for(var i = from; i < to; i += incr)
				accum += block.fn(i);
			return accum;
		});
		Handlebars.registerHelper('ifCond', function (v1, operator, v2, options) {
			switch (operator) {
				case '==':
					return (v1 == v2) ? options.fn(this) : options.inverse(this);
                case '!=':
					return (v1 != v2) ? options.fn(this) : options.inverse(this);
				case '===':
					return (v1 === v2) ? options.fn(this) : options.inverse(this);
				case '<':
					return (v1 < v2) ? options.fn(this) : options.inverse(this);
				case '<=':
					return (v1 <= v2) ? options.fn(this) : options.inverse(this);
				case '>':
					return (v1 > v2) ? options.fn(this) : options.inverse(this);
				case '>=':
					return (v1 >= v2) ? options.fn(this) : options.inverse(this);
				case '&&':
					return (v1 && v2) ? options.fn(this) : options.inverse(this);
				case '||':
					return (v1 || v2) ? options.fn(this) : options.inverse(this);
				default:
					return options.inverse(this);
			}
		});
        Handlebars.registerHelper('formatTimeAgo', function (context, options) {
            return countlyCommon.formatTimeAgo(parseInt(context)/1000);
        });

        var self = this;
        jQuery.i18n.properties({
            name:'locale',
            cache:true,
            language:countlyCommon.BROWSER_LANG_SHORT,
            path:[countlyGlobal["cdn"]+'localization/min/'],
            mode:'map',
            callback:function () {
                self.origLang = JSON.stringify(jQuery.i18n.map);
            }
        });

        $(document).ready(function ()  {

            CountlyHelpers.initializeSelect();
            CountlyHelpers.initializeTextSelect();
            CountlyHelpers.initializeMultiSelect();
			
			if(parseInt(countlyGlobal.config["session_timeout"])){
				var minTimeout, tenSecondTimeout, logoutTimeout, actionTimeout;
				var shouldRecordAction = false;
				var extendSession = function(){
					$.ajax({
						url:countlyGlobal["path"]+"/session",
						success:function (result) {
							if(result == "logout"){
								$("#user-logout").click();
								window.location = "/logout";
							}
							else if(result == "success"){
								shouldRecordAction = false;
								setTimeout(function(){
									shouldRecordAction = true;
								}, Math.round(countlyGlobal.config["session_timeout"]/2));
								resetSessionTimeouts(countlyGlobal.config["session_timeout"]);
							}
						}
					});
				}
				var resetSessionTimeouts = function(timeout){
					var minute = timeout - 60*1000;
					if(minTimeout){
						clearTimeout(minTimeout);
						minTimeout = null;
					}
					if(minute > 0){
						minTimeout = setTimeout(function(){
							CountlyHelpers.notify({title:jQuery.i18n.map["common.session-expiration"], message:jQuery.i18n.map["common.expire-minute"], info:jQuery.i18n.map["common.click-to-login"]})
						}, minute);
					}
					var tenSeconds = timeout - 10*1000;
					if(tenSecondTimeout){
						clearTimeout(tenSecondTimeout);
						tenSecondTimeout = null;
					}
					if(tenSeconds > 0){
						tenSecondTimeout = setTimeout(function(){
							CountlyHelpers.notify({title:jQuery.i18n.map["common.session-expiration"], message:jQuery.i18n.map["common.expire-seconds"], info:jQuery.i18n.map["common.click-to-login"]})
						}, tenSeconds);
					}
					if(logoutTimeout){
						clearTimeout(logoutTimeout);
						logoutTimeout = null;
					}
					logoutTimeout = setTimeout(function(){
						extendSession();
					}, timeout+1000);
				}
				resetSessionTimeouts(countlyGlobal.config["session_timeout"]);
				$(document).click(function (event) {
					if(shouldRecordAction)
						extendSession();
				});
				extendSession();
			}

            // If date range is selected initialize the calendar with these
            var periodObj = countlyCommon.getPeriod();
            if (Object.prototype.toString.call(periodObj) === '[object Array]' && periodObj.length == 2) {
                self.dateFromSelected = countlyCommon.getPeriod()[0];
                self.dateToSelected = countlyCommon.getPeriod()[1];
            }

            // Initialize localization related stuff

            // Localization test
            /*
             $.each(jQuery.i18n.map, function (key, value) {
             jQuery.i18n.map[key] = key;
             });
             */

            try {
                moment.lang(countlyCommon.BROWSER_LANG_SHORT);
            } catch(e) {
                moment.lang("en");
            }

            $(".reveal-language-menu").text(countlyCommon.BROWSER_LANG_SHORT.toUpperCase());

            $(".apps-scrollable").sortable({
                items:".app-container.app-navigate",
                revert:true,
                forcePlaceholderSize:true,
                handle:".drag",
                containment:"parent",
                tolerance:"pointer",
                stop:function () {
                    var orderArr = $(".apps-scrollable").sortable( "toArray", {attribute:"data-id"} );

                    $.ajax({
                        type:"POST",
                        url:countlyGlobal["path"]+"/dashboard/settings",
                        data:{
                            "app_sort_list":orderArr,
                            _csrf:countlyGlobal['csrf_token']
                        },
                        success:function (result) {
                        }
                    });
                }
            });

            $("#sort-app-button").click(function () {
                $(".app-container.app-navigate .drag").fadeToggle();
            });

            $(".app-navigate").live("click", function () {
                var appKey = $(this).data("key"),
                    appId = $(this).data("id"),
                    appName = $(this).find(".name").text(),
                    appImage = $(this).find(".logo").css("background-image"),
                    sidebarApp = $("#sidebar-app-select");

                if (self.activeAppKey == appKey) {
                    sidebarApp.removeClass("active");
                    $("#app-nav").animate({left:'31px'}, {duration:500, easing:'easeInBack'});
                    sidebarApp.find(".text").text(appName);
                    sidebarApp.find(".logo").css("background-image", appImage);
                    return false;
                }

                self.activeAppName = appName;
                self.activeAppKey = appKey;
                
                $("#app-nav").animate({left:'31px'}, {duration:500, easing:'easeInBack', complete:function () {
                    countlyCommon.setActiveApp(appId);
                    sidebarApp.find(".text").text(appName);
                    sidebarApp.find(".logo").css("background-image", appImage);
                    sidebarApp.removeClass("active");
                    app.onAppSwitch(appId);
                    self.activeView.appChanged();
                }});
            });
            
            $(document).on("mouseenter", ".app-container", function(){
                if(!$(this).find(".drag").is(":visible")){
                    var elem = $(this);
                    var name = elem.find(".name");

                    if(name[0].scrollWidth >  name.innerWidth()) {
                        elem.attr("title", name.text());
                    }
                }
            });

            $("#sidebar-events").click(function (e) {
                $.when(countlyEvent.refreshEvents()).then(function () {
                    if (countlyEvent.getEvents().length == 0) {
                        CountlyHelpers.alert(jQuery.i18n.map["events.no-event"], "black");
                        e.stopImmediatePropagation();
                        e.preventDefault();
                    }
                });
            });

            // SIDEBAR
            $("#sidebar-menu").on("click", ".submenu-close", function () {
                $(this).parents(".sidebar-submenu").animate({"right":"-170px"}, {duration:200, easing:'easeInExpo', complete: function() {
                    $(".sidebar-submenu").hide();
                    $("#sidebar-menu>.sidebar-menu>.item").removeClass("menu-active");
                }});
            });

            $("#sidebar-menu").on("click", ".item", function () {
                if ($(this).hasClass("menu-active")) {
                    return true;
                }

                $("#sidebar-menu>.sidebar-menu>.item").removeClass("menu-active");

                var elNext = $(this).next();

                if (elNext.hasClass("sidebar-submenu")) {
                    $(this).addClass("menu-active");
                    self.sidebar.submenu.toggle(elNext);
                } else {
                    $("#sidebar-menu").find(".item").removeClass("active");
                    $(this).addClass("active");

                    var mainMenuItem = $(this).parent(".sidebar-submenu").prev(".item");

                    if (mainMenuItem.length) {
                        mainMenuItem.addClass("active menu-active");
                    } else {
                        self.sidebar.submenu.toggle();
                    }

                    if ($("#app-nav").offset().left == 201) {
                        $("#app-nav").animate({left:'31px'}, {duration:500, easing:'easeInBack'});
                        $("#sidebar-app-select").removeClass("active");
                    }
                }
            });

            $("#sidebar-menu").hoverIntent({
                over: function() {
                    var visibleSubmenu = $(".sidebar-submenu:visible");

                    if (!$(this).hasClass("menu-active") && $(".sidebar-submenu").is(":visible") && !visibleSubmenu.hasClass("half-visible")) {
                        visibleSubmenu.addClass("half-visible");
                        visibleSubmenu.animate({"right":"-110px"}, {duration:300, easing:'easeOutExpo'});
                    }
                },
                out: function() { },
                selector: ".sidebar-menu>.item"
            });

            $("#sidebar-menu").hoverIntent({
                over: function() {},
                out: function() {
                    var visibleSubmenu = $(".sidebar-submenu:visible");

                    if ($(".sidebar-submenu").is(":visible") && visibleSubmenu.hasClass("half-visible")) {
                        visibleSubmenu.removeClass("half-visible");
                        visibleSubmenu.animate({"right":"0"}, {duration:300, easing:'easeOutExpo'});
                    }
                },
                selector: ""
            });

            $("#sidebar-menu").hoverIntent({
                over: function() {
                    var visibleSubmenu = $(".sidebar-submenu:visible");

                    if (visibleSubmenu.hasClass("half-visible")) {
                        visibleSubmenu.removeClass("half-visible");
                        visibleSubmenu.animate({"right":"0"}, {duration:300, easing:'easeOutExpo'});
                    }
                },
                out: function() {},
                selector: ".sidebar-submenu:visible"
            });

			$('#sidebar-menu').slimScroll({
				height: ($(window).height()-123-96+28)+'px',
				railVisible: true,
				railColor : '#4CC04F',
				railOpacity : .2,
				color: '#4CC04F'
			});

			$( window ).resize(function() {
				$('#sidebar-menu').slimScroll({
					height: ($(window).height()-123-96+28)+'px'
				});
			});

            $(".sidebar-submenu").on("click", ".item", function () {

                if ($(this).hasClass("disabled")) {
                    return true;
                }

                if ($("#app-nav").offset().left == 201) {
                    $("#app-nav").animate({left:'31px'}, {duration:500, easing:'easeInBack'});
                    $("#sidebar-app-select").removeClass("active");
                }

                $(".sidebar-submenu .item").removeClass("active");
                $(this).addClass("active");
                $(this).parent().prev(".item").addClass("active");
            });

            $("#sidebar-app-select").click(function () {

                if ($(this).hasClass("disabled")) {
                    return true;
                }

                if ($(this).hasClass("active")) {
                    $(this).removeClass("active");
                } else {
                    $(this).addClass("active");
                }

                $("#app-nav").show();
                var left = $("#app-nav").offset().left;

                if (left == 201) {
                    $("#app-nav").animate({left:'31px'}, {duration:500, easing:'easeInBack'});
                } else {
                    $("#app-nav").animate({left:'201px'}, {duration:500, easing:'easeOutBack'});
                }

            });

            $("#sidebar-bottom-container .reveal-menu").click(function () {
                $("#language-menu").hide();
                $("#sidebar-bottom-container .menu").toggle();
            });

            $("#sidebar-bottom-container .reveal-language-menu").click(function () {
                $("#sidebar-bottom-container .menu").hide();
                $("#language-menu").toggle();
            });

            $("#sidebar-bottom-container .item").click(function () {
                $("#sidebar-bottom-container .menu").hide();
                $("#language-menu").hide();
            });

            $("#language-menu .item").click(function () {
                var langCode = $(this).data("language-code"),
                    langCodeUpper = langCode.toUpperCase();

                store.set("countly_lang", langCode);
                $(".reveal-language-menu").text(langCodeUpper);

                countlyCommon.BROWSER_LANG_SHORT = langCode;
                countlyCommon.BROWSER_LANG = langCode;

                try {
                    moment.lang(countlyCommon.BROWSER_LANG_SHORT);
                } catch(e) {
                    moment.lang("en");
                }

                $("#date-to").datepicker("option", $.datepicker.regional[countlyCommon.BROWSER_LANG]);
                $("#date-from").datepicker("option", $.datepicker.regional[countlyCommon.BROWSER_LANG]);
                
                $.ajax({
                    type:"POST",
                    url:countlyGlobal["path"]+"/user/settings/lang",
                    data:{
                        "username":countlyGlobal["member"].username,
                        "lang":countlyCommon.BROWSER_LANG_SHORT,
                        _csrf:countlyGlobal['csrf_token']
                    },
                    success:function (result) {}
                });

                jQuery.i18n.properties({
                    name:'locale',
                    cache:true,
                    language:countlyCommon.BROWSER_LANG_SHORT,
                    path:[countlyGlobal["cdn"]+'localization/min/'],
                    mode:'map',
                    callback:function () {
                        self.origLang = JSON.stringify(jQuery.i18n.map);
                        $.when(countlyLocation.changeLanguage()).then(function () {
                            self.activeView.render();
                        });
                    }
                });
            });

            /*$("#account-settings").click(function () {
                CountlyHelpers.popup("#edit-account-details");
                $(".dialog #username").val($("#menu-username").text());
                $(".dialog #api-key").val($("#user-api-key").val());
            });*/

            $("#save-account-details:not(.disabled)").live('click', function () {
                var username = $(".dialog #username").val(),
                    old_pwd = $(".dialog #old_pwd").val(),
                    new_pwd = $(".dialog #new_pwd").val(),
                    re_new_pwd = $(".dialog #re_new_pwd").val(),
                    api_key = $(".dialog #api-key").val();

                if (new_pwd != re_new_pwd) {
                    $(".dialog #settings-save-result").addClass("red").text(jQuery.i18n.map["user-settings.password-match"]);
                    return true;
                }

                $(this).addClass("disabled");

                $.ajax({
                    type:"POST",
                    url:countlyGlobal["path"]+"/user/settings",
                    data:{
                        "username":username,
                        "old_pwd":old_pwd,
                        "new_pwd":new_pwd,
                        "api_key":api_key,
                        _csrf:countlyGlobal['csrf_token']
                    },
                    success:function (result) {
                        var saveResult = $(".dialog #settings-save-result");

                        if (result == "username-exists") {
                            saveResult.removeClass("green").addClass("red").text(jQuery.i18n.map["management-users.username.exists"]);
                        } else if (!result) {
                            saveResult.removeClass("green").addClass("red").text(jQuery.i18n.map["user-settings.alert"]);
                        } else {
                            saveResult.removeClass("red").addClass("green").text(jQuery.i18n.map["user-settings.success"]);
                            $(".dialog #old_pwd").val("");
                            $(".dialog #new_pwd").val("");
                            $(".dialog #re_new_pwd").val("");
                            $("#menu-username").text(username);
                            $("#user-api-key").val(api_key);
                            countlyGlobal["member"].username = username;
                            countlyGlobal["member"].api_key = api_key;
                        }

                        $(".dialog #save-account-details").removeClass("disabled");
                    }
                });
            });

            $('.apps-scrollable').slimScroll({
                height:'100%',
                start:'top',
                wheelStep:10,
                position:'right',
                disableFadeOut:true
            });

            var help = _.once(function () {
                CountlyHelpers.alert(jQuery.i18n.map["help.help-mode-welcome"], "black");
            });
            $(".help-toggle, #help-toggle").click(function (e) {

                e.stopPropagation();
                $(".help-toggle #help-toggle").toggleClass("active");

                app.tipsify($(".help-toggle #help-toggle").hasClass("active"));

                if ($(".help-toggle #help-toggle").hasClass("active")) {
                    help();
                    $.idleTimer('destroy');
                    clearInterval(self.refreshActiveView);
                } else {
                    self.refreshActiveView = setInterval(function () {
                        self.activeView.refresh();
                    }, countlyCommon.DASHBOARD_REFRESH_MS);
                    $.idleTimer(countlyCommon.DASHBOARD_IDLE_MS);
                }
            });

            $("#user-logout").click(function () {
                store.remove('countly_active_app');
                store.remove('countly_date');
                store.remove('countly_location_city');
            });
	    
            $(".beta-button").click(function () {
                CountlyHelpers.alert("This feature is currently in beta so the data you see in this view might change or disappear into thin air.<br/><br/>If you find any bugs or have suggestions please let us know!<br/><br/><a style='font-weight:500;'>Captain Obvious:</a> You can use the message box that appears when you click the question mark on the bottom right corner of this page.", "black");
            });

            $("#content").on("click", "#graph-note", function () {
                CountlyHelpers.popup("#graph-note-popup");

                $(".note-date:visible").datepicker({
                    numberOfMonths:1,
                    showOtherMonths:true,
                    onSelect:function () {
                        dateText();
                    }
                });

                $.datepicker.setDefaults($.datepicker.regional[""]);
                $(".note-date:visible").datepicker("option", $.datepicker.regional[countlyCommon.BROWSER_LANG]);

                $('.note-popup:visible .time-picker, .note-popup:visible .note-list').slimScroll({
                    height:'100%',
                    start:'top',
                    wheelStep:10,
                    position:'right',
                    disableFadeOut:true
                });

                $(".note-popup:visible .time-picker span").on("click", function() {
                    $(".note-popup:visible .time-picker span").removeClass("selected");
                    $(this).addClass("selected");
                    dateText();
                });


                $(".note-popup:visible .manage-notes-button").on("click", function() {
                    $(".note-popup:visible .note-create").hide();
                    $(".note-popup:visible .note-manage").show();
                    $(".note-popup:visible .create-note-button").show();
                    $(this).hide();
                    $(".note-popup:visible .create-note").hide();
                });

                $(".note-popup:visible .create-note-button").on("click", function() {
                    $(".note-popup:visible .note-create").show();
                    $(".note-popup:visible .note-manage").hide();
                    $(".note-popup:visible .manage-notes-button").show();
                    $(this).hide();
                    $(".note-popup:visible .create-note").show();
                });

                dateText();

                function dateText() {
                    var selectedDate = $(".note-date:visible").val(),
                        instance = $(".note-date:visible").data("datepicker"),
                        date = $.datepicker.parseDate(instance.settings.dateFormat || $.datepicker._defaults.dateFormat, selectedDate, instance.settings);

                    $(".selected-date:visible").text(moment(date).format("D MMM YYYY") + ", " + $(".time-picker:visible span.selected").text());
                }

                if (countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].notes) {
                    var noteDateIds = _.sortBy(_.keys(countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].notes), function(el) { return -parseInt(el); });

                    for (var i = 0; i < noteDateIds.length; i++) {
                        var currNotes = countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].notes[noteDateIds[i]];

                        for (var j = 0; j < currNotes.length; j++) {
                            $(".note-popup:visible .note-list").append(
                                '<div class="note">' +
                                    '<div class="date" data-dateid="' + noteDateIds[i] + '">' + moment(noteDateIds[i], "YYYYMMDDHH").format("D MMM YYYY, HH:mm") + '</div>' +
                                    '<div class="content">' + currNotes[j] + '</div>' +
                                    '<div class="delete-note"><i class="fa fa-trash"></i></div>' +
                                '</div>'
                            );
                        }
                    }
                }

                if (!$(".note-popup:visible .note").length) {
                    $(".note-popup:visible .manage-notes-button").hide();
                }

                $('.note-popup:visible .note-content').textcounter({
                    max: 50,
                    countDown: true,
                    countDownText: "remaining "
                });

                $(".note-popup:visible .note .delete-note").on("click", function() {
                    var dateId = $(this).siblings(".date").data("dateid"),
                        note = $(this).siblings(".content").text();

                    $(this).parents(".note").fadeOut().remove();

                    $.ajax({
                        type:"POST",
                        url:countlyGlobal["path"]+'/graphnotes/delete',
                        data:{
                            "app_id":countlyCommon.ACTIVE_APP_ID,
                            "date_id":dateId,
                            "note":note,
                            _csrf:countlyGlobal['csrf_token']
                        },
                        success:function (result) {
                            if (result == false) {
                                return false;
                            } else {
                                updateGlobalNotes({date_id: dateId, note:note}, "delete");
                                app.activeView.refresh();
                            }
                        }
                    });

                    if (!$(".note-popup:visible .note").length) {
                        $(".note-popup:visible .create-note-button").trigger("click");
                        $(".note-popup:visible .manage-notes-button").hide();
                    }
                });

                $(".note-popup:visible .create-note").on("click", function() {
                    if ($(this).hasClass("disabled")) {
                        return true;
                    }

                    $(this).addClass("disabled");

                    var selectedDate = $(".note-date:visible").val(),
                        instance = $(".note-date:visible").data("datepicker"),
                        date = $.datepicker.parseDate(instance.settings.dateFormat || $.datepicker._defaults.dateFormat, selectedDate, instance.settings),
                        dateId = moment(moment(date).format("D MMM YYYY") + ", " + $(".time-picker:visible span.selected").text(), "D MMM YYYY, HH:mm").format("YYYYMMDDHH"),
                        note = $(".note-popup:visible .note-content").val();

                    if (!note.length) {
                        $(".note-popup:visible .note-content").addClass("required-border");
                        $(this).removeClass("disabled");
                        return true;
                    } else {
                        $(".note-popup:visible .note-content").removeClass("required-border");
                    }

                    $.ajax({
                        type:"POST",
                        url:countlyGlobal["path"]+'/graphnotes/create',
                        data:{
                            "app_id":countlyCommon.ACTIVE_APP_ID,
                            "date_id":dateId,
                            "note":note,
                            _csrf:countlyGlobal['csrf_token']
                        },
                        success:function (result) {
                            if (result == false) {
                                return false;
                            } else {
                                updateGlobalNotes({date_id: dateId, note:result}, "create");
                                app.activeView.refresh();
                            }
                        }
                    });

                    $("#overlay").trigger("click");
                });

                function updateGlobalNotes(noteObj, operation) {
                    var globalNotes = countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].notes;

                    if (operation == "create") {
                        if (globalNotes) {
                            if (globalNotes[noteObj.date_id]) {
                                countlyCommon.arrayAddUniq(globalNotes[noteObj.date_id], noteObj.note);
                            } else {
                                globalNotes[noteObj.date_id] = [noteObj.note];
                            }
                        } else {
                            var tmpNote = {};
                            tmpNote[noteObj.date_id] = [noteObj.note];

                            countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].notes = tmpNote;
                        }
                    } else if (operation == "delete") {
                        if (globalNotes) {
                            if (globalNotes[noteObj.date_id]) {
                                globalNotes[noteObj.date_id] = _.without(globalNotes[noteObj.date_id], noteObj.note);
                            }
                        }
                    }
                }
            });
        });

        if (!_.isEmpty(countlyGlobal['apps'])) {
            if (!countlyCommon.ACTIVE_APP_ID) {
                countlyCommon.setActiveApp(countlyGlobal["defaultApp"]._id);
                self.activeAppName = countlyGlobal["defaultApp"].name;
            } else {
                $("#sidebar-app-select").find(".logo").css("background-image", "url('"+countlyGlobal["cdn"]+"appimages/" + countlyCommon.ACTIVE_APP_ID + ".png')");
                $("#sidebar-app-select .text").text(countlyGlobal['apps'][countlyCommon.ACTIVE_APP_ID].name);
                self.activeAppName = countlyGlobal['apps'][countlyCommon.ACTIVE_APP_ID].name;
            }
        } else {
            $("#new-install-overlay").show();
        }

        $.idleTimer(countlyCommon.DASHBOARD_IDLE_MS);

        $(document).bind("idle.idleTimer", function () {
            clearInterval(self.refreshActiveView);
        });

        $(document).bind("active.idleTimer", function () {
            self.activeView.restart();
            self.refreshActiveView = setInterval(function () {
                self.activeView.refresh();
            }, countlyCommon.DASHBOARD_REFRESH_MS);
        });

        $.fn.dataTableExt.oPagination.four_button = {
            "fnInit": function ( oSettings, nPaging, fnCallbackDraw )
            {
                nFirst = document.createElement( 'span' );
                nPrevious = document.createElement( 'span' );
                nNext = document.createElement( 'span' );
                nLast = document.createElement( 'span' );

                nFirst.innerHTML = "<i class='fa fa-angle-double-left'></i>";
                nPrevious.innerHTML = "<i class='fa fa-angle-left'></i>";
                nNext.innerHTML = "<i class='fa fa-angle-right'></i>";
                nLast.innerHTML = "<i class='fa fa-angle-double-right'></i>";

                nFirst.className = "paginate_button first";
                nPrevious.className = "paginate_button previous";
                nNext.className="paginate_button next";
                nLast.className = "paginate_button last";

                nPaging.appendChild( nFirst );
                nPaging.appendChild( nPrevious );
                nPaging.appendChild( nNext );
                nPaging.appendChild( nLast );

                $(nFirst).click( function () {
                    oSettings.oApi._fnPageChange( oSettings, "first" );
                    fnCallbackDraw( oSettings );
                } );

                $(nPrevious).click( function() {
                    oSettings.oApi._fnPageChange( oSettings, "previous" );
                    fnCallbackDraw( oSettings );
                } );

                $(nNext).click( function() {
                    oSettings.oApi._fnPageChange( oSettings, "next" );
                    fnCallbackDraw( oSettings );
                } );

                $(nLast).click( function() {
                    oSettings.oApi._fnPageChange( oSettings, "last" );
                    fnCallbackDraw( oSettings );
                } );

                $(nFirst).bind( 'selectstart', function () { return false; } );
                $(nPrevious).bind( 'selectstart', function () { return false; } );
                $(nNext).bind( 'selectstart', function () { return false; } );
                $(nLast).bind( 'selectstart', function () { return false; } );
            },

            "fnUpdate": function ( oSettings, fnCallbackDraw )
            {
                if ( !oSettings.aanFeatures.p )
                {
                    return;
                }

                var an = oSettings.aanFeatures.p;
                for ( var i=0, iLen=an.length ; i<iLen ; i++ )
                {
                    var buttons = an[i].getElementsByTagName('span');
                    if ( oSettings._iDisplayStart === 0 )
                    {
                        buttons[0].className = "paginate_disabled_previous";
                        buttons[1].className = "paginate_disabled_previous";
                    }
                    else
                    {
                        buttons[0].className = "paginate_enabled_previous";
                        buttons[1].className = "paginate_enabled_previous";
                    }

                    if ( oSettings.fnDisplayEnd() == oSettings.fnRecordsDisplay() )
                    {
                        buttons[2].className = "paginate_disabled_next";
                        buttons[3].className = "paginate_disabled_next";
                    }
                    else
                    {
                        buttons[2].className = "paginate_enabled_next";
                        buttons[3].className = "paginate_enabled_next";
                    }
                }
            }
        };

        $.fn.dataTableExt.oApi.fnStandingRedraw = function(oSettings) {
            if(oSettings.oFeatures.bServerSide === false){
                var before = oSettings._iDisplayStart;

                oSettings.oApi._fnReDraw(oSettings);

                // iDisplayStart has been reset to zero - so lets change it back
                oSettings._iDisplayStart = before;
                oSettings.oApi._fnCalculateEnd(oSettings);
            }

            // draw the 'current' page
            oSettings.oApi._fnDraw(oSettings);
        };

        function getCustomDateInt(s) {
            if (s.indexOf(":") != -1) {
                if (s.indexOf(",") != -1) {
                    s = s.replace(/,|:/g,"");
                    var dateParts = s.split(" ");

                    return  parseInt((moment.monthsShort.indexOf(dateParts[1]) + 1) * 1000000) +
                        parseInt(dateParts[0]) * 10000 +
                        parseInt(dateParts[2]);
                } else {
                    return parseInt(s.replace(':', ''));
                }
            } else if (s.length == 3) {
                return moment.monthsShort.indexOf(s);
            } else if (s.indexOf("W") == 0) {
                s = s.replace(",","");
                s = s.replace("W","");
                var dateParts = s.split(" ");
                return (parseInt(dateParts[0]))+parseInt(dateParts.pop()*10000);
            } else {
                s = s.replace(",","");
                var dateParts = s.split(" ");

                if (dateParts.length == 3) {
                    return (parseInt(dateParts[2]) * 10000) + parseInt(moment.monthsShort.indexOf(dateParts[1]) * 100) + parseInt(dateParts[0]);
                } else {
                    if(dateParts[0].length == 3)
                        return parseInt(moment.monthsShort.indexOf(dateParts[0]) * 100) + parseInt(dateParts[1]*10000);
                    else    
                        return parseInt(moment.monthsShort.indexOf(dateParts[1]) * 100) + parseInt(dateParts[0]);
                }
            }
        }

        jQuery.fn.dataTableExt.oSort['customDate-asc']  = function(x, y) {
            x = getCustomDateInt(x);
            y = getCustomDateInt(y);

            return ((x < y) ? -1 : ((x > y) ?  1 : 0));
        };

        jQuery.fn.dataTableExt.oSort['customDate-desc'] = function(x, y) {
            x = getCustomDateInt(x);
            y = getCustomDateInt(y);

            return ((x < y) ?  1 : ((x > y) ? -1 : 0));
        };

        function getDateRangeInt(s) {
            s = s.split("-")[0];
            var mEnglish = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

            if (s.indexOf(":") != -1) {
                var mName = (s.split(" ")[1]).split(",")[0];

                return s.replace(mName, parseInt(mEnglish.indexOf(mName))).replace(/[:, ]/g, "");
            } else {
                var parts = s.split(" ");
                if (parts.length > 1) {
                    return parseInt(mEnglish.indexOf(parts[1]) * 100) + parseInt(parts[0]);
                } else {
                    return parts[0].replace(/[><]/g, "");
                }
            }
        }

        jQuery.fn.dataTableExt.oSort['dateRange-asc']  = function(x, y) {
            x = getDateRangeInt(x);
            y = getDateRangeInt(y);

            return ((x < y) ? -1 : ((x > y) ?  1 : 0));
        };

        jQuery.fn.dataTableExt.oSort['dateRange-desc'] = function(x, y) {
            x = getDateRangeInt(x);
            y = getDateRangeInt(y);

            return ((x < y) ?  1 : ((x > y) ? -1 : 0));
        };

        jQuery.fn.dataTableExt.oSort['percent-asc']  = function(x, y) {
            x = parseFloat($("<a></a>").html(x).text().replace("%",""));
            y = parseFloat($("<a></a>").html(y).text().replace("%",""));

            return ((x < y) ? -1 : ((x > y) ?  1 : 0));
        };

        jQuery.fn.dataTableExt.oSort['percent-desc']  = function(x, y) {
            x = parseFloat($("<a></a>").html(x).text().replace("%",""));
            y = parseFloat($("<a></a>").html(y).text().replace("%",""));

            return ((x < y) ?  1 : ((x > y) ? -1 : 0));
        };

        jQuery.fn.dataTableExt.oSort['formatted-num-asc'] = function (x, y) {
            'use strict';

            // Define vars
            var a = [], b = [];

            // Match any character except: digits (0-9), dash (-), period (.), or backslash (/) and replace those characters with empty string.
            x = x.replace(/[^\d\-\.\/]/g, '');
            y = y.replace(/[^\d\-\.\/]/g, '');

            // Handle simple fractions
            if (x.indexOf('/') >= 0) {
                a = x.split("/");
                x = parseInt(a[0], 10) / parseInt(a[1], 10);
            }
            if (y.indexOf('/') >= 0) {
                b = y.split("/");
                y = parseInt(b[0], 10) / parseInt(b[1], 10);
            }

            return x - y;
        };

        jQuery.fn.dataTableExt.oSort['formatted-num-desc'] = function (x, y) {
            'use strict';

            // Define vars
            var a = [], b = [];

            // Match any character except: digits (0-9), dash (-), period (.), or backslash (/) and replace those characters with empty string.
            x = x.replace(/[^\d\-\.\/]/g, '');
            y = y.replace(/[^\d\-\.\/]/g, '');

            // Handle simple fractions
            if (x.indexOf('/') >= 0) {
                a = x.split("/");
                x = parseInt(a[0], 10) / parseInt(a[1], 10);
            }
            if (y.indexOf('/') >= 0) {
                b = y.split("/");
                y = parseInt(b[0], 10) / parseInt(b[1], 10);
            }

            return y - x;
        };

        jQuery.fn.dataTableExt.oSort['loyalty-asc']  = function(x, y) {
            x = countlyUser.getLoyaltyIndex(x);
            y = countlyUser.getLoyaltyIndex(y);

            return ((x < y) ? -1 : ((x > y) ?  1 : 0));
        };

        jQuery.fn.dataTableExt.oSort['loyalty-desc']  = function(x, y) {
            x = countlyUser.getLoyaltyIndex(x);
            y = countlyUser.getLoyaltyIndex(y);

            return ((x < y) ?  1 : ((x > y) ? -1 : 0));
        };

        jQuery.fn.dataTableExt.oSort['frequency-asc']  = function(x, y) {
            x = countlyUser.getFrequencyIndex(x);
            y = countlyUser.getFrequencyIndex(y);

            return ((x < y) ? -1 : ((x > y) ?  1 : 0));
        };

        jQuery.fn.dataTableExt.oSort['frequency-desc']  = function(x, y) {
            x = countlyUser.getFrequencyIndex(x);
            y = countlyUser.getFrequencyIndex(y);

            return ((x < y) ?  1 : ((x > y) ? -1 : 0));
        };

        jQuery.fn.dataTableExt.oSort['session-duration-asc']  = function(x, y) {
            x = countlySession.getDurationIndex(x);
            y = countlySession.getDurationIndex(y);

            return ((x < y) ? -1 : ((x > y) ?  1 : 0));
        };

        jQuery.fn.dataTableExt.oSort['session-duration-desc']  = function(x, y) {
            x = countlySession.getDurationIndex(x);
            y = countlySession.getDurationIndex(y);

            return ((x < y) ?  1 : ((x > y) ? -1 : 0));
        };
        
        jQuery.fn.dataTableExt.oSort['format-ago-asc']  = function(x, y) {
            return x-y;
        };

        jQuery.fn.dataTableExt.oSort['format-ago-desc']  = function(x, y) {
            return y-x;
        };
        
        function getFileName(ext){
            var name = "countly";
            if($(".widget-header .title").length)
                name = $(".widget-header .title").first().text();
            return (name.charAt(0).toUpperCase() + name.slice(1).toLowerCase())+"."+ext;
        }

        $.extend(true, $.fn.dataTable.defaults, {
            "sDom": '<"dataTable-top"lfpT>t<"dataTable-bottom"i>',
            "bAutoWidth": false,
            "bLengthChange":true,
            "bPaginate":true,
            "sPaginationType": "four_button",
            "iDisplayLength": 50,//(store.get("iDisplayLength")) ? parseInt(store.get("iDisplayLength")) : 50,
            "bDestroy": true,
            "bDeferRender": true,
            "oLanguage": {
				"sZeroRecords": jQuery.i18n.map["common.table.no-data"],
				"sInfoEmpty": jQuery.i18n.map["common.table.no-data"],
				"sEmptyTable": jQuery.i18n.map["common.table.no-data"],
				"sInfo": jQuery.i18n.map["common.showing"],
				"sInfoFiltered": jQuery.i18n.map["common.filtered"],
				"sSearch": jQuery.i18n.map["common.search"],
                "sLengthMenu": jQuery.i18n.map["common.show-items"]+"<input type='number' id='dataTables_length_input'/>"
			},
            "oTableTools": {
                "sSwfPath": countlyGlobal["cdn"]+"javascripts/dom/dataTables/swf/copy_csv_xls.swf",
                "aButtons": [
                    {
                        "sExtends": "csv",
                        "sButtonText": jQuery.i18n.map["common.save-to-csv"],
                        "fnClick": function (nButton, oConfig, flash) {
                            var tableCols = $(nButton).parents(".dataTables_wrapper").find(".dataTable").dataTable().fnSettings().aoColumns,
                                tableData = this.fnGetTableData(oConfig).split(/\r\n|\r|\n/g).join('","').split('","'),
                                retStr = "";
                                
                            //check if exported data needs to be processed by some other lib    
                            if(tableCols[0].sExport && app.dataExports[tableCols[0].sExport]){
                                
                                //get data to export
                                var data = app.dataExports[tableCols[0].sExport]();
                                
                                //get all columns
                                var cols = [];
                                for(var i = 0; i < data.length; i++){
                                    for(var col in data[i]){
                                         if(cols.indexOf(col) === -1)
                                             cols.push(col);
                                        
                                     }
                                }
                                
                                //generate data in the needed format
                                var tdata = JSON.parse(JSON.stringify(cols));
                                for(var i = 0; i < data.length; i++){
                                    for(var j = 0; j < cols.length; j++){
                                        tdata.push('"'+(data[i][cols[j]] || ""));
                                    }
                                }
                                
                                tableCols = cols;
                                tableData = tdata;
                            }

                            for (var i = 0;  i < tableData.length; i++) {
                                tableData[i] = tableData[i].replace(/^"/, "");

                                if (i >= tableCols.length) {
                                    var colIndex = i % tableCols.length;
                                     
                                    if (tableCols[colIndex].sType == "formatted-num") {
                                        tableData[i] = tableData[i].replace(/,/g, "");
                                    } else if (tableCols[colIndex].sType == "percent") {
                                        tableData[i] = tableData[i].replace("%", "");
                                    } else if (tableCols[colIndex].sType == "format-ago" || tableCols[colIndex].sType == "event-timeline") {
                                        tableData[i] = tableData[i].split("|").pop();
                                    }
                                }

                                if ((i + 1) % tableCols.length == 0) {
                                    retStr += "\"" + tableData[i] + "\"\r\n";
                                } else {
                                    retStr += "\"" + tableData[i] + "\", ";
                                }
                            }
                            flash.setFileName( getFileName("csv") );
                            this.fnSetText(flash, retStr);
                        }
                    },
                    {
                        "sExtends": "xls",
                        "sButtonText": jQuery.i18n.map["common.save-to-excel"],
                        "fnClick": function (nButton, oConfig, flash) {
                            var tableCols = $(nButton).parents(".dataTables_wrapper").find(".dataTable").dataTable().fnSettings().aoColumns,
                                tableData = this.fnGetTableData(oConfig).split(/\r\n|\r|\n/g).join('\t').split('\t'),
                                retStr = "";
                                
                            //check if exported data needs to be processed by some other lib    
                            if(tableCols[0].sExport && app.dataExports[tableCols[0].sExport]){
                                
                                //get data to export
                                var data = app.dataExports[tableCols[0].sExport]();
                                
                                //get all columns
                                var cols = [];
                                for(var i = 0; i < data.length; i++){
                                    for(var col in data[i]){
                                         if(cols.indexOf(col) === -1)
                                             cols.push(col);
                                        
                                     }
                                }
                                
                                //generate data in the needed format
                                var tdata = JSON.parse(JSON.stringify(cols));
                                for(var i = 0; i < data.length; i++){
                                    for(var j = 0; j < cols.length; j++){
                                        tdata.push(data[i][cols[j]] || "");
                                    }
                                }
                                
                                tableCols = cols;
                                tableData = tdata;
                            }

                            for (var i = 0;  i < tableData.length; i++) {
                                if (i >= tableCols.length) {
                                    var colIndex = i % tableCols.length;

                                    if (tableCols[colIndex].sType == "formatted-num") {
                                        tableData[i] = parseFloat(tableData[i].replace(/,/g, "")).toLocaleString();
                                    } else if (tableCols[colIndex].sType == "percent") {
                                        tableData[i] = parseFloat(tableData[i].replace("%", "")).toLocaleString();
                                    } else if (tableCols[colIndex].sType == "numeric") {
                                        tableData[i] = parseFloat(tableData[i]).toLocaleString();
                                    } else if (tableCols[colIndex].sType == "format-ago" || tableCols[colIndex].sType == "event-timeline") {
                                        tableData[i] = tableData[i].split("|").pop();
                                    }
                                }

                                if ((i + 1) % tableCols.length == 0) {
                                    retStr += tableData[i] + "\r\n";
                                } else {
                                    retStr += tableData[i] + "\t";
                                }
                            }
                            flash.setFileName( getFileName("xls") );
                            this.fnSetText(flash, retStr);
                        }
                    }
                ]
            },
            "fnInitComplete": function(oSettings, json) {
                var saveHTML = "<div class='save-table-data' data-help='help.datatables-export'><i class='fa fa-download'></i></div>",
                    searchHTML = "<div class='search-table-data'><i class='fa fa-search'></i></div>",
                    tableWrapper = $("#" + oSettings.sTableId + "_wrapper");

                $(saveHTML).insertBefore(tableWrapper.find(".DTTT_container"));
                $(searchHTML).insertBefore(tableWrapper.find(".dataTables_filter"));
                tableWrapper.find(".dataTables_filter").html(tableWrapper.find(".dataTables_filter").find("input").attr("Placeholder",jQuery.i18n.map["common.search"]).clone(true));

                tableWrapper.find(".save-table-data").on("click", function() {
                    if ($(this).next(".DTTT_container").css('visibility') == 'hidden') {
                        $(this).next(".DTTT_container").css("visibility", 'visible');
                    } else {
                        $(this).next(".DTTT_container").css("visibility", 'hidden');
                    }
                });

                tableWrapper.find(".search-table-data").on("click", function() {
                    $(this).next(".dataTables_filter").toggle();
                    $(this).next(".dataTables_filter").find("input").focus();
                });
                
                if(oSettings.oFeatures.bServerSide){
                    tableWrapper.find(".save-table-data").tipsy({gravity:$.fn.tipsy.autoNS, title:function () {
                        return ($(this).data("help")) ? jQuery.i18n.map[$(this).data("help")] : "";
                    }, fade:true, offset:5, cssClass:'yellow', opacity:1, html:true});
                    tableWrapper.find(".dataTables_length").show();
                    tableWrapper.find('#dataTables_length_input').bind( 'change.DT', function(e) {
                        //store.set("iDisplayLength", $(this).val());
                    });
                }
                else{
                    tableWrapper.find(".dataTables_length").hide();
                }

                //tableWrapper.css({"min-height": tableWrapper.height()});
            },
            fnPreDrawCallback: function(oSettings, json) {
                var tableWrapper = $("#" + oSettings.sTableId + "_wrapper");

                if (tableWrapper.find(".table-placeholder").length == 0) {
                    var $placeholder = $('<div class="table-placeholder"><div class="top"></div><div class="header"></div></div>');
                    tableWrapper.append($placeholder);
                }

                if (tableWrapper.find(".table-loader").length == 0) {
                    tableWrapper.append("<div class='table-loader'></div>");
                }
            },
            fnDrawCallback: function(oSettings) {
                var tableWrapper = $("#" + oSettings.sTableId + "_wrapper");
                tableWrapper.find(".dataTable-bottom").show();
                tableWrapper.find(".table-placeholder").remove();
                tableWrapper.find(".table-loader").remove();
            }
        });

        $.fn.dataTableExt.sErrMode = 'throw';
        $(document).ready(function () {
            setTimeout(function(){
                self.onAppSwitch(countlyCommon.ACTIVE_APP_ID, true);
            },1)
        });
    },
    localize:function (el) {
        var helpers = {
            onlyFirstUpper:function (str) {
                return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
            },
            upper:function (str) {
                return str.toUpperCase();
            }
        };

        // translate help module
        (el ? el.find('[data-help-localize]') : $("[data-help-localize]")).each(function () {
            var elem = $(this);
            if (elem.data("help-localize") != undefined) {
                elem.data("help", jQuery.i18n.map[elem.data("help-localize")]);
            }
        });

        // translate dashboard
        (el ? el.find('[data-localize]') : $("[data-localize]")).each(function () {
            var elem = $(this),
                toLocal = elem.data("localize").split("!"),
                localizedValue = "";

            if (toLocal.length == 2) {
                if (helpers[toLocal[0]]) {
                    localizedValue = helpers[toLocal[0]](jQuery.i18n.map[toLocal[1]]);
                } else {
                    localizedValue = jQuery.i18n.prop(toLocal[0], (toLocal[1])? jQuery.i18n.map[toLocal[1]] : "");
                }
            } else {
                localizedValue = jQuery.i18n.map[elem.data("localize")];
            }

            if (elem.is("input[type=text]") || elem.is("input[type=password]") || elem.is("textarea")) {
                elem.attr("placeholder", localizedValue);
            } else if (elem.is("input[type=button]") || elem.is("input[type=submit]")) {
                elem.attr("value", localizedValue);
            } else {
                elem.html(localizedValue);
            }
        });
    },
    tipsify: function(enable, el){
        var vs = el ? el.find('.help-zone-vs') : $('.help-zone-vs'),
            vb = el ? el.find('.help-zone-vb') : $('.help-zone-vb'),
            both = el ? el.find('.help-zone-vs, .help-zone-vb') : $(".help-zone-vs, .help-zone-vb");

        vb.tipsy({gravity:$.fn.tipsy.autoNS, trigger:'manual', title:function () {
            return $(this).data("help") || "";
        }, fade:true, offset:5, cssClass:'yellow', opacity:1, html:true});
        vs.tipsy({gravity:$.fn.tipsy.autoNS, trigger:'manual', title:function () {
            return $(this).data("help") || "";
        }, fade:true, offset:5, cssClass:'yellow narrow', opacity:1, html:true});

        if (enable) {
            both.off('mouseenter mouseleave')
                .on('mouseenter', function () {
                    $(this).tipsy("show");
                })
                .on('mouseleave', function () {
                    $(this).tipsy("hide");
                });
        } else {
           both.off('mouseenter mouseleave');
        }
    },
    addAppType:function(name, view){
        this.appTypes[name] = new view();
        var menu = $("#default-type").clone();
        menu.attr("id",name+"-type");
        $("#sidebar-menu").append(menu);
    },
    addAppSwitchCallback:function(callback){
        this.appSwitchCallbacks.push(callback);
    },
    addAppManagementSwitchCallback:function(callback){
        this.appManagementSwitchCallbacks.push(callback);
    },
    addAppObjectModificator:function(callback){
        this.appObjectModificators.push(callback);
    },
    addAppAddTypeCallback:function(callback){
        this.appAddTypeCallbacks.push(callback);
    },
    addDataExport:function(name, callback){
        this.dataExports[name] = callback;
    },
	addPageScript:function(view, callback){
		if(!this.pageScripts[view])
			this.pageScripts[view] = [];
		this.pageScripts[view].push(callback);
	},
	addRefreshScript:function(view, callback){
		if(!this.refreshScripts[view])
			this.refreshScripts[view] = [];
		this.refreshScripts[view].push(callback);
	},
    onAppSwitch:function(appId, refresh){
        if(appId != 0){
            jQuery.i18n.map = JSON.parse(app.origLang);
            if(!refresh){
                app.main(true);
                if (window.components && window.components.slider && window.components.slider.instance) {
                    window.components.slider.instance.close();
                }
            }
            $("#sidebar-menu .sidebar-menu").hide();
            var type = countlyGlobal["apps"][appId].type;
            if($("#sidebar-menu #"+type+"-type").length)
                $("#sidebar-menu #"+type+"-type").show();
            else
                $("#sidebar-menu #default-type").show();
            for(var i = 0; i < this.appSwitchCallbacks.length; i++){
                this.appSwitchCallbacks[i](appId);
            }
        }
    },
    onAppManagementSwitch:function(appId, type){
        for(var i = 0; i < this.appManagementSwitchCallbacks.length; i++){
            this.appManagementSwitchCallbacks[i](appId, type || countlyGlobal["apps"][appId].type);
        }
        if($("#app-add-name").length){
            var newAppName = $("#app-add-name").val();
            $("#app-container-new .name").text(newAppName);
            $(".new-app-name").text(newAppName);
        }
    },
    onAppAddTypeSwitch: function(type) {
        for(var i = 0; i < this.appAddTypeCallbacks.length; i++){
            this.appAddTypeCallbacks[i](type);
        }
    },
    pageScript:function () { //scripts to be executed on each view change
        $("#month").text(moment().year());
        $("#day").text(moment().format("MMM"));
        $("#yesterday").text(moment().subtract("days",1).format("Do"));

        var self = this;
        $(document).ready(function () {

            var selectedDateID = countlyCommon.getPeriod();

            if (Object.prototype.toString.call(selectedDateID) !== '[object Array]') {
                $("#" + selectedDateID).addClass("active");
            }
			
			if (Backbone.history.fragment == "/manage/apps") {
                $("#sidebar-app-select").addClass("disabled");
                $("#sidebar-app-select").removeClass("active");
            } else {
                $("#sidebar-app-select").removeClass("disabled");
            }
			
			if(self.pageScripts[Backbone.history.fragment])
				for(var i = 0, l = self.pageScripts[Backbone.history.fragment].length; i < l; i++)
					self.pageScripts[Backbone.history.fragment][i]();
            for(var k in self.pageScripts) 
                if (k !== '#' && k.indexOf('#') !== -1 && Backbone.history.fragment.match(k.replace(/#/g, '.*')))
                    for(var i = 0, l = self.pageScripts[k].length; i < l; i++)
                        self.pageScripts[k][i]();
			if(self.pageScripts["#"])
				for(var i = 0, l = self.pageScripts["#"].length; i < l; i++)
					self.pageScripts["#"][i]();

            // Translate all elements with a data-help-localize or data-localize attribute
            self.localize();

            if ($("#help-toggle").hasClass("active")) {
                $('.help-zone-vb').tipsy({gravity:$.fn.tipsy.autoNS, trigger:'manual', title:function () {
                    return ($(this).data("help")) ? $(this).data("help") : "";
                }, fade:true, offset:5, cssClass:'yellow', opacity:1, html:true});
                $('.help-zone-vs').tipsy({gravity:$.fn.tipsy.autoNS, trigger:'manual', title:function () {
                    return ($(this).data("help")) ? $(this).data("help") : "";
                }, fade:true, offset:5, cssClass:'yellow narrow', opacity:1, html:true});

                $.idleTimer('destroy');
                clearInterval(self.refreshActiveView);
                $(".help-zone-vs, .help-zone-vb").hover(
                    function () {
                        $(this).tipsy("show");
                    },
                    function () {
                        $(this).tipsy("hide");
                    }
                );
            }

            $(".usparkline").peity("bar", { width:"100%", height:"30", colour:"#6BB96E", strokeColour:"#6BB96E", strokeWidth:2 });
            $(".dsparkline").peity("bar", { width:"100%", height:"30", colour:"#C94C4C", strokeColour:"#C94C4C", strokeWidth:2 });

            CountlyHelpers.setUpDateSelectors(self.activeView); 

            $(window).click(function () {
                $("#date-picker").hide();
                $(".cly-select").removeClass("active");
            });

            $("#date-picker").click(function (e) {
                e.stopPropagation();
            });

            $("#date-picker-button").click(function (e) {
                $("#date-picker").toggle();

                if (self.dateToSelected) {
                    dateTo.datepicker("setDate", moment(self.dateToSelected).toDate());
                    dateFrom.datepicker("option", "maxDate", moment(self.dateToSelected).toDate());
                } else {
                    self.dateToSelected = moment().toDate().getTime();
                    dateTo.datepicker("setDate",moment().toDate());
                    dateFrom.datepicker("option", "maxDate", moment(self.dateToSelected).toDate());
                }

                if (self.dateFromSelected) {
                    dateFrom.datepicker("setDate", moment(self.dateFromSelected).toDate());
                    dateTo.datepicker("option", "minDate", moment(self.dateFromSelected).toDate());
                } else {
                    extendDate = moment(dateTo.datepicker("getDate")).subtract('days', 30).toDate();
                    dateFrom.datepicker("setDate", extendDate);
                    self.dateFromSelected = moment(dateTo.datepicker("getDate")).subtract('days', 30).toDate().getTime();
                    dateTo.datepicker("option", "minDate", moment(self.dateFromSelected).toDate());
                }

                setSelectedDate();
                e.stopPropagation();
            });

            var dateTo = $("#date-to").datepicker({
                numberOfMonths:1,
                showOtherMonths:true,
                maxDate:moment().toDate(),
                onSelect:function (selectedDate) {
                    var instance = $(this).data("datepicker"),
                        date = $.datepicker.parseDate(instance.settings.dateFormat || $.datepicker._defaults.dateFormat, selectedDate, instance.settings);

                    if (date.getTime() < self.dateFromSelected) {
                        self.dateFromSelected = date.getTime();
                    }

                    dateFrom.datepicker("option", "maxDate", date);
                    self.dateToSelected = date.getTime();

                    setSelectedDate();
                }
            });

            var dateFrom = $("#date-from").datepicker({
                numberOfMonths:1,
                showOtherMonths:true,
                maxDate:moment().subtract('days', 1).toDate(),
                onSelect:function (selectedDate) {
                    var instance = $(this).data("datepicker"),
                        date = $.datepicker.parseDate(instance.settings.dateFormat || $.datepicker._defaults.dateFormat, selectedDate, instance.settings);

                    if (date.getTime() > self.dateToSelected) {
                        self.dateToSelected = date.getTime();
                    }

                    dateTo.datepicker("option", "minDate", date);
                    self.dateFromSelected = date.getTime();

                    setSelectedDate();
                }
            });

            function setSelectedDate() {
                var from = moment(dateFrom.datepicker("getDate")).format("D MMM, YYYY"),
                    to = moment(dateTo.datepicker("getDate")).format("D MMM, YYYY");

                $("#selected-date").text(from + " - " + to);
            }

            $.datepicker.setDefaults($.datepicker.regional[""]);
            $("#date-to").datepicker("option", $.datepicker.regional[countlyCommon.BROWSER_LANG]);
            $("#date-from").datepicker("option", $.datepicker.regional[countlyCommon.BROWSER_LANG]);

            $("#date-submit").click(function () {
                if (!self.dateFromSelected && !self.dateToSelected) {
                    return false;
                }

                var tzCorr = countlyCommon.getOffsetCorrectionForTimestamp(self.dateFromSelected);
                countlyCommon.setPeriod([self.dateFromSelected - tzCorr, self.dateToSelected - tzCorr]);

                self.activeView.dateChanged();

                $(".date-selector").removeClass("selected").removeClass("active");
            });

            $('.scrollable').slimScroll({
                height:'100%',
                start:'top',
                wheelStep:10,
                position:'right',
                disableFadeOut:true
            });

            $(".checkbox").on('click', function () {
                $(this).toggleClass("checked");
            });

            $(".resource-link").on('click', function() {
                if ($(this).data("link")) {
                    CountlyHelpers.openResource($(this).data("link"));
                }
            });

            $("#sidebar-menu").find(".item").each(function(i) {
                if ($(this).next().hasClass("sidebar-submenu") && $(this).find(".ion-chevron-right").length == 0) {
                    $(this).append("<span class='ion-chevron-right'></span>");
                }
            });

            $('.nav-search').on('input', "input", function(e){
                var searchText = new RegExp($(this).val().toLowerCase()),
                    searchInside = $(this).parent().next().find(".searchable");

                searchInside.filter(function () {
                    return !(searchText.test($(this).text().toLowerCase()));
                }).css('display','none');

                searchInside.filter(function () {
                    return searchText.test($(this).text().toLowerCase());
                }).css('display','block');
            });

            $(document).on('input', "#listof-apps .search input", function(e) {
                var searchText = new RegExp($(this).val().toLowerCase()),
                    searchInside = $(this).parent().next().find(".searchable");

                searchInside.filter(function () {
                    return !(searchText.test($(this).text().toLowerCase()));
                }).css('display','none');

                searchInside.filter(function () {
                    return searchText.test($(this).text().toLowerCase());
                }).css('display','block');
            });

            $(document).on('mouseenter', ".bar-inner", function(e) {
                var number = $(this).parent().next();

                number.text($(this).data("item"));
                number.css({"color":$(this).css("background-color")});
            });

            $(document).on('mouseleave', ".bar-inner", function(e) {
                var number = $(this).parent().next();

                number.text(number.data("item"));
                number.css({"color":$(this).parent().find(".bar-inner:first-child").css("background-color")});
            });
        });
    }
});

var app = new AppRouter();