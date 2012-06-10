/*
A countly view is defined as a page corresponding to a url fragment such 
as #/manage/apps. This interface defines common functions or properties 
the view object has. A view may override any function or property.
*/
var countlyView = Backbone.View.extend({
	template: null,	//handlebars template of the view
	templateData: {},	//data to be used while rendering the template
	el: $('#content'),	//jquery element to render view into
	initialize: function() {	//compile view template
		this.template = Handlebars.compile($("#template-analytics-common").html());
	},
	dateChanged: function() {	//called when user changes the date selected
		this.renderCommon();
	},
	appChanged: function() {	//called when user changes selected app from the sidebar
		var self = this;
		_.defer(function(){ self.refresh() }); 
	},
	render: function(eventName) {	//backbone.js view render function
		this.renderCommon();
        return this;
    },
	renderCommon: function(isRefresh) {}, //common render function of the view
	refresh: function() {	//resfresh function for the view called every 10 seconds by default
		return true;
	},
	close: function() {
        $(this.el).unbind();
        $(this.el).remove();
    }
});

/*
Some helper functions to be used throughout all views. Includes custom 
popup, alert and confirm dialogs for the time being.
*/
(function(CountlyHelpers, $, undefined) {

	CountlyHelpers.popup = function(elementId){
		var dialog = $("#cly-popup").clone();
		dialog.removeAttr("id");
		dialog.find(".content").html($(elementId).html());
		
		revealDialog(dialog);
	};

	CountlyHelpers.alert = function(msg, type){
		var dialog = $("#cly-alert").clone();
		dialog.removeAttr("id");
		dialog.find(".message").text(msg);
		
		dialog.addClass(type);
		revealDialog(dialog);
	};
	
	CountlyHelpers.confirm = function(msg, type, callback){
		var dialog = $("#cly-confirm").clone();
		dialog.removeAttr("id");
		dialog.find(".message").text(msg);
		
		dialog.addClass(type);
		revealDialog(dialog);
		
		dialog.find("#dialog-continue").on('click', function() {
			callback();
			$(".dialog:visible").fadeOut().remove();
			$("#overlay").hide();
		});
	};
	
	function revealDialog(dialog) {
		$("body").append(dialog);
		
		var dialogHeight = dialog.height(),
			dialogWidth = dialog.width();
			
		dialog.css({
			"height": dialogHeight,
			"margin-top": Math.floor(-dialogHeight / 2),
			"width": dialogWidth,
			"margin-left": Math.floor(-dialogWidth / 2)
		});
		
		$("#overlay").fadeIn();
		dialog.fadeIn();
	}
	
	$(document).ready(function() {
		$("#overlay").click(function() {
			$(".dialog:visible").fadeOut().remove();
			$(this).hide();
		});
		
		$("#dialog-ok, #dialog-cancel").live('click', function() {
			$(".dialog:visible").fadeOut().remove();
			$("#overlay").hide();
		});
	});
	
}(window.CountlyHelpers = window.CountlyHelpers || {}, jQuery));

function fillKeyEvents(keyEvents) {
	if (!keyEvents.length) {
		return true;
	}
	
	$("#key-events").html("");
	for (var k = 0; k < keyEvents.length; k++) {
		for (var l = 0; l < keyEvents[k].length; l++) {								
			$("#key-events").append("<tr>\
				<td>\
					<div class='graph-key-event-label' style='float:left; background-color:"+keyEvents[k][l].color+";'>" + keyEvents[k][l].code + "</div>\
					<div style='margin-left:40px; padding-top:3px;'>" + keyEvents[k][l].desc + "</div>\
				</td>\
			</tr>");
		}
	}
}

window.DashboardView = countlyView.extend({
	selectedView: "#draw-total-sessions",
	initialize: function() {
		this.template = Handlebars.compile($("#dashboard-template").html());
	},
	render: function(eventName) {
		this.renderCommon();
		countlyLocation.drawGeoChart({height: 290});
		return this;
    },
	dateChanged: function(){
		this.renderCommon(false, true);
		countlyLocation.drawGeoChart({height: 290});
			
		switch(this.selectedView) {
			case "#draw-total-users":
				_.defer(function(){
					sessionDP = countlySession.getUserDPActive();
					countlyCommon.drawTimeGraph(sessionDP.chartDP, "#dashboard-graph");
				});
				break;
			case "#draw-new-users":
				_.defer(function(){
					sessionDP = countlySession.getUserDPNew();
					countlyCommon.drawTimeGraph(sessionDP.chartDP, "#dashboard-graph");
				});
				break;
			case "#draw-total-sessions":
				_.defer(function(){
					sessionDP = countlySession.getSessionDPTotal();
					countlyCommon.drawTimeGraph(sessionDP.chartDP, "#dashboard-graph");
				});
				break;
			case "#draw-time-spent":
				_.defer(function(){
					sessionDP = countlySession.getDurationDPAvg();
					countlyCommon.drawTimeGraph(sessionDP.chartDP, "#dashboard-graph");
				});
				break;
			case "#draw-events-served":
				_.defer(function(){
					sessionDP = countlySession.getEventsDP();
					countlyCommon.drawTimeGraph(sessionDP.chartDP, "#dashboard-graph");
				});
				break;
			case "#draw-avg-events-served":
				_.defer(function(){
					sessionDP = countlySession.getEventsDPAvg();
					countlyCommon.drawTimeGraph(sessionDP.chartDP, "#dashboard-graph");
				});
				break;
		}
	},
	pageScript: function() {
		$(".widget-content .inner").click(function(){
			$(".big-numbers").removeClass("active");
			$(".big-numbers .select").removeClass("selected");
			$(this).parent(".big-numbers").addClass("active");
			$(this).find('.select').addClass("selected");
		});
		
		$(".bar-inner").hover(
			function(){
				var number = $(this).parent().next();
				
				number.text($(this).data("item"));
				number.css({"color": $(this).css("background-color")});
			},
			function(){
				var number = $(this).parent().next();
			
				number.text(number.data("item"));
				number.css({"color": $(this).parent().find(".bar-inner:first-child").css("background-color")});
			}
		);
		
		var self = this;
		$(".big-numbers .inner").click(function(){
			var elID = $(this).find('.select').attr("id");
			
			if (self.selectedView == "#"+elID) {
				return true;
			}
			
			self.selectedView = "#"+elID;
			var keyEvents;
			
			switch(elID) {
				case "draw-total-users":
					_.defer(function(){
						sessionDP = countlySession.getUserDPActive();
						keyEvents = countlyCommon.drawTimeGraph(sessionDP.chartDP, "#dashboard-graph");
						fillKeyEvents(keyEvents);
					});
					break;
				case "draw-new-users":
					_.defer(function(){
						sessionDP = countlySession.getUserDPNew();
						keyEvents = countlyCommon.drawTimeGraph(sessionDP.chartDP, "#dashboard-graph");
						fillKeyEvents(keyEvents);
					});
					break;
				case "draw-total-sessions":
					_.defer(function(){
						sessionDP = countlySession.getSessionDPTotal();
						keyEvents = countlyCommon.drawTimeGraph(sessionDP.chartDP, "#dashboard-graph");
						fillKeyEvents(keyEvents);
					});
					break;
				case "draw-time-spent":
					_.defer(function(){
						sessionDP = countlySession.getDurationDPAvg();
						keyEvents = countlyCommon.drawTimeGraph(sessionDP.chartDP, "#dashboard-graph");
						fillKeyEvents(keyEvents);
					});
					break;
				case "draw-events-served":
					_.defer(function(){
						sessionDP = countlySession.getEventsDP();
						countlyCommon.drawTimeGraph(sessionDP.chartDP, "#dashboard-graph");
					});
					break;
				case "draw-avg-events-served":
					_.defer(function(){
						sessionDP = countlySession.getEventsDPAvg();
						countlyCommon.drawTimeGraph(sessionDP.chartDP, "#dashboard-graph");
					});
					break;
			}
		});
	},
	renderCommon: function(isRefresh, isDateChange) {
		var sessionData = countlySession.getSessionData(),
			locationData = countlyLocation.getLocationData({maxCountries: 7}),
			sessionDP = countlySession.getSessionDPTotal();
			
		sessionData["country-data"] = locationData;
		sessionData["page-title"] = countlyCommon.getDateRange();
		sessionData["bars"] = {
			"carriers": countlyCarrier.getCarrierBars(),
			"platforms": countlyDeviceDetails.getPlatformBars(),
			"resolutions": countlyDeviceDetails.getResolutionBars(),
			"users": countlySession.getTopUserBars()
		};
		
		this.templateData = sessionData;
		
		if (!isRefresh) {
			$(this.el).html(this.template(this.templateData));
			$(this.selectedView).parents(".big-numbers").addClass("active");
			this.pageScript();
			
			if (!isDateChange) {
				var keyEvents = countlyCommon.drawTimeGraph(sessionDP.chartDP, "#dashboard-graph");
				fillKeyEvents(keyEvents);
			}
		}
	},
	refresh: function() {
		var self = this;
		$.when(countlySession.initialize(), countlyCarrier.initialize(), countlyLocation.initialize(), countlyDeviceDetails.initialize()).then(function(){
			self.renderCommon(true);
			countlyLocation.refreshGeoChart();
			
			newPage = $("<div>"+self.template(self.templateData)+"</div>");
			$(self.el).find("#big-numbers-container").html(newPage.find("#big-numbers-container").html());
			$(self.el).find(".dashboard-summary").html(newPage.find(".dashboard-summary").html());
			$(self.selectedView).parents(".big-numbers").addClass("active");
			self.pageScript();
			
			switch(self.selectedView) {
				case "#draw-total-users":
					sessionDP = countlySession.getUserDPActive();
					countlyCommon.drawTimeGraph(sessionDP.chartDP, "#dashboard-graph");
					break;
				case "#draw-new-users":
					sessionDP = countlySession.getUserDPNew();
					countlyCommon.drawTimeGraph(sessionDP.chartDP, "#dashboard-graph");
					break;
				case "#draw-total-sessions":
					sessionDP = countlySession.getSessionDPTotal();
					countlyCommon.drawTimeGraph(sessionDP.chartDP, "#dashboard-graph");
					break;
				case "#draw-time-spent":
					sessionDP = countlySession.getDurationDPAvg();
					countlyCommon.drawTimeGraph(sessionDP.chartDP, "#dashboard-graph");
					break;
				case "#draw-events-served":
					sessionDP = countlySession.getEventsDP();
					countlyCommon.drawTimeGraph(sessionDP.chartDP, "#dashboard-graph");
					break;
				case "#draw-avg-events-served":
					sessionDP = countlySession.getEventsDPAvg();
					countlyCommon.drawTimeGraph(sessionDP.chartDP, "#dashboard-graph");
					break;
			}
			
			$(".usparkline").peity("bar", { width: "100%", height:"30", colour: "#6BB96E", strokeColour: "#6BB96E", strokeWidth: 2 });
			$(".dsparkline").peity("bar", { width: "100%", height:"30", colour: "#C94C4C", strokeColour: "#C94C4C", strokeWidth: 2 });
			
			if (newPage.find("#map-list-right").length == 0) {
				$("#map-list-right").remove();
			}
			
			if ($("#map-list-right").length) {
				$("#map-list-right").replaceWith(newPage.find("#map-list-right"));
			} else {
				$(".widget.map-list").prepend(newPage.find("#map-list-right"));
			}
		});
	}
});

