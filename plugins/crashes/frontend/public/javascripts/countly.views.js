window.CrashesView = countlyView.extend({
    convertFilter: {
        "sg.crash":{prop:"_id", type:"string"},
        "sg.cpu":{prop:"cpu", type:"segment"},
        "sg.opengl":{prop:"opengl", type:"segment"},
        "sg.os":{prop:"os", type:"string"},
        "sg.orientation":{prop:"orientation", type:"segment"},
        "sg.nonfatal":{prop:"nonfatal", type:"booltype"},
        "sg.root":{prop:"root", type:"boolsegment"},
        "sg.online":{prop:"online", type:"boolsegment"},
        "sg.signal":{prop:"signal", type:"boolsegment"},
        "sg.muted":{prop:"muted", type:"boolsegment"},
        "sg.background":{prop:"background", type:"boolsegment"},
        "up.d":{prop:"device", type:"segment"},
        "up.pv":{prop:"os_version", type:"segment"},
        "up.av":{prop:"app_version", type:"segment"},
        "up.r":{prop:"resolution", type:"segment"},
        "up.ls":{prop:"lastTs", type:"date"},
        "up.fs":{prop:"startTs", type:"date"},
        "is_new":{prop:"is_new", type:"booltype"},
        "is_resolved":{prop:"is_resolved", type:"booltype"},
        "is_hidden":{prop:"is_hidden", type:"booltype"},
        "is_renewed":{prop:"is_renewed", type:"booltype"},
        "reports":{prop:"reports", type:"number"},
        "users":{prop:"reports", type:"number"},
        "ram_min":{prop:"ram.min", type:"number"},
        "ram_max":{prop:"ram.max", type:"number"},
        "bat_min":{prop:"bat.min", type:"number"},
        "bat_max":{prop:"bat.max", type:"number"},
        "disk_min":{prop:"disk.min", type:"number"},
        "disk_max":{prop:"disk.max", type:"number"},
        "run_min":{prop:"run.min", type:"number"},
        "run_max":{prop:"run.max", type:"number"}
    },
	initialize:function () {
        this.loaded = true;
		this.filter = (store.get("countly_crashfilter")) ? store.get("countly_crashfilter") : "crash-all";
        this.curMetric = "cr";
        this.metrics = {
			cr:jQuery.i18n.map["crashes.total"],
			cru:jQuery.i18n.map["crashes.unique"],
			crnf:jQuery.i18n.map["crashes.nonfatal"]+" "+jQuery.i18n.map["crashes.title"],
			crf:jQuery.i18n.map["crashes.fatal"]+" "+jQuery.i18n.map["crashes.title"],
			crru:jQuery.i18n.map["crashes.resolved-users"]
		};
    },
    beforeRender: function() {
        this.selectedCrashes = {};
        this.selectedCrashesIds = [];
		if(this.template)
			return $.when(countlyCrashes.initialize()).then(function () {});
		else{
			var self = this;
			return $.when($.get(countlyGlobal["path"]+'/crashes/templates/crashes.html', function(src){
				self.template = Handlebars.compile(src);
			}), countlyCrashes.initialize()).then(function () {});
		}
    },
    processData:function(){
        var self = this;
        var crashData = countlyCrashes.getData();
        this.dtable = $('#crash-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
            "bServerSide": true,
            "sAjaxSource": countlyCommon.API_PARTS.data.r + "?api_key="+countlyGlobal.member.api_key+"&app_id="+countlyCommon.ACTIVE_APP_ID+"&method=crashes",
            "fnServerData": function ( sSource, aoData, fnCallback ) {
                $.ajax({
                    "dataType": 'jsonp',
                    "type": "POST",
                    "url": sSource,
                    "data": aoData,
                    "success": function(data){
                        fnCallback(data);
                        $("#view-filter .bar-values").text(jQuery.i18n.prop('crashes.of-users', data.iTotalDisplayRecords, data.iTotalRecords));
                        $("#view-filter .bar span").text(Math.floor((data.iTotalDisplayRecords/data.iTotalRecords)*100)+"%");
                        $("#view-filter .bar .bar-inner").animate({width: Math.floor((data.iTotalDisplayRecords/data.iTotalRecords)*100)+"%"}, 1000);
                    }
                });
            },
            "fnServerParams": function ( aoData ) {
                if(self.filter){
                    aoData.push( { "name": "filter", "value": self.filter } );
                }
                if(self._query){
                    aoData.push({ "name": "query", "value": JSON.stringify(self._query) });
                }
            },
			"fnRowCallback": function( nRow, aData, iDisplayIndex, iDisplayIndexFull ) {
				$(nRow).attr("id", aData._id);

                if(aData.is_resolved)
                    $(nRow).addClass("resolvedcrash");
				else if(aData.is_new)
					$(nRow).addClass("newcrash");
                else if(aData.is_renewed)
                    $(nRow).addClass("renewedcrash");

                $(nRow).find(".tag").tipsy({gravity: 'w'});
			},
            "aoColumns": [
                { "mData": function(row, type){
                    if(self.selectedCrashes[row._id])
                        return "<a class='fa fa-check-square check-green'></a>";
                    else
                        return "<a class='fa fa-square-o check-green'></a>";
                }, "sType":"numeric", "sClass":"center", "sWidth": "30px", "bSortable": false, "sTitle": "<a class='fa fa-square-o check-green check-header'></a>"},
                {
                    "mData": function(row, type) {
                        if(type !== "display")
                            return row.name;
                        var tagDivs = "";

                        // This separator is not visible in the UI but | is visible in exported data
                        var separator = "<span class='separator'>|</span>";

                        if (row.is_resolved) {
                            tagDivs += separator + "<div class='tag'>" + "<span style='color:green;'>" + jQuery.i18n.map["crashes.resolved"] + " (" + row.latest_version.replace(/:/g, '.') + ")</span>" + "</div>";
                        } else {
                            tagDivs += separator + "<div class='tag'>" + "<span style='color:red;'>" + jQuery.i18n.map["crashes.unresolved"] + "</span>" + "</div>";
                        }

                        if (row.nonfatal) {
                            tagDivs += separator + "<div class='tag'>" + jQuery.i18n.map["crashes.nonfatal"] + "</div>";
                        } else {
                            tagDivs += separator + "<div class='tag'>" + jQuery.i18n.map["crashes.fatal"] + "</div>";
                        }

                        if (row.session) {
                            tagDivs += separator + "<div class='tag'>" + ((Math.round(row.session.total / row.session.count) * 100) / 100) + " " + jQuery.i18n.map["crashes.sessions"] + "</div>";
                        } else {
                            tagDivs += separator + "<div class='tag'>" + jQuery.i18n.map["crashes.first-crash"] + "</div>";
                        }

                        tagDivs += "<div class='tag not-viewed' title='" + jQuery.i18n.map["crashes.not-viewed"] + "'><i class='fa fa-eye-slash'></i></div>";
                        tagDivs += "<div class='tag re-occurred' title='" + jQuery.i18n.map["crashes.re-occurred"] + "'><i class='fa fa-refresh'></i></div>";

                        return "<div class='truncated'>" + row.name + "</div>" + tagDivs;
                    },
                    "sType": "string",
                    "sTitle": jQuery.i18n.map["crashes.error"]
                },
                {
                    "mData": function(row, type) {
                        return (row.not_os_specific) ? jQuery.i18n.map["crashes.varies"] : row.os;
                    },
                    "sType": "string",
                    "sTitle": jQuery.i18n.map["crashes.platform"],
                    "sWidth": "90px"
                },
                {
                    "mData": "reports",
                    "sType": "numeric",
                    "sTitle": jQuery.i18n.map["crashes.reports"],
                    "sWidth": "90px"
                },
                {
                    "mData": function(row, type) {
                        row.users = row.users || 1;
                        if (type == "display") {
                            return row.users + " (" + ((row.users / crashData.users.total) * 100).toFixed(2) + "%)";
                        } else {
                            return row.users;
                        }
                    },
                    "sType": "string",
                    "sTitle": jQuery.i18n.map["crashes.users"],
                    "sWidth": "90px"
                },
                {
                    "mData": function(row, type) {
                        if (type == "display") {
                            return countlyCommon.formatTimeAgo(row.lastTs);
                        } else {
                            return row.lastTs;
                        }
                    },
                    "sType": "format-ago",
                    "sTitle": jQuery.i18n.map["crashes.last_time"],
                    "sWidth": "150px"
                },
                {
                    "mData": function(row, type) {
                        return row.latest_version.replace(/:/g, '.');
                    },
                    "sType": "string",
                    "sTitle": jQuery.i18n.map["crashes.latest_app"],
                    "sWidth": "90px"
                },
                { "mData": function(row, type){return "<a class='table-link green' href='#/crashes/" + row._id + "'>" + jQuery.i18n.map["common.view"] + "</a>"; }, "sType":"numeric", "sClass":"center", "sWidth": "90px", "bSortable": false}
            ],
            "fnInitComplete": function(oSettings, json) {
                $.fn.dataTable.defaults.fnInitComplete(oSettings, json);
                var tableWrapper = $("#" + oSettings.sTableId + "_wrapper");
                tableWrapper.find(".dataTables_filter input").attr("placeholder",jQuery.i18n.map["crashes.search"]);

                // init sticky headers here in order to wait for correct
                // table width (for multi select checkboxes to render)
                self.dtable.stickyTableHeaders();
            }
        }));

		this.dtable.fnSort( [ [5,'desc'] ] );
        this.dtable.find("thead .check-green").click(function(){
            if($(this).hasClass("fa-check-square")){
                $(".sticky-header .check-green").removeClass("fa-check-square").addClass("fa-square-o");
                self.dtable.find(".check-green").removeClass("fa-check-square").addClass("fa-square-o");
                self.selectedCrashesIds = [];
                self.selectedCrashes = {};
                $(".action-segmentation").addClass("disabled");
            }
            else{
                $(".sticky-header .check-green").removeClass("fa-square-o").addClass("fa-check-square");
                self.dtable.find(".check-green").removeClass("fa-square-o").addClass("fa-check-square");
                self.dtable.find(".check-green").parents("tr").each(function(){
                    var id = $(this).attr("id");
                    if(id){
                        if(!self.selectedCrashes[id]){
                            self.selectedCrashesIds.push(id);
                        }
                        self.selectedCrashes[id] = true;
                        $(".action-segmentation").removeClass("disabled");
                    }
                });
            }
        });
        $('.crashes tbody').on("click", "tr", function (){
			var id = $(this).attr("id");
            if(id){
                if(self.selectedCrashes[id]){
                    $(this).find(".check-green").removeClass("fa-check-square").addClass("fa-square-o");
                    self.selectedCrashes[id] = null;
                    var index = self.selectedCrashesIds.indexOf(id);
                    if(index !== -1)
                        self.selectedCrashesIds.splice(index, 1);
                }
                else{
                    self.selectedCrashes[id] = true;
                    self.selectedCrashesIds.push(id);
                    $(this).find(".check-green").removeClass("fa-square-o").addClass("fa-check-square");
                }
                
                if(self.selectedCrashesIds.length)
                    $(".action-segmentation").removeClass("disabled");
                else
                    $(".action-segmentation").addClass("disabled");
            }
		});
        
        $(".filter-segmentation").on("cly-select-change", function (e, val) {
            self.filterCrashes(val);
        });
        $(".action-segmentation").on("cly-select-change", function (e, val) {
            if(val != ""){
                $(".action-segmentation").clySelectSetSelection("",jQuery.i18n.map["crashes.make-action"]);
                if(val === "crash-resolve"){
                    CountlyHelpers.confirm(jQuery.i18n.prop("crashes.confirm-action-resolved", self.selectedCrashesIds.length), "red", function (result) {
                        if (!result) {
                            return true;
                        }
                        countlyCrashes.markResolve(self.selectedCrashesIds, function(data){
                            if(!data){
                                CountlyHelpers.alert(jQuery.i18n.map["crashes.try-later"], "red");
                            }
                            else{
                                self.resetSelection(true);
                            }
                        });
                    });
                }
                else if(val === "crash-unresolve"){
                    CountlyHelpers.confirm(jQuery.i18n.prop("crashes.confirm-action-unresolved", self.selectedCrashesIds.length), "red", function (result) {
                        if (!result) {
                            return true;
                        }
                        countlyCrashes.markUnresolve(self.selectedCrashesIds, function(data){
                            if(!data){
                                CountlyHelpers.alert(jQuery.i18n.map["crashes.try-later"], "red");
                            }
                            else{
                                self.resetSelection(true);
                            }
                        });
                    });
                }
                else if(val === "crash-view"){
                    CountlyHelpers.confirm(jQuery.i18n.prop("crashes.confirm-action-view", self.selectedCrashesIds.length), "red", function (result) {
                        if (!result) {
                            return true;
                        }
                        countlyCrashes.markSeen(self.selectedCrashesIds, function(data){
                            if(!data){
                                CountlyHelpers.alert(jQuery.i18n.map["crashes.try-later"], "red");
                            }
                            else{
                                self.resetSelection(true);
                            }
                        });
                    });
                }
                else if(val === "crash-hide"){
                    CountlyHelpers.confirm(jQuery.i18n.prop("crashes.confirm-action-hide", self.selectedCrashesIds.length), "red", function (result) {
                        if (!result) {
                            return true;
                        }
                        countlyCrashes.hide(self.selectedCrashesIds, function(data){
                            if(!data){
                                CountlyHelpers.alert(jQuery.i18n.map["crashes.try-later"], "red");
                            }
                            else{
                                self.resetSelection(true);
                            }
                        });
                    });
                }
                else if(val === "crash-show"){
                    CountlyHelpers.confirm(jQuery.i18n.prop("crashes.confirm-action-show", self.selectedCrashesIds.length), "red", function (result) {
                        if (!result) {
                            return true;
                        }
                        countlyCrashes.show(self.selectedCrashesIds, function(data){
                            if(!data){
                                CountlyHelpers.alert(jQuery.i18n.map["crashes.try-later"], "red");
                            }
                            else{
                                self.resetSelection(true);
                            }
                        });
                    });
                }
                else if(val === "crash-delete"){
                    CountlyHelpers.confirm(jQuery.i18n.prop("crashes.confirm-action-delete", self.selectedCrashesIds.length), "red", function (result) {
                        if (!result) {
                            return true;
                        }
                        countlyCrashes.del(self.selectedCrashesIds, function(data){
                            if(!data){
                                CountlyHelpers.alert(jQuery.i18n.map["crashes.try-later"], "red");
                            }
                            else{
                                self.resetSelection(true);
                            }
                        });
                    });
                }
            }
        });
    },
    resetSelection: function(flash){
        if(flash){
            this.dtable.find(".fa-check-square.check-green").parents("tr").addClass("flash");
        }
        this.selectedCrashesIds = [];
        this.selectedCrashes = {};
        this.dtable.find(".check-green").removeClass("fa-check-square").addClass("fa-square-o");
        $(".action-segmentation").addClass("disabled");
        this.refresh();
    },
    renderCommon:function (isRefresh) {
        var crashData = countlyCrashes.getData();
        var chartData = countlyCrashes.getChartData(this.curMetric, this.metrics[this.curMetric]);
        var dashboard = countlyCrashes.getDashboardData();
        this.templateData = {
            "page-title":jQuery.i18n.map["crashes.title"],
            "no-data":jQuery.i18n.map["common.bar.no-data"],
            "usage":[
				{
					"title":jQuery.i18n.map["crashes.total"],
					"data":dashboard.usage['cr'],
					"id":"crash-cr",
                    "help":"crashes.help-total"
				},
				{
					"title":jQuery.i18n.map["crashes.unique"],
					"data":dashboard.usage['cru'],
					"id":"crash-cru",
                    "help":"crashes.help-unique"
				},
				{
					"title":jQuery.i18n.map["crashes.nonfatal"]+" "+jQuery.i18n.map["crashes.title"],
					"data":dashboard.usage['crnf'],
					"id":"crash-crnf",
                    "help":"crashes.help-nonfatal"
				},
				{
					"title":jQuery.i18n.map["crashes.fatal"]+" "+jQuery.i18n.map["crashes.title"],
					"data":dashboard.usage['crf'],
					"id":"crash-crf",
                    "help":"crashes.help-fatal"
				}/*,
				{
					"title":jQuery.i18n.map["crashes.resolved-users"],
					"data":dashboard.usage['crru'],
					"id":"crash-crru",
                    "help":"crashes.help-resolved-users"
				}*/
			],
			"big-numbers":{
                "items":[
                    {
                        "title":jQuery.i18n.map["crashes.unresolved-crashes"],
                        "total":crashData.crashes.unresolved,
                        "help":"crashes.help-unresolved"
                    },
                    {
                        "title":jQuery.i18n.map["crashes.highest-version"],
                        "total":crashData.crashes.highest_app,
                        "help":"crashes.help-latest-version"
                    },
                    {
                        "title":jQuery.i18n.map["crashes.new-crashes"],
                        "total":crashData.crashes.news,
                        "help":"crashes.help-new"
                    },
                    {
                        "title":jQuery.i18n.map["crashes.renew-crashes"],
                        "total":crashData.crashes.renewed,
                        "help":"crashes.help-reoccurred"
                    }
                ]
            },
			"bars":[
                {
                    "title":jQuery.i18n.map["crashes.resolution-status"],
                    "data": countlyCrashes.getResolvedBars(),
                    "help":"crashes.help-resolved"
                },
				{
                    "title":jQuery.i18n.map["crashes.affected-users"],
                    "data":countlyCrashes.getAffectedUsers(),
                    "help":"crashes.help-affected-levels"
                },
                {
                    "title":jQuery.i18n.map["crashes.platform"],
                    "data": countlyCrashes.getPlatformBars(),
                    "help":"crashes.help-platforms"
                },
				{
                    "title":jQuery.i18n.map["crashes.fatality"],
                    "data": countlyCrashes.getFatalBars(),
                    "help":"crashes.help-fatals"
                }
            ],
            hasDrill: typeof this.initDrill !== "undefined",
            "active-filter": jQuery.i18n.map["crashes.all"],
            "active-action": jQuery.i18n.map["crashes.make-action"]
        };
        if(crashData.loss){
            this.templateData["loss"] = true;
            this.templateData["big-numbers"]["items"].push({
                "title":jQuery.i18n.map["crashes.loss"],
                "total":crashData.loss.toFixed(2),
                "help":"crashes.help-loss"
            });
        }
		var self = this;

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            $("#total-user-estimate-ind").on("click", function() {
                CountlyHelpers.alert(jQuery.i18n.map["common.estimation"], "black");
            });

            $(".filter-segmentation").clySelectSetSelection(this.filter, jQuery.i18n.map["crashes."+this.filter.split("-").pop()]);
			countlyCommon.drawTimeGraph(chartData.chartDP, "#dashboard-graph");

            $("#crash-"+this.curMetric).parents(".big-numbers").addClass("active");

            $(".widget-content .inner").click(function () {
				$(".big-numbers").removeClass("active");
				$(".big-numbers .select").removeClass("selected");
				$(this).parent(".big-numbers").addClass("active");
				$(this).find('.select').addClass("selected");
			});

            $(".big-numbers .inner").click(function () {
				var elID = $(this).find('.select').attr("id");
                if(elID){
                    if (self.curMetric == elID.replace("crash-", "")) {
                        return true;
                    }
        
                    self.curMetric = elID.replace("crash-", "");
                    self.switchMetric();
                }
			});
            if(typeof self.initDrill !== "undefined"){
                self.byDisabled = true;
                $.when(countlySegmentation.initialize("[CLY]_crash")).then(function () {
                    self.initDrill();
                    var lookup = {};
                    setTimeout(function() {
                        self.filterBlockClone = $("#filter-view").clone(true);
                        if(self._filter){
                            $("#filter-view").show();
                            $(".filter-view-container").show();
                            self.adjustFilters();
                            var lookup = {};
                            for(var i in self.convertFilter){
                                lookup[self.convertFilter[i].prop] = i;
                            }
                            var filter = self._query;
                            var inputs = [];
                            var subs = {};
                            for(var i in filter){
                                inputs.push(i);
                                subs[i] = [];
                                for(var j in filter[i]){
                                    if(filter[i][j].length){
                                        for(var k = 0; k < filter[i][j].length; k++){
                                            subs[i].push([j, filter[i][j][k]]);
                                        }
                                    }
                                    else{
                                        subs[i].push([j, filter[i][j]]);
                                    }
                                }
                            }
                            function setInput(cur, sub, total){
                                sub = sub || 0;
                                if(inputs[cur]){
                                    var filterType = subs[inputs[cur]][sub][0];
                                    if(filterType == "$in" || filterType == "$eq")
                                        filterType = "=";
                                    else if(filterType == "$nin" || filterType == "$ne")
                                        filterType = "!=";
                                    else if(filterType == "$exists"){
                                        if(subs[inputs[cur]][sub][0])
                                            filterType = "=";
                                        else
                                            filterType = "!=";
                                    }
                
                                    var val = subs[inputs[cur]][sub][1];
                                    var el = $(".query:nth-child("+(total)+")");
                                    el.find(".filter-name").trigger("click");
                                    el.find(".filter-type").trigger("click");
                                    var name = inputs[cur];
                                    if(lookup[name])
                                        name = lookup[name]
                                    else if(name.indexOf(".") !== -1){
                                        var parts = name.split(".");
                                        if(lookup[parts[0]]){
                                            name = lookup[parts[0]];
                                            val = parts[1];
                                        }
                                    }
                                    el.find(".filter-name").find(".select-items .item[data-value='" + name + "']").trigger("click");
                                    el.find(".filter-type").find(".select-items .item[data-value='" + filterType + "']").trigger("click");
                                    setTimeout(function() {
                                        el.find(".filter-value").not(".hidden").trigger("click");
                                        if(el.find(".filter-value").not(".hidden").find(".select-items .item[data-value='" + val + "']").length)
                                            el.find(".filter-value").not(".hidden").find(".select-items .item[data-value='" + val + "']").trigger("click");
                                        else if(_.isNumber(val) && (val + "").length == 10){
                                            el.find(".filter-value.date").find("input").val(countlyCommon.formatDate(moment(val*1000),"DD MMMM, YYYY"));
                                            el.find(".filter-value.date").find("input").data("timestamp", val);
                                        }
                                        else
                                            el.find(".filter-value").not(".hidden").find("input").val(val);
                                        
                                        if(subs[inputs[cur]].length == sub+1){
                                            cur++;
                                            sub = 0;
                                        }
                                        else
                                            sub++;
                                        total++;
                                        if(inputs[cur]){
                                            $("#filter-add-container").trigger("click");
                                            if(sub > 0)
                                                setTimeout(function() {
                                                    var el = $(".query:nth-child("+(total)+")");
                                                    el.find(".and-or").find(".select-items .item[data-value='OR']").trigger("click");
                                                    setInput(cur, sub, total);
                                                }, 500);
                                            else
                                                setInput(cur, sub, total);
                                        }
                                        else{
                                            setTimeout(function(){
                                                $("#apply-filter").removeClass("disabled");
                                                $("#no-filter").hide();
                                                var filterData = self.getFilterObjAndByVal();
                                                $("#current-filter").show().find(".text").text(filterData.bookmarkText);
                                                $("#connector-container").show();
                                            }, 500);
                                        }
                                    }, 500);
                            }
                            }
                            setInput(0, 0, 1);
                        }
                    }, 0);
                    
                    self.processData();
                });
            }
            else{
                $("#view-filter").hide();
                self.processData();
            }

            $('.action-segmentation').attr('data-tooltip-content', "#action-segmentation-tooltip");

            $('.action-segmentation').tooltipster({
                theme: ['tooltipster-borderless'],
                contentCloning: false,
                interactive: false,
                trigger: 'hover',
                side: 'left',
                zIndex: 2,
                functionBefore: function() {
                    if (!$('.action-segmentation').hasClass("disabled")) {
                        return false;
                    }
                }
            });
        }
    },
    refresh:function () {
        var self = this;
        if(this.loaded){
            this.loaded = false;
            $.when(countlyCrashes.refresh()).then(function () {
                self.loaded = true;
                if (app.activeView != self) {
                    return false;
                }
                self.renderCommon(true);
                var newPage = $("<div>" + self.template(self.templateData) + "</div>");
                $(".crashoveral .dashboard").replaceWith(newPage.find(".dashboard"));
                $(".crash-big-numbers").replaceWith(newPage.find(".crash-big-numbers"));
                $(".dashboard-summary").replaceWith(newPage.find(".dashboard-summary"));
                
                $("#crash-"+self.curMetric).parents(".big-numbers").addClass("active");
                $(".widget-content .inner").click(function () {
                    $(".big-numbers").removeClass("active");
                    $(".big-numbers .select").removeClass("selected");
                    $(this).parent(".big-numbers").addClass("active");
                    $(this).find('.select').addClass("selected");
                });
                $(".big-numbers .inner").click(function () {
                    var elID = $(this).find('.select').attr("id");
        
                    if (self.curMetric == elID.replace("crash-", "")) {
                        return true;
                    }
        
                    self.curMetric = elID.replace("crash-", "");
                    self.switchMetric();
                });

                self.dtable.fnDraw(false);
                var chartData = countlyCrashes.getChartData(self.curMetric, self.metrics[self.curMetric]);
                countlyCommon.drawTimeGraph(chartData.chartDP, "#dashboard-graph");
                //app.localize();
            });
        }
    },
	getExportQuery: function(){
        function replacer(key, value) {
            if (value instanceof RegExp)
                return ("__REGEXP " + value.toString());
            else
                return value;
        }
        var qstring = {
            api_key: countlyGlobal["member"].api_key,
            db: "countly",
            collection: "app_crashgroups"+countlyCommon.ACTIVE_APP_ID,
            query:this._query || {}
        };
        if($('.dataTables_filter input').val().length){
            qstring.query["name"] = {"$regex": new RegExp(".*"+$('.dataTables_filter input').val()+".*", 'i')};
        }
        if(this.filter && this.filter != ""){
            switch (this.filter) {
                case "crash-resolved":
                    qstring.query["is_resolved"] = true;
                    break;
                case "crash-hidden":
                    qstring.query["is_hidden"] = true;
                    break;
                case "crash-unresolved":
                    qstring.query["is_resolved"] = false;
                    break;
                case "crash-nonfatal":
                    qstring.query["nonfatal"] = true;
                    break;
                case "crash-fatal":
                    qstring.query["nonfatal"] = false;
                    break;
                case "crash-new":
                    qstring.query["is_new"] = true;
                    break;
                case "crash-viewed":
                    qstring.query["is_new"] = false;
                    break;
                case "crash-reoccurred":
                    qstring.query["is_renewed"] = true;
                    break;
            }
        }
        if(this.filter !== "crash-hidden"){
            qstring.query["is_hidden"] = {$ne: true};
        }
        qstring.query["_id"] = {$ne:"meta"};
        qstring.query = JSON.stringify(qstring.query, replacer);
        return qstring;
    },
    filterCrashes: function(filter){
		this.filter = filter;
		store.set("countly_crashfilter", filter);
		$("#"+this.filter).addClass("selected").addClass("active");
		this.dtable.fnDraw();
	},
    switchMetric:function(){
		var chartData = countlyCrashes.getChartData(this.curMetric, this.metrics[this.curMetric]);
		countlyCommon.drawTimeGraph(chartData.chartDP, "#dashboard-graph");
	},
    getFilters: function(currEvent) {
        var self = this;
        var usedFilters = {};

        $(".query:visible").each(function (index) {
            var filterType = $(this).find(".filter-name .text").data("type");

            // number and date types can be used multiple times for range queries
            if (filterType != "n" && filterType != "d") {
                usedFilters[$(this).find(".filter-name .text").data("value")] = true;
            }
        });

        var defaultFilters = countlySegmentation.getFilters(currEvent),
            allFilters = "";
        var filters = [];
        for(var i = 0; i < defaultFilters.length; i++){
            if(defaultFilters[i].id){
                if(self.convertFilter[defaultFilters[i].id])
                    filters.push(defaultFilters[i]);
            }
        }
        var add = {
            "is_new": jQuery.i18n.map["crashes.new-crashes"],
            "is_resolved": jQuery.i18n.map["crashes.resolved"],
            "is_hidden": jQuery.i18n.map["crashes.hidden"],
            "is_renewed": jQuery.i18n.map["crashes.renew-crashes"],
            "reports": jQuery.i18n.map["crashes.reports"],
            "users": jQuery.i18n.map["crashes.affected-users"],
            "ram_min": jQuery.i18n.map["crashes.ram"] + " " + jQuery.i18n.map["crashes.min"].toLowerCase(),
            "ram_max": jQuery.i18n.map["crashes.ram"] + " " + jQuery.i18n.map["crashes.max"].toLowerCase(),
            "bat_min": jQuery.i18n.map["crashes.battery"] + " " + jQuery.i18n.map["crashes.min"].toLowerCase(),
            "bat_max": jQuery.i18n.map["crashes.battery"] + " " + jQuery.i18n.map["crashes.max"].toLowerCase(),
            "disk_min": jQuery.i18n.map["crashes.disk"] + " " + jQuery.i18n.map["crashes.min"].toLowerCase(),
            "disk_max": jQuery.i18n.map["crashes.disk"] + " " + jQuery.i18n.map["crashes.max"].toLowerCase(),
            "run_min": jQuery.i18n.map["crashes.run"] + " " + jQuery.i18n.map["crashes.min"].toLowerCase(),
            "run_max": jQuery.i18n.map["crashes.run"] + " " + jQuery.i18n.map["crashes.max"].toLowerCase()
        };
        
        for(var i in add){
            filters.push({id:i, name:add[i], type:(i.indexOf("is_") === 0) ? "l" : "n"});
        }

        if (filters.length == 0) {
            CountlyHelpers.alert(jQuery.i18n.map["drill.no-filters"], "black");
        }

        for (var i = 0; i < filters.length; i++) {
            if(typeof filters[i].id != "undefined"){
                if (usedFilters[filters[i].id] == true) {
                    continue;
                }
    
                var tmpItem = $("<div>");
    
                tmpItem.addClass("item");
                tmpItem.attr("data-type", filters[i].type);
                tmpItem.attr("data-value", filters[i].id);
                tmpItem.text(filters[i].name);
    
                allFilters += tmpItem.prop('outerHTML');
            }
            else{
                var tmpItem = $("<div>");
    
                tmpItem.addClass("group");
                tmpItem.text(filters[i].name);
    
                allFilters += tmpItem.prop('outerHTML');
            }
        }

        return allFilters;
    },
    setUpFilters: function(elem){
        var rootHTML = $(elem).parents(".query").find(".filter-value .select-items>div");
        if(this.convertFilter[$(elem).data("value")] && this.convertFilter[$(elem).data("value")].type === "boolsegment")
            this.setUpFilterValues(rootHTML, ["yes", "no"], ["yes", "no"]);
        else if(this.convertFilter[$(elem).data("value")] && this.convertFilter[$(elem).data("value")].type === "booltype")
            this.setUpFilterValues(rootHTML, [true, false], ["yes", "no"]);
        else
            this.setUpFilterValues(rootHTML, countlySegmentation.getFilterValues($(elem).data("value")), countlySegmentation.getFilterNames($(elem).data("value")));
    },
    generateFilter: function(filterObj, filterObjTypes) {
        var self = this;
        var dbFilter = {};
        for (var prop in filterObj) {
            var filter = (self.convertFilter[prop]) ? self.convertFilter[prop].prop : prop.replace("sg.","");
            for (var i = 0; i < filterObj[prop].length; i++) {
                if(_.isObject(filterObj[prop][i])) {
                    dbFilter[filter] = {};
                    for (var tmpFilter in filterObj[prop][i]) {
                        dbFilter[filter][tmpFilter] = filterObj[prop][i][tmpFilter];
                    }
                } else if (filterObjTypes[prop][i] == "!=") {
                    if(!self.convertFilter[prop] || self.convertFilter[prop].type === "segment" || self.convertFilter[prop].type === "boolsegment"){
                        if(filter === "os_version"){
                            filterObj[prop][i] = countlyDeviceDetails.getCleanVersion(filterObj[prop][i]);
                        }
                        dbFilter[filter+"."+filterObj[prop][i]] = {$exists:false};
                    }else if(self.convertFilter[prop].type === "booltype"){
                        if(filterObj[prop][i]==="true"){
                            dbFilter[filter] = {$ne: true};
                        }
                        else{
                            dbFilter[filter] = {$eq: true};
                        }
                    }else{
                        dbFilter[filter] = {};
                        if (!dbFilter[filter]["$nin"]) {
                            dbFilter[filter]["$nin"] = [];
                        }
                        dbFilter[filter]["$nin"].push(filterObj[prop][i]);
                    }
                } else {
                    if(!self.convertFilter[prop] || self.convertFilter[prop].type === "segment" || self.convertFilter[prop].type === "boolsegment"){
                        if(filter === "os_version"){
                            filterObj[prop][i] = countlyDeviceDetails.getCleanVersion(filterObj[prop][i]);
                        }
                        dbFilter[filter+"."+filterObj[prop][i]] = {$exists:true};
                    }else if(self.convertFilter[prop].type === "booltype"){
                        if(filterObj[prop][i]==="true"){
                            dbFilter[filter] = {$eq: true};
                        }
                        else{
                            dbFilter[filter] = {$ne: true};
                        }
                    }else{
                        dbFilter[filter] = {};
                        if (!dbFilter[filter]["$in"]) {
                            dbFilter[filter]["$in"] = [];
                        }
                        dbFilter[filter]["$in"].push(filterObj[prop][i]);
                    }
                }
            }
        }
        return dbFilter;
    },
    loadAndRefresh: function() {
        var filter = {};
        for(var i in this.filterObj){
            filter[i.replace("up.", "")] = this.filterObj[i];
        }
        this._query = filter;
        app.navigate("/crashes/filter/"+JSON.stringify(filter), false);
        this.dtable.fnPageChange(0);
        this.refresh(true);
    }
});

