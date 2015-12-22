window.ViewsView = countlyView.extend({
    selectedMetric:"u",
    selectedView:null,
    selectedViews:[],
	selectedApps: {all:true},
	selectedCount: 0,
    ids:{},
    lastId:0,
    beforeRender: function() {
			var self = this;
			return $.when($.get(countlyGlobal["path"]+'/views/templates/views.html', function(src){
				self.template = Handlebars.compile(src);
			}), countlyViews.initialize()).then(function () {});
    },
    getProperties: function(metric){
        return {
            "u":jQuery.i18n.map["common.table.total-users"],
            "n":jQuery.i18n.map["common.table.new-users"],
            "t":jQuery.i18n.map["views.total-visits"],
            "d":jQuery.i18n.map["views.duration"],
            "s":jQuery.i18n.map["views.starts"],
            "e":jQuery.i18n.map["views.exits"],
            "b":jQuery.i18n.map["views.bounces"] 
        }
    },
    renderCommon:function (isRefresh) {
        var self = this;
        var data = countlyViews.getData();
        var props = this.getProperties();
        var usage = [];
        
        for(var i in props){
            usage.push({
                    "title":props[i],
                    "id":"view-metric-"+i
                });
        }

        this.templateData = {
            "page-title":jQuery.i18n.map["views.title"],
            "font-logo-class":"fa-eye",
            "active-segmentation": jQuery.i18n.map["views.all-segments"],
            "segmentations": countlyViews.getSegments(),
            "usage":usage
        };

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            
            var columns = [
                { "mData": function(row, type){if(type == "display"){ return row.views+"<div class='color'></div>";} else return row.views;}, sType:"string", "sTitle": jQuery.i18n.map["views.table.view"] , "sClass": "break", "sWidth": "30%"},
                { "mData": "u", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.total-users"] },
                { "mData": "n", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.table.new-users"] },
                { "mData": "t", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["views.total-visits"] },
                { "mData": function(row, type){if(row.d == 0 || row.t == 0) return 0; else return row.d/row.t;}, sType:"formatted-num", "mRender":function(d) { return countlyCommon.timeString(d/60); }, "sTitle": jQuery.i18n.map["views.avg-duration"] },
                { "mData": "s", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["views.starts"] },
                { "mData": "e", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["views.exits"] },
                { "mData": "b", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["views.bounces"] }
            ];
            
            if(typeof addDrill != "undefined"){
                addDrill("up.lv");
                columns.push({ "mData": function(row, type){return '<a href="#/analytics/action-map/'+row.views+'" class="icon-button green btn-header btn-view-map" data-localize="views.action-map" style="margin:0px; padding:2px;">Action Map</a>';}, sType:"string", "sTitle": jQuery.i18n.map["views.action-map"]  });
            }

            this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": data.chartData,
                "fnRowCallback": function( nRow, aData, iDisplayIndex, iDisplayIndexFull ) {
                    if(!self.selectedView){
                        self.selectedView = aData.views;
                        self.selectedViews.push(self.selectedView);
                    }

                    if(_.contains(self.selectedViews, aData.views))
                        $(nRow).addClass("selected");
                    
                    if(!self.ids[aData.views]){
                        self.ids[aData.views] = "view_"+self.lastId;
                        self.lastId++;
                    }
                    $(nRow).attr("id", self.ids[aData.views]);
                },
                "aoColumns": columns
            }));

            $(".d-table").stickyTableHeaders();
            $(".dataTable-bottom").append("<div clas='dataTables_info' style='float: right; margin-top:2px; margin-right: 10px;'>"+jQuery.i18n.map["views.maximum-items"]+" ("+countlyCommon.GRAPH_COLORS.length+")</div>")
            
            $('.views-table tbody').on("click", "tr", function (event){
                var row = $(this);
                
                self.selectedView = row.find("td").first().text();
                if(_.contains(self.selectedViews, self.selectedView)){
                    var index = self.selectedViews.indexOf(self.selectedView);
                    self.selectedViews.splice(index, 1);
                    row.removeClass("selected");
                    row.find(".color").css("background-color", "transparent");
                }
                else if(self.selectedViews.length < countlyCommon.GRAPH_COLORS.length){
                    self.selectedViews.push(self.selectedView);
                    row.addClass("selected");
                }
                if(self.selectedViews.length == 0)
                    $("#empty-graph").show();
                else
                    $("#empty-graph").hide();
                self.drawGraph();
            });
            
            $("#view-metric-"+this.selectedMetric).parents(".big-numbers").addClass("active");
            
            $(".widget-content .inner").click(function () {
                $(".big-numbers").removeClass("active");
                $(".big-numbers .select").removeClass("selected");
                $(this).parent(".big-numbers").addClass("active");
                $(this).find('.select').addClass("selected");
            });
            
            $(".segmentation-option").on("click", function () {
                countlyViews.reset();
				countlyViews.setSegment($(this).data("value"));
                self.refresh();
			});
    
            $(".big-numbers .inner").click(function () {
                var elID = $(this).find('.select').attr("id").replace("view-metric-", "");
    
                if (self.selectedMetric == elID) {
                    return true;
                }
    
                self.selectedMetric = elID;
                self.drawGraph();
            });
            
            this.drawGraph();
        }
    },
    drawGraph: function(){
        var props = this.getProperties();
        var dp = [];
        for(var i = 0;  i < this.selectedViews.length; i++){
            var color = countlyCommon.GRAPH_COLORS[i];
            var data = countlyViews.getChartData(this.selectedViews[i], this.selectedMetric, props[this.selectedMetric]).chartDP;
            data[1].color = color;
            $("#"+this.ids[this.selectedViews[i]]+" .color").css("background-color", color);
            if(this.selectedViews.length == 1){
                var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
                data[0].color = "rgba("+parseInt(result[1], 16)+","+parseInt(result[2], 16)+","+parseInt(result[3], 16)+",0.5"+")";
                dp.push(data[0])
            }
            dp.push(data[1]);
        }
        countlyCommon.drawTimeGraph(dp, "#dashboard-graph");
    },
    refresh:function () {
        var self = this;
        $.when(countlyViews.refresh()).then(function () {
            if (app.activeView != self) {
                return false;
            }
            self.renderCommon(true);

            newPage = $("<div>" + self.template(self.templateData) + "</div>");
        
            $(self.el).find(".dashboard-summary").replaceWith(newPage.find(".dashboard-summary"));

            var data = countlyViews.getData();
            CountlyHelpers.refreshTable(self.dtable, data.chartData);
            self.drawGraph();
        });
    }
});

