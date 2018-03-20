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
                maxTime = parseInt($( "#populate-maxtime" ).val()) || maxTime;
                maxTimeout = setTimeout(function(){
                    $("#populator-status").fadeOut().text(jQuery.i18n.map["populator.processing"]).fadeIn();
                    countlyPopulator.stopGenerating(function(done){
                        if (done === true) {
                            $("#stop-populate").hide();
                            $("#start-populate").show();
                            $("#populator-status").fadeOut().text(jQuery.i18n.map["populator.done"]).fadeIn().delay(2000).text('');
                            CountlyHelpers.confirm(jQuery.i18n.map["populator.success"], "green", function (result) {
                                if (!result) {
                                    return true;
                                }
                                window.location = "/dashboard";
                            });
                            $("#populate-bar div").css({width: 0});
                        } else if (done === false) {
                            $("#populator-status").html(jQuery.i18n.map["populator.jobs"]);
                            $("#stop-populate").hide();
                            // do nothing for now
                        } else {
                            CountlyHelpers.alert(done, "red");
                            $("#stop-populate").hide();
                            $("#start-populate").show();
                            $("#populator-status").hide();
                            $("#populate-bar div").css({width: 0});
                        }
                    });
                }, maxTime*1000);
                
                fromDate = $( "#populate-from" ).datepicker( "getDate" ) || fromDate;
                toDate = $( "#populate-to" ).datepicker( "getDate" ) || toDate;
                countlyPopulator.setStartTime(fromDate.getTime()/1000);
                countlyPopulator.setEndTime(toDate.getTime()/1000);
                countlyPopulator.generateUsers(250);
                $("#start-populate").hide();
                $("#stop-populate").show();
                $("#populator-status").fadeOut().text(jQuery.i18n.map["populator.generating"]).fadeIn();
                $("#populate-bar div").animate({width:"100%"}, maxTime*1000);
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
            CountlyHelpers.confirm(jQuery.i18n.map["populator.success"], "green", function (result) {
                if (!result) {
                    return true;
                }
                window.location = "/dashboard";
            });
        });
        
        $("#populate-explain").on('click', function() {
            CountlyHelpers.alert(jQuery.i18n.map["populator.help"], "green");
        });
        
        if(countlyPopulator.isGenerating()){
            $("#start-populate").hide();
            $("#stop-populate").show();
            countlyPopulator.generateUI();
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
    var populateApp = '<tr class="populate-demo-data">'+
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
            app.switchApp(appId, function(){
                app.navigate("/manage/populate/autostart", true);
            });
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
    var menu = '<a href="#/manage/populate" class="item populator-menu" style="'+style+'">'+
        '<div class="logo-icon fa fa-random"></div>'+
        '<div class="text" data-localize="populator.title"></div>'+
    '</a>';
    if($('.sidebar-menu #management-submenu .help-toggle').length)
        $('.sidebar-menu #management-submenu .help-toggle').before(menu);
    
    //listen for UI app change
    app.addAppSwitchCallback(function(appId){
        if(countlyGlobal["member"].global_admin || countlyGlobal["admin_apps"][appId]){
            $(".populator-menu").show();
        }
        else{
            $(".populator-menu").hide();
        }
    });
});