window.CrashesView = countlyView.extend({
	initialize:function () {
        this.loaded = true;
		this.filter = (store.get("countly_crashfilter")) ? store.get("countly_crashfilter") : "crash-all";
        this.curMetric = "cr";
        this.metrics = {
			cr:jQuery.i18n.map["crashes.total"],
			cru:jQuery.i18n.map["crashes.unique"],
			crnf:jQuery.i18n.map["crashes.nonfatal-crashes"],
			crf:jQuery.i18n.map["crashes.fatal"]+" "+jQuery.i18n.map["crashes.title"],
			crru:jQuery.i18n.map["crashes.resolved-users"]
		};
    },
    beforeRender: function() {
		if(this.template)
			return $.when(countlyCrashes.initialize()).then(function () {});
		else{
			var self = this;
			return $.when($.get(countlyGlobal["path"]+'/crashes/templates/crashes.html', function(src){
				self.template = Handlebars.compile(src);
			}), countlyCrashes.initialize()).then(function () {});
		}
    },
    renderCommon:function (isRefresh) {
        var crashData = countlyCrashes.getData();
        var chartData = countlyCrashes.getChartData(this.curMetric, this.metrics[this.curMetric]);
        var dashboard = countlyCrashes.getDashboardData();
        this.templateData = {
            "page-title":jQuery.i18n.map["crashes.title"],
            "usage":[
				{
					"title":jQuery.i18n.map["crashes.total"],
					"data":dashboard.usage['total'],
					"id":"crash-cr",
                    "help":"crashes.help-total"
				},
				{
					"title":jQuery.i18n.map["crashes.unique"],
					"data":dashboard.usage['unique'],
					"id":"crash-cru",
                    "help":"crashes.help-unique"
				},
				{
					"title":jQuery.i18n.map["crashes.nonfatal-crashes"],
					"data":dashboard.usage['nonfatal'],
					"id":"crash-crnf",
                    "help":"crashes.help-nonfatal"
				},
				{
					"title":jQuery.i18n.map["crashes.fatal"]+" "+jQuery.i18n.map["crashes.title"],
					"data":dashboard.usage['fatal'],
					"id":"crash-crf",
                    "help":"crashes.help-fatal"
				}/*,
				{
					"title":jQuery.i18n.map["crashes.resolved-users"],
					"data":dashboard.usage['resolved'],
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
            ]
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
			$("#"+this.filter).addClass("selected").addClass("active");
			$.fn.dataTableExt.afnFiltering.push(function( oSettings, aData, iDataIndex ) {
				if(!$(oSettings.nTable).hasClass("crash-filter"))
					return true;
				if((self.filter != "crash-hidden" && aData[2]) ||
                    (self.filter == "crash-resolved" && !aData[11]) || 
                    (self.filter == "crash-unresolved" && aData[11]) || 
                    (self.filter == "crash-nonfatal" && !aData[3]) || 
                    (self.filter == "crash-fatal" && aData[3]) || 
                    (self.filter == "crash-new" && !aData[0]) || 
                    (self.filter == "crash-viewed" && aData[0]) || 
                    (self.filter == "crash-reoccurred" && !aData[1]) || 
                    (self.filter == "crash-hidden" && !aData[2])){
					return false
				}
				return true;
			});
			countlyCommon.drawTimeGraph(chartData.chartDP, "#dashboard-graph");
			this.dtable = $('#crash-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": crashData.groups,
				"fnRowCallback": function( nRow, aData, iDisplayIndex, iDisplayIndexFull ) {
					$(nRow).attr("id", aData._id);
					if(aData.is_resolved)
                        $(nRow).addClass("resolvedcrash");
					else if(aData.is_new)
						$(nRow).addClass("newcrash");
                    else if(aData.is_renewed)
                        $(nRow).addClass("renewedcrash");
				},
                "aoColumns": [
					{ "mData": function(row, type){return (row.is_new) ? true : false;}, "bVisible": false} ,
					{ "mData": function(row, type){return (row.is_renewed) ? true : false;}, "bVisible": false} ,
					{ "mData": function(row, type){return (row.is_hidden) ? true : false;}, "bVisible": false} ,
					{ "mData": function(row, type){if(type == "display"){if(row.nonfatal) return jQuery.i18n.map["crashes.nonfatal"]; else return jQuery.i18n.map["crashes.fatal"];}else return (row.nonfatal) ? true : false;}, "sType":"string", "sTitle": jQuery.i18n.map["crashes.fatal"], "sWidth":"80px"} ,
					{ "mData": function(row, type){if(type == "display"){if(row.session){return ((Math.round(row.session.total/row.session.count)*100)/100)+" "+jQuery.i18n.map["crashes.sessions"];} else {return jQuery.i18n.map["crashes.first-crash"];}}else{if(row.session)return row.session.total/row.session.count; else return 0;}}, "sType":"string", "sTitle": jQuery.i18n.map["crashes.frequency"], "sWidth":"80px" },
					{ "mData": "reports", "sType":"numeric", "sTitle": jQuery.i18n.map["crashes.reports"], "sWidth":"80px" },
					{ "mData": function(row, type){if(type == "display") return row.users+" ("+((row.users/crashData.users.total)*100).toFixed(2)+"%)"; else return row.users}, "sType":"string", "sTitle": jQuery.i18n.map["crashes.users"], "sWidth":"60px" },
                    { "mData": "os", "sType":"string", "sTitle": jQuery.i18n.map["crashes.platform"], "sWidth":"70px" },
                    { "mData": function(row, type){return "<div class='truncated'>"+row.name+"</div>";}, "sType":"string", "sTitle": jQuery.i18n.map["crashes.error"] },
                    { "mData": function(row, type){if(type == "display") return countlyCommon.formatTimeAgo(row.lastTs); else return row.lastTs;}, "sType":"string", "sTitle": jQuery.i18n.map["crashes.last_time"], "sWidth":"100px" },
                    { "mData": function(row, type){return row.latest_version.replace(/:/g, '.');}, "sType":"string", "sTitle": jQuery.i18n.map["crashes.latest_app"], "sWidth":"100px" },
                    { "mData": function(row, type){if(type == "display"){ if(row.is_resolved) return "<span style='color:green;'>"+jQuery.i18n.map["crashes.resolved"]+" ("+row.latest_version.replace(/:/g, '.')+")</span>"; else return "<span style='color:red;'>"+jQuery.i18n.map["crashes.unresolved"]+"</span>";}else return row.is_resolved;}, "sType":"string", "sTitle": jQuery.i18n.map["crashes.resolved"], "sWidth":"70px" }
                ]
            }));
			this.dtable.stickyTableHeaders();
			this.dtable.fnSort( [ [9,'desc'] ] );
            
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
            $(".bar-inner").on({
                mouseenter:function () {
                    var number = $(this).parent().next();
    
                    number.text($(this).data("item"));
                    number.css({"color":$(this).css("background-color")});
                },
                mouseleave:function () {
                    var number = $(this).parent().next();
    
                    number.text(number.data("item"));
                    number.css({"color":$(this).parent().find(".bar-inner:first-child").css("background-color")});
                }
            });
			$('.crashes tbody').on("click", "tr", function (){
				var id = $(this).attr("id");
				if(id)
					window.location.hash = window.location.hash.toString()+"/"+id;
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
                $("#crash-big-numbers").replaceWith(newPage.find("#crash-big-numbers"));
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
                $(".bar-inner").on({
                    mouseenter:function () {
                        var number = $(this).parent().next();
        
                        number.text($(this).data("item"));
                        number.css({"color":$(this).css("background-color")});
                    },
                    mouseleave:function () {
                        var number = $(this).parent().next();
        
                        number.text(number.data("item"));
                        number.css({"color":$(this).parent().find(".bar-inner:first-child").css("background-color")});
                    }
                });
            
                var crashData = countlyCrashes.getData();
                CountlyHelpers.refreshTable(self.dtable, crashData.groups);
                var chartData = countlyCrashes.getChartData(self.curMetric, self.metrics[self.curMetric]);
                countlyCommon.drawTimeGraph(chartData.chartDP, "#dashboard-graph");
                app.localize();
            });
        }
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
});

window.CrashgroupView = countlyView.extend({
	initialize:function () {
        this.loaded = true;
    },
    beforeRender: function() {
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
			this.curMetric = "app_version";
			this.curTitle = jQuery.i18n.map["crashes.app_version"];
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
                        "total":crashData.os,
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
            },
			"ranges":[
				{
                    "title":jQuery.i18n.map["crashes.ram"],
					"icon":"crash-icon ram-icon",
                    "help":"crashes.help-ram",
                    "min":crashData.ram.min+" %",
                    "max":crashData.ram.max+" %",
                    "avg":(crashData.ram.total/crashData.ram.count).toFixed(2)+" %"
                },
				{
                    "title":jQuery.i18n.map["crashes.disk"],
					"icon":"crash-icon disk-icon",
                    "help":"crashes.help-disk",
                    "min":crashData.disk.min+" %",
                    "max":crashData.disk.max+" %",
                    "avg":(crashData.disk.total/crashData.disk.count).toFixed(2)+" %"
                },
				{
                    "title":jQuery.i18n.map["crashes.battery"],
					"icon":"crash-icon battery-icon",
                    "help":"crashes.help-battery",
                    "min":crashData.bat.min+" %",
                    "max":crashData.bat.max+" %",
                    "avg":(crashData.bat.total/crashData.bat.count).toFixed(2)+" %"
                },
				{
                    "title":jQuery.i18n.map["crashes.run"],
					"icon":"font-icon fa fa-youtube-play",
                    "help":"crashes.help-run",
                    "min":countlyCommon.timeString(crashData.run.min/60),
                    "max":countlyCommon.timeString(crashData.run.max/60),
                    "avg":countlyCommon.timeString((crashData.run.total/crashData.run.count)/60)
                }
            ],
            "bars":[
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
            ]
        };
        if(crashData.loss){
            this.templateData["loss"] = true;
            this.templateData["big-numbers"]["items"].push({
                "title":jQuery.i18n.map["crashes.loss"],
                "total":crashData.loss,
                "help":"crashes.help-loss"
            });
        }
        
        if(this.templateData["big-numbers"]["items"].length == 3)
            this.templateData["big-numbers"]["class"] = "three-column";
        else if(this.templateData["big-numbers"]["items"].length == 5)
            this.templateData["big-numbers"]["class"] = "five-column";
        
        if(crashData.session){
            this.templateData["frequency"] = true;
            this.templateData["ranges"].push({
                "title":jQuery.i18n.map["crashes.sessions"],
				"icon":"font-icon fa fa-refresh",
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
                var str = '<div title="Drill down this data with Countly Drill" id="drill-down-for-view" data-drill-id="sg.crash" data-drill-val="'+this.id+'" data-drill-section="crashes" class="icon-button light" style="font-size: 14px; padding: 5px 5px 4px 5px; margin: 6px 0 0 13px; border-radius: 15px;">'+
                    '<span class="fa fa-sort-amount-desc" style="color:#86BB64;"></span>'+
                '</div>';
                $("#content .widget:first-child .widget-header>.right").append(str);
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
					{ "mData": function(row, type){if(type == "display") return countlyCommon.formatTimeAgo(row.ts); else return row.ts;}, "sType":"string", "sTitle": jQuery.i18n.map["crashes.crashed"]},
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
			
			$("#mark-resolved").click(function(){
				$("#mark-resolved").css("display", "none");
				$("#unresolved-text").css("display", "none");
				countlyCrashes.markResolve(crashData._id, function(version){
                    if(version){
                        $("#mark-unresolved").css("display", "block");
                        $("#resolved-text").css("display", "inline");
                        $("#resolved-version").text(version);
                    }
                    else{
                        CountlyHelpers.alert(jQuery.i18n.map["crashes.try-later"], "red");
                    }
				});
			});
			
			$("#mark-unresolved").click(function(){
				$("#mark-unresolved").css("display", "none");
				$("#resolved-text").css("display", "none");
				countlyCrashes.markUnresolve(crashData._id, function(data){
                    if(data){
                        $("#mark-resolved").css("display", "block");
                        $("#unresolved-text").css("display", "inline");
                    }
                    else{
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
            
            $(".btn-share-crash").click(function(){
				if ($(this).hasClass("active")){
                    $(this).removeClass("active");
                    $("#crash-share-list").slideUp();
                }
                else{
                    $(this).addClass("active")
                    $("#crash-share-list").slideDown();
                }
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
            
            $( "#tabs" ).tabs();
            $( "#crash-notes" ).click(function(){
                var crashData = countlyCrashes.getGroupData();
                if(crashData.comments){
                    for(var i = 0; i < crashData.comments.length; i++){
                        store.set("countly_"+self.id+"_"+crashData.comments[i]._id, true);
                    }
                    $(".crash-comment-count").hide();
                }
            });
            var pre = $(".crash-stack pre")[0];
            pre.innerHTML = '<span class="line-number"></span>' + pre.innerHTML + '<span class="cl"></span>';
            var num = pre.innerHTML.split(/\n/).length;
            for (var i = 0; i < num; i++) {
                var line_num = pre.getElementsByTagName('span')[0];
                line_num.innerHTML += '<span>' + (i + 1) + '</span>';
            }
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
        }
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
                $(".crash-ranges").replaceWith(newPage.find(".crash-ranges"));
                $(".crash-bars").replaceWith(newPage.find(".crash-bars"));

                var crashData = countlyCrashes.getGroupData();
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
							'<td class="text-left">'+jQuery.i18n.map["crashes.app_version"]+':</td>'+
							'<td class="text-left">'+jQuery.i18n.map["crashes.device"]+':</td>'+
							'<td class="text-left">'+jQuery.i18n.map["crashes.state"]+':</td>';
                            if(data.custom)
                                str += '<td class="text-left">'+jQuery.i18n.map["crashes.custom"]+':</td>';
                            if(data.logs)
                                str += '<td class="text-left">'+jQuery.i18n.map["crashes.logs"]+':</td>';
						str += '</tr>'+
						'<tr>'+
							'<td class="text-right">'+data.app_version.replace(/:/g, '.')+'</td>'+
							'<td class="text-right">'+data.os+' ';
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
                                str += jQuery.i18n.map["crashes.online"]+":"+((data.online)? "yes" : "no")+"<br/>";
                                str += jQuery.i18n.map["crashes.background"]+":"+((data.background)? "yes" : "no")+"<br/>";
                                str += jQuery.i18n.map["crashes.muted"]+":"+((data.muted)? "yes" : "no")+"<br/>";
                            str += '</td>';
                            if(data.custom){
                                str += '<td class="text-left">';
                                for(var i in data.custom){
                                    str += i+': '+data.custom[i]+'<br/>';
                                }
                                str += '</td>';
                            }
                            if(data.logs){
                                str += '<td class="text-left">'+
                                    '<pre>'+data.logs+'</pre>'+
                                '</td>';
                            }
						str += '</tr>'+
						'</table>'+
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
	this.renderWhenReady(this.crashesView);
});
app.route('/crashes/:group', 'crashgroup', function (group) {
	this.crashgroupView.id = group;
    this.renderWhenReady(this.crashgroupView);
});
app.addPageScript("/crashes", function(){
   $("#crash-selector").find(">.button").click(function () {
        if ($(this).hasClass("selected")) {
            return true;
        }

        $(".crash-selector").removeClass("selected").removeClass("active");
		var filter = $(this).attr("id");
		app.activeView.filterCrashes(filter);
    });
});

app.addPageScript("/drill", function(){
    var drillClone;
    var self = app.drillView;
	$("#drill-types").append('<div id="drill-type-crashes" style="padding: 6px 8px 7px 8px;" class="icon-button light">'+jQuery.i18n.map["crashes.title"]+'</div>');
    $("#drill-type-crashes").on("click", function() {
        if ($(this).hasClass("active")) {
            return true;
        }

        $("#drill-types").find(".icon-button").removeClass("active");
        $(this).addClass("active");
        $("#event-selector").hide();

        $("#drill-no-event").fadeOut();
        $("#segmentation-start").fadeOut().remove();
        $(this).parents(".cly-select").removeClass("dark");

        $(".event-select.cly-select").find(".text").text("Select an Event");
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
});

$( document ).ready(function() {
    if(!production){
        CountlyHelpers.loadJS("crashes/javascripts/marked.min.js");
    }
	var menu = '<a href="#/crashes" class="item" id="crash-menu">'+
        '<div class="logo fa fa-exclamation-triangle" style="background-image:none; font-size:24px; text-align:center; width:35px; margin-left:14px; line-height:42px;"></div>'+
        '<div class="text" data-localize="crashes.title"></div>'+
    '</a>';
	if($('.sidebar-menu #management-menu').length)
		$('.sidebar-menu #management-menu').before(menu);
	else
		$('.sidebar-menu').append(menu);
    
    //check if configuration view exists
    if(app.configurationsView){
        app.configurationsView.registerLabel("crashes", "Crashes");
        app.configurationsView.registerLabel("crashes-report_limit", "Amount of reports displayed");
    }
});