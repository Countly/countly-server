window.ReportingView = countlyView.extend({
	initialize:function () {
        statusChanged = {};
    },
    beforeRender: function() {
		if(this.template)
			return $.when(countlyReporting.initialize(), countlyReporting.requestEmailAddressList()).then(function () {});
		else{
			var self = this;
			return $.when(
                $.get(countlyGlobal["path"] + '/reports/templates/drawer.html', function (src) {
                    Handlebars.registerPartial("reports-drawer-template", src);
                }),
                $.get(countlyGlobal["path"]+'/reports/templates/reports.html', function(src){
				    self.template = Handlebars.compile(src);
                }), 
                countlyReporting.requestEmailAddressList(),
                countlyReporting.initialize()).then(function () {});
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
        ReportingView.zones = {};
        var zNames = {};
        var zoneNames = [];
        for(var i in cnts){
            for(var j = 0; j < cnts[i].z.length; j++){
                for(var k in cnts[i].z[j]){
                    zoneNames.push(k);
                    ReportingView.zones[k] = cnts[i].z[j][k];
                    zNames[cnts[i].z[j][k]] = k;
                }
            }
        }
        
        var data = countlyReporting.getData();
        for(var i = 0; i < data.length; i++){
            data[i].appNames = CountlyHelpers.appIdsToNames(data[i].apps || []).split(", ");
            if(data[i].hour < 10)
                data[i].hour = "0"+data[i].hour;
            if(data[i].minute < 10)
                data[i].minute = "0"+data[i].minute;
            
            data[i].dayname = this.getDayName(data[i].day);
            data[i].zoneName = zNames[data[i].timezone] || "(GMT+00:00) GMT (no daylight saving)";
        }

        zoneNames.sort(function(a, b){
            a = parseFloat(a.split(")")[0].replace(":", ".").substring(4));
            b = parseFloat(b.split(")")[0].replace(":", ".").substring(4));
            if(a < b) return -1;
            if(a > b) return 1;
            return 0;
        });
        this.zoneNames = zoneNames;
        this.zones = ReportingView.zones;
        this.templateData = {
            "page-title":jQuery.i18n.map["reports.title"],
            "data":data,
            "apps":countlyGlobal['apps'],
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
                    {"mData": 'title',"sType": "string","sTitle": jQuery.i18n.map['report.report-title']},
                    {
                        "mData": function (row, type) {
                            if (type == "display") {
                                var disabled = (row.prepackaged) ? 'disabled' : '';
                                var input = '<div class="on-off-switch ' + disabled + '">';
                                if (row.enabled) {
                                    input += '<input type="checkbox" class="on-off-switch-checkbox report-switcher" id="plugin-' + row._id + '" checked ' + disabled + '>';
                                } else {
                                    input += '<input type="checkbox" class="on-off-switch-checkbox report-switcher" id="plugin-' + row._id + '" ' + disabled + '>';
                                }
                                input += '<label class="on-off-switch-label" for="plugin-' + row._id + '"></label>';
                                input += '<span class="text">' + 'Enable' + '</span>';
                                return input;
                            } else {
                                return row.enabled;
                            }
                        },
                        "sType": "string",
                        "sTitle": jQuery.i18n.map['report.status'],
                        "bSortable": false,
    
                    },
                    { "mData": function(row, type){return row.appNames.join(", ");}, "sType":"string", "sTitle": jQuery.i18n.map["reports.apps"]},
                    { "mData": function(row, type){return row.emails.join("<br/>");}, "sType":"string", "sTitle": jQuery.i18n.map["reports.emails"]},
                    { "mData": function(row, type){var ret = ""; for(var i in row.metrics) ret += jQuery.i18n.map["reports."+i]+", "; return ret.substring(0, ret.length - 2);}, "sType":"string", "sTitle": jQuery.i18n.map["reports.metrics"]},
                    { "mData": function(row, type){return jQuery.i18n.map["reports."+row.frequency];}, "sType":"string", "sTitle": jQuery.i18n.map["reports.frequency"]},
                    { "mData": function(row, type){var ret = jQuery.i18n.map["reports.at"]+" "+row.hour+":"+row.minute+", "+row.zoneName; if(row.frequency == "weekly") ret += ", "+jQuery.i18n.map["reports.on"]+" "+ row.dayname; return ret;}, "sType":"string", "sTitle": jQuery.i18n.map["reports.time"]},
                    {
                        "mData": function (row) {
                            return "<div class='options-item'>" +
                                "<div class='edit'></div>" +
                                "<div class='edit-menu'>" +
                                "<div class='edit-report item'" + " id='" + row._id + "'" + ">Edit</div>" +
                                "<div class='delete-report item'" + " id='" + row._id + "'" + ">Delete</div>" +
                                "<div class='send-report item'" + " id='" + row._id + "'" + ">Send Now</div>" +
                                "<div class='preview-report item'" + " id='" + row._id + "'" + ">" + 
                                    '<a href=\'/i/reports/preview?api_key='+countlyGlobal["member"].api_key+'&args='+JSON.stringify({_id:row._id})+'\' target="_blank" class="" data-localize="reports.preview">'+jQuery.i18n.map["reports.preview"]+'</a>'
 
                                    + "</div></div>" +
                                "</div>";
                        },
                        "bSortable": false,
                    }
                ]
            }));
            self.dtable.fnSort( [ [0,'desc'] ] );
            self.dtable.stickyTableHeaders();
            self.initTable();
            $("#add-report").on("click", function(){
                self.widgetDrawer.init();
                $("#reports-widget-drawer").addClass("open");
                self.initTable();
            }); 
        }
    },

    widgetDrawer: {
		init: function () {
			var self = this;
            var apps = []; 
            
			$("#reports-widget-drawer").removeClass("editing");

            $("#current_report_id").text("");
            $("#report-name-input").val("");
 
            var emailList = countlyReporting.getEmailAddressList();
            $("#emails-dropdown").clySelectSetItems(emailList);
            $("#emails-dropdown").clySelectSetSelection("","");
            $("#frequency-dropdown").clySelectSetItems([
                {name:jQuery.i18n.map["reports.daily"], value: "daily"},
                {name:jQuery.i18n.map["reports.weekly"], value: "weekly"}
            ]);
            var timeList = [];
            for(var i = 0; i < 24; i++){
                v = (i > 9 ? i : "0" + i) +  ":00";
                timeList.push({ value: v, name: v});
            }
            
            $("#time-dropdown").clySelectSetItems(timeList);
            $("#time-dropdown").clySelectSetSelection("","");

            var cnts = app.manageAppsView.getTimeZones();
            var zones = {};
            var zNames = {};
            var zoneNames = [];
            var timeZoneList = [];
            for(var i in cnts){
                for(var j = 0; j < cnts[i].z.length; j++){
                    for(var k in cnts[i].z[j]){
                        zoneNames.push(k);
                        zones[k] = cnts[i].z[j][k];
                        zNames[cnts[i].z[j][k]] = k;                        
                    }
                }
            }
            zoneNames.sort(function(a, b){
                a = parseFloat(a.split(")")[0].replace(":", ".").substring(4));
                b = parseFloat(b.split(")")[0].replace(":", ".").substring(4));
                if(a < b) return -1;
                if(a > b) return 1;
                return 0;
            }); 
            zoneNames.forEach(function(zone){
                timeZoneList.push({value:zone, name:zone})
            }); 
            $("#timezone-dropdown").clySelectSetItems(timeZoneList);
            $("#timezone-dropdown").clySelectSetSelection("","");


            for (var appId in countlyGlobal.apps) {
				apps.push({ value: appId, name: countlyGlobal.apps[appId].name });
			}
			$("#multi-app-dropdown").clyMultiSelectSetItems(apps);
            $("#multi-app-dropdown").clyMultiSelectSetSelection([]);

            $("#include-metrics-dropdown").clyMultiSelectSetItems([
                {name:jQuery.i18n.map["reports.analytics"], value: "analytics"},
                {name:jQuery.i18n.map["reports.events"], value: "events"},
                {name:jQuery.i18n.map["reports.revenue"], value: "revenue"},
                {name:jQuery.i18n.map["reports.crash"], value: "crash"}, 
            ]);

            $('#reports-widge-close').off("click").on("click", function () {
                $("#reports-widget-drawer").removeClass("open");
            });



            $("#reports-dow-section").css("display","none")
            $('#daily-option').on("click", function(){
                $("#reports-dow-section").css("display","none")
                $('#weekly-option').removeClass("selected");
                $(this).addClass("selected");
            }); 
            $('#weekly-option').on("click", function(){
                $("#reports-dow-section").css("display","block")
                $('#daily-option').removeClass("selected");
                $(this).addClass("selected");
            });

            $("#reports-name-input").val('');
            var weekList = [
                {name: jQuery.i18n.map["reports.monday"], value:1},
                {name: jQuery.i18n.map["reports.tuesday"], value:2},
                {name: jQuery.i18n.map["reports.wednesday"], value:3},
                {name: jQuery.i18n.map["reports.thursday"], value:4},
                {name: jQuery.i18n.map["reports.friday"], value:5},
                {name: jQuery.i18n.map["reports.saturday"], value:6},
                {name: jQuery.i18n.map["reports.sunday"], value:7},

            ]
            $("#reports-dow").clySelectSetItems(weekList);
            $("#reports-dow").clySelectSetSelection("","");

            $("#metrics-analytics").prop( "checked", false)
            $("#metrics-revenue").prop( "checked", false)
            $("#metrics-events").prop( "checked", false)
            $("#metrics-crash").prop( "checked", false)

            $('#daily-option').addClass("selected");
            $('#weekly-option').removeClass("selected");
            $("#reports-dow-section").css("display","none")
             
            
		 	$("#create-widget").removeClass("disabled");
            $("#create-widget").off().on("click", function () {
                var reportSetting = self.getReportSetting();
                reportSetting.enabled = true;

				for (var key in reportSetting) {
                    if (!reportSetting[key] || reportSetting[key] === '' || 
                        (reportSetting[key].length && reportSetting[key].length === 0)) {
						return CountlyHelpers.alert("Please complete all required fields",
							"green",
							function (result) { });
					}
				}
                $.when(countlyReporting.create(reportSetting)).then(function (data) {
                    if(data.result == "Success"){
                        $("#reports-widget-drawer").removeClass("open");
                        app.activeView.render();
                    }
                    else{
                        CountlyHelpers.alert(data.result, "red");
                    }
                }, function(err){
                    var data = JSON.parse(err.responseText);
                    CountlyHelpers.alert(data.result, "red");
                });
			});

            $("#save-widget").off().on("click", function () {
                var reportSetting = self.getReportSetting();
                reportSetting._id = $("#current_report_id").text();
				for (var key in reportSetting) {
                    if (!reportSetting[key] || reportSetting[key] === '' || 
                    (reportSetting[key].length && reportSetting[key].length === 0)) {
						return CountlyHelpers.alert("Please complete all required fields",
							"green",
							function (result) { });
					}
				}
                $.when(countlyReporting.update(reportSetting)).then(function (data) {
                    if(data.result == "Success"){
                        $("#reports-widget-drawer").removeClass("open");
                        app.activeView.render();
                    }
                    else{
                        CountlyHelpers.alert(data.result, "red");
                    }
                }, function(err) {
                    var data = JSON.parse(err.responseText);
                    CountlyHelpers.alert(data.result, "red");
                });
			});
 

			$(".cly-drawer").find(".close").off("click").on("click", function () {
				$(".grid-stack-item").removeClass("marked-for-editing");
				$(this).parents(".cly-drawer").removeClass("open");
			});

	 
		},

		loadData: function (data) {
            this.init();
            $("#reports-widget-drawer").addClass("open editing");
            $("#current_report_id").text(data._id);
            $("#report-name-input").val(data.title);
          
            if(data.frequency === 'daily'){
                $('#daily-option').addClass("selected");
                $('#weekly-option').removeClass("selected");
                $("#reports-dow-section").css("display","none")
            } else{ 
                $('#daily-option').removeClass("selected");
                $('#weekly-option').addClass("selected");
                $("#reports-dow-section").css("display","block");
                $("#reports-dow").clySelectSetSelection(data.day, app.reportingView.getDayName(data.day));
            }

            var items = [];
            for(var i = 0; i < data.emails.length; i++){
                items.push({name:data.emails[i], value:data.emails[i]});
            }
            $("#emails-dropdown").clyMultiSelectSetSelection(items);
            $("#emails-dropdown").clySelectSetSelection(items);
            var timeString = data.hour + ":" + data.minute;
            $("#time-dropdown").clySelectSetSelection(timeString, timeString);

            var appSelected = []
            for (var index in data.apps) {
                var appId = data.apps[index];
                appSelected.push({name: countlyGlobal.apps[appId].name, value: appId});
            } 
            $("#multi-app-dropdown").clyMultiSelectSetSelection(appSelected);

            $("#metrics-analytics").prop( "checked",  data.metrics.analytics ? true : false)
            $("#metrics-revenue").prop( "checked",  data.metrics.revenue ? true : false)
            $("#metrics-events").prop( "checked",  data.metrics.events ? true : false)
            $("#metrics-crash").prop( "checked",  data.metrics.crash ? true : false)

            $("#timezone-dropdown").clySelectSetSelection(data.zoneName, data.zoneName);

		},

		getReportSetting: function () {
            var settings = {
                title: $("#report-name-input").val(),
                emails: $('#emails-dropdown').clyMultiSelectGetSelection(),
                frequency: "daily",
                apps: $('#multi-app-dropdown').clyMultiSelectGetSelection(),
                metrics: null,
                day: 1,
                hour: null,
                minute: null,
            };
            var selectDaily = $("#daily-option").hasClass("selected");
            if(!selectDaily){
                settings.frequency = "weekly";
                settings.day = parseInt( $("#reports-dow").clySelectGetSelection() )
            }
            var timeSelected = $("#time-dropdown").clySelectGetSelection();
            if(timeSelected){
                var time = timeSelected ?  timeSelected.split(":") : null;
                settings.hour = time[0];
                settings.minute = time[1];
            }

            if($("#metrics-analytics").prop( "checked" )){
                if(!settings.metrics){
                    settings.metrics = {}
                }
                settings.metrics["analytics"] = true
            }
            if($("#metrics-revenue").prop( "checked" )){
                if(!settings.metrics){
                    settings.metrics = {}
                }
                settings.metrics["revenue"] = true
            }
            if($("#metrics-events").prop( "checked" )){
                if(!settings.metrics){
                    settings.metrics = {}
                }
                settings.metrics["events"] = true
            }
            if($("#metrics-crash").prop( "checked" )){
                if(!settings.metrics){
                    settings.metrics = {}
                }
                settings.metrics["crash"] = true
            }
            

            var timeZone = $("#timezone-dropdown").clySelectGetSelection() || "Etc/GMT";
            settings.timezone = app.reportingView.zones[timeZone];
			return settings;
		}
	}, 
    initTable: function() {
        var self = this; 
        $(".save-report").off("click").on("click", function(data) {
            $.when(countlyReporting.update(data)).then(function (data) {
                if(data.result == "Success"){
                    app.activeView.render();
                }
                else{
                    CountlyHelpers.alert(data.result, "red");
                }
            }, function(err){
                var data = JSON.parse(err.responseText);
                CountlyHelpers.alert(data.result, "red");
            });
        });

        $(".edit-report").off("click").on("click", function (e) {
            var reportId = e.target.id;
			var formData = countlyReporting.getReport(reportId);
			self.widgetDrawer.loadData(formData);
		});

        $(".delete-report").off("click").on("click", function(e) {
            var id = e.target.id;
            var self = $(this);
            CountlyHelpers.confirm(jQuery.i18n.map["reports.confirm"], "red", function(result) {
                if (!result) {
                    return false;
                }    
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
        
        $(".send-report").off("click").on("click", function(e) {
            var id = e.target.id;
            var overlay = $("#overlay").clone();
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

        // load menu 
        $("body").off("click", ".options-item .edit").on("click", ".options-item .edit", function () {
            $(this).next(".edit-menu").fadeToggle();
            event.stopPropagation();
		});
  
        $(window).click(function() {
            $(".options-item").find(".edit").next(".edit-menu").fadeOut();
        });

        $(".report-switcher").off("click").on("click", function (e) {
			var pluginId = this.id.toString().replace(/^plugin-/, '');
			var newStatus = $(this).is(":checked");
			var list = countlyReporting.getData();
			var record = _.filter(list, function (item) { return item._id === pluginId; });
			if (record) {
				(record[0].enabled != newStatus) ? (statusChanged[pluginId] = newStatus) : (delete statusChanged[pluginId]);
			}
			var keys = _.keys(statusChanged);
			if (keys && keys.length > 0) {
				$(".data-save-bar-remind").text(' You made ' + keys.length + ( keys.length === 1 ? ' change.' : ' changes.') );

				return $(".data-saver-bar").removeClass("data-saver-bar-hide");
			}
			$(".data-saver-bar").addClass("data-saver-bar-hide");
        });
        
		$(".data-saver-cancel-button").off("click").on("click", function () {
            $.when(countlyReporting.initialize()).then(function () {
                statusChanged = {};
                self.renderCommon();
                app.localize()
                return $(".data-saver-bar").addClass("data-saver-bar-hide");
            })  
        })
        
		$(".data-saver-button").off("click").on("click", function () {
            $.when(countlyReporting.updateStatus(statusChanged)).then(function () {
                return $.when( countlyReporting.initialize()).then(function (){
                    statusChanged = {};
                    self.renderCommon();
                    app.localize()
                    return $(".data-saver-bar").addClass("data-saver-bar-hide");
                })
            })
        })
        
        $(".save-table-data").css("display","none")
    }
});

//register views
app.reportingView = new ReportingView();

app.route('/manage/reports', 'reports', function () {
    this.renderWhenReady(this.reportingView);
});

$( document ).ready(function() {
    var menu = '<a href="#/manage/reports" class="item">'+
        '<div class="logo-icon fa fa-envelope"></div>'+
        '<div class="text" data-localize="reports.title"></div>'+
    '</a>';
    if($('#management-submenu .help-toggle').length)
        $('#management-submenu .help-toggle').before(menu);
});