window.CrashgroupView = countlyView.extend({
	initialize:function () {
        this.loaded = true;
    },
    beforeRender: function() {
        countlyCrashes.reset();
		if(this.template)
			return $.when(countlyCrashes.initialize(this.id)).then(function () {});
		else{
			var self = this;
			return $.when($.get(countlyGlobal["path"]+'/crashes/templates/crashgroup.html', function(src){
				self.template = Handlebars.compile(src);
			}), countlyCrashes.initialize(this.id)).then(function () {});
		}
    },
    renderCommon:function (isRefresh) {
		var url = location.protocol+'//'+location.hostname+(location.port ? ':'+location.port: '')+countlyGlobal["path"]+"/crash/";
        var crashData = countlyCrashes.getGroupData();
        if(crashData.url)
               url += crashData.url;
		crashData.latest_version = crashData.latest_version.replace(/:/g, '.');
        
        this.comments = {};
        
        if(typeof marked != "undefined"){
            marked.setOptions({
                breaks: true
            });
        }
        
        if(crashData.comments){
            for(var i = 0; i < crashData.comments.length; i++){
                this.comments[crashData.comments[i]._id] = crashData.comments[i].text;
                if(typeof marked != "undefined")
                    crashData.comments[i].html = marked(crashData.comments[i].text);
                else
                    crashData.comments[i].html = crashData.comments[i].text;
            }
        }
		
		if (!isRefresh) {
			this.metrics = countlyCrashes.getMetrics();
            for(var i in this.metrics){
                for(var j in this.metrics[i]){
                    this.curMetric = j;
                    this.curTitle = this.metrics[i][j];
                    break;
                }
                break;
            }
		}
        var ranges = ["ram", "disk", "bat", "run"];
        for(var i = 0; i < ranges.length; i++){
            if(!crashData[ranges[i]]){
                crashData[ranges[i]] = {min:0, max:0, total:0, count:1};
            }
        }

        this.templateData = {
            "page-title":jQuery.i18n.map["crashes.crashes-by"],
            "note-placeholder": jQuery.i18n.map["crashes.editnote"],
            "hasPermission": (countlyGlobal["member"].global_admin || countlyGlobal["admin_apps"][countlyCommon.ACTIVE_APP_ID]) ? true : false,
            "url":url,
			"data":crashData,
			"error":crashData.name.substr(0, 80),
            "fatal": (crashData.nonfatal) ? jQuery.i18n.map["crashes.nonfatal"] : jQuery.i18n.map["crashes.fatal"],
			"active-segmentation": this.curTitle,
			"segmentations": this.metrics,
			"big-numbers":{
                "class":"four-column",
                "items":[
					{
                        "title":jQuery.i18n.map["crashes.platform"],
                        "total":(crashData.not_os_specific) ? jQuery.i18n.map["crashes.varies"] : crashData.os,
                        "help":"crashes.help-platform"
                    },
                    {
                        "title":jQuery.i18n.map["crashes.reports"],
                        "total":crashData.reports,
                        "help":"crashes.help-reports"
                    },
                    {
                        "title":jQuery.i18n.map["crashes.affected-users"],
                        "total":crashData.users + " ("+((crashData.users/crashData.total)*100).toFixed(2)+"%)",
                        "help":"crashes.help-affected"
                    },
					{
                        "title":jQuery.i18n.map["crashes.highest-version"],
                        "total":crashData.latest_version.replace(/:/g, '.'),
                        "help":"crashes.help-app-version"
                    }
                ]
            }
        };
        if(countlyGlobal["apps"][countlyCommon.ACTIVE_APP_ID].type != "web"){
            this.templateData["ranges"]=[
                {
                    "title":jQuery.i18n.map["crashes.ram"],
                    "icon":"memory",
                    "help":"crashes.help-ram",
                    "min":crashData.ram.min+" %",
                    "max":crashData.ram.max+" %",
                    "avg":(crashData.ram.total/crashData.ram.count).toFixed(2)+" %"
                },
                {
                    "title":jQuery.i18n.map["crashes.disk"],
                    "icon":"sd_storage",
                    "help":"crashes.help-disk",
                    "min":crashData.disk.min+" %",
                    "max":crashData.disk.max+" %",
                    "avg":(crashData.disk.total/crashData.disk.count).toFixed(2)+" %"
                },
                {
                    "title":jQuery.i18n.map["crashes.battery"],
                    "icon":"battery_full",
                    "help":"crashes.help-battery",
                    "min":crashData.bat.min+" %",
                    "max":crashData.bat.max+" %",
                    "avg":(crashData.bat.total/crashData.bat.count).toFixed(2)+" %"
                },
                {
                    "title":jQuery.i18n.map["crashes.run"],
                    "icon":"play_arrow",
                    "help":"crashes.help-run",
                    "min":countlyCommon.timeString(crashData.run.min/60),
                    "max":countlyCommon.timeString(crashData.run.max/60),
                    "avg":countlyCommon.timeString((crashData.run.total/crashData.run.count)/60)
                }
            ];
            
            this.templateData["bars"]=[
                {
                    "title":jQuery.i18n.map["crashes.root"],
                    "data": countlyCrashes.getBoolBars("root"),
                    "help":"crashes.help-root"
                },
                {
                    "title":jQuery.i18n.map["crashes.online"],
                    "data":countlyCrashes.getBoolBars("online"),
                    "help":"crashes.help-online"
                },
                {
                    "title":jQuery.i18n.map["crashes.muted"],
                    "data": countlyCrashes.getBoolBars("muted"),
                    "help":"crashes.help-muted"
                },
                {
                    "title":jQuery.i18n.map["crashes.background"],
                    "data": countlyCrashes.getBoolBars("background"),
                    "help":"crashes.help-background"
                }
            ];
        }
        if(crashData.loss){
            this.templateData["loss"] = true;
            this.templateData["big-numbers"]["items"].push({
                "title":jQuery.i18n.map["crashes.loss"],
                "total":parseFloat(crashData.loss).toFixed(2),
                "help":"crashes.help-loss"
            });
        }
        
        if(this.templateData["big-numbers"]["items"].length == 3)
            this.templateData["big-numbers"]["class"] = "three-column";
        else if(this.templateData["big-numbers"]["items"].length == 5)
            this.templateData["big-numbers"]["class"] = "five-column";
        
        if(crashData.session && this.templateData["ranges"]){
            this.templateData["frequency"] = true;
            this.templateData["ranges"].push({
                "title":jQuery.i18n.map["crashes.sessions"],
				"icon":"repeat",
                "help":"crashes.help-frequency",
                "min":crashData.session.min,
                "max":crashData.session.max,
                "avg":((Math.round(crashData.session.total/crashData.session.count)*100)/100)
            });
        }
		var self = this;
        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
             if(typeof addDrill != "undefined"){
                $("#content .widget:first-child .widget-header>.right").append(addDrill("sg.crash", this.id, "[CLY]_crash"));
            }
            if(crashData.comments){
                var count = 0;
                for(var i = 0; i < crashData.comments.length; i++){
                    if(!crashData.comments[i].is_owner && typeof store.get("countly_"+this.id+"_"+crashData.comments[i]._id) == "undefined"){
                        count++;
                    }
                }
                if(count > 0){
                    $(".crash-comment-count span").text(count+"");
                    $(".crash-comment-count").show();
                }
            }
			$(".segmentation-option").on("click", function () {
				self.switchMetric($(this).data("value"));
			});
			this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": crashData.data,
				"fnRowCallback": function( nRow, aData, iDisplayIndex, iDisplayIndexFull ) {
					$(nRow).attr("id", aData._id);
				},
                "aoColumns": [
					{ "mData": function(row, type){if(type == "display") return countlyCommon.formatTimeAgo(row.ts); else return row.ts;}, "sType":"format-ago", "sTitle": jQuery.i18n.map["crashes.crashed"]},
					{ "mData": function(row, type){var str = row.os; if(row.os_version) str += " "+row.os_version.replace(/:/g, '.'); return str;}, "sType":"string", "sTitle": jQuery.i18n.map["crashes.os_version"] },
					{ "mData": function(row, type){var str = ""; if(row.manufacture) str += row.manufacture+" "; if(row.device) str += countlyDeviceList[row.device] || row.device; return str;}, "sType":"string", "sTitle": jQuery.i18n.map["crashes.device"]},
					{ "mData": function(row, type){return row.app_version.replace(/:/g, '.');}, "sType":"string", "sTitle": jQuery.i18n.map["crashes.app_version"] }
                ]
            }));
			this.dtable.stickyTableHeaders();
			this.dtable.fnSort( [ [0,'desc'] ] );
			
			/*$('.crash-reports tbody').on("click", "tr", function (){
				var id = $(this).attr("id");
				if(id)
					window.location.hash = window.location.hash.toString()+"/"+id;
			});*/
			CountlyHelpers.expandRows(this.dtable, this.formatData);
			countlyCommon.drawGraph(crashData.dp[this.curMetric], "#dashboard-graph", "bar");
			
			$("#mark-resolved").not(".disabled").click(function(){
                $("#mark-resolved").addClass("disabled");
				$("#unresolved-text").css("display", "none");
				countlyCrashes.markResolve(crashData._id, function(version){
                    $("#mark-resolved").removeClass("disabled");

                    if(version){
                        $("#mark-resolved").css("display", "none");
                        $("#mark-unresolved").css("display", "block");
                        $("#resolved-text").css("display", "inline");
                        $("#resolved-version").text(version);
                    }
                    else{
                        $("#unresolved-text").css("display", "inline");
                        CountlyHelpers.alert(jQuery.i18n.map["crashes.try-later"], "red");
                    }
				});
			});
			
			$("#mark-unresolved").not(".disabled").click(function(){
                $("#mark-unresolved").addClass("disabled");
				$("#resolved-text").css("display", "none");
				countlyCrashes.markUnresolve(crashData._id, function(data){
                    $("#mark-unresolved").removeClass("disabled");

                    if(data){
                        $("#mark-unresolved").css("display", "none");
                        $("#mark-resolved").css("display", "block");
                        $("#unresolved-text").css("display", "inline");
                    }
                    else{
                        $("#resolved-text").css("display", "inline");
                        CountlyHelpers.alert(jQuery.i18n.map["crashes.try-later"], "red");
                    }
				});
			});
            
            $(".btn-show-crash").click(function(){
                $(".btn-show-crash").addClass("active");
				countlyCrashes.show(crashData._id, function(data){
                    if(data){
                        $(".btn-show-crash").removeClass("active");
                        $(".btn-show-crash").css("display", "none");
                        $(".btn-hide-crash").css("display", "block");
                    }
                    else{
                        CountlyHelpers.alert(jQuery.i18n.map["crashes.try-later"], "red");
                    }
				});
			});
            
            $(".btn-hide-crash").click(function(){
                $(".btn-hide-crash").addClass("active");
				countlyCrashes.hide(crashData._id, function(data){
                    if(data){
                        $(".btn-hide-crash").removeClass("active");
                        $(".btn-hide-crash").css("display", "none");
                        $(".btn-show-crash").css("display", "block");
                    }
                    else{
                        CountlyHelpers.alert(jQuery.i18n.map["crashes.try-later"], "red");
                    }
				});
			});

            $(".btn-share-crash").click(function(e){
				if ($(this).hasClass("active")) {
                    $(this).removeClass("active");
                    $("#crash-share-list").hide();
                }
                else{
                    $(this).addClass("active");
                    $("#crash-share-list").show();
                }
			});

            $("#share-crash-done").click(function() {
                $(".btn-share-crash").removeClass("active");
                $("#crash-share-list").hide();
            });
            
            $(".btn-delete-crash").on("click", function(){
				var id = $(this).data("id");
				CountlyHelpers.confirm(jQuery.i18n.map["crashes.confirm-delete"], "red", function (result) {
					if (!result) {
						return true;
					}
					countlyCrashes.del(crashData._id, function (data) {
                        if(data){
                            if(data.result == "Success"){
                                window.location.hash = "/crashes";
                            }
                            else{
                                CountlyHelpers.alert(data.result, "red");
                            }
                        }
                        else{
                            CountlyHelpers.alert(jQuery.i18n.map["crashes.try-later"], "red");
                        }
					});
				});
			});
            
            if(crashData.is_public){
                $('#crash-share-public').attr('checked', true);
                $(".crash-share").show();
            }
            else{
                $('#crash-share-public').attr('checked', false);
                $(".crash-share").hide();
            }
            
            if(crashData.share){
                for(var i in crashData.share){
                    if(crashData.share[i])
                        $('#crash-share-'+i).attr('checked', true);
                }
            }
            
            $('.crash-share input[type=checkbox]').change(function(){
                var opts = {};
                $('.crash-share input[type=checkbox]').each(function(){
                    opts[this.id.replace("crash-share-", "")] = ($(this).is(":checked")) ? 1 : 0;
                });
                countlyCrashes.modifyShare(crashData._id, opts);
            });
            
            $('#crash-share-public').change(function(){
                if($(this).is(":checked")) {
                    countlyCrashes.share(crashData._id, function(data){
                        if(data)
                            $(".crash-share").show();
                        else
                            CountlyHelpers.alert(jQuery.i18n.map["crashes.try-later"], "red");
                    });
                }
                else{
                    countlyCrashes.unshare(crashData._id, function(data){
                        if(data)
                            $(".crash-share").hide();
                        else
                            CountlyHelpers.alert(jQuery.i18n.map["crashes.try-later"], "red");
                    });
                }
            });
            
            $( "#tabs" ).tabs({
                select: function( event, ui ) {
                    $(".flot-text").hide().show(0);
                }
            });
            $( "#crash-notes" ).click(function(){
                var crashData = countlyCrashes.getGroupData();
                if(crashData.comments){
                    for(var i = 0; i < crashData.comments.length; i++){
                        store.set("countly_"+self.id+"_"+crashData.comments[i]._id, true);
                    }
                    $(".crash-comment-count").hide();
                }
            });
            $("#add_comment").click(function(){
                var comment = {};
                comment.time = new Date().getTime();
                comment.text = $("#comment").val();
                countlyCrashes.addComment(crashData._id, comment, function(data){
                    if(data){
                        self.refresh();
                        $("#comment").val("");
                    }
                    else
                        CountlyHelpers.alert(jQuery.i18n.map["crashes.try-later"], "red"); 
                });
            });
            $("#notes").on("click", ".crash-comment-edit", function(){
                var container = $(this).parents(".comment");
                if(!container.find("#comment_edit").length){
                    var comment_id = $(this).data("id");
                    container.find(".text").hide();
                    container.append($("#comment_edit").clone());
                    container.find("textarea").val(self.comments[comment_id]);
                    container.find(".cancel_comment").click(function(){
                        container.find("#comment_edit").remove();
                        container.find(".text").show();
                    });
                    container.find(".edit_comment").click(function(){
                        var comment = {};
                        comment.time = new Date().getTime();
                        comment.text = container.find("#edited_comment").val();
                        comment.comment_id = comment_id;
                        countlyCrashes.editComment(crashData._id, comment, function(data){
                            if(data){
                                self.refresh();
                                container.find("#comment_edit").remove();
                                container.find(".text").show();
                            }
                            else
                                CountlyHelpers.alert(jQuery.i18n.map["crashes.try-later"], "red"); 
                        });
                    });
                }
            });
            $("#notes").on("click", ".crash-comment-delete", function(){
                var ob = {};
                ob.comment_id = $(this).data("id");
                CountlyHelpers.confirm(jQuery.i18n.map["crashes.confirm-comment-delete"], "red", function (result) {
                    if (!result) {
						return true;
					}
                    countlyCrashes.deleteComment(crashData._id, ob, function(data){
                        if(data){
                            $("#comment_"+ob.comment_id).remove();
                            self.refresh();
                        }
                        else
                            CountlyHelpers.alert(jQuery.i18n.map["crashes.try-later"], "red"); 
                    });
                });
            });

            $("#expand-crash").on("click", function() {
                $(this).toggleClass("active");
                $("#expandable").toggleClass("collapsed");
            });

            var errorHeight = $("#expandable").find("code").outerHeight();

            if (errorHeight < 200) {
                $("#expandable").removeClass("collapsed");
                $("#expand-crash").hide();
            } else {
                $("#expandable").addClass("collapsed");
                $("#expand-crash").show();
            }
        }

        $("document").ready(function() {
            self.redecorateStacktrace();
        });
    },
    redecorateStacktrace:function(){
         $(".crash-stack .line-number").remove();
         $(".crash-stack .cl").remove();
         var pre = $(".crash-stack pre")[0];
         pre.innerHTML = '<span class="line-number"></span>' + pre.innerHTML + '<span class="cl"></span>';
         var num = pre.innerHTML.split(/\n/).length;
         for (var i = 0; i < num; i++) {
             var line_num = pre.getElementsByTagName('span')[0];
             line_num.innerHTML += '<span>' + (i + 1) + '</span>';
         }
         $('pre code').each(function(i, block) {
             if(typeof Worker !== "undefined"){
                 var worker = new Worker(countlyGlobal["path"]+'/javascripts/utils/highlight/highlight.worker.js');
                 worker.onmessage = function(event) { 
                     block.innerHTML = event.data;
                     worker.terminate();
                     worker = undefined;
                 };
                 worker.postMessage(block.textContent);
             }
             else if(typeof hljs != "undefined"){
                 hljs.highlightBlock(block);
             }
         });
    },
    refresh:function () {
        var self = this;
        if(this.loaded){
            this.loaded = false;
            $.when(countlyCrashes.initialize(this.id, true)).then(function () {
                self.loaded = true;
                if (app.activeView != self) {
                    return false;
                }
                self.renderCommon(true);
                var newPage = $("<div>" + self.template(self.templateData) + "</div>");
                $("#big-numbers-container").replaceWith(newPage.find("#big-numbers-container"));
                $(".grouped-numbers").replaceWith(newPage.find(".grouped-numbers"));
                $(".crash-bars").replaceWith(newPage.find(".crash-bars"));

                var crashData = countlyCrashes.getGroupData();
                $("#error pre code").html(crashData.error);
                var errorHeight = $("#expandable").find("code").outerHeight();

                if (errorHeight < 200) {
                    $("#expandable").removeClass("collapsed");
                    $("#expand-crash").hide();
                } else {
                    if($('#expand-crash:visible').length == 0){
                        $("#expandable").addClass("collapsed");
                        $("#expand-crash").show();
                    }
                }

                self.redecorateStacktrace();
                if(crashData.comments){
                    var container = $("#comments");
                    var comment, parent;
                    var count = 0;
                    for(var i = 0; i < crashData.comments.length; i++){
                        self.comments[crashData.comments[i]._id] = crashData.comments[i].text;
                        comment = crashData.comments[i];
                        if(container.find("#comment_"+comment._id).length){
                            parent = container.find("#comment_"+comment._id);
                            parent.find(".text").html(newPage.find("#comment_"+comment._id+" .text").html());
                            parent.find(".author").html(newPage.find("#comment_"+comment._id+" .author").html());
                            parent.find(".time").html(newPage.find("#comment_"+comment._id+" .time").html());
                        }
                        else
                            container.append(newPage.find("#comment_"+comment._id));
                        
                        if(!crashData.comments[i].is_owner && typeof store.get("countly_"+self.id+"_"+comment._id) == "undefined"){
                            count++;
                        }
                    }
                    if(count > 0){
                        $(".crash-comment-count span").text(count+"");
                        $(".crash-comment-count").show();
                    }
                }
                CountlyHelpers.refreshTable(self.dtable, crashData.data);
                countlyCommon.drawGraph(crashData.dp[self.curMetric], "#dashboard-graph", "bar");
                CountlyHelpers.reopenRows(self.dtable, self.formatData);
                app.localize();
            });
        }
    },
	formatData: function( data ) {
		// `d` is the original data object for the row
		var str = '';
		if(data){
			str += '<div class="datatablesubrow">'+
				'<table style="width: 100%;">'+
						'<tr>'+
							'<td class="text-left">'+jQuery.i18n.map["crashes.app_version"]+'</td>'+
							'<td class="text-left">'+jQuery.i18n.map["crashes.device"]+'</td>'+
							'<td class="text-left">'+jQuery.i18n.map["crashes.state"]+'</td>';
                            if(data.custom)
                                str += '<td class="text-left">'+jQuery.i18n.map["crashes.custom"]+'</td>';
						str += '</tr>'+
						'<tr>'+
							'<td class="text-left">'+data.app_version.replace(/:/g, '.')+'</td>'+
							'<td class="text-left">'+data.os+' ';
                                if(data.os_version)
                                    str += data.os_version.replace(/:/g, '.')+'<br/>';
                                if(data.manufacture)
                                    str += data.manufacture;+' ';
                                if(data.device)
                                    str += data.device;
                                if(data.cpu)
                                    str += ' ('+data.cpu+')'+'<br/>';
                                if(data.opengl)
                                    str += jQuery.i18n.map["crashes.opengl"]+': '+data.opengl+'<br/>';
                                if(data.resolution)
                                    str += jQuery.i18n.map["crashes.resolution"]+': '+data.resolution+'<br/>';
                                str += jQuery.i18n.map["crashes.root"]+': '+((data.root)? "yes" : "no")+'<br/>';
                            str += '</td>'+
                            '<td class="text-left">';
                                if(data.ram_current && data.ram_total)
                                    str += jQuery.i18n.map["crashes.ram"]+': '+data.ram_current+'/'+data.ram_total+' Mb<br/>';
                                if(data.disk_current && data.disk_total)
                                    str += jQuery.i18n.map["crashes.disk"]+': '+data.disk_current+'/'+data.disk_total+' Mb<br/>';
                                if(data.bat_current)
                                    str += jQuery.i18n.map["crashes.battery"]+': '+data.bat_current+'%<br/>';
                                if(data.run)
                                    str += jQuery.i18n.map["crashes.run"]+': '+countlyCommon.timeString(data.run/60)+'<br/>';
                                if(data.session)
                                    str += jQuery.i18n.map["crashes.after"]+' '+data.session+' '+jQuery.i18n.map["crashes.sessions"]+'<br/>';
                                else
                                    str += jQuery.i18n.map["crashes.frequency"]+': '+jQuery.i18n.map["crashes.first-crash"]+'<br/>';
                                str += jQuery.i18n.map["crashes.online"]+": "+((data.online)? "yes" : "no")+"<br/>";
                                str += jQuery.i18n.map["crashes.background"]+": "+((data.background)? "yes" : "no")+"<br/>";
                                str += jQuery.i18n.map["crashes.muted"]+": "+((data.muted)? "yes" : "no")+"<br/>";
                            str += '</td>';
                            if(data.custom){
                                str += '<td class="text-left">';
                                for(var i in data.custom){
                                    str += i+': '+data.custom[i]+'<br/>';
                                }
                                str += '</td>';
                            }
						str += '</tr>'+
                        '<tr>'+
                        '<td colspan="4" class="stack-trace">';
                        str += '<pre>' + data.error + '</pre></td>'+
						'</tr>';
                        if(data.logs){
                            str += '<tr>'+
                                '<td class="text-left">'+jQuery.i18n.map["crashes.logs"]+'</td>'+
                            '</tr>'+
                            '<tr>'+
                            '<td colspan="4">'+
                                '<pre>' + data.logs + '</pre></td>'+
                            '</tr>';
                        }
						str += '</table>'+
			'</div>';
		}
		return str;
	},
	switchMetric:function(metric){
		this.curMetric = metric;
		var crashData = countlyCrashes.getGroupData();
		countlyCommon.drawGraph(crashData.dp[this.curMetric], "#dashboard-graph", "bar");
	}
});

