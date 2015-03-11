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
            "drill":"Game changer for data analytics",
            "funnels":"Track completion rates step by step",
            "retention":"See how engaging your application is",
            "revenue":"Calculate your customer's lifetime value",
            "user-profiles":"Understand what users have been doing in your application",
            "scalability": "Tens of millions of users? No problem",
            "support":"Enterprise support and SLA",
            "raw-data": "Your data, your rules"
        }

        $("#enterprise-sections").find(".app-container").on("click", function() {
            var section = $(this).data("section");

            $(".enterprise-content").hide();
            $(".enterprise-content." + section).show();

            $("#enterprise-sections").find(".app-container").removeClass("active");
            $(this).addClass("active");

            $(".widget-header .title").text(titles[section] || "");
        });
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
        '<div class="text" data-localize="">Enterprise</div>'+
    '</a>';
	$('#sidebar-menu').append(menu);
	
	if(typeof countlyGlobalEE != "undefined" && countlyGlobalEE["discount"]){
		var msg = {title:"5000+ users reached", message: "<a href='https://count.ly/enterprise-edition/' target='_blank'>To get 20% off Enterprise edition contact us with code:<br/><strong>"+countlyGlobalEE["discount"]+"</strong></a>", info:"Thank you for being with us", sticky:true, closeOnClick:false};
		CountlyHelpers.notify(msg);
    }
});