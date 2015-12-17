window.PopulatorView = countlyView.extend({
	initialize:function () {
	},
    beforeRender: function() {
		if(!this.template){
			var self = this;
			return $.when($.get(countlyGlobal["path"]+'/populator/templates/populate.html', function(src){
				self.template = Handlebars.compile(src);
			})).then(function () {});
		}
    },
    renderCommon:function (isRefresh) {
		this.templateData = {
			"page-title":jQuery.i18n.map["populator.title"]
		};
		var now = new Date();
		var fromDate = new Date(now.getTime()-1000*60*60*24*30);
		var toDate = now;
        var maxTime = 60;
        var maxTimeout;
		
		
		$(this.el).html(this.template(this.templateData));
		$("#start-populate").on('click', function() {
            CountlyHelpers.confirm(jQuery.i18n.map["populator.warning1"]+" ("+countlyGlobal["apps"][countlyCommon.ACTIVE_APP_ID].name+").<br/>"+jQuery.i18n.map["populator.warning2"], "red", function (result) {
                if (!result) {
					return true;
				}
                maxTime = $( "#populate-maxtime" ).val() || maxTime;
                maxTimeout = setTimeout(function(){
                    countlyPopulator.stopGenerating();
                    $("#stop-populate").hide();
                    $("#start-populate").show();
                }, maxTime*1000);
                
                fromDate = $( "#populate-from" ).datepicker( "getDate" ) || fromDate;
                toDate = $( "#populate-to" ).datepicker( "getDate" ) || toDate;
                countlyPopulator.setStartTime(fromDate.getTime()/1000);
                countlyPopulator.setEndTime(toDate.getTime()/1000);
                countlyPopulator.generateUsers(parseInt($("#populate-users").val()));
                $("#start-populate").hide();
                $("#stop-populate").show();
                $("#populate-bar div").animate({width:"100%"}, 60000);
            });
		});
		$("#stop-populate").on('click', function() {
            if(maxTimeout){
                clearTimeout(maxTimeout);
                maxTimeout = null;
            }
			countlyPopulator.stopGenerating();
			$("#stop-populate").hide();
			$("#start-populate").show();
            $("#populate-bar div").stop(true);
            $("#populate-bar div").width(0);
		});
		
		$("#populate-explain").on('click', function() {
			CountlyHelpers.alert(jQuery.i18n.map["populator.help"], "green");
		});
		
		if(countlyPopulator.isGenerating()){
			$("#start-populate").hide();
			$("#stop-populate").show();
			countlyPopulator.generateUI();
			$( "#populate-users" ).val(countlyPopulator.getUserAmount());
			$( "#populate-from" ).val(moment(countlyPopulator.getStartTime()*1000).format("YYYY-MM-DD"));
			$( "#populate-to" ).val(moment(countlyPopulator.getEndTime()*1000).format("YYYY-MM-DD"));
			$( "#populate-from" ).datepicker({dateFormat: "yy-mm-dd", defaultDate:new Date(countlyPopulator.getStartTime()*1000), constrainInput:true, maxDate: now });
			$( "#populate-to" ).datepicker({dateFormat: "yy-mm-dd", defaultDate:new Date(countlyPopulator.getEndTime()*1000), constrainInput:true, maxDate: now });
		}
		else{
			$( "#populate-from" ).val(moment(fromDate).format("YYYY-MM-DD"));
			$( "#populate-to" ).val(moment(toDate).format("YYYY-MM-DD"));
			$( "#populate-from" ).datepicker({dateFormat: "yy-mm-dd", defaultDate:-30, constrainInput:true, maxDate: now });
			$( "#populate-to" ).datepicker({dateFormat: "yy-mm-dd", constrainInput:true, maxDate: now });
		}
		app.localize();
        if(this.state == "/autostart"){
            $("#start-populate").click();
        }
    },
    refresh:function () {}
});

//register views
app.populatorView = new PopulatorView();

app.route('/manage/populate*state', 'populate', function (state) {
    if(countlyGlobal["member"].global_admin || countlyGlobal["admin_apps"][countlyCommon.ACTIVE_APP_ID]){
        this.populatorView.state = state;
        this.renderWhenReady(this.populatorView);
    }
    else{
        app.navigate("/", true);
    }
});

var start_populating = false;
app.addPageScript("/manage/apps", function(){
	var populateApp = '<tr>'+
		'<td>'+
			'<span data-localize="populator.demo-data"></span>'+
		'</td>'+
		'<td>'+
			'<input type="checkbox" id="populate-app-after"/>&nbsp;&nbsp;&nbsp;<span data-localize="populator.tooltip"></span>'+
		'</td>'+
	'</tr>';
	
	$("#add-new-app table .table-add").before(populateApp);
	
	$("#save-app-add").click(function () {
		if($("#add-new-app table #populate-app-after").is(':checked')){
            start_populating = true;
            setTimeout(function(){
                start_populating = false;
            }, 5000);
        }
	});
});

app.addAppManagementSwitchCallback(function(appId, type){
    if(start_populating){
        start_populating = false;
        setTimeout(function(){
            var appId = $("#view-app-id").text();
            countlyCommon.setActiveApp(appId);
            $("#sidebar-app-select").find(".logo").css("background-image", "url('"+countlyGlobal["cdn"]+"appimages/" + appId + ".png')");
            $("#sidebar-app-select").find(".text").text(countlyGlobal['apps'][appId].name);
            app.onAppSwitch(appId, true);
            app.navigate("/manage/populate/autostart", true);
        }, 1000);
    }
});

$( document ).ready(function() {
    if(!production){
        CountlyHelpers.loadJS("populator/javascripts/chance.js");
    }
    var style = "display:none;";
    if(countlyGlobal["member"].global_admin || countlyGlobal["admin_apps"][countlyCommon.ACTIVE_APP_ID]){
        style = "";
    }
    var menu = '<a href="#/manage/populate" class="item" id="populator-menu" style="'+style+'">'+
        '<div class="logo-icon fa fa-random"></div>'+
        '<div class="text" data-localize="populator.title"></div>'+
    '</a>';
    if($('#management-submenu .help-toggle').length)
        $('#management-submenu .help-toggle').before(menu);
    
    //listen for UI app change
    app.addAppSwitchCallback(function(appId){
        if(countlyGlobal["member"].global_admin || countlyGlobal["admin_apps"][appId]){
            $("#populator-menu").show();
        }
        else{
            $("#populator-menu").hide();
        }
    });
});