//register views
app.crashesView = new CrashesView();
app.crashgroupView = new CrashgroupView();

app.route('/crashes', 'crashes', function () {
    this.crashesView._filter = false;
    this.crashesView._query = null;
	this.renderWhenReady(this.crashesView);
});

app.route('/crashes/filter/*query', 'userdata', function (query) {
    try{
        query = JSON.parse(query);
    }
    catch(ex){
        query = null;
    }
    this.crashesView._query = query;
    this.crashesView._filter = true;
	this.renderWhenReady(this.crashesView);
});

app.route('/crashes/:group', 'crashgroup', function (group) {
	this.crashgroupView.id = group;
    this.renderWhenReady(this.crashgroupView);
});

app.addPageScript("/drill#", function(){
    var drillClone;
    var self = app.drillView;
    if(countlyGlobal["record_crashes"]){
        $("#drill-types").append('<div id="drill-type-crashes" class="item">'+jQuery.i18n.map["crashes.title"]+'</div>');
        $("#drill-type-crashes").on("click", function() {
            if ($(this).hasClass("active")) {
                return true;
            }
    
            $("#drill-types").find(".item").removeClass("active");
            $(this).addClass("active");
            $("#event-selector").hide();
    
            $("#drill-no-event").fadeOut();
            $("#segmentation-start").fadeOut().remove();
            $(this).parents(".cly-select").removeClass("dark");
    
            $(".event-select.cly-select").find(".text").text(jQuery.i18n.map["drill.select-event"]);
            $(".event-select.cly-select").find(".text").data("value","");
    
            currEvent = "[CLY]_crash";
    
            self.graphType = "line";
            self.graphVal = "times";
            self.filterObj = {};
            self.byVal = "";
            self.drillChartDP = {};
            self.drillChartData = {};
            self.activeSegmentForTable = "";
            countlySegmentation.reset();
    
            $("#drill-navigation").find(".menu[data-open=table-view]").hide();
    
            $.when(countlySegmentation.initialize(currEvent)).then(function () {
                $("#drill").replaceWith(drillClone.clone(true));
                self.adjustFilters();
                self.draw(true, false);
            });
        });
        setTimeout(function() {
            drillClone = $("#drill").clone(true);
        }, 0);
    }
});

$( document ).ready(function() {
    if(typeof extendViewWithFilter === "function")
        extendViewWithFilter(app.crashesView);
    app.addAppSwitchCallback(function(appId){
        countlyCrashes.loadList(appId);
    });
    if(!production){
        CountlyHelpers.loadJS("crashes/javascripts/marked.min.js");
    }
    
    var menu = '<a class="item" id="sidebar-crashes">'+
        '<div class="logo ion-alert-circled"></div>'+
        '<div class="text" data-localize="crashes.title"></div>'+
    '</a>'+
    '<div class="sidebar-submenu" id="crash-submenu">'+
        '<a href="#/crashes" class="item">'+
            '<div class="logo-icon fa fa-line-chart"></div>'+
            '<div class="text" data-localize="sidebar.dashboard">Overview</div>'+
        '</a>'+
    '</div>';
	if($('.sidebar-menu #management-menu').length)
		$('.sidebar-menu #management-menu').before(menu);
	else
		$('.sidebar-menu').append(menu);
    
    //check if configuration view exists
    if(app.configurationsView){
        app.configurationsView.registerLabel("crashes", "crashes.title");
    }
});