window.ViewFrequencyView = countlyView.extend({
    beforeRender: function() {
        return $.when(countlyUser.initialize()).then(function () {});
    },
    renderCommon:function (isRefresh) {
        var durationData = countlyViews.getViewFrequencyData();

        this.templateData = {
            "page-title":jQuery.i18n.map["views.view-frequency"],
            "font-logo-class":"fa-eye"
        };

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));

            countlyCommon.drawGraph(durationData.chartDP, "#dashboard-graph", "bar");

            this.dtable = $('.d-table').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": durationData.chartData,
                "aoColumns": [
                    { "mData": "vc", sType:"view-frequency", "sTitle": jQuery.i18n.map["views.view-frequency"] },
                    { "mData": "t", sType:"formatted-num", "mRender":function(d) { return countlyCommon.formatNumber(d); }, "sTitle": jQuery.i18n.map["common.number-of-users"] },
                    { "mData": "percent", "sType":"percent", "sTitle": jQuery.i18n.map["common.percent"] }
                ]
            }));

            $(".d-table").stickyTableHeaders();
            
        }
    },
    refresh:function () {
        var self = this;
        $.when(countlyUser.initialize()).then(function () {
            if (app.activeView != self) {
                return false;
            }

            var durationData = countlyViews.getViewFrequencyData();
            countlyCommon.drawGraph(durationData.chartDP, "#dashboard-graph", "bar");
            CountlyHelpers.refreshTable(self.dtable, durationData.chartData);
        });
    }
});