window.SessionView = countlyView.extend({
	renderCommon: function(isRefresh) {

		var sessionData = countlySession.getSessionData(),
			sessionDP = countlySession.getSessionDP();
		
		this.templateData = {
			"page-title": "SESSIONS",
			"logo-class": "sessions",
			"big-numbers": {
				"count": 3,
				"items": [
					{
						"title": "TOTAL SESSIONS",
						"total": sessionData.usage["total-sessions"].total,
						"trend": sessionData.usage["total-sessions"].trend
					},
					{
						"title": "NEW SESSIONS",
						"total": sessionData.usage["new-users"].total,
						"trend": sessionData.usage["new-users"].trend
					},
					{
						"title": "UNIQUE SESSIONS",
						"total": sessionData.usage["total-users"].total,
						"trend": sessionData.usage["total-users"].trend
					}
				]
			},
			"chart-data": {
				"columnCount":4, 
				"columns": ["Date","Total Sessions","New Sessions","Unique Sessions"], 
				"rows": []
			}
		};
				
		this.templateData["chart-data"]["rows"] = sessionDP.chartData;
		
		if (!isRefresh) {
			$(this.el).html(this.template(this.templateData));
			
			countlyCommon.drawTimeGraph(sessionDP.chartDP, "#dashboard-graph");
			$(".sortable").stickyTableHeaders();
			
			var self = this;
			$(".sortable").tablesorter({
				sortList: this.sortList,
				headers: {
					0: { sorter:'customDate' },
					1: { sorter:'formattedNumber' },
					2: { sorter:'formattedNumber' },
					3: { sorter:'formattedNumber' }
				}
			}).bind("sortEnd", function(sorter) {
					self.sortList = sorter.target.config.sortList;
			});
		} else {
			
		}
	},
	refresh: function() {
		if (app.activeView == this) {
			return false;
		}
		
		var self = this;
		$.when(countlySession.initialize()).then(function(){
			self.renderCommon(true);
			newPage = $("<div>"+self.template(self.templateData)+"</div>");
			newPage.find(".sortable").tablesorter({
				sortList: self.sortList,
				headers: {
					0: { sorter:'customDate' },
					1: { sorter:'formattedNumber' },
					2: { sorter:'formattedNumber' },
					3: { sorter:'formattedNumber' }
				}
			});
			
			$(self.el).find("#big-numbers-container").html(newPage.find("#big-numbers-container").html());
			$(self.el).find(".d-table tbody").html(newPage.find(".d-table tbody").html());
			
			var sessionDP = countlySession.getSessionDP();
			countlyCommon.drawTimeGraph(sessionDP.chartDP, "#dashboard-graph");
			
			$(".sortable").trigger("update");
		});
	}
});

window.UserView = countlyView.extend({
	renderCommon: function(isRefresh) {
		var loyaltyData = countlyUser.getLoyaltyData(),
			sessionData = countlySession.getSessionData(),
			durationData = countlySession.getDurationData(),
			userDP = countlySession.getUserDP();
		
		sessionData["chart-data"] = userDP.chartData;
		sessionData["loyalty-data"] = loyaltyData;
		sessionData["duration-data"] = durationData;
		
		this.templateData = {
			"page-title": "USERS",
			"logo-class": "users",
			"big-numbers": {
				"count": 3,
				"items": [
					{
						"title": "TOTAL USERS",
						"total": sessionData.usage["total-users"].total,
						"trend": sessionData.usage["total-users"].trend
					},
					{
						"title": "NEW USERS",
						"total": sessionData.usage["new-users"].total,
						"trend": sessionData.usage["new-users"].trend
					},
					{
						"title": "RETURNING USERS",
						"total": sessionData.usage["returning-users"].total,
						"trend": sessionData.usage["returning-users"].trend
					}
				]
			},
			"chart-data": {
				"columnCount":4, 
				"columns": ["Date","Total Users","New Users","Returning Users"], 
				"rows": []
			}
		};
				
		this.templateData["chart-data"]["rows"] = userDP.chartData;
		
		if (!isRefresh) {
			$(this.el).html(this.template(this.templateData));
		
			$(".sortable").stickyTableHeaders();
			
			var self = this;
			$(".sortable").tablesorter({
				sortList: this.sortList,
				headers: {
					0: { sorter:'customDate' },
					1: { sorter:'formattedNumber' },
					2: { sorter:'formattedNumber' },
					3: { sorter:'formattedNumber' }
				}
			}).bind("sortEnd", function(sorter) {
				self.sortList = sorter.target.config.sortList;
			});
		
			countlyCommon.drawTimeGraph(userDP.chartDP, "#dashboard-graph");
		}
	},
	refresh: function() {
		if (app.activeView == this) {
			return false;
		}
	
		var self = this;
		$.when(countlySession.initialize()).then(function(){
			self.renderCommon(true);
			newPage = $("<div>"+self.template(self.templateData)+"</div>");
			newPage.find(".sortable").tablesorter({
				sortList: self.sortList,
				headers: {
					0: { sorter:'customDate' },
					1: { sorter:'formattedNumber' },
					2: { sorter:'formattedNumber' },
					3: { sorter:'formattedNumber' }
				}
			});
			
			$(self.el).find("#big-numbers-container").replaceWith(newPage.find("#big-numbers-container"));
			$(self.el).find(".d-table tbody").replaceWith(newPage.find(".d-table tbody"));
			
			var userDP = countlySession.getUserDP();
			countlyCommon.drawTimeGraph(userDP.chartDP, "#dashboard-graph");
			
			$(".sortable").trigger("update");
		});
	}
});

window.LoyaltyView = countlyView.extend({
	renderCommon: function(isRefresh) {
		var loyaltyData = countlyUser.getLoyaltyData(),
			sessionData = countlySession.getSessionData(),
			userDP = countlySession.getUserDP();
		
		this.templateData = {
			"page-title": "USER LOYALTY",
			"logo-class": "loyalty",
			"chart-data": {
				"columnCount":3, 
				"columns": ["nth Session of the User","Number of Users","Percent"], 
				"rows": []
			}
		};
				
		this.templateData["chart-data"]["rows"] = loyaltyData.chartData;
		
		if (!isRefresh) {
			$(this.el).html(this.template(this.templateData));
		
			$(".sortable").stickyTableHeaders();
			
			var self = this;
			$(".sortable").tablesorter({
					sortList: this.sortList,
					headers: {
						1: { sorter:'formattedNumber' },
						2: { sorter:'formattedNumber' }
					}
				}).bind("sortEnd", function(sorter) {
				self.sortList = sorter.target.config.sortList;
			});
		
			countlyCommon.drawGraph(loyaltyData.chartDP, "#dashboard-graph", "bar");
		}
	},
	refresh: function() {
		if (app.activeView == this) {
			return false;
		}
		
		var loyaltyData = countlyUser.getLoyaltyData();
		var self = this;
		$.when(countlyUser.initialize()).then(function(){
			self.renderCommon(true);
			newPage = $("<div>"+self.template(self.templateData)+"</div>");
			newPage.find(".sortable").tablesorter({sortList: self.sortList});
			
			$(self.el).find(".sortable tbody").replaceWith(newPage.find(".sortable tbody"));

			var frequencyData = countlyUser.getLoyaltyData();
			countlyCommon.drawGraph(loyaltyData.chartDP, "#dashboard-graph", "bar");
			
			$(".sortable").trigger("update");
		});
	}
});

window.CountriesView = countlyView.extend({
	initialize: function() {
		this.template = Handlebars.compile($("#template-analytics-countries").html());
	},
	render: function(eventName) {
		this.renderCommon();
		countlyLocation.drawGeoChart({height: 450});	
        return this;
    },
	dateChanged: function() {
		this.renderCommon();
		countlyLocation.drawGeoChart({height: 450});
	},
	renderCommon: function(isRefresh) {
		var sessionData = countlySession.getSessionData();
		
		this.templateData = {
			"page-title": "COUNTRIES",
			"logo-class": "countries",
			"big-numbers": {
				"count": 3,
				"items": [
					{
						"title": "TOTAL SESSIONS",
						"total": sessionData.usage["total-sessions"].total,
						"trend": sessionData.usage["total-sessions"].trend
					},
					{
						"title": "TOTAL USERS",
						"total": sessionData.usage["total-users"].total,
						"trend": sessionData.usage["total-users"].trend
					},
					{
						"title": "NEW USERS",
						"total": sessionData.usage["new-users"].total,
						"trend": sessionData.usage["new-users"].trend
					}
				]
			},
			"chart-data": {
				"columnCount":4, 
				"columns": ["Country","Total Sessions", "Total Users","New Users"], 
				"rows": []
			}
		};
				
		this.templateData["chart-data"]["rows"] = countlyLocation.getLocationData();
		
		if (!isRefresh) {
			$(this.el).html(this.template(this.templateData));
			
			$(".sortable").stickyTableHeaders();
			
			var self = this;
			$(".sortable").tablesorter({
				sortList: this.sortList,
						headers: {
					1: { sorter:'formattedNumber' },
					2: { sorter:'formattedNumber' }
				}
			}).bind("sortEnd", function(sorter) {
				self.sortList = sorter.target.config.sortList;
			});
		}
	},
	refresh: function() {
		if (app.activeView == this) {
			return false;
		}
		
		var self = this;
		$.when(countlySession.initialize(), countlyLocation.initialize()).then(function(){
			self.renderCommon(true);
			countlyLocation.refreshGeoChart();
			
			newPage = $("<div>"+self.template(self.templateData)+"</div>");
			newPage.find(".sortable").tablesorter({
				sortList: self.sortList,
				headers: {
					1: { sorter:'formattedNumber' },
					2: { sorter:'formattedNumber' }
				}
			});
			
			$(self.el).find("#big-numbers-container").replaceWith(newPage.find("#big-numbers-container"));
			$(self.el).find(".d-table tbody").replaceWith(newPage.find(".d-table tbody"));
			
			$(".sortable").trigger("update");
		});
	}
});

window.FrequencyView = countlyView.extend({
	renderCommon: function(isRefresh) {
		var loyaltyData = countlyUser.getLoyaltyData(),
			sessionData = countlySession.getSessionData(),
			durationData = countlySession.getDurationData(),
			userDP = countlySession.getUserDP(),
			frequencyData = countlyUser.getFrequencyData();
		
		this.templateData = {
			"page-title": "SESSION FREQUENCY",
			"logo-class": "frequency",
			"chart-data": {
				"columnCount":4, 
				"columns": ["Time after previous session","Number of Users","Percent"], 
				"rows": []
			}
		};
				
		this.templateData["chart-data"]["rows"] = frequencyData.chartData;
		
		if (!isRefresh) {
			$(this.el).html(this.template(this.templateData));
		
			$(".sortable").stickyTableHeaders();
			
			var self = this;
			$(".sortable").tablesorter({
					sortList: this.sortList,
				headers: {
            1: { sorter:'formattedNumber' },
            2: { sorter:'formattedNumber' }
        }
				}).bind("sortEnd", function(sorter) {
				self.sortList = sorter.target.config.sortList;
			});
		
			countlyCommon.drawGraph(frequencyData.chartDP, "#dashboard-graph", "bar");
		}
	},
	refresh: function() {
		if (app.activeView == this) {
			return false;
		}
		
		var self = this;
		$.when(countlyUser.initialize()).then(function(){
			self.renderCommon(true);
			newPage = $("<div>"+self.template(self.templateData)+"</div>");
			newPage.find(".sortable").tablesorter({sortList: self.sortList});
			
			$(self.el).find(".sortable tbody").replaceWith(newPage.find(".sortable tbody"));

			var frequencyData = countlyUser.getFrequencyData();
			countlyCommon.drawGraph(frequencyData.chartDP, "#dashboard-graph", "bar");
			
			$(".sortable").trigger("update");
		});
	}
});

