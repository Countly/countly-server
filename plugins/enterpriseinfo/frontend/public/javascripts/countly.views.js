window.EnterpriseView = countlyView.extend({
    initialize:function () {},
	beforeRender: function() {
		if(!this.template){
			var self = this;
			return $.when($.get(countlyGlobal["path"]+'/enterpriseinfo/templates/info.html', function(src){
				self.template = Handlebars.compile(src);
			})).then(function () {});
		}
    },
    pageScript:function () {
        var titles = {
            "drill":jQuery.i18n.map["enterpriseinfo.drill-pitch"],
            "funnels":jQuery.i18n.map["enterpriseinfo.funnels-pitch"],
            "retention":jQuery.i18n.map["enterpriseinfo.retention-pitch"],
            "revenue":jQuery.i18n.map["enterpriseinfo.revenue-pitch"],
            "user-profiles":jQuery.i18n.map["enterpriseinfo.user-profiles-pitch"],
            "scalability": jQuery.i18n.map["enterpriseinfo.scalability-pitch"],
            "support":jQuery.i18n.map["enterpriseinfo.support-pitch"],
            "raw-data":jQuery.i18n.map["enterpriseinfo.raw-data-pitch"]
        }

        $("#enterprise-sections").find(".app-container").on("click", function() {
            var section = $(this).data("section");

            $(".enterprise-content").hide();
            $(".enterprise-content." + section).show();
            var localize = $(".enterprise-content." + section + " .text").data("localization");
            $(".enterprise-content." + section + " .text").html(jQuery.i18n.map[localize]);

            $("#enterprise-sections").find(".app-container").removeClass("active");
            $(this).addClass("active");

            $(".widget-header .title").text(titles[section] || "");
        });
        $("#enterprise-sections").find(".app-container").first().click();
    },
    renderCommon:function () {
        $(this.el).html(this.template(this.templateData));
        this.pageScript();
    }
});

//register views
app.enterpriseView = new EnterpriseView();

app.route( "/enterprise", "enterprise", function () {
	this.renderWhenReady(this.enterpriseView);
});

$( document ).ready(function() {
	var menu = '<a class="item" id="enterprise-menu" href="#/enterprise">'+
		'<div class="logo logo-icon fa fa-rocket"></div>'+
        '<div class="text" data-localize="enterpriseinfo.title">Enterprise</div>'+
    '</a>';
	$('#sidebar-menu .sidebar-menu').append(menu);
	
	if(typeof countlyGlobalEE != "undefined" && countlyGlobalEE["discount"]){
		var msg = {title:"5000+ users reached", message: "<a href='https://count.ly/enterprise-edition/' target='_blank'>To get 20% off Enterprise edition contact us with code:<br/><strong>"+countlyGlobalEE["discount"]+"</strong></a>", info:"Thank you for being with us", sticky:true, closeOnClick:false};
		CountlyHelpers.notify(msg);
    }
});