window.ActionMapView = countlyView.extend({
    actionType: "",
    curSegment: 0,
    beforeRender: function() {
        var self = this;
        return $.when($.get(countlyGlobal["path"]+'/views/templates/actionmap.html', function(src){
			self.template = Handlebars.compile(src);
		}), countlyViews.loadActionsData(this.view)).then(function () {});
    },
    getData: function(data){
        var heat = [];
        var point;
        var width = $("#view-canvas-map").prop('width');
        var height = $("#view-canvas-map").prop('height');
        for(var i = 0; i < data.length; i++){
            point = data[i].sg;
            if(point.type == this.actionType)
                heat.push([parseInt((point.x/point.width)*width), parseInt((point.y/point.height)*height), data[i].c])
        }
        return heat;
    },
    getMaxHeight: function(data){
        var width = $("#view-map").width();
        var lowest = {w:0, h:0};
        var highest = {w:100000, h:5000};
        for(var i = 0; i < data.length; i++){
            if(width == data[i].sg.width)
                return data[i].sg.height;
            else if(width > data[i].sg.width && lowest.w < data[i].sg.width){
                lowest.w = data[i].sg.width;
                lowest.h = data[i].sg.height;
            }
        }

        if(lowest.h > 0)
            return lowest.h;
        
        for(var i = 0; i < data.length; i++){
            if(width < data[i].sg.width && highest.w > data[i].sg.width){
                highest.w = data[i].sg.width;
                highest.h = data[i].sg.height;
            }
        }
        
        return highest.h;
    },
    getResolutions: function(data){
        var res = ["Normal"];
        var exist = {};
        for(var i = 0; i < data.length; i++){
            if(!exist[data[i].sg.width+" x "+data[i].sg.height]){
                exist[data[i].sg.width+" x "+data[i].sg.height] = true;
                res.push(data[i].sg.width+" x "+data[i].sg.height);
            }
        }
        return res;
    },
    resize: function(){
        $('#view-canvas-map').prop('width', $("#view-map").width());
        $('#view-canvas-map').prop('height', $("#view-map").height());
        if(this.map)
            this.map.resize();
    },
    loadIframe: function(){
        var self = this;
        var segments = countlyViews.getActionsData().domains;
        var url = "http://"+segments[self.curSegment]+self.view;
        countlyViews.testUrl(url, function(result){
            if(result)
                $("#view-map iframe").attr("src", url);
            else{
                self.curSegment++;
                if(segments[self.curSegment]){
                    self.loadIframe();
                }
                else{
                    CountlyHelpers.alert(jQuery.i18n.map["views.cannot-load"], "red");
                }
            }
        });
    },
    renderCommon:function (isRefresh) {
        var data = countlyViews.getActionsData();
        this.actionType = data.types[0] || jQuery.i18n.map["views.select-action-type"];
        var segments = countlyViews.getSegments();
        var self = this;
        this.templateData = {
            "page-title":jQuery.i18n.map["views.action-map"],
            "font-logo-class":"fa-eye",
            "first-type":this.actionType,
            "active-segmentation": jQuery.i18n.map["views.all-segments"],
            "segmentations": segments,
            "data":data
        };

        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            $("#view-map").height(this.getMaxHeight(data.data));
            this.resize();
            this.loadIframe();
            this.map = simpleheat("view-canvas-map");
            this.map.data(this.getData(data.data));
            this.map.radius(50, 100);
            this.map.draw();
            
            $("#date-selector").after('<a class="icon-button light btn-header btn-back-view" data-localize="views.back"><i class="fa fa-chevron-left"></i> Back</a>');
            app.localize();
            $('.btn-back-view').off('click').on('click', function(){
                window.location.hash = "/analytics/views";
            });
            
            $("#action-map-type .segmentation-option").on("click", function () {
				self.actionType = $(this).data("value");
                self.refresh();
			});
            
            $("#action-map-resolution .segmentation-option").on("click", function () {
                switch ($(this).data("value")) {
                    case "Normal":
                        $("#view-map").width("100%");
                        $("#view-map").height(4500);
                        $("#view-map").prependTo("#view-map-container");
                        break;
                    case "Fullscreen":
                        $("#view-map").width("100%");
                        $("#view-map").height(4500);
                        $("#view-map").prependTo(document.body);
                        break;
                    default:
                        var parts = $(this).data("value").split(" x ");
                        $("#view-map").width(parts[0]);
                        $("#view-map").height(parts[1]);
                        $("#view-map").prependTo("#view-map-container");
                }
				self.resize();
                self.refresh();
			});
            
            $("#view-segments .segmentation-option").on("click", function () {
                countlyViews.reset();
				countlyViews.setSegment($(this).data("value"));
                self.refresh();
			});
        }
    },
    refresh:function () {
        var self = this;
        $.when(countlyViews.loadActionsData(this.view)).then(function () {
            if (app.activeView != self) {
                return false;
            }
            self.renderCommon(true);
            var data = countlyViews.getActionsData();
            self.map.clear();
            self.map.data(self.getData(data.data));
            self.map.draw();
        });
    }
});
//register views
app.viewsView = new ViewsView();
app.viewFrequencyView = new ViewFrequencyView();
app.actionMapView = new ActionMapView();

app.route("/analytics/views", 'views', function () {
	this.renderWhenReady(this.viewsView);
});

app.route("/analytics/view-frequency", 'views', function () {
	this.renderWhenReady(this.viewFrequencyView);
});

app.route("/analytics/action-map/*view", 'views', function (view) {
    this.actionMapView.view = view;
	this.renderWhenReady(this.actionMapView);
});

$( document ).ready(function() {
    if(!production){
        CountlyHelpers.loadJS("views/javascripts/simpleheat.js");
    }
    jQuery.fn.dataTableExt.oSort['view-frequency-asc']  = function(x, y) {
        x = countlyViews.getFrequencyIndex(x);
        y = countlyViews.getFrequencyIndex(y);

        return ((x < y) ? -1 : ((x > y) ?  1 : 0));
    };

    jQuery.fn.dataTableExt.oSort['view-frequency-desc']  = function(x, y) {
        x = countlyViews.getFrequencyIndex(x);
        y = countlyViews.getFrequencyIndex(y);

        return ((x < y) ?  1 : ((x > y) ? -1 : 0));
    };
	var menu = '<a href="#/analytics/views" class="item">'+
		'<div class="logo-icon fa fa-eye"></div>'+
		'<div class="text" data-localize="views.title"></div>'+
	'</a>';
	$('#web-type #analytics-submenu').append(menu);
	$('#mobile-type #analytics-submenu').append(menu);
    
    var menu = '<a href="#/analytics/view-frequency" class="item">'+
		'<div class="logo-icon fa fa-eye"></div>'+
		'<div class="text" data-localize="views.view-frequency"></div>'+
	'</a>';
	$('#web-type #engagement-submenu').append(menu);
	$('#mobile-type #engagement-submenu').append(menu);
});