window.DeviceView = countlyView.extend({
	renderCommon: function(isRefresh) {
		var deviceData = countlyDevice.getDeviceData();
		
		this.templateData = {
			"page-title": "DEVICES",
			"logo-class": "devices",
			"chart-data": {
				"columnCount":4, 
				"columns": ["Device","Total Sessions", "Total Users","New Users"], 
				"rows": []
			}
		};
				
		this.templateData["chart-data"]["rows"] = deviceData.chartData;
		
		if (!isRefresh) {
			$(this.el).html(this.template(this.templateData));
		
			$(".sortable").stickyTableHeaders();
			
			var self = this;
			$(".sortable").tablesorter({sortList: this.sortList}).bind("sortEnd", function(sorter) {
				self.sortList = sorter.target.config.sortList;
			});
		
			countlyCommon.drawGraph(deviceData.chartDP, "#dashboard-graph", "bar");
		}
	},
	refresh: function() {
		if (app.activeView == this) {
			return false;
		}
	
		var self = this;
		$.when(countlyDevice.initialize()).then(function(){
			self.renderCommon(true);
			newPage = $("<div>"+self.template(self.templateData)+"</div>");
			newPage.find(".sortable").tablesorter({sortList: self.sortList});
		
			$(self.el).find(".sortable tbody").replaceWith(newPage.find(".sortable tbody"));
		
			var deviceData = countlyDevice.getDeviceData();
			countlyCommon.drawGraph(deviceData.chartDP, "#dashboard-graph", "bar");
		
			$(".sortable").trigger("update");
		});
	}
});

window.CarrierView = countlyView.extend({
	initialize: function() {
		this.template = Handlebars.compile($("#template-analytics-carriers").html());
	},
	renderCommon: function(isRefresh) {
		var carrierData = countlyCarrier.getCarrierData();
		
		this.templateData = {
			"page-title": "CARRIERS",
			"logo-class": "carriers",
			"big-numbers": {
				"count": 2,
				"items": [
					{
						"title": "TOTAL USERS"
					},
					{
						"title": "NEW USERS"
					}
				]
			},
			"chart-data": {
				"columnCount":4, 
				"columns": ["Carrier","Total Sessions", "Total Users","New Users"], 
				"rows": []
			}
		};
				
		this.templateData["chart-data"]["rows"] = carrierData.chartData;
		
		if (!isRefresh) {
			$(this.el).html(this.template(this.templateData));
		
			$(".sortable").stickyTableHeaders();
			
			var self = this;
			$(".sortable").tablesorter({sortList: this.sortList}).bind("sortEnd", function(sorter) {
				self.sortList = sorter.target.config.sortList;
			});
		
			countlyCommon.drawGraph(carrierData.chartDPTotal, "#dashboard-graph", "pie");
			countlyCommon.drawGraph(carrierData.chartDPNew, "#dashboard-graph2", "pie");
		}
	},
	refresh: function() {
		if (app.activeView == this) {
			return false;
		}
		
		var self = this;
		$.when(countlyCarrier.initialize()).then(function(){
			self.renderCommon(true);
			newPage = $("<div>"+self.template(self.templateData)+"</div>");
			newPage.find(".sortable").tablesorter({sortList: self.sortList});
		
			$(self.el).find(".sortable tbody").replaceWith(newPage.find(".sortable tbody"));
		
			var carrierData = countlyCarrier.getCarrierData();
			countlyCommon.drawGraph(carrierData.chartDPTotal, "#dashboard-graph", "pie");
			countlyCommon.drawGraph(carrierData.chartDPNew, "#dashboard-graph2", "pie");
		
			$(".sortable").trigger("update");
		});
	}
});

