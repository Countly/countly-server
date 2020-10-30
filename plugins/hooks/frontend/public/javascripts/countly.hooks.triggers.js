/*global
  jQuery
 */

(function(hooksPlugin, jQuery) {
    var _hookTriggers = {
        
        "IncomingDataTrigger": {
            name: jQuery.i18n.map["hooks.IncomingDataTrigger"],
            init: function() {
                var self = this;
                self.filterObj = {};
                $("#multi-app-dropdown").on("cly-multi-select-change", function(e) {
                    self.loadEventsData();
                });
                this.loadEventsData(); 
                $.when(countlySegmentation.initialize("[CLY]_session")).then(function() {
                    self.initDrill();
                });
                $("#multi-event-dropdown").on("cly-multi-select-change", function(e) {
                    var events = $("#multi-event-dropdown").clyMultiSelectGetSelection();
                    countlySegmentation.reset();
                    self.filterObj={};
                    $("#filter-blocks").empty();

                    if (events.length === 1) {
                        var currEvent = events[0].split("***")[1];
                        $.when(countlySegmentation.initialize(currEvent)).then(function() {
                            $("#filter-definition").show();
                            self.adjustFilters();
                            if(self.tmpFilterCall) {
                                self.tmpFilterCall();
                                self.tmpFilterCall = null;
                            }
                        });
                    } else {
                        $("#filter-definition").hide();
                    }
                });
            },
            renderConfig: function(trigger) {
                var self = this;
                setTimeout(function() {
                    self.loadEventsData(trigger.configuration);
                    self.tmpFilterCall = function () {
                        try {
                            var filter = JSON.parse(trigger.configuration.filter);
                            self.loadFilters(filter.dbFilter);
                        } catch (e) {
                            console.log(e);
                        }
                    }
                }, 500);
            },
            getValidConfig: function() {
                var self = this;
                var filter = self.getFilterObjAndByVal();
                var configuration = {
                    event: $("#multi-event-dropdown").clyMultiSelectGetSelection(),
                    filter: JSON.stringify(filter),
                }
                return configuration;
            },
            loadEventsData: function (configuration) {
                $("#multi-event-dropdown").clyMultiSelectClearSelection({});
                $("#multi-event-dropdown").clyMultiSelectSetItems([]);
                // only one app 
                var apps = $("#multi-app-dropdown").clyMultiSelectGetSelection();
                if (apps.length !== 1) {
                     return;
                }
                countlyEvent.getEventsForApps(apps, function(events){
                    $.ajax({
                        type: "GET",
                        url: countlyCommon.API_URL + '/o/internal-events',
                        data: {
                            app_id: apps[0], 
                        },
                        success: function(json) {
                            var internal_events = []; 
                            json.forEach(function(event) {
                                internal_events.push({value: apps[0]+"***"+event, name: jQuery.i18n.map["internal-events." + event] || event, description: '', count: '', sum: ''});
                            });
                            events = events.concat(internal_events);
                            events.unshift({value: apps[0]+"****", name: jQuery.i18n.map["hooks.any-events"]});
                            $("#multi-event-dropdown").clyMultiSelectSetItems(events);
                            if(configuration && configuration.event) {
                                events.forEach(function(event){
                                    if (event.value === configuration.event[0]) {
                                        $("#multi-event-dropdown").clyMultiSelectSetSelection([event]);
                                    }
                                });
                            }
                        }
                    });
                    
                    
                });
            },
            initDrill: function() {
                var self = this;
                this.filterObj = {};

                var usedFilters = {},
                    currEvent = "";

                /**
                 * get filters from UI
                 * @return {object} allFilters: filter objects
                 */
                function getFilters() {
                    usedFilters = {};

                    $(".query:visible").each(function() {
                        var filterType = $(this).find(".filter-name .text").data("type");

                        // number and date types can be used multiple times for range queries
                        if (filterType !== "n" && filterType !== "d") {
                            usedFilters[$(this).find(".filter-name .text").data("value")] = true;
                        }
                    });

                    var filters_all = countlySegmentation.getFilters(countlySegmentation.getActiveEvent() === "[CLY]_session"),
                        allFilters = "";
                    for (var i = 0; i < filters_all.length; i++) {
                        if (filters_all[i].id && filters_all[i].id === "did") {
                            filters_all.splice(i, 0, {id: "up.ua", name: jQuery.i18n.map["block.ua"], type: "s"});
                            filters_all.splice(i, 0, {id: "up.referer", name: jQuery.i18n.map["block.referer"], type: "s"});
                            filters_all.splice(i, 0, {id: "up.hostname", name: jQuery.i18n.map["block.hostname"], type: "s"});
                            filters_all.splice(i, 0, {id: "up.ip", name: jQuery.i18n.map["block.ip-address"], type: "s"});
                            break;
                        }

                    }
                    var filters = [];
                    var ignore = ["up.sc", "chr", "up.lv", "up.cdfs", "up.cadfs", "up.cwfs", "up.cawfs", "up.cmfs", "up.camfs", "up.hour", "up.dow"];
                    for (var m = 0; m < filters_all.length; m++) {
                        if (filters_all[m].type !== "d" && ignore.indexOf(filters_all[m].id) === -1 && filters_all[m].name !== jQuery.i18n.map["drill.cmp-props"] && (!filters_all[m].id || filters_all[m].id.indexOf("cmp.") === -1)) {
                            filters.push(filters_all[m]);
                        }
                    }

                    if (filters.length === 0) {
                        CountlyHelpers.alert(jQuery.i18n.map["drill.no-filters"], "black");
                    }

                    for (var n = 0; n < filters.length; n++) {
                        if (typeof filters[n].id !== "undefined") {
                            if (usedFilters[filters[n].id] === true) {
                                continue;
                            }

                            var tmpItem = $("<div>");

                            tmpItem.addClass("item");
                            tmpItem.attr("data-type", filters[n].type);
                            tmpItem.attr("data-value", filters[n].id);
                            tmpItem.text(filters[n].name);

                            allFilters += tmpItem.prop('outerHTML');
                        }
                        else {
                            tmpItem = $("<div>");

                            tmpItem.addClass("group");
                            tmpItem.text(filters[n].name);

                            allFilters += tmpItem.prop('outerHTML');
                        }
                    }

                    return allFilters;
                }
                /**
                 * get filter object "by" & "and" val
                 * @return {object}
                 * return format:
                 *  {
                        bookmarkText: bookmarkText,
                        dbFilter: dbFilter,
                        byVal: byVal,
                        byValText: byValText
                    };
                 */
                function getFilterObjAndByVal() {
                    return self.getFilterObjAndByVal();
                }
                /**
                 * init apply function
                 */
                function initApply() {

                }

                $(".event-select").on("click", function() {
                    var allEvents = countlyEvent.getEvents().concat(self.internal_events),
                        eventStr = "";
                    allEvents.unshift({key: "*", name: jQuery.i18n.map["hooks.any-events"]});
                    for (var i = 0; i < allEvents.length; i++) {
                        var tmpItem = $("<div>");

                        tmpItem.addClass("item");
                        tmpItem.attr("data-value", allEvents[i].key);
                        tmpItem.text(allEvents[i].name);

                        eventStr += tmpItem.prop('outerHTML');
                    }

                    $(this).find(".select-items>div").html(eventStr);
                });

                $(".event-select").on("click", ".item", function() {
                    var selectedItem = $(this).parents(".cly-select").find(".text");
                    selectedItem.text($(this).text());
                    selectedItem.data("value", $(this).data("value"));

                    currEvent = $(this).data("value");

                    if (currEvent === "*") {
                        currEvent = "[CLY]_session";
                    }

                    $(this).parents(".cly-select").removeClass("dark");

                    countlySegmentation.reset();
                    $("#segmentation .query:visible").find(".delete").trigger("click");
                    $.when(countlySegmentation.initialize(currEvent)).then(function() {
                        self.adjustFilters();
                    });
                });

                $("#segmentation").on("click", ".filter-connector", function() {
                    var byUsed = false;
                    $(".query:visible").each(function() {
                        byUsed = byUsed || ($(this).find(".filter-connector .text").data("value") === "BY");
                    });

                    if (byUsed) {
                        $(this).find(".item.by").hide();
                    }
                    else {
                        $(this).find(".item.by").show();
                    }
                });

                $("#segmentation").on("click", ".filter-name", function() {
                    if ($(this).parents(".query").find(".filter-connector .text").data("value") === "OR") {
                        var existingFilters = [],
                            orFilters = [],
                            orFilterStr = "";

                        $(".query:visible:not(.by)").each(function() {
                            if ($(this).find(".filter-name .text").text() === jQuery.i18n.map["drill.select-filter"]) {
                                return false;
                            }

                            if (existingFilters.indexOf($(this).find(".filter-name .text").data("value")) === -1) {
                                var filterType = $(this).find(".filter-type .text").data("value");
                                if (filterType !== "rgxcn" && filterType !== "rgxntc") {
                                    //rgxcn and rgxntc are allowed only once per filter
                                    orFilters.push({
                                        type: $(this).find(".filter-name .text").data("type"),
                                        id: $(this).find(".filter-name .text").data("value"),
                                        name: $(this).find(".filter-name .text").text()
                                    });
                                }

                                existingFilters.push($(this).find(".filter-name .text").data("value"));
                            }
                        });

                        for (var i = 0; i < orFilters.length; i++) {
                            var tmpItem = $("<div>");

                            tmpItem.addClass("item");
                            tmpItem.attr("data-type", orFilters[i].type);
                            tmpItem.attr("data-value", orFilters[i].id);
                            tmpItem.text(orFilters[i].name);

                            orFilterStr += tmpItem.prop('outerHTML');
                        }

                        $(this).find(".select-items>div").html(orFilterStr);
                    }
                    else {
                        $(this).find(".select-items>div").html(getFilters());
                    }

                    initApply();
                });

                $("#segmentation").on("click", ".filter-name .item", function() {
                    if ($(this).parents(".query").find(".filter-connector .text").data("value") !== "BY") {
                        $(this).parents(".filter-name").siblings(".filter-type").replaceWith($("#defalt-filter-block").clone(true).find(".filter-type"));
                        $(this).parents(".filter-name").siblings(".filter-type").removeClass("disabled");

                        $(this).parents(".filter-name").siblings(".filter-value").addClass("hidden");

                        if ($(this).data("type") === "l") {
                            $(this).parents(".filter-name").siblings(".filter-value.list").removeClass("hidden");
                            $(this).parents(".filter-name").siblings(".filter-value.list").removeClass("big-list");
                            $(this).parents(".filter-name").siblings(".filter-value").find(".text").text("");
                            $(this).parents(".filter-name").siblings(".filter-value").find(".text").data("value", "");
                            $(this).parents(".filter-name").siblings(".filter-value").removeClass("disabled");
                            $(this).parents(".filter-name").siblings(".filter-type").find(".item.num").hide();
                        }
                        else if ($(this).data("type") === "bl") {
                            $(this).parents(".filter-name").siblings(".filter-value.list").removeClass("hidden");
                            $(this).parents(".filter-name").siblings(".filter-value.list").addClass("big-list");
                            $(this).parents(".filter-name").siblings(".filter-value").find(".text").text("");
                            $(this).parents(".filter-name").siblings(".filter-value").find(".text").data("value", "");
                            $(this).parents(".filter-name").siblings(".filter-value").removeClass("disabled");
                            $(this).parents(".filter-name").siblings(".filter-type").find(".item.num").hide();
                        }
                        else if ($(this).data("type") === "n") {
                            $(this).parents(".filter-name").siblings(".filter-value.num").removeClass("hidden");
                            $(this).parents(".filter-name").siblings(".filter-type").find(".item.num").show();
                        }
                        else if ($(this).data("type") === "s") {
                            $(this).parents(".filter-name").siblings(".filter-value.string").removeClass("hidden");
                            $(this).parents(".filter-name").siblings(".filter-type").find(".item.num").hide();
                        }
                        else if ($(this).data("type") === "d") {
                            $(this).parents(".filter-name").siblings(".filter-value.date").removeClass("hidden");
                            $(this).parents(".filter-name").siblings(".filter-type").find(".item.eq").hide();
                            $(this).parents(".filter-name").siblings(".filter-type").find(".item.num").hide();
                            $(this).parents(".filter-name").siblings(".filter-type").find(".item.lt").show();
                            $(this).parents(".filter-name").siblings(".filter-type").find(".item.lte").hide();
                            $(this).parents(".filter-name").siblings(".filter-type").find(".item.gte").show();
                            $(this).parents(".filter-name").siblings(".filter-type").find(".item.gte").trigger("click");
                            $(this).parents(".filter-name").siblings(".filter-value.date").find(".open-date-picker").trigger("click");
                        }
                    }

                    $(this).parents(".query").find(".filter-value.num input").val("");
                    $(this).parents(".query").find(".filter-value.date input").val("");
                    $(this).parents(".query").find(".filter-value.date input").data("timestamp", null);
                    $(this).parents(".query").find(".filter-value.string input").val("");

                    var that = $(this).parents(".query").find(".filter-value .select-items>div");
                    that.html("<div></div>");

                    /**
                     * set up filter vlaues
                     * @param {array} filterValues filter value list
                     * @param {array} filterNames filter name list
                     * @param {array} biglist is big list
                     */
                    function setUpFilterValues(filterValues, filterNames, biglist) {
                        var filterValStr = "";

                        if (biglist) {
                            tmpItem = $("<div>");
                            tmpItem.addClass("warning");
                            tmpItem.text(jQuery.i18n.map["drill.big-list-warning"]);
                            filterValStr += tmpItem.prop('outerHTML');
                        }

                        if (jQuery.isArray(filterValues)) {
                            for (var i = 0; i < filterValues.length; i++) {
                                tmpItem = $("<div>");

                                tmpItem.addClass("item");
                                tmpItem.attr("data-value", filterValues[i]);
                                tmpItem.text(filterNames[i]);

                                filterValStr += tmpItem.prop('outerHTML');
                            }
                        }
                        else {
                            for (var p in filterValues) {
                                var tmpItem = $("<div>");
                                tmpItem.addClass("group");
                                tmpItem.text(p);

                                filterValStr += tmpItem.prop('outerHTML');
                                for (var q = 0; q < filterValues[p].length; q++) {
                                    tmpItem = $("<div>");

                                    tmpItem.addClass("item");
                                    tmpItem.attr("data-value", filterValues[p][q]);
                                    tmpItem.text(countlyCommon.decode(filterValues[p][q]));

                                    filterValStr += tmpItem.prop('outerHTML');
                                }
                            }
                        }

                        that.html(filterValStr);
                    }

                    if ($(this).data("type") === "bl") {
                        var prop = $(this).data("value");
                        var thisQuery = $(this).parents(".query");
                        thisQuery.find(".filter-value").addClass("loading");

                        countlySegmentation.getBigListMetaData(prop, null, function(values, names) {
                            thisQuery.find(".filter-value").removeClass("loading");
                            var list_limit = countlyGlobal.list_limit;
                            if (countlyGlobal.apps && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].plugins && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].plugins.drill && typeof countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].plugins.drill.list_limit !== "undefined") {
                                list_limit = countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].plugins.drill.list_limit;
                            }
                            setUpFilterValues(values, names, names.length >= list_limit);
                            var timeout = null;
                            thisQuery.find(".filter-value").on("keyup", ".search input", function(e) {
                                e.stopPropagation();
                                var search = $(this).val();
                                var parent = $(this).parents(".filter-value").find(".select-items");
                                if (!parent.find(".table-loader").length) {
                                    parent.prepend("<div class='table-loader'></div>");
                                }
                                if (timeout) {
                                    clearTimeout(timeout);
                                    timeout = null;
                                }
                                timeout = setTimeout(function() {
                                    countlySegmentation.getBigListMetaData(prop, search, function(vList, nList) {
                                        parent.find(".table-loader").remove();
                                        setUpFilterValues(vList, nList, nList.length >= list_limit);
                                    });
                                }, 1000);
                            });
                        });
                    }
                    else {
                        setUpFilterValues(countlySegmentation.getFilterValues($(this).data("value")), countlySegmentation.getFilterNames($(this).data("value")));
                    }

                    var selectedItem = $(this).parents(".cly-select").find(".text");
                    selectedItem.text($(this).text());
                    selectedItem.data("value", $(this).data("value"));
                    selectedItem.data("type", $(this).data("type"));
                });

                $("#segmentation").on("click", ".filter-value .item", function() {
                    setTimeout(function() {
                        initApply();
                    }, 0);
                });

                $("#segmentation").on("keyup", ".filter-value input", function() {
                    initApply();
                });

                $("#segmentation").on("keydown", ".filter-value.num input", function(event) {
                    // Allow: backspace, delete, tab, escape, and enter
                    if (event.keyCode === 46 || event.keyCode === 8 || event.keyCode === 9 || event.keyCode === 27 || event.keyCode === 13 ||
                        // Allow: Ctrl+A
                        (event.keyCode === 65 && event.ctrlKey === true) ||
                        // Allow: home, end, left, right
                        (event.keyCode >= 35 && event.keyCode <= 39)) {
                        // let it happen, don't do anything
                        return;
                    }
                    else {
                        // Ensure that it is a number and stop the keypress
                        if (event.shiftKey || (event.keyCode < 48 || event.keyCode > 57) && (event.keyCode < 96 || event.keyCode > 105)) {
                            event.preventDefault();
                        }
                    }
                });

                $("#segmentation").on("keydown", ".filter-value.date input", function(event) {
                    event.preventDefault();
                });

                $("#segmentation").on("click", ".filter-connector .item", function() {
                    $(this).parents(".query").find(".filters").replaceWith($("#defalt-filter-block").clone(true).find(".filters"));

                    $(".query:visible:not(:last)").find(".filter-name").addClass("disabled");
                    $(".query:visible:not(:last)").find(".filter-type").addClass("disabled");
                    self.adjustFilters();

                    $(this).parents(".query").removeClass("by");

                    if ($(this).data("value") === "BY") {
                        $(this).parents(".query").addClass("by");
                        $(this).parents(".query").find(".filter-type").hide();
                        $(this).parents(".query").find(".filter-value").hide();
                        $(this).parents(".query").find(".filter-connector").addClass("disabled");
                    }
                    initApply();
                });

                $("#segmentation").on("click", ".query .delete", function() {
                    $(this).parent(".query").remove();
                    $(".query:visible:last-child").find(".filter-name").removeClass("disabled");
                    $(".query:visible:last-child").find(".filter-type").removeClass("disabled");
                    self.adjustFilters();
                    initApply();
                    var filterData = getFilterObjAndByVal();
                    self.filterObj = filterData.dbFilter;
                });

                $("#segmentation").on("click", ".open-date-picker", function(e) {
                    $(this).next(".date-picker").show();
                    $(this).next(".date-picker").find(".calendar").datepicker({
                        numberOfMonths: 1,
                        showOtherMonths: true,
                        maxDate: moment().subtract(1, 'days').toDate(),
                        onSelect: function(selectedDate) {
                            var instance = $(this).data("datepicker"),
                                date = $.datepicker.parseDate(instance.settings.dateFormat || $.datepicker._defaults.dateFormat, selectedDate, instance.settings),
                                currMoment = moment(date);

                            $(this).parents(".date-picker").prev(".open-date-picker").val(countlyCommon.formatDate(moment(date), "DD MMMM, YYYY"));
                            $(this).parents(".date-picker").prev(".open-date-picker").data("timestamp", moment(currMoment.format("DD MMMM, YYYY"), "DD MMMM, YYYY").unix());
                            $(".date-picker").hide();
                            initApply();
                        }
                    });

                    $.datepicker.setDefaults($.datepicker.regional[""]);
                    $(this).next(".date-picker").find(".calendar").datepicker("option", $.datepicker.regional[countlyCommon.BROWSER_LANG]);

                    $(this).next(".date-picker").click(function(event) {
                        event.stopPropagation();
                    });

                    e.stopPropagation();
                });

                $("#filter-add-button").on("click", function() {
                    if ($(".query:visible:not(.by):last").find(".filter-name .text").text() === jQuery.i18n.map["drill.select-filter"]) {
                        $(".query:visible:not(.by):last").find(".filter-name").addClass("req");
                        return false;
                    }

                    var filterBlocks = $("#filter-blocks"),
                        defaultFilters = $("#defalt-filter-block").html();

                    filterBlocks.append(defaultFilters);
                    $(".query:visible:not(:last)").find(".filter-name").addClass("disabled");
                    $(".query:visible:not(:last)").find(".filter-type").addClass("disabled");

                    var byFilter = $("#filter-blocks").find(".query.by").clone(true);
                    $("#filter-blocks").find(".query.by").remove();
                    $("#filter-blocks").append(byFilter);

                    self.adjustFilters();
                });

                $("#apply-filter").on("click", function() {
                    if ($(this).hasClass("disabled")) {
                        return true;
                    }

                    self.showLoader = true;
                    var filterData = getFilterObjAndByVal();
                    self.filterObj = filterData.dbFilter;

                    self.loadAndRefresh();
                });

                self.adjustFilters();

                $(window).click(function() {
                    $(".date-picker").hide();
                });
            },
            adjustFilters: function() {
                if (!$("#filter-definition").is(":visible")) {
                    return;
                }

                var queryCount = $("#filter-blocks").find(".query:visible").length;

                if (queryCount === 0) {
                    $("#filter-add-button").trigger("click");
                }

                $(".query:visible").each(function(index) {
                    if (queryCount > 1) {
                        $(this).find(".and-or").show();

                        if (index === 0) {
                            $(this).find(".and-or").hide();
                        }

                        if (index === (queryCount - 1)) {
                            $(this).find(".filter-connector").removeClass("disabled");
                        }
                        else {
                            $(this).find(".filter-connector").addClass("disabled");
                        }
                    }
                    else {
                        $(this).find(".and-or").hide();
                    }

                    if ($(this).find(".filter-connector .text").data("value") === "BY") {
                        $(this).find(".cly-select").removeClass("disabled");
                        $(this).find(".filter-connector").addClass("disabled");
                        $(this).prev(".query").find(".filter-connector").removeClass("disabled");
                        $(this).prev(".query").find(".filter-name").removeClass("disabled");

                        if ($(this).prev(".query").find(".filter-name .text").text() !== "Select a Filter") {
                            $(this).prev(".query").find(".filter-type").removeClass("disabled");
                        }
                    }
                });

                setTimeout(function() {
                    $("#filter-blocks").removeClass("empty");
                }, 0);
            },
            getFilterObjAndByVal: function() {
                var filterObj = {},
                    filterObjTypes = {},
                    byVal = "",
                    byValText = "",
                    bookmarkText = "";

                $(".query:visible").each(function(index) {
                    var tmpConnector = $(this).find(".filter-connector .text").data("value"),
                        tmpText = $(this).find(".filter-name .text").text(),
                        tmpTypeText = $(this).find(".filter-type .text").text(),
                        tmpValText = $(this).find(".filter-value.num input").val() ||
                        $(this).find(".filter-value.date input").val() ||
                        $(this).find(".filter-value.string input").val() ||
                        $(this).find(".filter-value .text").text(),
                        tmpName = $(this).find(".filter-name .text").data("value"),
                        tmpType = $(this).find(".filter-type .text").data("value"),
                        tmpVal = $(this).find(".filter-value.num input").val() ||
                        $(this).find(".filter-value.date input").data("timestamp") ||
                        $(this).find(".filter-value.string input").val() ||
                        $(this).find(".filter-value .text").data("value"),
                        tmpDataType = $(this).find(".filter-name .text").data("type");

                    if (typeof tmpVal === "boolean") {
                        tmpVal = tmpVal + "";
                    }

                    if (tmpConnector !== "BY") {
                        if (!tmpVal) {
                            return true;
                        }

                        if (tmpConnector && index !== 0) {
                            bookmarkText += " [" + tmpConnector + "] ";
                        }

                        bookmarkText += tmpText + " " + tmpTypeText + " " + tmpValText;

                        if (!filterObj[tmpName]) {
                            filterObj[tmpName] = [];
                        }

                        if (!filterObjTypes[tmpName]) {
                            filterObjTypes[tmpName] = [];
                        }

                        if (tmpDataType === "d" || tmpDataType === "n" || (tmpName.indexOf("custom.") === 0 && $.isNumeric(tmpVal))) {
                            tmpVal = parseInt(tmpVal, 10);
                        }

                        var exp = {};

                        if (tmpType === "=" || tmpType === "!=") {
                            exp = tmpVal;
                        }
                        else {
                            exp[tmpType] = tmpVal;
                        }

                        filterObj[tmpName].push(exp);
                        filterObjTypes[tmpName].push(tmpType);
                    }
                    else {
                        byVal = tmpName;
                        byValText = tmpText;
                    }
                });

                var dbFilter = {};

                for (var filter in filterObj) {
                    dbFilter[filter] = {};
                    for (var i = 0; i < filterObj[filter].length; i++) {
                        if (_.isObject(filterObj[filter][i])) {
                            for (var tmpFilter in filterObj[filter][i]) {
                                dbFilter[filter][tmpFilter] = filterObj[filter][i][tmpFilter];
                            }
                        }
                        else if (filterObjTypes[filter][i] === "!=") {
                            if (!dbFilter[filter].$nin) {
                                dbFilter[filter].$nin = [];
                            }

                            dbFilter[filter].$nin.push(filterObj[filter][i]);
                        }
                        else {
                            if (!dbFilter[filter].$in) {
                                dbFilter[filter].$in = [];
                            }

                            dbFilter[filter].$in.push(filterObj[filter][i]);
                        }
                    }
                }

                return {
                    bookmarkText: bookmarkText,
                    dbFilter: dbFilter,
                    byVal: byVal,
                    byValText: byValText
                };
            },
            loadFilters: function(editRules) {
                /*eslint-disable */
                var self = this;
                for (key in editRules) {
                    var currentFilter = returnCurrentFilter(key) || {};
                    var rules = editRules[key].$in;
                    var keyValueLength = rules && rules.length;
                    var isIn = false;
                    var isNotIn = false;

                    for (var i = 0; i < keyValueLength; i++) {
                        isIn = true;
                        addEditFilters(i, "=", "drill.opr.is");
                    }

                    rules = editRules[key].$nin;
                    keyValueLength = rules && rules.length;

                    for (var i = 0; i < keyValueLength; i++) {
                        isNotIn = true;
                        addEditFilters(i, "!=", "drill.opr.is-not");
                    }

                    rules = editRules[key].rgxcn;
                    if (rules && rules.length) {
                        rules = [rules];
                        isNotIn = true;
                        addEditFilters(0, "rgxcn", "drill.opr.contains");
                    }

                    rules = editRules[key].rgxntc;
                    if (rules && rules.length) {
                        rules = [rules];
                        isNotIn = true;
                        addEditFilters(0, "rgxntc", "drill.opr.notcontain");
                    }

                    function addEditFilters(i, operator, opText) {
                        $("#filter-add-button").trigger("click");
                        var selectedItem = $(".query:visible:last").find(".filter-name .text");
                        var connector = $(".query:visible:last").find(".filter-connector .text");
                        var filterType = $(".query:visible:last").find(".filter-type .text");

                        filterType.text(jQuery.i18n.map[opText]);
                        filterType.data("value", operator);

                        selectedItem.text(currentFilter.name);
                        selectedItem.data("value", currentFilter.id);
                        selectedItem.data("type", currentFilter.type);
                        if (i > 0 || (isIn && isNotIn)) {
                            connector.text(jQuery.i18n.map["drill.or"]);
                            connector.data("value", "OR");
                        }

                        function setFilterValues(value) {
                            if (connector.data("value") != "BY") {
                                selectedItem.parents(".filter-name").siblings(".filter-type").removeClass("disabled");
                                selectedItem.parents(".filter-name").siblings(".filter-value").addClass("hidden");

                                if (currentFilter.type == "l") {
                                    selectedItem.parents(".filter-name").siblings(".filter-value.list").removeClass("hidden");
                                    selectedItem.parents(".filter-name").siblings(".filter-value.list").removeClass("big-list");
                                    selectedItem.parents(".filter-name").siblings(".filter-value").find(".text").text("");
                                    selectedItem.parents(".filter-name").siblings(".filter-value").find(".text").data("value", "");
                                    selectedItem.parents(".filter-name").siblings(".filter-value").removeClass("disabled");
                                    selectedItem.parents(".filter-name").siblings(".filter-type").find(".item.num").hide();
                                }
                                else if (currentFilter.type == "bl") {
                                    selectedItem.parents(".filter-name").siblings(".filter-value.list").removeClass("hidden");
                                    selectedItem.parents(".filter-name").siblings(".filter-value.list").addClass("big-list");
                                    selectedItem.parents(".filter-name").siblings(".filter-value").find(".text").text("");
                                    selectedItem.parents(".filter-name").siblings(".filter-value").find(".text").data("value", "");
                                    selectedItem.parents(".filter-name").siblings(".filter-value").removeClass("disabled");
                                    selectedItem.parents(".filter-name").siblings(".filter-type").find(".item.num").hide();
                                }
                                else if (currentFilter.type == "n") {
                                    selectedItem.parents(".filter-name").siblings(".filter-value.num").removeClass("hidden");
                                    selectedItem.parents(".filter-name").siblings(".filter-type").find(".item.num").show();
                                }
                                else if (currentFilter.type == "s") {
                                    selectedItem.parents(".filter-name").siblings(".filter-value.string").removeClass("hidden");
                                    selectedItem.parents(".filter-name").siblings(".filter-type").find(".item.num").hide();
                                }
                                else if (currentFilter.type == "d") {
                                    selectedItem.parents(".filter-name").siblings(".filter-value.date").removeClass("hidden");
                                    selectedItem.parents(".filter-name").siblings(".filter-type").find(".item.eq").hide();
                                    selectedItem.parents(".filter-name").siblings(".filter-type").find(".item.num").hide();
                                    selectedItem.parents(".filter-name").siblings(".filter-type").find(".item.lt").show();
                                    selectedItem.parents(".filter-name").siblings(".filter-type").find(".item.lte").hide();
                                    selectedItem.parents(".filter-name").siblings(".filter-type").find(".item.gte").show();
                                    selectedItem.parents(".filter-name").siblings(".filter-type").find(".item.gte").trigger("click");
                                }
                            }

                            selectedItem.parents(".query").find(".filter-value.num input").val("");
                            selectedItem.parents(".query").find(".filter-value.date input").val("");
                            selectedItem.parents(".query").find(".filter-value.date input").data("timestamp", null);
                            selectedItem.parents(".query").find(".filter-value.string input").val("");

                            var self = selectedItem.parents(".query").find(".filter-value .select-items>div");
                            self.html("<div></div>");

                            function setUpFilterValues(filterValues, filterNames, biglist) {
                                var filterValStr = "";
                                var filterValueName = "";

                                if (biglist) {
                                    var tmpItem = $("<div>");
                                    tmpItem.addClass("warning");
                                    tmpItem.text(jQuery.i18n.map["drill.big-list-warning"]);
                                    filterValStr += tmpItem.prop('outerHTML');
                                }

                                if (jQuery.isArray(filterValues)) {
                                    for (var i = 0; i < filterValues.length; i++) {
                                        var tmpItem = $("<div>");

                                        tmpItem.addClass("item");
                                        tmpItem.attr("data-value", filterValues[i]);
                                        tmpItem.text(filterNames[i]);

                                        filterValStr += tmpItem.prop('outerHTML');
                                        if (filterValues[i] == value) {
                                            filterValueName = filterNames[i];
                                        }
                                    }
                                }
                                else {
                                    for (var p in filterValues) {
                                        var tmpItem = $("<div>");
                                        tmpItem.addClass("group");
                                        tmpItem.text(p);

                                        filterValStr += tmpItem.prop('outerHTML');
                                        for (var i = 0; i < filterValues[p].length; i++) {
                                            var tmpItem = $("<div>");

                                            tmpItem.addClass("item");
                                            tmpItem.attr("data-value", filterValues[p][i]);
                                            tmpItem.text(countlyCommon.decode(filterValues[p][i]));

                                            filterValStr += tmpItem.prop('outerHTML');

                                            if (filterValues[p][i] == value) {
                                                filterValueName = countlyCommon.decode(filterValues[p][i]);
                                            }
                                        }
                                    }
                                }

                                self.html(filterValStr);

                                return filterValueName;
                            }

                            var filterValueName = "";
                            var filterValue = selectedItem.parents(".query").find(".filter-value:not(.hidden)");

                            if (currentFilter.type == "bl") {
                                var prop = currentFilter.id;
                                selectedItem.parents(".query").find(".filter-value").addClass("loading");

                                countlySegmentation.getBigListMetaData(prop, null, function(values, names) {
                                    var list_limit = countlyGlobal.list_limit;
                                    if (countlyGlobal.apps && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID] && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].plugins && countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].plugins.drill && typeof countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].plugins.drill.list_limit !== "undefined") {
                                        list_limit = countlyGlobal.apps[countlyCommon.ACTIVE_APP_ID].plugins.drill.list_limit;
                                    }
                                    if (value && value != "" && values.indexOf(value) == -1)//is passed and not in current list
                                    {
                                        countlySegmentation.getBigListMetaData(prop, value, function(values2, names2) {
                                            self.parents(".query").find(".filter-value").removeClass("loading");

                                            for (var z = 0; z < values2.length; z++) {
                                                values.push(values2[z]);
                                                if (values.length != names.length && names.indexOf(names2[z] == -1))//because sometimes it is the same array
                                                {
                                                    names.push(names2[z]);
                                                }
                                            }
                                            filterValueName = setUpFilterValues(values, names, names.length >= list_limit);
                                            filterValue.find(".text").text(filterValueName);
                                            filterValue.find(".text").data("value", value);
                                            var timeout = null;

                                        });
                                    }
                                    else {
                                        self.parents(".query").find(".filter-value").removeClass("loading");
                                        filterValueName = setUpFilterValues(values, names, names.length >= list_limit);
                                        filterValue.find(".text").text(filterValueName);
                                        filterValue.find(".text").data("value", value);
                                        var timeout = null;
                                    }

                                    self.parents(".query").find(".filter-value").on("keyup", ".search input", function(e) {
                                        e.stopPropagation();
                                        var search = $(this).val();
                                        var parent = $(this).parents(".filter-value").find(".select-items");
                                        if (!parent.find(".table-loader").length) {
                                            parent.prepend("<div class='table-loader'></div>");
                                        }
                                        if (timeout) {
                                            clearTimeout(timeout);
                                            timeout = null;
                                        }
                                        timeout = setTimeout(function() {
                                            countlySegmentation.getBigListMetaData(prop, search, function(values, names) {
                                                parent.find(".table-loader").remove();
                                                setUpFilterValues(values, names, names.length >= list_limit);
                                            });
                                        }, 1000);
                                    });
                                });
                            }
                            else {
                                filterValueName = setUpFilterValues(countlySegmentation.getFilterValues(currentFilter.id), countlySegmentation.getFilterNames(currentFilter.id));
                            }

                            switch (currentFilter.type) {
                            case "l": filterValue.find(".text").text(filterValueName); filterValue.find(".text").data("value", value); break;
                            case "bl": filterValue.find(".text").text(filterValueName); filterValue.find(".text").data("value", value); break;
                            case "n": filterValue.find(":input").val(value); filterValue.find(":input").data("value", value); break;
                            case "s": filterValue.find(":input").val(value); filterValue.find(":input").data("value", value); break;
                            case "d": filterValue.find(":input").val(countlyCommon.formatDate(moment.unix(value), "DD MMMM, YYYY")); filterValue.find(":input").data("timestamp", value); break;
                            }
                        }

                        setFilterValues(rules[i]);
                    }
                }
                /*eslint-enable */

                /**
                 * return current filter from data
                 * @param {string} key filter matched key filter rule record
                 * @return {object} currentFilter[0]  filter object
                 */
                function returnCurrentFilter(key) {
                    var filters_all = countlySegmentation.getFilters(countlySegmentation.getActiveEvent() === "[CLY]_session");

                    for (var j = 0; j < filters_all.length; j++) {
                        if (filters_all[j].id && filters_all[j].id === "did") {
                            filters_all.splice(i, 0, {id: "up.ua", name: jQuery.i18n.map["block.ua"], type: "s"});
                            filters_all.splice(i, 0, {id: "up.referer", name: jQuery.i18n.map["block.referer"], type: "s"});
                            filters_all.splice(i, 0, {id: "up.hostname", name: jQuery.i18n.map["block.hostname"], type: "s"});
                            filters_all.splice(i, 0, {id: "up.ip", name: jQuery.i18n.map["block.ip-address"], type: "s"});
                            break;
                        }
                    }

                    var filters = [];
                    for (var k = 0; k < filters_all.length; k++) {
                        if (filters_all[k].type !== "d" && filters_all[k].id !== "up.sc") {
                            filters.push(filters_all[k]);
                        }
                    }

                    var currentFilterResult = filters.filter(function(filter) {
                        return filter.id === key;
                    });

                    return currentFilterResult[0];
                }

                //$(".query:visible").find(".filter-name").addClass("disabled");
                //$(".query:visible").find(".filter-type").addClass("disabled");
                //$(".query:visible").find(".filter-connector").addClass("disabled");

            },

        },
        "InternalEventTrigger":{
            name: jQuery.i18n.map["hooks.InternalEventTrigger"],
            init: function() {
                var self = this;
                var internalEvents = [
                    {value: "/cohort/enter", name: "/cohort/enter"},
                    {value: "/cohort/exit", name: "/cohort/exit"},
                    {value: "/i/app_users/create", name: "/i/app_users/create"},
                    {value: "/i/app_users/update", name: "/i/app_users/update"},
                    {value: "/i/app_users/delete", name: "/i/app_users/delete"},
                    {value: "/hooks/trigger", name: "/hooks/trigger"},
                ];
                $("#single-hook-trigger-internal-event-dropdown")
                    .clySelectSetItems(internalEvents);
                $("#single-hook-trigger-internal-event-dropdown")
                    .off("cly-select-change").on("cly-select-change", function(e, selected) {
                        self.loadEventView(selected);
                        app.localize($(".trigger-block")); 
                    });
                $("#multi-app-dropdown").on("cly-multi-select-change", function(e) {
                    self.loadCohortsData();
                    self.loadHooksData();
                });
                app.localize();
            },
            renderConfig: function(trigger) {
                var configuration = trigger.configuration;
                var self = this;
                $("#single-hook-trigger-internal-event-dropdown")
                    .clySelectSetSelection(configuration.eventType, configuration.eventType);
                switch (configuration.eventType) {
                    case "/cohort/enter":
                    case "/cohort/exit":
                        setTimeout(function () {self.loadCohortsData(configuration);}, 200);
                        break;
                    case "/hooks/trigger":
                        setTimeout(function() {self.loadHooksData(configuration);}, 200);
                        break;
                }
            },
            getValidConfig: function() {
                var configuration = {
                    eventType: $("#single-hook-trigger-internal-event-dropdown").clySelectGetSelection()
                }
                if (!configuration.eventType) {
                    return null;
                }
                switch(configuration.eventType) {
                    case "/cohort/enter":
                    case "/cohort/exit":
                        configuration.cohortID = $("#single-hook-trigger-cohort-dropdown").clySelectGetSelection();
                        if (!configuration.cohortID) {
                            return null;
                        }
                        break;
                    case "/i/app_users/create":
                    case "/i/app_users/update":
                    case "/i/app_users/delete":
                        return configuration;
                        break;
                    case "/hooks/trigger":
                        configuration.hookID = $("#single-hook-trigger-hooks-dropdown").clySelectGetSelection();
                        if (!configuration.hookID) {
                            return null;
                        }
                        break;
                    default:
                        return null;
                }
                return configuration
            },
            loadHooksData: function(configuration) {
                $("#single-hook-trigger-hooks-dropdown").clySelectSetItems([]);
                $("#single-hook-trigger-hooks-dropdown").clySelectSetSelection("","");
                var apps = $("#multi-app-dropdown").clyMultiSelectGetSelection();
                if (apps.length === 0) {
                     return;
                }
                $.ajax({
                    type: "GET",
                    url: countlyCommon.API_PARTS.data.r + '/hook/list',
                    data: {},
                    dataType: "json",
                    success: function(data) {
                        var hookList = []
                        data.hooksList.forEach(function(hook) {
                            if (hook.apps.indexOf(apps[0]) > -1) {
                                hookList.push({value:hook._id, name: hook.name});
                            }
                        });
                        $("#single-hook-trigger-hooks-dropdown").clySelectSetItems(hookList);
                        if (!(configuration && configuration.hookID)) {
                            return;
                        }

                        hookList.forEach(function(i) {
                              if( i.value ===  configuration.hookID) {
                                  $("#single-hook-trigger-hooks-dropdown").clySelectSetSelection(i.value, i.name);
                              }
                         })
                    }
                });
            },
            loadCohortsData: function(configuration) {
                $("#single-hook-trigger-cohort-dropdown").clySelectSetSelection("","");
                $("#single-hook-trigger-cohort-dropdown").clySelectSetItems([]);
                var apps = $("#multi-app-dropdown").clyMultiSelectGetSelection();
                if (apps.length === 0) {
                     return;
                }
                $.when((function() {
                     var data = {
                         "app_id": apps[0], //countlyCommon.ACTIVE_APP_ID,
                         "method": "get_cohorts",
                         "display_loader": false
                     };
                     $.ajax({
                         type: "GET",
                         url: countlyCommon.API_PARTS.data.r,
                         data: data,
                         dataType: "json",
                         success: function(cohorts) {
                             var cohortItems = []
                             cohorts.forEach(function(c) {
                                cohortItems.push({ value: c._id, name: c.name});
                             });
                             $("#single-hook-trigger-cohort-dropdown").clySelectSetItems(cohortItems);
                             if (!(configuration && configuration.cohortID)) {
                                 return;
                             }
                             cohortItems.forEach(function(i) {
                                  if( i.value ===  configuration.cohortID ) {
                                      $("#single-hook-trigger-cohort-dropdown").clySelectSetSelection(i.value, i.name);
                                  }
                             })
                         }
                     })
                })()
             ).catch(function(err) {
                 console.log(err,"??");
             });
            },
            loadEventView: function(event) {
                var self = this;
                var html = "";
                switch(event) {
                    case "/cohort/enter": 
                    case "/cohort/exit":
                        html = `
                            <div class="section">
                                <div class="label" data-localize='hooks.cohort-selector-title'></div>
                                <div id="single-hook-trigger-cohort-dropdown" class="cly-select" style="width: 100%; box-sizing: border-box;">
                                    <div class="select-inner">
                                        <div class="text-container">
                                            <div class="text">
                                                <div class="default-text" data-localize='hooks.cohort-selector-placeholder'></div>
                                            </div>
                                        </div>
                                        <div class="right combo"></div>
                                    </div>
                                    <div class="select-items square" style="width: 100%;"></div>
                                </div>
                            </div>
                            <div class="section">
                                <div class="label" data-localize='hooks.trigger-introduction' ></div>
                                <div>
                                    <div class="trigger-intro">
                                    </div>
                                </div>
                            </div>
                        `
                        $(".internal-event-configuration-view").html(html);
                        $(".trigger-intro").html(jQuery.i18n.prop("hooks.trigger-internal-event-cohorts-enter-intro"));
                        self.loadCohortsData();
                        break;
                    case '/i/app_users/create':
                    case '/i/app_users/update':
                    case '/i/app_users/delete':
                         html = `
                            <div class="section">
                                <div class="label" data-localize='hooks.trigger-introduction' ></div>
                                <div>
                                    <div class="trigger-intro">
                                    </div>
                                </div>
                            </div>
                        `
                        $(".internal-event-configuration-view").html(html);
                        $(".trigger-intro").html(jQuery.i18n.prop("hooks.trigger-internal-event-app-users-intro"));
                        self.loadHooksData();
                        break;
                    case '/hooks/trigger': 
                        html = `
                            <div class="section">
                                <div class="label" data-localize='hooks.hook-selector-title'></div>
                                <div id="single-hook-trigger-hooks-dropdown" class="cly-select" style="width: 100%; box-sizing: border-box;">
                                    <div class="select-inner">
                                        <div class="text-container">
                                            <div class="text">
                                                <div class="default-text" data-localize='hooks.hooks-selector-placeholder'></div>
                                        </div>
                                        <div class="right combo"></div>
                                    </div>
                                    <div class="select-items square" style="width: 100%;"></div>
                                </div>
                            </div>
                        `
                        $(".internal-event-configuration-view").html(html);
                        break;
                    default:
                        $(".internal-event-configuration-view").html(event);
                }
            },
        },
        "APIEndPointTrigger": {
            name: jQuery.i18n.map["hooks.APIEndPointTrigger"],
            init: function() {
                app.localize();
                function uuidv4() {
                    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, function (c) {
                        return (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
                    });
                };
                $("#api-endpoint-trigger-uri").val(uuidv4());
                this.renderIntro();
            },
            renderConfig: function(trigger) {
                var configuration = trigger.configuration;
                $("#api-endpoint-trigger-uri").val(configuration.path);
                this.renderIntro();
            },
            getValidConfig: function() {
                var uri = $("#api-endpoint-trigger-uri").val();
                if(!uri) {
                    return null
                }
                return {path: uri, method: 'get'};
            },
            renderIntro: function() {
                var url = window.location.protocol + "//" + window.location.host + "/o/hooks/" +  $("#api-endpoint-trigger-uri").val()
                $(".trigger-intro").html(jQuery.i18n.prop("hooks.trigger-api-endpoint-intro-content", url));
            }
        },
    }

    /**
     * get default hook triggers dictionary
     * @return {objecT} hook triggers dictionary
     */
    hooksPlugin.getHookTriggers = function () {
        return _hookTriggers;
    }
}(window.hooksPlugin = window.hooksPlugin || {}, jQuery));
