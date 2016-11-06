window.ReportingView = countlyView.extend({
	initialize:function () {},
    beforeRender: function() {
		if(this.template)
			return $.when(countlyReporting.initialize()).then(function () {});
		else{
			var self = this;
			return $.when($.get(countlyGlobal["path"]+'/reports/templates/reports.html', function(src){
				self.template = Handlebars.compile(src);
			}), countlyReporting.initialize()).then(function () {});
		}
    },
    getDayName: function(day){
        switch(day){
            case 1:
                return jQuery.i18n.map["reports.monday"];
            case 2:
                return jQuery.i18n.map["reports.tuesday"];
            case 3:
                return jQuery.i18n.map["reports.wednesday"];
            case 4:
                return jQuery.i18n.map["reports.thursday"];
            case 5:
                return jQuery.i18n.map["reports.friday"];
            case 6:
                return jQuery.i18n.map["reports.saturday"];
            case 7:
                return jQuery.i18n.map["reports.sunday"];
            default:
                return "";
        }
    },
    getDayNumber: function(day){
        switch(day){
            case jQuery.i18n.map["reports.monday"]:
                return "1";
            case jQuery.i18n.map["reports.tuesday"]:
                return "2";
            case jQuery.i18n.map["reports.wednesday"]:
                return "3";
            case jQuery.i18n.map["reports.thursday"]:
                return "4";
            case jQuery.i18n.map["reports.friday"]:
                return "5";
            case jQuery.i18n.map["reports.saturday"]:
                return "6";
            case jQuery.i18n.map["reports.sunday"]:
                return "7";
            default:
                return "1";
        }
    },
    renderCommon:function (isRefresh) {
        var cnts = app.manageAppsView.getTimeZones();
        var zones = {};
        var zNames = {};
        var zoneNames = [];
        for(var i in cnts){
            for(var j = 0; j < cnts[i].z.length; j++){
                for(var k in cnts[i].z[j]){
                    zoneNames.push(k);
                    zones[k] = cnts[i].z[j][k];
                    zNames[cnts[i].z[j][k]] = k;
                }
            }
        }
        
        var data = countlyReporting.getData();
        for(var i = 0; i < data.length; i++){
            if(data[i].apps && data[i].apps.length){
                data[i].appNames = CountlyHelpers.appIdsToNames(data[i].apps).split(", ");
                if(data[i].hour < 10)
                    data[i].hour = "0"+data[i].hour;
                if(data[i].minute < 10)
                    data[i].minute = "0"+data[i].minute;
                
                data[i].dayname = this.getDayName(data[i].day);
                data[i].zoneName = zNames[data[i].timezone] || "(GMT+00:00) GMT (no daylight saving)";
            }
        }
        
        zoneNames.sort(function(a, b){
            a = parseFloat(a.split(")")[0].replace(":", ".").substring(4));
            b = parseFloat(b.split(")")[0].replace(":", ".").substring(4));
            if(a < b) return -1;
            if(a > b) return 1;
            return 0;
        });
        this.zoneNames = zoneNames;
        this.zones = zones;
        this.templateData = {
            "page-title":jQuery.i18n.map["reports.title"],
            "data":data,
            "apps":(countlyGlobal["member"].global_admin) ? countlyGlobal['apps'] : countlyGlobal['admin_apps'],
            "zoneNames":zoneNames,
            "member":countlyGlobal["member"],
            "hasCrash":(typeof countlyCrashes != "undefined"),
            "hasPush":(typeof countlyPush != "undefined"),
            "hasRevenue":(typeof countlyRevenue != "undefined"),
            "hasViews":(typeof countlyViews != "undefined")
        };
		var self = this;
        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
			self.dtable = $('#reports-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": data,
                "fnRowCallback": function( nRow, aData, iDisplayIndex, iDisplayIndexFull ) {
                    $(nRow).attr("id", aData._id);
                },
                "aoColumns": [
                    { "mData": function(row, type){return row.appNames.join("<br/>");}, "sType":"string", "sTitle": jQuery.i18n.map["reports.apps"]},
                    { "mData": function(row, type){return row.emails.join("<br/>");}, "sType":"string", "sTitle": jQuery.i18n.map["reports.emails"]},
                    { "mData": function(row, type){var ret = ""; for(var i in row.metrics) ret += jQuery.i18n.map["reports."+i]+"<br/>"; return ret;}, "sType":"string", "sTitle": jQuery.i18n.map["reports.metrics"]},
                    { "mData": function(row, type){return jQuery.i18n.map["reports."+row.frequency];}, "sType":"string", "sTitle": jQuery.i18n.map["reports.frequency"]},
                    { "mData": function(row, type){var ret = jQuery.i18n.map["reports.at"]+" "+row.hour+":"+row.minute+"<br/>"+row.zoneName; if(row.frequency == "weekly") ret += "<br/>"+jQuery.i18n.map["reports.on"]+" "+ row.dayname; return ret;}, "sType":"string", "sTitle": jQuery.i18n.map["reports.time"]}
                ]
            }));
            self.dtable.fnSort( [ [0,'desc'] ] );
            self.dtable.stickyTableHeaders();
            CountlyHelpers.expandRows(self.dtable, self.editReport, self);
            self.initTable();
            $("#add-report").on("click", function(){
                CountlyHelpers.closeRows(self.dtable);
                $("#listof-apps").hide();
                $(".row").removeClass("selected");
                if ($(".create-report-row").is(":visible")) { 
                     $(".create-report-row").slideUp();
                }
                else{
                    $(".create-report-row").slideDown();
                    self.initTable();
                }
            });
            $(".create-report").on("click", function() {		
                $("#listof-apps").hide();
                
                var data = {},
                    currUserDetails = $(".user-details:visible");
                
                data.frequency = currUserDetails.find("input[name=frequency]:checked").val();
                var time = currUserDetails.find(".reports-time .text").text().split(":");
                data.hour = time[0];
                data.minute = time[1];
                data.day = app.reportingView.getDayNumber(currUserDetails.find(".reports-day .text").text());
                data.timezone = self.zones[currUserDetails.find(".reports-timezone .text").text()] || "Etc/GMT";
                data.emails = [];
                var lines = currUserDetails.find(".reports-emails").val().split(/\n/);
                for (var i=0; i < lines.length; i++) {
                    if (/\S/.test(lines[i])) {
                        data.emails.push($.trim(lines[i]));
                    }
                }
                data.apps = currUserDetails.find(".app-list").val().split(",");
                data.metrics = {};
                currUserDetails.find(".reports-metrics:checked").each(function(){
                    data.metrics[$(this).attr("name")] = true;
                })
                
                $(".required").fadeOut().remove();
                var reqSpan = $("<span>").addClass("required").text("*");
                
                if (!data.frequency || !data.frequency.length) {
                    currUserDetails.find(".reports-frequency-title").after(reqSpan.clone());
                }
                
                if (!data.hour.length) {
                    currUserDetails.find(".reports-hour").after(reqSpan.clone());
                }
                
                if (!data.minute.length) {
                    currUserDetails.find(".reports-minute").after(reqSpan.clone());
                }
                
                if (!data.day.length) {
                    currUserDetails.find(".reports-day").after(reqSpan.clone());
                }
                
                if (!data.emails.length) {
                    currUserDetails.find(".reports-emails").after(reqSpan.clone());
                }
                
                if (!data.apps.length || data.apps[0] == "") {
                    currUserDetails.find(".user-admin-list").before(reqSpan.clone());
                }
                
                if(JSON.stringify(data.metrics) == "{}"){
                    currUserDetails.find(".reports-include").append(reqSpan.clone());
                }
                
                
                if ($(".required").length) {
                    $(".required").fadeIn();
                    return false;
                } else if ($(".red-text").length) {
                    return false;
                }
                
                $.when(countlyReporting.create(data)).then(function (data) {
                    if(data.result == "Success"){
                        app.activeView.render();
                    }
                    else{
                        CountlyHelpers.alert(data.result, "red");
                    }
                });
            });
            $("#select-all").on('click', function() {
                $("#listof-apps .app:not(.disabled)").addClass("selected");
                var adminsOf = [];
                var adminOfIds = [];
                
                $("#listof-apps .app.selected").each(function() {
                    adminsOf[adminsOf.length] = $(this).find(".name").text();
                    adminOfIds[adminOfIds.length] = $(this).find(".app_id").val();
                });
                
                activeRow.find(".user-admin-list").text(adminsOf.join(", "));
                activeRow.find(".app-list").val(adminOfIds.join(","));
                activeRow.find(".no-apps").hide();
                
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
                    
            $("#listof-apps .app").on('click', function() {
                
                if ($(this).hasClass("disabled")) {
                    return true;
                }
                
                $(this).toggleClass("selected");
                
                if ($("#listof-apps .app.selected").length == $("#listof-apps .app").length) {
                    $("#select-all").hide();
                    $("#deselect-all").show();
                } else {
                    $("#select-all").show();
                    $("#deselect-all").hide();
                }
                
                adminsOf = [];
                var adminOfIds = [];
                $("#listof-apps .app.selected").each(function() {
                    adminsOf[adminsOf.length] = $(this).find(".name").text();
                    adminOfIds[adminOfIds.length] = $(this).find(".app_id").val();
                });
                
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
            
            $("#done").on('click', function() {
                $("#listof-apps").hide();
            });	
        }
    },
    initTable: function() {
        var self = this;
        function closeActiveEdit() {
            $(".create-report-row").slideUp();
            CountlyHelpers.closeRows(self.dtable);
            $("#listof-apps").hide();
        }
        $(".select-apps").off("click").on('click', function() {
            $("#listof-apps .app").removeClass("selected");
            activeRow = $(this).parent(".row");
            var buttonPos = $(this).offset();
            buttonPos.top = Math.floor(buttonPos.top) + 25;
            buttonPos.left = Math.floor(buttonPos.left) - 18;
            
            if ($("#listof-apps").is(":visible") && JSON.stringify(buttonPos) === JSON.stringify(previousSelectAppPos)) {
                $("#listof-apps").hide();
                return true;
            }
            
            previousSelectAppPos = buttonPos;
            
            var appList = activeRow.find(".app-list").val().split(",");
            
            $("#listof-apps").find(".app_id").each(function() {
                if (appList.indexOf($(this).val()) != -1) {
                    $(this).parent().addClass("selected");
                }
            });
            
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
            
            $("#listof-apps").show().offset(buttonPos);
            $("#listof-apps").find(".search input").focus();
        });
        
        $(".save-report").off("click").on("click", function() {
            $("#listof-apps").hide();
            
            lastUserSaved = true;
            
            var data = {},
                currUserDetails = $(".user-details:visible");
            
            data.frequency = currUserDetails.find("input[name=frequency]:checked").val();
            var time = currUserDetails.find(".reports-time .text").text().split(":");
            data.hour = time[0];
            data.minute = time[1];
            data.day = app.reportingView.getDayNumber(currUserDetails.find(".reports-day .text").text());
            data.timezone = self.zones[currUserDetails.find(".reports-timezone .text").text()] || "Etc/GMT";
            data.emails = [];
            var lines = currUserDetails.find(".reports-emails").val().split(/\n/);
            for (var i=0; i < lines.length; i++) {
                if (/\S/.test(lines[i])) {
                    data.emails.push($.trim(lines[i]));
                }
            }
            data.apps = currUserDetails.find(".app-list").val().split(",");
            data.metrics = {};
            currUserDetails.find(".reports-metrics:checked").each(function(){
                data.metrics[$(this).attr("name")] = true;
            });
            data._id = currUserDetails.find("._id").val();
            
            $(".required").fadeOut().remove();
            var reqSpan = $("<span>").addClass("required").text("*");
            
            if (!data.frequency || !data.frequency.length) {
                currUserDetails.find(".reports-frequency-title").after(reqSpan.clone());
            }
            
            if (!data.hour.length) {
                currUserDetails.find(".reports-hour").after(reqSpan.clone());
            }
            
            if (!data.minute.length) {
                currUserDetails.find(".reports-minute").after(reqSpan.clone());
            }
            
            if (!data.day.length) {
                currUserDetails.find(".reports-day").after(reqSpan.clone());
            }
            
            if (!data.emails.length) {
                currUserDetails.find(".reports-emails").after(reqSpan.clone());
            }
            
            if (!data.apps.length || data.apps[0] == "") {
                currUserDetails.find(".user-admin-list").before(reqSpan.clone());
            }
            
            if(JSON.stringify(data.metrics) == "{}"){
                currUserDetails.find(".reports-include").append(reqSpan.clone());
            }
            
            
            if ($(".required").length) {
                $(".required").fadeIn();
                return false;
            } else if ($(".red-text").length) {
                return false;
            }
            
            $.when(countlyReporting.update(data)).then(function (data) {
                if(data.result == "Success"){
                    app.activeView.render();
                }
                else{
                    CountlyHelpers.alert(data.result, "red");
                }
            });
        });
        
        $(".cancel-report").off("click").on("click", function() {
            closeActiveEdit();
        });
        
        $(".delete-report").off("click").on("click", function() {
            var currUserDetails = $(".user-details:visible");
        
            var self = $(this);
            CountlyHelpers.confirm(jQuery.i18n.map["reports.confirm"], "red", function(result) {
                
                if (!result) {
                    return false;
                }
            
                var id = self.parent(".button-container").find("._id").val();
    
                $.when(countlyReporting.del(id)).then(function (data) {
                    if(data.result == "Success"){
                        app.activeView.render();
                    }
                    else{
                        CountlyHelpers.alert(data.result, "red");
                    }
                });
                
            });
        });
        
        $(".send-report").on("click", function() {
            var currUserDetails = $(".user-details:visible");
            var id = $(this).parent(".button-container").find("._id").val();
            var overlay = $("#overlay").clone();
            $("body").append(overlay);
            overlay.show();
            $.when(countlyReporting.send(id)).always(function (data) {
                overlay.hide();
                if(data && data.result == "Success"){
                    CountlyHelpers.alert(jQuery.i18n.map["reports.sent"], "green");
                }
                else{
                    if(data && data.result)
                        CountlyHelpers.alert(data.result, "red");
                    else
                        CountlyHelpers.alert(jQuery.i18n.map["reports.too-long"], "red");
                }
            });
        });
        
        $('input[name=frequency]').off("click").on("click", function(){
            currUserDetails = $(".user-details:visible");
            switch($(this).val()){
                case "daily":
                    currUserDetails.find(".reports-dow").hide();
                    break;
                case "weekly":
                    currUserDetails.find(".reports-dow").show();
                    break;
            }
        });
        CountlyHelpers.initializeSelect($(".user-details"));
    },
    editReport: function( d, self ) {
        $(".create-report-row").slideUp();
        $("#listof-apps").hide();
        $(".row").removeClass("selected");
        CountlyHelpers.closeRows(self.dtable);
		// `d` is the original data object for the row
		var str = '';
		if(d){
			str += '<div class="user-details datatablesubrow">';
            str += '<div>';
            str += '<div class="row help-zone-vs">';
			str += '<div class="title reports-frequency-title" data-localize="reports.frequency">'+jQuery.i18n.map["reports.frequency"]+'</div>';
			str += '<div class="detail">';
            if(d.frequency == "daily"){
                str += '<input class="reports-frequency" type="radio" name="frequency" value="daily" checked="checked"><span data-localize="reports.daily">'+jQuery.i18n.map["reports.daily"]+'</span>&nbsp;';
                str += '<input class="reports-frequency" type="radio" name="frequency" value="weekly"><span data-localize="reports.weekly">'+jQuery.i18n.map["reports.weekly"]+'</span>&nbsp;';
            }else{
                str += '<input class="reports-frequency" type="radio" name="frequency" value="daily"><span data-localize="reports.daily">'+jQuery.i18n.map["reports.daily"]+'</span>&nbsp;';
                str += '<input class="reports-frequency" type="radio" name="frequency" value="weekly" checked="checked"><span data-localize="reports.weekly">'+jQuery.i18n.map["reports.weekly"]+'</span>&nbsp;';
            }
            str += '</div>';
			str += '</div>';
            str += '<div class="row help-zone-vs">';
			str += '<div class="title" data-localize="reports.time">'+jQuery.i18n.map["reports.time"]+'</div>';
			str += '<div class="detail">';
            str += '<div class="cly-select reports-time">';
            str += '<div class="select-inner">';
            str += '<div class="text-container">';
            str += '<div class="text">'+d.hour+':'+d.minute+'</div>';
            str += '</div>';
            str += '<div class="right combo"></div>';
            str += '</div>';
            str += '<div class="select-items square">';
            str += '<div>';
            str += '<div data-value="00:00" class="segmentation-option item">00:00</div>';
            str += '<div data-value="01:00" class="segmentation-option item">01:00</div>';
            str += '<div data-value="02:00" class="segmentation-option item">02:00</div>';
            str += '<div data-value="03:00" class="segmentation-option item">03:00</div>';
            str += '<div data-value="04:00" class="segmentation-option item">04:00</div>';
            str += '<div data-value="05:00" class="segmentation-option item">05:00</div>';
            str += '<div data-value="06:00" class="segmentation-option item">06:00</div>';
            str += '<div data-value="07:00" class="segmentation-option item">07:00</div>';
            str += '<div data-value="08:00" class="segmentation-option item">08:00</div>';
            str += '<div data-value="09:00" class="segmentation-option item">09:00</div>';
            str += '<div data-value="10:00" class="segmentation-option item">10:00</div>';
            str += '<div data-value="11:00" class="segmentation-option item">11:00</div>';
            str += '<div data-value="12:00" class="segmentation-option item">12:00</div>';
            str += '<div data-value="13:00" class="segmentation-option item">13:00</div>';
            str += '<div data-value="14:00" class="segmentation-option item">14:00</div>';
            str += '<div data-value="15:00" class="segmentation-option item">15:00</div>';
            str += '<div data-value="16:00" class="segmentation-option item">16:00</div>';
            str += '<div data-value="17:00" class="segmentation-option item">17:00</div>';
            str += '<div data-value="18:00" class="segmentation-option item">18:00</div>';
            str += '<div data-value="19:00" class="segmentation-option item">19:00</div>';
            str += '<div data-value="20:00" class="segmentation-option item">20:00</div>';
            str += '<div data-value="21:00" class="segmentation-option item">21:00</div>';
            str += '<div data-value="22:00" class="segmentation-option item">22:00</div>';
            str += '<div data-value="23:00" class="segmentation-option item">23:00</div>';
            str += '</div>';
            str += '</div>';
            str += '</div>';
            str += '</div>';
			str += '</div>';
            str += '<div class="row help-zone-vs">';
			str += '<div class="title" data-localize="reports.timezone">'+jQuery.i18n.map["reports.timezone"]+'</div>';
			str += '<div class="detail">';
            str += '<div class="cly-select reports-timezone">';
            str += '<div class="select-inner">';
            str += '<div class="text-container">';
            str += '<div class="text">'+d.zoneName+'</div>';
            str += '</div>';
            str += '<div class="right combo"></div>';
            str += '</div>';
            str += '<div class="select-items square">';
            str += '<div>';
            for(var i = 0; i < self.zoneNames.length; i++){
                str += '<div data-value="'+self.zoneNames[i]+'" class="segmentation-option item">'+self.zoneNames[i]+'</div>'
            }
            str += '</div>';
            str += '</div>';
            str += '</div>';
            str += '</div>';
			str += '</div>';
            if(d.frequency == "weekly")
                str += '<div class="row reports-dow" style="display:block;">';
            else
                str += '<div class="row reports-dow">';
			str += '<div class="title"><span data-localize="reports.dow">'+jQuery.i18n.map["reports.dow"]+'</span></div>';
			str += '<div class="detail">';
			str += '<div class="cly-select reports-day">';
            str += '<div class="select-inner">';
            str += '<div class="text-container">';
            str += '<div class="text">'+d.dayname+'</div>';
            str += '</div>';
            str += '<div class="right combo"></div>';
            str += '</div>';
            str += '<div class="select-items square">';
            str += '<div>';
            str += '<div data-value="1" class="segmentation-option item" data-localize="reports.monday">'+jQuery.i18n.map["reports.monday"]+'</div>';
            str += '<div data-value="2" class="segmentation-option item" data-localize="reports.tuesday">'+jQuery.i18n.map["reports.tuesday"]+'</div>';
            str += '<div data-value="3" class="segmentation-option item" data-localize="reports.wednesday">'+jQuery.i18n.map["reports.wednesday"]+'</div>';
            str += '<div data-value="4" class="segmentation-option item" data-localize="reports.thursday">'+jQuery.i18n.map["reports.thursday"]+'</div>';
            str += '<div data-value="5" class="segmentation-option item" data-localize="reports.friday">'+jQuery.i18n.map["reports.friday"]+'</div>';
            str += '<div data-value="6" class="segmentation-option item" data-localize="reports.saturday">'+jQuery.i18n.map["reports.saturday"]+'</div>';
            str += '<div data-value="7" class="segmentation-option item" data-localize="reports.sunday">'+jQuery.i18n.map["reports.sunday"]+'</div>';
            str += '</div>';
            str += '</div>';
            str += '</div>';
			str += '</div>';
			str += '</div>';
			str += '<div class="row">';
			str += '<div class="title"><span data-localize="reports.emails">'+jQuery.i18n.map["reports.emails"]+'</span><br/>';
            str += '(<span data-localize="reports.help-emails">'+jQuery.i18n.map["reports.help-emails"]+'</span>)</div>';
			str += '<div class="detail">';
			str += '<textarea name="emails" class="reports-emails" cols="20" rows="5">';
            str += d.emails.join("\n");
            str += '</textarea>';
			str += '</div>';
			str += '</div>';
            str += '<div class="row admin-apps help-zone-vs">';
			str += '<div class="title" data-localize="reports.apps">'+jQuery.i18n.map["reports.apps"]+'</div>';
			str += '<div class="select-apps">';
            str += '<i class="fa fa-plus-circle"></i>';
			str += '<input type="hidden" value="'+d.apps+'" class="app-list"/>';
			str += '</div>';
			str += '<div class="detail user-admin-list">';
            if(d.apps)
                str += CountlyHelpers.appIdsToNames(d.apps);
            else
                str += '<span data-localize="reports.help-apps">'+jQuery.i18n.map["reports.help-apps"]+'</span>';
			str += '</div>';
			str += '<div class="no-apps" data-localize="reports.help-apps">'+jQuery.i18n.map["reports.help-apps"]+'</div>';
			str += '</div>';
            str += '<div class="row help-zone-vs">';
			str += '<div class="title reports-include" data-localize="reports.include-metrics">'+jQuery.i18n.map["reports.include-metrics"]+'</div>';
			str += '<div class="detail">';
            str += '<input type="checkbox" class="reports-metrics" name="analytics"';
            if(d.metrics.analytics) str += " checked ";
            str += '/>&nbsp;<span data-localize="reports.analytics">'+jQuery.i18n.map["reports.analytics"]+'</span><br/>';
            str += '<input type="checkbox" class="reports-metrics" name="events"';
            if(d.metrics.events) str += " checked ";
            str += '/>&nbsp;<span data-localize="reports.events">'+jQuery.i18n.map["reports.events"]+'</span><br/>';
            if(typeof countlyRevenue != "undefined"){
                str += '<input type="checkbox" class="reports-metrics" name="revenue"';
                if(d.metrics.revenue) str += " checked ";
                str += '/>&nbsp;<span data-localize="reports.revenue">'+jQuery.i18n.map["reports.revenue"]+'</span><br/>';
            }
            if(typeof countlyPush != "undefined"){
                str += '<input type="checkbox" class="reports-metrics" name="push"';
                if(d.metrics.push) str += " checked ";
                str += '/>&nbsp;<span data-localize="reports.push">'+jQuery.i18n.map["reports.push"]+'</span><br/>';
            }
            if(typeof countlyCrashes != "undefined"){
                str += '<input type="checkbox" class="reports-metrics" name="crash"';
                if(d.metrics.crash) str += " checked ";
                str += '/>&nbsp;<span data-localize="reports.crash">'+jQuery.i18n.map["reports.crash"]+'</span><br/>';
            }
            str += '</div>';
			str += '</div>';
			str += '<div class="button-container">';
			str += '<input class="_id" type="hidden" value="'+d._id+'"/>';
            str += '<a href=\'/i/reports/preview?api_key='+countlyGlobal["member"].api_key+'&args='+JSON.stringify({_id:d._id})+'\' target="_blank" class="icon-button green" data-localize="reports.preview">'+jQuery.i18n.map["reports.preview"]+'</a>';
            str += '<a class="icon-button green send-report" data-localize="reports.send">'+jQuery.i18n.map["reports.send"]+'</a>';
			str += '<a class="icon-button light save-report" data-localize="common.save">'+jQuery.i18n.map["common.save"]+'</a>';
			str += '<a class="icon-button light cancel-report" data-localize="common.cancel">'+jQuery.i18n.map["common.cancel"]+'</a>';
			str += '<a class="icon-button red delete-report" data-localize="reports.delete">'+jQuery.i18n.map["reports.delete"]+'</a>';
			str += '</div>';
			str += '</div>';
			str += '</div>';
		}
        setTimeout(function(){self.initTable();}, 1);
		return str;
	}
});

//register views
app.reportingView = new ReportingView();

if(countlyGlobal["member"].global_admin || countlyGlobal["member"]["admin_of"].length){
    app.route('/manage/reports', 'reports', function () {
        this.renderWhenReady(this.reportingView);
    });
}

$( document ).ready(function() {
	if(countlyGlobal["member"].global_admin || countlyGlobal["member"]["admin_of"].length){
        var menu = '<a href="#/manage/reports" class="item">'+
            '<div class="logo-icon fa fa-envelope"></div>'+
            '<div class="text" data-localize="reports.title"></div>'+
        '</a>';
        if($('#management-submenu .help-toggle').length)
            $('#management-submenu .help-toggle').before(menu);
    }
});