window.ManageAppsView = countlyView.extend({
	initialize: function() {
		this.template = Handlebars.compile($("#template-management-applications").html());
	},
	renderCommon: function(isRefresh) {
		$(this.el).html(this.template());
		
		var appCategories = { 1: "Books", 2: "Business", 3: "Education", 4: "Entertainment", 5: "Finance", 6: "Games", 7: "Health &amp; Fitness", 8: "Lifestyle", 9: "Medical", 10: "Music", 11: "Navigation", 12: "News", 13: "Photography", 14: "Productivity", 15: "Reference", 16: "Social Networking", 17: "Sports", 18: "Travel", 19: "Utilities", 20: "Weather" },
			timezones = { "AF":{"n":"Afghanistan","z":[{"(GMT+04:30) Kabul":"Asia/Kabul"}]}, "AL":{"n":"Albania","z":[{"(GMT+01:00) Tirane":"Europe/Tirane"}]}, "DZ":{"n":"Algeria","z":[{"(GMT+01:00) Algiers":"Africa/Algiers"}]}, "AS":{"n":"American Samoa","z":[{"(GMT-11:00) Pago Pago":"Pacific/Pago_Pago"}]}, "AD":{"n":"Andorra","z":[{"(GMT+01:00) Andorra":"Europe/Andorra"}]}, "AO":{"n":"Angola","z":[{"(GMT+01:00) Luanda":"Africa/Luanda"}]}, "AI":{"n":"Anguilla","z":[{"(GMT-04:00) Anguilla":"America/Anguilla"}]}, "AQ":{"n":"Antarctica","z":[{"(GMT-04:00) Palmer":"Antarctica/Palmer"},{"(GMT-03:00) Rothera":"Antarctica/Rothera"},{"(GMT+03:00) Syowa":"Antarctica/Syowa"},{"(GMT+05:00) Mawson":"Antarctica/Mawson"},{"(GMT+06:00) Vostok":"Antarctica/Vostok"},{"(GMT+07:00) Davis":"Antarctica/Davis"},{"(GMT+08:00) Casey":"Antarctica/Casey"},{"(GMT+10:00) Dumont D'Urville":"Antarctica/DumontDUrville"}]}, "AG":{"n":"Antigua and Barbuda","z":[{"(GMT-04:00) Antigua":"America/Antigua"}]}, "AR":{"n":"Argentina","z":[{"(GMT-03:00) Buenos Aires":"America/Buenos_Aires"}]}, "AM":{"n":"Armenia","z":[{"(GMT+04:00) Yerevan":"Asia/Yerevan"}]}, "AW":{"n":"Aruba","z":[{"(GMT-04:00) Aruba":"America/Aruba"}]}, "AU":{"n":"Australia","z":[{"(GMT+08:00) Western Time - Perth":"Australia/Perth"},{"(GMT+09:30) Central Time - Adelaide":"Australia/Adelaide"},{"(GMT+09:30) Central Time - Darwin":"Australia/Darwin"},{"(GMT+10:00) Eastern Time - Brisbane":"Australia/Brisbane"},{"(GMT+10:00) Eastern Time - Hobart":"Australia/Hobart"},{"(GMT+10:00) Eastern Time - Melbourne, Sydney":"Australia/Sydney"}]}, "AT":{"n":"Austria","z":[{"(GMT+01:00) Vienna":"Europe/Vienna"}]}, "AZ":{"n":"Azerbaijan","z":[{"(GMT+04:00) Baku":"Asia/Baku"}]}, "BS":{"n":"Bahamas","z":[{"(GMT-05:00) Nassau":"America/Nassau"}]}, "BH":{"n":"Bahrain","z":[{"(GMT+03:00) Bahrain":"Asia/Bahrain"}]}, "BD":{"n":"Bangladesh","z":[{"(GMT+06:00) Dhaka":"Asia/Dhaka"}]}, "BB":{"n":"Barbados","z":[{"(GMT-04:00) Barbados":"America/Barbados"}]}, "BY":{"n":"Belarus","z":[{"(GMT+03:00) Minsk":"Europe/Minsk"}]}, "BE":{"n":"Belgium","z":[{"(GMT+01:00) Brussels":"Europe/Brussels"}]}, "BZ":{"n":"Belize","z":[{"(GMT-06:00) Belize":"America/Belize"}]}, "BJ":{"n":"Benin","z":[{"(GMT+01:00) Porto-Novo":"Africa/Porto-Novo"}]}, "BM":{"n":"Bermuda","z":[{"(GMT-04:00) Bermuda":"Atlantic/Bermuda"}]}, "BT":{"n":"Bhutan","z":[{"(GMT+06:00) Thimphu":"Asia/Thimphu"}]}, "BO":{"n":"Bolivia","z":[{"(GMT-04:00) La Paz":"America/La_Paz"}]}, "BA":{"n":"Bosnia and Herzegovina","z":[{"(GMT+01:00) Central European Time - Belgrade":"Europe/Sarajevo"}]}, "BW":{"n":"Botswana","z":[{"(GMT+02:00) Gaborone":"Africa/Gaborone"}]}, "BR":{"n":"Brazil","z":[{"(GMT-04:00) Boa Vista":"America/Boa_Vista"},{"(GMT-04:00) Campo Grande":"America/Campo_Grande"},{"(GMT-04:00) Cuiaba":"America/Cuiaba"},{"(GMT-04:00) Manaus":"America/Manaus"},{"(GMT-04:00) Porto Velho":"America/Porto_Velho"},{"(GMT-04:00) Rio Branco":"America/Rio_Branco"},{"(GMT-03:00) Araguaina":"America/Araguaina"},{"(GMT-03:00) Belem":"America/Belem"},{"(GMT-03:00) Fortaleza":"America/Fortaleza"},{"(GMT-03:00) Maceio":"America/Maceio"},{"(GMT-03:00) Recife":"America/Recife"},{"(GMT-03:00) Salvador":"America/Bahia"},{"(GMT-03:00) Sao Paulo":"America/Sao_Paulo"},{"(GMT-02:00) Noronha":"America/Noronha"}]}, "IO":{"n":"British Indian Ocean Territory","z":[{"(GMT+06:00) Chagos":"Indian/Chagos"}]}, "VG":{"n":"British Virgin Islands","z":[{"(GMT-04:00) Tortola":"America/Tortola"}]}, "BN":{"n":"Brunei","z":[{"(GMT+08:00) Brunei":"Asia/Brunei"}]}, "BG":{"n":"Bulgaria","z":[{"(GMT+02:00) Sofia":"Europe/Sofia"}]}, "BF":{"n":"Burkina Faso","z":[{"(GMT+00:00) Ouagadougou":"Africa/Ouagadougou"}]}, "BI":{"n":"Burundi","z":[{"(GMT+02:00) Bujumbura":"Africa/Bujumbura"}]}, "KH":{"n":"Cambodia","z":[{"(GMT+07:00) Phnom Penh":"Asia/Phnom_Penh"}]}, "CM":{"n":"Cameroon","z":[{"(GMT+01:00) Douala":"Africa/Douala"}]}, "CA":{"n":"Canada","z":[{"(GMT-07:00) Mountain Time - Dawson Creek":"America/Dawson_Creek"},{"(GMT-08:00) Pacific Time - Vancouver":"America/Vancouver"},{"(GMT-08:00) Pacific Time - Whitehorse":"America/Whitehorse"},{"(GMT-06:00) Central Time - Regina":"America/Regina"},{"(GMT-07:00) Mountain Time - Edmonton":"America/Edmonton"},{"(GMT-07:00) Mountain Time - Yellowknife":"America/Yellowknife"},{"(GMT-06:00) Central Time - Winnipeg":"America/Winnipeg"},{"(GMT-05:00) Eastern Time - Iqaluit":"America/Iqaluit"},{"(GMT-05:00) Eastern Time - Montreal":"America/Montreal"},{"(GMT-05:00) Eastern Time - Toronto":"America/Toronto"},{"(GMT-04:00) Atlantic Time - Halifax":"America/Halifax"},{"(GMT-03:30) Newfoundland Time - St. Johns":"America/St_Johns"}]}, "CV":{"n":"Cape Verde","z":[{"(GMT-01:00) Cape Verde":"Atlantic/Cape_Verde"}]}, "KY":{"n":"Cayman Islands","z":[{"(GMT-05:00) Cayman":"America/Cayman"}]}, "CF":{"n":"Central African Republic","z":[{"(GMT+01:00) Bangui":"Africa/Bangui"}]}, "TD":{"n":"Chad","z":[{"(GMT+01:00) Ndjamena":"Africa/Ndjamena"}]}, "CL":{"n":"Chile","z":[{"(GMT-06:00) Easter Island":"Pacific/Easter"},{"(GMT-04:00) Santiago":"America/Santiago"}]}, "CN":{"n":"China","z":[{"(GMT+08:00) China Time - Beijing":"Asia/Shanghai"}]}, "CX":{"n":"Christmas Island","z":[{"(GMT+07:00) Christmas":"Indian/Christmas"}]}, "CC":{"n":"Cocos [Keeling] Islands","z":[{"(GMT+06:30) Cocos":"Indian/Cocos"}]}, "CO":{"n":"Colombia","z":[{"(GMT-05:00) Bogota":"America/Bogota"}]}, "KM":{"n":"Comoros","z":[{"(GMT+03:00) Comoro":"Indian/Comoro"}]}, "CD":{"n":"Congo [DRC]","z":[{"(GMT+01:00) Kinshasa":"Africa/Kinshasa"},{"(GMT+02:00) Lubumbashi":"Africa/Lubumbashi"}]}, "CG":{"n":"Congo [Republic]","z":[{"(GMT+01:00) Brazzaville":"Africa/Brazzaville"}]}, "CK":{"n":"Cook Islands","z":[{"(GMT-10:00) Rarotonga":"Pacific/Rarotonga"}]}, "CR":{"n":"Costa Rica","z":[{"(GMT-06:00) Costa Rica":"America/Costa_Rica"}]}, "CI":{"n":"Côte d’Ivoire","z":[{"(GMT+00:00) Abidjan":"Africa/Abidjan"}]}, "HR":{"n":"Croatia","z":[{"(GMT+01:00) Central European Time - Belgrade":"Europe/Zagreb"}]}, "CU":{"n":"Cuba","z":[{"(GMT-05:00) Havana":"America/Havana"}]}, "CW":{"n":"Curaçao","z":[{"(GMT-04:00) Curacao":"America/Curacao"}]}, "CY":{"n":"Cyprus","z":[{"(GMT+02:00) Nicosia":"Asia/Nicosia"}]}, "CZ":{"n":"Czech Republic","z":[{"(GMT+01:00) Central European Time - Prague":"Europe/Prague"}]}, "DK":{"n":"Denmark","z":[{"(GMT+01:00) Copenhagen":"Europe/Copenhagen"}]}, "DJ":{"n":"Djibouti","z":[{"(GMT+03:00) Djibouti":"Africa/Djibouti"}]}, "DM":{"n":"Dominica","z":[{"(GMT-04:00) Dominica":"America/Dominica"}]}, "DO":{"n":"Dominican Republic","z":[{"(GMT-04:00) Santo Domingo":"America/Santo_Domingo"}]}, "EC":{"n":"Ecuador","z":[{"(GMT-06:00) Galapagos":"Pacific/Galapagos"},{"(GMT-05:00) Guayaquil":"America/Guayaquil"}]}, "EG":{"n":"Egypt","z":[{"(GMT+02:00) Cairo":"Africa/Cairo"}]}, "SV":{"n":"El Salvador","z":[{"(GMT-06:00) El Salvador":"America/El_Salvador"}]}, "GQ":{"n":"Equatorial Guinea","z":[{"(GMT+01:00) Malabo":"Africa/Malabo"}]}, "ER":{"n":"Eritrea","z":[{"(GMT+03:00) Asmera":"Africa/Asmera"}]}, "EE":{"n":"Estonia","z":[{"(GMT+02:00) Tallinn":"Europe/Tallinn"}]}, "ET":{"n":"Ethiopia","z":[{"(GMT+03:00) Addis Ababa":"Africa/Addis_Ababa"}]}, "FK":{"n":"Falkland Islands [Islas Malvinas]","z":[{"(GMT-03:00) Stanley":"Atlantic/Stanley"}]}, "FO":{"n":"Faroe Islands","z":[{"(GMT+00:00) Faeroe":"Atlantic/Faeroe"}]}, "FJ":{"n":"Fiji","z":[{"(GMT+12:00) Fiji":"Pacific/Fiji"}]}, "FI":{"n":"Finland","z":[{"(GMT+02:00) Helsinki":"Europe/Helsinki"}]}, "FR":{"n":"France","z":[{"(GMT+01:00) Paris":"Europe/Paris"}]}, "GF":{"n":"French Guiana","z":[{"(GMT-03:00) Cayenne":"America/Cayenne"}]}, "PF":{"n":"French Polynesia","z":[{"(GMT-10:00) Tahiti":"Pacific/Tahiti"},{"(GMT-09:30) Marquesas":"Pacific/Marquesas"},{"(GMT-09:00) Gambier":"Pacific/Gambier"}]}, "TF":{"n":"French Southern Territories","z":[{"(GMT+05:00) Kerguelen":"Indian/Kerguelen"}]}, "GA":{"n":"Gabon","z":[{"(GMT+01:00) Libreville":"Africa/Libreville"}]}, "GM":{"n":"Gambia","z":[{"(GMT+00:00) Banjul":"Africa/Banjul"}]}, "GE":{"n":"Georgia","z":[{"(GMT+04:00) Tbilisi":"Asia/Tbilisi"}]}, "DE":{"n":"Germany","z":[{"(GMT+01:00) Berlin":"Europe/Berlin"}]}, "GH":{"n":"Ghana","z":[{"(GMT+00:00) Accra":"Africa/Accra"}]}, "GI":{"n":"Gibraltar","z":[{"(GMT+01:00) Gibraltar":"Europe/Gibraltar"}]}, "GR":{"n":"Greece","z":[{"(GMT+02:00) Athens":"Europe/Athens"}]}, "GL":{"n":"Greenland","z":[{"(GMT-04:00) Thule":"America/Thule"},{"(GMT-03:00) Godthab":"America/Godthab"},{"(GMT-01:00) Scoresbysund":"America/Scoresbysund"},{"(GMT+00:00) Danmarkshavn":"America/Danmarkshavn"}]}, "GD":{"n":"Grenada","z":[{"(GMT-04:00) Grenada":"America/Grenada"}]}, "GP":{"n":"Guadeloupe","z":[{"(GMT-04:00) Guadeloupe":"America/Guadeloupe"}]}, "GU":{"n":"Guam","z":[{"(GMT+10:00) Guam":"Pacific/Guam"}]}, "GT":{"n":"Guatemala","z":[{"(GMT-06:00) Guatemala":"America/Guatemala"}]}, "GN":{"n":"Guinea","z":[{"(GMT+00:00) Conakry":"Africa/Conakry"}]}, "GW":{"n":"Guinea-Bissau","z":[{"(GMT+00:00) Bissau":"Africa/Bissau"}]}, "GY":{"n":"Guyana","z":[{"(GMT-04:00) Guyana":"America/Guyana"}]}, "HT":{"n":"Haiti","z":[{"(GMT-05:00) Port-au-Prince":"America/Port-au-Prince"}]}, "HN":{"n":"Honduras","z":[{"(GMT-06:00) Central Time - Tegucigalpa":"America/Tegucigalpa"}]}, "HK":{"n":"Hong Kong","z":[{"(GMT+08:00) Hong Kong":"Asia/Hong_Kong"}]}, "HU":{"n":"Hungary","z":[{"(GMT+01:00) Budapest":"Europe/Budapest"}]}, "IS":{"n":"Iceland","z":[{"(GMT+00:00) Reykjavik":"Atlantic/Reykjavik"}]}, "IN":{"n":"India","z":[{"(GMT+05:30) India Standard Time":"Asia/Calcutta"}]}, "ID":{"n":"Indonesia","z":[{"(GMT+07:00) Jakarta":"Asia/Jakarta"},{"(GMT+08:00) Makassar":"Asia/Makassar"},{"(GMT+09:00) Jayapura":"Asia/Jayapura"}]}, "IR":{"n":"Iran","z":[{"(GMT+03:30) Tehran":"Asia/Tehran"}]}, "IQ":{"n":"Iraq","z":[{"(GMT+03:00) Baghdad":"Asia/Baghdad"}]}, "IE":{"n":"Ireland","z":[{"(GMT+00:00) Dublin":"Europe/Dublin"}]}, "IL":{"n":"Israel","z":[{"(GMT+02:00) Jerusalem":"Asia/Jerusalem"}]}, "IT":{"n":"Italy","z":[{"(GMT+01:00) Rome":"Europe/Rome"}]}, "JM":{"n":"Jamaica","z":[{"(GMT-05:00) Jamaica":"America/Jamaica"}]}, "JP":{"n":"Japan","z":[{"(GMT+09:00) Tokyo":"Asia/Tokyo"}]}, "JO":{"n":"Jordan","z":[{"(GMT+02:00) Amman":"Asia/Amman"}]}, "KZ":{"n":"Kazakhstan","z":[{"(GMT+05:00) Aqtau":"Asia/Aqtau"},{"(GMT+05:00) Aqtobe":"Asia/Aqtobe"},{"(GMT+06:00) Almaty":"Asia/Almaty"}]}, "KE":{"n":"Kenya","z":[{"(GMT+03:00) Nairobi":"Africa/Nairobi"}]}, "KI":{"n":"Kiribati","z":[{"(GMT+12:00) Tarawa":"Pacific/Tarawa"},{"(GMT+13:00) Enderbury":"Pacific/Enderbury"},{"(GMT+14:00) Kiritimati":"Pacific/Kiritimati"}]}, "KW":{"n":"Kuwait","z":[{"(GMT+03:00) Kuwait":"Asia/Kuwait"}]}, "KG":{"n":"Kyrgyzstan","z":[{"(GMT+06:00) Bishkek":"Asia/Bishkek"}]}, "LA":{"n":"Laos","z":[{"(GMT+07:00) Vientiane":"Asia/Vientiane"}]}, "LV":{"n":"Latvia","z":[{"(GMT+02:00) Riga":"Europe/Riga"}]}, "LB":{"n":"Lebanon","z":[{"(GMT+02:00) Beirut":"Asia/Beirut"}]}, "LS":{"n":"Lesotho","z":[{"(GMT+02:00) Maseru":"Africa/Maseru"}]}, "LR":{"n":"Liberia","z":[{"(GMT+00:00) Monrovia":"Africa/Monrovia"}]}, "LY":{"n":"Libya","z":[{"(GMT+02:00) Tripoli":"Africa/Tripoli"}]}, "LI":{"n":"Liechtenstein","z":[{"(GMT+01:00) Vaduz":"Europe/Vaduz"}]}, "LT":{"n":"Lithuania","z":[{"(GMT+02:00) Vilnius":"Europe/Vilnius"}]}, "LU":{"n":"Luxembourg","z":[{"(GMT+01:00) Luxembourg":"Europe/Luxembourg"}]}, "MO":{"n":"Macau","z":[{"(GMT+08:00) Macau":"Asia/Macau"}]}, "MK":{"n":"Macedonia [FYROM]","z":[{"(GMT+01:00) Central European Time - Belgrade":"Europe/Skopje"}]}, "MG":{"n":"Madagascar","z":[{"(GMT+03:00) Antananarivo":"Indian/Antananarivo"}]}, "MW":{"n":"Malawi","z":[{"(GMT+02:00) Blantyre":"Africa/Blantyre"}]}, "MY":{"n":"Malaysia","z":[{"(GMT+08:00) Kuala Lumpur":"Asia/Kuala_Lumpur"}]}, "MV":{"n":"Maldives","z":[{"(GMT+05:00) Maldives":"Indian/Maldives"}]}, "ML":{"n":"Mali","z":[{"(GMT+00:00) Bamako":"Africa/Bamako"}]}, "MT":{"n":"Malta","z":[{"(GMT+01:00) Malta":"Europe/Malta"}]}, "MH":{"n":"Marshall Islands","z":[{"(GMT+12:00) Kwajalein":"Pacific/Kwajalein"},{"(GMT+12:00) Majuro":"Pacific/Majuro"}]}, "MQ":{"n":"Martinique","z":[{"(GMT-04:00) Martinique":"America/Martinique"}]}, "MR":{"n":"Mauritania","z":[{"(GMT+00:00) Nouakchott":"Africa/Nouakchott"}]}, "MU":{"n":"Mauritius","z":[{"(GMT+04:00) Mauritius":"Indian/Mauritius"}]}, "YT":{"n":"Mayotte","z":[{"(GMT+03:00) Mayotte":"Indian/Mayotte"}]}, "MX":{"n":"Mexico","z":[{"(GMT-07:00) Mountain Time - Hermosillo":"America/Hermosillo"},{"(GMT-08:00) Pacific Time - Tijuana":"America/Tijuana"},{"(GMT-07:00) Mountain Time - Chihuahua, Mazatlan":"America/Mazatlan"},{"(GMT-06:00) Central Time - Mexico City":"America/Mexico_City"}]}, "FM":{"n":"Micronesia","z":[{"(GMT+10:00) Truk":"Pacific/Truk"},{"(GMT+11:00) Kosrae":"Pacific/Kosrae"},{"(GMT+11:00) Ponape":"Pacific/Ponape"}]}, "MD":{"n":"Moldova","z":[{"(GMT+02:00) Chisinau":"Europe/Chisinau"}]}, "MC":{"n":"Monaco","z":[{"(GMT+01:00) Monaco":"Europe/Monaco"}]}, "MN":{"n":"Mongolia","z":[{"(GMT+07:00) Hovd":"Asia/Hovd"},{"(GMT+08:00) Choibalsan":"Asia/Choibalsan"},{"(GMT+08:00) Ulaanbaatar":"Asia/Ulaanbaatar"}]}, "MS":{"n":"Montserrat","z":[{"(GMT-04:00) Montserrat":"America/Montserrat"}]}, "MA":{"n":"Morocco","z":[{"(GMT+00:00) Casablanca":"Africa/Casablanca"}]}, "MZ":{"n":"Mozambique","z":[{"(GMT+02:00) Maputo":"Africa/Maputo"}]}, "MM":{"n":"Myanmar [Burma]","z":[{"(GMT+06:30) Rangoon":"Asia/Rangoon"}]}, "NA":{"n":"Namibia","z":[{"(GMT+01:00) Windhoek":"Africa/Windhoek"}]}, "NR":{"n":"Nauru","z":[{"(GMT+12:00) Nauru":"Pacific/Nauru"}]}, "NP":{"n":"Nepal","z":[{"(GMT+05:45) Katmandu":"Asia/Katmandu"}]}, "NL":{"n":"Netherlands","z":[{"(GMT+01:00) Amsterdam":"Europe/Amsterdam"}]}, "NC":{"n":"New Caledonia","z":[{"(GMT+11:00) Noumea":"Pacific/Noumea"}]}, "NZ":{"n":"New Zealand","z":[{"(GMT+12:00) Auckland":"Pacific/Auckland"}]}, "NI":{"n":"Nicaragua","z":[{"(GMT-06:00) Managua":"America/Managua"}]}, "NE":{"n":"Niger","z":[{"(GMT+01:00) Niamey":"Africa/Niamey"}]}, "NG":{"n":"Nigeria","z":[{"(GMT+01:00) Lagos":"Africa/Lagos"}]}, "NU":{"n":"Niue","z":[{"(GMT-11:00) Niue":"Pacific/Niue"}]}, "NF":{"n":"Norfolk Island","z":[{"(GMT+11:30) Norfolk":"Pacific/Norfolk"}]}, "KP":{"n":"North Korea","z":[{"(GMT+09:00) Pyongyang":"Asia/Pyongyang"}]}, "MP":{"n":"Northern Mariana Islands","z":[{"(GMT+10:00) Saipan":"Pacific/Saipan"}]}, "NO":{"n":"Norway","z":[{"(GMT+01:00) Oslo":"Europe/Oslo"}]}, "OM":{"n":"Oman","z":[{"(GMT+04:00) Muscat":"Asia/Muscat"}]}, "PK":{"n":"Pakistan","z":[{"(GMT+05:00) Karachi":"Asia/Karachi"}]}, "PW":{"n":"Palau","z":[{"(GMT+09:00) Palau":"Pacific/Palau"}]}, "PS":{"n":"Palestinian Territories","z":[{"(GMT+02:00) Gaza":"Asia/Gaza"}]}, "PA":{"n":"Panama","z":[{"(GMT-05:00) Panama":"America/Panama"}]}, "PG":{"n":"Papua New Guinea","z":[{"(GMT+10:00) Port Moresby":"Pacific/Port_Moresby"}]}, "PY":{"n":"Paraguay","z":[{"(GMT-04:00) Asuncion":"America/Asuncion"}]}, "PE":{"n":"Peru","z":[{"(GMT-05:00) Lima":"America/Lima"}]}, "PH":{"n":"Philippines","z":[{"(GMT+08:00) Manila":"Asia/Manila"}]}, "PN":{"n":"Pitcairn Islands","z":[{"(GMT-08:00) Pitcairn":"Pacific/Pitcairn"}]}, "PL":{"n":"Poland","z":[{"(GMT+01:00) Warsaw":"Europe/Warsaw"}]}, "PT":{"n":"Portugal","z":[{"(GMT-01:00) Azores":"Atlantic/Azores"},{"(GMT+00:00) Lisbon":"Europe/Lisbon"}]}, "PR":{"n":"Puerto Rico","z":[{"(GMT-04:00) Puerto Rico":"America/Puerto_Rico"}]}, "QA":{"n":"Qatar","z":[{"(GMT+03:00) Qatar":"Asia/Qatar"}]}, "RE":{"n":"Réunion","z":[{"(GMT+04:00) Reunion":"Indian/Reunion"}]}, "RO":{"n":"Romania","z":[{"(GMT+02:00) Bucharest":"Europe/Bucharest"}]}, "RU":{"n":"Russia","z":[{"(GMT+03:00) Moscow-01 - Kaliningrad":"Europe/Kaliningrad"},{"(GMT+04:00) Moscow+00":"Europe/Moscow"},{"(GMT+04:00) Moscow+00 - Samara":"Europe/Samara"},{"(GMT+06:00) Moscow+02 - Yekaterinburg":"Asia/Yekaterinburg"},{"(GMT+07:00) Moscow+03 - Omsk, Novosibirsk":"Asia/Omsk"},{"(GMT+08:00) Moscow+04 - Krasnoyarsk":"Asia/Krasnoyarsk"},{"(GMT+09:00) Moscow+05 - Irkutsk":"Asia/Irkutsk"},{"(GMT+10:00) Moscow+06 - Yakutsk":"Asia/Yakutsk"},{"(GMT+11:00) Moscow+07 - Yuzhno-Sakhalinsk":"Asia/Vladivostok"},{"(GMT+12:00) Moscow+08 - Magadan":"Asia/Magadan"},{"(GMT+12:00) Moscow+08 - Petropavlovsk-Kamchatskiy":"Asia/Kamchatka"}]}, "RW":{"n":"Rwanda","z":[{"(GMT+02:00) Kigali":"Africa/Kigali"}]}, "SH":{"n":"Saint Helena","z":[{"(GMT+00:00) St Helena":"Atlantic/St_Helena"}]}, "KN":{"n":"Saint Kitts and Nevis","z":[{"(GMT-04:00) St. Kitts":"America/St_Kitts"}]}, "LC":{"n":"Saint Lucia","z":[{"(GMT-04:00) St. Lucia":"America/St_Lucia"}]}, "PM":{"n":"Saint Pierre and Miquelon","z":[{"(GMT-03:00) Miquelon":"America/Miquelon"}]}, "VC":{"n":"Saint Vincent and the Grenadines","z":[{"(GMT-04:00) St. Vincent":"America/St_Vincent"}]}, "WS":{"n":"Samoa","z":[{"(GMT+13:00) Apia":"Pacific/Apia"}]}, "SM":{"n":"San Marino","z":[{"(GMT+01:00) Rome":"Europe/San_Marino"}]}, "ST":{"n":"São Tomé and Príncipe","z":[{"(GMT+00:00) Sao Tome":"Africa/Sao_Tome"}]}, "SA":{"n":"Saudi Arabia","z":[{"(GMT+03:00) Riyadh":"Asia/Riyadh"}]}, "SN":{"n":"Senegal","z":[{"(GMT+00:00) Dakar":"Africa/Dakar"}]}, "RS":{"n":"Serbia","z":[{"(GMT+01:00) Central European Time - Belgrade":"Europe/Belgrade"}]}, "SC":{"n":"Seychelles","z":[{"(GMT+04:00) Mahe":"Indian/Mahe"}]}, "SL":{"n":"Sierra Leone","z":[{"(GMT+00:00) Freetown":"Africa/Freetown"}]}, "SG":{"n":"Singapore","z":[{"(GMT+08:00) Singapore":"Asia/Singapore"}]}, "SK":{"n":"Slovakia","z":[{"(GMT+01:00) Central European Time - Prague":"Europe/Bratislava"}]}, "SI":{"n":"Slovenia","z":[{"(GMT+01:00) Central European Time - Belgrade":"Europe/Ljubljana"}]}, "SB":{"n":"Solomon Islands","z":[{"(GMT+11:00) Guadalcanal":"Pacific/Guadalcanal"}]}, "SO":{"n":"Somalia","z":[{"(GMT+03:00) Mogadishu":"Africa/Mogadishu"}]}, "ZA":{"n":"South Africa","z":[{"(GMT+02:00) Johannesburg":"Africa/Johannesburg"}]}, "GS":{"n":"South Georgia and the South Sandwich Islands","z":[{"(GMT-02:00) South Georgia":"Atlantic/South_Georgia"}]}, "KR":{"n":"South Korea","z":[{"(GMT+09:00) Seoul":"Asia/Seoul"}]}, "ES":{"n":"Spain","z":[{"(GMT+00:00) Canary Islands":"Atlantic/Canary"},{"(GMT+01:00) Ceuta":"Africa/Ceuta"},{"(GMT+01:00) Madrid":"Europe/Madrid"}]}, "LK":{"n":"Sri Lanka","z":[{"(GMT+05:30) Colombo":"Asia/Colombo"}]}, "SD":{"n":"Sudan","z":[{"(GMT+03:00) Khartoum":"Africa/Khartoum"}]}, "SR":{"n":"Suriname","z":[{"(GMT-03:00) Paramaribo":"America/Paramaribo"}]}, "SJ":{"n":"Svalbard and Jan Mayen","z":[{"(GMT+01:00) Oslo":"Arctic/Longyearbyen"}]}, "SZ":{"n":"Swaziland","z":[{"(GMT+02:00) Mbabane":"Africa/Mbabane"}]}, "SE":{"n":"Sweden","z":[{"(GMT+01:00) Stockholm":"Europe/Stockholm"}]}, "CH":{"n":"Switzerland","z":[{"(GMT+01:00) Zurich":"Europe/Zurich"}]}, "SY":{"n":"Syria","z":[{"(GMT+02:00) Damascus":"Asia/Damascus"}]}, "TW":{"n":"Taiwan","z":[{"(GMT+08:00) Taipei":"Asia/Taipei"}]}, "TJ":{"n":"Tajikistan","z":[{"(GMT+05:00) Dushanbe":"Asia/Dushanbe"}]}, "TZ":{"n":"Tanzania","z":[{"(GMT+03:00) Dar es Salaam":"Africa/Dar_es_Salaam"}]}, "TH":{"n":"Thailand","z":[{"(GMT+07:00) Bangkok":"Asia/Bangkok"}]}, "TL":{"n":"Timor-Leste","z":[{"(GMT+09:00) Dili":"Asia/Dili"}]}, "TG":{"n":"Togo","z":[{"(GMT+00:00) Lome":"Africa/Lome"}]}, "TK":{"n":"Tokelau","z":[{"(GMT+14:00) Fakaofo":"Pacific/Fakaofo"}]}, "TO":{"n":"Tonga","z":[{"(GMT+13:00) Tongatapu":"Pacific/Tongatapu"}]}, "TT":{"n":"Trinidad and Tobago","z":[{"(GMT-04:00) Port of Spain":"America/Port_of_Spain"}]}, "TN":{"n":"Tunisia","z":[{"(GMT+01:00) Tunis":"Africa/Tunis"}]}, "TR":{"n":"Turkey","z":[{"(GMT+02:00) Istanbul":"Europe/Istanbul"}]}, "TM":{"n":"Turkmenistan","z":[{"(GMT+05:00) Ashgabat":"Asia/Ashgabat"}]}, "TC":{"n":"Turks and Caicos Islands","z":[{"(GMT-05:00) Grand Turk":"America/Grand_Turk"}]}, "TV":{"n":"Tuvalu","z":[{"(GMT+12:00) Funafuti":"Pacific/Funafuti"}]}, "UM":{"n":"U.S. Minor Outlying Islands","z":[{"(GMT-11:00) Midway":"Pacific/Midway"},{"(GMT-10:00) Johnston":"Pacific/Johnston"},{"(GMT+12:00) Wake":"Pacific/Wake"}]}, "VI":{"n":"U.S. Virgin Islands","z":[{"(GMT-04:00) St. Thomas":"America/St_Thomas"}]}, "UG":{"n":"Uganda","z":[{"(GMT+03:00) Kampala":"Africa/Kampala"}]}, "UA":{"n":"Ukraine","z":[{"(GMT+02:00) Kiev":"Europe/Kiev"}]}, "AE":{"n":"United Arab Emirates","z":[{"(GMT+04:00) Dubai":"Asia/Dubai"}]}, "GB":{"n":"United Kingdom","z":[{"(GMT+00:00) GMT (no daylight saving)":"Etc/GMT"},{"(GMT+00:00) London":"Europe/London"}]}, "US":{"n":"United States","z":[{"(GMT-10:00) Hawaii Time":"Pacific/Honolulu"},{"(GMT-09:00) Alaska Time":"America/Anchorage"},{"(GMT-07:00) Mountain Time - Arizona":"America/Phoenix"},{"(GMT-08:00) Pacific Time":"America/Los_Angeles"},{"(GMT-07:00) Mountain Time":"America/Denver"},{"(GMT-06:00) Central Time":"America/Chicago"},{"(GMT-05:00) Eastern Time":"America/New_York"}]}, "UY":{"n":"Uruguay","z":[{"(GMT-03:00) Montevideo":"America/Montevideo"}]}, "UZ":{"n":"Uzbekistan","z":[{"(GMT+05:00) Tashkent":"Asia/Tashkent"}]}, "VU":{"n":"Vanuatu","z":[{"(GMT+11:00) Efate":"Pacific/Efate"}]}, "VA":{"n":"Vatican City","z":[{"(GMT+01:00) Rome":"Europe/Vatican"}]}, "VE":{"n":"Venezuela","z":[{"(GMT-04:30) Caracas":"America/Caracas"}]}, "VN":{"n":"Vietnam","z":[{"(GMT+07:00) Hanoi":"Asia/Saigon"}]}, "WF":{"n":"Wallis and Futuna","z":[{"(GMT+12:00) Wallis":"Pacific/Wallis"}]}, "EH":{"n":"Western Sahara","z":[{"(GMT+00:00) El Aaiun":"Africa/El_Aaiun"}]}, "YE":{"n":"Yemen","z":[{"(GMT+03:00) Aden":"Asia/Aden"}]}, "ZM":{"n":"Zambia","z":[{"(GMT+02:00) Lusaka":"Africa/Lusaka"}]}, "ZW":{"n":"Zimbabwe","z":[{"(GMT+02:00) Harare":"Africa/Harare"}]} }; 
		
		var userApps = $("#app-nav .scrollable").clone(true).find(".app-container").removeClass("app-navigate");
		$("#app-management-bar .scrollable").append(userApps);

		var appId = $("#app-management-bar .scrollable .app-container:not(#manage-new-app)").data("id") + "";

		function initAppManagement(appId) {
			if (jQuery.isEmptyObject(window.gCountlyApps)) {
				showAdd();
				$("#no-app-warning").show();
				return false;
			} else {
				hideAdd();
			}
		
			if ($("#new-install-overlay").is(":visible")) {
				$("#no-app-warning").hide();
				$("#first-app-success").show();
				$("#new-install-overlay").fadeOut();
				countlyCommon.setActiveApp(window.gCountlyApps[appId].key);
				$("#sidebar-app-select .logo").css("background-image", "url('/appimages/" + appId + ".png')");
				$("#sidebar-app-select .text").text(window.gCountlyApps[appId].name);
				
				countlySession.initialize();
				countlyLocation.initialize();
				countlyUser.initialize();
				countlyDevice.initialize();
				countlyCarrier.initialize();
				countlyDeviceDetails.initialize();
			}
			
			$("#app-edit-id").val(appId);
			$("#view-app .widget-header .title").text(window.gCountlyApps[appId].name);		
			$("#app-edit-name .read").text(window.gCountlyApps[appId].name);
			$("#app-edit-name .edit input").val(window.gCountlyApps[appId].name);
			$("#view-app-key").text(window.gCountlyApps[appId].key);
			$("#app-edit-category .cly-select .text").text(appCategories[window.gCountlyApps[appId].category]);
			$("#app-edit-category .cly-select .text").data("value", window.gCountlyApps[appId].category);
			$("#app-edit-timezone .cly-select .text").data("value", window.gCountlyApps[appId].timezone);
			$("#app-edit-category .read").text(appCategories[window.gCountlyApps[appId].category]);
			$("#app-edit-image .read .logo").css({"background-image": 'url("/appimages/' + appId + '.png")'});
			var appTimezone = timezones[window.gCountlyApps[appId].country];
		
			for (var i = 0; i < appTimezone.z.length; i++) {
				for (var tzone in appTimezone.z[i]) {
					if (appTimezone.z[i][tzone] == window.gCountlyApps[appId].timezone) {
						var appEditTimezone = $("#app-edit-timezone .read"),
							appCountryCode = window.gCountlyApps[appId].country;
						appEditTimezone.find(".flag").css({"background-image": "url(/images/flags/" + appCountryCode.toLowerCase() + ".png)"});
						appEditTimezone.find(".country").text(appTimezone.n);
						appEditTimezone.find(".timezone").text(tzone);
						initCountrySelect("#app-edit-timezone", appCountryCode, tzone);
						break;
					}
				}
			}
		}
		
		function initCountrySelect(parent, countryCode, timezone) {
			$(parent + " #timezone-select").hide();
			$(parent + " #selected").hide();
			$(parent + " #timezone-items").html("");
			$(parent + " #country-items").html("");
		
			var countrySelect = $(parent + " #country-items");
			var timezoneSelect = $(parent + " #timezone-items");
			
			for (var key in timezones) {
				countrySelect.append("<div data-value='"+ key +"' class='item'><div class='flag' style='background-image:url(/images/flags/"+ key.toLowerCase() +".png)'></div>"+ timezones[key].n +"</div>")
			}
			
			if (countryCode && timezone) {
				var country = timezones[countryCode];
				
				if (country.z.length == 1) {
					for (var prop in country.z[0]) {
						$(parent + " #selected").show();
						$(parent + " #selected").text(prop);
						$(parent + " #app-timezone").val(country.z[0][prop]);
						$(parent + " #app-country").val(countryCode);
						$(parent + " #country-select .text").html("<div class='flag' style='background-image:url(/images/flags/"+ countryCode.toLowerCase() +".png)'></div>"+ country.n);
					}
				} else {
					$(parent + " #timezone-select").find(".text").text(prop);
					var countryTimezones = country.z;
					
					for (var i = 0; i < countryTimezones.length; i++) {
						for (var prop in countryTimezones[i]) {
							timezoneSelect.append("<div data-value='"+ countryTimezones[i][prop] +"' class='item'>"+ prop +"</div>")
						}
					}
					
					$(parent + " #app-timezone").val(timezone);
					$(parent + " #app-country").val(countryCode);
					$(parent + " #country-select .text").html("<div class='flag' style='background-image:url(/images/flags/"+ countryCode.toLowerCase() +".png)'></div>"+ country.n);
					$(parent + " #timezone-select .text").text(timezone);
					$(parent + " #timezone-select").show();
				}
				
				$(parent + " .select-items .item").click(function() {
					var selectedItem = $(this).parents(".cly-select").find(".text");
					selectedItem.html($(this).html());
					selectedItem.data("value", $(this).data("value"));
				});
				$(parent + " #timezone-items .item").click(function() {
					$(parent + " #app-timezone").val($(this).data("value"));
				});
			}
			
			$(parent + " #country-items .item").click(function() {	
				$(parent + " #selected").text("");
				$(parent + " #timezone-select").hide();
				timezoneSelect.html("");
				var attr = $(this).data("value");
				var countryTimezones = timezones[attr].z;
				
				if (countryTimezones.length == 1) {
					for (var prop in timezones[attr].z[0]) {
						$(parent + " #selected").show();
						$(parent + " #selected").text(prop);
						$(parent + " #app-timezone").val(timezones[attr].z[0][prop]);
						$(parent + " #app-country").val(attr);
					}
				} else {
				
					var firstTz = "";
				
					for (var i = 0; i < timezones[attr].z.length; i++) {
						for (var prop in timezones[attr].z[i]) {
							if (i == 0) {
								$(parent + " #timezone-select").find(".text").text(prop);
								firstTz = timezones[attr].z[0][prop];
								$(parent + " #app-country").val(attr);
							}
						
							timezoneSelect.append("<div data-value='"+ timezones[attr].z[i][prop] +"' class='item'>"+ prop +"</div>")
						}
					}
					
					$(parent + " #timezone-select").show();
					$(parent + " #app-timezone").val(firstTz);
					$(parent + " .select-items .item").click(function() {
						var selectedItem = $(this).parents(".cly-select").find(".text");
						selectedItem.html($(this).html());
						selectedItem.data("value", $(this).data("value"));
					});
					$(parent + " #timezone-items .item").click(function() {
						$(parent + " #app-timezone").val($(this).data("value"));
					});
				}
			});
		}
		
		function hideEdit() {
			$("#edit-app").removeClass("active");
			$(".edit").hide();
			$(".read").show();
			$(".table-edit").hide();
			$(".required-message").hide();
			$(".required").hide();
		}
		
		function resetAdd() {
			$("#app-add-name").val("");
			$("#app-add-category").text("Select a category");
			$("#app-add-category").data("value", "");
			$("#app-add-timezone #selected").text("");
			$("#app-add-timezone #selected").hide();
			$("#app-add-timezone .text").html("Select a country");
			$("#app-add-timezone .text").data("value", "");
			$("#app-add-timezone #app-timezone").val("");
			$("#app-add-timezone #app-country").val("");
			$("#app-add-timezone #timezone-select").hide();
			$(".required-message").hide();
			$(".required").hide();
		}
		
		function showAdd() {
			if ($("#app-container-new").is(":visible")) {
				return false;
			}
			
			hideEdit();
			var manageBarApp = $("#manage-new-app>div").clone();
			manageBarApp.attr("id", "app-container-new");
			
			if (jQuery.isEmptyObject(window.gCountlyApps)) {
				$("#cancel-app-add").hide();
			} else {
				$("#cancel-app-add").show();
			}
			
			$("#app-management-bar .scrollable").append(manageBarApp);
			$("#add-new-app").show();
			$("#view-app").hide();
		}
		
		function hideAdd() {
			$("#app-container-new").remove();
			$("#add-new-app").hide();
			resetAdd();
			$("#view-app").show();
		}
		
		initAppManagement(appId);
		initCountrySelect("#app-add-timezone");
		
		$("#delete-app").click(function() {
			CountlyHelpers.confirm("You are about to delete all the data associated with your application. Do you want to continue?", "red", function() {
				var appId = $("#app-edit-id").val();
		
				$.ajax({
					type: "POST",
					url: "/dashboard/apps/delete",
					data: {
						app_id: appId
					},
					success: function(result) {
				
						if (!result) {
							CountlyHelpers.alert("Only administrators of an application can delete it.", "red");
							return false;
						}
				
						delete window.gCountlyApps[appId];
						var activeApp = $(".app-container").filter(function() {
							return $(this).data("id") && $(this).data("id") == appId;
						});
					
						var changeApp = (activeApp.prev().length)? activeApp.prev() : activeApp.next();
						initAppManagement(changeApp.data("id"));				
						activeApp.fadeOut("slow").remove();
						
						if (_.isEmpty(window.gCountlyApps)) {
							$("#new-install-overlay").show();
							$("#sidebar-app-select .logo").css("background-image", "");
							$("#sidebar-app-select .text").text("");
						}
					}
				});
			});
		});
		
		$("#edit-app").click(function() {
			if($(".table-edit").is(":visible")) {
				hideEdit();
			} else {
				$(".edit").show();
				$("#edit-app").addClass("active");
				$(".read").hide();
				$(".table-edit").show();
			}
		});

		$("#save-app-edit").click(function() {
			if ($(this).hasClass("disabled")) {
				return false;
			}
			
			var appId = $("#app-edit-id").val(),
				appName = $("#app-edit-name .edit input").val();
		
			if (!appName) {
				$("#req-app-edit-name").fadeIn();
			} else {
				$("#req-app-edit-name").fadeOut();
			}
		
			if (!appName) {
				$(".required-message").fadeIn();
				return false;
			} else {
				$(".required-message").fadeOut();
			}

			var ext = $('#add-edit-image-form').find("#app_image").val().split('.').pop().toLowerCase();
			if(ext && $.inArray(ext, ['gif','png','jpg','jpeg']) == -1) {
				CountlyHelpers.alert("Only jpg, png and gif image formats are allowed", "red");
				return false;
			}
			
			$(this).addClass("disabled");
		
			$.ajax({
				type: "POST",
				url: "/dashboard/apps/edit",
				data: {
					app_id: appId, 
					app_name: appName,
					category: $("#app-edit-category .cly-select .text").data("value"),
					timezone: $("#app-edit-timezone #app-timezone").val(),
					country: $("#app-edit-timezone #app-country").val()
				},
				success: function(data) {
					for (var modAttr in data) {
						window.gCountlyApps[appId][modAttr] = data[modAttr];
					}
					
					if(!ext) {
						$("#save-app-edit").removeClass("disabled");
						initAppManagement(appId);
						hideEdit();
						$(".app-container").filter(function() {
							return $(this).data("id") && $(this).data("id") == appId;
						}).find(".name").text(appName);
						return true;
					}
					
					$('#add-edit-image-form').find("#app_image_id").val(appId);
					$('#add-edit-image-form').ajaxSubmit({
						resetForm: true,
						success: function(file) {
							$("#save-app-edit").removeClass("disabled");
							var updatedApp = $(".app-container").filter(function() {
								return $(this).data("id") && $(this).data("id") == appId;
							});
							
							if (!file) {
								CountlyHelpers.alert("Only jpg, png and gif image formats are allowed", "red");
							} else {
								updatedApp.find(".logo").css({
									"background-image": "url(" + file + ")"
								});
								$("#sidebar-app-select .logo").css("background-image", $("#sidebar-app-select .logo").css("background-image"));
							}
							
							initAppManagement(appId);
							hideEdit();
							updatedApp.find(".name").text(appName);
						}
					});
				}
			});
		});
		
		$("#cancel-app-edit").click(function() {
			hideEdit();
			var appId = $("#app-edit-id").val();
			initAppManagement(appId);
		});
		
		$(".app-container:not(#app-container-new)").live("click", function() {
			var appId = $(this).data("id");
			hideEdit();
			initAppManagement(appId);
		});
				
		$("#add-app-button").click(function() {
			showAdd();
		});
		
		$("#cancel-app-add").click(function() {
			$("#app-container-new").remove();
			$("#add-new-app").hide();
			$("#view-app").show();
			$(".new-app-name").text("My new app");
			resetAdd();
		});
		
		$("#app-add-name").keyup(function() {
			var newAppName = $(this).val();
			$("#app-container-new .name").text(newAppName);
			$(".new-app-name").text(newAppName);
		});
		
		$("#save-app-add").click(function() {
			
			if ($(this).hasClass("disabled")) {
				return false;
			}
			
			var appName = $("#app-add-name").val(),
				category = $("#app-add-category").data("value"),
				timezone = $("#app-add-timezone #app-timezone").val(),
				country = $("#app-add-timezone #app-country").val();
		
			if (!appName) {
				$("#req-app-add-name").fadeIn();
			} else {
				$("#req-app-add-name").fadeOut();
			}
			
			if (!category) {
				$("#req-app-add-cat").fadeIn();
			} else {
				$("#req-app-add-cat").fadeOut();
			}
			
			if (!timezone) {
				$("#req-app-add-time").fadeIn();
			} else {
				$("#req-app-add-time").fadeOut();
			}
		
			if (!appName || !category || !timezone) {
				$(".required-message").fadeIn();
				return false;
			} else {
				$(".required-message").fadeOut();
			}
			
			var ext = $('#add-app-image-form').find("#app_image").val().split('.').pop().toLowerCase();
			if(ext && $.inArray(ext, ['gif','png','jpg','jpeg']) == -1) {
				CountlyHelpers.alert("Only jpg, png and gif image formats are allowed", "red");
				return false;
			}
			
			$(this).addClass("disabled");
		
			$.ajax({
				type: "POST",
				url: "/dashboard/apps/add",
				data: { 
					app_name: appName,
					category: category,
					timezone: timezone,
					country: country
				},
				success: function(data) {
					
					var sidebarApp = $("#sidebar-new-app>div").clone();

					window.gCountlyApps[data._id] = {
						"name": data.name,
						"key": data.key,
						"category": data.category,
						"timezone": data.timezone,
						"country": data.country
					};
					
					var newApp = $("#app-container-new");
					newApp.data("id", data._id);
					newApp.data("key", data.key);
					newApp.removeAttr("id");
					
					if(!ext) {
						$("#save-app-add").removeClass("disabled");
						sidebarApp.find(".name").text(data.name);
						sidebarApp.data("id", data._id);
						sidebarApp.data("key", data.key);
						
						$("#app-nav .scrollable").append(sidebarApp);
						initAppManagement(data._id);
						return true;
					}
					
					$('#add-app-image-form').find("#app_image_id").val(data._id);
					$('#add-app-image-form').ajaxSubmit({
						resetForm: true,
						success: function(file) {
							$("#save-app-add").removeClass("disabled");
							
							if (!file) {
								CountlyHelpers.alert("Only jpg, png and gif image formats are allowed", "red");
							} else {
								newApp.find(".logo").css({
									"background-image": "url(" + file + ")"
								});
								sidebarApp.find(".logo").css({
									"background-image": "url(" + file + ")"
								});
							}
							
							sidebarApp.find(".name").text(data.name);
							sidebarApp.data("id", data._id);
							sidebarApp.data("key", data.key);
							
							$("#app-nav .scrollable").append(sidebarApp);
							initAppManagement(data._id);
						}
					});
				}
			});
		});
	}
});

