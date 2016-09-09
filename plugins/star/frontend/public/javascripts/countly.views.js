window.starView = countlyView.extend({
  templateData: {},
  platform:'',
  version:'',
  cumulativeData: {},
  currentTab:'cumulative',
  lineChartSelect:{ star1: true, star2: true, star3: true, star4: true, star5: true},
  beforeRender: function() {
    var self = this;
    return $.when(
      $.get(countlyGlobal["path"]+'/star/templates/star.html'),
      starRatingPlugin.requestPlatformVersion(),
      starRatingPlugin.requestRatingInPeriod()
    ).done(function(result){
      self.template = Handlebars.compile(result[0]);
      self.templateData['platform_version'] = starRatingPlugin.getPlatformVersion();
      self.templateData['rating'] = starRatingPlugin.getRatingInPeriod();
    });
  },

  loadPlatformData: function(){
    $("#platform-list").html('<div data-value="All Platforms" class="platform-option item" data-localize="">All Platforms</div>');
    for(var platform in this.templateData['platform_version']){
      $("#platform-list").append(
        '<div data-value="' + platform +
        '" class="platform-option item" data-localize="">'
        + platform +'</div>'
      );
    };
    var self = this;
    $(".platform-option").on("click", function () {
      $("#Version > div > div.select-inner > div.text-container > div").html("All Versions");
      var value = $(this).data("value");
      if(value === "All Platforms"){
        self.platform = '';
      }else {
        self.platform = value;
      }
      self.loadVersionData();
      self.updateViews();
    });
  },

  loadVersionData: function () {
    var versioinList=[];
    if(this.platform === ''){
      for(var platform in this.templateData['platform_version']){
        var list = this.templateData['platform_version'][platform];
        for(var i = 0; i < list.length; i++){
          if(versioinList.indexOf(list[i]) === -1){
            versioinList.push(list[i]);
          }
        }
      }
    } else {
      versioinList = this.templateData['platform_version'][this.platform];
    }
    $("#version-list").html('<div data-value="All Versions" class="version-option item" data-localize="">All Versions</div>');
    for(var i = 0; i < versioinList.length; i++){
      $("#version-list").append(
        '<div data-value="' + versioinList[i] +
        '" class="version-option item" data-localize="">'
        + versioinList[i] +'</div>'
      );
    };

    var self = this;
    $(".version-option").on("click", function () {
      var value = $(this).data("value");
      if(value == "All Versions" ){
        self.version = '';
      }else{
        self.version = value;
      }
      self.updateViews();
    });
  },

  updateViews: function(){
    var self = this;
    $.when(
      starRatingPlugin.requestPlatformVersion(),
      starRatingPlugin.requestRatingInPeriod(),
      starRatingPlugin.requesPeriod()
    ).done(function(result){
      self.templateData['platform_version'] = starRatingPlugin.getPlatformVersion();
      self.templateData['rating'] = starRatingPlugin.getRatingInPeriod();
      self.calCumulativeData();
      self.calTimeSeriesData();

      if(self.currentTab === 'cumulative'){
        self.renderCumulativeChart();
        self.renderCumulativeTable();
        $('#tableTwo_wrapper').css("display","none");
        $('#tableOne_wrapper').css("display","block");
        $('#big-numbers-container').css("display","none");

      }
      if(self.currentTab === 'time-series'){
        self.renderTimeSeriesTable();
        self.renderTimeSeriesChart();
        $('#tableOne_wrapper').css("display","none");
        $('#tableTwo_wrapper').css("display","block");
        $('#big-numbers-container').css("display","block");
      }
    });

    //this.calCumulativeData();
    //this.calTimeSeriesData();
    //
    //if(this.currentTab === 'cumulative'){
    //  this.renderCumulativeChart();
    //  this.renderCumulativeTable();
    //  $('#tableTwo_wrapper').css("display","none");
    //  $('#tableOne_wrapper').css("display","block");
    //  $('#big-numbers-container').css("display","none");
    //
    //}
    //if(this.currentTab === 'time-series'){
    //  this.renderTimeSeriesTable();
    //  this.renderTimeSeriesChart();
    //  $('#tableOne_wrapper').css("display","none");
    //  $('#tableTwo_wrapper').css("display","block");
    //  $('#big-numbers-container').css("display","block");
    //}
  },

  matchPlatformVersion: function(documentName){
    var regexString = '';
    if(this.platform === ''){
      regexString+='(\\w+)(\\*\\*)';
    }else{
      regexString+= this.platform.toString().toUpperCase() + '(\\*\\*)';
    }
    if(this.version === ''){
      regexString+='(\\w+)(\\S*)(\\w*)(\\*\\*)[1-5]';
    }else{
      regexString+= this.version.toString().toUpperCase() + '(\\*\\*)[1-5]';
    }

    var matchResult = (new RegExp(regexString, 'i')).test(documentName);
    if(matchResult){
      console.log('match:',documentName);
    }else{
      console.log('not match:',documentName);
    }
    return matchResult;
  },
  getPeriodArray: function(){
    var periodArray;
    var periodObject = countlyCommon.getPeriodObj();
    if(parseInt(periodObject.numberOfDays) === 1){
      periodArray = [periodObject.activePeriod];
    }else if(countlyCommon.getPeriod() === 'month'){
        periodArray=starRatingPlugin.getPeriod().currentPeriodArr;
    }else if(periodObject.currentPeriodArr === undefined){
      periodArray = [];
      for(var i = periodObject.periodMin; i <= periodObject.periodMax; i++){
        periodArray.push(periodObject.activePeriod + '.' + i);
      }
    }else{
      periodArray = periodObject.currentPeriodArr
    };
    return periodArray;
  },
  calCumulativeData: function(){
    this.cumulativeData = [
      {count:0, percent:0},
      {count:0, percent:0},
      {count:0, percent:0},
      {count:0, percent:0},
      {count:0, percent:0}
    ];
    var ratingArray = [];
    var result = this.templateData['rating'];
    var periodArray = this.getPeriodArray();

    console.log(periodArray, result,countlyCommon.getPeriodObj());
    for(var i = 0; i < periodArray.length; i++) {
      var dateArray = periodArray[i].split('.');
      var year = dateArray[0];
      var month = dateArray[1];
      var day = dateArray[2];

      if (result[year] && result[year][month] && result[year][month][day]) {
        for (var rating in result[year][month][day]) {
          if (this.matchPlatformVersion(rating)) {
            console.log(year, month, day, rating);
            var rank = (rating.split("**"))[2];
            this.cumulativeData[rank - 1].count += result[year][month][day][rating].c;
            var times = result[year][month][day][rating].c;
            while (times--)
              ratingArray.push(parseInt(rank));
          }
        }
      }
      ;
    }

    var sum = 0;
    this.cumulativeData.forEach(function(star){sum += star.count});
    this.cumulativeData.forEach(function(star){star.percent =(sum === 0) ? "0%" : ((star.count/sum)*100).toFixed(2) + '%'});
    $("#total-rating").html(sum);
    ratingArray.sort();
    console.log("calc cuml:",ratingArray, sum);
    var middle = (sum === 0)?  0 :
                (sum%2 === 1) ? ratingArray[Math.round(sum/2)-1] : (ratingArray[sum/2-1] + ratingArray[sum/2])/2
    $("#midian-rating").html(middle);
  },

  renderCumulativeTable: function(){
    var columnsDefine = [
      { "mData": "rating", sType:"string", "sTitle": "RATING" },
      { "mData": "count", sType:"numeric", "sTitle": "NUMBER OF RATINGS" },
      { "mData": "percentage", sType:"string",  "sTitle": "PERCENTAGE" },
    ];

    var tableData = {
      "aaData": [],
      "aoColumns": columnsDefine,
    };

    for(var i = 0; i < 5; i++){
      tableData.aaData.push({
        rating:this.iconGenerator(i+1),
        count: this.cumulativeData[i].count,
        percentage:this.cumulativeData[i].percent
      })
    }
    console.log(tableData);

    $('#tableOne').dataTable($.extend({}, $.fn.dataTable.defaults, tableData));
  },

  renderCumulativeChart: function (){
    console.log(this.platform, this.version);
    var da = {
      "dp": [{
        "data": [[-1, null], [0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, null],]
      }],
      "ticks": [
        [-1, ""], [0, this.iconGenerator(1)], [1, this.iconGenerator(2)],
        [2, this.iconGenerator(3)], [3, this.iconGenerator(4)],
        [4, this.iconGenerator(5)], [5, ""],
      ]
    };
    for(var i = 1; i <=5; i++){
      da.dp[0].data[i][1] = this.cumulativeData[i-1].count;
    }
    console.log(da.dp);
    countlyCommon.drawGraph(da, "#dashboard-graph", "bar", {colors:["#56a5ec"]});
  },

  iconGenerator: function(times) {
    var result = '';
    if(times && times > 0) {
      while (times--) {
        result += '<i class="fa fa-star star-icon" aria-hidden="true"></i>';
      }
    }
    return result;
  },

  calTimeSeriesData: function(){
    var result = this.templateData['rating'];
    var periodArray = this.getPeriodArray();

    this.templateData['timeSriesData'] = [];
    for(var i = 0; i < periodArray.length; i++){
      var dateArray = periodArray[i].split('.');
      var year = dateArray[0];
      var month = dateArray[1];
      var day = dateArray[2];

      var row = {date: year+"-"+month+"-"+day, 'star1':0,'star2':0,'star3':0,'star4':0,'star5':0};
      if(result[year] && result[year][month] && result[year][month][day]) {
        for (var rating in result[year][month][day]) {
          if (this.matchPlatformVersion(rating)) {
            console.log(year, month, day, rating);
            var rank = (rating.split("**"))[2];
            row["star" + rank] += result[year][month][day][rating].c
          }
        }
      }
      this.templateData['timeSriesData'].push(row);
    };
  },
  renderTimeSeriesTable: function(){


    var columnsDefine = [
      { "mData": "date", sType:"string", "sTitle": "date" },
      { "mData": "star1", sType:"string", "sTitle": this.iconGenerator(1) },
      { "mData": "star2", sType:"string", "sTitle": this.iconGenerator(2) },
      { "mData": "star3", sType:"string", "sTitle": this.iconGenerator(3) },
      { "mData": "star4", sType:"string", "sTitle": this.iconGenerator(4) },
      { "mData": "star5", sType:"string", "sTitle": this.iconGenerator(5) },
    ];


    $('#tableTwo').dataTable($.extend({}, $.fn.dataTable.defaults, {
      "aaData":this.templateData['timeSriesData'],
      "aoColumns": columnsDefine,
    }));
  },
  renderTimeSeriesChart: function(){
    var timeSeriesData = this.templateData['timeSriesData'];
    var graphData =[
      {"data":[],"label":"Star1","color":"#52A3EF"},
      {"data":[],"label":"Star2","color":"#FF8700"},
      {"data":[],"label":"Star3","color":"#0EC1B9"},
      {"data":[],"label":"Star4","color":"#ad41d5"},
      {"data":[],"label":"Star5","color":"#d63b3b"},

    ];
    for(var i = 0; i < timeSeriesData.length; i++){
      graphData[0].data.push([i,timeSeriesData[i].star1]);
      graphData[1].data.push([i,timeSeriesData[i].star2]);
      graphData[2].data.push([i,timeSeriesData[i].star3]);
      graphData[3].data.push([i,timeSeriesData[i].star4]);
      graphData[4].data.push([i,timeSeriesData[i].star5]);
    };
    var renderData = [];
    for(var key in this.lineChartSelect){
      if(this.lineChartSelect[key]){
        renderData.push(graphData[parseInt(key.substring(4))-1]);
      }
    }

    countlyCommon.drawTimeGraph(renderData, "#dashboard-graph");
  },

  renderCommon: function (isRefresh) {
    var self = this;
    if (!isRefresh) {
      $(this.el).html(this.template(this.templateData));


      //add platform && version selector
      this.loadPlatformData();
      this.loadVersionData();

      var self = this;


      var selectFirst = true;
      var self = this;
      //tab select
      $(".widget-content .inner").click(function () {
        $(".big-numbers").removeClass("active");
        $(".big-numbers .select").removeClass("selected");
        $(this).parent(".big-numbers").addClass("active");
        $(this).find('.select').addClass("selected");
        self.currentTab = $(this).parent(".big-numbers").attr('id');
        self.updateViews();
      });
      $("#date-selector").click(function(){
        self.updateViews();
      })

      $(".check").click(function(){
        var classes = $(this).attr('class');
        var id = $(this).attr('id');
        if(classes.indexOf('selected') >= 0){
          $(this).removeClass("selected");
        }else{
          $(this).addClass("selected");
        }
        self.lineChartSelect[id] = !self.lineChartSelect[id];
        self.updateViews();
      })
    };

    this.updateViews();

  },

});


//register views
app.starView = new starView();



app.route("/analytics/star", 'star', function () {
  this.renderWhenReady(this.starView);
});

$( document ).ready(function() {
  var menu = '<a href="#/analytics/star" class="item">'+
    '<div class="logo-icon fa fa-globe"></div>'+
    '<div class="text" data-localize="">Star Rating</div>'+
    '</a>';
  $('#web-type #engagement-submenu').append(menu);
  $('#mobile-type #engagement-submenu').append(menu);

});