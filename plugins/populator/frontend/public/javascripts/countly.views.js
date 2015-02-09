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
			"page-title":jQuery.i18n.map["populator.title"],
			"logo-class":"frequency"
		};
		var now = new Date();
		var fromDate = new Date(now.getTime()-1000*60*60*24*30);
		var toDate = now;
		
		
		$(this.el).html(this.template(this.templateData));
		$("#start-populate").on('click', function() {
			fromDate = $( "#populate-from" ).datepicker( "getDate" ) || fromDate;
			toDate = $( "#populate-to" ).datepicker( "getDate" ) || toDate;
			countlyPopulator.setStartTime(fromDate.getTime()/1000);
			countlyPopulator.setEndTime(toDate.getTime()/1000);
			countlyPopulator.generateUsers(parseInt($("#populate-users").val()));
			$("#start-populate").hide();
			$("#stop-populate").show();
		});
		$("#stop-populate").on('click', function() {
			countlyPopulator.stopGenerating();
			$("#stop-populate").hide();
			$("#start-populate").show();
		});
		
		$( "#populate-from" ).val(moment(fromDate).format("YYYY-MM-DD"));
		$( "#populate-to" ).val(moment(toDate).format("YYYY-MM-DD"));
		$( "#populate-from" ).datepicker({dateFormat: "yy-mm-dd", defaultDate:-30, constrainInput:true, maxDate: now });
		$( "#populate-to" ).datepicker({dateFormat: "yy-mm-dd", constrainInput:true, maxDate: now });
		app.localize();
    },
    refresh:function () {}
});

//register views
app.populatorView = new PopulatorView();

app.route('/manage/populate', 'populate', function () {
	this.renderWhenReady(this.populatorView);
});

app.addPageScript("#", function(){
	if (Backbone.history.fragment.indexOf("/manage/populate") > -1) {
        $("#sidebar-app-select").addClass("disabled");
        $("#sidebar-app-select").removeClass("active");
    }
});

$( document ).ready(function() {
	var fileref=document.createElement('script');
	fileref.setAttribute("type","text/javascript");
	fileref.setAttribute("src", "populator/javascripts/chance.js");
	document.getElementsByTagName("head")[0].appendChild(fileref);

	var menu = '<a href="#/manage/populate" class="item">'+
		'<div class="logo applications"></div>'+
		'<div class="text" data-localize="populator.title"></div>'+
	'</a>';
	if($('#management-submenu .help-toggle').length)
		$('#management-submenu .help-toggle').before(menu);
});