var AppRouter = Backbone.Router.extend({
	routes: {
		"/"			   			: "dashboard",
		"/analytics/sessions" 	: "sessions",
		"/analytics/countries" 	: "countries",
		"/analytics/users" 		: "users",
		"/analytics/loyalty" 	: "loyalty",
		"/analytics/devices" 	: "devices",
		"/analytics/carriers" 	: "carriers",
		"/analytics/frequency" 	: "frequency",
		"/manage/apps" 			: "apps",
		"*path"					: "main"
	},
	readyToRender: false,
	activeView: null, //current view
	dateToSelected: null, //date to selected from the date picker
	dateFromSelected: null, //date from selected from the date picker
	activeAppName: '',
	activeAppKey: '',
	main: function() {
		this.navigate("/", true);
	},
	dashboard: function() {
		this.renderWhenReady(this.dashboardView);
	},
	sessions: function() {
		this.renderWhenReady(this.sessionView);
	},
	countries: function() {
		this.renderWhenReady(this.countriesView);
	},
	devices: function() {
		this.renderWhenReady(this.deviceView);
	},
	users: function() {
		this.renderWhenReady(this.userView);
	},
	loyalty: function() {
		this.renderWhenReady(this.loyaltyView);
	},
	frequency: function() {
		this.renderWhenReady(this.frequencyView);
	},
	carriers: function() {
		this.renderWhenReady(this.carrierView);
	},
	apps: function() {
		this.renderWhenReady(this.manageAppsView);
	},
	refreshActiveView: function() {}, //refresh interval function
	renderWhenReady: function(viewName) { //all view renders end up here
		this.activeView = viewName;
		clearInterval(this.refreshActiveView);
				
		if (_.isEmpty(window.gCountlyApps)) {
			if (Backbone.history.fragment != "/manage/apps") {
				this.navigate("/manage/apps", true);
			} else {
				this.activeView.render();
				this.pageScript();
			}
			return false;
		}
				
		var self = this;
		if (this.readyToRender) {
			viewName.render();
			this.refreshActiveView = setInterval(function() { self.activeView.refresh(); }, 10000);
			this.pageScript();
		} else {
			$.when(countlySession.initialize(), countlyLocation.initialize(), countlyUser.initialize(), countlyDevice.initialize(), countlyCarrier.initialize(), countlyDeviceDetails.initialize()).then(function(){
				self.readyToRender = true;
				self.activeView.render();
				this.refreshActiveView = setInterval(function() { self.activeView.refresh(); }, 10000);
				self.pageScript();
			});
		}
	},
	initialize: function() { //initialize the dashboard, register helpers etc.

		this.dashboardView = new DashboardView();
		this.sessionView = new SessionView();
		this.countriesView = new CountriesView();
		this.userView = new UserView();
		this.loyaltyView = new LoyaltyView();
		this.deviceView = new DeviceView();
		this.frequencyView = new FrequencyView();
		this.carrierView = new CarrierView();
		this.manageAppsView = new ManageAppsView();
	
		Handlebars.registerPartial("date-selector", $("#template-date-selector").html());
		Handlebars.registerPartial("timezones", $("#template-timezones").html());
		Handlebars.registerPartial("app-categories", $("#template-app-categories").html());
		Handlebars.registerHelper('eachOfObject', function(context, options) {
			var ret = "";
			for(var prop in context) {
				ret = ret + options.fn({property:prop,value:context[prop]});
			}
			return ret;
		});
		Handlebars.registerHelper('eachOfArray', function(context, options) {
			var ret = "";
			for(var i=0; i < context.length; i++) {
				ret = ret + options.fn({value:context[i]});
			}
			return ret;
		});
		Handlebars.registerHelper('getShortNumber', function(context, options) {
			return countlyCommon.getShortNumber(context);
		});
		Handlebars.registerHelper('getFormattedNumber', function(context, options) {
			if (isNaN(context)) {
				return context;
			}
			
			var ret = "" + context;
			return ret.replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,");
		});
		Handlebars.registerHelper('toUpperCase', function(context, options) {
			return context.toUpperCase();
		});
		$.tablesorter.addParser({ 
			id: 'customDate', 
			is: function(s) {
			  return false;
			}, 
			format: function(s) {
				if (s.indexOf(":") != -1) {
					return s.replace(':','');
				} else if (s.length == 3) {
					return moment.monthsShort.indexOf(s);
				} else {
					s = s.replace(/th|rd|st|nd/,"");
					return  $.tablesorter.formatFloat(moment(s).unix());
				}
			},
			type: 'numeric'
		});
		$.tablesorter.addParser({ 
			id: 'formattedNumber', 
			is: function(s) {
				return /^[0-9]?[0-9,\.]*$/.test(s);
			},
			format: function(s) {
				return $.tablesorter.formatFloat(s.replace(/,/g, ''));
			},
			type: 'numeric'
		});
				
		$(document).ready(function() {
			$(".app-navigate").live("click", function(){
				
				var appId = $(this).data("key"),
					appName = $(this).find(".name").text(),
					appImage = $(this).find(".logo").css("background-image"),
					sidebarApp = $("#sidebar-app-select");
							
				if (self.activeAppKey == appId) {
					sidebarApp.removeClass("active");
					$("#app-nav").animate({left: '31px'}, {duration: 500, easing: 'easeInBack'});
					return false;
				}
			
				self.activeAppName = appName;
				self.activeAppKey = appId;
			
				$("#app-nav").animate({left: '31px'}, {duration: 500, easing: 'easeInBack', complete: function(){
					countlyCommon.setActiveApp(appId);
					sidebarApp.find(".text").text(appName);
					sidebarApp.find(".logo").css("background-image", appImage);
					sidebarApp.removeClass("active");
					self.activeView.appChanged();
				}});
			});
			
			$("#sidebar-menu>.item").click(function(){
				var elNext = $(this).next(),
					elNextSubmenuItems = elNext.find(".item"),
					isElActive = $(this).hasClass("active");
			
				if (!isElActive) {
					$(".sidebar-submenu").not(elNext).slideUp();
				}
			
				if (elNext.hasClass("sidebar-submenu") && !(isElActive)) {
					elNext.slideToggle();
				} else {
					$("#sidebar-menu>.item").removeClass("active");
					$(this).addClass("active");
				}
			
				if ($(this).attr("href")) {
					$("#sidebar-app-select").removeClass("disabled");
				}
			});
		
			$(".sidebar-submenu .item").click(function(){
				if ($(this).attr("href") == "#/manage/apps") {
					$("#sidebar-app-select").addClass("disabled");
					$("#sidebar-app-select").removeClass("active");
					if ($("#app-nav").offset().left == 201) {
						$("#app-nav").animate({left: '31px'}, {duration: 500, easing: 'easeInBack'});
					}
				} else {
					$("#sidebar-app-select").removeClass("disabled");
				}
			
				$(".sidebar-submenu .item").removeClass("active");
				$(this).addClass("active");
				$(this).parent().prev(".item").addClass("active");
			});
		
			$("#sidebar-app-select").click(function(){
				
				if ($(this).hasClass("disabled")) {
					return true;
				}
				
				if ($(this).hasClass("active")) {
					$(this).removeClass("active");
				} else {
					$(this).addClass("active");
				}
			
				$("#app-nav").show();
				var left = $("#app-nav").offset().left;
				
				if (left == 201) {
					$("#app-nav").animate({left: '31px'}, {duration: 500, easing: 'easeInBack'});
				} else {
					$("#app-nav").animate({left: '201px'}, {duration: 500, easing: 'easeOutBack'});
				}
				
			});
			
			$("#sidebar-bottom-container .reveal-menu").click(function(){
				$("#sidebar-bottom-container .menu").toggle();
			});
			
			$("#sidebar-bottom-container .item").click(function(){
				$("#sidebar-bottom-container .menu").hide();
			});
		
			$("#account-settings").click(function() {
				CountlyHelpers.popup("#edit-account-details");
				$(".dialog #username").val($("#menu-username").text());
			});
			
			$("#save-account-details:not(.disabled)").live('click', function() {
				var username = $(".dialog #username").val(),
					old_pwd = $(".dialog #old_pwd").val(),
					new_pwd = $(".dialog #new_pwd").val(),
					re_new_pwd = $(".dialog #re_new_pwd").val();
					 
				if (new_pwd != re_new_pwd) {
					$(".dialog #settings-save-result").addClass("red").text("Passwords don't match");
					return true;
				}
				
				$(this).addClass("disabled");
				
				$.ajax({
					type: "POST",
					url: "/user/settings",
					data: {
						"username": username,
						"old_pwd": old_pwd,
						"new_pwd": new_pwd
					},
					success: function(result) {
						var saveResult = $(".dialog #settings-save-result");
					
						if (!result) {
							saveResult.removeClass("green").addClass("red").text("Something is wrong...");
						} else {
							saveResult.removeClass("red").addClass("green").text("Settings saved successfully!");
							$(".dialog #old_pwd").val("");
							$(".dialog #new_pwd").val("");
							$(".dialog #re_new_pwd").val("");
							$("#menu-username").text(username);
						}
					
						$(".dialog #save-account-details").removeClass("disabled");
					}
				});
			});
		});
	
		countlyCommon.setPeriod("30days");
		if (!_.isEmpty(window.gCountlyApps)) {
			for (var appId in gCountlyApps) {
				countlyCommon.setActiveApp(window.gCountlyApps[appId].key);
				break;
			}
		} else {
			$("#new-install-overlay").show();
		}
		
		$.idleTimer(30000);
		var self = this;
		
		$(document).bind("idle.idleTimer", function(){
			clearInterval(self.refreshActiveView);
		});

		$(document).bind("active.idleTimer", function(){
			self.activeView.refresh();
			self.refreshActiveView = setInterval(function() { self.activeView.refresh(); }, 10000);
		});
	},
	pageScript: function() { //scripts to be executed on each view change
		
		$("#month").text(moment().year());
		$("#day").text(moment().format("MMM"));
		
		var self = this;
		$(document).ready(function(){
			$("#sidebar-menu a").removeClass("active");
			
			var currentMenu = $("#sidebar-menu a[href='#"+ Backbone.history.fragment + "']");
			currentMenu.addClass("active");
			
			var subMenu = currentMenu.parent(".sidebar-submenu");
			subMenu.prev(".item").addClass("active");
			
			var selectedDateID = countlyCommon.getPeriod();
			
			if (Object.prototype.toString.call(selectedDateID) !== '[object Array]') {
				$("#" + selectedDateID).addClass("active");
			}
			
			if (!currentMenu.is(":visible")) {
				subMenu.slideDown();
			}
			
			$(".usparkline").peity("bar", { width: "100%", height:"30", colour: "#6BB96E", strokeColour: "#6BB96E", strokeWidth: 2 });
			$(".dsparkline").peity("bar", { width: "100%", height:"30", colour: "#C94C4C", strokeColour: "#C94C4C", strokeWidth: 2 });
				
			$("#date-selector>.button").click(function(){
			
				self.dateFromSelected = null;
				self.dateToSelected = null;
				
				$(".date-selector").removeClass("selected");
				$(this).addClass("selected");
				var selectedPeriod = $(this).attr("id");
				
				if (countlyCommon.getPeriod() == selectedPeriod) {
					return true;
				}
				
				countlyCommon.setPeriod(selectedPeriod);
				
				self.activeView.dateChanged();
				$("#" + selectedPeriod).addClass("active");
				self.pageScript();
			});
			
			$(window).click(function() {
				$( "#date-picker" ).hide();
				$(".cly-select").removeClass("active");
				$(".select-items").hide();
			});
			
			$("#date-picker").click(function(e) {
				e.stopPropagation();
			});
			
			$("#date-picker-button").click(function(e) {
				$( "#date-picker" ).toggle();
				
				var tmpDateToSelected = "",
					tmpDateFromSelected = "";
				
				if (self.dateToSelected) {
					tmpDateToSelected = moment(self.dateToSelected).toDate();
					dateTo.datepicker( "setDate" , moment(tmpDateToSelected).toDate() );
				} else {
					self.dateToSelected = moment().toDate().getTime();
				}
				
				if (self.dateFromSelected) {
					dateFrom.datepicker( "setDate" , moment(self.dateFromSelected).toDate() );
				} else {
					extendDate = moment(dateTo.datepicker( "getDate" )).subtract('days', 30).toDate();
					dateFrom.datepicker( "setDate" , extendDate );
					self.dateFromSelected = moment(dateTo.datepicker( "getDate" )).subtract('days', 30).toDate().getTime();
				}
				
				$("#date-range-text").text(moment(dateFrom.datepicker( "getDate" )).format("MMM Do, YYYY") + " > " + moment(dateTo.datepicker( "getDate" )).format("MMM Do, YYYY"));
				
				e.stopPropagation();
			});
			
			var dateTo = $( "#date-to" ).datepicker({
				numberOfMonths: 1,
				showOtherMonths: true,
				maxDate: moment().toDate(),
				onSelect: function( selectedDate ) {
					var instance = $( this ).data("datepicker"),
						date = $.datepicker.parseDate(instance.settings.dateFormat || $.datepicker._defaults.dateFormat, selectedDate, instance.settings),
						fromLimit = moment(selectedDate).subtract("days", 1).toDate();
					
					dateFrom.datepicker("option", "maxDate", fromLimit);
					self.dateToSelected = moment(date.getTime());
				}
			});
	
			var dateFrom = $( "#date-from" ).datepicker({
				numberOfMonths: 1,
				showOtherMonths: true,
				maxDate: moment().subtract('days', 1).toDate(),
				onSelect: function( selectedDate ) {
					var instance = $(this).data("datepicker"),
						date = $.datepicker.parseDate(instance.settings.dateFormat || $.datepicker._defaults.dateFormat, selectedDate, instance.settings );
					
					dateTo.datepicker("option", "minDate", date);
					self.dateFromSelected = moment(date.getTime());
				}
			});
			
			$("#date-submit").click(function() {
				if (!self.dateFromSelected && !self.dateToSelected) {
					return false;
				}
				
				countlyCommon.setPeriod([self.dateFromSelected, self.dateToSelected]);
				
				self.activeView.dateChanged();
				self.pageScript();
			});
			
			$('.scrollable').slimScroll({
				height: '100%',
				start: 'top',
				wheelStep: 10,
				position: 'right'
			});

			$('.widget-header').noisy({
				intensity: 0.9, 
				size: 50, 
				opacity: 0.04,
				monochrome: true
			});
			
			$(".cly-select").click(function(e) {
				var selectItems = $(this).find(".select-items");
				
				if (!selectItems.length) {
					return false;
				}
				
				if (selectItems.is(":visible")) {
					$(this).removeClass("active");
				} else {
					$(".cly-select").removeClass("active");
					$(".select-items").hide();
					$(this).addClass("active");
				}
				
				$(this).find(".select-items").toggle();
				
				$("#date-picker").hide();
				e.stopPropagation();
			});
			
			$(".select-items .item").click(function() {
				var selectedItem = $(this).parents(".cly-select").find(".text");
				selectedItem.html($(this).html());
				selectedItem.data("value", $(this).data("value"));
			});
		});
	}
});

var app = new AppRouter();
Backbone.history.start();