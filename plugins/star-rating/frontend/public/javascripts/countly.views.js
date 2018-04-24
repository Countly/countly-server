window.starView = countlyView.extend({
    /**
     * this variable contains the infos that render view required.
     * @type {object}
     */
    initialize: function() {
        if(!production){
            //For color picker
            CountlyHelpers.loadJS("star-rating/javascripts/jquery.colorpicker.js");
            CountlyHelpers.loadCSS("star-rating/stylesheets/jquery.colorpicker.css");
        }
    },
    templateData: {
        "page-title": jQuery.i18n.map["star.menu-title"],
        platform_version: null,
        rating: null,
        timeSeriesData: null
    },
    platform: '',
    version: '',
    rating: '',
    step:1,
    feedbackWidget: {
        _id:"",
        popup_header_text:'Leave us a feedback',
        popup_comment_callout:'Add comment',
        popup_email_callout:'Contact me with e-mail',
        popup_button_callout:'Submit feedback',
        popup_thanks_message:'Thank you for your feedback.',
        trigger_position:'mleft',
        trigger_bg_color:'#ebebeb',
        trigger_font_color:'#fff',
        trigger_button_text:'Feedback',
        target_devices:[],
        target_pages:[],
        target_page:'all',
        is_active:false
    },
    currentModal:'popup',
    cumulativeData: {},
    currentTab: 'cumulative',
    lineChartSelect: { star1: true, star2: true, star3: true, star4: true, star5: true},
    beforeRender: function () {
        var self = this;
        // will load template, platform and version, period's rating data
        return $.when(
            $.get(countlyGlobal["path"] + '/star-rating/templates/star.html'),
            starRatingPlugin.requestPlatformVersion(),
            starRatingPlugin.requestRatingInPeriod(),
            starRatingPlugin.requesPeriod(),
            starRatingPlugin.requestFeedbackData(),
            starRatingPlugin.requestFeedbackWidgetsData()
        ).done(function (result) {
            self.template = Handlebars.compile(result[0]);
            self.templateData['platform_version'] = starRatingPlugin.getPlatformVersion();
            self.templateData['rating'] = starRatingPlugin.getRatingInPeriod();
        });
    },

    /**
     * This is for render platform dropdown select view.
     * @namespace starView
     * @method loadPlatformData
     * @param {}
     * @return {null}
     */
    loadPlatformData: function () {
        $("#platform-list").html('<div data-value="All Platforms" class="platform-option item" data-localize="star.all-platforms">' + jQuery.i18n.map['star.all-platforms'] + '</div>');

        for (var platform in this.templateData['platform_version']) {
            $("#platform-list").append('<div data-value="' + platform + '" class="platform-option item" data-localize="">' + platform + '</div>');
        }

        var self = this;
        $(".platform-option").on("click", function () {
            $("#version-selector").text(jQuery.i18n.map['star.all-app-versions']);
            self.version = '';

            var value = $(this).data("value");
            if (value === "All Platforms") {
                self.platform = '';
            } else {
                self.platform = value;
            }
            self.loadVersionData();
            self.updateViews();
        });
    },
    /**
     * This is for render rating dropdown select view.
     * @namespace starView
     * @method loadRatingData
     * @param {}
     * @return {null}
     */
    loadRatingData: function() {
        this.templateData['rating_options'] = [{"val":1,"title":"Terrible"},{"val":2,"title":"Bad"},{"val":3,"title":"Okay"},{"val":4,"title":"Good"},{"val":5,"title":"Awesome"}]
        $("#rating-list").html('<div data-value="All Ratings" class="platform-option item" data-localize="star.all-ratings">' + jQuery.i18n.map['star.all-ratings'] + '</div>');
        var index = 0;
        this.templateData['rating_options'].forEach(function(rating) {
            $("#rating-list").prepend('<div data-value="' + rating.val + '" class="platform-option item" data-localize=""><img src="/images/star-rating/'+index+'_color.svg" class="rating-smiley-icon"><span class="rating-title-in-dropdown">'+ rating.title + '</span></div>');
            index++;
        });

        var self = this;
        $(".rating-option").on("click", function () {
            $("#rating-selector").text(jQuery.i18n.map['star.all-ratings']);
            self.version = '';

            var value = $(this).data("value");
            if (value === "All Ratings") {
                self.rating = '';
            } else {
                self.rating = value;
            }
            self.updateViews();
        });
    },
    /**
     * This is for render version dropdown select view.
     * @namespace starView
     * @method loadVersionData
     * @param {}
     * @return {null}
     */
    loadVersionData: function () {
        var versioinList = [];
        if (this.platform === '') {
            for (var platform in this.templateData['platform_version']) {
                var list = this.templateData['platform_version'][platform];

                for (var i = 0; i < list.length; i++) {
                    if (versioinList.indexOf(list[i]) === -1) {
                        versioinList.push(list[i]);
                    }
                }
            }
        } else {
            versioinList = this.templateData['platform_version'][this.platform];
        }

        $("#version-list").html('<div data-value="All Versions" class="version-option item" data-localize="star.all-app-versions">' + jQuery.i18n.map['star.all-app-versions'] + '</div>');

        for (var i = 0; i < versioinList.length; i++) {
            var versionShow = versioinList[i].replace(/:/g, ".");
            $("#version-list").append('<div data-value="' + versioinList[i] + '" class="version-option item" data-localize="">' + versionShow + '</div>');
        }

        var self = this;
        $(".version-option").on("click", function () {
            var value = $(this).data("value");
            if (value == "All Versions") {
                self.version = '';
            } else {
                self.version = value;
            }
            self.updateViews();
        });
    },


    /**
     * This is update chart and table base on starView.currentTab's value.
     * @namespace starView
     * @method updateViews
     * @param {boolean} isRefresh
     * @return {null}
     */
    updateViews: function (isRefresh) {
        var self = this;
        self.templateData['platform_version'] = starRatingPlugin.getPlatformVersion();
        self.templateData['rating'] = starRatingPlugin.getRatingInPeriod();
        self.calCumulativeData();
        self.calTimeSeriesData();
        self.renderCommentsTable();

        if (self.currentTab === 'cumulative') {
            self.renderCumulativeChart();
            self.renderCumulativeTable(isRefresh);
            $('#tableTwo_wrapper').css("display", "none");
            $('#tableOne_wrapper').css("display", "block");
            $('#big-numbers-container').css("display", "none");
        }

        if (self.currentTab === 'time-series') {
            self.renderTimeSeriesTable(isRefresh);
            self.renderTimeSeriesChart();
            $('#tableOne_wrapper').css("display", "none");
            $('#tableTwo_wrapper').css("display", "block");
            $('#big-numbers-container').css("display", "block");
        }
    },

    /**
     * This is for regex detection of the document is match currently platform and version selected or not
     *
     * @namespace starView
     * @method matchPlatformVersion
     * @param {string} documentName, format is '{platform}**{version}**{rating}'(like "IOS**2.3**4")
     * @return {boolean} matchResult
     */
    matchPlatformVersion: function (documentName) {
        var regexString = '';

        if (this.platform === '') {
            regexString += '(\\w+)(\\*\\*)';
        } else {
            regexString += this.platform.toString().toUpperCase() + '(\\*\\*)';
        }

        if (this.version === '') {
            regexString += '(\\w+)(\\S*)(\\w*)(\\*\\*)[1-5]';
        } else {
            regexString += this.version.toString().toUpperCase() + '(\\*\\*)[1-5]';
        }

        return (new RegExp(regexString, 'i')).test(documentName);
    },

    /**
     * This is for return date info like "2016.09.01" in period as array.
     * For chart and table rendering.
     * @namespace starView
     * @method getPeriodArray
     * @param {}
     * @return {Array} periodArray.
     */
    getPeriodArray: function () {
        var periodArray = [];
        var periodObject = countlyCommon.getPeriodObj();

        if (parseInt(periodObject.numberOfDays) === 1) {
            periodArray = [periodObject.activePeriod];
        } else if (countlyCommon.getPeriod() === 'month') {
            periodArray = starRatingPlugin.getPeriod().currentPeriodArr;
        } else if (periodObject.currentPeriodArr === undefined) {
            periodArray = [];
            for (var i = periodObject.periodMin; i <= periodObject.periodMax; i++) {
                periodArray.push(periodObject.activePeriod + '.' + i);
            }
        } else {
            periodArray = periodObject.currentPeriodArr
        }

        return periodArray;
    },
    getFeedbackData: function () {
        return starRatingPlugin.getFeedbackData();
    },
    getFeedbackWidgetsData: function () {
        return starRatingPlugin.getFeedbackWidgetsData();
    },
    /**
     * This is for cumulative view data calc
     * call before "renderCumulativeTable" and  "renderCumulativeChart"
     * @namespace starView
     * @method calCumulativeData
     * @param {}
     * @return {}
     */
    calCumulativeData: function () {
        this.cumulativeData = [
            {count: 0, percent: 0},
            {count: 0, percent: 0},
            {count: 0, percent: 0},
            {count: 0, percent: 0},
            {count: 0, percent: 0}
        ];

        var ratingArray = [];
        var result = this.templateData['rating'];
        var periodArray = this.getPeriodArray();

        for (var i = 0; i < periodArray.length; i++) {
            var dateArray = periodArray[i].split('.');
            var year = dateArray[0];
            var month = dateArray[1];
            var day = dateArray[2];

            if (result[year] && result[year][month] && result[year][month][day]) {
                for (var rating in result[year][month][day]) {
                    if (this.matchPlatformVersion(rating)) {
                        var rank = (rating.split("**"))[2];
                        this.cumulativeData[rank - 1].count += result[year][month][day][rating].c;
                        var times = result[year][month][day][rating].c;
                        while (times--)
                            ratingArray.push(parseInt(rank));
                    }
                }
            }
        }

        var sum = 0,
            middle = 0;

        this.cumulativeData.forEach(function (star) {
            sum += star.count
        });

        this.cumulativeData.forEach(function (star) {
            var tmpPercent = (sum === 0) ? 0 : ((star.count / sum) * 100).toFixed(1);
            star.percent = "<div class='percent-bar' style='width:" + (2 * tmpPercent) + "px;'></div>" + tmpPercent + "%";
        });

        $("#total-rating").html(sum);
        ratingArray.sort();

        if (sum === 0) {
            middle = 0;
        } else if (sum % 2 === 1) {
            middle = ratingArray[Math.round(sum / 2) - 1]
        } else {
            middle = (ratingArray[sum / 2 - 1] + ratingArray[sum / 2]) / 2;
        }

        middle = (middle * 1.0).toFixed(2);
        $("#median-rating").html(middle);
    },
    renderCumulativeTable: function (isRefresh) {
        var data = [];

        for (var i = 0; i < 5; i++) {
            data.push({
                rating: this.iconGenerator(i + 1),
                count: this.cumulativeData[i].count,
                percentage: this.cumulativeData[i].percent
            })
        }

        if (isRefresh) {
            CountlyHelpers.refreshTable($('#tableOne').dataTable(), data);
        } else {
            var columnsDefine = [
                { "mData": "rating", sType: "string", "sTitle": jQuery.i18n.map["star.rating"] },
                {   "mData": "count",
                    "sType": "numeric",
                    "sTitle": jQuery.i18n.map["star.number-of-ratings"],
                    "mRender":function(d) { return countlyCommon.formatNumber(d);}
                },
                { "mData": "percentage", sType: "percent", "sTitle": jQuery.i18n.map["star.percentage"]}
            ];

            var tableData = {
                "aaData": data,
                "aoColumns": columnsDefine
            };

            $('#tableOne').dataTable($.extend({}, $.fn.dataTable.defaults, tableData));
            $('#tableOne').dataTable().fnSort([[2, 'desc']]);
        }
    },
    renderCumulativeChart: function () {
        var da = {
            "dp": [
                {
                    "data": [
                        [-1, null],
                        [0, 0],
                        [1, 0],
                        [2, 0],
                        [3, 0],
                        [4, 0],
                        [5, null]
                    ]
                }
            ],
            "ticks": [
                [-1, ""],
                [0, this.iconGenerator(1)],
                [1, this.iconGenerator(2)],
                [2, this.iconGenerator(3)],
                [3, this.iconGenerator(4)],
                [4, this.iconGenerator(5)],
                [5, ""]
            ]
        };
        var colors = ["#ffa183","#ffc385","#ffd885","#ffd88d","#ffd176"];
        for (var i = 1; i <= 5; i++) {
            da.dp[0].data[i][1] = this.cumulativeData[i - 1].count;
        }
        countlyCommon.drawGraph(da, "#dashboard-graph", "bar", {colors:["#ffa183","#ffc385","#ffd885","#ffd88d","#ffd176"]});
    },
    iconGenerator: function (times) {
        var result = '';
        var starName = '';
        switch(times){
            case 1:
                starName = jQuery.i18n.map["star.one-star"]
                break;
            case 2:
                starName = jQuery.i18n.map["star.two-star"]
                break;
            case 3:
                starName = jQuery.i18n.map["star.three-star"]
                break;
            case 4:
                starName = jQuery.i18n.map["star.four-star"]
                break;
            case 5:
                starName = jQuery.i18n.map["star.five-star"]
                break;
        }
        var rating_strings = ["Terrible","Bad","Okay","Nice","Awesome"];
        var typeName = '<a style="font-size: 1px; display:none;">' + starName + '</a>';
        if (times && times > 0) {
            result += '<span><img class="little-feedback-icon" src="/images/star-rating/'+(times-1)+'_color.svg"></span><span class="star-rating-icon-title">' + rating_strings[times-1] + '</span>';
        }
        result += typeName;
        return result;
    },
    /**
     * This is for TimeSeries view data calc
     * call before "renderTimeSeriesTable" and  "renderTimeSeriesChart"
     * @namespace starView
     * @method calCumulativeData
     * @param {}
     * @return {}
     */
    calTimeSeriesData: function () {
        var result = this.templateData['rating'];
        var periodArray = this.getPeriodArray();

        this.templateData['timeSeriesData'] = [];
        var currentYear = (new Date()).getFullYear();
        var dateFormat = 'MMM, YYYY';
        if (periodArray.length > 0 && (moment(periodArray[0], "YYYY.M.D").isoWeekYear() === currentYear)) {
            dateFormat = 'D MMM';
        }

        var rows = {};
        var seriesChartList = []; //GroupByDate
        for (var i = 0; i < periodArray.length; i++) {
            var dateArray = periodArray[i].split('.');
            var year = dateArray[0];
            var month = dateArray[1];
            var day = dateArray[2];
            var seriesChart = {
                'star1': 0,
                'star2': 0,
                'star3': 0,
                'star4': 0,
                'star5': 0
            }

            var LocalDateDisplayName = moment(periodArray[i], "YYYY.M.D").format(dateFormat);
            if(!rows[LocalDateDisplayName]){
                rows[LocalDateDisplayName] = {
                    'date': LocalDateDisplayName,
                    'star1': 0,
                    'star2': 0,
                    'star3': 0,
                    'star4': 0,
                    'star5': 0
                };
            }

            if (result[year] && result[year][month] && result[year][month][day]) {
                for (var rating in result[year][month][day]) {
                    if (this.matchPlatformVersion(rating)) {
                        var rank = (rating.split("**"))[2];
                        rows[LocalDateDisplayName]["star" + rank] += result[year][month][day][rating].c
                        seriesChart["star" + rank] += result[year][month][day][rating].c;
                    }
                }
            }
            seriesChartList.push(seriesChart);
        }
        this.templateData['seriesChartList'] = seriesChartList;

        for(var dateDisplayName in rows ){
            this.templateData['timeSeriesData'].push(rows[dateDisplayName]);
        }
        return this.templateData['timeSeriesData'];
    },
    renderTimeSeriesTable: function (isRefresh) {
        if (isRefresh) {
            CountlyHelpers.refreshTable($('#tableTwo').dataTable(), this.templateData['timeSeriesData']);
        } else {
            var columnsDefine = [
                { "mData": "date", "sType": "customDate", "sTitle": jQuery.i18n.map["star.date"] },
                {
                    "mData": "star1",
                    sType: "numeric",
                    "sTitle": this.iconGenerator(1),
                    "mRender": function (d) {return countlyCommon.formatNumber(d);}
                },
                {
                    "mData": "star2",
                    sType: "numeric",
                    "sTitle": this.iconGenerator(2),
                    "mRender": function (d) {return countlyCommon.formatNumber(d);}
                },
                {
                    "mData": "star3",
                    sType: "numeric",
                    "sTitle": this.iconGenerator(3),
                    "mRender": function (d) {return countlyCommon.formatNumber(d);}
                },
                {
                    "mData": "star4",
                    sType: "numeric",
                    "sTitle": this.iconGenerator(4),
                    "mRender": function (d) {return countlyCommon.formatNumber(d);}
                },
                {
                    "mData": "star5",
                    sType: "numeric",
                    "sTitle": this.iconGenerator(5),
                    "mRender": function (d) {return countlyCommon.formatNumber(d);}
                },
            ];

            $('#tableTwo').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": this.templateData['timeSeriesData'],
                "aoColumns": columnsDefine
            }));

            $('#tableTwo').dataTable().fnSort([[0, 'desc']]);
            $('#tableTwo').stickyTableHeaders();
        }
    },
    renderTimeSeriesChart: function () {
        var timeSeriesData = this.templateData['timeSeriesData'];
        var seriesChartList= this.templateData['seriesChartList'];
        var graphData = [
            {"data": [], "label": jQuery.i18n.map["star.one-star"], "color": "#52A3EF"},
            {"data": [], "label": jQuery.i18n.map["star.two-star"], "color": "#FF8700"},
            {"data": [], "label": jQuery.i18n.map["star.three-star"], "color": "#0EC1B9"},
            {"data": [], "label": jQuery.i18n.map["star.four-star"], "color": "#ad41d5"},
            {"data": [], "label": jQuery.i18n.map["star.five-star"], "color": "#d63b3b"}
        ];

        var period = countlyCommon.getPeriod();
        var bucket = null;
        var overrideBucket = false;
        var chartData = seriesChartList;
        if (period === 'yesterday' || period === 'hour' || countlyCommon.getPeriodObj().numberOfDays == 1) {
            bucket = 'daily';
            overrideBucket = true;
        }

        if(period === 'month'){
            bucket = null;
            chartData = timeSeriesData;
        }

        for (var i = 0; i < chartData.length; i++) {
            graphData[0].data.push([i, chartData[i].star1]);
            graphData[1].data.push([i, chartData[i].star2]);
            graphData[2].data.push([i, chartData[i].star3]);
            graphData[3].data.push([i, chartData[i].star4]);
            graphData[4].data.push([i, chartData[i].star5]);
        }

        var renderData = [];
        for (var key in this.lineChartSelect) {
            if (this.lineChartSelect[key]) {
                renderData.push(graphData[parseInt(key.substring(4)) - 1]);
            }
        }

        return countlyCommon.drawTimeGraph(renderData, "#dashboard-graph", bucket, overrideBucket);
    },
    renderCommentsTable: function(isRefresh) {
        this.templateData['commentsData'] = this.getFeedbackData();
        if (isRefresh) {
            CountlyHelpers.refreshTable($('#tableThree').dataTable(), this.templateData['commentsData']);
        } else {
            var columnsDefine = [
                {
                    "mData": "rating",
                    sType: "string",
                    "sTitle": "RATING",
                    "mRender": function (d) {
                        var ratings = ["<span class='in-table-smiley-wrapper'><img src='/images/star-rating/1_color.svg' class='table-detail-rating-img'></span><span class='in-table-smiley-text-wrapper'>Terrible</span>","<span class='in-table-smiley-wrapper'><img src='/images/star-rating/2_color.svg' class='table-detail-rating-img'></span><span class='in-table-smiley-text-wrapper'>Bad</span>","<span class='in-table-smiley-wrapper'><img src='/images/star-rating/3_color.svg' class='table-detail-rating-img'></span><span class='in-table-smiley-text-wrapper'>Okay</span>","<span class='in-table-smiley-wrapper'><img src='/images/star-rating/3_color.svg' class='table-detail-rating-img'></span><span class='in-table-smiley-text-wrapper'>Good</span>","<span class='in-table-smiley-wrapper'><img src='/images/star-rating/4_color.svg' class='table-detail-rating-img'></span><span class='in-table-smiley-text-wrapper'>Awesome</span>"];
                        return ratings[d-1];
                    }
                },
                {
                    "mData": "comment",
                    sType: "string",
                    "sTitle": "COMMENT"
                },
                {
                    "mData": "email",
                    sType: "string",
                    "sTitle": "E-MAIL"
                },
                {
                    "mData": "created_at",
                    sType: "date",
                    "sTitle": "TIME",
                    "mRender": function(d) {return moment(d).format('ddd, DD MMM YYYY HH:MM:SS');}
                }
            ];

            $('#tableThree').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": this.templateData['commentsData'],
                "aoColumns": columnsDefine
            }));

            $('#tableThree').dataTable().fnSort([[0, 'desc']]);
            //$('#tableThree').stickyTableHeaders();
        }
    },
    renderFeedbacksTable: function(isRefresh) {
        this.templateData['widgetsData'] = this.getFeedbackWidgetsData();
        if (isRefresh) {
            CountlyHelpers.refreshTable($('#tableFour').dataTable(), this.templateData['widgetsData']);
        } else {
            var columnsDefine = [
                {
                    "mData": function (row) {
                        if (row.popup_header_text.length > 15) {
                            return row.popup_header_text.substr(0, 15) + '..';
                        } else {
                            return row.popup_header_text;   
                        }
                    } ,
                    sType: "string",
                    "sTitle": "NAME"
                },
                {
                    "mData": "trigger_position",
                    sType: "string",
                    "sTitle": "LOCATION"
                },
                {
                    "mData":function (row) {
                        var target_pages = "";
                        eval(row.target_pages).forEach(function(page) { target_pages += " " + page;})
                        return target_pages.trim();
                    },
                    sType: "string",
                    "sTitle":"TARGET PAGES"
                },
                {
                    "mData":function (row) {
                        var target_devices = "";
                        eval(row.target_devices).forEach(function(device) { target_devices += " " + device;})
                        return target_devices.trim();
                    },
                    sType: "string",
                    "sTitle":"TARGET DEVICES"
                },
                {
                    "sTitle": "STATUS",
                    "mData": function (row) {
                        var disabled = (!row.is_active) ? 'disabled' : '';
                        var input = '<div class="on-off-switch ' + disabled + '">';

                        if (row.is_active) {
                            input += '<input type="checkbox" class="on-off-switch-checkbox" id="widget-' + row._id + '" checked ' + disabled + '>';
                        } else {
                            input += '<input type="checkbox" class="on-off-switch-checkbox" id="widget-' + row._id + '" ' + disabled + '>';
                        }

                        input += '<label class="on-off-switch-label" for="plugin-' + row._id + '"></label>';
                        input += '<span class="text">' + 'Enable' + '</span>';

                        return input;
                    },
                    "sType": "string", 
                    "sTitle": "STATUS"
                }
            ];

            columnsDefine.push({
                "mData": function (row) {
                    return "<div class='options-item'>" +
                        "<div class='edit'></div>" +
                        "<div class='edit-menu'>" +
                        "<div class='edit-widget item'" + " data-id='" + row._id + "'" + ">Edit</div>" +
                        "<div class='delete-widget item'" + " data-id='" + row._id + "'" + ">Delete</div></div>" +
                        "</div>";
                },
                "bSortable": false,
            });

            $('#tableFour').dataTable($.extend({}, $.fn.dataTable.defaults, {
                "aaData": this.templateData['widgetsData'],
                "aoColumns": columnsDefine
            }));

            $('#tableFour').dataTable().fnSort([[0, 'desc']]);
        }
    },
    renderFeedbackDrawer: function() {
        if (this.step == 3) {
            $('#countly-feedback-next-step').text('Complete');
            $('#countly-feedback-back-step').css({"display":"block"});
            Object.values($('.feedback-preview-body')).slice(0,3).forEach(function(el) {
                $(el).css({"display":"none"});
            })
            $('#feedback-preview-step-1').css({"display":"block"});
            $('#feedback-preview-step-2').css({"display":"block"});
            $('.feedback-preview-footer').css({"display":"block"});
            $('.feedback-preview-title').text('Trigger button preview');
        }
        else if (this.step == 2) {
            $('#countly-feedback-next-step').text('Next Step');
            $('#countly-feedback-back-step').css({"display":"block"});   
            Object.values($('.feedback-preview-body')).slice(0,3).forEach(function(el) {
                $(el).css({"display":"none"});
            })
            $('#feedback-preview-step-2').css({"display":"block"});
            $('.feedback-preview-title').text("Trigger button preview");
            $('.feedback-preview-footer').css({"display":"none"});
        }
        else if (this.step == 1) {
            $('#countly-feedback-next-step').text('Next Step');
            $('#countly-feedback-back-step').css({"display":"none"});
            Object.values($('.feedback-preview-body')).slice(0,3).forEach(function(el) {
                $(el).css({"display":"none"});
            })
            $('#feedback-preview-step-1').css({"display":"block"});
            $('.feedback-preview-title').text("Pop-up preview");
            $('.feedback-preview-footer').css({"display":"block"});
        }
        Object.values($('.feedback-create-step-view')).slice(0,3).forEach(function(el) {
            $(el).css({"display":"none"});
        })
        Object.values($('.feedback-create-side-header-slice')).slice(0,3).forEach(function(el) {
            $(el).removeClass('feedback-active-step');
        })
        $('#feedback-step'+this.step+'-title').addClass('feedback-active-step');
        $('#feedback-create-step-'+this.step).css({"display":"block"});
    },
    renderCommon: function (isRefresh) {
        var self = this;
        if (!isRefresh) {
            $(this.el).html(this.template(this.templateData));
            // load menu 
            $("body").off("click", ".options-item .edit").on("click", ".options-item .edit", function () {
                $(this).next(".edit-menu").fadeToggle();
                event.stopPropagation();
            });
            //add platform && version && rating selector
            self.loadPlatformData();
            self.loadVersionData();
            self.loadRatingData();
            self.getFeedbackData();
            self.getFeedbackWidgetsData();
            var height = window.innerHeight;
            $('.feedback-create-side').css({"height":height});
            $('.feedback-preview-side').css({"height":height-68});
            $("#graph-select-container").find(".big-numbers").removeClass("active");
            $("#" + self.currentTab).addClass("active");

            //tab select
            $(".widget-content .inner").click(function () {
                $(".big-numbers").removeClass("active");
                $(".big-numbers .select").removeClass("selected");
                $(this).parent(".big-numbers").addClass("active");
                $(this).find('.select').addClass("selected");
                self.currentTab = $(this).parent(".big-numbers").attr('id');
                self.updateViews();
            });

            $("#date-selector").click(function () {
                $.when(
                    starRatingPlugin.requestPlatformVersion(),
                    starRatingPlugin.requestRatingInPeriod(),
                    starRatingPlugin.requesPeriod()
                ).done(function (result) {
                    self.updateViews();
                });
            });
            // jQuery selectize handler for projection input
            $('#feedback-page-selector').selectize({
                persist: true,
                maxItems: null,
                valueField: 'key',
                labelField: 'key',
                searchField: ['key'],
                options: self.feedbackWidget.target_pages,
                render: {
                    item: function (item, escape) {
                        return '<div>' +
                            item.key +
                            '</div>';
                    },
                    option: function (item, escape) {
                        var label = item.key;
                        var caption = item.key;
                        return '<div>' +
                            '<span class="label">' + label + '</span>' +
                            '</div>';
                    }
                },
                createFilter: function (input) {
                    return true;
                },
                create: function (input) {
                    var isExist = false;
                    self.feedbackWidget.target_pages.forEach(function(p) {
                        if (p == input) isExist = true;
                    })
                    if (!isExist) self.feedbackWidget.target_pages.push(input);
                    return {
                        "key": input
                    }
                }
            });

            $("body").on("click", ".delete-widget", function () {
                var targetId = $(this).data('id');
                CountlyHelpers.confirm("This widget will removed permamently? Do you want to continue?", "red", function(result) {
                    if (result) {
                        starRatingPlugin.removeFeedbackWidget(targetId, false, function(response, xhrStatus) {
                            if (xhrStatus == 200) {
                                CountlyHelpers.notify({type:'success', message:'Feedback widget removed successfully.'});
                            } else {
                                CountlyHelpers.notify({type:'error', message:'Feedback widget couldn\'t removed.'});
                            }
                        })
                    }
                })
            });

            $(".check").click(function () {
                var classes = $(this).attr('class');
                var id = $(this).attr('id');
                var count = 0;

                for (var keyName in self.lineChartSelect) {
                    if (self.lineChartSelect[keyName]) {
                        count++;
                    }
                }

                if (classes.indexOf('selected') >= 0) {
                    if (count == 1) {
                        return;
                    }
                    $(this).removeClass("selected");
                } else {
                    $(this).addClass("selected");
                }

                self.lineChartSelect[id] = !self.lineChartSelect[id];
                self.updateViews();
            });

            $('#all-pages').on('click', function() {
                $(this).addClass('selected');
                $('#selected-pages').removeClass('selected');
                $('.feedback-page-selectors').css({"display":"none"});
                self.feedbackWidget.target_page = 'all';
            })

            $('#selected-pages').on('click', function() {
                $(this).addClass('selected');
                $('#all-pages').removeClass('selected');
                $('.feedback-page-selectors').css({"display":"block"});
                self.feedbackWidget.target_page = 'selected';
            })
            
            $("#date-submit").click(function () {
                $.when(
                    starRatingPlugin.requestPlatformVersion(),
                    starRatingPlugin.requestRatingInPeriod(),
                    starRatingPlugin.requesPeriod()
                ).done(function (result) {
                    self.updateViews();
                });
            })

            $('.star-rating-tab-item').on('click', function() {
                Object.values($('.star-rating-tab-item')).slice(0,3).forEach(function(el) {
                    $(el).removeClass('star-rating-tab-item-active');
                })
                $(this).addClass('star-rating-tab-item-active');
                self.renderTabView($(this).data('target'));
            })

            $('#font-color-input').on('keyup', function() {
                $('#font-color-preview').css({"background-color":$(this).val()});
                $('#feedback-sticker-on-window').css({"color":$(this).val()});
                self.feedbackWidget.trigger_font_color = $(this).val();
            })

            $('#button-color-input').on('keyup', function() {
                $('#button-color-preview').css({"background-color":$(this).val()});
                $('#feedback-sticker-on-window').css({"background-color":$(this).val()});
                self.feedbackWidget.trigger_bg_color = $(this).val();
            })

            $('#feedback-callout-text').on('keyup', function() {
                if ($(this).val() == '') {
                    $('#feedback-sticker-on-window').html('Feedback');
                    self.feedbackWidget.trigger_button_text = 'Feedback';
                } else {
                     $('#feedback-sticker-on-window').html($(this).val());
                     self.feedbackWidget.trigger_button_text = $(this).val();
                }
            })

            $('.position-box').on('click', function() {
                Object.values($('.position-box')).slice(0,4).forEach(function(el) {
                    $(el).removeClass('active-position-box');
                });
                $(this).addClass('active-position-box');
                switch ($(this).data('pos')) {
                    case 'mleft':
                        $('#feedback-sticker-on-window').removeClass('bleft');
                        $('#feedback-sticker-on-window').removeClass('bright');
                        $('#feedback-sticker-on-window').removeClass('mright');
                        $('#feedback-sticker-on-window').addClass('mleft');
                        self.feedbackWidget.trigger_position = 'mleft';
                        break;
                    case 'mright':
                        $('#feedback-sticker-on-window').removeClass('bleft');
                        $('#feedback-sticker-on-window').removeClass('mleft');
                        $('#feedback-sticker-on-window').removeClass('bright');
                        $('#feedback-sticker-on-window').addClass('mright');
                        self.feedbackWidget.trigger_position = 'mright';
                        break;
                    case 'bleft':
                        $('#feedback-sticker-on-window').removeClass('bright');
                        $('#feedback-sticker-on-window').removeClass('mleft');
                        $('#feedback-sticker-on-window').removeClass('mright');
                        $('#feedback-sticker-on-window').addClass('bleft');
                        self.feedbackWidget.trigger_position = 'bleft';
                        break;
                    case 'bright':
                        $('#feedback-sticker-on-window').removeClass('bleft');
                        $('#feedback-sticker-on-window').removeClass('mleft');
                        $('#feedback-sticker-on-window').removeClass('mright');
                        $('#feedback-sticker-on-window').addClass('bright');
                        self.feedbackWidget.trigger_position = 'bright';
                        break;
                    default:
                        $('#feedback-sticker-on-window').removeClass('bleft');
                        $('#feedback-sticker-on-window').removeClass('mleft');
                        $('#feedback-sticker-on-window').removeClass('bright');
                        $('#feedback-sticker-on-window').addClass('mright');
                        self.feedbackWidget.trigger_position = 'mright';
                        break;
                }
            });

            $("#create-feedback-widget-button").on("click", function () {
                store.set('drawer-type','create');
                $('#feedback-create-step-1').css({"display":"block"});
                $(".cly-drawer").removeClass("open editing");
                $("#create-feedback-widget-drawer").addClass("open");
                $(".cly-drawer").find(".close").off("click").on("click", function () {
                    $(this).parents(".cly-drawer").removeClass("open");
                    $("#save-widget").removeClass("disabled");
                    self.step = 1;
                    self.renderFeedbackDrawer();
                });

                $("#save-widget").off("click").on("click", function () {
                    
                    if ($(this).hasClass("disabled")) {
                        return;
                    }
                    $("#save-widget").addClass("disabled");

                    var data = {
                        widget_name: $(".cly-drawer").find('#widget-name').val(),
                        steps: []
                    }
                });

                $(".cly-drawer").find('#feedback-name').off('keyup change').on('keyup change', function () {
                    var feedbackName = $(this).val();
                });

                $("#save-widget").addClass('disabled');
            });

            $("body").on("click", ".edit-widget", function () {
                // set drawer type as edit
                store.set('drawer-type','edit');
                // get current widget data from server
                starRatingPlugin.requestSingleWidget($(this).data('id'), function(widget) {
                    self.feedbackWidget = widget;
                    // fill the form inputs
                    $('#feedback-popup-header-text').val(self.feedbackWidget.popup_header_text);
                    $('#feedback-popup-comment-text').val(self.feedbackWidget.popup_comment_callout);
                    $('#feedback-popup-email-text').val(self.feedbackWidget.popup_email_callout);
                    $('#feedback-popup-button-text').val(self.feedbackWidget.popup_button_callout);
                    $('#feedback-popup-thanks-text').val(self.feedbackWidget.popup_thanks_message);
                    // render preview with values of current  widget
                    $('#question-area').text(self.feedbackWidget.popup_header_text);
                    $('#countly-feedback-comment-title').text(self.feedbackWidget.popup_comment_callout);
                    $('#countly-feedback-email-title').text(self.feedbackWidget.popup_email_callout);
                    $('#feedback-submit-button').text(self.feedbackWidget.popup_button_callout);
                    $('.success-emotions-area > #question-area').text(self.feedbackWidget.popup_thanks_message);
                    // set active position for feedback sticker
                    Object.values($('.position-box')).splice(0,4).forEach(function(el) {
                        if ($(el).data('pos') == self.feedbackWidget.trigger_position) $(el).addClass('active-position-box');
                        else $(el).removeClass('active-position-box');
                    });
                    // remove existing position class/or classes
                    $('#feedback-sticker-on-window').removeClass('mleft');
                    $('#feedback-sticker-on-window').removeClass('mright');
                    $('#feedback-sticker-on-window').removeClass('bleft');
                    $('#feedback-sticker-on-window').removeClass('bright');
                    $('#feedback-sticker-on-window').addClass(self.feedbackWidget.trigger_position);
                    $('#feedback-sticker-on-window').html(self.feedbackWidget.trigger_button_text);
                    $('#feedback-sticker-on-window').css({"background-color":self.feedbackWidget.trigger_bg_color,"color":self.feedbackWidget.trigger_font_color});
                    // set feedback color values to input
                    $('#button-color-input').val(self.feedbackWidget.trigger_bg_color);
                    $('#button-color-preview').css({"background-color":self.feedbackWidget.trigger_bg_color});
                    $('#font-color-input').val(self.feedbackWidget.trigger_font_color);
                    $('#font-color-preview').css({"background-color":self.feedbackWidget.trigger_font_color});
                    $('#feedback-callout-text').val(self.feedbackWidget.trigger_button_text);
                    // set active target device/devices
                    Object.values($('.device-box')).splice(0,3).forEach(function(el) {
                        $(el).removeClass('active-position-box');
                        JSON.parse(self.feedbackWidget.target_devices).forEach(function(target) {
                            if ($(el).data('target') == target) {
                                $(el).addClass('active-position-box');
                                $('#'+$(el).data('target')+'-check-icon').attr("src","/images/star-rating/check.png");
                            } 
                        })
                    })
                    // set target page selector
                    if (self.feedbackWidget.target_page == "all") {
                        $('#all-pages').addClass('selected');
                        $('#selected-pages').removeClass('selected');
                        $('.feedback-page-selectors').css({"display":"none"});    
                    } else {
                        $('#selected-pages').addClass('selected');
                        $('#all-pages').removeClass('selected');
                        $('.feedback-page-selectors').css({"display":"block"});    
                        // add selected pages into selectize input
                        JSON.parse(self.feedbackWidget.target_pages).forEach(function(p) {
                            $('#feedback-page-selector')[0].selectize.addOption({ "key": p });    
                            $('#feedback-page-selector')[0].selectize.addItem(p);
                        })
                    }

                    // set is widget active currently?
                    if (self.feedbackWidget.is_active) {
                        $('#set-feedback-active').attr('checked','checked');
                    } else {
                        $('#set-feedback-active').removeAttr('checked');
                    }

                })

                $('#feedback-create-step-1').css({"display":"block"});
                $(".cly-drawer").removeClass("open editing");
                $("#create-feedback-widget-drawer").addClass("open");
                $(".cly-drawer").find(".close").off("click").on("click", function () {
                    $(this).parents(".cly-drawer").removeClass("open");
                    $("#save-widget").removeClass("disabled");
                    self.step = 1;
                    self.renderFeedbackDrawer();
                });

                $("#save-widget").off("click").on("click", function () {
                    if ($(this).hasClass("disabled")) {
                        return;
                    }
                    $("#save-widget").addClass("disabled");
                    var data = {
                        widget_name: $(".cly-drawer").find('#widget-name').val(),
                        steps: []
                    }
                });

                $(".cly-drawer").find('#feedback-name').off('keyup change').on('keyup change', function () {
                    var feedbackName = $(this).val();
                });

                $("#save-widget").addClass('disabled');
            });

            $('.device-box').on('click', function() {
                if ($(this).hasClass('active-position-box')) {
                    self.feedbackWidget.target_devices.splice(self.feedbackWidget.target_devices.indexOf($(this).data('target'), 1));
                    $(this).removeClass('active-position-box');
                    $('#'+$(this).data('target')+'-check-icon').attr("src","/images/star-rating/empty-check.png");
                } else {
                    self.feedbackWidget.target_devices.push($(this).data('target'));
                    $(this).addClass('active-position-box');
                    $('#'+$(this).data('target')+'-check-icon').attr("src","/images/star-rating/check.png");
                } 
            })

            $('.feedback-create-side-header-slice').on('click', function() {
                if (store.get('drawer') == 'create') {
                    if ($(this).data('step') < self.step) {
                        self.step = $(this).data('step');
                        self.renderFeedbackDrawer();
                    }    
                } else {
                    self.step = $(this).data('step');
                    self.renderFeedbackDrawer();
                }
                
            })

            $('#countly-feedback-back-step').on('click', function() {
                self.step = parseInt(self.step) - 1;
                self.renderFeedbackDrawer();
            });

            $('#countly-feedback-next-step').on('click', function() {
                self.step = parseInt(self.step) + 1;
                if (self.step == 4) {
                    if (store.get('drawer-type') == 'edit') {
                        starRatingPlugin.editFeedbackWidget(self.feedbackWidget, function(result, status) {
                            if (status == 200) {
                                $(".cly-drawer").removeClass("open");
                                // TODO: localize!
                                CountlyHelpers.notify({type:'success', message:'Feedback widget edited successfully.'});
                                self.renderFeedbacksTable();
                            } else {
                                CountlyHelpers.notify({type:'error', message:'Feedback widget couldn\'t edited.'});
                            }
                        })   
                        self.step = 1; 
                        self.renderFeedbackDrawer();
                    } else {
                        starRatingPlugin.createFeedbackWidget(self.feedbackWidget, function(result, status) {
                            if (status == 201) {
                                $(".cly-drawer").removeClass("open");
                                // TODO: localize!
                                CountlyHelpers.notify({type:'success', message:'Feedback widget created successfully.'});
                                self.renderFeedbacksTable();
                            } else {
                                CountlyHelpers.notify({type:'error', message:'Feedback widget couldn\'t created.'});
                            }
                        })   
                        self.step = 1; 
                        self.renderFeedbackDrawer();
                    }
                }
                self.renderFeedbackDrawer();
            })

            $('#feedback-popup-header-text').on('keyup', function() {
                self.feedbackModalToggle('popup');
                if ($(this).val() == '') {
                    self.feedbackWidget.popup_header_text = 'What is your opinion of this page?';
                    $('#question-area').text("What is your opinion of this page?");
                } else {
                    self.feedbackWidget.popup_header_text = $(this).val();
                    $('#question-area').text($(this).val());
                } 
            })
            
            $('#feedback-popup-comment-text').on('keyup', function() {
                self.feedbackModalToggle('popup');
                if ($(this).val() == '') {
                    $('#countly-feedback-comment-title').text('Add comment');
                    self.feedbackWidget.popup_comment_callout = 'Add comment';
                } else {
                    $('#countly-feedback-comment-title').text($(this).val());
                    self.feedbackWidget.popup_comment_callout = $(this).val();
                }
            })

            $('#feedback-popup-email-text').on('keyup', function() {
                self.feedbackModalToggle('popup');
                if ($(this).val() == '') {
                    $('#countly-feedback-email-title').text('Contact me by e-mail');
                    self.feedbackWidget.popup_email_callout = 'Contact me by e-mail';
                } else {
                    $('#countly-feedback-email-title').text($(this).val());
                    self.feedbackWidget.popup_email_callout = $(this).val();
                } 
            })
            
            $('#feedback-popup-button-text').on('keyup', function() {
                self.feedbackModalToggle('popup');
                if ($(this).val() == '') {
                    $('#feedback-submit-button').text('Submit Feedback');
                    self.feedbackWidget.popup_button_callout = 'Submit feedback';
                } else {
                    self.feedbackWidget.popup_button_callout = $(this).val();  
                    $('#feedback-submit-button').text($(this).val());
                } 
            })

            $('#feedback-popup-thanks-text').on('keyup', function() {
                self.feedbackModalToggle('success');
                if ($(this).val() == '') {
                    $('.success-emotions-area > #question-area').text('Thank you. We received your message.');
                    self.feedbackWidget.popup_thanks_message = 'Thank you. We received your message';
                } else {
                    $('.success-emotions-area > #question-area').text($(this).val());
                    self.feedbackWidget.popup_thanks_message = $(this).val();
                }
            })

            $('#popup-modal').on('click', function() {
                self.feedbackModalToggle('popup');
            })

            $('#thanks-modal').on('click', function() {
                self.feedbackModalToggle('success');
            })

            $('#set-feedback-active').on('change', function() {
                self.feedbackWidget.is_active = ($(this).attr('checked')) ? true : false;
            });
        }
        this.updateViews();
        this.renderTabView('ratings');
    },
    feedbackModalToggle: function(which) {
        if (this.currentModal !== which) {
            this.currentModal = which;
            if (which == 'popup') {
                $('.back').css({'transform': 'rotateY(180deg)'});
                $('.front').css({'transform': 'rotateY(0deg)'});
                $('#thanks-modal').removeClass('feedback-modal-active');
                $('#popup-modal').addClass('feedback-modal-active');
                $('.feedback-preview-title').text('Pop-up preview');
            } else {
                $('.front').css({'transform': 'rotateY(180deg)'});
                $('.back').css({'transform': 'rotateY(0deg)'});
                $('#thanks-modal').addClass('feedback-modal-active');
                $('#popup-modal').removeClass('feedback-modal-active');
                $('.feedback-preview-title').text('Thank you page');
            }
        }
    },
    refresh: function () {
        var self = this;
        $.when(
            starRatingPlugin.requestPlatformVersion(true),
            starRatingPlugin.requestRatingInPeriod(true)
        ).done(function (result) {
            self.updateViews(true);
            self.loadPlatformData();
            self.loadVersionData();
        });
    },
    renderTabView: function(target) {
        var self = this;
        switch (target) {
            case 'ratings':
                $('#ratings').css({"display":"block"});
                $('#comments').css({"display":"none"});
                $('#widgets').css({"display":"none"});
                break;
            case 'comments':
                $('#comments').css({"display":"block"});
                $('#widgets').css({"display":"none"});
                $('#ratings').css({"display":"none"});
                self.renderCommentsTable()
                break;
            case 'widgets':
                $('#widgets').css({"display":"block"});
                $('#comments').css({"display":"none"});
                $('#ratings').css({"display":"none"});
                self.renderFeedbacksTable()
                break;
            default:
                $('#ratings').css({"display":"block"});
                $('#comments').css({"display":"none"});
                $('#widgets').css({"display":"none"});
                break;
        }
    }
});

//register views
app.starView = new starView();

app.route("/analytics/star-rating", 'star', function () {
    this.renderWhenReady(this.starView);
});

$(document).ready(function () {
    var menu = '<a href="#/analytics/star-rating" class="item">' +
        '<div class="logo-icon fa fa-globe"></div>' +
        '<div class="text" data-localize="star.menu-title"></div>' +
        '</a>';

    $('#web-type #engagement-submenu').append(menu);
    $('#mobile-type #engagement-submenu').append(menu);
});